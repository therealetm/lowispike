'use strict';
/* Oct 19 2026 (Emmanuel, on his iPhone): "when Misty's on autopilot she gets sucked into the outer spirit world bubbles ... the bubble
   pulled her in twice and then it crashed and started from the beginning". Then: "she should hook onto the visible strings and drift
   along them from bubble galaxy to bubble galaxy, changing strings; only when no string connects to the next visible bubble should she
   fly on her own, then go back to the strings. She should visit each visible bubble."
   Reproduced in Chromium (tools/autopilot-probe.cjs, build 20261019-064609): in bubble 30, out, a current for 0.2 s, then straight back
   into bubble 30. The phone's restart itself is not reproducible on a desktop engine (no errors, no reload, no GPU growth in the probe). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const X = require(path.join(ROOT, 'misty-explore.js'));
const B = require(path.join(ROOT, 'galaxy-bubbles.js'));
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* a little spirit world: her own world (-1), bubbles 0..4. 0-1 flows 0 to 1, 1-2 flows 2 to 1 (up it from 1), -1 to 0 flows out,
   3 has no string at all, 4 is two strings away from 0 through 1 */
const L = [
    { i: 0, a: -1, b: 0, dir: 1, len: 60 },
    { i: 1, a: 0, b: 1, dir: 1, len: 80 },
    { i: 2, a: 2, b: 1, dir: 1, len: 70 },
    { i: 3, a: 1, b: 4, dir: -1, len: 50 },
    { i: 4, a: 0, b: 2, dir: -1, len: 75 }
];
const far = { 0: 90, 1: 150, 2: 120, 3: 200, 4: 230 };

test('string tour: from a bubble she takes a string straight to a bubble she has not seen, drifting with the flow first', () => {
    /* from 0: 1 (with the flow, 80) and 2 (up string 4: 75 x 2.5) are both direct; with the flow wins */
    assert.deepStrictEqual(X.nextLeg(0, L, new Set([1, 2]), j => far[j]), { kind: 'string', i: 1, aToB: true, to: 1 });
    /* only 2 left: up string 4 against its flow is still a string, never a flight */
    assert.deepStrictEqual(X.nextLeg(0, L, new Set([2]), j => far[j]), { kind: 'string', i: 4, aToB: true, to: 2 });
});

test('string tour: she changes strings through bubbles she has already seen to reach the next one', () => {
    /* 4 hangs off 1 only: from 0 she first takes string 1 to bubble 1 (seen), then string 3 */
    const leg = X.nextLeg(0, L, new Set([4]), j => far[j]);
    assert.deepStrictEqual(leg, { kind: 'string', i: 1, aToB: true, to: 1 });
    assert.deepStrictEqual(X.nextLeg(1, L, new Set([4]), j => far[j]), { kind: 'string', i: 3, aToB: true, to: 4 });
});

test('string tour: she flies on her own only when no string reaches a bubble still to visit, and stops when all are seen', () => {
    assert.deepStrictEqual(X.nextLeg(0, L, new Set([3]), j => far[j]), { kind: 'fly', to: 3 });
    assert.deepStrictEqual(X.nextLeg(1, L, [3, 4], j => far[j]), { kind: 'string', i: 3, aToB: true, to: 4 });
    assert.strictEqual(X.nextLeg(2, L, new Set(), j => far[j]), null);
    /* more strings in a row than HOPS allows is a flight, not an endless chain */
    const chain = []; for (let k = 0; k < 6; k++) chain.push({ i: k, a: k - 1, b: k, dir: 1, len: 10 });
    assert.deepStrictEqual(X.nextLeg(-1, chain, new Set([5]), () => 1), { kind: 'fly', to: 5 });
    assert.deepStrictEqual(X.nextLeg(-1, chain, new Set([2]), () => 1), { kind: 'string', i: 0, aToB: true, to: 0 });
});

test('string tour: out in the open she hooks onto the nearest string that leads to a bubble still to visit', () => {
    const near = { 0: 40, 1: 12, 2: 30, 3: 90, 4: 20 };
    /* string 1 is nearest; both its ends unseen, so she goes with its flow (to 1) */
    assert.deepStrictEqual(X.firstHook(L, new Set([0, 1, 2, 3, 4]), i => near[i]), { kind: 'string', i: 1, aToB: true, to: 1 });
    /* string 1 leads only to 0 against its flow (12 x 2.5 = 30) vs string 4 with its flow to 0 (20): string 4 */
    assert.deepStrictEqual(X.firstHook(L, new Set([0]), i => near[i]), { kind: 'string', i: 4, aToB: false, to: 0 });
    assert.strictEqual(X.firstHook(L, new Set([3]), i => near[i]), null);
});

