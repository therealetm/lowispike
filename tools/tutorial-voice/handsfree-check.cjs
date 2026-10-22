'use strict';
/* Hands-free tutorial + scanner check (Oct 22 2026): node tools/tutorial-voice/handsfree-check.cjs [--url URL] [--out DIR] [--engines webkit,chromium] [--full 0|1]
   Simulated phones (Playwright WebKit/Chromium with iPhone profiles). Audio is stubbed: every clip "plays" and ends after 300 ms (the
   silent unlock sound after 20 ms, so it ends while the card's clip loads), so a
   whole tour runs in a few minutes; getUserMedia is stubbed to count calls (a camera request = iOS "Allow camera").
   A. full tour with the speaker on and no taps after the start: every card in order, moves on by itself, stops on the last card,
      the camera is never asked for and the scanner never opens.
   B. a tour continued on a Scan card (tutorial-auto.js resume): no camera, the look-inside picture shows; screenshots.
   C. Pause stops the voice and the moving on; Play reads the card again and moves on.
   D. a camera the user opens mid-tour hides the tour; closing it brings the tour back.
   E. layout on iPhone SE in en/de/es with the speaker on: Pause + card buttons on screen, 44 px, no overlap; the peek card fits.
   Prints one line per check and ALL OK / FAIL. Not a real iPhone: iOS audio unlock, the real permission sheet and Wake Lock are not
   exercised here. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, '/tmp/pw/node_modules/playwright', path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(path.join(__dirname, '..', '..')), OUT = path.resolve(arg('out', '/tmp/tutorial-handsfree-out'));
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
const state = page => page.evaluate(() => ({ step: window.LowiTutorial.step(), held: window.LowiTutorial.held(), on: window.LowiTutorial.isOn(), paused: window.LowiTutorial.paused(), auto: window.LowiTutorial.auto(), gum: window.__gum, plays: window.__plays.length, cam: document.documentElement.classList.contains('b3-camon') || !!document.querySelector('#b3Cam'), dlg: [...document.querySelectorAll('[aria-modal="true"], dialog[open]')].filter(d => !d.closest('#ltTour')).map(d => d.id || d.className || d.tagName).join(' ').slice(0, 80) }));

async function full(browser, engine, dev, url, fails, lines) {
    const tag = `${engine}/${dev}/A full hands-free`;
    const { ctx, page } = await newPage(browser, dev, 'en');
    try {
        await boot(page, url);
        /* a real tour starts from a tap: the tap leaves back-swipe.js's guard entry under the app (without it the tour's own way back
           from Community to Home popped to the page's first entry, Escape'd the tour and left the page; a phone always has it) */
        await page.evaluate(() => { document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); window.LowiTutorial.start({ from: 'check' }); });
        await sleep(600);
        const plan = await page.evaluate(() => window.LowiTutorial.core.plan({ noOwnCompanion: true, claimReady: true }).map(s => s.id));
        const seen = []; let last = '', t0 = Date.now(), maxCam = 0, maxGum = 0, held = 0;
        while (Date.now() - t0 < 420000) {
            const s = await state(page);
            if (s.step === 'claim') { await page.click('#ltTour [data-lt="next"]').catch(() => { }); }   /* the one card that waits for the user */
            if (s.step && s.step !== last) { seen.push(s.step); last = s.step; }
            maxCam = Math.max(maxCam, s.cam ? 1 : 0); maxGum = Math.max(maxGum, s.gum); if (s.held) { held++; if (!full.why) full.why = s.step + ' held by ' + (s.dlg || '?'); }
            if (s.step === plan[plan.length - 1]) { await sleep(5000); const e = await state(page); if (e.step !== s.step || !e.on) fails.push(tag + ': the last card did not stay'); break; }
            await sleep(150);
        }
        const plays = await page.evaluate(() => window.__plays.slice());
        const idsOnly = seen.filter(x => x);
        const missing = plan.filter(x => x !== 'claim' && !idsOnly.includes(x));
        const order = idsOnly.every((x, k) => k === 0 || plan.indexOf(x) > plan.indexOf(idsOnly[k - 1]));
        const secs = Math.round((Date.now() - t0) / 1000);
        if (missing.length) fails.push(tag + ': cards not reached: ' + missing.slice(0, 8).join(', ') + (missing.length > 8 ? '…' : '') + (full.why ? ' (' + full.why + ')' : ''));
        if (!order) fails.push(tag + ': cards out of order: ' + idsOnly.join(' '));
        if (maxGum) fails.push(tag + ': the camera was asked for ' + maxGum + ' time(s)');
        if (maxCam) fails.push(tag + ': the scanner opened during the tour');
        const dup = plays.filter((p, k) => k > 0 && p === plays[k - 1]);
        if (dup.length) fails.push(tag + ': a card was read twice in a row: ' + dup.slice(0, 4).join(', '));
        if (page.errs.length) fails.push(tag + ': page errors: ' + page.errs.slice(0, 3).join(' | '));
        lines.push(`${tag}: ${idsOnly.length}/${plan.length} cards by itself in ${secs}s, ${plays.length} clips, camera asks ${maxGum}, scanner opened ${maxCam ? 'yes' : 'no'}, held ticks ${held}`);
    } finally { await ctx.close(); }
}

