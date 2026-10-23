/* Same data on every device (Eman, 23 Oct 2026): iPhone and iPad on one account showed different numbers because each device
   only pushed its backup. account-sync-core.js merges three ways per field; index.html pulls, merges, applies and pushes. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const C = require('../account-sync-core.js');
const J = JSON.stringify;
const v2 = o => J(o);

test('which keys travel: account data yes, device settings and chat no', () => {
  assert.ok(C.synced('lowispike.v2'));
  assert.ok(C.synced('lowispike.move.v1'));
  assert.ok(!C.synced('lowispike.chat.v1'));
  assert.ok(C.synced('lowi.herb.tamagotchi.v2:83077af7'));
  assert.ok(!C.synced('lowi.herb.tamagotchi.v2:'));
  assert.ok(C.synced('lowi.sleep.v1'));
  assert.ok(C.synced('lowi.recipe-book.abc'));
  ['lowi.theme', 'lowi.lang', 'lowi.sync.v1', 'lowi.health.83077af7', 'lowi.upd', 'lowi.worldAudio', 'lowi.sleep.v1x'].forEach(k => assert.ok(!C.synced(k), k));
});

test('device settings stay per device: English iPhone, German iPad', () => {
  const agreed = { 'lowispike.lang': 'en', 'lowispike.v2': v2({ xp: 1 }) }, base = C.hashes(C.units(agreed));
  const r = C.merge({ 'lowispike.lang': 'en', 'lowispike.v2': v2({ xp: 1 }) }, { 'lowispike.lang': 'de', 'lowispike.v2': v2({ xp: 1 }) }, base);
  assert.deepEqual(r.changedKeys, []); assert.equal(r.pushNeeded, false); assert.equal(r.merged['lowispike.lang'], 'en');
  assert.ok(C.synced('lowi_fast_v1') && C.synced('lowi_r3w_v1'), 'fasting + water and the reward book travel');
});

test('units and join round-trip, objects split per field', () => {
  const snap = { 'lowispike.v2': v2({ xp: 5, meals: [{ id: 1 }], user: { name: 'Eman' } }), 'lowi.lvFloor': '4' };
  const u = C.units(snap);
  assert.ok('lowispike.v2#xp' in u && 'lowispike.v2#meals' in u && 'lowispike.v2#' in u);
  assert.deepEqual(JSON.parse(C.join(u)['lowispike.v2']), JSON.parse(snap['lowispike.v2']));
  assert.equal(C.join(u)['lowi.lvFloor'], '4');
});

test('nothing changed anywhere: nothing to do', () => {
  const s = { 'lowispike.v2': v2({ xp: 5 }) };
  const base = C.hashes(C.units(s));
  const r = C.merge(s, s, base);
  assert.deepEqual(r.changedKeys, []); assert.deepEqual(r.removedKeys, []); assert.equal(r.pushNeeded, false);
});

test('the iPad logged water, the iPhone did nothing: the iPhone takes it, nothing goes back up', () => {
  const agreed = { 'lowispike.v2': v2({ xp: 5, water: { date: '2026-10-23', n: 2 }, meals: [] }) };
  const base = C.hashes(C.units(agreed));
  const ipad = { 'lowispike.v2': v2({ xp: 9, water: { date: '2026-10-23', n: 3 }, meals: [] }) };
  const r = C.merge(agreed, ipad, base);
  assert.deepEqual(r.changedKeys, ['lowispike.v2']);
  assert.equal(r.pushNeeded, false);
  const m = JSON.parse(r.merged['lowispike.v2']);
  assert.equal(m.xp, 9); assert.equal(m.water.n, 3);
});

test('each device changed a different field: both survive', () => {
  const agreed = { 'lowispike.v2': v2({ xp: 5, meals: [], sleep: 'ok' }) };
  const base = C.hashes(C.units(agreed));
  const phone = { 'lowispike.v2': v2({ xp: 5, meals: [{ id: 'm1', ts: 100 }], sleep: 'ok' }) };
  const ipad = { 'lowispike.v2': v2({ xp: 5, meals: [], sleep: 'great' }) };
  const r = C.merge(phone, ipad, base);
  const m = JSON.parse(r.merged['lowispike.v2']);
  assert.deepEqual(m.meals, [{ id: 'm1', ts: 100 }]); assert.equal(m.sleep, 'great');
  assert.equal(r.pushNeeded, true); assert.deepEqual(r.changedKeys, ['lowispike.v2']);
});

test('both logged a meal at the same time: both meals stay, none twice, in time order', () => {
  const agreed = { 'lowispike.v2': v2({ meals: [{ id: 'a', ts: 1 }] }) };
  const base = C.hashes(C.units(agreed));
  const phone = { 'lowispike.v2': v2({ meals: [{ id: 'a', ts: 1 }, { id: 'c', ts: 3 }] }) };
  const ipad = { 'lowispike.v2': v2({ meals: [{ id: 'a', ts: 1 }, { id: 'b', ts: 2 }] }) };
  const m = JSON.parse(C.merge(phone, ipad, base).merged['lowispike.v2']);
  assert.deepEqual(m.meals.map(x => x.id), ['a', 'b', 'c']);
});

test('a meal deleted on the other device stays deleted here (no zombie entries)', () => {
  const agreed = { 'lowispike.v2': v2({ meals: [{ id: 'a' }, { id: 'b' }] }) };
  const base = C.hashes(C.units(agreed));
  const ipad = { 'lowispike.v2': v2({ meals: [{ id: 'a' }] }) };
  const m = JSON.parse(C.merge(agreed, ipad, base).merged['lowispike.v2']);
  assert.deepEqual(m.meals, [{ id: 'a' }]);
});

test('a key reset on the other device is reset here too; a key only this device has goes up', () => {
  const agreed = { 'lowispike.v2': v2({ xp: 1 }), 'lowi.sleep.v1': v2({ '2026-10-22': 'ok' }) };
  const base = C.hashes(C.units(agreed));
  const ipad = { 'lowispike.v2': v2({ xp: 1 }) };
  const phone = Object.assign({}, agreed, { 'lowi.dex.v1': v2({ mine: [1] }) });
  const r = C.merge(phone, ipad, base);
  assert.deepEqual(r.removedKeys, ['lowi.sleep.v1']);
  assert.ok(r.merged['lowi.dex.v1']); assert.equal(r.pushNeeded, true);
});

test('first sync (no agreement yet): combine, never lose a side', () => {
  const phone = { 'lowispike.v2': v2({ xp: 2000, meals: [{ id: 'p', ts: 5 }], user: { name: 'Eman' }, water: { date: '2026-10-23', n: 1 } }), 'lowi.lvFloor': '5' };
  const ipad = { 'lowispike.v2': v2({ xp: 2612, meals: [{ id: 'i', ts: 4 }], user: { name: 'Emmanuel', av: 'x' }, water: { date: '2026-10-22', n: 6 } }), 'lowi.dex.v1': v2({ mine: [1] }) };
  const r = C.merge(phone, ipad, {});
  const m = JSON.parse(r.merged['lowispike.v2']);
  assert.equal(m.xp, 2612, 'higher XP kept');
  assert.deepEqual(m.meals.map(x => x.id), ['i', 'p'], 'both meals, time order');
  assert.equal(m.user.name, 'Eman', 'this device text kept'); assert.equal(m.user.av, 'x', 'their extra field kept');
  assert.deepEqual(m.water, { date: '2026-10-23', n: 1 }, 'a dated object keeps the newer day, not yesterday\'s count');
  assert.equal(r.merged['lowi.lvFloor'], '5'); assert.ok(r.merged['lowi.dex.v1']);
});

test('key order inside an object is not a change', () => {
  const a = { 'lowispike.v2': '{"a":1,"b":2}' }, b = { 'lowispike.v2': '{"b":2,"a":1}' };
  const r = C.merge(a, b, C.hashes(C.units(a)));
  assert.deepEqual(r.changedKeys, []); assert.equal(r.pushNeeded, false);
});

test('non-JSON values are whole units', () => {
  const agreed = { 'lowi.lvFloor': '3' }, base = C.hashes(C.units(agreed));
  const r = C.merge(agreed, { 'lowi.lvFloor': '4' }, base);
  assert.equal(r.merged['lowi.lvFloor'], '4');
  assert.equal(C.merge({ 'lowi.lvFloor': '5' }, { 'lowi.lvFloor': '4' }, base).merged['lowi.lvFloor'], '5', 'both changed: this device');
});

test('index.html: backups are syncs, open and resume pull first, old builds can never delete or overwrite', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const core = html.indexOf('<script src="account-sync-core.js'), cloud = html.indexOf('LOWiSPIKE Cloud · round 1');
  assert.ok(core > 0 && core < cloud, 'core loads before the cloud script');
  assert.match(html, /function backupSoon\(ms\)\{[^\n]*syncNow\("backup"\)/);
  assert.match(html, /setTimeout\(\(\) => syncNow\("open"\), 600\)/);
  assert.match(html, /visibilitychange", \(\) => \{ if \(document\.visibilityState === "visible" && live[^\n]*syncNow\("resume"\)/);
  assert.match(html, /async backupNow\(\)\{[^\n]*return syncNow\("now"\)/);
  assert.match(html, /const legacy = remote\["lowispike\.sync\.v"\] !== "1"/);
  assert.match(html, /C\.merge\(local, remote, legacy \? \{\} : meta\.base\)/);
  assert.match(html, /o\["lowispike\.sync\.v"\] = "1"/);
  assert.match(html, /if \(syncFrozen && this === window\.localStorage && syncedKey\(k\)\) return;/);
  assert.match(html, /PRIVATE_KEYS\.forEach\(x => \{ if \(cur && cur\[x\] !== undefined\) priv\[x\] = cur\[x\]; \}\)/, 'health stays on the phone through a merge');
  assert.match(html, /a\.length >= 3\) return false/, 'never a reload loop');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.ok(sw.includes('"account-sync-core.js"'), 'offline cache has the core');
});
