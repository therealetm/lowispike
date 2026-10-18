#!/usr/bin/env node
/* Live repeat of the Oct 18 report: "I clicked on cook, and then what can I buy? And the app crashed and sent me back to
   the beginning." Taps Cook in the nav bar, taps "What can I buy here?" (Lidl, 5,542 products), checks the list, taps
   "Show more" once, scrolls, closes with the X, goes Home; repeated --laps times in Chromium and WebKit (iPhone 13), 390x844.

   ISOLATED: only GET requests to the app's own host pass. Every *.supabase.co request, every other host and every non-GET
   is aborted, service workers are blocked, and the signed-in session is a local fixture (no real account, nothing written).

   Fails on: a reload or navigation ("back to the beginning"), a page error or browser crash, the sign-in screen, the list not
   showing, more than 15 rows in any group on open, more than 40 rows added by one "Show more", the panel over its element
   budget, any WebGL draw while the panel covers the screen, html.stp-open left behind, or any request that got out.

   node tests/cook-store-crash-live.cjs [--url https://therealetm.github.io/lowispike/] [--engine chromium|webkit|both] [--laps 6]
   (needs Playwright: NODE_PATH or /tmp/pw/node_modules). */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), URL0 = arg('url', ''), LAPS = +arg('laps', 6);
const ENGINES = arg('engine', 'both') === 'both' ? ['chromium', 'webkit'] : [arg('engine')];
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BUDGET = { firstRowsPerGroup: 15, moreRows: 40, panelElements: 2600 };

function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }

