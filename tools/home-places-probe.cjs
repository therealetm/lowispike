#!/usr/bin/env node
/* Diagnosis probe (Oct 24, Eman: "the cells keep disappearing ... the brain and the heart and all of that stuff"). Serves a folder
   (or --url), leaves Home idle, then runs the usual triggers (pinch zoom, double-tap zoom, a tab round trip, a reload is a new run)
   and samples every 200 ms which body places are on screen and which are hidden (veil < 0.5, or the group not visible).
   Prints every hide/show flip and a summary: how many on-screen samples had a place hidden.
   Usage: node tools/home-places-probe.cjs [--root DIR] [--url URL] [--secs 40] [--w 390 --h 844] [--engine chromium|webkit] */
'use strict';
const path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
    const W = +arg('w', 390), Ht = +arg('h', 844), SECS = +arg('secs', 40);
    const o = { engine: arg('engine', 'chromium'), viewport: { width: W, height: Ht }, dpr: 1, cloud: false, probe: false };
    if (arg('url')) o.url = arg('url'); else o.root = path.resolve(arg('root', path.join(__dirname, '..')));
    const r = await H.open(o);
    const page = r.page; await r.goto();
    await page.waitForFunction(() => window.LowiWorld3D && window.LowiWorld3D.ready, null, { timeout: 90000 });
    await page.evaluate(() => { const g = () => document.documentElement.classList.remove('gate-boot', 'gate-up'); g(); setInterval(g, 500); const r2 = document.getElementById('r2gate'); if (r2) r2.hidden = true; });
    await H.sleep(3000);
    const build = await page.evaluate(() => { try { return (window.LOWI_BUILD || document.querySelector('meta[name="lowi-build"]')?.content || '') + ''; } catch (e) { return ''; } });
    console.log('build', build, 'size', W + 'x' + Ht);
    const sample = () => page.evaluate(() => {
        const l = LowiWorld3D.veilLook ? LowiWorld3D.veilLook() : [];
        const cs = LowiWorld3D.veilCircles ? LowiWorld3D.veilCircles() : []; const c = cs.length;
        const vw = innerWidth, vh = innerHeight;
        const cv = document.querySelector('.bw3-canvas, #bw3 canvas, canvas'); const rc = cv ? cv.getBoundingClientRect() : { left: 0, top: 0 };
        const inside = b => cs.some(k => Math.hypot(b.x - k.x, b.y - k.y) < k.r - 6);
        return { c, l: l.map(b => ({ id: b.id, on: b.z < 1 && b.x > 0 && b.y > 0 && b.x < vw && b.y < vh, veil: b.veil, under: b.under, aside: b.aside || 0, drawnInside: inside(b) })) };
    });
    let samples = 0, hiddenOn = 0, onScreen = 0, asideN = 0, drawnInside = 0; const flips = {}; const last = {};
    async function watch(label, secs) {
        const t0 = Date.now();
        while (Date.now() - t0 < secs * 1000) {
            const s = await sample(); samples++;
            s.l.forEach(b => {
                if (!b.on) return; onScreen++;
                const hid = b.veil < 0.5; if (hid) hiddenOn++; if (b.aside > 0) asideN++; if (b.drawnInside && !hid) drawnInside++;
                if (last[b.id] !== undefined && last[b.id] !== hid) { flips[b.id] = (flips[b.id] || 0) + 1; console.log(label + ' ' + ((Date.now() - t0) / 1000).toFixed(1) + 's ' + b.id + (hid ? ' HIDDEN' : ' back') + ' circles=' + s.c); }
                last[b.id] = hid;
            });
            await H.sleep(200);
        }
    }
    await watch('idle', SECS);
    const cx = W / 2, cy = Ht * 0.42;
    await page.mouse.dblclick(cx + 60, cy + 120).catch(() => {});
    await watch('dbltap', 6);
    await page.mouse.dblclick(cx + 60, cy + 120).catch(() => {});
    await watch('dbltap2', 6);
    await page.evaluate(() => { try { window.dispatchEvent(new WheelEvent('wheel', { deltaY: 400 })); } catch (e) { } });
    await watch('zoom', 6);
    for (const t of ['community', 'cook', 'move']) {
        await page.evaluate(t => { const b = document.querySelector('#tabbar .tb[data-tab="' + t + '"]'); if (b) b.click(); }, t); await H.sleep(2500);
        await page.evaluate(() => { const b = document.querySelector('#tabbar .tb[data-tab="home"]'); if (b) b.click(); }); await H.sleep(1500);
        await watch('after-' + t, 6);
    }
    console.log('SUMMARY size=' + W + 'x' + Ht + ' samples=' + samples + ' placeOnScreenSamples=' + onScreen + ' hiddenWhileOnScreen=' + hiddenOn + ' steppedAside=' + asideN + ' drawnUnderBubble=' + drawnInside + ' flips=' + JSON.stringify(flips));
    await r.close();
    process.exit(0);
})().catch(e => { console.error('PROBE FAIL', e); process.exit(2); });
