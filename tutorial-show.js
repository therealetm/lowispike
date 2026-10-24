/* tutorial-show.js: the tutorial SHOWS what a card talks about instead of only saying it (item 42, Oct 22 2026, Emmanuel, with a photo of
   the text-heavy 'bubbles' card on an iPhone: "Show everything visually. So ppl don't just read boringly. If you can't take them to the
   page.").
   Two ways, chosen per card in SHOW below (docs/tutorial-visual-map.md lists every card and its plan):
   - ON THE PAGE: the card's real control is already spotlit by tutorial.js (.lt-hole). This adds a small animated finger on it that does
     the gesture (tap, hold, drag, triple, pinch, swipe), and `spots`: glowing rings that light up several real controls one after
     another (the bubbles card). The card moves out of the way of the spots.
   - ON THE CARD: when the thing it explains opens a sheet, needs data, the camera or Plus, the card carries a small brand-style
     look-alike of that screen (`vis`), like the Scan peek. Pictures only: nothing is opened, nothing is saved, no camera / mic /
     notification prompt, no touch is taken (pointer-events: none on all of it; the one tap it listens to is on a card text it shortened, to open it again), so hands-free auto-advance and try-it work as before.
   On a short phone, when a card would cover its spotlit control: the picture gets compact, then the card text shows three lines (tap
   to read all; the voice always reads all of it), and only then does the picture leave the card.
   Steps with item 38's practice pad (.lt-pad), its after-the-tour hand (.lt-later) or a Scan peek get no card picture (one picture
   per card), and practice steps get no finger on the page (the pad is the thing to touch).
   Hooked from tutorial.js: LowiTutorialShow.render(card, step, root) after each render, LowiTutorialShow.place(root, el, step) after
   each place (every tick). Reduce Motion: still pictures, no moving finger. */
