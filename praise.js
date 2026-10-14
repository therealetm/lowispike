/* LOWiSPIKE praise pool (Oct 15, 2026): after every action the XP ledger counted, the herb says one short line in
   first person. 12 lines each in de/en/es, never the same line twice in a row. A "First time!" tag shows only on the
   first-ever action of each type (meal, scan, water, move, fasting, macro goal), read from the whole ledger and kept
   in S.praise.first. The toast lives 1.7 s and never takes taps (pointer-events:none). Pure parts are tested in
   tests/praise.test.cjs. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;
    if (W.LowiPraise) return;
    const SHOW_MS = 1700;
    const POOL = {
        en: ['I’m so proud of you!', 'That made my leaves glow.', 'You and me, we’re on a roll.', 'I felt that one in my roots!', 'Look at us grow!', 'Another sunbeam for me, thank you!', 'You take such good care of us.', 'My leaves are dancing right now.', 'Tiny step, big glow.', 'I knew you’d do it.', 'Stars are jealous of us today.', 'That’s my human!'],
        de: ['Ich bin so stolz auf dich!', 'Davon glühen meine Blätter.', 'Wir zwei sind gerade richtig gut drauf.', 'Das spür ich bis in die Wurzeln!', 'Schau, wie wir wachsen!', 'Noch ein Sonnenstrahl für mich, danke!', 'Du kümmerst dich so gut um uns.', 'Meine Blätter tanzen gerade.', 'Kleiner Schritt, großes Leuchten.', 'Ich wusste, dass du das schaffst.', 'Die Sterne sind heute neidisch auf uns.', 'Das ist mein Mensch!'],
        es: ['¡Qué orgullo me das!', 'Eso hizo brillar mis hojas.', 'Tú y yo vamos con todo.', '¡Eso lo sentí hasta en las raíces!', '¡Mira cómo crecemos!', 'Otro rayito de sol para mí, ¡gracias!', 'Nos cuidas muy bien.', 'Mis hojas están bailando.', 'Paso pequeño, brillo grande.', 'Sabía que lo lograrías.', 'Hoy las estrellas nos envidian.', '¡Ese es mi humano!']
    };
    const FIRST = { en: 'First time!', de: 'Zum ersten Mal!', es: '¡Primera vez!' };
    const TYPES = ['meal', 'scan', 'water', 'move', 'fast', 'macro'];
    /* next line index: random, but never the one shown last */
    function pick(n, lastIdx, rnd) {
        rnd = typeof rnd === 'function' ? rnd : Math.random;
        if (n <= 1) return 0;
        let i = Math.floor(rnd() * (n - 1));
        if (lastIdx >= 0 && lastIdx < n && i >= lastIdx) i++;
        return Math.min(n - 1, Math.max(0, i));
    }
    /* first-ever action of this type: no earlier counted ledger entry of the type and not recorded before */
    function isFirst(type, entry, ledger, seen, classify) {
        if (TYPES.indexOf(type) < 0) return false;
        if (seen && seen[type]) return false;
        return !(ledger || []).some(e => e && e !== entry && +e.amt > 0 && classify(e) === type);
    }
    const core = { POOL, FIRST, TYPES, SHOW_MS, pick, isFirst };
    if (!D) {
        if (typeof module !== 'undefined' && module.exports) module.exports = core;
        return;
    }
    const lang = () => { let l = 'de'; try { l = (W.LowiLang.get() || 'de').slice(0, 2); } catch (e) { l = ((D.documentElement.lang) || 'de').slice(0, 2); } return POOL[l] ? l : 'en'; };
    let lastIdx = -1;
    try { lastIdx = +localStorage.getItem('lowi.praise.last'); if (!Number.isFinite(lastIdx)) lastIdx = -1; } catch (e) {}
    let el = null, timer = 0;
    function show(text, tag) {
        if (!el || !el.isConnected) {
            el = D.createElement('div');
            el.id = 'lpPraise';
            el.className = 'lp-praise';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            D.body.appendChild(el);
        }
        el.innerHTML = '<i class="lp-dot" aria-hidden="true"></i><span class="lp-tx"></span>' + (tag ? '<b class="lp-tag"></b>' : '');
        el.querySelector('.lp-tx').textContent = text;
        if (tag) el.querySelector('.lp-tag').textContent = tag;
        el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
        clearTimeout(timer);
        timer = setTimeout(() => { if (el) el.classList.remove('on'); }, SHOW_MS);
    }
    function praise(type, first) {
        const pool = POOL[lang()], i = pick(pool.length, lastIdx);
        lastIdx = i;
        try { localStorage.setItem('lowi.praise.last', String(i)); } catch (e) {}
        show(pool[i], first ? FIRST[lang()] : '');
        return { i, first: !!first };
    }
    W.addEventListener('lowi:reward', e => {
        try {
            const entry = e.detail && e.detail.entry;
            if (!entry || !(+entry.amt > 0)) return;
            const C = W.LowiSun;
            const type = C ? C.classify(entry) : 'other';
            if (type === 'sun' || type === 'quest') return;
            const S = W.LowiVitalsBridge ? LowiVitalsBridge.state() : {};
            S.praise = S.praise || {};
            S.praise.first = S.praise.first || {};
            const first = C ? isFirst(type, entry, S.ledger, S.praise.first, C.classify) : false;
            if (TYPES.indexOf(type) >= 0 && !S.praise.first[type]) { S.praise.first[type] = entry.ts || Date.now(); try { LowiVitalsBridge.save(); } catch (x) {} }
            setTimeout(() => praise(type, first), 250);
        } catch (x) {}
    });
    W.LowiPraise = Object.assign({}, core, { praise, say: t => show(t, '') });
    if (typeof module !== 'undefined' && module.exports) module.exports = W.LowiPraise;
})();
