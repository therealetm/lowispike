/* Oct 28 2026: the Billardtisch in a real browser (tools/sim harness: fake Supabase, 16 members).
   node tools/room-table-probe.cjs [chromium|webkit] [outDir]
   Checks: the table replaces the endless map (no field, no "Neues Bild" bubbles, no zoom), every ball fits on the felt, a real
   pull-back-and-release shot rolls balls (frame captures + positions over time + frame timing), the rest positions are written to
   companion_rest, a shot from another phone arriving on the realtime channel replays to the same rest positions, a knock while you
   were away rolls your ball and names who did it, and opening/closing the Room six times with shots throws nothing. */
const H = require('./sim/harness.cjs');
const fs = require('fs');
const engine = process.argv[2] || 'chromium', out = process.argv[3] || '/tmp/room-table-probe', root = process.argv[4] || require('path').join(__dirname, '..');
fs.mkdirSync(out, { recursive: true });
const res = { engine, ok: true, fails: [] };
const fail = m => { res.ok = false; res.fails.push(m); console.log('FAIL ' + m); };
const log = (k, v) => { console.log(k + ' ' + JSON.stringify(v)); };
(async () => {
  const o = { engine, members: 16, messages: 30, probe: false, lang: 'de', root };
  if (engine === 'webkit') o.device = 'iPhone 13'; else o.viewport = { width: 390, height: 844 };
  const R = await H.open(o), P = R.page;
  await R.goto(); await H.sleep(8000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  const openRoom = async () => { await P.evaluate(() => goTab('foryou')); await H.sleep(1500); await P.evaluate(() => { try { LowiRoomsUI.setTab(false); } catch (e) { } }); await H.sleep(2500); };
  await openRoom();
  /* 1. the table is the Room */
  const look = await P.evaluate(() => {
    const vis = el => { if (!el) return false; const b = el.getBoundingClientRect(), s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; };
    const felt = document.querySelector('.rt-felt'), fr = felt && felt.getBoundingClientRect();
    const balls = [...document.querySelectorAll('.rt-ball')].map(b => { const r = b.querySelector('.rt-orb').getBoundingClientRect(); return { uid: b.dataset.uid, l: r.left, t: r.top, r: r.right, b: r.bottom, name: b.querySelector('.rt-name').textContent }; });
    const out = balls.filter(b => b.l < fr.left - 1 || b.t < fr.top - 1 || b.r > fr.right + 1 || b.b > fr.bottom + 1).length;
    const bubbles = [...document.querySelectorAll('#cgGalaxy *')].filter(e => vis(e) && /Neues Bild/.test(e.textContent || '') && !e.closest('.rt-wrap')).length;
    const gb = document.getElementById('cgGalaxy').getBoundingClientRect(), tree = document.querySelector('.nm-ctree'), tb = tree && tree.getBoundingClientRect(), rail = document.querySelector('.rt-rail').getBoundingClientRect();
    return { felt: fr && [Math.round(fr.left), Math.round(fr.top), Math.round(fr.width), Math.round(fr.height)], balls: balls.length, people: LowiTable.state().people, out, field: vis(document.getElementById('cgField')), sky: vis(document.querySelector('.cg-sky')), joy: vis(document.querySelector('.ce-joy')), bubbles,
      me: (document.querySelector('.rt-ball.me') || { dataset: {} }).dataset.uid || null, meName: (document.querySelector('.rt-ball.me .rt-name') || {}).textContent || null, d: balls[0] ? Math.round(balls[0].r - balls[0].l) : 0, treeOverlap: !!(tb && tb.width && tb.top < rail.bottom - 1 && tb.right > rail.left), wide: document.documentElement.scrollWidth > innerWidth + 1, gal: [Math.round(gb.width), Math.round(gb.height)] };
  });
  res.look = look; log('look', look);
  if (!look.felt) fail('no table'); if (look.balls < 10) fail('balls ' + look.balls); if (look.out) fail(look.out + ' balls off the felt'); if (look.field || look.sky || look.joy) fail('old map still visible'); if (look.bubbles) fail('Neues Bild bubbles visible'); if (!look.me) fail('no own ball'); if (!/^(Du|You|Tú)$/.test(look.meName || '')) fail('own ball not labelled Du/You'); if (look.treeOverlap) fail('Freundesbaum over the table'); if (look.wide) fail('sideways scroll');
  await P.screenshot({ path: out + '/0-table.png' });
  /* 2. zoom gestures do nothing */
  const before = await P.evaluate(() => JSON.stringify(LowiTable.state().balls) + LowiTable.state().scale);
  const fc = await P.evaluate(() => { const r = document.querySelector('.rt-felt').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await P.mouse.move(fc.x, fc.y); await P.mouse.wheel(0, -400); await H.sleep(400);
  const after = await P.evaluate(() => JSON.stringify(LowiTable.state().balls) + LowiTable.state().scale);
  if (before !== after) fail('wheel changed the table');
  /* 3. a real shot: pull back from the nearest ball's direction and let go */
  const plan = await P.evaluate(() => { const st = LowiTable.state(), me = st.balls.find(b => b.uid === st.me) || st.balls[0]; let best = null, bd = 1e9; for (const b of st.balls) { if (b.uid === me.uid) continue; const d = Math.hypot(b.x - me.x, b.y - me.y); if (d < bd) { bd = d; best = b; } }
    const s = LowiTable.screen(me.uid), dx = best.x - me.x, dy = best.y - me.y, L = Math.hypot(dx, dy); return { s, ux: dx / L, uy: dy / L, target: best.uid, me: me.uid }; });
  const st0 = await P.evaluate(() => LowiTable.stats());
  const sx = Math.min(Math.max(plan.s.x, 40), 350), sy = Math.min(Math.max(plan.s.y, 200), 600);
  await P.mouse.move(sx, sy); await P.mouse.down();
  for (let i = 1; i <= 8; i++) { await P.mouse.move(sx - plan.ux * 20 * i, sy - plan.uy * 20 * i); await H.sleep(16); }
  await P.screenshot({ path: out + '/1-aim.png' });
  const t0 = Date.now(); await P.mouse.up();
  const track = [], shots = [];
  for (let i = 0; i < 200; i++) {
    const s = await P.evaluate(() => { const st = LowiTable.state(); const m = {}; for (const b of document.querySelectorAll('.rt-ball')) m[b.dataset.uid] = b.style.transform; return { play: st.play, moving: st.moving, tf: m }; });
    track.push({ t: Date.now() - t0, play: s.play, moving: s.moving, tf: s.tf });
    if ([1, 3, 6, 12].includes(i)) { await P.screenshot({ path: out + '/2-roll-' + String(i).padStart(2, '0') + '.png' }); shots.push(i); }
    if (!s.play && i > 2) break; await H.sleep(i < 14 ? 120 : 600);
  }
  const st1 = await P.evaluate(() => LowiTable.stats());
  const rolled = new Set(); for (let i = 1; i < track.length; i++) for (const u in track[i].tf) if (track[i].tf[u] !== track[i - 1].tf[u]) rolled.add(u);
  const frames = st1.frames - st0.frames, ms = track[track.length - 1].t;
  const _shot = res.shot = { last: st1.lastShot, rolledBalls: rolled.size, samplesMoving: track.filter(x => x.moving).length, ms, frames, fps: Math.round(frames / (ms / 1000)), slowFrames: st1.slow - st0.slow, maxDtMs: Math.round(st1.maxDt * 1000) };
  log('shot', _shot);
  if (!st1.lastShot || st1.shots !== st0.shots + 1) fail('drag did not fire'); else { if (!st1.lastShot.hit) fail('shot missed'); if (rolled.size < 2) fail('nothing rolled'); }
  await H.sleep(500); await P.screenshot({ path: out + '/3-rest.png' });
  /* 4. the rest positions were written for everyone that moved */
  const writes = (R.sim ? R.sim.writes : []).filter(w => w.t === 'companion_rest');
  const wrote = writes.reduce((n, w) => n + (Array.isArray(w.body) ? w.body.length : 1), 0);
  res.persist = { writes: writes.length, rows: wrote, moved: st1.lastShot && st1.lastShot.moved, sample: writes.length ? JSON.stringify(writes[writes.length - 1].body).slice(0, 160) : null };
  log('persist', res.persist);
  if (!wrote) fail('no companion_rest rows written');
  /* 5. a shot from another phone on the realtime channel replays to the same rest positions */
  const pk = await P.evaluate(() => { const C = LowiTable.core, st = LowiTable.state(), other = st.balls.find(b => b.uid !== st.me && /^[0-9a-f]{8}-/.test(b.uid)); const start = st.balls.map(b => [b.uid, b.x, b.y]);
    const tgt = st.balls.find(b => b.uid !== other.uid); const dx = tgt.x - other.x, dy = tgt.y - other.y; const r = C.simulate(start, other.uid, dx, dy, .85);
    return { pack: C.pack({ id: 'probe-remote-1', by: other.uid, n: 'Probe', t: Date.now(), dx, dy, p: .85, s: start, f: r.final }), final: r.final, moved: r.moved.length }; });
  const n = R.sim ? R.sim.shoot('*', pk.pack) + R.sim.shoot('all', pk.pack) : 0;
  await H.sleep(250);
  const mid = await P.evaluate(() => LowiTable.state().play);
  await P.screenshot({ path: out + '/4-remote-roll.png' });
  for (let i = 0; i < 240; i++) { if (!(await P.evaluate(() => LowiTable.state().play))) break; await H.sleep(500); }
  const got = await P.evaluate(() => LowiTable.state().balls);
  let maxErr = 0; for (const r of pk.final) { const b = got.find(x => x.uid === r[0]); if (b) maxErr = Math.max(maxErr, Math.abs(b.x - r[1]), Math.abs(b.y - r[2])); }
  const rst = await P.evaluate(() => LowiTable.stats());
  res.remote = { sockets: n, received: rst.remote, rolledOnScreen: mid, moved: pk.moved, maxErr };
  log('remote', res.remote);
  if (!rst.remote) fail('remote shot not received'); if (maxErr > 1.5) fail('remote replay differs by ' + maxErr);
  /* 6. knocked while away: your ball rolls from where you saw it, and a note says who */
  const away = await P.evaluate(() => { const st = LowiTable.state(); localStorage.setItem('lowi:rt-seen', JSON.stringify({ u: st.me, x: 150, y: 200, t: Date.now() - 3600e3 })); return st.me; });
  if (R.sim) { R.sim.W.companion_rest = (R.sim.W.companion_rest || []).filter(r => r.user_id !== away); R.sim.W.companion_rest.push({ user_id: away, rx: 4000 + 820, ry: 4000 + 1320, moved_by: '00000064-0000-4000-8000-000000000100', updated_at: new Date(Date.now() + 60000).toISOString() }); }
  for (let i = 0; i < 240; i++) { if (!(await P.evaluate(() => LowiTable.state().play))) break; await H.sleep(500); }
  await H.sleep(21000); /* past the hold after the last shot */
  await P.evaluate(() => LowiTable.load(true)); await H.sleep(500);
  const note = await P.evaluate(() => { const t = document.querySelector('.rt-toast'); return { text: t && t.textContent, on: !!(t && t.classList.contains('on')), tween: LowiTable.state().tween, notes: LowiTable.stats().notes }; });
  await P.screenshot({ path: out + '/5-knocked-away.png' });
  for (let i = 0; i < 60; i++) { if (!(await P.evaluate(() => LowiTable.state().tween))) break; await H.sleep(500); }
  const meNow = await P.evaluate(() => { const st = LowiTable.state(); return st.balls.find(b => b.uid === st.me); });
  res.away = { note, me: meNow }; log('away', res.away);
  if (!note.notes || !/weggesto|knocked you away|te empuj/.test(note.text || '')) fail('no knocked-away note'); if (!meNow || Math.abs(meNow.x - 820) > 60 || Math.abs(meNow.y - 1320) > 60) fail('own ball not at the knocked spot');
  /* 7. open/close the Room six times with a shot each: no errors, no crash */
  for (let k = 0; k < 6; k++) {
    await P.evaluate(() => goTab('home')); await H.sleep(700); await openRoom();
    await P.evaluate(k => { const st = LowiTable.state(); if (!st.play) LowiTable.fire(Math.cos(k * 1.3), Math.sin(k * 1.3), .7); }, k); await H.sleep(900);
  }
  await H.sleep(4000);
  const fin = await P.evaluate(() => ({ st: LowiTable.state().mounted, balls: document.querySelectorAll('.rt-ball').length, wraps: document.querySelectorAll('.rt-wrap').length }));
  res.reopen = { fin, crashed: R.crashed, loads: R.loads, errs: R.errs.slice(0, 5) };
  log('reopen', res.reopen);
  if (R.crashed) fail('renderer crashed'); if (R.errs.length) fail(R.errs.length + ' page errors'); if (fin.wraps !== 1) fail('tables mounted: ' + fin.wraps);
  await P.screenshot({ path: out + '/6-after-reopen.png' });
  await R.close();
  console.log(JSON.stringify(res, null, 1));
  process.exit(res.ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
