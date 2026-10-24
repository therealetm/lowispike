'use strict';
/* Bug hunt probe (galaxy chat, live site): open a message's actions by finger, tap ＋ (picker), then Reply; log the state
   after each step (actions, picker, #csReply bar, focus, draft) and whether the sent reply carries its quote.
   node tools/hunt-chat-reply-probe.cjs <device> [url|root] [lang] [theme] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone SE', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en', theme = process.argv[5] || 'dark';
  const o = { device, engine: 'webkit', members: 20, messages: 60, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = '/tmp/hunt0702/reply-' + device.replace(/\W/g, '') + '-' + lang;
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  await R.goto(); await H.sleep(5000);
  await P.evaluate(() => goTab('foryou')); await H.sleep(900);
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]'); await H.sleep(1800);
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  const state = (id) => P.evaluate((id) => ({ acts: [...document.querySelectorAll('#cm-' + id + ' .cp-acts button')].map(b => (b.getAttribute('aria-label') || b.textContent).trim()), picker: document.querySelectorAll('#cm-' + id + ' .cm-picker button').length, bar: ((document.getElementById('csReply') || {}).textContent || '').replace(/\s+/g, ' ').trim(), focus: document.activeElement && (document.activeElement.id || document.activeElement.className), anyActs: [...document.querySelectorAll('.cp-acts')].map(e => e.closest('.cm-msg') && e.closest('.cm-msg').dataset.chatId) }), id);
  const other = await P.evaluate(() => { const m = [...document.querySelectorAll('#cmList .cm-msg:not(.mine)')].filter(e => { const r = e.getBoundingClientRect(); return r.top > 150 && r.bottom < innerHeight - 160; }).pop(); return m ? m.dataset.chatId : null; });
  log('other', other);
  const tapIn = async (sel) => { const loc = P.locator(sel).last(); if (!await loc.count()) return 'missing'; await loc.scrollIntoViewIfNeeded().catch(() => { }); await R.tapEl(loc); await H.sleep(1100); return 'ok'; };
  log('tap bubble', await tapIn('#cm-' + other + ' .cm-bub')); log('state', await state(other)); await R.shot(tag + '-1.png');
  log('tap +', await tapIn('#cm-' + other + ' [data-chat="pick"]')); log('state', await state(other)); await R.shot(tag + '-2.png');
  log('tap bubble again', (await state(other)).acts.length ? 'skip' : await tapIn('#cm-' + other + ' .cm-bub'));
  log('tap reply', await tapIn('#cm-' + other + ' [data-chat="reply"]')); log('state', await state(other)); await R.shot(tag + '-3.png');
  await P.keyboard.type('probe reply', { delay: 30 }); await H.sleep(300);
  await tapIn('#cmSend'); await H.sleep(1500);
  log('landed', await P.evaluate(() => { const last = [...document.querySelectorAll('#cmList .cm-msg.mine')].pop(); return last ? { text: last.textContent.replace(/\s+/g, ' ').slice(0, 120), quote: !!last.querySelector('.cm-quote') } : null; }));
  log('errs', R.errs); log('crashed', R.crashed);
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
