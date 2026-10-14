/* LOWiSPIKE extras (Oct 15, 2026, inspiration backlog 12, 14, 15):
   - In-scene first-use hints: two to four spaced uppercase words next to the control they explain,
     one at a time, gone for good after the first success. Never catch taps (pointer-events: none).
   - Per-tab tint inside the dark theme: header glow + active tab only (phone tab bar and iPad/desktop sidebar).
   - Community milestones + good vibes with quiet hours. Milestones come only from real data: your own state
     and the public profiles already shown on the leaderboard (level, streak). Nothing is invented.
   Pure core first (exported for node tests), DOM layer after. Reduced motion: no fades, no sparkle burst. */
(function (root) {
    'use strict';
    const TINT = { home: 'sun', foryou: 'violet', shelf: 'herb', move: 'coral', scan: 'cyan', profile: 'sun' };
    const STREAKS = [3, 7, 14, 30, 60, 100, 200, 365];
    const HINTS = [
        { id: 'scan', sel: ['#lhDock', '#tabbar .tb.scan'], txt: ['TAP TO SCAN', 'TIPPEN ZUM SCANNEN', 'TOCA PARA ESCANEAR'] },
        { id: 'herb', sel: ['#spBubble'], txt: ['PRESS YOUR HERB', 'DRÜCK DEIN KRAUT', 'PULSA TU HIERBA'] },
        { id: 'wear', sel: ['[data-sp="wardrobe"]'], txt: ['OPEN THE WARDROBE', 'ZUM KLEIDERSCHRANK', 'ABRE EL ARMARIO'] },
        { id: 'try', sel: ['.wd-item'], txt: ['TAP TO TRY ON', 'TIPPEN ZUM ANPROBIEREN', 'TOCA PARA PROBAR'] },
        { id: 'fast', sel: ['#spFast'], txt: ['TAP FOR YOUR FAST', 'TIPP FÜRS FASTEN', 'TOCA PARA TU AYUNO'] },
        { id: 'miles', sel: ['#fxMilesBtn'], txt: ['SEE MILESTONES', 'MEILENSTEINE ANSEHEN', 'VER LOGROS'] },
        { id: 'vibes', sel: ['.fx-vibe:not([disabled])'], txt: ['SEND GOOD VIBES', 'GUTE VIBES SENDEN', 'ENVÍA BUENAS VIBRAS'] }
    ];
    /* predefined supportive reactions only: no free text, nothing about food, body or macros */
    const REACTIONS = [
        { id: 'vibes', e: '\u2728', txt: ['Good vibes', 'Gute Vibes', 'Buenas vibras'] },
        { id: 'proud', e: '\ud83c\udf31', txt: ['Proud of you', 'Stolz auf dich', 'Orgullo de ti'] },
        { id: 'go', e: '\ud83d\udd25', txt: ['Keep going', 'Weiter so', 'Sigue as\u00ed'] }
    ];
    const tintFor = tab => TINT[tab] || 'sun';
    const words = s => String(s).trim().split(/\s+/).length;
    /* first hint not done yet whose control is on screen */
    function nextHint(done, visible) {
        done = done || {};
        for (const h of HINTS) if (!done[h.id] && visible(h)) return h;
        return null;
    }
    function streakMark(n) {
        n = +n || 0;
        let m = 0;
        for (const s of STREAKS) if (n >= s) m = s;
        return m;
    }
    /* people: LOWI_CLOUD.people() rows {n, uid, lv, streak}; me: {name, uid, lv, streak} */
    function milestones(people, me, max) {
        const out = [];
        const add = (p, mine) => {
            if (!p || !p.n && !mine) return;
            const id = mine ? 'me' : String(p.uid || p.n);
            const lv = Math.max(1, Math.min(6, Math.floor(+p.lv || 1))), st = streakMark(p.streak);
            if (st) out.push({ key: id + ':st' + st, who: p.n || '', uid: p.uid || '', kind: 'streak', n: st, mine: !!mine, w: st * 3 + (mine ? 1e4 : 0) });
            if (lv >= 2) out.push({ key: id + ':lv' + lv, who: p.n || '', uid: p.uid || '', kind: 'level', n: lv, mine: !!mine, w: lv * 10 + (mine ? 1e4 : 0) });
        };
        if (me) add(me, true);
        (people || []).forEach(p => { if (!me || !p.uid || p.uid !== me.uid) add(p, false); });
        return out.sort((a, b) => b.w - a.w || (a.who < b.who ? -1 : 1)).slice(0, max || 24);
    }
    const mins = hhmm => { const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || ''); return m ? (+m[1] % 24) * 60 + (+m[2] % 60) : 0; };
    /* quiet hours wrap past midnight (22:00 to 08:00) */
    function isQuiet(date, q) {
        if (!q || !q.on) return false;
        const t = date.getHours() * 60 + date.getMinutes(), a = mins(q.from), b = mins(q.to);
        if (a === b) return false;
        return a < b ? t >= a && t < b : t >= a || t < b;
    }
    /* new incoming vibes: shown now, or held until quiet hours end and then shown as one line */
    function sortIncoming(incoming, seen, date, q) {
        const fresh = (incoming || []).filter(v => v && v.id && !(seen || {})[v.id]);
        return isQuiet(date, q) ? { show: [], hold: fresh } : { show: fresh, hold: [] };
    }
    function canSend(state, m) { return !!m && !m.mine && !(state && state.sent && state.sent[m.key]) && !(state && state.blocked && state.blocked[m.uid || m.who]); }
    /* people you hid never show up and their vibes never reach you */
    function visible(list, state) { const b = state && state.blocked || {}; return (list || []).filter(m => m.mine || !(b[m.uid] || b[m.who])); }
    const core = { TINT, HINTS, STREAKS, REACTIONS, visible, tintFor, words, nextHint, streakMark, milestones, isQuiet, sortIncoming, canSend, mins };
    if (typeof module === 'object' && module.exports) module.exports = core;
    root.LowiExtrasCore = core;

    const D = root.document;
    if (!D || !root.addEventListener || root.LowiExtras) return;
    const H = D.documentElement, KH = 'lowispike.hints.v1', KV = 'lowispike.vibes.v1';
    const reduced = () => { try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const L = () => { let l = ''; try { l = root.LowiLang.get() || ''; } catch (e) {} return ({ en: 0, de: 1, es: 2 })[(l || H.lang || 'de').slice(0, 2)] ?? 0; };
    const read = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || '{}')); } catch (e) { return d; } };
    const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const toast = (m, ms) => { try { (root.LowiHost && root.LowiHost.toast || root.toast)(m, ms || 2200); } catch (e) {} };
    const C = {
        miles: ['Milestones', 'Meilensteine', 'Logros'],
        sub: ['From your herb and the people in the room. Tap to send good vibes.', 'Von deinem Kraut und den Leuten im Raum. Tippe, um gute Vibes zu senden.', 'De tu hierba y de la gente de la sala. Toca para enviar buenas vibras.'],
        lv: ['herb reached level', 'Kraut hat Level', 'hierba llegó al nivel'],
        lvEnd: ['', 'erreicht', ''],
        st: ['-day streak', '-Tage-Serie', ' días de racha'],
        you: ['You', 'Du', 'Tú'],
        yours: ['Your', 'Dein', 'Tu'],
        vibe: ['Good vibes', 'Gute Vibes', 'Buenas vibras'],
        sent: ['Sent', 'Gesendet', 'Enviado'],
        sentTo: ['Good vibes sent to ', 'Gute Vibes an ', 'Buenas vibras para '],
        sentEnd: ['', ' gesendet', ''],
        got: [' sent you good vibes', ' hat dir gute Vibes geschickt', ' te envió buenas vibras'],
        gotN: [' people sent you good vibes while it was quiet', ' Leute haben dir in der Ruhezeit gute Vibes geschickt', ' personas te enviaron buenas vibras mientras era hora de silencio'],
        quiet: ['Quiet hours', 'Ruhezeit', 'Horas de silencio'],
        quietSub: ['No good-vibes pop-ups from 22:00 to 08:00. They wait until morning.', 'Keine Vibes-Meldungen von 22:00 bis 08:00. Sie warten bis morgens.', 'Sin avisos de vibras de 22:00 a 08:00. Esperan a la mañana.'],
        empty: ['Milestones show up here when you or people in the room level up or keep a streak.', 'Meilensteine erscheinen hier, sobald du oder Leute im Raum ein Level erreichen oder eine Serie halten.', 'Los logros aparecen aquí cuando tú o la gente de la sala suben de nivel o mantienen una racha.'],
        pick: ['Send a reaction', 'Reaktion senden', 'Enviar una reacci\u00f3n'],
        more: ['More', 'Mehr', 'M\u00e1s'],
        hide: ['Hide this person', 'Person ausblenden', 'Ocultar a esta persona'],
        report: ['Report', 'Melden', 'Denunciar'],
        hidden: ['Hidden. You won\u2019t see them here or get their vibes.', 'Ausgeblendet. Du siehst die Person hier nicht mehr und bekommst keine Vibes von ihr.', 'Oculto. Ya no la ver\u00e1s aqu\u00ed ni recibir\u00e1s sus vibras.'],
        reported: ['Reported and hidden. Thanks for keeping the room kind.', 'Gemeldet und ausgeblendet. Danke, dass du den Raum freundlich h\u00e4ltst.', 'Denunciado y oculto. Gracias por mantener la sala amable.'],
        privacy: ['Only level and streak are shown. Never food, scans, body or macro data. Reactions are fixed phrases, no messages.', 'Gezeigt werden nur Level und Serie. Nie Essen, Scans, K\u00f6rper- oder Makrodaten. Reaktionen sind feste S\u00e4tze, keine Nachrichten.', 'Solo se muestran nivel y racha. Nunca comida, escaneos, cuerpo ni macros. Las reacciones son frases fijas, no mensajes.'],
        recv: ['Receive good vibes', 'Gute Vibes empfangen', 'Recibir buenas vibras'],
        recvSub: ['Turn off to get none at all.', 'Aus, wenn du gar keine bekommen willst.', 'Desact\u00edvalo para no recibir ninguna.'],
        close: ['Close', 'Schließen', 'Cerrar']
    };
    const t = k => C[k][L()];

    /* ---------- 14 · per-tab tint ---------- */
    let tintTab = '';
    function paintTint() {
        const a = D.querySelector('#tabbar .tb.active');
        let tab = a ? a.dataset.tab : (root.LowiHost && root.LowiHost.tab ? root.LowiHost.tab() : 'home');
        if (H.classList.contains('sp-open') && !H.classList.contains('herb-room')) tab = 'scan';
        if (tab === tintTab) return;
        tintTab = tab;
        H.setAttribute('data-tint', tintFor(tab));
    }
    function glow() {
        if (D.getElementById('fxGlow')) return;
        const g = D.createElement('div');
        g.id = 'fxGlow';
        g.setAttribute('aria-hidden', 'true');
        D.body.appendChild(g);
    }

    /* ---------- 12 · in-scene hints ---------- */
    const hints = read(KH, {});
    let layer = null, shown = null, armed = false, raf = 0;
    function shownEl(sel) {
        for (const s of sel) {
            const el = D.querySelector(s);
            if (!el) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 8 || r.height < 8 || r.bottom < 4 || r.top > innerHeight - 4 || r.right < 4 || r.left > innerWidth - 4) continue;
            const cx = Math.min(innerWidth - 2, Math.max(1, r.left + r.width / 2)), cy = Math.min(innerHeight - 2, Math.max(1, r.top + r.height / 2));
            const top = D.elementFromPoint(cx, cy);
            if (top && (top === el || el.contains(top) || top.contains(el))) return el;
        }
        return null;
    }
    const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    /* never sit on top of another button: the words would read as that button's label */
    function hitsControl(box, el) {
        const pts = [[.5, .5], [.06, .2], [.94, .2], [.06, .8], [.94, .8], [.3, .5], [.7, .5]];
        for (const p of pts) {
            const x = box.left + (box.right - box.left) * p[0], y = box.top + (box.bottom - box.top) * p[1];
            const hit = D.elementFromPoint(x, y), c = hit && hit.closest && hit.closest('button,a,input,select,textarea,[role=button],[data-sp],.tb,#lcA2hs');
            if (c && c !== el && !el.contains(c) && !c.contains(el)) return true;
        }
        return false;
    }
    function place(el) {
        const r = el.getBoundingClientRect(), w = layer.offsetWidth, h = layer.offsetHeight, gap = 8;
        const avoid = ['#lcA2hs', '#fxSheetGuard'].map(s => D.querySelector(s)).filter(Boolean).map(x => x.getBoundingClientRect());
        const side = H.getAttribute('data-lay') === 'desktop' && el.closest('#tabbar');
        const cand = side ? [[r.right + gap, r.top + (r.height - h) / 2]] : [];
        cand.push([r.left + (r.width - w) / 2, r.top - h - gap], [r.left + (r.width - w) / 2, r.bottom + gap], [r.right + gap, r.top + (r.height - h) / 2], [r.left - w - gap, r.top + (r.height - h) / 2]);
        for (const c of cand) {
            const x = Math.round(Math.min(innerWidth - w - 6, Math.max(6, c[0]))), y = Math.round(c[1]);
            const box = { left: x, top: y, right: x + w, bottom: y + h };
            if (y < 6 || y + h > innerHeight - 6 || overlaps(box, r) || avoid.some(a => overlaps(box, a)) || hitsControl(box, el)) continue;
            return [x, y];
        }
        return null;
    }
    function tick() {
        raf = 0;
        if (!layer || D.hidden || !armed) return;
        let el = null, h = null, pos = null;
        for (const x of HINTS) {
            if (hints[x.id] || !(el = shownEl(x.sel))) continue;
            layer.textContent = x.txt[L()];
            layer.dataset.h = x.id;
            if ((pos = place(el))) { h = x; break; }
        }
        if (!h || !pos) { layer.classList.remove('on'); shown = null; return; }
        /* the same words for screen readers, on the control itself; every hinted control also works with a plain tap */
        if (el.getAttribute('aria-description') !== layer.textContent) el.setAttribute('aria-description', layer.textContent);
        layer.style.transform = 'translate3d(' + pos[0] + 'px,' + pos[1] + 'px,0)';
        if (shown !== h.id) { shown = h.id; layer.classList.remove('on'); void layer.offsetWidth; }
        layer.classList.add('on');
    }
    const soon = () => { if (!raf) raf = requestAnimationFrame(tick); };
    function done(id) {
        if (hints[id]) return;
        hints[id] = Date.now();
        write(KH, hints);
        if (shown === id && layer) { layer.classList.remove('on'); shown = null; }
        setTimeout(soon, 400);
    }
    function hintLayer() {
        if (layer) return;
        layer = D.createElement('div');
        layer.id = 'fxHint';
        layer.setAttribute('aria-hidden', 'true');
        layer.setAttribute('data-noi18n', '');
        D.body.appendChild(layer);
        setTimeout(() => { armed = true; soon(); }, 1800);
        setInterval(soon, 700);
        root.addEventListener('resize', soon);
        D.addEventListener('scroll', soon, true);
        /* success = the first real use of the control */
        D.addEventListener('click', e => {
            const c = e.target && e.target.closest ? e.target : null;
            if (!c) return;
            if (c.closest('#lhDock,#tabbar .tb.scan')) done('scan');
            if (c.closest('#spFast')) done('fast');
            if (c.closest('#fxMilesBtn')) done('miles');
            if (c.closest('[data-sp="wardrobe"]')) done('wear');
            if (c.closest('.wd-item')) done('try');
        }, true);
        D.addEventListener('pointerdown', e => { if (e.target && e.target.closest && e.target.closest('#spBubble')) done('herb'); }, true);
    }

    /* ---------- 15 · milestones + good vibes ---------- */
    const vib = read(KV, { sent: {}, seen: {}, held: [], blocked: {}, recv: true, quiet: { on: true, from: '22:00', to: '08:00' } });
    const saveV = () => write(KV, vib);
    function me() {
        let m = null;
        try { m = root.LowiFood && root.LowiFood.meP ? root.LowiFood.meP() : null; } catch (e) {}
        let lv = m && m.lv || 1;
        try { if (root.LowiHost && root.LowiHost.level) lv = root.LowiHost.level() || lv; } catch (e) {}
        let name = '';
        try { name = root.LowiHost.user().name || ''; } catch (e) {}
        let uid = '';
        try { uid = root.LOWI_CLOUD.uid() || ''; } catch (e) {}
        return { n: name, uid, lv, streak: m && m.streak || 0 };
    }
    function people() { try { return root.LOWI_CLOUD && root.LOWI_CLOUD.people ? root.LOWI_CLOUD.people() : []; } catch (e) { return []; } }
    function line(m) {
        const who = m.mine ? (m.kind === 'level' ? t('yours') : t('you')) : esc(m.who);
        if (m.kind === 'level') return '<b>' + who + '</b> ' + t('lv') + ' <b>' + m.n + '</b>' + (t('lvEnd') ? ' ' + t('lvEnd') : '');
        return '<b>' + who + '</b> · ' + m.n + t('st');
    }
    const ICON = { level: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-8"/><path d="M12 13c0-4 3-7 7-7 0 4-3 7-7 7z"/><path d="M12 15c0-3-2.5-5.5-6-5.5 0 3.2 2.6 5.5 6 5.5z"/></svg>', streak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.8 1.2 2.8 2.3 3C11 9 11 6 12 3z"/></svg>', vibe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>' };
    function sheetHTML() {
        const list = visible(milestones(people(), me(), 40), vib).slice(0, 24);
        const rows = list.length ? list.map(m => '<li class="fx-mile ' + m.kind + (m.mine ? ' mine' : '') + '" data-k="' + esc(m.key) + '" data-u="' + esc(m.uid) + '" data-n="' + esc(m.who) + '"><span class="fx-mi">' + ICON[m.kind] + '</span><span class="fx-mt">' + line(m) + '</span>' +
            (m.mine ? '' : '<button class="fx-vibe' + (vib.sent[m.key] ? ' on' : '') + '" data-fx="vibe" aria-expanded="false"' + (vib.sent[m.key] ? ' disabled' : '') + '>' + ICON.vibe + '<span>' + (vib.sent[m.key] ? t('sent') : t('vibe')) + '</span></button><button class="fx-more" data-fx="more" aria-expanded="false" aria-label="' + t('more') + '">\u22ef</button>' +
            '<div class="fx-pick" role="group" aria-label="' + t('pick') + '" hidden>' + REACTIONS.map(r => '<button data-fx="send" data-r="' + r.id + '">' + r.e + ' ' + r.txt[L()] + '</button>').join('') + '</div>' +
            '<div class="fx-mod" hidden><button data-fx="hide">' + t('hide') + '</button><button data-fx="report">' + t('report') + '</button></div>') + '</li>').join('') :
            '<li class="fx-empty">' + t('empty') + '</li>';
        return '<button class="xbtn" data-act="close-sheet" aria-label="' + t('close') + '">×</button><div class="sheetbody fx-sheet" data-noi18n><div class="fx-over">' + t('miles').toUpperCase() + '</div><div class="h2">' + t('miles') + '</div><p class="fx-sub">' + t('sub') + '</p><ul class="fx-miles">' + rows + '</ul><p class="fx-priv">' + t('privacy') + '</p>' +
            '<div class="fx-quiet"><div><b>' + t('recv') + '</b><span>' + t('recvSub') + '</span></div><button class="fx-tog' + (vib.recv ? ' on' : '') + '" data-fx="recv" role="switch" aria-checked="' + !!vib.recv + '" aria-label="' + t('recv') + '"><i></i></button></div>' +
            '<div class="fx-quiet"><div><b>' + t('quiet') + '</b><span>' + t('quietSub') + '</span></div><button class="fx-tog' + (vib.quiet.on ? ' on' : '') + '" data-fx="quiet" role="switch" aria-checked="' + !!vib.quiet.on + '" aria-label="' + t('quiet') + '"><i></i></button></div></div>';
    }
    function openMiles() {
        const h = root.LowiHost;
        if (!h || !h.openSheet) return;
        h.openSheet(sheetHTML());
        setTimeout(soon, 450);
    }
    function burst(btn) {
        if (reduced()) return;
        const s = D.createElement('i');
        s.className = 'fx-burst';
        btn.appendChild(s);
        setTimeout(() => s.remove(), 900);
    }
    function sendVibe(btn) {
        const li = btn.closest('.fx-mile'), r = REACTIONS.find(x => x.id === btn.dataset.r) || REACTIONS[0];
        if (!li) return;
        const k = li.dataset.k, u = li.dataset.u, n = li.dataset.n || '', vb = li.querySelector('.fx-vibe');
        if (!k || vib.sent[k]) return;
        vib.sent[k] = Date.now();
        saveV();
        li.querySelectorAll('.fx-pick,.fx-mod').forEach(x => { x.hidden = true; });
        if (vb) {
            vb.classList.add('on');
            vb.disabled = true;
            vb.setAttribute('aria-expanded', 'false');
            const sp = vb.querySelector('span');
            if (sp) sp.textContent = r.e + ' ' + t('sent');
            burst(vb);
        }
        done('vibes');
        toast(t('sentTo') + n + t('sentEnd'));
        /* delivered through the room's reactions when the cloud is live; stays on this phone otherwise */
        cloudMark('vibes:' + u + ':' + k.split(':').pop(), r.e);
    }
    function cloudMark(id, emoji) {
        try {
            const sb = root.LOWI_CLOUD_X && root.LOWI_CLOUD_X.client && root.LOWI_CLOUD.live() ? root.LOWI_CLOUD_X.client() : null;
            if (sb && !/:$|::/.test(id)) sb.from('reactions').insert({ message_id: id, who: me().n || 'Member', emoji }).then(() => {}, () => {});
        } catch (e) {}
    }
    function toggle(btn, sel) {
        const li = btn.closest('.fx-mile');
        if (!li) return;
        li.querySelectorAll('.fx-pick,.fx-mod').forEach(x => { const open = x.matches(sel) && x.hidden; x.hidden = !open; });
        li.querySelectorAll('[aria-expanded]').forEach(x => x.setAttribute('aria-expanded', String(!!(x === btn && !li.querySelector(sel).hidden))));
        setTimeout(soon, 50);
    }
    function hidePerson(btn, report) {
        const li = btn.closest('.fx-mile');
        if (!li) return;
        const id = li.dataset.u || li.dataset.n;
        vib.blocked[id] = report ? 'report' : 'hide';
        saveV();
        if (report) cloudMark('report:' + (li.dataset.u || ''), '\u2691');
        D.querySelectorAll('.fx-mile').forEach(x => { if ((x.dataset.u || x.dataset.n) === id) x.remove(); });
        toast(t(report ? 'reported' : 'hidden'), 3000);
    }
    async function pollVibes() {
        try {
            if (!vib.recv || !root.LOWI_CLOUD || !root.LOWI_CLOUD.live() || !root.LOWI_CLOUD_X) return;
            const uid = root.LOWI_CLOUD.uid();
            if (!uid) return;
            const r = await root.LOWI_CLOUD_X.client().from('reactions').select('message_id,user_id,who').like('message_id', 'vibes:' + uid + ':%').limit(200);
            if (r.error || !r.data) return;
            const inc = r.data.filter(x => !vib.blocked[x.user_id] && !vib.blocked[x.who]).map(x => ({ id: x.message_id + ':' + x.user_id, who: x.who || '' }));
            const s = sortIncoming(inc, vib.seen, new Date(), vib.quiet);
            s.hold.forEach(v => { vib.seen[v.id] = 1; vib.held.push(v.who); });
            s.show.forEach(v => { vib.seen[v.id] = 1; });
            if (!isQuiet(new Date(), vib.quiet) && vib.held.length) { toast(vib.held.length + t('gotN'), 3200); vib.held = []; }
            else if (s.show.length) toast((s.show.length === 1 ? s.show[0].who : s.show.length) + t('got'), 3000);
            saveV();
        } catch (e) {}
    }
    function milesBtn() {
        const h1 = D.querySelector('#tab-foryou .ls-phd .h1');
        if (!h1 || h1.querySelector('#fxMilesBtn')) return;
        const b = D.createElement('button');
        b.id = 'fxMilesBtn';
        b.type = 'button';
        b.setAttribute('data-noi18n', '');
        b.setAttribute('data-fx', 'miles');
        b.setAttribute('aria-label', t('miles'));
        b.innerHTML = ICON.vibe + '<span>' + t('miles') + '</span>';
        h1.appendChild(b);
    }
    function boot() {
        if (!D.body) { setTimeout(boot, 50); return; }
        glow();
        hintLayer();
        paintTint();
        const tb = D.getElementById('tabbar');
        if (tb) new MutationObserver(paintTint).observe(tb, { subtree: true, attributes: true, attributeFilter: ['class'] });
        new MutationObserver(paintTint).observe(H, { attributes: true, attributeFilter: ['class'] });
        const cm = D.getElementById('tab-foryou');
        if (cm) new MutationObserver(milesBtn).observe(cm, { childList: true });
        milesBtn();
        D.addEventListener('click', e => {
            const b = e.target && e.target.closest && e.target.closest('[data-fx]');
            if (!b) return;
            const a = b.dataset.fx;
            if (a === 'miles') { e.preventDefault(); e.stopPropagation(); openMiles(); }
            else if (a === 'vibe') { e.preventDefault(); toggle(b, '.fx-pick'); }
            else if (a === 'more') { e.preventDefault(); toggle(b, '.fx-mod'); }
            else if (a === 'send') { e.preventDefault(); sendVibe(b); }
            else if (a === 'hide' || a === 'report') { e.preventDefault(); hidePerson(b, a === 'report'); }
            else if (a === 'recv') { vib.recv = !vib.recv; saveV(); b.classList.toggle('on', vib.recv); b.setAttribute('aria-checked', String(vib.recv)); }
            else if (a === 'quiet') { vib.quiet.on = !vib.quiet.on; saveV(); b.classList.toggle('on', vib.quiet.on); b.setAttribute('aria-checked', String(vib.quiet.on)); }
        }, true);
        setTimeout(pollVibes, 6000);
        setInterval(pollVibes, 120000);
    }
    root.LowiExtras = { openMiles, done, hints: () => Object.assign({}, hints), vibes: () => JSON.parse(JSON.stringify(vib)), tint: () => H.getAttribute('data-tint') };
    const v = D.querySelector('meta[name="lowi-build"]');
    if (!D.getElementById('fxCss')) {
        const l = D.createElement('link');
        l.id = 'fxCss';
        l.rel = 'stylesheet';
        l.href = 'finch-extras.css?v=' + (v ? v.content : '1');
        D.head.appendChild(l);
    }
    boot();
})(typeof window !== 'undefined' ? window : globalThis);
