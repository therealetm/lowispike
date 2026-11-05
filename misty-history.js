/* misty-history.js (Nov 5 2026, Misty sheet plan phase 3): the History tab of Misty's long-press sheet. Yesterday, Week, Month,
   Year as a small segmented choice, ‹ › to step back and forward, then the same three groups as Today in the Settings row design:
   You (meals, estimates, water, Move, steps, weight from-to with the full chart one tap away), and the companion (XP, level ups).
   World glow of past days is not saved, so History leaves it out on purpose (plan, "one limit"). Nothing is written.
   API: window.LowiMistyHistory = { html(name), state } */
(function () {
    'use strict';
    const W = window, D = document;
    if (W.LowiMistyHistory) return;
    const M = () => W.LowiMistySheet;
    const st = { kind: 'week', back: 0 };
    const KINDS = ['yesterday', 'week', 'month', 'year'];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const T = (en, de, es) => (M() && M()._T ? M()._T(en, de, es) : en);
    const loc = () => { const t = T('en', 'de', 'es'); return t === 'de' ? 'de-DE' : t === 'es' ? 'es-ES' : 'en-GB'; };
    const fmt = (n, d) => { try { return Number(n).toLocaleString(loc(), { maximumFractionDigits: d || 0 }); } catch (e) { return String(n); } };
    const at = k => { const p = String(k).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 12); };
    function rangeTxt(p) {
        try {
            if (p.n === 1) return at(p.end).toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' });
            const a = at(p.start), b = at(p.end), y = a.getFullYear() !== b.getFullYear();
            return a.toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: y ? 'numeric' : undefined }) + ' \u2013 ' + b.toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: p.n >= 365 || y ? 'numeric' : undefined });
        } catch (e) { return p.start + ' \u2013 ' + p.end; }
    }
    function html(name) {
        const S = M(); if (!S) return '';
        const p = S.period(st.kind, st.back); if (!p) return '';
        const lab = { yesterday: T('Yesterday', 'Gestern', 'Ayer'), week: T('Week', 'Woche', 'Semana'), month: T('Month', 'Monat', 'Mes'), year: T('Year', 'Jahr', 'A\u00f1o') };
        const seg = '<div class="mh-seg mh-seg2" role="radiogroup" aria-label="' + esc(T('Period', 'Zeitraum', 'Periodo')) + '">' + KINDS.map(k => '<button type="button" role="radio" class="mh-tab' + (st.kind === k ? ' on' : '') + '" data-mhh="kind" data-k="' + k + '" aria-checked="' + (st.kind === k) + '">' + esc(lab[k]) + '</button>').join('') + '</div>';
        const nav = '<div class="mh-hnav"><button type="button" class="mh-hstep" data-mhh="older" aria-label="' + esc(T('Earlier', 'Fr\u00fcher', 'Antes')) + '"' + (st.back >= (st.kind === 'year' ? 4 : st.kind === 'month' ? 24 : st.kind === 'week' ? 104 : 730) ? ' disabled' : '') + '>\u2039</button>' +
            '<b class="mh-hrange">' + esc(rangeTxt(p)) + '</b>' +
            '<button type="button" class="mh-hstep" data-mhh="newer" aria-label="' + esc(T('Later', 'Sp\u00e4ter', 'Despu\u00e9s')) + '"' + (st.back <= 0 ? ' disabled' : '') + '>\u203a</button></div>';
        if (p.empty) return seg + nav + S.sec(T('You', 'Du', 'T\u00fa'), S.row({ b: T('No entries', 'Keine Eintr\u00e4ge', 'Sin registros'), sub: T('Nothing was logged on this phone in this time.', 'In dieser Zeit wurde auf diesem Handy nichts eingetragen.', 'No se registr\u00f3 nada en este m\u00f3vil en este periodo.'), empty: true }));
        if (p.n === 1) {
            const d = p.days[0];
            return seg + nav + S.sec(T('You', 'Du', 'T\u00fa'), S.youRows(d, { weightOfDay: true, noAct: true })) + S.sec(name, S.xpRows(d, name));
        }
        const c = p.counts, vv = [];
        if (c.low) vv.push(c.low + ' ' + T('small rise', 'kleiner Anstieg', 'subida peque\u00f1a')); if (c.medium) vv.push(c.medium + ' ' + T('medium rise', 'mittlerer Anstieg', 'subida media')); if (c.high) vv.push(c.high + ' ' + T('likely spike', 'wahrscheinlicher Spike', 'pico probable'));
        const none = T('No entries', 'Keine Eintr\u00e4ge', 'Sin registros');
        const days = n => n === 1 ? T('1 day', '1 Tag', '1 d\u00eda') : T(n + ' days', n + ' Tage', n + ' d\u00edas');
        let you = S.row({ b: T('Food', 'Essen', 'Comida'), empty: !p.meals, sub: p.meals ? T(p.meals + ' meals on ', p.meals + ' Mahlzeiten an ', p.meals + ' comidas en ') + days(p.mealDays) + (vv.length ? ' \u00b7 ' + vv.join(' \u00b7 ') : '') : none });
        if (p.meals && (p.kcal || p.protein)) you += S.row({ b: T('Estimated', 'Gesch\u00e4tzt', 'Estimado'), sub: T('Average of ' + p.mealDays + ' logged days out of ' + p.n, '\u00d8 aus ' + p.mealDays + ' Tagen mit Eintrag von ' + p.n, 'Media de ' + p.mealDays + ' d\u00edas con registro de ' + p.n), v: '\u2248 ' + fmt(p.kcal) + ' kcal \u00b7 ' + fmt(p.protein) + ' g' });
        you += S.row({ b: T('Water', 'Wasser', 'Agua'), empty: !p.waterDays, sub: p.waterDays ? T('\u00d8 ' + fmt(p.water, 1) + ' glasses on ', '\u00d8 ' + fmt(p.water, 1) + ' Gl\u00e4ser an ', '\u00d8 ' + fmt(p.water, 1) + ' vasos en ') + days(p.waterDays) : none });
        const sb = p.stepsBy, sp = [];
        if (sb.casual) sp.push(T('under 5k', 'unter 5k', 'menos de 5k') + ' \u00d7' + sb.casual); if (sb.steady) sp.push('5k\u201310k \u00d7' + sb.steady); if (sb.epic) sp.push('10k+ \u00d7' + sb.epic);
        you += S.row({ b: 'Move', empty: !p.moveDays, sub: p.moveDays ? days(p.moveDays) + (p.moveMin ? ' \u00b7 ' + fmt(p.moveMin) + ' min' : '') : none });
        you += S.row({ b: T('Steps', 'Schritte', 'Pasos'), empty: !sp.length, sub: sp.length ? sp.join(' \u00b7 ') + ' \u00b7 ' + T('your estimate', 'deine Sch\u00e4tzung', 'tu estimaci\u00f3n') : none });
        const wt = p.weights.length;
        you += '<button type="button" class="cme-row ms-row' + (wt ? '' : ' ms-empty') + '" data-msx="weight"><span class="cme-ico"></span><span class="cme-tx"><b>' + esc(T('Weight', 'Gewicht', 'Peso')) + '</b><small>' +
            esc(wt ? (wt === 1 ? fmt(p.weightTo, 1) + ' kg' : fmt(p.weightFrom, 1) + ' \u2192 ' + fmt(p.weightTo, 1) + ' kg \u00b7 ' + T(wt + ' weigh-ins', wt + ' Wiegungen', wt + ' pesajes')) : T('No weigh-in in this time', 'Kein Wiegen in dieser Zeit', 'Sin pesaje en este periodo')) +
            '</small></span><span class="cme-st">' + esc(T('Chart', 'Verlauf', 'Gr\u00e1fico')) + '</span><svg class="cme-chev" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>';
        const comp = S.row({ b: T('XP for ' + name, 'XP f\u00fcr ' + name, 'XP para ' + name), empty: !p.xp, sub: p.xp ? T('on ', 'an ', 'en ') + days(p.days.filter(d => d.xp).length) : none, v: p.xp ? '+' + fmt(p.xp) + ' XP' : '' }) +
            (p.levels ? S.row({ b: T('Level ups', 'Level-Aufstiege', 'Subidas de nivel'), v: '+' + p.levels }) : '');
        return seg + nav + S.sec(T('You', 'Du', 'T\u00fa'), you) + S.sec(name, comp) +
            '<p class="mh-hnote">' + esc(T('From what this phone keeps. Food numbers are estimates; averages count only days with an entry.', 'Aus dem, was dieses Handy speichert. Essenswerte sind Sch\u00e4tzungen; Durchschnitte z\u00e4hlen nur Tage mit Eintrag.', 'Con lo que guarda este m\u00f3vil. Los valores de comida son estimaciones; las medias cuentan solo d\u00edas con registro.')) + '</p>';
    }
    D.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('#mistyHub [data-mhh]'); if (!b || b.disabled) return;
        const a = b.getAttribute('data-mhh');
        if (a === 'kind') { const k = b.getAttribute('data-k'); if (KINDS.indexOf(k) < 0 || k === st.kind) return; st.kind = k; st.back = 0; }
        else if (a === 'older') st.back++;
        else if (a === 'newer') st.back = Math.max(0, st.back - 1);
        else return;
        const body = D.querySelector('#mistyHub .mh-body'); if (!body) return;
        const nm = (D.querySelector('#mistyHub .mh-name h2') || {}).textContent || 'Misty';
        body.innerHTML = html(nm);
        const f = body.querySelector(a === 'kind' ? '.mh-seg2 .mh-tab.on' : '[data-mhh="' + a + '"]:not([disabled])') || body.querySelector('.mh-hrange');
        try { f && f.focus({ preventScroll: true }); } catch (x) { }
    });
    W.LowiMistyHistory = { html, state: st };
})();
