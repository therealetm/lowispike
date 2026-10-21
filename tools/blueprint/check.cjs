/* Affiliates + Create pages and the two new Community tabs, in real browsers (21 Oct 2026).
   node tools/blueprint/check.cjs [outDir]   -> screenshots + a JSON report; exits 1 on any failure. Nothing leaves this machine. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const pw = H.pw, sleep = H.sleep;
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(process.argv[2] || '/tmp/blueprint-check');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const fails = [], notes = [];
const fail = (w, m) => { fails.push(w + ': ' + m); console.log('FAIL', w, m); };
function serve() { /* the site as GitHub Pages serves it: under /lowispike/, folders open their index.html */
  return new Promise(r => { const s = http.createServer((q, res) => {
    let u = decodeURIComponent(q.url.split('?')[0]); if (!u.startsWith('/lowispike/')) { res.writeHead(404); res.end(); return; }
    u = u.slice('/lowispike'.length); if (u.endsWith('/')) u += 'index.html';
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
  }); s.listen(0, '127.0.0.1', () => r(s)); });
}
const SIZES = [
  { name: 'iphone-se', engine: 'webkit', device: 'iPhone SE' },
  { name: 'iphone-13', engine: 'webkit', device: 'iPhone 13' },
  { name: 'ipad', engine: 'webkit', device: 'iPad (gen 7)' },
  { name: 'narrow-280', engine: 'chromium', vp: { width: 280, height: 640 } },
  { name: 'landscape-1366', engine: 'chromium', vp: { width: 1366, height: 768 } }
];
async function overflow(page) { return page.evaluate(() => { const w = document.documentElement.clientWidth; const bad = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > w + 1) && getComputedStyle(e).position !== 'fixed' && !e.closest('.sr'); }).slice(0, 5).map(e => e.tagName + '.' + e.className + '#' + e.id); return { sw: document.documentElement.scrollWidth, w, bad }; }); }
async function smallTargets(page) { return page.evaluate(() => [...document.querySelectorAll('button,a.btn,label.btn,input[type=checkbox]')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && e.offsetParent && (e.type === 'checkbox' ? r.height < 20 : r.height < 34); }).map(e => (e.textContent || e.id || e.type).trim().slice(0, 30))); }

