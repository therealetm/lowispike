/* LOWiSPIKE · the Home bubble for what is missing glows (6 Nov 2026, design review point 2; reworked 7 Nov 2026).
   6 Nov (Emmanuel): the Home bubble for the first open line of your companion's "What's missing" list pulses gently, one at a time,
   no text, no sound, stops when done, off in Calm mode and with reduced motion; the name and % under the companion stay.
   7 Nov (Emmanuel, screenshot of the camera with a ring round it: "why is the camera pulsating? ... It makes me feel like I have to
   click on it and then nothing happens ... It shouldn't have an extra circle pulsating the whole time. That just kills the
   symmetrical logic"): no ring outside the bubble any more, and no light on a bubble that a tap does not settle. Now:
   - only Water and Move: one tap there fixes the line (a missing meal, protein, fibre ... light nothing; the camera never glows);
   - the bubble itself glows from inside (a soft light under its glass), nothing outside it, nothing moves, the ring stays symmetric;
   - three slow breaths when you come to Home (or when the line changes), then still: never "the whole time". Again after
     REST_MS on Home, or the next time you come back to Home.
   Off in Calm mode (html.cm-on), with reduced motion, and while a bloom is open. */
(function (W) {
    'use strict';
    const BUBBLE = Object.freeze({ water: 'water', move: 'move' });
    const REST_MS = 180000;
    /* pure: the first open line of the list and the bubble that one tap there settles, or null */
    function pick(p) {
        const r = p && Array.isArray(p.rows) ? p.rows.find(x => x && !x.done) : null;
        return r && BUBBLE[r.act] ? { k: r.k, bubble: BUBBLE[r.act] } : null;
    }
    /* pure: breathe now? (a new line or bubble, or the rest is over) */
    function due(last, want, now) {
        if (!want) return false;
        if (!last || last.k !== want.k || last.bubble !== want.bubble) return true;
        return now - (last.at || 0) >= REST_MS;
    }
    const api = { BUBBLE, REST_MS, pick, due };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (!W || !W.document || W.LowiMissingPulse) return;
    const D = W.document, H = D.documentElement;
    const reduced = () => !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const calm = () => H.classList.contains('cm-on');
    const home = () => H.classList.contains('wh-home') && !H.classList.contains('hb2-open');
    let cur = null, last = null, soon = 0, wasHome = false;
    function want() {
        if (calm() || reduced()) return null;
        try { const P = W.LowiMistyPeak; return P && typeof P.now === 'function' ? pick(P.now()) : null; } catch (e) { return null; }
    }
    function clear() {
        D.querySelectorAll('.mp-glow').forEach(n => n.remove());
        D.querySelectorAll('.mp-pulse').forEach(n => n.classList.remove('mp-pulse'));
        cur = null;
    }
    function breathe(el) {
        clear();
        const g = D.createElement('i'); g.className = 'mp-glow'; g.setAttribute('aria-hidden', 'true');
        g.addEventListener('animationend', () => { if (g.parentNode) g.remove(); if (cur === el) { el.classList.remove('mp-pulse'); cur = null; } });
        el.appendChild(g); el.classList.add('mp-pulse'); cur = el;
    }
    function paint() {
        soon = 0;
        const w = want(), onHome = home(), back = onHome && !wasHome; wasHome = onHome;
        if (!w) { clear(); last = null; return; }
        const el = D.querySelector('#whHud [data-orbit="' + w.bubble + '"]');
        if (!el || !onHome) { if (cur && cur !== el) clear(); return; }
        const now = Date.now();
        if (back || due(last, w, now)) { breathe(el); last = { k: w.k, bubble: w.bubble, at: now }; }
    }
    const schedule = () => { if (!soon) soon = setTimeout(paint, 250); };
    /* the moments the list changes, Calm mode, the motion setting, and coming to Home */
    ['lowi:reward', 'lowi:state', 'lowi:water', 'lowi:meal', 'lowi:meal-logged', 'lowi:fast', 'lowi:move', 'lowi:world-mood', 'lowi:cell-state', 'lowi:calm', 'storage', 'focus'].forEach(n => W.addEventListener(n, schedule));
    D.addEventListener('visibilitychange', () => { if (!D.hidden) { wasHome = false; schedule(); } });
    try { const m = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)'); if (m && m.addEventListener) m.addEventListener('change', schedule); } catch (e) { }
    try { new MutationObserver(() => { if (home() !== wasHome) schedule(); }).observe(H, { attributes: true, attributeFilter: ['class'] }); } catch (e) { }
    const boot = () => [1500, 4000, 9000].forEach(t => setTimeout(schedule, t));
    setInterval(() => { if (!D.hidden) schedule(); }, 30000);
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
    W.LowiMissingPulse = Object.assign({}, api, { paint, current: () => (cur && cur.getAttribute('data-orbit')) || '' });
})(typeof window !== 'undefined' ? window : null);
