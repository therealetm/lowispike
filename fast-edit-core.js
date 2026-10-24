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

    /* ---------- Oct 24 (Eman, Gap > Letzte Mahlzeit > Zeit ändern): "I try to change the time here and it just reset it back" ----------
       The Gap really starts at max(own start, newest logged meal) (LowiFastStop.startOf). Writing only `last` could never move it
       before a logged meal, so 18:55 -> 17:55 snapped back to 18:55. Now, when a logged meal is what the Gap counts from, the edit
       moves THAT meal (same path as Fuel > meal > Bearbeiten > Uhrzeit: lowi:meal-moved -> LowiFastStop.remeal), so Fuel, the Gap
       timer, After your meal and the glowing phase all read one time and no second meal appears.
       meals: [{id, ev, ts, t}] (S.logs). Pure: no DOM, no storage. */
    function mealList(meals, now) {
        const lim = (+now || Date.now()) + MIN;
        return (Array.isArray(meals) ? meals : []).filter(m => m && +m.ts > 0 && +m.ts <= lim)
            .map(m => ({ id: String(m.id || m.ev || m.ts), ev: String(m.ev || m.id || ''), ts: +m.ts, t: m.t ? String(m.t) : '' }))
            .sort((a, b) => a.ts - b.ts);
    }
    /* the meal the Gap counts from right now, or null when the user's own start (or a logged fast) is later */
    function gapMeal(s, meals, now) {
        const L = mealList(meals, now), last = L.length ? L[L.length - 1] : null;
        return last && last.ts >= startOf(s) ? last : null;
    }
    /* the earliest time that meal can move to: the meal before it, and where the Gap before it started once the meal is lifted
       out (what LowiFastStop.unmeal restores), never inside a fast already logged before it */
    function mealFloor(s, meals, now) {
        s = s || {};
        const L = mealList(meals, now), m = gapMeal(s, meals, now);
        if (!m) return 0;
        const prev = L.length > 1 ? L[L.length - 2] : null;
        const tr = Array.isArray(s.mt) ? s.mt : [], h = Array.isArray(s.hist) ? s.hist : [];
        const own = tr.find(x => x && (x.id === m.ev || x.id === m.id));
        let back;
        if (own && +s.last === +own.t) back = +own.p || 0;
        else if (!own && Math.abs((+s.last || 0) - m.ts) < 1000) { const r = h.find(x => Math.abs(+x.e - m.ts) < 1000); back = r ? +r.s || 0 : 0; }
        else back = +s.last || 0;
        let pe = 0;
        h.forEach(r => { const e = +r.e || 0; if (Math.abs(e - m.ts) >= 1000 && e < m.ts && e > pe) pe = e; });
        return Math.max(prev ? prev.ts : 0, back, pe);
    }
    /* bounds for the date field, with the meals in */
    function planBounds(s, meals, now) {
        now = +now || Date.now();
        const b = bounds(s, now), m = gapMeal(s, meals, now);
        if (!m) return b;
        const floorMin = t => Math.ceil(t / MIN) * MIN, fl = mealFloor(s, meals, now);
        return { min: floorMin(Math.max(now - BACK_DAYS * DAY, fl)), max: b.max, prevEnd: fl, cur: m.ts, meal: m };
    }
    /* {ok:true, t, move:null|{id, ev, from, to}} or {ok:false, err, meal?, floor?}
       err adds 'mealAfter' (a meal logged after the picked time: it would win again) and 'mealBefore' (moving the last meal
       before the meal logged ahead of it would make that one the last meal). */
    function plan(s, meals, t, now) {
        now = +now || Date.now(); s = s || {};
        const L = mealList(meals, now), m = gapMeal(s, meals, now);
        if (!m) {
            const v = validate(t, s, now);
            if (!v.ok) return Object.assign(v, { move: null });
            const last = L.length ? L[L.length - 1] : null;
            if (last && t < last.ts) return { ok: false, err: 'mealAfter', meal: last, move: null };
            return { ok: true, t, move: null };
        }
        if (!(typeof t === 'number' && isFinite(t) && t > 0)) return { ok: false, err: 'invalid', move: null };
        if (t > now) return { ok: false, err: 'future', move: null };
        if (t < now - BACK_DAYS * DAY - MIN) return { ok: false, err: 'old', move: null };
        if (Math.abs(t - m.ts) < MIN) return { ok: false, err: 'same', move: null };
        const fl = mealFloor(s, meals, now);
        if (fl && t < fl) {
            const prev = L.length > 1 ? L[L.length - 2] : null;
            return prev && prev.ts === fl ? { ok: false, err: 'mealBefore', meal: prev, floor: fl, move: null } : { ok: false, err: 'overlap', floor: fl, move: null };
        }
        return { ok: true, t, move: { id: m.id, ev: m.ev, from: m.ts, to: t } };
    }

    const Core = { MIN, BACK_DAYS, prevEnd, startOf, bounds, parts, readParts, fromParts, twice, offsetLabel, validate, apply,
        mealList, gapMeal, mealFloor, planBounds, plan };
    if (typeof module === 'object' && module.exports) module.exports = Core;
    root.LowiFastEditCore = Core;
})(typeof window !== 'undefined' ? window : globalThis);
