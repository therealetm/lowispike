/* LOWiSPIKE fasting start edit (Oct 15, 2026): "Edit start" right under the fasting timer.
   - Home: a pill on the water bubble's bottom rim, "since 18:30 \u00b7 \u270E Edit start", opens the card straight away.
   - The fasting sheet (tap the water bubble on Home) shows "since 18:30 yesterday" with an Edit start button next to it.
   - The edit card has a date and a time field filled with the saved start, quick -1 h / -30 min / +30 min / +1 h,
     a live preview of how long that makes the fast, and the phone's time zone.
   - Save writes only lowi_fast_v1.last (+ a small startEdit note). It never ends or restarts the fast, never touches
     hist / awarded / water / target, and gives no XP: points still come once, when the fast ends.
   - A start may not be in the future, more than 7 days back, or earlier than the end of the last logged fast.
   - Cancel, the scrim or Escape change nothing.
   API window.LowiFastEdit {open(), close(), isOpen(), chip(), sinceRow(text), save(t)} for other surfaces
   (e.g. the world-first Home's fasting cell: call LowiFastEdit.open() or LowiFastStop.open()).
   No tap XP (data-xtp="off"): fixing a start is not an achievement, the fast pays once when it ends.
   Event out on window: lowi:fast-start {from, to} after a save. EN / DE / ES. */
