/* misty-peak.js (Oct 22 2026, Emmanuel on his iPhone: Home said "Misty · 100%", Fuel 3/3, Water 7/6, Move 4/4, yet her face was flat
   and the world dull, and her sheet said "bright and awake" with a tiny grey "Sugar rush · Clearing sugar crystals" under it:
   "Nowhere do I see any explanation, or at least another level bar for the world and the tasks that get me to peak. When I click on
   Misty it should say what's missing to get Misty to true 100%, Super Saiyan level.")
   Why it happened: three separate readings drive her.
   - Energy % (sun-meter.js LowiSun.energy): today's care as a whole (meal average, water, move, power-ups). One spiky meal among
     good ones, plus water and moves, still rounds to 100%. A meal typed by hand with no verdict counts as "unknown" there.
   - Her mood and the cell world (cell-world.js LowiCell.model): only the last 4 hours. A high-spike meal (or a hand-typed sweet
     like cake or chocolate) starts a sugar wave that fades over 4 h; while it is >= .35 she is "spiked": purple plasma, sugar
     crystals, a slower and dimmer world. Her face never smiles in any tier (Oct 16 rule), so at 100% it was the small calm line.
   - The 3D world's weather (world-mood-core.js): spiky food or products today, calmed by Moves, water and good meals.
   This file joins them into one "World glow" reading with the same inputs, so the sheet can say what is missing, the % never
   reads as maxed while anything holds her back, and the peak ("Supernova") has its own look: big smile, brightest world, a glow.
   Pure part (read, statusFor, cardHTML, clearsIn) is loaded by node tests; the live part reads the app and paints html[data-peak]. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;
    if (W.LowiMistyPeak) return;
    const MIN = 60000, WATER_GOAL = 6, SPIKED = 0.35, GLOW = 0.45, STORMY = 0.1, HOLD_MAX = 0.95;
    const WEIGHT = { sugar: 0.25, world: 0.15, fuel: 0.15, water: 0.1, move: 0.1, glow: 0.15, protein: 0.04, fiber: 0.04, sweet: 0.02, night: 0 };
    const clamp = x => Math.max(0, Math.min(1, +x || 0));
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const LI = l => ({ en: 0, de: 1, es: 2 }[String(l || 'en').slice(0, 2)] || 0);

    const STR = {
        bar: ['World glow', 'Weltleuchten', 'Brillo del mundo'],
        peak: ['Supernova', 'Supernova', 'Supernova'],
        peakSub: ['Everything done. {n} shines at full power.', 'Alles geschafft. {n} strahlt mit voller Kraft.', 'Todo hecho. {n} brilla a máxima potencia.'],
        left1: ['1 thing to Supernova', 'Noch 1 Sache bis Supernova', 'Falta 1 cosa para Supernova'],
        leftN: ['{x} things to Supernova', 'Noch {x} Dinge bis Supernova', 'Faltan {x} cosas para Supernova'],
        missing: ['What’s missing', 'Was noch fehlt', 'Lo que falta'],
        sugar_ok: ['No sugar rush', 'Keine Zuckerflut', 'Sin subidón de azúcar'],
        sugar_no: ['Sugar rush · clears in about {t}', 'Zuckerflut · weg in etwa {t}', 'Subidón de azúcar · se va en unos {t}'],
        sugar_do: ['A short Move clears it now', 'Eine kurze Bewegung räumt sie jetzt weg', 'Un Movimiento corto lo despeja ya'],
        world_ok: ['Clear world', 'Klare Welt', 'Mundo despejado'],
        world_no: ['Stormy world · spiky food today', 'Stürmische Welt · heute Spike-Essen', 'Mundo tormentoso · hoy comida con picos'],
        world_do_move: ['A Move calms it', 'Eine Bewegung beruhigt sie', 'Un Movimiento lo calma'],
        world_do_fuel: ['A low-spike meal calms it', 'Ein Low-Spike-Essen beruhigt sie', 'Una comida sin picos lo calma'],
        fuel_ok: ['Meals: {m} logged', 'Essen: {m} eingetragen', 'Comidas: {m} registradas'],
        fuel_ok1: ['Meals: 1 logged', 'Essen: 1 eingetragen', 'Comidas: 1 registrada'],
        fuel_none: ['No meal logged yet', 'Noch kein Essen eingetragen', 'Aún no hay comidas'],
        fuel_none_do: ['Log a low-spike meal in Fuel', 'Trag ein Low-Spike-Essen in Fuel ein', 'Registra una comida sin picos en Fuel'],
        fuel_no: ['Meals today: some spiky ones', 'Essen heute: ein paar mit Spike', 'Comidas de hoy: algunas con picos'],
        fuel_do: ['Make the next meal low-spike', 'Mach das nächste Essen Low-Spike', 'Que la próxima comida sea sin picos'],
        water_ok: ['Water: {w} of {g} glasses', 'Wasser: {w} von {g} Gläsern', 'Agua: {w} de {g} vasos'],
        water_no: ['Water: {x} more glasses', 'Wasser: noch {x} Gläser', 'Agua: {x} vasos más'],
        water_no1: ['Water: 1 more glass', 'Wasser: noch 1 Glas', 'Agua: 1 vaso más'],
        water_do: ['Tap Water to add a glass', 'Tipp auf Wasser für ein Glas', 'Toca Agua para añadir un vaso'],
        move_ok: ['Moved today', 'Heute bewegt', 'Te has movido hoy'],
        move_no: ['No Move yet today', 'Heute noch keine Bewegung', 'Hoy aún sin Movimiento'],
        move_do: ['A short walk counts', 'Ein kurzer Spaziergang zählt', 'Un paseo corto cuenta'],
        glow_ok: ['Fresh spark', 'Frischer Funke', 'Chispa fresca'],
        glow_no: ['Spark is fading', 'Der Funke lässt nach', 'La chispa se apaga'],
        glow_do: ['A low-spike meal lights her up for 4 h', 'Ein Low-Spike-Essen lässt sie 4 h leuchten', 'Una comida sin picos la ilumina 4 h'],
        glow_sugar: ['Spark dimmed by the sugar', 'Funke vom Zucker gedämpft', 'Chispa apagada por el azúcar'],
        glow_sugar_do: ['It comes back as the rush clears', 'Es kommt zurück, wenn die Flut weg ist', 'Vuelve cuando se va el subidón'],
        protein_ok: ['Protein: goal reached', 'Protein: Ziel erreicht', 'Proteína: objetivo cumplido'],
        protein_no: ['Protein: {x} g more', 'Protein: noch {x} g', 'Proteína: {x} g más'],
        protein_do: ['Try eggs, yogurt, fish or tofu', 'Probier Eier, Joghurt, Fisch oder Tofu', 'Prueba huevos, yogur, pescado o tofu'],
        fiber_ok: ['Fiber: goal reached', 'Ballaststoffe: Ziel erreicht', 'Fibra: objetivo cumplido'],
        fiber_no: ['Fiber: {x} g more', 'Ballaststoffe: noch {x} g', 'Fibra: {x} g más'],
        fiber_do: ['Try veggies, seeds or beans', 'Probier Gemüse, Saaten oder Bohnen', 'Prueba verduras, semillas o legumbres'],
        sweet_ok: ['Sugar: under your limit', 'Zucker: unter deinem Limit', 'Azúcar: bajo tu límite'],
        sweet_no: ['Sugar: {x} g over your limit', 'Zucker: {x} g über deinem Limit', 'Azúcar: {x} g por encima de tu límite'],
        sweet_do: ['Scan before you buy the next snack', 'Scanne den nächsten Snack vor dem Kauf', 'Escanea el próximo snack antes de comprarlo'],
        night_no: ['It’s late: she can’t shine at night', 'Es ist spät: nachts strahlt sie nicht', 'Es tarde: de noche no brilla'],
        night_do: ['Sleep resets her for tomorrow', 'Schlaf lädt sie für morgen auf', 'Dormir la recarga para mañana'],
        held: ['held back', 'gebremst', 'frenada'],
        heldBy: ['Her energy is full, but {w} holds her back. World glow above shows what’s missing.', 'Ihre Energie ist voll, aber {w} bremst sie. Weltleuchten oben zeigt, was fehlt.', 'Su energía está llena, pero {w} la frena. Brillo del mundo, arriba, muestra lo que falta.'],
        why_sugar: ['a sugar rush', 'eine Zuckerflut', 'un subidón de azúcar'],
        why_world: ['a stormy world', 'eine stürmische Welt', 'un mundo tormentoso'],
        st_sugar: ['{n} has a sugar rush', '{n} hat eine Zuckerflut', '{n} tiene un subidón de azúcar'],
        st_sugar_sub: ['Fades in about {t} · a short Move clears it', 'Weg in etwa {t} · eine kurze Bewegung räumt sie weg', 'Se va en unos {t} · un Movimiento corto lo despeja'],
        st_storm: ['{n} is in a stormy world', '{n} ist in einer stürmischen Welt', '{n} está en un mundo tormentoso'],
        st_storm_sub: ['Spiky food today · a Move calms it', 'Heute Spike-Essen · eine Bewegung beruhigt sie', 'Hoy comida con picos · un Movimiento lo calma'],
        st_peak: ['{n} is in Supernova mode', '{n} ist im Supernova-Modus', '{n} está en modo Supernova'],
        st_peak_sub: ['Everything done today · full power', 'Heute alles geschafft · volle Kraft', 'Todo hecho hoy · máxima potencia'],
        btn_move: ['Move', 'Bewegen', 'Moverse'],
        open: ['Open', 'Öffnen', 'Abrir']
    };
    const tr = (k, l, vars) => { let s = (STR[k] || [k])[LI(l)]; if (vars) Object.keys(vars).forEach(v => { s = s.split('{' + v + '}').join(vars[v]); }); return s; };
    function dur(ms) {
        const m = Math.max(1, Math.ceil(ms / MIN));
        if (m < 60) return m + ' min';
        const h = Math.floor(m / 60), r = m % 60;
        return h + ' h' + (r ? ' ' + r + ' min' : '');
    }
    /* when the sugar wave drops below the spiked line, simulated with the cell's own model (5-minute steps, 4 h at most) */
    function clearsIn(cellIn, model, now) {
        if (!cellIn || typeof model !== 'function') return 0;
        now = +now || Date.now();
        for (let k = 1; k <= 48; k++) {
            const t = now + k * 5 * MIN, v = model(Object.assign({}, cellIn, { now: t, hour: new Date(t).getHours() }));
            if (v.state !== 'spiked') return k * 5 * MIN;
        }
        return 4 * 60 * MIN;
    }

    /* x = { now, cell (LowiCell.model result), cellIn (its input), model, en (LowiSun.energy result), wm (world mood read),
             water (glasses today), nutri (LowiNutriStatsCore.rows result, optional) } */
    function read(x) {
        x = x || {};
        const now = +x.now || Date.now(), c = x.cell || {}, en = x.en || {}, wm = x.wm || {}, parts = en.parts || {};
        const water = Math.max(0, +(x.water != null ? x.water : c.water) || 0);
        const rows = [];
        const add = (k, done, score, extra) => rows.push(Object.assign({ k, done: !!done, score: done ? 1 : clamp(score), w: WEIGHT[k] }, extra || {}));
        /* 1. sugar rush: the cell's 4-hour sugar wave (what dims her and the cell world) */
        const spiked = c.state === 'spiked'; /* the cell's own rule: a fresh Move (energy >= the wave) lifts it */
        const left = spiked ? (x.clearsIn != null ? +x.clearsIn : clearsIn(x.cellIn, x.model, now)) : 0;
        add('sugar', !spiked, 1 - clamp(c.spike), { act: 'move', left });
        /* 2. the 3D world's weather today */
        const lv = Math.max(0, +wm.level || 0), stormy = wm.tier === 'stormy' || lv >= STORMY;
        add('world', !stormy, 1 - clamp(lv / 0.5), { act: wm.moved ? 'fuel' : 'move', moved: !!wm.moved });
        /* 3-5. the parts of her energy: meals, water, move */
        const meals = +en.meals || 0, food = meals ? clamp(parts.food) : 0;
        add('fuel', meals > 0 && food >= 0.8, food, { act: 'fuel', meals });
        add('water', water >= WATER_GOAL, water / WATER_GOAL, { act: 'water', n: water, need: Math.max(0, WATER_GOAL - Math.floor(water)) });
        const moves = +en.moves || 0;
        add('move', moves > 0, clamp(parts.move), { act: 'move' });
        /* 6. the glow: what turns the cell world "clear & bright" (water, a recent low-spike meal, a full sun, a fasting step) */
        const glow = (+c.clear || 0) >= GLOW || c.state === 'clear' || c.state === 'active';
        add('glow', glow, (+c.clear || 0) / GLOW, { act: spiked ? 'move' : 'fuel', sugar: spiked });
        /* 7. nutrients, only when today's meals carry numbers (unknown stays unknown, never counted against her) */
        const nr = x.nutri && x.nutri.rows ? x.nutri.rows : null;
        if (nr && x.nutri.meals > 0) {
            const get = k => nr.find(r => r.k === k);
            const known = k => !x.nutri.known || (x.nutri.known[k] || 0) > 0;
            const p = get('protein'), f = get('fiber'), s = get('sugar');
            if (p && known('protein') && p.value > 0) add('protein', p.state === 'hit', p.fill, { act: 'fuel', g: Math.ceil(p.left) });
            if (f && known('fiber') && f.value > 0) add('fiber', f.state === 'hit', f.fill, { act: 'fuel', g: Math.ceil(f.left) });
            if (s && known('sugar') && s.value > 0) add('sweet', s.state !== 'over', 1 - clamp(s.over / Math.max(1, s.target)), { act: 'scan', g: Math.ceil(s.over) });
        }
        /* 8. at night she rests: no peak between 23:00 and 05:00 */
        if (c.night) add('night', false, 0, { act: '' });
        const tw = rows.reduce((a, r) => a + r.w, 0) || 1;
        const missing = rows.filter(r => !r.done);
        const peak = missing.length === 0;
        let score = rows.reduce((a, r) => a + r.w * r.score, 0) / tw;
        /* never reads as maxed while anything is missing */
        score = peak ? 1 : Math.min(HOLD_MAX, score);
        const held = [];
        if (spiked) held.push('sugar');
        if (stormy) held.push('world');
        return { score: +score.toFixed(3), pct: Math.floor(score * 100), peak, rows, missing: missing.length, held, energy: +en.value || 0, spiked, stormy, left, now };
    }

    function rowText(r, l) {
        const T = (k, v) => tr(k, l, v);
        switch (r.k) {
            case 'sugar': return r.done ? [T('sugar_ok')] : [T('sugar_no', { t: dur(r.left || 0) }), T('sugar_do')];
            case 'world': return r.done ? [T('world_ok')] : [T('world_no'), T(r.moved ? 'world_do_fuel' : 'world_do_move')];
            case 'fuel': return r.done ? [r.meals === 1 ? T('fuel_ok1') : T('fuel_ok', { m: r.meals })] : r.meals ? [T('fuel_no'), T('fuel_do')] : [T('fuel_none'), T('fuel_none_do')];
            case 'water': return r.done ? [T('water_ok', { w: Math.floor(r.n), g: WATER_GOAL })] : [r.need === 1 ? T('water_no1') : T('water_no', { x: r.need }), T('water_do')];
            case 'move': return r.done ? [T('move_ok')] : [T('move_no'), T('move_do')];
            case 'glow': return r.done ? [T('glow_ok')] : r.sugar ? [T('glow_sugar'), T('glow_sugar_do')] : [T('glow_no'), T('glow_do')];
            case 'protein': return r.done ? [T('protein_ok')] : [T('protein_no', { x: r.g }), T('protein_do')];
            case 'fiber': return r.done ? [T('fiber_ok')] : [T('fiber_no', { x: r.g }), T('fiber_do')];
            case 'sweet': return r.done ? [T('sweet_ok')] : [T('sweet_no', { x: r.g }), T('sweet_do')];
            case 'night': return [T('night_no'), T('night_do')];
        }
        return [r.k];
    }
    /* the words for the energy card while she is held back ("a sugar rush", "a sugar rush and a stormy world") */
    function heldText(p, l) {
        if (!p || !p.held.length) return '';
        const w = p.held.map(k => tr('why_' + k, l));
        const and = [' and ', ' und ', ' y '][LI(l)];
        return tr('heldBy', l, { w: w.join(and) });
    }
    /* the Today / sheet status line: a sugar rush or a stormy world wins over "bright and awake"; the peak gets its own line */
    function statusFor(p, n, l) {
        if (!p) return null;
        if (p.peak) return { mood: 'peak', title: tr('st_peak', l, { n }), sub: tr('st_peak_sub', l) };
        if (p.spiked) return { mood: 'spiked', title: tr('st_sugar', l, { n }), sub: tr('st_sugar_sub', l, { t: dur(p.left || 0) }), action: 'move', icon: 'move', button: tr('btn_move', l) };
        if (p.stormy) return { mood: 'spiked', title: tr('st_storm', l, { n }), sub: tr('st_storm_sub', l), action: 'move', icon: 'move', button: tr('btn_move', l) };
        return null;
    }
    const ICON = {
        ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>',
        no: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5"/></svg>',
        go: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
        star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.6 6.1 6.6.6-5 4.4 1.5 6.5L12 17l-5.7 3.4 1.5-6.5-5-4.4 6.6-.6z"/></svg>'
    };
    /* the section at the top of Misty's sheet: bar + checklist. Missing rows first (they are what she needs), done rows after. */
    function cardHTML(p, opts) {
        if (!p) return '';
        opts = opts || {};
        const l = opts.lang || 'en', n = opts.name || 'Misty';
        const sub = p.peak ? tr('peakSub', l, { n }) : (p.missing === 1 ? tr('left1', l) : tr('leftN', l, { x: p.missing }));
        const order = p.rows.filter(r => !r.done).concat(p.rows.filter(r => r.done));
        let h = '<section class="mh-card mp-card" id="mistyPeak" data-peak="' + (p.peak ? 1 : 0) + '" aria-label="' + esc(tr('bar', l)) + '">' +
            '<div class="mp-head"><h3>' + (p.peak ? ICON.star : '') + esc(p.peak ? tr('peak', l) : tr('bar', l)) + '</h3><b class="mp-pct num">' + p.pct + '%</b></div>' +
            '<i class="mp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p.pct + '" aria-label="' + esc(tr('bar', l)) + '"><i style="width:' + Math.max(3, p.pct) + '%"></i></i>' +
            '<p class="mp-sub">' + esc(sub) + '</p>';
        if (!p.peak) h += '<h4 class="mp-h">' + esc(tr('missing', l)) + '</h4>';
        h += '<ul class="mp-list">';
        order.forEach(r => {
            const t = rowText(r, l), tap = !r.done && r.act;
            const inner = '<span class="mp-ic">' + (r.done ? ICON.ok : ICON.no) + '</span><span class="mp-tx"><b>' + esc(t[0]) + '</b>' + (t[1] ? '<small>' + esc(t[1]) + '</small>' : '') + '</span>' + (tap ? '<span class="mp-go">' + ICON.go + '</span>' : '');
            h += '<li data-k="' + r.k + '" data-done="' + (r.done ? 1 : 0) + '">' + (tap ? '<button type="button" data-mp="' + esc(r.act) + '" aria-label="' + esc(t.join('. ')) + '">' + inner + '</button>' : '<div class="mp-row">' + inner + '</div>') + '</li>';
        });
        return h + '</ul></section>';
    }

    const pure = { read, clearsIn, cardHTML, statusFor, heldText, rowText, dur, STR, WEIGHT, WATER_GOAL, HOLD_MAX };
    if (!D) { if (typeof module !== 'undefined' && module.exports) module.exports = pure; return; }

    /* ---------- live ---------- */
    const H = D.documentElement;
    const lang = () => { try { return ((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || H.lang || 'de').slice(0, 2); } catch (e) { return 'de'; } };
    const state = () => { try { return (W.LowiVitalsBridge && W.LowiVitalsBridge.state()) || {}; } catch (e) { return {}; } };
    const pad = n => (n < 10 ? '0' : '') + n;
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    function waterToday(now) { try { const f = (o => o && typeof o === "object" ? o : {})(JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}')); return +((f.water || {})[dayKey(now)]) || 0; } catch (e) { return 0; } }
    let sim = '';
    try { sim = new URLSearchParams(W.location.search).get('peak') || ''; } catch (e) { }
    function now() {
        const t = Date.now(), s = state(), Cl = W.LowiCell;
        if (!Cl || !Cl.model) return null;
        let cellIn = null, cell = null;
        try { cellIn = Cl.input ? Cl.input(t) : null; cell = cellIn ? Cl.model(cellIn) : (Cl.live ? Cl.live(t) : null); } catch (e) { cell = null; }
        if (!cell) return null;
        /* ?cell=spiked (the cell's own preview switch) shows here too */
        try { const lv = Cl.live && Cl.live(t); if (lv && lv.state !== cell.state) { cell = lv; cellIn = null; } } catch (e) { }
        let en = {};
        try { en = (W.LowiSun && W.LowiSun.energyNow && W.LowiSun.energyNow()) || {}; } catch (e) { }
        let wm = {};
        /* the weather the 3D world is painted with right now; the core reading when world-mood.js is not up yet */
        try { const M = W.LowiWorldMood; if (M && M.mood) wm = M.mood; else if (W.LowiWorldMoodCore && W.LowiWorldHealth) wm = W.LowiWorldMoodCore.read(s, t, W.LowiWorldHealth); } catch (e) { }
        let nutri = null;
        try { const N = W.LowiNutriStatsCore; if (N && N.rows) { nutri = N.rows(s, dayKey(t)); const tot = N.totals(s.logs, dayKey(t)); nutri.known = tot.known; } } catch (e) { nutri = null; }
        const p = read({ now: t, cell, cellIn, model: Cl.model, en, wm, water: waterToday(t), nutri });
        if (sim === 'peak') { p.rows.forEach(r => { r.done = true; r.score = 1; }); Object.assign(p, { peak: true, score: 1, pct: 100, missing: 0, held: [], spiked: false, stormy: false }); }
        return p;
    }
    function html() { try { const p = now(); return p ? cardHTML(p, { lang: lang(), name: name() }) : ''; } catch (e) { return ''; } }
    function name() { try { const t = D.querySelector('#spBubble .sp-bubble-name'); const n = t && t.textContent.trim(); if (n) return n.split('\u00a0')[0].split(' \u00b7')[0]; } catch (e) { } return 'Misty'; }

    /* Home look: html[data-peak="1"] = big smile, brightest world, a small glow; data-peak-held = something holds her back */
    let lastSig = '';
    function paint() {
        const p = now(); if (!p) return;
        const sig = [p.peak ? 1 : 0, p.held.join(), p.pct].join('|');
        if (sig === lastSig) return;
        lastSig = sig;
        if (p.peak) H.setAttribute('data-peak', '1'); else H.removeAttribute('data-peak');
        if (p.held.length) H.setAttribute('data-peak-held', p.held.join(' ')); else H.removeAttribute('data-peak-held');
        try { W.dispatchEvent(new CustomEvent('lowi:peak', { detail: { peak: p.peak, pct: p.pct, held: p.held.slice() } })); } catch (e) { }
        /* an open sheet keeps up */
        const card = D.querySelector('#mistyHub #mistyPeak');
        if (card) { const t = D.createElement('div'); t.innerHTML = cardHTML(p, { lang: lang(), name: name() }); if (t.firstChild) card.replaceWith(t.firstChild); }
    }
    let soon = 0;
    const schedule = () => { if (soon) return; soon = setTimeout(() => { soon = 0; try { paint(); } catch (e) { } }, 150); };
    ['lowi:reward', 'lowi:state', 'lowi:care', 'lowi:lang', 'lowi:fast', 'lowi:water', 'lowi:meal', 'lowi:meal-logged', 'lowi:world-mood', 'lowi:cell-state', 'storage', 'focus'].forEach(n => { W.addEventListener(n, schedule); if (n.indexOf('lowi:') === 0) D.addEventListener(n, schedule); });
    D.addEventListener('visibilitychange', () => { if (!D.hidden) { lastSig = ''; schedule(); } });
    /* the sugar wave fades with time, nothing fires for that: one cheap check a minute */
    setInterval(() => { if (!D.hidden) schedule(); }, 60000);

    /* a missing row taps through to the place that fixes it */
    function go(act) {
        try { if (W.LowiMistyHub && W.LowiMistyHub.close) W.LowiMistyHub.close(); } catch (e) { }
        setTimeout(() => {
            try {
                const B = W.LowiHomeBloomsV2;
                if (act === 'scan') { if (typeof W.lowiOpen === 'function') W.lowiOpen('scan'); else if (W.LowiSpirit && W.LowiSpirit.scan) W.LowiSpirit.scan(); return; }
                /* Oct 28 2026 (Emmanuel: "Ballaststoffe: noch 13 g" opened the old Einkaufen / Kochen / Mahlzeit orbs): the food rows
                   (meals, protein, fibre, glow) open the Essenspause eating hub, where a meal is logged and Kochen is. The ring's own map
                   (home-blooms-v2.js RING) decides what each bubble does; this never asks for the old Fuel menu. */
                if (act === 'fuel') { if (B && B.hub && B.hub('peak')) return; if (W.LowiGapView && W.LowiGapView.open) { W.LowiGapView.open({ from: 'peak' }); return; } }
                else if (B && B.open && B.open(act)) return;
                if (act === 'fuel' && W.LowiSpirit && W.LowiSpirit.meal) W.LowiSpirit.meal();
                else if (act === 'water' && W.LowiSpirit && W.LowiSpirit.water) W.LowiSpirit.water();
                else if (act === 'move' && W.LowiMoveBubble && W.LowiMoveBubble.page) W.LowiMoveBubble.page();
            } catch (e) { console.error(e); }
        }, 380);
    }
    D.addEventListener('click', e => { const b = e.target.closest && e.target.closest('#mistyPeak [data-mp]'); if (!b) return; e.preventDefault(); go(b.dataset.mp); });

    function boot() { schedule(); }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
    W.LowiMistyPeak = Object.assign({}, pure, { now, html, paint, go, status: () => { try { return statusFor(now(), name(), lang()); } catch (e) { return null; } } });
    if (typeof module !== 'undefined' && module.exports) module.exports = W.LowiMistyPeak;
})();
