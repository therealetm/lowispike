'use strict';
/* Misty sheet plan, phase 1 (Nov 5 2026): from every child screen of Misty's card, Back returns to the card.
   Look panel -> "‹ Misty" back; evolution card from the Evolution path -> "‹ Look" back; Growth / Aura shop -> "‹ Misty" folds.
   Usage: node tools/misty-sheet/p1-nav.cjs [rootDir|url] [engine] [lang] */
const H = require('../sim/harness.cjs');
const target = process.argv[2] || '.';
const engine = process.argv[3] || 'chromium';
const lang = process.argv[4] || 'en';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('ok   ' + m); } else { fail++; console.log('FAIL ' + m); } };
(async () => {
  const o = { engine, members: 4, messages: 4, probe: false, lang, viewport: { width: 390, height: 844 } };
  if (/^https?:/.test(target)) o.url = target; else o.root = target;
  const R = await H.open(o); const P = R.page; const sleep = H.sleep;
  await R.goto(); await sleep(7000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  await sleep(600);
  const hubOpen = () => P.evaluate(() => !!Array.from(document.querySelectorAll('#mistyHub')).find(e => !e.closest('.r2-ov.off')));
  const bx = () => P.evaluate(() => { const b = document.getElementById('lwBX'); if (!b || !b.classList.contains('on')) return null; return { kind: b.dataset.kind, text: b.textContent.trim(), label: b.getAttribute('aria-label') }; });
  const bxWait = async (f, ms = 4000) => { let b = null; for (let t = 0; t < ms; t += 200) { b = await bx(); if (b && f(b)) return b; await sleep(200); } return b; };
  const pressBX = () => P.evaluate(() => { const b = document.getElementById('lwBX'); b && b.click(); });
  await P.evaluate(() => LowiMistyHub.open()); await sleep(1500);
  ok(await hubOpen(), 'card opens');
  let b = await bxWait(b => b.kind === 'close'); ok(b && b.kind === 'close', 'root bottom button is a close: ' + JSON.stringify(b));
  /* Look */
  await P.evaluate(() => document.querySelector('#mistyHub [data-door="look"]').click()); await sleep(1400);
  ok(await P.evaluate(() => !!document.querySelector('.cf-ov .cf-x-back')), 'Look panel has a back button, not a close');
  b = await bxWait(b => b.kind === 'back' && /Misty/.test(b.text)); ok(b && b.kind === 'back' && /Misty/.test(b.text), 'bottom button reads Back + name: ' + JSON.stringify(b));
  /* evolution card from the Evolution path */
  const hasCard = await P.evaluate(() => !!document.querySelector('.cf-ov [data-cf="card"]'));
  if (hasCard) {
    await P.evaluate(() => document.querySelector('.cf-ov [data-cf="card"]').click()); await sleep(1800);
    ok(await P.evaluate(() => !!(window.LowiEvoCard && LowiEvoCard.isOpen())), 'tapping a form opens its evolution card');
    b = await bxWait(b => b.kind === 'back' && b.text && !/Misty/.test(b.text)); ok(b && b.kind === 'back' && b.text.length > 0 && !/Misty/.test(b.text), 'evolution card bottom button is a named back: ' + JSON.stringify(b));
    ok(await P.evaluate(() => !!document.querySelector('.evc-save')), 'card has a Save button');
    await pressBX(); await sleep(1200);
    ok(await P.evaluate(() => !(window.LowiEvoCard && LowiEvoCard.isOpen()) && !!document.querySelector('.cf-ov')), 'back from the card returns to Look');
  } else ok(false, 'Evolution path has a tappable form');
  b = await bxWait(b => b.kind === 'back' && /Misty/.test(b.text)); console.log('     before back from Look:', JSON.stringify(b));
  await pressBX(); await sleep(1400);
  console.log('     state:', JSON.stringify(await P.evaluate(() => ({ ov: [...document.querySelectorAll('.r2-ov,.cf-ov,.evc-ov')].map(o => o.className.slice(0, 40)), hub: !!document.querySelector('#mistyHub') }))));
  ok(!(await P.evaluate(() => !!document.querySelector('.cf-ov:not(.off)'))) && await hubOpen(), 'back from Look returns to the card');
  b = await bxWait(b => b.kind === 'close'); ok(b && b.kind === 'close', 'card bottom button is a close again');
  /* Growth and Aura shop inside the card */
  for (const d of ['grow', 'aura']) {
    await P.evaluate(d => document.querySelector('#mistyHub [data-door="' + d + '"]').click(), d); await sleep(900);
    ok(await P.evaluate(() => !!document.querySelector('#mhSec .mh-sback')), d + ': section shows "‹ Misty"');
    await P.evaluate(() => document.querySelector('#mhSec .mh-sback').click()); await sleep(700);
    ok(await P.evaluate(() => !document.querySelector('#mhSec')) && await hubOpen(), d + ': back folds the section, card stays open');
  }
  await R.close();
  console.log(`${engine} ${lang}: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
