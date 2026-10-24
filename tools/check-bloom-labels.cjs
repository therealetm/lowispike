/* Browser check for the minimal secondary bubbles (Oct 24 2026, Emmanuel's German screenshot of every bubble at once:
   "repetitive two words", "words way too long and big", "minimal"; Kochen + Rezepte said twice; Schlucke = 10 sips, not ml).
   Real app on a local server (ROOT, default this checkout) or the live site (URL=https://therealetm.github.io/lowispike/),
   outside requests aborted on local, service worker blocked. German, English and Spanish at iPhone, small phone, iPhone sideways,
   iPad upright and sideways. For every bloom (Fuel, Water, Move, Sleep) and the all-at-once view (Hold Scan / two fingers):
   each orb's bold line sits on ONE line, no subline is cut off, every bold line in one view has the same size, no "ml",
   no repeated word, every orb on screen. Then Water: one tap on Sips = +1/2 cup, long press says "10 Schlucke" came off.
   Usage: node tools/check-bloom-labels.cjs   (SHOT=/tmp/bloom-labels-shots, URL=... for live) */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '..');
const LIVE = process.env.URL || '';
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
const SHOT = process.env.SHOT || '/tmp/bloom-labels-shots';
fs.mkdirSync(SHOT, { recursive: true });
const ALL_SIZES = [['iphone-up', 390, 844, 'de'], ['small', 360, 740, 'de'], ['iphone-side', 844, 390, 'de'], ['ipad-up', 820, 1180, 'de'], ['ipad-side', 1180, 820, 'de'], ['iphone-en', 390, 844, 'en'], ['iphone-es', 390, 844, 'es']];
const SIZES = process.env.SIZE ? ALL_SIZES.filter(s => s[0] === process.env.SIZE) : ALL_SIZES;

