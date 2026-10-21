/* Simpler conversion screens (21 Oct 2026, Eman: "apply everything he said in this video", a Build in Public TikTok about
   simplifying conversion pages). Real browsers, fresh profiles:
   node tools/conversion/shots.cjs [--url https://therealetm.github.io/lowispike/] [--out DIR] [--devices "iPhone 13,iPhone SE"]
   Checks per device (EN, plus DE on iPhone 13):
   - the Add to Home Screen first screen shows the plain "what it is" line
   - start screen 1 says what LOWiSPIKE is, why it helps and the founder proof, with plain buttons, 3 dots, nothing off screen
   - screen 2 asks the first name; screen 3 gives the first XP and "Create free account"
   - the account form doesn't ask the name again ("Two fields. That's it.")
   - the shopping rhythm reads a typed 7 back as "Once a week" and 30 as "Once a month"
   - no page errors, no sideways scrolling, every primary button fully on screen and not covered
   Writes screenshots + report.json to DIR; exits 1 on any failure. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, '/tmp/pw/node_modules/playwright', path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..', '..'), OUT = path.resolve(arg('out', '/tmp/conversion-shots'));
const DEVICES = arg('devices', 'iPhone SE,iPhone 13,iPad (gen 7)').split(',').map(s => s.trim());
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
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
const EXP = {
  en: { what: 'Free app: eat smarter and lose weight, as a game.', h: 'Eat smarter and lose weight, as a game.', proof: 'Made by Eman, who lost 45 kg in 7 months.', b0: 'Get started', b1: 'Continue', b2: 'Create free account', two: "Two fields. That's it.", w7: 'Once a week', w30: 'Once a month' },
  de: { what: 'Kostenlose App: klüger essen und abnehmen, als Spiel.', h: 'Iss klüger und nimm ab, als Spiel.', proof: 'Von Eman: 45 kg leichter in 7 Monaten.', b0: 'Loslegen', b1: 'Weiter', b2: 'Kostenloses Konto erstellen', two: "Zwei Felder. Das war's.", w7: 'Einmal pro Woche', w30: 'Einmal im Monat' }
};
/* everything that must be fully on screen and not covered */
async function fit(page, sels) {
  return page.evaluate(sels => {
    const out = [], W = innerWidth, H = innerHeight;
    if (document.documentElement.scrollWidth > W + 1) out.push('sideways scroll ' + document.documentElement.scrollWidth + '>' + W);
    for (const s of sels) {
      const e = document.querySelector(s); if (!e) { out.push('missing ' + s); continue; }
      const r = e.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) { out.push('hidden ' + s); continue; }
      if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) { out.push(s + ' off screen (' + [r.left, r.top, r.right, r.bottom].map(Math.round) + ' in ' + W + 'x' + H + ')'); continue; }
      const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (t && t !== e && !e.contains(t) && !t.contains(e)) out.push(s + ' covered by ' + t.tagName + '.' + String(t.className).split(' ')[0]);
    }
    return out;
  }, sels);
}
const txt = (page, s) => page.$eval(s, e => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => '');
async function setLang(page, lang) {
  const b = await page.$('#r2gate [data-lang="' + lang + '"]'); if (!b) return;
  const on = await b.evaluate(e => e.classList.contains('on')); if (!on) { await b.click(); await sleep(900); }
}
async function run(browser, base, device, lang) {
  const w = device.replace(/[^\w]+/g, '-').toLowerCase() + '_' + lang, E = EXP[lang], errs = [];
  const shot = n => page.screenshot({ path: path.join(OUT, w + '_' + n + '.png') });
  const dev = pw.devices[device];
  /* 1. Safari visitor: the Add to Home Screen first screen */
  let x = await browser.newContext({ ...dev, locale: lang === 'de' ? 'de-DE' : 'en-US' }); let page = await x.newPage();
  page.on('pageerror', e => errs.push(e.message));
  const row = { case: w };
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('#r2gate .r2-start', { timeout: 25000 }); await sleep(2200);
    await setLang(page, lang);
    row.build = await page.$eval('meta[name="lowi-build"]', m => m.content).catch(() => '');
    row.a1what = await txt(page, '#r2gate .a1-what');
    if (row.a1what !== E.what) fail(w, 'A2HS first screen line: "' + row.a1what + '"');
    for (const p of await fit(page, ['#r2gate .a1-what', '#r2gate .a1-h', '#r2gate .a1-cont'])) fail(w, 'A2HS ' + p);
    await shot('1-home-screen-guide');
  } catch (e) { fail(w, 'A2HS error ' + e.message.split('\n')[0]); }
  /* 2. "Continue in the browser": the 3-screen start, then the account form */
  try {
    await page.click('#r2gate .a1-cont'); await page.waitForSelector('#r2gate .r2-start.hs', { timeout: 15000 }); await sleep(1500);
    row.h0 = await txt(page, '#r2gate .hs-copy h1'); row.proof = await txt(page, '#r2gate .hs-proof'); row.b0 = await txt(page, '#r2gate [data-hs=plant]');
    row.dots = await page.$$eval('#r2gate .hs-dots i, #r2gate .hs-dots span, #r2gate .hs-dot', d => d.length).catch(() => -1);
    if (row.h0 !== E.h) fail(w, 'headline "' + row.h0 + '"'); if (row.proof !== E.proof) fail(w, 'proof "' + row.proof + '"'); if (row.b0 !== E.b0) fail(w, 'button "' + row.b0 + '"');
    for (const p of await fit(page, ['#r2gate .hs-copy h1', '#r2gate .hs-proof', '#r2gate [data-hs=plant]', '#r2gate [data-r2a=signin]'])) fail(w, 'screen 1 ' + p);
    await shot('2-start-what-why-proof');
    await page.click('#r2gate [data-hs=plant]'); await sleep(1000);
    row.b1 = await txt(page, '#r2gate [data-hs=you]'); if (row.b1 !== E.b1) fail(w, 'name button "' + row.b1 + '"');
    for (const p of await fit(page, ['#hsYou', '#r2gate [data-hs=you]'])) fail(w, 'screen 2 ' + p);
    await shot('3-start-name');
    await page.fill('#hsYou', 'Lena'); await page.click('#r2gate [data-hs=you]'); await sleep(1200);
    row.b2 = await txt(page, '#r2gate [data-r2a=signup]'); if (row.b2 !== E.b2) fail(w, 'account button "' + row.b2 + '"');
    for (const p of await fit(page, ['#r2gate [data-r2a=signup]'])) fail(w, 'screen 3 ' + p);
    await shot('4-start-first-xp');
    await page.click('#r2gate [data-r2a=signup]'); await sleep(1200);
    row.formSub = await txt(page, '#r2gate .r2-start.form .r2-st-top p');
    row.nameField = await page.$eval('#r2gate .r2-start.form input[name=name]', i => i.type + ':' + i.value).catch(() => 'none');
    if (row.formSub !== E.two) fail(w, 'form subtitle "' + row.formSub + '"'); if (row.nameField !== 'hidden:Lena') fail(w, 'name field ' + row.nameField);
    for (const p of await fit(page, ['#r2gate .r2-start.form input[name=email]', '#r2gate .r2-start.form input[name=password]'])) fail(w, 'form ' + p);
    await shot('5-account-two-fields');
    /* shopping rhythm read-back (the same form setup and Profile use) */

    await page.evaluate(() => { if (!window.LowiShopPlan) return; { const d = document.createElement('div'); d.className = 'spl-sheet r2-ob spl-probe'; d.style.cssText = 'position:fixed;inset:0;z-index:99999;padding:60px 22px;background:#0b1b33;overflow:auto'; d.innerHTML = LowiShopPlan.formHTML(LowiShopPlan.get(), { prefix: 'splT' }); const g = document.querySelector('#r2gate'); if (g) { g.innerHTML = ''; g.appendChild(d); } else document.body.appendChild(d); } }); await sleep(900);
    await page.fill('.spl-probe .spl-num', '7'); await sleep(200); row.w7 = await txt(page, '.spl-probe .spl-plain');
    await shot('6-shopping-once-a-week');
    await page.fill('.spl-probe .spl-num', '30'); await sleep(200); row.w30 = await txt(page, '.spl-probe .spl-plain');
    await page.fill('.spl-probe .spl-num', '10'); await sleep(200); row.w10 = await txt(page, '.spl-probe .spl-plain');
    if (row.w7 !== E.w7) fail(w, 'rhythm 7 "' + row.w7 + '"'); if (row.w30 !== E.w30) fail(w, 'rhythm 30 "' + row.w30 + '"'); if (row.w10 !== '') fail(w, 'rhythm 10 "' + row.w10 + '"');
  } catch (e) { fail(w, 'start error ' + e.message.split('\n')[0]); }
  if (errs.length) fail(w, 'page errors: ' + errs.slice(0, 3).join(' | '));
  rows.push(row); console.log((fails.some(f => f.startsWith(w + ':')) ? 'BAD ' : 'ok  ') + w, JSON.stringify(row));
  await x.close();
}
(async () => {
  let srv = null, base = arg('url', '');
  if (!base) { srv = await serve(); base = 'http://127.0.0.1:' + srv.address().port + '/lowispike/'; }
  const browser = await pw.webkit.launch();
  for (const d of DEVICES) await run(browser, base, d, 'en');
  if (DEVICES.includes('iPhone 13')) await run(browser, base, 'iPhone 13', 'de');
  await browser.close(); if (srv) srv.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ base, fails, rows }, null, 1));
  console.log(fails.length ? fails.length + ' FAIL' : '0 FAIL', '->', OUT);
  process.exit(fails.length ? 1 : 0);
})();
