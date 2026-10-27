'use strict';
const L = require('../interface-audit/lib.cjs');
(async () => {
  const s = L.existingSeed({ lang: 'de', state: { settings: { lang: 'de' } } }); s.kv['lowi.news.build']=s.build; s.kv['lowi.news.tourbuild']=s.build; s.kv['lowi.tutorial.v1']=JSON.stringify({v:999,done:true});
  const h = await L.launch({ viewport: { width: 390, height: 844 }, locale: 'de-DE', seed: s });
  await L.openApp(h, { settle: 4500 });
  const info = () => h.page.evaluate(() => ({ cls: document.documentElement.className, tabs: [...document.querySelectorAll('[id^="tab-"]')].map(t => t.id + ':' + t.className + ':' + getComputedStyle(t).display), top: (()=>{const e=document.elementFromPoint(195,400); const a=[]; let x=e; while(x&&a.length<8){a.push(x.tagName+'#'+x.id+'.'+String(x.className).slice(0,30)+' '+getComputedStyle(x).position);x=x.parentElement;} return a;})() }));
  for (const sel of ['[data-orbit="settings"]', '#spBubble', '[data-orbit="sleep"]', '[data-orbit="move"]', '[data-orbit="fuel"]']) {
    await h.page.evaluate(()=>goTab('home')); await L.sleep(1500);
    await L.tap(h.page, sel); await L.sleep(2000);
    console.log(sel, JSON.stringify(await info()));
    await h.page.keyboard.press('Escape'); await L.sleep(800);
  }
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
