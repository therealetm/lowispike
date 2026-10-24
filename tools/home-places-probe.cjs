#!/usr/bin/env node
/* Home body places probe (Oct 24, 10:45, Eman: "they're just moving around really fast. It looks like they're trying to dodge
   things"). Serves a folder (or --url), leaves Home idle, runs the usual triggers (double-tap zoom, wheel zoom, Community / Cook /
   Move round trips) and samples every 200 ms where each glowing body place is drawn. Checks that a place is always visible, fully
   opaque and drawn exactly at its real spot in the world (off = 0, so it moves only with the world and the camera), and reports
   how fast places travel on screen (a dodge shows as sudden jumps). Then taps one place that is not covered by a bubble and checks
   that the trip there starts.
   Usage: node tools/home-places-probe.cjs [--root DIR] [--url URL] [--secs 30] [--w 390 --h 844] [--engine chromium|webkit] */
'use strict';
const path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
    const W = +arg('w', 390), Ht = +arg('h', 844), SECS = +arg('secs', 30);
    const o = { engine: arg('engine', 'chromium'), viewport: { width: W, height: Ht }, dpr: 1, probe: false };
    if (arg('url')) o.url = arg('url'); else o.root = path.resolve(arg('root', path.join(__dirname, '..')));
    const r = await H.open(o);
    const page = r.page; await r.goto();
    await page.waitForFunction(() => window.LowiWorld3D && window.LowiWorld3D.ready, null, { timeout: 90000 });
    await page.evaluate(() => { const g = () => document.documentElement.classList.remove('gate-boot', 'gate-up'); g(); setInterval(g, 500); const r2 = document.getElementById('r2gate'); if (r2) r2.hidden = true; });
    await H.sleep(3000);
    const build = await page.evaluate(() => { try { return (window.LOWI_BUILD || document.querySelector('meta[name="lowi-build"]')?.content || '') + ''; } catch (e) { return ''; } });
    const hasProbe = await page.evaluate(() => !!LowiWorld3D.placesLook);
    console.log('build', build, 'size', W + 'x' + Ht, 'placesLook', hasProbe);
    /* placesLook on a fixed build; on an older build fall back to veilLook (drawn position + veil) so a before/after compare works */
    const sample = () => page.evaluate(() => {
        const L = LowiWorld3D.placesLook ? LowiWorld3D.placesLook() : (LowiWorld3D.veilLook ? LowiWorld3D.veilLook().map(b => ({ id: b.id, x: b.x, y: b.y, z: b.z, visible: b.veil > 0.02, opacity: b.veil, off: (b.aside || 0) > 0 ? 1 : 0 })) : []);
        const vw = innerWidth, vh = innerHeight;
        return { t: performance.now(), l: L.map(b => Object.assign(b, { on: b.z < 1 && b.z > -1 && b.x > 0 && b.y > 0 && b.x < vw && b.y < vh })) };
    });
    const st = { samples: 0, onScreen: 0, hidden: 0, faded: 0, moved: 0, speeds: [] }; const prev = {};
    async function watch(label, secs) {
        const t0 = Date.now();
        while (Date.now() - t0 < secs * 1000) {
            const s = await sample(); st.samples++;
            s.l.forEach(b => {
                const p = prev[b.id]; prev[b.id] = { x: b.x, y: b.y, t: s.t, on: b.on, label };
                if (!b.on) return; st.onScreen++;
                if (!b.visible) { st.hidden++; console.log(label, b.id, 'HIDDEN'); }
                else if (b.opacity < 0.99) st.faded++;
                if (b.off > 1e-4) st.moved++;
                if (p && p.on && p.label === label && label === 'idle') { const dt = (s.t - p.t) / 1000; if (dt > 0.05) st.speeds.push(Math.hypot(b.x - p.x, b.y - p.y) / dt); }
            });
            await H.sleep(200);
        }
    }
    await watch('idle', SECS);
    async function tapTest() {
    /* tap test: a place on screen whose spot is the world itself (not under a bubble or a button), then watch for the trip */
    const target = await page.evaluate(() => {
        const L = LowiWorld3D.placesLook ? LowiWorld3D.placesLook() : LowiWorld3D.veilLook();
        const cv = document.querySelector('.bw3-canvas, #bw3 canvas, canvas'); const rc = cv ? cv.getBoundingClientRect() : { left: 0, top: 0 };
        for (const b of L) {
            if (!(b.z < 1 && b.z > -1)) { (window.__cov = window.__cov || []).push(b.id + ':behind'); continue; }
            const x = b.x + rc.left, y = b.y + rc.top; if (x < 20 || y < 60 || x > innerWidth - 20 || y > innerHeight - 20) { (window.__cov = window.__cov || []).push(b.id + ':edge ' + Math.round(x) + ',' + Math.round(y)); continue; }
            const el = document.elementFromPoint(x, y); if (!el) continue;
            if (!el.closest('#bw3Stage')) { (window.__cov = window.__cov || []).push(b.id + '@' + Math.round(x) + ',' + Math.round(y) + ':' + ((el.id || '') + '.' + (el.className && el.className.baseVal == null ? el.className : '')).slice(0, 40)); continue; }
            return { id: b.id, x, y, el: (el.id || el.className || el.tagName).toString().slice(0, 40) };
        }
        return null;
    });
    const env = await page.evaluate(() => { const st = document.getElementById('bw3Stage'); const r = st ? st.getBoundingClientRect() : null; return { html: document.documentElement.className.split(' ').filter(c => /^(wh-|gate|ob-|tab-)/.test(c)).join(' '), stage: r ? [r.x, r.y, r.width, r.height].map(Math.round).join(',') : 'none' }; });
    console.log('ENV', JSON.stringify(env));
    if (arg('shot')) await r.shot(arg('shot'));
    if (!target) console.log('TAP no uncovered place on screen right now', JSON.stringify(await page.evaluate(() => window.__cov || [])));
    else {
        await page.touchscreen.tap(target.x, target.y);
        let went = null;
        for (let i = 0; i < 20 && !went; i++) {
            await H.sleep(150);
            went = await page.evaluate(id => { const R = window.LowiWorldRegions, s = R && R.state, rig = LowiWorld3D.rig; if (s && (s.busy || s.target === id || s.cur === id)) return 'regions:' + (s.target || s.cur) + (s.busy ? ' busy' : ''); if (rig && rig.fly) return 'camera fly'; return null; }, target.id);
        }
        console.log('TAP ' + target.id + ' at ' + Math.round(target.x) + ',' + Math.round(target.y) + ' on ' + target.el + ' -> ' + (went ? 'TRIP STARTED (' + went + ')' : 'NO TRIP'));
    }
    }
    await tapTest();
    await page.evaluate(() => { try { const R = window.LowiWorldRegions; if (R && R.travel) R.travel('hub'); } catch (e) { } }); await H.sleep(4000);
    const cx = W / 2, cy = Ht * 0.42;
    await page.mouse.dblclick(cx + 60, cy + 120).catch(() => {}); await watch('dbltap', 5);
    await page.mouse.dblclick(cx + 60, cy + 120).catch(() => {}); await watch('dbltap2', 5);
    await page.evaluate(() => { try { window.dispatchEvent(new WheelEvent('wheel', { deltaY: 400 })); } catch (e) { } }); await watch('zoom', 5);
    for (const t of ['community', 'cook', 'move']) {
        await page.evaluate(t => { const b = document.querySelector('#tabbar .tb[data-tab="' + t + '"]'); if (b) b.click(); }, t); await H.sleep(2500);
        await page.evaluate(() => { const b = document.querySelector('#tabbar .tb[data-tab="home"]'); if (b) b.click(); }); await H.sleep(1500);
        await watch('after-' + t, 5);
    }
    st.speeds.sort((a, b) => a - b);
    const q = f => st.speeds.length ? Math.round(st.speeds[Math.min(st.speeds.length - 1, Math.floor(st.speeds.length * f))]) : -1;
    console.log('SUMMARY size=' + W + 'x' + Ht + ' samples=' + st.samples + ' placeOnScreenSamples=' + st.onScreen + ' hidden=' + st.hidden + ' faded=' + st.faded + ' notAtRealSpot=' + st.moved + ' idleSpeedPxPerSec median=' + q(0.5) + ' p95=' + q(0.95) + ' max=' + q(1));
    console.log('ERRORS', JSON.stringify((r.errs || []).slice(0, 5)));
    await r.close();
    process.exit(0);
})().catch(e => { console.error('PROBE FAIL', e); process.exit(2); });
