'use strict';
/* Nov 6 2026 Supermarket redesign (tests/supermarket-one-list.test.cjs), walked in Chromium on the local site with the network blocked
   (only GET to the local server; no Supabase, no account). A snack list from before (two to buy, one bought) is on the phone.
   1 Einkaufen > Supermarkt (EDEKA): no snack line; the Cart badge counts the two moved snacks; store and Cart share a row
   2 the Cart: both snacks are lines; Buy again offers the bought one; a tap fills, Undo takes it back out; adding by name works
   3 "+" on a product puts it in the Cart (stepper, badge up)
   4 a category chip lands its section just under the category bar, which stays on top while the list scrolls
   node tools/check-supermarket-one-list.cjs <root> <outdir> [width height lang] */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..')), OUT = process.argv[3] || path.join(require('os').tmpdir(), 'supermarket-one-list');
const VW = +(process.argv[4] || 390), VH = +(process.argv[5] || 844), LANG = process.argv[6] || 'de';
const pw = require('playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const INIT = fs.readFileSync(path.join(ROOT, 'tests', 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }).listen(0, '127.0.0.1', () => r(s)); });
  const url = `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
  const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
  await ctx.addInitScript(INIT);
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('chk.seeded')) { sessionStorage.setItem('chk.seeded', '1'); localStorage.setItem('lowi.snackBuy.v1', JSON.stringify([{ id: 's1', n: 'Paprika', at: 1, got: 0 }, { id: 's2', n: 'Nüsse', at: 2, got: 0 }, { id: 's3', n: 'Reiswaffeln', at: 3, got: 5 }])); } } catch (e) { } });
  const page = await ctx.newPage(), errs = [], P = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await page.goto(url + '?tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.LowiStorePicks && document.documentElement.classList.contains('o8'), null, { timeout: 90000 });
  await page.evaluate(l => { try { LowiLang.set(l); } catch (e) { } }, LANG);
  await sleep(3000);
  /* like a finger: the element is scrolled into view first (a short phone shows less of the list) */
  const center = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'center', inline: 'nearest' }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
  const tap = async sel => { const c = await center(sel); if (!c) { P.push('no ' + sel); return false; } await sleep(250); const d = await page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel); await page.mouse.click(d[0], d[1]); return true; };
  const badge = () => page.evaluate(() => { const n = document.querySelector('.stp-card .stp-cartbtn .stp-cart-n'); return n ? +n.textContent : 0; });
  const lines = () => page.evaluate(() => (window.LOWI_SHELF && LOWI_SHELF.cartLines ? LOWI_SHELF.cartLines() : []).map(l => l.n));
  /* 1 */
  await page.evaluate(() => { window.LowiStorePicks.setTab('shop'); window.LowiStorePicks.open(); });
  await sleep(1500);
  if (await center('[data-stp-range="edeka"]')) { await tap('[data-stp-range="edeka"]'); }
  await page.waitForFunction(() => document.querySelector('.stp-card .stp-items'), null, { timeout: 20000 }).catch(() => P.push('the product list never showed'));
  await sleep(800);
  const head = await page.evaluate(() => ({ snackLine: !!document.querySelector('.stp-snackbox, .stp-snacks'), row: !!document.querySelector('.stp-shoprow .stp-shop + .stp-cartbtn'), q: (document.querySelector('.stp-head-list h3.sr-only') || {}).textContent || '' }));
  console.log('head', JSON.stringify(head), 'badge', await badge(), 'cart', JSON.stringify(await lines()));
  if (head.snackLine) P.push('a snack line is still there'); if (!head.row) P.push('store and Cart are not one row'); if (!head.q) P.push('no question for VoiceOver');
  if (await badge() !== 2) P.push('the two to-buy snacks are not in the Cart: ' + JSON.stringify(await lines()));
  await page.screenshot({ path: OUT + '/1-list-' + VW + '-' + LANG + '.png' });
  /* 2 */
  await tap('.stp-card .stp-cartbtn'); await sleep(900);
  const again = await page.evaluate(() => { const b = document.querySelector('.stp-cartv [data-stp-snack-refill] small'); return b ? b.textContent : null; });
  console.log('buy again', again); if (!again || !/Reiswaffeln/.test(again)) P.push('Buy again does not offer the bought snack: ' + again);
  await page.screenshot({ path: OUT + '/2-cart-' + VW + '-' + LANG + '.png' });
  await tap('.stp-cartv [data-stp-snack-refill]'); await sleep(500);
  let ls = await lines(); if (!ls.some(n => /Reiswaffeln/.test(n))) P.push('Buy again did not fill the Cart: ' + JSON.stringify(ls));
  if (!(await center('.stp-cartv [data-stp-snack-undo]'))) P.push('no Undo after Buy again');
  await page.screenshot({ path: OUT + '/3-cart-filled-' + VW + '-' + LANG + '.png' });
  await sleep(600); await tap('.stp-cartv [data-stp-snack-undo]'); await sleep(500);
  ls = await lines(); if (ls.some(n => /Reiswaffeln/.test(n))) P.push('Undo left it in the Cart'); if (ls.length !== 2) P.push('Undo changed other lines: ' + JSON.stringify(ls));
  await page.fill('.stp-cartv .stp-cart-add input', 'Gurken'); await page.press('.stp-cartv .stp-cart-add input', 'Enter'); await sleep(500);
  ls = await lines(); console.log('after add by name', JSON.stringify(ls)); if (!ls.some(n => /Gurke/.test(n))) P.push('adding by name failed');
  await tap('.stp-cartv .stp-pill[data-stp="qv-close"]'); await sleep(700);
  /* 3 */
  const b0 = await badge();
  await tap('.stp-card .stp-items .stp-li.qa [data-stp-qa="add"]'); await sleep(600);
  const b1 = await badge(), step = await page.evaluate(() => !!document.querySelector('.stp-card .stp-items .stp-li.qa .stp-qa-step'));
  console.log('badge', b0, '->', b1, 'stepper', step); if (b1 !== b0 + 1 || !step) P.push('+ did not add to the Cart');
  await page.screenshot({ path: OUT + '/4-added-' + VW + '-' + LANG + '.png' });
  /* 4 */
  await page.waitForTimeout(2600); /* the "In your Cart" note goes */
  const jump = await page.evaluate(() => { const c = [...document.querySelectorAll('.stp-card .stp-jumps [data-stp-jump]')]; const b = c[Math.min(2, c.length - 1)]; if (!b) return null; b.click(); return b.getAttribute('data-stp-jump'); });
  await sleep(1400);
  const land = await page.evaluate(id => { const bar = document.querySelector('.stp-card .stp-jumps'), g = document.getElementById('stpg-' + id), sc = document.querySelector('.stp-card .stp-scroll'); if (!bar || !g) return null; const br = bar.getBoundingClientRect(), gr = g.getBoundingClientRect(), sr = sc.getBoundingClientRect(); return { barTop: Math.round(br.top - sr.top), barBottom: Math.round(br.bottom), groupTop: Math.round(gr.top), scrolled: Math.round(sc.scrollTop) }; }, jump);
  console.log('jump', jump, JSON.stringify(land));
  if (!land || land.scrolled < 200) P.push('the jump did not scroll'); else { if (land.groupTop < land.barBottom - 1) P.push('the section landed under the bar'); if (land.groupTop - land.barBottom > 40) P.push('the section landed far below the bar'); if (Math.abs(land.barTop) > 6) P.push('the bar did not stay on top: ' + land.barTop); }
  await page.screenshot({ path: OUT + '/5-jump-' + VW + '-' + LANG + '.png' });
  const wide = await page.evaluate(() => { const sc = document.querySelector('.stp-card .stp-scroll'); return sc ? sc.scrollWidth - sc.clientWidth : -1; });
  if (wide > 0) P.push('the list can scroll sideways by ' + wide + ' px');
  console.log((P.length ? 'FAIL' : 'PASS') + ' ' + VW + 'x' + VH + ' ' + LANG + ' errs=' + errs.length); P.forEach(x => console.log('  - ' + x)); errs.slice(0, 5).forEach(x => console.log('  err ' + x));
  await browser.close(); srv.close(); process.exit(P.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
