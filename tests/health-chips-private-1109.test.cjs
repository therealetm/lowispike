'use strict';
/* Nov 9 2026: the "Worauf sollen wir achten?" chips (PCOS, Insulinresistenz, Prädiabetes) and "Nichts davon" are health data.
   The form says "Bleibt auf diesem Handy" and S.health never leaves the phone (PRIVATE_KEYS), but these chips were stored in
   S.user.tags / S.user.noCond, and the account backup (Supabase user_state) copied S.user. Found while preparing the Art. 9 consent
   draft. Now the backup never carries them, a merged or restored copy gets this phone's own back, goals sync as before.
   Runs the real sync block of index.html against a fake cloud (the same harness as tests/fly-in-sync-no-reload). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const a = html.indexOf('const SYNC = () => window.LowiSyncCore'), bLine = html.indexOf('function backupSoon(', a);
const block = html.slice(a, html.indexOf('\n', bLine));

function store() {
  const m = new Map();
  const s = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, clear: () => m.clear() };
  return new Proxy(s, { ownKeys: () => [...m.keys()], getOwnPropertyDescriptor: (t, k) => (m.has(k) ? { enumerable: true, configurable: true, value: m.get(k) } : undefined), get: (t, k) => (k in s ? s[k] : m.get(k)) });
}
function device(cloud, seed, withTags) {
  const ls = store(), ss = store(), listeners = {}, doc = { visibilityState: 'visible', addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); } };
  Object.keys(seed).forEach(k => ls.setItem(k, seed[k]));
  const out = { reloads: 0, ls, doc };
  const q = cols => ({ eq: () => ({ maybeSingle: async () => ({ error: null, data: cloud.row ? (cols === 'updated_at' ? { updated_at: cloud.row.updated_at } : { data: cloud.row.data, updated_at: cloud.row.updated_at }) : null }) }) });
  const sb = { from: () => ({ select: q, upsert: async row => { cloud.row = { data: JSON.parse(JSON.stringify(row.data)), updated_at: row.updated_at }; cloud.writes++; return { error: null }; } }) };
  const COND = [['PCOS', 'PCOS'], ['Insulin resistance', 'Insulin resistance'], ['Pre-diabetes', 'Pre-diabetes']];
  const win = { LowiSyncCore: require(path.join(ROOT, 'account-sync-core.js')) };
  if (withTags !== false) win.LowiTags = { conds: COND, isCond: k => COND.some(x => x[0] === k) };
  const ctx = vm.createContext({ window: win, localStorage: ls, sessionStorage: ss, document: doc, location: { reload: () => { out.reloads++; } },
    sb, live: true, uid: 'u-ama', PRIVATE_KEYS: ['health'], _set: function (k, v) { this.setItem(k, v); }, toast: () => {}, JSON, Date, Object, Promise, setTimeout, clearTimeout, console });
  vm.runInContext('let backT = 0, lastBack = "";\n' + block + '\n;this.__sync = { syncNow, snapshot, stripCondUser, keepCondUser, condTag };', ctx);
  out.sync = ctx.__sync;
  out.fire = async state => { doc.visibilityState = state; (listeners.visibilitychange || []).forEach(f => f()); await settle(); };
  out.v2 = () => JSON.parse(ls.getItem('lowispike.v2'));
  return out;
}
const settle = () => new Promise(r => setTimeout(r, 150));
const v2 = (user, extra) => JSON.stringify(Object.assign({ xp: 10, user, health: { pcos: true, cyc: { len: 28 } } }, extra || {}));

test('the helpers live inside the sync block, and every call is guarded (health is stripped even if they failed)', () => {
  assert.ok(a > 0 && block.includes('function stripCondUser(st)') && block.includes('function keepCondUser(st, cur)'));
  assert.ok(html.includes('PRIVATE_KEYS.forEach(x => delete s[x]); try { stripCondUser(s); } catch(e){} v = JSON.stringify(s);'));
  assert.ok(html.includes('Object.assign(o, priv); try { keepCondUser(o, curV2); } catch(e){}'), 'a merge keeps this phone\'s chips');
  assert.ok(html.includes('if (keepUser) try { keepCondUser(s, keepUser); } catch(e){}'), 'a restore keeps this phone\'s chips');
  assert.ok(html.includes('const PRIVATE_KEYS = ["health"];'), 'health is still never backed up');
});

test('the backup copy has the goals but not PCOS / insulin resistance / pre-diabetes, "none of these" or health', async () => {
  for (const withTags of [true, false]) {
    const cloud = { row: null, writes: 0 };
    const phone = device(cloud, { 'lowispike.v2': v2({ name: 'Ama', tags: ['Energy', 'PCOS', 'Steady blood sugar', 'Pre-diabetes'], noCond: false }) }, withTags);
    assert.equal(await phone.sync.syncNow('open'), true);
    const up = JSON.parse(cloud.row.data['lowispike.v2']);
    assert.deepEqual(up.user.tags, ['Energy', 'Steady blood sugar'], 'goals go up, conditions do not' + (withTags ? '' : ' (fallback list)'));
    assert.ok(!('noCond' in up.user) && !('health' in up));
    assert.equal(up.user.name, 'Ama');
    assert.deepEqual(phone.v2().user.tags, ['Energy', 'PCOS', 'Steady blood sugar', 'Pre-diabetes'], 'nothing changes on the phone');
  }
});

test('first sync after the update: an old cloud copy with PCOS is cleaned, no reload, the phone keeps its chips', async () => {
  const C = require(path.join(ROOT, 'account-sync-core.js'));
  const old = { 'lowispike.v2': JSON.stringify({ xp: 10, user: { name: 'Ama', tags: ['Energy', 'PCOS'], noCond: false } }), 'lowispike.sync.v': '1' };
  const at = new Date(Date.now() - 60000).toISOString(), cloud = { row: { data: old, updated_at: at }, writes: 0 };
  const phone = device(cloud, { 'lowispike.v2': v2({ name: 'Ama', tags: ['Energy', 'PCOS'], noCond: false }), 'lowi.sync.v1': JSON.stringify({ uid: 'u-ama', base: C.hashes(C.units(old)), at }) });
  assert.equal(await phone.sync.syncNow('open'), true);
  assert.equal(phone.reloads, 0, 'stripping the chips is a change on this side only: no reload');
  assert.deepEqual(JSON.parse(cloud.row.data['lowispike.v2']).user.tags, ['Energy'], 'the cloud copy lost PCOS');
  assert.deepEqual(phone.v2().user.tags, ['Energy', 'PCOS']);
  assert.equal(phone.v2().user.noCond, false);
});

test('a merge from the other device brings its changes but keeps this phone\'s chips, and the iPad never gets them', async () => {
  const cloud = { row: null, writes: 0 };
  const phone = device(cloud, { 'lowispike.v2': v2({ name: 'Ama', tags: ['Energy', 'Insulin resistance'] }) });
  await phone.sync.syncNow('open');
  /* the iPad signs in: what it gets from the cloud has no condition chip */
  const ipad = device(cloud, { 'lowispike.v2': JSON.stringify({ xp: 10, user: { name: 'Ama', tags: ['Energy'] } }) });
  await ipad.sync.syncNow('open'); await settle();
  assert.ok(!JSON.stringify(cloud.row.data).includes('Insulin resistance'), 'the cloud never held it');
  assert.ok(!(ipad.v2().user.tags || []).includes('Insulin resistance'), 'the iPad never got it');
  /* the iPad renames the user and adds a goal; the phone comes back to the front and merges (one reload) */
  const iv = ipad.v2(); iv.user.name = 'Ama K.'; iv.user.tags = ['Energy', 'Skin']; ipad.ls.setItem('lowispike.v2', JSON.stringify(iv));
  await ipad.sync.syncNow('open');
  await phone.sync.syncNow('resume'); await settle();
  const p = phone.v2();
  assert.equal(p.user.name, 'Ama K.', 'the other device\'s change arrived');
  assert.ok(p.user.tags.includes('Skin') && p.user.tags.includes('Insulin resistance'), 'its goal arrived and this phone kept its chip: ' + p.user.tags);
  assert.deepEqual(p.health, { pcos: true, cyc: { len: 28 } }, 'health untouched');
  assert.ok(!JSON.stringify(cloud.row.data).includes('Insulin resistance'));
});

