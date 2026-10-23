/* Oct 17, 2026 (E-man, in the shop: "a little emergency button ... see all the snacks that I can buy in the shop, all the meat ...
   all the bread" and "even before entering the shop, be able to see every product that I can buy if I only eat insulin-friendly food").
   The "What can I buy here?" button and its Move-style panel. Logic and the formula live in store-picks-core.js; product ranges in
   data/shop/<range>.json; built by tools/shop-data/build.py. Shops near the person come live from OpenStreetMap (store-picks-core.js lookup), no keys on the phone.
   Oct 21, 2026 (Eman: "Does it make sense to also have it in there again? If not, remove it."): one entry point only, the Shop orb
   in Home's Fuel bubble (home-blooms-v2.js). The old card under Cook it / Shop it, in the shopping list, cart and Meals sheets is gone. */
(function (W, D) {
    'use strict';
    if (!W || !D || W.LowiStorePicks) return;
    const C = W.LowiStorePicksCore;
    if (!C) return;
    const KEY = 'lowi.storePicks.v1';
    const BUILD = (D.querySelector('meta[name="lowi-build"]') || {}).content || '';
    const li = () => { const l = (D.documentElement.lang || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const T = (en, de, es) => [en, de, es][li()];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const fmt = n => { try { return Number(n).toLocaleString(['en-GB', 'de-DE', 'es-ES'][li()]); } catch (e) { return String(n); } };
    const dec = n => { const s = (Math.round(n * 10) / 10).toFixed(n >= 10 ? 0 : 1).replace(/\.0$/, ''); return li() ? s.replace('.', ',') : s; };

    /* the ranges the app knows; the Salling file covers Føtex, Bilka and Danish Netto */
    const RANGES = [
        { id: 'salling', label: 'Føtex · Bilka · Netto DK', brands: ['Føtex', 'Bilka', 'Netto (DK)'] },
        { id: 'edeka', label: 'EDEKA', brands: ['EDEKA'] }, { id: 'rewe', label: 'REWE', brands: ['REWE'] },
        { id: 'lidl', label: 'Lidl', brands: ['Lidl'] }, { id: 'aldi', label: 'Aldi Nord', brands: ['Aldi Nord'] },
        { id: 'kaufland', label: 'Kaufland', brands: ['Kaufland'] }, { id: 'netto', label: 'Netto Marken-Discount', brands: ['Netto', 'Netto Marken-Discount'] },
        { id: 'penny', label: 'Penny', brands: ['Penny'] }, { id: 'famila', label: 'famila', brands: ['famila'] }
    ];
    const RANGE = {}; RANGES.forEach(r => { RANGE[r.id] = r; });

    const label = id => id === 'general' ? T('All supermarkets', 'Alle Supermärkte', 'Todos los supermercados') : (RANGE[id] ? RANGE[id].label : id);
    let S = {};
    try { S = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { S = {}; }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
    /* Oct 22, 2026: a shop saved from the old bundled list (one region only) is dropped; the chain choice stays. Only shops found
       around the person themselves (ids "osm:...") are remembered, by name and address, never by position. */
    if (S && S.store && !/^osm:/.test(String(S.store.id || ''))) { delete S.store; save(); }
    if (S && S.range && S.range !== 'general' && !RANGE[S.range]) { S = {}; save(); }
    const cache = {};
    /* the product list for a range; 'general' = REWE and EDEKA together (C.merge) */
    function loadRange(id) {
        if (id === 'general') return Promise.all(C.GENERAL.map(load)).then(C.merge);
        return load(id);
    }
    function load(file) {
        if (cache[file]) return cache[file];
        cache[file] = fetch('data/shop/' + file + '.json?v=' + encodeURIComponent(BUILD)).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
            .catch(e => { delete cache[file]; throw e; });
        return cache[file];
    }

    /* where / place / near live in memory only while the panel is open: never saved, never sent to our server */
    let where = null, place = null, placeMine = false, near = null, busy = false, finder = null;
    const look = () => finder || (finder = C.lookup((u, o) => fetch(u, o)));
    let ov = null, view = 'list', data = null, built = null, q = '', showFail = false, open = {};
    const ic = {
        x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
        pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9.5" r="2.5" fill="currentColor"/></svg>',
        cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2.5l2.2 10.5h10.6L21 7H7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="19" r="1.6" fill="currentColor"/><circle cx="17" cy="19" r="1.6" fill="currentColor"/></svg>'
    };

    function storeLine() {
        if (!S.range) return '';
        if (S.store) return [S.store.name || S.store.brand, S.store.addr || S.store.town || '', S.store.km != null ? dec(S.store.km) + ' km' : ''].filter(Boolean).join(' · ');
        return label(S.range);
    }

    /* ---------------- Snacks to buy (Oct 19, own key; logged Snacks from Log meal are offered under "Again?") ---------------- */
    const SKEY = 'lowi.snackBuy.v1';
    let snacks = [];
    try { snacks = JSON.parse(localStorage.getItem(SKEY) || '[]') || []; } catch (e) { snacks = []; }
    if (!Array.isArray(snacks)) snacks = [];
    function saveSnacks(next) { snacks = next; try { localStorage.setItem(SKEY, JSON.stringify(snacks)); } catch (e) {} }
    function loggedSnacks() {
        try { const st = W.LowiVitalsBridge && W.LowiVitalsBridge.state && W.LowiVitalsBridge.state(); return ((st && st.logs) || []).filter(l => l && l.slot === 'snack').slice().reverse().map(l => l.t || l.n); } catch (e) { return []; }
    }
    function snackHTML() {
        const v = C.snackView(snacks, loggedSnacks());
        const rows = v.buy.map(i => '<li class="stp-snack"><button type="button" class="stp-snack-tick" data-stp-snack-got="' + esc(i.id) + '" aria-label="' + esc(T('Bought ', 'Gekauft: ', 'Comprado: ') + i.n) + '"><span aria-hidden="true"></span></button><b>' + esc(i.n) + '</b>' +
            '<button type="button" class="stp-snack-x" data-stp-snack-drop="' + esc(i.id) + '" aria-label="' + esc(T('Remove ', 'Entfernen: ', 'Quitar: ') + i.n) + '">' + ic.x + '</button></li>').join('');
        const again = v.again.length ? '<div class="stp-snack-again"><small>' + esc(T('Again?', 'Wieder?', '¿Otra vez?')) + '</small>' + v.again.map(n => '<button type="button" class="stp-chip" data-stp-snack-again="' + esc(n) + '">+ ' + esc(n) + '</button>').join('') + '</div>' : '';
        return '<section class="stp-snacks" aria-label="' + esc(T('Snacks to buy', 'Snacks zum Einkaufen', 'Snacks para comprar')) + '"><h4 class="stp-h4">\u{1F95C} ' + esc(T('Snacks to buy', 'Snacks zum Einkaufen', 'Snacks para comprar')) + (v.buy.length ? ' <i>' + v.buy.length + '</i>' : '') + '</h4>' +
            (rows ? '<ul class="stp-snack-list">' + rows + '</ul>' : '<p class="stp-snack-none">' + esc(T('Only snacks you still need to buy. Tick one when it’s in your bag.', 'Nur Snacks, die du noch kaufen willst. Hak sie ab, wenn sie in der Tasche sind.', 'Solo los snacks que aún vas a comprar. Márcalos cuando estén en tu bolsa.')) + '</p>') +
            '<form class="stp-snack-add" data-stp-snack-form="1"><input type="text" name="snack" maxlength="60" autocomplete="off" enterkeyhint="done" placeholder="' + esc(T('Add a snack, like bell pepper', 'Snack hinzufügen, z. B. Paprika', 'Añade un snack, p. ej. pimiento')) + '" aria-label="' + esc(T('Add a snack to buy', 'Snack zum Einkaufen hinzufügen', 'Añadir snack para comprar')) + '"><button type="submit" class="stp-pill">' + esc(T('Add', 'Hinzufügen', 'Añadir')) + '</button></form>' + again + '</section>';
    }
    function repaintSnacks() {
        const el = ov && ov.querySelector('.stp-snacks');
        if (!el) return;
        const w = D.createElement('div'); w.innerHTML = snackHTML();
        el.replaceWith(w.firstChild);
    }
    function onSubmit(e) {
        const f = e.target;
        if (f && f.getAttribute && f.getAttribute('data-stp-where')) {
            e.preventDefault();
            const i = f.querySelector('input[name="where"]'); if (i) try { i.blur(); } catch (x) {}
            findPlace(i ? i.value : '');
            return;
        }
        if (!f || !f.getAttribute || !f.getAttribute('data-stp-snack-form')) return;
        e.preventDefault();
        const inp = f.querySelector('input[name="snack"]'), v = inp ? inp.value : '';
        if (!String(v).trim()) return;
        saveSnacks(C.snackAdd(snacks, v));
        repaintSnacks();
        const ni = ov && ov.querySelector('.stp-snack-add input'); if (ni) ni.focus();
    }
    function snackClick(t) {
        const b = t.closest('[data-stp-snack-got],[data-stp-snack-drop],[data-stp-snack-again],[data-stp-snack-qv]');
        if (!b) return false;
        if (b.hasAttribute('data-stp-snack-got')) saveSnacks(C.snackGot(snacks, b.getAttribute('data-stp-snack-got')));
        else if (b.hasAttribute('data-stp-snack-drop')) saveSnacks(C.snackDrop(snacks, b.getAttribute('data-stp-snack-drop')));
        else if (b.hasAttribute('data-stp-snack-again')) saveSnacks(C.snackAdd(snacks, b.getAttribute('data-stp-snack-again')));
        else { saveSnacks(C.snackAdd(snacks, b.getAttribute('data-stp-snack-qv'))); b.disabled = true; b.textContent = T('✓ On your snack list', '✓ Auf deiner Snackliste', '✓ En tu lista de snacks'); }
        repaintSnacks();
        return true;
    }

    function shell(inner) {
        return '<div class="stp-card" role="dialog" aria-modal="true" aria-label="' + esc(T('What can I buy here?', 'Was kann ich hier kaufen?', '¿Qué puedo comprar aquí?')) + '">' + inner + '</div>';
    }
    /* Oct 19 food paths (E-man: Shop "so complicated and so hidden"): Shop is the one place for shopping. Two plain ways on from
       here: scan products in the shop (the shopping camera: check and add to your list, it never logs a meal) and your shopping list. */
    function shopActs() {
        const scan = W.LowiShopScan && W.LowiShopScan.open, list = typeof W.tdShopOpen === 'function';
        if (!scan && !list) return '';
        return '<div class="stp-foot-acts">' +
            (scan ? '<button type="button" class="stp-go stp-scanshop" data-stp="scanshop">' + ic.cart + '<span>' + esc(T('Scan in the shop', 'Im Laden scannen', 'Escanear en la tienda')) + '</span></button>' : '') +
            (list ? '<button type="button" class="stp-pill stp-mylist" data-stp="mylist"><span>' + esc(T('Shopping list', 'Einkaufsliste', 'Lista de compra')) + '</span></button>' : '') + '</div>';
    }
    function footBtns(left) {
        return '<div class="stp-foot">' + (left || '<span></span>') + '<button type="button" class="stp-orb stp-close" data-stp="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '">' + ic.x + '</button></div>';
    }

    /* ---------------- choose a shop ---------------- */
    /* Oct 22, 2026 (Emmanuel: "when they click on share my location, they should see their address and the nearest grocery
       shopping options, and then they can click on that. And then based on that, it shows them the products that are in the
       store"). Share my location -> your own address -> the supermarkets nearest to you, from OpenStreetMap -> tap one -> its
       products. Location off or not wanted: type a town or postcode, or skip to the general lists. There is no fixed place. */
    const dist = k => k == null ? '' : k < 1 ? (Math.max(10, Math.round(k * 100) * 10)) + ' m' : dec(k) + ' km';
    function whereForm() {
        return '<form class="stp-where" data-stp-where="1" role="search"><input type="search" name="where" class="stp-wq" maxlength="80" autocomplete="off" enterkeyhint="search" placeholder="' +
            esc(T('Town or postcode', 'Ort oder Postleitzahl', 'Ciudad o código postal')) + '" aria-label="' + esc(T('Find shops in a town or postcode', 'Läden in einem Ort oder einer Postleitzahl suchen', 'Buscar tiendas en una ciudad o código postal')) + '">' +
            '<button type="submit" class="stp-pill"' + (busy ? ' disabled' : '') + '>' + esc(T('Search', 'Suchen', 'Buscar')) + '</button></form>';
    }
    function hereHTML() {
        if (!place || !place.line) return '';
        return '<p class="stp-here">' + ic.pin + '<span><small>' + esc(placeMine ? T('Your location', 'Dein Standort', 'Tu ubicación') : T('Shops around', 'Läden rund um', 'Tiendas en torno a')) + '</small><b>' + esc(place.line) + '</b></span></p>';
    }
    function shopRowsHTML() {
        if (!near) return '';
        if (!near.length) return '<p class="stp-msg">' + esc(T('No supermarkets on the map near here. Try a town or postcode, or see the general lists.', 'Keine Supermärkte auf der Karte in der Nähe. Versuch einen Ort oder eine Postleitzahl oder sieh dir die allgemeinen Listen an.', 'No hay supermercados en el mapa cerca. Prueba una ciudad o código postal, o mira las listas generales.')) + '</p>';
        return '<h4 class="stp-h4">' + esc(T('Supermarkets near you', 'Supermärkte in deiner Nähe', 'Supermercados cerca de ti')) + '</h4><div class="stp-rows">' +
            near.map(s => '<button type="button" class="stp-row stp-store" data-stp-store="' + esc(s.id) + '"><b>' + esc(s.name) + '</b><small>' +
                esc([s.brand && s.brand.toLowerCase() !== s.name.toLowerCase() ? s.brand : '', s.addr || s.town || ''].filter(Boolean).join(' · ') || T('No address on the map', 'Keine Adresse auf der Karte', 'Sin dirección en el mapa')) +
                '</small><i>' + esc(dist(s.km)) + '</i></button>').join('') + '</div>';
    }
    function pickHTML(msg) {
        const chains = '<button type="button" class="stp-chip' + (S.range === 'general' && !S.store ? ' on' : '') + '" data-stp="general">' + esc(label('general')) + '</button>' +
            RANGES.map(r => '<button type="button" class="stp-chip' + (S.range === r.id && !S.store ? ' on' : '') + '" data-stp-range="' + r.id + '">' + esc(r.label) + '</button>').join('');
        return shell('<div class="stp-head"><h3>' + esc(T('Which shop?', 'Welcher Laden?', '¿Qué tienda?')) + '</h3><p>' +
            esc(T('Share your location to see the supermarkets nearest to you, or type a town or postcode.', 'Teil deinen Standort, um die Supermärkte in deiner Nähe zu sehen, oder gib einen Ort oder eine Postleitzahl ein.', 'Comparte tu ubicación para ver los supermercados más cercanos, o escribe una ciudad o un código postal.')) + '</p></div>' +
            '<div class="stp-scroll">' + shopActs() + snackHTML() + '<button type="button" class="stp-go" data-stp="locate"' + (busy ? ' disabled aria-busy="true"' : '') + '>' + ic.pin + '<span>' + esc(T('Share my location', 'Meinen Standort teilen', 'Compartir mi ubicación')) + '</span></button>' +
            whereForm() + (msg ? '<p class="stp-msg" role="status">' + esc(msg) + '</p>' : '') + hereHTML() + shopRowsHTML() +
            '<button type="button" class="stp-more stp-skip" data-stp="general">' + esc(T('Skip: show the general lists', 'Überspringen: allgemeine Listen zeigen', 'Omitir: ver las listas generales')) + '</button>' +
            '<h4 class="stp-h4">' + esc(T('Or pick a chain', 'Oder eine Kette wählen', 'O elige una cadena')) + '</h4><div class="stp-chips stp-wrap">' + chains + '</div>' +
            '<p class="stp-fine">' + esc(T('Your location is only used on this phone to look up your address and the shops near you on OpenStreetMap. It isn’t sent to us or saved. Map data © OpenStreetMap contributors. ',
                'Dein Standort wird nur auf diesem Handy genutzt, um deine Adresse und die Läden in der Nähe bei OpenStreetMap nachzuschlagen. Er wird nicht an uns geschickt und nicht gespeichert. Kartendaten © OpenStreetMap-Mitwirkende. ',
                'Tu ubicación solo se usa en este teléfono para buscar tu dirección y las tiendas cercanas en OpenStreetMap. No se nos envía ni se guarda. Datos del mapa © colaboradores de OpenStreetMap. ')) +
            '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">openstreetmap.org/copyright</a></p></div>' +
            footBtns(S.range ? '<button type="button" class="stp-pill" data-stp="list">' + esc(T('Back to list', 'Zurück zur Liste', 'Volver a la lista')) + '</button>' : ''));
    }

    /* ---------------- the list ---------------- */
    /* scanfe-h4: the engine's blood sugar impact category for the serving, never an estimated GI or GL */
    function impactWord(k) {
        return k === 'lower' ? T('Lower', 'Niedrigere', 'Menor') : k === 'moderate' ? T('Moderate', 'Mittlere', 'Moderada') : T('Higher', 'Höhere', 'Mayor');
    }
    function impactLine(k) {
        return k === 'lower' ? T('Lower blood sugar impact (estimate)', 'Niedrigere Blutzuckerwirkung (Schätzung)', 'Menor impacto en el azúcar en sangre (estimación)')
            : k === 'moderate' ? T('Moderate blood sugar impact (estimate)', 'Mittlere Blutzuckerwirkung (Schätzung)', 'Impacto moderado en el azúcar en sangre (estimación)')
                : T('Higher blood sugar impact (estimate)', 'Höhere Blutzuckerwirkung (Schätzung)', 'Mayor impacto en el azúcar en sangre (estimación)');
    }
    function checkWord(v) {
        return v === 'JA' ? T('Food check: YES', 'Food-Check: JA', 'Food check: SÍ') : v === 'SELTEN' ? T('Food check: RARELY', 'Food-Check: SELTEN', 'Food check: RARA VEZ') : v === 'NEIN' ? T('Food check: NO', 'Food-Check: NEIN', 'Food check: NO') : '';
    }
    function reason(it) {
        const r = it.r, u = r.unit;
        const parts = [impactWord(r.impact) + ' ' + T('impact', 'Wirkung', 'impacto') + ' ' + T('per', 'pro', 'por') + ' ' + r.serve + ' ' + u, dec(r.carbs) + ' g ' + T('carbs', 'KH', 'carbohidratos')];
        if (r.sugar >= 1) parts.push(dec(r.sugar) + ' g ' + T('sugar', 'Zucker', 'azúcar'));
        if (r.protein >= 3) parts.push(dec(r.protein) + ' g ' + T('protein', 'Eiweiß', 'proteína'));
        if (r.fibre >= 2) parts.push(dec(r.fibre) + ' g ' + T('fibre', 'Ballaststoffe', 'fibra'));
        return parts.join(' · ');
    }
    /* Oct 18, 2026 (E-man in Lidl, could not tap "Bio Linsen": "It should be linked in there ... a little window next to
       best. Just like Amazon, so we can actually see ... an image of the product."). Each row is a button with a small photo; the
       photo waits in data-src until the row scrolls near (IntersectionObserver), so a long list never asks for thousands at once. */
    let shown = [], qv = null, qvFrom = -1, io = null;
    const camera = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13.2" r="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    function tagHTML(r, failed) {
        return failed ? '<em class="stp-tag no">' + esc(r.fail === 'policy' ? T('Food check: NO', 'Food-Check: NEIN', 'Food check: NO') : r.fail === 'sugar' ? T('Too much sugar', 'Zu viel Zucker', 'Demasiado azúcar') : T('Spikes', 'Lässt steigen', 'Sube')) + '</em>'
            : '<em class="stp-tag ' + (r.best ? 'best' : 'ok') + '">' + esc(r.best ? T('Best', 'Top', 'Mejor') : T('Good', 'Gut', 'Bien')) + '</em>';
    }
    function thumbHTML(p) {
        const src = C.photo(p);
        return src ? '<span class="stp-th"><img data-src="' + esc(src) + '" alt="" width="48" height="48" loading="lazy" decoding="async"></span>'
            : '<span class="stp-th none" title="' + esc(T('No photo yet', 'Noch kein Foto', 'Aún no hay foto')) + '">' + camera + '</span>';
    }
    function itemHTML(it, failed) {
        const r = it.r, p = it.p, i = shown.push({ it, failed: !!failed }) - 1;
        return '<li class="stp-li"><button type="button" class="stp-item' + (failed ? ' fail' : '') + '" data-stp-item="' + i + '" aria-haspopup="dialog">' + thumbHTML(p) +
            '<span class="stp-it"><b>' + esc(p.n) + '</b><small>' + esc([p.b, p.q].filter(Boolean).join(' · ')) +
            (r.typical ? ' · ' + esc(T('typical values, no label online', 'typische Werte, kein Etikett online', 'valores típicos, sin etiqueta en línea')) : '') + '</small><span class="stp-why">' + esc(reason(it)) + '</span></span>' + tagHTML(r, failed) + '</button></li>';
    }

    /* ---------------- quick view: photo, label, why, where it comes from ---------------- */
    function whyText(e) {
        const sv = e.serve + ' ' + e.unit, su = dec(e.sugar), il = impactLine(e.impact), ck = checkWord(e.check);
        const tail = ck ? ' ' + ck + '.' : '';
        if (e.verdict === 'best') return T('Best: ' + il + ' in a ' + sv + ' portion, ' + su + ' g sugar.' + tail,
            'Top: ' + il + ' in einer Portion von ' + sv + ', ' + su + ' g Zucker.' + tail,
            'Mejor: ' + il + ' en una porción de ' + sv + ', ' + su + ' g de azúcar.' + tail);
        /* Oct 18, 2026 (lowiSPIKE principles audit): a zero-sugar cola or energy drink has no sugar load, but it is not minimally
           processed, so it is Good, never Best */
        if (e.verdict === 'good' && e.sweetened) return T('Good, not Best: ' + il + ' in a ' + sv + ' portion, so no real sugar load, but it is a sweetened, processed drink. Water and plain tea are Best.',
            'Gut, nicht Top: ' + il + ' in einer Portion von ' + sv + ', also kaum Zuckerlast, aber ein gesüßtes, verarbeitetes Getränk. Wasser und purer Tee sind Top.',
            'Bien, no Mejor: ' + il + ' en una porción de ' + sv + ', casi sin carga de azúcar, pero es una bebida endulzada y procesada. El agua y el té solo son Mejor.');
        if (e.verdict === 'good') return T('Good: ' + il + ' in a ' + sv + ' portion and ' + su + ' g sugar.' + tail + ' Best needs Food check YES.',
            'Gut: ' + il + ' in einer Portion von ' + sv + ' und ' + su + ' g Zucker.' + tail + ' Top braucht Food-Check JA.',
            'Bien: ' + il + ' en una porción de ' + sv + ' y ' + su + ' g de azúcar.' + tail + ' Mejor necesita Food check SÍ.');
        if (e.verdict === 'policy') return T('Left out: the Food check says NO for this product, the same as the scanner card.',
            'Aussortiert: Der Food-Check sagt NEIN zu diesem Produkt, genau wie die Scanner-Karte.',
            'Excluido: el Food check dice NO a este producto, igual que la tarjeta del escáner.');
        if (e.verdict === 'sugar') return T('Left out: ' + su + ' g sugar in a ' + sv + ' portion. The limit is 6 g.',
            'Aussortiert: ' + su + ' g Zucker in einer Portion von ' + sv + '. Die Grenze ist 6 g.',
            'Excluido: ' + su + ' g de azúcar en una porción de ' + sv + '. El límite es 6 g.');
        return T('Left out: ' + il + ' in a ' + sv + ' portion. Only Lower passes.',
            'Aussortiert: ' + il + ' in einer Portion von ' + sv + '. Nur Niedrigere besteht.',
            'Excluido: ' + il + ' en una porción de ' + sv + '. Solo Menor pasa.');
    }
    function mathText(e) {
        const s = dec(e.carbs) + ' g ' + T('carbs', 'KH', 'carbohidratos') + ' ' + T('in', 'in', 'en') + ' ' + e.serve + ' ' + e.unit + ' → ' + impactWord(e.impact) + '. ';
        return s + (e.typical ? T('This product has no label online, so typical values for this food were used. ', 'Dieses Produkt hat online kein Etikett, deshalb wurden typische Werte für dieses Lebensmittel genommen. ', 'Este producto no tiene etiqueta en línea, así que se usaron valores típicos de este alimento. ')
            : T('The carbs and sugar come from the label. ', 'KH und Zucker stammen vom Etikett. ', 'Los carbohidratos y el azúcar vienen de la etiqueta. ')) +
            T('The impact is an estimate from the carbs and sugar in the portion; no glycemic index is guessed.',
                'Die Wirkung ist eine Schätzung aus KH und Zucker in der Portion; es wird kein glykämischer Index geraten.',
                'El impacto es una estimación a partir de los carbohidratos y el azúcar de la porción; no se adivina ningún índice glucémico.');
    }
    function labelHTML(p) {
        const v = x => (typeof x === 'number' ? dec(x) : '–');
        const rowsL = [[T('Carbs', 'Kohlenhydrate', 'Carbohidratos'), v(p.c) + ' g'], [T('of which sugar', 'davon Zucker', 'de los cuales azúcar'), v(p.s) + ' g'],
            [T('Fibre', 'Ballaststoffe', 'Fibra'), v(p.f) + ' g'], [T('Protein', 'Eiweiß', 'Proteína'), v(p.p) + ' g'], [T('Fat', 'Fett', 'Grasa'), v(p.fat) + ' g'],
            [T('Energy', 'Energie', 'Energía'), v(p.kcal) + ' kcal']];
        return '<dl class="stp-qv-dl">' + rowsL.map(x => '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>').join('') + '</dl>';
    }
    function whereText() {
        const name = (data && data.name) || label(S.range) || '';
        if (S.range === 'salling') return T('From Salling Group’s online range (Bilka ToGo). Føtex and Bilka share most of it, but it is not checked against the shelf of your shop, so it may not be there today.',
            'Aus dem Online-Sortiment der Salling Group (Bilka ToGo). Føtex und Bilka teilen das meiste davon, aber es ist nicht mit dem Regal deines Ladens abgeglichen, es kann also heute fehlen.',
            'De la gama en línea de Salling Group (Bilka ToGo). Føtex y Bilka comparten la mayor parte, pero no está comprobado con la estantería de tu tienda, así que puede que hoy no esté.');
        return T('Open Food Facts shoppers tagged this product as sold at ' + name + ' in Germany. It is not checked against the shelf of your shop, so it may not be there today.',
            'Nutzer von Open Food Facts haben dieses Produkt als bei ' + name + ' in Deutschland erhältlich markiert. Es ist nicht mit dem Regal deines Ladens abgeglichen, es kann also heute fehlen.',
            'Usuarios de Open Food Facts marcaron este producto como vendido en ' + name + ' en Alemania. No está comprobado con la estantería de tu tienda, así que puede que hoy no esté.');
    }
    function quickHTML(it, failed) {
        const p = it.p, r = it.r, big = C.photo(p, 400), lk = C.link(p, data), e = C.explain(r);
        const ph = big ? '<img src="' + esc(big) + '" alt="' + esc(T('Photo of ', 'Foto von ', 'Foto de ') + p.n) + '" decoding="async">'
            : '<span class="stp-qv-none">' + camera + '<span>' + esc(T('No photo yet. Nobody has uploaded one for this barcode.', 'Noch kein Foto. Für diesen Barcode hat noch niemand eins hochgeladen.', 'Aún no hay foto. Nadie ha subido una para este código de barras.')) + '</span></span>';
        const cap = big ? '<figcaption>' + esc(T('Photo: Open Food Facts, uploaded by shoppers', 'Foto: Open Food Facts, von Nutzern hochgeladen', 'Foto: Open Food Facts, subida por usuarios')) + '</figcaption>' : '';
        const sub = [p.b, p.q, p.g ? T('barcode ', 'Barcode ', 'código ') + p.g : ''].filter(Boolean).join(' · ');
        return '<div class="stp-qv-card" role="dialog" aria-modal="true" aria-labelledby="stpQvT">' +
            '<div class="stp-qv-scroll"><figure class="stp-qv-ph' + (big ? '' : ' none') + '">' + ph + cap + '</figure>' +
            '<div class="stp-qv-top">' + tagHTML(r, failed) + '</div><h3 id="stpQvT">' + esc(p.n) + '</h3><p class="stp-qv-sub">' + esc(sub) + '</p>' +
            (e ? '<h4 class="stp-h5">' + esc(T('Why this rating', 'Warum diese Bewertung', 'Por qué esta valoración')) + '</h4><p class="stp-qv-why">' + esc(whyText(e)) + '</p><p class="stp-qv-p">' + esc(mathText(e)) + '</p>' : '') +
            '<h4 class="stp-h5">' + esc(r.typical ? T('Typical values per 100 ', 'Typische Werte pro 100 ', 'Valores típicos por 100 ') + (p.u || 'g') : T('Label per 100 ', 'Etikett pro 100 ', 'Etiqueta por 100 ') + (p.u || 'g')) + '</h4>' + labelHTML(r.typical ? {} : p) +
            '<h4 class="stp-h5">' + esc(T('Where this comes from', 'Woher das kommt', 'De dónde viene')) + '</h4><p class="stp-qv-p">' + esc(whereText()) + '</p>' +
            (lk ? '<a class="stp-go stp-qv-link" href="' + esc(lk.url) + '" target="_blank" rel="noopener noreferrer">' + esc(T('Open the product page on ', 'Produktseite öffnen auf ', 'Abrir la página del producto en ') + lk.site) + '</a>'
                : (data && data.sourceUrl ? '<a class="stp-pill stp-qv-src" href="' + esc(data.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(T('Source: ', 'Quelle: ', 'Fuente: ') + data.sourceUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + '</a>' : '')) +
            '<p class="stp-fine">' + esc(T('General food guidance from the label, not medical advice. How your own blood sugar reacts can be different; check with your doctor for your own limits.',
                'Allgemeine Ernährungshilfe vom Etikett, keine medizinische Beratung. Dein eigener Blutzucker kann anders reagieren; deine Grenzen klärst du mit deiner Ärztin oder deinem Arzt.',
                'Orientación general a partir de la etiqueta, no consejo médico. Tu azúcar en sangre puede reaccionar distinto; consulta tus límites con tu médico.')) + '</p></div>' +
            (/^(snacks|sweets|fruit)$/.test(r.group || '') ? '<button type="button" class="stp-go stp-snack-qv" data-stp-snack-qv="' + esc(p.n) + '">' + esc(T('+ Snacks to buy', '+ Snacks zum Einkaufen', '+ Snacks para comprar')) + '</button>' : '') +
            '<div class="stp-foot"><button type="button" class="stp-pill" data-stp="qv-close">' + esc(T('‹ Back to list', '‹ Zurück zur Liste', '‹ Volver a la lista')) + '</button>' +
            '<button type="button" class="stp-orb stp-close" data-stp="qv-close" aria-label="' + esc(T('Close product', 'Produkt schließen', 'Cerrar producto')) + '">' + ic.x + '</button></div></div>';
    }
    function openQuick(i) {
        const row = shown[i];
        if (!ov || !row) return;
        if (qv) qv.remove();
        qvFrom = i;
        qv = D.createElement('div');
        qv.className = 'stp-qv';
        qv.innerHTML = quickHTML(row.it, row.failed);
        const img = qv.querySelector('.stp-qv-ph img');
        if (img) img.addEventListener('error', () => { const f = img.closest('figure'); if (f) { f.classList.add('none'); f.innerHTML = '<span class="stp-qv-none">' + camera + '<span>' + esc(T('The photo didn’t load.', 'Das Foto ließ sich nicht laden.', 'La foto no se cargó.')) + '</span></span>'; } });
        ov.appendChild(qv);
        const card = ov.querySelector('.stp-card'); if (card) card.setAttribute('aria-hidden', 'true');
        requestAnimationFrame(() => { if (qv) { qv.classList.add('in'); const b = qv.querySelector('.stp-pill[data-stp="qv-close"]'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } } });
    }
    function closeQuick() {
        if (!qv) return;
        const o = qv; qv = null;
        o.remove();
        if (!ov) return;
        const card = ov.querySelector('.stp-card'); if (card) card.removeAttribute('aria-hidden');
        const b = ov.querySelector('[data-stp-item="' + qvFrom + '"]');
        if (b) try { b.focus({ preventScroll: true }); } catch (e) {}
    }
    function watchThumbs() {
        if (io) { io.disconnect(); io = null; }
        if (!ov) return;
        const imgs = ov.querySelectorAll('.stp-th img[data-src]');
        if (!imgs.length) return;
        const show = img => {
            const src = img.getAttribute('data-src'); if (!src) return;
            img.removeAttribute('data-src');
            img.addEventListener('error', () => { const s = img.parentNode; if (s) { s.classList.add('none'); s.innerHTML = camera; } }, { once: true });
            img.src = src;
        };
        if (typeof IntersectionObserver !== 'function') { imgs.forEach(show); return; }
        const sc = ov.querySelector('.stp-scroll');
        io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); show(e.target); } }), { root: sc || null, rootMargin: '300px 0px' });
        imgs.forEach(img => io.observe(img));
    }
    function groupHTML(g) {
        const meta = C.G[g.id];
        const name = meta[['en', 'de', 'es'][li()]];
        const total = g.pass.length + g.fail.length + g.unrated;
        if (!total) return '';
        const pg = C.page(g.pass.length, open[g.id]);
        let body;
        if (g.pass.length) {
            body = '<ul class="stp-items">' + g.pass.slice(0, pg.show).map(it => itemHTML(it)).join('') + '</ul>' + moreHTML(g.id, pg);
        } else {
            body = '<p class="stp-none">' + esc(T('None of the ' + fmt(total) + ' products here pass.', 'Keins der ' + fmt(total) + ' Produkte hier besteht.', 'Ninguno de los ' + fmt(total) + ' productos de aquí pasa.')) + '</p>';
        }
        const pf = C.page(g.fail.length, open[g.id + ':f']);
        if (showFail && g.fail.length) {
            body += '<h5 class="stp-h5">' + esc(T('Left out', 'Aussortiert', 'Excluidos')) + ' · ' + fmt(g.fail.length) + '</h5><ul class="stp-items">' +
                g.fail.slice(0, pf.show).map(it => itemHTML(it, true)).join('') + '</ul>' + moreHTML(g.id + ':f', pf);
        }
        return '<section class="stp-group" id="stpg-' + g.id + '"><h4 class="stp-gh"><span aria-hidden="true">' + meta.ic + '</span>' + esc(name) +
            '<i>' + esc(fmt(g.pass.length)) + ' / ' + esc(fmt(total)) + '</i></h4>' + body + '</section>';
    }
    /* a page at a time (C.page): "Show 40 more · 610 left", never the whole range at once */
    function moreHTML(id, pg) {
        if (!pg.left) return '';
        const n = fmt(pg.next), l = fmt(pg.left);
        return '<button type="button" class="stp-more" data-stp-more="' + id + '" data-stp-ask="' + pg.ask + '">' +
            esc(T('Show ' + n + ' more · ' + l + ' left', 'Noch ' + n + ' zeigen · ' + l + ' übrig', 'Ver ' + n + ' más · quedan ' + l)) + '</button>';
    }
    function listHTML(state, err) {
        let inner = '';
        if (state === 'loading') inner = '<p class="stp-msg">' + esc(T('Loading the shop’s products…', 'Lade die Produkte des Ladens…', 'Cargando los productos de la tienda…')) + '</p>';
        else if (state === 'error') inner = '<p class="stp-msg">' + esc(T('Couldn’t load the products. Check your connection and try again.', 'Die Produkte ließen sich nicht laden. Prüf die Verbindung und versuch es nochmal.', 'No se pudieron cargar los productos. Revisa la conexión e inténtalo de nuevo.')) + '</p><button type="button" class="stp-go" data-stp="retry">' + esc(T('Try again', 'Nochmal', 'Reintentar')) + '</button>';
        else {
            built = C.build(data, { q });
            shown = [];
            const c = built.counts;
            const chips = built.groups.filter(g => g.pass.length + g.fail.length + g.unrated).map(g => '<button type="button" class="stp-chip" data-stp-jump="' + g.id + '"><span aria-hidden="true">' + C.G[g.id].ic + '</span>' + esc(C.G[g.id][['en', 'de', 'es'][li()]].split(/[,&]| y | und /)[0].trim()) + ' <i>' + fmt(g.pass.length) + '</i></button>').join('');
            inner = '<p class="stp-sum"><b>' + esc(fmt(c.pass)) + '</b> ' + esc(T('of ' + fmt(c.total) + ' products pass', 'von ' + fmt(c.total) + ' Produkten bestehen', 'de ' + fmt(c.total) + ' productos pasan')) +
                (c.unrated ? ' · ' + esc(T(fmt(c.unrated) + ' without a label', fmt(c.unrated) + ' ohne Etikett', fmt(c.unrated) + ' sin etiqueta')) : '') + '</p>' +
                '<div class="stp-chips stp-jumps">' + chips + '</div>' +
                built.groups.map(groupHTML).join('') +
                (c.total ? '' : '<p class="stp-none">' + esc(T('Nothing matches that search.', 'Nichts passt zu der Suche.', 'Nada coincide con la búsqueda.')) + '</p>') +
                '<details class="stp-how"><summary>' + esc(T('How the rating works', 'So wird bewertet', 'Cómo se valora')) + '</summary><p>' +
                esc(T('For each product: carbs and sugar per typical portion from its label (100 g meat or fish, 30 g cheese, 40 g bread, 25 g sweets, 30 g snacks, 250 ml drink, 150 g yoghurt). The same Food check as the scanner card gives the blood sugar impact (Lower, Moderate or Higher) and YES, RARELY or NO. A product passes with Lower impact, no more than 6 g sugar per portion and no Food check NO; Best also needs Food check YES.',
                    'Für jedes Produkt: Kohlenhydrate und Zucker pro typischer Portion laut Etikett (100 g Fleisch oder Fisch, 30 g Käse, 40 g Brot, 25 g Süßes, 30 g Snacks, 250 ml Getränk, 150 g Joghurt). Derselbe Food-Check wie auf der Scanner-Karte gibt die Blutzuckerwirkung (Niedrigere, Mittlere oder Höhere) und JA, SELTEN oder NEIN. Ein Produkt besteht mit niedrigerer Wirkung, höchstens 6 g Zucker pro Portion und ohne Food-Check NEIN; Top braucht zusätzlich Food-Check JA.',
                    'Para cada producto: carbohidratos y azúcar por porción típica según su etiqueta (100 g de carne o pescado, 30 g de queso, 40 g de pan, 25 g de dulces, 30 g de snacks, 250 ml de bebida, 150 g de yogur). El mismo Food check que la tarjeta del escáner da el impacto en el azúcar en sangre (Menor, Moderado o Mayor) y SÍ, RARA VEZ o NO. Un producto pasa con impacto Menor, no más de 6 g de azúcar por porción y sin Food check NO; Mejor necesita además Food check SÍ.')) + '</p>' +
                '<p>' + esc(T('Real: product names and label values. Estimated: the blood sugar impact; no glycemic index is guessed. The range lists have no ingredients, so the Food check sees the name and the label only. ', 'Echt: Produktnamen und Etikettwerte. Geschätzt: die Blutzuckerwirkung; es wird kein glykämischer Index geraten. Die Listen haben keine Zutaten, deshalb sieht der Food-Check nur Name und Etikett. ', 'Real: nombres y valores de la etiqueta. Estimado: el impacto en el azúcar en sangre; no se adivina ningún índice glucémico. Las listas no tienen ingredientes, así que el Food check solo ve el nombre y la etiqueta. ') + (data && data.note ? data.note : '')) + '</p>' +
                '<p>' + esc(T('Source: ', 'Quelle: ', 'Fuente: ') + (data && data.source || '') + ' · ' + (data && data.built || '')) + '</p></details>';
        }
        const gen = S.range === 'general' && S.store ? '<p class="stp-fine stp-gen">' + esc(T('We have no product list for this shop’s chain, so this is the general list. Supermarkets mostly carry the same items.', 'Für die Kette dieses Ladens haben wir keine eigene Liste, deshalb siehst du die allgemeine Liste. Supermärkte führen meist dieselben Produkte.', 'No tenemos una lista de esta cadena, así que ves la lista general. Los supermercados suelen tener los mismos productos.')) + '</p>' : '';
        return shell('<div class="stp-head"><h3>' + esc(T('What can I buy here?', 'Was kann ich hier kaufen?', '¿Qué puedo comprar aquí?')) + '</h3>' +
            '<button type="button" class="stp-shop" data-stp="pick">' + ic.cart + '<span>' + esc(storeLine() || label(S.range) || '') + '</span><i>' + esc(T('Change', 'Ändern', 'Cambiar')) + '</i></button>' +
            '<div class="stp-tools"><input type="search" class="stp-q" enterkeyhint="search" autocomplete="off" placeholder="' + esc(T('Search this shop', 'In diesem Laden suchen', 'Buscar en esta tienda')) + '" value="' + esc(q) + '">' +
            '<label class="stp-tog"><input type="checkbox" data-stp="fails"' + (showFail ? ' checked' : '') + '><span>' + esc(T('Show left out', 'Aussortierte zeigen', 'Ver excluidos')) + '</span></label></div></div>' +
            '<div class="stp-scroll">' + shopActs() + snackHTML() + gen + inner + '</div>' +
            '<p class="stp-note">' + esc(T('General food guidance, not medical advice.', 'Allgemeine Ernährungshilfe, keine medizinische Beratung.', 'Orientación general sobre alimentos, no consejo médico.')) + '</p>' +
            footBtns(''));
    }

    function paint(state) {
        if (!ov) return;
        const sc = ov.querySelector('.stp-scroll'), top = sc ? sc.scrollTop : 0;
        const hadQ = D.activeElement && D.activeElement.classList && D.activeElement.classList.contains('stp-q');
        qv = null;
        ov.innerHTML = view === 'pick' ? pickHTML(state) : listHTML(state);
        watchThumbs();
        const sc2 = ov.querySelector('.stp-scroll'); if (sc2 && state === 'keep') sc2.scrollTop = top;
        if (hadQ) { const i = ov.querySelector('.stp-q'); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) {} } }
    }
    function showList() {
        view = 'list';
        if (!S.range) { view = 'pick'; paint(); return; }
        data = null; paint('loading');
        loadRange(S.range).then(d => { data = d; if (ov && view === 'list') paint(); }).catch(() => { if (ov && view === 'list') paint('error'); });
    }
    function focusWhere() { const i = ov && ov.querySelector('.stp-wq'); if (i) try { i.focus(); } catch (e) {} }
    const lang = () => ['en', 'de', 'es'][li()];
    const LOOKING = () => T('Finding supermarkets near you…', 'Suche Supermärkte in deiner Nähe…', 'Buscando supermercados cerca…');
    const MAPFAIL = () => T('Couldn’t load shops from the map right now. Try again, type a town or postcode, or see the general lists.', 'Die Läden ließen sich gerade nicht von der Karte laden. Versuch es nochmal, gib einen Ort oder eine Postleitzahl ein oder sieh dir die allgemeinen Listen an.', 'No se pudieron cargar las tiendas del mapa. Inténtalo de nuevo, escribe una ciudad o código postal, o mira las listas generales.');
    /* look around a point: the address and the shops are fetched side by side; the country code from the address only decides
       Danish Netto (Salling range) against German Netto */
    function lookAround(at, known) {
        where = at; near = null; busy = true; place = known || null;
        if (ov && view === 'pick') paint(LOOKING());
        const L = look(), addr = known ? Promise.resolve(known) : L.address(at, lang()).catch(() => null);
        const shops = L.shops(at);
        addr.then(p => { if (p && where === at) { place = p; if (ov && view === 'pick' && busy) paint(LOOKING()); } });
        Promise.all([addr, shops]).then(r => L.shops(at, r[0] && r[0].cc)).then(list => {
            if (where !== at) return;
            near = list; busy = false;
            if (ov && view === 'pick') paint('');
        }).catch(() => { if (where !== at) return; busy = false; near = null; if (ov && view === 'pick') paint(MAPFAIL()); });
    }
    function locate() {
        if (busy) return;
        if (!navigator.geolocation) { paint(T('Location isn’t available here. Type a town or postcode instead.', 'Standort ist hier nicht verfügbar. Gib stattdessen einen Ort oder eine Postleitzahl ein.', 'La ubicación no está disponible. Escribe una ciudad o un código postal.')); focusWhere(); return; }
        busy = true; paint(T('Finding where you are…', 'Suche deinen Standort…', 'Buscando dónde estás…'));
        navigator.geolocation.getCurrentPosition(pos => {
            placeMine = true;
            lookAround({ lat: pos.coords.latitude, lon: pos.coords.longitude }, null);
        }, err => {
            busy = false;
            if (!ov || view !== 'pick') return;
            paint(err && err.code === 1 ? T('Location is off for this site. Type a town or postcode, or allow location in your settings.', 'Standort ist für diese Seite aus. Gib einen Ort oder eine Postleitzahl ein oder erlaube den Standort in den Einstellungen.', 'La ubicación está desactivada para este sitio. Escribe una ciudad o código postal, o permítela en los ajustes.')
                : T('Couldn’t get your location. Type a town or postcode instead.', 'Dein Standort ließ sich nicht ermitteln. Gib stattdessen einen Ort oder eine Postleitzahl ein.', 'No se pudo obtener tu ubicación. Escribe una ciudad o un código postal.'));
            focusWhere();
        }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 });
    }
    function findPlace(text) {
        const t = String(text || '').trim();
        if (t.length < 2 || busy) return;
        busy = true; near = null; place = null; paint(T('Looking up ', 'Suche ', 'Buscando ') + t + '…');
        look().search(t, lang()).then(p => {
            if (!p) { busy = false; if (ov && view === 'pick') { paint(T('Couldn’t find that place. Check the spelling or try a postcode.', 'Den Ort gibt es so nicht. Prüf die Schreibweise oder versuch eine Postleitzahl.', 'No se encontró ese lugar. Revisa la ortografía o prueba un código postal.')); focusWhere(); } return; }
            placeMine = false; busy = false;
            lookAround({ lat: p.lat, lon: p.lon }, p);
        }).catch(() => { busy = false; if (ov && view === 'pick') paint(MAPFAIL()); });
    }

    function onClick(e) {
        const t = e.target.closest ? e.target : null; if (!t) return;
        if (qv && (e.target === qv || (t.closest('[data-stp="qv-close"]') && qv.contains(t)))) { closeQuick(); return; }
        if (qv && qv.contains(t)) { snackClick(t); return; }
        if (snackClick(t)) return;
        if (e.target === ov) { close(); return; }
        const row = t.closest('[data-stp-item]');
        if (row) { openQuick(+row.getAttribute('data-stp-item')); return; }
        const b = t.closest('[data-stp],[data-stp-store],[data-stp-range],[data-stp-more],[data-stp-jump]');
        if (!b || b.tagName === 'INPUT') return;
        const a = b.getAttribute('data-stp');
        if (a === 'close') return close();
        if (a === 'scanshop') { close(); setTimeout(() => { try { W.LowiShopScan.open(); } catch (x) {} }, 200); return; }
        if (a === 'mylist') { close(); setTimeout(() => { try { W.tdShopOpen(); } catch (x) {} }, 200); return; }
        if (a === 'pick') { view = 'pick'; return paint(); }
        if (a === 'list') return showList();
        if (a === 'locate') return locate();
        if (a === 'retry') return showList();
        if (b.hasAttribute('data-stp-range')) { S = { range: b.getAttribute('data-stp-range') }; save(); q = ''; open = {}; return showList(); }
        if (a === 'general') { S = { range: 'general' }; save(); q = ''; open = {}; return showList(); }
        if (b.hasAttribute('data-stp-store')) {
            const s = (near || []).find(x => x.id === b.getAttribute('data-stp-store')); if (!s) return;
            S = { range: RANGE[s.chain] ? s.chain : 'general', store: { id: s.id, name: s.name, brand: s.brand, chain: s.chain || '', addr: s.addr || '', town: s.town || '', km: s.km != null ? Math.round(s.km * 10) / 10 : null } };
            save(); q = ''; open = {};
            return showList();
        }
        if (b.hasAttribute('data-stp-more')) { open[b.getAttribute('data-stp-more')] = +b.getAttribute('data-stp-ask') || 0; return paint('keep'); }
        if (b.hasAttribute('data-stp-jump')) {
            const g = ov.querySelector('#stpg-' + b.getAttribute('data-stp-jump')), sc = ov.querySelector('.stp-scroll');
            if (g && sc) sc.scrollTo({ top: g.offsetTop - sc.offsetTop - 6, behavior: 'smooth' });
        }
    }
    let qt = 0;
    function onInput(e) {
        if (e.target.classList.contains('stp-q')) { clearTimeout(qt); const v = e.target.value; qt = setTimeout(() => { q = v; if (data) paint(); }, 220); }
    }
    function onChange(e) {
        if (e.target.getAttribute && e.target.getAttribute('data-stp') === 'fails') { showFail = !!e.target.checked; if (data) paint('keep'); }
    }
    function onKey(e) {
        if (e.key !== 'Escape' || !ov) return;
        if (qv) return closeQuick();
        close();
    }

    function openPanel(from) {
        if (ov) return;
        ov = D.createElement('div');
        ov.className = 'stp-ov';
        ov.addEventListener('click', onClick);
        ov.addEventListener('input', onInput);
        ov.addEventListener('change', onChange);
        ov.addEventListener('submit', onSubmit);
        D.addEventListener('keydown', onKey);
        D.body.appendChild(ov);
        /* the panel covers the screen: body-world-3d.js draws no world frames under it (html.stp-open), like Mirror mode */
        D.documentElement.classList.add('stp-open');
        requestAnimationFrame(() => { if (ov) ov.classList.add('in'); });
        q = ''; showFail = false; open = {};
        if (S.range) showList(); else { view = 'pick'; paint(); }
        try { W.dispatchEvent(new CustomEvent('lowi:storepicks', { detail: { open: true, from: from || '' } })); } catch (e) {}
    }
    function close() {
        if (!ov) return;
        const o = ov; ov = null; qv = null;
        if (io) { io.disconnect(); io = null; }
        D.documentElement.classList.remove('stp-open');
        where = null; place = null; near = null; busy = false; /* the position is forgotten with the panel */
        data = null; built = null; shown = []; /* the rows are gone with the panel: keep nothing of them while it is closed */
        D.removeEventListener('keydown', onKey);
        o.classList.remove('in'); o.classList.add('out');
        setTimeout(() => { try { o.remove(); } catch (e) {} }, 260);
    }

    function boot() {
        W.addEventListener('lowi:lang', () => { if (ov) paint(data ? 'keep' : undefined); });
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();

    W.LowiStorePicks = { open: openPanel, close, state: () => JSON.parse(JSON.stringify(S)), isOpen: () => !!ov, snacks: () => JSON.parse(JSON.stringify(snacks)) };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
