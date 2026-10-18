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
    function reason(it) {
        const r = it.r, u = r.unit;
        const parts = [T('GL', 'GL', 'CG') + ' ' + dec(r.gl) + ' ' + T('per', 'pro', 'por') + ' ' + r.serve + ' ' + u, dec(r.carbs) + ' g ' + T('carbs', 'KH', 'carbohidratos')];
        if (r.sugar >= 1) parts.push(dec(r.sugar) + ' g ' + T('sugar', 'Zucker', 'azúcar'));
        if (r.protein >= 3) parts.push(dec(r.protein) + ' g ' + T('protein', 'Eiweiß', 'proteína'));
        if (r.fibre >= 2) parts.push(dec(r.fibre) + ' g ' + T('fibre', 'Ballaststoffe', 'fibra'));
        return parts.join(' · ');
    }
    /* Oct 18, 2026 (E-man in Lidl Flensburg, could not tap "Bio Linsen": "It should be linked in there ... a little window next to
       best. Just like Amazon, so we can actually see ... an image of the product."). Each row is a button with a small photo; the
       photo waits in data-src until the row scrolls near (IntersectionObserver), so a long list never asks for thousands at once. */
    let shown = [], qv = null, qvFrom = -1, io = null;
    const camera = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13.2" r="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    function tagHTML(r, failed) {
        return failed ? '<em class="stp-tag no">' + esc(r.fail === 'sugar' ? T('Too much sugar', 'Zu viel Zucker', 'Demasiado azúcar') : T('Spikes', 'Lässt steigen', 'Sube')) + '</em>'
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
        const g = dec(e.gl), sv = e.serve + ' ' + e.unit, su = dec(e.sugar);
        if (e.verdict === 'best') return T('Best: about ' + g + ' glycemic load in a ' + sv + ' portion. 2 or less is Best.',
            'Top: etwa ' + g + ' glykämische Last in einer Portion von ' + sv + '. Bis 2 heißt Top.',
            'Mejor: unos ' + g + ' de carga glucémica en una porción de ' + sv + '. 2 o menos es Mejor.');
        /* Oct 18, 2026 (lowiSPIKE principles audit): a zero-sugar cola or energy drink has no sugar load, but it is not minimally
           processed, so it is Good, never Best */
        if (e.verdict === 'good' && e.sweetened) return T('Good, not Best: about ' + g + ' glycemic load in a ' + sv + ' portion, so no real sugar load, but it is a sweetened, processed drink. Water and plain tea are Best.',
            'Gut, nicht Top: etwa ' + g + ' glykämische Last in einer Portion von ' + sv + ', also kaum Zuckerlast, aber ein gesüßtes, verarbeitetes Getränk. Wasser und purer Tee sind Top.',
            'Bien, no Mejor: unos ' + g + ' de carga glucémica en una porción de ' + sv + ', casi sin carga de azúcar, pero es una bebida endulzada y procesada. El agua y el té solo son Mejor.');
        if (e.verdict === 'good') return T('Good: about ' + g + ' glycemic load in a ' + sv + ' portion and ' + su + ' g sugar. It passes at 5 or less with at most 6 g sugar; Best needs 2 or less.',
            'Gut: etwa ' + g + ' glykämische Last in einer Portion von ' + sv + ' und ' + su + ' g Zucker. Bestanden bis 5 mit höchstens 6 g Zucker; Top braucht bis 2.',
            'Bien: unos ' + g + ' de carga glucémica en una porción de ' + sv + ' y ' + su + ' g de azúcar. Pasa con 5 o menos y como mucho 6 g de azúcar; Mejor necesita 2 o menos.');
        if (e.verdict === 'sugar') return T('Left out: ' + su + ' g sugar in a ' + sv + ' portion. The limit is 6 g.',
            'Aussortiert: ' + su + ' g Zucker in einer Portion von ' + sv + '. Die Grenze ist 6 g.',
            'Excluido: ' + su + ' g de azúcar en una porción de ' + sv + '. El límite es 6 g.');
        return T('Left out: about ' + g + ' glycemic load in a ' + sv + ' portion. The limit is 5.',
            'Aussortiert: etwa ' + g + ' glykämische Last in einer Portion von ' + sv + '. Die Grenze ist 5.',
            'Excluido: unos ' + g + ' de carga glucémica en una porción de ' + sv + '. El límite es 5.');
    }
    function mathText(e) {
        const s = dec(e.carbs) + ' g ' + T('carbs', 'KH', 'carbohidratos') + ' × GI ' + e.gi + ' ÷ 100 = ' + dec(e.gl) + '. ';
        return s + (e.typical ? T('This product has no label online, so typical values for this food were used. ', 'Dieses Produkt hat online kein Etikett, deshalb wurden typische Werte für dieses Lebensmittel genommen. ', 'Este producto no tiene etiqueta en línea, así que se usaron valores típicos de este alimento. ')
            : T('The carbs and sugar come from the label. ', 'KH und Zucker stammen vom Etikett. ', 'Los carbohidratos y el azúcar vienen de la etiqueta. ')) +
            T('The GI is an estimate from the food type, lowered by fibre, protein and fat, so the load is an estimate too.',
                'Der GI ist eine Schätzung aus der Lebensmittelart, gesenkt durch Ballaststoffe, Eiweiß und Fett, also ist auch die Last geschätzt.',
                'El IG es una estimación según el tipo de alimento, reducida por la fibra, la proteína y la grasa, así que la carga también es estimada.');
    }
    function labelHTML(p) {
        const v = x => (typeof x === 'number' ? dec(x) : '–');
        const rowsL = [[T('Carbs', 'Kohlenhydrate', 'Carbohidratos'), v(p.c) + ' g'], [T('of which sugar', 'davon Zucker', 'de los cuales azúcar'), v(p.s) + ' g'],
            [T('Fibre', 'Ballaststoffe', 'Fibra'), v(p.f) + ' g'], [T('Protein', 'Eiweiß', 'Proteína'), v(p.p) + ' g'], [T('Fat', 'Fett', 'Grasa'), v(p.fat) + ' g'],
            [T('Energy', 'Energie', 'Energía'), v(p.kcal) + ' kcal']];
        return '<dl class="stp-qv-dl">' + rowsL.map(x => '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>').join('') + '</dl>';
    }
    function whereText() {
        const name = (data && data.name) || (RANGE[S.range] && RANGE[S.range].label) || '';
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
        if (qv && (e.target === qv || (t.closest('[data-stp="qv-close"]') && qv.contains(t)))) { closeQuick(); return; }
        if (qv && qv.contains(t)) return;
        if (e.target === ov) { close(); return; }
        const row = t.closest('[data-stp-item]');
        if (row) { openQuick(+row.getAttribute('data-stp-item')); return; }
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
        data = null; built = null; shown = []; /* the rows are gone with the panel: keep nothing of them while it is closed */
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
