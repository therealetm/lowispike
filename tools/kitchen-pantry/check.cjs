'use strict';
/* Oct 26 2026: the Kitchen pantry game in Cook (kitchen-game.js), with real finger taps, against a local root or the live site.
   SIM_REDUCED_MOTION=1 SIM_WK_VIEWPORT=1 SIM_WK_NOSHOT=1 node tools/kitchen-pantry/check.cjs [url|root] [lang en|de|es] [outdir]
   WebKit iPhone 13 (390x844) by default (ENG=chromium for Chrome). Checks: the What's New tour plays new-kitchen on Cook > Kitchen
   with its Kitchen button lit and then new-give-hand on Shop; Kitchen sits after Shuffle and Swipe; typing adds to the right shelf;
   a door opens its shelf; Ran out: bin it puts it on the shopping list (sticky note count); Bought puts it back on its shelf; the
   kitchen survives a reload; no sideways overflow; Shop has no Kitchen tab; no page errors. With a URL it also types a real product
   ("skyr") and waits for product database hits. Prints PASS/FAIL lines and ALL OK / FAIL. */
const H = require('../sim/harness.cjs');
const fs = require('fs');
(async () => {
  const where = process.argv[2] || '.', lang = process.argv[3] || 'en', out = process.argv[4] || '/tmp/kitchen-pantry-check';
  fs.mkdirSync(out, { recursive: true });
  const o = { engine: process.env.ENG || 'webkit', members: 6, messages: 6, probe: false, lang, viewport: { width: 390, height: 844 } }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const live = !!o.url;
  const R = await H.open(o), P = R.page, tag = lang + '-' + o.engine;
  await R.ctx.addInitScript(a => { try { if (!sessionStorage.getItem('kpc')) { sessionStorage.setItem('kpc', '1'); localStorage.setItem('lowispike.lang', a.l); localStorage.setItem('lowi.lang', a.l); localStorage.removeItem('lowispike.kitchen.v1'); } } catch (e) { } }, { l: lang }).catch(() => {});
  const errs = []; P.on('pageerror', e => errs.push(String(e && e.message || e)));
  const res = []; const ok = (name, pass, info) => { res.push(!!pass); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); };
  const sleep = H.sleep;
  await R.goto(); await sleep(6000);
  const env = await P.evaluate(() => ({ build: (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || '', rm: matchMedia('(prefers-reduced-motion: reduce)').matches, w: innerWidth, h: innerHeight, kg: !!window.LowiKitchenGame }));
  console.log('env', JSON.stringify(env));
  ok('game loaded', env.kg);

  /* 1. What's New tour: intro, then new-kitchen on Cook > Kitchen, then new-give-hand on Shop */
  await P.evaluate(() => window.LowiTutorial && LowiTutorial.news({ id: 'kpc', tour: ['new-kitchen', 'new-give-hand'] }));
  await sleep(1500);
  let guard = 0;
  while (guard++ < 4 && await P.evaluate(() => window.LowiTutorial && LowiTutorial.step()) !== 'new-kitchen') { await R.tap('[data-lt="next"]').catch(() => {}); await sleep(1800); }
  await sleep(1500);
  const tk = await P.evaluate(() => { const b = document.querySelector('#ckBar [data-ck="view"][data-v="kitchen"]'), k = document.getElementById('kgRoot'), r = b && b.getBoundingClientRect(); return { step: LowiTutorial.step(), title: (document.querySelector('.lt-title') || {}).textContent || '', text: (document.querySelector('.lt-text') || {}).textContent || '', on: b ? (b.classList.contains('on') || b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true') : null, btnVis: r ? r.width > 0 && r.top >= 0 && r.bottom <= innerHeight : false, kgVis: !!(k && k.offsetHeight > 50) }; });
  ok('tour: new-kitchen opens Cook > Kitchen with its button showing', tk.step === 'new-kitchen' && tk.kgVis && tk.btnVis, tk);
  await R.shot(out + '/tour-kitchen-' + tag + '.png');
  await R.tap('[data-lt="next"]').catch(() => {}); await sleep(2500);
  const tg = await P.evaluate(() => ({ step: LowiTutorial.step(), shop: !!document.querySelector('.stp-card'), text: (document.querySelector('.lt-text') || {}).textContent || '', kitTab: !!document.querySelector('.stp-tab[data-stp-tab="kitchen"]'), tabs: [...document.querySelectorAll('.stp-tab')].map(t => t.getAttribute('data-stp-tab')) }));
  ok('tour: new-give-hand opens Shop, which has no Kitchen tab', tg.step === 'new-give-hand' && tg.shop && !tg.kitTab, tg);
  await R.shot(out + '/tour-give-hand-' + tag + '.png');
  await R.tap('[data-lt="next"]').catch(() => {}); await sleep(1200);
  await P.evaluate(() => { if (window.LowiTutorial && LowiTutorial.isOn()) LowiTutorial.stop('check'); if (window.LowiStorePicks && LowiStorePicks.close) LowiStorePicks.close(); });
  await sleep(800);

  /* 2. Cook: Shuffle, Swipe, Kitchen */
  await P.evaluate(() => LowiKitchenGame.open()); await sleep(1500);
  const segs = await P.evaluate(() => [...document.querySelectorAll('#ckBar [data-ck="view"]')].map(b => b.getAttribute('data-v')));
  ok('Cook: Kitchen comes after Shuffle and Swipe', segs.join() === 'shuffle,swipe,kitchen', segs);
  const st = () => P.evaluate(() => { const r = document.getElementById('kgRoot'); const n = document.querySelector('[data-kg-door="buy"] span'); const doors = {}; document.querySelectorAll('.kg-door').forEach(d => { doors[d.getAttribute('data-kg-door')] = (d.querySelector('.kg-dl small') || {}).textContent; }); return { doors, buy: n ? n.textContent : null, open: !!document.querySelector('.kg-open'), saved: JSON.parse(localStorage.getItem('lowispike.kitchen.v1') || '{"items":[]}').items.map(i => i.n + '@' + (i.c || '')), hOver: r ? r.scrollWidth > r.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1 : null, toast: (document.querySelector('.kg-toast') || {}).textContent || '' }; });

  /* 3. type an item (the typed row works without the internet) */
  const word = { en: 'Greek yogurt', de: 'Fruchtjoghurt', es: 'yogur griego' }[lang];
  await R.tap('#kgQ'); await P.keyboard.type(word); await sleep(900);
  await R.tap('[data-kg-hit="typed"]'); await sleep(1200);
  let s = await st();
  ok('typed item lands on the yogurt and dairy shelf', s.doors.dairy === '1' && s.saved.length === 1, s);
  await R.shot(out + '/kitchen-' + tag + '.png');

  /* 4. the yogurt door opens its shelf */
  await R.tap('[data-kg-door="dairy"]'); await sleep(900);
  s = await st();
  ok('the yogurt door opens its shelf', s.open, s);
  await R.shot(out + '/shelf-' + tag + '.png');
  const buy0 = await P.evaluate(() => (window.LOWI_SHELF ? LOWI_SHELF.listOpen(true).filter(i => !i.done).length : -1));

  /* 5. ran out: bin it -> shopping list */
  await R.tap('.kg-card [data-kg-sel]'); await sleep(600);
  await R.tap('[data-kg-bin]'); await sleep(1200);
  const buy1 = await P.evaluate(() => (window.LOWI_SHELF ? LOWI_SHELF.listOpen(true).filter(i => !i.done).length : -1));
  s = await st();
  ok('Ran out: bin it puts it on the shopping list', s.saved.length === 0 && buy1 === buy0 + 1, { s, buy0, buy1 });

  /* 6. the sticky note -> Bought -> back on its shelf */
  if (s.open) { await R.tap('.kg-open [data-kg="close"]'); await sleep(900); }
  await R.tap('[data-kg-door="buy"]'); await sleep(900);
  await R.tap('[data-kg-got]'); await sleep(1200);
  if (await P.evaluate(() => !!document.querySelector('.kg-open'))) { await R.tap('.kg-open [data-kg="close"]'); await sleep(900); }
  s = await st();
  ok('Bought puts it back in the kitchen on its shelf', s.saved.length === 1 && s.doors.dairy === '1', s);
  ok('no sideways overflow', s.hOver === false, s.hOver);

  /* 7. reload: still there */
  await R.goto(); await sleep(6000);
  await P.evaluate(() => LowiKitchenGame.open()); await sleep(1500);
  s = await st();
  ok('the kitchen is still there after a reload', s.saved.length === 1 && s.doors.dairy === '1', s);

  /* 8. live only: real product search */
  if (live) {
    await R.tap('#kgQ'); await P.keyboard.type('skyr');
    let hits = 0; for (let t = 0; t < 30 && !hits; t++) { await sleep(1000); hits = await P.evaluate(() => document.querySelectorAll('.kg-hit:not(.kg-hit-plain)').length); }
    const first = await P.evaluate(() => { const h = document.querySelector('.kg-hit:not(.kg-hit-plain)'); return h ? { name: (h.querySelector('b') || {}).textContent, sub: (h.querySelector('small') || {}).textContent, img: !!h.querySelector('img') } : null; });
    ok('product search finds real products for "skyr"', hits > 0, { hits, first });
    await R.shot(out + '/search-' + tag + '.png');
    if (hits) { await R.tap('.kg-hit:not(.kg-hit-plain)'); await sleep(1200); s = await st(); ok('a product from the search lands on a shelf with its data', s.saved.length === 2, s); }
  }

  ok('no page errors', !errs.length, errs.slice(0, 5));
  console.log(res.every(Boolean) ? 'ALL OK' : 'FAIL');
  await R.close().catch(() => {});
  process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
