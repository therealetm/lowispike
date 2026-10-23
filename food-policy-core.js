/* LOWiSPIKE Food Intelligence Engine: JA / SELTEN / NEIN policy (queue step scanfe-d, spec queue/FOOD-ENGINE-SPEC.md
   sections 2, 8, 9). Pure, node-testable UMD module: window.LowiFoodPolicy. Loaded after ingredient-core.js and before
   food-engine-core.js.

   The rules live in data/food-policy/lowispike-policy.v1.json (versioned, auditable). The copy between the POLICY-JSON
   markers below is generated from that file by `node scripts/sync-policy.cjs` so the app needs no fetch;
   tests/food-policy.test.cjs fails when the two differ.

   applyPolicy({product, ingredients, glucose, serving, profile}) collects every matching rule and returns the strictest
   verdict, named by the earliest stage in the priority order safety > medical > policy > quality > glucose. JA only comes
   from a JA rule; protein, claims and scores never lift a NEIN; without a JA rule the best a product gets is SELTEN. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiFoodPolicy = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    /*POLICY-JSON*/const POLICY_JSON = {"version":"lowispike-policy.v1","date":"2026-10-22","source":"queue/FOOD-ENGINE-SPEC.md section 8 (and 2, 3, 9). The Master Knowledge document is not in the repo yet (queue step scanfe-policy-doc), so these rules follow the spec and are not expert-reviewed.","expertReviewed":false,"verdicts":{"JA":"Standard choice in normal amounts","SELTEN":"Occasional, small amounts, context-dependent","NEIN":"Not recommended as a regular choice"},"priority":["safety","medical","policy","quality","glucose","cravings","satiety","alternative"],"combine":"The strictest verdict of all matching rules wins; ties are named by the earliest stage in priority. JA only comes from a JA rule. Nothing (protein, fibre, fat, a claim or a score) can lift a safety, medical or policy NEIN. Without a JA rule a product is at best SELTEN.","defaults":{"noRule":"SELTEN","portionG":{"nuts":30,"cheese":30}},"categories":{"eggs":{"name":"\\beier?\\b|\\begg|vollei|hühnerei|huevos?\\b|œufs?","off":["en:eggs","en:chicken-eggs"]},"poultry":{"name":"hähnchen|haehnchen|hühnchen|huhn|chicken|pute|puten|truthahn|turkey|pollo|pavo|geflügel|poultry","off":["en:poultries","en:chickens","en:turkeys"]},"lean_beef":{"name":"rindersteak|rinderfilet|rinderhüfte|beef steak|lean beef|ternera|rinderhack|tatar","off":["en:beef","en:beef-meat"]},"fish":{"name":"lachs|salmon|kabeljau|\\bcod\\b|forelle|trout|seelachs|thunfisch|tuna|makrele|mackerel|hering|pescado|fischfilet|fish fillet","off":["en:fishes","en:fresh-fish"]},"nonstarchy_veg":{"name":"brokkoli|broccoli|spinat|spinach|zucchini|paprika|gurke|cucumber|salat|lettuce|blumenkohl|cauliflower|grüne bohnen|green beans|champignon|pilze|mushroom|kohl\\b|rotkohl|tomate|tomato|aubergine|spargel|asparagus|verdura|espinaca","off":["en:vegetables","en:fresh-vegetables","en:leaf-vegetables"]},"plain_yoghurt_quark":{"name":"naturjoghurt|joghurt natur|griechischer joghurt|greek yog|plain yog|natural yog|magerquark|speisequark|\\bquark\\b|skyr natur|\\bskyr\\b|yogur natural","off":["en:plain-yogurts","en:quark","en:greek-style-yogurts"]},"unsweetened_drink":{"name":"mineralwasser|\\bwasser\\b|water|agua|\\btee\\b|\\btea\\b|kräutertee|grüntee|kaffee|coffee|espresso|café","off":["en:waters","en:teas","en:coffees","en:unsweetened-beverages"]},"whole_food_fat":{"name":"olivenöl|olive oil|aceite de oliva|avocado|aguacate","off":["en:olive-oils","en:avocados"]},"nuts":{"name":"nüsse|nuesse|\\bnuts?\\b|nuss|mandeln|almonds?|erdnüsse|peanuts?|cashew|pistazien|walnuss|walnut|haselnüsse|hazelnuts?|macadamia|pekan|pecan|almendras?|cacahuetes?","off":["en:nuts","en:peanuts","en:almonds","en:nuts-and-their-products"]},"cheese":{"name":"käse|kaese|cheese|gouda|emmentaler|cheddar|parmesan|mozzarella|feta|queso","off":["en:cheeses"]},"legumes":{"name":"linsen|lentils?|kichererbsen|chickpeas?|bohnen|beans\\b|hummus|lentejas|garbanzos|edamame","off":["en:legumes","en:pulses"]},"sweet_potato":{"name":"süßkartoffel|suesskartoffel|sweet potato|batata|boniato","off":["en:sweet-potatoes"]},"protein_product":{"name":"high[- ]?protein|protein|eiweiß|eiweiss|proteína","off":["en:protein-bars","en:protein-powders","en:dietary-supplements"]},"processed_meat":{"name":"wurst|würstchen|aufschnitt|nugget|cordon bleu|paniert|breaded|frikadelle|leberkäse|sausage","off":["en:sausages","en:prepared-meats"]},"sugar_drink":{"name":"\\bcola\\b|limonade|lemonade|\\bsoda\\b|eistee|ice tea|iced tea|energy|fanta|sprite|brause|softdrink|soft drink|refresco|smoothie|milchshake|milkshake","off":["en:sodas","en:sweetened-beverages","en:colas","en:energy-drinks","en:iced-teas","en:smoothies"]},"juice":{"name":"saft\\b|säfte|juice|zumo|jugo|nektar|nectar|schorle","off":["en:fruit-juices","en:juices-and-nectars","en:fruit-nectars"]},"candy_dessert":{"name":"pudding|dessert|postre|schokolade|chocolate|chocolat|bonbon|candy|gummibär|fruchtgummi|weingummi|lakritz|keks|kekse|cookie|biscuit|kuchen|cake|torte|waffel|\\beis\\b|eiscreme|ice cream|helado|praline|schokoriegel|müsliriegel|marzipan|nougat|creme brulee|mousse|tiramisu|donut|muffin|croissant","off":["en:desserts","en:puddings","en:candies","en:confectioneries","en:chocolates","en:biscuits","en:cakes","en:ice-creams","en:sweet-snacks"]},"starch_rice":{"name":"\\breis\\b|basmati|jasmin|risotto|milchreis|\\brice\\b|\\barroz\\b","off":["en:rices","en:rice"]},"starch_bread":{"name":"brot\\b|brötchen|broetchen|toast|bread|baguette|ciabatta|semmel|wrap|tortilla|\\bpan\\b|pita|bagel|knäckebrot|zwieback","off":["en:breads","en:sliced-breads","en:toasts"]},"starch_pasta":{"name":"spaghetti|nudeln|pasta|penne|fusilli|farfalle|tagliatelle|lasagne|makkaroni|macaroni|maccheroni|spätzle|gnocchi|noodles","off":["en:pastas","en:noodles"]},"starch_potato":{"name":"kartoffel(?!chips)|potato(?!.?chips)|pommes|fries|patata|kroketten|kartoffelpüree|rösti","off":["en:potatoes","en:french-fries"]},"breakfast_cereal":{"name":"cornflakes|cerealien|cereal|müsli|muesli|granola|crunchy|choco pops|cereales","off":["en:breakfast-cereals"]},"chips_snack":{"name":"chips|crisps|flips|cracker|salzstangen|brezel|pretzel|popcorn|nachos|tortilla chips|patatas fritas","off":["en:chips-and-fries","en:crisps","en:salty-snacks","en:appetizers"]},"sweet_sauce":{"name":"ketchup|bbq|barbecue|chilisauce süß|sweet chili|teriyaki|honig-senf|sirup|syrup|marmelade|konfitüre|jam\\b|aufstrich|nutella","off":["en:ketchup","en:barbecue-sauces","en:sweet-spreads","en:jams","en:syrups"]},"coated_nuts":{"name":"honig[- ]?mantel|gebrannt|kandiert|candied|glasiert|glazed|karamell|caramel|schoko[- ]?(mandeln|nüsse|erdnüsse)|dragee|honey roasted|garrapiñad","off":["en:coated-nuts","en:candied-nuts"]},"sweet_salty":{"name":"süß\\s*(&|und|-)\\s*salzig|suess\\s*(&|und)\\s*salzig|sweet\\s*(&|and|n)\\s*salty|dulce y salado|studentenfutter|trail mix|nussmix|genuss[- ]?mix","off":["en:trail-mixes"]},"pork":{"name":"schwein|pork|cerdo|speck\\b|bacon|salam[ei]|chorizo|mortadella|leberwurst","off":["en:pork","en:pork-and-its-products","en:pork-meat","en:salamis","en:hams"]},"alcohol":{"name":"\\bbier\\b|\\bbeer\\b|\\bwein\\b|\\bwine\\b|wodka|vodka|whisk(e)?y|\\brum\\b|likör|liqueur|gin\\b|sekt|prosecco|champagner|cerveza|\\bvino\\b","off":["en:alcoholic-beverages","en:beers","en:wines","en:spirits"]}},"thresholds":{"sugarHeavySolidPer100":15,"sugarDrinkPer100ml":2.5,"unsweetenedSugarMaxPer100":0.5,"plainYoghurtSugarMaxPer100":6},"rules":[{"id":"safety.allergen","stage":"safety","verdict":"NEIN","when":"one of the user's allergens is in the ingredients","why":"Contains {0}, which is on your allergy list"},{"id":"safety.allergen_unknown","stage":"safety","verdict":"SELTEN","when":"the user has allergies and the ingredients are missing or unreadable","why":"Ingredients missing, so your allergens cannot be ruled out"},{"id":"medical.avoid","stage":"medical","verdict":"NEIN","when":"a category on the user's medical/avoid list matches","why":"On your avoid list ({0})"},{"id":"policy.pork","stage":"policy","verdict":"NEIN","when":"pork: category, name or ingredient","why":"Pork product"},{"id":"policy.alcohol","stage":"policy","verdict":"NEIN","when":"alcohol: category, name or ingredient","why":"Alcoholic drink or alcohol inside"},{"id":"policy.sugar_drink","stage":"policy","verdict":"NEIN","when":"a drink with added sugar or at least sugarDrinkPer100ml sugar per 100 ml, or a soft drink / smoothie category","why":"Sugary drink: liquid sugar hits fast"},{"id":"policy.juice","stage":"policy","verdict":"NEIN","when":"fruit juice, nectar or juice spritzer","why":"Juice is liquid sugar, even without added sugar"},{"id":"policy.zero_drink","stage":"policy","verdict":"NEIN","when":"a drink sweetened with sweeteners (Zero/light soft drinks) as a habitual replacement","why":"Sweetened 'zero' drink: keeps the sweet habit going"},{"id":"policy.candy_dessert","stage":"policy","verdict":"NEIN","when":"candy, chocolate, biscuits, cakes, ice cream, puddings and other conventional sweet desserts (sweetened high-protein desserts included)","why":"Sweets or sweet dessert"},{"id":"policy.sugar_heavy","stage":"policy","verdict":"NEIN","when":"a solid food with at least sugarHeavySolidPer100 g sugar per 100 g and added sugar (or no ingredient list to prove otherwise); fruit, plain dairy and dried-fruit-only lists excluded","why":"Sugar-heavy ({0} g sugar per 100 g), treated like sweets"},{"id":"policy.coated_nuts","stage":"policy","verdict":"NEIN","when":"nuts with a sugar/honey/chocolate coating, or nuts with added sugar in the first three ingredients","why":"Sugar-coated nuts"},{"id":"policy.starch_staple","stage":"policy","verdict":"NEIN","when":"rice, bread (whole-grain too), regular pasta, potatoes, breakfast cereals","why":"Starchy staple: a large load of fast carbohydrate"},{"id":"policy.chips_snack","stage":"policy","verdict":"NEIN","when":"chips, crisps, crackers, pretzels and similar processed snacks","why":"Processed starchy snack"},{"id":"policy.sweet_sauce","stage":"policy","verdict":"NEIN","when":"ketchup, BBQ and other sweet sauces, syrups, jams and sweet spreads","why":"Sweet sauce or spread"},{"id":"policy.wholegrain_pasta","stage":"policy","verdict":"SELTEN","when":"whole-grain or legume pasta","why":"Whole-grain pasta: still a lot of carbohydrate, keep it small"},{"id":"policy.nuts_large","stage":"policy","verdict":"SELTEN","when":"plain nuts above defaults.portionG.nuts per serving","why":"Plain nuts, but a large portion ({0} g)"},{"id":"policy.cheese_large","stage":"policy","verdict":"SELTEN","when":"cheese above defaults.portionG.cheese per serving","why":"Cheese, but a large portion ({0} g)"},{"id":"policy.legumes","stage":"policy","verdict":"SELTEN","when":"lentils, chickpeas, beans, hummus","why":"Legumes: fibre and protein, but still carbohydrate"},{"id":"policy.sweet_potato","stage":"policy","verdict":"SELTEN","when":"sweet potato","why":"Sweet potato: only in controlled portions"},{"id":"policy.protein_product","stage":"policy","verdict":"SELTEN","when":"processed protein products (protein isolate, protein claims); protein never makes a product green","why":"Processed protein product: protein does not make it a standard choice"},{"id":"policy.processed_meat","stage":"policy","verdict":"SELTEN","when":"sausages, cold cuts, breaded meat (non-pork)","why":"Processed meat"},{"id":"policy.sweet_salty","stage":"policy","verdict":"SELTEN","when":"sweet-and-salty snack mixes","why":"Sweet and salty snack mix"},{"id":"policy.incomplete","stage":"policy","verdict":"SELTEN","when":"the ingredients are missing, unreadable or cut off and no NEIN rule applies (provisional yellow)","why":"Ingredients missing or incomplete: provisional rating"},{"id":"quality.added_sugar_top","stage":"quality","verdict":"SELTEN","when":"added sugar in the first three ingredients","why":"Added sugar near the top ({0})"},{"id":"quality.sweetener","stage":"quality","verdict":"SELTEN","when":"a sweetener or sugar alcohol anywhere","why":"Has a sweetener ({0})"},{"id":"quality.refined_top","stage":"quality","verdict":"SELTEN","when":"refined starch in the first three ingredients","why":"Refined starch near the top ({0})"},{"id":"quality.claims_ignored","stage":"quality","verdict":null,"when":"marketing claims (High Protein, Low Carb, Keto, Zero, Sugar free, Organic, Gluten free) are recorded but never approve","why":"Claims on the pack do not change the rating"},{"id":"glucose.higher","stage":"glucose","verdict":"SELTEN","when":"Higher estimated blood sugar impact for the serving","why":"Higher estimated blood sugar impact for this serving"},{"id":"glucose.insufficient","stage":"glucose","verdict":"SELTEN","when":"not enough data to estimate and no whole-food JA rule","why":"Not enough data to estimate: provisional rating"},{"id":"ja.eggs","stage":"policy","verdict":"JA","when":"eggs","why":"Eggs","wholeFood":true},{"id":"ja.poultry","stage":"policy","verdict":"JA","when":"unbreaded chicken or turkey","why":"Chicken or turkey","wholeFood":true},{"id":"ja.lean_beef","stage":"policy","verdict":"JA","when":"lean beef","why":"Lean beef","wholeFood":true},{"id":"ja.fish","stage":"policy","verdict":"JA","when":"fresh fish","why":"Fish","wholeFood":true},{"id":"ja.nonstarchy_veg","stage":"policy","verdict":"JA","when":"non-starchy vegetables","why":"Non-starchy vegetables","wholeFood":true},{"id":"ja.plain_yoghurt_quark","stage":"policy","verdict":"JA","when":"plain yoghurt, Greek yoghurt, quark or skyr: ingredient list known, no added sugar, no sweetener, sugar at most plainYoghurtSugarMaxPer100","why":"Plain yoghurt or quark, nothing added"},{"id":"ja.unsweetened_drink","stage":"policy","verdict":"JA","when":"water, tea or coffee with no sugar and no sweetener","why":"Unsweetened drink"},{"id":"ja.whole_food_fat","stage":"policy","verdict":"JA","when":"olive oil, avocado","why":"Whole-food fat in normal amounts","wholeFood":true},{"id":"ja.nuts_moderate","stage":"policy","verdict":"JA","when":"plain nuts (ingredient list known, no added sugar, no coating) up to defaults.portionG.nuts per serving","why":"Plain nuts in a moderate portion"},{"id":"ja.cheese_moderate","stage":"policy","verdict":"JA","when":"cheese up to defaults.portionG.cheese per serving, no added sugar","why":"Cheese in a moderate portion"}]};/*END-POLICY-JSON*/;

    const POLICY = POLICY_JSON;
    const RANK = {JA: 0, SELTEN: 1, NEIN: 2};
    const STAGE_ORDER = {};
    POLICY.priority.forEach((s, i) => { STAGE_ORDER[s] = i; });
    const RULE = {};
    POLICY.rules.forEach((r, i) => { RULE[r.id] = Object.assign({order: i}, r); });
    const CAT_RX = {};
    for (const k of Object.keys(POLICY.categories)) CAT_RX[k] = new RegExp(POLICY.categories[k].name, 'i');
    const T = POLICY.thresholds;
    const PORK_SPECIES_RX = /schwein|pork|cerdo|porc/;
    const NOT_PORK_RX = /pute|truthahn|turkey|geflügel|gefluegel|poultry|hähnchen|haehnchen|chicken|\brind|beef|vegan|vegetar|veggie|pflanzlich|plant[- ]based/;
    const PLANT_RX = /vegan|vegetar|veggie|pflanzlich|plant[- ]based/;
    const PORK_TAGS = ['en:pork', 'en:pork-and-its-products', 'en:pork-meat', 'pork', 'pork-and-its-products', 'pork-meat'];

    const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
    const low = s => String(s == null ? '' : s).toLowerCase().normalize('NFC');
    const fmt = (s, args) => String(s).replace(/\{(\d)\}/g, (m, i) => (args && args[i] != null ? args[i] : ''));

    // Category keys for a product, from its name/brand and Open Food Facts category tags.
    function classify(product) {
        const p = product || {};
        const text = low([p.name, p.genericName].filter(Boolean).join(' '));
        const tags = (Array.isArray(p.categories) ? p.categories : String(p.categories || '').split(',')).map(t => low(t).trim()).filter(Boolean);
        const cats = {};
        for (const k of Object.keys(POLICY.categories)) {
            const def = POLICY.categories[k];
            if ((text && CAT_RX[k].test(text)) || (def.off || []).some(t => tags.includes(t))) cats[k] = true;
        }
        if (cats.sweet_potato) delete cats.starch_potato;
        // Salami, chorizo, speck, bacon or leberwurst named after another animal (Geflügelsalami, Rindfleisch-Salami,
        // Putenspeck) or plant-based is not pork by name; the same notPork rule ingredient-core uses. Pork in the
        // ingredients (summary.pork) and explicit pork tags still give NEIN. Meat versions count as processed meat.
        if (cats.pork && !PORK_SPECIES_RX.test(text) && NOT_PORK_RX.test(text) && !PORK_TAGS.some(t => tags.includes(t))) {
            delete cats.pork;
            if (!PLANT_RX.test(text)) cats.processed_meat = true;
        }
        return cats;
    }

    function applyPolicy(input) {
        const a = input || {};
        const p = a.product || {};
        const ing = a.ingredients || {status: 'missing', complete: false, flags: {}, summary: {}, allergens: [], claims: []};
        const S = ing.summary || {};
        const g = a.glucose || {};
        const prof = a.profile || {};
        const per100 = p.per100 || {};
        const sugar = num(per100.sugar);
        const servingG = num(a.serving && a.serving.g) != null ? num(a.serving.g) : num(a.servingG);
        const cats = classify(p);
        const complete = ing.status === 'complete';
        const incomplete = !complete || !!ing.truncated;
        const liquid = p.unit === 'ml' || !!g.liquid || !!(cats.sugar_drink || cats.juice || cats.unsweetened_drink) && !cats.plain_yoghurt_quark;
        const addedSugar = !!S.addedSugar;
        const sweetener = !!S.sweetener;
        const matched = [];
        const add = (id, args) => { const r = RULE[id]; matched.push({id, stage: r.stage, verdict: r.verdict, why: fmt(r.why, args), order: r.order}); };

        // safety + medical (user profile)
        const allergies = (prof.allergies || []).map(low);
        if (allergies.length) {
            const hit = allergies.filter(k => (ing.allergens || []).includes(k));
            if (hit.length) add('safety.allergen', [hit.join(', ')]);
            else if (!complete) add('safety.allergen_unknown');
        }
        const avoid = (prof.avoid || []).filter(k => cats[k]);
        if (avoid.length) add('medical.avoid', [avoid.join(', ')]);

        // policy NEIN
        if (cats.pork || S.pork) add('policy.pork');
        if (cats.alcohol || S.alcohol) add('policy.alcohol');
        if (liquid && !cats.plain_yoghurt_quark && (addedSugar || (cats.sugar_drink && (sugar == null || sugar >= T.sugarDrinkPer100ml)))) add('policy.sugar_drink');
        if (cats.juice) add('policy.juice');
        if (liquid && sweetener) add('policy.zero_drink');
        if (cats.candy_dessert) add('policy.candy_dessert');
        const nutsCore = !!(cats.nuts || (S.nutsTop && S.nutsTop.i === 0));
        if (!liquid && sugar != null && sugar >= T.sugarHeavySolidPer100 && (addedSugar || !complete) && !cats.plain_yoghurt_quark) add('policy.sugar_heavy', [Math.round(sugar)]);
        if (nutsCore && (cats.coated_nuts || S.addedSugarTop)) add('policy.coated_nuts');
        const wholegrain = /vollkorn|whole ?grain|wholemeal|integral|linsen|lentil|kichererbs|chickpea/.test(low(p.name)) || !!(S.wholeGrainTop && !S.refinedTop);
        if (cats.starch_rice || cats.starch_bread || cats.starch_potato || cats.breakfast_cereal || (cats.starch_pasta && !wholegrain)) add('policy.starch_staple');
        if (cats.chips_snack) add('policy.chips_snack');
        if (cats.sweet_sauce) add('policy.sweet_sauce');
        const anyNein = matched.some(m => m.verdict === 'NEIN');

        // policy SELTEN
        if (cats.starch_pasta && wholegrain) add('policy.wholegrain_pasta');
        const plainNuts = nutsCore && complete && !addedSugar && !sweetener && !cats.coated_nuts && !cats.sweet_salty && !cats.candy_dessert;
        const nutsMax = POLICY.defaults.portionG.nuts, cheeseMax = POLICY.defaults.portionG.cheese;
        if (plainNuts && servingG != null && servingG > nutsMax) add('policy.nuts_large', [Math.round(servingG)]);
        if (cats.cheese && !addedSugar && servingG != null && servingG > cheeseMax) add('policy.cheese_large', [Math.round(servingG)]);
        if (cats.legumes) add('policy.legumes');
        if (cats.sweet_potato) add('policy.sweet_potato');
        const hasProteinClaim = (ing.claims || []).some(c => c.key === 'high_protein');
        if (cats.protein_product || (S.proteinIsolate && hasProteinClaim)) add('policy.protein_product');
        if (cats.processed_meat) add('policy.processed_meat');
        if (cats.sweet_salty) add('policy.sweet_salty');

        // JA (whitelist)
        const clean = !addedSugar && !sweetener;
        if (cats.eggs) add('ja.eggs');
        if (cats.poultry && !cats.processed_meat && !S.refinedTop) add('ja.poultry');
        if (cats.lean_beef && !cats.processed_meat) add('ja.lean_beef');
        if (cats.fish && !S.refinedTop) add('ja.fish');
        if (cats.nonstarchy_veg && clean) add('ja.nonstarchy_veg');
        if (cats.whole_food_fat && clean) add('ja.whole_food_fat');
        if (cats.plain_yoghurt_quark && complete && clean && (sugar == null || sugar <= T.plainYoghurtSugarMaxPer100)) add('ja.plain_yoghurt_quark');
        if (cats.unsweetened_drink && liquid && clean && (complete || sugar === 0) && (sugar == null || sugar <= T.unsweetenedSugarMaxPer100)) add('ja.unsweetened_drink');
        if (plainNuts && (servingG == null || servingG <= nutsMax)) add('ja.nuts_moderate');
        if (cats.cheese && !addedSugar && (servingG == null || servingG <= cheeseMax)) add('ja.cheese_moderate');
        const wholeFoodJA = matched.some(m => m.verdict === 'JA' && RULE[m.id].wholeFood);
        if (incomplete && !anyNein && !wholeFoodJA) add('policy.incomplete');

        // quality
        if (S.addedSugarTop) add('quality.added_sugar_top', [S.addedSugarTop.w]);
        if (sweetener) add('quality.sweetener', [S.sweetenerHit ? S.sweetenerHit.w : '']);
        if (S.refinedTop) add('quality.refined_top', [S.refinedTop.w]);

        // glucose
        if (g.key === 'higher') add('glucose.higher');
        if (g.key === 'insufficient' && !wholeFoodJA) add('glucose.insufficient');

        let worst = -1;
        for (const m of matched) if (m.verdict && RANK[m.verdict] > worst) worst = RANK[m.verdict];
        const anyJA = matched.some(m => m.verdict === 'JA');
        let verdict = worst === 2 ? 'NEIN' : worst === 1 ? 'SELTEN' : anyJA ? 'JA' : POLICY.defaults.noRule;
        const sorted = matched.slice().sort((x, y) => (RANK[y.verdict] - RANK[x.verdict]) || (STAGE_ORDER[x.stage] - STAGE_ORDER[y.stage]) || (x.order - y.order));
        const decided = sorted.find(m => m.verdict === verdict) || null;
        return {
            policyVersion: POLICY.version,
            expertReviewed: POLICY.expertReviewed,
            verdict,
            decidedBy: decided ? decided.id : 'default.no_rule',
            stage: decided ? decided.stage : 'policy',
            why: decided ? decided.why : 'Not a standard choice on the LOWiSPIKE list',
            provisional: matched.some(m => m.id === 'policy.incomplete' || m.id === 'glucose.insufficient' || m.id === 'safety.allergen_unknown') && verdict !== 'NEIN',
            rules: sorted.map(m => ({id: m.id, stage: m.stage, verdict: m.verdict, why: m.why})),
            categories: Object.keys(cats),
            claimsIgnored: (ing.claims || []).map(c => c.key)
        };
    }

    return {VERSION: POLICY.version, POLICY, RANK, classify, applyPolicy};
});
