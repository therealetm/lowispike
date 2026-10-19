// Oct 17, 2026 (E-man on his iPhone, after the warp build 20261017-143443 looked "way worse": "can you just delete the
// in-between world? ... So it goes from inside to outside, seamlessly"). Leaving a world (a place in the bloodstream, by the
// cloud wall, the World map, X or Back) is now one cut under a crossfade of two real pictures: the last frame of the inside,
// copied, fading away over the outside, which is already drawn. These tests fail if any in-between stage comes back: the rim
// streaks layer, the colour wash, the full glow screen, the portal disc, the 3D streaks, the wider lens, the reversed pull-back
// through the glowing door, or a moment where neither world is on screen.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const regions = R('body-world-regions.js');
const rcss = R('body-world-regions.css');
const flight = R('misty-flight.js');

function fnSrc(src, sig) {
  const i = src.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } }
  throw new Error('unclosed ' + sig);
}

test('no warp streak layer, no colour wash, no made-up screen anywhere', () => {
  assert.doesNotMatch(rcss, /bwr-wx|bwrStream|bwr-warp-violet|#7a5cff/);
  assert.doesNotMatch(rcss, /html\.wh-home\.wh-world-live body|html\.bwr-warping #tab-home|html\.mf-transit #tab-home/);
  assert.doesNotMatch(regions, /bwr-wx|bwrWarp|fadeSwap|bwr-fade'|st\.wx/);
  ['body-world-3d.css', 'world-home.css', 'misty-pad.css', 'beta.css'].forEach(f => assert.doesNotMatch(R(f), /bwr-wx|html\.bwr-warping [^{]*\{[^}]*background/, f));
});

test('every way out of a place takes the seamless cut, also Back and the World map, and from one place to another', () => {
  const tr = fnSrc(regions, 'function travel(id, fromBase, tries, opts)');
  assert.match(tr, /const rev = id === 'hub' && st\.cur !== 'hub' && !reduced\(\) && !!a\.rig;/);
  const rv = tr.slice(tr.indexOf('if (rev) {'), tr.indexOf("const q = { id, phase: 'glide'"));
  assert.match(rv, /phase: 'cut', seam: true, rev: true/);
  // nothing of the old way out is built for it
  assert.doesNotMatch(rv, /veil\(|portalFor|streaksFor|fov0 \+|flyTo/);
  // place -> place goes out by the cut first, then flies into the next place
  assert.match(tr, /if \(id !== 'hub' && st\.cur !== 'hub' && !reduced\(\) && a\.rig\) \{ const ok = travel\('hub', false, tries, opts\); if \(ok && st\.busy\) st\.next = id; return ok; \}/);
  // the reversed glow phases and the full-glow flash out are gone
  assert.doesNotMatch(regions, /'unsettle'|'undive'|veil\(1, from\.css\)|q\.outT/);
});

test('the cut runs before any warp drawing: no streaks, no lens change, no glow', () => {
  const sw = fnSrc(regions, 'function stepWarp(w, dt)');
  const at = sw.indexOf('if (q.seam) { seamStep(q, w, a, now); return; }');
  assert.ok(at > 0, 'seam hook');
  ['streaks.tick', 'cam.fov = fov', 'veil(veilO)', 'addScaledVector'].forEach(s => assert.ok(sw.indexOf(s) > at, s + ' only after the seam return'));
  const ss = fnSrc(regions, 'function seamStep(q, w, a, now)');
  assert.doesNotMatch(ss, /veil\(|portal|streaks|\.fov|warpPose/);
});

test('the copy of the inside is a real frame, stays through the menu fade, and is always cleaned up', () => {
  const sn = fnSrc(regions, 'function snapNow(a)');
  assert.match(sn, /ren\.render\(a\.scene, a\.camera\);[\s\S]*x\.drawImage\(cv, 0, 0\);/);
  assert.match(sn, /s\.setAttribute\('data-clean-keep', ''\)/);
  assert.match(fnSrc(regions, 'function clean(q)'), /snapDrop\(false\)/);
  assert.match(fnSrc(regions, 'function reset()'), /snapDrop\(true\)/);
  assert.match(rcss, /^\.bwr-snap\{[^}]*pointer-events:none[^}]*transition:opacity \.38s/m);
  assert.match(rcss, /^\.bwr-snap\.go\{opacity:0\}/m);
});

/* run the cut itself with stand-ins: what happens in which order, frame by frame */
function runCut(opts) {
  const log = [];
  const mkCanvas = (tag) => {
    const cls = new Set();
    return { tag, width: 390, height: 844, style: {}, attrs: {}, classList: { add: c => { cls.add(c); log.push('class ' + c); }, contains: c => cls.has(c) },
      setAttribute(k, v) { this.attrs[k] = v; }, getContext: () => ({ drawImage: (src) => log.push('copy ' + src.tag) }), getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }),
      remove() { log.push('remove ' + tag); }, parentNode: null };
  };
  const glCanvas = mkCanvas('gl');
  const host = { insertBefore(e) { log.push('insert ' + e.className); }, appendChild(e) { log.push('append ' + e.className); } };
  const V = (x, y, z) => ({ x, y, z, copy(o) { this.x = o.x; this.y = o.y; this.z = o.z; return this; }, lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; },
    clone() { return V(this.x, this.y, this.z); }, lerp(o, k) { this.x += (o.x - this.x) * k; this.y += (o.y - this.y) * k; this.z += (o.z - this.z) * k; return this; } });
  const rig = { fly: opts.backFly || null, flyYaw: null, vy: 1, vp: 1, idle: 3, target: V(5, 0, 5), dist: 9, yaw: 0.3, pitch: 0.1, maxD: 26, gy: 0, gp: 0 };
  const cam = { position: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, lookAt() { }, updateMatrixWorld() { } };
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
  const src = ['const SEAM = ' + regions.match(/const SEAM = (\{[^}]*\});/)[1] + ';',
    'const smooth = ' + regions.match(/const smooth = (\([^\n]*\});/)[1] + ';', 'const PULL = ' + regions.match(/const PULL = (\{[^}]*\});/)[1] + ';', fnSrc(regions, 'function backAt('),
    // Oct 19: the pull-back is a launch now (escapeAt paces it, launchCam turns the camera, backIn is weak Misty's way back in)
    'const ESC = ' + regions.match(/const ESC = (\{[^}]*\});/)[1] + ';', fnSrc(regions, 'function escapeAt('), fnSrc(regions, 'function launchCam('), fnSrc(regions, 'function backIn('),
    fnSrc(regions, 'function camFromRig(r, cam)'), fnSrc(regions, 'function snapNow(a)'), fnSrc(regions, 'function snapDrop(now)'), fnSrc(regions, 'function seamStep(q, w, a, now)'),
    'out.seamStep = seamStep; out.SEAM = SEAM; out.PULL = PULL;'].join('\n');
  vm.runInContext(src, ctx);
  const q = { phase: 'cut', seam: true, rev: true, wide: !!opts.wide, B: V(4, 0, 6), clock: 0 };
  const w = { camera: cam };
  return { log, q, rig, cam, ctx, step: (now) => ctx.out.seamStep(q, w, a, now), SEAM: ctx.out.SEAM, PULL: ctx.out.PULL };
}

