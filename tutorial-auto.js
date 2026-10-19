/* tutorial-auto.js: the tour starts by itself for every NEW account (Oct 19 2026, Emmanuel: "when someone makes a new account, they
   should automatically be taken through a tutorial phase, because they don't know what to do and where everything is. They get very
   overwhelmed ... Obviously, with a skippable option").
   - Exactly once per account. Setup's finishOb() fires 'lowi:setup-done'; only then is the account marked 'pending'. Accounts that
     finished setup before this build never get that event, so they are never forced into the tour (Settings > Tutorial still works).
   - The mark lives in localStorage 'lowispike.tutorial-auto.v1'. Every lowispike.* key is in the account backup (Supabase
     user_state), so it follows the account: no replay on reload, sign-in or another device.
   - It starts only when Home is up and NOTHING else is: setup / sign-in gate, the birthday reveal, the starter interview, the Day
     card, any sheet or dialog (LowiTutorial.busyBy() plus #drDay), and only after that has been quiet for QUIET_MS.
   - Quit partway (closed the app or reloaded mid-tour): next time, ONE offer to continue where you left off. No thanks ends it.
     Skip all ends it for good. Skip and Skip all stay on every card (tutorial.js). Never touches tutorial.js's hold/flicker logic.
   State: { s: 'pending' | 'running' | 'offered' | 'done' | 'skipped' | 'declined', step, at, resumed } */