test('string tour: on any spirit world it visits every bubble and never loops (planner walked to the end)', () => {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let run = 0; run < 40; run++) {
        const n = 4 + Math.floor(rnd() * 16), links = [];
        for (let j = 0; j < n; j++) { const k = Math.floor(rnd() * (n + 1)) - 1; if (k !== j && rnd() < 0.8) links.push({ i: links.length, a: j, b: k, dir: rnd() < 0.5 ? 1 : -1, len: 20 + rnd() * 200 }); }
        const left = new Set(Array.from({ length: n }, (_, j) => j)); let at = -1, legs = 0, flights = 0;
        while (left.size && legs < 10 * n) {
            const leg = X.nextLeg(at, links, left, j => j + 1); assert.ok(leg, 'a leg while bubbles are left');
            if (leg.kind === 'string') { const l = links[leg.i]; assert.ok(l.a === at || l.b === at, 'a string starts where she is'); assert.strictEqual(leg.to, leg.aToB ? l.b : l.a); }
            else flights++;
            at = leg.to; left.delete(at); legs++;
        }
        assert.strictEqual(left.size, 0, 'every bubble visited, run ' + run);
        assert.ok(flights <= n);
    }
});

test('which bubble each end of a string sits on (ends sit just inside a membrane; none = her own world)', () => {
    const ws = [{ x: 100, y: 0, z: 0, r: 20 }, { x: 0, y: 200, z: 0, r: 30 }];
    assert.strictEqual(B.endOf(100 - 19.6, 0, 0, ws), 0);
    assert.strictEqual(B.endOf(0, 200 - 29.4, 0, ws), 1);
    assert.strictEqual(B.endOf(45, 0, 0, ws), -1);
});

test('going up a string against its flow: it holds her to it but does not carry her either way', () => {
    const line = (() => { const a = new Float32Array(40 * 3); for (let k = 0; k < 40; k++) a[k * 3] = 100 * k / 39; return a; })();
    const h = B.nearestOnPath(line, 50, 3, 0), up = B.currentAt(h, 0, 10, 10, 50, 3, 0), w = B.currentAt(h, 1, 10, 10, 50, 3, 0);
    assert.ok(Math.abs(up.x) < 1e-9, 'no carry along it');
    assert.ok(up.y < 0, 'still drawn to the string');
    assert.ok(w.x > 0, 'with the flow it carries her');
});

/* Round 2 (Oct 19): "Misty and the camera freeze right after a string catches her", about 3 runs in 10 in the probe. Captured: always
   string 11 of the default spirit world, going up it, stuck at point 23 of 40 for 50 to 80 s until the 60 s ride limit skipped it.
   That string joins bubbles 5 and 30 (both r 23) whose glass is only about 16 apart, and out there Misty is big (hs 15.2). The
   membrane slides her round at r * 1.04 + hs * 0.4 (glass + 7), but the string's last point was picked at r * 1.06 + 2 (glass + 3.4),
   ignoring her size: the point she had to reach to finish sat inside the far bubble's push, so every frame it pushed her back. */
const R23 = 23, HS = 15.2;
const strandPts = gap => { const a = { x: 0, y: 0, z: 0, r: R23 }, b = { x: 2 * R23 + gap, y: 0, z: 0, r: R23 }, pts = [];
    for (let k = 0; k < 40; k++) { const x = R23 * 0.98 + (b.x - 2 * R23 * 0.98) * k / 39; pts.push({ x, y: 120, z: 0 }); }
    return { pts, worlds: [{ x: a.x, y: 120, z: a.z, r: a.r }, { x: b.x, y: 120, z: b.z, r: b.r }] }; };
const gapOf = (q, w) => Math.hypot(q.x - w.x, q.y - w.y, q.z - w.z);

test('string tour: every point of a string she is sent along is one she can reach (her size counts, not only the glass)', () => {
    assert.strictEqual(typeof B.span, 'function', 'galaxy-bubbles core.span picks the reachable part of a string');
    assert.strictEqual(typeof B.slide, 'function', 'galaxy-bubbles core.slide is the membrane radius for her size');
    /* the membrane radius the collision uses */
    assert.ok(Math.abs(B.slide(R23, HS) - (R23 * 1.04 + HS * 0.4)) < 1e-9);
    for (const gap of [16, 30, 80, 200]) {
        const { pts, worlds } = strandPts(gap), sp = B.span(pts, worlds, HS);
        assert.ok(sp.entry >= 0 && sp.end >= sp.entry && sp.end < pts.length, 'span inside the string, gap ' + gap);
        if (sp.clear) for (let k = sp.entry; k <= sp.end; k++) worlds.forEach(w => assert.ok(gapOf(pts[k], w) > B.slide(w.r, HS) + 1, `point ${k} is off the push of a membrane, gap ${gap}`));
    }
    /* a gap narrower than she is: no point is clear of both, so the span is the one point with the most room (she is already there) */
    const narrow = B.span(strandPts(16).pts, strandPts(16).worlds, HS);
    assert.strictEqual(narrow.clear, false); assert.strictEqual(narrow.entry, narrow.end);
    assert.ok(Math.abs(narrow.entry - 19.5) <= 1, 'the middle of the gap');
    /* a wide gap: a long ride, clear at both ends, and small Misty still gets most of it */
    const wide = B.span(strandPts(200).pts, strandPts(200).worlds, HS); assert.ok(wide.clear && wide.end - wide.entry > 25);
    const small = B.span(strandPts(200).pts, strandPts(200).worlds, 1); assert.ok(small.end - small.entry > wide.end - wide.entry);
});

