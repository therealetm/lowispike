/* LOWiSPIKE · grocery bucket (queue grocery-1 + grocery-2, Oct 23 2026).
   Seven (Maya 7 handover, 22 Oct): while grocery shopping there was nowhere to keep scanned products. "After a scan: Add to
   bucket or Skip. The bucket lists the items with price and points, and shows the total price for the shop Seven is in (let them
   pick the shop or enter a price if it isn't known) and the total points. Save it per day."
   This file is the pure part (no DOM): the bucket per local day in localStorage
   lowi.bucket.v1 = {days: {"YYYY-MM-DD": [{k, code, name, brand, img, verdict, pts, typed, ts}]}, shops: {"YYYY-MM-DD": "REWE"}}.
   Points (grocery-2) = the product's spike points, the 0-100 number the card's blood sugar meter is drawn from (lower = gentler);
   only kept when the card had a real estimate, never made up. Prices are NEVER invented: an item's price is the one the person typed
   for that day (`typed`, wins), else the newest price reported for that product at the picked shop by real data the app already
   has (community shelf sightings via LOWI_SHELF.priceReports and the person's own price contributions in LowiDiscovery). No shop
   picked and nothing typed = no price. Words in en/de/es.
   grocery-4 (Seven: "Log what was cooked from those groceries, as text or a photo."): state.cooked = {"YYYY-MM-DD": [{id, t, via,
   used, ts}]} links a logged meal (the one meal journal) to the bucket items that went into it. */
