/* LOWiSPIKE owner tools UI (Oct 18, 2026). Rules live in owner-admin-core.js; the server enforces them
   (supabase/proposals/owner_admin_20261018.sql + supabase/functions/owner-delete-account).
   - Everyone: members the owner kicked are filtered out of LOWI_CLOUD.people(), so Community and the care board
     hide them (the server hides their profile too once the SQL has run).
   - Owner only (is_app_owner() said true): a "Members" card in Profile and an owner row on a member's sheet,
     with Kick (undo any time) and Delete account (type DELETE, permanent).
   Before the SQL exists nothing shows and nothing breaks: every call degrades to "not owner / nobody kicked". */
(function () {
    'use strict';
    const C = window.LowiOwnerAdminCore;
    if (!C || window.LowiOwnerAdmin) return;
    const ST = { owner: false, checkedFor: '', kicks: C.kickState([]), rows: null, busy: false, missing: false };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const TXT = {
        en: { card: 'Members', cardSub: 'Owner only: kick or remove accounts', open: 'Open', title: 'Members', intro: 'Only you see this. Kick hides someone from Community and the care board and stops them posting; you can undo it. Delete removes the account for good.',
            accounts: n => n === 1 ? '1 account' : n + ' accounts', test: 'test account', kicked: 'kicked', you: 'you', owner: 'owner', guests: n => n + ' guest', seen: 'last seen',
            kick: 'Kick', unkick: 'Let back in', del: 'Delete…', undo: 'Undo', undoLast: 'Undo last change', ownerRow: 'Owner only', kickOne: 'Kick from Community', delOne: 'Delete account…',
            kickedOne: 'Kicked from Community.', kickedN: n => 'Kicked ' + n + '.', backN: n => n + ' let back in.', nothing: 'Nothing changed.',
            confirmT: n => 'Delete ' + (n === 1 ? '1 account' : n + ' accounts') + ' for good?', confirmP: 'Their profile, messages, posts, photos and login are removed. This can’t be undone. Type DELETE to confirm.', confirmB: 'Delete for good', cancel: 'Cancel',
            deletedN: n => (n === 1 ? '1 account' : n + ' accounts') + ' deleted.', failedN: n => n + ' could not be deleted.',
            needSql: 'The owner tools aren’t set up in Supabase yet (step 1).', needFn: 'Deleting needs the owner-delete-account function in Supabase (step 2). Kick works without it.',
            notOwner: 'Only the app owner can do that.', offline: 'No connection. Try again.', failed: 'That didn’t work. Try again.', loading: 'Loading members…', empty: 'No members found.' },
        de: { card: 'Mitglieder', cardSub: 'Nur für dich: Konten rauswerfen oder löschen', open: 'Öffnen', title: 'Mitglieder', intro: 'Nur du siehst das. Rauswerfen versteckt jemanden in der Community und auf dem Pflege-Board und sperrt das Posten; du kannst es rückgängig machen. Löschen entfernt das Konto für immer.',
            accounts: n => n === 1 ? '1 Konto' : n + ' Konten', test: 'Testkonto', kicked: 'rausgeworfen', you: 'du', owner: 'Besitzer', guests: n => n + ' Gast', seen: 'zuletzt da',
            kick: 'Rauswerfen', unkick: 'Wieder reinlassen', del: 'Löschen…', undo: 'Rückgängig', undoLast: 'Letzte Änderung rückgängig', ownerRow: 'Nur für den Besitzer', kickOne: 'Aus der Community werfen', delOne: 'Konto löschen…',
            kickedOne: 'Aus der Community geworfen.', kickedN: n => n + ' rausgeworfen.', backN: n => n + ' wieder drin.', nothing: 'Nichts geändert.',
            confirmT: n => (n === 1 ? '1 Konto' : n + ' Konten') + ' für immer löschen?', confirmP: 'Profil, Nachrichten, Beiträge, Fotos und Login werden entfernt. Das lässt sich nicht rückgängig machen. Tippe DELETE zum Bestätigen.', confirmB: 'Für immer löschen', cancel: 'Abbrechen',
            deletedN: n => (n === 1 ? '1 Konto' : n + ' Konten') + ' gelöscht.', failedN: n => n + ' konnten nicht gelöscht werden.',
            needSql: 'Die Besitzer-Werkzeuge sind in Supabase noch nicht eingerichtet (Schritt 1).', needFn: 'Zum Löschen braucht es die Funktion owner-delete-account in Supabase (Schritt 2). Rauswerfen geht auch ohne.',
            notOwner: 'Das kann nur der Besitzer der App.', offline: 'Keine Verbindung. Versuch es nochmal.', failed: 'Das hat nicht geklappt. Versuch es nochmal.', loading: 'Mitglieder werden geladen…', empty: 'Keine Mitglieder gefunden.' },
        es: { card: 'Miembros', cardSub: 'Solo tú: expulsar o borrar cuentas', open: 'Abrir', title: 'Miembros', intro: 'Solo tú ves esto. Expulsar oculta a alguien de la Comunidad y del tablero de cuidado y le impide publicar; puedes deshacerlo. Borrar elimina la cuenta para siempre.',
            accounts: n => n === 1 ? '1 cuenta' : n + ' cuentas', test: 'cuenta de prueba', kicked: 'expulsado', you: 'tú', owner: 'dueño', guests: n => n + ' invitado', seen: 'visto',
            kick: 'Expulsar', unkick: 'Readmitir', del: 'Borrar…', undo: 'Deshacer', undoLast: 'Deshacer el último cambio', ownerRow: 'Solo el dueño', kickOne: 'Expulsar de la Comunidad', delOne: 'Borrar cuenta…',
            kickedOne: 'Expulsado de la Comunidad.', kickedN: n => n + ' expulsados.', backN: n => n + ' readmitidos.', nothing: 'No cambió nada.',
            confirmT: n => '¿Borrar ' + (n === 1 ? '1 cuenta' : n + ' cuentas') + ' para siempre?', confirmP: 'Se eliminan su perfil, mensajes, publicaciones, fotos y acceso. No se puede deshacer. Escribe DELETE para confirmar.', confirmB: 'Borrar para siempre', cancel: 'Cancelar',
            deletedN: n => (n === 1 ? '1 cuenta borrada' : n + ' cuentas borradas') + '.', failedN: n => n + ' no se pudieron borrar.',
            needSql: 'Las herramientas del dueño aún no están en Supabase (paso 1).', needFn: 'Para borrar hace falta la función owner-delete-account en Supabase (paso 2). Expulsar funciona sin ella.',
            notOwner: 'Solo el dueño de la app puede hacer eso.', offline: 'Sin conexión. Inténtalo de nuevo.', failed: 'No funcionó. Inténtalo de nuevo.', loading: 'Cargando miembros…', empty: 'No hay miembros.' }
    };
    const L = () => { const g = window.LowiLang && LowiLang.get && LowiLang.get(); return TXT[g] || TXT.en; };
    const toast = m => { try { if (window.LowiHost && LowiHost.toast) LowiHost.toast(m); } catch (e) { } };
    const R2 = () => window.LowiR2;
    const cloud = () => window.LOWI_CLOUD_X;
    const myId = () => { try { const s = cloud() && cloud().state(); return (s && s.uid) || ''; } catch (e) { return ''; } };
    async function client() {
        const x = cloud();
        if (!x || typeof navigator !== 'undefined' && navigator.onLine === false) return null;
        const s = x.state && x.state();
        if (!s || !s.uid || !s.live) return null;
        try { return await x.client(); } catch (e) { return null; }
    }
    function errText(kind, fn) { const t = L(); return kind === 'missing' ? (fn ? t.needFn : t.needSql) : kind === 'not-owner' ? t.notOwner : kind === 'offline' ? t.offline : t.failed; }

    /* ---------- everyone: hide kicked members ---------- */
    function wrapPeople(obj) {
        if (!obj || typeof obj.people !== 'function' || obj.people.__oa) return;
        const orig = obj.people;
        const w = function () { return C.filterPeople(orig.apply(this, arguments), ST.kicks.kicked); };
        w.__oa = true; obj.people = w;
    }
    async function loadKicks(sb) {
        try {
            const r = await sb.from('community_kicks').select('user_id').limit(2000);
            if (r.error) { ST.missing = C.classify(r.error) === 'missing'; return; }
            ST.missing = false;
            C.setKicked(ST.kicks, (r.data || []).map(x => x.user_id));
            ST.kicks.history = ST.kicks.history || [];
            changed();
        } catch (e) { }
    }
    function changed() { try { window.dispatchEvent(new CustomEvent('lowi:kicks', { detail: { count: ST.kicks.kicked.size } })); } catch (e) { } }

    /* ---------- owner check (server only) ---------- */
    async function check() {
        const id = myId();
        if (!id) { setOwner(false); return; }
        if (ST.checkedFor === id) return;
        const sb = await client();
        if (!sb) return;
        ST.checkedFor = id;
        await loadKicks(sb);
        let res = null;
        try { res = await sb.rpc('is_app_owner'); } catch (e) { res = { error: e }; }
        setOwner(C.ownerFromRpc(res));
    }
    function setOwner(v) {
        if (ST.owner === !!v) return;
        ST.owner = !!v; ST.rows = null;
        if (ST.owner) ST.kicks.history = [];
        paintSlot();
    }

    /* ---------- Profile card (owner only) ---------- */
    function cardInner() {
        const t = L();
        return '<div class="oa-card"><div><b>' + esc(t.card) + '</b><small>' + esc(t.cardSub) + '</small></div><button class="chip" data-oa="list">' + esc(t.open) + '</button></div>';
    }
    function paintSlot() { document.querySelectorAll('.oa-slot').forEach(el => { el.innerHTML = ST.owner ? cardInner() : ''; }); }
    function wrapCard() {
        const c = window.LOWI_CLOUD;
        if (!c || typeof c.cardHTML !== 'function' || c.cardHTML.__oa) return;
        const orig = c.cardHTML;
        /* the slot goes INSIDE #lcAcct: Profile files every block under a tile (Account here), and paintCard() rebuilds #lcAcct from this */
        const w = function () {
            const html = orig.apply(this, arguments), slot = '<div class="oa-slot">' + (ST.owner ? cardInner() : '') + '</div>';
            if (!html || html.indexOf('lcAcct') < 0) return html;
            try { const d = document.createElement('div'); d.innerHTML = html; const a = d.querySelector('#lcAcct'); if (!a) return html; a.insertAdjacentHTML('beforeend', slot); return d.innerHTML; } catch (e) { return html; }
        };
        w.__oa = true; c.cardHTML = w;
    }

    /* ---------- member sheet row (owner only) ---------- */
    function memberRow(uid) {
        const t = L(), k = C.isKicked(ST.kicks, uid);
        return '<div class="oa-mem" data-uid="' + esc(uid) + '"><small>' + esc(t.ownerRow) + '</small>' + (k
            ? '<span>' + esc(t.kickedOne) + '</span><button class="r2-btn ghost" data-oa="unkick" data-ids="' + esc(uid) + '">' + esc(t.unkick) + '</button>'
            : '<button class="r2-btn ghost" data-oa="kick" data-ids="' + esc(uid) + '">' + esc(t.kickOne) + '</button>') +
            '<button class="r2-btn ghost oa-danger" data-oa="del" data-ids="' + esc(uid) + '">' + esc(t.delOne) + '</button></div>';
    }
    function decorate(ov) {
        if (!ST.owner || !ov || !ov.querySelector) return;
        const acts = ov.querySelector('.r3-mpacts');
        if (!acts || acts.querySelector('[data-r3="edit"]')) return;
        const b = acts.querySelector('[data-uid]'), w = acts.querySelector('[data-who]');
        let uid = b && b.getAttribute('data-uid');
        if (!uid && w) {   /* no share button (no navigator.share): find the account by the name on the Message button */
            const n = String(w.getAttribute('data-who') || '').trim().toLowerCase();
            try { const p = (window.LOWI_CLOUD.people() || []).find(x => x && x.uid && String(x.n || '').trim().toLowerCase() === n); uid = p && p.uid; } catch (e) { }
        }
        const ok = C.canAct(ST.owner, myId(), { id: uid, isOwner: !!(ST.rows && ST.rows.some(r => r.id === uid && r.is_owner)) });
        if (!ok.ok) return;
        const d = document.createElement('div'); d.innerHTML = memberRow(uid);
        acts.parentNode.insertBefore(d.firstChild, acts.nextSibling);
    }
    function wrapSheet() {
        const r = R2();
        if (!r || typeof r.sheet !== 'function' || r.sheet.__oa) return;
        const orig = r.sheet;
        const w = function () { const ov = orig.apply(this, arguments); try { decorate(ov); } catch (e) { } return ov; };
        w.__oa = true; r.sheet = w;
    }
    function repaintMember() { document.querySelectorAll('.oa-mem').forEach(el => { const d = document.createElement('div'); d.innerHTML = memberRow(el.getAttribute('data-uid')); el.replaceWith(d.firstChild); }); }

    /* ---------- owner list ---------- */
    function testIds(rows) {
        const H = window.LowiHiddenAccounts, out = new Set();
        if (!H || typeof H.isHidden !== 'function') return out;
        (rows || []).forEach(r => { try { if (H.isHidden(r.id) || H.isHidden({ id: r.id, uid: r.id, n: r.name, name: r.name })) out.add(r.id); } catch (e) { } });
        return out;
    }
    const day = ms => { if (!ms) return ''; try { return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
    function listHTML() {
        const t = L(), me = myId();
        if (!ST.rows) return '<div class="oa-list"><h2>' + esc(t.title) + '</h2><p class="r2-p">' + esc(t.loading) + '</p></div>';
        const groups = C.groupMembers(ST.rows.map(r => Object.assign({}, r, { kicked: C.isKicked(ST.kicks, r.id) })), testIds(ST.rows));
        const rowsHTML = groups.map(g => {
            const mine = g.ids.indexOf(me) >= 0, act = C.actionable(ST.rows, g.ids, me);
            const bits = [t.accounts(g.count)];
            if (g.onTestList) bits.push(t.test);
            if (g.kicked) bits.push(t.kicked + (g.count > 1 ? ' ' + g.kicked + '/' + g.count : ''));
            if (g.last) bits.push(t.seen + ' ' + day(g.last));
            const tags = (mine ? ' <em>' + esc(t.you) + '</em>' : '') + (g.owner && !mine ? ' <em>' + esc(t.owner) + '</em>' : '');
            const ids = esc(act.join(','));
            const btns = act.length ? (g.allKicked || (g.kicked && g.kicked >= act.length)
                ? '<button class="chip" data-oa="unkick" data-ids="' + ids + '">' + esc(t.unkick) + '</button>'
                : '<button class="chip" data-oa="kick" data-ids="' + ids + '">' + esc(t.kick) + '</button>') +
                '<button class="chip oa-danger" data-oa="del" data-ids="' + ids + '">' + esc(t.del) + '</button>' : '';
            return '<div class="oa-row' + (g.onTestList ? ' test' : '') + (g.allKicked ? ' kicked' : '') + '"><div><b>' + esc(g.name) + tags + '</b><small>' + esc(bits.join(' · ')) + '</small></div><span class="oa-btns">' + btns + '</span></div>';
        }).join('');
        const undo = ST.kicks.history.length ? '<button class="r2-btn ghost" data-oa="undo">' + esc(t.undoLast) + '</button>' : '';
        return '<div class="oa-list"><h2>' + esc(t.title) + '</h2><p class="r2-p">' + esc(t.intro) + '</p>' + undo + (rowsHTML || '<p class="r2-p">' + esc(t.empty) + '</p>') + '</div>';
    }
    function repaintList() { document.querySelectorAll('.oa-ov .r2-shb').forEach(el => { el.innerHTML = listHTML(); }); }
    async function openList() {
        const r = R2(); if (!r || !ST.owner) return;
        r.sheet(listHTML(), { cls: 'oa-ov' });
        const sb = await client();
        if (!sb) { toast(L().offline); return; }
        let res; try { res = await sb.rpc('admin_members'); } catch (e) { res = { error: e }; }
        if (res.error) { toast(errText(C.classify(res.error))); return; }
        ST.rows = res.data || [];
        repaintList();
    }

    /* ---------- actions ---------- */
    async function rpc(name, ids) {
        const sb = await client();
        if (!sb) return { error: { message: 'offline' } };
        try { return await sb.rpc(name, { targets: ids }); } catch (e) { return { error: e }; }
    }
    async function kick(ids, back) {
        if (!ST.owner || ST.busy || !ids.length) return;
        ST.busy = true;
        const res = await rpc(back ? 'admin_unkick' : 'admin_kick', ids);
        ST.busy = false;
        if (res.error) { toast(errText(C.classify(res.error))); return; }
        const done = back ? C.applyUnkick(ST.kicks, ids) : C.applyKick(ST.kicks, ids);
        const t = L();
        toast(!done.length ? t.nothing : back ? t.backN(done.length) : done.length === 1 ? t.kickedOne : t.kickedN(done.length));
        changed(); repaintList(); repaintMember();
    }
    async function undoLast() {
        const last = ST.kicks.history[ST.kicks.history.length - 1], call = C.undoCall(last);
        if (!call || ST.busy) return;
        ST.busy = true;
        const res = await rpc(call.rpc, call.ids);
        ST.busy = false;
        if (res.error) { toast(errText(C.classify(res.error))); return; }
        C.undo(ST.kicks);
        toast(L().undo + ' ✓'); changed(); repaintList(); repaintMember();
    }
    function confirmDelete(ids) {
        const r = R2(), t = L(); if (!r || !ST.owner || !ids.length) return;
        r.sheet('<div class="oa-confirm"><h2>' + esc(t.confirmT(ids.length)) + '</h2><p class="r2-p">' + esc(t.confirmP) + '</p>' +
            '<input class="oa-type" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="DELETE" aria-label="DELETE">' +
            '<button class="r2-btn pri oa-danger" data-oa="delgo" data-ids="' + esc(ids.join(',')) + '" disabled>' + esc(t.confirmB) + '</button>' +
            '<button class="r2-btn ghost" data-oa="close">' + esc(t.cancel) + '</button></div>', { cls: 'oa-ov2' });
    }
    async function doDelete(ids, ov) {
        if (!ST.owner || ST.busy) return;
        const sb = await client(); const t = L();
        if (!sb) { toast(t.offline); return; }
        ST.busy = true;
        let gone = [], bad = 0, stop = '';
        for (const part of C.batches(ids)) {
            let res; try { res = await sb.functions.invoke('owner-delete-account', { body: { ids: part, confirm: C.CONFIRM } }); } catch (e) { res = { error: e }; }
            if (res.error) { let msg = ''; try { msg = res.error.context && res.error.context.json ? (await res.error.context.json()).error : ''; } catch (e) { }
                stop = C.classify({ message: (msg || '') + ' ' + (res.error.message || ''), context: res.error.context }); break; }
            gone = gone.concat((res.data && res.data.deleted) || []); bad += ((res.data && res.data.failed) || []).length;
        }
        ST.busy = false;
        if (gone.length) { const g = new Set(gone); ST.rows = (ST.rows || []).filter(r => !g.has(r.id)); gone.forEach(id => ST.kicks.kicked.delete(id)); }
        if (stop && !gone.length) { toast(errText(stop, true)); return; }
        toast(t.deletedN(gone.length) + (bad ? ' ' + t.failedN(bad) : '') + (stop ? ' ' + errText(stop, true) : ''));
        try { if (ov) R2().close(ov); } catch (e) { }
        document.querySelectorAll('.oa-mem').forEach(el => { if (gone.indexOf(el.getAttribute('data-uid')) >= 0) { const o = el.closest('.r2-ov'); if (o) R2().close(o); } });
        changed(); repaintList();
    }

    document.addEventListener('input', e => {
        const i = e.target && e.target.closest && e.target.closest('.oa-type'); if (!i) return;
        const b = i.parentNode.querySelector('[data-oa="delgo"]'); if (b) b.disabled = !C.confirmOk(i.value);
    });
    document.addEventListener('click', e => {
        const b = e.target && e.target.closest && e.target.closest('[data-oa]'); if (!b) return;
        const a = b.getAttribute('data-oa'), ids = (b.getAttribute('data-ids') || '').split(',').filter(C.isId);
        if (a === 'list') { e.preventDefault(); openList(); return; }
        if (!ST.owner) return;
        e.preventDefault(); e.stopPropagation();
        if (a === 'kick') kick(ids, false);
        else if (a === 'unkick') kick(ids, true);
        else if (a === 'undo') undoLast();
        else if (a === 'del') confirmDelete(C.actionable(ST.rows || [], ids, myId()));
        else if (a === 'delgo') { const i = b.parentNode.querySelector('.oa-type'); if (i && C.confirmOk(i.value)) doDelete(ids, b.closest('.r2-ov')); }
        else if (a === 'close') { const o = b.closest('.r2-ov'); if (o) R2().close(o); }
    }, true);

    const css = document.createElement('style');
    css.textContent = '.oa-card{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0;padding:14px 16px;border-radius:20px;background:rgba(120,170,255,.14);border:1px solid rgba(160,200,255,.32);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}' +
        '.oa-card small,.oa-row small{display:block;opacity:.72;font-size:12px;margin-top:2px}' +
        '.oa-list h2,.oa-confirm h2{margin:4px 0 6px}.oa-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 2px;border-top:1px solid rgba(255,255,255,.12)}' +
        '.oa-row.test b{color:#ffb86b}.oa-row.kicked{opacity:.6}.oa-row em,.oa-list em{font-style:normal;font-size:11px;opacity:.7;margin-left:4px}' +
        '.oa-btns{display:flex;gap:6px;flex-shrink:0}.oa-btns .chip{min-height:36px}.oa-danger{color:#ff6b6b!important}' +
        '.oa-mem{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:12px 0 0;padding:10px 12px;border-radius:16px;background:rgba(255,107,107,.08);border:1px dashed rgba(255,140,140,.4)}.oa-mem small{width:100%;opacity:.7}' +
        '.oa-type{width:100%;box-sizing:border-box;margin:10px 0;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.2);color:inherit;font-size:17px;letter-spacing:2px}' +
        '.oa-confirm .r2-btn{width:100%;margin-top:8px}.oa-confirm [disabled]{opacity:.4}';
    document.head.appendChild(css);

    function hook() { wrapPeople(window.LOWI_CLOUD); wrapPeople(window.LOWI_CLOUD_X); wrapCard(); wrapSheet(); }
    let tries = 0;
    function tick() { hook(); check().catch(() => { }); if (++tries < 60) setTimeout(tick, tries < 10 ? 2000 : 8000); }
    document.addEventListener('lowi:chat', () => { if (myId() !== ST.checkedFor) check().catch(() => { }); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && myId() !== ST.checkedFor) check().catch(() => { }); });
    window.LowiOwnerAdmin = { isOwner: () => ST.owner, isKicked: id => C.isKicked(ST.kicks, id), kickedCount: () => ST.kicks.kicked.size, open: openList, _st: ST };
    tick();
})();
