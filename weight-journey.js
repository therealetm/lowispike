/* weight-journey.js: the weight journey, built INTO the Weight & BMI sheet (Oct 22 2026, Emmanuel: "Can we have the weight BMI and
   the weight journey just mixed together? ... in the same user design ... Don't have like Doppelt-Gemoppelt ... extremely simple").
   There is no second sheet any more: body-stats.js owns the one dark glass sheet (header with kg/lb, BMI + body fat, the one weight
   input with Update today) and gives this module a host element under it. Here: progress (start, goal with Edit, since start, to go,
   one bar), the chart (W / M / 3M / Y / All / Since start, Day 1 marker, dashed goal line) and the weigh-ins list (tap one to edit or
   delete it). Encouraging on purpose: no "Over" label, no red, nothing that shames. All maths in weight-journey-core.js. Writes only
   S.health.body.weights / .journey and S.health.weight, then LowiR2.save(); nothing leaves the device.
   Old ways in (Your details, Settings, [data-wj-open], LowiWeightJourney.open()) all open the merged Weight & BMI sheet.
   API: window.LowiWeightJourney = { open(opts), close(), isOpen(), cardHTML(), mount(host), render(), unmount(), setUnit(u), core } */
(function () {
    'use strict';
    const W = window, D = document, C = W.LowiWeightJourneyCore;
    if (!C || W.LowiWeightJourney) return;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lang = () => { let l = 'en'; try { l = (W.LowiLang && LowiLang.get && LowiLang.get()) || D.documentElement.lang || 'en'; } catch (e) { } l = String(l).slice(0, 2); return l === 'de' || l === 'es' ? l : 'en'; };
    const T = {
        en: { title: 'Weight journey', prog: 'Your progress', close: 'Close', current: 'Current weight', day: 'Day {n}', since: 'since {d}', setup: 'Set your starting point', setupTx: 'When did your journey or challenge start? Pick day 1, your weight that day and, if you like, a goal.',
            startDate: 'Start date', startW: 'Start weight', goal: 'Goal weight', optional: 'optional', saveStart: 'Save starting point', edit: 'Edit', start: 'Start', goalShort: 'Goal', add: 'Add weight', date: 'Date', weight: 'Weight', save: 'Save', cancel: 'Cancel', del: 'Delete',
            editEntry: 'Edit weigh-in', today: 'Today', entries: 'Weigh-ins', showAll: 'Show all {n}', none: 'No weigh-ins yet. Add your first one and your line starts here.', noneRange: 'No weigh-ins in this range.', one: 'One weigh-in so far. Add another to see your line.',
            P: { W: 'W', M: 'M', '3M': '3M', Y: 'Y', all: 'All', start: 'Since start' }, prev: 'Earlier', next: 'Later', chart: 'Weight chart', sinceStart: 'Since start', toGoal: 'To goal', weekly: 'Weekly rate', monthly: 'Monthly rate', highest: 'Highest', lowest: 'Lowest',
            perWeek: '/ week', perMonth: '/ month', toGo: '{v} to go', reached: 'Goal reached', setGoal: 'Set a goal', down: 'Heading down', up: 'Heading up', steady: 'Holding steady', needMore: 'Needs a few days', latest: 'Latest', peak: 'Highest',
            cheerDown: 'Every weigh-in counts. Keep going.', cheerUp: 'Ups and downs are normal. Your line, your pace.', units: 'Units', private: 'Private: stays on this phone and is never sent anywhere.', badW: 'Enter a weight between {a} and {b} {u}.', badD: 'Pick a date that isn’t in the future.', saved: 'Saved', open: 'Open weight journey', of: 'of {v}' },
        de: { title: 'Gewichtsreise', prog: 'Dein Fortschritt', close: 'Schließen', current: 'Aktuelles Gewicht', day: 'Tag {n}', since: 'seit {d}', setup: 'Leg deinen Startpunkt fest', setupTx: 'Wann hat deine Reise oder Challenge begonnen? Wähl Tag 1, dein Gewicht an dem Tag und, wenn du magst, ein Ziel.',
            startDate: 'Startdatum', startW: 'Startgewicht', goal: 'Zielgewicht', optional: 'optional', saveStart: 'Startpunkt speichern', edit: 'Ändern', start: 'Start', goalShort: 'Ziel', add: 'Gewicht eintragen', date: 'Datum', weight: 'Gewicht', save: 'Speichern', cancel: 'Abbrechen', del: 'Löschen',
            editEntry: 'Eintrag ändern', today: 'Heute', entries: 'Einträge', showAll: 'Alle {n} zeigen', none: 'Noch keine Einträge. Trag dein erstes Gewicht ein, dann beginnt hier deine Linie.', noneRange: 'In diesem Zeitraum gibt es keine Einträge.', one: 'Ein Eintrag bisher. Trag noch einen ein, dann siehst du deine Linie.',
            P: { W: 'W', M: 'M', '3M': '3M', Y: 'J', all: 'Alle', start: 'Seit Start' }, prev: 'Früher', next: 'Später', chart: 'Gewichtsdiagramm', sinceStart: 'Seit Start', toGoal: 'Bis zum Ziel', weekly: 'Pro Woche', monthly: 'Pro Monat', highest: 'Höchster Wert', lowest: 'Niedrigster Wert',
            perWeek: '/ Woche', perMonth: '/ Monat', toGo: 'noch {v}', reached: 'Ziel erreicht', setGoal: 'Ziel festlegen', down: 'Geht runter', up: 'Geht hoch', steady: 'Bleibt stabil', needMore: 'Braucht ein paar Tage', latest: 'Zuletzt', peak: 'Höchster',
            cheerDown: 'Jeder Eintrag zählt. Bleib dran.', cheerUp: 'Auf und ab ist normal. Deine Linie, dein Tempo.', units: 'Einheit', private: 'Privat: bleibt auf diesem Handy und wird nirgendwohin gesendet.', badW: 'Gib ein Gewicht zwischen {a} und {b} {u} ein.', badD: 'Wähl ein Datum, das nicht in der Zukunft liegt.', saved: 'Gespeichert', open: 'Gewichtsreise öffnen', of: 'von {v}' },
        es: { title: 'Tu camino de peso', prog: 'Tu progreso', close: 'Cerrar', current: 'Peso actual', day: 'Día {n}', since: 'desde el {d}', setup: 'Marca tu punto de partida', setupTx: '¿Cuándo empezó tu camino o tu reto? Elige el día 1, tu peso ese día y, si quieres, una meta.',
            startDate: 'Fecha de inicio', startW: 'Peso inicial', goal: 'Peso meta', optional: 'opcional', saveStart: 'Guardar punto de partida', edit: 'Cambiar', start: 'Inicio', goalShort: 'Meta', add: 'Añadir peso', date: 'Fecha', weight: 'Peso', save: 'Guardar', cancel: 'Cancelar', del: 'Borrar',
            editEntry: 'Editar pesaje', today: 'Hoy', entries: 'Pesajes', showAll: 'Ver los {n}', none: 'Aún no hay pesajes. Añade el primero y tu línea empieza aquí.', noneRange: 'No hay pesajes en este periodo.', one: 'Un pesaje por ahora. Añade otro para ver tu línea.',
            P: { W: 'S', M: 'M', '3M': '3M', Y: 'A', all: 'Todo', start: 'Desde el inicio' }, prev: 'Antes', next: 'Después', chart: 'Gráfico de peso', sinceStart: 'Desde el inicio', toGoal: 'Hasta la meta', weekly: 'Por semana', monthly: 'Por mes', highest: 'Más alto', lowest: 'Más bajo',
            perWeek: '/ semana', perMonth: '/ mes', toGo: 'faltan {v}', reached: 'Meta alcanzada', setGoal: 'Pon una meta', down: 'Bajando', up: 'Subiendo', steady: 'Estable', needMore: 'Faltan unos días', latest: 'Último', peak: 'Más alto',
            cheerDown: 'Cada pesaje cuenta. Sigue así.', cheerUp: 'Subir y bajar es normal. Tu línea, tu ritmo.', units: 'Unidades', private: 'Privado: se queda en este teléfono y nunca se envía a ningún sitio.', badW: 'Escribe un peso entre {a} y {b} {u}.', badD: 'Elige una fecha que no sea futura.', saved: 'Guardado', open: 'Abrir tu camino de peso', of: 'de {v}' }
    };
    const tr = (k, v) => { const L = T[lang()] || T.en; let s = L[k] !== undefined ? L[k] : T.en[k] !== undefined ? T.en[k] : k; if (v && typeof s === 'string') Object.keys(v).forEach(n => { s = s.split('{' + n + '}').join(v[n]); }); return s; };
    const loc = () => lang() === 'de' ? 'de-DE' : lang() === 'es' ? 'es-ES' : 'en-GB';
    const fmt = n => { if (n === null || n === undefined || !Number.isFinite(n)) return '–'; const s = (Math.round(n * 10) / 10).toFixed(1); return lang() === 'en' ? s : s.replace('.', ','); };
    const dOf = (ts, o) => { try { return new Date(ts).toLocaleDateString(loc(), o || { day: 'numeric', month: 'short' }); } catch (e) { return C.dayKey(ts); } };
    const R2 = () => W.LowiR2 || null;
    const state = () => { try { const r = R2(); return r && r.S ? r.S() : null; } catch (e) { return null; } };
    const persist = () => { try { const r = R2(); if (r && r.save) r.save(); } catch (e) { } };
    const fire = () => { try { const s = state(); W.dispatchEvent(new CustomEvent('lowi:body-weighin', { detail: { kg: s ? C.num(s.health.weight) : null, source: 'journey' } })); } catch (e) { } };
    let host = null, period = null, pendingPeriod = null, offset = 0, form = null, setupOpen = false, showAll = false, ro = null;
    const unit = s => C.journey(s).unit;
    const u = s => unit(s) === 'lb' ? 'lb' : 'kg';
    const v = (kg, s) => fmt(C.show(kg, unit(s)));
    const signed = (kg, s) => { if (kg === null || kg === undefined) return '–'; const x = C.show(Math.abs(kg), unit(s)); return (kg < -0.004 ? '−' : kg > 0.004 ? '+' : '±') + fmt(x); };
    /* progress is the way the goal points (or down, the app's 30-day angle, when no goal is set); the other way stays neutral, never red */
    const good = (kg, st) => kg !== null && Math.abs(kg) >= 0.05 && (st.goalDir === 'up' ? kg > 0 : kg < 0);
    function setupHTML(s, st) {
        const j = st.journey;
        const today = C.dayKey(Date.now());
        const val = kg => kg === null || kg === undefined ? '' : String(C.show(kg, unit(s)));
        return '<form class="wj-card wj-setup" data-wj-form="setup" novalidate><h3>' + esc(tr('setup')) + '</h3><p>' + esc(tr('setupTx')) + '</p>' +
            '<div class="wj-fields"><label><span>' + esc(tr('startDate')) + '</span><input type="date" id="wjStart" max="' + today + '" value="' + esc(j.start || (st.all[0] ? st.all[0].day : today)) + '" required></label>' +
            '<label><span>' + esc(tr('startW')) + ' (' + u(s) + ')</span><input id="wjStartW" inputmode="decimal" autocomplete="off" value="' + esc(val(j.startKg !== null ? j.startKg : st.startKg)) + '" placeholder="' + (u(s) === 'lb' ? '236.5' : '107.6') + '"></label>' +
            '<label><span>' + esc(tr('goal')) + ' (' + u(s) + ') <em>' + esc(tr('optional')) + '</em></span><input id="wjGoal" inputmode="decimal" autocomplete="off" value="' + esc(val(j.goalKg)) + '" placeholder="' + (u(s) === 'lb' ? '206.5' : '94.0') + '"></label></div>' +
            '<p class="wj-err" id="wjSetupErr" role="alert"></p><div class="wj-row"><button type="submit" class="wj-btn">' + esc(tr('saveStart')) + '</button>' + '<button type="button" class="wj-btn wj-ghost" data-wj="setup-cancel">' + esc(tr('cancel')) + '</button>' + '</div></form>';
    }
    function tabsHTML(st) {
        const ids = st.journey.start ? C.PERIODS : C.PERIODS.filter(p => p !== 'start'), P = tr('P');
        const r = st.range, sameY = new Date(r.from).getFullYear() === new Date(r.to).getFullYear();
        const label = dOf(r.from, sameY ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }) + ' – ' + dOf(Math.min(r.to, Date.now()), { day: 'numeric', month: 'short', year: 'numeric' });
        return '<div class="wj-tabs" role="tablist">' + ids.map(p => '<button type="button" role="tab" class="wj-tab' + (p === 'start' ? ' wj-tab-start' : '') + '" data-wj-p="' + p + '" aria-selected="' + (p === st.period) + '">' + esc(P[p]) + '</button>').join('') + '</div>' +
            '<div class="wj-range">' + (r.nav ? '<button type="button" class="wj-arrow" data-wj="prev" aria-label="' + esc(tr('prev')) + '">‹</button>' : '<span class="wj-arrow-sp"></span>') + '<b>' + esc(label) + '</b>' +
            (r.nav ? '<button type="button" class="wj-arrow" data-wj="next" aria-label="' + esc(tr('next')) + '"' + (offset >= 0 ? ' disabled' : '') + '>›</button>' : '<span class="wj-arrow-sp"></span>') + '</div>';
    }
    /* the graphic: drawn at the box's real width so text never stretches; plain SVG, no blur, cheap to redraw on a phone */
    function chartSVG(s, st, Wd) {
        const list = st.list, j = st.journey, U = unit(s), Hd = 216, PL = 40, PR = 14, PT = 26, PB = 26;
        if (!list.length) return '<p class="wj-empty wj-chart-empty">' + esc(st.all.length ? tr('noneRange') : tr('none')) + '</p>';
        const r = st.range, startTs = j.start ? C.dayStart(j.start) : null, startIn = startTs !== null && startTs >= r.from && startTs <= r.to;
        const vals = list.map(x => C.toUnit(x.kg, U));
        if (j.goalKg !== null) vals.push(C.toUnit(j.goalKg, U));
        if (startIn && j.startKg !== null) vals.push(C.toUnit(j.startKg, U));
        let lo = Math.min(...vals), hi = Math.max(...vals); const padV = Math.max(0.6, (hi - lo) * 0.08); const tk = C.ticks(lo - padV, hi + padV); lo = tk.lo; hi = tk.hi;
        const t0 = r.from, t1 = Math.max(r.to, t0 + 1), x = t => PL + (t - t0) / (t1 - t0) * (Wd - PL - PR), y = val => PT + (1 - (val - lo) / (hi - lo)) * (Hd - PT - PB);
        const pts = list.map(e => [x(e.ts), y(C.toUnit(e.kg, U))]);
        let g = '<defs><linearGradient id="wjFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="wj-f0"/><stop offset="1" class="wj-f1"/></linearGradient></defs>';
        g += tk.list.map(tv => '<line class="wj-grid" x1="' + PL + '" x2="' + (Wd - PR) + '" y1="' + y(tv).toFixed(1) + '" y2="' + y(tv).toFixed(1) + '"/><text class="wj-ax" x="' + (PL - 6) + '" y="' + (y(tv) + 3.5).toFixed(1) + '" text-anchor="end">' + esc(tk.step < 1 ? fmt(tv) : String(Math.round(tv))) + '</text>').join('');
        /* x labels: start, middle, end of the window */
        const xl = [t0, (t0 + Math.min(t1, Date.now())) / 2, Math.min(t1, Date.now())];
        g += xl.map((t, i) => '<text class="wj-ax" x="' + x(t).toFixed(1) + '" y="' + (Hd - 7) + '" text-anchor="' + (i === 0 ? 'start' : i === 2 ? 'end' : 'middle') + '">' + esc(dOf(t)) + '</text>').join('');
        if (startIn) g += '<line class="wj-startln" x1="' + x(startTs).toFixed(1) + '" x2="' + x(startTs).toFixed(1) + '" y1="' + (PT - 10) + '" y2="' + (Hd - PB) + '"/><text class="wj-startlb" x="' + (x(startTs) + 4).toFixed(1) + '" y="' + (PT - 12) + '">' + esc(tr('day', { n: 1 })) + '</text>' +
            (j.startKg !== null ? '<circle class="wj-startdot" cx="' + x(startTs).toFixed(1) + '" cy="' + y(C.toUnit(j.startKg, U)).toFixed(1) + '" r="4"/>' : '');
        if (j.goalKg !== null) { const gy = y(C.toUnit(j.goalKg, U)).toFixed(1), gx = Wd - PR; g += '<line class="wj-goalln" x1="' + PL + '" x2="' + gx + '" y1="' + gy + '" y2="' + gy + '"/><g class="wj-flag" transform="translate(' + (gx - 2) + ' ' + gy + ')"><path d="M0 0V-15"/><path class="wj-flagcloth" d="M0 -15h-10l2.5 3.5-2.5 3.5h10z"/></g><text class="wj-goallb" x="' + (gx - 16) + '" y="' + (+gy - 5) + '" text-anchor="end">' + esc(tr('goalShort') + ' ' + fmt(C.toUnit(j.goalKg, U))) + '</text>'; }
        if (pts.length > 1) { const d = C.smoothPath(pts); g += '<path class="wj-area" d="' + d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (Hd - PB) + ' L' + pts[0][0].toFixed(1) + ' ' + (Hd - PB) + ' Z" fill="url(#wjFill)"/><path class="wj-line" d="' + d + '"/>'; }
        const many = pts.length > 40;
        g += pts.map((p, i) => i === pts.length - 1 ? '' : '<circle class="wj-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (many ? 1.8 : 3) + '"/>').join('');
        /* labels: highest and latest (one label when they are the same weigh-in) */
        const li = list.length - 1, hiI = list.indexOf(st.highest), lab = (i, text, cls) => { const p = pts[i], w = text.length * 6.6 + 14, lx = Math.max(PL, Math.min(Wd - PR - w, p[0] - w / 2)), above = p[1] - 30 > 2, ly = above ? p[1] - 28 : p[1] + 10; return '<g class="wj-lab ' + cls + '"><rect x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" width="' + w.toFixed(1) + '" height="19" rx="9.5"/><text x="' + (lx + w / 2).toFixed(1) + '" y="' + (ly + 13.5).toFixed(1) + '" text-anchor="middle">' + esc(text) + '</text></g>'; };
        if (hiI > -1 && hiI !== li && list.length > 1) g += '<circle class="wj-dot wj-peak" cx="' + pts[hiI][0].toFixed(1) + '" cy="' + pts[hiI][1].toFixed(1) + '" r="4"/>' + lab(hiI, fmt(C.toUnit(list[hiI].kg, U)), 'wj-lab-peak');
        g += '<circle class="wj-dot wj-last" cx="' + pts[li][0].toFixed(1) + '" cy="' + pts[li][1].toFixed(1) + '" r="5.5"/>' + lab(li, fmt(C.toUnit(list[li].kg, U)) + ' ' + U, 'wj-lab-last');
        return '<svg class="wj-svg" width="' + Wd + '" height="' + Hd + '" viewBox="0 0 ' + Wd + ' ' + Hd + '" role="img" aria-label="' + esc(tr('chart')) + '">' + g + '</svg>' + (list.length === 1 ? '<p class="wj-note">' + esc(tr('one')) + '</p>' : '');
    }
    function progHTML(s, st) {
        if (setupOpen) return setupHTML(s, st);
        const j = st.journey, U = u(s);
        if (!st.latest && !j.start && j.goalKg === null) return '';
        const startTxt = st.startDay ? esc(dOf(C.dayStart(st.startDay), { day: 'numeric', month: 'short', year: 'numeric' })) + (st.startKg !== null ? ' · ' + v(st.startKg, s) + ' ' + U : '') : '–';
        const goalTxt = j.goalKg !== null ? v(j.goalKg, s) + ' ' + U : '–';
        const toGo = j.goalKg === null ? '<button type="button" class="wj-link" data-wj="setup">' + esc(tr('setGoal')) + '</button>' : st.reached ? esc(tr('reached')) : esc(tr('toGo', { v: fmt(Math.abs(C.show(st.toGoal, unit(s)))) + ' ' + U }));
        const pct = j.goalKg !== null && st.goalPct !== null ? Math.round(st.goalPct * 100) : null;
        return '<section class="wj-prog" aria-label="' + esc(tr('prog')) + '"><h3>' + esc(tr('prog')) + '</h3>' +
            '<div class="wj-start"><div><small>' + esc(tr('start')) + '</small><b>' + startTxt + '</b></div><div><small>' + esc(tr('goalShort')) + '</small><b>' + goalTxt + '</b></div>' +
            '<button type="button" class="wj-link" data-wj="setup">' + esc(tr('edit')) + '</button></div>' +
            (st.latest ? '<div class="wj-stats"><div class="wj-stat' + (good(st.sinceStart, st) ? ' wj-good' : '') + '"><small>' + esc(tr('sinceStart')) + '</small><b>' + (st.sinceStart === null ? '–' : signed(st.sinceStart, s) + ' <i>' + U + '</i>') + '</b>' + (st.day ? '<span>' + esc(tr('day', { n: st.day })) + '</span>' : '') + '</div>' +
                '<div class="wj-stat"><small>' + esc(tr('toGoal')) + '</small><b>' + toGo + '</b>' + (pct !== null ? '<span>' + pct + '%</span>' : '') + '</div></div>' : '') +
            (pct !== null ? '<div class="wj-goalbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="' + esc(tr('toGoal')) + '"><i style="width:' + pct + '%"></i></div>' : '') + '</section>';
    }
    function chartSecHTML(s, st) {
        if (!st.all.length) return '';
        return '<section class="wj-chartsec" aria-label="' + esc(tr('chart')) + '"><h3>' + esc(tr('chart')) + '</h3>' + tabsHTML(st) + '<div class="wj-chart"></div></section>';
    }
    /* tapping a weigh-in opens this right under the list title: move it to another day, change it, or delete it */
    function editHTML(s, st) {
        const e = form && form.ts ? st.all.find(x => x.ts === form.ts) : null;
        if (!e) return '';
        return '<form class="wj-card wj-entry" data-wj-form="entry" novalidate><h3>' + esc(tr('editEntry')) + '</h3><div class="wj-fields wj-two">' +
            '<label><span>' + esc(tr('date')) + '</span><input type="date" id="wjDate" max="' + C.dayKey(Date.now()) + '" value="' + esc(e.day) + '" required></label>' +
            '<label><span>' + esc(tr('weight')) + ' (' + u(s) + ')</span><input id="wjVal" inputmode="decimal" autocomplete="off" value="' + esc(String(C.show(e.kg, unit(s)))) + '" required></label></div>' +
            '<p class="wj-err" id="wjErr" role="alert"></p><div class="wj-row"><button type="submit" class="wj-btn">' + esc(tr('save')) + '</button><button type="button" class="wj-btn wj-ghost" data-wj="cancel">' + esc(tr('cancel')) + '</button>' +
            '<button type="button" class="wj-btn wj-ghost wj-del" data-wj="del">' + esc(tr('del')) + '</button></div></form>';
    }
    function listHTML(s, st) {
        if (!st.all.length) return '';
        const all = st.all.slice().reverse(), shown = showAll ? all : all.slice(0, 8);
        return '<section class="wj-list"><h3>' + esc(tr('entries')) + '</h3>' + editHTML(s, st) + '<ul>' + shown.map((e, i) => {
            const prev = all[i + 1], d = prev ? e.kg - prev.kg : null, on = form && form.ts === e.ts;
            return '<li' + (on ? ' class="wj-on"' : '') + '><button type="button" data-wj-e="' + e.ts + '" aria-label="' + esc(tr('editEntry') + ' ' + dOf(e.ts)) + '"><span>' + esc(e.day === C.dayKey(Date.now()) ? tr('today') : dOf(e.ts, { weekday: 'short', day: 'numeric', month: 'short' })) + '</span><b>' + v(e.kg, s) + ' ' + u(s) + '</b><em>' + (d === null ? '' : signed(d, s)) + '</em><i aria-hidden="true">›</i></button></li>';
        }).join('') + '</ul>' + (!showAll && all.length > 8 ? '<button type="button" class="wj-link wj-more" data-wj="all">' + esc(tr('showAll', { n: all.length })) + '</button>' : '') + '</section>';
    }
    function drawChart() {
        const s = state(); if (!host || !s) return;
        const box = host.querySelector('.wj-chart'); if (!box) return;
        const st = C.stats(s, { period, offset });
        box.innerHTML = chartSVG(s, st, Math.max(260, Math.round(box.clientWidth || 320)));
    }
    function render() {
        const s = state(); if (!host || !s) return;
        const st = C.stats(s, { period, offset }); period = st.period;
        host.innerHTML = progHTML(s, st) + chartSecHTML(s, st) + listHTML(s, st);
        drawChart();
    }
    /* after any change the whole sheet redraws (BMI, body fat and the weight field follow the newest weigh-in) */
    function changed() { fire(); try { if (W.LowiBodyStats && LowiBodyStats.refresh) { LowiBodyStats.refresh(); return; } } catch (e) { } render(); }
    const bad = (s, id) => { const U = unit(s); const el = host && host.querySelector(id); if (el) el.textContent = tr('badW', { a: fmt(C.show(C.KG[0], U)).replace(/[.,]0$/, ''), b: fmt(C.show(C.KG[1], U)).replace(/[.,]0$/, ''), u: U }); };
    function submitEntry() {
        const s = state(); if (!s || !host || !form || !form.ts) return;
        const date = host.querySelector('#wjDate').value, val = host.querySelector('#wjVal').value, err = host.querySelector('#wjErr');
        try { C.edit(s, form.ts, { date, value: val, unit: unit(s) }); }
        catch (e) { if (e.message === 'weight') { bad(s, '#wjErr'); host.querySelector('#wjVal').focus(); } else err.textContent = tr('badD'); return; }
        persist(); form = null; changed();
    }
    function submitSetup() {
        const s = state(); if (!s || !host) return;
        const start = host.querySelector('#wjStart').value, sw = host.querySelector('#wjStartW').value.trim(), gl = host.querySelector('#wjGoal').value.trim();
        try {
            if (sw && C.toKg(sw, unit(s)) === null) throw Error('weight');
            if (gl && C.toKg(gl, unit(s)) === null) throw Error('goal');
            C.setJourney(s, { start, startValue: sw, goalValue: gl });
            /* a start weight with no weigh-in on day 1 becomes that day's weigh-in, so the line starts where the journey did */
            if (sw && !C.entries(s).some(e => e.day === start)) C.add(s, { date: start, value: sw, unit: unit(s) });
        } catch (e) { if (e.message === 'weight' || e.message === 'goal') bad(s, '#wjSetupErr'); else host.querySelector('#wjSetupErr').textContent = tr('badD'); return; }
        persist(); setupOpen = false; period = 'start'; offset = 0; changed();
    }
    function onClick(e) {
        const t = e.target, s = state(); if (!s || !t || !t.closest) return;
        const act = t.closest('[data-wj]'), a = act && act.getAttribute('data-wj');
        const p = t.closest('[data-wj-p]'); if (p) { period = p.getAttribute('data-wj-p'); offset = 0; render(); return; }
        const en = t.closest('[data-wj-e]'); if (en) { const ts = +en.getAttribute('data-wj-e'); form = form && form.ts === ts ? null : { ts }; setupOpen = false; render(); if (form) focusIn('#wjVal'); return; }
        if (a === 'prev') { offset--; render(); return; }
        if (a === 'next') { offset = Math.min(0, offset + 1); render(); return; }
        if (a === 'cancel') { form = null; render(); return; }
        if (a === 'del' && form && form.ts) { C.remove(s, form.ts); persist(); form = null; changed(); return; }
        if (a === 'setup') { setupOpen = true; form = null; render(); focusIn('#wjStart'); return; }
        if (a === 'setup-cancel') { setupOpen = false; render(); return; }
        if (a === 'all') { showAll = true; render(); }
    }
    function onSubmit(e) {
        const f = e.target && e.target.getAttribute && e.target.getAttribute('data-wj-form'); if (!f) return;
        e.preventDefault(); e.stopPropagation();
        if (f === 'entry') submitEntry(); else if (f === 'setup') submitSetup();
    }
    /* body-stats.js calls this once per open with its persistent host element */
    function mount(h) {
        unmount();
        host = h; form = null; setupOpen = false; showAll = false; offset = 0;
        if (pendingPeriod) { period = pendingPeriod; pendingPeriod = null; } else period = null;
        host.addEventListener('click', onClick);
        host.addEventListener('submit', onSubmit);
        let raf = 0; const redraw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawChart); };
        try { ro = new ResizeObserver(redraw); ro.observe(host); } catch (e) { }
        render();
    }
    function unmount() {
        if (host) { host.removeEventListener('click', onClick); host.removeEventListener('submit', onSubmit); }
        try { if (ro) ro.disconnect(); } catch (e) { } ro = null; host = null; form = null; setupOpen = false;
    }
    function focusIn(q) { const el = host && host.querySelector(q); if (!el) return; try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (!matchMedia('(pointer: coarse)').matches) el.focus({ preventScroll: true }); } catch (e) { } }
    /* every old way into the Weight journey now opens the one Weight & BMI sheet: opts.add focuses the weight field, else it scrolls to the journey */
    function open(opts) {
        if (!state() || !W.LowiBodyStats || !LowiBodyStats.open) return false;
        if (opts && opts.period) { if (host) { period = opts.period; offset = 0; } else pendingPeriod = opts.period; }
        return LowiBodyStats.open(opts && opts.add ? { weigh: true } : { journey: true }) !== false;
    }
    function setUnit(x) { const s = state(); if (!s) return; C.setUnit(s, x === 'lb' ? 'lb' : 'kg'); persist(); }
    function cardHTML() { return W.LowiBodyStats && LowiBodyStats.cardHTML ? LowiBodyStats.cardHTML() : ''; }
    D.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('[data-wj-open]'); if (t) { e.preventDefault(); e.stopPropagation(); open(); } }, true);
    W.LowiWeightJourney = {
        open, close: () => { try { if (W.LowiBodyStats) LowiBodyStats.close(); } catch (e) { } }, isOpen: () => !!host,
        cardHTML, mount, render, unmount, setUnit, unit: s => unit(s || state()), core: C, _t: T
    };
})();
