'use strict';
/* Browser check for the grocery quick view (Oct 18, 2026). Not part of `npm test`: it needs Playwright and the network
   (product photos load from images.openfoodfacts.org).
   node tests/store-picks-quickview-live.cjs                 -> serves this worktree on a local port
   BASE=https://therealetm.github.io/lowispike/ node tests/store-picks-quickview-live.cjs   -> the live site
   Runs Chromium at 390x844 and WebKit with the iPhone 13 profile. */
const path = require('path');
const fs = require('fs');
const http = require('http');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const root = path.join(__dirname, '..');
const OUT = process.env.OUT || '/tmp/stp-qv';
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

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

function ok(c, m) { if (!c) throw new Error(m); console.log('  ok  ' + m); }

async function run(name, launcher, ctxOpts, base) {
    console.log(name);
    const browser = await launcher.launch();
    const ctx = await browser.newContext(ctxOpts);
    await ctx.addInitScript(() => {
        try { localStorage.setItem('lowi.storePicks.v1', JSON.stringify({ range: 'lidl' })); } catch (e) {}
        // keep the service worker out of the way so the files under test are the ones served
        try { Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch (e) {}
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    const imgReq = [];
    page.on('request', r => { if (/images\.openfoodfacts\.org/.test(r.url())) imgReq.push(r.url()); });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LowiStorePicks && window.LowiStorePicksCore, null, { timeout: 30000 });
    // a fresh test browser is not signed in, so the sign-in gate hides the app (html.gate-boot); a signed-in phone has no gate
    await page.evaluate(() => {
        const strip = () => document.documentElement.classList.remove('gate-boot', 'gate-up');
        strip(); new MutationObserver(strip).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        const st = document.createElement('style'); st.textContent = '#r2gate,.r2-gate,.r2-start{display:none!important}'; document.head.appendChild(st);
        window.LowiStorePicks.open('test');
        // the gate's lockApp() also marks every body child inert; undo that for the panel only
        const unlock = () => document.querySelectorAll('.stp-ov[inert]').forEach(n => { n.inert = false; n.removeAttribute('inert'); });
        unlock(); new MutationObserver(unlock).observe(document.body, { attributes: true, subtree: false, childList: true, attributeFilter: ['inert'] });
        setInterval(unlock, 200);
    });
    await page.waitForSelector('.stp-ov button.stp-item', { timeout: 30000 });
    // headless WebKit on this VM paints the heavy 3D app slowly, so wait for the first thumbnails instead of a fixed time
    await page.waitForFunction(() => [...document.querySelectorAll('.stp-th img[src]')].some(i => i.complete && i.naturalWidth > 0), null, { timeout: 60000 });
    await page.waitForTimeout(800);
    const rows = await page.locator('.stp-ov button.stp-item').count();
    ok(rows > 100, rows + ' product rows are buttons');
    const pending = await page.locator('.stp-th img[data-src]').count();
    ok(imgReq.length < 60, 'only ' + imgReq.length + ' photos requested on open (' + pending + ' still waiting until scrolled near)');
    const thumbs = await page.evaluate(() => [...document.querySelectorAll('.stp-th img[src]')].filter(i => i.complete && i.naturalWidth > 0).length);
    ok(thumbs > 0, thumbs + ' thumbnails loaded in view');
    await page.screenshot({ path: OUT + '/' + name + '-list.png' });

    // scroll the list, open a product, come back: same scroll, same row focused
    await page.evaluate(() => { document.querySelector('.stp-scroll').scrollTop = 1400; });
    await page.waitForTimeout(600);
    const target = page.locator('.stp-ov button.stp-item').nth(25);
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => document.querySelector('.stp-scroll').scrollTop);
    ok(before > 500, 'list scrolled down to ' + before);
    const nameInRow = (await target.locator('b').innerText()).trim();
    if (ctxOpts.hasTouch) await target.tap(); else await target.click();
    await page.waitForSelector('.stp-qv.in [role="dialog"]', { timeout: 60000 });
    const h3 = (await page.locator('.stp-qv h3').innerText()).trim();
    ok(h3 === nameInRow, 'quick view shows the tapped product: ' + h3);
    await page.locator('[data-stp="qv-close"].stp-pill').click();
    await page.waitForTimeout(300);
    ok(!(await page.locator('.stp-qv').count()), 'Back to list closes the quick view');
    const after = await page.evaluate(() => document.querySelector('.stp-scroll').scrollTop);
    ok(Math.abs(after - before) < 2, 'list scroll kept (' + before + ' -> ' + after + ')');
    ok(await page.evaluate(() => document.activeElement && document.activeElement.matches('button.stp-item')), 'focus returns to the row');

    // search "Linsen", open Bio-Linsen rot: real photo, label, why, source link, honest limits
    await page.fill('.stp-q', 'Bio-Linsen rot');
    await page.waitForTimeout(700);
    const lent = page.locator('.stp-ov button.stp-item', { hasText: 'Bio-Linsen rot' }).first();
    ok(await lent.count(), 'Bio-Linsen rot found by search (left-out list included if needed)');
    if (ctxOpts.hasTouch) await lent.tap(); else await lent.click();
    await page.waitForSelector('.stp-qv.in .stp-qv-ph img', { timeout: 60000 });
    await page.waitForFunction(() => { const i = document.querySelector('.stp-qv-ph img'); return i && i.complete; }, null, { timeout: 20000 });
    const qi = await page.evaluate(() => { const i = document.querySelector('.stp-qv-ph img'); return { src: i.src, w: i.naturalWidth, alt: i.alt }; });
    ok(/^https:\/\/images\.openfoodfacts\.org\/images\/products\/.+\.400\.jpg$/.test(qi.src) && qi.w > 0, 'large photo loaded ' + qi.src + ' (' + qi.w + 'px)');
    ok(/Bio-Linsen rot/.test(qi.alt), 'photo has alt text');
    const href = await page.locator('.stp-qv-link').getAttribute('href');
    ok(/^https:\/\/world\.openfoodfacts\.org\/product\/[0-9]+$/.test(href), 'product page link ' + href);
    const txt = await page.locator('.stp-qv').innerText();
    ok(/glycemic load/.test(txt) && /× GI/.test(txt), 'why-rating text with the numbers');
    ok(/not checked against the shelf/.test(txt), 'says it is not checked against the shelf');
    ok(/not medical advice/.test(txt), 'says it is not medical advice');
    await page.waitForFunction(() => { const c = document.querySelector('.stp-qv-card'); return c && getComputedStyle(c).transform === 'none'; }, null, { timeout: 60000 }).catch(() => {});
    const fit = await page.evaluate(() => { const c = document.querySelector('.stp-qv-card').getBoundingClientRect(); const vw = document.documentElement.clientWidth, vh = innerHeight; return { ok: c.left >= 0 && c.right <= vw + 0.5 && c.top >= 0 && c.bottom <= vh + 0.5, r: [c.left, c.top, c.right, c.bottom].map(Math.round), vw, vh }; });
    ok(fit.ok, 'quick view fits the screen ' + JSON.stringify(fit));
    await page.screenshot({ path: OUT + '/' + name + '-quickview.png' });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    ok(!(await page.locator('.stp-qv').count()) && (await page.locator('.stp-ov .stp-card').count()), 'Escape closes only the quick view');
    ok((await page.inputValue('.stp-q')) === 'Bio-Linsen rot', 'search kept');

    // a product without a photo says so
    await page.fill('.stp-q', '');
    await page.waitForTimeout(700);
    const none = page.locator('.stp-ov button.stp-item:has(.stp-th.none)').first();
    if (await none.count()) {
        await none.scrollIntoViewIfNeeded();
        if (ctxOpts.hasTouch) await none.tap(); else await none.click();
        await page.waitForSelector('.stp-qv.in', { timeout: 60000 });
        ok(/No photo yet|didn’t load/.test(await page.locator('.stp-qv-ph').innerText()), 'missing photo is labelled');
        await page.screenshot({ path: OUT + '/' + name + '-nophoto.png' });
        await page.mouse.click(5, 5); // tap the dimmed area above the card
        await page.waitForTimeout(300);
        ok(!(await page.locator('.stp-qv').count()), 'tapping outside closes it');
    } else console.log('  (no photo-less row among the first rows)');
    const own = errors.filter(e => /store-picks|stp-/.test(e));
    ok(!own.length, 'no store-picks errors' + (errors.length ? ' (other page errors: ' + errors.length + ')' : ''));
    if (errors.length) console.log('  page errors:', errors.slice(0, 3));
    await browser.close();
}

(async () => {
    let srv = null, base = process.env.BASE;
    if (!base) { srv = await serve(); base = 'http://127.0.0.1:' + srv.address().port + '/'; }
    try {
        await run('chromium-390x844', pw.chromium, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, base);
        await run('webkit-iphone13', pw.webkit, pw.devices['iPhone 13'], base);
        console.log('PASS');
    } catch (e) { console.error('FAIL', e.message); process.exitCode = 1; } finally { if (srv) srv.close(); }
})();
