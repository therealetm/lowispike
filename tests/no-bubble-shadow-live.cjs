'use strict';
/* Live check: no shadow on any bubble, on Home and inside a world (Oct 19 2026, Emmanuel on iPad: "remove it on all bubbles").
   Production Supabase and every non-GET request are blocked; a local fixture session only.
     node tests/no-bubble-shadow-live.cjs [--root DIR | --url https://therealetm.github.io/lowispike/] [--out DIR] [--tag after] [--views a,b] [--world liver]
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const { bottomLayers, dropShadowsBelow } = require('./fixtures/shadow-layers.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/no-bubble-shadow-shots'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid' } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], settings: { lang: 'en' } }));
  if (!sessionStorage.getItem('o8.fx')) { sessionStorage.setItem('o8.fx', '1'); const w = {}; w[k] = 3; localStorage.setItem('lowi_fast_v1', JSON.stringify({ last: Date.now() - (10 * 60 + 53) * 60e3, target: 16, water: w })); localStorage.removeItem('lowi.home.menubar'); localStorage.removeItem('lowi.sleep.v1'); }
} catch (e) { }`;
const PORTRAIT = Object.assign({}, IPAD, { viewport: { width: 820, height: 1180 }, screen: { width: 820, height: 1180 } });
const VIEWS = {
    iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }],
    iphone13_webkit: ['webkit', 'iPhone 13'],
    ipad_portrait_webkit: ['webkit', PORTRAIT], ipad_landscape_webkit: ['webkit', IPAD],
    ipad_portrait_chromium: ['chromium', PORTRAIT], ipad_landscape_chromium: ['chromium', IPAD],
};


/* Oct 19 2026 (Emmanuel, iPad screenshot): no bubble shows a shadow, on Home and inside a world.
   Checks, in the real app: every .lh-reflection oval is not drawn; Misty's sprite has no drop shadow below her, also with
   the ring layout off (the old Home); the art used for the 3D Misty sprite, flight body and face has no reflection oval;
   no 3D material uses the old upper-left glint (the crescent) or a shadow map, and no element draws the flat white glint oval (Oct 23). Run: node tests/no-bubble-shadow-live.cjs [--views a,b] [--world liver] [--url ...] */
