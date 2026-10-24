'use strict';
/* Fuel bloom live check for words and motion (Oct 18, 2026): Shop / Cook / Log meal in English, German and Spanish, with
   reduced motion on, at iPhone 390x844 (Chromium and WebKit iPhone 13) and iPad landscape (WebKit).
   Checks: exactly the three orbs; icon, label and subline fully inside each round orb (German "Mahlzeit eintragen" wraps,
   never cut) and no subline cut with an ellipsis; reduced motion opens the bloom with no running animation; default motion
   settles fully opaque; no page errors from the module. Views: 390x844, 375x812, 375x667, WebKit iPhone 13, WebKit iPad. Backend blocked: only GETs
   to the local server pass. Main behaviour check: tests/home-blooms-v2-live.cjs. Usage: node tests/ui-fuel-live.cjs [--out DIR] */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(path.join(__dirname, '..')), OUT = arg('out', '/tmp/ui-fuel-shots');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const PHONE = (w, h) => ({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
/* TESTING.md matrix: 390x844, 375x812, 375x667, plus the separate iPad layout; each in default motion and reduced motion */
const VIEWS = { iphone_chromium: ['chromium', PHONE(390, 844)], iphone375x812_chromium: ['chromium', PHONE(375, 812)], iphone375x667_chromium: ['chromium', PHONE(375, 667)], iphone13_webkit: ['webkit', 'iPhone 13'], ipad_landscape_webkit: ['webkit', IPAD] };
const MOTIONS = ['reduce', 'no-preference'];
/* Oct 24 2026 (Emmanuel: one word per bubble): Log meal became Meal */
const WORDS = { en: ['Shop', 'Cook', 'Meal'], de: ['Einkaufen', 'Kochen', 'Mahlzeit'], es: ['Comprar', 'Cocinar', 'Comida'] };
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
} catch (e) { }`;

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = await serve(), host = '127.0.0.1:' + srv.address().port, url = 'http://' + host + '/';
    const fails = [], log = [];
    const ok = (c, m) => { if (!c) fails.push(m); log.push((c ? 'ok   ' : 'FAIL ') + m); };
    for (const name of Object.keys(VIEWS)) for (const motion of MOTIONS) {
        const [eng, devName] = VIEWS[name], dev = typeof devName === 'string' ? pw.devices[devName] : devName;
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block', reducedMotion: motion }));
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage();
        const errs = []; page.on('pageerror', e => errs.push(String(e && e.message || e)));
        const P = name + (motion === 'reduce' ? ' reduced' : ' default') + ': ';
        try {
            await page.goto(url + '?uf=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => !!(window.LowiHomeBloomsV2 && window.LowiLang && document.querySelector('[data-orbit="fuel"]')), null, { timeout: 90000 });
            await sleep(2500);
            ok(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches) === (motion === 'reduce'), P + 'motion setting applied');
            for (const lang of Object.keys(WORDS)) {
                await page.evaluate(l => { window.LowiHomeBloomsV2.close(); try { window.LowiLang.set(l); } catch (e) { document.documentElement.lang = l; } }, lang);
                await sleep(500);
                const opened = await page.evaluate(() => { window.LowiHomeBloomsV2.mount(document); return window.LowiHomeBloomsV2.open('fuel'); });
                ok(opened, P + lang + ' Fuel bloom opens');
                const probe = () => {
                    const ov = document.getElementById('hb2Bloom'); if (!ov) return null;
                    const anim = ov.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length;
                    const orbs = [...ov.querySelectorAll('.hb2-orb')].map(o => { const r = o.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2; const inside = [...o.querySelectorAll('b,small,svg')].every(b => { const q = b.getBoundingClientRect(); return [[q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]].every(([x, y]) => Math.hypot(x - cx, y - cy) <= R + 1); }); const sm = o.querySelector('small'); return { id: o.dataset.id, label: o.querySelector('b').innerText.replace(/\s+/g, ' ').trim(), sub: sm ? sm.textContent : '', cut: !!sm && sm.scrollWidth > sm.clientWidth + 1, inside, op: getComputedStyle(o).opacity, w: Math.round(r.width) }; });
                    return { anim, orbs };
                };
                const r0 = await page.evaluate(probe);
                if (motion === 'reduce') ok(r0 && r0.anim === 0 && r0.orbs.every(o => +o.op === 1), P + lang + ' reduced motion: shown at once, no running animation (' + (r0 && r0.anim) + ')');
                await sleep(motion === 'reduce' ? 100 : 1400);
                const r = await page.evaluate(probe);
                ok(r && r.orbs.map(o => o.label).join('|') === WORDS[lang].join('|'), P + lang + ' orbs ' + JSON.stringify(r && r.orbs.map(o => o.label)));
                ok(r && r.orbs.every(o => o.inside), P + lang + ' icon, label and subline inside each orb ' + JSON.stringify(r && r.orbs.map(o => [o.id, o.inside, o.w])));
                ok(r && r.orbs.every(o => !o.cut), P + lang + ' no subline cut ' + JSON.stringify(r && r.orbs.map(o => [o.id, o.sub, o.cut])));
                ok(r && r.orbs.every(o => +o.op >= 0.99), P + lang + ' settled fully visible ' + JSON.stringify(r && r.orbs.map(o => [o.id, o.op])));
                await page.screenshot({ path: path.join(OUT, name + '-' + motion + '-fuel-' + lang + '.png') });
                await page.evaluate(() => window.LowiHomeBloomsV2.close()); await sleep(300);
            }
            await page.evaluate(() => { try { window.LowiLang.set('en'); } catch (e) { } });
            ok(errs.filter(e => /hb2|HomeBlooms|home-blooms/i.test(e)).length === 0, P + 'no page errors from the module ' + errs.slice(0, 3).join(' / '));
        } catch (e) { fails.push(P + 'crashed: ' + (e && e.stack || e)); }
        await browser.close();
    }
    srv.close();
    console.log(log.join('\n'));
    if (fails.length) { console.log('\nFAILED ' + fails.length + ':\n' + fails.join('\n')); process.exit(1); }
    console.log('\nPASS ui-fuel-live, shots in ' + OUT);
})();
