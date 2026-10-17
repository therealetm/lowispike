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
        mirrorX(x, cx) { return 2 * cx - x; }
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
    if (!root || !root.document) return;

    const W = root, D = root.document;
    if (W.LowiMealsBubble) return;
    const lang = () => { const l = (D.documentElement.lang || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const T = (en, de, es) => [en, de, es][lang()];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const state = () => { try { return W.LowiVitalsBridge && W.LowiVitalsBridge.state(); } catch (e) { return null; } };
    const label = () => T('Meals', 'Essen', 'Comidas');
    let el = null, living = false;

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
        try { if (W.LowiLivingBubble && typeof W.LowiLivingBubble.attach === 'function') { W.LowiLivingBubble.attach(b, { kind: 'meals', onLong: () => { details(); return true; } }); living = true; } } catch (e) {}
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
        if (bb && bb.textContent !== v.text) bb.textContent = v.text;
        b.classList.toggle('wme-full', v.full);
        const aria = label() + ' ' + v.text + '. ' + T('Tap to log a meal, long press to see today.', 'Tippen, um Essen einzutragen, lange drücken für heute.', 'Toca para registrar una comida, mantén pulsado para ver hoy.');
        if (b.getAttribute('aria-label') !== aria) b.setAttribute('aria-label', aria);
    }
    /* the mirror of the movement bubble across Misty's centre */
    function place() {
        const b = ensure(); if (!b) return;
        const hud = D.getElementById('whHud'), mi = D.getElementById('spBubble'), mv = hud && hud.querySelector('.wh-move');
        if (!hud || !mi || !mv || !D.documentElement.classList.contains('wh-home')) return;
        const hr = hud.getBoundingClientRect(), mr = mi.getBoundingClientRect();
        if (!hr.width || !mr.width) return;
        /* the movement bubble's own spot (its --wm-x/--wm-y, in HUD px), not its box: no float or squish leaks into the mirror */
        const cs = getComputedStyle(mv), mx = parseFloat(cs.left), my = parseFloat(cs.top);
        if (!(mx > 0) || !(my > 0)) return;
        const cx = mr.left + mr.width / 2 - hr.left;
        const X = Math.round(CORE.mirrorX(mx, cx)) + 'px', Y = Math.round(my) + 'px';
        if (b.style.getPropertyValue('--wme-x') !== X) b.style.setProperty('--wme-x', X);
        if (b.style.getPropertyValue('--wme-y') !== Y) b.style.setProperty('--wme-y', Y);
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
        const rows = list.length ? list.map(l => '<li class="wm-row"><span><b>' + esc(l.t || l.n || l.name || label()) + '</b><small>' + esc(tm(l)) + '</small></span></li>').join('')
            : '<li class="wm-row wm-empty">' + esc(T('No meals logged today yet.', 'Heute noch kein Essen eingetragen.', 'Hoy aún no has registrado comidas.')) + '</li>';
        const html = '<div class="wm-sheet wme-sheet"><h3>' + esc(label() + ' · ' + v.text) + '</h3>' +
            '<p class="wm-why">' + esc(T('Every meal you log charges Misty. Three meals fill this bubble for today.', 'Jede eingetragene Mahlzeit lädt Misty auf. Drei Mahlzeiten füllen diese Blase für heute.', 'Cada comida que registras carga a Misty. Tres comidas llenan esta burbuja hoy.')) + '</p>' +
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
        b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); logMeal(); });
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
    W.LowiMealsBubble = { paint, place, placeDayNight, details, log: logMeal, el: () => ensure(), core: CORE };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0), { once: true }); else setTimeout(boot, 0);
})(typeof window !== 'undefined' ? window : null);
