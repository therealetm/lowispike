'use strict';
/* Live check for "care is free": a local guest with two friends and an old spent counter, writes to Supabase blocked.
   Opens the care sheet (same call the Community profile "Send energy" and friends tree use) and the Friends tab, taps
   Send for real many times. Usage: node free-care-probe.cjs <iphone13|chromium390> [lang] */
const pw = require('/tmp/pw/node_modules/playwright');
const view = process.argv[2] || 'iphone13', lang = process.argv[3] || 'en', URL0 = 'https://therealetm.github.io/lowispike/';
const sess = JSON.parse(require('fs').readFileSync(__dirname + '/crowdshoot/s29.json', 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const eng = view === 'iphone13' ? 'webkit' : 'chromium';
  const browser = await pw[eng].launch();
  const dev = view === 'iphone13' ? pw.devices['iPhone 13'] : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
  const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
  let blocked = 0;
  await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (q.method() !== 'GET' && q.method() !== 'HEAD' && q.method() !== 'OPTIONS' && u.host.endsWith('supabase.co') && !u.pathname.startsWith('/auth/')) { blocked++; return r.abort(); } return r.continue(); });
  await ctx.addInitScript(`try{if(!localStorage.getItem('lowi.auth'))localStorage.setItem('lowi.auth',${JSON.stringify(JSON.stringify(sess))});const d=new Date(),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    localStorage.setItem('lowi.daily.seen',k);sessionStorage.setItem('lowi.a2hs.x','1');localStorage.setItem('lowi.gate','done');localStorage.setItem('lowi.news.seen','99999');
    localStorage.setItem('lowispike.claimprompt.v1','{"at":1,"from":"probe"}');localStorage.setItem('lowispike.tutorial.v1','{"done":1}');localStorage.setItem('lowispike.friends.v1',JSON.stringify({list:[{uid:'probeFriendLena',n:'Lena',since:1},{uid:'probeFriendJonas',n:'Jonas',since:1}]}));
    if(!localStorage.getItem('lowispike.v2'))localStorage.setItem('lowispike.v2',JSON.stringify({v:2,setupDone:true,onboarded:true,user:{name:'Probe',bday:'1990-01-01'},xp:900,ledger:[],logs:[],settings:{lang:'${lang}'},
      friends:{list:[{uid:'probeFriendLena',n:'Lena'},{uid:'probeFriendJonas',n:'Jonas'}]},care:{sent:{},spent:{[k]:99},out:[],seen:{},inbox:{}}}));}catch(e){}`);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
  await page.goto(URL0 + '?fc=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.LowiMicroBook && window.LowiMicroCore, null, { timeout: 90000 });
  await sleep(5000);
  if (lang !== 'en') { await page.evaluate(l => window.LowiLang.set(l), lang); await sleep(2500); }
  const info = await page.evaluate(() => ({ build: (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || '', sparksApi: 'sparks' in window.LowiMicroBook, coreSparks: 'sparks' in window.LowiMicroCore, costs: window.LowiMicroCore.CARE.map(k => k.cost), friends: window.LowiMicroBook.friends().length, lang: window.LowiLang && window.LowiLang.get() }));
  console.log('info', JSON.stringify(info));
  const dbg = () => page.evaluate(() => { const e = document.elementFromPoint(195, 600); const chain = []; for (let n = e; n && chain.length < 6; n = n.parentElement) chain.push(n.tagName + '.' + String(n.className).slice(0, 40) + '#' + n.id); return { html: document.documentElement.className.slice(0, 200), body: document.body.className.slice(0, 200), at: chain }; });
  console.log('gate-btns', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#r2gate button, #r2gate [role=button], #r2gate a')].map(b => (b.dataset ? JSON.stringify(b.dataset) : '') + ' ' + b.textContent.trim().slice(0, 40)))));
  const SP = /spark|Funken|chispa/i;
  const sheetText = () => page.evaluate(() => { const o = window.__ov; const root = o && o.nodeType ? o : (o && o.el) || null; return { ret: o === true ? 'true' : typeof o, conn: !!(root && root.isConnected), text: root ? root.textContent.slice(0, 1500) : '', vis: root ? (() => { const c = getComputedStyle(root), r = root.getBoundingClientRect(); return c.display + '/' + c.visibility + '/' + c.opacity + '/' + Math.round(r.width) + 'x' + Math.round(r.height) + '/' + root.className; })() : '', sends: document.querySelectorAll('[data-mb="send"]').length, sparkEls: document.querySelectorAll('.mb-sparks, .mb-spk').length }; });
  // Friends tab of the Adventure log
  await page.evaluate(() => (window.__ov = window.LowiMicroBook.open('fr'))); await sleep(1500);
  let t = await sheetText(); console.log('friends-tab', JSON.stringify({ vis: t.vis, ret: t.ret, conn: t.conn, sends: t.sends, sparkWords: SP.test(t.text), sparkEls: t.sparkEls, text: t.text.replace(/\s+/g, ' ').slice(0, 400) }));
  console.log('dbg-fr', JSON.stringify(await dbg()));
  await page.screenshot({ path: '/home/sprite/BUGHUNT/free-care-' + view + '-' + lang + '-friends.png' });
  await page.evaluate(() => window.LowiR2 && window.LowiR2.close && window.LowiR2.close()); await sleep(800);
  let sent = 0;
  for (const uid of ['probeFriendLena', 'probeFriendJonas']) {
    for (let i = 0; i < 6; i++) {
      await page.evaluate(u => (window.__ov = window.LowiMicroBook.openCare(u)), uid); await sleep(900);
      if (sent === 0) { t = await sheetText(); console.log('care-sheet', JSON.stringify({ vis: t.vis, ret: t.ret, conn: t.conn, sends: t.sends, sparkWords: SP.test(t.text), sparkEls: t.sparkEls, text: t.text.replace(/\s+/g, ' ').slice(0, 500) })); await page.screenshot({ path: '/home/sprite/BUGHUNT/free-care-' + view + '-' + lang + '-sheet.png' }); }
      const btn = page.locator('[data-mb="send"]:visible').first();
      if (!(await btn.count())) break;
      await btn.tap().catch(async () => btn.click());
      sent++; await sleep(900);
      await page.evaluate(() => window.LowiR2 && window.LowiR2.close && window.LowiR2.close()); await sleep(500);
    }
  }
  const st = await page.evaluate(() => { const s = window.LowiVitalsBridge.state(); return { sent: Object.keys(s.care.sent || {}).length, out: (s.care.out || []).length, spentKey: 'spent' in s.care, ledger: (s.ledger || []).length, xp: s.xp }; });
  console.log('after-sends', JSON.stringify({ tapped: sent, state: st, blockedWrites: blocked, pageErrors: errs }));
  await browser.close();
})().catch(e => { console.log('PROBE FAIL', e.message); process.exit(1); });
