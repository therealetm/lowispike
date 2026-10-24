'use strict';
/* Bug hunt probe (Community, live site): dump the Ranking pane's visible text with structure, and every chat message
   whose bubble shows no text (what it holds instead). node tools/hunt-community-text-1902.cjs <device> [url|root] [lang] [engine] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en', engine = process.argv[5] || 'webkit';
  const o = { device, engine, members: 20, messages: 60, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = '/home/sprite/hunt-1902/text-' + device.replace(/\W/g, '') + '-' + lang;
  await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [lang]);
  await R.goto(); await H.sleep(5000);
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  await P.evaluate(() => goTab('foryou')); await H.sleep(900);
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]'); await H.sleep(1800);
  log('empty bubbles', await P.evaluate(() => [...document.querySelectorAll('#cmList .cm-msg')].filter(m => !(m.querySelector('.cm-t') || {}).textContent).map(m => ({ who: m.dataset.who, html: m.querySelector('.cm-bub') ? m.querySelector('.cm-bub').innerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').slice(0, 500) : m.innerHTML.slice(0, 300) }))));
  await R.tap('#cmPaneChat .rm-tab[data-rm="rank"]'); await H.sleep(1800);
  log('rank', await P.evaluate(() => { const pane = [...document.querySelectorAll('#cmPaneChat [data-rm-pane="rank"], #cmPaneChat .rk-pane, #cmPaneChat .cm-rank')].filter(e => e.getBoundingClientRect().height > 10)[0]; const root = pane || document.querySelector('#cmPaneChat'); return { sel: pane ? (pane.id || pane.className) : 'pane?', html: root.innerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/\s+/g, ' ').slice(0, 3000) }; }));
  await R.shot(tag + '-rank.png');
  log('errs', R.errs);
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
