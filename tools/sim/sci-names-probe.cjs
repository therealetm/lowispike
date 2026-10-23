'use strict';
/* Browser check for real science names in the cell worlds (Oct 23 2026, Emmanuel's tester: "When we enter a cellular world,
   it doesn't even say what cellular world we're entering ... the cell companion could have been named whatever the cell is").
   For every world: steer in, then record what is on screen: the world-name bubble (#bwrWorldName), the guide's first line
   and its accessible name, and the science tags (.bwr-sci). Screenshot per world: OUT/TAG-<view>-<world>.png.
     node tools/sim/sci-names-probe.cjs [--root DIR | --url URL] [--out DIR] [--tag T] [--views iphone_chromium] [--lang en]
       [--worlds brain,lung,...] [--expect 1]
   --expect 1: exit 1 unless every world shows its name bubble and the guide is named after its real cell. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), OUT = arg('out', '/tmp/sci-names'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], se_chromium: ['chromium', { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'], ipad_landscape_webkit: ['webkit', IPAD], ipad_chromium: ['chromium', IPAD] };
const INIT = fs.readFileSync(path.join(ROOT, 'tests', 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host, LANG = arg('lang', 'en');
    const WORLDS = arg('worlds', 'brain,lung,heart,liver,pancreas,gut,muscle').split(',');
    let fail = 0; const report = [];
    for (const v of arg('views', 'iphone_chromium').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd);
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(INIT);
        await ctx.addInitScript(l => { try { localStorage.setItem('lowi.lang', l); localStorage.setItem('lowispike.lang', l); } catch (e) { } window.__rp = []; window.__wn = []; window.addEventListener('lowi:region-pal', e => window.__rp.push(e.detail.text)); }, LANG);
        const page = await ctx.newPage(), errs = [];
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
        await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
        await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiWorldRegions && window.LowiMistyFlight && window.LowiRegionPals, null, { timeout: 90000 }).catch(() => { });
        await page.evaluate(l => { try { if (window.setLang) window.setLang(l); } catch (e) { } }, LANG);
        await sleep(4000);
        for (const w of WORLDS) {
            await page.evaluate(() => { window.__rp = []; });
            /* watch the name bubble while flying in: it may come and go */
            await page.evaluate(() => { window.__seen = []; clearInterval(window.__wt); window.__wt = setInterval(() => { const n = document.getElementById('bwrWorldName'); if (n && n.classList.contains('on')) { const t = n.innerText.replace(/\s+/g, ' ').trim(); if (window.__seen.indexOf(t) < 0) window.__seen.push(t); } const l = document.getElementById('bwrLabel'); if (l && l.classList.contains('on')) { const t = 'label:' + l.innerText.replace(/\s+/g, ' ').trim(); if (window.__seen.indexOf(t) < 0) window.__seen.push(t); } const q = document.querySelector('#whQuest, .daily-quest, .dq'); if (q && q.offsetParent) { const t = 'quest:' + q.innerText.replace(/\s+/g, ' ').trim().slice(0, 80); if (window.__seen.indexOf(t) < 0) window.__seen.push(t); } }, 120); });
            await page.evaluate(w => window.LowiWorldRegions.travel(w), w);
            const ok = await page.waitForFunction(w => { try { return window.LowiWorldRegions.current() === w && window.LowiMistyFlight.state().st === 'inside'; } catch (e) { return false; } }, w, { timeout: 60000 }).then(() => true).catch(() => false);
            await page.waitForFunction(() => window.__rp.length > 0, null, { timeout: 20000 }).catch(() => { });
            await sleep(1200);
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-${w}.png` });
            const r = await page.evaluate(() => {
                const pal = document.querySelector('.rpal, [class*="rpal"]');
                const sci = Array.from(document.querySelectorAll('.bwr-sci.on')).map(e => (e.classList.contains('open') ? 'OPEN ' : '') + (e.getAttribute('aria-label') || ''));
                return { seen: window.__seen.slice(), first: window.__rp[0] || '', palAria: pal ? (pal.getAttribute('aria-label') || '') : '', sci, top: (document.querySelector('.bw3-top b') || {}).textContent || '' };
            });
            r.world = w; r.view = v; r.inside = ok;
            r.vis = await page.evaluate(async (w) => { window.LowiWorldSci.showName(w); await new Promise(r => setTimeout(r, 900)); const out = []; let e = document.getElementById('bwrWorldName'); const b = e && e.getBoundingClientRect(); if (b) out.push('rect ' + [b.left, b.top, b.width, b.height].map(Math.round).join(',')); while (e && e !== document.documentElement) { const cs = getComputedStyle(e); if (cs.visibility !== 'visible' || +cs.opacity < 0.5 || cs.display === 'none' || cs.clipPath !== 'none') out.push((e.id || e.className) + ' vis=' + cs.visibility + ' op=' + cs.opacity + ' disp=' + cs.display + ' clip=' + cs.clipPath); e = e.parentElement; } const t = b && document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); out.push('top=' + (t ? (t.id || t.className || t.tagName) : '')); return out; }, w);
            await sleep(5600);
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-${w}-tag.png` });
            Object.assign(r, await page.evaluate(() => ({ sci2: Array.from(document.querySelectorAll('.bwr-sci.on')).map(e => (e.classList.contains('open') ? 'OPEN ' : '') + (e.getAttribute('aria-label') || '') + ' @' + (e.style.transform || '')), st: window.LowiWorldSci ? window.LowiWorldSci.state() : null, cand: window.LowiWorldSci ? window.LowiWorldSci.probe() : 'no module', wnHtml: (document.getElementById('bwrWorldName') || {}).outerHTML || '', hostCls: (document.querySelector('.bw3-full') ? 'bw3-full ' : '') + document.documentElement.className.split(' ').filter(c => /^wh-|gx-/.test(c)).join(' '), wnHost: (document.getElementById('bwrWorldName') || {}).parentNode ? document.getElementById('bwrWorldName').parentNode.id : '' })));
            report.push(r);
            console.log(JSON.stringify(r));
            if (arg('expect', '') === '1') {
                const name = r.seen.some(s => !s.startsWith('label:') && !s.startsWith('quest:'));
                if (!ok || !name) { fail++; console.log('FAIL', v, w, 'inside', ok, 'name bubble', name); }
            }
            await page.evaluate(() => { try { window.LowiWorldRegions.travel('hub'); } catch (e) { } });
            await sleep(9000);
        }
        if (errs.length) console.log('page errors', v, errs.slice(0, 5));
        await browser.close();
    }
    fs.writeFileSync(`${OUT}/${TAG}-report.json`, JSON.stringify(report, null, 1));
    if (srv) srv.close();
    console.log(fail ? 'FAIL ' + fail : 'DONE');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
