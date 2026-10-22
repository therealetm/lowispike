'use strict';
/* "Continue tutorial" button check (22 Oct 2026, MAYA-HANDOFF item 40):
   node tools/tutorial-resume/check.cjs [--url URL] [--out DIR] [--devices "iPhone SE,iPhone 13,iPhone 15,Pixel 7"] [--root DIR]
   Simulated phones (iPhones in Playwright WebKit, Pixel 7 in Chromium). Same stubs as tools/tutorial-voice/handsfree-check.cjs:
   every clip "plays" and ends after 300 ms, the speaker is on, the camera is counted.
   A. hands-free: tap to start, the tour reads and moves on by itself; leave it with Escape (= back-swipe) mid-tour: the pill
      shows on Home, Community, Scan, Shelf and Profile and after a reload (no second "Pick up the tour?" card), never on top of
      anything tappable (tab bar, bubbles, Scan, inputs, buttons); tapping it reopens the tour on the card that was left (or the
      next one when it had been read to the end), reads it aloud and keeps moving on by itself.
   B. a sheet opened mid-tour (what a try-it gesture does) hides the card: the pill shows; tapping it closes the sheet (Escape,
      like back-swipe) and the same card comes back.
   C. Skip all: the pill is gone, on every screen and after a reload.
   D. the last card finished: the pill is gone, after a reload too. Starting again from Settings still works.
   E. day theme and German / Spanish labels (screenshots).
   Prints one line per check and ALL OK / FAIL; screenshots go to --out. Not a real iPhone: real touch, real audio unlock,
   real safe areas and the real back-swipe gesture are not exercised. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, '/tmp/pw/node_modules/playwright', path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), OUT = path.resolve(arg('out', '/tmp/tutorial-resume-out'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
const BASE = '/lowispike/', sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() {
    return new Promise(r => {
        const s = http.createServer((q, res) => {
            let u = decodeURIComponent(q.url.split('?')[0]);
            if (!u.startsWith(BASE)) { res.writeHead(404); res.end(); return; }
            u = u.slice(BASE.length - 1); if (u === '/' || u.endsWith('/')) u += 'index.html';
            const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
            fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(b); });
        });
        s.listen(0, '127.0.0.1', () => r({ s, url: `http://127.0.0.1:${s.address().port}${BASE}` }));
    });
}
const msrc = fs.readFileSync(path.join(ROOT, 'tools/startup/measure.cjs'), 'utf8');
const INIT_SRC = msrc.slice(msrc.indexOf('const INIT = () => {') + 'const INIT = '.length, msrc.indexOf('\n};\n', msrc.indexOf('const INIT = () => {')) + 2);
const PRE = lang => `(() => { try {
  if (!sessionStorage.getItem('thf')) { sessionStorage.setItem('thf', '1');
  localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Tester', bday: '1990-03-05', tags: [] }, xp: 1254, ledger: [], logs: [], saved: [], settings: { lang: '${lang}' } }));
  localStorage.setItem('lowispike.companion.v1', JSON.stringify({ v: 1, bday: '1990-03-05', btime: '07:45', n: 0, name: 'Misty', created: 1 }));
  localStorage.setItem('lowi.hint.communityHold', '1'); localStorage.setItem('lowispike.lang', '${lang}'); localStorage.setItem('lowi.tutorial.voice.v1', '1'); }
} catch (e) { } })();`;
/* audio: each clip ends after 300 ms; camera: counted, answered like a dismissed permission sheet */
const STUB = `(() => {
  window.__gum = 0; window.__plays = [];
  const md = navigator.mediaDevices || {};
  try { if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { value: md, configurable: true }); } catch (e) { }
  md.getUserMedia = function () { window.__gum++; return Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })); };
  const P = HTMLMediaElement.prototype;
  P.play = function () { const a = this, silent = /^data:/.test(a.src || ''); if (!silent) window.__plays.push(String(a.src).split('/').slice(-2).join('/')); clearTimeout(a.__t); a.__t = setTimeout(() => a.dispatchEvent(new Event('ended')), silent ? 20 : (window.__clipMs || 300)); return Promise.resolve(); };
  P.pause = function () { clearTimeout(this.__t); };
  try { speechSynthesis.speak = () => { }; } catch (e) { }
})();`;

