/* BH-025 (Oct 25 2026): a double tap on something that opens a sheet closed it again at once. The second tap of the double tap
   landed on the sheet's backdrop, which had just slid in under the finger, and a tap on the backdrop means "close". On live
   Chromium every double tap on Community's "N here now" line flashed People open and shut (40 to 400 ms between the taps), and on
   a WebKit iPhone 13 a double tap under 90 ms did the same to Meal details. Like iOS, a backdrop now ignores real taps for its
   first 350 ms on screen. It only affects a tap that lands on the backdrop itself (a full-screen overlay right under <body>, or
   its .*-scrim layer): buttons, the card, the X and swipe-down are untouched, and a script's click still passes. */
(function (W, D) {
    'use strict';
    if (!W || !D || W.LowiFreshScrim) return;
    const MS = 350, born = new WeakMap();
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
    function guard(e) {
        if (!e.isTrusted) return;
        const b = backdrop(e.target);
        if (b && age(b) < MS) { e.preventDefault(); e.stopImmediatePropagation(); }
    }
    function start() {
        if (!D.body) return;
        try {
            new W.MutationObserver(ms => { const t = now(); for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) born.set(n, t); })
                .observe(D.body, { childList: true });
        } catch (e) {}
        W.addEventListener('click', guard, true);
    }
    if (D.body) start(); else D.addEventListener('DOMContentLoaded', start, { once: true });
    W.LowiFreshScrim = { MS, age, backdrop, guard };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
