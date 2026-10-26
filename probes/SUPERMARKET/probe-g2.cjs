const L = require('../BUGHUNT/playtest/lib.cjs');
(async () => {
  const s = await L.serve('/home/sprite/wt-supermarket');
  const h = await L.open({ view: 'chromium390', url: 'http://127.0.0.1:' + s.address().port + '/', settle: 2500 });
  await h.page.addScriptTag({ url: '/week-basket-core.js' });
  console.log(await h.page.evaluate(() => LowiWeekBasketCore.pool(LowiAllRecipes()).map(r => r.id + ': ' + r.ing.map(i => i.g + '/' + i.n).join(', ')).join('\n')));
  await h.browser.close(); s.close();
})();