/* Oct 18 (E-man): "when it exits the world ... all of a sudden she just spawns out with the camera being zoomed out. I want to see
   the same animation but the reverse". The cut itself stays exactly as Oct 17 asked (real copy of the inside, no glow screen, no
   wash, no blank frame); only where the camera sits under the copy changed: right at the world she left, then a pull-back from
   it (tests/oct18-world-exit-reverse.test.cjs). These two tests checked the Oct 17 "straight to the zoomed-out view" camera and
   the 760 ms hold; they now check the Oct 18 camera and timing, with every no-in-between check kept. */
test('frame 1: the inside is drawn and copied first, then the outside replaces it in the same frame, camera right at the world she left', () => {
  const t = runCut({ wide: true });
  t.step(16);
  const L = t.log;
  const iR = L.indexOf('render heart'), iC = L.indexOf('copy gl'), iE = L.indexOf('enter hub');
  assert.ok(iR >= 0 && iC > iR && iE > iC, 'render inside -> copy -> leave: ' + L.join(' | '));
  assert.ok(L.includes('insert bwr-snap') || L.includes('append bwr-snap'), 'the copy is on screen');
  assert.ok(!L.includes('VEIL') && !L.includes('class go'), 'no glow, and the copy is not fading yet: ' + L.join(' | '));
  // Oct 18: under the copy the camera is at the world she just left (its colour fills the screen), facing it, on the fly-in side
  assert.strictEqual(t.rig.dist, t.PULL.s0); assert.strictEqual(t.rig.fly, null);
  assert.deepStrictEqual([t.rig.target.x, t.rig.target.y, t.rig.target.z], [4, 0, 6]);
  assert.ok(Math.abs(t.rig.yaw - Math.atan2(4, 6)) < 1e-9);
  assert.ok(Math.abs(Math.hypot(t.cam.position.x - 4, t.cam.position.y, t.cam.position.z - 6) - t.PULL.s0) < 1e-9, 'camera moved for this very frame');
  assert.strictEqual(t.q.phase, 'pull'); assert.strictEqual(t.q.reveal, true);
  // World map: the pull-back goes on out to the widest outside view, facing the world she just left
  let now = 16; while (!L.includes('finish') && now < 5000) t.step(now += 16);
  assert.strictEqual(t.rig.dist, 26); assert.strictEqual(t.rig.pitch, 0.42);
  assert.deepStrictEqual([t.rig.target.x, t.rig.target.y, t.rig.target.z].map(v => Math.round(v * 1e9) / 1e9), [0, 0, 0]);
  assert.ok(Math.abs(t.rig.yaw - Math.atan2(4, 6)) < 1e-9);
});

