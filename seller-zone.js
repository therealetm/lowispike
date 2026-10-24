/* Oct 23, 2026: Seller Zone (Eman: "our own Amazon within our app"). Real snacks you can order online that pass the strict scanner
   standard, in living bubble style. Lives in the Shop panel (Fuel > Shop) as its own tab and a swipe shelf, and opens from the scanner card: scan chips, chocolate,
   Haribo or biscuits and the card shows buyable swaps from here. Data: seller-zone-data.js; logic: seller-zone-core.js.
   The section's name lives only in LowiSellerZoneData.NAME. Links open the shop's own product page; no affiliate links. */
(function (W, D) {
    'use strict';
    if (!W || !D || W.LowiSellerZone) return;
    const C = W.LowiSellerZoneCore, DATA = W.LowiSellerZoneData;
    if (!C || !DATA) return;
    const li = () => { const l = (D.documentElement.lang || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const lang = () => ['en', 'de', 'es'][li()];
    const T = (en, de, es) => [en, de, es][li()];
    const tx = o => C.tx(o, lang());
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const NAME = () => tx(DATA.NAME);
    const RKEY = 'lowi.sellerZone.region';
    let region = null, cat = 'all', ov = null, lastFocus = null;
    function myRegion() {
        if (region) return region;
        try { region = localStorage.getItem(RKEY) || ''; } catch (x) { region = ''; }
        if (!region) { let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (x) { } region = C.regionOf((navigator.languages && navigator.languages[0]) || navigator.language || D.documentElement.lang, tz); }
        return region;
    }
    const REGIONS = [['eu', '\u{1F1EA}\u{1F1FA}', () => T('EU', 'EU', 'UE'), () => T('Germany & EU', 'Deutschland & EU', 'Alemania y UE')], ['uk', '\u{1F1EC}\u{1F1E7}', () => 'UK'], ['us', '\u{1F1FA}\u{1F1F8}', () => T('USA', 'USA', 'EE. UU.')], ['ww', '\u{1F30D}', () => T('All', 'Alle', 'Todos')]];
    const verdictPill = v => v === 'ja'
        ? '<span class="sz-v sz-ja">' + esc(T('Everyday', 'Alltag', 'Diario')) + '</span>'
        : '<span class="sz-v sz-sel">' + esc(T('Sometimes', 'Ab und zu', 'A veces')) + '</span>';
    const ext = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    /* Oct 23 (Eman: "Pls add images. Nobody likes just reading it."): every product shows its real photo, taken from its own
       shop page and stored in the repo (seller-zone-img/, about 15 KB each). The emoji bubble sits underneath: it shows when a
       product has no photo, and when a photo fails to load the image is dropped so the bubble shows instead of an empty box.
       Photos load lazily and do not pulse, so a long list costs no battery. */
    const photo = (x, cls) => '<span class="sz-ph ' + cls + (x.pic ? '' : ' sz-noimg') + '" aria-hidden="true"><span class="sz-ph-e">' + x.e + '</span>' +
        (x.pic ? '<img class="sz-img" src="' + esc(x.pic) + '" alt="" width="400" height="400" loading="lazy" decoding="async" draggable="false">' : '') + '</span>';
    D.addEventListener('error', function (e) {
        const t = e.target;
        if (!t || !t.classList || !t.classList.contains('sz-img')) return;
        const p = t.parentNode; if (p && p.classList) p.classList.add('sz-noimg');
        try { t.remove(); } catch (x) { }
    }, true);
    /* ---- scanner card: buyable swaps for a junk snack ---- */
    function swapHTML(p) {
        try {
            if (!p || p.verdict === 'ok' || p.verdict === 'unknown' || p.notFound) return '';
            const kind = C.kindOf(p); if (!kind) return '';
            const items = C.swapsFor(DATA, kind, myRegion(), 3); if (!items.length) return '';
            return '<section class="sc-sec sz-swap" data-sz-kind="' + kind + '"><h4>' + esc(T('Buy this instead', 'Kauf lieber das', 'Compra esto mejor')) + ' \u00b7 ' + esc(NAME()) + '</h4>' +
                '<div class="sz-row">' + items.map(x => '<a class="sz-mini" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer" data-sz-link="' + esc(x.id) + '">' +
                    photo(x, 'sz-ph-m') + '<b>' + esc(x.n) + '</b><small>' + esc(x.b) + '</small>' + verdictPill(x.v) + '</a>').join('') + '</div>' +
                (DATA.NOTE[kind] ? '<p class="sz-note">' + esc(tx(DATA.NOTE[kind])) + '</p>' : '') +
                '<button type="button" class="sz-all" data-sz-open="' + kind + '">' + esc(T('See all in ', 'Alle im ', 'Ver todo en ') + NAME()) + ' \u203a</button></section>';
        } catch (x) { return ''; }
    }
    /* ---- Shop panel entry ---- */
    function entryHTML() {
        return '<button type="button" class="sz-entry" data-stp="sellerzone"><span class="sz-orb" aria-hidden="true">\u{1F6CD}\uFE0F</span><span class="sz-entry-t"><b>' + esc(NAME()) + '</b><small>' +
            esc(T('Snacks to order online: chips, chocolate, sweets, all checked', 'Snacks online bestellen: Chips, Schoko, Süßes, alles geprüft', 'Snacks para pedir online: patatas, chocolate, dulces, todo revisado')) + '</small></span><span class="sz-chev" aria-hidden="true">\u203a</span></button>';
    }
    /* ---- the zone itself ---- */
    /* image first, short text: the photo with the verdict and the price on it, then the name, then portion and delivery.
       Why it passes and the ingredients wait behind one tap, so the grid reads like a shop shelf (2 across on iPhone, more on iPad). */
    function card(x) {
        const r = myRegion(), away = r !== 'ww' && x.r.indexOf(r) < 0;
        return '<article class="sz-card' + (away ? ' sz-away' : '') + '" data-sz-id="' + esc(x.id) + '">' +
            '<a class="sz-pic" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(x.n + ' \u00b7 ' + x.shop) + '">' + photo(x, 'sz-ph-l') +
                verdictPill(x.v) + (x.price ? '<span class="sz-price">' + esc(x.price) + '</span>' : '') + '</a>' +
            '<div class="sz-tt"><b>' + esc(x.n) + '</b><small>' + esc(x.b) + ' \u00b7 ' + esc(x.shop) + '</small></div>' +
            '<p class="sz-meta"><span>\u{1F37D}\uFE0F ' + esc(tx(x.por)) + '</span><span>\u{1F69A} ' + esc(tx(x.ships)) + '</span></p>' +
            '<details class="sz-more"><summary>' + esc(T('Why it passes · ingredients', 'Warum okay · Zutaten', 'Por qué pasa · ingredientes')) + '</summary>' +
                '<p class="sz-why">' + esc(tx(x.why)) + '</p>' +
                '<p class="sz-ing">' + esc(T('Ingredients: ', 'Zutaten: ', 'Ingredientes: ')) + esc(x.ing) + '</p></details>' +
            '<div class="sz-acts"><a class="sz-buy" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' + esc(T('Open shop', 'Zum Shop', 'Ir a la tienda')) + ext + '</a>' +
            '<a class="sz-amz" href="' + esc(C.amazonUrl(x.amz, r)) + '" target="_blank" rel="noopener noreferrer">' + esc(T('Find on Amazon', 'Bei Amazon suchen', 'Buscar en Amazon')) + ext + '</a></div></article>';
    }
    /* the zone's shelves, regions, cards and checked-and-failed list, without a frame: the overlay (html) and the Shop panel's
       Seller Zone tab (inlineHTML, Oct 23 Eman: "Pack ihn mal auch in Shop. Mit dem selben Design") show the same thing */
    function bodyHTML() {
        const r = myRegion();
        const cats = '<button type="button" class="sz-chip' + (cat === 'all' ? ' on' : '') + '" data-sz-cat="all" aria-pressed="' + (cat === 'all') + '">\u2728 ' + esc(T('All', 'Alle', 'Todo')) + '</button>' +
            DATA.CATS.map(c => '<button type="button" class="sz-chip' + (cat === c.id ? ' on' : '') + '" data-sz-cat="' + c.id + '" aria-pressed="' + (cat === c.id) + '" aria-label="' + esc(tx(c.t)) + '">' + c.e + ' ' + esc(tx(c.s || c.t)) + '</button>').join('');
        const regs = REGIONS.map(([id, f, l, full]) => '<button type="button" class="sz-chip sz-reg' + (r === id ? ' on' : '') + '" data-sz-reg="' + id + '" aria-pressed="' + (r === id) + '"' + (full ? ' aria-label="' + esc(full()) + '"' : '') + '>' + f + ' ' + esc(l()) + '</button>').join('');
        const items = C.list(DATA, cat, r);
        const note = cat !== 'all' && DATA.NOTE[cat] ? '<p class="sz-note sz-note-l">' + esc(tx(DATA.NOTE[cat])) + '</p>' : '';
        const failed = '<details class="sz-failed"><summary>' + esc(T('Checked and not passing', 'Geprüft und durchgefallen', 'Revisado y no pasa')) + ' (' + DATA.FAILED.length + ')</summary><ul>' +
            DATA.FAILED.map(f => '<li><b>' + esc(tx(f.n)) + '</b> ' + esc(tx(f.why)) + '</li>').join('') + '</ul></details>';
        /* 24 Oct 2026 (Emmanuel: shelves and regions were one mixed strip): two rows, each labelled, each with its own selected look */
        return '<div class="sz-filters"><div class="sz-filter sz-filter-cat"><span class="sz-flabel" id="sz-fl-cat">' + esc(T('Category', 'Kategorie', 'Categoría')) + '</span><div class="sz-chips" role="group" aria-labelledby="sz-fl-cat">' + cats + '</div></div>' +
            '<div class="sz-filter sz-filter-reg"><span class="sz-flabel" id="sz-fl-reg">' + esc(T('Region', 'Region', 'Región')) + '</span><div class="sz-chips sz-regs" role="group" aria-labelledby="sz-fl-reg">' + regs + '</div></div></div>' + note +
            '<div class="sz-grid">' + items.map(card).join('') + '</div>' + failed +
            '<p class="sz-fine">' + esc(T('Checked on 23 Oct 2026 on each shop’s own page. Prices and stock can change. No paid placements.', 'Geprüft am 23.10.2026 auf der Seite des jeweiligen Shops. Preise und Verfügbarkeit können sich ändern. Keine bezahlten Platzierungen.', 'Revisado el 23/10/2026 en la página de cada tienda. Precios y stock pueden cambiar. Sin colocaciones pagadas.')) + '</p>';
    }
    const LEAD = () => T('Real snacks you can order. Each one checked against our strict scanner rules.', 'Echte Snacks zum Bestellen. Jeder nach unseren strengen Scanner-Regeln geprüft.', 'Snacks reales para pedir. Cada uno revisado con nuestras reglas estrictas del escáner.');
    function html() {
        return '<div class="sz-box" role="dialog" aria-modal="true" aria-labelledby="szTitle">' +
            '<div class="sz-head"><span class="sz-orb sz-orb-h" aria-hidden="true">\u{1F6CD}\uFE0F</span><div><h3 id="szTitle">' + esc(NAME()) + '</h3><p>' + esc(LEAD()) + '</p></div></div>' +
            '<div class="sz-scroll">' + bodyHTML() + '</div>' +
            '<div class="sz-foot"><button type="button" class="sz-close" data-sz="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button></div></div>';
    }
    /* ---- inside the Shop panel (store-picks.js): the head line, the whole zone, and a swipe shelf on the supermarket tab ---- */
    function inlineHeadHTML() {
        return '<div class="sz-head sz-head-in"><span class="sz-orb sz-orb-h" aria-hidden="true">\u{1F6CD}\uFE0F</span><div><h3>' + esc(NAME()) + '</h3><p>' + esc(LEAD()) + '</p></div></div>';
    }
    function inlineHTML() { return '<div class="sz-inline" data-sz-inline="1">' + bodyHTML() + '</div>'; }
    /* a tap on a shelf or region chip inside the panel: true when it changed something (the panel repaints, keeping its scroll) */
    function inlineClick(t) {
        if (!t || !t.closest || !t.closest('[data-sz-inline]')) return false;
        const c = t.closest('[data-sz-cat]'); if (c) { cat = c.getAttribute('data-sz-cat'); return true; }
        const r = t.closest('[data-sz-reg]'); if (r) { region = r.getAttribute('data-sz-reg'); try { localStorage.setItem(RKEY, region); } catch (x) {} return true; }
        return false;
    }
    /* the supermarket tab shows the zone as a shelf you swipe through, same orbs and pills; a tap opens that card on the zone tab */
    function stripHTML() {
        const items = C.list(DATA, 'all', myRegion());
        if (!items.length) return '';
        return '<section class="sz-strip" aria-label="' + esc(NAME()) + '"><div class="sz-strip-h"><span class="sz-orb" aria-hidden="true">\u{1F6CD}\uFE0F</span><span class="sz-strip-t"><b>' + esc(NAME()) + '</b><small>' +
            esc(T('Snacks to order online, all checked', 'Snacks online bestellen, alle geprüft', 'Snacks para pedir online, todos revisados')) + '</small></span>' +
            '<button type="button" class="sz-strip-all" data-stp-tab="sz">' + esc(T('All ', 'Alle ', 'Todos ')) + items.length + ' \u203a</button></div>' +
            '<div class="sz-strip-row">' + items.map(x => '<button type="button" class="sz-mini sz-strip-it" data-stp-tab="sz" data-sz-focus="' + esc(x.id) + '">' +
                photo(x, 'sz-ph-m') + '<b>' + esc(x.n) + '</b><small>' + esc(x.b) + '</small>' + verdictPill(x.v) + '</button>').join('') + '</div></section>';
    }
    function setCat(k) { cat = k && (k === 'all' || DATA.CATS.some(c => c.id === k)) ? k : 'all'; }
    function paint(keep) {
        if (!ov) return;
        const sc = ov.querySelector('.sz-scroll'), top = keep && sc ? sc.scrollTop : 0;
        ov.innerHTML = html();
        const s2 = ov.querySelector('.sz-scroll'); if (s2 && top) s2.scrollTop = top;
    }
    function onKey(e) { if (e.key === 'Escape' && ov) { e.stopPropagation(); close(); } }
    function onClick(e) {
        const t = e.target && e.target.closest ? e.target : null; if (!t) return;
        if (t === ov || t.closest('[data-sz="close"]')) { close(); return; }
        const c = t.closest('[data-sz-cat]'); if (c) { cat = c.getAttribute('data-sz-cat'); paint(); return; }
        const r = t.closest('[data-sz-reg]'); if (r) { region = r.getAttribute('data-sz-reg'); try { localStorage.setItem(RKEY, region); } catch (x) {} paint('keep'); return; }
    }
    function open(kind) {
        setCat(kind);
        lastFocus = D.activeElement;
        if (!ov) {
            ov = D.createElement('div'); ov.className = 'sz-ov'; ov.id = 'sellerZone';
            ov.addEventListener('click', onClick);
            D.body.appendChild(ov);
        }
        paint();
        D.documentElement.classList.add('sz-open');
        D.addEventListener('keydown', onKey, true);
        requestAnimationFrame(() => { if (ov) { ov.classList.add('show'); const b = ov.querySelector('.sz-chip.on') || ov.querySelector('.sz-close'); try { b && b.focus({ preventScroll: true }); } catch (x) {} } });
    }
    function close() {
        if (!ov) return;
        const o = ov; ov = null;
        o.classList.remove('show');
        D.documentElement.classList.remove('sz-open');
        D.removeEventListener('keydown', onKey, true);
        setTimeout(() => { try { o.remove(); } catch (x) {} }, 260);
        try { lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); } catch (x) {}
    }
    /* "See all" on the scanner card; a link inside the card opens in a new tab and must not be eaten by the card's own taps */
    D.addEventListener('click', e => {
        const b = e.target && e.target.closest && e.target.closest('[data-sz-open]');
        if (b) { e.preventDefault(); e.stopPropagation(); open(b.getAttribute('data-sz-open')); return; }
        const a = e.target && e.target.closest && e.target.closest('a[data-sz-link]');
        if (a) e.stopPropagation();
    }, true);
    W.addEventListener('pagehide', () => D.documentElement.classList.remove('sz-open'));
    W.LowiSellerZone = { open, close, swapHTML, entryHTML, stripHTML, inlineHTML, inlineHeadHTML, inlineClick, setCat, count: () => ((DATA && DATA.P) || []).length, isOpen: () => !!ov, name: NAME };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
