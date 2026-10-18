'use strict';
/* Live measurement: what the living Home bubbles (living-bubbles.js: membranes + 3D liquid fill) cost per drawn frame.
   Oct 18, 2026. The Maya 4 handoff suspected the liquid fill slowed Home to about 1.5 fps in iPhone emulation by reading layout
   every frame (getBoundingClientRect per bubble each frame, getComputedStyle up each bubble's parents every 180 ms).
   This serves a copy of living-bubbles.js with timers around its frame() and refreshVis() (the repo file is not changed), lets
   the ring Home settle, then reports for a window of --secs seconds:
     - frame (includes its refreshVis pass) / vis: calls per second, p50 / p95 / max ms per call, and the share of wall time spent there
     - page-wide getBoundingClientRect / getComputedStyle calls per second, rAF rate, Chromium layout + style metrics (CDP)
     - --render 1: renderer.render() time with the living-bubble group drawn vs hidden (alternating 3 s windows)
     - --liquid-only 1 with --render: toggles only the liquid meshes instead of the whole group
     - --fills 1: Move half, Fuel a third, Sleep two thirds on top of the fixture (more liquids drawn)
   Budget (fails the run): living-bubbles frame() (with its refreshVis()) above 2% of wall time, any page error, or no 3D membrane.
   fps is reported, never gated: the VM renders WebGL in software and shares its CPU with other tasks, so fps here says nothing
   about a physical iPhone. Usage:
     node tests/ui-liquid-frame-cost-live.cjs [--root .] [--views iphone_chromium,iphone13_webkit,ipad_chromium,ipad_webkit]
                                              [--secs 10] [--render 1] [--liquid-only 1] [--fills 1] [--reduce 1] [--variant off] */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
