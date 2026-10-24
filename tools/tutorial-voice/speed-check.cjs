'use strict';
/* Tutorial voice speed pill check: node tools/tutorial-voice/speed-check.cjs [--url LIVE_URL] [--out DIR] [--engines chromium,webkit] [--only 'iPhone SE:de']
   Per device (iPhone SE, iPhone 13, iPad upright and sideways) and language: opens the tutorial, turns the speaker on, checks the speed
   pill (.lt-rate) shows only while the voice is on, is at least 44 px, on screen, and overlaps no button, the title or the text. Then
   taps it while a recorded clip plays: the same clip goes on (no restart) at 1.5x with preservesPitch, the label reads 1.5x (1,5x in de/es),
   then 2x, then 1x, then 1.5x again; Next: the next card plays at 1.5x; after a reload the 1.5x is remembered. Prints one line per run
   and ALL OK / FAIL. Screenshots go to --out. */
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
    const tag = `${engine}/${dev}/${lang}`, sd = `${engine}-${dev.replace(/\W+/g, '')}-${lang}`;
    const ctx = await browser.newContext(Object.assign({}, pw.devices[dev], { colorScheme: 'dark', serviceWorkers: 'block' }));
    await ctx.addInitScript(PRE(lang)); await ctx.addInitScript('(' + INIT_SRC + ')()');
    await ctx.addInitScript(`(() => { try { if (!sessionStorage.getItem('tvr')) { sessionStorage.setItem('tvr', '1'); localStorage.removeItem('lowi.tutorial.voice.rate.v1'); } } catch (e) { } })();`);
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e.message || e)));
    const bad = m => { fails.push(tag + ': ' + m); };
    const open = async () => {
        await page.goto(url + '?tv=' + Date.now(), { waitUntil: 'load' });
        await page.waitForFunction(() => document.querySelector('[data-orbit]') && window.LowiTutorial && window.LowiTutorialVoice, null, { timeout: 45000 }).catch(() => { });
        await sleep(3500);
        await page.evaluate(() => { document.querySelectorAll('[aria-modal="true"]').forEach(d => { if (!d.closest('#ltTour')) d.remove(); }); window.LowiTutorial.start({ from: 'check' }); });
        await page.waitForSelector('#ltTour:not(.lt-held) .lt-speak', { timeout: 8000 }).catch(() => { });
        await sleep(1500);
    };
    const st = () => page.evaluate(() => { const V = window.LowiTutorialVoice, b = document.querySelector('#ltTour .lt-rate'), a = V.rate ? V : {};
        return { step: window.LowiTutorial.step(), on: V.isOn(), playing: V.playing(), how: V.how(), paused: V.paused(), rate: a.rate && a.rate(), pr: a.playbackRate && a.playbackRate(), t: a.clipTime && a.clipTime(),
            shown: !!(b && b.getClientRects().length), label: b && b.textContent, aria: b && b.getAttribute('aria-label'), stored: localStorage.getItem('lowi.tutorial.voice.rate.v1') }; });
    const lay = () => page.evaluate(() => {
        const card = document.querySelector('#ltTour .lt-card'); if (!card) return { err: 'no card' };
        const box = e => { const r = e.getBoundingClientRect(); return { c: e.className || e.id, l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
        const bs = [...card.querySelectorAll('button')].filter(b => b.getClientRects().length > 0).map(box);
        const rt = bs.find(b => /lt-rate/.test(b.c)); if (!rt) return { err: 'no speed pill' };
        const texts = ['#ltTitle', '#ltText'].map(s => document.querySelector(s)).filter(Boolean).map(box);
        const hit = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5;
        const over = []; for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) if (hit(bs[i], bs[j])) over.push(bs[i].c + ' x ' + bs[j].c);
        texts.forEach(t => bs.forEach(b => { if (hit(t, b)) over.push(b.c + ' x ' + t.c); }));
        const off = bs.filter(b => b.l < 0 || b.t < 0 || b.r > innerWidth || b.b > innerHeight).map(b => b.c);
        const cb = box(card); if (cb.l < 0 || cb.t < 0 || cb.r > innerWidth + 0.5 || cb.b > innerHeight + 0.5) off.push('card');
        const small = bs.filter(b => b.w < 43.5 || b.h < 43.5).map(b => b.c + ' ' + Math.round(b.w) + 'x' + Math.round(b.h));
        const ps = document.querySelector('#ltTour .lt-pause'); const pr = ps && ps.getClientRects().length ? box(ps) : null;
        const cs = getComputedStyle(card.querySelector('.lt-rate'));
        /* grow: how much taller the card is because of the pill (0 = it fits in the row next to Pause, nothing wraps) */
        const pe = card.querySelector('.lt-rate'), h1 = card.getBoundingClientRect().height; pe.style.setProperty('display', 'none', 'important');
        const grow = Math.round(h1 - card.getBoundingClientRect().height); pe.style.removeProperty('display');
        return { rate: [Math.round(rt.l), Math.round(rt.t), Math.round(rt.w), Math.round(rt.h)], besidePause: !!(pr && Math.abs(pr.t - rt.t) < 2 && rt.l >= pr.r), over, off, small, card: [Math.round(cb.w), Math.round(cb.h)], grow, row: [...card.querySelectorAll('.lt-btns button')].filter(b => b.getClientRects().length).map(b => (b.getAttribute('data-lt') || b.className.split(' ').pop()) + ':' + Math.round(b.getBoundingClientRect().width) + '@' + Math.round(b.getBoundingClientRect().top)).join(' ') + ' inner ' + Math.round(card.querySelector('.lt-btns').clientWidth), vw: innerWidth, vh: innerHeight, color: cs.color, border: cs.borderTopColor, font: cs.fontSize + ' ' + cs.fontWeight };
    });
    const R = x => (lang === 'en' ? String(x) : String(x).replace('.', ',')) + '\u00d7';
    await open();
    const s0 = await st(); if (s0.shown) bad('speed pill shows while the voice is off');
    await page.click('#ltTour .lt-speak');
    await page.waitForFunction(() => window.LowiTutorialVoice.playing() && !window.LowiTutorialVoice.paused(), null, { timeout: 10000 }).catch(() => { });
    await sleep(700);
    const s1 = await st();
    if (!s1.playing || s1.how !== 'file') bad('recorded clip not playing ' + JSON.stringify(s1));
    if (!s1.shown || s1.label !== R(1) || s1.pr !== 1) bad('pill should show 1x while talking ' + JSON.stringify(s1));
    const l1 = await lay();
    if (l1.err) bad(l1.err); else { if (l1.over.length) bad('overlap ' + l1.over.join(', ')); if (l1.off.length) bad('off screen ' + l1.off.join(', ')); if (l1.small.length) bad('too small ' + l1.small.join(', ')); if (!l1.besidePause) bad('pill not right after Pause ' + JSON.stringify(l1)); }
    if (shots) await page.screenshot({ path: path.join(OUT, `${sd}-1x.png`) });
    /* tap: same clip, faster, natural pitch */
    const t0 = s1.t; await page.click('#ltTour .lt-rate');
    const s2 = await st(); const w0 = Date.now();
    if (s2.rate !== 1.5 || s2.pr !== 1.5 || s2.label !== R(1.5) || s2.stored !== '1.5') bad('first tap should be 1.5x ' + JSON.stringify(s2));
    if (!(s2.t >= t0) || !s2.playing || s2.step !== s1.step) bad('clip restarted or stopped on speed change ' + JSON.stringify({ t0, s2 }));
    await sleep(1200); const s2b = await st(); const ratio = (s2b.t - s2.t) / ((Date.now() - w0) / 1000);
    if (s2b.playing && s2b.step === s1.step && ratio < 1.25) bad('clip not faster after tap, media/wall ' + ratio.toFixed(2));
    if (shots) await page.screenshot({ path: path.join(OUT, `${sd}-1_5x.png`) });
    const l2 = await lay(); if (!l2.err && (l2.over.length || l2.off.length || l2.rate[2] !== l1.rate[2])) bad('layout changed at 1.5x ' + JSON.stringify(l2));
    await page.click('#ltTour .lt-rate'); const s3 = await st(); if (s3.rate !== 2 || s3.pr !== 2 || s3.label !== R(2) || s3.stored !== '2') bad('second tap should be 2x ' + JSON.stringify(s3));
    await page.click('#ltTour .lt-rate'); const s4 = await st(); if (s4.rate !== 1 || s4.pr !== 1 || s4.label !== R(1) || s4.stored !== '1') bad('third tap should be back to 1x ' + JSON.stringify(s4));
    await page.click('#ltTour .lt-rate'); const s5 = await st(); if (s5.rate !== 1.5 || s5.pr !== 1.5) bad('fourth tap should be 1.5x again ' + JSON.stringify(s5));
    /* Next: the next card reads itself at the chosen speed */
    await page.click('#ltTour [data-lt="next"]');
    await page.waitForFunction(s => window.LowiTutorial.step() !== s && window.LowiTutorialVoice.playing() && !window.LowiTutorialVoice.paused(), s1.step, { timeout: 10000 }).catch(() => { });
    await sleep(400);
    const s6 = await st(); if (s6.step === s1.step || !s6.playing || s6.pr !== 1.5 || s6.label !== R(1.5)) bad('next card not at 1.5x ' + JSON.stringify(s6));
    const l6 = await lay(); if (l6.err || l6.over.length || l6.off.length) bad('next card layout ' + JSON.stringify(l6));
    /* reload: remembered */
    await open();
    await page.waitForFunction(() => window.LowiTutorialVoice.isOn(), null, { timeout: 5000 }).catch(() => { });
    /* the speaker is remembered as on; a page load cannot play sound by itself, so tap until this card is read (a tap while on can mute) */
    for (let k = 0; k < 2; k++) {
        if (await page.evaluate(() => window.LowiTutorialVoice.playing() && !window.LowiTutorialVoice.paused())) break;
        await page.click('#ltTour .lt-speak').catch(() => { });
        await page.waitForFunction(() => window.LowiTutorialVoice.playing() && !window.LowiTutorialVoice.paused(), null, { timeout: 6000 }).catch(() => { });
    }
    const s7 = await st(); if (s7.rate !== 1.5 || !s7.shown || !s7.playing || s7.label !== R(1.5) || s7.pr !== 1.5) bad('speed not remembered after reload ' + JSON.stringify(s7));
    await page.evaluate(() => window.LowiTutorial.stop('check'));
    if (errs.length) bad('page errors: ' + errs.slice(0, 3).join(' | '));
    console.log('done', tag, JSON.stringify({ lay: l1, ratio: +ratio.toFixed(2), labels: [s1.label, s2.label, s3.label, s4.label], next: [s6.step, s6.pr], reload: [s7.on, s7.playing, s7.rate, s7.pr] }));
    await ctx.close();
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    let url = arg('url', ''), srv = null;
    if (!url) { srv = await serve(); url = srv.url; }
    const fails = [];
    const engines = arg('engines', 'chromium,webkit').split(',');
    let matrix = [['iPhone SE', 'en'], ['iPhone SE', 'de'], ['iPhone SE', 'es'], ['iPhone 13', 'en'], ['iPhone 13', 'de'], ['iPad (gen 7)', 'en'], ['iPad (gen 7) landscape', 'de']];
    if (arg('only', '')) matrix = matrix.filter(m => m.join(':') === arg('only'));
    for (const engine of engines) {
        const browser = await pw[engine].launch(engine === 'chromium' ? { args: ['--autoplay-policy=user-gesture-required'] } : {});
        for (const [dev, lang] of matrix) {
            try { await run(browser, engine, dev, lang, url, fails, true); } catch (e) { fails.push(`${engine}/${dev}/${lang}: crashed ${e.message.slice(0, 200)}`); }
        }
        await browser.close();
    }
    if (srv) srv.s.close();
    fails.forEach(f => console.log('FAIL', f));
    console.log(fails.length ? 'FAIL ' + fails.length : 'ALL OK');
    process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
