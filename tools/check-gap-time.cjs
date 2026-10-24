'use strict';
/* Oct 24 2026 (Emmanuel): Gap > Letzte Mahlzeit > Zeit ändern snapped back to the meal time. Now it moves that meal.
   Logs a meal, opens the Gap, taps Zeit ändern, -1 h, Start speichern; checks Gap, Fuel (S.logs), After-your-meal source,
   one meal only, the date label in the app language, after a reload too; then Fuel's own edit path.
   node tools/check-gap-time.cjs [chromium|webkit] [WxH | device] [de|en] [url] */
const H = require('./sim/harness.cjs');
const engine = process.argv[2] || 'chromium', dev = process.argv[3] || '390x844', lang = process.argv[4] || 'de';
const url = process.argv[5] || 'https://therealetm.github.io/lowispike/index.html';
(async () => {
  const o = { engine, probe: false, url, lang };
  if (engine === 'webkit') o.device = dev; else { const [w, h] = dev.split('x').map(Number); o.viewport = { width: w, height: h }; }
  const R = await H.open(o); const P = R.page; const res = [];
  await R.goto(); await H.sleep(9000);
  const clean = () => P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } document.querySelectorAll('#r2gate,#fstRw,.wn-ov,.wn-card,.tour-ov').forEach(e => e.remove()); });
  await P.evaluate(l => { try { LowiLang.set(l); } catch (e) { } }, lang); await H.sleep(800);
  await clean();
  const build = await P.evaluate(() => fetch('version.json?x=' + Date.now()).then(r => r.json()).then(j => j.version || j.build || JSON.stringify(j)).catch(e => 'n/a'));
  res.push(['build', true, build]);
  res.push(['app language', await P.evaluate(() => LowiLang.get()) === lang, await P.evaluate(() => LowiLang.get())]);
  /* a fast running for 4 h, then a meal logged now through the real Fuel path */
  const meal = await P.evaluate(() => {
    const now = Date.now(); localStorage.setItem('lowi_fast_v1', JSON.stringify({ last: now - 4 * 36e5, hist: [] }));
    const r = LowiVitalsBridge.logMeal({ id: 'gaptime-' + now, t: 'Pasta', lvl: 'low', via: 'spirit', slot: 'meal', macros: { p: 20, c: 50, f: 10 } });
    const L = LowiFastStop.mealList(); return { id: r && r.log && r.log.id, ts: r && r.log && r.log.ts, n: L.length, start: LowiFastStop.startOf(JSON.parse(localStorage.getItem('lowi_fast_v1'))) };
  });
  res.push(['meal logged, Gap counts from it', meal.id && Math.abs(meal.start - meal.ts) < 1000, meal]);
  await H.sleep(1500); await clean(); /* the fast-done reward card from logging the meal */
  await P.evaluate(() => LowiGapView.open()); await H.sleep(1200);
  const tap = async sel => { const b = await P.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel); if (!b) return false; if (engine === 'webkit') await P.mouse.click(b.x, b.y); else await P.touchscreen.tap(b.x, b.y); await H.sleep(700); return true; };
  res.push(['Zeit ändern button in the Gap', await tap('.gv-fix')]);
  if (!(await P.evaluate(() => !!document.querySelector('.fe-card')))) { const top = await P.evaluate(() => { const e = document.querySelector('.gv-fix'); if (!e) return 'no button'; const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return t ? (t.id || t.className || t.tagName) : 'none'; }); console.log('NOTE first tap did not open the sheet, top element:', top, '- tapping again'); await clean(); await tap('.gv-fix'); }
  const sheet = await P.evaluate(() => ({ open: !!document.querySelector('.fe-card'), date: (document.getElementById('feDateShow') || {}).textContent, time: (document.getElementById('feTimeShow') || {}).textContent, raw: (document.getElementById('feDate') || {}).value, keep: (document.querySelector('.fe-keep') || {}).textContent, fill: document.getElementById('feDate') ? getComputedStyle(document.getElementById('feDate')).webkitTextFillColor : '' }));
  const wantMonth = lang === 'de' ? /Okt|Nov|Dez|Jan|Feb|März|Apr|Mai|Juni|Juli|Aug|Sept/ : /Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep/;
  res.push(['sheet open, date in the app language', sheet.open && wantMonth.test(sheet.date || '') && (lang !== 'de' || /\d+\. /.test(sheet.date)), sheet]);
  res.push(['native date text hidden under the label', /rgba\(0, 0, 0, 0\)|transparent/.test(sheet.fill || ''), sheet.fill]);
  res.push(['sheet says the meal moves too', /Pasta/.test(sheet.keep || ''), sheet.keep]);
  await tap('.fe-n[data-m="-60"]');
  const before = await P.evaluate(() => (document.getElementById('feTimeShow') || {}).textContent);
  res.push(['-1 h moves the time (not clamped)', before && before !== sheet.time, { from: sheet.time, to: before }]);
  await tap('.fe-save'); await H.sleep(1200);
  const after = await P.evaluate(id => { const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); const L = LowiFastStop.mealList(); const m = L.find(x => x.id === id); const lm = LowiFastStop.lastMeal(); return { closed: !document.querySelector('.fe-card'), start: LowiFastStop.startOf(f), mealTs: m && m.ts, n: L.length, last: lm && lm.ts, gv: (document.querySelector('.gv-last') || {}).textContent || '' }; }, meal.id);
  const exp = meal.ts - 36e5;
  res.push(['saved, Gap now 1 h earlier (no snap back)', after.closed && Math.abs(after.start - exp) < 61000, { start: new Date(after.start).toTimeString().slice(0, 5), exp: new Date(exp).toTimeString().slice(0, 5) }]);
  res.push(['Fuel shows the same time, still one meal', Math.abs(after.mealTs - after.start) < 1000 && after.n === meal.n, { mealTs: after.mealTs, n: after.n }]);
  res.push(['After your meal reads the same meal', Math.abs(after.last - after.start) < 1000]);
  const hm = new Date(after.start).toTimeString().slice(0, 5);
  const gvOpen = await P.evaluate(() => !!document.querySelector('.gv-ov') && LowiGapView.isOpen());
  res.push(['(info) Gap open after saving: ' + gvOpen + ' (it closed on save before this change too)', true]);
  if (!after.gv) { await P.evaluate(() => LowiGapView.open()); await H.sleep(1000); after.gv = await P.evaluate(() => (document.querySelector('.gv-last') || {}).textContent || ''); }
  const d12 = new Date(after.start), hm12 = String(d12.getHours() % 12 || 12).padStart(2, '0') + ':' + String(d12.getMinutes()).padStart(2, '0');
  res.push(['Gap card shows the new time', (after.gv || '').includes(hm) || (lang === 'en' && (after.gv || '').includes(hm12)), { hm, gv: after.gv }]);
  await R.goto(); await H.sleep(9000); await clean();
  const re = await P.evaluate(id => { const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); const m = LowiFastStop.mealList().find(x => x.id === id); return { start: LowiFastStop.startOf(f), mealTs: m && m.ts }; }, meal.id);
  res.push(['still there after a reload', Math.abs(re.start - after.start) < 1000 && Math.abs(re.mealTs - after.start) < 1000]);
  const fuel = await P.evaluate(id => { const L = LowiFastStop.mealList(); const m = L.find(x => x.id === id); const r = LowiVitalsBridge.editMeal({ id, ts: m.ts - 30 * 6e4 }); const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); return { moved: r && r.moved, ok: Math.abs(LowiFastStop.startOf(f) - (m.ts - 30 * 6e4)) < 1000, n: LowiFastStop.mealList().length }; }, meal.id);
  res.push(['Fuel > Bearbeiten > Uhrzeit still works', fuel.moved && fuel.ok && fuel.n === meal.n, fuel]);
  /* tidy: take the probe meal out again */
  await P.evaluate(id => { try { LowiVitalsBridge.deleteMeal && LowiVitalsBridge.deleteMeal(id); } catch (e) { } }, meal.id);
  res.push(['no page errors', !R.errs.length, R.errs.map(e => e.m).slice(0, 3)]);
  for (const r of res) console.log(r[1] ? 'PASS' : 'FAIL', r[0], r[2] !== undefined ? JSON.stringify(r[2]) : '');
  console.log(res.every(r => r[1]) ? 'ALL PASS' : 'SOME FAIL');
  await R.close(); process.exit(0);
})().catch(e => { console.log('FATAL', e.stack); process.exit(1); });
