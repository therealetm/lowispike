/* home-settings-sleep-v2.js: the Sleep and Settings bubbles of the one-page Home (Oct 18 2026, Emmanuel).
   Tapping either bubble blooms a few glass chips outward, away from Misty, so she always stays in view.
   Sleep: one daily log for last night (Under 6 h / 6-7 h / 7 h or more), change or clear it any time today.
     Stored with the private health data (S.health.sleepDays via LowiVitalsBridge, account-scoped, never in the cloud backup).
     It gives no XP and no sun energy: progression is not touched until the plan aligns it.
   Settings: Me, Look & sound, Account, the bottom menu bar switch, and More (every Home entry point the ring hid).
     Every chip runs a route that exists in the app right now; a route that is missing is not shown.
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
            vr: 'VR', worldSound: 'World sound', theme: 'Day / night', gift: 'Gift of the day', weather: 'Weather', quest: 'Daily quest' },
        de: { sleep: 'Schlaf', log: 'Eintragen', ask: 'Wie lange hast du letzte Nacht geschlafen?', under6: 'Unter 6 Std.', '6to7': '6\u20137 Std.', '7plus': '7 Std. oder mehr',
            short: { under6: '<6 Std.', '6to7': '6\u20137 Std.', '7plus': '7 Std.+' }, notLogged: 'nicht eingetragen', clear: 'L\u00f6schen', clearLong: 'Heutigen Schlaf l\u00f6schen',
            settings: 'Einstellungen', me: 'Ich', look: 'Aussehen & Ton', account: 'Konto', menubar: 'Men\u00fcleiste', on: 'an', off: 'aus', more: 'Mehr', back: 'Zur\u00fcck', close: 'Schlie\u00dfen',
            moreTitle: 'Alles andere', today: 'Heute & Verlauf', community: 'Community', care: 'Care-Board', cook: 'Kochen', workouts: 'Workouts', map: 'Weltkarte',
            vr: 'VR', worldSound: 'Weltklang', theme: 'Tag / Nacht', gift: 'Geschenk des Tages', weather: 'Wetter', quest: 'Tagesquest' },
        es: { sleep: 'Sue\u00f1o', log: 'Anotar', ask: '\u00bfCu\u00e1nto dormiste anoche?', under6: 'Menos de 6 h', '6to7': '6\u20137 h', '7plus': '7 h o m\u00e1s',
            short: { under6: '<6 h', '6to7': '6\u20137 h', '7plus': '7 h+' }, notLogged: 'sin anotar', clear: 'Borrar', clearLong: 'Borrar el sue\u00f1o de hoy',
            settings: 'Ajustes', me: 'Yo', look: 'Aspecto y sonido', account: 'Cuenta', menubar: 'Barra de men\u00fa', on: 's\u00ed', off: 'no', more: 'M\u00e1s', back: 'Atr\u00e1s', close: 'Cerrar',
            moreTitle: 'Todo lo dem\u00e1s', today: 'Hoy e historial', community: 'Comunidad', care: 'Tablero Care', cook: 'Cocinar', workouts: 'Entrenos', map: 'Mapa del mundo',
            vr: 'RV', worldSound: 'Sonido del mundo', theme: 'D\u00eda / noche', gift: 'Regalo del d\u00eda', weather: 'Tiempo', quest: 'Misi\u00f3n diaria' }
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

    /* chips on an arc outward from the bubble, away from Misty: first layout that keeps every chip on screen,
       clear of Misty's disk and of each other. o: {mx,my,mr} Misty, {bx,by,br} bubble, n, c (chip diameter), vw, vh, safe {t,r,b,l} */
    function fan(o) {
        const n = Math.max(1, o.n | 0), c = o.c, s = o.safe || { t: 0, r: 0, b: 0, l: 0 }, m = 8;
        const a0 = Math.atan2(o.by - o.my, o.bx - o.mx), bd = Math.hypot(o.bx - o.mx, o.by - o.my);
        /* outward: every chip at least as far from Misty as the bubble it grows from */
        const ok = p => Math.hypot(p.x - o.mx, p.y - o.my) >= bd && p.x - c / 2 >= s.l + m && p.x + c / 2 <= o.vw - s.r - m && p.y - c / 2 >= s.t + m && p.y + c / 2 <= o.vh - s.b - m &&
            Math.hypot(p.x - o.mx, p.y - o.my) >= o.mr + c / 2 + 6;
        const rots = [0]; for (let r = 12; r <= 108; r += 12) rots.push(r, -r);
        for (let k = 0; k < 6; k++) {
            const dist = o.br + c / 2 + 10 + k * c * 0.45;
            const step = 2 * Math.asin(Math.min(1, (c + 8) / (2 * dist)));
            if (step * (n - 1) > Math.PI * 1.15) continue;
            for (const r of rots) {
                const base = a0 + r * Math.PI / 180, pts = [];
                for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * step; pts.push({ x: o.bx + dist * Math.cos(a), y: o.by + dist * Math.sin(a) }); }
                if (pts.every(ok)) return { pts, rot: r, dist, fit: true };
            }
        }
        /* nothing fits cleanly (tiny window): a straight row clamped on screen, on Misty's far side of the bubble */
        const dir = o.by >= o.my ? 1 : -1, y = Math.min(o.vh - s.b - m - c / 2, Math.max(s.t + m + c / 2, o.by + dir * (o.br + c / 2 + 10)));
        const w = n * c + (n - 1) * 8, x0 = Math.min(o.vw - s.r - m - w, Math.max(s.l + m, o.bx - w / 2)) + c / 2;
        return { pts: Array.from({ length: n }, (_, i) => ({ x: x0 + i * (c + 8), y })), rot: null, dist: null, fit: false };
    }

    /* the hidden Home entry points: env.has(id) says whether its real route exists right now */
    const MORE = ['today', 'community', 'care', 'cook', 'workouts', 'map', 'vr', 'worldSound', 'theme', 'gift', 'weather', 'quest'];
    function entries(kind, env) {
        const has = id => !!(env && env.has && env.has(id));
        if (kind === 'settings') return ['me', 'look', 'account', 'menubar', 'more'].filter(id => id === 'more' ? MORE.some(has) : has(id));
        if (kind === 'more') return MORE.filter(has);
        if (kind === 'sleep') return env && env.logged ? BANDS.concat('clear') : BANDS.slice();
        return [];
    }

    const core = { BANDS, FILL, SHELL_TOKEN, KEEP_DAYS, MENU_KEY, MORE, TX, dayKey, readSleep, writeSleep, clearSleep, sleepView, fan, entries };
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
        worldSound: { has: () => !!$('#whHud .wa-btn'), run: clickSel('#whHud .wa-btn'), toggle: () => !!(root.LowiWorldAudio && fn(root.LowiWorldAudio, 'on') && root.LowiWorldAudio.on()) },
        theme: { has: () => !!(root.LowiTopBar && fn(root.LowiTopBar, 'toggleTheme')), run: () => root.LowiTopBar.toggleTheme() },
        gift: { has: () => !!$('.hs-gift'), run: clickSel('.hs-gift') },
        weather: { has: () => !!(root.LowiTopBar && fn(root.LowiTopBar, 'openWeather')), run: () => root.LowiTopBar.openWeather() },
        quest: { has: () => !!$('#f3Board'), run: () => H.classList.toggle('o8-quest'), toggle: () => H.classList.contains('o8-quest') }
    };
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
        H.classList.remove('ss2-open');
        if (layer) { layer.innerHTML = ''; layer.removeAttribute('data-kind'); }
        if (lastBubble) lastBubble.setAttribute('aria-expanded', 'false');
        if (refocus && lastBubble && lastBubble.focus) { try { lastBubble.focus({ preventScroll: true }); } catch (e) { } }
        D.dispatchEvent(new CustomEvent('lowi:bloom-v2', { detail: { kind: was, open: false, owner: 'settings-sleep' } }));
    }
    function show(kind) {
        const bubbleKey = kind === 'more' ? 'settings' : kind;
        const b = findBubble(bubbleKey); if (!b) return false;
        const ids = entries(kind, { has: env.has, logged: kind === 'sleep' && !!sleepToday() });
        if (!ids.length) return false;
        /* one bloom at a time across the Home */
        const B = root.LowiHomeBloomsV2; if (B && fn(B, 'isOpen') && B.isOpen() && fn(B, 'close')) { try { B.close(); } catch (e) { } }
        const L = ensureLayer(), T = t(), q = b.getBoundingClientRect(), M = misty();
        const vw = H.clientWidth || root.innerWidth, vh = root.innerHeight, safe = safeArea();
        const bx = q.left + q.width / 2, by = q.top + q.height / 2, br = q.width / 2;
        open = kind; lastBubble = b;
        H.classList.add('ss2-open'); L.setAttribute('data-kind', kind);
        b.setAttribute('aria-expanded', 'true');
        if (kind === 'more') {
            /* the long list: a glass panel in the free band above or below Misty, never across her */
            const below = vh - safe.b - 10 - (M.y + M.r + 12), above = (M.y - M.r - 12) - (safe.t + 10);
            const useBelow = below >= Math.min(260, above);
            const top = useBelow ? M.y + M.r + 12 : safe.t + 10, h = Math.max(140, useBelow ? below : above);
            L.innerHTML = '<div class="ss2-panel" role="dialog" aria-label="' + T.moreTitle + '" style="top:' + top.toFixed(0) + 'px;max-height:' + h.toFixed(0) + 'px">' +
                '<div class="ss2-head"><button type="button" class="ss2-back" data-ss2="back">' + T.back + '</button><b>' + T.moreTitle + '</b><button type="button" class="ss2-back" data-ss2="close" aria-label="' + T.close + '">\u00d7</button></div>' +
                '<div class="ss2-grid">' + ids.map(id => chipHTML('more', id)).join('') + '</div></div>';
        } else {
            const c = Math.round(Math.max(54, Math.min(88, q.width * 0.8)));
            const F = fan({ mx: M.x, my: M.y, mr: M.r, bx, by, br, n: ids.length, c, vw, vh, safe });
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
        if (g) { if (g.dataset.o8Adapter !== 'settings-sleep') g.dataset.o8Adapter = 'settings-sleep'; if (!g.hasAttribute('aria-expanded')) g.setAttribute('aria-expanded', 'false'); }
    }
    function onTap(e) {
        const el = e.target && e.target.closest && e.target.closest('[data-orbit="sleep"],[data-orbit="settings"]');
        if (!el || el.dataset.o8Adapter !== 'settings-sleep') return;
        const k = el.getAttribute('data-orbit');
        e.preventDefault();
        if (open === k || (k === 'settings' && open === 'more')) close(true); else show(k);
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
        D.addEventListener('keydown', e => { if (e.key === 'Escape' && open) close(true); });
        D.addEventListener('lowi:bloom-v2', e => { const d = e && e.detail; if (d && d.open && d.owner !== 'settings-sleep') close(false); });
        ['lowi:home-orbit', 'lowi:home-bubble-added'].forEach(n => { D.addEventListener(n, claim); root.addEventListener(n, claim); });
        /* the ring moved (menu bar switched, rotation): an open bloom follows its bubble */
        D.addEventListener('lowi:home-orbit', () => { if (!open) return; const k = open, a = D.activeElement, id = a && layer && layer.contains(a) ? a.getAttribute('data-ss2') : null; show(k); const f = id && layer.querySelector('[data-ss2="' + id + '"]'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } } });
        D.addEventListener('lowi:tab', () => close(false));
        root.addEventListener('lowi:state', paintSleep);
        root.addEventListener('resize', () => { if (open) close(false); }, { passive: true });
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