async function scanResume(browser, engine, dev, url, fails, lines) {
    const tag = `${engine}/${dev}/B continue on a Scan card`;
    const { ctx, page } = await newPage(browser, dev, 'en');
    try {
        await boot(page, url);
        await page.evaluate(() => { window.__clipMs = 60000; window.LowiTutorial.start({ from: 'check', at: 'scan-in' }); });
        await sleep(4000);   /* longer than the 2.5 s the tour keeps moving to a card's section */
        let s = await state(page);
        const peek = await page.evaluate(() => { const p = document.querySelector('#ltTour .lt-peek'), c = document.querySelector('#ltTour .lt-card'); if (!p) return null; const r = c.getBoundingClientRect(); return { mark: p.dataset.mark, cardBottom: r.bottom, cardTop: r.top, vh: innerHeight }; });
        await page.screenshot({ path: path.join(OUT, `${engine}-${dev.replace(/\W+/g, '_')}-scan-in.png`) });
        if (s.step !== 'scan-in') fails.push(tag + ': not on scan-in (' + s.step + ')');
        if (!peek || peek.mark !== 'frame') fails.push(tag + ': no look-inside picture');
        else if (peek.cardTop < 0 || peek.cardBottom > peek.vh) fails.push(tag + ': the card with the picture does not fit (' + Math.round(peek.cardTop) + '..' + Math.round(peek.cardBottom) + ' of ' + peek.vh + ')');
        await page.click('#ltTour [data-lt="next"]'); await sleep(3000);
        s = await state(page);
        await page.screenshot({ path: path.join(OUT, `${engine}-${dev.replace(/\W+/g, '_')}-deep.png`) });
        const mark = await page.evaluate(() => { const p = document.querySelector('#ltTour .lt-peek'); return p && p.dataset.mark; });
        if (s.step !== 'deep' || mark !== 'deep') fails.push(tag + ': deep card without its picture (' + s.step + ', ' + mark + ')');
        for (let k = 0; k < 5; k++) { await page.click('#ltTour [data-lt="next"]').catch(() => { }); await sleep(900); }
        s = await state(page);
        if (s.gum) fails.push(tag + ': the camera was asked for ' + s.gum + ' time(s)');
        if (s.cam) fails.push(tag + ': the scanner opened');
        lines.push(`${tag}: on ${s.step} after the Scan cards, camera asks ${s.gum}, scanner opened ${s.cam ? 'yes' : 'no'}, picture ${peek ? peek.mark : 'none'}`);
    } finally { await ctx.close(); }
}

async function pause(browser, engine, dev, url, fails, lines) {
    const tag = `${engine}/${dev}/C pause and play`;
    const { ctx, page } = await newPage(browser, dev, 'en');
    try {
        await boot(page, url);
        await page.evaluate(() => { window.__clipMs = 2500; window.LowiTutorial.start({ from: 'check', at: 'energy' }); });
        await sleep(900);
        const vis = await page.evaluate(() => { const b = document.querySelector('#ltTour [data-lt="pause"]'); return b && getComputedStyle(b).display !== 'none'; });
        if (!vis) fails.push(tag + ': no Pause button with the speaker on');
        await page.click('#ltTour [data-lt="pause"]');
        const a = await state(page); await sleep(5000); const b = await state(page);
        const lbl = await page.evaluate(() => { const x = document.querySelector('#ltTour [data-lt="pause"]'); return x && x.getAttribute('aria-label') + '/' + x.getAttribute('aria-pressed') + '/' + (document.activeElement === x); });
        if (!a.paused || b.step !== a.step || b.plays !== a.plays) fails.push(tag + ': still moved or spoke while paused (' + JSON.stringify([a, b]) + ')');
        if (!/^Play\/true\/true$/.test(lbl)) fails.push(tag + ': button after Pause: ' + lbl);
        await page.click('#ltTour [data-lt="pause"]'); await sleep(400);
        const c = await state(page);
        await sleep(2500 + 1200 + 1500); const d = await state(page);
        if (c.paused || c.plays <= b.plays) fails.push(tag + ': Play did not read the card again');
        if (d.step === b.step) fails.push(tag + ': did not move on after Play');
        await page.click('#ltTour .lt-speak'); await sleep(300);   /* speaker off: no more moving on, Pause hidden */
        const e = await state(page); await sleep(5000); const f = await state(page);
        const hid = await page.evaluate(() => { const b = document.querySelector('#ltTour [data-lt="pause"]'); return !b || getComputedStyle(b).display === 'none'; });
        if (f.step !== e.step) fails.push(tag + ': moved on with the speaker off');
        if (!hid) fails.push(tag + ': Pause still shown with the speaker off');
        if (page.errs.length) fails.push(tag + ': page errors: ' + page.errs.slice(0, 3).join(' | '));
        lines.push(`${tag}: paused on ${a.step} for 5s without moving, Play moved on to ${d.step}, speaker off stayed on ${f.step}`);
    } finally { await ctx.close(); }
}

