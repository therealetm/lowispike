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
        en: { more: 'More places', title: 'You', you: 'You', settings: 'Settings', account: 'Account', close: 'Close', level: 'Level', guest: 'You', hold: 'Tip: hold the Community bubble on Home to open this from anywhere.' },
        de: { more: 'Weitere Orte', title: 'Du', you: 'Du', settings: 'Einstellungen', account: 'Konto', close: 'Schlie\u00dfen', level: 'Level', guest: 'Du', hold: 'Tipp: Halte die Community-Blase auf Home, um das hier jederzeit zu \u00f6ffnen.' },
        es: { more: 'M\u00e1s lugares', title: 'T\u00fa', you: 'T\u00fa', settings: 'Ajustes', account: 'Cuenta', close: 'Cerrar', level: 'Nivel', guest: 'T\u00fa', hold: 'Consejo: mant\u00e9n la burbuja Comunidad en Inicio para abrir esto desde cualquier sitio.' }
    };
    /* the places that only work on Home (they press a Home control): go Home first, then run */
    const HOME_FIRST = ['gift', 'myday'];  /* myday: its bubbles open Home's old day panels (index.html g2h) */
    const wnm = s => { try { const B = (typeof window !== 'undefined' ? window : globalThis).LowiBirthCompanion; return s && B && B.withName ? B.withName(s) : s; } catch (e) { return s; } }; /* BH-045: the user's own companion name, never the default "Misty" */
    const LABELS = {
        en: { me: 'Profile', presence: 'Your presence', body: 'Weight & BMI', weight: 'Weight journey' }, de: { me: 'Profil', presence: 'Dein Auftritt', body: 'Gewicht & BMI', weight: 'Gewichtsreise' }, es: { me: 'Perfil', presence: 'Tu presencia', body: 'Peso e IMC', weight: 'Tu camino de peso' }
    };
    const SUB = {
        en: { me: 'Name, photo, goals', presence: 'Companion in the galaxy, sharing, quiet hours, blocked people', body: 'Weigh in, BMI, goal and chart', weight: 'Start date, chart and goal', foryou: 'Shuffle of recipes and moves', care: 'Look after each other', workouts: 'Guided sessions', gift: 'Misty\u2019s daily gift', hunt: 'Find it in the shop' },
        de: { me: 'Name, Foto, Ziele', presence: 'Begleiter in der Galaxie, Freigaben, Ruhezeiten, Blockierte', body: 'Wiegen, BMI, Ziel und Verlauf', weight: 'Startdatum, Verlauf und Ziel', foryou: 'Mix aus Rezepten und Moves', care: 'Aufeinander achten', workouts: 'Gef\u00fchrte Einheiten', gift: 'Mistys Tagesgeschenk', hunt: 'Im Laden finden' },
        es: { me: 'Nombre, foto, metas', presence: 'Compa\u00f1ero en la galaxia, compartir, horas de silencio, bloqueados', body: 'Pesarte, IMC, meta y gr\u00e1fico', weight: 'Fecha de inicio, gr\u00e1fico y meta', foryou: 'Mezcla de recetas y movimientos', care: 'Cuidarnos entre todos', workouts: 'Sesiones guiadas', gift: 'El regalo diario de Misty', hunt: 'Encu\u00e9ntralo en la tienda' }
    };
    const P = 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"';
    const ICON = {
        foryou: '<path d="M4 7h4l8 10h4M4 17h4l2.5-3.1M13.5 10.1 16 7h4M18 5l2 2-2 2M18 15l2 2-2 2" ' + P + '/>',
        care: '<path d="M12 19s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 7.6a3.8 3.8 0 0 1 7 2.2C19 14.7 12 19 12 19z" ' + P + '/>',
        workouts: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" ' + P + '/>',
        gift: '<rect x="4.5" y="9" width="15" height="10.5" rx="2" ' + P + '/><path d="M3.5 9h17M12 9v10.5M12 9c-1.5-3.5-5.5-3.5-5-1 .3 1 2.5 1 5 1zm0 0c1.5-3.5 5.5-3.5 5-1-.3 1-2.5 1-5 1z" ' + P + '/>',
        hunt: '<path d="M4 5h2l2 10h10l2-7H7" ' + P + '/><circle cx="9.5" cy="19" r="1.3" ' + P + '/><circle cx="16.5" cy="19" r="1.3" ' + P + '/>',
        presence: '<path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z" ' + P + '/><path d="M9.2 12.2l2 2 3.8-4" ' + P + '/>',
        weight: '<path d="M4 19h16M5 15l4-4 3 2 6-7" ' + P + '/><circle cx="18" cy="6" r="1.6" ' + P + '/>',
        gear: '<circle cx="12" cy="12" r="3" ' + P + '/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6" ' + P + '/>',
        x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" ' + P + ' stroke-width="2.2"/>',
        chev: '<path d="M9.5 6l6 6-6 6" ' + P + '/>'
    };
    /* YOU, then SETTINGS (the switches, language, tutorial, account), then Delete account on its own at the bottom; World sound is left
       out (it lives inside Look & sound) and so are places, which now have their own way in */
    const SKIP = ['worldSound'];
    function groups(has) {
        const S = root && root.LowiHomeSettingsSleepV2, C = S && S.COMMUNITY_PLACES || { you: ['me', 'body'] };
        const set = (S && S.SETTINGS_IDS || ['theme', 'look', 'language', 'tutorial']).filter(id => !SKIP.includes(id));
        const acc = S && S.ACCOUNT_IDS || ['account', 'deleteAccount'];
        const light = (S && S.EXPLORE_LIGHT || []).filter(has);
        /* Oct 22 2026 (Emmanuel: "why don't we just put that into where my profile is? So it's not a different badge"): Your presence
           (companion form in the galaxy, sharing, quiet hours, blocked people) is a tile right after Profile; the shield badge next to
           the Community name is gone. It opens the same sheet (LowiCommunity.settings), so saved settings and saving stay as they were. */
        const you = C.you.filter(has), at = you.indexOf('me');
        if (has('presence') && !you.includes('presence')) you.splice(at < 0 ? 0 : at + 1, 0, 'presence');
        return [{ key: 'you', ids: you, more: light }, { key: 'settings', ids: set.concat(acc.filter(id => id !== 'deleteAccount')).filter(has) }, { key: 'danger', ids: acc.filter(id => id === 'deleteAccount').filter(has) }].filter(g => g.ids.length);
    }
    /* 29 Oct 2026 bug hunt: the XP under your name followed the phone's own locale (2,400 in a German app on an English phone) while
       Misty's card already formats by the app language (companion.js nf). Same rule here: de 2.400, es 2400, en 2,400. */
    const xpText = (n, l) => { let s; try { s = Number(n).toLocaleString({ de: 'de-DE', es: 'es-ES' }[l] || 'en-US'); } catch (e) { s = String(n); } return s + ' XP'; };
    const core = { TX, HOME_FIRST, SKIP, groups, xpText };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!root || !root.document) return;

    const D = root.document, H = D.documentElement;
    const lang = () => { const l = (H.lang || 'en').slice(0, 2); return TX[l] ? l : 'en'; };
    const S = () => root.LowiHomeSettingsSleepV2 || null;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const svg = (k, cls) => '<svg class="' + (cls || 'cme-ico') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICON[k] || '') + '</svg>';
    let ov = null, el = null, back = null, lastFocus = null, asking = false, armed = false, moreOpen = false;
    const inCommunity = () => { const t = D.getElementById('tab-foryou'); return !!(t && (t.classList.contains('active') || t.classList.contains('on') || t.getBoundingClientRect().width > 2 && getComputedStyle(t).display !== 'none')) && !H.classList.contains('wh-home'); };
    const hasPresence = () => !!(root.LowiCommunity && typeof root.LowiCommunity.settings === 'function');
    function me() {
        let name = '', xp = 0;
        try { const s = JSON.parse(root.localStorage.getItem('lowispike.v2') || '{}'); name = (s.user && s.user.name) || ''; xp = +s.xp || 0; } catch (e) { }
        return { name, xp };
    }
    const sT = () => { const s = S(), l = lang(); return (s && s.TX && (s.TX[l] || s.TX.en)) || {}; };
    function row(id) {
        const s = S(), l = lang(), ST = sT(), lab = wnm(LABELS[l] && LABELS[l][id]) || s.label(id), sub = (SUB[l] && SUB[l][id]) || '';
        const ico = ICON[id] ? svg(id) : s.icon(id).replace('ss2-ico', 'cme-ico');
        if (id === 'language') { return '<div class="cme-row cme-langrow" role="group" aria-label="' + esc(lab) + '">' + ico + '<span class="cme-tx"><b>' + esc(lab) + '</b></span><span class="cme-langs">' + ['en', 'de', 'es'].map(x => '<button type="button" data-lang="' + x + '" aria-pressed="' + (x === l) + '"' + (x === l ? ' class="on"' : '') + '>' + x.toUpperCase() + '</button>').join('') + '</span></div>'; }
        if (id === 'theme') { const dark = s.state ? s.state('theme') : true, st = dark ? ST.night : ST.day; return '<button type="button" class="cme-row" role="switch" data-cme="theme" aria-checked="' + dark + '" aria-label="' + esc(lab) + ': ' + esc(st) + '">' + ico + '<span class="cme-tx"><b>' + esc(lab) + '</b></span><small class="cme-st">' + esc(st) + '</small></button>'; }
        if (id === 'deleteAccount') return '<button type="button" class="cme-row cme-danger" data-cme="deleteAccount" aria-haspopup="dialog">' + ico + '<span class="cme-tx"><b>' + esc(lab) + '</b></span>' + svg('chev', 'cme-chev') + '</button>';
        return '<button type="button" class="cme-row" data-cme="' + id + '">' + ico + '<span class="cme-tx"><b>' + esc(lab) + '</b>' + (sub && !ov ? '<small>' + esc(sub) + '</small>' : '') + '</span>' + svg('chev', 'cme-chev') + '</button>';
    }
    /* Oct 22 One UI (Emmanuel: "every UI should look the same ... the Japanese convenient logic"): You is a small grid of tiles, icon
       over a short label, one tap each; the line under the label stays as the button's description for screen readers */
    function tile(id) {
        const s = S(), l = lang(), lab = wnm(LABELS[l] && LABELS[l][id]) || s.label(id), sub = (SUB[l] && SUB[l][id]) || '';
        const ico = ICON[id] ? svg(id) : s.icon(id).replace('ss2-ico', 'cme-ico');
        return '<button type="button" class="cme-tile" data-cme="' + id + '"' + (sub ? ' title="' + esc(sub) + '"' : '') + '>' + ico + '<b>' + esc(lab) + '</b></button>';
    }
    /* the light way in to the places nothing else reaches: one folded row, small chips when unfolded */
    function moreRow(ids) {
        if (!ids || !ids.length) return '';
        const s = S(), l = lang(), T = TX[l];
        return '<div class="cme-more' + (moreOpen ? ' on' : '') + '"><button type="button" class="cme-row cme-more-btn" data-cme="more" aria-expanded="' + moreOpen + '" aria-controls="cmeMore"><span class="cme-tx"><b>' + esc(T.more) + '</b></span>' + svg('chev', 'cme-chev') + '</button>' +
            '<div class="cme-chips" id="cmeMore"' + (moreOpen ? '' : ' hidden') + '>' + ids.map(id => '<button type="button" class="cme-chip" data-cme="' + id + '">' + esc(wnm(LABELS[l] && LABELS[l][id]) || s.label(id)) + '</button>').join('') + '</div></div>';
    }
    function render() {
        const s = S(), T = TX[lang()], m = me(), pf = D.getElementById('pfBtn');
        const av = pf ? pf.innerHTML : '';
        const gs = groups(id => id === 'presence' ? hasPresence() : s.has(id)), ver = s.version ? s.version() : '';
        const sec = g => g.key === 'danger'
            ? '<section class="cme-sec cme-sec-danger" aria-label="' + T.account + '"><div class="cme-list">' + g.ids.map(row).join('') + '</div></section>'
            : (ov && g.key === 'you')
                ? '<section class="cme-sec" aria-label="' + T[g.key] + '"><h3>' + T[g.key] + '</h3><div class="cme-tiles">' + g.ids.map(tile).join('') + '</div>' + (g.more && g.more.length ? '<div class="cme-list">' + moreRow(g.more) + '</div>' : '') + '</section>'
                : '<section class="cme-sec" aria-label="' + T[g.key] + '"><h3>' + T[g.key] + '</h3><div class="cme-list">' + g.ids.map(row).join('') + moreRow(g.more) + '</div></section>';
        el.innerHTML = '<div class="cme-head">' +
            '<span class="cme-av" aria-hidden="true">' + av + '</span>' +
            '<span class="cme-who"><b id="cmeTitle">' + esc(m.name || T.guest) + '</b>' + (m.xp ? '<small>' + xpText(m.xp, lang()) + '</small>' : '') + '</span>' +
            (ov ? '' : '<button type="button" class="cme-ibtn" data-cme="close" aria-label="' + T.close + '">' + svg('x') + '</button>') + '</div>' +
            '<div class="cme-body">' + gs.map(sec).join('') +
            '<p class="cme-tip">' + T.hold + '</p>' + (ver ? '<p class="cme-ver">' + esc(ver) + '</p>' : '') + '</div>';
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
        lastFocus = D.activeElement; asking = false; moreOpen = false;
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
        const f = el.querySelector('.cme-row') || el.querySelector('button'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } }
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
        /* Oct 22 2026 (item 42): your picture or name at the top opens your profile, like the Profile row */
        const who = e.target && e.target.closest && e.target.closest('.cme-av,.cme-who');
        if (who) { e.preventDefault(); close(false); const s0 = S(); if (s0) away(() => s0.run('me')); return; }
        const b = e.target && e.target.closest && e.target.closest('[data-cme]'); if (!b) return;
        e.preventDefault();
        const id = b.getAttribute('data-cme'), s = S();
        if (id === 'close') { close(true); return; }
        if (id === 'more') { moreOpen = !moreOpen; const w = el.querySelector('.cme-more'), c = el.querySelector('#cmeMore'); if (w) w.classList.toggle('on', moreOpen); if (c) c.hidden = !moreOpen; b.setAttribute('aria-expanded', String(moreOpen)); return; }
        if (id === 'deleteAccount') { askDelete(); return; }
        if (id === 'delCancel') { asking = false; render(); const f = el && el.querySelector('[data-cme="deleteAccount"]'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } } return; }
        if (id === 'delGo') { delGo(b); return; }
        /* Day/night switches in place and the hub stays open */
        if (id === 'theme') { s.run('theme'); setTimeout(() => { if (el && !asking) { render(); const f = el.querySelector('[data-cme="theme"]'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } } } }, 60); return; }
        close(false);
        if (id === 'presence') { try { if (hasPresence()) root.LowiCommunity.settings(); } catch (x) { console.error(x); } return; }
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
    /* in Community, your picture opens this panel (capture: before the shell's own Profile jump) */
    D.addEventListener('click', e => {
        const pf = e.target && e.target.closest && e.target.closest('#pfBtn'); if (!pf || !inCommunity()) return;
        if (open()) { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); }
    }, true);
    D.addEventListener('keydown', e => {
        if (!el) return;
        if (e.key === 'Escape') { close(true); return; }
        if (e.key === 'Tab' && !ov) { const bs = [...el.querySelectorAll('button')]; const i = bs.indexOf(D.activeElement), last = bs.length - 1; if (e.shiftKey && i <= 0) { e.preventDefault(); bs[last].focus(); } else if (!e.shiftKey && (i === last || i < 0)) { e.preventDefault(); bs[0].focus(); } }
    });
    D.addEventListener('lowi:tab', () => close(false));
    try { new MutationObserver(() => { if (el && !asking) render(); }).observe(H, { attributes: true, attributeFilter: ['lang'] }); } catch (e) { }
    root.LowiCommunityMe = Object.assign({}, core, { open, close: () => close(false), isOpen: () => !!el });
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
