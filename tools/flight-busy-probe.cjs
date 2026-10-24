#!/usr/bin/env node
/* Flight crash hunt 11:01 Oct 24: after a world trip with a tab switch, LowiWorldRegions.state.busy looked stuck true at the hub.
   Watches st.busy / st.warp phase / clock / cur over time for a few trip variants. Simulated browser only. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
const ENGINE = arg('engine', 'webkit'), DEVICE = arg('device', 'iPhone 13'), VAR = arg('variant', 'all');
(async () => {
    const o = { engine: ENGINE, device: DEVICE };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    if (ENGINE === 'webkit') await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
    const snap = () => P.evaluate(() => { const s = window.LowiWorldRegions.state, q = s.warp, c = document.documentElement.classList; return { cur: s.cur, busy: s.busy, target: s.target, next: s.next, warp: q ? { id: q.id, ph: q.phase, clk: Math.round(q.clock), rev: !!q.rev } : null, host: s.host ? s.host.id || s.host.className.slice(0, 30) : null, away: c.contains('wh-away'), home: c.contains('wh-home'), tab: (window.LowiNav && window.LowiNav.tab) || '' }; }).catch(e => ({ err: String(e.message).slice(0, 120) }));
    const watch = async (tag, secs) => { const out = []; for (let i = 0; i < secs * 2; i++) { const s = await snap(); out.push(s); await H.sleep(500); } const last = out[out.length - 1]; console.log(R.el(), tag, 'first', JSON.stringify(out[0]), '\n   ... last', JSON.stringify(last)); return last; };
    const goTab = t => P.evaluate(t => window.goTab(t), t);
    const results = {};
    try {
        await R.goto(); await H.sleep(7000);
        console.log('start', JSON.stringify(await snap()));
        if (VAR === 'all' || VAR === 'plain') {
            await P.evaluate(() => window.LowiWorldRegions.travel('brain'));
            let s = await watch('plain in brain', 14); results.plainIn = s;
            await P.evaluate(() => window.LowiWorldRegions.travel('hub', false, 0, { wide: true }));
            s = await watch('plain back hub', 14); results.plainOut = s;
        }
        if (VAR === 'all' || VAR === 'tabin') {
            await P.evaluate(() => window.LowiWorldRegions.travel('heart'));
            await H.sleep(900); await goTab('foryou'); await H.sleep(1500);
            console.log('  on community', JSON.stringify(await snap()));
            await goTab('home');
            let s = await watch('tab during trip in', 16); results.tabIn = s;
            await P.evaluate(() => window.LowiWorldRegions.travel('hub', false, 0, { wide: true }));
            s = await watch('back hub after tab trip', 16); results.tabOut = s;
            await P.evaluate(() => window.LowiWorldRegions.travel('liver'));
            s = await watch('next trip liver', 14); results.next = s;
            await P.evaluate(() => window.LowiWorldRegions.travel('hub', false, 0, { wide: true }));
            s = await watch('liver back', 14); results.nextOut = s;
        }
        if (VAR === 'all' || VAR === 'tabout') {
            await P.evaluate(() => window.LowiWorldRegions.travel('gut'));
            await watch('gut in', 12);
            await P.evaluate(() => window.LowiWorldRegions.travel('hub', false, 0, { wide: true }));
            await H.sleep(700); await goTab('shelf'); await H.sleep(1500);
            console.log('  on cook', JSON.stringify(await snap()));
            await goTab('home');
            const s = await watch('tab during trip out', 16); results.tabOutOnly = s;
        }
    } catch (e) { console.log('probe error', e.message.slice(0, 200)); }
    const errs = R.errs.filter(e => !/audio device|NotAllowedError|play\(\) failed/i.test(e.m));
    console.log('RESULT ' + JSON.stringify({ crashed: !!R.crashed, loads: R.loads, results, errs: errs.slice(0, 8) }, null, 1));
    await Promise.race([R.close(), H.sleep(15000)]).catch(() => { });
    process.exit(0);
})();
