/* A phone notification for each Nibblo meal post (25 Oct 2026). Emmanuel: "I did not get a notification when this bot
   messaged in the chat room. That's the whole point of this." Found: Nibblo was built to post quietly; nothing on the
   server ever asked n1-push to send anything for its posts (and pillar A skips bot accounts on purpose). Now a database
   trigger on nibblo_log pings n1-push (action "nibblo"), which sends each fresh post once, in the phone's language, to
   people whose "Nibblo's meals" switch is on, outside quiet hours, one per slot, at most three a day. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const load = () => import(pathToFileURL(path.join(ROOT, 'supabase/functions/n1-push/nibblo.ts')).href);
const pil = () => import(pathToFileURL(path.join(ROOT, 'supabase/functions/n1-push/pillars.ts')).href);
const logic = () => import(pathToFileURL(path.join(ROOT, 'supabase/functions/n1-push/logic.ts')).href);
const N = require('../nibblo-core.js');

/* Mon 26 Oct 2026, Berlin is UTC+1 (winter time from 25 Oct) */
const at = (d, hh, mm = 0) => Date.parse(`2026-10-${d}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+01:00`);
const row = o => Object.assign({ endpoint: 'https://web.push.apple.com/abc', p256dh: 'x', auth: 'y', lang: 'de', tz: 'Europe/Berlin', qs: 22, qe: 7, freq: 'normal', enabled: true, pillars: { a: true, b: true, c: true, d: true, n: true }, uid: '83077af7-4f6e-4d58-a3d1-10f1a7a2b001' }, o);
const dish = (day, s) => N.pick(day, s).dish;
const post = (day, s, t) => ({ id: N.msgId(day, s), rec: N.bookId(dish(day, s).r), dish: dish(day, s).name[0], at: t });

test('a fresh Nibblo meal goes to a phone with the switch on, in its language, naming the real dish, tap opens that post', async () => {
  const { decideNibblo } = await load();
  for (const [l, i] of [['de', 1], ['en', 0], ['es', 2]]) for (const [s, hh, mm] of [['m', 7, 30], ['n', 12, 30], ['e', 18, 30]]) {
    const p = post('20261026', s, at(26, hh, mm));
    const n = decideNibblo(row({ lang: l }), at(26, hh, mm + 1), p);
    assert.ok(n, l + s);
    assert.equal(n.id, 'nb-' + s);
    assert.ok(n.title.startsWith('Nibblo · '), n.title);
    assert.ok(n.body.includes(dish('20261026', s).e + ' ' + dish('20261026', s).name[i]), l + ': ' + n.body);
    assert.ok(!/\{f\}/.test(n.body) && n.body.length <= 140, n.body);
    assert.equal(n.q, 'nb:' + p.id);
  }
  const de = decideNibblo(row(), at(26, 12, 31), post('20261026', 'n', at(26, 12, 30)));
  assert.equal(de.title, 'Nibblo · Mittagessen');
  const es = decideNibblo(row({ lang: 'es' }), at(26, 18, 31), post('20261026', 'e', at(26, 18, 30)));
  assert.equal(es.title, 'Nibblo · Cena');
});

test('respectful: the switch, quiet hours, app open, one per slot, three a day (few: one), only while fresh', async () => {
  const { decideNibblo } = await load();
  const p = post('20261026', 'n', at(26, 12, 30)), t = at(26, 12, 31);
  assert.equal(decideNibblo(row({ pillars: { a: true, b: true, c: true, d: true, n: false } }), t, p), null, 'switch off');
  assert.ok(decideNibblo(row({ pillars: { a: true, b: true, c: true, d: true } }), t, p), 'saved by the app before the switch existed: on by default');
  assert.equal(decideNibblo(row({ pillars: null }), t, p), null, 'a subscription from before the pillars: nothing until the app is opened once');
  assert.equal(decideNibblo(row({ enabled: false }), t, p), null, 'notifications off');
  assert.equal(decideNibblo(row({ qs: 12, qe: 14 }), t, p), null, 'quiet hours');
  assert.equal(decideNibblo(row({ tz: 'America/Los_Angeles' }), t, p), null, '04:31 in Los Angeles: quiet hours on that phone');
  assert.equal(decideNibblo(row({ seen: t - 30000 }), t, p), null, 'the app is open on that phone: it sees the post in Chat');
  assert.equal(decideNibblo(row({ sent_day: '2026-10-26', sent_ids: ['nb-n'] }), t, p), null, 'that slot already sent');
  assert.equal(decideNibblo(row({ sent_day: '2026-10-26', sent_ids: ['nb-m', 'nb-e', 'nb-x'] }), t, p), null, 'three a day at most');
  assert.equal(decideNibblo(row({ freq: 'few', sent_day: '2026-10-26', sent_ids: ['nb-m'] }), t, p), null, 'how often: few = one a day');
  assert.ok(decideNibblo(row({ sent_day: '2026-10-25', sent_ids: ['nb-m', 'nb-n', 'nb-e'] }), t, p), 'yesterday does not count');
  assert.ok(decideNibblo(row({ sent_day: '2026-10-26', sent_ids: ['a', 'd', 'fastDone'] }), t, p), 'other pushes do not use up Nibblo');
  assert.equal(decideNibblo(row(), at(26, 14, 5), p), null, 'more than 90 minutes old: never announced late');
  assert.equal(decideNibblo(row({ uid: N.UID }), t, p), null, 'never to the bot itself');
  assert.equal(decideNibblo(row(), t, { id: 'm123', at: at(26, 12, 30) }), null, 'only Nibblo meal posts');
});

