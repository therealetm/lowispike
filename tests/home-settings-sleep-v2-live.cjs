'use strict';
/* Browser check for home-settings-sleep-v2.js (Oct 18 2026): Sleep and Settings blooms on the one-page Home, in the real app.
   Real taps on the Sleep and Settings bubbles; chips must bloom outward, stay on screen and never cover Misty; Sleep logs, corrects
   and clears today's entry, survives a reload; Settings runs the real routes (Profile, Look & sound, Account, Community, Care board,
   Today) and the menu bar switch follows the shell contract (localStorage lowi.home.menubar + window lowi:home-menubar).
   Shell: index.html once integrated; else --shell DIR (the integrator's home-orbit-v2.js/css); else a tiny stand-in that only
   creates the two ring buttons the shell would create.
   Production Supabase and every non-GET request are blocked (counted, never sent); a local fixture session only, no account.
     node tests/home-settings-sleep-v2-live.cjs [--root DIR] [--shell DIR] [--views a,b] [--out DIR] [--url https://therealetm.github.io/lowispike/]
   With --url (or once index.html loads the module) the module must come from the page itself, never injected.
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/home-settings-sleep-v2-shots');
const SHELL = arg('shell', '') ? path.resolve(arg('shell', '')) : (fs.existsSync(path.join(ROOT, 'home-orbit-v2.js')) ? ROOT : '');
const MOD = path.join(__dirname, '..');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = (w, h) => ({ viewport: { width: w, height: h }, screen: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'],
    ipad_portrait_webkit: ['webkit', IPAD(820, 1180)], ipad_landscape_webkit: ['webkit', IPAD(1180, 820)], ipad_landscape_chromium: ['chromium', IPAD(1180, 820)] };
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01', tags: [] }, xp: 900, ledger: [], logs: [], saved: [] }));
} catch (e) { }`;

/* stand-in for the integrator's shell: only the two buttons it creates (same classes and data-orbit), on a ring around Misty */
const SHIM = () => {
    if (document.querySelector('[data-orbit="sleep"]')) return 'present';
    const m = document.getElementById('spBubble'); if (!m) return 'no misty';
    m.setAttribute('data-home-misty', '');
    const q = m.getBoundingClientRect(), cx = q.left + q.width / 2, cy = q.top + q.height / 2, d = Math.round(Math.min(112, Math.max(74, innerWidth * 0.2))), R = q.width / 2 + d / 2 + 14;
    [['sleep', 135], ['settings', 45]].forEach(([k, deg]) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'wh-cell o8-cell o8-' + k; b.dataset.orbit = k; b.dataset.hb = k; b.setAttribute('aria-label', k);
        b.innerHTML = (k === 'sleep' ? '<span class="wh-cell-fill" aria-hidden="true"></span>' : '') + '<span class="wh-cell-tx"><small>' + k + '</small>' + (k === 'sleep' ? '<b class="o8-val"></b>' : '') + '</span>';
        const a = deg * Math.PI / 180;
        b.style.cssText = 'position:fixed;left:' + (cx + R * Math.cos(a) - d / 2) + 'px;top:' + (cy + R * Math.sin(a) - d / 2) + 'px;width:' + d + 'px;height:' + d + 'px;border-radius:50%;z-index:50;overflow:hidden;color:#fff;background:rgba(255,255,255,.15);border:1px solid #fff';
        document.body.appendChild(b);
    });
    return 'shim';
};

