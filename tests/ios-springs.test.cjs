/* Oct 25 2026 iOS feel (Emmanuel shared Justin's TikTok "Why does iOS feel so nice to use" and said "Learn from this"):
   1. the overscroll rubber band is a hyperbola: offset = (1 - 1/(x*c/d + 1)) * d, c = 0.55, never past one screen (d)
   2. springs, not timed animations: grab or retarget mid-flight and position + speed carry over, no restart from zero
   3. Jacob's Law: behave like the native iOS apps people already know.
   These tests guard:
   - rubberband.js and spring.js (pure maths + a hand-cranked requestAnimationFrame)
   - the bloom (Home's panels) turning around mid-open instead of jumping, with the CSS keyframes stepping aside
   - the sheet grab, the page edge, the Room camera and the segmented pills all using the shared modules
   - battery: no frame is asked for once a spring is at rest; reduced motion jumps straight to the end. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const R = require(path.join(ROOT, 'rubberband.js'));
const S = require(path.join(ROOT, 'spring.js'));

/* a page with a hand-cranked clock: frames only run when the test says so */
function page(reduced) {
  let t = 1000, q = new Map(), id = 0;
  const ctx = {
    performance: { now: () => t }, console,
    matchMedia: () => ({ matches: !!reduced }),
    requestAnimationFrame: f => { q.set(++id, f); return id; },
    cancelAnimationFrame: i => { q.delete(i); },
    setTimeout: () => 0, clearTimeout: () => {},
    document: { documentElement: { classList: { s: new Set(), toggle(c, on) { on ? this.s.add(c) : this.s.delete(c); }, contains(c) { return this.s.has(c); } } } },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('rubberband.js'), ctx);
  vm.runInContext(read('spring.js'), ctx);
  ctx.frame = (ms = 1000 / 60) => { t += ms; const fs = [...q.values()]; q.clear(); fs.forEach(f => f(t)); };
  ctx.pending = () => q.size;
  ctx.run = (n, ms) => { for (let i = 0; i < n; i++) ctx.frame(ms); };
  return ctx;
}

/* ---------- rubberband.js ---------- */
test('rubber band: Apple\'s hyperbola with c = 0.55, d = the screen', () => {
  const d = 844;
  assert.equal(R.C, 0.55);
  assert.equal(R.offset(0, d), 0);
  assert.ok(Math.abs(R.offset(100, d) - (1 - 1 / (100 * 0.55 / d + 1)) * d) < 1e-9, 'the exact formula from the video');
  assert.ok(Math.abs(R.offset(1, d) - 0.55) < 0.01, 'right at the edge it follows the finger at c');
  let prev = 0, prevGain = 1;
  for (let x = 50; x <= 20000; x += 50) {
    const o = R.offset(x, d), gain = (o - prev) / 50;
    assert.ok(o > prev, 'always moves the same way as the finger');
    assert.ok(gain <= prevGain + 1e-12, 'the further you pull, the less it follows');
    assert.ok(o < d, 'never past one screen');
    prev = o; prevGain = gain;
  }
  assert.equal(R.offset(-120, d), -R.offset(120, d), 'same both ways');
  assert.ok(R.offset(300, 390) < 300 * 0.55, 'not a flat factor');
});

test('rubber band: inverse undoes it, clamp leaves the inside alone and unclamp gives the finger back', () => {
  for (const x of [-900, -120, -3, 3, 40, 400, 3000]) assert.ok(Math.abs(R.inverse(R.offset(x, 600), 600) - x) < 1e-6 * Math.max(1, Math.abs(x)));
  assert.equal(R.clamp(50, 0, 100, 400), 50);
  assert.ok(R.clamp(160, 0, 100, 400) > 100 && R.clamp(160, 0, 100, 400) < 160);
  assert.ok(R.clamp(-60, 0, 100, 400) < 0 && R.clamp(-60, 0, 100, 400) > -60);
  for (const v of [-300, -10, 0, 55, 100, 140, 900]) assert.ok(Math.abs(R.unclamp(R.clamp(v, 0, 100, 400), 0, 100, 400) - v) < 1e-6 * Math.max(1, Math.abs(v)));
});

/* ---------- spring.js: the maths ---------- */
test('spring: exact curve, critically damped never overshoots, under-damped bounces once', () => {
  const crit = S.params({ response: 0.4, damping: 1 }), soft = S.params({ response: 0.4, damping: 0.6 });
  let min = Infinity, minSoft = Infinity;
  for (let t = 0; t <= 2; t += 0.005) { min = Math.min(min, S.solve(100, 0, crit.w, 1, t).x); minSoft = Math.min(minSoft, S.solve(100, 0, soft.w, 0.6, t).x); }
  assert.ok(min > -1e-6, 'critical: no overshoot');
  assert.ok(minSoft < -1, 'under-damped: overshoots');
  assert.ok(Math.abs(S.solve(100, 0, crit.w, 1, 3).x) < 0.01, 'settles');
  const over = S.params({ response: 0.4, damping: 1.4 });
  assert.ok(Math.abs(S.solve(100, 0, over.w, 1.4, 4).x) < 0.05, 'over-damped settles too');
});

