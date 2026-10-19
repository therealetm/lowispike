'use strict';
// Repro: birth companion (reveal look) vs Home Misty vs Forms sheet. node repro.cjs ROOT VIEW BDAY OUTPREFIX
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
const fs = require('fs');
const ROOT = process.argv[2] || '/home/sprite/wt-companion-match', VIEW = process.argv[3] || 'iphone13', BDAY = process.argv[4] || '1997-10-14', OUT = process.argv[5] || '/home/sprite/CMATCH/shots/a';
fs.mkdirSync(require('path').dirname(OUT), { recursive: true });
(async () => {
  let srv, url = process.env.URL;
  if (!url) { srv = await L.serve(ROOT); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const STUB = `try{ const fake={speaking:false,pending:false,paused:false,speak(u){ setTimeout(()=>{ try{u.onend&&u.onend({});}catch(e){} }, 300); },cancel(){},pause(){},resume(){},getVoices(){return []},addEventListener(){},removeEventListener(){}}; Object.defineProperty(window,'speechSynthesis',{value:fake,configurable:true}); }catch(e){}`;
  const SEED = `try{ if(!localStorage.getItem('__cm')){ localStorage.setItem('__cm','1'); localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Tester', bday: '${BDAY}' }, xp: 40, ledger: [], logs: [], settings: { lang: 'de' } })); localStorage.setItem('lowispike.lang','de'); } }catch(e){}`;
  const h = await L.open({ url, view: VIEW, preInit: STUB + SEED, settle: 6000 });
  const p = h.page;
  // what the reveal would give this birthday, saved the same way the reveal saves it, with a picked name
  const rec = await p.evaluate((bday) => { const B = window.LowiBirthCompanion; const c = B.core.generate({ bday, btime: '' }); c.name = c.names ? c.names[1] || c.name : c.name; B.save(c); return B.get(); }, BDAY);
  await p.reload({ waitUntil: 'load' }); await L.sleep(7000);
  const info = await p.evaluate(() => {
    const B = window.LowiBirthCompanion, c = B.get();
    const home = document.querySelector('#spBubble svg.tmg-plant');
    const T = window.LowiHerbTamagotchi, cur = T && T.current && T.current();
    return { has: B.has(), name: c && c.name, sign: c && c.sign, palette: c && c.palette, look: c && c.look,
      homeCls: home && home.getAttribute('class'), homeStyle: home && home.getAttribute('style'), homeOwn: !!document.querySelector('#spBubble svg.cw-own-cell'), homeShape: (document.querySelector('#spBubble .cw-own-body .lc-shape')||{getAttribute:()=>null}).getAttribute('d'), revShape: (new DOMParser().parseFromString(B.svg(),'image/svg+xml').querySelector('.lc-shape')||{getAttribute:()=>null}).getAttribute('d'),
      herbPal: cur && cur.m && cur.m.profile && cur.m.profile.palette, title: (document.querySelector('.wh-name, .sp-name, #spName') || {}).textContent };
  });
  // show the reveal art next to Home for a screenshot
  await p.evaluate(() => { const d = document.createElement('div'); d.id = '__rev'; d.style.cssText = 'position:fixed;left:0;top:0;width:150px;height:150px;z-index:2147483647;background:#0b1d3f'; d.innerHTML = window.LowiBirthCompanion.svg(); document.body.appendChild(d); });
  await p.screenshot({ path: OUT + '-home.png' });
  await p.evaluate(() => { document.getElementById('__rev').remove(); window.LowiCompanion && LowiCompanion.open(); });
  await L.sleep(1500);
  const sheet = await p.evaluate(() => { const s = document.querySelector('.cf-panel'); return s ? { title: (s.querySelector('h2') || {}).textContent, own: s.querySelectorAll('svg.cw-own-cell').length, forms: s.querySelectorAll('.cf-step').length } : null; });
  await p.screenshot({ path: OUT + '-forms.png' });
  console.log(JSON.stringify({ rec: { name: rec && rec.name, sign: rec && rec.sign }, info, sheet, errs: h.log.pageerror.slice(0, 5) }, null, 1));
  await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(1); });
