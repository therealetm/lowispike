/* Run 41: is the recipe card's Undo where Add to kitchen was (double tap = add then undo)? Renders rowHTML before/after with the
   live CSS inside a chat-width box and compares rects. node probe-crb-undo-spot.cjs <url> [view] */
'use strict';
const L = require('./lib.cjs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/', view = process.argv[3] || 'iphone13';
  const h = await L.open({ url, view, lang: 'en' }); const P = h.page;
  await P.waitForFunction(() => window.LowiBotRecipeCore || Object.keys(window).some(k => /BotRecipe/.test(k)), null, { timeout: 60000 }).catch(() => {});
  const out = await P.evaluate(() => { const C = window.LowiBotRecipeCore; if (!C) return { keys: Object.keys(window).filter(k => /Recipe/.test(k)) };
    const res = {};
    for (const lang of ['en', 'de', 'es']) { const li = ['en', 'de', 'es'].indexOf(lang);
      const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:16px;top:200px;width:300px;z-index:99999'; box.className = 'cm-msg'; document.body.appendChild(box);
      const o = { key: 'c1', id: '5', foods: ['a', 'b', 'c'], count: 5 };
      box.innerHTML = C.rowHTML(o, li); const k = box.querySelector('[data-crb="kitchen"]').getBoundingClientRect();
      box.innerHTML = C.rowHTML(Object.assign({}, o, { kitchen: 'done', added: 5, undo: true }), li); const u = box.querySelector('[data-crb="undo"]').getBoundingClientRect();
      const cx = k.left + k.width / 2, cy = k.top + k.height / 2;
      res[lang] = { add: [k.left, k.top, k.width, k.height].map(Math.round), undo: [u.left, u.top, u.width, u.height].map(Math.round), addCenterInUndo: cx >= u.left && cx <= u.right && cy >= u.top && cy <= u.bottom, dist: Math.round(Math.hypot(cx - (u.left + u.width / 2), cy - (u.top + u.height / 2))) };
      box.remove(); }
    return res; });
  console.log(JSON.stringify(out)); await h.browser.close(); process.exit(0);
})();
