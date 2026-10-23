// Oct 20, 2026, bug hunt run 17 (BH-016, pattern "focus dropped to <body>").
// Holding the companion opens her card; Glow opens a second sheet on top. Closing Glow left keyboard focus on the closed sheet
// and then on <body>, because apple-ui.js only gave focus back when no sheet was left. From <body> Escape and Tab never reached
// the card underneath (an iPad with a keyboard: Escape did nothing, Tab walked the page behind it; VoiceOver lost its place).
// The card repainting itself (a mood tap, an aura pick on Glow) dropped focus to <body> the same way.
// Measured on live 20261020-001606 with playtest/probe-stack-focus.cjs: after closing Glow focus = BODY, Escape x2 left the card
// open; after a mood tap focus = BODY and Escape left the card open.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function rig() {
  const docL = [];
  class El {
    constructor(tag, cls, attrs) { this.tagName = (tag || 'div').toUpperCase(); this.className = cls || ''; this.attrs = Object.assign({}, attrs || {}); this.kids = []; this.parent = null; this.hidden = false; this.disabled = false; this.L = {};
      const self = this; this.classList = { add: (...c) => { c.forEach(x => { if (!self.cl().includes(x)) self.className = (self.className + ' ' + x).trim(); }); }, remove: (...c) => { self.className = self.cl().filter(x => !c.includes(x)).join(' '); }, contains: x => self.cl().includes(x) };
      this.style = { setProperty() { }, removeProperty() { } }; this.dataset = {}; }
    cl() { return this.className.split(/\s+/).filter(Boolean); }
    add(...k) { k.forEach(c => { c.parent = this; this.kids.push(c); }); return this; }
    all() { const o = []; const w = e => e.kids.forEach(k => { o.push(k); w(k); }); w(this); return o; }
    matches(sel) { return sel.split(',').some(s => { s = s.trim(); if (s === '*') return true; if (s[0] === '.') return this.cl().includes(s.slice(1)); return this.tagName === s.toUpperCase(); }); }
    querySelector(sel) { return this.all().find(e => e.matches(sel)) || null; }
    querySelectorAll(sel) { return this.all().filter(e => e.matches(sel)); }
    closest(sel) { for (let e = this; e; e = e.parent) if (e.matches && e.matches(sel)) return e; return null; }
    contains(x) { for (let e = x; e; e = e.parent) if (e === this) return true; return false; }
    get isConnected() { return D.body.contains(this); }
    getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; }
    setAttribute(n, v) { this.attrs[n] = String(v); }
    addEventListener(t, f) { (this.L[t] = this.L[t] || []).push(f); }
    getBoundingClientRect() { return { left: 0, top: 300, width: 390, height: 500, right: 390, bottom: 800 }; }
    focus() { D.activeElement = this; }
    remove() { const lost = this.contains(D.activeElement); if (this.parent) this.parent.kids = this.parent.kids.filter(k => k !== this); this.parent = null; if (lost) D.activeElement = D.body; }
    replaceWith(n) { const p = this.parent, i = p.kids.indexOf(this); const lost = this.contains(D.activeElement); p.kids[i] = n; n.parent = p; this.parent = null; if (lost) D.activeElement = D.body; }
  }
  const D = { body: null, documentElement: new El('html'), activeElement: null, cover: null,
    getElementById: () => null, createElement: t => new El(t), addEventListener: (t, f) => docL.push([t, f]),
    elementFromPoint() { if (D.cover) return D.cover; const t = R2.top(); return t ? t.querySelector('.r2-sh') : D.body; } };
  D.body = new El('body'); D.activeElement = D.body;
  const stack = [], raf = [];
  const R2 = { sheet(html, opts) { const ov = R2.next; R2.next = null; D.body.add(ov); stack.push({ ov, opts }); return ov; },
    close(ov) { const i = ov ? stack.findIndex(x => x.ov === ov) : stack.length - 1; if (i < 0) return; const it = stack.splice(i, 1)[0]; it.ov.classList.add('off'); if (!R2.motionClose || !R2.motionClose(it.ov, () => it.ov.remove())) it.ov.remove(); },
    top: () => stack.length ? stack[stack.length - 1].ov : null };
  const W = { LowiR2: R2, __LOWI_HERB_READY: true, document: D, matchMedia: () => ({ matches: true }), requestAnimationFrame: f => { raf.push(f); return raf.length; }, cancelAnimationFrame() { } };
  const ctx = Object.assign({ window: W, document: D, matchMedia: W.matchMedia, requestAnimationFrame: W.requestAnimationFrame, cancelAnimationFrame() { }, setTimeout, console }, {});
  vm.createContext(ctx); ctx.LowiBloom = undefined;
  vm.runInContext(read('apple-ui.js'), ctx);
  const flush = () => { while (raf.length) raf.shift()(0); };
  function sheet(kids) { const sh = new El('div', 'r2-sh'); sh.add(new El('button', 'r2-x'), ...kids); return new El('div', 'r2-ov').add(new El('div', 'r2-scrim'), sh); }
  function open(ov) { R2.next = ov; const r = R2.sheet('', {}); flush(); return r; }
  function key(k) { const e = { key: k, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { } };
    const a = D.activeElement, ov = a && a.closest && a.closest('.r2-ov'); if (ov && ov.L.keydown) ov.L.keydown.forEach(f => f(e));
    docL.filter(x => x[0] === 'keydown').forEach(x => x[1](e)); return e; }
  return { El, D, R2, sheet, open, key, flush };
}

