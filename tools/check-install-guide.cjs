/* Animated Add to Home Screen guide (install-guide.js, 23 Oct 2026) in real browsers.
   node tools/check-install-guide.cjs [--url https://therealetm.github.io/lowispike/] [--out DIR] [--frames]
   Without --url it serves this folder the way GitHub Pages does (under /lowispike/). Fresh browser profile per case.
   Per case (iPhone SE / iPhone 13 / iPad Safari, Instagram on iPhone, Pixel Chrome, Samsung Internet, TikTok on Android; EN + DE):
   - the first screen shows the animated walkthrough with iPhone/Android preselected, the right path, the caption in that language
   - phone, caption, chooser, main button and Continue are on screen and not covered; it animates (caption changes)
   - switching to the other device shows the other path; iPhone Safari shows the pulsing arrow at the real ••• button
   - the overlay (Today hint / Profile) opens; on Android a beforeinstallprompt gives a one-tap Install that calls prompt()
   - opened from the Home Screen with fresh storage: the Misty success moment, no guide
   --frames writes one PNG per walkthrough step (iPhone Safari + Android Chrome) for the storyboard. Exits 1 on any failure. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, '/tmp/pw/node_modules/playwright', path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..'), OUT = path.resolve(arg('out', '/tmp/ig-check')), FRAMES = A.includes('--frames');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fails = [], rows = [];
const fail = (w, m) => { fails.push(w + ': ' + m); console.log('FAIL', w, m); };
function serve() {
  return new Promise(r => { const s = http.createServer((q, res) => {
    let u = decodeURIComponent(q.url.split('?')[0]); if (!u.startsWith('/lowispike/')) { res.writeHead(404); res.end(); return; }
    u = u.slice('/lowispike'.length); if (u.endsWith('/')) u += 'index.html';
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
  }); s.listen(0, '127.0.0.1', () => r(s)); });
}
const iosUA = d => pw.devices[d].userAgent;
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36';
const CASES = [];
for (const lang of ['en', 'de']) {
  for (const d of ['iPhone SE', 'iPhone 13']) CASES.push({ engine: 'webkit', device: d, name: 'safari', lang, dev: 'ios', first: 'sbar', n: 6, coach: true });
  CASES.push({ engine: 'webkit', device: 'iPad (gen 7)', name: 'safari', lang, dev: 'ios', first: 'crbar', n: 5, coach: true, ua: pw.devices['iPad (gen 7)'].userAgent });
  CASES.push({ engine: 'webkit', device: 'iPhone 13', name: 'instagram', lang, dev: 'ios', first: 'iab', n: 8, ua: iosUA('iPhone 13') + ' Instagram 350.0.0.0.0 (iPhone14,5; iOS 18_0; de_DE)' });
  CASES.push({ engine: 'chromium', device: 'Pixel 7', name: 'android-chrome', lang, dev: 'android', first: 'abar', n: 4, bip: true });
  CASES.push({ engine: 'chromium', device: 'Pixel 7', name: 'samsung', lang, dev: 'android', first: 'abar', n: 5, ua: SAMSUNG });
  CASES.push({ engine: 'chromium', device: 'Pixel 7', name: 'android-tiktok', lang, dev: 'android', first: 'iab', n: 6, ua: pw.devices['Pixel 7'].userAgent.replace('Chrome/', 'wv) Chrome/') + ' trill_350001 BytedanceWebview/d8a21c6' });
}
const CAP1 = { sbar: { en: 'Tap ••• at the bottom right', de: 'Tippe unten rechts auf •••' }, iab: { en: 'Tap ••• at the top right', de: 'Tippe oben rechts auf •••' }, abar: { en: null, de: null }, crbar: { en: 'Tap Share at the top right', de: 'Tippe oben rechts auf Teilen' } };
const slug = c => [c.name, c.device.replace(/[^\w]+/g, '-'), c.lang].join('_').toLowerCase();
async function ctx(browser, c, init) {
  const dev = pw.devices[c.device];
  const x = await browser.newContext({ ...dev, userAgent: c.ua || dev.userAgent, locale: c.lang === 'de' ? 'de-DE' : 'en-US' });
  await x.route(/supabase\.co/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  if (init) await x.addInitScript(init);
  return x;
}
async function setLang(page, lang) { const on = await page.$('#r2gate .a2-lang.on'); const cur = on ? await on.getAttribute('data-lang') : 'en';
  if (cur !== lang) { await page.click('#r2gate .a2-lang[data-lang="' + lang + '"]'); await sleep(900); } }
async function layout(page) { return page.evaluate(() => {
  const g = document.querySelector('#r2gate .a1'); if (!g) return { err: 'no guide' };
  const vw = innerWidth, vh = innerHeight, out = [];
  for (const [n, sel] of [['title', '.a1-h'], ['chooser', '.ig-pick'], ['phone', '.ig-phone'], ['caption', '.ig-cap'], ['main button', '.a1-acts .r2-btn.pri'], ['continue', '.a1-cont']]) {
    const e = g.querySelector(sel); if (!e) { out.push(n + ' missing'); continue; }
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (r.width < 20 || r.height < 14 || cs.visibility === 'hidden' || +cs.opacity < 0.5) { out.push(n + ' not visible (' + Math.round(r.width) + 'x' + Math.round(r.height) + ')'); continue; }
    if (r.top < -1 || r.bottom > vh + 1 || r.left < -1 || r.right > vw + 1) out.push(n + ' off screen (' + [r.left, r.top, r.right, r.bottom].map(Math.round) + ' in ' + vw + 'x' + vh + ')');
    const cx = Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(vh - 1, Math.max(0, r.top + Math.min(r.height / 2, 20)));
    const hit = document.elementFromPoint(cx, cy); if (hit && !e.contains(hit) && !hit.contains(e) && !hit.closest('#igCoach')) out.push(n + ' covered by ' + hit.tagName + '.' + String(hit.className).slice(0, 40));
  }
  const ph = g.querySelector('.ig-phone'), pr = ph ? ph.getBoundingClientRect() : { width: 0, height: 0 };
  return { problems: out, dev: (g.querySelector('.ig') || {}).getAttribute && g.querySelector('.ig').getAttribute('data-ig-dev'), pressed: (g.querySelector('.ig-pb[aria-pressed="true"]') || {}).textContent,
    frames: [...g.querySelectorAll('.ig-f')].map(f => f.className.replace(/ig-f ig-f-| on| tap/g, '')), cap: (g.querySelector('.ig-ct') || {}).textContent, phone: [Math.round(pr.width), Math.round(pr.height)], scrFont: parseFloat(getComputedStyle(g.querySelector('.ig-scr')).fontSize),
    main: (g.querySelector('.a1-acts .r2-btn.pri') || {}).innerText, coach: !!document.querySelector('#igCoach .ig-arrow'), scroll: document.scrollingElement.scrollHeight > vh + 2 };
}); }
async function runCase(browser, base, c) {
  const w = slug(c), init = c.bip ? () => { window.__bipCalls = 0; } : null, x = await ctx(browser, c, init), page = await x.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  const row = { case: w };
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    try { await page.waitForSelector('#r2gate .a1', { timeout: 25000 }); } catch (e) { fail(w, 'no guide after 25 s'); return; }
    await sleep(2200); await setLang(page, c.lang); await sleep(300);
    await page.evaluate(() => { const d = document.querySelector('.ig .ig-dot'); if (d) d.click(); const g = document.querySelector('.ig'); if (g) g.__hold = 0; });   /* back to step 1, keep playing */
    const L = await layout(page); Object.assign(row, L);
    if (L.err) { fail(w, L.err); return; }
    if (L.dev !== c.dev) fail(w, 'preselected ' + L.dev + ', want ' + c.dev);
    if (L.frames.length !== c.n) fail(w, L.frames.length + ' steps, want ' + c.n + ': ' + L.frames.join(' > '));
    if (L.frames[0] !== c.first) fail(w, 'first step ' + L.frames[0] + ', want ' + c.first);
    const want = c.first === 'iab' && c.dev === 'android' ? { en: 'Tap ⋮ at the top right', de: 'Tippe oben rechts auf ⋮' }[c.lang] : CAP1[c.first][c.lang]; if (want && L.cap !== want) fail(w, 'caption "' + L.cap + '", want "' + want + '"');
    if (c.lang === 'de' && /^Tap /.test(L.cap)) fail(w, 'caption not German: ' + L.cap);
    for (const p of L.problems) fail(w, p);
    if (L.phone[1] < 110) fail(w, 'phone animation too small ' + L.phone);
    /* the mock text scales with the phone: 25 px text in a 130 px phone was the cut-off OWiSPIK bug (cqw resolved against the viewport) */
    if (L.phone[1] < 240) fail(w, 'phone animation too small to read ' + L.phone);
    if (!(L.scrFont >= 9.5 && L.scrFont <= L.phone[0] * 0.09)) fail(w, 'mock text ' + L.scrFont + 'px does not fit a ' + L.phone[0] + 'px phone');
    const wantCoach = c.coach; if (!!L.coach !== !!wantCoach) fail(w, 'coach arrow ' + L.coach + ', want ' + !!wantCoach);
    await page.screenshot({ path: path.join(OUT, w + '.png') });
    const cap0 = L.cap; await sleep(3200); let cap1 = await page.$eval('.ig-ct', e => e.textContent);
    if (cap0 === cap1) { await sleep(2800); cap1 = await page.$eval('.ig-ct', e => e.textContent); }
    if (cap0 === cap1) fail(w, 'does not animate');
    const tapped = await page.waitForSelector('.ig-f.on.tap', { timeout: 3000 }).then(() => true).catch(() => false); if (!tapped) fail(w, 'no tap ripple');
    /* switch device */
    const other = c.dev === 'ios' ? 'android' : 'ios';
    await page.click('.ig-pb[data-v="' + other + '"]'); await sleep(250);
    const sw = await page.evaluate(() => ({ dev: document.querySelector('.ig').getAttribute('data-ig-dev'), f: [...document.querySelectorAll('.ig-f')].map(f => f.className.replace(/ig-f ig-f-| on| tap/g, '')) }));
    if (sw.dev !== other) fail(w, 'switch to ' + other + ' did not work');
    if (other === 'android' && !sw.f.includes('adlg')) fail(w, 'Android path missing after switch: ' + sw.f.join(' > '));
    if (other === 'ios' && !sw.f.includes('a2hs')) fail(w, 'iPhone path missing after switch: ' + sw.f.join(' > '));
    row.switched = sw.f.join(' > ');
    /* overlay */
    if (c.bip) await page.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = () => { window.__bipCalls++; }; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(e); });
    await page.click('#r2gate [data-a1="continue"]'); await sleep(900);
    const ov = await page.evaluate(() => { const ok = window.LowiIG && LowiIG.open(); const o = document.getElementById('igOv'); return { ok, has: !!o, player: !!(o && o.querySelector('.ig-phone')), install: !!(o && o.querySelector('[data-ig="install"]:not([hidden])')), btns: o ? [...o.querySelectorAll('.ig-acts button:not([hidden])')].map(b => b.innerText.trim()) : [] }; });
    row.overlay = ov;
    /* can a finger reach it? (while the gate is up index.html hides and inerts everything outside #r2gate) */
    const reach = await page.evaluate(() => { const o = document.getElementById('igOv'); if (!o) return 'none'; const out = []; o.querySelectorAll('.ig-acts button:not([hidden]), .ig-ovx').forEach(b => { const r = b.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!h || !b.contains(h)) out.push((b.getAttribute('data-ig') || b.className) + ' covered by ' + (h ? (h.id || String(h.className).split(' ')[0] || h.tagName) : 'nothing') + ' ' + Math.round(r.height) + 'px'); if (r.height > 64) out.push((b.getAttribute('data-ig') || '') + ' is ' + Math.round(r.height) + 'px tall'); }); return out.join('; '); });
    if (reach) fail(w, 'overlay buttons not tappable: ' + reach);
    if (!ov.has || !ov.player) fail(w, 'overlay did not open ' + JSON.stringify(ov));
    if (c.bip) {
      if (!ov.install) fail(w, 'no one-tap Install with beforeinstallprompt');
      else { await sleep(600); await page.click('#igOv [data-ig="install"]', { force: true }); await sleep(200); const n = await page.evaluate(() => window.__bipCalls); if (n !== 1) fail(w, 'Install did not open the system dialog (prompt calls ' + n + ')'); row.prompt = n; }
    }
    await page.screenshot({ path: path.join(OUT, w + '_overlay.png') });
    if (c.coach && /iPhone/.test(c.device)) { await page.evaluate(() => document.querySelector('#igOv [data-ig="where"]').click()); await sleep(400); const cb = await page.evaluate(() => { const b = document.querySelector('#igCoach .ig-cb'); if (!b) return null; { const r0 = b.getBoundingClientRect(); const h0 = document.elementFromPoint(r0.left + r0.width / 2, r0.top + r0.height / 2); if (!h0 || !b.contains(h0)) return { covered: h0 ? (h0.id || String(h0.className)) : 'nothing' }; } const r = document.querySelector('#igCoach .ig-arrow').getBoundingClientRect(); return { t: b.innerText.replace(/\s+/g, ' '), r: Math.round(innerWidth - r.right), b: Math.round(innerHeight - r.bottom) }; });
      if (!cb) fail(w, 'Show me where did not show the arrow'); else if (cb.covered) fail(w, 'arrow hidden behind ' + cb.covered); else { row.coach = cb; if (cb.r > 30 || cb.b > 40) fail(w, 'arrow not at the bottom right ' + JSON.stringify(cb)); await page.screenshot({ path: path.join(OUT, w + '_coach.png') }); } }
  } catch (e2) { fail(w, 'error ' + e2.message.split('\n')[0]); }
  finally { if (errs.length) fail(w, 'page errors: ' + errs.slice(0, 3).join(' | ')); rows.push(row); console.log((fails.some(f => f.startsWith(w + ':')) ? 'BAD ' : 'ok  ') + w, '|', row.cap || '', '|', (row.frames || []).join(' > ')); await x.close(); }
}
async function welcome(browser, base, c, w) {
  const x = await ctx(browser, c, () => { Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true }); const mm = window.matchMedia.bind(window); window.matchMedia = q => /display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q); });
  const page = await x.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  try { await page.goto(base, { waitUntil: 'domcontentloaded' }); await sleep(5000);
    const st = await page.evaluate(() => ({ welcomeHit: (() => { const c = document.querySelector('#igWelcome .ig-wcard'); if (!c) return null; const r = c.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(h && c.contains(h)) && getComputedStyle(c).visibility !== 'hidden'; })(), welcome: !!document.querySelector('#igWelcome'), text: (document.querySelector('#igWelcome') || {}).textContent, guide: !!document.querySelector('#r2gate .a1'), coach: !!document.querySelector('#igCoach'), open: window.LowiIG.open() }));
    if (!st.welcome) fail(w, 'no success moment on the first start from the Home Screen'); else if (st.welcomeHit === false) fail(w, 'success bubble is hidden or covered'); if (st.guide) fail(w, 'guide shown in the Home Screen app'); if (st.coach) fail(w, 'arrow shown in the Home Screen app'); if (st.open) fail(w, 'overlay opens in the Home Screen app');
    await page.screenshot({ path: path.join(OUT, w + '.png') });
    await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(3000);
    if (await page.$('#igWelcome')) fail(w, 'success moment shown twice');
    console.log((fails.some(f => f.startsWith(w + ':')) ? 'BAD ' : 'ok  ') + w, JSON.stringify(st)); rows.push({ case: w, ...st });
  } catch (e) { fail(w, 'error ' + e.message.split('\n')[0]); } finally { if (errs.length) fail(w, 'page errors: ' + errs.slice(0, 3).join(' | ')); await x.close(); }
}
/* one PNG per walkthrough step, for the storyboard */
async function frames(browser, base, c, tag) {
  const x = await ctx(browser, c), page = await x.newPage();
  try { await page.goto(base, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('#r2gate .a1 .ig', { timeout: 25000 }); await sleep(1500); await setLang(page, c.lang);
    await page.addStyleTag({ content: '.ig-f{transition:none!important}' });
    const n = await page.$$eval('.ig-f', f => f.length);
    for (let i = 0; i < n; i++) { await page.evaluate(i => { document.querySelectorAll('.ig .ig-dot')[i].click(); }, i); await sleep(1400);
      await page.evaluate(() => { const f = document.querySelector('.ig-f.on'); if (f) f.classList.remove('tap'); });
      const cap = await page.$eval('.ig-ct', e => e.textContent); const el = await page.$('.ig-phone'); await el.screenshot({ path: path.join(OUT, 'frame_' + tag + '_' + (i + 1) + '.png') });
      fs.appendFileSync(path.join(OUT, 'frames.txt'), tag + '\t' + (i + 1) + '\t' + cap + '\n'); }
  } finally { await x.close(); }
}
(async () => {
  let srv = null, base = arg('url', '');
  if (!base) { srv = await serve(); base = 'http://127.0.0.1:' + srv.address().port + '/lowispike/'; }
  const chromium = await pw.chromium.launch(); let webkit = null; try { webkit = await pw.webkit.launch(); } catch (e) { console.log('(WebKit cannot start here, iPhone/iPad cases run in Chromium with the iPhone/iPad size and user agent)'); }
  const B = { webkit: webkit || chromium, chromium };
  if (FRAMES) { try { fs.unlinkSync(path.join(OUT, 'frames.txt')); } catch (e) {}
    await frames(B.webkit, base, { device: 'iPhone 13', lang: 'de' }, 'ios'); await frames(B.chromium, base, { device: 'Pixel 7', lang: 'de' }, 'android'); }
  else {
    for (const c of CASES) { if (!webkit || c.engine === 'chromium') { try { await B.chromium.close(); } catch (e) {} B.chromium = await pw.chromium.launch(); if (!webkit) B.webkit = B.chromium; } await runCase(B[c.engine], base, c); }
    await welcome(B.webkit, base, { device: 'iPhone 13', lang: 'de' }, 'welcome_iphone-13');
    await welcome(B.chromium, base, { device: 'Pixel 7', lang: 'en' }, 'welcome_pixel-7_fresh');
  }
  for (const b of new Set(Object.values(B))) await b.close(); if (srv) srv.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ base, fails, rows }, null, 1));
  console.log(fails.length ? '\n' + fails.length + ' FAIL' : '\n0 FAIL', '(' + rows.length + ' runs) ->', OUT);
  process.exit(fails.length ? 1 : 0);
})();