const PROBE = () => {
    const P = [];
    const vis = e => { let n = e; while (n && n.nodeType === 1) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden') return false; n = n.parentElement; } return true; };
    document.querySelectorAll('.lh-reflection').forEach(e => { if (vis(e)) { const r = e.getBoundingClientRect(); P.push('reflection oval drawn ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' in ' + ((e.closest('[id]') || {}).id || '?')); } });
    const below = f => { const out = []; const re = /drop-shadow\(([^()]*(\([^()]*\)[^()]*)*)\)/g; let m; while ((m = re.exec(String(f)))) { const n = (m[1].replace(/rgba?\([^)]*\)|color-mix\([^)]*\)\)?/g, '').match(/-?\d*\.?\d+px/g) || []).map(parseFloat); if ((n[1] || 0) > 1) out.push(m[0]); } return out; };
    document.querySelectorAll('#spBubble .tmg-plant, .cg-orb .cp-form').forEach(e => { const d = below(getComputedStyle(e).filter); if (d.length) P.push('drop shadow below ' + e.className.baseVal + ': ' + d.join(' ')); });
    /* Oct 23 2026: the flat white glint oval (a ::before / ::after with a plain white fill, a flat oval, rotated; a round switch knob is not one) is the "shadow" Emmanuel
       circled next to Misty in flight - it stayed where her bubble was. None may be drawn, on any bubble, in any state. */
    document.querySelectorAll('body *').forEach(e => { for (const pe of ['::before', '::after']) { const c = getComputedStyle(e, pe);
        if (c.content === 'none' || c.content === 'normal' || c.display === 'none' || !vis(e)) continue;
        if (/^rgba?\(255, 255, 255(, (0?\.[0-9]*[1-9][0-9]*|1))?\)$/.test(c.backgroundColor) && c.backgroundImage === 'none' && /50%/.test(c.borderRadius) && c.transform !== 'none' && parseFloat(c.height) < 0.6 * parseFloat(c.width)) {
            const r = e.getBoundingClientRect(); if (r.width > 0 && r.bottom > 0 && r.top < innerHeight) P.push('flat glint oval ' + pe + ' on ' + (e.id || String(e.className.baseVal != null ? e.className.baseVal : e.className).split(' ')[0] || e.tagName)); } } });
    let art = null; try { art = window.LowiWorldHome.mistyFaceArt(); } catch (e) { }
    if (art && /lh-reflection/.test(art.svg)) P.push('3D Misty art still carries the reflection oval');
    const a = window.LowiWorld3D; let mats = 0, sprites = 0;
    if (a && a.scene) {
        if (a.renderer && a.renderer.shadowMap && a.renderer.shadowMap.enabled) P.push('renderer shadow map on');
        a.scene.traverse(o => {
            if (o.castShadow || o.receiveShadow) P.push('mesh casts/receives shadow: ' + (o.name || o.type));
            const m = o.material; if (!m) return;
            if (m.fragmentShader) { mats++; if (/vec3\(\s*-0\.45\s*,\s*0\.6\s*,\s*0\.65\s*\)/.test(m.fragmentShader)) P.push('membrane glint crescent in a shader'); }
            const img = m.map && m.map.image; if (img && img.src && /^data:image\/svg/.test(img.src)) { sprites++; if (/lh-reflection/.test(decodeURIComponent(img.src))) P.push('3D sprite texture has the reflection oval'); }
        });
    }
    return { P: [...new Set(P)], mats, sprites, art: !!art, o8: document.documentElement.classList.contains('o8'), live: document.documentElement.classList.contains('wh-world-live') };
};

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    const world = arg('world', 'liver');
    let fail = 0;
    for (const v of arg('views', 'iphone_chromium,iphone13_webkit,ipad_landscape_webkit').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = typeof dd === 'string' ? Object.assign({}, pw.devices[dd]) : dd;
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        const writes = [];
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); if (q.method() !== 'GET') writes.push(q.method() + ' ' + u.host); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [];
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
        await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiWorldRegions, null, { timeout: 90000 }).catch(() => { });
        await sleep(+arg('wait', 9000));
        const P = [];
        const home = await page.evaluate(PROBE); home.P.forEach(p => P.push('home: ' + p));
        if (!home.live) P.push('3D world did not start'); if (!home.art) P.push('no Misty art'); if (!home.mats) P.push('no 3D shader materials found');
        await page.screenshot({ path: `${OUT}/${TAG}-${v}-home.png` });
        /* the old Home (ring layout off): the source rules alone must not draw a shadow either */
        await page.evaluate(() => document.documentElement.classList.remove('o8')); await sleep(500);
        (await page.evaluate(PROBE)).P.forEach(p => P.push('old home: ' + p));
        await page.evaluate(() => document.documentElement.classList.add('o8'));
        /* Oct 23: Misty out flying on autopilot - his screenshot. Her empty bubble spot must not leave a glint oval behind. */
        await page.evaluate(() => { try { window.LowiPad.mode('auto'); } catch (e) { } }); await sleep(5000);
        (await page.evaluate(PROBE)).P.forEach(p => P.push('flying: ' + p));
        await page.screenshot({ path: `${OUT}/${TAG}-${v}-flying.png` });
        await page.evaluate(() => { try { window.LowiPad.mode('off'); } catch (e) { } }); await sleep(1500);
        await page.evaluate(w => window.LowiWorldRegions.travel(w), world);
        const inside = await page.waitForFunction(w => { try { return window.LowiWorldRegions.current() === w && window.LowiMistyFlight.state().st === 'inside'; } catch (e) { return false; } }, world, { timeout: 150000, polling: 500 }).then(() => true).catch(() => false);
        if (!inside) P.push('did not get inside ' + world);
        await sleep(3000);
        const w = await page.evaluate(PROBE); w.P.forEach(p => P.push(world + ': ' + p));
        await page.screenshot({ path: `${OUT}/${TAG}-${v}-${world}.png` });
        errs.forEach(e => P.push('page error: ' + e));
        const uniq = [...new Set(P)];
        console.log(`${uniq.length ? 'FAIL' : 'PASS'} ${v} (${eng}) shaders=${home.mats}/${w.mats} svgSprites=${home.sprites}/${w.sprites} inside=${inside} blocked writes=${writes.length}`);
        uniq.slice(0, 30).forEach(p => console.log('   - ' + p));
        if (uniq.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
