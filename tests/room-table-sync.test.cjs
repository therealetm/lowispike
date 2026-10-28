/* Oct 28 2026: the Billardtisch's shared table (room-table-core.js + room-table.js). Emmanuel: "ob du offline bist oder nicht,
   das juckt mich doch nicht. Ich moechte sehen, dass du da rumrollst, dass wenn du online kommst, du merkst, dass du nicht mehr an
   der selben Position bist." These pin the shot message between phones, the saved positions in companion_rest, the wiring that
   lets the table own the Room, and the knocked-while-away note. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../room-table-core.js');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('the shot message round-trips and older builds (v1 energy shots) are not mistaken for table shots', () => {
  const s = [['u1', 100, 200], ['u2', 300.25, 400]], f = [['u1', 110, 260], ['u2', 500, 900]];
  const m = C.pack({ id: 'abc', by: 'u1', n: 'Emmanuel', t: 5, dx: .6, dy: -.8, p: .73, s, f });
  assert.equal(m.v, 2); const u = C.unpack(JSON.parse(JSON.stringify(m)));
  assert.deepEqual(u.s, s); assert.deepEqual(u.f, f); assert.equal(u.by, 'u1'); assert.equal(u.p, .73);
  assert.equal(C.unpack({ v: 1, by: 'u1', s }), null);
  assert.equal(C.unpack({ v: 2, k: 'bt', by: 'u1', s: [['u1', 'x', 2]], dx: 1, dy: 0 }), null, 'junk rows are dropped');
  assert.equal(C.unpack(null), null);
});

test('a replaying phone gets the same rest positions as the shooter from the message alone', () => {
  const uids = Array.from({ length: 30 }, (_, i) => '0000' + String(i).padStart(4, '0') + '-0000-4000-8000-000000000000');
  const sp = C.homeSpots(uids, {}); const start = uids.map(u => [u, sp[u].x, sp[u].y]);
  const shooter = C.simulate(start, uids[4], -.3, -1, .95);
  const msg = JSON.parse(JSON.stringify(C.pack({ id: 'z', by: uids[4], dx: -.3, dy: -1, p: .95, s: start, f: shooter.final })));
  const u = C.unpack(msg); const replay = C.simulate(u.s, u.by, u.dx, u.dy, u.p);
  assert.deepEqual(replay.final, shooter.final);
  assert.ok(JSON.stringify(msg).length < 8000, 'small enough for a realtime broadcast');
});

test('saved positions: table coordinates are stored as 4000 + x / 4000 + y, and old room-coordinate rows are ignored', () => {
  const e = C.enc(123.45, 1249.9); assert.deepEqual(e, { rx: 4123.5, ry: 5249.9 });
  assert.deepEqual(C.dec(e.rx, e.ry), { x: 123.5, y: 1249.9 });
  assert.equal(C.dec(-340, 220), null, 'an old map position (room coordinates) is not a table position');
  assert.equal(C.dec(5200, 4100), null, 'off the table');
  assert.equal(C.dec('x', 1), null);
  /* the database guard allows -6000..6000 */
  assert.ok(e.rx <= 6000 && e.ry <= 6000 && C.enc(1000, 1250).ry <= 6000);
});

