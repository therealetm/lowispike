// Oct 18, 2026 (E-man, voice note): "When my companion enters the world I love the animation, but when it exits the world I don't
// like the animation, cuz all of a sudden she just spawns out with the camera being zoomed out. I want to see the same animation but
// the reverse ... we start almost blended by that world's color because we're so zoomed in, and then we see it. The worlds have
// rings, so just like a planet that has a ring when you're so close to it, that perspective."
// Leaving a place is now the fly-in played backwards: the inside is copied (a real frame, as before, so no blank or made-up screen
// can show), and under it the camera already sits right at the world's own glowing core, inside its ring, so the screen is that
// world's colour. Then the camera pulls back through the ring band (slow there, the huge close-up ring) to the outside view of that
// world, while Misty rises out of it through the rings and ends up above it, outside. These tests fail on the Oct 17 cut, which put
// the camera straight on the zoomed-out view.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const R = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const regions = R('body-world-regions.js');
const flight = R('misty-flight.js');
const RG = require(path.join(ROOT, 'body-world-regions.js'));
const MF = require(path.join(ROOT, 'misty-flight.js'));

function fnSrc(src, sig) {
  const i = src.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } }
  throw new Error('unclosed ' + sig);
}

/* the beacon a world is drawn as in the bloodstream (body-world-3d-scene.js): core sphere r 0.32, ring r 0.62 (x1..1.3 when tended) */
const CORE_R = 0.32, RING_R = 0.62;

test('the pull-back starts inside the ring, right at the core: the screen is the world\'s own colour', () => {
  const P = RG.PULL;
  assert.ok(P && P.s0 > CORE_R + 0.1 && P.s0 < RING_R, 'start distance between the core and the ring: ' + (P && P.s0));
  // 55 degree lens on a 390x844 screen: the core covers the whole picture from there
  const halfV = 27.5 * Math.PI / 180;
  assert.ok(Math.asin(CORE_R / P.s0) > halfV, 'the core fills the screen at the start');
  assert.ok(P.near >= 4 && P.near <= 6.5, 'ends on the outside view of that world (planet-size on screen), not the zoomed-out whole world');
  assert.ok(P.ms >= 1400 && P.ms <= 2200, 'long enough to see the rings, short enough not to drag: ' + P.ms);
});

test('backAt: continuous, only ever pulling back, slow through the ring band, settling softly at the end', () => {
  const s0 = RG.PULL.s0, s1 = RG.PULL.near, N = 400;
  assert.ok(Math.abs(RG.backAt(0, s0, s1) - s0) < 1e-9 && Math.abs(RG.backAt(1, s0, s1) - s1) < 1e-9);
  let prev = s0, inBand = 0;
  for (let i = 1; i <= N; i++) {
    const d = RG.backAt(i / N, s0, s1);
    assert.ok(d >= prev - 1e-12, 'never pushes back in at k=' + i / N);
    assert.ok(d - prev < (s1 - s0) * 0.02, 'no jump at k=' + i / N);
    if (d < RING_R * 1.3 * 1.6) inBand++;
    prev = d;
  }
  assert.ok(inBand / N >= 0.25, 'a good part of the move is spent in the ring band: ' + inBand / N);
  assert.ok(s1 - RG.backAt(0.97, s0, s1) < 0.05 * s1, 'eases into the end (no snap when the free camera takes over)');
  assert.strictEqual(RG.backAt(-1, s0, s1), s0); assert.strictEqual(RG.backAt(2, s0, s1), s1);
});

