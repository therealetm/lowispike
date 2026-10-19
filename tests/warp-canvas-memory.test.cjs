// Oct 19, 2026, bug hunt run 14 (sibling of crash squad CS-001, "temporary canvas left to GC").
// Emmanuel keeps getting kicked out of the app around Community, often while zooming between Home and the galaxy.
// Every Home <-> Community warp (a pinch past Home's widest view, the Community bubble, the pinch back home) draws its light
// streaks into a NEW 2D canvas the size of the whole screen in device pixels (galaxy-zoom.js warpFx, #gxWarp), and when the
// warp ended the canvas was only taken off the page. On iPhone a 2D canvas is a GPU surface: 780x1688 (5.3 MB) on an iPhone 13,
// 2048x2732 (22 MB) on an iPad, freed only when the garbage collector gets round to it. Safari caps the memory all canvases may
// hold, so zooming in and out a few times piles these up until iOS kills the page (blank, reload, no JS error): the same
// mechanism that crashed world exits before CS-001.
// The rules these tests hold: the streak canvas stays within about 1.4 megapixels (no change on a normal iPhone, a quarter of
// the memory on an iPad), and its bitmap is handed back (width = height = 0 frees a canvas at once in Safari) every time the
// warp ends.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'galaxy-zoom.js'), 'utf8');

function fnSrc(s, sig) {
  const i = s.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
  let d = 0; const j = s.indexOf('{', i);
  for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } }
  throw new Error('unclosed ' + sig);
}

/* warpFx with stand-in canvases that keep a ledger of live bitmap bytes; viewport w x h CSS px at devicePixelRatio dpr */
function rig(w, h, dpr) {
  const made = [], frames = [];
  const mk = () => {
    const c = { _w: 300, _h: 150, style: {}, attrs: {}, id: '', onPage: false,
      get width() { return this._w; }, set width(v) { this._w = v; }, get height() { return this._h; }, set height(v) { this._h = v; },
      setAttribute(k, v) { this.attrs[k] = v; }, remove() { this.onPage = false; },
      getContext: () => ({ setTransform() { }, clearRect() { }, beginPath() { }, moveTo() { }, lineTo() { }, stroke() { } }) };
    made.push(c); return c;
  };
  const main = { clientWidth: w, clientHeight: h, getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }), appendChild(c) { c.onPage = true; } };
  let now = 0;
  const ctx = { Math, out: {}, DUR: 640, innerWidth: w, innerHeight: h,
    W: { devicePixelRatio: dpr, dispatchEvent() { } }, CustomEvent: function () { },
    D: { getElementById: id => id === 'main' ? main : null, createElement: () => mk() },
    performance: { now: () => now }, requestAnimationFrame: f => { frames.push(f); return frames.length; }, cancelAnimationFrame() { },
    warpAmt: k => Math.sin(Math.PI * Math.max(0, Math.min(1, k))), ease: k => k, keptWarp() { throw new Error('no 3D here'); } };
  vm.createContext(ctx);
  const consts = (src.match(/const WARP_PX = [^;]+;/) || [''])[0];
  vm.runInContext([consts, fnSrc(src, 'function warpFx(dir, m, y, pv)'), 'out.warpFx = warpFx;'].join('\n'), ctx);
  const live = () => made.reduce((s, c) => s + c.width * c.height * 4, 0);
  return { ctx, made, live, frames, tick(t) { now = t; const f = frames.splice(0); f.forEach(fn => fn(now)); } };
}
const M = { x: 195, y: 420, r: 60 }, Y = { x: 195, y: 520, r: 24 };

test('the warp streak canvas stays within about 1.4 megapixels on every screen, and normal iPhones keep full sharpness', () => {
  [[390, 844, 3], [428, 926, 3], [375, 667, 2], [1024, 1366, 2], [820, 1180, 2], [1366, 1024, 2]].forEach(([w, h, dpr]) => {
    const t = rig(w, h, dpr);
    t.ctx.out.warpFx('out', M, Y, null);
    const c = t.made.find(x => x.id === 'gxWarp');
    assert.ok(c, 'the streak canvas is made for ' + w + 'x' + h);
    assert.ok(c.width * c.height <= 1.4e6 + 4000, `${w}x${h}@${dpr}: ${c.width}x${c.height} (${(c.width * c.height * 4 / 1048576).toFixed(1)} MB)`);
    assert.ok(Math.abs(c.width / c.height - w / h) < 0.01, 'same shape as the screen');
    assert.strictEqual(c.style.cssText.includes('width:100%'), true, 'still covers the whole screen');
  });
  const phone = rig(390, 844, 3); phone.ctx.out.warpFx('in', M, Y, null);
  const pc = phone.made.find(x => x.id === 'gxWarp');
  assert.deepStrictEqual([pc.width, pc.height], [780, 1688], 'an iPhone 13 keeps the same 2x streaks as before');
});

test('when the warp ends its canvas bitmap is handed back at once, so zooming in and out never piles up canvas memory', () => {
  const t = rig(1024, 1366, 2);
  let peak = 0;
  for (let i = 0; i < 20; i++) {
    const fx = t.ctx.out.warpFx(i % 2 ? 'in' : 'out', M, Y, null);
    t.tick(16 * (i + 1)); peak = Math.max(peak, t.live());
    fx.stop();
    assert.strictEqual(t.made.filter(c => c.onPage).length, 0, 'nothing left on the page after warp ' + i);
    assert.strictEqual(t.live(), 0, 'no canvas bitmap still held after warp ' + i + ' (' + (t.live() / 1048576).toFixed(1) + ' MB)');
  }
  assert.ok(peak <= 1.4e6 * 4 + 16000, 'at most one streak canvas alive during a warp');
});

test('the streaks still finish drawing on their own when the warp runs to the end', () => {
  const t = rig(390, 844, 3);
  const fx = t.ctx.out.warpFx('out', M, Y, null);
  for (let ms = 16; ms < 800 && t.frames.length; ms += 16) t.tick(ms);
  assert.strictEqual(t.frames.length, 0, 'the streak loop stops after the warp time');
  fx.stop();
  assert.strictEqual(t.live(), 0);
});
