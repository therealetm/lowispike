'use strict';
/* Tutorial speaker button layout check (item 39, 22 Oct 2026): node tools/tutorial-voice-btn/layout-check.cjs [--url URL] [--out DIR] [--quick]
   Emmanuel: "The microphone looks weird and to big fix it." "Move the speaker to the right where it's empty."
   On simulated iPhone SE, iPhone 13, iPhone 15 (WebKit) and Pixel 7 (Chromium), day and night theme, it walks every tutorial card
   (Next, Next, ...) and checks on each one that the speaker button:
   - sits in the card's top-right area (its circle's right edge on the card's right padding, in the top row, right half),
   - stays small (visible circle <= 34 px, glyph <= 20 px) with a tap area of at least 44 x 44,
   - overlaps nothing: companion picture, step count, title, body text, Skip all (its tap area included),
   - the title is never cut (long titles wrap before the button).
   First, on card 1, it turns the speaker on and off and checks both states (waves shown, x hidden, aria-pressed). Screenshots of cards 8 and 24 (the cards in
   his photos) and of the on state go to --out. --quick: cards 1 to 30 only. No real backend: the app's startup stub (tools/startup)
   answers every server call. Prints one line per run and ALL OK / FAIL. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, '/tmp/pw/node_modules/playwright', path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(path.join(__dirname, '..', '..')), OUT = path.resolve(arg('out', '/tmp/tutorial-voice-btn-out')), QUICK = A.includes('--quick');
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
const PRE = (lang, theme) => `(() => { try {
  if (!sessionStorage.getItem('tvb')) { sessionStorage.setItem('tvb', '1');
  localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Tester', bday: '1990-03-05', tags: [] }, xp: 1254, ledger: [], logs: [], saved: [], settings: { lang: '${lang}' } }));
  localStorage.setItem('lowispike.companion.v1', JSON.stringify({ v: 1, bday: '1990-03-05', btime: '07:45', n: 0, name: 'Misty', created: 1 }));
  localStorage.setItem('lowi.hint.communityHold', '1'); localStorage.setItem('lowispike.lang', '${lang}'); localStorage.removeItem('lowi.tutorial.voice.v1');
  localStorage.setItem('lowi.theme', '${theme}'); }
} catch (e) { } })();`;

/* measured in the page, on the current card */
const MEASURE = () => {
    const card = document.querySelector('#ltTour .lt-card'); if (!card) return { err: 'no card' };
    const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    const cs = getComputedStyle(card), padR = parseFloat(cs.paddingRight) || 0;
    const b = card.querySelector('.lt-speak'), c = b && b.querySelector('.lt-spk'), g = b && b.querySelector('svg');
    if (!b || !c || !g) return { err: 'no speaker button' };
    const top = card.querySelector('.lt-top');
    const parts = { guide: R(card.querySelector('.lt-guide')), count: R(card.querySelector('.lt-count')), title: R(card.querySelector('#ltTitle')),
        text: R(card.querySelector('#ltText')), skipall: R(card.querySelector('[data-lt="skipall"]')) };
    const ov = (a, z) => a && z && Math.min(a.r, z.r) - Math.max(a.l, z.l) > 0.5 && Math.min(a.b, z.b) - Math.max(a.t, z.t) > 0.5;
    const btn = R(b), circ = R(c), glyph = R(g), cr = R(card), tr = R(top);
    const t = card.querySelector('#ltTitle');
    return {
        step: window.LowiTutorial && window.LowiTutorial.step(), btn, circ, glyph, side: R(card.querySelector('.lt-side')), skip: parts.skipall, card: cr, padR, top: tr, meta: R(card.querySelector('.lt-meta')), sideCss: (e => e && [getComputedStyle(e).marginRight, getComputedStyle(e).width])(card.querySelector('.lt-side')),
        inTop: !!b.closest('.lt-top'), guideIsBtn: card.querySelector('.lt-guide') && card.querySelector('.lt-guide').tagName === 'BUTTON',
        rightGap: tr.r - circ.r,   /* the top row's right edge = the card's right padding (a headless scrollbar can narrow it; real iPhones overlay theirs) */ topGap: circ.t - cr.t, inTopRow: circ.b <= tr.b + 4, rightHalf: circ.l > cr.l + cr.w / 2,
        over: Object.keys(parts).filter(k => ov(circ, parts[k]) || (k !== 'skipall' ? ov(btn, parts[k]) : ov(btn, parts[k]))),
        cut: t && t.scrollWidth > t.clientWidth + 1 ? t.textContent : '', title: t ? t.textContent : '', titleH: parts.title && parts.title.h,
        on: b.classList.contains('lt-spk-on'), pressed: b.getAttribute('aria-pressed'),
        waves: getComputedStyle(b.querySelector('.lt-wave1')).display !== 'none', slash: getComputedStyle(b.querySelector('.lt-slash')).display !== 'none',
        n: (document.querySelector('#ltTour .lt-count') || {}).textContent || ''
    };
};

