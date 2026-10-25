/* LOWiSPIKE Studio lock UI (25 Oct 2026). Rules live in studio-lock-core.js; the server decides
   (supabase/proposals/studio_lock_20261025.sql). Everyone except the owner sees Community > Studio as one calm glass
   "Under construction" panel; community-rooms-ui.js asks LowiStudioLock.locked() and loads no Affiliates / Creation
   frame while it is true. The owner gets in on his own (studio_access() says yes for public.app_admins); anyone else
   only with the PIN, which the server checks (studio_unlock) and answers with a pass this device keeps.
   No timers while Community is closed except one cheap 2 s compare of account id + pass (a network call only when they change). */
(function (W, D) {
    'use strict';
    const C = W.LowiStudioLockCore;
    if (!C || W.LowiStudioLock) return;
    const ST = { server: null, open: false, key: null, busy: false, checkedAt: 0, formOpen: false, msg: '' };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function lang() { try { const g = (W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || localStorage.getItem('lowispike.lang') || 'en'; return C.TXT[g] ? g : 'en'; } catch (e) { return 'en'; } }
    const t = () => C.text(lang());
    function get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
    function put(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { } }
    function uid() { try { const x = W.LOWI_CLOUD_X, s = x && x.state && x.state(); return (s && s.uid) || ''; } catch (e) { return ''; } }
    /* the account the server will see: only once the cloud session is live (before that the call goes out with the public key) */
    function liveUid() { try { const x = W.LOWI_CLOUD_X, s = x && x.state && x.state(); return (s && s.uid && s.live) ? s.uid : ''; } catch (e) { return ''; } }
    function pass() { const p = get(C.PASS_KEY); return C.validPass(p) ? p : ''; }

    /* signed in: the app's own Supabase client (the server sees who it is, so the owner gets in); otherwise the public key */
    async function rpc(name, args) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return { error: { message: 'offline' } };
        const x = W.LOWI_CLOUD_X;
        let s = null; try { s = x && x.state && x.state(); } catch (e) { }
        if (s && s.uid && s.live && x.client) {
            try { const sb = await x.client(); if (sb && sb.rpc) return await sb.rpc(name, args || {}); } catch (e) { }
        }
        const cfg = W.LOWI_CFG;
        if (!cfg || !cfg.url || !cfg.key) return { error: { message: 'offline' } };
        try {
            const r = await fetch(cfg.url + '/rest/v1/rpc/' + name, { method: 'POST', headers: { apikey: cfg.key, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) });
            const d = await r.json().catch(() => null);
            return r.ok ? { data: d } : { error: d || { message: 'http ' + r.status } };
        } catch (e) { return { error: e }; }
    }

    function set(open) {
        open = !!open;
        if (ST.open === open) return;
        ST.open = open;
        if (open) { ST.formOpen = false; ST.msg = ''; }
        try { W.dispatchEvent(new CustomEvent('lowi:studio-lock', { detail: { open } })); } catch (e) { }
        refresh();
    }
    function local() { return C.decide(ST.server, get(C.OK_KEY), pass(), uid()); }

    /* ask the server; a missing answer (offline, no SQL yet) keeps the remembered verdict */
    async function check(force) {
        const p = pass(), id = liveUid(), key = id + '|' + p;
        if (!force && key === ST.key) return ST.open;
        ST.key = key; ST.checkedAt = Date.now();
        const res = await rpc('studio_access', { pass: p || null });
        if (key !== liveUid() + '|' + pass()) return ST.open; /* account, session or pass changed meanwhile: the next check answers */
        const v = C.accessFromRpc(res);
        if (v === null) { set(local()); return ST.open; }
        ST.server = v;
        if (v) put(C.OK_KEY, C.okMark(!!p, id));
        else { put(C.OK_KEY, ''); if (p) put(C.PASS_KEY, ''); }
        set(v);
        return ST.open;
    }

    async function unlock(pin) {
        pin = C.normalizePin(pin);
        if (!C.pinReady(pin)) { ST.msg = t().short; refresh(); return false; }
        if (ST.busy) return false;
        ST.busy = true; ST.msg = t().checking; refresh();
        const r = C.unlockFromRpc(await rpc('studio_unlock', { pin }));
        ST.busy = false;
        if (r.ok) {
            put(C.PASS_KEY, r.pass); put(C.OK_KEY, C.okMark(true, uid()));
            ST.server = true; ST.key = liveUid() + '|' + r.pass; ST.msg = '';
            set(true);
            return true;
        }
        ST.msg = C.reasonText(r.reason, lang());
        refresh();
        const i = D.querySelector('.sl-lock .sl-in input'); if (i) { i.value = ''; try { i.focus({ preventScroll: true }); } catch (e) { } }
        const f = D.querySelector('.sl-lock .sl-pin'); if (f) { f.classList.remove('sl-no'); void f.offsetWidth; f.classList.add('sl-no'); }
        return false;
    }

    const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';
    function html() {
        const x = t();
        return '<div class="sl-in"><span class="sl-pill"><i aria-hidden="true"></i>' + esc(x.pill) + '</span>'
            + '<span class="sl-ic" aria-hidden="true">' + LOCK + '</span>'
            + '<h2 class="sl-t">' + esc(x.title) + '</h2><p class="sl-s">' + esc(x.sub) + '</p>'
            + '<form class="sl-pin" novalidate' + (ST.formOpen ? '' : ' hidden') + '><input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" aria-label="' + esc(x.pinLabel) + '" placeholder="' + esc(x.pinHint) + '">'
            + '<span class="sl-row"><button type="button" class="sl-b sl-cancel" data-sl="cancel">' + esc(x.cancel) + '</button><button type="submit" class="sl-b sl-go">' + esc(x.open) + '</button></span>'
            + '<span class="sl-msg" role="status" aria-live="polite">' + esc(ST.msg) + '</span></form></div>'
            + '<button type="button" class="sl-key" data-sl="pin" aria-label="' + esc(x.lockBtn) + '" aria-expanded="' + (ST.formOpen ? 'true' : 'false') + '"' + (ST.formOpen ? ' hidden' : '') + '>' + LOCK + '</button>';
    }
    function wire(sec) {
        sec.addEventListener('click', e => {
            const b = e.target.closest('[data-sl]'); if (!b) return;
            e.preventDefault();
            if (b.dataset.sl === 'pin') { ST.formOpen = true; ST.msg = ''; refresh(); const i = sec.querySelector('input'); if (i) try { i.focus({ preventScroll: true }); } catch (er) { } }
            else if (b.dataset.sl === 'cancel') { ST.formOpen = false; ST.msg = ''; refresh(); const k = sec.querySelector('.sl-key'); if (k) try { k.focus({ preventScroll: true }); } catch (er) { } }
        });
        sec.addEventListener('input', e => { const i = e.target; if (i && i.tagName === 'INPUT') { const v = C.normalizePin(i.value); if (v !== i.value) i.value = v; } });
        sec.addEventListener('submit', e => { e.preventDefault(); const i = sec.querySelector('input'); unlock(i ? i.value : ''); });
    }
    /* repaint the panel in place; the typed digits survive (only the message, labels and hidden flags change) */
    function fill(sec) {
        const L = lang(), sig = L + '|' + (ST.formOpen ? 1 : 0);
        if (sec.__sig !== sig) {
            const i = sec.querySelector('input'), v = i ? i.value : '';
            sec.innerHTML = html(); sec.__sig = sig; sec.setAttribute('aria-label', t().title);
            const n = sec.querySelector('input'); if (n && v) n.value = v;
        }
        const m = sec.querySelector('.sl-msg'); if (m && m.textContent !== ST.msg) m.textContent = ST.msg;
        const g = sec.querySelector('.sl-go'); if (g) g.disabled = ST.busy;
    }
    /* community-rooms-ui.js ensureView: on = Studio is the open tab and locked */
    function paint(box, on) {
        if (!box) return null;
        let sec = box.querySelector(':scope>.sl-lock');
        if (!on) { if (sec) sec.hidden = true; return sec; }
        if (!sec) { sec = D.createElement('section'); sec.className = 'rm-frame sl-lock'; sec.setAttribute('data-noi18n', ''); sec.setAttribute('role', 'region'); wire(sec); box.appendChild(sec); }
        sec.hidden = false;
        fill(sec);
        if (Date.now() - ST.checkedAt > 30000) check(true);
        return sec;
    }
    function refresh() { D.querySelectorAll('.sl-lock:not([hidden])').forEach(fill); }

    ST.open = local();
    setInterval(() => { if (liveUid() + '|' + pass() !== ST.key) check(false); }, 2000);
    W.addEventListener('online', () => check(true));
    D.addEventListener('visibilitychange', () => { if (D.visibilityState === 'visible' && Date.now() - ST.checkedAt > 30000) check(true); });
    setTimeout(() => check(false), 0);

    W.LowiStudioLock = { locked: () => !ST.open, isOpen: () => ST.open, paint, check, unlock, _st: ST };
})(window, document);
