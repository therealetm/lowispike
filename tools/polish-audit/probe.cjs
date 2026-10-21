'use strict';
/* Polish audit probe: open the signed-in app, run a JS snippet (argv[2], evaluated as an async function body with h, L, page),
   print its result. For quick DOM questions during the audit. Not a physical device. */
const L = require('../interface-audit/lib.cjs');
(async () => {
  const dev = process.env.DEV || 'iPhone 13';
  const vp = process.env.VP ? { width: +process.env.VP.split('x')[0], height: +process.env.VP.split('x')[1] } : undefined;
  const opts = { device: dev, viewport: vp, engine: process.env.ENGINE || 'webkit' };
  if (process.env.NEWUSER) opts.seed = { kv: {}, session: {} };
  const h = await L.launch(opts);
  const page = h.page;
  try {
    if (process.env.NEWUSER) { await page.goto(L.BASE, { waitUntil: 'load', timeout: 120000 }); await L.sleep(6000); }
    else await L.openApp(h, { settle: 5000 });
    const fn = new Function('h', 'L', 'page', 'return (async () => {' + process.argv[2] + '})()');
    const r = await fn(h, L, page);
    console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1));
    console.log('ERRORS', JSON.stringify(h.errors), 'CONSOLE', JSON.stringify(h.consoleErr));
  } catch (e) { console.log('FAIL', e); }
  await h.browser.close();
})();
