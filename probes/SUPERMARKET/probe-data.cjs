const L = require('../BUGHUNT/playtest/lib.cjs');
(async () => {
  const s = await L.serve('/home/sprite/wt-supermarket');
  const url = 'http://127.0.0.1:' + s.address().port + '/';
  const h = await L.open({ view: 'chromium390', url, settle: 4000 });
  const o = await h.page.evaluate(() => {
    const SL = window.LowiStoreList; const out = { slKeys: SL && Object.keys(SL), stores: SL && SL.stores && SL.stores().map(s => s.id + ':' + s.n) };
    const all = (window.LowiAllRecipes && window.LowiAllRecipes()) || [];
    out.n = all.length; out.meals = all.filter(r => r.c === 'meal').length;
    out.sample = all.filter(r => r.c === 'meal').slice(0, 40).map(r => ({ id: r.id, n: r.n, r: r.r, ing: (r.ing || []).map(i => (i.g || '') + '|' + (i.n || '')).join(', ').slice(0, 200), items: SL ? SL.items(r).map(i => i.n + '/' + i.g + '/' + (SL.price(i, 'lidl')||'')).join(', ').slice(0, 300) : '' }));
    out.cats = [...new Set(all.map(r => r.c))];
    out.shelf = window.LOWI_SHELF && Object.keys(window.LOWI_SHELF); out.kc = window.LowiKitchenCore && Object.keys(window.LowiKitchenCore);
    out.store = localStorage.getItem('lowi.store') ; out.lsKeys = Object.keys(localStorage).filter(k => /store|shop|cart|kitchen|pantry/i.test(k));
    return out; });
  console.log(JSON.stringify(o, null, 1).slice(0, 9000)); console.log(h.log);
  await h.browser.close(); s.close();
})();
