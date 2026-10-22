/* community-me.js: your corner of Community (Oct 21 2026, Emmanuel: "Community holds the profile and everything we built; Settings
   is only the necessary stuff"). In Community, your picture (top right, #pfBtn) opens this panel instead of jumping to the Profile
   tab: you at the top with a small gear for Settings, then Profile and Weight & BMI, then the places no Home bubble reaches (For You,
   Care board, Workouts, World map, Gift of the day, Shopping hunt). Rooms, Chat, Creation and Affiliates are Community's own tabs, so
   they are not repeated here. Rows run through the same routes as the old Settings > More (home-settings-sleep-v2.js), so a place
   that is missing right now is simply not listed. Outside Community the picture still opens the Profile tab as before.
   Dark glass, glowing cyan edge, no emoji. Nothing here stores data. */
(function (root) {
    'use strict';
    const TX = {
        en: { title: 'You', you: 'You', places: 'Explore', settings: 'Settings', close: 'Close', level: 'Level', guest: 'You', hold: 'Tip: hold the Community bubble on Home for settings.' },
        de: { title: 'Du', you: 'Du', places: 'Entdecken', settings: 'Einstellungen', close: 'Schlie\u00dfen', level: 'Level', guest: 'Du', hold: 'Tipp: Halte die Community-Blase auf Home f\u00fcr Einstellungen.' },
        es: { title: 'T\u00fa', you: 'T\u00fa', places: 'Explorar', settings: 'Ajustes', close: 'Cerrar', level: 'Nivel', guest: 'T\u00fa', hold: 'Consejo: mant\u00e9n la burbuja Comunidad en Inicio para los ajustes.' }
    };
    /* the places that only work on Home (they press a Home control): go Home first, then run */
    const HOME_FIRST = ['map', 'gift'];
    const LABELS = {
        en: { me: 'Profile', body: 'Weight & BMI', weight: 'Weight journey' }, de: { me: 'Profil', body: 'Gewicht & BMI', weight: 'Gewichtsreise' }, es: { me: 'Perfil', body: 'Peso e IMC', weight: 'Tu camino de peso' }
    };
    const SUB = {
        en: { me: 'Name, photo, goals', body: 'Weigh in, BMI, Then & Now', weight: 'Start date, chart and goal', foryou: 'Shuffle of recipes and moves', care: 'Look after each other', workouts: 'Guided sessions', map: 'The whole world from above', gift: 'Misty\u2019s daily gift', hunt: 'Find it in the shop' },
        de: { me: 'Name, Foto, Ziele', body: 'Wiegen, BMI, Vorher & Jetzt', weight: 'Startdatum, Verlauf und Ziel', foryou: 'Mix aus Rezepten und Moves', care: 'Aufeinander achten', workouts: 'Gef\u00fchrte Einheiten', map: 'Die ganze Welt von oben', gift: 'Mistys Tagesgeschenk', hunt: 'Im Laden finden' },
        es: { me: 'Nombre, foto, metas', body: 'Pesarte, IMC, Antes y ahora', weight: 'Fecha de inicio, gr\u00e1fico y meta', foryou: 'Mezcla de recetas y movimientos', care: 'Cuidarnos entre todos', workouts: 'Sesiones guiadas', map: 'Todo el mundo desde arriba', gift: 'El regalo diario de Misty', hunt: 'Encu\u00e9ntralo en la tienda' }
    };
    const P = 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"';
    const ICON = {
        foryou: '<path d="M4 7h4l8 10h4M4 17h4l2.5-3.1M13.5 10.1 16 7h4M18 5l2 2-2 2M18 15l2 2-2 2" ' + P + '/>',
        care: '<path d="M12 19s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 7.6a3.8 3.8 0 0 1 7 2.2C19 14.7 12 19 12 19z" ' + P + '/>',
        workouts: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" ' + P + '/>',
        map: '<path d="M12 3.5 19.4 7.8v8.4L12 20.5l-7.4-4.3V7.8z" ' + P + '/><circle cx="12" cy="12" r="2.2" ' + P + '/>',
        gift: '<rect x="4.5" y="9" width="15" height="10.5" rx="2" ' + P + '/><path d="M3.5 9h17M12 9v10.5M12 9c-1.5-3.5-5.5-3.5-5-1 .3 1 2.5 1 5 1zm0 0c1.5-3.5 5.5-3.5 5-1-.3 1-2.5 1-5 1z" ' + P + '/>',
        hunt: '<path d="M4 5h2l2 10h10l2-7H7" ' + P + '/><circle cx="9.5" cy="19" r="1.3" ' + P + '/><circle cx="16.5" cy="19" r="1.3" ' + P + '/>',
        weight: '<path d="M4 19h16M5 15l4-4 3 2 6-7" ' + P + '/><circle cx="18" cy="6" r="1.6" ' + P + '/>',
        gear: '<circle cx="12" cy="12" r="3" ' + P + '/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6" ' + P + '/>',
        x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" ' + P + ' stroke-width="2.2"/>',
        chev: '<path d="M9.5 6l6 6-6 6" ' + P + '/>'
    };
    function groups(has) { const S = root && root.LowiHomeSettingsSleepV2, C = S && S.COMMUNITY_PLACES || { you: ['me', 'body'], places: [] }; return [{ key: 'you', ids: C.you.filter(has) }, { key: 'places', ids: C.places.filter(has) }].filter(g => g.ids.length); }
    const core = { TX, HOME_FIRST, groups };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!root || !root.document) return;

    const D = root.document, H = D.documentElement;
    const lang = () => { const l = (H.lang || 'en').slice(0, 2); return TX[l] ? l : 'en'; };
    const S = () => root.LowiHomeSettingsSleepV2 || null;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const svg = (k, cls) => '<svg class="' + (cls || 'cme-ico') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICON[k] || '') + '</svg>';
    let el = null, back = null, lastFocus = null;
    const inCommunity = () => { const t = D.getElementById('tab-foryou'); return !!(t && (t.classList.contains('active') || t.classList.contains('on') || t.getBoundingClientRect().width > 2 && getComputedStyle(t).display !== 'none')) && !H.classList.contains('wh-home'); };
    function me() {
        let name = '', xp = 0;
        try { const s = JSON.parse(root.localStorage.getItem('lowispike.v2') || '{}'); name = (s.user && s.user.name) || ''; xp = +s.xp || 0; } catch (e) { }
        return { name, xp };
    }
    function row(id) {
        const s = S(), l = lang(), lab = (LABELS[l] && LABELS[l][id]) || s.label(id), sub = SUB[l][id] || '';
        const ico = ICON[id] ? svg(id) : s.icon(id).replace('ss2-ico', 'cme-ico');
        return '<button type="button" class="cme-row" data-cme="' + id + '">' + ico + '<span class="cme-tx"><b>' + esc(lab) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' + svg('chev', 'cme-chev') + '</button>';
    }
    function render() {
        const s = S(), T = TX[lang()], m = me(), pf = D.getElementById('pfBtn');
        const av = pf ? pf.innerHTML : '';
        const gs = groups(id => s.has(id));
        el.innerHTML = '<div class="cme-head">' +
            '<span class="cme-av" aria-hidden="true">' + av + '</span>' +
            '<span class="cme-who"><b id="cmeTitle">' + esc(m.name || T.guest) + '</b>' + (m.xp ? '<small>' + m.xp.toLocaleString() + ' XP</small>' : '') + '</span>' +
            '<button type="button" class="cme-ibtn" data-cme="settings" aria-label="' + T.settings + '">' + svg('gear') + '</button>' +
            '<button type="button" class="cme-ibtn" data-cme="close" aria-label="' + T.close + '">' + svg('x') + '</button></div>' +
            '<div class="cme-body">' + gs.map(g => '<section class="cme-sec" aria-label="' + T[g.key] + '"><h3>' + T[g.key] + '</h3><div class="cme-list">' + g.ids.map(row).join('') + '</div></section>').join('') +
            '<p class="cme-tip">' + T.hold + '</p></div>';
    }
    function open() {
        const s = S(); if (!s || typeof s.has !== 'function') return false;
        if (el) return true;
        lastFocus = D.activeElement;
        back = D.createElement('div'); back.className = 'cme-back'; back.addEventListener('click', () => close(true));
        el = D.createElement('div'); el.className = 'cme'; el.id = 'cmeSheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'cmeTitle');
        el.addEventListener('click', onClick);
        render();
        D.body.appendChild(back); D.body.appendChild(el); H.classList.add('cme-open');
        const f = el.querySelector('.cme-row') || el.querySelector('button'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } }
        return true;
    }
    function close(refocus) {
        if (!el) return;
        el.remove(); if (back) back.remove(); el = null; back = null; H.classList.remove('cme-open');
        if (refocus && lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { } }
    }
    function onClick(e) {
        const b = e.target && e.target.closest && e.target.closest('[data-cme]'); if (!b) return;
        e.preventDefault();
        const id = b.getAttribute('data-cme'), s = S();
        if (id === 'close') { close(true); return; }
        close(false);
        if (id === 'settings') { if (s && typeof s.openSettings === 'function') s.openSettings(); return; }
        if (HOME_FIRST.includes(id) && typeof root.goTab === 'function') { root.goTab('home'); setTimeout(() => s.run(id), 700); return; }
        s.run(id);
    }
    /* in Community, your picture opens this panel (capture: before the shell's own Profile jump) */
    D.addEventListener('click', e => {
        const pf = e.target && e.target.closest && e.target.closest('#pfBtn'); if (!pf || !inCommunity()) return;
        if (open()) { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); }
    }, true);
    D.addEventListener('keydown', e => {
        if (!el) return;
        if (e.key === 'Escape') { close(true); return; }
        if (e.key === 'Tab') { const bs = [...el.querySelectorAll('button')]; const i = bs.indexOf(D.activeElement), last = bs.length - 1; if (e.shiftKey && i <= 0) { e.preventDefault(); bs[last].focus(); } else if (!e.shiftKey && (i === last || i < 0)) { e.preventDefault(); bs[0].focus(); } }
    });
    D.addEventListener('lowi:tab', () => close(false));
    try { new MutationObserver(() => { if (el) render(); }).observe(H, { attributes: true, attributeFilter: ['lang'] }); } catch (e) { }
    root.LowiCommunityMe = Object.assign({}, core, { open, close: () => close(false), isOpen: () => !!el });
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
