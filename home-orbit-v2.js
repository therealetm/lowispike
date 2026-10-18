/* home-orbit-v2.js: the one-page Home ring (Oct 18 2026, Emmanuel).
   "Circles ... have them all at the same size ... circle math ... just implement it in our app."
   Eight controls sit on ONE true circle centred on Misty, all the same diameter, 45 degrees apart:
   Settings on top, then clockwise Water, Move, Scan, the joystick at the bottom, Sleep, Gap, Fuel
   (18 Oct 18:20, Emmanuel: "Let's put scan where setting is": Scan and Settings swapped slots).
   x = cx + R cos(t), y = cy + R sin(t). R and the diameter scale together with the space round Misty (safe areas included).
   - Reuses the real nodes: Meals (Fuel), Water, Move, #spFast (Gap) and the controller #whPad (joystick, real movement).
     Scan, Sleep and Settings are new glass bubbles in #whHud with [data-hb], so living-bubbles.js gives them the same membrane.
   - Scan opens the real scanner (the Scan tab). Settings lists every Home entry point the ring hides (profile, Today, world map,
     VR, sound, day/night, gift, weather, Daily quest, the other tabs) plus the optional bottom menu bar switch.
   - Sibling adapters: home-blooms-v2.js (Fuel/Water/Move/Gap) and home-settings-sleep-v2.js (Sleep/Settings) mount on the
     document once they load; a control a sibling owns carries data-o8-adapter and the shell's fallback tap steps aside.
   - Writes only when a value changes, on layout events and a slow 1.5 s check; no frame loop. Contract: COORD-eight-home.md. */
