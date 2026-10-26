'use strict';
/* Oct 26, 2026 (MAYA-HANDOFF 0.29): Cook opens on Kitchen (the first tab), the Cook tabs can be held and dragged like
   Community's, the order survives a reload and Cook then opens on the new first tab; games asked for on purpose still win.
   node tools/cook-tabs/check.cjs [url|root] [langs] [outdir]     ENG=chromium|webkit (default chromium)
   WebKit on this VM: SIM_REDUCED_MOTION=1 SIM_WK_NOSHOT=1. No real data: a fresh test profile, nothing is sent. */
const H = require('../sim/harness.cjs');
const fs = require('fs');
process.env.SIM_WK_VIEWPORT = '1';
const LBL = { en: ['Kitchen', 'Shuffle', 'Swipe'], de: ['Küche', 'Mischen', 'Swipen'], es: ['Cocina', 'Mezclar', 'Deslizar'] };
(async () => {
  const where = process.argv[2] || '.', langs = (process.argv[3] || 'en,de,es').split(',');
  const out = process.argv[4] || '/tmp/cook-tabs', engine = process.env.ENG || 'chromium';
  fs.mkdirSync(out, { recursive: true });
  let pass = 0, fail = 0; const bad = [];
  for (const lang of langs) {
    const tag = 'iphone13-' + lang + '-' + engine;
    const o = { engine, members: 6, messages: 6, probe: false, lang, viewport: { width: 390, height: 844 } };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page, errs = [];
    P.on('pageerror', e => errs.push(String(e && e.message || e).slice(0, 200)));
    const ok = (name, c, info) => { if (c) pass++; else { fail++; bad.push(tag + ' ' + name); } console.log((c ? 'PASS ' : 'FAIL ') + tag + ' ' + name + (c || info === undefined ? '' : '  ' + JSON.stringify(info))); };
    const shot = async n => { if (!process.env.SIM_WK_NOSHOT || engine !== 'webkit') try { await P.screenshot({ path: out + '/' + tag + '-' + n + '.png' }); } catch (e) { } };
    try {
      if (engine === 'chromium') await P.setViewportSize({ width: 390, height: 844 });
      /* an existing user who last looked at Shuffle (the old default and the old remembered tab) */
      await R.ctx.addInitScript(a => { try { if (sessionStorage.getItem('ckt-seeded')) return; sessionStorage.setItem('ckt-seeded', '1');
        localStorage.setItem('lowispike.lang', a.l); localStorage.setItem('lowi.lang', a.l); localStorage.setItem('lowi.cook.view', 'shuffle'); localStorage.removeItem('lowispike.cook.tabs'); } catch (e) { } }, { l: lang });
      await R.goto(); await H.sleep(6000);
      const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || '');
      console.log(tag, 'build', build, 'viewport', JSON.stringify(P.viewportSize()));
      const st = () => P.evaluate(() => {
        const bar = document.querySelector('#tab-shelf #ckBar .ck-view'), bs = bar ? [...bar.querySelectorAll('.ck-b[data-ck="view"]')] : [];
        const r = bar && bar.getBoundingClientRect();
        return { view: localStorage.getItem('lowi.cook.view'), saved: localStorage.getItem('lowispike.cook.tabs'), attr: ((document.querySelector('[data-ckview]') || { getAttribute: () => null }).getAttribute('data-ckview')),
          order: bs.map(b => b.dataset.v), labels: bs.map(b => b.textContent.trim()), on: bs.filter(b => b.classList.contains('on') || b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.v),
          kitchenShown: !!document.querySelector('#tab-shelf .kg-root, #tab-shelf #kgRoot') && [...document.querySelectorAll('#tab-shelf .kg-root, #tab-shelf #kgRoot')].some(e => e.offsetHeight > 0),
          arranging: !!(bar && bar.classList.contains('rm-arranging')), lifted: bs.filter(b => b.classList.contains('rm-lifted')).map(b => b.dataset.v),
          row: r ? { x: Math.round(r.x), w: Math.round(r.width), y: Math.round(r.y), h: Math.round(r.height) } : null,
          btn: bs.map(b => { const q = b.getBoundingClientRect(); return [Math.round(q.x), Math.round(q.right), Math.round(q.height)]; }),
          over: document.documentElement.scrollWidth > innerWidth + 1, hint: bar ? bar.getAttribute('aria-description') : null };
      });
      const openCook = async () => { await P.evaluate(() => LowiHost.go('home')); await H.sleep(900); await P.evaluate(() => LowiHost.go('shelf')); await H.sleep(1800); };
      await openCook();
      let s = await st();
      ok('order Kitchen | Shuffle | Swipe', JSON.stringify(s.order) === '["kitchen","shuffle","swipe"]', s.order);
      ok('labels in ' + lang, LBL[lang].every((l, i) => (s.labels[i] || '').indexOf(l) >= 0), s.labels);
      ok('Cook opens on Kitchen (old remembered Shuffle no longer wins)', s.view === 'kitchen' && s.attr === 'kitchen' && s.on.join() === 'kitchen', s);
      ok('Kitchen game is showing', s.kitchenShown, s);
      ok('row fits the screen, no sideways scroll', s.row && s.row.x >= 0 && s.row.x + s.row.w <= 390 && !s.over && s.btn.every(b => b[0] >= 0 && b[1] <= 390 && b[2] >= 36), s);
      await shot('1-open');
      /* a plain tap still switches games */
      const box = async v => P.evaluate(v => { const b = document.querySelector('#tab-shelf #ckBar .ck-b[data-ck="view"][data-v="' + v + '"]'); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, v);
      let b = await box('shuffle'); await P.mouse.click(b.x, b.y); await H.sleep(900);
      s = await st(); ok('a tap on Shuffle switches to Shuffle', s.view === 'shuffle' && s.on.join() === 'shuffle', s);
      await openCook(); s = await st();
      ok('leaving and opening Cook again lands on the first tab (Kitchen)', s.view === 'kitchen', s);
      /* hold Swipe and drag it to the front */
      const k = await box('kitchen'); b = await box('swipe');
      await P.mouse.move(b.x, b.y); await P.mouse.down(); await H.sleep(750);
      for (let i = 0; i < 10 && !(s = await st()).arranging; i++) await H.sleep(100);
      s = await st(); ok('a hold lifts the tab (row arranging, Swipe lifted)', s.arranging && s.lifted.join() === 'swipe', s);
      ok('VoiceOver hint in ' + lang, !!s.hint && (lang !== 'en' || s.hint === 'Hold a tab to move it') && (lang !== 'de' || /Tab/.test(s.hint)) && (lang !== 'es' || /pesta/.test(s.hint)), s.hint);
      for (let i = 1; i <= 12; i++) { await P.mouse.move(b.x + (k.x - 40 - b.x) * i / 12, b.y); await H.sleep(40); }
      await H.sleep(250); await shot('2-dragging');
      await P.mouse.up(); await H.sleep(700);
      s = await st();
      ok('drop puts Swipe first and saves it', JSON.stringify(s.order) === '["swipe","kitchen","shuffle"]' && s.saved === '["swipe","kitchen","shuffle"]', s);
      ok('the drop is not a tap: the game did not switch', s.view === 'kitchen' && !s.arranging && !s.lifted.length, s);
      await shot('3-dropped');
      await openCook(); s = await st();
      ok('Cook now opens on Swipe (the new first tab)', s.view === 'swipe' && s.on.join() === 'swipe' && s.order[0] === 'swipe', s);
      /* a game asked for on purpose still wins: Kitchen from a Kitchen link */
      await P.evaluate(() => LowiHost.go('home')); await H.sleep(900);
      await P.evaluate(() => LowiKitchenGame.open()); await H.sleep(2000);
      s = await st(); ok('a Kitchen link opens Cook on Kitchen even with Swipe first', s.view === 'kitchen' && s.on.join() === 'kitchen', s);
      /* reload: the order stays and Cook still opens on Swipe */
      await P.reload(); await H.sleep(6000); await openCook(); s = await st();
      ok('after a reload the order stays and Cook opens on Swipe', JSON.stringify(s.order) === '["swipe","kitchen","shuffle"]' && s.view === 'swipe', s);
      /* a cancelled hold (tiny move, release in place) changes nothing */
      b = await box('shuffle'); await P.mouse.move(b.x, b.y); await P.mouse.down(); await H.sleep(750); await P.mouse.move(b.x + 3, b.y); await P.mouse.up(); await H.sleep(700);
      s = await st(); ok('hold and release in place keeps the order and the game', JSON.stringify(s.order) === '["swipe","kitchen","shuffle"]' && s.view === 'swipe', s);
      ok('no page errors', errs.length === 0, errs.slice(0, 3));
      await shot('4-final');
    } catch (e) { ok('run', false, String(e && e.stack || e).slice(0, 400)); }
    await R.close();
  }
  console.log('TOTAL pass', pass, 'fail', fail); if (bad.length) console.log('FAILED:\n' + bad.join('\n'));
  process.exit(fail ? 1 : 0);
})();
