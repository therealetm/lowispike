/* sym-home.js - Oct 17, 2026 (Emmanuel: "I like everything a bit symmetric and standardised ... We also need one more water-style
   bubble above Fasting ... There needs to be one more bubble. I need things to look symmetric.")

   The fourth Home bubble: Meals, upper-left of Misty, the mirror image of the movement bubble (upper-right). Four living bubbles now
   sit around Misty: Meals | Move on top, Fasting | Water below.
   - Shows today's logged meals (e.g. 2/3) inside the bubble, with a fill level (3 meals = full). Logged meals already charge Misty.
   - Tap = log a meal (the same sheet as "Log a meal", LowiSpirit.meal()). Long press = today's meals, with a Log a meal button.
   - Same living bubble as water / move / fasting: it is a .wh-cell in #whHud with [data-hb], so living-bubbles.js draws Misty's 3D
     membrane around it (press squish, long press). Without the 3D world the CSS shell in sym-home.css is the fallback.
   - Placement: always the mirror of the movement bubble across Misty's centre (move-bubble.js already finds a free spot for it), so
     the pair stays symmetric on iPhone and iPad, upright and sideways.
   Pure helpers are exported for node tests (tests/sym-home.test.cjs). */
(function (root) {
    'use strict';
    const pad = n => String(n).padStart(2, '0');
    const dayKey = d => { d = d instanceof Date ? d : new Date(d == null ? Date.now() : +d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const CORE = {
        GOAL: 3,
        /* meals logged today (not voided), the same rule as the Today sheet and the body log */
        mealsToday(state, now) {
            const key = dayKey(now == null ? Date.now() : now), logs = (state && Array.isArray(state.logs)) ? state.logs : [];
            return logs.filter(l => l && !l.voided && (l.day || (l.ts ? dayKey(l.ts) : '')) === key);
        },
        view(state, now) {
            const n = CORE.mealsToday(state, now).length;
            return { n, text: n + '/' + CORE.GOAL, fill: Math.min(1, n / CORE.GOAL), full: n >= CORE.GOAL };
        },
        /* the mirror of a point across Misty's vertical centre line */
        mirrorX(x, cx) { return 2 * cx - x; },
        /* the spot only moves for a real layout change (rotation, Move found a new spot), not for 1-3 px of drift */
        moved(ox, oy, x, y) { return !(ox >= 0 && oy >= 0) || Math.abs(x - ox) > 3 || Math.abs(y - oy) > 3; },

        /* Oct 17 (handoff 6, E-man: "the four tracking bubbles circling her like Dragon Balls"): zoomed-out Home, Misty in the middle,
           Meals, Move, Water and Fasting slowly circling her on one ring. Phase 0 is the symmetric layout (Meals upper-left, Move
           upper-right, Water lower-right, Fasting lower-left); the ring turns clockwise, one lap in LAP_S seconds, slow enough to tap. */
        LAP_S: 80,
        ORDER: ['meals', 'move', 'water', 'fast'],
        /* the ring radius: Misty's (scaled) radius + a bubble radius + a gap, so no bubble ever touches her or another bubble */
        ringR(mistyR, bubR, gap) { return Math.max(0, +mistyR || 0) + Math.max(0, +bubR || 0) + (gap == null ? 12 : +gap || 0); },
        /* the four spots on the ring at phase ph (radians), evenly spaced, starting with Meals at the upper left */
        spots(cx, cy, R, ph) {
            const out = {};
            CORE.ORDER.forEach((k, i) => {
                const a = -3 * Math.PI / 4 + i * Math.PI / 2 + (+ph || 0);
                out[k] = { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
            });
            return out;
        },
        /* how far the ring turns in dt seconds */
        advance(ph, dt) { const T = 2 * Math.PI; return (((+ph || 0) + Math.max(0, +dt || 0) * T / CORE.LAP_S) % T + T) % T; },
        /* does the whole ring path stay clear? A bubble anywhere on the circle of radius R must stay inside the view (top below the
           status area) and away from every control rect (each grown by the bubble radius + 6 px). The circle meets a rect exactly when
           the rect's nearest distance to the centre <= R <= its farthest distance. */
        ringClear(cx, cy, R, bubR, rects, vw, vh, topMin) {
            const pad = bubR + 6, tm = topMin == null ? 30 : topMin;
            if (cx - R - bubR < 6 || cx + R + bubR > vw - 6 || cy - R - bubR < tm || cy + R + bubR > vh - 6) return false;
            for (const q of rects || []) {
                if (!q) continue;
                const l = q.left - pad, r = q.right + pad, t = q.top - pad, b = q.bottom + pad;
                const nx = Math.max(l, Math.min(cx, r)) - cx, ny = Math.max(t, Math.min(cy, b)) - cy;
                const fx = Math.max(Math.abs(l - cx), Math.abs(r - cx)), fy = Math.max(Math.abs(t - cy), Math.abs(b - cy));
                const dmin = Math.hypot(nx, ny), dmax = Math.hypot(fx, fy);
                if (dmin <= R && R <= dmax) return false;
            }
            return true;
        }
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
    if (!root || !root.document) return;

    const W = root, D = root.document;
    if (W.LowiMealsBubble) return;
    const lang = () => { const l = (D.documentElement.lang || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const T = (en, de, es) => [en, de, es][lang()];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const state = () => { try { return W.LowiVitalsBridge && W.LowiVitalsBridge.state(); } catch (e) { return null; } };
    const label = () => T('Fuel', 'Essen', 'Comida'); /* Oct 19 (new-user walkthrough): the ring calls this bubble Fuel, so VoiceOver says Fuel too */
    let el = null, living = false, longAt = 0, downAt = 0;   /* a long press, however long it is held, never also opens Log a meal */

    function ensure() {
        const hud = D.getElementById('whHud'); if (!hud) return null;
        if (el && el.isConnected && el.parentNode === hud) return el;
        el = hud.querySelector('.wh-meals');
        if (!el) {
            el = D.createElement('button');
            el.type = 'button';
            el.className = 'wh-cell wh-meals';
            el.dataset.hb = 'meals';
            el.innerHTML = '<span class="wh-cell-fill" aria-hidden="true"></span><span class="wh-cell-tx"><small></small><b></b></span>';
            hud.appendChild(el);
            wire(el);
        }
        living = false;
        return el;
    }
    function attachLiving(b) {
        if (living || !b) return;
        try { if (W.LowiLivingBubble && typeof W.LowiLivingBubble.attach === 'function') { W.LowiLivingBubble.attach(b, { kind: 'meals', onLong: () => { longAt = performance.now(); details(); return true; } }); living = true; } } catch (e) {}
    }
    function paint() {
        const b = ensure(); if (!b) return;
        if (!b.classList.contains('lb-bub')) living = false;
        attachLiving(b);
        const v = CORE.view(state());
        const fill = String(Math.round(v.fill * 100) / 100);
        if (b.style.getPropertyValue('--wh-fill') !== fill) b.style.setProperty('--wh-fill', fill);
        const sm = b.querySelector('small'), bb = b.querySelector('b');
        if (sm && sm.textContent !== label()) sm.textContent = label();
        /* Oct 21 grandma test: "1/3" alone says nothing, so the count says its unit the way Water does ("0/6 cups") */
        if (bb) {
            const unit = /^\d+\s*\/\s*\d+$/.test(v.text) ? T('meals', 'Mahlzeiten', 'comidas') : '';
            let num = bb.querySelector('.wh-num'), u = bb.querySelector('.wh-unit');
            if (!num || !u) { bb.innerHTML = '<span class="wh-num"></span> <u class="wh-unit"></u>'; num = bb.querySelector('.wh-num'); u = bb.querySelector('.wh-unit'); }
            if (num.textContent !== v.text) num.textContent = v.text;
            if (u.textContent !== unit) u.textContent = unit;
            u.classList.toggle('wh-unit-2l', unit.length > 7); /* German "Mahlzeiten" sits under the count, it does not fit beside it */
        }
        b.classList.toggle('wme-full', v.full);
        const aria = label() + ' ' + v.text + (/^\d+\s*\/\s*\d+$/.test(v.text) ? ' ' + T('meals', 'Mahlzeiten', 'comidas') : '') + '. ' + T('Tap to log a meal, long press to see today.', 'Tippen, um Essen einzutragen, lange drücken für heute.', 'Toca para registrar una comida, mantén pulsado para ver hoy.');
        if (b.getAttribute('aria-label') !== aria) b.setAttribute('aria-label', aria);
    }
    /* Misty's HOME cell, never where she drifts to: while the camera follows her flight (autopilot, steering) misty-flight.js slides
       #spBubble by --mf-bx / --mf-by (html.mf-roam). Mirroring across that moved box made Meals chase her across the screen
       (Oct 17, E-man: "the meal bubble moved ... the same mistake as that other thing") - the same rule as move-bubble.js homeRect(). */
    function homeRect(mi) {
        const q = mi.getBoundingClientRect();
        if (!D.documentElement.classList.contains('mf-roam')) return q;
        const dx = parseFloat(mi.style.getPropertyValue('--mf-bx')) || 0, dy = parseFloat(mi.style.getPropertyValue('--mf-by')) || 0;
        return { left: q.left - dx, top: q.top - dy, right: q.right - dx, bottom: q.bottom - dy, width: q.width, height: q.height };
    }
    /* the mirror of the movement bubble across Misty's centre */
    function place() {
        const b = ensure(); if (!b) return;
        if (ORB.on) return; /* the orbit below places all four bubbles */
        const hud = D.getElementById('whHud'), mi = D.getElementById('spBubble'), mv = hud && hud.querySelector('.wh-move');
        if (!hud || !mi || !mv || !D.documentElement.classList.contains('wh-home')) return;
        /* while the UI is faded for Misty's flight, and while it fades back in, the spot stays where it was */
        const root = D.documentElement.classList;
        if (root.contains('lw-clean') || root.contains('lw-clean-out')) return;
        /* while she is out flying (pad not idle / camera roaming) keep the spot once it is set */
        const pm = (D.getElementById('whPad') || { dataset: {} }).dataset.mode;
        if (((pm && pm !== 'idle') || root.contains('mf-roam')) && b.style.getPropertyValue('--wme-x')) return;
        const hr = hud.getBoundingClientRect(), mr = homeRect(mi);
        if (!hr.width || !mr.width) return;
        /* the movement bubble's own spot (its --wm-x/--wm-y, in HUD px), not its box: no float or squish leaks into the mirror */
        const cs = getComputedStyle(mv), mx = parseFloat(cs.left), my = parseFloat(cs.top);
        if (!(mx > 0) || !(my > 0)) return;
        const cx = mr.left + mr.width / 2 - hr.left;
        /* Oct 17 (E-man: "Meals moves on its own"): a few px of drift (Misty breathing, a rounding step) never moves the spot. */
        const X = Math.round(CORE.mirrorX(mx, cx)), Y = Math.round(my);
        const ox = parseFloat(b.style.getPropertyValue('--wme-x')), oy = parseFloat(b.style.getPropertyValue('--wme-y'));
        if (!CORE.moved(ox, oy, X, Y)) return;
        b.style.setProperty('--wme-x', X + 'px');
        b.style.setProperty('--wme-y', Y + 'px');
    }
    /* Day/Night above Sound, exactly as VR sits above World map: centred on Sound, the same gap (sym-home.css is the fallback) */
    let dnSet = false;
    function placeDayNight() {
        const dn = D.getElementById('tbTheme'), hud = D.getElementById('whHud');
        const so = hud && hud.querySelector('.wa-btn'), vr = hud && hud.querySelector('.wh-vr'), mp = hud && hud.querySelector('.wh-zoom');
        const home = D.documentElement.classList.contains('wh-home');
        if (!dn) return;
        if (!home || !so || !vr || !mp) { if (dnSet) { dn.style.removeProperty('--sym-dn-l'); dn.style.removeProperty('--sym-dn-t'); dnSet = false; } return; }
        const sr = so.getBoundingClientRect(), vrr = vr.getBoundingClientRect(), mr = mp.getBoundingClientRect();
        if (!sr.width || !vrr.width || !mr.width) return;
        const w = vrr.width || 46;
        const L = Math.round(sr.left + (sr.width - w) / 2) + 'px', Tp = Math.round(sr.top - (mr.top - vrr.top)) + 'px';
        if (dn.style.getPropertyValue('--sym-dn-l') !== L) dn.style.setProperty('--sym-dn-l', L);
        if (dn.style.getPropertyValue('--sym-dn-t') !== Tp) dn.style.setProperty('--sym-dn-t', Tp);
        dnSet = true;
    }
    function logMeal() {
        try { if (W.LowiSpirit && typeof W.LowiSpirit.meal === 'function') { W.LowiSpirit.meal(); return; } } catch (e) {}
        const alt = D.querySelector('[data-sp="meal"]:not(.wh-meals)'); if (alt) alt.click();
    }
    function details() {
        const R = W.LowiR2; if (!R || !R.sheet) { logMeal(); return; }
        const list = CORE.mealsToday(state()), v = CORE.view(state());
        const tm = l => { if (!l.ts) return ''; const d = new Date(+l.ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
        /* Oct 22: each meal shows its thumbnail; tapping it opens the photo with its saved estimate, share and delete (meal-journal.js) */
        const J = W.LowiMealJournal;
        const rows = list.length ? list.map(l => '<li class="wm-row' + (J ? ' mj-row' : '') + '">' + (J ? J.thumbHTML(l) : '') + '<span><b>' + esc(l.t || l.n || l.name || label()) + '</b><small>' + esc(tm(l)) + '</small></span></li>').join('')
            : '<li class="wm-row wm-empty">' + esc(T('No meals logged today yet.', 'Heute noch kein Essen eingetragen.', 'Hoy aún no has registrado comidas.')) + '</li>';
        const html = '<div class="wm-sheet wme-sheet"><h3>' + esc(label() + ' · ' + v.text) + '</h3>' +
            '<p class="wm-why">' + esc(T('Every meal you log charges Misty. Three meals fill this bubble for today.', 'Jede eingetragene Mahlzeit lädt Misty auf. Drei Mahlzeiten füllen diese Blase für heute.', 'Cada comida que registras carga a Misty. Tres comidas llenan esta burbuja hoy.')) + '</p>' +
            (W.LowiNutriStats && W.LowiNutriStats.stripHTML ? W.LowiNutriStats.stripHTML() : '') +   /* Today's stats (nutri-stats.js) */
            '<ul class="wm-list">' + rows + '</ul><button type="button" class="r2-btn pri wme-log">' + esc(T('Log a meal', 'Essen eintragen', 'Registrar comida')) + '</button></div>';
        const ov = R.sheet(html, { cls: 'wm-sheet-ov' });
        if (!ov) return;
        ov.addEventListener('click', e => {
            if (!e.target.closest || !e.target.closest('.wme-log')) return;
            e.preventDefault();
            try { R.close && R.close(ov); } catch (x) {}
            setTimeout(logMeal, 60);
        });
    }
    function wire(b) {
        b.addEventListener('pointerdown', () => { downAt = performance.now(); });
        b.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            if (longAt && longAt >= downAt) { longAt = 0; return; }   /* the release after a long press: today's list stays open alone */
            logMeal();
        });
        b.addEventListener('contextmenu', e => e.preventDefault());
        b.addEventListener('keydown', e => { if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); details(); } });
    }
    let queued = 0;
    const soon = () => { if (queued) return; queued = requestAnimationFrame(() => { queued = 0; try { paint(); place(); placeDayNight(); } catch (e) {} }); };
    function boot() {
        soon();
        ['lowi:reward', 'lowi:state', 'lowi:lang', 'lowi:layout', 'storage', 'focus', 'resize', 'orientationchange'].forEach(n => W.addEventListener(n, soon));
        D.addEventListener('visibilitychange', () => { if (!D.hidden) soon(); });
        /* follows the movement bubble when it moves (its --wm-x/--wm-y change) and re-attaches if the HUD is rebuilt */
        setInterval(() => { if (!D.hidden) soon(); }, 1500);
        [400, 1300, 3200].forEach(ms => setTimeout(soon, ms));
    }
    /* ---------- Oct 17 (handoff 6): the four bubbles circle Misty like Dragon Balls ----------
       - Runs inside the world's own frame callback (LowiWorld3D.onFrame): no new loop, nothing runs when the world is paused.
       - Each bubble keeps its node, taps and long press; only its left/top come from the ring (--ho-x / --ho-y, html.ho-orbit).
       - The ring stops turning while a finger is on a bubble (and 3 s after), while the Move picker or a sheet is open, while Misty is
         out flying / the UI is faded, away in a place, zoomed out to the map, on reduced motion and when the app is hidden.
       - The radius follows Misty's scaled bubble (pinch zoom), so the ring always hugs her.
       - If the ring does not fit (phone on its side, very short screen) Home keeps the static symmetric layout above. */
    const ORB = { on: false, ph: 0, R: 0, m: null, lastM: 0, touchT: 0, down: 0, off: null, inT: 0 };
    const HTML = D.documentElement;
    const reducedMq = (() => { try { return W.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { return null; } })();
    function orbEls() {
        const hud = D.getElementById('whHud'); if (!hud) return null;
        const e = { meals: hud.querySelector('.wh-meals'), move: hud.querySelector('.wh-move'), water: hud.querySelector('.wh-water'), fast: D.getElementById('spFast') };
        for (const k of CORE.ORDER) if (!e[k] || !e[k].isConnected) return null;
        return e;
    }
    function visRect(sel) {
        const e = D.querySelector(sel); if (!e) return null;
        const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return null;
        const q = e.getBoundingClientRect(); return q.width > 4 && q.height > 4 ? q : null;
    }
    const ORB_RECTS = ['#f3Board', '#hcLine', '#spHome .sp-top', '#spHome .sp-weather', '#whHud .wh-todaybtn', '#whHud .wh-vr', '#whHud .wh-zoom', '#whHud .wa-btn', '#tbTheme', '#whPad', '#tabbar', '.tabbar'];
    function measure() {
        const tab = D.getElementById('tab-home');
        if (!HTML.classList.contains('wh-home') || !HTML.classList.contains('wh-world-live') || (tab && !tab.classList.contains('active'))) return null;
        const els = orbEls(), mi = D.getElementById('spBubble'); if (!els || !mi) return null;
        const mr = homeRect(mi); if (!mr.width) return null;
        const bubR = (els.water.offsetWidth || 84) / 2;
        const cx = mr.left + mr.width / 2, cy = mr.top + mr.height / 2, R = CORE.ringR(mr.width / 2, bubR, 12);
        const rects = ORB_RECTS.map(visRect).filter(Boolean);
        const par = {};
        for (const k of CORE.ORDER) { const p = els[k].offsetParent; if (!p) return null; const q = p.getBoundingClientRect(); par[k] = { x: q.left, y: q.top }; }
        /* the fit is judged at the rest of the layout (not mid-flight): keep the last answer while Misty is out or the UI is faded */
        const frozen = /(^|\s)(lw-clean|lw-clean-out|mf-roam|wh-padfly|wh-away|wh-cosmos|wh-mapview|wh-today-open|gx-out|gx-in|wh-leave)(\s|$)/.test(HTML.className);
        const ok = frozen && ORB.m ? ORB.m.ok : CORE.ringClear(cx, cy, R, bubR, rects, W.innerWidth, W.innerHeight, 30);
        const pm = (D.getElementById('whPad') || { dataset: {} }).dataset.mode;
        const busy = frozen || (pm && pm !== 'idle') || !!D.querySelector('.wm-bloom, .r2-ov, .fe-ov');
        return { els, par, cx, cy, R, ok, busy };
    }
    function setOn(on) {
        if (ORB.on === on) return;
        ORB.on = on;
        if (on) {
            /* glide from wherever they were onto the ring, then follow it frame by frame */
            HTML.classList.add('ho-orbit', 'ho-in'); clearTimeout(ORB.inT); ORB.inT = setTimeout(() => HTML.classList.remove('ho-in'), 900);
        } else {
            HTML.classList.remove('ho-orbit', 'ho-in');
            D.querySelectorAll('[data-ho]').forEach(e => { e.removeAttribute('data-ho'); e.style.removeProperty('--ho-x'); e.style.removeProperty('--ho-y'); });
            ORB.R = 0;
            soon();
        }
    }
    function orbFrame(dt) {
        /* Oct 18: the one-page ring (home-orbit-v2.js, html.o8) places all eight controls on a still circle: the turning ring steps aside */
        if (D.documentElement.classList.contains('o8')) { if (ORB.on) setOn(false); return; }
        const now = performance.now();
        if (now - ORB.lastM > 300) {
            ORB.lastM = now;
            const m = measure();
            if (!m) {
                /* off Home: back to the static layout; on Home but not measurable (world not live yet, sliding): hold still */
                if (!HTML.classList.contains('wh-home')) setOn(false); else if (ORB.m) ORB.m.busy = true;
                return;
            }
            ORB.m = m; setOn(m.ok);
            if (ORB.on) CORE.ORDER.forEach(k => { if (m.els[k].getAttribute('data-ho') !== k) m.els[k].setAttribute('data-ho', k); });
        }
        const m = ORB.m; if (!ORB.on || !m) return;
        const still = D.hidden || (reducedMq && reducedMq.matches) || m.busy || ORB.down > 0 || now - ORB.touchT < 3000;
        if (!still) ORB.ph = CORE.advance(ORB.ph, dt);
        ORB.R = ORB.R > 0 ? ORB.R + (m.R - ORB.R) * Math.min(1, dt * 4) : m.R;
        const sp = CORE.spots(m.cx, m.cy, ORB.R, ORB.ph);
        for (const k of CORE.ORDER) {
            const el = m.els[k], p = m.par[k]; if (!el.isConnected) continue;
            const X = (sp[k].x - p.x).toFixed(1) + 'px', Y = (sp[k].y - p.y).toFixed(1) + 'px';
            if (el.style.getPropertyValue('--ho-x') !== X) el.style.setProperty('--ho-x', X);
            if (el.style.getPropertyValue('--ho-y') !== Y) el.style.setProperty('--ho-y', Y);
        }
    }
    function orbHook() {
        if (ORB.off) return;
        const a = W.LowiWorld3D; if (!a || typeof a.onFrame !== 'function') return;
        try { const off = a.onFrame(dt => { try { orbFrame(Math.max(0, Math.min(0.1, +dt || 0.016))); } catch (e) {} }); if (typeof off === 'function') ORB.off = off; } catch (e) {}
    }
    /* a finger on any orbiting bubble holds the ring still (tap, long press), and for 3 s after */
    D.addEventListener('pointerdown', e => { const t = e.target && e.target.closest && e.target.closest('[data-ho]'); if (t) { ORB.down++; ORB.touchT = performance.now(); } }, true);
    const up = () => { if (ORB.down > 0) { ORB.down = 0; ORB.touchT = performance.now(); } };
    ['pointerup', 'pointercancel'].forEach(n => D.addEventListener(n, up, true));
    W.addEventListener('lowi:world3d-ready', orbHook);
    setInterval(() => { if (!D.hidden) orbHook(); }, 1500);
    setTimeout(orbHook, 500);

    W.LowiMealsBubble = { paint, place, placeDayNight, details, log: logMeal, homeRect, el: () => ensure(), core: CORE,
        orbit: () => ({ on: ORB.on, ph: +ORB.ph.toFixed(3), R: Math.round(ORB.R), ok: !!(ORB.m && ORB.m.ok), busy: !!(ORB.m && ORB.m.busy) }) };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0), { once: true }); else setTimeout(boot, 0);
})(typeof window !== 'undefined' ? window : null);
