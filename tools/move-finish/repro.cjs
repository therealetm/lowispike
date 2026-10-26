'use strict';
/* Move session reward (MAYA-HANDOFF 0.37): finish every Move session type and read what was saved, paid and shown.
   node tools/move-finish/repro.cjs [root] [url] [views]   views: chromium390,iphone13,ipadL,ipadP (+'rm' = Reduce Motion)
   1) Mirror mode without camera, chair routine, run to its end (4 real minutes)   2) Move player quick start (Desk Spike Breaker), 10 min moved, ended
   3) Kreuzheben (hinge) without camera to its end   4) a 2-min Move player session (under 3 min: saved, no reward, no celebration)
   The page's rAF can be slow in this VM's headless WebKit, so time is fast-forwarded through the test hooks, never the real clock. */
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
const ROOT = process.argv[2] || '/home/sprite/wt-move-reward', URL0 = process.argv[3] || '';
const views = (process.argv[4] || 'chromium390').split(',');
const read = P => P.evaluate(() => { let m = {}; try { m = JSON.parse(localStorage.getItem('lowispike.move.v1') || '{}'); } catch (e) {} let s = {}; try { s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); } catch (e) {}
  const cel = document.querySelector('.mf-celebrate');
  return { sessions: (m.sessions || []).map(x => x.fmt + ':' + x.moved + 's:' + x.xp + 'xp'), xp: s.xp, ledger: (s.ledger || []).filter(e => /^move/.test(e.src || '')).map(e => e.src + ' +' + e.amt),
    celebrate: cel ? { text: cel.innerText.replace(/\s+/g, ' ').slice(0, 220), misty: /misty/i.test(cel.innerText), rm: cel.classList.contains('mf-rm') } : null,
    week: (document.querySelector('#mv-screen') || {}).innerText ? document.querySelector('#mv-screen').innerText.replace(/\s+/g, ' ').match(/(Verlauf|History|Historial).{0,90}/) : null }; });
