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
        en: ['I’m so proud of you!', 'That made my bubble glow.', 'You and me, we’re on a roll.', 'I felt that one right in my core!', 'Look at us grow!', 'Another sunbeam for me, thank you!', 'You take such good care of us.', 'My bubble is wobbling with joy.', 'Tiny step, big glow.', 'I knew you’d do it.', 'Stars are jealous of us today.', 'That’s my human!'],
        de: ['Ich bin so stolz auf dich!', 'Davon glüht meine Blase.', 'Wir zwei sind gerade richtig gut drauf.', 'Das spür ich bis in meinen Kern!', 'Schau, wie wir wachsen!', 'Noch ein Sonnenstrahl für mich, danke!', 'Du kümmerst dich so gut um uns.', 'Meine Blase wackelt vor Freude.', 'Kleiner Schritt, großes Leuchten.', 'Ich wusste, dass du das schaffst.', 'Die Sterne sind heute neidisch auf uns.', 'Das ist mein Mensch!'],
        es: ['¡Qué orgullo me das!', 'Eso hizo brillar mi burbuja.', 'Tú y yo vamos con todo.', '¡Eso lo sentí hasta en mi núcleo!', '¡Mira cómo crecemos!', 'Otro rayito de sol para mí, ¡gracias!', 'Nos cuidas muy bien.', 'Mi burbuja tiembla de alegría.', 'Paso pequeño, brillo grande.', 'Sabía que lo lograrías.', 'Hoy las estrellas nos envidian.', '¡Ese es mi humano!']
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
    /* the speech bubble's spot next to Misty (a: {x, top, bottom}): above her unless that covers the Daily Quest or leaves the
       screen; kept on screen sideways, the tail (px from the bubble's left) always points back at her */
    function place(a, b, quest, view, gap) {
        gap = gap || 14;
        const m = 10, l = Math.max(m, Math.min(view.w - m - b.w, a.x - b.w / 2));
        const upT = a.top - gap - b.h, downT = a.bottom + gap;
        const hits = t => !!quest && t < quest.bottom && t + b.h > quest.top && l < quest.right && l + b.w > quest.left;
        let up = upT >= (view.top || 8) && !hits(upT);
        if (!up && (hits(downT) || downT + b.h > view.h - 8) && upT >= (view.top || 8)) up = true; /* below is worse: stay above */
        return { l, t: up ? upT : downT, up, tail: Math.max(18, Math.min(b.w - 18, a.x - l)) };
    }
    const core = { POOL, FIRST, TYPES, SHOW_MS, pick, isFirst, place };
    if (!D) {
        if (typeof module !== 'undefined' && module.exports) module.exports = core;
        return;
    }
    const lang = () => { let l = 'de'; try { l = (W.LowiLang.get() || 'de').slice(0, 2); } catch (e) { l = ((D.documentElement.lang) || 'de').slice(0, 2); } return POOL[l] ? l : 'en'; };
    let lastIdx = -1;
    try { lastIdx = +localStorage.getItem('lowi.praise.last'); if (!Number.isFinite(lastIdx)) lastIdx = -1; } catch (e) {}
    let el = null, timer = 0;
    function visRect(q) {
        const r = q && q.getBoundingClientRect();
        if (!r || r.height < 4 || r.width < 4 || r.bottom <= 0 || r.top >= W.innerHeight) return null;
        const cs = getComputedStyle(q); if (cs.visibility === 'hidden' || cs.display === 'none') return null;
        if (q.checkVisibility && !q.checkVisibility({ opacityProperty: true })) return null;
        return r;
    }
    function safeTop() { try { return parseFloat(getComputedStyle(D.documentElement).getPropertyValue('--sat')) || 0; } catch (e) { return 0; } }
    /* where Misty is on screen: flying inside a world, else her bubble on Today; null when she is not visible */
    function mistyAt(vw, vh) {
        try { const MF = W.LowiMistyFlight, m = MF && MF.screen ? MF.screen() : null; if (m && m.x > 0 && m.x < vw && m.y > 0 && m.y < vh) return { x: m.x, top: m.y - 40, bottom: m.y + 40 }; } catch (e) { }
        const b = D.getElementById('spBubble'), r = visRect(b && (b.querySelector('.tmg-plant') || b));
        return r ? { x: r.left + r.width / 2, top: r.top, bottom: r.bottom } : null;
    }
    show.mistyAt = mistyAt;
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
        /* cell-guide (Oct 17, E-man: "that bubble is not even a speech bubble that comes out of her ... covering the Daily Quest"):
           it is Misty talking, so it is a speech bubble coming out of Misty: above her (below when that would cover the Daily Quest
           or leave the screen), with a tail pointing at her. Only when she is nowhere on screen does it fall back to top centre,
           and even then never on the Daily Quest. */
        el.style.top = ''; el.style.left = ''; el.classList.remove('lp-said', 'lp-up', 'lp-down');
        try {
            const vw = W.innerWidth, vh = W.innerHeight, quest = visRect(D.getElementById('f3Board'));
            const a = mistyAt(vw, vh);
            if (a) {
                el.classList.add('lp-said');
                const w = el.offsetWidth, h = el.offsetHeight, gap = 14;
                const p = place(a, { w, h }, quest, { w: vw, h: vh, top: 8 + safeTop() }, gap);
                el.style.left = Math.round(p.l) + 'px'; el.style.top = Math.round(p.t) + 'px';
                el.style.setProperty('--tail', Math.round(p.tail) + 'px'); el.classList.add(p.up ? 'lp-up' : 'lp-down');
            } else if (quest) {
                const t = el.getBoundingClientRect(); if (t.bottom > quest.top && t.top < quest.bottom) el.style.top = Math.round(quest.bottom + 8) + 'px';
            }
        } catch (e) { }
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
