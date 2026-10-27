'use strict';
/* Recipe audit for the guided week (the TikTok's complaints: "same meat every day", "recipes missing their main ingredient").
   Dumps every dinner the week can pick (the Cook pool + the six veggie extras) with its ingredients, steps and the shopping items
   the list would buy, then checks: whatever the name and steps say is the main food is in the ingredients AND on the list.
   node tools/week-flow/audit.cjs   (BASE=... for the live site). Writes /tmp/week-flow/pool.json. */
const path = require('path');
const fs = require('fs');
const http = require('http');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const root = path.join(__dirname, '..', '..');
const OUT = process.env.OUT || '/tmp/week-flow';
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
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
/* the foods a dinner can be "about": if the name or a step names one, the ingredients and the list must have it */
const FOODS = [
    ['beef', /\bbeef\b/i], ['turkey', /turkey/i], ['chicken', /chicken/i], ['salmon', /salmon/i], ['shrimp', /shrimp|prawn/i], ['tuna', /tuna/i],
    ['egg', /\beggs?\b/i], ['tofu', /tofu/i], ['halloumi', /halloumi/i], ['feta', /\bfeta\b/i], ['mozzarella', /mozzarella/i], ['cheddar', /cheddar/i],
    ['zucchini', /zucchini|courgette/i], ['cabbage', /cabbage/i], ['cauliflower', /cauliflower/i], ['broccoli', /broccoli/i], ['spinach', /spinach/i],
    ['mushroom', /mushroom/i], ['avocado', /avocado/i], ['lentil', /lentil/i], ['chickpea', /chickpea/i], ['konjac', /konja[ck]/i], ['eggplant', /eggplant|aubergine/i], ['pepper', /bell pepper|paprika pepper/i]
];
(async () => {
    const srv = process.env.BASE ? null : await serve();
    const base = process.env.BASE || ('http://127.0.0.1:' + srv.address().port + '/');
    const browser = await pw.chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route(/supabase\.co/, r => r.abort());
    await ctx.addInitScript(() => { try { localStorage.setItem('lowi.lang', 'en'); } catch (e) {} try { Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch (e) {} });
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForFunction(() => window.LowiWeekBasketCore && window.LowiStoreList && window.LowiAllRecipes, null, { timeout: 30000 });
    const pool = await page.evaluate(() => {
        const C = window.LowiWeekBasketCore, a = window.LowiAllRecipes() || [], seen = {};
        a.forEach(r => { if (r && r.id) seen[r.id] = 1; });
        const all = a.concat(C.EXTRA.filter(r => !seen[r.id]));
        const norm = x => typeof x === 'string' ? { g: x.split('|')[0], n: x.split('|')[1] } : Array.isArray(x) ? { g: x[0], n: x[1] } : x;
        return C.pool(all).map(r => ({ id: r.id, n: r.n, sub: r.sub || '', main: C.main(r), ing: (r.ing || []).map(norm), steps: [].concat(r.prep || [], r.make || [], r.steps || []).map(s => typeof s === 'string' ? s : (s && (s.t || s.text)) || ''),
            items: (window.LowiStoreList.items(r) || []).map(i => ({ k: i.k, n: i.n, g: i.g })) }));
    });
    fs.writeFileSync(path.join(OUT, 'pool.json'), JSON.stringify(pool, null, 1));
    let bad = 0;
    /* the real pool: 200 weeks per diet, 5 and 7 nights, plus a swap on every day; no meat may repeat */
    const rep = await page.evaluate(() => {
        const C = window.LowiWeekBasketCore, a = window.LowiAllRecipes() || [], seen = {}; a.forEach(r => { if (r && r.id) seen[r.id] = 1; });
        const P = C.pool(a.concat(C.EXTRA.filter(r => !seen[r.id]))), by = {}; P.forEach(r => { by[r.id] = r; });
        const ko = id => C.weekKeys(by[id]), out = [];
        const repeats = p => { const n = {}; return p.some(id => C.meats(by[id]).some(k => (n[k] = (n[k] || 0) + 1) > 1)); };
        [[], ['nofish'], ['nobeef'], ['nodairy'], ['nofish', 'nodairy']].forEach(diet => {
            const ids = P.filter(r => C.fits(C.profile(r), diet, [])).map(r => r.id);
            for (let s = 0; s < 200; s++) [5, 7].forEach(n => {
                const p = C.plan(ids, n, 'audit#' + s, null, ko); if (repeats(p)) out.push(diet.join('+') + ' ' + p.join(','));
                for (let i = 0; i < p.length; i++) { const q = C.swap(p, i, ids, 'audit#' + s, ko); if (repeats(q)) out.push('swap ' + diet.join('+') + ' ' + q.join(',')); }
            });
        });
        return out;
    });
    rep.slice(0, 10).forEach(x => console.log('MEAT TWICE ' + x));
    console.log(rep.length + ' weeks with the same meat twice (2,000 weeks + every swap checked)');
    bad += rep.length;
    pool.forEach(r => {
        const ingT = r.ing.map(i => i.n || '').join(' | '), itT = r.items.map(i => i.n || '').join(' | ');
        const about = r.n + ' ' + r.sub;
        FOODS.forEach(([f, rx]) => {
            if (!rx.test(about)) return;
            const inIng = rx.test(ingT), inList = rx.test(itT);
            if (!inIng || !inList) { bad++; console.log('MISSING ' + f + ' in ' + (inIng ? '' : 'ingredients ') + (inList ? '' : 'list ') + '-> ' + r.id + ' "' + r.n + '" | ing: ' + ingT + ' | list: ' + itT); }
        });
    });
    console.log(pool.length + ' dinners, ' + bad + ' missing main ingredients');
    await browser.close(); if (srv) srv.close();
    process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
