/* Oct 17, 2026 (E-man, in the shop: "a little emergency button ... see all the snacks that I can buy in the shop, all the meat ...
   all the bread" and "even before entering the shop, be able to see every product that I can buy if I only eat insulin-friendly food").
   The "What can I buy here?" button and its Move-style panel. Logic and the formula live in store-picks-core.js; product ranges in
   data/shop/<range>.json; built by tools/shop-data/build.py. Shops near the person come live from OpenStreetMap (store-picks-core.js lookup), no keys on the phone.
   Oct 21, 2026 (Eman: "Does it make sense to also have it in there again? If not, remove it."): one entry point only, the Shop orb
   in Home's Fuel bubble (home-blooms-v2.js). The old card under Cook it / Shop it, in the shopping list, cart and Meals sheets is gone.
   Oct 23, 2026 (Eman: "Wo ist der Seller Zone versteckt? Pack ihn mal auch in Shop. Mit dem selben Design damit man da durch scrollen
   kann."): two tabs on top, Supermarket and Seller Zone. The Seller Zone tab is the whole zone (seller-zone.js inlineHTML: shelves,
   regions, every card) in this panel's own scroll; the Supermarket tab starts with a swipe shelf of the zone's snacks. */
(function (W, D) {
    'use strict';
    if (!W || !D || W.LowiStorePicks) return;
    const C = W.LowiStorePicksCore;
    if (!C) return;
    const KEY = 'lowi.storePicks.v1';
    const BUILD = (D.querySelector('meta[name="lowi-build"]') || {}).content || '';
    const li = () => { const l = (D.documentElement.lang || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const T = (en, de, es) => [en, de, es][li()];
    /* food names in the app language (Oct 26 2026: cart names came from English recipe cards); unknown names stay as typed */
    const foodName = n => (W.LowiFoodNames ? W.LowiFoodNames.name(n, ['en', 'de', 'es'][li()]) : String(n || ''));
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
    try { S = (o => o && typeof o === "object" ? o : {})(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = {}; }
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
    const TKEY = 'lowi.storePicks.tab';
    const SZ = () => W.LowiSellerZone && W.LowiSellerZone.inlineHTML ? W.LowiSellerZone : null;
    let tab = 'shop';
    try { tab = ({ sz: 'sz', kitchen: 'kitchen', home: 'home' })[localStorage.getItem(TKEY)] || 'shop'; } catch (e) { tab = 'shop'; }
    const onSz = () => tab === 'sz' && !!SZ();
    /* Oct 24: the third tab, Kitchen (kitchen-core.js): what you have at home + the shopping cart (= the shopping list) */
    const K = W.LowiKitchenCore && W.LowiKitchenCore.parse ? W.LowiKitchenCore : null;
    const Q = W.LowiQuickAdd && W.LowiQuickAdd.html ? W.LowiQuickAdd : null; /* Oct 26 quick "+" on product rows (MAYA-HANDOFF 0.35) */
    /* Oct 26: the Kitchen moved to Cook (kitchen-game.js, Cook > Kitchen; MAYA-HANDOFF 0.19). While that game is loaded, Shop has
       no Kitchen tab, and anything that asks for it opens Cook > Kitchen instead. The data (lowispike.kitchen.v1) is the same. */
    const KG = () => (W.LowiKitchenGame && W.LowiKitchenGame.open ? W.LowiKitchenGame : null);
    const kitTab = () => !!K && !KG();
    const onKit = () => tab === 'kitchen' && kitTab();
    /* Oct 27, 2026 (Emmanuel: "Vielleicht möchte 'Von zu Hause einkaufen' seine eigene Sektion haben ... neben Supermarkt,
       Seller Zone und Hilf mit"): Shop from home (week-basket.js) is its own tab now, drawn inside Shop instead of a big card on
       top of the Supermarket list. */
    const WB = () => (W.LowiWeekBasket && W.LowiWeekBasket.mount ? W.LowiWeekBasket : null);
    const homeTab = () => !!WB();
    const onHome = () => tab === 'home' && homeTab();
    const onShop = () => !onSz() && !onKit() && !onHome();
    const ic = {
        scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3M8 9v6M11 9v6M14 9v6M17 9v6"/></svg>',
        gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7C10.5 4 7 4 7 6s3 1 5 1zm0 0c1.5-3 5-3 5-1s-3 1-5 1z"/></svg>',
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
    /* the list as it was before the last Buy again fill, for its Undo; any other snack action drops it */
    let snackUndo = null;
    function loggedSnacks() {
        try { const st = W.LowiVitalsBridge && W.LowiVitalsBridge.state && W.LowiVitalsBridge.state(); return ((st && st.logs) || []).filter(l => l && l.slot === 'snack').slice().reverse().map(l => l.t || l.n); } catch (e) { return []; }
    }
    function snackHTML() {
        const v = C.snackView(snacks, loggedSnacks());
        const rows = v.buy.map(i => '<li class="stp-snack"><button type="button" class="stp-snack-tick" data-spend="1" data-stp-snack-got="' + esc(i.id) + '" aria-label="' + esc(T('Bought ', 'Gekauft: ', 'Comprado: ') + i.n) + '"><span aria-hidden="true"></span></button><b>' + esc(i.n) + '</b>' +
            '<button type="button" class="stp-snack-x" data-stp-snack-drop="' + esc(i.id) + '" aria-label="' + esc(T('Remove ', 'Entfernen: ', 'Quitar: ') + i.n) + '">' + ic.x + '</button></li>').join('');
        /* Oct 26 (Emmanuel: "a buy again auto fill option. Recent or something, but not stack it up like that"): one row, never a
           pill per snack. A one-line preview of the recent snacks; one tap puts them all back on the list (C.snackRefill); Undo
           right after brings the list back as it was. */
        let again = '';
        if (snackUndo) {
            const k = snackUndo.n;
            again = '<div class="stp-again stp-again-done" role="status"><span class="stp-again-ic" aria-hidden="true">\u2713</span><span class="stp-again-t"><b>' +
                esc(k === 1 ? T('1 recent snack is back on your list', '1 Snack ist wieder auf deiner Liste', '1 snack vuelve a tu lista') : T(k + ' recent snacks are back on your list', k + ' Snacks sind wieder auf deiner Liste', k + ' snacks vuelven a tu lista')) +
                '</b></span><button type="button" class="stp-again-undo" data-spend="1" data-stp-snack-undo="1">' + esc(T('Undo', 'Rückgängig', 'Deshacer')) + '</button></div>';
        } else if (v.again.length) {
            const n = v.again.length, names = v.again.join(' · ');
            /* BH-042: Buy again and its Undo swap places under the finger: data-spend keeps a double tap from pressing both */
            again = '<button type="button" class="stp-again" data-spend="1" data-stp-snack-refill="1" aria-label="' +
                esc(T('Buy again: put your ' + n + ' recent snacks back on the list: ', 'Wieder kaufen: deine ' + n + ' letzten Snacks wieder auf die Liste: ', 'Comprar otra vez: vuelve a poner tus ' + n + ' snacks recientes en la lista: ') + v.again.join(', ')) + '">' +
                '<span class="stp-again-ic" aria-hidden="true">\u21bb</span><span class="stp-again-t" aria-hidden="true"><b>' + esc(T('Buy again', 'Wieder kaufen', 'Comprar otra vez')) + ' <em>· ' + esc(T('recent', 'zuletzt', 'reciente')) + '</em></b><small>' + esc(names) + '</small></span>' +
                '<span class="stp-again-add" aria-hidden="true">' + esc(T('Add ' + n, n + ' dazu', 'Añadir ' + n)) + '</span></button>';
        }
        return '<section class="stp-snacks" aria-label="' + esc(T('Snacks to buy', 'Snacks zum Einkaufen', 'Snacks para comprar')) + '"><h4 class="stp-h4">\u{1F95C} ' + esc(T('Snacks to buy', 'Snacks zum Einkaufen', 'Snacks para comprar')) + (v.buy.length ? ' <i>' + v.buy.length + '</i>' : '') + '</h4>' +
            (rows ? '<ul class="stp-snack-list">' + rows + '</ul>' : '<p class="stp-snack-none">' + esc(T('Only snacks you still need to buy. Tick one when it’s in your bag.', 'Nur Snacks, die du noch kaufen willst. Hak sie ab, wenn sie in der Tasche sind.', 'Solo los snacks que aún vas a comprar. Márcalos cuando estén en tu bolsa.')) + '</p>') +
            '<form class="stp-snack-add" data-stp-snack-form="1"><input type="text" name="snack" maxlength="60" autocomplete="off" enterkeyhint="done" placeholder="' + esc(T('Add a snack, like bell pepper', 'Snack hinzufügen, z. B. Paprika', 'Añade un snack, p. ej. pimiento')) + '" aria-label="' + esc(T('Add a snack to buy', 'Snack zum Einkaufen hinzufügen', 'Añadir snack para comprar')) + '"><button type="submit" class="stp-pill">' + esc(T('Add', 'Hinzufügen', 'Añadir')) + '</button></form>' + again + '</section>';
    }
    function repaintSnacks(focusAgain) {
        const el = ov && ov.querySelector('.stp-snacks');
        if (!el) return;
        const w = D.createElement('div'); w.innerHTML = snackHTML();
        const nw = w.firstChild;
        el.replaceWith(nw);
        const sn = ov.querySelector('.stp-snackbox-n'); if (sn) { const n = C.snackView(snacks).buy.length; sn.textContent = n; sn.hidden = !n; }
        /* after Buy again / Undo the button under the finger is gone: keep focus in the row (Undo, else the fill button) */
        if (focusAgain) { const f = nw.querySelector('[data-stp-snack-undo],[data-stp-snack-refill]') || nw.querySelector('.stp-snack-add input'); if (f && f.tagName === 'BUTTON') try { f.focus({ preventScroll: true }); } catch (e) {} }
    }
    function onSubmit(e) {
        const f = e.target;
        if (f && f.getAttribute && f.getAttribute('data-stp-where')) {
            e.preventDefault();
            const i = f.querySelector('input[name="where"]'); if (i) try { i.blur(); } catch (x) {}
            findPlace(i ? i.value : '');
            return;
        }
        if (f && f.getAttribute && f.getAttribute('data-stp-kit-form')) { e.preventDefault(); kitSubmit(f); return; }
        if (!f || !f.getAttribute || !f.getAttribute('data-stp-snack-form')) return;
        e.preventDefault();
        const inp = f.querySelector('input[name="snack"]'), v = inp ? inp.value : '';
        if (!String(v).trim()) return;
        snackUndo = null;
        saveSnacks(C.snackAdd(snacks, v));
        repaintSnacks();
        const ni = ov && ov.querySelector('.stp-snack-add input'); if (ni) ni.focus();
    }
    function snackClick(t) {
        const b = t.closest('[data-stp-snack-got],[data-stp-snack-drop],[data-stp-snack-qv],[data-stp-snack-refill],[data-stp-snack-undo]');
        if (!b) return false;
        if (b.hasAttribute('data-stp-snack-refill')) {
            const r = C.snackRefill(snacks, C.snackView(snacks, loggedSnacks()).again);
            if (r.added) { const prev = snacks; saveSnacks(r.list); snackUndo = { list: prev, n: r.added }; }
            repaintSnacks(true);
            return true;
        }
        if (b.hasAttribute('data-stp-snack-undo')) {
            if (snackUndo) saveSnacks(snackUndo.list);
            snackUndo = null;
            repaintSnacks(true);
            return true;
        }
        snackUndo = null;
        if (b.hasAttribute('data-stp-snack-got')) saveSnacks(C.snackGot(snacks, b.getAttribute('data-stp-snack-got')));
        else if (b.hasAttribute('data-stp-snack-drop')) saveSnacks(C.snackDrop(snacks, b.getAttribute('data-stp-snack-drop')));
        else { saveSnacks(C.snackAdd(snacks, b.getAttribute('data-stp-snack-qv'))); b.disabled = true; b.textContent = T('✓ On your snack list', '✓ Auf deiner Snackliste', '✓ En tu lista de snacks'); }
        repaintSnacks();
        return true;
    }

    /* ---------------- Kitchen (Oct 24, first simple version; HANDOFF-shop-kitchen.md) ----------------
       At home: a "wardrobe" for food, private, lowispike.kitchen.v1 (travels with the account like every lowispike.* key).
       Shopping cart: the existing shopping list (LOWI_SHELF in index.html), never a second list. Bought -> into the Kitchen.
       Taken out of the Kitchen -> "+ Buy again" is offered once; nothing is ever added by itself. */
    let kit = null, kitGone = null, kitMsg = '';
    function kitLoad() { if (!K) return; let raw = null; try { raw = localStorage.getItem(K.KEY); } catch (e) {} kit = K.parse(raw); }
    function kitSave(next) {
        kit = next; try { localStorage.setItem(K.KEY, JSON.stringify(kit)); } catch (e) {}
        try { W.dispatchEvent(new CustomEvent('lowi:kitchen', { detail: { count: K.count(kit) } })); } catch (e) {}
    }
    const shelf = () => (W.LOWI_SHELF && W.LOWI_SHELF.listOpen && W.LOWI_SHELF.dropList ? W.LOWI_SHELF : null);
    function cartItems() { const sh = shelf(); try { return sh ? sh.listOpen(true) : []; } catch (e) { return []; } }
    function cartAdd(name) { const sh = shelf(), n = String(name || '').trim().slice(0, 60); if (!sh || !n) return 0; try { return sh.addIngredients([{ n }], '') || 0; } catch (e) { return 0; } }
    function kitDay(at) { try { return new Date(at).toLocaleDateString(lang(), { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
    function kitForm(where, ph, label) {
        return '<form class="stp-snack-add stp-kit-add" data-stp-kit-form="' + where + '"><input type="text" name="kit" maxlength="60" autocomplete="off" enterkeyhint="done" placeholder="' + esc(ph) + '" aria-label="' + esc(label) + '"><button type="submit" class="stp-pill">' + esc(T('Add', 'Hinzufügen', 'Añadir')) + '</button></form>';
    }
    function kitHTML() {
        kitLoad();
        const items = K.view(kit), sh = shelf(), cv = K.cartView(cartItems());
        const head = '<div class="stp-head stp-kit-head"><h3>' + esc(T('Your kitchen', 'Deine Küche', 'Tu cocina')) + '</h3><p>' +
            esc(T('What you have at home, and what you still want to buy. Only you see this.', 'Was du zu Hause hast und was du noch kaufen willst. Nur du siehst das.', 'Lo que tienes en casa y lo que aún quieres comprar. Solo tú lo ves.')) + '</p></div>';
        const msg = '<p class="stp-kit-msg' + (kitMsg ? '' : ' none') + '" role="status" aria-live="polite">' + esc(kitMsg) + '</p>';
        const gone = kitGone ? '<div class="stp-kit-gone"><small>' + esc(T('Taken out: ', 'Rausgenommen: ', 'Sacado: ') + kitGone.n) + '</small>' +
            (sh ? '<button type="button" class="stp-chip" data-stp-kit="again">' + esc(T('+ Buy again', '+ Wieder kaufen', '+ Comprar otra vez')) + '</button>' : '') + '</div>' : '';
        const home = '<section class="stp-kit-sec stp-kit-home" aria-label="' + esc(T('At home', 'Zu Hause', 'En casa')) + '"><h4 class="stp-h4">\u{1F9FA} ' + esc(T('At home', 'Zu Hause', 'En casa')) + (items.length ? ' <i>' + items.length + '</i>' : '') + '</h4>' + gone +
            (items.length ? '<ul class="stp-snack-list">' + items.map(i => '<li class="stp-snack stp-kit-row"><span class="stp-kit-t"><b>' + esc(i.n) + '</b><small>' +
                esc((i.from === 'cart' ? T('Bought ', 'Gekauft am ', 'Comprado el ') : T('Added ', 'Dazu am ', 'Añadido el ')) + kitDay(i.at)) + '</small></span>' +
                '<button type="button" class="stp-snack-x" data-stp-kit-drop="' + esc(i.id) + '" aria-label="' + esc(T('Take out of the kitchen: ', 'Aus der Küche nehmen: ', 'Sacar de la cocina: ') + i.n) + '">' + ic.x + '</button></li>').join('') + '</ul>'
                : '<p class="stp-snack-none">' + esc(T('Nothing here yet. Add what you have at home, or tap Bought in your shopping cart.', 'Noch leer. Trag ein, was du zu Hause hast, oder tipp im Einkaufswagen auf Gekauft.', 'Aún está vacío. Añade lo que tienes en casa o toca Comprado en tu carrito.')) + '</p>') +
            kitForm('home', T('Add something you have, like eggs', 'Etwas hinzufügen, z. B. Eier', 'Añade algo que tengas, p. ej. huevos'), T('Add something you have at home', 'Etwas hinzufügen, das du zu Hause hast', 'Añadir algo que tienes en casa')) + '</section>';
        const cart = !sh ? '' : '<section class="stp-kit-sec stp-kit-cart" aria-label="' + esc(T('Shopping cart', 'Einkaufswagen', 'Carrito')) + '"><h4 class="stp-h4">\u{1F6D2} ' + esc(T('Shopping cart', 'Einkaufswagen', 'Carrito')) + (cv.buy.length ? ' <i>' + cv.buy.length + '</i>' : '') + '</h4>' +
            '<p class="stp-kit-sub">' + esc(T('To buy later. It’s the same list as your shopping list.', 'Für später zum Einkaufen. Das ist dieselbe Liste wie deine Einkaufsliste.', 'Para comprar más tarde. Es la misma lista que tu lista de la compra.')) + '</p>' +
            (cv.buy.length ? '<ul class="stp-snack-list">' + cv.buy.map(i => '<li class="stp-snack stp-kit-row"><span class="stp-kit-t"><b>' + esc(i.n) + '</b>' + (i.store ? '<small>' + esc(i.store) + '</small>' : '') + '</span>' +
                '<button type="button" class="stp-chip stp-kit-got" data-spend="1" data-stp-kit-got="' + esc(i.id) + '" aria-label="' + esc(T('Bought, put in the kitchen: ', 'Gekauft, in die Küche: ', 'Comprado, a la cocina: ') + i.n) + '">' + esc(T('✓ Bought', '✓ Gekauft', '✓ Comprado')) + '</button>' +
                '<button type="button" class="stp-snack-x" data-stp-kit-cdrop="' + esc(i.id) + '" aria-label="' + esc(T('Remove from the cart: ', 'Aus dem Einkaufswagen nehmen: ', 'Quitar del carrito: ') + i.n) + '">' + ic.x + '</button></li>').join('') + '</ul>'
                : '<p class="stp-snack-none">' + esc(T('Nothing to buy yet. Add something here, or tap + Shopping cart on a product in the Supermarket tab.', 'Noch nichts zu kaufen. Trag hier etwas ein oder tipp bei einem Produkt im Supermarkt auf + Einkaufswagen.', 'Aún no hay nada que comprar. Añade algo aquí o toca + Carrito en un producto del Supermercado.')) + '</p>') +
            (cv.got.length ? '<div class="stp-kit-gone"><small>' + esc(T(cv.got.length + ' ticked off in the shop', cv.got.length + ' im Laden abgehakt', cv.got.length + ' marcados en la tienda')) + '</small><button type="button" class="stp-chip" data-stp-kit="gotall">' + esc(T('Put in the kitchen', 'In die Küche', 'A la cocina')) + '</button></div>' : '') +
            kitForm('cart', T('Add something to buy, like oat flakes', 'Etwas zum Kaufen, z. B. Haferflocken', 'Algo para comprar, p. ej. copos de avena'), T('Add something to buy', 'Etwas zum Kaufen hinzufügen', 'Añadir algo para comprar')) + '</section>';
        return shell(head + '<div class="stp-scroll stp-kit" data-noi18n>' + msg + home + cart + '</div>' + footBtns(''));
    }
    /* move one cart entry into the Kitchen: it leaves the list, it shows up at home (once, even if it was already there) */
    function kitFromCart(it) {
        const n = K.fromCartName(it.n), had = K.has(kit, n);
        if (n && !had) kitSave(K.add(kit, n, Date.now(), 'cart'));
        try { shelf().dropList(it.id); } catch (e) {}
        return { n, had };
    }
    function kitClick(t) {
        if (!onKit()) return false;
        const b = t.closest('[data-stp-kit],[data-stp-kit-got],[data-stp-kit-cdrop],[data-stp-kit-drop]');
        if (!b) return false;
        kitLoad();
        const sh = shelf(), cart = cartItems();
        if (b.hasAttribute('data-stp-kit-got')) {
            const it = cart.find(i => i.id === b.getAttribute('data-stp-kit-got'));
            if (it && sh) { const r = kitFromCart(it); kitMsg = (r.had ? T('Already in your kitchen: ', 'Schon in deiner Küche: ', 'Ya está en tu cocina: ') : T('In your kitchen now: ', 'Jetzt in deiner Küche: ', 'Ya en tu cocina: ')) + r.n; }
            kitGone = null;
        } else if (b.hasAttribute('data-stp-kit-cdrop')) {
            const it = cart.find(i => i.id === b.getAttribute('data-stp-kit-cdrop'));
            if (it && sh) { try { sh.dropList(it.id); } catch (e) {} kitMsg = T('Taken out of the cart: ', 'Aus dem Einkaufswagen genommen: ', 'Quitado del carrito: ') + it.n; }
            kitGone = null;
        } else if (b.hasAttribute('data-stp-kit-drop')) {
            const r = K.drop(kit, b.getAttribute('data-stp-kit-drop'));
            if (r.gone) { kitSave(r.state); kitGone = r.gone; kitMsg = ''; }
        } else if (b.getAttribute('data-stp-kit') === 'again') {
            if (kitGone) { const n = kitGone.n; kitMsg = (cartAdd(n) ? T('In your shopping cart: ', 'Im Einkaufswagen: ', 'En tu carrito: ') : T('Already in your shopping cart: ', 'Schon im Einkaufswagen: ', 'Ya está en tu carrito: ')) + n; }
            kitGone = null;
        } else if (b.getAttribute('data-stp-kit') === 'gotall') {
            const got = K.cartView(cart).got; got.forEach(kitFromCart);
            kitMsg = T('In your kitchen now: ', 'Jetzt in deiner Küche: ', 'Ya en tu cocina: ') + got.map(i => K.fromCartName(i.n)).join(', ');
            kitGone = null;
        } else return false;
        paint('keep');
        return true;
    }
    function kitSubmit(f) {
        const where = f.getAttribute('data-stp-kit-form'), inp = f.querySelector('input[name="kit"]'), v = inp ? String(inp.value || '').trim() : '';
        if (!v) return;
        kitLoad(); kitGone = null;
        if (where === 'cart') kitMsg = (cartAdd(v) ? T('In your shopping cart: ', 'Im Einkaufswagen: ', 'En tu carrito: ') : T('Already in your shopping cart: ', 'Schon im Einkaufswagen: ', 'Ya está en tu carrito: ')) + v.slice(0, 60);
        else if (K.has(kit, v)) kitMsg = T('Already in your kitchen: ', 'Schon in deiner Küche: ', 'Ya está en tu cocina: ') + v.slice(0, 60);
        else { kitSave(K.add(kit, v, Date.now(), 'me')); kitMsg = T('In your kitchen now: ', 'Jetzt in deiner Küche: ', 'Ya en tu cocina: ') + K.view(kit)[0].n; }
        paint('keep');
        const ni = ov && ov.querySelector('[data-stp-kit-form="' + where + '"] input'); if (ni) try { ni.focus({ preventScroll: true }); } catch (e) {}
    }

    function shell(inner) {
        return '<div class="stp-card' + (onSz() ? ' stp-on-sz' : onKit() ? ' stp-on-kit' : onHome() ? ' stp-on-home' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(T('What can I buy here?', 'Was kann ich hier kaufen?', '¿Qué puedo comprar aquí?')) + '">' + tabsHTML() + inner + '</div>';
    }
    /* Oct 23: the two tabs, a living-bubble pill on top of the panel; the thumb reaches both */
    function tabsHTML() {
        const Z = SZ(); if (!Z && !K && !homeTab()) return '';
        if (K && !kit) kitLoad();
        const b = (id, icon, txt, n) => '<button type="button" class="stp-tab' + (tab === id ? ' on' : '') + '" role="tab" aria-selected="' + (tab === id) + '" data-stp-tab="' + id + '"><span aria-hidden="true">' + icon + '</span><b>' + esc(txt) + '</b>' + (n ? '<i>' + n + '</i>' : '') + '</button>';
        /* Oct 25 (Emmanuel: Give a hand gets "its own place next to Supermarket, Seller Zone and Kitchen", not inside Kitchen):
           the fourth peer. A door, not a pane: it opens the Give a hand panel on top of Shop and is never the remembered tab. */
        const G = giftDoor();
        /* Oct 27: Shop from home sits right next to Supermarket, both are about the weekly shop. Short words, so four tabs fit an
           iPhone SE on one line each: Zu Hause / From home / Desde casa */
        const H = homeTab();
        const n = (Z ? 1 : 0) + (kitTab() ? 1 : 0) + (G ? 1 : 0) + (H ? 1 : 0) + 1;
        return '<div class="stp-tabs' + (n > 2 ? ' stp-tabs3' : '') + (n > 3 ? ' stp-tabs4' : '') + (n > 4 ? ' stp-tabs5' : '') + '" role="tablist" aria-label="' + esc(T('Shop', 'Einkaufen', 'Comprar')) + '">' +
            b('shop', '\u{1F6D2}', T('Supermarket', 'Supermarkt', n > 3 ? 'Súper' : 'Supermercado')) + (H ? b('home', '\u{1F3E0}', T('From home', 'Zu Hause', 'Desde casa')) : '') + (Z ? b('sz', '\u{1F6CD}\uFE0F', Z.name(), Z.count ? Z.count() : 0) : '') +
            (kitTab() ? b('kitchen', '\u{1F9FA}', T('Kitchen', 'Küche', 'Cocina'), K.count(kit)) : '') +
            (G ? b('gift', '\u{1F91D}', n > 3 ? T('Help out', 'Hilf mit', 'Ayudar') : T('Give a hand', 'Hilf mit', 'Echa una mano')) : '') + '</div>';
    }
    function szHTML() {
        const Z = SZ();
        return shell(Z.inlineHeadHTML() + '<div class="stp-scroll stp-sz">' + Z.inlineHTML() + '</div>' + footBtns(''));
    }
    /* Oct 19 food paths (E-man: Shop "so complicated and so hidden"): Shop is the one place for shopping. Two plain ways on from
       here: scan products in the shop (the shopping camera: check and add to your list, it never logs a meal) and your shopping list. */
    /* Oct 25 Give a hand (gift-basket.js owns the panel): its own tab in the bar above, behind the same server gate the old row
       had (only once the server has the basket table; until then ask the server again, and lowi:gift-ready repaints Shop) */
    function giftDoor() {
        const GB = W.LowiGiftBasket;
        try { if (GB && GB.serverReady && GB.serverReady()) return true; if (GB && GB.probe) GB.probe(); } catch (x) {}
        return false;
    }
    /* Oct 26 (Emmanuel, MAYA-HANDOFF 0.22: "Remove Seller Zone in Supermarket. Seller Zone has its own section"): the Seller Zone
       strip is no longer inside the Supermarket tab; Seller Zone keeps its own tab ("our Amazon"). The Shopping list pill became
       the Cart (Warenkorb / Carrito), the step the viral grocery apps have: the same list, with quantities and an estimate. */
    function cartN() { const sh = shelf(); try { return sh && sh.cartLines ? sh.cartLines().reduce((a, l) => a + l.q, 0) : 0; } catch (e) { return 0; } }
    /* Oct 27 (Emmanuel: "So overwhelming, just fix that"): the Cart is a quiet round button in the corner of the title with its
       count, always within reach, no longer a second big button next to Scan in the shop. */
    function cartBtnHTML() {
        const n = cartN(), name = T('Cart', 'Warenkorb', 'Carrito');
        return '<button type="button" class="stp-cartbtn" data-stp="cart" aria-label="' + esc(name + (n ? ', ' + n : '')) + '" title="' + esc(name) + '">' + ic.cart + (n ? '<i class="stp-cart-n" aria-hidden="true">' + n + '</i>' : '') + '</button>';
    }
    const hasCart = () => !!(shelf() && shelf().cartLines);
    /* the title row: a short question + the Cart in the corner */
    function titleRow(text) {
        return '<div class="stp-titlerow"><h3>' + esc(text) + '</h3>' + (hasCart() ? cartBtnHTML() : '') + '</div>';
    }
    /* the one clear thing to do in the shop, pinned at the bottom next to the X */
    function scanBtn() {
        if (!(W.LowiShopScan && W.LowiShopScan.open)) return '';
        return '<button type="button" class="stp-go stp-scanshop" data-stp="scanshop">' + ic.scan + '<span>' + esc(T('Scan in the shop', 'Im Laden scannen', 'Escanear en la tienda')) + '</span></button>';
    }
    /* the snack list (with Buy again) folded into one quiet line; it opens in place and remembers that it is open */
    let snackOpen = false;
    function snackBox() {
        const v = C.snackView(snacks), n = v.buy.length;
        return '<details class="stp-snackbox"' + (snackOpen ? ' open' : '') + '><summary><span aria-hidden="true">\ud83e\udd5c</span><b>' + esc(T('My snack list', 'Meine Snackliste', 'Mi lista de snacks')) + '</b>' +
            '<i class="stp-snackbox-n"' + (n ? '' : ' hidden') + '>' + n + '</i><span class="stp-snackbox-go" aria-hidden="true">\u203a</span></summary>' + snackHTML() + '</details>';
    }
    function homeHTML() {
        return shell('<div class="stp-home"></div>' + footBtns(''));
    }
    function mountHome() {
        const el = ov && ov.querySelector('.stp-home'); if (!el || !WB()) return;
        try {
            WB().mount(el, { store: S.range, head: () => (hasCart() ? cartBtnHTML() : ''), onCart: openCart, cartOn: () => hasCart() });
        } catch (e) {}
    }
    function unmountHome() { try { if (WB() && WB().unmount) WB().unmount(); } catch (e) {} }
    /* the Cart sheet: lines with photo, store, reported price, a - n + stepper and remove; an estimated total only from prices people
       reported on the shelf (never invented); Go shopping opens the shopping list in shop mode */
    function cartHTML() {
        const sh = shelf(), CC = W.LowiCartCore;
        let ls = [], tot = { sum: 0, priced: 0, all: 0, complete: false };
        try { ls = sh.cartLines(); tot = sh.cartTotal(); } catch (e) {}
        const money = v => (CC ? CC.money(v, ['en', 'de', 'es'][li()]) : '€' + v.toFixed(2));
        const n = ls.reduce((a, l) => a + l.q, 0);
        const row = l => '<li class="stp-cart-row" data-stp-cart-id="' + esc(l.id) + '">' +
            '<span class="stp-cart-ph" aria-hidden="true">' + (l.photo ? '<img src="' + esc(l.photo) + '" alt="" loading="lazy">' : esc(l.e)) + '</span>' +
            '<span class="stp-cart-txt"><b>' + esc(foodName(l.n)) + '</b><small>' + esc([l.store, l.p != null ? money(l.p) + T(' each', ' pro Stück', ' c/u') : T('no price reported yet', 'noch kein Preis gemeldet', 'aún sin precio')].filter(Boolean).join(' · ')) + '</small></span>' +
            '<span class="stp-cart-q" role="group" aria-label="' + esc(T('Quantity of ', 'Menge von ', 'Cantidad de ') + l.n) + '">' +
            '<button type="button" class="stp-cart-step"' + (l.q <= 1 ? ' data-spend="1"' : '') + ' data-stp-cq="' + esc(l.id) + '" data-stp-cd="-1" aria-label="' + esc((l.q > 1 ? T('One less: ', 'Eins weniger: ', 'Uno menos: ') : T('Remove from the cart: ', 'Aus dem Warenkorb nehmen: ', 'Quitar del carrito: ')) + l.n) + '">\u2212</button>' +
            '<b aria-live="polite">' + l.q + '</b>' +
            '<button type="button" class="stp-cart-step" data-stp-cq="' + esc(l.id) + '" data-stp-cd="1" aria-label="' + esc(T('One more: ', 'Eins mehr: ', 'Uno más: ') + l.n) + '"' + (CC && l.q >= CC.MAX_Q ? ' disabled' : '') + '>+</button></span></li>';
        const totalHTML = !ls.length ? '' : tot.priced
            ? '<p class="stp-cart-total"><span>' + esc(tot.complete ? T('Estimated total', 'Geschätzte Summe', 'Total estimado') : T('Estimate so far', 'Bisher geschätzt', 'Estimado hasta ahora')) + '</span><b>' + esc(money(tot.sum)) + '</b></p>' +
              '<p class="stp-fine">' + esc(T('From prices people reported on the shelf. In the shop it can differ.', 'Aus Preisen, die Leute am Regal gemeldet haben. Im Laden kann es anders sein.', 'Con precios que la gente ha visto en la tienda. Allí puede variar.') +
                (tot.complete ? '' : ' ' + T((tot.all - tot.priced) + ' of ' + tot.all + ' have no price yet.', (tot.all - tot.priced) + ' von ' + tot.all + ' haben noch keinen Preis.', (tot.all - tot.priced) + ' de ' + tot.all + ' aún no tienen precio.'))) + '</p>'
            : '<p class="stp-fine">' + esc(T('Nobody has reported prices for these yet, so there’s no total.', 'Für diese Sachen hat noch niemand Preise gemeldet, deshalb gibt es keine Summe.', 'Nadie ha indicado aún precios para esto, así que no hay total.')) + '</p>';
        const scan = W.LowiShopScan && W.LowiShopScan.open, list = typeof W.tdShopOpen === 'function', G = giftDoor();
        /* Oct 26 2026 (MAYA-HANDOFF 0.34, Emmanuel's iPad screenshot): the scan pill's icon had no size (212 px on iPad), so both
           pills grew into huge circles that spilled out of the sheet. Now: title fixed on top, the list scrolls, and the actions
           sit under it: Go shopping full width, then two matching pills with the same 18 px icon. "Someone else pays" turns
           the whole cart into a Give a hand basket (gift-basket.js fromCart). */
        const two = (scan ? '<button type="button" class="stp-pill stp-cart-act" data-stp="scanshop">' + ic.scan + '<span>' + esc(T('Scan in the shop', 'Im Laden scannen', 'Escanear en la tienda')) + '</span></button>' : '') +
            (G ? '<button type="button" class="stp-pill stp-cart-act" data-stp="giftcart" data-spend="1">' + ic.gift + '<span>' + esc(T('Someone else pays', 'Jemand anderes zahlt', 'Que pague otra persona')) + '</span></button>' : '');
        const acts = !ls.length ? '' : '<div class="stp-cart-acts">' +
            (list ? '<button type="button" class="stp-go stp-cart-go" data-stp="mylist">' + ic.cart + '<span>' + esc(T('Go shopping', 'Einkaufen gehen', 'Ir a comprar')) + '</span></button>' : '') +
            (two ? '<div class="stp-cart-two">' + two + '</div>' : '') + '</div>';
        return '<div class="stp-qv-card stp-cart-card" role="dialog" aria-modal="true" aria-labelledby="stpCartT">' +
            '<div class="stp-cart-head"><h3 id="stpCartT">\u{1F6D2} ' + esc(T('Cart', 'Warenkorb', 'Carrito')) + (n ? ' <i class="stp-cart-n">' + n + '</i>' : '') + '</h3>' +
            '<p class="stp-qv-sub">' + esc(T('It’s the same list as your shopping list.', 'Das ist dieselbe Liste wie deine Einkaufsliste.', 'Es la misma lista que tu lista de la compra.')) + '</p></div>' +
            '<div class="stp-qv-scroll stp-cart-scroll">' +
            (ls.length ? '<ul class="stp-cart-list">' + ls.map(row).join('') + '</ul>' : '<p class="stp-snack-none">' + esc(T('Your cart is empty. Tap a product, then + Cart.', 'Dein Warenkorb ist leer. Tipp auf ein Produkt und dann auf + Warenkorb.', 'Tu carrito está vacío. Toca un producto y luego + Carrito.')) + '</p>') +
            totalHTML + '</div>' + acts +
            '<div class="stp-foot"><button type="button" class="stp-pill" data-stp="qv-close">' + esc(T('‹ Back to list', '‹ Zurück zur Liste', '‹ Volver a la lista')) + '</button>' +
            '<button type="button" class="stp-orb stp-close" data-stp="qv-close" aria-label="' + esc(T('Close cart', 'Warenkorb schließen', 'Cerrar carrito')) + '">' + ic.x + '</button></div></div>';
    }
    let cartOpen = false;
    function openCart() {
        if (!ov || !shelf() || !shelf().cartLines) return;
        if (qv) qv.remove();
        qvFrom = -1; cartOpen = true;
        qv = D.createElement('div');
        qv.className = 'stp-qv stp-cartv';
        qv.innerHTML = cartHTML();
        ov.appendChild(qv);
        const card = ov.querySelector('.stp-card'); if (card) card.setAttribute('aria-hidden', 'true');
        requestAnimationFrame(() => { if (qv) { qv.classList.add('in'); const h = qv.querySelector('.stp-pill[data-stp="qv-close"]'); if (h) try { h.focus({ preventScroll: true }); } catch (e) {} } });
    }
    /* a stepper tap: repaint the sheet in place and keep focus on the same button (or the next row when a line went away) */
    function cartClick(t) {
        const b = t.closest('[data-stp-cq]'); if (!b) return false;
        const sh = shelf(); if (!sh || !sh.setQty || b.disabled) return true;
        const id = b.getAttribute('data-stp-cq'), d = +b.getAttribute('data-stp-cd') || 0;
        const l = (sh.cartLines() || []).find(x => x.id === id); if (!l) return true;
        const r = sh.setQty(id, l.q + d);
        const sc0 = qv.querySelector('.stp-cart-scroll'), top = sc0 ? sc0.scrollTop : 0; /* repaint keeps the list where it was */
        qv.innerHTML = cartHTML();
        const sc1 = qv.querySelector('.stp-cart-scroll'); if (sc1 && top) sc1.scrollTop = top;
        const keep = r === 'set' ? qv.querySelector('[data-stp-cq="' + id.replace(/"/g, '') + '"][data-stp-cd="' + d + '"]') : qv.querySelector('.stp-cart-step') || qv.querySelector('[data-stp="qv-close"]');
        if (keep) try { keep.focus({ preventScroll: true }); } catch (e) {}
        const cb = ov && ov.querySelector('.stp-card .stp-cartbtn'); if (cb) cb.outerHTML = cartBtnHTML();
        return true;
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
        return shell('<div class="stp-head">' + titleRow(T('Which shop?', 'Welcher Laden?', '¿Qué tienda?')) + '<p>' +
            esc(T('Share your location to see the supermarkets nearest to you, or type a town or postcode.', 'Teil deinen Standort, um die Supermärkte in deiner Nähe zu sehen, oder gib einen Ort oder eine Postleitzahl ein.', 'Comparte tu ubicación para ver los supermercados más cercanos, o escribe una ciudad o un código postal.')) + '</p></div>' +
            '<div class="stp-scroll"><button type="button" class="stp-go" data-stp="locate"' + (busy ? ' disabled aria-busy="true"' : '') + '>' + ic.pin + '<span>' + esc(T('Share my location', 'Meinen Standort teilen', 'Compartir mi ubicación')) + '</span></button>' +
            whereForm() + (msg ? '<p class="stp-msg" role="status">' + esc(msg) + '</p>' : '') + hereHTML() + shopRowsHTML() +
            '<button type="button" class="stp-more stp-skip" data-stp="general">' + esc(T('Skip: show the general lists', 'Überspringen: allgemeine Listen zeigen', 'Omitir: ver las listas generales')) + '</button>' +
            '<h4 class="stp-h4">' + esc(T('Or pick a chain', 'Oder eine Kette wählen', 'O elige una cadena')) + '</h4><div class="stp-chips stp-wrap">' + chains + '</div>' +
            snackBox() + '<p class="stp-fine">' + esc(T('Your location is only used on this phone to look up your address and the shops near you on OpenStreetMap. It isn’t sent to us or saved. Map data © OpenStreetMap contributors. ',
                'Dein Standort wird nur auf diesem Handy genutzt, um deine Adresse und die Läden in der Nähe bei OpenStreetMap nachzuschlagen. Er wird nicht an uns geschickt und nicht gespeichert. Kartendaten © OpenStreetMap-Mitwirkende. ',
                'Tu ubicación solo se usa en este teléfono para buscar tu dirección y las tiendas cercanas en OpenStreetMap. No se nos envía ni se guarda. Datos del mapa © colaboradores de OpenStreetMap. ')) +
            '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">openstreetmap.org/copyright</a></p></div>' +
            footBtns(S.range ? '<button type="button" class="stp-pill" data-stp="list">' + esc(T('Back to list', 'Zurück zur Liste', 'Volver a la lista')) + '</button>' : scanBtn()));
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
        /* 24 Oct 2026: the same three tier words as the scanner card (LowiFoodKnowledge.TIERS) */
        return v === 'JA' ? T('Food check: Everyday', 'Food-Check: Alltag', 'Análisis del alimento: Diario') : v === 'SELTEN' ? T('Food check: Small portion', 'Food-Check: Kleine Portion', 'Análisis del alimento: Porción pequeña') : v === 'NEIN' ? T('Food check: Skip it', 'Food-Check: Lieber nicht', 'Análisis del alimento: Mejor no') : '';
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
        const r = it.r, p = it.p, i = shown.push({ it, failed: !!failed }) - 1, qa = qaOn();
        /* Oct 26 (MAYA-HANDOFF 0.35): with the quick "+" the verdict is a small tag by the name and the quick column sits on the right,
           outside the row button (a button never sits in a button); the row button still opens the product */
        return '<li class="stp-li' + (qa ? ' qa' : '') + '"><button type="button" class="stp-item' + (failed ? ' fail' : '') + '" data-stp-item="' + i + '" aria-haspopup="dialog">' + thumbHTML(p) +
            '<span class="stp-it">' + (qa ? '<span class="stp-nm"><b>' + esc(p.n) + '</b> ' + tagHTML(r, failed) + '</span>' : '<b>' + esc(p.n) + '</b>') + '<small>' + esc([p.b, p.q].filter(Boolean).join(' · ')) +
            (r.typical ? ' · ' + esc(T('typical values, no label online', 'typische Werte, kein Etikett online', 'valores típicos, sin etiqueta en línea')) : '') + '</small><span class="stp-why">' + esc(reason(it)) + '</span></span>' + (qa ? '' : tagHTML(r, failed)) + '</button>' + (qa ? qaCol(i) : '') + '</li>';
    }

    /* ---------------- Oct 26 quick "+" on every product row (MAYA-HANDOFF 0.35, quick-add-core.js) ----------------
       Emmanuel: "while I scroll down, instead of it saying Top, or next to Top, I can just add, add, add ... into my kitchen or my
       cart". "+" puts the product in the Cart (the shopping list, never a second list) and becomes a "- 1 +" stepper in the same
       spot; the house puts it straight into the Kitchen ("I have it"). Only the tapped row's column is redrawn: the list never
       repaints, scrolls or opens the product. Its column has a fixed width, so the row never reflows under the finger. */
    function qaOn() { return !!(Q && shelf() && W.LOWI_SHELF.addIngredients && W.LOWI_SHELF.setQty && W.LOWI_SHELF.cartLines); }
    function qaLines() { const sh = shelf(); try { return sh && sh.cartLines ? sh.cartLines() : []; } catch (e) { return []; } }
    function qaKitItem(p) {
        if (!K) return null; if (!kit) kitLoad(); if (!kit || !Array.isArray(kit.items)) return null;
        const k = Q.norm(p.n), bc = String(p.g || '').replace(/\D/g, '');
        return kit.items.find(x => Q.norm(x.n) === k || (bc && x.p && x.p.bc === bc)) || null;
    }
    function qaState(i) { const s = shown[i]; return s ? Q.state(qaLines(), s.it.p.n, !!qaKitItem(s.it.p)) : null; }
    function qaCol(i) {
        const st = qaState(i); if (!st) return '';
        return '<span class="stp-qa" data-stp-qa-col="' + i + '" data-k="' + st.kind + '">' + Q.html(st, i, shown[i].it.p.n, lang()) + '</span>';
    }
    function qaPaint(i, focusWhat) {
        const col = ov && ov.querySelector('[data-stp-qa-col="' + i + '"]'), st = qaState(i); if (!col || !st) return;
        col.setAttribute('data-k', st.kind);
        col.innerHTML = Q.html(st, i, shown[i].it.p.n, lang());
        if (focusWhat) { /* keyboard and VoiceOver stay on the column: + -> the stepper's +, the last - -> + */
            const f = col.querySelector('[data-stp-qa="' + focusWhat + '"]') || col.querySelector('[data-stp-qa="add"],[data-stp-qa="more"]');
            if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
        }
    }
    /* after the Cart or a quick view closes, or the Kitchen changes: the steppers show the real numbers again */
    function qaRefresh() { if (!ov || !Q) return; ov.querySelectorAll('[data-stp-qa-col]').forEach(c => qaPaint(+c.getAttribute('data-stp-qa-col'))); }
    const qaAt = {}; /* product -> when its control last changed kind (the double tap rule in quick-add-core.js) */
    let qaNoteT = 0, qaUndo = null, qaNoteAt = 0;
    function qaNote(text, undo) {
        const card = ov && ov.querySelector('.stp-card'); if (!card) return;
        let n = card.querySelector('.stp-qa-note');
        if (!n) { n = D.createElement('div'); n.className = 'stp-qa-note'; n.setAttribute('role', 'status'); n.setAttribute('aria-live', 'polite'); card.appendChild(n); }
        qaUndo = undo || null; qaNoteAt = Date.now();
        n.innerHTML = '<span>' + esc(text) + '</span>' + (undo ? '<button type="button" class="stp-qa-undo" data-stp-qa="undo" data-spend="1">' + esc(Q.word(lang(), 'undo')) + '</button>' : '');
        n.classList.add('on'); n.classList.toggle('act', !!undo);
        clearTimeout(qaNoteT); qaNoteT = setTimeout(() => { n.classList.remove('on', 'act'); qaUndo = null; }, undo ? 5000 : 2600);
    }
    function qaCartBtn() { const cb = ov && ov.querySelector('.stp-card .stp-cartbtn'); if (cb) cb.outerHTML = cartBtnHTML(); }
    function qaClick(t, e) {
        const b = t.closest && t.closest('[data-stp-qa]'); if (!b || !Q || !ov) return false;
        const a = b.getAttribute('data-stp-qa'), now = Date.now();
        if (a === 'undo') {
            if (Q.fresh(qaNoteAt, now) || !qaUndo) return true;
            const u = qaUndo; qaUndo = null;
            const n = ov.querySelector('.stp-qa-note'); if (n) n.classList.remove('on', 'act');
            u(); /* shows "Taken back out of your kitchen" */
            return true;
        }
        const i = +b.getAttribute('data-stp-qa-i'), s = shown[i], sh = shelf(); if (!s || !sh) return true;
        const p = s.it.p, key = Q.norm(p.n), before = qaState(i), l = lang();
        if (Q.fresh(qaAt[key] || 0, now)) return true; /* the 2nd tap of a double tap lands on the control that just took the spot */
        let note = '', undo = null;
        if (a === 'add' || (a === 'more' && !before.id)) {
            if (before.id) sh.setQty(before.id, before.q + 1);
            else {
                try { sh.addIngredients([{ n: String(p.n).slice(0, 60) }], ''); } catch (x) {}
                /* the new Cart line gets the product's photo and barcode, so the Cart shows the same picture as the list */
                const ln = Q.lineFor(qaLines(), p.n), st = sh.state && sh.state(), raw = ln && st && Array.isArray(st.list) ? st.list.find(x => String(x.id) === ln.id) : null;
                if (raw) {
                    const img = C.photo(p), bc = String(p.g || '').replace(/\D/g, '');
                    if (img && !raw.photo && /^https:\/\//.test(img)) raw.photo = img;
                    if (bc && !raw.bc) raw.bc = bc;
                    sh.setQty(raw.id, raw.q || 1); /* saves the list */
                }
            }
            note = Q.note(l, 'inCart', p.n);
        } else if (a === 'more') sh.setQty(before.id, before.q + 1);
        else if (a === 'less' && before.id) { sh.setQty(before.id, before.q - 1); if (before.q <= 1) note = Q.note(l, 'outCart', p.n); }
        else if (a === 'kit') {
            if (!K) return true;
            if (!kit) kitLoad();
            if (before.kit) note = Q.note(l, 'already', p.n);
            else {
                const img = C.photo(p), r = K.addProduct(kit, { n: p.n, bc: p.g, img: /^https:\/\//.test(img || '') ? img : '', br: p.b }, now, 'shop');
                kitSave(r.state);
                const id = r.id;
                note = Q.note(l, 'inKit', p.n);
                undo = () => { if (id && !r.had) { kitSave(K.drop(kit, id)); qaPaint(i); qaNote(Q.note(l, 'back', p.n)); } };
            }
        } else return true;
        const after = qaState(i);
        if (after.kind !== before.kind || after.kit !== before.kit) qaAt[key] = now;
        const focused = D.activeElement && b.contains(D.activeElement) || D.activeElement === b;
        qaPaint(i, focused ? (a === 'add' ? 'more' : a === 'less' && after.kind === 'add' ? 'add' : a) : '');
        qaCartBtn();
        if (note) qaNote(note, undo);
        try { if (navigator.vibrate) navigator.vibrate(10); } catch (x) {}
        return true;
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
            (shelf() ? '<button type="button" class="stp-go stp-kit-qv" data-stp-kit-qv="' + esc(p.n) + '">' + esc(T('+ Cart', '+ Warenkorb', '+ Carrito')) + '</button>' : '') +
            '<div class="stp-foot"><button type="button" class="stp-pill" data-stp="qv-close">' + esc(T('‹ Back to list', '‹ Zurück zur Liste', '‹ Volver a la lista')) + '</button>' +
            '<button type="button" class="stp-orb stp-close" data-stp="qv-close" aria-label="' + esc(T('Close product', 'Produkt schließen', 'Cerrar producto')) + '">' + ic.x + '</button></div></div>';
    }
    /* Oct 24: "+ Cart" on a product card puts it on the shopping list, to buy later (Oct 26: the Supermarket's Cart shows it) */
    function qvCart(t) {
        const b = t.closest('[data-stp-kit-qv]'); if (!b || b.disabled) return !!b;
        const n = b.getAttribute('data-stp-kit-qv'), added = cartAdd(n);
        b.disabled = true; b.classList.add('done');
        b.textContent = added ? T('✓ In your cart', '✓ Im Warenkorb', '✓ En tu carrito') : T('✓ Already in your cart', '✓ Schon im Warenkorb', '✓ Ya está en tu carrito');
        const cb = ov && ov.querySelector('.stp-card .stp-cartbtn'); if (cb) cb.outerHTML = cartBtnHTML();
        return true;
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
        const o = qv, wasCart = cartOpen; qv = null; cartOpen = false;
        o.remove();
        if (wasCart && ov) { const cb = ov.querySelector('.stp-card .stp-cartbtn'); if (cb) { cb.outerHTML = cartBtnHTML(); const nb = ov.querySelector('.stp-card .stp-cartbtn'); if (nb) try { nb.focus({ preventScroll: true }); } catch (e) {} } }
        if (!ov) return;
        qaRefresh(); /* Oct 26: the quick "+" steppers show what the Cart or quick view changed */
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
            /* Oct 27 (Emmanuel: "So viel auf einmal"): the product count moved from the top into How the rating works, and Show left
               out is the last chip of the category row instead of a checkbox next to the search */
            const sum = '<p class="stp-sum"><b>' + esc(fmt(c.pass)) + '</b> ' + esc(T('of ' + fmt(c.total) + ' products pass', 'von ' + fmt(c.total) + ' Produkten bestehen', 'de ' + fmt(c.total) + ' productos pasan')) +
                (c.unrated ? ' · ' + esc(T(fmt(c.unrated) + ' without a label', fmt(c.unrated) + ' ohne Etikett', fmt(c.unrated) + ' sin etiqueta')) : '') + '</p>';
            const tog = '<button type="button" class="stp-chip stp-tog' + (showFail ? ' on' : '') + '" data-stp="fails" aria-pressed="' + (showFail ? 'true' : 'false') + '"><span aria-hidden="true">' + (showFail ? '\u2713' : '\u25cc') + '</span>' + esc(T('Show left out', 'Aussortierte zeigen', 'Ver excluidos')) + '</button>';
            inner = '<div class="stp-chips stp-jumps">' + chips + tog + '</div>' +
                built.groups.map(groupHTML).join('') +
                (c.total ? '' : '<p class="stp-none">' + esc(T('Nothing matches that search.', 'Nichts passt zu der Suche.', 'Nada coincide con la búsqueda.')) + '</p>') +
                '<details class="stp-how"><summary>' + esc(T('How the rating works', 'So wird bewertet', 'Cómo se valora')) + '</summary>' + sum + '<p>' +
                esc(T('For each product: carbs and sugar per typical portion from its label (100 g meat or fish, 30 g cheese, 40 g bread, 25 g sweets, 30 g snacks, 250 ml drink, 150 g yoghurt). The same Food check as the scanner card gives the blood sugar impact (Lower, Moderate or Higher) and Everyday, Small portion or Skip it. A product passes with Lower impact, no more than 6 g sugar per portion and no Skip it; Best also needs Everyday.',
                    'Für jedes Produkt: Kohlenhydrate und Zucker pro typischer Portion laut Etikett (100 g Fleisch oder Fisch, 30 g Käse, 40 g Brot, 25 g Süßes, 30 g Snacks, 250 ml Getränk, 150 g Joghurt). Derselbe Food-Check wie auf der Scanner-Karte gibt die Blutzuckerwirkung (Niedrigere, Mittlere oder Höhere) und Alltag, Kleine Portion oder Lieber nicht. Ein Produkt besteht mit niedrigerer Wirkung, höchstens 6 g Zucker pro Portion und ohne Lieber nicht; Top braucht zusätzlich Alltag.',
                    'Para cada producto: carbohidratos y azúcar por porción típica según su etiqueta (100 g de carne o pescado, 30 g de queso, 40 g de pan, 25 g de dulces, 30 g de snacks, 250 ml de bebida, 150 g de yogur). El mismo Food check que la tarjeta del escáner da el impacto en el azúcar en sangre (Menor, Moderado o Mayor) y Diario, Porción pequeña o Mejor no. Un producto pasa con impacto Menor, no más de 6 g de azúcar por porción y sin Mejor no; Mejor necesita además Diario.')) + '</p>' +
                '<p>' + esc(T('Real: product names and label values. Estimated: the blood sugar impact; no glycemic index is guessed. The range lists have no ingredients, so the Food check sees the name and the label only. ', 'Echt: Produktnamen und Etikettwerte. Geschätzt: die Blutzuckerwirkung; es wird kein glykämischer Index geraten. Die Listen haben keine Zutaten, deshalb sieht der Food-Check nur Name und Etikett. ', 'Real: nombres y valores de la etiqueta. Estimado: el impacto en el azúcar en sangre; no se adivina ningún índice glucémico. Las listas no tienen ingredientes, así que el Food check solo ve el nombre y la etiqueta. ') + (data && data.note ? data.note : '')) + '</p>' +
                '<p>' + esc(T('Source: ', 'Quelle: ', 'Fuente: ') + (data && data.source || '') + ' · ' + (data && data.built || '')) + '</p></details>';
        }
        const gen = S.range === 'general' && S.store ? '<p class="stp-fine stp-gen">' + esc(T('We have no product list for this shop’s chain, so this is the general list. Supermarkets mostly carry the same items.', 'Für die Kette dieses Ladens haben wir keine eigene Liste, deshalb siehst du die allgemeine Liste. Supermärkte führen meist dieselben Produkte.', 'No tenemos una lista de esta cadena, así que ves la lista general. Los supermercados suelen tener los mismos productos.')) + '</p>' : '';
        return shell('<div class="stp-head">' + titleRow(T('What can I buy here?', 'Was kann ich hier kaufen?', '¿Qué puedo comprar aquí?')) +
            '<button type="button" class="stp-shop" data-stp="pick">' + ic.cart + '<span>' + esc(storeLine() || label(S.range) || '') + '</span><i>' + esc(T('Change', 'Ändern', 'Cambiar')) + '</i></button>' +
            '<div class="stp-tools"><input type="search" class="stp-q" enterkeyhint="search" autocomplete="off" aria-label="' + esc(T('Search this shop', 'In diesem Laden suchen', 'Buscar en esta tienda')) + '" placeholder="' + esc(T('Search this shop', 'In diesem Laden suchen', 'Buscar en esta tienda')) + '" value="' + esc(q) + '"></div></div>' +
            '<div class="stp-scroll">' + snackBox() + gen + inner +
            '<p class="stp-note">' + esc(T('General food guidance, not medical advice.', 'Allgemeine Ernährungshilfe, keine medizinische Beratung.', 'Orientación general sobre alimentos, no consejo médico.')) + '</p></div>' +
            footBtns(scanBtn()));
    }

    function paint(state) {
        if (!ov) return;
        const sc = ov.querySelector('.stp-scroll'), top = sc ? sc.scrollTop : 0;
        const hadQ = D.activeElement && D.activeElement.classList && D.activeElement.classList.contains('stp-q');
        qv = null; cartOpen = false;
        unmountHome();
        ov.innerHTML = onSz() ? szHTML() : onKit() ? kitHTML() : onHome() ? homeHTML() : view === 'pick' ? pickHTML(state) : listHTML(state);
        if (onHome()) mountHome();
        watchThumbs();
        const sc2 = ov.querySelector('.stp-scroll'); if (sc2 && state === 'keep') sc2.scrollTop = top;
        if (hadQ) { const i = ov.querySelector('.stp-q'); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) {} } }
    }
    function showList() {
        view = 'list';
        if (!S.range) { view = 'pick'; paint(); return; }
        data = null; if (onShop()) paint('loading');
        /* the list loads behind the Seller Zone tab without repainting it (that would throw the person back to the top) */
        loadRange(S.range).then(d => { data = d; if (ov && view === 'list' && onShop()) paint(); }).catch(() => { if (ov && view === 'list' && onShop()) paint('error'); });
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

    /* BH-036 (Oct 26 2026, P-CLOSING-STILL-LIVE): Shop fades out for 260 ms after it closes and stayed clickable meanwhile. A
       double tap on "Scan in the shop" or "Shopping list" (both close Shop) pressed the same button again in the fading panel, so the
       shop camera opened twice (live Chromium 390: 97 ms apart) and the list twice; with the panel gone, the 2nd tap pressed the Home
       bubble under the finger (Scan, Sleep). A closing panel now ignores taps, and a real tap that closes it is marked spent
       (fresh-scrim.js) so the 2nd tap of a double tap on that spot presses nothing. */
    function spend(e) { try { const F = W.LowiFreshScrim; if (F && F.spent) F.spent(e); } catch (x) {} }
    function onClick(e) {
        if (!ov || !ov.contains(e.target)) return; /* BH-036: this panel is closing (or another Shop replaced it) */
        if (Date.now() - dragAt < 450) return; /* the click a drag down on the top bar leaves behind */
        const t = e.target.closest ? e.target : null; if (!t) return;
        if (qv && (e.target === qv || (t.closest('[data-stp="qv-close"]') && qv.contains(t)))) { closeQuick(); return; }
        if (qv && cartOpen && qv.contains(t)) {
            if (cartClick(t)) return;
            const ca = t.closest('[data-stp]'), a2 = ca && ca.getAttribute('data-stp');
            /* Oct 26 2026 (MAYA-HANDOFF 0.34): "Someone else pays" turns the whole cart into a Give a hand basket */
            if (a2 === 'giftcart' || a2 === 'gift') { spend(e); closeQuick(); try { const G = W.LowiGiftBasket; if (G.fromCart) G.fromCart('shop'); else G.open('shop', 'mine'); } catch (x) {} return; }
            if (a2 === 'mylist' || a2 === 'scanshop') { spend(e); close(); setTimeout(() => { try { a2 === 'mylist' ? W.tdShopOpen() : W.LowiShopScan.open(); } catch (x) {} }, 200); return; }
            return;
        }
        if (qv && qv.contains(t) && qvCart(t)) return;
        if (qv && qv.contains(t)) { snackClick(t); return; }
        if (snackClick(t)) return;
        /* Oct 25 Give a hand (gift-basket.js): opens on top of Shop; Back brings Shop back */
        if (t.closest && t.closest('[data-stp="gift"]')) { try { W.LowiGiftBasket.open('shop'); } catch (x) {} return; }
        if (qaClick(t, e)) return; /* Oct 26 quick "+": never opens the product (MAYA-HANDOFF 0.35) */
        if (kitClick(t)) return;
        if (e.target === ov) { spend(e); close(); return; }
        const tb = t.closest('[data-stp-tab]');
        if (tb) {
            if (tb.getAttribute('data-stp-tab') === 'gift') { try { W.LowiGiftBasket.open('shop'); } catch (x) {} return; }
            setTab(tb.getAttribute('data-stp-tab'), tb.getAttribute('data-sz-focus')); return;
        }
        if (onSz() && SZ().inlineClick(t)) { paint('keep'); return; }
        const row = t.closest('[data-stp-item]');
        if (row) { openQuick(+row.getAttribute('data-stp-item')); return; }
        const b = t.closest('[data-stp],[data-stp-store],[data-stp-range],[data-stp-more],[data-stp-jump]');
        if (!b || b.tagName === 'INPUT') return;
        const a = b.getAttribute('data-stp');
        if (a === 'close' || a === 'scanshop' || a === 'mylist') spend(e); /* BH-036: these close Shop */
        if (a === 'close') return close();
        if (a === 'scanshop') { close(); setTimeout(() => { try { W.LowiShopScan.open(); } catch (x) {} }, 200); return; }
        if (a === 'sellerzone') { setTab('sz'); return; }
        if (a === 'weekshop') { if (homeTab()) setTab('home'); else try { W.LowiWeekBasket.open({ store: S.range }); } catch (x) {} return; }
        if (a === 'fails') { showFail = !showFail; if (data) paint('keep'); return; }
        if (a === 'mylist') { close(); setTimeout(() => { try { W.tdShopOpen(); } catch (x) {} }, 200); return; }
        if (a === 'cart') { openCart(); return; }
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
    /* switch tabs; from a snack on the swipe shelf, the zone opens on that snack's card and it glows once */
    function setTab(id, focus) {
        if (id === 'kitchen' && KG()) { if (ov) close(); KG().open(); return; }
        const next = id === 'sz' && SZ() ? 'sz' : id === 'kitchen' && K ? 'kitchen' : id === 'home' && homeTab() ? 'home' : 'shop';
        const same = next === tab;
        tab = next; try { localStorage.setItem(TKEY, tab); } catch (e) {}
        if (tab === 'sz') { if (focus) SZ().setCat('all'); if (!same || focus) paint(); if (focus) focusCard(focus); }
        else if (tab === 'kitchen') { if (!same) { kitMsg = ''; kitGone = null; paint(); } }
        else if (tab === 'home') { if (!same) paint(); }
        else if (!same) { if (view === 'list' && S.range && !data) showList(); else paint(); }
        try { const on = ov && ov.querySelector('.stp-tab.on'); if (on && !focus) on.focus({ preventScroll: true }); } catch (e) {}
    }
    function focusCard(id) {
        const sc = ov && ov.querySelector('.stp-scroll'); if (!sc) return;
        const c = [...sc.querySelectorAll('[data-sz-id]')].find(x => x.getAttribute('data-sz-id') === id); if (!c) return;
        sc.scrollTop = Math.max(0, c.offsetTop - sc.offsetTop - 8);
        c.classList.add('sz-glow'); setTimeout(() => { try { c.classList.remove('sz-glow'); } catch (e) {} }, 1600);
    }
    let qt = 0;
    function onInput(e) {
        if (e.target.classList.contains('stp-q')) { clearTimeout(qt); const v = e.target.value; qt = setTimeout(() => { q = v; if (data) paint(); }, 220); }
    }
    function onChange(e) {
        if (e.target.getAttribute && e.target.getAttribute('data-stp') === 'fails' && e.target.type === 'checkbox') { showFail = !!e.target.checked; if (data) paint('keep'); }
    }
    function onKey(e) {
        if (e.key !== 'Escape' || !ov) return;
        if (qv) return closeQuick();
        close();
    }

    function openPanel(from) {
        if (ov) return;
        if (tab === 'kitchen' && KG()) tab = 'shop';
        snackUndo = null;
        ov = D.createElement('div');
        ov.className = 'stp-ov';
        ov.addEventListener('click', onClick);
        ov.addEventListener('input', onInput);
        ov.addEventListener('change', onChange);
        ov.addEventListener('submit', onSubmit);
        ov.addEventListener('toggle', e => { if (e.target && e.target.classList && e.target.classList.contains('stp-snackbox')) snackOpen = e.target.open; }, true);
        dragDown(ov);
        D.addEventListener('keydown', onKey);
        D.body.appendChild(ov);
        /* the panel covers the screen: body-world-3d.js draws no world frames under it (html.stp-open), like Mirror mode */
        D.documentElement.classList.add('stp-open');
        requestAnimationFrame(() => { if (ov) ov.classList.add('in'); });
        q = ''; showFail = false; open = {};
        if (S.range) showList(); else { view = 'pick'; paint(); }
        if (!onShop()) { kitMsg = ''; kitGone = null; paint(); }
        try { W.dispatchEvent(new CustomEvent('lowi:storepicks', { detail: { open: true, from: from || '' } })); } catch (e) {}
    }
    /* Oct 24 2026 (back and close sweep 18:40): on a phone Shop fills the screen like the app's other sheets, but a swipe down
       did nothing (only back, X, Escape and a tap outside closed it). A drag down on its top bar (the tabs and the title block,
       never another button, a field or a link, never the list) now follows the finger and closes it past a quarter of the card or on a
       quick flick; a short drag springs back. The panel repaints its insides, so the drag is read on the panel itself. No drag
       on a wide screen (centred card on iPad) or while a product card is open over it. */
    let dragAt = 0;
    function dragDown(o) {
        if (!W.PointerEvent) return;
        const narrow = () => !(W.matchMedia && W.matchMedia('(min-width:700px)').matches);
        let d = null;
        o.addEventListener('pointerdown', e => {
            if (d || qv || ov !== o || !narrow() || (e.button != null && e.button > 0)) return;
            const t = e.target && e.target.closest ? e.target : null; if (!t) return;
            const card = t.closest('.stp-card'), zone = t.closest('.stp-tabs, .stp-head, .sz-head, .wb-inline > .wb-head');
            if (!card || !zone || !card.contains(zone)) return;
            /* a tab can start the drag (the tab bar is nearly all tabs, and a phone moves a touch near it onto one); a plain tap
               on it still switches tabs. Other buttons, fields and links never start one. */
            if (t.closest('input,select,textarea,label,a,summary,[contenteditable]') || (t.closest('button') && !t.closest('.stp-tab'))) return;
            d = { id: e.pointerId, y0: e.clientY, y: 0, ly: e.clientY, t: e.timeStamp, v: 0, card, zone, cap: false };
        });
        o.addEventListener('pointermove', e => {
            if (!d || e.pointerId !== d.id) return;
            const dt = Math.max(1, e.timeStamp - d.t);
            d.v = .6 * d.v + .4 * ((e.clientY - d.ly) / dt * 1000); d.ly = e.clientY; d.t = e.timeStamp;
            d.y = Math.max(0, e.clientY - d.y0);
            if (d.y > 6 && !d.cap) { d.cap = true; try { d.zone.setPointerCapture(e.pointerId); } catch (x) {} }
            if (d.y > 2) { d.card.style.animation = 'none'; d.card.style.transition = 'none'; d.card.style.transform = 'translateY(' + d.y + 'px)'; }
        });
        const end = (e, cancelled) => {
            if (!d || e.pointerId !== d.id) return;
            const g = d; d = null;
            if (g.cap) try { g.zone.releasePointerCapture(e.pointerId); } catch (x) {}
            if (g.y > 6) dragAt = Date.now();
            const h = g.card.getBoundingClientRect().height || 600;
            const v = e.timeStamp - g.t > 100 ? 0 : g.v;
            if (!cancelled && ov === o && (g.y > Math.min(160, h * .25) || (v > 650 && g.y > 18))) { close(); return; }
            g.card.style.transition = 'transform .22s ease'; g.card.style.transform = '';
        };
        o.addEventListener('pointerup', e => end(e, false));
        o.addEventListener('pointercancel', e => end(e, true));
    }
    function close() {
        if (!ov) return;
        unmountHome();
        const o = ov; ov = null; qv = null; cartOpen = false;
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
        W.addEventListener('lowi:gift-ready', () => { if (ov) paint(data ? 'keep' : undefined); });
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();

    W.LowiStorePicks = { open: openPanel, close, state: () => JSON.parse(JSON.stringify(S)), isOpen: () => !!ov, snacks: () => JSON.parse(JSON.stringify(snacks)), tab: () => (onSz() ? 'sz' : onKit() ? 'kitchen' : onHome() ? 'home' : 'shop'), kitchen: () => (K ? (kitLoad(), K.view(kit)) : []), setTab: id => { if (id === 'kitchen' && KG()) { if (ov) close(); KG().open(); return; } if (ov) setTab(id); else { tab = ({ sz: 'sz', kitchen: 'kitchen', home: 'home' })[id] || 'shop'; try { localStorage.setItem(TKEY, tab); } catch (e) {} } } };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
