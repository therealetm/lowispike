/* Herb touch feel: springy return, held faces, zoned pokes, Home bubble press. Pure core + tiny DOM layer. */
(function(root) {
    'use strict';
    const SPRING_K = 90,
        SPRING_C = 9;

    // Semi-implicit spring toward the resting spot (0,0). Returns true once settled (body snapped home).
    function spring(body, dt, rx, ry, bound) {
        dt = Math.max(0, Math.min(.025, +dt || 0));
        body.vx += (-SPRING_K * body.x - SPRING_C * body.vx) * dt;
        body.vy += (-SPRING_K * body.y - SPRING_C * body.vy) * dt;
        body.x += body.vx * dt;
        body.y += body.vy * dt;
        if (typeof bound === 'function') bound(body, rx, ry);
        if (Math.abs(body.x) < .6 && Math.abs(body.y) < .6 && Math.abs(body.vx) < 8 && Math.abs(body.vy) < 8) {
            body.x = body.y = body.vx = body.vy = 0;
            return true;
        }
        return false;
    }

    function atRest(body) {
        return !body || (Math.abs(body.x) < .6 && Math.abs(body.y) < .6 && Math.abs(body.vx) < 8 && Math.abs(body.vy) < 8);
    }

    const inside = (p, r, pad) => !!r && p.x >= r.left - pad && p.x <= r.right + pad && p.y >= r.top - pad && p.y <= r.bottom + pad;

    // Where a tap landed on the herb, from the real rects of its parts (works for every growth stage).
    function zone(p, rects) {
        rects = rects || {};
        const body = rects.body,
            face = rects.face,
            pot = rects.pot;
        if (face && inside(p, face, Math.max(6, (face.right - face.left) * .18))) return 'face';
        if (pot && p.y >= pot.top) return 'pot';
        if (body && p.y < body.top + (body.bottom - body.top) * .08) return 'leaves';
        if (body) return p.x < (body.left + body.right) / 2 ? 'left' : 'right';
        return 'face';
    }

    const POKE = {
        leaves: {
            face: 'surprised',
            vx: 0,
            vy: -60,
            lines: [
                ['Hey, careful with my leaves!', 'My leaves are ticklish up there.'],
                ['Hey, vorsichtig mit meinen Blättern!', 'Da oben sind meine Blätter kitzlig.'],
                ['¡Ojo con mis hojas!', 'Ahí arriba mis hojas tienen cosquillas.']
            ]
        },
        face: {
            face: 'squint',
            vx: 0,
            vy: 0,
            lines: [
                ['Boop! Right on the nose.', 'Hehe, that was my face.'],
                ['Stups! Genau auf die Nase.', 'Hihi, das war mein Gesicht.'],
                ['¡Bup! Justo en la nariz.', 'Jeje, esa era mi cara.']
            ]
        },
        left: {
            face: 'surprised',
            vx: 260,
            vy: -40,
            lines: [
                ['Whoa, my side!', 'Hey, that tickles!'],
                ['Huch, meine Seite!', 'Hey, das kitzelt!'],
                ['¡Uy, mi costado!', '¡Oye, eso hace cosquillas!']
            ]
        },
        right: {
            face: 'surprised',
            vx: -260,
            vy: -40,
            lines: [
                ['Whoa, my side!', 'Hey, that tickles!'],
                ['Huch, meine Seite!', 'Hey, das kitzelt!'],
                ['¡Uy, mi costado!', '¡Oye, eso hace cosquillas!']
            ]
        },
        pot: {
            face: 'squint',
            vx: 0,
            vy: -420,
            lines: [
                ['Boing! A little hop.', 'Wheee, up I go!'],
                ['Hopp! Ein kleiner Sprung.', 'Hui, ich hüpfe!'],
                ['¡Boing! Un saltito.', '¡Allá voy, arriba!']
            ]
        }
    };
    const LANGS = {
        en: 0,
        de: 1,
        es: 2
    };

    function poke(z, lang, n) {
        const p = POKE[z] || POKE.face,
            li = LANGS[String(lang || 'en').slice(0, 2)] || 0,
            set = p.lines[li];
        return {
            zone: POKE[z] ? z : 'face',
            face: p.face,
            vx: p.vx,
            vy: p.vy,
            line: set[Math.abs(n | 0) % set.length]
        };
    }

    // Face while the herb is held. state: {hold, moved, stretch, speed, shakes}
    function heldFace(s) {
        s = s || {};
        if ((s.shakes || 0) >= 4 || (s.speed || 0) > 1500) return 'dizzy';
        if ((s.stretch || 1) > 1.35) return 'squint';
        if (s.hold && !s.moved) return 'squint';
        return 'surprised';
    }

    // Face right after letting go, and how long it stays.
    function releaseFace(speed) {
        return speed > 1300 ? {
            face: 'dizzy',
            ms: 1300
        } : {
            face: 'squint',
            ms: 520
        };
    }

    // Direction changes along x within the recent samples: a shake.
    function shakes(samples, now, windowMs) {
        const list = (samples || []).filter(s => now - s.t < (windowMs || 700));
        let flips = 0,
            dir = 0;
        for (let i = 1; i < list.length; i++) {
            const d = list[i].x - list[i - 1].x;
            if (Math.abs(d) < 6) continue;
            const sgn = d > 0 ? 1 : -1;
            if (dir && sgn !== dir) flips++;
            dir = sgn;
        }
        return flips;
    }

    function speedOf(samples, now) {
        const list = (samples || []).filter(s => now - s.t < 90);
        if (list.length < 2) return 0;
        const a = list[0],
            b = list[list.length - 1],
            dt = Math.max(1, b.t - a.t) / 1000;
        return Math.hypot(b.x - a.x, b.y - a.y) / dt;
    }

    const core = {
        spring,
        atRest,
        zone,
        poke,
        heldFace,
        releaseFace,
        shakes,
        speedOf,
        POKE,
        SPRING_K,
        SPRING_C
    };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!root || !root.document) return;

    const D = root.document;
    const reduced = () => {
        try {
            return root.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {
            return false;
        }
    };
    const lang = () => {
        try {
            return (root.LowiLang.get() || 'en').slice(0, 2);
        } catch (e) {
            return (D.documentElement.lang || 'en').slice(0, 2);
        }
    };

    function setFace(el, face) {
        if (!el) return;
        if (face) el.dataset.touchface = face;
        else delete el.dataset.touchface;
    }

    function rectsOf(el) {
        const q = s => {
            const n = el && el.querySelector(s);
            if (!n) return null;
            const r = n.getBoundingClientRect();
            return r.width || r.height ? r : null;
        };
        return {
            face: q('.lh-face'),
            body: q('.lh-body') || q('.lh-creature') || q('.tmg-plant'),
            pot: q('.lh-pot')
        };
    }

    function haptic(ms) {
        if (reduced()) return;
        try {
            root.navigator.vibrate && root.navigator.vibrate(ms || 6);
        } catch (e) {}
    }

    // Home bubble: squish on press, springy pop on release, the herb inside reacts. Delegated so Home re-renders keep it.
    let pressId = null,
        popTimer = 0,
        faceTimer = 0;

    function bubble() {
        return D.getElementById('spBubble');
    }

    function release(b, ok) {
        if (!b) return;
        delete b.dataset.pressed;
        pressId = null;
        clearTimeout(popTimer);
        clearTimeout(faceTimer);
        if (ok && !reduced()) {
            b.dataset.pop = '1';
            popTimer = setTimeout(() => delete b.dataset.pop, 460);
        }
        setFace(b, ok ? 'squint' : null);
        if (ok) faceTimer = setTimeout(() => setFace(b, null), 600);
    }
    D.addEventListener('pointerdown', e => {
        const b = e.target && e.target.closest && e.target.closest('#spBubble');
        if (!b || (e.button != null && e.button !== 0)) return;
        pressId = e.pointerId;
        clearTimeout(popTimer);
        clearTimeout(faceTimer);
        delete b.dataset.pop;
        b.dataset.pressed = '1';
        setFace(b, 'surprised');
        haptic(6);
    }, {
        passive: true
    });
    D.addEventListener('pointerup', e => {
        if (pressId == null || e.pointerId !== pressId) return;
        release(bubble(), true);
    }, {
        passive: true
    });
    D.addEventListener('pointercancel', e => {
        if (pressId == null || e.pointerId !== pressId) return;
        release(bubble(), false);
    }, {
        passive: true
    });
    D.addEventListener('pointermove', e => {
        if (pressId == null || e.pointerId !== pressId) return;
        const b = bubble();
        if (!b) return;
        const r = b.getBoundingClientRect();
        if (e.clientX < r.left - 16 || e.clientX > r.right + 16 || e.clientY < r.top - 16 || e.clientY > r.bottom + 16) release(b, false);
    }, {
        passive: true
    });

    root.LowiHerbTouch = Object.assign({
        setFace,
        rectsOf,
        haptic,
        reduced,
        lang
    }, core);
})(typeof window !== 'undefined' ? window : null);
