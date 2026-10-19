'use strict';
/* Oct 19 billiard probe: shoot companions in Community (real joystick drags + the fire API), then check that the ones that got hit
   stay where they stopped (DOM position and table offset), that nothing keeps animating at rest, that the spots survive Home and back
   and a reload, and that no page errors happen. usage: node probe-billiard.cjs <url|dir> <view> */
const L = require('./lib.cjs');
(async () => {
  const target = process.argv[2], view = process.argv[3] || 'chromium390'; let srv = null, url = target;
  if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const fails = [], log = [];
  const h = await L.open({ view, url, settle: 7000 }); const P = h.page;
  const st = () => P.evaluate(() => {
    const gx = window.__lgGx, E = window.LowiEnergy; if (!gx || !gx.map) return { nomap: true };
    const els = [...document.querySelectorAll('#cgGalaxy .cg-body[data-uid]')].map(e => { const r = e.getBoundingClientRect(); return { uid: e.dataset.uid, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), me: e.classList.contains('me') }; });
    return { n: gx.map.spots.length, busy: E.busy(), state: E.state(), offs: Object.fromEntries(gx.map.spots.map(s => [s.uid, E.offset(s.uid)]).filter(([k, v]) => v && (Math.abs(v.x) > .5 || Math.abs(v.y) > .5)).map(([k, v]) => [k, [Math.round(v.x), Math.round(v.y)]])), els, land: Object.keys(localStorage).filter(k => k.startsWith('lowi.energy.land')).map(k => localStorage.getItem(k).length) };
  });
  const errs = async tag => { const s = await L.snap(h); const pe = h.log.pageerror.splice(0); if (s.err.length || s.rej.length || pe.length) fails.push({ tag, err: s.err, rej: s.rej, pe }); };
  const idle = async (ms = +(process.env.BILLIARD_IDLE || 15000)) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (!(await P.evaluate(() => window.LowiEnergy.busy()))) return Date.now() - t0; await L.sleep(200); } return -1; };
  await P.evaluate(() => window.goTab('foryou')); await L.sleep(3500);
  let s0 = await st(); log.push({ tag: 'galaxy', n: s0.n, bodies: s0.els.length }); if (s0.nomap || s0.n < 3) { fails.push({ tag: 'galaxy too empty to test', s0 }); }
  /* 1: real joystick drags (pull the knob in different directions) */
  const joy = await L.center(h, '#ceJoy'); log.push({ joy });
  if (joy) for (const [dx, dy] of [[0, -60], [50, -40], [-55, -30]]) {
    await P.mouse.move(joy.x, joy.y); await P.mouse.down(); for (let i = 1; i <= 8; i++) { await P.mouse.move(joy.x + dx * i / 8, joy.y + dy * i / 8); await L.sleep(16); } await P.mouse.up();
    const w = await idle(); log.push({ tag: 'drag ' + dx + ',' + dy, settledMs: w, stats: await P.evaluate(() => window.LowiEnergy.stats().sent) }); if (w < 0) fails.push({ tag: 'never settled after drag' });
  }
  /* 2: aimed shots at the nearest companions via the same fire path the joystick uses */
  for (let k = 0; k < 3; k++) {
    await P.evaluate(k => { const gx = window.__lgGx, E = window.LowiEnergy; const me = gx.map.spots.find(s => s.me) || { x: 0, y: 0 }; const mo = E.offset(me.uid) || { x: 0, y: 0 }; const mx = me.x + mo.x, my = me.y + mo.y;
      const o = gx.map.spots.filter(s => !s.me).map(s => { const f = E.offset(s.uid) || { x: 0, y: 0 }; return { x: s.x + f.x, y: s.y + f.y }; }).sort((a, b) => Math.hypot(a.x - mx, a.y - my) - Math.hypot(b.x - mx, b.y - my))[k];
      if (o) E.fire(Math.atan2(o.y - my, o.x - mx), .9); }, k);
    await L.sleep(900); const w = await idle(); log.push({ tag: 'aimed ' + k, settledMs: w });
  }
  await L.sleep(1200); const a = await st(); const moved = Object.keys(a.offs); log.push({ tag: 'after shots', busy: a.busy, mode: a.state && a.state.mode, moved: moved.length, offs: a.offs, land: a.land });
  if (!moved.length) fails.push({ tag: 'no companion was knocked at all' }); if (a.busy) fails.push({ tag: 'still busy at rest' });
  await errs('shots');
  /* 3: wait 10 s: nobody drifts back */
  await L.sleep(10000); const b = await st(); const pos = s => Object.fromEntries(s.els.map(e => [e.uid, [e.x, e.y]]));
  const pa = pos(a), pb = pos(b); const drift = moved.filter(u => pa[u] && pb[u] && Math.hypot(pa[u][0] - pb[u][0], pa[u][1] - pb[u][1]) > 1); const odr = moved.filter(u => JSON.stringify(a.offs[u]) !== JSON.stringify(b.offs[u]));
  log.push({ tag: '10s later', drift, odr, busy: b.busy }); if (drift.length || odr.length) fails.push({ tag: 'knocked companions moved while resting', drift, odr });
  /* frame counting: the energy loop is idle (no place() at 30 fps) */
  const fr = await P.evaluate(async () => { let n = 0; const gx = window.__lgGx; const orig = window.LowiCgMap && window.LowiCgMap.place; return { busy: window.LowiEnergy.busy(), balls: window.LowiEnergy.balls().length }; }); log.push({ tag: 'idle check', fr });
  /* 4: Home and back */
  await P.evaluate(() => window.goTab('home')); await L.sleep(2500); await P.evaluate(() => window.goTab('foryou')); await L.sleep(3500);
  const c = await st(); const lost = moved.filter(u => JSON.stringify(a.offs[u]) !== JSON.stringify(c.offs[u])); log.push({ tag: 'home and back', lost, offs: c.offs }); if (lost.length) fails.push({ tag: 'spots changed after Home and back', lost });
  await errs('home and back');
  /* 5: reload */
  await P.reload({ waitUntil: 'load' }); await L.sleep(7000); await P.evaluate(() => window.goTab('foryou')); await L.sleep(3500);
  const d = await st(); const lost2 = moved.filter(u => !d.offs[u] || Math.hypot(d.offs[u][0] - a.offs[u][0], d.offs[u][1] - a.offs[u][1]) > 1.5); log.push({ tag: 'after reload', lost2, offs: d.offs, n: d.n }); if (lost2.length) fails.push({ tag: 'spots lost after reload', lost2 });
  await P.screenshot({ path: '/tmp/billiard-' + view + '.png' });
  await errs('reload');
  console.log(JSON.stringify({ view, fails, log }, null, 1));
  await h.browser.close(); if (srv) srv.close(); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('PROBE ERROR', e); process.exit(2); });
