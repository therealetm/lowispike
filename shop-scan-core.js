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
    function verdictOf(p, rate) {
        if (!p || p.notFound) return 'unknown';
        if (p.verdict && p.verdict !== 'unknown' && MAP[p.verdict]) return MAP[p.verdict];
        if (typeof rate === 'function') { try { const r = rate(p); if (r && MAP[r.verdict]) return MAP[r.verdict]; } catch (e) {} }
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
        v_spike: ['Spike', 'Spike', 'Pico'],
        s_spike: ['Likely spikes your blood sugar', 'Treibt deinen Blutzucker wahrscheinlich hoch', 'Probablemente te sube el azúcar'],
        v_mild: ['Mild', 'Leicht', 'Leve'],
        s_mild: ['May raise it a little', 'Kann es etwas anheben', 'Puede subirla un poco'],
        v_none: ['No spike', 'Kein Spike', 'Sin pico'],
        s_none: ['Unlikely to spike your blood sugar', 'Treibt deinen Blutzucker kaum hoch', 'Es poco probable que te suba el azúcar'],
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
        unnamed: ['Product {0}', 'Produkt {0}', 'Producto {0}']
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

    const api = { MAP, LEVELS, level, verdictOf, TX, tx, langIndex, norm, safeImg, cartAdd, cartCount, factRows, SAME_MS, repeatHit, TRIP_MS, tripOn };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiShopScanCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
