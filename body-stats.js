/* body-stats.js: the Body sheet (weigh-in, BMI with its category, body-fat estimate, Then/Now figures and the level-up track).
   Opens from Settings > Weight & BMI, from LowiBodyStats.open(), or from any [data-body-open] element (hook for the daily stats
   view, see COORD-stats.md). All maths is in body-stats-core.js. Writes only S.health.weight, S.health.heightCm,
   S.health.body.weights and (if asked) S.user.gender, then LowiR2.save().
   API: window.LowiBodyStats = { open(), close(), isOpen(), cardHTML(), core } ; window event 'lowi:body-weighin' {kg, bmi}. */
(function () {
    'use strict';
    const W = window, D = document, C = W.LowiBodyStatsCore;
    if (!C || W.LowiBodyStats) return;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lang = () => { let l = 'en'; try { l = (W.LowiLang && LowiLang.get && LowiLang.get()) || D.documentElement.lang || 'en'; } catch (e) { } l = String(l).slice(0, 2); return l === 'de' || l === 'es' ? l : 'en'; };
    const T = {
        en: { title: 'Weight & BMI', close: 'Close', weight: 'Weight', height: 'Height', kg: 'kg', cm: 'cm', save: 'Save weigh-in', update: 'Update today', sex: 'For the body fat estimate', f: 'Woman', m: 'Man', x: 'Rather not say',
            bmi: 'BMI', fat: 'Body fat', est: 'estimate', under: 'Underweight', healthy: 'Healthy range', over: 'Overweight', obese: 'Obesity range', young: 'Under 18: adult bands don’t apply',
            needH: 'Add your height once to get your BMI.', needB: 'Add your birthday in Profile for a body fat estimate.', fatNote: 'Estimated from BMI, age and sex. Not a measurement: it can be off by about 4 points, and BMI can’t tell muscle from fat.',
            fatNoSex: 'Range covers both sexes, because sex isn’t set.', range: 'Healthy weight for your height: {lo}–{hi} kg', then: 'Then', now: 'Now', level: 'Level {n}', start: 'Your first weigh-in. Come back and weigh in again to see your progress.',
            toNext: '{kg} kg to level {n}', steady: 'In the healthy range: every 4 weigh-ins here is a level up.', drift: 'Outside the healthy range now: {kg} kg to get back in.', inBand: 'You’re in the healthy range.', toBand: '{kg} kg to the healthy range',
            days: '{n} days', day: '1 day', today: 'today', hist: 'Weigh-ins', remove: 'Remove weigh-in from {d}', private: 'Private: stays on this phone and isn’t backed up or shared.', badKg: 'Enter your weight in kg (25–350).', badCm: 'Enter your height in cm (100–250).', saved: 'Saved', open: 'Open weight and BMI', change: 'change', none: 'No weigh-in yet', weighIn: 'Weigh in', best: 'Best so far: {kg} kg', chart: 'Weight over time' },
        de: { title: 'Gewicht & BMI', close: 'Schließen', weight: 'Gewicht', height: 'Größe', kg: 'kg', cm: 'cm', save: 'Wiegen speichern', update: 'Heute aktualisieren', sex: 'Für die Körperfett-Schätzung', f: 'Frau', m: 'Mann', x: 'Keine Angabe',
            bmi: 'BMI', fat: 'Körperfett', est: 'Schätzung', under: 'Untergewicht', healthy: 'Gesunder Bereich', over: 'Übergewicht', obese: 'Adipositas-Bereich', young: 'Unter 18: Erwachsenen-Bereiche gelten nicht',
            needH: 'Gib einmal deine Größe ein, dann bekommst du deinen BMI.', needB: 'Trag im Profil deinen Geburtstag ein, dann gibt es eine Körperfett-Schätzung.', fatNote: 'Geschätzt aus BMI, Alter und Geschlecht. Keine Messung: Sie kann um etwa 4 Punkte danebenliegen, und der BMI unterscheidet nicht zwischen Muskeln und Fett.',
            fatNoSex: 'Der Bereich gilt für beide Geschlechter, weil keins angegeben ist.', range: 'Gesundes Gewicht für deine Größe: {lo}–{hi} kg', then: 'Damals', now: 'Jetzt', level: 'Level {n}', start: 'Dein erstes Wiegen. Wieg dich wieder, dann siehst du deinen Fortschritt.',
            toNext: 'Noch {kg} kg bis Level {n}', steady: 'Im gesunden Bereich: alle 4 Wiegungen hier gibt es ein Level.', drift: 'Gerade außerhalb des gesunden Bereichs: {kg} kg bis zurück.', inBand: 'Du bist im gesunden Bereich.', toBand: 'Noch {kg} kg bis zum gesunden Bereich',
            days: '{n} Tage', day: '1 Tag', today: 'heute', hist: 'Wiegungen', remove: 'Wiegen vom {d} entfernen', private: 'Privat: bleibt auf diesem Handy und wird weder gesichert noch geteilt.', badKg: 'Gib dein Gewicht in kg ein (25–350).', badCm: 'Gib deine Größe in cm ein (100–250).', saved: 'Gespeichert', open: 'Gewicht und BMI öffnen', change: 'ändern', none: 'Noch nicht gewogen', weighIn: 'Wiegen', best: 'Bestwert: {kg} kg', chart: 'Gewicht im Verlauf' },
        es: { title: 'Peso e IMC', close: 'Cerrar', weight: 'Peso', height: 'Altura', kg: 'kg', cm: 'cm', save: 'Guardar pesaje', update: 'Actualizar hoy', sex: 'Para estimar la grasa corporal', f: 'Mujer', m: 'Hombre', x: 'Prefiero no decirlo',
            bmi: 'IMC', fat: 'Grasa corporal', est: 'estimación', under: 'Bajo peso', healthy: 'Rango saludable', over: 'Sobrepeso', obese: 'Rango de obesidad', young: 'Menores de 18: los rangos de adultos no se aplican',
            needH: 'Añade tu altura una vez para ver tu IMC.', needB: 'Añade tu cumpleaños en el Perfil para estimar la grasa corporal.', fatNote: 'Estimada a partir del IMC, la edad y el sexo. No es una medición: puede variar unos 4 puntos, y el IMC no distingue músculo de grasa.',
            fatNoSex: 'El rango cubre ambos sexos porque no has indicado el tuyo.', range: 'Peso saludable para tu altura: {lo}–{hi} kg', then: 'Antes', now: 'Ahora', level: 'Nivel {n}', start: 'Tu primer pesaje. Vuelve a pesarte para ver tu progreso.',
            toNext: 'Faltan {kg} kg para el nivel {n}', steady: 'En el rango saludable: cada 4 pesajes aquí subes de nivel.', drift: 'Ahora fuera del rango saludable: faltan {kg} kg para volver.', inBand: 'Estás en el rango saludable.', toBand: 'Faltan {kg} kg para el rango saludable',
            days: '{n} días', day: '1 día', today: 'hoy', hist: 'Pesajes', remove: 'Quitar el pesaje del {d}', private: 'Privado: se queda en este teléfono y no se copia ni se comparte.', badKg: 'Escribe tu peso en kg (25–350).', badCm: 'Escribe tu altura en cm (100–250).', saved: 'Guardado', open: 'Abrir peso e IMC', change: 'cambiar', none: 'Aún sin pesaje', weighIn: 'Pesarme', best: 'Mejor marca: {kg} kg', chart: 'Peso en el tiempo' }
    };
    const tr = (k, v) => { let s = (T[lang()] || T.en)[k] || T.en[k] || k; if (v) Object.keys(v).forEach(n => { s = s.split('{' + n + '}').join(v[n]); }); return s; };
    const fmt = n => { if (n === null || n === undefined) return ''; const s = String(Math.round(n * 10) / 10); return lang() === 'en' ? s : s.replace('.', ','); };
    const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n));
    const dateOf = ts => { try { return new Date(ts).toLocaleDateString(lang() === 'de' ? 'de-DE' : lang() === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return C.dayKey(ts); } };
    const R2 = () => W.LowiR2 || null;
    const state = () => { try { const r = R2(); return r && r.S ? r.S() : null; } catch (e) { return null; } };
    const persist = () => { try { const r = R2(); if (r && r.save) r.save(); } catch (e) { } };

    function figure(b, cls) {
        const w = C.figureWidth(b), tw = 30 * w, hw = 34 * w, cx = 50;
        const torso = 'M' + (cx - tw / 2) + ' 46 Q' + (cx - hw / 2 - 6) + ' 78 ' + (cx - hw / 2) + ' 104 L' + (cx - hw / 2 + 4) + ' 132 L' + (cx + hw / 2 - 4) + ' 132 L' + (cx + hw / 2) + ' 104 Q' + (cx + hw / 2 + 6) + ' 78 ' + (cx + tw / 2) + ' 46 Z';
        return '<svg class="bs-fig ' + cls + '" viewBox="0 0 100 150" aria-hidden="true"><circle cx="50" cy="26" r="14"/><path d="' + torso + '"/><path class="bs-legs" d="M' + (cx - 10) + ' 132 L' + (cx - 11) + ' 148 M' + (cx + 10) + ' 132 L' + (cx + 11) + ' 148"/></svg>';
    }
    function chart(hist, hr) {
        if (hist.length < 2) return '';
        const Wd = 300, Hd = 96, P = 8;
        let lo = Math.min(...hist.map(h => h.kg)) - 1.5, hi = Math.max(...hist.map(h => h.kg)) + 1.5;
        if (hr) { lo = Math.min(lo, Math.max(hr.lo, lo - 6)); hi = Math.max(hi, Math.min(hr.hi, hi + 6)); }
        const t0 = hist[0].ts, t1 = hist[hist.length - 1].ts, x = t => P + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (Wd - 2 * P), y = k => P + (1 - (k - lo) / (hi - lo)) * (Hd - 2 * P);
        const band = hr ? '<rect class="bs-band" x="0" width="' + Wd + '" y="' + Math.max(0, y(Math.min(hi, hr.hi))) + '" height="' + Math.max(0, y(Math.max(lo, hr.lo)) - y(Math.min(hi, hr.hi))) + '"/>' : '';
        const pts = hist.map(h => x(h.ts).toFixed(1) + ',' + y(h.kg).toFixed(1)).join(' ');
        const dots = hist.map((h, i) => '<circle class="bs-dot' + (i === hist.length - 1 ? ' bs-last' : '') + '" cx="' + x(h.ts).toFixed(1) + '" cy="' + y(h.kg).toFixed(1) + '" r="' + (i === hist.length - 1 ? 4.5 : 2.6) + '"/>').join('');
        return '<svg class="bs-chart" viewBox="0 0 ' + Wd + ' ' + Hd + '" role="img" aria-label="' + esc(tr('chart')) + '" preserveAspectRatio="none">' + band + '<polyline class="bs-line" points="' + pts + '"/>' + dots + '</svg>';
    }
    function progressHTML(sm) {
        const p = sm.progress;
        if (!p) return '';
        if (p.count < 2) return '<section class="bs-track"><div class="bs-lv"><b>' + esc(tr('level', { n: 1 })) + '</b></div><p>' + esc(tr('start')) + '</p></section>';
        const span = p.days === 1 ? tr('day') : tr('days', { n: p.days });
        let line = '', pct = 0;
        if (p.goal === 'steady') { line = p.drift && p.drift !== 'in' ? tr('drift', { kg: fmt(p.toBand) }) : tr('steady'); pct = (p.count % 4) / 4 * 100; }
        else { line = tr('toNext', { kg: fmt(p.nextLevelKg), n: p.level + 1 }); pct = Math.max(0, Math.min(100, (1 - p.nextLevelKg) * 100)); }
        const good = p.goal === 'steady' ? p.drift === 'in' || !p.drift : p.toward > 0;
        return '<section class="bs-track"><div class="bs-then-now">' +
            '<figure>' + figure(p.firstBmi, 'bs-then') + '<figcaption><small>' + esc(tr('then')) + ' · ' + esc(dateOf(p.first.ts)) + '</small><b>' + fmt(p.first.kg) + ' kg</b></figcaption></figure>' +
            '<div class="bs-arrow"><span class="bs-delta' + (good ? ' bs-good' : '') + '">' + signed(p.delta) + ' kg</span><small>' + esc(span) + '</small><b class="bs-lvchip">' + esc(tr('level', { n: p.level })) + '</b></div>' +
            '<figure>' + figure(p.lastBmi, 'bs-now') + '<figcaption><small>' + esc(tr('now')) + '</small><b>' + fmt(p.last.kg) + ' kg</b></figcaption></figure></div>' +
            '<div class="bs-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '" aria-label="' + esc(line) + '"><i style="width:' + pct.toFixed(0) + '%"></i></div><p>' + esc(line) + (p.best !== null && p.best !== p.last.kg ? ' ' + esc(tr('best', { kg: fmt(p.best) })) : '') + '</p>' +
            chart(sm.history, sm.healthy) + '</section>';
    }
    function statsHTML(sm) {
        if (sm.kg === null) return '';
        if (sm.bmi === null) return '<p class="bs-note">' + esc(tr('needH')) + '</p>';
        const cat = sm.category, fat = sm.fat;
        let h = '<section class="bs-stats"><div class="bs-stat bs-cat-' + esc(cat) + '"><small>' + esc(tr('bmi')) + '</small><b>' + fmt(sm.bmi) + '</b><span class="bs-chip">' + esc(tr(cat)) + '</span></div>';
        h += fat ? '<div class="bs-stat"><small>' + esc(tr('fat')) + ' · ' + esc(tr('est')) + '</small><b>≈ ' + fat.mid + '%</b><span class="bs-chip bs-soft">' + fat.lo + '–' + fat.hi + '%</span></div>' : '';
        h += '</section>';
        if (sm.healthy && cat !== 'young') h += '<p class="bs-range">' + esc(tr('range', { lo: fmt(sm.healthy.lo), hi: fmt(sm.healthy.hi) })) + (sm.progress && sm.progress.toBand ? ' · ' + esc(tr('toBand', { kg: fmt(sm.progress.toBand) })) : '') + '</p>';
        if (fat) h += '<p class="bs-note">' + esc(tr('fatNote')) + (fat.sexKnown ? '' : ' ' + esc(tr('fatNoSex'))) + '</p>';
        else if (sm.age === null) h += '<p class="bs-note">' + esc(tr('needB')) + '</p>';
        return h;
    }
    function formHTML(sm) {
        const showH = sm.needsHeight || editH, askSex = !sm.gender;
        return '<form class="bs-form" novalidate>' +
            '<label class="bs-field"><span>' + esc(tr('weight')) + '</span><span class="bs-in"><input id="bsKg" name="kg" inputmode="decimal" autocomplete="off" enterkeyhint="done" value="' + esc(sm.kg === null ? '' : fmt(sm.kg)) + '" aria-describedby="bsErr"><em>kg</em></span></label>' +
            (showH ? '<label class="bs-field"><span>' + esc(tr('height')) + '</span><span class="bs-in"><input id="bsCm" name="cm" inputmode="numeric" autocomplete="off" value="' + esc(sm.cm === null ? '' : sm.cm) + '"><em>cm</em></span></label>'
                : '<p class="bs-hline">' + esc(tr('height')) + ' ' + sm.cm + ' cm · <button type="button" class="bs-link" data-bs="edit-h">' + esc(tr('change')) + '</button></p>') +
            (askSex ? '<fieldset class="bs-sex"><legend>' + esc(tr('sex')) + '</legend>' + ['f', 'm', 'x'].map(g => '<button type="button" class="bs-pill' + (pickSex === g ? ' on' : '') + '" aria-pressed="' + (pickSex === g) + '" data-bs-sex="' + g + '">' + esc(tr(g)) + '</button>').join('') + '</fieldset>' : '') +
            '<p class="bs-err" id="bsErr" role="alert"></p><button type="submit" class="bs-go">' + esc(sm.weighedToday ? tr('update') : tr('save')) + '</button></form>';
    }
    function histHTML(sm) {
        const h = sm.history.slice(-12).reverse();
        if (!h.length) return '';
        return '<section class="bs-hist"><h3>' + esc(tr('hist')) + '</h3><ul>' + h.map((w, i) => {
            const prev = sm.history[sm.history.length - 1 - i - 1], d = prev ? Math.round((w.kg - prev.kg) * 10) / 10 : null;
            return '<li><span>' + esc(C.dayKey(w.ts) === C.dayKey(Date.now()) ? tr('today') : dateOf(w.ts)) + '</span><b>' + fmt(w.kg) + ' kg</b><em>' + (d === null ? '' : signed(d)) + '</em><button type="button" class="bs-x" data-bs-rm="' + w.ts + '" aria-label="' + esc(tr('remove', { d: dateOf(w.ts) })) + '">×</button></li>';
        }).join('') + '</ul></section>';
    }

    let ov = null, editH = false, pickSex = '', lastFocus = null;
    function render(keepFocus) {
        const s = state(); if (!ov || !s) return;
        const sm = C.summary(s);
        /* keep what was typed (weight AND height) when the sheet redraws for a sex pick, 'change' height or a language switch */
        const typed = {}; if (keepFocus) ['#bsKg', '#bsCm'].forEach(q => { const e = ov.querySelector(q); if (e) typed[q] = e.value; });
        ov.querySelector('.bs-body').innerHTML = statsHTML(sm) + progressHTML(sm) + formHTML(sm) + (W.LowiWeightJourney ? '<div class="bs-wj">' + W.LowiWeightJourney.cardHTML() + '</div>' : '') + histHTML(sm) + '<p class="bs-priv">' + esc(tr('private')) + '</p>';
        Object.keys(typed).forEach(q => { const e = ov.querySelector(q); if (e && typed[q] !== '') e.value = typed[q]; });
        ov.querySelector('.bs-head h2').textContent = tr('title');
        ov.querySelector('.bs-close').setAttribute('aria-label', tr('close'));
    }
    function submit() {
        const s = state(); if (!s || !ov) return;
        const err = ov.querySelector('#bsErr'), kgEl = ov.querySelector('#bsKg'), cmEl = ov.querySelector('#bsCm');
        const kg = C.parseKg(kgEl && kgEl.value), needCm = !!cmEl;
        if (kg === null) { err.textContent = tr('badKg'); kgEl.focus(); return; }
        if (needCm && C.parseCm(cmEl.value) === null && (cmEl.value.trim() || C.parseCm(s.health && s.health.heightCm) === null)) { err.textContent = tr('badCm'); cmEl.focus(); return; }
        const res = C.weighIn(s, { kg, cm: needCm && cmEl.value.trim() ? cmEl.value : undefined, gender: pickSex || undefined });
        persist(); editH = false; pickSex = '';
        const sm = C.summary(s);
        try { W.dispatchEvent(new CustomEvent('lowi:body-weighin', { detail: { kg: res.kg, bmi: sm.bmi } })); } catch (e) { }
        render();
        const go = ov.querySelector('.bs-go'); if (go) { go.textContent = tr('saved') + ' ✓'; go.classList.add('bs-done'); }
        const top = ov.querySelector('.bs-sheet'); if (top && top.scrollTo) top.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function open() {
        if (!state()) return false;
        if (ov) { render(); return true; }
        lastFocus = D.activeElement;
        ov = D.createElement('div'); ov.id = 'bsOv'; ov.className = 'bs-ov';
        ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'bsTitle');
        ov.innerHTML = '<div class="bs-sheet"><div class="bs-head"><h2 id="bsTitle"></h2><button type="button" class="bs-close" data-bs="close">×</button></div><div class="bs-body"></div></div>';
        D.body.appendChild(ov);
        render();
        ov.addEventListener('click', e => {
            const t = e.target;
            if (t === ov || t.closest('[data-bs="close"]')) { close(); return; }
            if (t.closest('[data-bs="edit-h"]')) { editH = true; render(true); const c = ov.querySelector('#bsCm'); if (c) c.focus(); return; }
            const sx = t.closest('[data-bs-sex]'); if (sx) { pickSex = sx.getAttribute('data-bs-sex'); render(true); return; }
            const rm = t.closest('[data-bs-rm]'); if (rm) { const s = state(); if (s && C.remove(s, +rm.getAttribute('data-bs-rm'))) { persist(); try { W.dispatchEvent(new CustomEvent('lowi:body-weighin', { detail: { kg: C.parseKg(s.health.weight), bmi: C.summary(s).bmi, removed: true } })); } catch (x) { } render(); } }
        });
        ov.addEventListener('submit', e => { e.preventDefault(); submit(); });
        ov.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
        const kg = ov.querySelector('#bsKg');
        try { (kg && !matchMedia('(pointer: coarse)').matches ? kg : ov.querySelector('.bs-close')).focus({ preventScroll: true }); } catch (e) { }
        return true;
    }
    function close() {
        if (!ov) return;
        const el = ov; ov = null; editH = false; pickSex = '';
        el.classList.add('bs-out');
        setTimeout(() => el.remove(), 180);
        try { if (lastFocus && lastFocus.isConnected && lastFocus.focus) lastFocus.focus({ preventScroll: true }); } catch (e) { }
    }
    /* small summary for the daily stats view (COORD-stats.md) */
    function cardHTML() {
        const s = state(); const sm = s ? C.summary(s) : null;
        if (!sm || sm.kg === null) return '<button type="button" class="bs-card" data-body-open aria-label="' + esc(tr('open')) + '"><small>' + esc(tr('title')) + '</small><b>' + esc(tr('none')) + '</b><span>' + esc(tr('weighIn')) + ' ›</span></button>';
        const p = sm.progress;
        return '<button type="button" class="bs-card" data-body-open aria-label="' + esc(tr('open')) + '"><small>' + esc(tr('title')) + '</small><b>' + fmt(sm.kg) + ' kg' + (sm.bmi !== null ? ' · ' + esc(tr('bmi')) + ' ' + fmt(sm.bmi) : '') + '</b><span>' + (sm.category ? esc(tr(sm.category)) : esc(tr('needH'))) + (p && p.count > 1 ? ' · ' + signed(p.delta) + ' kg · ' + esc(tr('level', { n: p.level })) : '') + '</span></button>';
    }
    D.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('[data-body-open]'); if (t && !(ov && ov.contains(t))) { e.preventDefault(); open(); } });
    W.addEventListener('lowi:lang', () => { if (ov) render(true); });
    /* the Stats sheet (nutri-stats.js, COORD-stats.md) shows a Weight & BMI section; tapping it opens this sheet on top */
    (W.LowiStatsPlugins = W.LowiStatsPlugins || []).push({ id: 'body', order: 20, render: () => '<section class="ns-sec bs-sec"><h4 class="ns-h">' + esc(tr('title')) + '</h4>' + cardHTML() + '</section>' });
    W.addEventListener('lowi:body-weighin', () => { try { W.LowiNutriStats && LowiNutriStats.refresh && LowiNutriStats.refresh(); } catch (e) { } });
    W.LowiBodyStats = { open, close, isOpen: () => !!ov, cardHTML, core: C, _t: T };
})();
