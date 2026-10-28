'use strict';
/* Scan exit + live-scan probe: node check-scan-exit.cjs <root|url> [engine] [outprefix]
   1 Home Scan -> picker; food photo -> "Kein Barcode erkannt"; Neues Foto -> picker cancelled -> where are we; X -> where are we.
   2 Home Scan -> picker cancelled -> Barcode live scannen -> what shows (camera prompt count, clutter); X -> where are we. */
const path = require('path');
const arg = process.argv[2] || path.join(__dirname, '..');
const engine = process.argv[3] || 'chromium';
const out = process.argv[4] || '/home/sprite/scannolive/p';
const H = require(path.join(__dirname, 'sim', 'harness.cjs'));
const FOOD = process.env.FOOD || '/home/sprite/scanpick/food.jpg';
const GRANT = process.env.GRANT === '1';
(async () => {
  require('fs').mkdirSync(path.dirname(out), { recursive: true });
  const o = { engine, probe: false, lang: 'de', viewport: { width: 390, height: 844 } };
  if (/^https?:/.test(arg)) o.url = arg; else o.root = arg;
  const R = await H.open(o); const P = R.page; const res = { steps: [] }; const ok = (k, v) => res.steps.push([k, v]);
  await R.ctx.addInitScript((GRANT) => {
    window.__n = { gum: 0, ai: 0 };
    const md = navigator.mediaDevices; if (md && md.getUserMedia) { md.getUserMedia = function () { window.__n.gum++;
      if (!GRANT) return Promise.reject(new DOMException('blocked in probe', 'NotAllowedError'));
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 480; const g = cv.getContext('2d'); setInterval(() => { g.fillStyle = '#345'; g.fillRect(0, 0, 640, 480); g.fillStyle = '#fff'; g.fillText(String(Date.now()), 20, 40); }, 100);
      return Promise.resolve(cv.captureStream(10)); }; }
  }, GRANT);
  const errs = []; P.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await R.goto(); await H.sleep(8000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } });
  await H.sleep(600);
  const where = () => P.evaluate(() => {
    const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05; };
    const cam = document.getElementById('b3Cam'), w = document.getElementById('spWorld');
    const q = s => [...document.querySelectorAll(s)].filter(vis).length;
    return { par: cam ? (cam.parentElement.id || cam.parentElement.className) : null, wh: w ? [w.hidden, getComputedStyle(w).display, getComputedStyle(w).opacity] : null, gum: window.__n.gum, cam: !!cam, st: cam ? cam.dataset.st || '' : null, pick: !!(cam && cam.classList.contains('b3-pick')), live: !!(cam && cam.classList.contains('b3-livebc')),
      world: !!(w && !w.hidden && vis(w)), worldCls: w ? w.className : null, toggles: q('#b3Cam .b3-cacts'), deep: q('#b3Cam .b3-deep'), fields: q('#b3Cam #b3BcF') + q('#b3Cam #b3NmF'),
      frame: q('#b3Cam .b3-frame'), mood: q('#spWorld .sp-mood, #spWorld [class*="feel"]'), sheets: q('.r2-sheet, .lv-sheet, .ss-sheet'), tab: (document.querySelector('.tab.on, [aria-current="page"]') || {}).textContent || '' };
  });
  const tapChoose = async (sel, file, label) => {
    const el = await P.$(sel); if (!el) { ok(label, 'NO ELEMENT ' + sel); return null; }
    const bb = await el.boundingBox();
    const wait = P.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null);
    await P.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
    const fc = await wait; ok(label + ' chooser', !!fc);
    if (fc && file) await fc.setFiles(file);
    else if (file) { await H.sleep(500); await P.setInputFiles('#b3Pick', file); ok(label + ' set direct', true); }
    return fc;
  };
  const cancelPicker = async () => { await P.evaluate(() => { const i = document.getElementById('b3Pick'); if (i) i.dispatchEvent(new Event('cancel', { bubbles: true })); }); await H.sleep(900); };
  const tap = async (sel) => { const el = await P.$(sel); if (!el) return 'NO ELEMENT ' + sel; const bb = await el.boundingBox(); if (!bb) return 'NO BOX';
    const hit = await P.evaluate(([x, y, sel]) => { const h = document.elementFromPoint(x, y), e = document.querySelector(sel); return h === e || (e && e.contains(h)) ? 'hit' : 'BLOCKED by ' + (h ? h.tagName + '.' + h.className + '#' + h.id : 'null'); }, [bb.x + bb.width / 2, bb.y + bb.height / 2, sel]); ok('hit ' + sel, hit); await P.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); return 'tapped'; };
  /* the X the user sees: the bottom-center close (bottom-close.js #lwBX) when it stands in, else the scanner's own */
  const tapX = async () => { const bx = await P.evaluate(() => { const b = document.getElementById('lwBX'); if (!b) return null; const r = b.getBoundingClientRect(), s = getComputedStyle(b); return r.width > 0 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.3 && b.classList.contains('on') ? 1 : null; });
    if (bx) return 'lwBX ' + await tap('#lwBX'); return 'own ' + await tap('#b3Cam [data-b3="camclose"]'); };
  // A: photo -> none -> Neues Foto -> cancel -> X
  const fc1 = await tapChoose('#whHud [data-orbit="scan"]', FOOD, 'A home scan');
  await P.waitForFunction(() => { const c = document.getElementById('b3Cam'); return c && /picknone|pickqr/.test(c.dataset.st || ''); }, null, { timeout: 20000 }).catch(() => { });
  ok('A after food', await where()); await P.screenshot({ path: out + '-A1-none.png' });
  await tapChoose('#b3Cam [data-b3="pickretake"]', null, 'A retake');
  await cancelPicker(); ok('A after retake cancel', await where()); await P.screenshot({ path: out + '-A2-retake-cancel.png' });
  ok('A tap X', await tapX()); await H.sleep(1200);
  ok('A after X', await where()); await P.screenshot({ path: out + '-A3-after-x.png' });
  // B: scan -> cancel -> live -> X
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } }); await H.sleep(600);
  await tapChoose('#whHud [data-orbit="scan"]', null, 'B home scan'); await cancelPicker();
  ok('B after first cancel', await where()); await P.screenshot({ path: out + '-B1-start.png' });
  ok('B tap live', await tap('#b3Cam [data-b3="picklive"]')); await H.sleep(2500);
  ok('B live', await where()); await P.screenshot({ path: out + '-B2-live.png' });
  // focus / visibility churn like the iOS prompt closing: must not ask again
  await P.evaluate(() => { window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); }); await H.sleep(1500);
  ok('B after focus churn', await where());
  ok('B tap X', await tapX()); await H.sleep(1200);
  ok('B after X', await where()); await P.screenshot({ path: out + '-B3-after-x.png' });
  // C: live -> app away and back -> paused card, no new camera request; Foto machen -> system camera + photo screen
  await tapChoose('#whHud [data-orbit="scan"]', null, 'C home scan'); await cancelPicker();
  await tap('#b3Cam [data-b3="picklive"]'); await H.sleep(2500);
  await P.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await H.sleep(500);
  await P.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
  await H.sleep(1500); ok('C back from away', await where()); await P.screenshot({ path: out + '-C1-pause.png' });
  const lp = await P.$('#b3Cam [data-b3="livephoto"]'); ok('C livephoto button', !!lp);
  if (lp) { ok('C hit', await P.evaluate(() => { const e = document.querySelector('#b3Cam [data-b3="livephoto"]'); const r = e.getBoundingClientRect(); const h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return (h === e || e.contains(h)) ? 'hit' : 'BLOCKED ' + h.tagName + '.' + h.className; }));
    await tapChoose('#b3Cam [data-b3="livephoto"]', null, 'C livephoto'); await H.sleep(800); ok('C after livephoto', await where());
    await cancelPicker(); ok('C after livephoto cancel', await where()); }
  res.errs = errs;
  console.log(JSON.stringify(res, null, 1));
  await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
