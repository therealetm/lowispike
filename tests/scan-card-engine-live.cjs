'use strict';
/* Browser check for the scanner card on the Food Intelligence Engine (scanfe-b2, Oct 22 2026). iPhone SE, 13, 15 (WebKit) and Pixel 7
   (Chromium), Day and Night, EN/DE/ES. Shows the barcode result card for four label fixtures through the app's own reveal() and checks:
   the verdict line reads Lower / Moderate / Higher estimated blood sugar impact (or the not-enough-data entry sheet), never "no spike",
   Ultje Suess & Salzig is not Lower, the first reason names carbs per serving, the card and its buttons fit the screen, no page errors.
   Local fixture session, every non-GET and off-site request blocked. Browser simulation, not a real phone.
     node tests/scan-card-engine-live.cjs [--root DIR | --url https://therealetm.github.io/lowispike/] [--out DIR] [--views se,i13,i15,pixel7] [--theme light|dark] [--langs en,de,es]
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/scan-card-engine-shots');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const VIEWS = { se: ['webkit', 'iPhone SE'], i13: ['webkit', 'iPhone 13'], i15: ['webkit', 'iPhone 15'], pixel7: ['chromium', 'Pixel 7'] };
const PRODUCTS = [
  { id: 'ultje', want: 'better', p: { barcode: '4004980506206', name: 'Ultje Süß & Salzig', brand: 'Ultje', cat: 'snack', facts: { c: 36, s: 29, f: 5.5, p: 15, fat: 38 }, ingredients: '' }, carbsFirst: true },
  { id: 'skyr', want: 'ok', p: { barcode: '4002468000001', name: 'Skyr Natur', brand: 'Test', cat: 'dairy', facts: { c: 4, s: 4, p: 11, fat: 0.2 }, ingredients: 'Magermilch, Milchsäurekulturen' }, carbsFirst: true },
  { id: 'cola', want: 'spike', p: { barcode: '5000112000002', name: 'Cola', brand: 'Test', cat: 'drink', facts: { c: 10.6, s: 10.6, drink: 1 }, ingredients: 'Wasser, Zucker, Kohlensäure' } },
  { id: 'badlabel', want: 'unknown', p: { barcode: '4000000000003', name: 'Broken label', brand: 'Test', cat: 'snack', facts: { c: 10, s: 20 }, ingredients: '' } }
];
const WANT = {
  en: { ok: 'Lower estimated blood sugar impact', better: 'Moderate estimated blood sugar impact', spike: 'Higher estimated blood sugar impact', carbs: /carbs in a \d+ (g|ml) serving/ },
  de: { ok: 'Niedrigere geschätzte Wirkung auf den Blutzucker', better: 'Mittlere geschätzte Wirkung auf den Blutzucker', spike: 'Höhere geschätzte Wirkung auf den Blutzucker', carbs: /Kohlenhydrate in einer Portion von \d+ (g|ml)/ },
  es: { ok: 'Impacto estimado más bajo en el azúcar en sangre', better: 'Impacto estimado moderado en el azúcar en sangre', spike: 'Impacto estimado más alto en el azúcar en sangre', carbs: /carbohidratos en una ración de \d+ (g|ml)/ }
};
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
      // scanfe-e: quality / cravings / reasons / alternative ride on scanFood in the real page (not shown until g1).
      log.assess = await ev(() => { try { const o = LowiFoodEngine.scanFood({name: 'Ültje Süß & Salzig', unit: 'g', per100: {kcal: 517, fat: 33, carbs: 36, sugar: 29, fibre: 5.6, protein: 16, salt: 1.1}}, 30);
        return {loaded: !!window.LowiFoodAssess, verdict: o.verdict, quality: o.quality && o.quality.key, reasons: (o.reasons || []).map(r => r.key), alt: o.alternative && o.alternative.key, conf: o.confidence}; } catch (e) { return {error: String(e)}; } });
      if (!log.assess || !log.assess.loaded || log.assess.alt !== 'sweet_nut_snack' || !(log.assess.reasons || []).length) fails.push('food assess not wired: ' + JSON.stringify(log.assess));
      // scanfe-f1: confidence (evidence completeness) rides on scanFood; no barcode + no ingredients = Low, never High.
      if (!log.assess || log.assess.conf !== 'Low') fails.push('confidence not wired: ' + JSON.stringify(log.assess && log.assess.conf));
      if (log.reveal !== 'function') throw new Error('LowiDex.reveal is not reachable');
      for (const lang of langs) {
        await ev(l => { try { LowiLang.set(l); } catch (e) { } }, lang); await sleep(500);
        for (const it of PRODUCTS) {
          await ev(() => { document.querySelectorAll('.tut-ov,.stp-ov,[class*="wn-ov"]').forEach(x => x.remove()); });
          await ev(p => { LowiDex.reveal(JSON.parse(JSON.stringify(p))); }, it.p); await sleep(900);
          const r = await ev(() => {
            const rev = document.querySelector('.b3-rev'); if (!rev) return { none: true };
            const verd = rev.querySelector('.sc-verd'), strong = verd && verd.querySelector('strong'), why = verd && verd.querySelector('span');
            const sheet = rev.closest('.r2-sheet, .b3-ov, [class*="sheet"]') || rev;
            const out = []; const W = innerWidth, H = innerHeight;
            rev.querySelectorAll('button, .sc-verd').forEach(b => { const q = b.getBoundingClientRect(); if (q.width && (q.left < -1 || q.right > W + 1)) out.push('off x: ' + (b.textContent || '').trim().slice(0, 24)); if (b.scrollWidth > b.clientWidth + 2 && getComputedStyle(b).textOverflow !== 'ellipsis' && getComputedStyle(b).overflowX !== 'visible') out.push('clipped: ' + (b.textContent || '').trim().slice(0, 24)); });
            const vr = verd && verd.getBoundingClientRect();
            return { cls: verd ? verd.className : '', head: strong ? strong.textContent.trim() : '', why: why ? why.textContent.trim() : '', manual: !!rev.querySelector('input, textarea'), all: rev.textContent.replace(/\s+/g, ' ').slice(0, 2000), out, vr: vr ? [Math.round(vr.left), Math.round(vr.top), Math.round(vr.right), Math.round(vr.bottom)] : null, sw: document.documentElement.scrollWidth > innerWidth + 1 };
          });
          const tag = `${v} ${theme} ${lang} ${it.id}`;
          log.cards.push({ tag, head: r.head, why: r.why, cls: r.cls });
          if (r.none) { fails.push(tag + ': no card'); continue; }
          if (BAD.test(r.all)) fails.push(tag + ': says no spike');
          if (it.want === 'unknown') { if (r.head) fails.push(tag + ': expected the not-enough-data entry, got ' + r.head); if (!r.manual) fails.push(tag + ': no label entry fields'); }
          else {
            if (r.head !== WANT[lang][it.want]) fails.push(tag + ': head "' + r.head + '"');
            if (!r.cls.includes('v-' + it.want)) fails.push(tag + ': class ' + r.cls);
            if (it.carbsFirst ? !WANT[lang].carbs.test(r.why) : r.why.length < 6) fails.push(tag + ': reason "' + r.why + '"');
            if (r.vr && (r.vr[0] < 0 || r.vr[2] > (await ev(() => innerWidth)) + 1)) fails.push(tag + ': card off screen ' + JSON.stringify(r.vr));
          }
          if (it.id === 'ultje' && r.head === WANT[lang].ok) fails.push(tag + ': Ultje reads Lower');
          r.out.forEach(o => fails.push(tag + ': ' + o));
          if (r.sw) fails.push(tag + ': sideways scroll');
          if (lang === langs[0] || it.id === 'ultje') await page.screenshot({ path: path.join(OUT, `${v}-${theme}-${lang}-${it.id}.png`) });
          await ev(() => { document.querySelectorAll('.b3-ov').forEach(x => x.remove()); }); await sleep(400);
        }
      }
    } catch (e) { fails.push('run: ' + e.message.slice(0, 200)); }
    if (errs.length) fails.push('page errors: ' + errs.slice(0, 3).join(' | '));
    console.log((fails.length ? 'FAIL ' : 'PASS ') + v + ' ' + JSON.stringify({ theme: log.dataTheme, engine: log.engine, cards: log.cards.length, assess: log.assess }));
    log.cards.filter(c => /ultje|skyr/.test(c.tag)).slice(0, 6).forEach(c => console.log('   ' + c.tag + ' | ' + c.head + ' | ' + c.why));
    fails.forEach(f => console.log('   - ' + f)); if (fails.length) fail++;
    await browser.close();
  }
  if (srv) srv.close();
  process.exit(fail ? 1 : 0);
})();
