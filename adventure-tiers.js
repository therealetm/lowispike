/* LOWiSPIKE · adventure tiers (Oct 17, 2026, E-man): "the exploration that it's doing is not the same as autopilot; autopilot is
   actually a way better exploration". Two separate choices now share one flight engine (misty-flight.js + misty-explore.js):
   - ADVENTURE: her timed trip (sun-meter.js, LowiSun away, about an hour). How far she roams is gated by her level
     (world-home-core.js STAGES, the same Level 1-6 the Misty card shows):
       Level 1-2  her home world only (she visits each place's door, never goes in)
       Level 3    + every cell world (she flies into them, like autopilot)
       Level 4    + the outer atmosphere of the spirit world (she breaks out of her world and drifts round it)
       Level 5    + into the spirit world's bubbles
       Level 6    + riding the streams between bubbles by herself
   - AUTOPILOT: three quick taps on the controller (adventure.js). Never gated: everything above, at any level.
   Pure helpers are tested in tests/adventure-tiers.test.cjs. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;
    /* lv: the first level that unlocks the tier; xp mirrors world-home-core.js STAGES (tested in step) */
    const TIERS = [
        { id: 'local', lv: 1, xp: 0, n: ['Home world', 'Heimatwelt', 'Mundo de casa'], d: ['Roams your own world and visits each place\u2019s door', 'Streift durch deine eigene Welt und besucht jede Tür', 'Recorre tu propio mundo y visita cada puerta'] },
        { id: 'cells', lv: 3, xp: 300, n: ['Cell worlds', 'Zellwelten', 'Mundos celulares'], d: ['Flies into every cell world', 'Fliegt in jede Zellwelt hinein', 'Entra en cada mundo celular'] },
        { id: 'atmos', lv: 4, xp: 700, n: ['Spirit world sky', 'Himmel der Geisterwelt', 'Cielo del mundo espiritual'], d: ['Breaks out and drifts round the spirit world\u2019s outer atmosphere', 'Bricht aus und schwebt durch die äußere Atmosphäre der Geisterwelt', 'Sale y flota por la atmósfera exterior del mundo espiritual'] },
        { id: 'bubbles', lv: 5, xp: 1500, n: ['Spirit bubbles', 'Geisterblasen', 'Burbujas espirituales'], d: ['Goes inside the spirit world\u2019s bubbles', 'Geht in die Blasen der Geisterwelt hinein', 'Entra en las burbujas del mundo espiritual'] },
        { id: 'streams', lv: 6, xp: 3000, n: ['Streams', 'Strömungen', 'Corrientes'], d: ['Rides the streams from bubble to bubble on her own', 'Lässt sich allein von Blase zu Blase treiben', 'Viaja sola por las corrientes de burbuja en burbuja'] }
    ];
    const ALL = TIERS.length - 1;
    /* the highest tier unlocked at level lv (1-based) */
    function tierOf(lv) { lv = Math.max(1, Math.floor(+lv || 1)); let t = 0; TIERS.forEach((x, i) => { if (lv >= x.lv) t = i; }); return t; }
    /* what a tier index allows */
    function capsOf(t) { t = Math.max(0, Math.min(ALL, t | 0)); return { tier: t, id: TIERS[t].id, cells: t >= 1, atmos: t >= 2, bubbles: t >= 3, streams: t >= 4 }; }
    /* which choice is flying her: 'auto' (autopilot, never gated) or 'trip' (the timed adventure, gated by level lv) */
    function capsFor(kind, lv) { return capsOf(kind === 'auto' ? ALL : tierOf(lv)); }
    /* the unlock list for the Misty card: status 'on' (unlocked) or 'locked' with the level still needed */
    function list(lv) { const t = tierOf(lv); return TIERS.map((x, i) => ({ id: x.id, lv: x.lv, xp: x.xp, n: x.n, d: x.d, status: i <= t ? 'on' : 'locked' })); }
    const core = { TIERS, ALL, tierOf, capsOf, capsFor, list };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!D || W.LowiAdventureTiers) return;

    /* ---------- browser ---------- */
    function xp() { try { const c = W.LowiHerbTamagotchi && W.LowiHerbTamagotchi.current && W.LowiHerbTamagotchi.current(); return c && c.m ? +c.m.xp || 0 : 0; } catch (e) { return 0; } }
    function level() { try { const C = W.LowiWorldHomeCore; return C && C.stage ? C.stage(xp()).index + 1 : 1; } catch (e) { return 1; } }
    const lang = () => { let l = 'de'; try { l = ((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || D.documentElement.lang || 'de').slice(0, 2); } catch (e) { } return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const T = (en, de, es) => [en, de, es][lang()] || en;
    /* the choice flying her right now */
    function kind() { try { if (W.LowiAdventure && W.LowiAdventure.on) return 'auto'; const v = W.LowiSun && W.LowiSun.live && W.LowiSun.live(); if (v && v.away) return 'trip'; } catch (e) { } return ''; }
    function caps(k) { return capsFor(k || kind() || 'trip', level()); }
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    /* the Misty card's "Adventure unlocks" section: what her timed adventure reaches at her level, and that autopilot is never gated */
    function html() {
        const lv = level(), L = lang(), items = list(lv);
        return '<section class="mh-card mh-adv" aria-label="' + esc(T('Adventure unlocks', 'Abenteuer-Freischaltungen', 'Desbloqueos de aventura')) + '">' +
            '<h3>' + esc(T('Adventure unlocks', 'Abenteuer-Freischaltungen', 'Desbloqueos de aventura')) + '</h3>' +
            '<p class="mh-adv-sub">' + esc(T('How far she explores on her own timed adventure. Autopilot (three taps on the controller) always goes everywhere.', 'Wie weit sie auf ihrem eigenen Abenteuer mit Timer kommt. Der Autopilot (dreimal auf den Controller tippen) fliegt immer überall hin.', 'Hasta dónde explora en su aventura con temporizador. El piloto automático (tres toques en el control) siempre va a todas partes.')) + '</p>' +
            '<ul class="mh-adv-list">' + items.map(x => '<li data-st="' + x.status + '"><b>' + esc(x.n[L] || x.n[0]) + '</b><span>' + esc(x.d[L] || x.d[0]) + '</span><em>' +
                esc(x.status === 'on' ? T('Unlocked', 'Freigeschaltet', 'Desbloqueado') : T('Level ', 'Level ', 'Nivel ') + x.lv) + '</em></li>').join('') + '</ul></section>';
    }
    /* one line for the trip chip: "Level 4 · out to the spirit world sky" */
    function line() { const c = caps('trip'), t = TIERS[c.tier], L = lang(); return T('Level ', 'Level ', 'Nivel ') + level() + ' \u00b7 ' + (t.n[L] || t.n[0]); }
    if (D.head && !D.getElementById('advTierCss')) {
        const st = D.createElement('style'); st.id = 'advTierCss';
        st.textContent = '.mh-adv h3{margin:0 0 4px;font-size:15px}.mh-adv-sub{margin:0 0 10px;font-size:13px;opacity:.75}.mh-adv-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}' +
            '.mh-adv-list li{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center}.mh-adv-list li span{grid-column:1;font-size:12px;opacity:.72}.mh-adv-list li em{grid-row:1/span 2;grid-column:2;font-style:normal;font-size:12px;padding:3px 8px;border-radius:99px;background:rgba(110,231,200,.18)}' +
            '.mh-adv-list li[data-st="locked"]{opacity:.5}.mh-adv-list li[data-st="locked"] em{background:rgba(255,255,255,.08)}';
        D.head.appendChild(st);
    }
    W.LowiAdventureTiers = { core, level, kind, caps, html, line };
})();