test('the table owns the Room: community-chat hands the view over and the old map energy layer stands down', () => {
  const chat = read('community-chat.js'), en = read('community-energy.js');
  assert.match(chat, /if\(W\.LowiTable&&W\.LowiTable\.mount&&W\.LowiTable\.mount\(gal\)\)return;\n  mapGestures\(gal\)/, 'place() returns before the zoom gestures and the old placement');
  assert.match(chat, /people\(\)\{if\(!G\)return \[\];/); assert.match(chat, /pick\(uid,name\)\{/);
  assert.match(chat, /function skyStart\(\)\{[^\n]*LowiTable\.active\(\)\)\{if\(sk\)sk\.stop\(\);return;\}/, 'no star loop behind the table');
  for (const fn of ['function mount(g){', 'function remote(raw){', 'function restLoad(force){']) {
    const i = en.indexOf(fn); assert.ok(i >= 0, fn); assert.match(en.slice(i, i + 260), /LowiTable&&W\.LowiTable\.active&&W\.LowiTable\.active\(\)/, fn + ' stands down');
  }
  assert.match(en, /W\.LowiEnergy=\{mount,offset,[^\n]*,gift\}/, 'the table can still send energy for a direct hit');
  const css = read('room-table.css');
  for (const sel of ['.cg-sky', '.cg-field', '.ce-joy', '.ce-fx']) assert.ok(css.includes('#cgGalaxy.rt-on>' + sel), sel + ' hidden under the table');
  const idx = read('index.html'), sw = read('sw.js');
  for (const f of ['room-table.css', 'room-table-core.js', 'room-table.js']) { assert.ok(idx.includes(f + '?v='), f + ' in index.html'); assert.ok(sw.includes('"' + f + '"'), f + ' cached by the service worker'); }
  assert.ok(idx.indexOf('room-table-core.js') < idx.indexOf('room-table.js?'), 'core before the UI');
});

/* a tiny DOM so room-table.js runs in node: enough for mount, sync, loading rows and the knocked-away note */
function fakeDom() {
  const mk = (tag) => { const el = { tagName: tag, children: [], style: { setProperty() { } , cssText: '' }, dataset: {}, classList: { s: new Set(), add(c) { this.s.add(c); }, remove(c) { this.s.delete(c); }, toggle(c, v) { v ? this.s.add(c) : this.s.delete(c); }, contains(c) { return this.s.has(c); } }, attrs: {}, isConnected: true, clientWidth: 352, clientHeight: 513, offsetParent: {},
    setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.children.push(c); c.parent = this; c.isConnected = true; return c; }, remove() { this.isConnected = false; }, addEventListener() { }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 450 }),
    _html: '', set innerHTML(h) { this._html = h; this._q = {}; }, get innerHTML() { return this._html; }, set textContent(t) { this._t = t; }, get textContent() { return this._t || ''; },
    querySelector(sel) { this._q = this._q || {}; if (!this._q[sel]) { const c = mk('x'); c.cls = sel; if (sel === '.rt-fx') c.getContext = () => new Proxy({}, { get: (o, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() { } }) : () => { } }); this._q[sel] = c; } return this._q[sel]; }, get firstChild() { return null; } };
    return el; };
  return mk;
}
test('knocked while away: your saved spot moved by someone else gives a note with their name, and your own move does not', async () => {
  const mk = fakeDom(), store = {}, rows = [];
  const ME = '00000001-0000-4000-8000-000000000001', ANTJE = '00000002-0000-4000-8000-000000000002';
  const doc = { createElement: mk, hidden: false, visibilityState: 'visible', addEventListener() { } };
  const W = { document: doc, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } }, matchMedia: () => ({ matches: true }), addEventListener() { }, devicePixelRatio: 2,
    LowiTableCore: C, LowiLang: { get: () => 'de' },
    LowiCgMap: { people: () => [{ uid: ME, me: true, n: 'Emmanuel', label: 'Du', c: '#9cdac7' }, { uid: ANTJE, me: false, n: 'Antje', label: 'Antje', c: '#f9a' }], art: () => '', pick() { }, selected: () => '', me: () => ME },
    LOWI_CLOUD_X: { state: () => ({ uid: ME }), client: () => ({ from: () => ({ select: () => ({ order: () => ({ limit: () => Promise.resolve({ data: rows, error: null }) }) }), upsert: (l) => { rows.push(...l.map(r => ({ ...r, moved_by: ME, updated_at: new Date().toISOString() }))); return Promise.resolve({ error: null }); } }) }) } };
  global.localStorage = W.localStorage; global.performance = { now: () => Date.now() }; global.requestAnimationFrame = () => 1; global.navigator = {};
  const src = read('room-table.js');
  new Function('window', src)(W);
  const gal = mk('div');
  assert.equal(W.LowiTable.mount(gal), true);
  assert.ok(gal.classList.contains('rt-on'));
  assert.equal(W.LowiTable.state().people, 2);
  await new Promise(r => setTimeout(r, 20));
  /* first visit: no table spot saved yet, so your ball's spot is saved for everyone */
  assert.ok(rows.some(r => r.user_id === ME), 'own spot saved');
  /* you last saw yourself at (150,200); Antje knocked you to (800,1150) while you were away */
  store['lowi:rt-seen'] = JSON.stringify({ u: ME, x: 150, y: 200, t: 1 });
  rows.length = 0; rows.push({ user_id: ME, rx: 4800, ry: 5150, moved_by: ANTJE, updated_at: new Date().toISOString() }, { user_id: ANTJE, rx: -120, ry: 300, moved_by: ANTJE, updated_at: new Date().toISOString() });
  await W.LowiTable.load(true);
  const toast = gal.children[0].querySelector('.rt-toast');
  assert.match(toast.textContent, /^Antje hat dich weggestoßen, während du weg warst$/);
  const meBall = W.LowiTable.state().balls.find(b => b.uid === ME);
  assert.deepEqual([meBall.x, meBall.y], [800, 1150], 'your ball is where it was knocked');
  const antje = W.LowiTable.state().balls.find(b => b.uid === ANTJE);
  assert.ok(antje.x >= 50 && antje.y >= 50, 'an old room-coordinate row does not throw Antje off the table');
  assert.equal(JSON.parse(store['lowi:rt-seen']).x, 800, 'seen is updated, so the note shows once');
  /* a move you made yourself gives no note */
  toast.textContent = '';
  rows.length = 0; rows.push({ user_id: ME, rx: 4300, ry: 4300, moved_by: ME, updated_at: new Date().toISOString() });
  await W.LowiTable.load(true);
  assert.equal(toast.textContent, '');
  assert.equal(W.LowiTable.stats().notes, 1);
});
