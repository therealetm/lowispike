/* BH-025 (Oct 25 2026): a double tap on something that opens a sheet closed it again at once. The second tap of the double tap
   landed on the sheet's backdrop, which had just slid in under the finger, and a tap on the backdrop means "close". On live
   Chromium every double tap on Community's "N here now" line flashed People open and shut (40 to 400 ms between the taps), and on
   a WebKit iPhone 13 a double tap under 90 ms did the same to Meal details. Like iOS, a backdrop now ignores real taps for its
   first 350 ms on screen. It only affects a tap that lands on the backdrop itself (a full-screen overlay right under <body>, or
   its .*-scrim layer): buttons, the card, the X and swipe-down are untouched, and a script's click still passes.
   BH-028 (Oct 26 2026): the same double tap also pressed whatever BUTTON the new sheet put right under the finger. With Reduce
   Motion a sheet is at rest from its first frame, and on a live WebKit iPhone 13 a double tap on Log meal's "Snack" tile hit the
   Snack sheet's "Snap" 27 ms later: the sheet vanished and the photo picker opened. So for its first 400 ms a new overlay also
   ignores a real tap that lands within 44 px of the tap that opened it (the double tap's spot). A tap anywhere else on the sheet,
   a keyboard press (detail 0) and a script's click work at once.
   BH-032 (Oct 26 2026): a tab is not a new overlay (goTab shows an old <section> again), so a double tap that switched tabs still
   pressed what the new tab put under the finger. Live WebKit iPhone 13: a double tap on "Misty is number 25 worldwide" in her card
   switched to Community, the galaxy showed before Ranking, and the 2nd tap picked a companion ("Talking to Marco"): the chat box
   then said "Write to Marco". mark(el) gives a pane that is shown again the same same-spot rule; goTab and Community's showView
   call it.
   BH-033 (Oct 26 2026): the mirror case. A tap that makes a choice and closes what it was on (a bloom orb) uncovers what lies
   under the finger at once, so the 2nd tap of a double tap pressed that. Live WebKit iPhone 13: a double tap on Move's "Steady"
   logged Steady, the bloom folded, and the 2nd tap landed on the Move bubble and opened the Move bloom again 239 ms later.
   spent(e) marks such a tap; for SPOT_MS a real tap within SPOT_PX of it is swallowed (quiet).
   BH-040 (Oct 26 2026): the same for taps that only CLOSE something. Each module had to call spent() on its own X, so most never
   did. A seeded double-tap monkey on a WebKit iPhone 13 (mock cloud) found the 2nd tap reaching the page under the finger after a
   close: the bottom X (#whX) 173 ms later focused Community's chat box ("Write to Paul", keyboard up), and Move's backdrop 222 ms
   later pressed the companion's world bubble. Now every real tap on a dismiss control (an X / close button by its data-* or
   class name, or a *-scrim backdrop) is spent here, once, for the whole app. */
