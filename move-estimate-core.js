/* move-estimate-core.js — the Home Move bubble's daily step range.
   Oct 23 2026 (Eman, on a call): "People already have step counting apps. We don't have to be a step counting app ... at the end of
   the day someone can look at the phone and see how many steps they took, and then just tap a button ... just like with sleep."
   Then: three bubbles like Sleep, "casual, steady and epic", under 5k, 5k-10k and 10k+.
   It replaces the Oct 17 Quick / Medium / Long / Epic guesses (people could not add up minutes across a whole day).

   Rules (pure, tested in tests/move-bubble.test.cjs and tests/move-steps.test.cjs):
   - ONE range per day, read off the user's own phone step counter: Casual = under 5,000 steps, Steady = 5,000 to 9,999,
     Epic = 10,000 or more. Picking is today's TOTAL, never one more walk: a second pick replaces the first, the same pick again
     changes nothing (no XP, no energy, no reaction), a lower pick takes XP and energy back down.
   - Today's Move part (the 0.3 Move share of Misty's energy in sun-meter.js) is still written in quarters (mq, 0..4) so
     sun-meter.js, world-health-core.js and world-mood-core.js read it unchanged. The three ranges fill it in thirds, like Sleep:
     Casual 1/3 (mq 4/3), Steady 2/3 (mq 8/3), Epic full (mq 4). XP: Casual 5, Steady 11, Epic 16 (16 = the old daily cap).
   - A Move-page log (workout, steps, walk session) has no `mq` field and still counts as the full day, exactly like before,
     so a range on top of it adds nothing (no double counting).
   - Older entries are kept as they are. On the day of a pick, today's older Quick / Medium / Long / Epic guesses are taken off
     (their XP goes back) and the one range entry stands for the whole day, so they never stack with it. Other days are untouched.
   - The number is the user's own word: LOWiSPIKE does not count or verify steps. This only stops the same day from being
     credited twice; it is not proof of the steps.
   - Ledger entry: { src: 'move:est', mq, lvl: 'casual'|'steady'|'epic', steps: 'lt5k'|'5to10k'|'10kplus', est: 1,
     eventId: 'move:est:<day>:steps' }. */
