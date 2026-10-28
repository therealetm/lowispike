/* home-blooms-v2.js (Oct 18, 2026, E-man's eight-bubble Home: "tapping a bubble blooms its options out, away from Misty,
   Misty never covered" and plain words, no confusing "Again" / "Photo").
   The bloom actions for four of the habit bubbles on the new Home ring. Adapters only: every button calls an action the app
   already has, nothing new is stored, no backend call is made here.
   - Fuel (Oct 18 evening, E-man: "only Shop and Cook, plus a meal log button you can actually see"; Swap removed for good,
           Today's step left Fuel with it):
            Shop         -> the "What can I buy here?" panel (LowiStorePicks.open), the same place the old Snack orb went.
            Cook         -> the Cook tab (LowiHost.go('shelf')). The right-side Cook panel is a separate, later change.
            Log meal     -> the meal log sheet (LowiSpirit.meal: photo, barcode, recent meals), now a visible orb.
            Hold Fuel    -> nothing since Oct 28 2026 (food plan): the bubble is Einkaufen, one tap opens Shop (shop() below).
   - Water: Sips / Glass / Bottle -> LowiSpirit.water(kind) (wsip, Oct 23: estimates; XP 2 per whole glass, at most 6 glasses = 12 XP a day). Long press Water = undo the last one.
            Size         -> (Oct 24) steps the bottle size 0.33 / 0.5 / 0.75 / 1 / 1.5 l; the one thing this file stores (lowispike.water.bottle.v1 via LowiSpiritCore).
            Undo         -> takes ONE cup off today (never below 0, never another day) and, if today's water XP entries are now
                            more than today's cups, takes back the newest one (unaward), so add / undo loops net zero.
   - Move:  (Mirror orb removed Oct 23, Emmanuel: "remove mirror from the bubble")
            Casual / Steady / Epic -> LowiMoveBubble.pick(id): today's step range read off the phone's own step counter
            (under 5k / 5k-10k / 10k+, Oct 23 2026, Eman: "just like with sleep"). One range a day; the picked one shows as selected.
            Hold Move    -> LowiMoveBubble.page(): the full Move page (Oct 21, Eman). Today's moves are a row on that page.
   - Gap:   no bloom since Oct 21 (Scan / Fuel / Gap): a tap opens the passive Gap view (gap-view.js). Meals are logged in Fuel,
            which restarts the gap; the old "I just ate" / "Ate earlier" pair is gone from Home.
            Shown as time since your last meal. No goal, no "you must fast" text in the bloom.
   An action whose module is missing is left out of the bloom (never a dead button).
   Geometry: the orbs fan out along the line Misty -> bubble. If that side has no room (a bubble at the screen edge) the fan
   turns until every orb fits on screen and none touches Misty's circle. Only one bloom is open at a time.
   API: window.LowiHomeBloomsV2 = { mount(root, opts), unmount(), open(kind), openAll(), isAll(), close(), isOpen(), core }.
   Oct 23: one round, symmetrical layout + zoom-out from bloom-ring.js (LowiBloomRing.place / zoom / unzoom); two-finger tap on Misty -> openAll().
   Contract with the shell (COORD-eight-home.md): bubbles carry data-orbit="fuel|water|move|gap", root is #spHome. */
