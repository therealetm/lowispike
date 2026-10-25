/* LOWiSPIKE food knowledge: Master Knowledge v3 in code (data/food-policy/master-knowledge.v3.md).
   One verdict for one food on every surface. The photo scan, a typed meal, the food database and the grocery list all
   ask the same policy engine (LowiFoodPolicy.rateName for names, applyPolicy for labelled products), so the same food
   gets the same JA / SELTEN / NEIN everywhere.
   The verdict block: every scanner answer ends with a small machine-readable block. The app reads it to colour the
   bubble and feed Misty, so nothing is guessed from the prose. Anti-cheat: the block can only make a verdict stricter.
   If the model's block is looser than what the app works out from the same foods, the app's verdict wins. */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiFoodKnowledge = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
    'use strict';
    const Policy = (typeof module === 'object' && module.exports && typeof require === 'function')
        ? require('./food-policy-core.js') : (root && root.LowiFoodPolicy);

    const VERSION = 'master-knowledge.v3';
    const RANK = {JA: 0, SELTEN: 1, NEIN: 2};
    const LIGHT = {JA: 'green', SELTEN: 'yellow', NEIN: 'red'};
    const FROM_LIGHT = {green: 'JA', yellow: 'SELTEN', red: 'NEIN'};
    /* One verdict per food, three tiers, the same words everywhere in the app (24 Oct 2026, Emmanuel: "It says spike, but then it
       tells the person they can eat it sometimes ... what is sometimes?"). No frequency: SELTEN is about the amount, never "now and
       then". Internal codes stay JA / SELTEN / NEIN. TIERS holds the names, the one-line meaning and the "eating it anyway" line,
       reusing wording the app already had ("Eating it anyway? Then move right after.", "a square or two after a meal"). */
    const TIERS = {
        en: {JA: {name: 'Everyday', sub: 'A good everyday choice'},
            SELTEN: {name: 'Small portion', sub: 'Stick to the portion, best with a meal'},
            NEIN: {name: 'Skip it', sub: 'Not a LOWiSPIKE choice. Pick a swap', subSpike: 'Higher spike estimate. Pick a swap'},
            anyway: 'Eating it anyway? Right after a meal, never on its own, then a ten-minute walk.'},
        de: {JA: {name: 'Alltag', sub: 'Gute Alltagswahl'},
            SELTEN: {name: 'Kleine Portion', sub: 'Bei der Portion bleiben, am besten zu einer Mahlzeit'},
            NEIN: {name: 'Lieber nicht', sub: 'Keine LOWiSPIKE-Wahl. Nimm lieber einen Tausch', subSpike: 'Höhere Spike-Schätzung. Nimm lieber einen Tausch'},
            anyway: 'Isst du es trotzdem? Direkt nach einer Mahlzeit, nie allein, danach zehn Minuten gehen.'},
        es: {JA: {name: 'Diario', sub: 'Buena opción para el día a día'},
            SELTEN: {name: 'Porción pequeña', sub: 'Quédate en la porción, mejor con una comida'},
            NEIN: {name: 'Mejor no', sub: 'No es una opción LOWiSPIKE. Elige un cambio', subSpike: 'Estimación de pico más alta. Elige un cambio'},
            anyway: '¿Te lo comes igual? Justo después de comer, nunca solo, y luego camina diez minutos.'}
    };
    const LABELS = {
        en: {JA: 'EVERYDAY', SELTEN: 'SMALL PORTION', NEIN: 'SKIP IT'},
        de: {JA: 'ALLTAG', SELTEN: 'KLEINE PORTION', NEIN: 'LIEBER NICHT'},
        es: {JA: 'DIARIO', SELTEN: 'PORCIÓN PEQUEÑA', NEIN: 'MEJOR NO'}
    };
    /* The spike estimate as a tier: a higher estimate is never milder than Skip it, a moderate one never milder than Small portion. */
    const IMPACT_TIER = {lower: 'JA', moderate: 'SELTEN', higher: 'NEIN'};
    const tierFor = (verdict, impact) => { const i = IMPACT_TIER[impact] || null; return !verdict ? i : !i ? verdict : RANK[i] > RANK[verdict] ? i : verdict; };
    const LIGHT_WORD = {
        en: {green: 'GREEN', yellow: 'YELLOW', red: 'RED'},
        de: {green: 'GRÜN', yellow: 'GELB', red: 'ROT'},
        es: {green: 'VERDE', yellow: 'AMARILLO', red: 'ROJO'}
    };
    const R = (en, de, es) => ({en, de, es});
    const REASON = {
        'policy.pork': R('Pork is not a LOWiSPIKE protein', 'Schwein ist kein LOWiSPIKE-Eiweiß', 'El cerdo no es una proteína LOWiSPIKE'),
        'policy.alcohol': R('Alcohol is not part of LOWiSPIKE', 'Alkohol gehört nicht zu LOWiSPIKE', 'El alcohol no forma parte de LOWiSPIKE'),
        'policy.sugar_drink': R('Sweet drink: liquid sugar', 'Süßes Getränk: flüssiger Zucker', 'Bebida dulce: azúcar líquido'),
        'policy.juice': R('Juice: fruit sugar without the fibre', 'Saft: Fruchtzucker ohne Ballaststoffe', 'Zumo: azúcar de fruta sin fibra'),
        'policy.smoothie': R('Smoothie: blended fruit, less fibre than whole fruit', 'Smoothie: püriertes Obst, weniger Ballaststoffe als ganzes Obst', 'Batido: fruta triturada, menos fibra que la fruta entera'),
        'policy.candy_dessert': R('Sweets or dessert with sugar', 'Süßes oder Dessert mit Zucker', 'Dulce o postre con azúcar'),
        'policy.coated_nuts': R('Coated or sweetened nuts', 'Umhüllte oder gesüßte Nüsse', 'Frutos secos rebozados o dulces'),
        'policy.starch_staple': R('Rice, bread, pasta or potato: a big starch load', 'Reis, Brot, Nudeln oder Kartoffel: viel Stärke', 'Arroz, pan, pasta o patata: mucho almidón'),
        'policy.starch_grain': R('Grain or starchy base: lots of carbohydrate', 'Getreide oder Stärkebasis: viele Kohlenhydrate', 'Cereal o base de almidón: muchos carbohidratos'),
        'policy.sugar': R('Sugar or syrup: added sugar', 'Zucker oder Sirup: zugesetzter Zucker', 'Az\u00facar o sirope: az\u00facar a\u00f1adido'),
        'policy.sweet_fruit': R('Very sweet fruit: a lot of sugar at once', 'Sehr süßes Obst: viel Zucker auf einmal', 'Fruta muy dulce: mucho azúcar de golpe'),
        'policy.breaded': R('Breaded or fried: a crust of fast starch', 'Paniert oder frittiert: eine Hülle aus schneller Stärke', 'Rebozado o frito: una capa de almidón rápido'),
        'policy.chips_snack': R('Chips or crackers: processed starch', 'Chips oder Cracker: verarbeitete Stärke', 'Patatas fritas o galletas saladas: almidón procesado'),
        'policy.sweet_sauce': R('Sweet sauce or spread: hidden sugar', 'Süße Soße oder Aufstrich: versteckter Zucker', 'Salsa o crema dulce: azúcar oculto'),
        'policy.wholegrain_pasta': R('Whole-grain or legume pasta: still a lot of carbs', 'Vollkorn- oder Hülsenfrucht-Nudeln: trotzdem viele Kohlenhydrate', 'Pasta integral o de legumbres: sigue teniendo muchos carbohidratos'),
        'policy.legumes': R('Legumes: good, but still carbohydrate', 'Hülsenfrüchte: gut, aber trotzdem Kohlenhydrate', 'Legumbres: buenas, pero siguen siendo carbohidratos'),
        'policy.sweet_potato': R('Sweet potato: a controlled portion only', 'Süßkartoffel: nur eine kontrollierte Portion', 'Boniato: solo una porción controlada'),
        'policy.processed_meat': R('Processed meat: check what was added', 'Verarbeitetes Fleisch: Zutaten prüfen', 'Carne procesada: revisa lo añadido'),
        'policy.protein_product': R('Protein product: processed, check the label', 'Proteinprodukt: verarbeitet, Etikett prüfen', 'Producto proteico: procesado, revisa la etiqueta'),
        'policy.sweet_salty': R('Sweet and salty snack', 'Süß-salziger Snack', 'Snack dulce y salado'),
        'policy.fruit_whole': R('Whole fruit: a small portion', 'Ganzes Obst: eine kleine Portion', 'Fruta entera: una porción pequeña'),
        'policy.berries_large': R('Berries: a bowlful is more sugar than a handful', 'Beeren: eine Schüssel ist mehr Zucker als eine Handvoll', 'Frutos rojos: un bol es más azúcar que un puñado'),
        'ja.milk': R('A splash of milk, no sugar added', 'Ein Schuss Milch ohne Zuckerzusatz', 'Un chorrito de leche sin az\u00facar a\u00f1adido'),
        'policy.milk_glass': R('Milk by the glass: a lot of milk sugar as a drink', 'Milch im Glas: viel Milchzucker als Getr\u00e4nk', 'Leche por vaso: mucho az\u00facar de la leche al beberla'),
        'policy.halloumi': R('Halloumi: salty and rich, keep the portion small', 'Halloumi: salzig und reichhaltig, kleine Portion', 'Halloumi: salado y contundente, porción pequeña'),
        'policy.nut_butter': R('Nut butter: one spoon fits, the jar goes fast', 'Nussmus: ein Löffel passt, das Glas ist schnell leer', 'Crema de frutos secos: una cucharada vale, el bote vuela'),
        'policy.nuts_large': R('Nuts: a big portion is a lot of energy', 'Nüsse: eine große Portion ist viel Energie', 'Frutos secos: una porción grande es mucha energía'),
        'policy.cheese_large': R('Cheese: a big portion is a lot of energy', 'Käse: eine große Portion ist viel Energie', 'Queso: una porción grande es mucha energía'),
        'ja.eggs': R('Eggs: protein and fat', 'Eier: Eiweiß und Fett', 'Huevos: proteína y grasa'),
        'ja.poultry': R('Chicken or turkey: lean protein', 'Hähnchen oder Pute: mageres Eiweiß', 'Pollo o pavo: proteína magra'),
        'ja.lean_beef': R('Beef, lamb or veal: unprocessed protein', 'Rind, Lamm oder Kalb: unverarbeitetes Eiweiß', 'Ternera, cordero: proteína sin procesar'),
        'ja.fish': R('Fish or seafood: protein', 'Fisch oder Meeresfrüchte: Eiweiß', 'Pescado o marisco: proteína'),
        'ja.nonstarchy_veg': R('Vegetables without starch', 'Gemüse ohne Stärke', 'Verdura sin almidón'),
        'ja.whole_food_fat': R('Natural fat in a normal amount', 'Natürliches Fett in normaler Menge', 'Grasa natural en cantidad normal'),
        'ja.plain_yoghurt_quark': R('Plain yoghurt, quark or skyr without sugar', 'Naturjoghurt, Quark oder Skyr ohne Zucker', 'Yogur natural, quark o skyr sin azúcar'),
        'ja.unsweetened_drink': R('Water, tea or coffee without sugar', 'Wasser, Tee oder Kaffee ohne Zucker', 'Agua, té o café sin azúcar'),
        'ja.plant_protein': R('Tofu or tempeh: plant protein', 'Tofu oder Tempeh: pflanzliches Eiweiß', 'Tofu o tempeh: proteína vegetal'),
        'ja.fresh_cheese': R('Fresh cheese without sugar', 'Frischkäse ohne Zucker', 'Queso fresco sin azúcar'),
        'ja.berries_small': R('Berries in a small handful', 'Beeren, eine kleine Handvoll', 'Frutos rojos, un puñado pequeño'),
        'ja.nuts_moderate': R('Plain nuts or seeds, a small handful', 'Naturbelassene Nüsse oder Samen, eine kleine Handvoll', 'Frutos secos o semillas naturales, un puñado pequeño'),
        'ja.cheese_moderate': R('Cheese in a moderate amount', 'Käse in moderater Menge', 'Queso en cantidad moderada'),
        'glucose.high': R('A lot of fast carbohydrate on the plate', 'Viele schnelle Kohlenhydrate auf dem Teller', 'Muchos carbohidratos rápidos en el plato'),
        'glucose.mid': R('Some carbohydrate: keep the portion small', 'Etwas Kohlenhydrate: Portion klein halten', 'Algo de carbohidratos: porción pequeña'),
        'unknown': R('Not sure what is in it, so this is provisional', 'Nicht sicher, was drin ist, daher vorläufig', 'No es seguro qué lleva, así que es provisional')
    };

    const lang = l => (/^de/i.test(l || '') ? 'de' : /^es/i.test(l || '') ? 'es' : 'en');
    const label = (verdict, l) => (LABELS[lang(l)] || LABELS.en)[verdict] || '';
    const tier = (verdict, l) => ((TIERS[lang(l)] || TIERS.en)[verdict]) || null;
    const tierName = (verdict, l) => (tier(verdict, l) || {}).name || '';
    const anywayLine = l => (TIERS[lang(l)] || TIERS.en).anyway;
    const lightWord = (light, l) => (LIGHT_WORD[lang(l)] || LIGHT_WORD.en)[light] || '';
    const reasonText = (id, l) => { const r = REASON[id]; return r ? r[lang(l)] || r.en : ''; };
    const stricter = (a, b) => (!a ? b : !b ? a : RANK[b] > RANK[a] ? b : a);
    function gramsOf(portion) {
        const m = String(portion || '').match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramm|grams?|gramos?|ml)\b/i);
        return m ? parseFloat(m[1].replace(',', '.')) : null;
    }

    /* One food by name. Returns {name, verdict|null, rules, reason} */
    function rateFood(name, grams, l) {
        const P = Policy || (root && root.LowiFoodPolicy);
        const r = P && P.rateName ? P.rateName(name, grams) : {verdict: null, rules: []};
        return {name: String(name || ''), verdict: r.verdict, rules: r.rules, reason: r.rules.length ? reasonText(r.rules[0], l) : ''};
    }

    /* A meal: the dishes the photo scan saw (or a typed meal), plus the blood sugar estimate from their carbs.
       Strictest dish wins. A high estimate makes it NEIN, a medium one at least SELTEN. A dish we do not know with
       real carbs in it makes the meal provisional SELTEN (honest uncertainty, Master Knowledge section 25). */
    function rateMeal(dishes, bs, l) {
        const list = (dishes || []).filter(d => d && d.name);
        const rated = list.map(d => {
            const f = rateFood(d.name, d.grams != null ? d.grams : gramsOf(d.portion), l);
            return Object.assign(f, {count: Math.max(1, Math.round(+d.count || 1)), carbs: +d.carbs || 0});
        });
        let verdict = null, rule = null, provisional = false;
        for (const f of rated) if (f.verdict && (!verdict || RANK[f.verdict] > RANK[verdict])) { verdict = f.verdict; rule = f.rules[0]; }
        const level = bs && bs.level;
        if (level === 'high' && verdict !== 'NEIN') { verdict = 'NEIN'; rule = 'glucose.high'; }
        if (level === 'mid' && (!verdict || verdict === 'JA')) { verdict = 'SELTEN'; rule = 'glucose.mid'; }
        const unknownCarbs = rated.filter(f => !f.verdict).reduce((s, f) => s + f.carbs, 0);
        if (!verdict || (verdict === 'JA' && unknownCarbs >= 15)) { verdict = 'SELTEN'; rule = 'unknown'; provisional = true; }
        const score = bs && isFinite(bs.score) ? Math.max(0, Math.min(100, Math.round(bs.score))) : {low: 14, mid: 45, high: 74}[level] != null ? {low: 14, mid: 45, high: 74}[level] : null;
        return {verdict, light: LIGHT[verdict], label: label(verdict, l), rule, reason: reasonText(rule, l), provisional,
            spike: level || null, score, dishes: rated};
    }

    /* ---------- the verdict block ---------- */
    const OPEN = '<lowispike>', CLOSE = '</lowispike>';
    function block(meal, confidence) {
        return {v: 1, light: meal.light, verdict: meal.verdict, score: meal.score, spike: meal.spike,
            counted: (meal.dishes || []).map(d => ({item: d.name.slice(0, 60), count: d.count})),
            confidence: confidence || (meal.provisional ? 'low' : 'medium'), rule: meal.rule};
    }
    const format = b => OPEN + JSON.stringify(b) + CLOSE;
    /* Reads a block from an answer: the tagged text form, a ```lowispike fence, or an object. Returns a clean block or
       null. Anything malformed or contradictory is rejected, never repaired into a friendlier verdict. */
    function parse(input) {
        let o = input;
        if (typeof input === 'string') {
            const m = input.match(/<lowispike>\s*([\s\S]*?)\s*<\/lowispike>/i) || input.match(/```lowispike\s*([\s\S]*?)```/i);
            if (!m) return null;
            try { o = JSON.parse(m[1]); } catch (e) { return null; }
        }
        if (o && typeof o === 'object' && o.lowispike && typeof o.lowispike === 'object') o = o.lowispike;
        if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
        let verdict = o.verdict ? String(o.verdict).toUpperCase() : null;
        const light = o.light ? String(o.light).toLowerCase() : null;
        if (verdict && !(verdict in RANK)) return null;
        if (light && !(light in FROM_LIGHT)) return null;
        if (!verdict && !light) return null;
        if (verdict && light && FROM_LIGHT[light] !== verdict) return null;
        verdict = verdict || FROM_LIGHT[light];
        let score = null;
        if (o.score != null) { score = Number(o.score); if (!isFinite(score) || score < 0 || score > 100) return null; score = Math.round(score); }
        const confidence = ['low', 'medium', 'high'].includes(String(o.confidence || '').toLowerCase()) ? String(o.confidence).toLowerCase() : 'low';
        const counted = [];
        for (const c of Array.isArray(o.counted) ? o.counted.slice(0, 12) : []) {
            if (!c || typeof c.item !== 'string' || !c.item.trim()) continue;
            const n = Number(c.count);
            if (!Number.isInteger(n) || n < 1 || n > 50) return null;
            counted.push({item: c.item.trim().slice(0, 60), count: n});
        }
        const spike = ['low', 'mid', 'high'].includes(o.spike) ? o.spike : null;
        return {v: 1, verdict, light: LIGHT[verdict], score, spike, counted, confidence};
    }
    /* Anti-cheat merge: the stricter of the model's block and the app's own verdict for the same foods. */
    function merge(model, local) {
        if (!local) return model ? Object.assign({}, model, {source: 'model'}) : null;
        if (!model) return Object.assign({}, local, {source: 'app'});
        const v = stricter(local.verdict, model.verdict);
        const out = Object.assign({}, local, {verdict: v, light: LIGHT[v]});
        out.source = v === local.verdict ? 'app' : 'model';
        out.overruled = RANK[model.verdict] < RANK[local.verdict];
        if (out.source === 'model') { out.rule = 'model'; out.reason = ''; }
        return out;
    }
    /* Scanner scale used by the scan card, the database and the grocery list: ok / better / spike. */
    const SCALE = {JA: 'ok', SELTEN: 'better', NEIN: 'spike'};

    return {VERSION, RANK, LIGHT, LABELS, TIERS, IMPACT_TIER, SCALE, label, tier, tierName, tierFor, stricter, anywayLine, lightWord, reasonText, gramsOf, rateFood, rateMeal,
        block, format, parse, merge, stricter, OPEN, CLOSE};
});
