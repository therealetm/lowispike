/* ranking.js (23 Oct 2026): the Community Ranking tab, a companion leaderboard. Layout from the reference E-man sent (Spazier Club
   "Rangliste"): title + one line, a period switch, a highlighted Your place card, a podium of the top 3 (2nd left, 1st centre and
   raised, 3rd right) with medals 1/2/3, then a numbered list. In LOWiSPIKE's own look (brand blues and cyan on glass) and with
   companions instead of people: each entry shows the owner's companion in its evolution form and the owner's name small under it.
   Rules (periods, scores, privacy) live in ranking-core.js. community-rooms-ui.js shows this page when the Ranking tab is open
   (LowiRanking.render(box)); the Community top bar above it is the same shared bar as on every other tab.
   Tapping an entry opens that person's profile (LowiR3.open). */
(function () {
    'use strict';
    const W = window, D = document, K = W.LowiRankingCore;
    if (!K) return;
    const T = {
        title: ['Ranking', 'Rangliste', 'Clasificación'],
        subW: ['Whose companion got the most care this week?', 'Wessen Begleiter wurde diese Woche am besten versorgt?', '¿Qué compañero recibió más cuidados esta semana?'],
        subM: ['Whose companion got the most care this month?', 'Wessen Begleiter wurde diesen Monat am besten versorgt?', '¿Qué compañero recibió más cuidados este mes?'],
        subA: ['Whose companion is the strongest?', 'Wessen Begleiter ist am stärksten?', '¿Qué compañero es el más fuerte?'],
        w: ['Week', 'Woche', 'Semana'], m: ['Month', 'Monat', 'Mes'], all: ['All time', 'Gesamt', 'Total'],
        periods: ['Period', 'Zeitraum', 'Periodo'],
        yourPlace: ['Your place', 'Dein Platz', 'Tu puesto'],
        notYet: ['Not ranked yet', 'Noch nicht dabei', 'Aún sin puesto'],
        notYetW: ['Meals, water, Moves and scans give your companion sunbeams.', 'Mahlzeiten, Wasser, Moves und Scans geben deinem Begleiter Sonnenstrahlen.', 'Comidas, agua, Moves y escaneos dan rayos de sol a tu compañero.'],
        notYetA: ['Every log makes your companion stronger.', 'Jeder Eintrag macht deinen Begleiter stärker.', 'Cada registro hace más fuerte a tu compañero.'],
        you: ['you', 'du', 'tú'],
        hidden: ['Hidden companion', 'Versteckter Begleiter', 'Compañero oculto'],
        hiddenMe: ['Only you see your companion here', 'Nur du siehst hier deinen Begleiter', 'Solo tú ves aquí a tu compañero'],
        lv: ['Lv {n}', 'Lv {n}', 'Nv {n}'],
        sun: ['sunbeams', 'Sonnenstrahlen', 'rayos de sol'], xp: ['XP', 'XP', 'XP'],
        place: ['Place {n}', 'Platz {n}', 'Puesto {n}'],
        empty: ['No one on the board yet. Care for your companion and be the first.', 'Noch niemand auf der Rangliste. Kümmere dich um deinen Begleiter und sei der Erste.', 'Aún no hay nadie. Cuida a tu compañero y sé el primero.'],
        howW: ['Score: sunbeams your companion got from you, up to 12 a day. Companions whose owners hide them show as a hidden orb.', 'Punkte: Sonnenstrahlen, die dein Begleiter von dir bekommt, bis zu 12 am Tag. Versteckte Begleiter erscheinen als verdeckte Kugel.', 'Puntos: rayos de sol que tu compañero recibe de ti, hasta 12 al día. Los compañeros ocultos aparecen como una esfera tapada.'],
        howA: ['Score: your companion\'s strength, all the XP it ever earned. Companions whose owners hide them show as a hidden orb.', 'Punkte: die Stärke deines Begleiters, alle XP, die er je gesammelt hat. Versteckte Begleiter erscheinen als verdeckte Kugel.', 'Puntos: la fuerza de tu compañero, toda la XP que ha ganado. Los compañeros ocultos aparecen como una esfera tapada.'],
        open: ['Open {name}', '{name} öffnen', 'Abrir {name}'],
        levels: ['Levels', 'Level', 'Niveles'],
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
        /* 23 Oct 2026 (Eman: "it has to be clear WHY"): what each board counts, the comparison and what it takes */
        perW: ['Week counts the sunbeams since Monday, {d}. Up to 12 a day, so {max} at most so far. It starts again on Monday.', 'Woche zählt die Sonnenstrahlen seit Montag, {d}. Bis zu 12 am Tag, bisher also höchstens {max}. Sie beginnt am Montag neu.', 'Semana cuenta los rayos de sol desde el lunes {d}. Hasta 12 al día, así que {max} como máximo hasta ahora. Empieza de nuevo el lunes.'],
        perM: ['Month counts the sunbeams since {d}. Up to 12 a day, so {max} at most so far. It starts again on the 1st.', 'Monat zählt die Sonnenstrahlen seit dem {d}. Bis zu 12 am Tag, bisher also höchstens {max}. Er beginnt am 1. neu.', 'Mes cuenta los rayos de sol desde el {d}. Hasta 12 al día, así que {max} como máximo hasta ahora. Empieza de nuevo el día 1.'],
        perA: ['All time counts all the XP a companion ever earned. It never starts again.', 'Gesamt zählt alle XP, die ein Begleiter je gesammelt hat. Es beginnt nie neu.', 'Total cuenta toda la XP que un compañero ha ganado. Nunca empieza de nuevo.'],
        cmp3: ['Compare the top 3', 'Top 3 vergleichen', 'Comparar el top 3'],
        cmpT3: ['Top 3 side by side', 'Top 3 im Vergleich', 'El top 3, lado a lado'],
        vs: ['You vs {n}', 'Du vs. {n}', 'Tú vs. {n}'],
        back3: ['Top 3', 'Top 3', 'Top 3'],
        profile: ['Open {n}\'s profile', 'Profil von {n} öffnen', 'Abrir el perfil de {n}'],
        boards: ['Every board', 'Alle Ranglisten', 'Todas las clasificaciones'],
        perDay: ['Per day', 'Pro Tag', 'Por día'],
        fullDays: ['Full-sun days', 'Volle Sonnentage', 'Días de sol lleno'],
        lvRow: ['Level', 'Level', 'Nivel'],
        before: ['Before Monday this month: you {a} \u2600, {n} {b} \u2600.', 'Vor Montag in diesem Monat: du {a} \u2600, {n} {b} \u2600.', 'Antes del lunes, este mes: tú {a} \u2600, {n} {b} \u2600.'],
        whyGen: ['Why the boards differ: Week only counts since Monday and Month since the 1st, both up to 12 sunbeams a day. All time adds up every XP since the start. So a long history can win All time while a strong week wins the Week.', 'Warum die Ranglisten verschieden sind: Woche zählt nur seit Montag und Monat seit dem 1., beide bis zu 12 Sonnenstrahlen am Tag. Gesamt zählt alle XP seit dem Start. So kann eine lange Geschichte Gesamt gewinnen, während eine starke Woche die Woche gewinnt.', 'Por qué cambian las clasificaciones: Semana solo cuenta desde el lunes y Mes desde el día 1, ambas hasta 12 rayos de sol al día. Total suma toda la XP desde el principio. Así, una larga historia puede ganar Total mientras una semana fuerte gana la Semana.'],
        srcT: ['Where the sunbeams came from', 'Woher die Sonnenstrahlen kommen', 'De dónde vienen los rayos de sol'],
        srcA: ['All time is XP. The sunbeam breakdown is on Week and Month.', 'Gesamt sind XP. Die Aufteilung der Sonnenstrahlen steht bei Woche und Monat.', 'Total es XP. El desglose de rayos de sol está en Semana y Mes.'],
        srcNone: ['{n}\'s app shares only the total and the full-sun days, not where each sunbeam came from.', 'Die App von {n} teilt nur die Summe und die vollen Sonnentage, nicht woher jeder Sonnenstrahl kommt.', 'La app de {n} solo comparte el total y los días de sol lleno, no de dónde viene cada rayo.'],
        srcHid: ['{n} hides their companion, so only the total shows.', '{n} versteckt den Begleiter, darum zeigt sich nur die Summe.', '{n} oculta a su compañero, así que solo se ve el total.'],
        srcEmpty: ['No sunbeams yet in this period.', 'Noch keine Sonnenstrahlen in diesem Zeitraum.', 'Aún no hay rayos de sol en este periodo.'],
        s_meal: ['Meals', 'Mahlzeiten', 'Comidas'], s_scan: ['Scans', 'Scans', 'Escaneos'], s_move: ['Moves', 'Moves', 'Moves'], s_fast: ['Fasting', 'Fasten', 'Ayuno'],
        s_macro: ['Macro goals', 'Makroziele', 'Metas de macros'], s_water: ['Water', 'Wasser', 'Agua'], s_other: ['Other', 'Sonstiges', 'Otros'],
        needT: ['What it takes', 'Was es braucht', 'Lo que hace falta'],
        needYou: ['What it takes for you', 'Was du brauchst', 'Lo que te hace falta'],
        pass: ['You need {x} \u2600 more by {d} to pass {n}, if {n} adds none.', 'Du brauchst bis {d} noch {x} \u2600, um an {n} vorbeizuziehen, falls {n} nichts mehr dazubekommt.', 'Necesitas {x} \u2600 más para el {d} para superar a {n}, si {n} no suma más.'],
        today: ['Today this does it: {acts} (+{p}).', 'Heute reicht das: {acts} (+{p}).', 'Hoy basta con: {acts} (+{p}).'],
        todayPart: ['Today you can still get {p}: {acts}.', 'Heute gehen noch {p}: {acts}.', 'Hoy aún puedes conseguir {p}: {acts}.'],
        todayFull: ['Today\'s sun is already full.', 'Die Sonne ist heute schon voll.', 'Hoy el sol ya está lleno.'],
        rest1: ['The other {r} need one more day.', 'Die restlichen {r} brauchen noch einen Tag.', 'Los otros {r} necesitan un día más.'],
        restN: ['The other {r} need at least {n} more days.', 'Die restlichen {r} brauchen noch mindestens {n} Tage.', 'Los otros {r} necesitan al menos {n} días más.'],
        noWay: ['Even a full sun every day until {d} would leave you {x} \u2600 short of {n} this time.', 'Selbst volle Sonne jeden Tag bis {d} lässt dich diesmal {x} \u2600 hinter {n}.', 'Ni con el sol lleno cada día hasta el {d} alcanzarías a {n} esta vez: te faltarían {x} \u2600.'],
        lead: ['You lead {n} by {x} \u2600. {n} needs {y} more by {d} to pass you.', 'Du liegst {x} \u2600 vor {n}. {n} braucht bis {d} noch {y}, um dich zu überholen.', 'Vas {x} \u2600 por delante de {n}. {n} necesita {y} más para el {d} para superarte.'],
        leadSafe: ['You lead {n} by {x} \u2600. {n} can\'t catch you before {d}.', 'Du liegst {x} \u2600 vor {n}. {n} kann dich bis {d} nicht mehr einholen.', 'Vas {x} \u2600 por delante de {n}. {n} ya no puede alcanzarte antes del {d}.'],
        passA: ['You need {x} XP more to pass {n}.', 'Du brauchst noch {x} XP, um an {n} vorbeizuziehen.', 'Necesitas {x} XP más para superar a {n}.'],
        pace1: ['At your pace this week, about {p} XP a day, that is about one day.', 'In deinem Tempo dieser Woche, etwa {p} XP am Tag, ist das ungefähr ein Tag.', 'A tu ritmo de esta semana, unos {p} XP al día, es más o menos un día.'],
        paceN: ['At your pace this week, about {p} XP a day, that is about {n} days.', 'In deinem Tempo dieser Woche, etwa {p} XP am Tag, sind das ungefähr {n} Tage.', 'A tu ritmo de esta semana, unos {p} XP al día, son unos {n} días.'],
        leadA: ['You lead {n} by {x} XP.', 'Du liegst {x} XP vor {n}.', 'Vas {x} XP por delante de {n}.'],
        /* 23 Oct: a tie is not "lead by 0": say who wins the tie-break and why (ranking-core.js gap: why) */
        tie: ['You and {n} both have {x} \u2600. You win the tie-break {why}. {n} needs 1 \u2600 more by {d} to pass you.', 'Du und {n} habt beide {x} \u2600. Bei Gleichstand liegst du vorne, {why}. {n} braucht bis {d} noch 1 \u2600, um dich zu überholen.', 'Tú y {n} tenéis {x} \u2600. Ganas el desempate {why}. {n} necesita 1 \u2600 más para el {d} para superarte.'],
        tieSafe: ['You and {n} both have {x} \u2600. You win the tie-break {why}.', 'Du und {n} habt beide {x} \u2600. Bei Gleichstand liegst du vorne, {why}.', 'Tú y {n} tenéis {x} \u2600. Ganas el desempate {why}.'],
        tieA: ['You and {n} both have {x} XP. You win the tie-break {why}.', 'Du und {n} habt beide {x} XP. Bei Gleichstand liegst du vorne, {why}.', 'Tú y {n} tenéis {x} XP. Ganas el desempate {why}.'],
        tb_full: ['with more full-sun days', 'mit mehr vollen Sonnentagen', 'con más días de sol lleno'],
        tb_lv: ['with the higher level', 'mit dem höheren Level', 'con el nivel más alto'],
        tb_name: ['by name, A to Z', 'nach dem Namen, A bis Z', 'por nombre, de la A a la Z'],
        inW: ['1 \u2600 by {d} puts you on the board.', '1 \u2600 bis {d} bringt dich auf die Rangliste.', '1 \u2600 para el {d} te pone en la clasificación.'],
        inA: ['Any XP puts you on the board.', 'Jede XP bringt dich auf die Rangliste.', 'Cualquier XP te pone en la clasificación.'],
        alone: ['You are the only one on this board so far.', 'Du bist bisher die einzige Person auf dieser Rangliste.', 'Por ahora eres la única persona en esta clasificación.'],
        a_move: ['a Move', 'ein Move', 'un Move'], a_meal: ['a meal', 'eine Mahlzeit', 'una comida'], a_scan: ['a scan', 'ein Scan', 'un escaneo'],
        a_water: ['a glass of water', 'ein Glas Wasser', 'un vaso de agua'], a_fast: ['a fasting milestone', 'ein Fasten-Meilenstein', 'un hito de ayuno'], a_macro: ['a macro goal', 'ein Makroziel', 'una meta de macros'],
        n_move: ['{n} Moves', '{n} Moves', '{n} Moves'], n_meal: ['{n} meals', '{n} Mahlzeiten', '{n} comidas'], n_scan: ['{n} scans', '{n} Scans', '{n} escaneos'],
        n_water: ['{n} glasses of water', '{n} Gläser Wasser', '{n} vasos de agua'], n_fast: ['{n} fasting milestones', '{n} Fasten-Meilensteine', '{n} hitos de ayuno'], n_macro: ['{n} macro goals', '{n} Makroziele', '{n} metas de macros']
    };
    function lang() { try { return Math.max(0, ['en', 'de', 'es'].indexOf((W.LowiLang && W.LowiLang.get()) || localStorage.getItem('lowispike.lang') || 'en')); } catch (e) { return 0; } }
    function tr(k, v) { let s = (T[k] || [k])[lang()] || T[k][0]; for (const x in v || {}) s = s.split('{' + x + '}').join(String(v[x])); return s; }
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
            try { const H = W.LowiHerbTamagotchi, c = H && H.current && H.current(); if (H && H.name && c) name = H.name(c.p, c.m); } catch (e) { }
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
    function unit() { return per === 'all' ? tr('xp') : '\u2600'; }
    function unitLong() { return per === 'all' ? tr('xp') : tr('sun'); }
    /* under the companion's name: its rank (evolution form and level), then the owner small */
    function ownerLine(p, lv, c) {
        /* 23 Oct: form and level are two unbreakable pieces, so a narrow card wraps between them instead of cutting "Tide Guardian · Lv…" */
        return '<small class="rk-own">' + (c && c.named && c.form ? '<span class="rk-of">' + esc(c.form) + '</span><span class="rk-sep"> \u00b7 </span>' : '') + '<span class="rk-ol">' + esc(tr('lv', { n: lv })) + '</span></small>' +
            '<small class="rk-ownr">' + esc(p.me ? tr('you') : (p.n || '')) + '</small>';
    }
    function attrs(x, c) {
        const p = x.p, nm = c ? c.name : tr('hidden');
        return ' data-rk="open" data-who="' + esc(p.n || '') + '"' + (p.uid ? ' data-uid="' + esc(p.uid) + '"' : '') + (p.me ? ' data-me="1"' : '') +
            ' aria-label="' + esc(tr('place', { n: x.rank }) + ', ' + nm + ', ' + (p.me ? tr('you') : p.n) + ', ' + score(x) + ' ' + unitLong()) + '"';
    }
    function podHTML(x, slot) {
        const c = companion(x.p, x.lv);
        return '<button type="button" class="rk-pod-i rk-p' + x.rank + (x.p.me ? ' me' : '') + '"' + attrs(x, c) + '>' +
            '<span class="rk-pod-art">' + art(c, 'rkp' + slot, true) + '<b class="rk-medal m' + x.rank + '" aria-hidden="true">' + x.rank + '</b></span>' +
            '<b class="rk-cn">' + esc(c ? c.name : tr('hidden')) + '</b>' + ownerLine(x.p, x.lv, c) +
            '<span class="rk-pts num">' + score(x) + '<small>' + esc(unit()) + '</small></span>' +
            '<span class="rk-step" aria-hidden="true"></span></button>';
    }
    function rowHTML(x, i) {
        const c = companion(x.p, x.lv);
        return '<li><button type="button" class="rk-row' + (x.p.me ? ' me' : '') + '"' + attrs(x, c) + '><span class="rk-n num">' + x.rank + '</span>' + art(c, 'rkl' + i, false) +
            '<span class="rk-who"><b class="rk-cn">' + esc(c ? c.name : tr('hidden')) + '</b>' + ownerLine(x.p, x.lv, c) + '</span>' +
            '<span class="rk-pts num">' + score(x) + '<small>' + esc(unit()) + '</small></span></button></li>';
    }
    function meHTML(list) {
        const x = K.mine(list), self = people().find(p => p && p.me) || { me: true, n: '' }, lv = x ? x.lv : K.level(self), c = companion(self, lv);
        let shared = true; try { const pr = LC() && LC().prefs && LC().prefs(); if (pr && pr.share === false) shared = false; } catch (e) { }
        const sub = shared ? ownerLine(self, lv, c) : '<small class="rk-own">' + esc(tr('hiddenMe')) + '</small>';
        return '<button type="button" class="rk-me" data-rk="ladder" data-me="1" aria-haspopup="dialog" aria-label="' + esc(tr('yourPlace') + ', ' + (x ? '#' + x.rank : '') + ', ' + (c ? c.name : 'Misty') + ', ' + tr('levels')) + '" data-who="' + esc(self.n || '') + '">' +
            '<span class="rk-me-l"><small>' + esc(tr('yourPlace')) + '</small><b class="num">' + (x ? '#' + x.rank : '\u2013') + '</b></span>' + art(c, 'rkme', false) +
            '<span class="rk-who"><b class="rk-cn">' + esc(c ? c.name : 'Misty') + '</b>' + (x ? sub : '<small class="rk-own">' + esc(tr('notYet')) + ' \u00b7 ' + esc(per === 'all' ? tr('notYetA') : tr('notYetW')) + '</small>') + '</span>' +
            (x ? '<span class="rk-pts num">' + score(x) + '<small>' + esc(unit()) + '</small></span>' : '') +
            '<span class="rk-me-go" aria-hidden="true"><i>' + esc(tr('levels')) + '</i><b>\u203a</b></span></button>';
    }
    function html() {
        const list = K.rows(people(), per, Date.now(), myCare()), top = list.slice(0, 3), rest = K.board(list).slice(3);
        const sub = per === 'all' ? tr('subA') : per === 'm' ? tr('subM') : tr('subW');
        let h = '<header class="rk-h"><h2 class="rk-t">' + esc(tr('title')) + '</h2><p class="rk-sub">' + esc(sub) + '</p></header>' +
            '<div class="rk-seg" role="tablist" aria-label="' + esc(tr('periods')) + '" style="--rk-i:' + K.PERIODS.indexOf(per) + '">' +
            K.PERIODS.map(k => '<button type="button" role="tab" class="rk-segb" data-rk="per" data-k="' + k + '" aria-selected="' + (k === per) + '" tabindex="' + (k === per ? 0 : -1) + '">' + esc(tr(k)) + '</button>').join('') + '</div>' +
            '<p class="rk-per">' + esc(perLine(per)) + '</p>' +
            meHTML(list);
        if (!list.length) h += '<p class="rk-empty">' + esc(tr('empty')) + '</p>';
        else {
            h += '<div class="rk-pod n' + top.length + '">' + K.podium(list).map((x, i) => podHTML(x, i)).join('') + '</div>';
            if (list.length > 1) h += '<button type="button" class="rk-cmpb" data-rk="cmp3" aria-haspopup="dialog"><span>' + esc(tr('cmp3')) + '</span><b aria-hidden="true">\u203a</b></button>';
            if (rest.length) h += '<ol class="rk-list">' + rest.map(rowHTML).join('') + '</ol>';
        }
        h += '<p class="rk-how">' + esc(per === 'all' ? tr('howA') : tr('howW')) + '</p>';
        return { h, uids: list.map(x => x.p && x.p.uid).filter(Boolean) };
    }
    function wire(b) {
        if (b.__rk) return; b.__rk = 1;
        b.addEventListener('click', e => {
            const t = e.target.closest('[data-rk]'); if (!t || !b.contains(t)) return;
            if (t.dataset.rk === 'per') { per = K.period(t.dataset.k); try { localStorage.setItem(KEY, per); } catch (er) { } render(b); const n = b.querySelector('.rk-segb[aria-selected="true"]'); if (n) n.focus({ preventScroll: true }); return; }
            if (t.dataset.rk === 'ladder') { openLadder(t); return; }
            if (t.dataset.rk === 'cmp3') { openCmp(null, t); return; }
            /* 23 Oct (Eman: compare the stats): a companion opens You vs them (your own entry: the top 3), the profile is one tap on */
            if (t.dataset.rk === 'open') { openCmp(t.dataset.me === '1' ? null : { uid: t.dataset.uid || '', n: t.dataset.who || '' }, t); }
        });
        b.addEventListener('keydown', e => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const s = e.target.closest('.rk-segb'); if (!s) return;
            const i = K.PERIODS.indexOf(per), n = K.PERIODS[(i + (e.key === 'ArrowRight' ? 1 : K.PERIODS.length - 1)) % K.PERIODS.length];
            e.preventDefault(); const nb = b.querySelector('.rk-segb[data-k="' + n + '"]'); if (nb) nb.click();
        });
    }
    /* ---------- the level ladder (23 Oct 2026, Eman's Skool idea): your level, the XP to the next one, then every level with the
       share of players who reached it. Reached levels glow, locked ones are dimmed with a lock. ---------- */
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
    function perLine(k) { const sp = K.span(k, Date.now()); return sp ? tr(k === 'm' ? 'perM' : 'perW', { d: dShort(sp.start), max: fmt(sp.max) }) : tr('perA'); }
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

    let cmpEl = null, cmpBack = null, cmpWho = null, cmpK = 'w', cmpFrom3 = false;
    const nameOf = p => p && p.me ? tr('you') : String((p && p.n) || tr('hidden'));
    function actsText(acts) { const a = []; ['move', 'meal', 'scan', 'water', 'fast', 'macro'].forEach(s => { const n = acts && acts[s]; if (n) a.push(n === 1 ? tr('a_' + s) : tr('n_' + s, { n })); }); return listOf(a); }
    /* the "what it takes" sentence for me vs them on board k (K.gap does the math) */
    /* 23 Oct: the sun in "what it takes" (and the before-Monday note). The app's emoji pass (spirit.js symbols) swaps a bare \u2600
       for an unlabelled icon, so "You need 7 \u2600 more" read "You need 7 more" to a screen reader and lost its unit. Put the app's
       own sun in, golden and labelled "sunbeams". Without the icon set (offline tests) it stays the plain \u2600. */
    function sunHTML(h) {
        const I = W.LowiIcons; if (!I || typeof I.svg !== 'function') return h;
        let ico = ''; try { ico = I.svg('sun', { label: tr('sun'), cls: 'rk-sun' }); } catch (e) { return h; }
        return ico ? String(h).split('\u2600').join(ico) : h;
    }
    function gapText(me, them, k) {
        const now = Date.now(), mx = k === 'all' ? null : myMix(k);
        if (!them) { if (me) return tr('alone'); const sp = K.span(k, now); return k === 'all' ? tr('inA') : tr('inW', { d: dDay(sp.end) }); }
        const g = K.gap(me, them, k, now, { mix: mx, pace: K.pace(ledger(), now), PTS: W.LowiSun && W.LowiSun.PTS }), nm = nameOf(them.p);
        if (!g || g.self) return '';
        if (g.ahead && g.tie) { const why = tr('tb_' + g.why); return k === 'all' ? tr('tieA', { n: nm, x: fmt(me.pts), why }) : g.theyCan ? tr('tie', { n: nm, x: fmt(me.pts), why, d: dDay(g.end) }) : tr('tieSafe', { n: nm, x: fmt(me.pts), why }); }
        if (g.ahead) return k === 'all' ? tr('leadA', { n: nm, x: fmt(g.lead) }) : g.theyCan ? tr('lead', { n: nm, x: fmt(g.lead), y: fmt(g.theyNeed), d: dDay(g.end) }) : tr('leadSafe', { n: nm, x: fmt(g.lead), d: dDay(g.end) });
        if (g.unit === 'xp') return tr('passA', { n: nm, x: fmt(g.need) }) + (g.days ? ' ' + (g.days <= 1 ? tr('pace1', { p: fmt(g.pace) }) : tr('paceN', { p: fmt(g.pace), n: g.days })) : '');
        if (!g.possible) return tr('noWay', { n: nm, x: fmt(g.short), d: dDay(g.end) });
        let s = tr('pass', { n: nm, x: fmt(g.need), d: dDay(g.end) });
        if (!g.rest) s += ' ' + tr('today', { acts: actsText(g.today.acts), p: g.today.pts });
        else {
            s += ' ' + (g.today.pts ? tr('todayPart', { acts: actsText(g.today.acts), p: g.today.pts }) : tr('todayFull'));
            s += ' ' + (g.restDays === 1 ? tr('rest1', { r: g.rest }) : tr('restN', { r: g.rest, n: g.restDays }));
        }
        return s;
    }
    function segHTML() {
        return '<div class="rk-cmp-seg" role="tablist" aria-label="' + esc(tr('periods')) + '" style="--rk-i:' + K.PERIODS.indexOf(cmpK) + '">' +
            K.PERIODS.map(k => '<button type="button" role="tab" class="rk-segb" data-cmp="per" data-k="' + k + '" aria-selected="' + (k === cmpK) + '" tabindex="' + (k === cmpK ? 0 : -1) + '">' + esc(tr(k)) + '</button>').join('') + '</div>';
    }
    const cell = (v, r, unitK) => v > 0 || r ? '<b class="num">' + fmt(v) + '</b><small>' + (r ? '#' + r : '\u2013') + '</small>' : '<b class="num">0</b><small>\u2013</small>';
    function headHTML(title, arts) {
        return '<div class="rk-lad-h rk-cmp-h">' + (cmpFrom3 && cmpWho ? '<button type="button" class="rk-cmp-bk" data-cmp="top">\u2039 ' + esc(tr('back3')) + '</button>' : '') + (arts || '') +
            '<h3 class="rk-cmp-t">' + esc(title) + '</h3><button type="button" class="rk-lad-x" data-cmp="close" aria-label="' + esc(tr('close')) + '">\u00d7</button></div>';
    }
    /* You vs one person: every board, the stats of the chosen one, the breakdown and what it takes */
    function pairHTML(who) {
        const k = cmpK, now = Date.now(), mc = myCare(), ppl = people(), list = K.rows(ppl, k, now, mc), me = K.mine(list);
        const them = list.find(x => K.same(x.p, who)) || null, tp = them ? them.p : (ppl.find(p => K.same(p, who)) || Object.assign({ n: '' }, who));
        const self = ppl.find(p => p && p.me) || { me: true, n: '' }, cM = companion(self, me ? me.lv : K.level(self)), cT = companion(tp, them ? them.lv : K.level(tp));
        const nm = nameOf(tp), aM = K.across(ppl, now, mc, self), aT = K.across(ppl, now, mc, tp), sp = K.span(k, now);
        let h = headHTML(tr('vs', { n: nm }), '<span class="rk-cmp-arts">' + art(cM, 'rkcm', false) + art(cT, 'rkct', false) + '</span>');
        h += '<div class="rk-cmp-b">' + segHTML() + '<p class="rk-cmp-per">' + esc(perLine(k)) + '</p>';
        const win = (a, b) => a > b ? ' win' : '';
        h += '<table class="rk-cmp-tb"><caption>' + esc(tr('boards')) + '</caption><thead><tr><th></th><th scope="col"><span class="rk-cmp-cn">' + esc(cM ? cM.name : 'Misty') + '</span><small>' + esc(tr('you')) + '</small></th>' +
            '<th scope="col"><span class="rk-cmp-cn">' + esc(cT ? cT.name : tr('hidden')) + '</span><small>' + esc(nm) + '</small></th></tr></thead><tbody>';
        K.PERIODS.forEach(kk => {
            const a = aM[kk], b = aT[kk];
            h += '<tr class="' + (kk === k ? 'cur' : '') + '"><th scope="row">' + esc(tr(kk)) + '<small>' + esc(kk === 'all' ? tr('xp') : '\u2600') + '</small></th><td class="' + win(a.pts, b.pts) + '">' + cell(a.pts, a.rank) + '</td><td class="' + win(b.pts, a.pts) + '">' + cell(b.pts, b.rank) + '</td></tr>';
        });
        if (sp) {
            const a = aM[k], b = aT[k], av = x => (Math.round(x / Math.max(1, sp.soFar) * 10) / 10).toLocaleString(LOC[lang()]);
            h += '<tr class="sub"><th scope="row">' + esc(tr('perDay')) + '<small>' + esc(tr(k)) + '</small></th><td class="' + win(a.pts, b.pts) + '"><b class="num">' + av(a.pts) + '</b></td><td class="' + win(b.pts, a.pts) + '"><b class="num">' + av(b.pts) + '</b></td></tr>' +
                '<tr class="sub"><th scope="row">' + esc(tr('fullDays')) + '<small>' + esc(tr(k)) + '</small></th><td class="' + win(a.full, b.full) + '"><b class="num">' + a.full + '</b></td><td class="' + win(b.full, a.full) + '"><b class="num">' + b.full + '</b></td></tr>';
        }
        const lvM = me ? me.lv : K.level(self), lvT = them ? them.lv : K.level(tp);
        h += '<tr class="sub"><th scope="row">' + esc(tr('lvRow')) + '</th><td class="' + win(lvM, lvT) + '"><b class="num">' + lvM + '</b></td><td class="' + win(lvT, lvM) + '"><b class="num">' + lvT + '</b></td></tr></tbody></table>';
        /* the week inside this month: what each had before Monday makes Week and Month disagree */
        const ws = K.span('w', now), ms = K.span('m', now);
        if (k !== 'all' && ws && ms && ws.start >= ms.start && (aM.m.pts || aT.m.pts)) h += '<p class="rk-cmp-note">' + sunHTML(esc(tr('before', { a: fmt(Math.max(0, aM.m.pts - aM.w.pts)), n: nm, b: fmt(Math.max(0, aT.m.pts - aT.w.pts)) }))) + '</p>';
        h += '<section class="rk-cmp-s"><h4>' + esc(tr('srcT')) + '</h4>' + srcHTML(k, them, tp, cT, nm) + '</section>';
        h += '<section class="rk-cmp-s rk-cmp-need"><h4>' + esc(tr('needT')) + '</h4><p>' + sunHTML(esc(gapText(me, them, k))) + '</p></section>';
        h += '<p class="rk-cmp-why">' + esc(tr('whyGen')) + '</p>';
        if (tp && (tp.uid || tp.n)) h += '<button type="button" class="rk-cmpb rk-cmp-pf" data-cmp="profile" data-uid="' + esc(tp.uid || '') + '" data-who="' + esc(tp.n || '') + '"><span>' + esc(tr('profile', { n: nm })) + '</span><b aria-hidden="true">\u203a</b></button>';
        return h + '</div>';
    }
    function srcHTML(k, them, tp, cT, nm) {
        if (k === 'all') return '<p class="rk-cmp-note">' + esc(tr('srcA')) + '</p>';
        const mm = myMix(k), ts = them && cT && tp && tp.uid ? K.mixOf(mixes[tp.uid], k, Date.now(), them.pts) : null;
        const mine = mm ? mm.src : {}, rowsS = K.SRC.filter(s => (mine[s] || 0) || (ts && ts[s]));
        let h = '';
        if (rowsS.length) {
            const max = Math.max(1, ...rowsS.map(s => Math.max(mine[s] || 0, ts ? ts[s] || 0 : 0)));
            const bar = (v, cls) => '<span class="rk-bar ' + cls + '"><i style="width:' + Math.round((v || 0) / max * 100) + '%"></i></span><b class="num">' + fmt(v || 0) + '</b>';
            h += '<ul class="rk-src' + (ts ? ' two' : '') + '">' + rowsS.map(s => '<li><span class="rk-src-n">' + esc(tr('s_' + s)) + '</span><span class="rk-src-v">' + bar(mine[s], 'me') + '</span>' + (ts ? '<span class="rk-src-v">' + bar(ts[s], 'them') + '</span>' : '') + '</li>').join('') + '</ul>';
            h += '<p class="rk-src-k"><i class="me"></i>' + esc(tr('you')) + (ts ? ' <i class="them"></i>' + esc(nm) : '') + '</p>';
        } else h += '<p class="rk-cmp-note">' + esc(tr('srcEmpty')) + '</p>';
        if (!ts && them && !tp.me) h += '<p class="rk-cmp-note">' + esc(cT ? tr('srcNone', { n: nm }) : tr('srcHid', { n: nm })) + '</p>';
        return h;
    }
    /* the top 3 of the chosen board (and you), with every board's number and place side by side */
    function top3HTML() {
        const k = cmpK, now = Date.now(), mc = myCare(), ppl = people(), list = K.rows(ppl, k, now, mc), me = K.mine(list);
        const pick = list.slice(0, 3).concat(me && me.rank > 3 ? [me] : []);
        let h = headHTML(tr('cmpT3')) + '<div class="rk-cmp-b">' + segHTML() + '<p class="rk-cmp-per">' + esc(perLine(k)) + '</p>';
        h += '<table class="rk-cmp-tb rk-cmp-t3"><thead><tr><th></th>' + K.PERIODS.map(kk => '<th scope="col" class="' + (kk === k ? 'cur' : '') + '">' + esc(tr(kk)) + '<small>' + esc(kk === 'all' ? tr('xp') : '\u2600') + '</small></th>').join('') + '</tr></thead><tbody>';
        pick.forEach(x => {
            const c = companion(x.p, x.lv), a = K.across(ppl, now, mc, x.p);
            h += '<tr class="' + (x.p.me ? 'me' : '') + '"' + (x.p.me ? '' : ' data-cmp="pair" data-uid="' + esc(x.p.uid || '') + '" data-who="' + esc(x.p.n || '') + '" tabindex="0" role="button" aria-label="' + esc(tr('vs', { n: nameOf(x.p) })) + '"') + '>' +
                '<th scope="row"><span class="rk-cmp-rk num">' + x.rank + '</span>' + art(c, 'rk3' + x.rank, false) + '<span class="rk-cmp-who"><span class="rk-cmp-cn">' + esc(c ? c.name : tr('hidden')) + '</span><small>' + esc(nameOf(x.p)) + '</small></span></th>' +
                K.PERIODS.map(kk => '<td class="' + (kk === k ? 'cur' : '') + '">' + cell(a[kk].pts, a[kk].rank) + '</td>').join('') + '</tr>';
        });
        h += '</tbody></table><p class="rk-cmp-why">' + esc(tr('whyGen')) + '</p>';
        h += '<section class="rk-cmp-s rk-cmp-need"><h4>' + esc(tr('needYou')) + '</h4><ul>' + K.PERIODS.map(kk => {
            const rv = K.rival(K.rows(ppl, kk, now, mc), kk);
            return '<li class="' + (kk === k ? 'cur' : '') + '"><b>' + esc(tr(kk)) + '</b> ' + sunHTML(esc(gapText(rv.me, rv.them, kk))) + '</li>';
        }).join('') + '</ul></section>';
        return h + '</div>';
    }
    function cmpHTML() { return cmpWho ? pairHTML(cmpWho) : top3HTML(); }
    function drawCmp(focusSel) {
        if (!cmpEl) return; const d = cmpEl.querySelector('.rk-cmp'); if (!d) return;
        d.setAttribute('aria-label', cmpWho ? tr('vs', { n: cmpWho.n || tr('hidden') }) : tr('cmpT3'));
        d.innerHTML = cmpHTML();
        if (focusSel) { const f = d.querySelector(focusSel); if (f) f.focus({ preventScroll: true }); }
    }
    function closeCmp() {
        if (!cmpEl) return;
        const el = cmpEl, back = cmpBack; cmpEl = null; cmpBack = null;
        el.classList.remove('in'); D.removeEventListener('keydown', cmpKey, true);
        setTimeout(() => { try { el.remove(); } catch (e) { } }, 220);
        try { if (back && back.focus && back.isConnected) back.focus({ preventScroll: true }); } catch (e) { }
    }
    function cmpKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); closeCmp(); return; }
        if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('tr[data-cmp="pair"]')) { e.preventDefault(); e.target.click(); }
    }
    function openCmp(who, from) {
        if (ladEl) closeLadder();
        if (cmpEl) closeCmp();
        cmpWho = who && (who.uid || who.n) ? { uid: who.uid || '', n: who.n || '' } : null; cmpFrom3 = false; cmpK = per;
        const el = D.createElement('div');
        el.className = 'rk-lad-wrap rk-cmp-wrap'; el.setAttribute('data-noi18n', '');
        el.innerHTML = '<div class="rk-lad rk-cmp" role="dialog" aria-modal="true"></div>';
        el.addEventListener('click', e => {
            if (e.target === el) { closeCmp(); return; }
            const t = e.target.closest('[data-cmp]'); if (!t) return;
            const a = t.dataset.cmp;
            if (a === 'close') closeCmp();
            else if (a === 'per') { cmpK = K.period(t.dataset.k); drawCmp('.rk-segb[aria-selected="true"]'); }
            else if (a === 'pair') { cmpWho = { uid: t.dataset.uid || '', n: t.dataset.who || '' }; cmpFrom3 = true; drawCmp('.rk-lad-x'); const b = el.querySelector('.rk-cmp-b'); if (b) b.scrollTop = 0; }
            else if (a === 'top') { cmpWho = null; cmpFrom3 = false; drawCmp('.rk-lad-x'); }
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
    function render(b) {
        if (!b) return; box = b; wire(b);
        const r = html(), key = per + '|' + lang() + '|' + r.h.length + '|' + r.h;
        if (b.__rkH !== key) { b.__rkH = key; b.innerHTML = '<div class="rk" data-noi18n>' + r.h + '</div>'; }
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
        openCompare: openCmp, closeCompare: closeCmp, _compare: (who, k) => { const a = cmpWho, b = cmpK, c = cmpFrom3; cmpWho = who || null; cmpK = K.period(k || per); cmpFrom3 = false; try { return cmpHTML(); } finally { cmpWho = a; cmpK = b; cmpFrom3 = c; } }, _mixes: m => { if (m) mixes = m; return mixes; } };
})();
