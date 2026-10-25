/* LOWiSPIKE anchored swap (Oct 25 2026)
   Why: Emmanuel typed "honey almonds" in Scan and the Best swap was a breakfast board with eggs, turkey, cucumber and tomato.
   "Keep the scanner minimal: a simple verdict, and a directly relevant alternative only when it's needed." Honey almonds
   should point to plain almonds, ideally a real product the app already knows.
   How: take the sweet or coated part off the name (honey, candied, chocolate, glazed, sugared ... in EN / DE / ES) and rate
   what is left with the app's own food rules (the injected rate(name), the same one the name check uses). Only when that
   rest is an everyday choice (ok / JA) does it become the swap: "Plain almonds". A real product is named only when one
   that the app already holds (community scans) is itself ok, matches the rest and carries no sweet word; nothing is
   invented: no stock, no price. Pure: no DOM, node-tested (tests/scan-minimal.test.cjs). */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiScanSwap = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';
    // words that only add sugar or a coating (they never name the food itself)
    const SWEET = /^(honey|honig|miel|candied|kandiert[a-z]*|gebrannt[a-z]*|glazed|glasiert[a-z]*|caramel[a-z]*|karamell[a-z]*|caramelizad[a-z]*|garrapi[nñ]ad[a-z]*|chocolate|chocolates|choco|schoko|schokolade|schokoliert[a-z]*|chocolatead[a-z]*|covered|coated|überzogen[a-z]*|ueberzogen[a-z]*|cubiert[a-z]*|recubiert[a-z]*|sugared|sugar|zucker|gezuckert[a-z]*|azucarad[a-z]*|az[uú]car|sweet|sweetened|süß[a-z]*|suess[a-z]*|dulces?|roasted|ger[öo]stet[a-z]*|tostad[a-z]*|milk|vollmilch|zartbitter|dark|white|wei(ß|ss)[a-z]*|with|mit|con|and|und|y|in|en|de|-|&)$/i;
    // German compounds: Honigmandeln, Schokoerdnüsse, Zuckermandeln -> mandeln, erdnüsse
    const PREFIX = /^(honig|schoko|zucker|karamell|joghurt)(?=[a-zäöüß]{4,}$)/i;
    const LABEL = { en: 'Plain {x}', de: '{x}, natur', es: '{x} al natural' };
    const fold = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');
    const OK = v => v === 'ok' || v === 'JA';

    /* the part of the name that is the food itself, or '' when nothing was taken off */
    function base(name) {
        const raw = String(name || '').trim().replace(/[,;:()]/g, ' ');
        if (!raw) return '';
        let changed = false;
        const keep = [];
        for (let w of raw.split(/\s+/)) {
            if (!w) continue;
            if (SWEET.test(w)) { changed = true; continue; }
            const m = w.match(PREFIX);
            if (m) { w = w.slice(m[0].length); changed = true; }
            keep.push(w);
        }
        const rest = keep.join(' ').trim();
        return changed && rest.length >= 3 ? rest : '';
    }
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    function label(rest, l) {
        const t = LABEL[l] || LABEL.en;
        return t.indexOf('{x}') === 0 ? t.replace('{x}', cap(rest)) : t.replace('{x}', rest.toLowerCase());
    }
    /* a real product the app already holds: rated ok itself, its name holds the food, and no sweet or coating word */
    function product(rest, products) {
        const key = fold(rest).replace(/s$/, '');
        if (key.length < 3) return null;
        for (const p of products || []) {
            if (!p || !OK(p.verdict) || !p.name) continue;
            const n = fold(p.name);
            if (n.indexOf(key) < 0) continue;
            if (n.split(/[\s,;:()]+/).some(w => SWEET.test(w) && !/^(with|mit|con|and|und|y|in|en|de|-|&)$/.test(w)) || PREFIX.test(n.split(/\s+/).find(w => w.indexOf(key) >= 0) || '')) continue;
            return p;
        }
        return null;
    }
    /* the swap for a name that is not ok: { n: 'Plain almonds', base: 'almonds', prod } or null */
    function anchored(name, opts) {
        const o = opts || {};
        if (typeof o.rate !== 'function') return null;
        const rest = base(name);
        if (!rest) return null;
        let r = null;
        try { r = o.rate(rest); } catch (e) { r = null; }
        if (!r || !OK(r.verdict)) return null;
        return { n: label(rest, o.l || 'en'), base: rest, prod: product(rest, o.products) };
    }
    /* a swap section is only for a result that needs one */
    const needsSwap = v => v === 'spike' || v === 'better' || v === 'NEIN' || v === 'SELTEN';
    return { anchored, base, label, product, needsSwap, SWEET, PREFIX };
});