(function (root) {
    'use strict';
    const KEY = 'lowispike.tutorial-auto.v1';
    const QUIET_MS = 2500;

    /* ---------- pure core (tests) ---------- */
    /* what to do right now. st = stored state, ctx = { live: tour already running in this page, quietMs, booted: first look in this page } */
    function decide(st, ctx) {
        const s = st && st.s, c = ctx || {};
        if (c.live) return 'none';
        if (s === 'pending') return c.quietMs >= QUIET_MS ? 'start' : 'wait';
        /* 'running' with no live tour = the app was closed or reloaded mid-tour */
        if (s === 'running') { if (st.resumed) return 'quit'; return c.quietMs >= QUIET_MS ? 'offer' : 'wait'; }
        return 'none';
    }
    /* new state after a 'lowi:tutorial' event from tutorial.js */
    function onEvent(st, d) {
        const s = st && st.s; if (!s || !d) return st;
        if (s !== 'running' && s !== 'pending' && s !== 'offered') return st;
        if (d.reason === 'finished') return Object.assign({}, st, { s: 'done', end: Date.now() });
        if (d.reason === 'skipped') return Object.assign({}, st, { s: 'skipped', end: Date.now() });
        if (d.on && d.step) return Object.assign({}, st, { s: 'running', step: d.step });
        return st;
    }
    function markNew(st) { return st && st.s ? st : { s: 'pending', at: Date.now() }; }
    const UI = {
        en: { t: 'Pick up the tour?', p: 'You left the tour halfway. Want me to show you the rest?', go: 'Continue', no: 'No thanks' },
        de: { t: 'Tour weitermachen?', p: 'Du hast die Tour mittendrin verlassen. Soll ich dir den Rest zeigen?', go: 'Weiter', no: 'Nein danke' },
        es: { t: '¿Seguimos el recorrido?', p: 'Dejaste el recorrido a medias. ¿Te enseño el resto?', go: 'Continuar', no: 'No, gracias' }
    };
    const api = { KEY, QUIET_MS, decide, onEvent, markNew, UI };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (!root || !root.document) return;

    /* ---------- page ---------- */
    const W = root, D = W.document, H = D.documentElement;
    if (W.LowiTutorialAuto) return;
    const $ = s => D.querySelector(s);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } };
    const set = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } };
    const lang = () => { let l = 'en'; try { l = (W.LowiLang && LowiLang.get && LowiLang.get()) || H.lang || 'en'; } catch (e) { } l = String(l).slice(0, 2); return l === 'de' || l === 'es' ? l : 'en'; };
    const vis = el => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
    const T = () => W.LowiTutorial || null;

    /* Home is the screen in front, and nothing (setup, reveal, Day card, sheets, dialogs, flight) is on top of it */
    function quietNow() {
        const t = T(); if (!t || !t.busyBy) return false;
        if (D.hidden) return false;
        const home = D.getElementById('tab-home'); if (home && !home.classList.contains('active')) return false;
        if (!vis($('#whPad')) && !vis($('[data-home-misty]')) && !vis($('#spBubble'))) return false;
        if (vis($('#drDay')) || vis($('#drA2')) || vis($('#drPick'))) return false;
        let b = ''; try { b = t.busyBy(); } catch (e) { b = 'error'; }
        return !b;
    }

    let offer = null, quietSince = 0;
    function closeOffer() { if (offer) { offer.remove(); offer = null; } }
    function showOffer(st) {
        set(Object.assign({}, st, { s: 'offered' }));
        const U = UI[lang()] || UI.en;
        /* same glass card as the tour; id ltTour so the Day card's BUSY list waits for it too */
        offer = D.createElement('div'); offer.id = 'ltTour'; offer.className = 'lt-tour lt-center lt-resume';
        offer.setAttribute('role', 'dialog'); offer.setAttribute('aria-modal', 'true'); offer.setAttribute('aria-labelledby', 'ltrT'); offer.setAttribute('data-noi18n', '');
        offer.innerHTML = '<div class="lt-hole" aria-hidden="true"></div><div class="lt-card" tabindex="-1">' +
            '<div class="lt-top"><span class="lt-meta"><b class="lt-title" id="ltrT">' + esc(U.t) + '</b></span></div>' +
            '<p class="lt-text">' + esc(U.p) + '</p>' +
            '<div class="lt-btns"><button type="button" class="lt-btn lt-ghost" data-ltr="no">' + esc(U.no) + '</button>' +
            '<span class="lt-right"><button type="button" class="lt-btn lt-go" data-ltr="go">' + esc(U.go) + '</button></span></div></div>';
        D.body.appendChild(offer);
        const card = offer.querySelector('.lt-card'), vw = H.clientWidth || innerWidth, cw = Math.min(360, vw - 24);
        card.style.width = cw + 'px'; card.style.left = Math.round((vw - cw) / 2) + 'px'; card.style.top = Math.round(Math.max(12, (innerHeight - (card.offsetHeight || 180)) / 2)) + 'px';
        offer.addEventListener('click', e => {
            e.stopPropagation(); const b = e.target.closest('[data-ltr]'); if (!b) return;
            const go = b.getAttribute('data-ltr') === 'go', cur = get(); closeOffer();
            if (!go) { set(Object.assign({}, cur, { s: 'declined', end: Date.now() })); return; }
            set(Object.assign({}, cur, { s: 'running', resumed: true }));
            const t = T(); if (t && t.start) t.start({ from: 'auto-resume', at: cur.step || '' });
        });
        try { offer.querySelector('[data-ltr="go"]').focus({ preventScroll: true }); } catch (e) { }
    }
    function tick() {
        if (offer) return;
        const st = get(); if (!st.s || st.s === 'done' || st.s === 'skipped' || st.s === 'declined') { quietSince = 0; return; }
        const t = T(), live = !!(t && t.isOn && t.isOn());
        if (live) { quietSince = 0; return; }
        if (st.s === 'offered') { set(Object.assign({}, st, { s: 'declined' })); return; } /* the offer was shown and the page went away: that was the one offer */
        const now = Date.now();
        if (quietNow()) { if (!quietSince) quietSince = now; } else quietSince = 0;
        const what = decide(st, { live, quietMs: quietSince ? now - quietSince : 0 });
        if (what === 'start') { quietSince = 0; set(Object.assign({}, st, { s: 'running' })); if (!(t && t.start && t.start({ from: 'auto' }))) set(st); }
        else if (what === 'offer') { quietSince = 0; showOffer(st); }
        else if (what === 'quit') set(Object.assign({}, st, { s: 'declined' }));
    }
    W.addEventListener('lowi:setup-done', () => set(markNew(get())));
    W.addEventListener('lowi:tutorial', e => { const st = get(), n = onEvent(st, e && e.detail); if (n !== st) set(n); });
    setInterval(tick, 1000);
    W.LowiTutorialAuto = Object.assign({ state: get, tick }, api);
})(typeof window !== 'undefined' ? window : null);
