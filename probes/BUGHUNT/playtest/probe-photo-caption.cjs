'use strict';
/* Bug hunt run 20: Community photo with a caption, then keep typing while it uploads.
   LIVE site (or argv[3]) signed in as crowd member 29. Writes are blocked: the storage upload is answered by the probe after
   a delay (nothing stored), the message insert and every other Supabase write is aborted, realtime broadcast/presence dropped.
   So nothing is posted to the room. Usage: node probe-photo-caption.cjs <chromium390|iphone13> [url] */
const fs = require('fs'), path = require('path');
const pw = require('/tmp/pw/node_modules/playwright');
const view = process.argv[2] || 'chromium390', URL0 = process.argv[3] || 'https://therealetm.github.io/lowispike/';
const sess = JSON.parse(fs.readFileSync('/tmp/s29.json', 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const INIT = `try{const d=new Date(),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
localStorage.setItem('lowi.daily.seen',k);sessionStorage.setItem('lowi.a2hs.x','1');localStorage.setItem('lowi.gate','done');localStorage.setItem('lowi.news.seen','99999');
if(!localStorage.getItem('lowi.auth'))localStorage.setItem('lowi.auth',${JSON.stringify(JSON.stringify(sess))});
localStorage.setItem('lowispike.claimprompt.v1','{"at":1,"from":"probe"}');localStorage.setItem('lowispike.tutorial.v1','{"done":1}');
if(!localStorage.getItem('lowispike.v2'))localStorage.setItem('lowispike.v2',JSON.stringify({v:2,setupDone:true,onboarded:true,user:{name:'Serainaq87',bday:'1990-01-01'},xp:900,ledger:[],logs:[],settings:{lang:'en'}}));}catch(e){}
(()=>{const S=WebSocket.prototype.send;WebSocket.prototype.send=function(d){try{const m=JSON.parse(d),ev=Array.isArray(m)?m[3]:m.event;if(ev==='broadcast'||ev==='presence'){return;}}catch(e){}return S.call(this,d);};})();
window.__bh={err:[],rej:[]};addEventListener('error',e=>window.__bh.err.push(String(e.message).slice(0,200)));addEventListener('unhandledrejection',e=>window.__bh.rej.push(String(e.reason&&(e.reason.message||e.reason)).slice(0,200)));`;
(async () => {
  const eng = view === 'iphone13' ? 'webkit' : 'chromium';
  const browser = await pw[eng].launch();
  const dev = view === 'iphone13' ? pw.devices['iPhone 13'] : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
  const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
  const blocked = [], uploads = [];
  await ctx.route('**/*', async r => {
    const q = r.request(), u = new URL(q.url());
    if (q.method() === 'GET' || q.method() === 'HEAD' || q.method() === 'OPTIONS' || !u.host.endsWith('supabase.co') || u.pathname.startsWith('/auth/v1/token')) return r.continue();
    if (u.pathname.startsWith('/storage/v1/object/media/')) { uploads.push(u.pathname); await sleep(5000); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: u.pathname.replace('/storage/v1/object/', ''), Id: 'probe' }) }); }
    blocked.push(q.method() + ' ' + u.pathname); return r.abort();
  });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
  await page.goto(URL0 + '?pc=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
  await sleep(6000);
  await page.evaluate(() => window.goTab('foryou')); await sleep(1500);
  await page.evaluate(() => window.cmSeg && window.cmSeg('chat')); await sleep(5000);
  const opener = await page.evaluate(() => { const b = document.querySelector('[data-chat="thread"],[data-chat="history"]'); if (b) { b.click(); return b.dataset.chat; } return null; });
  await sleep(1500);
  const build = await page.evaluate(() => (window.LOWI_BUILD || (document.querySelector('meta[name="lowi-build"]') || {}).content || ''));
  const st = () => page.evaluate(() => { const i = document.getElementById('cmInput'), n = document.getElementById('csNotice'), ph = document.getElementById('csPhoto'); return { input: i ? i.value : null, notice: n ? n.textContent.trim().slice(0, 80) : '', photo: !!(ph && ph.querySelector('img')), sendDisabled: !!(document.getElementById('cmSend') || {}).disabled }; });
  console.log('build', build, 'opener', opener, JSON.stringify(await st()));
  console.log('vis', JSON.stringify(await page.evaluate(() => ['cmInput','cmSend','cmPhoto','cmList','cmPaneChat'].map(id => { const e = document.getElementById(id); if (!e) return id + ':none'; const r = e.getBoundingClientRect(); return id + ':' + Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + getComputedStyle(e).visibility; }))));
  await page.screenshot({ path: __dirname + '/out/pc-open-' + view + '.png' });
  
  const run = async (name, caption, extra, clearFirst) => {
    await page.waitForFunction(() => !/Sending/.test((document.getElementById('csNotice') || {}).textContent || ''), null, { timeout: 20000 }).catch(() => { });
    await page.evaluate(() => { const f = document.getElementById('cmPhotoFile'); try { f.value = ''; } catch (e) { } });
    await page.setInputFiles('#cmPhotoFile', path.join(__dirname, 'lunch.jpg'));
    await page.waitForFunction(() => { const p = document.getElementById('csPhoto'); return p && p.querySelector('img'); }, null, { timeout: 15000 }).catch(() => { });
    const typeIn = (v) => page.evaluate(v => { const i = document.getElementById('cmInput'); i.focus(); i.value = v; i.dispatchEvent(new InputEvent('input', { bubbles: true, data: v, inputType: 'insertText' })); return [i.value, document.activeElement && document.activeElement.id, getComputedStyle(i).display, i.offsetWidth]; }, v);
    console.log(name, 'typeIn', JSON.stringify(await typeIn(caption)));
    await sleep(300);
    console.log(name, 'filled', JSON.stringify(await st()));
    await page.evaluate(() => document.getElementById('cmSend').click());
    await sleep(900);
    const during = await st();
    const cur = await page.evaluate(() => document.getElementById('cmInput').value);
    await typeIn(clearFirst ? extra : cur + extra);
    const typed = await st();
    await sleep(7000);
    const after = await st();
    const draft = await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (/draft|chat/i.test(k) && /text/.test(localStorage.getItem(k) || '')) { try { const v = JSON.parse(localStorage.getItem(k)); if (v && v.draft) return v.draft.text; } catch (e) { } } return null; });
    console.log(name, JSON.stringify({ during, typed, after, storedDraft: draft }));
    await typeIn(''); await sleep(400);
    return after;
  };
  // A: caption, then the user clears it and types the next message during the upload
  const a = await run('A-clear-and-type', 'Lunch today', 'Is the soup any good?', true);
  // B: caption, then the user keeps typing after it during the upload
  const b = await run('B-append', 'Lunch today', ' and a question about the soup', false);
  const okA = a.input === 'Is the soup any good?', okB = b.input === 'and a question about the soup';
  const bh = await page.evaluate(() => window.__bh);
  console.log('RESULT', JSON.stringify({ view, build, A_keepsNewText: okA, B_keepsNewText: okB, uploads: uploads.length, blocked: [...new Set(blocked)].slice(0, 6), pageErrors: errs, bh }));
  await browser.close();
})().catch(e => { console.log('PROBE FAIL', e.message); process.exit(1); });
