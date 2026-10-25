/* Oct 16 (E-man, 04:10): "this weird misty radiant hub ... I don't even know what I'm seeing ... it doesn't even look like my
   Misty ... Nuke that and redesign it so it fits our whole design more." One clear Misty card in the app's own language:
   - the SAME Misty as on Home (her live Home artwork is cloned, not a second drawing), over the same live blue world
     (a normal glass sheet; no cosmic oval, no constellations)
   - what she is up to, her level and XP, Goodnight at night, and three doors:
     Forms (evolution), Collection, Glow (aura / growth / discoveries)
   It opens on a LONG PRESS on Misty (tap stays pet/play) and wherever the old herb world used to open.

   Misty's nudges (same request): when something in Today needs you, Misty says so once in her Home speech bubble
   ("I'm back! Open Today for your surprise", "My sun is full!", "I'm sleepy... say goodnight?"). Tapping the bubble
   opens Today and points at the row. One nudge at a time, each one once, a quiet gap between them, never during a
   sheet, a first-timer hint or right after the page loads. */
(() => {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    if (W.LowiMistyHub) return;
    const lang = () => { try { return ((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || H.lang || 'de').slice(0, 2); } catch (e) { return 'de'; } };
    const T = (en, de, es) => ({ de, es })[lang()] || en;
    const LI = () => ({ de: 1, es: 2 })[lang()] || 0;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const C = () => W.LowiWorldHomeCore;
    const GN_KEY = 'lowi.mh.goodnight', NUDGE_KEY = 'lowi.mh.nudges';
    const cellCopy = k => { try { const c = W.LowiCell && W.LowiCell.copy && W.LowiCell.copy[k]; return c ? (c[LI()] || c[0]) : ''; } catch (e) { return ''; } };

    /* ---------- data ---------- */
    function cur() { try { return W.LowiHerbTamagotchi && W.LowiHerbTamagotchi.current ? W.LowiHerbTamagotchi.current() : null; } catch (e) { return null; } }
    function xpNow() { const c = cur(); return c && c.m ? +c.m.xp || 0 : 0; }
    /* BH-006: the companion's name = own companion's name, else a name the user typed, else Misty; never the old herb auto name ("Moss Leaf") */
    function companionName() { const w = typeof window !== 'undefined' ? window : globalThis; const pick = v => { v = v == null ? '' : String(v).trim(); return v ? v.slice(0, 24) : ''; }; let auto = ''; try { auto = pick(w.LowiHerbIdentity && w.LowiHerbIdentity.autoName && w.LowiHerbIdentity.autoName()); } catch (e) { } const typed = v => { v = pick(v); return v && v !== auto ? v : ''; }; let n = ''; try { const B = w.LowiBirthCompanion; if (B && B.has && B.has()) { const c = B.get(); n = pick(c && c.name); } } catch (e) { } if (!n) try { const t = w.LowiHerbTamagotchi, p = t && t.readPrefs && t.readPrefs(); n = typed(p && p.name); } catch (e) { } if (!n) try { const R = w.LowiR2, s = R && R.S && R.S(); n = typed(s && s.herb && s.herb.name); } catch (e) { } return n || 'Misty'; }
    function name() { return companionName(); }
    function cell() { try { return W.LowiCell && W.LowiCell.live ? W.LowiCell.live() : null; } catch (e) { return null; } }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function dayKey(t) { const d = new Date(t == null ? Date.now() : t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    /* the night belongs to the evening it started on: 01:00 on Friday is still Thursday's night */
    function nightKey() { return dayKey(Date.now() - 12 * 3600e3); }
    function isNight() { const p = H.dataset.spPeriod; if (p) return p === 'night'; const h = new Date().getHours(); return h >= 22 || h < 6; }
    function saidGoodnight() { try { return localStorage.getItem(GN_KEY) === nightKey(); } catch (e) { return false; } }
    /* Aura shop (Oct 22): a bought animated aura moves on her card too */
    function fx() { try { const H = W.LowiWorldHome; return H && H.auraLook && H.fxHTML ? H.fxHTML(H.auraLook().fx) : ''; } catch (e) { return ''; } }
    function aura() { try { const c = C(); const id = W.LowiWorldHome && W.LowiWorldHome.auraId ? W.LowiWorldHome.auraId() : ''; return c ? c.aura(id) : { a: '#6ee7c8', b: '#64d2ff' }; } catch (e) { return { a: '#6ee7c8', b: '#64d2ff' }; } }
    function stageOf(xp) {
        const c = C(); if (!c || !c.stage) return null;
        const s = c.stage(xp, true), P = arr => c.pick(arr, lang());
        return { name: P(s.cur.n), next: s.next ? P(s.next.n) : '', pct: s.pct, left: s.left, level: s.index + 1, levels: (c.STAGES || []).length || 6 };
    }
    /* Misty's Home artwork, cloned so the card shows exactly the Misty you see on Home */
    function art() {
        const live = D.querySelector('#spBubble .sp-home-herb svg.tmg-plant') || D.querySelector('#spBubble svg.tmg-plant');
        if (live) {
            const c = live.cloneNode(true);
            c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
            c.setAttribute('aria-hidden', 'true'); c.classList.add('mh-misty');
            return c.outerHTML;
        }
        const x = cur();
        try { if (x && W.LowiHerbTamagotchi.plantHTML) return W.LowiHerbTamagotchi.plantHTML(x.m, 'preview', x.p, { label: name() }); } catch (e) { }
        return '';
    }
    function status() {
        const v = cell();
        const box = D.querySelector('#spHome .sp-status');
        const t = box && box.querySelector('b');
        let title = t ? t.textContent.trim() : '', sub = '';
        if (v) {
            const act = v.activity === 'journey' ? cellCopy('act_journey') : cellCopy('act_' + v.activity);
            /* Oct 22: the state word ("Sugar rush") is explained in World glow right below; the status title names it too */
            sub = W.LowiMistyPeak ? act : [cellCopy(v.state), act].filter(Boolean).join(' \u00b7 ');
        }
        if (!title) title = name();
        return { title, sub, state: v ? v.state : '' };
    }
    function line(v) {
        if (saidGoodnight() && isNight()) return T('Goodnight. I\u2019m curling up, see you in the morning.', 'Gute Nacht. Ich kuschel mich ein, bis morgen fr\u00fch.', 'Buenas noches. Me acurruco, nos vemos por la ma\u00f1ana.');
        const c = v || cell(); if (!c) return '';
        return cellCopy(c.activity === 'journey' ? 'say_journey' : 'say_' + c.state) || '';
    }

    /* ---------- the card ---------- */
    const ICO = {
        forms: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18c2-6 5-9 8-9s6 3 8 9"/><circle cx="6" cy="18" r="1.6"/><circle cx="12" cy="9" r="2.4"/><circle cx="18" cy="18" r="1.6"/></svg>',
        glow: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>',
        moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
        pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
        trip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c1-5 4-6 7-6s5-2 5-5"/><circle cx="17" cy="6" r="2.2"/><circle cx="5" cy="19" r="1.4"/></svg>',
        gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="9" width="15" height="10.5" rx="2"/><path d="M3.5 9h17M12 9v10.5M12 9c-1.5-3.5-5.5-3.5-5-1 .3 1 2.5 1 5 1zm0 0c1.5-3.5 5.5-3.5 5-1-.3 1-2.5 1-5 1z"/></svg>',
        sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>',
        flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.6 3-5.4 3.6-9.4 2.4 1.6 3.4 3.6 3.4 5.4 1-.6 1.6-1.6 1.8-2.8C17 10.4 18 12.8 18 15.4 18 18.6 15.6 21 12 21z"/></svg>',
        macro: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v8l6.2 5"/></svg>',
        inside: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.7 12 20 12 20z"/><path d="M8.6 12.4h2l1-2 1.6 4 1-2h1.4"/></svg>'
    };
    function html(sayOverride) {
        const xp = xpNow(), s = stageOf(xp), a = aura(), v = cell(), st = status();
        const say = sayOverride || line(v);
        const night = isNight(), gn = saidGoodnight();
        return '<div class="mh" id="mistyHub" data-noi18n style="--a:' + esc(a.a) + ';--b:' + esc(a.b) + '">' +
            '<header class="mh-head">' +
                '<div class="mh-art"><span class="mh-glow" aria-hidden="true"></span>' + art() + fx() + '</div>' +
                '<div class="mh-id"><div class="mh-name"><h2>' + esc(name()) + '</h2></div>' +
                    (s ? '<p class="mh-lv">' + esc(T('Level ', 'Level ', 'Nivel ') + s.level + ' \u00b7 ' + s.name) + '</p>' : '') +
                    '<p class="mh-st"><b>' + esc(st.title) + '</b>' + (st.sub ? '<span>' + esc(st.sub) + '</span>' : '') + '</p>' +
                    /* Oct 19: below the name, not beside it: the sheet's grab handle owns the top strip when the card is pulled up */
                    '<button type="button" class="mh-rn" data-mh="rename" aria-label="' + esc(T('Rename ' + name(), name() + ' umbenennen', 'Cambiar el nombre de ' + name())) + '">' + ICO.pen + '<span>' + esc(T('Rename', 'Umbenennen', 'Cambiar nombre')) + '</span></button>' +
                '</div>' +
                /* Oct 23 (Eman: "where Misty's ranked, worldwide ... a very tiny preview"): the rank peek, a full-width row of the
                   header right under her picture and name, so it fits beside nothing on the smallest phone */
                rankHtml() +
            '</header>' +
            /* Oct 22 (E-man: "When I click on Misty it should say what's missing to get Misty to true 100%"): World glow, the bar to
               her peak (Supernova) and what is missing, right under her name (misty-peak.js) */
            peakHtml() +
            /* Oct 19 (E-man): Forms and Glow were at the very bottom: "that's hidden ... needs to be not hidden".
               Oct 22 (E-man: "I don't understand the food journal section ... I'd say remove it"): the Food journal door is gone;
               the meals you logged live in the Fuel sheet's meal list. Two equal doors now come first, right under the name and level, before the companion's words (fully in view when the card opens on an iPhone 13). */
            '<nav class="mh-doors" aria-label="' + esc(name()) + '">' +
                '<button type="button" data-mh="forms">' + ICO.forms + '<b>' + esc(T('Forms', 'Formen', 'Formas')) + '</b><small>' + esc(T('How it evolves', 'Wie es sich entwickelt', 'C\u00f3mo evoluciona')) + '</small></button>' +
                '<button type="button" data-mh="glow">' + ICO.glow + '<b>' + esc(T('Glow', 'Leuchten', 'Brillo')) + '</b><small>' + esc(T('Aura and finds', 'Aura und Funde', 'Aura y hallazgos')) + '</small></button>' +
            '</nav>' +
            /* Oct 24 2026 (Emmanuel): with cycle tracking on, a small "Your cycle" section right under the doors opens My cycle
               (cycle-world.js hubHtml / hubOpen). Tracking off: nothing here. */
            cycleHtml() +
            todayHtml() +
            (say ? '<p class="mh-say" role="status" aria-live="polite">' + esc(say) + '</p>' : '<p class="mh-say" role="status" aria-live="polite" hidden></p>') +
            (night ? '<button type="button" class="mh-pri" data-mh="goodnight"' + (gn ? ' aria-pressed="true"' : '') + '>' + ICO.moon + '<span>' + esc(gn ? T('Tucked in for the night', 'F\u00fcr die Nacht eingekuschelt', 'Arropada para la noche') : T('Say goodnight', 'Gute Nacht sagen', 'Dar las buenas noches')) + '</span></button>' : '') +
            scaleHtml() +
            (s ? '<section class="mh-card mh-xp" aria-label="' + esc(T('Level and XP', 'Level und XP', 'Nivel y XP')) + '">' +
                '<div class="mh-row"><b>' + esc(s.name) + '</b><span class="num">' + xp + ' XP</span></div>' +
                '<i class="mh-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(s.pct * 100) + '" aria-label="' + esc(T('Progress to the next level', 'Fortschritt zum n\u00e4chsten Level', 'Progreso al siguiente nivel')) + '"><i style="width:' + Math.round(s.pct * 100) + '%"></i></i>' +
                '<small>' + esc(s.next ? T(s.left + ' XP to ' + s.next, 'Noch ' + s.left + ' XP bis ' + s.next, 'Faltan ' + s.left + ' XP para ' + s.next) : T('Top level reached', 'H\u00f6chstes Level erreicht', 'Nivel m\u00e1ximo alcanzado')) + '</small>' +
            '</section>' : '') +
            advHtml() +
            /* Oct 23 (E-man): the optional feelings check-in card is gone from her sheet (misty-sheet-a). */
        '</div>';
    }
    /* Oct 17: Misty's energy scale and her way back (misty-scale.js), right under her words */
    /* adventure tiers (adventure-tiers.js): what her timed adventure reaches at this level; autopilot is never gated */
    /* Oct 25 2026 (Eman: "Nuke it" about the Today sheet): the three things of hers that only lived in Today come to her card as
       three small round bubbles, the living-bubble look, nothing else: Journeys (her body trips; "I'm back, open your surprise" when
       she is home with one), Sun (x/12) and Weekly goal. Each one reads the live row its own module still renders (hidden) and a
       tap closes the card and does exactly what that row did (body-trips.js data-bt=bar, sun-meter.js data-ls=info,
       daily-ritual.js data-dr=chip). A module that is not there leaves its bubble out. */
    function srcLabel(sel) { const e = D.querySelector(sel); return e ? String(e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
    function todayItems() {
        const out = [], bt = D.getElementById('btBar');
        if (bt || W.LowiBodyTrips) {
            const back = !!(bt && bt.classList.contains('back'));
            out.push({ k: 'trip', on: back, ico: back ? ICO.gift : ICO.trip, b: back ? T('Surprise!', '\u00dcberraschung!', '\u00a1Sorpresa!') : T('Journeys', 'Reisen', 'Viajes'), sub: srcLabel('#btBar') });
        }
        if (D.getElementById('lsSun') || W.LowiSun) {
            const ls = D.getElementById('lsSun'), m = ls ? String(ls.textContent || '').match(/(\d+)\s*\/\s*(\d+)/) : null;
            out.push({ k: 'sun', on: !!(ls && ls.classList.contains('full')), ico: ICO.sun, n: m ? m[1] + '/' + m[2] : '', b: T('Sun', 'Sonne', 'Sol'), sub: srcLabel('#lsSun') });
        }
        if (D.getElementById('drChip') || W.LowiRitual) {
            const dc = D.getElementById('drChip'), m = dc ? String(dc.textContent || '').match(/(\d+)\s*\/\s*(\d+)/) : null;
            out.push({ k: 'goal', on: !!(dc && dc.classList.contains('won')), ico: ICO.flame, n: m ? m[1] + '/' + m[2] : '', b: T('Weekly goal', 'Wochenziel', 'Meta semanal'), sub: srcLabel('#drChip') });
        }
        return out;
    }
    function orb(it, attr) {
        return '<button type="button" class="mh-orb' + (it.on ? ' on' : '') + '" ' + attr + ' aria-label="' + esc(it.b + (it.sub && it.sub !== it.b ? ': ' + it.sub : '')) + '">' +
            '<span class="mh-ob" aria-hidden="true">' + (it.n ? '<span class="mh-on num">' + esc(it.n) + '</span>' : it.ico) + '</span><b>' + esc(it.b) + '</b></button>';
    }
    function todayHtml() {
        const its = todayItems(); if (!its.length) return '';
        return '<nav class="mh-today" aria-label="' + esc(T('Today with ' + name(), 'Heute mit ' + name(), 'Hoy con ' + name())) + '">' + its.map(it => orb(it, 'data-mh="t-' + it.k + '"')).join('') + '</nav>';
    }
    /* a tap on a bubble does what the hidden row did, from outside any sheet (body-trips.js treats a tap inside a sheet differently) */
    function proxy(attr, val) {
        const t = D.createElement('button'); t.type = 'button'; t.hidden = true; t.setAttribute(attr, val);
        D.body.appendChild(t); try { t.click(); } finally { t.remove(); }
    }
    const TODAY_ACT = { trip: () => proxy('data-bt', 'bar'), sun: () => proxy('data-ls', 'info'), goal: () => proxy('data-dr', 'chip') };
    function cycleHtml() { try { return W.LowiCycleWorld && W.LowiCycleWorld.hubHtml ? W.LowiCycleWorld.hubHtml() : ''; } catch (e) { return ''; } }
    function advHtml() { try { return W.LowiAdventureTiers && W.LowiAdventureTiers.html ? W.LowiAdventureTiers.html() : ''; } catch (e) { return ''; } }
    function rankHtml() { try { return W.LowiMistyRank && W.LowiMistyRank.html ? W.LowiMistyRank.html() : ''; } catch (e) { return ''; } }
    function peakHtml() { try { return W.LowiMistyPeak && W.LowiMistyPeak.html ? W.LowiMistyPeak.html() : ''; } catch (e) { return ''; } }
    function scaleHtml() { try { return W.LowiMistyScale && W.LowiMistyScale.html ? W.LowiMistyScale.html() : ''; } catch (e) { return ''; } }
    /* BH-017 (run 17): a card that is still sliding away (its overlay is .off) is not open; holding Misty again in that moment
       used to repaint the closing card and open nothing */
    function sheet() { return Array.from(D.querySelectorAll('#mistyHub')).find(e => !(e.closest && e.closest('.r2-ov.off'))) || null; }
    function open(sayOverride) {
        const R2 = W.LowiR2; if (!R2 || !R2.sheet) return false;
        if (sheet()) { repaint(sayOverride); return true; }
        try { if (W.LowiWorldHome && W.LowiWorldHome.state && W.LowiWorldHome.state.today) W.LowiWorldHome.openToday(false); } catch (e) { }
        R2.sheet(html(sayOverride), { cls: 'wh-ms-ov mh-ov' });
        try { W.LowiWorldHome && W.LowiWorldHome.syncX && setTimeout(W.LowiWorldHome.syncX, 20); } catch (e) { }
        hideNudge();
        return true;
    }
    function repaint(sayOverride) {
        const ex = sheet(); if (!ex) return;
        const t = D.createElement('div'); t.innerHTML = html(sayOverride);
        /* BH-016: keep focus on the same button (mood, Glow, ...) instead of dropping it to the page */
        if (W.LowiR2 && W.LowiR2.keepFocus) W.LowiR2.keepFocus(ex, t.firstChild); else ex.replaceWith(t.firstChild);
    }
    function close() { const ex = sheet(); const ov = ex && ex.closest('.r2-ov'); try { if (ov && W.LowiR2 && W.LowiR2.close) W.LowiR2.close(ov); else if (ov) ov.remove(); } catch (e) { ov && ov.remove(); } }
    function goodnight() {
        try { localStorage.setItem(GN_KEY, nightKey()); } catch (e) { }
        try { W.dispatchEvent(new CustomEvent('lowi:goodnight', { detail: { night: nightKey() } })); } catch (e) { }
        try { navigator.vibrate && navigator.vibrate(10); } catch (e) { }
        repaint();
    }
    D.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('#mistyHub [data-mh]'); if (!b) return;
        const k = b.dataset.mh;
        if (k === 'mood') {
            try { W.LowiCell && W.LowiCell.setMood(b.dataset.mood); } catch (x) { }
            const v = cell();
            repaint(v && v.mood ? cellCopy('thanks') : '');
        } else if (k === 'goodnight') goodnight();
        else if (k === 'forms') { try { if (W.LowiCompanion && W.LowiCompanion.open && W.LowiCompanion.open()) return; } catch (x) { } openDetails('grow'); }
        else if (k === 'glow') openDetails('aura');
        else if (k === 'rename') renameOpen();
        else if (k === 'cycle') { try { W.LowiCycleWorld && W.LowiCycleWorld.hubOpen && W.LowiCycleWorld.hubOpen(); } catch (x) { } }
        else if (k.indexOf('t-') === 0 && TODAY_ACT[k.slice(2)]) { const go = TODAY_ACT[k.slice(2)]; close(); setTimeout(() => { try { go(); } catch (x) { console.error(x); } }, 360); }
    });

    /* ---------- rename (Oct 19, aura-rename task; Emmanuel's friend: "change the name manually ... when their companion gets a
       name"). The pencil next to the name turns it into a small field: Save / Cancel, Enter saves, Escape cancels. Only the name
       changes (LowiBirthCompanion.rename): the look stays. Empty goes back to the generated name. ---------- */
    function autoName() { try { const B = W.LowiBirthCompanion; if (B && B.has && B.has()) { const c = B.get(); return (c && (c.autoName || c.name)) || 'Misty'; } } catch (e) { } return 'Misty'; }
    const q = sel => { const h = sheet(); return h ? h.querySelector(sel) : null; };   /* BH-017: only the open card, never one sliding away */
    function renaming() { return !!q('.mh-rnf'); }
    function renameOpen() {
        const box = q('.mh-name'); if (!box || renaming()) return;
        const cur = name(), auto = autoName();
        box.insertAdjacentHTML('afterend', '<form class="mh-rnf" data-back-layer novalidate><label class="mh-rnl"><span>' + esc(T('Name', 'Name', 'Nombre')) + '</span><input name="n" type="text" maxlength="24" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" value="' + esc(cur) + '"></label>' +
            '<div class="mh-rnb"><button type="submit" class="mh-rns">' + esc(T('Save', 'Speichern', 'Guardar')) + '</button><button type="button" class="mh-rnx" data-mhrnx>' + esc(T('Cancel', 'Abbrechen', 'Cancelar')) + '</button></div>' +
            (auto && auto !== cur ? '<small class="mh-rnh">' + esc(T('Leave it empty to go back to ' + auto + '.', 'Leer lassen, dann hei\u00dft es wieder ' + auto + '.', 'D\u00e9jalo en blanco para volver a ' + auto + '.')) + '</small>' : '') +
            '<p class="mh-rne" role="alert" hidden></p></form>');
        box.hidden = true; const pen = q('.mh-rn'); if (pen) pen.hidden = true;
        const inp = q('.mh-rnf input');
        if (inp) { try { inp.focus({ preventScroll: true }); inp.select(); } catch (e) { } }
    }
    function renameClose(focusPen) {
        const f = q('.mh-rnf'), box = q('.mh-name');
        if (f) f.remove(); if (box) box.hidden = false;
        const pen = q('.mh-rn'); if (pen) pen.hidden = false;
        if (focusPen) { const b = q('.mh-rn'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { } }
    }
    function renameSave(f) {
        const inp = f.querySelector('input'), err = f.querySelector('.mh-rne');
        const B = W.LowiBirthCompanion;
        const r = B && B.rename ? B.rename(inp ? inp.value : '') : { ok: false, why: 'save' };
        if (!r.ok) {
            if (err) { err.hidden = false; err.textContent = r.why === 'save' ? T('Couldn\u2019t save the name. Please try again.', 'Der Name lie\u00df sich nicht speichern. Bitte nochmal versuchen.', 'No se pudo guardar el nombre. Int\u00e9ntalo de nuevo.') : T('Use at least one letter or number.', 'Mindestens ein Buchstabe oder eine Zahl, bitte.', 'Usa al menos una letra o un n\u00famero.'); }
            if (inp) inp.setAttribute('aria-invalid', 'true');
            return;
        }
        repaint();
        const b = q('.mh-rn'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { }
        try { navigator.vibrate && navigator.vibrate(8); } catch (e) { }
        try { W.LowiR2.toast(r.reset ? T('Back to ' + r.name, 'Hei\u00dft wieder ' + r.name, 'Vuelve a llamarse ' + r.name) : T('Now called ' + r.name, 'Hei\u00dft jetzt ' + r.name, 'Ahora se llama ' + r.name)); } catch (e) { }
    }
    D.addEventListener('submit', e => { const f = e.target && e.target.closest && e.target.closest('#mistyHub .mh-rnf'); if (!f) return; e.preventDefault(); renameSave(f); });
    D.addEventListener('click', e => { if (e.target.closest && e.target.closest('#mistyHub [data-mhrnx]')) { e.preventDefault(); renameClose(true); } });
    /* Escape cancels the rename, not the whole card. Back (Safari swipe / Android back) sends Escape too: the form carries
       data-back-layer so back-swipe.js sees that back closed it and stays in the app (bug hunt Oct 24 17:02). */
    D.addEventListener('keydown', e => { if (e.key !== 'Escape' || !e.target || !e.target.closest || !e.target.closest('#mistyHub .mh-rnf')) return; e.preventDefault(); e.stopImmediatePropagation(); renameClose(true); }, true);
    function openDetails(tab) { try { if (W.LowiWorldHome && W.LowiWorldHome.openDetails) return W.LowiWorldHome.openDetails(tab); } catch (e) { } return false; }
    /* lowi:aura / lowi:companion (Oct 19): a new aura or name shows on the card right away; a background repaint never wipes a
       half-typed rename */
    ['lowi:herb-xp', 'lowi:cell-state', 'lowi:meal-logged', 'lowi:lang', 'lowi:aura', 'lowi:companion'].forEach(ev => W.addEventListener(ev, () => { if (sheet() && !renaming()) repaint(); }));

    /* ---------- Misty's nudges on Home ---------- */
    /* Oct 25 2026, 08:01 (Eman, iPhone screenshot of the little bubble and the Today sheet it opened: "Nuke it. I don't know what
       this is for anymore."): the nudge is retired. It popped up and faded before anyone knew it was tappable, and it only ever led
       into the overloaded Today sheet, which is retired too (world-home.js TODAY_RETIRED). What it pointed at stays reachable with
       no bubble: the surprise after a journey, the sun and the weekly goal are round bubbles on Misty's card (todayHtml below),
       Goodnight stays on her card at night. The code below is kept for its pure helpers (candidates, nudgeSpot) but never shows. */
    const NUDGES_RETIRED = true;
    const NUDGE_GAP = 90e3, NUDGE_SHOW = 11e3, NUDGE_DAY_MAX = 4, SETTLE = 3500;
    let nudge = null, nudgeEl = null, hideT = 0, homeSince = 0, lastShown = 0;
    const NUDGE_RETRY = 10 * 60e3, NUDGE_SHOWS_MAX = 8, retry = {}, shows = [];
    function seen() { try { const s = JSON.parse(localStorage.getItem(NUDGE_KEY) || '{}'); return s && typeof s === 'object' ? s : {}; } catch (e) { return {}; } }
    function markSeen(key) {
        const s = seen(), now = Date.now(); s[key] = now;
        Object.keys(s).forEach(k => { if (now - s[k] > 3 * 864e5) delete s[k]; });
        try { localStorage.setItem(NUDGE_KEY, JSON.stringify(s)); } catch (e) { }
    }
    function shownToday() { const s = seen(), d = dayKey(); return Object.values(s).filter(t => dayKey(t) === d).length; }
    function tripKey() { try { const b = W.LowiBodyTrips && W.LowiBodyTrips.state && W.LowiBodyTrips.state(); const t = b && b.trip; return t ? String(t.place || '') + ':' + String(t.start || t.at || t.ts || t.until || dayKey()) : dayKey(); } catch (e) { return dayKey(); } }
    /* what in Today needs you right now, most important first (one at a time) */
    function candidates() {
        const out = [], home = D.getElementById('spHome');
        if (home && home.querySelector('[data-bt="bar"].back')) out.push({ key: 'trip:' + tripKey(), row: '[data-bt="bar"].back', text: T('I\u2019m back! Open Today for your surprise.', 'Bin zur\u00fcck! \u00d6ffne Heute f\u00fcr deine \u00dcberraschung.', '\u00a1Volv\u00ed! Abre Hoy para tu sorpresa.') });
        let sun = null; try { sun = W.LowiSun && W.LowiSun.live && W.LowiSun.live(); } catch (e) { }
        if (sun && sun.full && !sun.away) out.push({ key: 'sun:' + dayKey(), row: '.ls-row, [class*="ls-"].full', text: T('My sun is full! Peek in Today.', 'Meine Sonne ist voll! Schau in Heute.', '\u00a1Mi sol est\u00e1 lleno! Mira en Hoy.') });
        if (isNight() && !saidGoodnight() && home && home.querySelector('.sp-next[data-sp="open"]')) out.push({ key: 'gn:' + nightKey(), row: '.sp-next[data-sp="open"]', text: T('I\u2019m sleepy\u2026 say goodnight in Today?', 'Ich bin m\u00fcde \u2026 sagst du mir in Heute gute Nacht?', 'Tengo sue\u00f1o\u2026 \u00bfme das las buenas noches en Hoy?') });
        return out;
    }
    /* why Misty stays quiet right now ('' = she may speak) */
    function quiet() {
        if (D.hidden) return 'hidden';
        /* Oct 17 (E-man): no nudges while Misty flies (autopilot or steering); nobody reads them then */
        if (H.classList.contains('mf-on')) return 'flying';
        const wh = W.LowiWorldHome;
        const tab = D.getElementById('tab-home');
        if (!tab || !tab.classList.contains('active')) return 'not-home';
        if (!H.classList.contains('wh-home')) return 'no-world';
        if (wh && wh.state && wh.state.today) return 'today-open';
        const busy = ['wh-today-open', 'gate-up', 'gx-hold'].find(c => H.classList.contains(c)); if (busy) return busy;
        try { const t = W.LowiR2 && W.LowiR2.top && W.LowiR2.top(); if (t && t.isConnected) return 'sheet'; } catch (e) { }
        if ([...D.querySelectorAll('.cf-ov.on, #drDay')].some(e => e.getBoundingClientRect().width > 0)) return 'overlay';
        const hint = D.getElementById('whHint'); if (hint && hint.classList.contains('on')) return 'hint';
        const b = D.getElementById('spBubble'); if (!b || !b.getBoundingClientRect().width) return 'no-misty';
        return '';
    }
    /* Oct 19 (bug hunt BH-002): on the ring Home the spot right above Misty's head sits on Settings, Water and Fuel, so the nudge
       covered them and a tap on their upper half opened Today instead. Controls are never covered: when the head spot touches one,
       the nudge moves to the top (or bottom) of the screen with no tail, like the guides' speech bubbles inside worlds (BH-001).
       Pure: m = Misty's rect {l, t, w}, b = nudge size {w, h}, obs = control rects {l, t, r, b}, view = {w, h}. */
    function nudgeSpot(m, b, obs, view) {
        const ov = (q, o) => Math.max(0, Math.min(q.l + b.w, o.r) - Math.max(q.l, o.l)) * Math.max(0, Math.min(q.t + b.h, o.b) - Math.max(q.t, o.t));
        const cost = q => (obs || []).reduce((c, o) => c + ov(q, o), 0);
        const cx = m.l + m.w / 2, half = b.w / 2;
        const head = { l: cx - half, t: Math.max(8, m.t - b.h - 10) };
        if (!cost(head)) return { x: cx, t: head.t, dock: false };
        const x = Math.max(10 + half, Math.min(view.w - 10 - half, cx));
        let best = null, bc = cost(head);
        for (const t of [56, view.h - b.h - 28]) { const q = { l: x - half, t }; const c = cost(q); if (c < bc) { bc = c; best = { x, t, dock: true }; } }
        return best || { x: cx, t: head.t, dock: false };
    }
    function nudgeObstacles() {
        const out = [];
        D.querySelectorAll('[data-orbit], #whPad').forEach(e => {
            const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return;
            const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
            out.push({ l: r.left - 4, t: r.top - 4, r: r.right + 4, b: r.bottom + 4 }); /* faded controls too: they come straight back */
        });
        return out;
    }
    function place() {
        if (!nudgeEl) return;
        const b = D.getElementById('spBubble'); if (!b) return;
        /* same spot as Misty's own speech line (world-home paintHint): right above her head, tail on her, unless that covers a control */
        const r = b.getBoundingClientRect();
        const s = nudgeSpot({ l: r.left, t: r.top, w: r.width }, { w: nudgeEl.offsetWidth, h: nudgeEl.offsetHeight }, nudgeObstacles(), { w: W.innerWidth, h: W.innerHeight });
        nudgeEl.style.left = Math.round(s.x) + 'px';
        nudgeEl.style.top = Math.round(s.t) + 'px';
        if (nudgeEl.classList.contains('mh-dock') !== s.dock) nudgeEl.classList.toggle('mh-dock', s.dock);
    }
    function showNudge(n) {
        const hud = D.getElementById('whHud') || (D.getElementById('whHint') || {}).parentElement || D.body;
        if (!nudgeEl || !nudgeEl.isConnected) {
            nudgeEl = D.createElement('button'); nudgeEl.type = 'button'; nudgeEl.id = 'mhNudge';
            nudgeEl.className = 'wh-hint wh-say mh-nudge';
            nudgeEl.setAttribute('aria-live', 'polite');
            nudgeEl.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); tapNudge(); });
            hud.appendChild(nudgeEl);
        }
        /* only a deliberate tap on the nudge marks it (tapNudge); a nudge that fades unread may come back after NUDGE_RETRY */
        nudge = n; lastShown = Date.now(); retry[n.key] = lastShown; shows.push(lastShown);
        nudgeEl.textContent = n.text;
        nudgeEl.setAttribute('aria-label', n.text + ' \u00b7 ' + T('Open Today', 'Heute \u00f6ffnen', 'Abrir Hoy'));
        place();
        requestAnimationFrame(() => { nudgeEl && nudgeEl.classList.add('on'); });
        clearTimeout(hideT); hideT = setTimeout(hideNudge, W.LowiReadTime ? W.LowiReadTime.atLeast(n.text, NUDGE_SHOW) : NUDGE_SHOW); /* never shorter than its reading time */
    }
    function hideNudge() { clearTimeout(hideT); if (nudgeEl) nudgeEl.classList.remove('on'); nudge = null; }
    function tapNudge() {
        const n = nudge; hideNudge(); if (n) markSeen(n.key);
        try { W.LowiWorldHome && W.LowiWorldHome.openToday(true); } catch (e) { }
        if (!n || !n.row) return;
        /* Today repaints its rows while it opens, so keep re-finding the row and keep the glow on it for a moment */
        const sel = n.row.split(',').map(x => '#whToday ' + x.trim()).join(', ');
        let k = 0, scrolled = false;
        const iv = setInterval(() => {
            const r = D.querySelector(sel);
            if (r) {
                if (!scrolled) { scrolled = true; try { r.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { } }
                r.classList.add('mh-point');
            }
            if (++k > 10) { clearInterval(iv); D.querySelectorAll('.mh-point').forEach(x => x.classList.remove('mh-point')); }
        }, 260);
    }
    function tick() {
        if (NUDGES_RETIRED) { if (nudge) hideNudge(); return; }
        if (quiet()) { homeSince = 0; if (nudge) hideNudge(); return; }
        if (!homeSince) { homeSince = Date.now(); return; }
        if (nudge) { place(); return; }
        if (Date.now() - homeSince < SETTLE || Date.now() - lastShown < NUDGE_GAP || shownToday() >= NUDGE_DAY_MAX) return;
        /* misty-say (Oct 22): one message at a time: no nudge while Misty's speech bubble (praise.js) is up or has lines waiting */
        try { if (W.LowiPraise && W.LowiPraise.talking && W.LowiPraise.talking()) return; } catch (e) { }
        const now = Date.now(); while (shows.length && dayKey(shows[0]) !== dayKey(now)) shows.shift();
        if (shows.length >= NUDGE_SHOWS_MAX) return;
        const s = seen(), n = candidates().find(c => !s[c.key] && !(retry[c.key] && now - retry[c.key] < NUDGE_RETRY));
        if (n) showNudge(n);
    }
    /* retired: no 1.5 s timer any more (one less wake-up for the battery) */
    function boot() { if (NUDGES_RETIRED) { const old = D.getElementById('mhNudge'); if (old) old.remove(); return; } setInterval(tick, 1500); W.addEventListener('resize', place); }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();

    /* ---------- My day (Oct 25 2026) ----------
       The other things that only lived in the retired Today sheet: the six old day shortcuts (Check-ins, Meals, Your plate,
       Medicine, Shopping, Extras: index.html g2h panels), the macro goals (spirit.js data-sp=goals) and the "Your inside" row
       (inside-row.js #brRow). Reached from Community hold -> You -> My day (home-settings-sleep-v2.js route 'myday'): one small
       sheet of round bubbles, nothing else on it. The bubbles mirror whatever #g2hTiles holds right now (index.html shows a tile
       only when its part has something), and a tap closes the sheet and does exactly what the old tile did. */
    const DAY_ICO = { macro: ICO.macro, inside: ICO.inside };
    function dayItems() {
        const out = [];
        D.querySelectorAll('#g2hTiles [data-g2h-open]').forEach(b => {
            const k = b.dataset.g2hOpen, lab = b.querySelector('b'), ic = b.querySelector('.g2h-ic'), sm = b.querySelector('small');
            if (!k || out.some(o => o.k === 'g-' + k)) return;
            out.push({ k: 'g-' + k, b: lab ? lab.textContent.trim() : k, sub: sm ? sm.textContent.trim() : '', ico: ic ? ic.innerHTML : ICO.macro });
        });
        if (W.LowiSpirit) out.push({ k: 'macro', b: T('Macro goals', 'Makro-Ziele', 'Metas de macros'), sub: '', ico: DAY_ICO.macro });
        if (D.getElementById('brRow')) out.push({ k: 'inside', b: T('Your inside', 'Dein Inneres', 'Tu interior'), sub: '', ico: DAY_ICO.inside });
        return out;
    }
    function dayAct(k) {
        if (k.indexOf('g-') === 0) return proxy('data-g2h-open', k.slice(2));
        if (k === 'macro') return proxy('data-sp', 'goals');
        if (k === 'inside') { const r = D.getElementById('brRow'); if (r) r.click(); }
    }
    function dayHtml() {
        const its = dayItems();
        const a = aura() || {};
        return '<div class="mh mh-day" id="myDay" data-noi18n style="--a:' + esc(a.a || '#7cf0c0') + ';--b:' + esc(a.b || '#5ab0ff') + '">' +
            '<h2 class="mh-day-t">' + esc(T('My day', 'Mein Tag', 'Mi d\u00eda')) + '</h2>' +
            (its.length ? '<nav class="mh-today mh-day-grid">' + its.map(it => orb(it, 'data-myday="' + esc(it.k) + '"')).join('') + '</nav>'
                : '<p class="mh-day-none">' + esc(T('Nothing here yet.', 'Hier ist noch nichts.', 'A\u00fan no hay nada.')) + '</p>') + '</div>';
    }
    function daySheet() { return Array.from(D.querySelectorAll('#myDay')).find(e => !(e.closest && e.closest('.r2-ov.off'))) || null; }
    function dayOpen() {
        const R2 = W.LowiR2; if (!R2 || !R2.sheet) return false;
        dayClose();
        R2.sheet(dayHtml(), { cls: 'wh-ms-ov mh-ov mh-day-ov' });
        try { W.LowiWorldHome && W.LowiWorldHome.syncX && setTimeout(W.LowiWorldHome.syncX, 20); } catch (e) { }
        if (!hasTiles()) refill(0);
        return true;
    }
    /* index.html re-renders the shortcut tiles when Home comes back (Community -> Home first): for a moment there are none, so the
       sheet fills them in as soon as they are back (a few short looks, then it stops) */
    function hasTiles() { return !!D.querySelector('#g2hTiles [data-g2h-open]'); }
    function refill(n) {
        setTimeout(() => {
            const ex = daySheet(); if (!ex) return;
            if (!hasTiles()) { if (n < 8) refill(n + 1); return; }
            const t = D.createElement('div'); t.innerHTML = dayHtml(); const fresh = t.firstElementChild;
            if (fresh) { ex.innerHTML = fresh.innerHTML; }
        }, 250);
    }
    function dayClose() { const ex = daySheet(); const ov = ex && ex.closest('.r2-ov'); try { if (ov && W.LowiR2 && W.LowiR2.close) W.LowiR2.close(ov); else if (ov) ov.remove(); } catch (e) { ov && ov.remove(); } }
    D.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('[data-myday]'); if (!b || !b.closest('#myDay')) return;
        const k = b.dataset.myday; dayClose(); setTimeout(() => { try { dayAct(k); } catch (x) { console.error(x); } }, 360);
    });
    W.LowiMyDay = { open: dayOpen, close: dayClose, items: dayItems, _html: dayHtml };

    W.LowiMistyHub = { open, close, repaint, goodnight, saidGoodnight, nightKey, candidates, tick, quiet, nudgeSpot, nudgesRetired: NUDGES_RETIRED, todayItems, _html: html };
})();

/* Oct 23 2026 (Eman: "when we check our own Misty stats, that's where we see where Misty's ranked, worldwide basically. So people get
   kind of motivated to see where they're ranked. Like a little preview, a very tiny preview, to others."): the rank peek in Misty's
   card. One small glass pill right under her picture and name: a small label (Worldwide \u00b7 board), the short value (#3) at the same size, and three
   tiny companions: the one just above, Misty, the one just below. Rules from ranking-core.js peek (the live Ranking's rows: real
   accounts only, Eman's accounts once, no bots); the board is the one where her place is best, a tie goes to All time. Hidden when
   she isn't on any board or is alone on it. A tap opens Community > Ranking on that board, at Your place. */
(() => {
    'use strict';
    const W = window, D = document;
    if (W.LowiMistyRank) return;
    const K = () => W.LowiRankingCore, CC = () => W.LowiCompanionCore, LC = () => W.LowiCompanion, R3 = () => W.LowiR3;
    const LI = () => { try { return Math.max(0, ['en', 'de', 'es'].indexOf(((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || D.documentElement.lang || 'en').slice(0, 2))); } catch (e) { return 0; } };
    const TX = {
        world: ['Worldwide', 'Weltweit', 'Mundial'],
        w: ['Week', 'Woche', 'Semana'], m: ['Month', 'Monat', 'Mes'], all: ['All time', 'Gesamt', 'Total'],
        aria: ['{name} is number {n} worldwide, {per}. Open the Ranking', '{name} ist weltweit auf Platz {n}, {per}. Rangliste \u00f6ffnen', '{name} est\u00e1 en el puesto {n} mundial, {per}. Abrir la clasificaci\u00f3n']
    };
    const tr = (k, v) => { let s = (TX[k] || [k])[LI()] || TX[k][0]; for (const x in v || {}) s = s.split('{' + x + '}').join(String(v[x])); return s; };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    let looks = {}, fetchedAt = 0, fetching = false, last = null;
    function data() {
        const k = K(), r = R3(); if (!k || !k.peek || !r || !r.everyone) return null;
        let ppl = [], care = null;
        try { ppl = r.everyone() || []; const m = r.me && r.me(); care = m && m.care; } catch (e) { return null; }
        try { return k.peek(ppl, Date.now(), care); } catch (e) { return null; }
    }
    /* Bug hunt Oct 24: the pill's label (read out by VoiceOver) named the old herb auto name ("Sunny Leaf is number 2 worldwide")
       while the card above it says "Misty" or the name you gave. Same BH-006 chain as the card: own companion > a typed name > Misty. */
    function myName() { try { const B = W.LowiBirthCompanion; if (B && B.displayName) { const n = B.displayName(); if (n) return n; } } catch (e) { } const pick = v => { v = v == null ? '' : String(v).trim(); return v ? v.slice(0, 24) : ''; }; let auto = ''; try { auto = pick(W.LowiHerbIdentity && W.LowiHerbIdentity.autoName && W.LowiHerbIdentity.autoName()); } catch (e) { } const typed = v => { v = pick(v); return v && v !== auto ? v : ''; }; let n = ''; try { const t = W.LowiHerbTamagotchi, p = t && t.readPrefs && t.readPrefs(); n = typed(p && p.name); } catch (e) { } if (!n) try { const R = W.LowiR2, st = R && R.S && R.S(); n = typed(st && st.herb && st.herb.name); } catch (e) { } return n || 'Misty'; }
    function genomeOf(p) {
        const C = CC(); if (!C || !p) return null;
        if (p.me) { try { return LC() && LC().genome ? LC().genome() : null; } catch (e) { return null; } }
        let f = {}; try { f = (LC() && LC().friendLooks && LC().friendLooks()) || {}; } catch (e) { }
        const code = K().lookFor(p, Object.assign({}, f, looks));
        try { return code ? C.decode(code) : null; } catch (e) { return null; }
    }
    function face(x, slot) {
        if (!x) return '';
        const g = genomeOf(x.p); let s = '';
        if (g) { try { s = CC().miniSVG(g, 'mhrk' + slot); } catch (e) { s = ''; } }
        return '<span class="mh-rk-f ' + slot + (s ? '' : ' hid') + '" aria-hidden="true">' + (s || '<i></i>') + '</span>';
    }
    async function fetchLooks(uids) {
        uids = uids.filter(u => u && !/^(bot|demo|sample)[:_-]/i.test(u) && !looks[u]);
        if (fetching || !uids.length || Date.now() - fetchedAt < 120000) return;
        const X = W.LOWI_CLOUD_X; if (!X || !X.client) return;
        try { const st = X.state(); if (!st || !st.live) return; } catch (e) { return; }
        fetching = true;
        try {
            const sb = await X.client();
            const r = await sb.from('profiles').select('id,look').in('id', uids.slice(0, 4));
            if (!r.error && Array.isArray(r.data)) {
                const C = CC();
                r.data.forEach(row => { if (row && row.look && (!C || C.decode(row.look))) looks[row.id] = row.look; });
                fetchedAt = Date.now();
                const fresh = html();
                D.querySelectorAll('.mh-rk').forEach(el => { const t = D.createElement('div'); t.innerHTML = fresh; if (t.firstChild) el.replaceWith(t.firstChild); });
            }
        } catch (e) { } finally { fetching = false; }
    }
    function html() {
        const d = data(); last = d;
        if (!d) return '';
        const per = tr(d.k);
        setTimeout(() => fetchLooks([d.up, d.down].filter(Boolean).map(x => String(x.p.uid || ''))), 0);
        return '<button type="button" class="mh-rk" data-mhrk="' + esc(d.k) + '" aria-label="' + esc(tr('aria', { name: myName(), n: d.rank, per })) + '">' +
            '<span class="mh-rk-t"><span class="mh-rk-l">' + esc(tr('world')) + ' \u00b7 ' + esc(per) + '</span><b class="mh-rk-v num">#' + d.rank + '</b></span>' +
            '<span class="mh-rk-fs" aria-hidden="true">' + face(d.up, 'up') + face(d.me, 'me') + face(d.down, 'dn') + '</span>' +
            '<span class="mh-rk-go" aria-hidden="true">\u203a</span></button>';
    }
    /* Community > Ranking on that board, then Your place glows for a moment */
    function open(k) {
        const R = W.LowiRanking; if (!R || !R.open) return false;
        try { navigator.vibrate && navigator.vibrate(8); } catch (e) { }
        try { if (k && R.setPeriod) R.setPeriod(k); } catch (e) { }
        R.open();
        let n = 0;
        const find = () => {
            const me = D.querySelector('.rk .rk-me');
            if (me && me.getClientRects().length) {
                try { me.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { }
                me.classList.add('mh-rk-hi'); setTimeout(() => me.classList.remove('mh-rk-hi'), 1800);
                return;
            }
            if (++n < 30) setTimeout(find, 120);
        };
        setTimeout(find, 200);
        return true;
    }
    D.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('#mistyHub [data-mhrk]'); if (!b) return;
        e.preventDefault(); open(b.dataset.mhrk);
    });
    W.LowiMistyRank = { html, open, data, last: () => last };
})();
