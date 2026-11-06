/* LOWiSPIKE · the hold ring on Home (6 Nov 2026, design review point 3, Emmanuel).
   On every Home bubble that does something on a long press, a thin ring fills around it while you hold, in a hologram look (a cyan to
   violet line with a soft glow), so you see the hold coming. It is only a picture: the bubbles' own code still decides what a hold
   does, and a tap stays a tap. The ring fills in exactly that bubble's hold time, and goes when the finger lifts, slides off (more than
   12 px, the same slop the holds use), a second finger lands or the page hides. With reduced motion it does not fill: a still ring
   shows while you hold. The bubbles and their times (kept equal to their code, tests/design-review-3.test.cjs checks it):
     water    600 ms  world-home.js (a hold takes back the last glass)
     move     550 ms  home-blooms-v2.js HOLD_MS (Move's full page)
     gap      550 ms  home-blooms-v2.js HOLD_MS (what happens in the body after a meal)
     settings 480 ms  home-settings-sleep-v2.js HOLD_MS (Community: profile and settings) */
(function (W) {
    'use strict';
    const HOLDS = Object.freeze({ water: 600, move: 550, gap: 550, settings: 480 });
    const SLOP = 12;
    /* pure: the ring's size and its circle for a bubble of diameter d (a thin line just outside the bubble) */
    function geom(d) { const size = Math.round(d + 16), r = d / 2 + 4; return { size, r, c: +(2 * Math.PI * r).toFixed(2) }; }
    const api = { HOLDS, SLOP, geom };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (!W || !W.document || W.LowiHoldRing) return;
    const D = W.document, H = D.documentElement, NS = 'http://www.w3.org/2000/svg';
    const reduced = () => !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let cur = null, n = 0;
    function bubbleOf(t) {
        const el = t && t.closest ? t.closest('#whHud [data-orbit], #spHome [data-orbit]') : null;
        return el && HOLDS[el.getAttribute('data-orbit')] ? el : null;
    }
    function ringFor(el, ms) {
        const r0 = el.getBoundingClientRect(), d = Math.min(r0.width, r0.height); if (d < 20) return null;
        const g = geom(d), id = 'hrG' + (++n), half = g.size / 2;
        const box = D.createElement('div'); box.className = 'hr-ring' + (reduced() ? ' hr-still' : ''); box.setAttribute('aria-hidden', 'true');
        box.style.left = Math.round(r0.left + r0.width / 2 - half) + 'px'; box.style.top = Math.round(r0.top + r0.height / 2 - half) + 'px';
        box.style.width = box.style.height = g.size + 'px';
        box.innerHTML = '<svg xmlns="' + NS + '" viewBox="0 0 ' + g.size + ' ' + g.size + '"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#8ff3ff"/><stop offset=".55" stop-color="#c7a6ff"/><stop offset="1" stop-color="#8ff3ff"/></linearGradient></defs>' +
            '<circle class="hr-track" cx="' + half + '" cy="' + half + '" r="' + g.r + '"/>' +
            '<circle class="hr-fill" cx="' + half + '" cy="' + half + '" r="' + g.r + '" stroke="url(#' + id + ')" stroke-dasharray="' + g.c + '" stroke-dashoffset="' + g.c + '"/></svg>';
        D.body.appendChild(box);
        const fill = box.querySelector('.hr-fill');
        if (!reduced()) {
            fill.style.transition = 'stroke-dashoffset ' + ms + 'ms linear';
            void fill.getBoundingClientRect();
            requestAnimationFrame(() => { if (fill.isConnected) fill.setAttribute('stroke-dashoffset', '0'); });
        } else fill.setAttribute('stroke-dashoffset', '0');
        requestAnimationFrame(() => box.classList.add('on'));
        return box;
    }
    function end(done) {
        const c = cur; cur = null; if (!c) return;
        clearTimeout(c.t);
        const box = c.box; if (!box) return;
        if (done) box.classList.add('done');
        box.classList.remove('on');
        setTimeout(() => { try { box.remove(); } catch (e) { } }, done ? 360 : 160);
    }
    function onDown(e) {
        if (e.isPrimary === false) { end(false); return; }
        if (cur) end(false);
        if ((e.button && e.button !== 0) || !H.classList.contains('wh-home')) return;
        const el = bubbleOf(e.target); if (!el) return;
        const ms = HOLDS[el.getAttribute('data-orbit')], box = ringFor(el, ms); if (!box) return;
        cur = { el, box, x: e.clientX, y: e.clientY, t: setTimeout(() => end(true), ms) };
    }
    function onMove(e) { if (cur && Math.hypot(e.clientX - cur.x, e.clientY - cur.y) > SLOP) end(false); }
    W.addEventListener('pointerdown', onDown, { capture: true, passive: true });
    W.addEventListener('pointermove', onMove, { capture: true, passive: true });
    ['pointerup', 'pointercancel', 'blur'].forEach(t => W.addEventListener(t, () => { if (cur) end(false); }, { capture: true, passive: true }));
    D.addEventListener('visibilitychange', () => { if (D.hidden) end(false); });
    W.LowiHoldRing = Object.assign({}, api, { active: () => (cur && cur.el.getAttribute('data-orbit')) || '' });
})(typeof window !== 'undefined' ? window : null);
