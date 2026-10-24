#!/usr/bin/env node
/* Flight crash hunt 13:01 Oct 24: in flight-hunt-probe runs LowiWorldRegions.state.busy stayed true from the first world trip to the
   end (25 s idle) in WebKit 320 and Chromium 390. Does it ever clear? Replays the hunt's trip (drag, travel, Community, Home, travel
   hub wide) and then watches busy, warp phase, warp clock and real animation frames for up to --secs seconds. Simulated only. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
const ENGINE = arg('engine', 'chromium'), SECS = +arg('secs', 120);
(async () => {
    const o = { engine: ENGINE, device: 'iPhone 13' };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    if (ENGINE === 'webkit') await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
    const snap = () => P.evaluate(() => { const s = window.LowiWorldRegions.state, q = s.warp, c = document.documentElement.classList;
        return { cur: s.cur, busy: s.busy, target: s.target, next: s.next, warp: q ? { id: q.id, ph: q.phase, clk: q.clock != null ? Math.round(q.clock) : q.t != null ? +(+q.t).toFixed(2) : null, keys: Object.keys(q).slice(0, 14).join(',') } : null, st: window.LowiMistyFlight && window.LowiMistyFlight.state().st, frames: window.__fpN || 0, away: c.contains('wh-away'), home: c.contains('wh-home') }; });
    const goTab = t => P.evaluate(t => window.goTab(t), t);
    let cleared = null;
    try {
        await R.goto(); await H.sleep(7000);
        await P.evaluate(() => { window.__fpN = 0; const f = () => { window.__fpN++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
        console.log('start', JSON.stringify(await snap()));
        await P.evaluate(() => window.LowiWorldRegions.travel('brain')); await H.sleep(900); if (arg('tab', '1') === '1') { await goTab('foryou'); await H.sleep(1500); await goTab('home'); } await H.sleep(6000);   /* --tab 0: let the trip run (14:01) */
        console.log(R.el(), 'after trip + tab', JSON.stringify(await snap()));
        await P.evaluate(() => window.LowiWorldRegions.travel('hub', false, 0, { wide: true }));
        const t0 = Date.now();
        while (Date.now() - t0 < SECS * 1000) { const s = await snap(); console.log(R.el(), JSON.stringify(s)); if (!s.busy && s.cur === 'hub') { cleared = Math.round((Date.now() - t0) / 1000); break; } await H.sleep(3000); }
    } catch (e) { console.log('probe error', e.message.slice(0, 200)); }
    const errs = R.errs.filter(e => !/audio device|NotAllowedError|play\(\) failed/i.test(e.m));
    console.log('RESULT ' + JSON.stringify({ engine: ENGINE, crashed: !!R.crashed, loads: R.loads, clearedAfterS: cleared, errs: errs.slice(0, 8) }));
    await Promise.race([R.close(), H.sleep(15000)]).catch(() => { });
    process.exit(0);
})();