(function (root) {
    'use strict';
    const ORDER = ['settings', 'water', 'move', 'scan', 'joy', 'sleep', 'gap', 'fuel'];
    const angleOf = k => -90 + 45 * ORDER.indexOf(k);
    const SIN = Math.sin(Math.PI / 8);

    /* the circle: the smallest ring that clears Misty by `gap`, with the biggest shared diameter the space allows (capped) */
    function fit(v) {
        const s = Object.assign({ t: 0, r: 0, b: 0, l: 0 }, v.safe || {});
        const mistyR = v.mistyR;
        const gap = v.gap != null ? v.gap : Math.max(10, Math.min(18, Math.round(mistyR * 0.12)));
        const margin = v.margin != null ? v.margin : 6;
        const A = Math.min(v.cx - s.l, v.vw - s.r - v.cx, v.cy - s.t, v.vh - s.b - v.cy) - margin;
        const cap = v.dCap || Math.min(124, Math.max(88, Math.round(mistyR * 1.08)));
        let d = Math.floor(Math.min(cap, A - mistyR - gap));
        let R = 0;
        for (; d >= 56; d--) {
            R = Math.max(mistyR + gap + d / 2, (d + 6) / (2 * SIN));
            if (R + d / 2 <= A) break;
        }
        if (d < 56) return { ok: false, cx: v.cx, cy: v.cy, R: 0, d: 0, spots: {} };
        const spots = {};
        ORDER.forEach(k => {
            const t = angleOf(k) * Math.PI / 180;
            spots[k] = { x: v.cx + R * Math.cos(t), y: v.cy + R * Math.sin(t), d, angle: angleOf(k) };
        });
        return { ok: true, cx: v.cx, cy: v.cy, R, d, gap, spots };
    }
    function moved(a, b) {
        if (!a || !b) return true;
        if (a.ok !== b.ok) return true;
        return Math.abs(a.cx - b.cx) > 2.5 || Math.abs(a.cy - b.cy) > 2.5 || Math.abs(a.R - b.R) > 2.5 || Math.abs(a.d - b.d) > 2;
    }
    const core = { ORDER, angleOf, fit, moved };
    if (typeof module === 'object' && module.exports) { module.exports = core; return; }

    const D = root.document, H = D.documentElement;
    const MENU_KEY = 'lowi.home.menubar', SLEEP_KEY = 'lowi.sleep.v1';
    const lang = () => { const l = (H.lang || 'en').slice(0, 2); return l === 'de' || l === 'es' ? l : 'en'; };
    const T = (en, de, es) => ({ en, de, es })[lang()];
    const $ = s => D.querySelector(s);
    const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
    const ICON = {
        scan: 'M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M8 9v6M11 9v6M14 9v6M17 9v6',
        sleep: 'M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.2 6.2 0 0 0 10.1 10.1z',
        settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4'
    };
    const svg = k => '<svg class="o8-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICON[k] + '"/></svg>';
    /* existing nodes the ring reuses */
    const FIND = {
        fuel: () => $('#whHud .wh-meals'),
        water: () => $('#whHud .wh-water'),
        move: () => $('#whHud .wh-move'),
        gap: () => D.getElementById('spFast'),
        joy: () => D.getElementById('whPad'),
        scan: () => $('#whHud .o8-scan'),
        sleep: () => $('#whHud .o8-sleep'),
        settings: () => $('#whHud .o8-settings')
    };
    let last = null, mounted = { blooms: false, ss: false }, safe = null, safeEl = null;

    function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function sleepToday() { try { return (JSON.parse(ls.get(SLEEP_KEY) || '{}') || {})[today()] || ''; } catch (e) { return ''; } }
    /* once home-settings-sleep-v2 owns the Sleep bubble, its private hours log is the answer; lowi.sleep.v1 words are never converted */
    function sleepNow() {
        const S = root.LowiHomeSettingsSleepV2, b = FIND.sleep();
        if (S && S.sleep && typeof S.sleep.today === 'function' && b && b.dataset && b.dataset.o8Adapter === 'settings-sleep') { try { return S.sleep.today(); } catch (e) { } }
        return sleepToday();
    }
    const SLEEP_TX = { good: () => T('Good', 'Gut', 'Bien'), ok: () => T('Okay', 'Okay', 'Regular'), short: () => T('Short', 'Kurz', 'Corta') };

    function make(key, label, inner) {
        const hud = D.getElementById('whHud'); if (!hud) return null;
        let b = hud.querySelector('.o8-' + key);
        if (b) return b;
        b = D.createElement('button'); b.type = 'button';
        b.className = 'wh-cell o8-cell o8-' + key;
        b.setAttribute('data-hb', key); b.setAttribute('aria-label', label);
        b.innerHTML = inner;
        b.addEventListener('click', e => tap(key, b, e));
        hud.appendChild(b);
        D.dispatchEvent(new CustomEvent('lowi:home-bubble-added', { detail: { el: b, kind: key } }));
        return b;
    }
    function ensure() {
        if (!D.getElementById('whHud')) return false;
        make('scan', T('Scan a product', 'Produkt scannen', 'Escanear un producto'), '<span class="wh-cell-tx">' + svg('scan') + '<small>' + T('Scan', 'Scannen', 'Escanear') + '</small></span>');
        make('sleep', T('Sleep', 'Schlaf', 'Sueño'), '<span class="wh-cell-fill" aria-hidden="true"></span><span class="wh-cell-tx">' + svg('sleep') + '<small>' + T('Sleep', 'Schlaf', 'Sueño') + '</small><b class="o8-val"></b></span>');
        make('settings', T('Settings', 'Einstellungen', 'Ajustes'), '<span class="wh-cell-tx">' + svg('settings') + '<small>' + T('Settings', 'Optionen', 'Ajustes') + '</small></span>');
        ORDER.forEach(k => {
            const el = FIND[k](); if (!el) return;
            if (el.getAttribute('data-orbit') !== k) el.setAttribute('data-orbit', k);
            if ((k === 'fuel' || k === 'water' || k === 'move' || k === 'gap') && el.getAttribute('data-home-bubble') !== k) el.setAttribute('data-home-bubble', k);
        });
        joyBubble();
        const m = D.getElementById('spBubble');
        if (m && !m.hasAttribute('data-home-misty')) m.setAttribute('data-home-misty', '');
        paintSleep();
        return true;
    }
    /* Oct 18 (Emmanuel: "The steering wheel doesn't have the same water style, I mean bubble style, as the other bubbles"): the
       joystick gets Misty's membrane like the seven others, registered as a control so its own drag, taps and hold stay untouched
       (no squish, no float). living-bubbles.js drops it if the node is rebuilt; the class check re-adds it. Look only. */
    function joyBubble() {
        const j = FIND.joy(), LB = root.LowiBubbles;
        if (j && LB && typeof LB.add === 'function' && !j.classList.contains('lb-ctl')) { try { LB.add(j, { kind: 'joy', ctl: true }); } catch (e) { } }
    }
    function paintSleep() {
        const b = FIND.sleep(); if (!b || b.dataset.o8Adapter) return;
        const v = b.querySelector('.o8-val'); if (!v) return;
        const s = sleepToday(), tx = s && SLEEP_TX[s] ? SLEEP_TX[s]() : T('Log', 'Eintragen', 'Anotar');
        if (v.textContent !== tx) v.textContent = tx;
        b.classList.toggle('done', !!s);
    }

    /* ---- taps (fallbacks when no sibling adapter owns the control) ---- */
    function tap(key, el, e) {
        if (el.dataset.o8Adapter) return;
        if (key === 'scan') { const t = $('#tabbar [data-tab="scan"]'); if (t) t.click(); return; }
        if (key === 'settings') { openSettings(); return; }
        if (key === 'sleep') { openSleep(); return; }
    }
    function sheet(cls, title, rows) {
        closeSheet();
        const w = D.createElement('div'); w.className = 'o8-sheet ' + cls; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', title);
        w.innerHTML = '<div class="o8-scrim"></div><div class="o8-panel"><b class="o8-ttl"></b><div class="o8-rows"></div><button type="button" class="o8-close">' + T('Close', 'Schließen', 'Cerrar') + '</button></div>';
        w.querySelector('.o8-ttl').textContent = title;
        const box = w.querySelector('.o8-rows');
        rows.forEach(r => {
            const b = D.createElement('button'); b.type = 'button'; b.className = 'o8-row'; b.textContent = r.label;
            if (r.id) b.setAttribute('data-o8-row', r.id);
            if (r.on != null) { b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', r.on ? 'true' : 'false'); }
            b.addEventListener('click', ev => { ev.stopPropagation(); if (!r.keep) closeSheet(); r.run(b); });
            box.appendChild(b);
        });
        w.querySelector('.o8-scrim').addEventListener('click', closeSheet);
        w.querySelector('.o8-close').addEventListener('click', closeSheet);
        ['pointerdown', 'touchstart'].forEach(n => w.addEventListener(n, ev => ev.stopPropagation(), { passive: true }));
        D.body.appendChild(w);
        const f = w.querySelector('.o8-row'); if (f) try { f.focus({ preventScroll: true }); } catch (x) { }
        return w;
    }
    function closeSheet() { const w = $('.o8-sheet'); if (w) w.remove(); }
    const clickSel = sel => () => { const t = $(sel); if (t) t.click(); };
    function tabLabel(tab, fb) { const t = $('#tabbar [data-tab="' + tab + '"]'); const s = t && ((t.getAttribute('aria-label') || t.textContent || '').trim()); return s || fb; }
    /* every entry point the ring hides stays one tap away here */
    function entries() {
        const list = [
            { id: 'profile', sel: '#pfBtn', label: T('Profile', 'Profil', 'Perfil') },
            { id: 'today', sel: '#whHud .wh-todaybtn', label: T('Today', 'Heute', 'Hoy') },
            { id: 'community', sel: '#tabbar [data-tab="foryou"]', label: tabLabel('foryou', T('Community', 'Community', 'Comunidad')) },
            { id: 'cook', sel: '#tabbar [data-tab="shelf"]', label: tabLabel('shelf', T('Cook', 'Kochen', 'Cocinar')) },
            { id: 'move', sel: '#tabbar [data-tab="move"]', label: tabLabel('move', T('Move', 'Bewegen', 'Moverse')) },
            { id: 'map', sel: '#whHud .wh-zoom', label: T('World map', 'Weltkarte', 'Mapa del mundo') },
            { id: 'vr', sel: '#whHud .wh-vr', label: 'VR' },
            { id: 'sound', sel: '#whHud .wa-btn', label: T('Sound', 'Ton', 'Sonido') },
            { id: 'theme', sel: '#tbTheme', label: T('Day / night', 'Tag / Nacht', 'Día / noche') },
            { id: 'gift', sel: '.hs-gift', label: T('Gift of the day', 'Geschenk des Tages', 'Regalo del día') },
            { id: 'weather', sel: '#tab-home .sp-weather', label: T('Weather', 'Wetter', 'Tiempo') }
        ].filter(e => $(e.sel)).map(e => ({ id: e.id, label: e.label, run: clickSel(e.sel) }));
        if ($('#f3Board')) list.push({ id: 'quest', label: T('Daily quest', 'Tagesquest', 'Misión diaria') + (H.classList.contains('o8-quest') ? ' (' + T('shown', 'sichtbar', 'visible') + ')' : ''), run: () => H.classList.toggle('o8-quest') });
        const on = menuBar();
        list.push({ id: 'menubar', on, label: T('Bottom menu bar', 'Menüleiste unten', 'Barra de menú inferior') + ': ' + (on ? T('on', 'an', 'sí') : T('off', 'aus', 'no')), run: () => setMenuBar(!menuBar()) });
        return list;
    }
    function openSettings() { return sheet('o8-settings-sheet', T('Settings', 'Einstellungen', 'Ajustes'), entries()); }
    function openSleep() {
        const pick = v => () => { let m = {}; try { m = JSON.parse(ls.get(SLEEP_KEY) || '{}') || {}; } catch (e) { } m[today()] = v; ls.set(SLEEP_KEY, JSON.stringify(m)); paintSleep(); D.dispatchEvent(new CustomEvent('lowi:sleep', { detail: { day: today(), value: v } })); };
        return sheet('o8-sleep-sheet', T('How did you sleep last night?', 'Wie hast du letzte Nacht geschlafen?', '¿Cómo dormiste anoche?'), [
            { id: 'good', label: T('Slept well, 7 hours or more', 'Gut geschlafen, 7 Stunden oder mehr', 'Bien, 7 horas o más'), run: pick('good') },
            { id: 'ok', label: T('Okay', 'Okay', 'Regular'), run: pick('ok') },
            { id: 'short', label: T('Short night', 'Kurze Nacht', 'Noche corta'), run: pick('short') }
        ]);
    }
    function menuBar() { return ls.get(MENU_KEY) === '1'; }
    function setMenuBar(on) { ls.set(MENU_KEY, on ? '1' : '0'); applyMenuBar(); root.dispatchEvent(new CustomEvent('lowi:home-menubar', { detail: { on } })); }
    function applyMenuBar() { const on = menuBar(); if (H.classList.contains('o8-menubar') !== on) { H.classList.toggle('o8-menubar', on); soon(); } }

    /* ---- geometry ---- */
    function safeArea() {
        if (!safeEl) { safeEl = D.createElement('div'); safeEl.setAttribute('aria-hidden', 'true'); safeEl.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; D.body.appendChild(safeEl); }
        const c = getComputedStyle(safeEl);
        return { t: parseFloat(c.paddingTop) || 0, r: parseFloat(c.paddingRight) || 0, b: parseFloat(c.paddingBottom) || 0, l: parseFloat(c.paddingLeft) || 0 };
    }
    function measure() {
        const m = D.getElementById('spBubble'); if (!m) return null;
        /* Misty's HOME spot: while she roams (mf-roam) her bubble is shifted by --mf-bx/--mf-by; the ring stays put (sym-home homeRect rule) */
        const q = m.getBoundingClientRect(); if (q.width < 40) return null;
        const roam = H.classList.contains('mf-roam');
        const dx = roam ? parseFloat(m.style.getPropertyValue('--mf-bx')) || 0 : 0, dy = roam ? parseFloat(m.style.getPropertyValue('--mf-by')) || 0 : 0;
        const r = { left: q.left - dx, top: q.top - dy, width: q.width, height: q.height };
        const vw = H.clientWidth || root.innerWidth, vh = root.innerHeight;
        const s = safeArea();
        /* the menu bar, when the user switched it on, takes its strip at the bottom */
        const tb = H.classList.contains('o8-menubar') ? D.getElementById('tabbar') : null, tr = tb && tb.getBoundingClientRect();
        if (tr && tr.height > 0 && tr.width > vw * 0.5 && tr.top > vh * 0.6) s.b = Math.max(s.b, vh - tr.top);
        return fit({ vw, vh, cx: r.left + r.width / 2, cy: r.top + r.height / 2, mistyR: r.width / 2, safe: s });
    }
    function setVar(el, k, v) { if (el.style.getPropertyValue(k) !== v) el.style.setProperty(k, v); }
    function place(L) {
        setVar(H, '--o8-d', L.d + 'px'); setVar(H, '--o8-r', L.R.toFixed(1) + 'px');
        setVar(H, '--o8-cx', L.cx.toFixed(1) + 'px'); setVar(H, '--o8-cy', L.cy.toFixed(1) + 'px');
        setVar(H, '--o8-joy-y', L.spots.joy.y.toFixed(1) + 'px');
        ORDER.forEach(k => {
            const el = FIND[k](); if (!el) return;
            const p = el.offsetParent, pr = p ? p.getBoundingClientRect() : { left: 0, top: 0 };
            const x = (L.spots[k].x - pr.left).toFixed(1) + 'px', y = (L.spots[k].y - pr.top).toFixed(1) + 'px';
            if (el.style.getPropertyValue('--o8-x') !== x) el.style.setProperty('--o8-x', x);
            if (el.style.getPropertyValue('--o8-y') !== y) el.style.setProperty('--o8-y', y);
        });
    }
    /* the ring holds still while Misty is away, flying or zoomed: only a resting Home re-measures */
    const busy = () => ['wh-away', 'mf-roam', 'wh-leave', 'lw-clean', 'lw-clean-out'].some(c => H.classList.contains(c));
    function layout(force) {
        if (!ensure()) return last;
        applyMenuBar();
        if (!H.classList.contains('wh-home')) return last;
        if (busy() && last && last.ok && !force) return last;
        const L = measure(); if (!L) return last;
        const wasOn = H.classList.contains('o8');
        if (!L.ok) { if (wasOn) { H.classList.remove('o8', 'o8-wide'); soon(); } last = L; return L; }
        if (!wasOn) H.classList.add('o8');
        const wide = L.d >= 104;
        if (H.classList.contains('o8-wide') !== wide) H.classList.toggle('o8-wide', wide);
        if (force || !wasOn || moved(last, L) || !last || !last.ok) {
            place(L);
            last = L;
            D.dispatchEvent(new CustomEvent('lowi:home-orbit', { detail: { layout: wide ? 'wide' : 'phone', R: L.R, d: L.d, cx: L.cx, cy: L.cy } }));
            /* turning o8 on hides the old chrome, which can move Misty: measure once more when the page has settled */
            if (!wasOn) soon();
        } else {
            /* nodes created after the last layout (Move, the gift...) still get their spot */
            place(last);
        }
        mountSiblings();
        return last;
    }
    function mountSiblings() {
        const B = root.LowiHomeBloomsV2, S = root.LowiHomeSettingsSleepV2;
        if (!mounted.blooms && B && typeof B.mount === 'function') { try { B.mount(D); mounted.blooms = true; } catch (e) { mounted.blooms = true; console.warn('[home-orbit] blooms mount', e); } }
        if (!mounted.ss && S && typeof S.mount === 'function') { try { S.mount(D); mounted.ss = true; } catch (e) { mounted.ss = true; console.warn('[home-orbit] settings/sleep mount', e); } }
    }
    let t1 = 0;
    function soon() { clearTimeout(t1); t1 = setTimeout(() => requestAnimationFrame(() => layout(false)), 120); }

    function boot() {
        layout(false);
        root.addEventListener('resize', soon, { passive: true });
        root.addEventListener('orientationchange', soon, { passive: true });
        if (root.visualViewport) root.visualViewport.addEventListener('resize', soon, { passive: true });
        ['lowi:layout', 'lowi:home-bubble-added', 'world3d-ready', 'lowi:tab'].forEach(n => D.addEventListener(n, soon));
        root.addEventListener('storage', e => { if (e.key === MENU_KEY) applyMenuBar(); });
        root.addEventListener('lowi:home-menubar', applyMenuBar);
        D.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
        try { new MutationObserver(soon).observe(H, { attributes: true, attributeFilter: ['class', 'lang'] }); } catch (e) { }
        setInterval(() => { if (!D.hidden) layout(false); }, 1500);
    }
    root.LowiHomeOrbitV2 = Object.assign({}, core, { layout: () => layout(true), current: () => last, entries, openSettings, openSleep, closeSheet, menuBar, setMenuBar, sleepToday: sleepNow });
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})(typeof window !== 'undefined' ? window : globalThis);
