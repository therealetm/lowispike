'use strict';
/* One ultimate scanner (Oct 26 2026): every camera (Home Scan, Log meal Scan, Shop) shows the same compact card over the camera. ROOT=worktree or BASE=live url, DEV, LANG2. */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || '/home/sprite/wt-one-scanner', OUT = process.env.OUT || '/tmp/onescan-shots';
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
    const ctx = await browser.newContext(Object.assign({}, pw.devices[DEV], { serviceWorkers: 'block', reducedMotion: 'reduce' }));
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
    const FIX = { name: 'Fixture Mandeln natur', brand: 'Testmarke', barcode: '4000000000013', facts: { c: 5, s: 4, f: 50, p: 21, fib: 12 }, ingredients: 'almonds', source: 'off' };
    await page.evaluate(p => { window.__lk = 0; LowiDex.lookup = async () => { window.__lk++; return Object.assign({}, p); }; }, FIX);
    const typeCode = async () => { await page.waitForSelector('#b3Bc', { state: 'attached', timeout: 8000 }); await page.evaluate(c => { const i = document.querySelector('#b3Bc'); i.value = c; i.form.requestSubmit(); }, FIX.barcode); await sleep(2200); };
    const card = () => page.evaluate(() => { const c = document.querySelector('.ss-card .ss-sheet'); if (!c) return null; const r = c.getBoundingClientRect(), host = c.closest('.ss-card').parentElement;
        const btns = [...c.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0 && !b.closest('details:not([open]) .ss-body')).map(b => { const q = b.getBoundingClientRect(); return { ss: b.dataset.ss, cls: b.className, t: b.textContent.trim().slice(0, 24), h: Math.round(q.height), w: Math.round(q.width), l: Math.round(q.left), r: Math.round(q.right), b: Math.round(q.bottom) }; });
        return { ctx: c.dataset.ctx, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), vh: innerHeight, vw: innerWidth, hostOn: !!(host && host.isConnected), video: !!(host && host.querySelector('video')), btns, verdict: !!c.querySelector('.ss-verdict'), first: (btns.find(b => b.ss && b.ss !== 'next') || {}).ss }; });
    const fits = k => k && k.top >= 0 && k.bottom <= k.vh + 1 && k.left >= 0 && k.right <= k.vw + 1 && k.btns.every(b => b.h >= 44 || b.ss === 'next' && b.h >= 32);
    // A. Home Scan: the compact card, not the old full preview; the camera stays; Scan next scans again
    await page.evaluate(() => LowiDex.scan('type')); await sleep(1500); await typeCode();
    let k = await card(); console.log('home', JSON.stringify(k));
    ok('Home Scan shows the compact card (ctx scan)', !!k && k.verdict && k.ctx === 'scan');
    ok('Home Scan: no old preview sheet', !(await vis('[data-b3="eat"]')) && !(await vis('.r2-ov:not(.off) .b3-res, .r2-ov:not(.off) [data-b3="catch"]')));
    ok('Home Scan: camera layer stays open under the card', !!k && k.hostOn);
    ok('Home Scan: Add to cart is the first button', !!k && k.first === 'add');
    ok('Home Scan card fits the screen, buttons 44 px', fits(k));
    await shot('home-card');
    await page.tap('.ss-card [data-ss="next"]'); await sleep(900);
    ok('Scan next closes the card', !(await page.$('.ss-card .ss-sheet')));
    await sleep(4300); await typeCode(); ok('second scan shows the card again', !!(await card()));
    await closeAll(); await sleep(900);
    // B. Log meal's Scan: same card, I ate this first, logs one meal (double tap)
    const n0 = (await logs()).length;
    await page.evaluate(() => { window.LowiScanIntent = { meal: true, at: Date.now() }; LowiDex.scan('type'); }); await sleep(1500); await typeCode();
    k = await card(); console.log('meal', JSON.stringify(k));
    ok('Log meal Scan shows the same card (ctx meal), I ate this first', !!k && k.ctx === 'meal' && k.first === 'ate');
    ok('Log meal card fits the screen, buttons 44 px', fits(k));
    await shot('meal-card');
    const ateB = await page.$('.ss-card [data-ss="ate"]'); if (ateB) { await ateB.tap(); await ateB.tap().catch(() => {}); } await sleep(1800);
    const n1 = (await logs()).length; console.log('logs', n0, n1);
    ok('I ate this logs exactly one meal (double tap)', n1 === n0 + 1);
    await closeAll(); await sleep(900);
    // C. Shop camera: same card, Add to cart first, logs nothing
    await page.evaluate(() => LowiDex.scan('type')); await sleep(1200);
    const shopOk = await page.evaluate(() => { try { LowiDex.shopMode(true); return true; } catch (e) { return String(e); } }); await sleep(1500);
    if (shopOk === true && (await page.$('#b3Bc'))) { const s0 = (await logs()).length; await typeCode(); k = await card(); console.log('shop', JSON.stringify(k));
        ok('Shop camera shows the same card (ctx shop), Add to cart first', !!k && k.ctx === 'shop' && k.first === 'add');
        console.log('SHEET', JSON.stringify(await page.evaluate(() => { const c = document.querySelector('.ss-card .ss-sheet'); return { sh: c.scrollHeight, ch: c.clientHeight, dock: getComputedStyle(c.closest('.b3-cam')).getPropertyValue('--sg-dock'), kids: [...c.children].map(e => [e.className, Math.round(e.getBoundingClientRect().height), e.textContent.trim().slice(0, 40)]) }; })));
        { const v = await page.evaluate(() => { const c = document.querySelector('.ss-card .ss-sheet'), a = c.querySelector('.ss-add'); return a.getBoundingClientRect().bottom <= c.getBoundingClientRect().bottom + 1 && c.scrollTop === 0; }); ok('Shop: Add to cart is fully visible without scrolling the card', v); }
        ok('Shop scan logs no meal', (await logs()).length === s0); await shot('shop-card'); }
    else console.log('shop camera via shopMode not reachable here:', shopOk);
    await closeAll(); await sleep(800);
    console.log('\nERRORS', JSON.stringify(errs.slice(0, 10)));
    ok('no page errors', errs.length === 0);
    const bad = Object.keys(R).filter(x => !R[x]); console.log(bad.length ? 'FAIL ' + bad.join(' | ') : 'ALL PASS');
    await browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(1); });
