#!/usr/bin/env node
/* Flight crash hunt 18:01 Oct 24: the simulated WebKit renderer has died 5 times, always right after autopilot + a tab switch
   (iPhone SE at autopilot + goTab('move') at 10:01, 12:01, 15:01; iPhone 13 at the world trip that follows it at 18:01, after the
   page stopped answering for ~110 s). This repeats only that sequence N times on one page and logs, per loop, how long the page took to
   answer, a setTimeout heartbeat gap, and whether the renderer died.
   Usage: node tools/flight-auto-tab-loop-probe.cjs [url] [--engine webkit] [--device 'iPhone 13'] [--loops 6] [--tab move] [--nomedia 1] [--blocks 1] [--auto 0] [--tab none] [--noblur 1]
   --noblur 1 turns off every backdrop-filter (the glass blur) to test whether the stalls come from it.
   --auto 0 skips autopilot; --tab none skips the tab switch (the For You hop after the trip stays).
   --blocks 1 adds tools/sim/long-block-init.js and prints, per loop, the callbacks and WebGL calls that held the main thread longest. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
const ENGINE = arg('engine', 'webkit'), DEVICE = arg('device', 'iPhone 13'), LOOPS = +arg('loops', 6), TAB = arg('tab', 'move'), NOMEDIA = arg('nomedia', '1') === '1', AUTO = arg('auto', '1') === '1';
const within = (p, ms, what) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(what + ' timed out after ' + ms + ' ms')), ms))]);
(async () => {
    const o = { engine: ENGINE, device: DEVICE }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    if (ENGINE === 'webkit' && NOMEDIA) await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
    if (arg('blocks', '0') === '1') await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'long-block-init.js'), 'utf8') });
    if (arg('noblur', '0') === '1') await R.ctx.addInitScript({ content: "document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';document.head.appendChild(s)})" });
    await R.ctx.addInitScript({ content: 'window.__hb={last:Date.now(),max:0};setInterval(()=>{const n=Date.now();window.__hb.max=Math.max(window.__hb.max,n-window.__hb.last);window.__hb.last=n},50);' });
    let step = 'load', slow = 0; const out = [];
    P.on('crash', () => console.log(R.el(), 'RENDERER CRASHED at', step));
    const ev = async (fn, a) => { const t = Date.now(); const r = await within(P.evaluate(fn, a), 30000, 'evaluate').catch(e => ({ evalErr: String(e.message).slice(0, 100) })); const ms = Date.now() - t; if (ms > 5000) { slow++; console.log(R.el(), 'slow answer', ms, 'ms at', step); } return r; };
    const snap = () => ev(() => { const hb = window.__hb.max; window.__hb.max = 0; const F = window.LowiMistyFlight, RG = window.LowiWorldRegions; return { hb, blocks: window.__lb && window.__lb.top(), st: F && F.state().st, cur: RG && RG.current(), busy: RG && RG.state.busy, pad: window.LowiPad && window.LowiPad.state().pad, nodes: document.getElementsByTagName('*').length }; });
    const goTab = t => ev(t => { window.goTab(t); }, t);
    try {
        await R.goto(); await H.sleep(8000);
        const ROUTE = await ev(() => window.LowiWorldRegions.ROUTE.slice());
        for (let i = 0; i < LOOPS && !R.crashed; i++) {
            step = 'L' + i + ' autopilot'; if (AUTO) await ev(() => window.LowiPad.mode('auto')); await H.sleep(6000);
            step = 'L' + i + ' goTab ' + TAB; if (TAB !== 'none') await goTab(TAB); await H.sleep(1000);
            step = 'L' + i + ' goTab home'; if (TAB !== 'none') await goTab('home'); await H.sleep(2000);
            step = 'L' + i + ' autopilot off'; await ev(() => window.LowiPad.mode('')); await H.sleep(1500);
            const w = Array.isArray(ROUTE) ? ROUTE[i % ROUTE.length] : 'brain';
            step = 'L' + i + ' trip ' + w; await ev(w => window.LowiWorldRegions.travel(w), w); await H.sleep(900); await goTab('foryou'); await H.sleep(1500); await goTab('home'); await H.sleep(6000);
            step = 'L' + i + ' back to hub'; await ev(() => window.LowiWorldRegions.travel('hub', false, 0, { wide: true })); await H.sleep(7000);
            const s = await snap(); if (i === 0) s.blurNow = await ev(() => [...document.querySelectorAll('*')].filter(e => { const c = getComputedStyle(e); const b = c.backdropFilter || c.webkitBackdropFilter; const r = e.getBoundingClientRect(); return b && b !== 'none' && r.width > 0 && r.height > 0 && c.visibility !== 'hidden'; }).length); out.push(s); console.log(R.el(), ('L' + i).padEnd(4), JSON.stringify(s));
        }
    } catch (e) { console.log('probe error at', step, String(e.message).slice(0, 160)); }
    const errs = R.errs.filter(e => !/audio device|NotAllowedError|play\(\) failed/i.test(e.m));
    console.log('RESULT ' + JSON.stringify({ engine: ENGINE, device: DEVICE, tab: TAB, auto: AUTO, noblur: arg('noblur', '0') === '1', nomedia: NOMEDIA, loops: out.length, crashed: R.crashed ? step : false, slowAnswers: slow, maxHeartbeatGap: Math.max(0, ...out.map(s => s.hb || 0)), loads: R.loads, errs: errs.slice(0, 8).map(e => String(e.m).slice(0, 160)) }));
    await within(R.close(), 15000, 'close').catch(() => { });
    process.exit(0);
})();
