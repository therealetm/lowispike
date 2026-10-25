/* Phone notifications, four pillars (25 Oct 2026). Emmanuel: nobody ever got a companion push. Found: the service worker
   (since Oct 14, herb companion) ignored every push payload and showed nothing unless a herb reminder was due, while the
   n1-push function kept sending to 11 iPhone subscriptions every morning. Now: the worker shows what the server sends, the
   server knows four pillars (A For You, B product, C energy received, D own companion), and the app sends the account,
   the companion name and which pillars are on. These tests pin the server rules (pillars.ts) and the wiring. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const load = () => import(pathToFileURL(path.join(ROOT, 'supabase/functions/n1-push/pillars.ts')).href);
const logic = () => import(pathToFileURL(path.join(ROOT, 'supabase/functions/n1-push/logic.ts')).href);

/* Sat 24 Oct 2026, Berlin (UTC+2 until 25 Oct 03:00) */
const at = (d, hh, mm = 0) => Date.parse(`2026-10-${d}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+02:00`);
const row = o => Object.assign({ endpoint: 'https://web.push.apple.com/abc', p256dh: 'x', auth: 'y', lang: 'de', tz: 'Europe/Berlin', qs: 22, qe: 7, freq: 'normal', enabled: true, pillars: { a: true, b: true, c: true, d: true }, cn: 'Misty' }, o);
const POSTS = [{ id: 'p1', who: 'Niklas', cap: 'Just ate: Panang chicken curry', user_id: 'u-n', at: at(23, 12) }];
const PRODS = [{ id: 'x1', name: 'Skyr Natur', brand: 'Milsani', store: 'Aldi', verdict: 'better' }];

test('D: the companion speaks only on days the app was not opened, never in quiet hours, with the real day count', async () => {
  const { decidePillar } = await load();
  const r = row({ seen: at(21, 20) });
  const n = decidePillar(r, at(24, 15));
  assert.equal(n.id, 'd'); assert.equal(n.title, 'Misty'); assert.equal(n.q, 'home');
  assert.ok(!/\{[a-z]\}/.test(n.body), 'every placeholder filled: ' + n.body);
  if (/\d/.test(n.body)) assert.match(n.body, /\b2\b/, 'the day count is the real one (2 full days since Wed 20:00)');
  assert.equal(decidePillar(row({ seen: at(24, 9) }), at(24, 15)), null, 'opened today: no companion push');
  assert.equal(decidePillar(r, at(24, 23)), null, 'quiet hours');
  assert.equal(decidePillar(r, at(24, 8)), null, 'before 10:00');
  assert.equal(decidePillar(row({ seen: at(21, 20), pillars: { d: false, a: false, b: false } }), at(24, 15)), null, 'pillar switched off');
});

test('D backs off when ignored and stops after ten misses or a month away', async () => {
  const { decidePillar, afterPillar, misses } = await load();
  const base = row({ seen: at(20, 20) });
  const sent = decidePillar(base, at(24, 11));
  const r2 = Object.assign({}, base, afterPillar(base, sent, at(24, 11)), { sent_day: '2026-10-24', sent_ids: ['d'], last_push: at(24, 11) });
  assert.equal(r2.d_miss, 1);
  assert.equal(decidePillar(r2, at(24, 18)), null, 'once a day');
  assert.equal(misses(Object.assign({}, r2, { seen: at(24, 12) })), 0, 'opening the app resets the misses');
  const m3 = row({ seen: at(10, 20), d_miss: 3, last_d: at(23, 11) });
  assert.equal(decidePillar(m3, at(24, 15)), null, '3 misses: every 3 days');
  const m10 = row({ seen: at(10, 20), d_miss: 10, last_d: at(20, 11) });
  assert.equal(decidePillar(m10, at(24, 15)), null, '10 misses: stop');
  const far = row({ seen: Date.parse('2026-09-01T10:00:00Z') });
  assert.equal(decidePillar(far, at(24, 15)), null, 'a month away: stop');
});

