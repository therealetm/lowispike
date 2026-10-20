'use strict';
/* Oct 20, 2026 (E-man, zoomed out on his iPhone): "the planets that looked random, at one angle, actually looks like a hexagon ...
   we should definitely lock that in and make it purposeful". The six glowing places keep their scattered close-up layout and settle
   into a true regular hexagon around Misty as the camera pulls back to the World Map and beyond. Nothing is drawn on top. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'body-world-3d-scene.js'), 'utf8');
const grab = name => {
    const at = src.indexOf('export function ' + name + '(');
    assert.ok(at >= 0, name + ' is exported from the scene');
    let i = src.indexOf('{', at), depth = 0;
    for (; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}' && --depth === 0) break; }
    return new Function('return (' + src.slice(at + 7, i + 1) + ')')();
};
const placeAt = grab('placeAt'), hexagonK = grab('hexagonK');
const legacy = (i, n) => { const a = (i / n) * Math.PI * 2 + 0.4, el = (i % 2 ? 0.35 : -0.25), r = 7.2; return { x: Math.sin(a) * Math.cos(el) * r, y: Math.sin(el) * r * 0.8, z: Math.cos(a) * Math.cos(el) * r }; };
const d3 = (p, q) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
/* orthographic view of the orbit camera (yaw around Misty, pitch looking down): screen x/y of a world point */
const view = (p, yaw, pitch) => {
    const rx = Math.cos(yaw), rz = -Math.sin(yaw); /* camera right */
    const fx = -Math.sin(yaw) * Math.cos(pitch), fy = -Math.sin(pitch), fz = -Math.cos(yaw) * Math.cos(pitch); /* looking at Misty */
    const ux = rz * fy - 0 * fz, uy = 0 * fx - rx * fz, uz = rx * fy - rz * fx; /* up = right x forward, sign aside */
    return { x: p.x * rx + p.z * rz, y: p.x * ux + p.y * uy + p.z * uz };
};
/* how far a six-point outline is from a (tilted) regular hexagon: opposite corners mirror through one centre, sides pair up */
const hexError = pts => {
    const c = pts.reduce((s, p) => ({ x: s.x + p.x / 6, y: s.y + p.y / 6 }), { x: 0, y: 0 });
    const size = Math.max(...pts.map(p => Math.hypot(p.x - c.x, p.y - c.y)));
    let e = 0;
    for (let i = 0; i < 3; i++) { const p = pts[i], q = pts[i + 3]; e = Math.max(e, Math.hypot(p.x + q.x - 2 * c.x, p.y + q.y - 2 * c.y) / size); }
    for (let i = 0; i < 6; i++) { const p = pts[i], q = pts[(i + 1) % 6], r = pts[(i + 2) % 6]; /* each side parallel to the one across, same length */
        const s1 = { x: q.x - p.x, y: q.y - p.y }, o = pts[(i + 3) % 6], o2 = pts[(i + 4) % 6], s2 = { x: o2.x - o.x, y: o2.y - o.y };
        e = Math.max(e, Math.hypot(s1.x + s2.x, s1.y + s2.y) / size);
        /* and the corners step evenly around: in any view of a regular hexagon, corner i+1 = corner i + corner i+2 (from the centre) */
        e = Math.max(e, Math.hypot((q.x - c.x) - (p.x - c.x) - (r.x - c.x), (q.y - c.y) - (p.y - c.y) - (r.y - c.y)) / size); }
    return e;
};

test('close up, the six places are exactly where they always were (the organic galaxy is untouched)', () => {
    for (let i = 0; i < 6; i++) assert.ok(d3(placeAt(i, 6, 0), legacy(i, 6)) < 1e-12, 'place ' + i);
    for (let i = 0; i < 6; i++) assert.ok(d3(placeAt(i, 6, -3), legacy(i, 6)) < 1e-12, 'clamped below 0');
    /* and up close they are NOT a flat ring: alternately raised and lowered by over 3 units */
    const ys = [0, 1, 2, 3, 4, 5].map(i => placeAt(i, 6, 0).y);
    assert.ok(Math.max(...ys) - Math.min(...ys) > 3);
});