async function standalone(base, sz) {
  const browser = await pw[sz.engine].launch();
  const ctx = await browser.newContext(sz.device ? Object.assign({}, pw.devices[sz.device]) : { viewport: sz.vp });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); if (m.type() === 'log') errs.push('console.log: ' + m.text()); });
  const W = 'affiliates@' + sz.name;
  try {
    await page.goto(base + 'affiliates/', { waitUntil: 'load' });
    await page.waitForSelector('#checkCard h2');
    if ((await page.textContent('#checkCard h2')) !== 'Mach dein Tag-1-Video') fail(W, 'checklist title');
    await page.screenshot({ path: path.join(OUT, sz.name + '-1-empty.png'), fullPage: true });
    /* website: shuffle, facts, script */
    await page.click('#f_pickBtn'); await page.waitForFunction(() => !document.getElementById('f_pickBtn').disabled, null, { timeout: 5000 });
    const pick = await page.textContent('#f_pick');
    await page.fill('#f_leads', '7'); await page.fill('#f_city', 'Flensburg');
    let txt = await page.textContent('#scriptCard');
    if (!txt.includes('Heute entscheidet der Zufall die Branche: ' + pick + '.')) fail(W, 'industry not in script: ' + pick);
    if (!txt.includes('Er hat sieben Treffer gefunden.')) fail(W, 'lead count not spelled out');
    if (await page.$('#scriptGaps')) fail(W, 'website script still has gaps');
    /* the mismatch warning */
    const clashName = pick === 'Friseursalons' ? 'Juwelier Hansen' : 'Friseur Müller';
    await page.fill('#f_business', clashName);
    if (!(await page.textContent('#f_businessErr')).includes('Branche und Geschäft müssen zusammenpassen')) fail(W, 'industry clash not flagged');
    await page.fill('#f_business', '');
    /* link check: Sponsoren-Agent link is refused for the website product */
    await page.fill('#affLink', 'https://shop.beacons.ai/emanuristic/6ff76533-65e2-49bf-b1c0-d4d3d08aab88?affiliateLinkId=11111111-2222-4333-8444-555555555555');
    if (!(await page.textContent('#linkStatus')).includes('nicht zum AI Website Client System')) fail(W, 'wrong-product link accepted');
    /* switch product: sponsor */
    await page.click('[data-product="sponsor"]');
    txt = await page.textContent('#scriptCard');
    if (!txt.includes('Erster Tag, an dem ChatGPT autonom') || !txt.includes('fehlt')) fail(W, 'sponsor script shell/gaps');
    for (const [id, v] of [['f_contacted', '12'], ['f_brand', 'Bohnenwerk'], ['f_idea', 'drei Hooks für ihr Abo'], ['f_price', '250'], ['f_learning', 'Nenne immer einen festen Preis'], ['f_replies', '0']]) await page.fill('#' + id, v);
    txt = await page.textContent('#scriptCard');
    for (const k of ['autonom zwölf Sponsoren angeschrieben hat.', 'Heute highlighten wir Bohnenwerk.', 'zweihundertfünfzig Euro', 'Bisher hat noch keine Marke geantwortet.', 'kommentiert „Sponsor“']) if (!txt.includes(k)) fail(W, 'sponsor script missing: ' + k);
    await page.fill('#affLink', 'https://shop.beacons.ai/emanuristic/6ff76533-65e2-49bf-b1c0-d4d3d08aab88?affiliateLinkId=11111111-2222-4333-8444-555555555555');
    await page.check('#ck_recOpen');
    await page.fill('#postUrl', 'https://www.tiktok.com/@test/video/1'); await page.click('#markPosted');
    const done = await page.textContent('#checkCard .row');
    if (!/^5 von 10/.test(done.trim())) fail(W, 'checklist count ' + done);
    await page.screenshot({ path: path.join(OUT, sz.name + '-2-sponsor-day1.png'), fullPage: true });
    /* persistence */
    await page.reload({ waitUntil: 'load' }); await page.waitForSelector('#checkCard h2');
    if ((await page.getAttribute('[data-product="sponsor"]', 'aria-pressed')) !== 'true') fail(W, 'product not remembered');
    if (!(await page.isChecked('#ck_recOpen'))) fail(W, 'checklist tick lost on reload');
    if ((await page.inputValue('#f_brand')) !== 'Bohnenwerk') fail(W, 'facts lost on reload');
    /* day 2 starts clean, with the update field and the "Erneuter Tag" hook */
    await page.click('button[aria-label="Nächster Tag"]');
    if ((await page.textContent('#dayLabel')) !== 'Tag 2 von 30') fail(W, 'day nav');
    if (!(await page.$('#f_update'))) fail(W, 'no update field on day 2');
    if (!(await page.textContent('#scriptCard')).includes('Erneuter Tag, an dem ChatGPT autonom')) fail(W, 'day 2 hook');
    /* numbers */
    await page.click('#tabNumbers');
    if (!(await page.textContent('#tierLine')).includes('Noch kein bestätigter Verkauf')) fail(W, 'empty tier line');
    if ((await page.textContent('#fSpc')) !== '–') fail(W, 'rate shown without clicks');
    for (const [i, d] of [['1', '2026-10-01'], ['2', '2026-10-09'], ['3', '2026-10-14']]) {
      await page.selectOption('#sProduct', 'website'); await page.fill('#sDate', d); await page.fill('#sRef', 'B-' + i); await page.click('#addSale');
    }
    await page.selectOption('#sProduct', 'website'); await page.fill('#sDate', '2026-10-15'); await page.fill('#sRef', 'b-1'); await page.click('#addSale');
    if (!(await page.textContent('#saleForm .err')).includes('schon eingetragen')) fail(W, 'duplicate order accepted');
    if ((await page.textContent('#commission')) !== '29,70 €') fail(W, 'commission ' + (await page.textContent('#commission')));
    if (!(await page.textContent('#tierLine')).includes('Noch 7 Verkäufe bis 15 %')) fail(W, 'tier progress: ' + (await page.textContent('#tierLine')));
    if (!(await page.textContent('#feeLine')).includes('entfällt laut Konditionen dauerhaft, seit 10/2026')) fail(W, 'fee waiver line');
    await page.fill('#clicks_website', '150'); await page.press('#clicks_website', 'Tab');
    await page.fill('#clicks_sponsor', '0'); await page.press('#clicks_sponsor', 'Tab');
    if ((await page.textContent('#fClicks')) !== '150') fail(W, 'clicks total');
    if ((await page.textContent('#fSpc')) !== '2,0 %') fail(W, 'sale rate ' + (await page.textContent('#fSpc')));
    if ((await page.textContent('#fCpp')) !== '150,0') fail(W, 'clicks per post ' + (await page.textContent('#fCpp')));
    await page.screenshot({ path: path.join(OUT, sz.name + '-3-numbers.png'), fullPage: true });
    for (const view of ['numbers', 'today']) {
      if (view === 'today') await page.click('#tabToday');
      const o = await overflow(page); if (o.sw > o.w + 1 || o.bad.length) fail(W, view + ' sideways overflow ' + JSON.stringify(o));
      const st = await smallTargets(page); if (st.length) fail(W, view + ' small tap targets ' + st.join(' | '));
    }
    /* create page */
    await page.goto(base + 'create/', { waitUntil: 'load' });
    if ((await page.textContent('h1')) !== 'Create') fail('create@' + sz.name, 'title');
    const o = await overflow(page); if (o.sw > o.w + 1) fail('create@' + sz.name, 'overflow');
    await page.screenshot({ path: path.join(OUT, sz.name + '-4-create.png') });
  } catch (e) { fail(W, 'threw ' + String(e.message).split('\n')[0]); await page.screenshot({ path: path.join(OUT, sz.name + '-error.png'), fullPage: true }).catch(() => {}); }
  if (errs.length) fail(W, 'console/page errors: ' + errs.slice(0, 4).join(' | '));
  await browser.close();
}