(function () {
    'use strict';
    const W = window, D = document;
    if (W.LowiFastEdit) return;
    const C = () => W.LowiFastEditCore;
    const KEY = 'lowi_fast_v1';
    const T = {
        en: { editHome: 'Edit', startAt: 'Start {t}', since: 'since {t}', bubAria: 'Edit when your fast started, now since {t}', holdAria: 'Long press to change when your fast started, now since {t}', edit: 'Edit start', set: 'Set start', title: 'When was your last meal?', sub: 'Your Gap counts from it. Fix it if the time is wrong.',
            saved: 'Saved now: {t}', date: 'Date', time: 'Time', makes: 'That makes {d} of fasting so far.', tz: 'Times in your phone\u2019s time zone ({z}).',
            future: 'That\u2019s in the future. Pick a time that has passed.', overlap: 'Your last fast ended at {t}. This one can\u2019t start earlier.', mealNote: 'Your logged meal \u201c{m}\u201d moves to this time too, so Fuel shows the same.', mealAfter: 'You logged \u201c{m}\u201d at {t}, after that. Pick {t} or later, or change that meal in Fuel.', mealBefore: 'You logged \u201c{m}\u201d at {t}, before this meal. Pick a later time.', early: 'The earliest time here is {t}.', moved: 'Last meal moved to {t}.', meal: 'your meal', storage: 'Couldn\u2019t save that. Try again, or change the meal in Fuel.',
            old: 'You can go back up to 7 days.', invalid: 'Pick a date and a time.', same: 'That\u2019s already your start.', gap: 'The clocks jumped forward at that hour, so that time never happened. Pick a time just before or after.', twice: 'The clocks went back that night, so this time happened twice. We use the first one, still summer time.',
            keep: 'Your fast keeps running. Points come when you end it.', save: 'Save start', cancel: 'Cancel', done: 'Fast start set to {t}.',
            yesterday: 'yesterday', h: 'h', m: 'min', aria: 'Edit when your fast started' },
        de: { editHome: '\u00c4ndern', startAt: 'Start {t}', since: 'seit {t}', bubAria: '\u00c4ndern, wann dein Fasten begonnen hat, gerade seit {t}', holdAria: 'Lange dr\u00fccken, um den Fastenbeginn zu \u00e4ndern, gerade seit {t}', edit: 'Start \u00e4ndern', set: 'Start setzen', title: 'Wann war deine letzte Mahlzeit?', sub: 'Deine Pause z\u00e4hlt ab hier. Korrigier sie, wenn die Zeit falsch ist.',
            saved: 'Gespeichert: {t}', date: 'Datum', time: 'Uhrzeit', makes: 'Damit fastest du schon {d}.', tz: 'Zeiten in der Zeitzone deines Handys ({z}).',
            future: 'Das liegt in der Zukunft. W\u00e4hl eine Zeit, die schon vorbei ist.', overlap: 'Dein letztes Fasten endete um {t}. Dieses kann nicht fr\u00fcher beginnen.', mealNote: 'Deine eingetragene Mahlzeit \u201e{m}\u201c wandert mit auf diese Zeit, damit Fuel dasselbe zeigt.', mealAfter: 'Du hast \u201e{m}\u201c um {t} eingetragen, also sp\u00e4ter. W\u00e4hl {t} oder sp\u00e4ter, oder \u00e4ndere die Mahlzeit in Fuel.', mealBefore: 'Davor hast du \u201e{m}\u201c um {t} eingetragen. W\u00e4hl eine sp\u00e4tere Zeit.', early: 'Fr\u00fchestens geht hier {t}.', moved: 'Letzte Mahlzeit auf {t} verschoben.', meal: 'Mahlzeit', storage: 'Das lie\u00df sich nicht speichern. Versuch es nochmal oder \u00e4ndere die Mahlzeit in Fuel.',
            old: 'Du kannst bis zu 7 Tage zur\u00fcckgehen.', invalid: 'W\u00e4hl Datum und Uhrzeit.', same: 'Das ist schon dein Start.', gap: 'Um diese Uhrzeit wurde die Uhr vorgestellt, die Zeit gab es also nicht. W\u00e4hl eine Zeit kurz davor oder danach.', twice: 'In dieser Nacht wurde die Uhr zur\u00fcckgestellt, diese Uhrzeit gab es zweimal. Wir nehmen die erste, noch Sommerzeit.',
            keep: 'Dein Fasten l\u00e4uft weiter. Punkte gibt es, wenn du es beendest.', save: 'Start speichern', cancel: 'Abbrechen', done: 'Fasten-Start auf {t} gesetzt.',
            yesterday: 'gestern', h: 'h', m: 'min', aria: '\u00c4ndern, wann dein Fasten begonnen hat' },
        es: { editHome: 'Editar', startAt: 'Inicio {t}', since: 'desde {t}', bubAria: 'Cambiar cu\u00e1ndo empez\u00f3 tu ayuno, ahora desde {t}', holdAria: 'Mant\u00e9n pulsado para cambiar cu\u00e1ndo empez\u00f3 tu ayuno, ahora desde {t}', edit: 'Cambiar inicio', set: 'Poner inicio', title: '\u00bfCu\u00e1ndo fue tu \u00faltima comida?', sub: 'Tu pausa cuenta desde aqu\u00ed. C\u00e1mbiala si la hora est\u00e1 mal.',
            saved: 'Guardado: {t}', date: 'Fecha', time: 'Hora', makes: 'As\u00ed llevas {d} de ayuno.', tz: 'Horas en la zona horaria de tu m\u00f3vil ({z}).',
            future: 'Eso est\u00e1 en el futuro. Elige una hora que ya pas\u00f3.', overlap: 'Tu \u00faltimo ayuno termin\u00f3 a las {t}. Este no puede empezar antes.', mealNote: 'Tu comida registrada \u00ab{m}\u00bb tambi\u00e9n pasa a esta hora, as\u00ed Fuel muestra lo mismo.', mealAfter: 'Registraste \u00ab{m}\u00bb a las {t}, despu\u00e9s. Elige las {t} o m\u00e1s tarde, o cambia esa comida en Fuel.', mealBefore: 'Antes registraste \u00ab{m}\u00bb a las {t}. Elige una hora m\u00e1s tarde.', early: 'Lo m\u00e1s pronto aqu\u00ed es {t}.', moved: '\u00daltima comida movida a las {t}.', meal: 'tu comida', storage: 'No se pudo guardar. Int\u00e9ntalo de nuevo o cambia la comida en Fuel.',
            old: 'Puedes volver hasta 7 d\u00edas atr\u00e1s.', invalid: 'Elige fecha y hora.', same: 'Ese ya es tu inicio.', gap: 'A esa hora se adelant\u00f3 el reloj, as\u00ed que esa hora no existi\u00f3. Elige una hora justo antes o despu\u00e9s.', twice: 'Esa noche se atras\u00f3 el reloj, as\u00ed que esta hora pas\u00f3 dos veces. Usamos la primera, a\u00fan en horario de verano.',
            keep: 'Tu ayuno sigue. Los puntos llegan cuando lo terminas.', save: 'Guardar inicio', cancel: 'Cancelar', done: 'Inicio del ayuno: {t}.',
            yesterday: 'ayer', h: 'h', m: 'min', aria: 'Cambiar cu\u00e1ndo empez\u00f3 tu ayuno' }
    };
    const lang = () => { try { const l = (W.LowiLang && LowiLang.get ? LowiLang.get() : localStorage.getItem('lowispike.lang')) || 'en'; const k = String(l).slice(0, 2); return T[k] ? k : 'en'; } catch (e) { return 'en'; } };
    const w = (k, o) => { let s = T[lang()][k]; if (s == null) s = T.en[k]; if (o) Object.keys(o).forEach(x => { s = s.split('{' + x + '}').join(o[x]); }); return s; };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const p2 = n => (n < 10 ? '0' : '') + n;
    const hm = t => { const d = new Date(t); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
    const loc = () => ({ de: 'de-DE', es: 'es-ES' })[lang()] || 'en-GB';
    /* same wording as the fasting sheet: "18:30", "18:30 yesterday", "18:30 Tue, 13 Oct" */
    function at(t) {
        const a = new Date(t), b = new Date(); a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
        const n = Math.round((a - b) / 864e5);
        if (n === 0) return hm(t);
        if (n === -1) return hm(t) + ' ' + w('yesterday');
        try { return hm(t) + ' ' + new Date(t).toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return hm(t); }
    }
    const dur = ms => { const m = Math.max(0, Math.floor(ms / 60000)); return m >= 60 ? Math.floor(m / 60) + ' ' + w('h') + ' ' + p2(m % 60) + ' ' + w('m') : m + ' ' + w('m'); };
    const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } };
    /* Oct 21: the offset of the picked time, not of now: a start before the clock change reads UTC+2, after it UTC+1 */
    const tzLabel = t => { const z = tz(); let o = ''; try { o = C() && C().offsetLabel ? C().offsetLabel(t) : ''; } catch (e) {} return z ? z.replace(/_/g, ' ') + (o ? ', ' + o : '') : o; };
    const sfx = n => { try { W.LowiSFX && LowiSFX.play(n); } catch (e) {} };
    function st() { let s; try { s = (o => o && typeof o === "object" ? o : {})(JSON.parse(localStorage.getItem(KEY))); } catch (e) { s = {}; } if (!s || typeof s !== 'object') s = {}; return s; }
    /* Oct 24 gaptime: the logged meals (S.logs via LowiFastStop), so the edit can move the meal the Gap counts from */
    function meals() { try { if (W.LowiFastStop && LowiFastStop.mealList) return LowiFastStop.mealList() || []; } catch (e) {} return []; }
    const mealName = m => { const n = m && m.t ? String(m.t).trim() : ''; return n ? (n.length > 40 ? n.slice(0, 39) + '\u2026' : n) : w('meal'); };
    /* Oct 24: the native date/time fields show the PHONE's language ("24 Oct 2026" in the German sheet on an English iPhone).
       A label in the app's language sits on top; the native field stays underneath for the tap and the picker. */
    function showDate(v) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '')); if (!m) return ''; try { return new Date(+m[1], +m[2] - 1, +m[3], 12).toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return v; } }
    function showTime(v) { const m = /^(\d{1,2}):(\d{2})/.exec(String(v || '')); return m ? p2(+m[1]) + ':' + m[2] : ''; }
    function paintShown() {
        if (!ov) return;
        const d = ov.querySelector('#feDate'), t = ov.querySelector('#feTime'), sd = ov.querySelector('#feDateShow'), stt = ov.querySelector('#feTimeShow');
        if (sd && d) sd.textContent = showDate(d.value); if (stt && t) stt.textContent = showTime(t.value);
    }
    function curStart() { try { if (W.LowiFastStop && LowiFastStop.startOf) return +LowiFastStop.startOf() || 0; } catch (e) {} return C() ? C().startOf(st()) : (+st().last || 0); }

    function css() {
        if (D.getElementById('feCss')) return;
        const l = D.createElement('link'); l.id = 'feCss'; l.rel = 'stylesheet';
        const me = D.querySelector('script[src*="fast-edit.js"]');
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('fast-edit.js', 'fast-edit.css') : 'fast-edit.css';
        D.head.appendChild(l);
    }
    css();

    /* ---------- pieces the fasting sheet drops in ---------- */
    function chip() { const s = curStart(); return '<button type="button" class="fe-chip" data-fse="open" data-xtp="off" aria-label="' + esc(w('aria')) + '"><i aria-hidden="true">\u270E</i>' + esc(w(s ? 'edit' : 'set')) + '</button>'; }
    function sinceRow(text) { return '<span class="fe-srow"><span class="fst-since">' + esc(text) + '</span>' + chip() + '</span>'; }

    /* ---------- the edit card ---------- */
    let ov = null, orig = 0, lastFocus = null;
    function isOpen() { return !!(ov && ov.isConnected); }
    function read() {
        if (!ov) return NaN;
        const d = ov.querySelector('#feDate'), t = ov.querySelector('#feTime');
        return C().fromParts(d && d.value, t && t.value);
    }
    function check() {
        if (!ov) return;
        const now = Date.now(), t = read(), s = st(), ml = meals(), v = C().plan ? C().plan(s, ml, t, now) : C().validate(t, s, now);
        paintShown();
        const msg = ov.querySelector('.fe-msg'), pre = ov.querySelector('.fe-pre'), go = ov.querySelector('[data-fse="save"]');
        const dEl = ov.querySelector('#feDate'), tEl = ov.querySelector('#feTime');
        const rp = C().readParts ? C().readParts(dEl && dEl.value, tEl && tEl.value) : { err: '' };
        let m = '', bad = false;
        if (!v.ok) {
            if (rp.err === 'gap') m = w('gap');
            else if (v.err === 'overlap') m = v.floor ? w('early', { t: at(v.floor) }) : w('overlap', { t: at(C().prevEnd(s)) });
            else if (v.err === 'mealAfter' || v.err === 'mealBefore') m = w(v.err, { m: mealName(v.meal), t: at(v.meal.ts) });
            else if (v.err !== 'same') m = w(v.err);
            bad = v.err !== 'same';
        }
        const tzEl = ov.querySelector('.fe-tz');
        if (tzEl) tzEl.textContent = w('tz', { z: tzLabel(isFinite(t) ? t : now) }) + (!bad && C().twice && C().twice(t) ? ' ' + w('twice') : '');
        if (msg) { msg.textContent = m; msg.hidden = !m; }
        const gm = C().gapMeal ? C().gapMeal(s, ml, now) : null, keepEl = ov.querySelector('.fe-keep');
        if (keepEl) keepEl.textContent = gm ? w('mealNote', { m: mealName(gm) }) : w('keep');
        if (pre) { pre.textContent = isFinite(t) && t <= now ? w('makes', { d: dur(now - t) }) : ''; pre.classList.toggle('bad', bad); }
        if (go) { go.disabled = bad; go.setAttribute('aria-disabled', String(bad)); }
        ov.querySelector('.fe-card').classList.toggle('fe-bad', bad);
        return v;
    }
    function html() {
        const s = st(), now = Date.now(), b = C().planBounds ? C().planBounds(s, meals(), now) : C().bounds(s, now), cur = curStart();
        const pre = cur && cur <= now ? cur : C().bounds(s, now).max;
        orig = cur;
        const p = C().parts(pre), mn = C().parts(b.min), mx = C().parts(b.max);
        return '<div class="fe-card" role="dialog" aria-modal="true" aria-labelledby="feT" tabindex="-1">' +
            '<div class="fe-hd"><span class="fe-ic" aria-hidden="true">\u23F3</span><div><h2 id="feT" class="fe-t">' + esc(w('title')) + '</h2><p class="fe-sub">' + esc(w('sub')) + '</p></div></div>' +
            (cur ? '<div class="fe-cur">' + esc(w('saved', { t: at(cur) })) + '</div>' : '') +
            '<div class="fe-fields">' +
            '<label class="fe-f"><span>' + esc(w('date')) + '</span><span class="fe-in"><input type="date" id="feDate" value="' + p.date + '" min="' + mn.date + '" max="' + mx.date + '" lang="' + loc() + '" required><b class="fe-show" id="feDateShow" aria-hidden="true">' + esc(showDate(p.date)) + '</b></span></label>' +
            '<label class="fe-f"><span>' + esc(w('time')) + '</span><span class="fe-in"><input type="time" id="feTime" value="' + p.time + '" step="60" lang="' + loc() + '" required><b class="fe-show" id="feTimeShow" aria-hidden="true">' + esc(showTime(p.time)) + '</b></span></label></div>' +
            '<div class="fe-nudge" role="group">' + [[-60, '\u22121 h'], [-30, '\u221230 min'], [30, '+30 min'], [60, '+1 h']].map(x => '<button type="button" class="fe-n" data-fse="nudge" data-m="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
            '<p class="fe-pre num" aria-live="polite"></p><p class="fe-msg" role="alert" hidden></p>' +
            '<p class="fe-tz">' + esc(w('tz', { z: tzLabel(pre) })) + '</p><p class="fe-keep">' + esc(w('keep')) + '</p>' +
            '<div class="fe-acts"><button type="button" class="fe-cancel" data-fse="cancel">' + esc(w('cancel')) + '</button><button type="button" class="fe-save" data-fse="save">' + esc(w('save')) + '</button></div></div>';
    }
    /* Oct 28 slim structure, batch 3 (nutrition hub): "Wann war deine letzte Mahlzeit?" is no separate sheet any more. It opens
       inline inside the Essenspause panel (gap-view.js passes {host}); every old caller (holding the gap bubble, morning card)
       lands in that panel with the editor open. {sheet:true} keeps the old overlay where no panel exists. */
    let inline = false;
    function open(opts) {
        if (!C()) return false;
        const host = opts && opts.host;
        if (!host && !(opts && opts.sheet)) {
            const G = W.LowiGapView;
            if (G && typeof G.open === 'function' && typeof G.edit === 'function') {
                if (isOpen() && inline) return true;
                return G.isOpen && G.isOpen() ? G.edit() : G.open({ edit: true });
            }
        }
        if (isOpen()) { if (!host || !inline) return true; close(true); }
        lastFocus = D.activeElement;
        inline = !!host;
        ov = D.createElement('div'); ov.id = 'feOv'; ov.className = inline ? 'fe-inline' : 'fe-ov'; ov.setAttribute('data-noi18n', ''); ov.setAttribute('data-xtp', 'off');
        ov.innerHTML = html();
        if (inline) {
            const c = ov.querySelector('.fe-card'); if (c) { c.setAttribute('role', 'group'); c.removeAttribute('aria-modal'); }
            host.appendChild(ov); check(); sfx('open');
            try { const f = ov.querySelector('#feTime') || ov.querySelector('.fe-card'); f.focus({ preventScroll: true }); } catch (e) {}
            return true;
        }
        D.body.appendChild(ov);
        D.documentElement.classList.add('fe-up');
        check(); sfx('open');
        requestAnimationFrame(() => requestAnimationFrame(() => { if (ov) ov.classList.add('in'); }));
        try { ov.querySelector('.fe-card').focus({ preventScroll: true }); } catch (e) {}
        return true;
    }
    function close(silent) {
        const o = ov; ov = null; D.documentElement.classList.remove('fe-up');
        if (!o) return;
        if (inline) { inline = false; o.remove(); if (!silent) sfx('close'); try { const G = W.LowiGapView; if (G && G.isOpen && G.isOpen()) { const fx = D.querySelector('#gvSheet .gv-fix'); if (fx) { fx.setAttribute('aria-expanded', 'false'); fx.focus({ preventScroll: true }); } } } catch (e) {} return; }
        o.classList.remove('in'); o.classList.add('out');
        setTimeout(() => o.remove(), 220);
        if (!silent) sfx('close');
        try { if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true }); } catch (e) {}
    }
    function repaint() {
        try { if (W.LowiFastStop && LowiFastStop.paint) LowiFastStop.paint(); } catch (e) {}
        try { if (W.LowiFast && LowiFast.refresh) LowiFast.refresh(); } catch (e) {}
        try { if (W.R3A && R3A.paintMorning) R3A.paintMorning(); } catch (e) {}
        try { if (W.LowiSpirit && LowiSpirit.refresh) LowiSpirit.refresh(); } catch (e) {}
        try { if (W.LowiFastBubble && LowiFastBubble.refresh) LowiFastBubble.refresh(); } catch (e) {}
        try { if (W.LowiE1 && LowiE1.paint) LowiE1.paint(); } catch (e) {}
        try { ensurePill(); } catch (e) {}
        /* the reminder server gets the new fast start on its next sync */
        try { if (W.LowiN1P && LowiN1P.sync) { const r = LowiN1P.sync(); if (r && r.catch) r.catch(() => {}); } } catch (e) {}
    }
    /* save a new start (epoch ms); returns {ok, err?} — used by the card and by other surfaces */
    function save(t) {
        const s0 = st(), pl = C().plan ? C().plan(s0, meals(), t, Date.now()) : null;
        if (pl && !pl.ok) return { ok: false, err: pl.err };
        if (pl && pl.move) return saveMove(pl.move);
        const s = st(), r = C().apply(s, t, Date.now());
        if (!r.ok) return { ok: false, err: r.err };
        /* re-read right before writing so nothing written meanwhile (water, target) is lost: only last + startEdit change */
        const fresh = st(); fresh.last = r.state.last; fresh.startEdit = r.state.startEdit;
        try { localStorage.setItem(KEY, JSON.stringify(fresh)); } catch (e) { return { ok: false, err: 'storage' }; }
        repaint();
        try { W.dispatchEvent(new CustomEvent('lowi:fast-start', { detail: { from: r.from || null, to: r.to } })); } catch (e) {}
        return { ok: true, from: r.from, to: r.to };
    }
    /* Oct 24 gaptime: the Gap counts from a logged meal, so move that meal (Fuel's own path: editMeal -> lowi:meal-moved -> remeal
       ends the fast at the new time, takes back and re-gives its points once, and the newest meal stays the one Gap counts from) */
    function saveMove(mv) {
        const B = W.LowiVitalsBridge;
        if (!B || typeof B.editMeal !== 'function') return { ok: false, err: 'storage' };
        let r = null;
        try { r = B.editMeal({ id: mv.id, ts: mv.to, anyDay: true }); } catch (e) { console.error(e); }
        if (!r || !r.moved) return { ok: false, err: 'storage' };
        try { const f = st(); f.startEdit = { at: Date.now(), from: mv.from, to: mv.to, meal: mv.ev || mv.id }; localStorage.setItem(KEY, JSON.stringify(f)); } catch (e) {}
        repaint();
        try { W.dispatchEvent(new CustomEvent('lowi:fast-start', { detail: { from: mv.from, to: mv.to, meal: mv.ev || mv.id } })); } catch (e) {}
        return { ok: true, from: mv.from, to: mv.to, moved: true };
    }
    function doSave() {
        const v = check();
        if (!v) return;
        if (!v.ok) { if (v.err === 'same') close(); else { sfx('error'); const c = ov && ov.querySelector('.fe-card'); if (c) { c.classList.remove('fe-shake'); void c.offsetWidth; c.classList.add('fe-shake'); } } return; }
        const r = save(v.t);
        if (!r.ok) { sfx('error'); const mg = ov && ov.querySelector('.fe-msg'); if (mg && r.err === 'storage') { mg.textContent = w('storage') || ''; mg.hidden = !mg.textContent; } return; }
        close(true); sfx('check');
        const dn = w(r.moved ? 'moved' : 'done', { t: at(r.to) });
        try { if (typeof W.toast === 'function') W.toast(dn); else if (W.LowiR2 && LowiR2.toast) LowiR2.toast(dn); } catch (e) {}
        const sum = D.querySelector('#fstSheet .fst-sum');
        if (sum) { sum.classList.remove('fe-pop'); void sum.offsetWidth; sum.classList.add('fe-pop'); }
    }
    function nudge(min) {
        const t = read(), now = Date.now(), base = isFinite(t) ? t : (curStart() || now);
        let n = base + min * 60000;
        const b = C().planBounds ? C().planBounds(st(), meals(), now) : C().bounds(st(), now); /* Oct 24: with the meals in, so -1 h isn't clamped to the meal's own fast */
        n = Math.max(b.min, Math.min(b.max, n));
        const p = C().parts(n);
        ov.querySelector('#feDate').value = p.date; ov.querySelector('#feTime').value = p.time;
        check(); sfx('tap');
    }

    /* ---------- events ---------- */
    D.addEventListener('click', e => {
        const t = e.target; if (!t || !t.closest) return;
        if (ov && !inline && t === ov) { e.preventDefault(); e.stopPropagation(); close(); return; }
        const a = t.closest('[data-fse]'); if (!a) return;
        const k = a.dataset.fse;
        if (k === 'open') { e.preventDefault(); e.stopPropagation(); open(); return; }
        if (!ov || !ov.contains(a)) return;
        e.preventDefault(); e.stopPropagation();
        if (k === 'cancel') close();
        else if (k === 'save') doSave();
        else if (k === 'nudge') nudge(+a.dataset.m || 0);
    }, true);
    D.addEventListener('input', e => { if (ov && e.target && (e.target.id === 'feDate' || e.target.id === 'feTime')) check(); });
    D.addEventListener('change', e => { if (ov && e.target && (e.target.id === 'feDate' || e.target.id === 'feTime')) check(); });
    /* the native field sits under the app-language label: with a mouse, a click opens its picker (on touch the field opens itself) */
    D.addEventListener('click', e => { const el = e.target; if (!ov || !el || (el.id !== 'feDate' && el.id !== 'feTime')) return; try { if (W.matchMedia && matchMedia('(pointer: fine)').matches && el.showPicker) el.showPicker(); } catch (x) {} });
    D.addEventListener('keydown', e => {
        if (!ov) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); close(); }
        else if (e.key === 'Enter' && e.target && (e.target.id === 'feDate' || e.target.id === 'feTime')) { e.preventDefault(); doSave(); }
    }, true);
    /* the preview keeps counting while the card is open */
    setInterval(() => { if (ov && !D.hidden) check(); }, 30000);

    /* ---------- Home: a plain "Edit" right above the word "Fasting" (Oct 16, E-man: "put Edit above the word Fasting") ----------
       It replaced the "since 18:30 · ✎ Edit start" pill under the bubble. A real <button> next to #spFast (never inside it: the bubble
       is a button itself), centred over the bubble's first label line ("Fasting"). Tapping it opens the start-time editor as before.
       Hidden when no fast is running. */
    let pill = null, pillKey = '', ro = null, roEl = null;
    function bubble() { const f = D.getElementById('spFast'); return f && f.parentElement ? f : null; }
    function pillHTML() { return '<span class="fe-el">' + esc(w('editHome')) + '</span>'; } /* Oct 16: just "Edit" on Home, no squeezed "Edit start" */
    function place() {
        const f = bubble();
        if (!pill || !f || pill.parentElement !== f.parentElement) return;
        const host = f.parentElement, hr = host.getBoundingClientRect(), fr = f.getBoundingClientRect();
        if (!fr.width || !hr.width) { pill.hidden = true; return; }
        pill.hidden = false;
        const cp = f.querySelector('.sp-fast-copy');
        let lab = null;
        if (cp) for (const n of cp.children) { const r = n.getBoundingClientRect(); if (r.height && r.width) { lab = r; break; } }
        const pw = pill.offsetWidth, ph = pill.offsetHeight;
        const cx = lab ? lab.left + lab.width / 2 : fr.left + fr.width / 2;
        const top = lab ? Math.min(lab.top, fr.top + fr.height * 0.32) : fr.top + fr.height * 0.18;
        const x = Math.max(hr.left + 2, Math.min(hr.right - 2 - pw, cx - pw / 2)), y = top - ph - 1;
        pill.style.left = Math.round(x - hr.left - host.clientLeft) + 'px';
        pill.style.top = Math.round(y - hr.top - host.clientTop) + 'px';
    }
    /* Oct 17 (Emmanuel): "why do we have an extra Edit button above the fasting bubble?" - the pill is retired. Editing the start lives
       IN the bubble now: long press the fasting bubble (living-bubbles.js calls open()), and the Edit chip in the fasting sheet stays.
       This only clears an old pill and tells screen readers about the long press. */
    function ensurePill() {
        if (pill) { pill.remove(); pill = null; pillKey = ''; }
        const old = D.getElementById('feBub'); if (old) old.remove();
        const f = bubble(), start = f ? curStart() : 0;
        if (!f) return;
        const key = lang() + '|' + start + '|' + new Date().getDate();
        if (key === pillKey) return;
        pillKey = key;
        if (start && start <= Date.now()) f.setAttribute('aria-description', w('holdAria', { t: at(start) }));
        else f.removeAttribute('aria-description');
    }
    /* only while Home is the page you see: behind Community this measured Home every 1.5 s for nothing (Oct 16, the spirit-world hitches) */
    const homeOn = () => { const t = D.getElementById('tab-home'); return !t || t.classList.contains('active'); };
    setInterval(() => { if (!D.hidden && homeOn()) ensurePill(); }, 1500);
    W.addEventListener('resize', () => { try { place(); } catch (e) {} });
    W.addEventListener('lowi:fast-start', () => setTimeout(ensurePill, 0));
    W.addEventListener('storage', e => { if (e.key === KEY) ensurePill(); });
    D.addEventListener('visibilitychange', () => { if (!D.hidden) ensurePill(); });
    setTimeout(ensurePill, 300);

    W.LowiFastEdit = { open, close: () => close(), isOpen, chip, sinceRow, save, at, w, pill: ensurePill, startOf: () => curStart(), _orig: () => orig };
    /* the fasting sheet may already be open (it was built before this file ran): drop the button in now */
    try { if (D.getElementById('fstSheet') && W.LowiFastStop && LowiFastStop.paint) LowiFastStop.paint(); } catch (e) {}
})();
