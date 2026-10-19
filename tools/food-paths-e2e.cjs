'use strict';
/* Exploration: dump what each food path shows (Scan camera + Shopping, Gap blooms, Fuel blooms, Cook). */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || '/home/sprite/wt-food-paths', OUT = process.env.OUT || '/home/sprite/FOODPATHS/shots';
const pw = require('/tmp/pw/node_modules/playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.tutorial.v1', JSON.stringify({done:true}));
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
} catch (e) { }`;

const DEV = process.env.DEV || 'iPhone 13', LANG = process.env.LANG2 || '';
(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    let srv = null, url = process.env.BASE;
    if (!url) { srv = await serve(); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const host = new URL(url).host;
    const browser = await pw.webkit.launch();
    const ctx = await browser.newContext(Object.assign({}, pw.devices[DEV], { serviceWorkers: 'block' }));
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
    await ctx.addInitScript(INIT + (LANG ? `;try{localStorage.setItem('lowispike.lang','${LANG}');localStorage.setItem('lowi.lang','${LANG}')}catch(e){}` : ''));
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e && e.message || e)));
    await page.goto(url + '?x=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => !!(window.LowiHomeBloomsV2 && window.LowiSpirit && window.LowiDex && document.querySelector('[data-orbit="fuel"]')), null, { timeout: 90000 });
    await sleep(2500);
    const R = {}; const ok = (k, v) => { R[k] = v; console.log((v ? 'PASS ' : 'FAIL ') + k); };
    const shot = n => page.screenshot({ path: path.join(OUT, DEV.replace(/\W/g, '') + (LANG || '') + '-' + n + '.png') });
    const closeAll = () => page.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} try { LowiDex.stop(); } catch (e) {} try { LowiSpirit.close(); } catch (e) {} });
    const vis = sel => page.evaluate(s => { const e = [...document.querySelectorAll(s)].find(x => { if (x.closest('.r2-ov.off')) return false; const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(x).visibility !== 'hidden'; }); return !!e; }, sel);
    const logs = () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('lowispike.v2')).logs || []; } catch (e) { return []; } });
    // 1 Scan camera: no Shopping switch
    await page.evaluate(() => LowiDex.scan('cam')); await sleep(2000);
    ok('scan camera has no Shopping switch', !(await vis('.ss-pill')) && !(await vis('.ss-row')));
    await shot('scan'); await closeAll(); await sleep(800);
    // 2 Fuel > Shop: plain buttons, Scan in the shop opens the shopping camera
    await page.evaluate(() => LowiHomeBloomsV2.open('fuel')); await sleep(1300);
    await page.tap('#hb2Bloom [data-id="shop"]'); await sleep(1800);
    ok('Shop sheet shows Scan in the shop + Shopping list', (await vis('[data-stp="scanshop"]')) && (await vis('[data-stp="mylist"]')));
    const bb = await page.evaluate(() => [...document.querySelectorAll('[data-stp="scanshop"],[data-stp="mylist"],[data-stp="close"]')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; }));
    console.log('shop buttons', JSON.stringify(bb), 'vw', await page.evaluate(() => innerWidth + 'x' + innerHeight));
    ok('Shop buttons inside the screen', bb.length >= 2 && bb.every(r => r[0] >= 0 && r[2] <= (DEV.includes('iPad') ? 1400 : 400) && r[3] <= 1400));
    await shot('shop'); await page.tap('[data-stp="scanshop"]'); await sleep(2200);
    ok('Scan in the shop opens the shopping camera', (await page.evaluate(() => LowiDex.shopOn())) && (await vis('.ss-pill')));
    await shot('shopcam'); await closeAll(); await sleep(900);
    // 3 Product cards
    const known = { id: 'p-known', name: 'Bio Haferflocken', brand: 'Kölln', barcode: '4000540000108', verdict: 'ok', why: ['fiber'], facts: { c: 58, s: 1.2, f: 10, p: 13 }, source: 'community', byName: 'Eman' };
    const fresh = { name: 'Skyr Natur', brand: 'Arla', barcode: '5711953068881', verdict: 'ok', why: ['protein'], facts: { c: 4, s: 4, f: 0, p: 11 }, source: 'off' };
    await page.evaluate(p => LowiDex.reveal(p), known); await sleep(1800);
    ok('known product: no Catch, shows Pathfinder name', !(await vis('[data-b3="catch"]')) && (await page.evaluate(() => (document.querySelector('.sc-known') || {}).textContent || '')).includes('Eman'));
    await shot('card-known');
    const n0 = (await logs()).length;
    const eat = await page.$('[data-b3="eat"]'); if (eat) { await eat.tap(); await eat.tap().catch(() => {}); } await sleep(1800);
    const n1 = (await logs()).length;
    ok('I ate this logs exactly one meal (double tap)', n1 === n0 + 1);
    await closeAll(); await sleep(900);
    await page.evaluate(p => LowiDex.reveal(p), fresh); await sleep(1800);
    ok('new product: Be the first to add it', (await page.evaluate(() => (document.querySelector('[data-b3="catch"]') || {}).textContent || '')).length > 5);
    await shot('card-new'); await closeAll(); await sleep(900);
    console.log('after fresh closeAll eat visible', await vis('[data-b3="eat"]'));
    // shopping camera (opened the real way: Fuel > Shop > Scan in the shop) -> scan a barcode -> its card has no I ate this, logs nothing
    await page.evaluate(() => LowiHomeBloomsV2.open('fuel')); await sleep(1300);
    await page.tap('#hb2Bloom [data-id="shop"]'); await sleep(1800);
    await page.tap('[data-stp="scanshop"]'); await sleep(2200);
    const shopOn = await page.evaluate(() => LowiDex.shopOn());
    const gap0 = await page.evaluate(() => { try { return JSON.stringify(JSON.parse(localStorage.getItem('lowispike.v2')).fast || null); } catch (e) { return ''; } });
    const ns0 = (await logs()).length;
    await page.evaluate(p => { LowiDex.lookup = async () => p; const el = document.querySelector('.b3-shop'); LowiShopScan.found(p.barcode, el); }, known); await sleep(2500);
    const ssCard = await vis('.ss-card .ss-verdict');
    const ns1 = (await logs()).length;
    const gap1 = await page.evaluate(() => { try { return JSON.stringify(JSON.parse(localStorage.getItem('lowispike.v2')).fast || null); } catch (e) { return ''; } });
    console.log('shopcam', JSON.stringify({ shopOn, ssCard, ns0, ns1, gapSame: gap0 === gap1 }));
    await shot('shopcam-card');
    console.log('eat visible in', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[data-b3="eat"]')].filter(x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map(x => { const a = []; let e = x; while (e && a.length < 8) { a.push(e.tagName + '.' + String(e.className).slice(0, 40)); e = e.parentElement; } const c = x.closest('.r2-sheet, [role=dialog], .r2'); return a.join(' < ') + ' | ' + ((c || x.parentElement.parentElement).textContent || '').slice(0, 80); }))));
    console.log('before shopcam: eat visible =', 'see above');
    ok('shopping scan card has no I ate this', shopOn && ssCard && !(await vis('[data-b3="eat"]')) && ns1 === ns0 && gap0 === gap1);
    await closeAll(); await sleep(900);
    // 4 Gap I just ate -> shared logger
    await page.evaluate(() => LowiHomeBloomsV2.open('gap')); await sleep(1300);
    const gb = await page.$$('#hb2Bloom button'); const labels = await Promise.all(gb.map(b => b.textContent()));
    console.log('gap bloom', JSON.stringify(labels));
    const ate = await page.$('#hb2Bloom [data-id="ate"]'); if (ate) await ate.tap(); await sleep(2500);
    // fast reward sheet may come first
    for (let i = 0; i < 4 && !(await vis('.sp-gap-q')); i++) { const c = await page.$('.fst-sheet [data-fs="go"], .fst-go, [data-fst="next"]'); if (c) await c.tap().catch(() => {}); await sleep(1200); }
    ok('Gap I just ate opens the shared logger with the optional note', await vis('.sp-gap-q'));
    ok('no separate What did you eat sheet', !(await vis('.f2-sheet, [data-f2="photo"]')));
    await shot('gap-shared');
    if (await vis('[data-sp="gapskip"]')) { await page.tap('[data-sp="gapskip"]'); await sleep(900); }
    ok('Not now closes it', !(await vis('.sp-gap-q')));
    await sleep(3000); console.log('closing sheets left at end', await page.evaluate(() => document.querySelectorAll('.r2-ov.off').length));
    console.log('\nERRORS', JSON.stringify(errs.slice(0, 10)));
    console.log('RESULT', JSON.stringify(R));
    await browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(1); });
