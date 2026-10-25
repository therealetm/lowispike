/* LOWiSPIKE Studio gate for the standalone pages (25 Oct 2026). Emmanuel: "I wanted the studio to be, like, private. So only
   I can access it with a password." Then: "Ok nice if only I can see it it's ok."
   affiliates/ and create/ keep their content in an inert <template id="studioPage">, their scripts as type="text/x-studio"
   (never fetched) and their stylesheet as rel="studio-stylesheet" (never fetched). This file shows the same calm "Under
   construction" panel as Community > Studio and asks the server (studio_access, supabase/proposals/studio_lock_20261025.sql):
   the owner's account gets straight in, anyone else only with the PIN, which only the server checks (studio_unlock). Only a
   server yes (or, with no answer at all, the verdict this device remembered from the server) turns the page on.
   Unlocked: a small "Private · only you" badge and a Lock button that locks this device again (lowi.studio.locked).
   In the app (?embed=1) the app's own lock already asked the server and shows the badge, so the frame just follows it.
   An affiliate invite link (?ref=) gets the same lock; the ref is only remembered on this device. */
(function (W, D) {
    'use strict';
    const C = W.LowiStudioLockCore;
    if (!C || W.LowiStudioGate) return;
    const CFG = (W.LOWI_CFG && W.LOWI_CFG.url && W.LOWI_CFG.key) ? W.LOWI_CFG
        : { url: 'https://vnfwmifmsfecascwaody.supabase.co', key: 'sb_publishable_iVA3wCYxzfWu2q8SSgieWw_adXbx4Qd' };
    const LIB = '../vendor/supabase-2.117.3.js';
    const REF_KEY = 'lowi.aff.ref';
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const q = new URLSearchParams((W.location && W.location.search) || '');
    const embed = q.get('embed') === '1';
    const G = { state: 'checking', formOpen: false, msg: '', busy: false, sec: null, opened: false };

    function get(k) { try { return W.localStorage.getItem(k) || ''; } catch (e) { return ''; } }
    function put(k, v) { try { if (v) W.localStorage.setItem(k, v); else W.localStorage.removeItem(k); } catch (e) { } }
    function lang() {
        const l = q.get('lang') || get('lowispike.lang') || String((W.navigator && W.navigator.language) || 'en').slice(0, 2);
        return C.TXT[l] ? l : 'en';
    }
    function pass() { const p = get(C.PASS_KEY); return C.validPass(p) ? p : ''; }
    function preview() { return get(C.PREVIEW_KEY) === '1'; }
    /* the app's sign-in on this device (same storage key as index.html's Supabase client) */
    function session() {
        try { const s = JSON.parse(get('lowi.auth') || 'null'); return (s && s.access_token && s.user && s.user.id) ? s : null; } catch (e) { return null; }
    }
    function uid() { const s = session(); return s ? s.user.id : ''; }

    function loadLib() {
        if (W.supabase && W.supabase.createClient) return Promise.resolve(W.supabase);
        return new Promise((res, rej) => {
            const s = D.createElement('script'); s.src = LIB; s.async = true;
            s.onload = () => (W.supabase && W.supabase.createClient) ? res(W.supabase) : rej(new Error('lib'));
            s.onerror = () => rej(new Error('lib'));
            D.head.appendChild(s);
        });
    }
    let sbP = null;
    function client() {
        if (!sbP) sbP = loadLib().then(lib => lib.createClient(CFG.url, CFG.key, {
            auth: { storageKey: 'lowi.auth', persistSession: true, autoRefreshToken: false, detectSessionInUrl: false }
        }));
        return sbP;
    }
    /* signed in: the call carries the account (a fresh token first if it ran out), so the server knows the owner.
       Otherwise the public key. Returns {data} or {error} like supabase-js. */
    async function rpc(name, args) {
        if (W.navigator && W.navigator.onLine === false) return { error: { message: 'offline' } };
        const s = session();
        let token = CFG.key;
        if (s) {
            const fresh = s.expires_at && (s.expires_at * 1000 - Date.now() > 60000);
            if (fresh) token = s.access_token;
            else {
                try { const sb = await client(); return await sb.rpc(name, args || {}); } catch (e) { /* the public key below */ }
            }
        }
        try {
            const r = await W.fetch(CFG.url + '/rest/v1/rpc/' + name, {
                method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify(args || {})
            });
            if (!r.ok) return { error: { message: 'http ' + r.status, status: r.status } };
            return { data: await r.json() };
        } catch (e) { return { error: e }; }
    }

    /* in the app the parent's lock has already asked the server */
    function parentLock() {
        if (!embed) return null;
        try { const p = W.parent; if (p && p !== W && p.LowiStudioLock && typeof p.LowiStudioLock.isOpen === 'function') return p.LowiStudioLock; } catch (e) { }
        return null;
    }

    async function check() {
        if (preview()) return false;
        const pl = parentLock();
        if (pl) return pl.isOpen() === true;
        const p = pass(), id = uid();
        const v = C.accessFromRpc(await rpc('studio_access', { pass: p || null }));
        if (v === null) return C.decide(null, get(C.OK_KEY), p, id, false);
        if (v) put(C.OK_KEY, C.okMark(!!p, id));
        else { put(C.OK_KEY, ''); if (p) put(C.PASS_KEY, ''); }
        return v;
    }

    /* ---- the lock panel ---- */
    function fill() {
        const sec = G.sec; if (!sec) return;
        const i = sec.querySelector('input'), v = i ? i.value : '';
        sec.innerHTML = C.lockHtml(lang(), G.formOpen, G.msg);
        const n = sec.querySelector('input'); if (n && v) n.value = v;
        const g = sec.querySelector('.sl-go'); if (g) g.disabled = G.busy;
    }
    function showLock(wait) {
        if (!G.sec) {
            const sec = D.createElement('section');
            sec.className = 'sl-lock sl-page'; sec.setAttribute('role', 'region'); sec.setAttribute('data-noi18n', '');
            sec.addEventListener('click', e => {
                const b = e.target && e.target.closest && e.target.closest('[data-sl]'); if (!b) return;
                e.preventDefault();
                if (b.dataset.sl === 'pin') { G.formOpen = true; G.msg = ''; fill(); const i = sec.querySelector('input'); if (i) try { i.focus({ preventScroll: true }); } catch (er) { } }
                else if (b.dataset.sl === 'cancel') { G.formOpen = false; G.msg = ''; fill(); }
            });
            sec.addEventListener('input', e => { const i = e.target; if (i && i.tagName === 'INPUT') { const v = C.normalizePin(i.value); if (v !== i.value) i.value = v; } });
            sec.addEventListener('submit', e => { e.preventDefault(); const i = sec.querySelector('input'); unlock(i ? i.value : ''); });
            G.sec = sec;
            D.body.insertBefore(sec, D.body.firstChild);
        }
        G.sec.setAttribute('aria-label', C.text(lang()).title);
        if (wait) G.sec.classList.add('sl-wait'); else G.sec.classList.remove('sl-wait');
        fill();
    }

    /* ---- the page: only after a yes ---- */
    function openPage() {
        if (G.opened) return;
        G.opened = true; G.state = 'open';
        if (G.sec) { G.sec.remove(); G.sec = null; }
        D.querySelectorAll('link[rel="studio-stylesheet"]').forEach(l => l.setAttribute('rel', 'stylesheet'));
        const tpl = D.getElementById('studioPage');
        if (tpl && tpl.content) tpl.replaceWith(D.importNode(tpl.content, true));
        D.querySelectorAll('script[type="text/x-studio"]').forEach(old => {
            const s = D.createElement('script');
            const src = old.getAttribute('src');
            if (src) { s.src = src; s.setAttribute('src', src); s.async = false; } else s.textContent = old.textContent;
            old.remove();
            D.body.appendChild(s);
        });
        try { D.documentElement.classList.remove('sl-gated'); } catch (e) { }
        if (!embed) {
            const bar = D.createElement('div');
            bar.className = 'sl-open sl-top'; bar.setAttribute('role', 'group'); bar.setAttribute('data-noi18n', '');
            bar.setAttribute('aria-label', C.text(lang()).badge);
            bar.innerHTML = C.openHtml(lang());
            bar.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-sl="lock"]'); if (!b) return; e.preventDefault(); lock(); });
            D.body.insertBefore(bar, D.body.firstChild);
        }
    }

    async function unlock(pin) {
        pin = C.normalizePin(pin);
        if (!C.pinReady(pin)) { G.msg = C.text(lang()).short; fill(); return false; }
        if (G.busy) return false;
        G.busy = true; G.msg = C.text(lang()).checking; fill();
        const r = C.unlockFromRpc(await rpc('studio_unlock', { pin }));
        G.busy = false;
        if (r.ok) {
            put(C.PASS_KEY, r.pass); put(C.OK_KEY, C.okMark(true, uid())); put(C.PREVIEW_KEY, '');
            G.msg = '';
            openPage();
            return true;
        }
        G.msg = C.reasonText(r.reason, lang());
        fill();
        const i = G.sec && G.sec.querySelector('input'); if (i) { i.value = ''; try { i.focus({ preventScroll: true }); } catch (e) { } }
        return false;
    }
    /* Lock: forget this device's pass and keep this device locked (the owner too) until the right PIN, then start clean */
    function lock() {
        put(C.PASS_KEY, ''); put(C.OK_KEY, ''); put(C.PREVIEW_KEY, '1');
        G.state = 'locked';
        try { if (embed && W.parent && W.parent !== W && W.parent.LowiStudioLock) { W.parent.LowiStudioLock.lockDevice(); return; } } catch (e) { }
        W.location.reload();
    }

    async function start() {
        const ref = q.get('ref');
        if (ref && UUID.test(ref) && /\/affiliates\//.test((W.location && W.location.pathname) || '')) put(REF_KEY, ref.toLowerCase());
        showLock(true);
        let ok = false;
        try { ok = await check(); } catch (e) { ok = false; }
        if (ok) openPage();
        else { G.state = 'locked'; showLock(false); }
    }

    try { D.documentElement.classList.add('sl-gated'); } catch (e) { }
    W.LowiStudioGate = { state: () => G.state, unlock, lock, check };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})(window, document);
