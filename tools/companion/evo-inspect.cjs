'use strict';
/* setup shared with evo-forms.cjs */
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
/* evo-inspect.cjs (Oct 21 2026): layout checks on Home and the Forms sheet at the user's state, plus a capture of only the
   Evolution path (reached forms and the mystery placeholders, no locked art).
   node tools/companion/evo-inspect.cjs [--devices "iPhone SE,iPhone 13"] [--url URL] [--out DIR] [--engine webkit]
   Writes <out>/<device>-home.png, -sheet.png, -path.png and prints one JSON report per device. */
const K_SRC = `window.__K = (() => {
  const vw = () => innerWidth, vh = () => innerHeight, R = r => [r.left, r.top, r.right, r.bottom].map(v => Math.round(v));
  const name = e => { if (!e) return ''; const c = e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className; return String(e.id || c || e.tagName).slice(0, 48); };
  const visible = el => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .05; };
  const clipBy = el => { const r = el.getBoundingClientRect(), hits = []; for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) { const s = getComputedStyle(p); if (/(hidden|clip|auto|scroll)/.test(s.overflowX + s.overflowY)) { const q = p.getBoundingClientRect(), cut = Math.max(q.left - r.left, r.right - q.right, q.top - r.top, r.bottom - q.bottom); if (cut > 1 && !/(auto|scroll)/.test(s.overflowY)) hits.push(name(p) + ':' + Math.round(cut)); } } return hits; };
  const art = svg => { const m = svg.getScreenCTM(), vb = svg.viewBox.baseVal; if (!m || !vb || !vb.width) return {}; const x0 = vb.x * m.a + m.e, y0 = vb.y * m.d + m.f, x1 = (vb.x + vb.width) * m.a + m.e, y1 = (vb.y + vb.height) * m.d + m.f; let worst = -1e9, who = '';
    svg.querySelectorAll('.cf-back > *, .cf-front > *').forEach(n => { if (/cf-rx|cf-calm|cf-aura/.test(n.getAttribute('class') || '')) return; const r = n.getBoundingClientRect(); if (!r.width) return; const o = Math.max(x0 - r.left, r.right - x1, y0 - r.top, r.bottom - y1) / m.a; if (o > worst) { worst = o; who = n.getAttribute('class'); } });
    const b = svg.querySelector('.cf-back'), st = b ? ((b.getAttribute('class') || '').match(/cf-st(\\\\d)/) || [])[1] : null;
    const body = svg.querySelector('.cell-body, .cw-body, ellipse, circle'); return { st, box: R(svg.getBoundingClientRect()), overflowUnits: Math.round(worst), worst: who, pxPerUnit: +m.a.toFixed(3) }; };
  const textOverflow = root => [...root.querySelectorAll('b, em, span, p, h2, h3, button, small')].filter(e => visible(e) && e.children.length === 0 && e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1).map(e => name(e) + ' "' + e.textContent.trim().slice(0, 24) + '" ' + e.scrollWidth + '>' + e.clientWidth);
  const overlaps = els => { const out = []; const rs = els.map(e => [e, e.getBoundingClientRect()]).filter(x => x[1].width > 2 && x[1].height > 2); for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i][1], b = rs[j][1], w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (w > 2 && h > 2 && !rs[i][0].contains(rs[j][0]) && !rs[j][0].contains(rs[i][0])) out.push(name(rs[i][0]) + ' x ' + name(rs[j][0]) + ' ' + Math.round(w) + 'x' + Math.round(h)); } return out; };
  return { vw, vh, R, name, visible, clipBy, art, textOverflow, overlaps };
})();`;
const sleep2 = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    if (!pw) { console.error('playwright not found'); process.exit(2); }
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url') ? null : await serve(), url = arg('url') || srv.url;
    const br = await pw[ENGINE].launch();
    for (const dev of DEVICES) {
        const ctx = await br.newContext(Object.assign({}, pw.devices[dev], { colorScheme: 'dark', reducedMotion: 'reduce' }));
        await ctx.addInitScript(PRE); await ctx.addInitScript('(' + INIT_SRC + ')()');
        const page = await ctx.newPage(), errs = [], tag = dev.replace(/[^a-z0-9]+/gi, '-');
        page.on('pageerror', e => errs.push(String(e && e.message || e)));
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForFunction(() => window.LowiHerbTamagotchi && window.LowiCompanion && window.LowiHerbTamagotchi.current && window.LowiHerbTamagotchi.current(), null, { timeout: 30000 }).catch(() => { });
        await sleep2(3000);
        await page.evaluate(K_SRC);
        await page.screenshot({ path: path.join(OUT, tag + '-home.png') });
        const home = await page.evaluate(() => { const K = window.__K, out = [];
            document.querySelectorAll('svg').forEach(svg => { if (!svg.querySelector('.cf-back') || !K.visible(svg)) return; const r = svg.getBoundingClientRect(); if (r.width < 20 || r.bottom < 0 || r.top > K.vh()) return;
                const covers = new Set(); for (const fx of [.35, .5, .65]) for (const fy of [.4, .5, .6]) { const e = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy); if (e && !svg.contains(e) && !e.contains(svg)) covers.add(K.name(e)); }
                out.push(Object.assign(K.art(svg), { docOverflowX: document.documentElement.scrollWidth - innerWidth, holder: K.name(svg.parentElement), clippedBy: K.clipBy(svg), offscreen: r.left < -1 || r.right > K.vw() + 1, coveredBy: [...covers] })); });
            return out; });
        await page.evaluate(() => window.LowiCompanion.open());
        await sleep2(1200);
        const sheet = await page.evaluate(() => { const K = window.__K, ol = document.querySelector('.cf-path'); if (!ol) return { ok: false };
            const root = ol.closest('[role=dialog], .cf-sheet, .sheet') || ol.parentElement; ol.scrollIntoView({ block: 'center' });
            const li = [...ol.children], vw = K.vw();
            return { ok: true, root: K.name(root), steps: li.map((n, i) => ({ i: i + 1, reached: !n.classList.contains('cf-locked'), box: K.R(n.getBoundingClientRect()), text: n.innerText.replace(/\s+/g, ' ').trim().slice(0, 40), art: n.querySelector('svg') ? K.art(n.querySelector('svg')) : null, clipped: K.clipBy(n.querySelector('svg, .cf-mystery') || n) })),
                offscreen: li.filter(n => { const r = n.getBoundingClientRect(); return r.left < -1 || r.right > vw + 1; }).length,
                textOverflow: K.textOverflow(root).filter(x => !/^cf-sr/.test(x)).slice(0, 12), overlaps: K.overlaps(li.flatMap(n => [...n.children])).slice(0, 12),
                brokenWords: li.flatMap(n => [...n.querySelectorAll('b, small, em')].filter(e => !e.classList.contains('cf-sr')).flatMap(e => { const t = e.firstChild; if (!t || t.nodeType !== 3) return []; const out = []; const re = /\\S+/g; let m; while ((m = re.exec(t.data))) { const rg = document.createRange(); rg.setStart(t, m.index); rg.setEnd(t, m.index + m[0].length); const tops = new Set([...rg.getClientRects()].map(q => Math.round(q.top))); if (tops.size > 1) out.push(m[0]); } return out; })),
                spill: li.map(n => { const r = n.getBoundingClientRect(); let w = 0; n.querySelectorAll('*').forEach(c => { const q = c.getBoundingClientRect(); if (q.width) w = Math.max(w, r.left - q.left, q.right - r.right); }); return Math.round(w); }),
                eyesPx: li.map(n => { const s = n.querySelector('svg'); if (!s) return null; const e = s.querySelector('[class*=eye] ellipse, [class*=eye] circle, .cf-eye, [class*=eye]'); return e ? +e.getBoundingClientRect().width.toFixed(1) : 'none'; }),
                leak: li.filter(n => n.classList.contains('cf-locked') && n.querySelector('svg, img, canvas')).length }; });
        await sleep2(500);
        await page.screenshot({ path: path.join(OUT, tag + '-sheet.png') });
        /* the path capture: the "Evolution path" heading through the last tile, with a little margin */
        const clip = await page.evaluate(() => { const ol = document.querySelector('.cf-path'); let top = ol.getBoundingClientRect().top; const h = ol.previousElementSibling; if (h && /^H[23]$/.test(h.tagName)) top = h.getBoundingClientRect().top; const r = ol.getBoundingClientRect(); return { x: 0, y: Math.max(0, top - 12), width: innerWidth, height: Math.min(innerHeight, r.bottom + 14) - Math.max(0, top - 12) }; });
        await page.screenshot({ path: path.join(OUT, tag + '-path.png'), clip });
        console.log(JSON.stringify({ dev, home, sheet, clip, errs: errs.slice(0, 5) }));
        await ctx.close();
    }
    await br.close(); if (srv) srv.s.close();
})();
