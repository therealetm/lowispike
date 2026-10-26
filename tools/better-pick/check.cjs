'use strict';
/* Oct 26 browser check (Emmanuel: scanned K-Classic "Mandeln Stifte", the Better pick was Paliria eggplant sauce).
   The community already holds Paliria "Eggplants in Onion & Tomato Sauce" (Lower, category other), like his phone did.
   1) scan the almonds barcode (Open Food Facts answer mocked with the real K-Classic product): whatever the verdict, the card
      never shows the eggplant sauce; with no better nuts in the app there is no Better pick
   2) the page's own LowiDex.swap: almonds at Moderate -> nothing; once the app also holds Walnusskerne (Lower) -> Walnusskerne
   3) a fruit yogurt at Higher -> the plain skyr the app holds, never the eggplant sauce
   node tools/better-pick/check.cjs <device> [url|root] [outdir] [lang]   ENG=webkit|chromium */
const H = require('../sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || path.join(__dirname, '..', '..');
  const out = process.argv[4] || '/tmp/check-better-pick', lang = process.argv[5] || 'de';
  fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: process.env.ENG || 'webkit', members: 6, messages: 6, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = o.engine + '-' + device.replace(/\W/g, '') + '-' + lang;
  const CODE = '4337185395024';
  const prod = { code: CODE, product_name: 'Mandeln Stifte', product_name_de: 'Mandeln Stifte', brands: 'K-Classic', quantity: '200 g',
    categories_tags: ['en:plant-based-foods-and-beverages', 'en:plant-based-foods', 'en:nuts-and-their-products', 'en:nuts', 'en:almonds'],
    countries_tags: ['en:germany'], ingredients_text: 'Mandeln', nutriments: { 'energy-kcal_100g': 608, carbohydrates_100g: 5.7, sugars_100g: 4.4, fat_100g: 52, proteins_100g: 24, fiber_100g: 12, salt_100g: 0.01 } };
  await R.ctx.route(u => /(^|\.)openfoodfacts\.org$/.test(new URL(u).host), r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify(r.request().url().indexOf(CODE) >= 0 ? { status: 1, code: CODE, product: prod } : { status: 0, products: [] }) }));
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  const res = { device, lang, engine: o.engine, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null), core: await P.evaluate(() => !!window.LowiBetterPick), cases: [], finds: [] };
  const find = async (kind, info) => { const f = path.join(out, tag + '-find-' + res.finds.length + '.png'); await R.shot(f); res.finds.push(Object.assign({ kind, shot: f }, info)); console.log('FIND', kind, JSON.stringify(info).slice(0, 300)); };
  if (!res.core) await find('better-pick-core.js not loaded', {});
  const EGG = { barcode: '5201000000017', name: 'Eggplants in Onion & Tomato Sauce', brand: 'Paliria', cat: 'other', verdict: 'ok', country: 'Greece', catches: 1 };
  const WAL = { barcode: '4337185000011', name: 'Walnusskerne', brand: 'K-Classic', cat: 'other', verdict: 'ok', country: 'Germany', catches: 1 };
  const SKY = { barcode: '4056489000012', name: 'Skyr natur', brand: 'Milbona', cat: 'dairy', verdict: 'ok', catches: 1 };
  // the community list as the app caches it (marked fresh, so the mocked server does not replace it before the checks)
  const setComm = async list => { await P.evaluate(l => localStorage.setItem('lowi.dex.v1', JSON.stringify({ mine: {}, comm: l, commTs: Date.now() + 600000 })), list); await P.reload(); await H.sleep(4500); };
  await setComm([EGG]);
  // 1) the real scanner, typed barcode
  const reset = async () => { for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(100); } await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await H.sleep(600); };
  await reset(); await P.evaluate(() => { try { LowiDex.scan(); } catch (e) { } }); await H.sleep(1500);
  const inp = P.locator('#b3Cam input[inputmode="numeric"], #b3Cam input').first();
  if (!await inp.isVisible().catch(() => false)) { const t = P.locator('#b3Cam').getByText(/Type the number|Nummer eingeben|Escribe el n|Nummer tippen|número/i).first(); if (await t.count()) { await R.tapEl(t).catch(() => { }); await H.sleep(500); } }
  await inp.tap().catch(() => { }); await inp.fill('').catch(() => { }); await P.keyboard.type(CODE, { delay: 25 });
  const btn = P.locator('#b3Cam button').filter({ hasText: /^(Check|Prüfen|Comprobar)/i }).first();
  if (await btn.count()) await R.tapEl(btn).catch(() => { }); else await P.keyboard.press('Enter');
  await H.sleep(8000);
  const card = await P.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const top = [...document.querySelectorAll('.r2-ov:not(.off)')].filter(vis).pop() || document.body;
    return { text: (top.innerText || '').replace(/\s+/g, ' ').slice(0, 700), swap: ((top.querySelector('.ss-swap, .ne-swap') || {}).innerText || '').replace(/\s+/g, ' '), overflow: document.documentElement.scrollWidth - innerWidth }; });
  await R.shot(path.join(out, tag + '-scan-almonds.png'));
  res.cases.push(Object.assign({ what: 'scanned Mandeln Stifte, app holds only the eggplant sauce' }, card));
  console.log('CASE scan:', card.swap ? 'swap="' + card.swap + '"' : 'no Better pick', '::', card.text.slice(0, 220));
  if (!/Mandeln/i.test(card.text)) await find('scan card did not open on the almonds', { text: card.text.slice(0, 200) });
  if (/Eggplant|Aubergine|Berenjena/i.test(card.text)) await find('eggplant sauce on the almonds card', { swap: card.swap });
  if (card.swap) await find('a Better pick with no better nuts in the app', { swap: card.swap });
  if (card.overflow > 2) await find('overflow', { px: card.overflow });
  // 2) + 3) the page's own swap, the one Scan, Shop camera and Log meal all use
  const sw = p => P.evaluate(p => { const s = LowiDex.swap(p); return s ? { n: s.n, prod: !!s.prod } : null; }, p);
  const alm = { barcode: CODE, name: 'Mandeln Stifte', brand: 'K-Classic', cat: 'other', verdict: 'better' };
  const a1 = await sw(alm);
  await setComm([EGG, WAL]); const a2 = await sw(alm);
  await setComm([EGG, WAL, SKY]); const y1 = await sw({ barcode: '4000000000001', name: 'Fruchtjoghurt Erdbeere', brand: 'Ehrmann', cat: 'dairy', verdict: 'spike' });
  const a3 = await sw(Object.assign({}, alm, { verdict: 'ok' }));
  res.cases.push({ what: 'LowiDex.swap', almondsEggOnly: a1, almondsWithWalnuts: a2, fruitYogurt: y1, almondsLower: a3 });
  console.log('CASE swap:', JSON.stringify({ a1, a2, y1, a3 }));
  if (a1) await find('almonds got a Better pick with only eggplant sauce in the app', { a1 });
  if (!a2 || a2.n !== 'Walnusskerne' || !a2.prod) await find('almonds did not get the real walnut product', { a2 });
  if (!y1 || !/skyr|joghurt|yogurt/i.test(y1.n)) await find('fruit yogurt did not get a yogurt', { y1 });
  if (a3) await find('a Lower item got a Better pick', { a3 });
  if (R.errs.length) await find('page errors', { errs: R.errs.slice(0, 6) });
  fs.writeFileSync(path.join(out, tag + '.json'), JSON.stringify(res, null, 2));
  console.log(`DONE ${tag} build=${res.build} core=${res.core} cases=${res.cases.length} finds=${res.finds.length}`);
  await R.close();
  process.exit(res.finds.length ? 2 : 0);
})().catch(e => { console.error(e); process.exit(1); });
