'use strict';
/* Oct 25 2026 (Eman, handoff from the other account): the shopping step's "every x days" number plus weekdays was confusing.
   Now: bubbles Once / Twice / 3 times / More / It varies per week. Weekdays are optional and drive the bubble:
   Tuesday + Saturday = twice a week, with a summary line. Eman often shops Tuesday and Saturday.
   Old saves (a typed number of days) are migrated on read, Profile > About you shows the new summary. DE/EN/ES. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../shop-plan-core.js');

test('frequency bubbles: five choices, a number of days per choice for the glow timing', () => {
  assert.deepStrictEqual(C.FREQS, ['1', '2', '3', 'more', 'varies']);
  assert.strictEqual(C.normalize({ freq: '1' }).every, 7);
  assert.strictEqual(C.normalize({ freq: '2' }).every, 4);
  assert.strictEqual(C.normalize({ freq: '3' }).every, 3);
  assert.strictEqual(C.normalize({ freq: 'more' }).every, 2);
  assert.strictEqual(C.normalize({ freq: 'varies' }).every, null, 'varies never invents a rhythm');
  assert.strictEqual(C.isSet({ freq: 'varies' }), true, 'It varies is an answer');
  assert.strictEqual(C.isSet({}), false);
  assert.strictEqual(C.normalize({ freq: 'often' }).freq, null);
  assert.strictEqual(C.normalize({}).freq, null, 'never a default');
});

test('weekdays count as the frequency: Tuesday + Saturday is twice a week', () => {
  const p = C.normalize({ days: [2, 6] });
  assert.strictEqual(p.freq, '2');
  assert.strictEqual(p.every, 4, 'longest gap Tue->Sat->Tue');
  assert.strictEqual(C.freqFromDays([3]), '1');
  assert.strictEqual(C.freqFromDays([1, 3, 5]), '3');
  assert.strictEqual(C.freqFromDays([1, 2, 3, 5]), 'more');
  assert.strictEqual(C.freqFromDays([]), null);
  assert.strictEqual(C.normalize({ freq: '1', days: [2, 6] }).freq, '2', 'picked days win over a stale bubble');
  assert.strictEqual(C.summary({ days: [2, 6] }, 'en'), 'Twice a week \u00b7 usually Tue, Sat');
  assert.strictEqual(C.summary({ days: [2, 6] }, 'de'), 'Zweimal pro Woche \u00b7 meist Di, Sa');
  assert.strictEqual(C.summary({ days: [2, 6] }, 'es'), 'Dos veces por semana \u00b7 normalmente Mar, S\u00e1b');
});

test('summary line for every bubble in English, German and Spanish', () => {
  const want = {
    en: ['Once a week', 'Twice a week', 'Three times a week', 'More than three times a week', 'It varies'],
    de: ['Einmal pro Woche', 'Zweimal pro Woche', 'Dreimal pro Woche', '\u00d6fter als dreimal pro Woche', 'Unterschiedlich'],
    es: ['Una vez por semana', 'Dos veces por semana', 'Tres veces por semana', 'M\u00e1s de tres veces por semana', 'Var\u00eda']
  };
  for (const l of Object.keys(want)) C.FREQS.forEach((f, i) => assert.strictEqual(C.summary({ freq: f }, l), want[l][i], l + ' ' + f));
});

test('old saves migrate: typed days become the nearest bubble, never stricter; long rhythms are kept as they were', () => {
  const m = e => C.normalize({ v: 1, every: e });
  assert.strictEqual(m(1).freq, 'more');
  assert.strictEqual(m(2).freq, 'more');
  assert.strictEqual(m(3).freq, '2');
  assert.strictEqual(m(4).freq, '2');
  assert.strictEqual(m(7).freq, '1');
  for (let e = 1; e <= 7; e++) assert.ok(m(e).every >= e, 'never stricter than what was typed: ' + e);
  const two = m(14);
  assert.strictEqual(two.freq, 'varies');
  assert.strictEqual(two.every, 14, 'the glow keeps the old 14-day timing');
  assert.strictEqual(C.summary(two, 'en'), 'It varies \u00b7 about every two weeks');
  assert.strictEqual(C.normalize({ v: 1, every: 7, days: [2, 6] }).freq, '2', 'old weekdays win');
  const again = C.normalize(C.normalize({ v: 1, every: 10 }));
  assert.strictEqual(again.every, 10, 'stable when normalized twice');
  assert.strictEqual(C.normalize(Object.assign({}, again, { freq: '1' })).every, 7, 'a new bubble replaces the old number');
  assert.strictEqual(C.normalize(Object.assign({}, C.normalize({ freq: '1' }), { freq: 'varies' })).every, null, 'switching to varies does not keep the weekly number');
});

function page(lang, saved) {
  const store = { 'lowispike.lang': lang };
  if (saved) store['lowispike.shopplan.v1'] = JSON.stringify(saved);
  const doc = { documentElement: { lang }, addEventListener() {}, readyState: 'complete', querySelector: () => null, querySelectorAll: () => [], getElementById: () => null };
  const win = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, LowiGroceryCore: {}, addEventListener() {}, dispatchEvent() {}, document: doc, console, CustomEvent: function () {}, setTimeout, clearTimeout, requestAnimationFrame: () => 0 };
  win.window = win;
  const ctx = vm.createContext(win);
  vm.runInContext(read('shop-plan-core.js'), ctx);
  if (!win.LowiShopPlanCore) win.LowiShopPlanCore = require('../shop-plan-core.js');
  vm.runInContext(read('shop-plan.js'), ctx);
  return { api: win.LowiShopPlan, store };
}

test('the form shows five bubbles and optional days, no number box, nothing picked for a new person', () => {
  for (const l of ['en', 'de', 'es']) {
    const h = page(l).api.formHTML(null, { prefix: 'r2obSp', first: true });
    assert.ok(!/type="number"/.test(h) && !h.includes('spl-num'), l + ': no typed number');
    assert.strictEqual((h.match(/data-spl-freq="/g) || []).length, 5, l + ': five bubbles');
    assert.ok(!/spl-freq on/.test(h), l + ': nothing pre-picked');
    assert.strictEqual((h.match(/data-spl-day="/g) || []).length, 7, l + ': seven days');
    assert.match(h, /role="radiogroup"/);
    assert.match(h, /class="spl-sum"[^>]*aria-live="polite"/);
  }
  const de = page('de').api.formHTML(null, {});
  for (const w of ['Einmal', 'Zweimal', 'Dreimal', '\u00d6fter', 'Unterschiedlich']) assert.ok(de.includes('>' + w + '<'), w);
  const es = page('es').api.formHTML(null, {});
  for (const w of ['Una vez', 'Dos veces', 'Tres veces', 'M\u00e1s', 'Var\u00eda']) assert.ok(es.includes('>' + w + '<'), w);
});

test('Profile > About you: an old typed rhythm opens with its bubble picked and the new summary', () => {
  const { api } = page('en', { v: 1, every: 4, days: [], store: 'Edeka', updated: 1 });
  assert.strictEqual(api.summary(), 'Twice a week \u00b7 at Edeka');
  const h = api.formHTML(null, { prefix: 'splEd' });
  assert.match(h, /class="[^"]*spl-freq on"[^>]*data-spl-freq="2"/);
  const eman = page('de', { v: 1, every: 7, days: [2, 6], store: '', updated: 1 }).api;
  assert.strictEqual(eman.summary(), 'Zweimal pro Woche \u00b7 meist Di, Sa');
});

test('the page wires bubbles and days together and the setup still saves through readForm', () => {
  const s = read('shop-plan.js');
  assert.match(s, /closest\('\[data-spl-freq\]'\)/, 'bubble taps handled');
  assert.match(s, /C\.freqFromDays\(/, 'days pick the bubble');
  assert.match(s, /function syncSum/, 'summary line follows every tap');
  assert.ok(!s.includes("'spl-num'") && !s.includes('.spl-num'), 'old number box code gone');
  const css = read('shop-plan.css');
  assert.match(css, /\.spl-freqs\{/);
  assert.ok(!/\.spl-num\{/.test(css), 'old number box style gone');
});