srv.listen(0, async () => {
  const port = srv.address().port; let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const base = LIVE || ('http://localhost:' + port + '/index.html');
  const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [name, w, h, lang] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 1000, hasTouch: true, serviceWorkers: 'block' });
    if (!LIVE) await ctx.route(u => !/^http:\/\/localhost:/.test(String(u)), r => r.abort());
    await ctx.addInitScript((lang) => { try { localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowispike.lang', lang); localStorage.setItem('lowi.lang', lang);
      const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
      sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true }));
      if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 900, ledger: [], logs: [], saved: [], lang, user: { name: 'eman', bday: '1990-01-01', tags: [] } })); } catch (e) { } }, lang);
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    await page.goto(base + (LIVE ? '?t=' + Date.now() : ''), { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(7000);
    const build = await page.evaluate(() => { const m = document.querySelector('meta[name="lowi-build"]'); return (m && m.content) || window.LOWI_BUILD || ''; });
    if (build) console.log('     build ' + build);
    const read = () => page.evaluate(() => [...document.querySelectorAll('.hb2-bloom.on .hb2-orb, .hb2-all .hb2-orb, .hb2-orb')].filter((b, i, a) => a.indexOf(b) === i && b.getBoundingClientRect().width > 0).map(o => {
      const b = o.querySelector('.hb2-tx b'), s = o.querySelector('.hb2-tx small'), r = o.getBoundingClientRect(), cs = b && getComputedStyle(b);
      const lh = cs ? (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.05) : 0;
      return { id: o.dataset.id, b: b ? b.textContent.replace(/\u2713/g, '').trim() : '', s: s ? s.textContent.trim() : '', size: cs ? parseFloat(cs.fontSize) : 0,
        lines: b ? Math.round(b.getBoundingClientRect().height / lh) : 0, cut: s ? s.scrollWidth > s.clientWidth + 1 : false, bOver: b ? b.scrollWidth > b.clientWidth + 1 : false,
        in: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, aria: o.getAttribute('aria-label') || '' };
    }));
    const checkView = async (label) => {
      await page.waitForTimeout(1300);
      const o = await read();
      ok(o.length >= 3, name + ' ' + label + ': ' + o.length + ' orbs: ' + o.map(x => x.b + (x.s ? ' [' + x.s + ']' : '') + ' ' + x.size + 'px').join(' | '));
      ok(o.every(x => x.lines === 1), name + ' ' + label + ': every bold line on one line' + (o.filter(x => x.lines !== 1).map(x => ' (' + x.b + ': ' + x.lines + ')').join('')));
      ok(o.every(x => !x.bOver && !x.cut), name + ' ' + label + ': nothing cut off' + o.filter(x => x.bOver || x.cut).map(x => ' (' + x.b + ')').join(''));
      const sizes = [...new Set(o.map(x => x.size))];
      ok(sizes.length === 1, name + ' ' + label + ': one type size for every orb (' + sizes.join(', ') + 'px)');
      ok(o.every(x => !/ml\b/i.test(x.b + ' ' + x.s)), name + ' ' + label + ': no ml');
      ok(o.every(x => !/\s/.test(x.b.replace(/\u00a0/g, ''))), name + ' ' + label + ': every bold line one word');
      ok(o.every(x => x.in), name + ' ' + label + ': every orb on screen');
      return o;
    };
    for (const k of ['fuel', 'water', 'move', 'sleep']) {
      await page.evaluate(k => window.LowiHomeBloomsV2 && LowiHomeBloomsV2.open(k), k);
      const o = await checkView(k);
      if (k === 'fuel') ok(!o.some(x => /rezept|recipe|receta/i.test(x.b + x.s)), name + ' fuel: Cook not followed by Recipes');
      if (k === 'sleep') ok(!o.some(x => /nacht|night|noche/i.test(x.b + x.s)), name + ' sleep: no repeated last-night line');
      await page.screenshot({ path: SHOT + '/' + name + '-' + k + '.png' });
      await page.evaluate(() => LowiHomeBloomsV2.close()); await page.waitForTimeout(700);
    }
    await page.evaluate(() => window.LowiHomeBloomsV2 && LowiHomeBloomsV2.openAll());
    await checkView('all');
    await page.screenshot({ path: SHOT + '/' + name + '-all.png' });
    await page.evaluate(() => LowiHomeBloomsV2.close()); await page.waitForTimeout(900);
    if (name === 'iphone-up' || name === 'iphone-en') {
      const cups = () => page.evaluate(() => { let f = {}; try { f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); } catch (e) { } const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); return +((f.water || {})[k]) || 0; });
      const c0 = await cups();
      await page.evaluate(() => LowiHomeBloomsV2.open('water')); await page.waitForTimeout(900);
      await page.evaluate(() => { const b = document.querySelector('.hb2-orb[data-id="sips"]'); if (b) b.click(); }); await page.waitForTimeout(700);
      const c1 = await cups();
      ok(c1 === c0 + 0.5, name + ': one tap on Sips (x10) = +1/2 cup (' + c0 + ' -> ' + c1 + ')');
      await page.evaluate(() => LowiHomeBloomsV2.close()); await page.waitForTimeout(1200);
      await page.evaluate(() => { window.__toasts = []; const wrap = (o, k) => { if (o && typeof o[k] === 'function' && !o[k].__w) { const f = o[k]; o[k] = function (m) { window.__toasts.push(String(m)); return f.apply(this, arguments); }; o[k].__w = 1; } }; wrap(window.LowiR2, 'toast'); wrap(window, 'toast'); });
      const toast = await page.evaluate(() => new Promise(res => { const el = document.querySelector('#whHud .wh-water'); if (!el) return res(null); const r = el.getBoundingClientRect(), o = { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
        el.dispatchEvent(new PointerEvent('pointerdown', o)); setTimeout(() => { el.dispatchEvent(new PointerEvent('pointerup', o)); setTimeout(() => res(window.__toasts.join(' | ') + ' | ' + document.body.innerText), 400); }, 900); }));
      const want = lang === 'de' ? '10 Schlucke' : '10 sips';
      ok(!!toast && toast.includes(want), name + ': long press on Water says "' + want + '" came off (' + String(toast).split(' | ')[0].slice(0, 80) + ')');
      ok((await cups()) === c0, name + ': and the half cup is gone again');
    }
    ok(!errs.length, name + ': no page errors ' + errs.join(' / '));
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fail ? fail + ' FAILED' : 'all ok');
  process.exit(fail ? 1 : 0);
});