test('spring: a late frame lands on the same curve (power saver, busy phone)', () => {
  const p = S.params('snappy');
  let a = { x: 120, v: -300 };
  for (let i = 0; i < 60; i++) a = S.solve(a.x, a.v, p.w, p.damping, 1 / 60);
  const b = S.solve(120, -300, p.w, p.damping, 1);
  assert.ok(Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.v - b.v) < 1e-5, '60 small steps = one big step');
});

test('spring: SwiftUI-style presets are springs with different damping', () => {
  for (const k of ['standard', 'smooth', 'snappy', 'bouncy', 'sheet', 'toggle', 'interactive']) {
    const p = S.params(k); assert.ok(p.stiffness > 0 && p.friction > 0, k);
  }
  assert.equal(S.params('smooth').damping, 1);
  assert.ok(S.params('bouncy').damping < S.params('snappy').damping);
  const sheet = S.params('sheet');
  assert.ok(Math.abs(sheet.stiffness - 360) < 5 && Math.abs(sheet.friction - 38) < 1, 'the sheet spring stays what it was');
  assert.ok(Math.abs(S.project(1000) - 1000 * 0.998 / (1 - 0.998) / 1000) < 1.5, 'a fling coasts like a UIScrollView');
});

/* ---------- spring.js: running, grabbing, retargeting ---------- */
test('a running spring can be sent elsewhere mid-flight without a jump, keeping its speed', () => {
  const W = page(false), seen = [];
  const sp = W.LowiSpring.create({ value: 0, response: 0.5, damping: 1, onUpdate: x => seen.push(x) });
  sp.to(300);
  W.run(9);
  const x = sp.value, v = sp.velocity;
  assert.ok(x > 20 && x < 290 && v > 0, 'half way, moving');
  sp.to(0);
  assert.equal(sp.value, x, 'retarget keeps the position');
  assert.equal(sp.velocity, v, 'and the speed');
  W.frame();
  assert.ok(Math.abs(sp.value - x) < 40, 'the next frame continues from there (no restart from 0 or 300)');
  assert.ok(sp.value > x - 1, 'it still carries forward a moment before turning, like a real thing');
  W.run(200);
  assert.ok(Math.abs(sp.value) < 0.5 && !sp.moving, 'ends at the new target');
});

test('grab = stop where it is; the finger\'s release speed carries into the spring', () => {
  const W = page(false);
  const sp = W.LowiSpring.create({ value: 0, response: 0.4, damping: 1 });
  sp.to(500); W.run(6);
  const held = sp.value; sp.stop();
  assert.equal(sp.value, held); assert.equal(sp.moving, false);
  W.run(5); assert.equal(sp.value, held, 'a held spring does not move');
  const a = W.LowiSpring.create({ value: 0, response: 0.4, damping: 1 }), b = W.LowiSpring.create({ value: 0, response: 0.4, damping: 1 });
  a.to(0, { velocity: 0 }); b.to(1, { velocity: 2500 });
  let peak = 0; for (let i = 0; i < 120; i++) { W.frame(); peak = Math.max(peak, b.value); }
  assert.ok(peak > 50, 'a flick keeps going past the target and comes back');
});

test('battery: no frames once at rest, nothing at all before it moves; reduced motion jumps', () => {
  const W = page(false);
  const sp = W.LowiSpring.create({ value: 0, response: 0.3, damping: 1 });
  assert.equal(W.pending(), 0, 'idle spring asks for nothing');
  sp.to(100);
  assert.equal(W.pending(), 1);
  assert.ok(W.document.documentElement.classList.contains('sp-moving'));
  W.run(240);
  assert.equal(sp.value, 100);
  assert.equal(W.pending(), 0, 'at rest: requestAnimationFrame stops');
  assert.equal(W.document.documentElement.classList.contains('sp-moving'), false);
  const R2 = page(true), got = [];
  const r = R2.LowiSpring.create({ value: 0, onUpdate: x => got.push(x) });
  let rested = 0; r.to(80, { onRest: () => rested++ });
  assert.equal(r.value, 80); assert.equal(rested, 1); assert.equal(R2.pending(), 0, 'reduced motion: no animation at all');
});

