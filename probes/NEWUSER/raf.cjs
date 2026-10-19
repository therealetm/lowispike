'use strict';
// Does rAF run on Home? args: view fixture(1/0)
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
L.VIEWS.iphone13lite = ['webkit', Object.assign({}, L.pw.devices['iPhone 13'], { deviceScaleFactor: 1 })];
(async () => {
  const h = await L.open({ url: 'http://127.0.0.1:8811/', view: process.argv[2] || 'iphone13lite', settle: 8000 });
  const t = async () => h.page.evaluate(() => new Promise(r => { let n = 0; const f = () => { n++; if (n < 10) requestAnimationFrame(f); else r('ok ' + n); }; requestAnimationFrame(f); setTimeout(() => r('stalled ' + n), 4000); }));
  console.log('home', await t()); await L.sleep(5000); console.log('home+5s', await t());
  process.exit(0);
})();
