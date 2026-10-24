#!/usr/bin/env node
/* Oct 24 2026: does the 3D world keep drawing after a tab switch in the middle of a trip into a world?
   Taps/opens a place, switches tab after MID ms, comes back to Home, then samples the frame counter and the render gates every second.
   Usage: node tools/tab-mid-trip-repro.cjs [url|root] [--engine webkit|chromium] [--tab foryou] [--mid 900] [--id heart] */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
(async () => {
    const o = { engine: arg('engine', 'webkit'), device: arg('device', 'iPhone 13') };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    if (o.engine === 'webkit') await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
    const errs = []; P.on('pageerror', e => errs.push(String(e && e.message || e).slice(0, 200)));
    const ev = (fn, a) => P.evaluate(fn, a).catch(e => ({ evalErr: String(e.message).slice(0, 160) }));
    const look = () => ev(() => {
        const W3 = window.LowiWorld3D, s = (window.LowiWorldRegions && window.LowiWorldRegions.state) || {}, c = document.documentElement.classList, q = s.warp;
        const tab = document.getElementById('spHome');
        return { fr: window.__fwN || 0, ferr: W3 && W3.frameErrors, run: W3 && W3.rig ? undefined : null, cur: s.cur, busy: s.busy, warp: q ? q.phase + ' ' + Math.round(q.clock || 0) : null,
            tab: document.documentElement.dataset.tab || '', hidden: document.hidden, spHomeShown: !!(tab && tab.offsetParent),
            ov: [...document.querySelectorAll('.r2-ov, .sp-world.on, .ht-world.on')].map(e => e.className.slice(0, 40)),
            cls: [...c].filter(k => /^(wh-|bwr-|mf-|cr-|rm-|mm-|stp-|sz-|bw3)/.test(k)).join(' ') };
    });
    try {
        await R.goto(); await H.sleep(7000);
        for (let i = 0; i < 60 && (await ev(() => !!(window.LowiWorld3D && window.LowiWorld3D.onFrame))) !== true; i++) await H.sleep(500);
        await ev(() => { window.LowiWorld3D.onFrame(() => { window.__fwN = (window.__fwN || 0) + 1; }); });
        const id = arg('id', 'heart'), tab = arg('tab', 'foryou'), mid = +arg('mid', 900);
        console.log('start', JSON.stringify(await look()));
        await ev(id => window.LowiWorldRegions.travel(id), id);
        await H.sleep(mid); await ev(t => window.goTab(t), tab); await H.sleep(2200);
        console.log('on ' + tab, JSON.stringify(await look()));
        await ev(() => window.goTab('home'));
        for (let i = 0; i < 20; i++) { await H.sleep(1000); console.log('home +' + (i + 1) + 's', JSON.stringify(await look())); }
        if (errs.length) console.log('errors', JSON.stringify(errs));
    } catch (e) { console.log('stopped', e.message); }
    try { await R.close(); } catch (e) { }
    process.exit(0);
})();
