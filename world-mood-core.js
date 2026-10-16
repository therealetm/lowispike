/* LOWiSPIKE game-world weather (Oct 15, 2026; fast and fair since Oct 16). ONE shared reading of how the metabolic GAME world
   feels, so the 3D world's look and its sound always agree. Pure, no DOM (tests/world-mood.test.cjs, tests/fair-weather.test.cjs).
   world-mood.js applies it; world-audio.js listens.
   Oct 16 (E-man): the weather follows your overall habits, not just the last thing eaten; "a few days is long" to be stuck in a
   storm; "the returning of the order should be faster, but going back into chaos mode is also faster"; "kill all cheating and
   all loops". So:
   - Today's logs are replayed in order. A spiky meal (verdict <= .15) pushes the storm up by .42, a spiky scanned product by .34:
     the world turns stormy the moment it is logged, also after a good morning (fast relapse).
   - Every positive log calms it right away, in proportion to what it is, with a cap per kind per day (fast, fair recovery):
     low-spike meal -.2 (cap .5), glass of water -.05 (cap .2), first Move -.3 then -.15 (cap .45), macro goal -.1 (cap .2).
     One glass of water never clears a day of spikes, and there is no on/off switch: the look scales with the level.
   - Good logs before a spike leave a small cushion (down to -.15), never a free pass.
   - The 4-day habit trend (LowiWorldHealth.score up to yesterday) sets where the day starts: a hazy few days start up to
     +.15 (a faint haze, never a storm on its own: the tier stays clear until something is logged today), a bright streak
     starts with up to -.1 of cushion. Nothing logged at all = clear.
   - Duplicates, twins, rapid-fire taps and log/undo loops add nothing (LowiWorldHealth.fairDay; read from what is saved).
   This is a game-world mood, never a health verdict: copy speaks about the world (clear / stormy), no diagnosis, no shame.
   Event: window 'lowi:world-mood' {level, tier:'clear'|'stormy', why:[...]} whenever it changes; html[data-wm], --wm. */
