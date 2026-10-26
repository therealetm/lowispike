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
   a keyboard press (detail 0) and a script's click work at once. */
(function (W, D) {
    'use strict';
    if (!W || !D || W.LowiFreshScrim) return;
    const MS = 350, SPOT_MS = 400, SPOT_PX = 44, born = new WeakMap(), opener = new WeakMap();
    let last = null; /* the last real pointer tap: {x, y, t} */
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
        for (let n = t, i = 0; n && n.nodeType === 1 && i < 60; n = n.parentNode, i++) if (born.has(n)) return n;
        return null;
    }
    /* BH-028: a second tap on the spot of the tap that opened this overlay, while it is brand new */
    function sameSpot(e) {
        if (!(e.detail > 0)) return false;
        const ov = overlayOf(e.target), o = ov && opener.get(ov);
        if (!o) return false;
        const t = tapTime(e);
        return t - born.get(ov) < SPOT_MS && Math.abs(e.clientX - o.x) <= SPOT_PX && Math.abs(e.clientY - o.y) <= SPOT_PX;
    }
    function guard(e) {
        if (!e.isTrusted) return;
        const b = backdrop(e.target);
        if ((b && age(b) < MS) || sameSpot(e)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
        if (e.detail > 0 && typeof e.clientX === 'number') last = { x: e.clientX, y: e.clientY, t: tapTime(e) };
    }
    function start() {
        if (!D.body) return;
        try {
            new W.MutationObserver(ms => { const t = now(); const o = last && t - last.t < 600 ? last : null;
                for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { born.set(n, t); if (o) opener.set(n, o); else opener.delete(n); } })
                .observe(D.body, { childList: true });
        } catch (e) {}
        W.addEventListener('click', guard, true);
    }
    if (D.body) start(); else D.addEventListener('DOMContentLoaded', start, { once: true });
    W.LowiFreshScrim = { MS, SPOT_MS, SPOT_PX, age, backdrop, guard, sameSpot };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