async function newPage(browser, dev, lang) {
    const ctx = await browser.newContext(Object.assign({}, pw.devices[dev], { colorScheme: 'dark', serviceWorkers: 'block' }));
    await ctx.addInitScript(PRE(lang)); await ctx.addInitScript(STUB); await ctx.addInitScript('(' + INIT_SRC + ')()');
    const page = await ctx.newPage();
    page.errs = []; page.on('pageerror', e => page.errs.push(String(e.message || e)));
    return { ctx, page };
}
async function boot(page, url) {
    await page.goto(url + '?thf=' + Date.now(), { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('[data-orbit]') && window.LowiTutorial && window.LowiTutorialVoice, null, { timeout: 45000 }).catch(() => { });
    await sleep(3500);
    await page.evaluate(() => document.querySelectorAll('[aria-modal="true"]').forEach(d => { if (!d.closest('#ltTour')) d.remove(); }));
}
const state = page => page.evaluate(() => ({ step: window.LowiTutorial.step(), held: window.LowiTutorial.held(), on: window.LowiTutorial.isOn(), paused: window.LowiTutorial.paused(), auto: window.LowiTutorial.auto(), gum: window.__gum, plays: window.__plays.length, cam: document.documentElement.classList.contains('b3-camon') || !!document.querySelector('#b3Cam') }));


/* the pill as the user sees it: visible, where, label, and every tappable thing it covers (topmost at its own centre) */
const pill = page => page.evaluate(() => {
    const b = document.getElementById('ltResume');
    if (!b || b.hidden || !b.getClientRects().length) return { shown: false };
    const g = b.getBoundingClientRect(), cs = getComputedStyle(b), cx = g.left + g.width / 2, cy = g.top + g.height / 2;
    const r = { left: cx - b.offsetWidth / 2, right: cx + b.offsetWidth / 2, top: cy - b.offsetHeight / 2, bottom: cy + b.offsetHeight / 2 };
    const SEL = 'button, a[href], input, textarea, select, [role="button"], [role="tab"], [contenteditable="true"], .lb-bub, .wh-cell, #tabbar, #tabbar *';
    const covered = [];
    for (const el of document.querySelectorAll(SEL)) {
        if (el === b || b.contains(el)) continue;
        const q = el.getBoundingClientRect();
        if (q.width < 2 || q.height < 2) continue;
        const x = Math.min(q.right, r.right) - Math.max(q.left, r.left), y = Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top);
        if (x <= 1 || y <= 1) continue;
        /* is it really tappable there (on top, not under a sheet or hidden)? check its visible part outside the pill */
        const ecs = getComputedStyle(el);
        if (ecs.visibility === 'hidden' || ecs.pointerEvents === 'none' || +ecs.opacity < .05) continue;
        const pts = [[q.left + q.width / 2, q.top + q.height / 2], [q.left + 3, q.top + 3], [q.right - 3, q.bottom - 3], [Math.max(q.left, r.left) + x / 2, Math.max(q.top, r.top) + y / 2]];
        b.style.visibility = 'hidden';
        const live = pts.some(([px, py]) => { const t = document.elementFromPoint(px, py); return t && (t === el || el.contains(t)); });
        b.style.visibility = '';
        if (live) covered.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]) + ' ' + Math.round(x) + 'x' + Math.round(y));
    }
    return { shown: true, hits: window.LowiTutorialResume && window.LowiTutorialResume.hits ? window.LowiTutorialResume.hits() : -1, spot: b.getAttribute('data-spot'), label: b.querySelector('.ltr-lbl').textContent, w: b.offsetWidth, h: b.offsetHeight, /* layout size: the 0.28 s fade-in scales it */
        l: Math.round(r.left), t: Math.round(r.top), off: r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight, z: cs.zIndex, covered };
});
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name.replace(/[^\w.-]+/g, '_') + '.png') });
const tapStart = (page, opts) => page.evaluate(o => { document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); window.LowiTutorial.start(o); }, opts || { from: 'check' });
function checkPill(p, tag, where, fails) {
    if (!p.shown) { fails.push(`${tag}: no pill on ${where}`); return; }
    if (p.covered.length) fails.push(`${tag}: pill on ${where} (${p.spot}, own hit test ${p.hits}) covers ${p.covered.join(', ')}`);
    if (p.off) fails.push(`${tag}: pill on ${where} is off screen`);
    if (p.h < 44 || p.w < 44) fails.push(`${tag}: pill on ${where} smaller than 44 px (${p.w}x${p.h})`);
}
async function waitFor(page, fn, arg, ms) { try { await page.waitForFunction(fn, arg, { timeout: ms || 8000 }); return true; } catch (e) { return false; } }