test('closing a sheet that was opened from a sheet gives focus back to the button that opened it', () => {
  const T = rig();
  const glowBtn = new T.El('button', '', { 'data-mh': 'glow' });
  const hub = T.open(T.sheet([new T.El('div', '', { id: 'mistyHub' }).add(glowBtn)]));
  glowBtn.focus();
  const glow = T.open(T.sheet([new T.El('div', '', { id: 'whMs' })]));
  assert.ok(glow.contains(T.D.activeElement), 'the Glow sheet takes focus when it opens');
  T.R2.close(glow);
  assert.strictEqual(T.D.activeElement, glowBtn, 'focus is back on Glow in the card, not on ' + T.D.activeElement.tagName);
  assert.strictEqual(T.R2.top(), hub);
});

test('if the card repainted while Glow was open, focus goes to the card itself', () => {
  const T = rig();
  const box = new T.El('div', '', { id: 'mistyHub' }), glowBtn = new T.El('button', '', { 'data-mh': 'glow' });
  const hub = T.open(T.sheet([box.add(glowBtn)]));
  glowBtn.focus();
  const glow = T.open(T.sheet([new T.El('div', '', { id: 'whMs' })]));
  box.replaceWith(new T.El('div', '', { id: 'mistyHub' }).add(new T.El('button', '', { 'data-mh': 'glow' })));
  T.R2.close(glow);
  assert.ok(hub.contains(T.D.activeElement) && T.D.activeElement !== T.D.body, 'focus is inside the card');
});

test('Escape after closing Glow closes the card (keyboard on iPad)', () => {
  const T = rig();
  const glowBtn = new T.El('button', '', { 'data-mh': 'glow' });
  const hub = T.open(T.sheet([glowBtn])); glowBtn.focus();
  const glow = T.open(T.sheet([new T.El('button', '', { 'data-wh': 'aura', 'data-id': 'ocean' })]));
  T.key('Escape');
  assert.ok(!T.R2.top() || T.R2.top() === hub, 'Escape #1 closes Glow');
  T.key('Escape');
  assert.strictEqual(T.R2.top(), null, 'Escape #2 closes the card underneath');
  assert.ok(glow.classList.contains('off'));
});

test('focus on <body> under an uncovered sheet: Escape closes it, Tab steps back into it; covered or focused elsewhere: untouched', () => {
  const T = rig();
  const hub = T.open(T.sheet([new T.El('button', '', { 'data-mh': 'mood', 'data-mood': 'good' })]));
  T.D.activeElement = T.D.body;
  T.key('Tab');
  assert.ok(hub.contains(T.D.activeElement), 'Tab from <body> goes into the sheet');
  T.D.activeElement = T.D.body; T.D.cover = new T.El('div', 'tutorial-card');
  T.key('Escape');
  assert.strictEqual(T.R2.top(), hub, 'something else covers the sheet: Escape belongs to it');
  T.D.cover = null; const field = new T.El('input'); T.D.body.add(field); field.focus();
  T.key('Escape');
  assert.strictEqual(T.R2.top(), hub, 'focus in a real control elsewhere: its own handler decides');
  T.D.activeElement = T.D.body;
  T.key('Escape');
  assert.strictEqual(T.R2.top(), null, 'Escape from <body> closes the sheet on top');
});

