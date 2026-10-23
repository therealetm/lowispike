// Oct 22 2026 (Seven, iPhone screenshots 14:48): Fuel > "Log a meal" opened on top of the Fuel sheet, and closing it (swipe down or X)
// showed the Fuel sheet still sitting behind it. "Multiple times when I click something, something opens, but when I exit down there's
// another thing behind it, that doesn't make sense. Fix that error on all presses, on all pages."
// One rule in the shared shell (LowiR2.sheet / R2.close / R2.adopt, index.html): a sheet opened from a sheet REPLACES it (the old one is
// parked: hidden whole, inert). Every way of closing the new one (X, swipe, backdrop, Escape / Android / browser back, code) closes the
// parked ones too, so zero sheets are left. The small back chevron is the one way back to the parent. This test runs the real shell
// code on a tiny DOM and walks every kind of sheet-to-sheet path; tests/sheet-replace-live.cjs walks the real screens in a browser.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const HTML = read('index.html');

function rig() {
  let observers = [];
  const timers = [];
  class El {
    constructor(tag, cls) {
      this.tagName = (tag || 'div').toUpperCase(); this.className = cls || ''; this.attrs = {}; this.kids = []; this.parent = null; this.hidden = false; this.inert = false;
      this.listeners = {}; const self = this;
      this.classList = { add: (...c) => c.forEach(x => { if (!self.cl().includes(x)) self.className = (self.className + ' ' + x).trim(); }),
        remove: (...c) => { self.className = self.cl().filter(x => !c.includes(x)).join(' '); }, contains: c => self.cl().includes(c) };
    }
    cl() { return this.className.split(/\s+/).filter(Boolean); }
    set innerHTML(h) { /* the shell skeleton only: scrim, then the sheet with grab, X and body */
      this.kids = []; this.html = h;
      if (/r2-scrim/.test(h)) { const sh = new El('div', 'r2-sh'); this.appendChild(new El('div', 'r2-scrim'));
        if (/r2-grab/.test(h)) sh.appendChild(new El('div', 'r2-grab')); if (/r2-x/.test(h)) { const x = new El('button', 'r2-x'); x.attrs['data-r2'] = 'close'; sh.appendChild(x); }
        sh.appendChild(new El('div', 'r2-shb')); this.appendChild(sh); }
    }
    get innerHTML() { return this.html || ''; }
    get firstChild() { return this.kids[0] || null; }
    get firstElementChild() { return this.kids[0] || null; }
    get children() { return this.kids.slice(); }
    appendChild(c) { return this.insertBefore(c, null); }
    insertBefore(c, ref) { if (c.parent) c.parent.kids.splice(c.parent.kids.indexOf(c), 1); c.parent = this; const i = ref ? this.kids.indexOf(ref) : -1; if (i < 0) this.kids.push(c); else this.kids.splice(i, 0, c); if (this === doc.body) observers.forEach(f => f()); return c; }
    remove() { if (!this.parent) return; const p = this.parent; p.kids.splice(p.kids.indexOf(this), 1); this.parent = null; if (p === doc.body) observers.forEach(f => f()); }
    all() { const o = []; const w = e => e.kids.forEach(k => { o.push(k); w(k); }); w(this); return o; }
    one(s) { s = s.trim(); const m = s.match(/^([a-z]*)((?:\.[\w-]+)*)((?:\[[^\]]+\])*)((?::not\([^)]*\))*)$/i); if (!m) return false;
      if (m[1] && this.tagName !== m[1].toUpperCase()) return false;
      if (m[2] && !m[2].split('.').filter(Boolean).every(c => this.cl().includes(c))) return false;
      if (m[3]) { for (const a of m[3].match(/\[[^\]]+\]/g)) { const [, k, v] = a.match(/\[([\w-]+)(?:=['"]?([^'"\]]*)['"]?)?\]/); if (v === undefined ? !(k in this.attrs) : this.attrs[k] !== v) return false; } }
      if (m[4]) { for (const n of m[4].match(/:not\(([^)]*)\)/g)) if (this.one(n.slice(5, -1))) return false; }
      return true; }
    matches(sel) { return sel.split(',').some(s => this.one(s)); }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    querySelectorAll(sel) { sel = sel.trim(); if (sel.startsWith(':scope >')) { const s = sel.replace(':scope >', ''); return this.kids.filter(k => k.matches(s)); } return this.all().filter(e => e.matches(sel)); }
    closest(sel) { for (let e = this; e; e = e.parent) if (e.matches && e.matches(sel)) return e; return null; }
    contains(x) { for (let e = x; e; e = e.parent) if (e === this) return true; return false; }
    get isConnected() { return doc.body.contains(this); }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    removeAttribute(k) { delete this.attrs[k]; }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
    click() { (this.listeners.click || []).forEach(f => f({ preventDefault() { }, stopPropagation() { }, target: this })); }
  }
  const doc = { body: new El('body'), documentElement: new El('html'), createElement: t => new El(t), getElementById: id => doc.body.all().find(e => e.attrs.id === id) || null,
    querySelectorAll: s => doc.body.querySelectorAll(s), addEventListener() { } };
  doc.documentElement.lang = 'en';
  const legacy = new El('div'); legacy.attrs.id = 'sheetwrap'; doc.body.appendChild(legacy);
  const R2 = { ico: { x: 'x', back: '<' } };
  const ctx = { R2, document: doc, window: {}, requestAnimationFrame: f => f(), setTimeout: (f) => { timers.push(f); return timers.length; },
    MutationObserver: class { constructor(f) { this.f = f; } observe(el) { if (el === doc.body) observers.push(this.f); } disconnect() { } },
    closeSheet: () => legacy.classList.remove('open') };
  ctx.window = ctx;
  const a = HTML.indexOf('/* ---------- overlay sheets'), b = HTML.indexOf('/* ---------- theme:', a);
  assert.ok(a > 0 && b > a, 'shell code found in index.html');
  vm.runInNewContext(HTML.slice(a, b), ctx);
  const flush = () => { while (timers.length) timers.shift()(); };
  const shown = () => doc.body.kids.filter(e => !e.cl().includes('r2-parked') && !e.cl().includes('off') && e !== legacy);
  return { R2, doc, El, flush, shown, legacy };
}
const HOWS = {
  x: (t, ov) => t.R2.close(ov),                                           // the X (data-r2="close" delegation) and the bottom X (world-home closeTop)
  swipe: (t, ov) => t.R2.close(ov),                                       // apple-ui drag down ends in R2.close(ov)
  backdrop: (t, ov) => ov.querySelector('.r2-scrim').click(),             // tap outside
  escape: (t) => t.R2.close(t.R2.top()),                                  // Escape and Android / browser back (section-nav sends Escape)
  code: (t) => t.R2.close()                                               // a module closing "the top sheet" with no argument
};

