'use strict';
/* Oct 22, 2026: browser walk-through of the Emergency Shop location flow. Not part of `npm test` (needs Playwright).
   node tools/shop-data/location-sim.cjs                 -> serves this worktree, OpenStreetMap answers mocked
   LIVE_OSM=1 node tools/shop-data/location-sim.cjs      -> real Nominatim / Overpass answers (a few requests only)
   BASE=https://therealetm.github.io/lowispike/ node tools/shop-data/location-sim.cjs   -> the live site
   Share my location with a mocked position (Hamburg, then Munich) -> own address -> nearest supermarkets sorted by distance ->
   tap -> that chain's products. Then location denied -> postcode 80331 -> Munich shops. Day and night, EN / DE / ES,
   iPhone SE, 13, 15 (WebKit) and Pixel 7 (Chromium). No fixed town may appear anywhere. */
const path = require('path');
const fs = require('fs');
const http = require('http');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const root = path.join(__dirname, '..', '..');
const OUT = process.env.OUT || '/tmp/emerg-shop-sim';
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg' };
const CREATOR = new RegExp(['flens', 'burg'].join(''), 'i');
const PLACES = {
    hamburg: { lat: 53.5511, lon: 9.9937, road: 'Rathausmarkt', hn: '1', pc: '20095', city: 'Hamburg' },
    munich: { lat: 48.1374, lon: 11.5755, road: 'Marienplatz', hn: '8', pc: '80331', city: 'München' }
};

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
function near(p) {
    const c = p.city;
    return { elements: [
        { type: 'node', id: 11, lat: p.lat + 0.012, lon: p.lon, tags: { shop: 'supermarket', name: 'Lidl', brand: 'Lidl', 'addr:street': 'Weitweg', 'addr:housenumber': '3', 'addr:postcode': p.pc, 'addr:city': c } },
        { type: 'way', id: 12, center: { lat: p.lat + 0.002, lon: p.lon }, tags: { shop: 'supermarket', name: 'REWE', brand: 'REWE', 'addr:street': 'Nahweg', 'addr:housenumber': '1', 'addr:postcode': p.pc, 'addr:city': c } },
        { type: 'node', id: 13, lat: p.lat + 0.006, lon: p.lon, tags: { shop: 'supermarket', name: 'EDEKA Markt', brand: 'EDEKA', 'addr:street': 'Mittelweg', 'addr:housenumber': '2', 'addr:postcode': p.pc, 'addr:city': c } },
        { type: 'node', id: 14, lat: p.lat + 0.004, lon: p.lon, tags: { shop: 'convenience', name: 'Bio Kiosk ' + c } },
        { type: 'node', id: 15, lat: p.lat + 0.02, lon: p.lon, tags: { shop: 'supermarket', name: 'ALDI', brand: 'ALDI Süd' } },
        { type: 'node', id: 16, lat: p.lat + 0.009, lon: p.lon, tags: { shop: 'supermarket', name: 'Netto', brand: 'Netto Marken-Discount' } }
    ] };
}
const placeAt = (lat, lon) => (Math.abs(lat - PLACES.munich.lat) < 1 ? PLACES.munich : PLACES.hamburg);
async function mockOsm(ctx, log) {
    await ctx.route(/nominatim\.openstreetmap\.org|\/api\/interpreter/, async route => {
        const req = route.request(), url = req.url();
        log.push(url);
        if (process.env.LIVE_OSM) return route.continue();
        const json = b => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(b) });
        if (/reverse/.test(url)) {
            const u = new URL(url), p = placeAt(+u.searchParams.get('lat'), +u.searchParams.get('lon'));
            return json({ lat: String(p.lat), lon: String(p.lon), display_name: p.road + ' ' + p.hn + ', ' + p.city, address: { road: p.road, house_number: p.hn, postcode: p.pc, city: p.city, country_code: 'de' } });
        }
        if (/q=supermarket/.test(url)) {
            const vb = /viewbox=([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)/.exec(url).slice(1).map(Number);
            const pl = placeAt((vb[1] + vb[3]) / 2, (vb[0] + vb[2]) / 2);
            return json(near(pl).elements.map(e => ({ osm_type: e.type, osm_id: e.id, lat: String(e.lat || e.center.lat), lon: String(e.lon || e.center.lon), type: e.tags.shop, name: e.tags.name,
                extratags: e.tags.brand ? { brand: e.tags.brand } : {}, address: { road: e.tags['addr:street'], house_number: e.tags['addr:housenumber'], postcode: e.tags['addr:postcode'], city: e.tags['addr:city'], country_code: 'de' } })));
        }
        if (/search/.test(url)) {
            const p = /80331|m%C3%BCnchen|munich/i.test(url) ? PLACES.munich : PLACES.hamburg;
            return json([{ lat: String(p.lat), lon: String(p.lon), display_name: p.city + ', Deutschland', address: { city: p.city, postcode: p.pc, country_code: 'de' } }]);
        }
        const body = decodeURIComponent(req.postData() || '');
        const m = /around:\d+,([\d.]+),([\d.]+)/.exec(body);
        return json(near(placeAt(+m[1], +m[2])));
    });
}

