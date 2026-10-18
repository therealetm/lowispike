'use strict';
/* Browser check for the lowiSPIKE principles audit of "What can I buy here?" (Oct 18, 2026). Not part of `npm test`.
   node tests/store-picks-principles-live.cjs           -> serves this worktree on a local port
   BASE=https://therealetm.github.io/lowispike/ node tests/store-picks-principles-live.cjs   -> the deployed files
   Chromium 390x844 and WebKit iPhone 13. Every *.supabase.co request is aborted: no account, no data written anywhere. */
const path = require('path');
const fs = require('fs');
const http = require('http');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const root = path.join(__dirname, '..');
const OUT = process.env.OUT || '/tmp/stp-principles';
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
    let supa = 0;
    await ctx.route(/supabase\.co/, r => { supa++; return r.abort(); });
    await ctx.addInitScript(() => {
        try { localStorage.setItem('lowi.storePicks.v1', JSON.stringify({ range: 'lidl' })); } catch (e) {}
        try { Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch (e) {}
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(base + (base.includes('?') ? '&' : '?') + 't=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LowiStorePicks && window.LowiStorePicksCore, null, { timeout: 60000 });
    await page.evaluate(() => {
        const strip = () => document.documentElement.classList.remove('gate-boot', 'gate-up');
        strip(); new MutationObserver(strip).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        const st = document.createElement('style'); st.textContent = '#r2gate,.r2-gate,.r2-start{display:none!important}'; document.head.appendChild(st);
        window.LowiStorePicks.open('test');
        const unlock = () => document.querySelectorAll('.stp-ov[inert]').forEach(n => { n.inert = false; n.removeAttribute('inert'); });
        unlock(); setInterval(unlock, 200);
    });
    await page.waitForSelector('.stp-ov button.stp-item', { timeout: 60000 });
    await page.waitForTimeout(800);
    const tap = async loc => { if (ctxOpts.hasTouch) await loc.tap(); else await loc.click(); };
    const search = async q => { await page.fill('.stp-q', q); await page.waitForTimeout(900); };
    const rowsFor = q => page.evaluate(q => [...document.querySelectorAll('.stp-ov button.stp-item')].filter(b => b.querySelector('b') && b.querySelector('b').textContent.trim() === q)
        .map(b => ({ fail: b.classList.contains('fail'), tag: (b.querySelector('.stp-tag') || {}).textContent || '' })), q);

    // turn on "Show left out" so a product that is left out can be seen as left out
    const tog = page.locator('input[data-stp="fails"]');
    if (!(await tog.isChecked())) { await tog.evaluate(n => n.click()); await page.waitForTimeout(800); }
    ok(await tog.isChecked(), 'Show left out is on');

    for (const q of ['Klassischer Kartoffelsalat', 'Backofen Super Feine Pommes', 'Chips Paprika', 'Zupfkuchen', 'Magnum Classic']) {
        await search(q);
        const rows = await rowsFor(q);
        ok(rows.length > 0 && rows.every(r => r.fail), q + ' is listed under Left out (' + rows.map(r => r.tag).join(', ') + ')');
    }
    await search('Klassischer Kartoffelsalat');
    await page.screenshot({ path: OUT + '/' + name + '-potato-salad-left-out.png' });

    for (const q of ['Prinzessbohnen', 'Bio Leinsamen', 'Kichererbsen']) {
        await search(q);
        const rows = await rowsFor(q);
        ok(rows.length > 0 && rows.some(r => !r.fail), q + ' still passes (' + rows.map(r => r.tag).join(', ') + ')');
    }

    await search('Coca Cola Zero');
    const cz = page.locator('.stp-ov button.stp-item', { has: page.locator('b', { hasText: /^Coca Cola Zero$/ }) }).first();
    ok(await cz.count(), 'Coca Cola Zero found');
    await cz.evaluate(n => n.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(500);
    const czTag = (await cz.locator('.stp-tag').innerText()).trim();
    ok(!/best|top/i.test(czTag), 'Coca Cola Zero tag is not Best: "' + czTag + '"');
    if (ctxOpts.hasTouch) await cz.tap({ force: true }); else await cz.click({ force: true });
    // headless WebKit sometimes drops a tap on a row that is still settling after the search repaint; press the button then
    if (!(await page.waitForSelector('.stp-qv.in [role="dialog"]', { timeout: 8000 }).catch(() => null))) { await page.screenshot({ path: OUT + '/' + name + '-after-tap.png' }); console.log('  (tap retried as a press)', JSON.stringify(await page.evaluate(() => ({ q: (document.querySelector('.stp-q') || {}).value, ov: !!document.querySelector('.stp-ov'), qv: (document.querySelector('.stp-qv') || {}).className, rows: document.querySelectorAll('.stp-ov button.stp-item').length })))); await cz.evaluate(n => n.click()); }
    await page.waitForSelector('.stp-qv.in [role="dialog"]', { timeout: 60000 });
    const txt = await page.locator('.stp-qv').innerText();
    ok(/Good, not Best/.test(txt) && /Water and plain tea are Best/.test(txt), 'quick view explains Good, not Best');
    ok(/not medical advice/.test(txt), 'quick view still says it is not medical advice');
    await page.screenshot({ path: OUT + '/' + name + '-cola-zero.png' });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await search('Saskia Mineralwasser Medium');
    const w = page.locator('.stp-ov button.stp-item', { has: page.locator('b', { hasText: /^Saskia Mineralwasser Medium$/ }) }).first();
    ok(await w.count(), 'water found');
    const wTag = (await w.locator('.stp-tag').innerText()).trim();
    ok(/best|top/i.test(wTag), 'water is still Best: "' + wTag + '"');

    const own = errors.filter(e => /store-picks|stp-/.test(e));
    ok(!own.length, 'no store-picks errors' + (errors.length ? ' (other page errors: ' + errors.length + ')' : ''));
    console.log('  supabase requests aborted: ' + supa);
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
