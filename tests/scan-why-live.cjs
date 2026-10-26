#!/usr/bin/env node
'use strict';
/* Browser proof for tests/scan-why.test.cjs (Oct 26 2026, Emmanuel on the scanner card: "Let's add a little graph in there ...
   Can I eat this every day? Every week? ... a Why button ... a simple explanation"). Opens the real app (signed-in, ring Home),
   opens the scanner and shows K-Classic almonds and a cola through LowiShopScan.show, in EN/DE/ES:
   - almonds read Lower at a 30 g handful, a tiny labelled curve, How often, a closed Why? that a tap opens
   - Details names where the amount came from; picking 50 g re-rates to Moderate ("every day at 30 g")
   - Reduce Motion: the curve does not animate; the card fits the width; no page errors
   Views: Playwright WebKit iPhone 13 (+ Reduce Motion) and iPhone SE. Emulation, not a real iPhone.
   Run: node tests/scan-why-live.cjs [--views w13,w13rm,wse,c390] [--langs en,de,es] [--shots DIR] */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), SHOTS = arg('shots', '');
const pw = require(process.env.PLAYWRIGHT_MODULE || '/tmp/pw/node_modules/playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
/* the same signed-in, onboarded, ring-Home profile the Home live tests use */
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const VIEWS = {
    w13: ['webkit', 'iPhone 13'], w13rm: ['webkit', 'iPhone 13', 'reduce'], wse: ['webkit', 'iPhone SE'], c390: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }]
};
const ALMONDS = { name: 'Mandeln Stifte', brand: 'K-Classic', barcode: '4337185000001', ingredients: 'Mandeln', facts: { s: 4, c: 4.1, f: 8, p: 26, fat: 55, kcal: 632 } };
const COLA = { name: 'Cola', brand: 'Test', barcode: '4000000000002', cat: 'drink', ingredients: 'Wasser, Zucker, Kohlensäure', facts: { s: 10.6, c: 10.6, drink: true, kcal: 42 } };
function probe() {
    const c = document.querySelector('#b3Cam .ss-card'); if (!c) return null;
    const q = s => c.querySelector(s), vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.display !== 'none' && !e.closest('[hidden]'); };
    const rect = e => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; };
    const wb = q('[data-ss="why"]'), cv = q('.ss-curve'), line = q('.ss-cline');
    const hit = e => { if (!e) return false; const r = e.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!h && (h === e || e.contains(h)); };
    return { word: q('.ss-vw') && q('.ss-vw').textContent, sub: q('.ss-vt small') && q('.ss-vt small').textContent, often: q('.ss-often') && q('.ss-often').textContent,
        cap: q('.ss-graph figcaption') && q('.ss-graph figcaption').textContent, curve: vis(cv) && rect(cv), why: wb && rect(wb), whyHit: hit(wb), whyText: wb && wb.textContent,
        open: !!(q('.ss-whyp') && vis(q('.ss-whyp'))), panel: q('.ss-whyp') && q('.ss-whyp').innerText, anim: line ? getComputedStyle(line).animationName : '',
        psrc: q('.ss-psrc') && q('.ss-psrc').innerText, clash: (() => { const ov = (a, b) => { if (!vis(a) || !vis(b)) return false; const x = a.getBoundingClientRect(), y = b.getBoundingClientRect(); return x.left < y.right - 1 && y.left < x.right - 1 && x.top < y.bottom - 1 && y.top < x.bottom - 1; }; return [ov(q('.ss-vt'), q('.ss-graph')) && 'word/graph', ov(q('.ss-often'), wb) && 'often/why', ov(q('.ss-vw'), q('.ss-vt small')) && 'word/sub'].filter(Boolean); })(), vh: q('.ss-verdict') && rect(q('.ss-verdict')), vw: innerWidth, overflowX: c.scrollWidth > c.clientWidth + 1, card: rect(c) };
}
(async () => {
    const srv = await serve(); const url = `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    const fails = [], log = (v, ok, what, d) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${v} ${what}${d ? ' ' + JSON.stringify(d) : ''}`); if (!ok) fails.push(v + ' ' + what); };
    for (const v of arg('views', 'w13,w13rm,wse').split(',')) for (const L of arg('langs', 'en,de,es').split(',')) {
        const [eng, dd, rm] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } : {});
        const dev = typeof dd === 'string' ? Object.assign({}, pw.devices[dd]) : Object.assign({}, dd);
        const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block' }, rm ? { reducedMotion: 'reduce' } : {}, eng === 'chromium' ? { permissions: ['camera'] } : {}));
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(INIT); await ctx.addInitScript(`try{localStorage.setItem('lowispike.lang','${L}')}catch(e){}`);
        const page = await ctx.newPage(), errs = [], tag = v + '/' + L;
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        try {
            await page.goto(url + '?tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('o8') && document.querySelector('[data-orbit="scan"]'), null, { timeout: 90000 });
            await sleep(4500);
            const sc = await page.evaluate(() => { const r = document.querySelector('[data-orbit="scan"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
            for (let i = 0; i < 3; i++) { await page.touchscreen.tap(sc[0], sc[1]); if (await page.waitForFunction(() => document.getElementById('b3Cam'), null, { timeout: 8000 }).then(() => true, () => false)) break; }
            await sleep(2000);
            /* the app's own path for a scanned product: LowiShopScan.show on the scanner (as index.html does after a barcode hit) */
            await page.evaluate(p => window.LowiShopScan.show(document.getElementById('b3Cam'), p, { ctx: 'scan' }), ALMONDS);
            await page.waitForFunction(() => document.querySelector('#b3Cam .ss-card .ss-vw'), null, { timeout: 8000 }); await sleep(900);
            let m = await page.evaluate(probe);
            if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `why-${v}-${L}-1card.png`) });
            const W = { en: ['Lower', 'Fine every day', 'Estimate, not a measurement', 'Why?'], de: ['Niedriger', 'Jeden Tag', 'Schätzung, keine Messung', 'Warum?'], es: ['Bajo', 'todos los días', 'Estimación, no una medición', '¿Por qué?'] }[L];
            log(tag, m && m.word === W[0], 'almonds read Lower at a 30 g handful', m && { word: m.word, sub: m.sub });
            log(tag, m && m.curve && m.curve.w >= 70 && m.curve.h >= 30 && m.cap === W[2], 'tiny curve, labelled', m && { curve: m.curve, cap: m.cap });
            log(tag, m && m.often && m.often.includes(W[1]), 'How often in words', m && m.often);
            log(tag, m && m.why && m.why.h >= 34 && m.whyHit && m.whyText === W[3] && !m.open, 'Why? closed, tappable, at least 34px', m && { why: m.why, hit: m.whyHit });
            log(tag, m && (rm ? m.anim === 'none' : m.anim === 'ss-draw'), rm ? 'Reduce Motion: curve does not animate' : 'curve draws in', m && m.anim);
            log(tag, m && !m.overflowX && m.card.r <= m.vw, 'card fits the width', m && m.card);
            log(tag, m && m.clash.length === 0 && m.vh.h <= 190, 'word, curve, How often and Why? do not overlap; verdict stays compact', m && { clash: m.clash, verdict: m.vh });
            await page.locator('#b3Cam [data-ss="why"]').tap(); await sleep(400);
            m = await page.evaluate(probe);
            if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `why-${v}-${L}-2why.png`) });
            log(tag, m && m.open && /30 g|1[.,]2 g/.test(m.panel), 'Why? opens a short plain explanation', m && m.panel);
            /* Details: the portion source line */
            const det = page.locator('#b3Cam .ss-more > summary');
            if (await det.count()) { await det.first().tap(); await sleep(600); }
            m = await page.evaluate(probe);
            if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `why-${v}-${L}-3details.png`), fullPage: false });
            log(tag, m && m.psrc && /30 g/.test(m.psrc), 'Details says where the amount came from', m && m.psrc);
            /* pick 50 g: the same tightened rule keeps almonds Moderate */
            const g50 = await page.evaluate(() => { const el = document.querySelector('#b3Cam .ss-por'); if (!el) return 'nopor'; el.dispatchEvent(new CustomEvent('lowi:portion', { bubbles: true, detail: { grams: 50 } })); return 'ok'; });
            await sleep(500); m = await page.evaluate(probe);
            log(tag, g50 === 'nopor' || (m && m.word === { en: 'Moderate', de: 'Mittel', es: 'Moderado' }[L] && /30 g/.test(m.often) && /50 g/.test(m.often)), '50 g of almonds: Moderate, every day at 30 g', { g50, word: m && m.word, often: m && m.often, psrc: m && m.psrc });
            if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `why-${v}-${L}-4g50.png`) });
            await page.evaluate(p => window.LowiShopScan.show(document.getElementById('b3Cam'), p, { ctx: 'scan' }), COLA); await sleep(900);
            m = await page.evaluate(probe);
            log(tag, m && m.curve && /once a week|einmal pro Woche|una vez por semana/i.test(m.often || ''), 'cola: Higher, once a week at most', m && { word: m.word, often: m.often });
            if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `why-${v}-${L}-5cola.png`) });
            log(tag, errs.length === 0, 'no page errors', errs);
        } catch (e) { log(tag, false, 'run', e.message.slice(0, 300)); }
        await browser.close();
    }
    srv.close();
    console.log(fails.length ? `\n${fails.length} FAIL` : '\nALL PASS'); process.exit(fails.length ? 1 : 0);
})();
