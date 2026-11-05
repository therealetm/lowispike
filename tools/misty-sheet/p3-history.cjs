'use strict';
/* Misty sheet plan, phase 3 (Nov 5 2026): History tab: Yesterday / Week / Month / Year, ‹ › stepping, honest empty state.
   Usage: node tools/misty-sheet/p3-history.cjs [rootDir|url] [engine] [lang] */
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
  await P.addInitScript(() => { try { localStorage.setItem('lowi.theme', 'dark'); localStorage.setItem('lowi.theme.dark', 'black'); } catch (e) { } });
  await R.goto(); await sleep(7000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  await P.evaluate(() => {
    const d = n => { const x = new Date(); x.setDate(x.getDate() - n); x.setHours(12, 0, 0, 0); return x.getTime(); };
    S.logs = (S.logs || []).concat([{ id: 'h1', ts: d(1), t: 'Omelette' }, { id: 'h2', ts: d(1) + 36e5 * 5, t: 'Rice bowl' }, { id: 'h3', ts: d(3), t: 'Soup' }]);
    S.health = S.health || {}; S.health.body = S.health.body || {}; S.health.body.weights = [{ ts: d(6), kg: 80 }, { ts: d(2), kg: 79.2 }];
    try { save && save(); } catch (e) { }
  });
  await P.evaluate(() => LowiMistyHub.open()); await sleep(1500);
  await P.evaluate(() => document.querySelectorAll('#mistyHub .mh-tab')[1].click()); await sleep(800);
  const read = () => P.evaluate(() => ({ kind: (document.querySelector('#mistyHub .mh-seg2 .mh-tab.on') || {}).textContent, range: (document.querySelector('#mistyHub .mh-hrange') || {}).textContent, rows: [...document.querySelectorAll('#mistyHub .mh-body .ms-row .cme-tx')].map(t => t.innerText.replace(/\s+/g, ' ').trim()), newer: (document.querySelector('#mistyHub [data-mhh="newer"]') || {}).disabled }));
  let h = await read(); console.log('     week:', JSON.stringify(h));
  ok(h.rows.some(r => /3/.test(r) && /2/.test(r)), 'Week: 3 meals on 2 days');
  ok(h.rows.some(r => /80.*79[.,]2 kg/.test(r)), 'Week: weight 80 → 79.2 kg');
  ok(h.newer === true, 'newest week: › is off');
  await P.evaluate(() => document.querySelector('#mistyHub [data-mhh="kind"][data-k="yesterday"]').click()); await sleep(500);
  h = await read(); console.log('     yesterday:', JSON.stringify(h));
  ok(h.rows.some(r => /2/.test(r) && /(meal|Mahlzeit|comida)/i.test(r)), 'Yesterday: 2 meals');
  await P.evaluate(() => document.querySelector('#mistyHub [data-mhh="kind"][data-k="week"]').click()); await sleep(400);
  await P.evaluate(() => document.querySelector('#mistyHub [data-mhh="older"]').click()); await sleep(500);
  h = await read(); console.log('     week before:', JSON.stringify(h));
  ok(h.rows.some(r => /(No entries|Keine Eintr|Sin registros)/.test(r)) && h.newer === false, 'a week earlier: no entries, › goes back');
  await P.evaluate(() => document.querySelector('#mistyHub [data-mhh="kind"][data-k="year"]').click()); await sleep(1500);
  h = await read(); ok(h.rows.some(r => /3/.test(r)), 'Year counts the 3 meals');
  ok(await P.evaluate(() => { const m = document.querySelector('#mistyHub'); return m.scrollWidth <= m.clientWidth + 1; }), 'no sideways overflow');
  await P.screenshot({ path: `/tmp/misty-p3-${engine}-${lang}.png` });
  await R.close();
  console.log(`${engine} ${lang}: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