test('restore on sign-in keeps chips already picked on this phone; nothing else changes in the restore', () => {
  const i = html.indexOf('async function restore(){'), j = html.indexOf('\n  return true; }', i);
  const r = html.slice(i, j);
  assert.ok(r.includes('keepHealth = c.health || null;') && r.includes('if (keepHealth) s.health = keepHealth;'), 'health kept as before');
  assert.match(r, /keepUser = c\.user && typeof c\.user === "object" && \(Array\.isArray\(c\.user\.tags\) && c\.user\.tags\.some\(condTag\) \|\| c\.user\.noCond !== undefined\) \? c : null;/);
});

test('the unit helpers: strip and keep', async () => {
  const cloud = { row: null, writes: 0 }, d = device(cloud, {});
  const s = d.sync.stripCondUser({ user: { tags: ['PCOS', 'Energy'], noCond: true }, meals: [1] });
  assert.deepEqual(JSON.parse(JSON.stringify(s)), { user: { tags: ['Energy'] }, meals: [1] });
  const k = d.sync.keepCondUser({ user: { tags: ['Energy', 'PCOS'], noCond: true } }, { user: { tags: ['Pre-diabetes'] } });
  assert.deepEqual(JSON.parse(JSON.stringify(k.user)), { tags: ['Energy', 'Pre-diabetes'] }, 'this phone\'s chips win, its missing "none" stays missing');
  assert.equal(d.sync.keepCondUser(null, { user: {} }), null);
  assert.deepEqual(JSON.parse(JSON.stringify(d.sync.keepCondUser({ user: { tags: ['Energy'] } }, {}))), { user: { tags: ['Energy'] } }, 'no local user: unchanged');
});