let pw; for (const p of ['playwright', '/tmp/pw/node_modules/playwright']) { try { pw = require(p); break; } catch (e) { } }
if (!pw) { console.error('playwright not found'); process.exit(2); }
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), VARIANT = arg('variant', 'inst'), SECS = +arg('secs', 8);
const src = fs.readFileSync(path.join(ROOT, 'living-bubbles.js'), 'utf8');
function patched() {
  let s = src;
  const wrap = (name, key) => {
    const sig = `function ${name}(`; const i = s.indexOf(sig); if (i < 0) throw new Error('no ' + name);
    const close = s.indexOf(')', i); const params = s.slice(i + sig.length, close);
    s = s.slice(0, i) + `function ${name}(${params}) { const __t0 = performance.now(); try { return ${name}__(${params}); } finally { const P = (window.__lbp = window.__lbp || {}); const q = (P['${key}'] = P['${key}'] || { n: 0, t: 0, max: 0 }); const d = performance.now() - __t0; q.n++; q.t += d; if (d > q.max) q.max = d; (q.all = q.all || []).push(d); } }\n    function ${name}__(` + s.slice(i + sig.length);
  };
  if (VARIANT === 'off') s = s.replace('function frame(dt, now) {', 'function frame(dt, now) { return;');
  wrap('frame', 'frame'); wrap('refreshVis', 'vis');
  return s;
}
const BODY = patched();
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u === '/living-bubbles.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(BODY); } const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const UA = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const pad = (w, h) => ({ viewport: { width: w, height: h }, screen: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: UA });
const VIEWS = {
  iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }],
  iphone13_webkit: ['webkit', 'iPhone 13'],
  ipad_chromium: ['chromium', pad(820, 1180)], ipad_webkit: ['webkit', pad(820, 1180)] };
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid' } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], settings: { lang: 'en' } }));
  const w = {}; w[k] = 3; localStorage.setItem('lowi_fast_v1', JSON.stringify({ last: Date.now() - (12 * 60) * 60e3, target: 16, water: w })); localStorage.removeItem('lowi.home.menubar');
  /* count layout-reading calls page-wide */
  const C = (window.__lbc = { gbcr: 0, gcs: 0, oh: 0 });
  const g0 = Element.prototype.getBoundingClientRect; Element.prototype.getBoundingClientRect = function () { C.gbcr++; return g0.apply(this, arguments); };
  const c0 = window.getComputedStyle; window.getComputedStyle = function () { C.gcs++; return c0.apply(this, arguments); };
  let raf = 0; const loop = () => { raf++; window.__raf = raf; requestAnimationFrame(loop); }; requestAnimationFrame(loop);
} catch (e) { }`;
let failed = 0;
(async () => {
  const srv = await serve(); const url = `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
  for (const v of arg('views', 'iphone_chromium,iphone13_webkit').split(',')) {
    const [eng, dd] = VIEWS[v];
    const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
    try {
      const dev = typeof dd === 'string' ? Object.assign({}, pw.devices[dd]) : dd;
      const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }, arg('reduce', '') ? { reducedMotion: 'reduce' } : {}));
      await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
      await ctx.addInitScript(INIT);
      const page = await ctx.newPage(), errs = [];
      page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
      await page.goto(url + '?p=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
      await page.waitForFunction(() => document.documentElement.classList.contains('o8') && document.documentElement.classList.contains('lb3d'), null, { timeout: 90000 }).catch(() => { });
      await sleep(12000);
      if (arg('hidegroup', '')) await page.evaluate(() => { const g = window.LowiWorld3D && window.LowiWorld3D.scene && window.LowiWorld3D.scene.getObjectByName('lowi-living-bubbles'); if (g) g.visible = false; window.__hid = !!g; });
      if (arg('fills', '')) { await page.evaluate(() => { const set = (s, f) => { const e = document.querySelector(s); if (e) e.style.setProperty('--wh-fill', f); }; set('#whHud .wh-move', '0.5'); set('#whHud .wh-meals', '0.33'); set('#whHud .o8-sleep', '0.66'); }); await sleep(2000); }
      if (arg('render', '')) {
        const r = await page.evaluate(async (liqOnly) => {
          const a = window.LowiWorld3D, R = a.renderer, g0 = a.scene.getObjectByName('lowi-living-bubbles'); const LQ = []; g0.traverse(o => { if (o.userData && o.userData.lbLiquid) LQ.push(o); }); const g = liqOnly ? { set visible(v) { LQ.forEach(o => { o.material.visible = v; }); } } : g0; const r0 = R.render.bind(R); const acc = { on: { n: 0, t: 0 }, off: { n: 0, t: 0 } }; let mode = 'on';
          R.render = function (s, c) { const t0 = performance.now(); try { return r0(s, c); } finally { const q = acc[mode]; q.n++; q.t += performance.now() - t0; } };
          const sl = ms => new Promise(x => setTimeout(x, ms));
          for (let i = 0; i < 8; i++) { mode = i % 2 ? 'off' : 'on'; g.visible = mode === 'on'; await sl(3000); }
          g.visible = true; R.render = r0;
          return { toggled: liqOnly ? 'liquid meshes' : 'all living bubbles', renderMsDrawn: +(acc.on.t / acc.on.n).toFixed(1), framesDrawn: acc.on.n, renderMsHidden: +(acc.off.t / acc.off.n).toFixed(1), framesHidden: acc.off.n };
        }, !!arg('liquid-only', ''));
        console.log(JSON.stringify(Object.assign({ view: v, render: true }, r)));
      }
      let cdp = null; if (eng === 'chromium') { cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable'); }
      const m = async () => { if (!cdp) return {}; const r = await cdp.send('Performance.getMetrics'); const o = {}; r.metrics.forEach(x => { o[x.name] = x.value; }); return o; };
      const s0 = await page.evaluate(() => ({ p: (window.__lbp = {}, {}), c: Object.assign({}, window.__lbc), raf: window.__raf, t: performance.now(), lb3d: document.documentElement.classList.contains('lb3d'), n: window.LowiBubbles ? window.LowiBubbles.list().length : 0, liq: window.LowiBubbles ? window.LowiBubbles.look().filter(x => x.liquid && x.liquid.on).length : 0 }));
      const m0 = await m();
      await sleep(SECS * 1000);
      const s1 = await page.evaluate(() => ({ p: (() => { const o = {}; for (const k in (window.__lbp || {})) { const q = window.__lbp[k], a = q.all.slice().sort((x, y) => x - y); o[k] = { n: q.n, t: q.t, max: q.max, p50: a[Math.floor(a.length / 2)] || 0, p95: a[Math.floor(a.length * 0.95)] || 0, over4: a.filter(x => x > 4).length }; } return o; })(), c: Object.assign({}, window.__lbc), raf: window.__raf, t: performance.now() }));
      const m1 = await m();
      const secs = (s1.t - s0.t) / 1000, d = k => { const a = s0.p[k] || { n: 0, t: 0 }, b = s1.p[k] || { n: 0, t: 0, max: 0 }; return { p50: +(b.p50 || 0).toFixed(3), p95: +(b.p95 || 0).toFixed(3), over4ms: b.over4 || 0, perSec: +((b.n - a.n) / secs).toFixed(1), msPerCall: b.n - a.n ? +((b.t - a.t) / (b.n - a.n)).toFixed(3) : 0, msPerSec: +((b.t - a.t) / secs).toFixed(1), maxInWindow: +(b.max || 0).toFixed(2), shareOfFrameTimePct: b.n ? +(100 * ((b.t - a.t) / secs) / 1000).toFixed(2) : 0 }; };
      const out = { view: v, variant: VARIANT, lb3d: s0.lb3d, bubbles: s0.n, liquids: s0.liq, rafPerSec: +((s1.raf - s0.raf) / secs).toFixed(1), frame: d('frame'), vis: d('vis'),
        gbcrPerSec: +((s1.c.gbcr - s0.c.gbcr) / secs).toFixed(0), gcsPerSec: +((s1.c.gcs - s0.c.gcs) / secs).toFixed(0), errors: errs.length };
      if (cdp) { const k = n => +(((m1[n] || 0) - (m0[n] || 0)) / secs).toFixed(n.endsWith('Duration') ? 4 : 1); out.cdp = { layoutsPerSec: k('LayoutCount'), styleRecalcsPerSec: k('RecalcStyleCount'), layoutSecPerSec: k('LayoutDuration'), styleSecPerSec: k('RecalcStyleDuration'), scriptSecPerSec: k('ScriptDuration'), taskSecPerSec: k('TaskDuration') }; }
      console.log(JSON.stringify(out));
      if (errs.length) { failed++; console.log('  FAIL', v, 'page errors:', errs.slice(0, 3)); }
      if (!s0.lb3d && arg('reduce', '')) { if (out.frame.perSec > 0) { failed++; console.log('  FAIL', v, 'reduced motion: living-bubbles still runs frames'); } else console.log('  ok', v, 'reduced motion: no 3D world (body-world-3d.js falls back to 2D by design), living-bubbles draws nothing, 0 frames'); }
      else if (!s0.lb3d) { failed++; console.log('  FAIL', v, '3D membrane not active (no WebGL?): nothing measured'); }
      else if (VARIANT !== 'off') { const share = out.frame.shareOfFrameTimePct; /* frame() includes its refreshVis() pass */ if (!(out.frame.perSec > 0)) { failed++; console.log('  FAIL', v, 'no living-bubbles frames in the window'); } else if (share > 2) { failed++; console.log('  FAIL', v, `living-bubbles uses ${share.toFixed(2)}% of wall time (budget 2%)`); } else console.log('  ok', v, `living-bubbles ${share.toFixed(2)}% of wall time`); }
    } finally { await browser.close(); }
  }
  srv.close();
  console.log(failed ? `FAILED ${failed}` : 'PASS'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
