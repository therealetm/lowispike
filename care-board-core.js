/* LOWiSPIKE care board (Oct 17, 2026, E-man: "the whole leaderboard don't make sense anymore ... nuke it and create a new one
   that is connected to how good we treat our companion"). Replaces the XP leaderboard and the old Bronze/Silver/Gold
   VIP / courses / 1:1 mentoring unlocks (Levels 7-9 that nobody could reach: levels stop at 6).

   Score = sunbeams: the same daily points that fill Misty's sun on Today (sun-meter.js model(): meal +3, scan +3,
   Move +4, fasting milestone +3, macro goal +2, water +1, other +1, each habit capped per day, 12 = full sun).
   A day counts at most 12, so a week tops out at 84. Ties: more full-sun days, then the higher level.
   Nothing here writes to the ledger, XP or levels; it only reads them.

   Cloud: no new column. The profile row's xp_week / xp_month carry the week's / month's sunbeams and wk / mo carry a
   tagged key "care1:<period>:<full-sun days>". Older builds compare wk to a bare date, never match the tag and so show
   0 for these rows (and new builds ignore their bare-date XP rows): the two boards can never mix numbers. */
(function (root) {
    'use strict';
    const GOAL = 12, TAG = 'care1';
    const pad = n => String(n).padStart(2, '0');
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    function periodStart(kind, now) {
        const d = new Date(+now || Date.now()); d.setHours(0, 0, 0, 0);
        if (kind === 'm') d.setDate(1); else d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        return d;
    }
    function periodKey(kind, now) { const d = periodStart(kind, now); return kind === 'm' ? d.getFullYear() + '-' + pad(d.getMonth() + 1) : dayKey(d); }
    /* days of the period so far, today included */
    function daysSoFar(kind, now) { now = +now || Date.now(); const s = periodStart(kind, now); let n = 0; for (const d = new Date(s); dayKey(d) <= dayKey(now) && n < 40; d.setDate(d.getDate() + 1)) n++; return n; }
    /* model = the sun meter's pure model(); one call per day of the period */
    function care(ledger, kind, now, model) {
        now = +now || Date.now();
        const out = { pts: 0, full: 0, days: 0, today: 0, key: periodKey(kind, now) };
        if (typeof model !== 'function') return out;
        const today = dayKey(now), L = Array.isArray(ledger) ? ledger : [];
        for (const d = periodStart(kind, now); out.days < 40; d.setDate(d.getDate() + 1)) {
            const k = dayKey(d), at = k === today ? now : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
            let m = null; try { m = model({ ledger: L, now: at }); } catch (e) { m = null; }
            const p = m ? Math.max(0, Math.min(GOAL, +m.points || 0)) : 0;
            out.pts += p; if (p >= GOAL) out.full++; out.days++;
            if (k === today) { out.today = p; break; }
        }
        return out;
    }
    const tag = (key, full) => TAG + ':' + key + ':' + Math.max(0, Math.round(+full || 0));
    function untag(s) { const m = /^care1:(\d{4}-\d{2}(?:-\d{2})?):(\d{1,3})$/.exec(String(s || '')); return m ? { key: m[1], full: +m[2] } : null; }
    const hash = s => { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
    /* demo bots: a steady made-up habit (4-11 sunbeams a day), never more than the days so far allow */
    function demo(name, kind, now) {
        const days = daysSoFar(kind, now), r = hash(name + '|' + periodKey(kind, now)), a = 4 + (r % 8);
        const pts = Math.min(days * GOAL, Math.round(a * days)), full = a >= 10 ? Math.min(days, Math.floor(days * (a - 9) / 3)) : 0;
        return { pts, full };
    }
    /* one person's score for the period: me (computed), bots (demo), anyone else (their synced row) */
    function scoreOf(p, kind, now, mine) {
        if (!p) return { pts: 0, full: 0 };
        if (p.me) { const c = mine && mine[kind]; return c ? { pts: c.pts, full: c.full } : { pts: 0, full: 0 }; }
        if (p.bot || p.demo) return demo(p.n, kind, now);
        const t = untag(kind === 'm' ? p.mo : p.wk), raw = kind === 'm' ? p.xpm : p.xpw, cap = daysSoFar(kind, now) * GOAL;
        if (!t || t.key !== periodKey(kind, now)) return { pts: 0, full: 0 };
        const pts = Math.max(0, Math.min(cap, Math.round(+raw || 0)));
        return { pts, full: Math.max(0, Math.min(Math.ceil(pts / GOAL), t.full)) };
    }
    function rank(people, kind, now, mine) {
        return (people || []).map(p => Object.assign({ p }, scoreOf(p, kind, now, mine)))
            .filter(x => x.pts > 0)
            .sort((a, b) => b.pts - a.pts || b.full - a.full || shownLevel(b.p) - shownLevel(a.p) || String(a.p.n).localeCompare(String(b.p.n)));
    }
    /* Oct 22, 2026: the top level comes from the one level table, world-home-core.js STAGES (10 cell stages); it used to stop
       at 6 here while Misty kept growing. Demo bots carry the galaxy's companion scale (Mateo 1, Jonas 18, Samir 43); shown
       here as the matching Misty level from their companion stage (community-galaxy.js stageForLevel: newborn 1 ... 6). */
    const WHC = (typeof module === 'object' && module.exports) ? require('./world-home-core.js') : root.LowiWorldHomeCore;
    const MAX_L = WHC && WHC.STAGES ? WHC.STAGES.length : 10;
    function botLevel(lv) { lv = +lv || 1; return 1 + (lv < 3 ? 0 : lv < 7 ? 1 : lv < 13 ? 2 : lv < 20 ? 3 : lv < 30 ? 4 : 5); }
    function shownLevel(p) {
        if (!p) return 1;
        if (p.bot || p.demo) return Math.max(1, Math.min(MAX_L, +p.shownLv || botLevel(p.lv)));
        return Math.max(1, Math.min(MAX_L, Math.round(+p.lv || 1)));
    }
    /* Oct 18, 2026 (Emmanuel saw "eman" three times on the board): one row per name, like Community (community-galaxy.js
       uniqueNames). Your own name is yours alone, other accounts with one name collapse into the highest level, and a demo
       bot steps aside when a real person has its name. Rows without a name are left out. The input list is not changed. */
    const nameKey = p => String((p && p.n) || '').trim().toLocaleLowerCase();
    /* Oct 18, 2026: leftover test accounts (hidden-accounts.js, by account id) never make the board; nothing is deleted */
    function hiddenList() {
        if (root.LowiHiddenAccounts) return root.LowiHiddenAccounts;
        try { if (typeof module === 'object' && module.exports && typeof require === 'function') return require('./hidden-accounts.js'); } catch (e) {}
        return null;
    }
    function roster(list) {
        const H = hiddenList();
        const B = root.LowiBotAccounts;
        list = (list || []).filter(p => p && !(H && H.isHidden(p)) && !(B && !p.me && B.isBot(p)));
        const self = list.find(p => p.me) || null, own = self ? nameKey(self) : '', best = new Map(), bots = [];
        for (const p of list) {
            if (p === self) continue;
            const k = nameKey(p);
            if (!k || (own && k === own)) continue;
            if (p.bot || p.demo) { bots.push(p); continue; }
            const cur = best.get(k);
            if (!cur || (+p.lv || 0) > (+cur.lv || 0) || ((+p.lv || 0) === (+cur.lv || 0) && (+p.xp || 0) > (+cur.xp || 0))) best.set(k, p);
        }
        const out = [...best.values()];
        for (const b of bots) { const k = nameKey(b); if (!best.has(k)) { best.set(k, b); out.push(b); } }
        if (self) out.push(self);
        return out;
    }
    const api = { GOAL, TAG, MAX_L, dayKey, periodStart, periodKey, daysSoFar, care, tag, untag, demo, scoreOf, rank, roster, botLevel, shownLevel };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiCareBoard = api;
})(typeof window !== 'undefined' ? window : globalThis);
