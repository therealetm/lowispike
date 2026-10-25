// Nibblo, the inspiration bot, posts a Recipe Book meal to the main Chat AND For You at 07:30, 12:30 and 18:30 Berlin time.
// 25 Oct 2026, Emmanuel: "The bot that's supposed to send pictures into the chat room didn't actually send. That also gets posted
// to the For You page simultaneously, just like a normal human posting what they ate ... morgens, mittags und abends, was ist
// daraus passiert?" Cause: the bot had only ever been a slide each phone drew for itself in For You (inspo-core.js), with
// nothing on the server, so it never wrote to Chat or the shared For You table. Now a real bot account posts from the server
// (pg_cron -> nibblo_tick), and each phone shows the text in its own language.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const N = require('../nibblo-core.js');
const K = require('../community-chat-core.js');
const F = require('../foryou-core.js');
const html = read('index.html');

function recipeBook() {
  const out = {};
  const rx = /n:"([^"]+)"[^\n]{0,400}?r:"(ja|selten|nein)"/g; let m;
  while ((m = rx.exec(html))) if (!out[m[1]]) out[m[1]] = m[2];
  return out;
}
function foodImg() {
  const i = html.indexOf('const FOOD_IMG = ') + 17; let d = 0, j = i;
  for (; j < html.length; j++) { if (html[j] === '{') d++; else if (html[j] === '}') { d--; if (!d) break; } }
  return JSON.parse(html.slice(i, j + 1));
}
const all = () => Object.keys(N.SLOTS).flatMap(s => N.MENU[s].map(d => Object.assign({ slot: s }, d)));

test('three slots a day, Berlin time: breakfast 07:30, lunch 12:30, dinner 18:30', () => {
  assert.deepEqual(N.SLOTS, { m: '07:30', n: '12:30', e: '18:30' });
  assert.equal(N.TZ, 'Europe/Berlin');
  /* winter (CET, UTC+1) and summer (CEST, UTC+2) */
  assert.deepEqual(N.dueSlot(Date.parse('2026-10-26T06:30:00Z')), { day: '20261026', slot: 'm' });
  assert.equal(N.dueSlot(Date.parse('2026-10-26T06:29:00Z')), null);
  assert.deepEqual(N.dueSlot(Date.parse('2026-10-26T11:31:00Z')), { day: '20261026', slot: 'n' });
  assert.deepEqual(N.dueSlot(Date.parse('2026-10-26T17:30:00Z')), { day: '20261026', slot: 'e' });
  assert.deepEqual(N.dueSlot(Date.parse('2027-06-01T05:30:00Z')), { day: '20270601', slot: 'm' });
  assert.equal(N.dueSlot(Date.parse('2026-10-26T22:00:00Z')), null);
});

test('every dish is a Recipe Book recipe with the "ja" verdict and a real photo the app already ships', () => {
  const book = recipeBook(), img = foodImg();
  assert.ok(all().length >= 21, 'at least a week of each meal');
  for (const s of Object.keys(N.SLOTS)) assert.ok(N.MENU[s].length >= 7, s + ' has a week of dishes');
  const seen = new Set();
  for (const d of all()) {
    assert.equal(book[d.r], 'ja', d.r + ' must be a ja recipe');
    const id = N.bookId(d.r);
    assert.ok(fs.existsSync(path.join(ROOT, 'fy-img', id + '.webp')) || /^data:image\/webp;base64,/.test(img[id] || ''), d.r + ' has a photo (' + id + ')');
    assert.match(N.photoFile(d.r), /^meal-nb-[a-z0-9_]{4,74}\.webp$/);
    assert.ok(!seen.has(d.r), d.r + ' only once'); seen.add(d.r);
  }
});

test('owner food rules: no chocolate or cocoa, no sweetened products, no pork, no medical claims', () => {
  const words = all().map(d => [d.r].concat(d.name, d.line).join(' ')).join(' ') + JSON.stringify(N.INTROS);
  assert.doesNotMatch(words, /chocol|cocoa|kakao|cacao|schoko|sugar[- ]free|zuckerfrei|sweeten|süßstoff|pork|schwein|cerdo|bacon|speck|tocino|ham\b|schinken|jamón|cure|heilt|diabetes|reverse/i);
});

test('captions in English, German and Spanish, with the playful voice', () => {
  for (const s of Object.keys(N.SLOTS)) {
    assert.ok(N.INTROS[s].length >= 4);
    for (const t of N.INTROS[s]) { assert.equal(t.length, 3); t.forEach(x => assert.ok(x.trim().length > 8)); assert.notEqual(t[0], t[1]); assert.notEqual(t[0], t[2]); }
  }
  for (const d of all()) for (const k of ['name', 'line']) { assert.equal(d[k].length, 3, d.r + ' ' + k); d[k].forEach(x => assert.ok(x.trim().length > 3)); assert.notEqual(d.line[0], d.line[1]); assert.notEqual(d.line[0], d.line[2]); }
  assert.match(N.INTROS.m.map(t => t[1]).join(' '), /Moin/, 'a bit of Flensburg in German');
});

