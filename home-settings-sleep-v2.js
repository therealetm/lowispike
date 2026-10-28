/* home-settings-sleep-v2.js: the Sleep and Settings bubbles of the one-page Home (Oct 18 2026, Emmanuel).
   Tapping either bubble blooms a few glass chips outward, away from Misty, so she always stays in view.
   Sleep: one daily log for last night (Under 6 h / 6-7 h / 7 h or more); tapping another choice replaces today's, it never stacks.
     Since 23 Oct 2026 (E-man: "I guess we don't need a reset") there is no separate Clear chip: the bloom always shows the three choices.
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
    const TX = {
        en: { sleep: 'Sleep', log: 'Log', ask: 'How long did you sleep last night?', under6: 'Under 6 h', '6to7': '6\u20137 h', '7plus': '7 h or more',
            short: { under6: '<6 h', '6to7': '6\u20137 h', '7plus': '7 h+' }, notLogged: 'not logged',
            settings: 'Settings', me: 'Me', look: 'Look & sound', account: 'Account', on: 'on', off: 'off', more: 'More', back: 'Back', close: 'Close',
            moreTitle: 'Everything else', today: 'Today & history', community: 'Community', care: 'Ranking', cook: 'Cook', workouts: 'Workouts',
            vr: 'VR', worldSound: 'World sound', theme: 'Day / night', gift: 'Gift of the day', weather: 'Weather', quest: 'Daily quest', goTo: 'Go to', settingsGroup: 'Settings', notifications: 'Notifications', support: 'Pay what you want', about: 'About & info', tutorial: 'Tutorial', quickTour: 'Quick tour', catchUp: 'Catch up on today', body: 'Weight & BMI', myday: 'My day', weight: 'Weight journey', version: 'Version' },
        de: { sleep: 'Schlaf', log: 'Eintragen', ask: 'Wie lange hast du letzte Nacht geschlafen?', under6: 'Unter 6 Std.', '6to7': '6\u20137 Std.', '7plus': '7 Std. oder mehr',
            short: { under6: '<6 Std.', '6to7': '6\u20137 Std.', '7plus': '7 Std.+' }, notLogged: 'nicht eingetragen',
            settings: 'Einstellungen', me: 'Ich', look: 'Aussehen & Ton', account: 'Konto', on: 'an', off: 'aus', more: 'Mehr', back: 'Zur\u00fcck', close: 'Schlie\u00dfen',
            moreTitle: 'Alles andere', today: 'Heute & Verlauf', community: 'Community', care: 'Rangliste', cook: 'Kochen', workouts: 'Workouts',
            vr: 'VR', worldSound: 'Weltklang', theme: 'Tag / Nacht', gift: 'Geschenk des Tages', weather: 'Wetter', quest: 'Tagesquest', goTo: 'Gehe zu', settingsGroup: 'Einstellungen', notifications: 'Mitteilungen', support: 'Zahl, was du willst', about: '\u00dcber & Hinweise', tutorial: 'Tutorial', quickTour: 'Kurze Tour', catchUp: 'Heute nachtragen', body: 'Gewicht & BMI', myday: 'Mein Tag', weight: 'Gewichtsreise', version: 'Version' },
        es: { sleep: 'Sue\u00f1o', log: 'Anotar', ask: '\u00bfCu\u00e1nto dormiste anoche?', under6: 'Menos de 6 h', '6to7': '6\u20137 h', '7plus': '7 h o m\u00e1s',
            short: { under6: '<6 h', '6to7': '6\u20137 h', '7plus': '7 h+' }, notLogged: 'sin anotar',
            settings: 'Ajustes', me: 'Yo', look: 'Aspecto y sonido', account: 'Cuenta', on: 's\u00ed', off: 'no', more: 'M\u00e1s', back: 'Atr\u00e1s', close: 'Cerrar',
            moreTitle: 'Todo lo dem\u00e1s', today: 'Hoy e historial', community: 'Comunidad', care: 'Ranking', cook: 'Cocinar', workouts: 'Entrenos',
            vr: 'RV', worldSound: 'Sonido del mundo', theme: 'D\u00eda / noche', gift: 'Regalo del d\u00eda', weather: 'Tiempo', quest: 'Misi\u00f3n diaria', goTo: 'Ir a', settingsGroup: 'Ajustes', notifications: 'Avisos', support: 'Paga lo que quieras', about: 'Acerca de', tutorial: 'Tutorial', quickTour: 'Tour r\u00e1pido', catchUp: 'Ponerme al d\u00eda', body: 'Peso e IMC', myday: 'Mi d\u00eda', weight: 'Tu camino de peso', version: 'Versi\u00f3n' }
    };
    /* Oct 21 2026 (Emmanuel: the Home bubble is Community now, a hold opens a slim Settings with only what is needed) */
    Object.assign(TX.en, { language: 'Language', deleteAccount: 'Delete account', hint: 'Hold Community for profile & settings', day: 'Day', night: 'Night', foryou: 'For You', hunt: 'Shopping hunt',
        delTitle: 'Delete your account?', delBody: 'This deletes your LOWiSPIKE account for good: your profile, posts, chats, photos and synced progress. It also clears this phone. It can\u2019t be undone.', delGo: 'Delete my account', delCancel: 'Keep my account',
        delBusy: 'Deleting\u2026', delFail: 'We couldn\u2019t delete your account right now. Nothing was deleted. Please try again later.', delGuest: 'You\u2019re not signed in, so there is no account in the cloud. Delete everything saved on this phone?', delGuestGo: 'Delete this phone\u2019s data', delOwner: 'This is the owner account, so it can\u2019t be deleted here. Nothing was deleted.', account2: 'Account' });
    Object.assign(TX.de, { language: 'Sprache', deleteAccount: 'Konto l\u00f6schen', hint: 'Halte Community f\u00fcr Profil & Einstellungen', day: 'Tag', night: 'Nacht', foryou: 'F\u00fcr dich', hunt: 'Einkaufsjagd',
        delTitle: 'Konto l\u00f6schen?', delBody: 'Damit l\u00f6schst du dein LOWiSPIKE-Konto endg\u00fcltig: Profil, Beitr\u00e4ge, Chats, Fotos und deinen synchronisierten Fortschritt. Auch dieses Handy wird geleert. Das kann man nicht r\u00fcckg\u00e4ngig machen.', delGo: 'Mein Konto l\u00f6schen', delCancel: 'Konto behalten',
        delBusy: 'Wird gel\u00f6scht\u2026', delFail: 'Dein Konto konnte gerade nicht gel\u00f6scht werden. Es wurde nichts gel\u00f6scht. Bitte versuch es sp\u00e4ter noch einmal.', delGuest: 'Du bist nicht angemeldet, also gibt es kein Konto in der Cloud. Alles l\u00f6schen, was auf diesem Handy gespeichert ist?', delGuestGo: 'Daten auf diesem Handy l\u00f6schen', delOwner: 'Das ist das Inhaber-Konto, es kann hier nicht gel\u00f6scht werden. Es wurde nichts gel\u00f6scht.', account2: 'Konto' });
    Object.assign(TX.es, { language: 'Idioma', deleteAccount: 'Eliminar cuenta', hint: 'Mant\u00e9n Comunidad para perfil y ajustes', day: 'D\u00eda', night: 'Noche', foryou: 'Para ti', hunt: 'Caza de compras',
        delTitle: '\u00bfEliminar tu cuenta?', delBody: 'Esto elimina tu cuenta de LOWiSPIKE para siempre: tu perfil, publicaciones, chats, fotos y el progreso sincronizado. Tambi\u00e9n vac\u00eda este m\u00f3vil. No se puede deshacer.', delGo: 'Eliminar mi cuenta', delCancel: 'Conservar mi cuenta',
        delBusy: 'Eliminando\u2026', delFail: 'No pudimos eliminar tu cuenta ahora. No se ha borrado nada. Int\u00e9ntalo m\u00e1s tarde.', delGuest: 'No has iniciado sesi\u00f3n, as\u00ed que no hay cuenta en la nube. \u00bfBorrar todo lo guardado en este m\u00f3vil?', delGuestGo: 'Borrar los datos de este m\u00f3vil', delOwner: 'Esta es la cuenta del propietario y no se puede eliminar aqu\u00ed. No se ha borrado nada.', account2: 'Cuenta' });
    const pick = l => TX[l] || TX.en;
    /* Oct 20 2026 (Emmanuel: prove a GitHub change reaches the live app): the Settings panel names the running build, read from the
       page's lowi-build tag, as plain text beside the x; an empty or malformed id shows nothing */
    const versionLabel = (build, l) => { const b = String(build || '').trim(); return /^\d{8}-\d{6}$/.test(b) ? pick(l).version + ' ' + b : ''; };

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
    /* Oct 21 2026 (Emmanuel: Community holds the profile and the places, Settings only the switches): the places that no bubble reaches
       now live in Community (community-me.js reads COMMUNITY_PLACES); World sound is a sound setting, so it moved into Settings */
    /* Oct 22 2026 (Emmanuel: "remove the explore things and have the more important things in there"): the profile hub drops its
       Explore list and carries the Settings instead (community-me.js). Each former Explore place keeps its own way in: EXPLORE_MOVED
       says where (checked in tools/community-settings/hub-b.js). */
    /* Oct 25 2026: 'myday' = the old Today parts that had no other way in once the Today sheet was retired (Eman: "Nuke it"):
       Check-ins, Meals, Your plate, Medicine, Shopping, Extras, macro goals, Your inside, as one small sheet of bubbles (misty-hub.js LowiMyDay) */
    const COMMUNITY_PLACES = { you: ['me', 'body', 'myday'], places: [] };  /* Oct 22 2026: Weight journey lives inside Weight & BMI now, so no own row */
    /* Workouts is the Move tab behind the Home Move bubble. The other five have no visible way in on Home or the tabs today (the
       iPhone run found the Home zoom and gift hidden, the For You and Care board pills hidden, and no Finds chip in the scanner), so
       they keep a light way in: one folded "More places" row under YOU (EXPLORE_LIGHT). */
    /* Oct 22 2026, 5:40 PM (Emmanuel: "Remove the entire 'More places' section from the Community long-press menu, including all its
       entries"): the folded row is gone. For You stays in Cook (Shuffle | For You | Swipe), the Care board stays in Move (card under the
       Move title); the map, Gift of the day and Shopping hunt are simply not in the hub any more (their code and routes stay). */
    const EXPLORE_LIGHT = [];
    const EXPLORE_MOVED = { workouts: 'Home Move bubble', foryou: 'Cook > For You switch', care: 'Community > Ranking tab (Care board retired Oct 23)', gift: 'out of the hub (Oct 22)', hunt: 'out of the hub (Oct 22)' };
    const MORE_GROUPS = { go: COMMUNITY_PLACES.you.concat(['foryou', 'care', 'workouts', 'gift', 'hunt']), set: [] };
    const MORE = MORE_GROUPS.go.concat(MORE_GROUPS.set);
    /* the slim Settings (a hold on the Community bubble): the switches, the language and the account, nothing else */
    /* Oct 26 2026 (MAYA-HANDOFF 0.39): "Catch up on today" first, so the evening catch-up is always one clear tap away */
    /* Oct 28 2026 (slim structure: all tutorials into ONE optional guide): the video tour row is gone; Tutorial is the one guide */
    /* Oct 28 2026 slim structure batch 9: notification controls (on/off, how often, quiet hours, phone push) and About & info sit in Settings,
       so every setting is in Profile (Du) and in the Community hold's Settings, one list */
    const SETTINGS_IDS = ['catchUp', 'theme', 'look', 'worldSound', 'language', 'notifications', 'tutorial', 'support', 'about'], ACCOUNT_IDS = ['account', 'deleteAccount'];
    const HINT_KEY = 'lowi.hint.holdCommunity', HOLD_MS = 480;
    /* out of the panel, and where each one is still reached (their routes and features stay in the app):
       today: Emmanuel dropped Today from Home; cook: Fuel bubble > Cook; theme: Settings > Look & sound > Day & night;
       quest: Emmanuel dropped Daily quest */
    /* Oct 21 2026 cleanup (DECISIONS.md): vr and weather are out of every menu (their code and saved choices stay); community is the
       Home bubble itself; theme and worldSound are Settings rows now */
    const MORE_REMOVED = { today: 'removed', cook: 'fuel', theme: 'settings', quest: 'removed', vr: 'removed', weather: 'removed', community: 'bubble', worldSound: 'settings', map: 'removed' };
    /* Oct 23 2026 (queue worldmap-btn; Emmanuel: "that old map button ... remove it completely"): map is out of every menu and route */
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
        if (kind === 'settings') return SETTINGS_IDS.concat(ACCOUNT_IDS).filter(has);
        if (kind === 'more') return MORE.filter(has);
        /* 23 Oct 2026: always the three choices, logged or not (the separate Clear chip is gone; another choice replaces today's) */
        if (kind === 'sleep') return BANDS.slice();
        return [];
    }

    /* what one tap on a bubble does, given what is open now: Settings opens its full page (not the chip bloom), Sleep its bloom;
       a tap on a bubble whose surface is already open closes it. -> 'page' | 'sleep' | 'close' */
    function tapIntent(bubble, open) {
        /* Oct 21 2026: the bubble is Community: a tap opens Community, a hold (holdIntent) opens the slim Settings */
        if (bubble === 'settings') return open === 'page' || open === 'settings' || open === 'more' ? 'close' : 'community';
        if (bubble === 'sleep') return open === 'sleep' ? 'close' : 'sleep';
        return 'close';
    }
    /* what a row on the Settings panel does (Oct 19 2026, Emmanuel: the sound panel opened BEHIND Settings):
       'toggle' flips in place and Settings stays; 'panel' opens another panel, so Settings steps aside first and that panel is in front;
       'go' closes Settings and runs its route */
    /* Oct 22 2026 (item 42, Emmanuel): a hold on the Community bubble opens the profile hub (community-me.js), not the slim Settings;
       the hub's gear still reaches Settings. -> 'hub' | null */
    function holdIntent(bubble) { return bubble === 'settings' ? 'hub' : null; }
    /* 'lang' = three language buttons in the row; 'confirm' = asks inside the panel first (Delete account) */
    const PANEL_ROWS = ['worldSound'], TOGGLE_ROWS = ['quest', 'theme'];
    function rowAction(id) { return id === 'language' ? 'lang' : id === 'deleteAccount' ? 'confirm' : PANEL_ROWS.includes(id) ? 'panel' : TOGGLE_ROWS.includes(id) ? 'toggle' : 'go'; }
    /* the Settings panel (one tap): the Settings choices first (no More chip: More is on the panel), then every More entry; empty groups drop */
    function pageGroups(env) {
        const has = id => !!(env && env.has && env.has(id));
        return [{ key: 'main', ids: SETTINGS_IDS.filter(has) }, { key: 'account', ids: ACCOUNT_IDS.filter(has) }].filter(g => g.ids.length);
    }

    const core = { BANDS, FILL, SHELL_TOKEN, KEEP_DAYS, MORE, MORE_GROUPS, MORE_REMOVED, COMMUNITY_PLACES, EXPLORE_MOVED, EXPLORE_LIGHT, SETTINGS_IDS, ACCOUNT_IDS, HINT_KEY, HOLD_MS, moreGroups, placePanel, TX, dayKey, readSleep, writeSleep, clearSleep, sleepView, fan, entries, tapIntent, holdIntent, pageGroups, rowAction, versionLabel };
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
        me: '<circle cx="12" cy="8.5" r="3.5" ' + P + '/><path d="M5 20a7 7 0 0 1 14 0" ' + P + '/>',
        look: '<path d="M4 10v4h3l4 3.5v-11L7 10H4z" ' + P + '/><path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10" ' + P + '/>',
        account: '<rect x="5" y="10.5" width="14" height="9.5" rx="2" ' + P + '/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" ' + P + '/>',
        tutorial: '<circle cx="12" cy="12" r="8.5" ' + P + '/><path d="M10 8.8v6.4l5.2-3.2z" ' + P + '/>',
        notifications: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z" ' + P + '/><path d="M10 20.5a2.2 2.2 0 0 0 4 0" ' + P + '/>',
        support: '<path d="M12 19.5s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.3c0 4.9-7 9.2-7 9.2z" ' + P + '/>',
        about: '<circle cx="12" cy="12" r="8.5" ' + P + '/><path d="M12 11v5.5" ' + P + '/><circle cx="12" cy="7.8" r="1" fill="currentColor"/>',
        catchUp: '<circle cx="12" cy="12" r="8.5" ' + P + '/><path d="M8.4 12.2l2.5 2.5 4.8-5.2" ' + P + '/>',
        quickTour: '<rect x="6.5" y="3" width="11" height="18" rx="2.6" ' + P + '/><path d="M10.6 9.6v4.8l4-2.4z" ' + P + '/>',
        body: '<rect x="4" y="5" width="16" height="14" rx="4" ' + P + '/><path d="M8.5 10a4.5 4.5 0 0 1 7 0L12 12.5" ' + P + '/>',
        myday: '<circle cx="12" cy="12" r="8" ' + P + '/><path d="M12 7.5V12l3 2" ' + P + '/>',
        more: '<path d="M6 12h.01M12 12h.01M18 12h.01" ' + P + ' stroke-width="3"/>',
        theme: '<path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5z" ' + P + '/>',
        worldSound: '<path d="M3 12h2l2-5 3 10 3-12 3 9 2-2h3" ' + P + '/>',
        language: '<circle cx="12" cy="12" r="8.5" ' + P + '/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.6 5.4 3.6 8.5s-1 6.1-3.6 8.5c-2.6-2.4-3.6-5.4-3.6-8.5s1-6.1 3.6-8.5z" ' + P + '/>',
        deleteAccount: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10.5 10.5v5M13.5 10.5v5" ' + P + '/>'
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

    /* Oct 21: the bottom menu bar is gone app-wide, and so is its switch here */

    /* ---- real routes ---- */
    const fn = (o, k) => o && typeof o[k] === 'function';
    const clickSel = sel => () => { const el = $(sel); if (el) el.click(); };
    const goTab = tab => () => { if (fn(root, 'lowiOpen')) root.lowiOpen(tab); else if (fn(root, 'goTab')) root.goTab(tab); };
    const tabExists = tab => fn(root, 'goTab') && !!D.getElementById('tab-' + tab);
    /* Oct 22 2026 (Emmanuel: "one click on account and then you see this overview"): Account, Me and Look & sound open the Profile
       overview (picture, level, the tiles), never a sub-panel straight away; the tile there opens the part. */
    const profileHome = () => { const G = root.LowiG2E; if (G && fn(G, 'overview')) { G.overview(); return; } goTab('profile')(); };
    /* Oct 28 2026 (item 29): the light crash log (crash-log.js) at the end of About & info, so the next iPhone report names the place */
    function crashHTML(L3, esc2) {
        let a = [];
        try { a = root.LowiCrashLog ? root.LowiCrashLog.list() : []; } catch (e) { a = []; }
        const head = '<h3>' + esc2(L3('Crash log (this device)', 'Absturz-Protokoll (dieses Ger\u00e4t)', 'Registro de fallos (este dispositivo)')) + '</h3>';
        if (!a.length) return head + '<p class="ss2-ab-crash">' + esc2(L3('Nothing recorded.', 'Nichts aufgezeichnet.', 'Nada registrado.')) + '</p>';
        const kind = k => k === 'reload' ? L3('Page reloaded', 'Seite neu geladen', 'P\u00e1gina recargada') : k === 'promise' ? L3('Promise error', 'Promise-Fehler', 'Error de promesa') : k === 'note' ? L3('Note', 'Notiz', 'Nota') : L3('Error', 'Fehler', 'Error');
        const when = t => { try { const d = new Date(t); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '. ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); } catch (e) { return ''; } };
        return head + '<ul class="ss2-ab-crash">' + a.slice(-8).reverse().map(x => '<li><b>' + esc2(when(x.t) + ' \u00b7 ' + kind(x.k) + (x.n > 1 ? ' \u00d7' + x.n : '')) + '</b><br>' +
            esc2([x.a, x.m, x.s, x.b].filter(Boolean).join(' \u00b7 ')) + '</li>').join('') + '</ul>';
    }
    function openAbout() {
        const L3 = (en, de, es) => { const l = lang(); return l === 'de' ? de : l === 'es' ? es : en; };
        const esc2 = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        let ver = '';
        try { const bm = D.querySelector('meta[name="lowi-build"]'); ver = versionLabel(bm && bm.content, lang()); } catch (e) { ver = ''; }
        const li = a => '<li>' + esc2(a) + '</li>';
        const html = '<div class="ss2-about">' +
            '<h2>' + esc2(L3('About & info', '\u00dcber & Hinweise', 'Acerca de')) + '</h2>' +
            (ver ? '<p class="ss2-ab-v">LOWiSPIKE \u00b7 ' + esc2(ver) + '</p>' : '') +
            '<h3>' + esc2(L3('Health', 'Gesundheit', 'Salud')) + '</h3>' +
            '<p>' + esc2(L3('General information, not medical advice. If you use insulin, follow your care team.', 'Allgemeine Infos, keine medizinische Beratung. Wenn du Insulin nutzt, folge deinem Behandlungsteam.', 'Informaci\u00f3n general, no consejo m\u00e9dico. Si usas insulina, sigue a tu equipo de salud.')) + '</p>' +
            '<h3>' + esc2(L3('Where the data comes from', 'Woher die Daten kommen', 'De d\u00f3nde vienen los datos')) + '</h3>' +
            '<ul>' + li(L3('Products: the label you scan, or Open Food Facts', 'Produkte: das Etikett, das du scannst, oder Open Food Facts', 'Productos: la etiqueta que escaneas, o Open Food Facts')) +
            li(L3('Steps: your own pick, LOWiSPIKE does not count steps', 'Schritte: deine eigene Wahl, LOWiSPIKE z\u00e4hlt keine Schritte', 'Pasos: tu propia elecci\u00f3n, LOWiSPIKE no cuenta pasos')) + '</ul>' +
            crashHTML(L3, esc2) +
            '</div>';
        try { return root.LowiR2.sheet(html, { cls: 'ss2-about-ov' }); } catch (e) { return null; }
    }
    const ROUTES = {
        me: { has: () => tabExists('profile'), run: profileHome },
        look: { has: () => tabExists('profile') && !!root.LowiG2E, run: profileHome },
        account: { has: () => tabExists('profile') && !!root.LowiG2E, run: profileHome },
        today: { has: () => !!$('#whHud .wh-todaybtn'), run: clickSel('#whHud .wh-todaybtn') },
        community: { has: () => tabExists('foryou'), run: goTab('foryou') },
        care: { has: () => !!((root.LowiRanking && fn(root.LowiRanking, 'open')) || (root.LowiR3F && fn(root.LowiR3F, 'openBoardTab'))), run: () => (root.LowiRanking && fn(root.LowiRanking, 'open')) ? root.LowiRanking.open() : root.LowiR3F.openBoardTab() },
        cook: { has: () => tabExists('shelf'), run: goTab('shelf') },
        workouts: { has: () => tabExists('move'), run: goTab('move') },
        vr: { has: () => !!$('#whHud .wh-vr'), run: clickSel('#whHud .wh-vr') },
        worldSound: { has: () => !!$('#whHud .wa-btn'), run: () => { if (fn(root.LowiWorldAudio, 'open')) root.LowiWorldAudio.open(); else clickSel('#whHud .wa-btn')(); }, toggle: () => !!(root.LowiWorldAudio && fn(root.LowiWorldAudio, 'on') && root.LowiWorldAudio.on()) },
        theme: { has: () => !!(root.LowiTopBar && fn(root.LowiTopBar, 'toggleTheme')), run: () => root.LowiTopBar.toggleTheme(), toggle: () => !(root.LowiTopBar && fn(root.LowiTopBar, 'state') && root.LowiTopBar.state().theme === 'light') },
        /* Oct 21 2026: EN / DE / ES right in the row (the page's own [data-lang] handler switches it) */
        language: { has: () => !!(root.LowiLang && fn(root.LowiLang, 'set')), run: () => { } },
        /* Oct 21 2026 (App Store 5.1.1(v)): deleting the account starts in the app; asks first, inside the panel */
        deleteAccount: { has: () => true, run: () => { } },
        foryou: { has: () => !!(root.LowiNavMoves && fn(root.LowiNavMoves, 'open')), run: () => root.LowiNavMoves.open('fy') },
        hunt: { has: () => !!(root.LowiGrocery && fn(root.LowiGrocery, 'open')), run: () => root.LowiGrocery.open() },
        gift: { has: () => !!$('.hs-gift'), run: clickSel('.hs-gift') },
        weather: { has: () => !!(root.LowiTopBar && fn(root.LowiTopBar, 'openWeather')), run: () => root.LowiTopBar.openWeather() },
        /* Oct 19 2026 (Emmanuel): replay the guided tour (tutorial.js / tutorial-steps.js); Settings closes first, the tour waits for it */
        tutorial: { has: () => !!(root.LowiTutorial && fn(root.LowiTutorial, 'start')), run: () => root.LowiTutorial.start({ from: 'settings' }) },
        /* slim batch 9: the notification master controls (LowiN1 sheet: on/off, how often, quiet hours, phone push) */
        notifications: { has: () => !!(root.LowiN1 && fn(root.LowiN1, 'openSet')), run: () => root.LowiN1.openSet() },
        /* slim batch 9: About & info (build, what the numbers are, where data comes from) */
        /* Oct 28 2026 (X-16, slim structure): "Zahl, was du willst" gets its tap path in Profile; it opens the existing support view */
        support: { has: () => !!(root.LowiHerbShop && fn(root.LowiHerbShop, 'open')), run: () => root.LowiHerbShop.open() },
        about: { has: () => !!(root.LowiR2 && fn(root.LowiR2, 'sheet')), run: openAbout },
        /* Oct 26 2026 (MAYA-HANDOFF 0.38): the video tour (quick-tour.js, VIDEO config), right next to Tutorial; Settings closes first */
        /* Oct 26 2026 (MAYA-HANDOFF 0.39): the evening bubble checklist (evening-catchup.js); Settings closes first */
        catchUp: { has: () => !!(root.LowiEveningCatchup && fn(root.LowiEveningCatchup, 'open')), run: () => root.LowiEveningCatchup.open({ from: 'settings' }) },
        quickTour: { has: () => !!(root.LowiQuickTour && fn(root.LowiQuickTour, 'open')), run: () => root.LowiQuickTour.open() },
        /* Oct 19 2026 (Emmanuel): weigh in, BMI with its category, body-fat estimate and the Then/Now level-up track (body-stats.js) */
        body: { has: () => !!(root.LowiBodyStats && fn(root.LowiBodyStats, 'open')), run: () => root.LowiBodyStats.open() },
        myday: { has: () => !!(root.LowiMyDay && fn(root.LowiMyDay, 'open')), run: () => root.LowiMyDay.open() },
        /* Oct 22 2026 (Emmanuel: "set starting time and see a graphic"): start date, weigh-ins and the chart (weight-journey.js) */
        weight: { has: () => !!(root.LowiWeightJourney && fn(root.LowiWeightJourney, 'open')), run: () => root.LowiWeightJourney.open() },
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
        const was = open; open = null; detached = false;
        /* BH-060: a row or choice that closes the ring is spent, so a fast 2nd tap does not hit Home under it */
        try { const F = root.LowiFreshScrim; if (layer && F && F.closed) F.closed(layer); } catch (e) { }
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
        if (rowAction(id) === 'lang') { const cur = lang(); return '<div class="ss2-chip ss2-row ss2-langrow" role="group" aria-label="' + label + '">' + ico + '<span class="ss2-lbl">' + label + '</span><span class="ss2-langs">' + ['en', 'de', 'es'].map(l => '<button type="button" data-lang="' + l + '" aria-pressed="' + (l === cur) + '"' + (l === cur ? ' class="on"' : '') + '>' + l.toUpperCase() + '</button>').join('') + '</span></div>'; }
        if (id === 'theme' && tog) { const dark = !!tog(); return '<button type="button" class="ss2-chip ss2-row" role="switch" data-ss2="theme" aria-checked="' + dark + '" aria-label="' + label + ': ' + (dark ? T.night : T.day) + '">' + ico + '<span class="ss2-lbl">' + label + '</span><small>' + (dark ? T.night : T.day) + '</small></button>'; }
        if (rowAction(id) === 'confirm') return '<button type="button" class="ss2-chip ss2-row ss2-danger" data-ss2="' + id + '" aria-haspopup="dialog">' + ico + '<span class="ss2-lbl">' + label + '</span>' + chev + '</button>';
        if (rowAction(id) === 'panel') { const on = !!(tog && tog()), st = on ? T.on : T.off; return '<button type="button" class="ss2-chip ss2-row" data-ss2="' + id + '" aria-haspopup="dialog" aria-label="' + label + ': ' + st + '">' + ico + '<span class="ss2-lbl">' + label + '</span><small>' + st + '</small>' + chev + '</button>'; }
        if (tog) { const on = !!tog(); return '<button type="button" class="ss2-chip ss2-row" role="switch" data-ss2="' + id + '" aria-checked="' + on + '" aria-label="' + label + '">' + ico + '<span class="ss2-lbl">' + label + '</span><small>' + (on ? T.on : T.off) + '</small></button>'; }
        return '<button type="button" class="ss2-chip ss2-row" data-ss2="' + id + '">' + ico + '<span class="ss2-lbl">' + label + '</span>' + chev + '</button>';
    }
    function showPage(b) {
        const groups = pageGroups(env); if (!groups.length) return false;
        const B = root.LowiHomeBloomsV2; if (B && fn(B, 'isOpen') && B.isOpen() && fn(B, 'close')) { try { B.close(); } catch (e) { } }
        if (lastBubble && lastBubble !== b) lastBubble.setAttribute('aria-expanded', 'false');
        const L = ensureLayer(), T = t(), q = b.getBoundingClientRect();
        const bm = D.querySelector('meta[name="lowi-build"]'), ver = versionLabel(bm && bm.content, lang());
        open = 'page'; lastBubble = b;
        H.classList.add('ss2-open', 'ss2-page-open'); L.setAttribute('data-kind', 'page');
        if (b !== D.body && b.getAttribute('data-orbit') !== 'settings') b.setAttribute('aria-expanded', 'true');
        const sec = g => g.key === 'more' || g.key === 'account'
            ? '<section class="ss2-group" aria-labelledby="ss2Page' + g.key + '"><h3 class="ss2-gl" id="ss2Page' + g.key + '">' + (g.key === 'account' ? T.account2 : T.more) + '</h3><div class="ss2-list">' + g.ids.map(pageRow).join('') + '</div></section>'
            : '<section class="ss2-group" aria-label="' + T.settings + '"><div class="ss2-list">' + g.ids.map(pageRow).join('') + '</div></section>';
        /* Oct 19 2026 (Emmanuel): not a whole page but a glass side panel in the Body sound panel's look, beside / under Misty so she and
           Home stay in view; it grows out of the Settings bubble; the x sits at its bottom right */
        L.innerHTML = '<div class="ss2-page" role="dialog" aria-modal="true" aria-labelledby="ss2PageTitle">' +
            '<h2 class="ss2-page-title" id="ss2PageTitle">' + T.settings + '</h2>' +
            '<div class="ss2-page-body">' + groups.map(sec).join('') + '</div>' +
            '<div class="ss2-page-foot">' + (ver ? '<small class="ss2-ver">' + ver + '</small>' : '') + '<button type="button" class="ss2-page-x" data-ss2="close" aria-label="' + T.close + '">' +
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
        /* Oct 21 2026: the slim Settings is one short list, so it always pops up as a centred sheet (Home or not) */
        if (true) {
            const w = Math.min(380, vw - 24), mh = vh - safe.t - safe.b - 40;
            pn.style.cssText = 'top:0;left:0;width:' + w + 'px;max-height:none;visibility:hidden;animation:none;--ss2-cols:1';
            const h = Math.min(Math.ceil(pn.getBoundingClientRect().height), mh), fit = pn.getBoundingClientRect().height <= mh;
            pn.style.cssText = 'left:' + Math.round((vw - w) / 2) + 'px;top:' + Math.round(Math.max(safe.t + 20, (vh - h) / 2)) + 'px;width:' + w + 'px;' + (fit ? '' : 'height:' + h + 'px;') + '--ss2-cols:1' + (still ? ';animation:none' : '');
            pn.setAttribute('data-side', 'center'); pn.setAttribute('data-fit', String(fit)); pn.setAttribute('data-cols', '1');
            return;
        }
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
    /* the shared bloom ring, when it can take Sleep (LowiHomeBloomsV2 + LowiBloomRing loaded, Sleep's options there) */
    function ringBlooms() {
        const B = root.LowiHomeBloomsV2;
        if (!B || !fn(B, 'open') || !fn(B, 'isOpen') || !fn(B, 'close') || !root.LowiBloomRing) return null;
        try { return (B.actions('sleep') || []).length ? B : null; } catch (e) { return null; }
    }
    function show(kind) {
        if (kind === 'sleep') { const B = ringBlooms(); if (B) { close(false); if (B.open('sleep')) return true; } }
        const bubbleKey = kind === 'more' || kind === 'page' ? 'settings' : kind;
        /* Oct 22 2026: Settings live in the profile hub now (community-me.js), so every way to the old sheet opens the hub; the old
           sheet stays only as the fallback when the hub is not loaded */
        if (kind === 'page') { const M = root.LowiCommunityMe; if (M && fn(M, 'open')) { close(false); try { if (M.open()) return true; } catch (e) { console.warn('[settings-sleep] hub', e); } } }
        const b = findBubble(bubbleKey) || (kind === 'page' ? D.body : null); if (!b) return false;
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
        if (b !== D.body && b.getAttribute('data-orbit') !== 'settings') b.setAttribute('aria-expanded', 'true');
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
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2, prefBelow = (Math.min(...ys) + Math.max(...ys)) / 2 >= M.y;
        const w = Math.min(220, vw - 24), x = Math.max(12, Math.min(vw - 12 - w, cx - w / 2)), mr = { l: M.x - M.r, r: M.x + M.r, t: M.y - M.r, b: M.y + M.r };
        /* Oct 21 grandma test: three bare chips ("<6 h", "6-7 h", "7 h+") mean nothing without the question, so when the question
           does not fit on the side away from Misty it tries the other side, and it never lands on a bubble or a chip */
        for (const below of [prefBelow, !prefBelow]) {
            const y = below ? Math.max(...ys) + c / 2 + 8 : Math.min(...ys) - c / 2 - 8;
            p.style.cssText = 'left:' + x.toFixed(0) + 'px;width:' + w + 'px;top:' + y.toFixed(0) + 'px;' + (below ? '' : 'transform:translateY(-100%)');
            const r = p.getBoundingClientRect();
            const hitsMisty = !(r.right < mr.l || r.left > mr.r || r.bottom < mr.t || r.top > mr.b);
            const hitsChip = F.pts.some(q => !(r.right < q.x - c / 2 || r.left > q.x + c / 2 || r.bottom < q.y - c / 2 || r.top > q.y + c / 2));
            const hitsBubble = [...D.querySelectorAll('[data-orbit]')].map(e => e.getBoundingClientRect()).some(q => q.width > 2 && !(r.right < q.left || r.left > q.right || r.bottom < q.top || r.top > q.bottom));
            if (!hitsMisty && !hitsChip && !hitsBubble && r.bottom <= root.innerHeight - 4 && r.top >= 4) return;
        }
        p.remove();
    }
    function onChip(e) {
        const b = e.target && e.target.closest && e.target.closest('[data-ss2]'); if (!b) return;
        e.preventDefault(); e.stopPropagation();
        const id = b.getAttribute('data-ss2'), kind = open;
        if (id === 'close') { close(true); return; }
        if (id === 'back') { show('settings'); return; }
        if (kind === 'sleep') {
            if (BANDS.includes(id)) setSleep(id);
            /* BH-060: the ring closes a beat later, so the choosing tap is spent now */
            try { const F = root.LowiFreshScrim; if (F && F.closed) F.closed(layer, e); } catch (x) { }
            pulse(); setTimeout(() => close(true), 380);
            return;
        }
        if (id === 'more') { show('more'); return; }
        if (id === 'deleteAccount') { askDelete(); return; }
        if (id === 'delCancel') { showPage(lastBubble || D.body); return; }
        if (id === 'delGo') { doDelete(b); return; }
        const R = ROUTES[id]; if (!R) return;
        /* a row that opens another panel: Settings steps aside first, so that panel is in front and usable (never behind Settings) */
        if (rowAction(id) === 'panel') { close(false); try { R.run(); } catch (err) { console.warn('[settings-sleep]', id, err); } return; }
        if (R.toggle) {
            try { R.run(); } catch (err) { console.warn('[settings-sleep]', id, err); }
            /* switches stay open and show their new state in place */
            setTimeout(() => {
                if (open !== kind) return;
                const on = !!R.toggle(), T = t(); b.setAttribute('aria-checked', String(on));
                const sm = b.querySelector('small'); if (sm) sm.textContent = id === 'theme' ? (on ? T.night : T.day) : on ? T.on : T.off;
                if (id === 'theme') b.setAttribute('aria-label', (T.theme || id) + ': ' + (on ? T.night : T.day));
            }, 60);
            return;
        }
        close(false);
        try { R.run(); } catch (err) { console.warn('[settings-sleep]', id, err); }
    }
    /* ---- Delete account (Oct 21 2026, App Store 5.1.1(v)): asks inside the panel, then the server deletes the signed-in account
       (Edge Function delete-my-account: rows, photos, the login itself); only after it says ok is this phone cleared and the app
       reloaded. A failed call deletes nothing and says so. A guest has no cloud account: it offers to clear this phone only. */
    function cloud() { const X = root.LOWI_CLOUD_X; try { return X && fn(X, 'state') ? X : null; } catch (e) { return null; } }
    function signedIn() { const X = cloud(); try { const s = X && X.state(); return !!(s && s.live && s.uid); } catch (e) { return false; } }
    function askDelete() {
        const L = layer, pn = L && L.querySelector('.ss2-page'); if (!pn) return;
        const T = t(), me = signedIn();
        const body = pn.querySelector('.ss2-page-body'), title = pn.querySelector('.ss2-page-title');
        title.textContent = T.delTitle;
        body.innerHTML = '<p class="ss2-del-tx" id="ss2DelTx">' + (me ? T.delBody : T.delGuest) + '</p>' +
            '<div class="ss2-del-acts"><button type="button" class="ss2-chip ss2-row ss2-del-go" data-ss2="delGo" data-guest="' + !me + '" aria-describedby="ss2DelTx"><span class="ss2-lbl">' + (me ? T.delGo : T.delGuestGo) + '</span></button>' +
            '<button type="button" class="ss2-chip ss2-row" data-ss2="delCancel"><span class="ss2-lbl">' + T.delCancel + '</span></button></div>';
        placePage(pn, lastBubble || D.body, true);
        const c = body.querySelector('[data-ss2="delCancel"]'); if (c) { try { c.focus({ preventScroll: true }); } catch (e) { } }
    }
    function wipeDevice() {
        try { root.localStorage.clear(); } catch (e) { }
        try { root.sessionStorage.clear(); } catch (e) { }
        try { if (root.caches && fn(root.caches, 'keys')) root.caches.keys().then(ks => ks.forEach(k => root.caches.delete(k))); } catch (e) { }
        /* Oct 22: the meal photos saved on this device (meal-journal.js, IndexedDB) go with the account */
        try { if (root.indexedDB && fn(root.indexedDB, 'deleteDatabase')) root.indexedDB.deleteDatabase('lowi-meal-photos'); } catch (e) { }
        setTimeout(() => { try { root.location.replace(root.location.pathname); } catch (e) { root.location.reload(); } }, 250);
    }
    async function doDelete(btn) {
        const T = t(), guest = btn.getAttribute('data-guest') === 'true', tx = layer && layer.querySelector('.ss2-del-tx');
        if (btn.disabled) return;
        if (guest) { wipeDevice(); return; }
        btn.disabled = true; const lb = btn.querySelector('.ss2-lbl'); if (lb) lb.textContent = T.delBusy;
        const r = await serverDelete();
        if (r === true) return;
        btn.disabled = false; if (lb) lb.textContent = T.delGo;
        if (tx) { tx.textContent = r === 'owner' ? T.delOwner : T.delFail; tx.setAttribute('role', 'alert'); }
    }
    /* the one server call, shared by the old sheet and the profile hub. Returns true only after the server said ok (then this
       phone is cleared), 'owner' when the server refused the owner account, else false. Oct 25 2026: the server deletes the whole
       account in one transaction, so a false really means nothing was deleted; it also gets this phone's push address, so the
       deleted account stops getting pushes here (and the subscription itself is dropped). */
    async function pushSub() {
        try {
            const sw = root.navigator && root.navigator.serviceWorker;
            if (!sw || !sw.ready) return null;
            const reg = await Promise.race([sw.ready, new Promise(res => setTimeout(() => res(null), 1500))]);
            return reg && reg.pushManager && fn(reg.pushManager, 'getSubscription') ? await reg.pushManager.getSubscription() : null;
        } catch (e) { return null; }
    }
    async function serverDelete() {
        let ok = false, why = '';
        const sub = await pushSub(), endpoint = sub && typeof sub.endpoint === 'string' ? sub.endpoint : '';
        try {
            const X = cloud(), c = X && fn(X, 'client') ? await X.client() : null;  /* client() is async: without await nothing was ever sent */
            if (c && c.functions && fn(c.functions, 'invoke')) {
                const r = await c.functions.invoke('delete-my-account', { body: endpoint ? { confirm: 'DELETE', endpoint } : { confirm: 'DELETE' } });
                ok = !!(r && !r.error && r.data && r.data.ok);
                if (!ok && r && r.error && r.error.context && fn(r.error.context, 'json')) {
                    try { const j = await r.error.context.json(); why = j && j.error === 'owner' ? 'owner' : ''; } catch (e) { }
                }
            }
        } catch (e) { ok = false; }
        if (ok) {
            try { if (sub && fn(sub, 'unsubscribe')) await sub.unsubscribe(); } catch (e) { }
            try { const X = cloud(), c = await X.client(); if (c && c.auth) await c.auth.signOut({ scope: 'local' }); } catch (e) { }
            wipeDevice(); return true;
        }
        return why === 'owner' ? 'owner' : false;
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
        /* Oct 21 2026: a tap on this bubble opens Community (a page), so it no longer says it opens a dialog */
        if (g) { if (g.dataset.o8Adapter !== 'settings-sleep') g.dataset.o8Adapter = 'settings-sleep'; if (g.hasAttribute('aria-haspopup')) g.removeAttribute('aria-haspopup'); if (g.hasAttribute('aria-expanded')) g.removeAttribute('aria-expanded'); }
    }
    function onTap(e) {
        const el = e.target && e.target.closest && e.target.closest('[data-orbit="sleep"],[data-orbit="settings"]');
        if (!el || el.dataset.o8Adapter !== 'settings-sleep') return;
        const k = el.getAttribute('data-orbit');
        e.preventDefault();
        /* the click that ends a hold is not a tap (the hold already opened the hub) */
        if (k === 'settings' && (holdFired || Date.now() < swallowUntil)) { e.stopPropagation(); return; }
        /* Oct 23, 18:03 (Eman: "Sleeping isn't aligned"): Sleep blooms on the same circle as Fuel, Water and Move (LowiHomeBloomsV2);
           a second tap on Sleep folds it again. The old fan below stays only as the fallback. */
        if (k === 'sleep') { const B = ringBlooms(); if (B) { if (B.isOpen() === 'sleep') B.close(); else { close(false); if (!B.open('sleep')) show('sleep'); } return; } }
        const i = tapIntent(k, open);
        if (i === 'close') close(true);
        else if (i === 'community') { close(false); try { ROUTES.community.run(); } catch (err) { console.warn('[settings-sleep] community', err); } }
        else show(i);
    }
    /* ---- hold the Community bubble (Oct 21 2026; Oct 22 item 42: opens the profile hub): HOLD_MS still, under 12 px of drift;
       touch, pen and mouse. A light cue (.ss2-holding) while the finger is down; the click that ends the hold, wherever it lands
       (the hub's backdrop is under the finger now), is swallowed, however long the finger stayed. ---- */
    let holdT = 0, holdAt = null, holdEl = null, holdFired = false, swallowUntil = 0, detached = false;
    function holdCue(on) { if (holdEl) holdEl.classList.toggle('ss2-holding', !!on); if (!on) holdEl = null; }
    function holdCancel() { if (holdT) { clearTimeout(holdT); holdT = 0; } holdAt = null; holdCue(false); }
    /* the finger lifted after a hold that fired: the click it makes comes right after; swallow only that one */
    function holdLift() { if (holdFired) { holdFired = false; swallowUntil = Date.now() + 450; } holdCancel(); }
    function openHub() {
        const M = root.LowiCommunityMe;
        try { if (M && fn(M, 'open') && M.open()) return 'hub'; } catch (err) { console.warn('[settings-sleep] hub', err); }
        show('page'); return 'page';
    }
    function onHoldDown(e) {
        if (!holdFired) swallowUntil = 0;
        if (e.isPrimary === false) { holdCancel(); return; } /* BH-023: a second finger is a pinch, not a hold */
        const el = e.target && e.target.closest && e.target.closest('[data-orbit="settings"]');
        if (!el || el.dataset.o8Adapter !== 'settings-sleep' || (e.button && e.button !== 0) || e.isPrimary === false) return;
        holdCancel(); holdAt = { x: e.clientX, y: e.clientY }; holdEl = el; holdCue(true);
        holdT = setTimeout(() => {
            holdT = 0; holdAt = null; holdCue(false); holdFired = true; swallowUntil = Date.now() + 60000;
            try { if (root.navigator && fn(root.navigator, 'vibrate')) root.navigator.vibrate(12); } catch (err) { }
            hintDone(); hideHint(); detached = false;
            if (open) close(false);
            if (holdIntent('settings') === 'hub') openHub(); else show('page');
        }, HOLD_MS);
    }
    function onHoldClick(e) {
        if (!holdFired && !(swallowUntil && Date.now() < swallowUntil)) return;
        holdFired = false; swallowUntil = 0;
        e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    function onHoldMove(e) { if (holdAt && Math.hypot(e.clientX - holdAt.x, e.clientY - holdAt.y) > 12) holdCancel(); }
    /* ---- the one-time hint: "Hold Community for settings", once, the first time Home shows the bubble after this update ---- */
    let hintEl = null, hintSince = 0;
    function hintDone() { ls.set(HINT_KEY, String(Date.now())); }
    function hideHint() { if (hintEl) { const h = hintEl; hintEl = null; h.classList.add('out'); setTimeout(() => h.remove(), 300); } }
    function maybeHint() {
        if (hintEl || ls.get(HINT_KEY) || open || D.hidden) return;
        if (!hintSince) { hintSince = Date.now(); return; }
        if (Date.now() - hintSince < 3000) return;
        if (!H.classList.contains('wh-home') || H.classList.contains('wh-away')) return;
        const T2 = root.LowiTutorial; try { if (T2 && fn(T2, 'isOpen') && T2.isOpen()) return; } catch (e) { }
        if ([...D.querySelectorAll('[aria-modal="true"]')].some(m => m.getBoundingClientRect().width > 2 && !(layer && layer.contains(m)))) return;
        const b = findBubble('settings'); if (!b) return; const q = b.getBoundingClientRect(); if (q.width < 2) return;
        hintDone();
        const el = D.createElement('div'); el.className = 'ss2-hint'; el.setAttribute('role', 'status'); el.textContent = t().hint;
        D.body.appendChild(el);
        const w = el.offsetWidth, h = el.offsetHeight, vw = H.clientWidth || root.innerWidth, below = q.top < h + 70;
        el.style.left = Math.round(Math.max(10, Math.min(vw - w - 10, q.left + q.width / 2 - w / 2))) + 'px';
        el.style.top = Math.round(below ? q.bottom + 10 : q.top - h - 10) + 'px';
        el.style.setProperty('--ss2-hx', Math.round(q.left + q.width / 2 - parseFloat(el.style.left)) + 'px');
        el.setAttribute('data-side', below ? 'below' : 'above');
        hintEl = el; setTimeout(hideHint, 6500);
    }
    function onDown(e) {
        if (hintEl) hideHint();
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
        D.addEventListener('pointerdown', onHoldDown, true);
        D.addEventListener('pointermove', onHoldMove, true);
        D.addEventListener('scroll', holdCancel, true);
        ['pointerup', 'pointercancel'].forEach(n => D.addEventListener(n, holdLift, true));
        /* before every other click handler (the window sees a click first): the click that ends a hold reaches nothing */
        root.addEventListener('click', onHoldClick, true);
        /* iOS: no synthetic click at all after a hold that fired */
        D.addEventListener('touchend', e => { if (holdFired || (swallowUntil && Date.now() < swallowUntil)) { try { e.preventDefault(); } catch (err) { } } }, { capture: true, passive: false });
        /* no iOS callout, text selection or desktop menu on a hold */
        D.addEventListener('contextmenu', e => { if (e.target && e.target.closest && e.target.closest('[data-orbit="settings"][data-o8-adapter="settings-sleep"]')) e.preventDefault(); }, true);
        /* the language buttons switch the page language: an open Settings redraws in it */
        try { new MutationObserver(() => { if (open === 'page' && layer && !layer.querySelector('.ss2-del-tx')) showPage(lastBubble || D.body); }).observe(H, { attributes: true, attributeFilter: ['lang'] }); } catch (e) { }
        D.addEventListener('keydown', e => { if (e.key === 'Escape' && open) close(true); else trapTab(e); });
        D.addEventListener('lowi:bloom-v2', e => { const d = e && e.detail; if (d && d.open && d.owner !== 'settings-sleep') close(false); });
        ['lowi:home-orbit', 'lowi:home-bubble-added'].forEach(n => { D.addEventListener(n, claim); root.addEventListener(n, claim); });
        /* the ring moved (menu bar switched, rotation): an open bloom follows its bubble */
        D.addEventListener('lowi:home-orbit', () => { if (!open || open === 'page') return; /* the Settings panel stays where it is: it never jumps under a finger */ const k = open, a = D.activeElement, id = a && layer && layer.contains(a) ? a.getAttribute('data-ss2') : null; show(k); const f = id && layer.querySelector('[data-ss2="' + id + '"]'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } } });
        D.addEventListener('lowi:tab', () => { if (!detached) close(false); setTimeout(claim, 400); });
        root.addEventListener('lowi:state', paintSleep);
        /* a bloom is placed round its bubble, so it closes when the window changes; the full page lays itself out and stays */
        root.addEventListener('resize', () => { if (open && open !== 'page') close(false); else if (open === 'page' && layer && lastBubble) placePage(layer.querySelector('.ss2-page'), lastBubble, true); }, { passive: true });
        D.addEventListener('visibilitychange', () => { if (!D.hidden) claim(); });
        /* Home leaves (another tab, Misty flies off): the bloom goes with it; a new day empties the Sleep bubble */
        setInterval(() => { if (D.hidden) return; claim(); maybeHint(); if (open && !detached && (!H.classList.contains('wh-home') || H.classList.contains('wh-away'))) close(false); }, 1500);
        return api;
    }
    function unmount() {
        close(false);
        ['sleep', 'settings'].forEach(k => { const b = findBubble(k); if (b && b.dataset.o8Adapter === 'settings-sleep') delete b.dataset.o8Adapter; });
    }
    const api = Object.assign({}, core, {
        mount, unmount, close: () => close(false), isOpen: () => open, open: k => { detached = false; return show(k); },
        /* Oct 21 2026: Settings from anywhere (the gear in Community): a centred sheet that stays open off Home */
        openSettings: () => { detached = !H.classList.contains('wh-home') || H.classList.contains('wh-away'); return show('page'); },
        /* Community's profile panel (community-me.js) runs the places through the same routes */
        has: id => env.has(id), run: id => { const R = ROUTES[id]; if (!R) return false; try { R.run(); return true; } catch (e) { console.warn('[settings-sleep]', id, e); return false; } },
        /* the profile hub (community-me.js) shows the Settings rows: their state, the version line and Delete account */
        state: id => { const R = ROUTES[id]; try { return !!(R && R.toggle && R.toggle()); } catch (e) { return false; } },
        version: () => { const bm = D.querySelector('meta[name="lowi-build"]'); return versionLabel(bm && bm.content, lang()); },
        signedIn: () => signedIn(), wipeDevice: () => wipeDevice(), deleteAccount: () => serverDelete(),
        label: id => t()[id] || id, icon: id => (ICON[id] ? svg(id) : ''), hint: { shown: () => !!ls.get(HINT_KEY), show: () => { ls.set(HINT_KEY, ''); try { root.localStorage.removeItem(HINT_KEY); } catch (e) { } hintSince = 1; maybeHint(); } },
        sleep: { today: () => { const band = sleepToday(); return Object.assign({ day: dayKey() }, sleepView(band, lang())); }, set: band => setSleep(band), clear: () => setSleep(null) },
        available: () => ({ settings: entries('settings', env), more: entries('more', env) })
    });
    root.LowiHomeSettingsSleepV2 = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
