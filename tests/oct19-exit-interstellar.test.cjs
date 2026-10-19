// Oct 19, 2026 (E-man, call): "That shift of POV also should be happening when it's exiting the world ... the POV isn't really giving
// what I was trying to communicate here. And it was still coming out real fast. Let's have it actually like a rocket trying to exit a
// world, like that perspective from Interstellar." And: weak Misty (below half energy) can't break free at the rings and gets pulled
// back in, with a line from her that doesn't repeat itself too often.
// The way out keeps its order (close in at the core -> back through the rings -> the outside view with Misty above the world), but
// it is a launch now: a slow, shaking, surging burn against the pull with the camera looking up to space, then breaking free (the
// shaking stops, the camera kicks out and swings over to look back down at the world), then the quiet glide to the outside view.
// These tests fail on build 20261019-064016 (1.8 s, a straight pull-back, no weak exit).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const R = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const regions = R('body-world-regions.js');
const flight = R('misty-flight.js');
const hunt = R('misty-hunt.js');
const RG = require(path.join(ROOT, 'body-world-regions.js'));
const MH = require(path.join(ROOT, 'misty-hunt.js'));

function fnSrc(src, sig) {
  const i = src.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } }
  throw new Error('unclosed ' + sig);
}
const CORE_R = 0.32, RING_R = 0.62;
const distAt = f => RG.PULL.s0 * Math.pow(RG.PULL.near / RG.PULL.s0, f);

test('slower: the launch takes its time (it was 1.8 s and "still coming out real fast")', () => {
  assert.ok(RG.PULL.ms >= 4000 && RG.PULL.ms <= 6500, 'way out ' + RG.PULL.ms + ' ms');
  assert.ok(RG.ESC && RG.ESC.weakMs >= 3500 && RG.ESC.weakMs <= 6000, 'the failed try is not a flash either: ' + (RG.ESC && RG.ESC.weakMs));
});

test('escapeAt: a heavy burn against the pull, then breaking free, then a soft stop on the outside view', () => {
  const E = RG.escapeAt, X = RG.ESC, N = 600;
  assert.strictEqual(E(0).f, 0); assert.strictEqual(E(1).f, 1);
  let prev = 0, shakeBurn = 0, tiltBurn = 0;
  for (let i = 1; i <= N; i++) {
    const k = i / N, e = E(k);
    assert.ok(e.f >= prev - 1e-12, 'a launch never slides back (strong Misty) at k=' + k);
    assert.ok(e.f - prev < 0.02, 'no jump at k=' + k);
    if (k > 0.15 && k < X.free - 0.05) { shakeBurn = Math.max(shakeBurn, e.shake); tiltBurn = Math.max(tiltBurn, e.tilt); }
    if (k > X.free + 0.08) assert.ok(e.shake === 0, 'calm once she has broken free, k=' + k);
    prev = e.f;
  }
  // the burn: most of the time, but only a small part of the way (the pull fights back); it is spent in the ring band
  assert.ok(X.free >= 0.5 && E(X.free).f <= 0.42, 'slow burn: ' + E(X.free).f + ' of the way after ' + X.free + ' of the time');
  assert.ok(distAt(E(X.free).f) > RING_R && distAt(E(X.free).f) < RING_R * 1.3 * 2.2, 'breaks free just past the rings: ' + distAt(E(X.free).f));
  // surging thrust: the speed in the burn swells and drops at least twice (not one even glide)
  let ups = 0, lastV = null, rising = false;
  for (let i = 1; i <= 300; i++) { const k = X.free * i / 300, v = E(k).f - E(k - X.free / 300).f; if (lastV != null) { if (v > lastV && !rising) { ups++; rising = true; } else if (v < lastV) rising = false; } lastV = v; }
  assert.ok(ups >= 2, 'thrust comes in surges: ' + ups);
  // breaking free: much faster right after than during the burn
  const burnSpeed = E(X.free).f / X.free, kick = (E(X.free + 0.05).f - E(X.free).f) / 0.05;
  assert.ok(kick > 4 * burnSpeed, 'kicks out when it breaks free: ' + kick + ' vs ' + burnSpeed);
  assert.ok(shakeBurn > 0.6, 'the picture shakes while the engine fights the pull: ' + shakeBurn);
  assert.ok(tiltBurn > 0.15 && tiltBurn < 0.45, 'looking up, out to space, with the world under it (and still in the picture): ' + tiltBurn);
  // the POV shift: after breaking free the camera swings over the top to look back down at the world
  const rise = Math.max.apply(null, [0.7, 0.75, 0.8].map(k => E(k).rise));
  assert.ok(rise > 0.6 && X.peak > 0.5, 'looks back down at the world falling away: ' + rise);
  assert.ok(E(X.free - 0.1).rise < 0.05, 'not before it has broken free');
  // the end: level, still, on the outside view (the free camera takes over without a snap)
  const end = E(1);
  assert.deepStrictEqual([end.shake, end.tilt, end.roll, end.rise], [0, 0, 0, 0]);
  assert.ok(1 - E(0.97).f < 0.01 && E(0.97).rise < 0.05 && E(0.97).tilt === 0, 'glides to a stop');
});

