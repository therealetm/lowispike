/* misty-bloom.js — Oct 17 2026 (Eman, with screenshots: "ich möchte alles in dem Stil von Move").
   What he likes is what happens when you TAP Move on Home: the choices bloom out of the bubble you touched as
   round membrane orbs, over a light veil, and fold back into it when you're done. Meals, Fasting, Weather,
   Body sound, Today and the bubble lists instead slid up from the bottom like a wardrobe drawer.
   This module gives those panels the same gesture: each one now grows out of the exact spot your finger
   touched (a small round bubble that stretches into the panel), and shrinks back into it on close.
   The look (membrane surface, orb choices, staggered pop) lives in misty-bloom.css.
   API: LowiBloom.wants(el, opts) -> bool, prep(el) (measure + aim at the finger), open(el), close(el, done) -> bool. */
/* Oct 18 (E-man, iPad: "Move keeps moving into the middle ... and Meals also"): from 700px up every panel is centred,
   and on iPad / desktop the centre is where Misty is, so the Meals panel (and the Move / Meals lists) covered her.
   dockSpot() puts a panel opened from the Meals or Move bubble beside Misty instead: on the side that gives the panel the
   most room, leaning to the bubble's own side, near the bubble, never over her. Phones (< 700px) keep the floating sheet.
   Pure, tested in tests/bloom-anchor.test.cjs.
   g: {vw, vh, top, margin, gap, misty {l, t, r, b}, bub {x, y}, want (widest panel), minW, minH, natH(w) -> natural height} */
(function (root) {
    'use strict';
    function dockSpot(g) {
        g = Object.assign({ top: 10, margin: 10, gap: 12, want: 480, minW: 340, minH: 320 }, g);
        const m = g.misty, mg = g.margin, top = Math.max(mg, g.top), want = Math.min(g.want, g.vw - 2 * mg);
        const mx = (m.l + m.r) / 2, my = (m.t + m.b) / 2, ox = g.bub.x - mx, oy = g.bub.y - my, on = Math.hypot(ox, oy) || 1;
        const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        const sides = [
            { side: 'left', nx: -1, ny: 0, aw: m.l - g.gap - mg, ah: g.vh - mg - top },
            { side: 'right', nx: 1, ny: 0, aw: g.vw - mg - (m.r + g.gap), ah: g.vh - mg - top },
            { side: 'above', nx: 0, ny: -1, aw: g.vw - 2 * mg, ah: m.t - g.gap - top },
            { side: 'below', nx: 0, ny: 1, aw: g.vw - 2 * mg, ah: g.vh - mg - (m.b + g.gap) }
        ];
        let best = null;
        for (const c of sides) {
            const w = Math.floor(Math.min(want, c.aw));
            if (w < g.minW || c.ah < g.minH) continue;
            const nat = Math.max(1, +g.natH(w) || 1), h = Math.floor(Math.min(nat, c.ah));
            const score = (w / want) * (h / nat) + 0.1 * (c.nx * ox + c.ny * oy) / on;
            if (best && score <= best.score) continue;
            let l, t;
            if (c.side === 'left') { l = m.l - g.gap - w; t = cl(g.bub.y - h / 2, top, g.vh - mg - h); }
            else if (c.side === 'right') { l = m.r + g.gap; t = cl(g.bub.y - h / 2, top, g.vh - mg - h); }
            else if (c.side === 'above') { l = cl(g.bub.x - w / 2, mg, g.vw - mg - w); t = m.t - g.gap - h; }
            else { l = cl(g.bub.x - w / 2, mg, g.vw - mg - w); t = m.b + g.gap; }
            best = { side: c.side, l: Math.round(l), t: Math.round(t), w, h, score };
        }
        return best;
    }
    const API = { dockSpot };
    if (typeof module === 'object' && module.exports) module.exports = API;
    if (root) root.LowiBloomDock = API;
})(typeof window !== 'undefined' ? window : null);

