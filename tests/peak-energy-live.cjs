'use strict';
/* Browser check (Oct 19 2026, E-man on a fresh account: "I just started and my companion already looks tired and I'm at fifty
   percent ... at least when they begin, let them see themselves at a hundred percent ... really fast, really strong, the world
   should be moving ... when their power goes down, they notice"). Per view, two signed-in local fixture accounts:
     NEW      = just planted her (ledger 'herb-first:planted' 1 h ago, nothing else): energy 100%, tier thriving, her face
                not tired, world pace ~1.6, peak look on (brighter light shafts / bigger motes), world time runs ~2x RESTING.
     RESTING  = an old account with nothing tracked today (history from days ago): 15%, tired, pace ~0.8, no peak look.
   Then NEW flies into the liver world and back out (LowiWorldRegions.travel + LowiWorldRegions.home) with no page errors,
   and the frame rate / JS heap (Chromium only) are logged and bounded. With --reduce: Reduce Motion: still 100%, pace 1.
   Production Supabase and every non-GET request are blocked; a local fixture session only.
     node tests/peak-energy-live.cjs [--root DIR | --url URL] [--views a,b] [--reduce 1]
   Exit 0 = pass. Software-rendered test browsers: frame numbers are not phone numbers. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), REDUCE = arg('reduce', '') === '1';
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.ktx2': 'image/ktx2' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() {
    return new Promise(r => {
        const s = http.createServer((q, res) => {
            let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
            const f = path.join(ROOT, u);
            if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
            res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
        }).listen(0, '127.0.0.1', () => r(s));
    });
}
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'], ipad_landscape_webkit: ['webkit', IPAD] };
/* a signed-in local fixture; ACCOUNT = 'new' (planted 1 h ago) or 'resting' (old account, nothing today) */
const INIT = acc => `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-0000000000e1', email: 'fixture@example.invalid' } }));
  if (!sessionStorage.getItem('pe.fx')) { sessionStorage.setItem('pe.fx', '1');
    const now = Date.now(), H = 36e5;
    const ledger = ${acc === 'new' ? "[{ eventId: 'herb-first:planted', ts: now - H, points: 5, label: 'First spark' }]" : "[{ eventId: 'herb-first:planted', ts: now - 6 * 24 * H, points: 5 }, { eventId: 'water:old', ts: now - 5 * 24 * H, points: 2 }]"};
    localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1997-10-12' }, xp: 5, ledger, logs: [], settings: { lang: 'en' } }));
    localStorage.setItem('lowi_fast_v1', JSON.stringify({ last: 0, target: 16, water: {} })); localStorage.removeItem('lowi.sleep.v1'); }
} catch (e) { }`;
function read() {
    const en = window.LowiSun.energyNow(), w = window.LowiWorld3D, h = document.getElementById('spHome');
    let heap = null; try { heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null; } catch (e) { }
    return { value: +en.value.toFixed(3), tier: en.tier, welcome: en.welcome, real: en.real, face: h ? h.dataset.misty : null, feel: window.LowiVigorFeel ? Object.assign({}, window.LowiVigorFeel) : null,
        look: w && w.feelLook ? w.feelLook() : null, fps: w && w.fps ? Math.round(w.fps()) : null, heap, html: document.documentElement.className.split(/\s+/).filter(c => /^(wh-away|lb3d)/.test(c)).join(' ') };
}
(async () => {
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    let fail = 0;
    for (const v of arg('views', 'iphone_chromium,iphone13_webkit,ipad_landscape_webkit').split(',')) {
        const [eng, dd] = VIEWS[v], R = {}, P = [];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] } : {});
        for (const acc of ['new', 'resting']) {
            const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd);
            const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block', reducedMotion: REDUCE ? 'reduce' : 'no-preference' }));
            const writes = [];
            await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); if (q.method() !== 'GET') writes.push(q.method() + ' ' + u.host); return r.abort(); });
            await ctx.addInitScript(INIT(acc));
            const page = await ctx.newPage(), errs = [];
            page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
            await page.goto(url, { waitUntil: 'load' });
            await page.waitForFunction(() => window.LowiSun && window.LowiSun.energyNow && document.getElementById('spHome'), null, { timeout: 30000 }).catch(() => { });
            await sleep(6000);
            await page.waitForFunction(() => { const w = window.LowiWorld3D, l = w && w.feelLook && w.feelLook(); return !document.documentElement.classList.contains('lb3d') || (window.LowiVigorFeel && l && l.clock > 3); }, null, { timeout: 40000, polling: 250 }).catch(() => { });
            await sleep(1500);
            const a = await page.evaluate(read); await sleep(2000); const b = await page.evaluate(read);
            const rate = a.look && b.look && b.look.clock > a.look.clock ? +((b.look.t - a.look.t) / (b.look.clock - a.look.clock)).toFixed(3) : null; /* world seconds per stepped real second */
            R[acc] = Object.assign(b, { rate });
            if (acc === 'new' && !REDUCE) {
                const ok = await page.evaluate(() => { try { return !!window.LowiWorldRegions.travel('liver'); } catch (e) { return false; } });
                await sleep(6000); const inW = await page.evaluate(read);
                await page.evaluate(() => { try { window.LowiWorldRegions.travel('hub'); } catch (e) { } });
                await page.waitForFunction(() => { try { return window.LowiWorldRegions.current() === 'hub' && !document.documentElement.classList.contains('wh-away'); } catch (e) { return false; } }, null, { timeout: 25000, polling: 250 }).catch(() => { });
                await sleep(1500); const backH = await page.evaluate(read);
                R.world = { travel: ok, inside: inW.html, feelInside: inW.feel, fpsInside: inW.fps, back: backH.html, heapAfter: backH.heap };
                if (!ok || !/wh-away/.test(inW.html)) P.push('never got inside liver: ' + ok + ' ' + inW.html);
                if (/wh-away/.test(backH.html)) P.push('did not get back home from liver: ' + backH.html);
                if (!inW.feel || inW.feel.peak < 0.9) P.push('peak feel lost inside the world ' + JSON.stringify(inW.feel));
            }
            if (errs.length) P.push(acc + ' page errors: ' + errs.join(' | '));
            if (writes.length) R['blocked_' + acc] = writes.length; /* blocked, never sent (auth refresh to production Supabase) */
            await ctx.close();
        }
        const N = R.new, Z = R.resting;
        if (N.value !== 1 || N.tier !== 'thriving' || N.welcome !== 1) P.push('new account not at 100%: ' + JSON.stringify([N.value, N.tier, N.welcome]));
        if (N.face === 'tired' || N.face === 'weak') P.push('new account still looks ' + N.face);
        if (Z.value > 0.2 || Z.welcome !== 0) P.push('old account got welcome energy: ' + JSON.stringify([Z.value, Z.welcome]));
        if (!REDUCE) {
            if (!N.feel || Math.abs(N.feel.pace - 1.6) > 0.05 || N.feel.peak < 0.95) P.push('new feel not peak: ' + JSON.stringify(N.feel));
            if (!Z.feel || Math.abs(Z.feel.pace - 0.8) > 0.05 || Z.feel.peak > 0.01) P.push('resting feel wrong: ' + JSON.stringify(Z.feel));
            if (N.look && Z.look) {
                if (!(N.look.shaft > Z.look.shaft * 1.5 && N.look.mote > Z.look.mote * 1.2)) P.push('peak look not brighter: ' + JSON.stringify([N.look, Z.look]));
                if (N.rate && Z.rate && !(N.rate / Z.rate > 1.5)) P.push('world not faster at the peak: ' + N.rate + ' vs ' + Z.rate);
            } else if (N.html.indexOf('lb3d') >= 0) P.push('3D on but no feelLook');
            if (N.heap && R.world && R.world.heapAfter && R.world.heapAfter > N.heap + 120) P.push('heap grew ' + N.heap + ' -> ' + R.world.heapAfter + ' MB');
        } else if (N.feel && Math.abs(N.feel.pace - 1) > 0.01) P.push('Reduce Motion pace not 1: ' + JSON.stringify(N.feel));
        const s = x => x ? `${x.value} ${x.tier} face=${x.face} pace=${x.feel && x.feel.pace.toFixed(2)} peak=${x.feel && x.feel.peak.toFixed(2)} shaft=${x.look && x.look.shaft} mote=${x.look && x.look.mote} worldRate=${x.rate} fps=${x.fps} heap=${x.heap}MB` : '-';
        console.log(`${P.length ? 'FAIL' : 'PASS'} ${v}${REDUCE ? ' (Reduce Motion)' : ''} | NEW ${s(N)} | RESTING ${s(Z)}` + (R.world ? ` | liver: in=${R.world.inside} fps=${R.world.fpsInside} back=${R.world.back} heapAfter=${R.world.heapAfter}MB` : ''));
        P.forEach(p => console.log('   - ' + p));
        if (P.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