async function run(engine, url) {
    const host = new URL(url).host, fails = [], notes = [], leaked = [], blocked = {};
    const browser = await pw[engine].launch(engine === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
    const dev = engine === 'webkit' ? Object.assign({}, pw.devices['iPhone 13']) : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true };
    const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block' }));
    await ctx.route('**/*', r => {
        const q = r.request(), u = new URL(q.url());
        if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue();
        const k = q.method() + ' ' + u.host; blocked[k] = (blocked[k] || 0) + 1; return r.abort();
    });
    ctx.on('requestfinished', q => { const u = new URL(q.url()); if (u.protocol.startsWith('http') && (u.host !== host || q.method() !== 'GET')) leaked.push(q.method() + ' ' + u.host); });
    await ctx.addInitScript(() => {
        try {
            const d = new Date(); localStorage.setItem('lowi.daily.seen', d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
            sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
            localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
            if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
            localStorage.setItem('lowi.storePicks.v1', JSON.stringify({ range: 'lidl' }));
            window.__loads = (+sessionStorage.getItem('__cscLoads') || 0) + 1; sessionStorage.setItem('__cscLoads', window.__loads);
            window.__draws = 0;
            for (const K of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) { if (!K) continue; for (const m of ['drawArrays', 'drawElements']) { const o = K.prototype[m]; K.prototype[m] = function () { window.__draws++; return o.apply(this, arguments); }; } }
        } catch (e) { }
    });
    const page = await ctx.newPage(), errs = [];
    let navs = 0;
    page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
    page.on('crash', () => errs.push('BROWSER PAGE CRASHED'));
    page.on('framenavigated', f => { if (f === page.mainFrame()) navs++; });
    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiStorePicks, null, { timeout: 90000 });
    await sleep(5000);
    const navs0 = navs, ev = (fn, a) => page.evaluate(fn, a);
    const tapPoint = async (sel, within) => ev(([sel, within]) => {
        const b = [...document.querySelectorAll(sel)].find(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight; });
        if (!b) return null; const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, e = document.elementFromPoint(x, y);
        return e && e.closest(within || sel) === b.closest(within || sel) ? { x, y } : { blocked: e ? String(e.id || e.className).slice(0, 60) : null };
    }, [sel, within]);
    for (let i = 1; i <= LAPS; i++) {
        const lap = engine + ' lap ' + i + ': ';
        let p = await tapPoint('[data-tab="shelf"]', '[data-tab]');
        if (!p || !p.x) { fails.push(lap + 'Cook in the nav bar not tappable ' + JSON.stringify(p)); break; }
        await page.mouse.click(p.x, p.y); await sleep(1800);
        /* the button sits in the Cook hub; scroll it into view like a thumb if needed */
        await ev(() => { const b = document.querySelector('#tab-shelf .stp-sos, .stp-sos[data-stp-from="cook"]'); if (b) b.scrollIntoView({ block: 'center', inline: 'center' }); }); await sleep(500);
        p = await tapPoint('.stp-sos[data-stp-from="cook"], #tab-shelf .stp-sos', '.stp-sos');
        if (!p || !p.x) { notes.push(lap + '"What can I buy here?" not tappable on Cook (' + JSON.stringify(p) + '), opened from Cook by script'); await ev(() => LowiStorePicks.open('cook')); }
        else await page.mouse.click(p.x, p.y);
        const t0 = Date.now();
        try { await page.waitForSelector('.stp-ov .stp-sum', { timeout: 30000 }); } catch (e) { fails.push(lap + 'the list never showed'); break; }
        await sleep(900);
        const m = await ev(() => {
            const ov = document.querySelector('.stp-ov');
            return { ms: 0, open: document.documentElement.classList.contains('stp-open'), elements: ov.getElementsByTagName('*').length, rows: ov.querySelectorAll('.stp-item').length,
                maxGroup: Math.max(0, ...[...ov.querySelectorAll('.stp-group')].map(g => g.querySelectorAll('.stp-item').length)), scrollH: (ov.querySelector('.stp-scroll') || {}).scrollHeight || 0 };
        });
        m.ms = Date.now() - t0;
        if (!m.open) fails.push(lap + 'html.stp-open not set while the panel is open');
        if (m.maxGroup > BUDGET.firstRowsPerGroup) fails.push(lap + 'a group opened with ' + m.maxGroup + ' rows (budget ' + BUDGET.firstRowsPerGroup + ')');
        if (m.elements > BUDGET.panelElements) fails.push(lap + 'panel has ' + m.elements + ' elements (budget ' + BUDGET.panelElements + ')');
        const d0 = await ev(() => window.__draws); await sleep(1500); const d1 = await ev(() => window.__draws);
        if (d1 - d0 > 0) fails.push(lap + (d1 - d0) + ' WebGL draws in 1.5 s while the panel covers the screen');
        /* one "Show more" in the first group that has one */
        const more = await ev(() => { const b = document.querySelector('.stp-ov .stp-more'); if (!b) return null; const g = b.closest('.stp-group'); const n0 = g.querySelectorAll('.stp-item').length; b.click(); const g2 = document.getElementById(g.id); return { label: b.textContent, added: g2.querySelectorAll('.stp-item').length - n0 }; });
        if (more && (more.added <= 0 || more.added > BUDGET.moreRows)) fails.push(lap + '"' + more.label + '" added ' + more.added + ' rows');
        await ev(() => { const s = document.querySelector('.stp-scroll'); if (s) s.scrollTop = s.scrollHeight; }); await sleep(400);
        await ev(() => { const s = document.querySelector('.stp-scroll'); if (s) s.scrollTop = 0; }); await sleep(300);
        p = await tapPoint('.stp-ov .stp-close');
        if (p && p.x) await page.mouse.click(p.x, p.y); else { notes.push(lap + 'X not tappable, closed by script'); await ev(() => LowiStorePicks.close()); }
        await sleep(700);
        const after = await ev(() => ({ open: document.documentElement.classList.contains('stp-open'), ov: !!document.querySelector('.stp-ov:not(.out)'), gate: !!document.getElementById('r2gate'), loads: window.__loads }));
        if (after.open || after.ov) fails.push(lap + 'panel or html.stp-open left behind after closing');
        if (after.gate) fails.push(lap + 'sign-in screen appeared');
        const d2 = await ev(() => window.__draws); await sleep(1200); const d3 = await ev(() => window.__draws);
        p = await tapPoint('[data-tab="home"]', '[data-tab]');
        if (p && p.x) await page.mouse.click(p.x, p.y); else await ev(() => goTab('home'));
        await sleep(1500);
        const home = await ev(() => ({ loads: window.__loads, nodes: document.getElementsByTagName('*').length }));
        if (home.loads !== 1 || navs !== navs0) fails.push(lap + 'the page reloaded or navigated (loads ' + home.loads + ', navigations ' + (navs - navs0) + ')');
        console.log(`${lap}list in ${m.ms} ms, ${m.rows} rows (max ${m.maxGroup}/group), ${m.elements} panel elements, list ${m.scrollH} px; GL draws while open ${d1 - d0}, on Cook after close ${d3 - d2}; more: ${more ? more.label + ' +' + more.added : 'none'}; home elements ${home.nodes}`);
        if (fails.length) break;
    }
    if (errs.length) fails.push(engine + ': page errors: ' + [...new Set(errs)].slice(0, 4).join(' | '));
    if (leaked.length) fails.push(engine + ': requests got out: ' + [...new Set(leaked)].join(', '));
    console.log(engine + ': blocked ' + JSON.stringify(blocked));
    notes.forEach(n => console.log('note: ' + n));
    await browser.close();
    return fails;
}

(async () => {
    let srv = null, url = URL0;
    if (!url) { srv = await serve(); url = `http://127.0.0.1:${srv.address().port}/index.html`; }
    console.log('Cook -> What can I buy here? x' + LAPS + ' on ' + url + ' (isolated: Supabase, other hosts and all non-GET aborted)');
    let fails = [];
    for (const e of ENGINES) fails = fails.concat(await run(e, url));
    if (srv) srv.close();
    if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
    console.log('PASS');
})().catch(e => { console.error('FAIL (harness)', e); process.exit(2); });
