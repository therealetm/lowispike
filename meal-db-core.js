/* LOWiSPIKE meal database: understands a typed meal name ("chicken stew", "jacket potato with cheese", "fish and chips",
   "Hähnchensuppe", "arroz con pollo") and gives that meal's estimated nutrition per serving, with its ingredients.

   Data: data/meals/fndds.json, built by tools/meal-data/build.cjs from USDA FoodData Central FNDDS (public domain): ~5,250 foods
   and mixed dishes as people eat them, per typical serving. On top of it, DISHES below names dishes from many cuisines that FNDDS
   lacks or names differently, composed from FNDDS foods by grams. Unknown meals are split into their parts ("rice and beans with
   egg" -> rice + beans + egg) and summed. Nothing is ever left blank: if no part is known, a typical mixed meal stands in, marked rough.

   Pure: no DOM. window.LowiMealDB in the browser, module.exports in node (tests). */
(function (root) {
  'use strict';

  /* ---------- text ---------- */
  function fold(s) {
    return String(s || '').toLowerCase().replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/œ/g, 'oe')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function stem(w) {
    if (w.length <= 3) return w;
    if (/ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (/(oes|ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2);
    if (/[^su]s$/.test(w)) return w.slice(0, -1);
    return w;
  }

  /* German and Spanish words people type, to the English words FNDDS uses. Compounds (Hähnchensuppe) are split by suffix below. */
  var WORDS = {
    // German
    hahnchen: 'chicken', huhnchen: 'chicken', huhn: 'chicken', hendl: 'chicken', pute: 'turkey', truthahn: 'turkey', rind: 'beef', rindfleisch: 'beef',
    schwein: 'pork', schweinefleisch: 'pork', lamm: 'lamb', fisch: 'fish', lachs: 'salmon', thunfisch: 'tuna', garnelen: 'shrimp', krabben: 'shrimp',
    suppe: 'soup', eintopf: 'stew', brühe: 'broth', bruhe: 'broth', kartoffel: 'potato', kartoffeln: 'potato', pommes: 'french fries', reis: 'rice',
    nudeln: 'pasta', nudel: 'pasta', brot: 'bread', brotchen: 'roll', ei: 'egg', eier: 'egg', spiegelei: 'egg fried', ruhrei: 'egg scrambled', kase: 'cheese',
    milch: 'milk', joghurt: 'yogurt', quark: 'cottage cheese', salat: 'salad', gemuse: 'vegetables', bohnen: 'beans', linsen: 'lentils', erbsen: 'peas',
    mohren: 'carrots', karotten: 'carrots', zwiebel: 'onion', tomate: 'tomato', tomaten: 'tomato', apfel: 'apple', banane: 'banana', haferflocken: 'oatmeal',
    wurst: 'sausage', wurstchen: 'sausage', speck: 'bacon', schinken: 'ham', mit: 'with', und: 'and', gebraten: 'fried', gekocht: 'boiled', gebacken: 'baked',
    pfannkuchen: 'pancakes', kuchen: 'cake', schokolade: 'chocolate', sosse: 'sauce', sauce: 'sauce', spinat: 'spinach', pilze: 'mushrooms', champignons: 'mushrooms',
    // Spanish
    pollo: 'chicken', pavo: 'turkey', res: 'beef', carne: 'beef', cerdo: 'pork', cordero: 'lamb', pescado: 'fish', salmon: 'salmon', atun: 'tuna', camarones: 'shrimp',
    gambas: 'shrimp', sopa: 'soup', caldo: 'soup', guiso: 'stew', estofado: 'stew', papa: 'potato', papas: 'potato', patata: 'potato', patatas: 'potato',
    arroz: 'rice', pasta: 'pasta', fideos: 'noodles', pan: 'bread', huevo: 'egg', huevos: 'egg', queso: 'cheese', leche: 'milk', yogur: 'yogurt',
    ensalada: 'salad', verduras: 'vegetables', frijoles: 'beans', judias: 'beans', lentejas: 'lentils', garbanzos: 'chickpeas', con: 'with', y: 'and',
    frito: 'fried', frita: 'fried', fritos: 'fried', fritas: 'fried', asado: 'roasted', asada: 'roasted', hervido: 'boiled', avena: 'oatmeal', platano: 'plantain', maiz: 'corn'
  };
  /* German compound suffixes: "hahnchensuppe" -> "hahnchen suppe" */
  var DE_SUFFIX = ['suppe', 'eintopf', 'salat', 'auflauf', 'brot', 'brotchen', 'pfanne', 'kuchen', 'wurst', 'schnitzel', 'braten', 'sosse', 'pure', 'pueree', 'puree'];

  /* everyday names to FNDDS wording, applied to the folded text before tokens (longest first) */
  var PHRASES = [
    ['jacket potato', 'potato baked peel eaten'], ['baked potato', 'potato baked'], ['backkartoffel', 'potato baked'], ['ofenkartoffel', 'potato baked'],
    ['mashed potato', 'potato mashed'], ['kartoffelpuree', 'potato mashed'], ['kartoffelbrei', 'potato mashed'], ['pure de papa', 'potato mashed'],
    ['bratkartoffeln', 'potato home fries'], ['chips', 'chip'], ['crisps', 'potato chips'], ['scrambled eggs', 'egg scrambled'], ['fried egg', 'egg fried'],
    ['boiled egg', 'egg boiled'], ['porridge', 'oatmeal'], ['mince', 'ground beef'], ['minced beef', 'ground beef'], ['courgette', 'zucchini'],
    ['aubergine', 'eggplant'], ['prawns', 'shrimp'], ['prawn', 'shrimp'], ['omelette', 'omelet'], ['tortilla de huevo', 'omelet'], ['mac and cheese', 'macaroni and cheese'], ['mac n cheese', 'macaroni and cheese'],
    ['chilli', 'chili'], ['chili con carne', 'chili con carne'], ['yoghurt', 'yogurt'], ['bap', 'roll'], ['butty', 'sandwich'], ['sarnie', 'sandwich'],
    ['coriander', 'cilantro'], ['rocket', 'arugula'], ['beetroot', 'beet'], ['swede', 'rutabaga'], ['gammon', 'ham'], ['rasher', 'bacon']
  ];

  /* dishes FNDDS lacks or names very differently, composed from FNDDS foods by grams: [FNDDS name or search words, grams].
     Every entry is checked against the data by tests/meal-db.test.cjs, and the nutrition comes out of the FNDDS rows. */
  var DISHES = [
    { k: ['fish and chips', 'fish n chips', 'fish chips', 'fisch und pommes', 'pescado con papas fritas'], n: 'Fish and chips', mix: [['Fish, cod, fried', 170], ['Potato, french fries, restaurant', 180]] },
    { k: ['beans on toast'], n: 'Beans on toast', mix: [['Baked beans', 200], ['Bread, white, toasted', 56], ['Butter, NFS', 7]] },
    { k: ['full english', 'english breakfast', 'fry up', 'fry-up'], n: 'Full English breakfast', mix: [['Egg, whole, fried, NS as to fat', 50], ['Bacon, NS as to type of meat, cooked', 32], ['Pork sausage', 50], ['Baked beans', 130], ['Bread, white, toasted', 28], ['Tomatoes, cooked, as ingredient', 60], ['Mushrooms, cooked, as ingredient', 60]] },
    { k: ['bangers and mash', 'sausage and mash', 'wurst mit kartoffelbrei'], n: 'Bangers and mash', mix: [['Pork sausage', 150], ['Potato, mashed, NFS', 210], ['Gravy, NFS', 60]] },
    { k: ['sunday roast', 'roast dinner'], n: 'Roast dinner', mix: [['Beef, roast', 120], ['Potato, roasted, from fresh, peel eaten, made with oil', 150], ['Carrots, cooked, as ingredient', 80], ['Green peas, frozen, cooked, no added fat', 80], ['Gravy, NFS', 60]] },
    { k: ['jollof rice', 'jollof'], n: 'Jollof rice', mix: [['Rice, white, cooked, made with oil', 250], ['Tomato sauce, for use with vegetables', 60], ['Onions, cooked, fat added', 30]] },
    { k: ['egusi soup', 'egusi'], n: 'Egusi soup', mix: [['Spinach, cooked, as ingredient', 120], ['Beef, NFS', 85], ['Pumpkin seeds, NFS', 40], ['Oil or table fat, NFS', 14]] },
    { k: ['pounded yam'], n: 'Pounded yam', mix: [['Fufu', 250]] },
    { k: ['injera'], n: 'Injera', mix: [['Injera, Ethiopian bread', 127]] },
    { k: ['doro wat', 'doro wot'], n: 'Doro wat', mix: [['Chicken leg, drumstick and thigh, stewed, skin not eaten', 150], ['Egg, whole, boiled or poached', 50], ['Onions, cooked, fat added', 80], ['Butter, NFS', 14]] },
    { k: ['shakshuka'], n: 'Shakshuka', mix: [['Egg, whole, boiled or poached', 100], ['Tomatoes, cooked, as ingredient', 200], ['Peppers, red, cooked', 60], ['Olive oil', 10]] },
    { k: ['butter chicken', 'murgh makhani'], n: 'Butter chicken', mix: [['Chicken curry', 300], ['Cream, heavy', 30]] },
    { k: ['chicken tikka masala', 'tikka masala', 'chicken tikka'], n: 'Chicken tikka masala', mix: [['Chicken curry', 300], ['Yogurt, Greek, whole milk, plain', 30]] },
    { k: ['biryani', 'biriyani'], n: 'Chicken biryani', mix: [['Chicken curry with rice', 350]] },
    { k: ['dal', 'dhal', 'daal', 'tarka dal'], n: 'Dal', mix: [['Lentils, from dried, fat added', 250]] },
    { k: ['chana masala', 'chole'], n: 'Chana masala', mix: [['Chickpeas, from dried, fat added', 250], ['Tomato sauce, for use with vegetables', 60]] },
    { k: ['palak paneer', 'saag paneer'], n: 'Palak paneer', mix: [['Palak Paneer', 250]] },
    { k: ['pho', 'pho bo'], n: 'Pho', mix: [['Soup, beef', 400], ['Noodles, cooked', 120], ['Bean sprouts, raw', 30]] },
    { k: ['bibimbap'], n: 'Bibimbap', mix: [['Rice, white, cooked, no added fat', 200], ['Beef, NFS', 70], ['Egg, whole, fried, NS as to fat', 50], ['Spinach, cooked, as ingredient', 50], ['Carrots, cooked, as ingredient', 40], ['Bean sprouts, cooked', 40]] },
    { k: ['bulgogi'], n: 'Bulgogi', mix: [['Steak teriyaki', 183], ['Rice, white, cooked, no added fat', 160]] },
    { k: ['paella'], n: 'Paella', mix: [['Paella, NFS', 300]] },
    { k: ['tortilla espanola', 'spanish omelette', 'spanish tortilla', 'tortilla de patatas'], n: 'Spanish tortilla', mix: [['Egg omelet or scrambled egg, made with oil', 110], ['Potato, home fries, NFS', 120]] },
    { k: ['currywurst'], n: 'Currywurst', mix: [['Bratwurst', 120], ['Ketchup', 40], ['Potato, french fries, NFS', 150]] },
    { k: ['schnitzel', 'wiener schnitzel'], n: 'Schnitzel', mix: [['Pork, steak, coated', 150]] },
    { k: ['kasespatzle', 'kaesespaetzle', 'spatzle', 'spaetzle'], n: 'K\u00e4sesp\u00e4tzle', mix: [['Macaroni or noodles with cheese, from restaurant', 300], ['Onions, cooked, fat added', 30]] },
    { k: ['goulash', 'gulasch', 'gulaschsuppe'], n: 'Goulash', mix: [['Stew, beef', 300]] },
    { k: ['doner', 'doner kebab', 'doener', 'kebab', 'gyro', 'gyros', 'shawarma'], n: 'D\u00f6ner kebab', mix: [['Gyro sandwich', 300]] },
    { k: ['tagine'], n: 'Tagine', mix: [['Stew, lamb', 300], ['Couscous, plain, cooked', 120]] },
    { k: ['feijoada'], n: 'Feijoada', mix: [['Black beans with meat', 260], ['Rice, white, cooked, no added fat', 150]] },
    { k: ['rice and peas', 'rice n peas'], n: 'Rice and peas', mix: [['Kidney beans and white rice', 250], ['Coconut milk, used in cooking', 30]] },
    { k: ['jerk chicken'], n: 'Jerk chicken', mix: [['Chicken leg, drumstick and thigh, baked or broiled, skin eaten', 180]] },
    { k: ['poutine'], n: 'Poutine', mix: [['Potato, french fries, restaurant', 170], ['Cheese, Mozzarella, NFS', 60], ['Gravy, NFS', 80]] },
    { k: ['cornish pasty', 'pasty'], n: 'Cornish pasty', mix: [['Pot pie, beef', 230]] },
    { k: ['toad in the hole'], n: 'Toad in the hole', mix: [['Pork sausage', 120], ['Pancakes, plain', 110]] },
    { k: ['ploughman', 'ploughmans', 'ploughmans lunch'], n: "Ploughman's lunch", mix: [['Cheese, Cheddar', 60], ['Bread, white', 60], ['Pickles, NFS', 30], ['Apple, raw', 100], ['Butter, NFS', 10]] },
    { k: ['arepa', 'arepas'], n: 'Arepa', mix: [['Arepa Dominicana', 120]] },
    { k: ['ceviche'], n: 'Ceviche', mix: [['ceviche', 200]] },
    { k: ['pierogi', 'pierogies', 'piroggen'], n: 'Pierogi', mix: [['pierogi', 200]] },
    { k: ['borscht', 'borsch'], n: 'Borscht', mix: [['Soup, beef', 150], ['Beets, fresh, cooked, no added fat', 120]] },
    { k: ['moussaka'], n: 'Moussaka', mix: [['Eggplant and meat casserole', 300]] },
    { k: ['chili con carne', 'chilli con carne'], n: 'Chili con carne', mix: [['Chili with meat and beans', 255]] },
    { k: ['arroz con pollo'], n: 'Arroz con pollo', mix: [['Rice, white, cooked, made with oil', 200], ['Chicken, NS as to part and cooking method, NS as to skin eaten', 100], ['Green peas, frozen, cooked, no added fat', 40]] },
    { k: ['steak and chips', 'steak frites', 'steak with chips'], n: 'Steak and chips', mix: [['Beef, steak, NFS', 170], ['Potato, french fries, restaurant', 150]] },
    { k: ['spaghetti bolognese', 'spag bol', 'pasta bolognese', 'spaghetti with meat sauce', 'spaghetti mit hackfleischsosse', 'espaguetis a la bolonesa'], n: 'Spaghetti bolognese', mix: [['Pasta, cooked', 200], ['Spaghetti sauce with meat', 190]] },
    { k: ['chicken salad', 'hahnchensalat', 'ensalada de pollo'], n: 'Chicken salad', mix: [['Chicken or turkey garden salad, chicken and/or turkey, tomato and/or carrots, other vegetables, no dressing', 300], ['Olive oil', 7]] },
    { k: ['salad', 'green salad', 'side salad', 'mixed salad', 'gemischter salat', 'ensalada mixta'], n: 'Green salad', mix: [['Lettuce, raw', 100], ['Tomatoes, raw', 60], ['Olive oil', 7]] }
  ];

  /* what a bare word most likely means as a meal log (FNDDS name). Used for the whole text and for each part. */
  var DEFAULTS = {
    chicken: 'Chicken, NS as to part and cooking method, NS as to skin eaten', egg: 'Egg, whole, cooked, NS as to cooking method', pizza: 'Pizza, cheese, from restaurant or fast food, NS as to type of crust',
    apple: 'Apple, raw', bread: 'Bread, white', toast: 'Bread, white, toasted', lasagna: 'Lasagna with meat', omelet: 'Egg omelet or scrambled egg, NS as to fat',
    burger: 'Hamburger, NFS', hamburger: 'Hamburger, NFS', cheeseburger: 'Cheeseburger, NFS', rice: 'Rice, cooked, NFS', fish: 'Fish, NFS', beef: 'Beef, NFS', steak: 'Beef, steak, NFS',
    chip: 'Potato chips, NFS', fry: 'Potato, french fries, NFS', 'french fry': 'Potato, french fries, NFS', pasta: 'Pasta, cooked', noodle: 'Noodles, cooked', potato: 'Potato, NFS',
    cheese: 'Cheese, NFS', sandwich: 'Sandwich, NFS', bean: 'Beans, NFS', salmon: 'Fish, salmon, NFS', tuna: 'Fish, tuna, NFS', pork: 'Pork, NFS', lamb: 'Lamb, NS as to cut', turkey: 'Turkey, NFS',
    soup: 'Soup, NFS', curry: 'Chicken curry', stew: 'Stew, beef', milk: 'Milk, NFS', yogurt: 'Yogurt, NFS', cereal: 'Cereal, corn flakes, plain', oatmeal: 'Oatmeal, NFS', banana: 'Banana, raw',
    orange: 'Orange, raw', avocado: 'Avocado, raw', sausage: 'Pork sausage', bacon: 'Bacon, NS as to type of meat, cooked', shrimp: 'Shrimp, NFS', taco: 'Taco, NFS', burrito: 'Burrito, NFS',
    'egg fried': 'Egg, whole, fried, NS as to fat', 'egg scrambled': 'Egg omelet or scrambled egg, NS as to fat', 'egg boiled': 'Egg, whole, boiled or poached', 'potato mashed': 'Potato, mashed, NFS',
    'potato baked': 'Potato, baked, NFS', 'chicken breast': 'Chicken breast, NS as to cooking method, skin not eaten', vegetable: 'Classic mixed vegetables, NS as to form, cooked', 'beef stir fry': 'Stir fried beef and vegetables in soy sauce', fruit: 'Fruit, NFS'
  };

  /* FUNC: words that never decide a match. SOFT: description words that cost little when the user didn't type them. */
  var FUNC = {}, WEAK = {};
  ('nfs ns as to type of or and with from made home recipe restaurant fast food no not nsf use for').split(' ').forEach(function (w) { FUNC[w] = 1; WEAK[w] = 1; });
  ('cooked prepared plain regular whole fat added eaten skin peel part method cooking style canned frozen fresh dry dried reduced sodium lean only ' +
   'including excluding exclude include dark green leafy broccoli carrot puerto rican mexican american cafeteria school store bought commercial ' +
   'based ingredient form either both').split(' ').forEach(function (w) { WEAK[w] = 1; });
  var STOP = {};
  ('i had ate eaten eat a an the some my for lunch dinner breakfast supper snack brunch plate bowl portion serving of homemade little bit bisschen ' +
   'ich habe hatte gegessen ein eine einen etwas zum mittag abend fruhstuck comi una un unos unas el la los las de del para almuerzo cena desayuno').split(' ').forEach(function (w) { STOP[w] = 1; });
  var CONNECT = /\s*(?:,|\+|&|\bplus\b|\band\b|\bwith\b|\bmit\b|\bund\b|\bcon\b|\by\b|\bthen\b)\s*/;

  var NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5, ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, halb: 0.5, halbe: 0.5, uno: 1, dos: 2, tres: 3, cuatro: 4, medio: 0.5, media: 0.5, couple: 2, double: 2 };
  var SIZE = { small: 0.7, little: 0.7, kleine: 0.7, klein: 0.7, pequeno: 0.7, pequena: 0.7, large: 1.4, big: 1.4, huge: 1.8, grosse: 1.4, gross: 1.4, grande: 1.4, extra: 1.3 };

  function prep(text) {
    var s = ' ' + fold(text).replace(/[^a-z0-9.,+&' ]+/g, ' ').replace(/'/g, '').replace(/\s+/g, ' ') + ' ';
    PHRASES.slice().sort(function (a, b) { return b[0].length - a[0].length; }).forEach(function (p) {
      s = s.split(' ' + p[0] + ' ').join(' ' + p[1] + ' ');
    });
    return s.trim();
  }
  function splitCompound(w) {
    if (WORDS[w]) return [w];
    for (var i = 0; i < DE_SUFFIX.length; i++) {
      var suf = DE_SUFFIX[i];
      if (w.length > suf.length + 2 && w.slice(-suf.length) === suf) {
        var head = w.slice(0, -suf.length);
        var h = WORDS[head] ? head : (WORDS[head.replace(/(n|s)$/, '')] ? head.replace(/(n|s)$/, '') : head);
        return [h, suf];
      }
    }
    return [w];
  }
  /* words -> content tokens (translated, stemmed), plus quantity multiplier */
  var UNIT = { slice: 1, slices: 1, piece: 1, pieces: 1, scheibe: 1, scheiben: 1, stuck: 1, stucke: 1, stueck: 1, rebanada: 1, rebanadas: 1, trozo: 1, trozos: 1, porcion: 1, porciones: 1 };
  function tokens(text) {
    var out = [], count = 1, size = 1, unit = false, grams = 0;
    var words = String(text).split(/[\s,]+/);
    words.forEach(function (raw, i) {
      if (!raw) return;
      var gm = /^(\d+(?:\.\d+)?)(g|gr|gram|grams|gramm)$/.exec(raw);
      if (gm) { grams = parseFloat(gm[1]); return; }
      if (/^(g|gr|gram|grams|gramm)$/.test(raw) && /^\d/.test(words[i - 1] || '')) { grams = parseFloat(words[i - 1]); count = 1; return; }
      if (/^\d+(\.\d+)?$/.test(raw)) { var n = parseFloat(raw); if (n > 0 && n <= 12) count *= n; else if (n > 12 && /^(g|gr|gram|grams|gramm)$/.test(words[i + 1] || '')) return; return; }
      if (NUM[raw]) { count *= NUM[raw]; return; }
      if (SIZE[raw]) { size *= SIZE[raw]; return; }
      if (UNIT[raw]) { unit = true; return; }
      splitCompound(raw).forEach(function (w) {
        var t = WORDS[w] || w;
        t.split(' ').forEach(function (x) { if (x && !STOP[x]) out.push(stem(x)); });
      });
    });
    return { t: out, mult: count * size, count: count, size: size, unit: unit, grams: grams };
  }

  /* ---------- index ---------- */
  var DB = null;   // { rows, ing, idf, byName }
  function load(json) {
    var rows = [], df = {}, byName = {};
    (json.f || []).forEach(function (r) {
      var segs = r[0].split(','), toks = {}, head = {};
      tokens(fold(r[0]).replace(/[^a-z0-9, ]+/g, ' ')).t.forEach(function (x) { toks[x] = 1; });
      tokens(fold(segs[0]).replace(/[^a-z0-9 ]+/g, ' ')).t.forEach(function (x) { head[x] = 1; });
      var row = { name: r[0], g: r[1], u: r[9] || 0, v: [r[2], r[3], r[4], r[5], r[6], r[7]], ing: (r[8] || []).map(function (i) { return json.ing[i]; }), tok: toks, head: head,
        nfs: /\bNFS\b|\bNS as to\b/.test(r[0]), len: Object.keys(toks).length };
      rows.push(row); byName[r[0].toLowerCase()] = row;
      Object.keys(toks).forEach(function (x) { df[x] = (df[x] || 0) + 1; });
    });
    var idf = {}, N = rows.length || 1;
    Object.keys(df).forEach(function (x) { idf[x] = Math.log(1 + N / df[x]); });
    DB = { rows: rows, idf: idf, byName: byName };
    return DB;
  }
  function ready() { return !!(DB && DB.rows.length); }

  /* best FNDDS row for content tokens q; null when not every token is covered (strict) */
  function best(q, strict) {
    if (!ready() || !q.length) return null;
    var uniq = q.filter(function (x, i) { return q.indexOf(x) === i; });
    var content = uniq.filter(function (x) { return !FUNC[x]; });
    if (!content.length) content = uniq;
    var totalW = 0; content.forEach(function (x) { totalW += DB.idf[x] || 3; });
    var top = null, topS = -1e9, topCov = 0;
    for (var i = 0; i < DB.rows.length; i++) {
      var r = DB.rows[i], hitW = 0, hits = 0;
      for (var j = 0; j < content.length; j++) if (r.tok[content[j]]) { hitW += DB.idf[content[j]] || 3; hits++; }
      if (!hits) continue;
      var cov = hitW / totalW;
      var extra = 0;
      for (var t in r.tok) if (uniq.indexOf(t) < 0) extra += WEAK[t] ? 0.08 : 1;
      var headHit = 0; for (var h in r.head) if (uniq.indexOf(h) >= 0) headHit = 1;
      var s = cov * 10 - extra + (headHit ? 0.6 : 0) + (r.nfs ? 0.35 : 0) + (uniq.indexOf('with') < 0 && /\bwith\b/i.test(r.name) ? -0.3 : 0);
      if (s > topS) { topS = s; top = r; topCov = cov; }
    }
    if (!top) return null;
    if (strict && topCov < 0.999) return null;
    if (!strict && topCov < 0.5) return null;
    return top;
  }

  function scale(v, k) { return v.map(function (x, i) { return i === 0 ? Math.round(x * k) : Math.round(x * k * 10) / 10; }); }
  function sum(a, b) { return a.map(function (x, i) { return i === 0 ? x + b[i] : Math.round((x + b[i]) * 10) / 10; }); }
  function rowByName(n) { return DB && DB.byName[String(n).toLowerCase()] || null; }
  /* an FNDDS name, else the best match for the words */
  function resolve(q) {
    var r = rowByName(q); if (r) return r;
    var t = tokens(prep(q)).t; return best(t, true) || best(t, false);
  }
  function defaultFor(t) { var n = DEFAULTS[t.join(' ')]; return n ? rowByName(n) : null; }

  /* \"Potato, baked, peel eaten, with cheese\" -> \"Baked potato with cheese\"; \"Soup, chicken\" -> \"Chicken soup\" */
  var NOISE = /^(raw|nfs|ns as to .*|peel (not )?eaten|skin( \/ coating)? (not )?eaten|lean( and fat)? (only )?eaten|from (restaurant|fast food|pre-cooked|raw|fresh|frozen|canned).*|made with .*|fat added.*|no added fat|whole|cooked|as ingredient|home recipe.*|restaurant|fast food.*|or fast food|puerto rican style|mexican style|nfs\b.*)$/i;
  function pretty(name) {
    var segs = String(name).split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x && !NOISE.test(x); });
    if (!segs.length) return String(name).split(',')[0];
    var headSeg = segs[0], pre = [], post = [];
    segs.slice(1).forEach(function (x) { if (/^(with|in|and|on)\b/i.test(x)) post.push(x); else if (x.split(' ').length <= 2) pre.push(x.toLowerCase()); });
    var hl = headSeg.toLowerCase(), base;
    if (pre.length && /^(fish|beef|pork|lamb|veal|shellfish)$/.test(hl)) base = pre.slice(1).concat(pre[0]).join(' ');   // "Fish, cod, fried" -> "fried cod"
    else if (pre.length && hl === 'potato' && /fries|chips|tots/.test(pre[0])) base = pre.join(' ');               // "Potato, french fries" -> "french fries"
    else base = pre.length ? pre.join(' ') + ' ' + hl : headSeg;
    var out = base + (post.length ? ' ' + post.join(' ') : '');
    out = out.replace(/\s+/g, ' ').trim();
    return out.charAt(0).toUpperCase() + out.slice(1);
  }
  function short(row) { return pretty(row.name).toLowerCase(); }

  function fromRow(r, q) {
    var grams;
    if (q.grams) grams = q.grams;
    else if (q.unit && r.u) grams = Math.round(r.u * (q.count || 1) * (q.size || 1));
    else grams = Math.round(r.g * (q.mult || 1));
    return { name: pretty(r.name), fndds: r.name, grams: grams, v: scale(r.v, grams / r.g), ing: r.ing.length ? r.ing.slice() : [short(r)], how: 'food' };
  }
  function fromDish(d, mult) {
    var v = [0, 0, 0, 0, 0, 0], g = 0, ing = [], ok = 0;
    d.mix.forEach(function (m) {
      var r = resolve(m[0]); if (!r) return;
      ok++; v = sum(v, scale(r.v, m[1] / r.g)); g += m[1];
      (r.ing.length ? r.ing : [short(r)]).forEach(function (x) { if (ing.indexOf(x) < 0) ing.push(x); });
    });
    if (!ok) return null;
    return { name: d.n, grams: Math.round(g * mult), v: scale(v, mult), ing: ing, how: 'dish' };
  }
  function findDish(s) {
    var hit = null, key = '';
    DISHES.forEach(function (d) {
      d.k.forEach(function (k) {
        var fk = prep(k);
        if ((' ' + s + ' ').indexOf(' ' + fk + ' ') >= 0 && fk.length > key.length) { hit = d; key = fk; }
      });
    });
    return hit ? { d: hit, key: key } : null;
  }
  /* a match is clean when the description adds at most one real word the user didn't type */
  function clean(r, t) {
    var extra = 0; for (var x in r.tok) if (t.indexOf(x) < 0 && !WEAK[x]) extra++;
    return extra <= 1;
  }

  /* typical mixed meal, the last resort so nothing is ever blank */
  var GENERIC = { name: 'Mixed meal', grams: 350, v: [500, 22, 55, 20, 5, 8], ing: [], how: 'rough' };

  function one(seg, inMeal) {
    var d = findDish(seg), tk = tokens(seg);
    if (d && d.key === seg) return fromDish(d.d, tk.mult);
    if (inMeal && tk.t.join(' ') === 'chip') tk.t = ['fry'];   // \"steak, egg and chips\": chips are fries in a meal
    var r = defaultFor(tk.t);
    if (r) return fromRow(r, tk);
    r = best(tk.t, true);
    if (r && (clean(r, tk.t) || !d)) return fromRow(r, tk);
    if (d) {   // a known dish plus extra words: \"chicken salad\" -> salad + chicken
      var item = fromDish(d.d, 1), rest = (' ' + seg + ' ').split(' ' + d.key + ' ').join(' ').trim();
      var restT = tokens(rest);
      var extra = restT.t.length ? (defaultFor(restT.t) || best(restT.t, true)) : null;
      if (item && extra && item.ing.indexOf(short(extra)) >= 0) extra = null;   // "currywurst with fries": fries are already in it
      if (item && extra) { var e = fromRow(extra, { mult: 1 }); return { name: item.name + ' + ' + e.name.toLowerCase(), grams: Math.round((item.grams + e.grams) * restT.mult), v: scale(sum(item.v, e.v), restT.mult), ing: item.ing.concat(e.ing), how: 'dish' }; }
      if (item) return { name: item.name, grams: Math.round(item.grams * restT.mult), v: scale(item.v, restT.mult), ing: item.ing, how: 'dish' };
    }
    return r ? fromRow(r, tk) : null;
  }

  function parse(text) {
    var raw = String(text || '').trim();
    if (!raw) return null;
    var s = prep(raw), out = null;
    // 1. the whole text as one dish or food: \"fish and chips\", \"chicken stew\", \"jacket potato with cheese\"
    if (ready()) out = one(s, false);
    // 2. a meal of several parts, summed: \"grilled chicken with rice and broccoli\"
    var segs = s.split(CONNECT).map(function (x) { return x.trim(); }).filter(function (x) { return tokens(x).t.length; });
    if (ready() && segs.length > 1 && (!out || out.how === 'food' && !wholeIsGood(s))) {
      var p = partsOf(segs);
      if (p && (!out || p.parts.length > 1)) out = p;
    }
    // 3. the closest food that shares most of the words
    if (!out && ready()) { var tk = tokens(s), loose = best(tk.t, false); if (loose) out = fromRow(loose, tk); }
    // 4. nothing known: a typical mixed meal, marked rough
    if (!out) out = { name: GENERIC.name, grams: GENERIC.grams, v: GENERIC.v.slice(), ing: [], how: 'rough' };
    return finish(raw, out);
  }
  function wholeIsGood(s) {
    var t = tokens(s).t, r = defaultFor(t) || best(t, true);
    return !!(r && clean(r, t));
  }
  function partsOf(segs) {
    var v = [0, 0, 0, 0, 0, 0], g = 0, ing = [], parts = [], unknown = [];
    segs.forEach(function (seg) {
      var item = one(seg, true);
      if (!item) { unknown.push(seg); return; }
      v = sum(v, item.v); g += item.grams; parts.push({ label: seg, name: item.name, grams: item.grams });
      item.ing.forEach(function (x) { if (ing.indexOf(x) < 0) ing.push(x); });
    });
    if (!parts.length) return null;
    var name = parts.map(function (x) { return x.name; }).join(' + ');
    return { name: name, v: v, grams: g, ing: ing, parts: parts, unknown: unknown, how: parts.length > 1 ? 'parts' : 'food' };
  }
  function finish(raw, o) {
    var v = o.v;
    return {
      query: raw, name: o.name, grams: o.grams, how: o.how,       // how: dish | food | parts | rough
      kcal: Math.round(v[0]), protein: v[1], carbs: v[2], fat: v[3], fiber: v[4], sugar: v[5],
      ingredients: (o.ing || []).slice(0, 8), parts: o.parts || null, unknown: o.unknown || [],
      source: o.how === 'rough' ? 'typical meal' : 'USDA FNDDS', estimated: true
    };
  }
  /* the six macro keys a meal log uses; fills only the ones the user left blank */
  var KEYS = ['protein', 'fiber', 'sugar', 'carbs', 'fat', 'kcal'];
  function fill(macros, est) {
    var m = Object.assign({}, macros || {}), filled = [];
    if (!est) return { macros: m, filled: filled };
    KEYS.forEach(function (k) {
      if (m[k] === null || m[k] === undefined || m[k] === '' || !isFinite(+m[k])) { m[k] = est[k]; filled.push(k); }
    });
    return { macros: m, filled: filled };
  }

  var api = { load: load, ready: ready, parse: parse, fill: fill, tokens: tokens, prep: prep, DISHES: DISHES, DEFAULTS: DEFAULTS, GENERIC: GENERIC, KEYS: KEYS, _best: best, _resolve: resolve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LowiMealDB = api;
})(typeof window !== 'undefined' ? window : this);