async function run(browser, engine, dev, lang, theme, url, fails, log) {
    const tag = `${engine}/${dev}/${lang}/${theme}`, bad = m => fails.push(tag + ': ' + m);
    const ctx = await browser.newContext(Object.assign({}, pw.devices[dev], { colorScheme: theme === 'light' ? 'light' : 'dark', serviceWorkers: 'block' }));
    await ctx.addInitScript(PRE(lang, theme)); await ctx.addInitScript('(' + INIT_SRC + ')()');
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e.message || e)));
    await page.goto(url + '?tvb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('[data-orbit]') && window.LowiTutorial && window.LowiTutorialVoice, null, { timeout: 45000 }).catch(() => { });
    await sleep(3000);
    const th = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    if (th !== theme) bad('theme is ' + th);
    await page.evaluate(() => { document.querySelectorAll('[aria-modal="true"]').forEach(d => { if (!d.closest('#ltTour')) d.remove(); }); window.LowiTutorial.start({ from: 'check' }); });
    await page.waitForSelector('#ltTour:not(.lt-held) .lt-speak', { timeout: 8000 }).catch(() => { });
    await sleep(1200);
    const slug = `${engine}-${dev.replace(/\W+/g, '')}-${lang}-${theme}`;
    /* on state */
    {   /* on card 1, before the walk: on, then off again (on, it would read and move on by itself) */
        await page.click('#ltTour .lt-speak').catch(() => { }); await sleep(500);
        const m = await page.evaluate(MEASURE);
        if (m.err) bad('on: ' + m.err); else {
            if (!m.on || m.pressed !== 'true' || !m.waves || m.slash) bad('on state wrong ' + JSON.stringify({ on: m.on, pressed: m.pressed, waves: m.waves, slash: m.slash }));
            if (m.circ.w > 34.5 || m.over.length) bad('on: size/overlap ' + Math.round(m.circ.w) + ' ' + m.over.join(','));
        }
        await page.screenshot({ path: path.join(OUT, `${slug}-on.png`) });
        await page.click('#ltTour .lt-speak').catch(() => { }); await sleep(200);
        const o = await page.evaluate(MEASURE);
        if (!o.err && (o.on || !o.slash || o.waves)) bad('off state wrong');
    }
    let seen = 0, maxCirc = 0, longest = '', stuck = 0, last = '';
    const limit = QUICK ? 30 : 80;
    for (let k = 0; k < limit; k++) {
        await page.waitForSelector('#ltTour:not(.lt-held) .lt-card .lt-speak', { timeout: 6000 }).catch(() => { });
        await sleep(380);   /* card slide-in settles */
        const m = await page.evaluate(MEASURE);
        if (m.err) { if (++stuck > 3) { bad('card ' + (k + 1) + ': ' + m.err); break; } await sleep(800); k--; continue; }
        if (m.step === last) { if (++stuck > 4) { bad('stuck on ' + m.step); break; } } else { stuck = 0; seen++; }
        last = m.step;
        const where = `${m.n} (${m.step})`;
        if (!m.inTop) bad(where + ': speaker not in the top row');
        if (m.guideIsBtn) bad(where + ': companion picture is still a button');
        if (m.btn.w < 43.5 || m.btn.h < 43.5) bad(where + ': tap area ' + Math.round(m.btn.w) + 'x' + Math.round(m.btn.h));
        if (m.circ.w > 34.5 || m.circ.h > 34.5) bad(where + ': circle too big ' + Math.round(m.circ.w));
        if (m.glyph.w > 20.5 || m.glyph.h > 20.5) bad(where + ': glyph too big ' + Math.round(m.glyph.w));
        if (Math.abs(m.rightGap) > 3) bad(where + ': not on the right padding (gap ' + m.rightGap.toFixed(1) + ') ' + JSON.stringify({ card: [m.card.l, m.card.r], padR: m.padR, side: m.side && [m.side.l, m.side.r], skip: m.skip && [m.skip.l, m.skip.r], btn: [m.btn.l, m.btn.r], top: [m.top.l, m.top.r], meta: m.meta && [m.meta.l, m.meta.r], css: m.sideCss }));
        if (!m.rightHalf || !m.inTopRow || m.topGap > 110) bad(where + ': not in the top-right area (top ' + Math.round(m.topGap) + ')');
        if (m.over.length) bad(where + ': overlaps ' + m.over.join(', '));
        if (m.cut) bad(where + ': title cut "' + m.cut + '"');
        maxCirc = Math.max(maxCirc, m.circ.w); if (m.title.length > longest.length) longest = m.title;
        const num = parseInt((m.n.match(/(\d+)\s+\D+\s+\d+/) || [])[1], 10);
        if (num === 8 || num === 24 || num === 1) await page.screenshot({ path: path.join(OUT, `${slug}-card${num}.png`) });
        const next = await page.$('#ltTour:not(.lt-held) [data-lt="next"]');
        if (!next) break;   /* claim or the last card */
        await next.click().catch(() => { });
        await page.waitForFunction(s => !window.LowiTutorial.isOn() || window.LowiTutorial.step() !== s, m.step, { timeout: 5000 }).catch(() => { });
        if (!(await page.evaluate(() => window.LowiTutorial.isOn()))) break;
    }
    if (seen < (QUICK ? 20 : 50)) bad('only ' + seen + ' cards walked');
    if (errs.length) bad('page errors: ' + errs.slice(0, 3).join(' | '));
    log.push(`${tag}: ${seen} cards, circle ${Math.round(maxCirc)} px, longest title "${longest}"`);
    await ctx.close();
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    let url = arg('url', ''), srv = null;
    if (!url) { srv = await serve(); url = srv.url; }
    const fails = [], log = [];
    const matrix = [
        ['webkit', 'iPhone SE', 'en', 'dark'], ['webkit', 'iPhone SE', 'de', 'light'], ['webkit', 'iPhone 13', 'en', 'dark'], ['webkit', 'iPhone 13', 'es', 'light'],
        ['webkit', 'iPhone 15', 'en', 'light'], ['chromium', 'Pixel 7', 'en', 'dark'], ['chromium', 'Pixel 7', 'de', 'light']
    ].filter(m => !arg('only', '') || m.join(':').includes(arg('only')));
    const browsers = {};
    for (const [engine, dev, lang, theme] of matrix) {
        browsers[engine] = browsers[engine] || await pw[engine].launch();
        try { await run(browsers[engine], engine, dev, lang, theme, url, fails, log); } catch (e) { fails.push(`${engine}/${dev}/${lang}/${theme}: crashed ${String(e.message).slice(0, 200)}`); }
    }
    for (const b of Object.values(browsers)) await b.close();
    if (srv) srv.s.close();
    log.forEach(l => console.log(l));
    fails.forEach(f => console.log('FAIL', f));
    console.log(fails.length ? 'FAIL ' + fails.length : 'ALL OK');
    process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
