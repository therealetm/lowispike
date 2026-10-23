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
   picked and nothing typed = no price. Words in en/de/es. */
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
        reported: ['reported {d}', 'gemeldet {d}', 'reportado {d}']
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
        return { days: out, shops };
    }
    function prune(s, now) {
        const keep = Object.keys(s.days).sort().reverse().slice(0, KEEP_DAYS); const cut = dayKey((now == null ? Date.now() : now) - KEEP_DAYS * 864e5); const out = {}, shops = {};
        keep.forEach(k => { if (k > cut) out[k] = s.days[k]; });
        Object.keys(s.shops || {}).forEach(k => { if (k > cut) shops[k] = s.shops[k]; });
        return { days: out, shops };
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
    function fmtPrice(a, li) { const v = Number(a).toFixed(2); return li ? v.replace('.', ',') + ' €' : '€' + v; }
    function load(store) { try { return clean(JSON.parse((store || root.localStorage).getItem(KEY) || '{}')); } catch (e) { return { days: {}, shops: {} }; } }
    function save(s, store) { try { (store || root.localStorage).setItem(KEY, JSON.stringify(clean(s))); return true; } catch (e) { return false; } }
    const api = { KEY, KEEP_DAYS, TX, langIndex, tx, dayKey, keyOf, add, remove, today, has, load, save, item, parsePrice, setPrice, setShop, shopOf, shopsFrom, priceFor, totals, fmtPrice, validReports };
    root.LowiBucketCore = api;
    if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
