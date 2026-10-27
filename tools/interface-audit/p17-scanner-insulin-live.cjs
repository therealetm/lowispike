'use strict';
/* P17 (27 Oct 2026): the scanner result card with a REAL product lookup (typed barcode -> Open Food Facts), checks it shows only
   Insulinfreundlich (green) / Nicht insulinfreundlich (red) and no spike level. Every non-GET request is blocked, so nothing is
   written anywhere. Usage: node p17-scanner-insulin-live.cjs <de|en|es> <iPhone 13|desktop> <dark|light> <local|live> [codes,...] */
const L = require('./lib.cjs');
const fs = require('fs'), path = require('path');
(async () => {
  const lang = process.argv[2] || 'de', device = process.argv[3] || 'iPhone 13', theme = process.argv[4] || 'dark', mode = process.argv[5] || 'local';
  const codes = (process.argv[6] || '3017620422003,4311501044158').split(',');
  const browser = await L.pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const dev = device === 'desktop' ? { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true } : Object.assign({}, L.pw.devices[device]);
  delete dev.defaultBrowserType;
  const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block', locale: lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-US', colorScheme: theme, timezoneId: 'Europe/Berlin' }));
  const REPO = path.resolve(__dirname, '..', '..');
  await ctx.route('**/*', async r => {
    const q = r.request(), u = new URL(q.url());
    if (u.protocol === 'data:' || u.protocol === 'blob:') return r.continue();
    if (q.method() !== 'GET' && q.method() !== 'HEAD') return r.abort();
    if (/supabase\.co$/.test(u.host) && !/\/rest\/v1\/products/.test(u.pathname)) return r.abort();
    if (mode === 'local' && u.host === 'therealetm.github.io') {
      let p = decodeURIComponent(u.pathname.replace(/^\/lowispike\//, '')); if (!p || p.endsWith('/')) p += 'index.html';
      const f = path.join(REPO, p); if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
      return r.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' })[path.extname(f)] || 'application/octet-stream' } });
    }
    return r.continue();
  });
  const seed = L.existingSeed({ lang });
  await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('__p17')) { sessionStorage.setItem('__p17', '1'); for (const k in s.kv) localStorage.setItem(k, s.kv[k]); for (const k in s.session) sessionStorage.setItem(k, s.session[k]); } } catch (e) {} }, seed);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200)));
  await page.goto(L.BASE + '?v=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.LowiDex && typeof window.LowiDex.scan === 'function', null, { timeout: 90000 });
  await L.sleep(4000);
  await page.evaluate(th => { document.documentElement.setAttribute('data-ui', th); document.documentElement.setAttribute('data-theme', th); }, theme);
  const out = { build: await page.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || ''), lang, device, theme, mode, results: [] };
  for (const code of codes) {
    await page.evaluate(() => { try { document.querySelectorAll('.b3-close,[data-act="close"]').forEach(() => {}); } catch (e) {} });
    await page.evaluate(() => window.LowiDex.scan('type'));
    await page.waitForSelector('#b3Bc', { timeout: 15000 });
    await page.fill('#b3Bc', code);
    await page.evaluate(() => { const f = document.querySelector('#b3BcF'); f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })); });
    let card = null;
    for (let i = 0; i < 40 && !card; i++) {
      await L.sleep(500);
      card = await page.evaluate(() => {
        const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; };
        const roots = [...document.querySelectorAll('.ss-card,.sscan,.shop-scan,[class*="ss-"],.fc-card,.sc-card,.b3-stage')].filter(vis);
        const txt = roots.map(e => e.innerText).join(' \n ');
        if (!/insulin/i.test(txt)) return null;
        const word = [...document.querySelectorAll('*')].filter(e => vis(e) && e.children.length === 0 && /insulin/i.test(e.textContent) && e.textContent.trim().length < 40);
        return { text: txt.replace(/\s+/g, ' ').slice(0, 400), labels: word.map(e => { const s = getComputedStyle(e); let bg = s.backgroundColor, p = e; while (p && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) { p = p.parentElement; bg = p ? getComputedStyle(p).backgroundColor : bg; } return { t: e.textContent.trim(), cls: e.className, color: s.color, bg }; }), spikeLevels: /\b(mittel|medium|leve|moderado|hoch|high|alto|niedrig|low|bajo)\b.{0,12}(spike|anstieg|pico)|spike-(stufe|level)|gelb|yellow/i.test(txt) };
      });
    }
    let why = null;
    if (card) {
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(e => /^(Warum\?|Why\?|¿Por qué\?)$/.test(e.textContent.trim())); if (b) b.click(); });
      await L.sleep(1200);
      why = await page.evaluate(() => { const e = [...document.querySelectorAll('.ss-whyp')].find(x => !x.hidden); return e ? e.innerText.replace(/\s+/g, ' ').slice(0, 500) : ''; });
      if (why && /\b(Lower|Moderate|Higher|Niedriger|Mittel|Höher|Bajo|Moderado|Alto)\b/.test(why)) card.spikeLevels = true;
    }
    out.results.push({ code, why, card: card || 'NO CARD (' + (await page.evaluate(() => (document.querySelector('.b3-msg,.b3-status') || {}).textContent || '')) + ')' });
    await page.screenshot({ path: '/tmp/p17-' + mode + '-' + lang + '-' + theme + '-' + code + '.png' });
    await page.evaluate(() => { try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); } catch (e) {} });
    await L.sleep(1200);
  }
  out.sideScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  out.errors = errs;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
