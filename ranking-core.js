/* ranking-core.js (23 Oct 2026, E-man: "we need to highlight ranking way more, because that makes it really like a Pokemon game,
   like a Digimon game ... instead of having humans there we have their companions there"). The pure rules behind the Community
   Ranking tab (ranking.js draws it). No page code here, so tests/ranking.test.cjs runs it in node.

   Periods (the reference's Heute / Woche / Monat / Gesamt switch):
   - 'w' Week and 'm' Month: the sunbeams Misty got from her owner (care-board-core.js scoreOf, the same numbers as the Care board,
     already capped at GOAL a day, so a forged row can't jump the board). Caring for yourself is what makes the companion shine.
   - 'all' All time: companion strength = all-time XP (the 25-level table in world-home-core.js), shown with the level.
   There is no Today: other people's profile rows carry only their week and month sunbeams, so a Today board would show you alone.

   Privacy: a companion is drawn only from the look its owner publishes (companion.js: profiles.look is written only while
   "Show my companion's form" is on, null otherwise). No look means the row is anonymised: a plain hidden-companion orb and
   "Hidden companion" instead of its form; the score still counts. Hidden test accounts and duplicate names are dropped by
   care-board-core.js roster().

   23 Oct, second pass (E-man: "the ranking should only go to 10, not 50 ... remove all the bots from the ranking, so that it's only
   real human friends in the ranking, based on their real stats"):
   - Only real accounts: real(p) keeps you and rows that carry a real account id (profiles.id). Demo bots (Mateo, Jonas, Samir),
     people made up for the sample chat (demo:true), 'bot:' ids and rows without an account id never reach the board, and nothing
     pads it: with three real people the board shows three.
   - Top 10: board(list) is places 1 to 10 (podium 1-3, list 4-10). Your place (mine) still reads from the full list, so it shows
     your real place even when it is below 10. */
