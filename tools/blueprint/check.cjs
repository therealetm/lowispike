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

const B = require('../../affiliates/blueprint-core.js');
/* Buy-to-unlock (21 Oct): the content checks run as a member who has unlocked both tracks (one legacy code hash, as the page
   stores it after a correct code); lockedCheck() below checks the locked page a visitor sees. */
const ACCESS = require('../../affiliates/access-list.js');
const MEMBER = (ACCESS.codes.find(c => c.tracks.includes('webdesign') && c.tracks.includes('ugc')) || {}).h;
const seed = (h) => { try { localStorage.setItem('lowi.aff.unlock.v1', JSON.stringify([h])); } catch (e) {} };
/* Redesign (21 Oct 2026, "it shouldn't be cramped"): on the screen that is showing, nothing overlaps, stacked blocks keep air between
   them, the rows' icon and text never touch, text stays inside its card, nothing runs off the side and every button is tappable. */
async function layout(page, W, tag) {
  const r = await page.evaluate(() => {
    const v = [...document.querySelectorAll('.view')].find(x => !x.hidden);
    const vis = e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    const blocks = [...v.querySelectorAll(':scope > *, .hero > *, .head > *')].filter(e => vis(e) && !e.matches('.hero,.head,.fab'));
    const box = e => e.getBoundingClientRect();
    const name = e => e.id || e.className || e.tagName;
    const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
    const out = { view: v.id, overlaps: [], cramped: [], rowTouch: [], escaped: [] };
    const all = blocks.concat([...v.querySelectorAll('.fab')].filter(vis));
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (!all[i].contains(all[j]) && !all[j].contains(all[i]) && hit(box(all[i]), box(all[j]))) out.overlaps.push(name(all[i]) + ' x ' + name(all[j]));
    const st = blocks.slice().sort((a, b) => box(a).top - box(b).top);
    for (let i = 1; i < st.length; i++) { const g = box(st[i]).top - box(st[i - 1]).bottom; if (g < 8) out.cramped.push(name(st[i - 1]) + ' -> ' + name(st[i]) + ' ' + Math.round(g) + 'px'); }
    for (const rw of v.querySelectorAll('.row')) { const t = rw.querySelector('.tile'), x = rw.querySelector('.txt'); if (t && x && box(x).left - box(t).right < 8) out.rowTouch.push(name(rw)); }
    for (const c of v.querySelectorAll('.card')) { const cb = box(c); for (const e of c.querySelectorAll('*')) { if (!vis(e)) continue; const b = box(e); if (b.right > cb.right + 1 || b.left < cb.left - 1) { out.escaped.push(name(e)); break; } } }
    out.h1 = parseFloat(getComputedStyle(v.querySelector('h1')).fontSize);
    return out;
  });
  if (r.overlaps.length) fail(W, tag + ' overlaps ' + r.overlaps.join(' | '));
  if (r.cramped.length) fail(W, tag + ' cramped ' + r.cramped.join(' | '));
  if (r.rowTouch.length) fail(W, tag + ' icon touches text ' + r.rowTouch.join(' | '));
  if (r.escaped.length) fail(W, tag + ' text out of its card ' + r.escaped.join(' | '));
  if (!(r.h1 >= 30)) fail(W, tag + ' headline too small ' + r.h1);
  const o = await overflow(page); if (o.sw > o.w + 1 || o.bad.length) fail(W, tag + ' sideways overflow ' + JSON.stringify(o));
  const s = await smallTargets(page); if (s.length) fail(W, tag + ' small tap targets ' + s.join(' | '));
}

/* 22 Oct 2026: after a screen change the page must still scroll to its bottom. WebKit on iPhone-sized screens got stuck at an older,
   shorter height when the views swapped while scrolled far down (tap on #toShots timed out on iPhone 13). */
async function reach(page, W, tag) {
  const r = await page.evaluate(async () => { const w = t => new Promise(f => setTimeout(f, t)); window.scrollTo(0, 1e6); await w(150);
    const out = { y: Math.round(scrollY), max: Math.round(document.documentElement.scrollHeight - innerHeight) }; window.scrollTo(0, 0); await w(60); return out; });
  if (r.max > 0 && r.y < r.max - 2) fail(W, tag + ' cannot scroll to its bottom: stops at ' + r.y + ' of ' + r.max + ' px');
}

