'use strict';
/* Browser check (Oct 26 2026, MAYA-HANDOFF 0.38): the Quick tour video.
   A) a brand-new visitor: the Add to Home Screen screen has no pill (Nov 9 2026, calm onboarding); the first onboarding screen
      (step 0) shows the Quick tour pill (EN / DE / ES label, 32 pt drawn, 44 pt to tap, Get started still on the first view);
      nothing of the video is downloaded before the tap; the tap opens the sheet: the video gets its src, starts muted and inline,
      the Tap for sound button turns the sound on, Skip closes it, the src is dropped and focus returns to the pill; Escape and the
      browser Back (Safari's back swipe) close it and the visitor stays on the onboarding screen;
   B) a signed-in fixture: Settings has Tutorial and no second tour row (Oct 28 2026 slim structure; changed here on Nov 9).
   Also: no page errors, the sheet fits the screen, and the mp4 answers Range requests (what Safari sends for video).
     node tests/quick-tour-live.cjs [--root DIR | --url URL] [--views iphone13_webkit,ipad_portrait_webkit,iphone_chromium] [--langs en,de,es]
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/quick-tour-shots');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() {
    return new Promise(r => {
        const s = http.createServer((q, res) => {
            let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
            const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
            const type = TYPES[path.extname(f)] || 'application/octet-stream', size = fs.statSync(f).size, m = /bytes=(\d*)-(\d*)/.exec(q.headers.range || '');
            if (m) { const a = m[1] ? +m[1] : size - +m[2], b = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1; res.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': b - a + 1 }); return fs.createReadStream(f, { start: a, end: b }).pipe(res); }
            res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': size }); fs.createReadStream(f).pipe(res);
        }).listen(0, '127.0.0.1', () => r(s));
    });
}
const IPAD = { viewport: { width: 820, height: 1180 }, screen: { width: 820, height: 1180 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { iphone13_webkit: ['webkit', 'iPhone 13'], ipad_portrait_webkit: ['webkit', IPAD], iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, /* an Android phone in Chrome: the Add to Home Screen guide only shows on phones (a desktop UA goes straight to onboarding) */ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36' }] };
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const Q = require('../quick-tour.js'), SS = require('../home-settings-sleep-v2.js');

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    let fail = 0, checks = 0;
    const ok = (cond, P, msg) => { checks++; if (!cond) P.push(msg); };
    for (const v of arg('views', 'iphone13_webkit,ipad_portrait_webkit,iphone_chromium').split(',')) {
        for (const lang of arg('langs', 'en,de,es').split(',')) {
            const [eng, dd] = VIEWS[v];
            const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] } : {});
            const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd);
            const P = [], steps = { view: v, lang };
            /* ---------- A) brand-new visitor, first onboarding screen ---------- */
            {
                const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block', locale: { en: 'en-US', de: 'de-DE', es: 'es-ES' }[lang] }));
                const mp4 = [];
                await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (/\.mp4$/.test(u.pathname)) mp4.push(u.pathname); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
                await ctx.addInitScript(l => { try { localStorage.setItem('lowi.lang', l); localStorage.setItem('lowispike.lang', l); } catch (e) { } }, lang);
                const page = await ctx.newPage(), errs = [];
                page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
                try {
                    await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
                    /* test changed, why (Nov 9 2026): the calm onboarding (onboarding-calm.css) took the pill off the browser's Add to Home Screen
                       screen (its one job is the Home Screen) and the new 37 s cut is offered on the app's first screen (herb-start step 0)
                       as a small quiet pill (32 pt drawn, 44 pt to tap). So: no pill on the install screen, then the whole tour flow on step 0. */
                    const PILL = '.r2-start.hs[data-hs-step="0"] .hs-qt';
                    await page.waitForFunction(() => window.LowiQuickTour && document.querySelector('#r2gate .r2-start'), null, { timeout: 120000, polling: 250 }).catch(() => { });
                    if (lang !== 'en') { await page.evaluate(l => { try { window.LowiLang && window.LowiLang.set && window.LowiLang.set(l); } catch (e) { } }, lang); await sleep(600); }
                    const a1 = await page.evaluate(() => { const g = document.querySelector('#r2gate .a1-first'); if (!g) return null; const b = g.querySelector('.a1-qt'); return { pill: !!b && getComputedStyle(b).display !== 'none' }; });
                    steps.a1 = a1;
                    if (a1) {
                        ok(!a1.pill, P, 'the Add to Home Screen screen shows the tour pill again (calm onboarding hides it)');
                        await page.tap('#r2gate [data-a1="continue"]');
                    }
                    await page.waitForSelector(PILL, { timeout: 15000 }).catch(() => { }); await sleep(800);
                    const pill = await page.evaluate(sel => { const b = document.querySelector(sel); if (!b || getComputedStyle(b).display === 'none') return null; const r = b.getBoundingClientRect(), go = document.querySelector('#r2gate [data-hs=plant]'), g = go && go.getBoundingClientRect(), hit = getComputedStyle(b, '::after'); return { text: b.textContent.trim(), x: r.left, y: r.top, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight, goBottom: g ? g.bottom : null, tap: hit && hit.content !== 'none' ? r.height + 2 * (parseFloat(hit.top) < 0 ? -parseFloat(hit.top) : 0) : r.height }; }, PILL);
                    steps.pill = pill;
                    ok(!!pill, P, 'no Quick tour pill on the first onboarding screen (step 0)');
                    if (!pill) throw new Error('skip');
                    ok(pill.text.includes(Q.TX[lang].open), P, 'pill label not in ' + lang + ': ' + pill.text);
                    ok(pill.h >= 30 && pill.tap >= 44 && pill.x >= 0 && pill.x + pill.w <= pill.vw + 1 && pill.y + pill.h <= pill.vh, P, 'pill too small, too small to tap or off screen ' + JSON.stringify(pill));
                    ok(pill.goBottom != null && pill.goBottom <= pill.vh, P, 'Loslegen / Get started is not on the first view with the pill ' + JSON.stringify(pill));
                    ok(mp4.length === 0, P, 'the video downloaded before the tap: ' + mp4.join(','));
                    await page.screenshot({ path: `${OUT}/${v}-${lang}-1-pill.png` });
                    await page.tap(PILL);
                    await page.waitForSelector('.qt-ov.on', { timeout: 8000 }).catch(() => { });
                    await sleep(1500);
                    const st = await page.evaluate(() => { const o = document.querySelector('.qt-ov.on'), v = o && o.querySelector('video'), b = o && o.querySelector('.qt-box').getBoundingClientRect(); return o && { src: v.getAttribute('src'), muted: v.muted, inline: v.hasAttribute('playsinline'), t: v.currentTime, paused: v.paused, err: v.error && v.error.code, can: v.canPlayType('video/mp4; codecs="avc1.4D401F, mp4a.40.2"'), box: [b.left, b.top, b.right, b.bottom], vw: innerWidth, vh: innerHeight, sound: o.querySelector('[data-qt="sound"]').textContent.trim(), skip: o.querySelector('[data-qt="skip"]').textContent.trim(), focus: document.activeElement && document.activeElement.className, role: o.getAttribute('role') }; });
                    steps.open = st;
                    ok(!!st, P, 'tap did not open the Quick tour');
                    if (!st) throw new Error('skip');
                    ok(st.src === Q.src(lang), P, 'wrong video ' + st.src);
                    ok(st.muted && st.inline, P, 'not muted + inline');
                    ok(mp4.length >= 1, P, 'the video was not requested after the tap');
                    ok(st.box[0] >= -1 && st.box[1] >= -1 && st.box[2] <= st.vw + 1 && st.box[3] <= st.vh + 1, P, 'sheet does not fit the screen ' + JSON.stringify(st.box));
                    ok(st.sound === Q.TX[lang].sound && st.skip === Q.TX[lang].skip, P, 'button labels not in ' + lang + ': ' + st.sound + ' / ' + st.skip);
                    ok(st.role === 'dialog' && /qt-skip/.test(st.focus || ''), P, 'not a dialog with focus on Skip: ' + st.focus);
                    /* on the live site the first fetch of the 2.3 MB file can take a few seconds: wait for data (up to 20 s) before judging it */
                    await page.waitForFunction(() => { const v = document.querySelector('.qt-ov video'); return !v || v.error || v.readyState >= 2; }, null, { timeout: 20000, polling: 250 }).catch(() => { });
                    { const m = await page.evaluate(() => { const v = document.querySelector('.qt-ov video'); return { t: v.currentTime, rs: v.readyState, w: v.videoWidth, h: v.videoHeight, err: v.error && v.error.code }; }); steps.playing = m;
                      /* Chromium plays it; Playwright's Linux WebKit decodes it (readyState 4, 720x1280) but its media clock does not run headless, so there it is "decoded", on a real iPhone it plays */
                      ok(!m.err && m.rs >= 2 && m.w === 720 && m.h === 1280 && (eng === 'webkit' || m.t > 0.3), P, 'the video does not load/play ' + JSON.stringify(m)); }
                    await page.screenshot({ path: `${OUT}/${v}-${lang}-2-open.png` });
                    await page.tap('[data-qt="sound"]', { force: true }); await sleep(300); /* force: its pulse animation never counts as "stable" for Playwright */
                    const s2 = await page.evaluate(() => { const o = document.querySelector('.qt-ov.on'); return { muted: o.querySelector('video').muted, label: o.querySelector('[data-qt="sound"]').textContent.trim(), pressed: o.querySelector('[data-qt="sound"]').getAttribute('aria-pressed') }; });
                    ok(!s2.muted && s2.label === Q.TX[lang].mute && s2.pressed === 'true', P, 'Tap for sound did not unmute ' + JSON.stringify(s2));
                    await page.screenshot({ path: `${OUT}/${v}-${lang}-3-sound.png` });
                    await page.tap('[data-qt="skip"]'); await sleep(500);
                    const s3 = await page.evaluate(sel => ({ ov: document.querySelectorAll('.qt-ov').length, vids: [...document.querySelectorAll('video')].filter(v => v.getAttribute('src') && /quick-tour/.test(v.getAttribute('src'))).length, focus: document.activeElement && document.activeElement.className, onb: !!document.querySelector(sel) }), PILL);
                    ok(s3.ov === 0 && s3.vids === 0, P, 'Skip did not close and free the video ' + JSON.stringify(s3));
                    ok(/hs-qt/.test(s3.focus || ''), P, 'focus did not go back to the pill: ' + s3.focus);
                    /* Escape */
                    await page.tap(PILL); await page.waitForSelector('.qt-ov.on', { timeout: 5000 }).catch(() => { }); await sleep(400);
                    await page.keyboard.press('Escape'); await sleep(500);
                    ok(await page.evaluate(sel => document.querySelectorAll('.qt-ov').length === 0 && !!document.querySelector(sel), PILL), P, 'Escape did not close it');
                    /* browser Back = Safari's back swipe */
                    await page.tap(PILL); await page.waitForSelector('.qt-ov.on', { timeout: 5000 }).catch(() => { }); await sleep(900);
                    const before = page.url();
                    await page.evaluate(() => history.back()); await sleep(1200);
                    const s4 = await page.evaluate(sel => ({ ov: document.querySelectorAll('.qt-ov.on').length, onb: !!document.querySelector(sel) }), PILL);
                    steps.back = s4;
                    ok(s4.ov === 0 && s4.onb && page.url().split('?')[0] === before.split('?')[0], P, 'Back did not just close the tour ' + JSON.stringify(s4) + ' ' + page.url());
                    ok(errs.length === 0, P, 'page errors: ' + errs.join(' | '));
                } catch (e) { if (e.message !== 'skip') P.push('A error: ' + e.message.slice(0, 200)); }
                await ctx.close();
            }
            /* ---------- B) Settings: Tutorial is the one guide, no second tour row (signed-in fixture) ---------- */
            if (lang === 'en' || v === 'iphone13_webkit') {
                const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
                await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
                await ctx.addInitScript(INIT);
                const page = await ctx.newPage(), errs = [];
                page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
                try {
                    await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
                    await page.waitForFunction(() => window.LowiHomeSettingsSleepV2 && window.LowiQuickTour && document.documentElement.classList.contains('wh-home'), null, { timeout: 150000, polling: 300 }).catch(() => { });
                    /* Settings mounts on the orbit's Settings bubble a while after Home appears (the same wait as ui-settings-page-live) */
                    await page.waitForFunction(() => { const b = document.querySelector('[data-orbit="settings"]'); return !!(b && b.dataset.o8Adapter === 'settings-sleep' && b.getBoundingClientRect().width > 20); }, null, { timeout: 180000, polling: 500 }).catch(() => P.push('Settings bubble never mounted'));
                    await sleep(1000);
                    await page.evaluate(l => { try { window.LowiLang && window.LowiLang.set && window.LowiLang.set(l); } catch (e) { } window.LowiHomeSettingsSleepV2.openSettings(); }, lang);
                    /* since Oct 22 2026 Settings open in the profile hub (community-me.js); the old ss2 page is only its fallback */
                    await page.waitForSelector('[data-cme="tutorial"],[data-ss2="tutorial"]', { timeout: 8000 }).catch(() => { });
                    await sleep(700);
                    const rows = await page.evaluate(() => [...document.querySelectorAll('.cme-row[data-cme],.ss2-page [data-ss2]')].map(b => ({ id: b.dataset.cme || b.dataset.ss2, label: b.textContent.trim() || b.getAttribute('aria-label'), vis: b.getBoundingClientRect().height > 0 })));
                    const hubOpen = () => (window.LowiCommunityMe && window.LowiCommunityMe.isOpen()) || !!(window.LowiHomeSettingsSleepV2 && window.LowiHomeSettingsSleepV2.isOpen());
                    steps.rows = rows.map(r => r.id).join(','); steps.home = await page.evaluate(hubOpen);
                    /* test changed, why (Nov 9 2026): since the Oct 28 slim structure Settings has ONE optional guide, Tutorial
                       (tests/slim-structure, tests/quick-tour: "no separate Quick tour row any more"); the video lives on the first
                       onboarding screen only. This live check said the opposite and failed since then; it now checks the decision. */
                    const ids = rows.map(r => r.id);
                    ok(ids.includes('tutorial') && ids.indexOf('quickTour') === -1, P, 'Settings should list Tutorial and no second tour row: ' + ids.join(','));
                    await page.screenshot({ path: `${OUT}/${v}-${lang}-4-settings.png` });
                    ok(errs.length === 0, P, 'page errors: ' + errs.join(' | '));
                } catch (e) { P.push('B error: ' + e.message.slice(0, 200)); }
                await ctx.close();
            }
            await browser.close();
            if (P.length) fail++;
            console.log((P.length ? 'FAIL ' : 'PASS ') + v + ' ' + lang + ' ' + JSON.stringify(steps).slice(0, 900) + (P.length ? '\n  - ' + P.join('\n  - ') : ''));
        }
    }
    if (srv) srv.close();
    console.log(fail ? `quick-tour-live: ${fail} view(s) FAILED (${checks} checks)` : `quick-tour-live: all ${checks} checks passed`);
    process.exit(fail ? 1 : 0);
})();
