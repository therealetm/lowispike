'use strict';
/* Run 14 probe: Home <-> Community warp canvas memory. Warps N times (goTab foryou/home, the same path the pinch and the Community
   bubble use) and tracks every #gxWarp streak canvas: its size while drawing, whether it is off the page afterwards, and whether
   its bitmap was handed back (width*height == 0). Also errors, tabs, Home left dimmed.
   usage: node probe-warp-canvas.cjs <url|dir> [warps] [view] */
const L = require('./lib.cjs');
const PRE = `(() => { const T = window.__wc = []; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.id === 'gxWarp') T.push(n); })
  .observe(document, { childList: true, subtree: true }); })();`;
(async () => {
    const target = process.argv[2] || 'https://therealetm.github.io/lowispike/'; const N = +(process.argv[3] || 10); const view = process.argv[4] || 'chromium390';
    let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 8000, preInit: PRE }); const P = h.page; const fails = [];
    let crashed = false; P.on('crash', () => { crashed = true; });
    const build = await P.evaluate(() => fetch('version.json?tb=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => '?'));
    let sizes = [];
    for (let i = 0; i < N && !crashed; i++) {
        const to = i % 2 ? 'home' : 'foryou';
        await P.evaluate(t => goTab(t), to);
        await L.sleep(250);
        const mid = await P.evaluate(() => { const c = document.getElementById('gxWarp'); return c ? [c.width, c.height] : null; });
        if (mid) sizes.push(mid.join('x'));
        await L.sleep(1800);
        const s = await P.evaluate(() => { const T = window.__wc, B = window.__bh || { err: [], rej: [] };
            const held = T.filter(c => c.width * c.height > 0).map(c => c.width + 'x' + c.height + (c.isConnected ? ' ON PAGE' : ''));
            const tab = document.querySelector('.tab.active'); const home = document.getElementById('tab-home');
            return { made: T.length, held, tab: tab && tab.id, homeOp: home && home.style.opacity, err: B.err.splice(0).concat(B.rej.splice(0)) }; });
        console.log(i, to, 'mid', mid && mid.join('x'), JSON.stringify(s));
        if (s.err.length) fails.push('warp ' + i + ' errors ' + JSON.stringify(s.err).slice(0, 200));
        if (s.tab !== 'tab-' + to) fails.push('warp ' + i + ' tab ' + s.tab);
        if (s.held.length) fails.push('warp ' + i + ' canvases still holding a bitmap: ' + s.held.length + ' ' + s.held.slice(0, 3).join(','));
    }
    const fin = await P.evaluate(() => window.__wc.length);
    if (!fin) fails.push('no warp canvas was ever made (warp not running?)');
    if (crashed) fails.push('page crashed');
    console.log('build', build, 'view', view, 'made', fin, 'sizes', [...new Set(sizes)].join(','), 'pageerror', JSON.stringify(h.log.pageerror.slice(0, 3)));
    console.log(fails.length ? 'FAIL ' + [...new Set(fails.map(f => f.replace(/warp \d+ /, 'warp N ')))].join(' ; ') : 'PASS');
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.log('PROBE ERROR', e.stack); process.exit(1); });
