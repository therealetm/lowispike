/* LOWiSPIKE · adventure tiers (Oct 17, 2026, E-man): "the exploration that it's doing is not the same as autopilot; autopilot is
   actually a way better exploration". Two separate choices now share one flight engine (misty-flight.js + misty-explore.js):
   - ADVENTURE: her timed trip (sun-meter.js, LowiSun away, about an hour). How far she roams is gated by her level
     (world-home-core.js STAGES, the same Level 1-6 the Misty card shows):
       Level 1-2  her home world only (she visits each place's door, never goes in)
       Level 3    + every cell world (she flies into them, like autopilot)
       Level 4    + the galaxy (she breaks out of her world and drifts round it)
       Level 5    + into the other worlds out there
       Level 6    + riding the streams between bubbles by herself
     Oct 19: each place also needs YOUR own visit first (steering or a tap, not autopilot / her trip). Your own flying is
     never gated, so nothing locks a first visit.
   - AUTOPILOT: three quick taps on the controller (adventure.js). Never gated: everything above, at any level.
   Pure helpers are tested in tests/adventure-tiers.test.cjs. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;
    /* lv: the first level that unlocks the tier; xp mirrors world-home-core.js STAGES (tested in step).
       Oct 19 (E-man): never the word "spirit" anywhere the user reads ("we have scientists and doctors and schools ... using this
       app"). The space outside her world is the galaxy (the Community room says "In the galaxy" too), the bubbles out there are
       other worlds. */
    const TIERS = [
        { id: 'local', lv: 1, xp: 0, n: ['Home world', 'Heimatwelt', 'Mundo de casa'], d: ['Roams your own world and visits each place\u2019s door', 'Streift durch deine eigene Welt und besucht jede Tür', 'Recorre tu propio mundo y visita cada puerta'] },
        { id: 'cells', lv: 3, xp: 300, n: ['Cell worlds', 'Zellwelten', 'Mundos celulares'], d: ['Flies into the cell worlds inside your world', 'Fliegt in die Zellwelten in deiner Welt', 'Entra en los mundos celulares de tu mundo'] },
        { id: 'atmos', lv: 4, xp: 700, n: ['Galaxy', 'Galaxie', 'Galaxia'], d: ['Breaks out of your world and drifts through the galaxy around it', 'Bricht aus deiner Welt aus und schwebt durch die Galaxie drumherum', 'Sale de tu mundo y flota por la galaxia que lo rodea'] },
        { id: 'bubbles', lv: 5, xp: 1500, n: ['Other worlds', 'Andere Welten', 'Otros mundos'], d: ['Goes inside the other worlds in the galaxy', 'Fliegt in die anderen Welten der Galaxie', 'Entra en los otros mundos de la galaxia'] },
        { id: 'streams', lv: 6, xp: 3000, n: ['Streams', 'Strömungen', 'Corrientes'], d: ['Rides the streams from world to world, no steering needed', 'Lässt sich ohne Steuern von Welt zu Welt treiben', 'Viaja por las corrientes de mundo en mundo, sin que tengas que guiar'] }
    ];
    const ALL = TIERS.length - 1;
    /* Oct 19 (E-man): "These should only be unlocked if the person went there themselves ... and also depending on ... at what
       level their companion is." seen = { cells, atmos, bubbles, streams: first time YOU went there (ms) }. Being inside another
       world or on a stream means you were out in the galaxy, so those imply 'atmos'. No seen object = level only (old callers). */
    const IMPLIES = { atmos: ['bubbles', 'streams'] };
    function been(seen, id) { if (!seen) return true; if (seen[id]) return true; return (IMPLIES[id] || []).some(k => !!seen[k]); }
    /* the highest tier her timed adventure may reach: every tier up to it needs her level AND your own visit */
    function tierOf(lv, seen) { lv = Math.max(1, Math.floor(+lv || 1)); let t = 0; for (let i = 1; i <= ALL; i++) { if (lv >= TIERS[i].lv && been(seen, TIERS[i].id)) t = i; else break; } return t; }
    /* what a tier index allows */
    function capsOf(t) { t = Math.max(0, Math.min(ALL, t | 0)); return { tier: t, id: TIERS[t].id, cells: t >= 1, atmos: t >= 2, bubbles: t >= 3, streams: t >= 4 }; }
    /* which choice is flying her: 'auto' (autopilot, never gated) or 'trip' (the timed adventure: her level and your visits) */
    function capsFor(kind, lv, seen) { return capsOf(kind === 'auto' ? ALL : tierOf(lv, seen)); }
    /* the unlock list for the companion card. status 'on' or 'locked'; need = what is still missing (level, your visit, or
       the place before it); been = you have been there yourself (shown apart from the unlock, so it is never lost) */
    function list(lv, seen) {
        lv = Math.max(1, Math.floor(+lv || 1)); const t = tierOf(lv, seen);
        return TIERS.map((x, i) => {
            const b = i === 0 || been(seen, x.id), lvOk = lv >= x.lv;
            return { id: x.id, lv: x.lv, xp: x.xp, n: x.n, d: x.d, status: i <= t ? 'on' : 'locked', been: b, need: i <= t ? null : { level: !lvOk, visit: !b, before: lvOk && b } };
        });
    }
    /* who is flying when a place is reached: only your own flying ('' = no autopilot, no timed trip) counts as your visit */
    function mark(seen, id, kind, now) {
        seen = Object.assign({}, seen || {});
        if (kind || !TIERS.some((x, i) => i > 0 && x.id === id) || seen[id]) return { seen, added: false };
        seen[id] = +now || Date.now(); return { seen, added: true };
    }
    /* existing progress: a first arrival in a body region was already recorded in the ledger (xp-tap.js, eventId with region-) */
    function seedFromLedger(seen, ledger) {
        seen = Object.assign({}, seen || {});
        if (!seen.cells) { const e = (ledger || []).find(x => x && /(^|[:_-])region-/.test(String(x.eventId || '') + ' ' + String(x.src || ''))); if (e) seen.cells = +e.ts || 1; }
        return seen;
    }
    const core = { TIERS, ALL, tierOf, capsOf, capsFor, list, been, mark, seedFromLedger };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!D || W.LowiAdventureTiers) return;

    /* ---------- browser ---------- */
    function xp() { try { const c = W.LowiHerbTamagotchi && W.LowiHerbTamagotchi.current && W.LowiHerbTamagotchi.current(); return c && c.m ? +c.m.xp || 0 : 0; } catch (e) { return 0; } }
    function level() { try { const C = W.LowiWorldHomeCore; return C && C.stage ? C.stage(xp(), true).index + 1 : 1; } catch (e) { return 1; } }
    const lang = () => { let l = 'de'; try { l = ((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || D.documentElement.lang || 'de').slice(0, 2); } catch (e) { } return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const T = (en, de, es) => [en, de, es][lang()] || en;
    /* the choice flying her right now */
    function kind() { try { if (W.LowiAdventure && W.LowiAdventure.on) return 'auto'; const v = W.LowiSun && W.LowiSun.live && W.LowiSun.live(); if (v && v.away) return 'trip'; } catch (e) { } return ''; }
    /* your own visits: account data (S.advSeen, saved with the rest) with a device copy, seeded from the ledger once */
    const SEEN_KEY = 'lowi.adv.seen';
    function S() { try { return W.LowiVitalsBridge && W.LowiVitalsBridge.state ? W.LowiVitalsBridge.state() : null; } catch (e) { return null; } }
    function seen() {
        let dev = {}; try { dev = (o => o && typeof o === "object" ? o : {})(JSON.parse(localStorage.getItem(SEEN_KEY))); } catch (e) { }
        const s = S(), acc = (s && s.advSeen && typeof s.advSeen === 'object') ? s.advSeen : {};
        const out = {}; [dev, acc].forEach(o => Object.keys(o).forEach(k => { const v = +o[k] || 0; if (v && (!out[k] || v < out[k])) out[k] = v; }));
        return seedFromLedger(out, s && (s.ledger || s.xpLog));
    }
    function visit(id) {
        const r = mark(seen(), id, kind()); if (!r.added) return false;
        try { localStorage.setItem(SEEN_KEY, JSON.stringify(r.seen)); } catch (e) { }
        try { const s = S(); if (s) { s.advSeen = r.seen; W.LowiVitalsBridge.save && W.LowiVitalsBridge.save(); } } catch (e) { }
        try { W.dispatchEvent(new CustomEvent('lowi:adv-seen', { detail: { id } })); } catch (e) { }
        return true;
    }
    if (W.addEventListener) {
        W.addEventListener('lowi:world-region', e => { const id = e && e.detail && e.detail.id; if (id && id !== 'hub') visit('cells'); });
        W.addEventListener('lowi:galaxy', e => { if (e && e.detail && e.detail.on) visit('atmos'); });
        W.addEventListener('lowi:galaxy-bubble', e => { if (e && e.detail && e.detail.in) visit('bubbles'); });
        W.addEventListener('lowi:galaxy-stream', () => visit('streams'));
    }
    function caps(k) { return capsFor(k || kind() || 'trip', level(), seen()); }
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    /* the companion card's "Adventure unlocks" section: where her timed adventure may go, what each place still needs, and
       whether you have been there yourself; autopilot is never gated */
    function needText(x, items, i) {
        const n = x.need; if (!n) return T('Unlocked', 'Freigeschaltet', 'Desbloqueado');
        const lvT = T('Level ', 'Level ', 'Nivel ') + x.lv;
        if (n.level && n.visit) return T(lvT + ' + go there', lvT + ' + selbst hin', lvT + ' + ve t\u00fa');
        if (n.level) return lvT;
        if (n.visit) return T('Go there yourself', 'Flieg selbst hin', 'Ve t\u00fa primero');
        const L = lang(), p = items[i - 1]; return T('After ', 'Nach ', 'Despu\u00e9s de ') + (p ? (p.n[L] || p.n[0]) : '');
    }
    function html() {
        const lv = level(), L = lang(), items = list(lv, seen());
        return '<section class="mh-card mh-adv" aria-label="' + esc(T('Adventure unlocks', 'Abenteuer-Freischaltungen', 'Desbloqueos de aventura')) + '">' +
            '<h3>' + esc(T('Adventure unlocks', 'Abenteuer-Freischaltungen', 'Desbloqueos de aventura')) + '</h3>' +
            '<p class="mh-adv-sub">' + esc(T('Where the timed adventure may go without you. A place opens once you have flown there yourself and the level is reached. Autopilot (three taps on the controller) always goes everywhere.', 'Wohin das Abenteuer mit Timer ohne dich darf. Ein Ort öffnet sich, sobald du selbst einmal dort warst und das Level erreicht ist. Der Autopilot (dreimal auf den Controller tippen) fliegt immer überall hin.', 'Adónde puede llegar la aventura con temporizador sin ti. Un lugar se abre cuando ya has volado allí y se alcanza su nivel. El piloto automático (tres toques en el control) siempre va a todas partes.')) + '</p>' +
            '<ul class="mh-adv-list">' + items.map((x, i) => '<li data-st="' + x.status + '" data-been="' + (x.been ? 1 : 0) + '"><b>' + esc(x.n[L] || x.n[0]) + '</b><span>' + esc(x.d[L] || x.d[0]) +
                (i > 0 ? ' \u00b7 ' + esc(x.been ? T('You have been there', 'Du warst schon dort', 'Ya has estado') : T('Not visited yet', 'Noch nicht besucht', 'A\u00fan sin visitar')) : '') + '</span><em>' +
                esc(needText(x, items, i)) + '</em></li>').join('') + '</ul></section>';
    }
    /* one line for the trip chip: "Level 4 · Galaxy" */
    function line() { const c = caps('trip'), t = TIERS[c.tier], L = lang(); return T('Level ', 'Level ', 'Nivel ') + level() + ' \u00b7 ' + (t.n[L] || t.n[0]); }
    if (D.head && !D.getElementById('advTierCss')) {
        const st = D.createElement('style'); st.id = 'advTierCss';
        st.textContent = '.mh-adv h3{margin:0 0 4px;font-size:15px}.mh-adv-sub{margin:0 0 10px;font-size:13px;opacity:.75}.mh-adv-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}' +
            '.mh-adv-list li{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center}.mh-adv-list li span{grid-column:1;font-size:12px;opacity:.72}.mh-adv-list li em{grid-row:1/span 2;grid-column:2;font-style:normal;font-size:12px;padding:3px 8px;border-radius:99px;background:rgba(110,231,200,.18)}' +
            '.mh-adv-list li[data-st="locked"]{opacity:.5}.mh-adv-list li[data-st="locked"] em{background:rgba(255,255,255,.08)}';
        D.head.appendChild(st);
    }
    W.LowiAdventureTiers = { core, level, kind, caps, html, line, seen, visit };
})();