(function (root) {
    'use strict';
    const PUSH = { food: 0.42, products: 0.34 };
    const CALM = { good: 0.2, water: 0.05, move: [0.3, 0.15], macro: 0.1 };
    const CAP = { good: 0.5, water: 0.2, move: 0.45, macro: 0.2 };
    const CUSHION = -0.15, TREND = { haze: 0.15, cushion: -0.1, neutral: 50 }, STORMY = 0.1;
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const r3 = x => Math.round(x * 1000) / 1000;
    /* where today starts: the habit trend of the days before (the 4-day score as of yesterday), gently */
    function trend(state, now, wh) {
        if (!wh || typeof wh.score !== 'function') return 0;
        const y = new Date(+now || Date.now()); y.setHours(12, 0, 0, 0); y.setDate(y.getDate() - 1);
        const r = wh.score(state, y.getTime());
        if (!r || r.empty) return 0;
        const s = +r.score || TREND.neutral;
        return r3(s < TREND.neutral ? TREND.haze * clamp((TREND.neutral - s) / (TREND.neutral - (wh.FLOOR || 18)), 0, 1)
            : TREND.cushion * clamp((s - TREND.neutral) / (100 - TREND.neutral), 0, 1));
    }
    const isProduct = l => String(l.via || '') === 'barcode' || /^(meal:)?bc:/.test(String(l.eventId || ''));
    function read(state, now, wh) {
        const out = { level: 0, tier: 'clear', food: 0, products: 0, good: 0, water: 0, moves: 0, macro: 0, calm: 0, moved: false, base: 0, why: [] };
        if (!state || !wh || !wh.dayKey) return out;
        now = +now || Date.now();
        const key = wh.dayKey(now);
        const fair = typeof wh.fairDay === 'function' ? wh.fairDay(state, key)
            : { logs: (state.logs || []).filter(l => l && (l.day || wh.dayKey(+l.ts || 0)) === key), ledger: (state.ledger || []).filter(e => e && (e.day || wh.dayKey(+e.ts || 0)) === key) };
        const ev = [];
        fair.logs.forEach((l, i) => {
            const v = wh.verdict(l);
            const k = v <= 0.15 ? (isProduct(l) ? 'products' : 'food') : v >= 1 ? 'good' : '';
            if (k) ev.push({ k, t: +l.ts || 0, i });
        });
        fair.ledger.forEach((e, i) => {
            const k = wh.kind(e);
            if (k === 'water' || k === 'move' || k === 'macro') ev.push({ k, t: +e.ts || 0, i: 1e6 + i });
        });
        ev.sort((a, b) => (a.t - b.t) || (a.i - b.i));
        const base = trend(state, now, wh), used = { good: 0, water: 0, move: 0, macro: 0 };
        let lv = base;
        for (const e of ev) {
            if (PUSH[e.k]) { lv += PUSH[e.k]; out[e.k]++; }
            else {
                const k = e.k === 'move' ? 'move' : e.k, step = k === 'move' ? CALM.move[Math.min(out.moves, CALM.move.length - 1)] : CALM[k];
                const d = Math.max(0, Math.min(step, CAP[k] - used[k]));
                used[k] += d; lv -= d; out.calm += d > 0 ? 1 : 0;
                if (k === 'move') out.moves++; else out[k]++;
            }
            lv = clamp(lv, CUSHION, 1);
        }
        out.moved = out.moves > 0; out.base = base;
        out.level = r3(Math.max(0, lv));
        if (out.level < STORMY || !ev.length) return out;
        if (out.food) out.why.push('food'); if (out.products) out.why.push('products');
        if (!out.food && !out.products) out.why.push('trend');
        if (!out.moved) out.why.push('nomove');
        out.tier = 'stormy';
        return out;
    }
    /* cheap change detector for polling (no app event fires on every log) */
    function sig(state, now, wh) {
        if (!state || !wh) return '';
        const l = state.logs || [], g = state.ledger || [], a = l[l.length - 1], b = g[g.length - 1];
        return [wh.dayKey(+now || Date.now()), l.length, g.length, a && (a.eventId || a.ts), a && a.r, a && a.lvl, b && (b.eventId || b.ts)].join('|');
    }
    /* the visual: one CSS filter for the world canvas + veil strength. Continuous (no on/off switch): every bit of calm
       you log shows. Clear is a touch brighter; stormy gets greyer, dimmer and a little colder, never brown (Oct 16). */
    function look(level) {
        const x = Math.max(0, Math.min(1, +level || 0));
        if (!x) return { filter: 'saturate(1.08) brightness(1.04)', veil: 0, clear: 1 };
        const f = 'saturate(' + (1.08 - 0.63 * x).toFixed(3) + ') hue-rotate(' + (6 * x).toFixed(1) + 'deg) brightness(' + (1.04 - 0.34 * x).toFixed(3) + ') contrast(' + (1 + 0.1 * x).toFixed(3) + ')';
        return { filter: f, veil: +(1 - (1 - x) * (1 - x)).toFixed(3), clear: x < STORMY ? 1 : 0 };
    }
    const STR = {
        clear: ['Clear world', 'Klare Welt', 'Mundo despejado'],
        stormy: ['Stormy world', 'St\u00fcrmische Welt', 'Mundo tormentoso'],
        food: ['spiky food logged today', 'heute Spike-Essen eingetragen', 'hoy comida con picos registrada'],
        products: ['spiky products scanned in', 'Spike-Produkte eingescannt', 'productos con picos escaneados'],
        nomove: ['a Move calms it', 'eine Bewegung beruhigt sie', 'un Movimiento la calma'],
        moved: ['your Move is calming it', 'deine Bewegung beruhigt sie', 'tu Movimiento la est\u00e1 calmando'],
        trend: ['a hazy few days', 'ein paar diesige Tage', 'unos d\u00edas brumosos'],
        clearing: ['it is clearing up', 'sie klart auf', 'se est\u00e1 despejando']
    };
    function line(m, lang) {
        const i = { en: 0, de: 1, es: 2 }[String(lang || 'de').slice(0, 2)]; const L = k => STR[k][i == null ? 1 : i];
        if (!m || !m.level || m.tier === 'clear') return L('clear');
        const parts = [];
        if (m.food) parts.push(L('food')); if (m.products) parts.push(L('products'));
        if (!parts.length) parts.push(L('trend'));
        parts.push(m.moved ? L('moved') : m.calm ? L('clearing') : L('nomove'));
        return L('stormy') + ' \u00b7 ' + parts.join(' \u00b7 ');
    }
    const api = { read, sig, look, line, trend, STR, PUSH, CALM, CAP, CUSHION, TREND, STORMY };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiWorldMoodCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
