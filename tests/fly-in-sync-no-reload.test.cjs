/* Fly-in "crash" (Emmanuel, 24 Oct 2026: "I tried to fly into a world and it crashed", iPhone + iPad on one account).
   The cause: arriving in a world writes the guide's memory (lowi.guides.v1), the backup a few seconds later saw the other device's
   copy in the cloud, merged it and called location.reload() mid-flight. This runs the real sync block of index.html against a fake
   cloud: a background sync ("backup", "now") must never reload or push over the other device; the merge (with its one reload)
   waits for the app to leave or come back to the front. Sign out ("final") still syncs straight away. */
const test = require('node:test');
const assert = require('node:assert');
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

function device(cloud, seed) {
  const ls = store(), ss = store(), listeners = {}, doc = { visibilityState: 'visible', addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); } };
  Object.keys(seed).forEach(k => ls.setItem(k, seed[k]));
  const out = { reloads: 0, pushes: 0, ls, doc };
  const q = cols => ({ eq: () => ({ maybeSingle: async () => ({ error: null, data: cloud.row ? (cols === 'updated_at' ? { updated_at: cloud.row.updated_at } : { data: cloud.row.data, updated_at: cloud.row.updated_at }) : null }) }) });
  const sb = { from: () => ({ select: q, upsert: async row => { cloud.row = { data: JSON.parse(JSON.stringify(row.data)), updated_at: row.updated_at }; cloud.writes++; out.pushes++; return { error: null }; } }) };
  const win = { LowiSyncCore: require(path.join(ROOT, 'account-sync-core.js')) };
  const ctx = vm.createContext({ window: win, localStorage: ls, sessionStorage: ss, document: doc, location: { reload: () => { out.reloads++; } },
    sb, live: true, uid: 'u-eman', PRIVATE_KEYS: ['health'], _set: function (k, v) { this.setItem(k, v); }, toast: () => {}, JSON, Date, Object, Promise, setTimeout, clearTimeout, console });
  vm.runInContext('let backT = 0, lastBack = "";\n' + block + '\n;this.__sync = { syncNow, backupSoon, syncMeta };', ctx);
  out.sync = ctx.__sync;
  out.fire = async (state) => { doc.visibilityState = state; (listeners.visibilitychange || []).forEach(f => f()); await settle(); };
  return out;
}
const settle = () => new Promise(r => setTimeout(r, 150));
const seed = () => ({ 'lowispike.v2': JSON.stringify({ xp: 10, user: { name: 'Eman' } }), 'lowi.guides.v1': JSON.stringify({ gut: { met: 1 } }) });
function otherDeviceWrites(cloud) {
  cloud.row = { data: Object.assign({}, cloud.row.data, { 'lowispike.ipad.v1': JSON.stringify({ steps: 4200 }) }), updated_at: new Date(Date.now() + 5000).toISOString() };
}

test('the sync block was found in index.html', () => {
  assert.ok(a > 0 && bLine > a && /function syncNow\(why\)/.test(block) && /visibilitychange/.test(block));
});

test('flying into a world after the other device wrote: no reload mid-use, nothing pushed over the other device', async () => {
  const cloud = { row: null, writes: 0 }, phone = device(cloud, seed());
  assert.equal(await phone.sync.syncNow('open'), true, 'first copy goes up');
  assert.equal(phone.reloads, 0);
  otherDeviceWrites(cloud);
  const writesBefore = cloud.writes;
  /* arriving in a world: the guide remembers, then the 5 s backup runs */
  phone.ls.setItem('lowi.guides.v1', JSON.stringify({ gut: { met: 2 } }));
  assert.equal(await phone.sync.syncNow('backup'), false);
  await settle();
  assert.equal(phone.reloads, 0, 'the backup must not reload the page mid-flight (this was the fly-in crash)');
  /* a cell world or herb save asks for a backup right away: same rule */
  assert.equal(await phone.sync.syncNow('now'), false);
  await settle();
  assert.equal(phone.reloads, 0, 'backupNow must not reload mid-use either');
  assert.equal(cloud.writes, writesBefore, 'nothing pushed over the other device while the merge waits');
  assert.ok(cloud.row.data['lowispike.ipad.v1'], 'the other device\'s data is still in the cloud');
  /* coming back to the front: merge, push both sides, one reload as before */
  await phone.fire('visible');
  assert.equal(phone.reloads, 1, 'one reload once the app comes back to the front');
  assert.equal(phone.ls.getItem('lowispike.ipad.v1'), JSON.stringify({ steps: 4200 }), 'the other device\'s data arrived');
  assert.equal(JSON.parse(cloud.row.data['lowi.guides.v1']).gut.met, 2, 'this device\'s change went up too');
});

test('leaving the app does the waiting merge out of sight', async () => {
  const cloud = { row: null, writes: 0 }, ipad = device(cloud, seed());
  await ipad.sync.syncNow('open');
  otherDeviceWrites(cloud);
  ipad.ls.setItem('lowi.guides.v1', JSON.stringify({ heart: { met: 1 } }));
  await ipad.sync.syncNow('backup'); await settle();
  assert.equal(ipad.reloads, 0);
  await ipad.fire('hidden');
  assert.equal(ipad.reloads, 1, 'merged and reloaded while hidden');
  assert.ok(ipad.ls.getItem('lowispike.ipad.v1'));
});

test('nobody else wrote: backups keep going up quietly, no reload', async () => {
  const cloud = { row: null, writes: 0 }, phone = device(cloud, seed());
  await phone.sync.syncNow('open');
  phone.ls.setItem('lowi.guides.v1', JSON.stringify({ gut: { met: 3 } }));
  assert.equal(await phone.sync.syncNow('backup'), true);
  await settle();
  assert.equal(phone.reloads, 0);
  assert.equal(JSON.parse(cloud.row.data['lowi.guides.v1']).gut.met, 3);
});

test('signing out still syncs straight away ("final")', async () => {
  const cloud = { row: null, writes: 0 }, phone = device(cloud, seed());
  await phone.sync.syncNow('open');
  otherDeviceWrites(cloud);
  await phone.sync.syncNow('backup');
  await phone.sync.syncNow('final'); await settle();
  assert.ok(phone.ls.getItem('lowispike.ipad.v1'), 'sign out merges the other device in');
  assert.ok(/backupNow\(true\)/.test(html) && /final === true \? "final" : "now"/.test(html), 'sign out asks for the final sync');
});
