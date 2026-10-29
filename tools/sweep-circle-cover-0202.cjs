'use strict';
/* 29 Oct 02:02 sweep: Circle > Swipen / Mischen main controls clear the bottom back button (#lwBX). node tools/sweep-circle-cover-0202.cjs <device> <lang> <url|root> */
const H = require('./sim/harness.cjs');
(async () => {
  const [dev, lang, where] = process.argv.slice(2);
  const o = { device: dev, engine: 'webkit', members: 12, messages: 20, probe: true, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.goto(); await H.sleep(5000);
  await P.evaluate(() => goTab('foryou')); await H.sleep(1500); await R.tap('#cmPaneChat .rm-tab[data-rm="room"]').catch(() => { }); await H.sleep(1500);
  for (const g of ['swipen', 'mischen', 'swipen']) {
    await R.tap('#cspBar [data-csp="' + g + '"]'); await H.sleep(3800);
    const m = await P.evaluate(sel => { const bx = document.getElementById('lwBX').getBoundingClientRect(); const sb = document.getElementById('shBody');
      return { bxTop: Math.round(bx.top), scroll: [sb.scrollTop, sb.scrollHeight, sb.clientHeight], ctrls: [...document.querySelectorAll('#tab-shelf ' + sel)].map(b => { const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 14) + ' ' + Math.round(r.top) + '-' + Math.round(r.bottom) + ' ' + (e && (e === b || b.contains(e)) ? 'ok' : 'COVERED ' + (e && (e.id || e.className))); }) }; }, g === 'mischen' ? '#r5Go' : '.r3k-b');
    console.log(g, JSON.stringify(m));
    if (g === 'swipen') { const box = await P.locator('#tab-shelf .r3k-b').nth(2).boundingBox(); await P.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await H.sleep(1200); console.log('after undo tap: tab', await P.evaluate(() => (document.querySelector('#main>.tab.active') || {}).id + ' ' + LowiCircleGames.current())); }
    await R.tap('#cspBar [data-csp="billard"]').catch(() => { }); await H.sleep(1500);
  }
  console.log('errs', JSON.stringify(R.errs), 'crashed', R.crashed);
  await R.close();
})().catch(e => { console.log('BROKEN', e); process.exit(1); });
