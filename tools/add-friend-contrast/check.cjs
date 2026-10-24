/* Add friend button contrast in a real browser (Oct 24, 2026; tests/add-friend-contrast.test.cjs pins the CSS).
   Opens the Friends Tree, then reads the rendered .cr-go text colour against the lightest and darkest stop of its
   bubble in the normal, focus and pressed states, in the dark and the light theme. Simulated browser only.
   Usage: node tools/add-friend-contrast/check.cjs [base-url]   (default: serve this checkout locally)
   ENG=webkit|chromium (default webkit, falls back to chromium when WebKit is not installed), PW=path to playwright. */
'use strict';
const path = require('path'), http = require('http'), fs = require('fs');
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
function rgb(s) { const m = String(s).match(/rgba?\(([^)]+)\)/); return m ? m[1].split(',').slice(0, 3).map(Number) : null; }
function lum(c) { const a = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
async function main() {
    let base = process.argv[2], srv = null;
    if (!base) {
        srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
        await new Promise(ok => srv.listen(0, ok));
        base = 'http://localhost:' + srv.address().port + '/';
    }
    let eng = process.env.ENG || 'webkit', browser;
    try { browser = await pw[eng].launch(); } catch (e) { console.log('(' + eng + ' not available: ' + String(e.message).split('\n')[0] + '; using chromium)'); eng = 'chromium'; browser = await pw.chromium.launch(); }
    let fails = 0;
    for (const theme of ['dark', 'light']) {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: eng !== 'firefox', hasTouch: true, serviceWorkers: 'block' });
        await ctx.route(/supabase|googleapis|gstatic/, r => r.abort());
        await ctx.addInitScript(() => { try { localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowispike.v2', JSON.stringify({ setupDone: true, onboarded: true, xp: 40, ledger: [], user: { name: 'Contrast Check', bday: '1990-01-01' } })); } catch (e) {} });
        const page = await ctx.newPage();
        await page.goto(base, { waitUntil: 'load', timeout: 120000 });
        await page.waitForFunction(() => window.LowiCellRoom && window.LowiCellRoom.openTree, null, { timeout: 60000 });
        await page.evaluate(t => { document.documentElement.setAttribute('data-theme', t); LowiCellRoom.openTree(); }, theme);
        await page.waitForSelector('.cr-go', { timeout: 15000 });
        const read = () => page.evaluate(() => { const b = document.querySelector('.cr-go'), s = getComputedStyle(b); return { color: s.color, bg: s.backgroundColor, img: s.backgroundImage }; });
        const states = {};
        states.normal = await read();
        await page.focus('.cr-go'); states.focus = await read();
        const bb = await page.locator('.cr-go').boundingBox();
        await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); states.pressed = await read(); await page.mouse.up();
        for (const [k, v] of Object.entries(states)) {
            const fg = rgb(v.color), stops = (v.img.match(/rgba?\([^)]+\)/g) || [v.bg]).map(rgb).filter(Boolean);
            const worst = Math.min(...stops.map(s => ratio(fg, s)));
            const ok = worst >= 4.5;
            if (!ok) fails++;
            console.log((ok ? 'PASS' : 'FAIL') + ' ' + eng + ' ' + theme + ' ' + k + ': text ' + v.color + ', worst ' + worst.toFixed(2) + ':1 against the bubble');
        }
        await ctx.close();
    }
    await browser.close();
    if (srv) srv.close();
    process.exit(fails ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
