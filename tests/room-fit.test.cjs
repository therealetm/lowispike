/* Oct 25, 2026 (Emmanuel, real iPhone on build 20261025-132728): "when I open the circle it's zoomed in to me. I wanted to be zoomed
   in where everyone in the circle is visually seen" and "there's no structure ... the newest people are now at the top". The Room
   seats people in rows by when they joined (newest row on top), opens fitted to everyone, and every name stays readable. */
'use strict';
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const G = require('../community-galaxy.js'), E = require('../community-energy.js'), HA = require('../hidden-accounts.js');
const uuid = n => (n >>> 0).toString(16).padStart(8, '0') + '-0000-4000-8000-' + String(n).padStart(12, '0');
const DAY = 864e5, T0 = Date.parse('2026-10-01T00:00:00Z');
/* 16 people who joined one day apart: uuid(1) the oldest, uuid(16) the newest */
const crowd = n => Array.from({ length: n }, (_, i) => ({ uid: uuid(i + 1), n: 'Person ' + (i + 1), j: T0 + i * DAY }));

test('rows by join date: the newest member sits on the top row, the longest-standing at the bottom', () => {
  const P = crowd(16), me = P[5], L = G.mapLayout(P.filter(p => p !== me), me.uid, { meJ: me.j });
  const y = id => L.spots.find(s => s.uid === id).y;
  assert.ok(y(uuid(16)) < y(uuid(1)), 'newest above oldest');
  for (let i = 2; i <= 16; i++) assert.ok(y(uuid(i)) <= y(uuid(i - 1)) + 20, 'person ' + i + ' is not below an older member');
  const rows = new Set(L.spots.map(s => Math.round(s.y / 40))).size;
  assert.ok(rows >= 3 && rows <= 8, 'a few clear rows, not a cloud: ' + rows);
  assert.deepEqual(L.spots[0], { uid: me.uid, me: true, x: 0, y: 0 }, 'you still sit at (0,0) of your own frame');
  let min = 1e9; for (const p of L.spots) for (const q of L.spots) if (p !== q) min = Math.min(min, Math.hypot(p.x - q.x, p.y - q.y));
  assert.ok(min >= 100, 'nobody sits on top of anyone: ' + Math.round(min));
});

test('rows by join date: a new member takes the next seat on top and nobody else moves', () => {
  const P = crowd(15), me = P[0], a = G.mapLayout(P.slice(1), me.uid, { meJ: me.j });
  const b = G.mapLayout(P.slice(1).concat([{ uid: uuid(99), n: 'Newbie', j: T0 + 40 * DAY }]), me.uid, { meJ: me.j });
  for (const s of a.spots) { const o = b.spots.find(x => x.uid === s.uid); assert.deepEqual([o.x, o.y], [s.x, s.y], s.uid + ' stayed'); }
  const nb = b.spots.find(s => s.uid === uuid(99));
  assert.ok(b.spots.every(s => s.uid === uuid(99) || nb.y <= s.y + 1), 'the newcomer is on the top row');
  assert.deepEqual([a.cx, a.cy], [b.cx, b.cy], 'the room frame did not shift');
});

test('rows by join date: every device computes the same seats (only shifted so you sit at 0,0)', () => {
  const P = crowd(12), A = P[2], B = P[9];
  const la = G.mapLayout(P.filter(p => p !== A), A.uid, { meJ: A.j }), lb = G.mapLayout(P.filter(p => p !== B), B.uid, { meJ: B.j });
  for (const s of la.spots) { const o = lb.spots.find(x => x.uid === s.uid); assert.equal(s.x - la.cx, o.x - lb.cx); assert.equal(s.y - la.cy, o.y - lb.cy); }
  assert.equal(la.radius, lb.radius);
});

test('roomMembers: someone with several accounts under one name keeps the date they first joined', () => {
  const r = G.roomMembers([{ uid: uuid(1), n: 'Ana', lv: 1, j: T0 + 9 * DAY }, { uid: uuid(2), n: 'Ana', lv: 4, j: T0 }, { uid: uuid(3), n: 'Bo', j: T0 + DAY }], {});
  const ana = r.layout.find(p => p.n === 'Ana');
  assert.equal(ana.uid, uuid(2)); assert.equal(ana.j, T0, 'earliest join of the group');
  const r2 = G.roomMembers([{ uid: uuid(1), n: 'Ana', lv: 9, j: T0 + 9 * DAY }, { uid: uuid(2), n: 'Ana', lv: 4, j: T0 }], {});
  assert.equal(r2.layout[0].j, T0, 'whichever account is shown, the seat is the same');
});