async function handsfree(browser, dev, url, fails, lines) {
    const tag = `${dev}/A hands-free, leave, other screens, reload, continue`;
    const { ctx, page } = await newPage(browser, dev, 'en');
    try {
        await boot(page, url);
        await tapStart(page);
        await sleep(600);
        const ids = await page.evaluate(() => window.LowiTutorial.ids());
        /* let it read and move on by itself for a few cards */
        await waitFor(page, n => (window.LowiTutorial.ids().indexOf(window.LowiTutorial.step()) >= n), 3, 30000);
        const a = await state(page);
        await shot(page, `${dev}-A1-handsfree-card`);
        if (ids.indexOf(a.step) < 3) fails.push(`${tag}: hands-free did not move on by itself (on ${a.step})`);
        const pre = await pill(page);
        if (pre.shown) fails.push(`${tag}: pill shown while the card is on screen`);
        /* leave the card: Escape, what back-swipe sends */
        await page.keyboard.press('Escape');
        await sleep(900);
        const left = await state(page), st = await page.evaluate(() => JSON.parse(localStorage.getItem('lowi.tutorial.v1') || '{}'));
        if (left.on) fails.push(`${tag}: Escape did not leave the card`);
        const plays0 = await page.evaluate(() => window.__plays.length); await sleep(2500);
        const plays1 = await page.evaluate(() => window.__plays.length);
        if (plays1 !== plays0) fails.push(`${tag}: the voice kept talking after leaving (${plays1 - plays0} clips)`);
        const want = st.resume && (st.resume.fin && st.resume.next ? st.resume.next : st.resume.at);
        const where = [];
        let p = await pill(page); checkPill(p, tag, 'Home', fails); where.push('Home ' + (p.spot || '-')); await shot(page, `${dev}-A2-left-home`);
        for (const t of ['foryou', 'shelf', 'profile', 'move', 'scan']) {   /* scan last: it opens the camera on top of everything */
            await page.evaluate(x => { try { window.goTab(x); } catch (e) { } }, t); await sleep(2600);
            p = await pill(page); checkPill(p, tag, t, fails); where.push(t + ' ' + (p.spot || '-'));
            if (t === 'foryou' || t === 'scan') await shot(page, `${dev}-A3-left-${t}`);
            if (t === 'foryou') {   /* Community > Chat > a chat room: the message input must stay free */
                const ok = await page.evaluate(() => { try { window.LowiRoomsUI.setTab(true); window.LowiCommunity.thread(true); return true; } catch (e) { return false; } });
                await sleep(1800);
                if (ok) {
                    const input = await page.evaluate(() => !!Array.from(document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]')).find(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden'));
                    p = await pill(page); checkPill(p, tag, 'a chat room', fails); where.push('chat room ' + (p.spot || '-') + (input ? '' : ' (no input found)'));
                    await shot(page, `${dev}-A3-left-chat-room`);
                    await page.keyboard.press('Escape').catch(() => { }); await sleep(600);
                }
            }
        }
        await page.keyboard.press('Escape').catch(() => { }); await sleep(500);   /* close the camera */
        await page.evaluate(() => { try { window.goTab('home'); } catch (e) { } }); await sleep(800);
        /* reload */
        await page.reload({ waitUntil: 'load' });
        await page.waitForFunction(() => window.LowiTutorial && window.LowiTutorialResume, null, { timeout: 45000 }).catch(() => { });
        await sleep(6500);
        const offer = await page.evaluate(() => !!document.querySelector('#ltTour.lt-resume'));
        if (offer) fails.push(`${tag}: the old "Pick up the tour?" card showed as well`);
        p = await pill(page); checkPill(p, tag, 'Home after reload', fails); where.push('reload ' + (p.spot || '-'));
        await shot(page, `${dev}-A4-after-reload`);
        /* tap it */
        const before = await page.evaluate(() => window.__plays.length);
        await page.click('#ltResume');
        await sleep(900);
        const b = await state(page), plays2 = await page.evaluate(() => window.__plays.length);
        if (!b.on || b.held) fails.push(`${tag}: tapping the pill did not reopen the tour`);
        if (b.step !== want) fails.push(`${tag}: reopened on ${b.step}, expected ${want} (left on ${left.step || a.step})`);
        if (plays2 <= before) fails.push(`${tag}: the card was not read aloud after continuing`);
        p = await pill(page); if (p.shown) fails.push(`${tag}: pill still shown with the card back`);
        await shot(page, `${dev}-A5-continued`);
        const moved = await waitFor(page, s => window.LowiTutorial.step() !== s, b.step, 15000);
        if (!moved) fails.push(`${tag}: hands-free did not move on after continuing`);
        const c = await state(page);
        if (page.errs.length) fails.push(`${tag}: page errors: ${page.errs.slice(0, 3).join(' | ')}`);
        lines.push(`${tag}: ran by itself to ${a.step} (#${ids.indexOf(a.step)}), left, pill at ${where.join(', ')}; reopened on ${b.step} (expected ${want}), read aloud, moved on to ${c.step}`);
    } finally { await ctx.close(); }
}

