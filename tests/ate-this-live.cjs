'use strict';
/* Browser check for "I just ate this" / "I'll eat this" (ate-this.js, Oct 22 2026). iPhone SE, 13, 15 (WebKit) and Pixel 7 (Chromium).
   Cook tab -> Shuffle: the Your pick card shows both buttons, on screen and unclipped; I just ate this logs one meal (Fuel/logs +1, the bar
   with the slot chips fits the screen), a slot change moves it, Undo removes it, a second tap of the same food counts once. The
   cook-along DONE screen has I just ate this as the main button beside a small I'll eat this, both on screen, and it logs. A right swipe
   offers both. Local fixture session, every non-GET and off-site request blocked.
     node tests/ate-this-live.cjs [--root DIR | --url https://therealetm.github.io/lowispike/] [--out DIR] [--views se,i13,i15,pixel7]
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/ate-this-shots');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const VIEWS = { se: ['webkit', 'iPhone SE', 'en'], i13: ['webkit', 'iPhone 13', 'de'], i15: ['webkit', 'iPhone 15', 'es'], pixel7: ['chromium', 'Pixel 7', 'en'] };
const NOW = { en: 'I just ate this', de: 'Gerade gegessen', es: 'Ya me lo comí' };
/* every rect on screen, not clipped, no two overlapping */
const FIT = sel => { const bs = [...document.querySelectorAll(sel)].filter(b => b.offsetParent || getComputedStyle(b).position === 'fixed'); const out = [];
  bs.forEach(b => { const r = b.getBoundingClientRect(); if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) out.push('off screen: ' + b.textContent.trim().slice(0, 30) + ' ' + JSON.stringify([r.left, r.top, r.right, r.bottom].map(Math.round)));
    if (b.scrollWidth > b.clientWidth + 2 && getComputedStyle(b).textOverflow !== 'ellipsis') out.push('clipped: ' + b.textContent.trim().slice(0, 30)); });
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i].getBoundingClientRect(), c = bs[j].getBoundingClientRect(); if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) out.push('overlap: ' + bs[i].textContent.trim().slice(0, 20) + ' / ' + bs[j].textContent.trim().slice(0, 20)); }
  return { n: bs.length, out }; };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = arg('url', '') ? null : await serve();
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
  let fail = 0;
  for (const v of arg('views', 'se,i13,i15,pixel7').split(',')) {
    const [eng, dev, lang] = VIEWS[v], fails = [], log = {};
    const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
    const ctx = await browser.newContext(Object.assign({}, pw.devices[dev], { serviceWorkers: 'block' }));
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
    await ctx.addInitScript(INIT);
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    const ev = (fn, a) => page.evaluate(fn, a);
    const tap = async sel => { const p = await ev(sel => { const b = [...document.querySelectorAll(sel)].find(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; }); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, e = document.elementFromPoint(x, y); return e && (e === b || b.contains(e)) ? { x, y } : { blocked: e ? String(e.id || e.className).slice(0, 60) : 'none' }; }, sel);
      if (!p || !p.x) { fails.push('cannot tap ' + sel + ' ' + JSON.stringify(p)); return false; } await page.mouse.click(p.x, p.y); return true; };
    const meals = () => ev(() => LowiVitalsBridge.state().logs.length);
    try {
      await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
      await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiAte && window.LowiVitalsBridge && window.LowiP2, null, { timeout: 150000 });
      await sleep(4000);
      log.build = await ev(() => fetch('version.json?tb=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => '?'));
      await ev(l => { try { LowiLang.set(l); } catch (e) { } }, lang); await sleep(600);
      await ev(() => { document.querySelectorAll('.tut-ov,.stp-ov,[class*="wn-ov"]').forEach(x => x.remove()); goTab('shelf'); }); await sleep(2200);
      /* 1. Shuffle -> Your pick */
      await ev(() => { const b = document.getElementById('r5Go'); if (b) b.click(); });
      await page.waitForSelector('#r5Pick .ate-pair .ate-now', { timeout: 30000 }).catch(() => fails.push('no I just ate this on the Your pick card'));
      await sleep(1600);
      log.pick = await ev(() => { const c = document.querySelector('#r5Pick .r5-card'); return c ? { id: c.dataset.id, name: (c.querySelector('.r5-cn') || {}).textContent, oldAdd: !!c.querySelector('[data-td="addtoday"]:not([hidden])') } : null; });
      if (log.pick && log.pick.oldAdd) fails.push('the old Add to today still shows next to the pair');
      await ev(() => document.querySelector('#r5Pick .ate-pair').scrollIntoView({ block: 'center' })); await sleep(400);
      const f1 = await ev(FIT, '#r5Pick .ate-pair button'); if (f1.n !== 2) fails.push('pair buttons on pick: ' + f1.n); fails.push(...f1.out.map(x => 'pick ' + x));
      const lbl = await ev(() => document.querySelector('#r5Pick .ate-now').textContent.trim()); if (!lbl.includes(NOW_L())) fails.push('label ' + lbl);
      function NOW_L() { return NOW[lang]; }
      await page.screenshot({ path: path.join(OUT, v + '-1-pick.png') });
      const m0 = await meals();
      await tap('#r5Pick .ate-now'); await sleep(900);
      const b1 = await ev(() => { const b = document.getElementById('ateBar'); return b && b.classList.contains('on') ? { slot: (b.querySelector('.ate-slot.on') || {}).dataset && b.querySelector('.ate-slot.on').dataset.slot, txt: b.textContent.slice(0, 90) } : null; });
      log.logged = b1; if ((await meals()) !== m0 + 1) fails.push('I just ate this did not log one meal'); if (!b1) fails.push('no confirmation bar');
      const f2 = await ev(FIT, '#ateBar.on button'); fails.push(...f2.out.map(x => 'bar ' + x));
      await page.screenshot({ path: path.join(OUT, v + '-2-logged.png') });
      const other = b1 && b1.slot === 'snack' ? 'dinner' : 'snack';
      await tap('#ateBar .ate-slot[data-slot="' + other + '"]'); await sleep(400);
      if ((await ev(() => LowiVitalsBridge.state().logs.slice(-1)[0].slot)) !== other) fails.push('slot change did not move the meal');
      await tap('#ateBar .ate-undo'); await sleep(500);
      if ((await meals()) !== m0) fails.push('Undo did not remove the meal');
      await ev(() => document.getElementById('ateBar').classList.remove('on'));
      const clean = () => ev(() => { const b = document.getElementById('ateBar'); if (b) b.classList.remove('on'); const rw = document.getElementById('fstRw'); if (rw) rw.remove(); });
      await clean(); await tap('#r5Pick .ate-now'); await sleep(1200); await clean(); await tap('#r5Pick .ate-now'); await sleep(800);
      if ((await meals()) !== m0 + 1) fails.push('the same food twice did not count once: ' + ((await meals()) - m0));
      await clean();
      /* 2. cook-along DONE */
      await ev(() => LowiP2.cook('rb_cauliflower_nacho_smash_tray')); await sleep(1500);
      for (let i = 0; i < 40; i++) { if (await ev(() => !!document.querySelector('.p2-cknav .ate-done'))) break; const ok = await ev(() => { const b = [...document.querySelectorAll('.p2-cknav button')].pop(); if (b) b.click(); return !!b; }); if (!ok) break; await sleep(250); }
      /* the cook sheet's open spring runs on requestAnimationFrame, which a busy headless machine slows down: wait until it has settled */
      await page.waitForFunction(() => { const sh = document.querySelector('.p2-ckov .r2-sh'); if (!sh) return true; const m = /translate3d\(0px, ([-\d.]+)px/.exec(sh.style.transform || ''); return !m || Math.abs(+m[1]) < 1; }, null, { timeout: 120000, polling: 250 }).catch(() => fails.push('cook sheet never settled'));
      await sleep(500);
      log.nav = await ev(() => { const n = document.querySelector('.p2-cknav'); if (!n) return null; n.scrollIntoView({ block: 'end' }); const r = n.getBoundingClientRect(); const chain = []; for (let e = n.parentElement; e && chain.length < 7; e = e.parentElement) { const q = e.getBoundingClientRect(), c = getComputedStyle(e); chain.push((e.style.transform ? 'T(' + e.style.transform + ')' : '') + (e.id || e.className || e.tagName).toString().slice(0, 24) + ':' + Math.round(q.top) + '-' + Math.round(q.bottom) + ':' + c.overflowY + ':' + e.scrollHeight + '/' + e.clientHeight); } return [Math.round(r.top), Math.round(r.bottom), innerHeight, chain]; }); await sleep(300);
      const f3 = await ev(FIT, '.p2-cknav button'); if (!(await ev(() => !!document.querySelector('.p2-cknav .ate-done.pri')))) fails.push('DONE screen has no main I just ate this'); fails.push(...f3.out.map(x => 'done ' + x));
      log.done = await ev(() => [...document.querySelectorAll('.p2-cknav button')].map(b => b.textContent.trim()));
      await page.screenshot({ path: path.join(OUT, v + '-3-done.png') });
      const m1 = await meals(); await tap('.p2-cknav .ate-done'); await sleep(1200);
      if ((await meals()) !== m1 + 1) fails.push('DONE I just ate this did not log'); await page.waitForFunction(() => !document.querySelector('.p2-cknav .ate-done'), null, { timeout: 30000, polling: 300 }).catch(() => fails.push('cook-along did not close'));
      await clean();
      /* 3. right swipe offer -> I'll eat this plans, no log */
      await ev(() => LowiAte.offer('rb_cinnamon_baked_yogurt_custard')); await sleep(600);
      const f4 = await ev(FIT, '#ateBar.on button'); if (f4.n !== 2) fails.push('swipe offer buttons: ' + f4.n); fails.push(...f4.out.map(x => 'offer ' + x));
      await page.screenshot({ path: path.join(OUT, v + '-4-offer.png') });
      const m2 = await meals(); await tap('#ateBar .ate-later'); await sleep(700);
      const td = await ev(() => { const t = LowiVitalsBridge.state().td || {}; return { extra: t.extra || [], plan: t.plan || [] }; });
      if ((await meals()) !== m2) fails.push("I'll eat this logged a meal"); if (!td.extra.concat(td.plan).includes('rb_cinnamon_baked_yogurt_custard')) fails.push("I'll eat this did not plan it " + JSON.stringify(td));
    } catch (e) { fails.push('crash ' + e.message.slice(0, 200)); }
    const bad = errs.filter(e => /ate|LowiAte/i.test(e)); if (bad.length) fails.push('page errors: ' + bad.join(' | '));
    console.log((fails.length ? 'FAIL ' : 'PASS ') + v + ' ' + JSON.stringify(log)); fails.forEach(f => console.log('   - ' + f)); if (fails.length) fail++;
    await browser.close();
  }
  if (srv) srv.close(); process.exit(fail ? 1 : 0);
})();