test('D tone escalates by days away: 1, 2-3, 4-7, 8+ (the last letter)', async () => {
  const { decidePillar, DW } = await load();
  const tierOf = body => Object.keys(DW.en).find(t => DW.en[t].some(s => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].some(d => s.split('{d}').join(String(d)).split('{c}').join('Misty') === body)));
  assert.equal(tierOf(decidePillar(row({ lang: 'en', seen: at(23, 9) }), at(24, 15)).body), 't1');
  assert.equal(tierOf(decidePillar(row({ lang: 'en', seen: at(18, 9) }), at(24, 15)).body), 't3');
  assert.equal(tierOf(decidePillar(row({ lang: 'en', seen: at(12, 9) }), at(24, 15)).body), 't4');
});

test('A: For You at meal times from a real post, never the person\'s own post; B: a rated product at shopping times', async () => {
  const { decidePillar } = await load();
  const r = row({ seen: at(24, 9) });
  const a = decidePillar(r, at(24, 12, 15), { posts: POSTS, products: PRODS });
  assert.equal(a.id, 'a'); assert.equal(a.q, 'foryou');
  assert.match(a.body, /Panang chicken curry/); assert.match(a.body, /Niklas/); assert.ok(!/Just ate/.test(a.body));
  assert.equal(decidePillar(row({ seen: at(24, 9), uid: 'u-n' }), at(24, 12, 15), { posts: POSTS }), null, 'own post');
  assert.equal(decidePillar(r, at(24, 15), { posts: POSTS }), null, 'not a meal time');
  const b = decidePillar(r, at(24, 10), { posts: [], products: PRODS });
  assert.equal(b.id, 'b'); assert.equal(b.q, 'scan');
  assert.match(b.body, /Milsani Skyr Natur/); assert.match(b.body, /bei Aldi/); assert.match(b.body, /bessere Wahl/);
  assert.ok(!/geh einkaufen|go shopping/i.test(b.body), 'never "go shopping now"');
  assert.equal(decidePillar(row({ seen: Date.parse('2026-10-26T09:00:00+01:00') }), Date.parse('2026-10-26T10:00:00+01:00'), { products: PRODS }), null, 'Monday is not a shopping slot');
  assert.equal(decidePillar(row({ seen: at(24, 9), pillars: null }), at(24, 12, 15), { posts: POSTS, products: PRODS }), null, 'rows from before the pillars get companion and energy only');
});

test('daily budget by how often, minimum gap, and energy outside the budget with its own cap of 3', async () => {
  const { decidePillar, energyOpen, energyNudge, energyNow } = await load();
  const ctx = { posts: POSTS, products: PRODS };
  const few = row({ freq: 'few', seen: at(24, 9), sent_day: '2026-10-24', sent_ids: ['b'], last_push: at(24, 10) });
  assert.equal(decidePillar(few, at(24, 17, 30), ctx), null, 'few: one a day');
  const gap = row({ seen: at(24, 9), sent_day: '2026-10-24', sent_ids: ['b'], last_push: at(24, 11, 30) });
  assert.equal(decidePillar(gap, at(24, 12, 15), ctx), null, 'normal: 2 hours apart');
  const q = row({ seen: at(24, 9), sent_day: '2026-10-24', sent_ids: ['a', 'b'], energy_q: [{ n: 'Antje', at: at(24, 23) }, { n: 'Lisa', at: at(24, 23, 30) }] });
  const e = decidePillar(q, at(25, 8));
  assert.equal(e.q, 'community'); assert.match(e.body, /Antje und 1 weitere haben Misty Energie geschickt/);
  assert.equal(energyOpen(row({}), at(24, 23)), false, 'quiet hours: energy waits');
  assert.equal(energyOpen(row({ energy_day: '2026-10-24', energy_n: 3 }), at(24, 15)), false, 'cap of 3 a day');
  assert.equal(energyOpen(row({ last_e: at(24, 14, 50) }), at(24, 15)), false, 'half-hour bundling');
  assert.equal(energyOpen(row({ pillars: { c: false } }), at(24, 15)), false, 'pillar off');
  assert.equal(energyOpen(row({}), at(24, 15)), true);
  assert.match(energyNow(row({ lang: 'es' }), 'Antje').body, /Antje acaba de mandar energía a Misty/);
  assert.match(energyNudge(row({ lang: 'en' }), ['Antje']).body, /Antje sent Misty energy while you were away/);
});

