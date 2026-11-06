/* LOWiSPIKE · "Last meal today?" after Log as eaten (6 Nov 2026, design review point 1, Emmanuel).
   After "Log as eaten" (the scan card, and the plate photo sheet) one short question: Last meal today? / Letzte Mahlzeit heute? /
   ¿Última comida de hoy?, with "Yes, start Gap" and "Not yet". Yes does exactly what the Gap bubble's Last meal does
   (home-blooms-v2.js gap.commit('last', t): starts the gap, or moves the start of a running one), t = when the meal was eaten.
   Not yet changes nothing. The 28 Oct decoupling stays: eating never starts the Gap by itself, only this Yes or the bubble does.
   Two ways to show it: html(t) is a block inside a sheet (the photo meal's Saved sheet), ask(t) a small card over the screen
   (after the scan card, which closes with the camera). A tap outside the card is a Not yet. The after-meal checklist card waits
   until the question is answered. */
(function (W) {
    'use strict';
    if (!W || W.LowiLastMealAsk) return;
    const D = W.document;
    const li = () => { let l = ''; try { l = W.LowiLang && W.LowiLang.get ? W.LowiLang.get() : D.documentElement.lang; } catch (e) { l = ''; } l = String(l || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const T = (en, de, es) => [en, de, es][li()];
    const TX = {
        q: () => T('Last meal today?', 'Letzte Mahlzeit heute?', '¿La última comida de hoy?'),
        yes: () => T('Yes, start Gap', 'Ja, Gap starten', 'Sí, iniciar Gap'),
        no: () => T('Not yet', 'Noch nicht', 'Todavía no')
    };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    /* the Gap bubble's own Last meal, or nothing when it is not there (then the question is never asked) */
    const gap = () => { const B = W.LowiHomeBloomsV2; return B && B.gap && typeof B.gap.commit === 'function' ? B.gap : null; };
    const when = t => { const n = Date.now(); t = +t || n; return t > n ? n : t; };
    let card = null, n = 0;
    function html(t) {
        if (!gap()) return '';
        const id = 'lmaQ' + (++n);
        return '<div class="lma" role="group" aria-labelledby="' + id + '" data-lma-t="' + when(t) + '"><b class="lma-q" id="' + id + '">' + esc(TX.q()) + '</b>' +
            '<div class="lma-acts"><button type="button" class="lma-yes" data-lma="yes">' + esc(TX.yes()) + '</button>' +
            '<button type="button" class="lma-no" data-lma="no">' + esc(TX.no()) + '</button></div></div>';
    }
    function close() {
        const c = card; card = null;
        if (!c) return;
        D.removeEventListener('pointerdown', outside, true);
        c.classList.remove('in', 'on'); c.classList.add('out');
        const reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setTimeout(() => { try { c.remove(); } catch (e) { } }, reduce ? 0 : 240);
    }
    function outside(e) { if (card && !(e.target && card.contains(e.target))) close(); }
    function ask(t) {
        const h = html(t); if (!h) return false;
        close();
        /* "on" + role dialog: the after-meal checklist card (after-meal-checklist.js blocker()) waits while the question is open and
           comes back when it is answered, so the two never sit on top of each other */
        const c = D.createElement('div'); c.className = 'lma-card on'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'false');
        c.innerHTML = h; D.body.appendChild(c); card = c;
        c.setAttribute('aria-labelledby', c.querySelector('.lma-q').id);
        requestAnimationFrame(() => { if (card === c) c.classList.add('in'); });
        setTimeout(() => { if (card === c) D.addEventListener('pointerdown', outside, true); }, 0);
        try { c.querySelector('.lma-yes').focus({ preventScroll: true }); } catch (e) { }
        return true;
    }
    /* one answer per question; the block goes away either way, the bubble's own line says the Gap started */
    function answer(b) {
        const box = b.closest('.lma'); if (!box || box.__done) return;
        box.__done = true;
        const yes = b.getAttribute('data-lma') === 'yes', t = +box.getAttribute('data-lma-t') || Date.now();
        if (card && card.contains(box)) close(); else box.remove();
        if (!yes) return;
        const g = gap(); if (!g) return;
        try { g.commit('last', when(t)); } catch (e) { }
    }
    D.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-lma]'); if (b) { e.preventDefault(); answer(b); } });
    D.addEventListener('keydown', e => { if (card && e.key === 'Escape') close(); });
    W.LowiLastMealAsk = { html, ask, close, isOpen: () => !!card, _tx: TX };
})(typeof window !== 'undefined' ? window : null);
