'use strict';
/* Oct 17 (E-man: "it's telling me to move ... I don't want to. It should be start, move, or skip"): the Daily Quest can skip the
   current quest for today. Runs the real board script (index.html #f3js) in a VM with the app's own data shapes. A skip is not a
   completion: no XP, no claim, the counter stays, the all-six bonus still needs it. The board moves on, doing it later still counts,
   Start takes the skip back, and the skip list belongs to one day. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const cut = id => { const a = html.indexOf('<script id="' + id + '">'); assert.ok(a > 0, id); const b = html.indexOf('</script>', a); return html.slice(html.indexOf('>', a) + 1, b); };
const F3 = cut('f3js');
const J = x => JSON.parse(JSON.stringify(x === undefined ? null : x));
const pad = n => String(n).padStart(2, '0'), dk = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

function boot(o) {
  o = o || {};
  const t = dk(new Date()), store = new Map(), awards = [], events = [];
  const ls = {getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k)};
  ls.setItem('lowi_fast_v1', JSON.stringify({water: {[t]: 2}, last: Date.now() - 13 * 36e5}));
  if (o.moved) ls.setItem('lowispike.move.v1', JSON.stringify({sessions: [{day: t, moved: o.moved}]}));
  const S = {streak: {last: t}, quests: {day: t, done: {checkin: 1}}, logs: o.meal ? [{day: t, ts: Date.now(), t: 'Quark'}] : [], ledger: []};
  const doc = {readyState: 'complete', getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, documentElement: {classList: {contains: () => false}}, hidden: false};
  const win = {dispatchEvent: e => { events.push(e); return true; }};
  const ctx = {window: win, document: doc, localStorage: ls, S, award: (n, why, a, b, id) => { awards.push(id); return n; }, CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
    MutationObserver: function () { this.observe = () => {}; this.disconnect = () => {}; }, requestAnimationFrame: () => 0, setTimeout: () => 0, setInterval: () => 0, console, Date, JSON, Math, String, Array, Object, Number};
  vm.createContext(ctx); vm.runInContext(F3, ctx);
  return {F: win.LowiF3, ls, S, awards, events, t};
}

test('3/6 with Move next: Skip moves the board on without completing Move', () => {
  const {F, awards, ls} = boot({meal: true});
  const L0 = F.state();
  assert.deepEqual(J(L0.filter(q => q.done).map(q => q.id)), ['checkin', 'water', 'fast', 'eat']);
  F.claim('all'); const paid = awards.length;
  assert.equal(F.next().id, 'move');
  assert.equal(F.skip('move'), true);
  const L = F.state(), mv = L.find(q => q.id === 'move');
  assert.equal(mv.done, false); assert.equal(mv.skip, true);
  assert.equal(L.filter(q => q.done).length, 4, 'counter unchanged');
  assert.equal(F.next().id, 'post');
  assert.equal(F.claimXP(), 0, 'nothing to claim for a skip');
  assert.equal(F.claim('move'), 0); assert.equal(awards.length, paid, 'no XP paid');
  assert.deepEqual(JSON.parse(ls.getItem('lowi.f3.skip')).ids, ['move']);
});

test('only skipped quests left: no next quest, but no all-six bonus either', () => {
  const {F, awards} = boot({meal: true});
  F.claim('all'); F.skip('move'); F.skip('post');
  assert.equal(F.next(), undefined);
  assert.equal(F.claimXP(), 0);
  assert.ok(!awards.some(id => /^f3all:/.test(id)), 'bonus not paid');
  assert.deepEqual(J(F.skipped()), ['move', 'post']);
});

test('moving later still completes a skipped quest, and it can be claimed', () => {
  const a = boot({meal: true}); a.F.skip('move');
  const b = boot({meal: true, moved: 11 * 60}); b.ls.setItem('lowi.f3.skip', a.ls.getItem('lowi.f3.skip'));
  const mv = b.F.state().find(q => q.id === 'move');
  assert.equal(mv.done, true); assert.equal(mv.skip, false);
  assert.ok(b.F.claimable().some(q => q.id === 'move'));
});

test('Start on a skipped quest and Undo take the skip back', () => {
  const {F} = boot({meal: true});
  F.skip('move'); F.skip('post');
  F.go('move');
  assert.deepEqual(J(F.skipped()), ['post']);
  assert.equal(F.next().id, 'move');
  F.unskip();
  assert.deepEqual(J(F.skipped()), []);
});

test('a skip belongs to one day and only to known quests', () => {
  const {F, ls} = boot();
  ls.setItem('lowi.f3.skip', JSON.stringify({day: '2000-01-01', ids: ['move']}));
  assert.deepEqual(J(F.skipped()), []);
  assert.equal(F.skip('nope'), false);
  assert.deepEqual(J(F.skipped()), []);
});

test('board: Skip pill on the current quest, a calm skipped card, Skipped rows, EN/DE/ES', () => {
  const a = F3.indexOf('function html()'), h = F3.slice(a, F3.indexOf('let lastH', a));
  assert.ok(h.includes('data-f3="skip"') && h.includes('f3-pill') && h.includes('w("skipA", {q:cur.t})'));
  assert.ok(h.includes('data-f3="unskip"') && h.includes('w("skipped")') && h.includes('w("skippedS")'));
  assert.ok(h.includes('q.skip ? " skip" : ""') && h.includes('w("skipT")'));
  assert.ok(F3.includes('if (a.dataset.f3 === "skip")') && F3.includes('if (a.dataset.f3 === "unskip")'));
  for (const k of ['skip:"Skip"', 'skip:"Auslassen"', 'skip:"Saltar"', 'unskip:"Undo skip"', 'unskip:"Zurückholen"', 'unskip:"Deshacer"']) assert.ok(F3.includes(k), k);
});

test('nudges never nag a skipped quest, and skipped is never "all done"', () => {
  const n = cut('n1Js');
  assert.ok(n.includes('const open = L.filter(q => !q.done && !q.skip)'));
  assert.ok(n.includes('if (!open.length) return L.some(q => !q.done) || seen("clear") ? null'));
  assert.ok(html.includes('return cur ? w("lead").split("{q}").join(cur.t) : L.some(q => !q.done) ? "" : w("leadDone")'));
});
