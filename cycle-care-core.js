/* LOWiSPIKE cycle care core (Oct 24 2026). Pure rules for the care part of My cycle, tested in tests/cycle-care.test.cjs.
   Why (Emmanuel approved the cycle audit, Oct 24): "an information window alone isn't a real benefit". The app now responds to
   what she SAYS, never to the estimated phase or to gender:
   1) "How are you today?" in My cycle: one tap, optional, never a popup. Reuses the old cycle sheet's data layer
      (S.health.cyc.days[day].sym / .mood / .en), so the recovered logging and the old data are the same thing.
   2) A gentle day she switches on herself (offered only after a "not great" answer, never automatic). For that local day:
      - Move goal shrinks to a size she picks: one short Move (a quarter), half, or the usual goal (GOALS).
      - "I rested" counts as today's Move for Misty's energy. Fair-play caps (explicit): once per local day, only today (no
        back-dating), only on a gentle day, energy only (no XP, no sunbeams, no finds of its own), and switching the gentle day
        off and on again grants nothing new. Energy resets every day anyway, so there is nothing to pile up.
      - Nothing is lost: answering the check-in counts as the day's check-in, so the streak never breaks for resting.
   3) Calm world: an optional, reversible switch (calm / normal) for today only. It softens light, slows the world (capped at
      CALM_SPEED, her own speed setting is never overwritten), quiets the sound and calls Misty home from autopilot.
      With reduced motion on, only colour and light change. Tomorrow the world is normal again by itself.
   All of it lives in S.health.cyc.care, so "Delete all cycle data" erases it too. Days are local calendar days (YYYY-MM-DD from
   local date parts), so a clock change never shifts or doubles a day. Old records are pruned after KEEP_DAYS. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiCycleCare = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';
    const GOALS = { tiny: 0.25, half: 0.5, usual: 1 };
    const CALM_SPEED = 0.5, KEEP_DAYS = 60;
    /* the check-in chips; each writes the old cycle data keys (sym / en / mood) */
    const FEELS = [
        { id: 'cramps', k: 'sym', v: 'cramps' }, { id: 'strong', k: 'sym', v: 'strong' }, { id: 'tired', k: 'en', v: 'low' },
        { id: 'bloat', k: 'sym', v: 'bloat' }, { id: 'crave', k: 'sym', v: 'crave' }, { id: 'head', k: 'sym', v: 'head' },
        { id: 'low', k: 'mood', v: 'low' }, { id: 'anx', k: 'mood', v: 'anx' }
    ];
    const NOT_GREAT_SYM = ['cramps', 'strong', 'bloat', 'crave', 'head', 'breast'];
    const pad = n => String(n).padStart(2, '0');
    const dayKey = t => { const d = new Date(t == null ? Date.now() : t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const validK = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
    /* whole days between two local day keys, by calendar date (UTC maths on the date parts: no DST hour can change it) */
    const daysBetween = (a, b) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 864e5);

    function feelOn(day, id) {
        day = day || {};
        if (id === 'good') return day.mood === 'good';
        if (id === 'skip') return !!day.ns;
        const f = FEELS.find(x => x.id === id); if (!f) return false;
        return f.k === 'sym' ? (day.sym || []).indexOf(f.v) >= 0 : day[f.k] === f.v;
    }
    /* toggles one chip and returns a new day object (the input is not changed). "All good" clears the not-great answers;
       "Rather not say" clears every answer for the day and remembers only that she skipped. */
    function applyFeel(day, id) {
        const d = Object.assign({}, day || {}); d.sym = (d.sym || []).slice();
        if (id === 'skip') { const was = !!d.ns; d.sym = []; delete d.mood; delete d.en; if (was) delete d.ns; else d.ns = 1; return tidy(d); }
        delete d.ns;
        if (id === 'good') {
            if (d.mood === 'good') delete d.mood;
            else { d.mood = 'good'; d.sym = d.sym.filter(s => NOT_GREAT_SYM.indexOf(s) < 0); if (d.en === 'low') delete d.en; }
            return tidy(d);
        }
        const f = FEELS.find(x => x.id === id); if (!f) return tidy(d);
        if (f.k === 'sym') {
            const i = d.sym.indexOf(f.v);
            if (i >= 0) d.sym.splice(i, 1);
            else { d.sym.push(f.v); if (f.v === 'strong') d.sym = d.sym.filter(s => s !== 'cramps'); if (f.v === 'cramps') d.sym = d.sym.filter(s => s !== 'strong'); }
        } else if (d[f.k] === f.v) delete d[f.k];
        else d[f.k] = f.v;
        if (d.mood === 'good' && notGreat(d)) delete d.mood;
        return tidy(d);
    }
    function tidy(d) { if (!d.sym || !d.sym.length) delete d.sym; if (d.mood === '') delete d.mood; if (d.en === '') delete d.en; return d; }
    function notGreat(day) {
        day = day || {};
        return (day.sym || []).some(s => NOT_GREAT_SYM.indexOf(s) >= 0) || day.en === 'low' || ['low', 'anx', 'irr'].indexOf(day.mood) >= 0;
    }
    const answered = day => !!(day && ((day.sym && day.sym.length) || day.mood || day.en || day.ns));

    /* ---------- care data: c.care = { g: { day: { goal, rest } }, calm: day } ---------- */
    function care(c) {
        if (!c || typeof c !== 'object') return null;
        if (!c.care || typeof c.care !== 'object') c.care = { g: {}, calm: '' };
        if (!c.care.g || typeof c.care.g !== 'object') c.care.g = {};
        if (typeof c.care.calm !== 'string') c.care.calm = '';
        return c.care;
    }
    const gentle = (c, k) => { const g = c && c.care && c.care.g && c.care.g[k]; return g && g.on ? g : null; };
    function setGentle(c, k, on, goal) {
        const cc = care(c); if (!cc || !validK(k)) return null;
        const prev = cc.g[k] || {};
        if (!on) { if (prev.rest) cc.g[k] = { on: false, goal: prev.goal || 'tiny', rest: prev.rest }; else delete cc.g[k]; if (cc.calm === k) cc.calm = ''; return null; }
        cc.g[k] = { on: true, goal: GOALS[goal] ? goal : (GOALS[prev.goal] ? prev.goal : 'tiny'), rest: prev.rest || 0 };
        return cc.g[k];
    }
    /* rest: once per local day, only today, only on a gentle day. Returns true only when it newly counted */
    function logRest(c, k, now) {
        const g = gentle(c, k); if (!g || k !== dayKey(now) || g.rest) return false;
        g.rest = +now || Date.now();
        return true;
    }
    const calmOn = (c, k) => !!(c && c.care && c.care.calm && c.care.calm === k);
    function setCalm(c, k, on) { const cc = care(c); if (!cc || !validK(k)) return false; cc.calm = on ? k : ''; return !!on; }
    /* what sun-meter.js energy() gets: the gentle Move goal and whether today's rest counts */
    function energyInput(c, k) {
        const g = gentle(c, k);
        if (!g) return { moveGoal: 1, rest: false, gentle: false };
        return { moveGoal: GOALS[g.goal] || GOALS.tiny, rest: !!g.rest && dayKey(g.rest) === k, gentle: true };
    }
    function prune(c, k) {
        const cc = c && c.care; if (!cc || !cc.g || !validK(k)) return 0;
        let n = 0; Object.keys(cc.g).forEach(d => { if (!validK(d) || daysBetween(d, k) > KEEP_DAYS) { delete cc.g[d]; n++; } });
        if (cc.calm && cc.calm !== k) cc.calm = '';
        return n;
    }
    /* how sure the phase colour is: 'firm', or 'wide' when cycles vary, she set it to irregular, or the period is late */
    const certainty = m => (!m || !m.has) ? 'none' : (m.irregular || m.lateBy > 0) ? 'wide' : 'firm';
    /* who may turn tracking on: everyone except people who chose "man", and anyone who already turned it on themselves */
    function canUse(st) {
        const g = st && st.user ? st.user.gender : undefined;
        if (!st || !st.user) return false;
        const c = st.health && st.health.cyc;
        if (c && c.show === true) return true;
        return g !== 'm';
    }
    return { GOALS, CALM_SPEED, KEEP_DAYS, FEELS, NOT_GREAT_SYM, dayKey, daysBetween, feelOn, applyFeel, notGreat, answered, care, gentle, setGentle, logRest, calmOn, setCalm, energyInput, prune, certainty, canUse };
});
