/* LOWiSPIKE fasting start edit, pure core (Oct 15, 2026).
   Works on the lowi_fast_v1 shape {last, target, water, hist:[{s,e,h,g,ok,xp}], awarded} and never touches
   hist, awarded, water or target. The running fast starts at max(last, end of the last logged fast)
   (same rule as LowiFastStop.startOf), so a corrected start may never reach back into a fast already
   logged: that keeps fasting points once per fast. */
(function (root) {
    'use strict';
    const MIN = 60000, DAY = 864e5, BACK_DAYS = 7;
    const p2 = n => (n < 10 ? '0' : '') + n;

    function prevEnd(s) { const h = s && Array.isArray(s.hist) ? s.hist : []; return h.length ? +h[h.length - 1].e || 0 : 0; }
    function startOf(s) { s = s || {}; return Math.max(+s.last || 0, prevEnd(s)); }

    /* earliest and latest start the user may pick, as epoch ms, rounded to whole minutes */
    function bounds(s, now) {
        now = +now || Date.now();
        const pe = prevEnd(s), floorMin = t => Math.floor(t / MIN) * MIN, ceilMin = t => Math.ceil(t / MIN) * MIN;
        const back = now - BACK_DAYS * DAY;
        const min = ceilMin(Math.max(back, pe ? pe : 0));
        return { min, max: floorMin(now), prevEnd: pe, cur: startOf(s) };
    }

    /* local date (YYYY-MM-DD) and time (HH:MM) of an instant, on this device's clock */
    function parts(t) { const d = new Date(+t); return { date: d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()), time: p2(d.getHours()) + ':' + p2(d.getMinutes()) }; }
    /* Oct 21: a typed date + time read as the device clock. 'gap' = a well-formed time the clock skipped (spring forward,
       e.g. 02:30 on 28 Mar 2027 in Berlin): before this fix it silently became 03:30, an hour off with no warning. */
    function readParts(date, time) {
        const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || '').trim()), tm = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(time || '').trim());
        if (!dm || !tm) return { t: NaN, err: 'invalid' };
        const y = +dm[1], mo = +dm[2] - 1, da = +dm[3], h = +tm[1], mi = +tm[2];
        if (h > 23 || mi > 59) return { t: NaN, err: 'invalid' };
        const d = new Date(y, mo, da, h, mi, 0, 0);
        if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== da) return { t: NaN, err: 'invalid' };
        if (d.getHours() !== h || d.getMinutes() !== mi) return { t: NaN, err: 'gap' };
        return { t: d.getTime(), err: '' };
    }
    /* the instant for a local date + time; NaN when either is missing, not a real date, or skipped by a clock change */
    function fromParts(date, time) { return readParts(date, time).t; }
    /* true when the clock showed this local time twice (fall back, e.g. 02:30 on 25 Oct 2026 in Berlin). fromParts gives
       the first of the two (summer time), as the JS spec does; the sheet says so instead of picking one in silence. */
    function twice(t) {
        if (!(isFinite(t) && t > 0)) return false;
        const a = parts(t), lo = parts(t - 36e5), hi = parts(t + 36e5);
        return (lo.date === a.date && lo.time === a.time) || (hi.date === a.date && hi.time === a.time);
    }
    /* UTC offset of an instant on this device, e.g. 'UTC+2' (summer) or 'UTC+1' (winter) in Berlin */
    function offsetLabel(t) {
        const off = -new Date(isFinite(t) && t > 0 ? t : Date.now()).getTimezoneOffset(), a = Math.abs(off);
        return 'UTC' + (off >= 0 ? '+' : '\u2212') + Math.floor(a / 60) + (a % 60 ? ':' + p2(a % 60) : '');
    }

    /* {ok:true, t} or {ok:false, err:'invalid'|'future'|'overlap'|'old'|'same', min, max} */
    function validate(t, s, now) {
        now = +now || Date.now();
        const b = bounds(s, now);
        if (!(typeof t === 'number' && isFinite(t) && t > 0)) return { ok: false, err: 'invalid', min: b.min, max: b.max };
        if (t > now) return { ok: false, err: 'future', min: b.min, max: b.max };
        if (b.prevEnd && t < b.prevEnd) return { ok: false, err: 'overlap', min: b.min, max: b.max };
        if (t < now - BACK_DAYS * DAY - MIN) return { ok: false, err: 'old', min: b.min, max: b.max };
        if (b.cur && Math.abs(t - b.cur) < MIN) return { ok: false, err: 'same', min: b.min, max: b.max };
        return { ok: true, t, min: b.min, max: b.max };
    }

    /* a copy of the store with the new start; everything else is kept as it was */
    function apply(s, t, now) {
        now = +now || Date.now();
        const v = validate(t, s, now);
        if (!v.ok) return { ok: false, err: v.err, state: s };
        const out = JSON.parse(JSON.stringify(s || {}));
        const from = startOf(s);
        out.last = t;
        out.startEdit = { at: now, from: from || null, to: t };
        return { ok: true, state: out, from, to: t };
    }

    const Core = { MIN, BACK_DAYS, prevEnd, startOf, bounds, parts, readParts, fromParts, twice, offsetLabel, validate, apply };
    if (typeof module === 'object' && module.exports) module.exports = Core;
    root.LowiFastEditCore = Core;
})(typeof window !== 'undefined' ? window : globalThis);