test('frame 2 on: the copy fades only after the outside has had a frame, and the move ends when the pull-back is done', () => {
  const t = runCut({});
  t.step(16);
  assert.strictEqual(t.rig.dist, t.PULL.s0, 'Back / X: from the world she left too');
  t.step(33);
  assert.ok(t.log.includes('class go'), 'fade starts on the next frame');
  assert.ok(!t.log.includes('finish'));
  t.step(16 + t.PULL.ms - 50);
  assert.ok(!t.log.includes('finish'), 'not cut short');
  t.step(16 + t.PULL.ms + 1);
  assert.ok(t.log.includes('finish'));
  assert.strictEqual(t.rig.dist, t.PULL.near, 'the outside view of that world');
  // Oct 19 (E-man: "it was still coming out real fast"): the pull-back is a slow launch now (tests/oct19-exit-interstellar.test.cjs); the copy still goes quickly
  assert.ok(t.PULL.ms <= 6500 && t.SEAM.fade <= 450, 'the copy goes quickly; the pull-back is under 6.5 s');
  assert.ok(!t.log.includes('VEIL'));
});

test('the live 3D world is never faded away: the spirit-world rule leaves the stage alone, and it never fires inside a world', () => {
  // the 3D stage (#bw3Stage) is the first child of .sp-heroes (body-world-3d.js mountHome)
  assert.match(R('body-world-3d.js'), /els\.heroes\.insertBefore\(stage, els\.heroes\.firstChild\)/);
  // so no rule may fade or hide .sp-heroes itself (that was the flat blue / purple screen between inside and outside)
  const css = ['world-home.css', 'beta.css', 'body-world-3d.css', 'misty-pad.css', 'clean-view.css', 'body-world-regions.css'].filter(f => fs.existsSync(path.join(__dirname, '..', f))).map(R).join('\n');
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map(r => r.split('{'));
  rules.forEach(([sel, body]) => {
    if (!sel || !body || !/opacity:\s*0(?![.\d])|visibility:\s*hidden|display:\s*none/.test(body)) return;
    sel.split(',').map(x => x.trim()).forEach(x => {
      assert.ok(!/(\.sp-heroes|#spHome|#bw3Stage|\.bw3-stage|#tab-home)$/.test(x) || /^\.bw3-stage \.bw3-canvas$/.test(x), 'hides the live world: ' + x);
    });
  });
  assert.match(R('world-home.css'), /html\.wh-home\.wh-cosmos \.sp-heroes > :not\(\.bw3-stage\)/);
  // wh-cosmos (past Home's World Map) is Home's alone: never while she is inside a world
  assert.match(R('world-home.js'), /const far = r\.dist > \(r\.maxD \|\| 13\) \* 1\.06 && !gx && !inRegion\(\);/);
});

/* Oct 18: she no longer drifts beside the door in a fixed 720 ms; she rises out of the world with the pull-back, paced by its own
   progress (so on a slow phone she and the camera stay in step, which the 720 ms clock was for) */
test('Misty rises out with the pull-back, paced by the pull-back\'s own progress, never by a separate clock', () => {
  assert.match(flight, /const kk = wq && wq\.rev && wq\.pk != null \? wq\.pk : 1;\s*P = outAt\('R', kk, S\.oA, door\);/);
  assert.doesNotMatch(flight, /wq\.seam \? 720 : 1870/);
});