test('the privacy page says it in all three languages: health details stay on the phone, outside the account backup', () => {
  const p = fs.readFileSync(path.join(ROOT, 'privacy.html'), 'utf8');
  assert.ok(p.includes('<li><b>On your phone only:</b> health details (what you pick under &ldquo;Anything we should look out for?&rdquo;, such as PCOS, insulin resistance or pre-diabetes, your cycle, weight and blood pressure)'));
  assert.ok(p.includes('They are not part of the account backup. Your weight shows on your Community card only if you turn that on.'));
  assert.ok(p.includes('<li><b>Nur auf deinem Handy:</b> Gesundheitsangaben (was du unter &bdquo;Worauf sollen wir achten?&ldquo; wählst, z. B. PCOS, Insulinresistenz oder Prädiabetes, dein Zyklus, Gewicht und Blutdruck)'));
  assert.ok(p.includes('Sie sind nicht Teil der Kontosicherung. Dein Gewicht erscheint nur auf deiner Community-Karte, wenn du das selbst einschaltest.'));
  assert.ok(p.includes('No forman parte de la copia de seguridad de la cuenta. Tu peso solo aparece en tu tarjeta de la Comunidad si tú lo activas.'));
  assert.ok(p.includes('Stand: 9. November 2026'));
  /* what the page promises is what the code does: weight goes out only with the switch on, health is never in the backup */
  assert.ok(html.includes('const w = (u.showWeight && S_.health && S_.health.weight) ? String(S_.health.weight).slice(0, 8) : "";'));
});
