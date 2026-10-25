'use strict';
/* Oct 25, 2026: Give a hand as the fourth peer in the Fuel > Shop tab bar (store-picks.js giftDoor), no longer a row in Kitchen.
   node tools/give-hand-tab/check.cjs [url|root] [sizes] [langs] [outdir]     ENG=chromium|webkit (default chromium)
   sizes: iphone (390x844), se (320x568), small (375x667), ipadP (820x1180), ipadL (1180x820); langs: en,de,es
   WebKit on this VM: SIM_REDUCED_MOTION=1 SIM_WK_NOSHOT=1 (and SIM_DPR=1 for iPad) keep software rendering moving
   Real finger taps. Server gate shut: three tabs, no Give a hand anywhere. Server gate open: four tabs (Supermarket, Seller Zone,
   Kitchen, Give a hand), each inside the card, 44 px+, no word cut off, no sideways overflow; no Give a hand row in Kitchen or
   the Supermarket pane; tap Give a hand: its panel opens on top of Shop; its X brings Shop back on the tab used last (Kitchen);
   Supermarket and Seller Zone tabs still switch; Shop's own X closes Shop. Zero page errors. The Room galaxy is not touched. */
const H = require('../sim/harness.cjs');
const fs = require('fs');
const SZ = { iphone: [390, 844], se: [320, 568], small: [375, 667], ipadP: [820, 1180], ipadL: [1180, 820] };
/* WebKit keeps its device (user agent, touch) but uses the size asked for (iPhone 13 at the full 390x844; iPad Pro 11 both ways) */
process.env.SIM_WK_VIEWPORT = '1';
const NM = { en: 'Give a hand', de: 'Hilf mit', es: 'Echa una mano' };
(async () => {
  const where = process.argv[2] || '.', sizes = (process.argv[3] || 'iphone,se').split(','), langs = (process.argv[4] || 'en,de,es').split(',');
  const out = process.argv[5] || '/tmp/give-hand-tab', engine = process.env.ENG || 'chromium';
  fs.mkdirSync(out, { recursive: true });
  let pass = 0, fail = 0; const bad = []; let first = true;
  for (const sz of sizes) for (const lang of langs) {
    const [w, h] = SZ[sz], tag = sz + '-' + lang + '-' + engine, gateTest = first; first = false;
    const o = { engine, members: 6, messages: 6, probe: false, lang, viewport: { width: w, height: h } };
    if (/^ipad/.test(sz)) { o.device = 'iPad Pro 11'; o.dpr = 2; }
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    const ok = (name, c, info) => { if (c) pass++; else { fail++; bad.push(tag + ' ' + name); } console.log((c ? 'PASS ' : 'FAIL ') + tag + ' ' + name + (c || info === undefined ? '' : ' ' + JSON.stringify(info))); };
    try {
      if (engine === 'chromium') await P.setViewportSize({ width: w, height: h });
      await R.ctx.addInitScript(a => { try { if (sessionStorage.getItem('ght-seeded')) return; sessionStorage.setItem('ght-seeded', '1');
        localStorage.setItem('lowispike.lang', a.l); localStorage.setItem('lowi.lang', a.l); localStorage.setItem('lowi.storePicks.tab', 'kitchen');
        if (a.gate) localStorage.removeItem('lowi.giftBasket.server.v1'); else localStorage.setItem('lowi.giftBasket.server.v1', JSON.stringify({ ok: true, at: Date.now() })); } catch (e) { } }, { l: lang, gate: gateTest });
      /* offline fake server for the panel itself (the panel is gift-basket.js, unchanged) */
      await R.ctx.addInitScript(g => { window.__gbReady = !g; const t = setInterval(() => { if (window.LowiGiftBasket) { clearInterval(t);
        window.LowiGiftBasket._api = { uid: () => 'me', ready: async () => !!window.__gbReady, open: async () => [], mine: async () => [], given: async () => [], trust: async () => [] }; } }, 50); }, gateTest);
      await R.goto(); await H.sleep(6000);
      const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || '');
      console.log(tag, 'build', build, 'viewport', JSON.stringify(P.viewportSize()));
      const bar = () => P.evaluate(() => {
        const card = document.querySelector('.stp-card'), c = card.getBoundingClientRect();
        const tabs = [...document.querySelectorAll('.stp-tab')].map(b => { const q = b.getBoundingClientRect(), l = b.querySelector('b'), lq = l.getBoundingClientRect();
          return { id: b.dataset.stpTab, txt: l.textContent, h: Math.round(q.height), w: Math.round(q.width), lines: Math.round(lq.height / parseFloat(getComputedStyle(l).lineHeight || 12)), inCard: q.left >= c.left - 1 && q.right <= c.right + 1 && q.top >= 0 && q.bottom <= innerHeight,
            cut: l.scrollWidth > l.clientWidth + 1 || lq.left < q.left - 1 || lq.right > q.right + 1 || lq.bottom > q.bottom + 1 || lq.top < q.top - 1, role: b.getAttribute('role'), sel: b.getAttribute('aria-selected'), on: b.classList.contains('on') }; });
        return { tabs, hOver: card.scrollWidth > card.clientWidth + 1, pageOver: document.documentElement.scrollWidth > innerWidth + 1, tab: LowiStorePicks.tab(), rows: document.querySelectorAll('.stp-card .gb-entry').length };
      });
      await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1500);
      let t = await bar();
      if (gateTest) {
        ok('0 server gate shut: three tabs, no Give a hand row', t.tabs.map(x => x.id).join() === 'shop,sz,kitchen' && !t.rows, t);
        await P.evaluate(() => { window.__gbReady = true; localStorage.removeItem('lowi.giftBasket.server.v1'); return LowiGiftBasket.probe(); }); await H.sleep(1500);
        t = await bar();
        ok('0b the server answers ready while Shop is open: Give a hand appears without reopening', t.tabs.map(x => x.id).join() === 'shop,sz,kitchen,gift', t.tabs.map(x => x.id));
      }
      ok('1 Shop tab bar: Supermarket, Seller Zone, Kitchen, Give a hand', t.tabs.map(x => x.id).join() === 'shop,sz,kitchen,gift', t.tabs.map(x => x.id));
      ok('2 every tab inside the card, 44 px+ tall, no word cut off, no sideways overflow', t.tabs.every(x => x.inCard && x.h >= 44 && !x.cut) && !t.hOver && !t.pageOver, t);
      const g = t.tabs.find(x => x.id === 'gift') || {};
      ok('3 Give a hand tab named in ' + lang + ', role tab, not selected', g.txt === NM[lang] && g.role === 'tab' && g.sel === 'false' && !g.on, g);
      ok('4 Shop opens on the remembered tab (Kitchen) and Kitchen has no Give a hand row', t.tab === 'kitchen' && !t.rows, t);
      console.log(tag, 'tabs', t.tabs.map(x => x.id + ':' + x.w + 'x' + x.h + ':' + x.lines + 'l').join(' '));
      await R.shot(out + '/1-shop-tabs-' + tag + '.png');
      await R.tap('.stp-tab[data-stp-tab="shop"]'); await H.sleep(900);
      t = await bar();
      ok('5 Supermarket tab still switches, and has no Give a hand row', t.tab === 'shop' && !t.rows && t.tabs.find(x => x.id === 'shop').on, t);
      await R.tap('.stp-tab[data-stp-tab="sz"]'); await H.sleep(900);
      t = await bar(); ok('6 Seller Zone tab still switches', t.tab === 'sz', t.tab);
      await R.tap('.stp-tab[data-stp-tab="kitchen"]'); await H.sleep(900);
      await R.tap('.stp-tab[data-stp-tab="gift"]'); await H.sleep(1800);
      let s = await P.evaluate(() => { const c = document.querySelector('.gb-ov .stp-card'), r = c && c.getBoundingClientRect(); return { gift: LowiGiftBasket.isOpen(), shop: LowiStorePicks.isOpen(), onTop: !!(c && r.width > 200 && document.elementFromPoint(innerWidth / 2, r.top + 30) && c.contains(document.elementFromPoint(innerWidth / 2, r.top + 30))), remembered: localStorage.getItem('lowi.storePicks.tab') }; });
      ok('7 tap Give a hand: its panel opens on top of Shop; never saved as the Shop tab', s.gift && s.onTop && s.remembered === 'kitchen', s);
      await R.shot(out + '/2-give-a-hand-' + tag + '.png');
      await R.tap('.gb-x'); await H.sleep(1200);
      s = await P.evaluate(() => ({ gift: LowiGiftBasket.isOpen(), shop: LowiStorePicks.isOpen(), tab: LowiStorePicks.tab(), bar: [...document.querySelectorAll('.stp-tab')].map(b => b.dataset.stpTab).join() }));
      ok('8 its X brings Shop back on Kitchen with all four tabs', !s.gift && s.shop && s.tab === 'kitchen' && s.bar === 'shop,sz,kitchen,gift', s);
      await R.tap('.stp-card .stp-close'); await H.sleep(1000);
      s = await P.evaluate(() => ({ shop: LowiStorePicks.isOpen(), home: !!(document.getElementById('tab-home') || {}).classList?.contains('active') }));
      ok('9 Shop X closes Shop, Home stays', !s.shop && s.home, s);
      const errs = R.errs.filter(e => !/supabase|Failed to fetch|NetworkError|Load failed/i.test(e.m));
      ok('10 zero page errors', !errs.length, errs.slice(0, 4));
    } catch (e) { fail++; bad.push(tag + ' crashed: ' + e.message); console.log('FAIL ' + tag + ' crashed ' + e.message); }
    await R.close();
  }
  console.log('\n' + engine + ': ' + pass + ' passed, ' + fail + ' failed' + (bad.length ? '\n  ' + bad.join('\n  ') : ''));
  process.exit(fail ? 1 : 0);
})();
