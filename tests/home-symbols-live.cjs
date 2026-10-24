/* 24 Oct 2026 (Emmanuel: "in German Home looks like a different font than in English"; then: symbols only). Loads the real app on a local server at 390x844
   in en and de, dumps every visible text element on Home with its computed font, and writes screenshots. Usage: node tools/home-font-lang.cjs [chromium|webkit] */
const http = require('http'), fs = require('fs'), path = require('path');
const pw = require('/tmp/pw/node_modules/playwright');
const ROOT = path.join(__dirname, '..'), ENGINE = process.argv[2] || 'chromium', OUT = process.env.SHOTS || '/tmp/home-font';
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
(async () => {
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const browser = await pw[ENGINE].launch();
  const dev = ENGINE === 'webkit' ? pw.devices['iPhone 13'] : { deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const res = {};
  for (const lang of ['en', 'de']) {
    const ctx = await browser.newContext(Object.assign({}, dev, { viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }));
    await ctx.route(u => !/^http:\/\/localhost:/.test(String(u)), r => r.abort());
    await ctx.addInitScript(lang => { try { sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowispike.lang', lang); localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true })); localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } })); if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('lowispike.v2', JSON.stringify({ setupDone: true, onboarded: true, xp: 900, ledger: [], lang, user: { name: 'eman', bday: '1990-03-01' } })); } } catch (e) {} }, lang);
    const page = await ctx.newPage();
    await page.goto('http://localhost:' + port + '/index.html', { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(8000);
    await page.screenshot({ path: OUT + '/' + ENGINE + '-' + lang + '.png' });
    res[lang] = await page.evaluate(() => {
      const out = []; const lang = document.documentElement.lang;
      for (const el of document.querySelectorAll('body *')) {
        const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
        const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > 844) continue;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        const after = getComputedStyle(el, '::after').content; const aft = after && after !== 'none' && after !== 'normal' && after !== '""' ? after : '';
        if (!own && !aft) continue;
        let p = el, hid = false; while (p) { const c = getComputedStyle(p); if (c.display === 'none' || +c.opacity === 0) { hid = true; break; } p = p.parentElement; } if (hid) continue;
        const sel = (el.closest('[data-orbit]') ? '[data-orbit=' + el.closest('[data-orbit]').dataset.orbit + '] ' : '') + el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
        out.push({ sel, text: (own || ('::after ' + aft)).slice(0, 40), ff: cs.fontFamily.slice(0, 60), fs: cs.fontSize, fw: cs.fontWeight, ls: cs.letterSpacing, tt: cs.textTransform, lh: cs.lineHeight, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), lang: el.closest('[lang]') ? el.closest('[lang]').getAttribute('lang') : '' });
      }
      return { lang, htmlCls: document.documentElement.className.slice(0, 300), out, dom: [...document.querySelectorAll('[data-orbit]')].map(e => e.outerHTML.replace(/url\([^)]*\)/g,'url()').slice(0, 700)) };
    });
    await ctx.close();
  }
  fs.writeFileSync(OUT + '/' + ENGINE + '.json', JSON.stringify(res, null, 1));
  for (const lang of ['en', 'de']) { console.log('== ' + lang + ' html lang=' + res[lang].lang); if (lang === 'de') res[lang].dom.forEach(d => console.log('DOM ' + d)); for (const o of res[lang].out) console.log([o.sel, JSON.stringify(o.text), o.ff, o.fs, o.fw, o.ls, o.tt, o.x + ',' + o.y + ' ' + o.w + 'x' + o.h, o.lang].join(' | ')); }
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