test('escapeAt weak: the same burn, stalls at the rings, and the pull drags her back down to the core', () => {
  const E = k => RG.escapeAt(k, true), X = RG.ESC, N = 600;
  let top = 0, kTop = 0, prev = 0, falling = false;
  for (let i = 0; i <= N; i++) {
    const k = i / N, e = E(k);
    assert.ok(Math.abs(e.f - prev) < 0.02, 'no jump at k=' + k);
    if (e.f > top) { top = e.f; kTop = k; }
    if (k > X.fall + 0.02) { assert.ok(e.f <= prev + 1e-12, 'pulled back, never up again, k=' + k); falling = true; }
    prev = e.f;
  }
  assert.ok(falling);
  assert.ok(distAt(top) > RING_R && distAt(top) < RING_R * 1.3 * 1.8, 'gets as far as the rings, no further: ' + distAt(top));
  assert.ok(top < RG.escapeAt(X.free).f, 'never as far as breaking free');
  assert.strictEqual(E(1).f, 0, 'back at the core: the screen is the world\'s colour again');
  assert.ok(distAt(E(1).f) < RING_R && Math.asin(CORE_R / distAt(E(1).f)) > 27.5 * Math.PI / 180);
  const stallShake = E(X.stall + 0.05).shake, burnShake = E(0.3).shake;
  assert.ok(stallShake > burnShake, 'shakes harder when the thrust gives out: ' + stallShake + ' > ' + burnShake);
  const end = E(1); assert.deepStrictEqual([end.shake, end.tilt, end.roll, end.rise], [0, 0, 0, 0]);
});

