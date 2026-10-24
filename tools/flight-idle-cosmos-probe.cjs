#!/usr/bin/env node
/* Flight crash hunt 16:01 (Oct 24 2026): flight-hunt-probe on Chromium 1180x820 ended its 25 s idle with Home in wh-cosmos +
   wh-mapview (the spirit-world view past the World Map) and the controller hidden, with nobody touching anything.
   This watches a still Home: the camera distance, maxD, the state classes and the controller, every 2 s.
   --after none|wide|turn|wideturn : what to do before the idle watch (wide = trip into a world and back with the World Map
   trip home, like flight-hunt; turn = rotate to portrait and back).
   Usage: node tools/flight-idle-cosmos-probe.cjs [url|root] [--engine chromium] [--size 1180x820] [--after wideturn] [--idle 60]
   Simulated browser only; Supabase is faked by the harness. */
'use strict';
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
const SIZE = String(arg('size', '1180x820')).match(/^(\d+)x(\d+)$/), AFTER = String(arg('after', 'wideturn')), IDLE = +arg('idle', 60);
const within = (p, ms, what) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(what + ' timed out after ' + ms + ' ms')), ms))]);
(async () => {
    const o = { engine: arg('engine', 'chromium'), viewport: { width: +SIZE[1], height: +SIZE[2] }, dpr: 2 };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    const ev = (fn, a) => within(P.evaluate(fn, a), 30000, 'evaluate').catch(e => ({ evalErr: String(e.message).slice(0, 160) }));
    const look = () => ev(() => {
        const WH = window.LowiWorldHome, r = WH && WH.rig && WH.rig(), F = window.LowiMistyFlight, RG = window.LowiWorldRegions, st = F ? F.state() : {};
        const b = document.getElementById('whPad'), s = b && getComputedStyle(b);
        const W = WH && WH.state || {};
        return { dist: r ? +(+r.dist).toFixed(2) : null, maxD: r && r.maxD && +(+r.maxD).toFixed(2), minD: r && r.minD && +(+r.minD).toFixed(2), home: r && r.homeDist && +(+r.homeDist).toFixed(2), idle: r && +(+r.idle || 0).toFixed(1), fly: !!(r && r.fly), mode: r && r.mode,
            zoomAnim: !!W.zoomAnim, heroAnim: !!W.heroAnim, padMode: window.LowiPad ? window.LowiPad.state().pad : null, mf: st.st, busy: RG && RG.state && RG.state.busy, cur: RG && RG.current && RG.current(),
            padOp: s ? s.opacity : null, cls: document.documentElement.className.split(/\s+/).filter(c => /^(wh-|lw-|mf-|gx-)/.test(c)).join(' '), vw: innerWidth, vh: innerHeight };
    });
    await R.goto(); await H.sleep(6000);
    let s = await look(); console.log(R.el(), 'start'.padEnd(12), JSON.stringify(s));
    if (/wide/.test(AFTER)) {
        await ev(() => window.LowiWorldRegions.travel('lung')); await H.sleep(9000); console.log(R.el(), 'in lung'.padEnd(12), JSON.stringify(await look()));
        await ev(() => window.LowiWorldRegions.travel('hub', false, 0, { wide: true })); await H.sleep(9000); console.log(R.el(), 'wide hub'.padEnd(12), JSON.stringify(await look()));
        /* the sim clock is slow (each frame counts at most 0.05 s): wait until the trip home has really landed on the World Map */
        for (let i = 0; i < 60; i++) { const q = await look(); if (q.busy === false && q.maxD && q.dist > q.maxD * 0.97) break; await H.sleep(2000); }
        console.log(R.el(), 'landed'.padEnd(12), JSON.stringify(await look()));
    }
    if (/turn/.test(AFTER)) {
        await P.setViewportSize({ width: +SIZE[2], height: +SIZE[1] }); await H.sleep(1500); console.log(R.el(), 'turned'.padEnd(12), JSON.stringify(await look()));
        await P.setViewportSize({ width: +SIZE[1], height: +SIZE[2] }); await H.sleep(1500); console.log(R.el(), 'turned back'.padEnd(12), JSON.stringify(await look()));
    }
    let cosmos = 0, first = null;
    for (let t = 0; t < IDLE; t += 2) {
        await H.sleep(2000); s = await look(); console.log(R.el(), ('idle ' + t).padEnd(12), JSON.stringify(s));
        if (s.cls && /wh-cosmos/.test(s.cls)) { cosmos++; if (!first) first = s; }
    }
    console.log('RESULT', JSON.stringify({ after: AFTER, size: SIZE[0], crashed: !!R.crashed, loads: R.loads, cosmosChecks: cosmos, first }, null, 1));
    await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
