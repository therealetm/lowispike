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
            q: 'Spike check', low: 'Lower impact', mid: 'Small rise', high: 'Spike likely',
            whyLow: 'About {net} g net carbs.', net: 'about {net} g net carbs',
            whyMid: 'About {net} g net carbs: a moderate rise.',
            whyHigh: 'About {net} g net carbs. That’s enough to spike.',
            whyDrink: 'The sugary drink alone is enough to spike.',
            est: 'Estimate from the photo, not a measurement.', lowConf: 'The photo was hard to read, so check the foods below.',
            see: 'What I see', tapFix: 'Tap a food to fix it', edit: 'Fix', what: 'What is it really?', many: 'How many pieces?', manyD: 'How many? (optional)', manyServ: 'How many servings? (1 = {g})', manyEach: 'How many servings?', manyPh: 'e.g. 2',
            sugL: 'Products the app knows', srcScan: 'Scanned', srcLog: 'Logged before', srcDex: 'LOWiSPIKE products', srcTable: 'Known product', srcHome: 'In your kitchen', srcCart: 'In your shopping cart', addFood: 'Add food', addWhat: 'What else is on the plate?', addPh: 'e.g. pesto, 2 eggs', new0: 'I don’t know “{name}” yet, so it counts as 0 kcal.', perPc: '{kcal} kcal / piece', perSrv: '{kcal} kcal / {g}', perEach: '{kcal} kcal / serving', srvOne: 'serving', srvMany: 'servings',
            save: 'Update', cancel: 'Cancel', remove: 'Remove', kept: 'I don’t know “{name}” yet, so I kept the photo’s amounts.',
            drinks: 'Drinking anything?', addDrink: 'Add a drink', drinkWhat: 'What are you drinking?', drinkPh: 'e.g. cola, 0.5 l beer', add: 'Add',
            chips: ['Water', 'Coffee', 'Cola', 'Juice', 'Beer', 'Wine'],
            xpOk: 'for logging this meal', xpQuest: '{base} for the meal + {quest} for today\u2019s eat quest', xpSpike: 'Spiky meals earn nothing, and never cost points.', xpNein: 'Not a LOWiSPIKE meal, so no XP. It never costs points.', fk: 'LOWiSPIKE', xpDup: 'You already logged this today.', xpCap: 'Daily limit of {cap} meals reached.', xpCapQuest: '{quest} for today\u2019s eat quest. Past {cap} meals a day, the meal itself earns nothing.',
            total: 'Total', pcs: 'pcs', pc: 'pc', none: 'Nothing left to check. Type what it is below.', protein: 'protein', carbs: 'carbs', fat: 'fat', kcal: 'kcal'
        },
        de: {
            q: 'Spike-Check', low: 'Niedrigere Wirkung', mid: 'Leichter Anstieg', high: 'Spike wahrscheinlich',
            whyLow: 'Etwa {net} g Netto-Kohlenhydrate.', net: 'etwa {net} g Netto-KH',
            whyMid: 'Etwa {net} g Netto-Kohlenhydrate: eher ein mäßiger Anstieg.',
            whyHigh: 'Etwa {net} g Netto-Kohlenhydrate. Das reicht für einen Spike.',
            whyDrink: 'Allein das süße Getränk reicht für einen Spike.',
            est: 'Schätzung aus dem Foto, keine Messung.', lowConf: 'Das Foto war schwer zu erkennen, prüf die Lebensmittel unten.',
            see: 'Das sehe ich', tapFix: 'Tipp ein Lebensmittel an, um es zu korrigieren', edit: 'Ändern', what: 'Was ist es wirklich?', many: 'Wie viele Stück?', manyD: 'Wie viele? (optional)', manyServ: 'Wie viele Portionen? (1 = {g})', manyEach: 'Wie viele Portionen?', manyPh: 'z. B. 2',
            sugL: 'Produkte, die die App kennt', srcScan: 'Gescannt', srcLog: 'Schon mal geloggt', srcDex: 'LOWiSPIKE-Produkte', srcTable: 'Bekanntes Produkt', srcHome: 'In deiner Küche', srcCart: 'Im Einkaufswagen', addFood: 'Lebensmittel hinzufügen', addWhat: 'Was ist noch auf dem Teller?', addPh: 'z. B. Pesto, 2 Eier', new0: 'Ich kenne „{name}“ noch nicht, also zählt es mit 0 kcal.', perPc: '{kcal} kcal / Stück', perSrv: '{kcal} kcal / {g}', perEach: '{kcal} kcal / Portion', srvOne: 'Portion', srvMany: 'Portionen',
            save: 'Übernehmen', cancel: 'Abbrechen', remove: 'Entfernen', kept: 'Ich kenne „{name}“ noch nicht, also habe ich die Mengen aus dem Foto behalten.',
            drinks: 'Trinkst du etwas dazu?', addDrink: 'Getränk hinzufügen', drinkWhat: 'Was trinkst du?', drinkPh: 'z. B. Cola, 0,5 l Bier', add: 'Hinzufügen',
            chips: ['Wasser', 'Kaffee', 'Cola', 'Saft', 'Bier', 'Wein'],
            xpOk: 'für diese Mahlzeit', xpQuest: '{base} für die Mahlzeit + {quest} für die heutige Ess-Quest', xpSpike: 'Spike-Mahlzeiten geben nichts, ziehen aber auch nichts ab.', xpNein: 'Keine LOWiSPIKE-Mahlzeit, daher keine XP. Es zieht aber nichts ab.', fk: 'LOWiSPIKE', xpDup: 'Heute schon eingetragen.', xpCap: 'Tageslimit von {cap} Mahlzeiten erreicht.', xpCapQuest: '{quest} für die heutige Ess-Quest. Ab {cap} Mahlzeiten am Tag gibt die Mahlzeit selbst nichts.',
            total: 'Gesamt', pcs: 'Stk.', pc: 'Stk.', none: 'Nichts mehr zu prüfen. Schreib unten, was es ist.', protein: 'Eiweiß', carbs: 'KH', fat: 'Fett', kcal: 'kcal'
        },
        es: {
            q: 'Control de pico', low: 'Impacto bajo', mid: 'Subida leve', high: 'Pico probable',
            whyLow: 'Unos {net} g de carbohidratos netos.', net: 'unos {net} g de carbohidratos netos',
            whyMid: 'Unos {net} g de carbohidratos netos: una subida moderada.',
            whyHigh: 'Unos {net} g de carbohidratos netos. Suficiente para un pico.',
            whyDrink: 'Solo la bebida azucarada ya basta para un pico.',
            est: 'Estimación a partir de la foto, no una medición.', lowConf: 'La foto era difícil de leer, revisa los alimentos.',
            see: 'Lo que veo', tapFix: 'Toca un alimento para corregirlo', edit: 'Corregir', what: '¿Qué es en realidad?', many: '¿Cuántas piezas?', manyD: '¿Cuántos? (opcional)', manyServ: '¿Cuántas raciones? (1 = {g})', manyEach: '¿Cuántas raciones?', manyPh: 'p. ej. 2',
            sugL: 'Productos que la app conoce', srcScan: 'Escaneado', srcLog: 'Registrado antes', srcDex: 'Productos LOWiSPIKE', srcTable: 'Producto conocido', srcHome: 'En tu cocina', srcCart: 'En tu carrito', addFood: 'Añadir alimento', addWhat: '¿Qué más hay en el plato?', addPh: 'p. ej. pesto, 2 huevos', new0: 'Aún no conozco «{name}», así que cuenta como 0 kcal.', perPc: '{kcal} kcal / pieza', perSrv: '{kcal} kcal / {g}', perEach: '{kcal} kcal / ración', srvOne: 'ración', srvMany: 'raciones',
            save: 'Actualizar', cancel: 'Cancelar', remove: 'Quitar', kept: 'Aún no conozco «{name}», así que mantuve las cantidades de la foto.',
            drinks: '¿Bebes algo?', addDrink: 'Añadir bebida', drinkWhat: '¿Qué bebes?', drinkPh: 'p. ej. cola, 0,5 l de cerveza', add: 'Añadir',
            chips: ['Agua', 'Café', 'Cola', 'Zumo', 'Cerveza', 'Vino'],
            xpOk: 'por esta comida', xpQuest: '{base} por la comida + {quest} por la misión de hoy', xpSpike: 'Las comidas con pico no dan nada, pero tampoco restan.', xpNein: 'No es una comida LOWiSPIKE, así que no da XP. Nunca resta.', fk: 'LOWiSPIKE', xpDup: 'Ya registrado hoy.', xpCap: 'Límite diario de {cap} comidas.', xpCapQuest: '{quest} por la misión de hoy. Pasadas {cap} comidas al día, la comida en sí no da nada.',
            total: 'Total', pcs: 'uds.', pc: 'ud.', none: 'No queda nada que revisar. Escribe abajo qué es.', protein: 'proteína', carbs: 'carbs', fat: 'grasa', kcal: 'kcal'
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
        { re: /\bbaby ?bel\b/, nm: 'Mini Babybel', brand: 'Babybel', unit: 'g', serve: 20, per: P(305, 22, 0, 0, 0, 24) },
        { re: /\bbel ?paese\b/, nm: 'Bel Paese', brand: 'Galbani', unit: 'g', serve: 25, per: P(350, 23, 0.5, 0.5, 0, 28.5) },
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

    /* ---------- known products (Oct 21, Eman: "If I write Babybel, that's a known product, especially because I've probably
       already scanned it ... Then I should be able to write how many pieces of those I ate.") ----------
       As you type in "What is it really?", the app suggests what it already knows: products you scanned (lowi.dex.v1 mine),
       meals you logged before (single foods in lowispike.v2 logs), products in the shared LOWiSPIKE list (dex comm cache, and
       LowiDex.search online) and the named products in TABLE. Typos are fine ("Babybal" finds Babybel). Picking one gives real
       nutrition per piece (or per serving when the pack has no piece size); "How many pieces?" multiplies it. No match: the
       typed text is estimated exactly as before (estimateItem). Pure parts: matchScore, pieceOf, fromProduct, fromLog,
       knownList, suggest, itemFrom. */
    const skey = (s) => fold(s).replace(/[^a-z0-9]+/g, ' ').trim();
    function dist(a, b) {        // optimal string alignment distance (one swap of two letters counts as one typo)
        const m = a.length, n = b.length, d = [];
        for (let i = 0; i <= m; i++) d[i] = [i];
        for (let j = 0; j <= n; j++) d[0][j] = j;
        for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
        return d[m][n];
    }
    // 100 starts with it, 90 every typed word starts a word, 70 inside it, 50/40 one or two typos at a word start, 0 no match
    /* Kitchen autocomplete (Oct 24 2026): "Kaese" finds "Käse" and "Muesli" finds "Müsli" too (German typed without umlauts:
       ae/oe/ue read as a/o/u on both sides, after the plain match). */
    const unUml = (s) => s.replace(/([aou])e/g, '$1');
    function matchScore(q, name, brand) {
        const a = matchScore0(q, name, brand);
        if (a >= 100) return a;
        const k = skey(q);
        if (!/[aou]e/.test(k + ' ' + skey((name || '') + ' ' + (brand || '')))) return a;
        return Math.max(a, matchScore0(unUml(k), unUml(skey(name)), unUml(skey(brand))));
    }
    function matchScore0(q, name, brand) {
        q = skey(q);
        if (q.length < 2) return 0;
        const hay = skey((name || '') + ' ' + (brand || ''));
        if (!hay) return 0;
        const words = hay.split(' '), qc = q.replace(/ /g, ''), hc = hay.replace(/ /g, '');
        if (hay.indexOf(q) === 0 || hc.indexOf(qc) === 0) return 100;
        if (q.split(' ').every(x => words.some(w => w.indexOf(x) === 0))) return 90;
        if (qc.length >= 3 && hc.indexOf(qc) >= 0) return 70;
        if (qc.length < 4) return 0;
        const tol = qc.length >= 8 ? 2 : 1;
        let best = 9;
        for (let i = 0; i < words.length; i++) {
            const tail = words.slice(i).join('');
            if (tail.length < 3) continue;
            for (const L of [qc.length - 1, qc.length, qc.length + 1]) best = Math.min(best, dist(qc, tail.slice(0, L)));
        }
        return best <= tol ? 60 - best * 10 : 0;
    }
    // piece size from a pack's quantity: "6 x 20 g", "200 g (10 x 20 g)", "120 g, 6 Stück", "5 Stück à 22 g" -> { piece, unit }
    function pieceOf(q) {
        const s = fold(q).replace(/(\d),(\d)/g, '$1.$2');
        if (!s.trim()) return null;
        let m = s.match(/(\d+)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(g|ml)\b/);
        if (m && +m[1] > 1 && +m[2] > 0) return { piece: +m[2], unit: m[3] };
        const PC = '(?:stuck|stk|pcs|pieces?|piezas?|unidades|riegel|bars?|portionen)';
        m = s.match(new RegExp('(\\d+)\\s*' + PC + '\\.?\\s*(?:a|je|each|de|@)\\s*(\\d+(?:\\.\\d+)?)\\s*(g|ml)\\b'));
        if (m && +m[2] > 0) return { piece: +m[2], unit: m[3] };
        m = s.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*(g|ml)\\b[^0-9]{0,6}(\\d+)\\s*' + PC));
        if (m && +m[3] > 1) return { piece: Math.round(+m[1] / +m[3] * 10) / 10, unit: m[2] };
        return null;
    }
    function totalOf(q) {
        const m = fold(q).replace(/(\d),(\d)/g, '$1.$2').match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|l)\b/);
        if (!m) return 0;
        const v = +m[1], u = m[2];
        return Math.round(u === 'kg' || u === 'l' ? v * 1000 : u === 'cl' ? v * 10 : v);
    }
    /* a scanned / shared product (facts per 100 g: kcal, c, s, f, p, fat, q = pack quantity, sv = serving grams, drink) */
    function fromProduct(p, src) {
        const f = (p && p.facts) || {};
        if (!p || !p.name) return null;
        const has = (v) => typeof v === 'number' && isFinite(v);
        if (!has(f.kcal) && !has(f.c) && !has(f.p) && !has(f.fat)) return null;
        const kcal = has(f.kcal) ? f.kcal : (f.c || 0) * 4 + (f.p || 0) * 4 + (f.fat || 0) * 9;
        if (!(kcal >= 0) || kcal > 950) return null;
        const per = { kcal, protein: f.p || 0, carbs: f.c || 0, sugar: f.s || 0, fiber: f.f || 0, fat: f.fat || 0 };
        const unit = f.drink ? 'ml' : 'g';
        const pc = pieceOf(f.q), sv = num(f.sv, 1000), tot = totalOf(f.q);
        let piece = pc ? pc.piece : 0, serve = 0;
        if (!piece) {
            if (sv) serve = sv;
            else if (tot && tot <= 80 && !f.drink) piece = tot;        // one bar, one small pot
            else if (tot && tot <= 500 && f.drink) serve = tot;        // one bottle or can
            else serve = 100;
        }
        return { key: p.barcode ? 'b' + p.barcode : 'n' + skey(p.name), code: p.barcode ? String(p.barcode) : '', name: cap1(p.name), brand: String(p.brand || '').slice(0, 40), per, piece: Math.min(1000, piece), serve: Math.min(1000, serve), unit, src: src || 'dex', ts: +p.ts || 0 };
    }
    /* a meal logged before: only single foods ("Mini Babybel", not "Rice and chicken"), its amounts are one serving */
    function fromLog(lg) {
        if (!lg || !lg.t || !lg.macros) return null;
        const t0 = String(lg.t).replace(/\s+/g, ' ').trim();
        if (!t0 || t0.length > 50 || /[,+&/]|^\d|\s(and|und|y|with|mit|con|plus)\s/i.test(t0)) return null;
        const m = lg.macros, kcal = num(m.kcal, CAP.kcal);
        if (!kcal) return null;
        const each = {};
        for (const k of KEYS) each[k] = num(m[k], CAP[k]);
        return { key: 'n' + skey(t0), code: lg.code ? String(lg.code) : '', name: cap1(t0), brand: '', each, src: 'log', ts: +lg.ts || 0 };
    }
    function fromTable(e) {
        return e && e.nm && !e.drink ? { key: 'n' + skey(e.nm), code: '', name: e.nm, brand: e.brand || '', per: e.per, piece: e.serve, serve: 0, unit: e.unit || 'g', src: 'table', ts: 0 } : null;
    }
    /* ---------- Kitchen first (Oct 24 2026, Emmanuel: "the things I caught, that live in my Kitchen, should appear as I'm
       typing, so it's faster") ----------
       The Kitchen (Shop -> Fuel -> Kitchen: "At home", lowispike.kitchen.v1, and the shopping cart, LOWI_SHELF) holds names
       only. A Kitchen name takes the nutrition of the same product you scanned or logged (or a named product in TABLE) when
       every word of it is a whole word of that product ("Babybel" -> your "Mini Babybel Original" scan, never "Milch" ->
       "Milchreis"). The shared list only counts on an exact name. No such product: est is set and estFor() reads one typical
       portion from the meal database the first time the row is shown, so a pick still recalculates the stats. */
    const OWN = { scan: 1, log: 1, table: 1 };
    // the product list read once (names folded) so 300 Kitchen names against 400 logs stay a few milliseconds
    const prepHits = (list) => (list || []).filter(Boolean).map(p => ({ p, k: skey(p.name), hw: skey(p.name + ' ' + (p.brand || '')).split(' '), own: !!OWN[p.src] }));
    function kitchenHit(name, list, pre) {
        const k = skey(name), words = k.split(' ');
        // exact name first, then your scans before logs before TABLE, then the newest
        const ok = (pre || prepHits(list)).filter(x => x.k === k || (x.own && words.every(w => w.length > 1 && x.hw.indexOf(w) >= 0)));
        ok.sort((a, b) => (b.k === k) - (a.k === k) || (SRC_RANK[a.p.src] || 0) - (SRC_RANK[b.p.src] || 0) || (+b.p.ts || 0) - (+a.p.ts || 0));
        return ok.length ? ok[0].p : null;
    }
    function fromKitchen(n, src, ts, list, pre) {
        const name = cap1(String(n || '').split(' · ')[0].replace(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F\s]+/u, ''));
        const k = skey(name);
        if (k.length < 2) return null;
        const hit = kitchenHit(name, list, pre);
        if (hit) return Object.assign({}, hit, { key: 'k' + k, src, via: hit.src, viaKey: hit.key, kname: name, ts: +ts || 0 });
        return { key: 'k' + k, code: '', name, brand: '', src, ts: +ts || 0, est: true };
    }
    const hasNut = (p) => !!(p && (p.each || p.per));
    const EST = {};
    // one typical portion from the meal database, once per name (cached), for a Kitchen name nothing else knows
    function estFor(p, db, cachedOnly) {
        if (!p || !p.est || hasNut(p)) return p;
        const k = skey(p.name);
        if (!(k in EST)) {
            if (cachedOnly) return p;
            let r = null;
            if (db && typeof db.parse === 'function' && (!db.ready || db.ready())) { try { r = db.parse(p.name); } catch (e) { r = null; } }
            else return p;        // the database is still loading: try again next keystroke
            EST[k] = r && r.how !== 'rough' && r.grams > 0 && r.kcal >= 0 ? { per: scaled(r, 100 / r.grams), serve: Math.min(1000, Math.round(r.grams)) } : null;
        }
        if (EST[k]) Object.assign(p, { per: EST[k].per, serve: EST[k].serve, piece: 0, unit: 'g', via: 'db' });
        return p;
    }
    const SRC_RANK = { home: 0, cart: 1, scan: 2, log: 3, dex: 4, table: 5 };
    const tier = (s) => (s >= 90 ? 100 : s);   // "starts with" and "a word starts with" are equally good: then your scans come first
    const rankOf = (p) => (p && p.src in SRC_RANK ? SRC_RANK[p.src] : 9);
    /* everything the app knows, one entry per product: scans first, then logged foods (a log of a scanned barcode is that
       scan), the shared list, then TABLE. src: { mine: [dex products], logs: [S.logs], comm: [dex products] } */
    function knownList(src) {
        src = src || {};
        const out = [], seen = {}, codes = {};
        const add = (x) => {
            if (!x || seen[x.key] || (x.code && codes[x.code]) || seen['n' + skey(x.name)]) return;
            seen[x.key] = 1; seen['n' + skey(x.name)] = 1;
            if (x.code) codes[x.code] = 1;
            out.push(x);
        };
        (src.mine || []).slice().sort((a, b) => (+b.ts || 0) - (+a.ts || 0)).forEach(p => add(fromProduct(p, 'scan')));
        (src.logs || []).slice().sort((a, b) => (+b.ts || 0) - (+a.ts || 0)).forEach(lg => add(fromLog(lg)));
        (src.comm || []).forEach(p => add(fromProduct(p, 'dex')));
        TABLE.forEach(e => { if (!out.some(x => e.re.test(fold(x.name)))) add(fromTable(e)); });   // your own Babybel scan beats the built-in one
        /* Kitchen first: "At home" newest first, then the shopping cart (src.home [{n, at}], src.cart [{n, done}]). A Kitchen
           row that took a product's nutrition replaces that product's own row, so nothing shows twice. */
        const kit = [], kseen = {}, used = {}, pre = (src.home || []).length || (src.cart || []).length ? prepHits(out) : null;
        const kadd = (x) => { if (!x || kseen[x.key]) return; kseen[x.key] = 1; if (x.viaKey) used[x.viaKey] = 1; kit.push(x); };
        (src.home || []).slice().sort((a, b) => (+b.at || 0) - (+a.at || 0)).slice(0, 300).forEach(i => kadd(fromKitchen(i && (i.n || i.name), 'home', i && i.at, out, pre)));
        (src.cart || []).slice(0, 300).forEach(i => kadd(fromKitchen(i && (i.n || i.name), 'cart', 0, out, pre)));
        if (!kit.length) return out;
        return kit.concat(out.filter(x => !used[x.key] && !kseen['k' + skey(x.name)]));
    }
    function suggest(q, list, max) {
        const a = parseAmount(q), text = a.rest || String(q || '');
        return (list || []).map(p => ({ p, s: matchScore(text, p.name, p.brand) })).filter(x => x.s > 0)
            .sort((x, y) => tier(y.s) - tier(x.s) || rankOf(x.p) - rankOf(y.p) || y.s - x.s || (y.p.ts || 0) - (x.p.ts || 0))
            .slice(0, max || 5).map(x => x.p);
    }
    // kcal for one piece / one serving, and what that one is ("piece", "30 g", "serving")
    function oneOf(p) {
        if (!hasNut(p)) return { kcal: 0, kind: 'none', size: 0 };
        if (p.each) return { kcal: Math.round(p.each.kcal), kind: 'each', size: 0 };
        const size = p.piece || p.serve || 100;
        return { kcal: Math.round(p.per.kcal * size / 100), kind: p.piece ? 'piece' : 'serve', size };
    }
    function perText(p, l) {
        const o = oneOf(p);
        if (o.kind === 'none') return '';
        return o.kind === 'piece' ? t('perPc', l, { kcal: o.kcal }) : o.kind === 'each' ? t('perEach', l, { kcal: o.kcal }) : t('perSrv', l, { kcal: o.kcal, g: Math.round(o.size) + ' ' + p.unit });
    }
    function manyLabel(p, l) {
        if (!p || !hasNut(p)) return t('many', l);
        const o = oneOf(p);
        return o.kind === 'piece' ? t('many', l) : o.kind === 'each' ? t('manyEach', l) : t('manyServ', l, { g: Math.round(o.size) + ' ' + p.unit });
    }
    // the food card for count pieces (or servings) of a known product
    function itemFrom(p, count, l) {
        l = l || lang();
        const n = countOf(count) || 1;
        if (p.each) return Object.assign({ name: p.name, count: n, portion: n + ' ' + t(n === 1 ? 'srvOne' : 'srvMany', l), grams: 0, src: 'known' }, scaled(p.each, n));
        const size = p.piece || p.serve || 100, amount = Math.min(CAP.grams, n * size);
        const portion = p.piece ? portionOf(n, amount, p.unit, l, n === 1 ? t('pc', l) : '') : n + ' × ' + Math.round(size) + ' ' + p.unit + (n !== 1 ? ' · ~' + Math.round(amount) + ' ' + p.unit : '');
        return Object.assign({ name: p.name, count: n, portion, grams: Math.round(amount), src: 'known' }, scaled(p.per, amount / 100));
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
    function verdict(items, drinks, aiBlock, l) {
        const all = (items || []).concat(drinks || []);
        const tot = totals(all);
        const MS = snap();
        let bs = MS && MS.bloodSugar ? MS.bloodSugar(tot, all) : null;
        if (!bs) { const net = Math.max(0, tot.carbs - tot.fiber); bs = { level: net >= 50 ? 'high' : net >= 25 ? 'mid' : 'low', score: Math.round(net), net: Math.round(net) }; }
        const drinkSugar = (drinks || []).reduce((s, d) => s + num(d && d.sugar, CAP.sugar), 0);
        const byDrink = drinkSugar >= 20;
        const level = byDrink ? 'high' : bs.level;
        /* Master Knowledge v3: the LOWiSPIKE verdict for the same foods (JA / SELTEN / NEIN), from the same engine as the
           barcode card, the database and the grocery list. A NEIN meal (rice, pork, fries, beer...) is logged like a spike:
           no meal XP and no eat quest, the rule Misty already follows on the scanner. The spike line stays honest, so plain
           pork still reads "No spike" while its LOWiSPIKE verdict says NO. The model's verdict block can only tighten it. */
        const K = fk();
        let food = K ? K.rateMeal(all, { level, score: bs.score }, l) : null;   // in the user's language, not always English
        if (K && food && aiBlock) food = K.merge(K.parse(aiBlock), food);
        const nein = !!(food && food.verdict === 'NEIN');
        return { level, lvl: LVL[nein ? 'high' : level], spike: level === 'high', nein, food, score: bs.score, net: bs.net, drink: byDrink, total: tot, empty: !all.length };
    }
    /* Oct 25 2026 (Emmanuel: a bowl read "No spike ... blood sugar should stay steady" and, right under it, "LOWiSPIKE: Skip it,
       sweets with sugar, no XP"): one answer on top. The stricter of the spike estimate and the LOWiSPIKE verdict wins, so the
       headline, its colour, its one reason line and the XP line never disagree. A NEIN or SELTEN verdict shows its own label
       (Skip it / Small portion) and reason, with the carb estimate after it; never a promise that it won't spike. */
    function headline(v, l) {
        if (!v || v.empty) return null;
        const K = fk(), fv = v.food && v.food.verdict, lab = x => { const s2 = String(K.label(x, l) || ''); return s2.charAt(0).toUpperCase() + s2.slice(1).toLowerCase(); }, why = () => (v.food && (v.food.reason || (K && K.reasonText(v.food.rule, l)))) || '';
        const netS = t('net', l, { net: v.net }), join = (a, b) => a ? a + ' \u00b7 ' + b : b.charAt(0).toUpperCase() + b.slice(1);
        if (fv === 'NEIN' && K) return { cls: 'high', ans: lab('NEIN'), why: join(why(), netS) };
        if (v.level === 'high') return { cls: 'high', ans: t('high', l), why: v.drink ? t('whyDrink', l) : t('whyHigh', l, { net: v.net }) };
        if (fv === 'SELTEN' && K) return { cls: 'mid', ans: lab('SELTEN'), why: join(why(), netS) };
        if (v.level === 'mid') return { cls: 'mid', ans: t('mid', l), why: t('whyMid', l, { net: v.net }) };
        return { cls: 'low', ans: t('low', l), why: t('whyLow', l, { net: v.net }) };
    }
    function fk() { try { return (typeof window !== 'undefined' && window.LowiFoodKnowledge) || (typeof require === 'function' ? require('./food-knowledge-core.js') : null); } catch (e) { return null; } }

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
            if (why === 'spike' && v && v.nein && !v.spike) why = 'nein';
            return { xp: base + quest, base, quest, why, cap };
        }
        const why = v && v.spike ? 'spike' : v && v.nein ? 'nein' : '', base = why ? 0 : 15;
        return { xp: base, base, quest: 0, why, cap };
    }
    // { big: '+45 XP', small: '15 for the meal + 30 for today's eat quest' }
    function xpText(x, l) {
        const big = x.xp ? '+' + x.xp + ' XP' : '0 XP';
        let small;
        if (!x.why) small = x.quest ? t('xpQuest', l, { base: x.base, quest: x.quest }) : t('xpOk', l);
        else if (x.why === 'spike') small = t('xpSpike', l);
        else if (x.why === 'nein') small = t('xpNein', l);
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
    function formValues(items, drinks, l, aiBlock) {
        const all = (items || []).concat(drinks || []);
        const v = verdict(items, drinks, aiBlock, l);
        return { title: title(all, l), lvl: all.length ? v.lvl : '', macros: all.length ? totals(all) : null, verdict: v };
    }

    /* ---------- the screen ---------- */
    function macroLine(d, l) {
        return [['protein', d.protein], ['carbs', d.carbs], ['fat', d.fat]].map(([k, v]) => '<span><b>' + Math.round(v) + ' g</b> ' + esc(t(k, l)) + '</span>').join('');
    }
    function cardHTML(d, i, kind, editing, l, pick, fresh) {
        const id = kind + i;
        if (editing) {
            const f = kind === 'f', lab = t(fresh ? 'addWhat' : f ? 'what' : 'drinkWhat', l);
            return '<li class="mr-item mr-editing' + (fresh ? ' mr-fresh' : '') + '" data-mr="' + id + '"><div class="mr-ed" role="group" aria-label="' + esc(lab) + '">' +
                '<label>' + esc(lab) + '<input data-mr-name value="' + esc(d.name) + '"' + (fresh ? ' placeholder="' + esc(t('addPh', l)) + '"' : '') + ' maxlength="60" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done"' +
                (f ? ' role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="mr-sug-' + id + '"' : '') + '></label>' +
                (f ? '<div class="mr-sug" id="mr-sug-' + id + '" role="listbox" aria-label="' + esc(t('sugL', l)) + '" hidden></div>' : '') +
                '<label><span data-mr-many>' + esc(f ? manyLabel(pick, l) : t('manyD', l)) + '</span><input data-mr-count type="number" inputmode="decimal" min="0" max="' + MAX_COUNT + '" step="any" placeholder="' + esc(t('manyPh', l)) + '" value="' + (d.count ? esc(d.count) : '') + '"></label>' +
                (f ? '<p class="mr-live" data-mr-live aria-live="polite"' + (pick ? '' : ' hidden') + '>' + (pick ? esc(d.portion + ' · ' + Math.round(d.kcal) + ' ' + t('kcal', l)) : '') + '</p>' : '') +
                '<div class="mr-ed-acts"><button type="button" class="mr-save" data-mr-save="' + id + '">' + esc(t('save', l)) + '</button><button type="button" class="mr-cancel" data-mr-cancel="' + id + '">' + esc(t('cancel', l)) + '</button></div></div></li>';
        }
        return '<li class="mr-item' + (d.src === 'kept' || d.src === 'unknown' || d.src === 'new0' ? ' mr-kept' : '') + '" data-mr="' + id + '">' +
            '<button type="button" class="mr-tap" data-mr-edit="' + id + '" aria-label="' + esc(t('edit', l) + ': ' + d.name) + '">' +
            '<span class="mr-nm"><b>' + esc(d.name) + '</b>' + (d.portion ? '<small>' + esc(d.portion) + '</small>' : '') + '</span>' +
            '<span class="mr-kc"><b>' + Math.round(d.kcal) + '</b><small>' + esc(t('kcal', l)) + '</small></span>' +
            '<span class="mr-pen" aria-hidden="true">' + esc(t('edit', l)) + '</span></button>' +
            '<button type="button" class="mr-x" data-mr-rm="' + id + '" aria-label="' + esc(t('remove', l) + ' ' + d.name) + '">×</button>' +
            '<p class="mr-mac">' + macroLine(d, l) + '</p>' +
            (d.src === 'kept' || d.src === 'unknown' ? '<p class="mr-note">' + esc(t('kept', l, { name: d.name })) + '</p>' : d.src === 'new0' ? '<p class="mr-note">' + esc(t('new0', l, { name: d.name })) + '</p>' : '') + '</li>';
    }

    /* box: where the result goes (the sheet's .sp-ai). form: the Log as meal form (name="title" + hidden macro inputs).
       opts: { dishes, lang, low, note, photo (data URL for the thumbnail), db, dbReady(), bridge, onChange(values) }. */
    function mount(box, form, opts) {
        opts = opts || {};
        if (!box) return null;
        const l = opts.lang || lang();
        const st = { items: (opts.dishes || []).slice(0, MAX_FOODS).map(clean).filter(d => d.name), drinks: [], edit: '', adding: false, pick: null, orig: null, sugs: [], sugAct: -1, fresh: '' };
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

        const render = (focusSel, keepSel) => {
            const fv = formValues(st.items, st.drinks, l, opts.verdictBlock), v = fv.verdict;
            writeForm(fv);
            if (sheet) sheet.classList.toggle('mr-on', !v.empty);
            const mealTitle = (titleIn && titleIn.value.trim()) || fv.title;
            const x = xpFor(v, mealTitle, bridge());
            const hl = headline(v, l);
            const head = v.empty ? '' :
                '<section class="mr-verdict mr-' + hl.cls + '" aria-live="polite" aria-atomic="true">' +
                '<div class="mr-vt"><small class="mr-q">' + esc(t('q', l)) + '</small><b class="mr-ans"><i aria-hidden="true"></i>' + esc(hl.ans) + '</b>' +
                '<span class="mr-why">' + esc(hl.why) + '</span>' +
                '</div>' +
                (opts.photo ? '<img class="mr-thumb" alt="" src="' + esc(opts.photo) + '">' : '') + '</section>';
            const foods = st.items.length ? '<div class="mr-sec"><p class="mr-h"><b>' + esc(t('see', l)) + '</b><small>' + esc(t('tapFix', l)) + '</small></p><ul class="mr-list">' +
                st.items.map((d, i) => cardHTML(d, i, 'f', st.edit === 'f' + i, l, st.pick && st.pick.id === 'f' + i ? st.pick.p : null, st.fresh === 'f' + i)).join('') + '</ul>' +
                (st.items.length < MAX_FOODS && !st.fresh ? '<button type="button" class="mr-add-btn mr-add-food" data-mr-add-food><span aria-hidden="true">+</span> ' + esc(t('addFood', l)) + '</button>' : '') + '</div>' : '';
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
            const html = head + foods + (v.empty ? '' : drinks) + foot;
            if (!(keepSel && keep(html, keepSel))) box.innerHTML = html;
            else liveLine(keepSel);
            if (focusSel) { const f = box.querySelector(focusSel); if (f && f.focus) { try { f.focus({ preventScroll: false }); } catch (e) { f.focus(); } } }
            if (typeof opts.onChange === 'function') { try { opts.onChange(fv, x); } catch (e) { } }
            return fv;
        };

        /* Live update while a food is being fixed: everything around the open card is redrawn (verdict, other cards, XP,
           totals) but the open card itself stays the same element, so the keyboard and the caret stay where they are. */
        const keep = (html, sel) => {
            const oldK = box.querySelector(sel);
            if (!oldK || typeof document === 'undefined') return false;
            const tpl = document.createElement('div');
            tpl.innerHTML = html;
            const newK = tpl.querySelector(sel);
            const chain = (n, top) => { const c = []; while (n && n !== top) { c.unshift(n); n = n.parentNode; } return n === top ? c : null; };
            const oc = chain(oldK, box), nc = newK && chain(newK, tpl);
            if (!oc || !nc || oc.length !== nc.length || oc.some((n, d) => n.tagName !== nc[d].tagName)) return false;
            let op = box, np = tpl;
            for (let d = 0; d < oc.length; d++) {
                const ok = oc[d], nk = nc[d];
                Array.from(op.childNodes).forEach(c => { if (c !== ok) op.removeChild(c); });
                let before = true;
                Array.from(np.childNodes).forEach(c => { if (c === nk) { before = false; return; } if (before) op.insertBefore(c, ok); else op.appendChild(c); });
                if (d < oc.length - 1) ok.className = nk.className;
                op = ok; np = nk;
            }
            return true;
        };
        const liveLine = (sel) => {
            const li = box.querySelector(sel), el = li && li.querySelector('[data-mr-live]');
            if (!el) return;
            const id = li.dataset.mr, d = st.items[indexOf(id)];
            const on = !!(st.pick && st.pick.id === id && d);
            el.hidden = !on;
            el.textContent = on ? d.portion + ' · ' + Math.round(d.kcal) + ' ' + t('kcal', l) : '';
        };
        const keepOf = (id) => '[data-mr="' + id + '"]';

        /* suggestions for "What is it really?" (known products, see knownList) */
        let known = null, knownAt = 0, rTimer = 0, eTimer = 0;
        const remote = {};
        const SRC_KEY = { home: 'srcHome', cart: 'srcCart', scan: 'srcScan', log: 'srcLog', dex: 'srcDex', table: 'srcTable' };
        // the Kitchen: "At home" (lowispike.kitchen.v1, read through LowiKitchenCore when it is there) and the shopping cart
        const kitchenNow = () => {
            let home = [], cart = [];
            try {
                const raw = root.localStorage.getItem('lowispike.kitchen.v1');
                const KC = root.LowiKitchenCore;
                home = KC && KC.parse ? KC.parse(raw).items : ((JSON.parse(raw || 'null') || {}).items || []);
            } catch (e) { home = []; }
            try { const sh = root.LOWI_SHELF; cart = sh && typeof sh.listOpen === 'function' ? sh.listOpen(true) || [] : []; } catch (e) { cart = []; }
            return { home: Array.isArray(home) ? home : [], cart: Array.isArray(cart) ? cart : [] };
        };
        const knownNow = () => {
            if (opts.known) return typeof opts.known === 'function' ? opts.known() : opts.known;
            if (known && Date.now() - knownAt < 4000) return known;
            let dex = null, logs = [];
            try { dex = root.LowiDex && root.LowiDex.state ? root.LowiDex.state() : JSON.parse(root.localStorage.getItem('lowi.dex.v1') || 'null'); } catch (e) { dex = null; }
            try { const S = JSON.parse(root.localStorage.getItem('lowispike.v2') || 'null'); logs = S && Array.isArray(S.logs) ? S.logs.slice(-400) : []; } catch (e) { logs = []; }
            const kn = kitchenNow();
            known = knownList({ mine: dex && dex.mine ? Object.values(dex.mine) : [], logs, comm: dex && Array.isArray(dex.comm) ? dex.comm : [], home: kn.home, cart: kn.cart });
            knownAt = Date.now();
            return known;
        };
        const merged = (a, b) => { const seen = {}; a.forEach(x => { seen[x.key] = 1; seen['n' + skey(x.name)] = 1; }); return a.concat((b || []).filter(x => x && !seen[x.key] && !seen['n' + skey(x.name)])); };
        const closeSug = (li) => {
            const el = li && li.querySelector('.mr-sug'), inp = li && li.querySelector('[data-mr-name]');
            if (el) { el.hidden = true; el.innerHTML = ''; }
            if (inp) { inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); }
            st.sugs = []; st.sugAct = -1;
        };
        const paintSug = (li, id, list) => {
            const el = li.querySelector('.mr-sug'), inp = li.querySelector('[data-mr-name]');
            if (!el || !inp) return;
            list.forEach(p => estFor(p, db(), true));   // names already read once: their portion right away
            st.sugs = list; st.sugAct = -1;
            el.innerHTML = list.map((p, k) => {
                const sub = [p.brand && skey(p.name).indexOf(skey(p.brand)) < 0 ? p.brand : '', t(SRC_KEY[p.src] || 'srcDex', l)].filter(Boolean).join(' · ');
                return '<button type="button" role="option" aria-selected="false" class="mr-opt' + (p.src === 'home' || p.src === 'cart' ? ' mr-opt-kit' : '') + '" id="mr-o-' + id + '-' + k + '" data-mr-pick="' + k + '">' +
                    '<span class="mr-opt-n"><b>' + esc(p.name) + '</b><small>' + esc(sub) + '</small></span><span class="mr-opt-k">' + esc(perText(p, l)) + '</span></button>';
            }).join('');
            el.hidden = !list.length;
            inp.setAttribute('aria-expanded', list.length ? 'true' : 'false');
            inp.removeAttribute('aria-activedescendant');
            // the scroll that keeps the list above the keyboard waits for the next frame, so the keystroke itself never waits on layout
            if (list.length) { const raf = root.requestAnimationFrame || (f => setTimeout(f, 16)); raf(() => { if (!el.hidden && st.sugs === list) reveal(el, inp); }); }
            // Kitchen names nothing knows: read their typical portion just after the keystroke, never during it
            clearTimeout(eTimer);
            let tries = 0;
            const fill = () => {
                if (st.sugs !== list || el.hidden) return;
                const d = db();
                list.forEach((p, k) => {
                    if (!p.est || hasNut(p)) return;
                    estFor(p, d);
                    const o = hasNut(p) && el.querySelector('#mr-o-' + id + '-' + k + ' .mr-opt-k');
                    if (o) o.textContent = perText(p, l);
                });
                // the meal database may still be loading right after the photo: look again a little later
                if (d && d.ready && !d.ready() && ++tries < 8) eTimer = setTimeout(fill, 500);
            };
            if (list.some(p => p.est && !hasNut(p))) eTimer = setTimeout(fill, 140);
        };
        // the list sits under the field: scroll the sheet so it is above the keyboard, without pushing the field off the top
        const reveal = (el, inp) => {
            try {
                const vv = root.visualViewport, top = vv ? vv.offsetTop : 0, H = vv ? vv.height + vv.offsetTop : root.innerHeight;
                const over = el.getBoundingClientRect().bottom + 8 - H;
                if (over <= 0) return;
                let sc = el.parentElement;
                while (sc && sc !== document.body) { const cs = getComputedStyle(sc); if (/(auto|scroll)/.test(cs.overflowY) && sc.scrollHeight > sc.clientHeight) break; sc = sc.parentElement; }
                if (!sc || sc === document.body) return;
                sc.scrollTop += Math.max(0, Math.min(over, inp.getBoundingClientRect().top - top - 12));
            } catch (e) { }
        };
        const KIT = { home: 1, cart: 1 }, MINE = { home: 1, cart: 1, scan: 1, log: 1 };
        // own: when the editor opens on the scanner's name, only your Kitchen, scans and logged foods are offered
        const sugFor = (li, id, own) => {
            const inp = li && li.querySelector('[data-mr-name]');
            if (!inp || !li.querySelector('.mr-sug')) return;
            const q = parseAmount(inp.value).rest || inp.value, k = skey(q);
            if (st.pick && st.pick.id === id) { closeSug(li); return; }
            if (k.length < 2) {
                // a food you are adding, nothing typed yet: the newest things in your Kitchen are one tap away
                const kit = id === st.fresh && !inp.value.trim() ? knownNow().filter(p => KIT[p.src]).slice(0, 5) : [];
                if (kit.length) paintSug(li, id, kit); else closeSug(li);
                return;
            }
            if (own) { const L = suggest(q, knownNow().filter(p => MINE[p.src]), 5); if (L.length) paintSug(li, id, L); else closeSug(li); return; }
            paintSug(li, id, suggest(q, merged(knownNow(), remote[k]), 5));
            const LD = root.LowiDex;
            if (k.length >= 3 && !remote[k] && LD && typeof LD.search === 'function') {
                clearTimeout(rTimer);
                rTimer = setTimeout(() => {
                    Promise.resolve(LD.search(q)).then(rs => { remote[k] = (rs || []).map(p => fromProduct(p, 'dex')).filter(Boolean); }, () => { remote[k] = []; }).then(() => {
                        const li2 = box.querySelector(keepOf(id)), inp2 = li2 && li2.querySelector('[data-mr-name]');
                        if (inp2 && remote[k].length && skey(parseAmount(inp2.value).rest || inp2.value) === k) sugFor(li2, id);
                    });
                }, 350);
            }
        };
        const setMany = (li, p) => { const el = li && li.querySelector('[data-mr-many]'); if (el) el.textContent = manyLabel(p, l); };
        const pick = (k, li) => {
            const p = st.sugs[k];
            if (!p || !li) return;
            const id = li.dataset.mr, i = indexOf(id);
            const nameIn = li.querySelector('[data-mr-name]'), countIn = li.querySelector('[data-mr-count]');
            const orig = st.orig && st.orig.id === id ? st.orig.item : st.items[i];
            estFor(p, db());
            if (!hasNut(p)) {          // a Kitchen name nothing knows yet: fill it in, Update estimates it like typed text
                if (nameIn) nameIn.value = p.name;
                closeSug(li);
                if (countIn) { try { countIn.focus({ preventScroll: true }); } catch (e) { } }
                return;
            }
            const n = countOf(countIn && countIn.value) || parseAmount(nameIn ? nameIn.value : '').count || (oneOf(p).kind === 'piece' && orig ? piecesOf(orig.portion) : 0) || 1;
            if (nameIn) nameIn.value = p.name;
            if (countIn) countIn.value = n;
            st.pick = { id, p };
            st.items[i] = clean(itemFrom(p, n, l));
            closeSug(li);
            setMany(li, p);
            render(null, keepOf(id));
            if (countIn) { try { countIn.focus({ preventScroll: true }); countIn.select(); } catch (e) { } }
        };
        box.addEventListener('mousedown', ev => { if (ev.target.closest && ev.target.closest('[data-mr-pick]')) ev.preventDefault(); });   // keep the field focused
        box.addEventListener('input', ev => {
            const inp = ev.target, li = inp && inp.closest ? inp.closest('[data-mr]') : null;
            if (!li || li.dataset.mr[0] !== 'f' || st.edit !== li.dataset.mr) return;
            const id = li.dataset.mr, i = indexOf(id);
            if (inp.hasAttribute('data-mr-name')) {
                if (st.pick && st.pick.id === id && fold(inp.value.trim()) !== fold(st.pick.p.name)) {
                    st.pick = null;
                    if (st.orig && st.orig.id === id) st.items[i] = Object.assign({}, st.orig.item);
                    else if (id === st.fresh) st.items[i] = clean({ name: '' });
                    setMany(li, null);
                    render(null, keepOf(id));
                }
                sugFor(li, id);
            } else if (inp.hasAttribute('data-mr-count') && st.pick && st.pick.id === id && countOf(inp.value)) {
                st.items[i] = clean(itemFrom(st.pick.p, inp.value, l));
                render(null, keepOf(id));
            }
        });

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
            const pk = st.pick && st.pick.id === id && fold(text) === fold(st.pick.p.name) ? st.pick.p : null;
            const sameName = fold(text) === fold(prev.name) && countOf(count) === countOf(prev.count || 0);
            if (pk) list[i] = clean(itemFrom(pk, count, l));
            else if (!sameName) list[i] = clean(id[0] === 'd' ? (estimateDrink(text, count, db(), l) || prev) : estimateItem(text, count, prev, db(), l));
            if (id === st.fresh && list[i].src === 'kept') list[i].src = 'new0';   // an added food nothing knows: 0 kcal, said so
            st.edit = ''; st.pick = null; st.orig = null; st.sugs = []; st.fresh = '';
            render('[data-mr-edit="' + id + '"]');
        };
        // Cancel puts back what the card said before a suggestion was tried
        const restore = (id) => {
            if (st.pick && st.pick.id === id && st.orig && st.orig.id === id) listOf(id)[indexOf(id)] = Object.assign({}, st.orig.item);
            st.pick = null; st.orig = null; st.sugs = [];
        };
        /* "+ Add food" (Oct 24 2026): the scan missed the sauce. A blank card opens at the end of the list with the same
           field and suggestions; until Update it is only a placeholder (never leaves the screen; a picked suggestion shows
           live in the totals), and Cancel or opening anything else removes it. */
        const dropFresh = () => {
            if (!st.fresh) return false;
            const i = indexOf(st.fresh);
            if (st.items[i]) st.items.splice(i, 1);
            if (st.pick && st.pick.id === st.fresh) st.pick = null;
            st.fresh = '';
            return true;
        };
        const cancelEdit = () => {
            const id = st.edit;
            if (id && id === st.fresh) { st.pick = null; st.orig = null; st.sugs = []; st.items.splice(indexOf(id), 1); st.fresh = ''; st.edit = ''; render('[data-mr-add-food]'); return; }
            restore(id); st.edit = ''; render('[data-mr-edit="' + id + '"]');
        };
        const addFood = () => {
            if (st.items.length >= MAX_FOODS) return;
            dropFresh();
            const id = 'f' + st.items.length;
            st.items.push(clean({ name: '' }));
            st.fresh = id; st.edit = id; st.orig = null; st.pick = null; st.sugs = []; st.adding = false;
            render('[data-mr="' + id + '"] [data-mr-name]');
            sugFor(box.querySelector(keepOf(id)), id);
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
            if (ds.mrPick != null) { ev.preventDefault(); pick(+ds.mrPick, el.closest('[data-mr]')); }
            else if (ds.mrEdit != null) {
                ev.preventDefault();
                dropFresh();
                const eid = ds.mrEdit, it = listOf(eid)[indexOf(eid)];
                st.orig = it ? { id: eid, item: Object.assign({}, it) } : null; st.pick = null; st.sugs = []; st.edit = eid; st.adding = false;
                render('[data-mr="' + eid + '"] [data-mr-name]');
                if (eid[0] === 'f') sugFor(box.querySelector(keepOf(eid)), eid, true);   // the right thing may already be in your Kitchen
            }
            else if (ds.mrAddFood != null) { ev.preventDefault(); addFood(); }
            else if (ds.mrSave != null) { ev.preventDefault(); save(ds.mrSave); }
            else if (ds.mrCancel != null) { ev.preventDefault(); cancelEdit(); }
            else if (ds.mrRm != null) { ev.preventDefault(); dropFresh(); st.pick = null; st.orig = null; listOf(ds.mrRm).splice(indexOf(ds.mrRm), 1); st.edit = ''; render(); }
            else if (ds.mrAdd != null) { ev.preventDefault(); dropFresh(); st.adding = true; st.edit = ''; render('[data-mr-drink]'); }
            else if (ds.mrAddX != null) { ev.preventDefault(); st.adding = false; render('[data-mr-add]'); }
            else if (ds.mrChip != null) { ev.preventDefault(); addDrink(ds.mrChip); }
            else if (ds.mrAddGo != null) { ev.preventDefault(); const inp = box.querySelector('[data-mr-drink]'); addDrink(inp ? inp.value : ''); }
        });
        box.addEventListener('keydown', ev => {
            const t0 = ev.target;
            if (t0 && t0.hasAttribute && t0.hasAttribute('data-mr-name') && st.sugs.length) {
                const li = t0.closest('[data-mr]'), sg = li && li.querySelector('.mr-sug');
                if (sg && !sg.hidden) {
                    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
                        ev.preventDefault();
                        st.sugAct = Math.max(-1, Math.min(st.sugs.length - 1, st.sugAct + (ev.key === 'ArrowDown' ? 1 : -1)));
                        Array.from(sg.querySelectorAll('[data-mr-pick]')).forEach((b, k) => b.setAttribute('aria-selected', k === st.sugAct ? 'true' : 'false'));
                        if (st.sugAct >= 0) t0.setAttribute('aria-activedescendant', 'mr-o-' + li.dataset.mr + '-' + st.sugAct); else t0.removeAttribute('aria-activedescendant');
                        return;
                    }
                    if (ev.key === 'Enter' && st.sugAct >= 0) { ev.preventDefault(); pick(st.sugAct, li); return; }
                    if (ev.key === 'Escape') { ev.preventDefault(); closeSug(li); return; }
                }
            }
            if (ev.key !== 'Enter' && ev.key !== 'Escape') return;
            const inp = ev.target;
            if (!inp || inp.tagName !== 'INPUT') return;
            ev.preventDefault();
            if (inp.hasAttribute('data-mr-drink')) { if (ev.key === 'Enter') addDrink(inp.value); else { st.adding = false; render('[data-mr-add]'); } return; }
            const li = inp.closest('[data-mr]');
            if (!li) return;
            if (ev.key === 'Enter') save(li.dataset.mr); else cancelEdit();
        });
        render();
        return {
            items: () => st.items.filter(d => d.name), drinks: () => st.drinks.slice(), all: () => st.items.filter(d => d.name).concat(st.drinks),
            values: () => formValues(st.items, st.drinks, l, opts.verdictBlock), refresh: () => render(),
            _edit(i, text, count) { st.items[i] = clean(estimateItem(text, count, st.items[i], db(), l)); return render(); },
            _pick(q, k) { const li = box.querySelector('.mr-editing'); const inp = li && li.querySelector('[data-mr-name]'); if (!inp) return null; inp.value = q; sugFor(li, li.dataset.mr); const list = st.sugs.slice(); if (k != null) pick(k, li); return list; },
            _drink(text, count) { const d = estimateDrink(text, count, db(), l); if (d) st.drinks.push(clean(d)); return render(); }
        };
    }

    return { KEYS, STR, TABLE, lookup, parseAmount, estimateItem, estimateDrink, matchScore, pieceOf, fromProduct, fromLog, fromKitchen, kitchenHit, estFor, knownList, suggest, itemFrom, perText, manyLabel, clean, totals, title, verdict, xpFor, xpText, formValues, headline, mount };
});
