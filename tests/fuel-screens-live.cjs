'use strict';
/* fuel-screens live check (Oct 18, 2026). Real app, every non-GET and every other host blocked (no production writes).
   Opens every Fuel screen the way a person does (tap Fuel, tap the bloom choice; hold-Fuel's meal log and the F2 "What did
   you eat?" flow through their own entry points) and checks, per view (iPhone 13 390x844 and iPad 820x1180 / 1180x820, in
   Chromium and WebKit):
   - the panel is in the shared style (.fs-panel, the Home glass, radius 26px, the same title size)
   - exactly one close control is visible and on top, in the panel's top-right corner; tapping it closes the panel
   - no empty space: the panel ends within 30px of its last line; it is fully on screen; nothing scrolls sideways
   - on iPad the panel does not cover Misty
   - no XP pill on every row, no mention of the removed Today screen, no research tag (JA), no emoji
   - Swap: step 1 "What are you craving?" shows every craving tile at once; a tile opens one card (Craving X -> Have instead Y)
     with I had it / Show another / the small log link; Show another changes the food; Back returns to step 1
   Usage: node tests/fuel-screens-live.cjs [--root DIR | --url https://therealetm.github.io/lowispike/] [--out DIR] [--view NAME]
          [--shoot-only] (before screenshots of an old build: no assertions). Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/fs-shots'), LIVE = arg('url', ''), ONLY = arg('view', ''), SHOOT = process.argv.includes('--shoot-only');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const IPAD_P = { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
const IPAD_L = { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
const VIEWS = {
    iphone13_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }],
    iphone13_webkit: ['webkit', 'iPhone 13'],
    ipad_portrait_chromium: ['chromium', IPAD_P], ipad_portrait_webkit: ['webkit', IPAD_P],
    ipad_landscape_chromium: ['chromium', IPAD_L], ipad_landscape_webkit: ['webkit', IPAD_L]
};
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
} catch (e) { }`;

function serve(root) {
    return new Promise(res => {
        const s = http.createServer((q, r) => {
            let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/' || u === '') u = '/index.html';
            const f = path.join(root, u); if (!f.startsWith(root)) { r.writeHead(403); r.end(); return; }
            fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(b); });
        });
        s.listen(0, '127.0.0.1', () => res(s));
    });
}

/* in-page probe of the open Fuel panel */
const PROBE = () => {
    const vis = e => { if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > .05 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
    const cands = [document.getElementById('sos'), document.getElementById('sheet'), ...document.querySelectorAll('.r2-ov:not(.off) .r2-sh, .stp-ov .stp-card')].filter(e => e && vis(e) && (e.id !== 'sos' || e.classList.contains('open')) && (e.id !== 'sheet' || (document.getElementById('sheetwrap') || {}).classList.contains('open')));
    const p = cands.find(e => e.classList.contains('fs-panel')) || cands[cands.length - 1];
    if (!p) return { none: true };
    const r = p.getBoundingClientRect(), cs = getComputedStyle(p);
    let maxB = r.top; p.querySelectorAll('*').forEach(c => { if (!vis(c) || c.closest('.pf-hd, .fs-xwrap')) return; const q = c.getBoundingClientRect(); if (q.height > 0) maxB = Math.max(maxB, q.bottom); });
    const CLOSE = 'button, [role=button]';
    const closers = [...document.querySelectorAll(CLOSE)].filter(b => {
        if (!vis(b)) return false;
        const lab = ((b.getAttribute('aria-label') || '') + ' ' + b.textContent).trim();
        if (!(/^(close|schließen|cerrar)$/i.test((b.getAttribute('aria-label') || '').trim()) || /^[×✕✖]$/.test(b.textContent.trim()) || b.id === 'whX' || b.classList.contains('stp-close') || b.matches('.pf-x, .fs-x, .r2-x, .f2-x'))) return false;
        const q = b.getBoundingClientRect(), t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
        return t && (b === t || b.contains(t));
    }).map(b => { const q = b.getBoundingClientRect(); return { cls: String(b.className).slice(0, 40), id: b.id, l: Math.round(q.left), t: Math.round(q.top), r: Math.round(q.right), inPanel: p.contains(b) }; });
    const sp = document.getElementById('spBubble'), m = sp && sp.getBoundingClientRect();
    const mistyHit = m && m.width > 2 ? Math.max(0, Math.min(r.right, m.right) - Math.max(r.left, m.left)) * Math.max(0, Math.min(r.bottom, m.bottom) - Math.max(r.top, m.top)) / (m.width * m.height) : 0;
    const ct = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 60));
    const h = p.querySelector('.fs-title, .f2-t, .sp-pick h2, .r2-shb > h2, .stp-title, h2');
    const text = p.innerText;
    const emoji = (text.match(/\p{Extended_Pictographic}/gu) || []).filter(c => !/[©®™↕↔›‹]/.test(c));
    return {
        id: p.id, cls: String(p.className).slice(0, 120), fs: p.classList.contains('fs-panel'), kind: p.dataset.fs || '', dock: p.classList.contains('fs-dock'),
        rect: [r.left, r.top, r.width, r.height].map(Math.round), vw: innerWidth, vh: innerHeight,
        radius: cs.borderTopLeftRadius, glass: /gradient/.test(cs.backgroundImage), titleSize: h ? getComputedStyle(h).fontSize : '', title: h ? h.textContent.trim().slice(0, 60) : '',
        empty: Math.round(r.bottom - maxB), scrolls: p.scrollHeight > p.clientHeight + 2, sideways: p.scrollWidth > p.clientWidth + 2,
        closers, mistyHit: +mistyHit.toFixed(3), onTop: !!(ct && p.contains(ct)),
        xpPills: [...p.querySelectorAll('.f2-xpp, .xp-pill')].filter(vis).length, xpLines: [...p.querySelectorAll('.fs-xp')].filter(vis).length,
        today: /back to Today|Back to Today/.test(text), ja: /(^|\s)JA(\s|$)/.test(text), emoji: emoji.join(''),
        tiles: [...p.querySelectorAll('.fs-tile')].map(t => { const q = t.getBoundingClientRect(); return vis(t) && q.left >= r.left - 1 && q.right <= r.right + 1 && q.top >= r.top - 1 && q.bottom <= r.bottom + 1; }),
        step: p.getAttribute('data-step') || '', card: (p.querySelector('.fs-card') || {}).innerText || '', text: text.replace(/\s+/g, ' ').slice(0, 260)
    };
};

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    let srv = null, url = LIVE, host = '';
    if (!LIVE) { srv = await serve(ROOT); host = '127.0.0.1:' + srv.address().port; url = 'http://' + host + '/'; }
    else host = new URL(LIVE).host;
    const fails = [], log = [];
    const ok = (c, m) => { if (SHOOT) return; if (c) log.push('  ok ' + m); else { fails.push(m); log.push('  FAIL ' + m); } };
    for (const name of Object.keys(VIEWS)) {
        if (ONLY && !name.includes(ONLY)) continue;
        const [eng, devName] = VIEWS[name], dev = typeof devName === 'string' ? pw.devices[devName] : devName;
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        let blocked = 0;
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); blocked++; return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage();
        const errs = []; page.on('pageerror', e => errs.push(String(e && e.message || e)));
        const P = name + ': ';
        const shot = async n => { await sleep(350); await page.screenshot({ path: path.join(OUT, name + '-' + n + '.png') }); };
        try {
            await page.goto(url + '?fs=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => window.LowiHomeBloomsV2 && document.querySelector('[data-orbit="fuel"]'), null, { timeout: 90000 });
            await sleep(16000); /* Misty settles, the ring takes its final size */
            const build = await page.evaluate(() => fetch('version.json?t=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => '?'));
            log.push(P + 'build ' + build);
            const closeAll = async () => {
                await page.evaluate(() => {
                    try { window.LowiHomeBloomsV2.close(); } catch (e) { }
                    document.querySelectorAll('.r3-ov,.r3m-ov,.stp-ov,.r2-ov,.bt-ov,#g1Tour,.ob-ov,.lw-ov').forEach(e => e.remove());
                    const s = document.getElementById('sos'); if (s) s.classList.remove('open');
                    const w = document.getElementById('sheetwrap'); if (w && w.classList.contains('open') && typeof closeSheet === 'function') closeSheet();
                    try { window.LowiFuelScreens && LowiFuelScreens.sync(); } catch (e) { }
                });
                await sleep(700);
            };
            const bloom = async id => {
                await closeAll();
                await page.locator('[data-orbit="fuel"]').first().click({ force: true });
                await sleep(900);
                const has = await page.evaluate(id => !!document.querySelector('#hb2Bloom [data-id="' + id + '"]'), id);
                if (!has) await page.evaluate(() => window.LowiHomeBloomsV2.open('fuel'));
                await sleep(500);
                await page.locator('#hb2Bloom [data-id="' + id + '"]').click({ force: true, timeout: 8000 });
                await sleep(1300);
            };
            const probe = () => page.evaluate(PROBE);
            const titleSizes = [];
            const check = (k, s) => {
                const pre = P + k + ': ';
                log.push('     ' + pre + JSON.stringify({ rect: s.rect, dock: s.dock, empty: s.empty, closers: s.closers, mistyHit: s.mistyHit, title: s.title }));
                ok(!s.none, pre + 'a panel is open');
                if (s.none) return;
                ok(s.fs && s.glass && s.radius === '26px', pre + 'shared Fuel style (fs-panel, Home glass, 26px) ' + JSON.stringify({ fs: s.fs, glass: s.glass, radius: s.radius, cls: s.cls }));
                titleSizes.push(s.titleSize);
                ok(s.closers.length === 1 && s.closers[0].inPanel, pre + 'exactly one close control, inside the panel ' + JSON.stringify(s.closers));
                if (s.closers.length === 1) { const c = s.closers[0]; ok(c.t - s.rect[1] <= 24 && (s.rect[0] + s.rect[2]) - c.r <= 24 && c.t >= s.rect[1], pre + 'close sits top right ' + JSON.stringify(c)); }
                ok(s.scrolls || s.empty <= 30, pre + 'no empty space under the content (' + s.empty + 'px)');
                ok(!s.sideways, pre + 'nothing scrolls sideways');
                ok(s.rect[0] >= -1 && s.rect[1] >= -1 && s.rect[0] + s.rect[2] <= s.vw + 1 && s.rect[1] + s.rect[3] <= s.vh + 1, pre + 'fully on screen ' + JSON.stringify(s.rect));
                ok(s.onTop, pre + 'the panel is on top (not under the Home layers)');
                if (s.vw >= 700) ok(s.dock && s.mistyHit <= 0.02, pre + 'docked beside Misty, not covering her (' + s.mistyHit + ')');
                ok(s.xpPills === 0, pre + 'no XP pill on every row');
                ok(!s.today && !s.ja, pre + 'no "back to Today", no research tag');
                ok(!s.emoji, pre + 'no emoji (' + s.emoji + ')');
            };
            const closeByX = async k => {
                const n = await page.evaluate(() => { const b = [...document.querySelectorAll('.fs-panel .pf-x, .fs-panel .fs-x')].find(b => b.getBoundingClientRect().width > 2); if (!b) return 0; b.click(); return 1; });
                await sleep(900);
                const after = await probe();
                ok(n === 1 && (after.none || !after.fs), P + k + ': the close control closes it');
                ok(!(await page.evaluate(() => document.documentElement.classList.contains('fs-open'))), P + k + ': the Home X comes back after closing');
            };

            /* Today's step -> Your pick */
            await bloom('step'); let s = await probe(); check('Your pick', s); await shot('1-your-pick'); if (!SHOOT) await closeByX('Your pick');
            /* Swap: step 1, tile, step 2, show another, back */
            await bloom('swap'); s = await probe(); check('Swap step 1', s); await shot('2-swap-step1');
            if (!SHOOT) {
                ok(s.step === '1' && /What are you craving\?/.test(s.title), P + 'Swap step 1 asks "What are you craving?" ' + s.title);
                ok(s.tiles.length >= 5 && s.tiles.every(Boolean), P + 'every craving tile visible at once, inside the panel ' + JSON.stringify(s.tiles));
                await page.locator('#sos .fs-tile[data-c="chocolate"]').click({ timeout: 8000 }); await sleep(900);
                s = await probe(); check('Swap step 2', s); await shot('3-swap-step2');
                ok(s.step === '2' && /Craving/.test(s.card) && /Chocolate/.test(s.card) && /Have instead/.test(s.card), P + 'Swap step 2 is one card: Craving Chocolate -> Have instead ' + JSON.stringify(s.card));
                const btns = await page.evaluate(() => [...document.querySelectorAll('#sos button')].filter(b => b.getBoundingClientRect().width > 2).map(b => b.textContent.trim()));
                ok(btns.includes('I had it') && btns.includes('Show another') && btns.includes('I ate the craving anyway, log it'), P + 'I had it / Show another / log link ' + JSON.stringify(btns));
                ok(btns.some(t => /10-minute/.test(t)) && !(await page.evaluate(() => { const t = document.getElementById('sosTimer'); return t && !t.hidden; })), P + 'the wave timer is a small optional link, not running');
                const first = await page.evaluate(() => document.querySelector('#sos .fs-swap-to').textContent);
                await page.locator('#sos [data-act="sosnext"]').click(); await sleep(500);
                const second = await page.evaluate(() => document.querySelector('#sos .fs-swap-to').textContent);
                ok(first && second && first !== second, P + 'Show another changes the food: ' + first + ' -> ' + second);
                await page.locator('#sos .fs-link[data-act="sos"]').click(); await sleep(600);
                s = await probe(); ok(s.step === '1', P + 'Back returns to step 1');
                /* I had it awards like before (+20 XP for the first three a day) and closes */
                await page.locator('#sos .fs-tile[data-c="salty"]').click(); await sleep(600);
                const xp0 = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('lowispike.v2')).xp; } catch (e) { return null; } });
                await page.locator('#sos [data-act="sosbeat"]').click(); await sleep(900);
                const xp1 = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('lowispike.v2')).xp; } catch (e) { return null; } });
                const sosOpen = await page.evaluate(() => document.getElementById('sos').classList.contains('open'));
                ok(!sosOpen && xp1 === xp0 + 20, P + 'I had it closes Swap and gives +20 XP as before (' + xp0 + ' -> ' + xp1 + ')');
                /* the log link opens the Fuel meal log in the same style */
                await bloom('swap'); await page.locator('#sos .fs-tile[data-c="sweet"]').click(); await sleep(600);
                await page.locator('#sos [data-act="sosgave"]').click(); await sleep(1400);
                s = await probe(); ok(s.kind === 'log', P + '"I ate the craving anyway, log it" opens the meal log (' + s.kind + ' ' + s.title + ')');
                await closeAll();
                await bloom('swap'); await closeByX('Swap');
            }
            /* Log a meal (hold Fuel) */
            await closeAll(); await page.evaluate(() => window.LowiSpirit && LowiSpirit.meal()); await sleep(1300);
            s = await probe(); check('Log a meal', s); await shot('4-log-a-meal'); if (!SHOOT) await closeByX('Log a meal');
            /* What did you eat? (F2) */
            await closeAll(); await page.evaluate(() => window.LowiF2 && LowiF2.start({})); await sleep(1300);
            s = await probe(); check('What did you eat?', s); await shot('5-what-did-you-eat');
            if (!SHOOT) {
                ok(s.xpLines === 1, P + 'What did you eat? shows XP once (' + s.xpLines + ')');
                ok(/Not now/.test(s.text), P + '"Not now" instead of "Skip for now · back to Today"');
                await closeByX('What did you eat?');
            }
            /* Snack: What can I buy here? */
            await bloom('snack'); s = await probe(); check('What can I buy here?', s); await shot('6-snack');
            if (!SHOOT) await closeByX('What can I buy here?');
            ok(new Set(titleSizes.filter(Boolean)).size === 1, P + 'one title size on every Fuel screen ' + JSON.stringify(titleSizes));
            ok(errs.length === 0, P + 'no page errors ' + errs.slice(0, 3).join(' / '));
            log.push('     ' + P + 'blocked non-GET/other-host requests: ' + blocked);
        } catch (e) { fails.push(P + 'crashed: ' + (e && e.stack || e)); }
        await browser.close();
    }
    if (srv) srv.close();
    console.log(log.join('\n'));
    if (fails.length) { console.log('\nFAILED ' + fails.length + ':\n' + fails.join('\n')); process.exit(1); }
    console.log('\n' + (SHOOT ? 'SHOT' : 'PASS') + ' fuel-screens-live, shots in ' + OUT);
})();
