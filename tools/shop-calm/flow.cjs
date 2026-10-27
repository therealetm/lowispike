'use strict';
/* Taps through the calm Shop with simulated touch (CDP touch events, so real pointer events) at iPhone size:
   Supermarket (one primary, Cart in the corner, search, categories, Show left out chip, snack line, stepper),
   the From home tab (planner inside Shop, Put it in my Cart, Open my Cart), swipe-down on the top bar of both tabs,
   Scan in the shop, Seller Zone and Give a hand.
   node tools/shop-calm/flow.cjs  |  BASE=https://therealetm.github.io/lowispike/ node tools/shop-calm/flow.cjs  |  LANG_=en */
const path = require('path');
const fs = require('fs');
const http = require('http');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const root = path.join(__dirname, '..', '..');
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
let fails = 0;
function ok(c, m) { if (!c) { fails++; console.log('  FAIL ' + m); } else console.log('  ok  ' + m); }
const LANG = process.env.LANG_ || 'de';
const VP = process.env.VP === 'se' ? { width: 375, height: 667 } : { width: 390, height: 844 };

(async () => {
    let srv = null, base = process.env.BASE;
    if (!base) { srv = await serve(); base = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const browser = await pw.chromium.launch();
    const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    await ctx.route(/supabase\.co/, r => r.abort());
    await ctx.addInitScript(l => {
        try { localStorage.setItem('lowi.storePicks.v1', JSON.stringify({ range: 'lidl' })); localStorage.setItem('lowi.lang', l); localStorage.removeItem('lowi.storePicks.tab'); } catch (e) {}
        try { Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch (e) {}
    }, LANG);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    const cdp = await ctx.newCDPSession(page);
    const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    async function tapEl(sel) {
        const b = await page.locator(sel).first().boundingBox(); if (!b) throw new Error('no box ' + sel);
        const x = b.x + b.width / 2, y = b.y + b.height / 2;
        await touch('touchStart', x, y); await page.waitForTimeout(40); await touch('touchEnd', x, y); await page.waitForTimeout(450);
    }
    async function swipeDown(sel, dist) {
        const b = await page.locator(sel).first().boundingBox(); if (!b) throw new Error('no box ' + sel);
        const x = b.x + Math.min(40, b.width / 2), y = b.y + b.height / 2;
        await touch('touchStart', x, y);
        for (let i = 1; i <= 10; i++) { await touch('touchMove', x, y + dist * i / 10); await page.waitForTimeout(16); }
        await touch('touchEnd', x, y + dist); await page.waitForTimeout(700);
    }
    const open = () => page.evaluate(() => {
        window.LowiStorePicks.open('test');
        const unlock = () => document.querySelectorAll('.stp-ov[inert]').forEach(n => { n.inert = false; n.removeAttribute('inert'); });
        unlock(); clearInterval(window.__ul); window.__ul = setInterval(unlock, 200);
    });
    const isOpen = () => page.evaluate(() => !!document.querySelector('.stp-ov:not(.closing) .stp-card'));
    await page.goto(base + (base.includes('?') ? '&' : '?') + 't=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LowiStorePicks && window.LowiWeekBasket, null, { timeout: 90000 });
    await page.evaluate(l => {
        try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) {}
        const strip = () => document.documentElement.classList.remove('gate-boot', 'gate-up');
        strip(); new MutationObserver(strip).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        const st = document.createElement('style'); st.textContent = '#r2gate,.r2-gate,.r2-start{display:none!important}'; document.head.appendChild(st);
        if (window.LowiGiftBasket) { window.LowiGiftBasket.serverReady = () => true; window.__giftOpen = 0; const o = window.LowiGiftBasket.open; window.LowiGiftBasket.open = (...a) => { window.__giftOpen++; }; }
        window.__scan = 0; if (window.LowiShopScan) window.LowiShopScan.open = () => { window.__scan++; };
    }, LANG);
    await open();
    await page.waitForSelector('.stp-ov button.stp-item', { timeout: 90000 });
    await page.waitForTimeout(800);

    console.log('Supermarket (' + LANG + ', ' + VP.width + 'x' + VP.height + ')');
    const s1 = await page.evaluate(() => {
        const c = document.querySelector('.stp-card');
        const vis = n => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        return {
            primaries: [...c.querySelectorAll('.stp-go')].filter(vis).filter(n => !n.closest('.stp-scroll')).map(n => n.className),
            door: !!c.querySelector('.stp-wb'), checkbox: !!c.querySelector('input[type=checkbox]'),
            sumTop: !!c.querySelector('.stp-sum') && !c.querySelector('.stp-sum').closest('details'),
            cartInTitle: !!c.querySelector('.stp-titlerow .stp-cartbtn'), snackClosed: !!c.querySelector('details.stp-snackbox:not([open])'),
            title: (c.querySelector('.stp-titlerow h3') || {}).textContent, scanText: (c.querySelector('.stp-foot .stp-scanshop') || {}).textContent
        };
    });
    ok(s1.primaries.length === 1 && /stp-scanshop/.test(s1.primaries[0]), 'one primary button outside the list: Scan in the shop (' + s1.scanText + ')');
    ok(!s1.door && !s1.checkbox && !s1.sumTop, 'no Shop from home card, no checkbox, no count line at the top');
    ok(s1.cartInTitle, 'Cart is the round button in the title row (' + s1.title + ')');
    ok(s1.snackClosed, 'snack list is one closed line');

    await tapEl('.stp-snackbox > summary');
    ok(await page.evaluate(() => document.querySelector('.stp-snackbox').open && !!document.querySelector('.stp-snackbox .stp-snack-add input')), 'tap opens the snack list with its field');
    await page.fill('.stp-snackbox .stp-snack-add input', 'Walnüsse');
    await page.evaluate(() => { const f = document.querySelector('.stp-snackbox .stp-snack-add'); f.requestSubmit ? f.requestSubmit() : f.submit(); });
    await page.waitForTimeout(400);
    const sn = await page.evaluate(() => ({ open: document.querySelector('.stp-snackbox').open, n: document.querySelector('.stp-snackbox-n').textContent, hidden: document.querySelector('.stp-snackbox-n').hidden, has: /Walnüsse/.test(document.querySelector('.stp-snackbox').textContent) }));
    ok(sn.open && sn.has && sn.n === '1' && !sn.hidden, 'adding a snack keeps the line open and its count shows 1');

    await page.evaluate(() => document.querySelector('.stp-chip.stp-tog').scrollIntoView({ inline: 'end', block: 'nearest' })); await page.waitForTimeout(300);
    await tapEl('.stp-chip.stp-tog');
    ok(await page.evaluate(() => document.querySelector('.stp-chip.stp-tog').getAttribute('aria-pressed') === 'true' && /\u2713/.test(document.querySelector('.stp-chip.stp-tog').textContent)), 'Show left out chip (end of the category row) turns on');
    await page.evaluate(() => document.querySelector('.stp-chip.stp-tog').scrollIntoView({ inline: 'end', block: 'nearest' })); await page.waitForTimeout(300);
    await tapEl('.stp-chip.stp-tog');
    ok(await page.evaluate(() => document.querySelector('.stp-chip.stp-tog').getAttribute('aria-pressed') === 'false'), 'and off again');
    ok(await page.evaluate(() => !!document.querySelector('.stp-snackbox[open]')), 'the snack line stays open across a repaint');

    const before = await page.evaluate(() => document.querySelectorAll('.stp-card button.stp-item').length);
    await page.fill('.stp-q', 'quark'); await page.waitForTimeout(700);
    const after = await page.evaluate(() => document.querySelectorAll('.stp-card button.stp-item').length);
    ok(after > 0 && after < before, 'search narrows the list (' + before + ' -> ' + after + ')');
    await page.fill('.stp-q', ''); await page.waitForTimeout(600);

    const plus = page.locator('.stp-card [data-stp-cq], .stp-card .stp-step button, .stp-card [data-stp-add]').first();
    if (await plus.count()) {
        const n0 = await page.evaluate(() => (document.querySelector('.stp-cartbtn .stp-cart-n') || { textContent: '0' }).textContent);
        const sel = await page.evaluate(() => { const b = [...document.querySelectorAll('.stp-card .stp-scroll button')].find(x => /^\+$/.test(x.textContent.trim())); if (b) { b.setAttribute('data-flow-plus', '1'); return true; } return false; });
        if (sel) {
            await tapEl('[data-flow-plus]');
            const n1 = await page.evaluate(() => (document.querySelector('.stp-cartbtn .stp-cart-n') || { textContent: '0' }).textContent);
            ok(+n1 > +n0, 'the + stepper fills the Cart badge (' + n0 + ' -> ' + n1 + ')');
        }
    }
    await tapEl('.stp-titlerow .stp-cartbtn');
    ok(await page.evaluate(() => !!document.querySelector('.stp-qv') || /Warenkorb|Cart|Carrito/.test((document.querySelector('.stp-qv, .stp-cart') || {}).textContent || '')), 'Cart button opens the Cart');
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    if (!(await isOpen())) await open();
    await page.waitForTimeout(500);
    await page.evaluate(() => { window.__scan = 0; if (window.LowiShopScan) window.LowiShopScan.open = () => { window.__scan++; }; });
    await tapEl('.stp-foot .stp-scanshop'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => window.__scan > 0 || !!document.querySelector('.ss-ov, .shop-scan')), 'Scan in the shop opens the scanner');
    await page.waitForTimeout(400);
    if (!(await isOpen())) { await open(); await page.waitForTimeout(700); }

    console.log('From home tab');
    await tapEl('.stp-card [data-stp-tab="home"]');
    const h = await page.evaluate(() => ({ inl: !!document.querySelector('.stp-card .wb-inline'), x: !!document.querySelector('.stp-card .wb-x'), sheet: !!document.querySelector('.wb-ov'), sel: (document.querySelector('[data-stp-tab="home"]') || {}).getAttribute('aria-selected'), cart: !!document.querySelector('.wb-inline .wb-head .stp-cartbtn'), title: (document.querySelector('.wb-inline h3') || {}).textContent }));
    ok(h.inl && !h.x && !h.sheet && h.sel === 'true', 'the planner draws inside Shop as its own tab, no second sheet, no second X (' + h.title + ')');
    ok(h.cart, 'the Cart button sits in its title row too');
    const listBtn = page.locator('.wb-inline [data-wb="list"]');
    if (await listBtn.count()) {
        const n0 = await page.evaluate(() => (document.querySelector('.stp-cartbtn .stp-cart-n') || { textContent: '0' }).textContent);
        await listBtn.scrollIntoViewIfNeeded(); await tapEl('.wb-inline [data-wb="list"]');
        const n1 = await page.evaluate(() => (document.querySelector('.stp-cartbtn .stp-cart-n') || { textContent: '0' }).textContent);
        ok(+n1 > +n0, 'Put it in my Cart fills the Cart badge (' + n0 + ' -> ' + n1 + ')');
        const cartGo = page.locator('.wb-inline [data-wb="cart"]');
        if (await cartGo.count()) {
            await cartGo.scrollIntoViewIfNeeded(); await tapEl('.wb-inline [data-wb="cart"]');
            ok(await page.evaluate(() => !!document.querySelector('.stp-qv')), 'Open my Cart opens the Cart over the tab');
            await page.keyboard.press('Escape'); await page.waitForTimeout(500);
        }
    } else ok(false, 'Put it in my Cart button found');
    if (!(await isOpen())) { await open(); await page.waitForTimeout(700); }
    if (await page.locator('.stp-card .wb-inline').count()) {
        await swipeDown('.wb-inline > .wb-head h3', 260);
        ok(!(await isOpen()), 'swipe down on the From home title closes Shop');
    }
    await open(); await page.waitForTimeout(800);
    ok(await page.evaluate(() => window.LowiStorePicks.tab() === 'home'), 'Shop reopens on From home (remembered)');
    await swipeDown('.wb-inline > .wb-head h3', 260);
    ok(!(await isOpen()), 'fresh: swipe down on the From home title closes Shop');
    if (!(await isOpen())) { await open(); await page.waitForTimeout(800); }
    await tapEl('.stp-card [data-stp-tab="shop"]'); await page.waitForTimeout(500);
    ok(await page.evaluate(() => !document.querySelector('.wb-inline') && !!document.querySelector('.stp-titlerow') && !window.LowiWeekBasket.mounted()), 'back to Supermarket, the planner is unmounted');
    await swipeDown('.stp-card [data-stp-tab="shop"]', 260);
    ok(!(await isOpen()), 'swipe down on the tab bar closes Shop');
    await open(); await page.waitForTimeout(800);
    await swipeDown('.stp-titlerow h3', 40);
    ok(await isOpen(), 'a short drag springs back and leaves Shop open');
    await swipeDown('.stp-titlerow h3', 260);
    ok(!(await isOpen()), 'swipe down on the Supermarket title closes Shop');
    await open(); await page.waitForTimeout(800);

    console.log('Other tabs');
    await tapEl('.stp-card [data-stp-tab="sz"]'); await page.waitForTimeout(500);
    ok(await page.evaluate(() => window.LowiStorePicks.tab() === 'sz'), 'Seller Zone tab opens');
    if (await page.locator('.stp-card [data-stp-tab="gift"]').count()) {
        await tapEl('.stp-card [data-stp-tab="gift"]');
        ok(await page.evaluate(() => window.__giftOpen > 0 && window.LowiStorePicks.tab() === 'sz'), 'Give a hand opens its panel and is not saved as the tab');
    }
    await tapEl('.stp-card [data-stp-tab="shop"]');
    await tapEl('.stp-foot .stp-orb, .stp-foot [data-stp="close"]');
    ok(!(await isOpen()), 'X closes Shop');
    const own = errors.filter(e => /store-picks|week-basket|stp-|wb-/.test(e));
    ok(!own.length, 'no Shop errors ' + own.join(' | '));
    await browser.close(); if (srv) srv.close();
    console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('  FAIL ' + String(e).slice(0, 400)); process.exit(1); });
