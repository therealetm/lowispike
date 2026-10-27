'use strict';
/* Linear walker for flows that go step by step (onboarding for a new user, the tutorial, the update tour).
   Each new step is recorded and screenshotted; then the forward button is tapped (Weiter, Los geht's, Next ...);
   on a choice screen the first option is picked first. Network blocked, throwaway browser. node walk.cjs <mode> */
const fs = require('fs'), path = require('path');
const L = require('../interface-audit/lib.cjs');
const MODE = process.argv[2] || 'onboard', OUT = process.env.OUT || '/home/sprite/inv-shots';
const cr = fs.readFileSync(path.join(__dirname, 'crawl.cjs'), 'utf8');
const sigFn = new Function('return ' + cr.slice(cr.indexOf('async function sig(page)'), cr.indexOf('/* tappable controls')).replace('async function sig(page)', 'async function (page)'))();
const ctrlFn = new Function('return ' + cr.slice(cr.indexOf('async function ctrls(page)'), cr.indexOf('async function doStep')).replace('async function ctrls(page)', 'async function (page)'))();
const FWD = /^(weiter|los geht\u2019s|los geht's|los|weiter \u2192|n\u00e4chster|next|fertig|starten|start|ja|okay|ok|verstanden|zeig mir|zeig's mir|ohne konto weiter|als gast|sp\u00e4ter|\u00fcberspringen|jetzt nicht|nicht jetzt|alles klar|loslegen|weiter ohne|im browser weitermachen|hab ich hinzugef\u00fcgt|weitermachen)/i;
(async () => {
  let seed;
  if (MODE === 'onboard') seed = { kv: { 'lowispike.lang': 'de' }, session: { 'lowi.a2hs.x': '1' } };
  else { seed = L.existingSeed({ lang: 'de', state: { settings: { lang: 'de' } } }); if (MODE !== 'news') { seed.kv['lowi.news.build'] = seed.build; seed.kv['lowi.news.tourbuild'] = seed.build; } }
  const h = await L.launch({ viewport: { width: 390, height: 844 }, locale: 'de-DE', seed });
  await h.page.emulateMedia({ colorScheme: 'dark' });
  await L.openApp(h, { settle: 5000, waitReady: MODE !== 'onboard' });
  if (MODE === 'tutorial') { await h.page.evaluate(() => { try { localStorage.removeItem('lowi.tutorial.v1'); LowiTutorial.start(); } catch (e) { } }); await L.sleep(2500); }
  if (MODE === 'quicktour') { await h.page.evaluate(() => { try { LowiQuickTour.open(); } catch (e) { } }); await L.sleep(2500); }
  const res = [], seen = new Set(); let stuck = 0;
  for (let i = 0; i < 70 && stuck < 3; i++) {
    const sg = await sigFn(h.page);
    const key = sg.s + '|' + sg.txt.slice(0, 80);
    if (!seen.has(key)) {
      seen.add(key); const id = MODE + '-' + String(res.length + 1).padStart(3, '0');
      await h.page.screenshot({ path: path.join(OUT, id + '.jpg'), type: 'jpeg', quality: 72 });
      res.push({ id, sig: sg.s, head: sg.head, txt: sg.txt, tab: sg.tab, key: sg.key }); stuck = 0;
      console.log(id, sg.s.slice(0, 120), '|', sg.txt.slice(0, 80));
      fs.writeFileSync(path.join(OUT, 'walk-' + MODE + '.json'), JSON.stringify(res, null, 1));
    } else stuck++;
    const cs = await ctrlFn(h.page);
    let b = cs.find(c => FWD.test(c.name) && !/\u00fcberspringen|sp\u00e4ter|nicht jetzt|jetzt nicht/i.test(c.name));
    if (stuck >= 1) { // pick an option first (chips/radios), then forward
      const opt = cs.find(c => /chip|opt|choice|pick|card/i.test(c.cls) && !FWD.test(c.name));
      if (opt) { await h.page.touchscreen.tap(opt.x, opt.y); await L.sleep(600); }
      const inp = await h.page.$('input[type=text]:visible,input:not([type]):visible');
      if (inp) { try { await inp.fill('Emma'); } catch (e) { } }
      const date = await h.page.$('input[type=date]:visible'); if (date) { try { await date.fill('1994-02-27'); } catch (e) { } }
      const cs2 = await ctrlFn(h.page); b = cs2.find(c => FWD.test(c.name) && !/\u00fcberspringen/i.test(c.name)) || cs2.find(c => /\u00fcberspringen|sp\u00e4ter|nicht jetzt|jetzt nicht/i.test(c.name));
    }
    if (!b) { console.log('no forward button:', cs.map(c => c.name).join(' | ').slice(0, 400)); stuck++; await L.sleep(800); continue; }
    await h.page.touchscreen.tap(b.x, b.y); await L.sleep(1600);
  }
  console.log('END', res.length);
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
