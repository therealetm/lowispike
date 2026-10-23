/* LOWiSPIKE bot accounts (Oct 23, 2026). Emmanuel, call, 11:18 PM: "Können wir bitte die ganzen Bots in der Leaderboard
   rausschmeißen und nur noch die Menschen da drin haben?" and "ich möchte auch die Bots aus mein Circle haben" (the
   Freund hinzufügen list showed bot names and his own name many times).

   Which accounts are bots is decided by the SERVER, never by a name: profiles.bot is set by the trigger
   profiles_zz_botflag (supabase/proposals/bot_flag_20261023.sql) from the account's sign-up e-mail, which only our own
   tools use: crowdNNN@crowd.lowispike.invalid (tools/community-crowd/crowd.cjs, the 100 community crowd members) and
   lowispike.gatetest+N@gmail.com (the Gatey / Guesty gate-test accounts). A user cannot set or clear the flag.

   The bots stay in the Community (galaxy, chat, the daily insulin-friendly photos); this list only keeps them out of
   the Ranking (week, month, all time) and out of the people you can add as a friend or to a Circle.
   API: set(ids), isBot(personOrId), humans(list), size(), load(sb). The ids are cached in localStorage so the very
   first paint after a restart already leaves the bots out. */
(function (root) {
    'use strict';
    const KEY = 'lowi.botIds.v1';
    let ids = new Set();
    try { const v = JSON.parse(root.localStorage && root.localStorage.getItem(KEY) || 'null'); if (v && Array.isArray(v.ids)) ids = new Set(v.ids.map(String)); } catch (e) { /* no cache */ }
    const uidOf = p => String(p && typeof p === 'object' ? (p.uid || p.id || p.user_id || '') : (p || ''));
    function isBot(p) { const u = uidOf(p); return !!u && ids.has(u); }
    function humans(list) { return (list || []).filter(p => !isBot(p)); }
    function set(list) {
        const next = new Set((list || []).map(String).filter(Boolean));
        const changed = next.size !== ids.size || [...next].some(u => !ids.has(u));
        ids = next;
        try { root.localStorage && root.localStorage.setItem(KEY, JSON.stringify({ ids: [...ids], at: Date.now() })); } catch (e) { /* full */ }
        if (changed) { try { root.dispatchEvent && root.dispatchEvent(new root.CustomEvent('lowi-bots')); } catch (e) { /* old browser */ } }
        return changed;
    }
    /* reads the server flag; a database without the column (or offline) leaves the cached list as it is */
    async function load(sb) {
        try {
            if (!sb || !sb.from) return false;
            const r = await sb.from('profiles').select('id').eq('bot', true).limit(5000);
            if (!r || r.error || !Array.isArray(r.data)) return false;
            return set(r.data.map(x => x.id));
        } catch (e) { return false; }
    }
    const api = { KEY, set, isBot, humans, load, size: () => ids.size };
    root.LowiBotAccounts = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
