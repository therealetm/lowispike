#!/usr/bin/env node
/* Flight crash hunt 12:01 Oct 24: crash-soak keeps logging 'steering never got her out' (brain, liver). Is that the app or the
   soak's blind directions + the simulator's frame rate? Enters a world, then holds the controller toward the cloud wall (the
   angle farthest from both exitGaps, misty-flight.js; the gaps open onto the dark and are never a way out) for up to HOLD s
   real time and logs her state, the frame rate and the world clock. Simulated browser only, not a real iPhone.
   Usage: node tools/flight-steer-out-probe.cjs [--engine chromium|webkit] [--device 'iPhone 13'] [--worlds brain,liver] [--hold 40] */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('engine', 'chromium'), DEVICE = arg('device', 'iPhone 13'), WORLDS = arg('worlds', 'brain,liver').split(','), HOLD = +arg('hold', 40);
const angWrap = x => { x = (+x || 0) % (2 * Math.PI); if (x > Math.PI) x -= 2 * Math.PI; if (x <= -Math.PI) x += 2 * Math.PI; return x; };
function idHash(id) { let h = 2166136261; const s = String(id || ''); for (let j = 0; j < s.length; j++) { h ^= s.charCodeAt(j); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
function exitGaps(id) { const u = idHash(id), v = idHash(String(id || '') + '#2'); const a1 = Math.PI * (0.18 + 0.64 * u); let a2 = angWrap(a1 + Math.PI + (v - 0.5) * 0.7); if (Math.abs(angWrap(a2 + Math.PI / 2)) < 0.45) a2 = angWrap(a2 + (a2 > -Math.PI / 2 ? 0.5 : -0.5)); return [angWrap(a1), a2]; }
function wallAngle(id) { const g = exitGaps(id); let best = 0, bd = -1; for (let i = 0; i < 72; i++) { const a = angWrap(i * Math.PI / 36); const d = Math.min(...g.map(x => Math.abs(angWrap(a - x)))); if (Math.abs(angWrap(a + Math.PI / 2)) < 0.6) continue; if (d > bd) { bd = d; best = a; } } return best; }
(async () => {
    const R = await H.open({ engine: ENGINE, device: DEVICE, url: arg('url', 'https://therealetm.github.io/lowispike/index.html') }), P = R.page;
    if (ENGINE === 'webkit') await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
    const ev = (f, a) => P.evaluate(f, a).catch(e => ({ err: String(e.message).slice(0, 100) }));
    const st = () => ev(() => { const s = window.LowiMistyFlight.state(); return { st: s.st, cur: window.LowiWorldRegions.current(), busy: window.LowiWorldRegions.state.busy, exP: s.exP, mist: s.mist, exDark: s.exDark, deep: s.deep, dk: s.dk, mistAng: s.mistAng, exE: s.exE, exO: s.exO, p: s.p, tr: s.transit, ax: s.autoX, flew: s.flew, lg: (s.log || []).slice(-3) }; });
    const pad = () => ev(() => { const e = document.getElementById('whPad'); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; });
    const fps = () => ev(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); }));
    const results = [];
    try {
        await R.goto(); await H.sleep(8000);
        for (const w of WORLDS) {
            let p = await pad();
            for (let k = 0; k < 4 && p; k++) { const s0 = await st(); if (s0.st === 'free') break; await P.mouse.move(p.x, p.y); await P.mouse.down(); await P.mouse.move(p.x, p.y - 40, { steps: 4 }); await H.sleep(1500); await P.mouse.up(); await H.sleep(500); }
            await ev(w => window.LowiWorldRegions.travel(w), w);
            const t0 = Date.now(); let s;
            while (Date.now() - t0 < 120000) { s = await st(); if (s.cur === w && s.st === 'inside') break; await H.sleep(500); }
            console.log(R.el(), w, 'inside after', Math.round((Date.now() - t0) / 1000), 's', JSON.stringify(s), 'fps', await fps());
            await H.sleep(2500);
            const a = wallAngle(w), dx = Math.cos(a) * 60, dy = -Math.sin(a) * 60;
            p = await pad(); if (!p) { console.log(w, 'no controller'); results.push({ w, out: false, why: 'no pad' }); continue; }
            await P.mouse.move(p.x, p.y); await P.mouse.down(); await P.mouse.move(p.x + dx, p.y + dy, { steps: 5 });
            const h0 = Date.now(); let out = false, maxP = 0, log = [];
            while (Date.now() - h0 < HOLD * 1000) { await H.sleep(1000); await P.mouse.move(p.x + dx + (Math.random() - .5) * 4, p.y + dy).catch(() => { }); s = await st(); maxP = Math.max(maxP, s.exP || 0); log.push([Math.round((Date.now() - h0) / 1000), s.st, s.exP, 'E' + s.exE, 'O' + s.exO, JSON.stringify(s.p), s.mist ? 'mist' : '', s.exDark ? 'dark' : '', s.tr ? 'tr' : '', s.ax || ''].join(' ')); if (s.st !== 'inside' || s.cur !== w) { out = true; break; } }
            await P.mouse.up();
            console.log(R.el(), w, 'wall angle', a.toFixed(2), 'gaps', exitGaps(w).map(x => x.toFixed(2)).join(','), out ? 'OUT after ' + Math.round((Date.now() - h0) / 1000) + ' s' : 'STILL INSIDE', 'max exP', maxP, '\n   ', log.join(' | '), '\n   last', JSON.stringify(s));
            results.push({ w, out, secs: Math.round((Date.now() - h0) / 1000), maxP });
            if (!out) await ev(() => window.LowiWorldRegions.travel('hub'));
            const t1 = Date.now(); while (Date.now() - t1 < 120000) { s = await st(); if (s.cur === 'hub' && !s.busy && s.st !== 'inside' && s.st !== 'out' && s.st !== 'warp') break; await H.sleep(500); }
            await H.sleep(2000);
        }
    } catch (e) { console.log('probe error', String(e.message).slice(0, 200)); }
    console.log('RESULT ' + JSON.stringify({ engine: ENGINE, device: DEVICE, crashed: !!R.crashed, results, errs: R.errs.filter(e => !/audio device/i.test(e.m)).slice(-5).map(e => String(e.m).slice(0, 160)) }));
    await Promise.race([R.close(), H.sleep(10000)]).catch(() => { });
    process.exit(0);
})();
