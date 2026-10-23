#!/usr/bin/env node
/* Diagnosis probe (Oct 23, Eman: "every time I fly into a world it disappears, it pops away"). Serves a folder (or --url), puts
   Misty on autopilot (she flies to the body places herself) and samples every 150 ms: flight state, the place she is near and
   how far, and for every body place its veil (scene setVeil: 1 = shown, 0 = faded out behind a Home bubble) and whether the
   scene counts it as under a bubble. Prints every moment a place she is approaching or inside is faded.
   Usage: node tools/veil-entry-probe.cjs [--root DIR] [--url URL] [--secs 60] [--w 390 --h 844] */
'use strict';
const path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
    const W = +arg('w', 390), Ht = +arg('h', 844), SECS = +arg('secs', 60);
    const o = { engine: 'chromium', viewport: { width: W, height: Ht }, dpr: 1, cloud: false, probe: false };
    if (arg('url')) o.url = arg('url'); else o.root = path.resolve(arg('root', path.join(__dirname, '..')));
    const r = await H.open(o);
    const page = r.page; await r.goto();
    await page.waitForFunction(() => window.LowiWorld3D && window.LowiWorld3D.ready && window.LowiMistyFlight && window.LowiPad, null, { timeout: 90000 });
    /* the harness has no account, so the sign-in gate hides Home (gate-boot: visibility hidden); a signed-in user sees the bubbles */
    await page.evaluate(() => { const g = () => document.documentElement.classList.remove('gate-boot', 'gate-up'); g(); setInterval(g, 500); const r2 = document.getElementById('r2gate'); if (r2) r2.hidden = true; });
    await H.sleep(4000);
    const idle = await page.evaluate(() => ({ circles: (LowiWorld3D.veilCircles ? LowiWorld3D.veilCircles() : []).length, look: LowiWorld3D.veilLook ? LowiWorld3D.veilLook() : null }));
    console.log('IDLE circles', idle.circles, JSON.stringify((idle.look || []).map(b => b.id + ':' + b.veil)));
    await page.evaluate(() => LowiPad.mode('auto'));
    const t0 = Date.now(); let bad = 0, samples = 0, nearSamples = 0; const seen = new Set(), entered = new Set();
    while (Date.now() - t0 < SECS * 1000) {
        const s = await page.evaluate(() => { const f = LowiMistyFlight.state(); const l = LowiWorld3D.veilLook ? LowiWorld3D.veilLook() : []; const c = LowiWorld3D.veilCircles ? LowiWorld3D.veilCircles().length : -1; return { st: f.st, near: f.near, nearD: f.nearD, cls: document.documentElement.className.match(/mf-[a-z]+/g), c, l }; });
        samples++;
        if (s.near) { seen.add(s.near); nearSamples++; }
        if (s.st === 'inside' && s.near) entered.add(s.near);
        const tgt = s.near && s.l.find(b => b.id === s.near);
        const faded = s.l.filter(b => b.veil < 0.5).map(b => b.id + '(' + b.veil + (b.under ? ',under' : '') + ')');
        if (tgt && tgt.veil < 0.5) { bad++; if (bad <= 25) console.log(((Date.now() - t0) / 1000).toFixed(1) + 's FADED-TARGET st=' + s.st + ' near=' + s.near + ' d=' + s.nearD + ' circles=' + s.c + ' cls=' + (s.cls || []).join(' ') + ' faded=' + faded.join(' ')); }
        else if (samples % 20 === 0) console.log(((Date.now() - t0) / 1000).toFixed(1) + 's st=' + s.st + ' near=' + s.near + ' d=' + s.nearD + ' circles=' + s.c + ' faded=' + faded.join(' '));
        await H.sleep(150);
    }
    console.log('SUMMARY size=' + W + 'x' + Ht + ' samples=' + samples + ' nearSamples=' + nearSamples + ' fadedTarget=' + bad + ' places=' + [...seen].join(',') + ' entered=' + [...entered].join(','));
    await r.close();
    process.exit(0);
})().catch(e => { console.error('PROBE FAIL', e); process.exit(2); });
