/* misty-bloom.js — Oct 17 2026 (Eman, with screenshots: "ich möchte alles in dem Stil von Move").
   What he likes is what happens when you TAP Move on Home: the choices bloom out of the bubble you touched as
   round membrane orbs, over a light veil, and fold back into it when you're done. Meals, Fasting, Weather,
   Body sound, Today and the bubble lists instead slid up from the bottom like a wardrobe drawer.
   This module gives those panels the same gesture: each one now grows out of the exact spot your finger
   touched (a small round bubble that stretches into the panel), and shrinks back into it on close.
   The look (membrane surface, orb choices, staggered pop) lives in misty-bloom.css.
   API: LowiBloom.wants(el, opts) -> bool, prep(el) (measure + aim at the finger), open(el), close(el, done) -> bool. */
(function () {
    'use strict';
    const W = window, D = document;
    if (W.LowiBloom) return;
    const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const now = () => (W.performance && performance.now) ? performance.now() : Date.now();

    /* 1. where the finger was: the centre of the control it touched (a bubble, a pill, a button) */
    let last = null;
    const SRC = 'button,[role="button"],a,summary,.wh-cell,[data-hb],[data-wh],.sp-weather,#spFast,.fe-bub,.wa-btn,.tb-wx';
    function note(e) {
        const t = e.target && e.target.closest ? e.target.closest(SRC) : null;
        if (!t) return;
        const r = t.getBoundingClientRect();
        if (!r.width && !r.height) return;
        last = { x: r.left + r.width / 2, y: r.top + r.height / 2, t: now() };
    }
    D.addEventListener('pointerdown', note, true);
    D.addEventListener('click', note, true);
    function origin() {
        if (last && now() - last.t < 1600) return last;
        /* opened without a tap (deep link, keyboard shortcut): bloom from the bottom centre, where Misty's dock is */
        return { x: (W.innerWidth || 390) / 2, y: (W.innerHeight || 844) - 60 };
    }

    /* 2. which panels bloom: the ones that open from Home's bubbles and pills */
    function wants(el, opts) {
        if (!el) return false;
        opts = opts || {};
        if (opts.full) return false;
        const cls = String(opts.cls || '');
        if (el.classList && el.classList.contains('r2-sh')) {
            /* Meals (log + photo + logged) and the Move / Meals bubble lists */
            return /(^|\s)(sp-sheet|wm-sheet-ov)(\s|$)/.test(cls) || !!el.querySelector('.sp-quick-log,.wm-sheet');
        }
        if (el.id === 'sheet') return !!el.querySelector('.fst-sh');
        return el.id === 'whToday' || el.classList.contains('tbw-sheet') || el.classList.contains('wa-panel');
    }

    /* 3. aim: centre of the panel -> the finger, in px (the CSS keyframes start the panel there, small and round) */
    function prep(el) {
        if (!el) return false;
        if (!wants(el, { cls: el.parentNode && el.parentNode.className })) { el.classList.remove('mb-on', 'mb-in', 'mb-out'); return false; }
        el.classList.add('mb-on', 'mb-measure');
        el.classList.remove('mb-out');
        const r = el.getBoundingClientRect();
        el.classList.remove('mb-measure');
        const o = origin();
        const dx = Math.round(o.x - (r.left + r.width / 2)), dy = Math.round(o.y - (r.top + r.height / 2));
        el.style.setProperty('--mb-dx', dx + 'px');
        el.style.setProperty('--mb-dy', dy + 'px');
        return true;
    }
    function open(el) {
        if (!prep(el)) return false;
        el.classList.remove('mb-in');
        void el.offsetWidth;
        el.classList.add('mb-in');
        return true;
    }
    /* fold back into the bubble it came from; done() runs once it is gone (at once with reduced motion) */
    function close(el, done) {
        if (!el || !el.classList.contains('mb-on')) return false;
        el.classList.remove('mb-in');
        el.classList.add('mb-out');
        let fired = false;
        const fin = () => { if (fired) return; fired = true; if (typeof done === 'function') done(); };
        if (reduced()) { fin(); return true; }
        el.addEventListener('animationend', e => { if (e.target === el) fin(); });
        setTimeout(fin, 320);
        return true;
    }

    W.LowiBloom = { wants, prep, open, close, origin, _note: note };
})();
