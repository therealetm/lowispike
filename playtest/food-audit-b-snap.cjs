'use strict';
/* Food audit journey B: Log meal > Snap. Camera screen (no camera / fake camera), pick a photo from the library, photo sheet,
   AI reply (AI=off: every host blocked, like no network; AI=mock: fake food-photo answer; AI=hang: POST never answers),
   Log as meal, Retake, close/reopen. Never reaches the real server. */
const { open, sleep } = require('./food-audit-lib.cjs');
const AI = process.env.AI || 'off', DEV = process.env.DEV || 'iPhone 13', ENG = process.env.ENG || 'webkit';
const MOCK = { ok: true, isFood: true, confidence: 'high', dishes: [{ name: 'Rice', portion: '1 cup', kcal: 200, protein: 4, carbs: 44, sugar: 0, fiber: 1, fat: 0 }, { name: 'Sesame chicken', portion: '150 g', kcal: 380, protein: 30, carbs: 20, sugar: 8, fiber: 1, fat: 18 }], left: 2, limit: 3 };
(async () => {
  const route = (q, u) => {
    if (AI === 'off' || !/functions\/v1\/food-photo/.test(u.pathname)) return null;
    if (q.method() === 'GET') return { status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, configured: true, left: 2, limit: 3 }) };
    if (AI === 'mock') return { status: 200, contentType: 'application/json', body: JSON.stringify(MOCK) };
    return null;
  };
  const H = await open({ tag: 'B-' + AI + '-' + DEV.replace(/\W/g, ''), device: DEV, engine: ENG, route, lang: process.env.L || '' }); const p = H.page;
  if (AI === 'hang') await p.route('**/functions/v1/food-photo', async r => { if (r.request().method() === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, configured: true }) }); await sleep(120000); r.abort().catch(() => { }); });
  const log = (k, v) => console.log('\n### ' + k + '\n' + (Array.isArray(v) ? v.join('\n') : typeof v === 'string' ? v : JSON.stringify(v)));
  await H.tap('[data-orbit="fuel"]'); await sleep(1300); await p.tap('#hb2Bloom [data-id="log"]'); await sleep(1800);
  await p.tap('[data-sp="slot"][data-slot="lunch"]'); await sleep(1300);
  await p.tap('[data-sp="photo"]'); await sleep(3500); await H.shot('cam');
  log('B1 camera screen', { card: await p.evaluate(() => (document.querySelector('#ssFood .ss-card') || {}).innerText), live: await p.evaluate(() => !!document.querySelector('#ssFood.live')), dump: await H.dump(20) });
  if (ENG === 'chromium') { const sh = await p.$('[data-sp="shutter"]'); if (sh) { await sh.tap(); await sleep(4000); } }
  else {
    const fi = await p.$('#ssFood .sp-file-in'); await fi.setInputFiles('/home/sprite/FOODAUDIT/plate.jpg'); await sleep(5000);
  }
  await H.shot('photo-sheet-1');
  const t0 = Date.now();
  let msg = '';
  for (let i = 0; i < 20; i++) { msg = await p.evaluate(() => (document.querySelector('.sp-ai') || {}).innerText || ''); if (msg && !/Looking|schaue|Mirando/.test(msg)) break; await sleep(2000); }
  log('B2 AI box after ' + Math.round((Date.now() - t0) / 1000) + ' s', msg);
  log('B2 photo sheet', { title: await p.evaluate(() => document.querySelector('#spMeal.sp-photo-form input[name="title"]').value), sheets: await H.sheets(), dump: await H.dump(40) });
  // overlap check of the photo sheet controls (item 1 iPad complaint)
  log('B3 overlaps', await p.evaluate(() => {
    const sh = document.querySelector('#spMeal.sp-photo-form').closest('.r2-sheet, .r2-ov, [role=dialog]') || document.body;
    const els = [...sh.querySelectorAll('button, input:not([type=hidden]), label, .sp-ai, img.sp-photo-prev')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(e).visibility !== 'hidden'; });
    const box = e => e.getBoundingClientRect(), nm = e => e.tagName + '.' + String(e.className).split(' ')[0] + '"' + (e.innerText || e.placeholder || '').trim().slice(0, 18) + '"';
    const out = [];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i], b = els[j]; if (a.contains(b) || b.contains(a)) continue; const A = box(a), B = box(b); const ox = Math.min(A.right, B.right) - Math.max(A.left, B.left), oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top); if (ox > 4 && oy > 4) out.push(nm(a) + ' x ' + nm(b) + ' ' + Math.round(ox) + 'x' + Math.round(oy)); }
    return { vw: innerWidth, vh: innerHeight, overlaps: out.slice(0, 12) };
  }));
  if (!(await p.evaluate(() => document.querySelector('#spMeal.sp-photo-form input[name="title"]').value))) await p.fill('#spMeal.sp-photo-form input[name="title"]', 'sesame chicken on rice');
  const btn = await p.$('#spMeal.sp-photo-form button[type="submit"]'); await btn.scrollIntoViewIfNeeded(); await btn.tap(); await sleep(5000);
  const s = await H.state();
  log('B4 after Log as meal', { logs: s.logs.length, last: s.logs.slice(-1).map(l => ({ t: l.t, slot: l.slot, photo: (l.photo || '').slice(0, 30), kcal: l.macros && l.macros.kcal, via: l.via })), sheets: await H.sheets(), text: (await H.text()).split('\n').slice(-12).join(' | ') });
  await p.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } }); await sleep(800);
  // Retake path: open Snap again, pick photo, Retake -> camera again; close camera; is anything left over?
  await H.tap('[data-orbit="fuel"]'); await sleep(1300); await p.tap('#hb2Bloom [data-id="log"]'); await sleep(1800);
  await p.tap('[data-sp="slot"][data-slot="snack"]'); await sleep(1300); await p.tap('[data-sp="photo"]'); await sleep(2500);
  if (ENG !== 'chromium') { const fi = await p.$('#ssFood .sp-file-in'); await fi.setInputFiles('/home/sprite/FOODAUDIT/plate.jpg'); await sleep(4500); } else { await p.tap('[data-sp="shutter"]'); await sleep(4000); }
  const rt = await H.tapText(/^Retake$|Neu aufnehmen|Repetir/); await sleep(2500);
  log('B5 Retake', { tapped: rt, camOpen: await p.evaluate(() => !!document.querySelector('#ssFood')), sheets: await H.sheets() });
  const x = await p.$('#ssFood [data-sp="cancelCapture"]'); if (x) { await x.tap(); await sleep(1500); }
  log('B6 after closing camera', { camOpen: await p.evaluate(() => !!document.querySelector('#ssFood')), htmlCls: await p.evaluate(() => document.documentElement.className.split(' ').filter(c => /ss-|cam|food/.test(c)).join(' ')), sheets: await H.sheets(), logs: (await H.state()).logs.length, tracks: await p.evaluate(() => [...document.querySelectorAll('video')].map(v => v.srcObject ? v.srcObject.getTracks().filter(t => t.readyState === 'live').length : 0)) });
  await H.shot('after-close');
  log('errs', H.errs); log('blocked hosts', Object.keys(H.blocked).filter(k => !/rest\/v1/.test(k)).slice(0, 12));
  await H.close();
})().catch(e => { console.error(e); process.exit(1); });
