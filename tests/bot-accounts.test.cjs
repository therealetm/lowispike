'use strict';
/* Bots off the Ranking and the add-friend list (Oct 23, 2026). Emmanuel, call 11:18 PM: "Können wir bitte die ganzen Bots
   in der Leaderboard rausschmeißen und nur noch die Menschen da drin haben?", "für all time, month und week", and "die Bots
   aus mein Circle" (Freund hinzufügen showed bot names and his own name many times). Bots are decided by the server
   (profiles.bot, set by a trigger from the sign-up e-mail of our own tools), never by a name; they stay in the Community. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
process.env.TZ = 'Europe/Berlin';
const B = require('../bot-accounts.js');
const RK = require('../ranking-core.js');
const C = require('../care-board-core.js');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const BOT = '00000000-0000-4000-8000-0000000000b1', HUMAN = '00000000-0000-4000-8000-0000000000a1';

test('bot list: ids from the server, by id only, never by name', () => {
  B.set([BOT]);
  assert.equal(B.isBot({ uid: BOT, n: 'Theresa' }), true);
  assert.equal(B.isBot({ uid: HUMAN, n: 'Theresa' }), false, 'same name, other account: a human stays');
  assert.equal(B.isBot(BOT), true);
  assert.equal(B.isBot({ n: 'Theresa' }), false, 'no id, no guess');
  assert.deepEqual(B.humans([{ uid: BOT }, { uid: HUMAN }]).map(p => p.uid), [HUMAN]);
  assert.equal(B.size(), 1);
});

test('Ranking (week, month, all time) leaves server-flagged bots out, humans stay', () => {
  B.set([BOT]);
  assert.equal(RK.real({ uid: BOT, n: 'Crowd', xp: 900 }), false);
  assert.equal(RK.real({ uid: HUMAN, n: 'Liesl', xp: 50 }), true);
  const kept = C.roster([{ uid: BOT, n: 'Crowd', xp: 900 }, { uid: HUMAN, n: 'Liesl', xp: 50 }]).map(p => p.uid);
  assert.ok(!kept.includes(BOT) && kept.includes(HUMAN), 'week/month roster');
  B.set([]);
  assert.equal(RK.real({ uid: BOT, n: 'Crowd', xp: 900 }), true, 'nothing hidden without the server flag');
});

test('the app loads the server flag, caches it and repaints the board', () => {
  const h = R('index.html'), sw = R('sw.js'), rk = R('ranking.js'), b = R('bot-accounts.js');
  assert.match(h, /<script src="bot-accounts\.js\?v=[0-9-]+"><\/script>/);
  assert.ok(h.indexOf('<script src="bot-accounts.js') < h.indexOf('<script src="ranking-core.js'), 'loaded before the ranking');
  assert.ok(h.includes('window.LowiBotAccounts.load(sb)'));
  assert.ok(sw.includes('"bot-accounts.js"'), 'offline cache');
  assert.ok(b.includes(".select('id,bot,test').or('bot.eq.true,test.eq.true')"));
  assert.ok(b.includes('localStorage'));
  assert.ok(rk.includes("addEventListener('lowi-bots'"));
});

test('Freund hinzufügen: no bots, no hidden test accounts, Emmanuel never sees himself', () => {
  const s = R('cell-room.js');
  const fn = s.slice(s.indexOf('function roomPeople(){'), s.indexOf('return out;}catch(e){return[];}}') + 30);
  assert.ok(fn.includes('B.isBot(p)') && fn.includes('H.isHidden(p)'));
  assert.ok(fn.includes('if(iAmOwner)continue;'), 'his own extra accounts are not offered to him');
  assert.ok(fn.includes('R.OWNER.main'), 'everyone else sees one Emmanuel');
});

test('Freund hinzufügen: one entry per name (Sim, Fixture, T showed up to six times), nobody removed', () => {
  const s = R('cell-room.js');
  const src = s.slice(s.indexOf('function onePerName(list){'), s.indexOf('function myHue('));
  const onePerName = new Function(src + '; return onePerName;')();
  const L = [{ uid: 'a', n: 'Sim', lv: 5, xp: 2400 }, { uid: 'b', n: 'Sim ', lv: 5, xp: 2400 }, { uid: 'c', n: 'sim', lv: 6, xp: 10 },
    { uid: 'd', n: 'Joseph Castellar', lv: 4 }, { uid: 'e', n: 'Fixture', lv: 4, xp: 900 }, { uid: 'f', n: 'Fixture', lv: 4, xp: 950 }, { uid: 'g', n: '' }];
  const out = onePerName(L);
  assert.deepEqual(out.map(p => p.uid), ['c', 'd', 'f'], 'higher level, then more XP stays; first-seen order kept');
  assert.equal(L.length, 7, 'the input list is not changed');
  assert.ok(s.includes('const ppl=onePerName(roomPeople());'), 'the add-friend list uses it');
  assert.ok(/function personOf\(uid\)\{return roomPeople\(\)\.find/.test(s), 'friends you already have are still found by id');
});

test('server: flag from our own tools\' sign-up e-mails, trigger-owned, Circles refuse bots', () => {
  const q = R('supabase/proposals/bot_flag_20261023.sql');
  assert.ok(q.includes("u.email like 'crowd%@crowd.lowispike.invalid'"));
  assert.ok(q.includes("u.email like 'lowispike.gatetest+%@gmail.com'"));
  assert.ok(q.includes('create trigger profiles_zz_botflag before insert or update on public.profiles'));
  assert.ok(q.includes('create trigger user_room_members_zz_nobots'));
  assert.ok(!/delete from public\.profiles|delete from auth\.users|delete from public\.community/i.test(q), 'no account or message is deleted');
  const crowd = R('tools/community-crowd/crowd.cjs');
  assert.ok(crowd.includes('@crowd.lowispike.invalid'), 'the crowd tool signs up with that domain');
});

const TEST = '00000000-0000-4000-8000-0000000000c1', TEST2 = '00000000-0000-4000-8000-0000000000c2';
test('test accounts (Lena / Jonas / Mia Test from the check scripts): hidden by the server marker, never by name', () => {
  const H = require('../hidden-accounts.js');
  B.setSelf(HUMAN); B.set([BOT], [TEST]);
  assert.equal(B.isTest({ uid: TEST, n: 'Lena' }), true);
  assert.equal(B.isBot({ uid: TEST, n: 'Lena' }), true, 'off the Ranking and the friend / Circle lists');
  assert.equal(H.isHidden({ uid: TEST, n: 'Lena' }), true, 'hidden everywhere, like the known test accounts');
  assert.equal(H.isHidden({ uid: BOT, n: 'Crowd' }), false, 'bots stay in the Community');
  assert.equal(B.isBot({ uid: TEST2, n: 'Lena' }), false, 'a real Lena without the marker stays');
  assert.equal(RK.real({ uid: TEST, n: 'Jonas', xp: 10 }), false);
  B.setSelf(TEST2); B.set([BOT], [TEST, TEST2]);
  assert.equal(B.isBot({ uid: TEST, n: 'Mia Test 4013' }), false, 'test accounts still see each other, so the checks run');
  B.setSelf(''); B.set([], []);
});

test('check scripts mark their accounts and clean up', () => {
  const ta = R('tools/user-rooms/test-account.cjs'), ck = R('tools/user-rooms/check.cjs'), q = R('supabase/proposals/bot_flag_20261023.sql');
  assert.ok(ta.includes("updateUser({ data: { lowi_test: true } })"));
  assert.ok(ta.includes(".from('profiles').delete().eq('id', uid)"));
  assert.ok(ck.includes('await TA.markTest(page)') && ck.includes('TA.cleanup(d.page)'));
  assert.ok(q.includes("(u.raw_user_meta_data->>'lowi_test')='true'"));
  assert.ok(q.includes('create trigger auth_users_lowiflags after update of raw_user_meta_data on auth.users'));
});
