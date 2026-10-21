'use strict';
/* Affiliates buy-to-unlock + recruit levels (Eman, 21 Oct 2026): members open a track's full script, shot list and caption by
   buying the product (buyer code in the delivery) or with a personal invite code; active recruits lift their commission level faster. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const A = require('../affiliates/access-core.js'), LIST = require('../affiliates/access-list.js'), REC = require('../affiliates/recruits.js');
const B = require('../affiliates/blueprint-core.js');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const mem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; };

test('access list: only hashes ship, one buyer code per paid track, codes cover only real tracks', () => {
  const txt = read('affiliates/access-list.js');
  assert.ok(!/\b[A-Z]{3}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}\b/.test(txt), 'a plain code is in the repo');
  assert.ok(LIST.salt && LIST.iter >= 100000);
  for (const c of LIST.codes) { assert.match(c.h, /^[0-9a-f]{64}$/); assert.ok(c.tracks.length && c.tracks.every(t => B.SERIES[t]), c.note); }
  for (const id of B.ORDER.filter(id => !B.SERIES[id].free)) assert.ok(LIST.codes.some(c => c.kind === 'buyer' && c.tracks.length === 1 && c.tracks[0] === id), 'buyer code for ' + id);
});

test('a new code unlocks exactly its tracks, is kept on the device, and wrong or short codes are refused', async () => {
  const code = A.newCode('WEB'), list = { salt: LIST.salt, iter: 1000, codes: [] };
  assert.match(code, /^WEB-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  list.codes.push({ h: await A.hash(code, list), tracks: ['webdesign'], kind: 'buyer' });
  const r = await A.check(code.toLowerCase().replace(/-/g, ' '), list);
  assert.equal(r.ok, true); assert.deepEqual(r.tracks, ['webdesign']);
  assert.equal((await A.check('WEB-AAAA-BBBB-CCCC', list)).ok, false);
  assert.equal((await A.check('ABC', list)).ok, false);
  const st = mem(); assert.deepEqual(A.saved(st, list), {});
  A.remember(st, r.h); assert.deepEqual(A.saved(st, list), { webdesign: true });
  list.codes = []; assert.deepEqual(A.saved(st, list), {}, 'a revoked code locks again');
});

test('buy link credits the affiliate who sent the visitor', () => {
  const id = '0f8e2d3c-1b2a-4c5d-9e8f-123456789abc', list = { buy: { webdesign: 'https://example.com/p' } };
  assert.equal(A.buyUrl('webdesign', id, list), 'https://example.com/p?affiliateLinkId=' + id);
  assert.equal(A.buyUrl('webdesign', '', list), 'https://example.com/p');
  assert.equal(A.buyUrl('ugc', id, list), '');
});

test('recruit levels: an active recruit counts like 5 sales and every 3 lift one more level, capped at the top', () => {
  assert.equal(A.RECRUIT.salesPerRecruit, 5); assert.equal(A.RECRUIT.recruitsPerLevel, 3);
  assert.equal(A.progress(0, 0, B.TIERS).level, 1);
  const three = A.progress(0, 3, B.TIERS); assert.equal(three.credit, 15); assert.equal(three.level, 3); assert.equal(three.rate, 0.25);
  assert.equal(A.progress(10, 0, B.TIERS).level, 1); assert.equal(A.progress(10, 1, B.TIERS).level, 2);
  assert.equal(A.progress(0, 60, B.TIERS).level, B.TIERS.length); assert.equal(A.progress(0, 60, B.TIERS).top, true);
  const d = { verified: [{ by: 'me', video: 'https://www.tiktok.com/@a/video/1?x=1' }, { by: 'me', video: 'https://www.tiktok.com/@a/video/1/' }, { by: 'me', video: 'https://www.tiktok.com/@a/video/2' }, { by: 'you', video: 'https://www.tiktok.com/@b/video/3' }] };
  assert.equal(A.recruitsFor('me', d), 2, 'one video counts once'); assert.equal(A.recruitsFor('', d), 0);
  assert.ok(Array.isArray(REC.verified));
});

test('page: loads the access files, gates script and shots, keeps the gate text in EN/DE/ES', () => {
  const html = read('affiliates/index.html'), js = read('affiliates/blueprint.js');
  const order = ['blueprint-core.js', 'access-core.js', 'access-list.js', 'recruits.js', 'blueprint.js'].map(f => html.indexOf('src="' + f + '"'));
  assert.ok(order.every((i, k) => i > 0 && (k === 0 || i > order[k - 1])), 'script order');
  assert.ok(html.includes('id="recruitCard"'));
  for (const k of ['gate(\'\')', "gate('Shots')", 'isOpen(pick)', 'A.check(code, LIST)', 'A.remember(localStorage', 'A.recruitsFor(me, REC)']) assert.ok(js.includes(k), k);
  assert.ok(!/wa\.me|api\.whatsapp/.test(js), 'no invented WhatsApp link');
  for (const k of ['preview', 'lockedScene', 'gateTitle', 'gateLead', 'buyFor', 'buyAsk', 'afterBuy', 'codeLabel', 'unlockBtn', 'codeWrong', 'codeOther', 'checkFail', 'unlocked', 'recruitTitle', 'recruitRule', 'recruitYou', 'recruitEx', 'recruitHow'])
    assert.equal((B.STRINGS[k] || []).length, 3, k);
});
