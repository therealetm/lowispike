'use strict';
/* 29 Oct 17:03 hunt: Settings (Community name) > Your details, tap the bottom X within ~0.4 s. Logs what the X stands in for
   over the first 900 ms, then taps at <wait> ms. node tools/hunt-yd-quickx-1703.cjs <device> [lang] [wait] [engine] [url] */
const H = require('/home/sprite/lowispike/tools/sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone SE', lang = process.argv[3] || 'de', wait = +(process.argv[4] || 400), engine = process.argv[5] || 'webkit';
  const where = process.argv[6] || 'https://therealetm.github.io/lowispike/index.html', oo = { device, engine, members: 20, messages: 60, probe: false, lang }; if (/^https?:/.test(where)) oo.url = where; else oo.root = where;
  const R = await H.open(oo), P = R.page;
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  console.log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content + ' ' + innerWidth + 'x' + innerHeight));
  await P.evaluate(() => goTab('foryou')); await H.sleep(1500);
  await R.tap('.rm-head .rm-name'); await H.sleep(1600);
  /* sample the X target in the page itself every animation frame-ish, starting at the tap on your row */
  await P.evaluate(() => { window.__bxLog = []; const t0 = performance.now(); window.__t0 = t0; const tick = () => { const t = window.LowiBottomClose && LowiBottomClose.target; const yd = document.getElementById('ydOv'); const bx = document.getElementById('lwBX'), br = bx && bx.getBoundingClientRect(); const pe = bx && bx.style.pointerEvents; let hit = null; if (br && br.width) { hit = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2); } window.__bxLog.push(Math.round(performance.now() - t0) + ':' + (t ? (t.id || String(t.className).slice(0, 12)) : '-') + (yd ? '/yd' + (+getComputedStyle(yd).opacity).toFixed(2) : '') + (bx && bx.classList.contains('bx-settle') ? '/SETTLE' : '') + (bx && bx.classList.contains('bx-aside') ? '/ASIDE' : '') + '/hit=' + (hit ? (hit.id || String(hit.className).slice(0, 14) || hit.tagName) : '-')); if (performance.now() - t0 < 900) setTimeout(tick, 40); }; document.addEventListener('click', e => { if (!(e.target.closest && e.target.closest('[data-cme="me"]'))) window.__bxLog.push('CLICK@' + Math.round(performance.now() - (window.__t0 || 0)) + '=' + (e.target.id || String(e.target.className).slice(0, 20) || e.target.tagName)); }, true); document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-cme="me"]')) setTimeout(tick, 0); }, true); });
  await R.tap('#cmeSheet [data-cme="me"]');
  await H.sleep(wait);
  const b = await P.evaluate(() => { const e = document.getElementById('lwBX'); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, cls: e.className, t: LowiBottomClose.target ? (LowiBottomClose.target.id || String(LowiBottomClose.target.className).slice(0, 30)) : null }; });
  console.log('tap at', wait, JSON.stringify(b));
  await P.touchscreen.tap(b.x, b.y); await H.sleep(1400);
  const st = await P.evaluate(() => ({ yd: !!document.getElementById('ydOv') && !document.getElementById('ydOv').classList.contains('yd-out'), settings: !!(window.LowiCommunityMe && LowiCommunityMe.isOpen()), tab: (document.querySelector('#main>.tab.active') || {}).id, log: (window.__bxLog || []).join(' ') }));
  console.log('after', JSON.stringify(st));
  console.log('RESULT', st.yd ? 'MISS (Your details still open)' : st.settings ? 'OK (back to Settings)' : 'OTHER', 'errs', JSON.stringify(R.errs));
  await R.close();
})().catch(e => { console.log('BROKEN', e && e.stack || e); process.exit(1); });