async function camera(browser, engine, dev, url, fails, lines) {
    const tag = `${engine}/${dev}/D camera opened by the user`;
    const { ctx, page } = await newPage(browser, dev, 'en');
    try {
        await boot(page, url);
        await page.evaluate(() => { window.__clipMs = 60000; window.LowiTutorial.start({ from: 'check', at: 'look' }); });
        await sleep(1500);
        await page.evaluate(() => document.documentElement.classList.add('b3-camon')); await sleep(1200);
        const a = await state(page);
        await page.evaluate(() => document.documentElement.classList.remove('b3-camon')); await sleep(1500);
        const b = await state(page);
        if (!a.held) fails.push(tag + ': the tour stayed on top of the camera');
        if (b.held || b.step !== 'look') fails.push(tag + ': the tour did not come back on the same card (' + b.step + ', held ' + b.held + ')');
        lines.push(`${tag}: hidden while the camera was up (${a.held}), back on ${b.step} after`);
    } finally { await ctx.close(); }
}

async function layout(browser, engine, dev, lang, url, fails, lines) {
    const tag = `${engine}/${dev}/${lang}/E layout`;
    const { ctx, page } = await newPage(browser, dev, lang);
    try {
        await boot(page, url);
        const bad = [];
        /* Community cards in tour order: restarting the check's tour from inside Community (start() again) can pop the page's history, and
           back-swipe.js turns that pop into Escape, which ends the tour. A real run walks the cards in order and never restarts. */
        const CARDS = ['hello', 'touch', 'look', 'scan', 'scan-in', 'deep', 'snap', 'done', 'water-hold', 'sheets', 'cook-swipe', 'log-meal', 'world-sound', 'settings-me', 'chat', 'voice', 'affiliates'];
        for (const at of CARDS) {
            for (let k = 0; k < 2; k++) {   /* a second start if the restart ended the tour (see above); a real card problem fails both */
                await page.evaluate(a => { window.__clipMs = 60000; window.LowiTutorial.start({ from: 'check', at: a }); }, at);
                await sleep(at === 'scan' ? 2800 : 1300);
                if (await page.evaluate(() => !!document.querySelector('#ltTour:not(.lt-held) .lt-card'))) break;
            }
            const r = await page.evaluate(() => {
                const card = document.querySelector('#ltTour:not(.lt-held) .lt-card'); if (!card) return { err: 'no card (' + (window.LowiTutorial.held() || '') + ' ' + [...document.querySelectorAll('[aria-modal="true"], dialog[open]')].filter(d => !d.closest('#ltTour')).map(d => d.id || d.className).join(' ').slice(0, 80) + ')' };
                const bs = [...card.querySelectorAll('button')].filter(b => getComputedStyle(b).display !== 'none').map(b => { const r = b.getBoundingClientRect(); return { c: b.className, l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; });
                const over = []; for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i], b = bs[j]; const x = Math.min(a.r, b.r) - Math.max(a.l, b.l), y = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (x > 0.5 && y > 0.5) over.push(a.c + ' x ' + b.c); }
                const off = bs.filter(b => b.l < 0 || b.t < 0 || b.r > innerWidth || b.b > innerHeight).map(b => b.c);
                const small = bs.filter(b => b.w < 43.5 || b.h < 43.5).map(b => b.c + ' ' + Math.round(b.w) + 'x' + Math.round(b.h));
                const cr = card.getBoundingClientRect(), pz = card.querySelector('[data-lt="pause"]');
                return { over, off, small, pause: !!pz && getComputedStyle(pz).display !== 'none', scroll: card.scrollHeight - card.clientHeight, ct: cr.top, cb: cr.bottom, vh: innerHeight };
            });
            const step = await page.evaluate(() => window.LowiTutorial.step());
            if (r.err) { bad.push(at + ': ' + r.err); continue; }
            if (r.over.length) bad.push(at + ': overlap ' + r.over.join(', '));
            if (r.off.length) bad.push(at + ': off screen ' + r.off.join(', '));
            if (r.small.length) bad.push(at + ': small ' + r.small.join(', '));
            if (!r.pause) bad.push(at + ': no Pause');
            if (r.ct < 0 || r.cb > r.vh + 0.5) bad.push(at + ': card outside the screen');
            if (r.scroll > 2) bad.push(at + ': card text needs scrolling (' + r.scroll + 'px)');
            if (step !== at) bad.push(at + ': on ' + step);
            if (/scan-in|deep/.test(at)) await page.screenshot({ path: path.join(OUT, `${engine}-${dev.replace(/\W+/g, '_')}-${lang}-${at}.png`) });
        }
        const g = await state(page);
        if (g.gum || g.cam) bad.push('camera asked ' + g.gum + ', scanner ' + g.cam);
        bad.forEach(b => fails.push(tag + ': ' + b));
        lines.push(`${tag}: ${bad.length ? bad.length + ' problem(s)' : 'ok'} on ${CARDS.length} cards`);
    } finally { await ctx.close(); }
}

