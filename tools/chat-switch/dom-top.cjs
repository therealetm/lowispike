#!/usr/bin/env node
/* Dev helper (24 Oct 2026, chat redesign): opens Community > chat room in the simulated app (mock cloud, Chromium) and lists
   what is visible in the top and bottom 140 px, so the room's header can be described without looking at a screenshot.
   node tools/chat-switch/dom-top.cjs [url] [device] */
'use strict';
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const sleep = H.sleep;
(async () => {
  const R = await H.open({ engine: process.env.ENGINE || 'chromium', device: process.argv[3] || 'iPhone 13', probe: false, url: process.argv[2] || '' });
  const p = R.page;
  try {
    await R.goto(); await N.openCommunity(R); await sleep(6000);
    await p.locator('.rm-tab[data-rm="chat"]').click({ force: true }).catch(() => { }); await sleep(1200);
    if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) await p.evaluate(() => { const b = document.querySelector('[data-chat="open-thread"]'); if (b) b.click(); else if (window.LowiCommunity) LowiCommunity.thread(true); });
    await sleep(2000);
    const r = await p.evaluate(() => {
      const out = [], H = innerHeight;
      for (const el of document.querySelectorAll('body *')) {
        const b = el.getBoundingClientRect(); if (b.width < 8 || b.height < 8) continue;
        if (!(b.top < 140 || b.bottom > H - 140)) continue;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0 || cs.display === 'none') continue;
        const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue.trim()).join(' ').slice(0, 40);
        if (!(el.matches('button,a,input,textarea,[role=button],h1,h2,b,header,nav') || own)) continue;
        out.push((el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '')) + ' [' + [b.left, b.top, b.width, b.height].map(Math.round).join(',') + '] ' + (own || el.getAttribute('aria-label') || ''));
      }
      return { w: innerWidth, h: H, thread: !!document.querySelector('#cgThread[data-open]'), items: out.slice(0, 80) };
    });
    if (process.env.EVAL) r.eval = await p.evaluate(process.env.EVAL).catch(e => 'err ' + e.message);
    if (process.env.ONLY_EVAL) delete r.items;
    console.log(JSON.stringify(r, null, 1));
  } finally { await R.close(); }
})().catch(e => { console.error(e); process.exit(1); });
