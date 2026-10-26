'use strict';
const L = require('./lib.cjs'); const fs = require('fs');
(async () => {
  const src = fs.readFileSync(__dirname + '/probe-gb-skip-dbl.cjs', 'utf8'); const m = /const pre = ([\s\S]*?);\n  const h =/.exec(src); const pre = eval(m[1]);
  const h = await L.open({ url: 'https://therealetm.github.io/lowispike/', view: 'chromium390', lang: 'en', preInit: pre }); const P = h.page;
  await P.waitForFunction(() => window.LowiStorePicks && window.LowiGiftBasket, null, { timeout: 120000 }); await L.sleep(3000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {} });
  const r = await P.evaluate(async () => { const o = {}; o.api = !!LowiGiftBasket._api; o.ready = LowiGiftBasket.serverReady(); LowiGiftBasket.open('shop'); await new Promise(r => setTimeout(r, 2500)); o.st = JSON.stringify(LowiGiftBasket._state()).slice(0, 400); const ov = document.querySelector('.gb-ov,[class*=gb-ov],#gbOv'); o.ov = ov ? ov.className : 'none'; o.txt = (document.body.innerText.match(/Basket[\s\S]{0,300}/) || [''])[0]; o.swipe = !!document.querySelector('.gb-swipe'); return o; });
  console.log(JSON.stringify(r, null, 1)); await h.browser.close(); process.exit(0);
})();