test('string tour: pinned on a string (no progress) she lets go within PIN seconds instead of hanging there for the 60 s limit', () => {
    assert.strictEqual(typeof X.pin, 'function', 'misty-explore core.pin tracks progress along a leg');
    assert.ok(X.X.PIN > 0 && X.X.PIN <= 4);
    /* the captured freeze: stuck at point 23 at 30 frames a second */
    let s = null, t = 0, out = 0; while (t < 60) { s = X.pin(s, 23, 1 / 30); t += 1 / 30; if (s.still > X.X.PIN) { out = t; break; } }
    assert.ok(out > 0 && out <= X.X.PIN + 0.1, 'let go after ' + out.toFixed(2) + ' s');
    /* a slow but real ride (a point every 2 s, up a string against the flow) is never cut short */
    s = null; t = 0; let j = 10; while (t < 40) { s = X.pin(s, j, 1 / 30); t += 1 / 30; if (Math.abs(t % 2) < 1 / 30) j++; assert.ok(s.still <= X.X.PIN, 'slow ride kept at ' + t.toFixed(1)); }
    /* a new leg starts fresh */
    assert.strictEqual(X.pin(null, 5, 0.1).still, 0);
});

test('wired in: the ride, the hook, the visit and the flight all use her size, and a pinned leg ends', () => {
    const g = read('galaxy-bubbles.js'), e = read('misty-explore.js');
    /* the collision and the strand use the same membrane radius */
    assert.match(g, /const o = B\.others\[i\], r = o\.userData\.r, rr = slide\(r, hs\);/);
    assert.match(g, /function strand\(ctx, i, aToB, hs\)/);
    assert.match(g, /span\(pts, ws, hs\)/);
    assert.match(e, /G\.strand\(ctx, E\.si, E\.leg\.aToB, hsOf\(S\)\)/); /* hsOf(S): her size, galaxy-scale while the Ant-Man POV camera is in (string-pov) */
    const ride = e.slice(e.indexOf("case 'ride':"), e.indexOf("case 'visit':"));
    assert.match(ride, /E\.pin = pin\(E\.pin, E\.j, dt\)/);
    assert.match(ride, /E\.pin\.still > X\.PIN/);
    const hook = e.slice(e.indexOf("case 'hook':"), e.indexOf("case 'ride':"));
    assert.match(hook, /E\.pin\.still > X\.PIN \* 2/);
    /* finishing at a bubble, visiting it and flying to it: just off its membrane for her size */
    assert.match(ride, /atB = tb \? tb\.p\.distanceTo\(S\.p\) < rest\(tb\.r, hsOf\(S\)\) \+ 6/);
    assert.match(e.slice(e.indexOf("case 'visit':"), e.indexOf("case 'home':")), /rest\(b\.r, hsOf\(S\)\)/);
});

test('wired in: one hooked string holds her, a crossing one never snatches her, and the tour never pulls her into a bubble', () => {
    const g = read('galaxy-bubbles.js'), e = read('misty-explore.js');
    assert.match(g, /if \(hook >= 0 && i !== hook\) continue;/);
    assert.match(g, /hook >= 0 && S\.exUp \? 0 : best\.pa\.dir/);
    /* the same bubble cannot take her in again for GB.COOL seconds after she left it (the double dip before the restart) */
    assert.match(g, /const cool = !drive && i === B\.outI && performance\.now\(\) - B\.outT < GB\.COOL \* 1000;/);
    assert.ok(B.GB.COOL >= 5);
    /* the tour steps never aim her at a bubble to go in (S.exB stays -1) */
    const tour = e.slice(e.indexOf("case 'plan':"), e.indexOf("case 'home':"));
    assert.ok(tour.length > 500);
    assert.doesNotMatch(tour, /S\.exB = (?!-1)/);
    assert.match(tour, /S\.exB = -1/);
    /* a leg that runs out of time skips that bubble instead of starting over (never stuck, never a loop) */
    assert.match(e, /if \(TOUR\[E\.ph\] && E\.ph !== 'plan'\) skip\(S, note\)/);
    /* every bubble in the near ring counts as visible; a timed adventure visits a few, autopilot all of them */
    assert.ok(X.X.VIS >= 250 && X.X.TRIP >= 2 && X.X.TOUR >= 300);
});
