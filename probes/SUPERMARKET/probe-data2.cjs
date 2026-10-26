const L = require('../BUGHUNT/playtest/lib.cjs');
(async () => {
  const s = await L.serve('/home/sprite/wt-supermarket');
  const url = 'http://127.0.0.1:' + s.address().port + '/';
  const h = await L.open({ view: 'chromium390', url, settle: 3000 });
  const o = await h.page.evaluate(() => {
    const SL = window.LowiStoreList, all = window.LowiAllRecipes();
    const nul = all.filter(r => !r.c);
    return { nul: nul.length, rs: [...new Set(nul.map(r => r.r))], ex: nul.slice(0, 50).map(r => r.id + ' ' + r.n + ' [' + r.r + '] ' + (r.meal||r.t||'') + ' ' + SL.items(r).length + ' ' + (r.tags||'')), keys: Object.keys(nul[0]||{}), mkeys: Object.keys(all.find(r=>r.c==='meal')),
      aisle: typeof tdAisle, kitKey: window.LowiKitchenCore.KEY, kit: localStorage.getItem(window.LowiKitchenCore.KEY), cart: JSON.stringify(window.S && S.cart) };
  });
  console.log(JSON.stringify(o, null, 1).slice(0, 7000));
  await h.browser.close(); s.close();
})();
