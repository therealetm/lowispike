/* LOWiSPIKE (28 Oct 2026): the Community chat is for people only.
   Emmanuel, call: "die Bot Sachen, die im Chat kommen, nur auf der For You Page leben ... dann ist der Chat einfach wirklich
   nur fuer Menschen ... nuken wir mal alle Nachrichten von Bot im Chat ... lassen aber alles auf der For You Page."

   A chat message or a chat reaction leaves the chat when its AUTHOR is a bot the app knows from data a name cannot fake:
   - Nibblo's fixed account id (nibblo-core.js UID, an account nobody can sign in to), and
   - accounts the SERVER flags as bots (profiles.bot, written by a trigger from the sign-up e-mail: the crowd, the gate
     testers, @bot.lowispike.invalid), read by bot-accounts.js (isFlagged) or straight from the profiles rows the chat
     loads with (learn).
   Never by display name or text: a real person called "Nibblo" or writing "Bot" stays. Test accounts (profiles.test) are
   not bots and are not touched here. For You is not touched either: Nibblo's posts and the daily swap stay there.
   A person's reply to a bot message stays; its quote then reads like any reply whose original is gone.
   API: NIBBLO, isBotAuthor(x), learn(profileRows), keep(messages), keepRx(reactions), excludeIds(max), notIn(max). */
(function (root) {
    'use strict';
    const NIBBLO = '59bb3615-b344-4c45-ab0f-0a5de5cd8df3';
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const known = new Set([NIBBLO]);
    /* a message row (user_id), a mapped chat message (uid), a reaction row (user_id) or a bare id */
    const uidOf = x => String(x && typeof x === 'object' ? (x.user_id || x.uid || '') : (x == null ? '' : x)).trim();
    function flagged(u) {
        const B = root.LowiBotAccounts;
        try { return !!(B && typeof B.isFlagged === 'function' && B.isFlagged(u)); } catch (e) { return false; }
    }
    function isBotAuthor(x) {
        const u = uidOf(x);
        if (!u || u === 'me') return false;
        return known.has(u) || flagged(u);
    }
    /* profiles rows with the server's bot column, as the chat's own first load reads them ({id, bot}) */
    function learn(rows) {
        let n = 0;
        for (const r of rows || []) if (r && r.bot === true && r.id && !known.has(String(r.id))) { known.add(String(r.id)); n++; }
        return n;
    }
    function keep(list) { return (Array.isArray(list) ? list : []).filter(m => m && !isBotAuthor(m)); }
    function keepRx(list) { return (Array.isArray(list) ? list : []).filter(r => r && !isBotAuthor(r)); }
    /* the ids for the server query ("user_id not in ..."), Nibblo first; only real uuids, at most max of them so the request
       stays short. Anyone beyond that is still filtered on the phone by keep(). */
    function excludeIds(max) {
        const cap = Math.max(1, +max || 120), out = [];
        const B = root.LowiBotAccounts;
        let more = [];
        try { more = B && typeof B.flaggedIds === 'function' ? B.flaggedIds() : []; } catch (e) { more = []; }
        for (const u of [...known, ...more]) { const s = String(u); if (UUID.test(s) && out.indexOf(s) < 0) out.push(s); if (out.length >= cap) break; }
        return out;
    }
    function notIn(max) { return '(' + excludeIds(max).join(',') + ')'; }
    const api = { NIBBLO, isBotAuthor, learn, keep, keepRx, excludeIds, notIn };
    root.LowiChatHumans = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
