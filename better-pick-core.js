/* LOWiSPIKE Better pick: same kind of food only (Mon 26 Oct 2026, MAYA-HANDOFF 0.30)
 * Emmanuel scanned K-Classic "Mandeln Stifte" (slivered almonds) and the card's Better pick was a jar of
 * Paliria "Eggplants in Onion & Tomato Sauce". His words: "Why didn't it just recommend me a better version, an
 * alternative of what I'm trying to find here?" Root cause: nameSwap()'s last fallback took ANY community product
 * rated Lower whose coarse category matched, and "other" is the catch-all, so almonds (other) got eggplant sauce
 * (other). This pure module decides WHAT KIND of food something is (from its name in EN/DE/ES, a few category
 * words, and only a few safe coarse categories), which kinds may stand in for which, and picks the best REAL
 * product of an allowed kind that is rated strictly better. No allowed kind, nothing better: no Better pick.
 * It never makes a product up and never falls back to "anything rated Lower".
 * Pure: no DOM, no storage. Loaded as window.LowiBetterPick and by node tests via require(). */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LowiBetterPick = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  // Lower case, accents and umlauts folded (ü -> u, ß -> ss), punctuation to spaces.
  function fold(s) {
    return String(s == null ? "" : s).toLowerCase().replace(/ß/g, "ss")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9%]+/g, " ").replace(/\s+/g, " ").trim();
  }

  // Ordered: the FIRST kind whose words appear in a product name wins, so "Haselnuss Schokolade" is chocolate,
  // "Mandelmilch" is a plant milk, "Erdnussflips" a salty snack and "Schoko Müsli" a cereal, not nuts.
  // All patterns run on folded text (no umlauts): kase = Käse, musli = Müsli, nusse = Nüsse.
  const KINDS = [
    ["plant_milk", /(mandel|hafer|soja|reis|kokos|cashew|erbsen|almond|oat|soy|rice|coconut)\s?(milch|drink|milk)\b|\b(leche|bebida)( vegetal)? de (almendras?|avena|soja|arroz|coco)\b/],
    ["sweet_spread", /nutella|nocilla|nuss ?nougat|nougat ?creme|haselnuss ?creme|schoko ?creme|schoko ?aufstrich|chocolate spread|hazelnut spread|cocoa spread|crema de cacao|dulce de leche/],
    ["nut_spread", /(erdnuss|mandel|cashew|haselnuss|nuss)\s?(butter|mus)\b|\b(peanut|almond|cashew|hazelnut|nut) (butter|spread)\b|\btahin[ia]?\b|\bcrema de (cacahuetes?|cacahuate|almendras?)\b|\bmantequilla de (mani|cacahuetes?)\b/],
    ["drink", /\b(cola|fanta|sprite|eistee|ice ?tea|iced tea|energy ?drinks?|refrescos?|soda|tonic|smoothies?|nektar|nectar|juices?|zumos?|schorle|tee|tea|kaffee|coffee|cafe|bier|beer|wein|wine|getranke?|bebidas?|beverages?|drinks?)\b|\blimo(nade|nada|s)?\b|saft\b|wasser\b|\bwater\b|\bagua\b/],
    ["milk", /^(?!.*(schokolade|chocolate|chocolat|reis\b|milchreis)).*(\bmilch\b|vollmilch\b|frischmilch|\bh ?milch|buttermilch|\bmilk\b|\bleche\b|kakao ?getrank)/],
    ["yogurt", /milchreis|pudding|\bnatillas\b|joghurt|jogurt|yogh?urt|\byogur|\bskyr\b|\bquark\b|\bkefir\b|\bfage\b|griechischer joghurt/],
    ["ice_cream", /\beis\b|eiscreme|speiseeis|ice ?cream|\bgelato\b|\bhelados?\b|\bsorbet|\bmagnum\b/],
    ["cereal", /musli|muesli|granola|corn ?flakes|porridge|haferflocken|\boats\b|oatmeal|\bavena\b|copos de|cereal|cerealien|\bflakes\b|krispies|\bpops\b|smacks|frosties|chocapic|\bloops\b/],
    ["bar", /riegel|\bbars?\b|\bbarritas?\b/],
    ["biscuit", /\bkeks|kekse|cookie|biscuit|biscotti|waffel|wafer|zwieback|brownie|muffin|kuchen|\bcakes?\b|cupcake|donut|doughnut|croissant|galletas?|bizcocho|magdalena|lebkuchen|spekulatius|leibniz|oreo|hanuta|knoppers|\btorte|geback|gebaeck|strudel|churros|pancake|pfannkuchen|crepe/],
    ["candy", /haribo|gummi|gummy|fruchtgummi|weingummi|lakritz|licorice|liquorice|maoam|skittles|bonbon|\bcand(y|ies)\b|gominolas?|chuches|golosinas?|marshmallow|mentos|lolli|lutscher|caramelos?|jelly beans?/],
    ["choc", /schokolade|\bschoko|chocolate|chocolat|\bchoco\b|pralinen?|milka|ritter sport|kinder|snickers|\bmars\b|twix|bounty|kit ?kat|toblerone|lindt|lindor|ferrero|raffaello|duplo|\bmerci\b|bombones|turron|marzipan|mazapan/],
    ["cheese", /kase|cheese|\bquesos?\b|gouda|emmentaler|cheddar|mozzarella|parmesan|parmigiano|\bfeta\b|camembert|\bbrie\b|halloumi|ricotta|mascarpone|grana padano|manchego|edamer/],
    ["bread", /brot|bread|toast|baguette|bagel|ciabatta|\bwraps?\b|\bpan\b|pan de molde|panecillo|\bsemmel|\bbuns?\b|brioche|focaccia|\bpita\b|\bnaan\b|tortillas? de trigo|\bknacke/],
    ["salty_snack", /chips|crisps|pringles|flips|popcorn|palomitas|nachos|reiswaffel|maiswaffel|rice cakes?|tortitas de (arroz|maiz)|cracker|salzstangen|salzbrezel|brezel|pretzel|knabber|saltletts|cheetos|doritos|patatas fritas|grissini|snack mix/],
    ["pasta", /nudel|pasta|spaghetti|penne|fusilli|farfalle|tagliatelle|linguine|maccheroni|macaroni|makkaroni|lasagne|lasana|gnocchi|noquis|tortellini|ravioli|espaguetis?|macarrones|fideos|spatzle|\bramen\b|\budon\b|\bsoba\b|shirataki|glass noodles|noodles/],
    ["rice", /\breis\b|\breis |basmati|jasmin|risotto|\brice\b|\barroz\b|couscous|cuscus|bulgur|quinoa/],
    ["potato", /kartoffel|potato|patatas?\b|pommes|\bfries\b|rosti|kroketten|croquetas/],
    ["flour", /mehl\b|\bflour\b|harina|starke\b|backmischung|baking mix/],
    ["oil", /^(?!.*\b(in|mit|en|con)\b \S*\s?(ol|oil|aceite)\b)(?:.*)(\bol\b|olivenol|rapsol|sonnenblumenol|kokosol|\boils?\b|aceite|\bbutter\b|margarine|\bghee\b|schmalz)/],
    ["nuts", /mandel|almond|almendra|\bnuss|nusse|nusskern|\bnuts?\b|\bnueces\b|\bnuez\b|frutos secos|walnuss|walnut|haselnuss|hazelnut|avellana|cashew|anacardo|pistazie|pistachio|pistacho|erdnuss|peanut|cacahuete|cacahuate|\bmani\b|pecan|macadamia|paranuss|brazil nut|pinienkern|pine nut|pinones?|\bkerne\b|\bsamen\b|\bseeds?\b|semillas|\bpipas\b|sonnenblumenkern|sunflower seed|kurbiskern|pumpkin seed|\bchia\b|chiasamen|leinsamen|linaza|flax|\bsesam|sesame|hanfsamen|hemp seed|studentenfutter|trail mix|nussmix|nut mix/],
    ["jam", /marmelade|konfiture|\bjams?\b|fruchtaufstrich|mermelada|confitura|\bhonig\b|\bhoney\b|\bmiel\b|sirup|syrup|sirope/],
    ["sugar", /\bzucker\b|\bsugar\b|azucar|sussstoff|sweetener|edulcorante|stevia|erythrit/],
    ["dish", /\b(in|mit|en|con)\b.*\b(sauce|sosse|salsa)\b|suppe|\bsoups?\b|\bsopas?\b|eintopf|\bstew\b|\bcurry\b|chili con carne|fertiggericht|ready meal|moussaka|gemuse ?pfanne/],
    ["sauce", /sosse|\bsauce|\bsalsa\b|ketchup|pesto|dressing|\bmayo|mayonesa|\bsenf\b|mustard|mostaza|\bbbq\b|aioli|remoulade|passata|tomatenmark|\bsugo\b|teriyaki/],
    ["meat", /fleisch|\bmeat|\bcarne\b|hahnchen|huhnchen|chicken|\bpollo\b|\bpute|truthahn|turkey|\bpavo\b|\brind|\bbeef\b|ternera|schwein|\bpork\b|\bcerdo\b|schinken|\bham\b|jamon|salami|wurst|sausage|salchicha|chorizo|\bspeck\b|bacon|\bhack|\bmince|steak/],
    ["fish", /fisch|\bfish\b|pescado|\blachs|salmon|thunfisch|\btuna\b|\batun\b|hering|herring|makrele|mackerel|sardin|forelle|trout|garnele|shrimp|gambas?\b|krabben|kabeljau|\bcod\b|bacalao|seelachs|surimi/],
    ["eggs", /\beier?\b|\beggs?\b|\bhuevos?\b/],
    ["legumes", /bohnen|\bbeans?\b|linsen|lentils?|lentejas?|kichererbse|chickpeas?|garbanzos?|\berbsen\b|\bpeas\b|edamame|\btofu\b|tempeh|alubias|judias|frijoles/],
    ["veg", /gemuse|vegetables?|\bveg\b|veggie|verduras?|aubergine|eggplant|berenjena|zucchini|calabacin|brokkoli|broccoli|blumenkohl|cauliflower|spinat|spinach|espinacas?|tomate|tomato|gurke|cucumber|pepino|paprika|\bpeppers?\b|pimientos?|karotte|mohre|carrot|zanahoria|zwiebel|onion|cebolla|\bkohl|cabbage|\bsalat|lettuce|lechuga|pilze|champignon|mushroom|setas?\b|spargel|asparagus|esparragos?|kurbis|pumpkin|calabaza|\boliven\b|\bolives?\b|aceitunas?/],
    ["fruit", /apfel|apple|manzana|banane|banana|platano|beere|berry|berries|erdbeer|strawberr|fresas?\b|himbeer|raspberr|heidelbeer|blaubeer|blueberr|arandanos?|traube|grapes?\b|\buvas?\b|\borangen?\b|naranjas?|zitrone|lemons?\b|\blimon\b|\bkiwi|\bmango|ananas|pineapple|birne|\bpears?\b|\bperas?\b|pfirsich|peach|melocoton|melone|\bmelon|kirsch|cherr|cerezas?|pflaume|\bplums?\b|ciruelas?|\bobst\b|\bfruits?\b|\bfrutas?\b|datteln|\bdates\b|datiles|rosinen|raisins|\bpasas\b|feigen|\bfigs\b|aprikose|apricot|albaricoque|cranberr/]
  ];
  const KIND_IDS = KINDS.map(k => k[0]);

  // Which kinds may stand in for which. A kind not listed here (or no kind at all) gets no Better pick.
  // Same kind first; only a few same-use neighbours (crisps -> nuts as a salty crunchy snack, cow's milk <-> plant milk).
  const ALT = {
    nuts: ["nuts"], salty_snack: ["salty_snack", "nuts"], choc: ["choc"], biscuit: ["biscuit"], candy: ["candy"],
    bar: ["bar"], ice_cream: ["ice_cream"], cereal: ["cereal"], bread: ["bread"], pasta: ["pasta"], rice: ["rice"],
    potato: ["potato"], yogurt: ["yogurt"], cheese: ["cheese"], milk: ["milk", "plant_milk"], plant_milk: ["plant_milk", "milk"],
    drink: ["drink"], sweet_spread: ["sweet_spread", "nut_spread"], nut_spread: ["nut_spread"], jam: ["jam"], sugar: ["sugar"],
    dish: ["dish"], sauce: ["sauce"], legumes: ["legumes"], veg: ["veg"], fruit: ["fruit"], meat: ["meat"], fish: ["fish"],
    eggs: ["eggs"], flour: ["flour"], oil: ["oil"]
  };

  // Coarse app categories are only trusted where they already name one kind. "other", "snack", "sweets",
  // "dairy" and "staple" are far too broad (the eggplant bug), so they say nothing on their own.
  const CAT_KIND = { cereal: "cereal", bread: "bread", drink: "drink" };

  // Category tags too generic to read ("plant-based foods and beverages" would otherwise read as a drink).
  const GENERIC_TAG = /plant based foods|foods and beverages|^(en|de|es|fr) (snacks|groceries|food|foods)$|sweet snacks|salty snacks|^.{0,3}$/;

  function kindOfText(text) {
    const t = " " + fold(text) + " ";
    if (!t.trim()) return null;
    for (const [id, re] of KINDS) if (re.test(t)) return id;
    return null;
  }

  // The kind of a product (or of a plain name). Name first; then the generic name and specific category tags;
  // then only the few coarse categories that name one kind. Brand is never read ("K-Classic" says nothing).
  function kindOf(p) {
    if (p == null) return null;
    if (typeof p === "string") return kindOfText(p);
    const byName = kindOfText(p.name || p.n || p.product_name || "");
    if (byName) return byName;
    const byGeneric = kindOfText(p.generic || p.generic_name || "");
    if (byGeneric) return byGeneric;
    const tags = [].concat(p.tags || p.categories_tags || []).map(fold).filter(t => t && !GENERIC_TAG.test(t));
    for (let i = tags.length - 1; i >= 0; i--) { const k = kindOfText(tags[i]); if (k) return k; }
    return CAT_KIND[p.cat] || null;
  }

  // Every kind named in the HEAD of an idea text ("Lettuce wraps", "Crunch plate: roasted almonds, ...",
  // "Plain skyr with nuts and berries"): the part before ":" when it names a food, else the first item after it,
  // cut at ",", "with", "mit", "con", "and", "und", "y", "or", "oder", "o". Used to check meal-engine swaps and the
  // little idea chips, so "Snack board: boiled eggs, cheese, ... walnuts" counts as eggs, not as nuts.
  function headKinds(text) {
    const raw = String(text == null ? "" : text);
    const parts = raw.split(":");
    const cut = s => fold(String(s).split(/[,;(·•]/)[0]).split(/\b(?:with|mit|con|and|und|y|or|oder|o|plus)\b/)[0];
    const kindsIn = s => { const t = " " + s + " "; return KINDS.filter(k => k[1].test(t)).map(k => k[0]); };
    let ks = kindsIn(cut(parts[0]));
    if (!ks.length && parts.length > 1) ks = kindsIn(cut(parts.slice(1).join(":")));
    return ks;
  }

  function allowedFor(p) {
    const k = kindOf(p);
    return k && ALT[k] ? ALT[k].slice() : [];
  }

  // May `cand` (a product or a name) stand in for `scanned`? Both need a kind, and the candidate's kind must be
  // one the scanned kind allows.
  function canReplace(scanned, cand) {
    const allow = allowedFor(scanned);
    if (!allow.length) return false;
    const ck = kindOf(cand);
    return !!ck && allow.indexOf(ck) >= 0;
  }

  // May an idea text (a meal-engine swap or an idea chip) stand in for `scanned`? Any kind in its head counts.
  function ideaFits(scanned, text) {
    const allow = allowedFor(scanned);
    if (!allow.length) return false;
    return headKinds(text).some(k => allow.indexOf(k) >= 0);
  }

  // 0 = Lower (ok), 1 = Moderate (better), 2 = Likely spike (spike); null = not rated.
  const RANK = { ok: 0, ja: 0, none: 0, JA: 0, better: 1, selten: 1, mild: 1, SELTEN: 1, spike: 2, nein: 2, NEIN: 2 };
  function rankOf(v) {
    if (v == null) return null;
    if (typeof v === "object") v = v.verdict;
    return Object.prototype.hasOwnProperty.call(RANK, v) ? RANK[v] : null;
  }

  function sameItem(a, b, pkey) {
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.barcode && b.barcode && String(a.barcode) === String(b.barcode)) return true;
    if (pkey) { try { if (pkey(a) && pkey(a) === pkey(b)) return true; } catch (e) { /* ignore */ } }
    return fold(a.name) !== "" && fold(a.name) === fold(b.name) && fold(a.brand) === fold(b.brand);
  }

  // Does a product look like it is sold where the user shops? Products carry an optional country / countries
  // string (Open Food Facts). Region is the Supermarket region (eu, uk, us, ww) or a country word.
  // Unknown says nothing (0); a match is preferred (1).
  const REGION_WORDS = {
    eu: ["germany", "deutschland", "alemania", "austria", "osterreich", "switzerland", "schweiz", "france", "spain", "espana",
      "italy", "italia", "netherlands", "belgium", "denmark", "danemark", "poland", "portugal", "greece", "griechenland", "grecia", "sweden", "finland", "ireland",
      "czech republic", "hungary", "romania", "croatia", "luxembourg", "european union", "europe"],
    uk: ["united kingdom", "uk", "england", "great britain", "scotland", "wales"],
    us: ["united states", "usa", "us"]
  };
  function inRegion(prod, region) {
    const r = fold(region);
    if (!r || r === "ww") return 0;
    const words = REGION_WORDS[r] || [r];
    const have = " " + fold([].concat(prod.country || prod.countries || prod.countries_tags || []).join(" ")) + " ";
    if (!have.trim()) return 0;
    return words.some(w => have.indexOf(" " + w + " ") >= 0) ? 1 : 0;
  }

  // All real products that may be the Better pick for `scanned`, best first. Needs: an allowed kind, a rating
  // strictly better than the scanned one, not the scanned product itself. opts: { level (scanned verdict or rank),
  // pkey, region, rate (product -> verdict/rank, defaults to product.verdict) }.
  function candidates(scanned, products, opts) {
    opts = opts || {};
    const allow = allowedFor(scanned);
    if (!allow.length) return [];
    const lvl = rankOf(opts.level != null ? opts.level : scanned && scanned.verdict);
    if (lvl == null || lvl === 0) return []; // already Lower (or not rated): no Better pick
    const list = Array.isArray(products) ? products : Object.values(products || {});
    const out = [];
    list.forEach((prod, i) => {
      if (!prod || typeof prod !== "object" || !(prod.name || "").trim()) return;
      if (sameItem(scanned, prod, opts.pkey)) return;
      const r = rankOf(opts.rate ? opts.rate(prod) : prod.verdict);
      if (r == null || r >= lvl) return;
      const k = kindOf(prod);
      if (!k || allow.indexOf(k) < 0) return;
      out.push({ prod, r, same: k === allow[0] ? 1 : 0, reg: inRegion(prod, opts.region), i });
    });
    out.sort((a, b) => (b.reg - a.reg) || (b.same - a.same) || (a.r - b.r) || (a.i - b.i));
    const seen = new Set();
    return out.filter(o => { const key = fold(o.prod.name) + "|" + fold(o.prod.brand); if (seen.has(key)) return false; seen.add(key); return true; }).map(o => o.prod);
  }

  function best(scanned, products, opts) {
    return candidates(scanned, products, opts)[0] || null;
  }

  return { fold, kindOf, headKinds, allowedFor, canReplace, ideaFits, rankOf, inRegion, candidates, best, KIND_IDS, ALT };
});
