'use strict';
/* Oct 26, 2026 (MAYA-HANDOFF 0.34): measure the Supermarket Cart sheet (store-picks.js cartHTML) on iPad / iPhone.
   node tools/cart-ask/measure.cjs [url|root] [sizes] [langs]   ENG=chromium|webkit
   Fake data only: a made-up shopping list in localStorage, an offline fake Give a hand server. Nothing is sent. */
const H = require('../sim/harness.cjs');
process.env.SIM_WK_VIEWPORT = '1';
const SZ = { iphone: [390, 844], ipad: [820, 1180], ipadl: [1180, 820], se: [320, 568] };
(async () => {
  const where = process.argv[2] || '.', sizes = (process.argv[3] || 'ipad').split(','), langs = (process.argv[4] || 'de').split(','), engine = process.env.ENG || 'chromium';
  for (const sz of sizes) for (const lang of langs) {
    const [w, h] = SZ[sz];
    const o = { engine, members: 6, messages: 6, probe: false, lang, viewport: { width: w, height: h } };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    if (engine === 'chromium') await P.setViewportSize({ width: w, height: h });
    await R.ctx.addInitScript(a => { try { localStorage.setItem('lowispike.lang', a.l); localStorage.setItem('lowi.lang', a.l); localStorage.setItem('lowi.storePicks.tab', 'shop');
      localStorage.setItem('lowi.giftBasket.server.v1', JSON.stringify({ ok: true, at: Date.now() })); } catch (e) { } }, { l: lang });
    await R.goto(); await H.sleep(6000);
    await P.evaluate(() => { const S = window.LOWI_SHELF; S.addIngredients(['Lettuce', 'Lean beef mince', 'Smoked paprika', 'No-sugar salsa', 'Oregano', 'Tortilla wraps', 'Eggs', 'Greek yogurt'].map(n => ({ n }))); });
    await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1500);
    await R.tap('.stp-card .stp-cartbtn'); await H.sleep(1000);
    const m = await P.evaluate(() => { const q = document.querySelector('.stp-cartv .stp-cart-card'); if (!q) return null; const r = e => { const k = e.getBoundingClientRect(); return [Math.round(k.x), Math.round(k.y), Math.round(k.width), Math.round(k.height)]; };
      const cs = getComputedStyle(q), sc = q.querySelector('.stp-qv-scroll'), qv = document.querySelector('.stp-cartv');
      return { vw: innerWidth, vh: innerHeight, card: r(q), bg: cs.backgroundColor, bgi: cs.backgroundImage.slice(0, 80), bf: cs.backdropFilter || cs.webkitBackdropFilter, qvbg: getComputedStyle(qv).backgroundColor, qvbf: getComputedStyle(qv).backdropFilter || getComputedStyle(qv).webkitBackdropFilter,
        scroll: sc && [sc.scrollTop, sc.scrollHeight, sc.clientHeight], h3: r(q.querySelector('h3')),
        acts: [...q.querySelectorAll('.stp-cart-acts > *')].map(b => ({ t: b.textContent.trim(), r: r(b), svg: b.querySelector('svg') ? r(b.querySelector('svg')) : null, br: getComputedStyle(b).borderRadius })) }; });
    console.log(sz, lang, JSON.stringify(m, null, 0));
    await R.shot('/tmp/cart-ask-' + sz + '-' + lang + '-' + engine + '.png');
    await R.close();
  }
  process.exit(0);
})();
