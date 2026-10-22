/* food-card-core.js (scanfe-g1, Oct 23 2026): the Food Intelligence result card on the scanned-product card.
   Spec section 12 (queue/FOOD-ENGINE-SPEC.md): verdict JA / SELTEN / NEIN as a traffic light, blood sugar impact with its
   uncertainty, Why? (2-3 reasons), nutrition for the serving, food quality, a better alternative; glucose, quality, cravings +
   fullness, data confidence, label-photo check and the policy version behind the expandable Details.
   Pure: no DOM. Reads the same numbers as the spike estimate above it (LowiSpikeCore.assess: same serving, same impact key) and
   runs LowiFoodEngine.scanFood for verdict, reasons, quality, cravings, alternative and confidence. Nothing is guessed: no
   estimate (not enough data) = no card. Never says there is no blood sugar spike.
   window.LowiFoodCard = {model(p, li), cardHTML(p, li), detailsHTML(p, li), TX} - li: 0 en, 1 de, 2 es. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiFoodCard = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    const LANGS = ['en', 'de', 'es'];
    const num = v => (typeof v === 'number' && isFinite(v) ? v : (typeof v === 'string' && v.trim() !== '' && isFinite(+v.replace(',', '.')) ? +v.replace(',', '.') : null));
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
    function lib(name, file) {
        if (typeof window !== 'undefined' && window[name]) return window[name];
        if (typeof require === 'function') { try { return require(file); } catch (e) { return null; } }
        return null;
    }

    const TX = {
        title: ['Food check', 'Food-Check', 'Análisis del alimento'],
        verdict: {
            JA: [['YES', 'A good everyday choice'], ['JA', 'Gute Alltagswahl'], ['SÍ', 'Buena opción para el día a día']],
            SELTEN: [['RARELY', 'Fine now and then'], ['SELTEN', 'Ab und zu okay'], ['A VECES', 'Bien de vez en cuando']],
            NEIN: [['NO', 'Not a standard choice'], ['NEIN', 'Keine Standardwahl'], ['NO', 'No es una opción habitual']]
        },
        provisional: ['Provisional: some data is missing', 'Vorläufig: es fehlen Daten', 'Provisional: faltan datos'],
        impact: ['Blood sugar impact', 'Wirkung auf den Blutzucker', 'Impacto en el azúcar'],
        impactKey: {lower: ['Lower', 'Niedriger', 'Más bajo'], moderate: ['Moderate', 'Mittel', 'Moderado'], higher: ['Higher', 'Höher', 'Más alto']},
        estimate: ['estimate', 'Schätzung', 'estimación'],
        uncertainty: ['Uncertainty', 'Unsicherheit', 'Incertidumbre'],
        unc: {high: ['small', 'gering', 'baja'], medium: ['medium', 'mittel', 'media'], low: ['large', 'groß', 'alta']},
        why: ['Why?', 'Warum?', '¿Por qué?'],
        serving: ['Per {0} serving', 'Pro Portion ({0})', 'Por ración ({0})'],
        n: {carbs: ['carbs', 'Kohlenhydrate', 'carbohidratos'], sugar: ['sugar', 'Zucker', 'azúcar'], protein: ['protein', 'Eiweiß', 'proteína'], fat: ['fat', 'Fett', 'grasa'], fibre: ['fibre', 'Ballaststoffe', 'fibra']},
        quality: ['Food quality', 'Lebensmittelqualität', 'Calidad del alimento'],
        better: ['Better choice', 'Bessere Wahl', 'Mejor opción'],
        dTitle: ['Food check details', 'Food-Check im Detail', 'Detalles del análisis'],
        dGlucose: ['Blood sugar', 'Blutzucker', 'Azúcar en sangre'],
        dGlucoseBody: ['{0} g available carbs, {1} g sugar per serving. Based on carbs per serving, an estimate, not a measurement.', '{0} g verfügbare Kohlenhydrate, {1} g Zucker pro Portion. Berechnet aus den Kohlenhydraten pro Portion, eine Schätzung, keine Messung.', '{0} g de carbohidratos disponibles, {1} g de azúcar por ración. Calculado con los carbohidratos por ración, es una estimación, no una medición.'],
        dQuality: ['Quality', 'Qualität', 'Calidad'],
        dCravings: ['Cravings and fullness', 'Heißhunger und Sättigung', 'Antojos y saciedad'],
        cravings: ['Craving risk', 'Heißhunger-Risiko', 'Riesgo de antojo'],
        fullness: ['Fullness', 'Sättigung', 'Saciedad'],
        lvl: {higher: ['higher', 'höher', 'más alto'], moderate: ['moderate', 'mittel', 'moderado'], lower: ['lower', 'niedriger', 'más bajo'], unknown: ['unknown', 'unbekannt', 'desconocido']},
        dConfidence: ['Data confidence', 'Datenlage', 'Fiabilidad de los datos'],
        conf: {high: ['High', 'Hoch', 'Alta'], medium: ['Medium', 'Mittel', 'Media'], low: ['Low', 'Niedrig', 'Baja']},
        labelCheck: ['Label values checked by you from photos: {0}', 'Etikettwerte von dir per Foto geprüft: {0}', 'Valores de la etiqueta revisados por ti con fotos: {0}'],
        policy: ['Rules', 'Regeln', 'Reglas'],
        concern: {
            added_sugar: ['added sugar', 'zugesetzter Zucker', 'azúcar añadido'],
            added_sugar_top: ['sugar near the top of the list', 'Zucker weit vorne in der Liste', 'azúcar entre los primeros ingredientes'],
            sugar_first: ['sugar is the first ingredient', 'Zucker ist die erste Zutat', 'el azúcar es el primer ingrediente'],
            sugar_heavy: ['a lot of sugar', 'viel Zucker', 'mucho azúcar'],
            liquid_sugar: ['sugar in a drink', 'Zucker im Getränk', 'azúcar en una bebida'],
            dried_fruit_sugar: ['concentrated fruit sugar', 'konzentrierter Fruchtzucker', 'azúcar de fruta concentrado'],
            sweetener: ['sweeteners', 'Süßstoffe', 'edulcorantes'],
            sweet_dessert: ['a sweet dessert', 'ein süßes Dessert', 'un postre dulce'],
            sweet_sauce: ['a sweet sauce', 'eine süße Soße', 'una salsa dulce'],
            coating: ['sugar coating', 'Zuckerüberzug', 'cobertura de azúcar'],
            refined_starch_top: ['refined starch', 'raffinierte Stärke', 'almidón refinado'],
            energy_dense: ['very energy dense', 'sehr energiedicht', 'muy calórico'],
            salty: ['salty', 'salzig', 'salado'],
            processed_meat: ['processed meat', 'verarbeitetes Fleisch', 'carne procesada'],
            processed_snack: ['processed snack', 'verarbeiteter Snack', 'snack procesado'],
            protein_isolate: ['protein isolate', 'Proteinisolat', 'aislado de proteína'],
            long_ingredient_list: ['long ingredient list', 'lange Zutatenliste', 'lista de ingredientes larga'],
            fibre_rich: ['fibre rich', 'reich an Ballaststoffen', 'rico en fibra'],
            plain_nuts: ['plain nuts', 'naturbelassene Nüsse', 'frutos secos naturales'],
            short_ingredient_list: ['short ingredient list', 'kurze Zutatenliste', 'lista de ingredientes corta'],
            whole_food: ['whole food', 'unverarbeitetes Lebensmittel', 'alimento natural'],
            whole_protein: ['whole protein source', 'natürliche Eiweißquelle', 'fuente de proteína natural']
        }
    };
    const T = (arr, li) => (Array.isArray(arr) ? (arr[li] != null ? arr[li] : arr[0]) : '');
    const fmt = (s, args) => String(s).replace(/\{(\d)\}/g, (m, i) => (args[i] == null ? '' : args[i]));
    const loc = (o, li) => (o && typeof o === 'object' ? (o[LANGS[li]] || o.en || '') : (o || ''));
    const dec = (v, li) => (v == null ? '–' : String(v).replace('.', li ? ',' : '.'));
    const TO_KEY = {ok: 'lower', better: 'moderate', spike: 'higher'};

    // One model per product object and language-free; the card and the Details block share it.
    const memo = typeof WeakMap === 'function' ? new WeakMap() : null;
    function model(p) {
        if (!p || typeof p !== 'object' || p.notFound) return null;
        if (memo && memo.has(p)) {
            const m = memo.get(p);
            if (m.sig === sig(p)) return m.out;
        }
        const out = build(p);
        if (memo) memo.set(p, {sig: sig(p), out});
        return out;
    }
    function sig(p) { try { return JSON.stringify([p.facts || null, p.ingredients || '', p.name || '', p.barcode || '', p.cat || '', p.labelCheck ? 1 : 0]); } catch (e) { return String(Math.random()); } }
    function build(p) {
        const S = lib('LowiSpikeCore', './spike-core.js'), E = lib('LowiFoodEngine', './food-engine-core.js');
        if (!S || !E || typeof E.scanFood !== 'function') return null;
        let a;
        try { a = S.assess(p); } catch (e) { return null; }
        const eng = a && a.engine;
        if (!a || !TO_KEY[a.verdict] || !eng || !eng.serving || eng.serving.g == null) return null; // no estimate = no card
        const f = p.facts || {};
        const per100 = {carbs: num(f.c), sugar: num(f.s), fibre: num(f.f), protein: num(f.p), fat: num(f.fat), kcal: num(f.kcal)};
        if (num(f.salt) != null) per100.salt = num(f.salt);
        let o;
        try {
            o = E.scanFood({name: p.name, brand: p.brand, barcode: p.barcode, unit: eng.serving.unit, per100, ingredients: p.ingredients || '', categories: p.categories || []}, eng.serving.g);
        } catch (e) { return null; }
        if (!o || !o.verdict) return null;
        const ci = o.confidenceInfo || {};
        return {
            verdict: o.verdict,
            provisional: !!(o.policy && o.policy.provisional),
            impact: TO_KEY[a.verdict],
            serving: {g: o.serving.g, unit: o.serving.unit, shown: o.serving.shown || {}},
            glucose: {carbs: o.glucose ? o.glucose.availableCarbsG : null, sugar: o.glucose ? o.glucose.sugarG : null, modifiers: o.glucose ? o.glucose.modifiers : []},
            reasons: (o.reasons || []).slice(0, 3),
            quality: o.quality || null,
            cravings: o.cravings ? o.cravings.key : null,
            satiety: o.satiety || null,
            alternative: (o.verdict === 'NEIN' || o.verdict === 'SELTEN') && o.alternative ? o.alternative : null,
            confidence: ci.key || null,
            confidenceReasons: ci.reasonText || [],
            policyVersion: o.policyVersion || null,
            engine: o.engine || null,
            labelCheck: p.labelCheck && Array.isArray(p.labelCheck.fields) ? p.labelCheck.fields.slice() : null
        };
    }

    function servingLine(m, li) {
        const s = m.serving.shown, u = m.serving.unit === 'ml' ? 'ml' : 'g';
        const parts = [];
        for (const k of ['carbs', 'sugar', 'protein', 'fat']) if (s[k] != null) parts.push('<span><b>' + esc(dec(s[k], li)) + ' g</b> ' + esc(T(TX.n[k], li)) + '</span>');
        if (s.kcal != null) parts.push('<span><b>' + esc(dec(s.kcal, li)) + '</b> kcal</span>');
        if (!parts.length) return '';
        return '<div class="fc-srv"><small>' + esc(fmt(T(TX.serving, li), [dec(m.serving.g, li) + ' ' + u])) + '</small><div class="fc-srvn">' + parts.join('') + '</div></div>';
    }

    function cardHTML(p, li) {
        li = li === 1 || li === 2 ? li : 0;
        const m = model(p);
        if (!m) return '';
        const v = TX.verdict[m.verdict] ? m.verdict : 'SELTEN', vt = TX.verdict[v][li];
        const cls = {JA: 'fc-ja', SELTEN: 'fc-selten', NEIN: 'fc-nein'}[v];
        const unc = m.confidence ? TX.unc[m.confidence] : null;
        const reasons = m.reasons.map(r => loc(r.text, li)).filter(Boolean);
        const q = m.quality && m.quality.key !== 'unknown' ? loc(m.quality.label, li) : '';
        return '<section class="sc-sec fc-card ' + cls + '" data-fc-verdict="' + esc(v) + '" aria-label="' + esc(T(TX.title, li)) + '">' +
            '<div class="fc-head"><span class="fc-light" aria-hidden="true"><i></i><i></i><i></i></span>' +
            '<div class="fc-vt"><strong class="fc-word">' + esc(vt[0]) + '</strong><span class="fc-sub">' + esc(vt[1]) + '</span></div></div>' +
            (m.provisional ? '<p class="fc-prov">' + esc(T(TX.provisional, li)) + '</p>' : '') +
            '<div class="fc-chips"><span class="fc-chip fc-imp fc-i-' + m.impact + '">' + esc(T(TX.impact, li)) + ': <b>' + esc(T(TX.impactKey[m.impact], li)) + '</b> <em>(' + esc(T(TX.estimate, li)) + ')</em></span>' +
            (unc ? '<span class="fc-chip fc-unc">' + esc(T(TX.uncertainty, li)) + ': <b>' + esc(T(unc, li)) + '</b></span>' : '') + '</div>' +
            (reasons.length ? '<div class="fc-why"><h5>' + esc(T(TX.why, li)) + '</h5><ul>' + reasons.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul></div>' : '') +
            servingLine(m, li) +
            (q ? '<div class="fc-row fc-q fc-q-' + esc(m.quality.key) + '"><small>' + esc(T(TX.quality, li)) + '</small><span>' + esc(q) + '</span></div>' : '') +
            (m.alternative ? '<div class="fc-row fc-alt"><small>' + esc(T(TX.better, li)) + '</small><span>' + esc(loc(m.alternative.text, li)) + '</span></div>' : '') +
            '</section>';
    }

    function detailsHTML(p, li) {
        li = li === 1 || li === 2 ? li : 0;
        const m = model(p);
        if (!m) return '';
        const rows = [];
        rows.push(['dGlucose', esc(T(TX.impactKey[m.impact], li)) + ' · ' + esc(fmt(T(TX.dGlucoseBody, li), [dec(m.glucose.carbs, li), dec(m.glucose.sugar, li)]))]);
        if (m.quality) {
            const words = (m.quality.concerns || []).concat(m.quality.positives || []).map(k => TX.concern[k] ? T(TX.concern[k], li) : '').filter(Boolean);
            rows.push(['dQuality', esc(loc(m.quality.label, li) || T(TX.lvl.unknown, li)) + (words.length ? ' · ' + esc(words.join(', ')) : '')]);
        }
        if (m.cravings || m.satiety) rows.push(['dCravings', esc(T(TX.cravings, li)) + ': <b>' + esc(T(TX.lvl[m.cravings] || TX.lvl.unknown, li)) + '</b> · ' + esc(T(TX.fullness, li)) + ': <b>' + esc(T(TX.lvl[m.satiety] || TX.lvl.unknown, li)) + '</b>']);
        if (m.confidence) {
            const rs = m.confidenceReasons.map(r => r[LANGS[li]] || r.en).filter(Boolean);
            rows.push(['dConfidence', '<b>' + esc(T(TX.conf[m.confidence], li)) + '</b>' + (rs.length ? ' · ' + esc(rs.join('; ')) : '')]);
        }
        return '<div class="fc-det"><h5>' + esc(T(TX.dTitle, li)) + '</h5><dl>' +
            rows.map(r => '<div class="fc-dr"><dt>' + esc(T(TX[r[0]], li)) + '</dt><dd>' + r[1] + '</dd></div>').join('') + '</dl>' +
            (m.labelCheck && m.labelCheck.length ? '<p class="fc-lc">' + esc(fmt(T(TX.labelCheck, li), [m.labelCheck.length])) + '</p>' : '') +
            '<p class="fc-ver">' + esc(T(TX.policy, li)) + ': ' + esc([m.policyVersion, m.engine].filter(Boolean).join(' · ')) + '</p></div>';
    }

    return {TX, model, cardHTML, detailsHTML};
});