test('glide: a fling coasts with iOS deceleration and springs off the edge it runs into', () => {
  const W = page(false);
  let x = 0; const g = W.LowiSpring.glide({ value: 0, velocity: 800, min: -1000, max: 1000, onUpdate: v => { x = v; } });
  W.run(400);
  assert.ok(Math.abs(x - W.LowiSpring.project(800)) < 6, 'coasts as far as UIScrollView would: ' + x);
  assert.equal(W.pending(), 0);
  let y = 0, maxY = 0; W.LowiSpring.glide({ value: 0, velocity: 3000, min: 0, max: 300, onUpdate: v => { y = v; maxY = Math.max(maxY, v); } });
  W.run(400);
  assert.ok(maxY > 300, 'runs past the edge a little'); assert.ok(Math.abs(y - 300) < 0.6, 'and settles on it');
  let z = 0; W.LowiSpring.glide({ value: -80, velocity: 0, min: 0, max: 300, onUpdate: v => { z = v; } });
  W.run(200); assert.ok(Math.abs(z) < 0.6, 'a stretched rubber band springs straight back');
  void g;
});

test('cssVar: the segmented pill glow slides on a spring and turns mid-slide', () => {
  const W = page(false);
  const props = {}; const el = { style: { setProperty(k, v) { props[k] = v; }, getPropertyValue(k) { return props[k] || ''; } }, classList: { s: new Set(), add(c) { this.s.add(c); } } };
  W.LowiSpring.cssVar(el, '--rm-i', 0);
  assert.equal(props['--rm-i'], '0'); assert.ok(el.classList.s.has('sp-var'));
  W.LowiSpring.cssVar(el, '--rm-i', 3); W.run(6);
  const mid = parseFloat(props['--rm-i']); assert.ok(mid > 0.2 && mid < 2.9, 'in between: ' + mid);
  W.LowiSpring.cssVar(el, '--rm-i', 1); W.frame();
  assert.ok(Math.abs(parseFloat(props['--rm-i']) - mid) < 0.6, 'no jump when tapping another tab mid-slide');
  W.run(200); assert.equal(props['--rm-i'], '1');
});

/* ---------- the bloom: Home's panels ---------- */
function bloomPage(reduced) {
  const W = page(reduced), listeners = {};
  W.innerWidth = 390; W.innerHeight = 844;
  W.getComputedStyle = () => ({ borderTopLeftRadius: '28px', getPropertyValue: () => '' });
  W.document.addEventListener = (n, f) => { listeners[n] = f; };
  W.document.getElementById = () => null;
  W.document.querySelectorAll = () => [];
  vm.runInContext(read('misty-bloom.js'), W);
  return W;
}
function panel() {
  const set = new Set(['wa-panel']), props = {};
  return {
    id: '', parentNode: null, offsetWidth: 1, listeners: {}, props,
    style: { setProperty(k, v) { props[k] = v; }, getPropertyValue(k) { return props[k] || ''; }, removeProperty(k) { delete props[k]; } },
    classList: { add: (...c) => c.forEach(x => set.add(x)), remove: (...c) => c.forEach(x => set.delete(x)), contains: c => set.has(c) },
    get className() { return [...set].join(' '); },
    addEventListener(n, f) { (this.listeners[n] = this.listeners[n] || []).push(f); },
    querySelector: () => null, closest: () => null,
    getBoundingClientRect: () => ({ left: 10, top: 300, width: 370, height: 500 }),
  };
}
test('bloom: a spring grows the panel out of the bubble, and closing mid-bloom turns it around instead of jumping', () => {
  const W = bloomPage(false), p = panel();
  assert.equal(W.LowiBloom.open(p), true);
  assert.ok(p.classList.contains('mb-sp') && p.classList.contains('mb-in'), 'spring-driven, keyframes off');
  assert.equal(parseFloat(p.props.scale), 0.14, 'starts as the small bubble');
  W.run(5);
  const s1 = parseFloat(p.props.scale);
  assert.ok(s1 > 0.2 && s1 < 0.98, 'growing: ' + s1);
  let done = 0; W.LowiBloom.close(p, () => done++);
  assert.ok(p.classList.contains('mb-out'));
  W.frame();
  const s2 = parseFloat(p.props.scale);
  assert.ok(Math.abs(s2 - s1) < 0.12, 'no jump to full size first (the old keyframes did): ' + s1 + ' -> ' + s2);
  W.run(120);
  assert.equal(done, 1, 'handed over once it is gone');
  assert.ok(parseFloat(p.props.opacity) < 0.1);
  assert.equal(W.pending(), 0, 'nothing keeps running');
});

test('bloom: opening settles on the plain panel (no leftover inline motion); reduced motion keeps the old path', () => {
  const W = bloomPage(false), p = panel();
  W.LowiBloom.open(p); W.run(200);
  assert.equal(p.props.scale, undefined); assert.equal(p.props.translate, undefined); assert.equal(p.props.opacity, undefined);
  const Wr = bloomPage(true), q = panel();
  Wr.LowiBloom.open(q);
  assert.equal(q.classList.contains('mb-sp'), false, 'reduced motion: no spring');
  let d = 0; Wr.LowiBloom.close(q, () => d++); assert.equal(d, 1);
});