test('every text exists in English, German and Spanish, without body talk or invented food logs', async () => {
  const { DW, PW } = await load();
  for (const l of ['en', 'de', 'es']) {
    for (const t of ['t1', 't2', 't3', 't4']) assert.ok(DW[l][t].length >= 2, l + ' ' + t);
    for (const k of ['a', 'bBetter', 'bOk', 'at', 'e1', 'eN', 'e2']) assert.ok(PW[l][k], l + ' ' + k);
  }
  const all = JSON.stringify([DW, PW]);
  assert.ok(!/\b(fat|weight|kilo|dick|gewicht|gordo|peso|big mac|burger|pizza|du hast .* gegessen|you ate)\b/i.test(all), 'no body talk, no claims about what someone ate');
});

test('the morning hello and the evening streak saver are gone; fast end and close your day stay', async () => {
  const { decide } = await logic();
  const r = row({ seen: at(23, 9), qe: 6, open: 6, total: 6, day: '2026-10-23' });
  assert.equal(decide(r, at(24, 7)), null, 'no morning hello');
  assert.equal(decide(r, at(24, 19, 15)), null, 'no evening streak saver');
  const f = decide(row({ fast_last: at(24, 0), fast_h: 14 }), at(24, 14, 10));
  assert.equal(f.id, 'fastDone');
});

test('the service worker shows what the server sends and is never silent', () => {
  const sw = read('sw.js');
  const h = sw.slice(sw.indexOf('addEventListener("push"'), sw.indexOf('addEventListener("notificationclick"'));
  assert.match(h, /e\.data\.json\(\)/, 'reads the payload');
  assert.match(h, /showNotification\(/);
  assert.match(h, /herbReminderClaim/, 'the herb reminder stays as a fallback');
  assert.match(h, /fallback|LOWiSPIKE/, 'an empty push still shows something (iOS revokes silent pushes)');
  const c = sw.slice(sw.indexOf('addEventListener("notificationclick"'));
  assert.match(c, /\?n1go=/, 'a cold start keeps where the push wanted to go');
});

test('the server ties a subscription to the login, limits energy per pair, and keeps test accounts among themselves', () => {
  const fn = read('supabase/functions/n1-push/index.ts');
  assert.match(fn, /\/auth\/v1\/user/);
  assert.match(fn, /b\.a === "energy"/);
  assert.match(fn, /6 \* 36e5/);
  assert.match(fn, /rp\.bot \|\| \(rp\.test && !\(sp && sp\.test\)\)/);
  const sql = read('supabase/proposals/n1_push_pillars_20261025.sql');
  assert.match(sql, /uid uuid references auth\.users\(id\) on delete cascade/);
  assert.match(sql, /revoke all on public\.n1_energy_log from anon, authenticated/);
});

test('the app sends the login, the companion name and the four pillar switches, and exposes the energy hook', () => {
  const js = read('lis-push.js');
  assert.match(js, /energySent/);
  assert.match(js, /a: *"energy"/);
  assert.match(js, /pillars/);
  assert.match(js, /access_token/);
  for (const w of ['For You', 'Energie', 'Energ\\u00eda', 'Produkt', 'Producto']) assert.ok(js.includes(w), w);
  const html = read('index.html');
  assert.match(html, /<script src="lis-push\.js[^"]*" defer><\/script>/);
});