async function sheet(browser, dev, url, fails, lines) {
    const tag = `${dev}/B sheet opened mid-tour`;
    const { ctx, page } = await newPage(browser, dev, 'en');
    try {
        await boot(page, url);
        await page.evaluate(() => { window.__clipMs = 60000; });
        await tapStart(page, { from: 'check', at: 'touch' });
        await sleep(1200);
        const a = await state(page);
        /* a sheet like the ones a try-it gesture opens: aria-modal, closes on Escape */
        await page.evaluate(() => {
            const d = document.createElement('div'); d.id = 'fakeSheet'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
            d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:60%;background:#123;z-index:9000;border-radius:24px 24px 0 0';
            d.innerHTML = '<button style="position:absolute;right:16px;top:16px;width:44px;height:44px">x</button><button style="position:absolute;left:16px;right:16px;bottom:24px;height:52px">Save</button>';
            document.body.appendChild(d);
            document.addEventListener('keydown', function f(e) { if (e.key === 'Escape') { d.remove(); document.removeEventListener('keydown', f); } });
        });
        await sleep(1400);
        const b = await state(page), p = await pill(page);
        if (!b.held) fails.push(`${tag}: the card stayed on top of the sheet`);
        checkPill(p, tag, 'the sheet', fails);
        await shot(page, `${dev}-B1-sheet`);
        await page.click('#ltResume');
        await sleep(2500);
        const c = await state(page), gone = await page.evaluate(() => !document.getElementById('fakeSheet'));
        if (!gone) fails.push(`${tag}: the sheet was not closed`);
        if (!c.on || c.held || c.step !== a.step) fails.push(`${tag}: card not back on ${a.step} (${c.step}, held ${c.held})`);
        if (page.errs.length) fails.push(`${tag}: page errors: ${page.errs.slice(0, 3).join(' | ')}`);
        lines.push(`${tag}: card hid (${b.held}), pill at ${p.spot}, tap closed the sheet (${gone}) and brought back ${c.step}`);
        /* Try it now (item 41): closes the card for the user to try; the pill then opens the NEXT card */
        const ids = await page.evaluate(() => window.LowiTutorial.ids());
        const tryId = await page.evaluate(() => { const S = window.LowiTutorialSteps, ids = window.LowiTutorial.ids(); return ids.find((id, k) => k > 0 && k < ids.length - 1 && (S.STEPS.find(x => x.id === id) || {}).tryIt) || ''; });
        if (tryId) {
            await tapStart(page, { from: 'check', at: tryId }); await sleep(1200);
            const hasBtn = await page.evaluate(() => !!document.querySelector('#ltTour [data-lt="tryit"]'));
            if (hasBtn) {
                await page.click('#ltTour [data-lt="tryit"]'); await sleep(1500);
                const off = await state(page), q = await pill(page);
                if (off.on && !off.held) fails.push(`${tag}: Try it now did not close the card`);
                checkPill(q, tag, 'after Try it now', fails);
                await shot(page, `${dev}-B2-after-try-it-now`);
                await page.evaluate(() => { try { window.goTab('home'); } catch (e) { } }); await sleep(1500);
                await page.click('#ltResume'); await sleep(1500);
                const back = await state(page), want = ids[ids.indexOf(tryId) + 1];
                if (!back.on || back.step !== want) fails.push(`${tag}: after Try it now the pill opened ${back.step}, expected the next card ${want}`);
                lines.push(`${tag}: Try it now on ${tryId} closed the card, pill at ${q.spot}, tap opened ${back.step} (next card ${want})`);
            } else lines.push(`${tag}: no Try it now button on ${tryId} (skipped)`);
        }
    } finally { await ctx.close(); }
}

