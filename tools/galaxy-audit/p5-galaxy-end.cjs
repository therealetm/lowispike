'use strict';
/* galaxy-audit probe 5: "to the end of the galaxy". Fly Misty out of her cell, break out through her bubble's edge, then hold the
   joystick in ONE direction for up to 170 s (does she reach the deep dark and get carried round, GAL.LOOP?), let go and time the way
   home (promised: about half a minute at most). Chromium touch via CDP. */
const L = require(process.env.GA_LIB || './lib.cjs'), G = require('./gest.cjs'), fs = require('fs');
(async () => {
    const view = process.argv[2] || 'chromium390'; const target = process.argv[3] || '/home/sprite/wt-galaxy-audit'; let srv = null, url = target;
    const holdS = +(process.argv[4] || 170);
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 9000 }); const p = h.page; const R = { samples: [] };
    const st = () => p.evaluate(() => { const g = LowiMistyGalaxy.state(), f = LowiMistyFlight.state(); return { t: Math.round(performance.now() / 1000), st: f.st, on: g.on, far: g.far, loops: g.loops, ring: g.ring, fr: window.__bh.frames, glog: g.log.slice(-2), flog: f.log.slice(-1) }; });
    const pad = await G.center(h, '#whPad');
    const holdDir = async (dx, dy, ms) => { await G.touch(h, 'touchStart', [pad]); for (let i = 1; i <= 6; i++) { await G.touch(h, 'touchMove', [{ x: pad.x + dx * i / 6, y: pad.y + dy * i / 6 }]); await L.sleep(40); } const end = Date.now() + ms; let k = 0; while (Date.now() < end) { await L.sleep(1000); k++; await G.touch(h, 'touchMove', [{ x: pad.x + dx + (k % 2), y: pad.y + dy }]); if (k % 10 === 0) R.samples.push(await st()); } await G.touch(h, 'touchEnd', []); };
    /* out of her cell */
    R.t0 = await st();
    for (let i = 0; i < 6 && (await st()).st !== 'free'; i++) await holdDir(0, -60, 8000);
    R.free = await st(); console.log('FREE', JSON.stringify(R.free));
    /* break out: to the edge, push outward */
    let a = 0, tries = 0;
    while (!(await st()).on && tries < 10) { tries++; await p.evaluate(() => LowiMistyGalaxy._probe(0.97)); await holdDir(Math.cos(a) * 60, Math.sin(a) * 60, 8000); a += 0.7; }
    R.breakout = { tries, s: await st() }; console.log('BREAKOUT', JSON.stringify(R.breakout));
    if (R.breakout.s.on) {
        const t1 = Date.now(); await holdDir(0, -60, holdS * 1000); R.straight = { ms: Date.now() - t1, s: await st() }; console.log('STRAIGHT', JSON.stringify(R.straight));
        const t2 = Date.now(); let s; while (Date.now() - t2 < 180000) { await L.sleep(2000); s = await st(); R.samples.push(s); if (!s.on && s.st !== 'warp') break; }
        R.home = { ms: Date.now() - t2, s }; console.log('HOME', JSON.stringify(R.home));
    }
    console.log('SAMPLES', JSON.stringify(R.samples.map(s => [s.t, s.st, s.on ? 'G' : '-', s.far, s.loops, s.fr])));
    R.errs = { pe: h.log.pageerror, snap: await L.snap(h) }; console.log('ERR', JSON.stringify(R.errs).slice(0, 1200));
    fs.writeFileSync('/home/sprite/galaxy-audit/out/p5-' + view + '.json', JSON.stringify(R, null, 1));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
