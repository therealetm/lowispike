'use strict';
/* Code error sweep 2026-10-24 06:02: types muesli with milk into Log a meal (live check of the muesli fix), then stops after the saved sheet.
   Based on hunt-meal-flow.cjs. Bug hunt (Fuel): the meal log like a user. Log bloom > Meal > Write: type a meal, Save, read the saved sheet; back in Log meal,
   open today's entry, try a future time, add a piece, save, delete (two taps). Then the photo path: Library with a food photo
   (food-photo endpoint is a stand-in, never the real one), the estimate, Log it, the saved sheet (thumbnail + Share), reload,
   today's list still has the photo entry. Prints the visible text at each step and English left in de/es.
   node tools/hunt-meal-flow.cjs <device> [lang] [theme] [url] */
const H = require('./sim/harness.cjs');
const FIX = process.env.SR_PHOTO || '/home/sprite/photo-check-plate.jpg', FAKE = 'https://food-fixture.invalid/food-photo';
const DISHES = [{ name: 'Grilled chicken', portion: '~150 g', grams: 150, kcal: 250, protein: 38, carbs: 0, sugar: 0, fiber: 0, fat: 9 }, { name: 'White rice', portion: '1 cup', grams: 180, kcal: 230, protein: 4, carbs: 50, sugar: 0, fiber: 1, fat: 0.5 }];
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 13', lang = A[1] || 'en', theme = A[2] || 'dark', url = A[3] || 'https://therealetm.github.io/lowispike/index.html';
  const tag = device.replace(/\W/g, '') + '-' + lang, out = '/tmp/sweep-0602/muesli-' + tag;
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.route(FAKE + '**', r => { const m = r.request().method(); return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }, body: JSON.stringify(m === 'POST' ? { dishes: DISHES, confidence: 'high', left: 2, limit: 3, model: 'fixture' } : { ok: true, configured: true, left: 3, limit: 3 }) }); });
  await R.ctx.addInitScript(([t, l, u]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } window.LOWI_FOOD_AI_URL = u; }, [theme, lang, FAKE]);
  await R.goto(); await H.sleep(5000); const P = R.page;
  const errs = []; P.on('pageerror', e => errs.push(String(e.message).slice(0, 200))); P.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  let n = 0; const shot = async (s) => { await P.screenshot({ path: out + '-' + (n++) + '-' + s + '.png' }).catch(() => { }); };
  const top = () => P.evaluate(() => { const L = [...document.querySelectorAll('.r2-ov.on, #ssFood, [role=dialog]')].filter(e => { const r = e.getBoundingClientRect(); return r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }); const s = L.pop(); return s ? (s.innerText || '').replace(/\s+/g, ' ').slice(0, 400) : '(none)'; });
  const toast = () => P.evaluate(() => [...document.querySelectorAll('.r2-toast, .toast, [role=status], [aria-live]')].map(e => (e.innerText || '').trim()).filter(Boolean).join(' | ').slice(0, 200));
  const tapQ = async (sel, rx) => { const sc = await P.evaluate(([sel, src]) => { const rx = src ? new RegExp(src, 'i') : null; const L = [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (!rx || rx.test((e.getAttribute('aria-label') || '') + ' ' + e.innerText)); }); const e = L.pop(); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return [x, y, !!(t && (t === e || e.contains(t))), t ? (t.className || t.tagName) + '' : '']; }, [sel, rx || '']); if (!sc) { console.log('  MISSING', sel, rx || ''); return false; } if (!sc[2]) console.log('  COVERED', sel, rx || '', 'by', sc[3]); await H.sleep(250); await P.touchscreen.tap(sc[0], sc[1]); return true; };
  const step = async (name, ms) => { await H.sleep(ms || 1500); const t = await top(); console.log('STEP', name, '::', t); await shot(name.replace(/\W+/g, '_').slice(0, 20)); return t; };
  const typeIn = async (sel, val) => { const l = P.locator(sel).last(); await l.click({ timeout: 4000 }).catch(e => console.log('  type click fail', sel, e.message.split('\n')[0])); await l.fill(val).catch(e => console.log('  fill fail', sel, e.message.split('\n')[0])); };
  const meal = process.env.MEAL || (lang === 'de' ? 'Müsli mit Milch' : lang === 'es' ? 'Muesli con leche' : 'muesli with milk');
  const add = lang === 'de' ? 'Banane' : lang === 'es' ? 'Plátano' : 'Banana';
  await tapQ('[data-orbit="fuel"]'); await H.sleep(900); await tapQ('#hb2Bloom [data-id="log"]'); await step('log open', 1800);
  await tapQ('.r2-ov.on [data-sp="slot"][data-slot="meal"]'); await step('meal slot');
  await tapQ('.r2-ov.on [data-sp="slotWrite"]'); await step('write');
  await typeIn('.r2-ov.on #spMeal input[name=title]', meal); await H.sleep(1500);
  console.log('  guess line:', await P.evaluate(() => { const e = [...document.querySelectorAll('.r2-ov.on .sp-meal-guess')].pop(); return e ? e.innerText : null; }));
  await tapQ('.r2-ov.on #spMeal button[type=submit]'); await H.sleep(600); console.log('  toast', await toast()); await step('saved', 3500);
  console.log('SAVED TEXT', await P.evaluate(() => { const e = [...document.querySelectorAll('.r2-ov.on')].pop(); return e ? e.innerText.replace(/\s+/g, ' ').slice(0, 600) : null; }));
  console.log('ERRORS', JSON.stringify(errs)); await R.close().catch(() => { }); process.exit(0);

  /* back to the log sheet */
  await P.keyboard.press('Escape').catch(() => { }); await H.sleep(900);
  await tapQ('[data-orbit="fuel"]'); await H.sleep(900); await tapQ('#hb2Bloom [data-id="log"]'); await H.sleep(1500);
  await step('log again (today list?)');
  if (await tapQ('.r2-ov.on [data-sp="todayEdit"]')) {
    await step('edit open');
    await P.locator('.r2-ov.on #spEdit input[name=time]').last().fill('23:59').catch(e => console.log('  time fill fail', e.message.split('\n')[0]));
    await tapQ('.r2-ov.on #spEdit button[type=submit]'); await H.sleep(500); console.log('  future toast', await toast()); await step('future time', 900);
    const now = new Date(Date.now() - 5 * 60000); const hh = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    await P.locator('.r2-ov.on #spEdit input[name=time]').last().fill(hh).catch(() => { });
    await typeIn('.r2-ov.on #spEdit input[name=add]', add);
    await tapQ('.r2-ov.on #spEdit button[type=submit]'); await H.sleep(500); console.log('  edit toast', await toast()); await step('edited');
    if (await tapQ('.r2-ov.on [data-sp="todayEdit"]')) { await H.sleep(1200); await tapQ('.r2-ov.on [data-sp="todayDel"]'); await H.sleep(500); console.log('  del 1:', await top()); await tapQ('.r2-ov.on [data-sp="todayDel"]'); await H.sleep(600); console.log('  del toast', await toast()); await step('deleted'); }
  }
  /* photo path */
  await P.keyboard.press('Escape').catch(() => { }); await H.sleep(900);
  await tapQ('[data-orbit="fuel"]'); await H.sleep(900); await tapQ('#hb2Bloom [data-id="log"]'); await H.sleep(1500);
  await tapQ('.r2-ov.on [data-sp="slot"][data-slot="meal"]'); await H.sleep(1200);
  await tapQ('.r2-ov.on [data-sp="photo"]'); await step('camera', 2500);
  await P.setInputFiles('#ssFood input.sp-file-in', FIX).catch(e => console.log('  file fail', e.message.split('\n')[0]));
  await step('photo sheet', 6000);
  const pf = await P.evaluate(() => { const f = [...document.querySelectorAll('.r2-ov.on form.sp-photo-form')].pop(); if (!f) return null; return { title: (f.querySelector('input[name=title]') || {}).value, btns: [...f.closest('.r2-ov').querySelectorAll('button')].filter(b => b.getBoundingClientRect().width).map(b => (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 30)) }; });
  console.log('  photo form', JSON.stringify(pf));
  await tapQ('.r2-ov.on form.sp-photo-form button[type=submit]'); await H.sleep(500); console.log('  toast', await toast()); await step('photo saved', 4500);
  const sv = await P.evaluate(() => { const o = [...document.querySelectorAll('.r2-ov.on')].pop(); return o ? { thumb: !!o.querySelector('.mj-saved img, .mj-saved .mj-th, .mj-saved'), share: !!o.querySelector('[data-mj-share]') } : null; });
  console.log('  saved sheet', JSON.stringify(sv));
  await P.reload(); await H.sleep(6000);
  await tapQ('[data-orbit="fuel"]'); await H.sleep(900); await tapQ('#hb2Bloom [data-id="log"]'); await H.sleep(1500);
  await step('after reload');
  console.log('  today photo thumb after reload:', await P.evaluate(() => !!document.querySelector('.r2-ov.on .sp-td-ph')));
  console.log('ERRS', JSON.stringify(errs)); await R.close(); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
