/* LOWiSPIKE Gap view (Oct 21, 2026)
   Why: E-man on Scan / Fuel / Gap: "Scan is simply for scanning a product... Fuel is where you actually log a meal... gap is just
   like water and move or sleep... let's not have it formatted like a fasting app." Then: "when I click on Gap, it shows me just like
   a fasting app shows you what's happening inside of your body, like an estimate... use our world." Visuals: "That's on you."
   So Gap is passive. Nothing here starts or stops anything. It reads the time since your last logged meal (LowiFastStop.startOf:
   the eating time Fuel saved, backdated meals included) and draws it in the app's own world: the six markers as six planets on a
   hexagon, a light trail along it for the hours gone by, and the liquid in the glass rising with them. The markers and their notes
   are the soft-ms texts the fasting sheet already uses (LowiFast.stagesFull), framed as typical, never as a reading.
   The only actions: fix the last meal time (LowiFastEdit, the time was wrong) and "Log a meal in Fuel" (Fuel restarts the gap).
   API window.LowiGapView {open(), close(), isOpen(), model(now)}; model is pure enough for node tests. EN / DE / ES. */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiGapView = api;
})(typeof window !== 'undefined' ? window : globalThis, function (W) {
    'use strict';
    const D = W.document;
    const STR = {
        en: { title: 'Meal gap', since: 'since your last meal', none: 'No meal logged yet', noneSub: 'Log your next meal in Fuel. The gap counts from the time you ate.', close: 'Close',
            last: 'Last meal', fix: 'Fix time', now: 'Now', next: 'Next: {n} in about {d}', past: 'Past the last marker. Listen to your body.', markers: 'Typical markers',
            pts: 'So far +{x} XP. You get them when your next meal is logged in Fuel.', recent: 'Recent gaps', log: 'Log a meal in Fuel',
            hedge: 'A general guide from typical patterns, not a measurement. Every body runs its own clock. On diabetes medication? Ask your doctor before long gaps.',
            hexL: 'Six markers on a hexagon; the lit trail shows the time since your last meal', today: 'Today', yday: 'Yesterday' },
        de: { title: 'Essenspause', since: 'seit deiner letzten Mahlzeit', none: 'Noch keine Mahlzeit eingetragen', noneSub: 'Trag deine nächste Mahlzeit in Fuel ein. Die Pause zählt ab dem Essen.', close: 'Schließen',
            last: 'Letzte Mahlzeit', fix: 'Zeit ändern', now: 'Jetzt', next: 'Als Nächstes: {n} in etwa {d}', past: 'Über die letzte Marke hinaus. Hör auf deinen Körper.', markers: 'Typische Marken',
            pts: 'Bisher +{x} XP. Du bekommst sie, wenn du deine nächste Mahlzeit in Fuel einträgst.', recent: 'Letzte Pausen', log: 'Mahlzeit in Fuel eintragen',
            hedge: 'Eine grobe Orientierung aus typischen Verläufen, keine Messung. Jeder Körper hat seine eigene Uhr. Nimmst du Diabetes-Medikamente? Frag vor langen Pausen deine Ärztin oder deinen Arzt.',
            hexL: 'Sechs Marken auf einem Sechseck; die leuchtende Spur zeigt die Zeit seit deiner letzten Mahlzeit', today: 'Heute', yday: 'Gestern' },
        es: { title: 'Pausa entre comidas', since: 'desde tu última comida', none: 'Aún no hay comidas', noneSub: 'Registra tu próxima comida en Fuel. La pausa cuenta desde la hora en que comiste.', close: 'Cerrar',
            last: 'Última comida', fix: 'Cambiar hora', now: 'Ahora', next: 'Después: {n} en unas {d}', past: 'Más allá del último marcador. Escucha a tu cuerpo.', markers: 'Marcadores típicos',
            pts: 'Por ahora +{x} XP. Los recibes al registrar tu próxima comida en Fuel.', recent: 'Pausas recientes', log: 'Registrar comida en Fuel',
            hedge: 'Una guía general según patrones típicos, no una medición. Cada cuerpo tiene su propio reloj. ¿Tomas medicación para la diabetes? Consulta a tu médico antes de pausas largas.',
            hexL: 'Seis marcadores en un hexágono; el rastro iluminado muestra el tiempo desde tu última comida', today: 'Hoy', yday: 'Ayer' }
    };
    /* the soft-ms markers (index.html STAGES), used only when LowiFast is not there (node tests) */
    const FALLBACK = [{ h: 0, n: 'Blood sugar rises', t: 'Right after your last meal', x: '' }, { h: 3, n: 'Blood sugar often settles', t: 'For most people, around 3 h in', x: '' },
        { h: 8, n: 'Liver often takes over', t: 'For many people, around 8 h in', x: '' }, { h: 12, n: 'Fat burning often picks up', t: 'For many people, around 12 h in', x: '' },
        { h: 14, n: 'Ketones may start rising', t: 'For some people, around 14 h in', x: '' }, { h: 16, n: 'Cell cleanup, maybe', t: 'Maybe from about 16 h, nobody knows exactly', x: '' }];
    const COL = ['#8fe7ff', '#a8ffd8', '#9fd8ff', '#d6c8ff', '#c4b5ff', '#f0d7ff'];
    const FULL_H = 16; /* the liquid is full at the last marker, the same 16 h the gap points stop at */
    const lang = () => { try { return (W.LowiLang.get() || 'en').slice(0, 2); } catch (e) { return ((D && D.documentElement.lang) || 'en').slice(0, 2); } };
    const s = k => (STR[lang()] || STR.en)[k] || STR.en[k];
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    /* marker notes are our own constants with <b> only; anything else is escaped */
    const rich = v => esc(v).replace(/&lt;(\/?)b&gt;/g, '<$1b>');
    const dur = ms => { const m = Math.max(0, Math.floor(ms / 60000)), h = Math.floor(m / 60); return h ? h + ' h ' + String(m % 60).padStart(2, '0') + ' min' : (m % 60) + ' min'; };
    const clock = t => new Date(t).toLocaleTimeString(lang(), { hour: '2-digit', minute: '2-digit' });

    function stages() {
        try { if (W.LowiFast && W.LowiFast.stagesFull) { const L = W.LowiFast.stagesFull(); if (L && L.length === 6) return L; } } catch (e) {}
        return FALLBACK;
    }
    function fastState() { try { return W.LowiFastStop && W.LowiFastStop._st ? W.LowiFastStop._st() : JSON.parse(W.localStorage.getItem('lowi_fast_v1')) || {}; } catch (e) { return {}; } }
    function startOf(f) {
        try { if (W.LowiFastStop && W.LowiFastStop.startOf) return +W.LowiFastStop.startOf(f) || 0; } catch (e) {}
        const h = Array.isArray(f.hist) ? f.hist : [], pe = h.length ? +h[h.length - 1].e || 0 : 0;
        return Math.max(+f.last || 0, pe);
    }
    function mealAt(start) {
        if (!start) return null;
        try {
            const logs = (W.LowiVitalsBridge && W.LowiVitalsBridge.state().logs) || [];
            let best = null;
            for (const l of logs) { const t = +l.ts || 0; if (t && Math.abs(t - start) < 30 * 60000 && (!best || t > +best.ts)) best = l; }
            return best ? String(best.t || best.n || '').trim().slice(0, 60) : null;
        } catch (e) { return null; }
    }
    /* position along the hexagon: vertex i = marker i; the closing edge runs from the last marker (16 h) to a full day */
    function trail(h, L) {
        const H = L.map(x => +x.h).concat(24);
        if (!(h > 0)) return 0;
        for (let i = 0; i < 6; i++) if (h < H[i + 1]) return (i + (h - H[i]) / (H[i + 1] - H[i])) / 6;
        return 1;
    }
    function model(now) {
        now = +now || Date.now();
        const f = fastState(), start = startOf(f), L = stages();
        const el = start && start <= now ? now - start : 0, h = el / 36e5;
        let cur = -1; L.forEach((m, i) => { if (start && h >= m.h) cur = i; });
        const nx = start ? L.find(m => m.h > h) : null;
        let x = 0; try { if (start && W.LowiFastStop && W.LowiFastStop.points) x = +W.LowiFastStop.points(h, 0).x || 0; } catch (e) {}
        const hist = (Array.isArray(f.hist) ? f.hist : []).filter(r => r && +r.s && +r.e > +r.s).slice(-3).reverse().map(r => ({ s: +r.s, e: +r.e, ms: +r.e - +r.s }));
        return { start, elapsed: el, hours: h, fill: start ? Math.min(1, h / FULL_H) : 0, trail: start ? trail(h, L) : 0, cur, next: nx || null, nextIn: nx ? nx.h * 36e5 - el : 0,
            stages: L, xp: x, meal: mealAt(start), hist };
    }

    /* ---------- drawing ---------- */
    const R = 104, CX = 130, CY = 130;
    const vtx = i => { const a = (-90 + 60 * i) * Math.PI / 180; return [CX + R * Math.cos(a), CY + R * Math.sin(a)]; };
    function hero(m) {
        const pts = [0, 1, 2, 3, 4, 5].map(vtx), hex = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
        const path = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' Z';
        const lvl = (CY + 62 - m.fill * 124).toFixed(1);
        const planets = pts.map((p, i) => {
            const lit = i <= m.cur, here = i === m.cur;
            return '<g class="gv-pl' + (lit ? ' lit' : '') + (here ? ' here' : '') + '" style="--c:' + COL[i] + '"><circle class="gv-halo" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="17"/>' +
                '<circle class="gv-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (here ? 11 : 8.5) + '"/>' +
                '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 3.6).toFixed(1) + '">' + esc(m.stages[i].h) + '<tspan class="gv-u">h</tspan></text></g>'; /* Oct 21 grandma test: a bare 16 on a planet is not obviously hours */
        }).join('');
        return '<svg class="gv-svg" viewBox="0 0 260 260" role="img" aria-label="' + esc(s('hexL')) + '"><defs>' +
            '<radialGradient id="gvGlass" cx="40%" cy="32%" r="75%"><stop offset="0" stop-color="#ffffff" stop-opacity=".22"/><stop offset=".55" stop-color="#8fd8ff" stop-opacity=".08"/><stop offset="1" stop-color="#0a1f4a" stop-opacity=".5"/></radialGradient>' +
            '<linearGradient id="gvLiq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8ffd8"/><stop offset=".5" stop-color="#8fe7ff"/><stop offset="1" stop-color="#7a8cff"/></linearGradient>' +
            '<clipPath id="gvClip"><circle cx="' + CX + '" cy="' + CY + '" r="62"/></clipPath></defs>' +
            '<polygon class="gv-hex" points="' + hex + '"/>' +
            '<path class="gv-trail" d="' + path + '" pathLength="1" style="stroke-dasharray:' + m.trail.toFixed(4) + ' 1"/>' +
            '<circle cx="' + CX + '" cy="' + CY + '" r="62" fill="url(#gvGlass)"/>' +
            '<g clip-path="url(#gvClip)"><g class="gv-liq" style="transform:translateY(' + lvl + 'px)"><path class="gv-wave" d="M-130 0 Q-97 -9 -65 0 T0 0 T65 0 T130 0 T195 0 T260 0 T325 0 T390 0 V200 H-130 Z" fill="url(#gvLiq)"/></g></g>' +
            '<circle class="gv-rim" cx="' + CX + '" cy="' + CY + '" r="62"/>' + planets + '</svg>';
    }
    function body(m) {
        const L = m.stages;
        if (!m.start) {
            return '<div class="gv-hero">' + hero(m) + '<div class="gv-mid"><b class="gv-none">' + esc(s('none')) + '</b></div></div>' +
                '<p class="gv-sub">' + esc(s('noneSub')) + '</p>' + markers(m) + '<p class="gv-hedge">' + esc(s('hedge')) + '</p>';
        }
        const curM = m.cur >= 0 ? L[m.cur] : null;
        const nextLine = m.next ? s('next').replace('{n}', m.next.n.charAt(0).toLowerCase() + m.next.n.slice(1)).replace('{d}', dur(m.nextIn)) : s('past');
        return '<div class="gv-hero">' + hero(m) + '<div class="gv-mid"><b class="gv-time" data-gv="time">' + esc(dur(m.elapsed)) + '</b><small>' + esc(s('since')) + '</small></div></div>' +
            '<div class="gv-last"><span><small>' + esc(s('last')) + '</small><b>' + (m.meal ? esc(m.meal) + ' · ' : '') + esc(clock(m.start)) + '</b></span>' +
            (W.LowiFastEdit && W.LowiFastEdit.open ? '<button type="button" class="gv-fix" data-gv="fix">' + esc(s('fix')) + '</button>' : '') + '</div>' +
            (curM ? '<section class="gv-now" style="--c:' + COL[m.cur] + '"><small>' + esc(s('now')) + '</small><h3>' + esc(curM.n) + '</h3>' + (curM.x ? '<p>' + rich(curM.x) + '</p>' : '<p>' + esc(curM.t) + '</p>') +
                '<p class="gv-next">' + esc(nextLine) + '</p></section>' : '') +
            (m.xp > 0 ? '<p class="gv-pts">' + esc(s('pts').replace('{x}', m.xp)) + '</p>' : '') +
            markers(m) + recent(m) + '<p class="gv-hedge">' + esc(s('hedge')) + '</p>';
    }
    function markers(m) {
        return '<h4 class="gv-h">' + esc(s('markers')) + '</h4><ol class="gv-list">' + m.stages.map((x, i) => '<li class="' + (i < m.cur ? 'past' : i === m.cur ? 'cur' : '') + '" style="--c:' + COL[i] + '">' +
            '<details' + (i === m.cur ? ' open' : '') + '><summary><i aria-hidden="true"></i><span><b>' + esc(x.n) + '</b><small>' + esc(x.t) + '</small></span></summary>' + (x.x ? '<p>' + rich(x.x) + '</p>' : '') + '</details></li>').join('') + '</ol>';
    }
    function recent(m) {
        if (!m.hist.length) return '';
        const day = t => { const d = new Date(t), n = new Date(); if (d.toDateString() === n.toDateString()) return s('today'); n.setDate(n.getDate() - 1); if (d.toDateString() === n.toDateString()) return s('yday'); return d.toLocaleDateString(lang(), { weekday: 'short', day: 'numeric', month: 'short' }); };
        return '<h4 class="gv-h">' + esc(s('recent')) + '</h4><ul class="gv-hist">' + m.hist.map(r => '<li><span>' + esc(day(r.e)) + '</span><b>' + esc(dur(r.ms)) + '</b></li>').join('') + '</ul>';
    }

    /* ---------- the sheet ---------- */
    let el = null, tick = 0, back = null;
    function paint() {
        if (!el) return;
        const sc = el.querySelector('.gv-scroll'), y = sc ? sc.scrollTop : 0, open = Array.from(el.querySelectorAll('.gv-list details')).map(d => d.open);
        el.querySelector('.gv-body').innerHTML = body(model());
        if (open.length) el.querySelectorAll('.gv-list details').forEach((d, i) => { if (i in open) d.open = open[i]; });
        if (sc) sc.scrollTop = y;
    }
    function open() {
        if (!D) return false;
        close(true);
        back = D.activeElement;
        el = D.createElement('div'); el.className = 'gv-ov'; el.id = 'gvSheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'gvTitle');
        el.setAttribute('data-noi18n', '');
        el.innerHTML = '<div class="gv-card"><div class="gv-top"><button type="button" class="gv-x" data-gv="close" aria-label="' + esc(s('close')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
            '<h2 id="gvTitle">' + esc(s('title')) + '</h2></div><div class="gv-scroll"><div class="gv-body"></div>' +
            '<button type="button" class="gv-log" data-gv="log">' + esc(s('log')) + '</button></div></div>';
        D.body.appendChild(el);
        paint();
        requestAnimationFrame(() => { if (el) el.classList.add('on'); });
        el.addEventListener('click', onClick);
        dragDown(el);
        D.addEventListener('keydown', onKey, true);
        W.addEventListener('lowi:fast', paint); W.addEventListener('storage', paint);
        tick = setInterval(paint, 30000);
        setTimeout(() => { const x = el && el.querySelector('.gv-x'); if (x) x.focus({ preventScroll: true }); }, 60);
        return true;
    }
    function close(quick) {
        clearInterval(tick); tick = 0;
        D && D.removeEventListener('keydown', onKey, true);
        W.removeEventListener && W.removeEventListener('lowi:fast', paint); W.removeEventListener && W.removeEventListener('storage', paint);
        const e = el; el = null;
        if (!e) return;
        if (quick) { e.remove(); return; }
        e.classList.remove('on'); setTimeout(() => e.remove(), 260);
        try { if (back && back.focus && D.contains(back)) back.focus({ preventScroll: true }); } catch (x) {}
    }
    /* Oct 24 2026 (back and close sweep): on a phone the Gap card is a bottom sheet, but a swipe down did nothing (only back,
       X, Escape and a tap outside closed it), unlike the app's other sheets. A drag down on its header (title row, not the X)
       now follows the finger and closes it past a quarter of the card or on a quick flick; a short drag springs back. No new
       element: the header itself is the handle, as on the other sheets. The X still works the same. */
    function dragDown(ov) {
        const card = ov.querySelector('.gv-card'), top = ov.querySelector('.gv-top');
        if (!card || !top || !W.PointerEvent) return;
        top.style.touchAction = 'none';
        let d = null;
        top.addEventListener('pointerdown', e => {
            if (d || (e.button != null && e.button > 0) || (e.target.closest && e.target.closest('button'))) return;
            d = { id: e.pointerId, y0: e.clientY, y: 0, ly: e.clientY, t: e.timeStamp, v: 0 };
            try { top.setPointerCapture(e.pointerId); } catch (x) { }
        });
        top.addEventListener('pointermove', e => {
            if (!d || e.pointerId !== d.id) return;
            const dt = Math.max(1, e.timeStamp - d.t);
            d.v = .6 * d.v + .4 * ((e.clientY - d.ly) / dt * 1000); d.ly = e.clientY; d.t = e.timeStamp;
            d.y = Math.max(0, e.clientY - d.y0);
            if (d.y > 2) { card.style.transition = 'none'; card.style.transform = 'translateY(' + d.y + 'px)'; }
        });
        const end = (e, cancelled) => {
            if (!d || e.pointerId !== d.id) return;
            const g = d; d = null;
            try { top.releasePointerCapture(e.pointerId); } catch (x) { }
            const h = card.getBoundingClientRect().height || 400;
            const v = e.timeStamp - g.t > 100 ? 0 : g.v;
            card.style.transition = '';
            if (!cancelled && el === ov && (g.y > Math.min(140, h * .25) || (v > 650 && g.y > 18))) {
                card.style.transform = 'translateY(' + Math.round(h + 40) + 'px)';
                close();
            } else card.style.transform = '';
        };
        top.addEventListener('pointerup', e => end(e, false));
        top.addEventListener('pointercancel', e => end(e, true));
    }
    function onKey(e) {
        if (!el) return;
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key === 'Tab') {
            const f = Array.from(el.querySelectorAll('button, summary, [href]')).filter(x => x.offsetParent !== null);
            if (!f.length) return;
            const a = f[0], z = f[f.length - 1];
            if (e.shiftKey && D.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && D.activeElement === z) { e.preventDefault(); a.focus(); }
        }
    }
    function onClick(e) {
        if (e.target === el) { close(); return; }
        const b = e.target.closest('[data-gv]'); if (!b) return;
        const k = b.dataset.gv;
        if (k === 'close') close();
        else if (k === 'fix') { try { W.LowiFastEdit.open(); } catch (x) { console.error(x); } }
        else if (k === 'log') { close(); setTimeout(() => { try { W.LowiSpirit.meal(); } catch (x) { console.error(x); } }, 60); }
    }
    if (W.addEventListener) W.addEventListener('lowi:fast-start', paint); /* LowiFastEdit saved a new last meal time */
    return { open, close, isOpen: () => !!el, model, strings: STR, _trail: trail };
});