/* the way out with stand-ins, with a camera that can turn (like THREE's) */
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
  const rig = { fly: null, flyYaw: null, vy: 1, vp: 1, idle: 3, target: V(5, 0, 5), dist: 9, yaw: 0.3, pitch: 0.1, maxD: 26, gy: 0, gp: 0, mode: 'home' };
  const cam = { rot: { x: 0, y: 0, z: 0 }, position: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, lookAt(t) { this.at = [t.x, t.y, t.z]; cam.rot = { x: 0, y: 0, z: 0 }; },
    rotateX(a) { this.rot.x += a; }, rotateY(a) { this.rot.y += a; }, rotateZ(a) { this.rot.z += a; }, updateMatrixWorld() { } };
  const a = { rig, renderer: { domElement: glCanvas, render: () => log.push('render ' + (ctx.st.cur)) }, scene: {}, camera: cam,
    flyTo: (id) => { log.push('flyTo ' + id); rig.fly = { to: { t: V(0, 0, 0), d: 6.5 } }; } };
  const ctx = {
    Math, setTimeout: (f) => { log.push('timer'); f(); },
    D: { createElement: () => mkCanvas('snap') },
    st: { host, veil: null, snap: null, cur: 'heart', ownFly: false, warp: null },
    reduced: () => false, enter: (id, quiet) => { log.push('enter ' + id + (quiet ? ' quiet' : '')); ctx.st.cur = id; }, finish: () => log.push('finish'),
    clean: () => log.push('clean'), warpEv: (p, id, from) => log.push('ev ' + p + ' ' + id + ' ' + from),
    veil: () => log.push('VEIL'), out: {}
  };
  vm.createContext(ctx);
  const src = ['const smooth = ' + regions.match(/const smooth = (\([^\n]*\});/)[1] + ';',
    'const SEAM = ' + regions.match(/const SEAM = (\{[^}]*\});/)[1] + ';',
    'const PULL = ' + regions.match(/const PULL = (\{[^}]*\});/)[1] + ';', fnSrc(regions, 'function backAt('),
    'const ESC = ' + regions.match(/const ESC = (\{[^}]*\});/)[1] + ';', fnSrc(regions, 'function escapeAt('), fnSrc(regions, 'function launchCam('), fnSrc(regions, 'function backIn('),
    fnSrc(regions, 'function camFromRig(r, cam)'), fnSrc(regions, 'function snapNow(a)'), fnSrc(regions, 'function snapDrop(now)'), fnSrc(regions, 'function seamStep(q, w, a, now)'),
    'out.seamStep = seamStep;'].join('\n');
  vm.runInContext(src, ctx);
  const B = V(4, 1, 6);
  const q = { phase: 'cut', seam: true, rev: true, wide: false, weak: !!opts.weak, B, clock: 0, id: 'hub', from: 'heart', done: () => log.push('done'),
    inRig: { t: V(7, 2, 9), d: 3.3, yaw: 1.1, pitch: -0.2 } };
  ctx.st.warp = q;
  const w = { camera: cam };
  const fromB = () => Math.hypot(cam.position.x - B.x, cam.position.y - B.y, cam.position.z - B.z);
  return { log, q, rig, cam, ctx, B, fromB, step: (now) => ctx.out.seamStep(q, w, a, now) };
}

test('the rocket camera: looks up and shakes during the burn, swings over to look back down, ends level on the outside view', () => {
  const t = runOut({});
  t.step(16);
  let now = 16, maxTilt = 0, shakes = new Set(), maxRoll = 0, maxPitch = -9, endsAt = 0;
  while (!t.log.includes('finish') && now < 16 + RG.PULL.ms + 400) {
    t.step(now += 16);
    const k = (now - 16) / RG.PULL.ms;
    if (k < RG.ESC.free) { maxTilt = Math.max(maxTilt, t.cam.rot.x); shakes.add(Math.round(t.cam.rot.y * 1e5)); maxRoll = Math.max(maxRoll, Math.abs(t.cam.rot.z)); }
    maxPitch = Math.max(maxPitch, t.rig.pitch);
    assert.deepStrictEqual(t.cam.at, [t.B.x, t.B.y, t.B.z], 'the world stays what the camera is aimed at (the turns are on top)');
    assert.ok(Math.abs(t.cam.rot.x) < 0.5 && Math.abs(t.cam.rot.z) < 0.25, 'a few degrees, never losing the world: ' + JSON.stringify(t.cam.rot));
    endsAt = now;
  }
  assert.ok(t.log.includes('finish') && !t.log.includes('done'), 'a normal launch ends with finish (outside view)');
  assert.ok(endsAt >= 16 + RG.PULL.ms);
  assert.ok(maxTilt > 0.15, 'looked up, out to space: ' + maxTilt);
  assert.ok(shakes.size > 20, 'it shook (many different small turns): ' + shakes.size);
  assert.ok(maxRoll > 0.04, 'the horizon leaned: ' + maxRoll);
  assert.ok(maxPitch > 0.6, 'swung over the top to look back down at the world: ' + maxPitch);
  assert.deepStrictEqual([t.cam.rot.x, t.cam.rot.y, t.cam.rot.z], [0, 0, 0], 'level at the end');
  assert.ok(Math.abs(t.fromB() - RG.PULL.near) < 1e-6, 'same outside view as before: ' + t.fromB());
  assert.ok(Math.abs(t.rig.pitch - t.q.p0) < 1e-9, 'pitch back where the free camera expects it');
  assert.strictEqual(t.q.pk, 1, 'Misty is all the way out');
});

