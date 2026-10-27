'use strict';
const L = require('../interface-audit/lib.cjs');
(async () => {
  const h = await L.launch({ viewport: { width: 390, height: 844 }, locale: 'de-DE', lang: 'de' });
  await h.page.emulateMedia({ colorScheme: 'dark' });
  await L.openApp(h);
  await L.tap(h.page, '.lt-skipall'); await L.sleep(1500);
  const c = await L.controls(h.page);
  console.log(JSON.stringify(c.filter(x=>!x.covered).map(x => [x.name, x.tag + (x.id ? '#' + x.id : '') + '.' + x.cls, x.x + ',' + x.y, x.w + 'x' + x.h])));
  console.log(JSON.stringify(await h.page.evaluate(()=>[...document.querySelectorAll('[data-orbit]')].map(e=>[e.getAttribute('data-orbit'),e.innerText.slice(0,30),e.getAttribute('aria-label')]))));
  console.log(JSON.stringify(await L.top(h.page)));
  console.log('ERR', JSON.stringify(h.errors.slice(0,5)));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
