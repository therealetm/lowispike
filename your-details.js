/* your-details.js (Oct 22 2026, account UI step 1). Emmanuel: "It's way too difficult to change your personal data ... I'm looking
   for where to update my weight and I can't find it." One place, "Your details", one tap from the profile overview: the
   header's weight / age / type and the first tile open it. Rows grouped Body, About you, Goals, Health, Account; each row
   shows the current value and opens the editor that already owns that data (nothing moved out of storage, nothing deleted):
   Weight -> Weight journey with Add weight open and today's value filled in; Height and BMI -> Weight & BMI; name, photo,
   birthday, goals, look-out-for -> Edit profile (scrolled to the field); type -> the MBTI picker; gender, PCOS, blood
   pressure log -> the About you panel; private health -> the Health panel; email and password -> the Account panel.
   A panel opened from here comes back here on Back. Full screen, one fixed header with a single Back button.
   API: window.LowiYourDetails = { open(), close(), isOpen(), rows(), go(id) } */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    if (W.LowiYourDetails) return;
    const T = {
        en: { title: 'Your details', back: 'Back', body: 'Body', about: 'About you', goals: 'Goals', health: 'Health', account: 'Account',
            weight: 'Weight', height: 'Height', bmi: 'BMI', journey: 'Weight journey', journeySub: 'Start date, goal and your line',
            photo: 'Photo', name: 'Name', bday: 'Birthday', mbti: 'Personality type', gender: 'Gender', goalsRow: 'Your goals',
            conds: 'Anything we should look out for?', bp: 'Blood pressure log', priv: 'Private health details', privSub: 'Cycle tips. Only on this phone',
            email: 'Email', pw: 'Password', pwSub: 'Change or reset it', order: 'Community order', orderSub: 'Which section opens first',
            notSet: 'Not set', add: 'Add', on: 'On', off: 'Off', none: 'None of these', noAcct: 'Not saved to an account yet', set: 'Set',
            f: 'Woman', m: 'Man', n: 'Non-binary', x: 'Prefer not to say', hint: 'Tap a line to change it.', addW: 'Add weight', tile: 'Your details', tileSub: 'Weight, name, health', yrs: '{n} years' },
        de: { title: 'Deine Daten', back: 'Zurück', body: 'Körper', about: 'Über dich', goals: 'Ziele', health: 'Gesundheit', account: 'Konto',
            weight: 'Gewicht', height: 'Größe', bmi: 'BMI', journey: 'Gewichtsreise', journeySub: 'Startdatum, Ziel und deine Linie',
            photo: 'Foto', name: 'Name', bday: 'Geburtstag', mbti: 'Persönlichkeitstyp', gender: 'Geschlecht', goalsRow: 'Deine Ziele',
            conds: 'Sollen wir auf etwas achten?', bp: 'Blutdruck-Log', priv: 'Private Gesundheitsdaten', privSub: 'Zyklus-Tipps. Nur auf diesem Handy',
            email: 'E-Mail', pw: 'Passwort', pwSub: 'Ändern oder zurücksetzen', order: 'Community-Reihenfolge', orderSub: 'Welcher Bereich zuerst öffnet',
            notSet: 'Nicht angegeben', add: 'Hinzufügen', on: 'An', off: 'Aus', none: 'Nichts davon', noAcct: 'Noch nicht in einem Konto gespeichert', set: 'Gesetzt',
            f: 'Frau', m: 'Mann', n: 'Nichtbinär', x: 'Keine Angabe', hint: 'Tippe auf eine Zeile, um sie zu ändern.', addW: 'Gewicht eintragen', tile: 'Deine Daten', tileSub: 'Gewicht, Name, Gesundheit', yrs: '{n} Jahre' },
        es: { title: 'Tus datos', back: 'Atrás', body: 'Cuerpo', about: 'Sobre ti', goals: 'Objetivos', health: 'Salud', account: 'Cuenta',
            weight: 'Peso', height: 'Altura', bmi: 'IMC', journey: 'Tu camino de peso', journeySub: 'Fecha de inicio, meta y tu línea',
            photo: 'Foto', name: 'Nombre', bday: 'Cumpleaños', mbti: 'Tipo de personalidad', gender: 'Género', goalsRow: 'Tus objetivos',
            conds: '¿Algo que debamos tener en cuenta?', bp: 'Registro de presión', priv: 'Datos de salud privados', privSub: 'Consejos del ciclo. Solo en este móvil',
            email: 'Correo', pw: 'Contraseña', pwSub: 'Cámbiala o restablécela', order: 'Orden de Comunidad', orderSub: 'Qué sección se abre primero',
            notSet: 'Sin indicar', add: 'Añadir', on: 'Sí', off: 'No', none: 'Nada de esto', noAcct: 'Aún no guardado en una cuenta', set: 'Indicado',
            f: 'Mujer', m: 'Hombre', n: 'No binario', x: 'Prefiero no decirlo', hint: 'Toca una línea para cambiarla.', addW: 'Añadir peso', tile: 'Tus datos', tileSub: 'Peso, nombre, salud', yrs: '{n} años' }
    };
    const lang = () => { let l = 'en'; try { l = (W.LowiLang && LowiLang.get && LowiLang.get()) || H.lang || 'en'; } catch (e) { } l = String(l).slice(0, 2); return l === 'de' || l === 'es' ? l : 'en'; };
    const tr = (k, v) => { let s = (T[lang()] || T.en)[k]; if (s === undefined) s = T.en[k] !== undefined ? T.en[k] : k; if (v) Object.keys(v).forEach(n => { s = s.split('{' + n + '}').join(v[n]); }); return s; };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = n => { const s = String(Math.round(n * 10) / 10); return lang() === 'en' ? s : s.replace('.', ','); };
    const R2 = () => W.LowiR2 || null;
    const S = () => { try { const r = R2(); return (r && r.S && r.S()) || null; } catch (e) { return null; } };
    const sv = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
    const IC = { back: sv('<path d="M15 5l-7 7 7 7"/>'), chev: sv('<path d="M9 5l7 7-7 7"/>') };

    /* ---- current values ---- */
    const loc = x => { try { return (W.LowiLang && LowiLang.t) ? LowiLang.t(x) : x; } catch (e) { return x; } };
    function tagLabel(k) { try { if (W.LowiTags && LowiTags.label) { const x = LowiTags.label(k); if (x) return loc(x); } const L = W.LowiTags, all = (L.goals || []).concat(L.conds || []), x = all.find(t => t[0] === k); return x ? loc(x[1]) : k; } catch (e) { return k; } }
    function isCond(k) { try { return !!(W.LowiTags && LowiTags.isCond && LowiTags.isCond(k)); } catch (e) { return false; } }
    function age(b) { const d = new Date(b + 'T12:00:00'); if (!b || isNaN(d)) return null; const n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; }
    function weightKg(s) { const h = (s && s.health) || {}; const w = parseFloat(String(h.weight == null ? '' : h.weight).replace(',', '.')); return Number.isFinite(w) && w > 0 ? w : null; }
    function mbti() { try { const f = W.LowiFood; return (f && f.state && (f.state() || {}).mbti) || (f && f.meP && (f.meP() || {}).t) || ''; } catch (e) { return ''; } }
    function rows() {
        const s = S() || {}, u = s.user || {}, h = s.health || {}, kg = weightKg(s), cm = parseFloat(h.heightCm) || null;
        const unitLb = (() => { try { return LowiWeightJourney.core.journey(s).unit === 'lb'; } catch (e) { return false; } })();
        const wTxt = kg ? (unitLb ? num(kg * 2.2046226) + ' lb' : num(kg) + ' kg') : '';
        const bmi = kg && cm ? kg / Math.pow(cm / 100, 2) : null;
        const tags = Array.isArray(u.tags) ? u.tags : [], goals = tags.filter(t => !isCond(t)), conds = tags.filter(isCond);
        const a = age(u.bday); let bd = ''; if (u.bday) { try { bd = new Date(u.bday + 'T12:00:00').toLocaleDateString(lang() === 'de' ? 'de-DE' : lang() === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { bd = u.bday; } if (a != null) bd += ' · ' + tr('yrs', { n: a }); }
        let em = ''; try { em = (R2() && R2().email && R2().email()) || ''; } catch (e) { }
        return [
            ['body', [
                { id: 'weight', label: tr('weight'), val: wTxt, big: true },
                { id: 'height', label: tr('height'), val: cm ? Math.round(cm) + ' cm' : '' },
                { id: 'bmi', label: tr('bmi'), val: bmi ? num(bmi) : '' },
                { id: 'journey', label: tr('journey'), val: tr('journeySub'), sub: true }]],
            ['about', [
                { id: 'photo', label: tr('photo'), val: u.avatar ? tr('set') : '', photo: u.avatar || '' },
                { id: 'name', label: tr('name'), val: u.name || '' },
                { id: 'bday', label: tr('bday'), val: bd },
                { id: 'mbti', label: tr('mbti'), val: mbti() },
                { id: 'gender', label: tr('gender'), val: /^[fmnx]$/.test(u.gender || '') ? tr(u.gender) : '' }]],
            ['goals', [{ id: 'goals', label: tr('goalsRow'), val: goals.map(tagLabel).join(', ') }]],
            ['health', [
                { id: 'conds', label: tr('conds'), val: (() => { const note = typeof h.condNote === 'string' ? h.condNote.trim() : ''; const list = conds.map(tagLabel); if (note) list.push(note); return list.length ? list.join(', ') : u.noCond ? tr('none') : ''; })() },  /* Oct 23: own typed note (on this phone only) */
                { id: 'bp', label: tr('bp'), val: h.bpOff ? tr('off') : tr('on') },
                { id: 'private', label: tr('priv'), val: tr('privSub'), sub: true }]],
            ['account', [
                { id: 'email', label: tr('email'), val: em || tr('noAcct') },
                { id: 'password', label: tr('pw'), val: em ? tr('pwSub') : '', sub: true, hide: !em },
                { id: 'order', label: tr('order'), val: tr('orderSub'), sub: true }]]
        ];
    }
    function rowHTML(r) {
        if (r.hide) return '';
        const empty = !r.val;
        const pic = r.photo ? '<img class="yd-pic" src="' + esc(r.photo) + '" alt="">' : '';
        /* descriptive rows put their line under the label, so long German / Spanish labels never get cut on a 320 px phone */
        if (r.sub) return '<button type="button" class="yd-row yd-sub" data-yd-go="' + r.id + '"><span class="yd-l">' + esc(r.label) + '<small class="yd-s">' + esc(r.val) + '</small></span>' + IC.chev + '</button>';
        return '<button type="button" class="yd-row' + (r.big ? ' yd-big' : '') + (empty ? ' yd-empty' : '') + '" data-yd-go="' + r.id + '"><span class="yd-l">' + esc(r.label) + '</span>' +
            '<span class="yd-v">' + pic + esc(empty ? tr('add') : r.val) + '</span>' + IC.chev + '</button>';
    }
    function bodyHTML() {
        return '<p class="yd-hint">' + esc(tr('hint')) + '</p>' + rows().map(g => '<section class="yd-sec yd-s-' + g[0] + '"><h3>' + esc(tr(g[0])) + '</h3><div class="yd-card">' + g[1].map(rowHTML).join('') + '</div></section>').join('');
    }

    /* ---- the sheet ---- */
    let ov = null, back = null, sig = '', timer = 0, reopen = '';
    function render() { if (!ov) return; const html = bodyHTML() + '|' + lang(); if (html === sig) return; sig = html; ov.querySelector('.yd-ht').textContent = tr('title'); const b = ov.querySelector('.yd-back'); b.setAttribute('aria-label', tr('back')); b.querySelector('span').textContent = tr('back'); const sc = ov.querySelector('.yd-body'), top = sc.scrollTop; sc.innerHTML = bodyHTML(); sc.scrollTop = top; }
    function open() {
        if (ov) { render(); return true; }
        back = D.activeElement; sig = '';
        ov = D.createElement('div'); ov.id = 'ydOv'; ov.className = 'yd-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'ydTitle'); ov.setAttribute('data-noi18n', ''); ov.setAttribute('lang', lang());
        ov.innerHTML = '<header class="yd-head"><button type="button" class="yd-back" data-yd-x data-sfx="close">' + IC.back + '<span></span></button><h2 class="yd-ht" id="ydTitle"></h2></header><div class="yd-body"></div>';
        D.body.appendChild(ov); H.classList.add('yd-on'); render();
        ov.addEventListener('click', e => { const t = e.target; if (t.closest('[data-yd-x]')) { e.preventDefault(); close(); return; } const g = t.closest('[data-yd-go]'); if (g) { e.preventDefault(); go(g.getAttribute('data-yd-go')); } });
        clearInterval(timer); timer = setInterval(render, 900);
        try { ov.querySelector('.yd-back').focus({ preventScroll: true }); } catch (e) { }
        return true;
    }
    function close() {
        if (!ov) return; const el = ov; ov = null; clearInterval(timer); H.classList.remove('yd-on');
        el.classList.add('yd-out'); setTimeout(() => el.remove(), 170);
        try { if (back && back.isConnected) back.focus({ preventScroll: true }); } catch (e) { }
    }
    /* click a hidden control so the owner's own handler runs (same trick index.html uses for the MBTI picker) */
    function fake(attr, v) { const b = D.createElement('button'); b.type = 'button'; b.setAttribute(attr, v); b.style.display = 'none'; D.body.appendChild(b); b.click(); b.remove(); }
    function editAt(sel) { fake('data-r2p', 'edit'); if (!sel) return; setTimeout(() => { const el = D.querySelector('.r2-ov .r2-edit ' + sel) || D.querySelector(sel); try { if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { } }, 380); }
    function panel(k) {
        close(); reopen = k;
        try { if (W.LowiHost && LowiHost.tab && LowiHost.tab() !== 'profile' && typeof W.goTab === 'function') goTab('profile'); } catch (e) { }
        setTimeout(() => { try { W.LowiG2E && LowiG2E.open(k); } catch (e) { } }, 60);
    }
    function go(id) {
        switch (id) {
            case 'weight': if (W.LowiWeightJourney) LowiWeightJourney.open({ add: true }); else if (W.LowiBodyStats) LowiBodyStats.open(); return;
            case 'journey': if (W.LowiWeightJourney) LowiWeightJourney.open(); return;
            case 'height': case 'bmi': if (W.LowiBodyStats) LowiBodyStats.open(); return;
            case 'photo': fake('data-r2p', 'photo'); return;
            case 'name': editAt('#r2eName'); return;
            case 'bday': editAt('#r2eB'); return;
            case 'goals': editAt('.r2-goals'); return;
            case 'conds': editAt('.r2-econd'); return;
            case 'mbti': fake('data-r5', 'mbti-pick'); return; /* not data-r5=mbti: without data-v that one clears the type */
            case 'gender': case 'bp': case 'order': panel('about'); return;
            case 'private': panel('health'); return;
            case 'email': case 'password': panel('acct'); return;
        }
    }
    /* Back on a panel opened from here comes back to Your details */
    try { new MutationObserver(() => { if (reopen && !H.classList.contains('g2e-open')) { const was = reopen; reopen = ''; let tab = 'profile'; try { tab = W.LowiHost && LowiHost.tab ? LowiHost.tab() : 'profile'; } catch (e) { } if (tab === 'profile' && was) open(); } else if (reopen && H.getAttribute('data-g2e-k') && H.getAttribute('data-g2e-k') !== reopen) reopen = ''; }).observe(H, { attributes: true, attributeFilter: ['class', 'data-g2e-k'] }); } catch (e) { }
    D.addEventListener('keydown', e => { if (e.key === 'Escape' && ov && !D.querySelector('.r2-ov.on:not(.off), #wjOv, .bs-ov')) close(); });
    /* entry points: the header chips / Your details button / tile ([data-yd]) */
    D.addEventListener('click', e => {
        const t = e.target && e.target.closest && e.target.closest('[data-yd]'); if (!t || (ov && ov.contains(t))) return;
        e.preventDefault(); e.stopPropagation();
        const v = t.getAttribute('data-yd'); if (v === 'weight') go('weight'); else open();
    }, true);
    /* leaving Profile closes it */
    D.addEventListener('click', e => { if (ov && e.target && e.target.closest && e.target.closest('#tabbar .tb')) close(); }, true);
    W.LowiYourDetails = { open, close, isOpen: () => !!ov, rows, go, tr, _t: T };
})();
