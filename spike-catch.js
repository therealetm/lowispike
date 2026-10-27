/* LOWiSPIKE spike lists + community deals (Oct 16, 2026).
   - Spike lists: every caught product (shared dex + your own catches), sorted into "Likely spikes" and "Likely won't spike" by
     spike-core.js, searchable, with a "Looks healthy" filter for the spiky foods that look healthy. Tap one = its spike card.
   - Community deals (Angebote): anyone can post that a product is on offer at a store, with the price and how long it runs
     (today, 3 days, this week, 2 weeks). Deals expire on their own. The scanned product's active deals show on its card.
   Storage: deals are saved on the phone (lowi.deals.v1) and, when signed in, in the shared table public.product_deals
   (proposal: supabase/proposals/product_deals_20261016.sql). If that table is not there yet, deals stay on the phone. */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) { root.LowiDeals = api.deals; root.LowiSpikeLists = api.lists; }
})(typeof window !== 'undefined' ? window : null, function (W) {
    'use strict';
    const DAY = 864e5, KEY = 'lowi.deals.v1';
    const nkey = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80);
    const pkey = p => (p && p.barcode ? 'b' + p.barcode : 'n' + nkey(p && p.name));
    /* how long a deal runs: today = until local midnight, the others in whole days from now */
    const RUNS = ['today', '3d', 'week', '2w'];
    function until(run, now) {
        now = now || Date.now();
        if (run === 'today') { const d = new Date(now); d.setHours(23, 59, 59, 999); return d.getTime(); }
        if (run === 'week') { const d = new Date(now); const left = (7 - d.getDay()) % 7; d.setHours(23, 59, 59, 999); return d.getTime() + left * DAY; }
        return now + (run === '2w' ? 14 : 3) * DAY;
    }
    const active = (list, now) => (list || []).filter(d => d && +d.until > (now || Date.now()));
    function forProduct(list, p, now) {
        const k = pkey(p), nk = nkey(p && p.name);
        return active(list, now).filter(d => d.key === k || (nk && nkey(d.name) === nk)).sort((a, b) => a.price - b.price);
    }
    function parsePrice(v) { const n = parseFloat(String(v || '').replace(/[^\d.,]/g, '').replace(',', '.')); return isFinite(n) && n > 0 && n < 1000 ? Math.round(n * 100) / 100 : null; }
    function valid(d) { return !!(d && d.name && String(d.name).trim().length >= 2 && d.store && String(d.store).trim().length >= 2 && parsePrice(d.price) != null && +d.until > Date.now()); }
    /* spike lists: re-rate every item with the current estimator, split, search, "looks healthy".
       scanfe-h3 (Oct 23, 2026): when rate returns an engine result, the verdict is made stricter by the Food check card
       (LowiSpikeCore.tighten: NEIN -> spike, SELTEN -> at least better), the same as Shuffle and the shopping scan, so a
       product the card says NO to can't sit under "Likely won't spike". Manual entries keep their own rating. */
    let SC = null;
    function spikeCore() {
        if (W && W.LowiSpikeCore) return W.LowiSpikeCore;
        if (SC) return SC;
        if (typeof require === 'function') { try { SC = require('./spike-core.js'); } catch (e) { SC = null; } }
        return SC;
    }
    function split(items, rate, q, healthyOnly, looksHealthy) {
        const seen = {}, out = {spike: [], ok: []}, k = nkey(q);
        (items || []).forEach(p => {
            if (!p || !p.name) return; const id = pkey(p); if (seen[id]) return; seen[id] = 1;
            let v = p.verdict;
            try {
                const r = rate && rate(p);
                if (r && r.verdict && r.verdict !== 'unknown') v = r.verdict;
                const S = r && r.engine && !p.manual ? spikeCore() : null;
                if (S && typeof S.tighten === 'function') { const t = S.tighten(p, r); if (t && t !== 'unknown') v = t; }
            } catch (e) {}
            if (v !== 'spike' && v !== 'ok') return;
            if (k && nkey(p.name + ' ' + (p.brand || '')).indexOf(k) < 0) return;
            if (healthyOnly && v === 'spike' && looksHealthy && !looksHealthy(p)) return;
            out[v].push(Object.assign({}, p, {verdict: v}));
        });
        out.spike.sort((a, b) => (b.catches || 1) - (a.catches || 1)); out.ok.sort((a, b) => (b.catches || 1) - (a.catches || 1));
        return out;
    }
    const core = {nkey, pkey, until, active, forProduct, parsePrice, valid, split, RUNS};
    if (!W || typeof document === 'undefined') return {core, deals: {core}, lists: {core}};

    /* ---------------- browser ---------------- */
    const D = document, $ = (s, r) => (r || D).querySelector(s);
    const LI = () => { const l = (D.documentElement.lang || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
    const TX = {
        deals: ['Community deals', 'Angebote aus der Community', 'Ofertas de la comunidad'],
        noDeals: ['No deals posted for this one yet.', 'Für dieses Produkt gibt es noch kein Angebot.', 'Aún no hay ofertas para este producto.'],
        post: ['Post a deal', 'Angebot posten', 'Publicar oferta'],
        store: ['Store', 'Laden', 'Tienda'], price: ['Price (€)', 'Preis (€)', 'Precio (€)'], runs: ['Runs', 'Läuft', 'Dura'],
        product: ['Product', 'Produkt', 'Producto'],
        today: ['Today', 'Heute', 'Hoy'], '3d': ['3 days', '3 Tage', '3 días'], week: ['This week', 'Diese Woche', 'Esta semana'], '2w': ['2 weeks', '2 Wochen', '2 semanas'],
        send: ['Post deal', 'Angebot posten', 'Publicar oferta'],
        posted: ['Deal posted', 'Angebot gepostet', 'Oferta publicada'],
        local: ['Saved on this phone. The shared deals list is not connected yet.', 'Auf diesem Handy gespeichert. Die gemeinsame Angebotsliste ist noch nicht verbunden.', 'Guardado en este móvil. La lista compartida de ofertas aún no está conectada.'],
        left: ['until {0}', 'bis {0}', 'hasta {0}'], endsToday: ['ends today', 'endet heute', 'termina hoy'],
        by: ['by {0}', 'von {0}', 'de {0}'],
        title: ['Spike lists', 'Spike-Listen', 'Listas de picos'],
        sub: ['Every product LOWiSPIKE members caught, sorted by the spike estimate.', 'Jedes Produkt, das LOWiSPIKE-Mitglieder gefangen haben, nach Spike-Schätzung sortiert.', 'Cada producto que atraparon los miembros de LOWiSPIKE, ordenado por la estimación de pico.'],
        tSpike: ['Not insulin-friendly', 'Nicht insulinfreundlich', 'No apto para la insulina'], tOk: ['Insulin-friendly', 'Insulinfreundlich', 'Apto para la insulina'], tDeals: ['Deals', 'Angebote', 'Ofertas'],
        search: ['Search foods', 'Lebensmittel suchen', 'Buscar alimentos'],
        healthy: ['Looks healthy, but spikes', 'Sieht gesund aus, spikt aber', 'Parece sano, pero sube'],
        empty: ['Nothing here yet. Scan a product and catch it.', 'Noch nichts hier. Scanne ein Produkt und fang es.', 'Aún no hay nada. Escanea un producto y atrápalo.'],
        emptyDeals: ['No active deals right now. Post one when you see an offer.', 'Gerade keine Angebote. Poste eins, wenn du ein Angebot siehst.', 'No hay ofertas activas. Publica una cuando veas una.'],
        catches: ['{0}× caught', '{0}× gefangen', '{0}× atrapado'],
        spikeW: ['Not insulin-friendly', 'Nicht insulinfreundlich', 'No apto para la insulina'], okW: ['Insulin-friendly', 'Insulinfreundlich', 'Apto para la insulina'],
        bad: ['Add the store and a price.', 'Gib den Laden und einen Preis an.', 'Añade la tienda y un precio.']
    };
    const tx = (k, a) => { const r = TX[k] || [k]; let s = r[LI()] || r[0]; if (a != null) s = s.replace('{0}', a); return s; };
    const eur = n => (LI() ? String(n.toFixed(2)).replace('.', ',') + ' €' : '€' + n.toFixed(2));
    const STORE_LIST = ['Lidl', 'Aldi', 'Rewe', 'Edeka', 'Penny', 'Netto', 'Kaufland', 'dm', 'Rossmann', 'Real'];
    let L = [];
    try { const j = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(j)) L = j; } catch (e) {}
    function save() { L = active(L).slice(0, 300); try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) {} }
    save();
    const cloud = () => { const x = W.LOWI_CLOUD_X; try { return x && x.state().live && x.state().uid ? x : null; } catch (e) { return null; } };
    let syncTs = 0, cloudOk = null;
    async function sync() {
        const x = cloud(); if (!x || Date.now() - syncTs < 60e3) return false; syncTs = Date.now();
        try {
            const c = await x.client();
            const r = await c.from('product_deals').select('id,product_key,name,barcode,store,price,ends_at,user_name,created_at').gt('ends_at', new Date().toISOString()).order('ends_at').limit(300);
            if (r.error) throw r.error;
            cloudOk = true;
            (r.data || []).forEach(row => {
                const d = {id: 'c' + row.id, key: row.product_key, name: row.name, barcode: row.barcode || '', store: row.store, price: +row.price, until: Date.parse(row.ends_at), by: row.user_name || '', ts: Date.parse(row.created_at) || Date.now(), shared: true};
                const i = L.findIndex(o => o.id === d.id); if (i >= 0) L[i] = d; else L.push(d);
            });
            save(); return true;
        } catch (e) { cloudOk = false; console.info('[LOWiSPIKE] deals: shared list not available, phone only:', e && (e.message || e)); return false; }
    }
    async function post(d) {
        d = Object.assign({id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now()}, d);
        d.price = parsePrice(d.price); if (!valid(d)) return {ok: false};
        L.push(d); save();
        const x = cloud(); let shared = false;
        if (x) {
            try {
                const c = await x.client();
                const r = await c.from('product_deals').insert({product_key: d.key, name: d.name, barcode: d.barcode || '', store: d.store, price: d.price, ends_at: new Date(d.until).toISOString(), user_name: d.by || ''});
                if (r.error) throw r.error; shared = true; d.shared = true; save();
            } catch (e) { cloudOk = false; }
        }
        try { W.dispatchEvent(new CustomEvent('lowi:deal-posted', {detail: d})); } catch (e) {}
        return {ok: true, shared};
    }
    function dealRow(d, withName) {
        const end = new Date(+d.until), today = end.toDateString() === new Date().toDateString();
        const ends = today ? tx('endsToday') : tx('left', end.toLocaleDateString([undefined, 'de-DE', 'es-ES'][LI()], {weekday: 'short', day: 'numeric', month: 'short'}));
        return '<li class="sc-deal"><b class="sc-dprice">' + esc(eur(+d.price)) + '</b><span class="sc-dtx">' + (withName ? '<b>' + esc(d.name) + '</b>' : '') + '<span>' + esc(d.store) + ' · ' + esc(ends) + (d.by ? ' · ' + esc(tx('by', d.by)) : '') + '</span></span></li>';
    }
    const CARD = {};
    function cardHTML(p) {
        sync().then(ok => { if (ok) repaint(p); });
        const list = forProduct(L, p); CARD[pkey(p)] = p;
        return '<section class="sc-sec sc-deals" data-sckey="' + esc(pkey(p)) + '"><h4>' + esc(tx('deals')) + '</h4>' +
            (list.length ? '<ul class="sc-dl">' + list.slice(0, 4).map(d => dealRow(d)).join('') + '</ul>' : '<p class="sc-none">' + esc(tx('noDeals')) + '</p>') +
            '<button type="button" class="sc-ghost" data-sc="post" data-k="' + esc(pkey(p)) + '">' + esc(tx('post')) + '</button></section>';
    }
    function repaint(p) {
        D.querySelectorAll('.sc-deals[data-sckey="' + pkey(p).replace(/"/g, '') + '"]').forEach(el => { const t = D.createElement('div'); t.innerHTML = cardHTML(p); el.replaceWith(t.firstChild); });
    }
    const cur = () => { try { return W.LowiDex && LowiDex.cur && LowiDex.cur(); } catch (e) { return null; } };
    const me = () => { try { return ((W.LowiHost && LowiHost.user && LowiHost.user()) || {}).name || ''; } catch (e) { return ''; } };
    function postForm(p) {
        const R = W.LowiR2; if (!R || !R.sheet) return;
        const ov = R.sheet('<form class="sc-form" novalidate><h3>' + esc(tx('post')) + '</h3>' +
            (p ? '<p class="sc-fprod">' + esc(p.name) + '</p>' : '<label>' + esc(tx('product')) + '<input name="name" maxlength="80" required autocomplete="off"></label>') +
            '<label>' + esc(tx('store')) + '<input name="store" maxlength="40" list="scStores" required autocomplete="off"></label><datalist id="scStores">' + STORE_LIST.map(s => '<option value="' + s + '">').join('') + '</datalist>' +
            '<label>' + esc(tx('price')) + '<input name="price" inputmode="decimal" maxlength="8" required autocomplete="off" placeholder="1,99"></label>' +
            '<fieldset><legend>' + esc(tx('runs')) + '</legend><div class="sc-runs">' + RUNS.map((r, i) => '<label><input type="radio" name="run" value="' + r + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(tx(r)) + '</span></label>').join('') + '</div></fieldset>' +
            '<p class="sc-ferr" hidden>' + esc(tx('bad')) + '</p><button type="submit" class="sc-catchlike">' + esc(tx('send')) + '</button></form>', {cls: 'b3-ov sc-ov'});
        const f = $('form', ov);
        f.addEventListener('submit', async e => {
            e.preventDefault();
            const fd = new FormData(f), name = p ? p.name : String(fd.get('name') || '').trim();
            const d = {key: p ? pkey(p) : pkey({name}), name, barcode: p && p.barcode || '', img: p && p.img || '', store: String(fd.get('store') || '').trim(), price: fd.get('price'), until: until(String(fd.get('run') || 'today')), by: me()};
            if (!valid(Object.assign({}, d, {price: parsePrice(d.price)}))) { $('.sc-ferr', f).hidden = false; return; }
            const r = await post(d); if (!r.ok) { $('.sc-ferr', f).hidden = false; return; }
            R.close(ov); if (R.toast) R.toast(tx('posted') + (r.shared ? '' : ' · ' + tx('local')));
            if (p) repaint(p); const lv = $('.sc-lv'); if (lv) paintLists(lv);
        });
    }
    /* ---- spike lists sheet ---- */
    const ST = {tab: 'spike', q: '', healthy: false};
    function itemRow(p) {
        return '<li><button type="button" class="sc-it" data-sc="show" data-k="' + esc(pkey(p)) + '"><span class="sc-iimg">' + (p.img ? '<img alt="" loading="lazy" referrerpolicy="no-referrer" src="' + esc(p.img) + '">' : '') + '</span>' +
            '<span class="sc-itx"><b>' + esc(p.name) + '</b><span>' + esc([p.brand, (p.catches || 1) > 1 ? tx('catches', p.catches) : ''].filter(Boolean).join(' · ')) + '</span></span><i class="sc-dot v-' + p.verdict + '">' + esc(tx(p.verdict === 'spike' ? 'spikeW' : 'okW')) + '</i></button></li>';
    }
    let SHOWN = {};
    function paintLists(root) {
        const body = $('.sc-lbody', root); if (!body) return;
        root.querySelectorAll('[data-sc="tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === ST.tab)));
        const hb = $('[data-sc="healthy"]', root); if (hb) { hb.hidden = ST.tab !== 'spike'; hb.setAttribute('aria-pressed', String(ST.healthy)); }
        if (ST.tab === 'deals') {
            const k = nkey(ST.q), list = active(L).filter(d => !k || nkey(d.name + ' ' + d.store).indexOf(k) >= 0).sort((a, b) => a.until - b.until);
            body.innerHTML = (list.length ? '<ul class="sc-dl">' + list.map(d => dealRow(d, true)).join('') + '</ul>' : '<p class="sc-none">' + esc(tx('emptyDeals')) + '</p>') + '<button type="button" class="sc-ghost" data-sc="postfree">' + esc(tx('post')) + '</button>';
            return;
        }
        const items = W.LowiDex && LowiDex.items ? LowiDex.items() : [];
        const sp = split(items, W.LowiDex && LowiDex.rate, ST.q, ST.healthy, W.LowiSpikeCore && LowiSpikeCore.looksHealthy);
        const list = sp[ST.tab] || []; SHOWN = {}; list.forEach(p => (SHOWN[pkey(p)] = p));
        body.innerHTML = list.length ? '<ul class="sc-items">' + list.slice(0, 200).map(itemRow).join('') + '</ul>' : '<p class="sc-none">' + esc(tx('empty')) + '</p>';
    }
    function openLists(tab) {
        const R = W.LowiR2; if (!R || !R.sheet) return;
        if (tab) ST.tab = tab;
        const ov = R.sheet('<div class="sc-lv"><h3>' + esc(tx('title')) + '</h3><p class="sc-lsub">' + esc(tx('sub')) + '</p>' +
            '<div class="sc-tabs" role="tablist">' + [['spike', 'tSpike'], ['ok', 'tOk'], ['deals', 'tDeals']].map(t => '<button type="button" role="tab" data-sc="tab" data-t="' + t[0] + '">' + esc(tx(t[1])) + '</button>').join('') + '</div>' +
            '<input class="sc-search" type="search" placeholder="' + esc(tx('search')) + '" value="' + esc(ST.q) + '" autocomplete="off">' +
            '<button type="button" class="sc-chip" data-sc="healthy" aria-pressed="false">' + esc(tx('healthy')) + '</button><div class="sc-lbody"></div></div>', {cls: 'b3-ov sc-ov'});
        const root = $('.sc-lv', ov);
        $('.sc-search', root).addEventListener('input', e => { ST.q = e.target.value; paintLists(root); });
        paintLists(root);
        try { if (W.LowiDex && LowiDex.load) Promise.resolve(LowiDex.load()).then(() => paintLists(root), () => {}); } catch (e) {}
        sync().then(ok => { if (ok) paintLists(root); });
    }
    D.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('[data-sc]'); if (!b) return;
        const a = b.dataset.sc;
        if (a === 'post') { e.preventDefault(); postForm(CARD[b.dataset.k] || cur()); }
        else if (a === 'postfree') { e.preventDefault(); postForm(null); }
        else if (a === 'lists') { e.preventDefault(); openLists(); }
        else if (a === 'tab') { ST.tab = b.dataset.t; paintLists(b.closest('.sc-lv')); }
        else if (a === 'healthy') { ST.healthy = !ST.healthy; paintLists(b.closest('.sc-lv')); }
        else if (a === 'show') { const p = SHOWN[b.dataset.k]; if (p && W.LowiDex && LowiDex.reveal) LowiDex.reveal(p); }
    });
    W.addEventListener('lowi:product-caught', () => { const lv = $('.sc-lv'); if (lv) paintLists(lv); });
    const deals = {core, cardHTML, post, sync, list: () => active(L), forProduct: p => forProduct(L, p), openPost: postForm, shared: () => cloudOk};
    const lists = {core, open: openLists};
    return {core, deals, lists};
});
