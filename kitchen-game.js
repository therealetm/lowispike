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
        ok: () => T('Lower impact', 'Geringere Wirkung', 'Menor impacto'),
        better: () => T('Moderate impact', 'Mittlere Wirkung', 'Impacto moderado'),
        spike: () => T('Higher impact', 'Stärkere Wirkung', 'Mayor impacto'),
        unknown: () => T('Not enough data', 'Zu wenig Daten', 'Datos insuficientes')
    };

    /* ---- state ---- */
    let kit = K.parse(null), open = '', q = '', hits = [], busy = false, seq = 0, note = null, noteT = 0, sel = '', closing = 0;
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

    /* ---- drawing ---- */
    const pic = (i, cls) => (i.p && i.p.img ? '<img class="' + cls + '" src="' + esc(i.p.img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
        : '<span class="' + cls + ' kg-em" aria-hidden="true">' + G.byId(G.shelfOf(i)).ic + '</span>');
    const dot = lv => '<i class="kg-dot kg-' + lv + '" aria-hidden="true"></i>';
    function meter(items) {
        const h = G.health(items), c = h.counts, tot = h.total || 1;
        const seg = k => (c[k] ? '<i class="kg-m-' + k + '" style="flex:' + c[k] + '"></i>' : '');
        const txt = !h.total ? T('Add what you have. Your kitchen shows how healthy it is.', 'Trag ein, was du hast. Deine Küche zeigt, wie gesund sie ist.', 'Añade lo que tienes. Tu cocina te muestra lo sana que está.')
            : !h.rated ? T('No verdicts yet. Add products from the search or the scanner.', 'Noch keine Bewertung. Füg Produkte über die Suche oder den Scanner hinzu.', 'Aún sin valoración. Añade productos con la búsqueda o el escáner.')
            : T(c.ok + ' of ' + h.rated + ' lower impact', c.ok + ' von ' + h.rated + ' mit geringerer Wirkung', c.ok + ' de ' + h.rated + ' de menor impacto');
        const bonus = G.healthy(items);
        return '<div class="kg-meter" role="group" aria-label="' + esc(T('Kitchen health', 'Küchen-Check', 'Salud de tu cocina')) + '">' +
            '<div class="kg-m-top"><b>' + esc(T('Kitchen health', 'Küchen-Check', 'Salud de tu cocina')) + '</b><span class="kg-m-pts' + (bonus ? ' on' : '') + '">' +
            esc(bonus ? T('Healthy kitchen +10', 'Gesunde Küche +10', 'Cocina sana +10') : T('Mostly lower impact: +10 a day', 'Meist geringere Wirkung: +10 am Tag', 'Sobre todo menor impacto: +10 al día')) + '</span></div>' +
            '<div class="kg-m-bar" aria-hidden="true">' + (h.total ? seg('ok') + seg('better') + seg('spike') + seg('unknown') : '<i class="kg-m-empty" style="flex:1"></i>') + '</div>' +
            '<p class="kg-m-txt">' + esc(txt) + (h.rated ? ' <small>' + esc(T('Scanner estimates, not medical advice.', 'Schätzung des Scanners, kein medizinischer Rat.', 'Estimación del escáner, no es consejo médico.')) + '</small>' : '') + '</p></div>';
    }
    function addBar() {
        return '<form class="kg-add" data-kg-form role="search" autocomplete="off" onsubmit="return false">' +
            '<label class="kg-sr" for="kgQ">' + esc(T('Add to your kitchen', 'Zur Küche hinzufügen', 'Añadir a tu cocina')) + '</label>' +
            '<input id="kgQ" class="kg-q" name="kgq" type="search" enterkeyhint="done" maxlength="80" value="' + esc(q) + '" placeholder="' + esc(T('Add food or a product, like skyr', 'Lebensmittel oder Produkt, z. B. Skyr', 'Alimento o producto, p. ej. skyr')) + '" aria-autocomplete="list" aria-controls="kgHits">' +
            '<button type="button" class="kg-scan" data-kg="scan" aria-label="' + esc(T('Scan a barcode into your kitchen', 'Barcode in die Küche scannen', 'Escanear un código a tu cocina')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>' +
            '<div id="kgHits" class="kg-hits" role="listbox" aria-label="' + esc(T('Products', 'Produkte', 'Productos')) + '">' + hitsHTML() + '</div></form>';
    }
    function hitsHTML() {
        if (!q.trim()) return '';
        const rows = hits.slice(0, 6).map((p, ix) => {
            const lv = p._lv || 'unknown';
            return '<button type="button" role="option" class="kg-hit" data-spend data-kg-hit="' + ix + '">' +
                (p.img ? '<img src="' + esc(p.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="kg-em" aria-hidden="true">' + G.byId(G.shelfOf({ n: p.name }, p.cat)).ic + '</span>') +
                '<span class="kg-hit-t"><b>' + esc(p.name) + '</b><small>' + esc([p.brand, LVL[lv]()].filter(Boolean).join(' · ')) + '</small></span>' + dot(lv) + '</button>';
        }).join('');
        return rows + '<button type="button" role="option" class="kg-hit kg-hit-plain" data-spend data-kg-hit="typed"><span class="kg-em" aria-hidden="true">+</span><span class="kg-hit-t"><b>' +
            esc(T('Add “' + q.trim() + '”', '„' + q.trim() + '“ hinzufügen', 'Añadir «' + q.trim() + '»')) + '</b><small>' +
            esc(busy ? T('Looking in the product database…', 'Suche in der Produktdatenbank …', 'Buscando en la base de productos…') : T('Just the name, without product data', 'Nur der Name, ohne Produktdaten', 'Solo el nombre, sin datos del producto')) + '</small></span></button>';
    }
    function door(row, list) {
        const s = row.shelf, n = row.items.length, peek = row.items.slice(0, 3);
        const name = s.t[li()];
        return '<button type="button" class="kg-door kg-' + s.where + '" data-kg-door="' + s.id + '" aria-label="' + esc(name + ', ' + n + ' ' + T(n === 1 ? 'item' : 'items', n === 1 ? 'Sache' : 'Sachen', n === 1 ? 'cosa' : 'cosas')) + '">' +
            '<span class="kg-leaf" aria-hidden="true"></span><span class="kg-ic" aria-hidden="true">' + s.ic + '</span><span class="kg-dl"><b>' + esc(name) + '</b><small>' + (n ? n : esc(T('empty', 'leer', 'vacío'))) + '</small></span>' +
            '<span class="kg-peek" aria-hidden="true">' + peek.map(i => pic(i, 'kg-pk')).join('') + '</span>' +
            (row.items.some(i => G.levelOf(i) === 'spike') ? '<i class="kg-warn" aria-hidden="true"></i>' : '') + '</button>';
    }
    function scene() {
        const rows = G.shelve(kit.items), buy = toBuy().filter(i => !i.done);
        const fr = rows.filter(r => r.shelf.where === 'fridge'), cb = rows.filter(r => r.shelf.where === 'cabinet');
        return '<div class="kg-scene">' +
            '<section class="kg-unit kg-fridge-u" aria-label="' + esc(T('Fridge', 'Kühlschrank', 'Nevera')) + '"><h3 class="kg-uh">' + esc(T('Fridge', 'Kühlschrank', 'Nevera')) + '</h3>' +
            '<button type="button" class="kg-note" data-kg-door="buy" aria-label="' + esc(T('Shopping list, ', 'Einkaufsliste, ', 'Lista de la compra, ') + buy.length) + '"><b>' + esc(T('To buy', 'Einkaufsliste', 'Por comprar')) + '</b><span>' + buy.length + '</span></button>' +
            fr.map(r => door(r)).join('') + '</section>' +
            '<section class="kg-unit kg-cab-u" aria-label="' + esc(T('Cabinet', 'Schrank', 'Armario')) + '"><h3 class="kg-uh">' + esc(T('Cabinet', 'Schrank', 'Armario')) + '</h3>' +
            cb.map(r => door(r)).join('') + '</section></div>' +
            '<p class="kg-binhint"><span class="kg-bin-s" aria-hidden="true">' + binSVG() + '</span>' + esc(T('Ran out of something? Open its shelf and put it in the bin. It goes on your shopping list.', 'Etwas ist leer? Öffne sein Fach und wirf es in den Mülleimer. Dann steht es auf deiner Einkaufsliste.', '¿Se te acabó algo? Abre su estante y échalo al cubo. Pasa a tu lista de la compra.')) + '</p>';
    }
    const binSVG = () => '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="kg-lid" d="M4 6h16M9 6V4h6v2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 6l1 14h10l1-14M10 10v7M14 10v7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    function card(i) {
        const lv = G.levelOf(i), on = sel === i.id, s = G.byId(G.shelfOf(i));
        return '<li class="kg-card' + (on ? ' on' : '') + '" data-kg-id="' + esc(i.id) + '">' +
            '<button type="button" class="kg-cb" data-kg-sel="' + esc(i.id) + '" aria-expanded="' + on + '">' + pic(i, 'kg-cp') +
            '<span class="kg-ct"><b>' + esc(i.n) + '</b><small>' + esc([i.p && i.p.br, LVL[lv]() + (i.p && i.p.est ? ' ' + T('(estimate)', '(Schätzung)', '(estimación)') : '')].filter(Boolean).join(' · ')) + '</small></span>' + dot(lv) + '</button>' +
            (on ? '<div class="kg-acts"><button type="button" class="kg-binbtn" data-spend data-kg-bin="' + esc(i.id) + '">' + binSVG() + esc(T('Ran out: bin it', 'Leer: wegwerfen', 'Se acabó: al cubo')) + '</button>' +
                '<label class="kg-move"><span>' + esc(T('Shelf', 'Fach', 'Estante')) + '</span><select data-kg-move="' + esc(i.id) + '">' + G.SHELVES.map(x => '<option value="' + x.id + '"' + (x.id === s.id ? ' selected' : '') + '>' + x.ic + ' ' + esc(x.t[li()]) + '</option>').join('') + '</select></label>' +
                '<button type="button" class="kg-x" data-spend data-kg-del="' + esc(i.id) + '">' + esc(T('Remove, added by mistake', 'Entfernen, aus Versehen', 'Quitar, fue un error')) + '</button></div>' : '') + '</li>';
    }
    function shelfView() {
        if (open === 'buy') return buyView();
        const s = G.byId(open), row = G.shelve(kit.items).find(r => r.shelf.id === open), items = row ? row.items : [];
        return '<div class="kg-open kg-' + s.where + '" role="region" aria-label="' + esc(s.t[li()]) + '">' +
            '<div class="kg-oh"><button type="button" class="kg-back" data-kg="close" aria-label="' + esc(T('Close the shelf', 'Fach schließen', 'Cerrar el estante')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
            '<h3 tabindex="-1">' + s.ic + ' ' + esc(s.t[li()]) + '</h3><span class="kg-oc">' + items.length + '</span></div>' +
            (items.length ? '<ul class="kg-cards">' + items.map(card).join('') + '</ul>' : '<p class="kg-none">' + esc(T('Nothing on this shelf yet. Add something above.', 'In diesem Fach ist noch nichts. Füg oben etwas hinzu.', 'Aún no hay nada en este estante. Añade algo arriba.')) + '</p>') +
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
        load();
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

    /* ---- door animation: the door leaf swings open, then the shelf grows out of it ---- */
    function openShelf(id, btn) {
        if (closing) return;
        const go = () => { open = id; sel = ''; paint('head'); const o = root() && root().querySelector('.kg-open'); if (o && !rm()) { o.classList.add('kg-in'); setTimeout(() => o.classList.remove('kg-in'), 320); } };
        if (btn && !rm()) { btn.classList.add('kg-swing'); closing = 1; root().classList.add('kg-lock'); setTimeout(() => { closing = 0; const r = root(); if (r) r.classList.remove('kg-lock'); go(); }, 260); }
        else go();
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
        q = ''; hits = []; seq++;
        paint();
        say(r.had ? T('Already in your kitchen: ', 'Schon in deiner Küche: ', 'Ya está en tu cocina: ') + r.it.n : T('Added to ', 'Neu im Fach ', 'A\u00f1adido a ') + r.shelf.t[li()] + ': ' + r.it.n, r.had ? null : { undo: r.undo });
        if (!r.had) { const d = root() && root().querySelector('[data-kg-door="' + r.shelf.id + '"]'); if (d && !rm()) { d.classList.add('kg-pop'); setTimeout(() => d.classList.remove('kg-pop'), 700); } daily(); }
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
        const sh = shelfApi(), before = kit, r = K.drop(kit, id);
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
                    save(before);
                    if (added && sh) { try { const l = toBuy().filter(x => !x.done && G.norm(x.n).indexOf(G.norm(n)) === 0).pop(); if (l) sh.dropList(l.id); } catch (e) {} }
                    paint();
                }
            });
        };
        const c = el && el.closest('.kg-card'), b = root() && root().querySelector('.kg-bin');
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
    D.addEventListener('pointerdown', e => {
        const c = e.target.closest && e.target.closest('#kgRoot .kg-open:not(.kg-buyv) .kg-card .kg-cb'); if (!c || e.button > 0) return;
        const li0 = c.closest('.kg-card');
        drag = { id: li0.getAttribute('data-kg-id'), li: li0, x: e.clientX, y: e.clientY, on: false, t: setTimeout(() => { if (drag) { drag.on = true; li0.classList.add('kg-drag'); try { navigator.vibrate && navigator.vibrate(8); } catch (x) {} } }, 280) };
    }, true);
    D.addEventListener('pointermove', e => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.on) { if (Math.abs(dx) + Math.abs(dy) > 10) { clearTimeout(drag.t); drag = null; } return; }
        e.preventDefault();
        drag.li.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.92)';
        const b = root() && root().querySelector('.kg-bin'); if (!b) return;
        const z = b.getBoundingClientRect(), over = e.clientX >= z.left - 16 && e.clientX <= z.right + 16 && e.clientY >= z.top - 24 && e.clientY <= z.bottom + 16;
        b.classList.toggle('kg-hot', over); drag.over = over;
    }, { passive: false });
    const endDrag = e => {
        if (!drag) return;
        clearTimeout(drag.t);
        const d = drag; drag = null;
        if (!d.on) return;
        d.li.classList.remove('kg-drag');
        const b = root() && root().querySelector('.kg-bin'); if (b) b.classList.remove('kg-hot');
        d.dragged = true; drag_block = Date.now();
        if (d.over && e.type === 'pointerup') { d.li.style.transform += ''; bin(d.id, null); }
        else { d.li.style.transition = 'transform .2s'; d.li.style.transform = ''; }
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
        const d = t.closest('[data-kg-door]'); if (d) { openShelf(d.getAttribute('data-kg-door'), d); return; }
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
    });
    D.addEventListener('input', e => { if (e.target && e.target.id === 'kgQ') search(e.target.value || ''); });
    D.addEventListener('change', e => { const m = e.target && e.target.closest && e.target.closest('[data-kg-move]'); if (!m) return; load(); const id = m.getAttribute('data-kg-move'); save(K.setShelf(kit, id, m.value)); const it = kit.items.find(i => i.id === id); sel = ''; paint(); if (it) say(T('Moved to ', 'Verschoben nach ', 'Movido a ') + G.byId(m.value).t[li()] + ': ' + it.n); });
    D.addEventListener('keydown', e => {
        const r = root(); if (!r || !r.contains(e.target)) return;
        if (e.key === 'Enter' && e.target.id === 'kgQ') { e.preventDefault(); if (q.trim()) pick(hits.length ? '0' : 'typed'); }
        else if (e.key === 'Escape') { if (q) { q = ''; hits = []; seq++; paint('q'); } else if (open) { e.preventDefault(); closeShelf(); } }
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
    function openKitchen(shelfId) {
        try { if (W.LowiFood && LowiFood.setView) LowiFood.setView('kitchen'); } catch (e) {}
        try { if (typeof W.goTab === 'function') W.goTab('shelf'); } catch (e) {}
        setTimeout(() => { try { if (W.LowiFood && LowiFood.setView) LowiFood.setView('kitchen'); } catch (e) {} if (shelfId && (G.byId(shelfId) || shelfId === 'buy')) { open = shelfId; paint('head'); } else show(); }, 60);
    }
    W.addEventListener('storage', e => { if (e.key === K.KEY && root()) paint(); });
    W.LowiKitchenGame = Object.freeze({
        html, show, paint, open: openKitchen, addScanned,
        intent: () => Date.now() - intent < 10 * 60 * 1000,
        clearIntent: () => { intent = 0; },
        state: () => ({ open, items: kit.items.length, q, hits: hits.length })
    });
})();
