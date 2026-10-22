'use strict';
/* chat-crash (item 29): what keeps drawing and compositing BEHIND an open Community chat room.
   iOS kills the web content process ('A problem repeatedly occurred') on memory/GPU pressure, so this counts, over 4 s each:
   rAF callbacks, WebGL draw calls per canvas, 2D canvas draws, visible backdrop-filter layers, running CSS animations,
   and canvas backing-store MB, for Home, Community (Room tab) and the chat room open on top of it.
   node tools/probe-chat-behind.cjs [device] [url|root] */
const H = require('./sim/harness.cjs');
const [device = 'iPhone 15', where = ''] = process.argv.slice(2);
const COUNT = () => {
    const w = window; w.__cb = { raf: 0, gl: new Map(), c2d: new Map() };
    const r0 = w.requestAnimationFrame.bind(w);
    w.requestAnimationFrame = f => r0(t => { w.__cb.raf++; return f(t); });
    const tag = cv => { if (!cv) return '?'; const p = cv.parentElement; return (cv.id || (p && (p.id || String(p.className).split(' ')[0])) || '?').slice(0, 28); };
    for (const P of [w.WebGLRenderingContext, w.WebGL2RenderingContext]) {
        if (!P) continue;
        for (const m of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
            const o = P.prototype[m]; if (!o) continue;
            P.prototype[m] = function () { const k = tag(this.canvas); w.__cb.gl.set(k, (w.__cb.gl.get(k) || 0) + 1); return o.apply(this, arguments); };
        }
    }
    const C = w.CanvasRenderingContext2D && w.CanvasRenderingContext2D.prototype;
    if (C) for (const m of ['fillRect', 'drawImage', 'fill', 'stroke', 'clearRect', 'fillText']) { const o = C[m]; C[m] = function () { const k = tag(this.canvas); w.__cb.c2d.set(k, (w.__cb.c2d.get(k) || 0) + 1); return o.apply(this, arguments); }; }
};
const MEASURE = async (P, label) => {
    await P.evaluate(() => { window.__cb.raf = 0; window.__cb.gl.clear(); window.__cb.c2d.clear(); });
    await H.sleep(4000);
    const r = await P.evaluate(() => {
        const vis = e => { const b = e.getBoundingClientRect(); if (b.width < 1 || b.height < 1) return false; const c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden'; };
        let blur = 0, blurArea = 0; const blurList = []; for (const e of document.querySelectorAll('body *')) { const c = getComputedStyle(e); const f = c.backdropFilter || c.webkitBackdropFilter; if (f && f !== 'none' && vis(e)) { blur++; const b = e.getBoundingClientRect(); blurArea += b.width * b.height; const cx = b.left + b.width / 2, cy = b.top + b.height / 2; const top = cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight ? document.elementFromPoint(cx, cy) : null; blurList.push((e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0]).slice(0, 30) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height) + ' ' + f.replace(/\s+/g, '') + (top && (top === e || e.contains(top)) ? '' : ' COVERED')); } }
        const anim = (document.getAnimations ? document.getAnimations() : []).filter(a => a.playState === 'running').length;
        const dpr = devicePixelRatio; const canv = [...document.querySelectorAll('canvas')].map(cv => ({ k: (cv.id || (cv.parentElement && (cv.parentElement.id || String(cv.parentElement.className).split(' ')[0])) || '?').slice(0, 28), px: cv.width + 'x' + cv.height, shown: vis(cv) }));
        const mb = [...document.querySelectorAll('canvas')].reduce((s, cv) => s + cv.width * cv.height * 4, 0) / 1048576;
        const room = document.getElementById('cpRoom'); const thread = !!document.querySelector('.cs-thread, html.cs-thread, body.cs-thread') || document.documentElement.className;
        return { rafPerS: Math.round(window.__cb.raf / 4), gl: Object.fromEntries([...window.__cb.gl].map(([k, v]) => [k, Math.round(v / 4)])), c2d: Object.fromEntries([...window.__cb.c2d].map(([k, v]) => [k, Math.round(v / 4)])), blur, blurList, blurScreens: +(blurArea / (innerWidth * innerHeight)).toFixed(2), anim, canvMB: +mb.toFixed(1), canv, dpr, roomShown: !!(room && vis(room)), htmlCls: String(thread).slice(0, 160) };
    }).catch(e => ({ err: e.message.slice(0, 200) }));
    console.log(label, JSON.stringify(r)); return r;
};
(async () => {
    const o = { engine: 'webkit', device }; if (/^https?:/.test(where)) o.url = where; else if (where) o.root = where;
    const R = await H.open(o); const P = R.page; await R.ctx.addInitScript(COUNT); const out = {};
    try {
        await R.goto(); await H.sleep(6000);
        out.home = await MEASURE(P, 'HOME');
        await P.evaluate(() => { try { window.goTab('foryou'); } catch (e) { } }); await H.sleep(2500);
        await P.evaluate(() => { const b = document.querySelector('.rm-tab[data-rm=room]'); b && b.click(); }); await H.sleep(2000);
        out.community = await MEASURE(P, 'COMMUNITY-ROOM');
        await P.evaluate(() => { try { window.LowiRoomsUI.setTab(true); window.LowiCommunity.thread(true); } catch (e) { } }); await H.sleep(2500);
        out.chat = await MEASURE(P, 'CHAT-ROOM-OPEN');
        /* transitions: peak web-process RSS (sampled every 100 ms from node) and peak blur layers / canvas MB (in page, every 50 ms) */
        const web = () => { const m = R.rss(); let s = 0; for (const [k, v] of Object.entries(m || {})) if (/web|render/i.test(k)) s += +v || 0; return s; };
        await P.evaluate(() => { const w = window; w.__pk = { blur: 0, mb: 0 }; setInterval(() => { let b = 0; for (const e of document.querySelectorAll('body *')) { const c = getComputedStyle(e); const f = c.backdropFilter || c.webkitBackdropFilter; if (f && f !== 'none' && e.getClientRects().length) b++; } const mb = [...document.querySelectorAll('canvas')].reduce((s, cv) => s + cv.width * cv.height * 4, 0) / 1048576; if (b > w.__pk.blur) w.__pk.blur = b; if (mb > w.__pk.mb) w.__pk.mb = +mb.toFixed(1); }, 50); });
        const base = web(); let peak = base; const iv = setInterval(() => { const v = web(); if (v > peak) peak = v; }, 100);
        const per = [];
        for (let i = 1; i <= 6; i++) {
            await P.keyboard.press('Escape').catch(() => { }); await H.sleep(1200);
            await P.evaluate(() => { try { window.LowiRoomsUI.setTab(true); window.LowiCommunity.thread(true); } catch (e) { } }); await H.sleep(1800);
            per.push(web());
        }
        clearInterval(iv);
        out.trans = { baseWebKB: base, peakWebKB: peak, afterEachKB: per, page: await P.evaluate(() => window.__pk) };
        console.log('TRANSITIONS', JSON.stringify(out.trans));
    } catch (e) { console.log('ERR', e.message.split('\n')[0]); }
    console.log('RESULT', JSON.stringify({ device, crashed: R.crashed, errs: R.errs.slice(0, 4) }));
    await R.close();
})();
