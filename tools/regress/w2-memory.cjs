#!/usr/bin/env node
/* W2 memory and rendering pressure (task 29188430). Fast tab hopping and Community re-entry, the way an impatient player
   taps around, with a forced GC before every measurement. Anything that keeps growing round after round (DOM nodes,
   window/document listeners, intervals, live canvases / GL contexts, three.js geometries, JS heap) is what kills an iPhone
   tab after a few minutes. Chromium only gives the heap number; WebKit gives the rest.
   Usage: node tools/regress/w2-memory.cjs [--engine chromium] [--rounds 20] */
'use strict';
const { open } = require('./harness.cjs');
const N = require('./nav.cjs');
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('engine', 'chromium'), ROUNDS = +arg('rounds', 20);
const log = N.logger('w2-' + ENGINE);
const gcSnap = async R => { await R.page.evaluate(async () => { if (window.gc) { gc(); await new Promise(r => setTimeout(r, 200)); gc(); } }).catch(() => { }); return N.within(R.snap(), 20000, 'snap', log); };
(async () => {
    const R = await open({ engine: ENGINE, members: 45, messages: 300 });
    const res = { engine: ENGINE, series: [] };
    await R.goto(); await N.sleep(3000);
    res.base = await gcSnap(R); log('base', res.base);
    const tabs = ['home', 'foryou', 'scan', 'shelf', 'move', 'foryou', 'home'];
    for (let i = 1; i <= ROUNDS && !R.crashed; i++) {
        R.step = 'round ' + i;
        for (const t of tabs) { await R.page.evaluate(t => { try { goTab(t); } catch (e) { } }, t).catch(() => { }); await N.sleep(350); }
        /* Community: open the chat history, a member's card, then the composer, then leave */
        await R.page.evaluate(() => { try { goTab('foryou'); } catch (e) { } }).catch(() => { });
        await N.sleep(500);
        await R.page.locator('.cg-hist').first().click({ timeout: 3000, force: true }).catch(() => { });
        await N.sleep(400);
        await R.page.keyboard.press('Escape').catch(() => { });
        await R.page.locator('.cg-body:not(.me)').first().click({ timeout: 3000, force: true }).catch(() => { });
        await N.sleep(400);
        await R.page.keyboard.press('Escape').catch(() => { });
        for (let k = 0; k < 5; k++) R.sim.say();
        await N.sleep(300);
        await R.page.evaluate(() => { try { goTab('home'); } catch (e) { } }).catch(() => { });
        await N.sleep(500);
        if (i % 4 === 0) await N.hideShow(R, 800);
        const s = await gcSnap(R); s.i = i; s.errs = R.errs.length; s.ov = (await N.overlays(R)).length;
        res.series.push(s); log('round', s);
    }
    const S = res.series, keys = ['nodes', 'canv', 'imgs', 'lis', 'iv', 'to', 'ctxAll', 'ctxGL', 'heap', 'ov'];
    const avg = (a, k) => a.reduce((x, y) => x + (+y[k] || 0), 0) / Math.max(1, a.length);
    if (S.length >= 8) {
        const first = S.slice(1, 4), last = S.slice(-3);
        res.growth = {}; for (const k of keys) res.growth[k] = { first: +avg(first, k).toFixed(1), last: +avg(last, k).toFixed(1), perRound: +((avg(last, k) - avg(first, k)) / (S.length - 3)).toFixed(2) };
        res.three = { first: S[1].three, last: S[S.length - 1].three };
    }
    res.crashed = R.crashed; res.loads = R.loads; res.errs = R.errs;
    fs.writeFileSync(path.join(__dirname, 'out', 'w2-' + ENGINE + '.json'), JSON.stringify(res, null, 1));
    log('DONE crashed=' + R.crashed + ' errs=' + R.errs.length + ' growth=' + JSON.stringify(res.growth));
    await R.close(); process.exit(0);
})().catch(e => { log('FATAL ' + (e.stack || e)); process.exit(1); });
