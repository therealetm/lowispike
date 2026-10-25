/* LOWiSPIKE name check (Oct 23, 2026)
   Why: Emmanuel scanned "Tafel-Trauben kernlos, Klasse I" (Eurogroup Italia, 8033803727241). The scanner knew the name, but
   the product had no nutrition data, so it only showed "Add label photos / or add it yourself / tick sugar, sweetener...".
   "If the app knows the name, it should still give an analysis. Typing Trauben or Erdbeere should give an analysis too."
   This file turns a product or food name into the normal verdict, from the app's own food rules (the injected rate(name):
   LowiDex.rateName, which already holds Master Knowledge v3 / LowiFoodPolicy and the typed-meal engine). Pure: no DOM,
   node-tested (tests/name-estimate.test.cjs).
   Order: the whole name, the name without shop words (class, seedless, organic, weights, origin, brand), each word, then
   each German compound tail (Tafeltrauben -> trauben, Rispentomaten -> tomaten), then a few brand words (Haribo -> gummy).
   Honest and cheat-proof: a name check is always an estimate. It only runs when the label has nothing to rate, it is
   never friendlier than any word it matched (strictest wins), and its confidence is medium at best (low for a guess from
   one word of a longer name). */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiNameEstimate = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';
    const RANK = { ok: 0, better: 1, spike: 2 };
    const SCORE = { ok: 14, better: 45, spike: 74 };
    const LIGHT = { ok: 'green', better: 'yellow', spike: 'red' };
    const MASTER = { ok: 'JA', better: 'SELTEN', spike: 'NEIN' };
    const SPIKE = { ok: 'low', better: 'mid', spike: 'high' };
    // shop and label words that never change what the food is (EN / DE / ES / IT)
    const NOISE = new Set(('klasse kl class clase categoria categoría cat extra i ii iii 1 2 3 kernlos kernarm seedless sin semillas ' +
        'semilla pepitas senza semi bio organic organico orgánico ecologico ecológico eco lose loose granel frisch fresh fresco fresca ' +
        'frescos frescas tafel table premium auswahl selection selección qualität quality calidad aus from de del della origin ' +
        'herkunft ursprung origen italien italia italy spanien españa spain espana deutschland germany alemania griechenland greece ' +
        'marokko morocco türkei chile peru südafrika suedafrika ägypten aegypten egypt niederlande holland netherlands ' +
        'frankreich france francia portugal neu new nuevo packung pack pckg schale tray bandeja beutel bag bolsa netz net malla stück ' +
        'stueck stk st pcs piece pieces x ca circa approx g kg gr ml l cl ltr liter litre und and y e mit with con natur nature natural ' +
        'weiß weiss white blanca blanco rot red roja rojo hell light dark dunkel mix gemischt mixed regional local').split(' '));
    const WEIGHT = /^\d+([.,]\d+)?(g|gr|kg|ml|cl|l|ltr|x|er|stk|st|pcs)?$/;
    // brand or product words the food rules don't know, mapped to a word they do (only used when nothing else matched)
    const ALIAS = {
        haribo: 'fruchtgummi', goldbären: 'fruchtgummi', goldbaren: 'fruchtgummi', goldbaeren: 'fruchtgummi', gummibärchen: 'fruchtgummi',
        milka: 'schokolade', ritter: 'schokolade', lindt: 'schokolade', kinder: 'schokolade', toblerone: 'schokolade', snickers: 'schokolade',
        twix: 'schokolade', mars: 'schokolade', kitkat: 'schokolade', oreo: 'kekse', leibniz: 'kekse', prinzenrolle: 'kekse',
        pringles: 'chips', lays: 'chips', funnyfrisch: 'chips', chio: 'chips', nutella: 'nutella', fanta: 'limonade', sprite: 'limonade',
        capri: 'saft', redbull: 'energy drink', monster: 'energy drink', barilla: 'nudeln', oetker: 'pudding', ehrmann: 'pudding',
        weintrauben: 'trauben', tafeltrauben: 'trauben', uvas: 'trauben', uva: 'trauben', fresa: 'erdbeeren', fresas: 'erdbeeren',
        erdbeere: 'erdbeeren', strawberry: 'strawberries', grape: 'grapes', traube: 'trauben', weintraube: 'trauben', tafeltraube: 'trauben',
        /* plantain chips (Emmanuel's Maduritos): fried plantain is starch and sugar plus oil */
        maduritos: 'plantain chips', chifles: 'plantain chips', tostones: 'plantain chips', platanitos: 'plantain chips', mariquitas: 'plantain chips', patacones: 'plantain chips', plantains: 'plantain', platano: 'plantain', plátano: 'plantain', platanos: 'plantain', plátanos: 'plantain', kochbananen: 'kochbanane', kochbananenchips: 'plantain chips', bananenchips: 'chips'
    };
    const low = s => String(s == null ? '' : s).toLowerCase();
    // phrases the word rules would misread: cherry tomatoes are tomatoes, not cherries
    const PHRASE = [[/\b(cherry|kirsch|cocktail|dattel|snack)[\s-]*(rispen|strauch)?[\s-]*tomat(en|o|oes|es)?\b/gi, 'tomaten'],
        [/\bkirschtomat(en|e)?\b/gi, 'tomaten'], [/\btomates? cherry\b/gi, 'tomaten']];
    const phrase = s => PHRASE.reduce((a, [rx, to]) => a.replace(rx, to), String(s == null ? '' : s));
    function words(name) {
        return low(name).replace(/[^a-z0-9äöüßàáâãçèéêëìíîïñòóôõùúûü]+/g, ' ').trim().split(' ').filter(Boolean);
    }
    // the name without shop words, weights and the brand's own words
    function clean(name, brand) {
        const b = new Set(words(brand));
        return words(name).filter(w => !NOISE.has(w) && !WEIGHT.test(w) && !b.has(w) && w.length > 1).join(' ');
    }
    // German compound tails, longest first: "tafeltrauben" -> "afeltrauben" ... "trauben" (min 4 letters, word of 7+)
    function tails(w) {
        const out = [];
        if (w.length < 7) return out;
        for (let i = 2; i <= w.length - 4; i++) out.push(w.slice(i));
        return out;
    }
    function stricter(a, b) { if (!a) return b; if (!b) return a; return RANK[b.verdict] > RANK[a.verdict] ? b : a; }
    function call(rate, q) {
        if (!q || q.length < 2) return null;
        let r = null;
        try { r = rate(q); } catch (e) { r = null; }
        return r && RANK[r.verdict] != null ? r : null;
    }
    /* name -> {verdict, why, score, est, nameEst:{q, hit, how, conf, words}} or null.
       rate(q) returns {verdict:'ok'|'better'|'spike', why, score} or null (LowiDex.rateName in the app). */
    function estimate(name, opts) {
        opts = opts || {};
        const rate = opts.rate;
        const q = String(name == null ? '' : name).replace(/\s+/g, ' ').trim().slice(0, 120);
        if (typeof rate !== 'function' || q.length < 2) return null;
        const qp = phrase(q), c = clean(qp, opts.brand), cw = c ? c.split(' ') : [];
        const done = (r, hit, how, conf) => ({
            verdict: r.verdict, why: (r.why || []).slice(0, 3), score: r.score != null ? r.score : SCORE[r.verdict], est: true,
            nameEst: { q, hit, how, conf, words: cw.length }
        });
        // 1) the whole name, 2) the cleaned name: one food in plain words is medium, a long product name low
        let r = call(rate, qp);
        if (r) return done(r, qp, 'name', cw.length && cw.length <= 2 ? 'medium' : 'low');
        if (c && c !== low(qp)) { r = call(rate, c); if (r) return done(r, c, 'clean', cw.length <= 2 ? 'medium' : 'low'); }
        // 3) word by word (strictest of all matched words), 4) compound tails, 5) brand words
        let best = null, hits = [];
        for (const w of cw) {
            let h = w.length >= 3 ? call(rate, w) : null, hw = w;
            if (!h && ALIAS[w]) { h = call(rate, ALIAS[w]); hw = ALIAS[w]; }
            /* singular typed, the food rules know the plural (Traube -> trauben, Erdbeere -> erdbeeren, grape -> grapes) */
            if (!h && w.length >= 4) for (const suf of ['n', 'en', 's', 'es']) { h = call(rate, w + suf); if (h) { hw = w + suf; break; } }
            if (!h) for (const t of tails(w)) { h = call(rate, t); if (h) { hw = t; break; } }
            if (h) { if (hits.indexOf(hw) < 0) hits.push(hw); best = stricter(best, Object.assign({ hit: hw }, h)); }
        }
        if (best) return done(best, hits.join(', '), cw.length === 1 ? 'part' : 'word', cw.length === 1 && hits[0] && hits[0].length >= 5 ? 'medium' : 'low');
        return null;
    }
    /* the Master Knowledge v3 verdict block for a name estimate (same shape as the photo scan's lowispike block) */
    function block(est) {
        if (!est || RANK[est.verdict] == null) return null;
        return { v: 1, light: LIGHT[est.verdict], verdict: MASTER[est.verdict], score: est.score != null ? est.score : SCORE[est.verdict],
            spike: SPIKE[est.verdict], counted: [{ item: String((est.nameEst && est.nameEst.hit) || '').slice(0, 60), count: 1 }],
            confidence: (est.nameEst && est.nameEst.conf) || 'low', source: 'name' };
    }
    /* an AI name read (LowiFoodAI.analyseName) + the app's own rules -> estimate. The app's verdict for each dish name and the
       carbs of the portion can only make it stricter; the AI block too. Nothing known -> null (the user adds label data). */
    function fromAI(ai, opts) {
        opts = opts || {};
        if (!ai || !ai.isFood || !Array.isArray(ai.dishes) || !ai.dishes.length) return null;
        const rate = typeof opts.rate === 'function' ? opts.rate : () => null;
        let best = null;
        for (const d of ai.dishes) { const h = call(rate, d.name); if (h) best = stricter(best, h); }
        const carbs = ai.dishes.reduce((s, d) => s + Math.max(0, (+d.carbs || 0) - (+d.fiber || 0)), 0);
        const byCarbs = carbs >= 50 ? 'spike' : carbs >= 25 ? 'better' : 'ok';
        const map = { JA: 'ok', SELTEN: 'better', NEIN: 'spike' };
        const blk = ai.verdictBlock && map[ai.verdictBlock.verdict] ? map[ai.verdictBlock.verdict] : null;
        let v = best ? best.verdict : (blk || byCarbs);
        if (RANK[byCarbs] > RANK[v]) v = byCarbs;
        if (blk && RANK[blk] > RANK[v]) v = blk;
        const why = best && best.verdict === v ? (best.why || []).slice(0, 2) : [['ai_name', ai.dishes[0].name]];
        const sc = ai.verdictBlock && isFinite(+ai.verdictBlock.score) ? Math.max(0, Math.min(100, Math.round(+ai.verdictBlock.score))) : null;
        return { verdict: v, why, score: Math.max(sc != null ? sc : 0, SCORE[v] - 10, 0) || SCORE[v], est: true,
            nameEst: { q: String(opts.name || ''), hit: ai.dishes.map(d => d.name).join(', ').slice(0, 80), how: 'ai', conf: ai.confidence === 'medium' ? 'medium' : 'low',
                words: 0, dishes: ai.dishes.slice(0, 4), carbs: Math.round(carbs) } };
    }
    const STR = {
        en: { est: 'Estimate from the name', read: 'Read as', how: 'How sure', medium: 'medium, from the name only', low: 'low, a guess from the name',
            snap: 'Photo of the pack', snapS: 'Guesses the food from the photo. Exact ingredients need label photos.', snapBusy: 'Looking at the photo…', snapFail: 'The photo check isn\'t available right now. Type the name above or add label photos.', photo: 'Estimate from a photo of the pack, ingredients not read', looks: 'Looks like', exactH: 'Make it exact (optional)',
            ai: 'AI estimate from the name', nodata: 'No detailed data from the scan', nodataS: 'This product has no nutrition table or ingredients in the database yet, so the verdict above comes from its name only.',
            exact: 'Make it exact (optional)', exactS: 'Add label photos, or tick what the label says. Then the scan rates the real numbers.', tick: 'Tick what the label says',
            scanData: 'From the scan', swap: 'Best swap', swapOk: 'Good pick, no swap needed', recipe: 'Recipe Book', open: 'See the recipe', show: 'Show it',
            analyse: 'Analyze by name', analyseShort: 'Analyze', analysing: 'Checking the name…', none: 'I can’t tell from this name yet. Add label photos or tick what the label says.',
            typeName: 'Or type a food name', typeHint: 'e.g. grapes, strawberries or a product name', noCatch: 'Estimated from the name, so it isn’t saved to the community. Add label photos to save it.',
            fallback: 'The AI name check isn’t switched on yet, so this uses the app’s own food rules.', portion: 'Typical portion' },
        de: { est: 'Schätzung nach dem Namen', read: 'Erkannt als', how: 'Wie sicher', medium: 'mittel, nur nach dem Namen', low: 'gering, geraten nach dem Namen',
            snap: 'Foto der Packung', snapS: 'Errät das Lebensmittel vom Foto. Genaue Zutaten brauchen Etikett-Fotos.', snapBusy: 'Schaue mir das Foto an…', snapFail: 'Der Foto-Check geht gerade nicht. Tippe oben den Namen ein oder mach Etikett-Fotos.', photo: 'Schätzung nach einem Foto der Packung, Zutaten nicht gelesen', looks: 'Sieht aus wie', exactH: 'Genau machen (freiwillig)',
            ai: 'KI-Schätzung nach dem Namen', nodata: 'Keine genauen Daten vom Scan', nodataS: 'Für dieses Produkt gibt es noch keine Nährwerttabelle und keine Zutaten in der Datenbank. Das Ergebnis oben kommt nur vom Namen.',
            exact: 'Genauer machen (optional)', exactS: 'Füg Etikettenfotos hinzu oder tipp an, was auf dem Etikett steht. Dann bewertet der Scan die echten Werte.', tick: 'Antippen, was auf dem Etikett steht',
            scanData: 'Vom Scan', swap: 'Beste Alternative', swapOk: 'Gute Wahl, keine Alternative nötig', recipe: 'Rezeptbuch', open: 'Zum Rezept', show: 'Anzeigen',
            analyse: 'Nach Namen analysieren', analyseShort: 'Analysieren', analysing: 'Name wird geprüft…', none: 'An diesem Namen erkenne ich es noch nicht. Füg Etikettenfotos hinzu oder tipp an, was auf dem Etikett steht.',
            typeName: 'Oder Lebensmittel eintippen', typeHint: 'z. B. Trauben, Erdbeeren oder ein Produktname', noCatch: 'Nach dem Namen geschätzt, darum wird es nicht in der Community gespeichert. Mit Etikettenfotos kannst du es speichern.',
            fallback: 'Die KI-Namensprüfung ist noch nicht eingeschaltet, darum gelten die eigenen Lebensmittel-Regeln der App.', portion: 'Übliche Portion' },
        es: { est: 'Estimación por el nombre', read: 'Leído como', how: 'Seguridad', medium: 'media, solo por el nombre', low: 'baja, deducido del nombre',
            snap: 'Foto del paquete', snapS: 'Adivina el alimento por la foto. Los ingredientes exactos necesitan fotos de la etiqueta.', snapBusy: 'Mirando la foto…', snapFail: 'La revisión por foto no está disponible ahora. Escribe el nombre arriba o añade fotos de la etiqueta.', photo: 'Estimación por una foto del paquete, ingredientes no leídos', looks: 'Parece', exactH: 'Hazlo exacto (opcional)',
            ai: 'Estimación con IA por el nombre', nodata: 'Sin datos detallados del escaneo', nodataS: 'Este producto aún no tiene tabla nutricional ni ingredientes en la base de datos, así que el resultado de arriba viene solo de su nombre.',
            exact: 'Hacerlo exacto (opcional)', exactS: 'Añade fotos de la etiqueta o marca lo que dice. Así el escaneo valora los datos reales.', tick: 'Marcar lo que dice la etiqueta',
            scanData: 'Del escaneo', swap: 'Mejor alternativa', swapOk: 'Buena elección, no hace falta cambiar', recipe: 'Libro de recetas', open: 'Ver la receta', show: 'Ver',
            analyse: 'Analizar por nombre', analyseShort: 'Analizar', analysing: 'Revisando el nombre…', none: 'Con este nombre aún no lo sé. Añade fotos de la etiqueta o marca lo que dice.',
            typeName: 'O escribe un alimento', typeHint: 'p. ej. uvas, fresas o un producto', noCatch: 'Estimado por el nombre, así que no se guarda en la comunidad. Añade fotos de la etiqueta para guardarlo.',
            fallback: 'El análisis de nombres con IA aún no está activado, así que se usan las reglas de la app.', portion: 'Porción típica' }
    };
    const text = (k, l) => (STR[l] || STR.en)[k] || STR.en[k] || k;
    return { estimate, phrase, clean, words, tails, block, fromAI, text, STR, ALIAS, NOISE, RANK, SCORE, LIGHT, MASTER };
});
