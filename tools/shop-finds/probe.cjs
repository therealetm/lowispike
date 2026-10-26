'use strict';
/* Browser simulation (not a real phone) for MAYA-HANDOFF 0.32 Shop finds made simple.
   node tools/shop-finds/probe.cjs [--views i13,se,pixel7] [--langs en,de,es] [--theme dark|light] [--url LIVE] */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), OUT = arg('out', '/tmp/shop-finds-shots');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const INIT = fs.readFileSync(path.join(ROOT, 'tests', 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const VIEWS = { se: ['webkit', 'iPhone SE'], i13: ['webkit', 'iPhone 13'], i15: ['webkit', 'iPhone 15'], pixel7: ['chromium', 'Pixel 7'] };
const JARGON = { en: /glow|spirit|check-in|glimmer|\b\d\s*\/\s*2\b/i, de: /Leucht|Geist|Check-in|Schimmer|\b\d\s*\/\s*2\b/i, es: /brill|esp[ií]rit|check-in|destello|\b\d\s*\/\s*2\b/i };
const WANT = { en: ['Power combos', 'Caught today', 'Moderate', 'companion'], de: ['Power-Kombis', 'Heute gefangen', 'Mittel', 'Begleiter'], es: ['Combos de poder', 'Capturado hoy', 'Moderado', 'compañero'] };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = arg('url', '') ? null : await serve();
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
  const theme = arg('theme', 'dark'), langs = arg('langs', 'en,de,es').split(',');
  let fail = 0;
  for (const v of arg('views', 'i13').split(',')) {
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
      await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiGrocery && window.LowiShopScanCore, null, { timeout: 150000 });
      await sleep(2500);
      for (const lang of langs) {
        const tag = `${v} ${theme} ${lang}`;
        /* a fresh day: no catches yet, then the first scan (no note on the card), then a second one (one line) */
        await ev(l => { try { LowiLang.set(l); } catch (e) {} try { localStorage.removeItem('lowi.grocery.v1'); localStorage.removeItem('lowi.gh.spshop'); } catch (e) {} try { while (LowiR2.openCount && LowiR2.openCount()) LowiR2.close(); } catch (e) {} }, lang);
        await page.reload({ waitUntil: 'load', timeout: 180000 });
        await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiGrocery && window.LowiShopScanCore, null, { timeout: 150000 });
        await ev(l => { try { LowiLang.set(l); } catch (e) {} }, lang); await sleep(1500);
        const card = await ev(base => {
          const mk = () => { const c = document.createElement('div'); c.className = 'probe-card'; c.style.cssText = 'position:fixed;left:12px;right:12px;bottom:20px;z-index:9999;padding:14px;border-radius:24px;background:rgba(20,30,50,.92);color:#fff';
            c.innerHTML = '<div class="ss-sheet"><b>Card</b><div class="ss-more">Details</div></div>'; document.body.appendChild(c); return c; };
          document.querySelectorAll('.probe-card').forEach(x => x.remove());
          const c1 = mk(); window.dispatchEvent(new CustomEvent('lowi:shop-scan', { detail: { barcode: base + '11', name: 'Apfel', level: 'none', card: c1 } }));
          const first = c1.querySelectorAll('.gh-chip').length; c1.remove();
          const c2 = mk(); window.dispatchEvent(new CustomEvent('lowi:shop-scan', { detail: { barcode: base + '28', name: 'Mandeln Stifte', level: 'mild', card: c2 } }));
          const box = c2.querySelector('.gh-chip'); const b = box && box.querySelector('.gh-chip-open');
          return { first, n: c2.querySelectorAll('.gh-chip').length, text: box ? box.innerText.replace(/\s+/g, ' ') : '', h: b ? b.getBoundingClientRect().height : 0, lines: box ? box.querySelectorAll('small').length : 0 };
        }, '40000' + (100 + langs.indexOf(lang)) + '000');
        await page.screenshot({ path: `${OUT}/${v}-${theme}-${lang}-card.png` });
        if (card.first !== 0) fails.push(tag + ': first scan added a note');
        if (card.n !== 1 || card.lines !== 1) fails.push(tag + ': second scan note ' + JSON.stringify(card));
        if (card.h < 44) fails.push(tag + ': note tap target ' + card.h);
        if (JARGON[lang].test(card.text)) fails.push(tag + ': jargon on card: ' + card.text);
        await ev(() => { document.querySelectorAll('.probe-card').forEach(x => x.remove()); LowiGrocery.open(); });
        await sleep(900);
        const r = await ev(() => { const ov = [...document.querySelectorAll('.gh-ov')].pop(); if (!ov) return null;
          const t = ov.textContent.replace(/\s+/g, ' ');
          const pos = s => { const e = ov.querySelector(s); return e ? e.getBoundingClientRect().top : -1; };
          const hs = [...ov.querySelectorAll('button, summary')].filter(e => e.offsetParent).map(e => ({ t: (e.innerText || e.getAttribute('aria-label') || '').slice(0, 30), h: e.getBoundingClientRect().height })).filter(x => x.h < 28);
          return { t, scan: pos('[data-gh="scan"]'), combos: pos('.gh-combos'), shop: pos('[data-gh="shops"]'), more: pos('.gh-more'), small: hs, sx: document.documentElement.scrollWidth, vw: innerWidth }; });
        if (!r) { fails.push(tag + ': Shop finds did not open'); continue; }
        await page.screenshot({ path: `${OUT}/${v}-${theme}-${lang}-panel.png` });
        await ev(() => { const s = [...document.querySelectorAll('.gh-ov .stp-scroll')].pop(); if (s) s.scrollTop = 99999; }); await sleep(300);
        await page.screenshot({ path: `${OUT}/${v}-${theme}-${lang}-panel-bottom.png` });
        WANT[lang].forEach(w => { if (!r.t.includes(w)) fails.push(tag + ': missing "' + w + '"'); });
        if (/Medium|Medio\b/.test(r.t)) fails.push(tag + ': says Medium');
        if (JARGON[lang].test(r.t)) fails.push(tag + ': jargon: ' + (r.t.match(JARGON[lang]) || [])[0]);
        if (!(r.scan < r.combos && r.combos < r.shop && r.shop < r.more)) fails.push(tag + ': order ' + JSON.stringify([r.scan, r.combos, r.shop, r.more]));
        if (r.sx > r.vw + 1) fails.push(tag + ': sideways scroll ' + r.sx);
        console.log(tag, 'card:', card.text, '| panel ok, small controls:', JSON.stringify(r.small));
        await ev(() => { try { while (LowiR2.openCount && LowiR2.openCount()) LowiR2.close(); } catch (e) {} });
        await sleep(400);
      }
    } catch (e) { fails.push(v + ': ' + e.message.slice(0, 200)); }
    if (errs.length) fails.push(v + ': page errors ' + JSON.stringify(errs.slice(0, 4)));
    console.log(v, fails.length ? 'FAIL\n  ' + fails.join('\n  ') : 'PASS');
    fail += fails.length;
    await browser.close();
  }
  if (srv) srv.close();
  process.exit(fail ? 1 : 0);
})();
