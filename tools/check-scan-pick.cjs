'use strict';
/* photo-first Scan probe: node probe.cjs <root|url> [engine] [outprefix] */
const arg = process.argv[2] || require('path').join(__dirname, '..');
const engine = process.argv[3] || 'chromium';
const out = process.argv[4] || '/home/sprite/scanpick/p';
const H = require(require('path').join(__dirname, 'sim', 'harness.cjs'));
const FOOD = process.env.FOOD || '/home/sprite/scanpick/food.jpg', BC = process.env.BC || '/home/sprite/scanpick/bc.png';
(async () => {
  const o = { engine, probe: false, lang: 'de', viewport: { width: 390, height: 844 } };
  if (/^https?:/.test(arg)) o.url = arg; else o.root = arg;
  const R = await H.open(o); const P = R.page; const res = { steps: [] }; const ok = (k, v) => res.steps.push([k, v]);
  await R.ctx.addInitScript(() => {
    window.__n = { gum: 0, ai: 0, aiFetch: 0, photoFile: 0 };
    const md = navigator.mediaDevices; if (md && md.getUserMedia) { const g = md.getUserMedia.bind(md); md.getUserMedia = function (c) { window.__n.gum++; return Promise.reject(new DOMException('blocked in probe', 'NotAllowedError')); }; }
    const f0 = window.fetch; window.fetch = function (u) { try { if (/food-photo/.test(String(u && u.url || u))) { window.__n.aiFetch++; return Promise.resolve(new Response(JSON.stringify({ error: 'probe' }), { status: 503 })); } } catch (e) { } return f0.apply(this, arguments); };
    const hook = () => { const A = window.LowiFoodAI; if (A && !A.__h) { A.__h = 1; for (const k of ['analyse', 'mount']) if (typeof A[k] === 'function') { const fn = A[k]; A[k] = function () { window.__n.ai++; return fn.apply(this, arguments); }; } }
      const S = window.LowiSpirit; if (S && !S.__h && typeof S.photoFile === 'function') { S.__h = 1; const fn = S.photoFile; S.photoFile = function () { window.__n.photoFile++; return fn.apply(this, arguments); }; } };
    setInterval(hook, 200);
  });
  const errs = []; P.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await R.goto(); await H.sleep(8000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } });
  await H.sleep(600);
  const n = () => P.evaluate(() => Object.assign({}, window.__n, { st: (document.getElementById('b3Cam') || { dataset: {} }).dataset.st || null, pick: !!document.querySelector('#b3Cam.b3-pick'), card: !!document.querySelector('#b3Cam .ss-card') }));
  const tapChoose = async (sel, file, label) => {
    const el = await P.$(sel); if (!el) { ok(label, 'NO ELEMENT ' + sel); return null; }
    const bb = await el.boundingBox();
    const wait = P.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null);
    await P.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
    const fc = await wait; ok(label + ' chooser', !!fc);
    if (fc && file) await fc.setFiles(file);
    return fc;
  };
  P.on("filechooser", () => ok("GLOBAL chooser", Date.now()));
  await P.evaluate(() => { const ic = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { if (this.type === "file") window.__fc = (window.__fc || []).concat([{ id: this.id, act: navigator.userActivation.isActive, conn: this.isConnected, ev: window.event && window.event.type, tr: window.event && window.event.isTrusted }]); return ic.apply(this, arguments); }; });
const hits = (sels) => P.evaluate((sels) => sels.map(sel => { const e = document.querySelector(sel); if (!e) return [sel, 'none']; const r = e.getBoundingClientRect(); const h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return [sel, Math.round(r.x) + ',' + Math.round(r.y) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height), h === e || e.contains(h) ? 'hit' : 'BLOCKED by ' + (h && (h.className || h.tagName))]; }), sels);
  const geo = () => P.evaluate(() => { const g = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; }; return { box: g('#b3Cam .b3-pickbox'), bot: g('#b3Cam .b3-cbot'), bcf: g('#b3BcF'), nmf: g('#b3NmF'), x: g('#b3Cam .b3-cx'), vh: innerHeight }; });
  // 1 Home Scan bubble -> picker straight away, panel behind
  const fc1 = await tapChoose('#whHud [data-orbit="scan"]', null, 'home scan');
  ok('picker capture attr', await P.evaluate(() => { const i = document.getElementById('b3Pick'); return i ? i.getAttribute('capture') + '/' + i.accept : null; }));
  await H.sleep(900); ok("fc", await P.evaluate(() => window.__fc)); ok("after open (cancel)", await n());
  await P.screenshot({ path: out + '-start.png' }); ok('hits start', await hits(['#b3Cam [data-b3="pickshoot"]','#b3Cam [data-b3="picklib"]','#b3Cam [data-b3="picklive"]','#b3Bc','#b3Nm','#b3Cam [data-b3="camclose"]'])); ok('geo start', await geo());
  // 2 food photo (no barcode) -> choice, no AI
  if (fc1) await fc1.setFiles(FOOD);
  const t0 = Date.now(); await P.waitForFunction(() => { const c = document.getElementById('b3Cam'); return c && /picknone|pickqr/.test(c.dataset.st || ''); }, null, { timeout: 20000 }).catch(() => { });
  ok("food decode ms", Date.now() - t0); ok("passes", await P.evaluate(() => window.__stillT)); ok('after food', await n());
  await P.screenshot({ path: out + '-none.png' }); ok('hits none', await hits(['#b3Cam [data-b3="pickretake"]','#b3Cam [data-b3="pickai"]'])); ok('geo none', await geo());
  // 3 retake -> chooser, barcode photo -> product card, no AI
  await tapChoose('#b3Cam [data-b3="pickretake"]', BC, 'retake');
  const t1 = Date.now(); await P.waitForFunction(() => !!document.querySelector('#b3Cam .ss-card'), null, { timeout: 20000 }).catch(() => { });
  ok('barcode ms', Date.now() - t1); await H.sleep(2500); ok('after barcode', await n());
  ok('card text', await P.evaluate(() => (document.querySelector('#b3Cam .ss-card') || {}).innerText || '').then(s => s.replace(/\s+/g, ' ').slice(0, 160)));
  await P.screenshot({ path: out + '-card.png' });
  // 4 close card -> back to Take photo, no camera
  const x = await P.$('#b3Cam .ss-card [data-ss="next"]'); if (x) { await x.click(); await H.sleep(800); }
  ok('after card close', await n());
  // 5 Take photo -> food -> Analyse with AI = exactly one hand-off
  await tapChoose('#b3Cam [data-b3="pickshoot"]', FOOD, 'shoot');
  await P.waitForFunction(() => { const c = document.getElementById('b3Cam'); return c && /picknone|pickqr/.test(c.dataset.st || ''); }, null, { timeout: 20000 }).catch(() => { });
  ok('before AI tap', await n());
  const ai = await P.$('#b3Cam [data-b3="pickai"]'); if (ai) { await ai.click(); await H.sleep(2500); }
  ok('after AI tap', await n());
  await P.screenshot({ path: out + '-ai.png' });
  res.errs = errs;
  console.log(JSON.stringify(res, null, 1));
  await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
