'use strict';
// Persistent Playwright driver: POST JS body to http://127.0.0.1:PORT/ ; evaluated as async fn with (page,ctx,h,L) in scope.
const http = require('http'), path = require('path');
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
const ROOT = process.argv[2] || '/home/sprite/wt-newuser', VIEW = process.argv[3] || 'iphone13', PORT = +(process.argv[4] || 9301), LANG = process.argv[5] || '';
L.VIEWS.iphone13lite = ['webkit', Object.assign({}, L.pw.devices['iPhone 13'], { deviceScaleFactor: 1 })];
L.VIEWS.ipadLlite = ['webkit', Object.assign({}, L.VIEWS.ipadL[1], { deviceScaleFactor: 1 })];
L.VIEWS.se = ['webkit', Object.assign({}, L.pw.devices['iPhone SE'], { deviceScaleFactor: 1 })];
(async () => {
  let url = process.env.URL;
  if (!url) url = 'http://127.0.0.1:8811/';
  const STUB = `try{ const fake={speaking:false,pending:false,paused:false,speak(u){ setTimeout(()=>{ try{u.onstart&&u.onstart({}); u.dispatchEvent&&u.dispatchEvent(new Event('start'));}catch(e){} setTimeout(()=>{ try{u.onend&&u.onend({}); u.dispatchEvent&&u.dispatchEvent(new Event('end'));}catch(e){} }, 400); },10); },cancel(){},pause(){},resume(){},getVoices(){return []},addEventListener(){},removeEventListener(){},onvoiceschanged:null}; Object.defineProperty(window,'speechSynthesis',{value:fake,configurable:true}); window.__ttsStub=1; }catch(e){}`;
  const pre0 = LANG ? `try{ if(!localStorage.getItem('__seeded')){localStorage.setItem('__seeded','1');} }catch(e){}` : '';
  const h = await L.open({ url, view: VIEW, noFixture: true, settle: 4000, preInit: STUB + pre0 });
  h.url = url;
  global.h = h;
  const page = h.page, ctx = h.ctx;
  http.createServer((q, res) => { let b = ''; q.on('data', d => b += d); q.on('end', async () => {
    try { const fn = new Function('page', 'ctx', 'h', 'L', 'return (async()=>{' + b + '})()'); const r = await fn(h.page, ctx, h, L); res.end(typeof r === 'string' ? r : JSON.stringify(r, null, 1)); }
    catch (e) { res.end('ERR ' + (e.stack || e).toString().slice(0, 1500)); } }); }).listen(PORT, '127.0.0.1', () => console.log('ready', url, PORT));
})();
