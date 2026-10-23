'use strict';
/* Browser check for the serving selector (scanfe-g2, Oct 23 2026). iPhone SE, 13, 15 (WebKit) and Pixel 7 (Chromium), Day or Night,
   EN/DE/ES. Opens the barcode card for three label fixtures through the app's own reveal() and checks: the portion block starts at
   the pack serving (else the usual portion; ml for drinks) and the Food check card is rated for the same amount; tapping a quick pick
   and typing an amount re-rate the estimate line, the Food check card and Details live, to what the engine says for that amount, while
   the number field keeps focus; the chips are at least 44 px tall, everything fits, never "no spike", no page errors; closing and
   opening the card again goes back to the default. Local fixture session, every non-GET and off-site request blocked. Browser
   simulation, not a real phone.
     node tests/serving-pick-live.cjs [--root DIR | --url https://therealetm.github.io/lowispike/] [--out DIR] [--views se,i13,i15,pixel7] [--theme light|dark] [--langs en,de,es]
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/serving-pick-shots');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const VIEWS = { se: ['webkit', 'iPhone SE'], i13: ['webkit', 'iPhone 13'], i15: ['webkit', 'iPhone 15'], pixel7: ['chromium', 'Pixel 7'] };
const PRODUCTS = [
  { id: 'ultje', start: 30, unit: 'g', pick: 150, type: 60, p: { barcode: '4004980506206', name: 'Ultje Süß & Salzig', brand: 'Ultje', cat: 'snack', facts: { c: 36, s: 29, f: 5.5, p: 15, fat: 38, kcal: 517, q: '150 g' }, ingredients: '' } },
  { id: 'muesli', start: 40, unit: 'g', pick: 100, type: 120, p: { barcode: '4000000000101', name: 'Crunchy Müsli', brand: 'Test', cat: 'cereal', facts: { c: 64, s: 22, f: 6, p: 9, fat: 14, kcal: 450, sv: 40, q: '750 g' }, ingredients: 'Haferflocken, Zucker, Weizenmehl' } },
  { id: 'cola', start: 250, unit: 'ml', pick: 330, type: 100, p: { barcode: '5000112000002', name: 'Cola', brand: 'Test', cat: 'drink', facts: { c: 10.6, s: 10.6, drink: 1, q: '330 ml' }, ingredients: 'Wasser, Zucker, Kohlensäure' } }
];
const HEAD = {
  en: { ok: 'Lower estimated blood sugar impact', better: 'Moderate estimated blood sugar impact', spike: 'Higher estimated blood sugar impact' },
  de: { ok: 'Niedrigere geschätzte Wirkung auf den Blutzucker', better: 'Mittlere geschätzte Wirkung auf den Blutzucker', spike: 'Höhere geschätzte Wirkung auf den Blutzucker' },
  es: { ok: 'Impacto estimado más bajo en el azúcar en sangre', better: 'Impacto estimado moderado en el azúcar en sangre', spike: 'Impacto estimado más alto en el azúcar en sangre' }
};
const BAD = /no blood sugar spike|kein Blutzucker-Spike|no te sube el azúcar|No spike|Kein Spike/i;
const num = s => +(String(s).replace(/\s/g, '').match(/\d+(?:[.,]\d+)?/) || ['0'])[0].replace(',', '.');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = arg('url', '') ? null : await serve();
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
  const theme = arg('theme', 'dark'), langs = arg('langs', 'en,de,es').split(',');
  let fail = 0;
  for (const v of arg('views', 'se,i13,i15,pixel7').split(',')) {
    const [eng, dev] = VIEWS[v], fails = [], log = [];
    const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
    const ctx = await browser.newContext(Object.assign({}, pw.devices[dev], { serviceWorkers: 'block' }));
    await ctx.addInitScript(t => { try { localStorage.setItem('lowi.theme', t); localStorage.removeItem('lowi.portion.v1'); } catch (e) {} }, theme);
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
    await ctx.addInitScript(INIT);
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    const ev = (fn, a) => page.evaluate(fn, a);
    const state = () => ev(() => {
      const rev = document.querySelector('.b3-rev'); if (!rev) return { none: true };
      const verd = rev.querySelector('.sc-verd'), fc = rev.querySelector('.fc-card'), box = rev.querySelector('.ns-portion'), inp = box && box.querySelector('.ns-g');
      const W = innerWidth, out = [];
      rev.querySelectorAll('button, .sc-verd, .ns-portion, .fc-card').forEach(b => { const q = b.getBoundingClientRect(); if (q.width && (q.left < -1 || q.right > W + 1)) out.push('off x: ' + (b.textContent || '').trim().slice(0, 24)); });
      const chips = box ? [...box.querySelectorAll('.ns-chip')].map(c => ({ g: +c.getAttribute('data-g'), on: c.getAttribute('aria-pressed') === 'true', h: Math.round(c.getBoundingClientRect().height), t: c.textContent.trim() })) : [];
      return { head: verd ? (verd.querySelector('strong') || {}).textContent : '', cls: verd ? verd.className : '', why: verd ? ((verd.querySelector('span') || {}).textContent || '') : '',
        fcv: fc ? fc.getAttribute('data-fc-verdict') : '', fsrv: fc ? ((fc.querySelector('.fc-srv small') || {}).textContent || '') : '', det: !!rev.querySelector('details.sc-more .fc-det'),
        g: inp ? +inp.value : 0, unit: box ? ((box.querySelector('.ns-gw span') || {}).textContent || '') : '', lab: box ? ((box.querySelector('.ns-plab') || {}).textContent || '') : '', chips,
        focus: !!(document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('ns-g')), cardV: ((document.querySelector('#b3Card') || {}).className || '').match(/v-\w+/g),
        all: rev.textContent.replace(/\s+/g, ' ').slice(0, 2500), out, sw: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    const engine = (p, g) => ev(([p, g]) => { const a = LowiSpikeCore.assess(JSON.parse(JSON.stringify(p)), g ? { servingG: g } : undefined); const m = LowiFoodCard.model(JSON.parse(JSON.stringify(p)), g); return { verdict: a.verdict, fc: m && m.verdict }; }, [p, g]);
    // a slow simulator can lag behind the 120 ms redraw: wait up to 4 s for the card to show the amount, then check everything
    const settle = g => ev(g => new Promise(res => { const t0 = Date.now(); (function f() { const s = document.querySelector('.b3-rev .fc-srv small'); const n = s ? +(s.textContent.match(/\d+/) || [0])[0] : 0; if (n === g || Date.now() - t0 > 4000) setTimeout(res, 150); else setTimeout(f, 100); })(); }), g);
    const check = async (tag, it, s, g, lang) => {
      if (s.none) return fails.push(tag + ': no card');
      const e = await engine(it.p, g);
      if (s.head !== HEAD[lang][e.verdict]) fails.push(tag + ': head "' + s.head + '" want ' + e.verdict);
      if (!s.cls.includes('v-' + e.verdict)) fails.push(tag + ': class ' + s.cls);
      if (!(s.cardV || []).includes('v-' + e.verdict)) fails.push(tag + ': card class ' + s.cardV);
      if (s.fcv !== e.fc) fails.push(tag + ': food card ' + s.fcv + ' want ' + e.fc);
      if (num(s.fsrv) !== g) fails.push(tag + ': food card serving "' + s.fsrv + '" want ' + g);
      if (!s.fsrv.includes(it.unit)) fails.push(tag + ': food card unit "' + s.fsrv + '"');
      if (s.g !== g) fails.push(tag + ': portion field ' + s.g + ' want ' + g);
      if (s.unit !== it.unit) fails.push(tag + ': portion unit ' + s.unit);
      if (!s.det) fails.push(tag + ': Details lost the food check');
      if (s.chips.length < 2) fails.push(tag + ': quick picks ' + s.chips.length);
      if (s.chips.some(c => c.h < 44)) fails.push(tag + ': chip under 44 px');
      if (s.chips.filter(c => c.on).length > 1 || (s.chips.some(c => c.g === g) && !s.chips.some(c => c.on && c.g === g))) fails.push(tag + ': pressed chip ' + JSON.stringify(s.chips.map(c => c.g + (c.on ? '*' : ''))));
      if (BAD.test(s.all)) fails.push(tag + ': says no spike');
      if (s.sw) fails.push(tag + ': sideways scroll');
      s.out.forEach(o => fails.push(tag + ': ' + o));
      log.push(tag + ' | ' + s.head + ' | ' + s.fcv + ' | ' + s.fsrv + ' | ' + s.lab);
    };
    try {
      await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
      await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiSpikeCore && window.LowiFoodCard && window.LowiNutriStats && LowiNutriStats.servingFor && window.LowiDex, null, { timeout: 150000 });
      await sleep(3500);
      for (const lang of langs) {
        await ev(l => { try { LowiLang.set(l); } catch (e) { } }, lang); await sleep(500);
        for (const it of PRODUCTS) {
          const tag = `${v} ${theme} ${lang} ${it.id}`, open = async () => {
            await ev(() => { document.querySelectorAll('.tut-ov,.stp-ov,[class*="wn-ov"],.b3-ov').forEach(x => x.remove()); });
            await ev(p => { LowiDex.reveal(JSON.parse(JSON.stringify(p))); }, it.p); await sleep(900);
          };
          await open();
          await check(tag + ' start', it, await state(), it.start, lang);
          await ev(() => { const b = document.querySelector('.b3-rev .ns-portion'); if (b) b.scrollIntoView({ block: 'center', behavior: 'instant' }); });
          // the sheet slides / scrolls into place: wait until the chip stops moving before a real tap
          await ev(() => new Promise(res => { let last = null, same = 0; const t0 = Date.now(); (function f() { const c = document.querySelector('.b3-rev .ns-chip'); const y = c ? Math.round(c.getBoundingClientRect().top) : 0; same = y === last ? same + 1 : 0; last = y; if (same >= 3 || Date.now() - t0 > 9000) res(); else setTimeout(f, 150); })(); }));
          // a real touch at the chip's centre (Playwright's own stability wait never settles on this sheet in headless WebKit)
          const pt = await ev(g => { const c = document.querySelector(`.b3-rev .ns-chip[data-g="${g}"]`); if (!c) return null; const q = c.getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2, hit = document.elementFromPoint(x, y); return { x, y, ok: !!(hit && c.contains(hit)), hit: hit ? (hit.className || hit.tagName) + '@' + Math.round(y) + '/' + innerHeight : 'none' }; }, it.pick);
          if (!pt) fails.push(tag + ': no chip ' + it.pick); else { if (!pt.ok) fails.push(tag + ': chip ' + it.pick + ' is covered by ' + pt.hit); await page.touchscreen.tap(pt.x, pt.y); }
          await settle(it.pick);
          await check(tag + ' pick ' + it.pick, it, await state(), it.pick, lang);
          if (lang === langs[0] || it.id === 'ultje') { await ev(() => { const f = document.querySelector('.b3-rev .sc-verd'); if (f) f.scrollIntoView({ block: 'start' }); }); await sleep(250); await page.screenshot({ path: path.join(OUT, `${v}-${theme}-${lang}-${it.id}-pick.png`) }); }
          const inp = page.locator('.b3-rev .ns-portion .ns-g').first();
          await inp.tap({ timeout: 8000 }).catch(() => {});
          await inp.fill(String(it.type)).catch(e => fails.push(tag + ': type ' + e.message.slice(0, 80)));
          await settle(it.type);
          const t = await state();
          if (!t.focus) fails.push(tag + ': the amount field lost focus while typing');
          await check(tag + ' typed ' + it.type, it, t, it.type, lang);
          await ev(() => { if (document.activeElement) document.activeElement.blur(); }); await sleep(200);
          await open();
          await check(tag + ' reopen', it, await state(), it.start, lang);
          await ev(() => { document.querySelectorAll('.b3-ov').forEach(x => x.remove()); }); await sleep(300);
        }
      }
    } catch (e) { fails.push('run: ' + e.message.slice(0, 200)); }
    if (errs.length) fails.push('page errors: ' + errs.slice(0, 3).join(' | '));
    console.log((fails.length ? 'FAIL ' : 'PASS ') + v + ' ' + theme + ' ' + log.length + ' states');
    log.filter(l => /ultje/.test(l)).slice(0, 8).forEach(l => console.log('   ' + l));
    fails.slice(0, 25).forEach(f => console.log('   - ' + f)); if (fails.length) fail++;
    await browser.close();
  }
  if (srv) srv.close();
  process.exit(fail ? 1 : 0);
})();
