/* Oct 28 2026 (Emmanuel, call): the energy blast bounces off the cushions like a billiard ball (angle in = angle out), can come
   back and knock its own shooter (shoot into the cushion next to you: it bounces you off), and holding the middle of the table
   pays points every full hour. room-table-core.js */
const test = require('node:test');
const assert = require('node:assert');
const C = require('../room-table-core.js');
const T = C.T;

/* run a shot step by step and keep every cushion contact with the blast's direction just before and just after it */
function trace(rows, by, dx, dy, p) {
  const t = C.table(); t.load(rows); t.shoot(by, dx, dy, p); const out = []; let prev = { ...t.blast() };
  for (let i = 0; i < T.MAXSTEPS && t.moving(); i++) {
    const n = t.hits().length; t.step(); const hs = t.hits().slice(n);
    for (const h of hs) if (h.k === 'cushion') out.push({ h, before: { ux: prev.ux, uy: prev.uy }, after: t.blast() ? { ux: t.blast().ux, uy: t.blast().uy } : null });
    if (t.blast()) prev = { ...t.blast() };
  }
  return { t, cushions: out };
}

test('a blast that reaches a cushion bounces off it at the same angle (angle in = angle out), it does not disappear', () => {
  /* aimed at the right cushion at 30 degrees, nobody in the way */
  const a = Math.PI / 6, rows = [['me', 300, 1000], ['far', 60, 60]];
  const { t, cushions } = trace(rows, 'me', Math.cos(a), -Math.sin(a), .5);
  assert.ok(cushions.length >= 1, 'it bounced');
  const c = cushions[0];
  assert.ok(Math.abs(c.h.x - (T.W - T.BR)) <= T.BLAST * T.DT, 'first cushion is the right one');
  assert.ok(Math.abs(c.after.ux + c.before.ux) < 1e-12, 'across the cushion flips');
  assert.ok(Math.abs(c.after.uy - c.before.uy) < 1e-12, 'along the cushion stays');
  const inA = Math.atan2(Math.abs(c.before.uy), Math.abs(c.before.ux)), outA = Math.atan2(Math.abs(c.after.uy), Math.abs(c.after.ux));
  assert.ok(Math.abs(inA - outA) < 1e-12, 'same angle off the cushion');
  assert.ok(!t.hits().some(h => h.k === 'fizzle' && h.s === c.h.s), 'not gone at the first cushion');
});

test('the top, bottom and left cushions reflect the same way, and a corner flips both directions', () => {
  for (const [dx, dy, side] of [[0.3, -1, 'top'], [0.3, 1, 'bottom'], [-1, 0.4, 'left']]) {
    const { cushions } = trace([['me', 500, 625], ['x', 950, 60]], 'me', dx, dy, .4);
    const c = cushions[0]; assert.ok(c, side);
    if (side === 'left') { assert.ok(Math.abs(c.after.ux + c.before.ux) < 1e-12 && Math.abs(c.after.uy - c.before.uy) < 1e-12, side); }
    else { assert.ok(Math.abs(c.after.uy + c.before.uy) < 1e-12 && Math.abs(c.after.ux - c.before.ux) < 1e-12, side); }
  }
  /* straight into the top-right corner along the diagonal: both components flip, it comes straight back */
  const cx = T.W - T.BR, cy = T.BR, sx = 500, sy = 625, L = Math.hypot(cx - sx, cy - sy);
  const t = C.table(); t.load([['me', sx, sy]]); t.shoot('me', (cx - sx) / L, (cy - sy) / L, .3); const b0 = { ...t.blast() };
  let flipped = null; for (let i = 0; i < 400 && t.blast(); i++) { const n = t.hits().length; t.step(); if (t.hits().slice(n).some(h => h.k === 'cushion')) { flipped = { ...t.blast() }; break; } }
  assert.ok(flipped, 'it reached the corner');
  assert.ok(flipped.ux < 0 && flipped.uy > 0, 'it comes back out of the corner');
  assert.ok(Math.abs(flipped.ux + b0.ux) < 1e-9 && Math.abs(flipped.uy + b0.uy) < 1e-9, 'a corner reverses it');
});