const results = [];
function ok(tag, c, m) { results.push([tag, !!c, m]); console.log((c ? '  ok  ' : '  FAIL ') + tag + ' ' + m); }

async function prep(page, base, lang, theme) {
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LowiStorePicks && window.LowiStorePicksCore, null, { timeout: 45000 });
    await page.evaluate(([lang, theme]) => {
        const strip = () => document.documentElement.classList.remove('gate-boot', 'gate-up');
        strip(); new MutationObserver(strip).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        const st = document.createElement('style'); st.textContent = '#r2gate,.r2-gate,.r2-start{display:none!important}'; document.head.appendChild(st);
        document.documentElement.setAttribute('lang', lang);
        document.documentElement.setAttribute('data-theme', theme); document.documentElement.setAttribute('data-theme-mode', theme);
        setInterval(() => document.querySelectorAll('.stp-ov[inert]').forEach(n => { n.inert = false; n.removeAttribute('inert'); }), 150);
        window.LowiStorePicks.open('sim');
    }, [lang, theme]);
}
const panelText = page => page.evaluate(() => (document.querySelector('.stp-ov') || {}).innerText || '');
async function tap(page, sel) { await page.waitForSelector(sel, { timeout: 20000 }); await page.evaluate(s => document.querySelector(s).click(), sel); }

