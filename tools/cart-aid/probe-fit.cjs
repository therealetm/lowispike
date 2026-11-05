'use strict';
/* Nov 5 2026 (cart lane): €40 / 7 dinners / 2 people at Lidl, tap the real "Fit my budget" link and read what the page says.
   node tools/cart-aid/probe-fit.cjs [shot.png] */
const path = require('path'), fs = require('fs'), http = require('http');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const root = path.join(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { let f = decodeURIComponent(q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html'; const p = path.join(root, f);
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
srv.listen(0, async () => {
    const base = 'http://localhost:' + srv.address().port + '/index.html';
    const b = await pw.chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route(u => !/^http:\/\/localhost:/.test(String(u)), r => r.abort());
    const seed = JSON.stringify({ people: +(process.env.PEOPLE || 2), nights: 7, budget: +(process.env.BUDGET || 40), store: 'lidl', setup: true, kit: ['hob', 'oven'] });
    await ctx.addInitScript(s => { try { localStorage.setItem('lowi.lang', 'en'); localStorage.setItem('lowispike.weekshop.v1', s); } catch (e) {} }, seed);
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LowiWeekBasket && window.LowiStoreList && window.LowiAllRecipes, null, { timeout: 90000 });
    await page.waitForTimeout(1200);
    await page.evaluate(() => { const strip = () => document.documentElement.classList.remove('gate-boot', 'gate-up');
        strip(); new MutationObserver(strip).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        const st = document.createElement('style'); st.textContent = '#r2gate,.r2-gate,.r2-start{display:none!important}'; document.head.appendChild(st); });
    await page.evaluate(() => LowiWeekBasket.open()); await page.waitForTimeout(800);
    const before = await page.evaluate(() => ({ sum: LowiWeekBasket._ctx() && LowiWeekBasket._ctx().sum, plan: LowiWeekBasket._state().plan.slice() }));
    if (process.env.PEEK) { await page.screenshot({ path: '/tmp/peek.png' }); console.log(await page.evaluate(() => { const f = document.querySelector('[data-wb="fit"]'); let e = f, chain = []; while (e) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) chain.push(e.className + ':' + cs.display + '/' + cs.visibility + '/' + cs.opacity); e = e.parentElement; } const o = document.querySelector('.wb-ov'); return JSON.stringify({ r: f.getBoundingClientRect(), chain, view: o ? o.innerText.slice(0, 300) : '' }); })); }
    const fit = page.locator('[data-wb="fit"]:visible');
    const hadFit = await fit.count();
    if (hadFit) { await fit.first().dispatchEvent('click'); await page.waitForTimeout(600); }
    const after = await page.evaluate(() => ({ sum: LowiWeekBasket._ctx() && LowiWeekBasket._ctx().sum, nights: LowiWeekBasket._state().nights, budget: LowiWeekBasket._state().budget, plan: LowiWeekBasket._state().plan.slice(),
        over: (document.querySelector('.wb-over') || {}).innerText || '', fitLink: !!document.querySelector('[data-wb="fit"]'), btns: [...document.querySelectorAll('.wb-over-go')].map(x => x.innerText) }));
    if (process.argv[2]) { const o = page.locator('.wb-over'); if (await o.count()) await o.scrollIntoViewIfNeeded(); await page.screenshot({ path: process.argv[2] }); }
    let fewer = null;
    if (process.env.TAP) { const t = page.locator('[data-wb="' + process.env.TAP + '"]'); if (await t.count()) { await t.first().dispatchEvent('click'); await page.waitForTimeout(600);
        fewer = await page.evaluate(() => ({ sum: LowiWeekBasket._ctx().sum, nights: LowiWeekBasket._state().nights, budget: LowiWeekBasket._state().budget, plan: LowiWeekBasket._state().plan.length, over: !!document.querySelector('.wb-over'), fit: !!document.querySelector('[data-wb="fit"]') })); } }
    console.log(JSON.stringify({ hadFit, before, after, tapped: fewer, errs }, null, 1));
    await b.close(); srv.close();
});
