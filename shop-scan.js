/* LOWiSPIKE · in-store scan (Oct 16, 2026).
   E-man: "When I'm grocery shopping and I see a product in front of me, I scan it and I just quickly want to see if it's estimated to
   spike my insulin or not. Then I put it into my cart in real life and also digitally. Other detailed information is optional below
   that. Some people want to read it, some people don't."
   - Shopping mode of the Scan camera: a "Shopping" switch in the scanner's top bar, and a "Scan a product" button in Shop mode
     (Today's shopping list) and in the cart. The camera and barcode reading are index.html's scanner (LowiDex), not a copy.
   - A hit shows ONE big verdict first (spike / mild / no spike / not sure, labelled as an estimate), the product name and photo,
     then one big Add to cart. Add puts it on the shopping list as in the cart (LOWI_SHELF.addScanned) and scans the next product
     at once, with Undo. Sugar, carbs, fibre, protein, why and ingredients sit folded underneath.
   - Unknown barcode, no internet or no camera: type the product's name for a quick estimate, and add it anyway.
   Rules and words (en/de/es) are in shop-scan-core.js. Other Cook/cart screens can call LowiShopScan.open(). */
(() => {
    'use strict';
    const W = window, D = document;
    const C = W.LowiShopScanCore;
    if (!C) return;
    const TRIP = 'lowi.shopscan.on';
    const li = () => { try { return C.langIndex(W.LowiLang && LowiLang.get ? LowiLang.get() : D.documentElement.lang); } catch (e) { return 0; } };
    const T = (k, ...a) => C.tx(k, li(), ...a);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const X = () => W.LowiDex;
    const shelf = () => W.LOWI_SHELF;
    const cam = () => D.getElementById('b3Cam');
    const num = v => { const n = Math.round(Number(v) * 10) / 10; return (li() ? String(n).replace('.', ',') : String(n)) + ' g'; };

    const SVG = (d, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + d + '</svg>';
    const IC = {
        kit: SVG('<rect x="6" y="2.5" width="12" height="19" rx="2.2"/><path d="M6 9.5h12M9 5.5v2M9 12.5v3"/>'),
        cart: SVG('<path d="M3 4h2.2l2.1 10.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.2L20.5 8H6.1"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>'),
        bc: SVG('<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M8 8v8M11 8v8M14 8v8M17 8v8"/>'),
        x: SVG('<path d="M6 6l12 12M18 6L6 18"/>'),
        ok: SVG('<path d="M5 12.5l4.2 4.2L19 7"/>'),
        search: SVG('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
        spike: SVG('<path d="M3 18l5-6 4 3 8-10"/><path d="M14.5 5H20v5.5"/>'),
        mild: SVG('<path d="M3 15c2.5 0 3.5-4 6-4s3.5 4 6 4 3.5-3 6-3"/>'),
        none: SVG('<circle cx="12" cy="12" r="8.5"/><path d="M8 12.3l2.7 2.7 5.5-5.6"/>'),
        unknown: SVG('<path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.4-1.5 1.2-1.5 2.2v.6"/><path d="M12 18.2v.1"/>')
    };

    /* ---------- shopping mode on the scanner ---------- */
    function stamp(on) { try { if (on) localStorage.setItem(TRIP, String(Date.now())); else localStorage.removeItem(TRIP); } catch (e) {} }
    function want(mode) {
        let on = false;
        if (mode === 'shop') on = true;
        else { try { on = C.tripOn(localStorage.getItem(TRIP), Date.now()); } catch (e) {} }
        if (on) stamp(true);
        const el = cam();
        if (el) attach(el, on);
        return on;
    }
    function pill() {
        return '<button type="button" class="ss-pill" data-ss="mode" aria-pressed="false" aria-label="' + esc(T('modeL')) + '">' + IC.cart + '<span>' + esc(T('modeOn')) + '</span></button>';
    }
    function title() { return T('title'); }
    /* the extra row under the barcode field in shopping mode: search by name, and how much is in the cart */
    function attach(el, on) {
        if (!el) return;
        const p = el.querySelector('.ss-pill'); if (p) p.setAttribute('aria-pressed', on ? 'true' : 'false');
        const bot = el.querySelector('.b3-cbot');
        if (bot && !bot.querySelector('.ss-row')) {
            const r = D.createElement('div'); r.className = 'ss-row';
            r.innerHTML = '<button type="button" class="ss-chip" data-ss="name">' + IC.search + '<span>' + esc(T('byName')) + '</span></button>' +
                '<button type="button" class="ss-chip ss-cartchip" data-ss="cart">' + IC.cart + '<span>' + esc(T('cart')) + '</span><b class="ss-count">0</b></button>';
            const form = bot.querySelector('.b3-ctype');
            if (form && form.nextSibling) bot.insertBefore(r, form.nextSibling); else bot.appendChild(r);
        }
        count(el);
        if (!on) closeCard(el);
    }
    function count(el) {
        el = el || cam(); if (!el) return;
        let n = 0; try { n = shelf() && shelf().cartCount ? shelf().cartCount() : 0; } catch (e) {}
        el.querySelectorAll('.ss-count').forEach(b => { b.textContent = String(n); });
        el.querySelectorAll('.ss-cartchip').forEach(b => b.classList.toggle('has', n > 0));
    }
    function toggle() {
        const el = cam(); if (!el || !X() || !X().shopMode) return;
        const on = X().shopMode(!el.classList.contains('b3-shop'));
        stamp(on); attach(el, on);
        if (!on && X().shopResume) X().shopResume();
    }
    /* the denied / no camera / camera error cards get a clear way round: search by name */
    function decorate(m, s) {
        if (!m || ['denied', 'nocam', 'camerr'].indexOf(s) < 0) return;
        const b = m.querySelector('.b3-cbtns'); if (!b || b.querySelector('[data-ss="name"]')) return;
        b.insertAdjacentHTML('beforeend', '<button class="b3-cbtn ghost" data-ss="name">' + esc(T('byName')) + '</button>');
    }

    /* ---------- the result card over the camera ---------- */
    let cur = null, last = null, undoT = 0;
    function card(el) {
        let c = el.querySelector('.ss-card');
        if (!c) { c = D.createElement('div'); c.className = 'ss-card'; c.setAttribute('role', 'region'); c.setAttribute('aria-live', 'polite'); c.setAttribute('aria-label', T('title')); el.appendChild(c); }
        el.classList.add('ss-open');
        return c;
    }
    function closeCard(el) {
        el = el || cam(); if (!el) return;
        const c = el.querySelector('.ss-card'); if (c) c.remove();
        el.classList.remove('ss-open'); cur = null;
    }
    function loading(el, code) {
        card(el).innerHTML = '<div class="ss-sheet ss-load"><span class="b3-spin"></span><div><b>' + esc(T('lookup')) + '</b><small>' + esc(T('bc', code)) + '</small></div></div>';
    }
    function timeout(pr, ms) { return Promise.race([pr, new Promise(ok => setTimeout(() => ok(null), ms))]); }

    async function found(code, el) {
        el = el || cam(); if (!el) return;
        loading(el, code);
        let p = null;
        try { p = await timeout(X().lookup(code), 11000); } catch (e) { p = null; }
        if (cam() !== el) return;
        /* Oct 20 food audit: no answer at all (p null: offline, weak signal, the 11 s time out) used to say "We don't know this
           product yet". Only a real "not found" says that now; no answer says so and offers Try again. */
        if (!p) { unknown(el, code, navigator.onLine === false ? 'offline' : 'noreach'); return; }
        if (p.notFound) { unknown(el, code, false); return; }
        result(el, p, { code });
    }
    function verdictHTML(lvl, est) {
        return '<div class="ss-verdict" role="status"><span class="ss-vic">' + IC[lvl] + '</span><div class="ss-vt"><span class="ss-est">' + esc(est || T('est')) + '</span>' +
            '<b class="ss-vw">' + esc(T('v_' + lvl)) + '</b><small>' + esc(T('s_' + lvl)) + '</small></div></div>';
    }
    function detailsHTML(p, r) {
        const f = p.facts || {}, rows = C.factRows(f), why = (p.why && p.why.length ? p.why : (r && r.why) || []);
        const wt = why.map(w => { try { return X().whyText(w); } catch (e) { return ''; } }).filter(Boolean).slice(0, 5);
        const ing = String(p.ingredients || '').trim().slice(0, 700);
        let h = '<details class="ss-more"><summary><span>' + esc(T('details')) + '</span><i aria-hidden="true"></i></summary><div class="ss-body">';
        if (rows.length) h += '<div class="ss-h">' + esc(T(f.drink || p.cat === 'drink' ? 'per100ml' : 'per100')) + '</div><div class="ss-facts">' + rows.map(x => '<div><small>' + esc(T(x[0])) + '</small><b>' + esc(num(x[1])) + '</b></div>').join('') + '</div>';
        if (wt.length) h += '<div class="ss-h">' + esc(T('why')) + '</div><ul class="ss-why">' + wt.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
        if (ing) h += '<div class="ss-h">' + esc(T('ing')) + '</div><p class="ss-ing">' + esc(ing) + '</p>';
        if (!rows.length && !wt.length && !ing) h += '<p class="ss-ing">' + esc(T('noData')) + '</p>';
        h += '<p class="ss-legal">' + esc(T('legal')) + '</p></div></details>';
        return h;
    }
    /* o: {code, est (label override), lvl (verdict override)} */
    function result(el, p, o) {
        o = o || {};
        let r = null; try { r = !p.verdict || p.verdict === 'unknown' ? X().rate(p) : null; } catch (e) {}
        const lvl = o.lvl || C.verdictOf(p, X() && X().rate);
        const code = String(p.barcode || o.code || '');
        const name = String(p.name || '').trim() || T('unnamed', code);
        const img = /^https:\/\//.test(String(p.img || '')) ? String(p.img) : '';
        cur = { name, barcode: code, img, level: lvl, brand: String(p.brand || '').slice(0, 40), cat: String(p.cat || '') };
        /* Oct 26 Kitchen game (kitchen-game.js, Cook > Kitchen): a scanned product can also go straight into your kitchen. Opened from
           the Kitchen's Scan button, that is the big button and Add to cart is the small one. */
        const KG = W.LowiKitchenGame, kIn = !!(KG && KG.intent && KG.intent());
        const kBtn = !KG ? '' : '<button type="button" class="' + (kIn ? 'ss-add ss-kit-main' : 'ss-kit') + '" data-ss="kit">' + IC.kit + '<span>' + esc(kitT(0)) + '</span></button>';
        const cBtn = '<button type="button" class="' + (kIn ? 'ss-kit' : 'ss-add') + '" data-ss="add">' + IC.cart + '<span>' + esc(T('add')) + '</span></button>';
        const c = card(el);
        c.innerHTML = '<div class="ss-sheet ss-v-' + lvl + '">' +
            '<div class="ss-head"><span class="ss-img">' + (img ? '<img alt="" src="' + esc(img) + '">' : IC.bc) + '</span><div class="ss-name"><b>' + esc(name) + '</b>' + (p.brand ? '<small>' + esc(p.brand) + '</small>' : '') + '</div>' +
            '<button type="button" class="ss-x" data-ss="next" aria-label="' + esc(T('next')) + '">' + IC.x + '</button></div>' +
            verdictHTML(lvl, o.est) +
            (kIn ? kBtn + cBtn : cBtn + kBtn) +
            detailsHTML(p, r) + '</div>';
        /* Oct 17 grocery hunt (grocery-hunt.js): a barcode really scanned (camera, typed digits or a barcode photo) is a catch; a product picked from a name search is not */
        if (o.code) { try { W.dispatchEvent(new CustomEvent('lowi:shop-scan', { detail: { barcode: code, name, brand: String(p.brand || ''), level: lvl, card: c } })); } catch (e) {} }
    }
    function unknown(el, code, offline) {
        cur = null;
        const c = card(el);
        c.innerHTML = '<div class="ss-sheet ss-v-unknown ss-unk">' +
            '<div class="ss-head"><span class="ss-img">' + IC.unknown + '</span><div class="ss-name"><b>' + esc(T(offline === 'noreach' ? 'noReachT' : offline ? 'offlineT' : (code ? 'unknownT' : 'byName'))) + '</b><small>' + esc(code ? T('bc', code) + ' · ' + T('unknownS') : T('unknownS')) + '</small></div>' +
            '<button type="button" class="ss-x" data-ss="next" aria-label="' + esc(T('next')) + '">' + IC.x + '</button></div>' +
            '<form class="ss-find" autocomplete="off"><input class="input" name="q" maxlength="80" enterkeyhint="search" placeholder="' + esc(T('namePh')) + '" aria-label="' + esc(T('namePh')) + '"><button class="ss-go" aria-label="' + esc(T('search')) + '">' + IC.search + '</button></form>' +
            (offline && code ? '<button type="button" class="b3-cbtn ghost ss-retry" data-ss="retry" data-code="' + esc(code) + '">' + esc(T('retry')) + '</button>' : '') +
            '<div class="ss-results" data-code="' + esc(code || '') + '"></div></div>';
        const f = c.querySelector('.ss-find');
        f.addEventListener('submit', e => { e.preventDefault(); search(el, f.q.value, code); });
        setTimeout(() => { try { if (!code) f.q.focus(); } catch (e) {} }, 60);
    }
    let found_ = [];
    async function search(el, q, code) {
        q = String(q || '').trim(); if (q.length < 2) return;
        const box = el.querySelector('.ss-results'); if (!box) return;
        box.innerHTML = '<div class="ss-load slim"><span class="b3-spin"></span></div>';
        let list = [];
        try { list = (await timeout(X().search(q), 8000)) || []; } catch (e) { list = []; }
        if (cam() !== el || !el.querySelector('.ss-results')) return;
        found_ = list.slice(0, 5);
        if (found_.length) {
            box.innerHTML = found_.map((p, i) => { const lv = C.verdictOf(p, X().rate);
                return '<button type="button" class="ss-res" data-ss="pick" data-i="' + i + '"><i class="ss-dot ss-d-' + lv + '"></i><span><b>' + esc(p.name || '') + '</b>' + (p.brand ? '<small>' + esc(p.brand) + '</small>' : '') + '</span><em>' + esc(T('v_' + lv)) + '</em></button>'; }).join('') +
                '<button type="button" class="ss-res ss-plain" data-ss="plain" data-q="' + esc(q) + '"><i class="ss-dot"></i><span><b>' + esc(q) + '</b><small>' + esc(T('fromName')) + '</small></span></button>';
            return;
        }
        plain(el, q, code);
    }
    /* nothing in the dex: a word-based estimate from the name (rateName), still one tap to the cart */
    function plain(el, q, code) {
        let r = null; try { r = X().rateName(q); } catch (e) {}
        const lvl = r ? C.level(r.verdict) : 'unknown';
        result(el, { name: q, barcode: code || '', why: r ? r.why : [], facts: {} }, { lvl, est: T('fromName'), code });
    }

    /* ---------- add to cart, then straight on to the next product ---------- */
    function add(el) {
        if (!cur || !shelf() || !shelf().addScanned) return;
        let r = null; try { r = shelf().addScanned(cur); } catch (e) { r = null; }
        if (!r) return;
        last = r;
        try { navigator.vibrate && navigator.vibrate(18); } catch (e) {}
        const text = r.action === 'again' ? T('again', r.q) : r.action === 'ticked' ? T('ticked') : T('added');
        closeCard(el);
        toast(el, text, r.n);
        count(el);
        if (X() && X().shopResume) X().shopResume();
    }
    function kitT(k) {
        const l = String((W.LowiLang && LowiLang.get && LowiLang.get()) || D.documentElement.lang || 'en'), i = /^de/i.test(l) ? 1 : /^es/i.test(l) ? 2 : 0;
        return [['In my kitchen', 'In meine Küche', 'A mi cocina'], ['In your kitchen', 'In deiner Küche', 'En tu cocina'], ['Already in your kitchen', 'Schon in deiner Küche', 'Ya está en tu cocina']][k][i];
    }
    function addKit(el) {
        const KG = W.LowiKitchenGame; if (!cur || !KG || !KG.addScanned) return;
        let r = null; try { r = KG.addScanned(cur); } catch (e) { r = null; }
        if (!r) return;
        last = r.had ? null : { undo: r.undo };
        try { navigator.vibrate && navigator.vibrate(18); } catch (e) {}
        closeCard(el);
        toast(el, kitT(r.had ? 2 : 1), r.n + (r.shelf ? ' · ' + r.shelf : ''));
        if (r.had) { const b = el.querySelector('.ss-toast [data-ss="undo"]'); if (b) b.hidden = true; }
        if (X() && X().shopResume) X().shopResume();
    }
    function toast(el, text, name) {
        let t = el.querySelector('.ss-toast');
        if (!t) { t = D.createElement('div'); t.className = 'ss-toast'; t.setAttribute('role', 'status'); el.appendChild(t); }
        t.innerHTML = '<span class="ss-tic">' + IC.ok + '</span><span class="ss-tt"><b>' + esc(text) + '</b><small>' + esc(name || '') + '</small></span><button type="button" data-ss="undo">' + esc(T('undo')) + '</button>';
        /* just under the top bar (its height changes with the keyboard and the safe area) */
        try { const top = el.querySelector('.b3-ctop'), r = top && top.getBoundingClientRect(), o = el.getBoundingClientRect(); if (r && r.height) t.style.top = Math.round(r.bottom - o.top + 8) + 'px'; } catch (e) {}
        t.classList.add('on');
        clearTimeout(undoT); undoT = setTimeout(() => { t.classList.remove('on'); last = null; }, 4500);
    }
    function undo(el) {
        if (last) { try { last.undo(); } catch (e) {} last = null; }
        const t = el.querySelector('.ss-toast'); if (t) t.classList.remove('on');
        count(el);
    }
    function next(el) { closeCard(el); if (X() && X().shopResume) X().shopResume(); }

    /* ---------- open it from anywhere (Shop mode, the cart, other screens) ---------- */
    function open() {
        if (!X() || !X().scan) return false;
        X().scan('shop');
        return true;
    }
    function goCart() {
        try { X().stop(); } catch (e) {}
        const shop = D.getElementById('tdShop');
        if (shop && shop.classList.contains('open')) { try { W.tdShopRender && W.tdShopRender(); } catch (e) {} return; }
        try { if (typeof W.tdShopOpen === 'function') W.tdShopOpen(); } catch (e) {}
    }

    D.addEventListener('click', e => {
        const b = e.target && e.target.closest && e.target.closest('[data-ss]');
        if (!b) return;
        const k = b.dataset.ss;
        if (k === 'open') { e.preventDefault(); open(); return; }
        const el = b.closest('.b3-cam'); if (!el) return;
        e.preventDefault();
        if (k === 'mode') toggle();
        else if (k === 'add') add(el);
        else if (k === 'kit') addKit(el);
        else if (k === 'next') next(el);
        else if (k === 'undo') undo(el);
        else if (k === 'cart') goCart();
        else if (k === 'name') { if (X() && X().shopMode && !el.classList.contains('b3-shop')) { X().shopMode(true); stamp(true); attach(el, true); } unknown(el, '', false); }
        else if (k === 'retry') { if (b.dataset.code) found(b.dataset.code, el); }
        else if (k === 'pick') { const p = found_[+b.dataset.i]; if (p) result(el, p, {}); }
        else if (k === 'plain') plain(el, b.dataset.q, (el.querySelector('.ss-results') || {}).dataset ? el.querySelector('.ss-results').dataset.code : '');
    });

    /* the "Scan a product" button in Shop mode (#tdShop) and in the cart (#lsCart); their screens re-render, so it is put back */
    function entryHTML(cls) {
        return '<button type="button" class="ss-entry ' + (cls || '') + '" data-ss="open">' + IC.bc + '<span><b>' + esc(T('entry')) + '</b><small>' + esc(T('entryS')) + '</small></span></button>';
    }
    function inject() {
        const shop = D.getElementById('tdShop');
        if (shop) { const body = shop.querySelector('.td-shopbody'); if (body && !body.querySelector('.ss-entry')) body.insertAdjacentHTML('afterbegin', entryHTML('in-shop')); }
        const cart = D.getElementById('lsCart');
        if (cart) { const body = cart.querySelector('.lc-body'); if (body && !body.querySelector('.ss-entry')) body.insertAdjacentHTML('afterbegin', entryHTML('in-cart')); }
    }
    /* only the two small screens are watched (not the whole app): #app for them appearing, then each one's own re-renders */
    const seen = new WeakSet();
    function watch() {
        if (typeof MutationObserver === 'undefined') { inject(); return; }
        let q = 0;
        const later = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; hook(); inject(); }); };
        const hook = () => ['tdShop', 'lsCart'].forEach(id => { const n = D.getElementById(id); if (n && !seen.has(n)) { seen.add(n); new MutationObserver(later).observe(n, { childList: true, subtree: true }); } });
        const app = D.getElementById('app') || D.body;
        new MutationObserver(later).observe(app, { childList: true });
        if (app !== D.body) new MutationObserver(later).observe(D.body, { childList: true });
        hook(); inject();
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', watch); else watch();

    W.LowiShopScan = { want, pill, title, decorate, found, open, entryHTML, _cur: () => cur, _add: () => { const el = cam(); if (el) add(el); } };
})();
