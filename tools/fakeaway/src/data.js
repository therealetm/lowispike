/* Fakeaway week: all data and the pure math, shared by the page and check.cjs. */
(function (root) {
'use strict';

/* Shopping items. pack = what you buy (g, or pieces for eggs), price in EUR.
   Prices: Aldi Süd online shop, 6 Nov 2026, unless est (fruit and veg guide price) or store says otherwise.
   n = per 100 g: kcal, protein, carbs, fat.  show = how an amount is written.
   nm = noun [singular, plural] used in recipe steps. */
const ITEMS = {
  beef:     { aisle: 'meat', pack: 500, price: 5.79, n: [215, 19, 0, 15.5], show: 'g', keep: 1,
              de: 'Rinderhackfleisch', en: 'Ground beef', pk: ['500 g', '500 g'], nm: { de: ['Rinderhack'], en: ['ground beef'] } },
  chicken:  { aisle: 'meat', pack: 1500, price: 12.99, n: [105, 23.5, 0, 1.2], show: 'g', keep: 1,
              de: 'Hähnchenbrustfilet', en: 'Chicken breast', pk: ['1,5 kg', '1.5 kg'], nm: { de: ['Hähnchen'], en: ['chicken'] } },
  fish:     { aisle: 'frozen', pack: 900, price: 5.49, n: [85, 15, 0, 2.5], show: 'g', keep: 1,
              de: 'Pangasiusfilet, tiefgekühlt', en: 'Pangasius fillet, frozen', pk: ['900 g', '900 g'], nm: { de: ['Fisch'], en: ['fish'] } },
  eggs:     { aisle: 'dairy', pack: 18, price: 4.19, n: [137, 12.5, 0.7, 9.3], each: 55, show: 'egg',
              de: 'Eier', en: 'Eggs', pk: ['18 Stück', '18 pack'], nm: { de: ['Ei', 'Eier'], en: ['egg', 'eggs'] } },
  quark:    { aisle: 'dairy', pack: 500, price: 1.19, n: [67, 12, 4, 0.2], show: 'g',
              de: 'Magerquark', en: 'Low-fat quark (Magerquark)', pk: ['500 g', '500 g'], nm: { de: ['Quark'], en: ['quark'] } },
  yogurt:   { aisle: 'dairy', pack: 1000, price: 2.19, n: [118, 3.6, 4.2, 10], show: 'spoon', spoonG: 20,
              de: 'Joghurt griechischer Art', en: 'Greek-style yogurt', pk: ['1 kg', '1 kg'], nm: { de: ['Joghurt'], en: ['yogurt'] } },
  gouda:    { aisle: 'dairy', pack: 250, price: 1.79, n: [360, 25, 0, 28.5], show: 'g',
              de: 'Gouda, gerieben', en: 'Grated Gouda', pk: ['250 g', '250 g'], nm: { de: ['Käse'], en: ['cheese'] } },
  mozz:     { aisle: 'dairy', pack: 125, price: 0.89, n: [240, 18, 1, 18], show: 'g',
              de: 'Mozzarella', en: 'Mozzarella', pk: ['125 g', '125 g'], nm: { de: ['Mozzarella'], en: ['mozzarella'] } },
  cauli:    { aisle: 'frozen', pack: 750, price: 2.69, n: [25, 2, 2.3, 0.3], show: 'g', keep: 1,
              de: 'Blumenkohl, tiefgekühlt', en: 'Cauliflower, frozen', pk: ['750 g', '750 g'], nm: { de: ['Blumenkohl'], en: ['cauliflower'] } },
  broc:     { aisle: 'frozen', pack: 750, price: 2.69, n: [34, 3.5, 2.7, 0.4], show: 'g', keep: 1,
              de: 'Brokkoli, tiefgekühlt', en: 'Broccoli, frozen', pk: ['750 g', '750 g'], nm: { de: ['Brokkoli'], en: ['broccoli'] } },
  straw:    { aisle: 'frozen', pack: 750, price: 3.29, n: [32, 0.7, 5.5, 0.3], show: 'g', keep: 1,
              de: 'Erdbeeren, tiefgekühlt', en: 'Strawberries, frozen', pk: ['750 g', '750 g'], nm: { de: ['Erdbeeren'], en: ['strawberries'] } },
  cabbage:  { aisle: 'veg', pack: 1500, price: 1.49, est: 1, n: [25, 1.4, 4.2, 0.2], show: 'head',
              de: 'Weißkohl', en: 'White cabbage', pk: ['1 Kopf', '1 head'], nm: { de: ['Weißkohl'], en: ['white cabbage'] } },
  iceberg:  { aisle: 'veg', pack: 450, price: 1.09, est: 1, n: [14, 0.9, 1.8, 0.1], show: 'leaf', pc: 25,
              de: 'Eisbergsalat', en: 'Iceberg lettuce', pk: ['1 Kopf', '1 head'], nm: { de: ['Salatblatt', 'Salatblätter'], en: ['lettuce leaf', 'lettuce leaves'] } },
  cucumber: { aisle: 'veg', pack: 400, price: 0.79, est: 1, n: [13, 0.6, 1.8, 0.1], show: 'pc', pc: 400,
              de: 'Salatgurke', en: 'Cucumber', pk: ['1 Stück', '1 piece'], nm: { de: ['Gurke', 'Gurken'], en: ['cucumber', 'cucumbers'] } },
  tomato:   { aisle: 'veg', pack: 500, price: 1.49, est: 1, n: [18, 0.9, 2.6, 0.2], show: 'pc', pc: 100,
              de: 'Tomaten', en: 'Tomatoes', pk: ['500 g', '500 g'], nm: { de: ['Tomate', 'Tomaten'], en: ['tomato', 'tomatoes'] } },
  pepper:   { aisle: 'veg', pack: 510, price: 1.99, est: 1, n: [30, 1, 5, 0.3], show: 'pc', pc: 170,
              de: 'Paprika', en: 'Bell peppers', pk: ['3 Stück', '3 pack'], nm: { de: ['Paprika', 'Paprika'], en: ['bell pepper', 'bell peppers'] } },
  onion:    { aisle: 'veg', pack: 1000, price: 1.29, est: 1, n: [40, 1.2, 7.5, 0.1], show: 'pc', pc: 80,
              de: 'Zwiebeln', en: 'Onions', pk: ['1 kg', '1 kg'], nm: { de: ['Zwiebel', 'Zwiebeln'], en: ['onion', 'onions'] } },
  garlic:   { aisle: 'veg', pack: 150, price: 0.99, est: 1, n: [140, 6, 28, 0.1], show: 'clove', pc: 5,
              de: 'Knoblauch', en: 'Garlic', pk: ['3 Knollen', '3 bulbs'], nm: { de: ['Knoblauchzehe', 'Knoblauchzehen'], en: ['garlic clove', 'garlic cloves'] } },
  kohlrabi: { aisle: 'veg', pack: 300, price: 0.79, est: 1, n: [27, 1.9, 3.7, 0.1], show: 'pc', pc: 300,
              de: 'Kohlrabi', en: 'Kohlrabi', pk: ['1 Stück', '1 piece'], nm: { de: ['Kohlrabi', 'Kohlrabi'], en: ['kohlrabi', 'kohlrabi'] } },
  lemon:    { aisle: 'veg', pack: 120, price: 1.19, n: [30, 0.4, 7, 0.2], show: 'lemon', pc: 30,
              de: 'Zitronen', en: 'Lemons', pk: ['500 g', '500 g'], nm: { de: ['Zitrone', 'Zitronen'], en: ['lemon', 'lemons'] } },
  passata:  { aisle: 'shelf', pack: 500, price: 0.65, n: [30, 1.3, 5, 0.2], show: 'g',
              de: 'Passierte Tomaten', en: 'Passata', pk: ['500 g', '500 g'], nm: { de: ['passierte Tomaten'], en: ['passata'] } },
  paste:    { aisle: 'shelf', pack: 200, price: 0.89, n: [85, 4.5, 13, 0.5], show: 'tsp', tspG: 5,
              de: 'Tomatenmark', en: 'Tomato paste', pk: ['200 g', '200 g'], nm: { de: ['Tomatenmark'], en: ['tomato paste'] } },
  almond:   { aisle: 'shelf', pack: 200, price: 2.49, n: [600, 21, 5.7, 52], show: 'g', keep: 1,
              de: 'Mandeln, gemahlen', en: 'Ground almonds', pk: ['200 g', '200 g'], nm: { de: ['gemahlene Mandeln'], en: ['ground almonds'] } },
  cocoa:    { aisle: 'shelf', pack: 250, price: 3.29, n: [360, 20, 11, 11], show: 'tsp', tspG: 4, keep: 1, store: 'Lidl',
              de: 'Backkakao, ungesüßt', en: 'Unsweetened cocoa', pk: ['250 g', '250 g'], nm: { de: ['Kakao'], en: ['cocoa'] } },
  /* basics: most kitchens have them; shown separately with a guide price */
  oil:      { basic: 1, price: 1.79, n: [884, 0, 0, 100], show: 'tsp', tspG: 4.5, de: 'Öl (Raps oder Oliven)', en: 'Oil (rapeseed or olive)', nm: { de: ['Öl'], en: ['oil'] } },
  mustard:  { basic: 1, price: 0.55, n: [70, 5, 4, 4], show: 'tsp', tspG: 5, de: 'Senf', en: 'Mustard', nm: { de: ['Senf'], en: ['mustard'] } },
  vinegar:  { basic: 1, price: 0.49, n: [20, 0, 1, 0], show: 'tsp', tspG: 5, de: 'Essig', en: 'Vinegar', nm: { de: ['Essig'], en: ['vinegar'] } },
  paprika:  { basic: 1, price: 0.79, show: 'tsp', de: 'Paprikapulver', en: 'Paprika powder', nm: { de: ['Paprikapulver'], en: ['paprika'] } },
  oregano:  { basic: 1, price: 0.79, show: 'tsp', de: 'Oregano', en: 'Oregano', nm: { de: ['Oregano'], en: ['oregano'] } },
  cumin:    { basic: 1, price: 0.99, show: 'tsp', de: 'Kreuzkümmel', en: 'Cumin', nm: { de: ['Kreuzkümmel'], en: ['cumin'] } },
  cinnamon: { basic: 1, price: 0.79, show: 'tsp', de: 'Zimt', en: 'Cinnamon', nm: { de: ['Zimt'], en: ['cinnamon'] } },
  salt:     { basic: 1, price: 1.24, show: 'none', de: 'Salz & Pfeffer', en: 'Salt & pepper', nm: { de: ['Salz & Pfeffer'], en: ['salt & pepper'] } },
};
const AISLES = ['veg', 'dairy', 'meat', 'frozen', 'shelf'];
const KID = 0.7;   /* a child eats about 70 % of an adult portion */

/* Recipes. ing: [item, amount per adult portion]: grams; eggs in pieces; tsp items in teaspoons.
   Steps write {item} for "amount + name" and {leftover}, {trays}, {pieces} for computed lines. */
const RECIPES = {
  pancakes: { slot: 'brunch', min: 15, icon: 'pancakes', ing: [['straw', 40], ['eggs', 2], ['quark', 100], ['almond', 30], ['cinnamon', 0.5], ['oil', 1.5], ['yogurt', 80]] },
  froyo:    { slot: 'breakfast', min: 5, icon: 'froyo', ing: [['straw', 40], ['quark', 150], ['yogurt', 100], ['almond', 20], ['cinnamon', 0.25]] },
  eggpizza: { slot: 'breakfast', min: 7, icon: 'eggpizza', ing: [['tomato', 20], ['pepper', 25], ['oil', 1.5], ['eggs', 3], ['gouda', 15], ['oregano', 0.25], ['salt', 0]] },
  maccheese:{ slot: 'dinner', min: 35, active: 10, icon: 'maccheese', leftover: 1, ing: [['cauli', 200], ['quark', 75], ['eggs', 1], ['yogurt', 60], ['mustard', 0.5], ['garlic', 2.5], ['gouda', 40], ['almond', 10], ['salt', 0]] },
  burger:   { slot: 'dinner', min: 20, icon: 'burger', leftover: 1, ing: [['cabbage', 100], ['vinegar', 0.5], ['oil', 2], ['cucumber', 60], ['tomato', 35], ['onion', 15], ['yogurt', 50], ['paste', 1], ['mustard', 0.5], ['paprika', 0.25], ['beef', 80], ['gouda', 20], ['eggs', 1], ['salt', 0]] },
  pizza:    { slot: 'dinner', min: 35, active: 10, icon: 'pizza', leftover: 1, perTray: 4, ing: [['quark', 125], ['eggs', 1], ['almond', 20], ['gouda', 15], ['oregano', 0.5], ['passata', 50], ['pepper', 40], ['onion', 10], ['mozz', 31], ['oil', 1], ['salt', 0]] },
  nuggets:  { slot: 'dinner', min: 30, active: 12, icon: 'nuggets', leftover: 1, ing: [['chicken', 125], ['eggs', 0.34], ['almond', 20], ['gouda', 5], ['paprika', 0.5], ['broc', 125], ['oil', 2], ['passata', 35], ['paste', 1], ['vinegar', 0.25], ['yogurt', 30], ['salt', 0]] },
  doener:   { slot: 'dinner', min: 25, icon: 'doener', leftover: 1, ing: [['chicken', 125], ['paprika', 0.5], ['cumin', 0.25], ['oregano', 0.25], ['oil', 3], ['cabbage', 120], ['lemon', 5], ['tomato', 30], ['cucumber', 50], ['onion', 15], ['yogurt', 80], ['quark', 60], ['garlic', 2.5], ['salt', 0]] },
  taco:     { slot: 'dinner', min: 25, icon: 'taco', leftover: 1, ing: [['onion', 15], ['pepper', 50], ['cauli', 50], ['beef', 80], ['oil', 1.5], ['passata', 40], ['paprika', 0.5], ['cumin', 0.5], ['garlic', 2.5], ['tomato', 30], ['lemon', 3], ['iceberg', 75], ['gouda', 25], ['yogurt', 70], ['salt', 0]] },
  fish:     { slot: 'dinner', min: 40, active: 15, icon: 'fish', ing: [['kohlrabi', 250], ['oil', 3], ['paprika', 0.5], ['fish', 150], ['eggs', 0.34], ['almond', 15], ['yogurt', 40], ['cucumber', 15], ['mustard', 0.5], ['lemon', 10], ['salt', 0]] },
  pudding:  { slot: 'snack', min: 3, icon: 'pudding', ing: [['straw', 30], ['quark', 200], ['yogurt', 30], ['cocoa', 2], ['cinnamon', 0.25]] },
  chips:    { slot: 'snack', min: 5, icon: 'chips', ing: [['cucumber', 140], ['yogurt', 60], ['quark', 40], ['garlic', 1.25], ['oil', 1], ['salt', 0]] },
};

/* The week, Monday first. 'rest' = yesterday's dinner. tasks: [time, kind, item, share of the pack]. */
const WEEK = [
  { d: 0, theme: 'burger',   slots: [['07:30', 'froyo'], ['12:30', 'rest', 'maccheese'], ['16:00', 'chips'], ['18:00', 'burger']], tasks: [] },
  { d: 1, theme: 'pizza',    slots: [['07:30', 'eggpizza'], ['12:30', 'rest', 'burger'], ['16:00', 'pudding'], ['18:00', 'pizza']], tasks: [['20:00', 'thaw', 'chicken', 'half']] },
  { d: 2, theme: 'nuggets',  slots: [['07:30', 'froyo'], ['12:30', 'rest', 'pizza'], ['16:00', 'chips'], ['18:00', 'nuggets']], tasks: [['20:00', 'thaw', 'chicken', 'half']] },
  { d: 3, theme: 'doener',   slots: [['07:30', 'eggpizza'], ['12:30', 'rest', 'nuggets'], ['16:00', 'pudding'], ['18:00', 'doener']], tasks: [['20:00', 'thaw', 'beef', 'one']] },
  { d: 4, theme: 'taco',     slots: [['07:30', 'froyo'], ['12:30', 'rest', 'doener'], ['16:00', 'chips'], ['18:00', 'taco']], tasks: [['20:00', 'thaw', 'fish', 'meal']] },
  { d: 5, theme: 'fish',     slots: [['07:30', 'eggpizza'], ['10:00', 'shop'], ['12:30', 'rest', 'taco'], ['16:00', 'pudding'], ['18:00', 'fish']], tasks: [] },
  { d: 6, theme: 'pancakes', slots: [['10:30', 'pancakes'], ['15:30', 'chips'], ['18:00', 'maccheese']], tasks: [['20:00', 'thaw', 'beef', 'one']] },
];

const portionsOf = (adults, kids) => Math.max(0, adults) + KID * Math.max(0, kids);
/* dinners that feed tomorrow's lunch are cooked double */
const times = id => (RECIPES[id].leftover ? 2 : 1);

/* everything to buy for the week. Eggs round up per cooking session; the rest rounds up per pack. */
function basket(adults, kids) {
  const P = portionsOf(adults, kids), need = {};
  WEEK.forEach(day => day.slots.forEach(s => {
    const r = RECIPES[s[1]]; if (!r) return;
    r.ing.forEach(([it, q]) => {
      if (ITEMS[it].basic) return;
      const amt = q * P * times(s[1]);
      need[it] = (need[it] || 0) + (it === 'eggs' ? Math.ceil(amt - 1e-9) : amt);
    });
  }));
  const rows = Object.keys(need).map(it => {
    const I = ITEMS[it], packs = Math.max(1, Math.ceil(need[it] / I.pack - 1e-9));
    return { it, need: need[it], packs, cost: packs * I.price, spare: packs * I.pack - need[it] };
  });
  const total = rows.reduce((a, r) => a + r.cost, 0);
  /* leftovers worth keeping: frozen goods, almonds, cocoa, eggs, onions, garlic, passata, paste, lemon */
  const KEEP = ['eggs', 'onion', 'garlic', 'passata', 'paste', 'lemon'];
  const spare = rows.reduce((a, r) => (ITEMS[r.it].keep || KEEP.indexOf(r.it) >= 0) ? a + r.spare / ITEMS[r.it].pack * ITEMS[r.it].price : a, 0);
  return { P, rows, total, spare };
}

/* grams of an ingredient amount, for nutrition */
function grams(it, q) {
  const I = ITEMS[it];
  if (it === 'eggs') return q * I.each;
  if (I.show === 'tsp') return I.tspG ? q * I.tspG : 0;
  if (I.show === 'none') return 0;
  return q;
}
/* nutrition and cost of one adult portion */
function perPortion(id) {
  const r = RECIPES[id], o = { kcal: 0, protein: 0, carbs: 0, fat: 0, eur: 0 };
  r.ing.forEach(([it, q]) => {
    const I = ITEMS[it], g = grams(it, q);
    if (I.n) { o.kcal += g * I.n[0] / 100; o.protein += g * I.n[1] / 100; o.carbs += g * I.n[2] / 100; o.fat += g * I.n[3] / 100; }
    if (!I.basic) o.eur += q / I.pack * I.price;
  });
  return o;
}

const api = { ITEMS, AISLES, KID, RECIPES, WEEK, portionsOf, times, basket, grams, perPortion };
if (typeof module === 'object' && module.exports) module.exports = api; else root.FAW = api;
})(typeof self !== 'undefined' ? self : this);
