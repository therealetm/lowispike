/* Add to Home Screen guide for brand-new visitors, in real browsers (21 Oct 2026, "when someone new opens the link to our app
   they clearly get the instructions to add this to their home screen, and how").
   node tools/a2hs/guide-check.cjs [--url https://therealetm.github.io/lowispike/] [--out DIR] [--quick] [--only REGEX on the case name]
   Without --url it serves this folder the way GitHub Pages does (under /lowispike/). Every run is a fresh browser profile
   (nothing stored, not opened from the Home Screen). Checks, per browser, size and language:
   - the guide is the first screen a new visitor gets, with a title, the phone animation and three numbered steps, all on screen
     without scrolling and not covered, in the right language; the steps animate; the button text is right for that browser
   - "Continue in the browser" goes on to the companion start; "I added it" shows "Now open it from your Home Screen"
   - a visitor who is already in the companion onboarding still gets the guide at "Create account" (with a Back button)
   - opened from the Home Screen (standalone) and on a computer: no guide
   Exits 1 on any failure; writes screenshots and report.json to DIR. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, '/tmp/pw/node_modules/playwright', path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ONLY = arg('only', '') ? new RegExp(arg('only', '')) : null, ROOT = path.resolve(__dirname, '..', '..'), OUT = path.resolve(arg('out', '/tmp/a2hs-check')), QUICK = A.includes('--quick');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
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
const IOS_UA = d => pw.devices[d].userAgent;
const UAS = {
  safari: d => IOS_UA(d),
  chrome: d => IOS_UA(d).replace(/Version\/[\d.]+ (Mobile\/\w+ )?Safari\/[\d.]+/, 'CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1'),
  tiktok: d => IOS_UA(d) + ' musical_ly_36.5.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/DE BytedanceWebview/d8a21c6',
  instagram: d => IOS_UA(d) + ' Instagram 350.0.0.0.0 (iPhone14,5; iOS 18_0; en_US; en; scale=3.00; 1170x2532; 640000000)'
};
/* expected, per browser: title, first step and the main button, in English and German */
const EXP = {
  ios: { en: ['Put LOWiSPIKE on your Home Screen', 'Tap Share', 'I added it'], de: ['Hol dir LOWiSPIKE auf den Home-Bildschirm', 'Tippe auf Teilen', 'Hab ich hinzugefügt'] },
  inapp: { en: ['Open LOWiSPIKE in your browser', 'Tap the three dots', 'Open in Safari'], de: ['Öffne LOWiSPIKE in deinem Browser', 'Tippe auf die drei Punkte', 'In Safari öffnen'] },
  inappA: { en: ['Open LOWiSPIKE in your browser', 'Tap the three dots', 'Open in browser'], de: ['Öffne LOWiSPIKE in deinem Browser', 'Tippe auf die drei Punkte', 'Im Browser öffnen'] },
  android: { en: ['Install LOWiSPIKE on your phone', 'Tap the menu', 'I added it'], de: ['Installiere LOWiSPIKE auf deinem Handy', 'Tippe auf das Menü', 'Hab ich hinzugefügt'] }
};
const IOS_DEV = QUICK ? ['iPhone 13'] : ['iPhone SE', 'iPhone 13', 'iPad (gen 7)'];
const CASES = [];
for (const lang of ['en', 'de']) {
  for (const d of IOS_DEV) CASES.push({ engine: 'webkit', device: d, browser: 'safari', kind: 'ios', lang });
  for (const d of QUICK ? ['iPhone 13'] : ['iPhone SE', 'iPhone 13']) {
    CASES.push({ engine: 'webkit', device: d, browser: 'chrome', kind: 'ios', lang });
    CASES.push({ engine: 'webkit', device: d, browser: 'tiktok', kind: 'inapp', lang });
    CASES.push({ engine: 'webkit', device: d, browser: 'instagram', kind: 'inapp', lang });
  }
  CASES.push({ engine: 'chromium', device: 'Pixel 5', browser: 'android-chrome', kind: 'android', lang });
  CASES.push({ engine: 'chromium', device: 'Pixel 5', browser: 'android-tiktok', kind: 'inappA', lang, ua: pw.devices['Pixel 5'].userAgent + ' musical_ly_2023605030 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly BytedanceWebview/d8a21c6' });
}
const slug = c => [c.browser, c.device.replace(/[^\w]+/g, '-'), c.lang].join('_').toLowerCase();
async function ctx(browser, c, extra) {
  const dev = pw.devices[c.device];
  const ua = c.ua || (UAS[c.browser] ? UAS[c.browser](c.device) : dev.userAgent);
  const x = await browser.newContext({ ...dev, userAgent: ua, locale: c.lang === 'de' ? 'de-DE' : 'en-US', ...(extra || {}) });
  await x.route(/supabase\.co/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  return x;
}
async function setLang(page, lang) { const on = await page.$('#r2gate .a2-lang.on'); const cur = on ? await on.getAttribute('data-lang') : 'en';
  if (cur !== lang) { await page.click('#r2gate .a2-lang[data-lang="' + lang + '"]'); await sleep(700); } }
/* everything that tells the visitor what to do: on screen, not covered, readable */
async function layout(page) { return page.evaluate(() => {
  const g = document.querySelector('#r2gate .a1'); if (!g) return { err: 'no guide' };
  const vw = innerWidth, vh = innerHeight, out = [];
  const parts = [['title', '.a1-h'], ['phone', '.a1-phone'], ['step1', '.a1-step[data-i="0"]'], ['step2', '.a1-step[data-i="1"]'], ['step3', '.a1-step[data-i="2"]'], ['main button', '.a1-acts .r2-btn.pri'], ['continue', '.a1-cont']];
  for (const [n, sel] of parts) { const e = g.querySelector(sel); if (!e) { out.push(n + ' missing'); continue; }
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (r.width < 20 || r.height < 14 || cs.visibility === 'hidden' || +cs.opacity < 0.5) { out.push(n + ' not visible (' + Math.round(r.width) + 'x' + Math.round(r.height) + ', opacity ' + cs.opacity + ')'); continue; }
    if (r.top < -1 || r.bottom > vh + 1 || r.left < -1 || r.right > vw + 1) out.push(n + ' off screen (' + [r.left, r.top, r.right, r.bottom].map(Math.round) + ' in ' + vw + 'x' + vh + ')');
    const cx = Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(vh - 1, Math.max(0, r.top + Math.min(r.height / 2, 20)));
    const hit = document.elementFromPoint(cx, cy); if (hit && !e.contains(hit) && !hit.contains(e)) out.push(n + ' covered by ' + hit.tagName + '.' + String(hit.className).slice(0, 40));
  }
  const txt = s => { const e = g.querySelector(s); return e ? e.innerText.trim() : ''; };
  return { problems: out, mode: window.LowiA1 && LowiA1.mode && LowiA1.mode(), kind: window.LowiA1 && LowiA1.kind(), title: txt('.a1-h'), why: txt('.a1-why'), steps: [...g.querySelectorAll('.a1-step')].map(b => b.innerText.replace(/\s+/g, ' ').trim()), main: txt('.a1-acts .r2-btn.pri'), cont: txt('.a1-cont'), back: !!g.querySelector('.a1-back'), scroll: document.scrollingElement.scrollHeight > vh + 2 || (document.querySelector('#r2gate').scrollHeight > document.querySelector('#r2gate').clientHeight + 2), build: (document.querySelector('meta[name=lowi-build]') || {}).content };
}); }
async function runCase(browser, base, c) {
  const w = slug(c), x = await ctx(browser, c), page = await x.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  const row = { case: w };
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    try { await page.waitForSelector('#r2gate .a1, #r2gate .r2-start', { timeout: 25000 }); } catch (e) { fail(w, 'no first screen after 25 s'); return; }
    await sleep(2200);   /* late scripts (herb-start) repaint the gate: the guide must survive that */
    if (!await page.$('#r2gate .a1')) { fail(w, 'first screen is not the Add to Home Screen guide: ' + (await page.evaluate(() => document.querySelector('#r2gate').innerText.slice(0, 120).replace(/\s+/g, ' ')))); return; }
    await setLang(page, c.lang);
    const L = await layout(page); Object.assign(row, L);
    const e = EXP[c.kind][c.lang];
    if (L.mode !== 'start') fail(w, 'guide mode ' + L.mode);
    if (L.title !== e[0]) fail(w, 'title "' + L.title + '", want "' + e[0] + '"');
    if (!L.steps[0] || !L.steps[0].includes(e[1])) fail(w, 'step 1 "' + L.steps[0] + '", want "' + e[1] + '"');
    if (L.main !== e[2]) fail(w, 'main button "' + L.main + '", want "' + e[2] + '"');
    if (L.steps.length !== 3) fail(w, L.steps.length + ' steps');
    if (L.back) fail(w, 'Back button on the first screen (nothing behind it)');
    if ((c.browser === 'chrome' || /iPad/.test(c.device)) && !/(top right|oben rechts)/.test(L.steps[0])) fail(w, 'iPhone Chrome step 1 does not say top right: ' + L.steps[0]);
    if (c.browser === 'safari' && /(Chrome|browser's menu|Browsers)/.test(L.steps[0])) fail(w, 'Safari step 1 talks about another browser: ' + L.steps[0]);
    for (const p of L.problems || []) fail(w, p);
    if (L.scroll && c.device !== 'iPhone SE') fail(w, 'guide needs scrolling');
    if (c.browser === 'safari' || c.browser === 'android-chrome' || c.browser === 'tiktok') await page.screenshot({ path: path.join(OUT, w + '.png') });
    const s0 = await page.$eval('#r2gate .a1', g => g.className); await sleep(3000); const s1 = await page.$eval('#r2gate .a1', g => g.className);
    if (s0 === s1) fail(w, 'steps do not animate (' + s0 + ')');
    /* "I added it" (only where that is the main button) -> now open it from the Home Screen -> continue in the browser -> companion start */
    if (c.kind === 'ios' || c.kind === 'android') {
      await page.click('#r2gate [data-a1="added"]'); await sleep(150);
      const dn = await page.$eval('#r2gate .a1', g => (g.querySelector('.a1-h') || {}).innerText || '').catch(() => '');
      const want = c.lang === 'de' ? 'Jetzt vom Home-Bildschirm öffnen' : 'Now open it from your Home Screen'; if (dn.trim() !== want) fail(w, 'after "I added it": "' + dn + '"');
    }
    await page.click('#r2gate [data-a1="continue"]'); await sleep(1200);
    const after = await page.evaluate(() => ({ hs: !!document.querySelector('#r2gate .r2-start.hs'), a1: !!document.querySelector('#r2gate .a1'), form: !!document.querySelector('#r2gate .r2-start.form') }));
    if (!after.hs || after.a1) fail(w, 'Continue in the browser did not go on to the companion start ' + JSON.stringify(after));
    row.continueOk = after.hs && !after.a1;
  } catch (e2) { fail(w, 'error ' + e2.message.split('\n')[0]); }
  finally { if (errs.length) fail(w, 'page errors: ' + errs.slice(0, 3).join(' | ')); rows.push(row); console.log((fails.some(f => f.startsWith(w + ':')) ? 'BAD ' : 'ok  ') + w, row.title || '', '|', (row.steps || []).join(' / ')); await x.close(); }
}
/* already in the companion onboarding (reload mid-way): the guide waits for "Create account" and shows there with a Back button */
async function midOnboarding(browser, base, lang) {
  const c = { engine: 'webkit', device: 'iPhone 13', browser: 'safari', kind: 'ios', lang }, w = 'mid-onboarding_' + lang, x = await ctx(browser, c), page = await x.newPage();
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('#r2gate .a1, #r2gate .r2-start', { timeout: 25000 }); await sleep(2000);
    await setLang(page, lang);
    await page.click('#r2gate [data-a1="continue"]'); await sleep(900);
    await page.evaluate(() => sessionStorage.removeItem('lowi.a1.skip'));   /* a new browser session, mid-onboarding */
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('#r2gate .r2-start', { timeout: 25000 }); await sleep(2000);
    const clk = async s => { await page.click(s); await sleep(900); };
    if (await page.$('#r2gate .a1')) { await clk('#r2gate [data-a1="continue"]'); await page.evaluate(() => sessionStorage.removeItem('lowi.a1.skip')); }
    await clk('#r2gate [data-hs=plant]');
    await page.evaluate(() => sessionStorage.removeItem('lowi.a1.skip')); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('#r2gate .r2-start', { timeout: 25000 }); await sleep(2000);
    if (await page.$('#r2gate .a1')) fail(w, 'guide pushed in front of an onboarding that is under way');
    await clk('#r2gate [data-hs=name]'); await clk('#r2gate [data-hs=play]'); await page.fill('#hsYou', 'Lena'); await clk('#r2gate [data-hs=you]');
    await clk('#r2gate [data-r2a=signup]');
    const L = await layout(page);
    if (L.err) fail(w, '"Create account" went to ' + (await page.evaluate(() => document.querySelector('#r2gate').innerText.slice(0, 60).replace(/\s+/g, ' '))) + ' instead of the guide');
    else { if (L.mode !== 'signup') fail(w, 'mode ' + L.mode); if (!L.back) fail(w, 'no Back button at Create account'); for (const p of L.problems) fail(w, p); if (L.title !== EXP.ios[lang][0]) fail(w, 'title ' + L.title); }
    console.log((fails.some(f => f.startsWith(w + ':')) ? 'BAD ' : 'ok  ') + w, L.title || '');
    rows.push({ case: w, ...L });
  } catch (e) { fail(w, 'error ' + e.message.split('\n')[0]); } finally { await x.close(); }
}
async function noGuide(browser, base, w, c, extra, init) {
  const x = await ctx(browser, c, extra); if (init) await x.addInitScript(init); const page = await x.newPage();
  try { await page.goto(base, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('#r2gate .r2-start, #r2gate .a1', { timeout: 25000 }); await sleep(2500);
    const st = await page.evaluate(() => ({ a1: !!document.querySelector('#r2gate .a1'), start: !!document.querySelector('#r2gate .r2-start:not(.a1)'), signup: !!document.querySelector('#r2gate [data-r2a=signup]') }));
    if (st.a1) fail(w, 'guide shown'); if (!st.start) fail(w, 'start screen not shown');
    if (st.signup) { await page.click('#r2gate [data-r2a=signup]'); await sleep(900); st.atSignup = await page.evaluate(() => document.querySelector('#r2gate .a1') ? 'guide' : document.querySelector('#r2gate .r2-start.form') ? 'form' : 'other'); if (st.atSignup !== 'form') fail(w, '"Create account" opened ' + st.atSignup); }
    console.log((fails.some(f => f.startsWith(w + ':')) ? 'BAD ' : 'ok  ') + w, JSON.stringify(st)); rows.push({ case: w, ...st });
  } catch (e) { fail(w, 'error ' + e.message.split('\n')[0]); } finally { await x.close(); }
}
(async () => {
  let srv = null, base = arg('url', '');
  if (!base) { srv = await serve(); base = 'http://127.0.0.1:' + srv.address().port + '/lowispike/'; }
  const B = { webkit: await pw.webkit.launch(), chromium: await pw.chromium.launch() };
  for (const c of CASES) if (!ONLY || ONLY.test(slug(c))) await runCase(B[c.engine], base, c);
  if (ONLY) { for (const b of Object.values(B)) await b.close(); if (srv) srv.close(); console.log(fails.length ? fails.length + ' FAIL' : '0 FAIL'); process.exit(fails.length ? 1 : 0); }
  for (const lang of ['en', 'de']) await midOnboarding(B.webkit, base, lang);
  await noGuide(B.webkit, base, 'home-screen-app_iphone-13', { device: 'iPhone 13', browser: 'safari', lang: 'en' }, null, () => { Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true }); });
  await noGuide(B.chromium, base, 'home-screen-app_pixel-5', { device: 'Pixel 5', browser: 'android-chrome', lang: 'en' }, null, () => { const mm = window.matchMedia.bind(window); window.matchMedia = q => /display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addListener() { }, removeListener() { }, addEventListener() { }, removeEventListener() { } } : mm(q); });
  await noGuide(B.chromium, base, 'desktop', { device: 'Desktop Chrome', browser: 'desktop', lang: 'en' });
  for (const b of Object.values(B)) await b.close(); if (srv) srv.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ base, fails, rows }, null, 1));
  console.log(fails.length ? '\n' + fails.length + ' FAIL' : '\n0 FAIL', '(' + rows.length + ' runs) ->', OUT);
  process.exit(fails.length ? 1 : 0);
})();
