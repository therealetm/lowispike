/* LOWiSPIKE insulin spike estimator (Oct 16, 2026).
   One question: will this product likely spike insulin? Fully automatic from label data (Open Food Facts or the shared dex):
   carbs, sugar, fibre, protein, fat per 100 g / 100 ml and the ingredient list. No manual entry.
   Rules, in short:
   - Liquid sugar (drinks with more than 5 g sugar per 100 ml, juice included) spikes: it hits fastest.
   - Sweeteners are flagged (they keep the sweet habit and can raise insulin): spike, policy rule kept from LOWiSPIKE.
   - Otherwise a load score: net carbs (carbs - fibre) x carb quality (refined starch first 1.0, whole grain / oats / legumes 0.55,
     other 0.8) + sugar weighted by where added sugar sits in the ingredients (top 3: 0.6, later: 0.3, none: 0, natural sugar
     from vegetables, fruit or milk is not counted twice) - protein x 0.4 - fat x 0.1 (dampening capped at 40% of the load).
     Load 25 or more = likely spike. Added sugar in the top 3 with 10 g+ sugar and 10 g+ net carbs = likely spike.
   - Only ingredients known: refined starch or added sugar in the top 3 = likely spike, else likely won't spike.
   Returns the same shape the rest of the app uses: {verdict:'spike'|'ok'|'unknown', why:[[key, ...args]], score 0-100, est:true}. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiSpikeCore = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';
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
    function assess(p) {
        p = p || {};
        const f = p.facts || {}, L = list(p.ingredients), hasI = L.length > 0;
        const c = n(f.c), s = n(f.s), fib = n(f.f) || 0, pro = n(f.p) || 0, fat = n(f.fat) || 0;
        const hasN = c != null || s != null;
        const drink = (p.cat === 'drink' || !!f.drink) && !(hasI && find(L, RX.veg, 0, 2));
        const why = [];
        if (!hasI && !hasN) return {verdict: 'unknown', why: [], score: null, est: true};
        const sweet = hasI ? find(L, RX.sweet, 0, 99) : null;
        const sugarTop = hasI ? find(L, RX.addedSugar, 0, 3, RX.noSugar) : null;
        const sugarAny = sugarTop || (hasI ? find(L, RX.addedSugar, 3, 99, RX.noSugar) : null);
        const refinedTop = hasI ? find(L, RX.refined, 0, 3) : null;
        const wholeTop = hasI ? find(L, RX.whole, 0, 3) : null;
        const fibreRich = !hasI && c != null && c > 0 && fib / c >= 0.15 && (s || 0) < 5;
        const wholeOnly = fibreRich || (!!wholeTop && (!refinedTop || /vollkorn|whole|integral/.test(refinedTop.w)));
        if (sweet) why.push(['s_sweet', sweet.w]);
        let score, spike = !!sweet;
        if (hasN) {
            const net = Math.max(0, (c || 0) - fib), sug = s || 0;
            const q = wholeOnly ? 0.55 : refinedTop ? 1 : 0.8;
            const sw = sugarTop ? 0.6 : sugarAny ? 0.3 : 0;
            const load = net * q + sug * sw;
            const damp = Math.min(load * 0.4, pro * 0.4 + fat * 0.1);
            score = Math.round(Math.max(0, load - damp));
            if (drink && sug > 5) { spike = true; why.unshift(['s_liquid', sug]); score = Math.max(score, 70); }
            else if (sugarTop && sug >= 10 && net >= 10) { spike = true; why.push(['s_sugar_top', sugarTop.w, sug]); score = Math.max(score, 40); }
            else if (score >= 25) {
                spike = true;
                if (refinedTop) why.push(['s_refined', refinedTop.w, net]);
                else if (sug >= 10) why.push(['s_sugar', sug]);
                else why.push(['s_carbs', net]);
            }
            if (!spike) {
                if (net < 10) why.push(['s_low', net, sug]);
                else if (wholeOnly) why.push(wholeTop ? ['s_whole', wholeTop.w, fib] : ['s_fibrerich', fib]);
                else why.push(['s_moderate', net]);
                if (sug > 0 && !sugarAny && hasI) why.push(['s_natural', sug]);
            }
            if (fib >= 6) why.push(['s_fibre', fib]);
            if (pro >= 10) why.push(['s_protein', pro]);
        } else {
            if (refinedTop) { spike = true; why.push(['s_refined_i', refinedTop.w]); }
            if (sugarTop) { spike = true; why.push(['s_sugar_i', sugarTop.w]); }
            if (!spike) why.push(wholeOnly ? ['s_whole_i', wholeTop.w] : ['s_clean_i']);
            score = spike ? 60 : 15;
        }
        if (sweet) score = Math.max(score, 50);
        score = Math.max(2, Math.min(100, spike ? Math.max(score, 34) : Math.min(score, 30)));
        return {verdict: spike ? 'spike' : 'ok', why: why.slice(0, 4), score, est: true};
    }
    const TX = {
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
        s_clean_i: ['No added sugar or refined starch up front', 'Kein zugesetzter Zucker, keine raffinierte Stärke vorne', 'Sin azúcar añadido ni almidón refinado al principio']
    };
    function text(w, li) {
        const k = w && w[0], row = TX[k]; if (!row) return '';
        const L = li || 0, args = w.slice(1);
        return (row[L] || row[0]).replace(/\{(\d)\}/g, (m, i) => {
            const a = args[+i]; if (typeof a === 'number') return String(Math.round(a * 10) / 10).replace('.', L ? ',' : '.');
            const s = String(a == null ? '' : a); return s.charAt(0).toUpperCase() + s.slice(1);
        });
    }
    /* "looks healthy" words: spiky foods with these in the name are the ones worth warning about */
    const HEALTHY = /\bbio\b|organic|vollkorn|whole|protein|fit\b|fitness|light|natur|vegan|smoothie|granola|müsli|muesli|hafer|oat|reiswaffel|rice cake|dinkel|spelt|superfood|chia|frucht|fruit|joghurt|yogurt|zero|diet|balance|vital|integral|ecológico/i;
    const looksHealthy = p => HEALTHY.test(String((p && p.name) || '') + ' ' + String((p && p.brand) || ''));
    return {assess, text, TX, looksHealthy, list};
});