(function (root) {
    'use strict';
    const FULL = 4, SRC = 'move:est', SLOT = 'steps';
    /* min / max are steps (max inclusive, null = no top); q is in quarters of today's Move part */
    const LEVELS = [
        { id: 'casual', band: 'lt5k', short: '<5k', min: 0, max: 4999, q: FULL / 3, xp: 5 },
        { id: 'steady', band: '5to10k', short: '5k\u201310k', min: 5000, max: 9999, q: FULL * 2 / 3, xp: 11 },
        { id: 'epic', band: '10kplus', short: '10k+', min: 10000, max: null, q: FULL, xp: 16 }
    ];
    /* the Oct 17 guesses, only to read and replace entries already saved */
    const LEGACY = ['quick', 'medium', 'long', 'epic'];
    const level = id => LEVELS.find(l => l.id === id) || null;
    /* which range a step count falls in (the step counter's number -> Casual / Steady / Epic) */
    function levelForSteps(n) {
        n = Math.floor(+n);
        if (!isFinite(n) || n < 0) return null;
        return LEVELS.find(l => n >= l.min && (l.max == null || n <= l.max)) || null;
    }

    /* the same move test as sun-meter.js kindOf (src starting with move:, or move words in the label) */
    const isMove = e => !!e && (+e.amt || 0) > 0 && (/^move[:_-]?/i.test(String(e.src || '')) ||
        /\b(steps?|walk|workout|move|movement|bewegung|schritte|paseo|pasos|ejercicio)\b/i.test(String(e.label || '')));
    const isEstimate = e => !!e && String(e.src || '') === SRC;
    /* today's range entry (new style) */
    const isRange = e => isEstimate(e) && !!level(e.lvl) && String(e.eventId || '').split(':').pop() === SLOT;
    /* quarters one ledger entry is worth: estimates carry mq (thirds are fine, no rounding), every other Move log is the full day */
    const quartersOf = e => (isEstimate(e) || e.mq != null) ? Math.max(0, Math.min(FULL, +e.mq || 0)) : FULL;
    const tidy = q => Math.round(q * 1000) / 1000;

    function todays(ledger, day) { return (Array.isArray(ledger) ? ledger : []).filter(e => e && e.day === day); }
    function estimates(ledger, day) { return todays(ledger, day).filter(isEstimate); }
    function rangeEntry(ledger, day) { const r = estimates(ledger, day).filter(isRange); return r.length ? r[r.length - 1] : null; }

    /* today's Move quarters (0..4); skipEstimates leaves every estimate out (the ones a pick replaces) */
    function quarters(ledger, day, skipEstimates) {
        let q = 0;
        for (const e of todays(ledger, day)) { if (!isMove(e) || (skipEstimates && isEstimate(e))) continue; q += quartersOf(e); }
        return tidy(Math.min(FULL, q));
    }
    /* true when a Move-page log (not an estimate) already filled today */
    function fullFromMovePage(ledger, day) { return todays(ledger, day).some(e => isMove(e) && !isEstimate(e) && e.mq == null); }

    /* What a pick would do, before anything is saved.
       -> { action: 'set'|'same'|'full'|'bad', level, band, applied (quarters), xp, before, after, removeIds, eventId, replaced, down }
       'set': take off removeIds (today's estimates, older guesses included), then save one entry with eventId. */
    function plan(ledger, day, id, now) {
        const L = level(id); if (!L) return { action: 'bad' };
        const mine = estimates(ledger, day), cur = rangeEntry(ledger, day);
        const before = quarters(ledger, day);
        const base = { level: L.id, band: L.band, q: L.q, before, now: +now || Date.now(), eventId: SRC + ':' + day + ':' + SLOT };
        /* the same range again, and nothing else on the day to tidy: nothing happens */
        if (cur && cur.lvl === L.id && mine.length === 1) return Object.assign(base, { action: 'same', applied: 0, xp: 0, after: before, removeIds: [] });
        const rest = quarters(ledger, day, true);
        const applied = tidy(Math.max(0, Math.min(L.q, FULL - rest)));
        if (applied <= 0) return Object.assign(base, { action: 'full', applied: 0, xp: 0, after: before, removeIds: [], fromMovePage: fullFromMovePage(ledger, day) });
        const xp = applied >= L.q ? L.xp : Math.round(L.xp * applied / L.q);
        const removeIds = mine.map(e => e.eventId).filter(Boolean);
        const back = mine.reduce((n, e) => n + (+e.amt || 0), 0);
        const after = tidy(Math.min(FULL, rest + applied));
        return Object.assign(base, { action: 'set', applied, xp, after, removeIds, back, net: xp - back, replaced: removeIds.length > 0, from: cur ? cur.lvl : null, down: after < before });
    }
    /* kept for older callers / tests: the one slot a day */
    function nextSlot() { return SLOT; }

    /* bubble view, like Sleep's: fill 0..1, the short range as the value, the picked level (null when none today) */
    function view(ledger, day) {
        const q = quarters(ledger, day), cur = rangeEntry(ledger, day), L = cur ? level(cur.lvl) : null;
        const legacy = estimates(ledger, day).filter(e => !isRange(e)).length;
        return { q, full: FULL, fill: tidy(q / FULL), level: L ? L.id : null, band: L ? L.band : null, text: L ? L.short : (q > 0 ? Math.round(q) + '/' + FULL : ''),
            estimates: estimates(ledger, day).length, legacy, fromMovePage: fullFromMovePage(ledger, day) };
    }

    const api = { LEVELS, LEGACY, FULL, SRC, SLOT, level, levelForSteps, isMove, isEstimate, isRange, quartersOf, quarters, estimates, rangeEntry, plan, view, nextSlot, fullFromMovePage };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiMoveEstimateCore = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
