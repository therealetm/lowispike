'use strict';
/* Live check: the liquid inside the ring Home bubbles shares the glass outline (Oct 18, Emmanuel on his iPad: "The liquid in the
   bubble still doesn't match."). Run against the live site (or a local copy):
     node tests/bubble-fill-shape-live.cjs --url https://therealetm.github.io/lowispike/ [--views a,b] [--shots DIR]
     node tests/bubble-fill-shape-live.cjs --root .            (serves this folder)
   For each sampled animation frame it renders, inside one JS task and straight from the world's own renderer, the glass membranes
   alone and the liquid alone, reads the pixels back and compares the two masks per bubble:
     - no liquid pixel outside the glass (1 CSS px of edge softening allowed)
     - in every row the liquid has, its left and right edge lie on the glass edge (within 1 CSS px)
     - a full bubble (Water 8/6) is liquid from glass edge to glass edge, top to bottom
   Old builds have no 3D liquid: their liquid is the flat DOM fill (a CSS circle) or the fasting 2D canvas, measured from the page;
   that is the mismatch this check catches. Also: look() says the liquid is a child of the glass with the same geometry, vertex
   shader and clock, and the flat fill is hidden under it. Fixture is local to the test browser: production writes are blocked. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
let pw; for (const p of ['playwright', '/tmp/pw/node_modules/playwright']) { try { pw = require(p); break; } catch (e) { } }
if (!pw) { console.error('playwright not found'); process.exit(2); }
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), SHOTS = arg('shots', ''), SAMPLES = +arg('samples', 6);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const UA = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const pad = (w, h) => ({ viewport: { width: w, height: h }, screen: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: UA });
const VIEWS = {
  iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }],
  iphone13_webkit: ['webkit', 'iPhone 13'],
  ipad_portrait_chromium: ['chromium', pad(820, 1180)], ipad_portrait_webkit: ['webkit', pad(820, 1180)],
  ipad_landscape_chromium: ['chromium', pad(1180, 820)], ipad_landscape_webkit: ['webkit', pad(1180, 820)] };
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid' } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], settings: { lang: 'en' } }));
  if (!sessionStorage.getItem('fx.fill')) { sessionStorage.setItem('fx.fill', '1'); const w = {}; w[k] = 8; localStorage.setItem('lowi_fast_v1', JSON.stringify({ last: Date.now() - (17 * 60 + 14) * 60e3, target: 16, water: w })); localStorage.removeItem('lowi.home.menubar'); }
} catch (e) { }`;

/* in the page, one JS task: glass alone, liquid alone, read back per bubble */
function measure() {
  const a = window.LowiWorld3D, R = a && a.renderer; if (!R || !a.scene) return { err: 'no 3D world' };
  const g = a.scene.getObjectByName('lowi-living-bubbles'); if (!g) return { err: 'no living bubbles' };
  const gl = R.getContext(), cv = R.domElement, cr = cv.getBoundingClientRect(), sx = cv.width / cr.width, sy = cv.height / cr.height;
  const kinds = { water: '#whHud .wh-water', move: '#whHud .wh-move', fuel: '#whHud .wh-meals', sleep: '#whHud .o8-sleep', gap: '#spFast' };
  const PADPX = 12, boxes = {};
  for (const k in kinds) {
    const el = document.querySelector(kinds[k]); if (!el) continue; const r = el.getBoundingClientRect(); if (!r.width) continue;
    const x0 = Math.max(0, Math.floor((r.left - PADPX - cr.left) * sx)), x1 = Math.min(cv.width, Math.ceil((r.right + PADPX - cr.left) * sx));
    const yTop = Math.max(0, Math.floor((r.top - PADPX - cr.top) * sy)), yBot = Math.min(cv.height, Math.ceil((r.bottom + PADPX - cr.top) * sy));
    boxes[k] = { el, r, x0, w: x1 - x0, yTop, h: yBot - yTop };
  }
  const liqs = [], mems = []; g.traverse(o => { if (!o.isMesh) return; (o.userData && o.userData.lbLiquid ? liqs : mems).push(o); });
  const vis = new Map(); a.scene.children.forEach(c => vis.set(c, c.visible));
  const bg = a.scene.background, fog = a.scene.fog, cc = R.getClearColor(new (a.THREE.Color)()), ca = R.getClearAlpha(), ac = R.autoClear;
  const mv = new Map(); mems.forEach(m => mv.set(m, m.material.visible)); const lv = new Map(); liqs.forEach(m => lv.set(m, m.visible));
  const read = () => { const o = {}; for (const k in boxes) { const b = boxes[k], buf = new Uint8Array(b.w * b.h * 4); gl.readPixels(b.x0, cv.height - b.yTop - b.h, b.w, b.h, gl.RGBA, gl.UNSIGNED_BYTE, buf); const m = new Uint8Array(b.w * b.h); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const i = ((b.h - 1 - y) * b.w + x) * 4; m[y * b.w + x] = Math.max(buf[i], buf[i + 1], buf[i + 2]) > 6 ? 1 : 0; } o[k] = m; } return o; };
  let M, L3;
  try {
    a.scene.children.forEach(c => { c.visible = c === g; }); a.scene.background = null; a.scene.fog = null; R.setClearColor(0x000000, 1); R.autoClear = true;
    liqs.forEach(m => { m.visible = false; }); R.render(a.scene, a.camera); M = read();
    mems.forEach(m => { m.material.visible = false; }); liqs.forEach(m => { m.visible = lv.get(m); }); R.render(a.scene, a.camera); L3 = read();
  } finally {
    vis.forEach((v, c) => { c.visible = v; }); mems.forEach(m => { m.material.visible = mv.get(m); }); liqs.forEach(m => { m.visible = lv.get(m); });
    a.scene.background = bg; a.scene.fog = fog; R.setClearColor(cc, ca); R.autoClear = ac; try { R.render(a.scene, a.camera); } catch (e) { }
  }
  const look = (window.LowiBubbles && window.LowiBubbles.look ? window.LowiBubbles.look() : []);
  const out = {};
  for (const k in boxes) {
    const b = boxes[k], el = b.el, r = b.r, m = M[k], w = b.w, h = b.h;
    let liq = L3[k], src = '3d';
    const fillEl = el.querySelector('.wh-cell-fill'), fbc = el.querySelector('.fb-cv');
    const domShown = e => !!e && +getComputedStyle(e).opacity > 0.02 && e.getBoundingClientRect().height > 0.5;
    const flatShown = domShown(fillEl) || domShown(fbc);
    if (!el.classList.contains('lb-liq')) {
      /* no 3D liquid on this bubble: the liquid the user sees is the flat fill (circle-clipped box) or the fasting 2D water */
      src = 'dom'; liq = new Uint8Array(w * h);
      let top = Infinity;
      if (domShown(fillEl)) top = fillEl.getBoundingClientRect().top;
      else if (domShown(fbc)) { const st = window.LowiFastBubble && window.LowiFastBubble.state && window.LowiFastBubble.state(); if (st && st.on) { const cr2 = fbc.getBoundingClientRect(); top = cr2.top + cr2.height * (1 - st.level); } }
      if (top < Infinity) {
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2, rad = r.width / 2;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const px = cr.left + (b.x0 + x + 0.5) / sx, py = cr.top + (b.yTop + y + 0.5) / sy; if (py >= top && Math.hypot(px - cx, py - cy) <= rad) liq[y * w + x] = 1; }
      }
    }
    const tol = Math.max(1, Math.round(sx)); /* 1 CSS px */
    const dil = (src0) => { const o = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!src0[y * w + x]) continue; for (let dy = -tol; dy <= tol; dy++) for (let dx = -tol; dx <= tol; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < h && xx >= 0 && xx < w) o[yy * w + xx] = 1; } } return o; };
    /* only this bubble: the glass component under the bubble's centre (a neighbour can reach into the padded box on a phone) */
    const mAll = m, comp = new Uint8Array(w * h), st = [];
    { const cx = Math.round((r.left + r.width / 2 - cr.left) * sx) - b.x0, cy = Math.round((r.top + r.height / 2 - cr.top) * sy) - b.yTop; let best = -1, bd = 1e9;
      for (let i = 0; i < w * h; i++) if (mAll[i]) { const d = Math.hypot(i % w - cx, ((i / w) | 0) - cy); if (d < bd) { bd = d; best = i; } }
      if (best >= 0) { comp[best] = 1; st.push(best); }
      while (st.length) { const i = st.pop(), x = i % w, y = (i / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const j = yy * w + xx; if (mAll[j] && !comp[j]) { comp[j] = 1; st.push(j); } } } }
    const mD = dil(mAll), near = dil(dil(comp)), liqAll = liq;
    liq = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) liq[i] = liqAll[i] && near[i] ? 1 : 0;
    const lD = dil(liq);
    let mem = 0, liqN = 0, outside = 0, gap = 0, memTop = h, memBot = -1, liqTop = h;
    for (let i = 0; i < w * h; i++) { if (liqAll[i] && !mD[i]) outside++; }
    for (let i = 0; i < w * h; i++) { if (comp[i]) { mem++; const y = (i / w) | 0; memTop = Math.min(memTop, y); memBot = Math.max(memBot, y); } if (liq[i]) { liqN++; liqTop = Math.min(liqTop, (i / w) | 0); } if (comp[i] && !lD[i]) gap++; }
    /* side walls: in every row the liquid has (away from its surface and the glass's flat top/bottom), its edges sit on the glass edges */
    let wall = 0, rows = 0;
    const skip = Math.round(4 * sy);
    /* rows fully under the surface: below the lowest point of the (tilted, rippling) surface across the middle of the glass */
    let cl = w, cR = -1; for (let i = 0; i < w * h; i++) if (comp[i]) { cl = Math.min(cl, i % w); cR = Math.max(cR, i % w); }
    let surfLow = liqTop; for (let x = Math.round(cl + (cR - cl) * 0.2); x <= Math.round(cl + (cR - cl) * 0.8); x++) { for (let y = 0; y < h; y++) if (liq[y * w + x]) { surfLow = Math.max(surfLow, y); break; } }
    for (let y = Math.max(surfLow + skip, memTop + skip); y <= memBot - skip; y++) {
      let ml = -1, mr = -1, ll = -1, lr = -1;
      for (let x = 0; x < w; x++) { if (comp[y * w + x]) { if (ml < 0) ml = x; mr = x; } if (liq[y * w + x]) { if (ll < 0) ll = x; lr = x; } }
      if (ml < 0 || ll < 0) continue; rows++;
      wall = Math.max(wall, Math.abs(ml - ll), Math.abs(mr - lr));
    }
    let fullIntent = false;
    if (src === 'dom') { if (domShown(fillEl)) fullIntent = fillEl.offsetHeight >= el.clientHeight - 0.5; else if (domShown(fbc)) { const st = window.LowiFastBubble && window.LowiFastBubble.state && window.LowiFastBubble.state(); fullIntent = !!(st && st.level >= 0.999); } }
    const lk = look.find(x => x.liquid && x.liquid.on && el.classList.contains('lb-liq') && x.kind === ({ gap: 'fast', fuel: 'meals' }[k] || k));
    out[k] = { src, mem, liq: liqN, outside, gap, wallPx: +(wall / sx).toFixed(2), rows, full: src === '3d' ? !!(lk && lk.liquid.target >= 1) : fullIntent, topGap: +((liqTop - memTop) / sy).toFixed(1), flatShown: src === '3d' ? flatShown : null,
      dump: window.__fillDump ? { w, h, m: Array.from(m).join(''), l: Array.from(liq).join('') } : undefined,
      shares: lk ? !!(lk.liquid.child && lk.liquid.sameGeometry && lk.liquid.sameVertexShader && lk.liquid.sameClock && !lk.liquid.ownTransform) : null, level: lk ? lk.liquid.level : null };
  }
  return { out, dpr: sx };
}

