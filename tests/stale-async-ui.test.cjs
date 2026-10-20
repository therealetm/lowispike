// Oct 20, 2026, bug hunt run 18 (BH-018, pattern "async result painted into stale UI").
// The product search on the Scan tab ("Or find a product…") waits on the community database before it opens its results sheet.
// Pressing Search twice (double Enter, or a second tap while "Searching…" waits) or fixing a typo and searching again opened
// one results sheet per search, stacked: the same results had to be closed twice, and the older search could land on top.
// Sibling: "Be the first to add it" waits on the server too; if the card was closed or the next product scanned meanwhile, the
// old code stamped "caught" on the new product's card, and a manual add painted the old product over it.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function fnSrc(s, sig) {
  const i = s.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
  let d = 0; const j = s.indexOf('{', i);
  for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } }
  throw new Error('unclosed ' + sig);
}
function varLine(name) { const m = src.match(new RegExp('\\nlet ' + name + '\\b[^\\n]*')); return m ? m[0] : 'let ' + name + ' = 0, NS_OV = null;'; }

/* a tiny R2: sheets are objects in a stack; close marks them "off" like the real one does while they slide away */
function r2() {
  const stack = [], all = [];
  const R2 = {
    sheet(html, opts) { const cls = new Set(['r2-ov']); const ov = { html, opts: opts || {}, isConnected: true, classList: { contains: c => cls.has(c), add: c => cls.add(c) } }; stack.push(ov); all.push(ov); return ov; },
    close(ov) { const i = stack.indexOf(ov); if (i < 0) return; stack.splice(i, 1); ov.classList.add('off'); try { ov.opts.onClose && ov.opts.onClose(); } catch (e) { } },
  };
  return { R2, live: () => stack.filter(o => !o.classList.contains('off')), all };
}

function searchRig() {
  const R = r2(), waits = [];
  const out = { innerHTML: '' };
  const ctx = { R2: R.R2, $: s => (s === '#b3NameOut' ? out : null), esc: x => String(x), t: k => k, LI: () => 0, IC: { bc: '', plate: '' }, window: {},
    cardMini: () => '', whyText: () => '', rateName: () => null,
    searchName: q => new Promise(r => waits.push({ q, go: () => r([]) })), res: {} };
  vm.createContext(ctx);
  const ns = fnSrc(src, 'async function nameSearch(q)');
  const decl = /\bNS_SEQ\b/.test(src) ? varLine('NS_SEQ') : '';
  vm.runInContext(decl + '\n' + ns + '\nres.nameSearch = nameSearch;', ctx);
  return { R, waits, run: q => ctx.res.nameSearch(q), titles: () => R.live().map(o => (o.html.match(/class="h2">([^<]*)</) || [])[1]) };
}
const tick = () => new Promise(r => setImmediate(r));

test('Search pressed twice while the first search is still waiting opens ONE results sheet', async () => {
  const g = searchRig();
  const a = g.run('apfel'), b = g.run('apfel');
  g.waits.forEach(w => w.go()); await a; await b; await tick();
  assert.deepStrictEqual(g.titles(), ['apfel'], 'live result sheets: ' + JSON.stringify(g.titles()));
});

test('a corrected search replaces the older one, even when the older answer arrives last', async () => {
  const g = searchRig();
  const a = g.run('apfl'), b = g.run('apfelsaft');
  g.waits[1].go(); await b; await tick();
  g.waits[0].go(); await a; await tick();
  assert.deepStrictEqual(g.titles(), ['apfelsaft'], 'only the newest search may show: ' + JSON.stringify(g.titles()));
});

test('a new search while an older results sheet is still open replaces it; a single search still opens its sheet', async () => {
  const g = searchRig();
  const a = g.run('banane'); g.waits[0].go(); await a; await tick();
  assert.deepStrictEqual(g.titles(), ['banane']);
  const b = g.run('birne'); g.waits[1].go(); await b; await tick();
  assert.deepStrictEqual(g.titles(), ['birne'], 'old results sheet left stacked under the new one: ' + JSON.stringify(g.titles()));
});

/* catch: the server answer arrives after the card that asked for it is gone */
function el(name, kids) {
  const cls = new Set(), node = { name, kids: kids || [], parent: null, isConnected: true, innerHTML: '', outerHTMLSet: null,
    classList: { contains: c => cls.has(c), add: c => cls.add(c), remove: c => cls.delete(c), has: c => cls.has(c) },
    contains(n) { for (let x = n; x; x = x.parent) if (x === node) return true; return false; },
    closest(sel) { for (let x = node; x; x = x.parent) if (sel.split(',').some(s => x.sel === s.trim())) return x; return null; },
    set outerHTML(v) { node.outerHTMLSet = v; }, disabled: false };
  node.kids.forEach(k => { k.parent = node; });
  return node;
}
function sheetWith(manual) {
  const btn = el('btn'); const acts = el(manual ? 'man' : 'acts', [btn]); acts.sel = manual ? '.b3-man' : '.b3-acts';
  if (manual) acts.classList.add('b3-man'); else acts.classList.add('b3-acts');
  const card = el('card'); card.sel = '#b3Card'; const rev = el('rev', [card, acts]); rev.sel = '.b3-rev';
  const ov = el('ov', [rev]); return { ov, btn, acts, card, rev };
}
function catchRig() {
  let release; const ctx = { REV: null, D: { mine: {} }, window: {}, res: {},
    sfx() { }, buzz() { }, esc: x => String(x), t: k => k, sct: k => k, myName: () => 'me', curTab: () => 'home', renderTab() { },
    pkey: p => p.k, slim: p => p, pfAward: () => 100, pfCountText: () => 'badge', cardHTML: () => 'CARD', swapsHTML: () => '',
    CustomEvent: function () { }, doCatch: () => new Promise(r => { release = () => r({ first: true, pending: false }); }) };
  ctx.window.dispatchEvent = () => { };
  ctx.$ = (s, root) => { const f = n => { if (n.sel === s) return n; for (const k of n.kids) { const r = f(k); if (r) return r; } return null; }; return root ? f(root) : null; };
  vm.createContext(ctx);
  vm.runInContext(fnSrc(src, 'async function catchCur(btn, p)') + '\nres.catchCur = catchCur;', ctx);
  return { ctx, go: () => release() };
}

for (const manual of [false, true]) {
  test('catch (' + (manual ? 'manual add' : 'Be the first') + '): answer after the next product was scanned leaves the NEW card alone', async () => {
    const g = catchRig(); const A = sheetWith(manual), B = sheetWith(manual);
    g.ctx.REV = A.ov;
    const run = g.ctx.res.catchCur(A.btn, { k: 'a', barcode: '4000000000001' });
    A.ov.classList.add('off'); g.ctx.REV = B.ov; /* closed A, scanned product B */
    g.go(); await run;
    assert.ok(!B.card.classList.has('caught'), 'product B card stamped "caught" for product A');
    assert.strictEqual(B.rev.innerHTML, '', 'product A painted over product B card');
    assert.strictEqual(B.acts.outerHTMLSet, null, 'product B buttons replaced');
  });
}

test('catch: when the card is still the one that asked, the burst and the caught stamp still show', async () => {
  const g = catchRig(); const A = sheetWith(false);
  g.ctx.REV = A.ov;
  const run = g.ctx.res.catchCur(A.btn, { k: 'a', barcode: '4000000000001' });
  g.go(); await run;
  assert.ok(A.card.classList.has('caught'), 'caught stamp missing');
  assert.ok(A.acts.outerHTMLSet && /b3-caught first/.test(A.acts.outerHTMLSet), 'Pathfinder burst missing');
});
