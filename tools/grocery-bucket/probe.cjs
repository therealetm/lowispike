'use strict';
/* Browser simulation (not a real phone) for grocery-1: Add to bucket / Skip on the product check card.
   node tools/grocery-bucket/probe.cjs [--views se,i13,i15,pixel7] [--theme light|dark] [--langs en,de,es] [--url LIVE] */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), OUT = arg('out', '/tmp/grocery-bucket-shots');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const INIT = fs.readFileSync(path.join(__dirname, '..', '..', 'tests', 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const VIEWS = { se: ['webkit', 'iPhone SE'], i13: ['webkit', 'iPhone 13'], i15: ['webkit', 'iPhone 15'], pixel7: ['chromium', 'Pixel 7'] };

const SKYR = { barcode: '4002468000001', name: 'Skyr Natur', brand: 'Test', cat: 'dairy', facts: { c: 4, s: 4, p: 11, fat: 0.2 }, ingredients: 'Magermilch, Milchsäurekulturen' };
const COLA = { barcode: '5000112000002', name: 'Cola', brand: 'Test', cat: 'drink', facts: { c: 10.6, s: 10.6, drink: 1 }, ingredients: 'Wasser, Zucker, Kohlensäure' };
const W = { en: ['Add to bucket', 'Skip', "In today's bucket", '1 item today'], de: ['In den Korb', 'Überspringen', 'Im heutigen Korb', '1 Produkt heute'], es: ['Añadir a la cesta', 'Saltar', 'En la cesta de hoy', '1 producto hoy'] };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = arg('url', '') ? null : await serve();
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
  const theme = arg('theme', 'dark'), langs = arg('langs', 'en').split(',');
  let fail = 0;
  for (const v of arg('views', 'se,i13,i15,pixel7').split(',')) {
    const [eng, dev] = VIEWS[v], fails = [];
    const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
    const ctx = await browser.newContext(Object.assign({}, pw.devices[dev], { serviceWorkers: 'block' }));
    await ctx.addInitScript(t => { try { localStorage.setItem('lowi.theme', t); } catch (e) {} }, theme);
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
    await ctx.addInitScript(INIT);
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    const ev = (fn, a) => page.evaluate(fn, a);
    try {
      await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
      await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiDex && window.LowiBucket, null, { timeout: 150000 });
      await sleep(3000);
      for (const lang of langs) {
        const tag = `${v} ${theme} ${lang}`, w = W[lang];
        await ev(l => { try { LowiLang.set(l); } catch (e) {} try { localStorage.removeItem('lowi.bucket.v1'); } catch (e) {} }, lang); await sleep(500);
        await ev(p => { LowiDex.reveal(JSON.parse(JSON.stringify(p))); }, SKYR); await sleep(1000);
        const add = page.locator('.b3-ov .gb-add').last();
        if (!(await add.count())) { fails.push(tag + ': no Add to bucket'); continue; }
        await add.scrollIntoViewIfNeeded(); await sleep(250);
        const r = await ev(() => { const a = document.querySelector('.b3-ov .gb-add'), s = document.querySelector('.b3-ov .gb-skip'), row = document.querySelector('.b3-ov .gb-row');
          const bb = e => { const q = e.getBoundingClientRect(); return { l: q.left, r: q.right, t: q.top, b: q.bottom, h: q.height }; };
          const at = e => { const q = e.getBoundingClientRect(); const h = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !!h && (h === e || e.contains(h)); };
          return { add: a.textContent.trim(), skip: s.textContent.trim(), row: bb(row), a: bb(a), s: bb(s), aTop: at(a), sTop: at(s), vw: innerWidth, sx: document.documentElement.scrollWidth, bg: getComputedStyle(a).backgroundImage }; });
        if (r.add !== w[0] || r.skip !== w[1]) fails.push(tag + ': words ' + r.add + ' / ' + r.skip);
        if (r.row.l < 0 || r.row.r > r.vw + 0.5) fails.push(tag + ': row off screen ' + JSON.stringify(r.row));
        if (r.a.h < 44 || r.s.h < 44) fails.push(tag + ': buttons under 44 px');
        if (!r.aTop || !r.sTop) fails.push(tag + ': a button is covered');
        if (r.sx > r.vw + 1) fails.push(tag + ': sideways scroll');
        if (lang === langs[0]) await page.screenshot({ path: path.join(OUT, `${v}-${theme}-${lang}-choose.png`) });
        await add.tap(); await sleep(500);
        const d = await ev(() => { const s = JSON.parse(localStorage.getItem('lowi.bucket.v1') || '{}'); const days = Object.values(s.days || {}); const row = document.querySelector('.b3-ov .gb-done');
          return { n: days.reduce((a, x) => a + x.length, 0), names: days.flat().map(x => x.name), done: row ? row.innerText.replace(/\s+/g, ' ').trim() : '', list: (document.querySelector('.b3-ov .gb-list summary') || {}).textContent || '' }; });
        if (d.n !== 1 || d.names[0] !== 'Skyr Natur') fails.push(tag + ': not saved ' + JSON.stringify(d));
        if (!d.done.includes(w[2]) || !d.done.includes(w[3])) fails.push(tag + ': done row "' + d.done + '"');
        if (lang === langs[0]) await page.screenshot({ path: path.join(OUT, `${v}-${theme}-${lang}-added.png`) });
        // Undo, then add again
        await page.locator('.b3-ov .gb-undo').last().tap(); await sleep(400);
        const u = await ev(() => ({ n: Object.values((JSON.parse(localStorage.getItem('lowi.bucket.v1') || '{}').days) || {}).flat().length, add: !!document.querySelector('.b3-ov .gb-add') }));
        if (u.n !== 0 || !u.add) fails.push(tag + ': undo ' + JSON.stringify(u));
        await page.locator('.b3-ov .gb-add').last().tap(); await sleep(400);
        // Skip on another product closes its card and keeps the bucket as it is
        await ev(() => { document.querySelectorAll('.b3-ov').forEach(x => x.remove()); }); await sleep(300);
        await ev(p => { LowiDex.reveal(JSON.parse(JSON.stringify(p))); }, COLA); await sleep(1000);
        const sk = page.locator('.b3-ov .gb-skip').last(); await sk.scrollIntoViewIfNeeded(); await sleep(200); await sk.tap(); await sleep(900);
        const k = await ev(() => ({ open: [...document.querySelectorAll('.b3-ov')].filter(x => !x.classList.contains('off') && x.isConnected).length, n: Object.values((JSON.parse(localStorage.getItem('lowi.bucket.v1') || '{}').days) || {}).flat().length }));
        if (k.open !== 0 || k.n !== 1) fails.push(tag + ': skip ' + JSON.stringify(k));
        // the first product again: already in the bucket, list opens with it
        await ev(p => { LowiDex.reveal(JSON.parse(JSON.stringify(p))); }, SKYR); await sleep(1000);
        const again = await ev(() => ({ done: !!document.querySelector('.b3-ov .gb-done'), add: !!document.querySelector('.b3-ov .gb-add') }));
        if (!again.done || again.add) fails.push(tag + ': reopen ' + JSON.stringify(again));
        const sum = page.locator('.b3-ov .gb-list summary').last(); await sum.scrollIntoViewIfNeeded(); await sum.tap(); await sleep(300);
        const li = await ev(() => [...document.querySelectorAll('.b3-ov .gb-list li .gb-nm')].map(x => x.firstChild.textContent));
        if (li.length !== 1 || li[0] !== 'Skyr Natur') fails.push(tag + ': list ' + JSON.stringify(li));
        if (lang === langs[0]) await page.screenshot({ path: path.join(OUT, `${v}-${theme}-${lang}-list.png`) });
        // Log meal scan: no bucket row
        const meal = await ev(p => { window.LowiScanMeal = window.LowiScanMeal || { __probe: 1 }; document.querySelectorAll('.b3-ov').forEach(x => x.remove()); LowiDex.reveal(JSON.parse(JSON.stringify(p))); const n = document.querySelectorAll('.b3-ov .gb-row').length; if (window.LowiScanMeal.__probe) delete window.LowiScanMeal; return n; }, COLA);
        if (meal !== 0) fails.push(tag + ': bucket row on the Log meal scan');
        await ev(() => { document.querySelectorAll('.b3-ov').forEach(x => x.remove()); }); await sleep(300);
      }
      if (errs.length) fails.push(v + ': page errors ' + errs.join(' | '));
    } catch (e) { fails.push(v + ': ' + e.message.slice(0, 200)); }
    await browser.close();
    console.log((fails.length ? 'FAIL ' : 'PASS ') + v + ' ' + theme + ' ' + langs.join(',') + (fails.length ? '\n  ' + fails.join('\n  ') : ''));
    fail += fails.length;
  }
  if (srv) srv.close();
  process.exit(fail ? 1 : 0);
})();
