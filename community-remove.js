/* LOWiSPIKE: the admin's "Remove from community" (25 Oct 2026). Rules and labels: community-remove-core.js.
   Server: supabase/proposals/community_remove_20261025.sql (admin = public.is_app_admin(), checked on every call).

   - Every profile card (.cp-card in community-chat.js) gets, for the admin only, "Remove from community" under Block person,
     with one confirm step. Nobody else ever gets the button; a forged one is refused by the server.
   - Community settings get a "Removed people" list with Restore, for the admin only.
   - The removed ids (public.community_kicks) go to hidden-accounts.js, so the person leaves Room, Chat, Ranking, For You,
     Add a friend, the People list and mentions for everyone. The server hides their rows too.
   - A removed person sees a calm "You're no longer part of this community" screen in Community instead of the chat.
   Nothing here deletes anything. */
(function () {
    'use strict';
    const W = window, D = document, C = W.LowiCommunityRemoveCore;
    if (!C || W.LowiCommunityRemove) return;
    const ST = { admin: false, out: false, self: '', loadedAt: 0, busy: false, ask: '', done: null };
    function lang() { try { const g = (W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || localStorage.getItem('lowispike.lang') || 'en'; return C.TXT[g] ? g : 'en'; } catch (e) { return 'en'; } }
    const t = () => C.text(lang());
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function cloud() { try { const x = W.LOWI_CLOUD_X, s = x && x.state && x.state(); return (s && s.uid && s.live && x.client) ? { x, uid: String(s.uid).toLowerCase() } : null; } catch (e) { return null; } }
    async function client() { const c = cloud(); if (!c) return null; try { const sb = await c.x.client(); return sb && sb.rpc ? sb : null; } catch (e) { return null; } }
    async function rpc(name, args) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return { error: { message: 'offline' } };
        const sb = await client(); if (!sb) return { error: { message: 'offline' } };
        try { return await sb.rpc(name, args || {}); } catch (e) { return { error: { message: String(e && e.message || e) } }; }
    }
    const HA = () => W.LowiHiddenAccounts;
    function removedNow() { const H = HA(); return H && H.removedIds ? H.removedIds() : []; }
    function setRemoved(ids) { const H = HA(); if (H && H.setRemoved) H.setRemoved(ids); }

    /* the admin flag is cached per account only so the button can show before the network answers; the server's answer wins */
    function cachedAdmin(uid) { try { const v = JSON.parse(localStorage.getItem(C.ADMIN_KEY) || 'null'); return !!(v && v.uid === uid && v.admin === true); } catch (e) { return false; } }
    function saveAdmin(uid, admin) { try { localStorage.setItem(C.ADMIN_KEY, JSON.stringify({ uid, admin: admin === true })); } catch (e) { } }

    async function load(force) {
        const c = cloud(); if (!c) return false;
        if (!force && Date.now() - ST.loadedAt < 30000 && ST.self === c.uid) return true;
        if (ST.self !== c.uid) { ST.self = c.uid; ST.admin = cachedAdmin(c.uid); }
        ST.loadedAt = Date.now();
        const sb = await client(); if (!sb) return false;
        const [a, k, me] = await Promise.all([
            rpc('community_is_admin'),
            sb.from('community_kicks').select('user_id').limit(5000).then(r => r, e => ({ error: e })),
            rpc('community_am_removed')
        ]);
        if (a && !a.error) { ST.admin = C.adminFrom(a); saveAdmin(c.uid, ST.admin); }
        if (k && !k.error && Array.isArray(k.data)) setRemoved(C.idsFrom(k.data));
        if (me && !me.error) { ST.out = C.removedFrom(me); }
        D.documentElement.classList.toggle('cr-admin-on', ST.admin);
        outScreen(); decorate();
        return true;
    }

    /* ---------- the button on a profile card ---------- */
    function cardName(card, id) {
        const b = card.querySelector('[data-chat="block"][data-name]'); if (b) return b.getAttribute('data-name');
        const h = card.querySelector('h2'); return h ? (h.childNodes[0] && h.childNodes[0].textContent || h.textContent || '').trim() : '';
    }
    function decorateCard(card) {
        const id = String(card.getAttribute('data-person') || '').trim().toLowerCase();
        const has = card.querySelector(':scope > .cr-admin');
        const want = C.canRemove({ admin: ST.admin, self: ST.self }, id) && (!(HA() && HA().isRemoved && HA().isRemoved(id)) || (ST.done && ST.done.id === id));
        if (!want) { if (has && !ST.admin) has.remove(); return; }
        if (has) return;
        const T = t(), n = cardName(card, id);
        const box = D.createElement('div');
        box.className = 'cr-admin'; box.setAttribute('data-cr-id', id); box.setAttribute('data-cr-name', n);
        box.innerHTML = '<button type="button" class="cr-btn" data-cr="ask" data-sfx="none"><span class="cr-badge">' + esc(T.badge) + '</span> ' + esc(T.btn) + '</button>' +
            '<div class="cr-confirm" hidden role="alertdialog" aria-label="' + esc(C.fill(T.title, n)) + '"><b>' + esc(C.fill(T.title, n)) + '</b><p>' + esc(C.fill(T.body, n)) + '</p>' +
            '<div class="cr-row"><button type="button" class="cr-no" data-cr="cancel" data-sfx="none">' + esc(T.cancel) + '</button><button type="button" class="cr-yes" data-cr="yes" data-sfx="none">' + esc(T.yes) + '</button></div></div>' +
            '<p class="cr-result" role="status"></p>';
        card.appendChild(box);
        /* the card can be redrawn while it is open (a profile update); keep an open confirm or a finished removal on screen */
        if (ST.ask === id) box.querySelector('.cr-confirm').hidden = false;
        if (ST.done && ST.done.id === id) { box.classList.add('cr-done'); box.querySelector('[data-cr="ask"]').hidden = true; box.querySelector('.cr-result').textContent = ST.done.text; }
    }
    async function doRemove(box) {
        if (ST.busy) return; const id = box.getAttribute('data-cr-id'), n = box.getAttribute('data-cr-name'), T = t();
        const out = box.querySelector('.cr-result'), yes = box.querySelector('[data-cr="yes"]');
        ST.busy = true; if (yes) { yes.disabled = true; yes.textContent = T.working; }
        const r = await rpc('community_remove', { target: id });
        ST.busy = false;
        if (r && !r.error) {
            setRemoved(removedNow().concat([id]));
            box.classList.add('cr-done'); box.querySelector('.cr-confirm').hidden = true; box.querySelector('[data-cr="ask"]').hidden = true;
            out.textContent = C.fill(T.done, n); ST.ask = ''; ST.done = { id, text: out.textContent };
            return true;
        }
        if (yes) { yes.disabled = false; yes.textContent = T.yes; }
        out.textContent = C.reasonText(C.reasonOf(r), lang());
        return false;
    }

    /* ---------- "Removed people" in Community settings ---------- */
    async function paintList(sec) {
        const T = t(), list = sec.querySelector('.cr-list');
        list.innerHTML = '<p class="cr-muted">' + esc(T.loading) + '</p>';
        const r = await rpc('community_removed_list');
        const rows = C.listFrom(r);
        if (!rows) { list.innerHTML = '<p class="cr-muted">' + esc(C.reasonText(C.reasonOf(r), lang())) + '</p>'; return; }
        if (!rows.length) { list.innerHTML = '<p class="cr-muted">' + esc(T.none) + '</p>'; return; }
        list.innerHTML = rows.map(x => '<div class="cr-item" data-cr-id="' + esc(x.id) + '" data-cr-name="' + esc(x.name) + '"><span>' + esc(x.name) + '</span><button type="button" class="cr-restore" data-cr="restore" data-sfx="none">' + esc(T.restore) + '</button></div>').join('');
    }
    function decorateSettings(blocked) {
        const host = blocked.closest('.cs-sheet') || blocked.parentElement; if (!host) return;
        const has = host.querySelector('.cr-removed');
        if (!ST.admin) { if (has) has.remove(); return; }
        if (has) return;
        const T = t(), sec = D.createElement('section');
        sec.className = 'cr-removed';
        sec.innerHTML = '<h2>' + esc(T.list) + ' <span class="cr-badge">' + esc(T.badge) + '</span></h2><p class="cr-muted">' + esc(T.listNote) + '</p><div class="cr-list"></div><p class="cr-result" role="status"></p>';
        const res = host.querySelector('#csBlockResult');
        const after = res && res.parentElement === host ? res : blocked;
        after.insertAdjacentElement('afterend', sec);
        paintList(sec);
    }
    async function doRestore(item) {
        if (ST.busy) return; const id = item.getAttribute('data-cr-id'), n = item.getAttribute('data-cr-name'), T = t();
        const btn = item.querySelector('[data-cr="restore"]'), sec = item.closest('.cr-removed'), out = sec && sec.querySelector(':scope > .cr-result');
        ST.busy = true; btn.disabled = true; btn.textContent = T.restoring;
        const r = await rpc('community_restore', { target: id });
        ST.busy = false;
        if (r && !r.error) { setRemoved(removedNow().filter(x => x !== id)); item.remove(); if (out) out.textContent = C.fill(T.restored, n); if (sec && !sec.querySelector('.cr-item')) sec.querySelector('.cr-list').innerHTML = '<p class="cr-muted">' + esc(T.none) + '</p>'; return true; }
        btn.disabled = false; btn.textContent = T.restore; if (out) out.textContent = C.reasonText(C.reasonOf(r), lang());
        return false;
    }

    /* ---------- the removed person's calm screen in Community ---------- */
    function outScreen() {
        const tab = D.getElementById('tab-foryou');
        D.documentElement.classList.toggle('cr-out', ST.out);
        let el = D.getElementById('crOut');
        if (!ST.out) { if (el) el.remove(); return; }
        if (!tab) return;
        const T = t(), sig = lang();
        if (el && el.parentElement === tab && el.getAttribute('data-l') === sig) return;
        if (!el) { el = D.createElement('div'); el.id = 'crOut'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'false'); }
        el.setAttribute('data-l', sig);
        el.innerHTML = '<div class="cr-out-card"><div class="cr-out-ico" aria-hidden="true"></div><h2>' + esc(T.outTitle) + '</h2><p>' + esc(T.outBody) + '</p><button type="button" class="cr-out-home" data-cr="home" data-sfx="none">' + esc(T.outHome) + '</button></div>';
        if (el.parentElement !== tab) tab.appendChild(el);
    }

    /* ---------- wiring ---------- */
    let raf = 0;
    function decorate() {
        raf = 0;
        D.querySelectorAll('.cp-card[data-person]').forEach(decorateCard);
        D.querySelectorAll('#csBlockedList').forEach(decorateSettings);
        if (ST.out) outScreen();
    }
    /* a short timer, not requestAnimationFrame: Safari refuses a detached rAF call and can hold rAF back, which left the card
       without its button in WebKit */
    function soon() { if (raf) return; raf = setTimeout(decorate, 30); }
    D.addEventListener('click', e => {
        const b = e.target && e.target.closest && e.target.closest('[data-cr]'); if (!b) return;
        const k = b.getAttribute('data-cr');
        if (k === 'ask' || k === 'cancel' || k === 'yes') {
            const box = b.closest('.cr-admin'); if (!box) return; e.preventDefault(); e.stopPropagation();
            if (!ST.admin) { box.remove(); return; }
            const conf = box.querySelector('.cr-confirm');
            if (k === 'ask') { ST.ask = box.getAttribute('data-cr-id'); ST.done = null; conf.hidden = false; box.querySelector('.cr-result').textContent = ''; const y = conf.querySelector('[data-cr="yes"]'); try { y.focus({ preventScroll: false }); conf.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (x) { } }
            else if (k === 'cancel') { conf.hidden = true; ST.ask = ''; }
            else doRemove(box);
        } else if (k === 'restore') { const it = b.closest('.cr-item'); if (it) { e.preventDefault(); doRestore(it); } }
        else if (k === 'home') { e.preventDefault(); try { if (typeof W.lowiOpen === 'function') W.lowiOpen('home'); else if (typeof W.goTab === 'function') W.goTab('home'); } catch (x) { } }
    }, true);
    try { new MutationObserver(soon).observe(D.documentElement, { childList: true, subtree: true }); } catch (e) { }
    let tries = 0;
    (function boot() { load(true).then(ok => { if (!ok && ++tries < 40) setTimeout(boot, 1500); }); })();
    D.addEventListener('visibilitychange', () => { if (D.visibilityState === 'visible') load(false); });
    setInterval(() => { if (D.visibilityState !== 'hidden') load(true); }, 180000);
    W.addEventListener('online', () => load(true));
    W.addEventListener('lowi:lang', () => { D.querySelectorAll('.cr-admin, .cr-removed').forEach(x => x.remove()); const o = D.getElementById('crOut'); if (o) o.remove(); soon(); });

    W.LowiCommunityRemove = { load, state: () => Object.assign({}, ST, { removed: removedNow() }), decorate, _rpc: rpc };
})();