// Oct 23 (sheets-linger): Gap > Log a meal. Gap fades out for 260 ms and puts focus back on the page button that opened it; Log a
// meal opens 60 ms later. Focus could stay on that page button (or in the parked, inert Gap), so Escape closed nothing.
test('focus left on a page button or in a parked sheet under an uncovered sheet: Escape still closes the top sheet', () => {
  const T = rig();
  const pageBtn = new T.El('button', 'gap-bubble'); T.D.body.add(pageBtn);
  const meal = T.open(T.sheet([new T.El('button', '', { 'data-sp': 'log' })]));
  pageBtn.focus();
  T.key('Escape');
  assert.strictEqual(T.R2.top(), null, 'Escape with focus on a page button closes the sheet on top');
  const parked = T.open(T.sheet([new T.El('button', 'in-parked')])); parked.classList.add('r2-parked');
  const top = T.open(T.sheet([new T.El('button', '')]));
  parked.querySelector('.in-parked').focus();
  T.key('Escape');
  assert.ok(top.classList.contains('off'), 'Escape with focus stuck in a parked sheet closes the visible one');
  assert.ok(meal.classList.contains('off'));
});

test('keepFocus: a sheet that repaints itself keeps focus on the same control', () => {
  const T = rig();
  const mk = () => new T.El('div', '', { id: 'mistyHub' }).add(new T.El('button', '', { 'data-mh': 'mood', 'data-mood': 'tired' }), new T.El('button', '', { 'data-mh': 'mood', 'data-mood': 'good' }));
  const old = mk(); const hub = T.open(T.sheet([old]));
  old.kids[1].focus();
  const nu = mk(); T.R2.keepFocus(old, nu);
  assert.strictEqual(T.D.activeElement, nu.kids[1], 'focus is on the new "good" mood button');
  const nu2 = new T.El('div', '', { id: 'mistyHub' }); T.R2.keepFocus(nu, nu2);
  assert.strictEqual(T.D.activeElement, hub.querySelector('.r2-sh'), 'control gone: focus on the sheet, not on <body>');
  const nu3 = new T.El('div'); T.D.body.add(new T.El('input')); const inp = T.D.body.kids[T.D.body.kids.length - 1]; inp.focus();
  T.R2.keepFocus(nu2, nu3);
  assert.strictEqual(T.D.activeElement, inp, 'focus outside the repainted part is left alone');
});

// BH-017 (same run, found by the probe): while a closed card was still sliding away (its overlay has .off), holding Misty again
// found the dying #mistyHub, repainted it and opened nothing. Same for Glow (#whMs). Probe on live 20261020-001606: after
// closing the card, LowiMistyHub.open() left no card on screen.
test('a card or Glow sheet that is sliding away does not count as open', () => {
  const pick = (src, re) => { const m = src.match(re); assert.ok(m, 'helper found: ' + re); return m[0]; };
  const hubFn = pick(read('misty-hub.js'), /function sheet\(\) \{[^\n]*\}/);
  const msFn = pick(read('world-home.js'), /function liveMs\(\) \{[^\n]*\}/);
  const el = (off) => ({ closest: s => (s === '.r2-ov.off' && off) ? {} : null });
  for (const [fn, name] of [[hubFn, 'sheet'], [msFn, 'liveMs']]) {
    const run = list => vm.runInNewContext(fn + ';' + name + '()', { D: { querySelectorAll: () => list }, Array });
    const dying = el(true), live = el(false);
    assert.strictEqual(run([dying]), null, name + ': only a closing one -> not open, so a new one opens');
    assert.strictEqual(run([dying, live]), live, name + ': closing + new -> the new one');
    assert.strictEqual(run([live]), live);
  }
  const hub = read('misty-hub.js');
  assert.ok(!/D\.querySelector\('#mistyHub /.test(hub), 'rename looks only inside the open card');
  assert.ok(!/getElementById\('whMs'\)/.test(read('world-home.js')), 'Glow uses liveMs()');
});

test('the companion card and the Glow sheet repaint through keepFocus', () => {
  assert.match(read('misty-hub.js'), /LowiR2\.keepFocus\(ex, t\.firstChild\)/);
  assert.match(read('world-home.js'), /LowiR2\.keepFocus\(ex, t\.firstChild\)/);
});
