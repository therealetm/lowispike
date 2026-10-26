'use strict';
/* Move grand finish proof (MAYA-HANDOFF 0.37), one fresh page per case so no case leans on the one before:
   node tools/move-finish/proof.cjs [root] [url] [views]   views like iphone13,iphone13rm,ipadPes,ipadLde,chromium390
   A) Kreuzheben without camera, run to its end with only ~130 s really moved (a rest skipped): saved, paid, celebrated
   B) Move player Desk Spike Breaker quick start, 10 min moved, End -> Save: saved, 200 XP, celebrated
   Checks: Verlauf/Diese Woche shows it, the ledger pays once, the celebration uses the companion's own name, no page errors.
   The page's rAF can be slow in this VM's headless WebKit, so session time is fast-forwarded through test hooks. */
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
const fs = require('fs');
const ROOT = process.argv[2] || '/home/sprite/wt-move-reward', URL0 = process.argv[3] || '';
const views = (process.argv[4] || 'iphone13').split(',');
const SHOTS = '/home/sprite/mf-probe'; fs.mkdirSync(SHOTS, { recursive: true });
const read = P => P.evaluate(() => { let m = {}; try { m = JSON.parse(localStorage.getItem('lowispike.move.v1') || '{}'); } catch (e) {} let s = {}; try { s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); } catch (e) {}
  const cel = document.querySelector('.mf-celebrate');
  return { sessions: (m.sessions || []).map(x => x.fmt + ':' + x.moved + 's:' + x.xp + 'xp'), ledger: (s.ledger || []).filter(e => /^move/.test(e.src || '')).map(e => e.src + ' +' + e.amt),
    celebrate: cel ? { text: cel.innerText.replace(/\s+/g, ' ').slice(0, 200), rm: cel.classList.contains('mf-rm'), w: Math.round(cel.getBoundingClientRect().width), h: Math.round(cel.getBoundingClientRect().height) } : null }; });
