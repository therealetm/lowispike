'use strict';
/* Oct 27 2026: layout probe for the iOS 17 catch-up redesign. Opens the catch-up as a signed-in fixture, walks to every view
   (bubble, choices, Something else, pop, read-back, finish) and prints, per view: every button's box, whether it is on screen,
   tappable at its centre and clear of the companion and its words, the font sizes, and the bar points vs the total.
   It also opens the read-back with the tutorial (first-run) hint state and with Reduce Motion.
     node tools/catchup-ios17/probe.cjs [--url URL] [--views iphone,se,ipad] [--langs de,en] [--reduce] [--fresh] [--out DIR]
   Exit 0 = no problem found. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(path.join(__dirname, '..', '..')), OUT = arg('out', '/tmp/catchup-ios17');
const REDUCE = process.argv.includes('--reduce'), FRESH = process.argv.includes('--fresh');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() {
    return new Promise(r => {
        const s = http.createServer((q, res) => {
            let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
            const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
            res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
        }).listen(0, '127.0.0.1', () => r(s));
    });
}
const VIEWS = {
    iphone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
    se: { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
    mini: { viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
    ipad: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
    ipadl: { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }
};
const INIT = fs.readFileSync(path.join(ROOT, 'tests', 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const MEASURE = () => {
    const ov = document.getElementById('ecOv'); if (!ov) return null;
    const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0'; };
    const say = ov.querySelector('.ec-say'), pal = ov.querySelector('.ec-pal');
    const covers = [say, pal].filter(vis);
    const box = r => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
    const btns = [...ov.querySelectorAll('button')].filter(b => vis(b) && !b.classList.contains('mic-btn')) /* the app-wide dictation mic is its own component */.map(b => {
        const r = b.getBoundingClientRect(), cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)), at = document.elementFromPoint(cx, cy);
        const lab = b.querySelector('.ec-opt-l, .ec-bname') || b;
        const cover = covers.some(e => { const q = e.getBoundingClientRect(); return q.left < r.right - 1 && q.right > r.left + 1 && q.top < r.bottom - 1 && q.bottom > r.top + 1; });
        return { ec: b.getAttribute('data-ec'), box: box(r), fs: parseFloat(getComputedStyle(lab).fontSize), hit: !!(at && (at === b || b.contains(at))), at: at && !(at === b || b.contains(at)) ? (at.className && at.className.baseVal == null ? String(at.className).slice(0, 40) : at.tagName) : '', cover, inView: r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1 };
    });
    const tot = ov.querySelector('.ec-total'), rows = [...ov.querySelectorAll('.ec-l-w')].map(e => { const lh = parseFloat(getComputedStyle(e).lineHeight) || 22; return { t: e.textContent, wrap: e.getBoundingClientRect().height > lh * 1.5, cut: e.scrollWidth > e.clientWidth + 1 }; });
    const top = ov.querySelector('.ec-top').getBoundingClientRect(), first = ov.querySelector('.ec-list li');
    const blockers = [...document.querySelectorAll('body *')].filter(e => { if (ov.contains(e) || !vis(e)) return false; const cs = getComputedStyle(e); if (cs.position !== 'fixed') return false; const z = parseInt(cs.zIndex, 10); return z > 2147483250; }).map(e => e.id || String(e.className).slice(0, 40));
    return { step: ov.getAttribute('data-back-step'), bar: (ov.querySelector('.ec-pts-n') || {}).textContent, total: tot ? tot.textContent : null, say: say ? say.textContent : '', sayBox: vis(say) ? box(say.getBoundingClientRect()) : null, palBox: vis(pal) ? box(pal.getBoundingClientRect()) : null,
        btns, rows, firstCut: first ? first.getBoundingClientRect().top < top.bottom - 1 : false, wide: document.documentElement.scrollWidth > innerWidth + 1, bg: getComputedStyle(ov).backgroundImage.slice(0, 60), blockers };
};
(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    let bad = 0;
    const ENGINE = arg('engine', 'chromium'), browser = ENGINE === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
    for (const v of arg('views', 'iphone,se,ipad').split(',')) for (const lang of arg('langs', 'de,en').split(',')) {
        const vv = Object.assign({}, VIEWS[v]); if (ENGINE === 'webkit') delete vv.isMobile;
        const ctx = await browser.newContext(Object.assign(vv, { serviceWorkers: 'block', reducedMotion: REDUCE ? 'reduce' : 'no-preference' }));
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(INIT);
        await ctx.addInitScript(([l, fresh]) => { try { const s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); s.settings = Object.assign({}, s.settings, { lang: l }); if (fresh) { s.tourDone = false; s.onboarded = true; s.hintsSeen = {}; } localStorage.setItem('lowispike.v2', JSON.stringify(s)); localStorage.setItem('lowi.lang', l); if (fresh) Object.keys(localStorage).filter(k => /hint|tour|tutorial|coach/i.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) { } }, [lang, FRESH]);
        const page = await ctx.newPage(), errs = [], P = [], out = {};
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        const m = async n => { await sleep(REDUCE ? 250 : 750); const r = await page.evaluate(MEASURE); out[n] = r; try { await page.screenshot({ path: `${OUT}/${v}-${lang}${REDUCE ? '-rm' : ''}${FRESH ? '-fresh' : ''}-${n}.png` }); } catch (e) { }
            if (!r) { P.push(n + ': not open'); return r; }
            r.btns.forEach(b => { if (!b.inView || !b.hit || b.cover || b.box[3] < 44 || b.fs < 13) P.push(n + ': button ' + b.ec + ' ' + JSON.stringify(b)); });
            if (r.wide) P.push(n + ': wider than screen'); if (r.firstCut && !/scrolled/.test(n)) P.push(n + ': first row cut off');
            r.rows.forEach(x => { if (x.wrap) P.push(n + ': row wraps ' + x.t); });
            const num = x => String(x || '').replace(/\D/g, ''); if (r.total != null && num(r.bar) !== num(r.total)) P.push(n + ': bar ' + r.bar + ' != total ' + r.total);
            if (r.blockers.length) P.push(n + ': something above the catch-up ' + r.blockers.join(','));
            return r; };
        const click = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel);
        try {
            await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
            await page.waitForFunction(() => window.LowiEveningCatchup && document.documentElement.classList.contains('wh-home'), null, { timeout: 150000, polling: 300 });
            await sleep(1500);
            await page.evaluate(l => { try { window.LowiLang && window.LowiLang.set && window.LowiLang.set(l); } catch (e) { } }, lang);
            await page.evaluate(() => window.LowiEveningCatchup.open()); await m('1-bubble');
            await click('#ecOv [data-ec="open"]'); await m('2-choices');
            await click('#ecOv [data-ec="other"]'); await m('3-other');
            await page.fill('#ecOv .ec-input', lang === 'de' ? 'Sweet potato with beef stew' : 'Sweet potato with beef stew'); await click('#ecOv [data-ec="add"]'); await sleep(150); await m('4-pop');
            for (let g = 0; g < 8; g++) { await page.waitForFunction(() => { const s = document.getElementById('ecOv').getAttribute('data-back-step'); return /^bubble|review/.test(s); }, null, { timeout: 8000 }); const s = await page.evaluate(() => document.getElementById('ecOv').getAttribute('data-back-step')); if (s === 'review') break; await click('#ecOv [data-ec="open"]'); await sleep(400); if (!(await click('#ecOv [data-ec="pick"]'))) await click('#ecOv [data-ec="skip"]'); await sleep(200); }
            await sleep(400); await m('5-review');
            await page.evaluate(() => { const s = document.querySelector('#ecOv .ec-stage'); s.scrollTop = s.scrollHeight; }); await m('5b-review-scrolled');
            await click('#ecOv [data-ec="save"]'); await sleep(1200); await m('6-finish');
        } catch (e) { P.push('error ' + e.message.slice(0, 300)); }
        if (errs.length) P.push('page errors: ' + errs.join(' | '));
        if (P.length) bad++;
        console.log((P.length ? 'FAIL ' : 'PASS ') + ENGINE + ' ' + v + ' ' + lang + (REDUCE ? ' reduce' : '') + (FRESH ? ' fresh' : '') + (P.length ? '\n  - ' + P.join('\n  - ') : ''));
        if (process.argv.includes('--dump')) console.log(JSON.stringify(out, null, 0).slice(0, 6000));
        await ctx.close();
    }
    await browser.close(); if (srv) srv.close();
    console.log(bad ? 'catchup-ios17 probe: ' + bad + ' view(s) with problems' : 'catchup-ios17 probe: all clear');
    process.exit(bad ? 1 : 0);
})();