async function run(dev, launcher, base, opts) {
    const tag = dev + ' ' + opts.city + ' ' + opts.lang + ' ' + opts.theme;
    const browser = await launcher.launch();
    const p = PLACES[opts.city];
    const ctx = await browser.newContext(Object.assign({}, pw.devices[dev], { geolocation: { latitude: p.lat, longitude: p.lon }, permissions: opts.deny ? [] : ['geolocation'], locale: opts.lang }));
    await ctx.addInitScript(([lang, saved]) => {
        try { localStorage.setItem('lowi.lang', lang); localStorage.setItem('lowi_lang', lang); } catch (e) {}
        try { if (saved) localStorage.setItem('lowi.storePicks.v1', saved); else localStorage.removeItem('lowi.storePicks.v1'); } catch (e) {}
        try { Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch (e) {}
    }, [opts.lang, opts.saved || '']);
    if (opts.deny) await ctx.addInitScript(() => { navigator.geolocation.getCurrentPosition = (ok, bad) => setTimeout(() => bad({ code: 1, message: 'denied' }), 50); });
    const log = [];
    await mockOsm(ctx, log);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    try {
        await prep(page, base, opts.lang, opts.theme);
        if (opts.saved) { await tap(page, '[data-stp="pick"]'); }
        await page.waitForSelector('.stp-ov [data-stp="locate"]', { timeout: 30000 });
        ok(tag, !CREATOR.test(await panelText(page)), 'shop chooser names no fixed town');
        await tap(page, '.stp-ov [data-stp="locate"]');
        if (opts.deny) {
            await page.waitForSelector('.stp-ov .stp-msg', { timeout: 15000 });
            const t = await panelText(page);
            ok(tag, /town or postcode|Ort oder|ciudad o/i.test(t), 'denied location offers town or postcode');
            await page.fill('.stp-ov .stp-wq', '80331');
            await page.evaluate(() => document.querySelector('.stp-where').requestSubmit());
        }
        await page.waitForSelector('.stp-ov .stp-store', { timeout: 40000 });
        await page.waitForSelector('.stp-ov .stp-here', { timeout: 15000 });
        const t = await panelText(page);
        const here = await page.evaluate(() => document.querySelector('.stp-here b').textContent);
        const want = opts.deny ? PLACES.munich : p;
        if (!process.env.LIVE_OSM) ok(tag, here.indexOf(want.city) >= 0, 'address line: ' + here);
        else ok(tag, here.length > 3, 'address line: ' + here);
        const rows = await page.evaluate(() => [...document.querySelectorAll('.stp-store')].map(b => ({ n: b.querySelector('b').textContent, d: b.querySelector('i').textContent })));
        const km = d => /km/.test(d) ? parseFloat(d.replace(',', '.')) : parseFloat(d) / 1000;
        ok(tag, rows.length >= 3 && rows.every((r, i) => i === 0 || km(r.d) >= km(rows[i - 1].d)), rows.length + ' shops, nearest first: ' + rows.slice(0, 4).map(r => r.n + ' ' + r.d).join(', '));
        ok(tag, !CREATOR.test(t), 'no fixed town after locating');
        await page.screenshot({ path: path.join(OUT, tag.replace(/\W+/g, '-') + '-shops.png') });
        const fit = await page.evaluate(() => { const r = document.querySelector('.stp-where').getBoundingClientRect(); return r.right <= innerWidth + 1 && r.left >= -1; });
        ok(tag, fit, 'town field fits the screen');
        // tap the nearest shop that has a chain, or the kiosk for the general list
        const pickKiosk = !!opts.kiosk;
        await page.evaluate(k => { const b = [...document.querySelectorAll('.stp-store')].find(x => k ? /Kiosk/.test(x.textContent) : true); b.click(); }, pickKiosk);
        await page.waitForSelector('.stp-ov .stp-item', { timeout: 60000 });
        const lt = await panelText(page);
        ok(tag, pickKiosk ? /general list|allgemeine Liste|lista general/.test(lt) : /REWE/.test(lt), pickKiosk ? 'kiosk -> general list with its one-line note' : 'REWE -> its products');
        const saved = await page.evaluate(() => localStorage.getItem('lowi.storePicks.v1'));
        ok(tag, saved && !/"lat"|"lon"/.test(saved) && !CREATOR.test(saved), 'saved shop has no position: ' + saved);
        ok(tag, log.every(u => !/lowispike|127\.0\.0\.1/.test(u)), log.length + ' OpenStreetMap requests, none to our server');
        await page.screenshot({ path: path.join(OUT, tag.replace(/\W+/g, '-') + '-list.png') });
    } catch (e) {
        ok(tag, false, 'flow broke: ' + String(e).split('\n')[0]);
        try { await page.screenshot({ path: path.join(OUT, tag.replace(/\W+/g, '-') + '-broke.png') }); } catch (x) {}
    }
    ok(tag, !errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
    await browser.close();
}

(async () => {
    let srv = null, base = process.env.BASE;
    if (!base) { srv = await serve(); base = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const runs = [
        ['iPhone SE', pw.webkit, { city: 'hamburg', lang: 'de', theme: 'light' }],
        ['iPhone 13', pw.webkit, { city: 'munich', lang: 'en', theme: 'dark', kiosk: true }],
        ['iPhone 15', pw.webkit, { city: 'hamburg', lang: 'es', theme: 'dark', deny: true, saved: JSON.stringify({ range: 'aldi', store: { id: 'n123', brand: 'Aldi Nord', town: 'X' } }) }],
        ['Pixel 7', pw.chromium, { city: 'munich', lang: 'en', theme: 'light' }]
    ];
    const only = process.env.ONLY;
    for (const r of runs) if (!only || r[0] === only) await run(r[0], r[1], base, r[2]);
    if (srv) srv.close();
    const bad = results.filter(r => !r[1]);
    console.log(bad.length ? bad.length + ' FAIL' : '0 FAIL, ' + results.length + ' checks');
    process.exit(bad.length ? 1 : 0);
})();