test('zoomed out, the same six real planets form a true regular hexagon centred on Misty', () => {
    const P = [0, 1, 2, 3, 4, 5].map(i => placeAt(i, 6, 1));
    const y = P[0].y, reach = Math.hypot(P[0].x, P[0].z);
    for (const p of P) { assert.ok(Math.abs(p.y - y) < 1e-12, 'one plane'); assert.ok(Math.abs(Math.hypot(p.x, p.z) - reach) < 1e-12, 'one reach'); }
    const side = d3(P[0], P[1]);
    for (let i = 0; i < 6; i++) assert.ok(Math.abs(d3(P[i], P[(i + 1) % 6]) - side) < 1e-9, 'equal sides');
    assert.ok(Math.abs(side - reach) < 1e-9, 'regular hexagon: side = circumradius');
    const cx = P.reduce((s, p) => s + p.x, 0) / 6, cz = P.reduce((s, p) => s + p.z, 0) / 6;
    assert.ok(Math.abs(cx) < 1e-9 && Math.abs(cz) < 1e-9, 'centred on Misty');
    assert.ok(Math.abs(y) < 0.5, 'at Misty\'s height (the average of where they were)');
    assert.ok(reach > 6.7 && reach < 7.0, 'about the same distance from Misty as before');
});

test('the glide is short and smooth: no planet travels more than ~1.7 units, and never jumps', () => {
    for (let i = 0; i < 6; i++) {
        assert.ok(d3(placeAt(i, 6, 0), placeAt(i, 6, 1)) < 1.75, 'place ' + i + ' moves a little, never across the sky');
        let prev = placeAt(i, 6, 0);
        for (let s = 1; s <= 50; s++) { const p = placeAt(i, 6, s / 50); assert.ok(d3(p, prev) < 0.05); prev = p; }
    }
});

test('from the zoomed-out camera the outline reads as a hexagon at every angle; the old layout was only almost one', () => {
    const ring = k => yaw => pitch => [0, 1, 2, 3, 4, 5].map(i => view(placeAt(i, 6, k), yaw, pitch));
    let worstNew = 0, worstOld = 0;
    for (const pitch of [0.42, 0.7, 1.1]) for (let y = 0; y < 72; y++) {
        const yaw = y / 72 * Math.PI * 2;
        worstNew = Math.max(worstNew, hexError(ring(1)(yaw)(pitch)));
        worstOld = Math.max(worstOld, hexError(ring(0)(yaw)(pitch)));
    }
    assert.ok(worstNew < 1e-9, 'zoomed out: a true (tilted) hexagon from the World Map view and from looking down, whatever the spin');
    assert.ok(worstOld > 0.2, 'the scattered layout was visibly off (' + worstOld.toFixed(2) + ')');
});

test('the hexagon only appears as you zoom out: none at Home\'s resting view or closer, complete from the World Map out', () => {
    for (const homeDist of [4, 6, 8, 10, 12]) {
        const rest = homeDist * 1.4, maxD = Math.max(14, homeDist * 2.5);
        for (const d of [2.4, rest * 0.5, rest]) assert.equal(hexagonK(d, rest, maxD), 0, 'close-up stays organic (' + homeDist + ')');
        for (const d of [maxD, maxD * 2, 300]) assert.equal(hexagonK(d, rest, maxD), 1, 'zoomed out: the hexagon (' + homeDist + ')');
        let prev = 0;
        for (let s = 0; s <= 200; s++) { const d = rest + (maxD - rest) * s / 200, k = hexagonK(d, rest, maxD); assert.ok(k >= prev && k - prev < 0.04); prev = k; }
    }
});

test('wiring: the beacon, its name and its world move together, hold still in flight, and nothing is drawn on top', () => {
    assert.ok(/const p0 = placeAt\(i, places\.length, 0\);/.test(src), 'the beacons are built from placeAt(…, 0)');
    assert.ok(/cosmosStep\(t, dt\);\s*hexStep\(dt\);/.test(src), 'hexStep runs every frame next to the cosmos step');
    const step = src.slice(src.indexOf('function hexStep('), src.indexOf('const frameFns'));
    assert.ok(/b\.g\.position\.set\(q\.x, q\.y, q\.z\); b\.pos\.set\(q\.x, q\.y, q\.z\); regions\[i\]\.pos\.set\(q\.x, q\.y, q\.z\);/.test(step));
    assert.ok(/reduceMq && reduceMq\.matches/.test(step), 'reduced motion: no glide, they are simply there');
    const hold = src.slice(src.indexOf('const hexHold'), src.indexOf('function hexStep('));
    assert.ok(/rig\.fly/.test(hold) && /rig\.mode !== 'home'/.test(hold));
    for (const c of ['bwr-warping', 'mf-transit', 'mf-on', 'mf-in', 'mf-galaxy', 'wh-away']) assert.ok(hold.includes(c), 'holds during ' + c);
    const block = src.slice(src.indexOf('export function placeAt('), src.indexOf('export function createWorld(')) + hold + step;
    assert.ok(!/Line|Shape|EdgesGeometry|new THREE/.test(block), 'no outline, no lines, no new meshes: only the real planets move');
});
