'use strict';
/* Browser simulation (not a real phone) for comm-menu (23 Oct, Emmanuel): the Community header menu has no "Replies & mentions"
   entry any more; the rest of the menu is unchanged, every row is a 44 px target, no sideways scroll, no page errors.
   node tools/comm-menu/probe.cjs [--views se,i13,i15,pixel7] [--theme light|dark] [--langs en,de,es] [--url LIVE] */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), OUT = arg('out', '/tmp/comm-menu-shots');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const INIT = fs.readFileSync(path.join(ROOT, 'tests', 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const WK = process.env.ENGINE || 'webkit'; // ENGINE=chromium where WebKit's libraries are missing (Maya's VM)
const VIEWS = { se: [WK, 'iPhone SE'], i13: [WK, 'iPhone 13'], i15: [WK, 'iPhone 15'], ipad: [WK, 'iPad (gen 7)'], pixel7: ['chromium', 'Pixel 7'] };
const GONE = { en: /replies|mentions/i, de: /antworten|erwähnung/i, es: /respuestas|menciones/i };
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
      await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 150000 });
      await sleep(2500);
      for (const lang of langs) {
        const tag = `${v} ${theme} ${lang}`;
        await ev(l => { try { LowiLang.set(l); } catch (e) {} try { goTab('foryou'); } catch (e) {} }, lang); await sleep(1800);
        const ok = await page.waitForFunction(() => { const b = document.querySelector('.rm-menu-btn'); return b && b.getBoundingClientRect().width > 0; }, null, { timeout: 20000 }).then(() => 1).catch(() => 0);
        if (!ok) { fails.push(tag + ': no Community header pill'); continue; }
        await ev(() => { const m = document.querySelector('.rm-menu'); if (!m || m.hidden || !m.innerHTML) document.querySelector('.rm-menu-btn').click(); }); await sleep(700);
        const r = await ev(() => { const rows = [...document.querySelectorAll('.rm-menu [data-rmm]')].filter(b => b.getBoundingClientRect().height > 0); return { keys: rows.map(b => b.dataset.rmm), texts: rows.map(b => b.textContent.trim()), small: rows.filter(b => b.getBoundingClientRect().height < 44).map(b => b.dataset.rmm), sw: document.documentElement.scrollWidth, w: document.documentElement.clientWidth }; });
        if (!r.keys.length) fails.push(tag + ': menu did not open');
        if (r.keys.includes('replies')) fails.push(tag + ': Replies & mentions still in the menu');
        if (r.texts.some(t => GONE[lang].test(t))) fails.push(tag + ': a replies/mentions label is still shown ' + JSON.stringify(r.texts));
        for (const k of ['dir', 'invite']) if (!r.keys.includes(k)) fails.push(tag + ': ' + k + ' missing from the menu');
        if (r.keys[0] !== 'dir' || r.keys.some(k => /urooms|people|find/.test(k))) fails.push(tag + ': People is not first, or Circles / rooms are back (' + r.keys.join(',') + ')');
        if (r.small.length) fails.push(tag + ': rows under 44 px ' + r.small.join(','));
        if (r.sw > r.w + 1) fails.push(tag + ': sideways scroll ' + r.sw + '>' + r.w);
        if (lang === langs[0]) await page.screenshot({ path: path.join(OUT, `${v}-${theme}-${lang}-menu.png`) });
        console.log('  ' + tag + ' menu: ' + r.keys.join(','));
        await ev(() => { const m = document.querySelector('.rm-menu'); if (m && !m.hidden && m.innerHTML) document.querySelector('.rm-menu-btn').click(); }); await sleep(400);
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
