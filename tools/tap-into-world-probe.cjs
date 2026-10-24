#!/usr/bin/env node
/* Oct 24 2026 (E-man: "fly in whatever is logically native"): the natural way in is a tap on a glowing place on Home.
   For every place: real pointer tap on its spot (skipped when a Home bubble or the controller covers it), check the trip that
   starts goes to that place, then watch the frame counter every 500ms through the dive and 8s inside (a freeze = no new frame
   for 3s while Home is showing), then back out with the World map. Reports page errors, frame-guard errors and lost GL.
   Usage: node tools/tap-into-world-probe.cjs [url|root] [--engine chromium|webkit] [--device 'iPhone 13'] [--rounds 1] */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
(async () => {
    const o = { engine: arg('engine', 'chromium'), device: arg('device', 'iPhone 13') };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    if (o.engine === 'webkit') await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
    const errs = [], found = [], ok = [];
    P.on('pageerror', e => errs.push(String(e && e.message || e).slice(0, 200)));
    P.on('crash', () => found.push('PAGE CRASHED'));
    const ev = (fn, a) => P.evaluate(fn, a).catch(e => ({ evalErr: String(e.message).slice(0, 160) }));
    const st = () => ev(() => { const W3 = window.LowiWorld3D, s = window.LowiWorldRegions.state; return { fr: window.__fwN || 0, ferr: W3 && W3.frameErrors || 0, cur: s.cur, busy: !!s.busy, target: s.target || null, home: document.documentElement.classList.contains('wh-home'), lost: !!(W3 && W3.lost) }; });
    /* --full: the companion has full energy (the same override fly-into-world-probe uses), so no trip is refused for low energy */
    const full = () => arg('full', false) ? ev(() => { const S = window.LowiSun; if (!S || !S.energyNow || S.__full) return; const was = S.energyNow; S.__full = 1; S.energyNow = () => Object.assign({}, was(), { value: 1, tier: 'thriving', canTravel: true, real: true }); }) : null;
    try {
        await R.goto(); await H.sleep(8000);
        for (let i = 0; i < 60 && (await ev(() => !!(window.LowiWorld3D && window.LowiWorld3D.onFrame && window.LowiWorld3D.placesLook))) !== true; i++) await H.sleep(500);
        await ev(() => { window.LowiWorld3D.onFrame(() => { window.__fwN = (window.__fwN || 0) + 1; }); });
        const ids = await ev(() => window.LowiWorld3D.placesLook().map(b => b.id));
        const rounds = +arg('rounds', 1);
        for (let r = 0; r < rounds; r++) for (const id of ids) {
            await full();
            let spot = null;
            for (let i = 0; i < 16 && !spot; i++) {
                spot = await ev(id => {
                    const L = window.LowiWorld3D.placesLook(), b = L.find(x => x.id === id); if (!b || b.z > 1 || b.z < -1) return null;
                    const cv = document.querySelector('.bw3-canvas') || document.querySelector('canvas'); const rc = cv.getBoundingClientRect(), x = rc.left + b.x, y = rc.top + b.y;
                    if (x < 12 || y < 12 || x > innerWidth - 12 || y > innerHeight - 12) return null;
                    const top = document.elementFromPoint(x, y); return top && top.tagName === 'CANVAS' ? { x, y } : null;
                }, id);
                if (!spot && i === 5) await ev(() => { const st = document.querySelector('.bw3-stage'); for (let k = 0; k < 4; k++) st.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120, clientX: innerWidth / 2, clientY: innerHeight / 2 })); }); /* not on screen: zoom out a little, like a pinch */
                if (!spot) await H.sleep(800);
            }
            if (!spot || spot.evalErr) { ok.push(id + ': not tappable from this view (off screen or under a bubble), skipped'); continue; }
            /* a real finger tap takes ~100ms; the loaded test machine delivers a mouse click's up 600ms+ after its down, which the
               app (rightly) reads as a hold, not a tap. So the tap is the same pointer events, dispatched back to back on the spot. */
            if (arg('mouse', false)) await P.mouse.click(spot.x, spot.y, { delay: 40 });
            else await ev(([x, y]) => { const t = document.elementFromPoint(x, y), o = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1 };
                t.dispatchEvent(new PointerEvent('pointerdown', o)); t.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, o, { buttons: 0 }))); t.dispatchEvent(new MouseEvent('click', o)); }, [spot.x, spot.y]);
            await H.sleep(700);
            const a = await st();
            if (!a.busy && a.cur === 'hub') { found.push('r' + r + ' tap on ' + id + ' started no trip'); continue; }
            if (a.target && a.target !== id) ok.push('r' + r + ' tap on ' + id + ' flew to ' + a.target + ' (neighbouring spot)');
            let last = a.fr, lastT = Date.now(), stall = 0, arrived = false, t0 = Date.now();
            while (Date.now() - t0 < 45000) {
                await H.sleep(500); const s = await st(); if (s.evalErr) { found.push('r' + r + ' ' + id + ': page stopped answering: ' + s.evalErr); break; }
                if (s.fr > last) { last = s.fr; lastT = Date.now(); } else if (s.home && Date.now() - lastT > 3000) { stall = Math.max(stall, Date.now() - lastT); }
                if (s.ferr) found.push('r' + r + ' ' + id + ': frame errors ' + s.ferr);
                if (!s.busy && s.cur !== 'hub') { if (!arrived) { arrived = true; t0 = Date.now() - 37000; } }
            }
            const b = await st();
            if (stall) found.push('r' + r + ' ' + id + ': FROZE, no frame for ' + Math.round(stall / 100) / 10 + 's');
            if (!arrived) found.push('r' + r + ' ' + id + ': did not arrive inside within 45s (cur ' + b.cur + ', busy ' + b.busy + ')');
            else ok.push('r' + r + ' tap into ' + b.cur + ': arrived, world kept drawing (' + b.fr + ' frames)');
            await ev(() => window.LowiWorldRegions.travel('hub'));
            for (let i = 0; i < 90; i++) { await H.sleep(500); const s = await st(); if (s.cur === 'hub' && !s.busy) break; }
            await H.sleep(1500);
        }
    } catch (e) { found.push('stopped: ' + e.message.slice(0, 200)); }
    const fin = await st();
    console.log('OK:\n - ' + ok.join('\n - '));
    console.log('FOUND ' + (found.length + errs.length) + ':' + (found.length ? '\n - ' + found.join('\n - ') : '') + (errs.length ? '\n - page errors: ' + JSON.stringify(errs.slice(0, 6)) : ''));
    console.log('final', JSON.stringify(fin));
    try { await R.close(); } catch (e) { }
    process.exit(0);
})();
