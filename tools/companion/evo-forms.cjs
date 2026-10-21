'use strict';
/* Oct 21 2026 companion evolution redesign: renders the user's own companion at all ten forms (the same plantHTML 'hero' drawing
   Home uses), opens the Forms sheet (Evolution path) and checks that no locked form's art is in the page.
   node tools/companion/evo-forms.cjs [--root DIR] [--url URL] [--xp 1254] [--bday 1990-03-05] [--devices "iPhone 13,iPhone SE"]
          [--engine chromium|webkit] [--out DIR] [--reduce 1]
   Writes <out>/<device>-grid.png and <device>-sheet.png. Exit 1 on page errors or a locked form's art in the sheet. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, '/tmp/pw/node_modules/playwright', path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'evo-forms')));
const XP = +arg('xp', 1254), BDAY = arg('bday', '1990-03-05'), ENGINE = arg('engine', 'chromium'), DEVICES = arg('devices', 'iPhone 13').split(','), REDUCE = arg('reduce', '') === '1';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const BASE = '/lowispike/', sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() {
    return new Promise(r => {
        const s = http.createServer((q, res) => {
            let u = decodeURIComponent(q.url.split('?')[0]);
            if (!u.startsWith(BASE)) { res.writeHead(404); res.end(); return; }
            u = u.slice(BASE.length - 1); if (u === '/') u = '/index.html';
            const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
            fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(b); });
        });
        s.listen(0, '127.0.0.1', () => r({ s, url: `http://127.0.0.1:${s.address().port}${BASE}` }));
    });
}
const msrc = fs.readFileSync(path.join(ROOT, 'tools/startup/measure.cjs'), 'utf8');
const INIT_SRC = msrc.slice(msrc.indexOf('const INIT = () => {') + 'const INIT = '.length, msrc.indexOf('\n};\n', msrc.indexOf('const INIT = () => {')) + 2);
const PRE = `(() => { try {
  localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Emmanuel', bday: '${BDAY}', tags: [] }, xp: ${XP}, ledger: [], logs: [], saved: [], settings: { lang: 'en' } }));
  localStorage.setItem('lowispike.companion.v1', JSON.stringify({ v: 1, bday: '${BDAY}', btime: '07:45', n: 0, name: 'Misty', created: 1 }));
} catch (e) { } })();`;
(async () => {
    if (!pw) { console.error('playwright not found'); process.exit(2); }
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url') ? null : await serve(), url = arg('url') || srv.url;
    const br = await pw[ENGINE].launch();
    let bad = 0;
    for (const dev of DEVICES) {
        const ctx = await br.newContext(Object.assign({}, pw.devices[dev], { colorScheme: 'dark', reducedMotion: REDUCE ? 'reduce' : 'no-preference' }));
        await ctx.addInitScript(PRE); await ctx.addInitScript('(' + INIT_SRC + ')()');
        const page = await ctx.newPage(), errs = [];
        page.on('pageerror', e => errs.push(String(e && e.message || e)));
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForFunction(() => window.LowiHerbTamagotchi && window.LowiCompanion && window.LowiHerbTamagotchi.current && window.LowiHerbTamagotchi.current(), null, { timeout: 30000 }).catch(() => { });
        await sleep(2500);
        const info = await page.evaluate(() => {
            const T = window.LowiHerbTamagotchi, x = T.current(), out = [];
            const d = document.createElement('div'); d.id = 'evoGrid';
            d.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:#071433;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:30px 6px;align-content:start;color:#cfe;font:11px system-ui';
            for (let i = 0; i < 10; i++) {
                const m = Object.assign({}, x.m, { index: i, stage: Object.assign({}, x.m.stage) });
                const c = document.createElement('div'); c.style.cssText = 'height:' + Math.round(innerHeight / 4.6) + 'px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid #234';
                c.innerHTML = T.plantHTML(m, 'hero', x.p) + '<span>' + (i + 1) + '</span>';
                const svg = c.querySelector('svg'); if (svg) { svg.style.width = '100%'; svg.style.height = '88%'; }
                d.appendChild(c);
                const r = svg && svg.querySelector('.cf-back'); out.push({ i, groups: svg ? [...new Set([...svg.querySelectorAll('[class*="cf-"]')].map(n => (n.getAttribute('class') || '').split(' ').find(k => /^cf-/.test(k))))].filter(Boolean).slice(0, 14).join(' ') : 'no svg' });
            }
            document.body.appendChild(d);
            /* every anatomy piece must stay inside the svg's viewBox (1px slack) */
            [...d.querySelectorAll('svg.tmg-plant, svg')].slice(0, 10).forEach((svg, i) => {
                const m = svg.getScreenCTM(), vb = svg.viewBox.baseVal; if (!m || !vb || !out[i]) return;
                const x0 = vb.x * m.a + m.e, y0 = vb.y * m.d + m.f, x1 = (vb.x + vb.width) * m.a + m.e, y1 = (vb.y + vb.height) * m.d + m.f;
                let worst = -1e9, who = '';
                svg.querySelectorAll('.cf-back > *, .cf-front > *').forEach(n => {
                    if (/cf-rx|cf-calm|cf-aura/.test(n.getAttribute('class') || '')) return;
                    const r = n.getBoundingClientRect(); if (!r.width) return;
                    const o = Math.max(x0 - r.left, r.right - x1, y0 - r.top, r.bottom - y1) / m.a;
                    if (o > worst) { worst = o; who = (n.getAttribute('class') || n.tagName); }
                });
                out[i].overflow = Math.round(worst * 10) / 10; /* negative = slack left on the tightest side, in viewBox units */ out[i].worst = who; out[i].vb = [vb.x, vb.y, vb.width, vb.height].map(v => Math.round(v)).join(' ');
            });
            return { el: (window.LowiCompanion.genome && (window.LowiCompanion.genome() || {}).el) || '', idx: x.m.index, forms: out };
        });
        await sleep(400);
        const tag = dev.replace(/[^a-z0-9]+/gi, '-');
        await page.screenshot({ path: path.join(OUT, tag + '-grid.png') });
        await page.evaluate(() => { document.getElementById('evoGrid').remove(); window.LowiCompanion.open(); });
        await sleep(1200);
        const sheet = await page.evaluate(() => {
            const ol = document.querySelector('.cf-path'); if (!ol) return { ok: false, why: 'no path' };
            ol.scrollIntoView({ block: 'center' });
            const li = [...ol.children], locked = li.filter(n => n.classList.contains('cf-locked'));
            const leak = locked.filter(n => n.querySelector('svg, img, canvas, [data-cf-st]')).length;
            return { ok: true, steps: li.length, locked: locked.length, leak, lockedText: locked.slice(0, 2).map(n => n.innerText.replace(/\s+/g, ' ')).join(' | '), name: (document.querySelector('.cf-fname') || {}).textContent };
        });
        await sleep(400);
        await page.screenshot({ path: path.join(OUT, tag + '-sheet.png') });
        console.log(JSON.stringify({ dev, info, sheet, errs: errs.slice(0, 5) }, null, 1));
        if (errs.length || !sheet.ok || sheet.leak || info.forms.some(f => f.overflow > 1)) bad++;
        await ctx.close();
    }
    await br.close(); if (srv) srv.s.close();
    process.exit(bad ? 1 : 0);
})();
