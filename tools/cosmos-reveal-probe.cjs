#!/usr/bin/env node
/* Diagnosis probe (Oct 23, Eman: flying Misty out of her bubble, "the universe isn't translucent, it pops in, boop"). Serves a
   folder (or --url), steers Misty to the edge of her bubble and pushes until she breaks out into the spirit world, and records
   every frame (LowiWorld3D.cosmosLook): is the spirit world drawn, the camera distance, and the opacity of the stars and of a
   world out there. Prints the value on the first drawn frame and the largest jump between two frames.
   Usage: node tools/cosmos-reveal-probe.cjs [--root DIR] [--url URL] [--w 390 --h 844] [--secs 25] */
'use strict';
const path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
    const W = +arg('w', 390), Ht = +arg('h', 844), SECS = +arg('secs', 25);
    const o = { engine: 'chromium', viewport: { width: W, height: Ht }, dpr: 1, cloud: false, probe: false };
    if (arg('url')) o.url = arg('url'); else o.root = path.resolve(arg('root', path.join(__dirname, '..')));
    const r = await H.open(o); const page = r.page; await r.goto();
    await page.waitForFunction(() => window.LowiWorld3D && window.LowiWorld3D.ready && window.LowiMistyFlight && window.LowiMistyGalaxy && window.LowiWorld3D.cosmosLook, null, { timeout: 90000 });
    await H.sleep(4000);
    await page.evaluate(() => { window.__cl = []; const f = () => { const l = LowiWorld3D.cosmosLook(); if (l) { l.t = Math.round(performance.now()); l.gal = document.documentElement.classList.contains('mf-galaxy'); window.__cl.push(l); } if (window.__cl.length < 20000) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    const pad = await page.evaluate(() => { const e = document.getElementById('whPad') || document.querySelector('.mp-pad, [class*=pad]'); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    if (!pad) { console.log('no pad'); process.exit(3); }
    let on = false, a = 0; const end = Date.now() + 150000;
    await page.evaluate(() => LowiPad.mode('drive'));
    while (!on && Date.now() < end) {
        const t1 = Date.now() + 9000;
        while (Date.now() < t1 && !on) { on = await page.evaluate(a => { LowiPad.steer(Math.cos(a), Math.sin(a)); if (!LowiMistyGalaxy.state().on) LowiMistyGalaxy._probe(0.97); return LowiMistyGalaxy.state().on; }, a); await H.sleep(120); }
        if (!on) { console.log('try a=' + a.toFixed(1), JSON.stringify(await page.evaluate(() => ({ f: LowiMistyFlight.state().st, g: LowiMistyGalaxy.state().p }))).slice(0, 200)); a += 0.7; }
    }
    if (on) { const t2 = Date.now() + SECS * 1000; while (Date.now() < t2) { await page.evaluate(a => LowiPad.steer(Math.cos(a), Math.sin(a)), a); await H.sleep(150); } }
    const L = await page.evaluate(() => window.__cl);
    const i0 = L.findIndex(l => l.vis);
    let jS = 0, jO = 0, at = -1;
    for (let i = 1; i < L.length; i++) { const ds = L[i].stars - L[i - 1].stars, dO = L[i].oth - L[i - 1].oth; if (ds > jS) { jS = ds; at = i; } if (dO > jO) jO = dO; }
    const gi = L.findIndex(l => l.gal);
    console.log('size=' + W + 'x' + Ht + ' frames=' + L.length + ' brokeOut=' + on + ' breakoutFrame=' + gi + ' firstDrawnFrame=' + i0);
    if (i0 >= 0) console.log('FIRST DRAWN', JSON.stringify(L[i0]), 'prev', JSON.stringify(L[i0 - 1] || null));
    console.log('MAX JUMP per frame: stars=' + jS.toFixed(3) + ' world=' + jO.toFixed(3) + ' at', JSON.stringify(L[at] || null), 'prev', JSON.stringify(L[at - 1] || null));
    const k = [0, 10, 20, 40, 60, 90, 120, 180].map(n => L[i0 + n]).filter(Boolean).map(l => 'd' + l.d + ':s' + l.stars + '/w' + l.oth + '/rv' + l.rv);
    console.log('RAMP after first drawn:', k.join('  '));
    await r.close(); process.exit(0);
})().catch(e => { console.error('PROBE FAIL', e.message); process.exit(2); });
