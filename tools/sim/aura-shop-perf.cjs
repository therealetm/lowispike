/* Aura shop: cost of each animated aura on a low-end phone. Mobile Chromium, CPU slowed 4x (DevTools throttling), Home with
   Misty, frames counted for 4 s with no aura and with each one. node tools/sim/aura-shop-perf.cjs */
'use strict';
const H = require('./harness.cjs');
(async () => {
    const R = await H.open({ engine: 'chromium', probe: false });
    const P = R.page, out = {};
    await R.ctx.addInitScript(() => { try { localStorage.setItem('lowispike.sparks.v1', JSON.stringify({ own: ['ember', 'orbs', 'trail', 'electric', 'prism', 'galaxy'] })); } catch (e) { } });
    await R.goto(); await H.sleep(4000);
    const cdp = await R.ctx.newCDPSession(P); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const fps = () => P.evaluate(() => new Promise(res => { let n = 0, worst = 0, last = performance.now(); const t0 = last; const f = t => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 4000) requestAnimationFrame(f); else res({ fps: Math.round(n / ((t - t0) / 1000) * 10) / 10, worstMs: Math.round(worst) }); }; requestAnimationFrame(f); }));
    for (const id of ['', 'ember', 'orbs', 'trail', 'electric', 'prism', 'galaxy']) {
        await P.evaluate(id => { if (id) localStorage.setItem('lowispike.aura.v1', id); else localStorage.removeItem('lowispike.aura.v1'); LowiWorldHome.openDetails('aura'); }, id); await H.sleep(700);
        await P.evaluate(() => LowiWorldHome.closeTop && LowiWorldHome.closeTop()); await H.sleep(1500);
        out[id || 'none'] = await fps();
    }
    console.log(JSON.stringify(out));
    await R.close(); process.exit(0);
})();
