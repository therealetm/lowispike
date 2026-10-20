'use strict';
/* Food audit journey G: log two meals, then Misty > Food journal: are they there, can I open one, edit or delete a wrong log? */
const { open, sleep } = require('./food-audit-lib.cjs');
(async () => {
  const H = await open({ tag: 'G', device: process.env.DEV || 'iPhone 13' }); const p = H.page;
  const log = (k, v) => console.log('\n### ' + k + '\n' + (Array.isArray(v) ? v.join('\n') : typeof v === 'string' ? v : JSON.stringify(v)));
  const top = async (n) => (await H.dump(n || 80)).filter(x => !x.startsWith('(covered)'));
  for (const [slot, meal] of [['breakfast', 'oatmeal with berries'], ['lunch', 'chicken caesar salad']]) {
    await H.bloom('fuel', 'log'); await sleep(1500);
    await p.tap('[data-sp="slot"][data-slot="' + slot + '"]'); await sleep(1000); await p.fill('#spMeal input[name="title"]', meal); await p.tap('#spMeal button[type="submit"]'); await sleep(3500);
    await p.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } }); await sleep(700);
  }
  log('G1 logs', (await H.state()).logs.map(l => l.t + ' / ' + l.slot));
  await H.tap('#spBubble'); await sleep(3000);
  let hub = await p.evaluate(() => !!document.querySelector('[data-mh="collection"]'));
  log('G2 Misty tap opened the hub', hub);
  if (!hub) { await sleep(2000); await H.tap('#spBubble'); await sleep(3000); hub = await p.evaluate(() => !!document.querySelector('[data-mh="collection"]')); log('G2b second tap', hub); }
  await H.shot('hub');
  log('G3 hub controls', (await top(40)).slice(0, 20));
  const fj = await p.$('[data-mh="collection"]');
  if (fj) {
    await fj.scrollIntoViewIfNeeded().catch(() => { }); await fj.tap({ force: true }); await sleep(3000); await H.shot('journal');
    const txt = await H.text();
    log('G4 Food journal text', txt.split('\n').slice(-45).join(' | '));
    log('G4 has my meals', { oatmeal: /oatmeal/i.test(txt), caesar: /caesar/i.test(txt) });
    log('G4 controls', (await top(80)).slice(0, 40));
  }
  // where can a wrong log be fixed? look for edit/delete affordances anywhere in the meal surfaces
  await p.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { LowiMistyHub.close(); } catch (e) { } }); await sleep(800);
  await H.bloom('fuel', 'log'); await sleep(1500);
  log('G5 Log meal sheet after 2 meals', (await H.text()).split('\n').slice(-30).join(' | '));
  log('G5 edit/delete controls', (await H.dump(120)).filter(x => /edit|delete|remove|undo|l\u00f6sch|bearbeit|\u2715|\u00d7|trash/i.test(x)).slice(0, 10));
  log('errs', H.errs);
  await H.close();
})().catch(e => { console.error(e); process.exit(1); });