async function appTabs(engine, device) {
  const W = 'app-tabs@' + engine + '/' + device;
  const R = await H.open({ engine, device, probe: false });
  const p = R.page;
  try {
    await R.goto(); await N.openCommunity(R);
    await p.waitForSelector('.rm-tab[data-rm="aff"]', { timeout: 10000 });
    const labels = await p.$$eval('.rm-tab', b => b.map(x => x.textContent));
    if (labels.join('|') !== 'Room|Chat|Creation|Affiliates') fail(W, 'tab labels ' + labels.join('|'));
    const fit = await p.$$eval('.rm-tab', b => b.every(x => { const r = x.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
    if (!fit) notes.push(W + ': tabs scroll sideways on this width');
    await p.locator('.rm-tab[data-rm="aff"]').click();
    await p.waitForSelector('#cmPaneChat[data-rm-view="aff"] iframe.rm-frame', { timeout: 8000 });
    const fr = p.frameLocator('iframe.rm-frame[data-view="aff"]');
    await fr.locator('#checkCard h2').waitFor({ timeout: 15000 });
    const st = await p.evaluate(() => { const f = document.querySelector('iframe.rm-frame[data-view="aff"]').getBoundingClientRect(); const g = document.getElementById('cgGalaxy'); return { fw: f.width, fh: f.height, vw: innerWidth, vh: innerHeight, galaxy: g ? getComputedStyle(g).display + '/' + (g.offsetParent ? 'shown' : 'hidden') : 'none', cls: document.documentElement.classList.contains('rm-view'), sel: document.querySelector('.rm-tab[aria-selected="true"]').dataset.rm, composer: (document.getElementById('cmInput') || {}).offsetParent ? 'shown' : 'hidden' }; });
    notes.push(W + ' aff frame ' + JSON.stringify(st));
    if (st.fh < 300 || st.fw < st.vw * 0.8) fail(W, 'frame too small ' + JSON.stringify(st));
    if (!st.cls || st.sel !== 'aff' || st.composer !== 'hidden' || /shown/.test(st.galaxy)) fail(W, 'view state ' + JSON.stringify(st));
    if (!(await fr.locator('body').getAttribute('class') || '').includes('embed')) fail(W, 'frame not in embed mode');
    await sleep(500); await R.shot(path.join(OUT, 'app-' + engine + '-affiliates.png'));
    await p.locator('.rm-tab[data-rm="create"]').click();
    await p.frameLocator('iframe.rm-frame[data-view="create"]').locator('h1').waitFor({ timeout: 10000 });
    await sleep(400); await R.shot(path.join(OUT, 'app-' + engine + '-creation.png'));
    await p.locator('.rm-tab[data-rm="room"]').click(); await sleep(500);
    const back = await p.evaluate(() => ({ view: document.getElementById('cmPaneChat').getAttribute('data-rm-view'), cls: document.documentElement.classList.contains('rm-view'), sel: document.querySelector('.rm-tab[aria-selected="true"]').dataset.rm, galaxy: (document.getElementById('cgGalaxy') || {}).offsetParent ? 'shown' : 'hidden' }));
    if (back.view || back.cls || back.sel !== 'room') fail(W, 'Room did not come back ' + JSON.stringify(back));
    await p.locator('.rm-tab[data-rm="aff"]').click(); await sleep(300);
    await p.locator('.rm-tab[data-rm="chat"]').click(); await sleep(800);
    const chat = await p.evaluate(() => ({ view: document.getElementById('cmPaneChat').getAttribute('data-rm-view'), sel: document.querySelector('.rm-tab[aria-selected="true"]').dataset.rm, open: document.getElementById('cmPaneChat').getAttribute('data-open') }));
    if (chat.view || chat.sel !== 'chat') fail(W, 'Chat from Affiliates ' + JSON.stringify(chat));
    await R.shot(path.join(OUT, 'app-' + engine + '-chat-after.png'));
  } catch (e) { fail(W, 'threw ' + String(e.message).split('\n')[0]); await R.shot(path.join(OUT, 'app-' + engine + '-error.png')); }
  const errs = R.errs.filter(e => !/supabase|realtime|websocket/i.test(e.m));
  if (errs.length) fail(W, 'errors ' + errs.slice(0, 3).map(e => e.m).join(' | '));
  await R.close();
}

(async () => {
  const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port + '/lowispike/';
  for (const sz of SIZES) { await standalone(base, sz); console.log('done', sz.name); }
  srv.close();
  await appTabs('webkit', 'iPhone SE'); console.log('done app webkit SE');
  await appTabs('webkit', 'iPhone 13'); console.log('done app webkit 13');
  await appTabs('chromium', 'iPhone 13'); console.log('done app chromium');
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ fails, notes }, null, 1));
  console.log(notes.join('\n'));
  console.log(fails.length ? fails.length + ' FAIL' : 'ALL OK');
  process.exit(fails.length ? 1 : 0);
})();
