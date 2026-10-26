'use strict';
/* Oct 26 2026: Shop from home (week-basket.js) with real finger taps, local root or live URL.
   node check.cjs <root|url> [view iphone13|ipadL|ipadP|chromium390] [langs en,de,es] [outdir]
   Reduce Motion on. Checks: Supermarket door, sheet opens, layout (no clipped text, 44 pt targets, nothing off the card, no
   sideways scroll), people/store/swap/have change the plan and total, list CTA fills the shopping list (= Cart), Cart wording when the
   Cart button exists, Open my Cart opens the Cart pane, the What's New step new-week-shop plays on Supermarket with its door lit and
   a recorded clip, no page errors. Prints PASS/FAIL and ALL OK / FAIL. Fake data only (fixture, no network beyond the host). */
const L = require('../BUGHUNT/playtest/lib.cjs'), layout = require('./layout.cjs'), fs = require('fs');
(async () => {
  const where = process.argv[2] || '/home/sprite/wt-supermarket', view = process.argv[3] || 'iphone13', langs = (process.argv[4] || 'en,de,es').split(','), out = process.argv[5] || '/tmp/wb-check';
  fs.mkdirSync(out, { recursive: true });
  let srv = null, url = where;
  if (!/^https?:/.test(where)) { srv = await L.serve(where); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const res = [];
  for (const lang of langs) {
    const tag = view + '-' + lang;
    const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + tag + ' ' + n + (i !== undefined ? ' ' + JSON.stringify(i).slice(0, 700) : '')); };
    const h = await L.open({ view, url, settle: 1500, lang, reducedMotion: true });
    const p = h.page;
    await p.evaluate(l => { try { localStorage.setItem('lowi.lang', l); } catch (e) {} }, lang); await p.reload(); await L.sleep(5000);
    await p.evaluate(l => { try { if (window.LowiLang && LowiLang.set && LowiLang.get() !== l) LowiLang.set(l); } catch (e) {} }, lang); await L.sleep(800);
    const tapSel = async sel => { await p.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await L.sleep(250); const c = await L.center(h, sel); if (!c) return false; await L.tap(h, c.x, c.y); return true; };
    const env = await p.evaluate(() => ({ build: window.LOWI_BUILD || '', wb: !!window.LowiWeekBasket, rm: matchMedia('(prefers-reduced-motion: reduce)').matches, lang: window.LowiLang && LowiLang.get(), html: document.documentElement.lang, w: innerWidth, h: innerHeight }));
    ok('loaded, Reduce Motion on, language set', env.wb && env.rm && env.lang === lang, env);

    /* 1. tour step on Supermarket */
    await p.evaluate(() => window.LowiTutorial && LowiTutorial.news({ id: 'wbc', tour: ['new-week-shop'] }));
    await L.sleep(1500);
    let g = 0; while (g++ < 4 && await p.evaluate(() => window.LowiTutorial && LowiTutorial.step()) !== 'new-week-shop') { await tapSel('[data-lt="next"]'); await L.sleep(1800); }
    await L.sleep(1500);
    const tw = await p.evaluate(() => { const d = document.querySelector('.stp-card .stp-wb'), r = d && d.getBoundingClientRect(), V = window.LowiTutorialVoice || window.LowiTutVoice; const sp = document.querySelector('.lt-card [class*="speak"], .lt-card [data-lt="voice"], .lt-card .ltv-btn'); return { step: window.LowiTutorial && LowiTutorial.step(), title: (document.querySelector('.lt-title') || {}).textContent || '', text: ((document.querySelector('.lt-text') || {}).textContent || '').slice(0, 80), door: r ? r.width > 0 && r.top >= 0 && r.bottom <= innerHeight : false, speaker: !!sp }; });
    const tt = { en: 'Shop from home', de: 'Von zu Hause einkaufen', es: 'Compra desde casa' }[lang];
    ok('tour: new-week-shop opens Supermarket with the Shop from home door showing and a speaker, in ' + lang, tw.step === 'new-week-shop' && tw.door && tw.speaker && tw.title.indexOf(tt) >= 0, tw);
    await p.screenshot({ path: out + '/tour-' + tag + '.png' });
    await p.evaluate(() => { if (window.LowiTutorial && LowiTutorial.isOn()) LowiTutorial.stop('check'); }); await L.sleep(900);

    /* 2. door -> sheet */
    await p.evaluate(() => { const P = window.LowiStorePicks; if (!P.isOpen()) P.open('check'); P.setTab('shop'); }); await L.sleep(1200);
    const hasCart = await p.evaluate(() => !!document.querySelector('.stp-card .stp-cartbtn'));
    const dg = await p.evaluate(() => { const c = document.querySelector('.stp-card'), d = document.querySelector('.stp-card .stp-wb'), sc = document.querySelector('.stp-card .stp-scroll'); if (!c || !d || !sc) return null; const cr = c.getBoundingClientRect(), dr = d.getBoundingClientRect(), sr = sc.getBoundingClientRect(); return { door: [Math.round(dr.left - cr.left), Math.round(cr.right - dr.right), Math.round(dr.top), Math.round(dr.height)], scrollH: Math.round(sr.height), fits: dr.left >= cr.left && dr.right <= cr.right && dr.bottom <= innerHeight, clipped: [...d.querySelectorAll('b,small')].some(e => e.scrollWidth > e.clientWidth + 1) }; });
    ok('door: inside the card, nothing cut off, Supermarket list keeps room to scroll', dg && dg.fits && !dg.clipped && dg.scrollH >= 220 && dg.door[3] >= 44, dg);
    await p.screenshot({ path: out + '/door-' + tag + '.png' });
    ok('door tapped opens the sheet', (await tapSel('.stp-card .stp-wb')) && (await L.sleep(900), await p.evaluate(() => LowiWeekBasket.isOpen() && !!document.querySelector('#wbSheet .wb-card'))));
    const lo = await layout(p);
    const hOver = await p.evaluate(() => { const s = document.querySelector('#wbSheet .wb-scroll'); return document.documentElement.scrollWidth > innerWidth + 1 || (s && s.scrollWidth > s.clientWidth + 1); });
    ok('layout: nothing clipped, 44 pt targets, nothing off the card, no sideways scroll', !lo.err && !lo.clipped.length && !lo.small.length && !lo.offCard.length && !hOver, { card: lo.card, clipped: lo.clipped, small: lo.small, offCard: lo.offCard, hOver });
    await p.screenshot({ path: out + '/sheet-' + tag + '.png' });
    if (view.indexOf('ipad') === 0) { console.log(lo.text.slice(0, 300).replace(/\n+/g, ' / ')); }
    const st = () => p.evaluate(() => { const s = LowiWeekBasket._state(); return { people: s.people, store: s.store, plan: (s.plan || []).join(), total: ((document.querySelector('.wb-total b') || {}).textContent || ''), cta: ((document.querySelector('[data-wb="list"]') || {}).textContent || '').trim(), have: document.querySelectorAll('.wb-items .wb-have, .wb-items [aria-pressed="true"]').length }; });
    const s0 = await st();
    /* 3. interactions */
    await tapSel('[data-wb="people"][data-v="' + (s0.people === 4 ? 3 : 4) + '"]'); await L.sleep(500);
    const s1 = await st(); ok('people changes the total', s1.people !== s0.people && s1.total !== s0.total, [s0, s1]);
    const other = await p.evaluate(cur => { const b = [...document.querySelectorAll('[data-wb="store"]')].find(x => x.dataset.v !== cur); return b && b.dataset.v; }, s1.store);
    await tapSel('[data-wb="store"][data-v="' + other + '"]'); await L.sleep(500);
    const s2 = await st(); ok('store chip picks the store', s2.store === other, s2);
    await tapSel('[data-wb="swap"][data-i="0"]'); await L.sleep(500);
    const s3 = await st(); ok('Swap changes the first dinner', s3.plan.split(',')[0] !== s2.plan.split(',')[0], [s2.plan, s3.plan]);
    const t3 = s3.total; await tapSel('[data-wb="have"]'); await L.sleep(500);
    const s4 = await st(); ok('tap the circle: at home, off the bill', s4.total !== t3, [t3, s4.total]);
    /* 4. list / Cart */
    const before = await p.evaluate(() => { try { return (window.LOWI_SHELF.cartLines ? LOWI_SHELF.cartLines() : LOWI_SHELF.state ? (LOWI_SHELF.state().list || []) : []).length; } catch (e) { return -1; } });
    ok('CTA wording: Cart when the Cart is there', hasCart ? /Cart|Warenkorb|carrito/.test(s4.cta) : /list|liste|lista/i.test(s4.cta), { hasCart, cta: s4.cta });
    await tapSel('[data-wb="list"]'); await L.sleep(800);
    const after = await p.evaluate(() => { try { return (window.LOWI_SHELF.cartLines ? LOWI_SHELF.cartLines() : LOWI_SHELF.state ? (LOWI_SHELF.state().list || []) : []).length; } catch (e) { return -1; } });
    const s5 = await st(); const toastT = await p.evaluate(() => (document.querySelector('.wb-toast') || {}).textContent || '');
    ok('the week goes on the shopping list / Cart', after > before && /\u2713/.test(s5.cta), { before, after, cta: s5.cta, toast: toastT });
    await p.screenshot({ path: out + '/sent-' + tag + '.png' });
    if (hasCart) {
      await tapSel('[data-wb="cart"]'); await L.sleep(1500);
      const cp = await p.evaluate(() => { const t = document.getElementById('stpCartT'); return { sheet: window.LowiWeekBasket.isOpen(), cart: !!(t && t.getBoundingClientRect().height), title: t ? t.textContent : '', rows: document.querySelectorAll('.stp-cart-list li').length }; });
      ok('Open my Cart closes the sheet and opens the Cart with the week in it', !cp.sheet && cp.cart && cp.rows > 0, cp);
      await p.screenshot({ path: out + '/cart-' + tag + '.png' });
    }
    const errs = h.log.pageerror;
    ok('no page errors', !errs.length, errs);
    await h.browser.close();
  }
  if (srv) srv.close();
  console.log(res.every(Boolean) ? 'ALL OK' : 'FAIL ' + res.filter(x => !x).length);
})().catch(e => { console.log('FAIL crash', e && e.stack); process.exit(1); });
