/* LOWiSPIKE blood sugar impact estimate (Oct 16, 2026; adapter onto the Food Intelligence Engine since Oct 22, queue step scanfe-b2).
   LowiSpikeCore.assess(p) keeps the shape every consumer reads: {verdict:'spike'|'better'|'ok'|'unknown', why:[[key, ...args]],
   score 0-100, est:true}, plus the engine result as `engine`. The numbers come from window.LowiFoodEngine (food-engine-core.js,
   loaded first): available carbohydrate and sugar for a real serving (manufacturer serving, else the food group's usual portion),
   never carbs minus fibre, protein or fat (spec queue/FOOD-ENGINE-SPEC.md section 5). Engine category -> verdict:
   Higher -> spike, Moderate -> better, Lower -> ok (shown as "Lower estimated blood sugar impact", never "no spike"),
   Insufficient evidence -> unknown.
   LOWiSPIKE rules from the ingredients can only make it stricter, never milder:
   - a sweetener anywhere -> spike (keeps the sweet habit; policy rule kept from LOWiSPIKE);
   - a drink with more than 5 g sugar per 100 ml -> spike (liquid sugar reaches the blood fastest);
   - added sugar in the first three ingredients with 10 g+ sugar per 100 g and 5 g+ in the serving -> one step up (Lower -> Moderate, Moderate -> Higher);
   - refined starch in the first three ingredients -> Moderate becomes Higher.
   Only ingredients and no numbers: refined starch or added sugar up front -> spike, else unknown (no estimate without numbers). */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiSpikeCore = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';
    let E0 = null;
    function engine() {
        if (E0) return E0;
        if (typeof window !== 'undefined' && window.LowiFoodEngine) return (E0 = window.LowiFoodEngine);
        if (typeof require === 'function') { try { E0 = require('./food-engine-core.js'); } catch (e) { E0 = null; } }
        return E0;
    }
    // Ingredient parser (scanfe-c): reads bracketed text too. Its hits are added to the list rules below, never replace them,
    // so a verdict can only get stricter. Policy (scanfe-d) rides along in `engine.policy` for the details; it never changes the card.
    let I0 = null, P0 = null;
    function lib(name, file) {
        if (typeof window !== 'undefined' && window[name]) return window[name];
        if (typeof require === 'function') { try { return require(file); } catch (e) { return null; } }
        return null;
    }
    const RX = {
        sweet: /sucralos|aspartam|acesulfam|stevi|erythrit|xylit|sorbit|maltit|saccharin|cyclamat|süßstoff|suessstoff|sweetener|edulcorante|\be ?95[0-5]\b|\be ?96[0-9]\b/,
        addedSugar: /zucker|sugar|sirup|syrup|dextros|glukose|glucose|fruktose|fructose|honig|honey|maltodextrin|saccharose|azúcar|azucar|melasse|molasses|invert|agave|karamell|caramel/,
        noSugar: /ohne zucker|no added sugar|sin azúcar|sin azucar|zuckerfrei|sugar free|ohne zuckerzusatz/,
        refined: /puffreis|puffed|reis|\brice\b|arroz|(?<!vollkorn|mandel|kokos|lupinen|kichererbsen|linsen)mehl|(?<!whole ?wheat |wholemeal |almond |coconut )flour|harina(?! integral)|weizen(?!vollkorn)|wheat(?! ?germ)|grieß|griess|semolina|kartoffel|potato|patata|stärke|staerke|starch|almidón|almidon|maltodextrin|cornflakes|\bmais\b|\bcorn\b|maize|maíz/,
        whole: /vollkorn|whole ?grain|wholegrain|wholemeal|whole ?wheat|integral|hafer|\boats?\b|avena|haferflocken|linsen|lentil|bohnen|beans?\b|kichererbs|chickpea|quinoa|buchweizen|buckwheat/,
        veg: /gemüse|gemuese|vegetable|verdura|zucchini|paprika|tomate|tomato|aubergine|brokkoli|broccoli|spinat|zwiebel|onion|karotte|möhre|carrot|bohne|pilz|mushroom/
    };
    function list(txt) {
        return String(txt || '').toLowerCase().replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').split(/[,;•·]|\.\s/)
            .map(s => s.replace(/[_*:]/g, ' ').replace(/\d+([.,]\d+)?\s*%/g, '').trim()).filter(s => s.length > 1);
    }
    function find(L, rx, from, to, skip) {
        for (let i = from; i < Math.min(to, L.length); i++) { if (skip && skip.test(L[i])) continue; if (rx.test(L[i])) return {i, w: L[i].slice(0, 40)}; }
        return null;
    }
    const n = v => (typeof v === 'number' && isFinite(v) ? v : null);
    // packG(q): the pack weight in grams from the label quantity ("500g", "500 g", "0,5 kg"); null for pieces, ml or a multipack.
    function packG(q) {
        const s = String(q || '').toLowerCase();
        if (!s || /\d\s*[x×]\s*\d/.test(s)) return null;
        const m = s.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gramm|grams?)\b/);
        if (!m) return null;
        const v = +m[1].replace(',', '.') * (m[2] === 'kg' ? 1000 : 1);
        return v > 0 ? v : null;
    }
    const GROUP = {snack: 'snacks', dairy: 'dairy', cereal: 'pantry', bread: 'bread', drink: 'drinks', sweets: 'sweets', staple: 'pantry'};
    const TO_VERDICT = {higher: 'spike', moderate: 'better', lower: 'ok', insufficient: 'unknown'};
    const UP = {lower: 'moderate', moderate: 'higher', higher: 'higher'};
    function scoreOf(key, carbs, sugar) {
        const c = carbs || 0, s = sugar || 0;
        if (key === 'higher') return Math.max(60, Math.min(100, Math.round(60 + Math.max(c - 30, 0) + Math.max(s - 15, 0))));
        if (key === 'moderate') return Math.max(30, Math.min(59, Math.round(30 + (c - 10) * 1.4 + s * 0.3)));
        return Math.max(2, Math.min(29, Math.round(2 + c * 2.2 + s * 0.4)));
    }
    // opts.servingG (scanfe-g2): the amount the user picked on the card (g or ml). It wins over the manufacturer serving
    // and the group portion; without it the default stays manufacturer serving, else the group's usual portion.
    // portionGroup (Oct 26 scan-why, Emmanuel's almonds: "Mandeln Stifte" read Moderate at an invented 50 g): a product with no
    // shelf category of its own used the 50 g "other" portion, and a hard cheese the 150 g of a yoghurt pot. The food policy's own
    // usual portion for plain nuts and for cheese is 30 g (nuts_large / cheese_large fire above it), so the rating, the Details
    // portion and the Food check now agree: a small handful of almonds is Lower, 50 g of them is still Moderate.
    // 'nuts' rates with the engine's 30 g snacks portion; 'cheese' is an engine group (30 g) already.
    function portionGroup(p, group) {
        if (group !== 'other' && group !== 'snacks' && group !== 'dairy') return group;
        P0 = P0 || lib('LowiFoodPolicy', './food-policy-core.js');
        if (!P0 || typeof P0.classify !== 'function') return group;
        let c = null;
        try { c = P0.classify({name: p.name, categories: p.categories || []}); } catch (e) { c = null; }
        if (!c) return group;
        const sweet = c.candy_dessert || c.coated_nuts || c.sweet_salty || c.chips_snack || c.breakfast_cereal || c.protein_product || c.sugar_drink || c.sweet_sauce ||
            c.starch_bread || c.starch_pasta || c.starch_potato || c.starch_rice || c.processed_meat;
        if (c.nuts && !sweet && group !== 'dairy') return 'nuts';
        if (c.cheese && !c.fresh_cheese && !sweet) return 'cheese';
        return group;
    }
    function assess(p, opts) {
        p = p || {};
        const userG = opts && n(opts.servingG) > 0 ? n(opts.servingG) : null;
        const E = engine();
        const f = p.facts || {}, L = list(p.ingredients), hasI = L.length > 0;
        const c = n(f.c), s = n(f.s);
        const hasN = c != null || s != null;
        const veg = hasI && find(L, RX.veg, 0, 2);
        const drink = (p.cat === 'drink' || !!f.drink) && !veg;
        if (!hasI && !hasN) return {verdict: 'unknown', why: [], score: null, est: true};
        I0 = I0 || lib('LowiIngredients', './ingredient-core.js');
        const A = I0 && hasI ? I0.analyzeIngredients(p.ingredients, {name: p.name}) : null;
        const AS = A && A.summary ? A.summary : {};
        const sweet = hasI ? (find(L, RX.sweet, 0, 99) || AS.sweetenerHit || null) : null;
        const sugarTop = hasI ? (find(L, RX.addedSugar, 0, 3, RX.noSugar) || AS.addedSugarTop || null) : null;
        const refinedTop = hasI ? (find(L, RX.refined, 0, 3) || AS.refinedTop || null) : null;
        const wholeTop = hasI ? find(L, RX.whole, 0, 3) : null;
        const refined = !!refinedTop && !(wholeTop && /vollkorn|whole|integral/.test(refinedTop.w));
        const why = [];
        if (sweet) why.push(['s_sweet', sweet.w]);
        if (!hasN || !E) {
            // No numbers (or the engine file is missing): no estimate, only the ingredient rules can say spike.
            const bad = sweet || (refined && refinedTop) || sugarTop;
            if (!sweet && refined) why.push(['s_refined_i', refinedTop.w]);
            if (!sweet && sugarTop) why.push(['s_sugar_i', sugarTop.w]);
            if (!bad) return {verdict: 'unknown', why: [['e_nodata']], score: null, est: true};
            return {verdict: 'spike', why: why.slice(0, 4), score: sweet ? 60 : 65, est: true};
        }
        const per100 = {carbs: c, sugar: s, fibre: n(f.f), protein: n(f.p), fat: n(f.fat), kcal: n(f.kcal)};
        const unit = drink ? 'ml' : 'g';
        const nutrition = E.validateNutrition(per100, unit);
        const group = portionGroup(p, drink ? 'drinks' : (veg && p.cat === 'drink' ? 'other' : GROUP[p.cat] || 'other'));
        const serving = E.calculateServing(nutrition, {manufacturerG: n(f.sv), packG: packG(f.q), userG, group: group === 'nuts' ? 'snacks' : group});
        const glucose = E.estimateGlucoseImpact({serving, category: {liquid: drink}});
        let key = glucose.key;
        const sg = serving.amounts.sugar, cg = serving.amounts.carbs;
        if (key !== 'insufficient') {
            if (sweet) key = 'higher';
            if (drink && (s || 0) > 5) { if (!sweet) why.unshift(['s_liquid', s]); key = 'higher'; }
            if (sugarTop && (s || 0) >= 10 && (sg || 0) >= 5) { key = UP[key]; why.push(['s_sugar_top', sugarTop.w, s]); }
            if (refined && key === 'moderate') { key = 'higher'; why.push(['s_refined_i', refinedTop.w]); }
        } else if (sweet) key = 'higher';
        const verdict = TO_VERDICT[key] || 'unknown';
        if (glucose.key === 'insufficient') why.push([glucose.reasons[0] === 'label_inconsistent' ? 'e_bad' : 'e_nodata']);
        else {
            if (cg != null) why.push([unit === 'ml' ? 'e_carbs_ml' : 'e_carbs', cg, serving.g]);
            if (sg != null && sg >= 5) why.push(['e_sugar', sg]);
            if (glucose.modifiers.some(m => /protein|fat|fibre/.test(m))) why.push(['e_slow']);
            why.push(['e_est']);
        }
        const score = verdict === 'unknown' ? null : scoreOf(key, cg, sg);
        const out = {verdict, why: why.slice(0, 4), score, est: true};
        P0 = P0 || lib('LowiFoodPolicy', './food-policy-core.js');
        let policy = null;
        if (P0) {
            try { policy = P0.applyPolicy({product: {name: p.name, unit, per100, categories: p.categories || []}, ingredients: A || undefined, glucose, serving}); } catch (e) { policy = null; }
        }
        // Confidence (scanfe-f1): evidence completeness only (identity, ingredients, label). Rides along for the result card (g1).
        let confidence = null;
        if (typeof E.assessConfidence === 'function') {
            try { confidence = E.assessConfidence({name: p.name, barcode: p.barcode, unit, per100, ingredients: p.ingredients}, {nutrition, ingredients: A}); } catch (e) { confidence = null; }
        }
        const ingredients = A ? {status: A.status, allergens: A.allergens, claims: A.claims, summary: AS} : {status: hasI ? 'complete' : 'missing', allergens: [], claims: []};
        Object.defineProperty(out, 'engine', {value: {version: E.VERSION, bands: E.BANDS.version, key, glucose, serving: {g: serving.g, unit: serving.unit, source: serving.source, group, shown: serving.shown}, valid: nutrition.valid, issues: nutrition.issues, ingredients, policy: policy && {verdict: policy.verdict, version: policy.policyVersion, decidedBy: policy.decidedBy, why: policy.why, provisional: policy.provisional}, confidence: confidence && confidence.level, confidenceInfo: confidence}, enumerable: false});
        return out;
    }
    const TX = {
        e_carbs: ['{0} g carbs in a {1} g serving', '{0} g Kohlenhydrate in einer Portion von {1} g', '{0} g de carbohidratos en una ración de {1} g'],
        e_carbs_ml: ['{0} g carbs in a {1} ml serving', '{0} g Kohlenhydrate in einer Portion von {1} ml', '{0} g de carbohidratos en una ración de {1} ml'],
        e_sugar: ['{0} g of that is sugar', 'Davon {0} g Zucker', 'De ellos, {0} g son azúcar'],
        e_slow: ['Protein, fat or fibre may slow it down, but they don\'t cancel the carbs', 'Eiweiß, Fett oder Ballaststoffe können es bremsen, heben die Kohlenhydrate aber nicht auf', 'La proteína, la grasa o la fibra pueden frenarlo, pero no anulan los carbohidratos'],
        e_est: ['An estimate from the label; your own response can differ', 'Eine Schätzung nach dem Etikett; deine Reaktion kann anders sein', 'Una estimación según la etiqueta; tu respuesta puede ser distinta'],
        e_nodata: ['The label lacks the carb numbers needed for an estimate', 'Dem Etikett fehlen die Kohlenhydratangaben für eine Schätzung', 'A la etiqueta le faltan los carbohidratos para poder estimar'],
        e_bad: ['The label numbers don\'t add up, so there\'s no estimate', 'Die Etikettwerte passen nicht zusammen, darum keine Schätzung', 'Los datos de la etiqueta no cuadran, así que no hay estimación'],
        s_sweet: ['Has a sweetener ({0}): keeps the sweet craving going and can still raise insulin', 'Enthält Süßstoff ({0}): hält die Lust auf Süßes wach und kann trotzdem Insulin anheben', 'Lleva edulcorante ({0}): mantiene las ganas de dulce y puede subir la insulina'],
        s_liquid: ['Liquid sugar, {0} g per 100 ml: it reaches the blood fastest', 'Flüssiger Zucker, {0} g pro 100 ml: geht am schnellsten ins Blut', 'Azúcar líquido, {0} g por 100 ml: llega a la sangre más rápido'],
        s_sugar_top: ['Added sugar is one of the first ingredients ({0}), {1} g sugar per 100 g', 'Zugesetzter Zucker steht weit vorne ({0}), {1} g Zucker pro 100 g', 'Azúcar añadido entre los primeros ingredientes ({0}), {1} g por 100 g'],
        s_refined: ['Fast starch up front ({0}), {1} g net carbs per 100 g', 'Schnelle Stärke weit vorne ({0}), {1} g Netto-Kohlenhydrate pro 100 g', 'Almidón rápido al principio ({0}), {1} g de carbohidratos netos por 100 g'],
        s_sugar: ['{0} g sugar per 100 g', '{0} g Zucker pro 100 g', '{0} g de azúcar por 100 g'],
        s_carbs: ['High carb load: {0} g net carbs per 100 g', 'Hohe Kohlenhydratlast: {0} g netto pro 100 g', 'Mucha carga de carbohidratos: {0} g netos por 100 g'],
        s_low: ['Low carb load: {0} g net carbs, {1} g sugar per 100 g', 'Geringe Kohlenhydratlast: {0} g netto, {1} g Zucker pro 100 g', 'Poca carga: {0} g de carbohidratos netos, {1} g de azúcar por 100 g'],
        s_whole: ['Whole grain ({0}) with {1} g fibre slows the sugar down', 'Vollkorn ({0}) mit {1} g Ballaststoffen bremst den Zucker', 'Integral ({0}) con {1} g de fibra frena el azúcar'],
        s_fibrerich: ['Lots of fibre ({0} g per 100 g) and little sugar slow the carbs down', 'Viele Ballaststoffe ({0} g pro 100 g) und wenig Zucker bremsen die Kohlenhydrate', 'Mucha fibra ({0} g por 100 g) y poco az\u00facar frenan los carbohidratos'],
        s_moderate: ['Moderate carbs ({0} g net per 100 g), balanced by protein, fat or fibre', 'Mäßige Kohlenhydrate ({0} g netto pro 100 g), ausgeglichen durch Eiweiß, Fett oder Ballaststoffe', 'Carbohidratos moderados ({0} g netos por 100 g), equilibrados con proteína, grasa o fibra'],
        s_natural: ['The {0} g sugar is natural (no added sugar in the ingredients)', 'Die {0} g Zucker sind natürlich (kein zugesetzter Zucker in den Zutaten)', 'Los {0} g de azúcar son naturales (sin azúcar añadido)'],
        s_fibre: ['{0} g fibre per 100 g', '{0} g Ballaststoffe pro 100 g', '{0} g de fibra por 100 g'],
        s_protein: ['{0} g protein per 100 g', '{0} g Eiweiß pro 100 g', '{0} g de proteína por 100 g'],
        s_refined_i: ['Fast starch up front ({0})', 'Schnelle Stärke weit vorne ({0})', 'Almidón rápido al principio ({0})'],
        s_sugar_i: ['Added sugar up front ({0})', 'Zugesetzter Zucker weit vorne ({0})', 'Azúcar añadido al principio ({0})'],
        s_whole_i: ['Whole grain up front ({0})', 'Vollkorn weit vorne ({0})', 'Integral al principio ({0})'],
        s_clean_i: ['No added sugar or refined starch up front', 'Kein zugesetzter Zucker, keine raffinierte Stärke vorne', 'Sin azúcar añadido ni almidón refinado al principio'],
        c_no: ['Food check: Not insulin-friendly', 'Food-Check: Nicht insulinfreundlich', 'Análisis del alimento: No apto para la insulina'],
        c_rare: ['Food check: Not insulin-friendly', 'Food-Check: Nicht insulinfreundlich', 'Análisis del alimento: No apto para la insulina']
    };
    function text(w, li) {
        const k = w && w[0], row = TX[k]; if (!row) return '';
        const L = li || 0, args = w.slice(1);
        return (row[L] || row[0]).replace(/\{(\d)\}/g, (m, i) => {
            const a = args[+i]; if (typeof a === 'number') return String(Math.round(a * 10) / 10).replace('.', L ? ',' : '.');
            const s = String(a == null ? '' : a); return s.charAt(0).toUpperCase() + s.slice(1);
        });
    }
    /* foodVerdict (scanfe-h, Oct 23, 2026): the one verdict every consumer reads (Shuffle, Throw out, Buy picks, shopping
       matches, stored dex rows). It is the blood sugar estimate above made stricter by the Food check card (LowiFoodEngine.scanFood,
       the same call the card makes at the same serving): NEIN -> spike, SELTEN -> at least better, JA keeps the estimate.
       It can only get stricter, never milder. Without label numbers the estimate stays unknown, unless the ingredient
       rules already say spike. Returns 'ok' | 'better' | 'spike' | 'unknown'. Bug it fixes: the card said NO for
       Ültje Süß & Salzig (sugar heavy) or cooked ham (pork) while Shuffle still used them as "Now and then" / "Low-spike". */
    const RANK = {ok: 0, better: 1, spike: 2};
    const FROM_CHECK = {JA: 'ok', SELTEN: 'better', NEIN: 'spike'};
    function checkOf(p, a) {
        const E = engine(), eng = a && a.engine;
        if (!E || typeof E.scanFood !== 'function' || !eng || !eng.serving || eng.serving.g == null) return null;
        const f = p.facts || {};
        const per100 = {carbs: n(f.c), sugar: n(f.s), fibre: n(f.f), protein: n(f.p), fat: n(f.fat), kcal: n(f.kcal)};
        if (n(f.salt) != null) per100.salt = n(f.salt);
        try {
            const o = E.scanFood({name: p.name, brand: p.brand, barcode: p.barcode, unit: eng.serving.unit, per100, ingredients: p.ingredients || '', categories: p.categories || []}, eng.serving.g);
            return o && FROM_CHECK[o.verdict] ? o.verdict : null;
        } catch (e) { return null; }
    }
    // tighten(p, a): the same, for an assess(p) result a consumer already has (scan-sort gets it from the scanner's rate()).
    function tighten(p, a) {
        if (!p || typeof p !== 'object' || p.notFound) return 'unknown';
        const v = a && RANK[a.verdict] != null ? a.verdict : 'unknown';
        if (v === 'unknown') return 'unknown';
        const c = checkOf(p, a), cv = c ? FROM_CHECK[c] : null;
        return cv && RANK[cv] > RANK[v] ? cv : v;
    }
    function foodVerdict(p, opts) {
        if (!p || typeof p !== 'object' || p.notFound) return 'unknown';
        let a; try { a = assess(p, opts); } catch (e) { return 'unknown'; }
        return tighten(p, a);
    }
    /* rerate (scanfe-h6, Oct 23, 2026): stored dex rows (Dex grid, My catches, Community products) carry the verdict they got
       when they were caught, often before the Food check existed. Bug it fixes: cooked ham caught last week still showed "ok"
       in the Dex although the card says NO. rerate(p) returns the stored verdict made stricter by foodVerdict: only ever
       stricter (ok -> better -> spike, unknown -> spike only), manual entries keep their own rating, not-found rows keep the
       stored verdict, nothing is guessed (no label data = stays as stored). rerateRows(rows) applies it in place and adds one
       Food check reason to `why`; returns how many rows changed. */
    const isManual = p => !!(p.manual || p.source === 'manual');
    function judge(p, opts) {
        const v = RANK[p.verdict] != null ? p.verdict : 'unknown', keep = {verdict: v, why: null};
        if (p.notFound || isManual(p)) return keep;
        let a; try { a = assess(p, opts); } catch (e) { return keep; }
        const f = tighten(p, a);
        if (RANK[f] == null || f === v) return keep;
        /* 26 Oct 2026 (Emmanuel's Products Shuffle): a verdict this rerate made itself (rerated rows) follows the Food check
           both ways, so a policy fix reaches rows it tightened before: "Frische Hamburger vom Rind" and "Sushi Nori" were
           rerated to spike when the check read them as bread and rice. Verdicts from the day of the catch stay never-milder. */
        if (p.rerated && RANK[f] < RANK[v]) return {verdict: f, why: a.why || []};
        if (v === 'unknown' ? f !== 'spike' : RANK[f] <= RANK[v]) return keep;
        const c = checkOf(p, a), byCheck = c && FROM_CHECK[c] === f && RANK[f] > (RANK[a.verdict] != null ? RANK[a.verdict] : -1);
        return {verdict: f, why: byCheck ? [[c === 'NEIN' ? 'c_no' : 'c_rare']].concat(a.why || []) : (a.why || [])};
    }
    function rerate(p, opts) {
        if (!p || typeof p !== 'object') return 'unknown';
        return judge(p, opts).verdict;
    }
    function rerateRows(rows, opts) {
        let n = 0;
        (Array.isArray(rows) ? rows : []).forEach(p => {
            if (!p || typeof p !== 'object') return;
            let j; try { j = judge(p, opts); } catch (e) { return; }
            if (j.verdict === 'unknown' || j.verdict === p.verdict || !j.why) return;
            p.verdict = j.verdict; p.why = j.why; p.rerated = true; n++;
        });
        return n;
    }
    /* "looks healthy" words: spiky foods with these in the name are the ones worth warning about */
    const HEALTHY = /\bbio\b|organic|vollkorn|whole|protein|fit\b|fitness|light|natur|vegan|smoothie|granola|müsli|muesli|hafer|oat|reiswaffel|rice cake|dinkel|spelt|superfood|chia|frucht|fruit|joghurt|yogurt|zero|diet|balance|vital|integral|ecológico/i;
    const looksHealthy = p => HEALTHY.test(String((p && p.name) || '') + ' ' + String((p && p.brand) || ''));
    return {assess, foodVerdict, tighten, rerate, rerateRows, text, TX, looksHealthy, list};
});
