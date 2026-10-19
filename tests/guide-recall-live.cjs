'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/guide-recall-shots'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'], ipad_landscape_webkit: ['webkit', IPAD], ipad_chromium: ['chromium', IPAD] };
/* the same local fixture session the Home ring check uses (no account, no network) */
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];

/* Browser check: the cell guide's "Remember?" recall check (Oct 18 2026, Emmanuel: "'Oh, remember when I told you this and this
   and that?' And there's a button that says 'yes' ... it says 'Good, because now it's about blah blah blah.' If the person clicks
   'no', it repeats that lesson."). Per view, lowi.guides.v1 is seeded as a later visit to the liver (met, lessons 1 and 2 told on
   earlier visits, one visit since the last question), so the guide opens with the question:
     load 1: the first line asks "Remember when I told you ...?"; Yes and No are visible glass buttons, at least 44 x 64 px, fully on
             screen, no shadow, and the bubble covers neither the joystick (#whPad) nor Misty. Tap Yes: the next line starts with
             "Good, because now it's about", the buttons go, and lesson 1 is saved as remembered.
     load 2 (reloaded, seeded again): tap No: the next line is "No problem, here it is again:" plus that lesson, and nothing is
             saved as remembered.
   Screenshot of the question: OUT/TAG-<view>-ask.png. Production Supabase and every non-GET request are blocked.
     node tests/guide-recall-live.cjs [--root DIR | --url https://therealetm.github.io/lowispike/] [--out DIR] [--tag after]
       [--views iphone_chromium,iphone13_webkit,ipad_landscape_webkit]
   Exit 0 = pass. */