/* run the way out with stand-ins: what happens in which order, frame by frame */
function runOut(opts) {
  const log = [];
  const mkCanvas = (tag) => {
    const cls = new Set();
    return { tag, width: 390, height: 844, style: {}, attrs: {}, classList: { add: c => { cls.add(c); log.push('class ' + c); }, contains: c => cls.has(c) },
      setAttribute(k, v) { this.attrs[k] = v; }, getContext: () => ({ drawImage: (src) => log.push('copy ' + src.tag) }), getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }),
      remove() { log.push('remove ' + tag); }, parentNode: null };
  };
  const glCanvas = mkCanvas('gl');
  const host = { insertBefore(e) { log.push('insert ' + e.className); }, appendChild(e) { log.push('append ' + e.className); } };
  const V = (x, y, z) => ({ x, y, z, copy(o) { this.x = o.x; this.y = o.y; this.z = o.z; return this; }, clone() { return V(this.x, this.y, this.z); },
    lerp(o, k) { this.x += (o.x - this.x) * k; this.y += (o.y - this.y) * k; this.z += (o.z - this.z) * k; return this; } });
  const rig = { fly: null, flyYaw: null, vy: 1, vp: 1, idle: 3, target: V(5, 0, 5), dist: 9, yaw: 0.3, pitch: 0.1, maxD: 26, gy: 0, gp: 0, mode: opts.mode || 'home' };
  const cam = { position: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, lookAt(t) { this.at = [t.x, t.y, t.z]; }, updateMatrixWorld() { } };
  const a = { rig, renderer: { domElement: glCanvas, render: () => log.push('render ' + (ctx.st.cur)) }, scene: {}, camera: cam,
    flyTo: (id) => { log.push('flyTo ' + id); rig.fly = { to: { t: V(0, 0, 0), d: 6.5 } }; } };
  const ctx = {
    Math, setTimeout: (f) => { log.push('timer'); f(); },
    D: { createElement: () => mkCanvas('snap') },
    st: { host, veil: null, snap: null, cur: 'heart', ownFly: false },
    reduced: () => false, enter: (id) => { log.push('enter ' + id); ctx.st.cur = id; }, finish: () => log.push('finish'),
    veil: () => log.push('VEIL'), out: {}
  };
  vm.createContext(ctx);
  const src = ['const smooth = ' + regions.match(/const smooth = (\([^\n]*\});/)[1] + ';',
    'const SEAM = ' + regions.match(/const SEAM = (\{[^}]*\});/)[1] + ';',
    'const PULL = ' + regions.match(/const PULL = (\{[^}]*\});/)[1] + ';', fnSrc(regions, 'function backAt('),
    fnSrc(regions, 'function camFromRig(r, cam)'), fnSrc(regions, 'function snapNow(a)'), fnSrc(regions, 'function snapDrop(now)'), fnSrc(regions, 'function seamStep(q, w, a, now)'),
    'out.seamStep = seamStep; out.PULL = PULL;'].join('\n');
  vm.runInContext(src, ctx);
  const B = V(4, 1, 6);
  const q = { phase: 'cut', seam: true, rev: true, wide: !!opts.wide, B, clock: 0 };
  const w = { camera: cam };
  const fromB = () => Math.hypot(cam.position.x - B.x, cam.position.y - B.y, cam.position.z - B.z);
  return { log, q, rig, cam, ctx, B, fromB, step: (now) => ctx.out.seamStep(q, w, a, now), PULL: ctx.out.PULL };
}

test('frame 1: the inside is drawn and copied, the place goes, and under the copy the camera is right at that world, facing it', () => {
  const t = runOut({});
  t.step(16);
  const L = t.log;
  const iR = L.indexOf('render heart'), iC = L.indexOf('copy gl'), iE = L.indexOf('enter hub');
  assert.ok(iR >= 0 && iC > iR && iE > iC, 'render inside -> copy -> leave: ' + L.join(' | '));
  assert.ok(L.includes('insert bwr-snap') || L.includes('append bwr-snap'), 'the copy of the inside is on screen (never a blank frame)');
  assert.ok(!L.includes('VEIL'), 'no flat colour wash: the colour is the world itself, seen from very close');
  // not the zoomed-out view any more: the camera is at the world's core, looking at it from the outside it came in from
  assert.ok(Math.abs(t.fromB() - t.PULL.s0) < 1e-6, 'camera right at the world: ' + t.fromB());
  assert.deepStrictEqual(t.cam.at, [t.B.x, t.B.y, t.B.z], 'looking straight at the world');
  assert.ok(Math.abs(t.rig.yaw - Math.atan2(4, 6)) < 1e-9, 'on the side the fly-in came from');
  assert.strictEqual(t.rig.fly, null);
  assert.strictEqual(t.q.reveal, true);
  assert.notStrictEqual(t.q.phase, 'cut');
});