test('the chat message is exactly what a member\'s meal share writes, and Chat reads it as a low-spike meal from the bot', () => {
  for (const day of ['20261025', '20261026', '20270101']) for (const s of ['m', 'n', 'e']) {
    const b = N.chatBody(day, s, K.mealBody);
    assert.ok(b && b.length <= 600, day + s);
    const ml = K.meal(b, N.UID);
    assert.ok(ml, 'Chat shows it as a meal card');
    assert.equal(ml.lvl, 'low');
    assert.equal(ml.src, N.photoUrl(N.pick(day, s).dish.r));
    assert.equal(K.meal(b, 'someone-else'), null, 'only the bot can post its own photo');
  }
});

test('the dish of the day: same rule as the server (day number since 1 Jan 2026, mod the count)', () => {
  assert.equal(N.dayNum('20260101'), 0);
  assert.equal(N.dayNum('2026-10-25'), 297);
  const p = N.pick('20261025', 'e');
  assert.equal(p.dish, N.MENU.e[297 % N.MENU.e.length]);
  assert.equal(p.intro, N.INTROS.e[297 % N.INTROS.e.length]);
  const week = new Set(); for (let i = 0; i < 7; i++) week.add(N.pick(String(20261026 + i), 'm').dish.r);
  assert.equal(week.size, 7, 'a different breakfast every day of the week');
  assert.equal(N.msgId('2026-10-25', 'e'), 'nb-20261025-e');
  assert.equal(N.postId('20261025', 'e'), 'snb-20261025-e');
});

test('each viewer reads the dish and caption in their own language (Chat)', () => {
  const b = N.chatBody('20261025', 'e', K.mealBody), m = { id: 'nb-20261025-e', uid: N.UID, body: b };
  const ml = K.meal(b, N.UID);
  const de = N.chatMeal(ml, m, 'de'), es = N.chatMeal(ml, m, 'es'), en = N.chatMeal(ml, m, 'en');
  assert.equal(de.name, 'Shirataki-Carbonara'); assert.match(de.caption, /Abendhunger|Feierabend|Abend|Sofa/i);
  assert.equal(es.name, 'Carbonara de shirataki'); assert.match(es.caption, /noche|cena|antojo/i);
  assert.equal(en.caption, ml.caption, 'English is what the server wrote');
  assert.equal(de.src, ml.src); assert.equal(de.lvl, 'low');
  /* anyone else's meal stays as it is */
  assert.equal(N.chatMeal(ml, { id: 'nb-20261025-e', uid: 'x' }, 'de'), ml);
  assert.equal(N.chatMeal(ml, { id: 'm123', uid: N.UID }, 'de'), ml);
  const other = Object.assign({}, ml, { src: N.photoUrl('Nori Smash Burger Stack') });
  assert.equal(N.chatMeal(other, m, 'de'), other, 'a photo that is not the dish of that slot is left alone');
});

test('For You: the same meal as a shared row; caption in the viewer\'s language, a small Bot tag, and it passes the insulin rule', () => {
  const row = N.postRow('20261025', 'e');
  assert.equal(row.id, 'snb-20261025-e'); assert.equal(row.rec, 'rb_shirataki_carbonara_pull', 'the Recipe Book id, as For You looks recipes up by id'); assert.equal(row.meta.spike, 'low'); assert.equal(row.meta.from, 'community');
  let lang = 'de';
  const p = N.post({ id: row.id, uid: N.UID, who: 'Nibblo', cap: row.cap, photo: row.photo_url, rec: row.rec, meta: row.meta }, () => lang);
  assert.equal(p.nb, 1);
  assert.match(p.cap, /Shirataki-Carbonara/); lang = 'es'; assert.match(p.cap, /Carbonara de shirataki/); lang = 'en'; assert.equal(p.cap, row.cap);
  const human = { id: 'x1', uid: 'u1', cap: 'mine', meta: { spike: 'low' } };
  assert.equal(N.post(human, () => 'de'), human); assert.equal(human.cap, 'mine'); assert.ok(!human.nb);
  /* the For You rule treats the bot like the app's other bot accounts: only low spike passes, and this does */
  const book = recipeBook();
  const ctx = { botAccount: x => x.uid === N.UID, recipe: id => { const n = Object.keys(book).find(k => N.bookId(k) === id); return n ? { id, r: book[n] } : null; } };
  assert.equal(F.shows(p, ctx), true);
  for (const d of all()) assert.equal(F.shows(N.post(Object.assign({ uid: N.UID }, N.postRow('20261025', 'e'), { rec: N.bookId(d.r) }), () => 'en'), ctx), true, d.r + ' passes');
  assert.match(html, new RegExp('const bookId = n => "rb_" \\+ String\\(n\\)\\.toLowerCase\\(\\)'), 'same id rule as the Recipe Book');
});

