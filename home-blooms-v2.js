/* home-blooms-v2.js (Oct 18, 2026, E-man's eight-bubble Home: "tapping a bubble blooms its options out, away from Misty,
   Misty never covered" and plain words, no confusing "Again" / "Photo").
   The bloom actions for four of the habit bubbles on the new Home ring. Adapters only: every button calls an action the app
   already has, nothing new is stored, no backend call is made here.
   - Fuel (Oct 18 evening, E-man: "only Shop and Cook, plus a meal log button you can actually see"; Swap removed for good,
           Today's step left Fuel with it):
            Shop         -> the "What can I buy here?" panel (LowiStorePicks.open), the same place the old Snack orb went.
            Cook         -> the Cook tab (LowiHost.go('shelf')). The right-side Cook panel is a separate, later change.
            Log meal     -> the meal log sheet (LowiSpirit.meal: photo, barcode, recent meals), now a visible orb.
            Hold Fuel    -> still the meal log sheet, as a shortcut only.
   - Water: +1 cup       -> LowiSpirit.water() (same as the old Water cell: one cup, XP through the existing per-day cap).
            Undo         -> takes ONE cup off today (never below 0, never another day) and, if today's water XP entries are now
                            more than today's cups, takes back the newest one (unaward), so add / undo loops net zero.
   - Move:  Quick / Medium / Long / Epic -> LowiMoveBubble.pick(id) (the existing estimate log with its own XP rules).
            Hold Move    -> LowiMoveBubble.edit() (today's moves, remove one).
   - Gap:   no bloom since Oct 21 (Scan / Fuel / Gap): a tap opens the passive Gap view (gap-view.js). Meals are logged in Fuel,
            which restarts the gap; the old "I just ate" / "Ate earlier" pair is gone from Home.
            Shown as time since your last meal. No goal, no "you must fast" text in the bloom.
   An action whose module is missing is left out of the bloom (never a dead button).
   Geometry: the orbs fan out along the line Misty -> bubble. If that side has no room (a bubble at the screen edge) the fan
   turns until every orb fits on screen and none touches Misty's circle. Only one bloom is open at a time.
   API: window.LowiHomeBloomsV2 = { mount(root, opts), unmount(), open(kind), close(), isOpen(), core }.
   Contract with the shell (COORD-eight-home.md): bubbles carry data-orbit="fuel|water|move|gap", root is #spHome. */
