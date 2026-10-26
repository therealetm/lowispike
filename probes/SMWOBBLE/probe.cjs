'use strict';
/* Supermarket wobble probe (Oct 26): opens Shop > Supermarket (Lidl) with long bought snack names and measures sideways overflow.
   node probe.cjs [worktree] ; BASE=https://therealetm.github.io/lowispike/ to probe live. ENG=webkit|chromium LANGS=en,de,es VPS=390x844,820x1180 */
const path = require('path'), fs = require('fs'), http = require('http');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const root = path.resolve(process.argv[2] || '/home/sprite/wt-sm-wobble');
const OUT = process.env.OUT || '/tmp/smwobble'; fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
function serve() { return new Promise(res => { const s = http.createServer((q, r) => { let f = decodeURIComponent(q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html'; const p = path.join(root, f); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0, () => res(s)); }); }
const LONG = ['Geröstete Mandeln Nüsse ungesalzen aus dem Ofen', 'Crunchy Chicken Caesar Lettuce Boats', 'Shirataki Carbonara Pull Apart Noodles', 'Bio Leinsamen geschrotet', 'Paprika rot', 'Greek yoghurt'];
async function run(eng, lang, vp, base, tag) {
  const L = pw[eng]; const b = await L.launch();
  const opts = eng === 'webkit' && vp.w === 390 ? Object.assign({}, pw.devices['iPhone 13']) : { viewport: { width: vp.w, height: vp.h }, hasTouch: true };
  opts.locale = { en: 'en-GB', de: 'de-DE', es: 'es-ES' }[lang]; opts.reducedMotion = 'reduce';
  const ctx = await b.newContext(opts);
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(([LONG, lang]) => {
    try {
      localStorage.setItem('lowi.storePicks.v1', JSON.stringify({ range: 'lidl', store: { id: 'osm:1', name: 'Lidl', addr: 'Merkurstraße 24, Flensburg', km: 1.2 } }));
      const now = Date.now(); localStorage.setItem('lowi.snackBuy.v1', JSON.stringify(LONG.map((n, i) => ({ id: 'sn' + i, n, at: now - 1e6 + i, got: now - i * 1000 }))));
      localStorage.setItem('lowi.storePicks.tab', 'shop');
    } catch (e) {}
    try { Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch (e) {}
  }, [LONG, lang]);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LowiStorePicks && window.LowiStorePicksCore, null, { timeout: 60000 });
  await page.evaluate((lang) => {
    document.documentElement.lang = lang;
    const strip = () => document.documentElement.classList.remove('gate-boot', 'gate-up'); strip(); new MutationObserver(strip).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const st = document.createElement('style'); st.textContent = '#r2gate,.r2-gate,.r2-start{display:none!important}'; document.head.appendChild(st);
    window.LowiStorePicks.open('test');
    const unlock = () => document.querySelectorAll('.stp-ov[inert]').forEach(n => { n.inert = false; n.removeAttribute('inert'); }); unlock(); setInterval(unlock, 200);
  }, lang);
  await page.waitForSelector('.stp-ov button.stp-item', { timeout: 60000 });
  await page.waitForTimeout(700);
  const m = await page.evaluate(() => {
    const sc = document.querySelector('.stp-scroll'), card = document.querySelector('.stp-card');
    const cr = card.getBoundingClientRect(), sr = sc.getBoundingClientRect();
    const pick = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left - cr.left), r: Math.round(cr.right - r.right), w: Math.round(r.width) }; };
    const wide = [...sc.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > sr.right + 0.5 || r.left < sr.left - 0.5) && !e.closest('.stp-jumps'); }).slice(0, 6).map(e => String(e.className) + ' w' + Math.round(e.getBoundingClientRect().width));
    sc.scrollLeft = 200; const sl = sc.scrollLeft; sc.scrollLeft = 0;
    const se = document.scrollingElement; se.scrollLeft = 200; const docSl = se.scrollLeft; se.scrollLeft = 0;
    return { scrollW: sc.scrollWidth, clientW: sc.clientWidth, canScrollX: sl, docScrollX: docSl, cardW: Math.round(cr.width), vw: innerWidth, shop: pick('.stp-shop'), q: pick('.stp-q'), wb: pick('.stp-wb'), acts: pick('.stp-foot-acts'), snacks: pick('.stp-snacks'), sum: pick('.stp-sum'), jumps: pick('.stp-jumps'), group: pick('.stp-group'), again: pick('.stp-snack-again') || pick('.stp-again'), wide };
  });
  await page.screenshot({ path: OUT + '/' + tag + '.png' });
  // Buy again: one row; one tap fills Snacks to buy; Undo puts the list back
  const T = {};
  T.rows = await page.locator('.stp-again[data-stp-snack-refill]').count();
  T.oldPills = await page.locator('[data-stp-snack-again]').count();
  T.rowH = await page.evaluate(() => { const e = document.querySelector('.stp-again'); return e ? Math.round(e.getBoundingClientRect().height) : 0; });
  T.label = await page.evaluate(() => { const e = document.querySelector('.stp-again'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
  if (T.rows) {
    await page.locator('.stp-again[data-stp-snack-refill]').scrollIntoViewIfNeeded();
    await page.tap('.stp-again[data-stp-snack-refill]'); await page.waitForTimeout(300);
    T.afterFill = await page.evaluate(() => ({ buy: document.querySelectorAll('.stp-snack').length, stored: JSON.parse(localStorage.getItem('lowi.snackBuy.v1')).filter(i => !i.got).length, status: (document.querySelector('.stp-again-done') || {}).innerText, focus: document.activeElement && document.activeElement.className, sx: document.querySelector('.stp-scroll').scrollWidth - document.querySelector('.stp-scroll').clientWidth }));
    await page.screenshot({ path: OUT + '/' + tag + '-filled.png' });
    await page.tap('[data-stp-snack-undo]'); await page.waitForTimeout(300);
    T.afterUndo = await page.evaluate(() => ({ buy: document.querySelectorAll('.stp-snack').length, stored: JSON.parse(localStorage.getItem('lowi.snackBuy.v1')).filter(i => !i.got).length, row: !!document.querySelector('[data-stp-snack-refill]') }));
  }
  m.tap = T;
  m.tapOk = T.rows === 1 && T.oldPills === 0 && T.afterFill && T.afterFill.buy === 6 && T.afterFill.stored === 6 && T.afterUndo.buy === 0 && T.afterUndo.stored === 0 && T.afterUndo.row && T.afterFill.sx <= 0;
  await b.close();
  return Object.assign(m, { errors: errors.slice(0, 3) });
}
(async () => {
  let srv = null, base = process.env.BASE;
  if (!base) { srv = await serve(); base = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const engs = (process.env.ENG || 'webkit').split(','), langs = (process.env.LANGS || 'en').split(',');
  const vps = (process.env.VPS || '390x844').split(',').map(s => { const [w, h] = s.split('x').map(Number); return { w, h }; });
  let bad = 0;
  for (const eng of engs) for (const vp of vps) for (const lang of langs) {
    const tag = eng + '-' + vp.w + 'x' + vp.h + '-' + lang;
    try { const m = await run(eng, lang, vp, base, tag); const fail = m.canScrollX > 0 || m.docScrollX > 0 || m.scrollW > m.clientW + 1 || (process.env.TAP && !m.tapOk); if (fail) bad++; console.log((fail ? 'FAIL ' : 'ok   ') + tag + ' ' + JSON.stringify(m)); }
    catch (e) { bad++; console.log('ERR  ' + tag + ' ' + e.message.split('\n')[0]); }
  }
  if (srv) srv.close();
  process.exit(bad ? 1 : 0);
})();
