/* Affiliates + Create pages and the two new Community tabs, in real browsers (21 Oct 2026).
   node tools/blueprint/check.cjs [outDir]   -> screenshots + a JSON report; exits 1 on any failure. Nothing leaves this machine. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const pw = H.pw, sleep = H.sleep;
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(process.argv[2] || '/tmp/blueprint-check');
const LIVE = process.env.LIVE ? 'https://therealetm.github.io/lowispike/' : ''; /* LIVE=1: check the live site instead of this checkout */
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
    await page.goto(base + 'affiliates/' + (LIVE ? '?v=' + Date.now() : ''), { waitUntil: 'load' });
    await page.waitForSelector('#seriesCards .pickcard');
    if (!(await page.textContent('#linkLine')).includes('direkt von Eman per WhatsApp')) fail(W, 'WhatsApp line');
    if (await page.$('input,select,textarea')) fail(W, 'page still has form fields');
    if (!(await page.isHidden('#scriptView'))) fail(W, 'script shown before a pick');
    const rows = await page.$$eval('table.levels tbody tr', t => t.map(r => [...r.cells].map(c => c.textContent.replace(/\u00a0/g, ' ')).join('|')));
    if (rows.join(' / ') !== 'Level 1|1–10|10 %|9,90 € / Level 2|11–50|15 %|14,85 € / Level 3|51–150|25 %|24,75 € / Level 4|ab 151|45 %|44,55 €') fail(W, 'levels ' + rows.join(' / '));
    const ex = (await page.textContent('#exampleList')).replace(/[\s\u00a0]+/g, ' ');
    for (const k of ['10 Verkäufe99,00 €', '50 Verkäufe693,00 €', '150 Verkäufe3.168,00 €']) if (!ex.replace(/ /g, '').includes(k.replace(/ /g, ''))) fail(W, 'example ' + k + ' in ' + ex);
    await page.screenshot({ path: path.join(OUT, sz.name + '-1-start.png'), fullPage: true });
    for (const [id, must] of [['webdesign', ['Lead-Skill', 'Proposal-Skill', 'Glaubt ihr, dass ich damit den Kunden lande?', '[Branche]', 'Webdesign']], ['ugc', ['[Anzahl] potenzielle Sponsoren', '[Marke]', 'Agency-Skill', 'Sponsor']]]) {
      await page.click('#pick-' + id);
      if ((await page.getAttribute('#pick-' + id, 'aria-pressed')) !== 'true') fail(W, id + ' not pressed');
      const txt = await page.textContent('#scriptView');
      for (const k of must) if (!txt.includes(k)) fail(W, id + ' script misses ' + k);
      if (/fehlt|FEHLT/.test(txt)) fail(W, id + ' has gaps');
      if (!(await page.$('#copyScript')) || !(await page.$('#copyCaption'))) fail(W, id + ' copy buttons');
      const o = await overflow(page); if (o.sw > o.w + 1 || o.bad.length) fail(W, id + ' sideways overflow ' + JSON.stringify(o));
      const st = await smallTargets(page); if (st.length) fail(W, id + ' small tap targets ' + st.join(' | '));
      await page.screenshot({ path: path.join(OUT, sz.name + '-2-' + id + '.png'), fullPage: true });
    }
    await page.reload({ waitUntil: 'load' }); await page.waitForSelector('#scriptCard');
    if ((await page.getAttribute('#pick-ugc', 'aria-pressed')) !== 'true') fail(W, 'hash pick not restored');
    /* create page */
    await page.goto(base + 'create/', { waitUntil: 'load' });
    if ((await page.textContent('h1')) !== 'Create') fail('create@' + sz.name, 'title');
    const o = await overflow(page); if (o.sw > o.w + 1) fail('create@' + sz.name, 'overflow');
    await page.screenshot({ path: path.join(OUT, sz.name + '-4-create.png') });
  } catch (e) { fail(W, 'threw ' + String(e.message).split('\n')[0]); await page.screenshot({ path: path.join(OUT, sz.name + '-error.png'), fullPage: true }).catch(() => {}); }
  if (errs.length) fail(W, 'console/page errors: ' + errs.slice(0, 4).join(' | '));
  await browser.close();
}

/* A real tap at the centre of the element: whatever sits on top there gets it (this is how the theme button swallowed taps on
   Affiliates). page.mouse is used rather than locator.click because WebKit's stability wait never settles on the busy Community page. */
