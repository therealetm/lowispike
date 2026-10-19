/* LOWiSPIKE · excursions for the tour (Oct 17, 2026, adventure tiers). misty-flight.js tourWant() asks this first. While an
   excursion runs it steers (V.want) and returns true; otherwise the normal tour (drift points, doors, cell worlds) goes on.
   What she may do comes from adventure-tiers.js caps: autopilot always gets everything, her timed adventure only what her
   level unlocks. Steps, each one only when unlocked:
     edge     push out through her world's edge (misty-galaxy.js breakout, S.exOut)          caps.atmos   (Level 4)
     atmos    drift round a few points in the spirit world's outer atmosphere                 caps.atmos
     toBubble fly to the nearest other bubble and press in (galaxy-bubbles.js, S.exB)        caps.bubbles (Level 5)
     inside   look round in there for a while, then leave (S.exLeave)                         caps.bubbles
     -- from Level 6 (and always on autopilot) the bubble steps above give way to the STRING TOUR (Oct 19, E-man: "she should hook
        onto the visible strings and drift along them from bubble galaxy to bubble galaxy, changing strings; fly on her own only when
        no string connects to the next visible bubble; visit each visible bubble"). She never goes into a bubble on it:
     hook     get onto the chosen string (galaxy-bubbles.js S.exSi: only that string holds her)           caps.streams (Level 6)
     ride     drift along it to the far bubble: carried with its flow, held to it going up it (S.exUp)    caps.streams
     visit    swim a little way round that bubble's glowing membrane, then pick the next leg (nextLeg)   caps.streams
     fly      no string reaches any bubble still to visit: fly there on her own power, then strings again caps.streams
     home     fly back to her world; once she is through its edge the tour goes on
   Every step has a time limit, so she can never get stuck out there. Pure helpers are tested in tests/adventure-tiers.test.cjs. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis;
    /* FIRST: seconds of normal tour before the first excursion; EVERY: between excursions; LIM: per-step time limits (s);
       NEAR: arrival distance (world units); PTS: atmosphere points per excursion; RIN/ROUT: atmosphere band, in her world's
       reaches; STAY: seconds inside a bubble; RIDE: gentle swim along a current (the current does the rest) */
    /* string tour (Oct 19): VIS: a bubble counts as visible (to be visited) when its centre is this close to the middle of the spirit
       world (the near ring; the far ones are faint specks in the deep); TRIP: visits on her timed adventure (autopilot visits them all);
       TOUR: seconds the whole string tour may take before she heads home; LOOK: seconds she swims round a bubble she visits; HOPS: how
       many strings in a row she may chain to reach the next bubble before flying instead; UP: a string going against its flow costs this
       many times its length when she picks a route (she prefers to drift with the flow) */
    const X = { FIRST: 60, EVERY: 120, LIM: { edge: 30, atmos: 40, toBubble: 45, inside: 10, leave: 10, hook: 60, ride: 60, visit: 8, fly: 60, home: 60 }, NEAR: 3.5, PTS: 2, RIN: 1.5, ROUT: 3, STAY: 8, RIDE: 0.35,
        VIS: 300, TRIP: 3, TOUR: 900, LOOK: 2.5, HOPS: 3, UP: 2.5, PIN: 3 };
    /* time to start an excursion? Only when the sky is unlocked, she is in her own world, not pausing at a door or heading in */
    function due(c, E, s) { return !!(c && c.atmos) && !s.gx && !s.gxBack && !s.wait && !s.going && !s.reduced && E.tour >= (E.done ? X.EVERY : X.FIRST); }
    /* what follows the atmosphere (and leaving a bubble) at these caps */
    function after(ph, c) {
        if (ph === 'atmos') return c.streams ? 'plan' : c.bubbles ? 'toBubble' : 'home';
        return 'home';
    }
    /* the string tour's next leg from the bubble she is at (at; -1 = her own world). links: [{ i, a, b, dir, len }] (a / b: the bubble
       at each end, -1 her own world; dir +1 = it flows a to b); left: bubbles still to visit (Set or array); far(j): distance from
       where she is to bubble j, for a flight. Returns { kind: 'string', i, aToB, to } (the first string of the best route: a direct
       string to a bubble still to visit if there is one, else the fewest strings in a row (HOPS at most) through bubbles she has seen,
       drifting with the flow preferred), { kind: 'fly', to } (no string route: the nearest bubble still to visit), or null (all seen) */
    function nextLeg(at, links, left, far) {
        const todo = left instanceof Set ? left : new Set(left || []); if (!todo.size) return null;
        const cost = (l, aToB) => (+l.len || 1) * ((aToB ? l.dir : -l.dir) < 0 ? X.UP : 1);
        const from = n => (links || []).filter(l => l.a !== l.b && (l.a === n || l.b === n)).map(l => ({ l, aToB: l.a === n, to: l.a === n ? l.b : l.a }));
        /* a direct string first */
        let best = null;
        from(at).forEach(e => { if (!todo.has(e.to)) return; const c = cost(e.l, e.aToB); if (!best || c < best.c) best = { c, e }; });
        if (best) return { kind: 'string', i: best.e.l.i, aToB: best.e.aToB, to: best.e.to };
        /* chain strings through bubbles already seen: cheapest route with the fewest strings (breadth first, by cost within a hop count) */
        let front = [{ n: at, c: 0, first: null }]; const seen = new Set([at]);
        for (let h = 0; h < X.HOPS && front.length; h++) {
            const next = []; let hit = null;
            front.forEach(f => from(f.n).forEach(e => {
                const c = f.c + cost(e.l, e.aToB), first = f.first || { kind: 'string', i: e.l.i, aToB: e.aToB, to: e.to };
                if (todo.has(e.to)) { if (!hit || c < hit.c) hit = { c, first }; }
                else if (!seen.has(e.to)) next.push({ n: e.to, c, first });
            }));
            if (hit) return hit.first;
            front = [];
            next.sort((p, q) => p.c - q.c).forEach(x => { if (!seen.has(x.n)) { seen.add(x.n); front.push(x); } });
        }
        /* no string reaches one: fly to the nearest bubble still to visit */
        let fb = -1, fd = Infinity; todo.forEach(j => { const d = far ? +far(j) : 0; if (d < fd) { fd = d; fb = j; } });
        return fb >= 0 || todo.size ? { kind: 'fly', to: fb >= 0 ? fb : todo.values().next().value } : null;
    }
    /* the string to hook onto when she is not at a bubble yet (out in the atmosphere): the nearest one leading to a bubble still to visit.
       near(i) = her distance to string i (its closest point). Drifting with the flow preferred, UP times further for going up one. */
    function firstHook(links, left, near) {
        const todo = left instanceof Set ? left : new Set(left || []); let best = null;
        (links || []).forEach(l => {
            const d = near ? +near(l.i) : 0; if (!isFinite(d)) return;
            [[true, l.b], [false, l.a]].forEach(([aToB, to]) => { if (!todo.has(to)) return; const c = d * ((aToB ? l.dir : -l.dir) < 0 ? X.UP : 1); if (!best || c < best.c) best = { c, leg: { kind: 'string', i: l.i, aToB, to } }; });
        });
        return best ? best.leg : null;
    }
    /* Round 2 (Oct 19, "Misty and the camera freeze right after a string catches her"): progress along a leg. s = { best, still } (null
       starts a leg), prog = how far she has got (the string point she is at, or minus her distance to where she hooks on), eps = how much
       more counts as progress. still = seconds without progress; past PIN she lets go instead of hanging there for the step's time limit */
    function pin(s, prog, dt, eps) {
        if (!s || !isFinite(s.best)) return { best: +prog, still: 0 };
        if (+prog > s.best + (+eps || 0)) { s.best = +prog; s.still = 0; } else s.still += +dt || 0;
        return s;
    }
    const core = { X, due, after, nextLeg, firstHook, pin };
    const TOUR = { plan: 1, hook: 1, ride: 1, visit: 1, fly: 1 };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (typeof window === 'undefined' || W.LowiMistyExplore) return;

    const E = { ph: '', t: 0, tour: 0, done: false, pts: null, i: 0, aim: -1, si: -1, rode: false, rid: 0, j: 0, line: null, dir: null, log: [],
        left: null, at: null, leg: null, seen: [], tt: 0, hops: 0 };
    function clear(S) { if (S) { S.exOut = false; S.exB = -1; S.exLeave = false; S.exRide = false; S.exSi = -1; S.exUp = false; S.exVisit = -1; } }
    function reset(S) { E.ph = ''; E.t = 0; E.tour = 0; E.pts = null; E.i = 0; E.aim = -1; E.si = -1; E.rode = false; E.rid = 0; E.j = 0; E.line = null; E.left = null; E.at = null; E.leg = null; E.seen = []; E.tt = 0; E.hops = 0; clear(S); }
    function go(S, ph, note) { E.ph = ph; E.t = 0; E.i = 0; E.pin = null; E.log.push(ph); if (E.log.length > 30) E.log.shift(); try { if (note) note('explore ' + ph); } catch (e) { } if (ph === 'home') clear(S); }
    /* steer toward p at strength s (0..1), easing in the last couple of units */
    function toward(S, V, p, s) { V.a.subVectors(p, S.p); const d = V.a.length(); if (d > 1e-4) V.want.copy(V.a).multiplyScalar(Math.min(1, d / 2) * s / d); else V.want.set(0, 0, 0); return d; }
    /* on the string tour she goes round her own world, never back through it (Oct 19 probe: the straight line to the first string
       crossed it, she slipped back in and the tour was over): near it the inward part of where she wants to go is dropped, very near
       it she is eased outward */
    function wide(S, V, reach) {
        if (!V.c) return; V.a.subVectors(S.p, V.c); const d = V.a.length(), R = reach * 1.8; if (d < 1e-4 || d > R) return;
        V.a.multiplyScalar(1 / d); const inward = V.want.dot(V.a); if (inward < 0) V.want.addScaledVector(V.a, -inward);
        if (d < reach * 1.3) V.want.addScaledVector(V.a, 0.6 * (1 - d / (reach * 1.3)));
    }
    function targets(ctx) { try { return W.LowiGalaxyBubbles && W.LowiGalaxyBubbles.targets ? W.LowiGalaxyBubbles.targets(ctx) : null; } catch (e) { return null; } }
    /* the string she is on, in the order she travels it, cached for a second (its points only move as the galaxy turns slowly) */
    function line(ctx, S) { const G = W.LowiGalaxyBubbles; if (!G || !G.strand || !E.leg || E.si < 0) return null; const now = Date.now(); if (!E.line || E.line.si !== E.si || now - E.line.at > 1000) { const st = G.strand(ctx, E.si, E.leg.aToB, S.hs); E.line = st ? Object.assign(st, { si: E.si, at: now }) : null; } return E.line; }
    /* her distance to string i right now (closest of its points) */
    function nearTo(ctx, S, i) { const G = W.LowiGalaxyBubbles, st = G && G.strand ? G.strand(ctx, i, true, S.hs) : null; if (!st) return Infinity; let d = Infinity; for (let k = st.entry; k <= st.end; k++) d = Math.min(d, st.pts[k].distanceTo(S.p)); return d; }
    /* pick the next leg of the string tour and start it */
    function plan(ctx, S, tg, c, note) {
        if (!tg || !S.gx) { go(S, 'home', note); return; }
        if (!E.left) E.left = new Set(tg.bubbles.filter(b => b.far <= X.VIS).map(b => b.i));
        if (E.at != null && E.at >= 0) E.left.delete(E.at);
        const cap = S.trip ? X.TRIP : Infinity;
        if (!E.left.size || E.seen.length >= cap || E.tt > X.TOUR) { go(S, 'home', note); return; }
        const leg = E.at == null ? firstHook(tg.links, E.left, i => nearTo(ctx, S, i)) || nextLeg(-2, tg.links, E.left, j => tg.bubbles[j] ? tg.bubbles[j].p.distanceTo(S.p) : Infinity)
            : nextLeg(E.at, tg.links, E.left, j => tg.bubbles[j] ? tg.bubbles[j].p.distanceTo(S.p) : Infinity);
        if (!leg) { go(S, 'home', note); return; }
        E.leg = leg; E.line = null; S.exVisit = -1;
        if (leg.kind === 'fly') { E.aim = leg.to; S.exSi = -1; S.exUp = false; go(S, 'fly', note); return; }
        E.si = leg.i; const st = line(ctx, S); if (!st) { E.left.delete(leg.to); E.at = null; go(S, 'plan', note); return; }
        /* from a bubble she starts where the string leaves it; out in the open she joins it at its nearest point */
        E.j = st.entry; if (E.at == null) { let bd = Infinity; for (let k = st.entry; k <= st.end; k++) { const d = st.pts[k].distanceTo(S.p); if (d < bd) { bd = d; E.j = k; } } }
        S.exSi = leg.i; S.exUp = !!st.up; S.exB = -1; S.exRide = false;
        go(S, 'hook', note);
    }
    /* a leg that could not finish in time: skip that bubble and plan again from wherever she is (never stuck, never a loop) */
    function skip(S, note) { if (E.leg && E.left) E.left.delete(E.leg.to); E.at = null; S.exSi = -1; S.exUp = false; go(S, 'plan', note); }
    /* just off a bubble's membrane for her size (galaxy-bubbles core.rest); the old r * 1.06 + 2 without that file */
    function rest(r, hs) { const G = W.LowiGalaxyBubbles; return G && G.core && G.core.rest ? G.core.rest(r, hs) : (+r || 10) * 1.06 + 2; }
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
                E.left = null; E.at = null; E.leg = null; E.seen = []; E.tt = 0;
                S.exOut = true; go(S, 'edge', note);
            }
        }
        E.t += dt; if (TOUR[E.ph]) E.tt += dt;
        if (E.ph !== 'home' && E.t > (X.LIM[E.ph] || 40)) { if (TOUR[E.ph] && E.ph !== 'plan') skip(S, note); else go(S, 'home', note); }
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
                const p = E.pts && E.pts[E.i]; if (!p) { go(S, after('atmos', c), note); break; }
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
                if (!tg || tg.inside !== E.aim) { E.aim = -1; S.exB = -1; go(S, after('leave', c), note); break; }
                if (toward(S, V, E.pts[E.i % E.pts.length], 0.6) < 1.5) E.i++;
                if (E.t > X.STAY) { S.exLeave = true; go(S, 'leave', note); }
                return true;
            }
            case 'leave': {
                S.exLeave = true;
                if (!tg || tg.inside < 0) { S.exB = -1; S.exLeave = false; E.aim = -1; go(S, after('leave', c), note); break; }
                const b = tg.bubbles[tg.inside]; if (b) { V.a.subVectors(S.p, b.p); V.want.copy(V.a).multiplyScalar(0.8 / Math.max(V.a.length(), 1e-4)); }
                return true;
            }
            case 'plan': { plan(ctx, S, tg, c, note); break; }
            case 'hook': {
                const st = line(ctx, S); if (!st || !S.gx) { go(S, 'home', note); break; }
                S.exSi = E.si; S.exUp = !!st.up;
                /* swim to where she joins the string; it holds her once she is within reach of it */
                E.d = toward(S, V, st.pts[E.j], 1); wide(S, V, reach);
                if (E.d < 2.5 || (tg && tg.riding === E.si && E.d < 6)) { E.hops++; go(S, 'ride', note); }
                /* not getting any closer (a membrane in the way): give this leg up after a few seconds, not the 60 s limit */
                else { E.pin = pin(E.pin, -E.d, dt, 0.5); if (E.pin.still > X.PIN * 2) { try { note('explore pinned hook'); } catch (e) { } skip(S, note); } }
                return true;
            }
            case 'ride': {
                const st = line(ctx, S); if (!st || !S.gx) { go(S, 'home', note); break; }
                S.exSi = E.si; S.exUp = !!st.up; E.rode = true; if (tg && tg.riding === E.si) E.rid = Math.max(E.rid, E.t);
                /* follow the string a little ahead of where she is: with its flow it does most of the work, up it she swims */
                let bj = E.j, bd = 1e9; for (let j = Math.max(st.entry, bj - 2); j <= Math.min(st.end, bj + 8); j++) { const d = st.pts[j].distanceTo(S.p); if (d < bd) { bd = d; bj = j; } }
                E.j = Math.max(E.j, bj);
                const ahead = Math.min(st.end, E.j + 2); toward(S, V, st.pts[ahead], bd > 2.5 ? 0.75 : st.up ? 0.8 : X.RIDE);
                const tb = tg && tg.bubbles[st.to], atB = tb ? tb.p.distanceTo(S.p) < rest(tb.r, S.hs) + 6 : st.pts[st.end].distanceTo(S.p) < 6;
                /* round 2: no progress along the string for PIN seconds (the far membrane pushing her back): at the bubble that is arriving,
                   anywhere else she lets go of this leg; never the frozen minute the probe caught */
                E.pin = pin(E.pin, E.j, dt); const pinned = E.pin.still > X.PIN;
                if (pinned && !atB) { try { note('explore pinned ride'); } catch (e) { } skip(S, note); break; }
                if ((E.j >= st.end - 2 || pinned) && atB) {
                    S.exSi = -1; S.exUp = false; E.at = st.to;
                    if (E.left && E.left.has(st.to)) { E.seen.push(st.to); E.left.delete(st.to); E.pts = null; go(S, 'visit', note); } else go(S, 'plan', note);
                }
                return true;
            }
            case 'visit': {
                const b = tg && tg.bubbles[E.at]; if (!b || !S.gx) { go(S, b ? 'home' : 'plan', note); break; }
                S.exVisit = E.at; S.exSi = -1;
                /* a slow swim part way round its membrane, just off the glass (the membrane slides her round; she is never pulled in) */
                if (!E.pts) { const o = S.p.clone().sub(b.p).normalize(), t = o.clone().cross(V.rt).normalize(); if (t.lengthSq() < 0.5) t.set(0, 1, 0); E.pts = [o, t]; }
                const ang = Math.min(1, E.t / X.LOOK) * 0.9, o = E.pts[0].clone().multiplyScalar(Math.cos(ang)).addScaledVector(E.pts[1], Math.sin(ang));
                toward(S, V, o.multiplyScalar(rest(b.r, S.hs) + 0.5).add(b.p), 0.55);
                if (E.t > X.LOOK) { S.exVisit = -1; go(S, 'plan', note); }
                return true;
            }
            case 'fly': {
                const b = tg && tg.bubbles[E.aim]; if (!b || !S.gx) { go(S, 'home', note); break; }
                S.exSi = -1; S.exB = -1;
                V.a.subVectors(S.p, b.p); const L = V.a.length() || 1;
                E.d = toward(S, V, V.a.multiplyScalar((rest(b.r, S.hs) + 0.5) / L).add(b.p), 1); wide(S, V, reach); if (E.d < X.NEAR * 1.5) { E.at = E.aim; E.seen.push(E.aim); E.left.delete(E.aim); E.pts = null; go(S, 'visit', note); }
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
    function state() { return { d: +(E.d || 0).toFixed(1), left: E.left ? E.left.size : null, seen: E.seen.slice(), at: E.at, tt: +E.tt.toFixed(1), hops: E.hops, up: !!(E.line && E.line.up), ph: E.ph, t: +E.t.toFixed(1), tour: +E.tour.toFixed(1), aim: E.aim, si: E.si, rode: E.rode, rid: +E.rid.toFixed(1), j: E.j, d: E.d == null ? null : +(+E.d).toFixed(1), n: E.line ? [E.line.entry, E.line.end, E.line.pts.length] : null, log: E.log.slice(-12) }; }
    W.LowiMistyExplore = { core, want, reset, off, state, X };
})();