test('a sheet opened from a sheet replaces it: one visible, the parent parked and inert, a back chevron on the new one', () => {
  const t = rig();
  const a = t.R2.sheet('<h3>Fuel</h3>', { cls: 'a' });
  assert.strictEqual(a.querySelector('.r2-pback-row'), null, 'no chevron with no parent');
  const b = t.R2.sheet('<h3>Log a meal</h3>', { cls: 'b' });
  assert.ok(a.classList.contains('r2-parked') && a.inert && a.getAttribute('aria-hidden') === 'true');
  assert.deepStrictEqual(t.shown(), [b]);
  assert.strictEqual(t.R2.openCount(), 1);
  assert.strictEqual(t.R2.top(), b);
  const row = b.querySelector('.r2-sh').kids.find(k => k.cl().includes('r2-pback-row'));
  assert.ok(row && row.kids[0].cl().includes('r2-pback'), 'chevron row sits in the sheet, above the body');
  assert.ok(b.querySelector('.r2-sh').kids.indexOf(row) < b.querySelector('.r2-sh').kids.indexOf(b.querySelector('.r2-shb')));
});

for (const [how, act] of Object.entries(HOWS)) {
  test('closing the new sheet by ' + how + ' leaves zero sheets: the parked parent closes too, onClose runs for both', () => {
    const t = rig(); const seen = [];
    t.R2.sheet('<h3>Fuel</h3>', { onClose: () => seen.push('fuel') });
    const b = t.R2.sheet('<h3>Log a meal</h3>', { onClose: () => seen.push('log') });
    act(t, b); t.flush();
    assert.strictEqual(t.R2.openCount(), 0); assert.strictEqual(t.R2.top(), null);
    assert.deepStrictEqual(t.shown(), [], 'nothing left in the page');
    assert.strictEqual(t.doc.body.querySelectorAll('.r2-ov').length, 0, 'parked sheets are removed, not left hidden');
    assert.deepStrictEqual(seen.sort(), ['fuel', 'log']);
  });
}