async function ends(browser, dev, url, fails, lines) {
    const tag = `${dev}/C+D Skip all and finish`;
    const { ctx, page } = await newPage(browser, dev, 'en');
    try {
        await boot(page, url);
        await page.evaluate(() => { window.__clipMs = 60000; });
        await tapStart(page);
        await sleep(900);
        await page.click('#ltTour [data-lt="next"]'); await sleep(600);
        await page.keyboard.press('Escape'); await sleep(900);
        const p0 = await pill(page);
        if (!p0.shown) fails.push(`${tag}: no pill after leaving`);
        await page.click('#ltResume'); await sleep(900);
        await page.click('#ltTour [data-lt="skipall"]'); await sleep(900);
        const out = [];
        for (const t of ['home', 'foryou', 'scan']) { await page.evaluate(x => { try { window.goTab(x); } catch (e) { } }, t); await sleep(1200); if ((await pill(page)).shown) out.push(t); }
        await page.reload({ waitUntil: 'load' }); await sleep(7000);
        if ((await pill(page)).shown) out.push('after reload');
        if (out.length) fails.push(`${tag}: pill still shown after Skip all on ${out.join(', ')}`);
        /* Settings > Tutorial still starts it, and leaving brings the pill back */
        await tapStart(page, { from: 'settings' }); await sleep(900);
        const s1 = await state(page);
        if (!s1.on) fails.push(`${tag}: Settings start did not open the tour after Skip all`);
        await page.keyboard.press('Escape'); await sleep(900);
        if (!(await pill(page)).shown) fails.push(`${tag}: no pill after leaving a tour started from Settings`);
        /* finish: the last card */
        const ids = await page.evaluate(() => window.LowiTutorial.ids());
        await tapStart(page, { from: 'check', at: ids[ids.length - 1] }); await sleep(1200);
        const s2 = await state(page);
        if (s2.step !== ids[ids.length - 1]) fails.push(`${tag}: could not reach the last card (${s2.step})`);
        await page.click('#ltTour [data-lt="next"]'); await sleep(900);
        const s3 = await state(page), out2 = [];
        if (s3.on) fails.push(`${tag}: the last card did not finish the tour`);
        for (const t of ['home', 'foryou']) { await page.evaluate(x => { try { window.goTab(x); } catch (e) { } }, t); await sleep(1200); if ((await pill(page)).shown) out2.push(t); }
        await page.reload({ waitUntil: 'load' }); await sleep(7000);
        if ((await pill(page)).shown) out2.push('after reload');
        if (out2.length) fails.push(`${tag}: pill still shown after finishing on ${out2.join(', ')}`);
        await shot(page, `${dev}-D-finished-no-pill`);
        if (page.errs.length) fails.push(`${tag}: page errors: ${page.errs.slice(0, 3).join(' | ')}`);
        lines.push(`${tag}: gone after Skip all (${out.length ? 'NO' : 'yes'}), Settings start works (${s1.on}), gone after the last card (${out2.length ? 'NO' : 'yes'})`);
    } finally { await ctx.close(); }
}

