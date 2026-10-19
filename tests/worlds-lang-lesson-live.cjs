'use strict';
/* Browser check (Oct 19, 2026, worlds playtest): switching the app language while a cell guide is mid-lesson re-says THE SAME
   lesson in the new language. It used to tear the guide down and build it again, which ran the arrival again: a second welcome
   back and the NEXT lesson, so the lesson being read was skipped (and remembered as told).
   Seeded returning visitor (lessons 1-2 told and confirmed) enters the liver; the arrival says welcome back + lesson 3; mid-line the
   language goes to German (LowiLang.set like Settings, or a language-picker tap): the guide stays, now shows lesson 3 in German,
   says nothing else, and lesson 4 is not marked told. Also: no line uses the old herb name ("Moss Leaf"); she is Misty.
     node tests/worlds-lang-lesson-live.cjs [--root DIR | --url URL] [--views iphone_chromium,iphone13_webkit] [--via set,click]
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/worlds-lang-shots'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'], ipad_landscape_webkit: ['webkit', IPAD], ipad_chromium: ['chromium', IPAD] };
/* the same local fixture session the Home ring check uses (no account, no network) */
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];


/* Seeded returning visitor in the liver: met every guide, lessons 1 and 2 told AND confirmed (so no "Remember?" question): the
   arrival says a welcome back plus lesson 3. */
const SEED = JSON.stringify({ v: 1, met: { liver: 1, heart: 1, lung: 1, brain: 1, pancreas: 1, gut: 1, muscle: 1 }, lastBack: -1, told: { liver: [1, 2] }, ok: { liver: [1, 2] }, since: { liver: 0 } });
const C = require('../region-pals-core.js'), A = require('../arrival-core.js');
(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host, WORLD = 'liver';
    const DE = C.lines(WORLD, 'de', A, ''), EN = C.lines(WORLD, 'en', A, '');
    let fail = 0;
    for (const v of arg('views', 'iphone_chromium,iphone13_webkit').split(',')) {
      for (const via of arg('via', 'set,click').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd);
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(INIT);
        await ctx.addInitScript(seed => { try { localStorage.setItem('lowi.guides.v1', seed); } catch (e) { } window.__rp = []; window.addEventListener('lowi:region-pal', e => window.__rp.push({ t: Math.round(performance.now()), line: e.detail.line, kind: e.detail.kind, text: e.detail.text })); }, SEED);
        const page = await ctx.newPage(), errs = [], P = [], steps = { view: v, via };
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        try {
            await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiWorldRegions && window.LowiMistyFlight && window.LowiRegionPals, null, { timeout: 150000 }).catch(() => { });
            await sleep(+arg('wait', 5000));
            steps.build = await page.evaluate(() => fetch('version.json?tb=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => '?'));
            await page.evaluate(w => window.LowiWorldRegions.travel(w), WORLD);
            /* the arrival line: welcome back + lesson 3 (in-page polling: cheap on a slow software renderer) */
            await page.waitForFunction(() => window.__rp.some(x => x.line === 3), null, { timeout: 240000, polling: 200 }).catch(() => { });
            const before = await page.evaluate(() => window.__rp.slice());
            const l3 = before.find(x => x.line === 3);
            if (!l3) { P.push('never said lesson 3 on arrival: ' + JSON.stringify(before.map(x => x.line + ' ' + x.text.slice(0, 40)))); throw new Error('skip'); }
            if (l3.text.indexOf(EN[3]) < 0) P.push('arrival line is not lesson 3 in English');
            await sleep(1200);
            /* mid-lesson: switch to German, through LowiLang.set (Settings) or a language-picker tap */
            const n0 = await page.evaluate(() => window.__rp.length);
            if (via === 'click') await page.evaluate(() => { const b = document.createElement('button'); b.setAttribute('data-lang', 'de'); b.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px'; document.body.appendChild(b); b.click(); b.remove(); });
            else await page.evaluate(() => window.LowiLang.set('de'));
            await sleep(+arg('after', 3000));
            const now = await page.evaluate(() => { const p = document.getElementById('rpPal'); const t = p && p.querySelector('.rp-tx'); return { lang: document.documentElement.lang, on: !!(p && p.isConnected), talk: !!(p && p.classList.contains('rp-talk')), text: t ? t.textContent : '', tap: p ? (p.querySelector('.rp-say > small') || {}).textContent : '', mem: JSON.parse(localStorage.getItem('lowi.guides.v1') || '{}') }; });
            const after = await page.evaluate(n => window.__rp.slice(n), n0);
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-${via}.png` });
            steps.lang = now.lang; steps.text = now.text.slice(0, 90); steps.after = after.map(x => x.line + ' ' + x.kind + ' ' + x.text.slice(0, 50));
            if (now.lang !== 'de') P.push('language did not switch: ' + now.lang);
            if (!now.on) P.push('the guide disappeared after the switch');
            else if (!now.talk) P.push('the guide went quiet: the lesson being read was dropped');
            else if (now.text.indexOf(DE[3]) < 0) P.push('not lesson 3 in German after the switch: ' + now.text.slice(0, 120));
            const other = after.filter(x => x.line !== 3);
            if (other.length) P.push('said other lines right after the switch (lesson skipped / welcome back again): ' + JSON.stringify(other.map(x => x.line + ' ' + x.text.slice(0, 50))));
            if (C.BACK[0].concat(C.BACK[1]).some(b => after.filter(x => x.text.indexOf(b) === 0).length > 1)) P.push('welcome back said twice');
            const told = (now.mem.told && now.mem.told.liver) || [];
            if (told.indexOf(4) >= 0) P.push('lesson 4 remembered as told although it was never shown: ' + JSON.stringify(told));
            if (now.tap && /tap|Tap/.test(now.tap) && !/Tipp|tipp/.test(now.tap)) P.push('tap hint still English: ' + now.tap);
            /* her name in the guide's lines: Misty (no companion of her own), never the old herb identity name */
            const all = await page.evaluate(() => window.__rp.map(x => x.text));
            const bad = all.filter(t => /Moss Leaf|Moss Moon|Moss Star|Moss Dew|Moss Ray/.test(t));
            if (bad.length) P.push('the guide used the herb name: ' + bad[0].slice(0, 100));
        } catch (e) { if (e.message !== 'skip') P.push('threw ' + e.message.slice(0, 200)); }
        if (errs.length) P.push('page errors: ' + errs.join(' / '));
        console.log(JSON.stringify(Object.assign(steps, { problems: P })));
        if (P.length) fail++;
        await browser.close();
      }
    }
    if (srv) srv.close();
    process.exit(fail ? 1 : 0);
})();
