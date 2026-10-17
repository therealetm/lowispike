/* ===== Daily ritual (Oct 15, 2026) =====
   Three small pieces, inspired by the best habit apps but in LOWiSPIKE's own dark space look:
   1. Add to Home Screen walkthrough: the browser hint's button (#lcA2hs) opens three illustrated steps
      (Next / Back, one reason line, a mock reminder from your herb on step 3). "Maybe later" hides the hint
      for this visit (sessionStorage lowi.a2hs.x, same key the hint already respects). Never in the Home Screen
      app. Signed-in Safari keeps the sign-in handoff: the last step's button carries data-hof="go", so the
      existing hofjs handler copies the one-time sign-in and shows its sheet ("Anmeldung einfuegen" in the app).
   2. Daily opening card: once per local day, day count, alliterative weekday (de/en/es), one line, one goal
      taken from what is really going on (active fast, water, or the next action on Home). One tap anywhere
      dismisses. Waits in a queue while the orb update bubble, a sheet, a tour or the sign-in gate is up.
   3. Consistency goal picker: four flexible goals (2 or 3 or 5 active days this week, 14 this month), a label and an
      herb reaction for each. Progress never drops to zero: a missed day just isn't counted, and a new week
      starts fresh with last week's result kept. Shown on Today as a small chip in the log header.
   No health or efficacy claims anywhere in here. Stored in the app state (S.ritual) so it syncs with the account. */