async function looks(browser, dev, url, fails, lines) {
    const tag = `${dev}/E day theme + languages`;
    const got = [];
    for (const [lang, theme] of [['de', 'light'], ['es', 'dark'], ['en', 'light']]) {
        const { ctx, page } = await newPage(browser, dev, lang);
        try {
            await boot(page, url);
            await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
            await page.evaluate(() => { window.__clipMs = 60000; });
            await tapStart(page); await sleep(900);
            await page.keyboard.press('Escape'); await sleep(1200);
            const p = await pill(page);
            checkPill(p, tag, `${lang}/${theme} Home`, fails);
            const want = { en: 'Continue tutorial', de: 'Tutorial fortsetzen', es: 'Continuar tutorial' }[lang];
            if (p.shown && p.label !== want) fails.push(`${tag}: label "${p.label}" for ${lang}`);
            await shot(page, `${dev}-E-${lang}-${theme}`);
            await page.evaluate(() => { try { window.goTab('foryou'); } catch (e) { } }); await sleep(2600);
            const q = await pill(page); checkPill(q, tag, `${lang}/${theme} Community`, fails);
            await shot(page, `${dev}-E-${lang}-${theme}-community`);
            got.push(`${lang}/${theme} "${p.label}" ${p.w}x${p.h} at ${p.spot}`);
        } finally { await ctx.close(); }
    }
    lines.push(`${tag}: ${got.join('; ')}`);
}

(async () => {
    if (!pw) { console.log('playwright not found (set PW=/path/to/node_modules/playwright)'); process.exit(2); }
    fs.mkdirSync(OUT, { recursive: true });
    let url = arg('url', ''), srv = null;
    if (!url) { srv = await serve(); url = srv.url; }
    const fails = [], lines = [];
    const only = arg('only', 'A,B,C,E').split(',');
    for (const dev of arg('devices', 'iPhone SE,iPhone 13,iPhone 15,Pixel 7').split(',')) {
        const engine = /Pixel|Galaxy/.test(dev) ? 'chromium' : 'webkit';
        const browser = await pw[engine].launch();
        try {
            if (only.includes('A')) await handsfree(browser, dev, url, fails, lines);
            if (only.includes('B')) await sheet(browser, dev, url, fails, lines);
            if (only.includes('C')) await ends(browser, dev, url, fails, lines);
            if (only.includes('E')) await looks(browser, dev, url, fails, lines);
        } catch (e) { fails.push(`${dev}: crashed: ${e.message.split('\n')[0]}`); }
        finally { await browser.close(); }
        lines.forEach(l => console.log(`[${engine}] ${l}`)); lines.length = 0;
    }
    if (srv) srv.s.close();
    fails.forEach(f => console.log('FAIL ' + f));
    console.log(fails.length ? `FAIL (${fails.length})` : 'ALL OK');
    process.exit(fails.length ? 1 : 0);
})();