test('the back chevron brings the parent back, and closing that leaves zero', () => {
  const t = rig();
  const a = t.R2.sheet('<h3>Misty</h3>'); const b = t.R2.sheet('<h3>Glow</h3>');
  b.querySelector('.r2-pback').click(); t.flush();
  assert.deepStrictEqual(t.shown(), [a]); assert.ok(!a.classList.contains('r2-parked') && !a.inert && a.getAttribute('aria-hidden') === null);
  assert.strictEqual(t.R2.top(), a);
  t.R2.close(a); t.flush();
  assert.strictEqual(t.R2.openCount(), 0); assert.deepStrictEqual(t.shown(), []);
});

test('three deep: back steps one level, X from any level closes all of them', () => {
  const t = rig();
  const a = t.R2.sheet('A'), b = t.R2.sheet('B'), c = t.R2.sheet('C');
  assert.deepStrictEqual(t.shown(), [c]);
  t.R2.back(c); t.flush();
  assert.deepStrictEqual(t.shown(), [b]); assert.ok(b.querySelector('.r2-pback'), 'B keeps its own way back to A');
  t.R2.close(b); t.flush();
  assert.strictEqual(t.R2.openCount(), 0); assert.deepStrictEqual(t.shown(), []); assert.ok(!a.isConnected);
});

test('a page stays under a sheet; a page opened from a sheet parks the sheet and closing the page lands on the page under it', () => {
  const t = rig();
  const page = t.R2.sheet('Recipe', { full: true }); const s = t.R2.sheet('Portion');
  assert.ok(!page.classList.contains('r2-parked'), 'full pages are never parked');
  assert.strictEqual(s.querySelector('.r2-pback'), null, 'nothing parked, so no chevron');
  HOWS.backdrop(t, s); t.flush();
  assert.deepStrictEqual(t.shown(), [page]);
  const list = t.R2.sheet('All classics'); const recipe = t.R2.sheet('Recipe 2', { full: true });
  assert.ok(list.classList.contains('r2-parked')); assert.strictEqual(recipe.querySelector('.r2-pback'), null, 'pages bring their own header');
  t.R2.close(recipe); t.flush();
  assert.deepStrictEqual(t.shown(), [page], 'back on the first page, the list sheet is gone');
});

test('a module that closes the parent itself before opening the next one still ends with zero', () => {
  const t = rig();
  const a = t.R2.sheet('Fuel'); t.R2.close(a); const b = t.R2.sheet('Log a meal');
  assert.strictEqual(b.querySelector('.r2-pback'), null);
  t.R2.close(b); t.flush(); assert.deepStrictEqual(t.shown(), []);
  const c = t.R2.sheet('Parent'), d = t.R2.sheet('Child'); t.R2.close(c);
  assert.strictEqual(d.querySelector('.r2-pback'), null, 'the chevron goes when its parent is gone');
  t.R2.close(d); t.flush(); assert.strictEqual(t.R2.openCount(), 0);
});

