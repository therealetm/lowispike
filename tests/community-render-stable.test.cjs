'use strict';
/* Oct 19, Community crash round 2 (E-man, iPhone: "kicked me out" while scrolling the chat and while sending energy with
   ~60 crowd members in the galaxy). Probe on the live site: every paint rebuilt the whole galaxy and the whole chat list
   (~22k SVG nodes) because companion drawings got fresh ids from a global counter, so the `__html` guards never held. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'community-chat.js'), 'utf8');
const fn = name => { const a = src.indexOf('function ' + name + '('); assert.ok(a >= 0, name); let i = src.indexOf('{', a), d = 0; for (; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}' && --d === 0) break; } return src.slice(a, i + 1); };

test('the same companion draws as the same HTML on every paint (no counter ids leak into the galaxy or chat)', () => {
  let seq = 0;
  const ctx = { W: { LowiCompanion: { friendSVG: (g, k) => '<svg><defs><radialGradient id="lh' + (++seq) + 'glow_' + k + '"/></defs><circle fill="url(#lh' + seq + 'glow_' + k + ')"/></svg>' } }, D: { querySelector: () => null },
    scope: 'u-me', own: () => ({ n: 'Me' }), genomeFor: id => ({ id }), spirit: () => '<svg class="cp-spirit"></svg>' };
  ctx.W.LowiHerbTamagotchi = { current: () => ({ m: {}, p: 'p' }), plantHTML: () => '<svg class="tmg-plant"><defs><linearGradient id="lh' + (++seq) + 'leaf"/></defs><path fill="url(#lh' + seq + 'leaf)"/></svg>' };
  vm.createContext(ctx);
  vm.runInContext('var W=this.W,D=this.D,scope=this.scope,own=this.own,genomeFor=this.genomeFor,spirit=this.spirit;let ownArt={at:0,svg:""};' + fn('ownMisty') + fn('stableIds') + fn('mate') + ';this.mate=mate;', ctx);
  const a = ctx.mate('u-friend-1234', 'g2'), b = ctx.mate('u-friend-1234', 'g2');
  assert.strictEqual(a, b, 'friend drawing is stable');
  assert.match(a, /id="lhcufriend1234glow_g2"/); assert.match(a, /url\(#lhcufriend1234glow_g2\)/);
  assert.notStrictEqual(ctx.mate('u-friend-1234', 'g2'), ctx.mate('u-other-9', 'g3'), 'two people stay apart');
  const m1 = ctx.mate('u-me', 'g0'); ctx.W.Date = Date; const m2 = ctx.mate('u-me', 'g0');
  assert.strictEqual(m1, m2, 'your own drawing is stable'); assert.doesNotMatch(m1, /\blh\d/);
});

/* a tiny DOM: enough for patchKids (childNodes, firstChild, nextSibling, insertBefore, removeChild, template parsing) */
function fakeDom() {
  let made = 0;
  const el = { kids: [], __parts: null,
    get childNodes() { return this.kids.slice(); }, get firstChild() { return this.kids[0] || null; },
    insertBefore(n, ref) { if (n.parentNode) n.parentNode.removeChild(n); const i = ref ? this.kids.indexOf(ref) : this.kids.length; this.kids.splice(i < 0 ? this.kids.length : i, 0, n); n.parentNode = this; },
    removeChild(n) { const i = this.kids.indexOf(n); if (i >= 0) this.kids.splice(i, 1); n.parentNode = null; }, set innerHTML(v) { throw new Error('innerHTML must not be used'); } };
  const proto = { get nextSibling() { const p = this.parentNode; if (!p) return null; return p.kids[p.kids.indexOf(this) + 1] || null; } };
  const node = h => { made++; const n = Object.create(proto); n.h = h; n.parentNode = null; return n; };
  const D = { createElement: () => { const t = { content: { childNodes: [] } }; Object.defineProperty(t, 'innerHTML', { set(h) { t.content.childNodes = h.split(/(?=<x )/).filter(Boolean).map(node); } }); return t; } };
  return { el, D, made: () => made };
}

test('a new message only adds its own row; every other row keeps its live elements', () => {
  const { el, D, made } = fakeDom();
  const ctx = { D }; vm.createContext(ctx); vm.runInContext('var D=this.D;' + fn('patchKids') + ';this.patchKids=patchKids;', ctx);
  const P = ctx.patchKids;
  P(el, ['<x a>', '<x day><x b>', '<x c>']);
  assert.deepStrictEqual(el.kids.map(k => k.h), ['<x a>', '<x day>', '<x b>', '<x c>']);
  const before = el.kids.slice(), n0 = made();
  P(el, ['<x a>', '<x day><x b>', '<x c>', '<x d>']);
  assert.strictEqual(made() - n0, 1, 'only the new row is parsed');
  assert.deepStrictEqual(el.kids.slice(0, 4), before, 'old rows are the same elements');
  P(el, ['<x a>', '<x day><x b>', '<x c2>', '<x d>']);
  assert.deepStrictEqual(el.kids.map(k => k.h), ['<x a>', '<x day>', '<x b>', '<x c2>', '<x d>']);
  assert.strictEqual(el.kids[0], before[0]); assert.strictEqual(el.kids[2], before[2]);
  P(el, ['<x d>', '<x a>']);
  assert.deepStrictEqual(el.kids.map(k => k.h), ['<x d>', '<x a>'], 'reorder and removal');
  assert.strictEqual(el.kids[1], before[0], 'a moved row is still the same element');
});

test('paint() patches the galaxy and the chat list instead of replacing their innerHTML', () => {
  const paint = fn('paint');
  assert.doesNotMatch(paint, /field\.innerHTML=/); assert.doesNotMatch(paint, /list\.innerHTML=/);
  assert.match(paint, /patchKids\(field,/); assert.match(paint, /patchKids\(list,/);
  assert.match(fn('galaxy'), /parts\.push\(button\(me\?'to-all':off\?'person-off':'person'/);
});

test('E-man: "sent you energy" lines are gone: nothing posts them and old or crowd ones are hidden', () => {
  const m = src.match(/energy\(uid\)\{[\s\S]*?\}\};/); assert.ok(m, 'LowiCgMap.energy');
  assert.doesNotMatch(m[0], /store\.submitLine\(/); assert.doesNotMatch(m[0], /energyPing/);
  const re = new RegExp(src.match(/const ENERGY_LINE=\/(.*)\/u;/)[1], 'u');
  for (const t of ['@Eman ⚡ Damon sent you energy', '@Joseph Castellar ⚡ Thiago M. sent you energy', '⚡ Lena hat dir Energie geschickt', '@Fer ⚡ Paolo H. te envió energía'])
    assert.ok(re.test(t), t);
  for (const t of ['⚡ so much energy today', 'I sent you energy yesterday lol', '@Eman thanks for the energy ⚡', 'sent you energy'])
    assert.ok(!re.test(t), t);
  assert.match(fn('messages'), /filter\(m=>!energyLine\(m\)\)/);
});
