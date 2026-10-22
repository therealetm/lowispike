'use strict';
/* scanfe-f2 browser check: missing label / ingredients -> 'Add label photos' on the scan card, the two-photo sheet, honest no-OCR
   fallback (nothing pre-filled), engine validation (sugar > carbs refused), confirm tick required, confirmed values re-rate the card
   (Ultje label -> Moderate). iPhone SE/13/15 (WebKit) + Pixel 7, Day/Night, EN/DE/ES. Browser simulation, not a real phone.
     node tests/label-photos-live.cjs [--root DIR | --url URL] [--out DIR] [--views ..] [--theme light|dark] [--langs en,de,es] */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/label-photos-shots');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const VIEWS = { se: ['webkit', 'iPhone SE'], i13: ['webkit', 'iPhone 13'], i15: ['webkit', 'iPhone 15'], pixel7: ['chromium', 'Pixel 7'] };
const HIGH = { en: 'Higher estimated blood sugar impact', de: 'Höhere geschätzte Wirkung auf den Blutzucker', es: 'Impacto estimado más alto en el azúcar en sangre' };
const WANT = { en: 'Moderate estimated blood sugar impact', de: 'Mittlere geschätzte Wirkung auf den Blutzucker', es: 'Impacto estimado moderado en el azúcar en sangre' };
const BAD = /no blood sugar spike|kein Blutzucker-Spike|no te sube el azúcar|No spike|Kein Spike/i;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = arg('url', '') ? null : await serve();
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
  const theme = arg('theme', 'dark'), langs = arg('langs', 'en,de,es').split(',');
  let fail = 0;
  for (const v of arg('views', 'se,i13,i15,pixel7').split(',')) {
    const [eng, dev] = VIEWS[v], fails = [], log = { theme, cards: [] };
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
      await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiSpikeCore && window.LowiFoodEngine, null, { timeout: 150000 });
      await sleep(3500);
      log.dataTheme = await ev(() => document.documentElement.dataset.theme);
      log.engine = await ev(() => window.LowiFoodEngine && LowiFoodEngine.VERSION);
      log.reveal = await ev(() => window.LowiDex && typeof LowiDex.reveal);
      await page.waitForFunction(() => window.LowiLabelPhotos && window.LowiLabelPhotosCore, null, { timeout: 60000 });
      if (log.reveal !== 'function') throw new Error('LowiDex.reveal is not reachable');
      for (const lang of langs) {
        await ev(l => { try { LowiLang.set(l); } catch (e) { } }, lang); await sleep(500);
        const tag = `${v} ${theme} ${lang}`;
        await ev(() => { document.querySelectorAll('.tut-ov,.stp-ov,[class*="wn-ov"],.b3-ov,.lp-ov').forEach(x => x.remove()); });
        // 1. Database has the name but no label and no ingredients -> the ask shows and names both gaps.
        await ev(p => { LowiDex.reveal(p); }, { barcode: '4004980506206', name: 'Ultje Süß & Salzig', brand: 'Ultje', cat: 'snack', facts: {}, ingredients: '' }); await sleep(900);
        const a = await ev(() => { const b = document.querySelector('.b3-rev [data-b3="lphoto"]'); if (!b) return null; const q = b.getBoundingClientRect(); return { txt: b.textContent.trim(), note: (document.querySelector('.lp-asks') || {}).textContent || '', l: q.left, r: q.right, w: innerWidth, h: q.height }; });
        if (!a) { fails.push(tag + ': no "Add label photos" ask on a card without label'); continue; }
        if (a.l < 0 || a.r > a.w + 1) fails.push(tag + ': ask off screen');
        if (a.h < 40) fails.push(tag + ': ask button under 44px tap height (' + a.h + ')');
        if (!(a.note.split(',').length >= 2)) fails.push(tag + ': ask does not name both gaps: ' + a.note);
        if (lang === langs[0]) await page.screenshot({ path: path.join(OUT, `${v}-${theme}-${lang}-ask.png`) });
        await page.click('.b3-rev [data-b3="lphoto"]'); await sleep(700);
        const s = await ev(() => { const o = document.querySelector('.lp-ov'); if (!o) return null; const f = o.querySelector('.lp-form'); const out = []; const W = innerWidth;
          o.querySelectorAll('input:not([type=file]),select,textarea,button,.lp-slot').forEach(x => { const q = x.getBoundingClientRect(); if (q.width && (q.left < -1 || q.right > W + 1)) out.push('off x: ' + (x.name || x.className)); });
          return { slots: o.querySelectorAll('.lp-slot input[type=file]').length, need: o.querySelectorAll('.lp-slot.need').length, fields: ['carbs','sugar','fibre','protein','fat','kcal','ingredients'].filter(k => f.elements[k]).length, out, sw: document.documentElement.scrollWidth > innerWidth + 1 }; });
        if (!s) { fails.push(tag + ': label sheet did not open'); continue; }
        if (s.slots !== 2) fails.push(tag + ': photo slots ' + s.slots);
        if (s.need !== 2) fails.push(tag + ': needed slots ' + s.need);
        if (s.fields !== 7) fails.push(tag + ': fields ' + s.fields);
        s.out.forEach(o => fails.push(tag + ': ' + o)); if (s.sw) fails.push(tag + ': sideways scroll');
        // 2. Photo without on-device text reading: honest fallback, nothing pre-filled.
        await page.setInputFiles('.lp-ov input[data-lp="label"]', { name: 'label.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') }); await sleep(900);
        const ph = await ev(() => { const o = document.querySelector('.lp-ov'); return { st: (o.querySelector('.lp-slot .lp-st') || {}).textContent || '', prev: !(o.querySelector('.lp-prev') || {}).hidden, carbs: o.querySelector('[name=carbs]').value }; });
        if (!ph.prev) fails.push(tag + ': photo preview missing');
        if (ph.st.length < 10) fails.push(tag + ': no photo status');
        if (ph.carbs !== '') fails.push(tag + ': carbs filled without being read: ' + ph.carbs);
        if (lang === langs[0]) await page.screenshot({ path: path.join(OUT, `${v}-${theme}-${lang}-sheet.png`) });
        // 3. Engine validation: sugar above carbs is refused, nothing changes.
        await ev(() => { const f = document.querySelector('.lp-form'); f.elements.carbs.value = '20'; f.elements.sugar.value = '29'; f.elements.ok.checked = true; });
        await page.click('.lp-save'); await sleep(400);
        const e1 = await ev(() => ({ err: (document.querySelector('.lp-ov .dg-form-error') || {}).textContent || '', open: !!document.querySelector('.lp-ov') }));
        if (!e1.open || e1.err.length < 10) fails.push(tag + ': sugar > carbs was not refused: ' + JSON.stringify(e1));
        // 4. Unticked confirm is refused.
        await ev(() => { const f = document.querySelector('.lp-form'); f.elements.carbs.value = '36'; f.elements.sugar.value = '29'; f.elements.protein.value = '15'; f.elements.fat.value = '38'; f.elements.kcal.value = '555'; f.elements.fibre.value = '5,5'; f.elements.ingredients.value = 'Erdnüsse 60%, Zucker, Glukosesirup, Salz'; f.elements.ok.checked = false; });
        await page.click('.lp-save'); await sleep(400);
        if (!(await ev(() => !!document.querySelector('.lp-ov')))) fails.push(tag + ': saved without the checked-against-pack tick');
        await ev(() => { document.querySelector('.lp-form').elements.ok.checked = true; });
        await page.click('.lp-save'); await sleep(500);
        if (await ev(() => !!document.querySelector('.lp-ov'))) await page.click('.lp-save').catch(() => {});
        await sleep(1200);
        const r = await ev(() => { const rev = document.querySelector('.b3-rev'); const verd = rev && rev.querySelector('.sc-verd'); const st = verd && verd.querySelector('strong');
          return { open: !!document.querySelector('.lp-ov'), cls: verd ? verd.className : '', head: st ? st.textContent.trim() : '', ask: !!(rev && rev.querySelector('[data-b3="lphoto"]')), all: rev ? rev.textContent.replace(/\s+/g, ' ') : '' }; });
        if (r.open) fails.push(tag + ': sheet still open after confirm');
        if (r.head !== WANT[lang] && r.head !== HIGH[lang]) fails.push(tag + ': after confirm head "' + r.head + '"');
        if (r.ask) fails.push(tag + ': ask still shown after the label + ingredients were confirmed');
        if (BAD.test(r.all)) fails.push(tag + ': says no spike');
        if (lang === langs[0]) await page.screenshot({ path: path.join(OUT, `${v}-${theme}-${lang}-after.png`) });
        log.cards.push({ tag, head: r.head });
        await ev(() => { document.querySelectorAll('.b3-ov,.lp-ov').forEach(x => x.remove()); }); await sleep(300);
      }
    } catch (e) { fails.push('run: ' + e.message.slice(0, 200)); }
    if (errs.length) fails.push('page errors: ' + errs.slice(0, 3).join(' | '));
    console.log((fails.length ? 'FAIL ' : 'PASS ') + v + ' ' + JSON.stringify({ theme: log.dataTheme, engine: log.engine, cards: log.cards.length,  }));
    fails.forEach(f => console.log('   - ' + f)); if (fails.length) fail++;
    await browser.close();
  }
  if (srv) srv.close();
  process.exit(fail ? 1 : 0);
})();
