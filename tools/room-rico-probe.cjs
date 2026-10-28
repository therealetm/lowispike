/* Oct 28 2026: ricochet blasts and the middle in a real browser (tools/sim harness: fake Supabase, 16 members).
   node tools/room-rico-probe.cjs [chromium|webkit] [outDir]
   Checks: the middle ring line and the new hint show without overlapping each other or the Freundesbaum button; your ball against
   the cushion, a shot into the cushion bounces back and knocks you away (and the row is written); a shot aimed off a cushion hits
   the ball the guide named; your ball in the middle holds it (gold), one full SERVER hour pays +10 XP once, 2.5 more hours pay two,
   a later look pays nothing again, a phone clock pushed 10 hours ahead pays nothing, another ball taking the centre ends the hold;
   a v:2 shot from an older build still replays; nothing throws. */
const H = require('./sim/harness.cjs');
const fs = require('fs');
const C = require('../room-table-core.js');
const engine = process.argv[2] || 'chromium', out = process.argv[3] || '/tmp/room-rico-probe', root = process.argv[4] || require('path').join(__dirname, '..');
fs.mkdirSync(out, { recursive: true });
const res = { engine, ok: true, fails: [] };
const fail = m => { res.ok = false; res.fails.push(m); console.log('FAIL ' + m); };
const log = (k, v) => { console.log(k + ' ' + JSON.stringify(v)); };
(async () => {
  const o = { engine, members: 16, messages: 30, probe: false, lang: 'de', root };
  if (engine === 'webkit') o.device = 'iPhone 13'; else o.viewport = { width: 390, height: 844 };
  const R = await H.open(o), P = R.page, sim = R.sim;
  await R.goto(); await H.sleep(8000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  await P.evaluate(() => goTab('foryou')); await H.sleep(1500); await P.evaluate(() => { try { LowiRoomsUI.setTab(false); } catch (e) { } }); await H.sleep(3000);
  const me = await P.evaluate(() => LowiTable.state().me); log('me', me);
  const rows = () => sim.W.companion_rest || (sim.W.companion_rest = []);
  const setRow = (uid, x, y) => { const r = rows(); const i = r.findIndex(q => q.user_id === uid); const e = C.enc(x, y); const row = { user_id: uid, rx: e.rx, ry: e.ry, moved_by: uid, updated_at: new Date().toISOString() }; if (i >= 0) r[i] = row; else r.push(row); };
  /* rows of balls a shot just moved are not taken for 20 s (room-table.js hold), so wait that out after a shot */
  let lastShotAt = 0;
  const reload = async () => { const w = lastShotAt + 21000 - Date.now(); if (w > 0) await H.sleep(w); await P.evaluate(() => LowiTable.load(true)); await H.sleep(2500); };
  /* park everybody away from the middle and from the left cushion */
  const st0 = await P.evaluate(() => LowiTable.state());
  const others = st0.balls.map(b => b.uid).filter(u => u !== me);
  others.forEach((u, i) => setRow(u, 620 + (i % 3) * 120, 120 + Math.floor(i / 3) * 140));
  /* 1. look: hint + middle line */
  setRow(me, 200, 1000); await reload();
  const look = await P.evaluate(() => { const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
    const hint = document.querySelector('.rt-hint'), mid = document.querySelector('.rt-mid'), tree = document.querySelector('.nm-ctree'), felt = document.querySelector('.rt-felt');
    const cv = document.querySelector('.rt-fx'), T = LowiTable.core.T, k = cv.getBoundingClientRect().width / T.W, dp = cv.width / cv.getBoundingClientRect().width;
    const px = cv.getContext('2d').getImageData(Math.round((T.MID_X + T.MID_R) * k * dp), Math.round(T.MID_Y * k * dp), 1, 1).data;
    const pc = cv.getContext('2d').getImageData(Math.round(T.MID_X * k * dp), Math.round((T.MID_Y - T.MID_R * .5) * k * dp), 1, 1).data;
    return { ring: [...px], inside: [...pc], hint: hint && hint.textContent, mid: mid && mid.textContent, hr: r(hint), mr: r(mid), tr: r(tree), fr: r(felt), vw: innerWidth }; });
  log('look', look);
  const ov = (a, b) => a && b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  if (!(look.ring[3] > 0) || !(look.inside[3] > 0)) fail('no middle ring drawn on the felt');
  if (!/Bande|cushion|banda/.test(look.hint || '')) fail('hint does not mention the cushion bounce');
  if (!/1 (h|Std) =/.test(look.mid || '')) fail('middle line: ' + look.mid);
  if (ov(look.hr, look.mr)) fail('middle line overlaps the hint'); if (ov(look.mr, look.tr)) fail('middle line overlaps the Freundesbaum button'); if (ov(look.hr, look.tr)) fail('hint overlaps the Freundesbaum button');
  if (look.mr && (look.mr.l < look.fr.l || look.mr.r > look.fr.r || look.mr.b > look.fr.b)) fail('middle line not on the felt');
  await P.screenshot({ path: out + '/0-look.png' });
  /* 2. against the left cushion, shoot into it: it bounces back into you and knocks you away */
  setRow(me, 50, 900); await reload();
  const w0 = rows().length;
  await H.sleep(2500);
  const self = await P.evaluate(async () => { const a = LowiTable.state().balls.find(b => b.uid === LowiTable.state().me); LowiTable.fire(-1, 0, .5); const s = LowiTable.stats().lastShot; let far = 0;
    for (let i = 0; i < 200 && LowiTable.state().play; i++) { await new Promise(r => setTimeout(r, 30)); const q = LowiTable.state().balls.find(q => q.uid === LowiTable.state().me); far = Math.max(far, q.x - a.x); }
    const b = LowiTable.state().balls.find(q => q.uid === LowiTable.state().me); return { s, from: a, to: b, far }; });
  lastShotAt = Date.now(); log('self', self);
  if (!self.s || !self.s.self || self.s.hit !== me) fail('shot into the cushion next to me did not bounce back into me');
  if (Math.abs(self.from.x - 50) > 2) fail('my ball was not at the cushion: ' + self.from.x); if (!(self.far > 150)) fail('I was not knocked away from the wall: ' + JSON.stringify(self));
  await H.sleep(1200);
  const myRow = rows().find(r => r.user_id === me); log('myRow', myRow);
  if (!myRow || Math.abs(C.dec(myRow.rx, myRow.ry).x - self.to.x) > 2) fail('my new spot was not written');
  /* 3. bank shot: aim at the target's mirror image across the right cushion */
  const tg = others[0]; setRow(me, 700, 1000); setRow(tg, 300, 400); others.slice(1).forEach((u, i) => setRow(u, 120 + (i % 3) * 90, 1150 - Math.floor(i / 3) * 0 - (i % 2) * 0)); await reload();
  const bank = await P.evaluate(async (tg) => { const st = LowiTable.state(), m = st.balls.find(b => b.uid === st.me), t = st.balls.find(b => b.uid === tg), C = LowiTable.core, T = C.T, wx = T.W - T.BR;
    const mx = 2 * wx - t.x, my = t.y, L = Math.hypot(mx - m.x, my - m.y), dx = (mx - m.x) / L, dy = (my - m.y) / L;
    const g = C.guidePath(st.balls.map(b => ({ ...b, r: T.R })), m.uid, m.x + dx * (T.R + T.BR + 1), m.y + dy * (T.R + T.BR + 1), dx, dy, 2);
    LowiTable.fire(dx, dy, .6); const s = LowiTable.stats().lastShot; for (let i = 0; i < 80 && LowiTable.state().play; i++) await new Promise(r => setTimeout(r, 100)); return { s, guide: g.uid, cush: g.cushions }; }, tg);
  lastShotAt = Date.now(); log('bank', bank);
  if (bank.s.hit !== tg || bank.guide !== tg || bank.s.cushions !== 1) fail('bank shot: ' + JSON.stringify(bank));
  /* the guide on screen: pull back so the line goes into the cushion (screenshot) */
  setRow(me, 150, 900); await reload();
  const sc = await P.evaluate(() => LowiTable.screen(LowiTable.state().me));
  await P.mouse.move(sc.x, sc.y); await P.mouse.down(); for (let i = 1; i <= 8; i++) { await P.mouse.move(sc.x + 12 * i, sc.y + 6 * i); await H.sleep(16); }
  await P.screenshot({ path: out + '/1-guide-bounce.png' }); await P.mouse.move(sc.x, sc.y); await H.sleep(50); await P.mouse.up(); lastShotAt = Date.now(); await H.sleep(300);
  await P.evaluate(async () => { for (let i = 0; i < 80 && LowiTable.state().play; i++) await new Promise(r => setTimeout(r, 100)); });
  /* 4. the middle */
  others.forEach((u, i) => setRow(u, 620 + (i % 3) * 120, 120 + Math.floor(i / 3) * 140)); setRow(me, 500, 625); sim.clockShift = 0; await reload();
  const xp0 = await P.evaluate(() => JSON.parse(localStorage.getItem('lowi') || localStorage.getItem('lowispike') || '{}').xp);
  const m1 = await P.evaluate(async () => { await LowiTable.midCheck(true); return { mid: LowiTable.mid(), text: document.querySelector('.rt-mid').textContent, gold: !!document.querySelector('.rt-ball.me.mid'), stats: LowiTable.stats().mid, clock: LowiTable.stats().clock }; });
  log('mid-start', m1);
  if (m1.mid.holder !== me) fail('I am in the centre but not the holder'); if (!m1.gold) fail('no gold ring on the holder'); if (!/Deine Mitte|Your middle|Tu centro/.test(m1.text)) fail('middle line: ' + m1.text);
  if (!m1.clock) fail('no server clock'); if (!m1.mid.saved.st) fail('no hold started');
  await P.screenshot({ path: out + '/2-middle-held.png' });
  const award = async () => P.evaluate(async () => { const n0 = (LowiTable.mid().saved.n | 0); await LowiTable.midCheck(true); const m = LowiTable.mid(); return { n: m.saved.n | 0, paidNow: (m.saved.n | 0) - n0, st: m.saved.st, text: document.querySelector('.rt-mid').textContent, got: (LowiTable.stats().mid || {}).got }; });
  sim.clockShift = 59 * 60000; let a = await award(); log('59min', a); if (a.paidNow) fail('paid before a full hour');
  sim.clockShift = 61 * 60000; a = await award(); log('61min', a); if (a.paidNow !== 1 || a.got !== 10) fail('first full hour not paid +10 once');
  const toast = await P.evaluate(() => [...document.querySelectorAll('.toast,#toast,[class*=toast]')].map(e => e.textContent).filter(t => /Mitte|middle|centro/.test(t)).slice(0, 2)); log('toast', toast);
  a = await award(); log('again', a); if (a.paidNow) fail('paid the same hour twice');
  /* phone clock pushed 10 h ahead: nothing (the server's clock counts) */
  a = await P.evaluate(async () => { const real = Date.now; const n0 = LowiTable.mid().saved.n | 0; Date.now = () => real() + 36000000; try { await LowiTable.midCheck(true); } finally { Date.now = real; } return { paidNow: (LowiTable.mid().saved.n | 0) - n0 }; });
  log('phone-clock', a); if (a.paidNow) fail('a phone clock change paid hours');
  /* app away 2.5 h, ball untouched: hours 2 and 3 */
  sim.clockShift = 3.6 * 3600000; a = await award(); log('3.6h', a); if (a.got !== 20) fail('2.5 more hours did not pay 2 x 10'); /* (this look can fall on the next server day: the daily count starts over) */
  /* someone takes the centre */
  const rival = others[1]; setRow(me, 560, 625); setRow(rival, 455, 625); await reload();
  a = await P.evaluate(async () => { await LowiTable.midCheck(true); return { holder: LowiTable.mid().holder, st: LowiTable.mid().saved.st, text: document.querySelector('.rt-mid').textContent, gold: !!document.querySelector('.rt-ball.mid:not(.me)') }; });
  log('rival', a); if (a.holder !== rival || a.st) fail('the hold did not end when someone else took the centre'); if (!/^(Mitte|Middle|Centro): /.test(a.text)) fail('rival line: ' + a.text); if (!a.gold) fail('rival has no gold ring');
  await P.screenshot({ path: out + '/3-rival.png' });
  sim.clockShift = 6 * 3600000; a = await award(); if (a.paidNow) fail('paid while not holding');
  const xp1 = await P.evaluate(() => JSON.parse(localStorage.getItem('lowi') || localStorage.getItem('lowispike') || '{}').xp); log('xp', { xp0, xp1 });
  /* 5. a v:2 shot from an older build still replays */
  const v2 = await P.evaluate(() => { const st = LowiTable.state(), b = st.balls; const s = b.map(q => [q.uid, q.x, q.y]); const by = b.find(q => q.uid !== st.me).uid; const r0 = LowiTable.stats().remote;
    LowiTable.remote({ v: 2, k: 'bt', id: 'old' + Date.now(), by, n: 'x', t: Date.now(), dx: 0, dy: 1, p: .5, s, f: [] }); return { r0, r1: LowiTable.stats().remote }; });
  log('v2', v2); if (!(v2.r1 > v2.r0)) fail('v:2 shot was not replayed');
  await H.sleep(4000);
  res.errs = R.errs; if (R.errs.length) fail('errors: ' + JSON.stringify(R.errs.slice(0, 3)));
  fs.writeFileSync(out + '/result.json', JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ ok: res.ok, fails: res.fails }, null, 1));
  await R.close(); process.exit(res.ok ? 0 : 1);
})().catch(e => { console.log('CRASH ' + (e && e.stack || e)); process.exit(2); });
