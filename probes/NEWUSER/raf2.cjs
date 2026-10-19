'use strict';
// New account, no reload: auth preset, walk setup to Home, check rAF at each stage.
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs'); const fs = require('fs');
L.VIEWS.iphone13lite = ['webkit', Object.assign({}, L.pw.devices['iPhone 13'], { deviceScaleFactor: 1 })];
(async () => {
  const STUB = eval(fs.readFileSync('/home/sprite/NEWUSER/drv.cjs', 'utf8').match(/const STUB = (`[^`]*`)/)[1]);
  const AUTH = `try{ if(!localStorage.getItem('lowi.auth')){ localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-0000000000aa', email: 'newuser@example.invalid' } })); localStorage.setItem('lowi.gate','done'); localStorage.setItem('lowi.name','Ana'); sessionStorage.setItem('lowi.a2hs.x','1'); } }catch(e){}`;
  const h = await L.open({ url: 'http://127.0.0.1:8811/', view: process.argv[2] || 'iphone13lite', noFixture: true, settle: 7000, preInit: STUB + AUTH });
  global.h = h; const b = fs.readFileSync('/home/sprite/NEWUSER/snapfn.js', 'utf8'); await new Function('page','ctx','h','L','return (async()=>{' + b + '})()')(h.page, h.ctx, h, L);
  const t = async (tag) => console.log(tag, await h.page.evaluate(() => new Promise(r => { let n = 0; const f = () => { n++; if (n < 10) requestAnimationFrame(f); else r('ok ' + n); }; requestAnimationFrame(f); setTimeout(() => r('stalled ' + n), 4000); })));
  await t('setup-bday');
  await h.page.fill('#r2obB', '1994-05-12'); await h.page.dispatchEvent('#r2obB', 'change'); await L.sleep(500); await C('text=Next'); await L.sleep(2500); await t('reveal');
  await C('button.lc-cta'); await L.sleep(2000); await t('photo');
  await C('text=Use my initial'); await L.sleep(1500); await t('goals');
  await C('text=A woman'); await C('text=More energy'); await C('text=None of these'); await C('text=Next'); await L.sleep(2000); await t('shop');
  await C('text=Later'); await L.sleep(1000); await t('home+1s'); await L.sleep(4000); await t('home+5s');
  console.log(await h.page.evaluate(() => [...document.querySelectorAll('.r2-ov,.dr-ov')].map(e => e.className).join(' | ')));
  process.exit(0);
})();
