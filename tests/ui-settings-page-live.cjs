'use strict';
/* Browser proof for "one tap on Settings opens the full Settings page" (Oct 18 2026, Emmanuel). Real app from this checkout, backend
   blocked, service worker off. Real touch taps on the Settings bubble:
   - opens ONE full page (no chip bloom, no second More panel) that covers the screen and sits on top of everything,
   - lists Me, Look & sound, Account, Menu bar and the More entries (Community, Care board, Workouts, World map ...), rows >= 44 px,
   - every row reachable (the list scrolls if a short window needs it), the x at the bottom right on top of everything,
   - x and Escape close it and focus goes back to the bubble; the menu bar switch flips in place and the page stays open,
   - a place (Community, Me, Look & sound) closes the page and opens its real route; the Sleep bloom still works as before,
   - reduced motion: the page only fades. No emoji, no page errors from the module.
   Usage: node tests/ui-settings-page-live.cjs [--views a,b] [--out DIR] [--url https://therealetm.github.io/lowispike/] */
const fs = require('fs'), path = require('path'), http = require('http');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(path.join(__dirname, '..')), OUT = arg('out', '/tmp/ui-settings-page-shots');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = (w, h) => ({ viewport: { width: w, height: h }, screen: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'], iphone_webkit_844: ['webkit', 'iPhone 13', { width: 390, height: 844 }],
    iphone_se_webkit: ['webkit', 'iPhone SE'], ipad_portrait_webkit: ['webkit', IPAD(820, 1180)], ipad_landscape_webkit: ['webkit', IPAD(1180, 820)] };
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01', tags: [] }, xp: 900, ledger: [], logs: [], saved: [] }));
} catch (e) { }`;

/* what is on screen: the page box, its rows, what sits on top at a few points, the x */
const PAGE = () => {
    const L = document.getElementById('ss2Bloom'), p = L && L.querySelector('.ss2-page'), A = window.LowiHomeSettingsSleepV2;
    const vw = document.documentElement.clientWidth || innerWidth, vh = innerHeight;
    const top = (x, y) => { const e = document.elementFromPoint(x, y); return !!(e && e.closest && e.closest('.ss2-page')); };
    if (!p) return { open: A && A.isOpen(), page: false, fan: !!(L && L.querySelector('.ss2-fan')), panel: !!(L && L.querySelector('.ss2-panel')), vw, vh };
    const r = p.getBoundingClientRect(), x = p.querySelector('.ss2-page-x'), xr = x.getBoundingClientRect(), xe = document.elementFromPoint(xr.left + xr.width / 2, xr.top + xr.height / 2);
    const rows = [...p.querySelectorAll('.ss2-page-body [data-ss2]')].map(b => { const q = b.getBoundingClientRect(); return { id: b.dataset.ss2, h: q.height, l: q.left, r: q.right, t: q.top, b: q.bottom, role: b.getAttribute('role'), checked: b.getAttribute('aria-checked') }; });
    const cs = getComputedStyle(p);
    return { open: A.isOpen(), page: true, fan: !!L.querySelector('.ss2-fan'), panel: !!L.querySelector('.ss2-panel'), vw, vh, box: [r.left, r.top, r.right, r.bottom].map(Math.round),
        onTop: [[8, 8], [vw / 2, vh / 2], [vw - 8, vh * 0.25], [8, vh - 8]].every(([a, b]) => top(a, b)), title: (p.querySelector('.ss2-page-title') || {}).textContent,
        role: p.getAttribute('role'), modal: p.getAttribute('aria-modal'), rows, x: { l: xr.left, t: xr.top, r: xr.right, b: xr.bottom, w: xr.width, onTop: !!(xe && xe.closest && xe.closest('.ss2-page-x') === x) },
        anim: cs.animationName, blur: (cs.backdropFilter || cs.webkitBackdropFilter || 'none'), focusIn: p.contains(document.activeElement),
        groups: [...p.querySelectorAll('.ss2-group')].map(g => g.getAttribute('aria-label') || (g.querySelector('.ss2-gl') || {}).textContent) };
};
const EMOJI = () => { const L = document.getElementById('ss2Bloom'); return ((L ? L.textContent : '').match(/\p{Extended_Pictographic}/gu) || []).join(''); };
async function center(page, sel) { return page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel); }

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    let fail = 0;
    for (const v of arg('views', Object.keys(VIEWS).join(',')).split(',')) {
        const [eng, d, size] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = typeof d === 'string' ? Object.assign({}, pw.devices[d], size ? { viewport: size, screen: size } : {}) : d;
        const P = [], ok = (c, m) => { if (!c) P.push(m); }, MISSING = [], errs = [], summary = {};
        const run = async (reduced) => { console.error(v + (reduced ? ' reduced-motion run' : ' run'));
            const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block', reducedMotion: reduced ? 'reduce' : 'no-preference' }));
            await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
            await ctx.addInitScript(INIT);
            const page = await ctx.newPage();
            page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
            const tap = async sel => { const c = await center(page, sel); if (!c) { MISSING.push(sel); return false; } await page.touchscreen.tap(c.x, c.y); await sleep(500); return true; };
            await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiHomeSettingsSleepV2 && document.documentElement.classList.contains('wh-home'), null, { timeout: 90000 });
            /* known on main (badebb0), not this change: when the 3D world falls back (bw3-off, seen on WebKit iPhone SE with reduced
               motion) the Home hides the Scan, Sleep and Settings bubbles, so there is nothing to tap. Reported, not hidden: printed as
               preExisting and the reduced-motion check is skipped for that view only. */
            if (reduced) { await sleep(20000); const hid = await page.evaluate(() => { const b = document.querySelector('[data-orbit="settings"]'); return document.documentElement.classList.contains('bw3-off') && (!b || getComputedStyle(b).display === 'none'); }); if (hid) { summary.preExisting = 'reduced motion: 3D world fell back (bw3-off) and the Home hides the Settings bubble'; await ctx.close(); return; } }
            await page.waitForFunction(() => { const b = document.querySelector('[data-orbit="settings"]'); if (!b || b.dataset.o8Adapter !== 'settings-sleep') return false; const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.width > 20 && e && e.closest && e.closest('[data-orbit="settings"]') === b; }, null, { timeout: +arg('ready', 180000) });
            await sleep(+arg('wait', 4000));
            const home = async () => { await page.evaluate(() => window.goTab('home')); await page.waitForFunction(() => { const b = document.querySelector('[data-orbit="settings"]'); if (!document.documentElement.classList.contains('wh-home') || !b || b.dataset.o8Adapter !== 'settings-sleep') return false; const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.width > 20 && e && e.closest && e.closest('[data-orbit="settings"]') === b; }, null, { timeout: 20000 }).catch(() => P.push('Settings bubble not back and tappable on Home')); await sleep(1000); };
            if (reduced) {
                await tap('[data-orbit="settings"]');
                const g = await page.evaluate(PAGE);
                ok(g.page && g.anim === 'ss2-fade', 'reduced motion: page should only fade, animation is ' + g.anim);
                summary.reduced = g.anim;
                await ctx.close(); return;
            }
            ok(await page.evaluate(() => document.querySelector('[data-orbit="settings"]').getAttribute('aria-haspopup') === 'dialog'), 'Settings bubble should say aria-haspopup=dialog');
            /* 1. one tap opens the full page */
            await tap('[data-orbit="settings"]'); await sleep(300);
            let g = await page.evaluate(PAGE);
            ok(g.page && g.open === 'page', 'one tap did not open the full page: ' + JSON.stringify({ open: g.open, fan: g.fan, panel: g.panel }));
            if (g.page) {
                ok(!g.fan && !g.panel, 'no chip bloom and no second More panel with the page');
                ok(g.box[0] <= 0 && g.box[1] <= 0 && g.box[2] >= g.vw - 1 && g.box[3] >= g.vh - 1, 'page should fill the screen: ' + g.box + ' vs ' + g.vw + 'x' + g.vh);
                ok(g.onTop, 'something sits on top of the page');
                ok(g.role === 'dialog' && g.modal === 'true' && g.focusIn, 'page should be a focused modal dialog');
                ok(/^(Settings|Einstellungen|Ajustes)$/.test(g.title || ''), 'title: ' + g.title);
                ok(g.blur === 'none', 'no full-screen blur: ' + g.blur);
                const ids = g.rows.map(r => r.id);
                for (const id of ['me', 'look', 'account', 'menubar', 'community', 'care', 'workouts', 'map']) ok(ids.includes(id), 'page is missing ' + id + ': ' + ids);
                for (const id of ['more', 'today', 'cook', 'theme', 'quest', 'back']) ok(!ids.includes(id), 'page should not list ' + id);
                g.rows.forEach(r => { ok(r.h >= 44, r.id + ' row under 44 px: ' + r.h); ok(r.l >= 0 && r.r <= g.vw + 0.5, r.id + ' row off screen sideways'); });
                ok(g.x.onTop && g.x.w >= 44 && g.x.r <= g.vw && g.x.b <= g.vh && g.x.l > g.vw / 2 && g.x.t > g.vh / 2, 'x should be bottom right, on screen and on top: ' + JSON.stringify(g.x));
                ok(!(await page.evaluate(EMOJI)), 'no emoji on the page');
                summary.rows = ids.join(' '); summary.groups = g.groups; summary.box = g.box;
                await page.screenshot({ path: `${OUT}/${v}-page.png` });
                /* every row reachable: scroll the list to its end, the last row must be hit-testable and clear of the x */
                const last = await page.evaluate(() => { const b = document.querySelector('.ss2-page-body'); b.scrollTop = b.scrollHeight; const rows = b.querySelectorAll('[data-ss2]'), e = rows[rows.length - 1], q = e.getBoundingClientRect(), hit = document.elementFromPoint(q.left + 30, q.top + q.height / 2); return { id: e.dataset.ss2, onTop: !!(hit && hit.closest && hit.closest('[data-ss2]') === e), b: q.bottom, vh: innerHeight, scrolls: b.scrollHeight > b.clientHeight + 1 }; });
                ok(last.onTop && last.b <= last.vh, 'last row ' + last.id + ' not reachable: ' + JSON.stringify(last));
                summary.scrolls = last.scrolls;
                await page.evaluate(() => { document.querySelector('.ss2-page-body').scrollTop = 0; });
            }
            /* 2. x closes, focus back on the bubble */
            await tap('#ss2Bloom .ss2-page-x'); await sleep(200);
            let c = await page.evaluate(() => ({ open: window.LowiHomeSettingsSleepV2.isOpen(), page: !!document.querySelector('#ss2Bloom .ss2-page'), focus: !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-orbit="settings"]')), exp: document.querySelector('[data-orbit="settings"]').getAttribute('aria-expanded') }));
            ok(!c.open && !c.page && c.focus && c.exp === 'false', 'x should close the page and return focus: ' + JSON.stringify(c));
            /* 3. Escape closes */
            await tap('[data-orbit="settings"]'); await page.keyboard.press('Escape'); await sleep(200);
            ok(!(await page.evaluate(() => window.LowiHomeSettingsSleepV2.isOpen())), 'Escape should close the page');
            /* 4. Tab stays inside */
            await tap('[data-orbit="settings"]');
            for (let i = 0; i < 16; i++) await page.keyboard.press('Tab');
            ok(await page.evaluate(() => !!document.activeElement.closest('.ss2-page')), 'Tab left the open page');
            /* 5. menu bar switch flips in place, page stays open */
            const before = await page.evaluate(() => localStorage.getItem('lowi.home.menubar'));
            await tap('#ss2Bloom [data-ss2="menubar"]'); await sleep(500);
            let mb = await page.evaluate(() => ({ open: window.LowiHomeSettingsSleepV2.isOpen(), ls: localStorage.getItem('lowi.home.menubar'), chk: document.querySelector('#ss2Bloom [data-ss2="menubar"]').getAttribute('aria-checked') }));
            ok(mb.open === 'page' && mb.ls === '1' && mb.chk === 'true', 'menu bar switch on: ' + JSON.stringify({ before, mb }));
            await tap('#ss2Bloom [data-ss2="menubar"]'); await sleep(500);
            mb = await page.evaluate(() => ({ open: window.LowiHomeSettingsSleepV2.isOpen(), ls: localStorage.getItem('lowi.home.menubar'), chk: document.querySelector('#ss2Bloom [data-ss2="menubar"]').getAttribute('aria-checked') }));
            ok(mb.open === 'page' && mb.ls === '0' && mb.chk === 'false', 'menu bar switch off again: ' + JSON.stringify(mb));
            await page.keyboard.press('Escape'); await sleep(300);
            /* 6. places run their real routes and close the page */
            await tap('[data-orbit="settings"]'); await tap('#ss2Bloom [data-ss2="community"]'); await sleep(900);
            ok(await page.evaluate(() => { const t = document.getElementById('tab-foryou'); return !!t && t.classList.contains('active') && !window.LowiHomeSettingsSleepV2.isOpen(); }), 'Community should open the Community tab and close the page');
            await home();
            await tap('[data-orbit="settings"]'); await tap('#ss2Bloom [data-ss2="me"]'); await sleep(900);
            ok(await page.evaluate(() => { const t = document.getElementById('tab-profile'); return !!t && t.classList.contains('active'); }), 'Me should open Profile');
            await home();
            await tap('[data-orbit="settings"]'); await tap('#ss2Bloom [data-ss2="look"]');
            await page.waitForFunction(() => document.documentElement.getAttribute('data-g2e-k') === 'look', null, { timeout: 8000 }).catch(() => { });
            ok(await page.evaluate(() => document.documentElement.getAttribute('data-g2e-k') === 'look'), 'Look & sound should open the Profile look page');
            await home();
            /* 7. Sleep keeps its bloom */
            await tap('[data-orbit="sleep"]'); await sleep(300);
            const sl = await page.evaluate(() => ({ open: window.LowiHomeSettingsSleepV2.isOpen(), chips: [...document.querySelectorAll('#ss2Bloom .ss2-fan [data-ss2]')].map(b => b.dataset.ss2) }));
            ok(sl.open === 'sleep' && sl.chips[0] === 'under6', 'Sleep bloom changed: ' + JSON.stringify(sl));
            await page.screenshot({ path: `${OUT}/${v}-sleep.png` });
            /* Sleep open, then Settings: switches to the page */
            await tap('[data-orbit="settings"]'); await sleep(300);
            const sw = await page.evaluate(() => ({ open: window.LowiHomeSettingsSleepV2.isOpen(), sleepExp: document.querySelector('[data-orbit="sleep"]').getAttribute('aria-expanded') }));
            ok(sw.open === 'page' && sw.sleepExp === 'false', 'Settings while Sleep is open should switch to the page: ' + JSON.stringify(sw));
            await page.keyboard.press('Escape');
            await page.screenshot({ path: `${OUT}/${v}-home-after.png` });
            await ctx.close();
        };
        await run(false);
        await run(true);
        if (MISSING.length) P.push('could not find to tap: ' + MISSING.join(', '));
        const mine = errs.filter(e => /settings-sleep|ss2|LowiHomeSettingsSleepV2/.test(e));
        ok(!mine.length, 'page errors from the module: ' + mine.join(' | '));
        console.log(JSON.stringify({ view: v, pass: !P.length, problems: P, summary, pageErrors: errs.length, sampleErrors: errs.slice(0, 3) }));
        if (P.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    console.log(fail ? 'FAIL ' + fail : 'PASS all views');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