(function (root) {
    'use strict';
    const isNode = typeof module === 'object' && module.exports;
    const CB = () => root.LowiCareBoard || (isNode ? require('./care-board-core.js') : null);
    const WHC = () => root.LowiWorldHomeCore || (isNode ? require('./world-home-core.js') : null);
    const PERIODS = ['w', 'm', 'all'];
    const XP_MAX = 10000000;
    const TOP = 10;
    /* a real signed-up person (or you): never a demo bot, a sample-chat person, a 'bot:' id or a row without an account id */
    function real(p) {
        if (!p || typeof p !== 'object') return false;
        if (p.me) return true;
        if (p.bot || p.demo || p.sample) return false;
        const u = String(p.uid || '');
        return !!u.trim() && !/^(bot|demo|sample)[:_-]/i.test(u);
    }
    const period = k => PERIODS.includes(k) ? k : 'w';
    function level(p) {
        const c = CB(), w = WHC(), max = (w && w.MAX_LEVEL) || 25;
        if (p && (p.bot || p.demo)) return c && c.shownLevel ? c.shownLevel(p) : 1;
        const lv = Math.round(+(p && p.lv) || 0);
        if (lv >= 1) return Math.max(1, Math.min(max, lv));
        try { return Math.max(1, Math.min(max, w.curveLevel(xpOf(p)))); } catch (e) { return 1; }
    }
    function xpOf(p) { const x = Math.round(+(p && p.xp) || 0); return Math.max(0, Math.min(XP_MAX, x)); }
    /* 23 Oct 2026 (Eman: "every name that is with Emmanuel, Manu or I think even Emmy is my account, so sync them"): Eman's accounts
       are one person on the board. Known account ids are trusted for scores; a row matched only by name is folded away (never
       deleted, only not shown twice) but never lends its score. On Eman's own device his "me" row is the one kept; on anyone
       else's the main eman account is kept (else the strongest). All time takes the best XP among the trusted accounts, Week and
       Month stay the kept account's own sunbeams, so nothing is ever counted twice. */
    const OWNER = Object.freeze({
        name: 'Eman',
        main: '83077af7-8475-4628-9328-25bd335db240',
        ids: Object.freeze(['83077af7-8475-4628-9328-25bd335db240', '4add63ec-61d6-4187-9c62-bd78c427be24', 'd813675e-16b6-40e3-bedb-d6fe8b01af91', 'e81217a0-6658-4c00-bce2-bfe56de897a5'])
    });
    const OWN_NAME = /emmanuel|^\s*emmy\b|^\s*eman\b|^\s*manu(?!el)/i;
    const uidOf = p => String((p && (p.uid || p.id)) || '').trim().toLowerCase();
    function ownerId(p) { return OWNER.ids.includes(uidOf(p)); }
    function isOwner(p) { if (!p || p.bot || p.demo) return false; return ownerId(p) || OWN_NAME.test(String(p.n || p.name || '')); }
    function fold(list) {
        list = (list || []).slice();
        const me = list.find(p => p && p.me), iAm = !!(me && isOwner(me));
        const own = list.filter(p => p && isOwner(p) && (!p.me || iAm));
        if (own.length < 2) return list;
        const keep = (iAm && me) || own.find(p => uidOf(p) === OWNER.main) || own.slice().sort((a, b) => xpOf(b) - xpOf(a))[0];
        const trusted = own.filter(p => p === keep || ownerId(p));
        const merged = Object.assign({}, keep, {
            xp: Math.max.apply(null, trusted.map(xpOf)),
            lv: Math.max.apply(null, trusted.map(p => Math.round(+p.lv || 0)).concat([Math.round(+keep.lv || 0)])) || keep.lv,
            own: true, alts: own.filter(p => p !== keep).map(p => uidOf(p) || String(p.n || ''))
        });
        const out = [];
        list.forEach(p => { if (p === keep) out.push(merged); else if (own.indexOf(p) < 0) out.push(p); });
        return out;
    }
    /* everyone the board knows, one entry per person: real accounts only (no bots), test accounts out, Eman once */
    function everyone(people) {
        const c = CB(), mineReal = (people || []).filter(real);
        return fold(c && c.roster ? c.roster(mineReal) : mineReal);
    }
    /* 23 Oct 2026 (Eman, from a Skool profile: "how many percentage of people have reached what level ... I would love that to
       also be in our version"): the level ladder behind Your place. Every level of the 25-level table with the share of players
       who reached it, real accounts only, Eman's accounts counted once. */
    function ladder(people) {
        const w = WHC(), ST = (w && w.STAGES) || [], max = ST.length || 25;
        const list = everyone(people), lvs = list.map(level), n = lvs.length;
        const me = list.find(p => p && p.me) || null, my = me ? level(me) : 1, xp = me ? xpOf(me) : 0;
        const next = my < max && ST[my] ? ST[my].xp : null;
        const steps = [];
        for (let i = 0; i < max; i++) {
            const L = i + 1, got = lvs.filter(v => v >= L).length, s = ST[i] || {};
            steps.push({ lv: L, n: s.n || null, xp: +s.xp || 0, evo: !!s.evo, count: got, pct: n ? Math.round(100 * got / n) : 0, some: got > 0, reached: my >= L, now: my === L });
        }
        return { total: n, my, xp, next, toNext: next == null ? 0 : Math.max(0, next - xp), max, steps };
    }
    /* rows: [{p, pts, full, lv, rank}] best first, only people with something to show (pts > 0) */
    function rows(people, k, now, mine) {
        k = period(k); now = now || Date.now();
        const c = CB(); if (!c) return [];
        const list = everyone(people);
        let out;
        if (k === 'all') {
            out = list.map(p => ({ p, pts: xpOf(p), full: 0, lv: level(p) })).filter(x => x.pts > 0)
                .sort((a, b) => b.pts - a.pts || b.lv - a.lv || String(a.p.n).localeCompare(String(b.p.n)));
        } else {
            out = c.rank(list, k, now, mine).map(x => ({ p: x.p, pts: x.pts, full: x.full || 0, lv: level(x.p) }));
        }
        out.forEach((x, i) => { x.rank = i + 1; });   /* place = position, like the medals (ties keep the Care board's tie-breaks) */
        return out;
    }
    /* what the board shows: places 1-10, never more */
    function board(list) { return (list || []).slice(0, TOP); }
    function mine(list) { const i = (list || []).findIndex(x => x.p && x.p.me); return i < 0 ? null : list[i]; }
    /* the podium order of the reference: 2nd left, 1st centre (raised), 3rd right */
    function podium(list) { const t = (list || []).slice(0, 3); return t.length < 2 ? t : t.length === 2 ? [t[1], t[0]] : [t[1], t[0], t[2]]; }
    /* one look per uid from the published looks; null = hidden (owner turned sharing off or never published) */
    function lookFor(p, looks) { if (!p || !p.uid || p.bot || p.demo) return null; const v = looks && looks[p.uid]; return typeof v === 'string' && v ? v : null; }
    function fmt(n, lang) { try { return Math.round(+n || 0).toLocaleString(lang === 1 ? 'de-DE' : lang === 2 ? 'es-ES' : 'en-US'); } catch (e) { return String(Math.round(+n || 0)); } }
    const api = { PERIODS, XP_MAX, TOP, OWNER, isOwner, fold, everyone, ladder, real, board, period, level, xpOf, rows, mine, podium, lookFor, fmt };
    if (isNode) module.exports = api;
    root.LowiRankingCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
/* 23 Oct 2026 (Eman: "when we check our own Misty stats, that's where we see where Misty's ranked, worldwide basically ... a very
   tiny preview, to others"): the rank peek in Misty's card (misty-hub.js). The same rows as the Ranking tab (real accounts only,
   Eman's accounts once, no bots); it picks the board where your place is best, a tie goes to All time, then Month, then Week,
   and gives the companion just above and just below you. null when you aren't on any board or you're alone on it. */
(function (root) {
    'use strict';
    const K = root.LowiRankingCore; if (!K) return;
    const PREF = ['all', 'm', 'w'];
    function peek(people, now, mine) {
        now = +now || Date.now();
        const per = {};
        let best = null;
        PREF.forEach(k => {
            const list = K.rows(people, k, now, mine), i = list.findIndex(x => x && x.p && x.p.me);
            if (i < 0 || list.length < 2) { per[k] = 0; return; }
            per[k] = list[i].rank;
            if (!best || list[i].rank < best.rank) best = { k, rank: list[i].rank, total: list.length, me: list[i], up: list[i - 1] || null, down: list[i + 1] || null };
        });
        if (best) best.per = per;
        return best;
    }
    K.peek = peek;
})(typeof window !== 'undefined' ? window : globalThis);