test('then the camera pulls back, frame by frame, never jumping, and lands on the outside view of that world', () => {
  const t = runOut({});
  t.step(16);
  let prev = t.fromB(), now = 16;
  t.step(now += 16);
  assert.ok(t.log.includes('class go'), 'the copy of the inside fades once the close-up has had a frame');
  while (!t.log.includes('finish') && now < 16 + t.PULL.ms + 200) {
    t.step(now += 16);
    const d = t.fromB();
    assert.ok(d >= prev - 1e-9, 'never back in');
    assert.ok(d - prev < 0.25, 'no jump cut at ' + now + ' ms: ' + prev + ' -> ' + d);
    assert.deepStrictEqual(t.cam.at, [t.B.x, t.B.y, t.B.z], 'the world stays in the middle while we back away');
    assert.ok(t.q.pk >= 0 && t.q.pk <= 1, 'progress for Misty: ' + t.q.pk);
    prev = d;
  }
  assert.ok(t.log.includes('finish'), 'ends');
  assert.ok(now >= 16 + t.PULL.ms, 'not before the pull-back is done');
  assert.ok(Math.abs(t.fromB() - t.PULL.near) < 1e-6, 'outside view of the world she left: ' + t.fromB());
  assert.ok(!t.log.includes('VEIL'));
});

test('World map: the same pull-back from the world, carried on out to the whole world', () => {
  const t = runOut({ wide: true });
  t.step(16);
  assert.ok(Math.abs(t.fromB() - t.PULL.s0) < 1e-6, 'starts at the world too');
  let now = 16; while (!t.log.includes('finish') && now < 5000) t.step(now += 16);
  assert.strictEqual(t.rig.dist, 26); assert.strictEqual(t.rig.pitch, 0.42);
  assert.deepStrictEqual([t.rig.target.x, t.rig.target.y, t.rig.target.z].map(v => Math.round(v * 1e6) / 1e6), [0, 0, 0]);
});

test('the pull-back draws nothing of its own: no streaks, no portal, no wider lens, no colour wash, no new objects', () => {
  const ss = fnSrc(regions, 'function seamStep(q, w, a, now)');
  assert.doesNotMatch(ss, /veil\(|portal|streaks|\.fov|new THREE|buildWarp/);
});

test('Misty rises out through the rings and ends above that world, outside it (never on screen edge, never back inside)', () => {
  const from = { x: 0.62, y: 0.58 }, door = { x: 0.5, y: 0.5 };
  const r0 = MF.outAt('R', 0, from, door), r1 = MF.outAt('R', 1, from, door);
  assert.ok(Math.abs(r0.x - from.x) < 1e-9 && Math.abs(r0.y - from.y) < 1e-9, 'starts where she is at the cut');
  assert.ok(r1.y < door.y - 0.15, 'ends above the world: ' + r1.y);
  assert.ok(Math.abs(r1.x - door.x) < 0.1, 'over it, not off to one side');
  let prev = r0;
  for (let k = 0.02; k <= 1.0001; k += 0.02) { const p = MF.outAt('R', k, from, door); assert.ok(Math.hypot(p.x - prev.x, p.y - prev.y) < 0.05, 'no jump at k=' + k); prev = p; }
  const off = MF.outAt('R', 1, from, { x: -3, y: 4 });
  assert.ok(off.x >= 0.16 && off.x <= 0.84 && off.y >= 0.16 && off.y <= 0.8, 'a world off screen never takes her off screen');
  // depth: always in front of the world's core while she comes out, and far enough out at the end that the stick cannot fly her straight back in
  for (let k = 0; k <= 1.0001; k += 0.05) {
    const dB = RG.backAt(k, RG.PULL.s0, RG.PULL.near), dep = MF.riseDepth(dB, k);
    assert.ok(dep <= dB - 0.34 && dep >= 0.1, 'in front of the core and the lens at k=' + k + ': ' + dep + ' / ' + dB);
  }
  const endSep = RG.PULL.near - MF.riseDepth(RG.PULL.near, 1);
  assert.ok(endSep >= MF.K.ENTRY * 1.6, 'out of the world\'s pull at the end: ' + endSep);
});

test('wiring: her way out follows the pull-back, and flying out through the cloud wall ends at the world, not zoomed out', () => {
  const od = fnSrc(flight, 'function outDraw()');
  assert.match(od, /outAt\('R'/, 'rises with the pull-back');
  assert.match(od, /wq\.pk/, 'paced by the camera\'s own progress, so on a slow phone she and the camera stay in step');
  assert.match(od, /riseDepth\(/);
  const eg = flight.slice(flight.indexOf('function exitGo'), flight.indexOf('function autoExitFrame'));
  assert.match(eg, /Rg\.travel\('hub', false, 0\)/);
  assert.doesNotMatch(eg, /wide: true/, 'no jump to the zoomed-out whole world when she flies out herself');
});
