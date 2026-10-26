/* move-bubble.js — Oct 17 (E-man): the movement bubble on Home, next to Misty's water and fasting bubbles.
   Tap: four small bubbles bloom out of it — Quick, Medium, Long, Epic — pick how the walk FELT (no minutes, no steps).
   The pick pops into the bubble, its fill rises, Misty does her happy dance, and a small float says what it really added
   (XP and the Move energy change read back from LowiSun.energyNow, so the number always matches what was applied, caps included).
   Long press: today's estimates, each can be removed again (XP and energy go back with it). No separate edit button.
   Oct 21 (Eman: "on the homepage, press long and you enter the fitness page, Move"): long press now opens the full Move page
   (openPage), the one Community's bottom bar used to open. Today's estimates moved onto that page: a row under its header
   ("Today on Home: n · Edit") opens the same sheet. The keyboard ContextMenu key opens the page too.
   Rules live in move-estimate-core.js. Only time on your feet or on a bike counts, never sitting on a bus or train.
   Oct 23 2026 (Eman: "people already have step counting apps ... look at the phone, see how many steps, then just tap a button,
   just like with sleep"): the choices are now three daily step ranges, Casual (under 5k), Steady (5k-10k) and Epic (10k+).
   One range a day: picking another changes today's, the same one again does nothing. LOWiSPIKE never counts or checks steps. */
/* Oct 18 (E-man, iPad: "Move keeps moving into the middle"): the four choices used to aim at the screen middle. On a
   phone that was beside Misty, but on iPad and desktop Misty IS the middle, so Quick / Medium / Long / Epic landed on her.
   fan() aims them away from Misty instead: the direction from her centre through the bubble, turned only as far as needed
   to keep every orb on screen, clear of Misty, and as far as it can off the other Home bubbles and cards. Pure, tested
   in tests/bloom-anchor.test.cjs. g: {cx, cy, r (bubble radius), orb, n, vw, vh, top, bottom, misty {x, y, r}, avoid [rects]} */
(function (root) {
    'use strict';
    const TAU = Math.PI * 2;
    function lay(g, base, dist) {
        const step = (g.orb + 12) / dist, out = [];
        for (let i = 0; i < g.n; i++) { const a = base + (i - (g.n - 1) / 2) * step; out.push({ x: g.cx + Math.cos(a) * dist, y: g.cy + Math.sin(a) * dist }); }
        return out;
    }
    /* how far the layout breaks the hard rules: off the usable screen, or into Misty (px) */
    function breaks(g, pts) {
        const h = g.orb / 2, m = 6; let bad = 0;
        for (const p of pts) {
            bad += Math.max(0, m + h - p.x) + Math.max(0, p.x - (g.vw - m - h)) + Math.max(0, g.top + h - p.y) + Math.max(0, p.y - (g.vh - g.bottom - h));
            if (g.misty) bad += Math.max(0, g.misty.r + h + 8 - Math.hypot(p.x - g.misty.x, p.y - g.misty.y));
        }
        return bad;
    }
    /* how much the orbs cover the other Home bubbles (weight 2) and cards (lighter: they sit under the veil anyway), in orb areas */
    function covers(g, pts) {
        const h = g.orb / 2; let s = 0;
        for (const p of pts) for (const q of (g.avoid || [])) {
            const w = Math.min(p.x + h, q.r) - Math.max(p.x - h, q.l), t = Math.min(p.y + h, q.b) - Math.max(p.y - h, q.t);
            if (w > 0 && t > 0) s += (q.w == null ? 2 : q.w) * (w * t) / (g.orb * g.orb);
        }
        return s;
    }
    function fan(g) {
        g = Object.assign({ n: 4, top: 6, bottom: 6, avoid: [] }, g);
        const away = g.misty ? Math.atan2(g.cy - g.misty.y, g.cx - g.misty.x) : Math.atan2(g.vh * 0.5 - g.cy, g.vw * 0.5 - g.cx);
        const d0 = g.r + g.orb / 2 + 22;
        let best = null, worst = null;
        for (let k = 0; k <= 4; k++) {
            const dist = d0 + k * g.orb * 0.5;
            for (let t = 0; t <= 60; t++) {
                for (const sgn of t ? [1, -1] : [1]) {
                    const dev = sgn * t * Math.PI / 60, base = away + dev, pts = lay(g, base, dist);
                    const bad = breaks(g, pts);
                    if (bad > 0.5) { if (!worst || bad < worst.bad) worst = { pts, bad, base, dist }; continue; }
                    const score = Math.abs(dev) / Math.PI + k * 0.25 + covers(g, pts);
                    if (!best || score < best.score - 1e-9) best = { pts, score, base, dist };
                }
            }
        }
        const pick = best || worst, h = g.orb / 2;
        const clamp = p => { p.x = Math.max(h + 6, Math.min(g.vw - h - 6, p.x)); p.y = Math.max(g.top + h, Math.min(g.vh - g.bottom - h, p.y)); return p; };
        const pts = pick.pts.map(p => clamp({ x: p.x, y: p.y }));
        /* no clean spot at all (a tiny screen): keep clamped orbs from sitting on each other */
        if (!best) for (let k = 0; k < 6; k++) for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
            const p = pts[i], q = pts[j], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1, need = g.orb + 6;
            if (d < need) { const m = (need - d) / 2, ux = dx / d, uy = dy / d; p.x -= ux * m; p.y -= uy * m; q.x += ux * m; q.y += uy * m; clamp(p); clamp(q); }
        }
        return { pts, ok: !!best, angle: ((pick.base % TAU) + TAU) % TAU, dist: pick.dist, away };
    }
    /* the line under the orbs: below them, else above, else beside, wherever it stays on screen and off Misty */
    function noteSpot(g, pts, w, hgt) {
        const h = g.orb / 2, minY = Math.min(...pts.map(p => p.y)), maxY = Math.max(...pts.map(p => p.y));
        const midX = pts.reduce((s, p) => s + p.x, 0) / pts.length, midY = (minY + maxY) / 2;
        const minX = Math.min(...pts.map(p => p.x)), maxX = Math.max(...pts.map(p => p.x));
        const cl = (l, t) => ({ l: Math.max(12, Math.min(g.vw - w - 12, l)), t: Math.max(g.top, Math.min(g.vh - g.bottom - hgt, t)) });
        const tries = [cl(midX - w / 2, maxY + h + 10), cl(midX - w / 2, minY - h - 10 - hgt), cl(maxX + h + 10, midY - hgt / 2), cl(minX - h - 10 - w, midY - hgt / 2)];
        const hits = s => {
            let n = 0;
            if (g.misty) { const nx = Math.max(s.l, Math.min(g.misty.x, s.l + w)), ny = Math.max(s.t, Math.min(g.misty.y, s.t + hgt)); if (Math.hypot(nx - g.misty.x, ny - g.misty.y) < g.misty.r) n += 10; }
            for (const p of pts) { const nx = Math.max(s.l, Math.min(p.x, s.l + w)), ny = Math.max(s.t, Math.min(p.y, s.t + hgt)); if (Math.hypot(nx - p.x, ny - p.y) < h) n += 1; }
            return n;
        };
        let pick = tries[0], low = Infinity;
        for (const s of tries) { const n = hits(s); if (n < low) { low = n; pick = s; } if (!n) break; }
        /* nowhere next to the orbs: the free spot nearest to them, scanning down the screen */
        if (low > 0) {
            let near = Infinity;
            for (let t = g.top; t <= g.vh - g.bottom - hgt; t += 12) for (const l of [midX - w / 2, 12, g.vw - w - 12]) {
                const s = cl(l, t), dd = Math.abs(s.t + hgt / 2 - midY) + Math.abs(s.l + w / 2 - midX) * 0.5;
                if (dd < near && !hits(s)) { near = dd; pick = s; low = 0; }
            }
        }
        return pick;
    }
    const API = { fan, noteSpot, _breaks: breaks };
    if (typeof module === 'object' && module.exports) module.exports = API;
    if (root) root.LowiMoveFan = API;
})(typeof window !== 'undefined' ? window : null);

