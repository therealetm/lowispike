/* Oct 24 (E-man fired an energy blast from his iPad profile at his iPhone profile in the Community room: the companions did not
   sit the same on both screens, the blast flew another way and another distance on each, and the target was back on its seat on
   the iPhone). One room frame for everyone: seats come from ids only, each device only shifts the frame so it sits at (0,0). */
'use strict';
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const G = require('../community-galaxy.js'), E = require('../community-energy.js');
const uuid = n => (n >>> 0).toString(16).padStart(8, '0') + '-0000-4000-8000-' + String(n).padStart(12, '0');
const IPAD = uuid(1), IPHONE = uuid(100), shared = Array.from({ length: 7 }, (_, i) => uuid(101 + i));
const bots = G.bots().map(b => b.uid);
function view(meId, other, w, h) {
  const map = G.mapLayout([other, ...shared, ...bots].map(uid => ({ uid })), meId), z = G.mapZooms(map.radius, w, h).z0, big = w >= 640;
  return { map, z, spots: map.spots.map(s => ({ uid: s.uid, me: !!s.me, x: s.x, y: s.y, r: 24 })), drawn: big };
}
const at = (v, id) => v.spots.find(s => s.uid === id);

test('shared room: every device has the same seats, only shifted so you sit at (0,0)', () => {
  const a = view(IPAD, IPHONE, 820, 920), b = view(IPHONE, IPAD, 390, 614);
  assert.deepEqual(at(a, IPAD), { uid: IPAD, me: true, x: 0, y: 0, r: 24 });
  assert.equal(at(b, IPHONE).x, 0); assert.equal(at(b, IPHONE).y, 0);
  assert.equal(a.map.radius, b.map.radius, 'the same room size on both');
  for (const s of a.spots) {
    const o = at(b, s.uid); assert.ok(o, s.uid + ' is on both');
    /* room position = local position minus the local room centre: identical on both devices */
    assert.equal(s.x - a.map.cx, o.x - b.map.cx, s.uid + ' x'); assert.equal(s.y - a.map.cy, o.y - b.map.cy, s.uid + ' y');
  }
  const va = [at(a, IPHONE).x - at(a, IPAD).x, at(a, IPHONE).y - at(a, IPAD).y], vb = [at(b, IPHONE).x - at(b, IPAD).x, at(b, IPHONE).y - at(b, IPAD).y];
  assert.deepEqual(va, vb, 'iPad -> iPhone is the same vector on both screens');
});

test('shared room: pins still never move when someone is selected or talks first', () => {
  const people = []; for (let i = 0; i < 31; i++) people.push({ uid: 'bot:' + i });
  const a = G.mapLayout(people, 'me'), b = G.mapLayout([people[9], people[3], ...people.filter((p, i) => i !== 9 && i !== 3)], 'me');
  assert.deepEqual(a.spots, b.spots); assert.deepEqual([a.cx, a.cy], [b.cx, b.cy]);
  const c = G.mapClamp({ x: 9999, y: -9999, z: 1 }, 600, 352, 550, { x: 100, y: 50 });
  assert.equal(c.x, 100 + 640); assert.equal(c.y, 50 - 640, 'the camera limit is around the room centre');
});

function play(t) { const ev = []; for (let i = 0; i < 1500; i++) ev.push(...t.step(1 / 60)); return ev; }

test('blast: the same start, direction, travel and landing on the shooter iPad and the target iPhone', () => {
  for (const [w, h] of [[820, 920], [1180, 600]]) {
    const a = view(IPAD, IPHONE, w, h), b = view(IPHONE, IPAD, 390, 614);
    const ta = E.table(), tb = E.table();
    ta.sync(a.spots, a.map.radius, { x: a.map.cx, y: a.map.cy }); tb.sync(b.spots, b.map.radius, { x: b.map.cx, y: b.map.cy });
    const me = ta.pos(IPAD), tg = ta.pos(IPHONE), ang = Math.atan2(tg.y - me.y, tg.x - me.x), r0 = 24 * .9;
    const pr = ta.predict({ x: me.x, y: me.y, uid: IPAD }, ang, 1, r0);
    const T = pr.to; assert.ok(T, 'the shot hits someone');
    const sa = ta.fire({ x: me.x, y: me.y, uid: IPAD }, ang, 1, r0, { id: 's1', to: pr.to, ht: pr.ht });
    /* over the wire, exactly as the realtime channel carries it */
    const m = E.unpack(JSON.parse(JSON.stringify(E.pack({ id: 's1', by: IPAD, a: ang, p: 1, to: pr.to, ht: pr.ht, t: 1, f: ta.room(IPAD), g: ta.room(T) }))));
    assert.ok(m.f && m.g, 'the event carries where both stood');
    tb.setAt(IPAD, m.f.x, m.f.y); tb.setAt(T, m.g.x, m.g.y);
    const from = tb.pos(IPAD), sb = tb.fire({ x: from.x, y: from.y, uid: IPAD }, m.a, m.p, 24 * .9, { id: m.id, to: T === IPHONE ? IPHONE : T, ht: m.ht, remote: true });
    assert.ok(Math.abs(Math.atan2(sa.dy, sa.dx) - Math.atan2(sb.dy, sb.dx)) < 1e-6, 'the same direction');
    play(ta); play(tb);
    const ra = ta.room(T), rb = tb.room(T), home = { x: at(a, T).x - a.map.cx, y: at(a, T).y - a.map.cy };
    assert.ok(Math.hypot(ra.x - home.x, ra.y - home.y) > 60, 'the target really moved on the iPad');
    assert.ok(Math.hypot(ra.x - rb.x, ra.y - rb.y) < 12, w + 'x' + h + ': lands in the same room spot on both, ' + JSON.stringify([ra, rb]));
    /* and it stays there: no spring back to the seat */
    play(tb); assert.deepEqual(tb.room(T), rb);
    for (const s of a.spots) { const p = ta.room(s.uid), q = tb.room(s.uid); assert.ok(Math.hypot(p.x - q.x, p.y - q.y) < 12, 'everyone else agrees too: ' + s.uid); }
  }
});