test('weak Misty: climbs to the rings, is pulled back to the core, and the place comes back with the camera where it was', () => {
  const t = runOut({ weak: true });
  t.step(16);
  let now = 16, far = 0, pkTop = 0;
  while (!t.log.includes('done') && now < 16 + RG.ESC.weakMs + 400) {
    t.step(now += 16);
    if (!t.log.includes('done')) { far = Math.max(far, t.fromB()); pkTop = Math.max(pkTop, t.q.pk); }
  }
  assert.ok(t.log.includes('done'), 'the trip ends');
  assert.ok(!t.log.includes('finish'), 'no arrival outside');
  assert.ok(far > RING_R && far < RING_R * 1.3 * 1.8, 'got to the rings: ' + far);
  assert.ok(pkTop > 0.15 && pkTop < 0.4, 'Misty rose with it, partway: ' + pkTop);
  const L = t.log, iCopy = L.lastIndexOf('copy gl'), iEnter = L.indexOf('enter heart quiet');
  assert.ok(iEnter > 0 && iCopy < iEnter && iCopy > L.indexOf('enter hub'), 'the core close-up is copied, then the place comes back under it (no blank frame): ' + L.slice(-8).join(' | '));
  assert.ok(L.indexOf('ev cancel hub heart') > iEnter, 'the trip out is called off (no arrival sound)');
  assert.ok(L.indexOf('clean') > iEnter, 'cleaned up');
  assert.strictEqual(t.ctx.st.warp, null);
  assert.deepStrictEqual([t.rig.target.x, t.rig.target.y, t.rig.target.z, t.rig.dist, t.rig.yaw, t.rig.pitch], [7, 2, 9, 3.3, 1.1, -0.2], 'camera back where it was inside');
  assert.deepStrictEqual([t.cam.rot.x, t.cam.rot.y, t.cam.rot.z], [0, 0, 0]);
});

