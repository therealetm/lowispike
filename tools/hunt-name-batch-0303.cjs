'use strict';
/* Bug hunt 2026-10-25 03:01: rate many everyday names via LowiDex.nameEst on the live site (same path as the Scan name chip),
   en/de/es side by side. Prints rows where a language gets no verdict or a different verdict.
   node tools/hunt-name-batch-0303.cjs [url] */
const H = require('./sim/harness.cjs');
const ROWS = [
  ['energy drink', 'Energydrink', 'bebida energética'], ['red bull', 'Red Bull', 'red bull'], ['apple juice', 'Apfelsaft', 'zumo de manzana'],
  ['smoothie', 'Smoothie', 'batido de frutas'], ['milkshake', 'Milchshake', 'batido'], ['iced tea', 'Eistee', 'té helado'],
  ['sparkling water', 'Mineralwasser', 'agua con gas'], ['coffee', 'Kaffee', 'café'], ['latte', 'Milchkaffee', 'café con leche'],
  ['hot chocolate', 'Kakao', 'chocolate caliente'], ['cookies', 'Kekse', 'galletas'], ['cake', 'Kuchen', 'tarta'], ['donut', 'Donut', 'donut'],
  ['muffin', 'Muffin', 'magdalena'], ['chips', 'Chips', 'patatas fritas de bolsa'], ['crackers', 'Cracker', 'galletas saladas'],
  ['rice cakes', 'Reiswaffeln', 'tortitas de arroz'], ['popcorn', 'Popcorn', 'palomitas'], ['nuts', 'Nüsse', 'frutos secos'],
  ['walnuts', 'Walnüsse', 'nueces'], ['cashews', 'Cashewkerne', 'anacardos'], ['peanuts', 'Erdnüsse', 'cacahuetes'],
  ['olive oil', 'Olivenöl', 'aceite de oliva'], ['butter', 'Butter', 'mantequilla'], ['jam', 'Marmelade', 'mermelada'],
  ['sugar', 'Zucker', 'azúcar'], ['ketchup', 'Ketchup', 'kétchup'], ['mayonnaise', 'Mayonnaise', 'mayonesa'], ['mustard', 'Senf', 'mostaza'],
  ['pizza', 'Pizza', 'pizza'], ['burger', 'Burger', 'hamburguesa'], ['fries', 'Pommes', 'patatas fritas'], ['kebab', 'Döner', 'kebab'],
  ['sushi', 'Sushi', 'sushi'], ['lasagna', 'Lasagne', 'lasaña'], ['spaghetti', 'Spaghetti', 'espaguetis'], ['noodles', 'Nudeln', 'fideos'],
  ['white rice', 'Weißer Reis', 'arroz blanco'], ['oatmeal', 'Haferflocken', 'avena'], ['muesli', 'Müsli', 'muesli'], ['granola', 'Granola', 'granola'],
  ['toast', 'Toast', 'tostada'], ['baguette', 'Baguette', 'baguette'], ['rye bread', 'Roggenbrot', 'pan de centeno'], ['wrap', 'Wrap', 'wrap'],
  ['tortilla', 'Tortilla', 'tortilla de trigo'], ['pancakes', 'Pfannkuchen', 'tortitas'], ['waffles', 'Waffeln', 'gofres'],
  ['yogurt', 'Joghurt', 'yogur'], ['fruit yogurt', 'Fruchtjoghurt', 'yogur de frutas'], ['pudding', 'Pudding', 'natillas'],
  ['skyr', 'Skyr', 'skyr'], ['mozzarella', 'Mozzarella', 'mozzarella'], ['feta', 'Feta', 'queso feta'], ['cream cheese', 'Frischkäse', 'queso crema'],
  ['ham', 'Schinken', 'jamón'], ['salami', 'Salami', 'salami'], ['sausage', 'Wurst', 'salchicha'], ['bacon', 'Speck', 'bacon'],
  ['beef', 'Rindfleisch', 'ternera'], ['pork', 'Schweinefleisch', 'cerdo'], ['turkey', 'Pute', 'pavo'], ['shrimp', 'Garnelen', 'gambas'],
  ['cod', 'Kabeljau', 'bacalao'], ['sardines', 'Sardinen', 'sardinas'], ['spinach', 'Spinat', 'espinacas'], ['lettuce', 'Salat', 'lechuga'],
  ['zucchini', 'Zucchini', 'calabacín'], ['bell pepper', 'Paprika', 'pimiento'], ['onion', 'Zwiebel', 'cebolla'], ['garlic', 'Knoblauch', 'ajo'],
  ['mushrooms', 'Pilze', 'champiñones'], ['cauliflower', 'Blumenkohl', 'coliflor'], ['corn', 'Mais', 'maíz'], ['peas', 'Erbsen', 'guisantes'],
  ['beans', 'Bohnen', 'judías'], ['kidney beans', 'Kidneybohnen', 'alubias rojas'], ['strawberries', 'Erdbeeren', 'fresas'],
  ['raspberries', 'Himbeeren', 'frambuesas'], ['orange', 'Orange', 'naranja'], ['pear', 'Birne', 'pera'], ['kiwi', 'Kiwi', 'kiwi'],
  ['pineapple', 'Ananas', 'piña'], ['watermelon', 'Wassermelone', 'sandía'], ['peach', 'Pfirsich', 'melocotón'], ['cherries', 'Kirschen', 'cerezas'],
  ['lemon', 'Zitrone', 'limón'], ['dried fruit', 'Trockenobst', 'fruta deshidratada'], ['coconut', 'Kokosnuss', 'coco'],
  ['candy', 'Süßigkeiten', 'caramelos'], ['lollipop', 'Lutscher', 'piruleta'], ['marshmallows', 'Marshmallows', 'nubes'],
  ['soda', 'Limonade', 'refresco'], ['sports drink', 'Sportgetränk', 'bebida isotónica'], ['protein shake', 'Proteinshake', 'batido de proteína'],
  ['almond milk', 'Mandelmilch', 'leche de almendras'], ['soy milk', 'Sojamilch', 'leche de soja'], ['kefir', 'Kefir', 'kefir'],
  ['quinoa', 'Quinoa', 'quinoa'], ['couscous', 'Couscous', 'cuscús'], ['polenta', 'Polenta', 'polenta'], ['gnocchi', 'Gnocchi', 'ñoquis'],
  ['dumplings', 'Knödel', 'bolas de masa'], ['soup', 'Suppe', 'sopa'], ['salad', 'Salat mit Dressing', 'ensalada'], ['omelette', 'Omelett', 'tortilla francesa'], ['lemon', 'Zitrone', 'limones'], ['lemon juice', 'Zitronensaft', 'zumo de limón'], ['protein shake', 'Proteinshake', 'batido de proteína'], ['chocolate', 'Schokolade', 'chocolate']
];
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/index.html';
  const R = await H.open({ device: 'iPhone 13', engine: 'chromium', members: 4, messages: 4, probe: false, lang: 'en', ...(/^https?:/.test(url) ? { url } : { root: url }) }), P = R.page;
  await R.goto(); await H.sleep(5000);
  const res = await P.evaluate(rows => rows.map(r => r.map(q => { try { const p = LowiDex.nameEst({ name: q, brand: '', typed: true, verdict: 'unknown', why: [], score: null }); return [q, p && p.nameEst ? p.verdict : '-', p && p.nameEst ? (p.nameEst.hit || '') : '']; } catch (e) { return [q, 'ERR ' + e.message, '']; } })), ROWS);
  let n = 0;
  for (const r of res) { const v = r.map(x => x[1]); if (new Set(v).size > 1 || v.includes('-')) { n++; console.log(r.map(x => x[0] + ':' + x[1] + (x[2] ? '(' + x[2] + ')' : '')).join(' | ')); } }
  console.log('rows', res.length, 'flagged', n, 'errs', JSON.stringify(R.errs.slice(0, 3)));
  await R.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
