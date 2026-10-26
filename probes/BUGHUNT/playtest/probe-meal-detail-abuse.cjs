/* Run 24: abuse the new Meal details sheet (Chat label, old-post photo, For You chip): double tap, triple tap, tap while closing,
   Escape + where focus lands, sheets left behind. Fake Supabase from the regress harness: nothing is written anywhere.
   node probe-meal-detail-abuse.cjs [url] [engine] */
'use strict';
const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
const H = require(WT + '/tools/regress/harness.cjs'), N = require(WT + '/tools/regress/nav.cjs');
const K = require(WT + '/community-chat-core.js');
global.LowiMealSnap = require(WT + '/meal-photo.js'); global.LowiFoodKnowledge = require(WT + '/food-knowledge-core.js');
const M = require(WT + '/meal-detail-core.js'), J = require(WT + '/meal-journal.js');
const URL_ = process.argv[2] || '', ENG = process.argv[3] || 'chromium';
const log0 = { t: 'Lachs-Bowl', lvl: 'low', ai: J.estimate({ name: 'Salmon bowl', items: [{ name: 'Salmon', portion: '150 g' }, { name: 'Avocado', portion: '1/2' }], total: { kcal: 520, carbs: 14, protein: 38, fiber: 8, sugar: 4, fat: 30 } }) };
(async () => {
  const R = await H.open(Object.assign({ probe: false, url: URL_, messages: 60, members: 20, lang: 'en', engine: ENG }, ENG === 'webkit' ? { device: 'iPhone 13', viewport: { width: 390, height: 844 } } : { viewport: { width: 390, height: 844 } }));
  const p = R.page, sim = R.sim, errs = [], out = {};
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const a = sim.say('tmp-old'), b = sim.say('tmp-new'); const host = sim.HOST || 'vnfwmifmsfecascwaody.supabase.co';
  a.body = K.mealBody('https://' + host + '/storage/v1/object/public/media/' + a.user_id + '/meal-old001.jpg', 'Toast', 'high', '');
  b.body = K.mealBody('https://' + host + '/storage/v1/object/public/media/' + b.user_id + '/meal-new001.jpg', 'Lachs-Bowl', 'low', 'Lunch!');
  b.meal = M.fromLog(log0, 'low'); b.who = 'Antje';
  await R.goto();
  await N.openCommunity(R, () => {});
  const slow = ENG === 'webkit' ? 120000 : 30000;
  if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) await p.locator('#cmPaneChat .rm-tab[data-rm="chat"]').first().click({ force: true, timeout: 8000 });
  await p.waitForFunction(() => document.querySelectorAll('#cmList [id^="cm-"]').length > 0, null, { timeout: slow });
  const lab = p.locator('button.cs-meal-bs[data-id="' + b.id + '"]'); await lab.waitFor({ state: 'attached', timeout: slow }); await lab.scrollIntoViewIfNeeded();
  const count = () => p.evaluate(() => ({ ov: document.querySelectorAll('.md-ov').length, on: document.querySelectorAll('.md-ov.on').length, sheets: document.querySelectorAll('.r2-ov,.md-ov').length, focus: (document.activeElement && (document.activeElement.className + '|' + (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent || '').slice(0, 40))) }));
  const closeAll = async () => { for (let i = 0; i < 4; i++) { if (!(await p.evaluate(() => !!document.querySelector('.md-ov.on')))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(700); } await p.waitForTimeout(800); };
  // 1 double tap via JS clicks (as fast as fingers can't, then 60 ms)
  for (const gap of [0, 60, 150]) {
    await p.evaluate(async ([id, gap]) => { const el = document.querySelector('button.cs-meal-bs[data-id="' + id + '"]'); el.click(); if (gap) await new Promise(r => setTimeout(r, gap)); const el2 = document.querySelector('button.cs-meal-bs[data-id="' + id + '"]'); el2 && el2.click(); }, [b.id, gap]);
    await p.waitForTimeout(900); out['dbl' + gap] = await count(); await closeAll(); out['dbl' + gap + 'after'] = await count();
  }
  // 2 real double tap with the pointer at the label position
  const bb = await lab.boundingBox();
  await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2, { clickCount: 2, delay: 40 }); await p.waitForTimeout(900); out.realDbl = await count(); await closeAll(); out.realDblAfter = await count();
  await p.evaluate(() => { window.__mdo = 0; window.__cl = []; const o = LowiMealDetail.open; LowiMealDetail.open = function () { window.__mdo++; return o.apply(this, arguments); }; document.addEventListener('click', e => { if (e.target.classList && e.target.classList.contains('r2-scrim')) window.__cl.push(performance.now() | 0); }, true); });
  for (const d of [30, 90, 180]) { await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(d); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(900); out['touchDbl' + d] = Object.assign(await count(), await p.evaluate(() => ({ opens: window.__mdo, scrimClicks: window.__cl.length }))); await closeAll(); }
  if (process.env.ONLY_TOUCH) { console.log(JSON.stringify({ out, errs }, null, 1)); await R.close(); return; }
  // 3 focus after Escape (keyboard open)
  await lab.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(900); out.kbOpen = await count();
  await p.keyboard.press('Escape'); await p.waitForTimeout(1200); out.kbClosed = await count();
  // 4 open, then a new chat message arrives (thread re-render) while sheet is open, then Escape
  await lab.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
  const c = sim.say('tmp-new2'); c.body = 'hello while sheet open'; await p.waitForTimeout(4000);
  out.rerenderOpen = await count(); await p.keyboard.press('Escape'); await p.waitForTimeout(1200); out.rerenderClosed = await count();
  // 5 tap again while the sheet is closing
  await lab.click(); await p.waitForTimeout(900); await p.keyboard.press('Escape'); await p.waitForTimeout(60);
  await p.evaluate(id => { const el = document.querySelector('button.cs-meal-bs[data-id="' + id + '"]'); el && el.click(); }, b.id); await p.waitForTimeout(1200); out.reopenWhileClosing = await count(); await closeAll(); out.reopenAfter = await count();
  console.log(JSON.stringify({ out, errs }, null, 1));
  await R.close();
})().catch(e => { console.log('FAIL', e.stack); process.exit(1); });