(function () {
    'use strict';
    if (typeof window === 'undefined') return;
    const W = window, D = document;
    if (W.LowiMoveBubble) return;
    const C = W.LowiMoveEstimateCore;
    if (!C) return;

    const lang = () => { const l = (D.documentElement.lang || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const wnm = s => { try { const B = (typeof window !== 'undefined' ? window : globalThis).LowiBirthCompanion; return s && B && B.withName ? B.withName(s) : s; } catch (e) { return s; } }; /* BH-045: the user's own companion name, never the default "Misty" */
    const T = (en, de, es) => wnm([en, de, es][lang()]);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const pad = n => String(n).padStart(2, '0');
    const dayKey = d => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const bridge = () => W.LowiVitalsBridge || null;
    const state = () => { try { return bridge() && bridge().state(); } catch (e) { return null; } };
    const ledger = () => { const s = state(); return (s && Array.isArray(s.ledger)) ? s.ledger : []; };
    const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const energy = () => { try { return W.LowiSun && W.LowiSun.energyNow ? +W.LowiSun.energyNow().value || 0 : null; } catch (e) { return null; } };

    /* Oct 23: the three daily step ranges (move-estimate-core.js LEVELS); the Oct 17 names stay only to label older saved guesses */
    const NAMES = {
        casual: () => T('Casual', 'Locker', 'Tranquilo'),
        steady: () => T('Steady', 'Stetig', 'Constante'),
        epic: () => T('Epic', 'Episch', 'Épico'),
        quick: () => T('Quick', 'Kurz', 'Rápido'),
        medium: () => T('Medium', 'Mittel', 'Medio'),
        long: () => T('Long', 'Lang', 'Largo')
    };
    const HINTS = {
        casual: () => T('under 5k', 'unter 5k', 'menos de 5k'),
        steady: () => T('5k\u201310k', '5k\u201310k', '5k\u201310k'),
        epic: () => T('10k+', '10k+', '10k+')
    };
    /* the full range, for screen readers and the sheet: "under 5,000 steps" */
    const RANGES = {
        casual: () => T('under 5,000 steps', 'unter 5.000 Schritte', 'menos de 5.000 pasos'),
        steady: () => T('5,000 to 9,999 steps', '5.000 bis 9.999 Schritte', 'de 5.000 a 9.999 pasos'),
        epic: () => T('10,000 steps or more', '10.000 Schritte oder mehr', '10.000 pasos o más')
    };
    const ASK = () => T('How many steps today? Check your step counter, then tap one.', 'Wie viele Schritte heute? Schau auf deinen Schrittzähler und tippe eins an.', '¿Cuántos pasos hoy? Mira tu contador de pasos y toca uno.');
    const label = () => T('Move', 'Bewegung', 'Movimiento');

    let el = null, bloom = null, timer = 0, lastDay = '', busy = false;

    /* ---------- the bubble ---------- */
    function ensure() {
        const hud = D.getElementById('whHud');
        if (!hud) return null;
        if (el && el.isConnected && el.parentNode === hud) return el;
        el = hud.querySelector('.wh-move');
        if (!el) {
            el = D.createElement('button');
            el.type = 'button';
            el.className = 'wh-cell wh-move';
            el.dataset.hb = 'move';
            el.innerHTML = '<span class="wh-cell-fill" aria-hidden="true"></span><span class="wh-cell-tx"><small></small><b></b></span><i class="wm-pop" aria-hidden="true"></i>';
            const water = hud.querySelector('.wh-water');
            if (water && water.nextSibling) hud.insertBefore(el, water.nextSibling); else hud.appendChild(el);
            wire(el);
            try { W.dispatchEvent(new CustomEvent('lowi:home-bubble-added', { detail: { el, kind: 'move' } })); } catch (e) {}
        }
        return el;
    }
    /* the shared living bubble (living-bubbles.js, loads after this file): Misty's 3D membrane, her squish and spring, and
       its long press, which here opens today's estimates */
    let living = false, longAt = 0, downAt = 0;   /* a long press, however long it is held, never also opens the bloom */
    function attachLiving(b) {
        if (living || !b) return;
        try { if (W.LowiLivingBubble && typeof W.LowiLivingBubble.attach === 'function') { W.LowiLivingBubble.attach(b, { kind: 'move', onLong: () => { longAt = performance.now(); openPage(); return true; } }); living = true; } } catch (e) {}
    }
    const shared = () => !!(W.LowiBubbles && el && el.classList.contains('lb-bub'));
    function paint() {
        const b = ensure(); if (!b) return;
        if (!b.classList.contains('lb-bub')) living = false;
        attachLiving(b);
        const day = dayKey(); lastDay = day;
        const v = C.view(ledger(), day);
        const fill = String(Math.round(v.fill * 100) / 100);
        if (b.style.getPropertyValue('--wh-fill') !== fill) b.style.setProperty('--wh-fill', fill);
        const sm = b.querySelector('small'), bb = b.querySelector('b');
        if (sm && sm.textContent !== label()) sm.textContent = label();
        const vt = v.text || T('Log', 'Eintragen', 'Anotar');   /* like Sleep: no range today yet = "Log" */
        if (bb && bb.textContent !== vt) bb.textContent = vt;
        b.classList.toggle('wm-full', v.q >= C.FULL);
        const aria = label() + ', ' + (v.level ? NAMES[v.level]() + ', ' + RANGES[v.level]() : (v.q >= C.FULL ? T('full today', 'heute voll', 'lleno hoy') : T('no steps logged today', 'heute keine Schritte eingetragen', 'hoy sin pasos anotados'))) + '. ' +
            T('Tap to pick today\'s step range, long press for the Move page.', 'Tippen, um den Schrittbereich von heute zu wählen, lange drücken für die Bewegungsseite.', 'Toca para elegir el rango de pasos de hoy, mantén pulsado para la página Movimiento.');
        if (b.getAttribute('aria-label') !== aria) b.setAttribute('aria-label', aria);
    }

    /* Where it floats: mirror the water bubble upward (upper-right of Misty). On short or wide screens (iPhone SE, phones in
       landscape) that spot can hit the Daily Quest card or the water bubble, so try a few other spots around Misty and take the
       first one that touches nothing. Positions are written as --wm-x / --wm-y; without them the CSS default applies. */
    /* Misty's HOME cell, never where her cell drifts to: while the camera follows her flight (autopilot, steering, a world)
       misty-flight.js slides #spBubble by --mf-bx / --mf-by (html.mf-roam). Measuring that moved box made this bubble jump
       after her, into the middle where she used to sit. The other bubbles are pinned by CSS, so this one is too. */
    function homeRect(mi) {
        const q = mi.getBoundingClientRect();
        if (!D.documentElement.classList.contains('mf-roam')) return q;
        const dx = parseFloat(mi.style.getPropertyValue('--mf-bx')) || 0, dy = parseFloat(mi.style.getPropertyValue('--mf-by')) || 0;
        return { left: q.left - dx, top: q.top - dy, right: q.right - dx, bottom: q.bottom - dy, width: q.width, height: q.height };
    }
    function place() {
        const b = ensure(); if (!b) return;
        const hud = D.getElementById('whHud'), mi = D.getElementById('spBubble');
        if (!hud || !mi || !D.documentElement.classList.contains('wh-home')) return;
        /* while the UI is faded for Misty's flight the spot stays where it was: the faded cards would read as gone */
        if (D.documentElement.classList.contains('lw-clean')) return;
        /* ...and during the fade back in, so it does not jump while the cards are still half visible */
        if (D.documentElement.classList.contains('lw-clean-out')) return;
        const hr = hud.getBoundingClientRect(), mr = homeRect(mi);
        if (!mr.width || !hr.width) return;
        const r = b.offsetWidth / 2 || 46, gap = 8, vw = W.innerWidth, vh = W.innerHeight;
        const mcx = mr.left + mr.width / 2, mcy = mr.top + mr.height / 2, mR = mr.width / 2;
        const vis = e => { if (!e || e === b) return null; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return null; const q = e.getBoundingClientRect(); return q.width > 4 ? q : null; };
        const water = vis(hud.querySelector('.wh-water')), fast = vis(D.getElementById('spFast'));
        const circles = [{ x: mcx, y: mcy, r: mR }];
        ['#spFast', '#whHud .wh-water'].forEach(sel => { const q = vis(D.querySelector(sel)); if (q) circles.push({ x: q.left + q.width / 2, y: q.top + q.height / 2, r: q.width / 2 }); });
        const rects = ['#f3Board', '#hcLine', '.sp-top', '.fe-bub', '#whHud .wh-todaybtn', '#whHud .wh-vr', '#whHud .wh-zoom', '#tabbar', '.tabbar'].map(sel => vis(D.querySelector(sel))).filter(Boolean);
        const sx = water ? water.left + water.width / 2 - mcx : mR * 1.35, sy = water ? water.top + water.height / 2 - mcy : mR;
        const cands = [
            [mcx + sx, mcy - sy], [mcx + mR + gap + r, mcy],
            water ? [water.right + gap + r, water.top + water.height / 2] : null,
            [mcx + mR + gap + r, mcy - r * 0.9], [mcx - sx, mcy - sy], [mcx - mR - gap - r, mcy],
            fast ? [fast.left - gap - r, fast.top + fast.height / 2] : null
        ].filter(Boolean);
        const clear = (x, y) => {
            if (x - r < 6 || x + r > vw - 6 || y - r < 6 || y + r > vh - 6) return false;
            for (const c of circles) if (Math.hypot(c.x - x, c.y - y) < c.r + r + gap) return false;
            for (const q of rects) { const nx = Math.max(q.left, Math.min(x, q.right)), ny = Math.max(q.top, Math.min(y, q.bottom)); if (Math.hypot(nx - x, ny - y) < r + 6) return false; }
            return true;
        };
        /* while Misty is out flying her bubble stays put: if its spot is still free, nothing about her flight moves it */
        const pm = (D.getElementById('whPad') || { dataset: {} }).dataset.mode;
        if ((pm && pm !== 'idle') || D.documentElement.classList.contains('mf-roam')) {
            const ox = parseFloat(b.style.getPropertyValue('--wm-x')), oy = parseFloat(b.style.getPropertyValue('--wm-y'));
            if (isFinite(ox) && isFinite(oy) && clear(hr.left + ox, hr.top + oy)) return;
        }
        let pick = null;
        for (const c of cands) if (clear(c[0], c[1])) { pick = c; break; }
        if (!pick) {   /* nothing on the list fits (phone in landscape): nearest free spot around Misty, leaning toward the usual one */
            let best = null, bs = 1e9;
            for (let d = mR + r + gap; d < mR + r + gap + 320; d += 12) for (let a = 0; a < 360; a += 10) {
                const x = mcx + Math.cos(a * Math.PI / 180) * d, y = mcy + Math.sin(a * Math.PI / 180) * d;
                if (!clear(x, y)) continue;
                const sc = d + 0.35 * Math.hypot(x - cands[0][0], y - cands[0][1]);
                if (sc < bs) { bs = sc; best = [x, y]; }
            }
            const board = vis(D.getElementById('f3Board'));
            pick = best || [cands[0][0], Math.max(cands[0][1], board ? board.bottom + 10 + r : 0)];
        }
        const nx = Math.round(pick[0] - hr.left), ny = Math.round(pick[1] - hr.top);
        /* a fixed spot: the neighbours' own few-pixel wobble never nudges it, only a real change of layout does.
           13 px = one step of the landscape search above (12 px rings), so a wobble can't flip it between two
           neighbouring rings either (it hopped 12 px when steering started on an iPhone held sideways). */
        const ox = parseFloat(b.style.getPropertyValue('--wm-x')), oy = parseFloat(b.style.getPropertyValue('--wm-y'));
        if (isFinite(ox) && isFinite(oy) && Math.abs(nx - ox) < 13 && Math.abs(ny - oy) < 13) return;
        b.style.setProperty('--wm-x', nx + 'px');
        b.style.setProperty('--wm-y', ny + 'px');
    }
    /* tap = bloom, long press = edit (same rule as the other Home bubbles) */
    function wire(b) {
        let down = 0, held = false, sx = 0, sy = 0;
        const clear = () => { if (down) clearTimeout(down); down = 0; b.classList.remove('wm-holding'); };
        b.addEventListener('pointerdown', e => {
            downAt = performance.now();
            if (e.button > 0 || shared()) return;   /* the living bubble does the press and the long press */
            held = false; sx = e.clientX; sy = e.clientY;
            b.classList.add('wm-press');
            clear(); b.classList.add('wm-holding');
            down = setTimeout(() => { down = 0; held = true; b.classList.remove('wm-holding', 'wm-press'); buzz(18); openPage(); }, 560);
        });
        /* BH-023: a second finger anywhere turns the hold into a pinch: no Move page */
        D.addEventListener('pointerdown', e => { if (down && e.isPrimary === false) { clear(); b.classList.remove('wm-press'); } }, true);
        b.addEventListener('pointermove', e => { if (down && Math.hypot(e.clientX - sx, e.clientY - sy) > 12) { clear(); b.classList.remove('wm-press'); } });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => b.addEventListener(n, () => { clear(); b.classList.remove('wm-press'); }));
        b.addEventListener('contextmenu', e => { e.preventDefault(); if (shared()) return; });
        b.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            if (held) { held = false; return; }
            if (longAt && longAt >= downAt) { longAt = 0; return; }
            if (bloom) closeBloom(); else openBloom();
        });
        b.addEventListener('keydown', e => { if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); openPage(); } });
    }
    function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

    /* ---------- the bloom: four small bubbles fan out toward the middle of the screen ---------- */
    function openBloom() {
        const b = ensure(); if (!b || bloom) return;
        const r = b.getBoundingClientRect(); if (!r.width) return;
        buzz(8);
        const vw = W.innerWidth, vh = W.innerHeight;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const orb = Math.round(Math.max(64, Math.min(84, Math.min(vw, vh) * 0.19)));
        /* Oct 22 2026 (Emmanuel: Mirror mode is "the most impressive part in the whole app"): the camera workout is the FIRST bubble of
           the bloom, so it is two taps from Home (Move, then Mirror). The four feel picks follow it. */
        const mir = hasMirror();
        const pts = W.LowiMoveFan.fan(fanGeom(b, r, cx, cy, orb, vw, vh)).pts.map((p, i) => ({ L: mir ? (i ? C.LEVELS[i - 1] : null) : C.LEVELS[i], x: p.x, y: p.y }));
        const v = C.view(ledger(), dayKey());
        const ov = D.createElement('div');
        ov.className = 'wm-bloom';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-label', ASK());
        ov.style.setProperty('--wm-orb', orb + 'px');
        ov.innerHTML = '<button type="button" class="wm-scrim" data-wm="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '"></button>' +
            pts.map((p, i) => !p.L ? mirrorOrb(p, i, cx, cy) : '<button type="button" class="wm-orb wm-' + p.L.id + (v.level === p.L.id ? ' on' : '') + '" data-wm="pick" data-lvl="' + p.L.id + '" aria-pressed="' + (v.level === p.L.id) + '" style="left:' + Math.round(p.x) + 'px;top:' + Math.round(p.y) + 'px;--wm-dx:' + Math.round(cx - p.x) + 'px;--wm-dy:' + Math.round(cy - p.y) + 'px;--wm-i:' + i + '" aria-label="' + esc(NAMES[p.L.id]() + ', ' + RANGES[p.L.id]()) + '">' +
                '<span class="wm-orb-fill" style="--wm-q:' + (p.L.q / 4) + '" aria-hidden="true"></span><span class="wm-orb-tx"><b>' + esc(NAMES[p.L.id]()) + '</b><small>' + esc(HINTS[p.L.id]()) + '</small></span></button>').join('') +
            '<p class="wm-note" style="' + noteSpot(pts, orb, vw, vh, b, r) + '">' + esc(v.q >= C.FULL
                ? T('Move is full for today. Nice!', 'Bewegung ist heute voll. Stark!', 'Movimiento completo hoy. ¡Genial!')
                : ASK()) + '</p>';
        D.body.appendChild(ov);
        bloom = ov;
        b.classList.add('wm-open'); b.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(() => { ov.classList.add('on'); const f = ov.querySelector('.wm-orb'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} });
        ov.addEventListener('click', onBloomClick);
        ov.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); closeBloom(true); } });
    }
    /* where Misty is right now (her glass on Home), the usable screen and what the orbs should keep off */
    function fanGeom(b, r, cx, cy, orb, vw, vh) {
        const box = e => { if (!e || e === b) return null; const q = e.getBoundingClientRect(); return q.width > 1 && q.height > 1 ? { l: q.left, t: q.top, r: q.right, b: q.bottom } : null; };
        const sp = D.getElementById('spBubble'), m = sp && sp.getBoundingClientRect();
        const misty = m && m.width > 1 ? { x: m.left + m.width / 2, y: m.top + m.height / 2, r: Math.min(m.width, m.height) / 2 } : null;
        const avoid = Array.from(D.querySelectorAll('#whHud [data-hb], #spFast')).map(box).filter(Boolean)
            .concat(Array.from(D.querySelectorAll('#f3Board, #spHome .sp-top, #tabbar')).map(box).filter(Boolean).map(q => Object.assign(q, { w: 0.4 })));
        let top = 6;
        try { top = Math.max(6, parseFloat(getComputedStyle(D.documentElement).getPropertyValue('--sat')) || 0); } catch (e) { }
        return { cx, cy, r: r.width / 2, orb, n: C.LEVELS.length + (hasMirror() ? 1 : 0), vw, vh, top, bottom: 6, misty, avoid };
    }
    function hasMirror() { return !!(W.LowiMirror && typeof W.LowiMirror.open === 'function'); }
    const CAM = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6.5" width="13" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 10.5l5-3v9l-5-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    function mirrorOrb(p, i, cx, cy) {
        const n = T('Mirror', 'Spiegel', 'Espejo'), sub = T('camera workout', 'Kamera-Workout', 'entreno con cámara');
        return '<button type="button" class="wm-orb wm-mirror" data-wm="mirror" style="left:' + Math.round(p.x) + 'px;top:' + Math.round(p.y) + 'px;--wm-dx:' + Math.round(cx - p.x) + 'px;--wm-dy:' + Math.round(cy - p.y) + 'px;--wm-i:' + i + '" aria-label="' + esc(T('Mirror mode: camera workout', 'Spiegel-Modus: Kamera-Workout', 'Modo espejo: entreno con cámara')) + '">' +
            '<span class="wm-orb-tx"><span class="wm-orb-ic">' + CAM + '</span><b>' + esc(n) + '</b><small>' + esc(sub) + '</small></span></button>';
    }
    /* Mirror opens in place of the bloom, never on top of it (no stacked layers) */
    function openMirror(orbEl) {
        closeBloom(false, orbEl);
        try { W.LowiMirror.open(); } catch (e) { }
    }
    function noteSpot(pts, orb, vw, vh, b, r) {
        const w = Math.min(260, vw - 24), g = fanGeom(b, r, 0, 0, orb, vw, vh);
        const s = W.LowiMoveFan.noteSpot(g, pts, w, 48);
        return 'left:' + Math.round(s.l) + 'px;top:' + Math.round(s.t) + 'px;width:' + Math.round(w) + 'px';
    }
    function onBloomClick(e) {
        const t = e.target.closest && e.target.closest('[data-wm]'); if (!t) return;
        e.preventDefault(); e.stopPropagation();
        if (t.dataset.wm === 'close') closeBloom(true);
        else if (t.dataset.wm === 'pick') pick(t.dataset.lvl, t);
        else if (t.dataset.wm === 'mirror') openMirror(t);
    }
    function closeBloom(focusBack, chosen) {
        const ov = bloom; if (!ov) return;
        bloom = null;
        if (el) { el.classList.remove('wm-open'); el.setAttribute('aria-expanded', 'false'); }
        ov.classList.remove('on'); ov.classList.add('off');
        if (chosen) chosen.classList.add('wm-chosen');
        setTimeout(() => ov.remove(), reduced() ? 0 : 420);
        if (focusBack && el) try { el.focus({ preventScroll: true }); } catch (e) {}
    }

    /* ---------- a pick ---------- */
    function pick(id, orbEl) {
        if (busy) return;
        const br = bridge(); if (!br || !br.awardWith) { closeBloom(true); return; }
        busy = true;
        try {
            const day = dayKey(), now = Date.now();
            const p = C.plan(ledger(), day, id, now);
            if (p.action === 'bad') { closeBloom(true); return; }
            if (p.action === 'same') {
                /* the same range again: today's total did not change, so nothing is added and Misty does not dance again */
                closeBloom(true, orbEl); buzz(8);
                float(T('Already ', 'Schon ', 'Ya ') + NAMES[id]() + ' · ' + HINTS[id]() + T(' today', ' heute', ' hoy'), true);
                return;
            }
            if (p.action === 'full') {
                closeBloom(true, orbEl); buzz(10);
                float(p.fromMovePage ? T('Already counted on Move · full', 'Schon unter Bewegung gezählt · voll', 'Ya contado en Movimiento · lleno') : T('Move is full today', 'Bewegung ist heute voll', 'Movimiento lleno hoy'), true);
                wobble();
                try { W.dispatchEvent(new CustomEvent('lowi:care', { detail: { kind: 'dance', id: 'move:full:' + day } })); } catch (e) {}
                return;
            }
            const before = energy();
            /* one range a day: today's earlier pick and any older Quick / Medium / Long / Epic guesses go first (their XP comes back off) */
            let back = 0;
            for (const rid of p.removeIds) back += (+br.unaward(rid) || 0);
            const name = NAMES[id](), lab = label() + ' · ' + name + ' (' + HINTS[id]() + ')';
            const xp = br.awardWith(p.xp, lab, C.SRC, p.eventId, { mq: p.applied, lvl: id, steps: p.band, est: 1 }, true);
            const after = energy();
            closeBloom(false, orbEl);
            paint();
            if (p.down) wobble(); else pop();
            buzz(p.down ? 10 : [12, 40, 18]);
            const dE = before == null || after == null ? null : Math.round((after - before) * 100);
            const bits = [];
            if (p.replaced) bits.push(T('today: ', 'heute: ', 'hoy: ') + name);
            const net = (+xp || 0) - back;   /* a change shows the net change, not the new total */
            bits.push((net >= 0 ? '+' : '') + net + ' XP');
            if (dE != null) bits.push(dE > 0 ? '+' + dE + '% ' + T('energy', 'Energie', 'energía') : (dE < 0 ? dE + '% ' + T('energy', 'Energie', 'energía') : T('energy already full', 'Energie schon voll', 'energía ya llena')));
            float(bits.join(' · '));
            if (el) try { el.focus({ preventScroll: true }); } catch (e) {}
            try { W.dispatchEvent(new CustomEvent('lowi:move-estimate', { detail: { level: id, band: p.band, applied: p.applied, xp, back, energyBefore: before, energyAfter: after, replaced: p.replaced, down: p.down } })); } catch (e) {}
        } finally { busy = false; }
    }
    function restart(node, cls) { if (!node) return; node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }
    function pop() { restart(el, 'wm-pop-on'); }
    function wobble() { restart(el, 'wm-nope'); }
    function float(text, soft) {
        const b = ensure(); if (!b) return;
        const r = b.getBoundingClientRect();
        const f = D.createElement('div');
        f.className = 'wm-float' + (soft ? ' soft' : '');
        f.setAttribute('role', 'status');
        f.textContent = text;
        const w = Math.min(240, W.innerWidth - 16);
        f.style.width = w + 'px';
        f.style.left = Math.round(Math.max(8, Math.min(W.innerWidth - w - 8, r.left + r.width / 2 - w / 2))) + 'px';
        f.style.top = Math.round(Math.max(8, r.top - 30)) + 'px';
        D.body.appendChild(f);
        setTimeout(() => f.remove(), reduced() ? 2600 : 2400);
    }

    /* ---------- long press: today's estimates ---------- */
    /* Oct 21: hold Move = the Move page. guessRow() keeps today's estimates one tap away on that page. */
    function openPage() {
        closeBloom(false);
        try { if (W.LowiHost && typeof W.LowiHost.go === 'function') W.LowiHost.go('move'); else if (typeof W.goTab === 'function') W.goTab('move'); } catch (e) {}
        watchPage(); [60, 400, 1200].forEach(ms => setTimeout(guessRow, ms));
    }
    function guessRow() {
        const sc = D.querySelector('#tab-move #mv-screen .mv-head'); if (!sc) return;
        let r = sc.parentNode.querySelector(':scope > .wm-guess-row');
        if (!r) {
            r = D.createElement('button'); r.type = 'button'; r.className = 'wm-guess-row';
            r.addEventListener('click', e => { e.preventDefault(); editSheet(); });
            sc.insertAdjacentElement('afterend', r);
        }
        const v = C.view(ledger(), dayKey()), n = v.estimates;
        const txt = T('Today\'s steps on Home: ', 'Schritte heute auf Home: ', 'Pasos de hoy en Home: ') + (v.level ? NAMES[v.level]() + ' · ' + HINTS[v.level]() : (n ? n + ' ' + (n === 1 ? T('older guess', 'ältere Schätzung', 'estimación antigua') : T('older guesses', 'ältere Schätzungen', 'estimaciones antiguas')) : T('nothing yet', 'noch nichts', 'nada aún')));
        const ed = T('Edit', 'Bearbeiten', 'Editar');
        if (r.dataset.t !== txt + ed) { r.dataset.t = txt + ed; r.innerHTML = '<span>' + esc(txt) + '</span><b>' + esc(ed) + '</b>'; r.setAttribute('aria-label', txt + ', ' + ed); }
    }
    let pageObs = null;
    function watchPage() {
        const p = D.getElementById('tab-move'); if (!p || pageObs) return;
        let q = 0;
        pageObs = new MutationObserver(() => { if (q) return; q = setTimeout(() => { q = 0; guessRow(); }, 80); });
        pageObs.observe(p, { childList: true, subtree: true });
    }
    function editSheet() {
        closeBloom(false);
        const R = W.LowiR2; if (!R || !R.sheet) return;
        const day = dayKey(), mine = C.estimates(ledger(), day), v = C.view(ledger(), day);
        const tm = ts => { const d = new Date(+ts || 0); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
        const rows = mine.length ? mine.map(e => '<li class="wm-row"><span><b>' + esc((NAMES[e.lvl] ? NAMES[e.lvl]() : label()) + (HINTS[e.lvl] ? ' · ' + HINTS[e.lvl]() : '')) + '</b><small>' + esc(tm(e.ts) + ' · ' + (+e.amt || 0) + ' XP') + '</small></span><button type="button" class="wm-rm" data-wm-rm="' + esc(e.eventId) + '">' + esc(T('Remove', 'Entfernen', 'Quitar')) + '</button></li>').join('')
            : '<li class="wm-row wm-empty">' + esc(T('No step range picked today.', 'Heute noch kein Schrittbereich gewählt.', 'Hoy aún no has elegido un rango de pasos.')) + '</li>';
        const html = '<div class="wm-sheet"><h3>' + esc(label() + (v.text ? ' · ' + v.text : '')) + '</h3>' +
            '<p class="wm-why">' + esc(T('Casual (under 5,000), Steady (5,000 to 9,999) or Epic (10,000 or more) is today\'s step total from your own phone\'s step counter. LOWiSPIKE does not count or check steps, so it is your word, not a measurement. One range a day: tapping another changes today\'s, it never adds a second walk. Epic fills today\'s Move share of Misty\'s energy.',
                'Locker (unter 5.000), Stetig (5.000 bis 9.999) oder Episch (10.000 oder mehr) ist deine Schrittzahl von heute aus dem Schrittzähler deines Handys. LOWiSPIKE zählt und prüft keine Schritte, es ist also dein Wort, keine Messung. Ein Bereich pro Tag: Tippst du einen anderen, ändert sich der von heute, es kommt nie ein zweiter Weg dazu. Episch füllt den Bewegungsanteil von Mistys Energie für heute.',
                'Tranquilo (menos de 5.000), Constante (de 5.000 a 9.999) o Épico (10.000 o más) es tu total de pasos de hoy según el contador de tu móvil. LOWiSPIKE no cuenta ni comprueba pasos, así que es tu palabra, no una medida. Un rango al día: si tocas otro, cambia el de hoy, nunca suma otro paseo. Épico llena la parte de Movimiento de la energía de Misty hoy.')) + '</p>' +
            (v.fromMovePage ? '<p class="wm-why">' + esc(T('A workout or steps from the Move page already fill today.', 'Ein Training oder Schritte von der Bewegungsseite füllen heute schon alles.', 'Un entrenamiento o pasos de la página Movimiento ya llenan hoy.')) + '</p>' : '') +
            '<ul class="wm-list">' + rows + '</ul></div>';
        const ov = R.sheet(html, { cls: 'wm-sheet-ov' });
        if (!ov) return;
        ov.addEventListener('click', e => {
            const btn = e.target.closest && e.target.closest('[data-wm-rm]'); if (!btn) return;
            e.preventDefault();
            const br = bridge(); if (!br || !br.unaward) return;
            const before = energy(), amt = br.unaward(btn.dataset.wmRm), after = energy();
            const row = btn.closest('li'); if (row) row.remove();
            paint();
            const dE = before == null || after == null ? null : Math.round((after - before) * 100);
            float(T('Removed', 'Entfernt', 'Quitado') + ' · -' + (amt || 0) + ' XP' + (dE ? ' · ' + dE + '% ' + T('energy', 'Energie', 'energía') : ''), true);
            const h = ov.querySelector('.wm-sheet h3'); if (h) { const t2 = C.view(ledger(), dayKey()).text; h.textContent = label() + (t2 ? ' · ' + t2 : ''); }
            if (!ov.querySelector('[data-wm-rm]')) { const ul = ov.querySelector('.wm-list'); if (ul) ul.innerHTML = '<li class="wm-row wm-empty">' + esc(T('No step range picked today.', 'Heute noch kein Schrittbereich gewählt.', 'Hoy aún no has elegido un rango de pasos.')) + '</li>'; }
        });
    }

    /* ---------- life cycle ---------- */
    let queued = 0;
    const soon = () => { if (queued) return; queued = requestAnimationFrame(() => { queued = 0; try { paint(); } catch (e) {} }); };
    const placeSoon = () => requestAnimationFrame(() => { try { place(); } catch (e) {} });
    function boot() {
        paint();
        setTimeout(watchPage, 0);
        let tries = 0; const wait = () => { if ((el && el.isConnected) || ++tries > 40) return; paint(); setTimeout(wait, 400); }; setTimeout(wait, 400);
        ['lowi:reward', 'lowi:state', 'lowi:lang', 'lowi:layout', 'storage', 'focus'].forEach(n => W.addEventListener(n, soon));
        D.addEventListener('visibilitychange', () => { if (!D.hidden) soon(); });
        /* the HUD can be rebuilt; re-attach, and repaint after midnight (fill goes back to 0/4) */
        timer = setInterval(() => { if (D.hidden) return; if (!el || !el.isConnected || dayKey() !== lastDay) paint(); place(); }, 15000);
        if (W.MutationObserver) { const hud = D.getElementById('whHud'); const target = hud || D.body; new MutationObserver(() => { if (!el || !el.isConnected) soon(); }).observe(target, { childList: true }); }
        W.addEventListener('resize', () => { if (bloom) closeBloom(false); placeSoon(); setTimeout(placeSoon, 400); });
        W.addEventListener('orientationchange', () => setTimeout(placeSoon, 300));
        W.addEventListener('lowi:layout', placeSoon);
        W.addEventListener('lowi:clean-view', e => { if (!(e.detail && e.detail.on)) setTimeout(placeSoon, 520); });   /* back from the clean flight view: catch up on a turn or resize */
        [300, 1200, 3000].forEach(ms => setTimeout(placeSoon, ms));
    }
    W.LowiMoveBubble = { paint, open: openBloom, close: closeBloom, edit: editSheet, page: openPage, pick: (id) => pick(id, null), el: () => ensure() };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0), { once: true }); else setTimeout(boot, 0);
})();
