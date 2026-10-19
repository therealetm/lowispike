'use strict';
/* Live check: the joystick (#whPad, "steering wheel") reads as one of the eight ring bubbles (Oct 18 2026, Emmanuel 19:28:
   "The steering wheel doesn't have the same water style, I mean bubble style, as the other bubbles. That's also wrong.").
   Compared with a ring bubble (Scan, an .o8-cell) in the same page:
   - same size on the ring
   - with the 3D world (html.lb3d): living-bubbles.js draws Misty's membrane around the joystick too (LowiBubbles.look() kind 'joy',
     visible) and its DOM shell is as clear as the ring bubble's (no dark disc, no blur)
   - without it (flat fallback): the same glass shell as the ring bubble: background, rim, inner glow (computed styles equal)
   - the same glass glint (::before) as the ring bubbles
   - no radar look: the energy arc (.mp-ring) and the dashed well (.mp-well) are not drawn; the knob is only the white icon (no inner glass bubble or rim, Oct 19)
   - the same shell while steering or on autopilot, and inside a world (html.wh-away.mf-in)
   - still a joystick: dragging it switches to steering (data-mode="drive")
   Views: Chromium 390x844, WebKit devices['iPhone 13'], iPad 1180x820 in WebKit and Chromium.
   Production Supabase and every non-GET request are blocked; a local fixture session only.
     node tests/joystick-bubble-style-live.cjs [--root DIR | --url https://therealetm.github.io/lowispike/] [--out DIR] [--tag after] [--views a,b]
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/joy-shots'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary' };
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
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid' } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], settings: { lang: 'en' } }));
} catch (e) { }`;
const VIEWS = {
    iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }],
    iphone13_webkit: ['webkit', 'iPhone 13'],
    ipad_landscape_webkit: ['webkit', IPAD], ipad_landscape_chromium: ['chromium', IPAD],
};

/* runs in the page: the joystick next to a ring bubble (Scan) */
const PROBE = () => {
    const pad = document.getElementById('whPad'), ref = document.querySelector('#whHud .o8-cell[data-orbit="scan"]') || document.querySelector('#whHud .o8-cell');
    if (!pad || !ref) return { missing: (!pad ? 'joystick #whPad ' : '') + (!ref ? 'ring bubble .o8-cell' : '') };
    const S = (e, pe) => getComputedStyle(e, pe || null);
    const shell = e => { const c = S(e); return { bgImage: c.backgroundImage, bgColor: c.backgroundColor, border: c.borderTopColor + ' ' + c.borderTopWidth + ' ' + c.borderTopStyle, shadow: c.boxShadow, blur: c.backdropFilter || c.webkitBackdropFilter || 'none', radius: c.borderTopLeftRadius }; };
    const glint = e => { const c = S(e, '::before'); return (c.content === 'none' || c.content === 'normal' || c.display === 'none') ? 'none' : [c.width, c.height, c.left, c.top, c.backgroundColor, c.transform, c.borderTopLeftRadius].join(' '); };
    const rp = pad.getBoundingClientRect(), rr = ref.getBoundingClientRect();
    const ring = pad.querySelector('.mp-ring'), well = pad.querySelector('.mp-well'), knob = pad.querySelector('.mp-knob');
    const drawn = e => !!e && S(e).display !== 'none' && S(e).visibility !== 'hidden' && +S(e).opacity > 0.03;
    let look = []; try { look = (window.LowiBubbles && window.LowiBubbles.look()) || []; } catch (e) { }
    const kc = knob ? S(knob) : null;
    return {
        o8: document.documentElement.classList.contains('o8'), lb3d: document.documentElement.classList.contains('lb3d'),
        padW: Math.round(rp.width), padH: Math.round(rp.height), refW: Math.round(rr.width),
        pad: shell(pad), ref: shell(ref), padGlint: glint(pad), refGlint: glint(ref),
        ring: drawn(ring), well: drawn(well),
        knobBg: kc ? kc.backgroundImage : '', knobBorder: kc ? kc.borderTopStyle + ' ' + kc.borderTopColor : '', knobShadow: kc ? kc.boxShadow : '',
        joyMem: look.filter(l => l.kind === 'joy').map(l => ({ visible: l.visible, opacity: l.opacity, same: l.sameUniforms })),
        refMem: look.filter(l => l.kind === (ref.getAttribute('data-hb') || 'scan')).map(l => ({ visible: l.visible, opacity: l.opacity })),
        mode: pad.dataset.mode || ''
    };
};
const eq = (a, b) => String(a).replace(/\s+/g, ' ') === String(b).replace(/\s+/g, ' ');
const dark = c => { const m = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/.exec(c || ''); if (!m) return false; const a = m[4] == null ? 1 : +m[4]; return a > 0.25 && (+m[1] + +m[2] + +m[3]) / 3 < 90; };
function judge(r, mode) {
    const P = [];
    if (r.missing) return [mode + ' missing: ' + r.missing];
    if (!r.o8) P.push(mode + ' ring Home (html.o8) did not engage');
    if (Math.abs(r.padW - r.refW) > 1 || Math.abs(r.padH - r.refW) > 1) P.push(`${mode} size ${r.padW}x${r.padH}, ring bubble ${r.refW}`);
    for (const k of ['bgImage', 'border', 'shadow', 'blur', 'radius']) if (!eq(r.pad[k], r.ref[k])) P.push(`${mode} shell ${k}: joystick "${r.pad[k]}" vs ring bubble "${r.ref[k]}"`);
    if (!eq(r.pad.bgColor, r.ref.bgColor) && dark(r.pad.bgColor)) P.push(`${mode} dark disc behind the joystick: ${r.pad.bgColor} (ring bubble ${r.ref.bgColor})`);
    if (!eq(r.padGlint, r.refGlint)) P.push(`${mode} glint: joystick "${r.padGlint}" vs ring bubble "${r.refGlint}"`);
    if (r.ring) P.push(mode + ' radar energy arc (.mp-ring) still drawn');
    if (r.well) P.push(mode + ' dashed radar well (.mp-well) still drawn');
    /* Oct 19 2026: "the same simple white-icon bubble, with no silver inner ring": no glass knob inside the bubble any more */
    if (r.knobBg && r.knobBg !== 'none') P.push(mode + ' knob still has a fill (inner glass bubble): ' + r.knobBg.slice(0, 90));
    if (!/^none|transparent|rgba\(\d+, \d+, \d+, 0\)/.test(r.knobBorder)) P.push(mode + ' knob still has a rim (silver inner ring): ' + r.knobBorder);
    if (r.knobShadow && r.knobShadow !== 'none') P.push(mode + ' knob still has a ring / glow: ' + r.knobShadow);
    if (/dashed/.test(r.knobBorder)) P.push(mode + ' knob rim is dashed');
    return P;
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    let fail = 0;
    for (const v of arg('views', 'iphone_chromium,iphone13_webkit,ipad_landscape_webkit,ipad_landscape_chromium').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = typeof dd === 'string' ? Object.assign({}, pw.devices[dd]) : dd;
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        const writes = [];
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); if (q.method() !== 'GET') writes.push(q.method() + ' ' + u.host); if (/supabase/.test(u.host) || q.method() !== 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); return r.continue(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [];
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
        await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
        await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live'), null, { timeout: 90000 }).catch(() => { });
        await page.waitForFunction(() => document.documentElement.classList.contains('o8') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 60000 }).catch(() => { });
        await sleep(+arg('wait', 9000));
        const P = [];
        const a = await page.evaluate(PROBE);
        await page.screenshot({ path: `${OUT}/${TAG}-${v}.png` });
        const box = await page.evaluate(() => { const p = document.getElementById('whPad'); if (!p) return null; const r = p.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
        if (box) { const pad = box.w * 1.9; await page.screenshot({ path: `${OUT}/${TAG}-${v}-joystick.png`, clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - box.h * 1.6), width: box.w + pad * 2, height: box.h * 2.8 } }); }
        P.push(...judge(a, a.lb3d ? '3d' : 'flat'));
        if (a.lb3d) {
            if (!a.joyMem.length) P.push('3d: no living-bubble membrane registered for the joystick (LowiBubbles kind "joy")');
            else if (!a.joyMem.some(m => m.visible && m.same)) P.push('3d: joystick membrane not drawn like the ring bubbles: ' + JSON.stringify(a.joyMem));
        }
        /* steering and autopilot: the shell stays the ring glass (the mode shows on the knob) */
        for (const m of ['drive', 'auto']) {
            const r = await page.evaluate(([m, P]) => { const p = document.getElementById('whPad'); const was = p && p.dataset.mode; if (p) p.dataset.mode = m; const out = (0, eval)('(' + P + ')')(); if (p) p.dataset.mode = was; return out; }, [m, PROBE.toString()]);
            P.push(...judge(r, (a.lb3d ? '3d ' : 'flat ') + m));
        }
        /* inside a world (look only; whether it shows there is another task's) */
        const w = await page.evaluate(P0 => { const h = document.documentElement, add = ['wh-away', 'mf-in'].filter(c => !h.classList.contains(c)); add.forEach(c => h.classList.add(c)); const out = (0, eval)('(' + P0 + ')')(); add.forEach(c => h.classList.remove(c)); return out; }, PROBE.toString());
        P.push(...judge(w, (a.lb3d ? '3d' : 'flat') + ' in-world'));
        /* the flat fallback: no 3D world */
        await page.evaluate(() => document.documentElement.classList.remove('lb3d'));
        await sleep(1800); /* misty-pad.css eases border/shadow over .3s; swiftshader frames are slow */
        const b = await page.evaluate(PROBE);
        await page.screenshot({ path: `${OUT}/${TAG}-${v}-flat.png` });
        P.push(...judge(b, 'flat'));
        await page.evaluate(() => { if (window.LowiWorld3D) document.documentElement.classList.add('lb3d'); });
        /* still a joystick: a drag steers */
        if (box) {
            const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
            await page.mouse.move(cx, cy); await page.mouse.down(); await sleep(80);
            for (let i = 1; i <= 6; i++) { await page.mouse.move(cx + i * 5, cy - i * 3); await sleep(40); }
            const during = await page.evaluate(() => { const p = document.getElementById('whPad'); return { mode: p.dataset.mode, down: p.classList.contains('mp-down') }; });
            await page.mouse.up(); await sleep(300);
            if (during.mode !== 'drive' && !during.down) P.push('drag on the joystick did not steer: ' + JSON.stringify(during));
        }
        errs.forEach(e => P.push('page error: ' + e));
        const uniq = [...new Set(P)];
        console.log(`${uniq.length ? 'FAIL' : 'PASS'} ${v} (${eng}) lb3d=${a.lb3d} size=${a.padW}/${a.refW} joyMembrane=${JSON.stringify(a.joyMem)} blocked writes=${writes.length}`);
        uniq.slice(0, 40).forEach(p => console.log('   - ' + p));
        if (uniq.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
