const L = require('../BUGHUNT/playtest/lib.cjs'), layout = require('./layout.cjs');
const view = process.argv[2] || 'chromium390', langs = (process.argv[3] || 'en,de,es').split(',');
(async () => {
  const s = await L.serve('/home/sprite/wt-supermarket');
  for (const lang of langs) {
    const h = await L.open({ view, url: 'http://127.0.0.1:' + s.address().port + '/', settle: 2500, lang, reducedMotion: true });
    const p = h.page;
    if (!(await p.evaluate(() => !!window.LowiWeekBasket))) { await p.addStyleTag({ url: '/week-basket.css' }); await p.addScriptTag({ url: '/week-basket-core.js' }); await p.addScriptTag({ url: '/week-basket.js' }); }
    await p.evaluate(l => { try { LowiLang.set(l); } catch (e) {} }, lang); await L.sleep(300);
    await p.evaluate(() => LowiWeekBasket.open({ store: 'lidl' })); await L.sleep(500);
    const lo = await layout(p);
    console.log(lang, JSON.stringify({ card: lo.card, clipped: lo.clipped, small: lo.small, offCard: lo.offCard, tick: lo.tick }));
    console.log(lo.text.slice(0, 900).replace(/\n+/g, ' / '));
    await p.screenshot({ path: 'L-' + view + '-' + lang + '.png' });
    console.log('errors', JSON.stringify(h.log).slice(0, 400));
    await h.browser.close();
  }
  s.close();
})();
