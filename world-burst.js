/* world-burst.js (Oct 17, E-man: "pushing out of a cell ... that 1 second or 2 seconds between worlds, we should give it
   something that is more impressive"). One reusable look for breaking out of a world (world exit, later the secret galaxy
   break-out): while you push, the membrane stretches under Misty (press); when it gives, it tears open with a flash, a ring,
   sparks and warp streaks (pop). DOM + CSS only (transform/opacity on a handful of nodes, composited): no per-frame JS, no
   canvas, every node removes itself when its animation ends. Respects reduced motion (a short soft flash only).
   API: LowiWorldBurst.press(p 0..1, x, y, css, ax, ay) / release() / pop(x, y, css, {ax, ay}) -> ms; core: plan(n, seed), DUR */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : null, D = W && W.document;
    const DUR = { pop: 760, flash: 420 };
    /* n sparks, fanned around the push direction (ax, ay), deterministic for a seed: [{dx, dy, s, d}] in px / scale / delay ms */
    function plan(n, seed, ax, ay) {
        n = Math.max(0, Math.min(24, n | 0)); let r = (seed | 0) || 7;
        const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
        const base = Math.atan2(+ay || 0, +ax || 1), out = [];
        for (let i = 0; i < n; i++) {
            const a = base + (i / Math.max(1, n) - 0.5) * Math.PI * 1.6 + (rnd() - 0.5) * 0.5, L = 70 + rnd() * 120;
            out.push({ dx: Math.round(Math.cos(a) * L), dy: Math.round(Math.sin(a) * L), s: +(0.6 + rnd() * 0.9).toFixed(2), d: Math.round(rnd() * 90) });
        }
        return out;
    }
    const core = { DUR, plan };
    if (typeof module !== 'undefined' && module.exports) module.exports = core;
    if (!D || !D.createElement) return;
    const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    let mem = null, seed = 1;
    function css() {
        if (D.getElementById('wbCss')) return;
        const s = D.createElement('style'); s.id = 'wbCss';
        s.textContent =
            '.wb-mem,.wb-pop,.wb-pop i{position:fixed;pointer-events:none;z-index:60;left:0;top:0}' +
            '.wb-mem{width:220px;height:220px;margin:-110px 0 0 -110px;border-radius:50%;opacity:0;will-change:transform,opacity;' +
            'background:radial-gradient(closest-side,rgba(255,255,255,.0) 52%,var(--wb,#9fe8ff) 70%,rgba(255,255,255,.85) 76%,rgba(255,255,255,0) 84%),' +
            'radial-gradient(closest-side,color-mix(in srgb,var(--wb,#9fe8ff) 22%,transparent),transparent);mix-blend-mode:screen}' +
            '.wb-pop{width:0;height:0}' +
            '.wb-pop .wb-f{width:120vmax;height:120vmax;margin:-60vmax 0 0 -60vmax;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.95),color-mix(in srgb,var(--wb,#9fe8ff) 60%,transparent) 18%,transparent 46%);animation:wbF .42s ease-out forwards}' +
            '.wb-pop .wb-r{width:80px;height:80px;margin:-40px 0 0 -40px;border-radius:50%;border:3px solid rgba(255,255,255,.95);box-shadow:0 0 18px var(--wb,#9fe8ff),inset 0 0 14px var(--wb,#9fe8ff);animation:wbR .62s cubic-bezier(.2,.7,.2,1) forwards}' +
            '.wb-pop .wb-s{width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;border-radius:50%;opacity:0;' +
            'background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.55) 0deg .7deg,transparent 1.2deg 7deg);' +
            '-webkit-mask:radial-gradient(closest-side,transparent 9%,#000 22%,transparent 70%);mask:radial-gradient(closest-side,transparent 9%,#000 22%,transparent 70%);animation:wbS .7s ease-out forwards}' +
            '.wb-pop .wb-p{width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:#fff;box-shadow:0 0 10px 2px var(--wb,#9fe8ff);' +
            'animation:wbP .66s cubic-bezier(.15,.75,.3,1) forwards;animation-delay:var(--d,0ms);transform:translate(0,0) scale(var(--s,1))}' +
            '@keyframes wbF{0%{opacity:0;transform:scale(.2)}18%{opacity:1}100%{opacity:0;transform:scale(1)}}' +
            '@keyframes wbR{0%{opacity:1;transform:scale(.3)}100%{opacity:0;transform:scale(7)}}' +
            '@keyframes wbS{0%{opacity:0;transform:scale(.5) rotate(0)}25%{opacity:1}100%{opacity:0;transform:scale(1.25) rotate(8deg)}}' +
            '@keyframes wbP{0%{opacity:1;transform:translate(0,0) scale(var(--s,1))}100%{opacity:0;transform:translate(var(--x),var(--y)) scale(.2)}}' +
            '@media (prefers-reduced-motion:reduce){.wb-pop .wb-r,.wb-pop .wb-s,.wb-pop .wb-p{display:none}.wb-mem{display:none}}';
        (D.head || D.documentElement).appendChild(s);
    }
    /* the membrane giving way under her: p = 0..1 of the 3 s push, (x, y) = where she presses, (ax, ay) = outward on screen */
    function press(p, x, y, hue, ax, ay) {
        p = Math.max(0, Math.min(1, +p || 0));
        if (p <= 0 || reduced()) { release(); return; }
        css();
        if (!mem || !mem.isConnected) { mem = D.createElement('div'); mem.className = 'wb-mem'; D.body.appendChild(mem); }
        if (hue) mem.style.setProperty('--wb', hue);
        const ang = Math.atan2(+ay || 0, +ax || 1) * 180 / Math.PI, st = 1 + 0.55 * p * p, sq = 1 - 0.18 * p;
        mem.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px) rotate(' + ang.toFixed(1) + 'deg) scale(' + (0.35 + 0.65 * p).toFixed(3) + ') scale(' + st.toFixed(3) + ',' + sq.toFixed(3) + ')';
        mem.style.opacity = (0.25 + 0.7 * p).toFixed(3);
    }
    function release() { if (mem) { const m = mem; mem = null; m.style.transition = 'opacity .25s'; m.style.opacity = '0'; setTimeout(() => m.remove(), 280); } }
    /* the tear: flash + ring + streaks + sparks at (x, y); returns how long it lasts (ms). Nothing keeps running after it. */
    function pop(x, y, hue, o) {
        o = o || {}; css();
        if (mem) { const m = mem; mem = null; m.remove(); }
        const el = D.createElement('div'); el.className = 'wb-pop';
        el.style.transform = 'translate(' + Math.round(+x || W.innerWidth / 2) + 'px,' + Math.round(+y || W.innerHeight / 2) + 'px)';
        if (hue) el.style.setProperty('--wb', hue);
        let h = '<i class="wb-f"></i>';
        if (!reduced()) {
            h += '<i class="wb-s"></i><i class="wb-r"></i>';
            plan(o.n == null ? 14 : o.n, seed++, o.ax, o.ay).forEach(q => { h += '<i class="wb-p" style="--x:' + q.dx + 'px;--y:' + q.dy + 'px;--s:' + q.s + ';--d:' + q.d + 'ms"></i>'; });
        }
        el.innerHTML = h; D.body.appendChild(el);
        const ms = reduced() ? DUR.flash : DUR.pop;
        setTimeout(() => el.remove(), ms + 120);
        return ms;
    }
    W.LowiWorldBurst = Object.assign({ press, release, pop, active: () => !!(mem || D.querySelector('.wb-pop')) }, core);
})();