test('it bounces several times, loses punch each cushion, and fizzles after BOUNCES cushions', () => {
  /* a shallow angle with nobody to hit: it goes cushion to cushion */
  const t = C.table(); t.load([['me', 100, 1150]]); t.shoot('me', 1, -.37, 1); const v0 = t.blast().v; let vs = [];
  for (let i = 0; i < T.MAXSTEPS && t.blast(); i++) { const n = t.hits().length; t.step(); if (t.hits().slice(n).some(h => h.k === 'cushion') && t.blast()) vs.push(t.blast().v); }
  const cush = t.hits().filter(h => h.k === 'cushion'), fz = t.hits().filter(h => h.k === 'fizzle'), bl = t.hits().filter(h => h.k === 'blast');
  if (!bl.length) {
    assert.equal(cush.length, T.BOUNCES, 'exactly BOUNCES cushions'); assert.equal(fz.length, 1, 'then it fizzles');
  } else assert.ok(cush.length >= 1 && cush.length <= T.BOUNCES);
  vs.forEach((v, i) => assert.ok(Math.abs(v - v0 * Math.pow(T.BWALL, i + 1)) < 1e-6, 'punch shrinks per cushion'));
  t.settle(); assert.ok(!t.moving(), 'everything rests');
});

test('a bounced blast hits another ball: the hit is from the reflected direction', () => {
  /* me at the bottom, target to the upper left; aim at the right cushion so the reflection goes to the target */
  const me = [700, 1000], tg = [300, 400], wx = T.W - T.BR;
  /* mirror the target across the right cushion line and aim at the mirror image */
  const mx = 2 * wx - tg[0], my = tg[1], L = Math.hypot(mx - me[0], my - me[1]);
  const r = C.simulate([['me', me[0], me[1]], ['tg', tg[0], tg[1]]], 'me', (mx - me[0]) / L, (my - me[1]) / L, .6);
  assert.equal(r.hit, 'tg', 'the target took the ricochet'); assert.equal(r.cushions, 1); assert.equal(r.self, false);
  const t = C.table(); t.load([['me', me[0], me[1]], ['tg', tg[0], tg[1]]]); t.shoot('me', (mx - me[0]) / L, (my - me[1]) / L, .6);
  for (let i = 0; i < 2000 && t.blast(); i++) t.step();
  const b = t.find('tg'); assert.ok(b.vx < 0 && b.vy < 0, 'pushed on along the reflected line (left and up)');
});

test('shoot into the cushion right next to you: the blast bounces back and knocks you away from the wall', () => {
  for (const [x, y, dx, dy, side] of [[T.R, 625, -1, 0, 'left'], [T.W - T.R, 625, 1, 0, 'right'], [500, T.R, 0, -1, 'top'], [500, T.H - T.R, 0, 1, 'bottom'], [T.R + 20, 900, -1, 0, 'left, a little off the wall']]) {
    for (const p of [.08, .5, 1]) {
      const t = C.table(); t.load([['me', x, y], ['zz', 900, 100]]); t.shoot('me', dx, dy, p);
      for (let i = 0; i < 60 && t.blast(); i++) t.step();
      const h = t.hits().find(k => k.k === 'blast');
      assert.ok(h && h.uid === 'me' && h.self, side + ' p' + p + ': it hit me');
      const b = t.find('me'); assert.ok(b.vx * dx + b.vy * dy < 0, side + ': pushed away from the cushion');
      t.settle(); const e = t.find('me');
      assert.ok(e.x >= T.R && e.x <= T.W - T.R && e.y >= T.R && e.y <= T.H - T.R, side + ': still on the table');
      assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y), 'no NaN');
      assert.ok(Math.hypot(e.x - x, e.y - y) > 150, side + ' p' + p + ': it really bounced me off (' + Math.round(Math.hypot(e.x - x, e.y - y)) + ')');
    }
  }
});

test('a ricochet can come round and hit the shooter later too; before its first cushion it never hits the shooter', () => {
  /* straight up from the middle: it comes straight back down and hits you */
  const r = C.simulate([['me', 500, 625], ['zz', 60, 60]], 'me', 0, -1, .7);
  assert.equal(r.hit, 'me'); assert.equal(r.self, true); assert.equal(r.cushions, 1);
  const t = C.table(); t.load([['me', 500, 625]]); t.shoot('me', 0, -1, .7);
  for (let i = 0; i < 400 && t.blast(); i++) { t.step(); if (t.blast() && t.blast().b === 0) { const d = Math.hypot(t.blast().x - 500, t.blast().y - 625); assert.ok(d >= T.R + T.BR, 'it left your ball'); } }
  const h = t.hits().find(k => k.k === 'blast'); assert.ok(h && h.b === 1, 'the hit came after the cushion');
  /* the shooter takes the blast's push in the direction it came back */
  assert.ok(t.find('me').vy > 0 && Math.abs(t.find('me').vx) < 1e-9, 'pushed down, the way the blast came back');
});

