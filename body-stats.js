/* body-stats.js: the one Weight & BMI sheet (dark glass). Oct 22 2026 Emmanuel merged the Weight journey into it ("just mixed
   together ... in the same user design ... extremely simple"): header with kg/lb, BMI + body fat, healthy weight and level, ONE weight
   input with Update today, then weight-journey.js renders progress (start, goal, since start, to go, one bar), the chart and the
   weigh-ins list into a host under it. No second sheet. Opens from Settings > Weight & BMI, Community > You, LowiBodyStats.open(),
   any [data-body-open] or any old Weight journey link. All maths in body-stats-core.js / weight-journey-core.js. Writes only
   S.health.weight, S.health.heightCm, S.health.body.weights and (if asked) S.user.gender, then LowiR2.save().
   API: window.LowiBodyStats = { open(opts), close(), isOpen(), refresh(), cardHTML(), core } ; window event 'lowi:body-weighin' {kg, bmi}. */
(function () {
    'use strict';
    const W = window, D = document, C = W.LowiBodyStatsCore;
    if (!C || W.LowiBodyStats) return;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lang = () => { let l = 'en'; try { l = (W.LowiLang && LowiLang.get && LowiLang.get()) || D.documentElement.lang || 'en'; } catch (e) { } l = String(l).slice(0, 2); return l === 'de' || l === 'es' ? l : 'en'; };
    const T = {
        en: { units: 'Units', badLb: 'Enter your weight in lb (55–772).', title: 'Weight & BMI', close: 'Close', weight: 'Weight', height: 'Height', kg: 'kg', cm: 'cm', save: 'Save weigh-in', update: 'Update today', sex: 'For the body fat estimate', f: 'Woman', m: 'Man', x: 'Rather not say',
            bmi: 'BMI', fat: 'Body fat', est: 'estimate', under: 'Underweight', healthy: 'Healthy range', over: 'Overweight', obese: 'Obesity range', young: 'Under 18: adult bands don’t apply',
            needH: 'Add your height once to get your BMI.', needB: 'Add your birthday in Profile for a body fat estimate.', fatNote: 'Estimated from BMI, age and sex. Not a measurement: it can be off by about 4 points, and BMI can’t tell muscle from fat.',
            fatNoSex: 'Range covers both sexes, because sex isn’t set.', range: 'Healthy weight for your height: {lo}–{hi} {u}', then: 'Then', now: 'Now', level: 'Level {n}', start: 'Your first weigh-in. Come back and weigh in again to see your progress.',
            toNext: '{kg} {u} to level {n}', steady: 'In the healthy range: every 4 weigh-ins here is a level up.', drift: 'Outside the healthy range now: {kg} {u} to get back in.', inBand: 'You’re in the healthy range.', toBand: '{kg} {u} to the healthy range',
            days: '{n} days', day: '1 day', today: 'today', hist: 'Weigh-ins', remove: 'Remove weigh-in from {d}', private: 'Private: stays on this phone and isn’t backed up or shared.', badKg: 'Enter your weight in kg (25–350).', badCm: 'Enter your height in cm (100–250).', saved: 'Saved', open: 'Open weight and BMI', change: 'change', none: 'No weigh-in yet', weighIn: 'Weigh in', best: 'Best so far: {kg} {u}', chart: 'Weight over time' },
        de: { units: 'Einheit', badLb: 'Gib dein Gewicht in lb ein (55–772).', title: 'Gewicht & BMI', close: 'Schließen', weight: 'Gewicht', height: 'Größe', kg: 'kg', cm: 'cm', save: 'Wiegen speichern', update: 'Heute aktualisieren', sex: 'Für die Körperfett-Schätzung', f: 'Frau', m: 'Mann', x: 'Keine Angabe',
            bmi: 'BMI', fat: 'Körperfett', est: 'Schätzung', under: 'Untergewicht', healthy: 'Gesunder Bereich', over: 'Übergewicht', obese: 'Adipositas-Bereich', young: 'Unter 18: Erwachsenen-Bereiche gelten nicht',
            needH: 'Gib einmal deine Größe ein, dann bekommst du deinen BMI.', needB: 'Trag im Profil deinen Geburtstag ein, dann gibt es eine Körperfett-Schätzung.', fatNote: 'Geschätzt aus BMI, Alter und Geschlecht. Keine Messung: Sie kann um etwa 4 Punkte danebenliegen, und der BMI unterscheidet nicht zwischen Muskeln und Fett.',
            fatNoSex: 'Der Bereich gilt für beide Geschlechter, weil keins angegeben ist.', range: 'Gesundes Gewicht für deine Größe: {lo}–{hi} {u}', then: 'Damals', now: 'Jetzt', level: 'Level {n}', start: 'Dein erstes Wiegen. Wieg dich wieder, dann siehst du deinen Fortschritt.',
            toNext: 'Noch {kg} {u} bis Level {n}', steady: 'Im gesunden Bereich: alle 4 Wiegungen hier gibt es ein Level.', drift: 'Gerade außerhalb des gesunden Bereichs: {kg} {u} bis zurück.', inBand: 'Du bist im gesunden Bereich.', toBand: 'Noch {kg} {u} bis zum gesunden Bereich',
            days: '{n} Tage', day: '1 Tag', today: 'heute', hist: 'Wiegungen', remove: 'Wiegen vom {d} entfernen', private: 'Privat: bleibt auf diesem Handy und wird weder gesichert noch geteilt.', badKg: 'Gib dein Gewicht in kg ein (25–350).', badCm: 'Gib deine Größe in cm ein (100–250).', saved: 'Gespeichert', open: 'Gewicht und BMI öffnen', change: 'ändern', none: 'Noch nicht gewogen', weighIn: 'Wiegen', best: 'Bestwert: {kg} {u}', chart: 'Gewicht im Verlauf' },
        es: { units: 'Unidades', badLb: 'Escribe tu peso en lb (55–772).', title: 'Peso e IMC', close: 'Cerrar', weight: 'Peso', height: 'Altura', kg: 'kg', cm: 'cm', save: 'Guardar pesaje', update: 'Actualizar hoy', sex: 'Para estimar la grasa corporal', f: 'Mujer', m: 'Hombre', x: 'Prefiero no decirlo',
            bmi: 'IMC', fat: 'Grasa corporal', est: 'estimación', under: 'Bajo peso', healthy: 'Rango saludable', over: 'Sobrepeso', obese: 'Rango de obesidad', young: 'Menores de 18: los rangos de adultos no se aplican',
            needH: 'Añade tu altura una vez para ver tu IMC.', needB: 'Añade tu cumpleaños en el Perfil para estimar la grasa corporal.', fatNote: 'Estimada a partir del IMC, la edad y el sexo. No es una medición: puede variar unos 4 puntos, y el IMC no distingue músculo de grasa.',
            fatNoSex: 'El rango cubre ambos sexos porque no has indicado el tuyo.', range: 'Peso saludable para tu altura: {lo}–{hi} {u}', then: 'Antes', now: 'Ahora', level: 'Nivel {n}', start: 'Tu primer pesaje. Vuelve a pesarte para ver tu progreso.',
            toNext: 'Faltan {kg} {u} para el nivel {n}', steady: 'En el rango saludable: cada 4 pesajes aquí subes de nivel.', drift: 'Ahora fuera del rango saludable: faltan {kg} {u} para volver.', inBand: 'Estás en el rango saludable.', toBand: 'Faltan {kg} {u} para el rango saludable',
            days: '{n} días', day: '1 día', today: 'hoy', hist: 'Pesajes', remove: 'Quitar el pesaje del {d}', private: 'Privado: se queda en este teléfono y no se copia ni se comparte.', badKg: 'Escribe tu peso en kg (25–350).', badCm: 'Escribe tu altura en cm (100–250).', saved: 'Guardado', open: 'Abrir peso e IMC', change: 'cambiar', none: 'Aún sin pesaje', weighIn: 'Pesarme', best: 'Mejor marca: {kg} {u}', chart: 'Peso en el tiempo' }
    };
    const tr = (k, v) => { let s = (T[lang()] || T.en)[k] || T.en[k] || k; if (v) Object.keys(v).forEach(n => { s = s.split('{' + n + '}').join(v[n]); }); return s; };
    const fmt = n => { if (n === null || n === undefined) return ''; const s = String(Math.round(n * 10) / 10); return lang() === 'en' ? s : s.replace('.', ','); };
    const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n));
    const dateOf = ts => { try { return new Date(ts).toLocaleDateString(lang() === 'de' ? 'de-DE' : lang() === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return C.dayKey(ts); } };
    const R2 = () => W.LowiR2 || null;
    const state = () => { try { const r = R2(); return r && r.S ? r.S() : null; } catch (e) { return null; } };
    const persist = () => { try { const r = R2(); if (r && r.save) r.save(); } catch (e) { } };

    const LB = 0.45359237;
    const unitOf = st => { try { const j = W.LowiWeightJourney; return j && j.unit && j.unit(st) === 'lb' ? 'lb' : 'kg'; } catch (e) { return 'kg'; } };
    const inU = (kg, st) => unitOf(st) === 'lb' ? kg / LB : kg;
    /* the weight to show: in lb from the stored exact kg (a 236.5 lb weigh-in is kept as 107.27 kg), not the 0.1 kg rounded
       summary, which read back as 236.6 lb */
    const shownW = (sm, st) => { if (unitOf(st) === 'lb') { const x = parseFloat(String(st && st.health && st.health.weight || '').replace(',', '.')); if (Number.isFinite(x) && Math.abs(x - sm.kg) < 0.06) return x / LB; } return inU(sm.kg, st); };
    /* level: one short line, no second bar (the goal bar lives in the journey part below) and no number the sheet shows elsewhere */
    function levelHTML(sm) {
        const p = sm.progress, st = state();
        if (!p) return '';
        const line = p.count < 2 ? tr('start') : p.goal === 'steady' ? (p.drift && p.drift !== 'in' ? '' : tr('steady')) : tr('toNext', { kg: fmt(inU(p.nextLevelKg, st)), n: p.level + 1, u: unitOf(st) });
        return '<p class="bs-lvline"><b class="bs-lvchip">' + esc(tr('level', { n: p.count < 2 ? 1 : p.level })) + '</b>' + (line ? '<span>' + esc(line) + '</span>' : '') + '</p>';
    }
    function statsHTML(sm) {
        if (sm.kg === null) return '';
        if (sm.bmi === null) return '<p class="bs-note">' + esc(tr('needH')) + '</p>';
        const cat = sm.category, fat = sm.fat;
        let h = '<section class="bs-stats"><div class="bs-stat bs-cat-' + esc(cat) + '"><small>' + esc(tr('bmi')) + '</small><b>' + fmt(sm.bmi) + '</b><span class="bs-chip">' + esc(tr(cat)) + '</span></div>';
        h += fat ? '<div class="bs-stat"><small>' + esc(tr('fat')) + ' · ' + esc(tr('est')) + '</small><b>≈ ' + fat.mid + '%</b><span class="bs-chip bs-soft">' + fat.lo + '–' + fat.hi + '%</span></div>' : '';
        h += '</section>';
        if (sm.healthy && cat !== 'young') h += '<p class="bs-range">' + esc(tr('range', { lo: fmt(inU(sm.healthy.lo, state())), hi: fmt(inU(sm.healthy.hi, state())), u: unitOf(state()) })) + (sm.progress && sm.progress.toBand ? ' · ' + esc(tr('toBand', { kg: fmt(inU(sm.progress.toBand, state())), u: unitOf(state()) })) : '') + '</p>';
        h += levelHTML(sm);
        if (fat) h += '<p class="bs-note">' + esc(tr('fatNote')) + (fat.sexKnown ? '' : ' ' + esc(tr('fatNoSex'))) + '</p>';
        else if (sm.age === null) h += '<p class="bs-note">' + esc(tr('needB')) + '</p>';
        return h;
    }
    function formHTML(sm) {
        const showH = sm.needsHeight || editH, askSex = !sm.gender, st = state(), U = unitOf(st);
        const today = sm.history.some(w => C.dayKey(w.ts) === C.dayKey(Date.now()));
        return '<form class="bs-form" novalidate>' +
            '<label class="bs-field"><span>' + esc(tr('weight')) + '</span><span class="bs-in"><input id="bsKg" name="kg" inputmode="decimal" autocomplete="off" enterkeyhint="done" value="' + esc(sm.kg === null ? '' : fmt(shownW(sm, st))) + '" aria-describedby="bsErr"><em>' + U + '</em></span></label>' +
            (showH ? '<label class="bs-field"><span>' + esc(tr('height')) + '</span><span class="bs-in"><input id="bsCm" name="cm" inputmode="numeric" autocomplete="off" value="' + esc(sm.cm === null ? '' : sm.cm) + '"><em>cm</em></span></label>'
                : '<p class="bs-hline">' + esc(tr('height')) + ' ' + sm.cm + ' cm · <button type="button" class="bs-link" data-bs="edit-h">' + esc(tr('change')) + '</button></p>') +
            (askSex ? '<fieldset class="bs-sex"><legend>' + esc(tr('sex')) + '</legend>' + ['f', 'm', 'x'].map(g => '<button type="button" class="bs-pill' + (pickSex === g ? ' on' : '') + '" aria-pressed="' + (pickSex === g) + '" data-bs-sex="' + g + '">' + esc(tr(g)) + '</button>').join('') + '</fieldset>' : '') +
            '<p class="bs-err" id="bsErr" role="alert"></p><button type="submit" class="bs-go">' + esc(sm.weighedToday || today ? tr('update') : tr('save')) + '</button></form>';
    }
    let ov = null, editH = false, pickSex = '', lastFocus = null;
    function render(keepFocus) {
        const s = state(); if (!ov || !s) return;
        const sm = C.summary(s);
        /* keep what was typed (weight AND height) when the sheet redraws for a sex pick, 'change' height or a language switch */
        const typed = {}; if (keepFocus) ['#bsKg', '#bsCm'].forEach(q => { const e = ov.querySelector(q); if (e) typed[q] = e.value; });
        ov.querySelector('.bs-top').innerHTML = statsHTML(sm) + formHTML(sm);
        ov.querySelector('.bs-priv').textContent = tr('private');
        const U = unitOf(s), un = ov.querySelector('.bs-units');
        if (un) { un.hidden = !W.LowiWeightJourney; un.setAttribute('aria-label', tr('units')); un.innerHTML = ['kg', 'lb'].map(x => '<button type="button" data-bs-u="' + x + '" aria-pressed="' + (x === U) + '">' + x + '</button>').join(''); }
        try { if (W.LowiWeightJourney && LowiWeightJourney.render) LowiWeightJourney.render(); } catch (e) { }
        Object.keys(typed).forEach(q => { const e = ov.querySelector(q); if (e && typed[q] !== '') e.value = typed[q]; });
        ov.querySelector('.bs-head h2').textContent = tr('title');
        ov.querySelector('.bs-close').setAttribute('aria-label', tr('close'));
    }
    function submit() {
        const s = state(); if (!s || !ov) return;
        const err = ov.querySelector('#bsErr'), kgEl = ov.querySelector('#bsKg'), cmEl = ov.querySelector('#bsCm');
        const lb = unitOf(s) === 'lb', raw = parseFloat(String((kgEl && kgEl.value) || '').replace(',', '.'));
        const exact = lb ? (Number.isFinite(raw) ? Math.round(raw * LB * 100) / 100 : null) : null;
        const kg = lb ? (exact !== null && exact >= 25 && exact <= 350 ? exact : null) : C.parseKg(kgEl && kgEl.value), needCm = !!cmEl;
        if (kg === null) { err.textContent = tr(lb ? 'badLb' : 'badKg'); kgEl.focus(); return; }
        if (needCm && C.parseCm(cmEl.value) === null && (cmEl.value.trim() || C.parseCm(s.health && s.health.heightCm) === null)) { err.textContent = tr('badCm'); cmEl.focus(); return; }
        /* one weigh-in per day: today's entry from anywhere (old journey Add weight, profile) gives way to this one */
        const b = s.health && s.health.body; if (b && Array.isArray(b.weights)) { const d = C.dayKey(Date.now()); b.weights = b.weights.filter(w => !(w && C.dayKey(w.ts) === d)); }
        const res = C.weighIn(s, { kg, cm: needCm && cmEl.value.trim() ? cmEl.value : undefined, gender: pickSex || undefined });
        if (lb && exact !== null) { const ws = s.health.body.weights, last = ws[ws.length - 1]; if (last && last.ts === res.ts) last.kg = exact; s.health.weight = String(exact); res.kg = exact; }
        persist(); editH = false; pickSex = '';
        const sm = C.summary(s);
        try { W.dispatchEvent(new CustomEvent('lowi:body-weighin', { detail: { kg: res.kg, bmi: sm.bmi } })); } catch (e) { }
        render();
        const go = ov.querySelector('.bs-go'); if (go) { go.textContent = tr('saved') + ' ✓'; go.classList.add('bs-done'); }
        const top = ov.querySelector('.bs-sheet'); if (top && top.scrollTo) top.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function open(opts) {
        if (!state()) return false;
        if (ov) { render(); land(opts); return true; }
        lastFocus = D.activeElement;
        ov = D.createElement('div'); ov.id = 'bsOv'; ov.className = 'bs-ov';
        ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'bsTitle');
        ov.innerHTML = '<div class="bs-sheet"><div class="bs-head"><h2 id="bsTitle"></h2><div class="bs-units" role="group"></div><button type="button" class="bs-close" data-bs="close">×</button></div><div class="bs-body"><div class="bs-top"></div><div class="bs-wjhost"></div><p class="bs-priv"></p></div></div>';
        D.body.appendChild(ov);
        try { if (W.LowiWeightJourney && LowiWeightJourney.mount) LowiWeightJourney.mount(ov.querySelector('.bs-wjhost')); } catch (e) { }
        render();
        ov.addEventListener('click', e => {
            const t = e.target;
            if (t === ov || t.closest('[data-bs="close"]')) { close(); return; }
            if (t.closest('[data-bs="edit-h"]')) { editH = true; render(true); const c = ov.querySelector('#bsCm'); if (c) c.focus(); return; }
            const sx = t.closest('[data-bs-sex]'); if (sx) { pickSex = sx.getAttribute('data-bs-sex'); render(true); return; }
            const un = t.closest('[data-bs-u]'); if (un) { try { LowiWeightJourney.setUnit(un.getAttribute('data-bs-u')); } catch (x) { } render(); return; }
            const rm = t.closest('[data-bs-rm]'); if (rm) { const s = state(); if (s && C.remove(s, +rm.getAttribute('data-bs-rm'))) { persist(); try { W.dispatchEvent(new CustomEvent('lowi:body-weighin', { detail: { kg: C.parseKg(s.health.weight), bmi: C.summary(s).bmi, removed: true } })); } catch (x) { } render(); } }
        });
        ov.addEventListener('submit', e => { if (e.target && e.target.closest && e.target.closest('[data-wj-form]')) return; e.preventDefault(); submit(); });
        ov.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
        const kg = ov.querySelector('#bsKg');
        try { (kg && !matchMedia('(pointer: coarse)').matches ? kg : ov.querySelector('.bs-close')).focus({ preventScroll: true }); } catch (e) { }
        land(opts);
        return true;
    }
    /* old Weight journey ways in: opts.weigh (Your details > Weight) puts the cursor in the one weight field, opts.journey scrolls to progress */
    function land(opts) {
        if (!ov || !opts) return;
        setTimeout(() => { try {
            if (opts.weigh) { const k = ov.querySelector('#bsKg'); if (k) { k.scrollIntoView({ block: 'center', behavior: 'smooth' }); k.focus({ preventScroll: true }); k.select(); } }
            else if (opts.journey) { const j = ov.querySelector('.wj-prog, .wj-chartsec'); if (j) j.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
        } catch (e) { } }, 80);
    }
    function close() {
        if (!ov) return;
        const el = ov; ov = null; editH = false; pickSex = '';
        try { if (W.LowiWeightJourney && LowiWeightJourney.unmount) LowiWeightJourney.unmount(); } catch (e) { }
        el.classList.add('bs-out');
        setTimeout(() => el.remove(), 180);
        try { if (lastFocus && lastFocus.isConnected && lastFocus.focus) lastFocus.focus({ preventScroll: true }); } catch (e) { }
    }
    /* small summary for the daily stats view (COORD-stats.md) */
    function cardHTML() {
        const s = state(); const sm = s ? C.summary(s) : null;
        if (!sm || sm.kg === null) return '<button type="button" class="bs-card" data-body-open aria-label="' + esc(tr('open')) + '"><small>' + esc(tr('title')) + '</small><b>' + esc(tr('none')) + '</b><span>' + esc(tr('weighIn')) + ' ›</span></button>';
        const p = sm.progress, U = unitOf(s);
        return '<button type="button" class="bs-card" data-body-open aria-label="' + esc(tr('open')) + '"><small>' + esc(tr('title')) + '</small><b>' + fmt(shownW(sm, s)) + ' ' + U + (sm.bmi !== null ? ' · ' + esc(tr('bmi')) + ' ' + fmt(sm.bmi) : '') + '</b><span>' + (sm.category ? esc(tr(sm.category)) : esc(tr('needH'))) + (p && p.count > 1 ? ' · ' + signed(inU(p.delta, s)) + ' ' + U + ' · ' + esc(tr('level', { n: p.level })) : '') + '</span></button>';
    }
    D.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('[data-body-open]'); if (t && !(ov && ov.contains(t))) { e.preventDefault(); open(); } });
    W.addEventListener('lowi:lang', () => { if (ov) render(true); });
    /* the Stats sheet (nutri-stats.js, COORD-stats.md) shows a Weight & BMI section; tapping it opens this sheet on top */
    (W.LowiStatsPlugins = W.LowiStatsPlugins || []).push({ id: 'body', order: 20, render: () => '<section class="ns-sec bs-sec"><h4 class="ns-h">' + esc(tr('title')) + '</h4>' + cardHTML() + '</section>' });
    W.addEventListener('lowi:body-weighin', () => { try { W.LowiNutriStats && LowiNutriStats.refresh && LowiNutriStats.refresh(); } catch (e) { } });
    W.LowiBodyStats = { open, close, isOpen: () => !!ov, refresh: () => { if (ov) render(); }, cardHTML, core: C, _t: T };
})();
