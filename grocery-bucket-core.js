/* LOWiSPIKE · grocery bucket, step 1 (queue grocery-1, Oct 23 2026).
   Seven (Maya 7 handover, 22 Oct): while grocery shopping there was nowhere to keep scanned products. "After a scan: Add to
   bucket or Skip ... Save it per day." This file is the pure part (no DOM): today's bucket per local day in localStorage
   (lowi.bucket.v1 = {days: {"YYYY-MM-DD": [{k, code, name, brand, img, verdict, ts}]}}), words in en/de/es.
   Price, shop and points come in grocery-2 (no invented prices: nothing here stores or shows a price). */
(function (root) {
    'use strict';
    const KEY = 'lowi.bucket.v1', KEEP_DAYS = 14, MAX_ITEMS = 200;
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
        v_unknown: ['Not sure', 'Unklar', 'No seguro']
    };
    function langIndex(l) { l = String(l || '').toLowerCase(); return l.indexOf('de') === 0 ? 1 : l.indexOf('es') === 0 ? 2 : 0; }
    function tx(k, i, n) { const r = TX[k] || [k]; let s = r[i] || r[0]; if (n != null) s = s.replace('{n}', String(n)); return s; }
    function dayKey(t) { const d = new Date(t == null ? Date.now() : t); const p = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
    function keyOf(p) { p = p || {}; const c = String(p.barcode || p.code || '').replace(/\D/g, ''); if (c) return 'bc:' + c; const n = String(p.name || '').trim().toLowerCase(); return n ? 'nm:' + n + '|' + String(p.brand || '').trim().toLowerCase() : ''; }
    function clean(s) { const d = s && typeof s === 'object' && s.days && typeof s.days === 'object' ? s.days : {}; const out = {}; Object.keys(d).forEach(k => { if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Array.isArray(d[k])) out[k] = d[k].filter(x => x && x.k).slice(0, MAX_ITEMS); }); return { days: out }; }
    function prune(s, now) { const keep = Object.keys(s.days).sort().reverse().slice(0, KEEP_DAYS); const cut = dayKey((now == null ? Date.now() : now) - KEEP_DAYS * 864e5); const out = {}; keep.forEach(k => { if (k > cut) out[k] = s.days[k]; }); return { days: out }; }
    function item(p, now) { p = p || {}; const v = { spike: 1, better: 1, ok: 1 }[p.verdict] ? p.verdict : 'unknown'; const img = String(p.img || ''); return { k: keyOf(p), code: String(p.barcode || p.code || ''), name: String(p.name || '').trim().slice(0, 120), brand: String(p.brand || '').trim().slice(0, 80), img: /^https:\/\//.test(img) ? img.slice(0, 500) : '', verdict: v, ts: now == null ? Date.now() : now }; }
    /* pure state ops: each returns a new state */
    function add(s, p, now) { s = clean(s); const it = item(p, now); if (!it.k) return s; const d = dayKey(it.ts); const list = (s.days[d] || []).filter(x => x.k !== it.k); list.push(it); s.days[d] = list.slice(-MAX_ITEMS); return prune(s, now); }
    function remove(s, k, day) { s = clean(s); const d = day || dayKey(); if (s.days[d]) s.days[d] = s.days[d].filter(x => x.k !== k); return s; }
    function today(s, now) { s = clean(s); return (s.days[dayKey(now)] || []).slice(); }
    function has(s, p, now) { const k = keyOf(p); return !!k && today(s, now).some(x => x.k === k); }
    function load(store) { try { return clean(JSON.parse((store || root.localStorage).getItem(KEY) || '{}')); } catch (e) { return { days: {} }; } }
    function save(s, store) { try { (store || root.localStorage).setItem(KEY, JSON.stringify(clean(s))); return true; } catch (e) { return false; } }
    const api = { KEY, KEEP_DAYS, TX, langIndex, tx, dayKey, keyOf, add, remove, today, has, load, save, item };
    root.LowiBucketCore = api;
    if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
