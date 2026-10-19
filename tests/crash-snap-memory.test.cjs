// Oct 19, 2026, crash squad. Emmanuel: "even though I try to fly around and I fly out, the app crashes."
// Every way out of a world (steering out through the cloud wall, World map, X, Back) and every weak-Misty pull-back draws the
// last frame of the inside into a NEW 2D canvas the full size of the 3D drawing buffer (body-world-regions.js snapNow), and the
// copy was only taken off the page afterwards. On iPhone a 2D canvas is a GPU surface: 780x1688 (5.3 MB) on an iPhone, up to
// 2048x2732 (22 MB) on an iPad, freed only whenever the garbage collector gets round to it. Safari has a hard limit on the
// memory all canvases may hold, and fly-in / fly-out over and over piles these up until iOS kills the tab: the page goes blank
// and reloads, with no error in the code (the crash he sees). The copy also cost a full read-back of the 3D picture: in the
// Chromium soak (tools/soak/freeze-profile.cjs) one copy held the main thread for 48 s.
// The rules these tests hold: the copy is small (it is only on screen for a 0.38 s fade), and its bitmap is handed back the
// moment it leaves the page (width = height = 0 is what makes Safari free a canvas at once), on every path out.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const regions = fs.readFileSync(path.join(__dirname, '..', 'body-world-regions.js'), 'utf8');

function fnSrc(src, sig) {
  const i = src.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } }
  throw new Error('unclosed ' + sig);
}

/* snapNow / snapDrop with stand-in canvases that keep a ledger of live bitmap bytes */
function rig(glW, glH, opts) {
  opts = opts || {};
  const made = [], timers = [];
  let onPage = 0;
  const mk = (tag, w, h) => {
    const c = { tag, _w: w || 300, _h: h || 150, style: {}, attrs: {}, cls: new Set(), parentNode: null, drawn: null,
      get width() { return this._w; }, set width(v) { this._w = v; }, get height() { return this._h; }, set height(v) { this._h = v; },
      classList: { add(k) { c.cls.add(k); }, contains(k) { return c.cls.has(k); } }, setAttribute(k, v) { this.attrs[k] = v; },
      getContext: () => opts.noCtx ? null : ({ drawImage: (src, x, y, w2, h2) => { if (opts.throwDraw) throw new Error('lost'); c.drawn = { src: src.tag, w: w2 == null ? src.width : w2, h: h2 == null ? src.height : h2 }; } }),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }), remove() { if (this.parentNode) { this.parentNode = null; onPage--; } } };
    return c;
  };
  const gl = mk('gl', glW, glH);
  const host = { insertBefore(e) { e.parentNode = host; onPage++; }, appendChild(e) { e.parentNode = host; onPage++; } };
  const a = { renderer: { domElement: gl, render() { } }, scene: {}, camera: {} };
  const ctx = { Math, W: { getComputedStyle: () => ({ filter: 'none' }) }, setTimeout: (f, ms) => { timers.push(f); return timers.length; },
    D: { createElement: () => { const c = mk('snap'); made.push(c); return c; } }, st: { host, veil: null, snap: null }, reduced: () => !!opts.reduced, out: {} };
  vm.createContext(ctx);
  const consts = ['SEAM', 'SNAP'].map(n => { const m = regions.match(new RegExp('const ' + n + ' = (\\{[^}]*\\});')); return m ? `const ${n} = ${m[1]};` : ''; }).join('\n');
  const helper = regions.includes('function snapFree(') ? fnSrc(regions, 'function snapFree(') : '';
  vm.runInContext([consts, helper, fnSrc(regions, 'function snapNow(a)'), fnSrc(regions, 'function snapDrop(now)'), 'out.snapNow = snapNow; out.snapDrop = snapDrop;'].join('\n'), ctx);
  const liveBytes = () => made.reduce((s, c) => s + c.width * c.height * 4, 0);
  return { ctx, a, made, timers, liveBytes, onPage: () => onPage, flush() { while (timers.length) timers.shift()(); } };
}

test('the copy of the inside is small: at most about half a megapixel, whatever the screen (iPhone, iPad)', () => {
  [[780, 1688], [1170, 2532], [2048, 2732], [1640, 2360]].forEach(([w, h]) => {
    const t = rig(w, h);
    const s = t.ctx.out.snapNow(t.a);
    assert.ok(s, 'a copy is made for ' + w + 'x' + h);
    assert.ok(s.width * s.height <= 520000, `copy of ${w}x${h} is ${s.width}x${s.height} (${(s.width * s.height * 4 / 1048576).toFixed(1)} MB)`);
    assert.ok(Math.abs(s.width / s.height - w / h) < 0.01, 'same shape as the screen');
    assert.deepStrictEqual(s.drawn, { src: 'gl', w: s.width, h: s.height }, 'the whole 3D picture is drawn into it, scaled');
    assert.strictEqual(s.style.width, '390px', 'still covers the whole 3D view on screen');
  });
  const t = rig(390, 844); const s = t.ctx.out.snapNow(t.a);
  assert.deepStrictEqual([s.width, s.height], [390, 844], 'a small buffer is copied as it is');
});

test('the copy hands its bitmap back the moment it leaves the page: after the fade, at once, and when the next copy replaces it', () => {
  const t = rig(780, 1688);
  const s1 = t.ctx.out.snapNow(t.a);
  assert.ok(t.liveBytes() > 0 && t.onPage() === 1);
  t.ctx.out.snapDrop(false);
  assert.strictEqual(t.onPage(), 1, 'still on screen while it fades');
  t.flush();
  assert.strictEqual(t.onPage(), 0); assert.strictEqual(s1.width * s1.height, 0, 'faded copy freed');
  const s2 = t.ctx.out.snapNow(t.a); t.ctx.out.snapDrop(true);
  assert.strictEqual(s2.width * s2.height, 0, 'dropped-at-once copy freed');
  const s3 = t.ctx.out.snapNow(t.a); const s4 = t.ctx.out.snapNow(t.a); /* weak Misty: the pull-back makes a second copy over the first */
  assert.strictEqual(s3.width * s3.height, 0, 'replaced copy freed'); assert.ok(s4.width > 0);
  t.ctx.out.snapDrop(false); t.flush();
  assert.strictEqual(t.liveBytes(), 0);
});

test('a copy that could not be drawn (lost context, no 2D context) is freed too, and nothing is left on the page', () => {
  for (const o of [{ throwDraw: true }, { noCtx: true }]) {
    const t = rig(1170, 2532, o);
    assert.strictEqual(t.ctx.out.snapNow(t.a), null);
    assert.strictEqual(t.onPage(), 0); assert.strictEqual(t.liveBytes(), 0, JSON.stringify(o));
  }
});

test('flying in and out 60 times (every second one weak) leaves no canvas bitmap behind', () => {
  const t = rig(1170, 2532);
  let peak = 0;
  for (let i = 0; i < 60; i++) {
    t.ctx.out.snapNow(t.a); if (i % 2) t.ctx.out.snapNow(t.a);
    peak = Math.max(peak, t.liveBytes());
    t.ctx.out.snapDrop(i % 3 === 0); t.flush();
  }
  assert.strictEqual(t.liveBytes(), 0, 'all copies freed');
  assert.ok(peak <= 2 * 520000 * 4, 'never more than two small copies alive at once: ' + (peak / 1048576).toFixed(1) + ' MB');
});