(function (root) {
    'use strict';

    /* ---------- pure core (also used by tests/daily-ritual.test.cjs) ---------- */
    const pad = n => (n < 10 ? '0' : '') + n;
    const dayKey = d => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const fromKey = k => new Date(k + 'T12:00:00');
    const addDays = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return dayKey(d); };
    const diffDays = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 86400000);
    const weekStart = k => { const d = fromKey(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d); };
    const monthStart = k => k.slice(0, 8) + '01';
    const monthEnd = k => { const d = fromKey(monthStart(k)); d.setMonth(d.getMonth() + 1); d.setDate(0); return dayKey(d); };
    const LANGS = ['en', 'de', 'es'];
    const L = (lang, en, de, es) => (lang === 'de' ? de : lang === 'es' ? (es || en) : en);

    /* weekday 0 = Sunday, like Date.getDay(); every name starts with the weekday's own letter */
    const WEEKDAY = {
        en: ['Slow Sunday', 'Mighty Monday', 'Tasty Tuesday', 'Wonder Wednesday', 'Thriving Thursday', 'Fresh Friday', 'Sparkly Saturday'],
        de: ['Sanfter Sonntag', 'Mutiger Montag', 'Dranbleib-Dienstag', 'Munterer Mittwoch', 'Durchstarter-Donnerstag', 'Frischer Freitag', 'Strahlender Samstag'],
        es: ['Domingo dorado', 'Lunes luminoso', 'Martes m\u00e1gico', 'Mi\u00e9rcoles maravilloso', 'Jueves jugoso', 'Viernes vibrante', 'S\u00e1bado sabroso']
    };
    const WEEKDAY_PLAIN = {
        en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
        es: ['domingo', 'lunes', 'martes', 'mi\u00e9rcoles', 'jueves', 'viernes', 's\u00e1bado']
    };
    /* one line per weekday, encouraging, no promises about the body */
    const LINES = {
        en: ['Easy pace today. One small thing is plenty.', 'New week, clean page. Start small.', 'Small steps still count. Every single one.', 'Halfway through the week. Your herb noticed.', 'You have been showing up. Keep the rhythm.', 'Friday. Pick one thing you will be glad you did.', 'Weekend mode. Same you, more time.'],
        de: ['Ruhig angehen. Eine kleine Sache reicht.', 'Neue Woche, leere Seite. Fang klein an.', 'Kleine Schritte z\u00e4hlen. Jeder einzelne.', 'Halbzeit der Woche. Dein Kraut hat\u2019s gemerkt.', 'Du bist drangeblieben. Bleib im Rhythmus.', 'Freitag. Mach eine Sache, \u00fcber die du dich nachher freust.', 'Wochenende. Gleiches Du, mehr Zeit.'],
        es: ['Con calma hoy. Una cosa peque\u00f1a basta.', 'Semana nueva, p\u00e1gina limpia. Empieza peque\u00f1o.', 'Los pasos peque\u00f1os cuentan. Todos.', 'Mitad de semana. Tu hierba lo ha notado.', 'Sigues apareciendo. Mant\u00e9n el ritmo.', 'Viernes. Haz una cosa que te alegre despu\u00e9s.', 'Fin de semana. Mismo t\u00fa, m\u00e1s tiempo.']
    };
    function weekdayName(date, lang) { const l = LANGS.indexOf(lang) >= 0 ? lang : 'en'; return WEEKDAY[l][date.getDay()]; }
    function weekdayLine(date, lang) { const l = LANGS.indexOf(lang) >= 0 ? lang : 'en'; return LINES[l][date.getDay()]; }

    /* Day n: counted from the first day the app saw you (first ledger/log/record day), day 1 = that day */
    function firstDay(keys, todayK) { let f = todayK; (keys || []).forEach(k => { if (/^\d{4}-\d\d-\d\d$/.test(k) && k < f) f = k; }); return f; }
    function dayNumber(first, todayK) { return Math.max(1, diffDays(first || todayK, todayK) + 1); }
    function shouldShowDaily(seen, todayK) { return seen !== todayK; }

    /* Flexible consistency goals. per: 'week' (Monday to Sunday) or 'month' (calendar month). */
    const GOALS = [
        { id: 'w2', n: 2, per: 'week', tone: 'easy' },
        { id: 'w3', n: 3, per: 'week', tone: 'rec' },
        { id: 'w5', n: 5, per: 'week', tone: 'steady' },
        { id: 'm14', n: 14, per: 'month', tone: 'big' },
        /* classic streak lengths, but kind: a missed day pauses, it never wipes what you collected */
        { id: 's2', n: 2, per: 'streak', tone: 'easy' },
        { id: 's5', n: 5, per: 'streak', tone: 'steady' },
        { id: 's7', n: 7, per: 'streak', tone: 'big' },
        { id: 's14', n: 14, per: 'streak', tone: 'big' }
    ];
    const GOAL_TEXT = {
        w2: { label: ['Warm-up', 'Aufw\u00e4rmen', 'Calentamiento'], what: ['2 days this week', '2 Tage diese Woche', '2 d\u00edas esta semana'], hint: ['Gentle start', 'Locker reinkommen', 'Inicio suave'],
            react: ['Two days? Perfect to get to know each other. I am in!', 'Zwei Tage? Perfekt zum Kennenlernen. Ich bin dabei!', '\u00bfDos d\u00edas? Perfecto para conocernos. \u00a1Me apunto!'] },
        w3: { label: ['Rhythm', 'Rhythmus', 'Ritmo'], what: ['3 days this week', '3 Tage diese Woche', '3 d\u00edas esta semana'], hint: ['Good first goal', 'Guter Start', 'Buen primer objetivo'],
            react: ['Three days, any three. That is a rhythm, and rhythms grow.', 'Drei Tage, egal welche. Das ist ein Rhythmus, und Rhythmen wachsen.', 'Tres d\u00edas, los que quieras. Eso es un ritmo, y los ritmos crecen.'] },
        w5: { label: ['Steady', 'Am Ball', 'Constante'], what: ['5 days this week', '5 Tage diese Woche', '5 d\u00edas esta semana'], hint: ['Most days', 'Die meisten Tage', 'Casi todos los d\u00edas'],
            react: ['Five days! Two free days for life, and still a strong week.', 'F\u00fcnf Tage! Zwei Tage frei f\u00fcrs Leben, und trotzdem eine starke Woche.', '\u00a1Cinco d\u00edas! Dos libres para vivir, y aun as\u00ed una semana fuerte.'] },
        m14: { label: ['Big month', 'Starker Monat', 'Gran mes'], what: ['14 days this month', '14 Tage diesen Monat', '14 d\u00edas este mes'], hint: ['Any 14 days', 'Beliebige 14 Tage', '14 d\u00edas cualquiera'],
            react: ['Fourteen days this month, in any order. I like this plan a lot.', 'Vierzehn Tage diesen Monat, in beliebiger Reihenfolge. Der Plan gef\u00e4llt mir richtig.', 'Catorce d\u00edas este mes, en cualquier orden. Este plan me encanta.'] },
        s2: { label: ['First spark', 'Erster Funke', 'Primera chispa'], what: ['2-day streak', '2-Tage-Serie', 'Racha de 2 d\u00edas'], hint: ['Try it out', 'Zum Reinschnuppern', 'Para probar'],
            react: ['Two days to get going. Short and sweet, I love it.', 'Zwei Tage zum Loslegen. Kurz und gut, mag ich.', 'Dos d\u00edas para arrancar. Corto y bonito, me encanta.'] },
        s5: { label: ['Workweek', 'Arbeitswoche', 'Semana laboral'], what: ['5-day streak', '5-Tage-Serie', 'Racha de 5 d\u00edas'], hint: ['Solid', 'Solide', 'S\u00f3lido'],
            react: ['Five days. If one slips, we just keep going. Deal?', 'F\u00fcnf Tage. Rutscht einer durch, machen wir einfach weiter. Deal?', 'Cinco d\u00edas. Si se escapa uno, seguimos y ya. \u00bfTrato?'] },
        s7: { label: ['Full week', 'Ganze Woche', 'Semana entera'], what: ['7-day streak', '7-Tage-Serie', 'Racha de 7 d\u00edas'], hint: ['Strong', 'Stark', 'Fuerte'],
            react: ['A whole week together! My leaves are tingling already.', 'Eine ganze Woche zusammen! Meine Bl\u00e4tter kribbeln schon.', '\u00a1Una semana entera juntos! Ya me tiemblan las hojas.'] },
        s14: { label: ['Two weeks', 'Zwei Wochen', 'Dos semanas'], what: ['14-day streak', '14-Tage-Serie', 'Racha de 14 d\u00edas'], hint: ['For later', 'F\u00fcr sp\u00e4ter', 'Para m\u00e1s adelante'],
            react: ['Fourteen days! Big plan. We take it one day at a time, no stress.', 'Vierzehn Tage! Gro\u00dfer Plan. Wir nehmen einen Tag nach dem anderen, ohne Stress.', '\u00a1Catorce d\u00edas! Gran plan. Un d\u00eda tras otro, sin estr\u00e9s.'] }
    };
    const li = lang => Math.max(0, LANGS.indexOf(lang));
    function goalById(id) { return GOALS.find(g => g.id === id) || null; }
    function goalText(id, lang) { const t = GOAL_TEXT[id]; if (!t) return null; const i = li(lang); return { label: t.label[i], what: t.what[i], hint: t.hint[i], react: t.react[i] }; }
    /* the window a goal counts in, for the given day */
    function period(goal, todayK, since) {
        if (!goal) return null;
        if (goal.per === 'streak') return { from: since || todayK, to: null };
        if (goal.per === 'month') return { from: monthStart(todayK), to: monthEnd(todayK) };
        const from = weekStart(todayK); return { from, to: addDays(from, 6) };
    }
    /* active days in the window; a missed day just doesn't count, nothing ever resets to zero mid-window */
    function progress(goalId, activeKeys, todayK, since) {
        const g = goalById(goalId); if (!g) return null;
        const p = period(g, todayK, since), set = {};
        (activeKeys || []).forEach(k => { if (k >= p.from && k <= todayK) set[k] = 1; });
        const done = Object.keys(set).length, left = p.to ? Math.max(0, diffDays(todayK, p.to) + 1) : Infinity, todayDone = !!set[todayK];
        const need = Math.max(0, g.n - done);
        return { id: g.id, n: g.n, per: g.per, from: p.from, to: p.to, done: Math.min(done, g.n), extra: Math.max(0, done - g.n), need, reached: done >= g.n,
            daysLeft: left, stillPossible: need <= (todayDone ? left - 1 : left), todayDone };
    }
    /* the period before the current one (to show "last week 4/5" instead of a scary zero) */
    function previous(goalId, activeKeys, todayK) {
        const g = goalById(goalId); if (!g || g.per === 'streak') return null;
        const p = period(g, todayK), prevDay = addDays(p.from, -1);
        return progress(goalId, activeKeys, prevDay);
    }
    /* the one goal on the daily card: an active fast first, then water, then the next action on Home */
    function pickGoal(ctx, lang) {
        ctx = ctx || {};
        if (ctx.fasting) return { kind: 'fast', text: ctx.fastEnd ? L(lang, 'Keep your fasting window until ' + ctx.fastEnd + '.', 'Halte dein Fastenfenster bis ' + ctx.fastEnd + '.', 'Mant\u00e9n tu ventana de ayuno hasta las ' + ctx.fastEnd + '.')
            : L(lang, 'Keep your fasting window going.', 'Bleib in deinem Fastenfenster.', 'Sigue con tu ventana de ayuno.') };
        const goalW = ctx.waterGoal || 6, w = Math.max(0, +ctx.water || 0);
        if (w < goalW && (ctx.hour == null || ctx.hour < 20)) { const n = Math.min(goalW - w, 3); return { kind: 'water', act: 'water', text: L(lang, n === 1 ? 'Drink 1 cup of water and tap it in.' : 'Drink ' + n + ' cups of water and tap them in.', n === 1 ? 'Trink 1 Glas Wasser und tipp es ein.' : 'Trink ' + n + ' Gl\u00e4ser Wasser und tipp sie ein.', n === 1 ? 'Bebe 1 vaso de agua y an\u00f3talo.' : 'Bebe ' + n + ' vasos de agua y an\u00f3talos.') }; }
        if (ctx.next) return { kind: 'next', act: 'next', text: L(lang, 'Next up: ', 'Als N\u00e4chstes: ', 'Lo siguiente: ') + ctx.next };
        return { kind: 'log', text: L(lang, 'Log one meal today.', 'Trag heute eine Mahlzeit ein.', 'Anota una comida hoy.') };
    }
    /* Add to Home Screen steps per platform kind: three each */
    function a2Steps(kind, lang, signed) {
        const ios = kind !== 'android';
        const s1 = kind === 'inapp' ? L(lang, 'Open this page in Safari or Chrome first (menu \u2192 Open in browser).', '\u00d6ffne die Seite zuerst in Safari oder Chrome (Men\u00fc \u2192 Im Browser \u00f6ffnen).', 'Abre primero esta p\u00e1gina en Safari o Chrome (men\u00fa \u2192 Abrir en el navegador).')
            : ios ? L(lang, 'Tap Share in Safari\u2019s bar.', 'Tippe in Safari auf Teilen.', 'Toca Compartir en la barra de Safari.')
                : L(lang, 'Tap the \u22ee menu in Chrome.', 'Tippe in Chrome auf das \u22ee Men\u00fc.', 'Toca el men\u00fa \u22ee en Chrome.');
        const s2 = ios ? L(lang, 'Choose Add to Home Screen, then Add.', 'W\u00e4hle Zum Home-Bildschirm, dann Hinzuf\u00fcgen.', 'Elige A\u00f1adir a pantalla de inicio y luego A\u00f1adir.')
            : L(lang, 'Choose Install app or Add to Home screen.', 'W\u00e4hle App installieren oder Zum Startbildschirm.', 'Elige Instalar app o A\u00f1adir a pantalla de inicio.');
        const s3 = signed ? L(lang, 'Open LOWiSPIKE from your Home Screen and tap Paste sign-in.', '\u00d6ffne LOWiSPIKE vom Home-Bildschirm und tippe Anmeldung einf\u00fcgen.', 'Abre LOWiSPIKE desde inicio y toca Pegar acceso.')
            : L(lang, 'Open LOWiSPIKE from your Home Screen. Your herb can now remind you.', '\u00d6ffne LOWiSPIKE vom Home-Bildschirm. Jetzt kann dein Kraut dich erinnern.', 'Abre LOWiSPIKE desde inicio. Ahora tu hierba puede recordarte cosas.');
        return [s1, s2, s3];
    }
    const BUSY = ['#brOv', '#g1Ob:not(.out)', '#lcUpd', '.g1-ov', '.r3g1-ov', '.r2-ov.on:not(.off)', '#sheetwrap.open', '#rsSheet.open', '#mv-player.on', '#hofSheet', '#drA2', '#drPick', 'body > .b3-cam', '#spWorld:not([hidden])'];
    const Core = { dayKey, addDays, diffDays, weekStart, monthStart, monthEnd, WEEKDAY, WEEKDAY_PLAIN, LINES, weekdayName, weekdayLine, firstDay, dayNumber, shouldShowDaily, GOALS, goalById, goalText, period, progress, previous, pickGoal, a2Steps, BUSY, A2HS_X: 'lowi.a2hs.x', SEEN: 'lowi.daily.seen' };
    if (typeof module !== 'undefined' && module.exports) module.exports = Core;
    if (!root || !root.document) return;
    root.LowiRitualCore = Core;

    /* ---------- runtime ---------- */
    const W = root, D = W.document;
    const $ = s => D.querySelector(s);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lang = () => { let l = 'en'; try { l = (W.LowiLang && LowiLang.get && LowiLang.get()) || localStorage.getItem('lowispike.lang') || D.documentElement.lang || 'en'; } catch (e) {} l = String(l).slice(0, 2); return l === 'de' || l === 'es' ? l : 'en'; };
    const T = (en, de, es) => L(lang(), en, de, es);
    const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const standalone = () => { try { return !!(navigator.standalone || (W.matchMedia && matchMedia('(display-mode: standalone)').matches)); } catch (e) { return false; } };
    const S = () => { try { return W.LowiR2 && LowiR2.S ? LowiR2.S() : null; } catch (e) { return null; } };
    const save = () => { try { W.LowiR2 && LowiR2.save && LowiR2.save(); } catch (e) {} };
    const toast = m => { try { W.LowiR2 && LowiR2.toast ? LowiR2.toast(m) : W.LowiHost && LowiHost.toast(m); } catch (e) {} };
    const ritual = () => { const s = S(); if (!s) return null; if (!s.ritual || typeof s.ritual !== 'object') s.ritual = {}; return s.ritual; };
    function herbName() {
        try { if (W.LowiHerbIdentity && LowiHerbIdentity.name) { const n = LowiHerbIdentity.name(); if (n) return String(n); } } catch (e) {}
        const b = $('.sp-bubble-name'); return (b && b.textContent.trim()) || T('Your herb', 'Dein Kraut', 'Tu hierba');
    }
    function herbSVG() { const h = $('#spBubble .sp-home-herb svg'); return h ? h.outerHTML : '<svg viewBox="0 0 64 64"><path d="M32 52V30" stroke="#7ad97a" stroke-width="3" fill="none"/><path d="M32 32c-10-2-14-10-12-18 9 1 14 8 12 18zM32 30c8-4 16-2 18 6-8 3-15 0-18-6z" fill="#7ad97a"/><rect x="20" y="48" width="24" height="10" rx="4" fill="#a58cff"/></svg>'; }
    function activeKeys() {
        const s = S(); if (!s) return [];
        const out = {};
        try { Object.keys((s.streak && s.streak.days) || {}).forEach(k => { out[k] = 1; }); } catch (e) {}
        try { (s.logs || []).forEach(l => { const k = l.day || (l.ts ? dayKey(new Date(l.ts)) : ''); if (k) out[k] = 1; }); } catch (e) {}
        try { (s.ledger || []).forEach(e => { if (e && /^(tap|combo)$/.test(String(e.src || ''))) return; /* xtp: taps alone don't make an active day */ const k = e.day || (e.ts ? dayKey(new Date(e.ts)) : ''); if (k) out[k] = 1; }); } catch (e) {}
        return Object.keys(out).sort();
    }
    function busy() {
        const h = D.documentElement;
        if (h.classList.contains('gate-up')) return true;
        try { if (W.LowiR2 && LowiR2.gateUp && LowiR2.gateUp()) return true; } catch (e) {}
        try { if (W.LowiHost && LowiHost.onboarded && !LowiHost.onboarded()) return true; } catch (e) {}
        try { if (W.LowiG1 && LowiG1.state && LowiG1.state()) return true; } catch (e) {}
        return BUSY.some(sel => { try { const e = $(sel); return !!(e && (e.offsetParent || getComputedStyle(e).position === 'fixed')); } catch (x) { return false; } });
    }
    const ICON = {
        flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.6 3.4 4.7 5.6 4.7 10.3A4.7 4.7 0 0 1 12 21.5a4.7 4.7 0 0 1-4.7-4.7c0-2.3 1.2-3.7 2.3-4.9.3 1.4 1 2.3 2 2.6-.6-3.4.1-7.2.4-12z" fill="currentColor"/></svg>',
        target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>',
        share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16" fill="none" stroke="currentColor" stroke-width="1.9"/></svg>',
        plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 8.5v7M8.5 12h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        dots: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>',
        x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    };

    /* ===== 1. Add to Home Screen walkthrough ===== */
    function a2Kind() { const u = navigator.userAgent || ''; if (/Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Bytedance|Snapchat|Line\//i.test(u)) return 'inapp'; if (/Android/i.test(u)) return 'android'; return 'ios'; }
    function signedHandoff() { const b = $('#lcA2hs'); if (b && b.getAttribute('data-hofd') === '1') return true; try { return !!(W.LowiHandoff && LowiHandoff.want && LowiHandoff.want()); } catch (e) { return false; } }
    let A2 = null;
    function a2Art(i, kind) {
        const ios = kind !== 'android';
        if (i === 0) return '<div class="dr-phone"><div class="dr-screen"><div class="dr-url">therealetm.github.io</div><div class="dr-page"><i></i><i></i><i class="s"></i></div>' +
            (ios ? '<div class="dr-sbar"><span></span><span></span><b class="dr-hot">' + ICON.share + '</b><span></span><span></span></div>' : '<div class="dr-abar"><span class="dr-url2"></span><b class="dr-hot">' + ICON.dots + '</b></div>') + '</div></div>';
        if (i === 1) return '<div class="dr-phone"><div class="dr-screen dr-dim"><div class="dr-menu"><div class="dr-row"><i></i>' + esc(T('Copy', 'Kopieren', 'Copiar')) + '</div><div class="dr-row"><i></i>' + esc(T('Add bookmark', 'Lesezeichen', 'Marcador')) + '</div>' +
            '<div class="dr-row dr-hot">' + ICON.plus + esc(ios ? T('Add to Home Screen', 'Zum Home-Bildschirm', 'A\u00f1adir a inicio') : T('Install app', 'App installieren', 'Instalar app')) + '</div><div class="dr-row"><i></i>' + esc(T('Find on page', 'Auf Seite suchen', 'Buscar')) + '</div></div></div></div>';
        const now = new Date(), hm = pad(now.getHours()) + ':' + pad(now.getMinutes());
        return '<div class="dr-phone"><div class="dr-screen dr-home"><div class="dr-clock">' + hm + '</div>' +
            '<div class="dr-note"><span class="dr-note-ic">' + herbSVG() + '</span><span class="dr-note-tx"><b>' + esc(herbName()) + ' <em>' + esc(T('now', 'jetzt', 'ahora')) + '</em></b><span>' + esc(T('Psst, I\u2019m thirsty. One glass of water together?', 'Psst, ich hab Durst. Ein Glas Wasser zusammen?', 'Psst, tengo sed. \u00bfUn vaso de agua juntos?')) + '</span></span></div>' +
            '<div class="dr-apps"><i></i><i></i><i></i><span class="dr-app"><img src="icon-192.png" alt=""><small>LOWiSPIKE</small></span></div></div></div>';
    }
    function a2Render() {
        const o = $('#drA2'); if (!o || !A2) return;
        const steps = a2Steps(A2.kind, lang(), A2.signed), i = A2.i, last = i === steps.length - 1;
        const go = last ? (A2.signed ? '<button type="button" class="dr-btn pri" data-hof="go" data-dr="a2done">' + esc(T('Copy sign-in & finish', 'Anmeldung kopieren & fertig', 'Copiar acceso y listo')) + '</button>'
            : '<button type="button" class="dr-btn pri" data-dr="a2done">' + esc(T('Got it', 'Alles klar', 'Entendido')) + '</button>')
            : '<button type="button" class="dr-btn pri" data-dr="a2next">' + esc(T('Next', 'Weiter', 'Siguiente')) + '</button>';
        o.querySelector('.dr-a2-body').innerHTML =
            '<div class="dr-over">' + esc(T('Step', 'Schritt', 'Paso')) + ' ' + (i + 1) + ' / ' + steps.length + '</div>' +
            '<div class="dr-art" aria-hidden="true">' + a2Art(i, A2.kind) + '</div>' +
            '<p class="dr-step" id="drA2P">' + esc(steps[i]) + '</p>' +
            '<div class="dr-pips" aria-hidden="true">' + steps.map((_, k) => '<i class="' + (k === i ? 'on' : k < i ? 'past' : '') + '"></i>').join('') + '</div>' +
            '<div class="dr-nav">' + (i > 0 ? '<button type="button" class="dr-btn ghost" data-dr="a2back">' + esc(T('Back', 'Zur\u00fcck', 'Atr\u00e1s')) + '</button>' : '<button type="button" class="dr-btn ghost" data-dr="a2later">' + esc(T('Maybe later', 'Vielleicht sp\u00e4ter', 'Quiz\u00e1s luego')) + '</button>') + go + '</div>' +
            (i > 0 ? '<button type="button" class="dr-link" data-dr="a2later">' + esc(T('Maybe later', 'Vielleicht sp\u00e4ter', 'Quiz\u00e1s luego')) + '</button>' : '');
        const f = o.querySelector('[data-dr="a2next"],[data-dr="a2done"]'); if (f && A2.focus) try { f.focus({ preventScroll: true }); } catch (e) {}
    }
    function a2Open() {
        if (standalone()) return false;
        a2Close();
        A2 = { i: 0, kind: a2Kind(), signed: signedHandoff(), focus: true };
        const o = D.createElement('div'); o.id = 'drA2'; o.className = 'dr-ov'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'drA2H'); o.setAttribute('data-noi18n', '');
        o.innerHTML = '<div class="dr-card dr-a2"><button type="button" class="dr-x" data-dr="a2close" aria-label="' + esc(T('Close', 'Schlie\u00dfen', 'Cerrar')) + '">' + ICON.x + '</button>' +
            '<h3 id="drA2H">' + esc(T('Make LOWiSPIKE an app', 'Mach LOWiSPIKE zur App', 'Convierte LOWiSPIKE en app')) + '</h3>' +
            '<p class="dr-why">' + esc(A2.signed ? T('Full screen, one tap to open, and you stay signed in.', 'Vollbild, mit einem Tipp offen, und du bleibst angemeldet.', 'Pantalla completa, se abre con un toque y sigues con tu sesi\u00f3n.')
                : T('Full screen, one tap to open, and your herb can remind you.', 'Vollbild, mit einem Tipp offen, und dein Kraut kann dich erinnern.', 'Pantalla completa, se abre con un toque y tu hierba puede recordarte.')) + '</p><div class="dr-a2-body"></div></div>';
        D.body.appendChild(o); a2Render();
        if (!reduced()) o.classList.add('dr-in');
        return true;
    }
    function a2Close() { const o = $('#drA2'); if (o) o.remove(); A2 = null; }
    function a2Later() { try { sessionStorage.setItem(Core.A2HS_X, '1'); } catch (e) {} const b = $('#lcA2hs'); if (b) b.remove(); a2Close(); }
    /* the hint's own button opens the walkthrough instead of the old list sheet (capture runs before index.html's handlers) */
    D.addEventListener('click', ev => {
        const t = ev.target && ev.target.closest ? ev.target : null; if (!t) return;
        const hint = t.closest('#lcA2hs [data-cl="a2hs"], #lcA2hs [data-hof="go"]');
        if (hint) { ev.preventDefault(); ev.stopPropagation(); if (ev.stopImmediatePropagation) ev.stopImmediatePropagation(); a2Open(); return; }
    }, true);

    /* ===== 2. Daily opening card ===== */
    function seenDay() { try { return localStorage.getItem(Core.SEEN) || ''; } catch (e) { return ''; } }
    function setSeen(v) { try { if (v) localStorage.setItem(Core.SEEN, v); else localStorage.removeItem(Core.SEEN); } catch (e) {} }
    function dayCount(todayK) {
        const r = ritual(), keys = activeKeys();
        if (r && r.first) keys.push(r.first);
        const f = firstDay(keys, todayK);
        if (r && r.first !== f) { r.first = f; save(); }
        return dayNumber(f, todayK);
    }
    function goalCtx() {
        const now = new Date(), k = dayKey(now), ctx = { hour: now.getHours(), waterGoal: 6 };
        try { const st = W.LowiFastBubble && LowiFastBubble.state ? LowiFastBubble.state() : null; ctx.fasting = !!(st && st.on && st.running && !st.done); } catch (e) {}
        if (ctx.fasting) { const c = $('#spFast .sp-fast-copy'); const m = c && c.textContent.match(/(\d{1,2}:\d{2})(?!.*\d{1,2}:\d{2})/); if (m) ctx.fastEnd = m[1]; }
        try { if (W.LowiFast && typeof LowiFast.water === 'function') ctx.water = +LowiFast.water(k) || 0; else { const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); ctx.water = +(f.water && f.water[k]) || 0; } } catch (e) { ctx.water = 0; }
        const nb = $('#spHome .sp-next span'); if (nb) ctx.next = nb.textContent.trim();
        return ctx;
    }
    function chipProgressHTML(pr, big) {
        if (!pr) return '';
        const cells = pr.per === 'month' ? 0 : pr.n;
        const dots = cells ? '<span class="dr-dots">' + Array.from({ length: cells }, (_, i) => '<i class="' + (i < pr.done ? 'on' : '') + '"></i>').join('') + '</span>'
            : '<span class="dr-bar"><i style="width:' + Math.round(pr.done / pr.n * 100) + '%"></i></span>';
        return big ? dots : '';
    }
    let dayOpen = false;
    function dayCard() {
        if (dayOpen || $('#drDay')) return false;
        const now = new Date(), k = dayKey(now), l = lang(), r = ritual();
        const n = dayCount(k), g = pickGoal(goalCtx(), l);
        const goal = r && r.goal ? gp(r.goal, activeKeys(), k) : null;
        const o = D.createElement('div'); o.id = 'drDay'; o.className = 'dr-ov dr-day-ov'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'drDayH'); o.setAttribute('data-noi18n', ''); o.setAttribute('data-dr', 'dayx');
        const gt = goal ? goalText(goal.id, l) : null;
        const streakRow = goal ? '<div class="dr-day-goal">' + ICON.flame + '<span>' + esc(gt.what) + ' \u00b7 <b>' + goal.done + '/' + goal.n + '</b></span>' + chipProgressHTML(goal, true) + '</div>'
            : '<button type="button" class="dr-link" data-dr="daypick">' + esc(T('Set a weekly rhythm', 'Wochenrhythmus festlegen', 'Elegir un ritmo semanal')) + '</button>';
        o.innerHTML = '<div class="dr-card dr-day" data-dr="dayx"><div class="dr-day-herb" aria-hidden="true">' + herbSVG() + '</div>' +
            '<div class="dr-over">' + esc(T('Day', 'Tag', 'D\u00eda')) + '</div><div class="dr-day-n num">' + n + '</div>' +
            '<h3 id="drDayH">' + esc(weekdayName(now, l)) + '</h3><p class="dr-day-line">' + esc(weekdayLine(now, l)) + '</p>' +
            '<div class="dr-day-one">' + ICON.target + '<span><small>' + esc(T('One goal for today', 'Ein Ziel f\u00fcr heute', 'Un objetivo para hoy')) + '</small>' + esc(g.text) + '</span></div>' + streakRow +
            '<button type="button" class="dr-btn pri wide" data-dr="dayx">' + esc(T('Let\u2019s go', 'Los geht\u2019s', '\u00a1Vamos!')) + '</button></div>';
        D.body.appendChild(o); dayOpen = true; setSeen(k);
        if (!reduced()) o.classList.add('dr-in');
        try { o.querySelector('.dr-btn.pri').focus({ preventScroll: true }); } catch (e) {}
        return true;
    }
    function dayClose(keepSeen) { const o = $('#drDay'); if (o) o.remove(); dayOpen = false; if (!keepSeen) setSeen(''); }
    /* queue: show only when nothing else is up, two quiet checks in a row; give way if the orb bubble arrives */
    let quiet = 0;
    function tick() {
        if (D.visibilityState === 'hidden') return;
        const k = dayKey();
        if ($('#drDay')) { if ($('#g1Ob:not(.out)') || $('#lcUpd') || D.documentElement.classList.contains('gate-up') || D.documentElement.classList.contains('mf-on')) { dayClose(false); quiet = 0; } return; }
        if (!shouldShowDaily(seenDay(), k) || !S()) { quiet = 0; return; }
        /* Oct 17: not while Misty flies (autopilot or steering); it waits, unseen, until she is home */
        if (!$('#spHome') || busy() || D.documentElement.classList.contains('mf-on')) { quiet = 0; return; }
        quiet++;
        if (quiet >= 2) { quiet = 0; dayCard(); }
    }

    /* ===== 3. Consistency goal picker + chip on Today ===== */
    let pickSel = null, pickMode = null;
    const gp = (goal, keys, k) => progress(goal.id, keys, k, goal.since);
    function pickRender() {
        const o = $('#drPick'); if (!o) return;
        const l = lang(), r = ritual() || {}, k = dayKey(), keys = activeKeys(), cur = r.goal ? gp(r.goal, keys, k) : null;
        const sel = pickSel || (r.goal && r.goal.id) || null, newbie = dayCount(k) <= 7;
        const cg = r.goal && goalById(r.goal.id), mode = pickMode || (sel && goalById(sel) && goalById(sel).per === 'streak' ? 'streak' : cg && cg.per === 'streak' && !pickSel ? 'streak' : 'flex');
        const tabs = '<div class="dr-seg" role="tablist">' + [['flex', T('Flexible', 'Flexibel', 'Flexible')], ['streak', T('Streak', 'Serie', 'Racha')]].map(m => '<button type="button" role="tab" class="' + (mode === m[0] ? 'on' : '') + '" aria-selected="' + (mode === m[0]) + '" data-dr="mode" data-mode="' + m[0] + '">' + esc(m[1]) + '</button>').join('') + '</div>';
        const opts = GOALS.filter(g => (g.per === 'streak') === (mode === 'streak')).map(g => { const t = goalText(g.id, l);
            const badge = g.tone === 'rec' && newbie ? '<em class="dr-rec">' + esc(T('Suggested', 'Empfohlen', 'Sugerido')) + '</em>' : '';
            return '<button type="button" class="dr-opt' + (sel === g.id ? ' on' : '') + '" data-dr="pick" data-goal="' + g.id + '" aria-pressed="' + (sel === g.id) + '"><b class="num">' + g.n + '</b><span><strong>' + esc(t.label) + badge + '</strong><small>' + esc(t.what) + ' \u00b7 ' + esc(t.hint) + '</small></span></button>'; }).join('');
        const react = sel ? goalText(sel, l).react : T('Pick what feels easy. You can change it any time, and a missed day never wipes your progress.', 'Nimm, was sich leicht anf\u00fchlt. Du kannst es jederzeit \u00e4ndern, und ein verpasster Tag l\u00f6scht nie deinen Fortschritt.', 'Elige lo que te resulte f\u00e1cil. Puedes cambiarlo cuando quieras, y un d\u00eda perdido nunca borra tu progreso.');
        const now = cur ? '<div class="dr-now">' + ICON.flame + '<span>' + esc(goalText(cur.id, l).what) + ': <b>' + cur.done + '/' + cur.n + '</b></span>' + chipProgressHTML(cur, true) + '</div>' : '';
        const modeNote = mode === 'streak' ? T('Kind streak: a missed day pauses it, your days stay.', 'Faire Serie: Ein verpasster Tag pausiert nur, deine Tage bleiben.', 'Racha amable: un d\u00eda perdido solo pausa, tus d\u00edas se quedan.') : T('Any days you like. No streak to break.', 'Beliebige Tage. Keine Serie, die rei\u00dfen kann.', 'Los d\u00edas que quieras. Ninguna racha que romper.');
        o.querySelector('.dr-pick-body').innerHTML = now + tabs + '<p class="dr-mode-note">' + esc(modeNote) + '</p><div class="dr-opts" role="group">' + opts + '</div>' +
            '<div class="dr-react"><span class="dr-react-herb" aria-hidden="true">' + herbSVG() + '</span><p aria-live="polite"><b>' + esc(herbName()) + '</b>' + esc(react) + '</p></div>' +
            '<p class="dr-fine">' + esc(T('An active day is any day you log something: a meal, water, a scan or a walk.', 'Ein aktiver Tag ist jeder Tag, an dem du etwas eintr\u00e4gst: Essen, Wasser, einen Scan oder Bewegung.', 'Un d\u00eda activo es cualquier d\u00eda en que anotas algo: comida, agua, un escaneo o movimiento.')) + '</p>' +
            '<button type="button" class="dr-btn pri wide" data-dr="commit"' + (sel ? '' : ' disabled') + '>' + esc(r.goal && r.goal.id === sel ? T('Keep this goal', 'Ziel behalten', 'Mantener objetivo') : T('Deal', 'Abgemacht', 'Trato hecho')) + '</button>';
    }
    function pickOpen() {
        pickClose(); pickSel = null; pickMode = null;
        const o = D.createElement('div'); o.id = 'drPick'; o.className = 'dr-ov'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'drPickH'); o.setAttribute('data-noi18n', '');
        o.innerHTML = '<div class="dr-card dr-pick"><button type="button" class="dr-x" data-dr="pickclose" aria-label="' + esc(T('Close', 'Schlie\u00dfen', 'Cerrar')) + '">' + ICON.x + '</button>' +
            '<div class="dr-over">' + esc(T('Your rhythm', 'Dein Rhythmus', 'Tu ritmo')) + '</div><h3 id="drPickH">' + esc(T('How often do you want to show up?', 'Wie oft willst du dabei sein?', '\u00bfCon qu\u00e9 frecuencia quieres aparecer?')) + '</h3><div class="dr-pick-body"></div></div>';
        D.body.appendChild(o); pickRender();
        if (!reduced()) o.classList.add('dr-in');
    }
    function pickClose() { const o = $('#drPick'); if (o) o.remove(); }
    function commit() {
        const r = ritual(); if (!r || !pickSel) return;
        const prev = r.goal && r.goal.id;
        r.goal = { id: pickSel, at: Date.now(), since: dayKey() }; save();
        if (prev !== pickSel) toast(goalText(pickSel, lang()).react);
        pickClose(); chip(true); checkReached();
    }
    function checkReached() {
        const r = ritual(); if (!r || !r.goal) return;
        const k = dayKey(), pr = gp(r.goal, activeKeys(), k); if (!pr || !pr.reached) return;
        const ev = 'rhythm:' + pr.id + ':' + pr.from;
        if (r.won === ev) return;
        r.won = ev; save();
        try { if (W.LowiHost && LowiHost.award) LowiHost.award('rhythm-goal', null, { amt: 10 + pr.n * 2, label: T('Rhythm goal reached', 'Rhythmus-Ziel geschafft', 'Ritmo logrado'), eventId: ev }); } catch (e) {}
        setTimeout(() => toast(herbName() + ': ' + T('We did it! ' + pr.n + ' active days.', 'Geschafft! ' + pr.n + ' aktive Tage.', '\u00a1Lo logramos! ' + pr.n + ' d\u00edas activos.')), 900);
    }
    function chip(force) {
        const head = $('#spHome .sp-log > header'); if (!head) return;
        let c = head.querySelector('#drChip');
        const r = ritual(), l = lang();
        let html, label;
        if (r && r.goal && goalById(r.goal.id)) {
            const pr = gp(r.goal, activeKeys(), dayKey()), t = goalText(pr.id, l);
            html = ICON.flame + '<span class="num">' + pr.done + '/' + pr.n + '</span>';
            label = t.what + ': ' + pr.done + ' / ' + pr.n + (pr.reached ? ' \u2713' : '');
            if (c) c.classList.toggle('won', pr.reached);
        } else { html = ICON.flame + '<span>' + esc(T('Goal', 'Ziel', 'Meta')) + '</span>'; label = T('Set a weekly rhythm', 'Wochenrhythmus festlegen', 'Elegir un ritmo semanal'); }
        if (!c) { c = D.createElement('button'); c.type = 'button'; c.id = 'drChip'; c.className = 'dr-chip'; c.setAttribute('data-dr', 'chip'); c.setAttribute('data-noi18n', ''); const hb = head.querySelector('.sp-habits'); head.insertBefore(c, hb || null); force = true; }
        if (force || c.__h !== html) { c.innerHTML = html; c.__h = html; }
        if (c.getAttribute('aria-label') !== label) { c.setAttribute('aria-label', label); c.title = label; }
        if (r && r.goal) { const pr = gp(r.goal, activeKeys(), dayKey()); c.classList.toggle('won', !!(pr && pr.reached)); c.style.setProperty('--dr-p', pr ? Math.round(pr.done / pr.n * 100) + '%' : '0%'); }
        else { c.classList.remove('won'); c.style.setProperty('--dr-p', '0%'); }
    }

    /* ===== events ===== */
    D.addEventListener('click', ev => {
        const b = ev.target && ev.target.closest ? ev.target.closest('[data-dr]') : null;
        if (!b) { return; }
        const a = b.getAttribute('data-dr');
        if (a === 'a2next' && A2) { A2.i = Math.min(2, A2.i + 1); a2Render(); }
        else if (a === 'a2back' && A2) { A2.i = Math.max(0, A2.i - 1); a2Render(); }
        else if (a === 'a2later') a2Later();
        else if (a === 'a2close') a2Close();
        else if (a === 'a2done') { setTimeout(a2Close, 0); } /* signed in: hofjs handles data-hof="go" on the same tap (copies the sign-in, opens its sheet) */
        else if (a === 'daypick') { ev.stopPropagation(); dayClose(true); pickOpen(); }
        else if (a === 'dayx') dayClose(true);
        else if (a === 'chip') pickOpen();
        else if (a === 'mode') { pickMode = b.getAttribute('data-mode'); if (pickSel && ((goalById(pickSel).per === 'streak') !== (pickMode === 'streak'))) pickSel = null; pickRender(); }
        else if (a === 'pick') { pickSel = b.getAttribute('data-goal'); pickRender(); const n = $('#drPick [data-goal="' + pickSel + '"]'); if (n) try { n.focus({ preventScroll: true }); } catch (e) {} }
        else if (a === 'commit') commit();
        else if (a === 'pickclose') pickClose();
    });
    D.addEventListener('click', ev => { const t = ev.target; if (t && (t.id === 'drPick' || t.id === 'drA2')) { if (t.id === 'drPick') pickClose(); else a2Close(); } });
    D.addEventListener('keydown', ev => { if (ev.key !== 'Escape') return; if ($('#drPick')) pickClose(); else if ($('#drA2')) a2Close(); else if ($('#drDay')) dayClose(true); });

    function boot() {
        setInterval(() => { try { chip(false); } catch (e) {} }, 1500);
        setTimeout(() => { try { chip(true); } catch (e) {} }, 400);
        setTimeout(() => { tick(); setInterval(tick, 1200); }, 3500);
        ['lowi:reward', 'lowi:meal-logged', 'lowi:care'].forEach(n => { const f = () => setTimeout(() => { try { chip(true); checkReached(); } catch (e) {} }, 300); W.addEventListener(n, f); D.addEventListener(n, f); });
        if (standalone()) { const b = $('#lcA2hs'); if (b) b.remove(); }
    }
    W.LowiRitual = { core: Core, openA2: a2Open, closeA2: a2Close, a2State: () => (A2 ? { i: A2.i, kind: A2.kind, signed: A2.signed } : null), openDay: dayCard, closeDay: dayClose, openPicker: pickOpen, closePicker: pickClose, chip, busy, activeKeys,
        progress: () => { const r = ritual(); return r && r.goal ? gp(r.goal, activeKeys(), dayKey()) : null; }, tick };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : null);
