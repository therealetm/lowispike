#!/usr/bin/env node
/* Phase B item 5 (Nov 5 2026, owner: "the game restarts after the flying section, near the stream transition"). Reproduction attempt in a
   simulated browser: break Misty out of her bubble into the spirit world (same push as tools/cosmos-reveal-probe.cjs), then let her
   fly and ride the currents (streams) between the worlds, by hand (drive) and on autopilot. Every 250 ms it records: page loads
   (a real reload), the flight state, galaxy on/off, which current she rides, and the flight/galaxy logs. A "restart" is any of: a
   second page load, the flight ending on its own (end abort / tapped-away / left / timeout) or the galaxy dropping her home
   ("home again") while nobody steered her home. Prints JSON; exit 0 = no restart seen, 1 = restart seen, 2 = could not run.
   Usage: node tools/stream-restart-probe.cjs [--engine chromium|webkit] [--secs 120] [--w 390 --h 844]
   Simulated browser only, not a real iPhone; Supabase is faked by the harness (nothing reaches the real database). */
'use strict';
const path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
    const W = +arg('w', 390), Ht = +arg('h', 844), SECS = +arg('secs', 120), engine = arg('engine', 'chromium');
    const r = await H.open({ engine, viewport: { width: W, height: Ht }, dpr: 1, cloud: false, probe: false, root: path.resolve(path.join(__dirname, '..')) });
    const page = r.page; let loads = 0; page.on('load', () => { loads++; }); const errs = []; page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200)));
    await r.goto();
    await page.waitForFunction(() => window.LowiWorld3D && window.LowiWorld3D.ready && window.LowiMistyFlight && window.LowiMistyGalaxy && window.LowiGalaxyBubbles && window.LowiPad, null, { timeout: 90000 });
    await H.sleep(4000);
    const loads0 = loads;
    await page.evaluate(() => LowiPad.mode('drive'));
    let on = false, a = 0; const end = Date.now() + 120000;
    while (!on && Date.now() < end) {
        const t1 = Date.now() + 9000;
        while (Date.now() < t1 && !on) { on = await page.evaluate(a => { LowiPad.steer(Math.cos(a), Math.sin(a)); if (!LowiMistyGalaxy.state().on) LowiMistyGalaxy._probe(0.97); return LowiMistyGalaxy.state().on; }, a); await H.sleep(120); }
        if (!on) a += 0.7;
    }
    const out = { engine, size: W + 'x' + Ht, brokeOut: on, samples: 0, rides: 0, restarts: [], states: {}, logTail: [] };
    if (!on) { out.note = 'never broke out of her bubble'; console.log(JSON.stringify(out, null, 1)); await r.close(); process.exit(2); }
    let lastRide = -1, lastF = '', seenLog = new Set();
    const t2 = Date.now() + SECS * 1000; let k = 0;
    while (Date.now() < t2) {
        const phase = (Date.now() - (t2 - SECS * 1000)) / (SECS * 1000);
        /* first half: steer by hand on a slow circle (rides whatever current catches her); second half: autopilot */
        const s = await page.evaluate(([ph, ang]) => {
            try { if (ph < 0.5) { LowiPad.mode('drive'); LowiPad.steer(Math.cos(ang), Math.sin(ang)); } else if (LowiPad.mode() !== 'auto') LowiPad.mode('auto'); } catch (e) { }
            const f = LowiMistyFlight.state ? LowiMistyFlight.state() : {}, g = LowiMistyGalaxy.state(), b = LowiGalaxyBubbles.state();
            return { st: f.st, on: g.on, far: g.far, riding: b.riding, inside: b.inside, currents: b.currents, flog: (f.log || []).slice(-6), glog: g.log, blog: b.log };
        }, [phase, a + k * 0.02]);
        k++; out.samples++; out.states[s.st + (s.on ? '/galaxy' : '')] = (out.states[s.st + (s.on ? '/galaxy' : '')] || 0) + 1;
        if (s.riding >= 0 && s.riding !== lastRide) out.rides++;
        for (const l of [].concat(s.flog || [], s.glog || [], s.blog || [])) {
            const t = String(l); if (seenLog.has(t)) continue; seenLog.add(t); out.logTail.push(t); if (out.logTail.length > 40) out.logTail.shift();
            if (/end (abort|tapped-away|left|warp-timeout|out-timeout)|home again/.test(t)) out.restarts.push({ at: Math.round(phase * SECS) + 's', log: t, rodeJustBefore: lastRide >= 0 });
        }
        if (loads > loads0) { out.restarts.push({ at: Math.round(phase * SECS) + 's', log: 'page reloaded (' + (loads - loads0) + ')' }); break; }
        lastRide = s.riding; lastF = s.st;
        await H.sleep(250);
    }
    out.lastState = lastF; out.pageErrors = errs.slice(0, 5); out.reloads = loads - loads0;
    console.log(JSON.stringify(out, null, 1));
    await r.close(); process.exit(out.restarts.length ? 1 : 0);
})().catch(e => { console.error('PROBE FAIL', e.message); process.exit(2); });
