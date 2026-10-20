'use strict';
/* Food audit journey A: Fuel > Log meal > slot > Write, type, log; reopen, recent one-tap, empty submit, reload persistence. */
const { open, sleep } = require('./food-audit-lib.cjs');
(async () => {
  const H = await open({ tag: 'A', lang: process.env.L || '', device: process.env.DEV || 'iPhone 13' }); const p = H.page;
  const log = (k, v) => console.log('\n### ' + k + '\n' + (Array.isArray(v) ? v.join('\n') : typeof v === 'string' ? v : JSON.stringify(v)));
  const openLog = async () => { await H.tap('[data-orbit="fuel"]'); await sleep(1300); await p.tap('#hb2Bloom [data-id="log"]'); await sleep(1800); };
  await openLog();
  await p.tap('[data-sp="slot"][data-slot="breakfast"]'); await sleep(1500); await H.shot('slot-breakfast');
  log('A1 breakfast sheet', await H.dump(50));
  const before = await p.evaluate(() => { const i = document.querySelector('#spMeal input[name="title"]'); const r = i && i.getBoundingClientRect(); return i ? { top: Math.round(r.top), bottom: Math.round(r.bottom), focused: document.activeElement === i, vh: innerHeight } : null; });
  log('A1 title input', before);
  await H.tapText(/^Write$|Schreiben|Escribir/); await sleep(1200);
  log('A2 after Write: focused', await p.evaluate(() => { const i = document.querySelector('#spMeal input[name="title"]'); const r = i.getBoundingClientRect(); return { focused: document.activeElement === i, top: Math.round(r.top), vh: innerHeight }; }));
  // empty submit
  await p.evaluate(() => document.querySelector('#spMeal input[name="title"]').blur());
  const sub = await p.$('#spMeal button[type="submit"]'); await sub.tap(); await sleep(900);
  log('A3 empty submit: logs', (await H.state()).logs.length + ' sheets ' + JSON.stringify(await H.sheets()) + ' validity ' + await p.evaluate(() => document.querySelector('#spMeal input[name="title"]').validationMessage));
  await p.fill('#spMeal input[name="title"]', 'chicken stew'); await sleep(2500);
  log('A4 guess line', await p.evaluate(() => (document.querySelector('.sp-meal-guess') || {}).innerText));
  await H.shot('typed');
  await p.tap('#spMeal button[type="submit"]'); await sleep(200); await p.tap('#spMeal button[type="submit"]').catch(() => { }); await sleep(4500);
  await H.shot('saved');
  const s1 = await H.state();
  log('A5 after log (double tap submit)', { logs: s1.logs.length, last: s1.logs.slice(-1).map(l => ({ t: l.t, slot: l.slot, est: !!l.est, kcal: l.macros && l.macros.kcal })), xp: s1.xp, sheets: await H.sheets() });
  log('A5 saved text', (await H.text()).split('\n').slice(-25).join(' | '));
  log('A5 dump', await H.dump(30));
  // close whatever is open
  await p.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } }); await sleep(800);
  log('A6 fuel bubble', await p.evaluate(() => document.querySelector('[data-orbit="fuel"]').innerText.replace(/\s+/g, ' ')));
  await openLog(); await H.shot('reopen');
  log('A7 reopen slots', await p.evaluate(() => [...document.querySelectorAll('[data-sp="slot"]')].map(b => b.innerText.replace(/\s+/g, ' '))));
  await p.tap('[data-sp="slot"][data-slot="breakfast"]'); await sleep(1500);
  log('A8 recent list', await p.evaluate(() => [...document.querySelectorAll('.sp-quick-list button, .sp-quick-list [data-sp]')].map(b => b.getAttribute('data-sp') + ':' + b.innerText.replace(/\s+/g, ' '))));
  const q = await p.$('.sp-quick-list [data-sp="quick"]'); if (q) { await q.tap(); await sleep(2500); }
  const s2 = await H.state();
  log('A9 after recent tap', { logs: s2.logs.length, xp: s2.xp, toast: await p.evaluate(() => [...document.querySelectorAll('.r2-toast, .toast, [role=status]')].map(x => x.innerText).join(' / ').slice(0, 200)) });
  await p.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } }); await sleep(800);
  // Lunch + Change slot + cancel via scrim
  await openLog(); await p.tap('[data-sp="slot"][data-slot="lunch"]'); await sleep(1200);
  const ch = await p.$('[data-sp="slotPick"]'); if (ch) { await ch.tap(); await sleep(1200); }
  log('A10 change slot -> picker shown', await p.evaluate(() => document.querySelectorAll('[data-sp="slot"]').length) + ' sheets ' + JSON.stringify(await H.sheets()));
  await p.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } }); await sleep(800);
  await H.reload();
  const s3 = await H.state();
  log('A11 after reload', { logs: s3.logs.length, slots: s3.logs.map(l => l.slot), fuel: await p.evaluate(() => document.querySelector('[data-orbit="fuel"]').innerText.replace(/\s+/g, ' ')) });
  log('errs', H.errs); log('blocked hosts', Object.keys(H.blocked).map(k => k.split(' ')[0]).filter((v, i, a) => a.indexOf(v) === i));
  await H.close();
})().catch(e => { console.error(e); process.exit(1); });
