'use strict';
// After the gate 'save' tap, watch request traffic + whether the server answers.
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs'); const http = require('http');
(async () => {
  const url = 'http://127.0.0.1:8811/';
  const h = await L.open({ url, view: process.argv[2] || 'chromium390', noFixture: true, settle: 4000 });
  global.h = h; const page = h.page;
  const b = require('fs').readFileSync('/home/sprite/NEWUSER/snapfn.js', 'utf8'); await new Function('page','ctx','h','L','return (async()=>{' + b + '})()')(page, h.ctx, h, L);
  const reqs = []; page.on('request', q => reqs.push(Date.now() + ' ' + q.method() + ' ' + q.url().slice(0, 100)));
  const fin = {}; page.on('requestfinished', q => { fin[q.url()] = 1; }); page.on('requestfailed', q => { fin[q.url()] = 'F'; });
  for (const t of ['text=Say hi', 'text=Got it', 'text=Next']) { await C(t); await L.sleep(1600); }
  await page.fill('#hsYou', 'Ana'); await C('text=Nice to meet you'); await L.sleep(2500);
  console.log('before save reqs', reqs.length); const n0 = reqs.length;
  await C('button.r2-btn.pri'); await L.sleep(6000);
  console.log('after save reqs', reqs.length - n0); console.log(reqs.slice(n0, n0 + 30).join('\n'));
  console.log('pending', reqs.filter(r => !fin[r.split(' ').slice(2).join(' ')]).length);
  const t0 = Date.now(); await new Promise(r => http.get(url + 'version.json', res => { res.resume(); res.on('end', r); }).on('error', e => { console.log('srv err', e.message); r(); })); console.log('server answers in', Date.now() - t0, 'ms');
  const r = await Promise.race([page.evaluate(() => location.href + ' ' + document.readyState), new Promise(r => setTimeout(() => r('EVAL TIMEOUT'), 4000))]); console.log(r);
  await page.evaluate(() => { setInterval(() => { window.__beat = Date.now(); }, 100); });
  let cdp = await h.ctx.newCDPSession(page); await cdp.send('Debugger.enable');
  for (let i = 0; i < 40; i++) { await L.sleep(1000); const r2 = await Promise.race([page.evaluate(() => Date.now() - window.__beat), new Promise(r => setTimeout(() => r('TIMEOUT'), 2500))]); console.log(i, r2); if (r2 === 'TIMEOUT') { const p = new Promise(res => cdp.once('Debugger.paused', res)); await cdp.send('Debugger.pause'); const ev = await Promise.race([p, new Promise(r => setTimeout(() => r(null), 5000))]); console.log(ev ? ev.callFrames.slice(0, 15).map(f => f.functionName + ' @' + (f.location.lineNumber + 1) + ':' + f.location.columnNumber + ' ' + (f.url || '').split('/').pop()).join('\n') : 'no pause'); break; } }
  process.exit(0);
})();
