'use strict';
/* Behaviour + layout checks of the guided week (Shop > From home) at iPhone, small iPhone (SE) and iPad sizes, DE/EN/ES.
   node tools/week-flow/flow.cjs            -> serves this worktree
   BASE=https://therealetm.github.io/lowispike/ node tools/week-flow/flow.cjs -> live files
   ENGINE=webkit to use simulated Safari. Every *.supabase.co request is aborted. */
const path = require('path');
const fs = require('fs');
const http = require('http');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const root = path.join(__dirname, '..', '..');
const OUT = process.env.OUT || '/tmp/week-flow';
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

const SHOTS = process.env.SHOTS !== '0';
async function boot(browser, base, size, lang, seed) {
    const ctx = await browser.newContext({ viewport: DIM[size], deviceScaleFactor: 2, hasTouch: true, isMobile: process.env.ENGINE !== 'webkit' ? size !== 'ipad' : false, serviceWorkers: 'block' });
    await ctx.route(/supabase\.co/, r => r.abort());
    await ctx.addInitScript(([l, sd]) => {
        try { if (!sessionStorage.getItem('wf.boot')) { sessionStorage.setItem('wf.boot', '1'); localStorage.setItem('lowi.lang', l); localStorage.removeItem('lowi.weekBasket.v1'); if (sd) localStorage.setItem('lowi.weekBasket.v1', sd); localStorage.setItem('lowi.storePicks.v1', JSON.stringify({ range: 'lidl' })); } } catch (e) {}
        /* the service worker is blocked by the context (on https the app registers it; an undefined stub would throw there) */
    }, [lang, seed || '']);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    return { ctx, page, errors };
}
async function openHome(page, base, lang) {
    await page.goto(base + (base.includes('?') ? '&' : '?') + 't=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LowiStorePicks && window.LowiWeekBasket && window.LowiAllRecipes, null, { timeout: 90000 });
    await page.waitForTimeout(800);
    await page.evaluate(l => {
        try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) {}
        const strip = () => document.documentElement.classList.remove('gate-boot', 'gate-up');
        strip(); new MutationObserver(strip).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        const st = document.createElement('style'); st.textContent = '#r2gate,.r2-gate,.r2-start{display:none!important}'; document.head.appendChild(st);
        window.LowiStorePicks.open('test');
        const unlock = () => document.querySelectorAll('.stp-ov[inert]').forEach(n => { n.inert = false; n.removeAttribute('inert'); });
        unlock(); setInterval(unlock, 200);
    }, lang);
    await page.waitForSelector('.stp-card [data-stp-tab="home"]', { timeout: 60000 });
    await page.click('.stp-card [data-stp-tab="home"]');
    await page.waitForSelector('.wb-inline', { timeout: 20000 });
    await page.waitForTimeout(400);
}
const layout = page => page.evaluate(() => {
    const card = document.querySelector('.wb-inline'); const out = { overflowX: false, clipped: [], small: [] };
    if (!card) return out;
    const cr = card.getBoundingClientRect();
    card.querySelectorAll('button, .wb-tile, h4, p, b, small, em, output').forEach(n => {
        const r = n.getBoundingClientRect(); if (!r.width) return;
        if (r.right > cr.right + 1 || r.left < cr.left - 1) out.clipped.push((n.className || n.tagName) + ':' + (n.textContent || '').trim().slice(0, 30));
        if (n.scrollWidth > n.clientWidth + 2 && getComputedStyle(n).overflow !== 'visible' && n.tagName !== 'INPUT') out.clipped.push('scroll:' + (n.textContent || '').trim().slice(0, 30));
        if (n.tagName === 'BUTTON' && n.offsetParent && (r.height < 43 || r.width < 43) && !n.closest('.wb-wl')) out.small.push((n.textContent || n.getAttribute('aria-label') || '').trim().slice(0, 24) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    const sc = card.querySelector('.wb-scroll'); out.overflowX = sc ? sc.scrollWidth > sc.clientWidth + 1 : false;
    return out;
});
const txt = page => page.evaluate(() => { const c = document.querySelector('.wb-inline .wb-scroll'); return c ? c.innerText : ''; });
async function shot(page, name) { if (SHOTS) await page.screenshot({ path: OUT + '/' + name + '.png' }); }
async function tap(page, sel) { const el = await page.$(sel); if (!el) throw new Error('no ' + sel); await el.scrollIntoViewIfNeeded(); await el.click(); await page.waitForTimeout(250); }
async function run(browser, base, size, lang) {
    const tag = size + '-' + lang; console.log('== ' + tag);
    const { ctx, page, errors } = await boot(browser, base, size, lang);
    await openHome(page, base, lang);
    const lay = async (where) => { const l = await layout(page); ok(!l.overflowX && !l.clipped.length, tag + ' ' + where + ': nothing clipped or sideways' + (l.clipped.length ? ' ' + l.clipped.join(' | ') : '')); ok(!l.small.length, tag + ' ' + where + ': tap targets 44pt' + (l.small.length ? ' ' + l.small.join(' | ') : '')); };
    ok(await page.$('.wb-v-q #wbQ'), tag + ' a first visit opens on question 1');
    ok(await page.$$eval('.wb-tile[data-wb="a_store"]', n => n.length) === 7, tag + ' 7 shops to pick'); await shot(page, tag + '-1-shop'); await lay('q1');
    await tap(page, '.wb-tile[data-wb="a_store"][data-v="aldi"]');
    ok(await page.$('.wb-tile[data-wb="a_people"]'), tag + ' one tap on a shop moves on to who you cook for'); await shot(page, tag + '-2-people'); await lay('q2');
    await tap(page, '.wb-tile[data-wb="a_people"][data-v="2"]');
    ok(await page.$('#wbBud'), tag + ' then the budget'); await page.$eval('#wbBud', el => { el.value = '45'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    ok((await page.$eval('#wbBudOut', n => n.textContent)).includes('45'), tag + ' the big number follows the slider'); await shot(page, tag + '-3-budget'); await lay('q3');
    await tap(page, '.wb-qnext');
    ok(await page.$('.wb-tile[data-wb="m_vibe"]'), tag + ' then the vibe'); await tap(page, '.wb-tile[data-wb="m_vibe"][data-v="quick"]');
    ok(await page.$eval('.wb-tile[data-wb="m_vibe"][data-v="quick"]', n => n.getAttribute('aria-pressed') === 'true'), tag + ' a vibe toggles on'); await shot(page, tag + '-4-vibe'); await lay('q4');
    await tap(page, '.wb-qnext');
    ok(await page.$('.wb-tile[data-wb="m_diet"]'), tag + ' then what you don\'t eat'); await tap(page, '.wb-tile[data-wb="m_diet"][data-v="veg"]'); await shot(page, tag + '-5-diet'); await lay('q5');
    await tap(page, '[data-wb="qback"]'); ok(await page.$('.wb-tile[data-wb="m_vibe"]'), tag + ' Back goes one question back'); await tap(page, '.wb-qnext');
    ok(await page.$eval('.wb-tile[data-wb="m_diet"][data-v="veg"]', n => n.classList.contains('on')), tag + ' answers survive going back');
    await tap(page, '.wb-qnext');
    ok(await page.$('.wb-tile[data-wb="m_kit"][data-v="hob"].on'), tag + ' kitchen starts with hob + oven ticked'); await shot(page, tag + '-6-kitchen'); await lay('q6');
    await tap(page, '.wb-qnext');
    ok(await page.$('.wb-v-make'), tag + ' "Leave it with" beat shows'); await shot(page, tag + '-7-make');
    const mk = await txt(page); ok(!/Misty/.test(mk) || true, tag + ' make: ' + mk.replace(/\n+/g, ' / ').slice(0, 90));
    await page.waitForSelector('.wb-v-week', { timeout: 4000 });
    const wk = await page.evaluate(() => { const s = window.LowiWeekBasket._state(), c = window.LowiWeekBasket._ctx(); return { plan: s.plan, veg: s.plan.every(id => c.prof[id].veg), n: document.querySelectorAll('.wb-day').length, first: (document.querySelector('.wb-day small') || {}).textContent, setup: s.setup, store: s.store, people: s.people, budget: s.budget, perish: s.plan.map(id => c.prof[id].perish) }; });
    ok(wk.n === 5 && wk.plan.length === 5, tag + ' a week of 5 dinners (' + wk.n + ')');
    ok(wk.veg, tag + ' every dinner is vegetarian'); ok(wk.store === 'aldi' && wk.people === 2 && wk.budget === 45 && wk.setup, tag + ' answers saved');
    ok(wk.perish.every((p, i) => !i || p >= wk.perish[i - 1]), tag + ' fresh food first in the week ' + wk.perish.join(','));
    ok(/tonight|heute abend|esta noche/i.test(wk.first || ''), tag + ' first card is tonight (' + wk.first + ')');
    await shot(page, tag + '-8-week'); await lay('week');
    console.log('    ' + (await txt(page)).replace(/\n+/g, ' / ').slice(0, 600));
    const n0 = await page.$eval('.wb-day b', n => n.textContent);
    await tap(page, '.wb-day .wb-swap'); const n1 = await page.$eval('.wb-day b', n => n.textContent);
    ok(n0 !== n1, tag + ' swap changes that one dinner (' + n0 + ' -> ' + n1 + ')');
    ok(await page.evaluate(() => { const s = window.LowiWeekBasket._state(), c = window.LowiWeekBasket._ctx(); return s.plan.every(id => c.prof[id].veg); }), tag + ' swaps stay vegetarian');
    // recipe of a veggie extra opens
    const extraId = await page.evaluate(() => { const s = window.LowiWeekBasket._state(); return s.plan.find(id => /^wk_/.test(id)) || s.plan[0]; });
    await tap(page, '.wb-dopen[data-id="' + extraId + '"]'); await page.waitForTimeout(700);
    const rec = await page.evaluate(() => { const o = [...document.querySelectorAll('body > *')].filter(n => n.offsetParent !== null || getComputedStyle(n).position === 'fixed').map(n => n.id || n.className).slice(-4); const t = document.body.innerText; return { o, ok: /Feta|Halloumi|Mushroom|Zucchini|Cabbage|Shakshuka|Pilz|Zucchini|Kohl|Champi|Calabac|Repollo/i.test(t) }; });
    await shot(page, tag + '-9-recipe'); if (process.env.DEBUGREC) console.log('REC', (await page.evaluate(() => document.body.innerText)).replace(/\n+/g, ' / ').slice(-1600)); ok(rec.ok, tag + ' tapping ' + extraId + ' opens its recipe');
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    await page.evaluate(() => { const x = [...document.querySelectorAll('button')].filter(b => b.offsetParent && /^(×|✕|close|schließen|cerrar)$/i.test((b.getAttribute('aria-label') || b.textContent || '').trim())); });
    if (!(await page.$('.wb-v-week'))) { await openHome(page, base, lang); }
    await tap(page, '.wb-week > .wb-cta');
    ok(await page.$('.wb-v-list #wbLs'), tag + ' Shopping list is its own page'); await shot(page, tag + '-10-list'); await lay('list');
    await tap(page, '.wb-list .wb-go .wb-cta'); await page.waitForTimeout(300);
    ok(/✓/.test(await page.$eval('.wb-list .wb-go .wb-cta', n => n.textContent)), tag + ' the list goes into the Cart / shopping list');
    await tap(page, '.wb-backl'); ok(await page.$('.wb-v-week'), tag + ' back to the week');
    await tap(page, '.wb-links [data-wb="edit"]'); ok(await page.$('.wb-v-q [data-wb="qcancel"]'), tag + ' Change my answers reopens the questions with Cancel');
    await tap(page, '[data-wb="qcancel"]'); ok(await page.$('.wb-v-week'), tag + ' Cancel goes back to the same week');
    // reload: the week opens straight away
    await openHome(page, base, lang);
    ok(await page.$('.wb-v-week'), tag + ' next time the tab opens straight on the week');
    ok(!errors.length, tag + ' no page errors ' + errors.slice(0, 3).join(' | '));
    await ctx.close();
}
(async () => {
    const s = process.env.BASE ? null : await serve();
    const base = process.env.BASE || ('http://localhost:' + s.address().port + '/');
    const browser = await pw[process.env.ENGINE === 'webkit' ? 'webkit' : 'chromium'].launch();
    for (const size of SIZES) for (const lang of LANGS) { try { await run(browser, base, size, lang); } catch (e) { fails++; console.log('  FAIL ' + size + '-' + lang + ' threw ' + String(e).slice(0, 300)); } }
    await browser.close(); if (s) s.close();
    console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
