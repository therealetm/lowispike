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
        const c = el.querySelector('.ss-card');
        /* BH-060: the card's own close tap is spent, so a fast 2nd tap does not hit the camera under it */
        try { const F = W.LowiFreshScrim; if (c && F && F.closed) F.closed(c); } catch (e) { }
        if (c) c.remove();
        el.classList.remove('ss-open'); cur = null;
    }
    function loading(el, code) {
        card(el).innerHTML = '<div class="ss-sheet ss-load"><span class="b3-spin"></span><div><b>' + esc(T('lookup')) + '</b><small>' + esc(T('bc', code)) + '</small></div></div>';
    }
    function timeout(pr, ms) { return Promise.race([pr, new Promise(ok => setTimeout(() => ok(null), ms))]); }

    /* o.ctx (Oct 26 one scanner): 'shop' | 'meal' | 'scan', where the camera was opened (LowiDex.ctx); kept on the camera for the
       retry, name search and swap cards that follow */
    async function found(code, el, o) {
        el = el || cam(); if (!el) return;
        if (o && o.ctx) el.dataset.ssctx = o.ctx;
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
    const ctxOf = el => (el && el.dataset && el.dataset.ssctx) || (el && el.classList.contains('b3-shop') ? 'shop' : 'scan');
    /* Oct 26 scan-why (Emmanuel: "Let's add a little graph in there ... when it says moderate, what does that mean? Can I eat this
       every day? Every week? ... just a little tap button to understand the reasoning"): the one verdict is the word, a small line
       saying what it is about, a tiny estimated blood sugar curve labelled "Estimate, not a measurement", How often in numbers,
       and a Why? button that opens a short plain explanation (collapsed by default). The old "Estimate" tag plus "Moderate
       estimated blood sugar impact" line said estimate twice; the small line under the word replaces both. */
    let whyN = 0;
    const servOf = p => { try { return W.LowiNutriStats && W.LowiNutriStats.servingFor ? W.LowiNutriStats.servingFor(p) : null; } catch (e) { return null; } };
    function curveHTML(lvl) {
        const cv = C.curve(lvl); if (!cv) return '<span class="ss-vic">' + IC.unknown + '</span>';
        return '<figure class="ss-graph"><svg class="ss-curve" viewBox="0 0 80 36" aria-hidden="true" focusable="false"><path class="ss-cbase" d="M2 32.5H78"/><path class="ss-cline" pathLength="1" d="' + cv.d + '"/></svg>' +
            '<figcaption>' + esc(T('graphL')) + '</figcaption></figure>';
    }
    function verdictHTML(lvl, est, p, grams, open) {
        let e = null; try { e = C.explain(p || {}, grams, lvl, li()); } catch (x) { e = null; }
        const g = grams > 0 ? Math.round(grams) : e && e.g, unit = (e && e.unit) || 'g';
        const sub = est || (lvl === 'unknown' ? T('s_unknown') : g ? T('bsG', g + ' ' + unit) : T('bs'));
        const id = 'ssWhy' + (++whyN), lines = e ? e.lines : [T('s_' + lvl)];
        return '<div class="ss-verdict"><div class="ss-vrow"><div class="ss-vt" role="status"><b class="ss-vw">' + esc(T('v_' + lvl)) + '</b><small>' + esc(sub) + '</small></div>' + curveHTML(lvl) + '</div>' +
            '<div class="ss-orow"><p class="ss-often"><span>' + esc(T('oftenH')) + '</span><b>' + esc(e ? e.often : T('o_' + lvl)) + '</b></p>' +
            '<button type="button" class="ss-whyb" data-ss="why" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="' + id + '">' + esc(T('whyB')) + '</button></div>' +
            '<div class="ss-whyp" id="' + id + '"' + (open ? '' : ' hidden') + '>' + lines.map(l => '<p>' + esc(l) + '</p>').join('') + '<p class="ss-whyf">' + esc(T('whyFoot')) + '</p></div></div>';
    }
    /* Details: one plain line on where the amount came from, instead of the calculator's own "Usual portion" label */
    function psrcHTML(p, sv, grams, from) {
        let e = null; try { e = C.explain(p || {}, grams, 'none', li()); } catch (x) { e = null; }
        if (!e || !e.g) return '';
        from = from || (sv && sv.from);
        const k = from === 'mine' ? 'mine' : from === 'last' ? 'last' : from === 'maker' ? 'maker' : e.src || 'group';
        return '<p class="ss-psrc">' + esc(T('psrcH')) + ' <b>' + esc(e.g + ' ' + e.unit) + '</b>: ' + esc(T('psrc_' + k)) + '. <span>' + esc(T('psrcHint')) + '</span></p>';
    }
    function detailsHTML(p, r) {
        const f = p.facts || {}, rows = C.factRows(f), why = (p.why && p.why.length ? p.why : (r && r.why) || []);
        /* Oct 26 one scanner: the old result's portion calculator (nutri-stats.js), once, inside Details; picking an amount re-rates the one verdict above */
        let por = ''; try { por = W.LowiNutriStats && W.LowiNutriStats.portionHTML && rows.length ? W.LowiNutriStats.portionHTML(p) : ''; } catch (e) { por = ''; }
        const wt = why.map(w => { try { return X().whyText(w); } catch (e) { return ''; } }).filter(Boolean).slice(0, 5);
        const ing = String(p.ingredients || '').trim().slice(0, 700);
        let h = '<details class="ss-more"><summary><span>' + esc(T('details')) + '</span><i aria-hidden="true"></i></summary><div class="ss-body">';
        const sv = rows.length ? servOf(p) : null, src = rows.length ? psrcHTML(p, sv, sv && sv.grams) : '';
        if (por || src) h += '<div class="ss-h">' + esc(T('portion')) + '</div>' + src + (por ? '<div class="ss-por">' + por + '</div>' : '');
        if (rows.length) h += '<div class="ss-h">' + esc(T(f.drink || p.cat === 'drink' ? 'per100ml' : 'per100')) + '</div><div class="ss-facts">' + rows.map(x => '<div><small>' + esc(T(x[0])) + '</small><b>' + esc(num(x[1])) + '</b></div>').join('') + '</div>';
        /* Oct 26 scan-why: the Why list moved into the verdict's Why? tap; a name-only estimate (no numbers) keeps its reasons here */
        if (wt.length && !rows.length) h += '<div class="ss-h">' + esc(T('why')) + '</div><ul class="ss-why">' + wt.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
        if (ing) h += '<div class="ss-h">' + esc(T('ing')) + '</div><p class="ss-ing">' + esc(ing) + '</p>';
        if (!rows.length && !wt.length && !ing) h += '<p class="ss-ing">' + esc(T('noData')) + '</p>';
        if (p.barcode) h += '<p class="ss-bcl">' + esc(T('bc', String(p.barcode))) + '</p>';
        h += '<p class="ss-legal">' + esc(T('legal')) + '</p></div></details>';
        return h;
    }
    /* o: {code, est (label override), lvl (verdict override), ctx}
       Oct 26 one scanner (Emmanuel: "the main page scanner gives me still this old overwhelming preview. Sync them ... one thing, one
       ultimate scanner"): this card is the result of every scan now: the Scan camera, Log meal's Scan, Shop and the Kitchen. ONE verdict
       (for your usual amount when you have one), then the buttons for where you opened it, then a better pick only when the verdict needs
       one, the Bubble Dex catch for a Lower one, and the rest (portion, per 100 g, why, ingredients) folded in Details. Nothing repeated. */
    function rated(p, o) {
        let q = p; try { if (X().prep && !o.lvl) q = X().prep(Object.assign({}, p)) || p; } catch (e) { q = p; }
        let v = q; try { if (X().view && !o.lvl) v = X().view(q) || q; } catch (e) { v = q; }
        /* Oct 26 scan-why: an amount you picked before (last time / mine) re-rates with the same tightened rule as the first verdict */
        const sv = servOf(q), ug = sv && (sv.from === 'last' || sv.from === 'mine') && sv.grams > 0 ? sv.grams : 0;
        const at = !o.lvl && v !== q && ug ? C.levelAt(q, ug) : null;
        const lvl = o.lvl || at || (v !== q && v.verdict ? C.level(v.verdict) : C.verdictOf(q, X() && X().rate));
        return { q, v, lvl, g: sv && sv.grams > 0 ? sv.grams : 0 };
    }
    function result(el, p, o) {
        o = o || {};
        const ctx = o.ctx || ctxOf(el); if (o.ctx) el.dataset.ssctx = o.ctx;
        let r = null; try { r = !p.verdict || p.verdict === 'unknown' ? X().rate(p) : null; } catch (e) {}
        const rr = rated(p, o), q = rr.q, lvl = rr.lvl;
        const code = String(q.barcode || o.code || '');
        const name = String(q.name || '').trim() || T('unnamed', code);
        const img = /^https:\/\//.test(String(q.img || '')) ? String(q.img) : '';
        const okv = lvl === 'none' ? 'ok' : lvl === 'mild' ? 'better' : lvl === 'spike' ? 'spike' : q.verdict;
        const pv = Object.assign({}, q, { verdict: okv });
        cur = { name, barcode: code, img, level: lvl, q, brand: String(q.brand || '').slice(0, 40), cat: String(q.cat || ''), p: pv, est: o.est || '' };
        /* Oct 26 Kitchen game (kitchen-game.js, Cook > Kitchen): a scanned product can also go straight into your kitchen. Opened from
           the Kitchen's Scan button, that is the big button and Add to cart is the small one. */
        const KG = W.LowiKitchenGame, kIn = !!(KG && KG.intent && KG.intent());
        const kitB = big => !KG ? '' : '<button type="button" class="' + (big ? 'ss-add ss-kit-main' : 'ss-kit') + '" data-ss="kit">' + IC.kit + '<span>' + esc(kitT(0)) + '</span></button>';
        const cartB = big => '<button type="button" class="' + (big ? 'ss-add' : 'ss-kit') + '" data-ss="add">' + IC.cart + '<span>' + esc(T('add')) + '</span></button>';
        /* Oct 21 rule kept: only Log meal's own Scan logs a meal ("Scan identifies"); there I ate this is the big button */
        const ateB = '<button type="button" class="ss-add ss-ate" data-ss="ate">' + IC.ok + '<span>' + esc(T('ate')) + '</span></button>';
        const acts = ctx === 'meal' ? ateB + kitB(false) : kIn ? kitB(true) + cartB(false) : cartB(true) + kitB(false);
        const c = card(el);
        c.innerHTML = '<div class="ss-sheet ss-v-' + lvl + '" data-ctx="' + esc(ctx) + '">' +
            '<div class="ss-head"><span class="ss-img">' + (img ? '<img alt="" src="' + esc(img) + '">' : IC.bc) + '</span><div class="ss-name"><b>' + esc(name) + '</b>' + (q.brand ? '<small>' + esc(q.brand) + '</small>' : '') + '</div>' +
            '<button type="button" class="ss-x" data-ss="next" aria-label="' + esc(T('next')) + '">' + IC.x + '</button></div>' +
            verdictHTML(lvl, o.est, q, rr.g) + acts + extrasHTML(pv, lvl) + detailsHTML(q, r) + '</div>';
        /* the companion reacts to the verdict, as it did to the old result (companion.js); shopping stays quiet */
        if (ctx !== 'shop' && lvl !== 'unknown') { try { W.dispatchEvent(new CustomEvent('lowi:scan-verdict', { detail: { verdict: okv } })); } catch (e) {} }
        /* Oct 17 grocery hunt (grocery-hunt.js): a barcode really scanned (camera, typed digits or a barcode photo) in the shopping camera is a catch; a product picked from a name search is not */
        if (o.code && ctx === 'shop') { try { W.dispatchEvent(new CustomEvent('lowi:shop-scan', { detail: { barcode: code, name, brand: String(q.brand || ''), level: lvl, card: c } })); } catch (e) {} }
    }
    /* a better pick (only for Higher / Moderate: index.html nameSwap, never invented) and the Bubble Dex catch (only for Lower) */
    let swapCur = null;
    function extrasHTML(p, lvl) {
        let h = ''; swapCur = null;
        if (lvl === 'spike' || lvl === 'mild') {
            let s = null; try { s = X().swap ? X().swap(p) : null; } catch (e) { s = null; }
            if (s && !s.ok && s.n) {
                swapCur = s;
                const go = s.rb ? '<button type="button" class="ss-sgo" data-ss="swap">' + esc(T('swapOpen')) + ' ›</button>' : s.prod ? '<button type="button" class="ss-sgo" data-ss="swap">' + esc(T('swapShow')) + ' ›</button>' : '';
                h += '<div class="ss-swap"><span class="ss-se" aria-hidden="true">' + esc(s.e || '🌿') + '</span><div class="ss-st"><small>' + esc(T('swapH')) + (s.rb ? ' · ' + esc(T('swapR')) : '') + '</small><b>' + esc(s.rb ? s.rb.n : s.n) + '</b></div>' + go + '</div>';
            }
        }
        if (lvl === 'none') {
            let b = null; try { b = X().bubbleInfo ? X().bubbleInfo(p) : null; } catch (e) { b = null; }
            if (b) h += b.has ? '<div class="ss-bub has"><span class="ss-bdot" aria-hidden="true"></span><span>' + esc(b.hasLabel) + '</span></div>'
                : '<button type="button" class="ss-bub" data-ss="bubble"><span class="ss-bdot" aria-hidden="true"></span><span>' + esc(b.label) + '</span></button>';
        }
        return h;
    }
    function show(el, p, o) { el = el || cam(); if (!el || !p) return; result(el, p, o || {}); }
    async function bubble(el, btn) {
        if (!cur || !cur.p || btn.disabled || !X().bubble) return; btn.disabled = true;
        let res = null; try { res = await X().bubble(cur.p); } catch (e) { res = null; }
        if (!btn.isConnected) return;
        if (!res) { btn.disabled = false; return; }
        btn.outerHTML = '<div class="ss-bub has done" role="status"><span class="ss-bdot" aria-hidden="true"></span><span><b>' + esc(res.title) + '</b> ' + esc(res.sub || '') + (res.xp ? ' · +' + res.xp + ' XP' : '') + '</span></div>';
    }
    function ate(el, btn) {
        if (!cur || !cur.p || btn.disabled || !X().eat) return; btn.disabled = true;
        const p = cur.p; closeCard(el);
        try { X().stop(); } catch (e) {}
        try { X().eat(p); } catch (e) {}
    }
    function swap(el) {
        const s = swapCur; if (!s) return;
        if (s.rb && X().openRecipe) { X().openRecipe(s.rb.id); return; }
        if (s.prod) result(el, s.prod, {});
    }
    /* picking an amount in Details re-rates the one verdict (nutri-stats.js fires lowi:portion) */
    W.addEventListener('lowi:portion', e => {
        const d = (e && e.detail) || {}, el = cam(); if (!el || !cur || !cur.p || !X().atGrams || !(d.grams > 0)) return;
        const sh = el.querySelector('.ss-sheet'), box = sh && sh.querySelector('.ss-por .ns-portion'); if (!box) return;
        if (box.getAttribute('data-ns-key') && d.key && box.getAttribute('data-ns-key') !== d.key) return;
        /* Oct 26 scan-why: the same tightened rule as the first verdict (C.levelAt), so 50 g of almonds stays Moderate */
        let lvl = C.levelAt(cur.q || cur.p, d.grams);
        if (!lvl) { let v = null; try { v = X().atGrams(cur.p, d.grams); } catch (e) { v = null; } if (!v || !v.verdict) return; lvl = C.level(v.verdict); }
        const old = sh.querySelector('.ss-verdict'); if (!old) return;
        const wb = old.querySelector('[data-ss="why"]'), open = !!(wb && wb.getAttribute('aria-expanded') === 'true');
        const t = D.createElement('div'); t.innerHTML = verdictHTML(lvl, '', cur.q || cur.p, d.grams, open); old.replaceWith(t.firstChild);
        const ps = sh.querySelector('.ss-psrc'); if (ps) { const u = D.createElement('div'); u.innerHTML = psrcHTML(cur.q || cur.p, null, d.grams, 'mine'); if (u.firstChild) ps.replaceWith(u.firstChild); }
        sh.className = sh.className.replace(/ss-v-\w+/, 'ss-v-' + lvl); cur.level = lvl;
    });
    function unknown(el, code, offline) {
        cur = null;
        const c = card(el);
        c.innerHTML = '<div class="ss-sheet ss-v-unknown ss-unk">' +
            '<div class="ss-head"><span class="ss-img">' + IC.unknown + '</span><div class="ss-name"><b>' + esc(T(offline === 'noreach' ? 'noReachT' : offline ? 'offlineT' : (code ? 'unknownT' : 'byName'))) + '</b><small>' + esc(code ? T('bc', code) + ' · ' + T('unknownS') : T('unknownS')) + '</small></div>' +
            '<button type="button" class="ss-x" data-ss="next" aria-label="' + esc(T('next')) + '">' + IC.x + '</button></div>' +
            '<form class="ss-find" autocomplete="off"><input class="input" name="q" maxlength="80" enterkeyhint="search" placeholder="' + esc(T('namePh')) + '" aria-label="' + esc(T('namePh')) + '"><button class="ss-go" aria-label="' + esc(T('search')) + '">' + IC.search + '</button></form>' +
            (offline && code ? '<button type="button" class="b3-cbtn ghost ss-retry" data-ss="retry" data-code="' + esc(code) + '">' + esc(T('retry')) + '</button>' : '') +
            (!offline && code ? '<button type="button" class="b3-cbtn ghost ss-pack" data-ss="pack" data-code="' + esc(code) + '">' + esc(T('packPhoto')) + '</button>' : '') +
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
        if (k === 'why') {
            /* Oct 26 scan-why: the short plain explanation under the verdict opens and closes in place */
            const pn = b.getAttribute('aria-controls') && el.querySelector('#' + b.getAttribute('aria-controls')), on = b.getAttribute('aria-expanded') !== 'true';
            b.setAttribute('aria-expanded', on ? 'true' : 'false'); if (pn) pn.hidden = !on;
        }
        else if (k === 'mode') toggle();
        else if (k === 'add') add(el);
        else if (k === 'kit') addKit(el);
        else if (k === 'next') next(el);
        else if (k === 'undo') undo(el);
        else if (k === 'cart') goCart();
        else if (k === 'name') { if (X() && X().shopMode && !el.classList.contains('b3-shop')) { X().shopMode(true); stamp(true); attach(el, true); } unknown(el, '', false); }
        else if (k === 'retry') { if (b.dataset.code) found(b.dataset.code, el); }
        else if (k === 'ate') ate(el, b);
        else if (k === 'bubble') bubble(el, b);
        else if (k === 'swap') swap(el);
        else if (k === 'pack') { const bc = b.dataset.code; try { X().stop(); } catch (e2) {} setTimeout(() => { try { X().reveal({ barcode: bc, notFound: true }); } catch (e2) {} }, 60); }
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

    W.LowiShopScan = { want, pill, title, decorate, found, show, open, entryHTML, _cur: () => cur, _add: () => { const el = cam(); if (el) add(el); } };
})();