const screenText = P => P.evaluate(() => { const e = document.querySelector('#mv-screen'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
async function tapSel(h, sel) { await h.page.evaluate(s => { const e = document.querySelector(s); if (e && e.scrollIntoView) e.scrollIntoView({ block: 'center' }); }, sel); await L.sleep(250); const p = await L.center(h, sel); if (!p) return false; await L.tap(h, p.x, p.y); await L.sleep(600); return true; }
async function waitFor(P, fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await P.evaluate(fn).catch(() => false)) return true; await L.sleep(250); } return false; }
async function page(v, base) {
  const rm = v.endsWith('rm'), m = v.replace(/rm$/, '').match(/^(.*?)(en|de|es)?$/), view = m[1], lang = m[2] || 'en';
  const h = await L.open({ view, url: base, lang, reducedMotion: rm, settle: 3000 });
  const named = await h.page.evaluate(() => { try { const r = LowiBirthCompanion.rename('Zorbo'); return !!(r && r.ok !== false) && LowiBirthCompanion.displayName(); } catch (e) { return 'rename:' + e.message; } });
  await h.page.evaluate(() => goTab('move')); await L.sleep(1200);
  return { h, P: h.page, named, lang };
}
(async () => {
  let base = URL0; if (!base) { const s = await L.serve(ROOT); base = 'http://127.0.0.1:' + s.address().port + '/'; }
  const out = {}; let fails = 0;
  const check = (R, ok, what) => { R.checks.push((ok ? 'ok ' : 'FAIL ') + what); if (!ok) fails++; };
  for (const v of views) {
    const R = out[v] = { checks: [] };
    /* A) Kreuzheben */
    let { h, P, named } = await page(v, base); R.name = named;
    try {
      const beforeTxt = await screenText(P);
      check(R, await tapSel(h, '.mm-hero-go'), 'Mirror mode opens');
      check(R, await tapSel(h, '[data-mm="pick"][data-r="hinge"]'), 'Kreuzheben card');
      if (!(await tapSel(h, '[data-mm="nocam"]'))) await tapSel(h, '[data-mm="free"]');
      check(R, await waitFor(P, () => window.LowiMirror && LowiMirror._state().phase === 'follow', 15000), 'Kreuzheben running');
      await P.evaluate(() => { LowiMirror._addActive(130); const f = LowiMirror._state().flow; f.go('done', performance.now()); });
      check(R, await waitFor(P, () => !!document.querySelector('.mf-celebrate'), 30000), 'grand finish after Kreuzheben');
      await L.sleep(2600);
      const a = R.hinge = await read(P); await P.screenshot({ path: SHOTS + '/' + v + '-hinge.png' });
      check(R, a.sessions.length === 1 && /^hinge:1[23]\ds:160xp$/.test(a.sessions[0]), 'Kreuzheben saved with 160 XP: ' + a.sessions);
      check(R, a.ledger.length === 1, 'paid once: ' + a.ledger);
      check(R, a.celebrate && /Zorbo/.test(a.celebrate.text) && !/Misty/.test(a.celebrate.text) && /160/.test(a.celebrate.text), 'celebration with own name and 160 XP: ' + (a.celebrate && a.celebrate.text));
      check(R, a.celebrate && a.celebrate.rm === v.endsWith('rm'), 'Reduce Motion class matches');
      const vp = await P.evaluate(() => [innerWidth, innerHeight]);
      check(R, a.celebrate && a.celebrate.w >= vp[0] - 1 && a.celebrate.h >= vp[1] - 1, 'covers the screen ' + (a.celebrate && a.celebrate.w + 'x' + a.celebrate.h) + ' of ' + vp);
      const g = await L.center(h, '.mf-go'); if (g) await L.tap(h, g.x, g.y);
      check(R, await waitFor(P, () => !document.querySelector('.mf-celebrate'), 3000), 'Continue closes it');
      await tapSel(h, '.mm-sheet [data-mm="close"]'); await L.sleep(500); await tapSel(h, '[data-mm="close"]'); await L.sleep(500);
      await P.evaluate(() => { if (window.MOVE && MOVE.showTab) MOVE.showTab(); }).catch(() => {}); await L.sleep(800);
      const afterTxt = await screenText(P);
      R.screen = (afterTxt.match(/(Verlauf|History|Historial).{0,60}/) || [''])[0] + ' | ' + (afterTxt.match(/(Diese Woche|This week|Esta semana).{0,40}/) || [''])[0];
      check(R, afterTxt !== beforeTxt && /(1 (done|fertig|hecha|hecho|completad)|Kreuzheben|Deadlift|Peso muerto)/i.test(afterTxt), 'shows in the Move screen: ' + R.screen);
    } catch (e) { check(R, false, 'THROW A ' + String(e.message).slice(0, 200)); }
    let s = await L.snap(h); R.errA = s.err.concat(s.rej, h.log.pageerror); check(R, !R.errA.length, 'no page errors A'); await h.browser.close();
    /* B) Move player */
    ({ h, P } = await page(v, base));
    try {
      await P.evaluate(() => MOVE.start('desk', 10)); await L.sleep(800); await tapSel(h, '[data-mv="safety-ok"]');
      check(R, await waitFor(P, () => !!(MOVE._t && MOVE._t.player()), 8000), 'player running');
      await P.evaluate(() => { const p = MOVE._t.player(); p.moved = 600; p.elapsed = Math.max(p.elapsed || 0, 600); });
      await L.sleep(400); await tapSel(h, '[data-mv="end-ask"]'); await L.sleep(300);
      if (!(await tapSel(h, '[data-mv="end-save"]'))) { await tapSel(h, '[data-mv="end-ask"]'); await tapSel(h, '[data-mv="end-save"]'); }
      check(R, await waitFor(P, () => !!document.querySelector('.mf-celebrate'), 15000), 'grand finish after the player');
      await L.sleep(2600);
      const b = R.player = await read(P); await P.screenshot({ path: SHOTS + '/' + v + '-player.png' });
      check(R, b.sessions.length === 1 && /^desk:60\ds:200xp$/.test(b.sessions[0]), 'player saved with 200 XP: ' + b.sessions);
      check(R, b.celebrate && /200/.test(b.celebrate.text) && /Zorbo/.test(b.celebrate.text), 'celebration shows 200 XP: ' + (b.celebrate && b.celebrate.text));
    } catch (e) { check(R, false, 'THROW B ' + String(e.message).slice(0, 200)); }
    s = await L.snap(h); R.errB = s.err.concat(s.rej, h.log.pageerror); check(R, !R.errB.length, 'no page errors B'); await h.browser.close();
  }
  console.log(JSON.stringify(out, null, 1)); console.log(fails ? 'FAILS: ' + fails : 'ALL OK');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