test('wiring: travel carries weak (never with the World map), saves the inside camera, and the base glide is untouched', () => {
  const tv = fnSrc(regions, 'function travel(');
  assert.match(tv, /weak: !!\(opts && opts\.weak && !opts\.wide\)/);
  assert.match(tv, /q\.inRig = \{ t: a\.rig\.target\.clone\(\)/);
  const ss = fnSrc(regions, 'function seamStep(q, w, a, now)');
  assert.match(ss, /escapeAt\(k, q\.weak\)/); assert.match(ss, /launchCam\(/); assert.match(ss, /backIn\(q, w, a\)/);
  assert.doesNotMatch(ss + fnSrc(regions, 'function launchCam(') + fnSrc(regions, 'function backIn('), /veil\(|portal|streaks|\.fov|new THREE|buildWarp/, 'nothing drawn of its own, no wider lens');
  assert.match(fnSrc(regions, 'function enter('), /if \(!quiet\) say\(id\)/, 'coming back in is not announced like a new arrival');
});

test('wiring: only her own steering can fail (not the X, World map, autopilot, or Reduce Motion), and she is put back inside', () => {
  const eg = flight.slice(flight.indexOf('function exitGo'), flight.indexOf('function autoExitFrame'));
  assert.match(eg, /why === 'hold' && !ctx\.reduced/);
  assert.match(eg, /Hn\.gateOut\(S\.flew\)/);
  assert.match(eg, /Rg\.travel\('hub', false, 0, \{ weak: true \}\)/);
  const of = fnSrc(flight, 'function outFrame(ctx, k)');
  const iBack = of.indexOf("cur !== 'hub'"), iLand = of.indexOf('outLand(ctx, k)');
  assert.ok(iBack > 0 && iLand > iBack, 'back inside is checked before landing outside');
  assert.match(of, /S\.oHeld/); assert.match(of, /Hn\.heldSay\(\)/); assert.match(of, /S\.p\.copy\(S\.oP0\)/);
  assert.match(fnSrc(flight, 'function startOut('), /S\.oP0 = /);
});

test('the half-energy rule is the same one as getting in (misty-hunt tries), counted on its own', () => {
  assert.strictEqual(MH.tries(0.6), 0); assert.strictEqual(MH.tries(0.5), 0); assert.strictEqual(MH.tries(0.4), 1); assert.strictEqual(MH.tries(0.1), 2);
  const go = fnSrc(hunt, 'function gateOut(');
  assert.match(go, /tries\(en && en\.value\)/);
  assert.match(go, /heldBack\[key\]/);
  assert.doesNotMatch(go, /bounced\[/, 'bouncing in and being held back are counted apart');
});

test('her lines when held back: warm, short, the same count in English, German and Spanish', () => {
  const H = MH.HELD;
  assert.ok(H.en.length >= 6, 'a real pool: ' + H.en.length);
  assert.strictEqual(H.de.length, H.en.length); assert.strictEqual(H.es.length, H.en.length);
  for (const l of ['en', 'de', 'es']) {
    assert.strictEqual(new Set(H[l]).size, H[l].length, 'no duplicates in ' + l);
    for (const s of H[l]) { assert.ok(s.length > 10 && s.length <= 100, 'short: ' + s); assert.doesNotMatch(s, /\d|insulin|spike|kcal/i, 'no numbers, no lecture: ' + s); }
  }
  assert.strictEqual(MH.heldLine(2, 'en'), H.en[2]); assert.strictEqual(MH.heldLine(2, 'de-DE'), H.de[2]); assert.strictEqual(MH.heldLine(0, 'fr'), H.de[0]);
});

test('shuffle bag: every line once before any comes back, never the same twice in a row (also across refills)', () => {
  const n = MH.HELD.en.length;
  for (const seed of [1, 7, 42, 99, 1234]) {
    let a = seed; const rnd = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
    let bag = null, prev = -1; const seen = [];
    for (let i = 0; i < n * 12; i++) {
      const r = MH.bagNext(bag, n, rnd); bag = JSON.parse(JSON.stringify(r.bag)); /* kept as JSON, like localStorage */
      assert.ok(r.i >= 0 && r.i < n);
      assert.notStrictEqual(r.i, prev, 'same line twice in a row at draw ' + i);
      prev = r.i; seen.push(r.i);
    }
    for (let c = 0; c < 12; c++) assert.strictEqual(new Set(seen.slice(c * n, c * n + n)).size, n, 'each round uses every line once (seed ' + seed + ')');
  }
  // worst case: a random source that always says 0 still never repeats back to back
  let bag = null, prev = -1;
  for (let i = 0; i < 40; i++) { const r = MH.bagNext(bag, n, () => 0); assert.notStrictEqual(r.i, prev); prev = r.i; bag = r.bag; }
  // a broken saved bag is repaired, not trusted
  const r = MH.bagNext({ left: [99, -1, 'x', 3, 3], last: 3 }, n, Math.random);
  assert.notStrictEqual(r.i, 3, 'not the last line again'); assert.ok(r.bag.left.every(i => Number.isInteger(i) && i >= 0 && i < n));
  assert.deepStrictEqual(MH.bagNext(null, 0).i, -1);
  const hs = fnSrc(hunt, 'function heldSay(');
  assert.match(hs, /bagNext\(bag, HELD\.en\.length\)/); assert.match(hs, /localStorage/); assert.match(hs, /LowiPraise\.say/);
});
