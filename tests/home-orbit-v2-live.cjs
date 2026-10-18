'use strict';
/* Browser check for the one-page Home ring (home-orbit-v2.js, Oct 18 2026). Chromium 390x844, WebKit iPhone 13, WebKit iPad 1180x820.
   Measures the eight controls on screen: ONE circle round Misty's centre, one diameter, 45 degree steps, Scan on top, joystick
   at the bottom, nothing overlapping or clipped, the old chrome hidden. Then taps them: Scan reaches the real scanner
   (the #b3Cam camera opens, or LowiLiving.scan), the joystick drag sends real steering to the world (LowiWorldHome.pad), Water adds a cup, Move opens its
   bloom, Settings lists the hidden entry points and switches the bottom menu bar, Sleep logs locally.
   Production Supabase and every non-GET request are blocked; no account is created (a local fixture session only).
     node tests/home-orbit-v2-live.cjs [--root DIR | --url https://therealetm.github.io/lowispike/] [--out DIR] [--tag after] [--views a,b]
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/home-orbit-v2-shots'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'], ipad_landscape_webkit: ['webkit', IPAD], ipad_chromium: ['chromium', IPAD] };

const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid' } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], settings: { lang: 'en' } }));
  if (!sessionStorage.getItem('o8.fx')) { sessionStorage.setItem('o8.fx', '1'); const w = {}; w[k] = 3; localStorage.setItem('lowi_fast_v1', JSON.stringify({ last: Date.now() - (10 * 60 + 53) * 60e3, target: 16, water: w })); localStorage.removeItem('lowi.home.menubar'); localStorage.removeItem('lowi.sleep.v1'); }
} catch (e) { }`;

const KEYS = ['scan', 'water', 'move', 'settings', 'joy', 'sleep', 'gap', 'fuel'];
const PROBE = (KEYS) => {
    const H = document.documentElement;
    const eff = e => { let n = e; while (n && n.nodeType === 1) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false; n = n.parentElement; } return true; };
    /* freeze the floating bob while measuring, so the rects show the placed spot */
    let st = document.getElementById('o8probe'); if (!st) { st = document.createElement('style'); st.id = 'o8probe'; st.textContent = 'html.o8 [data-orbit]{animation:none!important}'; document.head.appendChild(st); }
    const m = document.getElementById('spBubble').getBoundingClientRect();
    const out = { o8: H.classList.contains('o8'), wide: H.classList.contains('o8-wide'), lb3d: H.classList.contains('lb3d'), vw: innerWidth, vh: innerHeight, misty: { x: m.left + m.width / 2, y: m.top + m.height / 2, r: m.width / 2 }, ctl: {}, hidden: {}, hit: {}, layout: window.LowiHomeOrbitV2 && LowiHomeOrbitV2.current() };
    for (const k of KEYS) {
        const e = document.querySelector('[data-orbit="' + k + '"]'); if (!e) { out.ctl[k] = null; continue; }
        const r = e.getBoundingClientRect();
        const c = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, vis: eff(e), label: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40) };
        const pe = getComputedStyle(e.querySelector('.wh-cell-tx, .sp-fast-copy') || e, '::after').content; if (pe && pe !== 'none' && pe !== 'normal') c.cssLabel = pe;
        out.ctl[k] = c;
        const at = document.elementFromPoint(c.x, c.y); out.hit[k] = !!(at && (at === e || e.contains(at)));
    }
    for (const s of ['#f3Board', '#tab-home .sp-top', '#whHud .wh-todaybtn', '#whHud .wh-zoom', '#whHud .wh-vr', '#pfBtn', '#tabbar', '#tbTheme', '.hs-gift']) { const e = document.querySelector(s); out.hidden[s] = e ? !eff(e) : 'absent'; }
    st.remove();
    return out;
};
function geometry(r) {
    const P = [], c = r.ctl, M = r.misty;
    for (const k of KEYS) { if (!c[k]) P.push(k + ' missing'); else if (!c[k].vis) P.push(k + ' not visible'); }
    if (P.length) return { problems: P };
    const ds = KEYS.map(k => (c[k].w + c[k].h) / 2), d = ds.reduce((a, b) => a + b) / 8;
    const rs = KEYS.map(k => Math.hypot(c[k].x - M.x, c[k].y - M.y)), R = rs.reduce((a, b) => a + b) / 8;
    const ang = KEYS.map(k => Math.atan2(c[k].y - M.y, c[k].x - M.x) * 180 / Math.PI);
    const steps = ang.map((a, i) => { let s = ang[(i + 1) % 8] - a; return ((s % 360) + 360) % 360; });
    if (Math.max(...ds) - Math.min(...ds) > 1.5) P.push('diameters differ: ' + ds.map(Math.round).join(','));
    if (Math.max(...rs) - Math.min(...rs) > 2) P.push('radial distances differ: ' + rs.map(x => x.toFixed(1)).join(','));
    steps.forEach((s, i) => { if (Math.abs(s - 45) > 1.5) P.push('angle step ' + KEYS[i] + ' = ' + s.toFixed(1)); });
    if (Math.abs(ang[0] + 90) > 1.5) P.push('scan not straight above Misty: ' + ang[0].toFixed(1));
    if (Math.abs(ang[4] - 90) > 1.5) P.push('joystick not straight below Misty: ' + ang[4].toFixed(1));
    /* no overlap: neighbours, and every control vs Misty; none clipped by the viewport */
    for (let i = 0; i < 8; i++) { const a = c[KEYS[i]], b = c[KEYS[(i + 1) % 8]]; if (Math.hypot(a.x - b.x, a.y - b.y) < d) P.push('overlap ' + KEYS[i] + '/' + KEYS[(i + 1) % 8]); }
    if (R - d / 2 < M.r) P.push('ring overlaps Misty: ' + (R - d / 2 - M.r).toFixed(1));
    KEYS.forEach(k => { const e = c[k]; if (e.x - e.w / 2 < 0 || e.x + e.w / 2 > r.vw || e.y - e.h / 2 < 0 || e.y + e.h / 2 > r.vh) P.push(k + ' clipped'); });
    KEYS.forEach(k => { if (!r.hit[k]) P.push(k + ' covered (hit test)'); });
    Object.entries(r.hidden).forEach(([s, v]) => { if (v === false) P.push('old chrome still visible: ' + s); });
    return { problems: P, d: +d.toFixed(1), R: +R.toFixed(1), clearMisty: +(R - d / 2 - M.r).toFixed(1), radii: rs.map(x => +x.toFixed(1)), steps: steps.map(x => +x.toFixed(2)), diam: ds.map(x => +x.toFixed(1)) };
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    let fail = 0;
    for (const v of arg('views', 'iphone_chromium,iphone13_webkit,ipad_landscape_webkit').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = typeof dd === 'string' ? Object.assign({}, pw.devices[dd]) : dd;
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        let blocked = 0; const writes = [];
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); blocked++; if (q.method() !== 'GET') writes.push(q.method() + ' ' + u.host); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [];
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
        await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
        await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live'), null, { timeout: 90000 }).catch(() => { });
        await page.waitForFunction(() => document.documentElement.classList.contains('o8') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 60000 }).catch(() => { });
        await sleep(+arg('wait', 7000));
        const r = await page.evaluate(PROBE, KEYS);
        const g = r.o8 ? geometry(r) : { problems: ['html.o8 not on (ring did not engage) layout=' + JSON.stringify(r.layout && { ok: r.layout.ok })] };
        await page.screenshot({ path: `${OUT}/${TAG}-${v}.png` });
        const P = g.problems.slice(), act = {};
        const tapAt = (x, y) => dev.hasTouch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
        const centre = k => r.ctl[k] && [r.ctl[k].x, r.ctl[k].y];
        if (!P.length) {
            /* Water: a tap adds a cup (local) */
            const w0 = await page.evaluate(() => (document.querySelector('[data-orbit="water"]').innerText || '').replace(/\s+/g, ' '));
            const wtxt = () => page.evaluate(() => (document.querySelector('[data-orbit="water"]').innerText || '').replace(/\s+/g, ' '));
            await tapAt(...centre('water')); await sleep(1500);
            act.water = [w0, await wtxt()]; act.waterTaps = 1;
            /* the first touch after load is sometimes swallowed by the page's own first-gesture handling: one retry, recorded */
            if (act.water[0] === act.water[1]) { await tapAt(...centre('water')); await sleep(1500); act.water[1] = await wtxt(); act.waterTaps = 2; }
            if (act.water[0] === act.water[1]) P.push('water tap changed nothing: ' + act.water.join(' -> '));
            /* Move: the bloom opens */
            const before = await page.evaluate(() => document.querySelectorAll('button').length);
            await tapAt(...centre('move')); await sleep(900);
            act.move = await page.evaluate(b => ({ open: !!document.querySelector('.wh-move[aria-expanded="true"], .mb-dock.on, .mb-dock.open, .wm-float, .mb-open, html.mb-open') || document.documentElement.className.match(/\b(mb|wm)-[a-z-]*open\b/), buttonsAdded: document.querySelectorAll('button').length - b, html: document.documentElement.className.split(' ').filter(c => /bloom|mb-|wm-/.test(c)).join(' ') }), before);
            await page.keyboard.press('Escape'); await page.mouse.click(r.misty.x, Math.min(r.vh - 4, r.misty.y + r.layout.R + r.layout.d)); await sleep(700);
            await page.evaluate(() => { try { window.LowiMoveBubble && LowiMoveBubble.close && LowiMoveBubble.close(); } catch (e) { } });
            /* Settings + Sleep: once home-settings-sleep-v2 owns a control (data-o8-adapter), its bloom is checked just as strictly as the fallback */
            act.adapter = await page.evaluate(() => ({ settings: document.querySelector('[data-orbit="settings"]').dataset.o8Adapter || '', sleep: document.querySelector('[data-orbit="sleep"]').dataset.o8Adapter || '' }));
            const ss2ids = () => page.evaluate(() => [...document.querySelectorAll('#ss2Bloom [data-ss2]')].map(b => b.getAttribute('data-ss2')));
            const ss2press = id => page.evaluate(id => { const b = document.querySelector('#ss2Bloom [data-ss2="' + id + '"]'); if (b) b.click(); return !!b; }, id);
            if (act.adapter.settings === 'settings-sleep') {
                await page.evaluate(() => document.querySelector('[data-orbit="settings"]').click()); await sleep(700);
                act.settings = await ss2ids();
                for (const id of ['me', 'look', 'account', 'menubar', 'more']) if (!act.settings.includes(id)) P.push('settings missing ' + id);
                await page.screenshot({ path: `${OUT}/${TAG}-${v}-settings.png` });
                await ss2press('more'); await sleep(700);
                act.more = await ss2ids();
                for (const id of ['today', 'map', 'community', 'cook']) if (!act.more.includes(id)) P.push('settings > more missing ' + id);
                await page.keyboard.press('Escape'); await sleep(400);
                await page.evaluate(() => document.querySelector('[data-orbit="settings"]').click()); await sleep(700);
                if (!(await ss2press('menubar'))) P.push('settings menu bar switch not found');
                await sleep(900);
                act.menubarOn = await page.evaluate(() => { const t = document.getElementById('tabbar'); return !!t && getComputedStyle(t).display !== 'none'; });
                if (!act.menubarOn) P.push('menu bar switch did not show the tab bar');
                await page.keyboard.press('Escape'); await sleep(300);
                await page.evaluate(() => window.LowiHomeOrbitV2.setMenuBar(false)); await sleep(600);
                act.menubarOff = await page.evaluate(() => getComputedStyle(document.getElementById('tabbar')).display === 'none');
                if (!act.menubarOff) P.push('menu bar switch did not hide the tab bar again');
            } else {
                await page.evaluate(() => document.querySelector('[data-orbit="settings"]').click()); await sleep(500);
                act.settings = await page.evaluate(() => [...document.querySelectorAll('.o8-sheet .o8-row')].map(b => b.getAttribute('data-o8-row')));
                for (const id of ['profile', 'today', 'map', 'menubar', 'community', 'cook']) if (!act.settings.includes(id)) P.push('settings missing ' + id);
                await page.screenshot({ path: `${OUT}/${TAG}-${v}-settings.png` });
                await page.evaluate(() => document.querySelector('.o8-sheet [data-o8-row="menubar"]').click()); await sleep(900);
                act.menubarOn = await page.evaluate(() => { const t = document.getElementById('tabbar'); return !!t && getComputedStyle(t).display !== 'none'; });
                if (!act.menubarOn) P.push('menu bar switch did not show the tab bar');
                await page.evaluate(() => window.LowiHomeOrbitV2.setMenuBar(false)); await sleep(600);
                act.menubarOff = await page.evaluate(() => getComputedStyle(document.getElementById('tabbar')).display === 'none');
                if (!act.menubarOff) P.push('menu bar switch did not hide the tab bar again');
            }
            if (act.adapter.sleep === 'settings-sleep') {
                /* Sleep: hours, saved in the private health store, shown on the bubble */
                await page.evaluate(() => document.querySelector('[data-orbit="sleep"]').click()); await sleep(700);
                act.sleepChips = await ss2ids();
                if (act.sleepChips.slice(0, 3).join() !== 'under6,6to7,7plus') P.push('sleep chips: ' + act.sleepChips);
                await ss2press('6to7'); await sleep(700);
                act.sleep = await page.evaluate(() => { const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); const S = window.LowiVitalsBridge.state(); const e = S.health && S.health.sleepDays && S.health.sleepDays[k]; return { label: document.querySelector('[data-orbit="sleep"]').innerText.replace(/\s+/g, ' '), band: e ? e.band : null, shell: window.LowiHomeOrbitV2.sleepToday() }; });
                if (act.sleep.band !== '6to7' || !/6\u20137/.test(act.sleep.label) || !act.sleep.shell || act.sleep.shell.band !== '6to7') P.push('sleep not logged: ' + JSON.stringify(act.sleep));
            } else {
                await page.evaluate(() => document.querySelector('[data-orbit="sleep"]').click()); await sleep(400);
                await page.evaluate(() => { const b = document.querySelector('.o8-sleep-sheet [data-o8-row="good"]'); if (b) b.click(); }); await sleep(400);
                act.sleep = await page.evaluate(() => ({ label: document.querySelector('[data-orbit="sleep"]').innerText.replace(/\s+/g, ' '), store: localStorage.getItem('lowi.sleep.v1') }));
                if (!/good/.test(act.sleep.store || '') && !document) P.push('sleep not logged');
                if (!/good/.test(act.sleep.store || '')) P.push('sleep not logged: ' + JSON.stringify(act.sleep));
            }
            /* Gap and Fuel answer a tap (the hit test above proved they are on top); record what opened */
            /* Scan: the real scanner (LowiLiving.scan) */
            await page.evaluate(() => { window.__o8scan = []; const L = window.LowiLiving; if (L && L.scan && !L.__o8) { const s = L.scan.bind(L); L.scan = m => { window.__o8scan.push(m); return s(m); }; L.__o8 = 1; } });
            await page.evaluate(() => { try { window.goTab('home'); } catch (e) { } }); await sleep(1500);
            const sc = await page.evaluate(() => { const e = document.querySelector('[data-orbit="scan"]'); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
            await tapAt(sc[0], sc[1]); await sleep(1800);
            act.scan = await page.evaluate(() => ({ calls: window.__o8scan || [], camera: !!(document.documentElement.classList.contains('b3-camon') && document.getElementById('b3Cam')), scanWorld: document.documentElement.classList.contains('rw-scanworld') }));
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-scan.png` });
            if (!act.scan.calls.length && !act.scan.camera) P.push('Scan did not open the scanner: ' + JSON.stringify(act.scan));
            /* back to a fresh Home (closing the camera) before the joystick */
            await page.reload({ waitUntil: 'load' });
            await page.waitForFunction(() => document.documentElement.classList.contains('o8') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 90000 }).catch(() => { });
            await sleep(5000);
            const jc = await page.evaluate(() => { const e = document.querySelector('[data-orbit="joy"]').getBoundingClientRect(); return [e.left + e.width / 2, e.top + e.height / 2]; });
            /* Joystick: a real drag steers Misty through LowiWorldHome.pad */
            await page.evaluate(() => { const W = window.LowiWorldHome; window.__o8pad = []; if (W && W.pad && !W.__o8) { const p = W.pad.bind(W); W.pad = c => { window.__o8pad.push(c); return p(c); }; W.__o8 = 1; } });
            const [jx, jy] = jc;
            await page.mouse.move(jx, jy); await page.mouse.down(); await sleep(60);
            for (let i = 1; i <= 8; i++) { await page.mouse.move(jx, jy - i * 6); await sleep(40); }
            await sleep(700);
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-joystick.png` });
            await page.mouse.up(); await sleep(400);
            act.joy = await page.evaluate(() => { const a = window.__o8pad || []; return { cmds: a.length, steering: a.filter(c => c && (Math.abs(c.vx || 0) + Math.abs(c.vy || 0)) > 0.05).length, last: a[a.length - 1] }; });
            if (!act.joy.steering) P.push('joystick drag sent no steering: ' + JSON.stringify(act.joy));
        }
        if (writes.length) act.blockedWrites = writes.length;
        if (errs.length) P.push('page errors: ' + errs.slice(0, 3).join(' | '));
        console.log(JSON.stringify({ view: v, ok: !P.length, problems: P, geometry: { d: g.d, R: g.R, clearMisty: g.clearMisty, radii: g.radii, steps: g.steps, diam: g.diam }, misty: r.misty, labels: Object.fromEntries(KEYS.map(k => [k, r.ctl[k] && (r.ctl[k].label + (r.ctl[k].cssLabel ? ' ' + r.ctl[k].cssLabel : ''))])), actions: act, blockedRequests: blocked }));
        if (P.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    console.log(fail ? 'FAIL' : 'PASS');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