test('sheets drawn by their own modules join the stack: Forms over Misty parks Misty; its X closes both; its back brings Misty back', () => {
  const t = rig();
  const misty = t.R2.sheet('Misty', { cls: 'wh-ms-ov mh-ov' });
  const forms = new t.El('div', 'cf-ov'); const panel = new t.El('div', 'cf-panel'); forms.appendChild(panel); t.doc.body.appendChild(forms);
  assert.ok(misty.classList.contains('r2-parked'), 'Misty is parked under Forms');
  assert.strictEqual(t.R2.top(), forms); assert.ok(panel.querySelector('.r2-pback'), 'Forms gets the back chevron in its panel');
  forms.remove(); t.flush();                                             // Forms closes itself (its own X)
  assert.strictEqual(t.R2.openCount(), 0); assert.deepStrictEqual(t.shown(), []);
  const m2 = t.R2.sheet('Misty'); const f2 = new t.El('div', 'cf-ov'); f2.appendChild(new t.El('div', 'cf-panel')); t.doc.body.appendChild(f2);
  t.R2.back(f2); t.flush();                                              // no LowiCompanion here, so close falls back to removing it
  assert.ok(!f2.isConnected); assert.deepStrictEqual(t.shown(), [m2]);
  t.R2.close(m2); t.flush(); assert.deepStrictEqual(t.shown(), []);
});

test('a shell sheet opened over a module sheet (Last meal over Gap) replaces it, and closing ends with zero', () => {
  const t = rig();
  const gap = new t.El('div', 'gv-ov'); const x = new t.El('button', 'gv-x'); x.attrs['data-gv'] = 'close'; x.addEventListener('click', () => gap.remove()); gap.appendChild(x); t.doc.body.appendChild(gap);
  const s = t.R2.sheet('Log a meal');
  assert.ok(gap.classList.contains('r2-parked'));
  HOWS.escape(t); t.flush();
  assert.ok(!gap.isConnected, 'the module sheet was closed with its own close'); assert.deepStrictEqual(t.shown(), []); assert.strictEqual(t.R2.openCount(), 0);
});

test('the old #sheetwrap sheet closes when a shell sheet opens', () => {
  const t = rig(); t.legacy.classList.add('open'); t.R2.sheet('x'); assert.ok(!t.legacy.classList.contains('open'));
});

test('wiring: parked is hidden whole, the chevron has its style, every module sheet layer is in the stack list, the live walk covers the paths', () => {
  const css = read('one-sheet.css');
  assert.match(css, /\.r2-parked\s*\{\s*display:\s*none\s*!important/);
  assert.match(css, /\.r2-pback\s*\{/);
  const a = HTML.indexOf('const FOREIGN = ['), b = HTML.indexOf('];', a); const list = HTML.slice(a, b);
  for (const [file, cls] of [['companion.js', 'cf-ov'], ['gap-view.js', 'gv-ov'], ['fast-edit.js', 'fe-ov'], ['herb-shop.js', 'hs-ov'], ['cell-room.js', 'cr-ov'], ['store-picks.js', 'stp-ov'], ['grocery-hunt.js', 'gh-ov'], ['your-details.js', 'yd-ov'], ['body-stats.js', 'bs-ov']]) {
    assert.ok(read(file).includes(cls), file + ' still draws .' + cls);
    assert.ok(list.includes('".' + cls + '"'), '.' + cls + ' joins the one-sheet stack');
  }
  const live = read('tests/sheet-replace-live.cjs');
  for (const p of ['Fuel sheet > Log a meal', "Today's stats > Log a meal", "Misty's sheet > Forms", "Misty's sheet > Glow", 'Profile hub > Weight journey', 'Gap sheet > last meal time', 'Gap sheet > Log a meal', 'Move sheet > pick a move']) assert.ok(live.includes(p), 'live walk covers ' + p);
  assert.ok(!/R2\.close = function\(ov\)\{?\s*\n\s*const i = ov \? ovStack\.findIndex\(x => x\.ov === ov\) : ovStack\.length - 1;/.test(HTML), 'the old close-one-only shell is gone');
});
