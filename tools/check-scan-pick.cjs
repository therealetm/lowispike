'use strict';
/* photo-first Scan probe (29 Oct 2026, quiet barcode, else the AI on its own):
   node check-scan-pick.cjs <root|url> [engine] [outprefix]   env W/HGT viewport, SLOW=1 a barcode reader that never answers
   A Home Scan -> food photo: only "Foto wird geprüft…", never a no-barcode card, then the AI photo check by itself (one hand-off)
   B Home Scan -> barcode photo: product card, no AI
   C Scan -> cancel -> Aus Fotos -> food photo: the AI by itself
   D Scan -> food photo -> X straight away: no AI
   SLOW=1: the reader hangs, the AI still starts after PICK_WAIT_MS */
const path = require('path');
const arg = process.argv[2] || path.join(__dirname, '..');
const engine = process.argv[3] || 'chromium';
const out = process.argv[4] || '/home/sprite/scanpick/p';
const H = require(path.join(__dirname, 'sim', 'harness.cjs'));
const FOOD = process.env.FOOD || '/home/sprite/scanpick/food.jpg', BC = process.env.BC || '/home/sprite/scanpick/bc.png';
const SLOW = process.env.SLOW === '1';
(async () => {
  require('fs').mkdirSync(path.dirname(out), { recursive: true });
  const o = { engine, probe: false, lang: 'de', viewport: { width: +(process.env.W || 390), height: +(process.env.HGT || 844) } };
  if (/^https?:/.test(arg)) o.url = arg; else o.root = arg;
  const R = await H.open(o); const P = R.page; const res = { engine, viewport: o.viewport, slow: SLOW, steps: [] }; const ok = (k, v) => res.steps.push([k, v]);
  await R.ctx.addInitScript((SLOW) => {
    window.__n = { gum: 0, aiFetch: 0, photoFile: 0, sts: [], txt: [] };
    const md = navigator.mediaDevices; if (md && md.getUserMedia) md.getUserMedia = function () { window.__n.gum++; return Promise.reject(new DOMException('blocked in probe', 'NotAllowedError')); };
    if (SLOW) { window.BarcodeDetector = class { static async getSupportedFormats() { return ['ean_13', 'ean_8', 'upc_a', 'upc_e']; } detect() { return new Promise(() => { }); } }; }
    const f0 = window.fetch; window.fetch = function (u) { try { if (/food-photo|analy[sz]e-food|photo-check/.test(String(u && u.url || u))) { window.__n.aiFetch++; return Promise.resolve(new Response(JSON.stringify({ error: 'probe' }), { status: 503 })); } } catch (e) { } return f0.apply(this, arguments); };
    setInterval(() => { const S = window.LowiSpirit; if (S && !S.__h && typeof S.photoFile === 'function') { S.__h = 1; const fn = S.photoFile; S.photoFile = function () { window.__n.photoFile++; window.__n.aiAt = Date.now(); return fn.apply(this, arguments); }; }
      const c = document.getElementById('b3Cam'); const st = c ? c.dataset.st || '' : '-'; const a = window.__n.sts; if (a[a.length - 1] !== st) a.push(st);
      const m = c && c.querySelector('#b3CMsg'); const tx = m ? m.innerText.replace(/\s+/g, ' ').trim() : ''; if (tx && window.__n.txt.indexOf(tx) < 0) window.__n.txt.push(tx); }, 60);
  }, SLOW);
  const errs = []; P.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await R.goto(); await H.sleep(8000);
  const reset = async () => { await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const c = document.getElementById('b3Cam'); if (c) { const x = c.querySelector('[data-b3="camclose"]'); if (x) x.click(); } window.__n.sts = []; window.__n.txt = []; }); await H.sleep(900); };
  await reset();
  const n = () => P.evaluate(() => ({ photoFile: window.__n.photoFile, aiFetch: window.__n.aiFetch, gum: window.__n.gum, sts: window.__n.sts.slice(), txt: window.__n.txt.slice(), cam: !!document.getElementById('b3Cam'), card: !!document.querySelector('#b3Cam .ss-card'),
    sheet: !!document.querySelector('#spMeal'), noBarcode: /Kein Barcode erkannt|Mit KI analysieren/.test(document.body.innerText) }));
  const tapChoose = async (sel, file, label) => {
    const el = await P.$(sel); if (!el) { ok(label, 'NO ELEMENT ' + sel); return null; }
    const bb = await el.boundingBox(); const wait = P.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null);
    await P.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
    const fc = await wait; ok(label + ' chooser', !!fc); if (fc && file) await fc.setFiles(file);
    /* headless sometimes opens no chooser for the hidden input: hand the photo to the same input the way the picker would */
    if (!fc && file) { const id = /picklib/.test(sel) ? '#b3PickLib' : '#b3Pick'; await P.setInputFiles(id, file).then(() => ok(label + ' via input', id), e => ok(label + ' input err', String(e).slice(0, 120))); }
    return fc || true; };
  const waitAI = async (from, ms) => { const t0 = Date.now(); await P.waitForFunction((k) => window.__n.photoFile > k, from, { timeout: ms }).catch(() => { }); return Date.now() - t0; };
  // A food photo from Home Scan
  let before = (await n()).photoFile;
  await tapChoose('#whHud [data-orbit="scan"]', FOOD, 'A home scan');
  await H.sleep(150); await P.screenshot({ path: out + '-A1-reading.png' });
  ok('A ms until AI', await waitAI(before, 15000)); await H.sleep(2500);
  const a = await n(); ok('A after', a); ok('A one hand-off', a.photoFile - before === 1); await P.screenshot({ path: out + '-A2-ai.png' });
  await reset();
  // B barcode photo
  before = (await n()).photoFile;
  await tapChoose('#whHud [data-orbit="scan"]', BC, 'B home scan');
  const t1 = Date.now(); await P.waitForFunction(() => !!document.querySelector('#b3Cam .ss-card'), null, { timeout: 20000 }).catch(() => { });
  ok('B ms until card', Date.now() - t1); await H.sleep(PICK() + 1500);
  const b = await n(); ok('B after', Object.assign({}, b, { cardText: await P.evaluate(() => ((document.querySelector('#b3Cam .ss-card') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 120)) }));
  ok('B no AI', b.photoFile === before); await P.screenshot({ path: out + '-B-card.png' });
  await reset();
  // C Aus Fotos
  before = (await n()).photoFile;
  await tapChoose('#whHud [data-orbit="scan"]', null, 'C home scan');
  await P.evaluate(() => { const i = document.getElementById('b3Pick'); if (i) i.dispatchEvent(new Event('cancel', { bubbles: true })); }); await H.sleep(900);
  ok('C start', await n());
  await tapChoose('#b3Cam [data-b3="picklib"]', FOOD, 'C from photos');
  ok('C ms until AI', await waitAI(before, 15000)); await H.sleep(1500);
  const c = await n(); ok('C after', c); ok('C one hand-off', c.photoFile - before === 1);
  await reset();
  // D X while reading
  before = (await n()).photoFile;
  await tapChoose('#whHud [data-orbit="scan"]', FOOD, 'D home scan');
  await H.sleep(120); await P.evaluate(() => { const x = document.querySelector('#b3Cam [data-b3="camclose"]'); if (x) x.click(); });
  await H.sleep(PICK() + 2500); const d = await n(); ok('D after X', d); ok('D no AI', d.photoFile === before);
  res.errs = errs;
  console.log(JSON.stringify(res, null, 1));
  await R.close().catch(() => { }); process.exit(0);
  function PICK() { return 4000; }
})().catch(e => { console.error(e); process.exit(1); });
