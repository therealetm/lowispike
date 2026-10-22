/* weight-journey.js: the Weight journey sheet (Oct 22 2026, Emmanuel: "We need this in our app. They should be able to set starting time
   and see a graphic."). Start date + start weight + goal, quick Add weight (backfill, edit, delete), kg or lb, a smooth line chart
   (W / M / 3M / Y / All / Since start, start marker, dashed goal line with a flag, highest and latest labelled) and the cards (since
   start, weekly and monthly rate, highest, lowest, to goal). Encouraging on purpose: no "Over" label, no red, nothing that shames.
   All maths in weight-journey-core.js. Writes only S.health.body.weights / .journey and S.health.weight, then LowiR2.save(); nothing
   leaves the device. Opens from Community > You > Weight journey, from the Weight & BMI sheet, from the Stats sheet, or any [data-wj-open].
   API: window.LowiWeightJourney = { open(), close(), isOpen(), cardHTML(), core } ; fires 'lowi:body-weighin' like body-stats.js. */
(function () {
    'use strict';
    const W = window, D = document, C = W.LowiWeightJourneyCore;
    if (!C || W.LowiWeightJourney) return;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lang = () => { let l = 'en'; try { l = (W.LowiLang && LowiLang.get && LowiLang.get()) || D.documentElement.lang || 'en'; } catch (e) { } l = String(l).slice(0, 2); return l === 'de' || l === 'es' ? l : 'en'; };
    const T = {
        en: { title: 'Weight journey', close: 'Close', current: 'Current weight', day: 'Day {n}', since: 'since {d}', setup: 'Set your starting point', setupTx: 'When did your journey or challenge start? Pick day 1, your weight that day and, if you like, a goal.',
            startDate: 'Start date', startW: 'Start weight', goal: 'Goal weight', optional: 'optional', saveStart: 'Save starting point', edit: 'Edit', start: 'Start', goalShort: 'Goal', add: 'Add weight', date: 'Date', weight: 'Weight', save: 'Save', cancel: 'Cancel', del: 'Delete',
            editEntry: 'Edit weigh-in', today: 'Today', entries: 'Weigh-ins', showAll: 'Show all {n}', none: 'No weigh-ins yet. Add your first one and your line starts here.', noneRange: 'No weigh-ins in this range.', one: 'One weigh-in so far. Add another to see your line.',
            P: { W: 'W', M: 'M', '3M': '3M', Y: 'Y', all: 'All', start: 'Since start' }, prev: 'Earlier', next: 'Later', chart: 'Weight chart', sinceStart: 'Since start', toGoal: 'To goal', weekly: 'Weekly rate', monthly: 'Monthly rate', highest: 'Highest', lowest: 'Lowest',
            perWeek: '/ week', perMonth: '/ month', toGo: '{v} to go', reached: 'Goal reached', setGoal: 'Set a goal', down: 'Heading down', up: 'Heading up', steady: 'Holding steady', needMore: 'Needs a few days', latest: 'Latest', peak: 'Highest',
            cheerDown: 'Every weigh-in counts. Keep going.', cheerUp: 'Ups and downs are normal. Your line, your pace.', units: 'Units', private: 'Private: stays on this phone and is never sent anywhere.', badW: 'Enter a weight between {a} and {b} {u}.', badD: 'Pick a date that isn’t in the future.', saved: 'Saved', open: 'Open weight journey', of: 'of {v}' },
        de: { title: 'Gewichtsreise', close: 'Schließen', current: 'Aktuelles Gewicht', day: 'Tag {n}', since: 'seit {d}', setup: 'Leg deinen Startpunkt fest', setupTx: 'Wann hat deine Reise oder Challenge begonnen? Wähl Tag 1, dein Gewicht an dem Tag und, wenn du magst, ein Ziel.',
            startDate: 'Startdatum', startW: 'Startgewicht', goal: 'Zielgewicht', optional: 'optional', saveStart: 'Startpunkt speichern', edit: 'Ändern', start: 'Start', goalShort: 'Ziel', add: 'Gewicht eintragen', date: 'Datum', weight: 'Gewicht', save: 'Speichern', cancel: 'Abbrechen', del: 'Löschen',
            editEntry: 'Eintrag ändern', today: 'Heute', entries: 'Einträge', showAll: 'Alle {n} zeigen', none: 'Noch keine Einträge. Trag dein erstes Gewicht ein, dann beginnt hier deine Linie.', noneRange: 'In diesem Zeitraum gibt es keine Einträge.', one: 'Ein Eintrag bisher. Trag noch einen ein, dann siehst du deine Linie.',
            P: { W: 'W', M: 'M', '3M': '3M', Y: 'J', all: 'Alle', start: 'Seit Start' }, prev: 'Früher', next: 'Später', chart: 'Gewichtsdiagramm', sinceStart: 'Seit Start', toGoal: 'Bis zum Ziel', weekly: 'Pro Woche', monthly: 'Pro Monat', highest: 'Höchster Wert', lowest: 'Niedrigster Wert',
            perWeek: '/ Woche', perMonth: '/ Monat', toGo: 'noch {v}', reached: 'Ziel erreicht', setGoal: 'Ziel festlegen', down: 'Geht runter', up: 'Geht hoch', steady: 'Bleibt stabil', needMore: 'Braucht ein paar Tage', latest: 'Zuletzt', peak: 'Höchster',
            cheerDown: 'Jeder Eintrag zählt. Bleib dran.', cheerUp: 'Auf und ab ist normal. Deine Linie, dein Tempo.', units: 'Einheit', private: 'Privat: bleibt auf diesem Handy und wird nirgendwohin gesendet.', badW: 'Gib ein Gewicht zwischen {a} und {b} {u} ein.', badD: 'Wähl ein Datum, das nicht in der Zukunft liegt.', saved: 'Gespeichert', open: 'Gewichtsreise öffnen', of: 'von {v}' },
        es: { title: 'Tu camino de peso', close: 'Cerrar', current: 'Peso actual', day: 'Día {n}', since: 'desde el {d}', setup: 'Marca tu punto de partida', setupTx: '¿Cuándo empezó tu camino o tu reto? Elige el día 1, tu peso ese día y, si quieres, una meta.',
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

    let ov = null, lastFocus = null, period = null, offset = 0, form = null, setupOpen = false, showAll = false, ro = null;
    const unit = s => C.journey(s).unit;
    const u = s => unit(s) === 'lb' ? 'lb' : 'kg';
    const v = (kg, s) => fmt(C.show(kg, unit(s)));
    const signed = (kg, s) => { if (kg === null || kg === undefined) return '–'; const x = C.show(Math.abs(kg), unit(s)); return (kg < -0.004 ? '−' : kg > 0.004 ? '+' : '±') + fmt(x); };
    /* progress is the way the goal points (or down, the app's 30-day angle, when no goal is set); the other way stays neutral, never red */
    const good = (kg, st) => kg !== null && Math.abs(kg) >= 0.05 && (st.goalDir === 'up' ? kg > 0 : kg < 0);

    function heroHTML(s, st) {
        const L = st.latest, j = st.journey;
        if (!L) return '<section class="wj-hero"><p class="wj-empty">' + esc(tr('none')) + '</p></section>';
        const today = C.dayKey(Date.now()) === L.day;
        const chip = st.sinceStart !== null && st.startDay ? '<span class="wj-chip' + (good(st.sinceStart, st) ? ' wj-good' : '') + '">' + signed(st.sinceStart, s) + ' ' + u(s) + ' ' + esc(tr('since', { d: dOf(C.dayStart(st.startDay)) })) + '</span>' : '';
        return '<section class="wj-hero"><small>' + esc(tr('current')) + '</small><div class="wj-big"><b>' + v(L.kg, s) + '</b><span>' + u(s) + '</span></div>' +
            '<p class="wj-when">' + esc(today ? tr('today') : dOf(L.ts, { day: 'numeric', month: 'short', year: 'numeric' })) + (st.day ? ' · ' + esc(tr('day', { n: st.day })) : '') + '</p>' + chip +
            (j.goalKg !== null && st.goalPct !== null ? '<div class="wj-goalbar" role="img" aria-label="' + esc(tr('toGoal') + ' ' + Math.round(st.goalPct * 100) + '%') + '"><i style="width:' + Math.round(st.goalPct * 100) + '%"></i></div>' : '') + '</section>';
    }
    function setupHTML(s, st) {
        const j = st.journey, open = setupOpen || !j.start;
        if (!open) return '<section class="wj-start"><div><small>' + esc(tr('start')) + '</small><b>' + esc(dOf(C.dayStart(j.start), { day: 'numeric', month: 'short', year: 'numeric' })) + (st.startKg !== null ? ' · ' + v(st.startKg, s) + ' ' + u(s) : '') + '</b></div>' +
            '<div><small>' + esc(tr('goalShort')) + '</small><b>' + (j.goalKg !== null ? v(j.goalKg, s) + ' ' + u(s) : '–') + '</b></div><button type="button" class="wj-link" data-wj="setup">' + esc(tr('edit')) + '</button></section>';
        const today = C.dayKey(Date.now());
        const val = kg => kg === null || kg === undefined ? '' : String(C.show(kg, unit(s)));
        return '<form class="wj-card wj-setup" data-wj-form="setup" novalidate><h3>' + esc(tr('setup')) + '</h3><p>' + esc(tr('setupTx')) + '</p>' +
            '<div class="wj-fields"><label><span>' + esc(tr('startDate')) + '</span><input type="date" id="wjStart" max="' + today + '" value="' + esc(j.start || (st.all[0] ? st.all[0].day : today)) + '" required></label>' +
            '<label><span>' + esc(tr('startW')) + ' (' + u(s) + ')</span><input id="wjStartW" inputmode="decimal" autocomplete="off" value="' + esc(val(j.startKg !== null ? j.startKg : st.startKg)) + '" placeholder="' + (u(s) === 'lb' ? '236.5' : '107.6') + '"></label>' +
            '<label><span>' + esc(tr('goal')) + ' (' + u(s) + ') <em>' + esc(tr('optional')) + '</em></span><input id="wjGoal" inputmode="decimal" autocomplete="off" value="' + esc(val(j.goalKg)) + '" placeholder="' + (u(s) === 'lb' ? '206.5' : '94.0') + '"></label></div>' +
            '<p class="wj-err" id="wjSetupErr" role="alert"></p><div class="wj-row"><button type="submit" class="wj-btn">' + esc(tr('saveStart')) + '</button>' + (j.start ? '<button type="button" class="wj-btn wj-ghost" data-wj="setup-cancel">' + esc(tr('cancel')) + '</button>' : '') + '</div></form>';
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
    function cardsHTML(s, st) {
        const j = st.journey, U = u(s), card = (k, val, sub, cls) => '<div class="wj-stat' + (cls ? ' ' + cls : '') + '"><small>' + esc(tr(k)) + '</small><b>' + val + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>';
        const trend = st.trend ? tr(st.trend) : tr('needMore');
        const goalVal = j.goalKg === null ? '<button type="button" class="wj-link" data-wj="setup">' + esc(tr('setGoal')) + '</button>' : st.reached ? esc(tr('reached')) : esc(tr('toGo', { v: fmt(Math.abs(C.show(st.toGoal, unit(s)))) + ' ' + U }));
        return '<section class="wj-stats">' +
            card('sinceStart', st.sinceStart === null ? '–' : signed(st.sinceStart, s) + ' <i>' + U + '</i>', st.startDay ? esc(tr('since', { d: dOf(C.dayStart(st.startDay)) })) : '', good(st.sinceStart, st) ? 'wj-good' : '') +
            card('toGoal', goalVal, j.goalKg !== null ? esc(tr('of', { v: v(j.goalKg, s) + ' ' + U })) : '', st.reached ? 'wj-good' : '') +
            card('weekly', st.weekly === null ? '–' : signed(st.weekly, s) + ' <i>' + U + '</i>', esc(trend), good(st.weekly, st) ? 'wj-good' : '') +
            card('monthly', st.monthly === null ? '–' : signed(st.monthly, s) + ' <i>' + U + '</i>', '', good(st.monthly, st) ? 'wj-good' : '') +
            card('highest', st.highest ? v(st.highest.kg, s) + ' <i>' + U + '</i>' : '–', st.highest ? esc(dOf(st.highest.ts)) : '') +
            card('lowest', st.lowest ? v(st.lowest.kg, s) + ' <i>' + U + '</i>' : '–', st.lowest ? esc(dOf(st.lowest.ts)) : '') +
            '</section>' + (st.trend ? '<p class="wj-cheer">' + esc(st.trend === 'up' && st.goalDir !== 'up' ? tr('cheerUp') : tr('cheerDown')) + '</p>' : '');
    }
    /* Add weight opened from Your details / the profile header: today's value filled in (newest weigh-in, else the profile weight) */
    function prefillVal(s, st) {
        if (st && st.latest) return String(C.show(st.latest.kg, unit(s)));
        const w = parseFloat(String((s && s.health && s.health.weight) || '').replace(',', '.'));
        return Number.isFinite(w) && w > 0 ? String(C.show(w, unit(s))) : '';
    }
    function addHTML(s, st) {
        const today = C.dayKey(Date.now());
        if (!form) return '<button type="button" class="wj-btn wj-add" data-wj="add">＋ ' + esc(tr('add')) + '</button>';
        const e = form.ts ? st.all.find(x => x.ts === form.ts) : null;
        return '<form class="wj-card wj-entry" data-wj-form="entry" novalidate><h3>' + esc(e ? tr('editEntry') : tr('add')) + '</h3><div class="wj-fields wj-two">' +
            '<label><span>' + esc(tr('date')) + '</span><input type="date" id="wjDate" max="' + today + '" value="' + esc(e ? e.day : today) + '" required></label>' +
            '<label><span>' + esc(tr('weight')) + ' (' + u(s) + ')</span><input id="wjVal" inputmode="decimal" autocomplete="off" value="' + esc(e ? String(C.show(e.kg, unit(s))) : form.prefill ? prefillVal(s, st) : '') + '" placeholder="' + esc(st.latest ? String(C.show(st.latest.kg, unit(s))) : u(s) === 'lb' ? '236.5' : '107.6') + '" required></label></div>' +
            '<p class="wj-err" id="wjErr" role="alert"></p><div class="wj-row"><button type="submit" class="wj-btn">' + esc(tr('save')) + '</button><button type="button" class="wj-btn wj-ghost" data-wj="cancel">' + esc(tr('cancel')) + '</button>' +
            (e ? '<button type="button" class="wj-btn wj-ghost wj-del" data-wj="del">' + esc(tr('del')) + '</button>' : '') + '</div></form>';
    }
    function listHTML(s, st) {
        if (!st.all.length) return '';
        const all = st.all.slice().reverse(), shown = showAll ? all : all.slice(0, 8);
        return '<section class="wj-list"><h3>' + esc(tr('entries')) + '</h3><ul>' + shown.map((e, i) => {
            const prev = all[i + 1], d = prev ? e.kg - prev.kg : null;
            return '<li><button type="button" data-wj-e="' + e.ts + '" aria-label="' + esc(tr('editEntry') + ' ' + dOf(e.ts)) + '"><span>' + esc(e.day === C.dayKey(Date.now()) ? tr('today') : dOf(e.ts, { weekday: 'short', day: 'numeric', month: 'short' })) + '</span><b>' + v(e.kg, s) + ' ' + u(s) + '</b><em>' + (d === null ? '' : signed(d, s)) + '</em><i aria-hidden="true">›</i></button></li>';
        }).join('') + '</ul>' + (!showAll && all.length > 8 ? '<button type="button" class="wj-link wj-more" data-wj="all">' + esc(tr('showAll', { n: all.length })) + '</button>' : '') + '</section>';
    }
    function drawChart() {
        const s = state(); if (!ov || !s) return;
        const box = ov.querySelector('.wj-chart'); if (!box) return;
        const st = C.stats(s, { period, offset });
        box.innerHTML = chartSVG(s, st, Math.max(260, Math.round(box.clientWidth || 320)));
    }
    function render() {
        const s = state(); if (!ov || !s) return;
        const st = C.stats(s, { period, offset }); period = st.period;
        const U = u(s);
        ov.querySelector('.wj-head h2').textContent = tr('title');
        ov.querySelector('.wj-close').setAttribute('aria-label', tr('close'));
        ov.querySelector('.wj-units').innerHTML = ['kg', 'lb'].map(x => '<button type="button" data-wj-u="' + x + '" aria-pressed="' + (x === U) + '">' + x + '</button>').join('');
        ov.querySelector('.wj-units').setAttribute('aria-label', tr('units'));
        ov.querySelector('.wj-body').innerHTML = heroHTML(s, st) + addHTML(s, st) + setupHTML(s, st) + tabsHTML(st) + '<div class="wj-chart"></div>' + cardsHTML(s, st) + listHTML(s, st) + '<p class="wj-priv">' + esc(tr('private')) + '</p>';
        drawChart();
    }
    const bad = (s, id) => { const U = unit(s); const el = ov.querySelector(id); if (el) el.textContent = tr('badW', { a: fmt(C.show(C.KG[0], U)).replace(/[.,]0$/, ''), b: fmt(C.show(C.KG[1], U)).replace(/[.,]0$/, ''), u: U }); };
    function submitEntry() {
        const s = state(); if (!s || !ov) return;
        const date = ov.querySelector('#wjDate').value, val = ov.querySelector('#wjVal').value, err = ov.querySelector('#wjErr');
        try { if (form && form.ts) C.edit(s, form.ts, { date, value: val, unit: unit(s) }); else C.add(s, { date, value: val, unit: unit(s) }); }
        catch (e) { if (e.message === 'weight') { bad(s, '#wjErr'); ov.querySelector('#wjVal').focus(); } else err.textContent = tr('badD'); return; }
        persist(); form = null; fire(); render();
        const b = ov.querySelector('.wj-add'); if (b) { b.textContent = tr('saved') + ' ✓'; b.classList.add('wj-done'); setTimeout(() => { if (b.isConnected) { b.textContent = '＋ ' + tr('add'); b.classList.remove('wj-done'); } }, 1600); }
    }
    function submitSetup() {
        const s = state(); if (!s || !ov) return;
        const start = ov.querySelector('#wjStart').value, sw = ov.querySelector('#wjStartW').value.trim(), gl = ov.querySelector('#wjGoal').value.trim();
        try {
            if (sw && C.toKg(sw, unit(s)) === null) throw Error('weight');
            if (gl && C.toKg(gl, unit(s)) === null) throw Error('goal');
            C.setJourney(s, { start, startValue: sw, goalValue: gl });
            /* a start weight with no weigh-in on day 1 becomes that day's weigh-in, so the line starts where the journey did */
            if (sw && !C.entries(s).some(e => e.day === start)) C.add(s, { date: start, value: sw, unit: unit(s) });
        } catch (e) { if (e.message === 'weight' || e.message === 'goal') bad(s, '#wjSetupErr'); else ov.querySelector('#wjSetupErr').textContent = tr('badD'); return; }
        persist(); setupOpen = false; period = 'start'; offset = 0; fire(); render();
    }
    function open(opts) {
        if (!state()) return false;
        /* opts.add (Oct 22, Your details / the profile header weight): open straight on Add weight, today's value filled in */
        if (ov) { if (opts && opts.add && !form) { form = { prefill: true }; render(); focusIn('#wjVal'); } else render(); return true; }
        lastFocus = D.activeElement; period = (opts && opts.period) || null; offset = 0; form = null; setupOpen = false; showAll = false;
        ov = D.createElement('div'); ov.id = 'wjOv'; ov.className = 'wj-ov';
        ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'wjTitle');
        ov.innerHTML = '<div class="wj-sheet"><div class="wj-head"><h2 id="wjTitle"></h2><div class="wj-units" role="group"></div><button type="button" class="wj-close" data-wj="close">×</button></div><div class="wj-body"></div></div>';
        if (opts && opts.add) form = { prefill: true };
        D.body.appendChild(ov);
        render();
        if (form) setTimeout(() => focusIn('#wjVal'), 60);
        ov.addEventListener('click', e => {
            const t = e.target, s = state(); if (!s) return;
            const act = t.closest('[data-wj]'), a = act && act.getAttribute('data-wj');
            if (t === ov || a === 'close') { close(); return; }
            const p = t.closest('[data-wj-p]'); if (p) { period = p.getAttribute('data-wj-p'); offset = 0; render(); return; }
            const un = t.closest('[data-wj-u]'); if (un) { C.setUnit(s, un.getAttribute('data-wj-u')); persist(); render(); return; }
            const en = t.closest('[data-wj-e]'); if (en) { form = { ts: +en.getAttribute('data-wj-e') }; render(); focusIn('#wjVal'); return; }
            if (a === 'prev') { offset--; render(); return; }
            if (a === 'next') { offset = Math.min(0, offset + 1); render(); return; }
            if (a === 'add') { form = {}; render(); focusIn('#wjVal'); return; }
            if (a === 'cancel') { form = null; render(); return; }
            if (a === 'del' && form && form.ts) { C.remove(s, form.ts); persist(); form = null; fire(); render(); return; }
            if (a === 'setup') { setupOpen = true; render(); focusIn('#wjStart'); return; }
            if (a === 'setup-cancel') { setupOpen = false; render(); return; }
            if (a === 'all') { showAll = true; render(); }
        });
        ov.addEventListener('submit', e => { e.preventDefault(); const f = e.target.getAttribute('data-wj-form'); if (f === 'entry') submitEntry(); else if (f === 'setup') submitSetup(); });
        let raf = 0; const redraw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawChart); };
        try { ro = new ResizeObserver(redraw); ro.observe(ov.querySelector('.wj-sheet')); } catch (e) { W.addEventListener('resize', redraw); }
        try { ov.querySelector('.wj-close').focus({ preventScroll: true }); } catch (e) { }
        return true;
    }
    function focusIn(q) { const el = ov && ov.querySelector(q); if (!el) return; try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (!matchMedia('(pointer: coarse)').matches) el.focus({ preventScroll: true }); } catch (e) { } }
    function close() {
        if (!ov) return;
        const el = ov; ov = null; form = null; setupOpen = false;
        try { if (ro) ro.disconnect(); } catch (e) { } ro = null;
        el.classList.add('wj-out');
        setTimeout(() => el.remove(), 180);
        try { if (W.LowiBodyStats && LowiBodyStats.isOpen && LowiBodyStats.isOpen()) LowiBodyStats.open(); } catch (e) { }
        try { if (lastFocus && lastFocus.isConnected && lastFocus.focus) lastFocus.focus({ preventScroll: true }); } catch (e) { }
    }
    function cardHTML() {
        const s = state(), st = s ? C.stats(s, {}) : null;
        const sub = st && st.latest ? v(st.latest.kg, s) + ' ' + u(s) + (st.sinceStart !== null && st.startDay ? ' · ' + signed(st.sinceStart, s) + ' ' + u(s) + ' ' + esc(tr('since', { d: dOf(C.dayStart(st.startDay)) })) : '') : esc(tr('add'));
        return '<button type="button" class="wj-card-btn" data-wj-open aria-label="' + esc(tr('open')) + '"><small>' + esc(tr('title')) + '</small><b>' + sub + '</b><span>' + esc(tr('chart')) + ' ›</span></button>';
    }
    D.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('[data-wj-open]'); if (t && !(ov && ov.contains(t))) { e.preventDefault(); e.stopPropagation(); open(); } }, true);
    D.addEventListener('keydown', e => { if (ov && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }, true);
    W.addEventListener('lowi:lang', () => { if (ov) render(); });
    try { new MutationObserver(() => { if (ov) render(); }).observe(D.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch (e) { }
    (W.LowiStatsPlugins = W.LowiStatsPlugins || []).push({ id: 'weight-journey', order: 21, render: () => '<section class="ns-sec wj-sec"><h4 class="ns-h">' + esc(tr('title')) + '</h4>' + cardHTML() + '</section>' });
    W.LowiWeightJourney = { open, close, isOpen: () => !!ov, cardHTML, core: C, _t: T };
})();