/* the fitted camera, then the same label pass the page runs (community-chat.js place()) */
function project(L, cam, w, h, big) {
  const Z = G.mapZooms(L.radius, w, h, cam.z), f = Math.max(.68, Math.min(1.2, Math.sqrt(cam.z / Z.z0))), fn = Math.max(.8, f);
  return L.spots.map(s => ({ id: s.uid, x: w / 2 + (s.x - cam.x) * cam.z, y: h * .5 + (s.y - cam.y) * cam.z, s: (s.me ? (big ? 64 : 54) : (big ? 56 : 46)) * f, nw: ((big ? 56 : 46) + 30) * fn, bw: 0, bh: 0, bub: false }));
}
for (const [label, w, h] of [['iPhone 13', 390, 614], ['iPad', 820, 1000], ['small iPhone', 375, 520]]) {
  test('fit to everyone on ' + label + ': the Room opens with every companion on screen and every full name readable', () => {
    for (const n of [6, 16, 24]) {
      const P = crowd(n), me = P[3], L = G.mapLayout(P.filter(p => p !== me), me.uid, { meJ: me.j });
      const cam = G.mapFit(L.spots, w, h);
      const Z = G.mapZooms(L.radius, w, h, cam.z);
      assert.ok(cam.z <= Z.z0 + 1e-9 && cam.z >= Z.zmin - 1e-9, 'within the zoom limits');
      const c = G.mapClamp(cam, L.radius, w, h, { x: L.cx, y: L.cy }, cam.z);
      assert.deepEqual([Math.round(c.x), Math.round(c.y), +c.z.toFixed(4)], [Math.round(cam.x), Math.round(cam.y), +cam.z.toFixed(4)], 'the camera limits keep the fitted view');
      const items = project(L, cam, w, h);
      for (const it of items) {
        assert.ok(it.x - it.nw / 2 >= 0 && it.x + it.nw / 2 <= w, n + ' people: ' + it.id + ' name inside left/right');
        assert.ok(it.y - it.s / 2 >= 0 && it.y + it.s / 2 + 20 <= h, n + ' people: ' + it.id + ' inside top/bottom');
      }
      const lab = G.mapLabels(items, { w, h });
      for (const it of items) assert.equal(lab.get(it.id).at, 'b', n + ' people: ' + it.id + ' shows its full name under its companion');
    }
  });
}

/* Oct 25 (live check, iPhone 13 at 390x844: "Emmy" shrank to "E" in the bottom row next to You): the energy pad sits in the
   Room's bottom-right corner and the label pass keeps names off it, so the fitted view must leave the pad's corner free.
   Galaxy and pad sizes are the ones measured on the page (iPhone 13: galaxy 352x465, pad centre 304,417, 84 wide). */
for (const [label, w, h, pad, big] of [['iPhone 13', 352, 465, { x: 304, y: 417, s: 84 }], ['iPhone 15 Pro Max', 392, 553, { x: 344, y: 505, s: 84 }], ['iPad', 770, 715, { x: 712, y: 657, s: 96 }, true]]) {
  test('fit keeps every full name off the energy pad on ' + label + ' (no name shrinks to a letter)', () => {
    for (const n of [6, 15, 16, 20]) for (const mi of [0, 1, 2, n - 1]) {
      const P = crowd(n), me = P[mi], L = G.mapLayout(P.filter(p => p !== me), me.uid, { meJ: me.j });
      const avoid = { x: pad.x - pad.s / 2, y: pad.y - pad.s / 2, w: pad.s, h: pad.s };
      const cam = G.mapFit(L.spots, w, h, { avoid, big });
      const items = project(L, cam, w, h, big); items.push({ id: '__ce', x: pad.x, y: pad.y, s: pad.s, nw: 0, bw: 0, bh: 0, bub: false });
      const lab = G.mapLabels(items, { w, h });
      for (const it of items) if (it.id !== '__ce') {
        assert.ok(it.x > 0 && it.x < w && it.y > 0 && it.y < h, n + ' people, you #' + mi + ': ' + it.id + ' on screen');
        assert.equal(lab.get(it.id).at, 'b', n + ' people, you #' + mi + ': ' + it.id + ' shows its full name under its companion');
      }
      assert.ok(cam.z >= G.mapFit(L.spots, w, h, { big }).z * .6, 'the pad costs a little zoom, not half of it');
    }
  });
}

