/* LOWiSPIKE Food Intelligence Engine: food quality, cravings + satiety, short reasons and a better alternative
   (queue step scanfe-e, spec queue/FOOD-ENGINE-SPEC.md sections 6, 7, 9, 12, 14). Pure, node-testable UMD module:
   window.LowiFoodAssess. Loaded after food-policy-core.js and before food-engine-core.js; LowiFoodEngine.scanFood calls
   it. Nothing here changes the scanner card yet (the result card is step scanfe-g1).

   - assessQuality(x): food quality on its own (whole food vs processed, added sugar, refined starch, sweeteners,
     isolates, coatings, processed meat, energy density, salt, fibre). good | mixed | poor | unknown. Never decided by
     carbohydrate alone and never by the glucose estimate.
   - assessCravings(x): craving risk (behavioural, not a glucose prediction) and satiety, both separate from quality and
     glucose. A trigger the user reported themselves (profile.triggers) makes the personal verdict one step stricter;
     nothing is assumed about anyone who did not report one.
   - composeReasons(x): every reason that applies as a stable key (reasonKeys), and the 2-3 shown ones with EN/DE/ES
     text, the deciding rule first.
   - betterAlternative(x): a whole food or food category from the LOWiSPIKE lists that keeps the eating experience, with
     a portion where it matters (e.g. 25-30 g plain roasted almonds). Products are never invented: `products` stays empty
     until a step picks real rows from data/shop. Every NEIN and SELTEN gets one; JA gets none.
   x = {product, per100 (validated), unit, serving, glucose, ingredients, policy, profile}. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiFoodAssess = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    const VERSION = 'food-assess-v1 2026-10-22';
    const low = s => String(s == null ? '' : s).toLowerCase();
    const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
    const r0 = v => Math.round(v);
    const VSTEP = {JA: 'SELTEN', SELTEN: 'NEIN', NEIN: 'NEIN'};
    const HONEY = /honig|honey|\bmiel\b/;

    // Short, plain texts. {0} is filled from the reason's args. Kept short for the card (2-3 lines).
    const TEXT = {
        allergen: {en: 'Contains {0}, on your allergy list', de: 'Enthält {0}, steht auf deiner Allergieliste', es: 'Contiene {0}, está en tu lista de alergias'},
        allergen_unknown: {en: 'Ingredients missing, your allergens can’t be ruled out', de: 'Zutaten fehlen, deine Allergene sind nicht ausgeschlossen', es: 'Faltan ingredientes, no se descartan tus alérgenos'},
        avoid_list: {en: 'On your avoid list', de: 'Steht auf deiner Meiden-Liste', es: 'Está en tu lista de evitar'},
        craving_trigger: {en: 'You said this one triggers cravings', de: 'Du hast gesagt, das löst bei dir Heißhunger aus', es: 'Dijiste que esto te da antojos'},
        pork_policy: {en: 'Pork product: not on the LOWiSPIKE protein list', de: 'Schweinefleisch: nicht auf der LOWiSPIKE-Proteinliste', es: 'Producto de cerdo: no está en la lista de proteínas LOWiSPIKE'},
        alcohol_policy: {en: 'Contains alcohol', de: 'Enthält Alkohol', es: 'Contiene alcohol'},
        coated_nuts_sugar: {en: 'Nuts in a sugar coating, not plain nuts', de: 'Nüsse mit Zuckerüberzug, keine reinen Nüsse', es: 'Frutos secos con cobertura de azúcar, no naturales'},
        sugar_first_ingredient: {en: 'Sugar is the first ingredient', de: 'Zucker ist die erste Zutat', es: 'El azúcar es el primer ingrediente'},
        liquid_sugar: {en: 'Liquid sugar goes into the blood fast', de: 'Flüssiger Zucker geht schnell ins Blut', es: 'El azúcar líquido pasa rápido a la sangre'},
        juice_is_not_whole_fruit: {en: 'Juice is not whole fruit: the fibre is gone', de: 'Saft ist kein ganzes Obst: die Ballaststoffe fehlen', es: 'El zumo no es fruta entera: falta la fibra'},
        smoothie_blended: {en: 'Smoothie: blended fruit, easy to drink fast', de: 'Smoothie: püriertes Obst, schnell getrunken', es: 'Batido: fruta triturada, se bebe rápido'},
        sweet_substitute_keeps_habit: {en: 'Sweet “zero” drink keeps the sweet habit going', de: 'Süßes „Zero“-Getränk hält die Süß-Gewohnheit am Laufen', es: 'La bebida “zero” dulce mantiene el hábito dulce'},
        sweet_dessert: {en: 'Sweets or a sweet dessert', de: 'Süßigkeit oder süßes Dessert', es: 'Dulce o postre dulce'},
        refined_starch_staple: {en: 'Starchy staple: lots of fast carbohydrate', de: 'Stärke-Beilage: viele schnelle Kohlenhydrate', es: 'Básico con almidón: muchos carbohidratos rápidos'},
        bread_staple: {en: 'Bread is a starchy staple, whole grain too', de: 'Brot ist eine Stärke-Beilage, auch Vollkorn', es: 'El pan es un básico con almidón, también el integral'},
        processed_starchy_snack: {en: 'Processed starchy snack', de: 'Verarbeiteter Stärke-Snack', es: 'Snack procesado con almidón'},
        sweet_sauce: {en: 'Sweet sauce or spread', de: 'Süße Soße oder süßer Aufstrich', es: 'Salsa o crema dulce'},
        sugar_per_100: {en: '{0} g sugar per 100 g', de: '{0} g Zucker pro 100 g', es: '{0} g de azúcar por 100 g'},
        processed_protein_product: {en: 'Processed protein product', de: 'Verarbeitetes Proteinprodukt', es: 'Producto proteico procesado'},
        processed_meat_snack: {en: 'Processed meat snack', de: 'Verarbeiteter Fleischsnack', es: 'Snack de carne procesada'},
        added_sugar_and_honey: {en: 'Added sugar and honey', de: 'Zugesetzter Zucker und Honig', es: 'Azúcar añadido y miel'},
        added_sugar: {en: 'Added sugar', de: 'Zugesetzter Zucker', es: 'Azúcar añadido'},
        dried_fruit_sugar: {en: 'Dried fruit adds concentrated sugar', de: 'Trockenobst bringt konzentrierten Zucker', es: 'La fruta seca aporta azúcar concentrado'},
        sweetener: {en: 'Sweetened with {0}', de: 'Gesüßt mit {0}', es: 'Endulzado con {0}'},
        refined_starch_top: {en: 'Refined starch near the top ({0})', de: 'Raffinierte Stärke weit vorne ({0})', es: 'Almidón refinado entre los primeros ({0})'},
        fat_protein_do_not_cancel_carbs: {en: 'Fat and protein may slow it down, but don’t cancel the carbs', de: 'Fett und Eiweiß bremsen vielleicht, heben die Kohlenhydrate aber nicht auf', es: 'La grasa y la proteína pueden frenar, pero no anulan los carbohidratos'},
        fibre_does_not_cancel_carbs: {en: 'Fibre helps a bit, but doesn’t cancel the carbs', de: 'Ballaststoffe helfen etwas, heben die Kohlenhydrate aber nicht auf', es: 'La fibra ayuda algo, pero no anula los carbohidratos'},
        protein_does_not_make_it_green: {en: 'High protein doesn’t make it a good choice', de: 'Viel Eiweiß macht es nicht zur guten Wahl', es: 'Mucha proteína no lo convierte en buena opción'},
        sweet_salty_repeat_snacking: {en: 'Sweet and salty: easy to keep snacking', de: 'Süß und salzig: verleitet zum Weiternaschen', es: 'Dulce y salado: invita a seguir picando'},
        repeat_snacking: {en: 'Made for snacking on and on', de: 'Gemacht zum Immer-weiter-Naschen', es: 'Hecho para picar sin parar'},
        plain_nuts_no_added_sugar: {en: 'Plain nuts, no added sugar', de: 'Reine Nüsse, ohne Zuckerzusatz', es: 'Frutos secos naturales, sin azúcar añadido'},
        portion_matters: {en: 'Keep the portion small (about {0} g)', de: 'Kleine Portion (etwa {0} g)', es: 'Porción pequeña (unos {0} g)'},
        plain_dairy_natural_milk_sugar: {en: 'Plain dairy: only the milk’s own sugar', de: 'Natur-Milchprodukt: nur der eigene Milchzucker', es: 'Lácteo natural: solo el azúcar propio de la leche'},
        whole_food_protein: {en: 'Whole-food protein', de: 'Natürliches Eiweiß', es: 'Proteína de alimento natural'},
        whole_food_fat: {en: 'Whole-food fat', de: 'Natürliches Fett', es: 'Grasa de alimento natural'},
        nonstarchy_veg: {en: 'Non-starchy vegetables', de: 'Stärkearmes Gemüse', es: 'Verduras sin almidón'},
        unsweetened_drink: {en: 'Unsweetened drink', de: 'Ungesüßtes Getränk', es: 'Bebida sin azúcar'},
        grain_staple: {en: 'Grain or starchy base: lots of carbohydrate', de: 'Getreide oder Stärkebasis: viele Kohlenhydrate', es: 'Cereal o base de almidón: muchos carbohidratos'},
        sugar_itself: {en: 'Sugar or syrup: added sugar', de: 'Zucker oder Sirup: zugesetzter Zucker', es: 'Azúcar o sirope: azúcar añadido'},
        sweet_fruit: {en: 'Very sweet fruit: a lot of sugar at once', de: 'Sehr süßes Obst: viel Zucker auf einmal', es: 'Fruta muy dulce: mucho azúcar de golpe'},
        breaded_fried: {en: 'Breaded or fried: a crust of fast starch', de: 'Paniert oder frittiert: eine Hülle aus schneller Stärke', es: 'Rebozado o frito: una capa de almidón rápido'},
        whole_fruit_small: {en: 'Whole fruit: a small portion', de: 'Ganzes Obst: eine kleine Portion', es: 'Fruta entera: una porción pequeña'},
        milk_plain: {en: 'Milk without added sugar', de: 'Milch ohne Zuckerzusatz', es: 'Leche sin azúcar añadido'},
        halloumi_occasional: {en: 'Halloumi: salty and rich, keep the portion small', de: 'Halloumi: salzig und reichhaltig, kleine Portion', es: 'Halloumi: salado y contundente, porción pequeña'},
        nut_butter_spoon: {en: 'Nut butter: one spoon fits, the jar goes fast', de: 'Nussmus: ein Löffel passt, das Glas ist schnell leer', es: 'Crema de frutos secos: una cucharada vale, el bote vuela'},
        berries_small: {en: 'Berries in a small handful', de: 'Beeren, eine kleine Handvoll', es: 'Frutos rojos, un puñado pequeño'},
        berries_bowl: {en: 'Berries: a bowlful is more sugar than a handful', de: 'Beeren: eine Schüssel ist mehr Zucker als eine Handvoll', es: 'Frutos rojos: un bol es más azúcar que un puñado'},
        plant_protein: {en: 'Tofu or tempeh: plant protein', de: 'Tofu oder Tempeh: pflanzliches Eiweiß', es: 'Tofu o tempeh: proteína vegetal'},
        fresh_cheese: {en: 'Fresh cheese without sugar', de: 'Frischkäse ohne Zucker', es: 'Queso fresco sin azúcar'},
        legumes_still_carbs: {en: 'Legumes: fibre and protein, but still carbs', de: 'Hülsenfrüchte: Ballaststoffe und Eiweiß, aber trotzdem Kohlenhydrate', es: 'Legumbres: fibra y proteína, pero aún carbohidratos'},
        sweet_potato_portion: {en: 'Sweet potato: only in controlled portions', de: 'Süßkartoffel: nur in kleinen Portionen', es: 'Boniato: solo en porciones controladas'},
        large_portion: {en: 'Large portion ({0} g)', de: 'Große Portion ({0} g)', es: 'Porción grande ({0} g)'},
        carbs_serving: {en: '{0} g carbohydrate in this serving', de: '{0} g Kohlenhydrate in dieser Portion', es: '{0} g de carbohidratos en esta porción'},
        carbs_low_serving: {en: 'Little carbohydrate in this serving ({0} g)', de: 'Wenig Kohlenhydrate in dieser Portion ({0} g)', es: 'Pocos carbohidratos en esta porción ({0} g)'},
        ingredients_incomplete: {en: 'Ingredient list missing: rating is provisional', de: 'Zutatenliste fehlt: Bewertung ist vorläufig', es: 'Falta la lista de ingredientes: valoración provisional'},
        not_enough_data: {en: 'Not enough data to estimate', de: 'Zu wenig Daten für eine Schätzung', es: 'No hay datos suficientes para estimar'},
        claim_never_approves: {en: '“{0}” on the pack doesn’t change the rating', de: '„{0}“ auf der Packung ändert die Bewertung nicht', es: '“{0}” en el envase no cambia la valoración'}
    };
    const CLAIM_KEY = {zero_sugar: 'zero'};
    const CLAIM_NAME = {high_protein: 'High Protein', low_carb: 'Low Carb', keto: 'Keto', zero_sugar: 'Zero', sugar_free: 'Sugar free',
        no_added_sugar: 'No added sugar', organic: 'Bio', gluten_free: 'Gluten free', vegan: 'Vegan', light: 'Light', fitness: 'Fit'};
    // Shown-reason order: the deciding rules first (safety > medical > personal > policy), then numbers, then quality,
    // then the "does not cancel" corrections, then behaviour and positives (spec sections 9 and 12).
    const ORDER = ['allergen', 'avoid_list', 'craving_trigger', 'pork_policy', 'alcohol_policy', 'coated_nuts_sugar', 'sugar_first_ingredient',
        'liquid_sugar', 'juice_is_not_whole_fruit', 'smoothie_blended', 'sweet_substitute_keeps_habit', 'sweet_dessert', 'refined_starch_staple', 'bread_staple',
        'grain_staple', 'sugar_itself', 'sweet_fruit', 'breaded_fried', 'processed_starchy_snack', 'sweet_sauce', 'sugar_per_100', 'processed_protein_product', 'processed_meat_snack', 'added_sugar_and_honey',
        'added_sugar', 'dried_fruit_sugar', 'sweetener', 'refined_starch_top', 'fat_protein_do_not_cancel_carbs', 'fibre_does_not_cancel_carbs',
        'sweet_salty_repeat_snacking', 'repeat_snacking', 'protein_does_not_make_it_green', 'large_portion', 'legumes_still_carbs',
        'sweet_potato_portion', 'whole_fruit_small', 'berries_bowl', 'halloumi_occasional', 'nut_butter_spoon', 'whole_food_protein', 'plant_protein', 'fresh_cheese', 'berries_small', 'milk_plain', 'plain_dairy_natural_milk_sugar', 'nonstarchy_veg', 'whole_food_fat', 'unsweetened_drink',
        'plain_nuts_no_added_sugar', 'portion_matters', 'allergen_unknown', 'ingredients_incomplete', 'not_enough_data', 'claim_never_approves',
        'carbs_serving', 'carbs_low_serving'];
    const ORANK = Object.fromEntries(ORDER.map((k, i) => [k, i]));

    /* an ingredient word from the label reads as a name, not raw lowercase ("Kartoffeln", not "kartoffeln") */
    const cap = w => { const t = String(w || ''); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; };
    function fmt(t, args) { return String(t).replace(/\{(\d)\}/g, (m, i) => (args && args[+i] != null ? String(args[+i]) : '')); }
    function text(key, args) {
        const t = TEXT[key];
        if (!t) return null;
        /* numbers read the way each language writes them: 14.7 in English, 14,7 in German and Spanish (24 Oct 2026) */
        const loc = (args || []).map(v => typeof v === 'number' && !Number.isInteger(v) ? String(v).replace('.', ',') : v);
        return {en: fmt(t.en, args), de: fmt(t.de, loc), es: fmt(t.es, loc)};
    }

    // Shared facts every assessment reads, worked out once.
    function facts(x) {
        const a = x || {};
        const p = a.product || {};
        const per = a.per100 || {};
        const ing = a.ingredients || {status: 'missing', flags: {}, summary: {}, claims: []};
        const F = ing.flags || {};
        const S = ing.summary || {};
        const pol = a.policy || {};
        const rules = (pol.rules || []).map(r => r.id);
        const cats = {};
        for (const c of pol.categories || []) cats[c] = true;
        const has = id => rules.includes(id);
        const name = low([p.name, p.genericName].filter(Boolean).join(' '));
        const liquid = a.unit === 'ml' || p.unit === 'ml' || !!(a.glucose && a.glucose.liquid);
        const complete = ing.status === 'complete' && !ing.truncated;
        const servingG = num(a.serving && a.serving.g);
        const kcal = num(per.kcal), sugar = num(per.sugar), protein = num(per.protein), fibre = num(per.fibre), salt = num(per.salt), fat = num(per.fat);
        const sugarHits = F.addedSugar || [];
        const addedSugar = sugarHits.length > 0;
        const honey = sugarHits.some(h => HONEY.test(low(h.w)));
        const sugarOther = sugarHits.some(h => !HONEY.test(low(h.w)));
        const sweetener = !!S.sweetener;
        /* 24 Oct 2026: at or under 5 g sugar per 100 g (2.5 g per 100 ml) EU law calls a food low in sugar (Regulation (EC) 1924/2006).
           Then a pinch of sugar in a spice mix is not shown as a reason, a concern or a "plain version" swap. */
        const lowSugar = sugar != null && sugar <= (liquid ? 2.5 : 5);
        const sugarMatters = addedSugar && !lowSugar;
        const sweetSalty = !!cats.sweet_salty || /süß\s*(&|und|-)\s*salzig|sweet\s*(&|and|n)\s*salty|dulce y salado/.test(name);
        const nutsCore = !!(cats.nuts || cats.coated_nuts || (S.nutsTop && S.nutsTop.i === 0));
        const plainNuts = nutsCore && complete && !addedSugar && !sweetener && !cats.coated_nuts && !sweetSalty && !cats.candy_dessert;
        const wholeFoodJA = rules.some(id => /^ja\.(eggs|poultry|lean_beef|fish|nonstarchy_veg|whole_food_fat|plain_yoghurt_quark|unsweetened_drink|nuts_moderate)$/.test(id));
        const fruitHits = (F.fruit || []).length > 0;
        const freshFruit = /frisch|fresh|fresco/.test(name);
        const driedFruit = !liquid && fruitHits && !freshFruit && sugar != null && sugar >= 15 && !cats.plain_yoghurt_quark &&
            (nutsCore || (F.nuts || []).length > 0 || /trocken|dried|getrocknet|seca|mix/.test(name));
        const processedMeat = !!cats.processed_meat || (!!(cats.pork || S.pork) && /salami|stick|wurst|chorizo|mortadella|speck|bacon|cabanossi|schinken|\bham\b/.test(name));
        return {a, p, per, ing, F, S, pol, rules, has, cats, name, liquid, complete, servingG, kcal, sugar, protein, fibre, salt, fat,
            addedSugar, sugarMatters, lowSugar, honey, sugarOther, sweetener, sweetSalty, nutsCore, plainNuts, wholeFoodJA, driedFruit, processedMeat,
            verdict: pol.verdict || null, glucose: a.glucose || {}};
    }
    const isFacts = x => !!(x && Array.isArray(x.rules) && typeof x.has === 'function');

    const QLABEL = {good: {en: 'Good everyday choice', de: 'Gute Alltagswahl', es: 'Buena opción diaria'},
        mixed: {en: 'Some concerns', de: 'Einige Bedenken', es: 'Algunas pegas'},
        poor: {en: 'Not a good everyday choice', de: 'Keine gute Alltagswahl', es: 'No es buena opción diaria'},
        unknown: {en: 'Ingredients missing: quality unknown', de: 'Zutaten fehlen: Qualität unbekannt', es: 'Faltan ingredientes: calidad desconocida'}};

    function assessQuality(x) {
        const f = isFacts(x) ? x : facts(x);
        const concerns = [], positives = [];
        let strong = false;
        const c = (k, s) => { if (!concerns.includes(k)) concerns.push(k); if (s) strong = true; };
        if (f.S.sugarFirst) c('sugar_first', true);
        else if (f.S.addedSugarTop && f.sugarMatters) c('added_sugar_top', true);
        else if (f.sugarMatters) c('added_sugar');
        if (f.S.refinedTop) c('refined_starch_top');
        if (f.sweetener) c('sweetener');
        if (f.S.proteinIsolate) c('protein_isolate');
        if (f.S.coating || f.cats.coated_nuts) c('coating', !!f.cats.coated_nuts);
        if (f.processedMeat) c('processed_meat', true);
        if (f.cats.candy_dessert) c('sweet_dessert', true);
        if (f.cats.chips_snack) c('processed_snack', true);
        if ((f.cats.sugar_drink || f.cats.juice) && (f.sugar == null || f.sugar > 0.5)) c('liquid_sugar', true);
        if (f.cats.sweet_sauce) c('sweet_sauce', true);
        if (!f.liquid && f.sugar != null && f.sugar >= 15 && !f.cats.plain_yoghurt_quark && !f.plainNuts && (f.addedSugar || !f.complete)) c('sugar_heavy', f.sugar >= 25);
        if (f.driedFruit) c('dried_fruit_sugar');
        // Energy density: plain nuts and whole-food fats are dense by nature; that is a portion question, not a quality flaw.
        if (!f.liquid && f.kcal != null && f.kcal >= 450 && !f.plainNuts && !f.cats.whole_food_fat) c('energy_dense');
        if (f.salt != null && f.salt >= 1.5 && !f.liquid) c('salty');
        if (f.complete && f.ing.count >= 10) c('long_ingredient_list');
        if (f.wholeFoodJA) positives.push('whole_food');
        if (f.plainNuts) positives.push('plain_nuts');
        if (f.complete && f.ing.count > 0 && f.ing.count <= 3 && !f.addedSugar && !f.sweetener) positives.push('short_ingredient_list');
        if (f.fibre != null && f.fibre >= 6) positives.push('fibre_rich');
        if ((f.F.proteinWhole || []).length && !f.S.proteinIsolate) positives.push('whole_protein');
        let key;
        if (strong || concerns.length >= 3) key = 'poor';
        else if (concerns.length) key = 'mixed';
        else if (f.complete || f.wholeFoodJA) key = 'good';
        else key = 'unknown';
        return {key, label: QLABEL[key], concerns, positives, complete: f.complete, independentOfGlucose: true};
    }

    function triggerHit(f, profile) {
        const list = (profile && Array.isArray(profile.triggers) ? profile.triggers : []).map(low).map(s => s.trim()).filter(s => s.length >= 2);
        if (!list.length) return null;
        const code = low(f.p.barcode);
        for (const t of list) {
            if (code && t === code) return t;
            if (f.cats[t]) return t;
            if (f.name && f.name.includes(t)) return t;
        }
        return null;
    }

    function assessCravings(x) {
        const f = isFacts(x) ? x : facts(x);
        const profile = (f.a && f.a.profile) || {};
        const reasons = [];
        let score = 0;
        const r = (k, w) => { reasons.push(k); score += w; };
        if (f.sweetSalty) r('sweet_salty', 2);
        if (f.cats.candy_dessert) r('sweet_dessert', 2);
        if (f.cats.coated_nuts || (f.nutsCore && f.S.addedSugarTop)) r('coated_snack', 2);
        if (f.cats.chips_snack) r('repeat_snack', 2);
        if (f.liquid && (f.cats.sugar_drink || f.cats.juice || f.addedSugar) && (f.sugar == null || f.sugar >= 2.5)) r('sweet_drink', 2);
        if (f.has('policy.zero_drink')) r('sweet_substitute', 1);
        if (f.sweetener) r(f.cats.candy_dessert || f.cats.protein_product ? 'dessert_substitute' : 'sweet_taste', 1);
        if (!f.liquid && f.sugar != null && f.sugar >= 20 && !reasons.includes('sweet_dessert')) r('highly_sweet', 1);
        if (!f.liquid && f.kcal != null && f.kcal >= 450 && !f.plainNuts && !f.cats.whole_food_fat && (f.servingG == null || f.servingG <= 50)) r('energy_dense_quick', 1);
        const trig = triggerHit(f, profile);
        if (trig) reasons.unshift('your_trigger');
        const key = trig || score >= 2 ? 'higher' : score === 1 ? 'moderate' : 'lower';
        // Satiety: protein and fibre per 100 kcal, energy density, liquid calories. Behavioural guidance only.
        let satiety = 'unknown';
        const satietyReasons = [];
        const liquidSugar = f.liquid && (f.sugar || 0) > 0;
        if (liquidSugar) { satiety = 'lower'; satietyReasons.push('liquid_calories'); }
        else if (f.kcal != null && f.kcal > 0) {
            const pPer = (f.protein || 0) * 100 / f.kcal, fPer = (f.fibre || 0) * 100 / f.kcal;
            if (pPer >= 8 || fPer >= 3) { satiety = 'higher'; satietyReasons.push(pPer >= 8 ? 'protein_rich' : 'fibre_rich'); }
            else if (f.plainNuts || f.cats.whole_food_fat) satiety = 'moderate';
            else if (f.kcal >= 450 && pPer < 4) { satiety = 'lower'; satietyReasons.push('energy_dense'); }
            else satiety = 'moderate';
        }
        return {key, reasons, personal: !!trig, trigger: trig, satiety, satietyReasons, behavioural: true};
    }

    // Personal strictness: a trigger the user reported moves the verdict one step (JA -> SELTEN -> NEIN).
    function personalVerdict(verdict, cravings) {
        if (!verdict || !cravings || !cravings.personal) return {verdict, changed: false};
        const to = VSTEP[verdict] || verdict;
        return {verdict: to, changed: to !== verdict, from: verdict, rule: 'cravings.trigger'};
    }

    function composeReasons(x, quality, cravings) {
        const f = isFacts(x) ? x : facts(x);
        const cr = cravings || assessCravings(f);
        const out = [];
        const add = (kind, args, key) => {
            const k = key || kind;
            if (!out.some(o => o.key === k)) out.push({key: k, kind, args: args || [], rank: ORANK[kind] == null ? 999 : ORANK[kind]});
        };
        const H = f.has;
        const pr = f.pol.rules || [];
        const allergen = pr.find(r => r.id === 'safety.allergen');
        if (allergen) add('allergen', [(/Contains (.+?), which/.exec(allergen.why || '') || [])[1] || '']);
        if (H('safety.allergen_unknown')) add('allergen_unknown');
        if (H('medical.avoid')) add('avoid_list');
        if (cr.personal) add('craving_trigger');
        if (H('policy.pork')) add('pork_policy');
        if (H('policy.alcohol')) add('alcohol_policy');
        if (H('policy.coated_nuts')) add('coated_nuts_sugar');
        if (f.S.sugarFirst) add('sugar_first_ingredient');
        if (H('policy.sugar_drink') || H('policy.juice') || (f.liquid && (f.glucose.reasons || []).includes('liquid_sugar'))) add('liquid_sugar');
        if (H('policy.juice')) add('juice_is_not_whole_fruit');
        if (H('policy.smoothie')) add('smoothie_blended');
        if (H('policy.zero_drink')) add('sweet_substitute_keeps_habit');
        if (H('policy.candy_dessert')) add('sweet_dessert');
        if (H('policy.starch_staple')) add(f.cats.starch_bread && !f.cats.starch_rice && !f.cats.starch_pasta && !f.cats.starch_potato ? 'bread_staple' : 'refined_starch_staple');
        if (H('policy.starch_grain')) add('grain_staple');
        if (H('policy.sugar')) add('sugar_itself');
        if (H('policy.sweet_fruit')) add('sweet_fruit');
        if (H('policy.breaded')) add('breaded_fried');
        if (H('policy.chips_snack')) add('processed_starchy_snack');
        if (H('policy.sweet_sauce')) add('sweet_sauce');
        if (!f.liquid && f.sugar != null && f.sugar >= 10 && !f.cats.plain_yoghurt_quark) add('sugar_per_100', [r0(f.sugar)], 'sugar_' + r0(f.sugar) + '_per_100');
        if (H('policy.protein_product')) add('processed_protein_product');
        if (f.processedMeat) add('processed_meat_snack');
        if (f.honey && f.sugarOther) add('added_sugar_and_honey');
        if (f.sugarMatters) add('added_sugar');
        if (f.driedFruit) add('dried_fruit_sugar');
        const sw = (f.F.sweeteners || []).concat(f.F.sugarAlcohols || []);
        if (f.sweetener) add('sweetener', [cap(((sw.find(h => h.depth > 0) || f.S.sweetenerHit || {}).w) || '')]);
        if (f.S.refinedTop && !H('policy.starch_staple')) add('refined_starch_top', [cap(f.S.refinedTop.w)]);
        const g = f.glucose;
        const notLower = g.key === 'moderate' || g.key === 'higher';
        const mods = g.modifiers || [];
        if (notLower && !H('policy.starch_staple') && ((f.protein || 0) >= 10 || (f.fat || 0) >= 15)) add('fat_protein_do_not_cancel_carbs');
        const wholegrain = !!f.S.wholeGrainTop || (f.F.wholeGrain || []).length > 0 || /vollkorn|whole ?grain|wholemeal|integral/.test(f.name);
        if ((notLower || H('policy.starch_staple')) && (mods.includes('fibre_may_slow') || wholegrain)) add('fibre_does_not_cancel_carbs');
        const proteinHigh = (f.protein || 0) >= 15 || (f.ing.claims || []).some(c => c.key === 'high_protein');
        if (proteinHigh && !f.processedMeat && (f.verdict === 'NEIN' || (f.verdict === 'SELTEN' && (f.addedSugar || f.sweetener || f.cats.coated_nuts)))) add('protein_does_not_make_it_green');
        if (f.sweetSalty) add('sweet_salty_repeat_snacking');
        else if (f.cats.chips_snack || f.cats.coated_nuts) add('repeat_snacking');
        if ((H('policy.nuts_large') || H('policy.cheese_large')) && f.servingG != null) add('large_portion', [r0(f.servingG)]);
        if (H('policy.legumes')) add('legumes_still_carbs');
        if (H('policy.sweet_potato')) add('sweet_potato_portion');
        if (H('policy.fruit_whole')) add('whole_fruit_small');
        if (H('ja.milk')) add('milk_plain');
        if (H('policy.halloumi')) add('halloumi_occasional');
        if (H('policy.nut_butter')) add('nut_butter_spoon');
        if (H('policy.berries_large')) add('berries_bowl');
        if (H('ja.berries_small')) add('berries_small');
        if (H('ja.plant_protein')) add('plant_protein');
        if (H('ja.fresh_cheese')) add('fresh_cheese');
        if (H('ja.eggs') || H('ja.poultry') || H('ja.lean_beef') || H('ja.fish')) add('whole_food_protein');
        if (H('ja.plain_yoghurt_quark')) add('plain_dairy_natural_milk_sugar');
        if (H('ja.nonstarchy_veg')) add('nonstarchy_veg');
        if (H('ja.whole_food_fat')) add('whole_food_fat');
        if (H('ja.unsweetened_drink')) add('unsweetened_drink');
        if (f.plainNuts) { add('plain_nuts_no_added_sugar'); add('portion_matters', [30]); }
        if (f.cats.cheese) add('portion_matters', [30]);
        if (!f.complete && !f.wholeFoodJA) add('ingredients_incomplete');
        if (g.key === 'insufficient') add('not_enough_data');
        for (const cl of f.ing.claims || []) add('claim_never_approves', [CLAIM_NAME[cl.key] || cl.key], (CLAIM_KEY[cl.key] || cl.key) + '_claim_never_approves');
        if (num(g.availableCarbsG) != null) {
            if (g.key === 'lower') add('carbs_low_serving', [g.availableCarbsG]);
            else if (notLower) add('carbs_serving', [g.availableCarbsG]);
        }
        const sorted = out.slice().sort((a, b) => a.rank - b.rank);
        // Shown: up to 3; claim notes and plain serving numbers only fill slots nothing better takes.
        const fill = r => r.kind === 'claim_never_approves' || r.kind === 'carbs_serving' || r.kind === 'carbs_low_serving';
        const keys = new Set(sorted.map(r => r.key));
        // Overlaps: the broader line hides the plainer one so three slots say three different things.
        const hidden = r => (r.kind === 'added_sugar' && (keys.has('added_sugar_and_honey') || keys.has('sugar_first_ingredient'))) ||
            (r.kind === 'liquid_sugar' && keys.has('sweet_substitute_keeps_habit'));
        const shown = sorted.filter(r => !hidden(r) && !fill(r)).concat(sorted.filter(r => !hidden(r) && fill(r))).slice(0, 3)
            .map(r => ({key: r.key, kind: r.kind, text: text(r.kind, r.args)}));
        return {reasonKeys: sorted.map(r => r.key), reasons: shown};
    }

    // Better alternative: whole foods / categories from the LOWiSPIKE JA list that keep the eating experience.
    const ALT = {
        sweet_nut_snack: {en: '25–30 g plain roasted almonds, no sugar coating', de: '25–30 g geröstete Mandeln ohne Zuckerüberzug', es: '25–30 g de almendras tostadas sin cobertura de azúcar', portionG: [25, 30]},
        nuts_portion: {en: 'The same nuts, about 30 g', de: 'Dieselben Nüsse, etwa 30 g', es: 'Los mismos frutos secos, unos 30 g', portionG: [30, 30]},
        cheese_portion: {en: 'The same cheese, about 30 g', de: 'Derselbe Käse, etwa 30 g', es: 'El mismo queso, unos 30 g', portionG: [30, 30]},
        sparkling_water: {en: 'Sparkling water with lemon or unsweetened iced tea', de: 'Sprudelwasser mit Zitrone oder ungesüßter Eistee', es: 'Agua con gas con limón o té frío sin azúcar', portionG: null},
        whole_fruit: {en: 'A piece of whole fruit and water instead of juice', de: 'Ein Stück ganzes Obst und Wasser statt Saft', es: 'Una pieza de fruta entera y agua en vez de zumo', portionG: null},
        yoghurt_berries: {en: 'Plain Greek yoghurt or quark with a few berries', de: 'Griechischer Naturjoghurt oder Quark mit ein paar Beeren', es: 'Yogur griego natural o quark con unas bayas', portionG: null},
        cauli_rice: {en: 'Cauliflower rice or extra vegetables', de: 'Blumenkohlreis oder mehr Gemüse', es: 'Arroz de coliflor o más verduras', portionG: null},
        veg_noodles: {en: 'Zucchini noodles, or a small portion of lentil pasta', de: 'Zucchininudeln oder eine kleine Portion Linsennudeln', es: 'Espaguetis de calabacín o una porción pequeña de pasta de lentejas', portionG: null},
        protein_breakfast: {en: 'Eggs or plain quark instead of bread', de: 'Eier oder Naturquark statt Brot', es: 'Huevos o quark natural en vez de pan', portionG: null},
        cauli_mash: {en: 'Cauliflower or celeriac mash', de: 'Blumenkohl- oder Selleriepüree', es: 'Puré de coliflor o de apionabo', portionG: null},
        yoghurt_nuts: {en: 'Plain yoghurt with a few plain nuts', de: 'Naturjoghurt mit ein paar Nüssen', es: 'Yogur natural con unos frutos secos', portionG: null},
        crunchy_veg: {en: 'Cucumber or pepper sticks, or 25–30 g plain nuts', de: 'Gurken- oder Paprikasticks oder 25–30 g reine Nüsse', es: 'Palitos de pepino o pimiento, o 25–30 g de frutos secos naturales', portionG: [25, 30]},
        herb_dip: {en: 'Mustard, herbs or a plain yoghurt dip', de: 'Senf, Kräuter oder ein Naturjoghurt-Dip', es: 'Mostaza, hierbas o una salsa de yogur natural', portionG: null},
        poultry_beef: {en: 'Chicken, turkey or lean beef', de: 'Hähnchen, Pute oder mageres Rind', es: 'Pollo, pavo o ternera magra', portionG: null},
        fresh_meat: {en: 'Fresh chicken or turkey breast', de: 'Frische Hähnchen- oder Putenbrust', es: 'Pechuga de pollo o pavo fresca', portionG: null},
        plain_protein: {en: 'Plain quark, Greek yoghurt or eggs', de: 'Naturquark, griechischer Joghurt oder Eier', es: 'Quark natural, yogur griego o huevos', portionG: null},
        legumes_portion: {en: 'A smaller portion, with vegetables and protein', de: 'Eine kleinere Portion, mit Gemüse und Eiweiß', es: 'Una porción más pequeña, con verduras y proteína', portionG: null},
        plain_version: {en: 'The plain version, without added sugar or sweetener', de: 'Die Natur-Variante, ohne Zucker oder Süßstoff', es: 'La versión natural, sin azúcar ni edulcorante', portionG: null},
        whole_food_choice: {en: 'A whole-food choice: eggs, fish, chicken, vegetables or plain yoghurt', de: 'Etwas Natürliches: Eier, Fisch, Hähnchen, Gemüse oder Naturjoghurt', es: 'Algo natural: huevos, pescado, pollo, verduras o yogur natural', portionG: null}
    };
    function betterAlternative(x, verdictOverride) {
        const f = isFacts(x) ? x : facts(x);
        const v = verdictOverride || f.verdict;
        if (!v || v === 'JA') return null;
        const c = f.cats, H = f.has;
        let key;
        if (H('policy.alcohol')) key = 'sparkling_water';
        else if (f.processedMeat) key = 'fresh_meat';
        else if (H('policy.pork')) key = 'poultry_beef';
        else if (H('policy.juice') || c.juice || H('policy.smoothie') || c.smoothie) key = 'whole_fruit';
        else if (f.liquid && (H('policy.sugar_drink') || H('policy.zero_drink') || c.sugar_drink || f.addedSugar || f.sweetener)) key = 'sparkling_water';
        else if (f.nutsCore && (H('policy.coated_nuts') || f.sweetSalty || f.addedSugar)) key = 'sweet_nut_snack';
        else if (f.sweetSalty) key = 'sweet_nut_snack';
        else if (H('policy.nuts_large')) key = 'nuts_portion';
        else if (H('policy.cheese_large')) key = 'cheese_portion';
        else if (H('policy.protein_product') || c.protein_product) key = 'plain_protein';
        else if (c.candy_dessert || H('policy.sugar_heavy')) key = 'yoghurt_berries';
        else if (c.starch_rice) key = 'cauli_rice';
        else if (c.starch_pasta) key = 'veg_noodles';
        else if (c.starch_bread) key = 'protein_breakfast';
        else if (c.starch_potato) key = 'cauli_mash';
        else if (c.breakfast_cereal) key = 'yoghurt_nuts';
        else if (c.chips_snack) key = 'crunchy_veg';
        else if (c.sweet_sauce) key = 'herb_dip';
        else if (c.legumes || c.sweet_potato || c.wholegrain_pasta) key = 'legumes_portion';
        else if (c.plain_yoghurt_quark || c.cheese || f.sugarMatters || f.sweetener) key = 'plain_version';
        else key = 'whole_food_choice';
        const t = ALT[key];
        return {key, text: {en: t.en, de: t.de, es: t.es}, portionG: t.portionG, products: []};
    }

    function assess(x) {
        const f = facts(x);
        const quality = assessQuality(f);
        const cravings = assessCravings(f);
        const personal = personalVerdict(f.verdict, cravings);
        const r = composeReasons(f, quality, cravings);
        return {version: VERSION, quality, cravings, satiety: cravings.satiety, personal, reasonKeys: r.reasonKeys, reasons: r.reasons,
            alternative: betterAlternative(f, personal.verdict)};
    }

    return {VERSION, TEXT, ALT, ORDER, facts, assessQuality, assessCravings, personalVerdict, composeReasons, betterAlternative, assess, text};
});
