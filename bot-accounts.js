/* LOWiSPIKE bot and test accounts (Oct 23, 2026). Emmanuel, call, 11:18 PM: "Können wir bitte die ganzen Bots in der
   Leaderboard rausschmeißen und nur noch die Menschen da drin haben?" and "ich möchte auch die Bots aus mein Circle haben"
   (the Freund hinzufügen list showed bot names and his own name many times). Later: Lena, Jonas and "Mia Test ####" are
   anonymous accounts our own check scripts create on the live app; hide them completely too, by a reliable
   marker, never by name, so a real Lena, Jonas or Mia stays.

   The SERVER decides, from data a name cannot fake (supabase/proposals/bot_flag_20261023.sql):
   - profiles.bot  = the sign-up e-mail is one only our tools use: crowdNNN@crowd.lowispike.invalid
                     (tools/community-crowd/crowd.cjs) or lowispike.gatetest+N@gmail.com (Gatey / Guesty).
                     Bots stay in the Community (galaxy, chat, daily photos); they only leave the Ranking and the
                     add-friend list.
   - profiles.test = the account carries lowi_test:true in its auth metadata, set by our check scripts
                     (tools/test-account.cjs). Test accounts are hidden everywhere (hidden-accounts.js asks here),
                     except to another test account, so the check scripts can still find each other.
   Both columns are written by triggers; no client can set or clear them.
   API: set(botIds, testIds), setSelf(uid), isBot(p) (bot, or test seen by a real person), isTest(p), humans(list),
   size(), load(sb). The ids are cached in localStorage so the first paint after a restart already leaves them out. */
(function (root) {
    'use strict';
    const KEY = 'lowi.botIds.v2';
    let bots = new Set(), tests = new Set(), self = '';
    try {
        const v = JSON.parse(root.localStorage && root.localStorage.getItem(KEY) || 'null');
        if (v && Array.isArray(v.ids)) bots = new Set(v.ids.map(String));
        if (v && Array.isArray(v.tests)) tests = new Set(v.tests.map(String));
        if (v && v.self) self = String(v.self);
    } catch (e) { /* no cache */ }
    const uidOf = p => String(p && typeof p === 'object' ? (p.uid || p.id || p.user_id || '') : (p || ''));
    const selfIsTest = () => !!self && tests.has(self);
    function isTest(p) { const u = uidOf(p); return !!u && tests.has(u); }
    function testHidden(p) { if (p && typeof p === 'object' && p.me) return false; return isTest(p) && !selfIsTest() && uidOf(p) !== self; }
    /* Oct 25: people the admin removed from the Community (hidden-accounts.js isRemoved) leave every list that asks here too */
    function removed(p) { if (p && typeof p === 'object' && p.me) return false; const H = root.LowiHiddenAccounts; return !!(H && H.isRemoved && H.isRemoved(uidOf(p))); }
    function isBot(p) { const u = uidOf(p); if (!u) return false; return bots.has(u) || testHidden(p) || removed(p); }
    function humans(list) { return (list || []).filter(p => !isBot(p)); }
    function save() { try { root.localStorage && root.localStorage.setItem(KEY, JSON.stringify({ ids: [...bots], tests: [...tests], self, at: Date.now() })); } catch (e) { /* full */ } }
    function set(botIds, testIds) {
        const nb = new Set((botIds || []).map(String).filter(Boolean)), nt = new Set((testIds || []).map(String).filter(Boolean));
        const diff = (a, b) => a.size !== b.size || [...a].some(u => !b.has(u));
        const changed = diff(nb, bots) || diff(nt, tests);
        bots = nb; tests = nt; save();
        if (changed) { try { root.dispatchEvent && root.dispatchEvent(new root.CustomEvent('lowi-bots')); } catch (e) { /* old browser */ } }
        return changed;
    }
    function setSelf(uid) { self = String(uid || ''); save(); }
    /* reads the server flags; a database without the columns (or offline) leaves the cached lists as they are */
    async function load(sb) {
        try {
            if (!sb || !sb.from) return false;
            try { const s = sb.auth && sb.auth.getSession && await sb.auth.getSession(); const u = s && s.data && s.data.session && s.data.session.user; if (u && u.id) setSelf(u.id); } catch (e) { /* no session */ }
            const r = await sb.from('profiles').select('id,bot,test').or('bot.eq.true,test.eq.true').limit(5000);
            if (!r || r.error || !Array.isArray(r.data)) return false;
            return set(r.data.filter(x => x.bot).map(x => x.id), r.data.filter(x => x.test).map(x => x.id));
        } catch (e) { return false; }
    }
    const api = { KEY, set, setSelf, isBot, isTest, testHidden, humans, load, size: () => bots.size + tests.size };
    root.LowiBotAccounts = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
