/* LOWiSPIKE cycle world (Oct 23 2026), stage 1 of cycle tracking.
   Why: the previous Maya built this on her own computer and it never reached GitHub; rebuilt from her notes:
   "only for women. Onboarding asks about it, so it is off for everyone else. Phases are shown as a cell world, not weather,
   and there are no seasons. Symptoms are stage 2." Emmanuel: gentle, simple, the app's own fluid glass, no numbers wall.
   What it does: one sheet (LowiR2.sheet with the shared one-sheet glass) that draws the current phase as a little cell world
   (rest, grow, glow, gather), says the day, and logs the first day of a period. The data is the round 3D cycle data
   (S.health.cyc, private like the other health logs; LowiCycle in index.html does the maths: model(), markStart(), setShow()).
   Not medical: no hormones, no fertility, no diagnosis; it says it is a rough guide from her own dates.
   API window.LowiCycleWorld {open(), close(), isOpen(), enabled(), eligible(), tileSub(), rule(state), cellOf(ph, lang), scene(m, lang),
   homeRing(m, on, lang), hubHtml(), hubOpen(), paintRing()} (the Home part, Oct 24 2026, see the bottom).
   rule / eligible / cellOf / scene are pure for node tests. EN / DE / ES. */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiCycleWorld = api;
})(typeof window !== 'undefined' ? window : globalThis, function (W) {
    'use strict';
    const D = W.document;
    const PH = ['menstrual', 'follicular', 'ovulation', 'luteal'];
    const CELL = { menstrual: 'rest', follicular: 'grow', ovulation: 'glow', luteal: 'gather' };
    const STR = {
        en: { title: 'Your cycle', day: 'Day {d}', close: 'Close', ringL: 'Estimated cycle phase: {n}', hubOpen: 'Open your cycle',
            rest: 'Rest', grow: 'Grow', glow: 'Glow', gather: 'Gather',
            restP: 'Period', growP: 'After your period', glowP: 'Mid-cycle', gatherP: 'Before your period',
            restL: 'Your cells rest and recharge. Go easy on yourself today.', growL: 'New little cells bud and grow.',
            glowL: 'Your cell world shines its brightest.', gatherL: 'Your cells gather close and slow down. Be kind to yourself.',
            next: 'Next period in about {n} days', nextTom: 'Your period may come tomorrow', nextToday: 'Your period may come around today', nextSoon: 'Your period may come any day now',
            started: 'My period started today', other: 'It started on another day', first: 'First day', save: 'Save', saved: 'Saved',
            askT: 'When did your last period start?', askS: 'Log the first day and your cell world shows where you are.',
            offT: 'Track your cycle?', offS: 'See where you are in your cycle as a little cell world. Private on this phone.', turnOn: 'Turn on',
            turnOff: 'Turn off cycle tracking', offDone: 'Cycle tracking is off. You can turn it on again here any time.',
            hedge: 'A rough guide from your own dates, not medical advice. Every body has its own rhythm.',
            tileOff: 'Off', tileStart: 'Log your first day', svgL: 'Your cycle as a cell world: rest, grow, glow, gather' },
        de: { title: 'Dein Zyklus', day: 'Tag {d}', close: 'Schließen', ringL: 'Geschätzte Zyklusphase: {n}', hubOpen: 'Deinen Zyklus öffnen',
            rest: 'Ruhen', grow: 'Wachsen', glow: 'Leuchten', gather: 'Sammeln',
            restP: 'Periode', growP: 'Nach der Periode', glowP: 'Zyklusmitte', gatherP: 'Vor der Periode',
            restL: 'Deine Zellen ruhen und tanken auf. Mach heute sanft.', growL: 'Neue kleine Zellen knospen und wachsen.',
            glowL: 'Deine Zellwelt leuchtet am hellsten.', gatherL: 'Deine Zellen rücken zusammen und werden ruhiger. Sei lieb zu dir.',
            next: 'Nächste Periode in etwa {n} Tagen', nextTom: 'Deine Periode kommt vielleicht morgen', nextToday: 'Deine Periode kommt vielleicht um heute herum', nextSoon: 'Deine Periode kann jeden Tag kommen',
            started: 'Meine Periode hat heute angefangen', other: 'Sie hat an einem anderen Tag angefangen', first: 'Erster Tag', save: 'Speichern', saved: 'Gespeichert',
            askT: 'Wann hat deine letzte Periode angefangen?', askS: 'Trag den ersten Tag ein und deine Zellwelt zeigt, wo du stehst.',
            offT: 'Zyklus verfolgen?', offS: 'Sieh als kleine Zellwelt, wo du in deinem Zyklus stehst. Privat auf diesem Handy.', turnOn: 'Einschalten',
            turnOff: 'Zyklus-Tracking ausschalten', offDone: 'Zyklus-Tracking ist aus. Du kannst es hier jederzeit wieder einschalten.',
            hedge: 'Eine grobe Orientierung aus deinen eigenen Daten, kein medizinischer Rat. Jeder Körper hat seinen eigenen Rhythmus.',
            tileOff: 'Aus', tileStart: 'Ersten Tag eintragen', svgL: 'Dein Zyklus als Zellwelt: ruhen, wachsen, leuchten, sammeln' },
        es: { title: 'Tu ciclo', day: 'Día {d}', close: 'Cerrar', ringL: 'Fase estimada del ciclo: {n}', hubOpen: 'Abrir tu ciclo',
            rest: 'Reposo', grow: 'Crecer', glow: 'Brillo', gather: 'Juntarse',
            restP: 'Regla', growP: 'Después de la regla', glowP: 'Mitad del ciclo', gatherP: 'Antes de la regla',
            restL: 'Tus células descansan y recargan. Tómatelo con calma hoy.', growL: 'Nuevas celulitas brotan y crecen.',
            glowL: 'Tu mundo celular brilla al máximo.', gatherL: 'Tus células se juntan y van más despacio. Trátate con cariño.',
            next: 'Próxima regla en unos {n} días', nextTom: 'Tu regla puede venir mañana', nextToday: 'Tu regla puede venir hacia hoy', nextSoon: 'Tu regla puede venir cualquier día',
            started: 'Mi regla empezó hoy', other: 'Empezó otro día', first: 'Primer día', save: 'Guardar', saved: 'Guardado',
            askT: '¿Cuándo empezó tu última regla?', askS: 'Apunta el primer día y tu mundo celular te muestra dónde estás.',
            offT: '¿Seguir tu ciclo?', offS: 'Mira en qué punto de tu ciclo estás como un pequeño mundo celular. Privado en este móvil.', turnOn: 'Activar',
            turnOff: 'Desactivar el seguimiento del ciclo', offDone: 'El seguimiento del ciclo está desactivado. Puedes activarlo aquí cuando quieras.',
            hedge: 'Una guía aproximada con tus propias fechas, no un consejo médico. Cada cuerpo tiene su propio ritmo.',
            tileOff: 'Desactivado', tileStart: 'Apunta tu primer día', svgL: 'Tu ciclo como mundo celular: reposo, crecer, brillo, juntarse' }
    };
    /* setup step 2 and the profile tile are translated by LowiLang (the setup sheet is not data-noi18n) */
    const LANG_ROWS = [
        ['Track your cycle?', 'Zyklus verfolgen?', '¿Seguir tu ciclo?'],
        ['See your phase as a little cell world. Private on this phone.', 'Sieh deine Phase als kleine Zellwelt. Privat auf diesem Handy.', 'Mira tu fase como un pequeño mundo celular. Privado en este móvil.'],
        ['Yes, track it', 'Ja, verfolgen', 'Sí, seguirlo'], ['No thanks', 'Nein danke', 'No, gracias'],
        ['My cycle', 'Mein Zyklus', 'Mi ciclo']
    ];

    const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const lang = () => { try { const l = (W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || (D && D.documentElement.lang) || 'en'; const k = String(l).slice(0, 2); return STR[k] ? k : 'en'; } catch (e) { return 'en'; } };
    const s = (k, v, l) => { let t = (STR[l || lang()] || STR.en)[k] || STR.en[k] || k; if (v) Object.keys(v).forEach(x => { t = t.replace('{' + x + '}', v[x]); }); return t; };

    /* ---------- pure rules ---------- */
    function eligible(state) { return !!(state && state.user && state.user.gender === 'f'); }
    /* on only for a woman who said yes; a woman who tracked before the question existed (set up, or a logged period) keeps it */
    function rule(state) {
        if (!eligible(state)) return false;
        const h = state.health || {}, c = h.cyc && typeof h.cyc === 'object' ? h.cyc : {};
        if (c.show === true) return true;
        if (c.show === false) return false;
        const days = c.days || {};
        return !!c.setup || !!h.cycleOn || Object.keys(days).some(k => days[k] && days[k].p && days[k].p !== 'none' && days[k].p !== 'spot');
    }
    function cellOf(ph, l) {
        const id = CELL[ph]; if (!id) return null;
        return { id, ph, name: s(id, null, l), plain: s(id + 'P', null, l), line: s(id + 'L', null, l) };
    }

    /* ---------- the scene: a cell world ---------- */
    const CX = 150, CY = 100;
    function cell(x, y, r, cls, k) {
        const n = r * .36, a = (k || 0) * 1.7;
        return '<g class="cw-cell ' + (cls || '') + '" style="--d:' + ((k || 0) * .6).toFixed(1) + 's">' +
            '<circle class="cw-mem" cx="' + x + '" cy="' + y + '" r="' + r + '"/>' +
            '<circle class="cw-nuc" cx="' + (x + Math.cos(a) * r * .18).toFixed(1) + '" cy="' + (y - r * .12 + Math.sin(a) * r * .1).toFixed(1) + '" r="' + n.toFixed(1) + '"/>' +
            '<circle class="cw-org" cx="' + (x - r * .5).toFixed(1) + '" cy="' + (y + r * .32).toFixed(1) + '" r="' + Math.max(1.6, r * .09).toFixed(1) + '"/>' +
            '<circle class="cw-org" cx="' + (x + r * .45).toFixed(1) + '" cy="' + (y + r * .42).toFixed(1) + '" r="' + Math.max(1.3, r * .07).toFixed(1) + '"/>' +
            '<circle class="cw-shine" cx="' + (x - r * .38).toFixed(1) + '" cy="' + (y - r * .42).toFixed(1) + '" r="' + (r * .16).toFixed(1) + '"/></g>';
    }
    function world(id) {
        if (id === 'rest') return '<g class="cw-dust">' + [[96, 160], [118, 168], [182, 166], [206, 158], [150, 172]].map((p, i) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (2 + i % 2) + '" style="--d:' + i + 's"/>').join('') + '</g>' + cell(CX, CY + 4, 50, 'cw-main');
        if (id === 'grow') return cell(CX - 8, CY + 4, 46, 'cw-main') + cell(CX + 52, CY - 30, 17, 'cw-bud', 1) + cell(CX + 50, CY + 38, 13, 'cw-bud', 2) + cell(CX - 62, CY + 40, 11, 'cw-bud', 3);
        if (id === 'glow') return '<circle class="cw-halo" cx="' + CX + '" cy="' + CY + '" r="78"/>' + Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2; return '<circle class="cw-spark" cx="' + (CX + Math.cos(a) * 70).toFixed(1) + '" cy="' + (CY + Math.sin(a) * 66).toFixed(1) + '" r="2.6" style="--d:' + (i * .35).toFixed(2) + 's"/>'; }).join('') + cell(CX, CY, 52, 'cw-main');
        if (id === 'gather') return [[CX - 30, CY - 16, 28], [CX + 28, CY - 18, 26], [CX - 2, CY + 26, 30], [CX - 52, CY + 30, 18], [CX + 50, CY + 26, 19]].map((p, i) => cell(p[0], p[1], p[2], i === 2 ? 'cw-main' : 'cw-near', i)).join('');
        return cell(CX, CY + 4, 46, 'cw-main cw-wait');
    }
    function scene(m, l) {
        const ph = m && m.has && CELL[m.ph] ? m.ph : (m && CELL[m.ph] ? m.ph : '');
        const id = ph ? CELL[ph] : 'none';
        const xs = [54, 118, 182, 246];
        const track = '<path class="cw-track" d="M54 208 C 86 196, 86 220, 118 208 S 150 196, 182 208 S 214 220, 246 208"/>' +
            PH.map((p, i) => { const on = p === ph; return '<g data-cell="' + CELL[p] + '" class="cw-mini' + (on ? ' on' : '') + '" style="--c:var(--cw-' + CELL[p] + ')">' +
                '<circle class="cw-mh" cx="' + xs[i] + '" cy="208" r="' + (on ? 22 : 0) + '"/><circle class="cw-md" cx="' + xs[i] + '" cy="208" r="' + (on ? 13 : 9) + '"/>' +
                '<text x="' + xs[i] + '" y="240">' + esc(s(CELL[p], null, l)) + '</text></g>'; }).join('');
        return '<svg class="cw-svg cw-' + id + '" viewBox="0 0 300 250" role="img" aria-label="' + esc(s('svgL', null, l)) + '" style="--c:var(--cw-' + (ph ? id : 'none') + ')">' +
            '<defs><radialGradient id="cwG" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="currentColor" stop-opacity=".55"/><stop offset="1" stop-color="currentColor" stop-opacity=".16"/></radialGradient></defs>' +
            '<g class="cw-world">' + world(id) + '</g>' + track + '</svg>';
    }

    /* ---------- browser ---------- */
    const C = () => W.LowiCycle || null;
    const S = () => { try { return W.LowiR2 && W.LowiR2.S ? W.LowiR2.S() : null; } catch (e) { return null; } };
    const isFem = () => eligible(S());
    const enabled = () => { const c = C(); return !!(c && c.enabled && c.enabled()); };
    const model = () => { const c = C(); try { return c && c.model ? c.model() : null; } catch (e) { return null; } };
    const todayK = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    function nextLine(m) {
        if (!m || !m.has) return '';
        if (m.lateBy) return s('nextSoon');
        if (m.toNext === 0) return s('nextToday');
        if (m.toNext === 1) return s('nextTom');
        return m.toNext > 1 ? s('next', { n: m.toNext }) : '';
    }
    function tileSub() {
        if (!enabled()) return s('tileOff');
        const m = model(); const c = m && cellOf(m.ph);
        if (!m || !m.has || !c) return s('tileStart');
        return s('day', { d: m.day }) + ' · ' + c.name;
    }

    let ov = null, other = false, msg = '';
    function body() {
        const tk = todayK();
        if (!enabled()) {
            return '<div class="cw-hero">' + scene({ has: false }) + '</div><div class="cw-now"><h3>' + esc(s('offT')) + '</h3><p>' + esc(s('offS')) + '</p></div>' +
                '<button type="button" class="cw-btn pri" data-cw="on">' + esc(s('turnOn')) + '</button>';
        }
        const m = model() || { has: false }, c = cellOf(m.ph);
        let h = '<div class="cw-hero">' + scene(m) + '</div>';
        if (m.has && c) {
            h += '<div class="cw-now" style="--c:var(--cw-' + c.id + ')"><small>' + esc(s('day', { d: m.day })) + '</small><h3>' + esc(c.name) + ' <span>· ' + esc(c.plain) + '</span></h3><p>' + esc(c.line) + '</p>' +
                (nextLine(m) ? '<p class="cw-next">' + esc(nextLine(m)) + '</p>' : '') + '</div>';
            const startedToday = m.last === tk;
            h += '<div class="cw-acts">' + (startedToday ? '' : '<button type="button" class="cw-btn pri" data-cw="today">' + esc(s('started')) + '</button>') +
                '<button type="button" class="cw-btn" data-cw="other" aria-expanded="' + other + '">' + esc(s('other')) + '</button></div>';
            if (other) h += dateRow(m.last || tk, true);
        } else {
            h += '<div class="cw-now"><h3>' + esc(s('askT')) + '</h3><p>' + esc(s('askS')) + '</p></div>' +
                '<div class="cw-acts"><button type="button" class="cw-btn pri" data-cw="today">' + esc(s('started')) + '</button></div>' + dateRow(tk, false);
        }
        if (msg) h += '<p class="cw-msg" role="status">' + esc(msg) + '</p>';
        h += '<p class="cw-hedge">' + esc(s('hedge')) + '</p><button type="button" class="cw-off" data-cw="off">' + esc(s('turnOff')) + '</button>';
        return h;
    }
    function dateRow(val, fix) {
        return '<div class="cw-date"><label for="cwDate">' + esc(s('first')) + '</label><input type="date" id="cwDate" max="' + todayK() + '" value="' + esc(val) + '">' +
            '<button type="button" class="cw-btn pri" data-cw="save"' + (fix ? ' data-fix="1"' : '') + '>' + esc(s('save')) + '</button></div>';
    }
    function paint() {
        const el = D && D.getElementById('cwSheet'); if (!el) return;
        el.innerHTML = '<div class="cw-head"><h2 id="cwTitle">' + esc(s('title')) + '</h2></div><div class="cw-body">' + body() + '</div>';
        refreshTile();
    }
    function refreshTile() {
        try { const t = D.querySelector('#g2eTiles .g2e-cycle small'); if (t) t.textContent = tileSub(); const g = D.getElementById('g2eTiles'); if (g) g.__h = ''; } catch (e) {}
    }
    function open() {
        const R2 = W.LowiR2; if (!D || !R2 || !R2.sheet || !isFem()) return false;
        other = false; msg = '';
        if (ov && D.body.contains(ov)) { try { R2.close(ov); } catch (e) {} }
        ov = R2.sheet('<div class="cw" id="cwSheet" data-noi18n></div>', { cls: 'cw-ov one-sheet', onClose: () => { ov = null; refreshTile(); paintRing(); } });
        paint();
        return true;
    }
    function close() { const R2 = W.LowiR2; if (ov && R2 && R2.close) { try { R2.close(ov); } catch (e) {} } ov = null; }
    function act(k, b) {
        const L = C(); if (!L) return;
        if (k === 'on') { L.setShow(true); msg = ''; return paint(); }
        if (k === 'off') { L.setShow(false); msg = s('offDone'); return paint(); }
        if (k === 'today') { L.markStart(todayK()); other = false; msg = s('saved'); return paint(); }
        if (k === 'other') { other = !other; msg = ''; paint(); const i = D.getElementById('cwDate'); if (i && other) i.focus({ preventScroll: true }); return; }
        if (k === 'save') {
            const i = D.getElementById('cwDate'), v = i && i.value;
            if (!v || v > todayK()) return;
            L.markStart(v, !!(b && b.getAttribute('data-fix')));
            other = false; msg = s('saved'); return paint();
        }
    }
    if (D) {
        D.addEventListener('click', e => {
            const t = e.target && e.target.closest ? e.target : null; if (!t) return;
            const o = t.closest('[data-cw="open"]'); if (o) { e.preventDefault(); e.stopPropagation(); open(); return; }
            const b = t.closest('#cwSheet [data-cw]'); if (b) { e.preventDefault(); act(b.getAttribute('data-cw'), b); setTimeout(paintRing, 0); }
        }, true);
        const addL = () => { try { if (W.LowiLang && W.LowiLang.add) { W.LowiLang.add(LANG_ROWS); return true; } } catch (e) {} return false; };
        if (!addL()) W.addEventListener && W.addEventListener('load', addL);
    }

    /* ---------- Home (Oct 24 2026): the cycle shows up where you are, not only in a sheet ----------
       Emmanuel: "an information window alone isn't a real benefit". With cycle tracking on, and only then:
       1) Misty's card (hold Misty, misty-hub.js) gets a small "Your cycle" section right under her two doors: day, estimated
          phase in its colour, and a tap opens My cycle. That is the way in from Home (Emmanuel, Oct 24: "a section within the
          existing long-press menu on Misty, rather than its own separate trigger"). No new gesture anywhere.
       2) a thin ring on Misty's Home bubble in the estimated phase colour, the cell world's own (rest rose, grow mint, glow gold,
          gather violet). The ring is decoration (aria-hidden); screen readers get "Estimated cycle phase: Grow" as the bubble's
          description. Written only when the phase or language changes. Nothing is announced: no toast, push or post. */
    function homeRing(m, on, l) {
        if (!on || !m || !m.ph) return null;
        const c = cellOf(m.ph, l); if (!c) return null;
        return { id: c.id, ph: m.ph, label: s('ringL', { n: c.name }, l) };
    }
    /* the section in Misty's card: '' with tracking off (nothing hints at the feature then) */
    function hubHtml() {
        if (!enabled()) return '';
        const m = model(), c = m && m.ph ? cellOf(m.ph) : null;
        return '<section class="mh-card cyh-hub" aria-label="' + esc(s('title')) + '">' +
            '<button type="button" class="cyh-hub-b" data-mh="cycle"' + (c ? ' data-ph="' + c.id + '"' : '') + ' aria-label="' + esc(s('hubOpen') + ': ' + tileSub()) + '">' +
            '<span class="cyh-dot" aria-hidden="true"></span>' +
            '<span class="cyh-hub-t"><b>' + esc(s('title')) + '</b><small>' + esc(tileSub()) + '</small></span>' +
            '<span class="cyh-hub-go" aria-hidden="true">\u203a</span></button></section>';
    }
    /* tapped in Misty's card: My cycle opens on top of her card, like her Companions door; closing it brings her card back.
       (Note for testers: headless WebKit on the VM crashes on ANY button click inside Misty's card, the old doors too; check this
       tap in Chromium, or call LowiCycleWorld.hubOpen() in WebKit.) */
    function hubOpen() {
        if (!enabled()) return false;
        return open() === true;
    }
    const RING_DESC = 'cyhDesc';
    function paintRing() {
        if (!D) return;
        const el = D.getElementById('spBubble'); if (!el) return;
        const on = enabled(), r = homeRing(on ? model() : null, on, lang());
        const key = r ? r.id + '|' + r.label : '';
        let ring = el.querySelector(':scope > .cyh-ring'), desc = D.getElementById(RING_DESC);
        if (el.dataset.cyh === key && (r ? (ring && desc && desc.parentNode === el) : (!ring && !desc))) return;
        el.dataset.cyh = key;
        const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(x => x && x !== RING_DESC);
        if (!r) {
            if (ring) ring.remove();
            if (desc) desc.remove();
            if (ids.length) el.setAttribute('aria-describedby', ids.join(' ')); else el.removeAttribute('aria-describedby');
            return;
        }
        if (!ring) { ring = D.createElement('span'); ring.className = 'cyh-ring'; ring.setAttribute('aria-hidden', 'true'); el.appendChild(ring); }
        ring.setAttribute('data-ph', r.id);
        if (!desc || desc.parentNode !== el) { if (desc) desc.remove(); desc = D.createElement('span'); desc.id = RING_DESC; desc.className = 'cyh-sr'; desc.setAttribute('data-noi18n', ''); el.appendChild(desc); }
        desc.textContent = r.label;
        el.setAttribute('aria-describedby', ids.concat(RING_DESC).join(' '));
    }
    if (D && typeof W.setInterval === 'function') {
        /* Home is rebuilt now and then (spirit.js): put the ring back; only while Home is the page you see */
        const homeOn = () => { const t = D.getElementById('tab-home'); return !t || t.classList.contains('active'); };
        W.setInterval(() => { if (!D.hidden && homeOn()) { try { paintRing(); } catch (e) {} } }, 1500);
        D.addEventListener('visibilitychange', () => { if (!D.hidden) { try { paintRing(); } catch (e) {} } });
    }
    return { open, close, isOpen: () => !!(ov && D && D.body.contains(ov)), enabled, eligible: st => eligible(st === undefined ? S() : st), tileSub, rule, cellOf, scene, strings: STR, homeRing, hubHtml, hubOpen, paintRing };
});
