/* LOWiSPIKE world health (Oct 15, 2026): ONE shared score for how the inside of the body looks.
   Every body/cell/3D build reads this, never its own formula. Rules (also in VISUAL-MASTER.md + COORDINATION.md):
   - Window: today + the 3 days before (4 local days). Day weights 1, .7, .5, .35 (today counts most).
     Days with nothing logged are skipped, so a quiet day never darkens the world. No data at all = 62 (kind start).
   - Day score 0..1 = food .45 + move .15 + water .12 + macro goals .13 + XP .15.
     food  = mean meal verdict: low spike (ja/low) 1, medium (jein/mid) .55, spike (nein/high) .15, unknown .6; no meals = .6
     move  = Move/walk/workout ledger entries, 1 per day = full
     water = water ledger entries, 4 per day = full
     macro = macro-goal ledger entries, 2 per day = full
     xp    = XP earned that day, 90 = full
   - Score 0..100 = 18 + 82 * weighted day mean (floor 18: never black, never gross).
   - Smoothing: one meal moves a 4-day score by a few points only; tier names: bright >= 70, steady 45..69, murky < 45.
   - look params (0..1 unless noted) map linearly from the score: clarity (1 - fog), bright, flow (speed factor .45..1.25),
     microbes (ambient particle share .35..1), cellGlow (.35..1), warmth.
   - why line: names the strongest recent part and the one thing that would brighten it most. Kind wording, no shame.
   Pure, no DOM: tested in tests/world-health.test.cjs. */
