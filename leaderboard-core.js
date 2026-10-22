/* leaderboard-core.js: the strength leaderboard in Community (Oct 22 2026, Emmanuel: "a leaderboard in our community, so it becomes
   like a competition game ... which companion is the strongest, who's number one"). Pure helpers, no DOM, node tests load it.
   - Two boards: This week (XP earned since Monday 00:00 in the phone's own time, the same week as the Care board) and Strongest
     companions (all-time XP and level).
   - Ranks ONLY app XP and level. Never weight, weight lost or BMI: health data stays private.
   - Rides the existing profiles table: all-time XP is the `xp` column, the week's XP and the "hide me" choice ride the Care board's
     tagged `wk` text as a suffix: care1:<monday>:<full days>:x<week XP>[:h]. care-board-core.js untag() accepts the suffix.
   - Fair play: every row is checked on the reader's phone against the daily XP ceiling (DAY_CAP) before it can rank: week XP above
     days-so-far x DAY_CAP, week XP above all-time XP, all-time XP above DAY_CAP x days since XP started, or XP that grew faster than
     DAY_CAP a day since this phone last saw that member, keeps the row off the board. The level shown is worked out from the XP, never
     taken from the row. The server-side twin of these checks is supabase/proposals/leaderboard_fairplay_20261022.sql (owner runs it). */
