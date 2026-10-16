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
        en: { editHome: 'Edit', startAt: 'Start {t}', since: 'since {t}', bubAria: 'Edit when your fast started, now since {t}', edit: 'Edit start', set: 'Set start', title: 'When did your fast start?', sub: 'Your last meal. Fix it if the clock started at the wrong time.',
            saved: 'Saved now: {t}', date: 'Date', time: 'Time', makes: 'That makes {d} of fasting so far.', tz: 'Times in your phone\u2019s time zone ({z}).',
            future: 'That\u2019s in the future. Pick a time that has passed.', overlap: 'Your last fast ended at {t}. This one can\u2019t start earlier.',
            old: 'You can go back up to 7 days.', invalid: 'Pick a date and a time.', same: 'That\u2019s already your start.',
            keep: 'Your fast keeps running. Points come when you end it.', save: 'Save start', cancel: 'Cancel', done: 'Fast start set to {t}.',
            yesterday: 'yesterday', h: 'h', m: 'min', aria: 'Edit when your fast started' },
        de: { editHome: '\u00c4ndern', startAt: 'Start {t}', since: 'seit {t}', bubAria: '\u00c4ndern, wann dein Fasten begonnen hat, gerade seit {t}', edit: 'Start \u00e4ndern', set: 'Start setzen', title: 'Wann hat dein Fasten begonnen?', sub: 'Deine letzte Mahlzeit. Korrigier sie, wenn die Uhr zur falschen Zeit gestartet ist.',
            saved: 'Gespeichert: {t}', date: 'Datum', time: 'Uhrzeit', makes: 'Damit fastest du schon {d}.', tz: 'Zeiten in der Zeitzone deines Handys ({z}).',
            future: 'Das liegt in der Zukunft. W\u00e4hl eine Zeit, die schon vorbei ist.', overlap: 'Dein letztes Fasten endete um {t}. Dieses kann nicht fr\u00fcher beginnen.',
            old: 'Du kannst bis zu 7 Tage zur\u00fcckgehen.', invalid: 'W\u00e4hl Datum und Uhrzeit.', same: 'Das ist schon dein Start.',
            keep: 'Dein Fasten l\u00e4uft weiter. Punkte gibt es, wenn du es beendest.', save: 'Start speichern', cancel: 'Abbrechen', done: 'Fasten-Start auf {t} gesetzt.',
            yesterday: 'gestern', h: 'h', m: 'min', aria: '\u00c4ndern, wann dein Fasten begonnen hat' },
        es: { editHome: 'Editar', startAt: 'Inicio {t}', since: 'desde {t}', bubAria: 'Cambiar cu\u00e1ndo empez\u00f3 tu ayuno, ahora desde {t}', edit: 'Cambiar inicio', set: 'Poner inicio', title: '\u00bfCu\u00e1ndo empez\u00f3 tu ayuno?', sub: 'Tu \u00faltima comida. C\u00e1mbiala si el reloj empez\u00f3 a la hora equivocada.',
            saved: 'Guardado: {t}', date: 'Fecha', time: 'Hora', makes: 'As\u00ed llevas {d} de ayuno.', tz: 'Horas en la zona horaria de tu m\u00f3vil ({z}).',
            future: 'Eso est\u00e1 en el futuro. Elige una hora que ya pas\u00f3.', overlap: 'Tu \u00faltimo ayuno termin\u00f3 a las {t}. Este no puede empezar antes.',
            old: 'Puedes volver hasta 7 d\u00edas atr\u00e1s.', invalid: 'Elige fecha y hora.', same: 'Ese ya es tu inicio.',
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
    const tzLabel = () => { const z = tz(); let o = ''; try { const off = -new Date().getTimezoneOffset(); o = 'UTC' + (off >= 0 ? '+' : '\u2212') + Math.floor(Math.abs(off) / 60) + (Math.abs(off) % 60 ? ':' + p2(Math.abs(off) % 60) : ''); } catch (e) {} return z ? z.replace(/_/g, ' ') + ', ' + o : o; };
    const sfx = n => { try { W.LowiSFX && LowiSFX.play(n); } catch (e) {} };
    function st() { let s; try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { s = {}; } if (!s || typeof s !== 'object') s = {}; return s; }
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
        const now = Date.now(), t = read(), s = st(), v = C().validate(t, s, now);
        const msg = ov.querySelector('.fe-msg'), pre = ov.querySelector('.fe-pre'), go = ov.querySelector('[data-fse="save"]');
        let m = '', bad = false;
        if (!v.ok) {
            if (v.err === 'overlap') m = w('overlap', { t: at(C().prevEnd(s)) });
            else if (v.err !== 'same') m = w(v.err);
            bad = v.err !== 'same';
        }
        if (msg) { msg.textContent = m; msg.hidden = !m; }
        if (pre) { pre.textContent = isFinite(t) && t <= now ? w('makes', { d: dur(now - t) }) : ''; pre.classList.toggle('bad', bad); }
        if (go) { go.disabled = bad; go.setAttribute('aria-disabled', String(bad)); }
        ov.querySelector('.fe-card').classList.toggle('fe-bad', bad);
        return v;
    }
    function html() {
        const s = st(), now = Date.now(), b = C().bounds(s, now), cur = curStart();
        const pre = cur && cur <= now ? cur : C().bounds(s, now).max;
        orig = cur;
        const p = C().parts(pre), mn = C().parts(b.min), mx = C().parts(b.max);
        return '<div class="fe-card" role="dialog" aria-modal="true" aria-labelledby="feT" tabindex="-1">' +
            '<div class="fe-hd"><span class="fe-ic" aria-hidden="true">\u23F3</span><div><h2 id="feT" class="fe-t">' + esc(w('title')) + '</h2><p class="fe-sub">' + esc(w('sub')) + '</p></div></div>' +
            (cur ? '<div class="fe-cur">' + esc(w('saved', { t: at(cur) })) + '</div>' : '') +
            '<div class="fe-fields">' +
            '<label class="fe-f"><span>' + esc(w('date')) + '</span><input type="date" id="feDate" value="' + p.date + '" min="' + mn.date + '" max="' + mx.date + '" required></label>' +
            '<label class="fe-f"><span>' + esc(w('time')) + '</span><input type="time" id="feTime" value="' + p.time + '" step="60" required></label></div>' +
            '<div class="fe-nudge" role="group">' + [[-60, '\u22121 h'], [-30, '\u221230 min'], [30, '+30 min'], [60, '+1 h']].map(x => '<button type="button" class="fe-n" data-fse="nudge" data-m="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
            '<p class="fe-pre num" aria-live="polite"></p><p class="fe-msg" role="alert" hidden></p>' +
            '<p class="fe-tz">' + esc(w('tz', { z: tzLabel() })) + '</p><p class="fe-keep">' + esc(w('keep')) + '</p>' +
            '<div class="fe-acts"><button type="button" class="fe-cancel" data-fse="cancel">' + esc(w('cancel')) + '</button><button type="button" class="fe-save" data-fse="save">' + esc(w('save')) + '</button></div></div>';
    }
    function open() {
        if (!C()) return false;
        if (isOpen()) return true;
        lastFocus = D.activeElement;
        ov = D.createElement('div'); ov.id = 'feOv'; ov.className = 'fe-ov'; ov.setAttribute('data-noi18n', ''); ov.setAttribute('data-xtp', 'off');
        ov.innerHTML = html();
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
        const s = st(), r = C().apply(s, t, Date.now());
        if (!r.ok) return { ok: false, err: r.err };
        /* re-read right before writing so nothing written meanwhile (water, target) is lost: only last + startEdit change */
        const fresh = st(); fresh.last = r.state.last; fresh.startEdit = r.state.startEdit;
        try { localStorage.setItem(KEY, JSON.stringify(fresh)); } catch (e) { return { ok: false, err: 'storage' }; }
        repaint();
        try { W.dispatchEvent(new CustomEvent('lowi:fast-start', { detail: { from: r.from || null, to: r.to } })); } catch (e) {}
        return { ok: true, from: r.from, to: r.to };
    }
    function doSave() {
        const v = check();
        if (!v) return;
        if (!v.ok) { if (v.err === 'same') close(); else { sfx('error'); const c = ov && ov.querySelector('.fe-card'); if (c) { c.classList.remove('fe-shake'); void c.offsetWidth; c.classList.add('fe-shake'); } } return; }
        const r = save(v.t);
        if (!r.ok) return;
        close(true); sfx('check');
        try { if (typeof W.toast === 'function') W.toast(w('done', { t: at(r.to) })); else if (W.LowiR2 && LowiR2.toast) LowiR2.toast(w('done', { t: at(r.to) })); } catch (e) {}
        const sum = D.querySelector('#fstSheet .fst-sum');
        if (sum) { sum.classList.remove('fe-pop'); void sum.offsetWidth; sum.classList.add('fe-pop'); }
    }
    function nudge(min) {
        const t = read(), now = Date.now(), base = isFinite(t) ? t : (curStart() || now);
        let n = base + min * 60000;
        const b = C().bounds(st(), now);
        n = Math.max(b.min, Math.min(b.max, n));
        const p = C().parts(n);
        ov.querySelector('#feDate').value = p.date; ov.querySelector('#feTime').value = p.time;
        check(); sfx('tap');
    }

    /* ---------- events ---------- */
    D.addEventListener('click', e => {
        const t = e.target; if (!t || !t.closest) return;
        if (ov && t === ov) { e.preventDefault(); e.stopPropagation(); close(); return; }
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
    D.addEventListener('keydown', e => {
        if (!ov) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
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
    function ensurePill() {
        const f = bubble(), start = f ? curStart() : 0;
        if (!f || !start || start > Date.now()) { if (pill) { pill.remove(); pill = null; pillKey = ''; } return; }
        if (!pill || pill.parentElement !== f.parentElement) {
            if (pill) pill.remove();
            pill = D.createElement('button');
            pill.type = 'button'; pill.className = 'fe-bub'; pill.id = 'feBub';
            pill.setAttribute('data-fse', 'open'); pill.setAttribute('data-noi18n', ''); pill.setAttribute('data-xtp', 'off');
            if (getComputedStyle(f.parentElement).position === 'static') f.parentElement.style.position = 'relative';
            f.insertAdjacentElement('afterend', pill);
            pillKey = '';
            if (W.ResizeObserver && roEl !== f) { try { ro && ro.disconnect(); ro = new ResizeObserver(() => place()); ro.observe(f); ro.observe(f.parentElement); roEl = f; } catch (e) {} }
        }
        const key = lang() + '|' + start + '|' + new Date().getDate();
        if (key !== pillKey) {
            pillKey = key;
            pill.innerHTML = pillHTML();
            pill.setAttribute('aria-label', w('bubAria', { t: at(start) }));
        }
        place();
    }
    /* only while Home is the page you see: behind Community this measured Home every 1.5 s for nothing (Oct 16, the spirit-world hitches) */
    const homeOn = () => { const t = D.getElementById('tab-home'); return !t || t.classList.contains('active'); };
    setInterval(() => { if (!D.hidden && homeOn()) ensurePill(); }, 1500);
    W.addEventListener('resize', () => { try { place(); } catch (e) {} });
    W.addEventListener('lowi:fast-start', () => setTimeout(ensurePill, 0));
    W.addEventListener('storage', e => { if (e.key === KEY) ensurePill(); });
    D.addEventListener('visibilitychange', () => { if (!D.hidden) ensurePill(); });
    setTimeout(ensurePill, 300);

    W.LowiFastEdit = { open, close: () => close(), isOpen, chip, sinceRow, save, at, w, pill: ensurePill, _orig: () => orig };
    /* the fasting sheet may already be open (it was built before this file ran): drop the button in now */
    try { if (D.getElementById('fstSheet') && W.LowiFastStop && LowiFastStop.paint) LowiFastStop.paint(); } catch (e) {}
})();
