/* Run 43 (P-ROW-SHIFT / SWAP-UNDER-FINGER in Shop > Give a hand swipe deck):
   S: double tap Skip (x): the next basket's Skip is drawn on the same spot -> 2nd tap skips a 2nd basket? Undo only brings back the last.
   Y: double tap Pay: the card shows the pay link -> 2nd tap on the disabled Pay = harmless (control)
   Fake data only: made-up baskets via LowiGiftBasket._api, network blocked by lib.cjs. Nothing is sent or paid.
   node probe-gb-skip-dbl.cjs <url|dir> [view] [gaps]   env RM=1 ONLY=SY */
'use strict';
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'iphone13', GAPS = (process.argv[4] || '0,120,250').split(',').map(Number), ONLY = process.env.ONLY || 'SYH';
  const pre = "try{localStorage.setItem('lowi.tutorial.done','1');localStorage.setItem('lowi.storePicks.tab','gift');localStorage.setItem('lowi.giftBasket.server.v1',JSON.stringify({ok:true,at:Date.now()}));localStorage.removeItem('lowi.giftBasket.skips.v1')}catch(e){};" +
    "window.__ck=[];document.addEventListener('click',function(e){if(e.isTrusted){var b=e.target.closest&&e.target.closest('button');window.__ck.push(Math.round(e.timeStamp)+':'+(b?(b.getAttribute('data-gb')||b.className||b.tagName):(e.target.className+'').slice(0,20)))}},true);" +
    "(function(){var t=setInterval(function(){if(window.LowiGiftBasket){clearInterval(t);var now=new Date().toISOString();function B(id,name,items,total){return{id:id,user_id:'u-'+id,first_name:name,anon:false,city:'Teststadt',items:items.map(function(n){return{n:n}}),total_eur:total,pay_url:'https://ko-fi.com/lowitest'+id,created_at:now}}" +
    "var open=[B('b1','Testperson A',['Skyr','Oats'],14),B('b2','Testperson B',['Eggs','Lentils'],9),B('b3','Testperson C',['Apples','Rye bread'],7),B('b4','Testperson D',['Kefir'],5)];window.open=function(){return null};" +
    "window.LowiGiftBasket._api={uid:function(){return'me'},ready:async function(){return true},open:async function(){return open.map(function(b){return Object.assign({},b)})},mine:async function(){return[]},given:async function(){return[]},trust:async function(){return[]},help:async function(id){window.__helped=(window.__helped||[]).concat(id);return true}}}},30)})();";
  const h = await L.open({ url, view, reducedMotion: !!process.env.RM, lang: 'en', preInit: pre });
  const P = h.page; let bad = 0;
  const ready = async () => { await P.waitForFunction(() => window.LowiStorePicks && window.LowiStorePicks.open && window.LowiGiftBasket, null, { timeout: 120000 }).catch(() => {}); await L.sleep(2500);
    await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {} }); };
  await ready();
  const dbl = async (x, y, g) => { if (h.touch) { await P.touchscreen.tap(x, y); if (g) await L.sleep(g); await P.touchscreen.tap(x, y); } else { await P.mouse.click(x, y); if (g) await L.sleep(g); await P.mouse.click(x, y); } };
  const real = ck => ck.length >= 2 ? parseInt(ck[ck.length - 1]) - parseInt(ck[0]) : -1;
  const state = () => P.evaluate(() => { const c = document.querySelector('.gb-swipe'); return { top: c ? c.getAttribute('data-gb-id') : '', picked: !!(c && c.classList.contains('gb-picked')),
    skips: Object.keys(JSON.parse(localStorage.getItem('lowi.giftBasket.skips.v1') || '{}')), undo: !!document.querySelector('.gb-undo'), helped: window.__helped || [], ck: window.__ck.slice() }; });
  const openDeck = async () => {
    await P.evaluate(() => { localStorage.removeItem('lowi.giftBasket.skips.v1'); try { LowiStorePicks.open('home-bloom'); } catch (e) {} }); await L.sleep(1500);
    const tab = await L.center(h, '.stp-tab[data-stp-tab="gift"]'); if (tab) { await L.tap(h, tab.x, tab.y); await L.sleep(2200); }
    await P.evaluate(() => { const e = document.querySelector('.gb-deck-btns'); if (e) e.scrollIntoView({ block: 'center' }); }); await L.sleep(600);
  };
  for (const mode of ['S', 'Y', 'H']) { if (!ONLY.includes(mode)) continue;
    for (const g of GAPS) {
      await P.reload(); await ready(); await openDeck();
      if (mode === 'H') { const y = await L.center(h, '.gb-yes'); if (y) { await L.tap(h, y.x, y.y); await L.sleep(900); } await P.evaluate(() => { const e = document.querySelector('.gb-swipe .gb-pay'); if (e) e.scrollIntoView({ block: 'center' }); }); await L.sleep(500); }
      const sel = mode === 'S' ? '.gb-skip' : mode === 'Y' ? '.gb-yes' : '.gb-swipe .gb-pay';
      const c = await L.center(h, sel); const s0 = await state(); if (!c || s0.top !== 'b1' || (mode === 'H' && !s0.picked)) { console.log(mode + ' gap' + g + ' setup: no ' + sel + ' ' + JSON.stringify(s0)); continue; }
      await P.evaluate(() => { window.__ck.length = 0; });
      await dbl(c.x, c.y, g); await L.sleep(1400);
      const s = await state(); const r = real(s.ck);
      let fail = false, what;
      if (mode === 'S') { fail = s.skips.length > 1; what = 'skipped ' + JSON.stringify(s.skips) + ' top ' + s.top; }
      else if (mode === 'H') { fail = s.helped.length > 0; what = 'helped ' + JSON.stringify(s.helped) + ' asks ' + !!(await P.$('.gb-helped')); }
      else { fail = !s.picked || s.skips.length > 0 || s.ck.some(x => /gb-pay/.test(x)); what = 'picked ' + s.picked + ' top ' + s.top + ' skips ' + JSON.stringify(s.skips); }
      fail = fail && r >= 0 && r < 400; if (fail) bad++;
      console.log((fail ? 'FAIL' : 'ok') + ' ' + ({ S: 'Skip', Y: 'Pay', H: 'pay link' })[mode] + ' gap' + g + ' real ' + r + 'ms ' + what + ' clicks ' + JSON.stringify(s.ck));
    }
  }
  if (process.env.DELIB) { /* a deliberate 2nd Skip 700 ms later still skips the next basket */
    await P.reload(); await ready(); await openDeck(); const c = await L.center(h, '.gb-skip');
    if (c) { await L.tap(h, c.x, c.y); await L.sleep(700); await L.tap(h, c.x, c.y); await L.sleep(1200); const s = await state(); const ok = s.skips.length === 2; if (!ok) bad++; console.log((ok ? 'ok' : 'FAIL') + ' deliberate 700ms 2nd Skip skips 2: ' + JSON.stringify(s.skips) + ' clicks ' + JSON.stringify(s.ck)); }
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
