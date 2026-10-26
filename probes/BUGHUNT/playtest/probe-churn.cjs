'use strict';
/* Run 14 probe: world churn. Enter a world and leave it N times (default 30), alternating the exit route: X (back to Home),
   travel('hub') (stay in the 3D view), and World map hop. Every cycle records leak signals after a forced GC (Chromium CDP):
   JS heap, DOM nodes, canvases, WebGL contexts created vs alive, live setInterval count, rAF callbacks per frame,
   window/document listener count. Growth that keeps climbing over cycles = a leak (crash class on iPhone).
   usage: node probe-churn.cjs <url|dir> [cycles] [view] */
const L = require('./lib.cjs');
const PRE = `(() => { const T = window.__lk = { iv: new Set(), gl: 0, rafN: 0, rafPer: [], ctxs: [] };
  const si = setInterval, ci = clearInterval; window.setInterval = function () { const id = si.apply(this, arguments); T.iv.add(id); return id; };
  window.clearInterval = function (id) { T.iv.delete(id); return ci.apply(this, arguments); };
  const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k) { const c = gc.apply(this, arguments);
    if (c && /webgl/.test(k) && !this.__lkgl) { this.__lkgl = 1; T.gl++; T.ctxs.push(new WeakRef(c)); } return c; };
  const raf = requestAnimationFrame; let cnt = 0; window.requestAnimationFrame = function (f) { cnt++; return raf.call(this, f); };
  const tick = () => { T.rafPer.push(cnt); if (T.rafPer.length > 120) T.rafPer.shift(); cnt = 0; raf(tick); }; raf(tick);
})();`;
(async () => {
    const target = process.argv[2] || 'https://therealetm.github.io/lowispike/'; const N = +(process.argv[3] || 30); const view = process.argv[4] || 'chromium390';
    let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 8000, preInit: PRE }); const P = h.page;
    let cdp = null; try { cdp = await h.ctx.newCDPSession(P); await cdp.send('HeapProfiler.enable'); } catch (e) { cdp = null; }
    let crashed = false; P.on('crash', () => { crashed = true; console.log('PAGE CRASH'); });
    const W = ['liver', 'heart', 'brain', 'gut', 'pancreas', 'muscle', 'lung'];
    const waitFor = async (fn, arg, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await P.evaluate(fn, arg).catch(() => false)) return Date.now() - t; await L.sleep(300); } return -1; };
    const meas = async () => {
        if (cdp) { await cdp.send('HeapProfiler.collectGarbage').catch(() => { }); }
        let lis = null; if (cdp) { try { const w = await cdp.send('Runtime.evaluate', { expression: 'window' }); const d = await cdp.send('Runtime.evaluate', { expression: 'document' });
            const a = await cdp.send('DOMDebugger.getEventListeners', { objectId: w.result.objectId }); const b = await cdp.send('DOMDebugger.getEventListeners', { objectId: d.result.objectId }); lis = a.listeners.length + b.listeners.length; } catch (e) { lis = 'x'; } }
        return P.evaluate(l => { const T = window.__lk, B = window.__bh || { err: [], rej: [], stalls: [] }; const per = T.rafPer.slice(-60);
            return { heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e5) / 10 : null, dom: document.getElementsByTagName('*').length,
                cv: document.querySelectorAll('canvas').length, glMade: T.gl, glAlive: T.ctxs.filter(r => { const c = r.deref(); return c && !c.isContextLost(); }).length,
                iv: T.iv.size, raf: per.length ? Math.max.apply(null, per) : 0, lis: l, err: B.err.splice(0), rej: B.rej.splice(0), stalls: B.stalls.splice(0).length,
                cur: window.LowiWorldRegions && LowiWorldRegions.current(), cls: document.documentElement.className.split(' ').filter(c => /away|mapview|bwr|bw3|warp/.test(c)).join(' ') }; }, lis);
    };
    const rows = []; const m0 = await meas(); rows.push(Object.assign({ i: 0, how: 'start' }, m0)); console.log(JSON.stringify(rows[0]));
    for (let i = 1; i <= N && !crashed; i++) {
        const w = W[(i - 1) % W.length]; const how = ['x', 'hub', 'map'][i % 3];
        await P.evaluate(w => LowiWorldRegions.travel(w), w).catch(e => console.log('travel err', e.message));
        const tin = await waitFor(w => LowiWorldRegions.current() === w && !LowiWorldRegions.state.busy, w, 40000);
        await L.sleep(1500);
        if (how === 'x') { await P.evaluate(() => { const b = document.querySelector('.bw3-full .bw3-x, .bw3-close, [data-act=close-world], .bwr-x'); if (b) b.click(); return !!b; }).catch(() => { }); }
        else if (how === 'hub') await P.evaluate(() => LowiWorldRegions.travel('hub')).catch(() => { });
        else await P.evaluate(n => LowiWorldRegions.travel(n), W[i % W.length]).catch(() => { });
        const tout = await waitFor(() => !LowiWorldRegions.state.busy, null, 40000); await L.sleep(1500);
        const m = await meas(); const r = Object.assign({ i, w, how, tin, tout }, m); rows.push(r); console.log(JSON.stringify(r));
    }
    // back home fully, settle, final reading
    await P.evaluate(() => { const b = document.querySelector('.bw3-full .bw3-x, .bw3-close, [data-act=close-world], .bwr-x'); if (b) b.click(); if (window.goTab) goTab('home'); }).catch(() => { });
    await L.sleep(6000); const mf = await meas(); rows.push(Object.assign({ i: 'end', how: 'home' }, mf)); console.log(JSON.stringify(rows[rows.length - 1]));
    const a = rows[1], b = rows[rows.length - 1]; const errs = rows.reduce((s, r) => s + r.err.length + r.rej.length, 0);
    console.log('SUMMARY', JSON.stringify({ heap: [m0.heap, a.heap, b.heap], dom: [m0.dom, a.dom, b.dom], cv: [m0.cv, a.cv, b.cv], glMade: b.glMade, glAlive: [a.glAlive, b.glAlive], iv: [m0.iv, a.iv, b.iv], raf: [m0.raf, a.raf, b.raf], lis: [m0.lis, a.lis, b.lis], errs, crashed, pageerror: h.log.pageerror.slice(0, 5) }));
    await P.screenshot({ path: __dirname + '/out/churn-final.png' }).catch(() => { });
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.log('PROBE ERROR', e.stack); process.exit(1); });
