/* you-stats.js: Oct 27. Emmanuel: "I want to be better than the app called Yazio. Yes, we have the stats of our companion. But what
   about highlighting other human stats? There should be an easy place to see it, to view it. Maybe next to the companion stats.
   But also, obviously, as you're tracking your food, to motivate you. And obviously, they're linked together."

   One place, no new screen: the existing stats sheet (nutri-stats.js, "Heutige Stats") now opens on "You & <companion>":
   - two tiles side by side: You (calories vs. goal, protein) and your companion (her energy right now, same number as Home)
   - Today: meals, water, move, calm meals (no likely blood sugar spike), and days in a row
   - "How you give <companion> energy": food, water and move, each with the energy it gives her now and the most it can,
     from sun-meter's own energy() (food 40 %, water 30 %, move 30 % above her 15 % base). Nothing invented.
   The nutrient rows under it lead with your words (Protein, Fibre...) and show which of her stats each one feeds.
   Reached from: holding the companion (a "You & <name>" row under her doors), the quiet stats line in Log meal, and the
   screen right after saving a meal, which shows what that meal moved (calories, protein, her energy).
   All numbers come from what the app already keeps; nothing is sent anywhere. */
(function () {
    'use strict';
    const W = window, D = document;
    if (W.LowiYouStats) return;
    const C = () => W.LowiYouStatsCore, NC = () => W.LowiNutriStatsCore, RC = () => W.LowiDayRecapCore, SUN = () => W.LowiSun;
    const L = () => { let l = ''; try { l = (W.LowiLang && LowiLang.get && LowiLang.get()) || ''; } catch (e) { } l = String(l || D.documentElement.lang || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const T = (en, de, es) => [en, de, es][L()];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmt = n => { n = Math.round(+n || 0); return L() ? n.toLocaleString('de-DE') : n.toLocaleString('en-US'); };
    const name = () => { try { const B = W.LowiBirthCompanion, c = B && B.get && B.get(); if (c && c.name) return String(c.name); } catch (e) { } return T('your companion', 'dein Begleiter', 'tu compañero'); };
    const state = () => { try { return W.LowiVitalsBridge && W.LowiVitalsBridge.state(); } catch (e) { return null; } };
    const js = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };

    function energy() { try { const S = SUN(); return S && S.energyNow ? S.energyNow() : null; } catch (e) { return null; } }
    function linkNow() { const S = SUN(), en = energy(); return en && C() ? C().link(en, S && S.ENERGY) : null; }
    function youNow() {
        const s = state() || {}, now = Date.now();
        let rows = [], sum = null;
        try { rows = NC() ? NC().rows(s).rows : []; } catch (e) { rows = []; }
        try { if (RC()) sum = RC().summarize({ now, logs: s.logs, ledger: s.ledger, xp: s.xp, fast: js('lowi_fast_v1'), move: js('lowispike.move.v1') }); } catch (e) { sum = null; }
        return C() ? C().you({ rows, sum, logs: s.logs || [], now }) : null;
    }

    const ring = (p, big, small, cls) => '<span class="ys-ring ' + (cls || '') + '" style="--p:' + Math.max(0, Math.min(1, +p || 0)).toFixed(3) + '"><span class="ys-ring-in"><b>' + esc(big) + '</b><small>' + esc(small) + '</small></span></span>';
    const tierWord = en => ({ thriving: T('Full of energy', 'Voller Energie', 'Llena de energía'), ok: T('Doing okay', 'Geht so', 'Bien'), tired: T('Low on energy', 'Wenig Energie', 'Poca energía'), weak: T('Worn out', 'Erschöpft', 'Agotada') })[en && en.tier] || '';

    /* the two tiles: You | companion */
    function pairHTML(y, lk, en) {
        const k = y && y.kcal, kp = k && k.goal ? k.v / k.goal : 0, p = y && y.protein;
        const you = '<div class="ys-tile ys-you"><span class="ys-tag">' + esc(T('You', 'Du', 'Tú')) + '</span>' +
            ring(kp, k ? fmt(k.v) : '0', k && k.goal ? T('of ', 'von ', 'de ') + fmt(k.goal) + ' kcal' : 'kcal', kp > 1.1 ? 'over' : '') +
            '<span class="ys-mini">' + esc(T('Protein', 'Eiweiß', 'Proteína')) + ' ' + esc(p ? fmt(p.v) + ' / ' + fmt(p.goal) + ' g' : '–') + '</span></div>';
        const e = lk ? lk.energy : null;
        const comp = '<div class="ys-tile ys-comp"><span class="ys-tag">' + esc(name()) + '</span>' +
            ring(e != null ? e / 100 : 0, e != null ? e + '%' : '–', T('energy', 'Energie', 'energía'), 'comp') +
            '<span class="ys-mini">' + esc(tierWord(en)) + '</span></div>';
        return '<div class="ys-pair" role="group" aria-label="' + esc(T('You and ', 'Du und ', 'Tú y ') + name()) + '">' + you + comp + '</div>';
    }

    function todayHTML(y) {
        if (!y) return '';
        const tile = (v, l, done) => '<div class="ys-t' + (done ? ' done' : '') + '"><b>' + esc(v) + '</b><span>' + esc(l) + '</span></div>';
        const mv = y.moveMin ? fmt(y.moveMin) + ' ' + T('min', 'Min.', 'min') : y.moves ? y.moves + '×' : '0';
        return '<div class="ys-grid">' +
            tile(y.meals + ' / ' + y.mealGoal, T('Meals', 'Mahlzeiten', 'Comidas'), y.meals >= y.mealGoal) +
            tile(y.water + ' / ' + y.waterGoal, T('Water', 'Wasser', 'Agua'), y.water >= y.waterGoal) +
            tile(mv, T('Move', 'Bewegung', 'Movimiento'), !!(y.moveMin || y.moves)) +
            tile(String(y.calm), T('Calm meals', 'Ruhige Mahlzeiten', 'Comidas tranquilas'), y.calm > 0) +
            '</div>' +
            '<p class="ys-sub">' + esc(T('Calm meals: no likely blood sugar spike.', 'Ruhig: kein wahrscheinlicher Blutzucker-Spike.', 'Tranquilas: sin pico probable de azúcar en sangre.')) +
            (y.streak > 1 ? ' · ' + esc(T(y.streak + ' days in a row logged', y.streak + ' Tage in Folge geloggt', y.streak + ' días seguidos registrados')) : '') + '</p>';
    }

    /* how your numbers fill her energy (sun-meter energy(), same weights) */
    function linkHTML(lk) {
        if (!lk) return '';
        const icon = { food: '🍽', water: '💧', move: '🚶' };
        const what = r => r.k === 'food' ? (r.meals ? T(r.meals + (r.meals === 1 ? ' meal' : ' meals') + (r.spikes ? ', ' + r.spikes + ' with a likely spike' : ', all calm'), r.meals + (r.meals === 1 ? ' Mahlzeit' : ' Mahlzeiten') + (r.spikes ? ', ' + r.spikes + ' mit wahrscheinlichem Spike' : ', alle ruhig'), r.meals + (r.meals === 1 ? ' comida' : ' comidas') + (r.spikes ? ', ' + r.spikes + ' con pico probable' : ', todas tranquilas')) : T('No meal yet', 'Noch keine Mahlzeit', 'Aún ninguna comida'))
            : r.k === 'water' ? T(Math.min(r.glasses, r.goal) + ' of ' + r.goal + ' glasses', Math.min(r.glasses, r.goal) + ' von ' + r.goal + ' Gläsern', Math.min(r.glasses, r.goal) + ' de ' + r.goal + ' vasos')
                : (r.moves ? T('Moved today', 'Heute bewegt', 'Te moviste hoy') : T('Not yet', 'Noch nicht', 'Aún no'));
        const label = r => ({ food: T('Food', 'Essen', 'Comida'), water: T('Water', 'Wasser', 'Agua'), move: T('Move', 'Bewegung', 'Movimiento') })[r.k];
        const li = r => '<li class="' + (r.pct >= r.max ? 'full' : r.pct ? 'some' : '') + '"><span class="ys-li-i" aria-hidden="true">' + icon[r.k] + '</span>' +
            '<span class="ys-li-t"><b>' + esc(label(r)) + '</b><small>' + esc(what(r)) + '</small></span>' +
            '<span class="ys-li-v"><em>+' + r.pct + '%</em><small>' + esc(T('of ', 'von ', 'de ') + r.max + '%') + '</small></span>' +
            '<span class="ys-li-bar" aria-hidden="true"><i style="width:' + (r.max ? Math.round(r.pct / r.max * 100) : 0) + '%"></i></span></li>';
        return '<h4 class="ys-h">' + esc(T('How you give ' + name() + ' energy', 'So gibst du ' + name() + ' Energie', 'Así le das energía a ' + name())) + '</h4>' +
            '<ul class="ys-link">' + lk.rows.map(li).join('') + '</ul>' +
            '<p class="ys-sub">' + esc(T('Plus ' + lk.base + '% she always has. Calm meals, water and a little movement fill the rest.', 'Dazu ' + lk.base + '%, die immer da sind. Ruhige Mahlzeiten, Wasser und etwas Bewegung füllen den Rest.', 'Más un ' + lk.base + '% que siempre tiene. Comidas tranquilas, agua y algo de movimiento llenan el resto.')) + '</p>';
    }

    /* plugin for the stats sheet: on top, before the nutrient rows */
    function sheetHTML() {
        const y = youNow(), en = energy(), S = SUN(), lk = en && C() ? C().link(en, S && S.ENERGY) : null;
        if (!y) return '';
        return '<section class="ys">' + pairHTML(y, lk, en) + todayHTML(y) + linkHTML(lk) + '</section>';
    }

    /* the row in the companion's hold card, under her doors */
    function hubHTML() {
        const y = youNow(), lk = linkNow();
        if (!y) return '';
        const k = y.kcal;
        return '<button type="button" class="ys-hub" data-mh="you" aria-label="' + esc(T('You and ' + name() + ': open your stats', 'Du und ' + name() + ': deine Stats öffnen', 'Tú y ' + name() + ': abrir tus stats')) + '">' +
            '<span class="ys-hub-s"><small>' + esc(T('You', 'Du', 'Tú')) + '</small><b>' + esc(k ? fmt(k.v) + ' / ' + fmt(k.goal) : '0') + '</b><i>kcal</i></span>' +
            '<span class="ys-hub-s"><small>' + esc(T('Protein', 'Eiweiß', 'Proteína')) + '</small><b>' + esc(y.protein ? fmt(y.protein.v) : '0') + '</b><i>g</i></span>' +
            '<span class="ys-hub-s"><small>' + esc(name()) + '</small><b>' + esc(lk ? lk.energy + '%' : '–') + '</b><i>' + esc(T('energy', 'Energie', 'energía')) + '</i></span>' +
            '<span class="ys-hub-go" aria-hidden="true">›</span></button>';
    }

    /* right after saving a meal: what it moved */
    function snap() { try { const y = youNow(); return y && C() ? C().snap(y, linkNow()) : null; } catch (e) { return null; } }
    function afterHTML(before) {
        try {
            const y = youNow(), m = before && y && C() ? C().moved(before, y, linkNow()) : null;
            if (!m) return '';
            const bar = (from, to, goal) => { const g = Math.max(1, goal || 1); return '<span class="ys-ab" aria-hidden="true"><i class="was" style="width:' + Math.min(100, Math.round(from / g * 100)) + '%"></i><i class="now" style="left:' + Math.min(100, Math.round(from / g * 100)) + '%;width:' + Math.max(0, Math.min(100, Math.round(to / g * 100)) - Math.min(100, Math.round(from / g * 100))) + '%"></i></span>'; };
            const row = (label, r, unit) => '<li><span class="ys-a-l">' + esc(label) + '</span><span class="ys-a-v"><b>' + esc(fmt(r.to)) + '</b> / ' + esc(fmt(r.goal) + ' ' + unit) + (r.d > 0 ? ' <em>+' + esc(fmt(r.d)) + '</em>' : '') + '</span>' + bar(r.from, r.to, r.goal) + '</li>';
            let e = '';
            if (m.energy) e = '<p class="ys-a-e">' + esc(name()) + ': ' + esc(T('energy ', 'Energie ', 'energía ')) + '<b>' + m.energy.to + '%</b>' + (m.energy.d > 0 ? ' <em>+' + m.energy.d + '%</em>' : '') + '</p>';
            return '<section class="ys-after"><h3>' + esc(T('Your day so far', 'Dein Tag bis jetzt', 'Tu día hasta ahora')) + '</h3><ul>' +
                (m.kcal.goal ? row(T('Calories', 'Kalorien', 'Calorías'), m.kcal, 'kcal') : '') +
                (m.protein.goal ? row(T('Protein', 'Eiweiß', 'Proteína'), m.protein, 'g') : '') + '</ul>' + e +
                '<button type="button" class="ys-after-go" data-ns="open">' + esc(T('You & ' + name(), 'Du & ' + name(), 'Tú y ' + name())) + ' <span aria-hidden="true">›</span></button></section>';
        } catch (e) { return ''; }
    }

    /* a few words for the one-tap "Wie immer" toast: " · Today 1,140 / 2,000 kcal" */
    function shortLine() { try { const y = youNow(), k = y && y.kcal; return k && k.goal ? ' \u00b7 ' + T('Today ', 'Heute ', 'Hoy ') + fmt(k.v) + ' / ' + fmt(k.goal) + ' kcal' : ''; } catch (e) { return ''; } }

    (W.LowiStatsPlugins = W.LowiStatsPlugins || []).push({ id: 'you', order: 1, render: sheetHTML });
    W.LowiYouStats = { sheetHTML, hubHTML, afterHTML, snap, shortLine, youNow, linkNow, title: () => T('You & ', 'Du & ', 'Tú y ') + name() };
})();
