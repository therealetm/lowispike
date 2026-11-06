/* LOWiSPIKE · the Home bubble for what is missing pulses (6 Nov 2026, design review point 2, Emmanuel).
   The Home bubble for the first open line of your companion's "What's missing" list (misty-peak.js, the order its panel shows:
   the missing lines first) pulses gently. One bubble at a time, no text, no sound. It stops as soon as that line is done (then the
   next missing line's bubble takes over, or none). Never in Calm mode (galaxy-still.js puts html.cm-on) or with reduced motion.
   The name and the % under the companion stay as they are; nothing else on Home changes.
   Which bubble: water -> Water, move -> Move, fuel and scan -> Scan (a meal is logged from Scan: Photo of your food or a typed
   name, then Log as eaten; the Einkaufen bubble is shopping, so a missing meal never pulses it). A line without a bubble (the night
   line) pulses nothing. */
(function (W) {
    'use strict';
    const BUBBLE = Object.freeze({ water: 'water', move: 'move', fuel: 'scan', scan: 'scan' });
    /* pure: the first open line of the list and the bubble it lights, or null */
    function pick(p) {
        const r = p && Array.isArray(p.rows) ? p.rows.find(x => x && !x.done) : null;
        return r && BUBBLE[r.act] ? { k: r.k, bubble: BUBBLE[r.act] } : null;
    }
    const api = { BUBBLE, pick };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (!W || !W.document || W.LowiMissingPulse) return;
    const D = W.document, H = D.documentElement;
    const reduced = () => !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const calm = () => H.classList.contains('cm-on');
    let cur = null, soon = 0, halo = null, watch = null;
    /* the glow is its own element next to the bubble in the Home ring (the bubble clips its inside and its glass is drawn from its
       box by living-bubbles.js): it takes the bubble's place variables, so it sits exactly around it and follows the ring */
    function place(t) {
        if (!halo) { halo = D.createElement('i'); halo.className = 'mp-halo'; halo.setAttribute('aria-hidden', 'true'); }
        if (halo.parentNode !== t.parentNode) t.parentNode.insertBefore(halo, t);
        ['--o8-x', '--o8-y'].forEach(k => halo.style.setProperty(k, t.style.getPropertyValue(k)));
    }
    function follow(t) {
        if (watch) { watch.disconnect(); watch = null; }
        if (!t) return;
        try { watch = new MutationObserver(() => { if (halo && cur === t) place(t); }); watch.observe(t, { attributes: true, attributeFilter: ['style'] }); } catch (e) { watch = null; }
    }
    function target() {
        if (calm() || reduced()) return null;
        let want = null; try { const P = W.LowiMistyPeak; want = P && typeof P.now === 'function' ? pick(P.now()) : null; } catch (e) { want = null; }
        return want ? D.querySelector('#whHud [data-orbit="' + want.bubble + '"]') : null;
    }
    function paint() {
        soon = 0;
        const t = target();
        D.querySelectorAll('.mp-pulse').forEach(n => { if (n !== t) n.classList.remove('mp-pulse'); });
        if (t) { t.classList.add('mp-pulse'); place(t); } else if (halo && halo.parentNode) halo.remove();
        if (t !== cur) follow(t);
        cur = t;
    }
    const schedule = () => { if (!soon) soon = setTimeout(paint, 200); };
    /* the same moments the panel repaints on, plus Calm mode and the motion setting */
    ['lowi:reward', 'lowi:state', 'lowi:water', 'lowi:meal', 'lowi:meal-logged', 'lowi:fast', 'lowi:move', 'lowi:world-mood', 'lowi:cell-state', 'lowi:calm', 'storage', 'focus'].forEach(n => W.addEventListener(n, schedule));
    D.addEventListener('visibilitychange', () => { if (!D.hidden) schedule(); });
    try { const m = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)'); if (m && m.addEventListener) m.addEventListener('change', schedule); } catch (e) { }
    /* the Home ring is drawn a little after start: look a few times then, and every 30 s (cheap: one reading, one class) */
    const boot = () => [0, 1500, 4000, 9000].forEach(t => setTimeout(schedule, t));
    setInterval(() => { if (!D.hidden) schedule(); }, 30000);
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
    W.LowiMissingPulse = Object.assign({}, api, { paint, current: () => (cur && cur.getAttribute('data-orbit')) || '' });
})(typeof window !== 'undefined' ? window : null);