(function (root) {
    'use strict';

    /* ---------------- pure part (also loaded by node tests) ---------------- */
    const KINDS = ['fuel', 'water', 'move', 'gap'];
    /* Oct 28 2026 (Emmanuel, iPhone: "wenn du was änderst, dann musst du das doch überall ändern": "Ballaststoffe: noch 13 g" in
       the companion sheet still opened the old Einkaufen / Kochen / Mahlzeit orbs round the ring, hours after the Home tap became
       Einkaufen). THE one map of what each ring bubble does. Every path reads it: the Home tap, open(kind) from other modules (the
       companion sheet, the tutorial, deep links), the all-bubbles overview, and the tests. 'bloom' = its own orbs open round the
       ring; 'shop' = Einkaufen opens (Supermarkt); 'hub' = the Essenspause eating hub opens (log a meal, Kochen, today's meals).
       Change a bubble here and nowhere else. */
    const RING = Object.freeze({ fuel: 'shop', gap: 'hub', water: 'bloom', move: 'bloom', sleep: 'bloom' });
    const ringTarget = kind => RING[kind] || '';
    const BLOOMS = Object.keys(RING).filter(k => RING[k] === 'bloom');
    const WATER_GOAL = 6; /* same as spirit.js WATER_GOAL (E-man: six cups a day) */
    const SIPS_N = 10; /* Oct 24 2026: the Sips orb is ten sips (spirit-core WATER.amounts.sips, about half a cup, rough) */

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
        const q4 = n => Math.max(0, Math.round((+n || 0) * 4) / 4);
        const cups = q4((f.water || {})[day]);
        if (cups <= 0) return null;
        const out = JSON.parse(JSON.stringify(f));
        out.water = out.water || {};
        /* the newest water event of today goes with it (keeps waterEvents and the count telling the same story).
           wsip (Oct 23): it takes off its own amount (out.waterAmt[id]: ten sips 0.5 (a few sips 0.25 before Oct 24), bottle 3; no entry = one cup, as before) */
        let amt = 1, bottle = 0;
        const ev = out.waterEvents && typeof out.waterEvents === 'object' ? out.waterEvents : null;
        if (ev) {
            let best = null;
            Object.keys(ev).forEach(k => { const ts = +ev[k] || 0; if (ts && dayKey(ts) === day && (!best || ts > best.ts)) best = { k, ts }; });
            if (best) {
                delete ev[best.k];
                const am = out.waterAmt && typeof out.waterAmt === 'object' ? out.waterAmt : null;
                if (am && +am[best.k] > 0) { amt = q4(am[best.k]) || 1; delete am[best.k]; }
                /* Oct 24: a bottle remembers its size (out.waterBottle[id] = ml) so Undo can name it ("a bottle, 0.5 l") */
                const bt = out.waterBottle && typeof out.waterBottle === 'object' ? out.waterBottle : null;
                if (bt && bt[best.k] != null) { bottle = +bt[best.k] || 0; delete bt[best.k]; }
            }
        }
        const left = q4(cups - Math.min(cups, amt));
        out.water[day] = left;
        const pre = 'herb-care:' + day + ':water:';
        const xp = (Array.isArray(ledger) ? ledger : []).filter(e => e && e.day === day && e.src === 'water' && e.eventId && String(e.eventId).indexOf(pre) === 0)
            .sort((a, b) => (+b.ts || 0) - (+a.ts || 0));
        const extra = Math.max(0, xp.length - Math.floor(left + 1e-9));
        return { f: out, cups: left, amt: Math.min(cups, amt), bottle, unaward: xp.slice(0, extra).map(e => e.eventId) };
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

    /* Oct 24 (Lisa via Emmanuel: "Flasch" on one line, "e" on the next): labels wrap only between words. A single word wider
       than its orb shrinks in proportion instead, in half-pixel steps, never below `min` (10px). Pure: widths in, font size out. */
    function labelSize(wordPx, maxPx, base, min) {
        base = base || 12.5; min = min || 10;
        if (!(wordPx > 0) || !(maxPx > 0) || wordPx <= maxPx) return base;
        return Math.max(min, Math.floor(base * maxPx / wordPx * 2) / 2);
    }

    const core = { KINDS, RING, BLOOMS, ringTarget, WATER_GOAL, SIPS_N, dayKey, gapText, waterUndo, layout, noteSpot, labelSize };
    if (typeof module === 'object' && module.exports) { module.exports = core; return; }
    if (!root || !root.document) return;

    /* ---------------- page part ---------------- */
    const W = root, D = W.document;
    const ORB_ARM_MS = 400; /* BH-026, see onBloomClick */
    const now = () => (W.performance && W.performance.now) ? W.performance.now() : Date.now();
    /* when the finger touched: the event's own time stamp (same clock as performance.now), so a second tap that waited in the queue
       while the 3D world held the main thread still counts as the quick tap it was; anything odd falls back to now */
    const tapTime = e => { const n = now(), t = e && +e.timeStamp; return t > 0 && t <= n + 50 && n - t < 10000 ? t : n; };
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
        sips: '<path d="M12 4c-2.2 3-4 5.4-4 7.6a4 4 0 0 0 8 0C16 9.4 14.2 7 12 4z"/><path d="M7 17.5h.01M12 19.5h.01M17 17.5h.01"/>',
        bottle: '<path d="M10 2.5h4v3l1.6 2.2a3 3 0 0 1 .6 1.8V20a1.5 1.5 0 0 1-1.5 1.5h-5.4A1.5 1.5 0 0 1 7.8 20V9.5a3 3 0 0 1 .6-1.8L10 5.5z"/><path d="M8 12h8"/>',
        bsize: '<path d="M7.5 6h3v2.2l1.2 1.6a2 2 0 0 1 .4 1.2V19a1 1 0 0 1-1 1H6.9a1 1 0 0 1-1-1v-8a2 2 0 0 1 .4-1.2L7.5 8.2z"/><path d="M18 4v16M15.5 6.5L18 4l2.5 2.5M15.5 17.5L18 20l2.5-2.5"/>',
        walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M11 21l2-6-2.5-2.5L12 8l3 3h3"/><path d="M10.5 12.5L8 15H5"/>',
        ate: '<path d="M7 3v8a2 2 0 0 0 2 2v8M7 3v5M11 3v8a2 2 0 0 1-2 2"/><path d="M17 3c-2 2-2.5 5-2.5 7.5H17V21"/>',
        clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/><path d="M4.5 4.5l2 2"/>',
        cam: '<rect x="3" y="6.5" width="13" height="11" rx="3"/><path d="M16 10.5l5-3v9l-5-3"/>',
        moon: '<path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1z"/><path d="M15.5 4.5h3l-3 3.4h3"/>'
    };
    const svg = k => '<svg class="hb2-ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (P[k] || '') + '</svg>';

    /* ---------- readers (no writes) ---------- */
    const fastStore = () => { try { return (o => o && typeof o === "object" ? o : {})(JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}')); } catch (e) { return {}; } };
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
        return plan;
    }

    /* Oct 23 2026 (Eman): three step ranges like Sleep's three, "casual, steady and epic", under 5k, 5k-10k and 10k+ */
    const MOVE_NAMES = { casual: () => T('Casual', 'Locker', 'Tranquilo'), steady: () => T('Steady', 'Stetig', 'Constante'), epic: () => T('Epic', 'Episch', 'Épico') };
    /* Oct 24 2026 (Emmanuel, German Home: "repetitive two words", "words way too long and big", "minimal"): the small line is a
       number only, the same in every language, never a second word */
    const MOVE_HINTS = { casual: () => '<5k', steady: () => '5k\u201310k', epic: () => '10k+' };
    const MOVE_RANGES = { casual: () => T('under 5,000 steps', 'unter 5.000 Schritte', 'menos de 5.000 pasos'), steady: () => T('5,000 to 9,999 steps', '5.000 bis 9.999 Schritte', 'de 5.000 a 9.999 pasos'), epic: () => T('10,000 steps or more', '10.000 Schritte oder mehr', '10.000 pasos o más') };

    /* the orbs for one bubble: [{id, label, sub, icon, run, keep, disabled, q}] (missing modules -> left out) */
    function actionsFor(kind) {
        const A = [];
        /* Fuel brings no orbs any more (RING: 'shop'): the old Einkaufen / Kochen / Mahlzeit trio is gone everywhere (Oct 28 2026).
           Kochen and logging a meal live in the Essenspause hub, Einkaufen is the bubble itself. */
        if (ringTarget(kind) !== 'bloom') return A;
        if (kind === 'water') {
            /* wsip (Oct 23, Eman: "x amount of sip, or one cup, or one whole bottle"): three estimates, each tap fills the bubble by that much.
               Amounts live in LowiSpiritCore.WATER (ten sips 1/2 cup since Oct 24, cup, bottle 3 cups; 1 cup ~250 ml). Undo = long press on the Water bubble. */
            const can = fn(W.LowiSpirit, 'water') || fn(W.LowiVitalsBridge, 'water');
            /* Oct 24 2026 (Emmanuel: "Sips, so it's based on sips, like 10 sips, not milliliters"): no ml on the orbs. Sips is
               ten sips (a rough estimate, sip size varies, never a glass); Cup and Bottle need no number */
            const add = k => () => { if (fn(W.LowiSpirit, 'water')) W.LowiSpirit.water(k); else W.LowiVitalsBridge.water('hb2-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), k); };
            if (can) {
                A.push({ id: 'sips', label: T('Sips', 'Sips', 'Sorbos'), sub: '\u00d7' + SIPS_N, aria: T('10 sips, roughly', '10 Schlucke, ungefähr', '10 sorbos, más o menos'), icon: 'sips', keep: true, q: 0.2, run: add('sips') });
                A.push({ id: 'cup', label: T('Glass', 'Glas', 'Vaso'), aria: T('One glass', 'Ein Glas', 'Un vaso'), icon: 'cup', keep: true, q: 0.5, run: add('cup') });
                /* Oct 24 2026 (HANDOFF-hydration.md, bottle size picker): Bottle logs one finished bottle of the size you picked; its small
                   line is that size (a number, like every small line). Size steps through 0.33 / 0.5 / 0.75 / 1 / 1.5 l on each tap, no
                   sheet, remembered on this device (synced with the account). It is a setting, not a log, so the Hold Scan overview
                   (every bubble at once, 3 + 3 + 3 + 3) leaves it out: extra. */
                const K = W.LowiSpiritCore, bk = K && fn(K, 'bottleMl') && fn(K, 'bottleLitres');
                const bml = bk ? K.bottleMl() : 0, lit = bk ? K.bottleLitres(bml, ['en', 'de', 'es'][li()]) : '';
                A.push({ id: 'bottle', label: T('Bottle', 'Flasche', 'Botella'), sub: lit || undefined, aria: lit ? T('One whole bottle, ', 'Eine ganze Flasche, ', 'Una botella entera, ') + lit : T('One whole bottle', 'Eine ganze Flasche', 'Una botella entera'), icon: 'bottle', keep: true, q: 0.9, run: add('bottle') });
                if (bk) A.push({ id: 'bsize', extra: true, label: T('Size', 'Größe', 'Tamaño'), aria: T('Bottle size ', 'Flaschengröße ', 'Tamaño de botella ') + lit + T(', tap to change', ', tippen zum Ändern', ', toca para cambiar'), icon: 'bsize', keep: true,
                    run: () => { const n = K.setBottleMl(K.nextBottleMl(K.bottleMl())); toast(T('Bottle: ', 'Flasche: ', 'Botella: ') + K.bottleLitres(n, ['en', 'de', 'es'][li()])); } });
            }
        } else if (kind === 'move') {
            const C = W.LowiMoveEstimateCore;
            /* Oct 23 2026, 09:11 (Emmanuel: "remove mirror from the bubble"): the Mirror orb left the Move bloom; the bloom is the
               step ranges only, symmetrical. Mirror mode itself stays (Move page). */
            const v = moveView(), cur = v && v.level;
            if (fn(W.LowiMoveBubble, 'pick') && C && Array.isArray(C.LEVELS)) C.LEVELS.forEach(L => {
                if (!MOVE_NAMES[L.id]) return;
                A.push({ id: L.id, label: MOVE_NAMES[L.id](), sub: MOVE_HINTS[L.id](), aria: MOVE_NAMES[L.id]() + ', ' + MOVE_RANGES[L.id](), icon: 'walk', q: L.q / 4, on: cur === L.id, run: () => W.LowiMoveBubble.pick(L.id) });
            });
        } else if (kind === 'sleep') {
            /* Oct 23, 18:03 (Eman's iPhone: Sleep's three options sat as a loose row bottom left with a question line under them, "Sleeping
               isn't aligned"): Sleep blooms exactly like Fuel, Water and Move. Its three answers are bubbles on the same circle round
               Misty, short to long like Sips / Cup / Bottle, last night's answer is marked. Writing stays in home-settings-sleep-v2.js (LowiHomeSettingsSleepV2.sleep.set: same store, same XP, same event). */
            const S = W.LowiHomeSettingsSleepV2, SL = S && S.sleep;
            if (SL && fn(SL, 'set') && Array.isArray(S.BANDS)) {
                let cur = null; try { const t = fn(SL, 'today') ? SL.today() : null; cur = t && t.band; } catch (e) { }
                const TXl = S.TX && (S.TX[['en', 'de', 'es'][li()]] || S.TX.en);
                const short = { under6: '<6 h', '6to7': '6\u20137 h', '7plus': '7 h+' };
                S.BANDS.forEach(b => {
                    const lab = (TXl && TXl.short && TXl.short[b]) || short[b] || b;
                    const long = (TXl && TXl[b]) || lab;
                    const q = S.FILL && S.FILL[b] != null ? S.FILL[b] : ({ under6: 1 / 3, '6to7': 2 / 3, '7plus': 1 })[b];
                    /* Oct 24 2026 (Emmanuel: "letzte Nacht" x3 was the repetition): no subline (aria keeps it); nbsp keeps "6–7 Std." whole */
                    A.push({ id: 's-' + b, band: b, label: String(lab).replace(/ /g, '\u00a0'), aria: T('Sleep last night', 'Schlaf letzte Nacht', 'Sueño anoche') + ': ' + long, icon: 'moon', q, on: cur === b, run: () => SL.set(b) });
                });
            }
        }
        return A;
    }
    const TITLES = { fuel: () => T('Fuel', 'Essen', 'Comida'), water: () => T('Water', 'Wasser', 'Agua'), move: () => T('Move', 'Bewegung', 'Movimiento'), gap: () => T('Meal gap', 'Essenspause', 'Pausa'), sleep: () => T('Sleep', 'Schlaf', 'Sueño') };

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
    /* Oct 23, 18:03 (Eman: "every bubble needs to look like the bubble of our bubble style"): each orb gets Misty's own living membrane
       from LowiBubbles, the same one the Home bubbles wear. A re-draw (a tap on Sips) hands the membrane over (adopt), a fold
       lets it fade with the orb and then drops it. */
    const orbKey = el => (el.dataset.group || '') + '|' + (el.dataset.id || '');
    function orbMap(ov) { const m = {}; if (ov) ov.querySelectorAll('.hb2-orb[data-id]').forEach(el => { m[orbKey(el)] = el; }); return m; }
    function skin(ov, prev) {
        const LB = W.LowiBubbles;
        if (!LB || !fn(LB, 'add') || !ov) return;
        ov.querySelectorAll('.hb2-orb[data-id]').forEach(el => {
            const old = prev && prev[orbKey(el)];
            try { if (old && old !== el && fn(LB, 'adopt')) LB.adopt(old, el, { kind: 'orb' }); else LB.add(el, { kind: 'orb' }); } catch (e) { }
        });
        if (prev) Object.keys(prev).forEach(k => { const o = prev[k]; if (o && !o.isConnected && fn(LB, 'remove')) try { LB.remove(o); } catch (e) { } });
    }
    function unskin(ov) {
        const LB = W.LowiBubbles;
        if (!LB || !fn(LB, 'remove') || !ov) return;
        ov.querySelectorAll('.hb2-orb').forEach(el => { try { LB.remove(el); } catch (e) { } });
    }
    function mistyCircle() {
        const scope = st.root && st.root !== D ? st.root : D;
        const el = scope.querySelector('[data-orbit="misty"]') || D.querySelector('[data-orbit="misty"]') || D.getElementById('spBubble');
        const vw = W.innerWidth || 390, vh = W.innerHeight || 844;
        if (el) { const r = el.getBoundingClientRect(); if (r.width && r.height) return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.max(r.width, r.height) / 2 }; }
        return { x: vw / 2, y: vh / 2, r: Math.min(vw, vh) * 0.16 };
    }

    /* measure each orb label's widest single word once, when the bloom is in the page (no frame loop).
       Oct 24 2026 (Emmanuel: some bubbles had "one large word" next to squeezed ones): every orb of one bloom gets the SAME size,
       the size the longest word needs, so "Glas" never looks bigger than "Einkaufen". A non-breaking space keeps "6–7 Std." whole. */
    function fitLabels(ov) {
        if (!ov || !ov.isConnected) return;
        let meter = null, common = Infinity;
        const bs = [];
        ov.querySelectorAll('.hb2-tx b').forEach(b => {
            b.style.fontSize = '';
            const cs = getComputedStyle(b);
            const max = parseFloat(cs.maxWidth) || b.clientWidth;
            const words = (b.textContent || '').split(/[ \t\n]+/).filter(Boolean);
            if (!max || !words.length) return;
            if (!meter) { meter = D.createElement('span'); meter.setAttribute('aria-hidden', 'true'); meter.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0;font:inherit;letter-spacing:inherit'; }
            b.appendChild(meter);
            /* offsetWidth is the layout width: the orbs are still scaled down while they bloom, a transform must not count */
            let widest = 0;
            words.forEach(w => { meter.textContent = w; widest = Math.max(widest, meter.offsetWidth); });
            meter.remove();
            const base = parseFloat(cs.fontSize) || 12.5;
            const size = labelSize(widest + 1, max, base, 10);
            bs.push({ b, base });
            common = Math.min(common, size);
        });
        bs.forEach(x => { if (common < x.base) x.b.style.fontSize = common + 'px'; });
    }


    function render(kind, src) {
        const acts = actionsFor(kind);
        const r = src.getBoundingClientRect();
        const vw = W.innerWidth || 390, vh = W.innerHeight || 844;
        let orb = Math.round(Math.max(64, Math.min(84, Math.min(vw, vh) * 0.19)));
        const b = { x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.max(r.width, r.height) / 2 };
        const m = mistyCircle();
        let L = null, ring = null;
        /* Oct 23 (Emmanuel: "the Rundung symmetry"): the orbs sit on ONE circle round Misty, centred on their bubble's direction,
           one fixed spacing, and the view pulls back to make room (bloom-ring.js). The old fan is the fallback only. */
        try { const R = W.LowiBloomRing; ring = R && R.place && st.ring !== false ? R.place([{ key: kind, n: Math.max(1, acts.length) }]) : null; } catch (e) { ring = null; }
        if (ring && ring.orbs && ring.orbs.length === Math.max(1, acts.length)) {
            L = { pts: ring.orbs.map(p => ({ x: p.x, y: p.y, from: p.from })), rot: 0, ring };
            orb = ring.d;
            try { W.LowiBloomRing.zoom(ring.s, ring.c, 'blooms'); } catch (e) { }
        } else L = layout(b, m, Math.max(1, acts.length), orb, vw, vh);
        const ov = st.ov || D.createElement('div');
        ov.id = 'hb2Bloom';
        ov.className = 'hb2-bloom hb2-' + kind + (st.ov ? ' on' : '');
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-label', TITLES[kind]());
        ov.dataset.kind = kind;
        ov.style.setProperty('--hb2-orb', orb + 'px');
        const prevOrbs = orbMap(st.ov === ov ? ov : null);
        ov.innerHTML = '<button type="button" class="hb2-scrim" data-hb2="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '"></button>' +
            acts.map((a, i) => { const p = L.pts[i]; return '<button type="button" class="hb2-orb hb2-' + a.id + (a.on ? ' hb2-on' : '') + '" data-hb2="act" data-id="' + a.id + '"' + (a.disabled ? ' disabled aria-disabled="true"' : '') + (a.on != null ? ' aria-pressed="' + !!a.on + '"' : '') +
                ' style="left:' + Math.round(p.x) + 'px;top:' + Math.round(p.y) + 'px;--hb2-dx:' + Math.round((p.from || b).x - p.x) + 'px;--hb2-dy:' + Math.round((p.from || b).y - p.y) + 'px;--hb2-i:' + i + (a.q != null ? ';--hb2-q:' + a.q : '') + '"' +
                ' aria-label="' + esc(a.aria || (a.label + (a.sub ? ', ' + a.sub : ''))) + '">' + (a.q != null ? '<span class="hb2-fill" aria-hidden="true"></span>' : '') +
                '<span class="hb2-tx">' + svg(a.icon) + '<b>' + esc(a.label) + '</b>' + (a.sub ? '<small>' + esc(a.sub) + '</small>' : '') + '</span></button>'; }).join('') +
            (kind === 'move' ? moveNote(L.pts, orb, b, m, vw, vh) : '');
        skin(ov, prevOrbs);
        ov.__acts = acts;
        ov.__layout = { pts: L.pts, bubble: b, misty: m, orb, rot: L.rot, ring: L.ring ? { s: L.ring.s, rho: L.ring.rho, step: L.ring.step, c: L.ring.c } : null };
        return ov;
    }
    /* Oct 23 (Emmanuel: "when I tap my companion's bubble with two fingers, it should be a shortcut that opens all of them"):
       every bloom at once, one round of orbs on one circle round Misty, each group centred on its own bubble, same spacing everywhere,
       the view pulled back so nothing is cramped (bloom-ring.js solve). Gap has no orbs (a tap opens its view).
       Oct 23, 18:03 (Eman: "da fehlt doch was"): Sleep's three answers were missing, so the lower left stayed empty and the ring was a
       lopsided arc. Now all four groups (3 + 3 + 3 + 3) share ONE full circle, every orb the same angle from the next (solve even).
       Gap and Scan have no options (a tap opens the Gap view / the camera), Joy and Community open pages, so they bring no orbs. */
    const ALL = BLOOMS; /* Oct 28 2026: from the RING map, so Einkaufen (no orbs) is left out like Gap and Scan */
    function renderAll() {
        const R = W.LowiBloomRing;
        if (!R || !R.place) return null;
        const scope = st.root && st.root !== D ? st.root : D;
        const groups = [], acts = [];
        ALL.forEach(k => {
            const el = scope.querySelector('[data-orbit="' + k + '"]');
            if (!el || !el.getBoundingClientRect().width) return;
            const a = actionsFor(k).filter(x => !x.extra);
            if (!a.length) return;
            groups.push({ key: k, n: a.length });
            a.forEach(x => acts.push(Object.assign({ group: k }, x)));
        });
        if (!groups.length) return null;
        let ring = null;
        try { ring = R.place(groups, { even: true }); } catch (e) { ring = null; }
        if (!ring || !ring.orbs || ring.orbs.length !== acts.length) return null;
        /* solve() lists the orbs group by group in its own packed order: pair each with its action by group key + index */
        const byKey = {}; acts.forEach(a => { (byKey[a.group] = byKey[a.group] || []).push(a); });
        const pairs = ring.orbs.map(p => ({ p, a: byKey[p.key][p.i] }));
        const ov = st.ov || D.createElement('div');
        ov.id = 'hb2Bloom';
        ov.className = 'hb2-bloom hb2-all' + (st.ov ? ' on' : '');
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-label', T('All bubbles', 'Alle Bubbles', 'Todas las burbujas'));
        ov.dataset.kind = 'all';
        ov.style.setProperty('--hb2-orb', ring.d + 'px');
        const prevOrbs = orbMap(st.ov === ov ? ov : null);
        ov.innerHTML = '<button type="button" class="hb2-scrim" data-hb2="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '"></button>' +
            pairs.map(({ p, a }, i) => '<button type="button" class="hb2-orb hb2-' + a.id + (a.on ? ' hb2-on' : '') + '" data-hb2="act" data-id="' + a.id + '" data-group="' + a.group + '"' + (a.disabled ? ' disabled aria-disabled="true"' : '') + (a.on != null ? ' aria-pressed="' + !!a.on + '"' : '') +
                ' style="left:' + Math.round(p.x) + 'px;top:' + Math.round(p.y) + 'px;--hb2-dx:' + Math.round(p.from.x - p.x) + 'px;--hb2-dy:' + Math.round(p.from.y - p.y) + 'px;--hb2-i:' + i + (a.q != null ? ';--hb2-q:' + a.q : '') + '"' +
                ' aria-label="' + esc(TITLES[a.group]() + ': ' + (a.aria || (a.label + (a.sub ? ', ' + a.sub : '')))) + '">' + (a.q != null ? '<span class="hb2-fill" aria-hidden="true"></span>' : '') +
                '<span class="hb2-tx">' + svg(a.icon) + '<b>' + esc(a.label) + '</b>' + (a.sub ? '<small>' + esc(a.sub) + '</small>' : '') + '</span></button>').join('');
        skin(ov, prevOrbs);
        ov.__acts = pairs.map(x => x.a);
        ov.__layout = { pts: pairs.map(x => ({ x: x.p.x, y: x.p.y, key: x.p.key })), misty: mistyCircle(), orb: ring.d, rot: 0, all: true,
            ring: { s: ring.s, rho: ring.rho, step: ring.step, c: ring.c, groups: ring.groups.map(g => ({ key: g.key, n: g.n, a: g.a, c: g.c })) } };
        try { R.zoom(ring.s, ring.c, 'blooms'); } catch (e) { }
        return ov;
    }
    function openAll() {
        if (!st.mounted) return false;
        if (st.open) close(true);
        try { if (fn(W.LowiMoveBubble, 'close')) W.LowiMoveBubble.close(false); } catch (e) { }
        try { const S = W.LowiHomeSettingsSleepV2; if (S && typeof S.close === 'function') S.close(); } catch (e) { }
        st.ov = null;
        const ov = renderAll();
        if (!ov) return false;
        D.body.appendChild(ov);
        try { fitLabels(ov); } catch (e) { }
        st.ov = ov; st.open = 'all'; st.all = true; st.src = null; st.openedAt = now();
        D.documentElement.classList.add('hb2-open');
        buzz(8);
        void ov.offsetWidth; ov.classList.add('on');
        const f = ov.querySelector('.hb2-orb:not([disabled])'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { }
        ov.addEventListener('click', onBloomClick);
        swipeShut(ov);
        ov.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
        try { D.dispatchEvent(new CustomEvent('lowi:bloom-v2', { detail: { kind: 'all', open: true, owner: 'blooms' } })); } catch (e) { }
        return true;
    }
    function moveNote(pts, orb, b, m, vw, vh) {
        const v = moveView();
        if (!v) return '';
        /* Oct 21 grandma test: the note asks the question first. Oct 23: the question is today's steps from the phone's own counter */
        const txt = v.level && MOVE_NAMES[v.level] ? T('Today: ', 'Heute: ', 'Hoy: ') + MOVE_NAMES[v.level]() + ' · ' + MOVE_HINTS[v.level]() + T(' steps. Tap another to change it.', ' Schritte. Tipp einen anderen zum Ändern.', ' pasos. Toca otro para cambiarlo.')
            : v.q >= v.full ? T('Move is full for today. Nice!', 'Bewegung ist heute voll. Stark!', 'Movimiento completo hoy. ¡Genial!')
            : T('How many steps today? Check your step counter, then tap one.', 'Wie viele Schritte heute? Schau auf deinen Schrittzähler und tippe eins an.', '¿Cuántos pasos hoy? Mira tu contador de pasos y toca uno.');
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
        /* Oct 28 2026: a bubble that opens a page opens that page, whoever asks (companion sheet, tutorial, deep link, old code) */
        const tg = ringTarget(kind);
        if (tg === 'shop') return shop();
        if (tg === 'hub') return hub(kind);
        if (tg !== 'bloom') return false;
        if (kind === 'sleep' && !actionsFor('sleep').length) return false;
        if (!src) { const scope = st.root && st.root !== D ? st.root : D; src = scope.querySelector('[data-orbit="' + kind + '"]'); }
        if (!src || !src.getBoundingClientRect().width) return false;
        if (st.open) close(true);
        try { if (fn(W.LowiMoveBubble, 'close')) W.LowiMoveBubble.close(false); } catch (e) { }
        st.ov = null;
        const ov = render(kind, src);
        D.body.appendChild(ov);
        try { fitLabels(ov); } catch (e) { }
        try { placeNote(ov); } catch (e) { }
        st.ov = ov; st.open = kind; st.src = src; st.openedAt = now();
        src.classList.add('hb2-src'); src.setAttribute('aria-expanded', 'true');
        D.documentElement.classList.add('hb2-open');
        buzz(8);
        const show = () => { ov.classList.add('on'); const f = ov.querySelector('.hb2-orb:not([disabled])'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { } };
        /* flush the folded start state, then open (no rAF: WebKit can hold frames back while the 3D world is busy) */
        void ov.offsetWidth; show();
        ov.addEventListener('click', onBloomClick);
        swipeShut(ov);
        ov.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
        try { D.dispatchEvent(new CustomEvent('lowi:bloom-v2', { detail: { kind, open: true, owner: 'blooms' } })); } catch (e) { }
        return true;
    }
    function refreshOpen() {
        if (st.open === 'all' && st.ov) { const fid = (D.activeElement && D.activeElement.dataset && D.activeElement.dataset.id) || ''; renderAll(); try { fitLabels(st.ov); } catch (e) { } const f = fid && st.ov.querySelector('[data-id="' + fid + '"]'); if (f && !f.disabled) try { f.focus({ preventScroll: true }); } catch (e) { } return; }
        if (!st.open || !st.ov || !st.src) return;
        const kind = st.open, focusId = (D.activeElement && D.activeElement.dataset && D.activeElement.dataset.id) || '';
        render(kind, st.src);
        try { fitLabels(st.ov); } catch (e) { }
        try { placeNote(st.ov); } catch (e) { }
        const f = focusId && st.ov.querySelector('[data-id="' + focusId + '"]');
        if (f && !f.disabled) try { f.focus({ preventScroll: true }); } catch (e) { }
    }
    function close(now, chosen) {
        const ov = st.ov, kind = st.open;
        if (!ov) return false;
        st.ov = null; st.open = null;
        if (st.src) { st.src.classList.remove('hb2-src'); st.src.setAttribute('aria-expanded', 'false'); }
        st.src = null; st.all = false;
        D.documentElement.classList.remove('hb2-open');
        try { if (W.LowiBloomRing && W.LowiBloomRing.unzoom) W.LowiBloomRing.unzoom('blooms'); } catch (e) { }
        if (chosen) { const c = ov.querySelector('[data-id="' + chosen + '"]'); if (c) c.classList.add('hb2-chosen'); }
        if (now || reduced()) { ov.remove(); unskin(ov); }
        else { ov.classList.remove('on'); ov.classList.add('off'); setTimeout(() => { ov.remove(); unskin(ov); }, 340); }
        try { D.dispatchEvent(new CustomEvent('lowi:bloom-v2', { detail: { kind, open: false, owner: 'blooms' } })); } catch (e) { }
        return true;
    }
    /* Oct 24 (back and close sweep): a swipe down on the empty space round the orbs folds the bloom, like a swipe down closes the
       sheets. Only on the scrim, never on an orb; a tap there still closes it as before (onBloomClick). */
    function swipeShut(ov) {
        let d = null;
        ov.addEventListener('pointerdown', e => { d = e.target && e.target.classList && e.target.classList.contains('hb2-scrim') ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null; });
        const end = e => {
            const s = d; d = null;
            if (!s || e.pointerId !== s.id || st.ov !== ov) return;
            const dx = e.clientX - s.x, dy = e.clientY - s.y;
            if (dy > 56 && dy > Math.abs(dx) * 1.4) close();
        };
        ov.addEventListener('pointerup', end);
        ov.addEventListener('pointercancel', end);
    }
    /* BH-026: a bloom's orbs fly out of the bubble you tapped and the middle one comes to rest on top of it (Move's Steady sits 25 px
       from the bubble's centre). A quick second tap on the bubble (a double tap, or a "tap again to close") pressed that orb before you
       could see it: Move logged Steady 5k-10k steps, Fuel could open Cook. Like the fresh backdrop (BH-025), a bloom ignores pointer
       taps made in its first ORB_ARM_MS (by the tap's own time stamp). Keyboard clicks (detail 0) and scripted clicks work at once. */
    function onBloomClick(e) {
        const t = e.target.closest('[data-hb2]');
        if (!t || !st.ov) return;
        e.preventDefault(); e.stopPropagation();
        if (e.isTrusted && e.detail > 0 && tapTime(e) - (st.openedAt || 0) < ORB_ARM_MS) return;
        if (t.dataset.hb2 === 'close') { close(); return; }
        const a = (st.ov.__acts || []).find(x => x.id === t.dataset.id);
        if (!a || a.disabled) return;
        buzz(10);
        if (a.keep) { try { a.run(); } catch (err) { console.error(err); } refreshOpen(); return; }
        /* Oct 21 (E-man: "go back without the bubbles all of a sudden being closed"): an action that opens a page (Cook, fitness...)
           leaves this bloom open, hidden under the page (section-nav.css), so the X / back finds Home exactly as it was.
           Anything else (a sheet, a log) folds the bloom as before, right after the action runs. */
        /* BH-033: this choice folds the bloom and uncovers the bubble under the finger: a double tap's 2nd tap must not reopen it */
        freshSpent(e);
        const wasHome = homeTab();
        setTimeout(() => {
            try { a.run(); } catch (err) { console.error(err); }
            if (wasHome && !homeTab() && st.ov) return;
            close(false, a.id);
        }, 0);
    }

    /* BH-033: fresh-scrim's double-tap guard for a choice that folds the bloom (spent) and the tap it uncovers (quiet) */
    function freshSpent(e) { try { const F = W.LowiFreshScrim; if (F && F.spent) F.spent(e); } catch (x) { } }
    function freshQuiet(e) { try { const F = W.LowiFreshScrim; return !!(F && F.quiet && F.quiet(e)); } catch (x) { return false; } }

    /* taps and holds on the four bubbles (one window capture listener: runs before the old cell handlers) */
    const HOLD_MS = 550;
    function onDown(e) {
        /* BH-023: a second finger means a pinch, not a hold: drop the hold the first finger started */
        if (e.isPrimary === false) { if (st.hold) { clearTimeout(st.hold.t); st.hold = null; } return; }
        const el = bubbleOf(e.target);
        if (!el) return;
        const kind = el.getAttribute('data-orbit');
        /* Oct 28 2026 food plan (one-gesture rule): the old Fuel bubble is Einkaufen now and a hold on it only squishes, so only Move
           keeps a hold (its full page). The press start is kept so the release of a hold on Einkaufen opens nothing either. */
        st.downAt = Date.now(); st.downKind = kind;
        if (kind !== 'move') return;
        clearTimeout(st.hold && st.hold.t);
        st.hold = { el, x: e.clientX, y: e.clientY, t: setTimeout(() => {
            st.hold = null; st.swallow = Date.now() + 900; buzz(20); close(true);
            if (fn(W.LowiMoveBubble, 'page')) W.LowiMoveBubble.page(); else if (fn(W.LowiMoveBubble, 'edit')) W.LowiMoveBubble.edit();
        }, HOLD_MS) };
    }
    function onMove(e) { if (st.hold && Math.hypot(e.clientX - st.hold.x, e.clientY - st.hold.y) > 12) { clearTimeout(st.hold.t); st.hold = null; } }
    function onUp() { if (st.hold) { clearTimeout(st.hold.t); st.hold = null; } }
    function onClick(e) {
        const el = bubbleOf(e.target);
        if (!el) return;
        e.preventDefault(); e.stopImmediatePropagation();
        if (Date.now() < st.swallow) return;
        /* BH-033: the 2nd tap of a double tap on a choice that just folded this bloom (this capture listener may run before fresh-scrim's) */
        if (freshQuiet(e)) return;
        const kind = el.getAttribute('data-orbit');
        /* Oct 21 Scan / Fuel / Gap (E-man: "gap is just like water and move or sleep... not formatted like a fasting app"): Gap has no
           actions any more. A tap opens the passive Gap view (gap-view.js); meals are logged in Fuel, which is what restarts the gap */
        /* RING: gap = 'hub', fuel = 'shop' (the same map open(kind) reads) */
        if (kind === 'gap') { close(true); buzz(8); if (fn(W.LowiGapView, 'open')) W.LowiGapView.open(); return; }
        /* Oct 28 slim structure, batch 3 (nutrition hub): the Fuel menu had one real target, so a tap on Fuel opens the one
           nutrition panel (gap + last meal + log + Cook / Shop). (Oct 28 2026: open('fuel') no longer keeps the old menu: see RING) */
        /* Oct 28 2026 food plan (Emmanuel: "Ok mach"): Essenspause (Gap) is the eating hub, so this bubble is "Einkaufen" with a cart
           and the open count of the shopping list (sym-home.js paints it). One tap opens Einkaufen: Supermarkt, Zu Hause/Küche,
           Seller Zone, Hilf mit. Without the Shop module it still opens the hub, never a dead tap. */
        if (kind === 'fuel' && st.downKind === 'fuel' && Date.now() - st.downAt > 520) { st.downKind = ''; return; } /* a hold only squished */
        if (kind === 'fuel' && shop()) return;
        if (st.open === kind) close(); else open(kind, el);
    }
    /* the one Einkaufen path for the old Fuel bubble (tap here, and sym-home.js for the static layout) */
    /* the Essenspause eating hub (gap-view.js): log a meal, Kochen, today's meals and what is still missing */
    function hub(from) {
        if (fn(W.LowiGapView, 'open')) { close(true); buzz(8); W.LowiGapView.open(from && from !== 'gap' ? { from } : undefined); return true; }
        if (fn(W.LowiSpirit, 'meal')) { close(true); W.LowiSpirit.meal(); return true; }
        return false;
    }
    function shop() {
        if (fn(W.LowiStorePicks, 'open')) { close(true); buzz(8); W.LowiStorePicks.open('home-shop'); return true; }
        if (fn(W.LowiGapView, 'open')) { close(true); buzz(8); W.LowiGapView.open({ from: 'fuel' }); return true; }
        return false;
    }
    function onKey(e) { if (st.open && homeTab() && e.key === 'Escape' && !(st.ov && st.ov.contains(e.target))) close(); }
    /* a real resize re-lays Home out; while a page is open on top, or as Home comes back unchanged, the bloom stays */
    function onRelayout() { if (st.open && homeTab() && !(W.LowiSections && W.LowiSections.instant)) close(true); }
    function homeTab() { const h = D.getElementById('tab-home'); return !h || h.classList.contains('active'); }
    function onData() { if (st.open === 'water' || st.open === 'move' || st.open === 'sleep' || st.open === 'all') refreshOpen(); }
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
        D.addEventListener('lowi:sleep', onData);
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
        D.removeEventListener('lowi:sleep', onData);
        W.removeEventListener('resize', onRelayout);
        ['lowi:water', 'lowi:reward', 'lowi:state'].forEach(n => W.removeEventListener(n, onData));
        D.documentElement.classList.remove('hb2-on');
        st.mounted = false; st.root = null;
        return api;
    }

    const api = {
        mount, unmount, open: k => open(k), close: () => close(), isOpen: () => st.open, openAll, isAll: () => st.open === 'all', shop, hub, RING, ringTarget,
        actions: k => actionsFor(k).map(a => ({ id: a.id, label: a.label, sub: a.sub, aria: a.aria, disabled: !!a.disabled })),
        layout: () => (st.ov && st.ov.__layout) || null,
        undoWater: waterUndoNow, fitLabels: ov => fitLabels(ov || st.ov), core
    };
    W.LowiHomeBloomsV2 = api;
})(typeof window !== 'undefined' ? window : null);
