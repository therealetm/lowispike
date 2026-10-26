const pw = require('/tmp/pw/node_modules/playwright');
const S = require('/home/sprite/BOTS/sb.cjs'), fs = require('fs');
const view = process.argv[2] || 'iphone13', URL0 = 'https://therealetm.github.io/lowispike/';
(async () => {
  const crypto = require('crypto'); const seed = fs.readFileSync(require('os').homedir() + '/.config/lowispike-crowd/seed', 'utf8').trim(); const I = +(process.env.VIEW_AS || 5);
  const a = await (await fetch(S.URL + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: S.KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'crowd' + String(I).padStart(3, '0') + '@crowd.lowispike.invalid', password: 'C!' + crypto.createHmac('sha256', seed).update('pw:' + I).digest('base64url').slice(0, 28) }) })).json(); if (!a.access_token) throw new Error(JSON.stringify(a));
  const sess = { access_token: a.access_token, refresh_token: a.refresh_token, token_type: 'bearer', expires_in: a.expires_in, expires_at: Math.floor(Date.now() / 1000) + a.expires_in, user: a.user };
  const dev = view === 'ipad' ? pw.devices['iPad (gen 7)'] : pw.devices['iPhone 13'];
  const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
  const blocked = [];
  await ctx.route('**/*', rt => { const q = rt.request(), u = new URL(q.url());
    if (u.host.endsWith('supabase.co')) { if (q.method() === 'GET' || q.method() === 'HEAD' || q.method() === 'OPTIONS' || u.pathname.startsWith('/auth/v1/token') || u.pathname.startsWith('/realtime')) return rt.continue(); blocked.push(q.method() + ' ' + u.pathname); return rt.abort(); }
    return rt.continue(); });
  await ctx.addInitScript(`try{const d=new Date(),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');localStorage.setItem('lowi.daily.seen',k);sessionStorage.setItem('lowi.a2hs.x','1');localStorage.setItem('lowi.gate','done');localStorage.setItem('lowi.news.seen','99999');localStorage.setItem('lowispike.claimprompt.v1','{"at":1}');
  if(!localStorage.getItem('lowi.auth'))localStorage.setItem('lowi.auth',${JSON.stringify(JSON.stringify(sess))});
  if(!localStorage.getItem('lowispike.v2'))localStorage.setItem('lowispike.v2',JSON.stringify({v:2,setupDone:true,onboarded:true,user:{name:'Viewer',bday:'1990-01-01'},xp:900,ledger:[],logs:[],settings:{lang:'en'}}));}catch(e){}`);
  const page = await ctx.newPage(); const errs = [];
  page.on('response', rs => { if (rs.status() >= 400) errs.push('HTTP ' + rs.status() + ' ' + rs.url().slice(0, 140)); }); page.on('requestfailed', rq => errs.push('FAIL ' + rq.url().slice(0, 140)));
  page.on('pageerror', e => errs.push(e.message.slice(0, 200))); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  const t0 = Date.now(); await page.goto(URL0 + '?t=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
  await page.waitForTimeout(4000);
  await page.evaluate(() => goTab('foryou')); await page.waitForTimeout(6000);
  await page.screenshot({ path: view + '-community.png' });
  const comm = await page.evaluate(() => ({ text: document.body.innerText.slice(0, 600), heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null }));
  // open chat
  const t1 = Date.now(); let opened = false; try { await page.evaluate(() => cmSeg('chat')); opened = true; } catch (e) {}
  await page.waitForTimeout(5000);
  await page.screenshot({ path: view + '-chat.png' });
  const chat = await page.evaluate(() => { const imgs = [...document.querySelectorAll('img')].filter(i => /storage\/v1\/object\/public\/media/.test(i.src)); return { msgs: document.querySelectorAll('[data-mid],[data-id].msg,.cc-msg,.chat-msg').length, photoImgs: imgs.length, photoLoaded: imgs.filter(i => i.complete && i.naturalWidth > 0).length, header: (document.querySelector('[class*=room] h1,[class*=room] h2,header')||{}).innerText, txt: document.body.innerText.slice(-900) }; });
  const fps = await page.evaluate(() => new Promise(res => { let n = 0; const s = performance.now(); const f = () => { n++; if (performance.now() - s < 3000) requestAnimationFrame(f); else res(Math.round(n / 3)); }; requestAnimationFrame(f); }));
  console.log(JSON.stringify({ view, loadMs: t1 - t0, chatOpened: opened, comm, chat, fps, errs: [...new Set(errs.filter(e => !/^console/.test(e)))].slice(0, 25), blocked: [...new Set(blocked)].slice(0, 10) }, null, 1));
  await browser.close();
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
