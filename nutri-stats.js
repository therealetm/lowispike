/* nutri-stats.js: the portion block on the scanned product card and the "Today's stats" sheet (Oct 19 2026, Emmanuel).
   Pure maths in nutri-stats-core.js. Other features add their own section to the stats sheet through window.LowiStatsPlugins
   (see /home/sprite/COORD-stats.md and DECISIONS.md). Never writes meals; only S.user.macroGoals (Set my targets) and
   localStorage 'lowi.portion.v1' (the amount you had last time, per product). */
(function (W) {
    'use strict';
    const D = W.document, C = W.LowiNutriStatsCore;
    if (!D || !C || W.LowiNutriStats) return;
    const PKEY = 'lowi.portion.v1';
    const lang = () => { let l = ''; try { l = (W.LowiLang && LowiLang.get && LowiLang.get()) || ''; } catch (e) { } l = String(l || D.documentElement.lang || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const T = (en, de, es) => [en, de, es][lang()];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const V = () => W.LowiVitalsBridge || null;
    const state = () => { try { return V() && V().state(); } catch (e) { return null; } };
    const fmt = (v, k) => { if (v === null || v === undefined) return '–'; const n = k === 'kcal' ? Math.round(v) : Math.round(v * 10) / 10; return lang() ? String(n).replace('.', ',') : String(n); };
    const mem = { get() { try { return JSON.parse(localStorage.getItem(PKEY) || '{}') || {}; } catch (e) { return {}; } }, set(m) { try { localStorage.setItem(PKEY, JSON.stringify(m)); } catch (e) { } } };

    /* the game names: each nutrient is a character stat (like strength in Genshin Impact) */
    const STAT = {
        protein: { n: ['Strength', 'Stärke', 'Fuerza'], s: ['Protein', 'Eiweiß', 'Proteína'] },
        fiber: { n: ['Defense', 'Abwehr', 'Defensa'], s: ['Fiber', 'Ballaststoffe', 'Fibra'] },
        carbs: { n: ['Stamina', 'Ausdauer', 'Resistencia'], s: ['Carbs', 'Kohlenhydrate', 'Carbohidratos'] },
        fat: { n: ['Reserve', 'Reserve', 'Reserva'], s: ['Fat', 'Fett', 'Grasa'] },
        sugar: { n: ['Spike guard', 'Spike-Schutz', 'Escudo antipicos'], s: ['Sugar · limit', 'Zucker · Limit', 'Azúcar · límite'] },
        kcal: { n: ['Power', 'Power', 'Poder'], s: ['Calories', 'Kalorien', 'Calorías'] }
    };
    const SHORT = { protein: ['Protein', 'Eiweiß', 'Proteína'], fiber: ['Fiber', 'Ballastst.', 'Fibra'], sugar: ['Sugar', 'Zucker', 'Azúcar'], carbs: ['Carbs', 'Kohlenh.', 'Carbohidr.'], fat: ['Fat', 'Fett', 'Grasa'], kcal: ['kcal', 'kcal', 'kcal'] };
    const P = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    const ICON = {
        protein: '<svg viewBox="0 0 24 24" ' + P + '><path d="M14.5 3.5l6 6M4 20l6.5-6.5M9 11l4 4M17 4l3 3-9 9-3-3z"/></svg>',
        fiber: '<svg viewBox="0 0 24 24" ' + P + '><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/></svg>',
        carbs: '<svg viewBox="0 0 24 24" ' + P + '><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
        fat: '<svg viewBox="0 0 24 24" ' + P + '><path d="M12 3c3 4 6 7 6 11a6 6 0 01-12 0c0-4 3-7 6-11z"/></svg>',
        sugar: '<svg viewBox="0 0 24 24" ' + P + '><path d="M3 17l4-6 4 4 4-8 6 10"/><path d="M3 21h18"/></svg>',
        kcal: '<svg viewBox="0 0 24 24" ' + P + '><path d="M12 2c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/></svg>'
    };

    function leftText(r) {
        const u = r.unit === 'kcal' ? ' kcal' : ' g';
        if (r.kind === 'limit') return r.state === 'over' ? T(fmt(r.over, r.k) + u + ' over your limit', fmt(r.over, r.k) + u + ' über deinem Limit', fmt(r.over, r.k) + u + ' por encima de tu límite')
            : T(fmt(r.left, r.k) + u + ' left today', 'noch ' + fmt(r.left, r.k) + u + ' frei', 'quedan ' + fmt(r.left, r.k) + u);
        if (r.kind === 'target') return r.state === 'over' ? T(fmt(r.over, r.k) + u + ' over', fmt(r.over, r.k) + u + ' drüber', fmt(r.over, r.k) + u + ' de más')
            : r.state === 'hit' ? T('On target ✓', 'Im Ziel ✓', 'En el objetivo ✓') : T(fmt(r.left, r.k) + u + ' to go', 'noch ' + fmt(r.left, r.k) + u, 'faltan ' + fmt(r.left, r.k) + u);
        return r.state === 'hit' ? T('Maxed ✓', 'Voll ✓', 'Al máximo ✓') : T(fmt(r.left, r.k) + u + ' to go', 'noch ' + fmt(r.left, r.k) + u, 'faltan ' + fmt(r.left, r.k) + u);
    }
    /* one stat row. Reusable by plug-ins: {k?, icon, name, sub, value, target, unit, kind} */
    function statRowHTML(o) {
        const r = o.state ? o : Object.assign(C.stat(o.k || 'x', o.value, o.target, o.kind || 'goal'), { unit: o.unit || 'g' }, o.k ? {} : { k: 'x' });
        const name = o.name || (STAT[r.k] ? STAT[r.k].n[lang()] : ''), sub = o.sub || (STAT[r.k] ? STAT[r.k].s[lang()] : ''), u = r.unit === 'kcal' ? 'kcal' : r.unit;
        const icon = o.icon || ICON[r.k] || '';
        return '<div class="ns-row k-' + esc(r.kind) + ' s-' + esc(r.state) + '" data-ns-stat="' + esc(r.k) + '">' +
            '<span class="ns-ic" aria-hidden="true">' + icon + '</span><div class="ns-main"><div class="ns-top"><b class="ns-name">' + esc(name) + '</b><small class="ns-sub">' + esc(sub) + '</small>' +
            '<span class="ns-val"><b>' + esc(fmt(r.value, r.k)) + '</b><small> / ' + esc(fmt(r.target, r.k)) + ' ' + esc(u) + '</small></span></div>' +
            '<div class="ns-bar" role="progressbar" aria-label="' + esc(name + ', ' + sub) + '" aria-valuemin="0" aria-valuemax="' + esc(r.target) + '" aria-valuenow="' + esc(r.value) + '"><i style="--f:' + r.fill.toFixed(3) + '"></i></div>' +
            '<small class="ns-left">' + esc(o.leftText || leftText(r)) + '</small></div></div>';
    }

    /* ---------- product card: the portion block ---------- */
    const FACTS = {};
    let cur = null;   /* {key, grams, from} of the card on screen */
    function hasFacts(f) { return !!f && ['c', 's', 'f', 'p', 'fat', 'kcal'].some(k => f[k] != null && f[k] !== ''); }
    function tilesHTML(f, grams) {
        const v = C.forGrams(f, grams);
        return ['protein', 'fiber', 'sugar', 'carbs', 'fat', 'kcal'].map(k => '<span class="ns-t k-' + k + '" data-ns-t="' + k + '"><b>' + esc(fmt(v[k], k)) + (v[k] === null ? '' : k === 'kcal' ? '' : '<small>g</small>') + '</b><small>' + esc((k === 'kcal' && v.estKcal ? '≈ ' : '') + SHORT[k][lang()]) + '</small></span>').join('');
    }
    function portionLabel(from, grams) {
        return from === 'last' ? T('Last time', 'Zuletzt', 'La última vez') : from === 'mine' ? T('Your portion', 'Deine Portion', 'Tu porción') : T('Usual portion', 'Übliche Portion', 'Porción habitual');
    }
    function portionHTML(p) {
        if (!p || p.notFound) return '';
        const f = p.facts || {}, pr = C.portion(p, mem.get());
        /* the card re-draws while prices load: an amount you just set stays */
        if (cur && cur.key === pr.key && cur.from === 'mine' && D.querySelector && D.querySelector('.ns-portion[data-ns-key]')) { pr.grams = cur.grams; pr.from = 'mine'; }
        cur = { key: pr.key, grams: pr.grams, from: pr.from }; FACTS[pr.key] = f;
        const link = '<button type="button" class="ns-plink" data-ns="open">' + esc(T('Today\'s stats', 'Heutige Stats', 'Stats de hoy')) + ' <span aria-hidden="true">›</span></button>';
        if (!hasFacts(f)) return '<section class="sc-sec ns-portion ns-nofacts"><p class="sc-none">' + esc(T('No nutrition facts for this product yet.', 'Für dieses Produkt gibt es noch keine Nährwerte.', 'Aún no hay valores nutricionales para este producto.')) + '</p>' + link + '</section>';
        return '<section class="sc-sec ns-portion" data-ns-key="' + esc(pr.key) + '">' +
            '<div class="ns-ph"><span class="ns-plab" aria-live="polite">' + esc(portionLabel(pr.from)) + '</span>' +
            '<div class="ns-step"><button type="button" class="ns-sb" data-ns="minus" aria-label="' + esc(T('Less', 'Weniger', 'Menos')) + '">−</button>' +
            '<label class="ns-gw"><input class="ns-g" type="number" inputmode="numeric" min="1" max="2000" step="1" value="' + pr.grams + '" aria-label="' + esc(T('Amount in grams', 'Menge in Gramm', 'Cantidad en gramos')) + '"><span>g</span></label>' +
            '<button type="button" class="ns-sb" data-ns="plus" aria-label="' + esc(T('More', 'Mehr', 'Más')) + '">+</button></div></div>' +
            '<div class="ns-tiles">' + tilesHTML(f, pr.grams) + '</div>' + link + '</section>';
    }
    function setGrams(box, g, typed) {
        const key = box.getAttribute('data-ns-key'), f = FACTS[key]; g = C.clampGrams(g); if (!g || !f) return;
        const inp = box.querySelector('.ns-g'); if (!typed && inp) inp.value = g;
        const tiles = box.querySelector('.ns-tiles'); if (tiles) tiles.innerHTML = tilesHTML(f, g);
        if (cur && cur.key === key) { if (cur.grams !== g) { cur.grams = g; cur.from = 'mine'; } }
        else cur = { key, grams: g, from: 'mine' };
        const lab = box.querySelector('.ns-plab'); if (lab) lab.textContent = portionLabel(cur.from);
    }
    /* what a meal log of product p keeps: the amount on the card (or last time / usual), remembered for next time */
    function logMacros(p) {
        try {
            if (!p) return null;
            const key = C.productKey(p), pr = cur && cur.key === key ? cur : C.portion(p, mem.get());
            const m = C.logMacros(p.facts, pr.grams);
            if (m && key) { mem.set(C.remember(mem.get(), key, pr.grams)); if (cur && cur.key === key) cur.from = 'last'; }
            return m;
        } catch (e) { return null; }
    }

    /* ---------- the stats sheet ---------- */
    let ov = null, view = 'stats';
    const companionName = () => { try { const B = W.LowiBirthCompanion, c = B && B.get && B.get(); if (c && c.name) return c.name; } catch (e) { } return 'Misty'; };
    const level = () => { try { return W.LowiHost && LowiHost.level ? LowiHost.level() : null; } catch (e) { return null; } };
    function plugins() { return (W.LowiStatsPlugins || []).filter(x => x && typeof x.render === 'function').slice().sort((a, b) => (+a.order || 50) - (+b.order || 50)); }
    function moodLine(m) {
        const sugar = m.rows.find(r => r.k === 'sugar');
        if (!m.meals) return T('No meals logged today yet. Log one and your stats start to grow.', 'Heute noch kein Essen eingetragen. Trag etwas ein, dann wachsen deine Stats.', 'Hoy aún no hay comidas. Registra una y tus stats empiezan a crecer.');
        if (m.allGood) return T('All stats on track. You can go to bed with a clear conscience.', 'Alle Stats im Ziel. Du kannst mit gutem Gewissen ins Bett gehen.', 'Todas las stats en su sitio. Puedes irte a dormir con la conciencia tranquila.');
        if (sugar && sugar.state === 'over') return T('Sugar is over your limit today. Keep the rest of the day sugar-free.', 'Zucker ist heute über deinem Limit. Bleib den Rest des Tages zuckerfrei.', 'El azúcar pasa tu límite hoy. Sigue el resto del día sin azúcar.');
        return T(m.good + ' of ' + m.total + ' stats on track. Keep going.', m.good + ' von ' + m.total + ' Stats im Ziel. Weiter so.', m.good + ' de ' + m.total + ' stats en su sitio. Sigue así.');
    }
    function statsHTML() {
        const m = C.rows(state() || {}), lv = level();
        const nut = '<section class="ns-sec" data-ns-sec="nutrition"><h4 class="ns-h">' + esc(T('Nutrition', 'Ernährung', 'Nutrición')) + '</h4>' + m.rows.map(statRowHTML).join('') +
            (m.unknown ? '<p class="ns-note">' + esc(m.unknown === 1 ? T('1 meal today has no nutrition facts, so it isn\'t counted.', '1 Mahlzeit heute hat keine Nährwerte und zählt nicht mit.', '1 comida de hoy no tiene valores nutricionales y no cuenta.') : T(m.unknown + ' meals today have no nutrition facts, so they aren\'t counted.', m.unknown + ' Mahlzeiten heute haben keine Nährwerte und zählen nicht mit.', m.unknown + ' comidas de hoy no tienen valores nutricionales y no cuentan.')) + '</p>' : '') + '</section>';
        const extra = [{ order: 10, html: nut }];
        for (const pl of plugins()) { let h = ''; try { h = String(pl.render(lang()) || ''); } catch (e) { h = ''; } if (h) extra.push({ order: +pl.order || 50, html: '<div class="ns-plug" data-ns-plug="' + esc(pl.id || '') + '">' + h + '</div>' }); }
        extra.sort((a, b) => a.order - b.order);
        return '<div class="ns-sheet" data-ns-view="stats"><header class="ns-hd"><div class="ns-hm"><small>' + esc(T('Today\'s stats', 'Heutige Stats', 'Stats de hoy')) + '</small>' +
            '<h3>' + esc(companionName()) + (lv ? ' <span class="ns-lv">' + esc(T('Lv', 'Lv', 'Nv')) + ' ' + esc(lv) + '</span>' : '') + '</h3></div>' +
            '<div class="ns-score' + (m.allGood ? ' all' : '') + '" aria-label="' + esc(T(m.good + ' of ' + m.total + ' stats on track', m.good + ' von ' + m.total + ' Stats im Ziel', m.good + ' de ' + m.total + ' stats en su sitio')) + '"><b>' + m.good + '</b><small>/' + m.total + '</small></div></header>' +
            '<p class="ns-mood">' + esc(moodLine(m)) + '</p>' + extra.map(x => x.html).join('') +
            '<div class="ns-acts"><button type="button" class="r2-btn pri" data-ns="log">' + esc(T('Log a meal', 'Essen eintragen', 'Registrar comida')) + '</button>' +
            '<button type="button" class="r2-btn ghost" data-ns="targets">' + esc(T('Set my targets', 'Meine Ziele', 'Mis objetivos')) + '</button></div></div>';
    }
    function targetsHTML() {
        const t = C.targets((state() || {}).user || {});
        return '<div class="ns-sheet" data-ns-view="targets"><header class="ns-hd"><div class="ns-hm"><small>' + esc(T('Today\'s stats', 'Heutige Stats', 'Stats de hoy')) + '</small><h3>' + esc(T('My daily targets', 'Meine Tagesziele', 'Mis objetivos diarios')) + '</h3></div></header>' +
            '<form class="ns-form" id="nsTargets">' + C.KEYS.map(k => '<label class="ns-fl"><span class="ns-ic" aria-hidden="true">' + ICON[k] + '</span><span class="ns-fn"><b>' + esc(STAT[k].n[lang()]) + '</b><small>' + esc(STAT[k].s[lang()]) + ' · ' + esc(C.UNIT[k]) + '</small></span>' +
                '<input name="' + k + '" type="number" inputmode="decimal" min="1" max="' + C.MAX[k] + '" step="any" value="' + (t.own[k] ? esc(t.value[k]) : '') + '" placeholder="' + esc(C.DEFAULTS[k]) + '"></label>').join('') +
            '<p class="ns-note">' + esc(T('Has your doctor given you a limit, like for sugar? Put it here. Empty fields use the usual value shown.', 'Hat dir dein Arzt ein Limit gegeben, etwa für Zucker? Trag es hier ein. Leere Felder nutzen den angezeigten üblichen Wert.', '¿Tu médico te dio un límite, por ejemplo de azúcar? Ponlo aquí. Los campos vacíos usan el valor habitual que se muestra.')) + '</p>' +
            '<div class="ns-acts"><button type="submit" class="r2-btn pri">' + esc(T('Save', 'Speichern', 'Guardar')) + '</button><button type="button" class="r2-btn ghost" data-ns="back">' + esc(T('Back', 'Zurück', 'Atrás')) + '</button></div></form></div>';
    }
    function paint() {
        if (!ov || !ov.isConnected) { ov = null; return; }
        const body = ov.querySelector('.r2-shb'); if (!body) return;
        body.innerHTML = view === 'targets' ? targetsHTML() : statsHTML();
        if (view === 'stats') for (const pl of plugins()) { if (typeof pl.mount !== 'function') continue; const el = body.querySelector('[data-ns-plug="' + (W.CSS && CSS.escape ? CSS.escape(pl.id || '') : pl.id) + '"]'); if (el) try { pl.mount(el); } catch (e) { } }
    }
    function open(from) {
        const R = W.LowiR2; if (!R || !R.sheet) return null;
        if (ov && ov.isConnected) { view = 'stats'; paint(); return ov; }
        view = 'stats';
        ov = R.sheet(statsHTML(), { cls: 'ns-ov', onClose: () => { ov = null; } });
        if (!ov) return null;
        /* opened from a sheet that lives inside Misty's world layer: sit on top of it there */
        const host = from && from.closest ? from.closest('.r2-ov') : null;
        if (host && host.parentNode && host.parentNode !== D.body) host.parentNode.appendChild(ov);
        paint();
        return ov;
    }
    function saveTargets(form) {
        const s = state(); if (!s || !s.user) return;
        const data = {}; for (const k of C.KEYS) data[k] = form.elements[k] ? form.elements[k].value : '';
        const clean = C.cleanTargets(data), prev = Object.assign({}, s.user.macroGoals || {});
        const next = Object.assign({}, prev); for (const k of C.KEYS) delete next[k];
        s.user.macroGoals = Object.assign(next, clean);
        try { V().save(); } catch (e) { }
        try { W.dispatchEvent(new CustomEvent('lowi:stats-targets', { detail: { targets: clean } })); } catch (e) { }
        view = 'stats'; paint();
    }

    D.addEventListener('click', e => {
        const b = e.target && e.target.closest ? e.target.closest('[data-ns]') : null; if (!b) return;
        const a = b.getAttribute('data-ns');
        if (a === 'open') { e.preventDefault(); e.stopPropagation(); open(b); }
        else if (a === 'minus' || a === 'plus') {
            e.preventDefault(); e.stopPropagation();
            const box = b.closest('.ns-portion'), inp = box && box.querySelector('.ns-g'); if (!inp) return;
            const g = C.clampGrams(inp.value) || 100, step = g < 100 || (a === 'minus' && g <= 100) ? 10 : 25;
            setGrams(box, a === 'plus' ? g + step : Math.max(step, g - step));
        }
        else if (a === 'targets') { e.preventDefault(); view = 'targets'; paint(); const i = ov && ov.querySelector('.ns-form input'); if (i) try { i.focus({ preventScroll: true }); } catch (x) { } }
        else if (a === 'back') { e.preventDefault(); view = 'stats'; paint(); }
        else if (a === 'log') {
            e.preventDefault();
            try { W.LowiR2.close(ov); } catch (x) { }
            setTimeout(() => { try { if (W.LowiSpirit && LowiSpirit.meal) LowiSpirit.meal(); else if (V() && V().openMeal) V().openMeal(); } catch (x) { } }, 80);
        }
    }, true);
    D.addEventListener('input', e => {
        const inp = e.target; if (!inp || !inp.classList || !inp.classList.contains('ns-g')) return;
        const box = inp.closest('.ns-portion'); if (box) setGrams(box, inp.value, true);
    });
    D.addEventListener('change', e => {
        const inp = e.target; if (!inp || !inp.classList || !inp.classList.contains('ns-g')) return;
        const box = inp.closest('.ns-portion'); if (box) setGrams(box, inp.value || 1);
    });
    D.addEventListener('submit', e => { if (e.target && e.target.id === 'nsTargets') { e.preventDefault(); saveTargets(e.target); } }, true);
    W.addEventListener('lowi:meal-logged', () => { if (ov) setTimeout(paint, 0); });

    /* ---------- the small "Today's stats" strip in Log meal and in the Fuel list ---------- */
    function stripHTML() {
        const m = C.rows(state() || {}), pick = ['protein', 'fiber', 'sugar'].map(k => m.rows.find(r => r.k === k));
        return '<button type="button" class="ns-strip" data-ns="open"><span class="ns-sl">' + esc(T('Today\'s stats', 'Heutige Stats', 'Stats de hoy')) + '</span>' +
            pick.map(r => '<span class="ns-sm k-' + r.kind + ' s-' + r.state + '"><small>' + esc(SHORT[r.k][lang()]) + '</small><i style="--f:' + r.fill.toFixed(3) + '"></i></span>').join('') +
            '<span class="ns-sg"><b>' + m.good + '</b>/' + m.total + ' ›</span></button>';
    }
    let queued = 0;
    function inject() {
        queued = 0;
        const sh = D.querySelector('.r2-ov.sp-sheet #spMeal, .r2-ov.sp-sheet .sp-quick-log, .r2-ov.sp-sheet .sp-slots');
        if (!sh) return;
        const body = sh.closest('.r2-shb'); if (!body || body.querySelector('.ns-strip')) return;
        const wrap = D.createElement('div'); wrap.innerHTML = stripHTML();
        /* Oct 21: on the photo result the spike verdict comes first (meal-result.js), so the strip goes with the secondary actions */
        const acts = body.querySelector('.sp-ai') && body.querySelector('.sp-photo-acts');
        if (acts && acts.parentNode) { acts.before(wrap.firstChild); return; }
        const h = body.querySelector('h2'); if (h && h.parentNode === body) h.after(wrap.firstChild); else body.prepend(wrap.firstChild);
    }
    try { new MutationObserver(() => { if (!queued) queued = requestAnimationFrame(inject); }).observe(D.body || D.documentElement, { childList: true, subtree: true }); } catch (e) { }

    W.LowiNutriStats = { open, refresh: paint, isOpen: () => !!(ov && ov.isConnected), portionHTML, logMacros, statRowHTML, stripHTML, _cur: () => cur };
})(window);