/* geometry of the open bloom against Misty and the screen */
const GEO = async () => {
    await new Promise(r => setTimeout(r, 350));
    const L = document.getElementById('ss2Bloom'), m = document.querySelector('[data-home-misty]') || document.getElementById('spBubble');
    const mq = m.getBoundingClientRect(), mx = mq.left + mq.width / 2, my = mq.top + mq.height / 2, mr = Math.max(mq.width, mq.height) / 2;
    const kind = L && L.getAttribute('data-kind'), b = document.querySelector('[data-orbit="' + (kind === 'more' ? 'settings' : kind) + '"]');
    const bq = b && b.getBoundingClientRect(), bd = bq ? Math.hypot(bq.left + bq.width / 2 - mx, bq.top + bq.height / 2 - my) : 0;
    const chips = L ? [...L.querySelectorAll('.ss2-fan .ss2-chip')].map(c => { const x = parseFloat(c.style.left), y = parseFloat(c.style.top), w = c.offsetWidth, hit = document.elementFromPoint(x, y); return { id: c.dataset.ss2, x, y, w, onTop: !!(hit && hit.closest && hit.closest('[data-ss2]') === c), hit: hit ? hit.tagName + '#' + hit.id + '.' + String(hit.className && hit.className.baseVal != null ? hit.className.baseVal : hit.className).slice(0, 40) : 'none', role: c.getAttribute('role'), checked: c.getAttribute('aria-checked'), dm: Math.hypot(x - mx, y - my) }; }) : [];
    const p = L && L.querySelector('.ss2-panel'), pr = p && p.getBoundingClientRect();
    const nx = pr ? Math.max(pr.left, Math.min(mx, pr.right)) : 0, ny = pr ? Math.max(pr.top, Math.min(my, pr.bottom)) : 0;
    const top = document.elementFromPoint(mx, my);
    return { kind, open: document.documentElement.classList.contains('ss2-open'), vw: innerWidth, vh: innerHeight, mx, my, mr, bd, chips,
        panel: pr ? { top: pr.top, bottom: pr.bottom, left: pr.left, right: pr.right, gap: Math.hypot(nx - mx, ny - my), rows: [...p.querySelectorAll('.ss2-row')].map(r => r.dataset.ss2) } : null,
        mistyCovered: !!(top && top.closest && top.closest('#ss2Bloom')), expanded: b && b.getAttribute('aria-expanded') };
};
const FACE = () => { const b = document.querySelector('[data-orbit="sleep"]'); return b && { val: (b.querySelector('.o8-val') || {}).textContent, aria: b.getAttribute('aria-label'), fill: b.style.getPropertyValue('--wh-fill'), done: b.classList.contains('done'), adapter: b.dataset.o8Adapter }; };
const STORE = () => {
    const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const S = window.LowiVitalsBridge.state(), mem = S.health && S.health.sleepDays ? S.health.sleepDays : {};
    const keys = []; for (let i = 0; i < localStorage.length; i++) { const n = localStorage.key(i); if ((localStorage.getItem(n) || '').includes('"sleepDays"')) keys.push(n); }
    return { today: k, band: mem[k] ? mem[k].band : null, count: Object.keys(mem).length, keys };
};

async function center(page, sel) { return page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel); }
const MISSING = [], MOD_SRC = [];
const MUST_INDEX = !!arg('url', '') || /home-settings-sleep-v2\.js/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
const EMOJI = () => { const L = document.getElementById('ss2Bloom'); const txt = (L ? L.textContent : '') + [...document.querySelectorAll('[data-orbit="sleep"],[data-orbit="settings"]')].map(b => b.textContent).join(' '); return (txt.match(/\p{Extended_Pictographic}/gu) || []).join(''); };
async function tap(page, sel) { if (sel.startsWith('#ss2Bloom')) await sleep(250); const c = await center(page, sel); if (!c) { MISSING.push(sel); return false; } await page.touchscreen.tap(c.x, c.y); await sleep(450); return true; }