test('Nibblo does not eat the pillar budget, and after it the pillars keep their gap', async () => {
  const { used } = await pil();
  const { after } = await logic();
  assert.equal(used(row({ sent_day: '2026-10-26', sent_ids: ['nb-m', 'nb-n', 'a'] }), '2026-10-26'), 1);
  const o = after(row(), { id: 'nb-n', title: 'Nibblo', body: 'x', q: 'nb:nb-20261026-n', ttl: 7200 }, at(26, 12, 31));
  assert.deepEqual(o.sent_ids, ['nb-n']); assert.equal(o.last_push, at(26, 12, 31));
});

test('the dish names come from nibblo-core.js (generated file in sync), unknown dishes fall back to the stored name', async () => {
  const gen = require('../tools/lis-push/gen-nibblo-words.cjs');
  assert.equal(read('supabase/functions/n1-push/nibblo-words.ts'), gen.build(), 'run node tools/lis-push/gen-nibblo-words.cjs');
  const { nbDish, NB_UID } = await load();
  assert.equal(NB_UID, N.UID);
  for (const s of Object.keys(N.MENU)) for (const d of N.MENU[s]) assert.equal(nbDish(N.bookId(d.r), d.name[0], 'es'), d.e + ' ' + d.name[2]);
  assert.equal(nbDish('rb_unknown', 'Mystery <b>Bowl</b>', 'de').includes('<'), false);
});

test('the edge function: action "nibblo" claims each post once, cron is the fallback, tests only reach one account', () => {
  const fn = read('supabase/functions/n1-push/index.ts');
  assert.match(fn, /nibblo_log\?pushed_at=is\.null&posted_at=gte\." \+ since \+ "&select=id",\s*\{ method: "PATCH"/, 'claimed once (pushed_at)');
  assert.match(fn, /if \(!b\.dry\) \{ try \{ await nibblo\(\); \}/, 'cron fallback');
  assert.match(fn, /if \(b\.a === "nbtest"\) return key \? await nbtest\(b\) : J\(\{ ok: false \}, 401\);/, 'test push needs the cron key');
  assert.match(fn, /uid=eq\." \+ uid \+ "&limit=10"/, 'test push: one account only');
  assert.match(fn, /for \(const k of \["a", "b", "c", "d", "n"\]\)/, 'the switch is stored');
  assert.match(fn, /\.replace\(\/\^nb-\.\*\/, "nb"\)/, 'one Nibblo notification at a time on the lock screen (same tag)');
  assert.match(fn, /messages\?select=id,created_at&id=eq\." \+ id/, 'a deleted post is not announced');
});

test('the database pings n1-push only when a slot is really posted, and Nibblo\'s own SQL stays untouched', () => {
  const sql = read('supabase/proposals/nibblo_push_20261025.sql');
  assert.match(sql, /alter table public\.nibblo_log add column if not exists pushed_at timestamptz;/);
  assert.match(sql, /update public\.nibblo_log set pushed_at = now\(\) where pushed_at is null and posted_at < now\(\);/, 'older posts never announced late');
  assert.match(sql, /create trigger nibblo_push_ping after insert on public\.nibblo_log\s+for each row execute function public\.nibblo_push_ping\(\);/);
  assert.match(sql, /body := '\{"a":"nibblo"\}'::jsonb/);
  assert.match(sql, /exception when others then null;/, 'a failed ping never blocks the post');
  assert.doesNotMatch(read('supabase/proposals/nibblo_meals_20261025.sql'), /net\.http|push|notify|webhook/i);
});

test('the app: a fifth switch in EN/DE/ES, sent with the subscription; a tap opens Chat at that post', () => {
  const js = read('lis-push.js');
  assert.match(js, /const ORDER = \["d", "c", "n", "a", "b"\];/);
  assert.equal((js.match(/\bn:"[^"]+", nSub:"[^"]+"/g) || []).length, 3, 'labels in EN, DE, ES');
  const store = {}, docEl = { lang: 'de' }, clicks = [], timers = [];
  const W = { localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } }, document: null, setTimeout: (f) => { timers.push(f); return 1; } };
  const D = { documentElement: docEl, readyState: 'complete', addEventListener() {}, getElementById: () => null, querySelector: () => null };
  W.document = D; W.window = W;
  W.lowiOpen = t => clicks.push('tab:' + t); W.cmSeg = v => clicks.push('seg:' + v);
  W.LowiNibblo = { openRecipe: id => clicks.push('recipe:' + id) };
  new Function('window', 'document', 'localStorage', 'setTimeout', js)(W, D, W.localStorage, W.setTimeout);
  assert.deepEqual(Object.keys(W.LisPush.pillars()), ['d', 'c', 'n', 'a', 'b']);
  assert.equal(W.LisPush.extra().pillars.n, true, 'on by default, sent with the subscription');
  W.LisPush.setPillar('n', false); assert.equal(W.LisPush.extra().pillars.n, false);
  assert.match(W.LisPush.pillarHTML(), /data-lisp="n"[^>]*role="switch" aria-checked="false"><span class="lisp-t"><b>Nibblos Mahlzeiten<\/b>/);
  assert.equal(W.LisPush.route('nb:nb-20261026-n'), true);
  while (timers.length) timers.shift()();
  assert.deepEqual(clicks, ['tab:foryou', 'seg:chat', 'recipe:nb-20261026-n']);
  assert.equal(W.LisPush.route('nb:"]evil'), false, 'only real Nibblo ids');
});
