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
const STEPS = (process.env.STEPS || 'scan,shop,gap,fuel,cook').split(',');
(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    let srv = null, url = process.env.BASE;
    if (!url) { srv = await serve(); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const host = new URL(url).host;
    const browser = await pw.webkit.launch();
    const ctx = await browser.newContext(Object.assign({}, pw.devices['iPhone 13'], { serviceWorkers: 'block' }));
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
    await ctx.addInitScript(INIT);
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e && e.message || e)));
    await page.goto(url + '?x=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => !!(window.LowiHomeBloomsV2 && window.LowiSpirit && document.querySelector('[data-orbit="fuel"]')), null, { timeout: 90000 });
    await sleep(3000);
    const dump = async (label) => {
        const t = await page.evaluate(() => {
            const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && r.bottom > 0 && r.top < innerHeight; };
            const btns = [...document.querySelectorAll('button, [role=button], a, input, label')].filter(vis).map(b => (b.getAttribute('data-ss') || b.getAttribute('data-sp') || b.getAttribute('data-b3') || b.getAttribute('data-gh') || b.getAttribute('data-id') || b.getAttribute('data-act') || '') + ':' + (b.textContent || b.value || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60));
            return { cls: document.documentElement.className.slice(0, 200), btns: btns.slice(-60) };
        });
        console.log('\n==== ' + label + '\n' + t.btns.join('\n'));
        await page.screenshot({ path: path.join(OUT, label + '.png') });
    };
    const closeAll = () => page.evaluate(() => { try { window.LowiR2 && LowiR2.closeAll && LowiR2.closeAll(); } catch (e) {} try { document.querySelectorAll('.stp-ov,.gh-ov').forEach(n => n.remove()); } catch (e) {} });
    if (STEPS.includes('scan')) {
        await page.evaluate(() => { if (window.LowiLiving && LowiLiving.scan) LowiLiving.scan('cam'); else LowiDex.scan('cam'); });
        await sleep(2500);
        await dump('scan-open');
    }
    if (STEPS.includes('shop')) {
        const p = await page.$('.ss-pill'); if (p) { await p.tap(); await sleep(1500); await dump('scan-shopping'); }
        else console.log('no ss-pill');
        for (const sel of ['[data-ss="search"]','[data-ss="cart"]','[data-ss="hunt"]']) { const h = await page.$(sel); if (h) { await h.tap().catch(()=>{}); await sleep(1500); await dump('shopchip-' + sel.replace(/\W/g,'')); await page.evaluate(() => { try { const o=[...document.querySelectorAll('.r2-ov,.gh-ov,.stp-ov')].pop(); if (o && window.R2) R2.close(o); } catch(e){} }); await sleep(600);} else console.log('nochip', sel); }
        const x = await page.$('[data-b3="camclose"]'); if (x) { await x.tap().catch(()=>{}); await sleep(1000); }
        await closeAll();
    }
    if (STEPS.includes('gap')) {
        await page.evaluate(() => { window.LowiHomeBloomsV2.mount(document); window.LowiHomeBloomsV2.open('gap'); }); await sleep(1400);
        await dump('gap-bloom');
        const j = await page.$('#hb2Bloom [data-id="ate"], #hb2Bloom [data-id="now"], #hb2Bloom button'); if (j) { await j.tap(); await sleep(1800); await dump('gap-justate'); }
        await closeAll(); await sleep(500);
        await page.evaluate(() => { window.LowiHomeBloomsV2.open('gap'); }); await sleep(1400);
        const bs = await page.$$('#hb2Bloom button'); if (bs[1]) { await bs[1].tap(); await sleep(1800); await dump('gap-earlier'); }
        await closeAll(); await sleep(500);
    }
    if (STEPS.includes('fuel')) {
        await page.evaluate(() => { window.LowiHomeBloomsV2.open('fuel'); }); await sleep(1400);
        await dump('fuel-bloom');
        const s = await page.$('#hb2Bloom [data-id="shop"]'); if (s) { await s.tap(); await sleep(1800); await dump('fuel-shop'); }
        await closeAll(); await sleep(500);
        await page.evaluate(() => { window.LowiHomeBloomsV2.open('fuel'); }); await sleep(1400);
        const l = await page.$('#hb2Bloom [data-id="log"]'); if (l) { await l.tap(); await sleep(1800); await dump('fuel-log'); }
        await closeAll(); await sleep(500);
    }
    if (STEPS.includes('cook')) {
        await page.evaluate(() => { window.LowiHomeBloomsV2.open('fuel'); }); await sleep(1400);
        const c = await page.$('#hb2Bloom [data-id="cook"]'); if (c) { await c.tap(); await sleep(2500); await dump('fuel-cook'); }
    }
    console.log('\nERRORS', JSON.stringify(errs.slice(0, 10)));
    await browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(1); });
