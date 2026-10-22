'use strict';
/* Tutorial speaker check: node tools/tutorial-voice/check.cjs [--url LIVE_URL] [--out DIR] [--engines chromium,webkit]
   Per device (iPhone SE, iPhone 13, iPad) and language: opens the tutorial, checks the speaker (the companion picture) is on the card
   and overlaps no other button, taps it, waits until a recorded clip really plays and the highlighted word moves on, taps Next (the
   next card reads itself), mutes, turns on again, Back, then Skip all (the voice stops at once), and after a reload that the choice
   is remembered. Prints one line per run and ALL OK / FAIL. Screenshots go to --out. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, '/tmp/pw/node_modules/playwright', path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(path.join(__dirname, '..', '..')), OUT = path.resolve(arg('out', '/tmp/tutorial-voice-out'));
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
  if (!sessionStorage.getItem('tvc')) { sessionStorage.setItem('tvc', '1');
  localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Tester', bday: '1990-03-05', tags: [] }, xp: 1254, ledger: [], logs: [], saved: [], settings: { lang: '${lang}' } }));
  localStorage.setItem('lowispike.companion.v1', JSON.stringify({ v: 1, bday: '1990-03-05', btime: '07:45', n: 0, name: 'Misty', created: 1 }));
  localStorage.setItem('lowi.hint.communityHold', '1'); localStorage.setItem('lowispike.lang', '${lang}'); localStorage.removeItem('lowi.tutorial.voice.v1'); }
} catch (e) { } })();`;

async function run(browser, engine, dev, lang, url, fails, shots) {
    const tag = `${engine}/${dev}/${lang}`;
    const ctx = await browser.newContext(Object.assign({}, pw.devices[dev], { colorScheme: 'dark', serviceWorkers: 'block' }));
    await ctx.addInitScript(PRE(lang)); await ctx.addInitScript('(' + INIT_SRC + ')()');
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e.message || e)));
    const bad = m => { fails.push(tag + ': ' + m); };
    const open = async () => {
        await page.goto(url + '?tv=' + Date.now(), { waitUntil: 'load' });
        await page.waitForFunction(() => document.querySelector('[data-orbit]') && window.LowiTutorial && window.LowiTutorialVoice, null, { timeout: 45000 }).catch(() => { });
        await sleep(3500);
        await page.evaluate(() => { document.querySelectorAll('[aria-modal="true"]').forEach(d => { if (!d.closest('#ltTour')) d.remove(); }); window.LowiTutorial.start({ from: 'check' }); });
        await page.waitForSelector('#ltTour:not(.lt-held) .lt-speak', { timeout: 8000 }).catch(() => { });
        await sleep(1500);   /* fonts settle */
    };
    await open();
    const st = () => page.evaluate(() => { const V = window.LowiTutorialVoice, b = document.querySelector('#ltTour .lt-speak'); return { step: window.LowiTutorial.step(), on: V.isOn(), playing: V.playing(), how: V.how(), paused: V.paused(), word: V.word(), pressed: b && b.getAttribute('aria-pressed'), label: b && b.getAttribute('aria-label'), tour: !!document.querySelector('#ltTour:not(.lt-out)') }; });
    /* layout: the speaker and every card button on screen, at least 44 px, none on top of another */
    const lay = await page.evaluate(() => {
        const card = document.querySelector('#ltTour .lt-card'); if (!card) return { err: 'no card' };
        /* only buttons that are shown: Pause stays display:none until the voice is on (tutorial.css .lt-pause) and has no box */
        const bs = [...card.querySelectorAll('button')].filter(b => b.getClientRects().length > 0).map(b => { const r = b.getBoundingClientRect(); return { c: b.className, l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; });
        const sp = bs.find(b => /lt-speak/.test(b.c)); if (!sp) return { err: 'no speaker button' };
        const badge = card.querySelector('.lt-spk').getBoundingClientRect();
        const over = []; for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i], b = bs[j]; const x = Math.min(a.r, b.r) - Math.max(a.l, b.l), y = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (x > 0.5 && y > 0.5) over.push(a.c + ' x ' + b.c); }
        const off = bs.filter(b => b.l < 0 || b.t < 0 || b.r > innerWidth || b.b > innerHeight).map(b => b.c);
        const small = bs.filter(b => b.w < 43.5 || b.h < 43.5).map(b => b.c + ' ' + Math.round(b.w) + 'x' + Math.round(b.h));
        const t = document.querySelector('#ltTitle'), x = document.querySelector('#ltText');
        const clipped = [t, x].filter(e => e && e.scrollWidth > e.clientWidth + 1).map(e => e.id + ' ' + e.scrollWidth + '/' + e.clientWidth + ' "' + e.textContent + '" meta ' + Math.round(e.parentElement.getBoundingClientRect().width));
        return { sp: [Math.round(sp.w), Math.round(sp.h)], badge: [Math.round(badge.width)], over, off, small, clipped, vw: innerWidth };
    });
    if (lay.err) bad(lay.err); else {
        if (lay.over.length) bad('overlap ' + lay.over.join(', '));
        if (lay.off.length) bad('off screen ' + lay.off.join(', '));
        if (lay.small.length) bad('too small ' + lay.small.join(', '));
        if (lay.clipped.length) bad('text cut ' + lay.clipped.join(', '));
    }
    const s0 = await st();
    if (s0.on || s0.pressed !== 'false') bad('sound should start off ' + JSON.stringify(s0));
    if (shots) await page.screenshot({ path: path.join(OUT, `${engine}-${dev.replace(/\W+/g, '')}-${lang}-0-off.png`) });
    /* 1: tap the speaker: a recorded clip plays and the lit word moves on */
    await page.click('#ltTour .lt-speak');
    await page.waitForFunction(() => window.LowiTutorialVoice.playing() && !window.LowiTutorialVoice.paused(), null, { timeout: 10000 }).catch(() => { });
    const s1 = await st();
    if (!s1.on || s1.pressed !== 'true') bad('speaker did not turn on ' + JSON.stringify(s1));
    if (!s1.playing || s1.how !== 'file') bad('recorded clip not playing ' + JSON.stringify(s1));
    const seen = new Set(); for (let k = 0; k < 10; k++) { const w = await page.evaluate(() => window.LowiTutorialVoice.word()); if (w) seen.add(w); await sleep(250); }
    if (seen.size < 3) bad('highlight did not follow the voice (' + [...seen].join('|') + ')');
    if (shots) await page.screenshot({ path: path.join(OUT, `${engine}-${dev.replace(/\W+/g, '')}-${lang}-1-talking.png`) });
    /* 2: Next: the next card reads itself */
    await page.click('#ltTour [data-lt="next"]');
    await page.waitForFunction(s => window.LowiTutorial.step() !== s && window.LowiTutorialVoice.playing() && !window.LowiTutorialVoice.paused(), s1.step, { timeout: 10000 }).catch(() => { });
    const s2 = await st();
    if (s2.step === s1.step || !s2.playing || s2.how !== 'file') bad('next card did not read itself ' + JSON.stringify(s2));
    /* 3: mute: silent at once; on again: plays */
    await page.click('#ltTour .lt-speak'); await sleep(150);
    const s3 = await st();
    if (s3.on || s3.playing || !s3.paused) bad('mute did not stop ' + JSON.stringify(s3));
    await page.click('#ltTour .lt-speak');
    await page.waitForFunction(() => window.LowiTutorialVoice.playing() && !window.LowiTutorialVoice.paused(), null, { timeout: 10000 }).catch(() => { });
    const s4 = await st(); if (!s4.playing) bad('turning on again did not play ' + JSON.stringify(s4));
    /* 4: Back reads the card before */
    await page.click('#ltTour [data-lt="back"]');
    await page.waitForFunction(s => window.LowiTutorial.step() === s && window.LowiTutorialVoice.playing() && !window.LowiTutorialVoice.paused(), s1.step, { timeout: 10000 }).catch(() => { });
    const s5 = await st(); if (s5.step !== s1.step || !s5.playing) bad('back did not read ' + JSON.stringify(s5));
    /* 5: Skip all: the voice stops at once */
    await page.click('#ltTour [data-lt="skipall"]'); await sleep(120);
    const s6 = await st(); if (s6.playing || !s6.paused) bad('skip all did not stop the voice ' + JSON.stringify(s6));
    await sleep(1500); const s6b = await st(); if (!s6b.paused) bad('voice came back after skip all');
    /* 6: remembered after a reload */
    await open();
    const s7 = await st(); if (!s7.on || s7.pressed !== 'true') bad('speaker choice not remembered ' + JSON.stringify(s7));
    await page.evaluate(() => window.LowiTutorial.stop('check'));
    if (errs.length) bad('page errors: ' + errs.slice(0, 3).join(' | '));
    console.log('done', tag, JSON.stringify({ lay, words: [...seen].slice(0, 6), steps: [s1.step, s2.step], afterReload: { on: s7.on, playing: s7.playing, how: s7.how } }));
    await ctx.close();
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    let url = arg('url', ''), srv = null;
    if (!url) { srv = await serve(); url = srv.url; }
    const fails = [];
    const engines = arg('engines', 'webkit,chromium').split(',');
    let matrix = [['iPhone SE', 'en'], ['iPhone 13', 'en'], ['iPad (gen 7)', 'en'], ['iPhone SE', 'de'], ['iPhone SE', 'es']];
    if (arg('only', '')) matrix = matrix.filter(m => m.join(':') === arg('only'));
    for (const engine of engines) {
        const browser = await pw[engine].launch(engine === 'chromium' ? { args: ['--autoplay-policy=user-gesture-required'] } : {});
        for (const [dev, lang] of matrix) {
            if (engine === 'chromium' && dev !== 'iPhone 13') continue;
            try { await run(browser, engine, dev, lang, url, fails, true); } catch (e) { fails.push(`${engine}/${dev}/${lang}: crashed ${e.message.slice(0, 200)}`); }
        }
        await browser.close();
    }
    if (srv) srv.s.close();
    fails.forEach(f => console.log('FAIL', f));
    console.log(fails.length ? 'FAIL ' + fails.length : 'ALL OK');
    process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