(function (root) {
    'use strict';
    const isNode = typeof module === 'object' && module.exports;
    const CB = () => (isNode ? require('./care-board-core.js') : root.LowiCareBoard) || null;
    const WHC = () => (isNode ? require('./world-home-core.js') : root.LowiWorldHomeCore) || null;
    /* the most XP an honest day can reach with every daily cap filled (meals, water, Moves, steps, scans, Pathfinder, quests), rounded
       up generously so nobody real ever gets held back */
    const DAY_CAP = 1000;
    /* the first day XP could be earned (first commit of the app) */
    const XP_EPOCH = Date.UTC(2026, 9, 9);
    const DAY = 864e5;
    const SUFFIX_RX = /^(care1:(\d{4}-\d{2}-\d{2}):(\d{1,3}))(?::x(\d{1,6}))?(:h)?$/;

    function weekKey(now) { const c = CB(); if (c) return c.periodKey('w', now); const d = new Date(+now || Date.now()); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function weekStart(now) { const c = CB(); if (c) return +c.periodStart('w', now); const d = new Date(+now || Date.now()); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return +d; }
    function daysSoFar(now) { return Math.max(1, Math.floor(((+now || Date.now()) - weekStart(now)) / DAY) + 1); }
    /* your own XP since Monday 00:00, from your XP ledger */
    function weekXP(ledger, now) {
        const t0 = weekStart(now), t1 = (+now || Date.now()) + 60e3; let s = 0;
        for (const e of ledger || []) { const ts = e && +e.ts, a = e && +e.amt; if (ts >= t0 && ts <= t1 && a > 0 && isFinite(a)) s += a; }
        return Math.round(s);
    }
    /* the wk text with the week's XP and the hide choice added; keeps the care part as it is */
    function tag(wk, o) {
        o = o || {}; const key = o.key || weekKey(o.now);
        let base = String(wk || ''); const m = SUFFIX_RX.exec(base);
        base = m ? m[1] : 'care1:' + key + ':0';
        const wx = Math.max(0, Math.min(999999, Math.round(+o.wxp || 0)));
        return base + ':x' + wx + (o.hide ? ':h' : '');
    }
    function parse(wk) {
        const m = SUFFIX_RX.exec(String(wk || ''));
        if (!m) return { key: '', full: 0, wxp: null, hide: false };
        return { key: m[2], full: +m[3], wxp: m[4] == null ? null : +m[4], hide: !!m[5] };
    }
    function stages() { const w = WHC(); return (w && w.STAGES) || [{ xp: 0 }]; }
    /* the level is worked out from the XP (the same table as the app, world-home-core STAGES / herb-config), never read from the row */
    function levelFor(xp) { xp = Math.max(0, +xp || 0);
        /* in the app, the app's own level function wins (so the 25-level Evolution table counts the moment it lands) */
        if (!isNode && typeof root.levelOf === 'function') { try { const L = +root.levelOf(xp).L; if (L >= 1) return L; } catch (e) { } }
        const S = stages(); let i = 0; S.forEach((s, k) => { if (xp >= s.xp) i = k; }); return i + 1; }
    function stageName(lv, lang) { const S = stages(), s = S[Math.max(0, Math.min(S.length - 1, (lv | 0) - 1))]; if (!s || !s.n) return ''; const ix = ({ de: 1, es: 2 })[lang] || 0; return s.n[ix] || s.n[0]; }

    /* is this row allowed on the board? seen = {xp, t} the last time this phone saw the member (optional) */
    function check(p, now, seen) {
        now = +now || Date.now();
        const xp = Math.max(0, Math.round(+p.xp || 0)), t = parse(p.wk), thisWeek = t.key === weekKey(now);
        const wxp = thisWeek && t.wxp != null ? t.wxp : 0;
        const allCap = DAY_CAP * (Math.max(0, Math.floor((now - XP_EPOCH) / DAY)) + 2);
        let why = '';
        if (!isFinite(+p.xp || 0) || +p.xp < 0) why = 'bad-xp';
        else if (xp > allCap) why = 'xp-over-cap';
        else if (wxp > daysSoFar(now) * DAY_CAP) why = 'week-over-cap';
        else if (wxp > xp) why = 'week-over-total';
        else if (seen && seen.t > 0 && seen.t < now && xp > (+seen.xp || 0)) {
            const days = (now - seen.t) / DAY, grew = xp - (+seen.xp || 0);
            if (grew > DAY_CAP * (Math.ceil(days) + 1)) why = 'grew-too-fast';
        }
        return { ok: !why, why, xp, wxp, lv: levelFor(xp), hide: t.hide };
    }
    /* list = everyone (care roster already applied), mode 'week' | 'strong'. Your own row uses your own numbers (mine = {xp, wxp, hide}).
       Demo bots never rank against real people; they only fill the board while there is no cloud (o.demo). */
    function rank(list, mode, now, mine, o) {
        o = o || {}; now = +now || Date.now(); const seenOf = o.seen || (() => null), out = [], held = [];
        for (const p of list || []) {
            if (!p) continue;
            if (p.bot || p.demo) { if (!o.demo) continue; const h = hash(p.n), xp = 120 + h % 2600, wxp = 20 + h % 380; out.push({ p, xp, wxp, lv: levelFor(xp), demo: true }); continue; }
            if (p.me) { if (mine && mine.hide) continue; const xp = Math.max(0, Math.round(+(mine && mine.xp) || +p.xp || 0)); out.push({ p, xp, wxp: Math.min(xp, Math.max(0, Math.round(+(mine && mine.wxp) || 0))), lv: levelFor(xp) }); continue; }
            const c = check(p, now, seenOf(p));
            if (c.hide) continue;
            if (!c.ok) { held.push({ p, why: c.why }); continue; }
            out.push({ p, xp: c.xp, wxp: c.wxp, lv: c.lv });
        }
        const key = mode === 'week' ? 'wxp' : 'xp';
        const rows = out.filter(r => mode !== 'week' || r[key] > 0 || r.p.me)
            .sort((a, b) => (b[key] - a[key]) || (b.xp - a.xp) || String(a.p.n || '').localeCompare(String(b.p.n || '')));
        return { rows, held, me: rows.findIndex(r => r.p.me) };
    }
    const hash = s => { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

    const TX = {
        en: { week: 'This week', strong: 'Strongest', care: 'Care', tWeek: 'This week', tStrong: 'Strongest companions', dWeek: 'XP earned since Monday. Everyone starts at zero each week, so anyone can win.', dStrong: 'All-time level and XP. Who has the strongest companion?', you: 'You', lv: 'Lv', xp: 'XP', hidden: 'You are hidden from the leaderboard. Turn it on in your profile hub: Show me on the leaderboard.', empty: 'No XP yet this week. Log a meal, water or a Move to get on the board.', fair: 'Only app XP and levels count, never weight or BMI. Every habit has a daily cap, and numbers that break the caps are held back.', demo: 'Demo players, not real people: the live board shows when you are online.', notRanked: 'not ranked yet', show: 'Show me on the leaderboard', showSub: 'Nickname and companion only', on: 'On', off: 'Off' },
        de: { week: 'Diese Woche', strong: 'St\u00e4rkste', care: 'F\u00fcrsorge', tWeek: 'Diese Woche', tStrong: 'St\u00e4rkste Begleiter', dWeek: 'XP seit Montag. Jede Woche starten alle bei null, also kann jeder gewinnen.', dStrong: 'Level und XP insgesamt. Wer hat den st\u00e4rksten Begleiter?', you: 'Du', lv: 'Lv', xp: 'XP', hidden: 'Du bist in der Bestenliste ausgeblendet. Schalte es in deinem Profil-Hub ein: In der Bestenliste zeigen.', empty: 'Diese Woche noch keine XP. Trag eine Mahlzeit, Wasser oder einen Move ein, um auf die Liste zu kommen.', fair: 'Es z\u00e4hlen nur App-XP und Level, nie Gewicht oder BMI. Jede Gewohnheit hat ein Tageslimit, und Zahlen \u00fcber den Limits werden zur\u00fcckgehalten.', demo: 'Demo-Spieler, keine echten Menschen: Die echte Liste erscheint, wenn du online bist.', notRanked: 'noch ohne Platz', show: 'In der Bestenliste zeigen', showSub: 'Nur Spitzname und Begleiter', on: 'An', off: 'Aus' },
        es: { week: 'Esta semana', strong: 'M\u00e1s fuertes', care: 'Cuidado', tWeek: 'Esta semana', tStrong: 'Compa\u00f1eros m\u00e1s fuertes', dWeek: 'XP ganada desde el lunes. Cada semana todos empiezan de cero, as\u00ed que cualquiera puede ganar.', dStrong: 'Nivel y XP de siempre. \u00bfQui\u00e9n tiene el compa\u00f1ero m\u00e1s fuerte?', you: 'T\u00fa', lv: 'Nv', xp: 'XP', hidden: 'Est\u00e1s oculto en la clasificaci\u00f3n. Act\u00edvalo en tu perfil: Mostrarme en la clasificaci\u00f3n.', empty: 'A\u00fan no hay XP esta semana. Registra una comida, agua o un Move para entrar en la lista.', fair: 'Solo cuentan la XP y los niveles de la app, nunca el peso ni el IMC. Cada h\u00e1bito tiene un l\u00edmite diario, y los n\u00fameros que lo superan se retienen.', demo: 'Jugadores de demostraci\u00f3n, no personas reales: la clasificaci\u00f3n real aparece cuando est\u00e1s en l\u00ednea.', notRanked: 'a\u00fan sin puesto', show: 'Mostrarme en la clasificaci\u00f3n', showSub: 'Solo apodo y compa\u00f1ero', on: 'S\u00ed', off: 'No' }
    };
    const api = { DAY_CAP, XP_EPOCH, TX, weekKey, weekStart, daysSoFar, weekXP, tag, parse, levelFor, stageName, check, rank };
    if (isNode) module.exports = api;
    if (root) root.LowiLeaderboardCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
