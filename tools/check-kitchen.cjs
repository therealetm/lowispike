'use strict';
/* Oct 24, 2026: the Kitchen tab inside Fuel > Shop (kitchen-core.js + store-picks.js), against a local root or the live site.
   node tools/check-kitchen.cjs <w> <h> [url|root] [outdir] [lang en|de|es] [day]
   Real finger taps: open Shop, Kitchen tab, add to the cart, + Shopping cart on a product, Bought -> At home, take out,
   Buy again, remove from the cart, close and reopen (saved), no sideways overflow, tabs not cut off, world behind the glass. */
const H = require('./sim/harness.cjs');
const fs = require('fs');
(async () => {
  const w = +process.argv[2] || 390, h = +process.argv[3] || 844, where = process.argv[4] || '.', out = process.argv[5] || '/tmp/check-kitchen', lang = process.argv[6] || 'en', day = process.argv[7] === 'day';
  fs.mkdirSync(out, { recursive: true });
  const o = { engine: process.env.ENG || 'chromium', members: 6, messages: 6, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = w + 'x' + h + '-' + lang + (day ? '-day' : '') + '-' + o.engine;
  await P.setViewportSize({ width: w, height: h });
  await R.ctx.addInitScript(a => { try { localStorage.setItem('lowispike.lang', a.l); localStorage.setItem('lowi.lang', a.l); localStorage.removeItem('lowi.storePicks.tab'); localStorage.removeItem('lowispike.kitchen.v1'); if (a.day) localStorage.setItem('lowi.theme', 'light'); } catch (e) { } }, { l: lang, day }).catch(() => {});
  const errs = []; P.on('pageerror', e => errs.push(String(e && e.message || e)));
  const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); };
  await R.goto(); await H.sleep(6000);
  /* only the first load starts empty: the init script would wipe the kitchen again on a reload */
  await R.ctx.addInitScript(() => { window.__kitKeep = 1; }).catch(() => {});
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || (window.LOWI_BUILD || ''));
  console.log('build', build);
  const box = sel => P.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: e.offsetHeight || Math.round(r.height), vis: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1 }; }, sel);
  const st = () => P.evaluate(() => { const c = document.querySelector('.stp-card'); return { tab: window.LowiStorePicks && LowiStorePicks.tab(), home: [...document.querySelectorAll('.stp-kit-home .stp-kit-t b')].map(b => b.textContent), cart: [...document.querySelectorAll('.stp-kit-cart .stp-kit-t b')].map(b => b.textContent), msg: (document.querySelector('.stp-kit-msg') || {}).textContent || '', gone: !!document.querySelector('.stp-kit-gone [data-stp-kit="again"]'), saved: JSON.parse(localStorage.getItem('lowispike.kitchen.v1') || '{"items":[]}').items.map(i => i.n), list: window.LOWI_SHELF ? LOWI_SHELF.listOpen(true).map(i => i.n + (i.done ? '*' : '')) : null, hOverflow: c ? c.scrollWidth > c.clientWidth + 1 : null }; });
  const type = async (form, text) => { await R.tap('[data-stp-kit-form="' + form + '"] input'); await P.keyboard.type(text); await H.sleep(150); await R.tap('[data-stp-kit-form="' + form + '"] button[type="submit"]'); await H.sleep(600); };

  /* 1. Shop opens the way the Fuel bubble opens it; three tabs fit */
  await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1500);
  const kt = await box('[data-stp-tab="kitchen"].stp-tab');
  const cut = await P.evaluate(() => [...document.querySelectorAll('.stp-tab b')].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent));
  const tabs = await P.evaluate(() => [...document.querySelectorAll('.stp-tab')].map(t => t.getAttribute('data-stp-tab')));
  ok('1 Shop shows three tabs (Supermarket, Seller Zone, Kitchen), Kitchen in view, 44px+, no label cut off', tabs.join() === 'shop,sz,kitchen' && kt && kt.vis && kt.h >= 44 && !cut.length, { tabs, kt, cut });
  await R.shot(out + '/0-shop-tabs-' + tag + '.png');
  /* 2. Kitchen tab */
  await R.tap('[data-stp-tab="kitchen"].stp-tab'); await H.sleep(800);
  let s = await st();
  const secs = await P.evaluate(() => ({ home: !!document.querySelector('.stp-kit-home'), cart: !!document.querySelector('.stp-kit-cart'), title: (document.querySelector('.stp-kit-head h3') || {}).textContent }));
  ok('2 Kitchen tab: At home + Shopping cart, empty to start, no sideways overflow', s.tab === 'kitchen' && secs.home && secs.cart && !s.home.length && !s.hOverflow, Object.assign({}, s, secs));
  await R.shot(out + '/1-kitchen-empty-' + tag + '.png');
  /* 3. add two things to the cart */
  await type('cart', 'Oat flakes'); await type('cart', 'Greek yogurt');
  s = await st();
  ok('3 typed into the cart: both show and are on the shopping list', s.cart.includes('Oat flakes') && s.cart.includes('Greek yogurt') && s.list && s.list.includes('Oat flakes') && s.list.includes('Greek yogurt'), s);
  /* 4. add something you already have at home */
  await type('home', 'Eggs');
  s = await st();
  ok('4 typed into At home: shows, saved under the account key', s.home.includes('Eggs') && s.saved.includes('Eggs'), s);
  await R.shot(out + '/2-kitchen-filled-' + tag + '.png');
  /* 4b. layout: in each row the name never runs under its buttons, buttons are big enough to tap, nothing leaves the card */
  const lay = await P.evaluate(() => {
    const bad = [], card = document.querySelector('.stp-card').getBoundingClientRect();
    const lum = c => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(',').map(Number).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * p[0] + .7152 * p[1] + .0722 * p[2]; };
    document.querySelectorAll('.stp-kit-row').forEach(r => { const t = r.querySelector('.stp-kit-t').getBoundingClientRect(); r.querySelectorAll('button').forEach(b => { const q = b.getBoundingClientRect(); if (q.left < t.right - 1) bad.push('overlap ' + r.textContent); if (q.height < 36 || q.width < 36) bad.push('small ' + b.textContent + ' ' + Math.round(q.width) + 'x' + Math.round(q.height)); }); });
    document.querySelectorAll('.stp-kit button, .stp-kit input, .stp-tab').forEach(b => { const q = b.getBoundingClientRect(); if (q.width && (q.left < card.left - 1 || q.right > card.right + 1)) bad.push('outside ' + (b.textContent || b.placeholder)); });
    const txt = getComputedStyle(document.querySelector('.stp-kit-t b')).color, chip = document.querySelector('.stp-kit-got'), cs = chip && getComputedStyle(chip);
    return { bad, text: txt, textLum: lum(txt), chip: cs && [cs.color, cs.backgroundColor], theme: document.documentElement.className.slice(0, 120) };
  });
  ok('4b rows: names never under the buttons, buttons 36px+, nothing outside the card', !lay.bad.length, lay);
  /* 5. Bought moves it from the cart into the kitchen */
  const gotId = await P.evaluate(() => { const r = [...document.querySelectorAll('.stp-kit-cart .stp-kit-row')].find(x => x.textContent.includes('Oat flakes')); return r && r.querySelector('[data-stp-kit-got]').getAttribute('data-stp-kit-got'); });
  await R.tap('[data-stp-kit-got="' + gotId + '"]'); await H.sleep(700);
  s = await st();
  ok('5 Bought: off the cart and the shopping list, into At home, with a short note', !s.cart.includes('Oat flakes') && !s.list.some(n => /^Oat flakes/.test(n)) && s.home.includes('Oat flakes') && s.saved.includes('Oat flakes') && /Oat flakes/.test(s.msg), s);
  /* 6. take Eggs out: gone, Buy again offered, nothing added by itself */
  const eggId = await P.evaluate(() => { const r = [...document.querySelectorAll('.stp-kit-home .stp-kit-row')].find(x => x.textContent.includes('Eggs')); return r && r.querySelector('[data-stp-kit-drop]').getAttribute('data-stp-kit-drop'); });
  await R.tap('[data-stp-kit-drop="' + eggId + '"]'); await H.sleep(700);
  s = await st();
  ok('6 taking Eggs out removes it; Buy again is offered and the cart is unchanged', !s.home.includes('Eggs') && !s.saved.includes('Eggs') && s.gone && !s.cart.includes('Eggs'), s);
  await R.shot(out + '/3-kitchen-buy-again-' + tag + '.png');
  await R.tap('[data-stp-kit="again"]'); await H.sleep(700);
  s = await st();
  ok('7 Buy again puts Eggs in the cart, only after the tap', s.cart.includes('Eggs') && !s.gone, s);
  /* 8. remove from the cart */
  const yId = await P.evaluate(() => { const r = [...document.querySelectorAll('.stp-kit-cart .stp-kit-row')].find(x => x.textContent.includes('Greek yogurt')); return r && r.querySelector('[data-stp-kit-cdrop]').getAttribute('data-stp-kit-cdrop'); });
  await R.tap('[data-stp-kit-cdrop="' + yId + '"]'); await H.sleep(700);
  s = await st();
  ok('8 the x takes Greek yogurt off the cart and the shopping list, not into the kitchen', !s.cart.includes('Greek yogurt') && !s.list.includes('Greek yogurt') && !s.home.includes('Greek yogurt'), s);
  /* 9. close and reopen: still there, still on the Kitchen tab */
  await R.tap('.stp-card [data-stp="close"]'); await H.sleep(800);
  const closed = await P.evaluate(() => !LowiStorePicks.isOpen() && !document.documentElement.classList.contains('stp-open'));
  await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1200);
  s = await st();
  ok('9 closed with X, reopened: Kitchen tab remembered, Oat flakes at home, Eggs in the cart', closed && s.tab === 'kitchen' && s.home.includes('Oat flakes') && s.cart.includes('Eggs'), Object.assign({ closed }, s));
  /* 10. the world behind the glass: the panel is see-through and the world canvas is still on the page under it */
  const glass = await P.evaluate(() => { const c = document.querySelector('.stp-card'), cs = getComputedStyle(c), ov = getComputedStyle(document.querySelector('.stp-ov')); const cv = [...document.querySelectorAll('canvas')].filter(x => { const r = x.getBoundingClientRect(); return r.width > 200 && r.height > 200 && getComputedStyle(x).display !== 'none'; }).length; return { card: cs.backgroundColor, blur: cs.backdropFilter || cs.webkitBackdropFilter || '', ov: ov.backgroundColor, canvases: cv }; });
  const alpha = c => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return 1; const p = m[1].split(',').map(Number); return p.length > 3 ? p[3] : 1; };
  ok('10 see-through glass over the world (card and backdrop not opaque, world canvas under it)', alpha(glass.card) < 1 && alpha(glass.ov) < 1 && glass.canvases >= 1, glass);
  /* 11. + Shopping cart on a Supermarket product */
  await R.tap('[data-stp-tab="shop"].stp-tab'); await H.sleep(800);
  let qvOk = null;
  const hasStore = await P.evaluate(() => !!document.querySelector('[data-stp-item]'));
  if (!hasStore) { const g = await P.evaluate(() => document.querySelector('.stp-skip') ? '.stp-skip' : document.querySelector('[data-stp="general"]') ? '[data-stp="general"]' : ''); console.log('pick view, tapping', g); if (g) { await P.evaluate(q => document.querySelector(q).scrollIntoView({ block: 'center' }), g); await H.sleep(400); await R.tap(g); for (let k = 0; k < 20 && !(await P.evaluate(() => !!document.querySelector('[data-stp-item]'))); k++) await H.sleep(500); } }
  const item = await P.evaluate(() => !!document.querySelector('[data-stp-item]'));
  if (item) {
    await P.evaluate(() => document.querySelector('[data-stp-item]').scrollIntoView({ block: 'center' })); await H.sleep(400);
    await R.tap('[data-stp-item]'); await H.sleep(900);
    const name = await P.evaluate(() => (document.querySelector('[data-stp-kit-qv]') || {}).getAttribute && document.querySelector('[data-stp-kit-qv]').getAttribute('data-stp-kit-qv'));
    if (name) {
      await P.evaluate(() => document.querySelector('[data-stp-kit-qv]').scrollIntoView({ block: 'center' })); await H.sleep(400);
      await R.tap('[data-stp-kit-qv]'); await H.sleep(600);
      const after = await P.evaluate(n => ({ btn: document.querySelector('[data-stp-kit-qv]').textContent, onList: LOWI_SHELF.listOpen(true).some(i => i.n === n) }), name);
      await R.shot(out + '/4-product-card-cart-' + tag + '.png');
      await P.evaluate(() => { const b = document.querySelector('[data-stp="qv-close"]'); if (b) b.scrollIntoView({ block: 'center' }); }); await H.sleep(300);
      await R.tap('[data-stp="qv-close"]'); await H.sleep(500);
      await R.tap('[data-stp-tab="kitchen"].stp-tab'); await H.sleep(700);
      s = await st();
      qvOk = after.onList && /✓/.test(after.btn) && s.cart.includes(name);
      ok('11 + Shopping cart on a product card: on the list and in the Kitchen tab cart', qvOk, { name, after, cart: s.cart });
    } else ok('11 + Shopping cart button on the product card', false, 'no button');
  } else ok('11 product list reachable for + Shopping cart', false, 'no product rows');
  if (!(await P.evaluate(() => LowiStorePicks.tab() === 'kitchen'))) { await R.tap('[data-stp-tab="kitchen"].stp-tab'); await H.sleep(700); }
  /* 12. scroll reaches the last form; nothing outside the screen */
  const end = await P.evaluate(() => { const sc = document.querySelector('.stp-card .stp-scroll'); sc.scrollTop = sc.scrollHeight; const f = document.querySelector('[data-stp-kit-form="cart"]').getBoundingClientRect(), r = sc.getBoundingClientRect(); return { formVisible: f.top >= r.top - 1 && f.bottom <= r.bottom + 1, foot: !!document.querySelector('.stp-card .stp-foot [data-stp="close"]') }; });
  await H.sleep(300);
  ok('12 the panel scrolls to the cart form; the close button stays in reach', end.formVisible && end.foot, end);
  await R.shot(out + '/5-kitchen-end-' + tag + '.png');
  ok('13 no page errors', !errs.length, errs.slice(0, 5));
  const pass = res.filter(r => r.pass).length;
  console.log('RESULT ' + pass + '/' + res.length + ' ' + tag + ' build ' + build);
  fs.writeFileSync(out + '/result-' + tag + '.json', JSON.stringify({ build, res, errs }, null, 1));
  await R.close().catch(() => {});
  process.exit(pass === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
