'use strict';
/* BH-004 regression: now that lowi:lang really fires, ~20 listeners run on a switch. Switch EN/DE/ES inside the liver world (guide
   talking), then leave and switch on Home with a bloom open and with Settings open. Any JS error, rejection or stuck panel fails.
   node probe-lang-world.cjs [--root DIR | --url URL] [--view chromium390|iphone13] */
const L = require('./lib.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', '.')));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const h = await L.open({ url, view: arg('view', 'chromium390'), settle: 8000, lang: 'en' }); const P = h.page;
  const issues = [];
  const cur = () => P.evaluate(() => { try { return window.LowiWorldRegions.state.cur; } catch (e) { return '?'; } });
  await P.evaluate(() => window.LowiWorldRegions.travel('liver'));
  for (let i = 0; i < 60 && (await cur()) !== 'liver'; i++) await L.sleep(1000);
  await L.sleep(4000);
  const inWorld = await cur();
  const guide = () => P.evaluate(() => { const b = document.querySelector('.rp-line, .rp-bubble, [class*=rp-say]'); return b ? (b.innerText || '').slice(0, 60) : ''; });
  for (const l of ['de', 'es', 'en', 'de']) { await P.evaluate(l => LowiLang.set(l), l); await L.sleep(1500); console.log('world', inWorld, l, JSON.stringify(await guide())); }
  await P.evaluate(() => window.LowiWorldRegions.travel('hub'));
  for (let i = 0; i < 60 && (await cur()) !== 'hub'; i++) await L.sleep(1000);
  await L.sleep(3000);
  const tapOrbit = k => P.evaluate(k => { const e = document.querySelector('[data-orbit="' + k + '"]'); if (e) e.click(); return !!e; }, k);
  for (const k of ['water', 'fuel', 'settings']) {
    await tapOrbit(k); await L.sleep(1200);
    for (const l of ['es', 'en']) { await P.evaluate(l => LowiLang.set(l), l); await L.sleep(1200); }
    await P.keyboard.press('Escape'); await L.sleep(1200);
    const open = await P.evaluate(() => { const B = window.LowiHomeBloomsV2; const b = B && B.isOpen && B.isOpen(); const s = document.querySelector('.ss2-layer.open, .ss2-open, [data-ss2-open]'); return !!b || !!s; });
    if (open) issues.push(k + ' still open after Escape');
  }
  const s = await L.snap(h);
  const errs = [...h.log.pageerror, ...s.err, ...s.rej];
  console.log(`${arg('view', 'chromium390')}: world=${inWorld} ${errs.length || issues.length ? 'FAIL' : 'PASS'} errors=${JSON.stringify(errs)} issues=${JSON.stringify(issues)} console=${JSON.stringify(h.log.console.slice(0, 5))}`);
  await h.browser.close(); if (srv) srv.close();
  process.exit(errs.length || issues.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
