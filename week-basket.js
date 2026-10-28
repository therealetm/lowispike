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
    /* Oct 28 2026: the Kitchen was removed, so nothing counts as at home through it any more (its old data is not shown anywhere) */
    function kitchenHas(name) {
        return false;
        try { const K = W.LowiKitchenCore; if (!K) return false; const list = K.parse ? K.parse(localStorage.getItem(K.KEY)) : JSON.parse(localStorage.getItem(K.KEY) || '[]'); return !!K.has(list, name); } catch (e) { return false; }
    }
    /* everything the sheet shows, rebuilt from the saved settings */
    /* the app's own minutes and protein flags for a Cook dinner (the guided week's extra veggie dinners carry their own) */
    function extraOf(r) { const K = W.LOWI_COOK, x = {}; try { if (K && K.min) x.min = K.min(r.id) || r.min || 0; if (K && K.match && K.match(r, 'protein')) x.protein = true; } catch (e) { } return x; }
    /* German and Spanish for the guided week's dinners (and two older Cook dinners that were still English) */
    W.LowiWeekFlowLang = [["Turkey pepper pan", "Puten-Paprika-Pfanne", "Sart\u00e9n de pavo y pimiento"],
        ["Halloumi salad plate", "Halloumi-Salatteller", "Plato de ensalada con halloumi"],
        ["Feta Shakshuka Pan", "Feta-Shakshuka-Pfanne", "Shakshuka con feta"],
        ["Eggs set in a peppery tomato pan", "Eier in einer w\u00fcrzigen Tomatenpfanne", "Huevos cuajados en una sart\u00e9n de tomate y pimiento"],
        ["Slice the onion and the bell pepper.", "Zwiebel und Paprika in Streifen schneiden.", "Corta la cebolla y el pimiento en tiras."],
        ["Chop the garlic and the tomatoes.", "Knoblauch und Tomaten hacken.", "Pica el ajo y los tomates."],
        ["Soften the onion, pepper and garlic in a pan with smoked paprika.", "Zwiebel, Paprika und Knoblauch mit ger\u00e4uchertem Paprikapulver in einer Pfanne weich d\u00fcnsten.", "Sofr\u00ede la cebolla, el pimiento y el ajo en una sart\u00e9n con piment\u00f3n ahumado."],
        ["Add the tomatoes and tomato sauce and simmer for 5 minutes.", "Tomaten und Tomatenso\u00dfe dazugeben und 5 Minuten k\u00f6cheln lassen.", "A\u00f1ade los tomates y la salsa de tomate y deja hervir a fuego lento 5 minutos."],
        ["Make four dips, crack in the eggs, put the lid on until the whites set, then crumble the feta over.", "Vier Mulden machen, die Eier hineinschlagen, Deckel drauf, bis das Eiwei\u00df fest ist, dann den Feta dar\u00fcberbr\u00f6seln.", "Haz cuatro huecos, casca los huevos, tapa hasta que cuaje la clara y desmenuza el feta por encima."],
        ["Halloumi Veggie Traybake", "Halloumi-Gem\u00fcse vom Blech", "Bandeja de verduras con halloumi"],
        ["Golden halloumi on roasted peppers and zucchini", "Goldener Halloumi auf ger\u00f6stetem Paprika und Zucchini", "Halloumi dorado sobre pimientos y calabac\u00edn asados"],
        ["Cut the zucchini, pepper and red onion into chunks.", "Zucchini, Paprika und rote Zwiebel in St\u00fccke schneiden.", "Corta el calabac\u00edn, el pimiento y la cebolla morada en trozos."],
        ["Slice the halloumi.", "Halloumi in Scheiben schneiden.", "Corta el halloumi en lonchas."],
        ["Toss the veg with olive oil and oregano and roast for 15 minutes in the oven or air fryer.", "Gem\u00fcse mit Oliven\u00f6l und Oregano mischen und 15 Minuten im Backofen oder in der Hei\u00dfluftfritteuse r\u00f6sten.", "Mezcla las verduras con aceite de oliva y or\u00e9gano y \u00e1salas 15 minutos en el horno o en la freidora de aire."],
        ["Add the halloumi and tomatoes and roast 10 minutes more until golden.", "Halloumi und Tomaten dazugeben und weitere 10 Minuten goldbraun r\u00f6sten.", "A\u00f1ade el halloumi y los tomates y asa 10 minutos m\u00e1s hasta que se doren."],
        ["Squeeze lemon over before eating.", "Vor dem Essen Zitrone dar\u00fcberpressen.", "Exprime lim\u00f3n por encima antes de comer."],
        ["Creamy Mushroom Cauliflower Mash", "Cremiger Pilz-Blumenkohl-Stampf", "Pur\u00e9 cremoso de coliflor con champi\u00f1ones"],
        ["Garlic mushrooms on a soft cauliflower mash", "Knoblauch-Champignons auf weichem Blumenkohlstampf", "Champi\u00f1ones al ajillo sobre un pur\u00e9 suave de coliflor"],
        ["Break the cauliflower into florets.", "Blumenkohl in R\u00f6schen teilen.", "Separa la coliflor en ramilletes."],
        ["Slice the mushrooms and the garlic.", "Champignons und Knoblauch in Scheiben schneiden.", "Corta los champi\u00f1ones y el ajo en l\u00e1minas."],
        ["Boil the cauliflower until soft, drain it well and mash it with the Frischk\u00e4se.", "Blumenkohl weich kochen, gut abtropfen lassen und mit dem Frischk\u00e4se stampfen.", "Hierve la coliflor hasta que est\u00e9 tierna, esc\u00farrela bien y apl\u00e1stala con el queso crema."],
        ["Fry the mushrooms and garlic in olive oil until golden, then wilt in the kale.", "Champignons und Knoblauch in Oliven\u00f6l goldbraun braten, dann den Gr\u00fcnkohl darin zusammenfallen lassen.", "Fr\u00ede los champi\u00f1ones y el ajo en aceite de oliva hasta que se doren y a\u00f1ade la col rizada hasta que se ablande."],
        ["Spoon the mushrooms over the mash and finish with walnuts and black pepper.", "Champignons auf den Stampf geben und mit Waln\u00fcssen und schwarzem Pfeffer vollenden.", "Pon los champi\u00f1ones sobre el pur\u00e9 y termina con nueces y pimienta negra."],
        ["Zucchini Ricotta Bake", "Zucchini-Ricotta-Auflauf", "Gratinado de calabac\u00edn y ricotta"],
        ["Layers of zucchini, ricotta and tomato", "Schichten aus Zucchini, Ricotta und Tomate", "Capas de calabac\u00edn, ricotta y tomate"],
        ["Slice the zucchini into thin rounds.", "Zucchini in d\u00fcnne Scheiben schneiden.", "Corta el calabac\u00edn en rodajas finas."],
        ["Mix the ricotta with one egg, garlic and oregano.", "Ricotta mit einem Ei, Knoblauch und Oregano verr\u00fchren.", "Mezcla la ricotta con un huevo, ajo y or\u00e9gano."],
        ["Layer tomato sauce, zucchini and the ricotta mix in a dish.", "Tomatenso\u00dfe, Zucchini und die Ricotta-Mischung in eine Form schichten.", "Pon en capas la salsa de tomate, el calabac\u00edn y la mezcla de ricotta en una fuente."],
        ["Top with torn mozzarella.", "Mit zerzupftem Mozzarella belegen.", "Cubre con mozzarella troceada."],
        ["Bake or air-fry for about 20 minutes until bubbling and golden.", "Etwa 20 Minuten im Ofen oder in der Hei\u00dfluftfritteuse backen, bis es blubbert und goldbraun ist.", "Hornea o cocina en la freidora de aire unos 20 minutos, hasta que burbujee y se dore."],
        ["Greek Egg & Feta Plate", "Griechischer Ei-Feta-Teller", "Plato griego de huevo y feta"],
        ["Crunchy salad with jammy eggs and feta", "Knackiger Salat mit wachsweichen Eiern und Feta", "Ensalada crujiente con huevos melosos y feta"],
        ["Boil the eggs for 8 minutes, then cool them in cold water.", "Eier 8 Minuten kochen, dann in kaltem Wasser abschrecken.", "Cuece los huevos 8 minutos y enfr\u00edalos en agua fr\u00eda."],
        ["Chop the cucumber, tomatoes and red onion.", "Gurke, Tomaten und rote Zwiebel klein schneiden.", "Pica el pepino, los tomates y la cebolla morada."],
        ["Lay the lettuce on a plate and pile the veg on top.", "Salat auf einen Teller legen und das Gem\u00fcse darauf h\u00e4ufen.", "Pon la lechuga en un plato y amontona las verduras encima."],
        ["Add the halved eggs and crumbled feta.", "Halbierte Eier und zerbr\u00f6selten Feta dazugeben.", "A\u00f1ade los huevos partidos por la mitad y el feta desmenuzado."],
        ["Finish with olive oil and oregano.", "Mit Oliven\u00f6l und Oregano vollenden.", "Termina con aceite de oliva y or\u00e9gano."],
        ["Cabbage Egg Fried Rice", "Kohl-Ei-Bratreis", "Arroz frito de repollo y huevo"],
        ["Fried-rice taste with cabbage instead of rice", "Bratreis-Geschmack mit Kohl statt Reis", "Sabor a arroz frito con repollo en lugar de arroz"],
        ["Shred the cabbage very fine.", "Kohl sehr fein hobeln.", "Corta el repollo muy fino."],
        ["Slice the mushrooms and scallions, grate the ginger and garlic.", "Champignons und Fr\u00fchlingszwiebeln schneiden, Ingwer und Knoblauch reiben.", "Corta los champi\u00f1ones y las cebolletas, ralla el jengibre y el ajo."],
        ["Stir-fry the cabbage and mushrooms hot and fast until the edges brown.", "Kohl und Champignons hei\u00df und schnell anbraten, bis die R\u00e4nder braun werden.", "Saltea el repollo y los champi\u00f1ones a fuego fuerte hasta que se doren los bordes."],
        ["Push it to one side and scramble the eggs.", "Zur Seite schieben und die Eier darin verr\u00fchren.", "Ap\u00e1rtalo a un lado y revuelve los huevos."],
        ["Toss everything with tamari, ginger, garlic, scallions and sesame.", "Alles mit Tamari, Ingwer, Knoblauch, Fr\u00fchlingszwiebeln und Sesam mischen.", "Mezcla todo con tamari, jengibre, ajo, cebolletas y s\u00e9samo."]];
    let registered = false;
    function registerExtra() {
        if (registered) return; registered = true;
        try { if (W.LowiLang && W.LowiLang.add && W.LowiWeekFlowLang) W.LowiLang.add(W.LowiWeekFlowLang); } catch (e) { }
        /* the recipe viewer wants the same shape as a Cook recipe (index.html fromBook): priced ingredients, prep + method as steps */
        try { const P2 = W.LowiP2; if (P2 && P2.register) C.EXTRA.forEach(r => P2.register({ id: r.id, n: r.n, e: r.e, img: '', sub: r.sub, note: '', mins: r.min, extra: '', book: true, r: 'ja',
            steps: [].concat(r.prep || [], r.make || []), ing: itemsOf(r).map(i => ({ k: i.k, n: i.n, q: '', g: i.g || '', e: i.e || '\ud83d\uded2', p: i.free ? 0 : (+i.p || 0) })) })); } catch (e) { }
    }
    function allDinners() { const a = recipes(), seen = {}; a.forEach(r => { if (r && r.id) seen[r.id] = 1; }); return a.concat(C.EXTRA.filter(r => !seen[r.id])); }
    function build() {
        registerExtra();
        const P = C.pool(allDinners()), byId = {}, prof = {}; P.forEach(r => { byId[r.id] = r; prof[r.id] = C.profile(r, extraOf(r)); });
        /* your needs and kitchen filter; your vibe ranks */
        const ids = P.map(r => r.id).filter(id => C.fits(prof[id], S.diet, S.kit));
        if (!S.start) S.start = today();
        S.plan = S.plan.filter(id => byId[id] && ids.indexOf(id) >= 0);
        if (S.plan.length !== Math.min(S.nights, ids.length)) {
            const fresh = !S.plan.length;
            S.plan = C.plan(ids, S.nights, C.seedOf(S), S.plan.slice(0, S.nights), id => C.weekKeys(byId[id]), S.vibe.length ? id => C.vibeScore(prof[id], S.vibe) : null);
            if (fresh) S.plan = C.freshFirst(S.plan, id => prof[id].perish);
        }
        const dinners = S.plan.map(id => ({ id, r: byId[id], items: itemsOf(byId[id]) }));
        const items = C.basket(dinners, S.people);
        const have = {}; items.forEach(i => { const v = S.have[i.k]; i.kitchen = kitchenHas(i.n); if (v === 1 || (v !== 0 && i.kitchen)) have[i.k] = 1; });
        if (!S.store || STORE_IDS.indexOf(S.store) < 0) S.store = (C.storeTotals(items, price, STORE_IDS, have)[0] || ['lidl'])[0];
        const sum = C.total(items, price, S.store, have);
        ctx = { P, ids, byId, prof, dinners, items, have, sum, totals: C.storeTotals(items, price, STORE_IDS, have), bs: C.budgetState(sum, S.budget) };
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
    /* ---- Oct 27 2026: the guided week (see week-basket-core.js). One question per screen, a tap answers it, then a calm week:
       the days with their dinners, what it costs, one button to the list. The list (ticks, Cart, copy, delivery) is its own page.
       Emmanuel: "I still feel like our app is so noisy and so confusing. Makes me hate it." ---- */
    const STEPS = ['store', 'people', 'budget', 'vibe', 'diet', 'kit'];
    let view = '', step = 0, makeT = 0;
    const today = () => C.ymd(new Date());
    function companionName() { const pick = v => { v = v == null ? '' : String(v).trim(); return v ? v.slice(0, 24) : ''; }; let auto = ''; try { auto = pick(W.LowiHerbIdentity && W.LowiHerbIdentity.autoName && W.LowiHerbIdentity.autoName()); } catch (e) { } const typed = v => { v = pick(v); return v && v !== auto ? v : ''; }; let n = ''; try { const B = W.LowiBirthCompanion; if (B && B.has && B.has()) { const c = B.get(); n = pick(c && c.name); } } catch (e) { } if (!n) try { const t = W.LowiHerbTamagotchi, p = t && t.readPrefs && t.readPrefs(); n = typed(p && p.name); } catch (e) { } if (!n) try { const R = W.LowiR2, s = R && R.S && R.S(); n = typed(s && s.herb && s.herb.name); } catch (e) { } return n; }
    const locale = () => lang() === 'de' ? 'de-DE' : lang() === 'es' ? 'es-ES' : 'en-GB';
    function dayName(d) {
        if (d.date === today()) return T('Tonight', 'Heute Abend', 'Esta noche');
        try { const s = new Intl.DateTimeFormat(locale(), { weekday: 'long' }).format(new Date(d.date + 'T12:00:00')); return s.charAt(0).toUpperCase() + s.slice(1); } catch (e) { return d.date; }
    }
    const OPT = {
        vibe: [['quick', '\u26a1', ['Quick & easy', 'Schnell & einfach', 'R\u00e1pido y f\u00e1cil']], ['protein', '\ud83d\udcaa', ['High protein', 'Viel Protein', 'Mucha prote\u00edna']],
            ['fake', '\ud83c\udf54', ['Fakeaway', 'Wie vom Imbiss', 'Como de comida para llevar']], ['fresh', '\ud83e\udd57', ['Light & fresh', 'Leicht & frisch', 'Ligero y fresco']]],
        diet: [['veg', '\ud83e\udd66', ['Vegetarian', 'Vegetarisch', 'Vegetariano']], ['nofish', '\ud83d\udc1f', ['No fish', 'Kein Fisch', 'Sin pescado']],
            ['nobeef', '\ud83d\udc04', ['No beef', 'Kein Rind', 'Sin ternera']], ['nodairy', '\ud83e\udd5b', ['No dairy', 'Keine Milchprodukte', 'Sin l\u00e1cteos']]],
        kit: [['hob', '\ud83c\udf73', ['Hob', 'Herd', 'Fogones']], ['oven', '\ud83d\udd25', ['Oven', 'Backofen', 'Horno']],
            ['air', '\ud83d\udca8', ['Air fryer', 'Hei\u00dfluftfritteuse', 'Freidora de aire']], ['micro', '\ud83d\udce1', ['Microwave', 'Mikrowelle', 'Microondas']]]
    };
    const tile = (attr, val, on, emoji, label, multi) => '<button type="button" class="wb-tile' + (on ? ' on' : '') + '" data-wb="' + attr + '" data-v="' + esc(val) + '"' + (multi ? ' aria-pressed="' + (on ? 'true' : 'false') + '"' : '') + '>' +
        (emoji ? '<span class="wb-te" aria-hidden="true">' + emoji + '</span>' : '') + '<span class="wb-tl2">' + label + '</span>' + (multi ? '<span class="wb-tck" aria-hidden="true">' + (on ? '\u2713' : '') + '</span>' : '') + '</button>';
    function qHTML() {
        const k = STEPS[step], n = step + 1;
        const dots = '<div class="wb-dots" aria-hidden="true">' + STEPS.map((x, i) => '<i class="' + (i < step ? 'done' : i === step ? 'now' : '') + '"></i>').join('') + '</div>';
        const top = '<div class="wb-qtop">' + (step > 0 ? '<button type="button" class="wb-back" data-wb="qback" aria-label="' + T('Back', 'Zur\u00fcck', 'Atr\u00e1s') + '">\u2039</button>' : '<span class="wb-back-sp"></span>') + dots +
            (S.setup ? '<button type="button" class="wb-qx" data-wb="qcancel">' + T('Cancel', 'Abbrechen', 'Cancelar') + '</button>' : '<span class="wb-qn">' + n + '/' + STEPS.length + '</span>') + '</div>';
        let q = '', sub = '', body = '', next = '';
        if (k === 'store') {
            q = T('Where do you shop?', 'Wo kaufst du ein?', '\u00bfD\u00f3nde compras?');
            body = '<div class="wb-tiles two">' + STORE_IDS.map(id => tile('a_store', id, S.store === id, '', esc(storeName(id)))).join('') + '</div>';
        } else if (k === 'people') {
            q = T('Who are you cooking for?', 'F\u00fcr wie viele kochst du?', '\u00bfPara cu\u00e1ntos cocinas?');
            body = '<div class="wb-tiles three">' + C.PEOPLE.map(p => tile('a_people', p, S.people === p, p === 1 ? '\ud83d\ude42' : '', p === 1 ? T('Just me', 'Nur mich', 'Solo yo') : p === 6 ? '6+' : String(p))).join('') + '</div>';
        } else if (k === 'budget') {
            const max = Math.max(200, S.budget);
            q = T('Your budget for the week?', 'Dein Budget f\u00fcr die Woche?', '\u00bfTu presupuesto para la semana?');
            sub = T('For ' + S.nights + ' dinners', 'F\u00fcr ' + S.nights + ' Abendessen', 'Para ' + S.nights + ' cenas');
            body = '<div class="wb-bigbud"><output id="wbBudOut" for="wbBud">' + eur(S.budget).replace(/[.,]00(?=\D*$)/, '') + '</output>' +
                '<input id="wbBud" class="wb-range" type="range" min="' + C.BUDGET_MIN + '" max="' + max + '" step="5" value="' + S.budget + '" aria-label="' + T('Weekly budget', 'Wochenbudget', 'Presupuesto semanal') + '"></div>' +
                '<p class="wb-qlb" id="wbNts">' + T('Dinners this week', 'Abendessen diese Woche', 'Cenas esta semana') + '</p><div class="wb-chips c" role="group" aria-labelledby="wbNts">' + C.NIGHTS.map(x => chip('nights', x, S.nights === x, String(x))).join('') + '</div>';
            next = T('Next', 'Weiter', 'Siguiente');
        } else {
            const list = S[k], none = !list.length;
            q = k === 'vibe' ? T('What\u2019s the vibe?', 'Worauf hast du Lust?', '\u00bfQu\u00e9 te apetece?') : k === 'diet' ? T('Anything you don\u2019t eat?', 'Was isst du nicht?', '\u00bfAlgo que no comas?') : T('What\u2019s in your kitchen?', 'Was hast du in der K\u00fcche?', '\u00bfQu\u00e9 hay en tu cocina?');
            sub = k === 'kit' ? '' : T('Pick any, or none', 'W\u00e4hl beliebig viele, oder keins', 'Elige las que quieras, o ninguna');
            body = '<div class="wb-tiles two">' + OPT[k].map(o => tile('m_' + k, o[0], list.indexOf(o[0]) >= 0, o[1], T(o[2][0], o[2][1], o[2][2]), true)).join('') + '</div>';
            next = k === 'kit' ? T('Make my week', 'Meine Woche planen', 'Planear mi semana')
                : none ? (k === 'vibe' ? T('Surprise me', '\u00dcberrasch mich', 'Sorpr\u00e9ndeme') : T('I eat everything', 'Ich esse alles', 'Como de todo')) : T('Next', 'Weiter', 'Siguiente');
        }
        return '<section class="wb-q" aria-labelledby="wbQ">' + top + '<h4 id="wbQ" class="wb-qh">' + q + '</h4>' + (sub ? '<p class="wb-qs">' + sub + '</p>' : '') + body +
            (next ? '<button type="button" class="wb-cta wb-qnext" data-wb="qnext">' + next + '</button>' : '') + '</section>';
    }
    function makeHTML() {
        const nm = esc(companionName());
        return '<section class="wb-make" role="status" aria-live="polite"><div class="wb-orb" aria-hidden="true"><i></i><i></i><i></i></div>' +
            '<h4>' + (nm ? T('Leave it with ' + nm + '\u2026', 'Lass das ' + nm + ' machen\u2026', 'D\u00e9jaselo a ' + nm + '\u2026') : T('Leave it with your companion\u2026', 'Dein Begleiter macht das\u2026', 'Tu compa\u00f1ero se encarga\u2026')) + '</h4>' +
            '<p>' + T('Picking ' + S.nights + ' low-spike dinners for ' + esc(storeName(S.store)), S.nights + ' Low-Spike-Abendessen f\u00fcr ' + esc(storeName(S.store)), 'Eligiendo ' + S.nights + ' cenas low-spike para ' + esc(storeName(S.store))) + '</p></section>';
    }
    function weekHTML(c) {
        const bs = c.bs, cheapest = c.totals[0] && c.totals[0][0], dl = C.days(S.start, c.dinners.length);
        const need = c.items.filter(i => !c.have[i.k]);
        if (!c.dinners.length) return '<section class="wb-week"><h4 class="wb-wh">' + T('Nothing fits all of that yet', 'Dazu passt noch nichts', 'A\u00fan no hay nada que encaje') + '</h4>' +
            '<p class="wb-wl">' + T('Try fewer things you don\u2019t eat, or tell us about another way to cook.', 'Probier weniger Ausschl\u00fcsse oder eine andere Kochm\u00f6glichkeit.', 'Prueba con menos exclusiones o con otra forma de cocinar.') + '</p>' +
            '<button type="button" class="wb-cta" data-wb="edit">' + T('Change my answers', 'Antworten \u00e4ndern', 'Cambiar mis respuestas') + '</button></section>';
        const day = (d, n) => { const r = d.r, img = pic(d.id), cost = C.dinnerCost(d.id, c.items, price, S.store, c.have), pr = c.prof[d.id], dd = dl[n];
            const meta = [pr && pr.min ? T(pr.min + ' min', pr.min + ' Min.', pr.min + ' min') : '', '\u2248 ' + eur(cost)].filter(Boolean).join(' \u00b7 ');
            return '<li class="wb-day' + (dd.date === today() ? ' now' : '') + '"><button type="button" class="wb-dopen" data-wb="recipe" data-id="' + esc(d.id) + '">' +
                '<span class="wb-dpic"' + (img ? ' style="background-image:url(\'' + img + '\')"' : '') + ' aria-hidden="true">' + (img ? '' : esc(r.e || '\ud83c\udf7d\ufe0f')) + '</span>' +
                '<span class="wb-dn"><small>' + esc(dayName(dd)) + '</small><b>' + esc(tr(r.swapName || r.n)) + '</b><em>' + meta + '</em></span></button>' +
                '<button type="button" class="wb-swap" data-wb="swap" data-i="' + n + '" aria-label="' + esc(T('Swap ', 'Tauschen: ', 'Cambiar ') + tr(r.n)) + '">\u21bb</button></li>'; };
        const short = c.dinners.length < S.nights;
        return '<section class="wb-week" aria-labelledby="wbWk"><h4 id="wbWk" class="wb-wh">' + T('Your week', 'Deine Woche', 'Tu semana') + '</h4>' +
            '<p class="wb-wl' + (bs.over ? ' over' : '') + '" aria-live="polite">\u2248 ' + eur(bs.total) + ' ' + T('of ', 'von ', 'de ') + eur(bs.budget) + ' \u00b7 ' + esc(storeName(S.store)) +
            (bs.over ? ' \u00b7 <button type="button" class="wb-link" data-wb="fit">' + T('Fit my budget', 'In mein Budget bringen', 'Ajustar a mi presupuesto') + '</button>' : '') + '</p>' +
            (short ? '<p class="wb-note">' + T('Only ' + c.dinners.length + ' dinners fit everything you said.', 'Nur ' + c.dinners.length + ' Abendessen passen zu allem, was du gesagt hast.', 'Solo ' + c.dinners.length + ' cenas encajan con todo lo que dijiste.') + '</p>' : '') +
            '<ul class="wb-days">' + c.dinners.map(day).join('') + '</ul>' +
            '<button type="button" class="wb-cta" data-wb="view" data-v="list">' + T('Shopping list', 'Einkaufsliste', 'Lista de la compra') + ' \u00b7 ' + need.length + '</button>' +
            '<div class="wb-links"><button type="button" class="wb-link" data-wb="edit">' + T('Change my answers', 'Antworten \u00e4ndern', 'Cambiar mis respuestas') + '</button><span aria-hidden="true">\u00b7</span>' +
            '<button type="button" class="wb-link" data-wb="new">' + T('New week', 'Neue Woche', 'Nueva semana') + '</button>' +
            (W.LowiKitchenGame ? '<span aria-hidden="true">\u00b7</span><button type="button" class="wb-link" data-wb="kitchen">' + T('My kitchen', 'Meine K\u00fcche', 'Mi cocina') + '</button>' : '') + '</div>' +
            '<p class="wb-fine">' + T('Prices are estimates, not live prices. Tap a dinner for its recipe.', 'Preise sind Sch\u00e4tzungen, keine Live-Preise. Tipp ein Abendessen f\u00fcr das Rezept.', 'Los precios son estimaciones, no precios en vivo. Toca una cena para ver la receta.') + '</p></section>' +
            (cheapest ? '' : '');
    }
    function listHTML(c) {
        const cheapest = c.totals[0], need = c.items.filter(i => !c.have[i.k]), home = c.items.filter(i => c.have[i.k]);
        const groups = {}; need.forEach(i => { const a = aisle(i.g); (groups[a] = groups[a] || []).push(i); });
        const row = (i, at) => '<li class="wb-it' + (at ? ' home' : '') + '"><button type="button" class="wb-tick" data-wb="have" data-k="' + esc(i.k) + '" aria-pressed="' + (at ? 'true' : 'false') + '" aria-label="' + esc(at ? T('Need to buy ', 'Muss ich kaufen: ', 'Tengo que comprar ') + tr(i.n) : T('I have ', 'Hab ich schon: ', 'Ya tengo ') + tr(i.n)) + '">' + (at ? '\u2713' : '') + '</button>' +
            '<span class="wb-ie" aria-hidden="true">' + esc(i.e || '\ud83d\uded2') + '</span><span class="wb-in">' + (i.packs > 1 ? '<b>' + i.packs + ' \u00d7</b> ' : '') + esc(tr(i.n)) +
            (at && i.kitchen && S.have[i.k] !== 1 ? '<small>' + T('In your Kitchen', 'In deiner K\u00fcche', 'En tu cocina') + '</small>' : '') + '</span>' +
            '<span class="wb-ip">' + (at ? T('at home', 'zu Hause', 'en casa') : '\u2248 ' + eur(price(i, S.store) * i.packs)) + '</span></li>';
        const sent = S.sent === S.wk + '#' + S.shuffle + '#' + need.length, cart = cartOn();
        const deliv = DELIVERY().map(x => '<a class="wb-dl" href="' + esc(x[1]) + '" target="_blank" rel="noopener">' + esc(x[0]) + ' \u2197</a>').join('');
        const cheaper = cheapest && cheapest[0] !== S.store && cheapest[1] < c.sum - 0.5;
        return '<section class="wb-list" aria-labelledby="wbLs"><button type="button" class="wb-backl" data-wb="view" data-v="week">\u2039 ' + T('Your week', 'Deine Woche', 'Tu semana') + '</button>' +
            '<h4 id="wbLs" class="wb-wh">' + T('Shopping list', 'Einkaufsliste', 'Lista de la compra') + '</h4>' +
            '<p class="wb-wl">\u2248 ' + eur(c.sum) + ' \u00b7 ' + esc(storeName(S.store)) +
            (cheaper ? ' \u00b7 <button type="button" class="wb-link" data-wb="store" data-v="' + esc(cheapest[0]) + '">' + T(storeName(cheapest[0]) + ' \u2248 ' + eur(cheapest[1]), storeName(cheapest[0]) + ' \u2248 ' + eur(cheapest[1]), storeName(cheapest[0]) + ' \u2248 ' + eur(cheapest[1])) + '</button>' : '') + '</p>' +
            '<p class="wb-hint">' + T('Tap the circle for what you already have. It comes off the bill.', 'Tipp den Kreis bei allem, was du schon hast. Es f\u00e4llt aus der Rechnung.', 'Toca el c\u00edrculo en lo que ya tienes. Sale de la cuenta.') + '</p>' +
            Object.keys(groups).map(a => '<h5>' + esc(aisleName(a)) + '</h5><ul class="wb-items">' + groups[a].map(i => row(i, false)).join('') + '</ul>').join('') +
            (home.length ? '<h5>' + T('Already at home', 'Schon zu Hause', 'Ya en casa') + ' \u00b7 ' + home.length + '</h5><ul class="wb-items">' + home.map(i => row(i, true)).join('') + '</ul>' : '') +
            '<div class="wb-go"><button type="button" class="wb-cta" data-wb="list"' + (need.length ? '' : ' disabled') + '>' + (sent ? '\u2713 ' + (cart ? T('In your Cart', 'In deinem Warenkorb', 'En tu carrito') : T('On your shopping list', 'Auf deiner Einkaufsliste', 'En tu lista de la compra')) : (cart ? T('Put it in my Cart', 'In meinen Warenkorb', 'A\u00f1adir a mi carrito') : T('Put it on my shopping list', 'Auf meine Einkaufsliste', 'A\u00f1adir a mi lista de la compra'))) + '</button>' +
            (sent && cart ? '<button type="button" class="wb-sec" data-wb="cart">' + T('Open my Cart', 'Warenkorb \u00f6ffnen', 'Abrir mi carrito') + '</button>' : '') +
            (sent && W.LowiKitchenGame ? '<button type="button" class="wb-sec wb-kit" data-wb="kitchen">' + T('Go to my kitchen', 'Zu meiner K\u00fcche', 'Ir a mi cocina') + '</button>' : '') +
            '<button type="button" class="wb-sec" data-wb="copy">' + T('Copy or share the list', 'Liste kopieren oder teilen', 'Copiar o compartir la lista') + '</button>' +
            (deliv ? '<details class="wb-deliv"><summary>' + T('Order it to your door', 'Nach Hause liefern lassen', 'Pedir a domicilio') + '</summary><div class="wb-dls">' + deliv + '</div></details>' : '') + '</div>' +
            '<p class="wb-fine">' + T('Prices are estimates for a typical pack at each chain, not live prices. One pack per dinner feeds up to two people; spices, sauces, oils and seeds count once a week. General food guidance, not medical advice.',
                'Preise sind Sch\u00e4tzungen f\u00fcr eine typische Packung je Kette, keine Live-Preise. Eine Packung pro Abendessen reicht f\u00fcr bis zu zwei Personen; Gew\u00fcrze, Saucen, \u00d6le und Saaten z\u00e4hlen einmal pro Woche. Allgemeine Ern\u00e4hrungstipps, keine medizinische Beratung.',
                'Los precios son estimaciones de un paquete t\u00edpico en cada cadena, no precios en vivo. Un paquete por cena alcanza para hasta dos personas; especias, salsas, aceites y semillas cuentan una vez por semana. Orientaci\u00f3n general sobre alimentaci\u00f3n, no consejo m\u00e9dico.') + '</p></section>';
    }
    function html() {
        if (!view) view = S.setup ? 'week' : 'q';
        const c = view === 'week' || view === 'list' ? build() : null;
        const body = view === 'q' ? qHTML() : view === 'make' ? makeHTML() : view === 'list' ? listHTML(c) : weekHTML(c);
        return (inl ? '<div class="wb-card wb-inline wb-v-' + view + '" role="region" aria-labelledby="wbTitle">' : '<div class="wb-card wb-v-' + view + '" role="dialog" aria-modal="true" aria-labelledby="wbTitle">') +
            '<div class="wb-head"><div><h3 id="wbTitle">' + T('Shop from home', 'Von zu Hause einkaufen', 'Compra desde casa') + '</h3></div>' +
            (inl ? (inl.head ? inl.head() : '') : '<button type="button" class="wb-x" data-wb="close" aria-label="' + T('Back to Supermarket', 'Zur\u00fcck zum Supermarkt', 'Volver al supermercado') + '">\u00d7</button>') + '</div>' +
            '<div class="wb-scroll">' + body + '</div><div class="wb-toast" role="status" aria-live="polite"></div></div>';
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
        /* the guided questions: a single answer moves on by itself, a multi answer toggles and waits for the one button */
        if (a === 'a_store' || a === 'a_people') { if (a === 'a_store') S.store = b.dataset.v; else S.people = +b.dataset.v; save(); return qGo(1); }
        if (a.indexOf('m_') === 0) { const k = a.slice(2), v = b.dataset.v, l = S[k] || [], i = l.indexOf(v); if (i >= 0) l.splice(i, 1); else l.push(v); S[k] = l; save(); return paint('[data-wb="' + a + '"][data-v="' + v + '"]'); }
        if (a === 'qnext') return STEPS[step] === 'kit' ? makeWeek() : qGo(1);
        if (a === 'qback') return qGo(-1);
        if (a === 'qcancel') { view = 'week'; return paint(); }
        if (a === 'edit') { view = 'q'; step = 0; return paint('#wbQ'); }
        if (a === 'view') { view = b.dataset.v === 'list' ? 'list' : 'week'; const sc = ov.querySelector('.wb-scroll'); if (sc) sc.scrollTop = 0; paint(); const sc2 = ov.querySelector('.wb-scroll'); if (sc2) sc2.scrollTop = 0; const h = ov.querySelector(view === 'list' ? '#wbLs' : '#wbWk'); if (h) { h.tabIndex = -1; try { h.focus({ preventScroll: true }); } catch (err) { } } return; }
        if (a === 'people') { S.people = +b.dataset.v; return paint(sel('people', S.people)); }
        if (a === 'nights') { S.nights = +b.dataset.v; return paint(sel('nights', S.nights)); }
        if (a === 'bud') { S.budget = Math.min(C.BUDGET_MAX, Math.max(C.BUDGET_MIN, S.budget + (+b.dataset.v))); return paint(sel('bud', b.dataset.v)); }
        if (a === 'store') { S.store = b.dataset.v; return paint(sel('store', S.store)); }
        if (a === 'swap') { S.plan = C.swap(S.plan, +b.dataset.i, ctx.ids, C.seedOf(S), id => C.weekKeys(ctx.byId[id])); paint('[data-wb="swap"][data-i="' + b.dataset.i + '"]'); return; }
        if (a === 'new') { S.shuffle++; S.plan = []; S.start = today(); paint(sel('new')); return toast(T('A new week of dinners', 'Eine neue Woche Abendessen', 'Una nueva semana de cenas')); }
        if (a === 'have') { const k = b.dataset.k, i = ctx.items.find(x => x.k === k); if (!i) return; const at = !!ctx.have[k]; S.have[k] = at ? 0 : 1; return paint('[data-wb="have"][data-k="' + CSS.escape(k) + '"]'); }
        if (a === 'recipe') { try { if (W.LowiP2 && W.LowiP2.open) W.LowiP2.open(b.dataset.id); } catch (err) {} return; }
        if (a === 'fit') {
            const f = C.fitBudget(S.plan, ctx.ids, S.budget, priced, 0, id => C.weekKeys(ctx.byId[id]));
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
            /* Oct 27 2026 (Emmanuel: "select the grocery store, how many people, the budget, and then you see a kitchen"): after the setup lands on the list (or the Cart, the same list), you end up in the kitchen, the list note glowing on the fridge */
            if (added > 0 && toKitchen(900)) return;
            if (cartOn()) return toast(added ? T(need.length + ' things in your Cart', need.length + ' Sachen in deinem Warenkorb', need.length + ' cosas en tu carrito') : T('Already in your Cart', 'Schon in deinem Warenkorb', 'Ya est\u00e1 en tu carrito'));
            return toast(added ? T(need.length + ' things on your shopping list', need.length + ' Sachen auf deiner Einkaufsliste', need.length + ' cosas en tu lista de la compra') : T('Already on your shopping list', 'Steht schon auf deiner Einkaufsliste', 'Ya est\u00e1 en tu lista'));
        }
        if (a === 'kitchen') { toKitchen(0); return; }
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
    function qGo(d) {
        step = Math.max(0, Math.min(STEPS.length - 1, step + d));
        paint(); const h = ov && ov.querySelector('#wbQ'); if (h) { h.tabIndex = -1; try { h.focus({ preventScroll: true }); } catch (e) { } }
    }
    /* "Leave it with ...": a short, calm beat, then the week. A fresh week from today, fitted to the budget when it can be. */
    function makeWeek() {
        S.setup = true; S.plan = []; S.start = today(); S.sent = '';
        const c = build();
        if (c.bs.over && c.ids.length > c.dinners.length) { const f = C.fitBudget(S.plan, c.ids, S.budget, priced, 0, id => C.weekKeys(c.byId[id])); S.plan = f.plan; save(); }
        view = 'make'; paint();
        const reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
        clearTimeout(makeT); const el = ov;
        makeT = setTimeout(() => { if (ov !== el || view !== 'make') return; view = 'week'; paint(); const h = ov && ov.querySelector('#wbWk'); if (h) { h.tabIndex = -1; try { h.focus({ preventScroll: true }); } catch (e) { } } }, reduce ? 300 : 1400);
    }
    /* the budget slider: the number follows the finger without redrawing (a redraw would drop the drag) */
    function onInput(e) {
        if (!e.target || e.target.id !== 'wbBud') return;
        const v = Math.round(+e.target.value); if (!isFinite(v)) return;
        S.budget = Math.min(Math.max(C.BUDGET_MAX, 200), Math.max(C.BUDGET_MIN, v));
        const o = ov && ov.querySelector('#wbBudOut'); if (o) o.textContent = eur(S.budget).replace(/[.,]00(?=\D*$)/, '');
    }
    function onChange(e) {
        if (e.target && e.target.id === 'wbBud') { const v = Math.round(+e.target.value); if (isFinite(v)) { S.budget = Math.min(Math.max(C.BUDGET_MAX, 200), Math.max(C.BUDGET_MIN, v)); save(); const o = ov && ov.querySelector('#wbBudOut'); if (o) o.textContent = eur(S.budget).replace(/[.,]00(?=\D*$)/, ''); } }
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
        el.addEventListener('click', onClick); el.addEventListener('change', onChange); el.addEventListener('input', onInput);
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
        lastFocus = D.activeElement; view = ''; step = 0;
        ov = D.createElement('div'); ov.className = 'wb-ov'; ov.id = 'wbSheet';
        D.body.appendChild(ov); paint();
        ov.addEventListener('click', onClick); ov.addEventListener('change', onChange); ov.addEventListener('input', onInput);
        D.addEventListener('keydown', onKey, true);
        requestAnimationFrame(() => { if (ov) ov.classList.add('in'); const h = ov && ov.querySelector('#wbTitle'); if (h) { h.tabIndex = -1; try { h.focus({ preventScroll: true }); } catch (e) {} } });
    }
    /* the kitchen (Cook > K\u00fcche) is where the week setup ends */
    function toKitchen(wait) {
        const KG = W.LowiKitchenGame; if (!KG || !KG.open) return false;
        setTimeout(() => {
            try { if (inl) { const P = W.LowiStorePicks; if (P && P.close) P.close(); } else close(); } catch (e) {}
            setTimeout(() => { try { KG.open('', { from: 'week' }); } catch (e) {} }, 300);
        }, wait || 0);
        return true;
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