test('blast: an event from an older build (no f/g) still plays', () => {
  const m = E.unpack({ v: 1, id: 'x', by: IPAD, a: 1, p: .5, to: IPHONE, ht: 300, t: 1 });
  assert.ok(m); assert.equal(m.f, null); assert.equal(m.g, null);
  const bad = E.unpack({ v: 1, id: 'x', by: IPAD, a: 1, p: .5, to: IPHONE, ht: 300, t: 1, f: [1e9, 0], g: 'no' });
  assert.equal(bad.f, null); assert.equal(bad.g, null);
});

test('land: knocked companions rest in room coordinates and move with the room when your own seat moves', () => {
  const t = E.table();
  t.sync([{ uid: 'me', me: true, x: 0, y: 0, r: 25 }, { uid: 'T', x: 200, y: 0, r: 22 }], 400, { x: -50, y: -20 });
  t.setAt('T', 300, 100);
  assert.deepEqual(t.snap(), { T: [300, 100] }, 'saved in room coordinates');
  assert.deepEqual(t.pos('T') && [t.pos('T').x, t.pos('T').y], [250, 80]);
  /* my seat moved (the crowd band changed): the whole room shifts on my screen, T keeps its room spot */
  t.sync([{ uid: 'me', me: true, x: 0, y: 0, r: 25 }, { uid: 'T', x: 260, y: 40, r: 22 }], 400, { x: 10, y: 20 });
  assert.deepEqual(t.room('T'), { x: 300, y: 100 });
  const u = E.table(); u.restore({ T: [300, 100] }); u.sync([{ uid: 'me', me: true, x: 0, y: 0, r: 25 }, { uid: 'T', x: 210, y: 20, r: 22 }], 400, { x: 10, y: 20 });
  assert.deepEqual(u.room('T'), { x: 300, y: 100 }, 'restored after a reload at the same room spot');
});

test('page: a shot that arrives while Community is off screen still lands, and the shared frame is wired in', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'community-energy.js'), 'utf8');
  assert.match(js, /if\(!visible\(\)\)\{settle\(t\);/);
  assert.match(js, /if\(m\.f\)t\.setAt\(m\.by,m\.f\.x,m\.f\.y\);if\(to&&m\.g\)t\.setAt\(to,m\.g\.x,m\.g\.y\);/);
  assert.doesNotMatch(js, /ag\.stale\|\|!visible\(\)/, 'off screen is no longer a reason to drop a shot');
  assert.match(js, /LAND_KEY='lowi\.energy\.land\.v3'/); /* Oct 25: v3 = the join-ordered rows */
  assert.match(js, /const PHYS_R=24;/); assert.match(js, /const pinned=b=>false;/);
  const chat = fs.readFileSync(path.join(__dirname, '..', 'community-chat.js'), 'utf8');
  assert.match(chat, /rcx:gx\.map\.cx\|\|0,rcy:gx\.map\.cy\|\|0/);
  assert.equal((chat.match(/G\.mapClamp\([^;]*\{x:gx\.map\.cx,y:gx\.map\.cy\},(fz\.z|fitCam\(gx,v\)\.z)\)/g) || []).length, 2); /* Oct 25: + the fitted zoom */
  /* consent, cooldown and anti-spam stay as they were */
  assert.match(js, /bucket\(sendSt,now,SEND\.max,SEND\.win,SEND\.gap\)/); assert.match(js, /bucket\(recvSt\.get\(m\.by\),now,RECV\.max,RECV\.win,RECV\.gap\)/);
  assert.match(js, /bucket\(inboxSt,now,INBOX\.max,INBOX\.win,0\)/);
});
