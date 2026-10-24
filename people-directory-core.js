/* LOWiSPIKE People directory, pure part (Oct 24, 2026).
   Emmanuel wants to browse everyone who is part of the app, also people who are offline and people he has not added:
   until now he only found extra people through Add a friend, the Community roster shows who is online, and the Friends
   Tree shows only added friends. The UI lives in people-directory.js; this file holds what tests can pin without a DOM:
   which people are listed (real humans only, never blocked ones, one row per account id, sorted by name), the name search,
   which picture URLs are allowed, and the EN/DE/ES words.
   Privacy: a row carries only the human name, the picture and the id. Never weight, glucose, level, XP or presence:
   the directory never says anyone is online, and it is not a ranking. Real-human filtering is not redone here: the UI
   takes its list from LowiCellRoom.people(), the same list as Add a friend (bots, test, hidden and owner accounts removed). */
(function (root) {
    'use strict';
    const T = {
        entry: ['People', 'Leute', 'Personas'],
        title: ['People', 'Leute', 'Personas'],
        sub: ['Everyone who is part of LOWiSPIKE, also when they are offline. Pick someone to see their profile.',
            'Alle, die bei LOWiSPIKE dabei sind, auch wenn sie offline sind. Wähle jemanden, um das Profil zu sehen.',
            'Todas las personas que forman parte de LOWiSPIKE, también sin conexión. Elige a alguien para ver su perfil.'],
        search: ['Search by name', 'Nach Namen suchen', 'Buscar por nombre'],
        close: ['Close', 'Schließen', 'Cerrar'],
        open: ['Open profile of {n}', 'Profil von {n} öffnen', 'Abrir el perfil de {n}'],
        none: ['Nobody by that name yet.', 'Noch niemand mit diesem Namen.', 'Todavía nadie con ese nombre.'],
        empty: ['Nobody to show yet.', 'Noch niemand zu zeigen.', 'Todavía no hay nadie que mostrar.'],
        signin: ['Sign in to see the people in LOWiSPIKE.', 'Melde dich an, um die Leute bei LOWiSPIKE zu sehen.', 'Inicia sesión para ver a las personas de LOWiSPIKE.'],
        loading: ['Loading people…', 'Leute werden geladen…', 'Cargando personas…'],
        friend: ['In your tree', 'In deinem Baum', 'En tu árbol']
    };
    const LANGS = ['en', 'de', 'es'];
    function tr(k, li, v) {
        const row = T[k] || [k];
        let s = row[li] || row[0];
        for (const x in v || {}) s = s.split('{' + x + '}').join(String(v[x]));
        return s;
    }
    function nameOf(p) { return String((p && p.n) || '').replace(/\s+/g, ' ').trim().slice(0, 60); }
    function fold(s) {
        s = String(s || '').toLocaleLowerCase();
        try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
        return s;
    }
    /* Only pictures the app itself can show safely: https URLs and inline images. Anything else gets the initials circle. */
    function safeImg(u) {
        u = String(u || '').trim();
        if (/^https:\/\/[^\s"'<>()]+$/i.test(u)) return u;
        if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(u)) return u;
        return '';
    }
    function initials(n) {
        const parts = nameOf({ n }).split(' ').filter(Boolean);
        const a = parts[0] ? Array.from(parts[0])[0] : '';
        const b = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] : '';
        return (a + b).toLocaleUpperCase() || '?';
    }
    /* list: people from LowiCellRoom.people(); opts.blocked(uid) -> true hides that person; opts.me drops your own id.
       Returns plain rows {uid, n, img} sorted by name, one per id. */
    function build(list, opts) {
        opts = opts || {};
        const isBlocked = typeof opts.blocked === 'function' ? opts.blocked : () => false;
        const me = opts.me ? String(opts.me) : '';
        const seen = new Set(), out = [];
        for (const p of list || []) {
            if (!p || typeof p !== 'object') continue;
            const uid = String(p.uid || '').trim(), n = nameOf(p);
            if (!uid || !n || uid === me || seen.has(uid)) continue;
            let b = false;
            try { b = !!isBlocked(uid); } catch (e) { b = false; }
            if (b) continue;
            seen.add(uid);
            out.push({ uid, n, img: safeImg(p.avatar) });
        }
        out.sort((a, b) => a.n.localeCompare(b.n, undefined, { sensitivity: 'base' }) || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
        return out;
    }
    /* Name search: every word you type must start a word of the name (accents and case ignored). */
    function match(rows, q) {
        const words = fold(q).split(/\s+/).filter(Boolean);
        if (!words.length) return (rows || []).slice();
        return (rows || []).filter(r => {
            const parts = fold(r.n).split(/[\s\-'.]+/).filter(Boolean);
            return words.every(w => parts.some(p => p.startsWith(w)));
        });
    }
    const API = { T, LANGS, tr, build, match, safeImg, initials, nameOf };
    if (typeof module === 'object' && module.exports) module.exports = API;
    root.LowiPeopleDirCore = API;
})(typeof window !== 'undefined' ? window : globalThis);