async function tapSel(h, sel) { const p = await L.center(h, sel); if (!p) return false; await L.tap(h, p.x, p.y); await L.sleep(600); return true; }
async function waitFor(P, fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await P.evaluate(fn).catch(() => false)) return true; await L.sleep(250); } return false; }
async function dismiss(h, R, tag) { const P = h.page; if (!(await P.$('.mf-celebrate'))) return; await L.sleep(600); const p = await L.center(h, '.mf-go'); if (p) await L.tap(h, p.x, p.y); R.steps.push(tag + ' dismissed:' + await waitFor(P, () => !document.querySelector('.mf-celebrate'), 3000)); }
(async () => {
  let base = URL0; if (!base) { const s = await L.serve(ROOT); base = 'http://127.0.0.1:' + s.address().port + '/'; }
  const out = {};
  for (const v of views) {
    const rm = v.endsWith('rm'), view = rm ? v.slice(0, -2) : v, lang = /ipadL/.test(v) ? 'de' : /ipadP/.test(v) ? 'es' : /de$/.test(view) ? 'de' : 'en';
    const h = await L.open({ view: view.replace(/de$/, ''), url: base, lang, reducedMotion: rm, settle: 3000 }), P = h.page, R = out[v] = { steps: [] };
    try {
      await P.evaluate(() => goTab('move')); await L.sleep(1200);
      R.before = await read(P);
      /* 1) Mirror mode */
      for (const sel of ['.mm-hero-go', '[data-mm="pick"][data-r="chair"]', '[data-mm="nocam"]']) if (!(await tapSel(h, sel))) { R.steps.push('missing ' + sel); break; }
      await waitFor(P, () => window.LowiMirror && LowiMirror._state().phase === 'follow', 12000);
      await P.evaluate(() => { LowiMirror._addActive(236); const f = LowiMirror._state().flow; f.t = f.P.total - 0.05; });
      R.steps.push('mirror done:' + await waitFor(P, () => !!document.querySelector('.mf-celebrate') || !!document.querySelector('.mm-sheet:not([hidden])'), 30000));
      R.mirror = await read(P); await P.screenshot({ path: '/home/sprite/mf-probe/' + v + '-1-mirror.png' });
      await dismiss(h, R, 'mirror'); await tapSel(h, '.mm-sheet [data-mm="close"]'); await L.sleep(500);
      R.afterMirror = await read(P);
      /* 2) Move player: Desk Spike Breaker quick start, 10 minutes moved, End -> save */
      await P.evaluate(() => MOVE.start('desk', 10)); await L.sleep(800); await tapSel(h, '[data-mv="safety-ok"]');
      await waitFor(P, () => !!(MOVE._t && MOVE._t.player()), 5000);
      await P.evaluate(() => { const p = MOVE._t.player(); p.moved = 600; p.elapsed = Math.max(p.elapsed || 0, 600); });
      await tapSel(h, '[data-mv="end-ask"]'); await tapSel(h, '[data-mv="end-save"]'); await L.sleep(1500);
      R.player = await read(P); await P.screenshot({ path: '/home/sprite/mf-probe/' + v + '-2-player.png' });
      await L.sleep(1800); await P.screenshot({ path: '/home/sprite/mf-probe/' + v + '-2b-player.png' });
      await dismiss(h, R, 'player'); await tapSel(h, '[data-mv="done"]'); await L.sleep(600);
      R.afterPlayer = await read(P);
      /* 3) Kreuzheben without camera */
      if (!process.env.SKIPHINGE) {
      await tapSel(h, '.mm-hero-go'); R.steps.push('hinge pick:' + await tapSel(h, '[data-mm="pick"][data-r="hinge"]'));
      if (!(await tapSel(h, '[data-mm="nocam"]'))) R.steps.push('hinge free:' + await tapSel(h, '[data-mm="free"]'));
      const inH = await waitFor(P, () => window.LowiMirror && LowiMirror._state().phase === 'follow', 12000); R.steps.push('hinge follow:' + inH);
      await P.evaluate(() => { LowiMirror._addActive(300); const f = LowiMirror._state().flow; f.go('done', performance.now()); });
      R.steps.push('hinge done:' + await waitFor(P, () => !!document.querySelector('.mf-celebrate'), 30000));
      R.hinge = await read(P); await P.screenshot({ path: '/home/sprite/mf-probe/' + v + '-3-hinge.png' });
      await dismiss(h, R, 'hinge'); await tapSel(h, '.mm-sheet [data-mm="close"]'); await L.sleep(500);
      }
      /* 4) short session: saved, no reward, no celebration */
      await P.evaluate(() => MOVE.start('desk', 5)); await L.sleep(800); await tapSel(h, '[data-mv="safety-ok"]');
      R.steps.push('short player:' + await waitFor(P, () => !!(MOVE._t && MOVE._t.player()), 5000) + ' mm:' + await P.evaluate(() => { const o = document.querySelector('.mm-ov'); return !!o && !o.hidden; }));
      await L.sleep(1500); await P.evaluate(() => { const p = MOVE._t.player(); if (p) { p.moved = 120; p.elapsed = Math.max(p.elapsed, 120); } });
      R.steps.push('short end:' + await tapSel(h, '[data-mv="end-ask"]') + (await L.sleep(400), '') + ' conf2:' + await P.evaluate(() => document.querySelector('#mv-confirm').className) + '/' + await tapSel(h, '[data-mv="end-save"]') + ' top:' + await P.evaluate(() => { const e = document.querySelector('[data-mv="end-ask"]'); if (!e) return 'none'; const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return t ? (t.closest('[data-mv]') || {}).outerHTML.slice(0, 80) + ' conf:' + document.querySelector('#mv-confirm').className + ' P:' + JSON.stringify({c: MOVE._t.player() && MOVE._t.player().confirm, d: MOVE._t.player() && MOVE._t.player().done}) + ' pl:' + document.querySelector('#mv-player').className : 'null'; })); await L.sleep(1200);
      R.short = await read(P); await tapSel(h, '[data-mv="done"]'); await L.sleep(500);
      R.final = await read(P); await P.screenshot({ path: '/home/sprite/mf-probe/' + v + '-4-screen.png' });
    } catch (e) { R.steps.push('THROW ' + String(e.message).slice(0, 300)); }
    const s = await L.snap(h); R.err = s.err.concat(s.rej, h.log.pageerror);
    await h.browser.close();
  }
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
