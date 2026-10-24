#!/usr/bin/env node
/* Fly-into-world crash probe (Oct 24 2026, Emmanuel: "I tried to fly into a world and it crashed, the app keeps crashing").
   Flies into every body world the ways a person does: a real tap on the glowing place, the World map, autopilot / steering
   running, zoomed out, after Community / Cook / Move and back, a tab switch in the middle of the trip, several in a row; leaves
   each one through the World map (bloodstream), the X on the map, and Back. After every step it records: renderer crash, page
   errors, reloads, WebGL context loss, the trip state machine (LowiWorldRegions.state: busy / warp / cur), the world loop still
   drawing, Misty and Home's UI back after returning, canvas / GL memory (tools/soak/crash-probe.js).
   Usage: node tools/fly-into-world-probe.cjs [url|root] [--engine webkit|chromium] [--device 'iPhone 13'] [--size 820x1180] [--rounds 2]
          modes: (default) every way in and out | --steer (fly the companion in with the Home controller) | --zoomed (zoomed out first)
                 | --auto [secs] (autopilot, watch it fly) | --resilience [--quick] (a bad frame + a lost and restored WebGL context mid-trip; --quick: the bad frame on Home only)
          --full: the test account's companion at full energy (a stand-in for LowiSun.energyNow in the page, nothing is saved)
   Oct 24 (frame guard): every check also says whether the 3D world is still drawing (frames since the last check, on Home) and
   how many frame errors the world caught (LowiWorld3D.frameErrors).
   Simulated browsers only, not a real iPhone; Supabase is faked by the harness (nothing reaches the real database). */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
