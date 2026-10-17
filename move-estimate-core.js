/* move-estimate-core.js — Oct 17 (E-man): "Quick, Medium, Long, Epic" movement estimates for the Home movement bubble.
   People remember how a walk FELT, not minutes or steps, so the bubble asks for one of four levels and never invents a step count.
   Only active movement counts (walking, cycling, stairs); time sitting on a bus or train does not.

   Rules (pure, tested in tests/move-bubble.test.cjs):
   - Today's Move part (the 0.3 Move share of Misty's energy in sun-meter.js) is split into 4 quarters.
     Quick = 1 quarter, Medium = 2, Long = 3, Epic = 4. The day is full at 4/4.
   - A Move-page log (workout, steps, walk session) has no `mq` field and still counts as the full 4/4, exactly like before,
     so an estimate on top of it adds nothing (no double counting).
   - An estimate only stores the quarters it really adds (mq = applied). XP = 4 per applied quarter, so estimates can never
     give more than 16 XP a day, and never more than the Move part they fill.
   - Picking again within 60 s REPLACES the last estimate (a change of mind, not a second walk). That also matches the
     60 s rule in LowiWorldHealthCore.fairDay, which ignores a second Move entry inside 60 s.
   - At most 6 estimate entries a day. Long press on the bubble removes today's estimates (XP and energy go back with them),
     so log / delete loops net zero.
   - Ledger entry: { src: 'move:est', mq: 1..4, lvl: 'quick'|'medium'|'long'|'epic', eventId: 'move:est:<day>:<slot>' }. */
(function (root) {
    'use strict';
    const LEVELS = [
        { id: 'quick', q: 1 },
        { id: 'medium', q: 2 },
        { id: 'long', q: 3 },
        { id: 'epic', q: 4 }
    ];
    const FULL = 4, XP_PER_Q = 4, REPLACE_MS = 60000, MAX_A_DAY = 6, SRC = 'move:est';
    const level = id => LEVELS.find(l => l.id === id) || null;

    /* the same move test as sun-meter.js kindOf (src starting with move:, or move words in the label) */
    const isMove = e => !!e && (+e.amt || 0) > 0 && (/^move[:_-]?/i.test(String(e.src || '')) ||
        /\b(steps?|walk|workout|move|movement|bewegung|schritte|paseo|pasos|ejercicio)\b/i.test(String(e.label || '')));
    const isEstimate = e => !!e && String(e.src || '') === SRC;
    /* quarters one ledger entry is worth: estimates carry mq, every other Move log counts as the full day */
    const quartersOf = e => (isEstimate(e) || e.mq != null) ? Math.max(0, Math.min(FULL, Math.round(+e.mq || 0))) : FULL;

    function todays(ledger, day) { return (Array.isArray(ledger) ? ledger : []).filter(e => e && e.day === day); }
    function estimates(ledger, day) { return todays(ledger, day).filter(isEstimate); }

    /* today's Move quarters (0..4), optionally leaving one entry out (the one a replace removes) */
    function quarters(ledger, day, skipId) {
        let q = 0;
        for (const e of todays(ledger, day)) { if (!isMove(e) || (skipId && e.eventId === skipId)) continue; q += quartersOf(e); }
        return Math.min(FULL, q);
    }
    /* true when a Move-page log (not an estimate) already filled today */
    function fullFromMovePage(ledger, day) { return todays(ledger, day).some(e => isMove(e) && !isEstimate(e) && e.mq == null); }

    /* What a pick would do, before anything is saved.
       -> { action: 'add'|'replace'|'full'|'limit'|'bad', q (asked), applied, xp, before, after, replaceId, eventId } */
    function plan(ledger, day, id, now) {
        const L = level(id); if (!L) return { action: 'bad' };
        now = +now || Date.now();
        const mine = estimates(ledger, day);
        const last = mine.length ? mine[mine.length - 1] : null;
        const replace = !!(last && last.eventId && now - (+last.ts || 0) >= 0 && now - (+last.ts || 0) < REPLACE_MS);
        const replaceId = replace ? last.eventId : '';
        const before = quarters(ledger, day, replaceId);
        const applied = Math.max(0, Math.min(L.q, FULL - before));
        const base = { q: L.q, level: L.id, before, replaceId, now };
        if (!replace && mine.length >= MAX_A_DAY) return Object.assign(base, { action: 'limit', applied: 0, xp: 0, after: quarters(ledger, day) });
        if (applied <= 0) return Object.assign(base, { action: 'full', applied: 0, xp: 0, after: before, fromMovePage: fullFromMovePage(ledger, day) });
        const slot = replace ? replaceId : SRC + ':' + day + ':' + nextSlot(mine);
        return Object.assign(base, { action: replace ? 'replace' : 'add', applied, xp: applied * XP_PER_Q, after: before + applied, eventId: slot });
    }
    /* smallest free slot number, so removing and adding again reuses the same id (Misty's care reaction dedups by id) */
    function nextSlot(mine) {
        const used = new Set(mine.map(e => String(e.eventId || '').split(':').pop()));
        for (let i = 1; i < 99; i++) if (!used.has(String(i))) return i;
        return 99;
    }

    /* bubble view: fill 0..1 and the "2/4" value, like water's "3/8" */
    function view(ledger, day) {
        const q = quarters(ledger, day);
        return { q, full: FULL, fill: q / FULL, text: q + '/' + FULL, estimates: estimates(ledger, day).length, fromMovePage: fullFromMovePage(ledger, day) };
    }

    const api = { LEVELS, FULL, XP_PER_Q, REPLACE_MS, MAX_A_DAY, SRC, level, isMove, isEstimate, quartersOf, quarters, estimates, plan, view, nextSlot, fullFromMovePage };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiMoveEstimateCore = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
