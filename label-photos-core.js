/* label-photos-core.js (food engine scanfe-f2, 22 Oct 2026): the missing-data flow, pure and node-testable.
   When the barcode database lacks the nutrition label or the ingredient list, the scanner asks for two photos (label +
   ingredients). Text read from a photo (on-device OCR where the browser has it) only PRE-FILLS the form; nothing counts until
   the person checks it against the pack and confirms. Numbers are validated with LowiFoodEngine.validateNutrition. Gaps are
   never filled: a value nobody confirmed stays unknown, and an empty field never overwrites a known one.
   window.LowiLabelPhotosCore = {gaps, parseLabel, parseIngredients, readNumber, check, apply, FIELDS, MSG}. */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiLabelPhotosCore = api;
}(typeof self !== 'undefined' ? self : this, function (root) {
    'use strict';
    const VERSION = 'label-photos f2 2026-10-22';
    // engine nutrient key -> app facts key (the scanner's product.facts).
    const FIELDS = [['carbs', 'c'], ['sugar', 's'], ['fibre', 'f'], ['protein', 'p'], ['fat', 'fat'], ['kcal', 'kcal']];
    const MSG = {
        not_a_number: {en: 'Use numbers only, like 12.5', de: 'Nur Zahlen, z. B. 12,5', es: 'Solo números, p. ej. 12,5'},
        nothing: {en: 'Add the label values or the ingredient list first', de: 'Trag zuerst Nährwerte oder Zutaten ein', es: 'Añade primero los valores o los ingredientes'},
        carbs_needed: {en: 'Carbohydrates are needed to estimate anything', de: 'Ohne Kohlenhydrate keine Schätzung möglich', es: 'Sin carbohidratos no se puede estimar'},
        negative: {en: 'Values can\'t be below zero', de: 'Werte können nicht unter null sein', es: 'Los valores no pueden ser negativos'},
        sugar_over_carbs: {en: 'Sugar can\'t be more than carbohydrates. Check both on the label', de: 'Zucker kann nicht mehr sein als Kohlenhydrate. Prüf beide auf dem Etikett', es: 'El azúcar no puede superar a los carbohidratos. Revisa ambos'},
        macros_over_100: {en: 'These add up to more than 100 g per 100 g. Check the label', de: 'Das ergibt mehr als 100 g pro 100 g. Prüf das Etikett', es: 'Suma más de 100 g por 100 g. Revisa la etiqueta'},
        kcal_mismatch: {en: 'Calories don\'t match the macros. Check the kcal value', de: 'Kalorien passen nicht zu den Makros. Prüf den kcal-Wert', es: 'Las calorías no cuadran con los macros. Revisa las kcal'},
        unit_unknown: {en: 'Pick per 100 g or per 100 ml', de: 'Wähle pro 100 g oder pro 100 ml', es: 'Elige por 100 g o por 100 ml'},
        too_short: {en: 'The ingredient list looks too short. Check the photo text', de: 'Die Zutatenliste wirkt zu kurz. Prüf den Text', es: 'La lista de ingredientes parece muy corta. Revísala'}
    };

    function engine() {
        if (root && root.LowiFoodEngine) return root.LowiFoodEngine;
        if (typeof require === 'function') { try { return require('./food-engine-core.js'); } catch (e) { return null; } }
        return null;
    }
    function ingLib() {
        if (root && root.LowiIngredients) return root.LowiIngredients;
        if (typeof require === 'function') { try { return require('./ingredient-core.js'); } catch (e) { return null; } }
        return null;
    }
    function num(v) { const x = typeof v === 'number' ? v : parseFloat(v); return isFinite(x) ? x : null; }

    // What is missing for this scanned product: which photos to ask for and which label values are unknown. Uses the engine's
    // confidence `needs` (scanfe-f1); without the engine it falls back to the plain facts. Nothing is guessed.
    function gaps(p) {
        p = p || {};
        const f = p.facts || {};
        const per100 = {};
        FIELDS.forEach(([k, a]) => { per100[k] = num(f[a]); });
        const unit = f.unit === 'ml' || f.drink || p.cat === 'drink' ? 'ml' : 'g';
        const missing = FIELDS.map(x => x[0]).filter(k => per100[k] == null);
        const ing = typeof p.ingredients === 'string' ? p.ingredients.trim() : '';
        let needs = [];
        const E = engine();
        if (E && E.assessConfidence) {
            const IL = ingLib();
            let A = null, nutrition = null;
            try { A = IL && ing ? IL.analyzeIngredients(ing, {name: p.name, brand: p.brand, claims: p.claims}) : null; } catch (e) { A = null; }
            try { nutrition = E.validateNutrition ? E.validateNutrition(per100, unit) : null; } catch (e) { nutrition = null; }
            try { needs = E.assessConfidence({name: p.name || 'x', barcode: p.barcode, unit, per100, ingredients: ing}, {nutrition, ingredients: A}).needs.slice(); } catch (e) { needs = []; }
        } else {
            if (missing.some(k => k !== 'fibre')) needs.push('label_photo');
            if (!ing) needs.push('ingredients_photo');
        }
        // A product nobody has documented at all needs both.
        if (p.notFound) { if (!needs.includes('label_photo')) needs.unshift('label_photo'); if (!needs.includes('ingredients_photo')) needs.push('ingredients_photo'); }
        return {needs, missing, unit, per100, hasIngredients: !!ing};
    }

    // '12,5' / '12.5' / '<0,5' / '0' -> number; '' -> null; anything else -> NaN (an error the form shows).
    function readNumber(v) {
        const s = String(v == null ? '' : v).trim().replace(/^[<≤~]\s*/, '').replace(/\s*(g|ml|kcal)$/i, '').replace(',', '.');
        if (!s) return null;
        if (!/^\d{1,4}(\.\d{1,2})?$/.test(s)) return NaN;
        return parseFloat(s);
    }

    // Words on a nutrition table (EN / DE / ES). `not` rejects look-alikes such as saturated fat or sugar alcohols.
    const LABEL = {
        carbs: {rx: /(kohlenhydrate|carbohydrates?|hidratos\s+de\s+carbono|glúcidos|glucidos)/g},
        sugar: {rx: /(zucker|sugars?|azúcares|azucares)/g, not: /^(alkohol|zusatz|frei|free|alcohol)/},
        fibre: {rx: /(ballaststoffe|fibre|fiber|fibra(\s+alimentaria)?)/g},
        protein: {rx: /(eiweiß|eiweiss|proteins?|proteínas|proteinas)/g},
        fat: {rx: /(fett|fat|grasas)/g, not: /^(säure|saeure|sauren|säuren|s\b|\s*saturad)/, before: /(saturated|gesättigte|gesattigte)\s*$/}
    };
    function firstNumberAfter(text, from) {
        const seg = text.slice(from, from + 40).split('\n')[0];
        const m = seg.match(/([<≤]?\s*\d{1,4}(?:[.,]\d{1,2})?)\s*(g\b|ml\b)?/);
        if (!m) return null;
        const v = readNumber(m[1]);
        return typeof v === 'number' && isFinite(v) ? v : null;
    }
    // Text read from a photo of the nutrition table -> per-100 values found + unit. Only values printed on the label are read.
    function parseLabel(text) {
        const t = String(text || '').toLowerCase().replace(/[ \t]+/g, ' ');
        const per100 = {}, found = [];
        for (const k of Object.keys(LABEL)) {
            const L = LABEL[k];
            L.rx.lastIndex = 0;
            let m;
            while ((m = L.rx.exec(t))) {
                const end = m.index + m[0].length;
                if (L.not && L.not.test(t.slice(end, end + 8))) continue;
                if (L.before && L.before.test(t.slice(Math.max(0, m.index - 14), m.index))) continue;
                const v = firstNumberAfter(t, end);
                if (v != null) { per100[k] = v; found.push(k); break; }
            }
        }
        const kc = t.match(/(\d{1,4}(?:[.,]\d)?)\s*kcal/);
        if (kc) { per100.kcal = readNumber(kc[1]); found.push('kcal'); }
        const unit = /100\s*ml/.test(t) ? 'ml' : /100\s*g/.test(t) ? 'g' : null;
        return {per100, found, unit};
    }
    // Text read from a photo of the ingredient list -> the list itself (header and allergy / storage lines cut off).
    function parseIngredients(text) {
        let t = String(text || '').replace(/\r/g, '');
        const h = t.match(/(zutaten|ingredients?|ingredientes)\s*:?/i);
        if (h) t = t.slice(h.index + h[0].length);
        const stop = t.search(/(kann spuren|enthält spuren|may contain|puede contener|nährwert|naehrwert|nutrition|información nutricional|informacion nutricional|mindestens haltbar|best before|consumir preferentemente|kühl und trocken|store in a)/i);
        if (stop > 0) t = t.slice(0, stop);
        t = t.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim().replace(/^[:.,;\s]+/, '');
        return {text: t.slice(0, 3000), header: !!h};
    }

    // The form's values -> validated result. values: {carbs, sugar, fibre, protein, fat, kcal (strings), unit 'g'|'ml',
    // ingredients}. needLabel: the label photo was asked for, so carbohydrates must be given.
    function check(values, opts) {
        const v = values || {}, o = opts || {};
        const errors = [], warnings = [], per100 = {};
        let bad = false;
        FIELDS.forEach(([k]) => { const x = readNumber(v[k]); if (Number.isNaN(x)) bad = true; per100[k] = Number.isNaN(x) ? null : x; });
        if (bad) errors.push('not_a_number');
        const ingredients = String(v.ingredients || '').replace(/\s+/g, ' ').trim().slice(0, 3000);
        const anyNum = FIELDS.some(([k]) => per100[k] != null);
        if (!anyNum && !ingredients) errors.push('nothing');
        if (o.needLabel && anyNum && per100.carbs == null) errors.push('carbs_needed');
        if (ingredients && ingredients.length < 3) errors.push('too_short');
        let unit = v.unit === 'ml' ? 'ml' : v.unit === 'g' || !v.unit ? 'g' : v.unit;
        const E = engine();
        if (anyNum && E && E.validateNutrition) {
            const val = E.validateNutrition(per100, unit);
            val.issues.forEach(i => { if (i.level === 'error') { if (!errors.includes(i.code)) errors.push(i.code); } else if (!warnings.includes(i.code)) warnings.push(i.code); });
            unit = val.unit;
        } else if (anyNum && per100.sugar != null && per100.carbs != null && per100.sugar > per100.carbs + 0.05) errors.push('sugar_over_carbs');
        const text = (code, lang) => (MSG[code] || {})[lang] || (MSG[code] || {}).en || code;
        return {ok: errors.length === 0, errors, warnings, per100, unit, ingredients, text};
    }

    // Merge ONLY what the person confirmed into the product. Unknown stays unknown; a blank never erases a known value.
    function apply(p, res, meta) {
        const q = Object.assign({}, p || {});
        const m = meta || {};
        if (!res || !res.ok) return q;
        const facts = Object.assign({}, q.facts || {});
        const fields = [];
        FIELDS.forEach(([k, a]) => { if (res.per100[k] != null) { facts[a] = res.per100[k]; fields.push(k); } });
        if (fields.length) { facts.unit = res.unit; if (res.unit === 'ml') facts.drink = true; }
        q.facts = facts;
        if (res.ingredients) { q.ingredients = res.ingredients; fields.push('ingredients'); }
        if (m.name && String(m.name).trim()) q.name = String(m.name).trim().slice(0, 80);
        if (m.brand && String(m.brand).trim()) q.brand = String(m.brand).trim().slice(0, 60);
        delete q.notFound; delete q.partial; delete q.offline; delete q.manual;
        q.verdict = null; q.why = null; q.score = null;
        q.labelCheck = {version: VERSION, source: 'label-photo-confirmed', fields, ocr: !!m.ocr, photos: (m.photos || []).slice(0, 2), at: m.now || Date.now()};
        q.source = q.source || 'label-photo';
        return q;
    }

    return {VERSION, FIELDS, MSG, gaps, readNumber, parseLabel, parseIngredients, check, apply};
}));
