'use strict';
/* Food audit journey C: Fuel > Shop. What the panel shows, its buttons, Scan in the shop (camera / typed barcode, product lookup
   blocked or mocked), the shopping list (add, tick, remove, reload), close/reopen. OFF=mock gives a fake Open Food Facts answer. */
const { open, sleep } = require('./food-audit-lib.cjs');
const OFF = process.env.OFF || 'off';
const PRODUCT = { status: 1, code: '4000417025005', product: { code: '4000417025005', product_name: 'Milk chocolate', brands: 'Testbrand', nutriments: { 'energy-kcal_100g': 535, sugars_100g: 56, carbohydrates_100g: 58, proteins_100g: 6.3, fat_100g: 30, fiber_100g: 2, salt_100g: 0.2 }, nova_group: 4, ingredients_text: 'sugar, cocoa butter, milk powder', image_front_small_url: '' } };
(async () => {
  const route = (q, u) => { if (OFF === 'mock' && /openfoodfacts/.test(u.host)) return { status: 200, contentType: 'application/json', body: JSON.stringify(PRODUCT) }; return null; };
  const H = await open({ tag: 'C-' + OFF, route, device: process.env.DEV || 'iPhone 13', lang: process.env.L || '' }); const p = H.page;
  const log = (k, v) => console.log('\n### ' + k + '\n' + (Array.isArray(v) ? v.join('\n') : typeof v === 'string' ? v : JSON.stringify(v)));
  const top = async () => (await H.dump(60)).filter(x => !x.startsWith('(covered)'));
  await H.tap('[data-orbit="fuel"]'); await sleep(1300); await H.tap('#hb2Bloom [data-id="shop"]'); await sleep(3000); await H.shot('shop');
  log('C1 shop panel text', (await H.text()).split('\n').slice(0, 60).join(' | '));
  log('C1 controls', await top());
  // snacks to buy: add two, tick one, remove one
  await p.tap('.stp-snack-add input'); await p.keyboard.type('bell pepper'); await p.keyboard.press('Enter'); await sleep(700);
  await p.keyboard.type('almonds'); await p.keyboard.press('Enter'); await sleep(700);
  await p.keyboard.press('Enter'); await sleep(400); // empty enter
  log('C2 snacks after adding 2 (+1 empty Enter)', await p.evaluate(() => ({ rows: [...document.querySelectorAll('.stp-snack')].map(x => x.innerText.replace(/\s+/g, ' ')), store: localStorage.getItem('lowi.snackBuy.v1'), focused: document.activeElement && document.activeElement.name })));
  const tick = await p.$('.stp-snack-tick'); if (tick) { await tick.tap(); await sleep(700); }
  log('C3 after ticking first', await p.evaluate(() => [...document.querySelectorAll('.stp-snack')].map(x => x.innerText.replace(/\s+/g, ' '))));
  // shopping list: does it show the snacks? can I add anything?
  await p.tap('[data-stp="mylist"]'); await sleep(1800); await H.shot('mylist');
  log('C4 Shopping list text', await p.evaluate(() => { const e = document.getElementById('tdShop'); return e ? { open: e.classList.contains('open'), text: e.innerText.replace(/\s+/g, ' ').slice(0, 400), inputs: e.querySelectorAll('input').length, buttons: [...e.querySelectorAll('button')].map(b => b.innerText.trim() || b.getAttribute('aria-label')) } : 'no #tdShop'; }));
  log('C4 shop panel still under it?', await p.evaluate(() => !!document.querySelector('.stp-card')));
  const x = await p.$('#tdShop [data-td="shopclose"]'); if (x) { await x.tap(); await sleep(1200); }
  log('C5 after closing Shopping list', { stp: await p.evaluate(() => !!document.querySelector('.stp-card')), tdShopOpen: await p.evaluate(() => !!document.querySelector('#tdShop.open')), top: (await top()).slice(0, 6) });
  // Scan in the shop
  if (!(await p.evaluate(() => !!document.querySelector('.stp-card')))) { await H.tap('[data-orbit="fuel"]'); await sleep(1300); await H.tap('#hb2Bloom [data-id="shop"]'); await sleep(2500); }
  await p.tap('[data-stp="scanshop"]'); await sleep(3500); await H.shot('scanshop');
  log('C6 shop camera', { text: await p.evaluate(() => { const c = document.querySelector('.b3-cam'); return c ? c.innerText.replace(/\s+/g, ' ').slice(0, 400) : 'no .b3-cam'; }), shopMode: await p.evaluate(() => !!document.querySelector('.b3-cam.b3-shop')), top: (await top()).slice(0, 25) });
  const inp = await p.$('.b3-cam input[inputmode="numeric"], .b3-cam input[type="tel"], .b3-cam input');
  if (inp) {
    await inp.tap(); await p.keyboard.type('4000417025005'); await p.keyboard.press('Enter'); await sleep(7000); await H.shot('scan-result');
    log('C7 after typed barcode', await p.evaluate(() => { const c = document.querySelector('.b3-cam'); return c ? c.innerText.replace(/\s+/g, ' ').slice(0, 700) : 'cam gone'; }));
    log('C7 controls', (await top()).slice(0, 25));
    const add = await p.$('.b3-cam [data-ss="add"]'); if (add) { await add.tap(); await sleep(1500); }
    log('C8 after Add to list', { toast: await p.evaluate(() => { const c = document.querySelector('.b3-cam'); return c ? c.innerText.replace(/\s+/g, ' ').slice(0, 300) : ''; }), shelfList: await p.evaluate(() => { try { return JSON.stringify(LOWI_SHELF.listOpen(true)).slice(0, 300); } catch (e) { return 'n/a ' + e.message; } }), logs: (await H.state()).logs.length });
    const cart = await p.$('.b3-cam [data-ss="cart"]'); if (cart) { await cart.tap(); await sleep(1800); log('C9 cart -> Shopping list', await p.evaluate(() => { const e = document.getElementById('tdShop'); return e && e.classList.contains('open') ? e.innerText.replace(/\s+/g, ' ').slice(0, 300) : 'not open; cam=' + !!document.querySelector('.b3-cam'); })); }
  } else log('C7', 'no barcode input found');
  log('C10 gap untouched / no meal', { logs: (await H.state()).logs.length, fast: await p.evaluate(() => (document.querySelector('[data-orbit="gap"]') || {}).innerText) });
  await p.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { tdShopClose(); } catch (e) { } try { LowiScan3 && LowiScan3.stop && LowiScan3.stop(); } catch (e) { } }); await sleep(800);
  await H.reload();
  log('C11 after reload', { snacks: await p.evaluate(() => localStorage.getItem('lowi.snackBuy.v1')), shelf: await p.evaluate(() => { try { return JSON.stringify(LOWI_SHELF.listOpen(true)).slice(0, 300); } catch (e) { return 'n/a'; } }) });
  log('errs', H.errs);
  await H.close();
})().catch(e => { console.error(e); process.exit(1); });
