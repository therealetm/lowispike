#!/usr/bin/env node
/* Hourly flight crash hunt (Oct 24 2026, Emmanuel: fly Misty all over the universe, catch crashes, freezes and things vanishing).
   Short companion to tools/soak/crash-soak.cjs for the sizes the soak doesn't cover: flies Misty with real touches on the bubble
   controller, switches tabs mid-flight, warps Home -> Community -> Home, zooms out to the whole world and back, starts and stops
   autopilot, travels into a world and switches tab during the trip, turns the screen. After every step it checks: renderer
   alive, page errors, reloads, the controller still on screen in its glass design (#whPad, misty-pad.css), the world loop still
   drawing, Misty not stuck in a transit state, the world places still there.
   Usage: node tools/flight-hunt-probe.cjs [url|root] [--engine webkit|chromium] [--device 'iPhone SE'] [--size 820x1180] [--rounds 3]
   Simulated browsers only, not a real iPhone; Supabase is faked by the harness (nothing reaches the real database). */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
const ENGINE = arg('engine', 'webkit'), DEVICE = arg('device', 'iPhone 13'), SIZE = String(arg('size', '')).match(/^(\d+)x(\d+)$/), ROUNDS = +arg('rounds', 3);
const within = (p, ms, what) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(what + ' timed out after ' + ms + ' ms')), ms))]);
(async () => {
    const o = { engine: ENGINE, device: DEVICE };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    if (SIZE) o.viewport = { width: +SIZE[1], height: +SIZE[2] }, o.dpr = +arg('dpr', 2);
    const R = await H.open(o), P = R.page, found = [];
    if (ENGINE === 'webkit') await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
    const ev = (fn, a) => within(P.evaluate(fn, a), 30000, 'evaluate').catch(e => ({ evalErr: String(e.message).slice(0, 160) }));
    const look = (tag) => ev(() => {
        const b = document.getElementById('whPad'), F = window.LowiMistyFlight, RG = window.LowiWorldRegions, W3 = window.LowiWorld3D;
        let pad = 'missing';
        if (b) { const r = b.getBoundingClientRect(), s = getComputedStyle(b); const on = r.width > 20 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
            pad = { on, hidden: s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), glass: /blur/.test(s.backdropFilter || s.webkitBackdropFilter || ''), radius: s.borderRadius }; }
        const st = F ? F.state() : {};
        return { pad, st: st.st, flew: st.flew, transit: st.transit, cur: RG && RG.current && RG.current(), busy: RG && RG.state && RG.state.busy, fps: W3 && W3.fps ? +W3.fps().toFixed(1) : null, lost: !!(W3 && W3.lost), w3: W3 && W3.state,
            regions: W3 && W3.regions ? W3.regions.length : null, padMode: window.LowiPad ? window.LowiPad.state().pad : null, tab: document.documentElement.dataset.tab || (document.querySelector('.tab.on,.tb-on') || {}).id || '', nodes: document.getElementsByTagName('*').length, vw: innerWidth, vh: innerHeight };
    });
    let base = null, frames0 = 0;
    const check = async (tag) => {
        if (R.crashed) { found.push(tag + ': RENDERER CRASHED'); return null; }
        const s = await look(tag);
        if (s.evalErr) { found.push(tag + ': page did not answer (' + s.evalErr + ')'); return s; }
        if (!base) base = s;
        /* the controller is meant to be gone: off Home, during a trip without her (wh-away), on the clean autopilot view (lw-clean-auto,
           Oct 17 by request: a tap brings it back), while Home pages sideways (wh-leave / wh-snap) */
        const onHome = await ev(() => { const c = document.documentElement.classList; return c.contains('wh-home') && !c.contains('wh-away') && !c.contains('lw-clean-auto') && !c.contains('wh-leave') && !c.contains('wh-snap') && !(window.LowiWorldRegions && window.LowiWorldRegions.state.busy); });
        if (onHome === true && (s.pad === 'missing' || !s.pad.on || s.pad.hidden)) found.push(tag + ': controller not on screen ' + JSON.stringify(s.pad));
        if (s.pad && s.pad.w && base.pad && base.pad.w && Math.abs(s.pad.w - base.pad.w) > 6 && !/fly|auto/.test(tag)) found.push(tag + ': controller size changed ' + base.pad.w + ' -> ' + s.pad.w);
        if (base.pad && base.pad.glass && s.pad && s.pad.w && !s.pad.glass) found.push(tag + ': controller lost its glass look');
        if (s.lost) found.push(tag + ': WebGL context lost');
        if (base.regions && s.regions != null && s.regions < base.regions) found.push(tag + ': world places dropped ' + base.regions + ' -> ' + s.regions);
        if (R.loads > 1) found.push(tag + ': page reloaded (' + R.loads + ' loads)');
        console.log(R.el(), tag.padEnd(26), JSON.stringify(s).slice(0, 330));
        return s;
    };
    const padXY = () => ev(() => { const b = document.getElementById('whPad'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const cdp = ENGINE === 'chromium' ? await R.ctx.newCDPSession(P) : null;
    const touch = async (type, x, y) => { if (cdp) return cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] }); return P.evaluate(([t, x, y]) => { const el = document.elementFromPoint(x, y) || document.body; const T = new Touch({ identifier: 1, target: el, clientX: x, clientY: y }); el.dispatchEvent(new TouchEvent(t, { bubbles: true, cancelable: true, touches: t === 'touchend' ? [] : [T], targetTouches: t === 'touchend' ? [] : [T], changedTouches: [T] })); el.dispatchEvent(new PointerEvent({ touchstart: 'pointerdown', touchmove: 'pointermove', touchend: 'pointerup' }[t], { bubbles: true, pointerId: 1, pointerType: 'touch', clientX: x, clientY: y, isPrimary: true })); }, [type.replace('touchStart', 'touchstart').replace('touchMove', 'touchmove').replace('touchEnd', 'touchend'), x, y]); };
    const drag = ENGINE === 'chromium' ? async (dx, dy, ms) => { const p = await padXY(); if (!p || p.evalErr) return; await within(touch('touchStart', p.x, p.y), 20000, 'touch').catch(() => { }); for (let i = 1; i <= 5; i++) { await within(touch('touchMove', p.x + dx * i / 5, p.y + dy * i / 5), 20000, 'touch').catch(() => { }); await H.sleep(50); } await H.sleep(ms); await within(touch('touchEnd', p.x + dx, p.y + dy), 20000, 'touch').catch(() => { }); } :
        /* WebKit: a mouse drag reaches the controller's pointer handlers (synthetic TouchEvents do not), as crash-soak does */
        async (dx, dy, ms) => { const p = await padXY(); if (!p || p.evalErr) return; await P.mouse.move(p.x, p.y); await P.mouse.down(); for (let i = 1; i <= 5; i++) { await P.mouse.move(p.x + dx * i / 5, p.y + dy * i / 5); await H.sleep(50); } await H.sleep(ms); await P.mouse.up(); };
    const goTab = t => ev(t => { window.goTab(t); }, t);
    try {
        R.step = 'load'; await R.goto(); await H.sleep(6000);
        await check('start');
        for (let r = 0; r < ROUNDS && !R.crashed; r++) {
            R.step = 'fly'; await drag(0, -45, 1500); await drag(40, -20, 1200); await check('r' + r + ' fly');
            R.step = 'tab mid-flight'; await drag(-40, -30, 300); await goTab('shelf'); await H.sleep(1200); await goTab('home'); await H.sleep(1500); await check('r' + r + ' cook->home mid-flight');
            R.step = 'community warp'; await goTab('foryou'); await H.sleep(2500); await check('r' + r + ' community'); await goTab('home'); await H.sleep(3000); await check('r' + r + ' back home');
            R.step = 'zoom out'; await ev(() => window.LowiWorldHome.zoomOutWhole()); await H.sleep(2500); await check('r' + r + ' zoomed out'); await ev(() => window.LowiWorldHome.toggleZoom()); await H.sleep(2500); await check('r' + r + ' zoomed back');
            R.step = 'autopilot'; await ev(() => window.LowiPad && window.LowiPad.mode('auto')); await H.sleep(6000); await check('r' + r + ' autopilot'); await goTab('move'); await H.sleep(1000); await goTab('home'); await H.sleep(2000); await check('r' + r + ' autopilot after tab'); await ev(() => window.LowiPad && window.LowiPad.mode('')); await H.sleep(1500);
            R.step = 'world trip';
            const ROUTE = await ev(() => window.LowiWorldRegions.ROUTE.slice()); const w = Array.isArray(ROUTE) ? ROUTE[r % ROUTE.length] : 'brain';
            await drag(0, -45, 1200); await ev(w => window.LowiWorldRegions.travel(w), w); await H.sleep(900); await goTab('foryou'); await H.sleep(1500); await goTab('home'); await H.sleep(6000); await check('r' + r + ' trip ' + w + ' + tab');
            await ev(() => window.LowiWorldRegions.travel('hub', false, 0, { wide: true })); await H.sleep(7000); const s = await check('r' + r + ' back to hub');
            if (s && s.cur && s.cur !== 'hub') { await H.sleep(10000); const s2 = await check('r' + r + ' hub again'); if (s2 && s2.cur !== 'hub') found.push('r' + r + ': Misty never got back out of ' + s2.cur + ' (st ' + s2.st + ')'); }
            R.step = 'turn'; if (SIZE) { await P.setViewportSize({ width: +SIZE[2], height: +SIZE[1] }); await H.sleep(1500); await check('r' + r + ' turned'); await P.setViewportSize({ width: +SIZE[1], height: +SIZE[2] }); await H.sleep(1500); await check('r' + r + ' turned back'); }
        }
        // a still Home after all that: the world loop must still be drawing and Misty at rest
        await H.sleep(25000); const end = await check('end idle');
        if (end && end.st && !/idle|home/.test(end.st)) found.push('end: Misty did not come home after 25 s idle (st ' + end.st + ')');
    } catch (e) { found.push('probe error at ' + R.step + ': ' + e.message.slice(0, 200)); }
    const errs = R.errs.filter(e => !/audio device|NotAllowedError|play\(\) failed/i.test(e.m));
    console.log('RESULT ' + JSON.stringify({ engine: ENGINE, device: SIZE ? SIZE[0] : DEVICE, crashed: R.crashed ? R.step : false, loads: R.loads, found, errs: errs.slice(0, 12) }, null, 1));
    await within(R.close(), 15000, 'close').catch(() => { });
    process.exit(0);
})();
