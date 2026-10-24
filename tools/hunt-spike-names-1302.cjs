'use strict';
/* Bug hunt 13:02 (spike rating): ask the live app's own name rating (LowiDex.nameRate) about everyday foods a shopper types,
   in EN/DE/ES, and print the verdicts side by side so the same food can be compared across languages.
   node tools/hunt-spike-names-1302.cjs [url|root] */
const H = require('./sim/harness.cjs');
const FOODS = [
  ['almonds', 'Mandeln', 'almendras'], ['tuna', 'Thunfisch', 'atún'], ['skyr', 'Skyr', 'skyr'], ['peanut butter', 'Erdnussbutter', 'mantequilla de cacahuete'],
  ['rolled oats', 'Haferflocken', 'copos de avena'], ['rice cakes', 'Reiswaffeln', 'tortitas de arroz'], ['lentils', 'Linsen', 'lentejas'], ['eggs', 'Eier', 'huevos'],
  ['apple', 'Apfel', 'manzana'], ['banana', 'Banane', 'plátano'], ['strawberries', 'Erdbeeren', 'fresas'], ['grapes', 'Trauben', 'uvas'],
  ['sparkling water', 'Mineralwasser', 'agua con gas'], ['apple juice', 'Apfelsaft', 'zumo de manzana'], ['cola zero', 'Cola Zero', 'cola zero'], ['milk', 'Milch', 'leche'],
  ['wholegrain bread', 'Vollkornbrot', 'pan integral'], ['spaghetti', 'Spaghetti', 'espaguetis'], ['potato chips', 'Kartoffelchips', 'patatas fritas'], ['dark chocolate 85%', 'Zartbitterschokolade 85%', 'chocolate negro 85%'],
  ['natural yogurt', 'Naturjoghurt', 'yogur natural'], ['cheese', 'Käse', 'queso'], ['salmon', 'Lachs', 'salmón'], ['chicken breast', 'Hähnchenbrust', 'pechuga de pollo'],
  ['broccoli', 'Brokkoli', 'brócoli'], ['avocado', 'Avocado', 'aguacate'], ['honey', 'Honig', 'miel'], ['cornflakes', 'Cornflakes', 'copos de maíz'],
  ['ice cream', 'Eis', 'helado'], ['white rice', 'Reis', 'arroz blanco'], ['carrots', 'Karotten', 'zanahorias'], ['cucumber', 'Gurke', 'pepino'],
  ['tomatoes', 'Tomaten', 'tomates'], ['walnuts', 'Walnüsse', 'nueces'], ['olive oil', 'Olivenöl', 'aceite de oliva'], ['butter', 'Butter', 'mantequilla'],
  ['cream cheese', 'Frischkäse', 'queso crema'], ['protein bar', 'Proteinriegel', 'barrita de proteína'], ['orange', 'Orange', 'naranja'], ['blueberries', 'Heidelbeeren', 'arándanos'],
  ['chickpeas', 'Kichererbsen', 'garbanzos'], ['tofu', 'Tofu', 'tofu'], ['pan-fried salmon', 'Lachs aus der Pfanne', 'salmón a la plancha'], ['spinach', 'Spinat', 'espinacas'],
  ['mozzarella', 'Mozzarella', 'mozzarella'], ['quark', 'Magerquark', 'queso quark'], ['coffee', 'Kaffee', 'café'], ['green tea', 'Grüner Tee', 'té verde'],
  ['sweet potato', 'Süßkartoffel', 'batata'], ['popcorn', 'Popcorn', 'palomitas'], ['croissant', 'Croissant', 'cruasán'], ['ham', 'Kochschinken', 'jamón cocido'],
  ['japanese curry', 'Japanisches Curry', 'curry japonés'], ['marzipan', 'Marzipan', 'mazapán'], ['light cream cheese', 'Frischkäse light', 'queso crema light'], ['coconut water', 'Kokoswasser', 'agua de coco']
];
(async () => {
  const where = process.argv[2] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { device: 'iPhone 15', engine: 'chromium', members: 5, messages: 5, probe: false, lang: 'en' }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page; await R.goto(); await H.sleep(4000);
  console.log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content));
  const rows = await P.evaluate(F => F.map(r => r.map(q => { try { const a = LowiDex.nameRate(q); return a ? a.verdict + ':' + ((a.why && a.why[0] && a.why[0][0]) || '') + (a.why && a.why[0] && a.why[0][1] ? '/' + String(a.why[0][1]).slice(0, 40) : '') : '-'; } catch (e) { return 'ERR ' + e.message; } })), FOODS);
  FOODS.forEach((f, i) => { const v = rows[i].map(x => x.split(':')[0]); const odd = new Set(v).size > 1 ? '  <-- differs' : ''; console.log(f.map((q, j) => q + ' = ' + rows[i][j]).join(' | ') + odd); });
  console.log('errs', JSON.stringify(R.errs));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