(function (W, D) {
    'use strict';
    if (!W || !D || W.LowiFreshScrim) return;
    const MS = 350, SPOT_MS = 400, SPOT_PX = 44, born = new WeakMap(), opener = new WeakMap(), shown = new WeakMap();
    let last = null; /* the last real pointer tap: {x, y, t} */
    let spentAt = null; /* BH-033: the last real tap that made a choice and closed what it was on: {x, y, t} */
    const now = () => (W.performance && W.performance.now ? W.performance.now() : Date.now());
    const age = n => { const t = born.get(n); return t == null ? Infinity : now() - t; };
    const isScrim = el => /(^|[\s-])scrim(\s|$)/.test(typeof el.className === 'string' ? el.className : '');
    function covers(el) {
        try {
            const r = el.getBoundingClientRect(), vw = W.innerWidth || 0, vh = W.innerHeight || 0;
            return r.width >= vw * 0.9 && r.height >= vh * 0.9;
        } catch (e) { return false; }
    }
    /* the overlay a tap on `t` would close, or null when `t` is not a backdrop */
    function backdrop(t) {
        if (!t || t.nodeType !== 1 || !D.body) return null;
        if (t.parentNode === D.body) return covers(t) ? t : null;
        const p = t.parentNode;
        if (p && p.parentNode === D.body && isScrim(t)) return p;
        return null;
    }
    /* when the finger touched: the event's own time stamp (same clock as performance.now), else now */
    const tapTime = e => { const n = now(), t = e && +e.timeStamp; return t > 0 && t <= n + 50 && n - t < 10000 ? t : n; };
    /* the overlay (a node added straight under <body>, even if it was moved later) that holds `t`, or null */
    function overlayOf(t) {
        for (let n = t, i = 0; n && n.nodeType === 1 && i < 60; n = n.parentNode, i++) if (born.has(n) || shown.has(n)) return n;
        return null;
    }
    /* BH-028: a second tap on the spot of the tap that opened this overlay, while it is brand new */
    function sameSpot(e) {
        if (!(e.detail > 0)) return false;
        const ov = overlayOf(e.target), o = ov && opener.get(ov);
        if (!o) return false;
        const t = tapTime(e), b = Math.max(born.has(ov) ? born.get(ov) : -Infinity, shown.has(ov) ? shown.get(ov) : -Infinity);
        return t - b < SPOT_MS && Math.abs(e.clientX - o.x) <= SPOT_PX && Math.abs(e.clientY - o.y) <= SPOT_PX;
    }
    /* BH-040: a control whose tap only closes something: the X / close buttons (by data-* or by class name: xbtn, *-x, *-cx,
       *-close) and *-scrim backdrops. What lies under it shows the moment it closes. */
    const CLOSE_SEL = '[data-r2="close"],[data-act="close-sheet"],[data-sp="close"],[data-hb2="close"],[data-chat="close-thread"],#whX';
    const CLOSE_CLS = /(^|\s)([a-z0-9]+-)*(x|cx|close|xbtn)(\s|$)/;
    function dismissing(t) {
        if (!t || t.nodeType !== 1 || !t.closest) return false;
        const c = t.closest('button,[role="button"],a');
        const el = c || t, cls = typeof el.className === 'string' ? el.className : '';
        try { if (c && c.matches(CLOSE_SEL)) return true; } catch (e) {}
        return !!c && CLOSE_CLS.test(cls) || isScrim(el);
    }
    function guard(e) {
        if (!e.isTrusted) return;
        const b = backdrop(e.target);
        if ((b && age(b) < MS) || sameSpot(e) || quiet(e)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
        if (e.detail > 0 && typeof e.clientX === 'number') { last = { x: e.clientX, y: e.clientY, t: tapTime(e) }; if (dismissing(e.target)) spent(e); }
    }
    /* BH-032: a pane shown again (a tab, a Community view) right after a real tap: same-spot guard like a new overlay. Only the
       spot rule applies (shown is not born, so a pane is never treated as a backdrop). */
    function mark(el) {
        if (!el || el.nodeType !== 1) return;
        const t = now(), o = last && t - last.t < 600 ? last : null;
        shown.set(el, t); if (o) opener.set(el, o); else opener.delete(el);
    }
    /* BH-033: a real tap that made a choice and closed its bloom / chooser; keyboard and script clicks have no finger to protect */
    function spent(e) {
        if (!e || !e.isTrusted || !(e.detail > 0) || typeof e.clientX !== 'number') return;
        spentAt = { x: e.clientX, y: e.clientY, t: tapTime(e) };
    }
    /* the 2nd tap of that double tap: a later real tap on the same spot within SPOT_MS (by its own time stamp) */
    function quiet(e) {
        if (!spentAt || !e || !e.isTrusted || !(e.detail > 0) || typeof e.clientX !== 'number') return false;
        const d = tapTime(e) - spentAt.t;
        return d > 0 && d < SPOT_MS && Math.abs(e.clientX - spentAt.x) <= SPOT_PX && Math.abs(e.clientY - spentAt.y) <= SPOT_PX;
    }
    /* BH-039: a swallowed 2nd tap must not focus a field either. Focus comes with mousedown, before the click is swallowed, so the
       keyboard still came up on iPhone (camera's barcode / name field). Same rules as the click; only fields, nothing else changes. */
    function guardDown(e) {
        if (!e || !e.isTrusted || !(e.detail > 0) || typeof e.clientX !== 'number') return;
        const f = e.target && e.target.closest && e.target.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"]');
        if (f && (sameSpot(e) || quiet(e))) e.preventDefault();
    }
    function start() {
        if (!D.body) return;
        try {
            new W.MutationObserver(ms => { const t = now(); const o = last && t - last.t < 600 ? last : null;
                for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { born.set(n, t); if (o) opener.set(n, o); else opener.delete(n); } })
                .observe(D.body, { childList: true });
        } catch (e) {}
        W.addEventListener('click', guard, true);
        W.addEventListener('mousedown', guardDown, true);
    }
    if (D.body) start(); else D.addEventListener('DOMContentLoaded', start, { once: true });
    W.LowiFreshScrim = { MS, SPOT_MS, SPOT_PX, age, backdrop, guard, guardDown, sameSpot, mark, spent, quiet, dismissing };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
