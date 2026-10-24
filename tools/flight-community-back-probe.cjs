#!/usr/bin/env node
/* Flight crash hunt 17:01 (Oct 24 2026): flight-hunt-probe saw WebKit iPhone 13 'back home: page did not answer' (30 s evaluate
   timeout) after Home -> Community (For You) -> Home, both rounds. This probe times that round trip alone: it records the biggest
   main-thread gap (setTimeout heartbeat) and rAF gap around each step, so a real freeze shows up as a gap, not just a slow harness.
   Usage: node tools/flight-community-back-probe.cjs [url|root] [--engine webkit|chromium] [--device 'iPhone 13'] [--tab foryou] [--rounds 3]
   Simulated browsers only; Supabase is faked by the harness. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
const ENGINE = arg('engine', 'webkit'), DEVICE = arg('device', 'iPhone 13'), TAB = arg('tab', 'foryou'), ROUNDS = +arg('rounds', 3);
const within = (p, ms, what) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(what + ' timed out after ' + ms + ' ms')), ms))]);
(async () => {
    const o = { engine: ENGINE, device: DEVICE };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    if (ENGINE === 'webkit') await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
    await R.ctx.addInitScript({ content: '(' + function () {
        const G = window.__gap = { hb: 0, raf: 0, lastHb: 0, lastRaf: 0, reset() { G.hb = 0; G.raf = 0; } };
        const hb = () => { const t = performance.now(); if (G.lastHb) G.hb = Math.max(G.hb, t - G.lastHb); G.lastHb = t; setTimeout(hb, 50); }; hb();
        const rf = (t) => { if (G.lastRaf) G.raf = Math.max(G.raf, t - G.lastRaf); G.lastRaf = t; requestAnimationFrame(rf); }; requestAnimationFrame(rf);
    } + ')()' });
    const ev = async (fn, a) => { const t0 = Date.now(); const v = await within(P.evaluate(fn, a), 90000, 'evaluate').catch(e => ({ evalErr: String(e.message).slice(0, 120) })); return { v, ms: Date.now() - t0 }; };
    const gaps = () => ev(() => { const g = window.__gap, o = { hb: Math.round(g.hb), raf: Math.round(g.raf), cls: document.documentElement.className.split(/\s+/).filter(c => /^(wh-|lw-|cm-|gx-)/.test(c)).join(' '), nodes: document.getElementsByTagName('*').length }; g.reset(); return o; });
    const out = [];
    try {
        await R.goto(); await H.sleep(8000); await gaps();
        for (let r = 0; r < ROUNDS && !R.crashed; r++) {
            const a = await ev(t => { window.goTab(t); }, TAB); await H.sleep(2500); const g1 = await gaps();
            const b = await ev(() => { window.goTab('home'); }); await H.sleep(3000); const g2 = await gaps();
            await H.sleep(4000); const g3 = await gaps();
            const line = { r, toTabMs: a.ms, inTab: g1, toHomeMs: b.ms, homeErr: b.v && b.v.evalErr, afterHome: g2, settle: g3, crashed: R.crashed };
            out.push(line); console.log(R.el(), JSON.stringify(line));
        }
    } catch (e) { console.log('ERR', e.message); }
    console.log('RESULT', JSON.stringify({ engine: ENGINE, device: DEVICE, tab: TAB, crashed: R.crashed, loads: R.loads, worstHb: Math.max(0, ...out.map(l => Math.max(l.inTab.v && l.inTab.v.hb || 0, l.afterHome.v && l.afterHome.v.hb || 0))), worstToHomeMs: Math.max(0, ...out.map(l => l.toHomeMs)) }));
    await R.close().catch(() => { }); process.exit(0);
})();
