/* LOWiSPIKE: the admin removes a person from the Community (25 Oct 2026). Emmanuel (voice, with a screenshot of a profile card
   for an "Emmanuel" he did not know): "Can you give me the option as an admin to just kick people out of the community? I can
   still see names that I don't even know who they are. [...] A simple remove would be nice."

   Pure core, no DOM and no network: the rules community-remove.js and tests/community-remove.test.cjs share.
   - Only the SERVER decides who is admin and does the removal (supabase/proposals/community_remove_20261025.sql):
     community_is_admin() / community_remove(target) / community_restore(target) / community_removed_list() /
     community_am_removed(). The app only shows the button when the server said "admin" (an explicit true), and the server
     checks again on every call, so a forged button does nothing.
   - A removal is reversible and deletes nothing: the person's profile, messages and posts stay in the database, hidden.
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
        en: { btn: 'Remove from community', title: 'Remove {n}?',
            body: '{n} will disappear from Room, Chat, Ranking and every list for everyone, and can no longer post. Nothing is deleted, and you can restore them any time in Community settings.',
            yes: 'Remove', cancel: 'Cancel', working: 'Removing…', done: '{n} was removed from the community.',
            list: 'Removed people', listNote: 'Only you see this list. Restore brings a person back everywhere.', none: 'Nobody is removed.',
            restore: 'Restore', restoring: 'Restoring…', restored: '{n} is back in the community.', loading: 'Loading…',
            notAdmin: 'Only the admin can do this.', rate: 'Too many changes at once. Try again in a few minutes.',
            self: 'You can’t remove yourself.', offline: 'No connection. Try again.', failed: 'That didn’t work. Try again.',
            outTitle: 'You’re no longer part of this community', outBody: 'Your companion, your health log and everything on your own Home stay as they are. You just can’t see or post in the Community anymore.',
            outHome: 'Back to Home', badge: 'Admin' },
        de: { btn: 'Aus der Community entfernen', title: '{n} entfernen?',
            body: '{n} verschwindet für alle aus Raum, Chat, Rangliste und allen Listen und kann nichts mehr posten. Nichts wird gelöscht, und du kannst die Person jederzeit in den Community-Einstellungen zurückholen.',
            yes: 'Entfernen', cancel: 'Abbrechen', working: 'Wird entfernt…', done: '{n} wurde aus der Community entfernt.',
            list: 'Entfernte Personen', listNote: 'Nur du siehst diese Liste. „Zurückholen“ bringt die Person überall zurück.', none: 'Niemand ist entfernt.',
            restore: 'Zurückholen', restoring: 'Wird zurückgeholt…', restored: '{n} ist wieder in der Community.', loading: 'Wird geladen…',
            notAdmin: 'Das kann nur der Admin.', rate: 'Zu viele Änderungen auf einmal. Versuch es in ein paar Minuten noch mal.',
            self: 'Du kannst dich nicht selbst entfernen.', offline: 'Keine Verbindung. Versuch es noch mal.', failed: 'Das hat nicht geklappt. Versuch es noch mal.',
            outTitle: 'Du bist nicht mehr Teil dieser Community', outBody: 'Dein Begleiter, dein Gesundheitstagebuch und alles auf deinem Home bleiben, wie sie sind. Du kannst nur in der Community nichts mehr sehen oder posten.',
            outHome: 'Zurück zu Home', badge: 'Admin' },
        es: { btn: 'Quitar de la comunidad', title: '¿Quitar a {n}?',
            body: '{n} desaparecerá para todos de la Sala, el Chat, el Ranking y todas las listas, y ya no podrá publicar. No se borra nada y puedes devolverle su acceso cuando quieras en los ajustes de la Comunidad.',
            yes: 'Quitar', cancel: 'Cancelar', working: 'Quitando…', done: '{n} ya no está en la comunidad.',
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

    return { TXT, text, fill, validId, adminFrom, removedFrom, canRemove, idsFrom, reasonOf, reasonText, listFrom, CACHE_KEY, ADMIN_KEY };
});
