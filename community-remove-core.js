/* LOWiSPIKE: the admin removes a person from the Community (25 Oct 2026). Emmanuel (voice, with a screenshot of a profile card
   for an "Emmanuel" he did not know): "Can you give me the option as an admin to just kick people out of the community? I can
   still see names that I don't even know who they are. [...] A simple remove would be nice."

   Pure core, no DOM and no network: the rules community-remove.js and tests/community-remove.test.cjs share.
   - Only the SERVER decides who is admin and does the removal (supabase/proposals/community_remove_20261025.sql):
     community_is_admin() / community_remove(target) / community_restore(target) / community_removed_list() /
     community_am_removed(). The app only shows the button when the server said "admin" (an explicit true), and the server
     checks again on every call, so a forged button does nothing.
   - 26 Oct 2026, Emmanuel: "I removed it, and it's still there. This should be deleting their accounts. Fix it." The admin
     button on a person's card now DELETES the account for good (Edge Function owner-delete-account -> SQL
     community_delete_account, supabase/proposals/admin_delete_account_20261026.sql), after a confirm that says so. The card
     says "deleted" only when the server's answer lists the id (deleteOutcome). Deleted ids are tombstoned in
     public.community_deleted and hidden like removed ones (hiddenIds). Older reversible removals (community_kicks) still
     show in "Removed people" with Restore.
   - removedIds() is the list of removed ids every app reads (public.community_kicks); hidden-accounts.js and
     bot-accounts.js treat them like hidden test accounts, so they leave Room, Chat, Ranking, For You, Add a friend,
     the People list and mentions together. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiCommunityRemoveCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const CACHE_KEY = 'lowi.removedIds.v1', ADMIN_KEY = 'lowi.communityAdmin.v1';

    const TXT = {
        en: { btn: 'Delete account', title: 'Delete {n}’s account?',
            body: '{n}’s account will be deleted for good: their login, companion, messages, posts, energy and ranking. They disappear from Circle, Chat, Ranking and every list for everyone. This can’t be undone.',
            yes: 'Delete for good', cancel: 'Cancel', working: 'Deleting…', done: '{n}’s account was deleted.',
            delFailed: 'The account wasn’t deleted. Try again.', delSelf: 'You can’t delete your own account or another admin’s here.',
            list: 'Removed people', listNote: 'Only you see this list. Restore brings a person back everywhere.', none: 'Nobody is removed.',
            restore: 'Restore', restoring: 'Restoring…', restored: '{n} is back in the community.', loading: 'Loading…',
            notAdmin: 'Only the admin can do this.', rate: 'Too many changes at once. Try again in a few minutes.',
            self: 'You can’t remove yourself.', offline: 'No connection. Try again.', failed: 'That didn’t work. Try again.',
            outTitle: 'You’re no longer part of this community', outBody: 'Your companion, your health log and everything on your own Home stay as they are. You just can’t see or post in the Community anymore.',
            outHome: 'Back to Home', badge: 'Admin' },
        de: { btn: 'Konto löschen', title: 'Konto von {n} löschen?',
            body: 'Das Konto von {n} wird endgültig gelöscht: Login, Begleiter, Nachrichten, Beiträge, Energie und Rangliste. {n} verschwindet für alle aus Circle, Chat, Rangliste und allen Listen. Das kann nicht rückgängig gemacht werden.',
            yes: 'Endgültig löschen', cancel: 'Abbrechen', working: 'Wird gelöscht…', done: 'Das Konto von {n} wurde gelöscht.',
            delFailed: 'Das Konto wurde nicht gelöscht. Versuch es noch mal.', delSelf: 'Dein eigenes Konto oder das eines anderen Admins kannst du hier nicht löschen.',
            list: 'Entfernte Personen', listNote: 'Nur du siehst diese Liste. „Zurückholen“ bringt die Person überall zurück.', none: 'Niemand ist entfernt.',
            restore: 'Zurückholen', restoring: 'Wird zurückgeholt…', restored: '{n} ist wieder in der Community.', loading: 'Wird geladen…',
            notAdmin: 'Das kann nur der Admin.', rate: 'Zu viele Änderungen auf einmal. Versuch es in ein paar Minuten noch mal.',
            self: 'Du kannst dich nicht selbst entfernen.', offline: 'Keine Verbindung. Versuch es noch mal.', failed: 'Das hat nicht geklappt. Versuch es noch mal.',
            outTitle: 'Du bist nicht mehr Teil dieser Community', outBody: 'Dein Begleiter, dein Gesundheitstagebuch und alles auf deinem Home bleiben, wie sie sind. Du kannst nur in der Community nichts mehr sehen oder posten.',
            outHome: 'Zurück zu Home', badge: 'Admin' },
        es: { btn: 'Borrar cuenta', title: '¿Borrar la cuenta de {n}?',
            body: 'La cuenta de {n} se borrará para siempre: acceso, compañero, mensajes, publicaciones, energía y ranking. Desaparecerá para todos del Circle, el Chat, el Ranking y todas las listas. No se puede deshacer.',
            yes: 'Borrar para siempre', cancel: 'Cancelar', working: 'Borrando…', done: 'La cuenta de {n} se ha borrado.',
            delFailed: 'La cuenta no se ha borrado. Inténtalo de nuevo.', delSelf: 'Aquí no puedes borrar tu propia cuenta ni la de otro admin.',
            list: 'Personas quitadas', listNote: 'Solo tú ves esta lista. «Restaurar» devuelve a la persona en todas partes.', none: 'No has quitado a nadie.',
            restore: 'Restaurar', restoring: 'Restaurando…', restored: '{n} vuelve a estar en la comunidad.', loading: 'Cargando…',
            notAdmin: 'Solo el admin puede hacer esto.', rate: 'Demasiados cambios a la vez. Inténtalo de nuevo en unos minutos.',
            self: 'No puedes quitarte a ti mismo.', offline: 'Sin conexión. Inténtalo de nuevo.', failed: 'No ha funcionado. Inténtalo de nuevo.',
            outTitle: 'Ya no formas parte de esta comunidad', outBody: 'Tu compañero, tu registro de salud y todo lo de tu Home siguen igual. Solo que ya no puedes ver ni publicar en la Comunidad.',
            outHome: 'Volver a Home', badge: 'Admin' }
    };
    function text(lang) { return TXT[lang] || TXT.en; }
    function fill(s, name) { return String(s || '').split('{n}').join(String(name || '').trim() || 'Member'); }
    const validId = id => typeof id === 'string' && UUID.test(id.trim());

    /* the admin flag comes only from an explicit true from the server; anything else (null, "true", an error) is "not admin" */
    function adminFrom(res) { return !!(res && !res.error && res.data === true); }
    function removedFrom(res) { return !!(res && !res.error && res.data === true); }

    /* the button: admin, someone else, a real account id, not already removed */
    function canRemove(state, target) {
        if (!state || state.admin !== true || !validId(target)) return false;
        const t = target.trim().toLowerCase();
        if (state.self && String(state.self).toLowerCase() === t) return false;
        return true;
    }

    /* ids from community_kicks rows [{user_id}] (or a plain list); only valid ids, lower case, no duplicates */
    function idsFrom(rows) {
        const out = new Set();
        for (const r of rows || []) { const v = String(r && typeof r === 'object' ? (r.user_id || r.id || '') : (r || '')).trim().toLowerCase(); if (validId(v)) out.add(v); }
        return [...out];
    }

    /* the server's error -> the sentence the person reads */
    function reasonOf(res) {
        const e = res && res.error; if (!e) return '';
        const m = String((e.message || '') + ' ' + (e.code || '') + ' ' + (e.details || '')).toLowerCase();
        if (/not_admin|42501|permission denied/.test(m)) return 'notAdmin';
        if (/rate_limited/.test(m)) return 'rate';
        if (/not_yourself|target_is_admin/.test(m)) return 'self';
        if (/offline|failed to fetch|network|load failed/.test(m)) return 'offline';
        return 'failed';
    }
    function reasonText(reason, lang) { const T = text(lang); return T[reason] || T.failed; }

    /* the admin's list from community_removed_list(): [{user_id, name, removed_at}] newest first, valid ids only */
    function listFrom(res) {
        if (!res || res.error || !Array.isArray(res.data)) return null;
        return res.data.filter(r => r && validId(String(r.user_id || ''))).map(r => ({ id: String(r.user_id).toLowerCase(), name: String(r.name || '').trim() || 'Member', at: r.removed_at || '' }))
            .sort((a, b) => String(b.at).localeCompare(String(a.at)));
    }

    /* ---------- 26 Oct 2026: the admin button DELETES the account (Edge Function owner-delete-account) ---------- */
    const DELETE_FN = 'owner-delete-account', DELETED_KEY = 'lowi.deletedIds.v1';
    function deleteCall(id) { return { fn: DELETE_FN, body: { ids: [String(id || '').trim().toLowerCase()], confirm: 'DELETE' } }; }

    /* "deleted" only when the server's answer lists this id in deleted; anything else (an error, a failed entry, an empty or
       odd answer) is a failure with a reason, so the card never says "deleted" for an account that still exists */
    function deleteOutcome(res, id) {
        const want = String(id || '').trim().toLowerCase();
        if (!res || !validId(want)) return { ok: false, reason: 'delFailed' };
        if (res.error) {
            const st = res.error.context && res.error.context.status, m = String(res.error.message || res.error.name || '').toLowerCase();
            if (st === 401 || st === 403 || /not_owner|not_admin/.test(m)) return { ok: false, reason: 'notAdmin' };
            if (/offline|failed to fetch|network|load failed|fetcherror|relay/.test(m) && !st) return { ok: false, reason: 'offline' };
            return { ok: false, reason: 'delFailed' };
        }
        const d = res.data && typeof res.data === 'object' ? res.data : null;
        if (d && Array.isArray(d.deleted) && d.deleted.some(x => String(x || '').trim().toLowerCase() === want)) return { ok: true, reason: '' };
        const f = d && Array.isArray(d.failed) ? d.failed.find(x => x && String(x.id || '').trim().toLowerCase() === want) : null;
        const r = String(f && f.reason || '');
        if (/not_admin|not_owner/.test(r)) return { ok: false, reason: 'notAdmin' };
        if (/rate_limited/.test(r)) return { ok: false, reason: 'rate' };
        if (/not_yourself|target_is_admin|owner/.test(r)) return { ok: false, reason: 'delSelf' };
        return { ok: false, reason: 'delFailed' };
    }

    /* every id the app hides: removed (community_kicks, reversible) plus deleted (community_deleted tombstones, forever).
       A deleted account's kick row goes with the login, so without the tombstones a phone that still has the person in a
       cache would show them again. Tombstones only ever grow; a failed read keeps what this phone already knew. */
    function hiddenIds(kicksRes, deletedRes, prevRemoved, prevDeleted) {
        const okRows = r => r && !r.error && Array.isArray(r.data);
        const deleted = idsFrom((prevDeleted || []).concat(okRows(deletedRes) ? deletedRes.data : []));
        const removed = okRows(kicksRes) ? idsFrom(kicksRes.data) : idsFrom(prevRemoved || []);
        return { removed: idsFrom(removed.concat(deleted)), deleted };
    }

    return { TXT, text, fill, validId, adminFrom, removedFrom, canRemove, idsFrom, reasonOf, reasonText, listFrom, CACHE_KEY, ADMIN_KEY,
        DELETE_FN, DELETED_KEY, deleteCall, deleteOutcome, hiddenIds };
});
