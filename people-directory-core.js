/* LOWiSPIKE People directory, pure part (Oct 24, 2026).
   Emmanuel wants to browse everyone who is part of the app, also people who are offline and people he has not added:
   until now he only found extra people through Add a friend, the Community roster shows who is online, and the Friends
   Tree shows only added friends. The UI lives in people-directory.js; this file holds what tests can pin without a DOM:
   which people are listed (real humans only, never blocked ones, one row per account id, sorted by name), the name search,
   which picture URLs are allowed, and the EN/DE/ES words.
   Privacy: a row carries only the human name, the picture and the id. Never weight, glucose, level, XP: it is not a ranking.
   Presence (Oct 25 2026, Emmanuel's ask): only the live "here now" presence the Community header already shows (here()),
   never a profile field and never a last-seen time. Real-human filtering is not redone here: the UI
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
        friend: ['In your tree', 'In deinem Baum', 'En tu árbol'],
        onNow: ['Online right now', 'Gerade online', 'En línea ahora'],
        others: ['Everyone else', 'Alle anderen', 'Todos los demás'],
        you: ['You', 'Du', 'Tú'],
        onDot: ['online', 'online', 'en línea']
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
    /* Oct 25 2026 (Emmanuel: "When someone is online, it says '2 here now', but when I click, I don't see who ... maybe under
       'Online right now'"): who is here now, for BOTH the header count ("2 here now") and the People section, so the two always match.
       ids: the live presence ids (LowiRooms.members(), your own included). profiles: the raw profile list, only used to place an
       online account whose row is listed under another account of the same name (rows keep one account per name).
       rows: build() output (real humans only, blocked and you already out). opts.me: your id; opts.ok(profile) must be true for
       that fallback (not a bot, test, hidden, removed or blocked account). An id that matches no row never shows and never counts.
       Returns {me: you are here, rows: the others here (by name, one per row), count: rows + you}. */
    function here(ids, profiles, rows, opts) {
        opts = opts || {};
        const me = opts.me ? String(opts.me) : '';
        const ok = typeof opts.ok === 'function' ? opts.ok : () => false;
        const byUid = new Map(), byName = new Map(), prof = new Map();
        for (const r of rows || []) {
            if (!r || !r.uid) continue;
            byUid.set(String(r.uid), r);
            const k = fold(nameOf(r));
            if (k && !byName.has(k)) byName.set(k, r);
        }
        for (const p of profiles || []) if (p && typeof p === 'object' && p.uid) prof.set(String(p.uid), p);
        let meHere = false;
        const out = [], seen = new Set();
        for (const raw of ids || []) {
            const id = String(raw == null ? '' : raw).trim();
            if (!id) continue;
            if (me && id === me) { meHere = true; continue; }
            let r = byUid.get(id);
            if (!r) {
                const p = prof.get(id);
                let good = false;
                try { good = !!(p && ok(p)); } catch (e) { good = false; }
                if (!good) continue;
                r = byName.get(fold(nameOf(p)));
            }
            if (!r || seen.has(r.uid)) continue;
            seen.add(r.uid);
            out.push(r);
        }
        out.sort((a, b) => a.n.localeCompare(b.n, undefined, { sensitivity: 'base' }) || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
        return { me: meHere, rows: out, count: out.length + (meHere ? 1 : 0) };
    }
    const API = { T, LANGS, tr, build, match, safeImg, initials, nameOf, here };
    if (typeof module === 'object' && module.exports) module.exports = API;
    root.LowiPeopleDirCore = API;
})(typeof window !== 'undefined' ? window : globalThis);
