'use strict';
/* Oct 23, 2026 — the old Home must never paint, not even for a frame, on a slow first load or right after an update.
   (E-man, 08:39, after "Update loaded": greeting, Daily quest card, VR, Since last meal and the Today pill showed for minutes
   because the page builds the old Home first and the ring script near the end of the page was still downloading.)

   Serves the app itself with a slow network: every file waits LAT ms and the files that build the ring wait DELAY_MS more.
   Samples Home every 150 ms from the first byte until the ring is up, and fails if any old-Home chrome is visible while no
   sign-in screen covers it.

     node tools/sim/home-update-path.cjs [--root DIR] [--url URL] [--views se,13,15,pixel] [--schemes dark,light] [--langs en,de,es]
     node tools/sim/home-update-path.cjs --sw --old DIR_OF_OLD_BUILD [--root NEW]   real service worker: old build cached, then the new one
   Exit 0 = pass. Browser simulation only, not a real iPhone. */
const http = require('http'), fs = require('fs'), path = require('path');
const H = require('./harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = k => process.argv.includes('--' + k);
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), OLD = arg('old', '') && path.resolve(arg('old'));
const LAT = +arg('lat', 60), DMS = +arg('delay', 8000), SLOW = new RegExp(arg('slow', 'home-orbit-v2|sym-home|home-blooms-v2|section-nav|glass-nav|world-home\\.css'));
const VIEWS = { se: ['webkit', 'iPhone SE'], '13': ['webkit', 'iPhone 13'], '15': ['webkit', 'iPhone 15'], pixel: ['chromium', 'Pixel 7', { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6 }], ipad: ['webkit', 'iPad (gen 7) landscape'] };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function serve(state) {
  return new Promise(r => {
    const s = http.createServer(async (q, res) => {
      let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
      const base = state.root, f = path.join(base, u);
      if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
      if (state.slow) { await sleep(LAT); if (SLOW.test(u)) await sleep(DMS); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => r(s));
  });
}

const PROBE = () => {
  const D = document, Hh = D.documentElement, $ = s => D.querySelector(s);
  const vis = e => {
    if (!e) return false; const s = getComputedStyle(e), b = e.getBoundingClientRect();
    if (!(b.width > 4 && b.height > 4 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth)) return false;
    for (let p = e; p && p !== Hh; p = p.parentElement) { const c = getComputedStyle(p); if (+c.opacity < 0.05 || c.display === 'none') return false; }
    return true;
  };
  /* the old Home: greeting + weather + Daily quest + VR + world map stick + Today pill; and the ring cells drawn without the ring */
  const OLD = { greeting: '.sp-greeting', weather: '.sp-weather', quest: '#tab-home #f3Board', vr: '.wh-vr', worldmap: '.wh-zoom', today: '.wh-todaybtn', todaypill: '.sp-today' };
  const CELLS = ['#whHud .wh-meals', '#whHud .wh-water', '#whHud .wh-move', '#spFast', '#whPad', '#whHud .o8-scan', '#whHud .o8-sleep', '#whHud .o8-settings'];
  const old = Object.keys(OLD).filter(k => vis($(OLD[k])));
  const o8 = Hh.classList.contains('o8'), cells = CELLS.filter(s => vis($(s))).length;
  if (!o8 && cells) old.push('cells-without-ring:' + cells);
  return { o8, boot: Hh.classList.contains('o8-boot'), gate: Hh.classList.contains('gate-up') || Hh.classList.contains('gate-boot'), old, cells, rs: D.readyState, upd: !!$('#lcUpd, #lcUpdOk') };
};

async function watch(R, url, dur) {
  const t0 = Date.now(), bad = []; let ringAt = 0, last = null;
  const nav = R.page.goto(url, { waitUntil: 'commit', timeout: 240000 }).catch(e => bad.push({ t: -1, err: String(e).slice(0, 120) }));
  while (Date.now() - t0 < dur) {
    const s = await R.page.evaluate(PROBE).catch(() => null);
    if (s) { s.t = Date.now() - t0; last = s; if (!s.gate && s.old.length) bad.push(s); if (s.o8 && !s.boot && s.cells >= 6 && !ringAt) ringAt = s.t; if (ringAt && s.t - ringAt > 2500) break; }
    await sleep(150);
  }
  await nav;
  return { bad, ringAt, last };
}

(async () => {
  const views = arg('views', '13').split(','), schemes = arg('schemes', 'dark').split(','), langs = arg('langs', 'en').split(',');
  let fails = 0;
  for (const v of views) for (const scheme of schemes) for (const lang of langs) {
    const [engine, device, ctx] = VIEWS[v] || VIEWS['13'];
    const state = { root: OLD && flag('sw') ? OLD : ROOT, slow: !flag('sw') };
    const srv = arg('url', '') ? null : await serve(state);
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
    const R = await H.open({ engine, device, lang, url, probe: false, sw: flag('sw'), ctx: Object.assign({ colorScheme: scheme }, ctx || {}) });
    let res;
    if (flag('sw')) {
      /* 1. old build, fast network: the service worker installs and caches it */
      await R.page.goto(url, { waitUntil: 'load', timeout: 240000 });
      await R.page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 60000 }).catch(() => { });
      await sleep(4000);
      await R.page.goto(url, { waitUntil: 'load', timeout: 240000 }); await sleep(3000);
      /* 2. the new build goes live and the network turns slow; the next launch is the update */
      state.root = ROOT; state.slow = true;
      res = await watch(R, url + '?u=' + Date.now(), +arg('dur', 90000));
    } else res = await watch(R, url + '?sim=' + Date.now(), +arg('dur', 60000));
    const ok = !res.bad.length && res.ringAt > 0;
    if (!ok) fails++;
    console.log(JSON.stringify({ view: v, device, scheme, lang, sw: flag('sw'), ok, ringAt: res.ringAt, oldFrames: res.bad.length, firstOld: res.bad[0] || null, last: res.last, errs: R.errs.slice(0, 3) }));
    await R.close(); if (srv) srv.close();
  }
  console.log(fails ? `FAIL ${fails}` : 'PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