async function standalone(base, sz) {
  const browser = await pw[sz.engine].launch();
  const ctx = await browser.newContext(sz.device ? Object.assign({}, pw.devices[sz.device]) : { viewport: sz.vp });
  /* The text checks below are the German page: pin the app language to German (the page follows the app language since 21 Oct). */
  await ctx.addInitScript(() => { try { localStorage.setItem('lowispike.lang', 'de'); } catch (e) {} });
  await ctx.addInitScript(seed, MEMBER);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); if (m.type() === 'log') errs.push('console.log: ' + m.text()); });
  const W = 'affiliates@' + sz.name;
  try {
    await page.goto(base + 'affiliates/' + (LIVE ? '?v=' + Date.now() : ''), { waitUntil: 'load' });
    await page.waitForSelector('#seriesCards #pick-webdesign');
    if (!(await page.textContent('#linkLine')).includes('direkt von Eman per WhatsApp')) fail(W, 'WhatsApp line');
    if (await page.$('input,select,textarea')) fail(W, 'page still has form fields');
    if (!(await page.isHidden('#scriptView')) || !(await page.isHidden('#earnView')) || !(await page.isHidden('#shotView'))) fail(W, 'start screen shows more than one thing');
    for (const k of ['#startTitle', '#startList', '#startBtn', '#fabEarn', '.pill']) if (!(await page.isVisible('#viewStart ' + k))) fail(W, 'start misses ' + k);
    if ((await page.$$('#startList .row')).length !== 3) fail(W, 'start card rows');
    if ((await page.getAttribute('#pick-webdesign', 'aria-pressed')) !== 'true') fail(W, 'Webdesign not preselected');
    await layout(page, W, 'start');
    const cut = await page.evaluate(() => [...document.querySelectorAll('.bar .seg button')].filter(b => b.offsetParent && b.scrollWidth > b.clientWidth + 1).map(b => b.textContent));
    if (cut.length) fail(W, 'track switch labels cut off: ' + cut.join(', '));
    await page.screenshot({ path: path.join(OUT, sz.name + '-1-start.png'), fullPage: true });
    for (const [id, must] of [['webdesign', ['Lead-Skill', 'Proposal-Skill', 'Glaubt ihr, dass ich damit den Kunden lande?', '[Branche]', 'Webdesign']], ['ugc', ['[Anzahl] potenzielle Sponsoren', '[Marke]', 'Agency-Skill', 'Sponsor']], ['lowispike', ['Tag [X] von 30', '[Essen]', '\u201eLOWISPIKE\u201c', B.t('de', 'freeTrack')]]]) {
      if (id === 'webdesign') { await page.click('#startBtn'); } else { await page.click('#sw-' + id); }
      await page.waitForSelector('#scriptView:not([hidden]) #scriptCard');
      if ((await page.getAttribute('#sw-' + id, 'aria-pressed')) !== 'true') fail(W, id + ' not pressed');
      const txt = await page.textContent('#scriptView');
      for (const k of must) if (!txt.includes(k)) fail(W, id + ' script misses ' + k);
      if (/fehlt|FEHLT/.test(txt)) fail(W, id + ' has gaps');
      if (!(await page.isVisible('#copyScript'))) fail(W, id + ' copy script button');
      if (id === 'lowispike') { /* the 30-day challenge: day stepper fills the day and swaps the follow line */
        if ((await page.textContent('#dayNow')) !== B.t('de', 'dayOf', { n: 1 }) || !(await page.isDisabled('#dayPrev'))) fail(W, 'day 1 start');
        await page.click('#dayNext');
        if ((await page.textContent('#dayNow')) !== B.t('de', 'dayOf', { n: 2 })) fail(W, 'day stepper');
        const fl = B.followLine('lowispike', 'de', 2).replace(/\[[^\]]+\]/g, '').slice(0, 25);
        if (!(await page.textContent('#dayLine')).includes(fl)) fail(W, 'follow line of day 2');
        if ((await page.evaluate(() => document.activeElement && document.activeElement.id)) !== 'dayNext') fail(W, 'day focus lost');
      }
      await reach(page, W, id + ' script');
      await layout(page, W, id + ' script');
      await page.screenshot({ path: path.join(OUT, sz.name + '-2-' + id + '.png'), fullPage: true });
      await page.click('#toShots');
      if (!(await page.isVisible('#shotView')) || !(await page.isVisible('#copyCaption')) || !(await page.isVisible('#tipLine'))) fail(W, id + ' recording screen');
      if (!(await page.textContent('#shotView')).includes(B.SERIES[id].caption.slice(0, 20))) fail(W, id + ' caption');
      await reach(page, W, id + ' shots');
      await layout(page, W, id + ' shots');
      await page.screenshot({ path: path.join(OUT, sz.name + '-3-' + id + '-shots.png'), fullPage: true });
      await page.click('#shotView .back');
      if (!(await page.isVisible('#scriptCard'))) fail(W, id + ' back to script');
      await reach(page, W, id + ' back to script');
    }
    await page.click('#scriptView .back');
    if (!(await page.isVisible('#startBtn'))) fail(W, 'back to start');
    await page.click('#fabEarn');
    if (!(await page.isVisible('#earnView')) || !(await page.isHidden('#viewStart'))) fail(W, 'earnings screen');
    const rows = await page.$$eval('table.levels tbody tr', t => t.map(r => [...r.cells].map(c => c.textContent.replace(/\u00a0/g, ' ')).join('|')));
    if (rows.join(' / ') !== 'Level 1|1–10|10 %|9,90 € / Level 2|11–50|15 %|14,85 € / Level 3|51–150|25 %|24,75 € / Level 4|ab 151|45 %|44,55 €') fail(W, 'levels ' + rows.join(' / '));
    const ex = (await page.textContent('#exampleList')).replace(/[\s\u00a0]+/g, ' ');
    for (const k of ['10 Verkäufe99,00 €', '50 Verkäufe693,00 €', '150 Verkäufe3.168,00 €']) if (!ex.replace(/ /g, '').includes(k.replace(/ /g, ''))) fail(W, 'example ' + k + ' in ' + ex);
    await reach(page, W, 'earn');
    await layout(page, W, 'earn');
    await page.screenshot({ path: path.join(OUT, sz.name + '-4-earn.png'), fullPage: true });
    await page.click('#earnView .back');
    if (!(await page.isVisible('#startBtn'))) fail(W, 'earn back to start');
    await page.goto(base + 'affiliates/' + (LIVE ? '?v=' + Date.now() : '') + '#ugc/shots', { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('#shotView:not([hidden])');
    if ((await page.getAttribute('#sh-ugc', 'aria-pressed')) !== 'true') fail(W, 'hash pick not restored');
    /* create page */
    await page.goto(base + 'create/', { waitUntil: 'load' });
    /* Creation was rebuilt (Eden Plan screen): the headline is 'Dein KI-Studio' on this German-pinned page */
    const ct = (await page.textContent('h1')).trim(); if (!['Dein KI-Studio', 'Your AI studio', 'Tu estudio de IA'].includes(ct)) fail('create@' + sz.name, 'title ' + ct);
    const o = await overflow(page); if (o.sw > o.w + 1) fail('create@' + sz.name, 'overflow');
    await page.screenshot({ path: path.join(OUT, sz.name + '-4-create.png') });
  } catch (e) { fail(W, 'threw ' + String(e.message).split('\n')[0]); await page.screenshot({ path: path.join(OUT, sz.name + '-error.png'), fullPage: true }).catch(() => {}); }
  if (errs.length) fail(W, 'console/page errors: ' + errs.slice(0, 4).join(' | '));
  await browser.close();
}