test('recoil and knockback stay sane: no NaN, nothing leaves the table, energy and steps are bounded (500 random shots)', () => {
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
  for (let k = 0; k < 500; k++) {
    const n = 2 + Math.floor(rnd() * 8), rows = [];
    for (let i = 0; i < n; i++) rows.push(['u' + i, T.R + rnd() * (T.W - 2 * T.R), T.R + rnd() * (T.H - 2 * T.R)]);
    const t = C.table(); t.load(rows); t.relax(40); const a = rnd() * Math.PI * 2;
    t.shoot('u0', Math.cos(a), Math.sin(a), .08 + rnd() * .92);
    let maxE = 0; let steps = 0; while (t.moving() && steps < T.MAXSTEPS) { t.step(); steps++; maxE = Math.max(maxE, t.energy()); }
    assert.ok(steps < T.MAXSTEPS, 'comes to rest');
    assert.ok(maxE <= .5 * T.VMAX * T.VMAX * 1.05, 'never more energy than one full blast');
    for (const b of t.balls()) { assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y)); assert.ok(b.x >= T.R - 1e-9 && b.x <= T.W - T.R + 1e-9 && b.y >= T.R - 1e-9 && b.y <= T.H - T.R + 1e-9); }
    assert.ok(t.hits().filter(h => h.k === 'cushion').length <= T.BOUNCES);
  }
});

test('ricochet shots are deterministic: the shooter and a replaying phone get the same rest positions', () => {
  const uids = Array.from({ length: 25 }, (_, i) => 'id' + String(i).padStart(3, '0')); const sp = C.homeSpots(uids, {});
  const start = uids.map(u => [u, sp[u].x, sp[u].y]);
  for (const [dx, dy, p] of [[1, -.2, 1], [-.3, -1, .6], [.71, .7, .9], [-1, .05, .2]]) {
    const a = C.simulate(start, uids[3], dx, dy, p), b = C.simulate(JSON.parse(JSON.stringify(start)), uids[3], dx, dy, p);
    assert.deepEqual(a.final, b.final);
    const m = C.unpack(JSON.parse(JSON.stringify(C.pack({ id: 'x', by: uids[3], dx, dy, p, s: start, f: a.final }))));
    assert.equal(m.legacy, false); assert.deepEqual(C.simulate(m.s, m.by, m.dx, m.dy, m.p, m.legacy).final, a.final);
  }
  /* a v:2 shot from an older build replays with the old straight blast */
  const old = C.unpack({ v: 2, k: 'bt', by: 'a', s: [['a', 500, 600], ['b', 100, 100]], dx: 1, dy: 0, p: 1 });
  assert.equal(old.legacy, true); const r = C.simulate(old.s, old.by, old.dx, old.dy, old.p, old.legacy);
  assert.equal(r.hit, null, 'old shot: straight into the cushion, gone');
});

test('the aiming guide follows the bounce and names the same ball the shot hits', () => {
  const rows = [['me', 700, 1000], ['tg', 300, 400], ['o', 850, 200]];
  const t = C.table(); t.load(rows);
  let agree = 0, total = 0;
  for (let a = 0; a < 360; a += 3) {
    const dx = Math.cos(a * Math.PI / 180), dy = Math.sin(a * Math.PI / 180), me = t.find('me');
    const g = C.guidePath(t.balls(), 'me', me.x + dx * (T.R + T.BR + 1), me.y + dy * (T.R + T.BR + 1), dx, dy, T.BOUNCES);
    const r = C.simulate(rows, 'me', dx, dy, .5); total++;
    if (g.uid === r.hit) agree++;
    assert.ok(g.pts.length >= 2);
  }
  assert.ok(agree / total > .93, 'guide and shot agree (' + agree + '/' + total + ')');
  /* against the cushion next to you: the guide comes straight back to you */
  const g2 = C.guidePath([{ uid: 'me', x: T.R, y: 625, r: T.R }], 'me', T.R - (T.R + T.BR + 1), 625, -1, 0, 2);
  assert.equal(g2.uid, 'me'); assert.equal(g2.self, true);
});

test('the middle: one holder, the ball inside the ring closest to the centre, the same on every phone', () => {
  assert.equal(C.midHolder([]), null);
  assert.equal(C.midHolder([{ uid: 'a', x: 100, y: 100 }]), null, 'nobody inside');
  assert.equal(C.midHolder([{ uid: 'a', x: T.MID_X + 80, y: T.MID_Y }, { uid: 'b', x: T.MID_X - 20, y: T.MID_Y - 10 }]), 'b', 'the closer one holds it');
  const a = [{ uid: 'z', x: T.MID_X + 30, y: T.MID_Y }, { uid: 'y', x: T.MID_X - 30, y: T.MID_Y }];
  assert.equal(C.midHolder(a), 'y', 'tie: lower uid'); assert.equal(C.midHolder(a.slice().reverse()), 'y', 'order does not matter');
  assert.equal(C.midHolder([{ uid: 'a', x: T.MID_X + T.MID_R + .01, y: T.MID_Y }]), null, 'just outside the ring');
  assert.ok(C.inMid(T.MID_X, T.MID_Y + T.MID_R));
});

