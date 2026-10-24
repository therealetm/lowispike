#!/usr/bin/env node
/* Probe (Oct 24 2026, Emmanuel: "when I zoom out the joystick still stays"): opens the repo through tools/sim/harness.cjs (or --url), zooms Home out with
   wheel steps on the world (the same world.zoom a pinch uses) and, at each step, lists which Home controls are still visible
   (computed opacity of the element and its ancestors, visibility). Saves screenshots to --out.
   Usage: node tools/zoom-pad-probe.cjs [--engine chromium|webkit] [--url URL] [--out /tmp/zp] [--w 390 --h 844] [--steer] [--auto] [--hold SECONDS] [--steps N] */
'use strict';
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const URL0 = arg('url', ''), ENGINE = arg('engine', 'chromium'), OUT = arg('out', '/tmp/zp'), W = +arg('w', 390), Hh = +arg('h', 844);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SELS = ['#whPad', '#whPadChip', '#tabbar', '#f3Board', '#hcLine', '#spHome .sp-top', '#whHud .wh-todaybtn', '#whHud .wh-vr', '#whHud .wa-btn', '#whHud .wh-zoom', '#spFast', '#whHud [data-orbit="scan"]', '#tbTheme', '#spBubble'];
const HS = require('./sim/harness.cjs');
(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const o = { engine: ENGINE, device: 'iPhone 13', members: 5, messages: 5, probe: false, viewport: { width: W, height: Hh }, dpr: 1 }; if (URL0) o.url = URL0;
    const R = await HS.open(o), page = R.page, errs = [];
    await page.setViewportSize({ width: W, height: Hh });
    page.on('pageerror', e => errs.push(e.message.slice(0, 300)));
    await R.goto(); await sleep(7000);
    await page.evaluate(() => { try { goTab('home'); } catch (e) { } });
    await sleep(1500);
    const look = () => page.evaluate(SELS => {
        const H = document.documentElement, r = LowiWorldHome.rig && LowiWorldHome.rig();
        const vis = el => { if (!el) return 'none'; let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none') return 'gone'; o *= +cs.opacity; } const cs = getComputedStyle(el); if (cs.visibility === 'hidden') return 'hid'; const b = el.getBoundingClientRect(); if (!b.width || !b.height) return '0px'; return o < 0.05 ? 'o0' : 'VIS' + o.toFixed(2); };
        const out = {}; SELS.forEach(s => out[s] = vis(document.querySelector(s)));
        return { dist: r && +r.dist.toFixed(2), maxD: r && r.maxD, cls: H.className.split(' ').filter(c => /^(wh-cosmos|wh-mapview|lw-clean|wh-padfly|wh-away|mf-|gx-|br-|wh-zoomout|wh-far)/.test(c)).join(' '), pad: (window.LowiPad && JSON.stringify(LowiPad.state()).slice(0, 160)), far: H.style.getPropertyValue('--wh-far'), out };
    }, SELS);
    console.log('rest', JSON.stringify(await look()));
    await page.screenshot({ path: OUT + '/00-rest.png' });
    if (arg('steer', false)) {
        const b = await page.$('#whPad'); const bb = await b.boundingBox();
        await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.mouse.move(bb.x + bb.width / 2 + 40, bb.y + bb.height / 2 - 30, { steps: 8 }); await sleep(600); await page.mouse.up();
        await sleep(800); console.log('steered', JSON.stringify(await look()));
    }
    if (arg('auto', false)) { await page.evaluate(() => LowiPad.mode('auto')); await sleep(1500); console.log('auto', JSON.stringify(await look())); }
    const cx = W / 2, cy = Hh * 0.38;
    const wheel = (dy, n) => page.evaluate(([dy, n, cx, cy]) => { const c = document.querySelector('#spHome .bw3-canvas') || document.querySelector('.bw3-canvas'); if (!c) return 'no canvas'; for (let k = 0; k < n; k++) c.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, clientX: cx, clientY: cy, bubbles: true, cancelable: true })); return 'ok'; }, [dy, n, cx, cy]);
    for (let i = 1; i <= +arg('steps', 14); i++) {
        await wheel(120, 4);
        await sleep(900);
        const l = await look();
        console.log('step' + i, JSON.stringify(l));
        if (i === 6 || arg('why', false) === 'all') console.log('why', JSON.stringify(await page.evaluate(() => ['#whHud [data-orbit="scan"]', '#spFast', '#whPad', '#spBubble'].map(s => { const ch = []; for (let e = document.querySelector(s); e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (+cs.opacity < 1 || e.style.opacity) ch.push((e.id || e.className.toString().slice(0, 40)) + ':' + cs.opacity + '/' + e.style.opacity + ' tr=' + cs.transition.slice(0, 60)); } return s + ' => ' + ch.join(' > '); }))));
        if (i === 6) console.log('visible', JSON.stringify(await page.evaluate(() => { const out = []; document.querySelectorAll('button, [role=button], .wh-cell, .wh-pad, [data-orbit], .sp-top, #tabbar').forEach(el => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') { o = 0; break; } o *= +cs.opacity; } const b = el.getBoundingClientRect(); if (o > 0.05 && b.width > 4 && b.height > 4 && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth) out.push((el.id || el.getAttribute('data-orbit') || String(el.className).slice(0, 30)) + '@' + Math.round(b.left) + ',' + Math.round(b.top) + ' o' + o.toFixed(2)); }); return out; })));
        if (i === 6) console.log('bottom', JSON.stringify(await page.evaluate(() => { const vh = innerHeight, out = []; for (const y of [vh - 2, vh - 30, vh - 60, vh - 90]) { const e = document.elementFromPoint(innerWidth / 2, y); out.push(y + ':' + (e ? (e.tagName + '#' + e.id + '.' + e.className.toString().slice(0, 50) + ' bg=' + getComputedStyle(e).backgroundColor) : 'null')); } const st = document.querySelector('#spHome .bw3-stage'), c = document.querySelector('#spHome .bw3-canvas'); out.push('stage ' + (st && JSON.stringify(st.getBoundingClientRect())) + ' canvas ' + (c && JSON.stringify(c.getBoundingClientRect()))); out.push('body bg ' + getComputedStyle(document.body).backgroundColor + ' html bg ' + getComputedStyle(document.documentElement).backgroundColor); return out; })));
        if (i % 3 === 0) await page.screenshot({ path: OUT + '/step' + String(i).padStart(2, '0') + '.png' });
    }
    const hold = +arg('hold', 0); for (let t = 0; t < hold; t += 5) { await sleep(5000); console.log('held' + (t + 5) + 's', JSON.stringify(await look())); }
    for (let i = 1; i <= +arg('steps', 14); i++) { await wheel(-120, 4); await sleep(700); }
    await sleep(1200);
    console.log('back', JSON.stringify(await look()));
    await page.screenshot({ path: OUT + '/zz-back.png' });
    console.log('errors', errs.length, errs.slice(0, 5).join(' || '));
    await R.close();
})().catch(e => { console.error(e); process.exit(1); });