(function (root) {
    'use strict';

    /* ---------------- pure part (also loaded by node tests) ---------------- */
    const KINDS = ['fuel', 'water', 'move', 'gap'];
    const WATER_GOAL = 6; /* same as spirit.js WATER_GOAL (E-man: six cups a day) */

    function dayKey(t) { const d = new Date(t == null ? Date.now() : t); const p = n => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }

    /* elapsed time since the last meal, in plain words: "3 h 12 m" / "45 m" */
    function gapText(start, now) {
        if (!start || !(start > 0)) return '';
        const ms = Math.max(0, (now || Date.now()) - start), m = Math.floor(ms / 60000), h = Math.floor(m / 60);
        if (h >= 48) return Math.floor(h / 24) + ' d ' + (h % 24) + ' h';
        return h ? h + ' h ' + (m % 60) + ' m' : m + ' m';
    }

    /* Water Undo plan: what to change so today goes down by exactly one cup and XP never stays above the cups.
       f = lowi_fast_v1 object, ledger = app ledger, day = today's key.
       Returns null when there is nothing to undo, else {f (new object), unaward: [eventId, ...]} */
    function waterUndo(f, ledger, day) {
        f = f && typeof f === 'object' ? f : {};
        const cups = Math.max(0, Math.floor(+((f.water || {})[day]) || 0));
        if (cups <= 0) return null;
        const out = JSON.parse(JSON.stringify(f));
        out.water = out.water || {};
        out.water[day] = cups - 1;
        /* the newest water event of today goes with it (keeps waterEvents and the count telling the same story) */
        const ev = out.waterEvents && typeof out.waterEvents === 'object' ? out.waterEvents : null;
        if (ev) {
            let best = null;
            Object.keys(ev).forEach(k => { const ts = +ev[k] || 0; if (ts && dayKey(ts) === day && (!best || ts > best.ts)) best = { k, ts }; });
            if (best) delete ev[best.k];
        }
        const pre = 'herb-care:' + day + ':water:';
        const xp = (Array.isArray(ledger) ? ledger : []).filter(e => e && e.day === day && e.src === 'water' && e.eventId && String(e.eventId).indexOf(pre) === 0)
            .sort((a, b) => (+b.ts || 0) - (+a.ts || 0));
        const extra = Math.max(0, xp.length - (cups - 1));
        return { f: out, cups: cups - 1, unaward: xp.slice(0, extra).map(e => e.eventId) };
    }

    /* Fan layout. b = bubble {x,y,r}, m = Misty {x,y,r}, n orbs of size orb, viewport vw x vh.
       Returns {pts:[{x,y}], angle, rot} with every orb inside the screen (margin) and outside Misty's circle when possible. */
    function layout(b, m, n, orb, vw, vh, opts) {
        opts = opts || {};
        const margin = opts.margin == null ? 6 : opts.margin, gap = opts.gap == null ? 14 : opts.gap;
        const half = orb / 2;
        const base = Math.atan2(b.y - m.y, b.x - m.x);
        const out = isFinite(base) && (b.x !== m.x || b.y !== m.y) ? base : -Math.PI / 2;
        const tries = [0];
        for (let k = 1; k <= 18; k++) tries.push(k * 0.175, -k * 0.175);
        const d0 = b.r + half + gap, dists = [d0, d0 + orb * 0.5, d0 + orb, d0 + orb * 1.6];
        const lo = half + margin, hiX = vw - half - margin, hiY = vh - half - margin;
        const clampX = x => Math.max(lo, Math.min(hiX, x)), clampY = y => Math.max(lo, Math.min(hiY, y));
        const keep = m.r > 0 ? m.r + half + 4 : 0;
        const score = (pts, rot, d) => {
            let mistyHit = 0, overlap = 0;
            pts.forEach(p => { if (keep) { const dm = Math.hypot(p.x - m.x, p.y - m.y); if (dm < keep) mistyHit += keep - dm; } });
            for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const o = orb + 2 - Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y); if (o > 0) overlap += o; }
            return { mistyHit, overlap, cost: mistyHit * 1000 + overlap * 60 + Math.abs(rot) * 12 + (d - d0) * 0.4 };
        };
        let best = null;
        for (const d of dists) {
            const step = Math.min(1.0, (orb + 10) / d);
            for (const rot of tries) {
                const a0 = out + rot;
                let pts = [];
                for (let i = 0; i < n; i++) {
                    const a = a0 + (i - (n - 1) / 2) * step;
                    pts.push({ x: clampX(b.x + Math.cos(a) * d), y: clampY(b.y + Math.sin(a) * d) });
                }
                /* relax: push orbs off each other and off Misty, stay on screen */
                for (let it = 0; it < 40; it++) {
                    let moved = false;
                    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
                        const dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y, dd = Math.hypot(dx, dy) || 0.01, o = orb + 4 - dd;
                        if (o > 0) { const ux = dx / dd, uy = dy / dd; pts[i].x -= ux * o / 2; pts[i].y -= uy * o / 2; pts[j].x += ux * o / 2; pts[j].y += uy * o / 2; moved = true; }
                    }
                    pts.forEach(p => {
                        if (keep) { const dx = p.x - m.x, dy = p.y - m.y, dd = Math.hypot(dx, dy) || 0.01; if (dd < keep + 2) { p.x = m.x + dx / dd * (keep + 2); p.y = m.y + dy / dd * (keep + 2); moved = true; } }
                        p.x = clampX(p.x); p.y = clampY(p.y);
                    });
                    if (!moved) break;
                }
                const s = score(pts, rot, d);
                if (!best || s.cost < best.cost) best = { pts, angle: a0, rot, dist: d, cost: s.cost, mistyHit: s.mistyHit, overlap: s.overlap };
                if (!s.mistyHit && !s.overlap && rot === 0 && d === d0) return best;
            }
        }
        return best;
    }

    /* where the Move note goes (bug hunt BH-005, Oct 19): s = its size {w, h}, first = the spot beyond the orbs (centre), obs = rects it
       must never cover (ring bubbles, Misty, the joystick, the bloom's own orbs), view = {w, h, top}, orbs = the box around the orbs.
       On a phone Move sits at the right edge, so "beyond the orbs, away from Misty" is off screen and clamping it back put the note on
       the Move bubble. Now: the first spot when it is clear; else just above, below or beside the orbs; else docked at the top or bottom of the
       screen (dock: true); with nothing clear, the least covered of those. Always fully on screen. Centre coordinates. */
    function noteSpot(s, first, obs, view, orbs) {
        const m = 8, top = Math.max(8, (view && view.top) || 8);
        const cx = x => Math.max(m + s.w / 2, Math.min(view.w - m - s.w / 2, x));
        const cy = y => Math.max(top + s.h / 2, Math.min(view.h - m - s.h / 2, y));
        const list = (obs || []).filter(Boolean);
        const cost = p => list.reduce((c, o) => c + Math.max(0, Math.min(p.x + s.w / 2, o.right) - Math.max(p.x - s.w / 2, o.left)) *
            Math.max(0, Math.min(p.y + s.h / 2, o.bottom) - Math.max(p.y - s.h / 2, o.top)), 0);
        const p0 = { x: cx(first.x), y: cy(first.y), dock: false };
        if (!cost(p0)) return p0;
        const cand = [];
        if (orbs) {
            const ox = cx((orbs.left + orbs.right) / 2), oy = cy(first.y);
            cand.push({ x: ox, y: cy(orbs.top - 8 - s.h / 2), dock: false }, { x: ox, y: cy(orbs.bottom + 8 + s.h / 2), dock: false },
                { x: cx(orbs.right + 8 + s.w / 2), y: oy, dock: false }, { x: cx(orbs.left - 8 - s.w / 2), y: oy, dock: false });
        }
        const dx = cx(view.w / 2);
        cand.push({ x: dx, y: cy(Math.max(56, top + 8) + s.h / 2), dock: true }, { x: dx, y: cy(view.h - 28 - s.h / 2), dock: true });
        let best = null;
        for (const c of cand) { const k = cost(c); if (!k) return c; if (!best || k < best.k) best = { c, k }; }
        return best.c;
    }

    const core = { KINDS, WATER_GOAL, dayKey, gapText, waterUndo, layout, noteSpot };
    if (typeof module === 'object' && module.exports) { module.exports = core; return; }
    if (!root || !root.document) return;

    /* ---------------- page part ---------------- */
    const W = root, D = W.document;
    if (W.LowiHomeBloomsV2) return;

    if (!D.getElementById('hb2Css')) {
        const me = D.currentScript, q = me && me.src && me.src.indexOf('?') > 0 ? me.src.slice(me.src.indexOf('?')) : '';
        const l = D.createElement('link'); l.id = 'hb2Css'; l.rel = 'stylesheet'; l.href = 'home-blooms-v2.css' + q; D.head.appendChild(l);
    }

    const li = () => { let l = 'en'; try { l = (W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || D.documentElement.lang || 'en'; } catch (e) { } l = String(l).slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const T = (en, de, es) => [en, de, es][li()];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const buzz = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { } };
    const toast = msg => { try { if (W.LowiR2 && W.LowiR2.toast) W.LowiR2.toast(msg); else if (typeof W.toast === 'function') W.toast(msg); } catch (e) { } };
    const fn = (o, k) => !!(o && typeof o[k] === 'function');

    /* drawn icons, white line art, no emoji */
    const P = {
        shop: '<path d="M5 8h14l-1.4 10.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M12 11.5v3.5"/><circle cx="12" cy="17" r=".6"/>',
        log: '<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9 8.5h6M9 12h6M9 15.5h3"/>',
        cook: '<path d="M4 11h16v2a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/><path d="M2 11h2M20 11h2"/><path d="M9 7c0-1 1-1.5 1-2.5M13 7c0-1 1-1.5 1-2.5"/>',
        cup: '<path d="M6 4h12l-1.6 15a2 2 0 0 1-2 1.8H9.6a2 2 0 0 1-2-1.8z"/><path d="M6.6 9.5h10.8"/><path d="M12 12.5v4M10 14.5h4"/>',
        undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
        walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M11 21l2-6-2.5-2.5L12 8l3 3h3"/><path d="M10.5 12.5L8 15H5"/>',
        ate: '<path d="M7 3v8a2 2 0 0 0 2 2v8M7 3v5M11 3v8a2 2 0 0 1-2 2"/><path d="M17 3c-2 2-2.5 5-2.5 7.5H17V21"/>',
        clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/><path d="M4.5 4.5l2 2"/>'
    };
    const svg = k => '<svg class="hb2-ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (P[k] || '') + '</svg>';

    /* ---------- readers (no writes) ---------- */
    const fastStore = () => { try { return JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}') || {}; } catch (e) { return {}; } };
    const cupsToday = () => Math.max(0, Math.floor(+((fastStore().water || {})[dayKey()]) || 0));
    const appState = () => { try { return W.LowiVitalsBridge && W.LowiVitalsBridge.state ? W.LowiVitalsBridge.state() : null; } catch (e) { return null; } };
    const moveView = () => { try { const C = W.LowiMoveEstimateCore, s = appState(); return C && fn(C, 'view') && s ? C.view(s.ledger || [], dayKey()) : null; } catch (e) { return null; } };

    /* ---------- actions (each one calls an existing module) ---------- */
    function waterUndoNow() {
        const s = appState();
        const plan = waterUndo(fastStore(), s && s.ledger, dayKey());
        if (!plan) return false;
        try { localStorage.setItem('lowi_fast_v1', JSON.stringify(plan.f)); } catch (e) { return false; }
        plan.unaward.forEach(id => { try { if (fn(W.LowiVitalsBridge, 'unaward')) W.LowiVitalsBridge.unaward(id); } catch (e) { } });
        try { if (fn(W.LowiFast, 'refresh')) W.LowiFast.refresh(); } catch (e) { }
        try { if (fn(W.LowiSpirit, 'refresh')) W.LowiSpirit.refresh(); } catch (e) { }
        try { W.dispatchEvent(new CustomEvent('lowi:water', { detail: { undo: true, cups: plan.cups } })); } catch (e) { }
        return true;
    }
    function mealLog() { if (fn(W.LowiSpirit, 'meal')) { W.LowiSpirit.meal(); return true; } return false; }

    const MOVE_NAMES = { quick: () => T('Quick', 'Kurz', 'Rápido'), medium: () => T('Medium', 'Mittel', 'Medio'), long: () => T('Long', 'Lang', 'Largo'), epic: () => T('Epic', 'Episch', 'Épico') };
    const MOVE_HINTS = { quick: () => T('kitchen, loo', 'Küche, Bad', 'cocina, baño'), medium: () => T('shop, bus stop', 'Laden, Bus', 'tienda, bus'), long: () => T('to work, school', 'Arbeit, Schule', 'trabajo, cole'), epic: () => T('big walk, ride', 'große Tour', 'gran paseo') };

    /* the orbs for one bubble: [{id, label, sub, icon, run, keep, disabled, q}] (missing modules -> left out) */
    function actionsFor(kind) {
        const A = [];
        if (kind === 'fuel') {
            /* only Shop, Cook and a visible meal log (E-man, Oct 18): no Swap, no Today's step */
            if (fn(W.LowiStorePicks, 'open')) A.push({ id: 'shop', label: T('Shop', 'Einkaufen', 'Comprar'), sub: T('what to buy', 'was kaufen?', '¿qué compro?'), icon: 'shop', run: () => W.LowiStorePicks.open('home-bloom') });
            if (fn(W.LowiHost, 'go')) A.push({ id: 'cook', label: T('Cook', 'Kochen', 'Cocinar'), sub: T('recipes', 'Rezepte', 'recetas'), icon: 'cook', run: () => W.LowiHost.go('shelf') });
            if (fn(W.LowiSpirit, 'meal')) A.push({ id: 'log', label: T('Log meal', 'Mahlzeit eintragen', 'Anotar comida'), icon: 'log', run: mealLog });
        } else if (kind === 'water') {
            const n = cupsToday();
            if (fn(W.LowiSpirit, 'water') || fn(W.LowiVitalsBridge, 'water')) A.push({ id: 'add', label: T('+1 cup', '+1 Glas', '+1 vaso'), sub: n + ' / ' + WATER_GOAL, icon: 'cup', keep: true, q: Math.min(1, n / WATER_GOAL),
                run: () => { if (fn(W.LowiSpirit, 'water')) W.LowiSpirit.water(); else W.LowiVitalsBridge.water('hb2-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)); } });
            A.push({ id: 'undo', label: T('Undo', 'Zurück', 'Deshacer'), sub: n ? T('take 1 cup off', '1 Glas weg', 'quitar 1 vaso') : T('nothing yet', 'noch nichts', 'nada aún'), icon: 'undo', keep: true, disabled: !n,
                run: () => { if (!waterUndoNow()) toast(T('No water logged today', 'Heute noch kein Wasser', 'Hoy no hay agua')); } });
        } else if (kind === 'move') {
            const C = W.LowiMoveEstimateCore;
            if (fn(W.LowiMoveBubble, 'pick') && C && Array.isArray(C.LEVELS)) C.LEVELS.forEach(L => {
                if (!MOVE_NAMES[L.id]) return;
                A.push({ id: L.id, label: MOVE_NAMES[L.id](), sub: MOVE_HINTS[L.id](), icon: 'walk', q: L.q / 4, run: () => W.LowiMoveBubble.pick(L.id) });
            });
        }
        return A;
    }
    const TITLES = { fuel: () => T('Fuel', 'Essen', 'Comida'), water: () => T('Water', 'Wasser', 'Agua'), move: () => T('Move', 'Bewegung', 'Movimiento'), gap: () => T('Meal gap', 'Essenspause', 'Pausa') };

    /* ---------- DOM ---------- */
    const st = { root: null, mounted: false, bind: true, open: null, ov: null, src: null, hold: null, swallow: 0 };
    const bubbleOf = t => {
        if (!st.mounted || !t || !t.closest) return null;
        const el = t.closest('[data-orbit]');
        if (!el || KINDS.indexOf(el.getAttribute('data-orbit')) < 0) return null;
        if (st.root && st.root !== D && !st.root.contains(el)) return null;
        if (st.ov && st.ov.contains(el)) return null;
        return el;
    };
    function mistyCircle() {
        const scope = st.root && st.root !== D ? st.root : D;
        const el = scope.querySelector('[data-orbit="misty"]') || D.querySelector('[data-orbit="misty"]') || D.getElementById('spBubble');
        const vw = W.innerWidth || 390, vh = W.innerHeight || 844;
        if (el) { const r = el.getBoundingClientRect(); if (r.width && r.height) return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.max(r.width, r.height) / 2 }; }
        return { x: vw / 2, y: vh / 2, r: Math.min(vw, vh) * 0.16 };
    }

    function render(kind, src) {
        const acts = actionsFor(kind);
        const r = src.getBoundingClientRect();
        const vw = W.innerWidth || 390, vh = W.innerHeight || 844;
        const orb = Math.round(Math.max(64, Math.min(84, Math.min(vw, vh) * 0.19)));
        const b = { x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.max(r.width, r.height) / 2 };
        const m = mistyCircle();
        const L = layout(b, m, Math.max(1, acts.length), orb, vw, vh);
        const ov = st.ov || D.createElement('div');
        ov.id = 'hb2Bloom';
        ov.className = 'hb2-bloom hb2-' + kind + (st.ov ? ' on' : '');
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-label', TITLES[kind]());
        ov.dataset.kind = kind;
        ov.style.setProperty('--hb2-orb', orb + 'px');
        ov.innerHTML = '<button type="button" class="hb2-scrim" data-hb2="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '"></button>' +
            acts.map((a, i) => { const p = L.pts[i]; return '<button type="button" class="hb2-orb hb2-' + a.id + '" data-hb2="act" data-id="' + a.id + '"' + (a.disabled ? ' disabled aria-disabled="true"' : '') +
                ' style="left:' + Math.round(p.x) + 'px;top:' + Math.round(p.y) + 'px;--hb2-dx:' + Math.round(b.x - p.x) + 'px;--hb2-dy:' + Math.round(b.y - p.y) + 'px;--hb2-i:' + i + (a.q != null ? ';--hb2-q:' + a.q : '') + '"' +
                ' aria-label="' + esc(a.label + (a.sub ? ', ' + a.sub : '')) + '">' + (a.q != null ? '<span class="hb2-fill" aria-hidden="true"></span>' : '') +
                '<span class="hb2-tx">' + svg(a.icon) + '<b>' + esc(a.label) + '</b>' + (a.sub ? '<small>' + esc(a.sub) + '</small>' : '') + '</span></button>'; }).join('') +
            (kind === 'move' ? moveNote(L.pts, orb, b, m, vw, vh) : '');
        ov.__acts = acts;
        ov.__layout = { pts: L.pts, bubble: b, misty: m, orb, rot: L.rot };
        return ov;
    }
    function moveNote(pts, orb, b, m, vw, vh) {
        const v = moveView();
        if (!v) return '';
        const txt = v.q >= v.full ? T('Move is full for today. Nice!', 'Bewegung ist heute voll. Stark!', 'Movimiento completo hoy. ¡Genial!') : T('How far did you walk? Your guess, not steps · ' + v.text + ' today', 'Wie weit bist du gelaufen? Geschätzt, keine Schritte · heute ' + v.text, '¿Cuánto has caminado? Tu cálculo, no pasos · hoy ' + v.text) /* Oct 21 grandma test: the note asks the question first */;
        /* the note sits on the far side of the orbs from Misty */
        let x = 0, y = 0; pts.forEach(p => { x += p.x; y += p.y; }); x /= pts.length; y /= pts.length;
        const a = Math.atan2(y - m.y, x - m.x); x += Math.cos(a) * (orb * 0.85); y += Math.sin(a) * (orb * 0.85);
        x = Math.max(110, Math.min(vw - 110, x)); y = Math.max(24, Math.min(vh - 24, y));
        return '<p class="hb2-note" style="left:' + Math.round(x) + 'px;top:' + Math.round(y) + 'px">' + esc(txt) + '</p>';
    }
    /* BH-005: once the note is in the page (so its real size is known), keep it off every ring bubble, Misty, the joystick (even
       faded), the Daily Quest and the bloom's own orbs (their resting spots, not mid-animation) */
    function placeNote(ov) {
        const n = ov && ov.querySelector('.hb2-note');
        if (!n) return;
        const s = { w: n.offsetWidth, h: n.offsetHeight };
        if (!s.w || !s.h) return;
        const vw = W.innerWidth || 390, vh = W.innerHeight || 844, pad = 4, obs = [];
        const add = r => obs.push({ left: r.left - pad, top: r.top - pad, right: r.right + pad, bottom: r.bottom + pad });
        D.querySelectorAll('[data-orbit], #whPad, #f3Board').forEach(e => {
            if (ov.contains(e)) return;
            const r = e.getBoundingClientRect();
            if (r.width < 4 || r.height < 4) return;
            if (e.id !== 'whPad' && e.checkVisibility && !e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return;
            add(r);
        });
        let orbs = null;
        const lay = ov.__layout;
        if (lay && lay.pts) {
            const h = lay.orb / 2;
            lay.pts.forEach(p => {
                const r = { left: p.x - h, top: p.y - h, right: p.x + h, bottom: p.y + h };
                add(r);
                orbs = orbs ? { left: Math.min(orbs.left, r.left), top: Math.min(orbs.top, r.top), right: Math.max(orbs.right, r.right), bottom: Math.max(orbs.bottom, r.bottom) } : r;
            });
            if (lay.misty) add({ left: lay.misty.x - lay.misty.r, top: lay.misty.y - lay.misty.r, right: lay.misty.x + lay.misty.r, bottom: lay.misty.y + lay.misty.r });
        }
        let sat = 0; try { sat = parseFloat(getComputedStyle(D.documentElement).getPropertyValue('--sat')) || 0; } catch (e) { }
        const p = noteSpot(s, { x: parseFloat(n.style.left) || 0, y: parseFloat(n.style.top) || 0 }, obs, { w: vw, h: vh, top: 8 + sat }, orbs);
        n.style.left = Math.round(p.x) + 'px'; n.style.top = Math.round(p.y) + 'px';
        n.classList.toggle('hb2-note-dock', !!p.dock);
    }

    function open(kind, src) {
        if (KINDS.indexOf(kind) < 0) return false;
        if (!src) { const scope = st.root && st.root !== D ? st.root : D; src = scope.querySelector('[data-orbit="' + kind + '"]'); }
        if (!src || !src.getBoundingClientRect().width) return false;
        if (st.open) close(true);
        try { if (fn(W.LowiMoveBubble, 'close')) W.LowiMoveBubble.close(false); } catch (e) { }
        st.ov = null;
        const ov = render(kind, src);
        D.body.appendChild(ov);
        try { placeNote(ov); } catch (e) { }
        st.ov = ov; st.open = kind; st.src = src;
        src.classList.add('hb2-src'); src.setAttribute('aria-expanded', 'true');
        D.documentElement.classList.add('hb2-open');
        buzz(8);
        const show = () => { ov.classList.add('on'); const f = ov.querySelector('.hb2-orb:not([disabled])'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { } };
        /* flush the folded start state, then open (no rAF: WebKit can hold frames back while the 3D world is busy) */
        void ov.offsetWidth; show();
        ov.addEventListener('click', onBloomClick);
        ov.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
        try { D.dispatchEvent(new CustomEvent('lowi:bloom-v2', { detail: { kind, open: true, owner: 'blooms' } })); } catch (e) { }
        return true;
    }
    function refreshOpen() {
        if (!st.open || !st.ov || !st.src) return;
        const kind = st.open, focusId = (D.activeElement && D.activeElement.dataset && D.activeElement.dataset.id) || '';
        render(kind, st.src);
        try { placeNote(st.ov); } catch (e) { }
        const f = focusId && st.ov.querySelector('[data-id="' + focusId + '"]');
        if (f && !f.disabled) try { f.focus({ preventScroll: true }); } catch (e) { }
    }
    function close(now, chosen) {
        const ov = st.ov, kind = st.open;
        if (!ov) return false;
        st.ov = null; st.open = null;
        if (st.src) { st.src.classList.remove('hb2-src'); st.src.setAttribute('aria-expanded', 'false'); }
        st.src = null;
        D.documentElement.classList.remove('hb2-open');
        if (chosen) { const c = ov.querySelector('[data-id="' + chosen + '"]'); if (c) c.classList.add('hb2-chosen'); }
        if (now || reduced()) ov.remove();
        else { ov.classList.remove('on'); ov.classList.add('off'); setTimeout(() => ov.remove(), 340); }
        try { D.dispatchEvent(new CustomEvent('lowi:bloom-v2', { detail: { kind, open: false, owner: 'blooms' } })); } catch (e) { }
        return true;
    }
    function onBloomClick(e) {
        const t = e.target.closest('[data-hb2]');
        if (!t || !st.ov) return;
        e.preventDefault(); e.stopPropagation();
        if (t.dataset.hb2 === 'close') { close(); return; }
        const a = (st.ov.__acts || []).find(x => x.id === t.dataset.id);
        if (!a || a.disabled) return;
        buzz(10);
        if (a.keep) { try { a.run(); } catch (err) { console.error(err); } refreshOpen(); return; }
        close(false, a.id);
        /* run after the bloom starts folding so a sheet opening from it is on top and gets the focus */
        setTimeout(() => { try { a.run(); } catch (err) { console.error(err); } }, 0);
    }

    /* taps and holds on the four bubbles (one window capture listener: runs before the old cell handlers) */
    const HOLD_MS = 550;
    function onDown(e) {
        const el = bubbleOf(e.target);
        if (!el) return;
        const kind = el.getAttribute('data-orbit');
        if (kind !== 'fuel' && kind !== 'move') return;
        clearTimeout(st.hold && st.hold.t);
        st.hold = { el, x: e.clientX, y: e.clientY, t: setTimeout(() => {
            st.hold = null; st.swallow = Date.now() + 900; buzz(20); close(true);
            if (kind === 'fuel') mealLog(); else if (fn(W.LowiMoveBubble, 'edit')) W.LowiMoveBubble.edit();
        }, HOLD_MS) };
    }
    function onMove(e) { if (st.hold && Math.hypot(e.clientX - st.hold.x, e.clientY - st.hold.y) > 12) { clearTimeout(st.hold.t); st.hold = null; } }
    function onUp() { if (st.hold) { clearTimeout(st.hold.t); st.hold = null; } }
    function onClick(e) {
        const el = bubbleOf(e.target);
        if (!el) return;
        e.preventDefault(); e.stopImmediatePropagation();
        if (Date.now() < st.swallow) return;
        const kind = el.getAttribute('data-orbit');
        /* Oct 21 Scan / Fuel / Gap (E-man: "gap is just like water and move or sleep... not formatted like a fasting app"): Gap has no
           actions any more. A tap opens the passive Gap view (gap-view.js); meals are logged in Fuel, which is what restarts the gap */
        if (kind === 'gap') { close(true); buzz(8); if (fn(W.LowiGapView, 'open')) W.LowiGapView.open(); return; }
        if (st.open === kind) close(); else open(kind, el);
    }
    function onKey(e) { if (st.open && e.key === 'Escape' && !(st.ov && st.ov.contains(e.target))) close(); }
    function onRelayout() { if (st.open) close(true); }
    function onData() { if (st.open === 'water' || st.open === 'move') refreshOpen(); }
    /* one bloom on Home at a time: the Sleep / Settings blooms (home-settings-sleep-v2) announce with owner 'settings-sleep' */
    function onOther(e) { const d = e && e.detail; if (d && d.open && d.owner && d.owner !== 'blooms' && st.open) close(true); }
    /* claim the four ring controls so the ring shell's fallback taps step aside (COORD-eight-home.md tap ownership) */
    function claim() {
        const scope = st.root || D;
        KINDS.forEach(k => { const el = scope.querySelector && scope.querySelector('[data-orbit="' + k + '"]'); if (el && el.dataset.o8Adapter !== 'blooms') el.dataset.o8Adapter = 'blooms'; });
    }
    /* the ring re-measured (Misty settling, menu bar switched): the open bloom follows its bubble instead of snapping shut */
    function onOrbit() { claim(); if (st.open) refreshOpen(); }

    function mount(r, opts) {
        opts = opts || {};
        const want = r || D;
        if (st.mounted) { st.root = want; return api; }
        st.root = want; st.mounted = true; st.bind = opts.bindTaps !== false;
        if (st.bind) {
            W.addEventListener('click', onClick, true);
            W.addEventListener('pointerdown', onDown, true);
            W.addEventListener('pointermove', onMove, true);
            W.addEventListener('pointerup', onUp, true);
            W.addEventListener('pointercancel', onUp, true);
        }
        D.addEventListener('keydown', onKey);
        D.addEventListener('lowi:home-orbit', onOrbit);
        D.addEventListener('lowi:bloom-v2', onOther);
        W.addEventListener('resize', onRelayout);
        ['lowi:water', 'lowi:reward', 'lowi:state'].forEach(n => W.addEventListener(n, onData));
        D.documentElement.classList.add('hb2-on');
        claim();
        return api;
    }
    function unmount() {
        if (!st.mounted) return api;
        close(true);
        W.removeEventListener('click', onClick, true);
        W.removeEventListener('pointerdown', onDown, true);
        W.removeEventListener('pointermove', onMove, true);
        W.removeEventListener('pointerup', onUp, true);
        W.removeEventListener('pointercancel', onUp, true);
        D.removeEventListener('keydown', onKey);
        D.removeEventListener('lowi:home-orbit', onOrbit);
        D.removeEventListener('lowi:bloom-v2', onOther);
        W.removeEventListener('resize', onRelayout);
        ['lowi:water', 'lowi:reward', 'lowi:state'].forEach(n => W.removeEventListener(n, onData));
        D.documentElement.classList.remove('hb2-on');
        st.mounted = false; st.root = null;
        return api;
    }

    const api = {
        mount, unmount, open: k => open(k), close: () => close(), isOpen: () => st.open,
        actions: k => actionsFor(k).map(a => ({ id: a.id, label: a.label, sub: a.sub, disabled: !!a.disabled })),
        layout: () => (st.ov && st.ov.__layout) || null,
        undoWater: waterUndoNow, core
    };
    W.LowiHomeBloomsV2 = api;
})(typeof window !== 'undefined' ? window : null);
