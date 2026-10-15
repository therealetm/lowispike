/* LOWiSPIKE microbe buddies (Oct 15, 2026). Part of the body-universe depth layer; look: .lowispike/VISUAL-MASTER.md
   ("buddies share the hero's construction: round, glossy, eyes, smile, one colour"; microbes are soft blobs, home hue + paler rim).
   Up to three found microbes from the microbe book live with your cell as a crew. Lacto, the starter buddy, joins the book
   through the external-buddy contract (window.LowiBodyBuddies + LowiMicroBook.found, event lowi:buddy-found).
   Where they show up:
   - Living cell: they float around the cell in the herb world (tap one = buddy sheet) and, small, around the Home orb.
   - Herb world header: a "Buddys" chip next to the microbe book chip opens the buddy sheet.
   - Cell room (Zuhause): they sit in the room with your cell.
   - 3D world: glossy buddies with faces orbit your cell in the shared LowiWorld3D hub (own group 'lowi-buddies', no second
     WebGL context; hidden inside a region or during a cell ride).
   They react to what is logged (mood: cheer / happy / wish / tidy after a spike meal / sleepy at night), grow closer every day
   their favourite was done (bond level, one-time XP gift per new level via LowiHost.award), and the lead buddy comes along on
   body trips (lowi:body-trip-done, the adventure log). State: S.buddies in the account data. Pure rules: microbe-buddies-core.js. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;
    if (W.LowiBuddies) return;
    const K = W.LowiBuddiesCore || (typeof require === 'function' ? require('./microbe-buddies-core.js') : null);
    if (!K) return;
    /* the book reads extra buddies from here (micro-book merge contract) */
    const ext = Array.isArray(W.LowiBodyBuddies) ? W.LowiBodyBuddies : [];
    if (!ext.some(b => b && b.id === K.STARTER.id)) ext.push(K.STARTER);
    W.LowiBodyBuddies = ext;
    if (!D || !D.createElement) { W.LowiBuddies = { core: K }; return; }

    const H = D.documentElement;
    if (!D.getElementById('mbdCss')) {
        const me = D.currentScript || D.querySelector('script[src*="microbe-buddies.js"]'), l = D.createElement('link');
        l.id = 'mbdCss'; l.rel = 'stylesheet';
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('microbe-buddies.js', 'microbe-buddies.css') : 'microbe-buddies.css';
        D.head.appendChild(l);
    }

    /* ---------- language ---------- */
    const lang = () => { try { return (W.LowiLang.get() || H.lang || 'de').slice(0, 2); } catch (e) { return (H.lang || 'de').slice(0, 2); } };
    const L = () => ({ en: 0, de: 1, es: 2 }[lang()] ?? 1);
    const P = a => K.pick(a, L());
    const T = (en, de, es) => [en, de, es];
    const copy = {
        over: T('MICROBE BUDDIES', 'MIKROBEN-BUDDYS', 'COMPAÑEROS MICROBIOS'),
        title: T('Your crew', 'Deine Crew', 'Tu equipo'),
        chip: T('Buddies', 'Buddys', 'Amigos'),
        intro: T('They live in your cell, react to what you log and grow closer every day you do their favourite thing.', 'Sie wohnen in deiner Zelle, reagieren auf deine Einträge und werden jeden Tag enger mit dir, an dem du ihr Lieblingsding machst.', 'Viven en tu célula, reaccionan a lo que registras y se acercan más cada día que haces su cosa favorita.'),
        loves: T('Loves', 'Liebt', 'Le encanta'),
        lv: T('Lv', 'Lv', 'Nv'),
        toNext: T('{n} more days to {t}', 'noch {n} Tage bis {t}', 'faltan {n} días para {t}'),
        toNext1: T('1 more day to {t}', 'noch 1 Tag bis {t}', 'falta 1 día para {t}'),
        maxed: T('Best buddies for good', 'Beste Buddys für immer', 'Mejores amigos para siempre'),
        trips: T('Came along on {n} trips', 'War bei {n} Reisen dabei', 'Fue en {n} viajes'),
        trip1: T('Came along on 1 trip', 'War bei 1 Reise dabei', 'Fue en 1 viaje'),
        leadIs: T('Comes along on your body trips', 'Kommt mit auf deine Körperreisen', 'Te acompaña en tus viajes'),
        makeLead: T('Take on trips', 'Mit auf Reisen', 'Llevar de viaje'),
        home: T('Send home', 'Nach Hause schicken', 'Mandar a casa'),
        free: T('Free spot: pick a buddy below', 'Freier Platz: such dir unten einen Buddy aus', 'Hueco libre: elige un compañero abajo'),
        found: T('From your microbe collection', 'Aus deiner Mikroben-Sammlung', 'De tu colección de microbios'),
        join: T('Join crew', 'In die Crew', 'Unir'),
        full: T('Crew full: send one home first', 'Crew voll: schick erst einen nach Hause', 'Equipo lleno: manda uno a casa primero'),
        none: T('Find more microbes and they can join you too.', 'Finde mehr Mikroben, dann können auch sie mitkommen.', 'Encuentra más microbios y también podrán unirse.'),
        more: T('{n} more to find', 'noch {n} zu finden', 'faltan {n} por encontrar'),
        book: T('Open microbe collection', 'Mikroben-Sammlung öffnen', 'Abrir colección de microbios'),
        joined: T('{n} joined your crew', '{n} ist jetzt in deiner Crew', '{n} se unió a tu equipo'),
        wentHome: T('{n} went home to the microbe collection', '{n} ist zurück in der Mikroben-Sammlung', '{n} volvió a la colección'),
        leadNow: T('{n} comes along on your trips now', '{n} kommt jetzt mit auf deine Reisen', '{n} te acompaña ahora en tus viajes'),
        cameAlong: T('{n} came along on your trip', '{n} war bei deiner Reise dabei', '{n} fue contigo de viaje'),
        bondUp: T('{n} · now {t}', '{n} · jetzt {t}', '{n} · ahora {t}'),
        hello: T('Lacto joined your cell. Say hi!', 'Lacto ist in deine Zelle gezogen. Sag Hallo!', 'Lacto se mudó a tu célula. ¡Salúdalo!'),
        tapMe: T('{n}, tap to see your buddies', '{n}, antippen für deine Buddys', '{n}, toca para ver tus compañeros'),
        hint: T('A picture of your entries, not a measurement.', 'Ein Bild deiner Einträge, keine Messung.', 'Una imagen de tus registros, no una medición.')
    };
    const tr = (k, vars) => { let s = P(copy[k] || [k]); for (const v in (vars || {})) s = s.split('{' + v + '}').join(vars[v]); return s; };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const reduced = () => !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* ---------- state ---------- */
    const B = () => W.LowiVitalsBridge;
    const S = () => { try { return B().state() || {}; } catch (e) { try { return W.LowiR2.S() || {}; } catch (x) { return {}; } } };
    const save = () => { try { B().save(); } catch (e) {} };
    const MB = () => W.LowiMicroBook;
    function stored() { return K.clean(S().buddies); }
    function store(st) { const s = S(); s.buddies = st; save(); }
    function cards() {
        try { const bk = MB() && MB().book && MB().book(); if (bk && Array.isArray(bk.cards)) return bk; } catch (e) {}
        const b = Object.assign({ n: K.STARTER.names, m: 'event' }, K.STARTER);
        return { cards: [{ no: 1, id: b.id, b, found: true, since: 0 }], n: 1, total: 1, fallback: true };
    }
    function input(now) {
        const s = S(), key = K.dayKey(now);
        let water = 0;
        try { const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}') || {}; water = +(f.water && f.water[key]) || 0; } catch (e) {}
        const a = s.adventures && Array.isArray(s.adventures.log) ? s.adventures.log : [];
        return { now, logs: s.logs || [], ledger: s.ledger || s.xpLog || [], water, trips: a, verdict: W.LowiCell && W.LowiCell.verdict };
    }
    const name = c => P(c && c.b && (c.b.n || c.b.names) || c && c.id || '');
    const hue = c => (c && c.b && Number.isFinite(+c.b.hue)) ? +c.b.hue : 160;

    /* ---------- drawings ---------- */
    const BODY = {
        round: '<ellipse class="bd" cx="32" cy="35" rx="21" ry="19.5"/>',
        rod: '<rect class="bd" x="9" y="20" width="46" height="30" rx="15"/>',
        wide: '<ellipse class="bd" cx="32" cy="37" rx="25" ry="16.5"/>',
        drop: '<path class="bd" d="M32 9c9 11 20 19 20 29a20 20 0 0 1-40 0c0-10 11-18 20-29z"/>',
        star: '<g class="bd"><circle cx="32" cy="14.5" r="5"/><circle cx="51" cy="29" r="5"/><circle cx="44" cy="53" r="5"/><circle cx="20" cy="53" r="5"/><circle cx="13" cy="29" r="5"/><ellipse cx="32" cy="35" rx="20" ry="19"/></g>'
    };
    const MOUTH = {
        cheer: '<path class="mo" d="M24.5 40.5q7.5 10 15 0z"/><path class="tg" d="M28.5 44.6q3.5-2.4 7 0q-3.5 2.6-7 0z"/>',
        happy: '<path class="ml" d="M25.5 41q6.5 6 13 0"/>',
        wish: '<path class="ml" d="M28 42.5q4 2.4 8 0"/>',
        tidy: '<ellipse class="mo" cx="32" cy="43" rx="2.6" ry="2.2"/><path class="br" d="M21.5 25.5l6 2M42.5 25.5l-6 2"/><path class="sw" d="M49 22c1.6 2.6 2.6 4 2.6 5.2a2.6 2.6 0 0 1-5.2 0c0-1.2 1-2.6 2.6-5.2z"/>',
        sleepy: '<ellipse class="mo" cx="32" cy="43" rx="2" ry="1.6"/><text class="zz" x="47" y="18">z</text>'
    };
    function eyes(m) {
        if (m === 'sleepy') return '<path class="ml" d="M21.5 34q3.5 2.6 7 0M35.5 34q3.5 2.6 7 0"/>';
        if (m === 'cheer') return '<path class="ml ey" d="M21 34.5q4-5 8 0M35 34.5q4-5 8 0"/>';
        return '<circle class="ew" cx="25" cy="33" r="5.4"/><circle class="ew" cx="39" cy="33" r="5.4"/><circle class="pu" cx="25.6" cy="33.6" r="3"/><circle class="pu" cx="39.6" cy="33.6" r="3"/><circle class="gl" cx="26.8" cy="32.2" r="1.1"/><circle class="gl" cx="40.8" cy="32.2" r="1.1"/>';
    }
    function art(c, m, cls) {
        const body = K.bodyOf(c && c.b);
        return '<svg class="mbd-art mbd-m-' + m + (cls ? ' ' + cls : '') + '" viewBox="0 0 64 64" aria-hidden="true" style="--h:' + hue(c) + '">' +
            '<g class="mbd-wob">' + BODY[body] + '<ellipse class="hl" cx="23" cy="22" rx="7" ry="3.6" transform="rotate(-24 23 22)"/>' +
            '<circle class="ck" cx="19.5" cy="40" r="3.2"/><circle class="ck" cx="44.5" cy="40" r="3.2"/>' + eyes(m) + (MOUTH[m] || MOUTH.happy) + '</g></svg>';
    }
    const ICO = {
        low: '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l7-7"/>',
        water: '<path d="M12 3c4 5 7 8.5 7 12a7 7 0 0 1-14 0c0-3.5 3-7 7-12z"/>',
        move: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
        scan: '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10"/>',
        fast: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
        trip: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
        any: '<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'
    };
    const ico = f => '<svg class="mbd-ico" viewBox="0 0 24 24" aria-hidden="true">' + (ICO[f] || ICO.any) + '</svg>';

    /* ---------- the crew right now ---------- */
    let now0 = 0, view = null;
    function compute(force) {
        const now = Date.now();
        if (!force && view && now - now0 < 1500) return view;
        const bk = cards(), st = stored(), act = K.activity(input(now));
        const list = K.crew(st, bk.cards).map(c => { const md = K.mood(c.b, act, now); return { c, id: c.id, md, bond: K.bond(st, c.id), say: K.line(md, L()) }; });
        view = { bk, st, act, list, now, sig: lang() + '|' + list.map(x => x.id + ':' + x.md.m + ':' + x.bond.lvl + ':' + x.bond.days).join(',') };
        now0 = now;
        return view;
    }
    /* starter + today's bond days + one-time XP gifts */
    let starterTry = 0;
    function ensureStarter() {
        const st = stored();
        if (st.starter) return;
        const m = MB();
        if (!m || !m.found || !m.book) { if (++starterTry > 40) { st.starter = true; store(st); } return; }
        let fresh = false;
        try { fresh = m.found(K.STARTER.id); } catch (e) {}
        const c = (m.book().cards || []).find(x => x.id === K.STARTER.id);
        if (!c || !c.found) return;
        st.starter = true;
        if (!st.crew.length) { st.crew = [K.STARTER.id]; st.joined[K.STARTER.id] = Date.now(); }
        store(st);
        try { W.dispatchEvent(new CustomEvent('lowi:buddy-found', { detail: { id: K.STARTER.id, starter: true } })); } catch (e) {}
        if (fresh) setTimeout(() => toast(tr('hello')), 3200);
    }
    function syncBond() {
        const bk = cards();
        if (bk.fallback) return;
        const before = JSON.stringify(S().buddies || null), r = K.sync(stored(), bk.cards, K.activity(input(Date.now())), Date.now());
        if (JSON.stringify(r.st) !== before) store(r.st);
        r.ups.forEach((u, i) => {
            const c = bk.cards.find(x => x.id === u.id), t = P(K.TITLES[u.lvl - 1]);
            setTimeout(() => {
                let got = 0;
                try { if (u.amt && W.LowiHost && W.LowiHost.award) got = W.LowiHost.award('buddy-bond:' + u.id + ':' + u.lvl, null, { amt: u.amt, perDay: 1, eventId: 'buddy-bond:' + u.id + ':' + u.lvl, label: 'Buddy · ' + name(c) + ' · ' + t }); } catch (e) {}
                if (!got) toast(tr('bondUp', { n: name(c), t }));
                try { W.dispatchEvent(new CustomEvent('lowi:buddy-bond', { detail: { id: u.id, lvl: u.lvl } })); } catch (e) {}
            }, 2400 + i * 2600);
        });
    }

    /* ---------- toast ---------- */
    let tEl = null, tq = [];
    function toast(msg) {
        tq.push(msg);
        if (tEl && tEl.classList.contains('on')) return;
        nextToast();
    }
    function nextToast() {
        const msg = tq.shift();
        if (!msg) return;
        if (!tEl || !tEl.isConnected) { tEl = D.createElement('div'); tEl.className = 'mbd-toast'; tEl.setAttribute('role', 'status'); tEl.setAttribute('aria-live', 'polite'); D.body.appendChild(tEl); }
        const v = compute(), c = v.list[0] && v.list[0].c;
        tEl.innerHTML = (c ? art(c, 'cheer', 'mbd-t-art') : '') + '<span>' + esc(msg) + '</span>';
        tEl.classList.remove('on'); void tEl.offsetWidth; tEl.classList.add('on');
        setTimeout(() => { tEl.classList.remove('on'); setTimeout(nextToast, 300); }, 2600);
    }

    /* ---------- living cell: herb world stage + Home orb ---------- */
    function orbitHTML(v, small) {
        const sp = K.spots(v.list.length);
        return v.list.map((x, i) => {
            const pos = 'left:' + sp[i][0] + '%;top:' + sp[i][1] + '%;--i:' + i;
            if (small) return '<span class="mbd-pal" style="' + pos + '">' + art(x.c, x.md.m) + '</span>';
            return '<button type="button" class="mbd-pal" data-mbd="open" data-id="' + esc(x.id) + '" style="' + pos + '" aria-label="' + esc(name(x.c) + ': ' + x.say) + '">' + art(x.c, x.md.m) +
                (x.md.m === 'wish' ? '<span class="mbd-think" aria-hidden="true">' + ico(x.md.fav) + '</span>' : '') + '</button>';
        }).join('');
    }
    function mountOrbit(host, small, v) {
        if (!host) return;
        let o = host.querySelector(':scope > .mbd-orbit');
        if (!o) { o = D.createElement('div'); o.className = 'mbd-orbit' + (small ? ' mbd-small' : ''); if (small) o.setAttribute('aria-hidden', 'true'); host.appendChild(o); o.dataset.sig = ''; }
        if (o.dataset.sig !== v.sig) { o.dataset.sig = v.sig; o.innerHTML = orbitHTML(v, small); }
    }
    function chip(v) {
        const head = D.querySelector('.sp-world-head');
        if (!head) return;
        let b = head.querySelector('#mbdChip');
        if (!b) {
            b = D.createElement('button'); b.type = 'button'; b.id = 'mbdChip'; b.className = 'mbd-chip'; b.dataset.mbd = 'open'; b.setAttribute('data-noi18n', '');
            const before = head.querySelector('#mbChip') || head.querySelector(':scope > button:last-child');
            head.insertBefore(b, before || null);
        }
        const lead = v.list[0];
        const sig = v.sig + '|chip';
        if (b.dataset.sig !== sig) {
            b.dataset.sig = sig;
            b.innerHTML = (lead ? art(lead.c, lead.md.m, 'mbd-chip-art') : '') + '<span>' + esc(tr('chip')) + '</span><span class="num">' + v.list.length + '</span>';
            b.setAttribute('aria-label', tr('tapMe', { n: v.list.map(x => name(x.c)).join(', ') }));
        }
    }
    /* cell room: buddies sit in the room with your cell */
    function room(v) {
        const sc = D.querySelector('.cr-ov-room .cr-scene');
        if (!sc) return;
        let o = sc.querySelector(':scope > .mbd-room');
        if (!o) { o = D.createElement('div'); o.className = 'mbd-room'; sc.appendChild(o); o.dataset.sig = ''; }
        if (o.dataset.sig === v.sig) return;
        o.dataset.sig = v.sig;
        const spots = [[25, 79], [75, 79], [37, 91]];
        o.innerHTML = v.list.map((x, i) => '<button type="button" class="mbd-sit" data-mbd="open" data-id="' + esc(x.id) + '" style="left:' + spots[i][0] + '%;top:' + spots[i][1] + '%;--i:' + i + '" aria-label="' + esc(name(x.c) + ': ' + x.say) + '">' + art(x.c, x.md.m) + '</button>').join('');
    }

    /* ---------- buddy sheet ---------- */
    let ov = null, focusId = '';
    function cardHTML(x, i, v) {
        const b = x.bond, nextT = b.next ? P(K.TITLES[b.lvl]) : '';
        const prog = b.next ? (b.left === 1 ? tr('toNext1', { t: nextT }) : tr('toNext', { n: b.left, t: nextT })) : tr('maxed');
        const trips = b.trips ? '<small class="mbd-trips">' + ico('trip') + esc(b.trips === 1 ? tr('trip1') : tr('trips', { n: b.trips })) + '</small>' : '';
        const lead = i === 0 ? '<small class="mbd-lead">' + ico('trip') + esc(tr('leadIs')) + '</small>' : '<button type="button" class="mbd-btn" data-mbd="lead" data-id="' + esc(x.id) + '">' + esc(tr('makeLead')) + '</button>';
        const home = v.list.length > 1 ? '<button type="button" class="mbd-btn ghost" data-mbd="drop" data-id="' + esc(x.id) + '">' + esc(tr('home')) + '</button>' : '';
        return '<li class="mbd-card' + (x.id === focusId ? ' focus' : '') + '" style="--h:' + hue(x.c) + '"><div class="mbd-face">' + art(x.c, x.md.m, reduced() ? '' : 'live') + '</div><div class="mbd-info">' +
            '<b class="mbd-n">' + esc(name(x.c)) + '</b><small class="mbd-t">' + esc(P(b.title)) + ' · ' + esc(tr('lv')) + ' <span class="num">' + b.lvl + '</span></small>' +
            '<div class="mbd-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + b.pct + '" aria-label="' + esc(prog) + '"><i style="width:' + b.pct + '%"></i></div><small class="mbd-prog">' + esc(prog) + '</small>' +
            '<p class="mbd-say">' + esc(x.say) + '</p><small class="mbd-fav">' + ico(x.md.fav) + esc(tr('loves') + ': ' + P(K.FAVS[x.md.fav].n)) + '</small>' + trips +
            '<div class="mbd-acts">' + lead + home + '</div></div></li>';
    }
    function sheetHTML() {
        const v = compute(true), ids = v.list.map(x => x.id);
        const pool = v.bk.cards.filter(c => c.found && !ids.includes(c.id)), full = v.list.length >= K.MAX_CREW, left = v.bk.cards.filter(c => !c.found).length;
        const free = Array.from({ length: K.MAX_CREW - v.list.length }, () => '<li class="mbd-free">' + esc(tr('free')) + '</li>').join('');
        const grid = pool.length ? '<ul class="mbd-pool">' + pool.map(c => { const f = K.favOf(c.b); return '<li><button type="button" class="mbd-pc" data-mbd="add" data-id="' + esc(c.id) + '"' + (full ? ' aria-disabled="true"' : '') + ' aria-label="' + esc(name(c) + ', ' + tr('loves') + ': ' + P(K.FAVS[f].n) + (full ? ', ' + tr('full') : ', ' + tr('join'))) + '">' + art(c, 'happy') + '<b>' + esc(name(c)) + '</b><small>' + ico(f) + esc(P(K.FAVS[f].n)) + '</small></button></li>'; }).join('') + '</ul>' + (full ? '<p class="mbd-note">' + esc(tr('full')) + '</p>' : '')
            : '<p class="mbd-note">' + esc(tr('none')) + '</p>';
        const book = MB() && MB().open ? '<button type="button" class="mbd-cta ghost" data-mbd="book">' + esc(tr('book')) + (left ? ' · ' + esc(tr('more', { n: left })) : '') + '</button>' : '';
        return '<div class="mbd-sheet" data-noi18n><div class="mbd-over">' + esc(tr('over')) + '</div><h2 id="mbdTitle">' + esc(tr('title')) + ' <span class="num">' + v.list.length + '/' + K.MAX_CREW + '</span></h2><p class="mbd-intro">' + esc(tr('intro')) + '</p>' +
            '<ul class="mbd-crew">' + v.list.map((x, i) => cardHTML(x, i, v)).join('') + free + '</ul>' +
            '<h3>' + esc(tr('found')) + '</h3>' + grid + book + '<p class="mbd-hint">' + esc(tr('hint')) + '</p></div>';
    }
    function paintSheet(focusSel) {
        if (!ov || !ov.isConnected) { ov = null; return; }
        const box = ov.querySelector('.mbd-sheet');
        if (!box) return;
        const sc = ov.querySelector('.r2-sh'), top = sc ? sc.scrollTop : 0;
        box.outerHTML = sheetHTML();
        if (sc) sc.scrollTop = top;
        const f = focusSel && ov.querySelector(focusSel);
        if (f) f.focus({ preventScroll: true });
    }
    function open(id) {
        focusId = typeof id === 'string' ? id : '';
        const R = W.LowiR2;
        if (!R || !R.sheet) return null;
        if (ov && ov.isConnected) { paintSheet(); return ov; }
        ov = R.sheet(sheetHTML(), { cls: 'mbd-ov', onClose: () => { ov = null; } });
        try { const dlg = ov.querySelector('[role="dialog"]'); if (dlg) dlg.setAttribute('aria-labelledby', 'mbdTitle'); } catch (e) {}
        try { W.dispatchEvent(new CustomEvent('lowi:buddies', { detail: { open: true } })); } catch (e) {}
        return ov;
    }
    function close() { if (ov && ov.isConnected && W.LowiR2 && W.LowiR2.close) W.LowiR2.close(ov); ov = null; }
    function act(kind, id) {
        const bk = cards(), c = bk.cards.find(x => x.id === id);
        let r = null;
        if (kind === 'add') { r = K.add(stored(), id, bk.cards, Date.now()); if (r.ok) toast(tr('joined', { n: name(c) })); else if (r.why === 'full') toast(tr('full')); }
        if (kind === 'drop') { r = K.drop(stored(), id, bk.cards); if (r.ok) toast(tr('wentHome', { n: name(c) })); }
        if (kind === 'lead') { r = K.lead(stored(), id, bk.cards); if (r.ok) toast(tr('leadNow', { n: name(c) })); }
        if (r && r.ok) { store(r.st); view = null; refresh(true); syncBond(); try { W.dispatchEvent(new CustomEvent('lowi:buddies', { detail: { crew: r.st.crew.slice() } })); } catch (e) {} }
        paintSheet(kind === 'add' ? '.mbd-crew .mbd-card:last-of-type .mbd-btn' : '.mbd-sheet h2');
    }
    D.addEventListener('click', e => {
        const t = e.target.closest && e.target.closest('[data-mbd]');
        if (!t) return;
        const k = t.dataset.mbd;
        e.preventDefault(); e.stopPropagation();
        if (k === 'open') { open(t.dataset.id || ''); return; }
        if (k === 'book') { close(); setTimeout(() => { try { MB().open('mic'); } catch (x) {} }, 280); return; }
        if (t.getAttribute('aria-disabled') === 'true') { toast(tr('full')); return; }
        if (k === 'add' || k === 'drop' || k === 'lead') act(k, t.dataset.id);
    }, true);

    /* ---------- 3D world: buddies orbit your cell in the shared hub ---------- */
    const G3 = { group: null, sig: '', items: [], faces: {}, t: 0, bound: false, w: null };
    function faceTex(THREE, m) {
        if (G3.faces[m]) return G3.faces[m];
        const cv = D.createElement('canvas'); cv.width = cv.height = 128;
        const g = cv.getContext('2d');
        if (!g) return null;
        g.lineCap = 'round'; g.lineWidth = 6; g.strokeStyle = '#1b1f3a'; g.fillStyle = '#1b1f3a';
        const eye = (x) => {
            if (m === 'sleepy') { g.beginPath(); g.arc(x, 56, 11, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); return; }
            if (m === 'cheer') { g.beginPath(); g.arc(x, 64, 12, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); return; }
            g.fillStyle = '#fff'; g.beginPath(); g.arc(x, 58, 15, 0, 7); g.fill();
            g.fillStyle = '#1b1f3a'; g.beginPath(); g.arc(x + 1.5, 60, 8.5, 0, 7); g.fill();
            g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 5, 55, 3.2, 0, 7); g.fill();
        };
        eye(44); eye(84);
        g.fillStyle = 'rgba(255,120,170,.45)'; g.beginPath(); g.arc(30, 80, 8, 0, 7); g.arc(98, 80, 8, 0, 7); g.fill();
        g.strokeStyle = '#1b1f3a'; g.fillStyle = '#1b1f3a'; g.beginPath();
        if (m === 'cheer') { g.moveTo(48, 80); g.quadraticCurveTo(64, 104, 80, 80); g.closePath(); g.fill(); }
        else if (m === 'tidy' || m === 'sleepy') { g.arc(64, 88, 5, 0, 7); g.fill(); }
        else if (m === 'wish') { g.moveTo(55, 86); g.quadraticCurveTo(64, 92, 73, 86); g.stroke(); }
        else { g.moveTo(48, 82); g.quadraticCurveTo(64, 98, 80, 82); g.stroke(); }
        const tex = new THREE.CanvasTexture(cv);
        if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        G3.faces[m] = tex;
        return tex;
    }
    function clear3d() {
        if (!G3.group) return;
        G3.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(mt => mt.dispose()); } });
        if (G3.group.parent) G3.group.parent.remove(G3.group);
        G3.group = null; G3.items = []; G3.sig = '';
    }
    function build3d(w, v) {
        const THREE = w.THREE;
        clear3d();
        const group = new THREE.Group(); group.name = 'lowi-buddies';
        const n = v.list.length;
        v.list.forEach((x, i) => {
            const h = hue(x.c) / 360, dim = x.md.m === 'sleepy';
            const col = new THREE.Color().setHSL(h, 0.62, dim ? 0.48 : 0.58), rim = new THREE.Color().setHSL(h, 0.85, 0.82);
            const g = new THREE.Group();
            const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 28, 20), new THREE.MeshStandardMaterial({ color: col, roughness: 0.38, metalness: 0, emissive: col, emissiveIntensity: x.md.m === 'cheer' ? 0.5 : dim ? 0.12 : 0.28 }));
            const sh = K.bodyOf(x.c.b);
            if (sh === 'rod') body.scale.set(1.35, 0.85, 0.9); else if (sh === 'wide') body.scale.set(1.25, 0.8, 1.05); else if (sh === 'drop') body.scale.set(0.95, 1.12, 0.95);
            g.add(body);
            const halo = new THREE.Mesh(new THREE.SphereGeometry(0.47, 22, 16), new THREE.MeshBasicMaterial({ color: rim, transparent: true, opacity: dim ? 0.12 : 0.24, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending }));
            halo.scale.copy(body.scale); g.add(halo);
            const tex = faceTex(THREE, x.md.m);
            let face = null;
            if (tex) { face = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); face.scale.set(0.62, 0.62, 1); g.add(face); }
            group.add(g);
            G3.items.push({ g, face, i, n, m: x.md.m, r: 0.4 * Math.max(body.scale.x, body.scale.z) });
        });
        w.hub.add(group);
        G3.group = group; G3.sig = v.sig; G3.w = w.hub;
    }
    const tmpV = { x: 0, y: 0, z: 0 };
    function frame3d(dt) {
        const w = W.LowiWorld3D;
        if (!G3.group || !w || !w.camera) return;
        let show = true;
        try { const R = W.LowiWorldRegions; if (R && R.current && w.isOpen && w.isOpen()) { const c = R.current(); if (c && c !== 'hub') show = false; } } catch (e) {}
        try { if (W.LowiRide && W.LowiRide.active) show = false; } catch (e) {}
        G3.group.visible = show;
        if (!show) return;
        const step = typeof dt === 'number' ? (dt > 1 ? dt / 1000 : dt) : 0.016;
        G3.t += reduced() ? 0 : Math.min(0.05, step);
        const cam = w.camera.position;
        G3.items.forEach(it => {
            const p = K.orbit(it.i, it.n, G3.t, it.m);
            it.g.position.set(p[0], p[1], p[2]);
            if (it.face) {
                tmpV.x = cam.x - p[0]; tmpV.y = cam.y - p[1]; tmpV.z = cam.z - p[2];
                const l = Math.hypot(tmpV.x, tmpV.y, tmpV.z) || 1, d = it.r * 1.04;
                it.face.position.set(tmpV.x / l * d, tmpV.y / l * d, tmpV.z / l * d);
            }
        });
    }
    function sync3d(v) {
        const w = W.LowiWorld3D;
        if (!w || !w.ready || !w.THREE || !w.hub || !w.camera) return;
        if (!G3.bound) { G3.bound = true; w.onFrame(frame3d); }
        if (G3.sig !== v.sig || G3.w !== w.hub || (G3.group && !G3.group.parent)) { try { build3d(w, v); } catch (e) { console.warn('buddies 3d', e && e.message); } }
    }

    /* ---------- refresh loop ---------- */
    function refresh(force) {
        const v = compute(force);
        const world = D.getElementById('spWorld');
        if (world && !world.hidden) { mountOrbit(world.querySelector('.sp-stage'), false, v); chip(v); }
        const bubble = D.getElementById('spBubble');
        if (bubble) mountOrbit(bubble, true, v);
        room(v);
        sync3d(v);
        if (ov && ov.isConnected && ov.dataset.sig !== v.sig) { ov.dataset.sig = v.sig; if (!ov.contains(D.activeElement) || D.activeElement === ov) paintSheet(); }
    }
    function tick() {
        try { ensureStarter(); syncBond(); refresh(true); } catch (e) { console.warn('buddies', e && e.message); }
    }
    let q = 0;
    const queue = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; try { refresh(false); } catch (e) {} }); };
    function boot() {
        if (!D.body) { setTimeout(boot, 60); return; }
        new MutationObserver(muts => {
            for (const m of muts) { const t = m.target; if (t && t.closest && t.closest('.mbd-orbit,.mbd-room,.mbd-ov,.mbd-toast,#mbdChip')) continue; queue(); return; }
        }).observe(D.body, { childList: true, subtree: true });
        ['lowi:reward', 'lowi:cell-state', 'lowi:world3d-ready', 'lowi:cellroom', 'lowi:lang', 'focus'].forEach(ev => W.addEventListener(ev, () => setTimeout(tick, 60)));
        W.addEventListener('lowi:body-trip-done', e => {
            const d = e.detail || {}, bk = cards();
            if (bk.fallback) return;
            const r = K.trip(stored(), bk.cards, { id: d.id || ('t' + (d.ts || Date.now())), ts: +d.ts || Date.now() }, Date.now());
            if (!r.who) return;
            store(r.st); view = null;
            setTimeout(() => toast(tr('cameAlong', { n: name(r.who) })), 4200);
            setTimeout(tick, 200);
        });
        setTimeout(tick, 900);
        setInterval(() => { if (!D.hidden) tick(); }, 20000);
    }
    boot();

    W.LowiBuddies = { core: K, open, close, refresh: () => tick(), crew: () => compute(true).list.map(x => ({ id: x.id, mood: x.md.m, fav: x.md.fav, lvl: x.bond.lvl, days: x.bond.days, say: x.say })), isOpen: () => !!(ov && ov.isConnected), art };
})();
