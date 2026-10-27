/* kitchen-game.js — Cook > Kitchen (Oct 26 2026, MAYA-HANDOFF 0.19, HANDOFF-kitchen-pantry.md).
   Emmanuel: "almost like a kitchen wardrobe... I click on meat, it opens. I see all my meat" / "it should live in Cook... next to
   Shuffle and Swipe and make it a whole game interface". One fridge + one cabinet; every door opens its shelf. Things are added with
   the scanner's own product search (LowiDex.search: real names, pictures, verdicts) or the scanner itself (shop-scan.js "In my
   kitchen"). What ran out goes in the bin, and the bin puts it on the shopping list (the same list as Shop). Bought things come back
   in with their picture. Points: daily look, binning, a mostly lower-impact kitchen (all capped per day, kitchen-game-core.js).
   Data: lowispike.kitchen.v1 (kitchen-core.js, the same entries the old Shop > Kitchen tab had, nothing migrated away) and
   lowispike.kitchen.mem.v1 (the product data of binned things, so they come back with it). Never "Misty" in copy. */
(function () {
    'use strict';
    const W = window, D = document, K = W.LowiKitchenCore, G = W.LowiKitchenGameCore;
    if (!K || !G) return;
    const MEM = 'lowispike.kitchen.mem.v1';
    const li = () => { let l = ''; try { l = (W.LowiLang && LowiLang.get && LowiLang.get()) || D.documentElement.lang || 'en'; } catch (e) { l = 'en'; } return /^de/i.test(l) ? 1 : /^es/i.test(l) ? 2 : 0; };
    const T = (en, de, es) => [en, de, es][li()];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const rm = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const shelfApi = () => (W.LOWI_SHELF && W.LOWI_SHELF.listOpen && W.LOWI_SHELF.dropList ? W.LOWI_SHELF : null);
    const root = () => D.getElementById('kgRoot');
    const LVL = {
        ok: () => T('Insulin-friendly', 'Insulinfreundlich', 'Apto para la insulina'),
        better: () => T('Not insulin-friendly', 'Nicht insulinfreundlich', 'No apto para la insulina'),
        spike: () => T('Not insulin-friendly', 'Nicht insulinfreundlich', 'No apto para la insulina'),
        unknown: () => T('Not enough data', 'Zu wenig Daten', 'Datos insuficientes')
    };

    /* ---- state ---- */
    let kit = K.parse(null), open = '', q = '', hits = [], busy = false, seq = 0, note = null, noteT = 0, sel = '', closing = 0, pend = '', glow = '';
    function load() { let raw = null; try { raw = localStorage.getItem(K.KEY); } catch (e) {} kit = K.parse(raw); }
    function save(next) {
        kit = next; try { localStorage.setItem(K.KEY, JSON.stringify(kit)); } catch (e) {}
        try { W.dispatchEvent(new CustomEvent('lowi:kitchen', { detail: { count: K.count(kit) } })); } catch (e) {}
    }
    function memGet() { try { const m = JSON.parse(localStorage.getItem(MEM) || '{}'); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch (e) { return {}; } }
    function memPut(n, data) {
        const m = memGet(), k = G.norm(n); if (!k) return;
        if (data) m[k] = data; else delete m[k];
        const ks = Object.keys(m); if (ks.length > 150) ks.slice(0, ks.length - 150).forEach(x => delete m[x]);
        try { localStorage.setItem(MEM, JSON.stringify(m)); } catch (e) {}
    }
    const toBuy = () => { const sh = shelfApi(); try { return sh ? sh.listOpen(true) : []; } catch (e) { return []; } };
    const award = (kind, extra) => { const a = G.award(kind, Date.now(), extra); if (!a || !W.LowiHost || !LowiHost.award) return; try { LowiHost.award(a.src, null, { amt: a.amt, perDay: a.perDay, eventId: a.eventId, label: T('Kitchen', 'Küche', 'Cocina') }); } catch (e) {} };
    function earned(kind) {
        const a = G.award(kind, Date.now()); if (!a) return false;
        try { const l = W.LowiHost && LowiHost.ledger ? LowiHost.ledger() : null; if (Array.isArray(l)) return l.some(x => x && (x.eventId === a.eventId || (x.src === a.src && G.dayKey(x.t || x.at) === G.dayKey(Date.now())))); } catch (e) {}
        try { return localStorage.getItem('lowispike.kitchen.pts.' + kind) === G.dayKey(Date.now()); } catch (e) { return false; }
    }
    function give(kind, extra) {
        if (kind !== 'bin' && earned(kind)) return 0;
        award(kind, extra);
        if (kind !== 'bin') try { localStorage.setItem('lowispike.kitchen.pts.' + kind, G.dayKey(Date.now())); } catch (e) {}
        return G.POINTS[kind].amt;
    }
    function binsToday() { try { const v = JSON.parse(localStorage.getItem('lowispike.kitchen.pts.bin') || '{}'); return v.d === G.dayKey(Date.now()) ? v.n || 0 : 0; } catch (e) { return 0; } }
    function binCount() { const n = binsToday() + 1; try { localStorage.setItem('lowispike.kitchen.pts.bin', JSON.stringify({ d: G.dayKey(Date.now()), n })); } catch (e) {} return n; }

    /* ---- own photos: the person's food photos, tiny JPEG thumbnails on this device only, by item id ---- */
    const PH = 'lowispike.kitchen.photos.v1';
    function phAll() { try { const m = JSON.parse(localStorage.getItem(PH) || '{}'); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch (e) { return {}; } }
    function phPut(id, url) {
        const m = phAll(); if (url) m[id] = url; else delete m[id];
        const ids = new Set(kit.items.map(i => i.id)); Object.keys(m).forEach(k => { if (k !== id && !ids.has(k)) delete m[k]; });
        const ks = Object.keys(m); if (ks.length > 40) ks.slice(0, ks.length - 40).forEach(k => delete m[k]);
        try { localStorage.setItem(PH, JSON.stringify(m)); } catch (e) {}
    }
    const okPh = u => typeof u === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u) && u.length < 60000;

    /* ---- drawing ---- */
    let phm = {};
    const emo = i => G.emojiOf(i) || G.byId(G.shelfOf(i)).ic;
    const pic = (i, cls) => { const own = i.id && phm[i.id];
        return own && okPh(own) ? '<img class="' + cls + '" src="' + own + '" alt="" decoding="async">'
            : i.p && i.p.img ? '<img class="' + cls + '" src="' + esc(i.p.img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
            : '<span class="' + cls + ' kg-em" aria-hidden="true">' + emo(i) + '</span>'; };
    const dot = lv => '<i class="kg-dot kg-' + lv + '" aria-hidden="true"></i>';
    const labTxt = i => { const l = G.labelOf(i); return l ? LVL[G.levelOf(i)]() : ''; };
    const nItems = n => n + ' ' + T(n === 1 ? 'item' : 'items', n === 1 ? 'Sache' : 'Sachen', n === 1 ? 'cosa' : 'cosas');
    /* the Küchen-Check, small: one line, one thin green/red bar */
    function meter(items) {
        const h = G.health(items), c = h.counts, yes = c.ok || 0, no = (c.better || 0) + (c.spike || 0), bonus = G.healthy(items);
        const txt = !h.total ? T('Empty so far', 'Noch leer', 'Aún vacía') : !h.rated ? T('No labels yet', 'Noch ohne Label', 'Aún sin etiqueta')
            : T(yes + ' of ' + h.rated + ' insulin-friendly', yes + ' von ' + h.rated + ' insulinfreundlich', yes + ' de ' + h.rated + ' aptos para la insulina');
        return '<div class="kg-meter" role="group" aria-label="' + esc(T('Kitchen check', 'Küchen-Check', 'Revisión de cocina') + ': ' + txt) + '" title="' + esc(T('Scanner estimates, not medical advice.', 'Schätzung des Scanners, kein medizinischer Rat.', 'Estimación del escáner, no es consejo médico.')) + '">' +
            '<b>' + esc(T('Kitchen check', 'Küchen-Check', 'Revisión')) + '</b>' +
            '<span class="kg-m-bar" aria-hidden="true">' + (yes + no ? (yes ? '<i class="kg-m-yes" style="flex:' + yes + '"></i>' : '') + (no ? '<i class="kg-m-no" style="flex:' + no + '"></i>' : '') : '<i class="kg-m-empty" style="flex:1"></i>') + '</span>' +
            '<span class="kg-m-txt">' + esc(txt) + '</span>' + (bonus ? '<span class="kg-m-pts on">+10</span>' : '') + '</div>';
    }
    function addBar() {
        return '<form class="kg-add" data-kg-form role="search" autocomplete="off" onsubmit="return false">' +
            '<label class="kg-sr" for="kgQ">' + esc(T('Add to your kitchen', 'Zur Küche hinzufügen', 'Añadir a tu cocina')) + '</label>' +
            '<input id="kgQ" class="kg-q" name="kgq" type="search" enterkeyhint="done" maxlength="80" value="' + esc(q) + '" placeholder="' + esc(pend ? T('What is in the photo?', 'Was ist auf dem Foto?', '¿Qué hay en la foto?') : T('Add food, like skyr', 'Essen hinzufügen, z. B. Skyr', 'Añade comida, p. ej. skyr')) + '" aria-autocomplete="list" aria-controls="kgHits">' +
            '<label class="kg-scan kg-ph" aria-label="' + esc(T('Photo of your food', 'Foto von deinem Essen', 'Foto de tu comida')) + '"><input type="file" accept="image/*" capture="environment" data-kg-photo tabindex="-1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></label>' +
            '<button type="button" class="kg-scan" data-kg="scan" aria-label="' + esc(T('Scan a barcode into your kitchen', 'Barcode in die Küche scannen', 'Escanear un código a tu cocina')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>' +
            '<div id="kgHits" class="kg-hits" role="listbox" aria-label="' + esc(T('Products', 'Produkte', 'Productos')) + '">' + hitsHTML() + '</div></form>';
    }
    function hitsHTML() {
        if (!q.trim()) return '';
        const rows = hits.slice(0, 6).map((p, ix) => {
            const lv = p._lv || 'unknown';
            return '<button type="button" role="option" class="kg-hit" data-spend data-kg-hit="' + ix + '">' +
                (p.img ? '<img src="' + esc(p.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="kg-em" aria-hidden="true">' + (G.emojiOf({ n: p.name }) || G.byId(G.shelfOf({ n: p.name }, p.cat)).ic) + '</span>') +
                '<span class="kg-hit-t"><b>' + esc(p.name) + '</b><small>' + esc([p.brand, lv === 'unknown' ? '' : LVL[lv]()].filter(Boolean).join(' · ')) + '</small></span>' + (lv === 'unknown' ? '' : dot(lv)) + '</button>';
        }).join('');
        return rows + '<button type="button" role="option" class="kg-hit kg-hit-plain" data-spend data-kg-hit="typed"><span class="kg-em" aria-hidden="true">+</span><span class="kg-hit-t"><b>' +
            esc(T('Add “' + q.trim() + '”', '„' + q.trim() + '“ hinzufügen', 'Añadir «' + q.trim() + '»')) + '</b><small>' +
            esc(busy ? T('Looking in the product database…', 'Suche in der Produktdatenbank …', 'Buscando en la base de productos…') : T('Just the name, without product data', 'Nur der Name, ohne Produktdaten', 'Solo el nombre, sin datos del producto')) + '</small></span></button>';
    }
    const MAXT = 7;
    function tok(i, k) {
        const l = G.labelOf(i), t = labTxt(i);
        return '<button type="button" class="kg-tok' + (l ? ' kg-l-' + l : '') + (sel === i.id ? ' on' : '') + '" data-kg-tok="' + esc(i.id) + '" style="--d:' + (k * 30) + 'ms" aria-label="' + esc(i.n + (t ? ', ' + t : '')) + '"' + (sel === i.id ? ' aria-expanded="true"' : '') + '>' + pic(i, 'kg-tf') + '</button>';
    }
    function shelf(row) {
        const s = row.shelf, n = row.items.length, name = s.t[li()], more = n - MAXT;
        const shown = more > 0 ? row.items.slice(0, MAXT - 1) : row.items;
        return '<div class="kg-sh" data-kg-shelf="' + s.id + '">' +
            '<button type="button" class="kg-shl" data-kg-door="' + s.id + '" aria-label="' + esc(name + ', ' + nItems(n) + ', ' + T('open', 'öffnen', 'abrir')) + '"><span aria-hidden="true">' + s.ic + '</span>' + esc(name) + (n ? ' <small>' + n + '</small>' : '') + '</button>' +
            '<div class="kg-toks">' + (n ? shown.map(tok).join('') + (more > 0 ? '<button type="button" class="kg-tok kg-more" data-kg-door="' + s.id + '" aria-label="' + esc(T('Show all ', 'Alle zeigen: ', 'Ver todo: ') + name) + '">+' + (n - shown.length) + '</button>' : '')
                : '<span class="kg-sh0">' + esc(T('empty', 'leer', 'vacío')) + '</span>') + '</div></div>';
    }
    function qaHTML() {
        const i = sel && kit.items.find(x => x.id === sel); if (!i) return '';
        const s = G.byId(G.shelfOf(i)), l = G.labelOf(i), t = labTxt(i);
        return '<div class="kg-qa" role="dialog" aria-label="' + esc(i.n) + '" data-kg-qa>' +
            '<div class="kg-qh">' + pic(i, 'kg-qf') + '<span class="kg-ct"><b>' + esc(i.n) + '</b>' + (t ? '<small class="kg-lt kg-l-' + l + '">' + esc(t) + '</small>' : '<small>' + esc(s.t[li()]) + '</small>') + '</span>' +
            '<button type="button" class="kg-qx" data-kg="unsel" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '">×</button></div>' +
            '<div class="kg-qb"><button type="button" class="kg-binbtn" data-spend data-kg-bin="' + esc(i.id) + '">' + binSVG() + esc(T('Used up', 'Ist leer', 'Se acabó')) + '<small>' + esc(T('→ shopping list', '→ Einkaufsliste', '→ lista')) + '</small></button>' +
            '<label class="kg-move"><span class="kg-sr">' + esc(T('Shelf', 'Fach', 'Estante')) + '</span><select data-kg-move="' + esc(i.id) + '">' + G.SHELVES.map(x => '<option value="' + x.id + '"' + (x.id === s.id ? ' selected' : '') + '>' + x.ic + ' ' + esc(x.t[li()]) + '</option>').join('') + '</select></label>' +
            '<button type="button" class="kg-x" data-spend data-kg-del="' + esc(i.id) + '" aria-label="' + esc(T('Remove, added by mistake', 'Entfernen, aus Versehen', 'Quitar, fue un error')) + '">' + esc(T('Remove', 'Entfernen', 'Quitar')) + '</button></div></div>';
    }
    function weekInfo() { try { const o = JSON.parse(localStorage.getItem('lowispike.weekshop.v1') || '{}'); return !!(o && o.setup === true); } catch (e) { return false; } }
    function scene() {
        const rows = G.shelve(kit.items), buy = toBuy().filter(i => !i.done);
        const fr = rows.filter(r => r.shelf.where === 'fridge'), cb = rows.filter(r => r.shelf.where === 'cabinet');
        const cnt = list => list.reduce((a, r) => a + r.items.length, 0);
        const unit = (cls, id, name, list, extra) => '<section class="kg-unit ' + cls + '" aria-label="' + esc(name) + '">' +
            '<button type="button" class="kg-uh" data-kg-door="' + id + '" aria-label="' + esc(name + ', ' + nItems(cnt(list)) + ', ' + T('open', 'öffnen', 'abrir')) + '"><b>' + esc(name) + '</b><small>' + cnt(list) + '</small></button>' + (extra || '') +
            '<div class="kg-box">' + list.map(shelf).join('') + '</div><i class="kg-feet" aria-hidden="true"></i></section>';
        const noteB = '<button type="button" class="kg-note' + (glow === 'buy' ? ' kg-glow' : '') + '" data-kg-door="buy" aria-label="' + esc(T('Shopping list, ', 'Einkaufsliste, ', 'Lista de la compra, ') + buy.length) + '"><b>' + esc(T('To buy', 'Einkaufsliste', 'Por comprar')) + '</b><span>' + buy.length + '</span></button>';
        return '<div class="kg-scene">' +
            unit('kg-fridge-u', 'fridge', T('Fridge', 'Kühlschrank', 'Nevera'), fr, noteB) +
            unit('kg-cab-u', 'cabinet', T('Cabinet', 'Schrank', 'Armario'), cb) +
            '<div class="kg-side"><button type="button" class="kg-bin kg-bin-big" data-kg="bintap" data-kg-bintarget aria-label="' + esc(sel ? T('Bin it: used up, onto the shopping list', 'In den Müll: leer, auf die Einkaufsliste', 'Al cubo: se acabó, a la lista') : T('Bin. Drag something here when it ran out', 'Mülleimer. Zieh hierher, was leer ist', 'Cubo. Arrastra aquí lo que se acabó')) + '">' + binSVG() + '<span>' + esc(T('Bin', 'Müll', 'Cubo')) + '</span></button></div>' +
            qaHTML() + '</div>' +
            '<div class="kg-floor"><button type="button" class="kg-week" data-kg="week"><span aria-hidden="true">🗓️</span>' + esc(weekInfo() ? T('My week', 'Meine Woche', 'Mi semana') : T('Plan my week', 'Woche planen', 'Planear semana')) + '</button>' +
            '<p class="kg-binhint">' + esc(T('Tap food for options, or drag it to the bin when it ran out.', 'Tipp aufs Essen für Optionen oder zieh Leeres in den Müll.', 'Toca la comida para opciones o arrastra al cubo lo que se acabó.')) + '</p></div>';
    }
    const binSVG = () => '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="kg-lid" d="M4 6h16M9 6V4h6v2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 6l1 14h10l1-14M10 10v7M14 10v7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    function card(i) {
        const lv = G.levelOf(i), on = sel === i.id && !!open, s = G.byId(G.shelfOf(i)), lt = labTxt(i);
        return '<li class="kg-card' + (on ? ' on' : '') + '" data-kg-id="' + esc(i.id) + '">' +
            '<button type="button" class="kg-cb" data-kg-sel="' + esc(i.id) + '" aria-expanded="' + on + '">' + pic(i, 'kg-cp') +
            '<span class="kg-ct"><b>' + esc(i.n) + '</b><small>' + esc([i.p && i.p.br, lt && lt + (i.p && i.p.est ? ' ' + T('(estimate)', '(Schätzung)', '(estimación)') : '')].filter(Boolean).join(' · ')) + '</small></span>' + (lt ? dot(lv) : '') + '</button>' +
            (on ? '<div class="kg-acts"><button type="button" class="kg-binbtn" data-spend data-kg-bin="' + esc(i.id) + '">' + binSVG() + esc(T('Ran out: bin it', 'Leer: wegwerfen', 'Se acabó: al cubo')) + '</button>' +
                '<label class="kg-move"><span>' + esc(T('Shelf', 'Fach', 'Estante')) + '</span><select data-kg-move="' + esc(i.id) + '">' + G.SHELVES.map(x => '<option value="' + x.id + '"' + (x.id === s.id ? ' selected' : '') + '>' + x.ic + ' ' + esc(x.t[li()]) + '</option>').join('') + '</select></label>' +
                '<button type="button" class="kg-x" data-spend data-kg-del="' + esc(i.id) + '">' + esc(T('Remove, added by mistake', 'Entfernen, aus Versehen', 'Quitar, fue un error')) + '</button></div>' : '') + '</li>';
    }
    function shelfView() {
        if (open === 'buy') return buyView();
        if (open === 'fridge' || open === 'cabinet') return unitView(open);
        const s = G.byId(open), row = G.shelve(kit.items).find(r => r.shelf.id === open), items = row ? row.items : [];
        return '<div class="kg-open kg-' + s.where + '" role="region" aria-label="' + esc(s.t[li()]) + '">' +
            '<div class="kg-oh"><button type="button" class="kg-back" data-kg="close" aria-label="' + esc(T('Close the shelf', 'Fach schließen', 'Cerrar el estante')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
            '<h3 tabindex="-1">' + s.ic + ' ' + esc(s.t[li()]) + '</h3><span class="kg-oc">' + items.length + '</span></div>' +
            (items.length ? '<ul class="kg-cards">' + items.map(card).join('') + '</ul>' : '<p class="kg-none">' + esc(T('Nothing on this shelf yet. Add something above.', 'In diesem Fach ist noch nichts. Füg oben etwas hinzu.', 'Aún no hay nada en este estante. Añade algo arriba.')) + '</p>') +
            '<div class="kg-bin" data-kg-bintarget aria-hidden="true">' + binSVG() + '<span>' + esc(T('Drag here when it ran out', 'Hierher ziehen, wenn es leer ist', 'Arrastra aquí cuando se acabe')) + '</span></div></div>';
    }
    function unitView(where) {
        const rows = G.shelve(kit.items).filter(r => r.shelf.where === where), name = where === 'fridge' ? T('Fridge', 'Kühlschrank', 'Nevera') : T('Cabinet', 'Schrank', 'Armario');
        const n = rows.reduce((a, r) => a + r.items.length, 0);
        return '<div class="kg-open kg-' + where + '" role="region" aria-label="' + esc(name) + '">' +
            '<div class="kg-oh"><button type="button" class="kg-back" data-kg="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
            '<h3 tabindex="-1">' + esc(name) + '</h3><span class="kg-oc">' + n + '</span></div>' +
            rows.map(r => '<h4 class="kg-uh4"><span aria-hidden="true">' + r.shelf.ic + '</span> ' + esc(r.shelf.t[li()]) + ' <small>' + r.items.length + '</small></h4>' +
                (r.items.length ? '<ul class="kg-cards">' + r.items.map(card).join('') + '</ul>' : '<p class="kg-none kg-none-s">' + esc(T('empty', 'leer', 'vacío')) + '</p>')).join('') +
            '<p class="kg-sub kg-fine">' + esc(T('Labels are scanner estimates, not medical advice.', 'Labels sind Schätzungen des Scanners, kein medizinischer Rat.', 'Las etiquetas son estimaciones del escáner, no consejo médico.')) + '</p>' +
            '<div class="kg-bin" data-kg-bintarget aria-hidden="true">' + binSVG() + '<span>' + esc(T('Drag here when it ran out', 'Hierher ziehen, wenn es leer ist', 'Arrastra aquí cuando se acabe')) + '</span></div></div>';
    }
    function buyView() {
        const all = toBuy(), buy = all.filter(i => !i.done), got = all.filter(i => i.done), m = memGet();
        const row = (i, done) => { const d = m[G.norm(K.fromCartName ? K.fromCartName(i.n) : i.n)], it = { n: i.n, p: d && d.p, c: d && d.c };
            return '<li class="kg-card kg-buy' + (done ? ' done' : '') + '">' + '<span class="kg-cb">' + pic(it, 'kg-cp') + '<span class="kg-ct"><b>' + esc(i.n) + '</b>' + (i.store ? '<small>' + esc(i.store) + '</small>' : '') + '</span></span>' +
                '<button type="button" class="kg-got" data-spend data-kg-got="' + esc(i.id) + '" aria-label="' + esc(T('Bought, put in the kitchen: ', 'Gekauft, in die Küche: ', 'Comprado, a la cocina: ') + i.n) + '">' + esc(T('✓ Bought', '✓ Gekauft', '✓ Comprado')) + '</button>' +
                '<button type="button" class="kg-bx" data-spend data-kg-bdrop="' + esc(i.id) + '" aria-label="' + esc(T('Take off the list: ', 'Von der Liste nehmen: ', 'Quitar de la lista: ') + i.n) + '">×</button></li>'; };
        return '<div class="kg-open kg-buyv" role="region" aria-label="' + esc(T('Shopping list', 'Einkaufsliste', 'Lista de la compra')) + '">' +
            '<div class="kg-oh"><button type="button" class="kg-back" data-kg="close" aria-label="' + esc(T('Close the list', 'Liste schließen', 'Cerrar la lista')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
            '<h3 tabindex="-1">' + esc(T('To buy', 'Einkaufsliste', 'Por comprar')) + '</h3><span class="kg-oc">' + buy.length + '</span></div>' +
            '<p class="kg-sub">' + esc(T('The same list as your shopping list in Shop. Tap Bought and it moves into your kitchen.', 'Dieselbe Liste wie deine Einkaufsliste im Shop. Tipp auf Gekauft, dann kommt es in deine Küche.', 'La misma lista que tu lista de la compra en Shop. Toca Comprado y pasa a tu cocina.')) + '</p>' +
            (buy.length ? '<ul class="kg-cards">' + buy.map(i => row(i, false)).join('') + '</ul>' : '<p class="kg-none">' + esc(T('Nothing to buy. Things you bin show up here.', 'Nichts zu kaufen. Was du wegwirfst, steht dann hier.', 'Nada que comprar. Lo que eches al cubo aparece aquí.')) + '</p>') +
            (got.length ? '<div class="kg-gotall"><small>' + esc(T(got.length + ' ticked off in the shop', got.length + ' im Laden abgehakt', got.length + ' marcados en la tienda')) + '</small><button type="button" class="kg-got" data-kg="gotall">' + esc(T('Put them in the kitchen', 'In die Küche räumen', 'Guardar en la cocina')) + '</button></div>' : '') + '</div>';
    }
    function noteHTML() {
        if (!note) return '<div class="kg-toast" role="status" aria-live="polite"></div>';
        return '<div class="kg-toast on" role="status" aria-live="polite"><span>' + esc(note.t) + '' /* points show in the app's own points toast (LowiHost.award) */ + '</span>' + (note.undo ? '<button type="button" data-kg="undo">' + esc(T('Undo', 'Rückgängig', 'Deshacer')) + '</button>' : '') + '</div>';
    }
    function html() {
        load(); phm = phAll();
        return '<div class="kg-wrap' + (open ? ' is-open' : '') + '" data-noi18n>' + meter(kit.items) + addBar() + (open ? shelfView() : scene()) + noteHTML() + '</div>';
    }

    /* ---- painting ---- */
    function paint(focus) {
        const r = root(); if (!r) return;
        const ae = D.activeElement, inQ = ae && ae.id === 'kgQ', pos = inQ ? ae.selectionStart : 0;
        r.innerHTML = html();
        if (inQ || focus === 'q') { const i = D.getElementById('kgQ'); if (i) { try { i.focus({ preventScroll: true }); i.setSelectionRange(pos || q.length, pos || q.length); } catch (e) {} } }
        else if (focus === 'head') { const h = r.querySelector('.kg-open h3'); if (h) try { h.focus({ preventScroll: true }); } catch (e) {} }
        else if (focus && focus.door) { const d = r.querySelector('[data-kg-door="' + focus.door + '"]'); if (d) try { d.focus({ preventScroll: true }); } catch (e) {} }
        if (sel && !open) placeQA(focus === 'qa');
    }
    const cssq = v => (W.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/["\\]/g, '\\$&'));
    function placeQA(focusIt) {
        const r = root(), qa = r && r.querySelector('.kg-qa'), sc = r && r.querySelector('.kg-scene'); if (!qa || !sc) return;
        const t = r.querySelector('[data-kg-tok="' + cssq(sel) + '"]'), a = sc.getBoundingClientRect();
        const w = qa.offsetWidth, h = qa.offsetHeight;
        if (t) {
            const b = t.getBoundingClientRect(), cx = b.left - a.left + b.width / 2;
            const left = Math.max(4, Math.min(a.width - w - 4, cx - w / 2));
            let top = b.bottom - a.top + 8;
            if (top + h > a.height + 60 && b.top - a.top - h - 8 > 0) { top = b.top - a.top - h - 8; qa.classList.add('up'); }
            qa.style.left = Math.round(left) + 'px'; qa.style.top = Math.round(top) + 'px'; qa.style.setProperty('--ax', Math.round(cx - left) + 'px');
        } else { qa.style.left = Math.max(4, Math.round((a.width - w) / 2)) + 'px'; qa.style.top = '40px'; }
        qa.classList.add('on');
        if (focusIt) { const f = qa.querySelector('.kg-binbtn'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }
        try { const qb = qa.getBoundingClientRect(), vh = W.innerHeight || 800; if (qb.bottom > vh - 90) W.scrollBy({ top: qb.bottom - vh + 110, behavior: rm() ? 'auto' : 'smooth' }); } catch (e) {}
    }
    function paintHits() { const h = D.getElementById('kgHits'); if (h) h.innerHTML = hitsHTML(); }
    function say(t, opt) {
        note = Object.assign({ t }, opt || {}); clearTimeout(noteT);
        const r = root(), el = r && r.querySelector('.kg-toast'); if (el) el.outerHTML = noteHTML();
        noteT = setTimeout(() => { note = null; const e = root() && root().querySelector('.kg-toast'); if (e) e.outerHTML = noteHTML(); }, opt && opt.undo ? 6000 : 3200);
    }
    /* first look of the day (with something in the kitchen) and the healthy-kitchen bonus */
    function daily() {
        if (!G.canLook(kit.items)) return;
        const a = give('look'), b = G.healthy(kit.items) ? give('healthy') : 0;
        if (a || b) say(b ? T('Healthy kitchen! Points for today', 'Gesunde Küche! Punkte für heute', '¡Cocina sana! Puntos de hoy') : T('You checked your kitchen today', 'Du hast heute in deine Küche geschaut', 'Hoy has mirado tu cocina'), { pts: a + b });
    }

    /* ---- open in place: the shelf / fridge / cabinet / list zooms out of the spot you tapped ---- */
    function openShelf(id, btn) {
        if (closing) return;
        const b = btn && btn.getBoundingClientRect ? btn.getBoundingClientRect() : null;
        open = id; sel = ''; if (id === 'buy') glow = '';
        paint('head');
        const o = root() && root().querySelector('.kg-open');
        if (o && !rm()) {
            if (b) { const oc = o.getBoundingClientRect(); o.style.transformOrigin = Math.round(b.left + b.width / 2 - oc.left) + 'px ' + Math.round(b.top + b.height / 2 - oc.top) + 'px'; }
            o.classList.add('kg-in'); setTimeout(() => o.classList.remove('kg-in'), 360);
        }
        try { const o2 = root().querySelector('.kg-open'), top = o2.getBoundingClientRect().top; if (top < 0 || top > (W.innerHeight || 800) * 0.6) o2.scrollIntoView({ block: 'start', behavior: rm() ? 'auto' : 'smooth' }); } catch (e) {}
    }
    function closeShelf() {
        if (closing) return;
        const was = open; open = ''; sel = '';
        closing = 1; const r = root(); if (r) r.classList.add('kg-lock');
        paint({ door: was });
        setTimeout(() => { closing = 0; const x = root(); if (x) x.classList.remove('kg-lock'); }, 280);
    }

    /* ---- adding ---- */
    function levelOf(p) { try { const C = W.LowiShopScanCore; if (C && C.level) return C.level(p.verdict, p.cat); } catch (e) {} return ({ ok: 'ok', meh: 'better', better: 'better', spike: 'spike', bad: 'spike' })[p.verdict] || 'unknown'; }
    function search(v) {
        q = v; const my = ++seq;
        if (!q.trim()) { hits = []; busy = false; paintHits(); return; }
        busy = true; paintHits();
        clearTimeout(search.t);
        search.t = setTimeout(() => {
            const S = W.LowiDex && LowiDex.search;
            if (!S) { busy = false; hits = []; paintHits(); return; }
            Promise.resolve(S(q.trim())).then(list => {
                if (my !== seq) return;
                hits = (Array.isArray(list) ? list : []).filter(p => p && p.name).slice(0, 6).map(p => Object.assign({}, p, { _lv: levelOf(p) }));
                busy = false; paintHits();
            }).catch(() => { if (my === seq) { busy = false; hits = []; paintHits(); } });
        }, 280);
    }
    function addOne(x, how) {
        load();
        const mem = memGet()[G.norm(x.n)];
        if (mem && !x.img && !x.bc && !x.v) { if (mem.p) Object.assign(x, mem.p); if (mem.c && !x.c) x.c = mem.c; }
        if (!x.c && x.pcat) x.c = G.shelfOf({ n: x.n }, x.pcat);
        const before = kit, r = K.addProduct(kit, x, Date.now(), how === 'cart' ? 'cart' : 'me');
        if (!r.id) return null;
        save(r.state);
        const it = kit.items.find(i => i.id === r.id) || { n: x.n }, sh = G.byId(G.shelfOf(it));
        return { had: r.had, it, shelf: sh, undo: () => { save(before); paint(); } };
    }
    function pick(ix) {
        let x;
        if (ix === 'typed') {
            const n = q.trim().slice(0, 60); if (!n) return;
            x = { n };
            try { const est = W.LowiDex && LowiDex.rateName ? LowiDex.rateName(n) : null; if (est && est.verdict) { x.v = levelOf(est); x.est = true; } } catch (e) {}
        } else { const p = hits[Number(ix)]; if (!p) return; x = G.fromProduct(p, p._lv); }
        const r = addOne(x, 'me'); if (!r) return;
        if (pend) { phPut(r.it.id, pend); pend = ''; }
        q = ''; hits = []; seq++;
        paint();
        say(r.had ? T('Already in your kitchen: ', 'Schon in deiner Küche: ', 'Ya está en tu cocina: ') + r.it.n : T('Added to ', 'Neu im Fach ', 'A\u00f1adido a ') + r.shelf.t[li()] + ': ' + r.it.n, r.had ? null : { undo: r.undo });
        if (!r.had) { pop(r.it.id, r.shelf.id); daily(); }
    }
    function pop(id, shelfId) {
        if (rm()) return; const r = root(); if (!r) return;
        const el = r.querySelector('[data-kg-tok="' + cssq(id) + '"]') || r.querySelector('[data-kg-shelf="' + shelfId + '"]') || r.querySelector('[data-kg-door="' + shelfId + '"]');
        if (el) { el.classList.add('kg-pop'); setTimeout(() => el.classList.remove('kg-pop'), 700); }
    }
    /* ---- photo: your own picture of the food; the food AI names it, else you type the name and the photo goes with it ---- */
    function shrink(file, px) {
        return new Promise((res, rej) => {
            const url = URL.createObjectURL(file), im = new Image();
            im.onload = () => { try { const c = D.createElement('canvas'), m = Math.min(im.naturalWidth, im.naturalHeight); c.width = c.height = px;
                c.getContext('2d').drawImage(im, (im.naturalWidth - m) / 2, (im.naturalHeight - m) / 2, m, m, 0, 0, px, px); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.72)); } catch (e) { URL.revokeObjectURL(url); rej(e); } };
            im.onerror = e => { URL.revokeObjectURL(url); rej(e); }; im.src = url;
        });
    }
    async function photo(file) {
        if (!file) return;
        let th = ''; try { th = await shrink(file, 128); } catch (e) {}
        if (!okPh(th)) { say(T('That photo did not open. Try another one.', 'Das Foto ging nicht auf. Versuch ein anderes.', 'Esa foto no se abrió. Prueba otra.')); return; }
        say(T('Looking at your photo…', 'Ich schau mir dein Foto an …', 'Mirando tu foto…'));
        let names = [];
        try { const A = W.LowiFoodAI; if (A && A.prep && A.analyse) { const big = await A.prep(null, file); const out = await A.analyse(big, { lang: ['en', 'de', 'es'][li()] });
            if (out && out.isFood !== false) names = (out.dishes || out.items || []).map(d => d && String(d.name || d.n || '').trim()).filter(Boolean).slice(0, 3); } } catch (e) { names = []; }
        if (!names.length) { pend = th; paint('q'); say(T('Type what it is. Your photo goes with it.', 'Schreib, was es ist. Dein Foto kommt mit rein.', 'Escribe qué es. Tu foto va con ello.')); return; }
        const got = [];
        names.forEach(n => { const r = addOne({ n: n.slice(0, 60) }, 'me'); if (r) { if (!phm[r.it.id] || !r.had) phPut(r.it.id, th); got.push(r); } });
        paint();
        if (got.length) { say(T('In your kitchen: ', 'In deiner Küche: ', 'En tu cocina: ') + got.map(r => r.it.n).join(', ')); pop(got[0].it.id, got[0].shelf.id); daily(); }
    }
    function openWeek() {
        const P = W.LowiStorePicks;
        if (P && P.open) { try { if (P.setTab) P.setTab('home'); P.open('kitchen'); return; } catch (e) {} }
        say(T('The week planner is in Shop, under At home.', 'Den Wochenplan findest du im Shop unter Zu Hause.', 'El plan semanal está en Shop, en Casa.'));
    }
    /* shop-scan.js "In my kitchen": cur = {name, barcode, img, level, brand, cat} */
    function addScanned(cur) {
        if (!cur || !cur.name) return null;
        const r = addOne({ n: String(cur.name).slice(0, 60), bc: cur.barcode, img: cur.img, br: cur.brand, v: cur.level, pcat: cur.cat }, 'me');
        if (!r) return null;
        if (root()) paint();
        return { n: r.it.n, had: r.had, shelf: r.shelf.t[li()], undo: r.undo };
    }

    /* ---- bin: out of the kitchen, onto the shopping list ---- */
    function bin(id, el) {
        load();
        const it = kit.items.find(i => i.id === id); if (!it) return;
        const sh = shelfApi(), before = kit, r = K.drop(kit, id), ph0 = phAll()[id];
        if (!r.gone) return;
        const finish = () => {
            save(r.state); memPut(it.n, { c: it.c || G.shelfOf(it), p: it.p || null });
            let listed = 0, added = 0; const n = it.n.slice(0, 60);
            const already = toBuy().some(x => !x.done && G.norm(K.fromCartName ? K.fromCartName(x.n) : x.n) === G.norm(n));
            if (sh && !already) { try { added = sh.addIngredients([{ n, barcode: it.p && it.p.bc }], '') || 0; } catch (e) { added = 0; } }
            listed = already || added;
            const pts = binsToday() < G.POINTS.bin.perDay ? (binCount(), give('bin', n), G.POINTS.bin.amt) : 0;
            sel = ''; paint();
            const bt = root() && root().querySelector('.kg-bin'); if (bt && !rm()) { bt.classList.add('kg-gulp'); setTimeout(() => bt.classList.remove('kg-gulp'), 600); }
            say(listed ? T('On your shopping list: ', 'Auf deiner Einkaufsliste: ', 'En tu lista de la compra: ') + n : T('Out of your kitchen: ', 'Aus deiner Küche: ', 'Fuera de tu cocina: ') + n, {
                pts, undo: () => {
                    save(before); if (ph0) phPut(id, ph0);
                    if (added && sh) { try { const l = toBuy().filter(x => !x.done && G.norm(x.n).indexOf(G.norm(n)) === 0).pop(); if (l) sh.dropList(l.id); } catch (e) {} }
                    paint();
                }
            });
        };
        const c = (el && el.closest('.kg-card')) || (!open && root() && root().querySelector('[data-kg-tok="' + cssq(id) + '"]')), b = root() && root().querySelector('.kg-bin');
        const qa = root() && root().querySelector('.kg-qa'); if (qa) qa.classList.remove('on');
        phPut(id, null);
        if (c && b && !rm()) {
            const a = c.getBoundingClientRect(), z = b.getBoundingClientRect();
            c.style.transition = 'transform .32s cubic-bezier(.5,0,.75,0), opacity .32s';
            c.style.transform = 'translate(' + Math.round(z.left + z.width / 2 - a.left - a.width / 2) + 'px,' + Math.round(z.top + z.height / 2 - a.top - a.height / 2) + 'px) scale(.15)';
            c.style.opacity = '0.2'; c.style.pointerEvents = 'none'; b.classList.add('kg-hot');
            setTimeout(finish, 330);
        } else finish();
    }
    function bought(ids) {
        const sh = shelfApi(); if (!sh) return;
        const all = toBuy(), got = [];
        ids.forEach(id => {
            const i = all.find(x => x.id === id); if (!i) return;
            const n = K.fromCartName ? K.fromCartName(i.n) : i.n;
            const r = addOne({ n }, 'cart'); try { sh.dropList(i.id); } catch (e) {}
            if (r) { memPut(n, null); got.push(r.it.n); }
        });
        paint();
        if (got.length) say(T('In your kitchen now: ', 'Jetzt in deiner Küche: ', 'Ya en tu cocina: ') + got.join(', '));
    }

    /* ---- drag a card onto the bin (long press, then drag; a plain tap still opens it) ---- */
    let drag = null;
    function lift(dr) {
        dr.on = true; dr.li.classList.add('kg-drag'); try { navigator.vibrate && navigator.vibrate(8); } catch (x) {}
        if (dr.tok) { const b = dr.li.getBoundingClientRect(), g = dr.li.cloneNode(true); g.className = 'kg-tok kg-ghost'; g.removeAttribute('data-kg-tok'); g.setAttribute('aria-hidden', 'true');
            g.style.left = b.left + 'px'; g.style.top = b.top + 'px'; g.style.width = b.width + 'px'; g.style.height = b.height + 'px'; D.body.appendChild(g); dr.g = g; dr.bx = b.left; dr.by = b.top;
            const r = root(); if (r) r.classList.add('kg-dragging'); }
    }
    D.addEventListener('pointerdown', e => {
        if (!e.target.closest || e.button > 0) return;
        const tk = e.target.closest('#kgRoot .kg-scene [data-kg-tok]');
        const c = tk || e.target.closest('#kgRoot .kg-open:not(.kg-buyv) .kg-card .kg-cb'); if (!c) return;
        const li0 = tk || c.closest('.kg-card');
        drag = { id: tk ? tk.getAttribute('data-kg-tok') : li0.getAttribute('data-kg-id'), li: li0, tok: !!tk, mouse: e.pointerType === 'mouse', x: e.clientX, y: e.clientY, on: false,
            t: setTimeout(() => { if (drag && !drag.on) lift(drag); }, tk ? 230 : 280) };
    }, true);
    D.addEventListener('touchmove', e => { if (drag && drag.on) e.preventDefault(); }, { passive: false });
    D.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('#kgRoot [data-kg-tok]')) e.preventDefault(); });
    D.addEventListener('pointermove', e => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.on) { if (Math.abs(dx) + Math.abs(dy) > (drag.mouse ? 5 : 10)) { if (drag.mouse && drag.tok) { clearTimeout(drag.t); lift(drag); } else { clearTimeout(drag.t); drag = null; return; } } else return; }
        e.preventDefault();
        if (drag.g) drag.g.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.35)';
        else drag.li.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.92)';
        const b = root() && root().querySelector('.kg-bin'); if (!b) return;
        const z = b.getBoundingClientRect(), over = e.clientX >= z.left - 16 && e.clientX <= z.right + 16 && e.clientY >= z.top - 24 && e.clientY <= z.bottom + 16;
        b.classList.toggle('kg-hot', over); drag.over = over;
    }, { passive: false });
    const endDrag = e => {
        if (!drag) return;
        clearTimeout(drag.t);
        const d = drag; drag = null;
        if (!d.on) return;
        d.li.classList.remove('kg-drag'); if (d.g) d.g.remove(); const rr = root(); if (rr) rr.classList.remove('kg-dragging');
        const b = root() && root().querySelector('.kg-bin'); if (b) b.classList.remove('kg-hot');
        d.dragged = true; drag_block = Date.now();
        if (d.over && e.type === 'pointerup') { d.li.style.transform += ''; bin(d.id, null); }
        else if (!d.tok) { d.li.style.transition = 'transform .2s'; d.li.style.transform = ''; }
    };
    let drag_block = 0;
    D.addEventListener('pointerup', endDrag, true);
    D.addEventListener('pointercancel', endDrag, true);

    /* ---- events ---- */
    D.addEventListener('click', e => {
        const r = root(); if (!r || !r.contains(e.target)) return;
        if (Date.now() - drag_block < 350) { e.preventDefault(); return; }
        if (closing) { e.preventDefault(); e.stopPropagation(); return; }
        const t = e.target;
        const tk = t.closest('[data-kg-tok]');
        if (tk) { const id = tk.getAttribute('data-kg-tok'); sel = sel === id ? '' : id; paint(sel ? 'qa' : null); if (!sel) { const n = r.querySelector('[data-kg-tok="' + cssq(id) + '"]'); if (n) try { n.focus({ preventScroll: true }); } catch (x) {} } return; }
        const bt = t.closest('[data-kg="bintap"]');
        if (bt) { if (sel && !open) bin(sel, null); else say(T('Drag food here when it ran out. Or tap the food first.', 'Zieh Essen hierher, wenn es leer ist. Oder tipp es zuerst an.', 'Arrastra aquí la comida que se acabó. O tócala primero.')); return; }
        if (sel && !open && !t.closest('[data-kg-qa]')) { sel = ''; paint(); if (!t.closest('[data-kg-door],[data-kg-shelf],[data-kg],[data-kg-hit]')) return; }
        const d = t.closest('[data-kg-door]'); if (d) { openShelf(d.getAttribute('data-kg-door'), d); return; }
        const shf = !open && t.closest('[data-kg-shelf]'); if (shf) { openShelf(shf.getAttribute('data-kg-shelf'), shf); return; }
        const h = t.closest('[data-kg-hit]'); if (h) { pick(h.getAttribute('data-kg-hit')); return; }
        const s = t.closest('[data-kg-sel]'); if (s) { const id = s.getAttribute('data-kg-sel'); sel = sel === id ? '' : id; paint(); const n = r.querySelector('[data-kg-sel="' + id + '"]'); if (n) try { n.focus({ preventScroll: true }); } catch (x) {} return; }
        const b = t.closest('[data-kg-bin]'); if (b) { bin(b.getAttribute('data-kg-bin'), b); return; }
        const x = t.closest('[data-kg-del]'); if (x) { load(); const before = kit, rr = K.drop(kit, x.getAttribute('data-kg-del')); if (rr.gone) { save(rr.state); sel = ''; paint(); say(T('Removed: ', 'Entfernt: ', 'Quitado: ') + rr.gone.n, { undo: () => { save(before); paint(); } }); } return; }
        const g = t.closest('[data-kg-got]'); if (g) { bought([g.getAttribute('data-kg-got')]); return; }
        const bd = t.closest('[data-kg-bdrop]'); if (bd) { const sh = shelfApi(), it = toBuy().find(i => i.id === bd.getAttribute('data-kg-bdrop')); if (sh && it) { try { sh.dropList(it.id); } catch (y) {} paint(); say(T('Taken off the list: ', 'Von der Liste genommen: ', 'Quitado de la lista: ') + it.n); } return; }
        const a = t.closest('[data-kg]'); if (!a) return;
        const k = a.getAttribute('data-kg');
        if (k === 'close') closeShelf();
        else if (k === 'gotall') bought(toBuy().filter(i => i.done).map(i => i.id));
        else if (k === 'undo') { const u = note && note.undo; note = null; if (u) u(); else paint(); }
        else if (k === 'scan') scan();
        else if (k === 'unsel') { const id = sel; sel = ''; paint(); const n = r.querySelector('[data-kg-tok="' + cssq(id) + '"]'); if (n) try { n.focus({ preventScroll: true }); } catch (y) {} }
        else if (k === 'week') openWeek();
    });
    D.addEventListener('input', e => { if (e.target && e.target.id === 'kgQ') search(e.target.value || ''); });
    D.addEventListener('change', e => { const f = e.target && e.target.matches && e.target.matches('#kgRoot [data-kg-photo]') ? e.target : null; if (f) { const file = f.files && f.files[0]; f.value = ''; photo(file); return; }
        const m = e.target && e.target.closest && e.target.closest('[data-kg-move]'); if (!m) return; load(); const id = m.getAttribute('data-kg-move'); save(K.setShelf(kit, id, m.value)); const it = kit.items.find(i => i.id === id); sel = ''; paint(); if (it) say(T('Moved to ', 'Verschoben nach ', 'Movido a ') + G.byId(m.value).t[li()] + ': ' + it.n); });
    D.addEventListener('keydown', e => {
        const r = root(); if (!r || !r.contains(e.target)) return;
        if (e.key === 'Enter' && e.target.id === 'kgQ') { e.preventDefault(); if (q.trim()) pick(hits.length ? '0' : 'typed'); }
        else if (e.key === 'Escape') { if (q) { q = ''; hits = []; seq++; paint('q'); } else if (sel && !open) { e.preventDefault(); const id = sel; sel = ''; paint(); const n = r.querySelector('[data-kg-tok="' + cssq(id) + '"]'); if (n) try { n.focus({ preventScroll: true }); } catch (y) {} } else if (open) { e.preventDefault(); closeShelf(); } }
    });
    let intent = 0;
    function scan() {
        intent = Date.now();
        try { if (W.LowiDex && LowiDex.scan) { LowiDex.scan('shop'); return; } } catch (e) {}
        try { if (typeof W.openScanner === 'function') W.openScanner('shop'); } catch (e) {}
    }

    /* ---- Cook hooks (index.html ckView / fHomeHTML / mounted) ---- */
    function show() {
        const r = root(); if (!r) return;
        paint(); daily();
    }
    function openKitchen(shelfId, opt) {
        if (opt && opt.from === 'week') { glow = 'buy'; open = ''; sel = ''; setTimeout(() => { if (root()) { const n = toBuy().filter(i => !i.done).length; say(T('Your kitchen. ' + n + ' things on the list on the fridge.', 'Deine Küche. ' + n + ' Sachen auf dem Zettel am Kühlschrank.', 'Tu cocina. ' + n + ' cosas en la nota de la nevera.')); } }, 420); setTimeout(() => { glow = ''; const e = root() && root().querySelector('.kg-note.kg-glow'); if (e) e.classList.remove('kg-glow'); }, 6000); }
        try { if (W.LowiFood && LowiFood.setView) LowiFood.setView('kitchen'); } catch (e) {}
        try { if (typeof W.goTab === 'function') W.goTab('shelf'); } catch (e) {}
        setTimeout(() => { try { if (W.LowiFood && LowiFood.setView) LowiFood.setView('kitchen'); } catch (e) {} if (shelfId && (G.byId(shelfId) || shelfId === 'buy' || shelfId === 'fridge' || shelfId === 'cabinet')) { open = shelfId; paint('head'); } else show(); }, 60);
    }
    W.addEventListener('storage', e => { if ((e.key === K.KEY || e.key === PH) && root()) paint(); });
    W.addEventListener('resize', () => { if (sel && !open && root()) placeQA(false); });
    W.LowiKitchenGame = Object.freeze({
        html, show, paint, open: openKitchen, addScanned,
        intent: () => Date.now() - intent < 10 * 60 * 1000,
        clearIntent: () => { intent = 0; },
        state: () => ({ open, items: kit.items.length, q, hits: hits.length })
    });
})();
