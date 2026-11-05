/* misty-sheet.js (Nov 5 2026, Misty sheet plan phase 2): the Today tab of Misty's long-press sheet, in the Settings sheet's own
   markup (.cme-sec h3 + .cme-list > .cme-row: icon, name, status line, value, chevron) so both sheets are one design.
   Three groups, in the owner's words: world stats (World glow, from misty-peak.js), human stats (food with photos, water, Move,
   steps, weight) and companion stats (the XP today gave Misty, level). Numbers from misty-sheet-core.js; nothing is written.
   API: window.LowiMistySheet = { todayHTML(T, name), data(dayKey), tap(btn) -> true when handled } */
(function () {
    'use strict';
    const W = window, D = document;
    if (W.LowiMistySheet) return;
    const C = () => W.LowiMistySheetCore;
    const js = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
    const state = () => { try { return typeof S !== 'undefined' && S ? S : js('lowispike.v2'); } catch (e) { return js('lowispike.v2'); } };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lang = () => { try { const l = (W.LowiI18n && W.LowiI18n.lang && W.LowiI18n.lang()) || D.documentElement.lang || 'en'; return /^de/.test(l) ? 'de' : /^es/.test(l) ? 'es' : 'en'; } catch (e) { return 'en'; } };
    const T = (en, de, es) => { const l = lang(); return l === 'de' ? de : l === 'es' ? es : en; };
    const fmt = (n, d) => { try { return Number(n).toLocaleString(lang() === 'de' ? 'de-DE' : lang() === 'es' ? 'es-ES' : 'en-GB', { maximumFractionDigits: d || 0 }); } catch (e) { return String(n); } };
    const I = p => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
    const ICO = {
        food: I('<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 3c-2 2-2.5 5-2 8h3v10"/>'),
        water: I('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
        move: I('<circle cx="13" cy="4.5" r="1.8"/><path d="M9 21l2.5-6 3 3V22M7 11l3-3.5 4 1.5 2.5 3M11.5 15l1-6"/>'),
        steps: I('<path d="M8 14c-1.7 0-3-1.8-3-4.5S6.3 4 8 4s3 2.8 3 5.5S9.7 14 8 14zM16 20c-1.7 0-3-1.8-3-4.5S14.3 10 16 10s3 2.8 3 5.5-1.3 4.5-3 4.5z"/>'),
        weight: I('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9.5a4 4 0 0 1 6 0L12.5 12"/>'),
        xp: I('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
        chev: '<svg class="cme-chev" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>'
    };
    function deps() {
        let lv = null; try { if (typeof levelOf === 'function') lv = x => levelOf(x, true); } catch (e) { lv = null; }
        return { recap: W.LowiDayRecapCore, nutri: W.LowiNutriStatsCore, move: W.LowiMoveEstimateCore, weight: W.LowiWeightJourneyCore, levelOf: lv };
    }
    function ctx() { return { now: Date.now(), S: state() || {}, fast: js('lowi_fast_v1'), move: js('lowispike.move.v1'), deps: deps() }; }
    function data(dk) { try { return C() ? C().day(ctx(), dk) : null; } catch (e) { return null; } }
    function period(kind, back) { try { return C() ? C().period(ctx(), kind, back) : null; } catch (e) { return null; } }

    /* one row in the Settings sheet's markup; act = what a tap opens (data-msx), none = a plain line */
    function row(o) {
        const tag = o.act ? 'button type="button" data-msx="' + esc(o.act) + '"' : 'div';
        return '<' + tag + ' class="cme-row ms-row' + (o.empty ? ' ms-empty' : '') + '">' +
            '<span class="cme-ico">' + (o.ico || '') + '</span>' +
            '<span class="cme-tx"><b>' + esc(o.b) + '</b>' + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + (o.extra || '') + '</span>' +
            (o.v != null && o.v !== '' ? '<span class="cme-st ms-v num">' + esc(o.v) + '</span>' : '') +
            (o.act ? ICO.chev : '') + '</' + (o.act ? 'button' : 'div') + '>';
    }
    const sec = (h, rows, cls) => rows ? '<section class="cme-sec ms-sec' + (cls ? ' ' + cls : '') + '"><h3>' + esc(h) + '</h3><div class="cme-list">' + rows + '</div></section>' : '';
    const none = () => T('No entries', 'Keine Eintr\u00e4ge', 'Sin registros');
    const stepTxt = id => { const L = { casual: T('Under 5k', 'Unter 5k', 'Menos de 5k'), steady: '5k\u201310k', epic: '10k+' }; return L[id] || ''; };
    function verdicts(c) {
        const out = [];
        /* the app's own verdict words (day-recap-core): a rise is expected, a spike is only ever likely */
        if (c.low) out.push(c.low + ' ' + T('small rise', 'kleiner Anstieg', 'subida peque\u00f1a'));
        if (c.medium) out.push(c.medium + ' ' + T('medium rise', 'mittlerer Anstieg', 'subida media'));
        if (c.high) out.push(c.high + ' ' + T('likely spike', 'wahrscheinlicher Spike', 'pico probable'));
        return out.join(' \u00b7 ');
    }
    function thumbs(meals) {
        const ph = meals.filter(m => m.photo).slice(-6);
        if (!ph.length) return '';
        return '<span class="ms-thumbs" aria-hidden="true">' + ph.map(m => '<img alt="" src="' + esc(m.photo) + '" loading="lazy" decoding="async">').join('') + '</span>';
    }
    function lastWeight() {
        try { const Wc = W.LowiWeightJourneyCore, s = state(); const e = Wc && Wc.entries ? Wc.entries(s, Date.now()) : []; return e && e.length ? e[e.length - 1] : null; } catch (e) { return null; }
    }
    function whenTxt(ts) {
        const C0 = C(); if (!C0) return '';
        const dk = C0.dayKey(ts), today = C0.dayKey(Date.now());
        if (dk === today) return T('today', 'heute', 'hoy');
        if (dk === C0.shift(today, -1)) return T('yesterday', 'gestern', 'ayer');
        try { return new Date(ts).toLocaleDateString(lang() === 'de' ? 'de-DE' : lang() === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return dk; }
    }
    /* human stats of one day (Today, and a day in History) */
    function youRows(d, opts) {
        opts = opts || {};
        const m = d.meals.length;
        let r = row({ ico: ICO.food, act: opts.noAct ? '' : 'food', empty: !m, b: T('Food', 'Essen', 'Comida'),
            sub: m ? (m === 1 ? T('1 meal', '1 Mahlzeit', '1 comida') : T(m + ' meals', m + ' Mahlzeiten', m + ' comidas')) + (verdicts(d.counts) ? ' \u00b7 ' + verdicts(d.counts) : '') : none(),
            extra: thumbs(d.meals) });
        if (m && d.rated) r += row({ ico: '', b: T('Estimated', 'Gesch\u00e4tzt', 'Estimado'), sub: d.rated < m ? T('From ' + d.rated + ' of ' + m + ' meals', 'Aus ' + d.rated + ' von ' + m + ' Mahlzeiten', 'De ' + d.rated + ' de ' + m + ' comidas') : T('From your logged meals', 'Aus deinen Mahlzeiten', 'De tus comidas'),
            v: '\u2248 ' + fmt(d.kcal) + ' kcal \u00b7 ' + fmt(d.protein) + ' g ' + T('protein', 'Eiwei\u00df', 'prote\u00edna') });
        r += row({ ico: ICO.water, empty: !d.water, b: T('Water', 'Wasser', 'Agua'),
            sub: d.water ? (d.water === 1 ? T('1 glass', '1 Glas', '1 vaso') : T(fmt(d.water, 1) + ' glasses', fmt(d.water, 1) + ' Gl\u00e4ser', fmt(d.water, 1) + ' vasos')) : none() });
        r += row({ ico: ICO.move, act: opts.noAct ? '' : 'move', empty: !d.moveMin, b: 'Move',
            sub: d.moveMin ? fmt(d.moveMin) + ' min' : none() });
        r += row({ ico: ICO.steps, act: opts.noAct ? '' : 'move', empty: !d.steps, b: T('Steps', 'Schritte', 'Pasos'),
            sub: d.steps ? stepTxt(d.steps) + ' \u00b7 ' + T('your estimate', 'deine Sch\u00e4tzung', 'tu estimaci\u00f3n') : none() });
        if (opts.weightOfDay) {
            if (d.weight !== null) r += row({ ico: ICO.weight, act: opts.noAct ? '' : 'weight', b: T('Weight', 'Gewicht', 'Peso'), sub: fmt(d.weight, 1) + ' kg' });
        } else {
            const w = lastWeight();
            r += row({ ico: ICO.weight, act: 'weight', empty: !w, b: T('Weight', 'Gewicht', 'Peso'),
                sub: w ? fmt(Math.round(w.kg * 10) / 10, 1) + ' kg \u00b7 ' + whenTxt(w.ts) : T('No weigh-in yet', 'Noch kein Wiegen', 'A\u00fan sin pesarte') });
        }
        return r;
    }
    function xpRows(d, name) {
        const by = d.xpBy || {}, parts = [];
        if (by.meal) parts.push(T('Meals', 'Mahlzeiten', 'Comidas') + ' ' + by.meal);
        if (by.water) parts.push(T('Water', 'Wasser', 'Agua') + ' ' + by.water);
        if (by.move) parts.push('Move ' + by.move);
        if (by.gap) parts.push(T('Breaks', 'Pausen', 'Pausas') + ' ' + by.gap);
        if (by.other) parts.push(T('Other', 'Sonstiges', 'Otros') + ' ' + by.other);
        return row({ ico: ICO.xp, empty: !d.xp, b: d.today ? T('XP for ' + name + ' today', 'XP f\u00fcr ' + name + ' heute', 'XP para ' + name + ' hoy') : T('XP for ' + name, 'XP f\u00fcr ' + name, 'XP para ' + name),
            sub: d.xp ? parts.join(' \u00b7 ') || '' : none(), v: d.xp ? '+' + fmt(d.xp) + ' XP' : '' }) +
            (d.levelTo > d.levelFrom ? row({ ico: '', b: T('Level up', 'Level-Aufstieg', 'Subida de nivel'), v: d.levelFrom + ' \u2192 ' + d.levelTo }) : '');
    }
    /* Today: world glow (passed in, misty-peak.js), you, Misty */
    function todayHTML(name, worldHtml, xpCard) {
        const d = data(); if (!d) return '';
        return (worldHtml ? '<section class="cme-sec ms-sec ms-world"><h3>' + esc(T('World', 'Welt', 'Mundo')) + '</h3>' + worldHtml + '</section>' : '') +
            sec(T('You today', 'Du heute', 'T\u00fa hoy'), youRows(d)) +
            '<section class="cme-sec ms-sec ms-comp"><h3>' + esc(name) + '</h3><div class="cme-list">' + xpRows(d, name) + '</div>' + (xpCard || '') + '</section>';
    }
    /* a tap on a Today row opens the screen that owns it; the card stays underneath, Back returns to it */
    function tap(b) {
        const k = b && b.getAttribute && b.getAttribute('data-msx'); if (!k) return false;
        const call = (o, f, a) => { try { if (o && typeof o[f] === 'function') { o[f](a); return true; } } catch (e) { } return false; };
        const later = f => { try { W.LowiMistyHub && W.LowiMistyHub.close && W.LowiMistyHub.close(); } catch (e) { } setTimeout(() => { try { f(); } catch (e) { console.error(e); } }, 360); return true; };
        const proxy = (a, v) => { const t = D.createElement('button'); t.type = 'button'; t.hidden = true; t.setAttribute(a, v); D.body.appendChild(t); try { t.click(); } finally { t.remove(); } };
        if (k === 'food') return later(() => proxy('data-g2h-open', 'meals'));
        if (k === 'move') return later(() => { if (W.LowiMoveBubble && W.LowiMoveBubble.page) W.LowiMoveBubble.page(); });
        if (k === 'weight') return call(W.LowiWeightJourney, 'open', { from: 'misty' }) || call(W.LowiYourDetails, 'open') || true;
        return false;
    }
    D.addEventListener('click', e => { const b = e.target.closest && e.target.closest('#mistyHub [data-msx]'); if (b) { e.preventDefault(); tap(b); } });
    W.LowiMistySheet = { todayHTML, youRows, xpRows, row, sec, data, period, tap, _T: T };
})();
