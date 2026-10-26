'use strict';
/* Oct 26, 2026 (Emmanuel's TikTok: Apple Design skill, .agents/skills/apple-design): the Give a hand swipe deck decides by the
   flick at release (velocity + momentum projection), can be grabbed mid spring-back, and flies out at the finger's speed.
   node tools/fluid-swipe/check.cjs [url|root] [sizes] [langs] [outdir]     ENG=chromium|webkit (default chromium)
   WebKit on this VM: SIM_REDUCED_MOTION=1 SIM_WK_NOSHOT=1 keep software rendering moving.
   Fake data only: a made-up shopping list in localStorage and an offline fake Give a hand server with made-up baskets
   ("Testperson A/B/C", example.org pay links). Nothing is sent anywhere, nothing is paid. */
const H = require('../sim/harness.cjs');
const fs = require('fs');
const SZ = { iphone: [390, 844], se: [320, 568], small: [375, 667] };
process.env.SIM_WK_VIEWPORT = '1';
const CART = { en: 'Cart', de: 'Warenkorb', es: 'Carrito' };
(async () => {
  const where = process.argv[2] || '.', sizes = (process.argv[3] || 'iphone').split(','), langs = (process.argv[4] || 'en,de,es').split(',');
  const out = process.argv[5] || '/tmp/fluid-swipe', engine = process.env.ENG || 'chromium';
  fs.mkdirSync(out, { recursive: true });
  let pass = 0, fail = 0; const bad = [];
  for (const sz of sizes) for (const lang of langs) {
    const [w, h] = SZ[sz], tag = sz + '-' + lang + '-' + engine;
    const o = { engine, members: 6, messages: 6, probe: false, lang, viewport: { width: w, height: h } };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    const ok = (name, c, info) => { if (c) pass++; else { fail++; bad.push(tag + ' ' + name); } console.log((c ? 'PASS ' : 'FAIL ') + tag + ' ' + name + (c || info === undefined ? '' : ' ' + JSON.stringify(info).slice(0, 600))); };
    try {
      if (engine === 'chromium') await P.setViewportSize({ width: w, height: h });
      await R.ctx.addInitScript(a => { try { if (sessionStorage.getItem('fsw-seeded')) return; sessionStorage.setItem('fsw-seeded', '1');
        localStorage.setItem('lowispike.lang', a.l); localStorage.setItem('lowi.lang', a.l); localStorage.setItem('lowi.storePicks.tab', 'shop');
        localStorage.setItem('lowi.giftBasket.server.v1', JSON.stringify({ ok: true, at: Date.now() })); localStorage.removeItem('lowi.giftBasket.skips.v1'); } catch (e) { } }, { l: lang });
      await R.ctx.addInitScript(() => { const t = setInterval(() => { if (window.LowiGiftBasket) { clearInterval(t);
        const now = new Date().toISOString(), B = (id, name, items, total) => ({ id, user_id: 'u-' + id, first_name: name, anon: false, city: 'Teststadt', items: items.map(n => ({ n })), total_eur: total, pay_url: 'https://ko-fi.com/lowitest' + id, created_at: now });
        const open = [B('b1', 'Testperson A', ['Skyr', 'Oats', 'Spinach'], 14), B('b2', 'Testperson B', ['Eggs', 'Lentils'], 9), B('b3', 'Testperson C', ['Apples', 'Rye bread'], 7)];
        window.open = function () { window.__opened = (window.__opened || 0) + 1; return null; };
        window.LowiGiftBasket._api = { uid: () => 'me', ready: async () => true, open: async () => open.map(b => Object.assign({}, b)), mine: async () => [], given: async () => [], trust: async () => [] }; } }, 50); });
      await R.goto(); await H.sleep(6000);
      const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || '');
      console.log(tag, 'build', build, 'viewport', JSON.stringify(P.viewportSize()));
      /* a made-up cart on the real shopping list: one priced (as a reported shelf price), one without a price */
      await P.evaluate(() => { const S = window.LOWI_SHELF; S.addIngredients([{ n: 'Testskyr', e: '\u{1F95B}' }, { n: 'Testhafer', e: '\u{1F33E}' }]);
        const st = S.state(); const a = st.list.find(i => i.n === 'Testskyr'); if (a) a.p = 1.29; });
      await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1500);
      await R.tap('.stp-tab[data-stp-tab="gift"]'); await H.sleep(2500);
      const center = async () => { await P.evaluate(() => { const c = document.querySelector('.gb-swipe'); if (c) c.scrollIntoView({ block: 'center' }); }); await H.sleep(300); };
      const deck = () => P.evaluate(() => { const c = document.querySelector('.gb-swipe'); const r = c && c.getBoundingClientRect();
        return { top: c ? c.getAttribute('data-gb-id') : '', picked: !!(c && c.classList.contains('gb-picked')), pay: !!(c && c.querySelector('.gb-pay')),
          box: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null, over: document.documentElement.scrollWidth > innerWidth + 1,
          skips: Object.keys(JSON.parse(localStorage.getItem('lowi.giftBasket.skips.v1') || '{}')) }; });
      const tx = () => P.evaluate(() => { const c = document.querySelector('.gb-swipe'); if (!c) return null; const m = /matrix(3d)?\(([^)]*)\)/.exec(getComputedStyle(c).transform); if (!m) return 0; const n = m[2].split(',').map(Number); return m[1] ? n[12] : n[4]; });
      await center(); let d = await deck();
      ok('1 deck: basket b1 on top, nothing picked, no sideways overflow', d.top === 'b1' && !d.picked && !d.over, d);
      let b = d.box, x = b.x + b.w / 2, y = b.y + Math.min(60, b.h / 3);
      /* A: drag 150 px right slowly (past the line), then flick back to +118 fast and let go: a change of mind, nothing picked */
      await P.mouse.move(x, y); await P.mouse.down();
      for (let i = 1; i <= 10; i++) { await P.mouse.move(x + 15 * i, y + 1); await H.sleep(45); }
      await P.mouse.move(x + 134, y + 1); await P.mouse.move(x + 118, y + 1); await P.mouse.up(); await H.sleep(800);
      d = await deck();
      ok('2 dragged past the line then flicked back: springs back, nothing picked, no pay link', d.top === 'b1' && !d.picked && !d.pay, d);
      /* B: slow 30 px left, then a quick flick and let go at once: it is thrown, so it skips */
      await center(); d = await deck(); b = d.box; x = b.x + b.w / 2; y = b.y + Math.min(60, b.h / 3);
      await P.mouse.move(x, y); await P.mouse.down();
      for (let i = 1; i <= 6; i++) { await P.mouse.move(x - 5 * i, y + 1); await H.sleep(100); }
      await P.mouse.move(x - 50, y + 1); await P.mouse.move(x - 72, y + 1); await P.mouse.up(); await H.sleep(900);
      d = await deck();
      ok('3 a short drag released with a fast flick left skips: b2 on top, the skip saved', d.top === 'b2' && d.skips.includes('b1'), d);
      await R.tap('.gb-undo'); await H.sleep(700); d = await deck();
      ok('4 Undo brings b1 back', d.top === 'b1', d);
      /* C (only with motion on): let go below the line, grab it again while it springs back: it stays under the finger */
      const calm = await P.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
      if (!calm) {
        await center(); d = await deck(); b = d.box; x = b.x + b.w / 2; y = b.y + Math.min(60, b.h / 3);
        await P.mouse.move(x, y); await P.mouse.down();
        for (let i = 1; i <= 8; i++) { await P.mouse.move(x + 9 * i, y + 1); await H.sleep(60); }
        await H.sleep(150); await P.mouse.up(); await H.sleep(40);
        await P.mouse.down(); const at = await tx(); await H.sleep(250); const held = await tx();
        await P.mouse.move(x + 72 + 20, y + 1); await H.sleep(60); const moved = await tx();
        await P.mouse.up(); await H.sleep(700); const rest = await tx(); d = await deck();
        ok('5 grabbed mid spring-back: it stays where it was caught (no jump to 0), follows the finger, then springs home', at > 8 && Math.abs(held - at) < 3 && moved > held + 10 && Math.abs(rest) < 1 && d.top === 'b1' && !d.picked, { at, held, moved, rest, d });
      } else console.log('SKIP ' + tag + ' 5 grab mid spring-back (Reduce Motion: no spring to grab)');
      await R.shot(out + '/deck-' + tag + '.png');
      const errs = R.errs.filter(e => !/supabase|Failed to fetch|NetworkError|Load failed/i.test(e.m));
      ok('6 zero page errors', !errs.length, errs.slice(0, 4));
    } catch (e) { fail++; bad.push(tag + ' crashed: ' + e.message); console.log('FAIL ' + tag + ' crashed ' + e.message); }
    await R.close();
  }
  console.log('RESULT pass ' + pass + ' fail ' + fail + (bad.length ? '\n' + bad.join('\n') : ''));
  process.exit(fail ? 1 : 0);
})();
