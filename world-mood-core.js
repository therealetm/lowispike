/* LOWiSPIKE game-world mood (Oct 15, 2026). ONE shared reading of how the metabolic GAME world feels today, so the 3D world's
   look and its sound always agree. Pure, no DOM (tests/world-mood.test.cjs). world-mood.js applies it; world-audio.js listens.
   Triggers (user, combined), only from what was really logged TODAY:
   - insulin-spiking food logged (meal verdict spike, LowiWorldHealth.verdict <= .15)
   - unhealthy products logged from a scan (barcode logs with a spike verdict)
   - no Move / workout logged yet (LowiWorldHealth.kind 'move' in the ledger)
   No logs is missing data, not bad health: with nothing negative logged the world stays clear, even with no Move logged.
   level 0..1: one kind of spike .5, both kinds .75; no Move logged adds .25 on top of a spike; a logged Move softens it.
   This is a game-world mood, never a health verdict: copy speaks about the world (clear / stormy), no diagnosis, no shame.
   Event: window 'lowi:world-mood' {level, tier:'clear'|'stormy', why:[...]} whenever it changes; html[data-wm], --wm. */
(function (root) {
    'use strict';
    function read(state, now, wh) {
        const out = { level: 0, tier: 'clear', food: 0, products: 0, moved: false, why: [] };
        if (!state || !wh || !wh.dayKey) return out;
        const key = wh.dayKey(+now || Date.now());
        const day = e => !!e && (e.day || wh.dayKey(+e.ts || 0)) === key;
        for (const l of (state.logs || [])) {
            if (!day(l) || wh.verdict(l) > 0.15) continue;
            if (String(l.via || '') === 'barcode' || /^(meal:)?bc:/.test(String(l.eventId || ''))) out.products++; else out.food++;
        }
        out.moved = (state.ledger || []).some(e => day(e) && wh.kind(e) === 'move');
        if (!out.food && !out.products) return out;
        if (out.food) out.why.push('food'); if (out.products) out.why.push('products'); if (!out.moved) out.why.push('nomove');
        out.level = Math.min(1, (out.food && out.products ? 0.75 : 0.5) + (out.moved ? 0 : 0.25));
        out.tier = 'stormy';
        return out;
    }
    /* cheap change detector for polling (no app event fires on every log) */
    function sig(state, now, wh) {
        if (!state || !wh) return '';
        const l = state.logs || [], g = state.ledger || [], a = l[l.length - 1], b = g[g.length - 1];
        return [wh.dayKey(+now || Date.now()), l.length, g.length, a && (a.eventId || a.ts), a && a.r, a && a.lvl, b && (b.eventId || b.ts)].join('|');
    }
    /* the visual: one CSS filter for the world canvas + veil strength; clear is a touch brighter, stormy is murky and dim */
    function look(level) {
        const x = Math.max(0, Math.min(1, +level || 0));
        if (!x) return { filter: 'saturate(1.08) brightness(1.04)', veil: 0, clear: 1 };
        /* Oct 16 (E-man's screenshot: the world turned brown/beige on a stormy day): no sepia or warm hue shift any more. Stormy
           stays in the brand's silvery dark blue; it only gets greyer, dimmer and a little colder. */
        const f = 'saturate(' + (1 - 0.55 * x).toFixed(3) + ') hue-rotate(' + (6 * x).toFixed(1) + 'deg) brightness(' + (1 - 0.3 * x).toFixed(3) + ') contrast(' + (1 + 0.1 * x).toFixed(3) + ')';
        return { filter: f, veil: +(0.45 + 0.55 * x).toFixed(3), clear: 0 };
    }
    const STR = {
        clear: ['Clear world', 'Klare Welt', 'Mundo despejado'],
        stormy: ['Stormy world', 'St\u00fcrmische Welt', 'Mundo tormentoso'],
        food: ['spiky food logged today', 'heute Spike-Essen eingetragen', 'hoy comida con picos registrada'],
        products: ['spiky products scanned in', 'Spike-Produkte eingescannt', 'productos con picos escaneados'],
        nomove: ['a Move calms it', 'eine Bewegung beruhigt sie', 'un Movimiento la calma'],
        moved: ['your Move is calming it', 'deine Bewegung beruhigt sie', 'tu Movimiento la est\u00e1 calmando']
    };
    function line(m, lang) {
        const i = { en: 0, de: 1, es: 2 }[String(lang || 'de').slice(0, 2)]; const L = k => STR[k][i == null ? 1 : i];
        if (!m || !m.level) return L('clear');
        const parts = [m.food ? L('food') : L('products')];
        if (m.food && m.products) parts.push(L('products'));
        parts.push(m.moved ? L('moved') : L('nomove'));
        return L('stormy') + ' \u00b7 ' + parts.join(' \u00b7 ');
    }
    const api = { read, sig, look, line, STR };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiWorldMoodCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
