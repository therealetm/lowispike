'use strict';
/* Bloom labels live check (Oct 24 2026, Lisa: "Flasch" on one line, "e" on the next).
   Real app, local static server (or --url for the live site), every non-GET and every other host blocked. App language German.
   Opens the Water bloom (Ein paar Schlucke / Glas / Flasche) and the all-bubbles bloom, then for every orb label checks:
   - no word is split over two lines (each word's text range has one line box)
   - no word sticks out of its label box, font size never below 10px
   Views: iPhone 13 WebKit (390x844) and Chromium 390x844. Screenshots in --out (default /tmp/bloom-labels).
   Usage: node tests/bloom-labels-live.cjs [--root DIR | --url https://therealetm.github.io/lowispike/] [--out DIR]. Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/bloom-labels'), LIVE = arg('url', '');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const VIEWS = { iphone13_webkit: ['webkit', 'iPhone 13'], iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }] };

const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowispike.lang', 'de');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
} catch (e) { }`;

/* every word of every orb label: how many line boxes it takes, and whether it fits its label box */
const PROBE = () => {
    const ov = document.getElementById('hb2Bloom');
    if (!ov) return { open: false };
    const out = [];
    ov.querySelectorAll('.hb2-tx b').forEach(b => {
        const t = b.firstChild; if (!t || t.nodeType !== 3) return;
        const s = t.textContent, cs = getComputedStyle(b);
        const re = /\S+/g; let m; const words = [];
        while ((m = re.exec(s))) {
            const r = document.createRange(); r.setStart(t, m.index); r.setEnd(t, m.index + m[0].length);
            const tops = new Set([...r.getClientRects()].filter(x => x.width > 0.5).map(x => Math.round(x.top)));
            words.push({ w: m[0], lines: tops.size });
        }
        out.push({ id: b.closest('.hb2-orb').dataset.id, text: s, words, font: parseFloat(cs.fontSize), fits: b.scrollWidth <= b.clientWidth + 1, sw: b.scrollWidth, cw: b.clientWidth, max: cs.maxWidth, wb: cs.wordBreak, ow: cs.overflowWrap });
    });
    return { open: true, kind: ov.dataset.kind, orb: getComputedStyle(ov).getPropertyValue('--hb2-orb'), labels: out };
};

(async () => {
    const srv = LIVE ? null : await serve();
    const url = LIVE || ('http://127.0.0.1:' + srv.address().port + '/');
    const host = new URL(url).host;
    fs.mkdirSync(OUT, { recursive: true });
    let fails = 0; const log = [];
    const ok = (c, m) => { log.push((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };
    for (const name of Object.keys(VIEWS)) {
        const [eng, d] = VIEWS[name];
        const dev = typeof d === 'string' ? pw.devices[d] : d;
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage();
        const errs = []; page.on('pageerror', e => errs.push(String(e && e.message || e)));
        const P = name + ': ';
        try {
            await page.goto(url + '?bl=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => window.LowiHomeBloomsV2 && document.querySelector('[data-orbit="water"]'), null, { timeout: 90000 });
            await sleep(3000);
            const vp = await page.evaluate(() => [innerWidth, innerHeight, (window.LowiLang && LowiLang.get()) || '?', (document.querySelector('meta[name="lowi-build"]') || {}).content || '']);
            ok(vp[0] === 390 && vp[1] >= 660, P + 'viewport ' + vp[0] + 'x' + vp[1]);
            ok(vp[2] === 'de', P + 'app language ' + vp[2]);
            const clear = () => page.evaluate(() => { try { window.LowiHomeBloomsV2.close(true); } catch (e) { } document.querySelectorAll('.r3-ov,.r3m-ov,.stp-ov,.r2-ov,.bt-ov,#g1Tour,.ob-ov,.lw-ov').forEach(e => e.remove()); });
            for (const kind of ['water', 'all']) {
                await clear(); await sleep(500);
                const opened = await page.evaluate(k => k === 'all' ? window.LowiHomeBloomsV2.openAll() : window.LowiHomeBloomsV2.open(k), kind);
                ok(opened, P + kind + ' bloom opens');
                await sleep(1600);
                const g = await page.evaluate(PROBE);
                if (!g.open) { ok(false, P + kind + ' bloom in the page'); continue; }
                await page.screenshot({ path: path.join(OUT, name + '-' + kind + '.png') });
                log.push('     ' + P + kind + ' orb ' + g.orb.trim() + ': ' + g.labels.map(l => l.text + ' (' + l.font + 'px)').join(' | '));
                ok(g.labels.length > 0, P + kind + ' has labels');
                const split = g.labels.flatMap(l => l.words.filter(w => w.lines !== 1).map(w => l.id + ':' + w.w + ' on ' + w.lines + ' lines'));
                ok(!split.length, P + kind + ' no word split over two lines' + (split.length ? ' ' + JSON.stringify(split) : ''));
                const out = g.labels.filter(l => !l.fits).map(l => l.id + ' ' + l.sw + '>' + l.cw);
                ok(!out.length, P + kind + ' every word fits its label' + (out.length ? ' ' + JSON.stringify(out) : ''));
                ok(g.labels.every(l => l.font >= 10), P + kind + ' font never below 10px');
                if (kind === 'water') {
                    const fl = g.labels.find(l => /Flasche/.test(l.text));
                    ok(fl && fl.words.every(w => w.lines === 1), P + '"Flasche" sits on one line' + (fl ? ' (' + fl.font + 'px, ' + fl.ow + '/' + fl.wb + ')' : ' (label missing)'));
                }
            }
            /* a squeezed orb: the long word shrinks instead of splitting, never below 10px */
            await clear(); await sleep(500);
            await page.evaluate(() => window.LowiHomeBloomsV2.open('water')); await sleep(1200);
            const sq = await page.evaluate(() => { const ov = document.getElementById('hb2Bloom'); ov.style.setProperty('--hb2-orb', '54px'); window.LowiHomeBloomsV2.refresh ? window.LowiHomeBloomsV2.refresh() : null; return true; });
            await page.evaluate(() => { const ov = document.getElementById('hb2Bloom'); const fit = window.LowiHomeBloomsV2.fitLabels; if (fit) fit(ov); });
            const g2 = await page.evaluate(PROBE);
            const fl2 = g2.labels && g2.labels.find(l => /Flasche/.test(l.text));
            log.push('     ' + P + 'squeezed 54px orb: ' + (g2.labels || []).map(l => l.text + ' (' + l.font + 'px, ' + l.sw + '/' + l.cw + ')').join(' | '));
            ok(sq && fl2 && fl2.words.every(w => w.lines === 1) && fl2.font >= 10 && fl2.font < 12.5, P + 'squeezed orb: "Flasche" shrinks to ' + (fl2 && fl2.font) + 'px and stays on one line');
            await page.screenshot({ path: path.join(OUT, name + '-squeezed.png') });
            ok(!errs.length, P + 'no page errors' + (errs.length ? ' ' + JSON.stringify(errs.slice(0, 3)) : ''));
        } catch (e) { ok(false, P + 'run: ' + (e && e.message || e)); }
        await browser.close();
    }
    if (srv) srv.close();
    console.log(log.join('\n'));
    console.log(fails ? 'FAIL ' + fails : 'PASS');
    process.exit(fails ? 1 : 0);
})();
