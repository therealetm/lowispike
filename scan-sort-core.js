/* LOWiSPIKE scan sort (Oct 22, 2026): which caught/scanned products may feed meals, and which go in "Throw out".
   Uses the scanner's own rating scale (index.html rate(): ok "Low-spike" | better "Now and then" | spike "Skip it" | unknown).
   Cut-off: only ok and better feed Shuffle, the Buy pool and shopping matches. spike never does: it goes in Throw out.
   unknown (not checked yet) feeds nothing and is not called a spike either.
   A product counts as spike when its stored verdict OR the current estimator (rate) says spike, so an old "ok" row
   or a missing verdict can no longer sneak a spiking product in. With no label data at all, the name estimate
   (rateName, the one Scan uses for typed names) may still mark it spike. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiScanSort = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';
    const KNOWN = { ok: 1, better: 1, spike: 1 };
    function verdictOf(p, rate, rateName) {
        if (!p || p.notFound) return 'unknown';
        const stored = KNOWN[p.verdict] ? p.verdict : 'unknown';
        let live = 'unknown';
        if (typeof rate === 'function') { try { const r = rate(p); if (r && KNOWN[r.verdict]) live = r.verdict; } catch (e) {} }
        if (stored === 'spike' || live === 'spike') return 'spike';
        if (live !== 'unknown') return live;
        if (stored !== 'unknown') return stored;
        if (typeof rateName === 'function' && p.name) { try { const r = rateName(p.name); if (r && r.verdict === 'spike') return 'spike'; } catch (e) {} }
        return 'unknown';
    }
    const fits = v => v === 'ok' || v === 'better';
    /* list: products; o: {rate, rateName, identity(p), hidden:[keys], mine:[keys]} -> {keep, toss, unsure}, each item {key, product, verdict} */
    function split(list, o) {
        o = o || {};
        const idf = typeof o.identity === 'function' ? o.identity : (p => String(p.barcode || p.name));
        const hidden = new Set(o.hidden || []), mine = new Set(o.mine || []), seen = new Set();
        const keep = [], toss = [], unsure = [];
        (list || []).forEach(p => {
            if (!p || !p.name) return;
            let key; try { key = idf(p); } catch (e) { key = String(p.barcode || p.name); }
            if (seen.has(key)) return; seen.add(key);
            const item = { key, product: p, verdict: verdictOf(p, o.rate, o.rateName), mine: mine.has(key) };
            if (fits(item.verdict)) keep.push(item);
            else if (item.verdict === 'spike') { if (!hidden.has(key)) toss.push(item); }
            else unsure.push(item);
        });
        toss.sort((a, b) => (b.mine - a.mine) || ((b.product.ts || 0) - (a.product.ts || 0)));
        return { keep, toss, unsure };
    }
    const TX = {
        title: ['Throw out', 'Aussortieren', 'Para descartar'],
        line: ['Will likely spike insulin.', 'Spikt wahrscheinlich dein Insulin.', 'Probablemente dispara tu insulina.'],
        sub: ['Scanned, but kept out of Shuffle. No stress: swap them next time you shop.', 'Gescannt, aber nicht im Shuffle. Kein Stress: Beim nächsten Einkauf einfach tauschen.', 'Escaneados, pero fuera del shuffle. Sin estrés: cámbialos en tu próxima compra.'],
        remove: ['Remove from this list', 'Aus der Liste entfernen', 'Quitar de la lista'],
        more: ['Show all', 'Alle zeigen', 'Ver todos'],
        less: ['Show fewer', 'Weniger zeigen', 'Ver menos'],
        yours: ['your scan', 'dein Scan', 'tu escaneo'],
        emptyT: ['No low-spike products to shuffle yet', 'Noch keine Low-Spike-Produkte zum Mischen', 'Aún no hay productos de pico bajo para mezclar'],
        emptyS: ['Shuffle only uses products that won\u2019t spike. Scan a few more, or shuffle the eBook recipes.', 'Der Shuffle nimmt nur Produkte, die nicht spiken. Scanne noch ein paar oder misch die E-Book-Rezepte.', 'El shuffle solo usa productos que no disparan tu insulina. Escanea algunos más o mezcla las recetas del eBook.'],
        scan: ['Scan a product', 'Produkt scannen', 'Escanear un producto'],
        book: ['Shuffle the eBook', 'E-Book mischen', 'Mezclar el eBook']
    };
    const LI = { en: 0, de: 1, es: 2 };
    function text(k, lang) { const a = TX[k]; if (!a) return k; const i = LI[String(lang || 'en').slice(0, 2)]; return a[i == null ? 0 : i]; }
    return { verdictOf, fits, split, TX, text };
});
