/* Oct 17, 2026 (E-man, in the shop: "a little emergency button ... see all the snacks that I can buy in the shop, all the meat ...
   all the bread" and "even before entering the shop, be able to see every product that I can buy if I only eat insulin-friendly food").
   The "What can I buy here?" button and its Move-style panel. Logic and the formula live in store-picks-core.js; product ranges in
   data/shop/<range>.json; shop locations in data/shop/stores.json (both built by tools/shop-data/build.py, no keys on the phone).
   The button sits under Cook it / Shop it, in the shopping list and cart, and in the Meals sheets. */
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

    let S = {};
    try { S = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { S = {}; }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
    const cache = {};
    function load(file) {
        if (cache[file]) return cache[file];
        cache[file] = fetch('data/shop/' + file + '.json?v=' + encodeURIComponent(BUILD)).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
            .catch(e => { delete cache[file]; throw e; });
        return cache[file];
    }

    let ov = null, view = 'list', where = null, stores = null, data = null, built = null, q = '', showFail = false, open = {};
    const ic = {
        x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
        pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9.5" r="2.5" fill="currentColor"/></svg>',
        cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2.5l2.2 10.5h10.6L21 7H7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="19" r="1.6" fill="currentColor"/><circle cx="17" cy="19" r="1.6" fill="currentColor"/></svg>'
    };

    function sosHTML(where) {
        return '<button type="button" class="stp-sos" data-stp-open="1" data-stp-from="' + esc(where || '') + '"><span class="stp-sos-dot" aria-hidden="true">!</span><span class="stp-sos-t"><b>' +
            esc(T('What can I buy here?', 'Was kann ich hier kaufen?', '¿Qué puedo comprar aquí?')) + '</b><small>' +
            esc(T('Every insulin-friendly product in your shop', 'Alle insulinfreundlichen Produkte in deinem Laden', 'Todos los productos amigables con la insulina de tu tienda')) + '</small></span></button>';
    }

    function storeLine() {
        if (!S.range) return '';
        const r = RANGE[S.range];
        if (S.store) return S.store.brand + ' · ' + (S.store.town || '') + (S.store.km != null ? ' · ' + dec(S.store.km) + ' km' : '');
        return r ? r.label : S.range;
    }

    function shell(inner) {
        return '<div class="stp-card" role="dialog" aria-modal="true" aria-label="' + esc(T('What can I buy here?', 'Was kann ich hier kaufen?', '¿Qué puedo comprar aquí?')) + '">' + inner + '</div>';
    }
    function footBtns(left) {
        return '<div class="stp-foot">' + (left || '<span></span>') + '<button type="button" class="stp-orb stp-close" data-stp="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '">' + ic.x + '</button></div>';
    }

    /* ---------------- choose a shop ---------------- */
    function pickHTML(msg) {
        let list = '';
        if (stores && where) {
            list = C.nearest(stores.stores, where, 14).map(s => '<button type="button" class="stp-row stp-store" data-stp-store="' + esc(s.id) + '"><b>' + esc(s.brand) + '</b><small>' +
                esc([C.town(s), s.addr && s.addr.indexOf(',') > 0 ? s.addr.split(',')[0] : ''].filter(Boolean).join(' · ')) + '</small><i>' + esc(dec(s.km)) + ' km</i></button>').join('');
            list = '<h4 class="stp-h4">' + esc(T('Shops near you', 'Läden in deiner Nähe', 'Tiendas cerca de ti')) + '</h4><div class="stp-rows">' + list + '</div>';
        }
        const chains = RANGES.map(r => '<button type="button" class="stp-chip' + (S.range === r.id && !S.store ? ' on' : '') + '" data-stp-range="' + r.id + '">' + esc(r.label) + '</button>').join('');
        return shell('<div class="stp-head"><h3>' + esc(T('Which shop?', 'Welcher Laden?', '¿Qué tienda?')) + '</h3><p>' +
            esc(T('Pick a shop near you, or a chain to look before you go.', 'Wähl einen Laden in deiner Nähe oder eine Kette, um vorher zu schauen.', 'Elige una tienda cercana o una cadena para mirar antes de ir.')) + '</p></div>' +
            '<div class="stp-scroll"><button type="button" class="stp-go" data-stp="locate">' + ic.pin + '<span>' + esc(T('Use my location', 'Meinen Standort nutzen', 'Usar mi ubicación')) + '</span></button>' +
            (msg ? '<p class="stp-msg">' + esc(msg) + '</p>' : '') + list +
            '<h4 class="stp-h4">' + esc(T('Or pick a chain', 'Oder eine Kette wählen', 'O elige una cadena')) + '</h4><div class="stp-chips stp-wrap">' + chains + '</div>' +
            '<p class="stp-fine">' + esc(T('There is no Føtex in Germany. The nearest to Flensburg are in Aabenraa and Sønderborg. Føtex, Bilka and Danish Netto share one Salling Group range here.',
                'In Deutschland gibt es keinen Føtex. Die nächsten zu Flensburg sind in Aabenraa und Sønderborg. Føtex, Bilka und dänischer Netto teilen sich hier ein Salling-Group-Sortiment.',
                'No hay Føtex en Alemania. Los más cercanos a Flensburg están en Aabenraa y Sønderborg. Føtex, Bilka y Netto de Dinamarca comparten aquí una gama de Salling Group.')) + '</p></div>' +
            footBtns(S.range ? '<button type="button" class="stp-pill" data-stp="list">' + esc(T('Back to list', 'Zurück zur Liste', 'Volver a la lista')) + '</button>' : ''));
    }

    /* ---------------- the list ---------------- */
    const rowsShown = 40;
    function reason(it) {
        const r = it.r, u = r.unit;
        const parts = [T('GL', 'GL', 'CG') + ' ' + dec(r.gl) + ' ' + T('per', 'pro', 'por') + ' ' + r.serve + ' ' + u, dec(r.carbs) + ' g ' + T('carbs', 'KH', 'carbohidratos')];
        if (r.sugar >= 1) parts.push(dec(r.sugar) + ' g ' + T('sugar', 'Zucker', 'azúcar'));
        if (r.protein >= 3) parts.push(dec(r.protein) + ' g ' + T('protein', 'Eiweiß', 'proteína'));
        if (r.fibre >= 2) parts.push(dec(r.fibre) + ' g ' + T('fibre', 'Ballaststoffe', 'fibra'));
        return parts.join(' · ');
    }
    function itemHTML(it, failed) {
        const r = it.r, p = it.p;
        const tag = failed ? '<em class="stp-tag no">' + esc(r.fail === 'sugar' ? T('Too much sugar', 'Zu viel Zucker', 'Demasiado azúcar') : T('Spikes', 'Lässt steigen', 'Sube')) + '</em>'
            : '<em class="stp-tag ' + (r.best ? 'best' : 'ok') + '">' + esc(r.best ? T('Best', 'Top', 'Mejor') : T('Good', 'Gut', 'Bien')) + '</em>';
        return '<li class="stp-item' + (failed ? ' fail' : '') + '"><div><b>' + esc(p.n) + '</b><small>' + esc([p.b, p.q].filter(Boolean).join(' · ')) +
            (r.typical ? ' · ' + esc(T('typical values, no label online', 'typische Werte, kein Etikett online', 'valores típicos, sin etiqueta en línea')) : '') + '</small><span class="stp-why">' + esc(reason(it)) + '</span></div>' + tag + '</li>';
    }
    function groupHTML(g) {
        const meta = C.G[g.id];
        const name = meta[['en', 'de', 'es'][li()]];
        const total = g.pass.length + g.fail.length + g.unrated;
        if (!total) return '';
        const lim = open[g.id] ? 1e9 : rowsShown;
        let body;
        if (g.pass.length) {
            body = '<ul class="stp-items">' + g.pass.slice(0, lim).map(it => itemHTML(it)).join('') + '</ul>' +
                (g.pass.length > lim ? '<button type="button" class="stp-more" data-stp-more="' + g.id + '">' + esc(T('Show all ' + fmt(g.pass.length), 'Alle ' + fmt(g.pass.length) + ' zeigen', 'Ver los ' + fmt(g.pass.length))) + '</button>' : '');
        } else {
            body = '<p class="stp-none">' + esc(T('None of the ' + fmt(total) + ' products here pass.', 'Keins der ' + fmt(total) + ' Produkte hier besteht.', 'Ninguno de los ' + fmt(total) + ' productos de aquí pasa.')) + '</p>';
        }
        if (showFail && g.fail.length) {
            body += '<h5 class="stp-h5">' + esc(T('Left out', 'Aussortiert', 'Excluidos')) + ' · ' + fmt(g.fail.length) + '</h5><ul class="stp-items">' +
                g.fail.slice(0, open[g.id + ':f'] ? 1e9 : 15).map(it => itemHTML(it, true)).join('') + '</ul>' +
                (g.fail.length > 15 && !open[g.id + ':f'] ? '<button type="button" class="stp-more" data-stp-more="' + g.id + ':f">' + esc(T('Show all left out', 'Alle aussortierten zeigen', 'Ver todos los excluidos')) + '</button>' : '');
        }
        return '<section class="stp-group" id="stpg-' + g.id + '"><h4 class="stp-gh"><span aria-hidden="true">' + meta.ic + '</span>' + esc(name) +
            '<i>' + esc(fmt(g.pass.length)) + ' / ' + esc(fmt(total)) + '</i></h4>' + body + '</section>';
    }
    function listHTML(state, err) {
        let inner = '';
        if (state === 'loading') inner = '<p class="stp-msg">' + esc(T('Loading the shop’s products…', 'Lade die Produkte des Ladens…', 'Cargando los productos de la tienda…')) + '</p>';
        else if (state === 'error') inner = '<p class="stp-msg">' + esc(T('Couldn’t load the products. Check your connection and try again.', 'Die Produkte ließen sich nicht laden. Prüf die Verbindung und versuch es nochmal.', 'No se pudieron cargar los productos. Revisa la conexión e inténtalo de nuevo.')) + '</p><button type="button" class="stp-go" data-stp="retry">' + esc(T('Try again', 'Nochmal', 'Reintentar')) + '</button>';
        else {
            built = C.build(data, { q });
            const c = built.counts;
            const chips = built.groups.filter(g => g.pass.length + g.fail.length + g.unrated).map(g => '<button type="button" class="stp-chip" data-stp-jump="' + g.id + '"><span aria-hidden="true">' + C.G[g.id].ic + '</span>' + esc(C.G[g.id][['en', 'de', 'es'][li()]].split(/[,&]| y | und /)[0].trim()) + ' <i>' + fmt(g.pass.length) + '</i></button>').join('');
            inner = '<p class="stp-sum"><b>' + esc(fmt(c.pass)) + '</b> ' + esc(T('of ' + fmt(c.total) + ' products pass', 'von ' + fmt(c.total) + ' Produkten bestehen', 'de ' + fmt(c.total) + ' productos pasan')) +
                (c.unrated ? ' · ' + esc(T(fmt(c.unrated) + ' without a label', fmt(c.unrated) + ' ohne Etikett', fmt(c.unrated) + ' sin etiqueta')) : '') + '</p>' +
                '<div class="stp-chips stp-jumps">' + chips + '</div>' +
                built.groups.map(groupHTML).join('') +
                (c.total ? '' : '<p class="stp-none">' + esc(T('Nothing matches that search.', 'Nichts passt zu der Suche.', 'Nada coincide con la búsqueda.')) + '</p>') +
                '<details class="stp-how"><summary>' + esc(T('How the rating works', 'So wird bewertet', 'Cómo se valora')) + '</summary><p>' +
                esc(T('For each product: carbs per typical portion from its label (100 g meat or fish, 30 g cheese, 40 g bread, 25 g sweets, 30 g snacks, 250 ml drink, 150 g yoghurt). The GI is estimated from the food type and lowered by fibre, protein and fat. Glycemic load = carbs × GI ÷ 100. A product passes with a load of 5 or less and no more than 6 g sugar per portion; 2 or less is marked Best.',
                    'Für jedes Produkt: Kohlenhydrate pro typischer Portion laut Etikett (100 g Fleisch oder Fisch, 30 g Käse, 40 g Brot, 25 g Süßes, 30 g Snacks, 250 ml Getränk, 150 g Joghurt). Der GI wird aus der Lebensmittelart geschätzt und durch Ballaststoffe, Eiweiß und Fett gesenkt. Glykämische Last = KH × GI ÷ 100. Ein Produkt besteht mit einer Last bis 5 und höchstens 6 g Zucker pro Portion; bis 2 heißt Top.',
                    'Para cada producto: carbohidratos por porción típica según su etiqueta (100 g de carne o pescado, 30 g de queso, 40 g de pan, 25 g de dulces, 30 g de snacks, 250 ml de bebida, 150 g de yogur). El IG se estima según el tipo de alimento y baja con la fibra, la proteína y la grasa. Carga glucémica = carbohidratos × IG ÷ 100. Un producto pasa con una carga de 5 o menos y no más de 6 g de azúcar por porción; 2 o menos es Mejor.')) + '</p>' +
                '<p>' + esc(T('Real: product names and label values. Estimated: the GI and so the load. ', 'Echt: Produktnamen und Etikettwerte. Geschätzt: der GI und damit die Last. ', 'Real: nombres y valores de la etiqueta. Estimado: el IG y por tanto la carga. ') + (data && data.note ? data.note : '')) + '</p>' +
                '<p>' + esc(T('Source: ', 'Quelle: ', 'Fuente: ') + (data && data.source || '') + ' · ' + (data && data.built || '')) + '</p></details>';
        }
        const r = RANGE[S.range];
        return shell('<div class="stp-head"><h3>' + esc(T('What can I buy here?', 'Was kann ich hier kaufen?', '¿Qué puedo comprar aquí?')) + '</h3>' +
            '<button type="button" class="stp-shop" data-stp="pick">' + ic.cart + '<span>' + esc(storeLine() || (r && r.label) || '') + '</span><i>' + esc(T('Change', 'Ändern', 'Cambiar')) + '</i></button>' +
            '<div class="stp-tools"><input type="search" class="stp-q" enterkeyhint="search" autocomplete="off" placeholder="' + esc(T('Search this shop', 'In diesem Laden suchen', 'Buscar en esta tienda')) + '" value="' + esc(q) + '">' +
            '<label class="stp-tog"><input type="checkbox" data-stp="fails"' + (showFail ? ' checked' : '') + '><span>' + esc(T('Show left out', 'Aussortierte zeigen', 'Ver excluidos')) + '</span></label></div></div>' +
            '<div class="stp-scroll">' + inner + '</div>' +
            '<p class="stp-note">' + esc(T('General food guidance, not medical advice.', 'Allgemeine Ernährungshilfe, keine medizinische Beratung.', 'Orientación general sobre alimentos, no consejo médico.')) + '</p>' +
            footBtns(''));
    }

    function paint(state) {
        if (!ov) return;
        const sc = ov.querySelector('.stp-scroll'), top = sc ? sc.scrollTop : 0;
        const hadQ = D.activeElement && D.activeElement.classList && D.activeElement.classList.contains('stp-q');
        ov.innerHTML = view === 'pick' ? pickHTML(state) : listHTML(state);
        const sc2 = ov.querySelector('.stp-scroll'); if (sc2 && state === 'keep') sc2.scrollTop = top;
        if (hadQ) { const i = ov.querySelector('.stp-q'); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) {} } }
    }
    function showList() {
        view = 'list';
        if (!S.range) { view = 'pick'; paint(); return; }
        data = null; paint('loading');
        load(S.range).then(d => { data = d; if (ov && view === 'list') paint(); }).catch(() => { if (ov && view === 'list') paint('error'); });
    }
    function locate() {
        const msg = T('Finding shops near you…', 'Suche Läden in deiner Nähe…', 'Buscando tiendas cerca…');
        paint(msg);
        const go = () => {
            if (!navigator.geolocation) { paint(T('Location isn’t available here. Pick a chain below.', 'Standort ist hier nicht verfügbar. Wähl unten eine Kette.', 'La ubicación no está disponible. Elige una cadena abajo.')); return; }
            navigator.geolocation.getCurrentPosition(pos => {
                where = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                const near = C.nearest(stores.stores, where, 1)[0];
                paint(near && near.km > 80 ? T('The shop lists cover Flensburg and southern Denmark. These are the closest.', 'Die Ladenlisten decken Flensburg und Südänemark ab. Das sind die nächsten.', 'Las listas cubren Flensburg y el sur de Dinamarca. Estas son las más cercanas.') : '');
            }, () => { paint(T('Location is off. Pick a chain below, or allow location for this site in Settings.', 'Standort ist aus. Wähl unten eine Kette oder erlaube den Standort in den Einstellungen.', 'La ubicación está desactivada. Elige una cadena abajo o permítela en Ajustes.')); },
            { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
        };
        if (stores) go(); else load('stores').then(d => { stores = d; go(); }).catch(() => paint(T('Couldn’t load the shop map. Pick a chain below.', 'Die Ladenkarte ließ sich nicht laden. Wähl unten eine Kette.', 'No se pudo cargar el mapa. Elige una cadena abajo.')));
    }

    function onClick(e) {
        const t = e.target.closest ? e.target : null; if (!t) return;
        if (e.target === ov) { close(); return; }
        const b = t.closest('[data-stp],[data-stp-store],[data-stp-range],[data-stp-more],[data-stp-jump]');
        if (!b || b.tagName === 'INPUT') return;
        const a = b.getAttribute('data-stp');
        if (a === 'close') return close();
        if (a === 'pick') { view = 'pick'; return paint(); }
        if (a === 'list') return showList();
        if (a === 'locate') return locate();
        if (a === 'retry') return showList();
        if (b.hasAttribute('data-stp-range')) { S = { range: b.getAttribute('data-stp-range') }; save(); q = ''; open = {}; return showList(); }
        if (b.hasAttribute('data-stp-store')) {
            const s = (stores && stores.stores || []).find(x => x.id === b.getAttribute('data-stp-store')); if (!s) return;
            if (!RANGE[s.chain]) return;
            S = { range: s.chain, store: { id: s.id, brand: s.brand, town: C.town(s), km: where ? Math.round(C.km(where, s) * 10) / 10 : null } }; save(); q = ''; open = {};
            return showList();
        }
        if (b.hasAttribute('data-stp-more')) { open[b.getAttribute('data-stp-more')] = true; return paint('keep'); }
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
    function onKey(e) { if (e.key === 'Escape' && ov) close(); }

    function openPanel(from) {
        if (ov) return;
        ov = D.createElement('div');
        ov.className = 'stp-ov';
        ov.addEventListener('click', onClick);
        ov.addEventListener('input', onInput);
        ov.addEventListener('change', onChange);
        D.addEventListener('keydown', onKey);
        D.body.appendChild(ov);
        requestAnimationFrame(() => { if (ov) ov.classList.add('in'); });
        q = ''; showFail = false; open = {};
        if (S.range) showList(); else { view = 'pick'; paint(); }
        try { W.dispatchEvent(new CustomEvent('lowi:storepicks', { detail: { open: true, from: from || '' } })); } catch (e) {}
    }
    function close() {
        if (!ov) return;
        const o = ov; ov = null;
        D.removeEventListener('keydown', onKey);
        o.classList.remove('in'); o.classList.add('out');
        setTimeout(() => { try { o.remove(); } catch (e) {} }, 260);
    }

    /* put the button where food decisions happen: under Cook it / Shop it, in the shopping list and cart, in the Meals sheets */
    const SPOTS = [['#csHub', 'cook'], ['.ss-entry', 'shop'], ['.sp-quick-cap', 'meal'], ['.wme-sheet .wme-log', 'meals']];
    function decorate() {
        SPOTS.forEach(([sel, from]) => {
            D.querySelectorAll(sel).forEach(el => {
                const nx = el.nextElementSibling;
                if (nx && nx.classList && nx.classList.contains('stp-sos')) return;
                const w = D.createElement('div'); w.innerHTML = sosHTML(from);
                el.insertAdjacentElement('afterend', w.firstChild);
            });
        });
    }
    let pend = 0;
    function soon() { if (pend) return; pend = requestAnimationFrame(() => { pend = 0; try { decorate(); } catch (e) {} }); }
    D.addEventListener('click', e => {
        const b = e.target && e.target.closest && e.target.closest('[data-stp-open]');
        if (!b) return;
        e.preventDefault(); e.stopPropagation();
        openPanel(b.getAttribute('data-stp-from'));
    }, true);
    function boot() {
        decorate();
        try { new MutationObserver(soon).observe(D.body, { childList: true, subtree: true }); } catch (e) {}
        W.addEventListener('lowi:lang', () => { D.querySelectorAll('.stp-sos').forEach(b => b.remove()); decorate(); if (ov) paint(data ? 'keep' : undefined); });
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();

    W.LowiStorePicks = { open: openPanel, close, sosHTML, state: () => JSON.parse(JSON.stringify(S)), isOpen: () => !!ov };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