(function (root) {
    'use strict';
    const W = typeof window !== 'undefined' ? window : null, D = W && W.document;
    const MISTY = ['[data-home-misty]', '#spBubble'];
    const RING = ['#spFast', '#whHud .wh-meals', '#whHud .wh-water', '#whHud .wh-move', '#whHud .o8-sleep', '#whHud .o8-scan', '#whHud .o8-settings', '#whPad'];
    /* g: the finger's gesture on the spotlit control; spots: real controls lit one by one; vis: the look-alike on the card */
    const SHOW = {
        hello: { glow: 1 },
        touch: { g: 'tap' },
        'misty-hold': { g: 'hold' },
        'misty-turn': { g: 'drag' },
        mirror: { g: 'hold', vis: 'mirror' },  /* Oct 23: Mirror left the Move bloom; hold Move opens the Move page, Mirror is its first card */
        energy: { vis: 'energy' },
        mood: { vis: 'mood' },
        'energy-peak': { vis: 'peak' },
        bubbles: { spots: RING, g: 'tap', vis: 'ring' },
        gap: { vis: 'gap' },
        'ring-still': { g: 'hold', vis: 'still' },
        'gap-tap': { g: 'tap', vis: 'planets' },
        fuel: { g: 'tap', vis: 'fuel' },
        'fuel-hold': { g: 'hold', vis: 'logmeal' },
        'log-meal': { vis: 'logmeal' },
        water: { g: 'tap', vis: 'water' },
        'water-hold': { g: 'hold', vis: 'water0' },
        move: { g: 'tap', vis: 'move' },
        'move-hold': { g: 'hold', vis: 'movepage' },
        sleep: { g: 'tap', vis: 'sleep' }
    };
    /* the few words on the pictures, EN / DE / ES (the same words the cards and the app use) */
    const L = {
        en: { energy: 'Energy', mood: ['Calm', 'Happy', 'Tired'], full: 'Full!', gap: 'since your last meal', noMeal: 'no meal yet', meals: 'meals', log: 'Log meal', shop: 'Shop', cook: 'Cook',
            photo: 'Photo', type: 'chicken stew', recent: 'Recent', cup: 'Glass', sips: 'Sips', bottle: 'Bottle', undo: 'Undo', cups: 'glasses', moves: ['Casual', 'Steady', 'Epic'], mirror: 'Mirror', workouts: 'Workouts', care: 'Care board', today: 'Today', edit: 'Edit',
            sleep: ['Slept well', 'Okay', 'Short night'], still: 'stops', fuel: 'Fuel', water: 'Water', move: 'Move', sleepW: 'Sleep', gapW: 'Gap', scan: 'Scan', set: 'Settings', joy: 'Play', reset: 'last one off' },
        de: { energy: 'Energie', mood: ['Ruhig', 'Froh', 'Müde'], full: 'Voll!', gap: 'seit der letzten Mahlzeit', noMeal: 'noch kein Essen', meals: 'Mahlzeiten', log: 'Mahlzeit eintragen', shop: 'Einkaufen', cook: 'Kochen',
            photo: 'Foto', type: 'Hühnereintopf', recent: 'Letzte', cup: 'Glas', sips: 'Sips', bottle: 'Flasche', undo: 'Rückgängig', cups: 'Gläser', moves: ['Locker', 'Stetig', 'Episch'], mirror: 'Spiegel', workouts: 'Workouts', care: 'Care-Board', today: 'Heute', edit: 'Bearbeiten',
            sleep: ['Gut', 'Okay', 'Kurz'], still: 'stoppt', fuel: 'Essen', water: 'Wasser', move: 'Bewegung', sleepW: 'Schlaf', gapW: 'Gap', scan: 'Scannen', set: 'Einstellungen', joy: 'Spielen', reset: 'letzte weg' },
        es: { energy: 'Energía', mood: ['Calma', 'Feliz', 'Cansada'], full: '¡Llena!', gap: 'desde tu última comida', noMeal: 'sin comida aún', meals: 'comidas', log: 'Registrar comida', shop: 'Comprar', cook: 'Cocinar',
            photo: 'Foto', type: 'guiso de pollo', recent: 'Recientes', cup: 'Vaso', sips: 'Sorbos', bottle: 'Botella', undo: 'Deshacer', cups: 'vasos', moves: ['Tranquilo', 'Constante', 'Épico'], mirror: 'Espejo', workouts: 'Entrenos', care: 'Care board', today: 'Hoy', edit: 'Editar',
            sleep: ['Bien', 'Regular', 'Corta'], still: 'se para', fuel: 'Comida', water: 'Agua', move: 'Movimiento', sleepW: 'Sueño', gapW: 'Gap', scan: 'Escanear', set: 'Ajustes', joy: 'Jugar', reset: 'quita la última' }
    };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lang = () => { let l = 'en'; try { l = (W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || D.documentElement.lang || 'en'; } catch (e) { } l = String(l).slice(0, 2); return L[l] ? l : 'en'; };
    const b = (cls, inner) => '<span class="' + cls + '">' + (inner || '') + '</span>';

    /* the look-alikes: plain spans and CSS (tutorial-show.css), about 56 px tall, brand glass, aria-hidden */
    function visHtml(kind, l) {
        const T = L[l] || L.en;
        switch (kind) {
            case 'energy': return b('lts-meter', b('lts-fill f62')) + b('lts-cap', esc(T.energy) + ' 62%');
            case 'peak': return b('lts-meter', b('lts-fill lts-grow')) + b('lts-cap lts-pop', esc(T.full));
            case 'mood': return b('lts-row', T.mood.map((m, k) => b('lts-chip' + (k === 1 ? ' on' : ''), b('lts-face m' + k) + esc(m))).join(''));
            case 'ring': return b('lts-ring', [T.gapW, T.fuel, T.water, T.move, T.sleepW, T.scan].map((m, k) => b('lts-rb r' + k, esc(m))).join('') + b('lts-core'));
            case 'still': return b('lts-ring lts-orbit', [0, 1, 2, 3, 4, 5].map(k => b('lts-rb r' + k)).join('') + b('lts-core')) + b('lts-cap', '\u270b ' + esc(T.still));
            case 'gap': return b('lts-big', '4h 12m') + b('lts-cap', esc(T.gap));
            case 'planets': return b('lts-row lts-planets', [0, 1, 2, 3, 4, 5].map(k => b('lts-pl p' + k + (k < 3 ? ' on' : ''))).join('')) + b('lts-cap', '4h 12m \u00b7 ' + esc(T.gap));
            case 'fuel': return b('lts-cap lts-top', '1/3 ' + esc(T.meals)) + b('lts-row', [T.log, T.shop, T.cook].map((m, k) => b('lts-pill' + (k === 0 ? ' on' : ''), esc(m))).join(''));
            case 'logmeal': return b('lts-cap lts-top', esc(T.log)) + b('lts-row', b('lts-pill', '\ud83d\udcf7 ' + esc(T.photo)) + b('lts-field', b('lts-typed', esc(T.type))) + b('lts-pill', esc(T.recent)));
            case 'water': return b('lts-row lts-cups', [0, 1, 2, 3, 4].map(k => b('lts-cup' + (k < 2 ? ' on' : '') + (k === 2 ? ' lts-fillin' : ''))).join('')) + b('lts-row', b('lts-pill', esc(T.sips)) + b('lts-pill on', esc(T.cup)) + b('lts-pill', esc(T.bottle))); /* wsip Oct 23 */
            case 'water0': return b('lts-row lts-cups', [0, 1, 2, 3, 4].map(k => b('lts-cup' + (k < 2 ? ' on' : '') + (k === 2 ? ' lts-fillin' : ''))).join('')) + b('lts-cap', '\u21ba ' + esc(T.reset));
            case 'move': return b('lts-row', T.moves.map((m, k) => b('lts-pill' + (k === 1 ? ' on' : ''), esc(m))).join(''));
            /* Oct 22 2026: Mirror is the first bubble of the Move bloom */
            case 'mirror': return b('lts-cap lts-top', esc(T.move)) + b('lts-row', b('lts-pill on', '\ud83c\udfa5 ' + esc(T.mirror)) + b('lts-pill', esc(T.workouts)));
            case 'movepage': return b('lts-cap lts-top', esc(T.today) + ' \u00b7 ' + esc(T.edit)) + b('lts-row', b('lts-pill on', esc(T.workouts)) + b('lts-pill', esc(T.care)));
            case 'sleep': return b('lts-row', T.sleep.map((m, k) => b('lts-pill' + (k === 0 ? ' on' : ''), (k === 0 ? '\ud83c\udf19 ' : k === 1 ? '\u2601\ufe0f ' : '\u23f0 ') + esc(m))).join(''));
        }
        return '';
    }
    function plan(id) { return SHOW[id] || null; }

    /* ---------- browser part ---------- */
    const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const vis = el => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = W.getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
    const onScreen = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.right > 0 && r.top < W.innerHeight && r.left < W.innerWidth; };
    function layer(rootEl) {
        let f = rootEl.querySelector('.lts-layer');
        if (!f) { f = D.createElement('div'); f.className = 'lts-layer'; f.setAttribute('aria-hidden', 'true'); rootEl.insertBefore(f, rootEl.querySelector('.lt-card')); }
        return f;
    }
    function render(card, s, rootEl) {
        if (!card || !s || !rootEl) return;
        const p = plan(s.id), f = layer(rootEl);
        f.innerHTML = ''; f.removeAttribute('data-g'); rootEl.removeAttribute('data-show');
        if (!p) return;
        rootEl.setAttribute('data-show', s.id);
        const busy = card.querySelector('.lt-pad, .lt-later, .lt-peek');
        /* the picture of what opens, under the text (one picture per card) */
        if (p.vis && !busy) {
            const v = D.createElement('div'); v.className = 'lts-vis'; v.setAttribute('data-vis', p.vis); v.setAttribute('aria-hidden', 'true');
            v.innerHTML = visHtml(p.vis, lang());
            const t = card.querySelector('.lt-tryline') || card.querySelector('.lt-text');
            if (t) t.after(v); else card.appendChild(v);
        }
        /* the finger on the real control, and the lit-up spots */
        if (p.g && !s.practice) { f.setAttribute('data-g', p.g); f.insertAdjacentHTML('beforeend', '<span class="lts-hand"><span class="lts-tip"></span></span>'); }
        if (p.spots) p.spots.forEach((sel, k) => f.insertAdjacentHTML('beforeend', '<span class="lts-spot" data-k="' + k + '" style="--k:' + k + '"></span>'));
        rootEl.classList.toggle('lts-rm', reduced());
    }
    /* where the spotlight is going (its style), not where its slide is right now */
    const holeAt = h => { const l = parseFloat(h.style.left), t = parseFloat(h.style.top), w = parseFloat(h.style.width), ht = parseFloat(h.style.height);
        if (!(w > 0)) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; return { left: l, top: t, right: l + w, bottom: t + ht, width: w, height: ht }; };
    let spotAt = 0, spotT = 0;
    function place(rootEl, el, s) {
        if (!rootEl || !s) return;
        const p = plan(s.id), f = rootEl.querySelector('.lts-layer'); if (!p || !f) return;
        const hand = f.querySelector('.lts-hand'), card = rootEl.querySelector('.lt-card');
        /* spots: real controls light up one after another; the finger hops to the lit one */
        let box = null, lit = null;
        if (p.spots) {
            const els = p.spots.map(sel => { let e = null; try { e = D.querySelector(sel); } catch (x) { } return e && vis(e) && onScreen(e) ? e : null; });
            const now = Date.now(); if (now - spotT > 1100) { spotT = now; spotAt = (spotAt + 1) % Math.max(1, els.length); }
            f.querySelectorAll('.lts-spot').forEach((sp, k) => {
                const e = els[k]; if (!e) { sp.style.display = 'none'; return; }
                const r = e.getBoundingClientRect(), d = Math.max(r.width, r.height) + 12;
                sp.style.cssText = '--k:' + k + ';display:block;left:' + Math.round(r.left + r.width / 2 - d / 2) + 'px;top:' + Math.round(r.top + r.height / 2 - d / 2) + 'px;width:' + Math.round(d) + 'px;height:' + Math.round(d) + 'px';
                sp.classList.toggle('on', k === spotAt || reduced());
                if (k === spotAt) lit = e;
                box = box ? { l: Math.min(box.l, r.left), t: Math.min(box.t, r.top), r: Math.max(box.r, r.right), b: Math.max(box.b, r.bottom) } : { l: r.left, t: r.top, r: r.right, b: r.bottom };
            });
        }
        const at = lit || el;
        if (hand) {
            if (!at) hand.style.display = 'none';
            else { const r = at.getBoundingClientRect(); hand.style.display = 'block'; hand.style.left = Math.round(r.left + r.width / 2) + 'px'; hand.style.top = Math.round(r.top + r.height / 2) + 'px'; }
        }
        /* the picture must never push the card over the spotlit control: on a short screen it gets compact first, then leaves the card
           (decided once per card, so the card can't flip back and forth between ticks), and the card is placed again right away */
        const v = card && card.querySelector('.lts-vis'), hole = rootEl.querySelector('.lt-hole');
        if (v && el && hole && !card.classList.contains('lts-novis')) {
            /* where the card is going (style.top), not where its 0.32 s slide is right now */
            const over = () => { const h = holeAt(hole), t = parseFloat(card.style.top) || 0, l = parseFloat(card.style.left) || 0, bt = t + card.offsetHeight, rr = l + card.offsetWidth; return h.width > 4 && t < h.bottom + 8 && h.top - 8 < bt && l < h.right + 8 && h.left - 8 < rr; };   /* + the ring's glow and pulse */
            const again = () => {
                const h = holeAt(hole), vh = W.innerHeight, m = 12, ch = card.offsetHeight || 200, below = h.bottom + 12, above = h.top - 12 - ch;
                const top = below + ch <= vh - m ? below : above >= m ? above : Math.max(m, Math.min(vh - ch - m, below));
                card.style.top = Math.round(Math.max(m, top)) + 'px';
            };
            /* without the picture, would the card fit above or below the control? if not, it covers it anyway (a long card on a short
               phone, as before this change), and the picture stays, compact */
            const fitsWithout = () => { const h = holeAt(hole), vh = W.innerHeight, chNo = card.offsetHeight - v.offsetHeight - 12; return h.top - 24 >= chNo || vh - h.bottom - 24 >= chNo; };
            if (over() && !card.classList.contains('lts-tight')) { card.classList.add('lts-tight'); again(); }
            /* still in the way: the text shrinks to three lines (the voice still reads all of it; a tap on the text opens it) */
            const tx = card.querySelector('.lt-text');
            if (over() && tx && !card.classList.contains('lts-short') && !card.classList.contains('lts-open')) {
                card.classList.add('lts-short'); tx.setAttribute('role', 'button'); tx.setAttribute('aria-expanded', 'false');
                tx.addEventListener('click', () => { card.classList.remove('lts-short'); card.classList.add('lts-open'); tx.setAttribute('aria-expanded', 'true'); }, { once: true });
                again();
            }
            if (over() && fitsWithout()) { card.classList.add('lts-novis'); again(); }
        }
        /* a centred card over the spots: move it to the side with more room, so the lit controls stay in view */
        if (box && card && !el) {
            const vh = W.innerHeight, m = 12, ch = card.offsetHeight || 200, upRoom = box.t - m, downRoom = vh - box.b - m;
            let top = null;
            if (downRoom >= ch) top = box.b + 8; else if (upRoom >= ch) top = box.t - 8 - ch; else top = downRoom >= upRoom ? vh - ch - m : m;
            card.style.top = Math.round(Math.max(m, Math.min(vh - ch - m, top))) + 'px';
        }
    }
    const api = { SHOW, L, plan, visHtml, render, place, ids: () => Object.keys(SHOW) };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (W) {
        W.LowiTutorialShow = api;
        if (D && !D.getElementById('ltsCss')) { const m = D.querySelector('meta[name="lowi-build"]'), k = D.createElement('link'); k.id = 'ltsCss'; k.rel = 'stylesheet'; k.href = 'tutorial-show.css?v=' + encodeURIComponent((m && m.content) || '1'); D.head.appendChild(k); }
    }
})(this);
