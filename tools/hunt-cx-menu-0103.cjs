'use strict';
/* 29 Oct 01:03 hunt: Community Chat floating menu (.cx-menu, 28 Oct). Finger tap on someone's bubble -> menu? its buttons on
   screen and tappable? tap the first emoji -> chip; tap own bubble -> menu; back closes the menu and stays in Chat.
   node tools/hunt-cx-menu-0103.cjs <device> [lang] [url|root] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 15', lang = process.argv[3] || 'de', where = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { device, engine: 'webkit', members: 20, messages: 60, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content + ' ' + innerWidth + 'x' + innerHeight));
  await P.evaluate(() => goTab('foryou')); await H.sleep(1500); await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]'); await H.sleep(2500);
  const menu = () => P.evaluate(() => {
    const m = [...document.querySelectorAll('.cx-menu')].filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 4 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .05; })[0];
    if (!m) return null; const r = m.getBoundingClientRect();
    const btns = [...m.querySelectorAll('button,[role=button]')].map(b => { const q = b.getBoundingClientRect(); const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 16) + (q.top < 0 || q.bottom > innerHeight || q.left < 0 || q.right > innerWidth ? '(OFF)' : '') + (e === b || b.contains(e) ? '' : '(COVERED by ' + (e && (e.id || String(e.className).slice(0, 20))) + ')'); });
    return { box: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], vw: innerWidth, vh: innerHeight, btns };
  });
  const rows = await P.evaluate(() => [...document.querySelectorAll('#cmList [id^="cm-"]')].map(r => ({ id: r.id, mine: r.classList.contains('me') || r.classList.contains('mine') || !!r.querySelector('.me'), b: !!r.querySelector('.cm-bub'), y: Math.round(r.getBoundingClientRect().top) })).filter(r => r.b));
  log('rows', { n: rows.length, mine: rows.filter(r => r.mine).length, sample: rows.slice(-4) });
  const vh = await P.evaluate(() => innerHeight);
  const pick = (mine) => rows.filter(r => r.mine === mine && r.y > 120 && r.y < vh - 160).slice(-1)[0];
  for (const [k, mine] of [['other', false], ['own', true]]) {
    const r = pick(mine); if (!r) { log(k, 'no row on screen'); continue; }
    await R.tap('#' + r.id + ' .cm-bub').catch(e => log(k + ' tap fail', String(e).slice(0, 80))); await H.sleep(1500);
    const m = await menu(); log(k + ' menu', m);
    if (m && k === 'other') {
      const em = await P.locator('.cx-menu button').first(); await R.tapEl(em).catch(e => log('emoji tap fail', String(e).slice(0, 80))); await H.sleep(1500);
      log('after emoji', await P.evaluate(id => ({ menu: !!document.querySelector('.cx-menu') && getComputedStyle(document.querySelector('.cx-menu')).display !== 'none', chips: [...document.querySelectorAll('#' + id + ' [class*="rx"],#' + id + ' [class*="react"]')].map(c => c.textContent.trim().slice(0, 12)).slice(0, 5) }), r.id));
      await R.tap('#' + r.id + ' .cm-bub').catch(() => { }); await H.sleep(1200); log(k + ' menu again', !!(await menu()));
    }
    if (await menu()) { await P.evaluate(() => history.back()); await H.sleep(1500); log(k + ' after back', await P.evaluate(() => { let t = ''; try { t = LowiRoomsUI.tab(); } catch (e) { } const m = document.querySelector('.cx-menu'); return { tab: (document.querySelector('#main>.tab.active') || {}).id, rm: t, menu: !!m && getComputedStyle(m).display !== 'none' && +getComputedStyle(m).opacity > .05 }; })); }
  }
  log('errs', R.errs); log('crashed', R.crashed);
  await R.close();
})().catch(e => { console.log('BROKEN', e && e.stack || e); process.exit(1); });
