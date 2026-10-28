'use strict';
/* Oct 28 2026 browser check for the Scan camera's Barcode | Essen-Foto switch, with a FAKE camera (tools/sim/fake-cam-init.js:
   a moving canvas stream; no real iPhone camera, no real permission prompt). Proves: the Scan camera opens in Barcode; Essen-Foto
   and back use the same stream (one getUserMedia, no reload); the shutter closes the camera (track stopped) and opens the photo
   sheet with "Als gegessen eintragen"; no meal is logged and the fasting store is unchanged until that tap; Retake reopens the Scan
   camera in Essen-Foto; nothing overflows at 320-430 px.
   node tools/check-scan-photo.cjs [--engine webkit|chromium] [--url https://therealetm.github.io/lowispike/] [--lang de] [--w 390] */
const H = require('./sim/harness.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const engine = arg('engine', 'webkit'), url = arg('url', ''), lang = arg('lang', 'de'), w = +arg('w', 390), out = arg('out', '/tmp/sp/shot');
  const root = path.join(__dirname, '..');
  const R = await H.open({ engine, root, url: url || undefined, base: url || undefined, lang, members: 5, messages: 5, probe: false, viewport: { width: w, height: 844 } }), P = R.page;
  if (engine === 'webkit') await R.ctx.addInitScript({ path: path.join(__dirname, 'sim/no-media-init.js') });
  await R.ctx.addInitScript({ path: path.join(__dirname, 'sim/fake-cam-init.js') });
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); } catch (e) { } }, lang);
  const errs = []; P.on('pageerror', e => errs.push(String(e))); P.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 200)); });
  await R.goto(); await H.sleep(7000);
  const navs = await P.evaluate(() => performance.getEntriesByType('navigation').length);
  await P.evaluate(() => { window.__mealEv = 0; window.addEventListener('lowi:meal-logged', () => window.__mealEv++); window.__fast0 = localStorage.getItem('lowi_fast_v1'); window.__vit0 = localStorage.getItem('lowi_vitals_v1'); window.__loaded = Date.now(); });
  await P.evaluate(() => LowiDex.scan('cam')); await H.sleep(2500);
  const st = () => P.evaluate(() => { const c = document.getElementById('b3Cam'); const r = s => { const e = c && c.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), x: Math.round(b.left), r: Math.round(b.right), vis: getComputedStyle(e).display !== 'none' && b.width > 0, sw: e.scrollWidth, cw: e.clientWidth }; };
    const btn = c ? [...c.querySelectorAll('[data-b3="camact"]')].map(b => b.dataset.act + ':' + b.getAttribute('aria-pressed') + ':' + b.textContent.trim()) : [];
    return { open: !!c, cls: c && c.className, st: c && c.dataset.st, gum: window.__gum, stops: window.__gumStops, btn, hint: c && (c.querySelector('#b3Hint') || {}).textContent, shut: r('.b3-shut'), frame: r('.b3-frame'), bc: r('#b3BcF'), cacts: r('.b3-cacts'), vw: innerWidth, loaded: window.__loaded,
      vid: (() => { const v = document.getElementById('b3Vid'); return v ? { ok: !!v.srcObject, active: !!(v.srcObject && v.srcObject.active), w: v.videoWidth } : null; })() }; });
  const res = { engine, lang, w, url: url || 'local' };
  res.a_open = await st();
  await P.click('#b3Cam [data-b3="camact"][data-act="photo"]'); await H.sleep(900);
  res.b_photo = await st();
  await P.click('#b3Cam [data-b3="camact"][data-act="scan"]'); await H.sleep(700);
  res.c_back = await st();
  await P.click('#b3Cam [data-b3="camact"][data-act="photo"]'); await H.sleep(700);
  res.d_photo2 = await st();
  await R.shot(out + '-' + engine + '-' + lang + '-' + w + '-photo.png');
  await P.click('#b3Cam .b3-shut');
  for (let i = 0; i < 20; i++) { await H.sleep(500); if (await P.evaluate(() => !!document.getElementById('spMeal'))) break; }
  await H.sleep(800);
  res.e_after = await P.evaluate(() => { const f = document.getElementById('spMeal'); const sheet = f && f.closest('.ss-sheet, .sp-sheet, [role=dialog]') || null; const sb = f && f.querySelector('button[type=submit]');
    const words = []; if (sb) { const r = document.createRange(); r.selectNodeContents(sb); const rects = [...r.getClientRects()]; words.push(rects.length); }
    return { camOpen: !!document.getElementById('b3Cam'), stops: window.__gumStops, sheet: !!f, img: !!document.querySelector('.sp-photo-prev'), submit: sb && sb.textContent.trim(), submitRects: words[0], retake: !!document.querySelector('[data-sp="photo"]'), mealEv: window.__mealEv, fastSame: localStorage.getItem('lowi_fast_v1') === window.__fast0, vitSame: localStorage.getItem('lowi_vitals_v1') === window.__vit0, loaded: window.__loaded }; });
  await R.shot(out + '-' + engine + '-' + lang + '-' + w + '-sheet.png');
  if (res.e_after.retake) { await P.click('.sp-photo-acts [data-sp="photo"]'); await H.sleep(2500); res.f_retake = await st(); }
  if (res.f_retake && res.f_retake.open) {
    await H.sleep(800); await P.click('#b3Cam .b3-shut'); await H.sleep(3500);
    res.g_log = await P.evaluate(async () => { const f = document.getElementById('spMeal'); if (!f) return { sheet: false };
      const i = f.querySelector('input[name=title]'); if (i && !i.value) i.value = 'Testschale';
      const sb = f.querySelector('button[type=submit]'); const before = window.__mealEv;
      sb.click(); sb.click(); await new Promise(r => setTimeout(r, 6500));
      return { sheet: true, mealEvBefore: before, mealEvAfter: window.__mealEv }; });
  }
  res.navs = navs; res.navsEnd = await P.evaluate(() => performance.getEntriesByType('navigation').length); res.errs = errs.slice(0, 5);
  console.log(JSON.stringify(res, null, 1));
  await R.close();
})().catch(e => { console.error(e); process.exit(1); });