/* F (item 38): every practice card takes its gesture on the pad (synthetic pointer events, two pointers for pinch), shows Nice,
   changes no app data, asks for no camera/mic, and moves on by itself; untouched, it still moves on in hands-free mode.
   Every later card shows its "after the tour" motion. */
async function practice(browser, engine, dev, url, fails, lines) {
    const tag = `${engine}/${dev}/F practice + later`;
    const { ctx, page } = await newPage(browser, dev, 'en');
    try {
        await boot(page, url);
        const ids = await page.evaluate(() => window.LowiTutorialSteps.STEPS.filter(s => s.practice).map(s => s.id));
        const later = await page.evaluate(() => window.LowiTutorialSteps.STEPS.filter(s => s.later && !s.peek).map(s => s.id));
        const bad = []; let ok = 0;
        const before = await page.evaluate(() => localStorage.getItem('lowispike.v2'));
        for (const at of ids) {
            await page.evaluate(a => { window.__clipMs = 300; window.LowiTutorial.start({ from: 'check', at: a }); }, at);
            await sleep(900);
            const r = await page.evaluate(async () => {
                const pad = document.querySelector('#ltTour .lt-card .lt-pad'); if (!pad) return { err: 'no pad' };
                const how = pad.dataset.how, b = pad.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
                const ev = (t, id, x, y) => pad.dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: id === 1 }));
                const w = ms => new Promise(r => setTimeout(r, ms));
                const lit = !!document.querySelector('#ltTour .lt-spot:not([hidden])') && getComputedStyle(document.querySelector('#ltTour .lt-spot')).display !== 'none';
                if (how === 'tap' || how === 'touch') { ev('pointerdown', 1, cx, cy); await w(60); ev('pointerup', 1, cx, cy); }
                else if (how === 'double') { for (let k = 0; k < 2; k++) { ev('pointerdown', 1, cx, cy); await w(50); ev('pointerup', 1, cx, cy); await w(90); } }
                else if (how === 'hold') { ev('pointerdown', 1, cx, cy); await w(800); ev('pointerup', 1, cx, cy); }
                else if (how === 'drag' || how === 'swipe') { ev('pointerdown', 1, cx - 50, cy); for (let k = 1; k <= 8; k++) { await w(16); ev('pointermove', 1, cx - 50 + k * 13, cy + (how === 'drag' ? k * 2 : 0)); } ev('pointerup', 1, cx + 54, cy); }
                else if (how === 'pinch') { ev('pointerdown', 1, cx - 10, cy); ev('pointerdown', 2, cx + 10, cy); for (let k = 1; k <= 6; k++) { await w(16); ev('pointermove', 1, cx - 10 - k * 6, cy); ev('pointermove', 2, cx + 10 + k * 6, cy); } ev('pointerup', 1, cx - 46, cy); ev('pointerup', 2, cx + 46, cy); }
                await w(150);
                const p2 = document.querySelector('#ltTour .lt-card .lt-pad');
                return { how, done: !!(p2 && p2.classList.contains('lt-done')), nice: p2 ? p2.textContent : '', through: document.documentElement.querySelector('#ltTour.lt-try') ? 1 : 0, lit };
            });
            if (r.err) { bad.push(at + ': ' + r.err); continue; }
            if (!r.done) bad.push(at + ': ' + r.how + ' on the pad not counted');
            if (r.through) bad.push(at + ': touches pass through the dim on a practice card');
            await sleep(2200);
            const st = await state(page);
            if (st.step === at) bad.push(at + ': did not move on after the try'); else ok++;
        }
        /* untouched practice card still moves on by itself (hands-free) */
        await page.evaluate(() => { window.__clipMs = 300; window.LowiTutorial.start({ from: 'check', at: 'water-hold' }); });
        await sleep(400); await page.evaluate(() => { const o = document.querySelector('#ltTour'); o && o.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
        const t0 = Date.now(); let moved = false;
        while (Date.now() - t0 < 9000) { await sleep(300); if ((await state(page)).step !== 'water-hold') { moved = true; break; } }
        if (!moved) bad.push('water-hold: untouched, did not move on by itself');
        let shown = 0;
        for (const at of later) {
            await page.evaluate(a => { window.__clipMs = 60000; window.LowiTutorial.start({ from: 'check', at: a }); }, at);
            await sleep(500);
            const v = await page.evaluate(() => { const l = document.querySelector('#ltTour .lt-card .lt-later'); return l ? (getComputedStyle(l).display !== 'none' && l.getBoundingClientRect().height > 10) : false; });
            if (v) shown++; else bad.push(at + ': no after-the-tour motion');
        }
        const g = await state(page);
        const after = await page.evaluate(() => localStorage.getItem('lowispike.v2'));
        if (JSON.parse(after || '{}').logs + '' !== JSON.parse(before || '{}').logs + '') bad.push('app logs changed');
        if (g.gum || g.cam) bad.push('camera/mic asked ' + g.gum + ', scanner ' + g.cam);
        if (page.errs.length) bad.push('page errors: ' + page.errs.slice(0, 3).join(' | '));
        bad.forEach(b => fails.push(tag + ': ' + b));
        lines.push(`${tag}: ${ok}/${ids.length} practice cards took the gesture and moved on; untouched one moved on ${moved ? 'by itself' : 'NOT'}; ${shown}/${later.length} later cards show the motion`);
        await page.evaluate(() => { window.__clipMs = 60000; window.LowiTutorial.start({ from: 'check', at: 'voice' }); }); await sleep(900);
        await page.screenshot({ path: path.join(OUT, `${engine}-${dev.replace(/\W+/g, '_')}-practice-voice.png`) });
        await page.evaluate(() => { window.LowiTutorial.start({ from: 'check', at: 'chat' }); }); await sleep(1500);
        await page.screenshot({ path: path.join(OUT, `${engine}-${dev.replace(/\W+/g, '_')}-later-chat.png`) });
    } finally { await ctx.close(); }
}

