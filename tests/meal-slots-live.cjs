'use strict';
/* Live check for Log meal slots + Snacks to buy (Oct 19, 2026). Not part of `node --test` (needs Playwright).
   node tests/meal-slots-live.cjs                                            -> this worktree on a local port
   BASE=https://therealetm.github.io/lowispike/ node tests/meal-slots-live.cjs -> the live site
   WebKit iPhone 13, WebKit iPad landscape and portrait; English, German, Spanish. Backend calls are blocked (only GETs to the site pass),
   so nothing reaches the server and no photo checks are used. */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(path.join(__dirname, '..')), OUT = process.env.OUT || '/tmp/meal-slots-shots';
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
} catch (e) { }`;

const IPADP = Object.assign({}, IPAD, { viewport: { width: 820, height: 1180 }, screen: { width: 820, height: 1180 } });
const VIEWS = { iphone13_webkit: pw.devices['iPhone 13'], ipad_landscape_webkit: IPAD, ipad_portrait_webkit: IPADP };
const NAMES = { en: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'], de: ['Frühstück', 'Mittagessen', 'Abendessen', 'Snacks'], es: ['Desayuno', 'Almuerzo', 'Cena', 'Snacks'] };

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    let srv = null, url = process.env.BASE;
    if (!url) { srv = await serve(); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const host = new URL(url).host;
    const fails = [], log = [];
    const ok = (c, m) => { if (!c) fails.push(m); log.push((c ? 'ok   ' : 'FAIL ') + m); };
    for (const name of Object.keys(VIEWS)) {
        const browser = await pw.webkit.launch();
        const ctx = await browser.newContext(Object.assign({}, VIEWS[name], { serviceWorkers: 'block' }));
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage();
        const errs = []; page.on('pageerror', e => errs.push(String(e && e.message || e)));
        const P = name + ': ';
        try {
            await page.goto(url + '?ms=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => !!(window.LowiHomeBloomsV2 && window.LowiSpirit && window.LowiVitalsBridge && document.querySelector('[data-orbit="fuel"]')), null, { timeout: 90000 });
            await sleep(2500);
            const build = await page.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || '');
            log.push(P + 'build ' + build);
            const onScreen = sel => page.evaluate(s => [...document.querySelectorAll(s)].map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim().replace(/\s+/g, ' '), w: Math.round(r.width), h: Math.round(r.height), in: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5, top: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) && e.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) }; }), sel);
            // 1. the real Fuel orb -> Log meal opens the four slots
            await page.evaluate(() => { window.LowiHomeBloomsV2.mount(document); window.LowiHomeBloomsV2.open('fuel'); });
            await sleep(1400);
            await page.tap('#hb2Bloom [data-id="log"]');
            await page.waitForSelector('.sp-slots', { timeout: 8000 });
            await sleep(900);
            let tiles = await onScreen('.sp-slot');
            ok(tiles.length === 4 && tiles.every(t => t.in && t.top && t.h >= 100 && t.w >= 120), P + 'Log meal shows 4 slot tiles, on screen and tappable ' + JSON.stringify(tiles.map(t => [t.t, t.w, t.h, t.in, t.top])));
            ok(await page.evaluate(() => document.querySelectorAll('.sp-slot.now').length === 1), P + 'the slot for this time of day is marked "now"');
            await page.screenshot({ path: path.join(OUT, name + '-picker-en.png') });
            // 2. Breakfast -> Write / Scan / Snap, type Paprika, saved with its slot
            await page.tap('.sp-slot-breakfast');
            await page.waitForSelector('.sp-slot-head', { timeout: 5000 });
            await sleep(1200);
            const how = await onScreen('.sp-how');
            ok(how.length === 3 && how.every(h => h.in && h.top && h.h >= 60), P + 'Breakfast: Write / Scan / Snap on screen ' + JSON.stringify(how.map(h => [h.t, h.h, h.in, h.top])));
            ok(await page.evaluate(() => document.querySelector('.sp-slot-head h2').textContent === 'Breakfast'), P + 'slot head says Breakfast');
            await page.screenshot({ path: path.join(OUT, name + '-breakfast-en.png') });
            await page.tap('[data-sp="slotWrite"]');
            await sleep(500);
            ok(await page.evaluate(() => document.activeElement && document.activeElement.name === 'title'), P + 'Write puts the cursor in the meal box');
            await page.fill('#spMeal input[name="title"]', 'Paprika');
            await page.evaluate(() => document.getElementById('spMeal').requestSubmit());
            await sleep(1200);
            let last = await page.evaluate(() => { const l = window.LowiVitalsBridge.state().logs; return l[l.length - 1] || null; });
            ok(last && last.t === 'Paprika' && last.slot === 'breakfast', P + 'typed meal saved as breakfast ' + JSON.stringify(last && [last.t, last.slot]));
            ok(await page.evaluate(() => !!document.querySelector('.sp-slot-tag')), P + 'Saved card shows the slot');
            // 3. same food as a snack: not blocked as a duplicate, one tap from recents in the Snacks slot afterwards
            await page.evaluate(() => { window.LowiR2 && window.LowiR2.closeAll && window.LowiR2.closeAll(); window.LowiSpirit.meal(); });
            await page.waitForSelector('.sp-slot-snack', { timeout: 5000 }); await sleep(700);
            await page.tap('.sp-slot-snack');
            await page.waitForSelector('.sp-slot-head', { timeout: 5000 }); await sleep(500);
            const rec = await page.evaluate(() => [...document.querySelectorAll('[data-sp="quickMeal"]')].map(b => b.textContent.trim()));
            log.push(P + 'snack recents ' + JSON.stringify(rec));
            const btn = await page.$('[data-sp="quickMeal"]');
            if (btn) { await btn.tap(); await sleep(1200); }
            last = await page.evaluate(() => { const l = window.LowiVitalsBridge.state().logs; return l[l.length - 1] || null; });
            const nP = await page.evaluate(() => window.LowiVitalsBridge.state().logs.filter(l => l.t === 'Paprika').map(l => l.slot));
            ok(nP.join(',') === 'breakfast,snack', P + 'Paprika again as a snack, one tap, saved as a snack ' + JSON.stringify(nP));
            // 4. German and Spanish words, tiles still fit
            for (const lang of ['de', 'es']) {
                await page.evaluate(l => { window.LowiR2 && window.LowiR2.closeAll && window.LowiR2.closeAll(); try { window.LowiLang.set(l); } catch (e) { document.documentElement.lang = l; } }, lang);
                await sleep(500);
                await page.evaluate(() => window.LowiSpirit.meal());
                await page.waitForSelector('.sp-slots', { timeout: 5000 }); await sleep(900);
                tiles = await onScreen('.sp-slot b');
                ok(tiles.map(t => t.t).join('|') === NAMES[lang].join('|'), P + lang + ' slot names ' + JSON.stringify(tiles.map(t => t.t)));
                const fit = await page.evaluate(() => [...document.querySelectorAll('.sp-slot')].every(s => s.scrollWidth <= s.clientWidth + 1 && s.getBoundingClientRect().right <= innerWidth));
                ok(fit, P + lang + ' words fit inside the tiles');
                await page.screenshot({ path: path.join(OUT, name + '-picker-' + lang + '.png') });
            }
            await page.evaluate(() => { window.LowiR2 && window.LowiR2.closeAll && window.LowiR2.closeAll(); try { window.LowiLang.set('en'); } catch (e) { } });
            await sleep(600);
            // 5. Shop: Snacks to buy
            await page.evaluate(() => window.LowiStorePicks.open());
            await page.waitForSelector('.stp-snacks', { timeout: 15000 }); await sleep(900);
            await page.fill('.stp-snack-add input', 'Rice cakes');
            await page.tap('.stp-snack-add button[type="submit"]');
            await sleep(500);
            let sn = await page.evaluate(() => window.LowiStorePicks.snacks());
            ok(sn.length === 1 && sn[0].n === 'Rice cakes' && !sn[0].got, P + 'Shop: snack added to buy ' + JSON.stringify(sn));
            // Oct 26: the Again pills became one Buy again row; its preview line names the recent snacks
            const again = await page.evaluate(() => { const r = document.querySelector('[data-stp-snack-refill] .stp-again-t small'); return r ? r.textContent.split(' · ') : []; });
            ok(again.includes('Paprika'), P + 'Shop: logged snack Paprika offered under Buy again ' + JSON.stringify(again));
            const row = await onScreen('.stp-snack');
            ok(row.length === 1 && row[0].in, P + 'Shop: the snack row is on screen ' + JSON.stringify(row));
            await page.screenshot({ path: path.join(OUT, name + '-shop-snacks.png') });
            await page.tap('.stp-snack-tick');
            await sleep(500);
            sn = await page.evaluate(() => window.LowiStorePicks.snacks());
            const buyRows = await page.evaluate(() => document.querySelectorAll('.stp-snack').length);
            ok(sn[0].got > 0 && buyRows === 0, P + 'Shop: ticked = bought, off the buy list');
            ok(await page.evaluate(() => { const r = document.querySelector('[data-stp-snack-refill] .stp-again-t small'); return !!r && r.textContent.split(' · ').includes('Rice cakes'); }), P + 'Shop: bought snack waits under Buy again');
            ok(await page.evaluate(() => JSON.parse(localStorage.getItem('lowi.snackBuy.v1') || '[]').length === 1), P + 'Shop: list kept on the phone');
            await page.evaluate(() => window.LowiStorePicks.close());
            const bad = errs.filter(e => !/Load failed|NetworkError|Failed to fetch|access control|cancelled/i.test(e));
            ok(bad.length === 0, P + 'no page errors ' + bad.slice(0, 3).join(' / '));
        } catch (e) { fails.push(P + 'crashed: ' + (e && e.stack || e)); }
        await browser.close();
    }
    if (srv) srv.close();
    console.log(log.join('\n'));
    if (fails.length) { console.log('\nFAILED ' + fails.length + ':\n' + fails.join('\n')); process.exit(1); }
    console.log('\nPASS meal-slots-live, shots in ' + OUT);
})();
