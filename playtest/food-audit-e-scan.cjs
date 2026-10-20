'use strict';
/* Food audit journey E: the Scan bubble / Log meal > Scan (not shopping mode). Typed barcode with the product server
   unreachable (OFF=off) or a mocked Open Food Facts answer (OFF=mock); what the screen says; back out; no meal logged by a miss. */
const { open, sleep } = require('./food-audit-lib.cjs');
const OFF = process.env.OFF || 'off';
const PRODUCT = { status: 1, code: '4000417025005', product: { code: '4000417025005', product_name: 'Milk chocolate', brands: 'Testbrand', nutriments: { 'energy-kcal_100g': 535, sugars_100g: 56, carbohydrates_100g: 58, proteins_100g: 6.3, fat_100g: 30, fiber_100g: 2 }, nova_group: 4, ingredients_text: 'sugar, cocoa butter, milk powder' } };
(async () => {
  const route = (q, u) => { if (OFF === 'mock' && /openfoodfacts/.test(u.host)) return { status: 200, contentType: 'application/json', body: JSON.stringify(PRODUCT) }; return null; };
  const H = await open({ tag: 'E-' + OFF, route, device: process.env.DEV || 'iPhone 13', lang: process.env.L || '' }); const p = H.page;
  const log = (k, v) => console.log('\n### ' + k + '\n' + (Array.isArray(v) ? v.join('\n') : typeof v === 'string' ? v : JSON.stringify(v)));
  const top = async (n) => (await H.dump(n || 60)).filter(x => !x.startsWith('(covered)'));
  await H.tap('[data-orbit="fuel"]'); await sleep(1300); await H.tap('#hb2Bloom [data-id="log"]'); await sleep(1800);
  await p.tap('[data-sp="slot"][data-slot="snack"]'); await sleep(1200);
  await p.tap('[data-sp="scan"]'); await sleep(3500); await H.shot('scan');
  log('E1 scanner', { text: await p.evaluate(() => { const c = document.querySelector('.b3-cam'); return c ? c.innerText.replace(/\s+/g, ' ').slice(0, 400) : 'no .b3-cam'; }), controls: (await top()).slice(0, 14) });
  const t0 = Date.now();
  await p.tap('#b3Bc'); await p.keyboard.type('4000417025005'); await p.keyboard.press('Enter');
  for (let i = 0; i < 15; i++) { await sleep(1500); const g = await p.evaluate(() => !!document.querySelector('.b3-man, .b3-res, .b3-reveal, #b3Catch, .r2-ov:not(.off) .sp-photo-form, .r2-ov:not(.off) #spMeal')); if (g) break; }
  await H.shot('scan-result');
  log('E2 after typed barcode (' + Math.round((Date.now() - t0) / 1000) + ' s)', { text: (await H.text()).split('\n').slice(-30).join(' | '), controls: (await top()).slice(0, 18), logs: (await H.state()).logs.length });
  log('errs', H.errs);
  await H.close();
})().catch(e => { console.error(e); process.exit(1); });