test('fit on a small iPhone (SE, Room 337x315): keeping the pad corner free never loses more names than ignoring the pad', () => {
  const w = 337, h = 315, pad = { x: 289, y: 267, s: 84 }, avoid = { x: pad.x - 42, y: pad.y - 42, w: 84, h: 84 };
  const lostAt = (L, cam) => { const items = project(L, cam, w, h); items.push({ id: '__ce', x: pad.x, y: pad.y, s: pad.s, nw: 0, bw: 0, bh: 0, bub: false }); const lab = G.mapLabels(items, { w, h }); return items.filter(it => it.id !== '__ce' && lab.get(it.id).at !== 'b').length; };
  for (const n of [6, 15, 16]) for (const mi of [0, n - 1]) {
    const P = crowd(n), me = P[mi], L = G.mapLayout(P.filter(p => p !== me), me.uid, { meJ: me.j });
    assert.ok(lostAt(L, G.mapFit(L.spots, w, h, { avoid })) <= lostAt(L, G.mapFit(L.spots, w, h)), n + ' people, you #' + mi);
  }
});

test('fit: two people are not blown up past the normal arrival zoom', () => {
  const P = crowd(2), L = G.mapLayout([P[1]], P[0].uid, { meJ: P[0].j }), cam = G.mapFit(L.spots, 390, 614);
  assert.ok(cam.z <= G.mapZooms(L.radius, 390, 614).z0 + 1e-9);
});

test('the page opens the Room fitted to everyone and remembers a zoom you chose yourself', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'community-chat.js'), 'utf8');
  assert.ok(/G\.mapFit\(/.test(src), 'place() starts from the fitted camera');
  assert.ok(!/if\(!cam\)cam=\{x:0,y:0,z:Z\.z0\}/.test(src), 'no longer opens zoomed on you');
  assert.ok(/camUser/.test(src), 'a zoom you chose is kept for the session');
});

test('join dates reach the Room: profiles select joined_at, people carry j, the host gives your own', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'), chat = fs.readFileSync(path.join(__dirname, '..', 'community-chat.js'), 'utf8');
  assert.ok(/from\("profiles"\)\.select\("id,name,[^"]*joined_at[^"]*"\)/.test(html), 'the people query reads joined_at');
  assert.ok(/j:\s*Date\.parse\(r\.joined_at\)/.test(html), 'mapPerson keeps the join time');
  assert.ok(/joined:\s*\(\)\s*=>/.test(html), 'the host exposes your own join time');
  assert.ok(/meJ:/.test(chat) && /j:\+p\.j\|\|0/.test(chat), 'the Room passes join times into the layout');
});

test('seats from the old scattered layout are not replayed into the new rows', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'community-energy.js'), 'utf8');
  assert.ok(/lowi\.energy\.land\.v3/.test(src), 'saved landings start fresh');
  assert.ok(/ROWS_SINCE/.test(src) && /updated_at/.test(src), 'shared rest spots older than the rows layout are skipped');
});

test('hidden: Manuuii (Emmanuel\'s own extra account) no longer gets its own bubble', () => {
  assert.ok(HA.isHidden('4add63ec-61d6-4187-9c62-bd78c427be24'));
  assert.ok(!HA.isHidden('83077af7-8475-4628-9328-25bd335db240'), 'his real eman account stays');
});

/* Oct 25 (live WebKit run: the Room opened on the plain fit because the energy pad was not measurable yet, e.g. hidden during the
   zoom-out from Home): fitCam looks again shortly after, so the view moves to keep the pad corner free once the pad is there */
test('wired: the fit looks for the energy pad again when it is not measurable yet, and keeps its corner free once it is', () => {
  const src = require('fs').readFileSync(__dirname + '/../community-chat.js', 'utf8');
  const i = src.indexOf('function fitCam('), body = src.slice(i, src.indexOf('\nfunction ', i + 10));
  assert.ok(/avoid/.test(body) && /LowiEnergy\.keepOut/.test(body), 'fit passes the pad as avoid');
  assert.ok(/koRetry/.test(body) && /setTimeout\(\s*schedulePlace/.test(body), 'no pad yet: place again shortly');
});