(function (root) {
    'use strict';
    const KEY = 'lowi.bucket.v1', KEEP_DAYS = 14, MAX_ITEMS = 200, MAX_PRICE = 999;
    const TX = {
        add: ['Add to bucket', 'In den Korb', 'Añadir a la cesta'],
        skip: ['Skip', 'Überspringen', 'Saltar'],
        added: ['In today\'s bucket', 'Im heutigen Korb', 'En la cesta de hoy'],
        undo: ['Undo', 'Rückgängig', 'Deshacer'],
        count1: ['1 item today', '1 Produkt heute', '1 producto hoy'],
        countN: ['{n} items today', '{n} Produkte heute', '{n} productos hoy'],
        list: ['Today\'s bucket', 'Heutiger Korb', 'Cesta de hoy'],
        remove: ['Remove', 'Entfernen', 'Quitar'],
        empty: ['Your bucket is empty today.', 'Dein Korb ist heute leer.', 'Tu cesta está vacía hoy.'],
        v_spike: ['Higher', 'Höher', 'Más alto'],
        v_better: ['Moderate', 'Mittel', 'Moderado'],
        v_ok: ['Lower', 'Niedriger', 'Más bajo'],
        v_unknown: ['Not sure', 'Unklar', 'No seguro'],
        shop: ['Shop you\'re in', 'Dein Laden', 'Tu tienda'],
        noShop: ['Pick your shop', 'Laden wählen', 'Elige tu tienda'],
        otherShop: ['Other shop (type prices)', 'Anderer Laden (Preise eintippen)', 'Otra tienda (escribe precios)'],
        price: ['Price', 'Preis', 'Precio'],
        typePrice: ['Type price', 'Preis eintippen', 'Escribe el precio'],
        pts: ['{n} pts', '{n} Pkt.', '{n} pts'],
        noPts: ['no pts', 'keine Pkt.', 'sin pts'],
        total: ['Total', 'Summe', 'Total'],
        totalAt: ['Total at {s}', 'Summe bei {s}', 'Total en {s}'],
        missing1: ['1 item without a price', '1 Produkt ohne Preis', '1 producto sin precio'],
        missingN: ['{n} items without a price', '{n} Produkte ohne Preis', '{n} productos sin precio'],
        points: ['Spike points', 'Spike-Punkte', 'Puntos de pico'],
        ptsNote: ['From each card\'s blood sugar meter, lower is gentler', 'Vom Blutzucker-Balken jeder Karte, weniger ist sanfter', 'Del medidor de azúcar de cada tarjeta, menos es más suave'],
        typed: ['typed', 'eingetippt', 'escrito'],
        reported: ['reported {d}', 'gemeldet {d}', 'reportado {d}'],
        todayG: ['Today\'s groceries', 'Heutige Einkäufe', 'La compra de hoy'],
        todayOpen: ['Today\'s groceries + what to cook', 'Heutige Einkäufe + was kochen', 'La compra de hoy + qué cocinar'],
        bought: ['What you bought', 'Was du gekauft hast', 'Lo que compraste'],
        cook: ['Cook from it', 'Daraus kochen', 'Cocina con ello'],
        cookNote: ['Recipes from your Cook book that use what you bought.', 'Rezepte aus deinem Kochbuch mit deinen Einkäufen.', 'Recetas de tu recetario con lo que compraste.'],
        uses: ['Uses: {s}', 'Nutzt: {s}', 'Usa: {s}'],
        alsoNeed: ['Also needs: {s}', 'Brauchst noch: {s}', 'También necesitas: {s}'],
        noCook: ['No recipe in the app matches these yet. Add more groceries or browse Cook.', 'Noch kein Rezept in der App passt dazu. Kauf mehr ein oder stöbere in Kochen.', 'Aún no hay recetas en la app que encajen. Añade más compras o explora Cocinar.'],
        noneToday: ['Nothing in today\'s bucket yet. Scan a product and tap Add to bucket.', 'Noch nichts im heutigen Korb. Scanne ein Produkt und tippe In den Korb.', 'Nada en la cesta de hoy. Escanea un producto y toca Añadir a la cesta.'],
        openRecipe: ['Open recipe', 'Rezept öffnen', 'Abrir receta'],
        cooked: ['What you cooked', 'Was du gekocht hast', 'Lo que cocinaste'],
        cookedNote: ['Log it as text or a photo. It goes into your meals like any Log meal.', 'Trag es als Text oder Foto ein. Es landet bei deinen Mahlzeiten wie jedes Eintragen.', 'Regístralo con texto o una foto. Va a tus comidas como cualquier registro.'],
        cookedAsk: ['What did you cook?', 'Was hast du gekocht?', '¿Qué cocinaste?'],
        cookedPh: ['e.g. Chicken salad', 'z. B. Hähnchensalat', 'p. ej. Ensalada de pollo'],
        usedQ: ['Which groceries went in?', 'Welche Einkäufe sind drin?', '¿Qué compras usaste?'],
        logText: ['Log it', 'Eintragen', 'Registrar'],
        logPhoto: ['Snap a photo', 'Foto machen', 'Hacer foto'],
        cookedThis: ['Cooked this', 'Das gekocht', 'Cociné esto'],
        loggedC: ['Logged with your meals', 'Bei deinen Mahlzeiten eingetragen', 'Registrado en tus comidas'],
        dupC: ['Already logged today, it counts once', 'Heute schon eingetragen, zählt einmal', 'Ya registrado hoy, cuenta una vez'],
        failC: ['Couldn\'t log it. Try again.', 'Konnte nicht eintragen. Versuch es nochmal.', 'No se pudo registrar. Inténtalo de nuevo.'],
        needName: ['Type what you cooked first.', 'Schreib zuerst, was du gekocht hast.', 'Escribe primero qué cocinaste.'],
        usedS: ['With: {s}', 'Mit: {s}', 'Con: {s}'],
        viaPhoto: ['Photo', 'Foto', 'Foto'],
        viaText: ['Text', 'Text', 'Texto']
    };
    function langIndex(l) { l = String(l || '').toLowerCase(); return l.indexOf('de') === 0 ? 1 : l.indexOf('es') === 0 ? 2 : 0; }
    function tx(k, i, n, s) { const r = TX[k] || [k]; let o = r[i] || r[0]; if (n != null) o = o.replace('{n}', String(n)); if (s != null) o = o.replace('{s}', String(s)).replace('{d}', String(s)); return o; }
    function dayKey(t) { const d = new Date(t == null ? Date.now() : t); const p = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
    function keyOf(p) { p = p || {}; const c = String(p.barcode || p.code || '').replace(/\D/g, ''); if (c) return 'bc:' + c; const n = String(p.name || '').trim().toLowerCase(); return n ? 'nm:' + n + '|' + String(p.brand || '').trim().toLowerCase() : ''; }
    const isDay = k => /^\d{4}-\d{2}-\d{2}$/.test(k);
    function money(v) { return typeof v === 'number' && isFinite(v) && v > 0 && v <= MAX_PRICE ? Math.round(v * 100) / 100 : null; }
    function cleanItem(x) { if (!x || !x.k) return null; const o = Object.assign({}, x); if (o.typed != null && money(o.typed) == null) delete o.typed; if (o.pts != null && !(typeof o.pts === 'number' && o.pts >= 0 && o.pts <= 100)) delete o.pts; return o; }
    function clean(s) {
        s = s && typeof s === 'object' ? s : {};
        const d = s.days && typeof s.days === 'object' ? s.days : {}, sh = s.shops && typeof s.shops === 'object' ? s.shops : {}, out = {}, shops = {};
        Object.keys(d).forEach(k => { if (isDay(k) && Array.isArray(d[k])) out[k] = d[k].map(cleanItem).filter(Boolean).slice(0, MAX_ITEMS); });
        Object.keys(sh).forEach(k => { const v = String(sh[k] || '').trim().slice(0, 80); if (isDay(k) && v) shops[k] = v; });
        const o = { days: out, shops }, ck = s.cooked && typeof s.cooked === 'object' ? s.cooked : null;
        if (ck) { const c = {}; Object.keys(ck).forEach(k => { if (isDay(k) && Array.isArray(ck[k])) { const l = ck[k].map(cleanCooked).filter(Boolean).slice(-MAX_COOKED); if (l.length) c[k] = l; } }); if (Object.keys(c).length) o.cooked = c; }
        return o;
    }
    /* grocery-4: what was cooked from the day's groceries. The meal itself lives in the app's one meal journal (S.logs via
       LowiVitalsBridge.logMeal, its photo in meal-journal.js); the bucket only keeps the link: {id: the meal's eventId, t, via:
       'text'|'photo', used: [bucket item keys], ts}. */
    const MAX_COOKED = 20;
    function cleanCooked(x) {
        if (!x || !x.id) return null;
        const o = { id: String(x.id).slice(0, 120), t: String(x.t || '').trim().slice(0, 100), via: x.via === 'photo' ? 'photo' : 'text', used: Array.isArray(x.used) ? x.used.map(String).filter(Boolean).slice(0, 40) : [], ts: +x.ts || 0 };
        return o;
    }
    function addCooked(s, e, now) { s = clean(s); const c = cleanCooked(Object.assign({ ts: now == null ? Date.now() : now }, e)); if (!c) return s; const d = dayKey(c.ts || now); s.cooked = s.cooked || {}; s.cooked[d] = (s.cooked[d] || []).filter(x => x.id !== c.id).concat(c).slice(-MAX_COOKED); return s; }
    function cookedToday(s, now) { s = clean(s); return ((s.cooked || {})[dayKey(now)] || []).slice(); }
    function removeCooked(s, id) { s = clean(s); const a = String(id || ''); if (!a || !s.cooked) return s; Object.keys(s.cooked).forEach(d => { s.cooked[d] = s.cooked[d].filter(x => x.id !== a && x.id !== 'meal:' + a); if (!s.cooked[d].length) delete s.cooked[d]; }); if (!Object.keys(s.cooked).length) delete s.cooked; return s; }
    /* the bucket keys a suggested recipe uses (suggest() reports item names) */
    function keysFor(items, names) { const set = new Set((names || []).map(String)); return (items || []).filter(it => set.has(it.name || it.code)).map(it => it.k); }
    function prune(s, now) {
        const keep = Object.keys(s.days).sort().reverse().slice(0, KEEP_DAYS); const cut = dayKey((now == null ? Date.now() : now) - KEEP_DAYS * 864e5); const out = {}, shops = {};
        keep.forEach(k => { if (k > cut) out[k] = s.days[k]; });
        Object.keys(s.shops || {}).forEach(k => { if (k > cut) shops[k] = s.shops[k]; });
        const o = { days: out, shops };
        if (s.cooked) { const c = {}; Object.keys(s.cooked).forEach(k => { if (k > cut) c[k] = s.cooked[k]; }); if (Object.keys(c).length) o.cooked = c; }
        return o;
    }
    function ptsOf(p) { const v = { spike: 1, better: 1, ok: 1 }[p.verdict]; const sc = p.score != null ? p.score : p.facts && p.facts.score; return v && typeof sc === 'number' && isFinite(sc) ? Math.max(0, Math.min(100, Math.round(sc))) : null; }
    function item(p, now) {
        p = p || {}; const v = { spike: 1, better: 1, ok: 1 }[p.verdict] ? p.verdict : 'unknown'; const img = String(p.img || '');
        const it = { k: keyOf(p), code: String(p.barcode || p.code || ''), name: String(p.name || '').trim().slice(0, 120), brand: String(p.brand || '').trim().slice(0, 80), img: /^https:\/\//.test(img) ? img.slice(0, 500) : '', verdict: v, ts: now == null ? Date.now() : now };
        const pts = ptsOf(p); if (pts != null) it.pts = pts;
        return it; /* a price on the product object is never copied: prices come from typed input or real price reports only */
    }
    /* pure state ops: each returns a new state */
    function add(s, p, now) { s = clean(s); const it = item(p, now); if (!it.k) return s; const d = dayKey(it.ts); const old = (s.days[d] || []).find(x => x.k === it.k); if (old && old.typed != null) it.typed = old.typed; const list = (s.days[d] || []).filter(x => x.k !== it.k); list.push(it); s.days[d] = list.slice(-MAX_ITEMS); return prune(s, now); }
    function remove(s, k, day) { s = clean(s); const d = day || dayKey(); if (s.days[d]) s.days[d] = s.days[d].filter(x => x.k !== k); return s; }
    function today(s, now) { s = clean(s); return (s.days[dayKey(now)] || []).slice(); }
    function has(s, p, now) { const k = keyOf(p); return !!k && today(s, now).some(x => x.k === k); }
    function parsePrice(v) {
        if (typeof v === 'number') return money(v);
        let t = String(v == null ? '' : v).replace(/[€\s]|eur/gi, '');
        if (!t) return null;
        if (/^\d{1,3}([.,]\d{1,2})?$/.test(t)) return money(+t.replace(',', '.'));
        return null;
    }
    function setPrice(s, k, v, day) { s = clean(s); const d = day || dayKey(); const a = v === '' || v == null ? null : parsePrice(v); (s.days[d] || []).forEach(x => { if (x.k === k) { if (a == null) delete x.typed; else x.typed = a; } }); return s; }
    function setShop(s, shop, day) { s = clean(s); const d = day || dayKey(); const v = String(shop || '').trim().slice(0, 80); if (v) s.shops[d] = v; else delete s.shops[d]; return s; }
    function shopOf(s, day) { s = clean(s); return s.shops[day || dayKey()] || ''; }
    const norm = x => String(x || '').trim().toLowerCase().replace(/\s+/g, ' ');
    /* reports: [{amount, currency, store, date, expires}] from real data; only EUR, positive, dated, not expired */
    function validReports(rs, now) { now = now == null ? Date.now() : now; return (Array.isArray(rs) ? rs : []).filter(r => r && money(Number(r.amount)) != null && (!r.currency || r.currency === 'EUR') && r.store && r.date && !isNaN(Date.parse(r.date)) && !(r.expires > 0 && r.expires < now)); }
    function shopsFrom(reportsByKey, now) { const seen = new Map(); Object.keys(reportsByKey || {}).forEach(k => validReports(reportsByKey[k], now).forEach(r => { const n = norm(r.store); if (!seen.has(n)) seen.set(n, String(r.store).trim().slice(0, 80)); })); return [...seen.values()].sort((a, b) => a.localeCompare(b)); }
    function priceFor(it, reports, shop, now) {
        if (it && money(it.typed) != null) return { amount: money(it.typed), src: 'typed' };
        if (!shop) return null;
        const r = validReports(reports, now).filter(x => norm(x.store) === norm(shop)).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
        return r ? { amount: money(Number(r.amount)), src: 'report', store: r.store, date: r.date } : null;
    }
    function totals(items, reportsByKey, shop, now) {
        let price = 0, priced = 0, points = 0, scored = 0;
        (items || []).forEach(it => { const p = priceFor(it, (reportsByKey || {})[it.k], shop, now); if (p) { price += p.amount; priced++; } if (typeof it.pts === 'number') { points += it.pts; scored++; } });
        return { price: Math.round(price * 100) / 100, priced, missing: (items || []).length - priced, points, scored, n: (items || []).length };
    }
    /* grocery-3: cook suggestions from today's bucket, drawn ONLY from recipes the app already has (Cook's LowiAllRecipes:
       {id, n, e, book, ing: [{g, n}]}) and Cook's own group words (GROUP_WORDS: {g: [words]}). An ingredient counts as bought
       when a bucket item's name/brand contains a word of the ingredient's name (4+ letters) or one of its group's words.
       Ranked by how many ingredients the groceries cover, then fewer still needed, then Cook book recipes first. */
    const WSPLIT = /[^a-z0-9äöüßàáâãçèéêëìíîïñòóôõùúûý]+/;
    const STOP = { with: 1, from: 1, sugar: 1, free: 1, light: 1, lean: 1, fresh: 1, sheets: 1, mixed: 1, other: 1, plain: 1 };
    function wordsOf(t) { return String(t || '').toLowerCase().split(WSPLIT).filter(w => w.length >= 4 && !STOP[w]); }
    function ingName(i) { return typeof i === 'string' ? (i.split('|')[1] || i) : (i && i.n) || ''; }
    function ingGroup(i) { return typeof i === 'string' ? (i.indexOf('|') > 0 ? i.split('|')[0] : '') : (i && i.g) || ''; }
    /* German/Spanish shelf names for Cook's groups (Cook's GROUP_WORDS is mostly English): vocabulary only, never recipes */
    const LOCAL_WORDS = {
        hack: ['hackfleisch', 'rinderhack', 'frikadelle', 'carne picada', 'hamburguesa'],
        huhn: ['hähnchen', 'haehnchen', 'pute', 'lachs', 'thunfisch', 'garnelen', 'fisch', 'pollo', 'pavo', 'salmón', 'salmon', 'atún', 'gambas', 'pescado'],
        paprika: ['pimiento'],
        salat: ['spinat', 'rucola', 'blattsalat', 'lechuga', 'espinacas', 'rúcula'],
        gemuese: ['gurke', 'tomate', 'brokkoli', 'zucchini', 'pilze', 'champignon', 'kohl', 'blumenkohl', 'aubergine', 'pepino', 'brócoli', 'calabacín', 'champiñón', 'coliflor'],
        kaese: ['käse', 'kaese', 'gouda', 'emmentaler', 'schafskäse', 'queso'],
        milch: ['joghurt', 'quark', 'skyr', 'sahne', 'yogur', 'nata'],
        eier: ['eier', 'huevo', 'huevos'],
        fett: ['nüsse', 'nuesse', 'mandeln', 'walnüsse', 'walnuss', 'olivenöl', 'aguacate', 'nueces', 'almendras', 'aceite'],
        wuerze: ['senf', 'gewürz', 'mostaza', 'especias'],
        snack: ['schokolade', 'beeren', 'chocolate', 'bayas', 'frutos rojos']
    };
    function covers(itemText, ing, groupWords) {
        const t = itemText; if (!t) return false;
        if (wordsOf(ingName(ing)).some(w => t.indexOf(w) >= 0)) return true;
        const g = ingGroup(ing), gw = [].concat(Array.isArray((groupWords || {})[g]) ? groupWords[g] : [], LOCAL_WORDS[g] || []);
        return gw.length > 0 && gw.some(w => String(w).length >= 3 && (String(w).indexOf(' ') > 0 ? t.indexOf(String(w).toLowerCase()) >= 0 : t.split(WSPLIT).some(x => x.indexOf(String(w).toLowerCase()) >= 0)));
    }
    function suggest(items, recipes, groupWords, max) {
        const texts = (items || []).map(it => ({ it, t: (String(it.name || '') + ' ' + String(it.brand || '')).toLowerCase() })).filter(x => x.t.trim());
        if (!texts.length) return [];
        const out = [];
        (Array.isArray(recipes) ? recipes : []).forEach(r => {
            if (!r || !r.id || !r.n || !Array.isArray(r.ing) || !r.ing.length) return;
            const have = [], need = [], used = new Set();
            r.ing.forEach(i => { const hit = texts.filter(x => covers(x.t, i, groupWords)); if (hit.length) { have.push(ingName(i)); hit.forEach(x => used.add(x.it.name || x.it.code)); } else need.push(ingName(i)); });
            if (have.length) out.push({ id: String(r.id), n: String(r.n), e: r.e || '', book: !!r.book, have, need, used: [...used] });
        });
        out.sort((a, b) => b.have.length - a.have.length || a.need.length - b.need.length || (b.book ? 1 : 0) - (a.book ? 1 : 0) || a.n.localeCompare(b.n));
        return out.slice(0, max == null ? 3 : max);
    }
    function fmtPrice(a, li) { const v = Number(a).toFixed(2); return li ? v.replace('.', ',') + ' €' : '€' + v; }
    function load(store) { try { return clean(JSON.parse((store || root.localStorage).getItem(KEY) || '{}')); } catch (e) { return { days: {}, shops: {} }; } }
    function save(s, store) { try { (store || root.localStorage).setItem(KEY, JSON.stringify(clean(s))); return true; } catch (e) { return false; } }
    const api = { KEY, KEEP_DAYS, TX, langIndex, tx, dayKey, keyOf, add, remove, today, has, load, save, item, parsePrice, setPrice, setShop, shopOf, shopsFrom, priceFor, totals, fmtPrice, validReports, suggest, addCooked, cookedToday, removeCooked, keysFor };
    root.LowiBucketCore = api;
    if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