(async () => {
    if (!pw) { console.log('playwright not found (set PW=/path/to/node_modules/playwright)'); process.exit(2); }
    fs.mkdirSync(OUT, { recursive: true });
    let url = arg('url', ''), srv = null;
    if (!url) { srv = await serve(); url = srv.url; }
    const fails = [], lines = [];
    for (const engine of arg('engines', 'webkit').split(',')) {
        const browser = await pw[engine].launch();
        try {
            const only = arg('only', 'ABCDEF');   /* --only EF runs parts E and F */
            if (only.includes('B')) await scanResume(browser, engine, 'iPhone SE', url, fails, lines);
            if (only.includes('C')) await pause(browser, engine, 'iPhone 13', url, fails, lines);
            if (only.includes('D')) await camera(browser, engine, 'iPhone 13', url, fails, lines);
            if (only.includes('E')) for (const lang of ['en', 'de', 'es']) await layout(browser, engine, 'iPhone SE', lang, url, fails, lines);
            if (only.includes('F')) await practice(browser, engine, 'iPhone 13', url, fails, lines);
            if (only.includes('A') && arg('full', '1') !== '0') await full(browser, engine, 'iPhone 13', url, fails, lines);
        } finally { await browser.close(); }
        lines.forEach(l => console.log(l)); lines.length = 0;
    }
    if (srv) srv.s.close();
    fails.forEach(f => console.log('FAIL ' + f));
    console.log(fails.length ? `FAIL (${fails.length})` : 'ALL OK');
    process.exit(fails.length ? 1 : 0);
})();
