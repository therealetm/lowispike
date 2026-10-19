'use strict';
/* Oct 19 (Emmanuel, call): care gestures are free and the sparks currency is gone. No "3/5 sparks today" counter, no
   cost on any kind or on the Send button, no "Not enough sparks" block, no earning or midnight reset, in EN/DE/ES, on
   every entry point that opens the care sheet (Community profile "Send energy", friends tree, Adventure log Friends).
   What stays: one send per friend, kind and day; level unlocks; time windows; the small XP reward for caring (earned,
   never spent); XP and energy are never touched by sending care. The "Spark" companion form is a different thing. */
const test = require('node:test');
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const coreSrc = read('micro-book-core.js'), uiSrc = read('micro-book.js');

/* a tiny browser: enough for micro-book.js to boot, open the care sheet and send */
function boot(opts) {
  opts = opts || {};
  const sheets = [], events = [], handlers = {};
  const el = () => { const e = { style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, getAttribute() { return null; }, appendChild(c) { return c; }, remove() {}, querySelector() { return null; }, querySelectorAll() { return []; }, offsetWidth: 0, isConnected: true }; return e; };
  const today = new Date();
  const state = opts.state || { ledger: [], care: { sent: {}, spent: { [ledgerDay(today)]: 99 }, out: [], seen: {}, inbox: {} } };
  const D = { readyState: 'complete', documentElement: { lang: 'en' }, body: el(), head: el(), hidden: false,
    getElementById() { return null; }, createElement: el, querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener(type, fn) { (handlers[type] = handlers[type] || []).push(fn); } };
  const W = { document: D, setTimeout() { return 0; }, setInterval() { return 0; }, clearTimeout() {}, requestAnimationFrame() { return 0; },
    matchMedia: () => ({ matches: true }), getComputedStyle: () => ({ position: 'relative' }),
    addEventListener() {}, dispatchEvent(ev) { events.push(ev); return true; },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    LowiLang: { get: () => opts.lang || 'en' },
    LowiVitalsBridge: { state: () => state, save() {} },
    LowiHost: { level: () => opts.level || 1, user: () => ({ name: 'Emmanuel' }) },
    LowiCellRoom: { friends: () => opts.friends || [{ uid: 'friendLena01', n: 'Lena' }, { uid: 'friendJonas2', n: 'Jonas' }] },
    LowiR2: { sheet(html) { const ov = el(); ov.html = html; sheets.push(ov); return ov; }, close() {} } };
  W.window = W;
  const ctx = vm.createContext(Object.assign(W, { console, Date, Math, JSON, Object, Array, String, Number, Set, Map, RegExp, Promise }));
  vm.runInContext(coreSrc, ctx);
  vm.runInContext(uiSrc, ctx);
  const click = mb => (handlers.click || []).forEach(fn => fn({ target: { closest: () => ({ dataset: { mb }, closest: () => null, getAttribute: () => null }) }, preventDefault() {}, stopPropagation() {} }));
  return { W, state, sheets, events, click };
}
function ledgerDay(d) { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
const SPARK_WORDS = /spark|Funken|chispa|mb-sparks|mb-spk/i;

test('core: no sparks budget, no cost on any kind, and a zero balance never blocks', () => {
  const C = require('../micro-book-core.js');
  for (const k of ['sparks', 'SPARK_BASE', 'SPARK_MAX']) assert.strictEqual(C[k], undefined, k + ' is gone');
  assert.ok(C.CARE.length === 6 && C.CARE.every(k => !('cost' in k)), 'all six kinds, none with a cost');
  const f = { uid: 'friendLena01', n: 'Lena' }, day = '2026-10-19';
  for (const k of C.CARE) {
    const hour = k.from == null ? 12 : k.from;
    const r = C.canCare({ sent: {} }, f, k, { day, level: 99, hour, left: 0 });
    assert.ok(r.ok, k.id + ' can be sent with no balance at all');
    assert.notStrictEqual(r.why, 'sparks');
  }
});

test('kept: one per friend, kind and day; level unlocks; time windows', () => {
  const C = require('../micro-book-core.js');
  const f = { uid: 'friendLena01', n: 'Lena' }, day = '2026-10-19', hug = C.CARE.find(k => k.id === 'hug');
  const r = C.canCare({ sent: {} }, f, hug, { day, level: 1, hour: 10 });
  assert.strictEqual(C.canCare({ sent: { [r.id]: 1 } }, f, hug, { day, level: 1, hour: 10 }).why, 'sent');
  assert.strictEqual(C.canCare({}, f, C.CARE.find(k => k.id === 'thanks'), { day, level: 2, hour: 10 }).why, 'locked');
  assert.strictEqual(C.canCare({}, f, C.CARE.find(k => k.id === 'cheer'), { day, level: 4, hour: 10 }).why, 'locked');
  assert.strictEqual(C.canCare({}, f, C.CARE.find(k => k.id === 'night'), { day, level: 1, hour: 10 }).why, 'time');
});

for (const lang of ['en', 'de', 'es']) {
  test('care sheet (' + lang + '): no spark counter, cost or "not enough" note, Send is a plain button', () => {
    const b = boot({ lang, level: 1 });
    assert.ok(b.W.LowiMicroBook.openCare('friendLena01'), 'sheet opens');
    const html = b.sheets[b.sheets.length - 1].html;
    assert.ok(!SPARK_WORDS.test(html), 'no sparks anywhere on the care sheet: ' + (html.match(SPARK_WORDS) || [])[0]);
    assert.ok(/data-mb="send">[^<]+<\/button>/.test(html), 'Send is enabled and carries only its word');
    assert.ok(!/·\s*\d/.test(html), 'no "· 1" price on the button');
  });
  test('Friends tab (' + lang + '): no spark counter, the intro says it is free', () => {
    const b = boot({ lang });
    b.W.LowiMicroBook.open('fr');
    const html = b.sheets[b.sheets.length - 1].html;
    assert.ok(!SPARK_WORDS.test(html), 'no sparks on the Friends tab');
    assert.ok(/free|kostet nichts|gratis/i.test(html), 'the intro says care is free');
  });
}

test('sending far more than the old budget (max 8 a day) works, and spends nothing', () => {
  const friends = [1, 2, 3].map(i => ({ uid: 'friendNo000' + i, n: 'Friend ' + i }));
  const b = boot({ level: 99, friends });
  const before = JSON.stringify(b.state.ledger);
  let sent = 0;
  for (const f of friends) {
    for (let i = 0; i < 6; i++) {
      b.W.LowiMicroBook.openCare(f.uid);
      const html = b.sheets[b.sheets.length - 1].html;
      if (!/data-mb="send"/.test(html)) break; /* every kind open right now already sent to this friend */
      b.click('send');
      sent++;
    }
  }
  assert.ok(sent >= 12, 'at least 4 kinds x 3 friends went out with no logs today (old budget: 3), got ' + sent);
  assert.strictEqual(Object.keys(b.state.care.sent).length, sent);
  assert.strictEqual(b.state.care.out.length, sent);
  assert.ok(!('spent' in b.state.care), 'the old spent counter is dropped, nothing is recorded as spent');
  assert.strictEqual(JSON.stringify(b.state.ledger), before, 'sending care never takes XP or energy from the ledger');
  assert.strictEqual(b.events.filter(e => e.type === 'lowi:care-sent').length, sent, 'the earned care XP event still fires (xp-tap caps it at 3 a day)');
});

test('source: no spark copy or styles left for the care sheet, the care XP reward is unchanged', () => {
  assert.ok(!/sparkIco|noSpark|tr\('sparks'|C\.sparks|\.cost\b|spent\[/.test(uiSrc));
  assert.ok(!/\.mb-sparks|\.mb-spk/.test(read('micro-book.css') + read('style-sweep.css')));
  assert.ok(/care: \{ amt: 5, perDay: 3, src: 'care-sent' \}/.test(read('xp-tap-core.js')), 'caring still earns its small XP');
  assert.ok(!/LowiMicroBook\.sparks/.test(read('community-chat.js') + read('cell-room.js')));
});

test('galaxy energy bursts stay free: firing never spends anything', () => {
  const en = read('community-energy.js');
  assert.ok(!/LowiMicroBook|canCare|spent|sparks\(/.test(en));
});