const C = require('../region-pals-core.js');
const SEED = JSON.stringify({ v: 1, met: { liver: 1 }, lastBack: -1, told: { liver: [1, 2] }, since: { liver: 1 } });
const askLi = t => { for (let li = 0; li < 3; li++) if (t.indexOf(C.COPY.ask[li].split('{t}')[0]) >= 0) return li; return -1; };
(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host, WORLD = 'liver';
    let fail = 0;
    for (const v of arg('views', 'iphone_chromium,iphone13_webkit,ipad_landscape_webkit').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd);
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        const writes = [];
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); if (q.method() !== 'GET') writes.push(q.method() + ' ' + u.host); return r.abort(); });
        await ctx.addInitScript(INIT);
        await ctx.addInitScript(seed => { try { localStorage.setItem('lowi.guides.v1', seed); } catch (e) { } window.__rp = []; window.addEventListener('lowi:region-pal', e => window.__rp.push({ t: performance.now(), text: e.detail.text, user: e.detail.user })); }, SEED);
        const page = await ctx.newPage(), errs = [], P = [], steps = {};
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        async function enter(n) {
            if (n === 1) await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            else await page.reload({ waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiWorldRegions && window.LowiMistyFlight && window.LowiRegionPals, null, { timeout: 90000 }).catch(() => { });
            await sleep(+arg('wait', 5000));
            await page.evaluate(w => window.LowiWorldRegions.travel(w), WORLD);
            await page.waitForFunction(w => { try { return window.LowiWorldRegions.current() === w && window.LowiMistyFlight.state().st === 'inside'; } catch (e) { return false; } }, WORLD, { timeout: 60000 });
            await page.waitForFunction(() => window.__rp.length > 0, null, { timeout: 30000 }).catch(() => { });
            /* the question waits until Misty has swum in; other lines (a hunt hint) may come first */
            /* in-page polling: cheap even when a software-rendered engine makes every round trip slow */
            await page.waitForFunction(() => document.querySelector('#rpPal.rp-asking'), null, { timeout: 90000, polling: 200 }).catch(() => { });
            await sleep(600);
            steps['rp' + n] = await page.evaluate(() => window.__rp.map(x => Math.round(x.t) + ' ' + x.text.slice(0, 50)));
            return page.evaluate(() => { const a = document.querySelector('#rpPal.rp-asking .rp-tx'); return a ? a.textContent : ((window.__rp[0] || {}).text || ''); });
        }
        /* what is on screen while it asks */
        const look = () => page.evaluate(() => {
            const R = e => { if (!e) return null; const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom, w: q.width, h: q.height }; };
            const pal = document.getElementById('rpPal'), say = pal && pal.querySelector('.rp-say'), ask = pal && pal.querySelector('.rp-ask');
            const btns = pal ? Array.from(pal.querySelectorAll('.rp-ask button')).map(b => ({ text: b.textContent, r: R(b), sh: getComputedStyle(b).boxShadow, vis: getComputedStyle(ask).display !== 'none' })) : [];
            const pad = document.getElementById('whPad'), padOn = pad && getComputedStyle(pad).display !== 'none' && getComputedStyle(pad).visibility !== 'hidden';
            const MF = window.LowiMistyFlight, m = MF && MF.screen ? MF.screen() : null;
            return { asking: !!(pal && pal.classList.contains('rp-asking')), talk: !!(pal && pal.classList.contains('rp-talk')), say: R(say), btns, pad: padOn ? R(pad) : null, misty: m ? { x: m.x, y: m.y } : null, vw: innerWidth, vh: innerHeight, mem: localStorage.getItem('lowi.guides.v1') };
        });
        /* tap the button where it is right now (real hit testing; the guide swims, so a 'stable' wait would never settle) */
        async function tapBtn(sel) {
            const c = await page.evaluate(sel => { const b = document.querySelector('#rpPal ' + sel); if (!b) return null; const q = b.getBoundingClientRect(); const x = q.left + q.width / 2, y = q.top + q.height / 2; const top = document.elementFromPoint(x, y); return { x, y, on: !!(top && b.contains(top)), top: top ? (top.id || top.className || top.tagName) + '' : '' }; }, sel);
            if (!c) { P.push(sel + ' missing'); return; }
            if (!c.on) P.push(sel + ' is covered by ' + c.top);
            if (dev.hasTouch) await page.touchscreen.tap(c.x, c.y); else await page.mouse.click(c.x, c.y);
        }
        /* more than a 4 px touch at the rim counts as covering */
        const hit = (a, b) => a && b && Math.min(a.r, b.r) - Math.max(a.l, b.l) > 4 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 4;
        function checkAsk(s, tag) {
            if (!s.asking || !s.talk) P.push(tag + ': bubble not in asking state');
            if (s.btns.length !== 2) P.push(tag + ': expected 2 buttons, got ' + s.btns.length);
            for (const b of s.btns) {
                if (!b.vis) P.push(tag + ': buttons hidden');
                if (!(b.r.h >= 44 && b.r.w >= 64)) P.push(tag + ': button too small ' + b.text + ' ' + Math.round(b.r.w) + 'x' + Math.round(b.r.h));
                if (b.r.l < 0 || b.r.t < 0 || b.r.r > s.vw || b.r.b > s.vh) P.push(tag + ': button off screen ' + b.text);
                if (b.sh && b.sh !== 'none') P.push(tag + ': button has a shadow: ' + b.sh);
            }
            if (hit(s.say, s.pad)) P.push(tag + ': bubble covers the joystick');
            if (s.misty && hit(s.say, { l: s.misty.x - 30, t: s.misty.y - 30, r: s.misty.x + 30, b: s.misty.y + 30 })) P.push(tag + ': bubble covers Misty');
        }
        try {
            /* load 1: Yes */
            const q1 = await enter(1), li = askLi(q1);
            steps.wait = await page.evaluate(() => Math.round(performance.now()));
            steps.build = await page.evaluate(() => fetch('version.json?tb=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => '?'));
            steps.ask = q1.slice(0, 120);
            if (li < 0) P.push('load 1: the first line is not the recall question: ' + q1);
            else {
                const s = await look(); steps.say = s.say; steps.misty = s.misty; steps.pad = s.pad; steps.btns = s.btns.map(b => b.text + ' ' + Math.round(b.r.w) + 'x' + Math.round(b.r.h));
                checkAsk(s, 'load 1');
                steps.track = [];
                /* while the question is up the guide swims beside Misty and the bubble follows: sample where it sits (overlap with the
                   joystick in px of height; a short overlap while Misty rises into the world is the bubble catching up, a lasting one fails) */
                const ovh = (a, o) => a && o ? Math.max(0, Math.min(a.b, o.b) - Math.max(a.t, o.t)) * (Math.min(a.r, o.r) > Math.max(a.l, o.l) ? 1 : 0) : 0;
                for (let k = 0; k < 8; k++) { await sleep(700); const t = await look(); steps.track.push({ m: t.misty && [Math.round(t.misty.x), Math.round(t.misty.y)], pad: Math.round(ovh(t.say, t.pad)), asking: t.asking }); }
                const lastPad = steps.track.slice(-4).filter(x => x.pad > 4).length;
                if (lastPad >= 2) P.push('load 1: the question keeps covering the joystick: ' + JSON.stringify(steps.track.slice(-4)));
                if (!steps.track.every(x => x.asking)) P.push('load 1: the question went before 5.6 s');
                await page.screenshot({ path: `${OUT}/${TAG}-${v}-ask.png` });
                const n0 = await page.evaluate(() => window.__rp.length);
                await tapBtn('.rp-yes');
                await page.waitForFunction(n => window.__rp.length > n, n0, { timeout: 5000 }).catch(() => { });
                await sleep(400);
                const after = await page.evaluate(n => (window.__rp[n] || {}).text || '', n0), s2 = await look();
                steps.yes = after.slice(0, 120);
                if (after.indexOf(C.COPY.good[li].split('{t}')[0]) !== 0) P.push('Yes: next line is not "Good, because now ...": ' + after);
                if (s2.asking) P.push('Yes: still asking');
                let m = null; try { m = JSON.parse(s2.mem || 'null'); } catch (e) { }
                if (!(m && m.ok && m.ok.liver && m.ok.liver.indexOf(1) >= 0)) P.push('Yes: lesson 1 not saved as remembered: ' + s2.mem);
            }
            /* load 2: No */
            const q2 = await enter(2), li2 = askLi(q2);
            if (li2 < 0) P.push('load 2: the first line is not the recall question: ' + q2);
            else {
                checkAsk(await look(), 'load 2');
                const n0 = await page.evaluate(() => window.__rp.length);
                await tapBtn('.rp-no');
                await page.waitForFunction(n => window.__rp.length > n, n0, { timeout: 5000 }).catch(() => { });
                await sleep(400);
                const after = await page.evaluate(n => (window.__rp[n] || {}).text || '', n0), s2 = await look();
                steps.no = after.slice(0, 120);
                if (after.indexOf(C.COPY.again[li2]) !== 0 || after.length < C.COPY.again[li2].length + 20) P.push('No: next line does not repeat the lesson: ' + after);
                if (s2.asking) P.push('No: still asking');
                let m = null; try { m = JSON.parse(s2.mem || 'null'); } catch (e) { }
                if (m && m.ok && m.ok.liver && m.ok.liver.indexOf(1) >= 0) P.push('No: lesson saved as remembered');
            }
        } catch (e) { P.push('threw ' + e.message.slice(0, 200)); }
        if (errs.length) P.push('page errors: ' + errs.slice(0, 3).join(' | '));
        console.log(JSON.stringify({ view: v, ok: !P.length, problems: P, steps, blockedWrites: writes.length }));
        if (P.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    console.log(fail ? 'FAIL' : 'PASS');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
