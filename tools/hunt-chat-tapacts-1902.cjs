'use strict';
/* Bug hunt probe (galaxy chat, live site): does a finger tap on someone's bubble open its actions (＋ / Reply / Report)?
   mode fresh | typed (composer focused with a draft) | sent (right after sending). One fresh page per run.
   node tools/hunt-chat-tapacts-1902.cjs <device> [url|root] [lang] [mode] [engine] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en', mode = process.argv[5] || 'fresh', engine = process.argv[6] || 'webkit';
  const o = { device, engine, members: 20, messages: 60, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [lang]);
  await R.goto(); await H.sleep(5000);
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content));
  await P.evaluate(() => goTab('foryou')); await H.sleep(900);
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]'); await H.sleep(1800);
  const state = () => P.evaluate(() => ({ open: [...document.querySelectorAll('#cmList .cp-msg.cp-open')].map(e => e.dataset.chatId), acts: [...document.querySelectorAll('#cmList .cp-acts button')].map(b => b.textContent.trim()), sheets: [...document.querySelectorAll('.r2-ov.on, .cp-sheet, [role=dialog]')].filter(e => e.getBoundingClientRect().height > 10).map(e => e.id || e.className.slice(0, 40)), focus: document.activeElement && (document.activeElement.id || document.activeElement.tagName), draft: (document.getElementById('cmInput') || {}).value }));
  if (mode !== 'fresh') { await R.tap('#cmInput'); await H.sleep(500); await P.keyboard.type('half typed', { delay: 30 }); await H.sleep(300); }
  if (mode === 'sent') { await R.tap('#cmSend'); await H.sleep(2000); }
  log('before', await state());
  const pt = await P.evaluate(() => { const m = [...document.querySelectorAll('#cmList .cm-msg:not(.mine)')].filter(e => { const r = e.getBoundingClientRect(); return r.top > 150 && r.bottom < innerHeight - 220 && e.querySelector('.cm-t'); }).pop(); if (!m) return null; const t = m.querySelector('.cm-t'), r = t.getBoundingClientRect(); const x = r.left + Math.min(16, r.width / 2), y = r.top + r.height / 2, h = document.elementFromPoint(x, y); return { id: m.dataset.chatId, x, y, hit: h ? h.tagName + '.' + h.className : null }; });
  log('target', pt);
  await P.touchscreen.tap(pt.x, pt.y); await H.sleep(1200);
  log('after tap 1', await state());
  const s1 = await state();
  if (!s1.open.includes(pt.id)) { const h2 = await P.evaluate((id) => { const t = document.querySelector('#cm-' + id + ' .cm-t'); const r = t.getBoundingClientRect(); return { x: r.left + Math.min(16, r.width / 2), y: r.top + r.height / 2 }; }, pt.id); await P.touchscreen.tap(h2.x, h2.y); await H.sleep(1200); log('after tap 2', await state()); }
  log('errs', R.errs); log('crashed', R.crashed); log('loads', R.loads);
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
