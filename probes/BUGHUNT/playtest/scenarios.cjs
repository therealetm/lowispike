'use strict';
const KEYS = ['settings', 'water', 'move', 'scan', 'joy', 'sleep', 'gap', 'fuel'];
/* what is open on screen: dialogs, sheets, blooms, scanner, panels */
const OPEN = () => {
    const vis = e => { let n = e; while (n && n.nodeType === 1) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false; n = n.parentElement; } const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
    const out = [];
    document.querySelectorAll('[role=dialog],[aria-modal=true],.hb2-open,.hs2-panel,.sg-open,#scanGlass,.sheet.open,.ov.open,.modal.open,.ss2-page,.mb-on').forEach(e => { if (e === document.documentElement || e === document.body) return; /* html carries .hb2-open while a bloom is open: not a panel */ if (vis(e)) out.push((e.id ? '#' + e.id : '') + '.' + String(e.className).split(' ').slice(0, 2).join('.')); });
    const m = document.getElementById('spBubble'); let misty = null;
    if (m) { const r = m.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const at = document.elementFromPoint(x, y); let why = null, n = m; while (n && n.nodeType === 1) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) { why = (n.id || n.tagName) + ' d=' + c.display + ' v=' + c.visibility + ' o=' + c.opacity; break; } n = n.parentElement; } misty = { x: Math.round(x), y: Math.round(y), w: Math.round(r.width), on: !!(at && (at === m || m.contains(at))), top: at ? (at.id || String(at.className).slice(0, 40) || at.tagName) : null, vis: vis(m), why }; }
    return { open: out, misty, tab: document.querySelector('.tab.active,[data-tab].on') ? 1 : 0, html: document.documentElement.className.split(' ').filter(c => !/^(apple-ui|lg|hi-signed|spirit-app|g1|rw-on|nm-on|cg-spirit-on|herb-living|g2h-on|tb-scanok|wh-on|cw-on|lv-on|o8|hb2-on|bw3-ready|lb3d)$/.test(c)).join(' '), tabOn: (document.querySelector('.tab.active') || {}).id, wr: (() => { try { return LowiWorldRegions.current() + '/' + (LowiMistyFlight.state() || {}).st; } catch (e) { return null; } })() };
};
async function closeAll(h) { for (let i = 0; i < 3; i++) { await h.page.keyboard.press('Escape').catch(() => { }); await h.L.sleep(250); } }
async function home(ctx) {
    const { L, url, view, rnd } = ctx; const h = await L.open({ url, view }); h.L = L; const P = h.page; const findings = []; const steps = [];
    const err = async tag => { const s = await L.snap(h); const pe = h.log.pageerror.splice(0); const ce = h.log.console.splice(0).filter(t => !/Failed to load resource|net::ERR|ERR_FAILED|blocked/i.test(t)); if (s.err.length || s.rej.length || pe.length || ce.length) findings.push({ tag, err: s.err, rej: s.rej, pageerror: pe, console: ce }); if (s.stalls.length) steps.push({ tag, stalls: s.stalls }); };
    return { h, P, findings, steps, err };
}
module.exports = {
    /* tap every bubble, close, spam, race, rotate and hide mid-animation */
    'home-abuse': async (ctx) => {
        const { L, view, rnd, OUT } = ctx; const { h, P, findings, steps, err } = await home(ctx);
        await err('load');
        const C = {}; for (const k of KEYS) C[k] = await L.center(h, `[data-orbit="${k}"]`);
        steps.push({ centers: Object.fromEntries(Object.entries(C).map(([k, v]) => [k, v && [Math.round(v.x), Math.round(v.y)]])) });
        /* 1: each bubble once, see what opens, close with Escape, check nothing is stuck */
        for (const k of KEYS) {
            if (!C[k]) { findings.push({ tag: 'missing bubble ' + k }); continue; }
            if (k === 'joy') continue;
            await L.tap(h, C[k].x, C[k].y); await L.sleep(1200);
            const o = await P.evaluate(OPEN); steps.push({ tap: k, open: o.open, html: o.html });
            await closeAll(h);
            const c = await P.evaluate(OPEN); if (c.open.length) { findings.push({ tag: 'escape did not close after ' + k, open: c.open }); await P.screenshot({ path: `${OUT}/${view}-stuck-${k}.png` }); }
            await err('tap ' + k);
        }
        /* 2: spam taps */
        for (const k of KEYS) { if (!C[k] || k === 'joy') continue; for (let i = 0; i < 8; i++) { await L.tap(h, C[k].x, C[k].y); await L.sleep(40 + Math.floor(rnd() * 60)); } await L.sleep(900); const o = await P.evaluate(OPEN); steps.push({ spam: k, open: o.open, html: o.html, tabOn: o.tabOn, mv: o.misty && o.misty.vis }); await closeAll(h); await err('spam ' + k); }
        /* 3: race: open A then B mid-animation */
        for (let i = 0; i < 10; i++) { const a = KEYS[Math.floor(rnd() * 8)], b = KEYS[Math.floor(rnd() * 8)]; if (a === 'joy' || b === 'joy' || !C[a] || !C[b]) continue; await L.tap(h, C[a].x, C[a].y); await L.sleep(80 + Math.floor(rnd() * 200)); await L.tap(h, C[b].x, C[b].y); await L.sleep(1000); const o = await P.evaluate(OPEN); steps.push({ race: a + '>' + b, open: o.open, html: o.html, tabOn: o.tabOn, mv: o.misty && o.misty.vis }); if (o.open.length > 1) findings.push({ tag: 'two panels open after race ' + a + '>' + b, open: o.open }); await closeAll(h); await err('race ' + a + '>' + b); }
        /* 4: rotate mid-animation */
        const vp = P.viewportSize();
        for (const k of ['settings', 'fuel', 'sleep', 'scan']) { if (!C[k]) continue; await L.tap(h, C[k].x, C[k].y); await L.sleep(120); await P.setViewportSize({ width: vp.height, height: vp.width }); await L.sleep(900); const o1 = await P.evaluate(OPEN); await P.setViewportSize(vp); await L.sleep(900); const o2 = await P.evaluate(OPEN); steps.push({ rotate: k, rotated: o1.open, back: o2.open, misty: o2.misty }); await closeAll(h); await err('rotate ' + k); }
        for (let i = 0; i < 12; i++) { await P.setViewportSize({ width: 300 + Math.floor(rnd() * 900), height: 500 + Math.floor(rnd() * 700) }); await L.sleep(60); } await P.setViewportSize(vp); await L.sleep(1500); await err('resize storm');
        for (const k of KEYS) C[k] = await L.center(h, `[data-orbit="${k}"]`);
        /* 5: hide the tab mid-animation */
        for (const k of ['settings', 'fuel']) { if (!C[k]) continue; await L.tap(h, C[k].x, C[k].y); await L.sleep(100); await P.evaluate(() => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await L.sleep(1500); await P.evaluate(() => { delete document.visibilityState; delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); }); await L.sleep(1000); const o = await P.evaluate(OPEN); steps.push({ hide: k, open: o.open }); await closeAll(h); await err('hide ' + k); }
        const fin = await P.evaluate(OPEN); steps.push({ final: fin });
        if (fin.open.length) findings.push({ tag: 'panel stuck at end', open: fin.open });
        if (fin.misty && (!fin.misty.vis)) findings.push({ tag: 'misty not visible at end', misty: fin.misty });
        const ctrls = await P.evaluate(K => K.map(k => { const e = document.querySelector('[data-orbit="' + k + '"]'); if (!e) return k + ':none'; const r = e.getBoundingClientRect(); return k + ':' + Math.round(r.left + r.width / 2) + ',' + Math.round(r.top + r.height / 2) + ',' + Math.round(r.width); }), KEYS);
        steps.push({ finalCtrls: ctrls });
        await P.screenshot({ path: `${OUT}/${view}-home-final.png` });
        await h.browser.close();
        return { findings, steps };
    },
    /* enter and leave worlds fast, re-target mid-travel, tap during transitions */
    'world-churn': async (ctx) => {
        const { L, view, rnd, OUT } = ctx; const { h, P, findings, steps, err } = await home(ctx);
        await P.waitForFunction(() => window.LowiWorldRegions && window.LowiMistyFlight, null, { timeout: 60000 }).catch(() => findings.push({ tag: 'world API missing' }));
        await err('load');
        const ids = ['lungs', 'heart', 'liver', 'pancreas', 'gut', 'muscle'];
        const st = () => P.evaluate(() => { try { const s = window.LowiWorldRegions.state; return { cur: window.LowiWorldRegions.current(), busy: !!s.busy, fl: (window.LowiMistyFlight.state() || {}).st }; } catch (e) { return { e: e.message }; } });
        const waitIdle = async (ms) => { const t = Date.now(); while (Date.now() - t < ms) { const s = await st(); if (!s.busy) return s; await L.sleep(300); } return Object.assign(await st(), { timeout: true }); };
        /* A: every world in and out normally */
        for (const id of ids) { await P.evaluate(i => window.LowiWorldRegions.travel(i), id); const s1 = await waitIdle(30000); await L.sleep(1500); await P.evaluate(() => window.LowiWorldRegions.travel('hub')); const s2 = await waitIdle(30000); steps.push({ visit: id, inSt: s1, outSt: s2 }); if (s1.timeout || s2.timeout || s1.cur !== id || s2.cur !== 'hub') findings.push({ tag: 'visit ' + id + ' wrong state', s1, s2 }); await err('visit ' + id); }
        /* B: retarget mid-travel and spam taps on the screen during transitions */
        const vp = P.viewportSize();
        for (let i = 0; i < 12; i++) { const a = ids[Math.floor(rnd() * ids.length)], b = rnd() < 0.3 ? 'hub' : ids[Math.floor(rnd() * ids.length)]; await P.evaluate(x => window.LowiWorldRegions.travel(x), a); for (let j = 0; j < 4; j++) { await L.sleep(100 + Math.floor(rnd() * 300)); await L.tap(h, Math.floor(rnd() * vp.width), Math.floor(rnd() * vp.height * 0.8)); } await P.evaluate(x => window.LowiWorldRegions.travel(x), b); const s = await waitIdle(40000); steps.push({ retarget: a + '>' + b, s }); if (s.timeout) findings.push({ tag: 'stuck busy after retarget ' + a + '>' + b, s }); else if (s.cur !== b) findings.push({ tag: 'ended in wrong place after ' + a + '>' + b, s }); await err('retarget ' + a + '>' + b); }
        await P.evaluate(() => window.LowiWorldRegions.travel('hub')); await waitIdle(30000);
        /* C: in and out of the liver 30 times, as fast as it lets us */
        const heap0 = await P.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : null), nodes0 = await P.evaluate(() => document.getElementsByTagName('*').length);
        let bad = 0;
        for (let i = 0; i < 30; i++) { await P.evaluate(() => window.LowiWorldRegions.travel('liver')); const a = await waitIdle(30000); await P.evaluate(() => window.LowiWorldRegions.travel('hub')); const b = await waitIdle(30000); if (a.timeout || b.timeout || a.cur !== 'liver' || b.cur !== 'hub') { bad++; if (bad < 4) findings.push({ tag: 'liver churn #' + i, a, b }); } if (i % 10 === 9) await err('churn ' + i); }
        const heap1 = await P.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : null), nodes1 = await P.evaluate(() => document.getElementsByTagName('*').length);
        const gl = await P.evaluate(() => document.querySelectorAll('canvas').length);
        steps.push({ churn: { bad, heapMB: heap0 && [Math.round(heap0 / 1e6), Math.round(heap1 / 1e6)], nodes: [nodes0, nodes1], canvases: gl } });
        if (nodes1 - nodes0 > 300) findings.push({ tag: 'DOM grew over 30 liver round trips', nodes: [nodes0, nodes1] });
        await P.screenshot({ path: `${OUT}/${view}-world-final.png` });
        await h.browser.close();
        return { findings, steps };
    },
    /* every lowi key garbage, then load */
    'storage-corrupt': async (ctx) => {
        const { L, url, view, OUT } = ctx; const findings = [], steps = [];
        for (const mode of ['garbage', 'wrongtype', 'quota']) {
            const pre = `(() => { if (sessionStorage.getItem('bh.c')) return; sessionStorage.setItem('bh.c','1'); const mode='${mode}';
              const keys = []; for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
              const extra = ['lowi.guides.v1','lowi.sleep.v1','lowi_fast_v1','lowi.home.menubar','lowi-misty-held-bag','lowi.care.v1','lowi.hunt.v1','lowi.energy','lowi.settings','lowi.water','lowi.move.v1','lowi.recall','lowi.world.v1','lowi.explore','lowi.tips','lowi.mood'];
              const val = mode === 'garbage' ? '{not json' : mode === 'wrongtype' ? '[1,"x",null]' : null;
              for (const k of keys.concat(extra)) { if (k === 'lowi.auth' || k === 'lowi.gate' || k === 'lowi.news.seen' || k === 'lowi.daily.seen') continue; try { if (val !== null) localStorage.setItem(k, val); } catch (e) {} }
              if (mode === 'quota') { const S = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { throw new DOMException('QuotaExceededError', 'QuotaExceededError'); }; }
            })();`;
            /* seed real keys first: load once clean so modules write their keys, then corrupt them on reload */
            const h = await L.open({ url, view, settle: 6000 }); h.L = L;
            const keys = await h.page.evaluate(() => { const k = []; for (let i = 0; i < localStorage.length; i++) k.push(localStorage.key(i)); return k; });
            await h.ctx.addInitScript(pre);
            h.log.pageerror.length = 0; h.log.console.length = 0;
            await h.page.reload({ waitUntil: 'load', timeout: 120000 }); await L.sleep(7000);
            const ok = await h.page.evaluate(() => typeof window.goTab === 'function' && !!document.querySelector('[data-orbit="fuel"]'));
            const s = await L.snap(h);
            const ce = h.log.console.filter(t => !/Failed to load resource|net::ERR|blocked/i.test(t));
            if (!ok || s.err.length || s.rej.length || h.log.pageerror.length) findings.push({ tag: 'corrupt storage: ' + mode, homeOk: ok, err: s.err, rej: s.rej, pageerror: h.log.pageerror.slice(0, 12), console: ce.slice(0, 6) });
            /* and the world still opens */
            const w = await h.page.evaluate(async () => { try { window.LowiWorldRegions.travel('liver'); await new Promise(r => setTimeout(r, 9000)); return window.LowiWorldRegions.current(); } catch (e) { return 'ERR ' + e.message; } });
            const s2 = await L.snap(h);
            if (w !== 'liver' || s2.err.length || s2.rej.length) findings.push({ tag: 'corrupt storage world: ' + mode, w, err: s2.err, rej: s2.rej, pageerror: h.log.pageerror.slice(-6) });
            steps.push({ mode, keys: keys.length, homeOk: ok, world: w });
            await h.page.screenshot({ path: `${OUT}/${view}-storage-${mode}.png` });
            await h.browser.close();
        }
        return { findings, steps };
    }
    ,
    /* Run 7: flip Reduce Motion mid-session (also mid-animation), and go offline mid-session: open/close every bubble, travel a world */
    'rm-offline': async (ctx) => {
        const { L, view, rnd, OUT } = ctx; const { h, P, findings, steps, err } = await home(ctx);
        await P.waitForFunction(() => window.LowiWorldRegions && window.LowiMistyFlight, null, { timeout: 60000 }).catch(() => findings.push({ tag: 'world API missing' }));
        await err('load');
        const st = () => P.evaluate(() => { try { const s = window.LowiWorldRegions.state; return { cur: window.LowiWorldRegions.current(), busy: !!s.busy }; } catch (e) { return { e: e.message }; } });
        const waitIdle = async (ms) => { const t = Date.now(); while (Date.now() - t < ms) { const s = await st(); if (!s.busy) return s; await L.sleep(300); } return Object.assign(await st(), { timeout: true }); };
        const C = {}; for (const k of KEYS) C[k] = await L.center(h, `[data-orbit="${k}"]`);
        const round = async (tag, midFlip) => {
            for (const k of KEYS) {
                if (!C[k] || k === 'joy') continue;
                await L.tap(h, C[k].x, C[k].y);
                if (midFlip) { await L.sleep(60 + Math.floor(rnd() * 120)); await P.emulateMedia({ reducedMotion: midFlip() }); }
                await L.sleep(1300);
                const o = await P.evaluate(OPEN); steps.push({ tag, tap: k, open: o.open });
                if (!o.open.length && !['scan'].includes(k)) steps.push({ tag, note: 'nothing opened for ' + k, html: o.html });
                await closeAll(h); await L.sleep(500);
                const c = await P.evaluate(OPEN); if (c.open.length) { findings.push({ tag: tag + ': escape did not close after ' + k, open: c.open, html: c.html }); await P.screenshot({ path: `${OUT}/${view}-${tag}-stuck-${k}.png` }); }
                if (c.misty && !c.misty.vis) findings.push({ tag: tag + ': misty hidden after ' + k, misty: c.misty });
                await err(tag + ' ' + k);
            }
            await P.evaluate(() => window.LowiWorldRegions.travel('liver')); const a = await waitIdle(30000); await L.sleep(1500);
            await P.evaluate(() => window.LowiWorldRegions.travel('hub')); const b = await waitIdle(30000); await L.sleep(1200);
            steps.push({ tag, world: [a, b] });
            if (a.timeout || b.timeout || a.cur !== 'liver' || b.cur !== 'hub') findings.push({ tag: tag + ': world trip', a, b });
            const o = await P.evaluate(OPEN); if (o.open.length) findings.push({ tag: tag + ': open after world trip', open: o.open });
            await err(tag + ' world');
        };
        await P.emulateMedia({ reducedMotion: 'reduce' }); await L.sleep(800); await round('rm-on');
        let flip = 0; await round('rm-flip-mid', () => (flip++ % 2 ? 'reduce' : 'no-preference'));
        await P.emulateMedia({ reducedMotion: 'no-preference' }); await L.sleep(800);
        await h.ctx.setOffline(true); await L.sleep(500);
        await round('offline');
        /* offline reload? no: a real phone has the service worker; the harness blocks it */
        await h.ctx.setOffline(false); await L.sleep(1500); await round('back-online');
        const fin = await P.evaluate(OPEN); steps.push({ final: fin });
        if (fin.misty && !fin.misty.vis) findings.push({ tag: 'misty not visible at end', misty: fin.misty });
        const C2 = {}; for (const k of KEYS) C2[k] = await L.center(h, `[data-orbit="${k}"]`);
        for (const k of KEYS) { if (!C[k] || !C2[k]) { findings.push({ tag: 'bubble gone at end ' + k }); continue; } const d = Math.hypot(C[k].x - C2[k].x, C[k].y - C2[k].y); if (d > 30) findings.push({ tag: 'bubble moved ' + k, from: [C[k].x, C[k].y], to: [C2[k].x, C2[k].y] }); }
        await P.screenshot({ path: `${OUT}/${view}-rm-offline-final.png` });
        await h.browser.close();
        return { findings, steps };
    }
};
