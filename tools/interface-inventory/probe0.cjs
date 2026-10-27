'use strict';
const L = require('../interface-audit/lib.cjs');
(async () => {
  const h = await L.launch({ viewport: { width: 390, height: 844 }, locale: 'de-DE', lang: 'de' });
  await h.ctx.emulateMedia ? null : null;
  await h.page.emulateMedia({ colorScheme: 'dark' });
  await L.openApp(h);
  await h.page.screenshot({ path: '/tmp/inv-home.png' });
  const c = await L.controls(h.page);
  console.log(JSON.stringify(c.filter(x=>!x.covered).map(x => [x.name, x.tag + (x.id ? '#' + x.id : '') + '.' + x.cls, x.x + ',' + x.y, x.w + 'x' + x.h])));
  console.log(JSON.stringify(await L.top(h.page)));
  console.log('ERR', JSON.stringify(h.errors.slice(0,5)));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
