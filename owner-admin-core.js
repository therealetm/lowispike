/* LOWiSPIKE owner tools, pure core (Oct 18, 2026, E-man: "you need to give me access to be able to delete them
   and kick out members"). No DOM, no network: the rules the owner UI (owner-admin.js) and the tests share.

   Who is the owner: ONLY the server says so. The Supabase function is_app_owner() checks auth.uid() against
   public.app_admins (supabase/proposals/owner_admin_20261018.sql). A name, a local flag or a URL never makes anyone
   owner, and the server refuses every owner action from anyone else anyway: the UI check only hides buttons.

   Kick = reversible: a row in public.community_kicks hides the member from Community and the care board for everyone
   and stops them posting. Undo removes the row. Delete = permanent, through the owner-delete-account Edge Function,
   only after the owner types DELETE. */
(function (root) {
    'use strict';
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const CONFIRM = 'DELETE';
    const BATCH = 50;
    const isId = id => typeof id === 'string' && UUID.test(id);

    /* the reply of sb.rpc('is_app_owner'): owner only on an explicit true */
    function ownerFromRpc(res) { return !!(res && !res.error && res.data === true); }

    /* why a call failed, so the UI can degrade instead of breaking before the SQL / function exists */
    function classify(err, status) {
        const e = err || {}, code = String(e.code || ''), msg = String(e.message || e.error || e || '');
        const st = +status || +e.status || (e.context && +e.context.status) || 0;
        if (code === '42501' || st === 403 || /not_owner|only the app owner/i.test(msg)) return 'not-owner';
        if (st === 401 || /not_signed_in/i.test(msg)) return 'signed-out';
        if (/owner_setup_missing/i.test(msg) || code === 'PGRST202' || code === 'PGRST205' || code === '42883' || code === '42P01' ||
            st === 404 || /could not find the function|does not exist|Requested function was not found|NOT_FOUND/i.test(msg)) return 'missing';
        if (/Failed to send a request|Failed to fetch|NetworkError|network|offline|timeout/i.test(msg)) return 'offline';
        return 'error';
    }

    /* may the owner act on this member? target = {id, isOwner, bot} */
    function canAct(isOwner, myId, target) {
        if (!isOwner) return { ok: false, reason: 'not-owner' };
        if (!target || !isId(target.id)) return { ok: false, reason: 'no-account' };
        if (target.bot) return { ok: false, reason: 'bot' };
        if (target.id === myId) return { ok: false, reason: 'self' };
        if (target.isOwner) return { ok: false, reason: 'owner' };
        return { ok: true, reason: '' };
    }

    /* kick / undo state: what the app hides, and the owner's undo stack */
    function kickState(ids) { return { kicked: new Set((ids || []).filter(isId)), history: [] }; }
    function setKicked(st, ids) { st.kicked = new Set((ids || []).filter(isId)); return st; }
    function applyKick(st, ids) {
        const added = [...new Set((ids || []).filter(id => isId(id) && !st.kicked.has(id)))];
        added.forEach(id => st.kicked.add(id));
        if (added.length) st.history.push({ type: 'kick', ids: added });
        return added;
    }
    function applyUnkick(st, ids) {
        const gone = [...new Set((ids || []).filter(id => st.kicked.has(id)))];
        gone.forEach(id => st.kicked.delete(id));
        if (gone.length) st.history.push({ type: 'unkick', ids: gone });
        return gone;
    }
    /* returns {type, ids} of the step undone (type is what was undone), or null */
    function undo(st) {
        const last = st.history.pop();
        if (!last) return null;
        if (last.type === 'kick') last.ids.forEach(id => st.kicked.delete(id));
        else last.ids.forEach(id => st.kicked.add(id));
        return last;
    }
    /* what the server call for undoing `last` is */
    function undoCall(last) { return !last ? null : { rpc: last.type === 'kick' ? 'admin_unkick' : 'admin_kick', ids: last.ids.slice() }; }
    const isKicked = (st, id) => !!(st && id && st.kicked.has(id));

    /* hide kicked members from any list of people ({uid}) */
    function filterPeople(list, kicked) {
        if (!Array.isArray(list) || !kicked || !kicked.size) return list;
        return list.filter(p => !(p && p.uid && kicked.has(p.uid)));
    }

    /* the owner's member list: one group per name. rows from admin_members(); testIds = the known test-account list */
    function groupMembers(rows, testIds) {
        const test = testIds instanceof Set ? testIds : new Set(testIds || []);
        const by = new Map();
        (rows || []).forEach(r => {
            if (!r || !isId(r.id)) return;
            const name = String(r.name || '(no name)').trim() || '(no name)', k = name.toLowerCase();
            let g = by.get(k);
            if (!g) { g = { key: k, name, ids: [], kicked: 0, owner: false, test: 0, guests: 0, last: 0, first: Infinity }; by.set(k, g); }
            g.ids.push(r.id);
            if (r.kicked) g.kicked++;
            if (r.is_owner) g.owner = true;
            if (test.has(r.id)) g.test++;
            if (r.is_anonymous) g.guests++;
            const seen = Date.parse(r.last_sign_in_at || '') || Date.parse(r.created_at || '') || 0;
            const made = Date.parse(r.created_at || '') || 0;
            if (seen > g.last) g.last = seen;
            if (made && made < g.first) g.first = made;
        });
        return [...by.values()].map(g => Object.assign(g, {
            count: g.ids.length,
            onTestList: g.test > 0 && g.test === g.ids.length,
            allKicked: g.kicked === g.ids.length
        })).sort((a, b) => (b.onTestList - a.onTestList) || (b.count - a.count) || a.key.localeCompare(b.key));
    }

    /* ids in a group the owner may act on: never himself, never an owner */
    function actionable(rows, ids, myId) {
        const owners = new Set((rows || []).filter(r => r && r.is_owner).map(r => r.id));
        return (ids || []).filter(id => isId(id) && id !== myId && !owners.has(id));
    }
    function batches(ids, n) { n = n || BATCH; const out = []; for (let i = 0; i < (ids || []).length; i += n) out.push(ids.slice(i, i + n)); return out; }
    const confirmOk = typed => String(typed || '').trim().toUpperCase() === CONFIRM;

    const api = { UUID, CONFIRM, BATCH, isId, ownerFromRpc, classify, canAct, kickState, setKicked, applyKick, applyUnkick, undo, undoCall,
        isKicked, filterPeople, groupMembers, actionable, batches, confirmOk };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiOwnerAdminCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
