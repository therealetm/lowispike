/* LOWiSPIKE meal details, the DOM side (Oct 25 2026). The spike label on a meal post opens a glass R2 sheet (swipe down, X,
   backdrop or Escape close it) with what the poster's own photo check said (meal-detail-core.js renders it, whitelisted).
   - Chat / Circles: community-chat.js calls LowiMealDetail.open(m.md, {by, name, lvl, photo}) from its own click handler.
   - For You / Tribe: fyChip(p) is the tappable label under a meal post; a tap anywhere on it (or on the meal card's
     blood sugar line) opens the post's meta.detail, or its meta.meal card data. Nothing else of the poster is read.
   - Bot recipe posts (Nibblo, any 'bot:' uid) NEVER open this panel (E-man, Oct 25: "tapping Low spike on a Nibblo post
     should open the full recipe"). The recipe module registers LowiMealDetail.routeBot(fn) at script load; a tap on a bot's
     label or photo then calls fn(info) with info = {source:'chat'|'foryou', id, uid, name, lvl, photo, nb:{day,slot}|null,
     recipe:'<Recipe Book name>'|'', bookId:'rb_...'|''}. Without a route a bot's label is a plain label, its photo the
     normal photo viewer, and the For You post gets no chip. */
(function (root) {
    'use strict';
    const C = root.LowiMealDetailCore; if (!C) return;
    const D = root.document;
    let last = null, botRoute = null;
    /* ---- the hook for bot recipe posts ---- */
    function routeBot(fn) { botRoute = typeof fn === 'function' ? fn : null; try { root.dispatchEvent(new CustomEvent('lowi:meal-bot-route', { detail: { on: !!botRoute } })); } catch (e) {} }
    function hasBotRoute() { return !!botRoute; }
    function nbUid() { const N = root.LowiNibblo; return N && N.UID ? String(N.UID) : ''; }
    /* x: a chat message {uid} or a For You post {uid, nb, meta} */
    function isBot(x) {
        if (!x || typeof x !== 'object') return false;
        const u = String(x.uid || x.user_id || '');
        if (u.indexOf('bot:') === 0 || (nbUid() && u === nbUid()) || x.nb === 1 || x.nb === true) return true;
        try { const N = root.LowiNibblo; if (N && N.isPost && N.isPost(x)) return true; } catch (e) {}
        return !!(x.meta && typeof x.meta === 'object' && x.meta.nb);
    }
    const NB_RX = /^nb-(\d{8})-([mne])$/;
    function botInfo(source, x, extra) {
        x = x || {}; extra = extra || {};
        let nb = null;
        const k = NB_RX.exec(String(x.id || ''));
        if (k) nb = { day: k[1], slot: k[2] };
        else if (x.meta && x.meta.nb && x.meta.nb.d) nb = { day: String(x.meta.nb.d).replace(/-/g, ''), slot: String(x.meta.nb.s || '') };
        let recipe = '', bookId = '';
        try { const N = root.LowiNibblo, pk = nb && N && N.pick ? N.pick(nb.day, nb.slot) : null; if (pk && pk.dish) { recipe = String(pk.dish.r || ''); bookId = N.bookId ? N.bookId(pk.dish.r) : ''; } } catch (e) {}
        return { source, id: String(x.id || ''), uid: String(x.uid || x.user_id || ''), name: extra.name || '', lvl: extra.lvl || '', photo: extra.photo || '', nb, recipe, bookId };
    }
    /* true when the route took it; never falls back to the details panel */
    function openBot(info) { if (!botRoute) return false; try { botRoute(info); return true; } catch (e) { return false; } }
    function open(detail, ctx) {
        ctx = ctx || {};
        const R = root.LowiR2, l = C.lang(ctx.l), html = C.sheetHTML(detail, Object.assign({}, ctx, { l }));
        if (!R || !R.sheet) return null;
        const ov = R.sheet(html, { cls: 'md-ov' });
        if (!ov) return null;
        try {
            const sh = ov.querySelector('.r2-sh') || ov; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true');
            sh.setAttribute('aria-label', C.t('title', l) + (ctx.name || (detail && detail.name) ? ': ' + (ctx.name || detail.name) : ''));
        } catch (e) {}
        last = ov;
        try { root.dispatchEvent(new CustomEvent('lowi:meal-detail', { detail: { has: C.hasDetail(C.clean(detail)) } })); } catch (e) {}
        return ov;
    }
    /* a For You / Tribe post -> {detail, ctx}: meta.detail first (shared from Community), else the meal card data (meta.meal) */
    function ofPost(p) {
        const m = p && p.meta; if (!m || typeof m !== 'object') return null;
        if (!m.spike && !m.meal && !m.detail) return null;
        let d = C.clean(m.detail);
        if (!d && m.meal && typeof m.meal === 'object') {
            const S = root.LowiMealSnap, c = S && S.clean ? S.clean(m.meal) : null;
            if (c) { let bs = null; try { bs = S.bloodSugar(c.total, c.items); } catch (e) {} d = C.clean({ name: c.name, items: c.items, total: c.total, bs: c.bs, net: bs ? bs.net : undefined, drink: !!(bs && bs.level === 'high' && bs.score < 40) }); }
        }
        const lvl = C.lvlOf(m.spike) || (d && (d.lvl || d.bs)) || '';
        if (!lvl && !d) return null;
        const H = root.LowiHost, me = H && H.user ? H.user() : null;
        return { detail: d, ctx: { by: p.me ? (me && me.name) || '' : p.who || '', name: m.dish || (d && d.name) || '', lvl, photo: /^https:\/\//.test(String(p.photo || '')) ? p.photo : '' } };
    }
    function fyChip(p) {
        if (isBot(p) && !botRoute) return ''; /* a bot recipe post: no details chip; the recipe route draws/handles it once registered */
        const o = ofPost(p); if (!o || !p.id) return '';
        const l = C.lang(), cardShown = !!(p.meta.meal && !p.meta.detail); /* the meal card already shows its blood sugar line: just the hint */
        if (cardShown) return '<button type="button" class="md-fy md-fy-hint" data-md-post="' + C.esc(p.id) + '" aria-haspopup="dialog" aria-label="' + C.esc(C.t('open', l, { l: C.t(o.ctx.lvl || 'mid', l) })) + '">' + C.hintHTML(l) + '</button>';
        return '<button type="button" class="md-fy" data-md-post="' + C.esc(p.id) + '" aria-haspopup="dialog" aria-label="' + C.esc(C.t('open', l, { l: C.t(o.ctx.lvl || 'mid', l) })) + '">' + C.chipHTML(o.ctx.lvl, l) + C.hintHTML(l) + '</button>';
    }
    function post(id) { try { const T = root.TRIBE; return T && T.post ? T.post(id) : null; } catch (e) { return null; } }
    function openPost(id) {
        const p = post(id);
        if (isBot(p)) { const o = ofPost(p); return openBot(botInfo('foryou', p, o ? o.ctx : { name: (p.meta && p.meta.dish) || '' })) ? true : null; }
        const o = ofPost(p); return o ? open(o.detail, o.ctx) : null;
    }
    if (D) D.addEventListener('click', (e) => {
        const t = e.target && e.target.closest ? e.target : null; if (!t) return;
        let b = t.closest('[data-md-post]'), id = b && b.getAttribute('data-md-post');
        if (!b) { const bs = t.closest('.ms-bs'), host = bs && bs.closest('.fy-slide[data-id], .tr-post[data-id]'); if (host) { id = host.getAttribute('data-id'); b = bs; } }
        if (!id) return;
        if (isBot(post(id)) && !botRoute) return; /* a bot's blood sugar line stays a plain line until the recipe route exists */
        e.preventDefault(); e.stopPropagation();
        openPost(id);
    }, true);
    root.LowiMealDetail = { open, openPost, ofPost, fyChip, last: () => last, routeBot, hasBotRoute, isBot, botInfo, openBot };
})(typeof window !== 'undefined' ? window : this);
