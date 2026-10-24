#!/usr/bin/env node
/* Flight crash hunt Oct 24: is a slow world trip the simulator's frame rate or the app? Counts real rAF ticks, the world loop's
   onFrame calls and the warp clock over the same 4 s, idle and during a trip. Simulated browser only. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('engine', 'webkit'), DEVICE = arg('device', 'iPhone 13');
(async () => {
    const R = await H.open({ engine: ENGINE, device: DEVICE, url: 'https://therealetm.github.io/lowispike/index.html' }), P = R.page;
    if (ENGINE === 'webkit') await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
    await R.goto(); await H.sleep(8000);
    const measure = () => P.evaluate(() => new Promise(res => {
        let raf = 0, of = 0, dts = []; const s = window.LowiWorldRegions.state, c0 = s.warp ? s.warp.clock : null, t0 = performance.now();
        const off = window.LowiWorld3D.onFrame(dt => { of++; dts.push(dt); });
        const tick = () => { raf++; if (performance.now() - t0 < 4000) requestAnimationFrame(tick); else { off(); const c1 = s.warp ? s.warp.clock : null; res({ raf, onFrame: of, dtAvg: dts.length ? +(dts.reduce((a, b) => a + b, 0) / dts.length).toFixed(4) : null, warpClk: c0 != null && c1 != null ? Math.round(c1 - c0) : null, ph: s.warp && s.warp.phase }); } };
        requestAnimationFrame(tick);
    }));
    console.log('idle', JSON.stringify(await measure()));
    await P.evaluate(() => window.LowiWorldRegions.travel('brain'));
    await H.sleep(300);
    console.log('trip in', JSON.stringify(await measure()));
    console.log('trip in 2', JSON.stringify(await measure()));
    await Promise.race([R.close(), H.sleep(10000)]).catch(() => { });
    process.exit(0);
})();