(async () => {
  const srv = arg('url', '') ? null : await serve();
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
  const views = arg('views', Object.keys(VIEWS).join(',')).split(',');
  let failed = 0, build = '';
  const fail = (v, m) => { failed++; console.log('  FAIL', v, m); };
  for (const v of views) {
    const [eng, dd] = VIEWS[v];
    const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
    try {
      const dev = typeof dd === 'string' ? Object.assign({}, pw.devices[dd]) : dd;
      const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
      await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
      await ctx.addInitScript(INIT);
      const page = await ctx.newPage(), errs = [];
      page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
      await page.goto(url + (url.includes('?') ? '&' : '?') + 'fill=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
      await page.waitForFunction(() => document.documentElement.classList.contains('o8') && document.querySelectorAll('[data-orbit]').length >= 8 && document.documentElement.classList.contains('lb3d'), null, { timeout: 90000 }).catch(() => { });
      await sleep(14000); /* Misty settles, the ring re-centres once */
      build = await page.evaluate(() => fetch('version.json?x=' + Date.now()).then(r => r.json()).then(j => j.build || j.version || '').catch(() => '')) || build;
      /* fixture fills on top of Water 8/6 (full) and Gap 17 h 14 of 16 h: Move half, Fuel a third, Sleep two thirds */
      await page.evaluate(() => { const set = (s, f) => { const e = document.querySelector(s); if (e) e.style.setProperty('--wh-fill', f); }; set('#whHud .wh-move', '0.5'); set('#whHud .wh-meals', '0.33'); set('#whHud .o8-sleep', '0.66'); });
      await sleep(1500);
      if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${arg('tag', 'fill')}-${v}.png`) }); }
      const lb3d = await page.evaluate(() => document.documentElement.classList.contains('lb3d'));
      if (!lb3d) { fail(v, '3D membrane not active in this browser (no WebGL?) - cannot compare'); continue; }
      const agg = {};
      for (let i = 0; i < SAMPLES; i++) {
        if (arg('dump', '') && i === 0) await page.evaluate(() => { window.__fillDump = 1; });
        const res = await page.evaluate(measure);
        if (arg('dump', '') && i === 0) { fs.mkdirSync(arg('dump'), { recursive: true }); for (const k in res.out) { const d = res.out[k].dump; if (!d) continue; const px = Buffer.alloc(d.w * d.h * 3); for (let j = 0; j < d.w * d.h; j++) { px[j * 3] = d.m[j] === '1' ? 255 : 0; px[j * 3 + 1] = d.l[j] === '1' ? 255 : 0; px[j * 3 + 2] = 0; } fs.writeFileSync(path.join(arg('dump'), `${v}-${k}.ppm`), Buffer.concat([Buffer.from(`P6 ${d.w} ${d.h} 255\n`), px])); delete res.out[k].dump; } await page.evaluate(() => { window.__fillDump = 0; }); }
        if (res.err) { fail(v, res.err); break; }
        for (const k in res.out) { const o = res.out[k]; const A = agg[k] = agg[k] || { src: o.src, n: 0, outsideMax: 0, wallMax: 0, gapMax: 0, mem: o.mem, full: o.full, flat: false, shares: o.shares, level: o.level, liq: 0 };
          A.n++; A.outsideMax = Math.max(A.outsideMax, o.outside / Math.max(1, o.mem)); A.wallMax = Math.max(A.wallMax, o.wallPx); A.gapMax = Math.max(A.gapMax, o.full ? o.gap / Math.max(1, o.mem) : 0); A.flat = A.flat || !!o.flatShown; A.liq = Math.max(A.liq, o.liq); if (o.shares === false) A.shares = false; A.full = A.full && o.full; }
        await sleep(260);
      }
      console.log(v, 'build', build, JSON.stringify(agg));
      for (const k in agg) {
        const A = agg[k]; if (!A.liq) continue; /* nothing in this bubble to compare */
        if (A.src !== '3d') fail(v, `${k}: the liquid is a separate flat layer (${A.src}), not drawn by the glass`);
        if (A.outsideMax > 0.002) fail(v, `${k}: liquid outside the glass (${(A.outsideMax * 100).toFixed(2)}% of the glass area)`);
        if (A.wallMax > 1.01) fail(v, `${k}: liquid edge ${A.wallMax} px off the glass edge`);
        if (A.full && A.gapMax > 0.005) fail(v, `${k}: full, but ${(A.gapMax * 100).toFixed(2)}% of the glass has no liquid`);
        if (A.src === '3d' && A.flat) fail(v, `${k}: the flat fill still shows over the 3D liquid`);
        if (A.src === '3d' && A.shares !== true) fail(v, `${k}: liquid does not share the glass mesh (geometry/vertex shader/clock/transform)`);
      }
      if (agg.water && !agg.water.full) fail(v, 'water 8/6 does not read full');
      if (errs.length) fail(v, 'page errors: ' + errs.slice(0, 3).join(' | '));
    } catch (e) { fail(v, e.message.slice(0, 200)); } finally { await browser.close(); }
  }
  srv && srv.close();
  console.log(failed ? `FAILED (${failed})` : 'PASS', 'build', build);
  process.exit(failed ? 1 : 0);
})();
