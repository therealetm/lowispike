'use strict';
/* Tutorial visuals check (item 42, Oct 22 2026): node tools/tutorial-show/check.cjs [--url URL] [--out DIR] [--runs engine:device:lang,...]
   Simulated phones, audio stubbed (every clip ends after 2.2 s), camera counted. Server, setup and stubs copied from
   tools/tutorial-voice/handsfree-check.cjs. Not a real iPhone. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, '/tmp/pw/node_modules/playwright', path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(path.join(__dirname, '..', '..')), OUT = path.resolve(arg('out', '/tmp/tutorial-show-out'));
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


/* the first section of the tour, hands-free (tap to start, speaker on): every card in SHOW gets its finger / spots / picture, the card
   stays on screen and off the spotlit control, no camera, no page errors; one screenshot per card */
async function section(browser, engine, dev, lang, url, fails, lines) {
    const tag = `${engine}/${dev}/${lang}`;
    const { ctx, page } = await newPage(browser, dev, lang);
    try {
        await boot(page, url);
        await page.waitForFunction(() => window.LowiTutorialShow, null, { timeout: 15000 }).catch(() => { });
        await page.evaluate(() => { window.__clipMs = 2200; document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); window.LowiTutorial.start({ from: 'check', at: 'hello' }); window.__seen = []; setInterval(() => { const x = window.LowiTutorial.step(); if (x && window.__seen[window.__seen.length - 1] !== x) window.__seen.push(x); }, 80); });
        const ids = await page.evaluate(() => window.LowiTutorialShow ? window.LowiTutorialShow.ids() : []);
        if (!ids.length) { fails.push(tag + ': tutorial-show.js did not load'); return; }
        const seen = {}; let t0 = Date.now(), last = '';
        while (Date.now() - t0 < 150000) {
            const s = await state(page);
            if (s.step && s.step !== last && ids.includes(s.step)) {
                last = s.step; await sleep(1300);
                const r = await page.evaluate(id => {
                    const P = window.LowiTutorialShow.plan(id), root = document.querySelector('#ltTour'), card = root && root.querySelector('.lt-card');
                    const rc = card.getBoundingClientRect(), hole = root.querySelector('.lt-hole'), rh = hole.getBoundingClientRect();
                    const hand = root.querySelector('.lts-hand'), hv = hand && getComputedStyle(hand).display !== 'none';
                    const hr = hand && hand.getBoundingClientRect();
                    const spots = [...root.querySelectorAll('.lts-spot')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.getBoundingClientRect());
                    const over = (a, b) => a.width > 2 && b.width > 2 && a.left < b.right - 4 && b.left < a.right - 4 && a.top < b.bottom - 4 && b.top < a.bottom - 4;
                    const busy = !!card.querySelector('.lt-pad, .lt-later, .lt-peek'), vEl = card.querySelector('.lts-vis'), chNo = rc.height - (vEl && getComputedStyle(vEl).display !== 'none' ? vEl.offsetHeight + 12 : 0);
                    const fitsWithout = rh.width > 4 && (rh.top - 24 >= chNo || innerHeight - rh.bottom - 24 >= chNo);
                    return { short: card.classList.contains('lts-short'), id, step: window.LowiTutorial.step(), wantVis: !!P.vis && !busy, hasVis: !!card.querySelector('.lts-vis[data-vis="' + P.vis + '"]'), wantHand: !!P.g, hand: !!hv,
                        handIn: !hv || (hr.left >= 0 && hr.top >= 0 && hr.left <= innerWidth && hr.top <= innerHeight), holeOn: rh.width > 4,
                        cardIn: rc.top >= 0 && rc.bottom <= innerHeight + 1 && rc.left >= 0 && rc.right <= innerWidth + 1,
                        fitsWithout, pos: [rc.left, rc.top, rc.right, rc.bottom].map(Math.round).join(','), covers: over(rc, rh), visShown: !!card.querySelector('.lts-vis') && getComputedStyle(card.querySelector('.lts-vis')).display !== 'none', spots: spots.length, spotsCovered: spots.filter(x => over(rc, x)).length, ch: Math.round(rc.height), vh: innerHeight };
                }, s.step);
                if (r.step !== s.step) { last = ''; continue; }
                /* the card slides 0.32 s (longer on a busy test machine): judge where it settles */
                if (!r.cardIn || (r.covers && r.visShown && r.fitsWithout)) { await sleep(1600); const again = await page.evaluate(() => { const c = document.querySelector('#ltTour .lt-card'), a = c.getBoundingClientRect(), h = document.querySelector('#ltTour .lt-hole').getBoundingClientRect(), v = c.querySelector('.lts-vis');
                    return { cardIn: a.top >= 0 && a.bottom <= innerHeight + 1 && a.left >= 0 && a.right <= innerWidth + 1, covers: h.width > 4 && a.left < h.right - 4 && h.left < a.right - 4 && a.top < h.bottom - 4 && h.top < a.bottom - 4, visShown: !!v && getComputedStyle(v).display !== 'none', pos: [a.left, a.top, a.right, a.bottom].map(Math.round).join(',') }; });
                    Object.assign(r, again); }
                seen[s.step] = r;
                await page.screenshot({ path: path.join(OUT, `${engine}-${dev.replace(/\W+/g, '_')}-${lang}-${s.step}.png`) });
                if (r.wantVis && !r.hasVis) fails.push(tag + ' ' + r.id + ': no card picture');
                if (r.wantHand && r.holeOn && !r.hand) fails.push(tag + ' ' + r.id + ': no finger on the spotlit control');
                if (!r.handIn) fails.push(tag + ' ' + r.id + ': finger off screen');
                if (!r.cardIn) fails.push(tag + ' ' + r.id + ': card not fully on screen (' + r.pos + ' in ' + r.vh + ')');
                if (r.covers && r.visShown && r.fitsWithout) fails.push(tag + ' ' + r.id + ': the card picture pushes the card over the spotlit control');
                if (r.id === 'bubbles' && r.spots < 4) fails.push(tag + ' bubbles: only ' + r.spots + ' bubbles lit');
            }
            if (s.step === 'scan' || s.step === 'scan-in' || (!s.on && Date.now() - t0 > 5000)) break;
            await sleep(150);
        }
        const st = await state(page);
        const log = await page.evaluate(() => window.__seen || []), missing = ids.filter(x => !log.includes(x));
        if (missing.length) fails.push(tag + ': cards not reached by themselves: ' + missing.join(', '));
        if (st.gum) fails.push(tag + ': the camera was asked for');
        if (page.errs.length) fails.push(tag + ': page errors: ' + page.errs.slice(0, 3).join(' | '));
        const sc = Object.values(seen);
        lines.push(`${tag}: ${ids.filter(x => log.includes(x)).length}/${ids.length} cards by themselves (${sc.length} measured), pictures ${sc.filter(x => x.hasVis).length}, fingers ${sc.filter(x => x.hand).length}, bubbles lit ${seen.bubbles ? seen.bubbles.spots : '-'}, text shortened to 3 lines ${sc.filter(x => x.short).length}, pictures folded away on a tight fit ${sc.filter(x => x.hasVis && !x.visShown).length}, cards over their control without a picture (as before) ${sc.filter(x => x.covers).length}, camera asks ${st.gum}, now on ${st.step}`);
    } finally { await ctx.close(); }
}
(async () => {
    if (!pw) { console.log('playwright not found'); process.exit(2); }
    fs.mkdirSync(OUT, { recursive: true });
    let url = arg('url', ''), srv = null;
    if (!url) { srv = await serve(); url = srv.url; }
    const fails = [], lines = [];
    const runs = (arg('runs', 'webkit:iPhone SE:en,webkit:iPhone 13:de,webkit:iPhone 15:es,chromium:Pixel 7:en')).split(',').map(x => x.split(':'));
    for (const [engine, dev, lang] of runs) {
        const browser = await pw[engine].launch();
        try { await section(browser, engine, dev, lang, url, fails, lines); } catch (e) { fails.push(`${engine}/${dev}: ${e.message}`); } finally { await browser.close(); }
    }
    if (srv) srv.s.close();
    lines.forEach(l => console.log(l));
    fails.forEach(f => console.log('FAIL ' + f));
    console.log(fails.length ? `FAIL (${fails.length})` : 'ALL OK');
    process.exit(fails.length ? 1 : 0);
})();
