'use strict';
/* Food audit journey D: Fuel > Cook (recipes), Gap bubble (I just ate, Ate earlier), Misty > Food journal, and whether
   a logged meal shows up in each of them. */
const { open, sleep } = require('./food-audit-lib.cjs');
(async () => {
  const H = await open({ tag: 'D', device: process.env.DEV || 'iPhone 13', lang: process.env.L || '' }); const p = H.page;
  const log = (k, v) => console.log('\n### ' + k + '\n' + (Array.isArray(v) ? v.join('\n') : typeof v === 'string' ? v : JSON.stringify(v)));
  const top = async (n) => (await H.dump(n || 60)).filter(x => !x.startsWith('(covered)'));
  const closeAll = () => p.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } });
  // Cook
  await H.tap('[data-orbit="fuel"]'); await sleep(1300); await H.tap('#hb2Bloom [data-id="cook"]'); await sleep(3500); await H.shot('cook');
  log('D1 Cook tab', { tab: await p.evaluate(() => { try { return LowiHost.tab(); } catch (e) { return '?'; } }), text: (await H.text()).split('\n').slice(0, 40).join(' | ') });
  log('D1 controls', (await top(40)).slice(0, 30));
  const rec = await p.$('[data-sh="open"], .sh-card, [data-rec], .rb-card, [data-recipe]');
  if (rec) { await rec.scrollIntoViewIfNeeded().catch(() => { }); await rec.tap().catch(() => { }); await sleep(2000); await H.shot('recipe'); log('D2 recipe opened', { text: (await H.text()).split('\n').slice(0, 30).join(' | '), controls: (await top(30)).slice(0, 15) }); }
  else log('D2', 'no recipe card selector matched');
  // how do I get back home from Cook?
  const backs = (await top(80)).filter(x => /home|back|close|zurück|×|Close/i.test(x));
  log('D3 ways back', backs.slice(0, 8));
  await p.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { LowiHost.go('home'); } catch (e) { } }); await sleep(2500);
  // Gap: I just ate
  log('D4 gap bubble before', await p.evaluate(() => (document.querySelector('[data-orbit="gap"]') || {}).innerText));
  await H.tap('[data-orbit="gap"]'); await sleep(1500); await H.shot('gap-bloom');
  log('D4 gap bloom', (await top(30)).filter(x => /hb2|bloom|data-id/.test(x)).slice(0, 8));
  await H.tap('#hb2Bloom [data-id="ate"]'); await sleep(2500); await H.shot('gap-ate');
  const s1 = await H.state();
  log('D5 after I just ate', { gap: await p.evaluate(() => (document.querySelector('[data-orbit="gap"]') || {}).innerText), sheets: await H.sheets(), logs: s1.logs.length, fast: JSON.stringify(s1.fast || s1.gap || null).slice(0, 200), visible: (await top(30)).slice(0, 10), text: (await H.text()).split('\n').slice(-12).join(' | ') });
  await closeAll(); await sleep(800);
  // Ate earlier
  await H.tap('[data-orbit="gap"]'); await sleep(1500); await H.tap('#hb2Bloom [data-id="earlier"]'); await sleep(2000); await H.shot('gap-earlier');
  log('D6 Ate earlier sheet', { text: (await H.text()).split('\n').slice(-25).join(' | '), controls: (await H.dump(80)).filter(x => /fst|fse|fe-|chip|close|primary|Other|time/i.test(x)).slice(0, 25) });
  const oth = await p.$('[data-fst="other"], [data-fst="custom"]'); log('D6b Other time button', oth ? 'present' : 'none');
  const cs = await p.$('[data-act="close-sheet"]'); if (cs) { await cs.tap().catch(() => { }); await sleep(1200); }
  log('D6c after Close', { sheetOpen: await p.evaluate(() => !!document.querySelector('.sheet.open, .sheet-ov.open, [data-act=close-sheet]:not([hidden])')), logs: (await H.state()).logs.length });
  await closeAll(); await sleep(800);
  // log a meal, then look for it in the Food journal
  await H.tap('[data-orbit="fuel"]'); await sleep(1300); await H.tap('#hb2Bloom [data-id="log"]'); await sleep(1800);
  await p.tap('[data-sp="slot"][data-slot="dinner"]'); await sleep(1200); await p.fill('#spMeal input[name="title"]', 'salmon with broccoli'); await p.tap('#spMeal button[type="submit"]'); await sleep(4000);
  await closeAll(); await sleep(800);
  log('D7 gap after logging a meal', await p.evaluate(() => (document.querySelector('[data-orbit="gap"]') || {}).innerText.replace(/\s+/g, ' ')));
  await H.tap('#spBubble'); await sleep(2200); await H.shot('misty-hub');
  log('D8 Misty hub', (await top(40)).slice(0, 20));
  const fj = await p.$('[data-mh="collection"]');
  if (fj) { await fj.scrollIntoViewIfNeeded().catch(() => { }); await fj.tap(); await sleep(2500); await H.shot('journal'); log('D9 Food journal', { text: (await H.text()).split('\n').slice(-40).join(' | '), controls: (await top(40)).slice(0, 20) }); }
  else log('D9', 'no Food journal button in the Misty hub');
  log('errs', H.errs);
  await H.close();
})().catch(e => { console.error(e); process.exit(1); });
