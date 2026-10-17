/* Oct 17: autopilot orbit-in. E-man: autopilot "feels like cheating ... lacks the struggle"; wants an Interstellar-style
   approach: she orbits the world, smaller and smaller, for a sense of vast distance, instead of flying straight in. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'misty-flight.js'), 'utf8');
const F = require('../misty-flight.js');
const C = F.core || F;

test('the spiral tightens and she shrinks the whole way in', () => {
  let pr = 2, ps = 2;
  for (let q = 0; q <= 1.0001; q += 0.05) {
    const o = C.orbitAt(q);
    assert.ok(o.rad < pr && o.size < ps, 'q=' + q);
    pr = o.rad; ps = o.size;
  }
  assert.strictEqual(C.orbitAt(0).rad, 1);
  assert.strictEqual(C.orbitAt(0).size, 1);
  assert.ok(Math.abs(C.orbitAt(1).rad - C.ORBIT.R_END) < 1e-9);
  assert.ok(C.orbitAt(1).size <= 0.25, 'tiny at the door');
});

test('the spiral starts slow and wide (distance), then falls in', () => {
  const a = 1 - C.orbitAt(0.25).rad, b = C.orbitAt(0.75).rad - C.orbitAt(1).rad;
  assert.ok(a < b, 'first quarter loses less radius than the last');
});

test('she goes round faster as she falls closer, like a real orbit', () => {
  assert.ok(C.orbitSpin(0.2) > C.orbitSpin(0.5));
  assert.ok(C.orbitSpin(0.5) > C.orbitSpin(1));
  assert.ok(C.orbitSpin(1, true) < C.orbitSpin(1), 'sleepy orbits slower');
});

test('a real orbit: about two turns or more over one approach', () => {
  const T = C.ORBIT.T, dt = 1 / 60; let ang = 0;
  for (let t = 0; t < T; t += dt) ang += dt * C.orbitSpin(C.orbitAt(t / T).rad);
  const turns = ang / (2 * Math.PI);
  assert.ok(turns >= 1.5 && turns <= 4, 'turns ' + turns.toFixed(2));
});

test('the struggle: she is always flung out once, more on a low-energy day, and always gets in', () => {
  assert.strictEqual(C.orbitFling(0, false), true, 'first pass always skims and is flung');
  assert.strictEqual(C.orbitFling(1, false), false, 'good energy: in on the second pass');
  assert.strictEqual(C.orbitFling(1, true), true, 'low energy: flung again');
  assert.strictEqual(C.orbitFling(2, true), true);
  assert.strictEqual(C.orbitFling(C.ORBIT.TRIES, true), false, 'never locked out');
});

test('autopilot never flies straight in any more (unless reduced motion)', () => {
  assert.match(src, /if \(!ctx\.reduced && startOrbit\(ctx, g\)\) return;/);
  assert.match(src, /if \(S\.st === 'orbit'\) \{ orbitFrame\(ctx, k, still\); return; \}/);
  assert.ok(!/if \(ADV\(\) && !still\) \{ startPull\(ctx, g\)/.test(src), 'old straight/pull branch is gone');
});

test('the orbit holds her true world size, so the far side shrinks her by perspective', () => {
  assert.match(src, /S\.hs = O\.hs0 \* o\.size;/);
});

test('taking the controls or the world going away cancels the orbit cleanly', () => {
  assert.match(src, /ctx\.PD\.mode !== 'auto' \|\| regionsBusy\(\)/);
  assert.match(src, /S\.st === 'pull' \|\| S\.st === 'orbit'\) \{ S\.st = 'free'; S\.orb = null; \}/);
});
