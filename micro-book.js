/* LOWiSPIKE adventure log and friend care (UI). Logic lives in micro-book-core.js.
   (The microbe collection and its herb world chip were removed Oct 16 with the microbe buddies, user decision.)
   - Book: "Adventure log" sheet with two tabs: Journeys, Friends (opened from the Home journey line, data-mb="log").
   - Journeys: when a body journey ends (ledger eventId body-trip:* or the lowi:body-trip-done event) one card opens
     ("3. Reise geschafft! Deine Zelle hat heute ... entdeckt.") and Home shows the line for the rest of the day.
   - Care: tap a friend (Freunde tab, or any [data-care-uid] / [data-friend-uid] node the friends tree renders) to send
     something kind. Delivered through the reactions table when signed in; otherwise it waits on this phone and goes out
     once the cloud is live. Incoming care from friends shows as a heart bubble on their cell.
   State: S.adventures {log, seen}, S.care {sent, out, seen, inbox} (account data). Care is free since Oct 19 (no sparks:
   no counter, no cost, no "not enough" block; the old S.care.spent is dropped on read). */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    if (W.LowiMicroBook || !W.LowiMicroCore) return;
    const C = W.LowiMicroCore;
    const lang = () => { try { return (W.LowiLang.get() || H.lang || 'de').slice(0, 2); } catch (e) { return (H.lang || 'de').slice(0, 2); } };
    const L = () => ({ en: 0, de: 1, es: 2 }[lang()] ?? 1);
    const P = a => C.pick(a, L());
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const T = (en, de, es) => [en, de, es];
    const copy = {
        over: T('BODY UNIVERSE', 'KÖRPER-UNIVERSUM', 'UNIVERSO DEL CUERPO'),
        tTrip: T('Journeys', 'Reisen', 'Viajes'), tFr: T('Friends', 'Freunde', 'Amigos'),
        close: T('Close', 'Schließen', 'Cerrar'),
        trips: T('{n} journeys completed', '{n} Reisen geschafft', '{n} viajes completados'), trip1: T('1 journey completed', '1 Reise geschafft', '1 viaje completado'),
        noTrips: T('No body journey finished yet. When your cell comes back from one, it lands here with what it discovered.', 'Noch keine Körperreise beendet. Wenn deine Zelle von einer zurückkommt, steht hier, was sie entdeckt hat.', 'Aún no has terminado ningún viaje. Cuando tu célula vuelva de uno, aquí verás lo que descubrió.'),
        today: T('Today', 'Heute', 'Hoy'), great: T('Great', 'Super', 'Genial'), logBtn: T('Adventure log', 'Reisetagebuch', 'Diario de viajes'),
        fIntro: T('Send your friends something kind. It’s free: each kind of message once a day per friend.', 'Schick deinen Freunden etwas Liebes. Es kostet nichts: jede Art einmal am Tag pro Freund.', 'Envía algo bonito a tus amigos. Es gratis: cada tipo una vez al día por amigo.'),
        noFr: T('No friends here yet. Friends join through your friends tree with your invite link, only real people.', 'Noch keine Freunde hier. Freunde kommen über deinen Freundesbaum mit deinem Einladungslink dazu, nur echte Menschen.', 'Aún no hay amigos. Se unen desde tu árbol de amigos con tu enlace de invitación, solo personas reales.'),
        tree: T('Open friends tree', 'Freundesbaum öffnen', 'Abrir árbol de amigos'),
        sendKind: T('Send something kind', 'Etwas Liebes senden', 'Enviar algo bonito'),
        send: T('Send', 'Senden', 'Enviar'), sent: T('Sent', 'Gesendet', 'Enviado'),
        lockLv: T('from level {n}', 'ab Level {n}', 'desde nivel {n}'), from: T('from {h}:00', 'ab {h} Uhr', 'desde las {h}:00'), until: T('until {h}:00', 'bis {h} Uhr', 'hasta las {h}:00'),
        live: T('Arrives with {n} right away.', 'Kommt sofort bei {n} an.', 'Le llega a {n} enseguida.'),
        wait: T('You’re offline or not signed in: it waits on this phone and goes out as soon as you are.', 'Du bist offline oder nicht angemeldet: Es wartet auf diesem Handy und geht raus, sobald du es bist.', 'Estás sin conexión o sin sesión: espera en este móvil y se envía en cuanto la tengas.'),
        sentTo: T('{k} sent to {n}', '{k} an {n} gesendet', '{k} enviado a {n}'), queued: T('{k} for {n} is waiting to go out', '{k} für {n} wartet aufs Senden', '{k} para {n} espera para enviarse'),
        gotToday: T('sent you something today', 'hat dir heute etwas geschickt', 'te envió algo hoy'),
        you: T('You', 'Du', 'Tú')
    };
    const tr = (k, vars) => { let s = P(copy[k] || [k]); for (const v in (vars || {})) s = s.split('{' + v + '}').join(vars[v]); return s; };

    /* ---------- state ---------- */
    const B = () => W.LowiVitalsBridge;
    const S = () => { try { return B().state() || {}; } catch (e) { return {}; } };
    const save = () => { try { B().save(); } catch (e) {} };
    const obj = (s, k, d) => { if (!s[k] || typeof s[k] !== 'object') s[k] = d; for (const x in d) if (s[k][x] == null) s[k][x] = d[x]; return s[k]; };
    const adv = () => obj(S(), 'adventures', { log: [], seen: {} });
    const care = () => { const c = obj(S(), 'care', { sent: {}, out: [], seen: {}, inbox: {} }); if ('spent' in c) delete c.spent; return c; };
    const ledger = () => S().ledger || [];
    const trips = () => C.journeys(ledger(), adv().log);
    const level = () => { try { return W.LowiHost.level() || 1; } catch (e) { return 1; } };
    const myName = () => { try { return W.LowiHost.user().name || ''; } catch (e) { return ''; } };
    const myUid = () => { try { return W.LOWI_CLOUD.uid() || ''; } catch (e) { return ''; } };
    const cloudLive = () => { try { return !!(W.LOWI_CLOUD && W.LOWI_CLOUD.live() && W.LOWI_CLOUD_X && W.LOWI_CLOUD_X.client && myUid()); } catch (e) { return false; } };
    function friends() {
        /* one friend source: the friends tree's own list (same uids) when it is loaded */
        try { if (W.LowiCellRoom && W.LowiCellRoom.friends) return W.LowiCellRoom.friends().filter(f => f && C.okUid(f.uid) && f.n).map(f => ({ uid: f.uid, n: String(f.n).slice(0, 24), c: String(f.c || '').slice(0, 24) })); } catch (e) {}
        let raw = null;
        try { const s = S(); if (s.friends && Array.isArray(s.friends.list)) raw = s.friends; } catch (e) {}
        if (!raw) { try { raw = JSON.parse(localStorage.getItem('lowispike.friends.v1') || 'null'); } catch (e) { raw = null; } }
        const RC = W.LowiCellRoomCore;
        if (RC && RC.cleanFriends) return RC.cleanFriends(raw).list;
        return (raw && Array.isArray(raw.list) ? raw.list : []).filter(f => f && C.okUid(f.uid) && f.n).slice(0, 12).map(f => ({ uid: f.uid, n: String(f.n).slice(0, 24), c: String(f.c || '').slice(0, 24) }));
    }
    const vibes = () => { try { return JSON.parse(localStorage.getItem('lowispike.vibes.v1') || '{}') || {}; } catch (e) { return {}; } };
    const hueOf = uid => { const RC = W.LowiCellRoomCore; if (RC && RC.hue) return RC.hue(uid); let h = 7; for (const c of String(uid)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; };

    /* ---------- drawings ---------- */
    const SHAPES = {
        hex: '<polygon class="g" points="32,18 44,25 44,39 32,46 20,39 20,25"/><polygon class="g2" points="32,25 38,28.5 38,35.5 32,39 26,35.5 26,28.5"/>',
        disc: '<ellipse class="g" cx="32" cy="32" rx="16" ry="12"/><ellipse class="g2" cx="32" cy="32" rx="8" ry="5"/>',
        bean: '<ellipse class="g" cx="32" cy="32" rx="17" ry="10" transform="rotate(-20 32 32)"/><path class="l" d="M19 37c3-6 5 4 8-2s5 4 8-2 5 4 8-2" transform="rotate(-20 32 32)"/>',
        finger: '<path class="g" d="M18 46V30a4 4 0 0 1 8 0v16zM28 46V22a4 4 0 0 1 8 0v24zM38 46V28a4 4 0 0 1 8 0v18z"/>',
        rod: '<rect class="g" x="17" y="26" width="30" height="12" rx="6" transform="rotate(-25 32 32)"/><rect class="g2" x="22" y="40" width="14" height="6" rx="3"/>',
        island: '<circle class="g" cx="32" cy="32" r="7"/><circle class="g2" cx="21" cy="27" r="5"/><circle class="g2" cx="43" cy="27" r="5"/><circle class="g2" cx="25" cy="42" r="5"/><circle class="g2" cx="40" cy="42" r="5"/>',
        tri: '<path class="g" d="M32 17c2 0 3 1 4 3l10 19c1 3 0 5-3 5H21c-3 0-4-2-3-5l10-19c1-2 2-3 4-3z"/><circle class="g2" cx="32" cy="35" r="4"/>',
        gate: '<path class="g" d="M19 46V30a13 13 0 0 1 26 0v16h-7V31a6 6 0 0 0-12 0v15z"/>',
        chain: '<circle class="g" cx="18" cy="38" r="5"/><circle class="g2" cx="27" cy="30" r="5"/><circle class="g" cx="37" cy="30" r="5"/><circle class="g2" cx="46" cy="38" r="5"/>',
        cup: '<path class="g" d="M20 20h24c0 10-5 16-9 18v6h4v3H25v-3h4v-6c-4-2-9-8-9-18z"/><circle class="g2" cx="32" cy="27" r="3.5"/>',
        hexcell: '<polygon class="g" points="32,16 46,24 46,40 32,48 18,40 18,24"/><circle class="g2" cx="32" cy="32" r="6"/>',
        star: '<path class="l" d="M32 32L16 20M32 32l17-11M32 32l-15 13M32 32l14 14M32 32v-17"/><circle class="g" cx="32" cy="32" r="8"/>',
        blob: '<path class="g" d="M33 16c8 0 15 6 14 14 3 6-1 14-9 16-6 3-14 1-18-5-5-5-4-14 1-19 3-4 7-6 12-6z"/><circle class="g2" cx="28" cy="30" r="4"/><circle class="g2" cx="36" cy="35" r="4"/>',
        spark: '<path class="g" d="M32 14l4 14 14 4-14 4-4 14-4-14-14-4 14-4z"/>',
        grape: '<circle class="g" cx="32" cy="32" r="14"/><circle class="g2" cx="27" cy="28" r="3"/><circle class="g2" cx="37" cy="29" r="3"/><circle class="g2" cx="31" cy="37" r="3"/><circle class="g2" cx="39" cy="37" r="2.4"/>',
        drop: '<path class="g" d="M32 15c6 9 12 15 12 22a12 12 0 0 1-24 0c0-7 6-13 12-22z"/><circle class="g2" cx="28" cy="37" r="3"/>',
        cluster: '<circle class="g" cx="26" cy="28" r="7"/><circle class="g" cx="38" cy="27" r="7"/><circle class="g" cx="32" cy="39" r="7"/><path class="l" d="M32 46v4"/>',
        heart: '<path class="g" d="M32 46s-14-8-14-18a7 7 0 0 1 14-3 7 7 0 0 1 14 3c0 10-14 18-14 18z"/>'
    };
    function cellSvg(shape, hue, sil, cls) {
        return '<svg class="mb-cell' + (sil ? ' sil' : '') + (cls ? ' ' + cls : '') + '" viewBox="0 0 64 64" aria-hidden="true" style="--h:' + (+hue || 0) + '"><circle class="m" cx="32" cy="32" r="27"/>' + (SHAPES[shape] || SHAPES.blob) + '<ellipse class="hl" cx="23" cy="18" rx="8" ry="4" transform="rotate(-28 23 18)"/>' + (sil ? '<text x="32" y="38" text-anchor="middle">?</text>' : '') + '</svg>';
    }
    const cellIco = () => '<svg class="mb-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="10" cy="10.5" r="3" fill="currentColor" opacity=".85"/><circle cx="15.5" cy="14.5" r="1.6" fill="currentColor" opacity=".6"/><circle cx="14.5" cy="8" r="1" fill="currentColor" opacity=".5"/></svg>';
    const heartIco = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.2 5 6.6 5c2 0 3.5 1.1 4.4 2.5h2C13.9 6.1 15.4 5 17.4 5c3.4 0 5.4 3.6 4.1 6.8C19.5 16.4 12 21 12 21z"/></svg>';
    const pin = '<svg class="mb-pin" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M12 21s-6-5.7-6-11a6 6 0 0 1 12 0c0 5.3-6 11-6 11z"/><circle cx="12" cy="10" r="2.2" fill="currentColor"/></svg>';
    const lock = '<svg class="mb-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

    /* ---------- book sheet ---------- */
    const R = () => W.LowiR2;
    let ov = null, tab = 'trip';
    function tripHTML() {
        const list = trips(), today = C.dayKey(Date.now());
        if (!list.length) return '<div class="mb-empty">' + cellSvg('cluster', 186, true) + '<p>' + esc(tr('noTrips')) + '</p></div>';
        const fmt = d => { try { return new Date(d + 'T12:00').toLocaleDateString(lang() === 'en' ? 'en-GB' : lang(), { day: 'numeric', month: 'short' }); } catch (e) { return d; } };
        return '<p class="mb-count num">' + esc(list.length === 1 ? tr('trip1') : tr('trips', { n: list.length })) + '</p><ol class="mb-log">' + list.slice().reverse().slice(0, 60).map(j =>
            '<li><span class="mb-jno num">' + j.no + '</span><div><b>' + esc(P(j.place.name)) + '</b><span>' + esc(C.journeyLine(j, L(), false)) + '</span></div><small class="num">' + esc(j.day === today ? tr('today') : fmt(j.day)) + '</small></li>').join('') + '</ol>';
    }
    function friendRow(f) {
        const inbox = care().inbox[f.uid], today = C.dayKey(Date.now()), hearts = inbox && inbox.day === today ? inbox.kinds.length : 0;
        return '<li><button type="button" class="mb-fr" data-mb="care" data-uid="' + esc(f.uid) + '"><span class="mb-fc">' + cellSvg('blob', hueOf(f.uid), false) + (hearts ? '<i class="mb-heart" aria-hidden="true">' + heartIco + (hearts > 1 ? '<b>' + hearts + '</b>' : '') + '</i>' : '') + '</span><span class="mb-fn"><b>' + esc(f.n) + '</b><small>' + esc(hearts ? tr('gotToday') : (f.c || '')) + '</small></span><span class="mb-go">' + esc(tr('sendKind')) + '</span></button></li>';
    }
    function frHTML() {
        const list = friends();
        const tree = W.LowiCellRoom && W.LowiCellRoom.openTree ? '<button type="button" class="mb-cta ghost" data-mb="tree">' + esc(tr('tree')) + '</button>' : '';
        return '<p class="mb-intro">' + esc(tr('fIntro')) + '</p>' +
            (list.length ? '<ul class="mb-frs">' + list.map(friendRow).join('') + '</ul>' : '<div class="mb-empty">' + cellSvg('blob', 200, true) + '<p>' + esc(tr('noFr')) + '</p>' + tree + '</div>');
    }
    function bookHTML() {
        const n = trips().length;
        const tabs = [['trip', tr('tTrip') + (n ? ' · ' + n : '')], ['fr', tr('tFr')]];
        return '<div class="mb-sheet" data-noi18n><div class="mb-over">' + esc(tr('over')) + '</div><h2>' + esc(tr('logBtn')) + '</h2>' +
            '<div class="mb-tabs" role="tablist">' + tabs.map(t => '<button type="button" role="tab" class="mb-tab' + (t[0] === tab ? ' on' : '') + '" aria-selected="' + (t[0] === tab) + '" data-mb="tab" data-t="' + t[0] + '">' + esc(t[1]) + '</button>').join('') + '</div>' +
            '<div class="mb-pane" data-t="' + tab + '">' + (tab === 'fr' ? frHTML() : tripHTML()) + '</div></div>';
    }
    function paint() { if (!ov || !ov.isConnected) { ov = null; return; } const box = ov.querySelector('.mb-sheet'); if (box) box.outerHTML = bookHTML(); }
    function open(t) {
        if (!R() || !R().sheet) return null;
        tab = t === 'fr' ? 'fr' : 'trip';
        if (ov && ov.isConnected) { paint(); return ov; }
        ov = R().sheet(bookHTML(), { cls: 'mb-ov' });
        return ov;
    }

    /* ---------- care sheet ---------- */
    let cov = null, cf = null, ck = '';
    function careCtx() { const now = new Date(); return { day: C.dayKey(now.getTime()), level: level(), hour: now.getHours() }; }
    function careHTML() {
        const f = cf, ctx = careCtx(), st = care();
        const states = C.CARE.map(k => ({ k, r: C.canCare(st, f, k, ctx) }));
        if (!ck || !states.some(s => s.k.id === ck)) { const first = states.find(s => s.r.ok) || states.find(s => s.r.why !== 'locked' && s.r.why !== 'time') || states[0]; ck = first.k.id; }
        const cur = states.find(s => s.k.id === ck), live = cloudLive();
        const why = s => s.r.why === 'sent' ? '✓ ' + tr('sent') : s.r.why === 'locked' ? tr('lockLv', { n: s.k.lv }) : s.r.why === 'time' ? (s.k.id === 'night' ? tr('from', { h: s.k.from }) : tr('until', { h: s.k.to })) : '';
        const btn = cur.r.ok ? '<button type="button" class="mb-cta" data-mb="send">' + esc(tr('send')) + '</button>' : '<button type="button" class="mb-cta" disabled>' + esc(cur.r.why === 'sent' ? tr('sent') : tr('send')) + '</button>';
        return '<div class="mb-sheet mb-care" data-noi18n><div class="mb-over">' + esc(tr('tFr').toUpperCase()) + '</div><h2>' + esc(f.n) + '</h2>' +
            '<div class="mb-duo"><div class="mb-me">' + cellSvg('blob', 160, false, reduced() ? '' : 'live') + '<small>' + esc(tr('you')) + '</small></div><p class="mb-say" role="status" aria-live="polite">' + esc(P(cur.k.say).replace('{n}', f.n)) + '</p><div class="mb-them">' + cellSvg('blob', hueOf(f.uid), false) + '<small>' + esc(f.n) + '</small></div></div>' +
            '<div class="mb-kinds" role="radiogroup">' + states.map(s => '<button type="button" role="radio" aria-checked="' + (s.k.id === ck) + '" class="mb-kind' + (s.k.id === ck ? ' act' : '') + (s.r.ok ? '' : ' off ' + s.r.why) + '" data-mb="kind" data-k="' + s.k.id + '"><span class="mb-ke">' + (s.r.why === 'locked' ? lock : s.k.e) + '</span><b>' + esc(P(s.k.n)) + '</b>' + (s.r.ok ? '' : '<small class="num">' + esc(why(s)) + '</small>') + '</button>').join('') + '</div>' +
            btn + '<p class="mb-note">' + esc(live ? tr('live', { n: f.n }) : tr('wait')) + '</p></div>';
    }
    function cpaint() { if (!cov || !cov.isConnected) { cov = null; return; } const box = cov.querySelector('.mb-care'); if (box) box.outerHTML = careHTML(); }
    const treeUp = () => { try { return !!(W.LowiCellRoom && W.LowiCellRoom.isOpen && W.LowiCellRoom.isOpen()); } catch (e) { return false; } };
    function openCare(uid, opts) {
        opts = opts || {};
        const id = uid && uid.uid || uid;
        let f = friends().find(x => x.uid === id);
        /* name + uid passed in (friends tree) when the list has not caught up yet */
        if (!f && uid && typeof uid === 'object' && C.okUid(uid.uid) && uid.n) f = { uid: uid.uid, n: String(uid.n).slice(0, 24), c: String(uid.c || '').slice(0, 24) };
        if (!f || !R() || !R().sheet) return null;
        if (cov && cov.isConnected && R().close) R().close(cov);
        cf = f; ck = '';
        /* above the friends tree overlay (z 99990) while it is open */
        const me = cov = R().sheet(careHTML(), { cls: 'mb-ov' + (treeUp() || opts.top ? ' mb-ov-top' : ''), onClose: () => { if (cov === me) cov = null; badges(); try { opts.onClose && opts.onClose(f.uid); } catch (e) {} try { W.dispatchEvent(new CustomEvent('lowi:care-close', { detail: { uid: f.uid } })); } catch (e) {} } });
        return cov;
    }
    function sendCare() {
        const ctx = careCtx(), st = care(), k = C.CARE.find(x => x.id === ck), r = C.canCare(st, cf, k, ctx);
        if (!r.ok) { cpaint(); return false; }
        st.sent[r.id] = Date.now();
        st.out.push({ id: r.id, e: k.e, ts: Date.now() });
        save();
        const live = cloudLive();
        flush();
        toast((live ? tr('sentTo') : tr('queued')).replace('{k}', P(k.n)).replace('{n}', cf.n));
        if (!reduced() && cov) { const b = cov.querySelector('.mb-them'); if (b) { const h = D.createElement('i'); h.className = 'mb-fly'; h.innerHTML = heartIco; b.appendChild(h); setTimeout(() => h.remove(), 1100); } }
        setTimeout(cpaint, reduced() ? 0 : 650);
        badges();
        try { W.dispatchEvent(new CustomEvent('lowi:care-sent', { detail: { kind: k.id, to: cf.uid } })); } catch (e) {}
        return true;
    }
    let flushing = false;
    async function flush() {
        const st = care();
        if (flushing || !st.out.length || !cloudLive()) return;
        flushing = true;
        try {
            const sb = W.LOWI_CLOUD_X.client(), left = [];
            for (const o of st.out.slice()) {
                if (!C.parseCare(o.id) || Date.now() - (+o.ts || 0) > 3 * 864e5) continue;
                try { const res = await sb.from('reactions').insert({ message_id: o.id, who: myName() || 'Member', emoji: o.e || '\u2764' }); if (res && res.error) left.push(o); } catch (e) { left.push(o); }
            }
            st.out = left; save();
        } catch (e) {} finally { flushing = false; }
    }
    async function poll() {
        try {
            const v = vibes();
            if (v.recv === false || !cloudLive() || D.hidden) return;
            const uid = myUid(), fr = friends();
            if (!fr.length) return;
            const r = await W.LOWI_CLOUD_X.client().from('reactions').select('message_id,user_id,who').like('message_id', 'care:' + uid + ':%').limit(200);
            if (!r || r.error || !r.data) return;
            const st = care(), inc = C.incoming(r.data, uid, fr, v.blocked || {}, st.seen);
            if (!inc.length) return;
            const today = C.dayKey(Date.now());
            inc.forEach(x => {
                st.seen[x.id] = 1;
                if (x.day !== today) return;
                const b = st.inbox[x.from] && st.inbox[x.from].day === today ? st.inbox[x.from] : { day: today, kinds: [] };
                if (!b.kinds.includes(x.kind)) b.kinds.push(x.kind);
                b.n = x.who; b.ts = Date.now(); st.inbox[x.from] = b;
            });
            save();
            const quiet = W.LowiExtrasCore && W.LowiExtrasCore.isQuiet && W.LowiExtrasCore.isQuiet(new Date(), v.quiet || { on: true, from: '22:00', to: '08:00' });
            const fresh = inc.filter(x => x.day === today);
            if (fresh.length && !quiet) { const k = C.CARE.find(c => c.id === fresh[0].kind); toast(P(k.got).replace('{w}', fresh[0].who) + (fresh.length > 1 ? ' +' + (fresh.length - 1) : '')); }
            badges(); paint();
        } catch (e) {}
    }
    /* heart bubbles on friend nodes the friends tree renders: care they sent you today, or care you sent them today */
    const sentToday = (st, uid, today) => Object.keys(st.sent || {}).some(id => { const c = C.parseCare(id); return c && c.to === uid && c.day === today; });
    function badges() {
        const st = care(), today = C.dayKey(Date.now());
        D.querySelectorAll('[data-care-uid],[data-friend-uid]').forEach(n => {
            const uid = n.getAttribute('data-care-uid') || n.getAttribute('data-friend-uid'), b = st.inbox[uid], got = b && b.day === today && b.kinds.length, out = !got && sentToday(st, uid, today);
            let h = n.querySelector(':scope > .mb-heart');
            if (!got && !out) { if (h) h.remove(); return; }
            if (!h) { h = D.createElement('i'); h.setAttribute('aria-hidden', 'true'); n.appendChild(h); if (getComputedStyle(n).position === 'static') n.style.position = 'relative'; }
            h.className = 'mb-heart' + (out ? ' mb-sent' : '');
            const html = heartIco + (got && b.kinds.length > 1 ? '<b>' + b.kinds.length + '</b>' : '');
            if (h.innerHTML !== html) h.innerHTML = html;
        });
    }

    /* ---------- toasts ---------- */
    let tq = [], tbusy = false;
    function toast(msg) { tq.push(msg); if (!tbusy) nextToast(); }
    function nextToast() {
        const msg = tq.shift();
        if (!msg) { tbusy = false; return; }
        tbusy = true;
        let el = D.getElementById('mbToast');
        if (!el) { el = D.createElement('div'); el.id = 'mbToast'; el.className = 'mb-toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); D.body.appendChild(el); }
        el.innerHTML = cellIco() + '<span>' + esc(msg) + '</span>';
        el.classList.toggle('mb-top', treeUp());
        el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
        setTimeout(() => { el.classList.remove('on'); setTimeout(nextToast, 260); }, W.LowiReadTime ? W.LowiReadTime.atLeast(msg, 2600, { kind: 'toast' }) : 2600); /* reading time */
    }


    /* ---------- journeys ---------- */
    function logTrip(t) {
        if (!t || !t.id) return null;
        const a = adv(), id = /^body-trip:/.test(t.id) ? t.id : 'body-trip:' + t.id;
        const clean = s => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').slice(0, 90);
        if (!a.log.some(x => x.id === id)) { a.log.push({ id, place: clean(t.place || t.key || ''), saw: t.saw ? clean(t.saw) : '', name: t.name ? clean(t.name) : '', ts: +t.ts || Date.now(), day: C.dayKey(+t.ts || Date.now()) }); if (a.log.length > 400) a.log = a.log.slice(-400); save(); }
        setTimeout(tripCheck, 900);
        return id;
    }
    function modalUp() {
        return [...D.querySelectorAll('[aria-modal="true"]')].some(el => { if (!el.getClientRects().length) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && +cs.opacity > 0.05 && cs.display !== 'none'; });
    }
    function tripCheck() {
        const a = adv(), list = trips(), now = Date.now();
        homeRow();
        const fresh = list.filter(j => !a.seen[j.id] && now - j.ts < 864e5);
        if (!fresh.length || D.hidden) return;
        if ((R() && R().top && R().top()) || modalUp() || D.getElementById('lcUpd')) return;
        if (W.LowiSpirit && W.LowiSpirit.isOpen && W.LowiSpirit.isOpen()) return;
        const j = fresh[fresh.length - 1];
        fresh.forEach(x => { a.seen[x.id] = 1; }); save();
        if (R() && R().sheet) R().sheet('<div class="mb-sheet mb-done" data-noi18n><div class="mb-over">' + esc(tr('over')) + '</div>' + cellSvg('cluster', 186, false, 'big' + (reduced() ? '' : ' live')) +
            '<h2>' + esc(C.journeyTitle(j, L())) + '</h2><p class="mb-say">' + esc(C.journeyLine(j, L(), true)) + '</p><div class="mb-row2"><button type="button" class="mb-cta ghost" data-mb="log">' + esc(tr('logBtn')) + '</button><button type="button" class="mb-cta" data-mb="x">' + esc(tr('great')) + '</button></div></div>', { cls: 'mb-ov' });
    }
    let row = null;
    function homeRow() {
        const home = D.getElementById('spHome'), log = home && home.querySelector('.sp-log');
        const list = trips(), j = list[list.length - 1], today = C.dayKey(Date.now());
        if (!log || !j || j.day !== today) { if (row && row.isConnected) row.remove(); return; }
        if (!row) { row = D.createElement('button'); row.type = 'button'; row.id = 'mbAdv'; row.className = 'mb-adv'; row.dataset.mb = 'log'; row.setAttribute('data-noi18n', ''); }
        const html = pin + '<span class="mb-an num">' + esc(C.journeyTitle(j, L())) + '</span><span class="mb-at">' + esc(C.journeyLine(j, L(), true)) + '</span>';
        if (row.dataset.sig !== j.id + lang()) { row.innerHTML = html; row.dataset.sig = j.id + lang(); row.setAttribute('aria-label', C.journeyTitle(j, L()) + ' ' + C.journeyLine(j, L(), true)); }
        const anchor = log.querySelector('#btBar') || log.querySelector('#lsSun');
        const want = anchor ? anchor.nextSibling : (log.querySelector('#lvDash') || null);
        if (row.parentNode !== log || (anchor && row.previousSibling !== anchor)) log.insertBefore(row, want);
    }


    /* ---------- events ---------- */
    D.addEventListener('click', e => {
        const t = e.target.closest && e.target.closest('[data-mb],[data-care-uid],[data-friend-uid]');
        if (!t) return;
        if (!t.dataset.mb && t.dataset.cr) return; /* friends tree nodes: the tree opens care itself (LowiCare.open) */
        if (!t.dataset.mb) { e.preventDefault(); e.stopPropagation(); openCare(t.getAttribute('data-care-uid') || t.getAttribute('data-friend-uid')); return; }
        const a = t.dataset.mb, sheetOv = t.closest('.r2-ov');
        if (a === 'open') { e.preventDefault(); e.stopPropagation(); open('trip'); }
        else if (a === 'log') { e.preventDefault(); if (sheetOv && R()) R().close(sheetOv); setTimeout(() => open('trip'), sheetOv ? 320 : 0); }
        else if (a === 'close' || a === 'cclose' || a === 'x') { if (sheetOv && R()) R().close(sheetOv); }
        else if (a === 'tab') { tab = t.dataset.t; paint(); const n = ov && ov.querySelector('.mb-tab.on'); if (n) n.focus({ preventScroll: true }); }
        else if (a === 'care') { openCare(t.dataset.uid); }
        else if (a === 'tree') { if (sheetOv && R()) R().close(sheetOv); setTimeout(() => { try { W.LowiCellRoom.openTree(); } catch (x) {} }, 320); }
        else if (a === 'kind') { ck = t.dataset.k; cpaint(); const n = cov && cov.querySelector('.mb-kind.act'); if (n) n.focus({ preventScroll: true }); }
        else if (a === 'send') { sendCare(); }
    }, true);
    W.addEventListener('lowi:reward', e => {
        const en = e && e.detail && e.detail.entry;
        if (en && C.kind(en) === 'trip') setTimeout(tripCheck, 1200);
        if (cov) cpaint();
    });
    W.addEventListener('lowi:body-trip-done', e => { const d = e && e.detail || {}; logTrip(d); });
    W.addEventListener('lowi:lang', () => { homeRow(); paint(); cpaint(); });
    W.addEventListener('online', () => setTimeout(flush, 1500));

    function boot() {
        if (!D.body) { setTimeout(boot, 50); return; }
        if (!D.getElementById('mbCss')) {
            const l = D.createElement('link'); l.id = 'mbCss'; l.rel = 'stylesheet';
            const me = D.querySelector('script[src*="micro-book.js"]');
            l.href = me ? me.getAttribute('src').replace('micro-book.js', 'micro-book.css') : 'micro-book.css';
            D.head.appendChild(l);
        }
        setTimeout(() => {
            const a = adv(), now = Date.now();
            trips().forEach(j => { if (now - j.ts >= 864e5) a.seen[j.id] = 1; });
            homeRow(); badges();
        }, 1200);
        if (W.MutationObserver) {
            let q = 0;
            new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; const log = D.querySelector('#spHome .sp-log'); if (log && (!row || !row.isConnected)) homeRow(); if (D.querySelector('[data-care-uid],[data-friend-uid]')) badges(); }); }).observe(D.body, { childList: true, subtree: true });
        }
        setInterval(() => { if (!D.hidden) tripCheck(); }, 4000);
        setInterval(flush, 20000);
        setTimeout(poll, 6000);
        setInterval(poll, 45000);
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();

    W.LowiMicroBook = { open, openCare, trips, logTrip, friends, flush, poll, badges, isOpen: () => !!(ov && ov.isConnected) };
    W.LowiCare = { open: openCare, badges };
})();
