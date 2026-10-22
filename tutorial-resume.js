/* LOWiSPIKE "Continue tutorial" button (22 Oct 2026, MAYA-HANDOFF item 40).
   Emmanuel: "sometimes the user tries out the gesture the voice over said but then it's not clear how they get back to the
   tutorial. So make the tutorial button stay always when they new until they skip all or finish."
   Whenever a tour is unfinished and its card is not on screen (a try-it gesture opened a sheet, the scanner or another
   screen; the card was dismissed with back-swipe / Escape; the app was reloaded), a small floating glass pill stays on
   screen. Tapping it closes the sheet that hid the card (the same Escape back-swipe sends) or starts the tour again on the
   card they left, or the next one when that card was already done (tried, or read to the end hands-free). The tour's own
   hold already pauses the voice; the voice reads the card again when it comes back. Gone for good after the last card or
   Skip all. State lives in the tutorial's own storage (lowi.tutorial.v1 .resume), so it survives reloads.
   Placement: it tries a few corners and takes the first where nothing tappable sits under it (tab bar, bubbles, Scan,
   chat input, buttons), full pill first, then the 44 pt round icon. Loaded by tutorial.js like tutorial-auto.js. */
(function () {
    'use strict';
    const KEY = 'lowi.tutorial.v1';
    /* tour holds where the pill would be wrong: account setup, Misty's flight, the companion claim sheet */
    const QUIET_HOLDS = ['setup', 'flight', 'claim'];
    const TXT = {
        en: { label: 'Continue tutorial', aria: 'Continue the tutorial where you left it' },
        de: { label: 'Tutorial fortsetzen', aria: 'Tutorial dort fortsetzen, wo du aufgehört hast' },
        es: { label: 'Continuar tutorial', aria: 'Continuar el tutorial donde lo dejaste' }
    };
    function txt(l) { return TXT[l] || TXT.en; }

    /* pure: the tutorial's 'lowi:tutorial' event -> new stored state. ids = step ids of the running tour (may be empty). */
    function onEvent(st, d, ids, now) {
        st = Object.assign({}, st || {});
        d = d || {};
        if (!d.on) {
            if (d.reason === 'finished' || d.reason === 'skipped') { st.resume = null; st.ended = d.reason; }
            return st;  /* 'left' (Escape / back-swipe), 'restart', a reload: the place is kept */
        }
        if (!d.step) return st;
        const prev = st.resume && typeof st.resume === 'object' ? st.resume : null;
        const list = Array.isArray(ids) ? ids : [];
        const i = list.indexOf(d.step);
        const same = !!(prev && prev.at === d.step);
        const fin = (same && !!prev.fin && !d.how) || !!d.tried || !!d.auto;
        st.resume = { at: d.step, i: i >= 0 ? i : (same ? prev.i : -1), n: list.length || (prev && prev.n) || 0,
            next: i >= 0 ? (list[i + 1] || '') : (same ? prev.next || '' : ''), fin, t: now || Date.now() };
        st.ended = '';
        return st;
    }
    /* pure: is there an unfinished tour to continue? */
    function active(st) { return !!(st && st.resume && typeof st.resume === 'object' && st.resume.at && !st.done); }
    /* pure: which card the button opens */
    function resumeAt(st) {
        if (!active(st)) return '';
        const r = st.resume;
        return r.fin && r.next ? r.next : r.at;
    }
    /* pure: show the pill? on = tour running, heldWhy = why it is hidden ('' = card on screen) */
    function shouldShow(o) {
        o = o || {};
        if (!o.active || o.setup || o.pending) return false;
        if (!o.on) return true;
        return !!o.heldWhy && QUIET_HOLDS.indexOf(o.heldWhy) < 0;
    }
    /* pure: the first spot with nothing tappable under it; spots = [{id, hits}] in preference order */
    function pick(spots) {
        for (const s of spots) if (!s.hits) return s.id;
        let best = null;
        for (const s of spots) if (!best || s.hits < best.hits) best = s;
        return best ? best.id : '';
    }
    const SPOTS = ['tr', 'tl', 'br', 'bl', 'mr', 'ml'];
    const core = { KEY, TXT, txt, onEvent, active, resumeAt, shouldShow, pick, SPOTS, QUIET_HOLDS };
    if (typeof module !== 'undefined' && module.exports) module.exports = core;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.LowiTutorialResume) return;

    const W = window, D = document;
    const store = {
        get() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } },
        set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } }
    };
    function lang() {
        const l = (W.LowiLang && W.LowiLang.current && W.LowiLang.current()) || D.documentElement.lang || 'en';
        return /^de/i.test(l) ? 'de' : /^es/i.test(l) ? 'es' : 'en';
    }
    function build() { const m = D.querySelector('meta[name="lowi-build"]'); return (m && m.content) || '1'; }
    function T() { return W.LowiTutorial; }
    function ids() { const t = T(); try { return t && t.ids ? t.ids() : []; } catch (e) { return []; } }

    W.addEventListener('lowi:tutorial', e => { store.set(onEvent(store.get(), e.detail || {}, ids())); if (e.detail && e.detail.on) pendingUntil = 0; tick(); });

    let btn = null, spot = '', compact = false, pendingUntil = 0, shown = false, lastLang = '', lastFace = '';
    const SVG_PLAY = '<svg class="ltr-play" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3.6 2.2v7.6L9.8 6z" fill="currentColor"/></svg>';
    function face() {
        /* the user's own companion (Misty until they have one), like the tutorial card's speaker */
        try { const B = W.LowiBirthCompanion; if (B && B.svg) return B.svg(null, { size: 30 }) || ''; } catch (e) { }
        return '';
    }
    function make() {
        if (!D.getElementById('ltrCss')) { const l = D.createElement('link'); l.id = 'ltrCss'; l.rel = 'stylesheet'; l.href = 'tutorial-resume.css?v=' + encodeURIComponent(build()); D.head.appendChild(l); }
        btn = D.createElement('button');
        btn.type = 'button'; btn.id = 'ltResume'; btn.className = 'ltr-fab'; btn.hidden = true;
        btn.innerHTML = '<span class="ltr-ic"><span class="ltr-face"></span>' + SVG_PLAY + '</span><span class="ltr-lbl"></span>';
        btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); resume(); });
        D.body.appendChild(btn);
    }
    function label() {
        const l = lang();
        if (l !== lastLang) { lastLang = l; const t = txt(l); btn.querySelector('.ltr-lbl').textContent = t.label; btn.setAttribute('aria-label', t.aria); btn.title = t.label; }
        const f = face();
        if (f !== lastFace) { lastFace = f; const el = btn.querySelector('.ltr-face'); el.innerHTML = f; btn.classList.toggle('ltr-hasface', !!f); }
    }
    function heldWhy() {
        const r = D.getElementById('ltTour');
        if (!r) return '';
        return r.classList.contains('lt-held') ? (r.getAttribute('data-held') || 'held') : '';
    }
    function setupUp() {
        const t = T();
        try { if (t && t.busyBy && t.busyBy() === 'setup') return true; } catch (e) { }
        return false;
    }
    /* the top sheet that hides the card: same Escape back-swipe.js sends (every sheet closes on Escape) */
    function closeTop() {
        const t = T();
        let why = '';
        try { why = t && t.busyBy ? t.busyBy() : ''; } catch (e) { }
        if (!why || why === 'setup' || why === 'flight') return false;
        const dialogs = Array.from(D.querySelectorAll('[aria-modal="true"]')).filter(d => !d.closest('#ltTour') && d.getClientRects().length);
        const target = dialogs.length ? dialogs[dialogs.length - 1] : D;
        try { target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true })); } catch (e) { }
        return true;
    }
    function resume() {
        const t = T();
        if (!t) return;
        const st = store.get();
        const closed = closeTop();
        pendingUntil = Date.now() + 1500;
        hide();
        if (t.isOn()) return;  /* held: the card comes back by itself once the sheet is gone (tutorial.js unhold) */
        const at = resumeAt(st);
        try { t.start({ from: 'resume', at: at || undefined }); } catch (e) { }
        if (closed) pendingUntil = Date.now() + 1500;
    }
    function hide() { if (btn && shown) { btn.hidden = true; btn.classList.remove('ltr-on'); shown = false; } }
    /* tappable things the pill must never cover */
    const TAPPABLE = 'button, a[href], input, textarea, select, label, summary, [role="button"], [role="tab"], [role="link"], [role="slider"], [role="switch"], [role="option"], [contenteditable="true"], [contenteditable=""], [onclick], [tabindex]:not([tabindex="-1"]), .lb-bub, .wh-cell, #tabbar';
    function box() {  /* layout box: the fade-in scales it for 0.28 s */
        const r = btn.getBoundingClientRect(), w = btn.offsetWidth || r.width, h = btn.offsetHeight || r.height;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        return { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2, width: w, height: h };
    }
    function hitsAt(r) {
        let n = 0;
        /* a 12 px grid: small icon buttons (24 px and up) cannot slip between the samples */
        const grid = (a, b) => { const out = [], k = Math.max(2, Math.ceil((b - a - 4) / 12)); for (let j = 0; j <= k; j++) out.push(a + 2 + (b - a - 4) * j / k); return out; };
        const xs = grid(r.left, r.right), ys = grid(r.top, r.bottom);
        for (const x of xs) for (const y of ys) {
            if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) { n += 1; continue; }
            const stack = D.elementsFromPoint(x, y);
            const top = stack.find(el => el !== btn && !btn.contains(el));
            if (top && top !== D.body && top !== D.documentElement && top.closest(TAPPABLE)) n += 1;
        }
        return n;
    }
    function barGap() {
        const tb = D.getElementById('tabbar');
        if (!tb || !tb.getClientRects().length) return 0;
        const cs = getComputedStyle(tb);
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .1) return 0;
        const r = tb.getBoundingClientRect();
        return r.top < innerHeight && r.bottom > innerHeight - 4 ? Math.max(0, innerHeight - r.top) : 0;
    }
    function place(force) {
        btn.style.setProperty('--ltr-bar', barGap() + 'px');
        if (!force && spot && !hitsAt(box())) return;
        const tries = [];
        const test = id => { apply(id); const h = hitsAt(box()); tries.push({ id, hits: h }); return !h; };
        let done = false;
        /* the full pill in the corners and at the sides, then the 44 pt round icon there */
        for (const c of ['', ':c']) { for (const s of SPOTS) if (test(s + c)) { done = true; break; } if (done) break; }
        /* busy screens (a chat room: tabs on top, the input at the bottom): slide the round icon down each edge to a gap */
        if (!done) {
            apply('tr:c'); const y0 = Math.round(box().top);
            apply('br:c'); const y1 = Math.round(box().top);
            for (const e of ['er', 'el']) { for (let y = y0; y <= y1; y += 22) if (test(e + '@' + y)) { done = true; break; } if (done) break; }
        }
        const best = pick(tries) || 'tr';
        apply(best);
        spot = best;
        btn.setAttribute('data-spot', best);
    }
    function apply(id) {
        const m = /^(\w\w)(?:@(\d+))?(:c)?$/.exec(id) || [];
        const s = m[1] || 'tr', y = m[2], c = !!m[3] || !!y;
        compact = c;
        btn.className = 'ltr-fab ltr-on ltr-' + s + (c ? ' ltr-compact' : '') + (lastFace ? ' ltr-hasface' : '');
        btn.style.top = y ? y + 'px' : '';
    }
    function tick() {
        const t = T();
        if (!t || !D.body) return;
        const st = store.get();
        const show = shouldShow({ active: active(st), on: t.isOn(), heldWhy: heldWhy(), setup: setupUp(), pending: Date.now() < pendingUntil });
        if (!show) { hide(); return; }
        if (!btn) make();
        label();
        if (!shown) { btn.hidden = false; shown = true; spot = ''; place(true); }
        else place(false);
    }
    setInterval(tick, 700);
    W.addEventListener('resize', () => { if (shown) place(true); });
    D.addEventListener('visibilitychange', tick);
    /* screens change on a tap: look again right after it, so the pill never sits on a button that just slid in */
    const soon = () => { if (!shown) return; setTimeout(() => { if (shown) place(false); }, 260); setTimeout(() => { if (shown) place(false); }, 900); };
    D.addEventListener('click', soon, true);
    W.addEventListener('hashchange', soon); W.addEventListener('popstate', soon);
    W.LowiTutorialResume = Object.assign({}, core, {
        state: () => store.get(), visible: () => shown, spot: () => (btn && btn.getAttribute('data-spot')) || '', tick, resume,
        /* tutorial-auto.js asks this before its one-time "Pick up the tour?" card: the pill already offers it */
        covers: () => active(store.get())
    });
    tick();
})();
