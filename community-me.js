/* community-me.js: your corner of Community (Oct 21 2026, Emmanuel: "Community holds the profile and everything we built; Settings
   is only the necessary stuff"). In Community, your picture (top right, #pfBtn) opens this panel instead of jumping to the Profile
   tab: you at the top, then Profile, Weight & BMI and Weight journey.
   Oct 22 2026 (Emmanuel: "remove the explore things and have the more important things in there"): the Explore list is gone (each place
   keeps its own way in, see EXPLORE_MOVED in home-settings-sleep-v2.js) and the Settings live here now: Day/night, Look & sound,
   Language, Tutorial, Account, then Delete account in red at the bottom and the version line. Every way to the old Settings sheet
   (the hold on the Community bubble, openSettings) opens this hub, so nothing lives in two places. World sound is not a row here: it
   moves inside Look & sound. Rows run through the same routes as Settings (home-settings-sleep-v2.js), so a route that is missing
   right now is simply not listed. Outside Community the picture still opens the Profile tab as before.
   Dark glass, glowing cyan edge, no emoji. Nothing here stores data. */
(function (root) {
    'use strict';
    const TX = {
        en: { title: 'Settings', you: 'You', circle: 'Circle', settings: 'App', help: 'Help & info', account: 'Account', close: 'Close', level: 'Level', guest: 'You', mine: 'Name, photo, weight, health, account' },
        de: { title: 'Einstellungen', you: 'Du', circle: 'Circle', settings: 'App', help: 'Hilfe & Info', account: 'Konto', close: 'Schlie\u00dfen', level: 'Level', guest: 'Du', mine: 'Name, Foto, Gewicht, Gesundheit, Konto' },
        es: { title: 'Ajustes', you: 'T\u00fa', circle: 'Circle', settings: 'App', help: 'Ayuda e info', account: 'Cuenta', close: 'Cerrar', level: 'Nivel', guest: 'T\u00fa', mine: 'Nombre, foto, peso, salud, cuenta' }
    };
    /* the places that only work on Home (they press a Home control): go Home first, then run */
    const HOME_FIRST = ['gift', 'myday'];  /* myday: its bubbles open Home's old day panels (index.html g2h) */
    const wnm = s => { try { const B = (typeof window !== 'undefined' ? window : globalThis).LowiBirthCompanion; return s && B && B.withName ? B.withName(s) : s; } catch (e) { return s; } }; /* BH-045: the user's own companion name, never the default "Misty" */
    const LABELS = {
        en: { presence: 'Your presence', swaps: 'My swaps', glow: 'Your glow', cycle: 'My cycle', todo: 'Finish your profile', people: 'People', posts: 'Posts & ranking', invite: 'Invite friends', rules: 'Circle rules', look: 'Look & sound' },
        de: { presence: 'Dein Auftritt', swaps: 'Meine Swaps', glow: 'Dein Glow', cycle: 'Mein Zyklus', todo: 'Profil fertig machen', people: 'Leute', posts: 'Posts & Ranking', invite: 'Freunde einladen', rules: 'Regeln im Circle', look: 'Aussehen & Ton' },
        es: { presence: 'Tu presencia', swaps: 'Mis swaps', glow: 'Tu glow', cycle: 'Mi ciclo', todo: 'Completa tu perfil', people: 'Gente', posts: 'Posts y ranking', invite: 'Invitar amigos', rules: 'Normas del Circle', look: 'Aspecto y sonido' }
    };
    const P = 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"';
    const ICON = {
        presence: '<path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z" ' + P + '/><path d="M9.2 12.2l2 2 3.8-4" ' + P + '/>',
        swaps: '<path d="M7 4h10a1 1 0 011 1v15l-6-4-6 4V5a1 1 0 011-1z" ' + P + '/>',
        glow: '<circle cx="12" cy="12" r="4" ' + P + '/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" ' + P + '/>',
        cycle: '<circle cx="12" cy="12" r="7.5" ' + P + '/><circle cx="10.6" cy="10.8" r="2.6" ' + P + '/><circle cx="15.3" cy="14.6" r="1" ' + P + '/>',
        todo: '<rect x="5" y="4" width="14" height="16.5" rx="2.5" ' + P + '/><path d="M8.5 10l2 2 4-4M8.5 16h7" ' + P + '/>',
        people: '<circle cx="9" cy="9" r="3.2" ' + P + '/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" ' + P + '/><circle cx="16.8" cy="9.8" r="2.5" ' + P + '/><path d="M15.6 14.4a4.6 4.6 0 0 1 5.4 4.6" ' + P + '/>',
        posts: '<path d="M4 5.5h12a1.5 1.5 0 011.5 1.5v7a1.5 1.5 0 01-1.5 1.5H9l-4 3.5V7A1.5 1.5 0 014 5.5z" ' + P + '/><path d="M17.5 9H20a1 1 0 011 1v9.5L18 17h-6.5" ' + P + '/>',
        invite: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" ' + P + '/>',
        rules: '<path d="M6 4h9l3 3v13H6z" ' + P + '/><path d="M9 10h6M9 13.5h6M9 17h4" ' + P + '/>',
        x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" ' + P + ' stroke-width="2.2"/>',
        chev: '<path d="M9.5 6l6 6-6 6" ' + P + '/>'
    };
    /* Oct 29 2026 (Emmanuel: "alles bei Community ... sinngemäß, richtig sortiert ... so wie Apple iOS mit der Einstellung", then
       "doppelt gemappte ... alles in einer Seite, schmeiß alles andere raus"): this is the ONE settings page. It opens from the
       Community name in the middle of the Circle header; the picture and the day/night button top right, the hold on the Community
       bubble, the Circle drop-down menu and the Profile tile grid are gone as ways in. Your picture card at the top opens Your details
       (name, photo, weight & BMI, health, email/password), so Profile, Weight & BMI and Account are no longer rows of their own.
       Heute nachtragen moved into My day. Each id is listed once, in one group, iOS style. */
    const GROUPS = [
        { key: 'you', ids: ['myday', 'swaps', 'glow', 'cycle', 'todo'] },
        { key: 'circle', ids: ['presence', 'people', 'posts', 'invite'] },
        { key: 'settings', ids: ['theme', 'language', 'notifications', 'look'] },
        { key: 'help', ids: ['tutorial', 'support', 'rules', 'about'] },
        { key: 'danger', ids: ['deleteAccount'] }
    ];
    const SKIP = ['worldSound', 'catchUp', 'me', 'body', 'account'];
    /* the rows this page runs itself; every other id runs through the Settings routes (home-settings-sleep-v2.js) */
    const OWN = ['presence', 'swaps', 'glow', 'cycle', 'todo', 'people', 'posts', 'invite', 'rules', 'look'];
    const G2E = { swaps: 'swaps', glow: 'glow', todo: 'todo', posts: 'comm', look: 'look' };
    function groups(has) {
        return GROUPS.map(g => ({ key: g.key, ids: g.ids.filter(id => !SKIP.includes(id) && has(id)) })).filter(g => g.ids.length);
    }
    /* 29 Oct 2026 bug hunt: the XP under your name followed the phone's own locale (2,400 in a German app on an English phone) while
       Misty's card already formats by the app language (companion.js nf). Same rule here: de 2.400, es 2400, en 2,400. */
    const xpText = (n, l) => { let s; try { s = Number(n).toLocaleString({ de: 'de-DE', es: 'es-ES' }[l] || 'en-US'); } catch (e) { s = String(n); } return s + ' XP'; };
    const core = { TX, HOME_FIRST, SKIP, OWN, GROUPS, G2E, groups, xpText };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!root || !root.document) return;

    const D = root.document, H = D.documentElement;
    const lang = () => { const l = (H.lang || 'en').slice(0, 2); return TX[l] ? l : 'en'; };
    const S = () => root.LowiHomeSettingsSleepV2 || null;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const svg = (k, cls) => '<svg class="' + (cls || 'cme-ico') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICON[k] || '') + '</svg>';
    let ov = null, el = null, back = null, lastFocus = null, asking = false, armed = false;
    const inCommunity = () => { const t = D.getElementById('tab-foryou'); return !!(t && (t.classList.contains('active') || t.classList.contains('on') || t.getBoundingClientRect().width > 2 && getComputedStyle(t).display !== 'none')) && !H.classList.contains('wh-home'); };
    const hasPresence = () => !!(root.LowiCommunity && typeof root.LowiCommunity.settings === 'function');
    function me() {
        let name = '', xp = 0;
        try { const s = JSON.parse(root.localStorage.getItem('lowispike.v2') || '{}'); name = (s.user && s.user.name) || ''; xp = +s.xp || 0; } catch (e) { }
        return { name, xp };
    }
    const sT = () => { const s = S(), l = lang(); return (s && s.TX && (s.TX[l] || s.TX.en)) || {}; };
    function row(id) {
        const s = S(), l = lang(), ST = sT(), lab = wnm(LABELS[l] && LABELS[l][id]) || s.label(id);
        const ico = ICON[id] ? svg(id) : s.icon(id).replace('ss2-ico', 'cme-ico');
        if (id === 'language') { return '<div class="cme-row cme-langrow" role="group" aria-label="' + esc(lab) + '">' + ico + '<span class="cme-tx"><b>' + esc(lab) + '</b></span><span class="cme-langs">' + ['en', 'de', 'es'].map(x => '<button type="button" data-lang="' + x + '" aria-pressed="' + (x === l) + '"' + (x === l ? ' class="on"' : '') + '>' + x.toUpperCase() + '</button>').join('') + '</span></div>'; }
        if (id === 'theme') { const dark = s.state ? s.state('theme') : true, st = dark ? ST.night : ST.day; return '<button type="button" class="cme-row" role="switch" data-cme="theme" aria-checked="' + dark + '" aria-label="' + esc(lab) + ': ' + esc(st) + '">' + ico + '<span class="cme-tx"><b>' + esc(lab) + '</b></span><small class="cme-st">' + esc(st) + '</small></button>'; }
        if (id === 'deleteAccount') return '<button type="button" class="cme-row cme-danger" data-cme="deleteAccount" aria-haspopup="dialog">' + ico + '<span class="cme-tx"><b>' + esc(lab) + '</b></span>' + svg('chev', 'cme-chev') + '</button>';
        return '<button type="button" class="cme-row" data-cme="' + id + '">' + ico + '<span class="cme-tx"><b>' + esc(lab) + '</b></span>' + svg('chev', 'cme-chev') + '</button>';
    }
    /* which rows exist right now: a Profile part only while Profile has it, My cycle only for whom it is on, Finish your profile only
       while steps are left */
    const PART = { swaps: '.r3a-saved', glow: '[data-act="glow"]', posts: '.r3-comm, .fy-prof', todo: '.r3-todo', look: '.r2-look, .sfx-card, .sfx-sec, [data-act=install]' };
    function hasRow(id) {
        const s = S();
        if (id === 'presence') return hasPresence();
        if (G2E[id]) { if (!(root.LowiG2E && typeof root.LowiG2E.direct === 'function')) return id === 'look' && s.has('look'); const t = D.getElementById('tab-profile'); return !!(t && t.querySelector(PART[id])); }
        if (id === 'cycle') { try { const C = root.LowiCycleWorld; return !!(C && typeof C.open === 'function' && (typeof C.eligible !== 'function' || C.eligible())); } catch (e) { return false; } }
        if (id === 'people') return !!(root.LowiPeopleDir && typeof root.LowiPeopleDir.open === 'function');
        if (id === 'invite') return !!(root.LowiRoomsUI && typeof root.LowiRoomsUI.invite === 'function');
        if (id === 'rules') return !!(root.LowiCommunityWelcome && typeof root.LowiCommunityWelcome.open === 'function');
        return s.has(id);
    }
    function render() {
        const s = S(), T = TX[lang()], m = me(), pf = D.getElementById('pfBtn');
        const av = pf ? pf.innerHTML : '';
        const gs = groups(hasRow), ver = s.version ? s.version() : '';
        const sec = g => g.key === 'danger'
            ? '<section class="cme-sec cme-sec-danger" aria-label="' + T.account + '"><div class="cme-list">' + g.ids.map(row).join('') + '</div></section>'
            : '<section class="cme-sec" aria-label="' + T[g.key] + '"><h3>' + T[g.key] + '</h3><div class="cme-list">' + g.ids.map(row).join('') + '</div></section>';
        /* iOS style: the title, then your card (picture, name, level) that opens Your details */
        el.innerHTML = '<div class="cme-top"><h2 class="cme-h" id="cmeTitle">' + esc(T.title) + '</h2>' +
            (ov ? '' : '<button type="button" class="cme-ibtn" data-cme="close" aria-label="' + T.close + '">' + svg('x') + '</button>') + '</div>' +
            '<div class="cme-body"><button type="button" class="cme-head cme-me" data-cme="me">' +
            '<span class="cme-av" aria-hidden="true">' + av + '</span>' +
            '<span class="cme-who"><b>' + esc(m.name || T.guest) + '</b><small>' + (m.xp ? xpText(m.xp, lang()) + ' \u00b7 ' : '') + esc(T.mine) + '</small></span>' + svg('chev', 'cme-chev') + '</button>' +
            gs.map(sec).join('') + (ver ? '<p class="cme-ver">' + esc(ver) + '</p>' : '') + '</div>';
    }
    /* Delete account asks first, inside the hub; only the server's ok clears the phone (home-settings-sleep-v2.js serverDelete) */
    function askDelete() {
        const s = S(), ST = sT(), signed = !!(s.signedIn && s.signedIn()), body = el && el.querySelector('.cme-body'); if (!body) return;
        asking = true;
        body.innerHTML = '<section class="cme-sec cme-del" role="alertdialog" aria-labelledby="cmeDelT" aria-describedby="cmeDelTx"><h3 id="cmeDelT">' + esc(ST.delTitle) + '</h3>' +
            '<p class="cme-del-tx" id="cmeDelTx">' + esc(signed ? ST.delBody : ST.delGuest) + '</p><div class="cme-list">' +
            '<button type="button" class="cme-row cme-danger cme-del-go" data-cme="delGo" data-guest="' + !signed + '"><span class="cme-tx"><b>' + esc(signed ? ST.delGo : ST.delGuestGo) + '</b></span></button>' +
            '<button type="button" class="cme-row" data-cme="delCancel"><span class="cme-tx"><b>' + esc(ST.delCancel) + '</b></span></button></div></section>';
        const c = body.querySelector('[data-cme="delCancel"]'); if (c) { try { c.focus({ preventScroll: true }); } catch (e) { } }
    }
    async function delGo(b) {
        const s = S(), ST = sT(); if (b.disabled) return;
        if (b.getAttribute('data-guest') === 'true') { s.wipeDevice(); return; }
        b.disabled = true; const lb = b.querySelector('b'); if (lb) lb.textContent = ST.delBusy;
        const r = await s.deleteAccount(); if (r === true) return;
        b.disabled = false; if (lb) lb.textContent = ST.delGo;
        const tx = el && el.querySelector('.cme-del-tx'); if (tx) { tx.textContent = r === 'owner' ? ST.delOwner : ST.delFail; tx.setAttribute('role', 'alert'); }
    }
    function open() {
        const s = S(); if (!s || typeof s.has !== 'function') return false;
        if (el) return true;
        lastFocus = D.activeElement; asking = false;
        /* opened by a hold, the finger is still down: the click that ends that hold must not close the hub or press a row, so only a
           press that starts after it opened (or a keyboard click) counts */
        armed = false;
        const arm = () => { armed = true; };
        const R2 = root.LowiR2;
        /* Oct 22 One UI: the hub lives in the one shared sheet shell (LowiR2.sheet + one-sheet.css): the same dark glass, grab handle,
           drag to close and round X at the bottom centre as Fuel, Log a meal and Misty's sheet. The old free-standing card stays only as a
           fallback if the shell is missing. */
        if (R2 && typeof R2.sheet === 'function') {
            try { ov = R2.sheet('<div class="cme cme-in" id="cmeSheet"></div>', { cls: 'cme-ov one-sheet', onClose: () => done(false) }); } catch (e) { ov = null; }
        }
        if (ov) {
            el = ov.querySelector('#cmeSheet');
            const sh = ov.querySelector('.r2-sh'); if (sh) sh.setAttribute('aria-labelledby', 'cmeTitle');
            ov.addEventListener('pointerdown', arm, true);
            ov.addEventListener('click', e => { if (!armed && e.detail !== 0) { e.preventDefault(); e.stopPropagation(); return; } if (el && el.contains(e.target)) onClick(e); }, true);
            render(); H.classList.add('cme-open');
            return true;
        }
        back = D.createElement('div'); back.className = 'cme-back'; back.addEventListener('pointerdown', arm); back.addEventListener('click', e => { if (armed || e.detail === 0) close(true); });
        el = D.createElement('div'); el.className = 'cme'; el.id = 'cmeSheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'cmeTitle');
        el.addEventListener('pointerdown', arm, true); el.addEventListener('click', e => { if (!armed && e.detail !== 0) { e.preventDefault(); e.stopPropagation(); return; } onClick(e); }, true);
        render();
        D.body.appendChild(back); D.body.appendChild(el); H.classList.add('cme-open');
        const f = el.querySelector('.cme-me') || el.querySelector('button'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } }
        return true;
    }
    function done(refocus) {
        if (!ov) return;
        ov = null; el = null; asking = false; H.classList.remove('cme-open');
        if (refocus && lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { } }
    }
    function close(refocus) {
        if (!el) return;
        if (ov) { const o = ov; done(refocus); try { root.LowiR2.close(o); } catch (e) { o.remove(); } return; }
        el.remove(); if (back) back.remove(); el = null; back = null; asking = false; H.classList.remove('cme-open');
        if (refocus && lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { } }
    }
    function onClick(e) {
        const b = e.target && e.target.closest && e.target.closest('[data-cme]'); if (!b) return;
        e.preventDefault();
        const id = b.getAttribute('data-cme'), s = S();
        if (id === 'close') { close(true); return; }
        if (id === 'deleteAccount') { askDelete(); return; }
        if (id === 'delCancel') { asking = false; render(); const f = el && el.querySelector('[data-cme="deleteAccount"]'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } } return; }
        if (id === 'delGo') { delGo(b); return; }
        /* Day/night switches in place and the page stays open */
        if (id === 'theme') { s.run('theme'); setTimeout(() => { if (el && !asking) { render(); const f = el.querySelector('[data-cme="theme"]'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } } } }, 60); return; }
        close(false);
        run(id);
    }
    /* one place that knows where each row goes; a page or sheet you open from here brings this page back when you leave it */
    function run(id) {
        const s = S();
        try {
            if (id === 'me') { const Y = root.LowiYourDetails; if (Y && typeof Y.open === 'function') Y.open({ onDone: () => open() }); else if (s) away(() => s.run('me')); return; }
            if (id === 'presence') { if (hasPresence()) root.LowiCommunity.settings(); return; }
            if (G2E[id] && root.LowiG2E && typeof root.LowiG2E.direct === 'function') { away(() => root.LowiG2E.direct(G2E[id])); return; }
            if (id === 'look') { away(() => s.run('look')); return; }
            if (id === 'cycle') { root.LowiCycleWorld.open(); return; }
            if (id === 'people') { root.LowiPeopleDir.open(); return; }
            if (id === 'invite') { root.LowiRoomsUI.invite(); return; }
            if (id === 'rules') { root.LowiCommunityWelcome.open(); return; }
        } catch (x) { console.error(x); return; }
        if (HOME_FIRST.includes(id) && typeof root.goTab === 'function') { root.goTab('home'); setTimeout(() => s.run(id), 700); return; }
        away(() => s.run(id));
    }
    /* Oct 28 2026 (owner request 13, Emmanuel: Back from the full Profile went all the way to Home): a row that takes you to a
       page (Profile, Settings) asks the back path to bring this panel back where it was, so one Back returns here */
    function away(go) {
        const L = root.LowiSections, t0 = L && typeof L.tab === 'function' ? L.tab() : '';
        go();
        try { if (L && typeof L.reopen === 'function' && L.tab() !== t0) L.reopen(() => open()); } catch (x) { }
    }
    /* Oct 29 2026: the picture top right is gone; the Community name in the Circle header opens this page (community-rooms-ui.js) */
    D.addEventListener('keydown', e => {
        if (!el) return;
        if (e.key === 'Escape') { close(true); return; }
        if (e.key === 'Tab' && !ov) { const bs = [...el.querySelectorAll('button')]; const i = bs.indexOf(D.activeElement), last = bs.length - 1; if (e.shiftKey && i <= 0) { e.preventDefault(); bs[last].focus(); } else if (!e.shiftKey && (i === last || i < 0)) { e.preventDefault(); bs[0].focus(); } }
    });
    D.addEventListener('lowi:tab', () => close(false));
    try { new MutationObserver(() => { if (el && !asking) render(); }).observe(H, { attributes: true, attributeFilter: ['lang'] }); } catch (e) { }
    root.LowiCommunityMe = Object.assign({}, core, { open, close: () => close(false), isOpen: () => !!el });
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
