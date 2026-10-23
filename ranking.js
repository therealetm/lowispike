/* ranking.js (23 Oct 2026): the Community Ranking tab, a companion leaderboard. Layout from the reference E-man sent (Spazier Club
   "Rangliste"): a period switch, a highlighted Your place card, a podium of the top 3 (2nd left, 1st centre and raised, 3rd
   right), then a numbered list. In LOWiSPIKE's own look (brand blues and cyan on glass) and with companions instead of people:
   each entry shows the owner's companion in its evolution form and the owner's name small under it.
   23 Oct 2026, 15:00 (Eman: "too much text ... it should be very easy to understand. Use more symbols and animations, a gaming
   type of ranking ... only if I click on someone do I see the comparison of the stats"): no title, question or explainer
   sentences on the board any more. Symbols say it: a sun or XP chip for what counts, an hourglass for the days left, an ⓘ that
   opens the short rules, ▲▼ for places won or lost since your last day here. Game animations: the podium rises, rows slide in,
   switching Week / Month / All time sorts every companion into its new place and counts the numbers up, your own entry glows.
   Tapping a companion opens a compact versus view (mirrored bars, one "what it takes" line); your own entry opens the levels.
   Rules (periods, scores, privacy) live in ranking-core.js. community-rooms-ui.js shows this page when the Ranking tab is open
   (LowiRanking.render(box)); the Community top bar above it is the same shared bar as on every other tab. */
