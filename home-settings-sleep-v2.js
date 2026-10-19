/* home-settings-sleep-v2.js: the Sleep and Settings bubbles of the one-page Home (Oct 18 2026, Emmanuel).
   Tapping either bubble blooms a few glass chips outward, away from Misty, so she always stays in view.
   Sleep: one daily log for last night (Under 6 h / 6-7 h / 7 h or more), change or clear it any time today.
     Stored with the private health data (S.health.sleepDays via LowiVitalsBridge, account-scoped, never in the cloud backup).
     It gives no XP and no sun energy: progression is not touched until the plan aligns it.
   Settings: Me, Look & sound, Account, the bottom menu bar switch, and More (every Home entry point the ring hid).
     Every chip runs a route that exists in the app right now; a route that is missing is not shown.
     Since 18 Oct 2026 21:30 (Emmanuel: "a single tap opens the full page") one tap on Settings opens ONE Settings surface with all of
     these on it (tapIntent, pageGroups); since 19 Oct 2026 07:30 (Emmanuel: "why do you have a whole page? ... like the design of when
     the sound menu bar appears") that surface is a glass side panel in the Body sound panel's look, not a full page (placePage); the chip bloom and the More panel stay reachable through the API (open('settings'|'more'))
     for the queued double tap / hold tasks.
   window.LowiHomeSettingsSleepV2.mount(root) is idempotent. Pure helpers (sleep store, fan geometry, entries) are exported for tests. */
