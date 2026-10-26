'use strict';
/* Oct 26, 2026 (MAYA-HANDOFF 0.34): the Supermarket cart sheet + "Someone else pays" (the whole cart becomes a Give a hand basket).
   node tools/cart-ask/check.cjs [url|root] [sizes] [langs]     ENG=chromium|webkit (default chromium)
   sizes: iphone (390x844), se (320x568), ipadP (820x1180), ipadL (1180x820); langs: en,de,es
   Fake data only: a made-up cart in localStorage and an offline fake Give a hand server (LowiGiftBasket._api): nothing is sent,
   no basket, payment or post is created anywhere.
   Checks: the sheet covers the Shop card (nothing of the page shows around it), the page behind is blurred, every action
   button is inside the sheet, compact (<= 64 px tall), one 18 px icon each, no word cut off, the list starts at the top;
   cart names in the app language; a real finger tap on Someone else pays opens Give a hand with the WHOLE cart (quantities),
   the left-out line names only the really spiky / unknown foods (never oregano or no-sugar salsa); a quick double tap on
   Share shares once; then the swipe feed shows. Zero page errors. */
const H = require('../sim/harness.cjs');
process.env.SIM_WK_VIEWPORT = '1';
const SZ = { iphone: [390, 844], se: [320, 568], ipadP: [820, 1180], ipadL: [1180, 820] };
const LET = { en: 'Lettuce', de: 'Kopfsalat', es: 'Lechuga' }, WRAP = { en: 'Tortilla wraps', de: 'Tortilla-Wraps', es: 'Tortillas de trigo' };
const ORE = { en: 'Oregano', de: 'Oregano', es: 'Orégano' }, SAL = { en: 'No-sugar salsa', de: 'Salsa ohne Zucker', es: 'Salsa sin azúcar' };
(async () => {
  const where = process.argv[2] || '.', sizes = (process.argv[3] || 'iphone,ipadP,ipadL').split(','), langs = (process.argv[4] || 'en,de,es').split(','), engine = process.env.ENG || 'chromium';
  let pass = 0, fail = 0; const bad = [];
  for (const sz of sizes) for (const lang of langs) {
    const [w, h] = SZ[sz], tag = sz + '-' + lang + '-' + engine;
    const o = { engine, members: 6, messages: 6, probe: false, lang, viewport: { width: w, height: h } };
    if (/^ipad/.test(sz)) { o.device = 'iPad Pro 11'; o.dpr = engine === 'webkit' ? 1 : 2; }
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page, errs = [];
    P.on('pageerror', e => errs.push(String(e && e.message || e)));
    const ok = (name, c, info) => { if (c) pass++; else { fail++; bad.push(tag + ' ' + name); } console.log((c ? 'PASS ' : 'FAIL ') + tag + ' ' + name + (c || info === undefined ? '' : ' ' + JSON.stringify(info).slice(0, 900))); };
    try {
      if (engine === 'chromium') await P.setViewportSize({ width: w, height: h });
      await R.ctx.addInitScript(a => { try { if (sessionStorage.getItem('ca-seeded')) return; sessionStorage.setItem('ca-seeded', '1');
        localStorage.setItem('lowispike.lang', a.l); localStorage.setItem('lowi.lang', a.l); localStorage.setItem('lowi.storePicks.tab', 'shop');
        localStorage.setItem('lowi.giftBasket.server.v1', JSON.stringify({ ok: true, at: Date.now() })); } catch (e) { } }, { l: lang });
      await R.ctx.addInitScript(() => { window.__shares = []; const t = setInterval(() => { if (window.LowiGiftBasket) { clearInterval(t);
        window.LowiGiftBasket._api = { uid: () => 'me', ready: async () => true, open: async () => [], mine: async () => [], given: async () => [], trust: async () => [],
          share: async (row, id) => { window.__shares.push({ row, id }); return Object.assign({ id: 'fake-' + window.__shares.length, user_id: 'me', status: 'open', created_at: new Date().toISOString() }, row); } }; } }, 50); });
      await R.goto(); await H.sleep(6000);
      await P.evaluate(() => { const S = window.LOWI_SHELF; S.addIngredients(['Lettuce', 'Lean beef mince', 'Smoked paprika', 'No-sugar salsa', 'Oregano', 'Tortilla wraps', 'Eggs', 'Greek yogurt', 'Spinach', 'Feta'].map(n => ({ n })));
        const eg = S.cartLines().find(l => l.n === 'Eggs'); if (eg && S.setQty) S.setQty(eg.id, 2); });
      await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1500);
      await R.tap('.stp-card .stp-cartbtn'); await H.sleep(1200);
      const m = await P.evaluate(() => {
        const q = document.querySelector('.stp-cartv .stp-cart-card'), sc = q && q.querySelector('.stp-cart-scroll'), st = document.querySelector('.stp-card'), qv = document.querySelector('.stp-cartv');
        if (!q) return null; const r = e => e.getBoundingClientRect(), c = r(q), s = r(st);
        const btns = [...q.querySelectorAll('.stp-cart-acts button')].map(b => { const k = r(b), sv = b.querySelector('svg'), sp = b.querySelector('span'), v = sv ? r(sv) : null;
          return { t: b.textContent.trim(), h: Math.round(k.height), inside: k.left >= c.left - 1 && k.right <= c.right + 1 && k.top >= c.top - 1 && k.bottom <= c.bottom + 1, svg: v ? [Math.round(v.width), Math.round(v.height)] : null,
            cut: sp ? (sp.scrollWidth > sp.clientWidth + 1 || r(sp).right > k.right + 1 || r(sp).bottom > k.bottom + 1) : false }; });
        const li = sc.querySelector('.stp-cart-list li'), lr = li ? r(li) : null, sr = r(sc);
        return { covers: c.left <= s.left + 1 && c.right >= s.right - 1 && c.top <= Math.max(s.top, 0) + 1 && c.bottom >= Math.min(s.bottom, innerHeight) - 1, card: [c.left, c.top, c.width, c.height].map(Math.round), shop: [s.left, s.top, s.width, s.height].map(Math.round),
          inView: c.top >= 0 && c.bottom <= innerHeight + 1 && c.left >= 0 && c.right <= innerWidth + 1, blur: (getComputedStyle(qv).backdropFilter || getComputedStyle(qv).webkitBackdropFilter || '').indexOf('blur') >= 0,
          bgA: (getComputedStyle(q).backgroundColor.match(/[\d.]+/g) || []).map(Number), btns, firstTop: lr ? Math.round(lr.top - sr.top) : null, scroll: sc.scrollTop,
          names: [...sc.querySelectorAll('.stp-cart-txt b')].map(b => b.textContent), hOver: q.scrollWidth > q.clientWidth + 1, pageOver: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      ok('1 the cart sheet covers the whole Shop card (nothing of the page shows around it)', m && m.covers && m.inView, m && { card: m.card, shop: m.shop });
      ok('2 the page behind is blurred and the sheet is solid', m && m.blur && (m.bgA.length === 3 || m.bgA[3] >= .95), m && m.bgA);
      ok('3 three compact action buttons inside the sheet, one 18 px icon each, no word cut off', m && m.btns.length === 3 && m.btns.every(b => b.inside && b.h >= 44 && b.h <= 64 && b.svg && b.svg[0] === 18 && b.svg[1] === 18 && !b.cut), m && m.btns);
      ok('4 the list starts at the top, nothing sideways', m && m.firstTop !== null && m.firstTop >= 0 && m.scroll === 0 && !m.hOver && !m.pageOver, m && { firstTop: m.firstTop, scroll: m.scroll });
      ok('5 cart names in the app language', m && m.names.includes(LET[lang]) && m.names.includes(WRAP[lang]), m && m.names);
      const gb = await P.evaluate(() => { const b = [...document.querySelectorAll('.stp-cart-acts button')].find(x => x.dataset.stp === 'giftcart'); return !!b; });
      await R.tap('.stp-cart-acts [data-stp="giftcart"]'); await H.sleep(1800);
      const g = await P.evaluate(() => { const st = LowiGiftBasket._state(), card = document.querySelector('.gb-fromcart');
        return { open: !!document.querySelector('.gb-ov, .gb-panel, [class*="gb-"][role="dialog"]'), tab: st.tab, pick: st.fromCartPick, cartOpen: !!document.querySelector('.stp-cartv'), card: !!card,
          items: card ? [...card.querySelectorAll('.gb-items li')].map(x => x.textContent.trim()) : [], left: (document.querySelector('.gb-fromcart .gb-left') || {}).textContent || '',
          share: (document.querySelector('.gb-cartshare') || {}).disabled }; });
      ok('6 Someone else pays opens Give a hand with the WHOLE cart as the basket, no picking', gb && g.card && g.tab === 'mine' && !g.cartOpen && g.items.length === 9 && g.items.includes(LET[lang]) && g.items.includes(ORE[lang]) && g.items.includes(SAL[lang]) && g.items.some(x => /\u00d72$/.test(x)), g);
      ok('7 one short left-out line: only the spiky wraps, never oregano or salsa', g.left.indexOf(WRAP[lang]) >= 0 && g.left.indexOf(ORE[lang]) < 0 && g.left.indexOf(SAL[lang]) < 0, g.left);
      await P.fill('#gb-total', '24'); await P.fill('#gb-link', 'https://ko-fi.com/fakeperson'); await H.sleep(500);
      const bx = await P.locator('.gb-cartshare').boundingBox();
      await P.evaluate(() => { const b = document.querySelector('.gb-cartshare'); b.scrollIntoView({ block: 'center' }); }); await H.sleep(300);
      const bb = await P.locator('.gb-cartshare').boundingBox(), x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
      if (engine === 'webkit') { await P.touchscreen.tap(x, y); await H.sleep(90); await P.touchscreen.tap(x, y); } else { await P.mouse.click(x, y); await H.sleep(90); await P.mouse.click(x, y); }
      await H.sleep(2000);
      const s = await P.evaluate(() => ({ n: window.__shares.length, row: window.__shares[0] && window.__shares[0].row, tab: LowiGiftBasket._state().tab, msg: LowiGiftBasket._state().msg, pick: LowiGiftBasket._state().fromCartPick }));
      ok('8 a quick double tap on Share shares once, with quantities', s.n === 1 && s.row && s.row.items.length === 9 && s.row.items.some(i => i.q === 2) && s.row.total_eur === 24, { n: s.n, items: s.row && s.row.items, bx: !!bx });
      ok('9 then straight to the Give a hand swipe feed, with a plain line', s.tab === 'give' && !s.pick && !!s.msg, { tab: s.tab, msg: s.msg });
      ok('10 zero page errors', errs.length === 0, errs);
      await R.shot('/home/sprite/tmp-ca/shot-' + tag + '.png').catch(() => {});
    } catch (e) { ok('run', false, String(e && e.stack || e).slice(0, 600)); }
    await R.close();
  }
  console.log('TOTAL pass ' + pass + ' fail ' + fail + (bad.length ? ' :: ' + bad.join(' | ') : ''));
  process.exit(fail ? 1 : 0);
})();
