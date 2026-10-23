/* LOWiSPIKE companion evolution, DOM layer (Oct 15, 2026). Pure logic in companion-core.js.
   - Misty's cell (LowiHerbTamagotchi.plantHTML after cell-world) gets her fused form: element traits from the star sign,
     body language from the personality type, ten forms from the existing retained herb stage. No XP is awarded here.
   - Reactions: a logged meal or a scanned product makes Misty brace (high spike), nod (medium) or cheer (low spike).
   - Calm glow between meals from lowi_fast_v1 (rises from 3 h, full at 12 h, flat after that).
   - Evolution sheet (button in the herb path sheet; the wardrobe is retired since Oct 15): the forms, what shapes them, optional style picker, share toggle.
   - Friends tree: each friend shows their own published look (profiles.look, a visual-only code); no look -> the old cell.
   Local prefs: localStorage "lowispike.companionprefs.v1" {share, traits, born}. "lowispike.companion.v1" belongs to companion-birth.js
   (the user's own companion: bday, name); BH-007 (Oct 19 2026): writing prefs there wiped it within seconds, so it is only read once, to carry
   over old prefs, and never written here. */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    if (W.LowiCompanion) return;
    const C = W.LowiCompanionCore;
    if (!C) { console.warn('companion-core missing'); return; }
    const me = D.currentScript || D.querySelector('script[src*="companion.js"]');
    if (!D.getElementById('cfCss')) {
        const l = D.createElement('link'); l.id = 'cfCss'; l.rel = 'stylesheet';
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('companion.js', 'companion.css') : 'companion.css';
        D.head.appendChild(l);
    }
    const KEY = 'lowispike.companionprefs.v1', BIRTH_KEY = 'lowispike.companion.v1', FKEY = 'lowispike.friendlooks.v1';
    const RM = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const lang = () => { try { return (W.LowiLang.get() || 'de').slice(0, 2); } catch (e) { return (H.lang || 'de').slice(0, 2); } };
    const L = (en, de, es) => ({ de, es }[lang()] || en);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } };
    const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
    function prefs() {
        let p = read(KEY, null);
        if (!p) { const o = read(BIRTH_KEY, {}) || {}; p = o.bday ? {} : o; } /* old prefs carried over; a birth record is not prefs */
        return { share: p.share !== false, traits: p.traits !== false, born: +p.born || 0 };
    }
    function savePrefs(p) { write(KEY, { share: !!p.share, traits: !!p.traits, born: +p.born || 0 }); }
    const HT = () => W.LowiHerbTamagotchi, R2 = () => W.LowiR2 || {};
    const S = () => { try { return R2().S && R2().S() || null; } catch (e) { return null; } };

    /* the companion's own seed: first recorded action (or first time seen), kept apart from the user's birthday */
    function seed() {
        const p = prefs();
        if (!p.born) {
            let t = 0;
            try { const s = S(), led = s && Array.isArray(s.ledger) ? s.ledger : []; led.forEach(e => { const x = +(e && (e.ts || e.t || e.at)) || 0; if (x > 0 && (!t || x < t)) t = x; }); } catch (e) { }
            p.born = t || Date.now(); savePrefs(p);
        }
        return Math.floor(p.born / 1000) % 65536;
    }
    function cur() { try { return HT() && HT().current ? HT().current() : null; } catch (e) { return null; } }
    function model() { const c = cur(); return c ? (c.m && c.m.profile ? c.m : c.profile ? c : null) : null; }
    function myGenome(m) {
        m = m && m.profile ? m : model();
        if (!m) return null;
        return C.genome(m.profile, m.index | 0, seed());
    }

    /* ---------- Misty's form inside the cell ---------- */
    function wrap() {
        const T = HT();
        if (!T || !T.plantHTML || !T.plantHTML.cell) return false;
        if (T.plantHTML.cf) return true;
        const prev = T.plantHTML;
        const fn = function (m, size, p, opts) {
            const out = prev.apply(this, arguments);
            if (opts && opts.crop) return out;
            try {
                if (!prefs().traits) return out;
                const g = myGenome(m && m.profile ? m : null);
                if (opts && opts.cfStage != null && g) g.st = C.clampStage(opts.cfStage);
                return C.apply(out, g);
            } catch (e) { return out; }
        };
        Object.keys(prev).forEach(k => { try { fn[k] = prev[k]; } catch (e) { } });
        fn.cell = true; fn.cf = true; fn.original = prev;
        T.plantHTML = fn;
        repaint();
        return true;
    }
    /* spirit.js paints Home's creature only when its signature changes: paint it once more through the wrapper */
    function repaintHome() {
        try {
            const T = HT(), c = D.querySelector('.sp-creature');
            if (!c || !T || !T.current) return;
            const x = T.current(), svg = c.querySelector('svg.tmg-plant');
            const dim = svg && svg.classList.contains('lh-droopy');
            c.innerHTML = T.plantHTML(Object.assign({}, x.m, dim ? { dim: true, mood: 'droopy' } : {}), 'hero', x.p);
        } catch (e) { }
    }
    function repaint() { try { HT() && HT().refresh && HT().refresh(); } catch (e) { } try { W.LowiCell && LowiCell.render && LowiCell.render(true); } catch (e) { } repaintHome(); }
    let tries = 0;
    (function retry() { if (wrap() || ++tries > 60) return; setTimeout(retry, 500); })();
    W.addEventListener('lowi:boot-ready', wrap);

    /* ---------- reactions ---------- */
    let rx = null, rxT = 0;
    const LINES = {
        brace: [['Oh! Sugar wave incoming. I\'m bracing, we\'ve got this.', 'Oh! Zuckerwelle im Anflug. Ich mach mich bereit, wir schaffen das.', '¡Oh! Viene una ola de azúcar. Me preparo, podemos con ella.'],
            ['Uh-oh, that one\'s a sugar wave. Your call, I\'ll be ready.', 'Oh oh, das ist eine Zuckerwelle. Du entscheidest, ich bin bereit.', 'Uy, eso es una ola de azúcar. Tú decides, yo estaré lista.']],
        okay: [['Okay, that works. Steady does it.', 'Okay, das passt. Schön gleichmäßig.', 'Vale, eso funciona. Con calma.'],
            ['Not bad. There\'s a calmer pick nearby.', 'Nicht schlecht. Es gibt was Ruhigeres daneben.', 'No está mal. Hay algo más tranquilo cerca.']],
        cheer: [['Yes! Let\'s go!', 'Jaaa! Los geht\'s!', '¡Sí! ¡Vamos!'],
            ['Ooh, good find! Let\'s go!', 'Ooh, guter Fund! Los geht\'s!', '¡Oh, buen hallazgo! ¡Vamos!']]
    };
    function react(v, src) {
        const k = C.reaction(v), now = Date.now();
        const n = C.merge(rx, k, now);
        if (!n || n === rx) return '';
        rx = n;
        H.setAttribute('data-cf-react', n.k);
        clearTimeout(rxT);
        rxT = setTimeout(() => { H.removeAttribute('data-cf-react'); }, 6500);
        const line = LINES[n.k][src === 'scan' ? 1 : 0][({ de: 1, es: 2 }[lang()] || 0)];
        setTimeout(() => { try { W.LowiPraise && LowiPraise.say && LowiPraise.say(line); } catch (e) { } }, src === 'scan' ? 1200 : 1600);
        return n.k;
    }
    D.addEventListener('lowi:meal-logged', e => { const d = e && e.detail || {}; if (d.lvl) react(d.lvl, 'meal'); });
    W.addEventListener('lowi:meal-logged', e => {
        const d = e && e.detail || {};
        let v = d.lvl || '';
        if (!v) { try { const s = S(), log = s && Array.isArray(s.logs) ? s.logs.find(l => l && l.id === d.id) : null; v = log && W.LowiCell && LowiCell.verdict ? LowiCell.verdict(log) : ''; } catch (e) { } }
        if (v) react(v, 'meal');
    });
    W.addEventListener('lowi:scan-verdict', e => { const d = e && e.detail || {}; if (d.verdict) react(d.verdict, 'scan'); });

    /* ---------- calm glow between meals ---------- */
    let calmNow = 0, hoursNow = null;
    function tickCalm() {
        hoursNow = C.fastHours(read('lowi_fast_v1', null), Date.now());
        const c = C.calm(hoursNow);
        if (c !== calmNow) {
            calmNow = c;
            H.style.setProperty('--cf-calm', String(c));
            if (c > 0) H.setAttribute('data-cf-calm', c >= 1 ? 'full' : 'on'); else H.removeAttribute('data-cf-calm');
        }
    }

    /* ---------- my look, shared with friends only as a visual code ---------- */
    let lookNow = '';
    /* 23 Oct 2026: the look you share carries your companion's chosen name too (companion-core withName), so the Ranking can show it */
    /* Bug hunt Oct 23: the shared name is the one Misty's card shows (BH-006 chain), never the old herb auto name ("Sunny Leaf");
       nothing is shared while it is still the default "Misty", so other phones show the evolution form instead */
    function myName() { const n = companionName(); return n === 'Misty' ? '' : n; }
    function myLook() { const g = myGenome(); return g ? (C.withName ? C.withName(C.encode(g), myName()) : C.encode(g)) : ''; }
    function hookProfile() {
        const R3 = W.LowiR3;
        if (!R3 || R3.profileExtra && R3.profileExtra.cf) return !!R3;
        const prev = R3.profileExtra;
        const fn = function () {
            let o = {};
            try { o = prev ? prev.apply(this, arguments) || {} : {}; } catch (e) { o = {}; }
            o.look = prefs().share && lookNow ? lookNow : null;
            return o;
        };
        fn.cf = true;
        R3.profileExtra = fn;
        return true;
    }
    function syncLook(force) {
        const l = myLook();
        if (!l) return;
        if (l !== lookNow || force) {
            lookNow = l;
            hookProfile();
            try { W.LOWI_CLOUD_X && LOWI_CLOUD_X.pushProfile && LOWI_CLOUD_X.pushProfile(); } catch (e) { }
        }
    }

    /* ---------- friends tree: their own companions ---------- */
    let looks = read(FKEY, {}) || {}, fetchedAt = 0, fetching = false;
    async function fetchLooks(uids) {
        if (fetching || !uids.length || Date.now() - fetchedAt < 120000) return;
        const X = W.LOWI_CLOUD_X;
        if (!X || !X.client) return;
        try { const st = X.state(); if (!st || !st.live) return; } catch (e) { return; }
        fetching = true;
        try {
            const sb = await X.client();
            const r = await sb.from('profiles').select('id,look').in('id', uids.slice(0, 60));
            if (!r.error && Array.isArray(r.data)) {
                const next = {};
                r.data.forEach(row => { const g = C.decode(row.look); if (g) next[row.id] = row.look; });
                looks = next; write(FKEY, looks); fetchedAt = Date.now(); paintFriends();
            }
        } catch (e) { } finally { fetching = false; }
    }
    /* Oct 19 old-design purge, round 3: a friend is drawn with the current glass cell (cell-world, the same render as Misty on Home)
       carrying THEIR shared form (element traits, stage), never the old mini-blob with a smile. Ids are made unique per friend so two
       friends on one screen never borrow each other's gradients. The mini-blob is only the last resort before cell-world has loaded. */
    function uniq(svg, key) {
        const k = String(key || 'f').replace(/[^a-z0-9]/gi, '') || 'f', ids = [];
        svg.replace(/\bid="([^"]+)"/g, (_, x) => { ids.push(x); return _; });
        if (!ids.length) return svg;
        const set = new Set(ids);
        return svg.replace(/\bid="([^"]+)"/g, (_, x) => 'id="' + x + '_' + k + '"')
            .replace(/(url\(#|href="#)([^)"]+)/g, (all, a, x) => set.has(x) ? a + x + '_' + k : all);
    }
    /* g = the friend's shared look; null = a friend who shares none: the plain current cell (cell-room tints it to their hue) */
    function friendSVG(g, id) {
        try {
            const T = HT(), f = T && T.plantHTML, base = f && f.cell ? (f.cf ? f.original : f) : null, c = T && T.current && T.current();
            if (base && c && c.m) {
                const st = g ? C.clampStage(g.st) : 0;
                const out = String(base(Object.assign({}, c.m, { index: st, dim: false, mood: 'happy' }), 'node', Object.assign({}, c.p, { equipment: {} }), { hidden: true, own: false }) || ''); /* own:false: a friend never wears your own companion (Oct 19) */
                const s = g ? C.apply(out, Object.assign({}, g, { st })) : out;
                if (g ? s.indexOf('cf-back') >= 0 : s.indexOf('cw-wall') >= 0) return uniq(s.replace('class="tmg-plant', 'class="cf-friend tmg-plant').replace(/ role="img"/, ' aria-hidden="true"').replace(/ aria-label="[^"]*"/, ''), id);
            }
        } catch (e) { }
        return g ? C.miniSVG(g, id) : '';
    }
    function swap(host, g, id) {
        if (!host || !g) return;
        const old = host.querySelector('svg.cr-fc');
        if (!old) return;
        const code = C.encode(g);
        if (old.getAttribute('data-cf') === code) return;
        const t = D.createElement('div');
        t.innerHTML = friendSVG(g, id);
        const svg = t.firstChild;
        if (!svg) return;
        svg.setAttribute('class', 'cr-fc ' + (svg.getAttribute('class') || '').replace(/\bcf-mini\b/, '').trim() + ' cf-mini cf-el-' + g.el);
        svg.setAttribute('data-cf', code);
        old.replaceWith(svg);
    }
    function paintFriends() {
        const tree = D.querySelector('.cr-treep');
        if (!tree) return;
        const uids = [];
        tree.querySelectorAll('.cr-spot[data-uid]').forEach((b, i) => {
            const uid = b.getAttribute('data-uid'); uids.push(uid);
            const g = C.decode(looks[uid]);
            if (g) { swap(b, g, 'f' + i); b.classList.add('cf-has'); }
        });
        const card = tree.querySelector('.cr-fcard');
        if (card) {
            const b = card.querySelector('[data-uid]'), uid = b && b.getAttribute('data-uid'), g = uid && C.decode(looks[uid]);
            if (g) swap(card, g, 'sel');
        }
        const mine = tree.querySelector('.cr-mine');
        if (mine && prefs().traits && !mine.querySelector('svg.cr-own')) { const g = myGenome(); if (g) swap(mine, g, 'me'); } /* Oct 19: Misty's own cell stays; no mini-blob over her */
        fetchLooks(uids);
    }

    /* ---------- evolution sheet ---------- */
    const V = { ov: null, back: null, msg: '' };
    const AX = [['E', 'I', ['Outgoing', 'Gesellig', 'Sociable'], ['Quiet', 'Ruhig', 'Tranquilo']], ['S', 'N', ['Hands-on', 'Praktisch', 'Práctico'], ['Big picture', 'Ideen', 'Ideas']],
        ['T', 'F', ['Head', 'Kopf', 'Cabeza'], ['Heart', 'Herz', 'Corazón']], ['J', 'P', ['Planner', 'Planer', 'Planificador'], ['Go with the flow', 'Spontan', 'Espontáneo']]];
    const pick3 = a => a[({ de: 1, es: 2 }[lang()] || 0)];
    function curType() { try { const m = model(); return C.normType(m && m.profile && m.profile.personality); } catch (e) { return ''; } }
    function stages() { try { return (W.LOWI_HERB_CONFIG && LOWI_HERB_CONFIG.stages) || null; } catch (e) { return null; } }
    const FALLBACK = [{ xp: 0 }, { xp: 100 }, { xp: 300 }, { xp: 700 }, { xp: 1500 }, { xp: 3000 }, { xp: 4500 }, { xp: 7000 }, { xp: 10000 }, { xp: 14000 }];
    /* Misty's view (Oct 15 evening): tapping Misty opens THIS, the Pokémon route. Her picture is the same render as on Home
       (plantHTML 'hero' through cell-world + the form wrapper, inside the same glass bubble), then XP to the next evolution,
       the six forms drawn with the same render code (locked ones as silhouettes), the optional style picker and sharing. */
    function homeLook() {
        const c = D.querySelector('#spBubble .sp-creature'), svg = c && c.querySelector('svg.tmg-plant');
        return { dim: !!(svg && svg.classList.contains('lh-droopy')), dry: c ? (c.style.getPropertyValue('--sp-dry') || '0') : '0' };
    }
    function heroArt(m, hp) {
        const T = HT(), h = homeLook();
        try { return T.plantHTML(Object.assign({}, m, h.dim ? { dim: true, mood: 'droopy' } : {}), 'hero', hp); } catch (e) { return ''; }
    }
    /* Oct 21 2026: only reached forms are drawn; a locked form shows a mystery orb and ??? (no art, no silhouette) so evolving is a reveal */
    function formArt(m, hp, g, i) {
        const T = HT();
        try { return T.plantHTML(Object.assign({}, m, { index: i, dim: false, mood: 'happy' }), 'node', hp, { cfStage: i, hidden: true }); } catch (e) { }
        return C.miniSVG(Object.assign({}, g, { st: i }), 'p' + i);
    }
    /* BH-006 name chain (same helper as world-home.js / misty-hub.js): own companion > a typed name > Misty */
    function companionName() { const w = typeof window !== 'undefined' ? window : globalThis; const pick = v => { v = v == null ? '' : String(v).trim(); return v ? v.slice(0, 24) : ''; }; let auto = ''; try { auto = pick(w.LowiHerbIdentity && w.LowiHerbIdentity.autoName && w.LowiHerbIdentity.autoName()); } catch (e) { } const typed = v => { v = pick(v); return v && v !== auto ? v : ''; }; let n = ''; try { const B = w.LowiBirthCompanion; if (B && B.has && B.has()) { const c = B.get(); n = pick(c && c.name); } } catch (e) { } if (!n) try { const t = w.LowiHerbTamagotchi, p = t && t.readPrefs && t.readPrefs(); n = typed(p && p.name); } catch (e) { } if (!n) try { const R = w.LowiR2, s = R && R.S && R.S(); n = typed(s && s.herb && s.herb.name); } catch (e) { } return n || 'Misty'; }
    function sheetHTML() {
        const m = model(), g = myGenome(m), p = prefs();
        const xBtn = '<button type="button" class="cf-x" data-cf="close" aria-label="' + esc(L('Close', 'Schließen', 'Cerrar')) + '">×</button>';
        if (!m || !g) return '<div class="cf-panel cf-misty" role="dialog" aria-modal="true" aria-label="Misty"><header class="cf-head"><h2>Misty</h2>' + xBtn + '</header><div class="cf-scroll"><p>' + esc(L('Your companion is still waking up.', 'Dein Begleiter wacht gerade auf.', 'Tu compañero se está despertando.')) + '</p></div></div>';
        /* Bug hunt Oct 23: the title is the same name Misty's card shows (BH-006 chain), never the old herb auto name ("Sunny Leaf") */
        const nm = companionName();
        const cc = cur(), hp = cc && cc.p ? cc.p : {}, pal = (m.profile && m.profile.palette) || {};
        const sign = m.profile && m.profile.sign, t = curType();
        const signTxt = sign ? (() => { try { return W.LowiHerbIdentity.signLabel(sign.name); } catch (e) { return sign.name; } })() : '';
        const fam = { fire: L('Fire family', 'Feuerfamilie', 'Familia de fuego'), water: L('Water family', 'Wasserfamilie', 'Familia de agua'), air: L('Air family', 'Luftfamilie', 'Familia de aire'), earth: L('Earth family', 'Erdfamilie', 'Familia de tierra'), spirit: L('Glow family', 'Leuchtfamilie', 'Familia de luz') }[g.el] || '';
        const steps = C.path(stages() || FALLBACK, m.xp, m.index, g.el, lang());
        const ci = C.clampStage(m.index), now = steps[ci] || steps[0], nx = steps[ci + 1] || null, xp = Math.max(0, Math.round(+m.xp || 0));
        const pct = nx ? Math.max(0, Math.min(100, Math.round((xp - now.xp) / Math.max(1, nx.xp - now.xp) * 100))) : 100;
        /* Oct 22, 2026 evolution step 1: 25 levels, evolutions at levels 5, 10, 15, 20 and 25 (world-home-core.js). Past form 10 the
           next step is the next evolution level, not "final form". The new forms for 15, 20 and 25 come in a later step. */
        const evo = (() => { try { const K = W.LowiWorldHomeCore, lv = K.stage(xp, true).index + 1, E = K.EVO_LEVELS.filter(n => n > 10 && n > lv); return { lv, E, left: E.length ? Math.max(0, K.STAGES[E[0] - 1].xp - xp) : 0 }; } catch (e) { return { lv: ci + 1, E: [], left: 0 }; } })();
        const nextTxt = !nx && evo.E.length ? L('Level ' + evo.lv + ' · next evolution at level ' + evo.E[0] + ': ' + evo.left + ' XP to go', 'Level ' + evo.lv + ' · nächste Entwicklung bei Level ' + evo.E[0] + ': noch ' + evo.left + ' XP', 'Nivel ' + evo.lv + ' · próxima evolución en el nivel ' + evo.E[0] + ': faltan ' + evo.left + ' XP')
            : !nx ? L('Final form reached. It keeps glowing with you.', 'Letzte Form erreicht. Es leuchtet weiter mit dir.', 'Forma final alcanzada. Sigue brillando contigo.')
            : nx.left > 0 ? L(nx.left + ' XP to ' + nx.name, 'Noch ' + nx.left + ' XP bis ' + nx.name, 'Faltan ' + nx.left + ' XP para ' + nx.name)
                : L('Ready to evolve into ' + nx.name, 'Bereit für ' + nx.name, 'Lista para ' + nx.name);
        const dry = homeLook().dry;
        /* Oct 21 2026 (Eman: "cramped, old, can't read it"): a vertical glass timeline, one roomy row per form instead of ten tiny tiles.
           Reached forms show their art, name and what they grew; locked forms stay a mystery orb with ??? and only their XP. */
        const nf = n => { try { return Number(n).toLocaleString({ de: 'de-DE', es: 'es-ES' }[lang()] || 'en-US'); } catch (e) { return String(n); } };
        const found = steps.filter(s => s.reached).length;
        const forms = steps.map((s, i) => {
            const meta = s.reached ? s.trait : (i === ci + 1 && s.left > 0 ? L(nf(s.left) + ' XP to go', 'Noch ' + nf(s.left) + ' XP', 'Faltan ' + nf(s.left) + ' XP') : L('Not discovered yet', 'Noch nicht entdeckt', 'Aún sin descubrir'));
            const tag = s.current ? L('Now', 'Jetzt', 'Ahora') : s.reached ? L('Reached', 'Erreicht', 'Alcanzada') : nf(s.xp) + ' XP';
            return '<li class="cf-step' + (s.reached ? ' on' : ' cf-locked') + (s.current ? ' cur' : '') + (i === ci + 1 ? ' cf-nextup' : '') + '"' + (s.current ? ' aria-current="step"' : '') + '>' +
                (s.reached ? '<span class="cf-sm">' + formArt(m, hp, g, s.i) + '</span><b>' + esc(s.name) + '</b>' : '<span class="cf-mystery" aria-hidden="true">?</span><b aria-hidden="true">???</b>') +
                '<small class="cf-k" aria-hidden="true">' + esc(L('Form ', 'Form ', 'Forma ') + (i + 1)) + '</small><small class="cf-meta" aria-hidden="true">' + esc(meta) + '</small><em aria-hidden="true">' + esc(tag) + '</em><span class="cf-sr">' +
                esc(L('Form ', 'Form ', 'Forma ') + (i + 1) + ': ' + (s.reached ? s.name + (s.current ? ', ' + L('now', 'jetzt', 'ahora') : '') : L('not discovered yet', 'noch nicht entdeckt', 'aún sin descubrir') + ', ' + L('from ', 'ab ', 'desde ') + nf(s.xp) + ' XP')) + '</span></li>';
        }).join('');
        const sel = V.pend || (t ? t.split('') : ['', '', '', '']);
        const typeBtns = AX.map((a, i) => '<div class="cf-ax" role="group">' + [0, 1].map(j => '<button type="button" data-cf="ax" data-i="' + i + '" data-v="' + a[j] + '" aria-pressed="' + (sel[i] === a[j]) + '">' + esc(pick3(a[2 + j])) + '</button>').join('') + '</div>').join('');
        return '<div class="cf-panel cf-misty" role="dialog" aria-modal="true" aria-labelledby="cfTitle"><header class="cf-head"><h2 id="cfTitle">' + esc(nm) + '</h2>' + xBtn + '</header><div class="cf-scroll">' +
            '<div class="cf-hero"><div class="cf-bub" style="--tmg-a:' + esc(pal.a || '#92ddd7') + ';--tmg-b:' + esc(pal.b || '#b8b0ff') + '"><span class="cf-bub-water" aria-hidden="true"></span><span class="cf-bub-herb"><span class="cf-bub-c" style="--sp-dry:' + esc(dry) + '">' + heroArt(m, hp) + '</span></span></div>' +
            '<b class="cf-fname">' + esc(now.name) + '</b><small class="cf-sub">' + esc(L('Form ' + (ci + 1) + ' of ' + steps.length, 'Form ' + (ci + 1) + ' von ' + steps.length, 'Forma ' + (ci + 1) + ' de ' + steps.length) + (sign ? ' · ' + signTxt + ' · ' + fam : '')) + '</small>' +
            '<i class="cf-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="' + esc(L('XP to the next evolution', 'XP bis zur nächsten Entwicklung', 'XP hasta la próxima evolución')) + '"><i style="width:' + pct + '%"></i></i>' +
            '<small class="cf-next"><b>' + xp + ' XP</b> · ' + esc(nextTxt) + '</small></div>' +
            '<h3 class="cf-path-h"><span>' + esc(L('Evolution path', 'Entwicklungsweg', 'Camino de evolución')) + '</span><small>' + esc(L(found + ' of ' + steps.length + ' discovered', found + ' von ' + steps.length + ' entdeckt', found + ' de ' + steps.length + ' descubiertas')) + '</small></h3><ol class="cf-path">' + forms + '</ol>' +
            (evo.E.length ? '<p class="cf-tiny cf-evo-more">' + esc(L('More evolutions at level ' + evo.E.join(', ') + '.', 'Weitere Entwicklungen bei Level ' + evo.E.join(', ') + '.', 'Más evoluciones en el nivel ' + evo.E.join(', ') + '.')) + '</p>' : '') +
            '<p class="cf-tiny">' + esc(L('It evolves with what you log: meals, water, moves, scans. Forms never shrink.', 'Es entwickelt sich mit dem, was du loggst: Essen, Wasser, Bewegung, Scans. Formen schrumpfen nie.', 'Evoluciona con lo que registras: comidas, agua, movimiento, escaneos. Las formas nunca encogen.')) + '</p>' +
            '<details class="cf-pick"' + (V.pickOpen ? ' open' : '') + '><summary>' + esc(L('Style (optional)', 'Stil (optional)', 'Estilo (opcional)')) + (t ? '<span class="cf-pick-t">' + esc(t) + '</span>' : '') + '</summary>' + typeBtns +
            '<p class="cf-tiny">' + esc(L('Only changes how your companion looks and talks. Not a test or a diagnosis.', 'Ändert nur, wie dein Begleiter aussieht und spricht. Kein Test, keine Diagnose.', 'Solo cambia cómo se ve y habla tu compañero. No es un test ni un diagnóstico.')) + '</p>' + (t ? '<button type="button" class="cf-link" data-cf="clear">' + esc(L('Remove style', 'Stil entfernen', 'Quitar estilo')) + '</button>' : '') +
            '<label class="cf-row"><input type="checkbox" data-cf="traits"' + (p.traits ? ' checked' : '') + '><span>' + esc(L('Show evolved traits', 'Entwicklungsmerkmale zeigen', 'Mostrar rasgos evolucionados')) + '</span></label></details>' +
            '<label class="cf-row"><input type="checkbox" data-cf="share"' + (p.share ? ' checked' : '') + '><span>' + esc(L('Friends see my companion in their friends tree', 'Freunde sehen meinen Begleiter in ihrem Freundesbaum', 'Mis amigos ven a mi compañero en su árbol')) + '<small>' + esc(L('Only the look is shared, never your birthday, sign or type.', 'Geteilt wird nur das Aussehen, nie Geburtstag, Sternzeichen oder Typ.', 'Solo se comparte el aspecto, nunca tu cumpleaños, signo o tipo.')) + '</small></span></label>' +
            (V.msg ? '<p class="cf-note" role="status">' + esc(V.msg) + '</p>' : '') + '</div></div>';
    }
    function paint(focusSel) {
        if (!V.ov) return;
        const sc = V.ov.querySelector('.cf-scroll'), top = sc ? sc.scrollTop : 0;
        V.ov.innerHTML = sheetHTML();
        const sc2 = V.ov.querySelector('.cf-scroll'); if (sc2) sc2.scrollTop = top;
        const f = focusSel && V.ov.querySelector(focusSel);
        if (f && f.focus) f.focus({ preventScroll: true });
    }
    function open() {
        if (V.ov) return V.ov;
        tickCalm();
        V.back = D.activeElement; V.msg = ''; V.pend = null; V.pickOpen = false;
        V.ov = D.createElement('div');
        V.ov.className = 'cf-ov';
        D.body.appendChild(V.ov);
        paint();
        const x = V.ov.querySelector('.cf-x'); x && x.focus({ preventScroll: true });
        return V.ov;
    }
    function close() {
        if (!V.ov) return;
        V.ov.remove(); V.ov = null;
        const b = V.back; if (b && b.focus && D.contains(b)) b.focus({ preventScroll: true });
    }
    function refreshAll() { repaint(); syncLook(); paintFriends(); }
    function setType(t) { try { if (W.LowiHerbIdentity && LowiHerbIdentity.setType) { LowiHerbIdentity.setType(t); return true; } } catch (e) { } return false; }
    D.addEventListener('click', e => {
        const t = e.target && e.target.closest ? e.target.closest('[data-cf]') : null;
        if (t && t.getAttribute('data-cf') === 'open') { e.preventDefault(); open(); return; }
        if (!V.ov) return;
        if (e.target === V.ov) { close(); return; }
        if (!t || !V.ov.contains(t)) return;
        const a = t.getAttribute('data-cf');
        if (a === 'close') close();
        else if (a === 'ax') {
            const i = +t.getAttribute('data-i'), v = t.getAttribute('data-v');
            V.pickOpen = true;
            const arr = V.pend || (curType() || '????').split('');
            arr[i] = v;
            const cur = arr.join('');
            if (C.normType(cur)) { setType(cur); V.pend = null; V.msg = L('Style saved. Look at your companion.', 'Stil gespeichert. Schau dir deinen Begleiter an.', 'Estilo guardado. Mira a tu compa\u00f1ero.'); refreshAll(); }
            else { V.pend = arr; V.msg = L('Pick one in each row.', 'W\u00e4hle in jeder Zeile eins.', 'Elige uno en cada fila.'); }
            paint('[data-cf="ax"][data-i="' + i + '"][data-v="' + v + '"]');
        } else if (a === 'clear') { setType(''); V.pend = null; V.msg = ''; refreshAll(); paint('.cf-pick summary'); }
    });
    D.addEventListener('change', e => {
        if (!V.ov) return;
        const t = e.target;
        if (!t || !V.ov.contains(t)) return;
        const a = t.getAttribute('data-cf'), p = prefs();
        if (a === 'traits') { p.traits = !!t.checked; savePrefs(p); refreshAll(); paint('[data-cf="traits"]'); }
        else if (a === 'share') { p.share = !!t.checked; savePrefs(p); syncLook(true); V.msg = p.share ? L('Friends can see your companion again.', 'Freunde sehen deinen Begleiter wieder.', 'Tus amigos vuelven a ver a tu compañero.') : L('Your companion is hidden from friends now.', 'Dein Begleiter ist jetzt für Freunde verborgen.', 'Tu compañero ahora está oculto para tus amigos.'); paint('[data-cf="share"]'); }
    });
    D.addEventListener('keydown', e => { if (V.ov && e.key === 'Escape') { e.stopPropagation(); close(); } }, true);

    /* entry button next to the wardrobe, and the friends tree */
    /* where people really look: the herb path sheet (herb world > Entwicklung), the wardrobe sheet (> Kleiderschrank), and the old wardrobe grid */
    /* Oct 19 old-design purge: the entry shows the real Misty cell, not the old mini-blob */
    function ownArt(g) {
        try { const T = HT(), c = T && T.current && T.current(); if (c && T.plantHTML) { const s = T.plantHTML(c.m, 'node', c.p); if (s) return s; } } catch (e) { }
        return g ? C.miniSVG(g, 'entry') : '';
    }
    function entryBtn() {
        const b = D.createElement('button');
        b.type = 'button'; b.className = 'cf-entry'; b.setAttribute('data-cf', 'open');
        const g = myGenome();
        b.innerHTML = '<span class="cf-entry-i">' + ownArt(g) + '</span><span><b>' + esc(L('Your companion\u2019s forms', 'Formen deines Begleiters', 'Formas de tu compa\u00f1ero')) + '</b><small>' + esc(g ? C.formName(g.st, g.el, lang()) : '') + '</small></span>';
        return b;
    }
    function entries() {
        D.querySelectorAll('.lh-wardrobe').forEach(w => {
            const host = w.parentNode;
            if (!host || host.querySelector(':scope > .cf-entry')) return;
            host.insertBefore(entryBtn(), w);
        });
        D.querySelectorAll('.hq-root[data-view="path"]').forEach(r => {
            if (r.querySelector(':scope > .cf-entry')) return;
            const h = r.querySelector(':scope > h2');
            if (h) h.after(entryBtn()); else r.prepend(entryBtn());
        });
        D.querySelectorAll('#spWd').forEach(r => {
            if (r.querySelector(':scope > .cf-entry')) return;
            const st = r.querySelector(':scope > .wd-stage');
            if (st) st.after(entryBtn());
        });
        paintFriends();
    }
    let raf = 0;
    const queue = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; entries(); }); };
    try { new MutationObserver(queue).observe(D.body, { childList: true, subtree: true }); } catch (e) { }

    function tick() { tickCalm(); syncLook(); }
    ['lowi:reward', 'lowi:cell-state', 'lowi:quest-claimed', 'lowi:fast-start'].forEach(n => W.addEventListener(n, () => setTimeout(tick, 300)));
    D.addEventListener('lowi:meal-logged', () => setTimeout(tick, 300));
    D.addEventListener('visibilitychange', () => { if (!D.hidden) tick(); });
    setInterval(tick, 60000);
    tickCalm();
    setTimeout(tick, 1500);

    W.LowiCompanion = {
        open, close, isOpen: () => !!V.ov, tick: () => { tickCalm(); return calmNow; }, genome: () => myGenome(), look: () => lookNow || myLook(), react, calm: () => { tickCalm(); return calmNow; },
        friendLooks: () => Object.assign({}, looks), prefs, wrap, friendSVG
    };
})();
