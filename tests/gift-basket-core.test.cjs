'use strict';
/* Oct 25 2026 Give a hand: payment links, basket rules, the verified-badge maths and the 7-day rules. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../gift-basket-core.js');
const P = require('../food-policy-core.js');
const rate = n => P.rateName(n);
const ROOT = path.join(__dirname, '..');
const DAY = C.DAY;
const T0 = Date.parse('2026-10-25T10:00:00Z');

test('payment link: the three allowed kinds are accepted and made canonical', () => {
  assert.deepEqual(C.payLink('https://ko-fi.com/lena_k'), { ok: true, url: 'https://ko-fi.com/lena_k', kind: 'kofi' });
  assert.deepEqual(C.payLink('  ko-fi.com/lena_k/ '), { ok: true, url: 'https://ko-fi.com/lena_k', kind: 'kofi' });
  assert.equal(C.payLink('https://www.ko-fi.com/lena?ref=x#top').url, 'https://www.ko-fi.com/lena');
  assert.equal(C.payLink('https://buy.stripe.com/aEU5kE8x0bC2').kind, 'stripe');
  assert.equal(C.payLink('https://buy.stripe.com/test_aEU5kE8x0bC2').ok, true);
  assert.equal(C.payLink('https://donate.stripe.com/7sI5kE8x0bC2').ok, true);
  assert.deepEqual(C.payLink('https://paypal.me/lenak'), { ok: true, url: 'https://paypal.me/lenak', kind: 'paypal' });
  assert.equal(C.payLink('https://paypal.me/lenak/25,50EUR').url, 'https://paypal.me/lenak/25.50EUR');
  assert.equal(C.payLink('HTTPS://KO-FI.COM/Lena').url, 'https://ko-fi.com/Lena');
});

test('payment link: everything else is refused (scheme, host look-alikes, dashboards, logins, other pages)', () => {
  const bad = {
    '': 'empty', 'http://ko-fi.com/lena': 'https', 'javascript:alert(1)': 'https', 'data:text/html,hi': 'https',
    'https://ko-fi.com.evil.com/lena': 'host', 'https://evil.com/ko-fi.com/lena': 'host', 'https://checkout.stripe.com/c/pay/cs_x': 'host',
    'https://stripe.com/de': 'host', 'https://paypal.com/paypalme/lena': 'host', 'https://www.paypal.me.evil.io/x': 'host', 'lena': 'host',
    'https://ko-fi.com/Manage/': 'path', 'https://ko-fi.com/manage': 'path', 'https://ko-fi.com/lena/posts': 'path', 'https://ko-fi.com/': 'path',
    'https://buy.stripe.com/short': 'path', 'https://buy.stripe.com/abc/def12345': 'path', 'https://paypal.me/': 'path',
    'https://user:pw@paypal.me/lena': 'format', 'https://ko-fi.com:8443/lena': 'format', 'https://ko-fi.com/le na': 'format'
  };
  for (const [u, why] of Object.entries(bad)) {
    const r = C.payLink(u);
    assert.equal(r.ok, false, u);
    assert.equal(r.why, why, u);
  }
  assert.equal(C.payLink('https://ko-fi.com/' + 'a'.repeat(41)).ok, false);
});

test('payment link: the server check constraint is the same pattern, and every accepted link passes it', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase/proposals/gift_baskets_20261025.sql'), 'utf8');
  assert.ok(sql.includes("pay_url ~ '" + C.PAY_RE_SQL + "'"), 'SQL check uses PAY_RE_SQL');
  const re = new RegExp(C.PAY_RE_SQL);
  ['https://ko-fi.com/lena_k', 'https://buy.stripe.com/test_aEU5kE8x0bC2', 'https://paypal.me/lenak/25.50EUR', 'https://www.ko-fi.com/lena']
    .forEach(u => { assert.equal(C.payLink(u).ok, true, u); assert.ok(re.test(C.payLink(u).url), u); });
  assert.equal(re.test('https://ko-fi.com/lena?x=1'), false);
  assert.equal(re.test('http://ko-fi.com/lena'), false);
});

test('only low-spike foods go in a basket (the app\'s own rating, all three languages)', () => {
  ['Eggs', 'Eier', 'Huevos', 'Broccoli', 'Brokkoli', 'Naturjoghurt', 'Lachs', 'Salmon', 'Tofu'].forEach(n => assert.equal(C.itemCheck(n, rate).ok, true, n));
  ['Cola', 'Nutella', 'Toast', 'white bread', 'bananas', 'Haferflocken'].forEach(n => {
    const r = C.itemCheck(n, rate); assert.equal(r.ok, false, n); assert.equal(r.why, 'spike', n);
  });
  assert.equal(C.itemCheck('xqzw blorp', rate).why, 'unknown');
  assert.equal(C.itemCheck(' ', rate).why, 'empty');
  assert.equal(C.itemCheck('Eggs', null).ok, false, 'no rating, no basket');
});

test('every staple the panel offers is low-spike in its language', () => {
  const src = fs.readFileSync(path.join(ROOT, 'gift-basket.js'), 'utf8');
  const block = src.slice(src.indexOf('const STAPLES = ['), src.indexOf('];', src.indexOf('const STAPLES = [')));
  const names = [...block.matchAll(/'([^']+)'/g)].map(m => m[1]).map(s => JSON.parse('"' + s + '"'));
  assert.ok(names.length >= 45);
  names.forEach(n => assert.equal(C.itemCheck(n, rate).ok, true, n));
});

test('build: a basket needs food, a total between 5 and 150 euros and a valid link; spike food is dropped', () => {
  const r = C.build({ items: ['Eier', 'Cola', 'eier', 'Brokkoli'], firstName: 'Lena <b>', city: ' Flensburg ', total: '24,50 €', payUrl: 'ko-fi.com/lena_k' }, rate);
  assert.equal(r.ok, true);
  assert.deepEqual(r.row, { first_name: 'Lena b', anon: false, city: 'Flensburg', items: [{ n: 'Eier' }, { n: 'Brokkoli' }], total_eur: 24.5, pay_url: 'https://ko-fi.com/lena_k' });
  const a = C.build({ items: ['Eggs'], anon: true, firstName: 'Lena', total: '20', payUrl: 'https://paypal.me/lena' }, rate);
  assert.equal(a.row.first_name, null, 'anonymous never sends a name');
  assert.equal(a.row.anon, true);
  assert.deepEqual(C.build({ items: ['Cola'], total: '4', payUrl: 'https://ko-fi.com/manage' }, rate).errors, ['items', 'total', 'link']);
  assert.deepEqual(C.build({ items: ['Eggs'], total: '151', payUrl: 'https://ko-fi.com/lena' }, rate).errors, ['total']);
  assert.equal(C.build({ items: Array.from({ length: 20 }, () => 'Eggs').concat(['Tofu', 'Lachs', 'Spinat', 'Gurke', 'Tomaten', 'Paprika', 'Avocado', 'Mandeln', 'Tofu', 'Brokkoli', 'Thunfisch', 'Skyr', 'Feta']), total: '50', payUrl: 'https://ko-fi.com/lena' }, rate).row.items.length, C.MAX_ITEMS);
  assert.equal(C.total('5'), 5); assert.equal(C.total('150'), 150); assert.equal(C.total('1e3'), null); assert.equal(C.total('-10'), null);
});

test('view: a stored link that fails the check is never shown, and names follow the anonymous switch', () => {
  const v = C.view({ id: 'b1', user_id: 'u1', first_name: 'Lena', anon: true, items: [{ n: 'Eier' }, { x: 1 }], total_eur: '20.00', pay_url: 'https://evil.example/pay' });
  assert.equal(v.link, ''); assert.equal(v.name, ''); assert.deepEqual(v.items, ['Eier']); assert.equal(v.total, 20);
  assert.equal(C.view(null), null);
});

const helped = (o) => Object.assign({ id: 'x', helped: T0, receipt: 0, verdict: '' }, o);

test('7-day rules: receipt window, giver window, auto-verify, missed', () => {
  assert.equal(C.status({ helped: 0 }, T0), 'open');
  assert.equal(C.status(helped(), T0 + 6 * DAY), 'await-receipt');
  assert.equal(C.status(helped(), T0 + 7 * DAY), 'await-receipt', 'exactly 7 days is still in time');
  assert.equal(C.status(helped(), T0 + 7 * DAY + 1), 'missed');
  const r = helped({ receipt: T0 + 6 * DAY });
  assert.equal(C.status(r, T0 + 12 * DAY), 'await-verdict', 'the giver gets 7 days from the receipt');
  assert.equal(C.status(r, T0 + 13 * DAY + 1), 'auto-verified', 'unanswered for 7 days counts as verified');
  assert.equal(C.status(helped({ receipt: T0 + DAY, verdict: 'mismatch' }), T0 + 30 * DAY), 'mismatch');
  assert.equal(C.status(helped({ receipt: T0 + DAY, verdict: 'verified' }), T0 + 2 * DAY), 'verified');
  assert.equal(C.canReceipt(helped(), T0 + DAY), true);
  assert.equal(C.canReceipt(helped({ receipt: T0 + DAY }), T0 + DAY), false);
  assert.equal(C.canVerdict(r, T0 + 7 * DAY), true);
  assert.equal(C.canVerdict(r, T0 + 14 * DAY), false);
  assert.equal(C.daysLeft(helped(), T0 + 2.5 * DAY), 5);
  assert.equal(C.daysLeft(helped(), T0 + 6.9 * DAY), 1);
  assert.equal(C.daysLeft(helped(), T0 + 8 * DAY), 0);
});

test('verified %: verified / counted, "new" until one counts, pending never counts', () => {
  const now = T0 + 40 * DAY;
  assert.deepEqual(C.trust([], now), { counted: 0, verified: 0, pending: 0, pct: null, label: 'new' });
  assert.equal(C.trust([helped({ helped: now - DAY })], now).label, 'new', 'a fresh helped basket is pending, not a free 100%');
  const ok = helped({ receipt: T0 + DAY, verdict: 'verified' });
  assert.deepEqual(C.trust([ok], now), { counted: 1, verified: 1, pending: 0, pct: 100, label: 'pct' });
  const missed = helped({});
  const bad = helped({ receipt: T0 + DAY, verdict: 'mismatch' });
  const auto = helped({ receipt: T0 + DAY });
  const pending = helped({ helped: now - DAY });
  const t = C.trust([ok, ok, auto, missed, pending], now);
  assert.deepEqual([t.counted, t.verified, t.pending, t.pct], [4, 3, 1, 75]);
  assert.equal(C.trust([ok, bad], now).pct, 50);
  assert.equal(C.trust([ok, ok, bad], now).pct, 66, 'rounds down, so only a clean record shows 100%');
  assert.equal(C.trust([missed], now).pct, 0, 'a miss with nothing verified shows 0%, not New');
  assert.equal(C.trust([{ helped: 0 }], now).label, 'new', 'open baskets do not count');
  const nine = Array.from({ length: 9 }, () => ok);
  assert.equal(C.trust(nine.concat([missed]), now).pct, 90, 'one slip lowers a perfect record');
});

test('fromCounts (the server gift_trust counts) gives the same badge', () => {
  assert.deepEqual(C.fromCounts(4, 3, 1), { counted: 4, verified: 3, pending: 1, pct: 75, label: 'pct' });
  assert.equal(C.fromCounts(0, 0, 2).label, 'new');
  assert.equal(C.fromCounts(2, 5, 0).pct, 100, 'never above 100%');
  assert.equal(C.fromCounts(-1, 'x', null).label, 'new');
});

test('the SQL score and windows use the same 7-day rules', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase/proposals/gift_baskets_20261025.sql'), 'utf8');
  assert.equal(C.WINDOW_DAYS, 7);
  assert.ok((sql.match(/interval '7 days'/g) || []).length >= 8);
  assert.match(sql, /create or replace function public\.gift_trust/);
  assert.match(sql, /now\(\) > b\.receipt_at \+ interval '7 days'/);
  assert.match(sql, /'gift-receipts', 'gift-receipts', false/);
  assert.doesNotMatch(sql, /stripe_account|acct_|card_number|stripe\.accounts/i);
});

test('care board: one event per basket, never per euro', () => {
  assert.equal(C.careEventId('abc'), 'gift:abc');
  const src = fs.readFileSync(path.join(ROOT, 'gift-basket.js'), 'utf8');
  assert.match(src, /W\.award\(10, .*C\.careEventId\(id\)\)/);
  assert.doesNotMatch(src, /award\([^)]*total/);
});

test('money never passes through LOWiSPIKE: no payment form, no Stripe.js, links open outside with noopener', () => {
  const src = fs.readFileSync(path.join(ROOT, 'gift-basket.js'), 'utf8');
  assert.doesNotMatch(src, /js\.stripe\.com|Stripe\(|cardNumber|<iframe/i);
  assert.match(src, /target="_blank" rel="noopener noreferrer external"/);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(html.indexOf('gift-basket-core.js') < html.indexOf('gift-basket.js?'), 'core loads first');
  assert.ok(html.indexOf('gift-basket.js?') < html.indexOf('store-picks.js?'), 'loaded before Shop asks for the entry');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.match(sw, /STATIC\.push\("gift-basket-core\.js", "gift-basket\.js", "gift-basket\.css"\)/);
});
