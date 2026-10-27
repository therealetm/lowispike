'use strict';
/* Screenshots + layout checks of Shop (Supermarket / From home tabs) at iPhone, small iPhone (SE) and iPad sizes, DE/EN/ES.
   node tools/shop-calm/shot.cjs            -> serves this worktree
   BASE=https://therealetm.github.io/lowispike/ node tools/shop-calm/shot.cjs -> live files
   ENGINE=webkit to use simulated Safari. Every *.supabase.co request is aborted. */
const path = require('path');
const fs = require('fs');
const http = require('http');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const root = path.join(__dirname, '..', '..');
const OUT = process.env.OUT || '/tmp/shop-calm';
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
function serve() {
    return new Promise(res => {
        const s = http.createServer((q, r) => {
            let f = decodeURIComponent(q.url.split('?')[0]);
            if (f.endsWith('/')) f += 'index.html';
            const p = path.join(root, f);
            if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
            r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
            fs.createReadStream(p).pipe(r);
        }).listen(0, () => res(s));
    });
}
const SIZES = (process.env.SIZES || 'iphone,se,ipad').split(',');
const LANGS = (process.env.LANGS || 'de,en,es').split(',');
const DIM = { iphone: { width: 390, height: 844 }, se: { width: 375, height: 667 }, ipad: { width: 820, height: 1180 }, mini: { width: 320, height: 568 } };
let fails = 0;
(async () => {
  const s = await serve(); const base = 'http://localhost:' + s.address().port + '/';
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: DIM.iphone, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem('lowi.lang', 'en'); Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch (e) {} });
  const page = await ctx.newPage(); page.on('pageerror', e => console.log('ERR', String(e)));
  await page.goto(base + '?t=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LowiStorePicks && window.LowiWeekBasketCore && window.LowiAllRecipes, null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  const d = await page.evaluate(() => {
    const C = window.LowiWeekBasketCore; const all = window.LowiAllRecipes();
    const pool = C.pool(all); const ingAll={}; all.forEach(r=>(r.ing||[]).forEach(i=>{ingAll[i.g+':'+i.n]=(window.LowiLang&&window.LowiLang.t)?[window.LowiLang.t(i.n,'de'),window.LowiLang.t(i.n,'es')]:1;})); window.__ing=ingAll;
    const r0 = pool[0];
    return { ingAll, tsig: String(window.LowiLang&&window.LowiLang.t).slice(0,300), n: all.length, pool: pool.length, keys: Object.keys(r0), sample: JSON.stringify(r0).slice(0, 2500),
      list: pool.map(r => ({ id: r.id, name: r.n, time: window.LOWI_COOK.min(r.id), prot: window.LOWI_COOK.match(r,'protein'), steps: (r.steps||[]).join(' / ').slice(0,400), prep:r.prep, make:r.make, ing: (r.ingredients || r.ing || []).map(i => typeof i === 'string' ? i : (i.n || i.name || JSON.stringify(i))).join(' | ').slice(0, 300) })) };
  });
  fs.writeFileSync('/tmp/pool.json', JSON.stringify(d, null, 1));
  console.log(d.n, d.pool, d.keys.join(','));
  await page.evaluate(() => { const strip = () => document.documentElement.classList.remove('gate-boot', 'gate-up'); strip(); const st = document.createElement('style'); st.textContent = '#r2gate,.r2-gate,.r2-start{display:none!important}'; document.head.appendChild(st); window.LowiStorePicks.open('test'); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const b = document.querySelector('.stp-card [data-stp-tab="home"]'); b && b.click(); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/wf-before-home.png', fullPage: false });
  const txt = await page.evaluate(() => (document.querySelector('.stp-card') || document.body).innerText);
  console.log(txt.slice(0, 2500));
  await browser.close(); s.close();
})();
