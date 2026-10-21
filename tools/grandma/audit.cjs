'use strict';
/* "Drunk grandma test" copy audit: node tools/grandma/audit.cjs [--url URL] [--root DIR] [--out DIR] [--lang en] [--shots 1]
   Opens Home, then each everyday surface (Scan, Log meal, Gap, Water, Move, Sleep) at iPhone 13 size with a stubbed backend,
   and prints every visible text line so each label can be checked: does it say what it is and what you get? */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, '/tmp/pw/node_modules/playwright', path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), OUT = path.resolve(arg('out', '/tmp/grandma-out'));
const LANG = arg('lang', 'en'), DEV = arg('device', 'iPhone 13');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const BASE = '/lowispike/', sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() {
    return new Promise(r => {
        const s = http.createServer((q, res) => {
            let u = decodeURIComponent(q.url.split('?')[0]);
            if (!u.startsWith(BASE)) { res.writeHead(404); res.end(); return; }
            u = u.slice(BASE.length - 1); if (u === '/' || u.endsWith('/')) u += 'index.html';
            const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
            fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(b); });
        });
        s.listen(0, '127.0.0.1', () => r({ s, url: `http://127.0.0.1:${s.address().port}${BASE}` }));
    });
}
const msrc = fs.readFileSync(path.join(ROOT, 'tools/startup/measure.cjs'), 'utf8');
const INIT_SRC = msrc.slice(msrc.indexOf('const INIT = () => {') + 'const INIT = '.length, msrc.indexOf('\n};\n', msrc.indexOf('const INIT = () => {')) + 2);
const PRE = `(() => { try {
  localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Tester', bday: '1990-03-05', tags: [] }, xp: 1254, ledger: [], logs: [{ id: 'l1', t: 'Oat porridge', ts: Date.now() - 5 * 36e5, macros: { kcal: 320, protein: 11, carbs: 52, sugar: 6, fiber: 7, fat: 7 } }], saved: [], settings: { lang: '${LANG}' } }));
  localStorage.setItem('lowispike.companion.v1', JSON.stringify({ v: 1, bday: '1990-03-05', btime: '07:45', n: 0, name: 'Misty', created: 1 }));
  localStorage.setItem('lowi.hint.communityHold', '1'); localStorage.setItem('lowispike.lang', '${LANG}');
  ${arg('nogap', '') ? '' : "localStorage.setItem('lowi_fast_v1', JSON.stringify({ last: Date.now() - 5 * 36e5 - 12 * 6e4 }));"}
} catch (e) { } })();`;
function visibleText() {
    const out = [], seen = new Set();
    const walk = n => {
        for (const c of n.childNodes) {
            if (c.nodeType === 3) {
                const t = c.textContent.replace(/\s+/g, ' ').trim(); if (!t) continue;
                const el = c.parentElement; if (!el) continue;
                const r = el.getBoundingClientRect(), s = getComputedStyle(el);
                if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth || s.visibility === 'hidden' || +s.opacity < 0.05) continue;
                let p = el, hid = false; while (p && p !== document.body) { const ps = getComputedStyle(p); if (ps.display === 'none' || +ps.opacity < 0.05 || p.hidden) { hid = true; break; } p = p.parentElement; }
                if (hid) continue;
                const key = t + '|' + Math.round(r.top / 4);
                if (seen.has(key)) continue; seen.add(key);
                out.push({ y: Math.round(r.top), x: Math.round(r.left), t, sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') });
            } else if (c.nodeType === 1 && !/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT)$/.test(c.tagName)) walk(c);
        }
    };
    walk(document.body);
    out.sort((a, b) => a.y - b.y || a.x - b.x);
    return out;
}
(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    let url = arg('url', ''), srv = null;
    if (!url) { srv = await serve(); url = srv.url; }
    const browser = await pw.chromium.launch();
    const ctx = await browser.newContext(Object.assign({}, pw.devices[DEV], { colorScheme: 'dark', serviceWorkers: 'block' }));
    await ctx.addInitScript(PRE); await ctx.addInitScript('(' + INIT_SRC + ')()');
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e.message || e)));
    await page.goto(url + '?ga=' + Date.now(), { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') || window.LowiSpirit, null, { timeout: 40000 }).catch(() => { });
    await sleep(4000);
    const build = await page.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || '');
    const res = { build, surfaces: {} };
    const grab = async name => { res.surfaces[name] = await page.evaluate(visibleText); if (arg('shots', '') === '1') await page.screenshot({ path: path.join(OUT, name + '.png') }); };
    await grab('home');
    const taps = arg('taps', '').split(',').filter(Boolean);
    for (const k of taps) {
        await page.goto(url + '?ga=' + Date.now(), { waitUntil: 'load' });
        await page.waitForFunction(() => document.querySelector('[data-orbit="fuel"]'), null, { timeout: 40000 }).catch(() => { });
        await sleep(3500);
        let failed = false;
        for (const step of k.split('>')) {
            const [sel, how] = step.split('~');
            const css = /^[a-z]+$/.test(sel) ? '[data-orbit="' + sel + '"]' : sel;
            try {
                if (how === 'hold') { const b = await page.locator(css).first().boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await sleep(900); await page.mouse.up(); }
                else await page.locator(css).first().click({ timeout: 5000, force: true });
            } catch (e) { res.surfaces[k] = [{ y: 0, x: 0, t: 'TAP FAILED ' + step + ' ' + e.message.slice(0, 120), sel: '' }]; failed = true; break; }
            await sleep(1500);
        }
        if (failed) continue;
        await sleep(2200);
        await grab(k.replace(/\W+/g, '_'));
    }
    const extra = arg('eval', '');
    if (extra) { res.evalOut = await page.evaluate(extra); await sleep(1500); await grab('custom'); }
    console.log(JSON.stringify(Object.assign(res, { errs }), null, 0));
    await browser.close(); if (srv) srv.s.close();
})().catch(e => { console.error(e); process.exit(1); });
