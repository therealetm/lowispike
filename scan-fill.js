/* Scan liquid (item 32 amendment, 20 Oct 2026, Emmanuel: we give scan also liquid. So every time someone scans something ... the
   liquid fills up). Only a scan that found a product counts: index.html found() calls record(code) after byBarcode() returned a
   product. A closed scanner (cancel), a code no database knows (notFound), a failed lookup (offline, error) and the shopping-list
   scan never reach record(), so they never fill. The same product twice in one day fills once.
   Scale: the app already counts product scans per day with 5 as its ceiling (index.html found(): LowiVitalsBridge.complete
   ("vitamin", "scan:" + code, {perDay: 5, label: "Product scanned"})), so each different product fills a fifth and five fill the
   bubble. That is only how full the liquid looks: no quota is shown, no reward, no XP. It starts empty each day, like Water and Move.
   Kept on this phone only (localStorage lowi.scan.fill.v1, the last 14 days). */
(function (root) {
    'use strict';
    const KEY = 'lowi.scan.fill.v1', FULL = 5, KEEP_DAYS = 14;
    const dayKey = d => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const norm = c => String(c == null ? '' : c).replace(/\D/g, '').replace(/^0+(?=\d{8,})/, '');
    /* pure: store {days: {'YYYY-MM-DD': ['code', ...]}} -> {store, added} (never mutates its input) */
    function add(store, code, day) {
        const c = norm(code), days = Object.assign({}, store && store.days);
        if (!c || !day) return { store: { days }, added: false };
        const list = (days[day] || []).slice();
        if (list.indexOf(c) >= 0) return { store: { days }, added: false };
        list.push(c); days[day] = list;
        Object.keys(days).sort().reverse().slice(KEEP_DAYS).forEach(k => { delete days[k]; });
        return { store: { days }, added: true };
    }
    const count = (store, day) => ((store && store.days && store.days[day]) || []).length;
    const frac = n => Math.max(0, Math.min(1, (+n || 0) / FULL));
    const core = { KEY, FULL, KEEP_DAYS, dayKey, norm, add, count, frac };
    if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }
    if (!root) return;
    function load() { try { const s = JSON.parse(root.localStorage.getItem(KEY) || '{}'); return s && typeof s === 'object' ? s : {}; } catch (e) { return {}; } }
    function record(code) {
        const r = add(load(), code, dayKey());
        if (!r.added) return false;
        try { root.localStorage.setItem(KEY, JSON.stringify(r.store)); } catch (e) { return false; }
        const n = count(r.store, dayKey());
        try { root.document.dispatchEvent(new CustomEvent('lowi:scan-fill', { detail: { count: n, frac: frac(n) } })); } catch (e) { }
        return true;
    }
    const today = () => count(load(), dayKey());
    root.LowiScanFill = Object.assign({}, core, { record, today, level: () => frac(today()) });
})(typeof window !== 'undefined' ? window : null);
