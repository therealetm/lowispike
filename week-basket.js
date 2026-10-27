/* LOWiSPIKE "Shop from home": the weekly basket sheet that opens from Supermarket. Oct 26 2026, Emmanuel: "I'm at home and I
   want to go grocery shopping now ... virtual grocery shop, just like all those apps that are going viral". It does what those
   apps do (household, weekly budget, nights you cook, your store, a week in one tap, a running total, swap, staples at home stay
   off the bill, send the list on) with our own low-spike dinners. Logic: week-basket-core.js. Prices: the app's existing
   seven-store estimates via LowiStoreList.price (the same numbers as the Shop it cart), never a table of its own, always
   labelled as estimates and not live prices. The list goes on the existing shopping list (LOWI_SHELF.addIngredients); what
   is in your Kitchen counts as at home (LowiKitchenCore). Delivery uses the app's existing links (TD_ORDER.groceries). */
(function () {
    'use strict';
    const W = window, D = document, C = W.LowiWeekBasketCore;
    if (!C) return;
    const lang = () => { try { return (W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || 'en'; } catch (e) { return 'en'; } };
    const T = (en, de, es) => { const l = lang(); return l === 'de' ? de : l === 'es' ? es : en; };
    const tr = s => { try { return W.LowiLang && W.LowiLang.t ? W.LowiLang.t(s) : s; } catch (e) { return s; } };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const eur = n => { const v = Math.max(0, Number(n) || 0); try { return new Intl.NumberFormat(lang() === 'en' ? 'en-IE' : lang() === 'es' ? 'es-ES' : 'de-DE', { style: 'currency', currency: 'EUR' }).format(v); } catch (e) { return '\u20ac' + v.toFixed(2); } };
    const SL = () => W.LowiStoreList;
    const price = (i, sid) => { try { return SL().price(i, sid) || 0; } catch (e) { return 0; } };
    const STORE_IDS = ['lidl', 'aldi', 'penny', 'netto', 'kaufland', 'rewe', 'edeka'];
    const storeName = sid => { try { return SL().storeName(sid) || sid; } catch (e) { return sid; } };
    const DELIVERY = () => { try { return (typeof TD_ORDER !== 'undefined' && TD_ORDER.groceries) || []; } catch (e) { return []; } };  /* eslint-disable-line no-undef */
    const aisle = g => { try { return typeof tdAisle === 'function' ? tdAisle(g) : 'Other'; } catch (e) { return 'Other'; } };  /* eslint-disable-line no-undef */
    const AISLE_T = { 'Fruit & veg': ['Fruit & veg', 'Obst & Gem\u00fcse', 'Fruta y verdura'], 'Meat & fish': ['Meat & fish', 'Fleisch & Fisch', 'Carne y pescado'],
        'Dairy & eggs': ['Dairy & eggs', 'Milch & Eier', 'L\u00e1cteos y huevos'], 'Bread & grains': ['Bread & grains', 'Brot & Getreide', 'Pan y cereales'],
        'Pantry': ['Pantry', 'Vorrat', 'Despensa'], 'Snacks': ['Snacks', 'Snacks', 'Snacks'], 'Drinks': ['Drinks', 'Getr\u00e4nke', 'Bebidas'], 'Other': ['Other', 'Sonstiges', 'Otros'] };
    const aisleName = a => { const x = AISLE_T[a]; return x ? T(x[0], x[1], x[2]) : tr(a); };
    const pic = id => { try { return (typeof FOOD_IMG !== 'undefined' && FOOD_IMG[id]) || ''; } catch (e) { return ''; } };  /* eslint-disable-line no-undef */

    let S = null, ov = null, ctx = null, lastFocus = null, toastT = 0;
    /* Oct 27, 2026 (Emmanuel: "Vielleicht möchte 'Von zu Hause einkaufen' seine eigene Sektion haben"): Shop draws this as its own
       tab (store-picks.js homeHTML). inl holds Shop's hooks while it is mounted there: head() = the Cart button in the corner,
       onCart() opens Shop's Cart, cartOn() says whether there is one. open() still shows the sheet for anyone else. */
    let inl = null;
    const save = () => { try { localStorage.setItem(C.KEY, JSON.stringify(S)); } catch (e) {} };
    const recipes = () => { try { return (W.LowiAllRecipes && W.LowiAllRecipes()) || []; } catch (e) { return []; } };
    function kitchenHas(name) {
        try { const K = W.LowiKitchenCore; if (!K) return false; const list = K.parse ? K.parse(localStorage.getItem(K.KEY)) : JSON.parse(localStorage.getItem(K.KEY) || '[]'); return !!K.has(list, name); } catch (e) { return false; }
    }
    /* everything the sheet shows, rebuilt from the saved settings */
    function build() {
        const P = C.pool(recipes()), ids = P.map(r => r.id), byId = {}; P.forEach(r => { byId[r.id] = r; });
        S.plan = S.plan.filter(id => byId[id]);
        if (S.plan.length !== Math.min(S.nights, ids.length)) S.plan = C.plan(ids, S.nights, C.seedOf(S), S.plan.slice(0, S.nights), id => C.main(byId[id]));
        const dinners = S.plan.map(id => ({ id, r: byId[id], items: itemsOf(byId[id]) }));
        const items = C.basket(dinners, S.people);
        const have = {}; items.forEach(i => { const v = S.have[i.k]; i.kitchen = kitchenHas(i.n); if (v === 1 || (v !== 0 && i.kitchen)) have[i.k] = 1; });
        if (!S.store || STORE_IDS.indexOf(S.store) < 0) S.store = (C.storeTotals(items, price, STORE_IDS, have)[0] || ['lidl'])[0];
        const sum = C.total(items, price, S.store, have);
        ctx = { P, ids, byId, dinners, items, have, sum, totals: C.storeTotals(items, price, STORE_IDS, have), bs: C.budgetState(sum, S.budget) };
        save();
        return ctx;
    }
    function itemsOf(r) { try { return SL().items(r) || []; } catch (e) { return []; } }
    /* priced build of any plan, for Fit my budget */
    function priced(planIds) {
        const dinners = planIds.map(id => ({ id, items: itemsOf(ctx.byId[id]) })), items = C.basket(dinners, S.people);
        const have = {}; items.forEach(i => { const v = S.have[i.k]; if (v === 1 || (v !== 0 && kitchenHas(i.n))) have[i.k] = 1; });
        return { sum: C.total(items, price, S.store, have), cost: id => C.dinnerCost(id, items, price, S.store, have) };
    }

    const chip = (attr, val, on, label, extra) => '<button type="button" class="wb-chip' + (on ? ' on' : '') + '" data-wb="' + attr + '" data-v="' + esc(val) + '" aria-pressed="' + (on ? 'true' : 'false') + '"' + (extra || '') + '>' + label + '</button>';
    function html() {
        const c = build(), bs = c.bs, cheapest = c.totals[0] && c.totals[0][0];
        const need = c.items.filter(i => !c.have[i.k]), home = c.items.filter(i => c.have[i.k]);
        const groups = {}; need.forEach(i => { const a = aisle(i.g); (groups[a] = groups[a] || []).push(i); });
        const row = (i, at) => '<li class="wb-it' + (at ? ' home' : '') + '"><button type="button" class="wb-tick" data-wb="have" data-k="' + esc(i.k) + '" aria-pressed="' + (at ? 'true' : 'false') + '" aria-label="' + esc(at ? T('Need to buy ', 'Muss ich kaufen: ', 'Tengo que comprar ') + tr(i.n) : T('I have ', 'Hab ich schon: ', 'Ya tengo ') + tr(i.n)) + '">' + (at ? '\u2713' : '') + '</button>' +
            '<span class="wb-ie" aria-hidden="true">' + esc(i.e || '\ud83d\uded2') + '</span><span class="wb-in">' + (i.packs > 1 ? '<b>' + i.packs + ' \u00d7</b> ' : '') + esc(tr(i.n)) +
            (at && i.kitchen && S.have[i.k] !== 1 ? '<small>' + T('In your Kitchen', 'In deiner K\u00fcche', 'En tu cocina') + '</small>' : i.uses > 1 ? '<small>' + T('for ' + i.uses + ' dinners', 'f\u00fcr ' + i.uses + ' Abendessen', 'para ' + i.uses + ' cenas') + '</small>' : '') + '</span>' +
            '<span class="wb-ip">' + (at ? T('at home', 'zu Hause', 'en casa') : '\u2248 ' + eur(price(i, S.store) * i.packs)) + '</span></li>';
        const dinner = (d, n) => { const r = d.r, img = pic(d.id), cost = C.dinnerCost(d.id, c.items, price, S.store, c.have);
            return '<li class="wb-din"><span class="wb-dpic"' + (img ? ' style="background-image:url(\'' + img + '\')"' : '') + ' aria-hidden="true">' + (img ? '' : esc(r.e || '\ud83c\udf7d\ufe0f')) + '</span>' +
                '<span class="wb-dn"><small>' + T('Dinner ', 'Abendessen ', 'Cena ') + (n + 1) + '</small><b>' + esc(tr(r.swapName || r.n)) + '</b><em>\u2248 ' + eur(cost) + '</em></span>' +
                '<span class="wb-dact"><button type="button" class="wb-mini" data-wb="recipe" data-id="' + esc(d.id) + '">' + T('Recipe', 'Rezept', 'Receta') + '</button>' +
                '<button type="button" class="wb-mini" data-wb="swap" data-i="' + n + '" aria-label="' + esc(T('Swap ', 'Tauschen: ', 'Cambiar ') + tr(r.n)) + '">\u21bb ' + T('Swap', 'Tauschen', 'Cambiar') + '</button></span></li>'; };
        const status = bs.over
            ? '<p class="wb-bst over">' + T(eur(-bs.left) + ' over your budget', eur(-bs.left) + ' \u00fcber deinem Budget', eur(-bs.left) + ' por encima de tu presupuesto') + (cheapest && cheapest !== S.store ? ' \u00b7 ' + T(storeName(cheapest) + ' is cheaper', storeName(cheapest) + ' ist g\u00fcnstiger', storeName(cheapest) + ' es m\u00e1s barato') : '') + '</p>' +
              '<button type="button" class="wb-fit" data-wb="fit">' + T('Fit my budget', 'In mein Budget bringen', 'Ajustar a mi presupuesto') + '</button>'
            : '<p class="wb-bst">' + T(eur(bs.left) + ' left this week', 'Noch ' + eur(bs.left) + ' \u00fcbrig diese Woche', 'Te quedan ' + eur(bs.left) + ' esta semana') + '</p>';
        const sent = S.sent === S.wk + '#' + S.shuffle + '#' + need.length, cart = cartOn();
        const deliv = DELIVERY().map(x => '<a class="wb-dl" href="' + esc(x[1]) + '" target="_blank" rel="noopener">' + esc(x[0]) + ' \u2197</a>').join('');
        return (inl ? '<div class="wb-card wb-inline" role="region" aria-labelledby="wbTitle">' : '<div class="wb-card" role="dialog" aria-modal="true" aria-labelledby="wbTitle">') +
            '<div class="wb-head"><div><h3 id="wbTitle">\ud83c\udfe0 ' + T('Shop from home', 'Von zu Hause einkaufen', 'Compra desde casa') + '</h3>' +
            '<p>' + T('Your week of low-spike dinners, one grocery list.', 'Deine Woche mit Low-Spike-Abendessen, ein Einkauf.', 'Tu semana de cenas low-spike, una sola compra.') + '</p></div>' +
            (inl ? (inl.head ? inl.head() : '') : '<button type="button" class="wb-x" data-wb="close" aria-label="' + T('Back to Supermarket', 'Zur\u00fcck zum Supermarkt', 'Volver al supermercado') + '">\u00d7</button>') + '</div>' +
            '<div class="wb-scroll">' +
            '<section class="wb-setup" aria-label="' + T('Your week', 'Deine Woche', 'Tu semana') + '">' +
            '<div class="wb-row"><span class="wb-lb" id="wbPpl">' + T('People', 'Personen', 'Personas') + '</span><div class="wb-chips" role="group" aria-labelledby="wbPpl">' + C.PEOPLE.map(n => chip('people', n, S.people === n, n === 6 ? '6+' : String(n))).join('') + '</div></div>' +
            '<div class="wb-row"><span class="wb-lb" id="wbNts">' + T('Dinners', 'Abendessen', 'Cenas') + '</span><div class="wb-chips" role="group" aria-labelledby="wbNts">' + C.NIGHTS.map(n => chip('nights', n, S.nights === n, String(n))).join('') + '</div></div>' +
            '<div class="wb-row"><label class="wb-lb" for="wbBud">' + T('Weekly budget', 'Wochenbudget', 'Presupuesto semanal') + '</label><div class="wb-bud">' +
            '<button type="button" class="wb-step" data-wb="bud" data-v="-5" aria-label="' + T('5 euros less', '5 Euro weniger', '5 euros menos') + '">\u2212</button>' +
            '<span class="wb-eur">\u20ac</span><input id="wbBud" type="number" inputmode="numeric" min="' + C.BUDGET_MIN + '" max="' + C.BUDGET_MAX + '" step="5" value="' + S.budget + '">' +
            '<button type="button" class="wb-step" data-wb="bud" data-v="5" aria-label="' + T('5 euros more', '5 Euro mehr', '5 euros m\u00e1s') + '">+</button></div></div></section>' +
            '<section class="wb-total' + (bs.over ? ' over' : '') + '" aria-live="polite"><div class="wb-tl"><span>' + T('Your groceries at ', 'Dein Einkauf bei ', 'Tu compra en ') + esc(storeName(S.store)) + '</span><b>\u2248 ' + eur(bs.total) + '</b><small>' + T('of ', 'von ', 'de ') + eur(bs.budget) + '</small></div>' +
            '<div class="wb-bar" role="img" aria-label="' + esc(Math.round(bs.pct * 100) + '%') + '"><i style="width:' + Math.round(bs.pct * 100) + '%"></i></div>' + status + '</section>' +
            '<section><h4>' + T('Where do you shop?', 'Wo kaufst du ein?', '\u00bfD\u00f3nde compras?') + '</h4><div class="wb-stores" role="group">' +
            c.totals.map(([sid, t]) => chip('store', sid, S.store === sid, esc(storeName(sid)) + ' <em>\u2248 ' + eur(t) + '</em>' + (sid === cheapest ? '<small>' + T('cheapest', 'am g\u00fcnstigsten', 'm\u00e1s barato') + '</small>' : ''))).join('') + '</div></section>' +
            '<section><div class="wb-h4"><h4>' + T('Your dinners', 'Deine Abendessen', 'Tus cenas') + '</h4><button type="button" class="wb-mini" data-wb="new">\u21bb ' + T('New week', 'Neue Woche', 'Nueva semana') + '</button></div>' +
            '<ul class="wb-dins">' + c.dinners.map(dinner).join('') + '</ul></section>' +
            '<section><h4>' + T('Your groceries', 'Dein Einkauf', 'Tu compra') + ' \u00b7 ' + need.length + '</h4><p class="wb-hint">' + T('Tap the circle for what you already have. It comes off the bill.', 'Tipp den Kreis bei allem, was du schon hast. Es f\u00e4llt aus der Rechnung.', 'Toca el c\u00edrculo en lo que ya tienes. Sale de la cuenta.') + '</p>' +
            Object.keys(groups).map(a => '<h5>' + esc(aisleName(a)) + '</h5><ul class="wb-items">' + groups[a].map(i => row(i, false)).join('') + '</ul>').join('') +
            (home.length ? '<h5>' + T('Already at home', 'Schon zu Hause', 'Ya en casa') + ' \u00b7 ' + home.length + '</h5><ul class="wb-items">' + home.map(i => row(i, true)).join('') + '</ul>' : '') + '</section>' +
            '<section class="wb-go"><button type="button" class="wb-cta" data-wb="list"' + (need.length ? '' : ' disabled') + '>' + (sent ? '\u2713 ' + (cart ? T('In your Cart', 'In deinem Warenkorb', 'En tu carrito') : T('On your shopping list', 'Auf deiner Einkaufsliste', 'En tu lista de la compra')) : (cart ? T('Put it in my Cart', 'In meinen Warenkorb', 'A\u00f1adir a mi carrito') : T('Put it on my shopping list', 'Auf meine Einkaufsliste', 'A\u00f1adir a mi lista de la compra'))) + '</button>' +
            (sent && cart ? '<button type="button" class="wb-sec" data-wb="cart">' + T('Open my Cart', 'Warenkorb \u00f6ffnen', 'Abrir mi carrito') + '</button>' : '') +
            '<button type="button" class="wb-sec" data-wb="copy">' + T('Copy or share the list', 'Liste kopieren oder teilen', 'Copiar o compartir la lista') + '</button>' +
            (deliv ? '<h5>' + T('Order it to your door', 'Nach Hause liefern lassen', 'Pedir a domicilio') + '</h5><div class="wb-dls">' + deliv + '</div>' : '') + '</section>' +
            '<p class="wb-fine">' + T('Prices are estimates for a typical pack at each chain, not live prices. One pack per dinner feeds up to two people; spices, sauces, oils and seeds count once a week. General food guidance, not medical advice.',
                'Preise sind Sch\u00e4tzungen f\u00fcr eine typische Packung je Kette, keine Live-Preise. Eine Packung pro Abendessen reicht f\u00fcr bis zu zwei Personen; Gew\u00fcrze, Saucen, \u00d6le und Saaten z\u00e4hlen einmal pro Woche. Allgemeine Ern\u00e4hrungstipps, keine medizinische Beratung.',
                'Los precios son estimaciones de un paquete t\u00edpico en cada cadena, no precios en vivo. Un paquete por cena alcanza para hasta dos personas; especias, salsas, aceites y semillas cuentan una vez por semana. Orientaci\u00f3n general sobre alimentaci\u00f3n, no consejo m\u00e9dico.') + '</p>' +
            '</div><div class="wb-toast" role="status" aria-live="polite"></div></div>';
    }
    /* Oct 26 (MAYA-HANDOFF 0.22): the Supermarket Cart (Warenkorb / Carrito) is the same list as the shopping list; when its
       button is on the page, the week goes "in my Cart" and Open my Cart presses that button (store-picks.js owns the pane). */
    function cartOn() { if (inl) return !!(inl.cartOn && inl.cartOn()); return !!D.querySelector('.stp-card .stp-cartbtn'); }
    function paint(keepFocusSel) {
        if (!ov) return;
        const sc = ov.querySelector('.wb-scroll'), y = sc ? sc.scrollTop : 0;
        ov.innerHTML = html();
        const sc2 = ov.querySelector('.wb-scroll'); if (sc2) sc2.scrollTop = y;
        if (keepFocusSel) { const f = ov.querySelector(keepFocusSel); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }
    }
    function toast(msg) {
        const t = ov && ov.querySelector('.wb-toast'); if (!t) return;
        t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
    }
    const sel = (a, v) => '[data-wb="' + a + '"]' + (v != null ? '[data-v="' + v + '"]' : '');
    function onClick(e) {
        const b = e.target.closest('[data-wb]'); if (!b || !ov || ov.classList.contains('closing')) return;
        const a = b.dataset.wb;
        if (a === 'close') return close();
        if (a === 'people') { S.people = +b.dataset.v; return paint(sel('people', S.people)); }
        if (a === 'nights') { S.nights = +b.dataset.v; return paint(sel('nights', S.nights)); }
        if (a === 'bud') { S.budget = Math.min(C.BUDGET_MAX, Math.max(C.BUDGET_MIN, S.budget + (+b.dataset.v))); return paint(sel('bud', b.dataset.v)); }
        if (a === 'store') { S.store = b.dataset.v; return paint(sel('store', S.store)); }
        if (a === 'swap') { S.plan = C.swap(S.plan, +b.dataset.i, ctx.ids, C.seedOf(S), id => C.main(ctx.byId[id])); paint('[data-wb="swap"][data-i="' + b.dataset.i + '"]'); return; }
        if (a === 'new') { S.shuffle++; S.plan = []; paint(sel('new')); return toast(T('A new week of dinners', 'Eine neue Woche Abendessen', 'Una nueva semana de cenas')); }
        if (a === 'have') { const k = b.dataset.k, i = ctx.items.find(x => x.k === k); if (!i) return; const at = !!ctx.have[k]; S.have[k] = at ? 0 : 1; return paint('[data-wb="have"][data-k="' + CSS.escape(k) + '"]'); }
        if (a === 'recipe') { try { if (W.LowiP2 && W.LowiP2.open) W.LowiP2.open(b.dataset.id); } catch (err) {} return; }
        if (a === 'fit') {
            const f = C.fitBudget(S.plan, ctx.ids, S.budget, priced);
            S.plan = f.plan; paint(sel('fit')) ;
            return toast(f.fits ? T('Fits your budget now', 'Passt jetzt in dein Budget', 'Ya cabe en tu presupuesto')
                : T('Still over: try fewer dinners or a cheaper store', 'Noch dr\u00fcber: weniger Abendessen oder einen g\u00fcnstigeren Laden probieren', 'Sigue por encima: prueba menos cenas o una tienda m\u00e1s barata'));
        }
        if (a === 'list') {
            const need = ctx.items.filter(i => !ctx.have[i.k]);
            let added = 0;
            try { if (W.LOWI_SHELF && W.LOWI_SHELF.addIngredients) added = W.LOWI_SHELF.addIngredients(need.map(i => ({ n: i.n, g: i.g })), T('Week shop', 'Wocheneinkauf', 'Compra semanal')); } catch (err) { added = -1; }
            if (added < 0) return toast(T('Could not save the list. Try again.', 'Liste nicht gespeichert. Bitte nochmal.', 'No se pudo guardar la lista. Int\u00e9ntalo de nuevo.'));
            S.sent = S.wk + '#' + S.shuffle + '#' + need.length; paint(sel('list'));
            if (cartOn()) return toast(added ? T(need.length + ' things in your Cart', need.length + ' Sachen in deinem Warenkorb', need.length + ' cosas en tu carrito') : T('Already in your Cart', 'Schon in deinem Warenkorb', 'Ya est\u00e1 en tu carrito'));
            return toast(added ? T(need.length + ' things on your shopping list', need.length + ' Sachen auf deiner Einkaufsliste', need.length + ' cosas en tu lista de la compra') : T('Already on your shopping list', 'Steht schon auf deiner Einkaufsliste', 'Ya est\u00e1 en tu lista'));
        }
        if (a === 'cart' && inl) { try { if (inl.onCart) inl.onCart(); } catch (err) {} return; }
        if (a === 'cart') { close(); setTimeout(() => { const cb = D.querySelector('.stp-card .stp-cartbtn'); if (cb) try { cb.click(); } catch (err) {} }, 280); return; }
        if (a === 'copy') {
            const txt = C.text(ctx.items, ctx.have, price, S.store, storeName(S.store), eur, T('Week shop', 'Wocheneinkauf', 'Compra semanal')).replace(/^- (.*)$/gm, (m, x) => '- ' + x) ;
            const done = () => toast(T('List copied', 'Liste kopiert', 'Lista copiada'));
            try {
                if (navigator.share && /iPhone|iPad|Android/i.test(navigator.userAgent)) { navigator.share({ text: txt }).catch(() => {}); return; }
                if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(done, () => toast(T('Copy did not work here', 'Kopieren ging hier nicht', 'No se pudo copiar aqu\u00ed'))); return; }
            } catch (err) {}
            return toast(T('Copy did not work here', 'Kopieren ging hier nicht', 'No se pudo copiar aqu\u00ed'));
        }
    }
    function onChange(e) {
        if (e.target && e.target.id === 'wbBud') { const v = Math.round(+e.target.value); if (isFinite(v)) { S.budget = Math.min(C.BUDGET_MAX, Math.max(C.BUDGET_MIN, v)); paint('#wbBud'); } }
    }
    function onKey(e) {
        if (!ov) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
        if (e.key === 'Enter' && e.target && e.target.id === 'wbBud') { e.preventDefault(); onChange(e); }
    }
    /* store: a chain id from Supermarket's store (lidl, aldi, ...); used the first time only, after that the person's pick stays */
    function load(opts) {
        S = C.load((() => { try { return localStorage.getItem(C.KEY); } catch (e) { return null; } })(), C.weekKey());
        const raw = opts && opts.store ? String(opts.store).toLowerCase().replace(/[^a-z].*$/, '') : '', st = STORE_IDS.indexOf(raw) >= 0 ? raw : '';   /* aldi_nord -> aldi */
        if (st && !S.store) S.store = st;
    }
    /* draw the planner inside el (Shop's From home tab). Shop redraws its pane, so it calls unmount() before and mount() after. */
    function mount(el, opts) {
        if (!el) return;
        if (ov && !inl) close();
        load(opts);
        inl = { head: opts && opts.head, onCart: opts && opts.onCart, cartOn: opts && opts.cartOn };
        ov = el;
        el.addEventListener('click', onClick); el.addEventListener('change', onChange);
        el.addEventListener('keydown', e => { if (ov === el && e.key === 'Enter' && e.target && e.target.id === 'wbBud') { e.preventDefault(); onChange(e); } });
        paint();
    }
    function unmount() { if (!inl) return; clearTimeout(toastT); ov = null; inl = null; }
    function open(opts) {
        if (inl) unmount();
        if (ov) return;
        S = C.load((() => { try { return localStorage.getItem(C.KEY); } catch (e) { return null; } })(), C.weekKey());
        const raw = opts && opts.store ? String(opts.store).toLowerCase().replace(/[^a-z].*$/, '') : '', st = STORE_IDS.indexOf(raw) >= 0 ? raw : '';   /* aldi_nord -> aldi */
        if (st && !S.store) S.store = st;
        lastFocus = D.activeElement;
        ov = D.createElement('div'); ov.className = 'wb-ov'; ov.id = 'wbSheet';
        D.body.appendChild(ov); paint();
        ov.addEventListener('click', onClick); ov.addEventListener('change', onChange);
        D.addEventListener('keydown', onKey, true);
        requestAnimationFrame(() => { if (ov) ov.classList.add('in'); const h = ov && ov.querySelector('#wbTitle'); if (h) { h.tabIndex = -1; try { h.focus({ preventScroll: true }); } catch (e) {} } });
    }
    function close() {
        if (inl) return unmount();
        if (!ov || ov.classList.contains('closing')) return;
        const el = ov; ov = null;
        /* BH-060: a closing tap on the basket (Done, Cart) is spent, so a fast 2nd tap does not hit the page under it */
        try { const F = W.LowiFreshScrim; if (F && F.closed) F.closed(el); } catch (e) {}
        el.classList.add('closing'); el.classList.remove('in'); el.style.pointerEvents = 'none';
        D.removeEventListener('keydown', onKey, true);
        const reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setTimeout(() => { el.remove(); }, reduce ? 0 : 260);
        try { if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true }); } catch (e) {}
    }
    W.LowiWeekBasket = { open, close, mount, unmount, isOpen: () => !!ov && !inl, mounted: () => !!ov && !!inl, _state: () => S, _ctx: () => ctx };
})();