test('the server SQL is generated from nibblo-core.js and posts once per slot, quietly', () => {
  const gen = require('../tools/nibblo/gen-sql.cjs');
  const sql = read('supabase/proposals/nibblo_meals_20261025.sql');
  assert.equal(sql, gen.build(), 'run node tools/nibblo/gen-sql.cjs');
  assert.match(sql, /cron\.schedule\('nibblo-meals', '\*\/5 \* \* \* \*', 'select public\.nibblo_tick\(\)'\)/);
  assert.match(sql, /at time zone 'Europe\/Berlin'/);
  for (const t of ['07:30', '12:30', '18:30']) assert.ok(sql.includes("time '" + t + "'"));
  assert.match(sql, /insert into public\.nibblo_log \(id, posted_at\) values \(mid, p_at\) on conflict \(id\) do nothing;\s+get diagnostics k = row_count; if k = 0 then return null;/, 'a slot is posted once, even if the post is deleted later');
  assert.match(sql, /insert into public\.messages \(id, room, user_id, who, body, created_at\) values \(mid, 'all'/);
  assert.match(sql, /insert into public\.posts \(id, user_id, who, cap, photo_url, rec, lv, meta, created_at\) values \('s' \|\| mid/);
  assert.match(sql, /'%@bot\.lowispike\.invalid'/, 'the account is marked as a bot');
  assert.match(sql, /revoke execute on function public\.nibblo_post\(date, text, timestamptz\), public\.nibblo_tick\(timestamptz\) from public, anon, authenticated;/);
  assert.doesNotMatch(sql, /net\.http|push|notify|webhook/i, 'no push');
  assert.match(sql, /encrypted_password[^\n]*\n[^\n]*'nibblo@bot\.lowispike\.invalid', '',/, 'no password: nobody can sign in as the bot');
  /* every chat head in the SQL is what mealBody writes */
  for (const d of all()) assert.ok(sql.includes(K.mealBody(N.photoUrl(d.r), d.name[0], 'low', '').replace(/'/g, "''")), d.r);
});

test('the app wires it in: Chat and For You localize the bot\'s posts, For You shows a small Bot tag', () => {
  assert.match(html, /<script src="nibblo-core\.js\?v=[0-9-]+"><\/script>/);
  assert.match(html, /function mapPost\(r\)\{[^\n]*window\.LowiNibblo \? LowiNibblo\.post\(p, LowiNibblo\.lang\) : p;/);
  assert.match(html, /<div class="fy-by"[^\n]*\(p\.nb \? '<span class="fy-bot"[^\n]*>Bot<\/span>' : ''\)/);
  assert.match(html, /\.fy-bot\{/);
  const chat = read('community-chat.js');
  assert.match(chat, /function photoOf\(m\)\{[^\n]*if\(ph\)return ph;if\(W\.LowiNibblo\)\{const nb=W\.LowiNibblo\.chatPhoto\(K,m,u\);if\(nb\)return nb;\}const ml=K\.meal/);
  /* and Chat's own photoOf, given the bot's message, shows the German dish for a German phone */
  const b = N.chatBody('20261026', 'm', K.mealBody), msg = { id: 'nb-20261026-m', uid: N.UID, t: b };
  const W = { document: { documentElement: { lang: 'de' } } }; N.install(W);
  const got = N.chatPhoto(K, msg, N.UID);
  assert.equal(got.meal.name, N.pick('20261026', 'm').dish.name[1]); assert.equal(got.src, N.photoUrl(N.pick('20261026', 'm').dish.r));
  assert.equal(N.chatPhoto(K, { id: 'm1', uid: 'u1', t: K.mealBody(N.photoUrl('Nori Smash Burger Stack'), 'x', 'low', '') }, 'u1'), null);
  delete W.__lowiNibblo; N.lang = () => 'en';
  assert.match(read('sw.js'), /"nibblo-core\.js"/);
});

test('the bot never causes a push: the For You nudge skips bot accounts', () => {
  const fn = read('supabase/functions/n1-push/index.ts');
  assert.match(fn, /profiles\?select=id&or=\(test\.eq\.true,bot\.eq\.true\)&limit=1000/);
  assert.doesNotMatch(read('nibblo-core.js'), /fetch\(|\.insert\(|\.channel\(|Notification|showNotification|\.send\(/);
});
