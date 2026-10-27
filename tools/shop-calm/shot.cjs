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
function ok(c, m) { if (!c) { fails++; console.log('  FAIL ' + m); } else console.log('  ok  ' + m); }

async function one(browser, base, size, lang) {
    const ctx = await browser.newContext({ viewport: DIM[size], deviceScaleFactor: 2, hasTouch: true, isMobile: process.env.ENGINE !== 'webkit' ? size !== 'ipad' : false });
    await ctx.route(/supabase\.co/, r => r.abort());
    await ctx.addInitScript(l => {
        try { localStorage.setItem('lowi.storePicks.v1', JSON.stringify({ range: 'lidl' })); localStorage.setItem('lowi.lang', l);
            localStorage.setItem('lowi.snackBuy.v1', JSON.stringify({ buy: [{ n: 'Speisequark mit Mandeln', t: Date.now() }], recent: [{ n: 'Speisequark mit Mandeln Nüsse Mix', t: Date.now() }] })); } catch (e) {}
        try { Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch (e) {}
    }, lang);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(base + (base.includes('?') ? '&' : '?') + 't=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LowiStorePicks && window.LowiStorePicksCore, null, { timeout: 90000 });
    await page.evaluate(l => {
        try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) {}
        const strip = () => document.documentElement.classList.remove('gate-boot', 'gate-up');
        strip(); new MutationObserver(strip).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        const st = document.createElement('style'); st.textContent = '#r2gate,.r2-gate,.r2-start{display:none!important}'; document.head.appendChild(st);
        if (window.LowiGiftBasket) window.LowiGiftBasket.serverReady = () => true; /* show the Give a hand tab like a signed-in phone */
        window.LowiStorePicks.open('test');
        const unlock = () => document.querySelectorAll('.stp-ov[inert]').forEach(n => { n.inert = false; n.removeAttribute('inert'); });
        unlock(); setInterval(unlock, 200);
    }, lang);
    await page.waitForSelector('.stp-ov button.stp-item', { timeout: 90000 });
    await page.waitForTimeout(900);
    const tag = size + '-' + lang;
    await page.screenshot({ path: OUT + '/' + tag + '-shop.png' });
    const audit = () => page.evaluate(() => {
        const card = document.querySelector('.stp-card'); const cr = card.getBoundingClientRect();
        const bad = [];
        card.querySelectorAll('button, a, input, summary, .stp-tab b, h3').forEach(n => {
            if (n.closest('.stp-scroll') || n.closest('.wb-scroll')) return; /* scroll content is checked by scrolling */
            const r = n.getBoundingClientRect(); if (!r.width || !r.height) return;
            const cs = getComputedStyle(n); if (cs.visibility === 'hidden') return;
            if (r.left < cr.left - 1 || r.right > cr.right + 1 || r.bottom > cr.bottom + 1 || r.top < cr.top - 1) bad.push('outside: ' + (n.className || n.tagName) + ' ' + (n.textContent || '').trim().slice(0, 30));
            if ((n.tagName === 'BUTTON' || n.tagName === 'SUMMARY') && !n.closest('.stp-jumps') && (r.height < 30 || r.width < 30)) bad.push('small: ' + (n.className || n.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
            if (n.scrollWidth > n.clientWidth + 2 && cs.overflow !== 'visible' && n.tagName !== 'INPUT' && !n.closest('.stp-store')) bad.push('clipped: ' + (n.className || n.tagName) + ' ' + (n.textContent || '').trim().slice(0, 30));
        });
        card.querySelectorAll('.stp-tab').forEach(t => { const b = t.querySelector('b'); if (!b) return; const rg = document.createRange(); rg.selectNodeContents(b); const w = rg.getBoundingClientRect().width, tw = t.getBoundingClientRect().width; if (w > tw - 2) bad.push('tab text wider than tab: ' + b.textContent + ' ' + Math.round(w) + '/' + Math.round(tw)); });
        card.querySelectorAll('.stp-tab b').forEach(b => { const lh = parseFloat(getComputedStyle(b).lineHeight) || 14; if (b.getBoundingClientRect().height > lh * 1.6) bad.push('tab wraps: ' + b.textContent); });
        const geo = ['.stp-tab', '.stp-titlerow h3', '.stp-cartbtn', '.stp-shop', '.stp-q', '.stp-snackbox', '.stp-jumps', '.stp-grp, .stp-group, .stp-h4', '.stp-foot .stp-scanshop', '.stp-foot .stp-orb', '.wb-head h3', '.wb-scroll'].map(q => { const n = card.querySelector(q); if (!n) return q + ':-'; const r = n.getBoundingClientRect(); return q.split(',')[0] + ':' + Math.round(r.left - cr.left) + ',' + Math.round(r.top - cr.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); });
        return { geo, bad, tabs: [...card.querySelectorAll('.stp-tab')].map(t => t.textContent.trim()), text: (card.querySelector('.stp-head') || card).innerText.slice(0, 300) };
    });
    const a = await audit();
    console.log(tag + ' tabs: ' + a.tabs.join(' | ') + '\n    ' + a.geo.join('\n    '));
    ok(!a.bad.length, tag + ' Supermarket head/foot fit' + (a.bad.length ? ': ' + a.bad.join('; ') : ''));
    const home = page.locator('.stp-card [data-stp-tab="home"]');
    if (await home.count()) {
        await home.tap(); await page.waitForTimeout(900);
        await page.screenshot({ path: OUT + '/' + tag + '-home.png' });
        const b = await audit();
        ok(!b.bad.length, tag + ' From home head/foot fit' + (b.bad.length ? ': ' + b.bad.join('; ') : ''));
        await page.evaluate(() => { const s = document.querySelector('.stp-card .wb-scroll, .stp-card .stp-scroll'); if (s) s.scrollTop = 99999; });
        await page.waitForTimeout(300);
        await page.screenshot({ path: OUT + '/' + tag + '-home-end.png' });
        await page.locator('.stp-card [data-stp-tab="shop"]').tap(); await page.waitForTimeout(700);
    }
    await page.evaluate(() => { const s = document.querySelector('.stp-card .stp-scroll'); if (s) s.scrollTop = 99999; });
    await page.waitForTimeout(400);
    await page.screenshot({ path: OUT + '/' + tag + '-shop-end.png' });
    const own = errors.filter(e => /store-picks|week-basket|stp-|wb-/.test(e));
    ok(!own.length, tag + ' no Shop errors ' + own.join(' | '));
    await ctx.close();
}

(async () => {
    let srv = null, base = process.env.BASE;
    if (!base) { srv = await serve(); base = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const browser = await pw[process.env.ENGINE || 'chromium'].launch();
    for (const size of SIZES) for (const lang of LANGS) {
        try { await one(browser, base, size, lang); } catch (e) { fails++; console.log('  FAIL ' + size + '-' + lang + ' ' + String(e).slice(0, 300)); }
    }
    await browser.close(); if (srv) srv.close();
    console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0);
})();
