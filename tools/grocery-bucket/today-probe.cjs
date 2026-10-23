'use strict';
/* Browser simulation (not a real phone) for grocery-3: Today's groceries sheet (from the bucket list on the product card) with cook suggestions from Cook's recipes.
   node tools/grocery-bucket/today-probe.cjs [--views se,i13,i15,pixel7] [--theme light|dark] [--langs en,de,es] [--url LIVE] */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), OUT = arg('out', '/tmp/grocery-today-shots');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const INIT = fs.readFileSync(path.join(__dirname, '..', '..', 'tests', 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const VIEWS = { se: ['webkit', 'iPhone SE'], i13: ['webkit', 'iPhone 13'], i15: ['webkit', 'iPhone 15'], pixel7: ['chromium', 'Pixel 7'] };


const SKYR = { barcode: '4002468000001', name: 'Skyr Natur', brand: 'Test', cat: 'dairy', facts: { c: 4, s: 4, p: 11, fat: 0.2 }, ingredients: 'Magermilch, Milchsäurekulturen' };
const W = { en: ["Today's groceries", 'What you bought', 'Cook from it'], de: ['Heutige Einkäufe', 'Was du gekauft hast', 'Daraus kochen'], es: ['La compra de hoy', 'Lo que compraste', 'Cocina con ello'] };
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
      await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiDex && window.LowiBucket && window.LowiBucketCore, null, { timeout: 150000 });
      await sleep(3000);
      const env = await ev(() => ({ gw: !!window.LOWI_GROUP_WORDS, recs: typeof LowiAllRecipes === 'function' ? LowiAllRecipes().length : 0, open: typeof LowiBucket.openToday === 'function' }));
      if (!env.gw || env.recs < 5 || !env.open) fails.push(v + ': env ' + JSON.stringify(env));
      for (const lang of langs) {
        const tag = `${v} ${theme} ${lang}`, w = W[lang];
        await ev(l => { try { LowiLang.set(l); } catch (e) {} try { while (LowiR2.openCount && LowiR2.openCount()) LowiR2.close(); } catch (e) {}
          const C = LowiBucketCore; let s = { days: {} };
          [{ name: 'Bio Eier 10 Stück', verdict: 'ok', score: 8 }, { name: 'Feta Classic', brand: 'Salakis', verdict: 'ok', score: 6 }, { name: 'Rinder Hackfleisch', verdict: 'ok', score: 5 }, { name: 'Lachsfilet', verdict: 'ok', score: 4 }, { barcode: '4002468000001', name: 'Skyr Natur', brand: 'Test', verdict: 'ok', score: 12 }].forEach(p => { s = C.add(s, p); });
          s = C.setPrice(s, 'nm:feta classic|salakis', '2,49'); C.save(s); }, lang); await sleep(600);
        await ev(p => { LowiDex.reveal(JSON.parse(JSON.stringify(p))); }, SKYR); await sleep(1200);
        const sum = page.locator('.b3-ov .gb-list summary').last();
        if (!(await sum.count())) { fails.push(tag + ': no bucket list on the card'); continue; }
        await sum.scrollIntoViewIfNeeded(); await sum.tap(); await sleep(400);
        const btn = page.locator('.b3-ov .gb-today').last();
        if (!(await btn.count())) { fails.push(tag + ': no Today\'s groceries button'); continue; }
        await btn.scrollIntoViewIfNeeded(); await sleep(200);
        const bh = await btn.evaluate(e => e.getBoundingClientRect().height); if (bh < 44) fails.push(tag + ': entry under 44 px');
        await btn.tap(); await sleep(900);
        const r = await ev(() => { const ov = [...document.querySelectorAll('.gt-ov')].pop(); if (!ov) return null; const sh = ov.querySelector('.gt-sheet');
          const ids = new Set(LowiAllRecipes().map(x => x.id)); const recs = [...ov.querySelectorAll('.gt-rec')];
          return { text: sh.innerText.replace(/\s+/g, ' '), items: ov.querySelectorAll('.gt-items li').length, recs: recs.map(b => b.dataset.r), real: recs.every(b => ids.has(b.dataset.r)), small: recs.filter(b => b.getBoundingClientRect().height < 44).length,
            tp: (ov.querySelector('.gb-tp') || {}).textContent, pts: (ov.querySelector('.gb-tpts') || {}).textContent, vw: innerWidth, sx: document.documentElement.scrollWidth, shW: ov.querySelector('.r2-sh').getBoundingClientRect().right }; });
        if (!r) { fails.push(tag + ': sheet did not open'); continue; }
        w.forEach(x => { if (!r.text.includes(x)) fails.push(tag + ': missing "' + x + '"'); });
        if (r.items !== 5) fails.push(tag + ': items ' + r.items);
        if (!r.recs.length || !r.real) fails.push(tag + ': recipes ' + JSON.stringify(r.recs) + ' real=' + r.real);
        if (r.small) fails.push(tag + ': recipe buttons under 44 px');
        if (!/2[.,]49/.test(r.tp || '')) fails.push(tag + ': total ' + r.tp);
        if (r.pts !== '35') fails.push(tag + ': points ' + r.pts);
        if (r.sx > r.vw + 1 || r.shW > r.vw + 1) fails.push(tag + ': sideways scroll');
        await page.screenshot({ path: path.join(OUT, `${v}-${theme}-${lang}-today.png`) });
        const want = r.recs[0];
        await page.locator('.gt-ov .gt-rec').first().tap(); await sleep(1200);
        const op = await ev(() => { const o = [...document.querySelectorAll('.p2-recov')].pop(); return o ? o.innerText.slice(0, 80).replace(/\s+/g, ' ') : ''; });
        if (!op) fails.push(tag + ': recipe ' + want + ' did not open');
        if (lang === langs[0]) await page.screenshot({ path: path.join(OUT, `${v}-${theme}-${lang}-recipe.png`) });
        console.log((fails.some(f => f.startsWith(tag)) ? 'FAIL ' : 'ok   ') + tag + ' recipes=' + r.recs.join(',') + ' total=' + r.tp + ' pts=' + r.pts);
      }
    } catch (e) { fails.push(v + ': ' + e.message.slice(0, 200)); }
    if (errs.length) fails.push(v + ': page errors ' + errs.slice(0, 3).join(' | '));
    fails.forEach(f => console.log('FAIL ' + f)); fail += fails.length;
    await browser.close();
  }
  if (srv) srv.close();
  console.log(fail ? 'PROBE FAIL ' + fail : 'PROBE PASS');
  process.exit(fail ? 1 : 0);
})();
