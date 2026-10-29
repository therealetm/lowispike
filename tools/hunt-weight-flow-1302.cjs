'use strict';
/* Bug hunt 13:02 (weight tracker, merged Weight & BMI sheet #bsOv): a user with no data opens it from the Settings bubble's bloom
   by a real tap, types weights the way their keyboard does (de/es comma), edge cases (empty, letters, 0, 400), height, sex,
   kg <-> lb, journey setup (start + goal), period tabs, the weigh-ins list (edit, delete), reload, close. Reports text of the
   error line, the hero/stats, overflow, controls cut off or covered, page errors. node tools/hunt-weight-flow-1302.cjs <device> [lang] [url] */
const H = require('./sim/harness.cjs');
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 13', lang = A[1] || 'en';
  const url = A[2] || 'https://therealetm.github.io/lowispike/index.html';
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [lang]);
  const P = R.page; const errs = []; P.on('pageerror', e => errs.push('page: ' + String(e.message).slice(0, 200)));
  P.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await R.goto(); await H.sleep(6000);
  const tag = device.replace(/\W/g, '') + '-' + lang; let n = 0;
  const dc = (comma, s) => comma ? String(s).replace('.', ',') : String(s);
  const C = lang !== 'en';
  const info = async (label) => { const d = await P.evaluate(() => { const ov = document.getElementById('bsOv'); if (!ov) return { open: false }; const sh = ov.querySelector('.bs-sheet'); const r = sh.getBoundingClientRect(); const vw = innerWidth, vh = innerHeight; const ctl = [...ov.querySelectorAll('button,input')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; }); const cut = ctl.filter(e => { const b = e.getBoundingClientRect(); return b.right > Math.min(vw, r.right) + 1 || b.left < Math.max(0, r.left) - 1; }).map(e => (e.getAttribute('aria-label') || e.innerText || e.id).slice(0, 25)); const txt = s => { const e = ov.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').slice(0, 160) : null; }; return { open: true, sheet: [Math.round(r.top), Math.round(r.height)], err: txt('#bsErr'), wjerr: txt('#wjErr') || txt('#wjSetupErr'), top: txt('.bs-top'), go: txt('.bs-go'), kg: (ov.querySelector('#bsKg') || {}).value, wj: txt('.bs-wjhost'), ovf: document.documentElement.scrollWidth - vw, cut, health: (() => { try { const S = LowiR2.S(); return { w: S.health.weight, h: S.health.heightCm, n: ((S.health.body || {}).weights || []).length, unit: (S.health.body || {}).unit }; } catch (e) { return String(e); } })() }; }); console.log('[' + label + ']', JSON.stringify(d)); await P.screenshot({ path: '/tmp/hfg13/wf-' + tag + '-' + (n++) + '-' + label.replace(/\W/g, '').slice(0, 20) + '.png' }); return d; };
  const tapSel = async (sel, nth) => { const xy = await P.evaluate(([s, k]) => { const e = [...document.querySelectorAll(s)].filter(x => x.getBoundingClientRect().width > 0)[k || 0]; if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { xy: [r.left + r.width / 2, r.top + r.height / 2], hit: t && (t === e || e.contains(t) || t.contains(e)) ? 'self' : (t ? (t.id || String(t.className)).slice(0, 40) : null) }; }, [sel, nth]); if (!xy) { console.log('NO', sel); return false; } if (xy.hit !== 'self') console.log('COVERED', sel, xy.hit); await H.sleep(250); await P.touchscreen.tap(xy.xy[0], xy.xy[1]); await H.sleep(700); return true; };
  const typeIn = async (sel, v) => { if (!await tapSel(sel)) return false; await P.evaluate(s => { const e = document.querySelector(s); e.select && e.select(); }, sel); await P.keyboard.press('Backspace'); for (let i = 0; i < 8; i++) await P.keyboard.press('Backspace'); if (v) await P.keyboard.type(v, { delay: 40 }); await H.sleep(200); return true; };
  /* entry: Settings bubble -> bloom -> a weight/body orb */
  const sx = await P.evaluate(() => { const e = document.querySelector('[data-orbit="settings"]'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  if (sx) { await P.touchscreen.tap(sx[0], sx[1]); await H.sleep(1300); }
  const items = await P.evaluate(() => [...document.querySelectorAll('#hb2Bloom [data-id]')].map(e => e.getAttribute('data-id') + ':' + (e.innerText || '').replace(/\s+/g, ' ').trim()));
  console.log('settings bloom', JSON.stringify(items));
  const wid = items.map(s => s.split(':')[0]).find(id => /body|weight|bmi/i.test(id));
  if (wid) await tapSel('#hb2Bloom [data-id="' + wid + '"]'); else { console.log('NO weight orb in settings bloom'); await P.evaluate(() => LowiBodyStats.open()); }
  await H.sleep(1200);
  await info('opened');
  await typeIn('#bsKg', ''); await tapSel('.bs-go'); await info('save empty');
  await typeIn('#bsKg', 'abc'); await tapSel('.bs-go'); await info('save letters');
  await typeIn('#bsKg', '0'); await tapSel('.bs-go'); await info('save 0');
  await typeIn('#bsKg', '400'); await tapSel('.bs-go'); await info('save 400');
  await typeIn('#bsKg', dc(C, '107.6')); if (await P.$('#bsCm')) await typeIn('#bsCm', '178'); await info('typed 107.6 + 178');
  if (await P.$('[data-bs-sex="m"]')) await tapSel('[data-bs-sex="m"]');
  await tapSel('.bs-go'); await info('saved 107.6');
  await tapSel('[data-bs-u="lb"]'); await info('lb');
  await typeIn('#bsKg', dc(C, '236.5')); await tapSel('.bs-go'); await info('update in lb 236.5');
  await tapSel('[data-bs-u="kg"]'); await info('kg back');
  if (await tapSel('[data-wj="setup"]')) { await info('setup open'); await typeIn('#wjStartW', dc(C, '120')); await typeIn('#wjGoal', dc(C, '94')); await tapSel('[data-wj-form="setup"] button[type=submit]'); await info('setup saved'); }
  const tabs = await P.evaluate(() => [...document.querySelectorAll('[data-wj-p]')].map(e => e.getAttribute('data-wj-p')));
  for (const t of tabs) { await tapSel('[data-wj-p="' + t + '"]'); }
  await info('tabs ' + tabs.join(','));
  if (await tapSel('[data-wj="prev"]')) { await tapSel('[data-wj="next"]'); }
  if (await tapSel('[data-wj-e]')) { await info('entry edit'); await typeIn('#wjVal', dc(C, '107.2')); await tapSel('[data-wj-form="entry"] button[type=submit]'); await info('entry saved 107.2'); }
  await P.reload(); await H.sleep(6000); await P.evaluate(() => LowiBodyStats.open()); await H.sleep(1200); await info('after reload');
  if (await tapSel('[data-wj-e]')) { await tapSel('[data-wj="del"]'); await H.sleep(600); await info('after delete'); }
  await tapSel('[data-bs="close"]'); await H.sleep(900); const still = await P.evaluate(() => !!document.getElementById('bsOv') && document.getElementById('bsOv').getBoundingClientRect().height > 0 && getComputedStyle(document.getElementById('bsOv')).visibility !== 'hidden'); console.log('closed?', !still);
  console.log('errs', JSON.stringify(errs)); await R.close(); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