(function (root) {
    'use strict';
    /* ---------- pure core ---------- */
    const BANDS = ['under6', '6to7', '7plus'];
    const FILL = { under6: 1 / 3, '6to7': 2 / 3, '7plus': 1 };
    /* the shell's own fallback words, so its 'lowi:sleep' listeners read the same thing */
    const SHELL_TOKEN = { under6: 'short', '6to7': 'ok', '7plus': 'good' };
    const KEEP_DAYS = 120;
    const MENU_KEY = 'lowi.home.menubar';
    const TX = {
        en: { sleep: 'Sleep', log: 'Log', ask: 'How long did you sleep last night?', under6: 'Under 6 h', '6to7': '6\u20137 h', '7plus': '7 h or more',
            short: { under6: '<6 h', '6to7': '6\u20137 h', '7plus': '7 h+' }, notLogged: 'not logged', clear: 'Clear', clearLong: 'Clear today\u2019s sleep',
            settings: 'Settings', me: 'Me', look: 'Look & sound', account: 'Account', menubar: 'Menu bar', on: 'on', off: 'off', more: 'More', back: 'Back', close: 'Close',
            moreTitle: 'Everything else', today: 'Today & history', community: 'Community', care: 'Care board', cook: 'Cook', workouts: 'Workouts', map: 'World map',
            vr: 'VR', worldSound: 'World sound', theme: 'Day / night', gift: 'Gift of the day', weather: 'Weather', quest: 'Daily quest', goTo: 'Go to', settingsGroup: 'Settings', tutorial: 'Tutorial' },
        de: { sleep: 'Schlaf', log: 'Eintragen', ask: 'Wie lange hast du letzte Nacht geschlafen?', under6: 'Unter 6 Std.', '6to7': '6\u20137 Std.', '7plus': '7 Std. oder mehr',
            short: { under6: '<6 Std.', '6to7': '6\u20137 Std.', '7plus': '7 Std.+' }, notLogged: 'nicht eingetragen', clear: 'L\u00f6schen', clearLong: 'Heutigen Schlaf l\u00f6schen',
            settings: 'Einstellungen', me: 'Ich', look: 'Aussehen & Ton', account: 'Konto', menubar: 'Men\u00fcleiste', on: 'an', off: 'aus', more: 'Mehr', back: 'Zur\u00fcck', close: 'Schlie\u00dfen',
            moreTitle: 'Alles andere', today: 'Heute & Verlauf', community: 'Community', care: 'Care-Board', cook: 'Kochen', workouts: 'Workouts', map: 'Weltkarte',
            vr: 'VR', worldSound: 'Weltklang', theme: 'Tag / Nacht', gift: 'Geschenk des Tages', weather: 'Wetter', quest: 'Tagesquest', goTo: 'Gehe zu', settingsGroup: 'Einstellungen', tutorial: 'Tutorial' },
        es: { sleep: 'Sue\u00f1o', log: 'Anotar', ask: '\u00bfCu\u00e1nto dormiste anoche?', under6: 'Menos de 6 h', '6to7': '6\u20137 h', '7plus': '7 h o m\u00e1s',
            short: { under6: '<6 h', '6to7': '6\u20137 h', '7plus': '7 h+' }, notLogged: 'sin anotar', clear: 'Borrar', clearLong: 'Borrar el sue\u00f1o de hoy',
            settings: 'Ajustes', me: 'Yo', look: 'Aspecto y sonido', account: 'Cuenta', menubar: 'Barra de men\u00fa', on: 's\u00ed', off: 'no', more: 'M\u00e1s', back: 'Atr\u00e1s', close: 'Cerrar',
            moreTitle: 'Todo lo dem\u00e1s', today: 'Hoy e historial', community: 'Comunidad', care: 'Tablero Care', cook: 'Cocinar', workouts: 'Entrenos', map: 'Mapa del mundo',
            vr: 'RV', worldSound: 'Sonido del mundo', theme: 'D\u00eda / noche', gift: 'Regalo del d\u00eda', weather: 'Tiempo', quest: 'Misi\u00f3n diaria', goTo: 'Ir a', settingsGroup: 'Ajustes', tutorial: 'Tutorial' }
    };
    const pick = l => TX[l] || TX.en;

    function dayKey(t) {
        const d = t instanceof Date ? t : new Date(t == null ? Date.now() : t);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function days(health) {
        if (!health || typeof health !== 'object') return null;
        const m = health.sleepDays;
        if (!m || typeof m !== 'object' || Array.isArray(m)) health.sleepDays = {};
        return health.sleepDays;
    }
    function readSleep(health, day) {
        const m = health && health.sleepDays, e = m && typeof m === 'object' ? m[day] : null;
        return e && BANDS.includes(e.band) ? e.band : null;
    }
    /* one entry per day: a new choice replaces the old one (correction), older days past KEEP_DAYS are dropped */
    function writeSleep(health, day, band, ts) {
        if (!BANDS.includes(band) || !/^\d{4}-\d{2}-\d{2}$/.test(String(day))) return false;
        const m = days(health); if (!m) return false;
        m[day] = { band, ts: +ts || Date.now() };
        const keys = Object.keys(m).sort();
        while (keys.length > KEEP_DAYS) delete m[keys.shift()];
        return true;
    }
    function clearSleep(health, day) {
        const m = health && health.sleepDays;
        if (!m || typeof m !== 'object' || !m[day]) return false;
        delete m[day]; return true;
    }
    function sleepView(band, lang) {
        const t = pick(lang);
        if (!BANDS.includes(band)) return { band: null, done: false, fill: 0, value: t.log, aria: t.sleep + ', ' + t.notLogged };
        return { band, done: true, fill: FILL[band], value: t.short[band], aria: t.sleep + ', ' + t[band] };
    }

    /* chips outward from the bubble, away from Misty: the first layout that keeps every chip on screen, clear of Misty's disk,
       clear of the other ring controls (o.avoid: [{x,y,r}]) and of each other, and at least as far from Misty as the bubble.
       Tries, in order: an arc round the bubble, an arc on an outer ring round Misty, then rows in the free band past the ring
       (a phone's ring nearly fills the width, so its blooms land in the band below or above it). Chips shrink to 54 px before giving up.
       o: {mx,my,mr} Misty, {bx,by,br} bubble, n, c (chip diameter), vw, vh, safe {t,r,b,l}, avoid */
    function fan(o) {
        const n = Math.max(1, o.n | 0), s = o.safe || { t: 0, r: 0, b: 0, l: 0 }, m = 8, avoid = o.avoid || [];
        const a0 = Math.atan2(o.by - o.my, o.bx - o.mx), bd = Math.hypot(o.bx - o.mx, o.by - o.my);
        const rots = [0]; for (let r = 12; r <= 108; r += 12) rots.push(r, -r);
        function tryC(c) {
            const ok = p => p.x - c / 2 >= s.l + m && p.x + c / 2 <= o.vw - s.r - m && p.y - c / 2 >= s.t + m && p.y + c / 2 <= o.vh - s.b - m &&
                Math.hypot(p.x - o.mx, p.y - o.my) >= Math.max(bd, o.mr + c / 2 + 6) && avoid.every(q => Math.hypot(p.x - q.x, p.y - q.y) >= q.r + c / 2 + 3);
            const pass = pts => pts.every(ok) && pts.every((p, i) => pts.slice(i + 1).every(q => Math.hypot(p.x - q.x, p.y - q.y) >= c + 4 - 0.01));
            /* 1: arc round the bubble */
            for (let k = 0; k < 6; k++) {
                const dist = o.br + c / 2 + 10 + k * c * 0.45, step = 2 * Math.asin(Math.min(1, (c + 8) / (2 * dist)));
                if (step * (n - 1) > Math.PI * 1.15) continue;
                for (const r of rots) {
                    const base = a0 + r * Math.PI / 180, pts = [];
                    for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * step; pts.push({ x: o.bx + dist * Math.cos(a), y: o.by + dist * Math.sin(a) }); }
                    if (pass(pts)) return { pts, how: 'arc', c };
                }
            }
            /* 2: outer ring round Misty, centred on the bubble's angle */
            for (let k = 0; k < 4; k++) {
                const dist = bd + o.br + c / 2 + 8 + k * c * 0.6, step = 2 * Math.asin(Math.min(1, (c + 8) / (2 * dist)));
                for (const r of rots) {
                    const base = a0 + r * Math.PI / 180, pts = [];
                    for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * step; pts.push({ x: o.mx + dist * Math.cos(a), y: o.my + dist * Math.sin(a) }); }
                    if (pass(pts)) return { pts, how: 'ring', c };
                }
            }
            /* 3: rows in the band past the ring, on the bubble's side of Misty */
            const down = o.by >= o.my, per = Math.max(1, Math.floor((o.vw - s.l - s.r - 2 * m + 8) / (c + 8)));
            const edge = avoid.concat([{ x: o.bx, y: o.by, r: o.br }]).reduce((e, q) => down ? Math.max(e, q.y + q.r) : Math.min(e, q.y - q.r), down ? o.my + o.mr : o.my - o.mr);
            const pts = [];
            for (let i = 0; i < n; i++) {
                const line = Math.floor(i / per), inLine = Math.min(per, n - line * per), col = i - line * per, w = inLine * c + (inLine - 1) * 8;
                const x0 = Math.min(o.vw - s.r - m - w, Math.max(s.l + m, o.bx - w / 2)) + c / 2;
                const y = down ? edge + 10 + c / 2 + line * (c + 8) : edge - 10 - c / 2 - line * (c + 8);
                pts.push({ x: x0 + col * (c + 8), y });
            }
            if (pass(pts)) return { pts, how: 'rows', c };
            return null;
        }
        for (let c = o.c; c >= Math.min(o.c, 54); c -= 6) { const r = tryC(c); if (r) return Object.assign(r, { fit: true }); }
        /* nothing fits cleanly (tiny window): one clamped row on the bubble's far side, smallest chips */
        const c = Math.min(o.c, 54), dir = o.by >= o.my ? 1 : -1, y = Math.min(o.vh - s.b - m - c / 2, Math.max(s.t + m + c / 2, o.by + dir * (o.br + c / 2 + 10)));
        const w = n * c + (n - 1) * 8, x0 = Math.min(o.vw - s.r - m - w, Math.max(s.l + m, o.bx - w / 2)) + c / 2;
        return { pts: Array.from({ length: n }, (_, i) => ({ x: x0 + i * (c + 8), y })), how: 'clamp', c, fit: false };
    }

    /* the hidden Home entry points that no bubble reaches (Oct 18 2026, Emmanuel: "some of the everything is redundant").
       Go to = places, Settings = switches. env.has(id) says whether its real route exists right now. */
    const MORE_GROUPS = { go: ['community', 'care', 'workouts', 'map', 'vr', 'gift', 'weather'], set: ['worldSound'] };
    const MORE = MORE_GROUPS.go.concat(MORE_GROUPS.set);
    /* out of the panel, and where each one is still reached (their routes and features stay in the app):
       today: Emmanuel dropped Today from Home; cook: Fuel bubble > Cook; theme: Settings > Look & sound > Day & night;
       quest: Emmanuel dropped Daily quest */
    const MORE_REMOVED = { today: 'removed', cook: 'fuel', theme: 'look', quest: 'removed' };
    function moreGroups(env) {
        const has = id => !!(env && env.has && env.has(id));
        return { go: MORE_GROUPS.go.filter(has), set: MORE_GROUPS.set.filter(has) };
    }
    /* where the More panel goes: the first free band round the ring (beside it on a wide screen, below or above it on a tall one),
       on the Settings bubble's side first, clear of Misty and of every ring control, at the fewest columns that fit with no scrolling.
       A phone's ring fills the screen, so it then sits right under (or over) Misty, over the outer bubbles but never on her.
       o: {vw, vh, safe {t,r,b,l}, misty {x,y,r}, bubble {x,y}, rects [{l,t,r,b}] ring controls, measure(width, cols) -> height}
       -> {left, top, width, height, cols, side, fit}; fit false = nothing fits: the body scrolls under a header that stays. */
    function placePanel(o) {
        const s = o.safe || { t: 0, r: 0, b: 0, l: 0 }, m = 10, M = o.misty, rects = o.rects || [];
        const box = rects.reduce((a, q) => ({ l: Math.min(a.l, q.l), t: Math.min(a.t, q.t), r: Math.max(a.r, q.r), b: Math.max(a.b, q.b) }), { l: M.x - M.r, t: M.y - M.r, r: M.x + M.r, b: M.y + M.r });
        const L = s.l + m, R = o.vw - s.r - m, T = s.t + m, B = o.vh - s.b - m;
        let dx = (o.bubble ? o.bubble.x : M.x + 1) - M.x, dy = (o.bubble ? o.bubble.y : M.y) - M.y; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
        const byDir = list => list.map((g, i) => Object.assign(g, { score: g.nx * dx + g.ny * dy - i * 1e-3 })).sort((a, b) => b.score - a.score);
        const clean = byDir([
            { side: 'right', l: box.r + m, r: R, t: T, b: B, nx: 1, ny: 0, maxW: 420 },
            { side: 'left', l: L, r: box.l - m, t: T, b: B, nx: -1, ny: 0, maxW: 420 },
            { side: 'below', l: L, r: R, t: box.b + m, b: B, nx: 0, ny: 1, maxW: 640 },
            { side: 'above', l: L, r: R, t: T, b: box.t - m, nx: 0, ny: -1, maxW: 640 }]);
        const tight = byDir([
            { side: 'under-misty', l: L, r: R, t: M.y + M.r + m, b: B, nx: 0, ny: 1, maxW: 640 },
            { side: 'over-misty', l: L, r: R, t: T, b: M.y - M.r - m, nx: 0, ny: -1, maxW: 640 }]);
        const MINC = o.minCol || 88, MAXC = o.maxCols || 4;
        const put = (g, w, h, cols, fit) => {
            const vert = g.side === 'left' || g.side === 'right';
            const left = vert ? (g.side === 'right' ? g.l : g.r - w) : Math.max(g.l, Math.min(g.r - w, M.x - w / 2));
            const top = vert ? Math.max(g.t, Math.min(g.b - h, M.y - h / 2)) : (g.ny > 0 ? g.t : g.b - h);
            return { left: Math.round(left), top: Math.round(top), width: Math.round(w), height: Math.round(h), cols, side: g.side, fit };
        };
        for (const g of clean.concat(tight)) {
            const W = g.r - g.l, Hh = g.b - g.t; if (W < 220 || Hh < 120) continue;
            const w = Math.min(W, g.maxW);
            for (let cols = 1; cols <= MAXC && w / cols >= MINC; cols++) { const h = o.measure(w, cols); if (h <= Hh) return put(g, w, h, cols, true); }
        }
        /* nothing fits: the tallest spot next to Misty, widest grid, no taller than that spot (so it stays off Misty); the list scrolls, the header stays */
        const g = tight.slice().sort((a, b) => (b.b - b.t) - (a.b - a.t))[0], W = Math.max(160, g.r - g.l), w = Math.min(W, g.maxW);
        const cols = Math.max(1, Math.min(MAXC, Math.floor(w / MINC))), h = Math.max(120, Math.min(o.measure(w, cols), g.b - g.t, B - T));
        const P = put(g, w, h, cols, false); P.top = Math.max(T, Math.min(B - P.height, P.top)); return P;
    }
    function entries(kind, env) {
        const has = id => !!(env && env.has && env.has(id));
        if (kind === 'settings') return ['me', 'look', 'account', 'menubar', 'more'].filter(id => id === 'more' ? MORE.some(has) : has(id));
        if (kind === 'more') return MORE.filter(has);
        if (kind === 'sleep') return env && env.logged ? BANDS.concat('clear') : BANDS.slice();
        return [];
    }

    /* what one tap on a bubble does, given what is open now: Settings opens its full page (not the chip bloom), Sleep its bloom;
       a tap on a bubble whose surface is already open closes it. -> 'page' | 'sleep' | 'close' */
    function tapIntent(bubble, open) {
        if (bubble === 'settings') return open === 'page' || open === 'settings' || open === 'more' ? 'close' : 'page';
        if (bubble === 'sleep') return open === 'sleep' ? 'close' : 'sleep';
        return 'close';
    }
    /* what a row on the Settings panel does (Oct 19 2026, Emmanuel: the sound panel opened BEHIND Settings):
       'toggle' flips in place and Settings stays; 'panel' opens another panel, so Settings steps aside first and that panel is in front;
       'go' closes Settings and runs its route */
    const PANEL_ROWS = ['worldSound'], TOGGLE_ROWS = ['menubar', 'quest'];
    function rowAction(id) { return PANEL_ROWS.includes(id) ? 'panel' : TOGGLE_ROWS.includes(id) ? 'toggle' : 'go'; }
    /* the Settings panel (one tap): the Settings choices first (no More chip: More is on the panel), then every More entry; empty groups drop */
    function pageGroups(env) {
        const has = id => !!(env && env.has && env.has(id));
        return [{ key: 'main', ids: ['me', 'look', 'account', 'menubar', 'tutorial'].filter(has) }, { key: 'more', ids: MORE.filter(has) }].filter(g => g.ids.length);
    }

    const core = { BANDS, FILL, SHELL_TOKEN, KEEP_DAYS, MENU_KEY, MORE, MORE_GROUPS, MORE_REMOVED, moreGroups, placePanel, TX, dayKey, readSleep, writeSleep, clearSleep, sleepView, fan, entries, tapIntent, pageGroups, rowAction };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!root || !root.document) return;

    /* ---------- browser ---------- */
    const D = root.document, H = D.documentElement;
    const lang = () => { const l = (H.lang || 'en').slice(0, 2); return TX[l] ? l : 'en'; };
    const t = () => pick(lang());
    const $ = s => D.querySelector(s);
    const ls = { get(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { root.localStorage.setItem(k, v); } catch (e) { } } };
    const P = 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"';
    const ICON = {
        under6: '<path d="M5 18v-3" ' + P + '/><path d="M12 18v-7M19 18V7" ' + P + ' opacity=".35"/>',
        '6to7': '<path d="M5 18v-3M12 18v-7" ' + P + '/><path d="M19 18V7" ' + P + ' opacity=".35"/>',
        '7plus': '<path d="M5 18v-3M12 18v-7M19 18V7" ' + P + '/>',
        clear: '<path d="M9 7 5 11l4 4M5 11h9a5 5 0 0 1 0 10h-2" ' + P + '/>',
        me: '<circle cx="12" cy="8.5" r="3.5" ' + P + '/><path d="M5 20a7 7 0 0 1 14 0" ' + P + '/>',
        look: '<path d="M4 10v4h3l4 3.5v-11L7 10H4z" ' + P + '/><path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10" ' + P + '/>',
        account: '<rect x="5" y="10.5" width="14" height="9.5" rx="2" ' + P + '/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" ' + P + '/>',
        menubar: '<rect x="3.5" y="4" width="17" height="16" rx="3" ' + P + '/><path d="M3.5 15.5h17M8 18h.01M12 18h.01M16 18h.01" ' + P + '/>',
        tutorial: '<circle cx="12" cy="12" r="8.5" ' + P + '/><path d="M10 8.8v6.4l5.2-3.2z" ' + P + '/>',
        more: '<path d="M6 12h.01M12 12h.01M18 12h.01" ' + P + ' stroke-width="3"/>'
    };
    const svg = k => '<svg class="ss2-ico" viewBox="0 0 24 24" aria-hidden="true">' + (ICON[k] || '') + '</svg>';

    /* ---- sleep store (private health data) ---- */
    const bridge = () => { const B = root.LowiVitalsBridge; return B && typeof B.state === 'function' && typeof B.save === 'function' ? B : null; };
    function health() { const B = bridge(); if (!B) return null; const S = B.state(); if (!S) return null; if (!S.health || typeof S.health !== 'object') S.health = {}; return S.health; }
    function sleepToday() { return readSleep(health(), dayKey()); }
    function setSleep(band) {
        const B = bridge(), h = health(); if (!B || !h) return false;
        const day = dayKey(), ok = band ? writeSleep(h, day, band, Date.now()) : clearSleep(h, day);
        if (!ok) return false;
        B.save();
        paintSleep();
        D.dispatchEvent(new CustomEvent('lowi:sleep', { detail: { day, band: band || null, value: band ? SHELL_TOKEN[band] : '', source: 'settings-sleep' } }));
        return true;
    }

    /* ---- menu bar switch (shell contract: localStorage lowi.home.menubar '1'|'0' + window 'lowi:home-menubar') ---- */
    const orbit = () => root.LowiHomeOrbitV2 || null;
    function menuBar() { const O = orbit(); if (O && typeof O.menuBar === 'function') return !!O.menuBar(); return ls.get(MENU_KEY) === '1'; }
    function setMenuBar(on) {
        const O = orbit();
        if (O && typeof O.setMenuBar === 'function') { O.setMenuBar(!!on); return; }
        ls.set(MENU_KEY, on ? '1' : '0');
        root.dispatchEvent(new CustomEvent('lowi:home-menubar', { detail: { on: !!on } }));
    }

    /* ---- real routes ---- */
    const fn = (o, k) => o && typeof o[k] === 'function';
    const clickSel = sel => () => { const el = $(sel); if (el) el.click(); };
    const goTab = tab => () => { if (fn(root, 'goTab')) root.goTab(tab); else { const b = $('#tabbar [data-tab="' + tab + '"]'); if (b) b.click(); } };
    const profileTile = k => () => {
        goTab('profile')();
        let n = 0; const tryOpen = () => {
            const G = root.LowiG2E, st = G && fn(G, 'state') ? G.state() : null;
            if (st && st.on && (st.tiles || []).includes(k)) { G.open(k); return; }
            if (++n < 50) setTimeout(tryOpen, 80);
        };
        setTimeout(tryOpen, 30);
    };
    const tabExists = tab => fn(root, 'goTab') && !!$('#tabbar [data-tab="' + tab + '"], [data-tab="' + tab + '"]');
    const ROUTES = {
        me: { has: () => tabExists('profile'), run: goTab('profile') },
        look: { has: () => tabExists('profile') && !!root.LowiG2E, run: profileTile('look') },
        account: { has: () => tabExists('profile') && !!root.LowiG2E, run: profileTile('acct') },
        menubar: { has: () => !!$('#tabbar'), run: () => setMenuBar(!menuBar()), toggle: () => menuBar() },
        today: { has: () => !!$('#whHud .wh-todaybtn'), run: clickSel('#whHud .wh-todaybtn') },
        community: { has: () => tabExists('foryou'), run: goTab('foryou') },
        care: { has: () => !!(root.LowiR3F && fn(root.LowiR3F, 'openBoardTab')), run: () => root.LowiR3F.openBoardTab() },
        cook: { has: () => tabExists('shelf'), run: goTab('shelf') },
        workouts: { has: () => tabExists('move'), run: goTab('move') },
        map: { has: () => !!$('#whHud .wh-zoom'), run: clickSel('#whHud .wh-zoom') },
        vr: { has: () => !!$('#whHud .wh-vr'), run: clickSel('#whHud .wh-vr') },
        worldSound: { has: () => !!$('#whHud .wa-btn'), run: () => { if (fn(root.LowiWorldAudio, 'open')) root.LowiWorldAudio.open(); else clickSel('#whHud .wa-btn')(); }, toggle: () => !!(root.LowiWorldAudio && fn(root.LowiWorldAudio, 'on') && root.LowiWorldAudio.on()) },
        theme: { has: () => !!(root.LowiTopBar && fn(root.LowiTopBar, 'toggleTheme')), run: () => root.LowiTopBar.toggleTheme() },
        gift: { has: () => !!$('.hs-gift'), run: clickSel('.hs-gift') },
        weather: { has: () => !!(root.LowiTopBar && fn(root.LowiTopBar, 'openWeather')), run: () => root.LowiTopBar.openWeather() },
        /* Oct 19 2026 (Emmanuel): replay the guided tour (tutorial.js / tutorial-steps.js); Settings closes first, the tour waits for it */
        tutorial: { has: () => !!(root.LowiTutorial && fn(root.LowiTutorial, 'start')), run: () => root.LowiTutorial.start({ from: 'settings' }) },
        quest: { has: () => !!$('#f3Board'), run: () => H.classList.toggle('o8-quest'), toggle: () => H.classList.contains('o8-quest') }
    };
    /* today, cook, theme and quest stay as routes (nothing deleted) but are out of More: see MORE_REMOVED */
    const env = { has: id => !!(ROUTES[id] && (() => { try { return ROUTES[id].has(); } catch (e) { return false; } })()) };

    /* ---- bloom ---- */
    let mounted = false, rootEl = D, open = null, layer = null, lastBubble = null;
    const findBubble = k => (rootEl.querySelector && rootEl.querySelector('[data-orbit="' + k + '"]')) || $('[data-orbit="' + k + '"]');
    let safeEl = null;
    function safeArea() {
        if (!safeEl || !safeEl.isConnected) { safeEl = D.createElement('div'); safeEl.setAttribute('aria-hidden', 'true'); safeEl.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; D.body.appendChild(safeEl); }
        const c = getComputedStyle(safeEl), s = { t: parseFloat(c.paddingTop) || 0, r: parseFloat(c.paddingRight) || 0, b: parseFloat(c.paddingBottom) || 0, l: parseFloat(c.paddingLeft) || 0 };
        /* the menu bar, when switched on, owns its strip at the bottom */
        const tb = H.classList.contains('o8-menubar') ? D.getElementById('tabbar') : null, tr = tb && tb.getBoundingClientRect();
        if (tr && tr.height > 0 && tr.top > root.innerHeight * 0.6) s.b = Math.max(s.b, root.innerHeight - tr.top);
        return s;
    }
    function misty() {
        const m = $('[data-home-misty]') || D.getElementById('spBubble');
        const vw = H.clientWidth || root.innerWidth, vh = root.innerHeight;
        if (!m) return { x: vw / 2, y: vh / 2, r: 0 };
        const q = m.getBoundingClientRect(), roam = H.classList.contains('mf-roam');
        const dx = roam ? parseFloat(m.style.getPropertyValue('--mf-bx')) || 0 : 0, dy = roam ? parseFloat(m.style.getPropertyValue('--mf-by')) || 0 : 0;
        return { x: q.left - dx + q.width / 2, y: q.top - dy + q.height / 2, r: Math.max(q.width, q.height) / 2 };
    }
    function chipHTML(kind, id) {
        const T = t();
        if (kind === 'sleep') {
            const cur = sleepToday();
            if (id === 'clear') return '<button type="button" class="ss2-chip ss2-clear" data-ss2="clear" aria-label="' + T.clearLong + '"><span class="ss2-face">' + svg('clear') + '<span>' + T.clear + '</span></span></button>';
            return '<button type="button" class="ss2-chip" role="radio" data-ss2="' + id + '" aria-checked="' + (cur === id) + '" aria-label="' + T[id] + '"><span class="ss2-face">' + svg(id) + '<span>' + T.short[id] + '</span></span></button>';
        }
        const R = ROUTES[id], tog = R && R.toggle, label = T[id] || id;
        const row = kind === 'more', open1 = row ? '' : '<span class="ss2-face">' + svg(id), close1 = row ? '' : '</span>';
        if (tog) { const on = !!tog(); return '<button type="button" class="ss2-chip' + (row ? ' ss2-row' : '') + '" role="switch" data-ss2="' + id + '" aria-checked="' + on + '" aria-label="' + label + '">' + open1 + '<span>' + label + '</span><small>' + (on ? T.on : T.off) + '</small>' + close1 + '</button>'; }
        return '<button type="button" class="ss2-chip' + (row ? ' ss2-row' : '') + '" data-ss2="' + id + '" aria-label="' + label + '">' + open1 + '<span>' + label + '</span>' + close1 + '</button>';
    }
    function ensureLayer() {
        if (layer && layer.isConnected) return layer;
        layer = D.createElement('div'); layer.id = 'ss2Bloom'; layer.className = 'ss2-layer';
        layer.addEventListener('click', onChip);
        D.body.appendChild(layer);
        return layer;
    }
    function close(refocus) {
        if (!open) return;
        const was = open; open = null;
        H.classList.remove('ss2-open', 'ss2-page-open');
        if (layer) { layer.innerHTML = ''; layer.removeAttribute('data-kind'); }
        if (lastBubble) lastBubble.setAttribute('aria-expanded', 'false');
        if (refocus && lastBubble && lastBubble.focus) { try { lastBubble.focus({ preventScroll: true }); } catch (e) { } }
        D.dispatchEvent(new CustomEvent('lowi:bloom-v2', { detail: { kind: was, open: false, owner: 'settings-sleep' } }));
    }
    /* one row of the full Settings page: icon (Settings choices), label, then on/off for a switch or a chevron for a place */
    function pageRow(id) {
        const T = t(), R = ROUTES[id], tog = R && R.toggle, label = T[id] || id, ico = ICON[id] ? svg(id) : '';
        const chev = '<svg class="ss2-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6" ' + P + '/></svg>';
        /* a row that opens another panel (World sound -> Body sound): shows its state, says it opens a dialog, no switch role */
        if (rowAction(id) === 'panel') { const on = !!(tog && tog()), st = on ? T.on : T.off; return '<button type="button" class="ss2-chip ss2-row" data-ss2="' + id + '" aria-haspopup="dialog" aria-label="' + label + ': ' + st + '">' + ico + '<span class="ss2-lbl">' + label + '</span><small>' + st + '</small>' + chev + '</button>'; }
        if (tog) { const on = !!tog(); return '<button type="button" class="ss2-chip ss2-row" role="switch" data-ss2="' + id + '" aria-checked="' + on + '" aria-label="' + label + '">' + ico + '<span class="ss2-lbl">' + label + '</span><small>' + (on ? T.on : T.off) + '</small></button>'; }
        return '<button type="button" class="ss2-chip ss2-row" data-ss2="' + id + '">' + ico + '<span class="ss2-lbl">' + label + '</span>' + chev + '</button>';
    }
    function showPage(b) {
        const groups = pageGroups(env); if (!groups.length) return false;
        const B = root.LowiHomeBloomsV2; if (B && fn(B, 'isOpen') && B.isOpen() && fn(B, 'close')) { try { B.close(); } catch (e) { } }
        if (lastBubble && lastBubble !== b) lastBubble.setAttribute('aria-expanded', 'false');
        const L = ensureLayer(), T = t(), q = b.getBoundingClientRect();
        open = 'page'; lastBubble = b;
        H.classList.add('ss2-open', 'ss2-page-open'); L.setAttribute('data-kind', 'page');
        b.setAttribute('aria-expanded', 'true');
        const sec = g => g.key === 'more'
            ? '<section class="ss2-group" aria-labelledby="ss2PageMore"><h3 class="ss2-gl" id="ss2PageMore">' + T.more + '</h3><div class="ss2-list">' + g.ids.map(pageRow).join('') + '</div></section>'
            : '<section class="ss2-group" aria-label="' + T.settings + '"><div class="ss2-list">' + g.ids.map(pageRow).join('') + '</div></section>';
        /* Oct 19 2026 (Emmanuel): not a whole page but a glass side panel in the Body sound panel's look, beside / under Misty so she and
           Home stay in view; it grows out of the Settings bubble; the x sits at its bottom right */
        L.innerHTML = '<div class="ss2-page" role="dialog" aria-modal="true" aria-labelledby="ss2PageTitle">' +
            '<h2 class="ss2-page-title" id="ss2PageTitle">' + T.settings + '</h2>' +
            '<div class="ss2-page-body">' + groups.map(sec).join('') + '</div>' +
            '<div class="ss2-page-foot"><button type="button" class="ss2-page-x" data-ss2="close" aria-label="' + T.close + '">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" ' + P + ' stroke-width="2.2"/></svg></button></div></div>';
        placePage(L.querySelector('.ss2-page'), b);
        const f = L.querySelector('.ss2-page-body button'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } }
        D.dispatchEvent(new CustomEvent('lowi:bloom-v2', { detail: { kind: 'page', open: true, owner: 'settings-sleep' } }));
        return true;
    }
    /* where the Settings panel goes: the same free-space rule as the More panel (placePanel), clear of Misty and the ring where it can */
    function placePage(pn, b, still) {
        if (!pn) return;
        const q = b.getBoundingClientRect(), M = misty(), vw = H.clientWidth || root.innerWidth, vh = root.innerHeight, safe = safeArea();
        const rects = [...D.querySelectorAll('[data-orbit]')].map(e => e.getBoundingClientRect()).filter(r => r.width > 2).map(r => ({ l: r.left, t: r.top, r: r.right, b: r.bottom }));
        const measure = (w, cols) => { pn.style.cssText = 'top:0;left:0;width:' + w + 'px;max-height:none;visibility:hidden;animation:none;--ss2-cols:' + cols; return Math.ceil(pn.getBoundingClientRect().height); };
        /* at most two columns of readable rows (each at least 150 px wide); when even that does not fit, the list scrolls inside the panel */
        const Pl = placePanel({ vw, vh, safe, misty: { x: M.x, y: M.y, r: M.r }, bubble: { x: q.left + q.width / 2, y: q.top + q.height / 2 }, rects, measure, maxCols: 2, minCol: 150 });
        const ox = (q.left + q.width / 2 - Pl.left).toFixed(0), oy = (q.top + q.height / 2 - Pl.top).toFixed(0);
        pn.style.cssText = 'left:' + Pl.left + 'px;top:' + Pl.top + 'px;width:' + Pl.width + 'px;' + (Pl.fit ? '' : 'height:' + Pl.height + 'px;') + '--ss2-cols:' + Pl.cols + ';transform-origin:' + ox + 'px ' + oy + 'px' + (still ? ';animation:none' : '');
        pn.setAttribute('data-side', Pl.side); pn.setAttribute('data-fit', String(Pl.fit)); pn.setAttribute('data-cols', String(Pl.cols));
    }
    /* Tab and Shift+Tab stay inside the open panel (it is modal) */
    function trapTab(e) {
        if (open !== 'page' || !layer || e.key !== 'Tab') return;
        const bs = [...layer.querySelectorAll('button')]; if (!bs.length) return;
        const i = bs.indexOf(D.activeElement), last = bs.length - 1;
        if (e.shiftKey && i <= 0) { e.preventDefault(); bs[last].focus(); } else if (!e.shiftKey && (i === last || i < 0)) { e.preventDefault(); bs[0].focus(); }
    }
    function show(kind) {
        const bubbleKey = kind === 'more' || kind === 'page' ? 'settings' : kind;
        const b = findBubble(bubbleKey); if (!b) return false;
        if (kind === 'page') return showPage(b);
        const ids = entries(kind, { has: env.has, logged: kind === 'sleep' && !!sleepToday() });
        if (!ids.length) return false;
        if (lastBubble && lastBubble !== b) lastBubble.setAttribute('aria-expanded', 'false');
        /* one bloom at a time across the Home */
        const B = root.LowiHomeBloomsV2; if (B && fn(B, 'isOpen') && B.isOpen() && fn(B, 'close')) { try { B.close(); } catch (e) { } }
        const L = ensureLayer(), T = t(), q = b.getBoundingClientRect(), M = misty();
        const vw = H.clientWidth || root.innerWidth, vh = root.innerHeight, safe = safeArea();
        const bx = q.left + q.width / 2, by = q.top + q.height / 2, br = q.width / 2;
        open = kind; lastBubble = b;
        H.classList.add('ss2-open'); L.setAttribute('data-kind', kind);
        b.setAttribute('aria-expanded', 'true');
        if (kind === 'more') {
            /* two short groups in a glass panel beside, below or above the ring: never on Misty, no scrolling, header always in view */
            const G = moreGroups(env), grp = (label, ids) => ids.length ? '<section class="ss2-group" aria-label="' + label + '"><h3 class="ss2-gl">' + label + '</h3><div class="ss2-grid">' + ids.map(id => chipHTML('more', id)).join('') + '</div></section>' : '';
            L.innerHTML = '<div class="ss2-panel" role="dialog" aria-label="' + T.moreTitle + '">' +
                '<div class="ss2-head"><button type="button" class="ss2-back" data-ss2="back">' + T.back + '</button><b>' + T.moreTitle + '</b><button type="button" class="ss2-back" data-ss2="close" aria-label="' + T.close + '">\u00d7</button></div>' +
                '<div class="ss2-body">' + grp(T.goTo, G.go) + grp(T.settingsGroup, G.set) + '</div></div>';
            const pn = L.querySelector('.ss2-panel');
            const rects = [...D.querySelectorAll('[data-orbit]')].map(e => e.getBoundingClientRect()).filter(r => r.width > 2).map(r => ({ l: r.left, t: r.top, r: r.right, b: r.bottom }));
            const measure = (w, cols) => { pn.style.cssText = 'top:0;left:0;width:' + w + 'px;max-height:none;visibility:hidden;--ss2-cols:' + cols; return Math.ceil(pn.getBoundingClientRect().height); };
            const P = placePanel({ vw, vh, safe, misty: { x: M.x, y: M.y, r: M.r }, bubble: { x: bx, y: by }, rects, measure });
            pn.style.cssText = 'left:' + P.left + 'px;top:' + P.top + 'px;width:' + P.width + 'px;' + (P.fit ? '' : 'height:' + P.height + 'px;') + '--ss2-cols:' + P.cols;
            pn.setAttribute('data-side', P.side); pn.setAttribute('data-fit', String(P.fit));
        } else {
            const avoid = [...D.querySelectorAll('[data-orbit]')].filter(e => e !== b).map(e => e.getBoundingClientRect()).filter(r => r.width > 2)
                .map(r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.max(r.width, r.height) / 2 }));
            const F = fan({ mx: M.x, my: M.y, mr: M.r, bx, by, br, n: ids.length, c: Math.round(Math.max(54, Math.min(88, q.width * 0.8))), vw, vh, safe, avoid }), c = F.c;
            const label = kind === 'sleep' ? T.ask : T.settings;
            L.innerHTML = '<div class="ss2-fan" role="' + (kind === 'sleep' ? 'radiogroup' : 'group') + '" aria-label="' + label + '" style="--ss2-c:' + c + 'px">' +
                ids.map((id, i) => chipHTML(kind, id).replace('<button ', '<button style="left:' + F.pts[i].x.toFixed(1) + 'px;top:' + F.pts[i].y.toFixed(1) + 'px;--ss2-fx:' + (bx - F.pts[i].x).toFixed(1) + 'px;--ss2-fy:' + (by - F.pts[i].y).toFixed(1) + 'px;--ss2-i:' + i + '" ')).join('') +
                (kind === 'sleep' ? '<p class="ss2-ask" aria-hidden="true">' + T.ask + '</p>' : '') + '</div>';
            if (kind === 'sleep') placeAsk(L, F, c, vw, M);
        }
        const f = L.querySelector('[role="radio"][aria-checked="true"]') || L.querySelector('button'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } }
        D.dispatchEvent(new CustomEvent('lowi:bloom-v2', { detail: { kind, open: true, owner: 'settings-sleep' } }));
        return true;
    }
    /* the question rides just beyond the chips, on the side away from Misty; dropped when it would not fit */
    function placeAsk(L, F, c, vw, M) {
        const p = L.querySelector('.ss2-ask'); if (!p) return;
        const xs = F.pts.map(q => q.x), ys = F.pts.map(q => q.y);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2, below = (Math.min(...ys) + Math.max(...ys)) / 2 >= M.y;
        const y = below ? Math.max(...ys) + c / 2 + 8 : Math.min(...ys) - c / 2 - 8;
        const w = Math.min(220, vw - 24), x = Math.max(12, Math.min(vw - 12 - w, cx - w / 2));
        p.style.cssText = 'left:' + x.toFixed(0) + 'px;width:' + w + 'px;top:' + y.toFixed(0) + 'px;' + (below ? '' : 'transform:translateY(-100%)');
        const r = p.getBoundingClientRect(), mr = { l: M.x - M.r, r: M.x + M.r, t: M.y - M.r, b: M.y + M.r };
        const hitsMisty = !(r.right < mr.l || r.left > mr.r || r.bottom < mr.t || r.top > mr.b);
        if (hitsMisty || r.bottom > root.innerHeight - 4 || r.top < 4) p.remove();
    }
    function onChip(e) {
        const b = e.target && e.target.closest && e.target.closest('[data-ss2]'); if (!b) return;
        e.preventDefault(); e.stopPropagation();
        const id = b.getAttribute('data-ss2'), kind = open;
        if (id === 'close') { close(true); return; }
        if (id === 'back') { show('settings'); return; }
        if (kind === 'sleep') {
            if (id === 'clear') setSleep(null); else if (BANDS.includes(id)) setSleep(id);
            pulse(); setTimeout(() => close(true), 380);
            return;
        }
        if (id === 'more') { show('more'); return; }
        const R = ROUTES[id]; if (!R) return;
        /* a row that opens another panel: Settings steps aside first, so that panel is in front and usable (never behind Settings) */
        if (rowAction(id) === 'panel') { close(false); try { R.run(); } catch (err) { console.warn('[settings-sleep]', id, err); } return; }
        if (R.toggle) {
            try { R.run(); } catch (err) { console.warn('[settings-sleep]', id, err); }
            /* switches stay open and show their new state in place */
            setTimeout(() => {
                if (open !== kind) return;
                const on = !!R.toggle(), T = t(); b.setAttribute('aria-checked', String(on));
                const sm = b.querySelector('small'); if (sm) sm.textContent = on ? T.on : T.off;
            }, 60);
            return;
        }
        close(false);
        try { R.run(); } catch (err) { console.warn('[settings-sleep]', id, err); }
    }
    function pulse() { const b = findBubble('sleep'), tx = b && b.querySelector('.wh-cell-tx'); if (!tx) return; tx.classList.remove('ss2-pulse'); void tx.offsetWidth; tx.classList.add('ss2-pulse'); }

    /* ---- the Sleep bubble face (the shell made it; we only paint inside) ---- */
    function paintSleep() {
        const b = findBubble('sleep'); if (!b) return;
        const v = sleepView(sleepToday(), lang());
        const val = b.querySelector('.o8-val'); if (val && val.textContent !== v.value) val.textContent = v.value;
        if (b.getAttribute('aria-label') !== v.aria) b.setAttribute('aria-label', v.aria);
        const f = String(v.fill.toFixed(3)); if (b.style.getPropertyValue('--wh-fill') !== f) b.style.setProperty('--wh-fill', f);
        if (v.band) b.setAttribute('data-ss2-band', v.band); else b.removeAttribute('data-ss2-band');
        b.classList.toggle('done', v.done);
    }
    /* take over the taps the shell offers (it steps aside on data-o8-adapter) */
    function claim() {
        const s = findBubble('sleep'), g = findBubble('settings');
        if (s && bridge()) { if (s.dataset.o8Adapter !== 'settings-sleep') s.dataset.o8Adapter = 'settings-sleep'; if (!s.hasAttribute('aria-expanded')) s.setAttribute('aria-expanded', 'false'); paintSleep(); }
        if (g) { if (g.dataset.o8Adapter !== 'settings-sleep') g.dataset.o8Adapter = 'settings-sleep'; if (!g.hasAttribute('aria-expanded')) g.setAttribute('aria-expanded', 'false'); if (g.getAttribute('aria-haspopup') !== 'dialog') g.setAttribute('aria-haspopup', 'dialog'); }
    }
    function onTap(e) {
        const el = e.target && e.target.closest && e.target.closest('[data-orbit="sleep"],[data-orbit="settings"]');
        if (!el || el.dataset.o8Adapter !== 'settings-sleep') return;
        const k = el.getAttribute('data-orbit');
        e.preventDefault();
        const i = tapIntent(k, open);
        if (i === 'close') close(true); else show(i);
    }
    function onDown(e) {
        if (!open) return;
        const tg = e.target;
        if (layer && layer.contains(tg)) return;
        if (tg && tg.closest && tg.closest('[data-orbit="sleep"],[data-orbit="settings"]')) return;
        close(false);
    }
    function mount(r) {
        rootEl = r && r.querySelector ? r : D;
        claim();
        if (mounted) return api;
        mounted = true;
        D.addEventListener('click', onTap, true);
        D.addEventListener('pointerdown', onDown, true);
        D.addEventListener('keydown', e => { if (e.key === 'Escape' && open) close(true); else trapTab(e); });
        D.addEventListener('lowi:bloom-v2', e => { const d = e && e.detail; if (d && d.open && d.owner !== 'settings-sleep') close(false); });
        ['lowi:home-orbit', 'lowi:home-bubble-added'].forEach(n => { D.addEventListener(n, claim); root.addEventListener(n, claim); });
        /* the ring moved (menu bar switched, rotation): an open bloom follows its bubble */
        D.addEventListener('lowi:home-orbit', () => { if (!open || open === 'page') return; /* the Settings panel stays where it is: it never jumps under a finger */ const k = open, a = D.activeElement, id = a && layer && layer.contains(a) ? a.getAttribute('data-ss2') : null; show(k); const f = id && layer.querySelector('[data-ss2="' + id + '"]'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } } });
        D.addEventListener('lowi:tab', () => { close(false); setTimeout(claim, 400); });
        root.addEventListener('lowi:state', paintSleep);
        /* a bloom is placed round its bubble, so it closes when the window changes; the full page lays itself out and stays */
        root.addEventListener('resize', () => { if (open && open !== 'page') close(false); else if (open === 'page' && layer && lastBubble) placePage(layer.querySelector('.ss2-page'), lastBubble, true); }, { passive: true });
        D.addEventListener('visibilitychange', () => { if (!D.hidden) claim(); });
        /* Home leaves (another tab, Misty flies off): the bloom goes with it; a new day empties the Sleep bubble */
        setInterval(() => { if (D.hidden) return; claim(); if (open && (!H.classList.contains('wh-home') || H.classList.contains('wh-away'))) close(false); }, 1500);
        return api;
    }
    function unmount() {
        close(false);
        ['sleep', 'settings'].forEach(k => { const b = findBubble(k); if (b && b.dataset.o8Adapter === 'settings-sleep') delete b.dataset.o8Adapter; });
    }
    const api = Object.assign({}, core, {
        mount, unmount, close: () => close(false), isOpen: () => open, open: k => show(k),
        sleep: { today: () => { const band = sleepToday(); return Object.assign({ day: dayKey() }, sleepView(band, lang())); }, set: band => setSleep(band), clear: () => setSleep(null) },
        menuBar, setMenuBar, available: () => ({ settings: entries('settings', env), more: entries('more', env) })
    });
    root.LowiHomeSettingsSleepV2 = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
