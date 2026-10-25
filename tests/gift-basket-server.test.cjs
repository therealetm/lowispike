'use strict';
/* Oct 25 2026 Give a hand, server side: the spike word list and Ko-fi rule the live database enforces
   (supabase/proposals/gift_baskets_20261025.sql, applied 25 Oct 2026) match the app and never refuse a food the app accepts. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ROOT = path.join(__dirname, '..');
const D = require('../tools/gift-basket/deny.cjs');
const C = require('../gift-basket-core.js');
const P = require('../food-policy-core.js');
const SQL = fs.readFileSync(path.join(ROOT, 'supabase/proposals/gift_baskets_20261025.sql'), 'utf8');

test('server SQL carries exactly the word list and exceptions from tools/gift-basket/deny.cjs', () => {
  assert.ok(SQL.includes("~* '" + D.SQL_RE + "'"), 'gift_items_ok uses SQL_RE');
  assert.ok(SQL.includes("regexp_replace(e.x->>'n', '" + D.EXCEPT_RE + "', ' ', 'gi')"), 'gift_items_ok strips EXCEPT_RE first');
  assert.ok(/add constraint gift_items_low_spike check \(public\.gift_items_ok\(items\)\)/.test(SQL));
});

test('server Ko-fi rule refuses the same dashboard paths as the app', () => {
  const m = SQL.match(/ko-fi\\\.com\/\(([^)]+)\)\$'\)/);
  assert.ok(m, 'gift_kofi_page constraint present');
  assert.deepEqual(m[1].split('|').sort(), C.KOFI_RESERVED.slice().sort());
  assert.ok(C.KOFI_RESERVED.includes('manage'));
});

test('spike foods the app refuses are refused by the server list too', () => {
  for (const n of ['Cola', 'Toastbrot', 'Bananen', 'Plátano', 'Süßigkeiten', 'Apfelsaft', 'azúcar', 'Gummibärchen', 'Pizza', 'Kräuterlikör', 'white bread', 'Brötchen']) {
    assert.equal(D.refused(n), true, n);
    assert.notEqual(P.rateName(n).verdict, 'JA', 'app refuses ' + n + ' as well');
  }
});

test('staples and look-alike words stay allowed (sugar snap peas, pork, honeydew, ham, rump steak)', () => {
  for (const n of ['Eier', 'Eggs', 'Brokkoli', 'Zuckerschoten', 'Schweinefilet', 'Honigmelone', 'Jamón', 'Rumpsteak', 'Naturjoghurt ohne Zucker', 'Pechuga de pollo', 'Olivenoel']) assert.equal(D.refused(n), false, n);
});

test('every food string in the app that the app rates low-spike passes the server list', () => {
  const out = execFileSync(process.execPath, [path.join(ROOT, 'tools/gift-basket/deny-corpus.cjs')], { encoding: 'utf8' });
  const r = JSON.parse(out.trim().split('\n').pop());
  assert.ok(r.corpus > 1000 && r.ja > 100, 'corpus is real');
  assert.deepEqual(r.jaRefused, []);
  assert.deepEqual(r.mustRefuseMissed, []);
});