/* A real tap at the centre of the element: whatever sits on top there gets it (this is how the theme button swallowed taps on
   Affiliates). page.mouse is used rather than locator.click because WebKit's stability wait never settles on the busy Community page. */
async function tap(p, sel) { await sleep(400); const b = await p.locator(sel).boundingBox(); if (!b) throw new Error('no box for ' + sel); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
/* the same real tap inside the Affiliates frame (scrolled into view first) */
async function ftap(p, loc) {
  await sleep(350); await loc.evaluate(e => e.scrollIntoView({ block: 'center' })); await sleep(250);
  const b = await loc.boundingBox(); if (!b) throw new Error('no box in frame');
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  const top = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 40) : 'none'; }, [x, y]);
  if (!/^IFRAME/.test(top)) throw new Error('tap at ' + Math.round(x) + ',' + Math.round(y) + ' lands on ' + top + ' (box ' + JSON.stringify(b) + ')');
  await p.mouse.click(x, y);
}
async function appTabs(engine, device) {
  const W = 'app-tabs@' + engine + '/' + device;
  const R = await H.open({ engine, device, probe: false, url: LIVE ? LIVE + 'index.html' : '' });
  const p = R.page;
  await p.context().addInitScript(seed, MEMBER);
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
    await fr.locator('#seriesCards #pick-webdesign').waitFor({ timeout: 15000 });
    const st = await p.evaluate(() => { const f = document.querySelector('iframe.rm-frame[data-view="aff"]').getBoundingClientRect(); const g = document.getElementById('cgGalaxy'); return { fw: f.width, fh: f.height, vw: innerWidth, vh: innerHeight, galaxy: g ? getComputedStyle(g).display + '/' + (g.offsetParent ? 'shown' : 'hidden') : 'none', cls: document.documentElement.classList.contains('rm-view'), sel: document.querySelector('.rm-tab[aria-selected="true"]').dataset.rm, composer: (document.getElementById('cmInput') || {}).offsetParent ? 'shown' : 'hidden' }; });
    notes.push(W + ' aff frame ' + JSON.stringify(st));
    if (st.fh < 300 || st.fw < st.vw * 0.8) fail(W, 'frame too small ' + JSON.stringify(st));
    if (!st.cls || st.sel !== 'aff' || st.composer !== 'hidden' || /shown/.test(st.galaxy)) fail(W, 'view state ' + JSON.stringify(st));
    if (!(await fr.locator('body').getAttribute('class') || '').includes('embed')) fail(W, 'frame not in embed mode');
    await sleep(400); await R.shot(path.join(OUT, 'app-' + engine + '-' + device.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-affiliates-start.png'));
    const ff = p.frames().find(f => /\/affiliates\//.test(f.url()));
    await layout(ff, W, 'in-app start');
    await ftap(p, fr.locator('#startBtn'));
    await fr.locator('#scriptView:not([hidden]) #scriptCard').waitFor({ timeout: 5000 });
    await layout(ff, W, 'in-app script');
    const inTxt = await fr.locator('#scriptView').textContent();
    /* In the app the page follows the app's language: it must match it, and the script must be there in that language. */
    const langs = await p.evaluate(() => ({ app: String((window.LowiLang && LowiLang.get && LowiLang.get()) || localStorage.getItem('lowispike.lang') || 'en').slice(0, 2) }));
    const fl = await ff.evaluate(() => document.documentElement.lang);
    if (B.normLang(langs.app) && fl !== B.normLang(langs.app)) fail(W, 'in-app language ' + fl + ' does not follow the app (' + langs.app + ')');
    const ws = B.series(fl).webdesign;
    if (!ws.scenes.every(sc => inTxt.includes(sc.lines[0])) || !inTxt.includes(B.t(fl, 'copyScript'))) fail(W, 'in-app Webdesign script missing');
    await ftap(p, fr.locator('#scriptView .back')); await ftap(p, fr.locator('#fabEarn'));
    if ((await fr.locator('#earnView:not([hidden]) table.levels tbody tr').count()) !== 4) fail(W, 'in-app levels table');
    await layout(ff, W, 'in-app earn');
    await ftap(p, fr.locator('#earnView .back')); await fr.locator('#startBtn').waitFor({ timeout: 5000 });
    const fo = await fr.locator('body').evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
    if (fo.sw > fo.w + 1) fail(W, 'in-app sideways overflow ' + JSON.stringify(fo));
    const tag = engine + '-' + device.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    await sleep(500); await R.shot(path.join(OUT, 'app-' + tag + '-affiliates.png'));
    await tap(p, '.rm-tab[data-rm="create"]');
    await p.frameLocator('iframe.rm-frame[data-view="create"]').locator('h1').waitFor({ timeout: 10000 });
    await sleep(400); await R.shot(path.join(OUT, 'app-' + engine + '-' + device.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-creation.png'));
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

/* What a visitor without a code sees: scene 1 as a preview, the rest locked, the unlock card instead of the copy buttons;
   a wrong code is refused with a message; the earnings page explains recruit levels. One phone in each language. */
async function lockedCheck(base, sz, lng) {
  const browser = await pw[sz.engine].launch();
  const ctx = await browser.newContext(sz.device ? Object.assign({}, pw.devices[sz.device]) : { viewport: sz.vp });
  await ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); } catch (e) {} }, lng);
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  const W = 'locked-' + lng + '@' + sz.name;
  try {
    for (const id of B.ORDER) {
      if (B.SERIES[id].free) continue;
      const n = B.SERIES[id].scenes.length;
      /* a fresh query each time: a hash-only change is a same-page jump and would not reload the page */
      await page.goto(base + 'affiliates/?r=' + Date.now() + '#' + id, { waitUntil: 'load' });
      await page.waitForSelector('#scriptView:not([hidden]) #gateCard');
      if (await page.$('#copyScript')) fail(W, id + ': copy button shown while locked');
      const locked = await page.$$eval('#scriptCard .scene.locked', e => e.length);
      if (locked !== n - 1) fail(W, id + ': ' + locked + ' locked scenes, expected ' + (n - 1));
      const first = B.series(lng)[id].scenes[0].lines[0], txt = await page.textContent('#scriptCard');
      if (!txt.includes(first)) fail(W, id + ': free preview scene 1 missing');
      if (txt.includes(B.series(lng)[id].scenes[1].lines[0])) fail(W, id + ': locked scene text visible');
      if (!(await page.$('#buyBtn, #buyAsk'))) fail(W, id + ': no buy option');
      const o = await overflow(page); if (o.sw > o.w + 1) fail(W, id + ': overflow ' + o.bad.join(','));
      const small = await smallTargets(page); if (small.length) fail(W, id + ': small tap targets ' + small.join(','));
      await page.fill('#unlockCode', 'WEB-AAAA-BBBB-CCCC'); await page.click('#unlockBtn');
      await page.waitForFunction(() => { const m = document.getElementById('gateMsg'); return m && m.textContent && !/…$/.test(m.textContent); }, null, { timeout: 15000 });
      if ((await page.textContent('#gateMsg')) !== B.t(lng, 'codeWrong')) fail(W, id + ': wrong code not refused');
      await page.screenshot({ path: path.join(OUT, sz.name + '-locked-' + lng + '-' + id + '.png'), fullPage: true });
      await page.goto(base + 'affiliates/?r=' + Date.now() + '#' + id + '/shots', { waitUntil: 'load' });
      await page.waitForSelector('#shotView:not([hidden]) #gateCardShots');
      if (await page.$('#copyCaption')) fail(W, id + ': caption shown while locked');
    }
    await page.goto(base + 'affiliates/?r=' + Date.now() + '#webdesign/earn', { waitUntil: 'load' });
    const rc = await page.textContent('#recruitCard');
    if (!rc.includes(B.t(lng, 'recruitTitle'))) fail(W, 'recruit levels missing on earnings');
  } catch (e) { fail(W, 'threw ' + String(e.message).split('\n')[0]); await page.screenshot({ path: path.join(OUT, sz.name + '-locked-error.png'), fullPage: true }).catch(() => {}); }
  if (errs.length) fail(W, 'page errors: ' + errs.slice(0, 3).join(' | '));
  await browser.close();
}

(async () => {
  const srv = LIVE ? null : await serve(); const base = LIVE ? LIVE : 'http://127.0.0.1:' + srv.address().port + '/lowispike/';
  for (const sz of SIZES) { await standalone(base, sz); console.log('done', sz.name); }
  await lockedCheck(base, SIZES[0], 'de'); await lockedCheck(base, SIZES[3], 'en'); await lockedCheck(base, SIZES[1], 'es'); console.log('done locked');
  if (srv) srv.close();
  await appTabs('webkit', 'iPhone SE'); console.log('done app webkit SE');
  await appTabs('webkit', 'iPhone 13'); console.log('done app webkit 13');
  await appTabs('webkit', 'iPad (gen 7)'); console.log('done app webkit iPad');
  await appTabs('chromium', 'iPhone 13'); console.log('done app chromium');
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ fails, notes }, null, 1));
  console.log(notes.join('\n'));
  console.log(fails.length ? fails.length + ' FAIL' : 'ALL OK');
  process.exit(fails.length ? 1 : 0);
})();
