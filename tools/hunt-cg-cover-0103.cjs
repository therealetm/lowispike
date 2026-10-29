'use strict';
/* 29 Oct 01:03 hunt: does the floating bottom back button (#lwBX) cover Mischen's / Swipen's own buttons inside Circle?
   node tools/hunt-cg-cover-0103.cjs <device> [lang] [url|root] [WxH] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone SE', lang = process.argv[3] || 'de', where = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html', vp = process.argv[5];
  const o = { device, engine: 'webkit', members: 12, messages: 20, probe: true, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  if (vp) { const [w, h] = vp.split('x').map(Number); o.viewport = { width: w, height: h }; process.env.SIM_WK_VIEWPORT = '1'; }
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content + ' ' + innerWidth + 'x' + innerHeight));
  const cover = () => P.evaluate(() => {
    const sh = document.getElementById('tab-shelf'); const act = sh && sh.classList.contains('active');
    const bx = document.getElementById('lwBX'); const br = bx && bx.getBoundingClientRect(); const bs = bx && getComputedStyle(bx);
    const out = [];
    (act ? sh : document).querySelectorAll('#r5Go, #r5Stage, .cs-btn, .r3k-b, .ck-b, .g2h-tile, .r3k-card, [class*="r3k-c"]').forEach(b => {
      const r = b.getBoundingClientRect(), s = getComputedStyle(b); if (r.width < 4 || s.visibility === 'hidden' || s.display === 'none' || b.closest('[hidden]')) return;
      if (r.bottom < 0 || r.top > innerHeight) return;
      const pts = [[r.left + r.width / 2, r.top + r.height / 2]];
      const hits = pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return !e ? 'none' : (e === b || b.contains(e)) ? 'ok' : (e.id || String(e.className).slice(0, 24) || e.tagName) + (e.closest('#lwBX') ? '[lwBX]' : ''); });
      out.push((b.id || String(b.className).split(' ')[0]) + ' "' + (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 18) + '" ' + Math.round(r.top) + '-' + Math.round(r.bottom) + ' ' + hits.join(','));
    });
    const sb = document.getElementById('shBody');
    return { shelfActive: act, shelf: act ? [Math.round(sh.getBoundingClientRect().top), Math.round(sh.getBoundingClientRect().bottom)] : null, bx: br && br.width ? [Math.round(br.left), Math.round(br.top), Math.round(br.width), Math.round(br.height), bs.opacity, bs.pointerEvents, bx.className] : null, scroll: sb ? [sb.scrollTop, sb.scrollHeight, sb.clientHeight] : null, out };
  });
  /* 1: Kochen opened the normal way (Home > Kochen) for comparison */
  if (process.env.NORMAL !== '0') {
  await P.evaluate(() => goTab('shelf')); await H.sleep(2500);
  try { await P.evaluate(() => { if (window.LowiFood && LowiFood.setView) LowiFood.setView('shuffle'); }); } catch (e) { } await H.sleep(1200);
  log('kochen normal shuffle', await cover());
  await P.evaluate(() => goTab('home')); await H.sleep(1500); }
  /* 2: inside Circle */
  await P.evaluate(() => goTab('foryou')); await H.sleep(1500); await R.tap('#cmPaneChat .rm-tab[data-rm="room"]').catch(() => { }); await H.sleep(1500);
  for (const id of (process.env.GAMES || 'mischen,swipen').split(',')) {
    await R.tap('#cspBar [data-csp="' + id + '"]'); await H.sleep(2500);
    const c = await cover(); log('circle ' + id, c);
    await R.shot('/tmp/hunt0103/cover-' + device.replace(/\W/g, '') + (vp || '') + '-' + id + '.png');
    /* a real finger tap on the main button */
    const main = id === 'mischen' ? '#r5Go' : '.r3k-b';
    const box = await P.locator('#tab-shelf ' + main).first().boundingBox().catch(() => null);
    if (process.env.NOTAP !== '1' && box && box.y + box.height / 2 < (vp ? +vp.split('x')[1] : 9999)) {
      await P.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await H.sleep(1800);
      log('after finger tap on ' + main, await P.evaluate(() => ({ tab: (document.querySelector('#main>.tab.active') || {}).id, cur: LowiCircleGames.current(), r5: (document.getElementById('r5Stage') || {}).textContent && document.getElementById('r5Stage').textContent.trim().slice(0, 60) })));
    } else log('main button box', box);
    await R.tap('#cspBar [data-csp="billard"]').catch(() => { }); await H.sleep(1500);
  }
  log('errs', R.errs); log('crashed', R.crashed);
  await R.close();
})().catch(e => { console.log('BROKEN', e && e.stack || e); process.exit(1); });
