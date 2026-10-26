const L = require('../BUGHUNT/playtest/lib.cjs');
(async () => {
  const s = await L.serve('/home/sprite/wt-supermarket');
  const h = await L.open({ view: 'chromium390', url: 'http://127.0.0.1:' + s.address().port + '/', settle: 3000 });
  const o = await h.page.evaluate(() => ({ openRecipe: typeof openRecipe, P2: window.LowiP2 && Object.keys(window.LowiP2), tdAisle: typeof tdAisle, TD_ORDER: typeof TD_ORDER !== 'undefined' && Object.keys(TD_ORDER), groc: typeof TD_ORDER !== 'undefined' && JSON.stringify(TD_ORDER.groceries).slice(0,600), FOOD: typeof FOOD_IMG !== 'undefined' && ['rb_garlic_yogurt_chicken_box','m_bolognese','paprikaburger','m_chili'].map(k => !!FOOD_IMG[k]), LL: window.LowiLang && Object.keys(window.LowiLang), lang: window.LowiLang && LowiLang.lang && LowiLang.lang(), mealPic: window.LowiStoreList && typeof LowiStoreList.pic,
     recImg: (() => { const r = LowiAllRecipes().find(r => r.id === 'm_chili'); return r && (r.img ? String(r.img).slice(0, 40) : 'none') + ' e:' + r.e; })() }));
  console.log(JSON.stringify(o, null, 1));
  await h.browser.close(); s.close();
})();
