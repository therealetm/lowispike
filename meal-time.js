/* LOWiSPIKE meal time (Oct 28, 2026). Antje (about 70) logged dinner by photo, then "meine drei obligatorischen Spiegeleier"
   from 8:00 in the morning: "Ich kann die Zeit ändern, aber ich kann's nirgends speichern." Emmanuel: "Wir müssen das für
   sie, für solche Kunden einfacher machen."
   One time chooser for every place a meal's time is set: big plain choices (Jetzt / Heute früh / Mittags / Abends / Gestern
   Abend / Andere Zeit), and the time counts the moment it is picked, with a clear line under it: "✓ Zeit gespeichert: 08:00".
   No separate save step for the time. A gallery photo offers the time it was taken (exifTime).
   LowiMealTime.html(opts) -> markup; LowiMealTime.mount(root, {at, photoAt, onPick(at) -> true|false|string}) wires it.
   Pure helpers (choices, label, fromDayTime, exifTime) are tested in tests/meal-time.test.cjs. */
(function (root) {
    'use strict';
    const MIN = 60000, DAY = 864e5, BACK_DAYS = 7;
    const T = {
        en: { q: 'When did you eat?', now: 'Now', morning: 'This morning', noon: 'Midday', evening: 'Evening', yest: 'Yesterday evening', other: 'Other time',
            photo: 'Photo time', day: 'Day', time: 'Time', today: 'Today', yesterday: 'Yesterday', saved: 'Time saved: {t}', savedNow: 'Time saved: now ({t})',
            fromPhoto: 'Taken from the photo: {t}', future: 'That time hasn\u2019t come yet. Pick a time that has passed.', old: 'Up to 7 days back.', yestAt: 'yesterday, {t}' },
        de: { q: 'Wann hast du gegessen?', now: 'Jetzt', morning: 'Heute fr\u00fch', noon: 'Mittags', evening: 'Abends', yest: 'Gestern Abend', other: 'Andere Zeit',
            photo: 'Foto-Zeit', day: 'Tag', time: 'Uhrzeit', today: 'Heute', yesterday: 'Gestern', saved: 'Zeit gespeichert: {t}', savedNow: 'Zeit gespeichert: jetzt ({t})',
            fromPhoto: 'Zeit vom Foto \u00fcbernommen: {t}', future: 'Diese Zeit ist noch nicht vorbei. W\u00e4hl eine fr\u00fchere Zeit.', old: 'Bis zu 7 Tage zur\u00fcck.', yestAt: 'gestern, {t}' },
        es: { q: '\u00bfCu\u00e1ndo comiste?', now: 'Ahora', morning: 'Esta ma\u00f1ana', noon: 'Mediod\u00eda', evening: 'Noche', yest: 'Anoche', other: 'Otra hora',
            photo: 'Hora de la foto', day: 'D\u00eda', time: 'Hora', today: 'Hoy', yesterday: 'Ayer', saved: 'Hora guardada: {t}', savedNow: 'Hora guardada: ahora ({t})',
            fromPhoto: 'Hora tomada de la foto: {t}', future: 'Esa hora a\u00fan no ha llegado. Elige una hora que ya pas\u00f3.', old: 'Hasta 7 d\u00edas atr\u00e1s.', yestAt: 'ayer, {t}' }
    };
    /* the fixed times behind the plain words; each shows its time on the button, so nobody has to guess */
    const SLOTS = [['morning', 8, 0, 0], ['noon', 12, 30, 0], ['evening', 19, 0, 0], ['yest', 19, 0, 1]];
    const p2 = n => String(n).padStart(2, '0');
    const hm = t => { const d = new Date(+t); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
    const lang = () => { try { const l = (root.LowiLang && root.LowiLang.get ? root.LowiLang.get() : root.localStorage && root.localStorage.getItem('lowispike.lang')) || (root.document && root.document.documentElement.lang) || 'en'; const k = String(l).slice(0, 2); return T[k] ? k : 'en'; } catch (e) { return 'en'; } };
    const w = (k, v, L) => { let s = (T[L || lang()] || T.en)[k] || T.en[k] || k; if (v) Object.keys(v).forEach(x => { s = s.split('{' + x + '}').join(v[x]); }); return s; };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function at(base, h, m, back) { const d = new Date(+base); d.setDate(d.getDate() - (back || 0)); d.setHours(h, m, 0, 0); return d.getTime(); }
    const sameDay = (a, b) => new Date(+a).toDateString() === new Date(+b).toDateString();
    /* the quick choices for this moment: Jetzt, then the ones that have already passed today, then yesterday evening */
    function choices(now, L) {
        now = +now || Date.now();
        const out = [{ k: 'now', at: 0, label: w('now', null, L), time: hm(now) }];
        SLOTS.forEach(s => { const t = at(now, s[1], s[2], s[3]); if (t <= now - MIN) out.push({ k: s[0], at: t, label: w(s[0], null, L), time: hm(t) }); });
        return out;
    }
    /* "08:00" today, "gestern, 19:00", else "Mo., 26. Okt., 19:00" */
    function label(t, now, L) {
        now = +now || Date.now(); L = L || lang();
        if (!t) return hm(now);
        if (sameDay(t, now)) return hm(t);
        if (sameDay(t, now - DAY)) return w('yestAt', { t: hm(t) }, L);
        try { return new Date(+t).toLocaleDateString(L === 'de' ? 'de-DE' : L === 'es' ? 'es-ES' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + hm(t); } catch (e) { return hm(t); }
    }
    /* "Andere Zeit": days back (0 = today) + "HH:MM" -> epoch ms, or {err} */
    function fromDayTime(back, hhmm, now) {
        now = +now || Date.now();
        const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ''));
        if (!m) return { err: 'invalid' };
        const b = Math.max(0, Math.min(BACK_DAYS, +back || 0)), t = at(now, +m[1], +m[2], b);
        if (t > now + MIN) return { err: 'future' };
        if (t < now - BACK_DAYS * DAY - MIN) return { err: 'old' };
        return { at: t };
    }
    /* a time worth offering from a gallery photo: taken at least 10 minutes ago, at most 7 days back */
    function photoWorth(t, now) { now = +now || Date.now(); return !!(t && t < now - 10 * MIN && t > now - BACK_DAYS * DAY); }

    /* ---------- the moment a gallery photo was taken (JPEG EXIF DateTimeOriginal, else DateTime); 0 when unknown ---------- */
    function exifFromBuffer(buf) {
        try {
            const v = new DataView(buf);
            if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return 0;
            let o = 2;
            while (o + 4 <= v.byteLength) {
                const mk = v.getUint16(o), len = v.getUint16(o + 2);
                if ((mk & 0xFF00) !== 0xFF00) return 0;
                if (mk === 0xFFE1 && o + 10 <= v.byteLength && v.getUint32(o + 4) === 0x45786966) return tiff(v, o + 10, Math.min(v.byteLength, o + 2 + len));
                if (mk === 0xFFDA) return 0;
                o += 2 + len;
            }
        } catch (e) {}
        return 0;
    }
    function tiff(v, t0, end) {
        const le = v.getUint16(t0) === 0x4949, u16 = o => v.getUint16(o, le), u32 = o => v.getUint32(o, le);
        const str = (o, n) => { let s = ''; for (let i = 0; i < n && o + i < end; i++) { const c = v.getUint8(o + i); if (!c) break; s += String.fromCharCode(c); } return s; };
        function ifd(off) {
            const out = {}; if (t0 + off + 2 > end) return out;
            const n = u16(t0 + off);
            for (let i = 0; i < n; i++) {
                const e = t0 + off + 2 + i * 12; if (e + 12 > end) break;
                const tag = u16(e), type = u16(e + 2), cnt = u32(e + 4);
                if (tag === 0x8769) out.exif = u32(e + 8);
                else if ((tag === 0x9003 || tag === 0x0132) && type === 2) out[tag] = str(cnt > 4 ? t0 + u32(e + 8) : e + 8, cnt);
            }
            return out;
        }
        const a = ifd(u32(t0 + 4)), b = a.exif ? ifd(a.exif) : {};
        return parseExifDate(b[0x9003] || a[0x9003] || a[0x0132] || '');
    }
    function parseExifDate(s) {
        const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(s || ''));
        if (!m || +m[1] < 2000) return 0;
        const t = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
        return isFinite(t) ? t : 0;
    }
    function exifTime(file) {
        return new Promise(res => {
            try {
                if (!file || !file.slice) return res(0);
                const blob = file.slice(0, 256 * 1024);
                if (blob.arrayBuffer) blob.arrayBuffer().then(b => res(exifFromBuffer(b)), () => res(0));
                else { const r = new FileReader(); r.onload = () => res(exifFromBuffer(r.result)); r.onerror = () => res(0); r.readAsArrayBuffer(blob); }
            } catch (e) { res(0); }
        });
    }

    /* ---------- the chooser ---------- */
    function dayOptions(now, L) {
        let o = '';
        for (let b = 0; b <= BACK_DAYS - 1; b++) {
            let n = b === 0 ? w('today', null, L) : b === 1 ? w('yesterday', null, L) : '';
            if (!n) { try { n = new Date(now - b * DAY).toLocaleDateString(L === 'de' ? 'de-DE' : L === 'es' ? 'es-ES' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' }); } catch (e) { n = String(b); } }
            o += '<option value="' + b + '">' + esc(n) + '</option>';
        }
        return o;
    }
    function html(opts) {
        opts = opts || {}; const now = Date.now(), L = lang(), cur = +opts.at || 0;
        const list = choices(now, L);
        if (photoWorth(opts.photoAt, now)) list.splice(1, 0, { k: 'photo', at: +opts.photoAt, label: w('photo', null, L), time: label(+opts.photoAt, now, L) });
        const on = c => (c.at ? Math.abs(c.at - cur) < MIN : !cur);
        const btn = c => '<button type="button" class="mt-c' + (c.k === 'photo' ? ' mt-photo' : '') + '" data-mt-at="' + (c.at || 0) + '" data-mt-k="' + c.k + '" aria-pressed="' + on(c) + '"><b>' + esc(c.label) + '</b><small class="num">' + esc(c.time) + '</small></button>';
        const otherOn = cur && !list.some(c => c.at && Math.abs(c.at - cur) < MIN);
        const back = cur ? Math.max(0, Math.round((new Date(now).setHours(12, 0, 0, 0) - new Date(cur).setHours(12, 0, 0, 0)) / DAY)) : 0;
        return '<div class="mt" data-mt data-noi18n role="group" aria-label="' + esc(w('q', null, L)) + '">' +
            '<p class="mt-q">' + esc(w('q', null, L)) + '</p>' +
            '<div class="mt-chips">' + list.map(btn).join('') +
            (opts.noOther ? '</div>' : '<button type="button" class="mt-c mt-other" data-mt-other aria-expanded="' + !!otherOn + '" aria-pressed="' + !!otherOn + '"><b>' + esc(w('other', null, L)) + '</b><small aria-hidden="true">\u2026</small></button></div>') +
            (opts.noOther ? '' : '<div class="mt-box"' + (otherOn ? '' : ' hidden') + '>' +
            '<label class="mt-f"><span>' + esc(w('day', null, L)) + '</span><select class="mt-day">' + dayOptions(now, L).replace('value="' + back + '"', 'value="' + back + '" selected') + '</select></label>' +
            '<label class="mt-f"><span>' + esc(w('time', null, L)) + '</span><input type="time" class="mt-time" step="60" value="' + hm(cur || now) + '"></label></div>') +
            '<p class="mt-ok" role="status" aria-live="polite"' + (opts.say ? '' : ' hidden') + '>' + (opts.say ? esc(opts.say) : '') + '</p></div>';
    }
    function mount(host, opts) {
        opts = opts || {};
        const el = host && host.querySelector ? (host.matches && host.matches('[data-mt]') ? host : host.querySelector('[data-mt]')) : null;
        if (!el || el.__mt) return el && el.__mt;
        let cur = +opts.at || 0, tmr = 0;
        const ok = el.querySelector('.mt-ok'), box = el.querySelector('.mt-box'), other = el.querySelector('[data-mt-other]');
        const say = (txt, bad) => { if (!ok) return; ok.textContent = txt; ok.hidden = !txt; ok.classList.toggle('bad', !!bad); ok.classList.remove('pop'); void ok.offsetWidth; if (!bad && txt) ok.classList.add('pop'); };
        function paint(fromOther) {
            let hit = false;
            el.querySelectorAll('[data-mt-at]').forEach(b => { const a = +b.dataset.mtAt || 0, on = !fromOther && (a ? Math.abs(a - cur) < MIN : !cur); if (on) hit = true; b.setAttribute('aria-pressed', String(on)); });
            if (other) other.setAttribute('aria-pressed', String(!hit));
        }
        function pick(t, how) {
            t = +t || 0;
            if (t > Date.now() + MIN) { say(w('future'), true); return false; }
            let r = true;
            try { r = opts.onPick ? opts.onPick(t, how) : true; } catch (e) { console.error(e); r = false; }
            if (r === false) return false;
            cur = t; paint(how === 'other');
            say(typeof r === 'string' ? r : how === 'photo' ? w('fromPhoto', { t: label(t) }) : t ? w('saved', { t: label(t) }) : w('savedNow', { t: hm(Date.now()) }));
            return true;
        }
        function fromBox() {
            const d = el.querySelector('.mt-day'), tm = el.querySelector('.mt-time'), r = fromDayTime(d ? d.value : 0, tm ? tm.value : '');
            if (r.err) { if (r.err !== 'invalid') say(w(r.err), true); return; }
            if (cur && Math.abs(r.at - cur) < MIN) return;
            pick(r.at, 'other');
        }
        el.addEventListener('click', e => {
            const b = e.target.closest && e.target.closest('[data-mt-at],[data-mt-other]');
            if (!b || !el.contains(b)) return;
            e.preventDefault();
            if (b.hasAttribute('data-mt-other')) {
                const open = box.hidden; box.hidden = !open; b.setAttribute('aria-expanded', String(open));
                if (open) { const tm = el.querySelector('.mt-time'); try { tm.focus({ preventScroll: true }); if (tm.showPicker && root.matchMedia && root.matchMedia('(pointer: fine)').matches) tm.showPicker(); } catch (x) {} try { box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (x) {} }
                return;
            }
            if (box && !box.hidden) { box.hidden = true; if (other) other.setAttribute('aria-expanded', 'false'); }
            pick(+b.dataset.mtAt || 0, b.dataset.mtK === 'photo' ? 'photo' : 'chip');
        });
        /* iPhone: the time wheel sends input while it turns and change/blur when it closes; the time counts once it settles */
        const soon = () => { clearTimeout(tmr); tmr = setTimeout(fromBox, 900); };
        el.addEventListener('input', e => { if (e.target.classList.contains('mt-time')) soon(); });
        el.addEventListener('change', e => { if (e.target.classList.contains('mt-time') || e.target.classList.contains('mt-day')) { clearTimeout(tmr); fromBox(); } });
        el.addEventListener('focusout', e => { if (e.target.classList && e.target.classList.contains('mt-time')) { clearTimeout(tmr); fromBox(); } });
        const api = { el, get: () => cur, pick, say, paint };
        el.__mt = api;
        if (opts.photoAt && photoWorth(opts.photoAt) && opts.autoPhoto) pick(+opts.photoAt, 'photo');
        return api;
    }
    function css() {
        const D = root.document; if (!D || D.getElementById('mtCss')) return;
        const l = D.createElement('link'); l.id = 'mtCss'; l.rel = 'stylesheet';
        const me = D.querySelector('script[src*="meal-time.js"]');
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('meal-time.js', 'meal-time.css') : 'meal-time.css';
        D.head.appendChild(l);
    }
    try { css(); } catch (e) {}
    const API = { MIN, BACK_DAYS, T, choices, label, fromDayTime, photoWorth, exifFromBuffer, parseExifDate, exifTime, html, mount, w, hm };
    if (typeof module === 'object' && module.exports) module.exports = API;
    root.LowiMealTime = API;
})(typeof window !== 'undefined' ? window : globalThis);