(function () {
    'use strict';
    const W = window, D = document, K = W.LowiRankingCore;
    if (!K) return;
    const T = {
        title: ['Ranking', 'Rangliste', 'Clasificación'],
        w: ['Week', 'Woche', 'Semana'], m: ['Month', 'Monat', 'Mes'], all: ['All time', 'Gesamt', 'Total'],
        periods: ['Period', 'Zeitraum', 'Periodo'],
        yourPlace: ['Your place', 'Dein Platz', 'Tu puesto'],
        notYet: ['Not ranked yet', 'Noch nicht dabei', 'Aún sin puesto'],
        notYetW: ['Log anything for ☀', 'Trag etwas ein für ☀', 'Registra algo para ☀'],
        notYetA: ['Log anything for XP', 'Trag etwas ein für XP', 'Registra algo para XP'],
        you: ['you', 'du', 'tú'],
        hidden: ['Hidden companion', 'Versteckter Begleiter', 'Compañero oculto'],
        hiddenMe: ['Only you see it', 'Nur du siehst ihn', 'Solo tú lo ves'],
        lv: ['Lv {n}', 'Lv {n}', 'Nv {n}'],
        sun: ['sunbeams', 'Sonnenstrahlen', 'rayos de sol'], xp: ['XP', 'XP', 'XP'],
        place: ['Place {n}', 'Platz {n}', 'Puesto {n}'],
        up: ['up {n}', '{n} hoch', 'sube {n}'], down: ['down {n}', '{n} runter', 'baja {n}'],
        empty: ['No one here yet. Be the first.', 'Noch niemand da. Sei der Erste.', 'Aún no hay nadie. Sé el primero.'],
        open: ['Open {name}', '{name} öffnen', 'Abrir {name}'],
        levels: ['Levels', 'Level', 'Niveles'],
        left1: ['Last day', 'Letzter Tag', 'Último día'],
        leftN: ['{n} days left', 'Noch {n} Tage', 'Quedan {n} días'],
        forever: ['Forever', 'Für immer', 'Para siempre'],
        ladT: ['Levels', 'Level', 'Niveles'],
        ladLv: ['Level {n}', 'Level {n}', 'Nivel {n}'],
        ladNext: ['{x} XP to level {n}', 'Noch {x} XP bis Level {n}', '{x} XP para el nivel {n}'],
        ladMax: ['Top level reached', 'Höchstes Level erreicht', 'Nivel máximo alcanzado'],
        ladPct: ['{p}% of players', '{p}% der Spieler', '{p}% de los jugadores'],
        ladFew: ['under 1% of players', 'unter 1% der Spieler', 'menos del 1% de los jugadores'],
        ladEvo: ['Evolution', 'Entwicklung', 'Evolución'],
        ladYou: ['You are here', 'Du bist hier', 'Estás aquí'],
        ladLock: ['Locked', 'Gesperrt', 'Bloqueado'],
        ladFoot: ['Out of {n} players, real accounts only. Each person counts once.', 'Von {n} Spielern, nur echte Konten. Jede Person zählt einmal.', 'De {n} jugadores, solo cuentas reales. Cada persona cuenta una vez.'],
        close: ['Close', 'Schließen', 'Cerrar'],
        /* the rules, behind the ⓘ: one short line each */
        info: ['How it works', 'So funktioniert es', 'Cómo funciona'],
        iW: ['Sunbeams since Monday, {d}', 'Sonnenstrahlen seit Montag, {d}', 'Rayos de sol desde el lunes {d}'],
        iM: ['Sunbeams since {d}', 'Sonnenstrahlen seit dem {d}', 'Rayos de sol desde el {d}'],
        iA: ['All XP ever earned', 'Alle XP, die je gesammelt wurden', 'Toda la XP ganada'],
        iWs: ['Up to 12 a day · new board on Monday', 'Bis zu 12 am Tag · neu ab Montag', 'Hasta 12 al día · nueva el lunes'],
        iMs: ['Up to 12 a day · new board on the 1st', 'Bis zu 12 am Tag · neu ab dem 1.', 'Hasta 12 al día · nueva el día 1'],
        iAs: ['Never resets', 'Beginnt nie neu', 'Nunca se reinicia'],
        iMove: ['Places won or lost since your last day here', 'Plätze gewonnen oder verloren seit deinem letzten Tag hier', 'Puestos ganados o perdidos desde tu último día aquí'],
        iTie: ['Same score: more full-sun days wins, then level', 'Gleichstand: mehr volle Sonnentage gewinnen, dann das Level', 'Empate: gana quien tenga más días de sol lleno, luego el nivel'],
        iHid: ['Hidden orb: the owner keeps the companion private', 'Verdeckte Kugel: der Besitzer zeigt den Begleiter nicht', 'Esfera oculta: su dueño mantiene al compañero en privado'],
        iTap: ['Tap a companion to compare', 'Tipp auf einen Begleiter zum Vergleichen', 'Toca un compañero para comparar'],
        iDiff: ['A strong week wins Week, a long history wins All time', 'Eine starke Woche gewinnt die Woche, eine lange Geschichte Gesamt', 'Una gran semana gana Semana, una larga historia gana Total'],
        /* the versus view: a companion tapped */
        vsT: ['You vs {n}', 'Du vs. {n}', 'Tú vs. {n}'],
        vs: ['VS', 'VS', 'VS'],
        profile: ['Profile', 'Profil', 'Perfil'],
        profileL: ['Open {n}\'s profile', 'Profil von {n} öffnen', 'Abrir el perfil de {n}'],
        fullDays: ['Full-sun days', 'Volle Sonnentage', 'Días de sol lleno'],
        lvRow: ['Level', 'Level', 'Nivel'],
        goal: ['What it takes', 'Was es braucht', 'Lo que hace falta'],
        totals: ['{n} shares totals only', '{n} teilt nur die Summen', '{n} solo comparte totales'],
        s_meal: ['Meals', 'Mahlzeiten', 'Comidas'], s_scan: ['Scans', 'Scans', 'Escaneos'], s_move: ['Moves', 'Moves', 'Moves'], s_fast: ['Fasting', 'Fasten', 'Ayuno'],
        s_macro: ['Macro goals', 'Makroziele', 'Metas de macros'], s_water: ['Water', 'Wasser', 'Agua'], s_other: ['Other', 'Sonstiges', 'Otros'],
        /* what it takes, one short line (K.gap does the math) */
        gPass: ['+{x} ☀ by {d}', '+{x} ☀ bis {d}', '+{x} ☀ para el {d}'],
        gToday: ['{acts} today does it', 'Heute reicht {acts}', 'Hoy basta {acts}'],
        gDay1: ['≈ 1 day', '≈ 1 Tag', '≈ 1 día'], gDays: ['≈ {n} days', '≈ {n} Tage', '≈ {n} días'],
        gNo: ['Out of reach until {d}', 'Bis {d} nicht mehr drin', 'Fuera de alcance hasta el {d}'],
        gLead: ['Ahead by {x} ☀', '{x} ☀ vorne', '{x} ☀ por delante'],
        gCatch: ['{n} needs +{y} by {d}', '{n} braucht +{y} bis {d}', '{n} necesita +{y} para el {d}'],
        gSafe: ['safe until {d}', 'sicher bis {d}', 'a salvo hasta el {d}'],
        gPassA: ['+{x} XP', '+{x} XP', '+{x} XP'],
        gLeadA: ['Ahead by {x} XP', '{x} XP vorne', '{x} XP por delante'],
        gTie: ['Tie · you win on {why}', 'Gleichstand · du gewinnst durch {why}', 'Empate · ganas por {why}'],
        tb_full: ['full-sun days', 'volle Sonnentage', 'días de sol lleno'],
        tb_lv: ['level', 'das Level', 'nivel'],
        tb_name: ['name', 'den Namen', 'nombre'],
        gIn: ['+1 ☀ by {d} puts you on', '+1 ☀ bis {d} bringt dich rein', '+1 ☀ para el {d} te mete'],
        gInA: ['Any XP puts you on', 'Jede XP bringt dich rein', 'Cualquier XP te mete'],
        gAlone: ['Only you so far', 'Bisher nur du', 'Por ahora solo tú'],
        a_move: ['a Move', 'ein Move', 'un Move'], a_meal: ['a meal', 'eine Mahlzeit', 'una comida'], a_scan: ['a scan', 'ein Scan', 'un escaneo'],
        a_water: ['a glass of water', 'ein Glas Wasser', 'un vaso de agua'], a_fast: ['a fasting milestone', 'ein Fasten-Meilenstein', 'un hito de ayuno'], a_macro: ['a macro goal', 'ein Makroziel', 'una meta de macros'],
        n_move: ['{n} Moves', '{n} Moves', '{n} Moves'], n_meal: ['{n} meals', '{n} Mahlzeiten', '{n} comidas'], n_scan: ['{n} scans', '{n} Scans', '{n} escaneos'],
        n_water: ['{n} glasses of water', '{n} Gläser Wasser', '{n} vasos de agua'], n_fast: ['{n} fasting milestones', '{n} Fasten-Meilensteine', '{n} hitos de ayuno'], n_macro: ['{n} macro goals', '{n} Makroziele', '{n} metas de macros']
    };
    function lang() { try { return Math.max(0, ['en', 'de', 'es'].indexOf((W.LowiLang && W.LowiLang.get()) || localStorage.getItem('lowispike.lang') || 'en')); } catch (e) { return 0; } }
    /* a short date that ends in a dot ("19. Okt.") followed by the sentence's own dot gave "19. Okt.." in German: one dot */
    function tr(k, v) { let s = (T[k] || [k])[lang()] || T[k][0]; for (const x in v || {}) s = s.split('{' + x + '}').join(String(v[x])); return v ? s.replace(/(^|[^.])\.\.(?!\.)/g, '$1.') : s; }
    /* BH-006 name chain (same helper as companion.js / misty-hub.js): own companion > a typed name > Misty */
    function companionName() { const pick = v => { v = v == null ? '' : String(v).trim(); return v ? v.slice(0, 24) : ''; }; let auto = ''; try { auto = pick(W.LowiHerbIdentity && W.LowiHerbIdentity.autoName && W.LowiHerbIdentity.autoName()); } catch (e) { } const typed = v => { v = pick(v); return v && v !== auto ? v : ''; }; let n = ''; try { const B = W.LowiBirthCompanion; if (B && B.has && B.has()) { const c = B.get(); n = pick(c && c.name); } } catch (e) { } if (!n) try { const t = W.LowiHerbTamagotchi, p = t && t.readPrefs && t.readPrefs(); n = typed(p && p.name); } catch (e) { } if (!n) try { const R = W.LowiR2, s = R && R.S && R.S(); n = typed(s && s.herb && s.herb.name); } catch (e) { } return n || 'Misty'; }
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const KEY = 'lowispike.ranking.period';
    let per = (function () { try { return K.period(localStorage.getItem(KEY) || 'w'); } catch (e) { return 'w'; } })();
    let box = null, looks = {}, fetchedAt = 0, fetching = false;
    const CC = () => W.LowiCompanionCore, LC = () => W.LowiCompanion, R3 = () => W.LowiR3;
    function people() { try { const r = R3(); return (r && r.everyone) ? r.everyone() : []; } catch (e) { return []; } }
    function myCare() { try { const r = R3(), m = r && r.me && r.me(); return m && m.care; } catch (e) { return null; } }
    function allLooks() { let f = {}; try { f = (LC() && LC().friendLooks && LC().friendLooks()) || {}; } catch (e) { } return Object.assign({}, f, looks); }
    async function fetchLooks(uids) {
        uids = uids.filter(u => u && !/^bot:/.test(u));
        if (fetching || !uids.length || Date.now() - fetchedAt < 120000) return;
        const X = W.LOWI_CLOUD_X; if (!X || !X.client) return;
        try { const st = X.state(); if (!st || !st.live) return; } catch (e) { return; }
        fetching = true;
        try {
            const sb = await X.client();
            const r = await sb.from('profiles').select('id,look').in('id', uids.slice(0, 60));
            if (!r.error && Array.isArray(r.data)) {
                const next = {}, C = CC();
                r.data.forEach(row => { if (row && row.look && (!C || C.decode(row.look))) next[row.id] = row.look; });
                looks = next; fetchedAt = Date.now();
                await fetchMixes(sb, uids);
                if (box && box.isConnected) render(box);
                if (cmpEl) drawCmp();
            }
        } catch (e) { } finally { fetching = false; }
    }
    /* the companion of one entry: genome + title, or null when it is hidden */
    function companion(p, lv) {
        const C = CC(); if (!C) return null;
        const L = lang();
        if (p.me) {
            let g = null, name = '';
            try { g = LC() && LC().genome ? LC().genome() : null; } catch (e) { }
            /* Bug hunt Oct 23: your own row shows the name Misty's card shows (BH-006 chain: own companion > a typed name > Misty),
               never the old herb auto name ("Sunny Leaf" for a Leo) */
            try { const B = W.LowiBirthCompanion; if (B && B.displayName) name = B.displayName(); } catch (e) { }
            if (!name) name = companionName();
            return { g, name: name || 'Misty', form: g ? C.formName(g.st, g.el, L) : '', named: true, me: true };
        }
        const code = K.lookFor(p, allLooks()), g = code ? C.decode(code) : null;
        if (!g) return null;
        /* 23 Oct 2026 (Eman: "show their name, the names they chose for their companions. And beneath that, the ranks."): the
           chosen name when the owner's app has shared it, else the evolution form as before */
        const form = C.formName(g.st, g.el, L);
        return g.nm ? { g, name: g.nm, form, named: true } : { g, name: form, form: '', named: false };
    }
    function art(c, key, big) {
        if (!c || !c.g) return '<span class="rk-orb rk-hid" aria-hidden="true"><i></i></span>';
        let s = '';
        try { s = big && LC() && LC().friendSVG ? LC().friendSVG(c.g, key) : CC().miniSVG(c.g, key); } catch (e) { s = ''; }
        if (!s) { try { s = CC().miniSVG(c.g, key); } catch (e) { } }
        return '<span class="rk-orb" aria-hidden="true">' + s + '</span>';
    }
    function score(x) { return K.fmt(x.pts, lang()); }
    function unitLong() { return per === 'all' ? tr('xp') : tr('sun'); }
    /* the app's own icons (lowi-icons.js), labelled when they carry meaning; without them (offline tests) a plain character */
    function ico(name, label, cls, fb) {
        const I = W.LowiIcons;
        if (I && typeof I.svg === 'function') { try { const s = I.svg(name, { label: label || '', cls: cls || '' }); if (s) return s; } catch (e) { } }
        return '<i class="rk-fb ' + (cls || '') + '"' + (label ? ' role="img" aria-label="' + esc(label) + '"' : ' aria-hidden="true"') + '>' + (fb || '') + '</i>';
    }
    /* what a number counts: a golden sun (Week, Month) or a small XP tag (All time) */
    function uIco(k) { return k === 'all' ? '<i class="rk-xp" role="img" aria-label="XP">XP</i>' : ico('sun', tr('sun'), 'rk-sun', '\u2600'); }
    function pIco(k) { return k === 'all' ? ico('star', '', 'rk-star', '\u2605') : k === 'm' ? ico('calendar', '', 'rk-cal', '\u25a6') : ico('sun', '', 'rk-sun', '\u2600'); }
    /* under the companion's name: a small level chip and the owner (the evolution form is in the versus view and the levels) */
    function ownerLine(p, lv, c) {
        return '<small class="rk-own"><span class="rk-lv num">' + esc(tr('lv', { n: lv })) + '</span><span class="rk-ownr">' + esc(p.me ? tr('you') : (p.n || '')) + '</span></small>';
    }
    /* ▲▼: places won or lost since your last day on this board (kept on this phone, per board and period) */
    const MV = 'lowispike.ranking.moves';
    const idOf = p => p && p.me ? 'me' : p && p.uid ? 'u:' + p.uid : 'n:' + String((p && p.n) || '').toLowerCase();
    function dayKey(t) { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
    function moves(k, list, now) {
        const sp = K.span(k, now), pk = k + ':' + (sp ? +sp.start : 'all'), today = dayKey(now);
        let all = {}; try { all = JSON.parse(localStorage.getItem(MV) || '{}') || {}; } catch (e) { all = {}; }
        let s = all[k]; if (!s || s.pk !== pk || typeof s.cur !== 'object') s = { pk, day: today, cur: {}, prev: null };
        if (s.day !== today) { s.prev = s.cur; s.day = today; }
        const cur = {}; list.forEach(x => { cur[idOf(x.p)] = x.rank; });
        s.cur = cur; all[k] = s;
        try { localStorage.setItem(MV, JSON.stringify(all)); } catch (e) { }
        const out = {}; if (s.prev) list.forEach(x => { const was = +s.prev[idOf(x.p)]; if (was && was !== x.rank) out[idOf(x.p)] = was - x.rank; });
        return out;
    }
    function mvHTML(d) { return d > 0 ? '<span class="rk-mv up" aria-hidden="true">\u25b2' + d + '</span>' : d < 0 ? '<span class="rk-mv dn" aria-hidden="true">\u25bc' + (-d) + '</span>' : ''; }
    function attrs(x, c, d) {
        const p = x.p, nm = c ? c.name : tr('hidden');
        return ' data-rk="open" data-key="' + esc(idOf(p)) + '" data-who="' + esc(p.n || '') + '"' + (p.uid ? ' data-uid="' + esc(p.uid) + '"' : '') + (p.me ? ' data-me="1"' : '') +
            ' aria-label="' + esc(tr('place', { n: x.rank }) + ', ' + nm + (c && c.named && c.form ? ', ' + c.form : '') + ', ' + tr('lv', { n: x.lv }) + ', ' + (p.me ? tr('you') : p.n) + ', ' + score(x) + ' ' + unitLong() + (d ? ', ' + tr(d > 0 ? 'up' : 'down', { n: Math.abs(d) }) : '')) + '"';
    }
    function ptsHTML(x) { return '<span class="rk-pts"><b class="num" data-v="' + x.pts + '">' + score(x) + '</b>' + uIco(per) + '</span>'; }
    function podHTML(x, slot, mv) {
        const c = companion(x.p, x.lv), d = mv[idOf(x.p)];
        return '<button type="button" class="rk-pod-i rk-p' + x.rank + (x.p.me ? ' me' : '') + '"' + attrs(x, c, d) + '>' +
            (x.rank === 1 ? '<span class="rk-crown" aria-hidden="true">' + ico('crown', '', 'rk-crown-i', '\u265b') + '</span>' : '') +
            '<span class="rk-pod-art">' + art(c, 'rkp' + slot, true) + mvHTML(d) + '</span>' +
            '<b class="rk-cn">' + esc(c ? c.name : tr('hidden')) + '</b>' + ownerLine(x.p, x.lv, c) + ptsHTML(x) +
            '<span class="rk-step" aria-hidden="true"><b class="rk-medal m' + x.rank + '">' + x.rank + '</b></span></button>';
    }
    function rowHTML(x, i, mv) {
        const c = companion(x.p, x.lv), d = mv[idOf(x.p)];
        return '<li><button type="button" class="rk-row' + (x.p.me ? ' me' : '') + '"' + attrs(x, c, d) + '><span class="rk-n"><b class="num">' + x.rank + '</b>' + mvHTML(d) + '</span>' + art(c, 'rkl' + i, false) +
            '<span class="rk-who"><b class="rk-cn">' + esc(c ? c.name : tr('hidden')) + '</b>' + ownerLine(x.p, x.lv, c) + '</span>' + ptsHTML(x) + '</button></li>';
    }
    /* your level and how far to the next one, for the ring around the level number */
    function myLevel() {
        try { const d = K.ladder(people()), lo = d.my > 1 ? d.steps[d.my - 1].xp : 0; return { lv: d.my, prog: d.next == null ? 1 : Math.max(0, Math.min(1, (d.xp - lo) / Math.max(1, d.next - lo))) }; } catch (e) { return null; }
    }
    function meHTML(list, mv) {
        const x = K.mine(list), self = people().find(p => p && p.me) || { me: true, n: '' }, L = myLevel(), lv = x ? x.lv : (L ? L.lv : K.level(self)), c = companion(self, lv), d = x ? mv.me : 0;
        const ring = '<span class="rk-lvr" style="--p:' + (L ? L.prog : 0).toFixed(3) + '" aria-hidden="true"><b class="num">' + lv + '</b></span>';
        const sub = !x ? '<small class="rk-own"><span class="rk-ownr">' + sunHTML(esc(per === 'all' ? tr('notYetA') : tr('notYetW'))) + '</span></small>' :
            '<small class="rk-own"><span class="rk-lv num">' + esc(tr('lv', { n: lv })) + '</span>' + (shared() ? '' : '<span class="rk-ownr">' + ico('eye', '', 'rk-eye', '') + esc(tr('hiddenMe')) + '</span>') + '</small>';
        return '<button type="button" class="rk-me' + (x ? '' : ' off') + '" data-rk="ladder" data-me="1" data-key="_me" aria-haspopup="dialog" aria-label="' + esc(tr('yourPlace') + ', ' + (x ? '#' + x.rank + ', ' + score(x) + ' ' + unitLong() : tr('notYet')) + ', ' + (c ? c.name : 'Misty') + ', ' + tr('lv', { n: lv }) + (d ? ', ' + tr(d > 0 ? 'up' : 'down', { n: Math.abs(d) }) : '') + ', ' + tr('levels')) + '" data-who="' + esc(self.n || '') + '">' +
            '<span class="rk-me-rk"><b class="num">' + (x ? '#' + x.rank : '\u2013') + '</b>' + mvHTML(d) + '</span>' +
            '<span class="rk-me-art">' + art(c, 'rkme', false) + ring + '</span>' +
            '<span class="rk-who"><b class="rk-cn">' + esc(c ? c.name : 'Misty') + '</b>' + sub + '</span>' +
            (x ? ptsHTML(x) : '') + '<span class="rk-me-go" aria-hidden="true">' + ico('chevron', '', 'rk-chev', '\u203a') + '</span></button>';
    }
    function html() {
        const now = Date.now(), list = K.rows(people(), per, now, myCare()), top = list.slice(0, 3), rest = K.board(list).slice(3), mv = moves(per, list, now), sp = K.span(per, now);
        const left = sp ? sp.left + 1 : 0;
        let h = '<div class="rk-top"><div class="rk-seg" role="tablist" aria-label="' + esc(tr('title') + ', ' + tr('periods')) + '" style="--rk-i:' + K.PERIODS.indexOf(per) + '">' +
            K.PERIODS.map(k => '<button type="button" role="tab" class="rk-segb" data-rk="per" data-k="' + k + '" aria-selected="' + (k === per) + '" tabindex="' + (k === per ? 0 : -1) + '">' + esc(tr(k)) + '</button>').join('') + '</div>' +
            '<button type="button" class="rk-info" data-rk="info" aria-haspopup="dialog" aria-label="' + esc(tr('info')) + '">' + ico('info', '', 'rk-info-i', 'i') + '</button></div>' +
            '<div class="rk-chips"><span class="rk-chip">' + pIco(per) + '<span>' + esc(per === 'all' ? tr('xp') : tr('sun')) + '</span></span>' +
            '<span class="rk-chip">' + (sp ? ico('hourglass', '', 'rk-hg', '\u231b') : '<b class="rk-inf8" aria-hidden="true">\u221e</b>') + '<span>' + esc(sp ? (left <= 1 ? tr('left1') : tr('leftN', { n: left })) : tr('forever')) + '</span></span></div>' +
            meHTML(list, mv);
        if (!list.length) h += '<p class="rk-empty">' + ico('trophy', '', 'rk-empty-i', '') + '<span>' + esc(tr('empty')) + '</span></p>';
        else {
            h += '<div class="rk-pod n' + top.length + '">' + K.podium(list).map((x, i) => podHTML(x, i, mv)).join('') + '</div>';
            if (rest.length) h += '<ol class="rk-list">' + rest.map((x, i) => rowHTML(x, i, mv)).join('') + '</ol>';
        }
        return { h, uids: list.map(x => x.p && x.p.uid).filter(Boolean) };
    }
    function wire(b) {
        if (b.__rk) return; b.__rk = 1;
        b.addEventListener('click', e => {
            const t = e.target.closest('[data-rk]'); if (!t || !b.contains(t)) return;
            if (t.dataset.rk === 'per') { per = K.period(t.dataset.k); try { localStorage.setItem(KEY, per); } catch (er) { } render(b); const n = b.querySelector('.rk-segb[aria-selected="true"]'); if (n) n.focus({ preventScroll: true }); return; }
            if (t.dataset.rk === 'info') { openInfo(t); return; }
            if (t.dataset.rk === 'ladder') { openLadder(t); return; }
            /* 23 Oct, 15:00 (Eman: "only if I click on someone do I see the comparison of the stats"): a companion opens You vs them,
               your own entry opens your levels */
            if (t.dataset.rk === 'open') { if (t.dataset.me === '1') openLadder(t); else openCmp({ uid: t.dataset.uid || '', n: t.dataset.who || '' }, t); }
        });
        b.addEventListener('keydown', e => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const s = e.target.closest('.rk-segb'); if (!s) return;
            const i = K.PERIODS.indexOf(per), n = K.PERIODS[(i + (e.key === 'ArrowRight' ? 1 : K.PERIODS.length - 1)) % K.PERIODS.length];
            e.preventDefault(); const nb = b.querySelector('.rk-segb[data-k="' + n + '"]'); if (nb) nb.click();
        });
    }
    let ladEl = null, ladBack = null;
    function stepName(st) { const n = st.n; return Array.isArray(n) ? (n[lang()] || n[0]) : ''; }
    function ladderHTML() {
        const d = K.ladder(people()), self = people().find(p => p && p.me) || { me: true, n: '' }, c = companion(self, d.my);
        const next = d.next == null ? '<p class="rk-lad-next">' + esc(tr('ladMax')) + '</p>' :
            '<p class="rk-lad-next">' + esc(tr('ladNext', { x: K.fmt(d.toNext, lang()), n: d.my + 1 })) + '</p>';
        const lo = d.my > 1 ? d.steps[d.my - 1].xp : 0, prog = d.next == null ? 1 : Math.max(0, Math.min(1, (d.xp - lo) / Math.max(1, d.next - lo)));
        let h = '<div class="rk-lad-h">' + art(c, 'rklad', true) +
            '<div class="rk-lad-hw"><b class="rk-lad-cn">' + esc(c ? c.name : 'Misty') + '</b><span class="rk-lad-lv">' + esc(tr('ladLv', { n: d.my })) + (c && c.form ? ' \u00b7 ' + esc(c.form) : '') + '</span>' + next +
            '<span class="rk-lad-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(prog * 100) + '"><i style="width:' + (prog * 100).toFixed(1) + '%"></i></span></div>' +
            '<button type="button" class="rk-lad-x" data-lad="close" aria-label="' + esc(tr('close')) + '">\u00d7</button></div>';
        h += '<ol class="rk-lad-l">' + d.steps.map(st => {
            const pct = st.some && st.pct < 1 ? tr('ladFew') : tr('ladPct', { p: st.pct });
            const cls = 'rk-lad-i' + (st.reached ? ' on' : ' off') + (st.now ? ' now' : '') + (st.evo ? ' evo' : '');
            return '<li class="' + cls + '"' + (st.now ? ' aria-current="step"' : '') + '><span class="rk-lad-b" aria-hidden="true"><b class="num">' + st.lv + '</b>' + (st.reached ? '' : '<i class="rk-lock"></i>') + '</span>' +
                '<span class="rk-lad-w"><b>' + esc(tr('ladLv', { n: st.lv })) + (stepName(st) ? '<span class="rk-sep"> \u00b7 </span>' + esc(stepName(st)) : '') + (st.evo ? ' <em class="rk-lad-evo">' + esc(tr('ladEvo')) + '</em>' : '') + '</b>' +
                '<small>' + esc(pct) + (st.now ? '<span class="rk-sep"> \u00b7 </span>' + esc(tr('ladYou')) : st.reached ? '' : '<span class="rk-sep"> \u00b7 </span>' + esc(tr('ladLock'))) + '</small></span></li>';
        }).join('') + '</ol>';
        h += '<p class="rk-lad-foot">' + esc(tr('ladFoot', { n: d.total })) + '</p>';
        return h;
    }
    function closeLadder() {
        if (!ladEl) return;
        const el = ladEl, back = ladBack; ladEl = null; ladBack = null;
        el.classList.remove('in'); D.removeEventListener('keydown', ladKey, true);
        setTimeout(() => { try { el.remove(); } catch (e) { } }, 220);
        try { if (back && back.focus) back.focus({ preventScroll: true }); } catch (e) { }
    }
    function ladKey(e) { if (e.key === 'Escape') { e.preventDefault(); closeLadder(); } }
    function openLadder(from) {
        if (ladEl) closeLadder();
        const el = D.createElement('div');
        el.className = 'rk-lad-wrap'; el.setAttribute('data-noi18n', '');
        el.innerHTML = '<div class="rk-lad" role="dialog" aria-modal="true" aria-label="' + esc(tr('ladT')) + '">' + ladderHTML() + '</div>';
        el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-lad="close"]')) closeLadder(); });
        D.body.appendChild(el); ladEl = el; ladBack = from || null;
        D.addEventListener('keydown', ladKey, true);
        requestAnimationFrame(() => { el.classList.add('in'); const now = el.querySelector('.rk-lad-i.now'); try { if (now) now.scrollIntoView({ block: 'center' }); } catch (e) { } const x = el.querySelector('.rk-lad-x'); if (x) x.focus({ preventScroll: true }); });
    }
    /* ---------- 23 Oct 2026 (Eman: "it has to be clear WHY ... a top 3 stats comparison, so the All time #1 can also look at
       Weekly and see exactly what he would have to do, and in what time frame, to beat the other person") ---------- */
    const LOC = ['en-US', 'de-DE', 'es-ES'];
    function dShort(d) { try { return d.toLocaleDateString(LOC[lang()], { day: 'numeric', month: 'short' }); } catch (e) { return d.getDate() + '.' + (d.getMonth() + 1) + '.'; } }
    function dDay(d) { try { return d.toLocaleDateString(LOC[lang()], { weekday: 'long', day: 'numeric', month: 'short' }); } catch (e) { return dShort(d); } }
    function listOf(a) { try { return new Intl.ListFormat(LOC[lang()], { style: 'long', type: 'conjunction' }).format(a); } catch (e) { return a.join(', '); } }
    const fmt = n => K.fmt(n, lang());
    function ledger() { try { const S = W.LowiR2 && W.LowiR2.S && W.LowiR2.S(); return S && Array.isArray(S.ledger) ? S.ledger : []; } catch (e) { return []; } }
    const mixMemo = {};
    function myMix(k) {
        const L = ledger(), last = L.length ? ((L[L.length - 1] || {}).ts || 0) : 0, key = L.length + '|' + last + '|' + new Date().toDateString();
        if (mixMemo[k] && mixMemo[k].key === key) return mixMemo[k].v;
        let v = null; try { v = K.mix(L, k, Date.now(), W.LowiSun); } catch (e) { v = null; }
        mixMemo[k] = { key, v }; return v;
    }
    function shared() { try { const pr = LC() && LC().prefs && LC().prefs(); return !(pr && pr.share === false); } catch (e) { return true; } }
    /* the breakdown other phones share (optional care_mix column); until the column exists every read and write stops quietly */
    let mixes = {}, mixCol = (function () { try { return sessionStorage.getItem('lowispike.rk.mixcol') || ''; } catch (e) { return ''; } })(), mixSent = '', mixBusy = false;
    const noCol = er => /42703|PGRST204|care_mix/.test(String((er && ((er.code || '') + ' ' + (er.message || ''))) || ''));
    function colMissing() { mixCol = 'no'; try { sessionStorage.setItem('lowispike.rk.mixcol', 'no'); } catch (e) { } }
    async function fetchMixes(sb, uids) {
        if (mixCol === 'no' || !uids.length) return;
        try {
            const r = await sb.from('profiles').select('id,care_mix').in('id', uids.slice(0, 60));
            if (r.error) { if (noCol(r.error)) colMissing(); return; }
            const next = {}; (r.data || []).forEach(row => { if (row && typeof row.care_mix === 'string') next[row.id] = row.care_mix; }); mixes = next;
        } catch (e) { }
    }
    async function pushMix() {
        if (mixCol === 'no' || mixBusy || (D.hidden)) return;
        const X = W.LOWI_CLOUD_X; if (!X || !X.client) return;
        let st = null; try { st = X.state(); } catch (e) { return; } if (!st || !st.live || !st.uid) return;
        const w = myMix('w'), m = myMix('m'); if (!w || !m || !w.key) return;
        const v = shared() ? K.mixTag(w, m) : null, key = st.uid + '|' + v;
        if (key === mixSent) return;
        mixBusy = true;
        try { const sb = await X.client(); const r = await sb.from('profiles').update({ care_mix: v }).eq('id', st.uid); if (r.error) { if (noCol(r.error)) colMissing(); } else mixSent = key; } catch (e) { } finally { mixBusy = false; }
    }
    if (typeof setTimeout === 'function' && typeof setInterval === 'function') { setTimeout(pushMix, 9000); setInterval(pushMix, 90000); }

    /* ---------- the rules, behind the ⓘ (23 Oct, 15:00: off the board, one short line each) ---------- */
    let infEl = null, infBack = null;
    function infoHTML() {
        const now = Date.now(), ws = K.span('w', now), ms = K.span('m', now);
        const row = (icon, a, b, cur) => '<li' + (cur ? ' class="cur"' : '') + '><span class="rk-inf-i" aria-hidden="true">' + icon + '</span><span class="rk-inf-w"><b>' + esc(a) + '</b>' + (b ? '<small>' + esc(b) + '</small>' : '') + '</span></li>';
        return '<div class="rk-lad-h rk-inf-h"><span class="rk-inf-hi" aria-hidden="true">' + ico('info', '', '', 'i') + '</span><h3 class="rk-cmp-t">' + esc(tr('info')) + '</h3>' +
            '<button type="button" class="rk-lad-x" data-inf="close" aria-label="' + esc(tr('close')) + '">\u00d7</button></div><ul class="rk-inf">' +
            row(pIco('w'), tr('w') + ' \u00b7 ' + (ws ? tr('iW', { d: dShort(ws.start) }) : ''), tr('iWs'), per === 'w') +
            row(pIco('m'), tr('m') + ' \u00b7 ' + (ms ? tr('iM', { d: dShort(ms.start) }) : ''), tr('iMs'), per === 'm') +
            row(pIco('all'), tr('all') + ' \u00b7 ' + tr('iA'), tr('iAs'), per === 'all') +
            row('<span class="rk-mv up">\u25b2</span><span class="rk-mv dn">\u25bc</span>', tr('iMove'), '') +
            row(ico('medal', '', '', '\u2605'), tr('iTie'), '') +
            row('<span class="rk-orb rk-hid"><i></i></span>', tr('iHid'), '') +
            row(ico('hand', '', '', '\u261d'), tr('iTap'), tr('iDiff')) + '</ul>';
    }
    function closeInfo() {
        if (!infEl) return;
        const el = infEl, back = infBack; infEl = null; infBack = null;
        el.classList.remove('in'); D.removeEventListener('keydown', infKey, true);
        setTimeout(() => { try { el.remove(); } catch (e) { } }, 220);
        try { if (back && back.focus && back.isConnected) back.focus({ preventScroll: true }); } catch (e) { }
    }
    function infKey(e) { if (e.key === 'Escape') { e.preventDefault(); closeInfo(); } }
    function openInfo(from) {
        if (infEl) closeInfo();
        const el = D.createElement('div');
        el.className = 'rk-lad-wrap rk-inf-wrap'; el.setAttribute('data-noi18n', '');
        el.innerHTML = '<div class="rk-lad rk-infs" role="dialog" aria-modal="true" aria-label="' + esc(tr('info')) + '">' + infoHTML() + '</div>';
        el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-inf="close"]')) closeInfo(); });
        D.body.appendChild(el); infEl = el; infBack = from || null;
        D.addEventListener('keydown', infKey, true);
        requestAnimationFrame(() => { el.classList.add('in'); const x = el.querySelector('.rk-lad-x'); if (x) x.focus({ preventScroll: true }); });
    }

    /* ---------- You vs them: only when a companion is tapped (23 Oct, 15:00: a versus screen, mirrored bars, one line) ---------- */
    let cmpEl = null, cmpBack = null, cmpWho = null, cmpK = 'w';
    const nameOf = p => p && p.me ? tr('you') : String((p && p.n) || tr('hidden'));
    function actsText(acts) { const a = []; ['move', 'meal', 'scan', 'water', 'fast', 'macro'].forEach(s => { const n = acts && acts[s]; if (n) a.push(n === 1 ? tr('a_' + s) : tr('n_' + s, { n })); }); return listOf(a); }
    /* the sun in a line of text: the app's emoji pass (spirit.js symbols) swaps a bare \u2600 for an unlabelled icon, so put the
       app's own sun in, golden and labelled "sunbeams". Without the icon set (offline tests) it stays the plain \u2600. */
    function sunHTML(h) {
        const I = W.LowiIcons; if (!I || typeof I.svg !== 'function') return h;
        let s = ''; try { s = I.svg('sun', { label: tr('sun'), cls: 'rk-sun' }); } catch (e) { return h; }
        return s ? String(h).split('\u2600').join(s) : h;
    }
    function dWk(d) { try { return d.toLocaleDateString(LOC[lang()], { weekday: 'short' }).replace(/\.$/, ''); } catch (e) { return dShort(d); } }
    const endTxt = (k, d) => k === 'w' ? dWk(d) : dShort(d);
    /* "what it takes", one short line: "+4 \u2600 by Sun \u00b7 a Move today does it", "+358 XP \u00b7 \u2248 4 days" (K.gap does the math) */
    function goalText(me, them, k) {
        const now = Date.now(), mx = k === 'all' ? null : myMix(k);
        if (!them) { if (me) return tr('gAlone'); const sp = K.span(k, now); return k === 'all' ? tr('gInA') : tr('gIn', { d: endTxt(k, sp.end) }); }
        const g = K.gap(me, them, k, now, { mix: mx, pace: K.pace(ledger(), now), PTS: W.LowiSun && W.LowiSun.PTS }), nm = nameOf(them.p);
        if (!g || g.self) return '';
        const days = n => n <= 1 ? tr('gDay1') : tr('gDays', { n });
        if (g.ahead && g.tie) return tr('gTie', { why: tr('tb_' + g.why) });
        if (g.ahead) return k === 'all' ? tr('gLeadA', { x: fmt(g.lead) }) : tr('gLead', { x: fmt(g.lead) }) + ' \u00b7 ' + (g.theyCan ? tr('gCatch', { n: nm, y: fmt(g.theyNeed), d: endTxt(k, g.end) }) : tr('gSafe', { d: endTxt(k, g.end) }));
        if (g.unit === 'xp') return tr('gPassA', { x: fmt(g.need) }) + (g.days ? ' \u00b7 ' + days(g.days) : '');
        if (!g.possible) return tr('gNo', { d: endTxt(k, g.end) });
        let s = tr('gPass', { x: fmt(g.need), d: endTxt(k, g.end) });
        if (!g.rest && g.today && g.today.pts) s += ' \u00b7 ' + tr('gToday', { acts: actsText(g.today.acts) });
        else if (g.rest) s += ' \u00b7 ' + days((g.restDays || 0) + (g.today && g.today.pts ? 1 : 0));
        return s;
    }
    function segHTML() {
        return '<div class="rk-seg rk-cmp-seg" role="tablist" aria-label="' + esc(tr('periods')) + '" style="--rk-i:' + K.PERIODS.indexOf(cmpK) + '">' +
            K.PERIODS.map(k => '<button type="button" role="tab" class="rk-segb" data-cmp="per" data-k="' + k + '" aria-selected="' + (k === cmpK) + '" tabindex="' + (k === cmpK ? 0 : -1) + '">' + esc(tr(k)) + '</button>').join('') + '</div>';
    }
    /* one mirrored row: your bar grows left, theirs right, the longer one glows */
    function mirRow(r) {
        const max = r.max || Math.max(1, r.a || 0, r.b == null ? 0 : r.b), w = v => Math.round((v || 0) / max * 100);
        const side = (v, cls, win) => '<span class="rk-mir-v ' + cls + (win ? ' win' : '') + '">' + (v == null ? '<b class="num off">\u2013</b>' : '<b class="num">' + fmt(v) + '</b><span class="rk-mb"><i style="--w:' + w(v) + '%"></i></span>') + '</span>';
        return '<li class="rk-mir-r' + (r.cur ? ' cur' : '') + '" aria-label="' + esc(r.l + ': ' + tr('you') + ' ' + fmt(r.a || 0) + ', ' + r.nm + ' ' + (r.b == null ? '\u2013' : fmt(r.b))) + '">' +
            side(r.a || 0, 'me', r.b != null && (r.a || 0) > r.b) + '<span class="rk-mir-l" aria-hidden="true">' + r.i + '<small>' + esc(r.l) + '</small></span>' + side(r.b, 'them', r.b != null && r.b > (r.a || 0)) + '</li>';
    }
    const SRC_I = { meal: ['plate', '\u25cf'], scan: ['scan', '\u25a3'], move: ['move', '\u27a4'], fast: ['hourglass', '\u231b'], macro: ['target', '\u25ce'], water: ['drop', '\u25cf'], other: ['sparkle', '\u2726'] };
    function srcHTML(k, them, tp, cT, nm) {
        if (k === 'all') return '';
        const mm = myMix(k), ts = them && cT && tp && tp.uid ? K.mixOf(mixes[tp.uid], k, Date.now(), them.pts) : null;
        const mine = mm ? mm.src : {}, rowsS = K.SRC.filter(s => (mine[s] || 0) || (ts && ts[s]));
        if (!rowsS.length) return '';
        const max = Math.max(1, ...rowsS.map(s => Math.max(mine[s] || 0, ts ? ts[s] || 0 : 0)));
        let h = '<ul class="rk-mir rk-src">' + rowsS.map(s => {
            const ic = SRC_I[s] || SRC_I.other;
            return mirRow({ i: ico(ic[0], '', 'rk-src-i', ic[1]), l: tr('s_' + s), a: mine[s] || 0, b: ts ? ts[s] || 0 : null, nm, max });
        }).join('') + '</ul>';
        if (!ts && them && !tp.me) h += '<p class="rk-tot">' + ico('lock', '', 'rk-lock-i', '') + '<span>' + esc(tr('totals', { n: nm })) + '</span></p>';
        return h;
    }
    function pairHTML(who) {
        const k = cmpK, now = Date.now(), mc = myCare(), ppl = people(), list = K.rows(ppl, k, now, mc), me = K.mine(list);
        const them = list.find(x => K.same(x.p, who)) || null, tp = them ? them.p : (ppl.find(p => K.same(p, who)) || Object.assign({ n: '' }, who));
        const self = ppl.find(p => p && p.me) || { me: true, n: '' }, lvM = me ? me.lv : K.level(self), lvT = them ? them.lv : K.level(tp), cM = companion(self, lvM), cT = companion(tp, lvT);
        const nm = nameOf(tp), aM = K.across(ppl, now, mc, self), aT = K.across(ppl, now, mc, tp), sp = K.span(k, now);
        const side = (c, key, owner, lv, cls) => '<div class="rk-vs-s ' + cls + '">' + art(c, key, true) + '<b class="rk-cn">' + esc(c ? c.name : tr('hidden')) + '</b>' +
            '<small class="rk-own"><span class="rk-lv num">' + esc(tr('lv', { n: lv })) + '</span><span class="rk-ownr">' + esc(owner) + '</span></small>' + (c && c.named && c.form ? '<small class="rk-form">' + esc(c.form) + '</small>' : '') + '</div>';
        let h = '<div class="rk-vs-h">' + side(cM, 'rkcm', tr('you'), lvM, 'me') + '<b class="rk-vs-b" aria-hidden="true">' + esc(tr('vs')) + '</b>' + side(cT, 'rkct', nm, lvT, 'them') +
            '<button type="button" class="rk-lad-x" data-cmp="close" aria-label="' + esc(tr('close')) + '">\u00d7</button></div>';
        const a = aM[k] || { pts: 0 }, b = aT[k] || { pts: 0 }, sum = a.pts + b.pts, share = sum ? a.pts / sum : .5;
        const duelV = (x, cls, win) => '<span class="rk-duel-v ' + cls + (win ? ' win' : '') + '"><small class="rk-rk num">' + (x.rank ? '#' + x.rank : '\u2013') + '</small><span class="rk-duel-n"><b class="num" data-v="' + x.pts + '">' + fmt(x.pts) + '</b>' + uIco(k) + '</span></span>';
        h += '<div class="rk-cmp-b">' + segHTML() +
            '<div class="rk-duel" style="--a:' + share.toFixed(3) + '" aria-label="' + esc(tr(k) + ': ' + tr('you') + ' ' + fmt(a.pts) + (a.rank ? ' #' + a.rank : '') + ', ' + nm + ' ' + fmt(b.pts) + (b.rank ? ' #' + b.rank : '') + ' ' + (k === 'all' ? tr('xp') : tr('sun'))) + '">' +
            duelV(a, 'me', a.pts > b.pts) + '<span class="rk-duel-bar" aria-hidden="true"><i class="me"></i><i class="them"></i></span>' + duelV(b, 'them', b.pts > a.pts) + '</div>';
        const goal = goalText(me, them, k);
        if (goal) h += '<p class="rk-goal">' + ico('target', tr('goal'), 'rk-goal-i', '\u25ce') + '<span>' + sunHTML(esc(goal)) + '</span></p>';
        const rows = K.PERIODS.map(kk => ({ i: pIco(kk), l: tr(kk), a: (aM[kk] || {}).pts || 0, b: (aT[kk] || {}).pts || 0, cur: kk === k, nm }));
        rows.push({ i: ico('medal', '', 'rk-medal-i', '\u2605'), l: tr('lvRow'), a: lvM, b: lvT, nm });
        if (sp) rows.push({ i: ico('sun', '', 'rk-sun full', '\u2600'), l: tr('fullDays'), a: a.full || 0, b: b.full || 0, nm });
        h += '<ul class="rk-mir">' + rows.map(mirRow).join('') + '</ul>' + srcHTML(k, them, tp, cT, nm);
        if (tp && (tp.uid || tp.n)) h += '<button type="button" class="rk-pf" data-cmp="profile" data-uid="' + esc(tp.uid || '') + '" data-who="' + esc(tp.n || '') + '" aria-label="' + esc(tr('profileL', { n: nm })) + '">' + ico('user', '', 'rk-pf-i', '') + '<span>' + esc(tr('profile')) + '</span><b aria-hidden="true">\u203a</b></button>';
        return h + '</div>';
    }
    function drawCmp(focusSel) {
        if (!cmpEl || !cmpWho) return; const d = cmpEl.querySelector('.rk-cmp'); if (!d) return;
        const old = {}; d.querySelectorAll('.rk-duel-v [data-v]').forEach((e, i) => { old[i] = +e.dataset.v; });
        d.setAttribute('aria-label', tr('vsT', { n: cmpWho.n || tr('hidden') }));
        d.innerHTML = pairHTML(cmpWho);
        if (!calm()) d.querySelectorAll('.rk-duel-v [data-v]').forEach((e, i) => countUp(e, old[i] != null ? old[i] : 0, +e.dataset.v));
        if (focusSel) { const f = d.querySelector(focusSel); if (f) f.focus({ preventScroll: true }); }
    }
    function closeCmp() {
        if (!cmpEl) return;
        const el = cmpEl, back = cmpBack; cmpEl = null; cmpBack = null;
        el.classList.remove('in'); D.removeEventListener('keydown', cmpKey, true);
        setTimeout(() => { try { el.remove(); } catch (e) { } }, 220);
        try { if (back && back.focus && back.isConnected) back.focus({ preventScroll: true }); } catch (e) { }
    }
    function cmpKey(e) { if (e.key === 'Escape') { e.preventDefault(); closeCmp(); } }
    function openCmp(who, from) {
        if (!who || !(who.uid || who.n)) return;
        if (ladEl) closeLadder();
        if (infEl) closeInfo();
        if (cmpEl) closeCmp();
        cmpWho = { uid: who.uid || '', n: who.n || '' }; cmpK = per;
        const el = D.createElement('div');
        el.className = 'rk-lad-wrap rk-cmp-wrap'; el.setAttribute('data-noi18n', '');
        el.innerHTML = '<div class="rk-lad rk-cmp fresh" role="dialog" aria-modal="true"></div>';
        el.addEventListener('click', e => {
            if (e.target === el) { closeCmp(); return; }
            const t = e.target.closest('[data-cmp]'); if (!t) return;
            const a = t.dataset.cmp;
            if (a === 'close') closeCmp();
            else if (a === 'per') { const c = el.querySelector('.rk-cmp'); if (c) c.classList.remove('fresh'); cmpK = K.period(t.dataset.k); drawCmp('.rk-segb[aria-selected="true"]'); }
            else if (a === 'profile') { const q = { uid: t.dataset.uid || '', name: t.dataset.who || '' }; closeCmp(); try { const r = R3(); if (r && r.open) r.open(q); } catch (er) { console.error(er); } }
        });
        el.addEventListener('keydown', e => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const s = e.target.closest('.rk-segb'); if (!s) return;
            const i = K.PERIODS.indexOf(cmpK), n = K.PERIODS[(i + (e.key === 'ArrowRight' ? 1 : K.PERIODS.length - 1)) % K.PERIODS.length];
            e.preventDefault(); const nb = el.querySelector('.rk-segb[data-k="' + n + '"]'); if (nb) nb.click();
        });
        D.body.appendChild(el); cmpEl = el; cmpBack = from || null;
        drawCmp();
        D.addEventListener('keydown', cmpKey, true);
        requestAnimationFrame(() => { el.classList.add('in'); const x = el.querySelector('.rk-lad-x'); if (x) x.focus({ preventScroll: true }); });
    }

    /* ---------- game motion: the board sorts itself, numbers count up (23 Oct, 15:00) ---------- */
    function calm() { try { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
    const raf = f => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(f) : setTimeout(() => f(Date.now()), 16));
    const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
    function countUp(el, from, to) {
        if (!el || from === to || !isFinite(from) || !isFinite(to)) return;
        const t0 = nowMs(), dur = 700, L = lang();
        el.textContent = K.fmt(from, L);
        const step = () => { if (!el.isConnected) return; const k = Math.min(1, (nowMs() - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = K.fmt(Math.round(from + (to - from) * e), L); if (k < 1) raf(step); };
        raf(step);
    }
    function snap(b) {
        const m = {};
        b.querySelectorAll('[data-key]').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width) return; const v = e.querySelector('[data-v]'); m[e.dataset.key] = { x: r.left, y: r.top, v: v ? +v.dataset.v : null }; });
        return m;
    }
    /* first: the boxes before the change (null for the first look: the CSS intro runs and the numbers count up from 0) */
    function play(b, first) {
        if (calm()) return;
        b.querySelectorAll('[data-key]').forEach(el => {
            const f = first && first[el.dataset.key], v = el.querySelector('[data-v]');
            if (v) { const to = +v.dataset.v; countUp(v, f && f.v != null ? f.v : (first && !f ? to : 0), to); }
            if (!first) return;
            if (!f) { el.classList.add('rk-in'); return; }
            const r = el.getBoundingClientRect(), dx = f.x - r.left, dy = f.y - r.top;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
            el.style.transition = 'none'; el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
            void el.offsetWidth;
            raf(() => {
                el.style.transition = 'transform .6s cubic-bezier(.2,.9,.25,1.06)'; el.style.transform = '';
                setTimeout(() => { el.style.transition = ''; }, 650);
            });
        });
    }
    /* fresh: the tab was just shown (community-rooms-ui.js), so the podium rises again even when nothing changed */
    function render(b, fresh) {
        if (!b) return; box = b; wire(b);
        const r = html(), key = per + '|' + lang() + '|' + r.h.length + '|' + r.h, vis = !!(b.isConnected && b.getClientRects && b.getClientRects().length);
        if (b.__rkH !== key) {
            const intro = !b.__rkH || !b.querySelector('.rk') || !!fresh, first = !intro && vis ? snap(b) : null;
            b.__rkH = key; b.innerHTML = '<div class="rk' + (intro ? ' rk-intro' : '') + '" data-noi18n>' + r.h + '</div>';
            if (vis) play(b, intro ? null : first || {});
        } else if (fresh && vis) {
            const el = b.querySelector('.rk');
            if (el) { el.classList.remove('rk-intro'); void el.offsetWidth; el.classList.add('rk-intro'); play(b, null); }
        }
        fetchLooks(r.uids);
    }
    /* 23 Oct (E-man: "we have a care board and some XP board ... nuke them"): Ranking is the one board. Every old way in (Profile's
       board row, "See leaderboard", the Settings row, the old Move card) lands here: Community, Ranking tab. */
    function open() {
        try { const R2 = W.LowiR2; if (R2 && R2.top && R2.top() && R2.closeAll) R2.closeAll(); } catch (e) { }
        try { const sw = D.getElementById('sheetwrap'); if (sw && sw.classList.contains('open') && typeof W.closeSheet === 'function') W.closeSheet(); } catch (e) { }
        try { if (typeof W.goTab === 'function') W.goTab('foryou'); } catch (e) { console.error(e); }
        let n = 0;
        const go = () => {
            const U = W.LowiRoomsUI;
            try { if (U && U.showView && D.getElementById('cmPaneChat')) { U.showView('rank'); if (U.view && U.view() === 'rank') return; } } catch (e) { console.error(e); }
            if (++n < 25) setTimeout(go, 120);
        };
        setTimeout(go, 60);
    }
    W.LowiRanking = { render, open, period: () => per, setPeriod: k => { per = K.period(k); if (box && box.isConnected) render(box); }, _html: () => html().h, openLadder, closeLadder, _ladder: () => ladderHTML(),
        openInfo, closeInfo, _info: () => infoHTML(),
        openCompare: openCmp, closeCompare: closeCmp, _compare: (who, k) => { if (!who) return ''; const a = cmpWho, b = cmpK; cmpWho = who; cmpK = K.period(k || per); try { return pairHTML(who); } finally { cmpWho = a; cmpK = b; } }, _mixes: m => { if (m) mixes = m; return mixes; } };
})();
