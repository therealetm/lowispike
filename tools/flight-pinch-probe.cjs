#!/usr/bin/env node
/* Hourly flight crash hunt (Oct 24 2026, 13:01): real two-finger pinch / spread and double taps on Home's world, the way a thumb
   and finger do it (Chromium CDP multi-touch). Pinches out to the universe and back in many times fast, double-taps, wheel-zooms,
   flies a little in between and checks after each step: renderer alive, page errors, the world loop still drawing (rig distance
   and frame count move), the camera distance finite and inside its range, the world places still there, the controller back.
   Usage: node tools/flight-pinch-probe.cjs [url|root] [--size 390x844] [--rounds 6]
   Simulated browser only, not a real iPhone; Supabase is faked by the harness. */
'use strict';
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
const SIZE = String(arg('size', '390x844')).match(/^(\d+)x(\d+)$/), ROUNDS = +arg('rounds', 6);
const within = (p, ms, what) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(what + ' timed out after ' + ms + ' ms')), ms))]);
(async () => {
    const o = { engine: 'chromium', viewport: { width: +SIZE[1], height: +SIZE[2] }, dpr: 2 };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page, found = [];
    const ev = (fn, a) => within(P.evaluate(fn, a), 30000, 'evaluate').catch(e => ({ evalErr: String(e.message).slice(0, 160) }));
    const cdp = await R.ctx.newCDPSession(P);
    const tp = (type, pts) => within(cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i + 1 })) }), 20000, 'touch').catch(() => { });
    const look = () => ev(() => {
        const WH = window.LowiWorldHome, r = WH && WH.rig && WH.rig(), W3 = window.LowiWorld3D, RG = window.LowiWorldRegions;
        const b = document.getElementById('whPad'); let pad = 'missing'; if (b) { const q = b.getBoundingClientRect(); pad = q.width > 20 && q.right > 0 && q.left < innerWidth && q.bottom > 0 && q.top < innerHeight ? 'on' : 'off'; }
        return { dist: r ? +(+r.dist).toFixed(2) : null, minD: r && r.minD, maxD: r && r.maxD, outer: r && r.outerD, mode: r && r.mode, frames: window.__fpN || 0, lost: !!(W3 && W3.lost), regions: W3 && W3.regions ? W3.regions.length : null, cur: RG && RG.current && RG.current(), pad, cls: ['wh-home', 'wh-away', 'lw-clean-auto', 'wh-far'].filter(c => document.documentElement.classList.contains(c)).join(' ') };
    });
    let base = null;
    const check = async (tag) => {
        if (R.crashed) { found.push(tag + ': RENDERER CRASHED'); return null; }
        const f0 = await ev(() => window.__fpN || 0); await H.sleep(1500);
        const s = await look();
        if (s.evalErr) { found.push(tag + ': page did not answer (' + s.evalErr + ')'); return s; }
        if (!base) base = s;
        if (!(s.frames > f0)) found.push(tag + ': no animation frames in 1.5 s (' + f0 + ' -> ' + s.frames + ')');
        if (s.dist != null && !(isFinite(s.dist) && s.dist > 0)) found.push(tag + ': camera distance broken ' + s.dist);
        if (s.lost) found.push(tag + ': WebGL context lost');
        if (base.regions && s.regions != null && s.regions < base.regions) found.push(tag + ': world places dropped ' + base.regions + ' -> ' + s.regions);
        if (R.loads > 1) found.push(tag + ': page reloaded (' + R.loads + ' loads)');
        console.log(R.el(), tag.padEnd(22), JSON.stringify(s));
        return s;
    };
    /* a spot on the world itself (canvas), away from Misty, the bubbles and the controller */
    const spot = () => ev(() => { const ok = el => el && (el.tagName === 'CANVAS' || el.id === 'whWorld' || (el.className && /bw3|wh-world|world-home/.test(String(el.className)))) && !el.closest('#spBubble,#whPad,.bloom,[data-bloom],button');
        /* the two fingers go up to 150 px either side, so the spot keeps them both on the screen */
        for (const fy of [0.5, 0.42, 0.58, 0.35, 0.65, 0.28, 0.72]) for (const fx of [0.5, 0.42, 0.58]) { const x = Math.min(Math.max(innerWidth * fx, 155), innerWidth - 155), y = innerHeight * fy, e = document.elementFromPoint(x, y);
            if (ok(e) && ok(document.elementFromPoint(x - 60, y)) && ok(document.elementFromPoint(x + 60, y))) return { x, y, el: e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 30) }; }
        const e = document.elementFromPoint(innerWidth / 2, innerHeight * 0.3); return { x: innerWidth / 2, y: innerHeight * 0.3, el: 'fallback ' + (e && e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 40)) }; });
    const pinch = async (c, d0, d1, steps) => { await tp('touchStart', [[c.x - d0 / 2, c.y], [c.x + d0 / 2, c.y]]); for (let i = 1; i <= steps; i++) { const d = d0 + (d1 - d0) * i / steps; await tp('touchMove', [[c.x - d / 2, c.y], [c.x + d / 2, c.y]]); await H.sleep(30); } await tp('touchEnd', []); };
    const tap = async (c) => { await tp('touchStart', [[c.x, c.y]]); await H.sleep(40); await tp('touchEnd', []); };
    try {
        R.step = 'load'; await R.goto(); await H.sleep(6000);
        await ev(() => { window.__fpN = 0; const f = () => { window.__fpN++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
        const c = await spot(); console.log('spot', JSON.stringify(c));
        await check('start');
        for (let r = 0; r < ROUNDS && !R.crashed; r++) {
            R.step = 'pinch out'; for (let k = 0; k < 4; k++) await pinch(c, 260, 40, 8); await check('r' + r + ' pinched out');
            R.step = 'far out'; for (let k = 0; k < 4; k++) await pinch(c, 300, 30, 6); const far = await check('r' + r + ' far out');
            R.step = 'spread in'; for (let k = 0; k < 8; k++) await pinch(c, 40, 280, 8); const back = await check('r' + r + ' spread back in');
            if (far && back && far.dist != null && back.dist != null && !(back.dist < far.dist)) found.push('r' + r + ': spreading did not bring the camera back in (' + far.dist + ' -> ' + back.dist + ')');
            R.step = 'double tap'; await tap(c); await H.sleep(120); await tap(c); await check('r' + r + ' double tap'); await tap(c); await H.sleep(120); await tap(c); await check('r' + r + ' double tap 2');
            R.step = 'wheel'; await P.mouse.move(c.x, c.y); for (let k = 0; k < 15; k++) { await P.mouse.wheel(0, 120); await H.sleep(20); } await check('r' + r + ' wheel out'); for (let k = 0; k < 15; k++) { await P.mouse.wheel(0, -120); await H.sleep(20); } await check('r' + r + ' wheel in');
            R.step = 'mixed fast'; for (let k = 0; k < 6; k++) { await pinch(c, 250, 40, 3); await tap(c); await pinch(c, 40, 250, 3); } await ev(() => window.goTab && window.goTab('foryou')); await H.sleep(1500); await ev(() => window.goTab && window.goTab('home')); await H.sleep(2500); await check('r' + r + ' mixed + community');
        }
        await H.sleep(15000); const end = await check('end idle');
        if (end && end.pad !== 'on' && /wh-home/.test(end.cls) && !/wh-away|lw-clean-auto/.test(end.cls)) found.push('end: controller not on screen on Home (' + end.pad + ', zoom ' + end.dist + ')');
    } catch (e) { found.push('probe error at ' + R.step + ': ' + e.message.slice(0, 200)); }
    const errs = R.errs.filter(e => !/audio device|NotAllowedError|play\(\) failed/i.test(e.m));
    console.log('RESULT ' + JSON.stringify({ engine: 'chromium', size: SIZE[0], crashed: R.crashed ? R.step : false, loads: R.loads, found, errs: errs.slice(0, 12) }, null, 1));
    await within(R.close(), 15000, 'close').catch(() => { });
    process.exit(0);
})();
