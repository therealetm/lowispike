'use strict';
/* Nov 5 2026 Scan chooser + live supermarket scan (tests/scan-chooser.test.cjs), walked in Chromium with a fake camera, the local
   site and the network blocked (only GET to the local server; no Supabase, no account):
   1 Home Scan -> the chooser, no camera by itself; the box ends above the typing panel
   1b Foto von deinem Essen = the phone camera (file input with capture), Aus Fotos = the library, cancelling either keeps the
      chooser; Deep analyze = the plain GPT link (no data-b3)
   2 Barcode live scannen -> the live camera runs
   3-6 a product card over the running camera; In den Wagen and Überspringen both close it and the camera keeps reading
   7 the shared bottom X closes the live scanner
   node tools/check-scan-chooser.cjs <root> <outdir> [width height lang]   e.g. . /tmp/scan 390 844 de */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..')), OUT = process.argv[3] || path.join(require('os').tmpdir(), 'scan-chooser'), VW = +(process.argv[4] || 390), VH = +(process.argv[5] || 844), LANG = process.argv[6] || 'de';
const pw = require('playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const INIT = fs.readFileSync(path.join(ROOT, 'tests', 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const PRODUCTS = {
  '4002468000000': { barcode: '4002468000000', name: 'Skyr Natur', brand: 'Test', cat: 'dairy', facts: { c: 4, s: 4, p: 11, fat: 0.2 }, ingredients: 'Magermilch, Milchsäurekulturen' },
  '5000112000009': { barcode: '5000112000009', name: 'Cola', brand: 'Test', cat: 'drink', facts: { c: 10.6, s: 10.6, drink: 1 }, ingredients: 'Wasser, Zucker, Kohlensäure' }
};
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }).listen(0, '127.0.0.1', () => r(s)); });
  const url = `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
  const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block', permissions: ['camera'] });
  await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
  await ctx.addInitScript(INIT);
  await ctx.addInitScript(l => { try { localStorage.setItem('lowi.lang', l); } catch (e) { } }, LANG);
  const page = await ctx.newPage(), errs = [], P = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  let choosers = 0; page.on('filechooser', () => { choosers++; });
  await page.goto(url + '?tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.LowiHomeOrbitV2 && document.documentElement.classList.contains('o8') && document.querySelector('#whHud .o8-scan'), null, { timeout: 90000 });
  await page.evaluate(l => { try { LowiLang.set(l); } catch (e) { } }, LANG);
  await sleep(5000);
  const center = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width, r.height]; }, sel);
  const tap = async sel => { const c = await center(sel); if (!c) { P.push('no ' + sel); return false; } await page.mouse.click(c[0], c[1]); return true; };
  const st = () => page.evaluate(() => { const c = document.getElementById('b3Cam'); if (!c) return null; const v = c.querySelector('#b3Vid');
    return { cls: c.className, st: c.dataset.st, live: c.classList.contains('live'), stream: !!(v && v.srcObject && v.srcObject.active), card: !!c.querySelector('.ss-card'), toast: !!c.querySelector('.ss-toast.on'),
      opts: [...c.querySelectorAll('.b3-popt')].map(o => { const r = o.getBoundingClientRect(); return { k: o.dataset.b3 || o.className, w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top) }; }) }; });
  /* 1 Home Scan -> the chooser, no camera */
  await tap('#whHud .o8-scan'); await sleep(2200);
  const s1 = await st(); console.log('chooser', JSON.stringify(s1), 'filechoosers', choosers);
  if (choosers) P.push('the Scan tap opened the phone camera (' + choosers + ')');
  if (!s1 || s1.st !== 'pick') P.push('no chooser: ' + JSON.stringify(s1));
  await page.screenshot({ path: OUT + '/1-chooser-' + VW + '-' + LANG + '.png' });
  /* overlap check: the chooser card never runs over the typing panel */
  const ov = await page.evaluate(() => { const c = document.getElementById('b3Cam'); const box = c && c.querySelector('.b3-pickbox'), bot = c && c.querySelector('.b3-cbot'), m = c && c.querySelector('#b3CMsg');
    if (!box || !bot) return null; const a = m.getBoundingClientRect(), b = bot.getBoundingClientRect(), k = box.getBoundingClientRect(); return { msgBottom: Math.round(a.bottom), botTop: Math.round(b.top), boxTop: Math.round(k.top), boxBottom: Math.round(k.bottom), scrolls: m.scrollHeight > m.clientHeight + 1 }; });
  console.log('fit', JSON.stringify(ov)); if (ov && ov.msgBottom > ov.botTop) P.push('chooser box runs over the typing panel');
  /* 1b the rows: photo = the phone camera (file input with capture), Photos = the library, Deep analyze = the GPT link */
  const deep = await page.evaluate(() => { const a = document.querySelector('#b3Cam .b3-popt-deep'); return a ? { tag: a.tagName, href: a.getAttribute('href'), target: a.getAttribute('target'), b3: a.getAttribute('data-b3') } : null; });
  console.log('deep', JSON.stringify(deep)); if (!deep || deep.tag !== 'A' || !/^https:\/\/chatgpt\.com\/g\/g-/.test(deep.href) || deep.target !== '_blank' || deep.b3) P.push('Deep analyze is not the GPT link: ' + JSON.stringify(deep));
  for (const [sel, wantCapture] of [['#b3Cam [data-b3="pickshoot"]', true], ['#b3Cam [data-b3="picklib"]', false]]) {
    const c = await center(sel); if (!c) { P.push('no ' + sel); continue; }
    const wait = page.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null);
    await page.mouse.click(c[0], c[1]); const fc = await wait;
    const cap = fc ? await fc.element().evaluate(e => e.getAttribute('capture')) : null;
    console.log(sel, 'chooser', !!fc, 'capture', cap);
    if (!fc) P.push(sel + ' opened no picker'); else if (!!cap !== wantCapture) P.push(sel + ' capture=' + cap);
    await page.evaluate(() => { for (const id of ['b3Pick', 'b3PickLib']) { const i = document.getElementById(id); if (i) i.dispatchEvent(new Event('cancel', { bubbles: true })); } });
    await sleep(700);
    const back = await st(); if (!back || back.st !== 'pick') P.push('after cancelling ' + sel + ' the chooser is gone: ' + JSON.stringify(back));
  }
  choosers = 0;
  /* 2 Live scan */
  if (!(await tap('#b3Cam [data-b3="picklive"]'))) P.push('no Live scan option');
  await page.waitForFunction(() => { const c = document.getElementById('b3Cam'); return c && c.classList.contains('live'); }, null, { timeout: 15000 }).catch(() => P.push('live camera never started'));
  await sleep(800);
  const s2 = await st(); console.log('live', JSON.stringify(s2));
  await page.screenshot({ path: OUT + '/2-live-' + VW + '-' + LANG + '.png' });
  /* 3 a product: the card over the running camera */
  await page.evaluate(PR => { window.LowiDex.lookup = async code => PR[code] ? JSON.parse(JSON.stringify(PR[code])) : { barcode: code, notFound: true }; }, PRODUCTS);
  const hit = code => page.evaluate(c => { const i = document.getElementById('b3Bc'), f = document.getElementById('b3BcF'); i.value = c; f.requestSubmit(); }, code);
  await hit('4002468000000'); await sleep(1500);
  const s3 = await st(); console.log('card', JSON.stringify(s3));
  if (!s3.card) P.push('no product card'); if (!s3.stream) P.push('camera stopped under the card');
  await page.screenshot({ path: OUT + '/3-card-' + VW + '-' + LANG + '.png' });
  const acts = await page.evaluate(() => [...document.querySelectorAll('#b3Cam .ss-card button')].map(b => (b.dataset.ss || '') + ':' + b.innerText.replace(/\s+/g, ' ').trim()).slice(0, 12));
  console.log('card buttons', JSON.stringify(acts));
  /* 4 Add to cart: card goes, toast, still scanning */
  await tap('#b3Cam .ss-card [data-ss="add"]'); await sleep(900);
  const s4 = await st(); console.log('after add', JSON.stringify(s4));
  if (s4.card) P.push('card still open after Add'); if (!s4.live || !s4.stream || s4.st !== 'live') P.push('not scanning after Add: ' + JSON.stringify(s4));
  await page.screenshot({ path: OUT + '/4-added-' + VW + '-' + LANG + '.png' });
  /* 5 next product, Skip: still scanning */
  await sleep(600); await hit('5000112000009'); await sleep(1500);
  const s5 = await st(); if (!s5.card) P.push('no second card');
  await page.screenshot({ path: OUT + '/5-card2-' + VW + '-' + LANG + '.png' });
  const skipSel = (await center('#b3Cam .ss-card .ss-skip')) ? '#b3Cam .ss-card .ss-skip' : '#b3Cam .ss-card [data-ss="next"]';
  console.log('skip via', skipSel);
  await tap(skipSel); await sleep(900);
  const s6 = await st(); console.log('after skip', JSON.stringify(s6));
  if (s6.card) P.push('card still open after Skip'); if (!s6.live || !s6.stream || s6.st !== 'live') P.push('not scanning after Skip: ' + JSON.stringify(s6));
  await page.screenshot({ path: OUT + '/6-skipped-' + VW + '-' + LANG + '.png' });
  /* 7 the shared bottom X closes the live scanner */
  const bx = await page.evaluate(() => { const b = document.getElementById('lwBX'); if (!b || !b.classList.contains('on')) return null; const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  const pnl = await page.evaluate(() => { const b = document.querySelector('#b3Cam .b3-cbot'), r = b && b.getBoundingClientRect(); return r ? { top: Math.round(r.top), h: Math.round(r.height) } : null; });
  console.log('live panel', JSON.stringify(pnl), 'lifted X', JSON.stringify(bx));
  if (!bx) P.push('no lifted X on the live scanner'); else { await page.mouse.click(bx[0], bx[1]); await sleep(900); if (await page.evaluate(() => !!document.getElementById('b3Cam'))) P.push('the X did not close the live scanner'); }
  const cart = await page.evaluate(() => { try { return window.LOWI_SHELF && LOWI_SHELF.cartCount ? LOWI_SHELF.cartCount() : null; } catch (e) { return 'err'; } });
  console.log('cart count', cart);
  console.log((P.length ? 'FAIL' : 'PASS') + ' ' + VW + 'x' + VH + ' ' + LANG + ' errs=' + errs.length); P.forEach(x => console.log('  - ' + x)); errs.slice(0, 5).forEach(x => console.log('  err ' + x));
  await browser.close(); srv.close(); process.exit(P.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
