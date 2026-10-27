/* LOWiSPIKE People directory (Oct 24, 2026). Emmanuel: browse everyone who is part of the app, offline people and people
   he has not added too, with their human names and profile pictures, and open their human profile (the person card with
   picture, birthday and star sign), not just their companion. A discreet People entry in the Community menu opens it
   (community-rooms-ui.js, key 'dir'). Not a ranking and no member-count boast: no numbers, no levels. Since Oct 25 2026 the
   live "here now" presence is the one exception: Online right now at the top, and the header's "N here now" opens it (hereNow()).
   The list is LowiCellRoom.people() (the Add a friend list: real humans only, bots, test, hidden and owner accounts
   removed, one per name) minus anyone you blocked (LowiCommunity.blocked). Tapping a row opens
   LowiCommunity.openProfile, which shows only what the person card already shows to the community.
   The Friends Tree stays friends-only; this file never touches it. Pure rules: people-directory-core.js. */
(function (W, D) {
    'use strict';
    if (!W || !D) return;
    const C = () => W.LowiPeopleDirCore;
    let ov = null, opener = null, q = '', poll = 0, lastKey = '';
    function li() { try { return Math.max(0, ['en', 'de', 'es'].indexOf((W.LowiLang && W.LowiLang.get()) || localStorage.getItem('lowispike.lang') || 'en')); } catch (e) { return 0; } }
    function tr(k, v) { return C().tr(k, li(), v); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
    function live() { try { return !!(W.LOWI_CLOUD && W.LOWI_CLOUD.live && W.LOWI_CLOUD.live()); } catch (e) { return false; } }
    function me() { try { return W.LOWI_CLOUD && W.LOWI_CLOUD.uid ? String(W.LOWI_CLOUD.uid() || '') : ''; } catch (e) { return ''; } }
    function source() { try { return W.LowiCellRoom && W.LowiCellRoom.people ? W.LowiCellRoom.people() || [] : []; } catch (e) { return []; } }
    function isBlocked(uid) { try { return !!(W.LowiCommunity && W.LowiCommunity.blocked && W.LowiCommunity.blocked(uid)); } catch (e) { return false; } }
    function friendIds() { try { return new Set(((W.LowiCellRoom && W.LowiCellRoom.friends && W.LowiCellRoom.friends()) || []).map(f => String(f.uid))); } catch (e) { return new Set(); } }
    function hue(uid) { try { if (W.LowiCommunity && W.LowiCommunity.colorOf) return W.LowiCommunity.colorOf(uid); } catch (e) {} let h = 0; for (const ch of String(uid)) h = (h * 31 + ch.charCodeAt(0)) % 360; return 'hsl(' + h + ',70%,72%)'; }
    function rows() { return C().build(source(), { blocked: isBlocked, me: me() }); }
    /* Oct 25 2026 (Emmanuel: "If I click on People, I should be able to see the person who's online ... very up, maybe under
       'Online right now'"): the live presence of the one Community room (LowiRooms, the same ids the header counts), resolved to
       the rows above by LowiPeopleDirCore.here(). The header's "N here now" reads hereNow() too, so the count and the section
       always match, and bots, test, hidden, removed and blocked accounts never show or count. */
    function cloudProfiles() { try { return (W.LOWI_CLOUD && W.LOWI_CLOUD.people && W.LOWI_CLOUD.people()) || []; } catch (e) { return []; } }
    function presenceIds() { try { const r = W.LowiRooms; return r && r.status && r.status() === 'in' && r.members ? r.members() || [] : []; } catch (e) { return []; } }
    function realProfile(p) {
        try {
            const B = W.LowiBotAccounts, H = W.LowiHiddenAccounts, names = new Set((W.LOWI_BOTS || []).map(b => b && b.n));
            return !!(p && p.uid && !names.has(p.n) && !(B && B.isBot && B.isBot(p)) && !(H && H.isHidden && H.isHidden(p)) && !isBlocked(String(p.uid)));
        } catch (e) { return false; }
    }
    const NOBODY = { me: false, rows: [], count: 0 };
    function hereNow() {
        if (!C() || !C().here) return NOBODY;
        const ids = presenceIds();
        if (!ids.length) return NOBODY;
        try { return C().here(ids, cloudProfiles(), live() ? rows() : [], { me: me(), ok: realProfile }); } catch (e) { return NOBODY; }
    }
    function myRow() {
        const id = me(), p = cloudProfiles().find(x => x && String(x.uid) === id) || {};
        let mine = {};
        try { const H = W.LowiCommunityHost; mine = (H && H.identity && H.identity()) || {}; } catch (e) { mine = {}; }
        return { uid: id, n: C().nameOf(p) || C().nameOf(mine), img: C().safeImg(p.avatar) || C().safeImg(mine.avatar) };
    }
    function picHTML(r) {
        return r.img ? '<img class="pd-pic" src="' + esc(r.img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' :
            '<span class="pd-pic pd-ini" style="--pd-h:' + esc(hue(r.uid)) + '" aria-hidden="true">' + esc(C().initials(r.n || tr('you'))) + '</span>';
    }
    const CHEV = '<svg class="pd-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    function hereRowHTML(r, fr, mine) {
        const n = r.n || tr('you');
        return '<li><button type="button" class="pd-row pd-here"' + (mine ? ' data-me="1"' : '') + ' data-uid="' + esc(r.uid) + '" aria-label="' + esc(tr('open', { n: mine && !r.n ? tr('you') : n }) + ' · ' + tr('onDot')) + '">' +
            '<span class="pd-av">' + picHTML(r) + '<i class="pd-on" aria-hidden="true"></i></span>' +
            '<span class="pd-n">' + esc(n) + '</span>' + (mine && r.n ? '<span class="pd-tag pd-you">' + esc(tr('you')) + '</span>' : '') +
            (!mine && fr.has(r.uid) ? '<span class="pd-tag">' + esc(tr('friend')) + '</span>' : '') + CHEV + '</button></li>';
    }
    function secHTML(k, id) {
        return '<li class="pd-sec"' + (id ? ' id="' + id + '"' : '') + '><h3 class="pd-sec-h"' + (id ? ' tabindex="-1"' : '') + '>' +
            (k === 'onNow' ? '<i class="pd-sec-dot" aria-hidden="true"></i>' : '') + esc(tr(k)) + '</h3></li>';
    }
    function rowHTML(r, fr) {
        const pic = r.img ? '<img class="pd-pic" src="' + esc(r.img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' :
            '<span class="pd-pic pd-ini" style="--pd-h:' + esc(hue(r.uid)) + '" aria-hidden="true">' + esc(C().initials(r.n)) + '</span>';
        return '<li><button type="button" class="pd-row" data-uid="' + esc(r.uid) + '" aria-label="' + esc(tr('open', { n: r.n })) + '">' + pic +
            '<span class="pd-n">' + esc(r.n) + '</span>' + (fr.has(r.uid) ? '<span class="pd-tag">' + esc(tr('friend')) + '</span>' : '') +
            '<svg class="pd-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></li>';
    }
    function paint() {
        if (!ov) return;
        const box = ov.querySelector('.pd-list'), msg = ov.querySelector('.pd-msg');
        let note = '', html = '';
        if (!live()) note = tr('signin');
        else {
            const all = rows(), shown = C().match(all, q), fr = friendIds(), h = hereNow();
            const onIds = new Set(h.rows.map(r => r.uid)), onShown = C().match(h.rows, q), rest = shown.filter(r => !onIds.has(r.uid));
            const mine = h.me && !q.trim() ? myRow() : null;
            if (!all.length && !mine) note = (W.LOWI_CLOUD && W.LOWI_CLOUD.people && (W.LOWI_CLOUD.people() || []).length) ? tr('empty') : tr('loading');
            else if (!shown.length && !mine) note = tr('none');
            /* "Online right now" first (you, then the others here by name), then everyone else as before */
            if (mine || onShown.length) {
                html = secHTML('onNow', 'pdHere') + (mine ? hereRowHTML(mine, fr, true) : '') + onShown.map(r => hereRowHTML(r, fr, false)).join('') +
                    (rest.length ? secHTML('others', '') : '');
            }
            html += rest.map(r => rowHTML(r, fr)).join('');
        }
        const key = note + '|' + html; /* the whole list: someone moving between Online right now and Everyone else changes the middle */
        if (key === lastKey) return;
        lastKey = key;
        box.innerHTML = html;
        msg.textContent = note;
        msg.hidden = !note;
    }
    /* The person card is the app's own sheet (z-index 250). It opens above the directory, and you come back to the list when
       you close it. Chat and Energy on the card lead somewhere else in the app, so the directory steps aside for them. */
    function showProfile(r) {
        const before = new Set(D.querySelectorAll('.cs-overlay'));
        try { if (W.LowiCommunity && W.LowiCommunity.openProfile) W.LowiCommunity.openProfile(r.uid, r.n); } catch (x) { return; }
        const card = Array.from(D.querySelectorAll('.cs-overlay')).filter(o => !before.has(o)).pop() || Array.from(D.querySelectorAll('.cs-overlay')).pop();
        if (card) card.classList.add('pd-above');
    }
    function onCardClick(e) {
        if (!ov || !e.target || !e.target.closest) return;
        if (e.target.closest('.cs-overlay [data-chat="select-close"], .cs-overlay [data-chat="energy"]:not([disabled])')) setTimeout(close, 0);
    }
    function onKey(e) {
        if (!ov) return;
        if (e.key === 'Escape') {
            if (D.querySelector('.cs-overlay')) return; /* the person card above closes first */
            e.preventDefault(); close(); return;
        }
        if (e.key === 'Tab') {
            const f = Array.from(ov.querySelectorAll('button,input')).filter(x => !x.disabled && x.offsetParent !== null);
            if (!f.length) return;
            const a = f[0], z = f[f.length - 1];
            if (e.shiftKey && D.activeElement === a) { e.preventDefault(); z.focus(); }
            else if (!e.shiftKey && D.activeElement === z) { e.preventDefault(); a.focus(); }
        }
    }
    /* opts.at === 'here' (the header's "N here now"): the list starts at Online right now and that heading takes the focus */
    function toHere() {
        if (!ov) return;
        const l = ov.querySelector('.pd-list'), h = ov.querySelector('#pdHere .pd-sec-h');
        if (l) l.scrollTop = 0;
        if (h) { try { h.focus({ preventScroll: true }); } catch (e) {} }
    }
    function open(opts) {
        if (!C()) return null;
        const at = opts && opts.at === 'here';
        if (ov) { paint(); if (at) toHere(); return ov; }
        opener = D.activeElement;
        q = ''; lastKey = '';
        ov = D.createElement('div');
        ov.className = 'pd-ov';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.setAttribute('aria-labelledby', 'pdTitle');
        ov.innerHTML = '<div class="pd-card"><div class="pd-head"><div class="pd-ht"><h2 id="pdTitle" class="pd-title">' + esc(tr('title')) + '</h2>' +
            '<p class="pd-sub">' + esc(tr('sub')) + '</p></div><button type="button" class="pd-x" data-pd="close" aria-label="' + esc(tr('close')) + '">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></div>' +
            '<label class="pd-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
            '<input type="search" class="pd-q" enterkeyhint="search" autocomplete="off" autocapitalize="words" spellcheck="false" maxlength="40" placeholder="' + esc(tr('search')) + '" aria-label="' + esc(tr('search')) + '"></label>' +
            '<p class="pd-msg" role="status" hidden></p><ul class="pd-list"></ul></div>';
        ov.addEventListener('click', e => {
            if (e.target === ov || e.target.closest('[data-pd="close"]')) { close(); return; }
            const b = e.target.closest('.pd-row');
            if (!b) return;
            if (b.hasAttribute('data-me')) { const m = myRow(); if (m.uid) showProfile({ uid: m.uid, n: m.n || tr('you') }); return; }
            const uid = b.getAttribute('data-uid'), r = rows().find(x => x.uid === uid);
            if (!r) { paint(); return; }
            showProfile(r);
        });
        ov.querySelector('.pd-q').addEventListener('input', e => { q = String(e.target.value || '').slice(0, 40); paint(); });
        D.addEventListener('keydown', onKey, true);
        D.addEventListener('click', onCardClick, true);
        W.addEventListener('lowi-bots', paint);
        D.addEventListener('lowi:room', paint);
        dragDown(ov);
        D.body.appendChild(ov);
        D.documentElement.classList.add('pd-open');
        paint();
        clearInterval(poll);
        poll = setInterval(() => { if (!ov) { clearInterval(poll); return; } paint(); }, 2500);
        try { ov.querySelector('.pd-x').focus({ preventScroll: true }); } catch (e) {}
        if (at) toHere();
        return ov;
    }
    /* Oct 24 2026 (back and close sweep): on a phone People is a bottom sheet, but a swipe down did nothing (only back, X,
       Escape and a tap outside closed it), unlike the app's other sheets. A drag down on its header (title row, not the X)
       now follows the finger and closes it past a quarter of the card or on a quick flick; a short drag springs back. The
       list and the search field are not handles, so scrolling the list never closes it. On a wide screen (iPad, centred
       card) there is no drag, as with the other sheets. */
    function dragDown(o) {
        const card = o.querySelector('.pd-card'), top = o.querySelector('.pd-head');
        if (!card || !top || !W.PointerEvent) return;
        const narrow = () => !(W.matchMedia && W.matchMedia('(min-width:700px)').matches);
        top.style.touchAction = 'none';
        let d = null;
        top.addEventListener('pointerdown', e => {
            if (d || !narrow() || (e.button != null && e.button > 0) || (e.target.closest && e.target.closest('button'))) return;
            d = { id: e.pointerId, y0: e.clientY, y: 0, ly: e.clientY, t: e.timeStamp, v: 0 };
            try { top.setPointerCapture(e.pointerId); } catch (x) { }
        });
        top.addEventListener('pointermove', e => {
            if (!d || e.pointerId !== d.id) return;
            const dt = Math.max(1, e.timeStamp - d.t);
            d.v = .6 * d.v + .4 * ((e.clientY - d.ly) / dt * 1000); d.ly = e.clientY; d.t = e.timeStamp;
            d.y = Math.max(0, e.clientY - d.y0);
            if (d.y > 2) { card.style.animation = 'none'; card.style.transition = 'none'; card.style.transform = 'translateY(' + d.y + 'px)'; }
        });
        const end = (e, cancelled) => {
            if (!d || e.pointerId !== d.id) return;
            const g = d; d = null;
            try { top.releasePointerCapture(e.pointerId); } catch (x) { }
            const h = card.getBoundingClientRect().height || 400;
            const v = e.timeStamp - g.t > 100 ? 0 : g.v;
            if (!cancelled && ov === o && (g.y > Math.min(140, h * .25) || (v > 650 && g.y > 18))) { close(); return; }
            card.style.transition = 'transform .22s ease'; card.style.transform = '';
        };
        top.addEventListener('pointerup', e => end(e, false));
        top.addEventListener('pointercancel', e => end(e, true));
    }
    function close() {
        if (!ov) return;
        /* BH-060: a closing tap on the list is spent, so a fast 2nd tap does not hit what was under it */
        try { const F = window.LowiFreshScrim; if (F && F.closed) F.closed(ov); } catch (e) { }
        clearInterval(poll); poll = 0;
        D.removeEventListener('keydown', onKey, true);
        D.removeEventListener('click', onCardClick, true);
        W.removeEventListener('lowi-bots', paint);
        D.removeEventListener('lowi:room', paint);
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        ov = null; lastKey = '';
        D.documentElement.classList.remove('pd-open');
        try { if (opener && opener.isConnected && opener.focus) opener.focus({ preventScroll: true }); } catch (e) {}
        opener = null;
    }
    W.LowiPeopleDir = { open, close, isOpen: () => !!ov, rows: () => (C() ? rows() : []), here: hereNow };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