test('bloom CSS: the keyframes step aside while the spring drives it', () => {
  const css = read('misty-panels.css');
  assert.match(css, /html:root body \.mb-on\.mb-sp \{ animation: none !important; \}/);
  assert.match(css, /@keyframes mb-in/, 'the keyframes stay for the panels that open by class (Today, Weather, Fasting)');
});

/* ---------- wiring ---------- */
test('the page loads rubberband.js and spring.js before anything that moves, and the offline cache has them', () => {
  const html = read('index.html');
  const rb = html.indexOf('<script src="rubberband.js?v='), sp = html.indexOf('<script src="spring.js?v=');
  assert.ok(rb > 0 && sp > 0, 'both are loaded');
  for (const f of ['apple-ui.js', 'liquid-glass.js', 'community-rooms-ui.js', 'community-chat.js', 'misty-bloom.js']) {
    const i = html.indexOf('<script src="' + f + '?v='); assert.ok(i > sp && i > rb, f + ' comes after them');
  }
  const sw = read('sw.js');
  assert.match(sw, /STATIC\.push\("rubberband\.js", "spring\.js"\)/);
  const v = html.match(/<script src="power-saver\.js\?v=([^"]+)"/)[1];
  assert.ok(html.includes('<script src="spring.js?v=' + v + '"'), 'same build stamp as the rest');
});

test('sheets: the exact spring and Apple\'s rubber band (d = screen height), and a stretched sheet is caught without a jump', () => {
  const js = read('apple-ui.js');
  assert.match(js, /LowiSpring\.solve\(/);
  assert.match(js, /LowiRubber\.offset\(raw,innerHeight/);
  assert.match(js, /base:s\.y<0\?unrubber\(s\.y\):s\.y/);
  assert.doesNotMatch(js, /s\.y=raw>=0\?raw:\(raw\*200\*\.55\)/, 'the fixed 200 px curve is gone from the drag');
});

test('page edge: hyperbolic rubber band and a spring back that a finger can catch', () => {
  const js = read('liquid-glass.js');
  assert.match(js, /LowiRubber\.offset\(dx, g\.W\)/);
  assert.match(js, /function springBack\(/);
  assert.match(js, /back\.sp\.stop\(\)\.value/, 'caught mid-way');
  assert.match(js, /dragTo\(mx \+ \(g\.b0 \|\| 0\)\)/, 'the new drag starts where the page is');
});

test('Room: rubber band past the edges and zoom limits, fling + spring back, spring double-tap, caught by a finger', () => {
  const js = read('community-chat.js');
  assert.match(js, /cam=camFree\?cam:G\.mapClamp\(/, 'no hard clamp while a finger or the spring owns the camera');
  assert.match(js, /function camRubber\(/); assert.match(js, /function zRubber\(/);
  assert.match(js, /zoomAt\(g\.cam0,d\/g\.d0,g\.m0\.x,g\.m0\.y,v,true\)/, 'pinch stretches past the zoom limits');
  assert.match(js, /camRelease\(e\.type==='pointerup'\?trailVel\(e\):null,mid\)/, 'letting go flings with the speed it had');
  assert.match(js, /S\.coast\(/); assert.match(js, /S\.solve\(/);
  assert.match(js, /const caught=!!camMo;camHold\(\)/, 'a finger catches the moving camera where it is');
  assert.match(js, /g=\{kind:caught\?'pan':'tap'/, 'catching a moving camera is not a tap on a companion');
});

test('segmented pills (Room / Chat / Ranking / For You / Studio, Affiliates / Creation) ride a spring', () => {
  const js = read('community-rooms-ui.js'), css = read('community-rooms.css');
  assert.match(js, /pillTo\(tl,'--rm-i',Math\.max\(0,ti\)\)/);
  assert.match(js, /pillTo\(sw,'--rm-sw-i',view==='create'\?1:0\)/);
  assert.match(js, /W\.LowiSpring\.cssVar\(el,name,i\)/);
  assert.match(css, /\.rm-tabs\.sp-var::before,#cmPaneChat\[data-spirit-chat\] \.rm-view>\.rm-sw\.sp-var::before\{transition:none\}/);
});

test('native scrolling stays native: the For You feed keeps its scroll-snap (iOS rubber-bands it itself)', () => {
  for (const f of ['spring.js', 'rubberband.js']) assert.doesNotMatch(read(f), /scrollTop\s*=|addEventListener\('scroll'/, f + ' never drives a scroller');
});
