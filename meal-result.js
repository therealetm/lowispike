/* LOWiSPIKE meal result (Oct 21, 2026)
   Why: Emmanuel on the photo result: "the first thing I should be seeing is if it's going to spike my insulin. Or not.
   That's the only thing that matters here." One question per screen, and the biggest block answers it.
   Order: 1) the spike verdict, 2) each food on its own card (portion + kcal, macros small), 3) tap a food to fix it
   (what it really is + how many), 4) the XP this meal earns, from the app's own rule (LowiVitalsBridge.mealWhy/mealXp:
   15 XP, 0 for a spike, a duplicate or past the daily cap, never minus points), 5) optional drinks.
   Real case: the photo read Bel Paese cheese as "garlic cloves"; before, the only fix was one "What is it?" box for the
   whole meal. Fixes and drinks are estimated here, on the device (small table + the USDA meal DB): they never send the
   photo again, so they never use one of the 3 photo checks a day.
   One verdict: LowiMealSnap.bloodSugar (meal-photo.js), the same estimate the shared Community meal card shows. Its level
   goes into the meal log as lvl, so the XP shown here is the XP the log gives.
   Reusable: mount(box, form, {dishes}) works for any list of foods, not only a photo (the one meal-logging screen later).
   The pure parts (parseAmount, estimateItem, estimateDrink, verdict, xpFor, formValues) run in node tests. */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiMealResult = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
    'use strict';
    const KEYS = ['kcal', 'protein', 'carbs', 'sugar', 'fiber', 'fat'];
    const CAP = { kcal: 3000, protein: 200, carbs: 400, sugar: 300, fiber: 100, fat: 250, grams: 3000 };
    const MAX_FOODS = 8, MAX_DRINKS = 4, MAX_COUNT = 50;
    const LVL = { low: 'low', mid: 'medium', high: 'high' };
    const STR = {
        en: {
            q: 'Spike check', low: 'No spike', mid: 'Small rise', high: 'Spike likely',
            whyLow: 'Only about {net} g net carbs. Your blood sugar should stay steady.',
            whyMid: 'About {net} g net carbs. Expect a moderate rise, not a spike.',
            whyHigh: 'About {net} g net carbs. That’s enough to spike.',
            whyDrink: 'The sugary drink alone is enough to spike.',
            est: 'Estimate from the photo, not a measurement.', lowConf: 'The photo was hard to read, so check the foods below.',
            see: 'What I see', tapFix: 'Tap a food to fix it', edit: 'Fix', what: 'What is it really?', many: 'How many? (optional)', manyPh: 'e.g. 2',
            save: 'Update', cancel: 'Cancel', remove: 'Remove', kept: 'I don’t know “{name}” yet, so I kept the photo’s amounts.',
            drinks: 'Drinking anything?', addDrink: 'Add a drink', drinkWhat: 'What are you drinking?', drinkPh: 'e.g. cola, 0.5 l beer', add: 'Add',
            chips: ['Water', 'Coffee', 'Cola', 'Juice', 'Beer', 'Wine'],
            xpOk: 'for logging this meal', xpQuest: '{base} for the meal + {quest} for today\u2019s eat quest', xpSpike: 'Spiky meals earn nothing, and never cost points.', xpDup: 'You already logged this today.', xpCap: 'Daily limit of {cap} meals reached.', xpCapQuest: '{quest} for today\u2019s eat quest. Past {cap} meals a day, the meal itself earns nothing.',
            total: 'Total', pcs: 'pcs', none: 'Nothing left to check. Type what it is below.', protein: 'protein', carbs: 'carbs', fat: 'fat', kcal: 'kcal'
        },
        de: {
            q: 'Spike-Check', low: 'Kein Spike', mid: 'Leichter Anstieg', high: 'Spike wahrscheinlich',
            whyLow: 'Nur etwa {net} g Netto-Kohlenhydrate. Dein Blutzucker sollte ruhig bleiben.',
            whyMid: 'Etwa {net} g Netto-Kohlenhydrate. Eher ein mäßiger Anstieg, kein Spike.',
            whyHigh: 'Etwa {net} g Netto-Kohlenhydrate. Das reicht für einen Spike.',
            whyDrink: 'Allein das süße Getränk reicht für einen Spike.',
            est: 'Schätzung aus dem Foto, keine Messung.', lowConf: 'Das Foto war schwer zu erkennen, prüf die Lebensmittel unten.',
            see: 'Das sehe ich', tapFix: 'Tipp ein Lebensmittel an, um es zu korrigieren', edit: 'Ändern', what: 'Was ist es wirklich?', many: 'Wie viele? (optional)', manyPh: 'z. B. 2',
            save: 'Übernehmen', cancel: 'Abbrechen', remove: 'Entfernen', kept: 'Ich kenne „{name}“ noch nicht, also habe ich die Mengen aus dem Foto behalten.',
            drinks: 'Trinkst du etwas dazu?', addDrink: 'Getränk hinzufügen', drinkWhat: 'Was trinkst du?', drinkPh: 'z. B. Cola, 0,5 l Bier', add: 'Hinzufügen',
            chips: ['Wasser', 'Kaffee', 'Cola', 'Saft', 'Bier', 'Wein'],
            xpOk: 'für diese Mahlzeit', xpQuest: '{base} für die Mahlzeit + {quest} für die heutige Ess-Quest', xpSpike: 'Spike-Mahlzeiten geben nichts, ziehen aber auch nichts ab.', xpDup: 'Heute schon eingetragen.', xpCap: 'Tageslimit von {cap} Mahlzeiten erreicht.', xpCapQuest: '{quest} für die heutige Ess-Quest. Ab {cap} Mahlzeiten am Tag gibt die Mahlzeit selbst nichts.',
            total: 'Gesamt', pcs: 'Stk.', none: 'Nichts mehr zu prüfen. Schreib unten, was es ist.', protein: 'Eiweiß', carbs: 'KH', fat: 'Fett', kcal: 'kcal'
        },
        es: {
            q: 'Control de pico', low: 'Sin pico', mid: 'Subida leve', high: 'Pico probable',
            whyLow: 'Solo unos {net} g de carbohidratos netos. Tu azúcar debería mantenerse estable.',
            whyMid: 'Unos {net} g de carbohidratos netos. Una subida moderada, no un pico.',
            whyHigh: 'Unos {net} g de carbohidratos netos. Suficiente para un pico.',
            whyDrink: 'Solo la bebida azucarada ya basta para un pico.',
            est: 'Estimación a partir de la foto, no una medición.', lowConf: 'La foto era difícil de leer, revisa los alimentos.',
            see: 'Lo que veo', tapFix: 'Toca un alimento para corregirlo', edit: 'Corregir', what: '¿Qué es en realidad?', many: '¿Cuántos? (opcional)', manyPh: 'p. ej. 2',
            save: 'Actualizar', cancel: 'Cancelar', remove: 'Quitar', kept: 'Aún no conozco «{name}», así que mantuve las cantidades de la foto.',
            drinks: '¿Bebes algo?', addDrink: 'Añadir bebida', drinkWhat: '¿Qué bebes?', drinkPh: 'p. ej. cola, 0,5 l de cerveza', add: 'Añadir',
            chips: ['Agua', 'Café', 'Cola', 'Zumo', 'Cerveza', 'Vino'],
            xpOk: 'por esta comida', xpQuest: '{base} por la comida + {quest} por la misión de hoy', xpSpike: 'Las comidas con pico no dan nada, pero tampoco restan.', xpDup: 'Ya registrado hoy.', xpCap: 'Límite diario de {cap} comidas.', xpCapQuest: '{quest} por la misión de hoy. Pasadas {cap} comidas al día, la comida en sí no da nada.',
            total: 'Total', pcs: 'uds.', none: 'No queda nada que revisar. Escribe abajo qué es.', protein: 'proteína', carbs: 'carbs', fat: 'grasa', kcal: 'kcal'
        }
    };
    const lang = () => { try { const l = root.LowiLang && root.LowiLang.get ? root.LowiLang.get() : (root.document && document.documentElement.lang) || 'en'; return STR[l] ? l : 'en'; } catch (e) { return 'en'; } };
    const t = (k, l, v) => { let s = (STR[l] || STR.en)[k]; if (s == null) s = STR.en[k]; if (s == null) s = k; if (v) for (const x in v) s = String(s).split('{' + x + '}').join(String(v[x])); return s; };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const num = (v, max) => { const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v; return typeof n === 'number' && isFinite(n) && n > 0 ? Math.min(max, Math.round(n * 10) / 10) : 0; };
    const fold = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');
    const cap1 = (s) => { s = String(s || '').replace(/\s+/g, ' ').trim().slice(0, 60); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; };
    const snap = () => root.LowiMealSnap || (typeof require === 'function' ? (() => { try { return require('./meal-photo.js'); } catch (e) { return null; } })() : null);

    /* Small table for what the photo or the USDA meal DB gets wrong (cheese brands) and for drinks, per 100 g or 100 ml.
       serve = one piece / one usual glass. Matched on lower-case text without accents, first match wins. */
    const P = (kcal, protein, carbs, sugar, fiber, fat) => ({ kcal, protein, carbs, sugar, fiber, fat });
    const TABLE = [
        { re: /\bbaby ?bel\b/, unit: 'g', serve: 20, per: P(305, 22, 0, 0, 0, 24) },
        { re: /\bbel ?paese\b/, unit: 'g', serve: 25, per: P(350, 23, 0.5, 0.5, 0, 28.5) },
        { re: /\b(water|wasser|agua|mineral ?water|mineralwasser|sprudel)\b/, drink: 1, unit: 'ml', serve: 250, per: P(0, 0, 0, 0, 0, 0) },
        { re: /\b(diet|zero|light|sugar ?free|zuckerfrei|sin azucar)\b/, drink: 1, unit: 'ml', serve: 330, per: P(0.4, 0, 0.1, 0, 0, 0), need: /\b(cola|coke|pepsi|fanta|sprite|7 ?up|soda|limo|limonade|lemonade|mezzo ?mix|spezi|refresco|energy|red ?bull|monster)\b/ },
        { re: /\b(energy ?drink|energy|red ?bull|monster|rockstar)\b/, drink: 1, unit: 'ml', serve: 250, per: P(45, 0, 11, 11, 0, 0) },
        { re: /\b(ice ?tea|iced ?tea|eistee|te helado)\b/, drink: 1, unit: 'ml', serve: 330, per: P(30, 0, 7.5, 7.5, 0, 0) },
        { re: /\b(bubble ?tea|boba)\b/, drink: 1, unit: 'ml', serve: 400, per: P(70, 0.5, 15, 12, 0, 1.5) },
        { re: /\b(cola|coke|pepsi|fanta|sprite|7 ?up|soda|soft ?drink|limo|limonade|lemonade|mezzo ?mix|spezi|refresco|ginger ale|tonic)\b/, drink: 1, unit: 'ml', serve: 330, per: P(42, 0, 10.6, 10.6, 0, 0) },
        { re: /\b(schorle|spritzer)\b/, drink: 1, unit: 'ml', serve: 330, per: P(24, 0, 5.5, 5.5, 0, 0) },
        { re: /\b(smoothie)\b/, drink: 1, unit: 'ml', serve: 250, per: P(55, 0.8, 13, 11, 1.2, 0.3) },
        { re: /\b(protein ?shake|eiweiss ?shake)\b/, drink: 1, unit: 'ml', serve: 300, per: P(40, 8, 1.5, 1, 0, 0.5) },
        { re: /\b(milk ?shake|batido)\b/, drink: 1, unit: 'ml', serve: 300, per: P(110, 3.5, 18, 17, 0, 3) },
        { re: /\b(juice|saft|zumo|jugo|o-?saft|orangensaft|apfelsaft)\b/, drink: 1, unit: 'ml', serve: 250, per: P(45, 0.7, 10.4, 9, 0.2, 0.1) },
        { re: /\b(latte|cappuccino|flat white|milchkaffee|cafe con leche|macchiato)\b/, drink: 1, unit: 'ml', serve: 250, per: P(40, 2.2, 3.3, 3.3, 0, 2) },
        { re: /\b(coffee|kaffee|cafe|espresso|americano)\b/, drink: 1, unit: 'ml', serve: 200, per: P(1, 0.1, 0, 0, 0, 0) },
        { re: /(^|\s)(tea|tee|te|chai)(\s|$)/, drink: 1, unit: 'ml', serve: 250, per: P(1, 0, 0.2, 0, 0, 0) },
        { re: /\b(milk|milch|leche)\b/, drink: 1, unit: 'ml', serve: 250, per: P(64, 3.4, 4.8, 4.8, 0, 3.6) },
        { re: /\b(beer|bier|cerveza|pils|weizen|radler|lager)\b/, drink: 1, unit: 'ml', serve: 500, per: P(43, 0.5, 3.6, 0, 0, 0) },
        { re: /\b(wine|wein|vino|prosecco|sekt|champagne?|cava)\b/, drink: 1, unit: 'ml', serve: 150, per: P(83, 0.1, 2.6, 0.8, 0, 0) },
        { re: /\b(vodka|whisky|whiskey|rum|gin|tequila|schnaps|brandy)\b/, drink: 1, unit: 'ml', serve: 40, per: P(231, 0, 0, 0, 0, 0) }
    ];
    function lookup(text, drinkOnly) {
        const s = fold(text);
        if (!s.trim()) return null;
        for (const e of TABLE) {
            if (drinkOnly && !e.drink) continue;
            if (e.re.test(s) && (!e.need || e.need.test(s))) return e;
        }
        return null;
    }

    // "2 babybel", "150 g beef", "0,5 l Bier", "500ml cola", "3x egg" -> { count, grams, ml, rest }
    function parseAmount(text) {
        let s = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
        const out = { count: 0, grams: 0, ml: 0, unit: '', rest: '' };
        const vol = s.match(/(\d+(?:[.,]\d+)?)\s*(ml|cl|l|liter|litre|litro)s?\b/i);
        if (vol) {
            const v = parseFloat(vol[1].replace(',', '.')), u = vol[2].toLowerCase();
            out.ml = Math.round(Math.min(3000, u === 'ml' ? v : u === 'cl' ? v * 10 : v * 1000));
            s = s.replace(vol[0], ' ');
        }
        const g = s.match(/(\d+(?:[.,]\d+)?)\s*(g|gr|gramm|grams?|gramos?|kg)\b/i);
        if (g) {
            const v = parseFloat(g[1].replace(',', '.'));
            out.grams = Math.round(Math.min(CAP.grams, /kg/i.test(g[2]) ? v * 1000 : v));
            s = s.replace(g[0], ' ');
        }
        const c = s.match(/^\s*(\d+(?:[.,]\d+)?)(?:\s*(?:x|×)\s+|\s*×\s*|\s+)/i);
        if (c) {
            out.count = Math.min(MAX_COUNT, Math.round(parseFloat(c[1].replace(',', '.')) * 10) / 10);
            s = s.slice(c[0].length);
        } else {
            const one = s.match(/^\s*(a|an|one|ein|eine|einen|un|una|uno)\s+/i);
            if (one) { out.count = 1; s = s.slice(one[0].length); }
        }
        const u = s.match(/^\s*(slices?|scheiben?|cups?|tassen?|pieces?|pcs|st(u|ue|ü)ck|stk\.?|glass(es)?|gl(a|ä)ser|glas|bowls?|sch(u|ü)sseln?|cans?|dosen?|bottles?|flaschen?|halves|half|h(a|ä)lften?|rebanadas?|tazas?|vasos?|piezas?|latas?|botellas?)\s+/i);
        out.unit = u ? u[1].toLowerCase() : '';
        if (u) s = s.slice(u[0].length);
        out.rest = s.replace(/^(of|von|de)\s+/i, '').replace(/\s+/g, ' ').trim();
        return out;
    }

    const scaled = (base, factor) => { const o = {}; for (const k of KEYS) o[k] = Math.round(num(base[k] * factor, CAP[k]) * 10) / 10; o.kcal = Math.round(o.kcal); return o; };
    const portionOf = (count, amount, unit, l, word) => {
        const a = Math.round(amount) + ' ' + unit;
        return count ? count + ' ' + (word || t('pcs', l)) + ' · ~' + a : (unit === 'ml' ? a : '~' + a);
    };
    /* "3 cloves" on the photo's card, no count typed: still 3 of the new food (garlic that was really 3 Bel Paese pieces).
       Not for weights or volumes ("~150 g") and not for halves or slices of something. */
    const piecesOf = (portion) => {
        const m = fold(portion).match(/^\s*~?\s*(\d+(?:[.,]\d+)?)\s*([a-z]*)/);
        if (!m || /^(g|gr|grams?|kg|ml|cl|l|oz|halves|half|halften?|halfte|mitad(es)?|slices?|scheiben?|rebanadas?|tbsp|tsp|el|tl|cups?|tassen?)$/.test(m[2])) return 0;
        const v = parseFloat(m[1].replace(',', '.'));
        return v >= 1 && v <= 20 ? v : 0;
    };
    const countOf = (v) => { const n = num(v, MAX_COUNT); return n >= 0.5 ? n : 0; };

    /* One food the user fixed: text = what it really is (may carry an amount), count = how many (optional),
       prev = the photo's card (its grams stand for "how much is on the plate" when no count is given), db = LowiMealDB.
       Never asks the server. Unknown food: keeps the photo's numbers and says so (src 'kept'). */
    function estimateItem(text, count, prev, db, l) {
        l = l || lang();
        prev = prev || {};
        const a = parseAmount(text);
        const name = cap1(a.rest || prev.name || '');
        const hit = lookup(name);
        const n = countOf(count) || a.count || (a.grams || a.ml || a.unit || (hit && hit.drink) ? 0 : piecesOf(prev.portion));
        const base = { name, count: n || 0 };
        const unit = a.unit || t('pcs', l);
        if (hit) {
            const amount = a.ml || a.grams || (n ? n * hit.serve : (!hit.drink && num(prev.grams, CAP.grams)) || hit.serve);
            return Object.assign(base, { portion: portionOf(n, amount, hit.unit, l, unit), grams: Math.round(amount), drink: !!hit.drink, src: 'table' }, scaled(hit.per, amount / 100));
        }
        if (db && typeof db.parse === 'function' && (!db.ready || db.ready())) {
            const q = (n ? n + ' ' : '') + (a.grams ? a.grams + ' g ' : '') + (/^(cups?|tassen?|glass|glasses|glas|gläser|glaser|bowls?|cans?|bottles?|tazas?|vasos?)$/.test(a.unit) ? a.unit + ' ' : '');   // "2 slices" reads better as "2" in the meal DB
            let r = null;
            try {
                r = db.parse(q + name);
                if ((!r || r.how === 'rough') && name.split(' ').length > 1) {      // "bel paese cheese" -> "cheese"
                    const words = name.split(' ');
                    for (let i = words.length - 1; i >= 0 && (!r || r.how === 'rough'); i--) { if (words[i].length > 2) r = db.parse(q + words[i]); }
                }
            } catch (e) { r = null; }
            if (r && r.how !== 'rough' && r.grams > 0) {
                const keepPlate = !n && !a.grams && num(prev.grams, CAP.grams) > 0;
                const grams = keepPlate ? num(prev.grams, CAP.grams) : r.grams;
                return Object.assign(base, { portion: portionOf(n, grams, 'g', l, unit), grams: Math.round(grams), src: 'db' }, scaled(r, grams / r.grams));
            }
        }
        const kept = { portion: prev.portion || '', grams: num(prev.grams, CAP.grams), src: 'kept' };
        const pc = countOf(prev.count);
        const f = n && pc ? n / pc : 1;
        const k = {};
        for (const x of KEYS) k[x] = num(prev[x], CAP[x]);
        if (n) kept.portion = n + ' ' + t('pcs', l) + (kept.grams ? ' · ~' + Math.round(kept.grams * f) + ' g' : '');
        if (kept.grams) kept.grams = Math.round(kept.grams * f);
        return Object.assign(base, kept, scaled(k, f));
    }

    // A drink the user adds: "cola", "0,5 l Bier", "2 coffee". Same rules, table first, then the meal DB.
    function estimateDrink(text, count, db, l) {
        l = l || lang();
        const a = parseAmount(text);
        const name = cap1(a.rest);
        if (!name) return null;
        const n = countOf(count) || a.count;
        const hit = lookup(name, true);
        if (hit) {
            const ml = Math.min(CAP.grams, (a.ml || hit.serve) * (n || 1));
            return Object.assign({ name, count: n || 0, portion: (n ? n + ' × ' : '') + Math.round(ml / (n || 1)) + ' ml', grams: Math.round(ml), drink: true, src: 'table' }, scaled(hit.per, ml / 100));
        }
        const r = estimateItem(text, count, { name }, db, l);
        if (r.src === 'kept') return Object.assign(r, { drink: true, src: 'unknown', portion: (n ? n + ' × ' : '') + '250 ml', grams: 250 * (n || 1) });
        return Object.assign(r, { drink: true, portion: (n ? n + ' × ' : '') + Math.round(r.grams / (n || 1)) + ' ml' });
    }

    function clean(d) {
        const o = { name: cap1(d && d.name), portion: String((d && d.portion) || '').slice(0, 40), grams: num(d && d.grams, CAP.grams) };
        for (const k of KEYS) o[k] = num(d && d[k], CAP[k]);
        o.kcal = Math.round(o.kcal);
        if (d && d.count) o.count = countOf(d.count);
        if (d && d.src) o.src = d.src;
        if (d && d.drink) o.drink = true;
        return o;
    }
    function totals(list) {
        const o = {};
        for (const k of KEYS) o[k] = Math.round((list || []).reduce((s, d) => s + num(d && d[k], CAP[k]), 0) * 10) / 10;
        o.kcal = Math.round(o.kcal);
        return o;
    }
    function title(list, l) {
        const n = (list || []).map(d => d && d.name).filter(Boolean);
        const and = { en: ' and ', de: ' und ', es: ' y ' }[l || lang()] || ' and ';
        return (n.length <= 1 ? (n[0] || '') : n.slice(0, -1).join(', ') + and + n[n.length - 1]).slice(0, 100);
    }

    /* The one verdict. Same estimate as the shared meal card (LowiMealSnap.bloodSugar); a drink list holding 20 g of
       sugar or more is a likely spike on its own (the same rule bloodSugar uses for sugary drinks). */
    function verdict(items, drinks) {
        const all = (items || []).concat(drinks || []);
        const tot = totals(all);
        const MS = snap();
        let bs = MS && MS.bloodSugar ? MS.bloodSugar(tot, all) : null;
        if (!bs) { const net = Math.max(0, tot.carbs - tot.fiber); bs = { level: net >= 50 ? 'high' : net >= 25 ? 'mid' : 'low', score: Math.round(net), net: Math.round(net) }; }
        const drinkSugar = (drinks || []).reduce((s, d) => s + num(d && d.sugar, CAP.sugar), 0);
        const byDrink = drinkSugar >= 20;
        const level = byDrink ? 'high' : bs.level;
        return { level, lvl: LVL[level], spike: level === 'high', score: bs.score, net: bs.net, drink: byDrink, total: tot, empty: !all.length };
    }

    /* XP for logging it, from the app's own rules (index.html LowiVitalsBridge), never a second point system:
       15 XP for the meal (0 for a spike, a duplicate, or past the daily cap) plus the daily "eat" quest's XP when this is
       the first meal that completes it (logMeal runs questDone("eat") for every meal that is not a spike). Never minus. */
    function xpFor(v, mealTitle, bridge) {
        const data = { t: mealTitle || '', lvl: v && v.lvl };
        const cap = bridge && bridge.MEAL_CAP || 8;
        if (bridge && typeof bridge.mealWhy === 'function') {
            let why = '', base = 15, quest = 0;
            try { why = bridge.mealWhy(data) || ''; } catch (e) { why = ''; }
            try { base = typeof bridge.mealXp === 'function' ? +bridge.mealXp(data) || 0 : (why ? 0 : 15); } catch (e) { base = why ? 0 : 15; }
            if (why) base = 0;
            try { quest = why === 'spike' || why === 'dup' ? 0 : typeof bridge.mealQuestXp === 'function' ? +bridge.mealQuestXp(data) || 0 : 0; } catch (e) { quest = 0; }
            return { xp: base + quest, base, quest, why, cap };
        }
        const base = v && v.spike ? 0 : 15;
        return { xp: base, base, quest: 0, why: v && v.spike ? 'spike' : '', cap };
    }
    // { big: '+45 XP', small: '15 for the meal + 30 for today's eat quest' }
    function xpText(x, l) {
        const big = x.xp ? '+' + x.xp + ' XP' : '0 XP';
        let small;
        if (!x.why) small = x.quest ? t('xpQuest', l, { base: x.base, quest: x.quest }) : t('xpOk', l);
        else if (x.why === 'spike') small = t('xpSpike', l);
        else if (x.why === 'dup') small = t('xpDup', l);
        else small = x.quest ? t('xpCapQuest', l, { cap: x.cap, quest: x.quest }) : t('xpCap', l, { cap: x.cap });
        return { big, small };
    }

    /* one meal path (build 20261021-151646, kept as is): saving any meal while a fast runs ends that fast with its points once.
       The result screen is where Snap's save happens, so it repeats the same line Log meal shows (LowiFastStop.mealNote), never its own math. */
    function fastLine() {
        let n = '';
        try { n = typeof window !== 'undefined' && window.LowiFastStop && window.LowiFastStop.mealNote ? window.LowiFastStop.mealNote() : ''; } catch (e) { n = ''; }
        return n ? '<p class="sp-fast-note mr-fast" data-noi18n>' + esc(n) + '</p>' : '';
    }
    // What Log as meal saves: totals, the verdict level (the log's lvl, so XP matches) and the name.
    function formValues(items, drinks, l) {
        const all = (items || []).concat(drinks || []);
        const v = verdict(items, drinks);
        return { title: title(all, l), lvl: all.length ? v.lvl : '', macros: all.length ? totals(all) : null, verdict: v };
    }

    /* ---------- the screen ---------- */
    function macroLine(d, l) {
        return [['protein', d.protein], ['carbs', d.carbs], ['fat', d.fat]].map(([k, v]) => '<span><b>' + Math.round(v) + ' g</b> ' + esc(t(k, l)) + '</span>').join('');
    }
    function cardHTML(d, i, kind, editing, l) {
        const id = kind + i;
        if (editing) {
            return '<li class="mr-item mr-editing" data-mr="' + id + '"><div class="mr-ed" role="group" aria-label="' + esc(t('what', l)) + '">' +
                '<label>' + esc(t(kind === 'd' ? 'drinkWhat' : 'what', l)) + '<input data-mr-name value="' + esc(d.name) + '" maxlength="60" autocomplete="off" enterkeyhint="done"></label>' +
                '<label>' + esc(t('many', l)) + '<input data-mr-count type="number" inputmode="decimal" min="0" max="' + MAX_COUNT + '" step="any" placeholder="' + esc(t('manyPh', l)) + '" value="' + (d.count ? esc(d.count) : '') + '"></label>' +
                '<div class="mr-ed-acts"><button type="button" class="mr-save" data-mr-save="' + id + '">' + esc(t('save', l)) + '</button><button type="button" class="mr-cancel" data-mr-cancel="' + id + '">' + esc(t('cancel', l)) + '</button></div></div></li>';
        }
        return '<li class="mr-item' + (d.src === 'kept' || d.src === 'unknown' ? ' mr-kept' : '') + '" data-mr="' + id + '">' +
            '<button type="button" class="mr-tap" data-mr-edit="' + id + '" aria-label="' + esc(t('edit', l) + ': ' + d.name) + '">' +
            '<span class="mr-nm"><b>' + esc(d.name) + '</b>' + (d.portion ? '<small>' + esc(d.portion) + '</small>' : '') + '</span>' +
            '<span class="mr-kc"><b>' + Math.round(d.kcal) + '</b><small>' + esc(t('kcal', l)) + '</small></span>' +
            '<span class="mr-pen" aria-hidden="true">' + esc(t('edit', l)) + '</span></button>' +
            '<button type="button" class="mr-x" data-mr-rm="' + id + '" aria-label="' + esc(t('remove', l) + ' ' + d.name) + '">×</button>' +
            '<p class="mr-mac">' + macroLine(d, l) + '</p>' +
            (d.src === 'kept' || d.src === 'unknown' ? '<p class="mr-note">' + esc(t('kept', l, { name: d.name })) + '</p>' : '') + '</li>';
    }

    /* box: where the result goes (the sheet's .sp-ai). form: the Log as meal form (name="title" + hidden macro inputs).
       opts: { dishes, lang, low, note, photo (data URL for the thumbnail), db, dbReady(), bridge, onChange(values) }. */
    function mount(box, form, opts) {
        opts = opts || {};
        if (!box) return null;
        const l = opts.lang || lang();
        const st = { items: (opts.dishes || []).slice(0, MAX_FOODS).map(clean).filter(d => d.name), drinks: [], edit: '', adding: false };
        const titleIn = form && form.querySelector('[name="title"]');
        let typed = false;
        if (titleIn) titleIn.addEventListener('input', () => { typed = true; });
        const db = () => opts.db || root.LowiMealDB || null;
        if (typeof opts.dbReady === 'function') { try { Promise.resolve(opts.dbReady()).catch(() => { }); } catch (e) { } }
        const bridge = () => opts.bridge || root.LowiVitalsBridge || null;
        const sheet = box.closest ? box.closest('.r2-ov, .sheet') : null;
        box.removeAttribute('aria-live');   // the verdict and the XP line announce their own changes

        const writeForm = (fv) => {
            if (!form) return;
            const put = (k, v) => {
                let el = form.querySelector('input[type="hidden"][name="' + k + '"]');
                if (!el) { el = document.createElement('input'); el.type = 'hidden'; el.name = k; form.appendChild(el); }
                el.value = v;
            };
            for (const k of KEYS) put(k, fv.macros ? String(fv.macros[k]) : '');
            put('lvl', fv.lvl || '');
            if (titleIn && (!typed || !titleIn.value.trim())) { titleIn.value = fv.title; typed = false; }
            form.classList.toggle('mr-has', !!fv.macros);
        };

        const render = (focusSel) => {
            const fv = formValues(st.items, st.drinks, l), v = fv.verdict;
            writeForm(fv);
            if (sheet) sheet.classList.toggle('mr-on', !v.empty);
            const mealTitle = (titleIn && titleIn.value.trim()) || fv.title;
            const x = xpFor(v, mealTitle, bridge());
            const head = v.empty ? '' :
                '<section class="mr-verdict mr-' + v.level + '" aria-live="polite" aria-atomic="true">' +
                '<div class="mr-vt"><small class="mr-q">' + esc(t('q', l)) + '</small><b class="mr-ans"><i aria-hidden="true"></i>' + esc(t(v.level, l)) + '</b>' +
                '<span class="mr-why">' + esc(v.drink ? t('whyDrink', l) : t(v.level === 'low' ? 'whyLow' : v.level === 'mid' ? 'whyMid' : 'whyHigh', l, { net: v.net })) + '</span></div>' +
                (opts.photo ? '<img class="mr-thumb" alt="" src="' + esc(opts.photo) + '">' : '') + '</section>';
            const foods = st.items.length ? '<div class="mr-sec"><p class="mr-h"><b>' + esc(t('see', l)) + '</b><small>' + esc(t('tapFix', l)) + '</small></p><ul class="mr-list">' +
                st.items.map((d, i) => cardHTML(d, i, 'f', st.edit === 'f' + i, l)).join('') + '</ul></div>' : '';
            const drinks = '<div class="mr-sec mr-drinks"><p class="mr-h"><b>' + esc(t('drinks', l)) + '</b></p>' +
                (st.drinks.length ? '<ul class="mr-list">' + st.drinks.map((d, i) => cardHTML(d, i, 'd', st.edit === 'd' + i, l)).join('') + '</ul>' : '') +
                (st.drinks.length >= MAX_DRINKS ? '' : st.adding ?
                    '<div class="mr-add" role="group" aria-label="' + esc(t('addDrink', l)) + '"><div class="mr-chips">' + t('chips', l).map(c => '<button type="button" class="mr-chip" data-mr-chip="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' +
                    '<div class="mr-add-row"><input data-mr-drink maxlength="60" autocomplete="off" enterkeyhint="done" aria-label="' + esc(t('drinkWhat', l)) + '" placeholder="' + esc(t('drinkPh', l)) + '"><button type="button" class="mr-save" data-mr-add-go>' + esc(t('add', l)) + '</button></div>' +
                    '<button type="button" class="mr-cancel mr-add-x" data-mr-add-x>' + esc(t('cancel', l)) + '</button></div>' :
                    '<button type="button" class="mr-add-btn" data-mr-add><span aria-hidden="true">+</span> ' + esc(t('addDrink', l)) + '</button>') + '</div>';
            const tot = v.total;
            const foot = v.empty ? '<p class="fai-msg mr-empty">' + esc(t('none', l)) + '</p>' :
                '<div class="mr-xp mr-xp-' + (x.xp ? 'on' : 'zero') + '" aria-live="polite"><b>' + esc(xpText(x, l).big) + '</b><span>' + esc(xpText(x, l).small) + '</span></div>' +
                fastLine() +
                '<p class="mr-tot"><b>' + esc(t('total', l)) + '</b> ' + Math.round(tot.kcal) + ' ' + esc(t('kcal', l)) + ' · ' + macroLine(tot, l) + '</p>' +
                '<p class="fai-msg mr-est">' + esc(opts.low ? t('lowConf', l) + ' ' + t('est', l) : t('est', l)) + (opts.note ? ' ' + esc(opts.note) : '') + '</p>';
            box.className = 'sp-ai fai fai-done mr';
            box.innerHTML = head + foods + (v.empty ? '' : drinks) + foot;
            if (focusSel) { const f = box.querySelector(focusSel); if (f && f.focus) { try { f.focus({ preventScroll: false }); } catch (e) { f.focus(); } } }
            if (typeof opts.onChange === 'function') { try { opts.onChange(fv, x); } catch (e) { } }
            return fv;
        };

        const listOf = (id) => id && id[0] === 'd' ? st.drinks : st.items;
        const indexOf = (id) => +String(id || '').slice(1);
        const save = (id) => {
            const li = box.querySelector('[data-mr="' + id + '"]');
            if (!li) return;
            const nameIn = li.querySelector('[data-mr-name]'), countIn = li.querySelector('[data-mr-count]');
            const text = nameIn ? nameIn.value.trim() : '';
            const list = listOf(id), i = indexOf(id), prev = list[i];
            if (!prev) return;
            if (!text) { if (nameIn) nameIn.focus(); return; }
            const count = countIn ? countIn.value : '';
            const sameName = fold(text) === fold(prev.name) && countOf(count) === countOf(prev.count || 0);
            if (!sameName) list[i] = clean(id[0] === 'd' ? (estimateDrink(text, count, db(), l) || prev) : estimateItem(text, count, prev, db(), l));
            st.edit = '';
            render('[data-mr-edit="' + id + '"]');
        };
        const addDrink = (text) => {
            const d = estimateDrink(text, '', db(), l);
            if (!d) { const inp = box.querySelector('[data-mr-drink]'); if (inp) inp.focus(); return; }
            st.drinks.push(clean(d));
            st.adding = false;
            render('[data-mr-add]');
        };
        box.addEventListener('click', ev => {
            const el = ev.target.closest ? ev.target.closest('button') : null;
            if (!el || !box.contains(el)) return;
            const ds = el.dataset;
            if (ds.mrEdit != null) { ev.preventDefault(); st.edit = ds.mrEdit; st.adding = false; render('[data-mr="' + ds.mrEdit + '"] [data-mr-name]'); }
            else if (ds.mrSave != null) { ev.preventDefault(); save(ds.mrSave); }
            else if (ds.mrCancel != null) { ev.preventDefault(); const id = st.edit; st.edit = ''; render('[data-mr-edit="' + id + '"]'); }
            else if (ds.mrRm != null) { ev.preventDefault(); listOf(ds.mrRm).splice(indexOf(ds.mrRm), 1); st.edit = ''; render(); }
            else if (ds.mrAdd != null) { ev.preventDefault(); st.adding = true; st.edit = ''; render('[data-mr-drink]'); }
            else if (ds.mrAddX != null) { ev.preventDefault(); st.adding = false; render('[data-mr-add]'); }
            else if (ds.mrChip != null) { ev.preventDefault(); addDrink(ds.mrChip); }
            else if (ds.mrAddGo != null) { ev.preventDefault(); const inp = box.querySelector('[data-mr-drink]'); addDrink(inp ? inp.value : ''); }
        });
        box.addEventListener('keydown', ev => {
            if (ev.key !== 'Enter' && ev.key !== 'Escape') return;
            const inp = ev.target;
            if (!inp || inp.tagName !== 'INPUT') return;
            ev.preventDefault();
            if (inp.hasAttribute('data-mr-drink')) { if (ev.key === 'Enter') addDrink(inp.value); else { st.adding = false; render('[data-mr-add]'); } return; }
            const li = inp.closest('[data-mr]');
            if (!li) return;
            if (ev.key === 'Enter') save(li.dataset.mr); else { const id = st.edit; st.edit = ''; render('[data-mr-edit="' + id + '"]'); }
        });
        render();
        return {
            items: () => st.items.slice(), drinks: () => st.drinks.slice(), all: () => st.items.concat(st.drinks),
            values: () => formValues(st.items, st.drinks, l), refresh: () => render(),
            _edit(i, text, count) { st.items[i] = clean(estimateItem(text, count, st.items[i], db(), l)); return render(); },
            _drink(text, count) { const d = estimateDrink(text, count, db(), l); if (d) st.drinks.push(clean(d)); return render(); }
        };
    }

    return { KEYS, STR, TABLE, lookup, parseAmount, estimateItem, estimateDrink, clean, totals, title, verdict, xpFor, xpText, formValues, mount };
});
