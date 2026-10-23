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
  assert.ok(b.includes(".select('id').eq('bot', true)"));
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