test('every full hour holding the middle pays once; losing it or getting moved while away starts over', () => {
  const H = T.HOUR, t0 = 1_800_000_000_000, me = 'me', at = { x: T.MID_X, y: T.MID_Y };
  const look = (st, dt, holder, pos) => C.midTick(st, { u: me, holder: holder === undefined ? me : holder, x: (pos || at).x, y: (pos || at).y, now: t0 + dt });
  let r = look(null, 0); assert.deepEqual(r.pay, []); assert.ok(r.fresh); let st = r.st;
  /* the app looks every 15 s for 59 min: nothing yet */
  for (let s = 15000; s < H; s += 15000) { r = look(st, s); st = r.st; assert.deepEqual(r.pay, []); }
  r = look(st, H); st = r.st; assert.deepEqual(r.pay, [1], 'first full hour'); 
  r = look(st, H + 10); st = r.st; assert.deepEqual(r.pay, [], 'never twice');
  r = look(st, H + 15000); st = r.st; assert.deepEqual(r.pay, []);
  /* app closed for 2.5 h, ball untouched on the same spot: the hours are paid on the next look */
  r = look(st, 3.6 * H); st = r.st; assert.deepEqual(r.pay, [2, 3]);
  assert.equal(r.st.id, t0, 'same hold'); assert.ok(r.next > 0 && r.next <= H);
  /* someone knocks you out: the hold ends */
  r = look(st, 3.7 * H, 'other'); assert.equal(r.st, null); assert.ok(r.lost);
  /* back in: a new hold from zero */
  r = look(r.st, 3.8 * H); assert.ok(r.fresh); assert.deepEqual(r.pay, []); st = r.st;
  r = look(st, 4.79 * H); assert.deepEqual(r.pay, []); st = r.st;
  /* moved while the app was closed (still the holder, but on another spot): we cannot know what happened, so it starts over */
  r = look(st, 6 * H, me, { x: T.MID_X + 20, y: T.MID_Y }); assert.ok(r.fresh); assert.deepEqual(r.pay, []);
  /* moved while the app was open (looks 15 s apart): the hold goes on */
  st = r.st; r = look(st, 6 * H + 15000, me, { x: T.MID_X + 25, y: T.MID_Y }); assert.ok(!r.fresh); st = r.st;
  /* the whole-second Date header can read a hair backwards: still the same hold */
  { const r2 = look(st, 6 * H + 15000 - 900, me, { x: T.MID_X + 25, y: T.MID_Y }); assert.ok(!r2.fresh); assert.equal(r2.st.last, st.last); }
  /* a clock that goes backwards does not pay anything */
  r = look(st, 2 * H); assert.ok(r.fresh); assert.deepEqual(r.pay, []);
  /* no server time: nothing happens */
  r = C.midTick(st, { u: me, holder: me, x: 1, y: 1, now: NaN }); assert.deepEqual(r.pay, []);
  /* someone else's hold is never paid to you */
  r = C.midTick(null, { u: me, holder: 'other', x: at.x, y: at.y, now: t0 }); assert.equal(r.st, null);
});

test('two players: only the holder earns, and the fight for the middle hands it over', () => {
  const H = T.HOUR, t0 = 1_800_000_000_000;
  let A = null, B = null, paidA = [], paidB = [];
  const balls = { a: { uid: 'a', x: T.MID_X + 10, y: T.MID_Y }, b: { uid: 'b', x: T.MID_X + 85, y: T.MID_Y } };
  const look = dt => { const h = C.midHolder(Object.values(balls));
    let r = C.midTick(A, { u: 'a', holder: h, x: balls.a.x, y: balls.a.y, now: t0 + dt }); A = r.st; paidA.push(...r.pay);
    r = C.midTick(B, { u: 'b', holder: h, x: balls.b.x, y: balls.b.y, now: t0 + dt }); B = r.st; paidB.push(...r.pay); };
  for (let s = 0; s <= 2.5 * H; s += 60000) look(s);
  assert.deepEqual(paidA, [1, 2]); assert.deepEqual(paidB, [], 'inside the ring but not closest: no points');
  /* b knocks a out and takes the centre */
  balls.a.x = 200; balls.b.x = T.MID_X;
  for (let s = 2.5 * H + 60000; s <= 4.6 * H; s += 60000) look(s);
  assert.deepEqual(paidA, [1, 2], 'a stops earning'); assert.deepEqual(paidB, [1, 2], 'b earns from the moment it took the middle');
});
