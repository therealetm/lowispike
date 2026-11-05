'use strict';
/* Nov 5 2026 (cart lane): reproduce the owner's "€40 for 7 dinners gave €83.77" and find the cheapest week the pool allows.
   node tools/cart-aid/probe-budget.cjs   (serves this worktree, every outside request aborted) */
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
    const seed = JSON.stringify({ people: +(process.env.PEOPLE || 2), nights: 7, budget: 40, store: 'lidl', setup: true, kit: ['hob', 'oven'] });
    await ctx.addInitScript(s => { try { localStorage.setItem('lowi.lang', 'en'); localStorage.setItem('lowispike.weekshop.v1', s); } catch (e) {} }, seed);
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LowiWeekBasket && window.LowiStoreList && window.LowiAllRecipes, null, { timeout: 90000 });
    await page.waitForTimeout(1500);
    const out = await page.evaluate(() => {
        LowiWeekBasket.open(); let c0 = LowiWeekBasket._ctx(); const S = LowiWeekBasket._state(), c = LowiWeekBasket._ctx(); const C = LowiWeekBasketCore;
        if (!c) return { err: 'no ctx', S };
        const SL = LowiStoreList, price = (i, s) => SL.price(i, s) || 0;
        const cost1 = id => { const items = C.basket([{ id, items: SL.items(c.byId[id]) || [] }], S.people); return C.total(items, price, S.store, {}); };
        const per = c.ids.map(id => [id, Math.round(cost1(id) * 100) / 100]).sort((a, b) => a[1] - b[1]);
        const build = ids => { const items = C.basket(ids.map(id => ({ id, items: SL.items(c.byId[id]) || [] })), S.people); return C.total(items, price, S.store, {}); };
        const cheapest7 = per.slice(0, 7).map(x => x[0]);
        return { people: S.people, nights: S.nights, budget: S.budget, store: S.store, pool: c.ids.length, sum: c.sum, plan: S.plan, bs: c.bs,
            items: c.items.map(i => [i.n, i.packs, Math.round(price(i, S.store) * 100) / 100, c.have[i.k] ? 'have' : '']),
            perDinner: per, cheapest7sum: Math.round(build(cheapest7) * 100) / 100, totals: c.totals.slice(0, 7) };
    });
    console.log(JSON.stringify(out, null, 1)); if (errs.length) console.log('page errors', errs);
    await b.close(); srv.close();
});