(function (root) {
    'use strict';
    const WEIGHTS = [1, 0.7, 0.5, 0.35];
    const PART_W = { food: 0.45, move: 0.15, water: 0.12, macro: 0.13, xp: 0.15 };
    const FULL = { move: 1, water: 4, macro: 2, xp: 90 };
    const FLOOR = 18, START = 62;
    const pad = n => String(n).padStart(2, '0');
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

    function verdict(l) {
        const r = String(l && l.r || '').toLowerCase(), v = String(l && l.lvl || '').toLowerCase();
        if (r === 'ja' || v === 'low' || r === 'low' || r === 'yes') return 1;
        if (r === 'nein' || v === 'high' || r === 'high' || r === 'no') return 0.15;
        if (r === 'jein' || v === 'mid' || v === 'medium' || r === 'mid' || r === 'maybe') return 0.55;
        return 0.6;
    }
    function kind(e) {
        const src = String(e && e.src || ''), id = String(e && e.eventId || ''), txt = (src + ' ' + (e && e.label || '')).toLowerCase();
        if (/^macro-goal/.test(src) || /^macro-goal/.test(id)) return 'macro';
        if (/^meal/.test(src) || /^meal:|^plan-meal:/.test(id)) return 'meal';
        if (/water|wasser|agua|hydrat/.test(txt)) return 'water';
        if (/move|walk|workout|steps|dance|yoga|stretch|bewegung/.test(txt)) return 'move';
        return 'other';
    }
    const entryDay = e => e.day || dayKey(+e.ts || 0);
    /* Oct 16 fair play (E-man: "we definitely have to kill all cheating and all loops"). What counts toward the world's weather,
       the inside and Misty's energy (XP has its own guards in award()/logMeal): one entry per eventId; a meal twin (same name or
       barcode on the same day) counts once; the same kind of ledger entry (water, Move, macro goal) within FAST ms of the last
       counted one is one rapid-fire tap. Everything is read from what is saved, so log / undo / log again adds nothing extra. */
    const FAST = { water: 20000, move: 60000, macro: 20000 };
    const mealKey = t => String(t || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').split(/\s+[\u00b7|-]\s+/)[0].replace(/[^a-z0-9\u00df]+/g, '');
    function fairDay(state, key) {
        state = state || {};
        const seen = new Set(), logs = [], ledger = [], last = {};
        for (const l of (state.logs || [])) {
            if (!l || entryDay(l) !== key) continue;
            const id = l.eventId || l.id, k = l.code ? 'c:' + l.code : mealKey(l.t);
            if (id && seen.has('l:' + id)) continue;
            if (k && seen.has('m:' + k)) continue;
            if (id) seen.add('l:' + id); if (k) seen.add('m:' + k);
            logs.push(l);
        }
        for (const e of (state.ledger || [])) {
            if (!e || entryDay(e) !== key) continue;
            if (e.eventId) { if (seen.has('g:' + e.eventId)) continue; seen.add('g:' + e.eventId); }
            const k = kind(e), gap = FAST[k], t = +e.ts || 0;
            if (gap && t) { if (last[k] && Math.abs(t - last[k]) < gap) continue; last[k] = t; }
            ledger.push(e);
        }
        return { logs, ledger };
    }

    function dayParts(state, key) {
        const fair = fairDay(state, key), logs = fair.logs, led = fair.ledger;
        const n = { move: 0, water: 0, macro: 0, xp: 0 };
        for (const e of led) { const k = kind(e); if (n[k] != null) n[k] += (k === 'move' && e.mq != null) ? Math.max(0, Math.min(4, +e.mq || 0)) / 4 : 1; if (+e.amt > 0) n.xp += +e.amt; } /* Oct 17: a Home movement estimate counts its quarters (mq/4) */
        if (!logs.length && !led.length) return null;
        const food = logs.length ? logs.reduce((s, l) => s + verdict(l), 0) / logs.length : 0.6;
        const p = { food, move: clamp(n.move / FULL.move, 0, 1), water: clamp(n.water / FULL.water, 0, 1), macro: clamp(n.macro / FULL.macro, 0, 1), xp: clamp(n.xp / FULL.xp, 0, 1) };
        p.meals = logs.length; p.spikes = logs.filter(l => verdict(l) <= 0.15).length; p.good = logs.filter(l => verdict(l) >= 1).length;
        p.total = Object.keys(PART_W).reduce((s, k) => s + PART_W[k] * p[k], 0);
        return p;
    }

    function score(state, now) {
        state = state || {}; now = +now || Date.now();
        const days = [];
        let wsum = 0, acc = 0;
        const agg = { food: 0, move: 0, water: 0, macro: 0, xp: 0 };
        for (let i = 0; i < WEIGHTS.length; i++) {
            const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i);
            const key = dayKey(d.getTime()), p = dayParts(state, key);
            days.push({ key, parts: p });
            if (!p) continue;
            wsum += WEIGHTS[i]; acc += WEIGHTS[i] * p.total;
            for (const k in agg) agg[k] += WEIGHTS[i] * p[k];
        }
        if (!wsum) return { score: START, tier: tierOf(START), empty: true, parts: null, days };
        for (const k in agg) agg[k] /= wsum;
        const s = Math.round(FLOOR + (100 - FLOOR) * clamp(acc / wsum, 0, 1));
        return { score: s, tier: tierOf(s), empty: false, parts: agg, days };
    }
    const tierOf = s => s >= 70 ? 'bright' : s >= 45 ? 'steady' : 'murky';
    const lerp = (a, b, t) => a + (b - a) * t;
    function look(s) {
        const t = clamp((+s - FLOOR) / (100 - FLOOR), 0, 1);
        return { t, clarity: +lerp(0.38, 1, t).toFixed(3), fog: +lerp(0.62, 0, t).toFixed(3), bright: +lerp(0.5, 1, t).toFixed(3), flow: +lerp(0.45, 1.25, t).toFixed(3),
            microbes: +lerp(0.35, 1, t).toFixed(3), cellGlow: +lerp(0.35, 1, t).toFixed(3), warmth: +lerp(0.2, 1, t).toFixed(3) };
    }
    /* the one thing that would brighten the inside most: biggest weighted gap */
    function tip(parts) {
        if (!parts) return 'log';
        let best = 'food', gap = -1;
        for (const k of ['food', 'move', 'water', 'macro']) { const g = PART_W[k] * (1 - parts[k]); if (g > gap + 1e-9) { gap = g; best = k; } }
        return gap < 0.04 ? 'keep' : best;
    }
    function strong(parts) {
        if (!parts) return null;
        let best = null, v = 0.55;
        for (const k of ['food', 'move', 'water', 'macro']) if (parts[k] > v) { v = parts[k]; best = k; }
        return best;
    }
    const COPY = {
        bright: ['Your inside is clear and bright', 'Dein Inneres ist klar und hell', 'Tu interior está claro y luminoso'],
        steady: ['Your inside is calm, a little hazy', 'Dein Inneres ist ruhig, etwas diesig', 'Tu interior está tranquilo, algo brumoso'],
        murky: ['Your inside is resting in a soft haze', 'Dein Inneres ruht im sanften Dunst', 'Tu interior descansa en una bruma suave'],
        empty: ['Your inside is waiting for your first logs', 'Dein Inneres wartet auf deine ersten Einträge', 'Tu interior espera tus primeros registros'],
        because: [' thanks to ', ' dank ', ' gracias a '],
        s_food: ['your low-spike meals', 'deiner Low-Spike-Mahlzeiten', 'tus comidas sin picos'],
        s_move: ['your movement', 'deiner Bewegung', 'tu movimiento'],
        s_water: ['your water', 'deinem Wasser', 'tu agua'],
        s_macro: ['your macro goals', 'deiner Makro-Ziele', 'tus metas de macros'],
        t_food: ['A low-spike meal brightens it most.', 'Eine Low-Spike-Mahlzeit macht es am hellsten.', 'Una comida sin picos lo ilumina más.'],
        t_move: ['A short Move gets the flow going.', 'Eine kurze Bewegung bringt den Fluss in Schwung.', 'Un Movimiento corto activa el flujo.'],
        t_water: ['A glass of water clears the haze.', 'Ein Glas Wasser klärt den Dunst.', 'Un vaso de agua despeja la bruma.'],
        t_macro: ['Hitting protein or fiber lights it up.', 'Protein- oder Ballaststoff-Ziel lässt es leuchten.', 'Llegar a tu proteína o fibra lo enciende.'],
        t_keep: ['Keep this rhythm and it stays this way.', 'Bleib in diesem Rhythmus, dann bleibt es so.', 'Sigue este ritmo y seguirá así.'],
        t_log: ['Log a meal or a glass of water and watch it change.', 'Trag eine Mahlzeit oder ein Glas Wasser ein und schau zu.', 'Registra una comida o un vaso de agua y mira cómo cambia.'],
        days: ['Last 4 days', 'Letzte 4 Tage', 'Últimos 4 días']
    };
    const tr = (k, li) => (COPY[k] || [k])[li] || (COPY[k] || [k])[0];
    function why(res, li) {
        li = li | 0;
        if (!res || res.empty) return tr('empty', li) + '. ' + tr('t_log', li);
        const st = strong(res.parts), head = tr(res.tier, li) + (st && res.tier !== 'murky' ? tr('because', li) + tr('s_' + st, li) : '') + '.';
        return head + ' ' + tr('t_' + tip(res.parts), li);
    }
    function forState(state, now, li) { const r = score(state, now); r.look = look(r.score); r.line = why(r, li); r.tip = tip(r.parts); return r; }
    const api = { WEIGHTS, PART_W, FULL, FLOOR, START, FAST, dayKey, verdict, kind, mealKey, fairDay, dayParts, score, tierOf, look, tip, why, forState, COPY };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.LowiWorldHealth = api;
})(typeof window !== 'undefined' ? window : globalThis);
