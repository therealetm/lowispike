'use strict';
/* weekly-ranking task: the Week board right after the Monday reset. Real people only carry last week's sunbeams, so the Week board
   is empty: it must say a new week started and offer the month; the button opens the month board with everyone on it.
   node probe-week-empty.cjs <url|dir> [view] [lang]   (mock cloud, no live writes) */
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'iphone13', lang = process.argv[4] || 'en';
  const WT = '/home/sprite/wt-weekly-ranking';
  const h = await L.open({ url, view, lang, preInit: "try{localStorage.setItem('lowi.tutorial.done','1');localStorage.setItem('lowispike.lang','" + lang + "')}catch(e){}",
    ctxHook: async ctx => require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 12, messages: 5, me: 'Fixture' }) });
  const P = h.page; let bad = 0;
  await P.waitForFunction(() => window.LowiRanking && window.LowiR3 && window.LowiRoomsUI, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(4000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot');
    const now = Date.now(), wk = new Date(now - 7 * 864e5);
    const K = window.LowiCareBoardCore || window.LowiCareBoard; const tag = (k, t) => K.tag(K.periodKey(k, t), 3);
    const ppl = ['Antje', 'Joseph', 'Christabel', 'Jasmine'].map((n, i) => ({ n, uid: 'u' + i, xpw: 30 + i, wk: tag('w', wk.getTime()), xpm: 120 + i * 10, mo: tag('m', now), xp: 800, lv: 4 }));
    const R = window.LowiR3; R.everyone = () => ppl; if (R.me) { const o = R.me; R.me = () => { const m = o() || {}; return Object.assign({}, m, { care: { w: { pts: 0, full: 0 }, m: { pts: 179, full: 12 } } }); }; } });
  await P.evaluate(l => { try { setLang(l); } catch (e) {} }, lang); await L.sleep(800);
  await P.evaluate(() => { try { LowiRanking.open(); } catch (e) {} });
  await L.sleep(3500);
  await P.evaluate(() => { try { LowiRanking.setPeriod('w'); } catch (e) {} });
  await L.sleep(800);
  const a = await P.evaluate(() => { const b = [...document.querySelectorAll('.rm-rank')].find(x => !x.hidden); const e = b && b.querySelector('.rk-empty'); const s = e && e.querySelector('.rk-seem');
    const r = s && s.getBoundingClientRect(); return { empty: e ? e.innerText.replace(/\s+/g, ' ').trim() : null, btn: s ? { t: s.textContent, w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top) } : null, rows: b ? b.querySelectorAll('[data-rk="cmp"], .rk-row').length : -1, per: LowiRanking.period() }; });
  console.log('week', JSON.stringify(a));
  if (!a.empty || !/0/.test(a.empty) || !a.btn || a.btn.h < 44) bad++;
  await P.screenshot({ path: '/tmp/wr/week-empty-' + view + '-' + lang + '.png' });
  const c = await L.center(h, '.rm-rank:not([hidden]) .rk-seem');
  if (c) { await L.tap(h, c.x, c.y); await L.sleep(1200); }
  const m = await P.evaluate(() => { const b = [...document.querySelectorAll('.rm-rank')].find(x => !x.hidden); if (!b) return { per: LowiRanking.period(), none: 1 }; return { per: LowiRanking.period(), sel: (b.querySelector('.rk-segb[aria-selected="true"]') || {}).textContent, focus: document.activeElement && document.activeElement.className, empty: !!b.querySelector('.rk-empty'), text: b.innerText.replace(/\s+/g, ' ').slice(0, 260) }; });
  console.log('month', JSON.stringify(m));
  if (m.per !== 'm' || m.empty || !/Christabel|Jasmine/.test(m.text)) bad++;
  await P.screenshot({ path: '/tmp/wr/week-month-' + view + '-' + lang + '.png' });
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