(function () {
    'use strict';
    if (typeof window === 'undefined') return;
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
        last = { x: r.left + r.width / 2, y: r.top + r.height / 2, t: now(), el: t };
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
        dock(el);
        const r = el.getBoundingClientRect();
        el.classList.remove('mb-measure');
        const o = origin();
        const dx = Math.round(o.x - (r.left + r.width / 2)), dy = Math.round(o.y - (r.top + r.height / 2));
        el.style.setProperty('--mb-dx', dx + 'px');
        el.style.setProperty('--mb-dy', dy + 'px');
        return true;
    }
    /* 3b. iPad / desktop: a panel from the Meals or Move bubble opens beside Misty, near its bubble (dockSpot above) */
    const DOCK_FROM = '#whHud .wh-meals, #whHud .wh-move';
    function dockSrc(el) {
        if (el.__mbSrc && el.__mbSrc.isConnected) return el.__mbSrc;
        const o = last && now() - last.t < 1600 && last.el;
        const b = o && o.closest ? o.closest(DOCK_FROM) : null;
        return b && b.isConnected ? b : null;
    }
    function undock(el) {
        el.classList.remove('mb-dock');
        ['--mb-l', '--mb-t', '--mb-w', '--mb-h'].forEach(k => el.style.removeProperty(k));
    }
    function dock(el) {
        if (!el.classList.contains('r2-sh')) return false;
        let wide = false;
        try { wide = W.matchMedia('(min-width: 700px)').matches; } catch (e) { }
        const src = wide && D.documentElement.classList.contains('wh-home') ? dockSrc(el) : null;
        const sp = D.getElementById('spBubble'), mr = sp && sp.getBoundingClientRect();
        if (!src || !mr || mr.width < 2) { undock(el); return false; }
        const br = src.getBoundingClientRect(), vh = W.innerHeight;
        let top = 10;
        try { top = Math.max(10, (parseFloat(getComputedStyle(D.documentElement).getPropertyValue('--sat')) || 0) + 10); } catch (e) { }
        el.classList.add('mb-dock');
        el.style.setProperty('--mb-l', '10px'); el.style.setProperty('--mb-t', '10px');
        el.style.setProperty('--mb-h', (vh - 20) + 'px');
        const natH = w => { el.style.setProperty('--mb-w', w + 'px'); return el.scrollHeight || el.getBoundingClientRect().height; };
        const s = W.LowiBloomDock.dockSpot({ vw: W.innerWidth, vh, top, misty: { l: mr.left, t: mr.top, r: mr.right, b: mr.bottom }, bub: { x: br.left + br.width / 2, y: br.top + br.height / 2 }, natH });
        if (!s) { undock(el); return false; }
        el.__mbSrc = src;
        el.style.setProperty('--mb-l', s.l + 'px'); el.style.setProperty('--mb-t', s.t + 'px');
        el.style.setProperty('--mb-w', s.w + 'px'); el.style.setProperty('--mb-h', s.h + 'px');
        el.dataset.mbSide = s.side;
        return true;
    }
    /* turning the iPad or resizing the window while it is open: dock again for the new screen */
    let reflow = 0;
    if (W.addEventListener) W.addEventListener('resize', () => {
        if (reflow) return;
        reflow = requestAnimationFrame(() => { reflow = 0; D.querySelectorAll('.r2-sh.mb-dock').forEach(el => { el.classList.add('mb-measure'); dock(el); el.classList.remove('mb-measure'); }); });
    });
    /* Oct 25 2026 (Emmanuel's TikTok "Why does iOS feel so nice to use", spring.js): the bloom is a spring, not a timed keyframe.
       p = 0 is the small round bubble at the finger, p = 1 the open panel. Closing while it is still growing (or opening
       again while it folds) turns the same spring around from where it is and how fast it moves, so it never jumps back to
       full size first. Without spring.js, or with reduced motion, the CSS keyframes below still do it. */
    function springy() { return !!(W.LowiSpring && W.LowiSpring.create) && !reduced(); }
    function paint(el, p) {
        const k = 1 - p, s = el.style, dx = parseFloat(s.getPropertyValue ? s.getPropertyValue('--mb-dx') : 0) || 0, dy = parseFloat(s.getPropertyValue ? s.getPropertyValue('--mb-dy') : 0) || 0;
        const sc = Math.min(1.035, 0.14 + 0.86 * p), op = Math.max(0, Math.min(1, p * 2.4)), kr = Math.max(0, Math.min(1, k * 1.6));
        s.setProperty('translate', (dx * k).toFixed(1) + 'px ' + (dy * k).toFixed(1) + 'px');
        s.setProperty('scale', sc.toFixed(4));
        s.setProperty('opacity', op.toFixed(3));
        s.setProperty('border-radius', kr > 0.001 ? 'calc(50% * ' + kr.toFixed(3) + ' + ' + ((el.__mbR || 0) * (1 - kr)).toFixed(1) + 'px)' : '');
    }
    function unpaint(el) { ['translate', 'scale', 'opacity', 'border-radius'].forEach(k => el.style.removeProperty && el.style.removeProperty(k)); }
    function spring(el) {
        if (el.__mbS) return el.__mbS;
        if (el.__mbR == null) { let r = 0; try { r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0; } catch (e) { } el.__mbR = r; }
        el.__mbS = W.LowiSpring.create({ value: 0, restDelta: 0.002, onUpdate: p => { paint(el, p); if (p < 0.03 && el.__mbFin && el.__mbS && el.__mbS.target === 0) { const f = el.__mbFin; el.__mbFin = null; f(); } } });
        return el.__mbS;
    }
    function open(el) {
        if (!prep(el)) return false;
        if (springy()) {
            const sp = spring(el);
            el.classList.add('mb-sp');
            el.classList.remove('mb-out');
            el.classList.add('mb-in');
            if (!sp.moving && sp.value >= 0.999) sp.set(0);
            paint(el, sp.value);
            /* a soft overshoot, like the old .5s curve, but it keeps whatever speed a fold-back had */
            el.__mbFin = null;
            sp.to(1, { response: 0.5, damping: 0.74, onRest: () => { if (el.classList.contains('mb-in')) unpaint(el); } });
            return true;
        }
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
        if (springy()) {
            /* from where it is now (maybe still growing) straight back into the bubble; no bounce on the way in */
            const sp = spring(el);
            if (!sp.moving && !el.classList.contains('mb-sp')) sp.set(1);
            el.classList.add('mb-sp');
            el.__mbFin = fin;/* gone from sight (p < 0.03): hand over without waiting for the last invisible pixels */
            sp.to(0, { response: 0.3, damping: 1, onRest: fin });
            setTimeout(fin, 900);/* a hidden tab gets no frames: hand over anyway */
            return true;
        }
        el.addEventListener('animationend', e => { if (e.target === el) fin(); });
        setTimeout(fin, 320);
        return true;
    }

    W.LowiBloom = { wants, prep, open, close, origin, dock, _note: note };
})();
