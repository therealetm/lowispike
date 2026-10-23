'use strict';
/* Bug hunt (galaxy chat, live site): the message flow a real user does, with finger taps:
   write to everyone, type + send, open another person's message actions (tap bubble or ···), react via ＋ picker, reply
   (quote shows, reply lands with the quote), open own message actions, retap a reaction chip to undo it.
   Prints each step's result. node tools/hunt-chat-flow.cjs <device> [url|root] [lang] [theme] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en', theme = process.argv[5] || 'dark';
  const o = { device, engine: 'webkit', members: 20, messages: 60, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = '/tmp/hunt/flow-' + device.replace(/\W/g, '') + '-' + lang;
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  await R.goto(); await H.sleep(5000);
  await P.evaluate(() => goTab('foryou')); await H.sleep(900);
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]'); await H.sleep(1500);
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  const hit = (sel) => P.evaluate((sel) => { const e = [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; }).pop(); if (!e) return 'missing'; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return (t && (t === e || e.contains(t))) ? 'ok' : 'covered by ' + (t ? (t.id || String(t.className).slice(0, 40) || t.tagName) : '-') + ' at ' + Math.round(x) + ',' + Math.round(y); }, sel);
  const ftap = async (sel) => { const h = await hit(sel); if (h !== 'ok') return h; const loc = P.locator(sel).last(); await R.tapEl(loc); await H.sleep(900); return 'ok'; };
  /* 1. back to everyone */
  log('write-everyone', await P.locator('[data-chat="to-all"],[data-chat="everyone"]').count() ? await ftap('[data-chat="to-all"],[data-chat="everyone"]') : 'no button (already everyone?)');
  log('composer', await P.evaluate(() => ({ ph: (document.getElementById('cmInput') || {}).placeholder, to: (document.querySelector('.cm-to, .cs-to') || {}).textContent })));
  /* 2. type + send */
  const before = await P.evaluate(() => document.querySelectorAll('#cmList .cm-msg.mine').length);
  log('focus input', await ftap('#cmInput'));
  await P.keyboard.type('hunt hello ' + lang, { delay: 30 }); await H.sleep(300);
  log('input value', await P.evaluate(() => document.getElementById('cmInput').value));
  log('send', await ftap('#cmSend'));
  await H.sleep(1500);
  log('after send', await P.evaluate((b) => { const mine = [...document.querySelectorAll('#cmList .cm-msg.mine')]; const last = mine.pop(); return { mineBefore: b, mineNow: mine.length + (last ? 1 : 0), lastText: last ? last.textContent.replace(/\s+/g, ' ').slice(0, 80) : null, input: document.getElementById('cmInput').value, status: last ? (last.querySelector('.cs-delivery') || {}).textContent || 'sent' : null }; }, before));
  await R.shot(tag + '-1-sent.png');
  /* 3. other person's message: open actions */
  const other = await P.evaluate(() => { const m = [...document.querySelectorAll('#cmList .cm-msg:not(.mine)')].filter(e => { const r = e.getBoundingClientRect(); return r.top > 150 && r.bottom < innerHeight - 160; }).pop(); return m ? m.dataset.chatId : null; });
  log('other msg', other);
  if (other) {
    const moreSel = '#cm-' + other + ' .cp-more';
    const vis = await P.evaluate((s) => { const e = document.querySelector(s); if (!e) return 'no ··· button'; const st = getComputedStyle(e), r = e.getBoundingClientRect(); return 'opacity ' + st.opacity + ' size ' + Math.round(r.width) + 'x' + Math.round(r.height); }, moreSel);
    log('··· visibility', vis);
    log('tap bubble', await ftap('#cm-' + other + ' .cm-bub'));
    log('actions after bubble tap', await P.evaluate((id) => !!document.querySelector('#cm-' + id + ' .cp-acts'), other));
    if (!await P.evaluate((id) => !!document.querySelector('#cm-' + id + ' .cp-acts'), other)) log('tap ···', await ftap(moreSel));
    log('actions', await P.evaluate((id) => [...document.querySelectorAll('#cm-' + id + ' .cp-acts button')].map(b => (b.getAttribute('aria-label') || b.textContent).trim()), other));
    await R.shot(tag + '-2-actions.png');
    log('tap ＋', await ftap('#cm-' + other + ' [data-chat="pick"]'));
    log('picker', await P.evaluate((id) => [...document.querySelectorAll('#cm-' + id + ' .cm-picker button')].map(b => b.textContent.trim()), other));
    const pickHit = await hit('#cm-' + other + ' .cm-picker button');
    log('picker reachable', pickHit);
    await R.shot(tag + '-3-picker.png');
    if (pickHit === 'ok') {
      await R.tapEl(P.locator('#cm-' + other + ' .cm-picker button').first()); await H.sleep(1500);
      log('after react', await P.evaluate((id) => ({ chips: [...document.querySelectorAll('#cm-' + id + ' .cm-chip')].map(b => b.textContent.trim() + (b.classList.contains('on') ? '*' : '')), picker: !!document.querySelector('#cm-' + id + ' .cm-picker') }), other));
      const chip = '#cm-' + other + ' .cm-chip.on';
      if (await P.locator(chip).count()) { log('untap chip', await ftap(chip)); await H.sleep(1200); log('after unreact', await P.evaluate((id) => [...document.querySelectorAll('#cm-' + id + ' .cm-chip')].map(b => b.textContent.trim() + (b.classList.contains('on') ? '*' : '')), other)); }
    }
    /* 4. reply */
    if (!await P.evaluate((id) => !!document.querySelector('#cm-' + id + ' .cp-acts'), other)) await ftap('#cm-' + other + ' .cm-bub');
    if (!await P.evaluate((id) => !!document.querySelector('#cm-' + id + ' .cp-acts'), other)) await ftap(moreSel);
    log('tap reply', await ftap('#cm-' + other + ' [data-chat="reply"]'));
    log('reply bar', await P.evaluate(() => { const q = document.querySelector('.cm-replying, .cm-reply, #cmReply, .cs-reply'); return { bar: q ? q.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : null, focus: document.activeElement && document.activeElement.id }; }));
    await R.shot(tag + '-4-reply.png');
    if (await P.evaluate(() => document.activeElement && document.activeElement.id !== 'cmInput')) await ftap('#cmInput');
    await P.keyboard.type('hunt reply', { delay: 30 }); await ftap('#cmSend'); await H.sleep(1500);
    log('reply landed', await P.evaluate(() => { const last = [...document.querySelectorAll('#cmList .cm-msg.mine')].pop(); return last ? { text: last.textContent.replace(/\s+/g, ' ').slice(0, 120), quote: !!last.querySelector('.cm-quote') } : null; }));
  }
  /* 5. own message actions */
  const mineId = await P.evaluate(() => { const m = [...document.querySelectorAll('#cmList .cm-msg.mine')].pop(); return m ? m.dataset.chatId : null; });
  if (mineId) {
    await ftap('#cm-' + mineId + ' .cm-bub');
    if (!await P.evaluate((id) => !!document.querySelector('#cm-' + id + ' .cp-acts'), mineId)) await ftap('#cm-' + mineId + ' .cp-more');
    log('own actions', await P.evaluate((id) => [...document.querySelectorAll('#cm-' + id + ' .cp-acts button')].map(b => b.textContent.trim()), mineId));
    log('own actions reachable', await hit('#cm-' + mineId + ' .cp-acts button'));
    await R.shot(tag + '-5-own.png');
  }
  log('errs', R.errs); log('crashed', R.crashed); log('loads', R.loads);
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
