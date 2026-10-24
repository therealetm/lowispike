#!/usr/bin/env node
/* Flight crash hunt 20:01 Oct 24: lists every element that carries a glass blur (backdrop-filter) on Home, on Move, and on Home
   again after Move, with its size, opacity and visibility. Headless WebKit only died after Move -> Home with the blur on
   (tools/flight-auto-tab-loop-probe.cjs --noblur 1 never did), so this shows which blurred layers stay composited.
   Usage: node tools/flight-blur-census-probe.cjs [url|root] [--engine chromium|webkit] [--device 'iPhone 13'] */
'use strict';
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
(async () => {
    const o = { engine: arg('engine', 'chromium'), device: arg('device', 'iPhone 13') }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    const census = () => P.evaluate(() => {
        const vw = innerWidth, vh = innerHeight, out = [];
        for (const e of document.querySelectorAll('*')) {
            const c = getComputedStyle(e), b = c.backdropFilter || c.webkitBackdropFilter;
            if (!b || b === 'none') continue;
            const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
            let op = 1, hid = false, disp = false; for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const s = getComputedStyle(n); op *= +s.opacity; if (s.display === 'none') disp = true; } hid = c.visibility === 'hidden';
            const onScreen = r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh;
            out.push({ id: e.id, cls: String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).slice(0, 60), tag: e.tagName.toLowerCase(), b, w: Math.round(r.width), h: Math.round(r.height), area: +(r.width * r.height / (vw * vh)).toFixed(2), op: +op.toFixed(2), hid, onScreen });
        }
        return out;
    });
    const show = (label, l) => { const live = l.filter(x => !x.hid && x.onScreen); const ghost = live.filter(x => x.op < 0.02); console.log('\n== ' + label + ': ' + l.length + ' blurred, ' + live.length + ' visible+on screen, ' + ghost.length + ' of those at opacity ~0, full-screen-ish ' + live.filter(x => x.area > 0.5).length); for (const x of l) console.log(JSON.stringify(x)); };
    try {
        await R.goto(); await H.sleep(8000);
        show('home', await census());
        await P.evaluate(() => window.goTab('move')); await H.sleep(2500);
        show('move', await census());
        await P.evaluate(() => window.goTab('home')); await H.sleep(3000);
        show('home after move', await census());
        await P.evaluate(() => window.goTab('shelf')); await H.sleep(2500);
        show('cook', await census());
        await P.evaluate(() => window.goTab('home')); await H.sleep(3000);
        show('home after cook', await census());
    } catch (e) { console.log('ERR', e.message); }
    await R.close();
})();
