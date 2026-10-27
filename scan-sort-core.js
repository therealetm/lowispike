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
    /* scanfe-h (Oct 23, 2026): the live rating is the engine verdict (LowiSpikeCore.foodVerdict: the blood sugar estimate made
       stricter by the Food check card, NEIN -> spike, SELTEN -> at least better), so Shuffle, Throw out, Buy picks and shopping
       matches agree with the card. It reads the scanner's rate(p) result; when that is an engine result (it carries .engine), the
       Food check verdict tightens it. Manual entries keep the scanner's own rate(). */
    let SC = null;
    function spikeCore() {
        if (SC) return SC;
        if (typeof window !== 'undefined' && window.LowiSpikeCore) return window.LowiSpikeCore;
        if (typeof require === 'function') { try { SC = require('./spike-core.js'); } catch (e) { SC = null; } }
        return SC;
    }
    function verdictOf(p, rate, rateName) {
        if (!p || p.notFound) return 'unknown';
        const stored = KNOWN[p.verdict] ? p.verdict : 'unknown';
        let live = 'unknown', byEngine = false;
        if (typeof rate === 'function') {
            try {
                const r = rate(p);
                if (r && KNOWN[r.verdict]) live = r.verdict;
                const S = r && r.engine && !p.manual ? spikeCore() : null;
                if (S && typeof S.tighten === 'function') { const v = S.tighten(p, r); if (KNOWN[v]) { live = v; byEngine = true; } }
            } catch (e) {}
        }
        /* 26 Oct 2026: a stored spike that an earlier rerate wrote (rerated rows, see LowiSpikeCore.rerate) is not the catch-day
           verdict: the live engine verdict replaces it, so a corrected Food check reaches Shuffle. */
        if (p.rerated && byEngine && live !== 'unknown') return live;
        if (stored === 'spike' || live === 'spike') return 'spike';
        if (live !== 'unknown') return live;
        if (stored !== 'unknown') return stored;
        if (typeof rateName === 'function' && p.name) { try { const r = rateName(p.name); if (r && r.verdict === 'spike') return 'spike'; } catch (e) {} }
        return 'unknown';
    }
    /* why a product sits in "Kept out of Shuffle", in one or two words (26 Oct 2026). Reads the scanner's own reasons
       (LowiSpikeCore assess why keys), sweetener first because it is LOWiSPIKE's own rule, not a blood sugar claim. */
    function reasonOf(p, rate) {
        let keys = [];
        try { const r = typeof rate === 'function' ? rate(p) : null; keys = ((r && r.why) || []).concat((p && p.why) || []).map(w => String(Array.isArray(w) ? w[0] : w || '')); } catch (e) {}
        const has = rx => keys.some(k => rx.test(k));
        if (has(/sweet/) || /s\u00fc\u00dfstoff|sweetener|edulcorante/.test(String((p && p.ingredients) || '').toLowerCase())) return 'rSweet';
        if (has(/pork|schwein/)) return 'rPork';
        if ((p && (p.unit === 'ml' || p.cat === 'drink' || (p.facts && p.facts.drink))) && has(/sugar|e_/)) return 'rDrink';
        if (has(/sugar|sirup|syrup/)) return 'rSugar';
        if (has(/^s_(refined|flour|rice|starch|corn|oat|grain|bread|pasta|potato)/)) return 'rStarch';
        const f = (p && p.facts) || {};
        if (Number(f.s) >= 10) return 'rSugar';
        if (Number(f.c) >= 30) return 'rStarch';
        return 'rOther';
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
        /* 26 Oct 2026 (Emmanuel: "Why am I seeing the food that I'm not supposed to be eating in my product shuffle?"): the big red
           "Throw out" list left the Shuffle screen. One calm row ("11 scans kept out of Shuffle") opens the list in its own sheet.
           The sheet names the verdict once, in the scanner's words (Spike likely), and each row says why in one or two words.
           The old line promising an insulin spike is gone: no medical promise, one verdict per screen. */
        row: ['{n} scans kept out of Shuffle', '{n} Scans nicht im Shuffle', '{n} escaneos fuera del shuffle'],
        row1: ['1 scan kept out of Shuffle', '1 Scan nicht im Shuffle', '1 escaneo fuera del shuffle'],
        title: ['Kept out of Shuffle', 'Nicht im Shuffle', 'Fuera del shuffle'],
        verdict: ['Not insulin-friendly', 'Nicht insulinfreundlich', 'No apto para la insulina'],
        sub: ['Your scans that the Food check rates Not insulin-friendly. Shuffle and Swipe only show insulin-friendly products. Swap these next time you shop.', 'Deine Scans, die der Food-Check als nicht insulinfreundlich bewertet. Shuffle und Swipe zeigen nur insulinfreundliche Produkte. Tausch sie beim nächsten Einkauf.', 'Tus escaneos que el Food check califica como no aptos para la insulina. Shuffle y Deslizar solo muestran productos aptos para la insulina. Cámbialos en tu próxima compra.'],
        rSweet: ['Sweetener', 'Süßstoff', 'Edulcorante'],
        rSugar: ['Sugar', 'Zucker', 'Azúcar'],
        rStarch: ['Starchy carbs', 'Viel Stärke', 'Mucho almidón'],
        rPork: ['Pork', 'Schwein', 'Cerdo'],
        rDrink: ['Sweet drink', 'Süßes Getränk', 'Bebida dulce'],
        rOther: ['Food check: Skip it', 'Food-Check: Lieber nicht', 'Food check: Mejor no'],
        close: ['Close', 'Schließen', 'Cerrar'],
        remove: ['Remove from this list', 'Aus der Liste entfernen', 'Quitar de la lista'],
        yours: ['your scan', 'dein Scan', 'tu escaneo'],
        emptyT: ['No low-spike products to shuffle yet', 'Noch keine Low-Spike-Produkte zum Mischen', 'Aún no hay productos de pico bajo para mezclar'],
        emptyS: ['Shuffle only uses products with a lower impact. Scan a few more, or shuffle the eBook recipes.', 'Der Shuffle nimmt nur Produkte mit niedrigerer Wirkung. Scanne noch ein paar oder misch die E-Book-Rezepte.', 'El shuffle solo usa productos de menor impacto. Escanea algunos más o mezcla las recetas del eBook.'],
        scan: ['Scan a product', 'Produkt scannen', 'Escanear un producto'],
        book: ['Shuffle the eBook', 'E-Book mischen', 'Mezclar el eBook']
    };
    /* catalog (Oct 22, 2026, bug: Cook > Products > Shuffle showed "No low-spike products to shuffle yet"): the Products pool was only
       the person's own and community catches, so with few or unrated catches it came out empty. The built-in shop ranges
       (data/shop/<range>.json, rated by LowiStorePicksCore) now feed it too: only products with a real label that pass the store
       rating (engine blood sugar impact Lower, sugar per serving, Food check not NO). The caller still runs them through split() so the scanner's estimator has the last word.
       data: a range file; core: LowiStorePicksCore; o.max: cap (default 240), spread over the food groups. */
    function catalog(data, core, o) {
        o = o || {};
        if (!data || !core || typeof core.build !== 'function') return [];
        const max = o.max || 240, src = String(o.range || data.chain || 'catalog');
        let built; try { built = core.build(data); } catch (e) { return []; }
        /* the range files have no ingredient lists, so the app's pork and sweetener exclusions are applied to the name */
        const NOPE = /schwein|\bpork|bacon|\bspeck|fl\u00e6sk|svine|lonza|fedtegrever|prosciutto|serrano|chorizo|cerdo|leberk\u00e4se|\bzero\b|zuckerfrei|ohne zucker|ohne zuckerzusatz|no sugar|uden sukker|sugar.?free|\blight\b|\bmax\b|sukkerfri|sin az[u\u00fa]car|\bdiet\b|s\u00fc\u00dfstoff|sweetener|energy|energi|booster|\bbang\b|amper|awake|flying power|0 kalorie|kalorienfrei|ice ?tea|eistee|frugtdrik|lemonade|limonade|\bcola\b|\bfanta\b|\bsprite\b|faxe kondi/i,
            /* cooking basics are low-spike but not a pick: oils, fats, salt, vinegar */
            BASICS = /\S*\u00f6l(\s|$)|\boil\b|\S*fett\b|salz|\bsalt\b|\bolie\b|fritier|frittier|essig|vinegar/i,
            PORKISH = /salami|salame|salchich|schinken|wurst|\bmett\b|cabanossi|tyrolini|landj[a\u00e4]ger|mortadella|pancetta|guanciale|wiener|\bham\b|skinke|p\u00f8lse/i,
            BIRD = /pute|h\u00e4hnchen|huhn|chicken|rinder|beef|gefl\u00fcgel|kalkun|kylling|lamm|turkey|vegan|vegetar/i;
        const lanes = (built.groups || []).map(g => (g.pass || []).filter(it => it && it.p && typeof it.p.c === 'number' && !it.r.typical && !NOPE.test(String(it.p.n) + ' ' + String(it.p.k || '')) && !BASICS.test(String(it.p.n)) && !(PORKISH.test(String(it.p.n)) && !BIRD.test(String(it.p.n)))));
        const out = [];
        for (let i = 0; out.length < max; i++) {
            let any = false;
            lanes.forEach(l => { const it = l[i]; if (!it || out.length >= max) return; any = true;
                const p = it.p, img = typeof core.photo === 'function' ? core.photo(p) : null;
                out.push({ name: String(p.n), brand: p.b || '', barcode: /^[0-9]{8,14}$/.test(String(p.g || '')) ? String(p.g) : '', img: img || '', quantity: p.q || '',
                    cat: it.r.group === 'drinks' ? 'drink' : 'food', facts: { c: p.c, s: p.s == null ? 0 : p.s, f: p.f == null ? 0 : p.f, p: p.p == null ? 0 : p.p, fat: p.fat, drink: it.r.group === 'drinks' },
                    ingredients: '', verdict: 'ok', catalog: true, source: 'catalog:' + src, impact: it.r.impact });
            });
            if (!any) break;
        }
        return out;
    }
    const LI = { en: 0, de: 1, es: 2 };
    function text(k, lang) { const a = TX[k]; if (!a) return k; const i = LI[String(lang || 'en').slice(0, 2)]; return a[i == null ? 0 : i]; }
    return { verdictOf, fits, split, catalog, reasonOf, TX, text };
});
