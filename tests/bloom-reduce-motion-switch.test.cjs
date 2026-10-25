/* BH-022 (bug hunt run 23, 25 Oct 2026): Reduce Motion switched on mid-session after a Home panel bloomed on its spring.
   Found by playing the live build 20261025-195920 (BUGHUNT/playtest/probe-rm-bloom.cjs, Chromium 390 + WebKit iPhone 13):
   open the Fasting panel, close it, turn Reduce Motion on, open it again: #sheetwrap opened (screen dimmed) but #sheet kept
   the spring's last frame inline (opacity 0, scale .14) and mb-sp (keyframes off), so the panel was invisible.
   Rule: when misty-bloom.js takes the non-spring path (reduced motion), no spring state or inline paint is left on the panel,
   and a spring still moving is stopped so it cannot paint the panel again. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* a page with a hand-cranked clock and a Reduce Motion switch the test can flip */
function bloomPage() {
  let t = 1000, q = new Map(), id = 0;
  const rm = { on: false };
  const W = {
    performance: { now: () => t }, console,
    matchMedia: () => ({ matches: rm.on }),
    requestAnimationFrame: f => { q.set(++id, f); return id; },
    cancelAnimationFrame: i => { q.delete(i); },
    setTimeout: () => 0, clearTimeout: () => {},
    innerWidth: 390, innerHeight: 844,
    getComputedStyle: () => ({ borderTopLeftRadius: '28px', getPropertyValue: () => '' }),
    document: {
      documentElement: { classList: { s: new Set(), toggle(c, on) { on ? this.s.add(c) : this.s.delete(c); }, contains(c) { return this.s.has(c); } } },
      addEventListener() {}, getElementById: () => null, querySelectorAll: () => [],
    },
  };
  W.window = W; W.globalThis = W;
  vm.createContext(W);
  vm.runInContext(read('spring.js'), W);
  vm.runInContext(read('misty-bloom.js'), W);
  W.frame = (ms = 1000 / 60) => { t += ms; const fs = [...q.values()]; q.clear(); fs.forEach(f => f(t)); };
  W.run = n => { for (let i = 0; i < n; i++) W.frame(); };
  W.pending = () => q.size;
  W.rm = rm;
  return W;
}
/* a reused panel element, like #sheet (Fasting) */
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
const motionLeft = p => ['scale', 'opacity', 'translate', 'border-radius'].filter(k => p.props[k] !== undefined);

test('BH-022: a panel that folded away on the spring opens visible after Reduce Motion is switched on', () => {
  const W = bloomPage(), p = panel();
  W.LowiBloom.prep(p); W.LowiBloom.open(p); W.run(200);
  W.LowiBloom.close(p); W.run(200);
  assert.ok(parseFloat(p.props.opacity) < 0.05, 'folded away: the spring left its last frame inline (setup)');
  W.rm.on = true;
  W.LowiBloom.prep(p);
  assert.equal(W.LowiBloom.open(p), true);
  assert.deepEqual(motionLeft(p), [], 'no inline opacity/scale/translate left from the spring: ' + JSON.stringify(p.props));
  assert.equal(p.classList.contains('mb-sp'), false, 'mb-sp gone, so the plain (reduced) panel shows');
  assert.ok(p.classList.contains('mb-in'));
  W.run(60);
  assert.deepEqual(motionLeft(p), [], 'nothing paints it again');
});

test('BH-022: Reduce Motion switched on while the panel is still growing: closing stops the spring at once', () => {
  const W = bloomPage(), p = panel();
  W.LowiBloom.prep(p); W.LowiBloom.open(p); W.run(4);
  assert.ok(W.pending() > 0, 'still growing (setup)');
  W.rm.on = true;
  let done = 0; W.LowiBloom.close(p, () => done++);
  assert.equal(done, 1, 'reduced motion: gone at once');
  assert.equal(W.pending(), 0, 'the old spring asks for no more frames');
  W.run(60);
  assert.deepEqual(motionLeft(p), [], 'and leaves no paint behind: ' + JSON.stringify(p.props));
  assert.equal(p.classList.contains('mb-sp'), false);
});

test('BH-022: Reduce Motion off again: the next open blooms on a fresh spring from the small bubble', () => {
  const W = bloomPage(), p = panel();
  W.LowiBloom.prep(p); W.LowiBloom.open(p); W.run(200); W.LowiBloom.close(p); W.run(200);
  W.rm.on = true; W.LowiBloom.prep(p); W.LowiBloom.open(p); W.LowiBloom.close(p);
  W.rm.on = false;
  W.LowiBloom.prep(p); W.LowiBloom.open(p);
  assert.ok(p.classList.contains('mb-sp'), 'spring-driven again');
  assert.equal(parseFloat(p.props.scale), 0.14, 'starts as the small bubble');
  W.run(200);
  assert.deepEqual(motionLeft(p), [], 'settles on the plain panel');
  assert.equal(W.pending(), 0);
});
