/* LOWiSPIKE · in-store scan: pure rules (Oct 16, 2026).
   E-man: "When I'm grocery shopping and I see a product in front of me, I scan it and I just quickly want to see if it's estimated to
   spike my insulin or not. Then I put it into my cart in real life and also digitally. Other detailed information is optional below
   that. Some people want to read it, some people don't."
   No DOM here: the one big verdict (spike / mild / no spike / not sure) from the scanner's own label rating, the words for it in
   en/de/es, and adding a scanned product to the shopping list as "in the cart". shop-scan.js draws it; index.html's scanner reads
   the barcode (BarcodeDetector or ZXing, the same camera code as Scan, not a copy). */
(function (root) {
    'use strict';
    /* the scanner's rating (index.html rate()): ok | better | spike | unknown. Shown as one of four big verdicts. */
    const MAP = { spike: 'spike', better: 'mild', ok: 'none', unknown: 'unknown' };
    const LEVELS = ['spike', 'mild', 'none', 'unknown'];
    function level(v) { return MAP[v] || (LEVELS.indexOf(v) >= 0 ? v : 'unknown'); }
    /* p: a product as the scanner looks it up ({verdict, facts, ingredients, ...}); rate: the scanner's rate(p) */
    /* scanfe-h2 (Oct 23, 2026): live first, like scan-sort. The live rating is rate(p) made stricter by the Food check verdict
       (LowiSpikeCore.tighten: NEIN -> spike, SELTEN -> at least better) when rate returns an engine result. A stored verdict
       only fills in when there is no live one, except a stored spike, which still wins, so an old "ok" row can't hide a spike. */
    let SC = null;
    function spikeCore() {
        if (SC) return SC;
        if (typeof window !== 'undefined' && window.LowiSpikeCore) return window.LowiSpikeCore;
        if (typeof require === 'function') { try { SC = require('./spike-core.js'); } catch (e) { SC = null; } }
        return SC;
    }
    const RATED = { ok: 1, better: 1, spike: 1 };
    function verdictOf(p, rate) {
        if (!p || p.notFound) return 'unknown';
        const stored = RATED[p.verdict] ? p.verdict : 'unknown';
        let live = 'unknown';
        if (typeof rate === 'function') {
            try {
                const r = rate(p);
                if (r && RATED[r.verdict]) live = r.verdict;
                const S = r && r.engine && !p.manual ? spikeCore() : null;
                if (S && typeof S.tighten === 'function') { const v = S.tighten(p, r); if (RATED[v]) live = v; }
            } catch (e) {}
        }
        if (stored === 'spike' || live === 'spike') return 'spike';
        if (live !== 'unknown') return MAP[live];
        if (stored !== 'unknown') return MAP[stored];
        return 'unknown';
    }

    const TX = {
        title: ['Shopping scan', 'Einkaufs-Scan', 'Escaneo de compra'],
        modeOn: ['Shopping', 'Einkauf', 'Compra'],
        modeL: ['Shopping scan: spike check and add to cart', 'Einkaufs-Scan: Spike-Check und in den Wagen', 'Escaneo de compra: ver pico y añadir al carro'],
        entry: ['Scan a product', 'Produkt scannen', 'Escanear producto'],
        entryS: ['Spike or not, then into your cart', 'Spike oder nicht, dann in den Wagen', '¿Pico o no? Y al carro'],
        est: ['Estimate', 'Schätzung', 'Estimación'],
        estL: ['Estimate from the label', 'Schätzung nach dem Etikett', 'Estimación según la etiqueta'],
        v_spike: ['Higher', 'Höher', 'Alto'],
        s_spike: ['Higher estimated blood sugar impact', 'Höhere geschätzte Wirkung auf den Blutzucker', 'Impacto estimado más alto en el azúcar en sangre'],
        v_mild: ['Moderate', 'Mittel', 'Moderado'],
        s_mild: ['Moderate estimated blood sugar impact', 'Mittlere geschätzte Wirkung auf den Blutzucker', 'Impacto estimado moderado en el azúcar en sangre'],
        v_none: ['Lower', 'Niedriger', 'Bajo'],
        s_none: ['Lower estimated blood sugar impact', 'Niedrigere geschätzte Wirkung auf den Blutzucker', 'Impacto estimado más bajo en el azúcar en sangre'],
        v_unknown: ['Not sure', 'Unklar', 'No seguro'],
        s_unknown: ['Not enough label data for an estimate', 'Zu wenig Etikett-Daten für eine Schätzung', 'Faltan datos de la etiqueta'],
        add: ['Add to cart', 'In den Wagen', 'Añadir al carro'],
        added: ['In your cart', 'Im Wagen', 'En tu carro'],
        again: ['In your cart · {0}×', 'Im Wagen · {0}×', 'En tu carro · {0}×'],
        ticked: ['Ticked off your list', 'Auf deiner Liste abgehakt', 'Tachado de tu lista'],
        undo: ['Undo', 'Rückgängig', 'Deshacer'],
        next: ['Scan next', 'Nächstes scannen', 'Escanear otro'],
        cart: ['Shopping list', 'Einkaufsliste', 'Lista de compra'],
        details: ['Details', 'Details', 'Detalles'],
        per100: ['Per 100 g', 'Pro 100 g', 'Por 100 g'],
        per100ml: ['Per 100 ml', 'Pro 100 ml', 'Por 100 ml'],
        f_s: ['Sugar', 'Zucker', 'Azúcar'],
        f_c: ['Carbs', 'Kohlenhydrate', 'Carbohidratos'],
        f_f: ['Fibre', 'Ballaststoffe', 'Fibra'],
        f_p: ['Protein', 'Eiweiß', 'Proteína'],
        why: ['Why', 'Warum', 'Por qué'],
        ing: ['Ingredients', 'Zutaten', 'Ingredientes'],
        noData: ['No label data yet.', 'Noch keine Etikett-Daten.', 'Aún no hay datos de la etiqueta.'],
        legal: ['A rough estimate from the label, not medical advice. Your body may react differently.', 'Eine grobe Schätzung nach dem Etikett, kein medizinischer Rat. Dein Körper kann anders reagieren.', 'Una estimación aproximada según la etiqueta, no es consejo médico. Tu cuerpo puede reaccionar distinto.'],
        lookup: ['Looking it up…', 'Suche das Produkt…', 'Buscando…'],
        unknownT: ['We don\'t know this product yet', 'Dieses Produkt kennen wir noch nicht', 'Aún no conocemos este producto'],
        offlineT: ['No internet right now', 'Gerade kein Internet', 'Sin internet ahora'],
        /* Oct 20 food audit: a lookup that got no answer (weak signal in the shop, a time out) is not an unknown product */
        noReachT: ['I couldn\'t check this one right now', 'Ich konnte das gerade nicht prüfen', 'No pude comprobarlo ahora'],
        retry: ['Try again', 'Nochmal versuchen', 'Reintentar'],
        unknownS: ['Type its name for a quick estimate.', 'Tipp den Namen ein für eine schnelle Schätzung.', 'Escribe su nombre para una estimación rápida.'],
        namePh: ['Product name, e.g. skyr', 'Produktname, z. B. Skyr', 'Nombre, p. ej. skyr'],
        search: ['Search', 'Suchen', 'Buscar'],
        byName: ['Search by name', 'Nach Namen suchen', 'Buscar por nombre'],
        nothing: ['Nothing found. You can still add it.', 'Nichts gefunden. Du kannst es trotzdem hinzufügen.', 'No se encontró nada. Puedes añadirlo igual.'],
        fromName: ['Estimate from the name only', 'Schätzung nur nach dem Namen', 'Estimación solo por el nombre'],
        bc: ['Barcode {0}', 'Barcode {0}', 'Código {0}'],
        unnamed: ['Product {0}', 'Produkt {0}', 'Producto {0}'],
        /* Oct 26 one scanner: the same card for every scan, with the useful parts of the old long result worked in once */
        ate: ['I ate this', 'Hab ich gegessen', 'Me lo comí'],
        swapH: ['Better pick', 'Bessere Wahl', 'Mejor opción'],
        swapR: ['Recipe', 'Rezept', 'Receta'],
        swapOpen: ['Open', 'Öffnen', 'Abrir'],
        swapShow: ['Show', 'Zeigen', 'Ver'],
        portion: ['Portion', 'Portion', 'Ración'],
        estG: ['Estimate for {0}', 'Schätzung für {0}', 'Estimación para {0}'],
        packPhoto: ['Add it with a photo of the pack', 'Mit einem Foto der Packung hinzufügen', 'Añádelo con una foto del envase'],
        /* Oct 26 scan-why: the tiny curve, How often, the Why? tap and the plain portion source line */
        graphL: ['Estimate, not a measurement', 'Schätzung, keine Messung', 'Estimación, no una medición'],
        bsG: ['Blood sugar · estimate for {0}', 'Blutzucker · Schätzung für {0}', 'Azúcar en sangre · estimación para {0}'],
        bs: ['Blood sugar · estimate', 'Blutzucker · Schätzung', 'Azúcar en sangre · estimación'],
        oftenH: ['How often', 'Wie oft', 'Cada cuánto'],
        whyB: ['Why?', 'Warum?', '¿Por qué?'],
        whyFoot: ['A general guide for this portion, not medical advice.', 'Eine allgemeine Orientierung für diese Portion, kein ärztlicher Rat.', 'Una guía general para esta porción, no un consejo médico.'],
        o_none: ['Fine every day at this portion', 'Jeden Tag okay, in dieser Portion', 'Bien todos los días, en esta porción'],
        o_mild: ['Up to 2–3 times a week at this portion', 'Bis zu 2–3 Mal pro Woche, in dieser Portion', 'Hasta 2–3 veces por semana, en esta porción'],
        o_mildP: ['Every day at {0}. At {1}: 2–3 times a week', 'Jeden Tag bei {0}. Bei {1}: 2–3 Mal pro Woche', 'Todos los días con {0}. Con {1}: 2–3 veces por semana'],
        o_spike: ['Once a week at most, as a small portion', 'Höchstens einmal pro Woche, als kleine Portion', 'Como mucho una vez por semana, en porción pequeña'],
        o_unknown: ['Can\'t say yet: the label is missing numbers', 'Noch nicht zu sagen: Dem Etikett fehlen Zahlen', 'No podemos decirlo aún: faltan números en la etiqueta'],
        m_none: ['Lower means: this food likely raises your blood sugar only a little.', 'Niedriger heißt: Dein Blutzucker steigt bei diesem Essen wahrscheinlich nur wenig.', 'Bajo significa: este alimento probablemente sube poco tu azúcar en sangre.'],
        m_mild: ['Moderate means: your blood sugar likely goes up more than with a Lower food.', 'Mittel heißt: Dein Blutzucker steigt wahrscheinlich mehr als bei einem niedrigeren Essen.', 'Moderado significa: tu azúcar en sangre probablemente sube más que con un alimento Bajo.'],
        m_mildP: ['Moderate here is about the amount, not about sugar.', 'Mittel geht hier um die Menge, nicht um Zucker.', 'Aquí Moderado va de la cantidad, no del azúcar.'],
        m_spike: ['Higher means: your blood sugar likely goes up fast and high.', 'Höher heißt: Dein Blutzucker steigt wahrscheinlich schnell und stark.', 'Alto significa: tu azúcar en sangre probablemente sube rápido y mucho.'],
        m_pol: ['{0} here is about more than blood sugar.', '{0} geht hier um mehr als den Blutzucker.', 'Aquí {0} va de algo más que el azúcar en sangre.'],
        m_unknown: ['Not sure means: the label doesn\'t give enough numbers to tell.', 'Unklar heißt: Das Etikett hat zu wenige Zahlen, um es zu sagen.', 'No seguro significa: la etiqueta no da suficientes números para saberlo.'],
        w_nuts: ['Very few carbs ({0} in {1}), so blood sugar barely moves. But {1} of nuts is a lot of fat and energy{2}.', 'Sehr wenig Kohlenhydrate ({0} in {1}), der Blutzucker bewegt sich kaum. Aber {1} Nüsse sind viel Fett und Energie{2}.', 'Muy pocos carbohidratos ({0} en {1}), el azúcar en sangre casi no se mueve. Pero {1} de frutos secos es mucha grasa y energía{2}.'],
        w_cheese: ['Very few carbs ({0} in {1}), so blood sugar barely moves. But {1} of cheese is a lot of fat and energy{2}.', 'Sehr wenig Kohlenhydrate ({0} in {1}), der Blutzucker bewegt sich kaum. Aber {1} Käse sind viel Fett und Energie{2}.', 'Muy pocos carbohidratos ({0} en {1}), el azúcar en sangre casi no se mueve. Pero {1} de queso es mucha grasa y energía{2}.'],
        w_pol: ['Not about sugar: {0}', 'Nicht wegen Zucker: {0}', 'No por el azúcar: {0}'],
        w_sweet: ['It has a sweetener ({0}). LOWiSPIKE counts sweeteners like sugar.', 'Es enthält Süßstoff ({0}). LOWiSPIKE zählt Süßstoff wie Zucker.', 'Lleva edulcorante ({0}). LOWiSPIKE cuenta los edulcorantes como azúcar.'],
        w_drink: ['It\'s a sweet drink: {0} sugar in {1}. Sugar you drink gets into the blood fast.', 'Ein süßes Getränk: {0} Zucker in {1}. Getrunkener Zucker geht schnell ins Blut.', 'Es una bebida dulce: {0} de azúcar en {1}. El azúcar que bebes pasa rápido a la sangre.'],
        w_sugar: ['It has {0} sugar in {1}. Sugar gets into the blood quickly.', 'Es hat {0} Zucker in {1}. Zucker geht schnell ins Blut.', 'Tiene {0} de azúcar en {1}. El azúcar pasa rápido a la sangre.'],
        w_refined: ['It\'s made mostly of {0}. White flour and starch turn into sugar quickly.', 'Es besteht vor allem aus {0}. Weißmehl und Stärke werden schnell zu Zucker.', 'Está hecho sobre todo de {0}. La harina blanca y el almidón se vuelven azúcar rápido.'],
        w_cHi: ['It has {0} carbs in {1}. That\'s a lot, and carbs turn into sugar in your blood.', 'Es hat {0} Kohlenhydrate in {1}. Das ist viel, und Kohlenhydrate werden im Blut zu Zucker.', 'Tiene {0} de carbohidratos en {1}. Es mucho, y los carbohidratos se vuelven azúcar en la sangre.'],
        w_cMid: ['It has {0} carbs in {1}: some, but not a lot.', 'Es hat {0} Kohlenhydrate in {1}: etwas, aber nicht viel.', 'Tiene {0} de carbohidratos en {1}: algo, pero no mucho.'],
        w_cLo: ['Only {0} carbs in {1}, so there\'s little to turn into sugar.', 'Nur {0} Kohlenhydrate in {1}, also wenig, was zu Zucker wird.', 'Solo {0} de carbohidratos en {1}, así que hay poco que se vuelva azúcar.'],
        w_slow: ['Fibre and protein help it go in more slowly.', 'Ballaststoffe und Eiweiß lassen es langsamer ins Blut gehen.', 'La fibra y la proteína hacen que pase más despacio.'],
        w_nodata: ['The label is missing the carb and sugar numbers.', 'Auf dem Etikett fehlen Kohlenhydrate und Zucker.', 'A la etiqueta le faltan los carbohidratos y el azúcar.'],
        psrcH: ['Rated for', 'Bewertet für', 'Valorado para'],
        psrc_maker: ['the serving printed on the pack', 'die Portion, die auf der Packung steht', 'la ración que pone el envase'],
        psrc_nuts: ['the usual portion of nuts, a small handful', 'die übliche Portion Nüsse, eine kleine Handvoll', 'la ración habitual de frutos secos, un puñado pequeño'],
        psrc_cheese: ['the usual portion of cheese', 'die übliche Portion Käse', 'la ración habitual de queso'],
        psrc_group: ['a usual portion for this kind of food', 'eine übliche Portion für diese Art Essen', 'una ración habitual para este tipo de alimento'],
        psrc_last: ['the amount you had last time', 'die Menge vom letzten Mal', 'la cantidad de la última vez'],
        psrc_mine: ['the amount you picked', 'die Menge, die du gewählt hast', 'la cantidad que elegiste'],
        psrcHint: ['Pick another amount and the rating changes with it.', 'Wähle eine andere Menge, dann ändert sich die Bewertung mit.', 'Elige otra cantidad y la valoración cambia con ella.']
    };
    function tx(k, li) { const r = TX[k]; let s = r ? (r[li | 0] || r[0]) : k; for (let i = 2; i < arguments.length; i++) s = s.split('{' + (i - 2) + '}').join(arguments[i]); return s; }
    function langIndex(code) { return ({ de: 1, es: 2 })[String(code || 'en').slice(0, 2)] || 0; }

    const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
    /* only the label photo hosts the app already uses (Open Food Facts, the shared dex storage), never a quote or a space */
    const safeImg = u => { u = String(u || ''); return /^https:\/\/((images|static)\.openfoodfacts\.org|[a-z0-9-]+\.supabase\.co\/storage)\//.test(u) && !/["'<>\s]/.test(u) ? u : ''; };

    /* Add a scanned product to the shopping list (LOWI_SHELF's SH.list) as "in the cart" (ticked, like a tick in shop mode).
       - the same product already open on the list: tick it off (no duplicate)
       - the same product already in the cart: one more (q + 1)
       - else a new ticked item, marked via:'scan' with its barcode and verdict
       Returns {action:'added'|'ticked'|'again', item, undo} and changes list in place; undo(list) puts it back as it was. */
    function cartAdd(list, p, mkId) {
        if (!Array.isArray(list) || !p) return null;
        const name = String(p.name || '').trim().slice(0, 80), bc = String(p.barcode || '').replace(/\D/g, '');
        if (!name && !bc) return null;
        const nk = norm(name);
        const same = i => (bc && i.bc === bc) || (nk && norm(i.n) === nk);
        const open = list.find(i => !i.done && same(i));
        if (open) {
            const before = { done: open.done, bc: open.bc, v: open.v };
            open.done = true; if (bc && !open.bc) open.bc = bc; if (p.level) open.v = p.level;
            return { action: 'ticked', item: open, undo: l => { const i = l.find(x => x.id === open.id); if (i) Object.assign(i, before); } };
        }
        const have = list.find(i => i.done && i.via === 'scan' && same(i));
        if (have) {
            have.q = (have.q || 1) + 1;
            return { action: 'again', item: have, undo: l => { const i = l.find(x => x.id === have.id); if (i) i.q = Math.max(1, (i.q || 2) - 1); } };
        }
        const id = typeof mkId === 'function' ? mkId() : 'ss' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const item = { id, pid: '', n: name || bc, e: '🛒', photo: safeImg(p.img), s: 'any', p: null, u: '', rec: '', done: true, via: 'scan', bc, v: p.level || '', q: 1, at: Date.now() };
        list.push(item);
        return { action: 'added', item, undo: l => { const k = l.findIndex(x => x.id === id); if (k >= 0) l.splice(k, 1); } };
    }
    /* how many scanned things sit in the cart (q counts) */
    function cartCount(list) { return (Array.isArray(list) ? list : []).filter(i => i.done && i.via === 'scan').reduce((a, i) => a + (i.q || 1), 0); }

    /* the optional details, in the order people read a label */
    function factRows(f) {
        f = f || {};
        return [['f_s', f.s], ['f_c', f.c], ['f_f', f.f], ['f_p', f.p]].filter(r => r[1] != null && isFinite(r[1]));
    }
    /* after a hit the same code is ignored for a moment, so a product still in front of the camera is not counted again */
    const SAME_MS = 4000;
    function repeatHit(code, last, now) { return !!(last && last.code === code && now - last.at < SAME_MS); }
    /* shopping mode stays on for a shopping trip: two hours after the last use */
    const TRIP_MS = 2 * 3600 * 1000;
    function tripOn(stamp, now) { const s = Number(stamp) || 0; return s > 0 && now - s >= 0 && now - s < TRIP_MS; }

    /* ---------- Oct 26 scan-why (Emmanuel: "when it says moderate, what does that mean? Can I eat this every day? Every week? ...
       I need to know exactly how many times I can eat this ... a Why button ... a simple explanation that a 9-year-old and a
       70-80-year-old would understand") ---------- */
    const RANKL = { unknown: -1, none: 0, mild: 1, spike: 2 };
    /* the card's verdict at an amount you picked: the same rule as the first verdict (assess made stricter by the Food check,
       LowiSpikeCore.tighten), so 50 g of almonds can't jump back to Lower when you pick it in Details */
    function levelAt(p, grams) {
        const S = spikeCore(); if (!S || !p || p.notFound || !(grams > 0)) return null;
        try {
            const a = S.assess(p, { servingG: +grams });
            if (!a || !RATED[a.verdict]) return null;
            return level(typeof S.tighten === 'function' ? S.tighten(p, a) : a.verdict);
        } catch (e) { return null; }
    }
    /* the tiny estimated curve on the verdict (viewBox 0 0 80 36, baseline y 31): a gentle low hump, a taller hump, a sharp spike.
       A drawing of the estimate's size, never a measurement. */
    const CURVES = {
        none: { d: 'M2 31 C14 31 20 24 30 24 S46 31 58 31 L78 31', peak: 7 },
        mild: { d: 'M2 31 C12 31 18 14 28 14 S44 31 56 31 L78 31', peak: 17 },
        spike: { d: 'M2 31 C8 31 13 4 19 4 S27 27 36 29 S60 31 78 31', peak: 27 }
    };
    function curve(lvl) { return CURVES[lvl] || null; }
    let FK = null;
    function knowledge() {
        if (FK) return FK;
        if (typeof window !== 'undefined' && window.LowiFoodKnowledge) return window.LowiFoodKnowledge;
        if (typeof require === 'function') { try { FK = require('./food-knowledge-core.js'); } catch (e) { FK = null; } }
        return FK;
    }
    /* explain(p, grams, lvl, lang): what Why? and How often say for the verdict lvl shown on the card at that amount.
       {often, lines: [what the word means, why this food (, what slows it)], g, unit, src: 'nuts'|'cheese'|'group'|'maker'|null}.
       How often in numbers (Emmanuel asked for a number; it replaces the 24 Oct "no frequency" wording), a general guide for the
       portion, never a promise: Lower = fine every day, Moderate = up to 2-3 times a week, Higher = once a week at most. A
       Moderate that is only about a big portion of nuts or cheese says the small portion that is fine every day. */
    function explain(p, grams, lvl, lang) {
        const li = typeof lang === 'number' ? lang : langIndex(lang), t = (k, ...a) => tx(k, li, ...a);
        lvl = level(lvl);
        const S = spikeCore();
        let a = null;
        try { a = S && p && !p.notFound ? S.assess(p, grams > 0 ? { servingG: +grams } : undefined) : null; } catch (e) { a = null; }
        const eng = a && a.engine, sv = eng && eng.serving, sh = (sv && sv.shown) || {}, why = (a && a.why) || [];
        const unit = sv && sv.unit === 'ml' ? 'ml' : 'g', g = sv && sv.g > 0 ? Math.round(sv.g) : null;
        const G = v => (v >= 10 || v === 0 ? Math.round(v) : Math.round(v * 10) / 10).toString().replace('.', li ? ',' : '.');
        const amt = v => G(v) + ' g', at = g ? g + ' ' + unit : '';
        const bs = a && RATED[a.verdict] ? level(a.verdict) : 'unknown';
        const pol = eng && eng.policy, rule = (pol && pol.decidedBy) || '';
        const group = sv && sv.group, src = !sv ? null : sv.source === 'manufacturer' ? 'maker' : group === 'nuts' || group === 'cheese' ? group : 'group';
        const port = bs === 'none' && lvl === 'mild' && /nuts_large|cheese_large/.test(rule) ? (/nuts/.test(rule) ? 'nuts' : 'cheese') : null;
        const polUp = !port && lvl !== 'unknown' && bs !== 'unknown' && RANKL[lvl] > RANKL[bs];
        const lines = [];
        lines.push(port ? t('m_mildP') : polUp ? t('m_pol', t('v_' + lvl)) : t('m_' + lvl));
        const has = k => why.find(w => w && w[0] === k);
        const c = sh.carbs, s = sh.sugar;
        let w = '';
        if (lvl === 'unknown' || bs === 'unknown') w = t('w_nodata');
        else if (port) w = t('w_' + port, amt(c || 0), at, sh.kcal != null ? ': ' + Math.round(sh.kcal) + ' kcal' : '');
        else if (polUp) {
            let r = ''; try { const K = knowledge(); r = K && K.reasonText ? K.reasonText(rule, ['en', 'de', 'es'][li]) : ''; } catch (e) { r = ''; }
            if (!r && pol && li === 0) r = pol.why || '';
            w = r ? t('w_pol', String(r).replace(/\.?$/, '.')) : '';
        }
        if (!w && bs !== 'unknown') {
            const sw = has('s_sweet'), rf = has('s_refined_i');
            if (sw && lvl === 'spike') w = t('w_sweet', sw[1]);
            else if (unit === 'ml' && (s || 0) >= 5) w = t('w_drink', amt(s), at);
            else if ((s || 0) >= 8 && lvl !== 'none') w = t('w_sugar', amt(s), at);
            else if (rf && lvl !== 'none') w = t('w_refined', rf[1]);
            else if (c != null) w = t(bs === 'spike' ? 'w_cHi' : bs === 'mild' ? 'w_cMid' : 'w_cLo', amt(c), at);
        }
        if (w) lines.push(w);
        if (!port && !polUp && (lvl === 'none' || lvl === 'mild') && ((sh.fibre || 0) >= 2 || (sh.protein || 0) >= 6)) lines.push(t('w_slow'));
        if (lines.length < 2) lines.push(t('w_nodata'));
        const often = lvl === 'unknown' ? t('o_unknown') : port ? t('o_mildP', '30 ' + unit, at) : t('o_' + lvl);
        return { often, lines: lines.slice(0, 4), g, unit, src, bs };
    }

    const api = { MAP, LEVELS, level, verdictOf, levelAt, curve, explain, TX, tx, langIndex, norm, safeImg, cartAdd, cartCount, factRows, SAME_MS, repeatHit, TRIP_MS, tripOn };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiShopScanCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
