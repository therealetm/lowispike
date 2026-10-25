/* LOWiSPIKE Studio lock, pure core (25 Oct 2026, Emmanuel: "Studio under construction. I want it locked. So no one can see
   inside. But I can get access ... as the admin. So maybe lock it with a password."). No DOM, no network: the rules
   studio-lock.js and tests/studio-lock.test.cjs share.

   Who may open Studio: ONLY the server says so (supabase/proposals/studio_lock_20261025.sql).
   - studio_access(pass) is true for the app owner (public.app_admins, the owner role of owner_admin_20261018.sql)
     or for a device pass handed out by studio_unlock(pin).
   - The PIN is never in this repo: the server keeps a bcrypt hash in a table nobody can read through the API, compares
     it itself and rate limits tries, so it can't be guessed from the public code.
   - The pass stays on this device (lowi.studio.pass, not a lowispike.* key, so the account backup never carries it to
     another phone). OK_KEY remembers the server's last yes, only so a phone that unlocked can still open Studio while
     it has no connection; the next answer from the server always wins. Locked is the default for everything else. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiStudioLockCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const PASS_KEY = 'lowi.studio.pass', OK_KEY = 'lowi.studio.ok';
    /* 25 Oct: the Lock button. Set on this device only; while it is there Studio stays locked here, even for the owner, until the right PIN */
    const PREVIEW_KEY = 'lowi.studio.locked';
    const PASS_RE = /^[0-9a-f]{32,128}$/;

    const TXT = {
        en: { pill: 'Locked', title: 'Under construction', sub: 'Studio is being built. It opens here as soon as it’s ready.',
            lockBtn: 'Unlock with PIN', pinLabel: 'PIN', pinHint: 'Enter PIN', open: 'Open', cancel: 'Cancel', checking: 'Checking…',
            wrong: 'Wrong PIN.', wait: 'Too many tries. Try again later.', offline: 'No connection. Try again.', failed: 'That didn’t work. Try again.', short: 'At least 4 digits.',
            badge: 'Private · only you', lockNow: 'Lock', lockAria: 'Lock Studio on this device' },
        de: { pill: 'Gesperrt', title: 'Im Aufbau', sub: 'Studio wird gerade gebaut. Es öffnet sich hier, sobald es fertig ist.',
            lockBtn: 'Mit PIN entsperren', pinLabel: 'PIN', pinHint: 'PIN eingeben', open: 'Öffnen', cancel: 'Abbrechen', checking: 'Wird geprüft…',
            wrong: 'Falsche PIN.', wait: 'Zu viele Versuche. Versuch es später nochmal.', offline: 'Keine Verbindung. Versuch es nochmal.', failed: 'Das hat nicht geklappt. Versuch es nochmal.', short: 'Mindestens 4 Ziffern.',
            badge: 'Privat · nur du', lockNow: 'Sperren', lockAria: 'Studio auf diesem Gerät sperren' },
        es: { pill: 'Bloqueado', title: 'En construcción', sub: 'Estamos construyendo Estudio. Se abrirá aquí en cuanto esté listo.',
            lockBtn: 'Desbloquear con PIN', pinLabel: 'PIN', pinHint: 'Introduce el PIN', open: 'Abrir', cancel: 'Cancelar', checking: 'Comprobando…',
            wrong: 'PIN incorrecto.', wait: 'Demasiados intentos. Inténtalo más tarde.', offline: 'Sin conexión. Inténtalo de nuevo.', failed: 'No funcionó. Inténtalo de nuevo.', short: 'Al menos 4 dígitos.',
            badge: 'Privado · solo tú', lockNow: 'Bloquear', lockAria: 'Bloquear Estudio en este dispositivo' }
    };
    const text = lang => TXT[lang] || TXT.en;

    /* what the user typed, as the server wants it: digits only, at most 8 */
    function normalizePin(s) { return String(s == null ? '' : s).replace(/\D/g, '').slice(0, 8); }
    const pinReady = s => /^\d{4,8}$/.test(String(s || ''));
    const validPass = p => typeof p === 'string' && PASS_RE.test(p);

    /* sb.rpc('studio_access'): true on an explicit true, false on an explicit false, null when the server could not answer */
    function accessFromRpc(res) {
        if (!res || res.error) return null;
        return res.data === true ? true : res.data === false ? false : null;
    }

    /* sb.rpc('studio_unlock'): {ok, pass, reason}; reason: wrong | wait | unset | offline | error */
    function unlockFromRpc(res) {
        if (!res) return { ok: false, pass: '', reason: 'error' };
        if (res.error) {
            const m = String((res.error && (res.error.message || res.error)) || '');
            return { ok: false, pass: '', reason: /Failed to fetch|NetworkError|network|offline|timeout/i.test(m) ? 'offline' : 'error' };
        }
        const d = res.data || {};
        if (d.ok === true && validPass(d.pass)) return { ok: true, pass: d.pass, reason: '' };
        const r = String(d.reason || '');
        return { ok: false, pass: '', reason: r === 'wrong' || r === 'wait' || r === 'unset' ? r : 'error' };
    }
    function reasonText(reason, lang) {
        const t = text(lang);
        return reason === 'wrong' ? t.wrong : reason === 'wait' ? t.wait : reason === 'offline' ? t.offline : t.failed;
    }

    /* the remembered yes: 'pass' (this device typed the PIN) or 'uid:<id>' (the owner was signed in) */
    function okMark(viaPass, uid) { return viaPass ? 'pass' : (uid ? 'uid:' + uid : ''); }
    function cachedOk(mark, pass, uid) {
        if (mark === 'pass') return validPass(pass);
        return !!(uid && mark === 'uid:' + uid);
    }
    /* open or locked: the server's answer wins; without one, only a remembered yes for this device / account opens it */
    function decide(server, mark, pass, uid, preview) {
        if (preview) return false; /* locked on this device with the Lock button */
        if (server === true) return true;
        if (server === false) return false;
        return cachedOk(mark, pass, uid);
    }

    /* the lock panel and the open badge, shared by studio-lock.js (in the app) and studio-gate.js (affiliates/, create/) */
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';
    function lockHtml(lang, formOpen, msg) {
        const x = text(lang);
        return '<div class="sl-in"><span class="sl-pill"><i aria-hidden="true"></i>' + esc(x.pill) + '</span>'
            + '<span class="sl-ic" aria-hidden="true">' + LOCK_SVG + '</span>'
            + '<h2 class="sl-t">' + esc(x.title) + '</h2><p class="sl-s">' + esc(x.sub) + '</p>'
            + '<form class="sl-pin" novalidate' + (formOpen ? '' : ' hidden') + '><input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" aria-label="' + esc(x.pinLabel) + '" placeholder="' + esc(x.pinHint) + '">'
            + '<span class="sl-row"><button type="button" class="sl-b sl-cancel" data-sl="cancel">' + esc(x.cancel) + '</button><button type="submit" class="sl-b sl-go">' + esc(x.open) + '</button></span>'
            + '<span class="sl-msg" role="status" aria-live="polite">' + esc(msg) + '</span></form></div>'
            + '<button type="button" class="sl-key" data-sl="pin" aria-label="' + esc(x.lockBtn) + '" aria-expanded="' + (formOpen ? 'true' : 'false') + '"' + (formOpen ? ' hidden' : '') + '>' + LOCK_SVG + '</button>';
    }
    function openHtml(lang) {
        const x = text(lang);
        return '<span class="sl-badge"><span aria-hidden="true">\u{1F512}</span> ' + esc(x.badge) + '</span>'
            + '<button type="button" class="sl-lockbtn" data-sl="lock" aria-label="' + esc(x.lockAria) + '">' + esc(x.lockNow) + '</button>';
    }

    return { PASS_KEY, OK_KEY, PREVIEW_KEY, TXT, lockHtml, openHtml, esc, text, normalizePin, pinReady, validPass, accessFromRpc, unlockFromRpc, reasonText, okMark, cachedOk, decide };
});
