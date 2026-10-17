/* LOWiSPIKE · excursions for the tour (Oct 17, 2026, adventure tiers). misty-flight.js tourWant() asks this first. While an
   excursion runs it steers (V.want) and returns true; otherwise the normal tour (drift points, doors, cell worlds) goes on.
   What she may do comes from adventure-tiers.js caps: autopilot always gets everything, her timed adventure only what her
   level unlocks. Steps, each one only when unlocked:
     edge     push out through her world's edge (misty-galaxy.js breakout, S.exOut)          caps.atmos   (Level 4)
     atmos    drift round a few points in the spirit world's outer atmosphere                 caps.atmos
     toBubble fly to the nearest other bubble and press in (galaxy-bubbles.js, S.exB)        caps.bubbles (Level 5)
     inside   look round in there for a while, then leave (S.exLeave)                         caps.bubbles
     toStream find where a current starts flowing, get onto it and let it carry her (S.exRide) caps.streams (Level 6)
     home     fly back to her world; once she is through its edge the tour goes on
   Every step has a time limit, so she can never get stuck out there. Pure helpers are tested in tests/adventure-tiers.test.cjs. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis;
    /* FIRST: seconds of normal tour before the first excursion; EVERY: between excursions; LIM: per-step time limits (s);
       NEAR: arrival distance (world units); PTS: atmosphere points per excursion; RIN/ROUT: atmosphere band, in her world's
       reaches; STAY: seconds inside a bubble; RIDE: gentle swim along a current (the current does the rest) */
    const X = { FIRST: 60, EVERY: 120, LIM: { edge: 30, atmos: 40, toBubble: 45, inside: 10, leave: 10, toStream: 40, ride: 60, home: 60 }, NEAR: 3.5, PTS: 2, RIN: 1.5, ROUT: 3, STAY: 8, RIDE: 0.35 };
    /* time to start an excursion? Only when the sky is unlocked, she is in her own world, not pausing at a door or heading in */
    function due(c, E, s) { return !!(c && c.atmos) && !s.gx && !s.gxBack && !s.wait && !s.going && !s.reduced && E.tour >= (E.done ? X.EVERY : X.FIRST); }
    /* what follows the atmosphere (and leaving a bubble) at these caps */
    function after(ph, c, rode) {
        if (ph === 'atmos') return c.bubbles ? 'toBubble' : 'home';
        if (ph === 'leave') return c.streams && !rode ? 'toStream' : 'home';
        return 'home';
    }
    const core = { X, due, after };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (typeof window === 'undefined' || W.LowiMistyExplore) return;

    const E = { ph: '', t: 0, tour: 0, done: false, pts: null, i: 0, aim: -1, si: -1, rode: false, rid: 0, j: 0, line: null, dir: null, log: [] };
    function clear(S) { if (S) { S.exOut = false; S.exB = -1; S.exLeave = false; S.exRide = false; } }
    function reset(S) { E.ph = ''; E.t = 0; E.tour = 0; E.pts = null; E.i = 0; E.aim = -1; E.si = -1; E.rode = false; E.rid = 0; E.j = 0; E.line = null; clear(S); }
    function go(S, ph, note) { E.ph = ph; E.t = 0; E.i = 0; E.log.push(ph); if (E.log.length > 30) E.log.shift(); try { if (note) note('explore ' + ph); } catch (e) { } if (ph === 'home') clear(S); }
    /* steer toward p at strength s (0..1), easing in the last couple of units */
    function toward(S, V, p, s) { V.a.subVectors(p, S.p); const d = V.a.length(); if (d > 1e-4) V.want.copy(V.a).multiplyScalar(Math.min(1, d / 2) * s / d); else V.want.set(0, 0, 0); return d; }
    function targets(ctx) { try { return W.LowiGalaxyBubbles && W.LowiGalaxyBubbles.targets ? W.LowiGalaxyBubbles.targets(ctx) : null; } catch (e) { return null; } }
    /* the chosen current, cached for a second (its points only move as the galaxy turns slowly) */
    function line(ctx) { const G = W.LowiGalaxyBubbles; if (!G || !G.stream || E.si < 0) return null; const now = Date.now(); if (!E.line || E.line.si !== E.si || now - E.line.at > 1000) { const st = G.stream(ctx, E.si); E.line = st ? Object.assign(st, { si: E.si, at: now }) : null; } return E.line; }
    function rnd(P, flat) { return new P.constructor(Math.random() - 0.5, (Math.random() - 0.5) * flat, Math.random() - 0.5).normalize(); }

    function want(ctx, S, V, K, c, note) {
        if (!ctx || ctx.reduced || !W.LowiMistyGalaxy) { if (E.ph) reset(S); return false; }
        const dt = ctx.dt || 0.016, reach = (K && K.ROAM) || 11;
        if (!E.ph) {
            if (S.gx && !S.gxBack) go(S, 'home', note);
            else {
                E.tour += dt;
                if (!due(c, E, { gx: S.gx, gxBack: S.gxBack, wait: S.wpWait > 0, going: !!S.tourGo, reduced: ctx.reduced })) return false;
                E.dir = S.p.clone().sub(V.c); if (E.dir.lengthSq() < 1) E.dir.copy(V.rt); E.dir.normalize(); E.rode = false;
                S.exOut = true; go(S, 'edge', note);
            }
        }
        E.t += dt;
        if (E.ph !== 'home' && E.t > (X.LIM[E.ph] || 40)) go(S, 'home', note);
        const tg = E.ph !== 'edge' && E.ph !== 'atmos' && E.ph !== 'home' ? targets(ctx) : null;
        switch (E.ph) {
            case 'edge': {
                if (S.gx) {
                    S.exOut = false; E.pts = [];
                    for (let n = 0; n < X.PTS; n++) E.pts.push(E.dir.clone().multiplyScalar(1.2).add(rnd(E.dir, 0.6)).normalize().multiplyScalar(reach * (X.RIN + Math.random() * (X.ROUT - X.RIN))).add(V.c));
                    go(S, 'atmos', note); break;
                }
                V.want.copy(E.dir); return true;
            }
            case 'atmos': {
                if (!S.gx) { go(S, 'home', note); break; }
                const p = E.pts && E.pts[E.i]; if (!p) { go(S, after('atmos', c, E.rode), note); break; }
                if (toward(S, V, p, 0.85) < X.NEAR) E.i++;
                return true;
            }
            case 'toBubble': {
                if (!S.gx || !tg || !tg.bubbles.length) { go(S, 'home', note); break; }
                if (E.aim < 0 || !tg.bubbles[E.aim]) { let bd = 1e9; tg.bubbles.forEach(b => { const d = b.p.distanceTo(S.p) - b.r; if (d < bd) { bd = d; E.aim = b.i; } }); }
                S.exB = E.aim; S.exLeave = false;
                if (tg.inside === E.aim) { const b = tg.bubbles[E.aim]; E.pts = []; for (let n = 0; n < 3; n++) E.pts.push(rnd(b.p, 0.6).multiplyScalar(b.r * 0.45).add(b.p)); go(S, 'inside', note); break; }
                V.a.subVectors(tg.bubbles[E.aim].p, S.p); V.want.copy(V.a).multiplyScalar(1 / Math.max(V.a.length(), 1e-4));
                return true;
            }
            case 'inside': {
                if (!tg || tg.inside !== E.aim) { E.aim = -1; S.exB = -1; go(S, after('leave', c, E.rode), note); break; }
                if (toward(S, V, E.pts[E.i % E.pts.length], 0.6) < 1.5) E.i++;
                if (E.t > X.STAY) { S.exLeave = true; go(S, 'leave', note); }
                return true;
            }
            case 'leave': {
                S.exLeave = true;
                if (!tg || tg.inside < 0) { S.exB = -1; S.exLeave = false; E.aim = -1; go(S, after('leave', c, E.rode), note); break; }
                const b = tg.bubbles[tg.inside]; if (b) { V.a.subVectors(S.p, b.p); V.want.copy(V.a).multiplyScalar(0.8 / Math.max(V.a.length(), 1e-4)); }
                return true;
            }
            case 'toStream': {
                if (!S.gx || !tg || !tg.streams.length) { go(S, 'home', note); break; }
                if (E.si < 0 || !tg.streams[E.si]) { let bd = 1e9; tg.streams.forEach(s => { const d = s.from.distanceTo(S.p); if (d < bd) { bd = d; E.si = s.i; } }); }
                const st = line(ctx); if (!st) { go(S, 'home', note); break; }
                S.exB = -1; S.exRide = true; /* the current may catch her as she arrives */
                /* get right onto the line where it leaves the bubbles behind; the current catches her within a few of her sizes */
                E.d = toward(S, V, st.pts[st.entry], 0.9); if (E.d < 2.5 || tg.riding >= 0) { S.exRide = true; E.j = st.entry; go(S, 'ride', note); }
                return true;
            }
            case 'ride': {
                const st = line(ctx); if (!st || !S.gx) { go(S, 'home', note); break; }
                S.exRide = true; if (tg && tg.riding >= 0) E.rid = Math.max(E.rid, E.t);
                /* follow the line a little ahead of where she is (the current does most of the work) */
                let bj = E.j || st.entry, bd = 1e9; for (let j = Math.max(0, bj - 2); j <= Math.min(st.end, bj + 8); j++) { const d = st.pts[j].distanceTo(S.p); if (d < bd) { bd = d; bj = j; } }
                E.j = bj;
                const ahead = Math.min(st.end, bj + 2); toward(S, V, st.pts[ahead], bd > 2.5 ? 0.7 : X.RIDE);
                if (bj >= st.end - 1) {
                    S.exRide = false; E.rode = true; let ed = 1e9; E.aim = -1; const tail = st.pts[st.pts.length - 1];
                    tg.bubbles.forEach(b => { const d = b.p.distanceTo(tail) - b.r; if (d < ed) { ed = d; E.aim = b.i; } });
                    go(S, c.bubbles && E.aim >= 0 ? 'toBubble' : 'home', note); break;
                }
                return true;
            }
            case 'home': {
                clear(S);
                if (!S.gx && !S.gxBack) { E.ph = ''; E.tour = 0; E.done = true; E.aim = -1; E.si = -1; try { if (note) note('explore done'); } catch (e) { } return false; }
                toward(S, V, V.c, 1); return true;
            }
        }
        /* the step changed this frame: hold course; the next step steers from the next frame */
        return !!E.ph && !!S.gx;
    }
    function off(S) { if (E.ph || (S && (S.exOut || S.exRide || S.exB >= 0))) { const d = E.done, t = E.tour; reset(S); E.done = d; E.tour = t; } }
    function state() { return { ph: E.ph, t: +E.t.toFixed(1), tour: +E.tour.toFixed(1), aim: E.aim, si: E.si, rode: E.rode, rid: +E.rid.toFixed(1), j: E.j, d: E.d == null ? null : +(+E.d).toFixed(1), n: E.line ? [E.line.entry, E.line.end, E.line.pts.length] : null, log: E.log.slice(-12) }; }
    W.LowiMistyExplore = { core, want, reset, off, state, X };
})();