const ENGINE = arg('engine', 'webkit'), DEVICE = arg('device', 'iPhone 13'), SIZE = String(arg('size', '')).match(/^(\d+)x(\d+)$/), ROUNDS = +arg('rounds', 2);
const ONLY = arg('only', '');
const within = (p, ms, what) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(what + ' timed out after ' + ms + ' ms')), ms))]);
(async () => {
    const o = { engine: ENGINE, device: DEVICE };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    if (SIZE) o.viewport = { width: +SIZE[1], height: +SIZE[2] }, o.dpr = +arg('dpr', 2);
    const R = await H.open(o), P = R.page, found = [];
    if (ENGINE === 'webkit') await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
    try { await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'soak', 'crash-probe.js'), 'utf8') }); } catch (e) { }
    const errs = [];
    P.on('pageerror', e => errs.push(String(e && e.message || e).slice(0, 200)));
    P.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
    const ev = (fn, a) => within(P.evaluate(fn, a), 30000, 'evaluate').catch(e => ({ evalErr: String(e.message).slice(0, 160) }));
    const look = () => ev(() => {
        const RG = window.LowiWorldRegions, W3 = window.LowiWorld3D, F = window.LowiMistyFlight, s = RG && RG.state || {}, c = document.documentElement.classList;
        const vis = id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
        const q = s.warp;
        let snap = null; try { snap = window.__cs && window.__cs.snap ? window.__cs.snap() : null; } catch (e) { }
        return { fr: window.__fwN || 0, ferr: W3 ? W3.frameErrors || 0 : null, rest: W3 ? W3.restored || 0 : 0, cur: s.cur, busy: s.busy, target: s.target, next: s.next, warp: q ? (q.phase + (q.seam ? '/seam' : '') + ' ' + Math.round(q.clock || 0) + 'ms') : null,
            fly: !!(W3 && W3.rig && W3.rig.fly), w3: W3 && W3.state, lost: !!(W3 && W3.lost), fps: W3 && W3.fps ? +W3.fps().toFixed(1) : null,
            region: !!(s.region), mf: F && F.state ? F.state().st : null, cls: ['wh-home', 'wh-away', 'bwr-warping', 'mf-on', 'lw-clean-auto', 'lw-clean-drive', 'wh-zoomed', 'wh-out'].filter(k => c.contains(k)).join(','),
            tab: document.documentElement.dataset.tab || '', misty: vis('spBubble'), map: !!document.getElementById('bwrMap'),
            gl: snap ? snap.ctxGL : null, canvMB: snap ? snap.canvMB : null, geo: snap && snap.three ? snap.three.geometries : null, tex: snap && snap.three ? snap.three.textures : null, heap: snap ? snap.heap : null, maxGap: snap ? snap.maxGap : null };
    });
    let base = null, lastFr = null;
    const check = async (tag, want) => {
        if (R.crashed) { found.push(tag + ': RENDERER CRASHED'); console.log(R.el(), tag, 'RENDERER CRASHED'); return null; }
        const s = await look();
        if (s.evalErr) { found.push(tag + ': page did not answer (' + s.evalErr + ')'); console.log(R.el(), tag, 'NO ANSWER', s.evalErr); return s; }
        if (!base) base = s;
        /* the world loop still drawing: on Home with the page visible, the frame counter must have moved since the last check */
        if (s.tab === 'home' || !s.tab) { const moved = s.fr - (lastFr == null ? -1 : lastFr); if (lastFr != null && moved <= 0 && s.w3 === 'ready' && !s.lost) found.push(tag + ': 3D world STOPPED drawing (no frame since the last check)'); }
        lastFr = s.fr;
        if (s.lost) found.push(tag + ': WebGL context lost');
        if (R.loads > 1) found.push(tag + ': page reloaded (' + R.loads + ' loads)');
        if (want && want.cur && s.cur !== want.cur) found.push(tag + ': expected to be in ' + want.cur + ', is in ' + s.cur + ' (busy ' + s.busy + ', warp ' + s.warp + ')');
        if (want && want.idle && (s.busy || s.warp)) found.push(tag + ': trip still running/stuck (busy ' + s.busy + ', warp ' + s.warp + ', target ' + s.target + ')');
        if (errs.length) { found.push(tag + ': errors ' + JSON.stringify(errs.splice(0))); }
        console.log(R.el(), tag.padEnd(34), JSON.stringify(s).slice(0, 420));
        return s;
    };
    const goTab = t => ev(t => { window.goTab(t); }, t);
    const wait = async (fn, a, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await ev(fn, a); if (v === true) return true; await H.sleep(400); } return false; };
    const settled = (id) => wait(id => { const s = window.LowiWorldRegions && window.LowiWorldRegions.state; return !!s && s.cur === id && !s.busy && !s.warp; }, id, (+arg('settle', 25) || 25) * 1000);
    /* a real tap on a glowing place: its projected spot on the canvas, only where the canvas itself is on top */
    const tapPlace = async (id) => {
        for (let i = 0; i < 12; i++) {
            const p = await ev(id => {
                const W3 = window.LowiWorld3D, L = W3 && W3.veilLook && W3.veilLook(); if (!L) return null;
                const b = L.find(x => x.id === id); if (!b || b.z > 1 || b.z < -1) return null;
                const cv = document.querySelector('.bw3-stage canvas, #whHud canvas, canvas'); if (!cv) return null;
                const r = cv.getBoundingClientRect(), x = r.left + b.x, y = r.top + b.y;
                if (x < 8 || y < 8 || x > innerWidth - 8 || y > innerHeight - 8) return null;
                const top = document.elementFromPoint(x, y); if (!top || top.tagName !== 'CANVAS') return { blocked: (top && (top.id || top.className)) + '' };
                return { x, y };
            }, id);
            if (p && p.x != null) { await P.mouse.click(p.x, p.y, { delay: 40 }); return 'tap'; }
            await H.sleep(700);
        }
        return null;
    };
    const viaMap = async (id) => {
        const ok = await ev(() => { const b = document.getElementById('bwrMapBtn'); if (!b) return false; b.click(); return true; });
        if (ok !== true) return false; await H.sleep(500);
        return (await ev(id => { const n = document.querySelector('#bwrMap [data-bwr="' + id + '"]'); if (!n) return false; n.click(); return true; }, id)) === true;
    };
    const enterWorld = async (id, how) => {
        if (how === 'tap') { const t = await tapPlace(id); if (t) return 'tap'; }
        if (await viaMap(id)) return 'map';
        await ev(id => window.LowiWorldRegions.travel(id), id); return 'travel()';
    };
    const toHub = async (how) => {
        if (how === 'map') { if (await viaMap('hub')) return 'map'; }
        if (how === 'back') { const b = await ev(() => { const x = document.querySelector('.bw3-full [data-bw3-back], [data-bw3-back]'); if (!x) return false; x.click(); return true; }); if (b === true) return 'back'; if (await viaMap('hub')) return 'map'; }
        await ev(() => window.LowiWorldRegions.travel('hub')); return 'travel()';
    };
    const worlds = ['brain', 'heart', 'gut', 'liver', 'pancreas', 'muscle', 'lung'];
    /* steer Misty with the controller toward a glowing place until she dives in (closed loop on her screen spot -> the place's spot) */
    const steerInto = async (id, ms) => {
        await ev(() => window.LowiPad && window.LowiPad.mode('drive')); const t0 = Date.now(); let last = null;
        while (Date.now() - t0 < ms) {
            const s = await ev(id => {
                const F = window.LowiMistyFlight, W3 = window.LowiWorld3D, RG = window.LowiWorldRegions; if (!F || !W3) return null;
                const st = F.state(); if (st.st === 'warp' || st.st === 'inside' || st.st === 'pull' || st.st === 'orbit' || (RG && RG.state.busy)) return { st: st.st, into: true, flew: st.flew };
                const me = F.touchSpot(); const cv = document.querySelector('.bw3-stage canvas, #whHud canvas, canvas'); const r = cv.getBoundingClientRect();
                const L = W3.veilLook && W3.veilLook(); const b = L && L.find(x => x.id === id);
                let from = me ? { x: me.x, y: me.y } : null; if (!from) { const sb = document.getElementById('spBubble'); if (sb) { const q = sb.getBoundingClientRect(); from = { x: q.left + q.width / 2 - r.left, y: q.top + q.height / 2 - r.top }; } }
                return { st: st.st, near: st.near, nearD: st.nearD, from, to: b ? { x: b.x, y: b.y, z: b.z } : null };
            }, id);
            if (!s || s.evalErr) return 'no state';
            if (s.into) { await ev(() => window.LowiPad && window.LowiPad.steer(0, 0)); return 'dove in (' + s.st + ' ' + s.flew + ')'; }
            let vx = 0, vy = -1;
            if (s.from && s.to && s.to.z < 1) { const dx = s.to.x - s.from.x, dy = s.to.y - s.from.y, d = Math.hypot(dx, dy) || 1; vx = dx / d; vy = dy / d; }
            await ev(([vx, vy]) => window.LowiPad && window.LowiPad.steer(vx, vy), [vx, vy]);
            last = s; await H.sleep(250);
        }
        await ev(() => window.LowiPad && window.LowiPad.steer(0, 0));
        return 'never got in (last ' + JSON.stringify(last).slice(0, 160) + ')';
    };
    try {
        R.step = 'load'; await R.goto(); await H.sleep(7000);
        await wait(() => !!(window.LowiWorld3D && window.LowiWorld3D.onFrame), null, 30000);
        await ev(() => { window.LowiWorld3D.onFrame(() => { window.__fwN = (window.__fwN || 0) + 1; }); });
        if (arg('full', false)) console.log('full energy', JSON.stringify(await ev(() => {
            const S = window.LowiSun; if (!S || !S.energyNow) return 'no LowiSun';
            const was = S.energyNow; S.energyNow = () => Object.assign({}, was(), { value: 1, tier: 'thriving', canTravel: true, real: true });
            return S.energyNow().value; })));
        const ids = await ev(() => { const RG = window.LowiWorldRegions; const W3 = window.LowiWorld3D; return { places: W3 && W3.places ? W3.places().map(p => p.id || p) : null, regions: W3 && W3.regions ? W3.regions.map(r => r.id) : null }; });
        console.log('places', JSON.stringify(ids));
        const list = ids && ids.regions && ids.regions.length ? ids.regions.concat(worlds.filter(w => ids.regions.indexOf(w) < 0 && w === 'lung')) : worlds;
        await check('start');
        if (arg('resilience', false)) {
            /* 1) one bad frame: the renderer throws once, the world must keep drawing */
            R.step = 'bad frame';
            await ev(() => { const r = window.LowiWorld3D.renderer, f = r.render; let n = 1; r.render = function () { if (n-- > 0) throw new Error('probe: one bad frame'); return f.apply(this, arguments); }; });
            await H.sleep(3000); errs.splice(0).forEach(e => { if (!/probe: one bad frame/.test(e)) errs.push(e); });
            await check('after one bad frame on Home');
            await H.sleep(3000); await check('3 s later, still drawing?');
            if (arg('quick', false)) throw new Error('resilience quick run done');
            /* 2) a bad frame in the middle of a trip into a world */
            R.step = 'bad frame mid-trip';
            await enterWorld('heart', 'map'); await H.sleep(700);
            await ev(() => { const r = window.LowiWorld3D.renderer, f = r.render; let n = 5; r.render = function () { if (n-- > 0) throw new Error('probe: one bad frame'); return f.apply(this, arguments); }; });
            await settled('heart'); await H.sleep(1500); errs.splice(0).forEach(e => { if (!/probe: one bad frame/.test(e)) errs.push(e); });
            await check('in heart after 5 bad frames mid-trip', { cur: 'heart', idle: true });
            await toHub('map'); await settled('hub'); await H.sleep(1500);
            await check('home again', { cur: 'hub', idle: true });
            /* 3) the phone takes the graphics away mid-trip (iOS does this when memory runs low) and gives them back */
            for (const [where, ms] of [['gut', 900], ['hub', 0]]) {
                R.step = 'context lost ' + where;
                if (where !== 'hub') { await enterWorld(where, 'map'); await H.sleep(ms); }
                const lost = await ev(() => { const g = window.LowiWorld3D.renderer.getContext(), x = g && g.getExtension('WEBGL_lose_context'); if (!x) return 'no WEBGL_lose_context'; window.__lx = x; x.loseContext(); return true; });
                await H.sleep(1500);
                const mid = await ev(() => ({ lost: window.LowiWorld3D.lost, cls: document.documentElement.classList.contains('bw3-lost') }));
                await ev(() => { window.__lx && window.__lx.restoreContext(); });
                await H.sleep(3000);
                if (where !== 'hub') await settled(where);
                await H.sleep(1500); errs.splice(0).forEach(e => { if (!/context|CONTEXT_LOST/i.test(e)) errs.push(e); });
                const s = await check('context lost (' + JSON.stringify(lost) + ', while lost ' + JSON.stringify(mid) + ') and restored ' + (where === 'hub' ? 'on Home' : 'flying into ' + where), where === 'hub' ? null : { cur: where, idle: true });
                if (s && !s.rest) found.push('context restore not seen (' + where + ')');
                /* the picture really comes back: draw once and read a 24x24 grid of pixels straight off the restored GL context */
                const px = await ev(() => { try { const W3 = window.LowiWorld3D, r = W3.renderer, g = r.getContext(); r.render(W3.scene, W3.camera);
                    const w = g.drawingBufferWidth, h = g.drawingBufferHeight, one = new Uint8Array(4); let lit = 0;
                    for (let i = 0; i < 24; i++) for (let j = 0; j < 24; j++) { g.readPixels(Math.floor((i + 0.5) * w / 24), Math.floor((j + 0.5) * h / 24), 1, 1, g.RGBA, g.UNSIGNED_BYTE, one); if (one[0] + one[1] + one[2] > 24) lit++; }
                    return { lit, of: 576, glErr: g.getError(), lostNow: g.isContextLost() }; } catch (e) { return 'err ' + e.message; } });
                console.log('   picture after restore (pixels with colour):', JSON.stringify(px));
                if (px && typeof px === 'object' && px.lit < 50) found.push('picture blank after restore (' + where + '): ' + JSON.stringify(px));
                if (where !== 'hub') { await toHub('map'); await settled('hub'); await H.sleep(1500); await check('home after restore', { cur: 'hub', idle: true }); }
            }
            /* 4) and she can still fly into a world after all that */
            R.step = 'after resilience';
            const how = await enterWorld('brain', 'tap'); await settled('brain');
            await check('then into brain via ' + how, { cur: 'brain', idle: true });
            await toHub('map'); await settled('hub'); await H.sleep(1200);
            await check('then home', { cur: 'hub', idle: true });
            throw new Error('resilience run done');
        }
        if (arg('auto', false)) {
            const secs = +arg('auto', 90) || 90;
            R.step = 'autopilot';
            await ev(() => window.LowiPad && window.LowiPad.mode('auto'));
            const seen = new Set(); const t0 = Date.now(); let n = 0;
            while (Date.now() - t0 < secs * 1000) {
                await H.sleep(6000);
                const st = await ev(() => ({ pad: window.LowiPad && window.LowiPad.state(), mf: window.LowiMistyFlight && window.LowiMistyFlight.state() }));
                if (st && st.mf) { seen.add(st.mf.st + (st.mf.near ? ':' + st.mf.near : '')); }
                const s = await check('autopilot +' + Math.round((Date.now() - t0) / 1000) + 's (' + (st && st.mf ? st.mf.st : '?') + ', energy ' + (st && st.pad ? st.pad.energy : '?') + ', tier ' + (st && st.pad ? st.pad.tier : '?') + ')');
                if (s && s.cur && s.cur !== 'hub') seen.add('in ' + s.cur);
                n++;
            }
            console.log('autopilot states seen:', [...seen].join(', '));
            await ev(() => window.LowiPad && window.LowiPad.mode(''));
            await toHub('map'); await settled('hub'); await H.sleep(1500);
            await check('home after autopilot', { cur: 'hub', idle: true });
            throw new Error('autopilot run done');
        }
        if (arg('zoomed', false)) {
            for (let r = 0; r < ROUNDS; r++) for (const id of list) {
                if (ONLY && ONLY.split(',').indexOf(id) < 0) continue;
                R.step = 'zoomed ' + id;
                await ev(() => { const Hm = window.LowiWorldHome; if (Hm && Hm.zoomOutWhole) Hm.zoomOutWhole(); });
                await H.sleep(2500);
                /* and further out with the wheel (pinch), toward the far view with the other worlds */
                const vp = P.viewportSize() || { width: 390, height: 664 };
                await P.mouse.move(vp.width / 2, vp.height / 2);
                for (let i = 0; i < (r % 2 ? 14 : 4); i++) { await P.mouse.wheel(0, 120); await H.sleep(120); }
                await H.sleep(2000);
                await check('r' + r + ' zoomed out before ' + id);
                const how = await enterWorld(id, id === 'lung' ? 'map' : 'tap');
                await H.sleep(3000); await wait(() => { const s = window.LowiWorldRegions.state; return !s.busy && !s.warp; }, null, 30000);
                await check('r' + r + ' into ' + id + ' from zoomed out via ' + how, { cur: id === 'muscles' ? 'muscle' : id, idle: true });
                await H.sleep(1500);
                await toHub(r % 2 ? 'back' : 'map'); await settled('hub'); await H.sleep(1500);
                await check('r' + r + ' home after zoomed-out ' + id, { cur: 'hub', idle: true });
            }
            throw new Error('zoomed run done');
        }
        if (arg('steer', false)) {
            for (let r = 0; r < ROUNDS; r++) for (const id of list) {
                if (ONLY && ONLY.split(',').indexOf(id) < 0) continue;
                R.step = 'steer ' + id;
                const how = await steerInto(id, 40000);
                await H.sleep(2000); await wait(() => { const s = window.LowiWorldRegions.state; return !s.busy && !s.warp; }, null, 25000);
                await check('r' + r + ' steered into ' + id + ': ' + how, { idle: true });
                await H.sleep(2000);
                await toHub('map'); await settled('hub'); await H.sleep(1500);
                await ev(() => window.LowiPad && window.LowiPad.mode(''));
                await H.sleep(1500);
                await check('r' + r + ' home after steering into ' + id, { cur: 'hub', idle: true });
            }
            throw new Error('steer run done');
        }
        for (let r = 0; r < ROUNDS; r++) {
            for (const id of list) {
                if (ONLY && ONLY.split(',').indexOf(id) < 0) continue;
                R.step = 'r' + r + ' ' + id;
                const how = await enterWorld(id, id === 'lung' ? 'map' : 'tap');
                const ok = await settled(id);
                await check('r' + r + ' in ' + id + ' via ' + how, ok ? { cur: id, idle: true } : { cur: id, idle: true });
                await H.sleep(1500);
                const out = await toHub(r % 2 ? 'back' : 'map');
                await settled('hub');
                await H.sleep(800);
                await check('r' + r + ' out of ' + id + ' via ' + out, { cur: 'hub', idle: true });
            }
            /* tab switch in the middle of the trip in, then back to Home */
            for (const [tab, mid] of [['foryou', 900], ['community', 400], ['shelf', 2500], ['move', 1600]]) {
                const id = list[(r * 3 + mid) % list.length] === 'lung' ? 'brain' : list[(r * 3 + mid) % list.length];
                R.step = 'r' + r + ' trip ' + id + ' + ' + tab;
                await enterWorld(id, 'tap'); await H.sleep(mid); await goTab(tab); await H.sleep(2200); await goTab('home'); await H.sleep(5000);
                await settled(id);
                const s = await check('r' + r + ' trip ' + id + ' + ' + tab + ' @' + mid + 'ms', { idle: true });
                /* can she still fly somewhere after that? */
                const nxt = id === 'heart' ? 'gut' : 'heart';
                await enterWorld(nxt, 'tap'); const ok2 = await settled(nxt);
                await check('r' + r + '   then into ' + nxt, { cur: nxt, idle: true });
                await toHub('map'); await settled('hub'); await H.sleep(600);
                await check('r' + r + '   then home', { cur: 'hub', idle: true });
            }
            /* world to world straight from inside, and quick double taps */
            R.step = 'r' + r + ' chain';
            await enterWorld('liver', 'tap'); await settled('liver');
            await viaMap('pancreas'); await settled('pancreas');
            await check('r' + r + ' liver -> pancreas (map)', { cur: 'pancreas', idle: true });
            await viaMap('brain'); await H.sleep(300); await ev(() => { const b = document.getElementById('bwrMapBtn'); b && b.click(); }); await H.sleep(300); await ev(() => { const n = document.querySelector('#bwrMap [data-bwr="gut"]'); n && n.click(); });
            await H.sleep(12000);
            await check('r' + r + ' pancreas -> brain, changed to gut mid-trip');
            await toHub('map'); await settled('hub'); await H.sleep(800);
            await check('r' + r + ' chain home', { cur: 'hub', idle: true });
            /* zoomed out first */
            R.step = 'r' + r + ' zoomed out';
            await ev(() => { const Hm = window.LowiWorldHome; if (Hm && Hm.toggleZoom) Hm.toggleZoom(); }); await H.sleep(2500);
            await check('r' + r + ' zoomed out');
            const how = await enterWorld('muscle', 'tap'); await settled('muscle');
            await check('r' + r + ' into muscle from zoomed out via ' + how, { cur: 'muscle', idle: true });
            await toHub('map'); await settled('hub'); await H.sleep(800);
            await check('r' + r + ' home again', { cur: 'hub', idle: true });
            /* autopilot running, then fly into a world */
            R.step = 'r' + r + ' autopilot';
            await ev(() => { const Pd = window.LowiPad; if (Pd && Pd.mode) Pd.mode('auto'); }); await H.sleep(3000);
            const how2 = await enterWorld('heart', 'tap'); await settled('heart');
            await check('r' + r + ' into heart on autopilot via ' + how2, { cur: 'heart', idle: true });
            await toHub('map'); await settled('hub'); await H.sleep(800);
            await check('r' + r + ' home after autopilot', { cur: 'hub', idle: true });
        }
    } catch (e) { found.push('probe stopped at ' + R.step + ': ' + String(e.message).slice(0, 200)); }
    console.log('\nFOUND ' + found.length + (found.length ? ':\n - ' + found.join('\n - ') : ''));
    try { await within(R.close(), 20000, 'close'); } catch (e) { }
    process.exit(0);
})();
