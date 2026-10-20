'use strict';
/* galaxy-audit probe 2: are joystick taps counted as the page really sees them? Logs pointer events on #whPad with page timestamps,
   then triple tap, then a drag with Misty's flight state sampled every second for 40 s (is 'exit' stuck or only slow?). */
const L = require(process.env.GA_LIB || './lib.cjs'), G = require('./gest.cjs'), fs = require('fs');
(async () => {
    const view = process.argv[2] || 'chromium390'; const target = process.argv[3] || '/home/sprite/wt-galaxy-audit'; let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 9000 }); const p = h.page; const out = {};
    await p.evaluate(() => { const b = document.getElementById('whPad'); window.__pl = []; ['pointerdown', 'pointerup', 'pointercancel'].forEach(n => b.addEventListener(n, e => window.__pl.push([n, Math.round(e.timeStamp), e.pointerType]), true)); });
    const pad = await G.center(h, '#whPad');
    const st = () => p.evaluate(() => { const s = LowiPad.state(), f = LowiMistyFlight.state(); return { pad: s.pad, st: f.st, outPh: f.outPh, frames: window.__bh.frames, log: f.log.slice(-3) }; });
    out.start = await st();
    for (const gap of [60, 30, 0]) { await G.taps(h, pad, 3, gap); await L.sleep(1500); out['tri' + gap] = { st: await st(), pl: await p.evaluate(() => window.__pl.splice(0)) }; if (out['tri' + gap].st.pad === 'auto') break; }
    /* keyboard twin for autopilot, to separate gesture timing from the autopilot itself */
    if ((await st()).pad !== 'auto') { await p.focus('#whPad'); await p.keyboard.press('Enter'); await L.sleep(1500); out.enter = await st(); }
    out.samples = []; for (let i = 0; i < 40; i++) { await L.sleep(1000); out.samples.push(await st()); }
    console.log(JSON.stringify(out, null, 0));
    fs.writeFileSync('/home/sprite/galaxy-audit/out/p2-' + view + '.json', JSON.stringify(out, null, 1));
    console.log('ERR', JSON.stringify(h.log.pageerror), JSON.stringify(await L.snap(h)));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
