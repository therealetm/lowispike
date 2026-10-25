/* recipe-amounts-core.js: amounts for every Recipe Book recipe, and the one-line "why it's low spike".
 *
 * 25 Oct 2026 (Emmanuel, about a Nibblo meal post): "every ingredient it listed should also be in an ingredient list ...
 * tell us the price, ingredients, how it's prepared, cooked". The e-book lists ingredients without amounts, so the recipe
 * page showed "Chicken" with nothing next to it. These are our amounts for ONE person, in the book's ingredient order.
 * The book's names, prep and steps stay exactly as they are; only an amount is added beside each ingredient.
 *
 * Strings are English; rows() gives [en, de, es] for each one so the app's text translator shows them in DE/ES.
 * Pure data + helpers, no DOM: tests/nibblo-recipe.test.cjs loads it in node. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.LowiRecipeAmounts = api;
    try { if (root.LowiLang && root.LowiLang.add) root.LowiLang.add(api.rows()); } catch (e) {}
  }
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  /* recipe name -> amounts, same order and count as RECIPE_BOOK[i].ing (a test checks every recipe) */
  var AMT = {
    "Nori Smash Burger Stack": ["2 sheets", "150 g", "30 g", "2", "½", "2 tbsp"],
    "Zucchini Turkey Burger Melt": ["1", "150 g", "30 g", "2 tbsp", "2", "½ tsp"],
    "Frischkäse Pepper Pizza Boats": ["1", "50 g", "60 g", "3 tbsp", "80 g", "a pinch"],
    "Konjak Sushi Crunch Bowl": ["200 g", "120 g", "½", "½", "1 sheet", "1 tsp"],
    "Shirataki Carbonara Pull": ["200 g", "1", "100 g", "20 g", "150 g", "a pinch"],
    "Cabbage Egg Okonomiyaki": ["200 g", "2", "100 g", "2", "2 tbsp", "1 sheet"],
    "Tandoori Lettuce Wrap Plate": ["6 leaves", "150 g", "100 g", "½", "a few leaves", "½"],
    "Cauliflower Nacho Smash Tray": ["300 g", "125 g", "30 g", "3 tbsp", "½", "2 tbsp"],
    "Tuna Cucumber Crunch Boats": ["1", "1 can", "2 tbsp", "1 tsp", "1 stalk", "1"],
    "Parmesan Pizza Crisps": ["30 g", "40 g", "2 tbsp", "a pinch", "a pinch"],
    "Halloumi Fry Box": ["80 g", "3 tbsp", "1 tsp", "½", "½"],
    "Cheddar Frischkäse Pepper Melt": ["1", "40 g", "30 g", "a pinch", "a pinch"],
    "Jammy Egg Nori Bites": ["1 sheet", "2", "½", "1 tsp", "1 tsp"],
    "Buffalo Chicken Lettuce Cups": ["4 leaves", "120 g", "2 tbsp", "1 tbsp", "1 stalk", "30 g"],
    "Frozen Yogurt Berry Bark": ["150 g", "50 g", "a drop", "1 tsp", "10 g"],
    "Frischkäse Cheesecake Jars": ["50 g", "100 g", "½ tsp", "a drop", "50 g", "10 g"],
    "Cocoa Cottage Cheese Pudding": ["150 g", "1 tbsp", "a drop", "a pinch", "1 tsp"],
    "Cottage Cheese Pancake Bites": ["100 g", "2", "2 tbsp", "a pinch", "a drop", "50 g"],
    "Chia Cocoa Crunch Cups": ["2 tbsp", "150 g", "1 tsp", "1 tsp", "1 tsp"],
    "Cinnamon Baked Yogurt Custard": ["150 g", "1", "½ tsp", "a drop", "50 g"],
    "Iced Matcha Lime Water": ["1 tsp", "300 ml", "½", "a handful", "a few leaves"],
    "Cucumber Mint Sparkling Water": ["300 ml", "4 slices", "½", "a few leaves", "a handful"],
    "Bitter Green Tea Lime": ["1 bag", "½", "a handful", "a few leaves"],
    "Cold Coffee Cream Float": ["200 ml", "a handful", "2 tbsp", "a pinch"],
    "Hot Ginger Bone Broth": ["300 ml", "2 cm", "a pinch", "½"],
    "Garlic Yogurt Chicken Box": ["4 leaves", "150 g", "80 g", "1", "¼", "3 tbsp", "1 clove", "½ tsp"],
    "Zucchini Ribbon Beef Ragout": ["1", "125 g", "150 g", "½", "1 clove", "a pinch", "15 g"],
    "Cauliflower Egg Wok Fry": ["250 g", "2", "100 g", "2", "1 cm", "1 tbsp"],
    "Shirataki Broth Bowl": ["200 g", "400 ml", "1", "100 g", "60 g", "1", "1 tsp"],
    "Spiced Beef Lettuce Shells": ["6 leaves", "125 g", "1 tsp", "1", "½", "20 g", "2 tbsp"],
    "Smoky Kale Crunch": ["100 g", "1 tsp", "10 g", "a pinch"],
    "Chicken Caesar Lettuce Boats": ["4 leaves", "100 g", "15 g", "2 tbsp", "½", "½ tsp", "½ clove"],
    "Smoked Salmon Cucumber Bites": ["1", "80 g", "40 g", "a few sprigs", "¼"],
    "Espresso Cottage Cream Cups": ["100 g", "30 g", "2 tbsp", "1 tsp", "a drop"],
    "Lemon Ricotta Berry Cups": ["80 g", "80 g", "½ tsp", "60 g", "10 g"],
    "Strawberry Skyr Freeze Pops": ["200 g", "100 g", "a drop"],
    "Ginger Lemon Fizz": ["300 ml", "2 cm", "½", "a few leaves", "a handful"],
    "Iced Cardamom Spice Tea": ["1 bag", "3 pods", "½ tsp", "2 cm", "2 tbsp", "a handful"]
  };
  /* unit word -> [de singular, de plural, es singular, es plural] */
  var UNIT = {
    sheet: ["Blatt", "Blätter", "lámina", "láminas"], sheets: ["Blatt", "Blätter", "lámina", "láminas"],
    leaves: ["Blatt", "Blätter", "hoja", "hojas"],
    tbsp: ["EL", "EL", "cucharada", "cucharadas"], tsp: ["TL", "TL", "cucharadita", "cucharaditas"],
    can: ["Dose", "Dosen", "lata", "latas"], stalk: ["Stange", "Stangen", "rama", "ramas"],
    slices: ["Scheibe", "Scheiben", "rodaja", "rodajas"], bag: ["Beutel", "Beutel", "bolsita", "bolsitas"],
    clove: ["Zehe", "Zehen", "diente", "dientes"], pods: ["Kapsel", "Kapseln", "vaina", "vainas"],
    g: ["g", "g", "g", "g"], ml: ["ml", "ml", "ml", "ml"], cm: ["cm", "cm", "cm", "cm"]
  };
  var PHRASE = {
    "a pinch": ["eine Prise", "una pizca"], "a drop": ["ein Tropfen", "unas gotas"], "a handful": ["eine Handvoll", "un puñado"],
    "a few leaves": ["ein paar Blätter", "unas hojas"], "a few sprigs": ["ein paar Zweige", "unas ramitas"]
  };
  function L(l) { return l === "de" || l === "es" ? l : "en"; }
  /* "2 tbsp" -> "2 EL" / "2 cucharadas"; plain numbers and fractions stay as they are */
  function loc(en, lang) {
    var l = L(lang), s = String(en || "");
    if (l === "en" || !s) return s;
    if (PHRASE[s]) return PHRASE[s][l === "de" ? 0 : 1];
    var m = s.match(/^([0-9]+|½|¼|¾)(?: (.+))?$/);
    if (!m) return s;
    if (!m[2]) return m[1];
    var u = UNIT[m[2]]; if (!u) return s;
    var many = /^[0-9]+$/.test(m[1]) && +m[1] > 1;
    return m[1] + " " + u[(l === "de" ? 0 : 2) + (many ? 1 : 0)];
  }
  function q(name, i) { var a = AMT[name]; return a && a[i] != null ? a[i] : ""; }
  function all() { var out = []; Object.keys(AMT).forEach(function (k) { AMT[k].forEach(function (s) { if (out.indexOf(s) < 0) out.push(s); }); }); return out; }
  function rows() { return all().filter(function (s) { return loc(s, "de") !== s || loc(s, "es") !== s; }).map(function (s) { return [s, loc(s, "de"), loc(s, "es")]; }); }

  /* the spike line on a Recipe Book recipe: the label and the plain reason, from the recipe's own rating and ingredients */
  var PROT = { hack: 1, huhn: 1, eier: 1, kaese: 1, milch: 1 };
  var TXT = {
    low: ["Low spike", "Kleiner Spike", "Pico bajo"],
    some: ["Now and then", "Ab und zu", "De vez en cuando"],
    prot: ["Protein: {p}. No bread, rice, pasta or sugar, so your blood sugar should stay steady.",
      "Eiweiß: {p}. Kein Brot, kein Reis, keine Nudeln, kein Zucker, so bleibt dein Blutzucker ruhig.",
      "Proteína: {p}. Sin pan, arroz, pasta ni azúcar, así tu azúcar en sangre se mantiene estable."],
    plain: ["No sugar, syrup or sweetener, so it won't push your blood sugar up.",
      "Kein Zucker, kein Sirup, kein Süßstoff, so treibt es deinen Blutzucker nicht hoch.",
      "Sin azúcar, sirope ni edulcorante, así no dispara tu azúcar en sangre."],
    selten: ["Very few carbs, but a lot of cheese, so keep it for now and then.",
      "Kaum Kohlenhydrate, aber viel Käse, also lieber ab und zu.",
      "Casi sin carbohidratos, pero mucho queso, así que mejor de vez en cuando."],
    and: [" and ", " und ", " y "]
  };
  function idx(l) { return l === "de" ? 1 : l === "es" ? 2 : 0; }
  /* r: {r:'ja'|'selten', ing:[{n, g}]}; name(n) translates an ingredient name (LowiLang.t in the app) */
  function spike(r, lang, name) {
    var l = L(lang), k = idx(l), tn = typeof name === "function" ? name : function (n) { return n; };
    if (!r) return null;
    if (r.r === "selten") return { lvl: "mid", label: TXT.some[k], why: TXT.selten[k] };
    var p = (r.ing || []).filter(function (i) { return PROT[i.g] && !/^milk$/i.test(i.n); }).map(function (i) {
      var n = String(tn(i.n) || i.n); return l === "de" ? n : n.charAt(0).toLowerCase() + n.slice(1);
    }).filter(function (n, j, a) { return a.indexOf(n) === j; });
    var list = p.length > 1 ? p.slice(0, -1).join(", ") + TXT.and[k] + p[p.length - 1] : (p[0] || "");
    return { lvl: "low", label: TXT.low[k], why: p.length ? TXT.prot[k].replace("{p}", list) : TXT.plain[k] };
  }
  return { AMT: AMT, q: q, loc: loc, rows: rows, all: all, spike: spike };
});
