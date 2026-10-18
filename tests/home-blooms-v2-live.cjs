'use strict';
/* home-blooms-v2 live check (Oct 18, 2026). Real app, local static server, every non-GET and every other host blocked
   (no production backend writes). The eight-bubble shell is not merged yet, so this test tags today's Home bubbles the
   way the shell contract says (data-orbit="fuel|water|move|gap", Misty = data-orbit="misty"), injects home-blooms-v2.js,
   mounts it and taps with real pointer clicks. Checks per view (iPhone 390x844 chromium, iPhone 13 webkit, iPad webkit):
   - each bloom opens outward, every orb on screen, none on Misty, only one bloom at a time, old cell handlers do not fire
   - Water +1 cup adds one cup, Undo takes one off, never below 0, water XP never above the cups
   - Gap: Ate earlier opens the when-did-you-eat sheet, I just ate moves the last-meal time to now
   - Move: Quick logs a move estimate
   - Fuel: Today's step / Snack / Swap / Cook each open their existing screen; labels plain, no emoji
   Usage: node tests/home-blooms-v2-live.cjs [--root DIR] [--out DIR]. Needs playwright. Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/hb2-shots');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'], ipad_landscape_webkit: ['webkit', IPAD] };
const only = arg('view', '');

const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
  if (!sessionStorage.getItem('hb2.fx')) { sessionStorage.setItem('hb2.fx', '1'); const w = {}; w[k] = 2; localStorage.setItem('lowi_fast_v1', JSON.stringify({ last: Date.now() - (3 * 60 + 12) * 60e3, target: 16, water: w })); }
} catch (e) { }`;

/* tag today's Home like the eight-bubble shell will, then load + mount the module */
const TAG = () => {
    const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
    const sels = { fuel: '#whHud .wh-meals', water: '#whHud .wh-water', move: '#whHud .wh-move', gap: '#spFast', misty: '#spBubble' };
    const out = {};
    for (const k in sels) { const e = document.querySelector(sels[k]); out[k] = vis(e); if (e) e.setAttribute('data-orbit', k); }
    return out;
};
const probe = () => {
    const ov = document.getElementById('hb2Bloom');
    if (!ov || ov.classList.contains('off')) return { open: false };
    const L = ov.__layout;
    const m = document.getElementById('spBubble').getBoundingClientRect(), mc = { x: m.left + m.width / 2, y: m.top + m.height / 2 };
    /* final geometry from the orb's own left/top and size (the spring animation itself depends on the frame rate) */
    const orbs = [...ov.querySelectorAll('.hb2-orb')].map(o => { const w = L.orb, cx = parseFloat(o.style.left), cy = parseFloat(o.style.top), r = { left: cx - w / 2, top: cy - w / 2, right: cx + w / 2, bottom: cy + w / 2, width: w }; return { id: o.dataset.id, text: o.innerText.replace(/\s+/g, ' ').trim(), dis: o.disabled, x: cx, y: cy, w: r.width, live: Math.round(o.getBoundingClientRect().width), l: r.left, t: r.top, r: r.right, b: r.bottom }; });
    const vw = innerWidth, vh = innerHeight;
    return {
        open: true, kind: ov.dataset.kind, count: document.querySelectorAll('#hb2Bloom').length, orbs,
        onScreen: orbs.every(o => o.l >= -1 && o.t >= -1 && o.r <= vw + 1 && o.b <= vh + 1),
        mistyClear: orbs.every(o => Math.hypot(o.x - L.misty.x, o.y - L.misty.y) >= L.misty.r + o.w / 2 - 2),
        mistyRectFree: orbs.every(o => o.r < m.left + 6 || o.l > m.right - 6 || o.b < m.top + 6 || o.t > m.bottom - 6 || Math.hypot(o.x - mc.x, o.y - mc.y) >= Math.min(m.width, m.height) / 2 + o.w / 2 - 6),
        outward: orbs.every(o => Math.hypot(o.x - L.misty.x, o.y - L.misty.y) >= Math.hypot(L.bubble.x - L.misty.x, L.bubble.y - L.misty.y) - L.bubble.r),
        apart: orbs.every((a, i) => orbs.every((b, j) => i >= j || Math.hypot(a.x - b.x, a.y - b.y) >= a.w - 2)),
        emoji: /\p{Extended_Pictographic}/u.test(ov.innerText), rot: L.rot, vw, vh, cls: ov.className, L: { b: L.bubble, m: L.misty, orb: L.orb, pts: L.pts.map(p => [Math.round(p.x), Math.round(p.y)]) }
    };
};
const fastStore = () => JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}');

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = await serve(), host = '127.0.0.1:' + srv.address().port, url = 'http://' + host + '/';
    const fails = [], log = [];
    const ok = (c, m) => { if (!c) fails.push(m); log.push((c ? 'ok   ' : 'FAIL ') + m); };
    for (const name of Object.keys(VIEWS)) {
        if (only && only !== name) continue;
        const [eng, devName] = VIEWS[name], dev = typeof devName === 'string' ? pw.devices[devName] : devName;
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        let blocked = 0;
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); blocked++; return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage();
        const errs = []; page.on('pageerror', e => errs.push(String(e && e.message || e)));
        const P = name + ': ';
        try {
            await page.goto(url + '?hb2=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && document.querySelector('#spFast.lb-bub') && document.querySelector('#whHud .wh-water'), null, { timeout: 90000 }).catch(() => { });
            await sleep(2500);
            const vis = await page.evaluate(TAG);
            ok(vis.fuel && vis.water && vis.move && vis.gap && vis.misty, P + 'home bubbles visible to tag ' + JSON.stringify(vis));
            await page.addScriptTag({ url: url + 'home-blooms-v2.js?t=' + Date.now() });
            const m1 = await page.evaluate(() => { const a = window.LowiHomeBloomsV2.mount(document.getElementById('spHome') || document); const b = window.LowiHomeBloomsV2.mount(document.getElementById('spHome') || document); return a === b && !!document.getElementById('hb2Css'); });
            ok(m1, P + 'mount is idempotent and loads its css');
            await page.waitForFunction(() => { const l = document.getElementById('hb2Css'); return l && l.sheet; }, null, { timeout: 10000 }).catch(() => { });
            const closeAll = async () => { await page.evaluate(() => { window.LowiHomeBloomsV2.close(); document.querySelectorAll('.r3-ov,.r3m-ov,.stp-ov,.r2-ov,.bt-ov,#g1Tour,.ob-ov,.lw-ov').forEach(e => e.remove()); const s = document.getElementById('sos'); if (s) s.classList.remove('open'); const w = document.getElementById('sheetwrap'); if (w) w.classList.remove('open'); }); await sleep(500); };
            const settle = () => page.waitForFunction(() => { const o = document.getElementById('hb2Bloom'); return !o || (o.classList.contains('on') && o.getAnimations({ subtree: true }).every(a => a.playState !== 'running')); }, null, { timeout: 8000 }).catch(() => { });
            const covered = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return 'missing'; const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (e.contains(t) || t.closest('#hb2Bloom')) ? '' : (t ? (t.id || '') + '.' + String(t.className).slice(0, 60) : 'nothing'); }, sel);
            const tap = async sel => {
                if (/data-orbit/.test(sel)) { let c = await covered(sel); for (let i = 0; c && i < 3; i++) { log.push('     ' + P + sel + ' covered by ' + c + ', clearing'); await closeAll(); await sleep(800); c = await covered(sel); } }
                const still = /data-orbit/.test(sel) ? await covered(sel) : '';
                if (still) { log.push('     ' + P + sel + ' still under ' + still + ' (layout of the old Home), tapping the element directly'); await page.evaluate(sel => document.querySelector(sel).click(), sel); }
                else await page.locator(sel).first().click({ force: true, timeout: 8000 });
                await sleep(400); await settle(); await sleep(150);
            };
            const checkGeo = (g, what) => {
                ok(g.open && g.count === 1, P + what + ' bloom open, exactly one');
                if (!g.open) return;
                ok(g.onScreen, P + what + ' every orb on screen' + (g.onScreen ? '' : ' ' + JSON.stringify(g.orbs.map(o => [o.id, Math.round(o.l), Math.round(o.t), Math.round(o.r), Math.round(o.b)])) + ' vp ' + g.vw + 'x' + g.vh));
                ok(g.mistyClear && g.mistyRectFree, P + what + ' no orb on Misty');
                ok(g.outward, P + what + ' orbs sit outward of the bubble (rot ' + (g.rot || 0).toFixed(2) + ')');
                ok(g.apart, P + what + ' orbs do not overlap' + (g.apart ? '' : ' ' + JSON.stringify(g.orbs.map(o => [o.id, Math.round(o.x), Math.round(o.y), Math.round(o.w)])) + ' vp ' + g.vw + 'x' + g.vh + ' cls ' + g.cls + ' L ' + JSON.stringify(g.L)));
                ok(!g.emoji, P + what + ' no emoji');
            };

            /* ---- Water ---- */
            const w0 = await page.evaluate(() => { const k = window.LowiHomeBloomsV2.core.dayKey(); return (JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}').water || {})[k] || 0; });
            await tap('[data-orbit="water"]');
            let g = await page.evaluate(probe);
            checkGeo(g, 'water');
            await page.screenshot({ path: path.join(OUT, name + '-water.png') });
            ok(g.kind === 'water' && g.orbs.map(o => o.id).join() === 'add,undo', P + 'water orbs = +1 cup, Undo (' + g.orbs.map(o => o.text).join(' | ') + ')');
            const cups = () => page.evaluate(() => { const k = window.LowiHomeBloomsV2.core.dayKey(), f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'), s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); return { c: (f.water || {})[k] || 0, xp: (s.ledger || []).filter(e => e.day === k && e.src === 'water').length }; });
            let c = await cups();
            ok(c.c === w0, P + 'tapping the Water bubble only opened the bloom (old cell handler did not log a cup): ' + w0 + ' -> ' + c.c);
            await tap('#hb2Bloom [data-id="add"]');
            let c2 = await cups();
            ok(c2.c === c.c + 1, P + '+1 cup adds one cup ' + c.c + ' -> ' + c2.c + ' (water XP entries ' + c2.xp + ')');
            g = await page.evaluate(probe);
            ok(g.open && g.kind === 'water' && g.orbs[0].text.includes(c2.c + ' / 6'), P + 'bloom stays open and shows ' + c2.c + ' / 6: ' + (g.orbs[0] || {}).text);
            await tap('#hb2Bloom [data-id="undo"]');
            let c3 = await cups();
            ok(c3.c === c2.c - 1, P + 'Undo takes one cup off ' + c2.c + ' -> ' + c3.c);
            ok(c3.xp <= c3.c && c3.xp <= c2.xp, P + 'water XP after Undo (' + c3.xp + ') not above cups (' + c3.c + ')');
            for (let i = 0; i < 8; i++) { const d = await page.locator('#hb2Bloom [data-id="undo"]').isDisabled(); if (d) break; await tap('#hb2Bloom [data-id="undo"]'); }
            let c4 = await cups();
            ok(c4.c === 0 && c4.xp === 0, P + 'Undo stops at 0 cups and 0 water XP (' + c4.c + ', ' + c4.xp + ')');
            ok(await page.locator('#hb2Bloom [data-id="undo"]').isDisabled(), P + 'Undo is disabled at 0');
            const yday = await page.evaluate(() => { const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); return f.last > 0; });
            ok(yday, P + 'Undo left the meal-gap start alone');
            await page.locator('#hb2Bloom .hb2-scrim').click({ position: { x: 5, y: 5 }, force: true }); await sleep(500);
            ok(!(await page.evaluate(probe)).open, P + 'tap outside closes the bloom');

            /* ---- only one at a time ---- */
            await page.evaluate(() => { window.LowiHomeBloomsV2.open('move'); window.LowiHomeBloomsV2.open('gap'); }); await sleep(500);
            g = await page.evaluate(probe);
            ok(g.count === 1 && g.kind === 'gap', P + 'opening a second bloom closes the first');
            await closeAll();

            /* ---- Gap ---- */
            await tap('[data-orbit="gap"]');
            g = await page.evaluate(probe);
            checkGeo(g, 'gap');
            await page.screenshot({ path: path.join(OUT, name + '-gap.png') });
            ok(g.orbs.map(o => o.id).join() === 'ate,earlier', P + 'gap orbs = I just ate, Ate earlier (' + g.orbs.map(o => o.text).join(' | ') + ')');
            ok(/gap 3 h 1[23] m/.test(g.orbs[0].text) && !/goal|16 ?h|fast/i.test(g.orbs.map(o => o.text).join(' ')), P + 'gap shows time since last meal, no goal');
            await tap('#hb2Bloom [data-id="earlier"]');
            ok(await page.evaluate(() => !!document.getElementById('fstSheet')), P + 'Ate earlier opens the when-did-you-eat sheet');
            await page.screenshot({ path: path.join(OUT, name + '-gap-earlier.png') });
            await closeAll();
            const before = await page.evaluate(fastStore);
            await tap('[data-orbit="gap"]');
            await tap('#hb2Bloom [data-id="ate"]');
            await sleep(600);
            const after = await page.evaluate(fastStore);
            ok(after.last > before.last && Date.now() - after.last < 120000, P + 'I just ate moves the last meal to now');
            await closeAll();

            /* ---- Move ---- */
            await tap('[data-orbit="move"]');
            g = await page.evaluate(probe);
            checkGeo(g, 'move');
            await page.screenshot({ path: path.join(OUT, name + '-move.png') });
            ok(g.orbs.map(o => o.id).join() === 'quick,medium,long,epic', P + 'move orbs = Quick Medium Long Epic (' + g.orbs.map(o => o.text).join(' | ') + ')');
            const mv0 = await page.evaluate(() => (JSON.parse(localStorage.getItem('lowispike.v2') || '{}').ledger || []).filter(e => /^move/.test(e.src || '')).length);
            await tap('#hb2Bloom [data-id="quick"]');
            await sleep(800);
            const mv1 = await page.evaluate(() => (JSON.parse(localStorage.getItem('lowispike.v2') || '{}').ledger || []).filter(e => /^move/.test(e.src || '')).length);
            ok(mv1 === mv0 + 1, P + 'Quick logs one move estimate (' + mv0 + ' -> ' + mv1 + ')');
            await closeAll();

            /* ---- Fuel ---- */
            await tap('[data-orbit="fuel"]');
            g = await page.evaluate(probe);
            checkGeo(g, 'fuel');
            await page.screenshot({ path: path.join(OUT, name + '-fuel.png') });
            const fuelTxt = g.orbs.map(o => o.text).join(' | ');
            ok(g.orbs.map(o => o.id).join() === 'step,snack,swap,cook', P + "fuel orbs = Today's step, Snack, Swap, Cook (" + fuelTxt + ')');
            ok(!/\bAgain\b|\bPhoto\b/.test(fuelTxt), P + 'no Again / Photo labels');
            const fuelCase = async (id, check, what) => {
                await closeAll();
                await tap('[data-orbit="fuel"]');
                await tap('#hb2Bloom [data-id="' + id + '"]');
                await sleep(700);
                const r = await page.evaluate(check);
                ok(r, P + what);
                await page.screenshot({ path: path.join(OUT, name + '-fuel-' + id + '.png') });
            };
            await fuelCase('swap', () => { const s = document.getElementById('sos'); return !!(s && s.classList.contains('open')); }, 'Swap opens Craving SOS');
            await fuelCase('snack', () => !!document.querySelector('.stp-ov'), 'Snack opens What can I buy here?');
            await fuelCase('step', () => !!document.querySelector('.sp-pick'), "Today's step opens Misty's pick (Cook it / Log this)");
            await fuelCase('cook', () => { const t = document.getElementById('tab-shelf'); return !!(t && t.classList.contains('active')); }, 'Cook opens the Cook tab');
            await page.evaluate(() => window.goTab && window.goTab('home')); await sleep(900);
            await closeAll();
            /* hold Fuel = meal log sheet (photo / scan / recent), the deeper food route */
            const fb = await page.locator('[data-orbit="fuel"]').first().boundingBox();
            if (fb) {
                if (await covered('[data-orbit="fuel"]')) {
                    log.push('     ' + P + 'fuel bubble under another element (old Home layout), holding via element pointer events');
                    await page.evaluate(() => { const e = document.querySelector('[data-orbit="fuel"]'), r = e.getBoundingClientRect(), o = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1 }; e.dispatchEvent(new PointerEvent('pointerdown', o)); setTimeout(() => { e.dispatchEvent(new PointerEvent('pointerup', o)); e.dispatchEvent(new MouseEvent('click', o)); }, 800); });
                    await sleep(1700);
                } else { await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2); await page.mouse.down(); await sleep(800); await page.mouse.up(); await sleep(800); }
                const held = await page.evaluate(() => ({ bloom: !!document.getElementById('hb2Bloom'), sheet: [...document.querySelectorAll('.r3-ov,.r2-ov,.bt-ov,[role="dialog"]')].some(e => e.offsetWidth && /meal|Mahlzeit|photo|Foto|scan/i.test(e.innerText)) }));
                ok(!held.bloom && held.sheet, P + 'hold Fuel opens the meal log (history/photo stays reachable)');
                await page.screenshot({ path: path.join(OUT, name + '-fuel-hold.png') });
            }
            ok(errs.filter(e => /hb2|HomeBlooms|home-blooms/i.test(e)).length === 0, P + 'no page errors from the module ' + errs.slice(0, 3).join(' / '));
            log.push('     ' + P + 'blocked non-GET/other-host requests: ' + blocked);
        } catch (e) { fails.push(P + 'crashed: ' + (e && e.stack || e)); }
        await browser.close();
    }
    srv.close();
    console.log(log.join('\n'));
    if (fails.length) { console.log('\nFAILED ' + fails.length + ':\n' + fails.join('\n')); process.exit(1); }
    console.log('\nPASS home-blooms-v2-live, shots in ' + OUT);
})();
