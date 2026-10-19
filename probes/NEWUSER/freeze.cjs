'use strict';
// Walk onboarding in Chromium with heartbeat checks after each step; on a freeze, pause via CDP and print the JS stack.
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs'); const fs = require('fs');
(async () => {
  const url = 'http://127.0.0.1:8811/';
  const STUB = fs.readFileSync('/home/sprite/NEWUSER/drv.cjs', 'utf8').match(/const STUB = (`[^`]*`)/)[1];
  const h = await L.open({ url, view: process.argv[2] || 'chromium390', noFixture: true, settle: 4000, preInit: process.env.NOSTUB ? '' : eval(STUB) });
  global.h = h; let page = h.page;
  const b = fs.readFileSync('/home/sprite/NEWUSER/snapfn.js', 'utf8'); await new Function('page','ctx','h','L','return (async()=>{' + b + '})()')(page, h.ctx, h, L);
  let cdp = null; const cdpOn = async () => { try { cdp = await h.ctx.newCDPSession(h.page); await cdp.send('Debugger.enable'); } catch (e) { console.log('no cdp'); } }; await cdpOn();
  const beat = async () => { await h.page.evaluate(() => { if (!window.__hb) { window.__hb = 1; setInterval(() => { window.__beat = Date.now(); }, 100); } }).catch(() => {}); };
  const check = async (tag, n) => { for (let i = 0; i < (n || 6); i++) { await L.sleep(500); const r = await Promise.race([h.page.evaluate(() => Date.now() - (window.__beat || 0)), new Promise(r => setTimeout(() => r('TIMEOUT'), 3000))]).catch(e => 'ERR ' + e.message.slice(0, 80)); if (r === 'TIMEOUT') { console.log('FROZE after', tag);
        if (cdp) { const p = new Promise(res => cdp.once('Debugger.paused', res)); await cdp.send('Debugger.pause'); const ev = await Promise.race([p, new Promise(r => setTimeout(() => r(null), 5000))]); if (ev) console.log(ev.callFrames.slice(0, 20).map(f => f.functionName + ' @' + (f.location.lineNumber + 1) + ':' + f.location.columnNumber + ' ' + (f.url || '').split('/').pop()).join('\n')); else console.log('no pause'); }
        process.exit(0); } } console.log('ok', tag); };
  const step = async (tag, f) => { await beat(); await f(); await check(tag); };
  await step('sayhi', () => C('text=Say hi')); await step('gotit', () => C('text=Got it')); await step('next', () => C('text=Next'));
  await h.page.fill('#hsYou', 'Ana'); await step('name', () => C('text=Nice to meet you'));
  await step('save', () => C('button.r2-btn.pri'));
  await h.page.evaluate(() => { localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-0000000000aa', email: 'newuser@example.invalid' } })); localStorage.setItem('lowi.gate', 'done'); sessionStorage.setItem('lowi.a2hs.x', '1'); });
  const p2 = await h.ctx.newPage(); h.page.close().catch(() => {}); h.page = p2; await p2.goto(url, { waitUntil: 'load', timeout: 60000 }); await cdpOn(); await L.sleep(7000); await beat(); await check('reload');
  await h.page.fill('#r2obB', '1994-05-12'); await h.page.dispatchEvent('#r2obB', 'change');
  await step('bday', () => C('text=Next')); await L.sleep(1500); await step('reveal', () => C('button.lc-cta'));
  await step('initial', () => C('text=Use my initial'));
  await C('text=A woman'); await C('text=More energy'); await C('text=None of these'); await h.page.evaluate(() => document.querySelector('.r2-sh').scrollTop = 999); await L.sleep(300);
  await step('goals-next', () => C('text=Next'));
  console.log((await S('fz-step3')).text.slice(-700)); process.exit(0);
})();
