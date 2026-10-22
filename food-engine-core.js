/* LOWiSPIKE Food Intelligence Engine, core (queue step scanfe-b1, spec queue/FOOD-ENGINE-SPEC.md sections 4 and 5).
   Pure, node-testable UMD module: window.LowiFoodEngine. Not wired into the app yet (scanfe-b2 does that through the
   LowiSpikeCore adapter), so this file changes nothing users see.

   What b1 holds:
   - validateNutrition(per100, unit): numbers or null (never guessed), sugar <= carbs, macros <= 100 g per 100 g,
     stated kcal vs 4/4/9/2 kcal from the macros, unit g or ml. Errors make the label unusable; warnings stay usable.
   - calculateServing(nutrition, opts): serving = per100 x grams / 100. The user's grams win, then the manufacturer's
     serving, then the food group's usual portion (same portions as store-picks-core), else 100 g / 100 ml.
     Unknown stays unknown (null). Nothing is subtracted: EU carbohydrates already exclude fibre and include sugars.
   - estimateGlucoseImpact({serving, category, evidence}): a conservative, qualitative carbohydrate-exposure estimate.
     Inputs: available carbohydrate per serving (= EU label carbohydrate, never minus fibre, protein or fat), sugar per
     serving, liquid vs solid. Protein, fat and fibre are reported as modifiers that may slow absorption; they never
     lower the category. Glycemic load only when the evidence carries a credible GI with a named source (GL =
     GI x available carbs / 100); a GI is never invented and never borrowed from one ingredient of a mixed food.
     Output: Lower | Moderate | Higher | Insufficient evidence, always an estimate, never "no spike".
   The exposure bands below are provisional LOWiSPIKE policy cut-offs (version carb-bands-v1), not validated against
   measured glucose responses; they are versioned so tests and later policy work can audit them. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiFoodEngine = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    const VERSION = 'food-engine-core f1 2026-10-22';
    const NUTRIENTS = ['carbs', 'sugar', 'fibre', 'protein', 'fat', 'kcal', 'salt'];
    // Short keys used across the app (LowiSpikeCore facts, data/shop columns) map onto the engine's names.
    const ALIAS = {c: 'carbs', s: 'sugar', f: 'fibre', fiber: 'fibre', p: 'protein', k: 'kcal', energy: 'kcal'};

    // Usual portion per food group, in g (ml for drinks); same values as store-picks-core.js GROUPS.
    const GROUP_SERVING = {snacks: 30, meat: 100, fish: 100, dairy: 150, cheese: 30, veg: 100, fruit: 100, bread: 40,
        sweets: 25, drinks: 250, pantry: 50, meals: 300, other: 50};

    // Carbohydrate-exposure bands per serving (grams). Provisional, versioned, conservative: never lowered by protein,
    // fat or fibre. Liquids get stricter sugar bands because liquid sugar is absorbed fastest (spec section 5).
    const BANDS = Object.freeze({
        version: 'carb-bands-v1',
        solid: {moderateCarbs: 10, higherCarbs: 30, higherSugar: 15},
        liquid: {moderateSugar: 5, higherSugar: 10, moderateCarbs: 10, higherCarbs: 30},
        gl: {moderate: 11, higher: 20}
    });
    const CATEGORY = {lower: 'Lower', moderate: 'Moderate', higher: 'Higher', insufficient: 'Insufficient evidence'};
    const RANK = {lower: 0, moderate: 1, higher: 2};

    const num = v => (typeof v === 'number' && isFinite(v) ? v : (typeof v === 'string' && v.trim() !== '' && isFinite(+v.replace(',', '.')) ? +v.replace(',', '.') : null));
    const r1 = v => (v == null ? null : Math.round(v * 10) / 10);

    function normalize(per100) {
        const out = {};
        for (const k of NUTRIENTS) out[k] = null;
        const src = per100 || {};
        for (const key of Object.keys(ALIAS)) { const v = num(src[key]); if (v != null) out[ALIAS[key]] = v; }
        for (const key of NUTRIENTS) { const v = num(src[key]); if (v != null) out[key] = v; } // long names win
        return out;
    }

    function validateNutrition(per100, unit) {
        const issues = [];
        const u = unit === 'ml' ? 'ml' : unit === 'g' || unit == null ? 'g' : null;
        if (!u) issues.push({code: 'unit_unknown', level: 'error', unit: String(unit)});
        const v = normalize(per100);
        for (const k of NUTRIENTS) {
            if (v[k] != null && v[k] < 0) { issues.push({code: 'negative', level: 'error', nutrient: k, value: v[k]}); v[k] = null; }
        }
        if (v.sugar != null && v.carbs != null && v.sugar > v.carbs + 0.05) issues.push({code: 'sugar_over_carbs', level: 'error', sugar: v.sugar, carbs: v.carbs});
        const mass = ['carbs', 'fibre', 'protein', 'fat', 'salt'].reduce((a, k) => a + (v[k] || 0), 0);
        if (mass > 102) issues.push({code: 'macros_over_100', level: 'error', total: r1(mass)});
        if (v.kcal != null && (v.carbs != null || v.protein != null || v.fat != null)) {
            const calc = 4 * (v.carbs || 0) + 4 * (v.protein || 0) + 9 * (v.fat || 0) + 2 * (v.fibre || 0);
            const diff = Math.abs(calc - v.kcal);
            if (diff > 30 && (v.kcal === 0 || calc === 0 || calc / v.kcal < 0.7 || calc / v.kcal > 1.3)) {
                issues.push({code: 'kcal_mismatch', level: 'warn', stated: v.kcal, fromMacros: Math.round(calc)});
            }
        }
        const known = NUTRIENTS.filter(k => v[k] != null);
        const errors = issues.filter(i => i.level === 'error');
        return {
            valid: errors.length === 0,
            usable: errors.length === 0 && (v.carbs != null || v.sugar != null),
            unit: u || 'g',
            per100: v,
            missing: NUTRIENTS.filter(k => v[k] == null),
            known,
            issues
        };
    }

    function pickServing(opts, unit) {
        const o = opts || {};
        const user = num(o.userG), maker = num(o.manufacturerG);
        if (user != null && user > 0) return {g: user, source: 'user'};
        if (maker != null && maker > 0) return {g: maker, source: 'manufacturer'};
        const group = o.group || (unit === 'ml' ? 'drinks' : null);
        if (group && GROUP_SERVING[group]) return {g: GROUP_SERVING[group], source: 'group', group};
        return {g: 100, source: 'per100'};
    }

    // nutrition: a validateNutrition result, or a raw per-100 object (validated here). opts: number (grams) or
    // {userG, manufacturerG, group}.
    function calculateServing(nutrition, opts) {
        const val = nutrition && nutrition.per100 && Array.isArray(nutrition.issues) ? nutrition : validateNutrition(nutrition, nutrition && nutrition.unit);
        const pick = typeof opts === 'number' || typeof opts === 'string' ? pickServing({userG: opts}, val.unit) : pickServing(opts, val.unit);
        const amounts = {};
        for (const k of NUTRIENTS) amounts[k] = val.per100[k] == null ? null : val.per100[k] * pick.g / 100;
        const shown = {};
        for (const k of NUTRIENTS) shown[k] = k === 'kcal' ? (amounts[k] == null ? null : Math.round(amounts[k])) : r1(amounts[k]);
        return {g: pick.g, unit: val.unit, source: pick.source, group: pick.group || null, amounts, shown, valid: val.valid, issues: val.issues};
    }

    function credibleGI(evidence) {
        const e = evidence || {};
        const gi = num(e.gi);
        const src = typeof e.source === 'string' ? e.source.trim() : '';
        if (gi == null || gi <= 0 || gi > 110 || src.length < 3) return null;
        if (e.mixed === true) return null; // a mixed packaged food never takes the GI of one ingredient
        return {gi, source: src};
    }

    // args: {serving (calculateServing result), category: {liquid?}, evidence: {gi, source}, withMeal?}
    function estimateGlucoseImpact(args) {
        const a = args || {};
        const s = a.serving || {};
        const amt = s.amounts || {};
        const liquid = s.unit === 'ml' || !!(a.category && a.category.liquid);
        const carbs = amt.carbs == null ? null : amt.carbs; // EU: available carbohydrate, fibre already excluded
        const sugar = amt.sugar == null ? null : amt.sugar;
        const reasons = [], modifiers = [];
        const base = {estimate: true, bands: BANDS.version, liquid, servingG: s.g == null ? null : s.g, unit: s.unit || 'g',
            availableCarbsG: r1(carbs), sugarG: r1(sugar), gl: null, basis: 'carb-exposure'};
        if (s.valid === false) {
            return Object.assign(base, {key: 'insufficient', category: CATEGORY.insufficient, reasons: ['label_inconsistent'], modifiers});
        }
        let key = null;
        if (carbs == null && sugar == null) {
            return Object.assign(base, {key: 'insufficient', category: CATEGORY.insufficient, reasons: ['no_carb_data'], modifiers});
        }
        const b = liquid ? BANDS.liquid : BANDS.solid;
        const sug = sugar || 0;
        if (carbs == null) {
            // Sugar alone is a floor: enough sugar is Higher whatever the rest; less tells us too little.
            if (sug >= b.higherSugar) { key = 'higher'; reasons.push('sugar_high'); }
            else return Object.assign(base, {key: 'insufficient', category: CATEGORY.insufficient, reasons: ['carbs_unknown'], modifiers});
        } else if (carbs >= b.higherCarbs) { key = 'higher'; reasons.push('carbs_high'); }
        else if (sug >= b.higherSugar) { key = 'higher'; reasons.push(liquid ? 'liquid_sugar' : 'sugar_high'); }
        else if (carbs >= b.moderateCarbs) { key = 'moderate'; reasons.push('carbs_moderate'); }
        else if (liquid && sug >= b.moderateSugar) { key = 'moderate'; reasons.push('liquid_sugar'); }
        else { key = 'lower'; reasons.push('carbs_low'); }
        if (sug > 0 && carbs != null && carbs > 0 && sug / carbs >= 0.5 && key !== 'lower') reasons.push('mostly_sugar');

        const gi = credibleGI(a.evidence);
        if (gi && carbs != null) {
            const gl = gi.gi * carbs / 100;
            const glKey = gl >= BANDS.gl.higher ? 'higher' : gl >= BANDS.gl.moderate ? 'moderate' : 'lower';
            base.gl = {value: r1(gl), gi: gi.gi, source: gi.source, key: glKey};
            base.basis = 'carb-exposure+glycemic-load';
            // Conservative: the GL can raise the estimate, it never lowers what the carbohydrate exposure says.
            if (RANK[glKey] > RANK[key]) { key = glKey; reasons.push('gl_' + glKey); }
        }
        // Modifiers: may change timing and size, never a cancellation (spec section 5).
        if ((amt.protein || 0) >= 5) modifiers.push('protein_may_slow');
        if ((amt.fat || 0) >= 5) modifiers.push('fat_may_slow');
        if ((amt.fibre || 0) >= 3) modifiers.push('fibre_may_slow');
        if (liquid && sug > 0) modifiers.push('liquid_fast');
        if (a.withMeal) modifiers.push('with_meal_may_slow');
        return Object.assign(base, {key, category: CATEGORY[key], reasons, modifiers});
    }

    // assessConfidence (scanfe-f1, spec section 10): how complete and consistent the EVIDENCE is, never how sure we are about
    // the person's glucose response. High = exact product (valid barcode + name), current ingredients read in full, nutrition
    // label complete and consistent. Medium = identified and nutrition usable, but some details are missing (ingredients
    // missing / unreadable / cut off / garbled, a nutrient missing, a label warning, a variant or source conflict, old data).
    // Low = identity uncertain, label numbers inconsistent, or the carbohydrates are unknown. Each lowering names a stable
    // reason key; `needs` lists the photos the missing-data flow (scanfe-f2) should ask for. Nothing here is ever guessed.
    // product: {name, barcode, unit, per100, ingredients, identity, variantConfirmed, conflicts, evidence: {updated}}
    // parts (optional, scanFood passes them): {nutrition: validateNutrition result, ingredients: analyzeIngredients result}
    const CONF = Object.freeze({version: 'confidence-v1', maxAgeDays: 1095});
    const CONF_LEVEL = {high: 'High', medium: 'Medium', low: 'Low'};
    const CONF_RANK = {high: 2, medium: 1, low: 0};
    const CONF_TEXT = {
        high: {en: 'Data confidence: High', de: 'Datenlage: Hoch', es: 'Fiabilidad de los datos: Alta'},
        medium: {en: 'Data confidence: Medium', de: 'Datenlage: Mittel', es: 'Fiabilidad de los datos: Media'},
        low: {en: 'Data confidence: Low', de: 'Datenlage: Niedrig', es: 'Fiabilidad de los datos: Baja'}
    };
    const CONF_REASON = {
        identity_unverified: {en: 'No barcode, so the exact product is not confirmed', de: 'Kein Barcode, das genaue Produkt ist nicht bestätigt', es: 'Sin código de barras, el producto exacto no está confirmado'},
        barcode_invalid: {en: 'The barcode does not check out, it may be misread', de: 'Der Barcode stimmt nicht, vielleicht falsch gelesen', es: 'El código de barras no cuadra, puede estar mal leído'},
        name_missing: {en: 'Product name missing', de: 'Produktname fehlt', es: 'Falta el nombre del producto'},
        identity_uncertain: {en: 'Not sure this is the exact product', de: 'Unsicher, ob es genau dieses Produkt ist', es: 'No es seguro que sea este producto exacto'},
        variant_unconfirmed: {en: 'Exact variant or pack not confirmed', de: 'Genaue Sorte oder Packung nicht bestätigt', es: 'Variante o envase exacto sin confirmar'},
        sources_conflict: {en: 'Sources disagree about this product', de: 'Quellen widersprechen sich bei diesem Produkt', es: 'Las fuentes no coinciden sobre este producto'},
        label_inconsistent: {en: 'Label numbers do not add up', de: 'Die Nährwerte passen nicht zusammen', es: 'Los valores de la etiqueta no cuadran'},
        carbs_missing: {en: 'Carbohydrates unknown', de: 'Kohlenhydrate unbekannt', es: 'Carbohidratos desconocidos'},
        nutrition_partial: {en: 'Some nutrition values missing', de: 'Einige Nährwerte fehlen', es: 'Faltan algunos valores nutricionales'},
        label_warning: {en: 'Calories and macros do not quite match', de: 'Kalorien und Makros passen nicht ganz', es: 'Calorías y macros no cuadran del todo'},
        ingredients_unchecked: {en: 'Ingredients not checked', de: 'Zutaten nicht geprüft', es: 'Ingredientes sin revisar'},
        ingredients_missing: {en: 'Ingredient list missing', de: 'Zutatenliste fehlt', es: 'Falta la lista de ingredientes'},
        ingredients_unreadable: {en: 'Ingredient list unreadable', de: 'Zutatenliste nicht lesbar', es: 'Lista de ingredientes ilegible'},
        ingredients_cut_off: {en: 'Ingredient list cut off', de: 'Zutatenliste abgeschnitten', es: 'Lista de ingredientes cortada'},
        ingredients_garbled: {en: 'Ingredient list looks garbled', de: 'Zutatenliste wirkt fehlerhaft', es: 'La lista de ingredientes parece errónea'},
        data_old: {en: 'Product data may be outdated', de: 'Produktdaten evtl. veraltet', es: 'Los datos pueden estar desactualizados'}
    };
    function gtinOk(code) {
        const d = code.split('').map(Number), check = d.pop();
        let t = 0;
        d.reverse().forEach((x, i) => { t += x * (i % 2 ? 1 : 3); });
        return (10 - t % 10) % 10 === check;
    }
    function bracketsGarbled(text) {
        // More closing than opening brackets at any point = broken OCR / copy text (unclosed ones are 'cut off' instead).
        let round = 0, square = 0;
        for (const ch of String(text || '')) {
            if (ch === '(') round++; else if (ch === ')') { round--; if (round < 0) return true; }
            else if (ch === '[') square++; else if (ch === ']') { square--; if (square < 0) return true; }
        }
        return false;
    }
    function assessConfidence(product, parts, opts) {
        const p = product || {};
        const pt = parts || {};
        let key = 'high';
        const reasons = [], needs = [];
        const lower = (to, why) => { if (CONF_RANK[to] < CONF_RANK[key]) key = to; if (!reasons.includes(why)) reasons.push(why); };
        const need = n => { if (!needs.includes(n)) needs.push(n); };
        // 1. Identity: exact product.
        const code = String(p.barcode == null ? '' : p.barcode).replace(/\s+/g, '');
        if (!/^\d{8,14}$/.test(code)) lower('low', 'identity_unverified');
        else if (!gtinOk(code)) lower('low', 'barcode_invalid');
        if (!(typeof p.name === 'string' && p.name.trim())) lower('low', 'name_missing');
        if (p.identity === 'uncertain') lower('low', 'identity_uncertain');
        if (p.variantConfirmed === false) lower('medium', 'variant_unconfirmed');
        if (Array.isArray(p.conflicts) && p.conflicts.length) lower('medium', 'sources_conflict');
        // 2. Nutrition label: complete and consistent.
        const val = pt.nutrition && pt.nutrition.per100 && Array.isArray(pt.nutrition.issues) ? pt.nutrition : validateNutrition(p.per100, p.unit);
        if (!val.valid) { lower('low', 'label_inconsistent'); need('label_photo'); }
        else if (val.per100.carbs == null) { lower('low', 'carbs_missing'); need('label_photo'); }
        else {
            if (['sugar', 'protein', 'fat', 'kcal'].some(k => val.per100[k] == null)) { lower('medium', 'nutrition_partial'); need('label_photo'); }
            if (val.issues.some(i => i.level === 'warn')) lower('medium', 'label_warning');
        }
        // 3. Ingredients: current list, read in full.
        const ing = pt.ingredients === undefined ? null : pt.ingredients;
        if (!ing) {
            const raw = typeof p.ingredients === 'string' ? p.ingredients.trim() : '';
            lower('medium', raw ? 'ingredients_unchecked' : 'ingredients_missing'); need('ingredients_photo');
        } else if (ing.status === 'missing') { lower('medium', 'ingredients_missing'); need('ingredients_photo'); }
        else if (ing.status === 'unusable') { lower('medium', 'ingredients_unreadable'); need('ingredients_photo'); }
        else {
            if (ing.truncated) { lower('medium', 'ingredients_cut_off'); need('ingredients_photo'); }
            if (bracketsGarbled(p.ingredients)) { lower('medium', 'ingredients_garbled'); need('ingredients_photo'); }
        }
        // 4. Current data: a record older than about three years may describe an old recipe.
        const upd = p.evidence && p.evidence.updated ? Date.parse(p.evidence.updated) : NaN;
        const now = opts && typeof opts.now === 'number' ? opts.now : Date.now();
        if (isFinite(upd) && now - upd > CONF.maxAgeDays * 864e5) lower('medium', 'data_old');
        const lang = l => (CONF_REASON[l] ? CONF_REASON[l] : null);
        return {
            version: CONF.version,
            basis: 'evidence-completeness',
            key,
            level: CONF_LEVEL[key],
            text: CONF_TEXT[key],
            reasons,
            reasonText: reasons.map(r => Object.assign({key: r}, lang(r))),
            needs
        };
    }

    // scanFood (scanfe-c/d): one call for a product. Ingredient flags come from ingredient-core.js (window.LowiIngredients),
    // the JA / SELTEN / NEIN verdict from food-policy-core.js (window.LowiFoodPolicy, rules in
    // data/food-policy/lowispike-policy.v1.json). confidence (scanfe-f1): 'High' | 'Medium' | 'Low' from assessConfidence, details in
    // confidenceInfo (reasons, needs).
    // quality / cravings / satiety / reasons / alternative come from food-assess-core.js (window.LowiFoodAssess, scanfe-e).
    // product: {name, brand, barcode, unit, per100, ingredients, categories, claims, evidence}; serving: grams or
    // {userG, manufacturerG, group}; ctx: {profile: {allergies: [EU-14 keys], avoid: [policy category keys]}}.
    let ING = null, POL = null, ASS = null;
    function lib(name, file) {
        if (typeof window !== 'undefined' && window[name]) return window[name];
        if (typeof require === 'function') { try { return require(file); } catch (e) { return null; } }
        return null;
    }
    function scanFood(product, serving, ctx) {
        const p = product || {};
        ING = ING || lib('LowiIngredients', './ingredient-core.js');
        POL = POL || lib('LowiFoodPolicy', './food-policy-core.js');
        ASS = ASS || lib('LowiFoodAssess', './food-assess-core.js');
        const val = validateNutrition(p.per100, p.unit);
        const srv = calculateServing(val, serving == null ? {manufacturerG: p.servingG, group: p.group} : serving);
        const glucose = estimateGlucoseImpact({serving: srv, category: {liquid: p.unit === 'ml'}, evidence: p.evidence, withMeal: !!(ctx && ctx.withMeal)});
        const ingredients = ING ? ING.analyzeIngredients(p.ingredients, {name: p.name, brand: p.brand, claims: p.claims}) : null;
        const policy = POL ? POL.applyPolicy({product: p, ingredients, glucose, serving: srv, profile: ctx && ctx.profile}) : null;
        // Quality, cravings + satiety, reasons and the better alternative (scanfe-e, food-assess-core.js). A craving
        // trigger the user reported (ctx.profile.triggers) makes the verdict one step stricter; policy.verdict keeps the
        // rules-only verdict for the audit trail.
        const assess = ASS && policy ? ASS.assess({product: p, per100: val.per100, unit: val.unit, serving: srv, glucose, ingredients, policy, profile: ctx && ctx.profile}) : null;
        const verdict = policy ? (assess && assess.personal.changed ? assess.personal.verdict : policy.verdict) : null;
        const conf = assessConfidence(p, {nutrition: val, ingredients}, ctx && typeof ctx.now === 'number' ? {now: ctx.now} : null);
        return {
            engine: VERSION,
            policyVersion: policy ? policy.policyVersion : null,
            verdict,
            policy,
            glucose,
            serving: srv,
            ingredients,
            allergens: ingredients ? ingredients.allergens : [],
            claims: ingredients ? ingredients.claims : [],
            quality: assess ? assess.quality : null,
            cravings: assess ? assess.cravings : null,
            satiety: assess ? assess.satiety : null,
            personal: assess ? assess.personal : null,
            reasonKeys: assess ? assess.reasonKeys : [],
            reasons: assess ? assess.reasons : [],
            alternative: assess ? assess.alternative : null,
            confidence: conf.level,
            confidenceInfo: conf
        };
    }

    return {VERSION, NUTRIENTS, BANDS, GROUP_SERVING, CATEGORY, CONFIDENCE: CONF, normalize, validateNutrition, calculateServing, estimateGlucoseImpact, assessConfidence, scanFood};
});