async function tap(p, sel) { await sleep(400); const b = await p.locator(sel).boundingBox(); if (!b) throw new Error('no box for ' + sel); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
async function appTabs(engine, device) {
  const W = 'app-tabs@' + engine + '/' + device;
  const R = await H.open({ engine, device, probe: false, url: LIVE ? LIVE + 'index.html' : '' });
  const p = R.page;
  try {
    await R.goto(); await N.openCommunity(R);
    await p.waitForSelector('.rm-tab[data-rm="aff"]', { timeout: 10000 });
    const labels = await p.$$eval('.rm-tab', b => b.map(x => x.textContent));
    if (labels.join('|') !== 'Room|Chat|Creation|Affiliates') fail(W, 'tab labels ' + labels.join('|'));
    const fit = await p.$$eval('.rm-tab', b => b.every(x => { const r = x.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
    if (!fit) notes.push(W + ': tabs scroll sideways on this width');
    await tap(p, '.rm-tab[data-rm="aff"]');
    await p.waitForSelector('#cmPaneChat[data-rm-view="aff"] iframe.rm-frame', { timeout: 8000 });
    const fr = p.frameLocator('iframe.rm-frame[data-view="aff"]');
    await fr.locator('#seriesCards .pickcard').first().waitFor({ timeout: 15000 });
    const st = await p.evaluate(() => { const f = document.querySelector('iframe.rm-frame[data-view="aff"]').getBoundingClientRect(); const g = document.getElementById('cgGalaxy'); return { fw: f.width, fh: f.height, vw: innerWidth, vh: innerHeight, galaxy: g ? getComputedStyle(g).display + '/' + (g.offsetParent ? 'shown' : 'hidden') : 'none', cls: document.documentElement.classList.contains('rm-view'), sel: document.querySelector('.rm-tab[aria-selected="true"]').dataset.rm, composer: (document.getElementById('cmInput') || {}).offsetParent ? 'shown' : 'hidden' }; });
    notes.push(W + ' aff frame ' + JSON.stringify(st));
    if (st.fh < 300 || st.fw < st.vw * 0.8) fail(W, 'frame too small ' + JSON.stringify(st));
    if (!st.cls || st.sel !== 'aff' || st.composer !== 'hidden' || /shown/.test(st.galaxy)) fail(W, 'view state ' + JSON.stringify(st));
    if (!(await fr.locator('body').getAttribute('class') || '').includes('embed')) fail(W, 'frame not in embed mode');
    await sleep(500); await R.shot(path.join(OUT, 'app-' + engine + '-affiliates.png'));
    await tap(p, '.rm-tab[data-rm="create"]');
    await p.frameLocator('iframe.rm-frame[data-view="create"]').locator('h1').waitFor({ timeout: 10000 });
    await sleep(400); await R.shot(path.join(OUT, 'app-' + engine + '-creation.png'));
    await tap(p, '.rm-tab[data-rm="room"]'); await sleep(500);
    const back = await p.evaluate(() => ({ view: document.getElementById('cmPaneChat').getAttribute('data-rm-view'), cls: document.documentElement.classList.contains('rm-view'), sel: document.querySelector('.rm-tab[aria-selected="true"]').dataset.rm, galaxy: (document.getElementById('cgGalaxy') || {}).offsetParent ? 'shown' : 'hidden' }));
    if (back.view || back.cls || back.sel !== 'room') fail(W, 'Room did not come back ' + JSON.stringify(back));
    await tap(p, '.rm-tab[data-rm="aff"]'); await sleep(300);
    await tap(p, '.rm-tab[data-rm="chat"]'); await sleep(800);
    const chat = await p.evaluate(() => ({ view: document.getElementById('cmPaneChat').getAttribute('data-rm-view'), sel: document.querySelector('.rm-tab[aria-selected="true"]').dataset.rm, open: document.getElementById('cmPaneChat').getAttribute('data-open') }));
    if ((chat.view && chat.view !== 'chans') || chat.sel !== 'chat') fail(W, 'Chat from Affiliates ' + JSON.stringify(chat));
    await R.shot(path.join(OUT, 'app-' + engine + '-chat-after.png'));
  } catch (e) { fail(W, 'threw ' + String(e.message).split('\n')[0]); await R.shot(path.join(OUT, 'app-' + engine + '-error.png')); }
  const errs = R.errs.filter(e => !/supabase|realtime|websocket/i.test(e.m));
  if (errs.length) fail(W, 'errors ' + errs.slice(0, 3).map(e => e.m).join(' | '));
  await R.close();
}

(async () => {
  const srv = LIVE ? null : await serve(); const base = LIVE ? LIVE : 'http://127.0.0.1:' + srv.address().port + '/lowispike/';
  for (const sz of SIZES) { await standalone(base, sz); console.log('done', sz.name); }
  if (srv) srv.close();
  await appTabs('webkit', 'iPhone SE'); console.log('done app webkit SE');
  await appTabs('webkit', 'iPhone 13'); console.log('done app webkit 13');
  await appTabs('chromium', 'iPhone 13'); console.log('done app chromium');
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ fails, notes }, null, 1));
  console.log(notes.join('\n'));
  console.log(fails.length ? fails.length + ' FAIL' : 'ALL OK');
  process.exit(fails.length ? 1 : 0);
})();