async function boot(page, url) {
    await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiVitalsBridge, null, { timeout: 90000 });
    await page.waitForFunction(() => document.documentElement.classList.contains('wh-home') && document.getElementById('spBubble'), null, { timeout: 90000 });
    await sleep(+arg('wait', 6000));
    let shell = 'index';
    if (!(await page.evaluate(() => !!window.LowiHomeOrbitV2))) {
        if (SHELL) { await page.addStyleTag({ path: path.join(SHELL, 'home-orbit-v2.css') }); await page.addScriptTag({ path: path.join(SHELL, 'home-orbit-v2.js') }); shell = 'shell:' + SHELL; await sleep(1500); }
    }
    const fromPage = await page.evaluate(() => !!window.LowiHomeSettingsSleepV2);
    if (MUST_INDEX && !fromPage) MOD_SRC.push('module was not loaded by the page');
    if (!fromPage) { await page.addStyleTag({ path: path.join(MOD, 'home-settings-sleep-v2.css') }); await page.addScriptTag({ path: path.join(MOD, 'home-settings-sleep-v2.js') }); }
    if (!SHELL && shell === 'index') shell = await page.evaluate(SHIM);
    /* idempotent: mounting twice must not double the tap handler (a doubled handler would open then close) */
    await page.evaluate(() => { window.LowiHomeSettingsSleepV2.mount(document); window.LowiHomeSettingsSleepV2.mount(document); });
    await sleep(2200);
    return shell;
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    let fail = 0;
    for (const v of arg('views', Object.keys(VIEWS).join(',')).split(',')) {
        const [eng, d] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = typeof d === 'string' ? Object.assign({}, pw.devices[d]) : d;
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        const blocked = { supabase: 0, writes: 0 };
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); if (/supabase\.co$/.test(u.hostname)) blocked.supabase++; if (q.method() !== 'GET') blocked.writes++; return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [], P = [];
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        if (process.env.SS2_DEBUG) page.on('console', m => { if (m.text().startsWith('[ss2dbg]')) console.log(m.text()); });
        const ok = (c, m) => { if (!c) P.push(m); };
        const shell = await boot(page, url);
        if (process.env.SS2_DEBUG) await page.evaluate(() => ['pointerdown', 'click', 'touchend'].forEach(n => document.addEventListener(n, e => { const t = e.target, c = t && t.closest && t.closest('[data-ss2],[data-orbit]'); console.log('[ss2dbg] ' + n + ' ' + (c ? (c.dataset.ss2 || 'orbit:' + c.dataset.orbit) : (t && (t.tagName + '#' + t.id + '.' + String(t.className).slice(0, 30)))) + ' open=' + window.LowiHomeSettingsSleepV2.isOpen() + ' prevented=' + e.defaultPrevented); }, true)));
        await page.evaluate(() => { window.__mb = []; window.addEventListener('lowi:home-menubar', e => window.__mb.push(e.detail && e.detail.on)); window.__bl = []; document.addEventListener('lowi:bloom-v2', e => window.__bl.push(e.detail)); });
        const geoOK = (g, label) => {
            ok(g.open && g.chips.length > 0, label + ': bloom did not open');
            ok(!g.mistyCovered, label + ': Misty centre covered');
            ok(g.expanded === 'true', label + ': bubble aria-expanded not true');
            g.chips.forEach(c => {
                ok(c.x - c.w / 2 >= 0 && c.x + c.w / 2 <= g.vw && c.y - c.w / 2 >= 0 && c.y + c.w / 2 <= g.vh, label + ': chip ' + c.id + ' off screen');
                ok(c.dm >= g.mr + c.w / 2, label + ': chip ' + c.id + ' overlaps Misty (' + c.dm.toFixed(0) + ' < ' + (g.mr + c.w / 2).toFixed(0) + ')');
                ok(c.dm >= g.bd - 1, label + ': chip ' + c.id + ' not outward');
                ok(c.w >= 44, label + ': chip ' + c.id + ' smaller than a 44 px touch target');
                ok(c.onTop, label + ': chip ' + c.id + ' is under ' + c.hit + ' at its centre');
            });
        };
        /* Sleep: empty face, open, log 6-7 h */
        let f = await page.evaluate(FACE);
        ok(f && f.adapter === 'settings-sleep', 'Sleep bubble not claimed (data-o8-adapter)');
        ok(f && f.val === 'Log' && !f.done && (f.fill === '0.000' || f.fill === ''), 'empty Sleep face should say Log, unfilled: ' + JSON.stringify(f));
        await tap(page, '[data-orbit="sleep"]');
        let g = await page.evaluate(GEO);
        geoOK(g, 'sleep');
        ok(g.chips.map(c => c.id).join() === 'under6,6to7,7plus' && g.chips.every(c => c.role === 'radio'), 'sleep chips: ' + g.chips.map(c => c.id));
        await page.screenshot({ path: `${OUT}/${v}-sleep.png` });
        await tap(page, '#ss2Bloom [data-ss2="6to7"]'); await sleep(300);
        let s = await page.evaluate(STORE); f = await page.evaluate(FACE); g = await page.evaluate(GEO);
        ok(s.band === '6to7' && s.count === 1, 'store after 6-7 h: ' + JSON.stringify(s));
        ok(s.keys.length > 0 && s.keys.every(k => k === 'lowispike.v2' || /^lowi\.health\./.test(k)), 'sleep should persist only in the app state / private health keys: ' + s.keys);
        ok(f.val === '6\u20137 h' && f.done && Math.abs(parseFloat(f.fill) - 0.667) < 0.01, 'face after 6-7 h: ' + JSON.stringify(f));
        ok(!g.open, 'bloom should close after a choice');
        /* reload: still there */
        await boot(page, url);
        f = await page.evaluate(FACE); s = await page.evaluate(STORE);
        ok(f.val === '6\u20137 h' && s.band === '6to7', 'after reload: ' + JSON.stringify({ f, s }));
        await page.evaluate(() => { window.__mb = []; window.addEventListener('lowi:home-menubar', e => window.__mb.push(e.detail && e.detail.on)); window.__bl = []; document.addEventListener('lowi:bloom-v2', e => window.__bl.push(e.detail)); });
        /* correct to 7 h or more, then clear */
        await tap(page, '[data-orbit="sleep"]');
        g = await page.evaluate(GEO);
        { const em = await page.evaluate(EMOJI); ok(!em, 'no emoji on Sleep/Settings or their blooms: ' + em); }
        ok(g.chips.map(c => c.id).join() === 'under6,6to7,7plus,clear', 'logged sleep bloom should offer Clear: ' + g.chips.map(c => c.id));
        ok((g.chips.find(c => c.id === '6to7') || {}).checked === 'true', 'today\'s choice should show as checked');
        geoOK(g, 'sleep logged');
        await tap(page, '#ss2Bloom [data-ss2="7plus"]'); await sleep(300);
        s = await page.evaluate(STORE); f = await page.evaluate(FACE);
        ok(s.band === '7plus' && s.count === 1 && f.val === '7 h+' && parseFloat(f.fill) === 1, 'correction: ' + JSON.stringify({ s, f }));
        await tap(page, '[data-orbit="sleep"]'); await tap(page, '#ss2Bloom [data-ss2="clear"]'); await sleep(300);
        s = await page.evaluate(STORE); f = await page.evaluate(FACE);
        ok(s.band === null && f.val === 'Log' && !f.done, 'clear: ' + JSON.stringify({ s, f }));
        const xp = await page.evaluate(() => window.LowiVitalsBridge.state().xp);
        ok(xp === 900, 'sleep must not change XP (got ' + xp + ')');
        /* Settings */
        await tap(page, '[data-orbit="settings"]');
        g = await page.evaluate(GEO);
        geoOK(g, 'settings');
        ok(g.chips.map(c => c.id).join() === 'me,look,account,menubar,more', 'settings chips: ' + g.chips.map(c => c.id));
        await page.screenshot({ path: `${OUT}/${v}-settings.png` });
        /* one bloom at a time: Sleep replaces Settings */
        await tap(page, '[data-orbit="sleep"]'); g = await page.evaluate(GEO);
        ok(g.kind === 'sleep' && g.chips[0] && g.chips[0].id === 'under6', 'tapping Sleep while Settings is open should switch blooms');
        await page.evaluate(() => document.dispatchEvent(new CustomEvent('lowi:bloom-v2', { detail: { kind: 'fuel', open: true, owner: 'blooms' } }))); await sleep(100);
        ok(!(await page.evaluate(GEO)).open, 'another module\'s bloom should close ours');
        await tap(page, '[data-orbit="settings"]'); await page.keyboard.press('Escape'); await sleep(150);
        ok(!(await page.evaluate(GEO)).open, 'Escape should close');
        /* menu bar switch */
        await tap(page, '[data-orbit="settings"]'); await tap(page, '#ss2Bloom [data-ss2="menubar"]'); await sleep(400);
        let mb = await page.evaluate(() => ({ ls: localStorage.getItem('lowi.home.menubar'), ev: window.__mb.slice(), chk: (document.querySelector('#ss2Bloom [data-ss2="menubar"]') || {}).getAttribute && document.querySelector('#ss2Bloom [data-ss2="menubar"]').getAttribute('aria-checked'), cls: document.documentElement.classList.contains('o8-menubar'), tb: (() => { const t = document.getElementById('tabbar'); return !!t && getComputedStyle(t).display !== 'none'; })() }));
        ok(mb.ls === '1' && mb.ev[mb.ev.length - 1] === true && mb.chk === 'true', 'menu bar on: ' + JSON.stringify(mb));
        if (shell.startsWith('shell') || shell === 'index') ok(mb.cls && mb.tb, 'shell should show the tab bar: ' + JSON.stringify(mb));
        await page.screenshot({ path: `${OUT}/${v}-menubar-on.png` });
        const t2 = await center(page, '#ss2Bloom [data-ss2="menubar"]'); if (t2) { await page.touchscreen.tap(t2.x, t2.y); await sleep(400); } else { await tap(page, '[data-orbit="settings"]'); await tap(page, '#ss2Bloom [data-ss2="menubar"]'); }
        mb = await page.evaluate(() => ({ ls: localStorage.getItem('lowi.home.menubar'), ev: window.__mb.slice() }));
        ok(mb.ls === '0' && mb.ev[mb.ev.length - 1] === false, 'menu bar off: ' + JSON.stringify(mb));
        await page.evaluate(() => window.LowiHomeSettingsSleepV2.close()); await sleep(1500);
        /* More: the hidden Home entry points, in a panel clear of Misty */
        await tap(page, '[data-orbit="settings"]'); await tap(page, '#ss2Bloom [data-ss2="more"]');
        { const em = await page.evaluate(EMOJI); ok(!em, 'no emoji in the More panel: ' + em); }
        g = await page.evaluate(GEO);
        ok(g.panel && g.panel.gap >= g.mr - 1, 'More panel overlaps Misty: ' + JSON.stringify(g.panel) + ' mr ' + g.mr);
        ok(g.panel && g.panel.top >= 0 && g.panel.bottom <= g.vh + 1, 'More panel off screen');
        for (const id of ['today', 'community', 'care', 'cook', 'workouts']) ok(g.panel && g.panel.rows.includes(id), 'More is missing ' + id + ': ' + (g.panel && g.panel.rows));
        ok(!g.mistyCovered, 'More: Misty centre covered');
        await page.screenshot({ path: `${OUT}/${v}-more.png` });
        await page.evaluate(() => { window.__care = 0; const R = window.LowiR3F, o = R.openBoardTab; R.openBoardTab = function () { window.__care++; return o.apply(this, arguments); }; window.__today = 0; document.querySelector('#whHud .wh-todaybtn').addEventListener('click', () => window.__today++); });
        await tap(page, '#ss2Bloom [data-ss2="community"]'); await sleep(900);
        const comm = await page.evaluate(() => { const t = document.getElementById('tab-foryou'); return !!t && t.classList.contains('active'); });
        ok(comm, 'Community route did not open the Community tab');
        ok(!(await page.evaluate(GEO)).open, 'bloom should close when a route runs');
        const home = async () => { await page.evaluate(() => window.goTab('home')); await page.waitForFunction(() => document.documentElement.classList.contains('wh-home') && (document.getElementById('tab-home') || {}).classList.contains('active') && !document.documentElement.classList.contains('wb-comm'), null, { timeout: 20000 }).catch(() => { }); await page.waitForFunction(() => { const b = document.querySelector('[data-orbit="settings"]'); if (!b || b.dataset.o8Adapter !== 'settings-sleep') return false; const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.width > 20 && e && e.closest && e.closest('[data-orbit="settings"]') === b; }, null, { timeout: 20000 }).catch(() => P.push('settings bubble not back and tappable on Home')); await sleep(1200); };
        await home();
        await tap(page, '[data-orbit="settings"]'); await tap(page, '#ss2Bloom [data-ss2="more"]'); await tap(page, '#ss2Bloom [data-ss2="care"]'); await sleep(900);
        ok(await page.evaluate(() => window.__care === 1), 'Care board route did not run LowiR3F.openBoardTab once');
        await home();
        await tap(page, '[data-orbit="settings"]'); await tap(page, '#ss2Bloom [data-ss2="more"]'); await tap(page, '#ss2Bloom [data-ss2="today"]'); await sleep(700);
        ok(await page.evaluate(() => window.__today === 1), 'Today & history route did not press the existing Today control');
        await page.keyboard.press('Escape'); await home();
        /* Profile tiles: Look & sound, Account, Me */
        for (const [id, k] of [['look', 'look'], ['account', 'acct']]) {
            await tap(page, '[data-orbit="settings"]'); await tap(page, '#ss2Bloom [data-ss2="' + id + '"]');
            await page.waitForFunction(k => document.documentElement.getAttribute('data-g2e-k') === k, k, { timeout: 8000 }).catch(() => { });
            const got = await page.evaluate(() => document.documentElement.getAttribute('data-g2e-k'));
            ok(got === k, id + ' should open the Profile ' + k + ' page, got ' + got);
            if (id === 'look') await page.screenshot({ path: `${OUT}/${v}-look.png` });
            await home();
        }
        await tap(page, '[data-orbit="settings"]'); await tap(page, '#ss2Bloom [data-ss2="me"]'); await sleep(900);
        ok(await page.evaluate(() => { const t = document.getElementById('tab-profile'); return !!t && t.classList.contains('active'); }), 'Me should open Profile');
        await home();
        if (MOD_SRC.length) P.push(MOD_SRC.splice(0)[0]);
        if (MISSING.length) P.push('could not find to tap: ' + MISSING.splice(0).join(', '));
        const mine = errs.filter(e => /settings-sleep|ss2|LowiHomeSettingsSleepV2/.test(e));
        ok(!mine.length, 'page errors from the module: ' + mine.join(' | '));
        console.log(JSON.stringify({ view: v, url: url.replace(/\?.*/, ''), shell, pass: !P.length, problems: P, blocked, pageErrors: errs.slice(0, 4) }));
        if (P.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    console.log(fail ? 'FAIL ' + fail : 'PASS all views');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
