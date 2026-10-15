/* LOWiSPIKE companion evolution, DOM layer (Oct 15, 2026). Pure logic in companion-core.js.
   - Misty's cell (LowiHerbTamagotchi.plantHTML after cell-world) gets her fused form: element traits from the star sign,
     body language from the personality type, six forms from the existing retained herb stage. No XP is awarded here.
   - Reactions: a logged meal or a scanned product makes Misty brace (high spike), nod (medium) or cheer (low spike).
   - Calm glow between meals from lowi_fast_v1 (rises from 3 h, full at 12 h, flat after that).
   - Evolution sheet (button in the wardrobe): the forms, what shapes them, optional style picker, share toggle.
   - Friends tree: each friend shows their own published look (profiles.look, a visual-only code); no look -> the old cell.
   Local prefs: localStorage "lowispike.companion.v1" {share, traits, born}. */
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
    const KEY = 'lowispike.companion.v1', FKEY = 'lowispike.friendlooks.v1';
    const RM = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const lang = () => { try { return (W.LowiLang.get() || 'de').slice(0, 2); } catch (e) { return (H.lang || 'de').slice(0, 2); } };
    const L = (en, de, es) => ({ de, es }[lang()] || en);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } };
    const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
    function prefs() {
        const p = read(KEY, {}) || {};
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
    function myLook() { const g = myGenome(); return g ? C.encode(g) : ''; }
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
    function swap(host, g, id) {
        if (!host || !g) return;
        const old = host.querySelector('svg.cr-fc');
        if (!old) return;
        const code = C.encode(g);
        if (old.getAttribute('data-cf') === code) return;
        const t = D.createElement('div');
        t.innerHTML = C.miniSVG(g, id);
        const svg = t.firstChild;
        if (!svg) return;
        svg.setAttribute('class', 'cr-fc cf-mini cf-el-' + g.el);
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
        if (mine && prefs().traits) { const g = myGenome(); if (g) swap(mine, g, 'me'); }
        fetchLooks(uids);
    }

    /* ---------- evolution sheet ---------- */
    const V = { ov: null, back: null, msg: '' };
    const AX = [['E', 'I', ['Outgoing', 'Gesellig', 'Sociable'], ['Quiet', 'Ruhig', 'Tranquilo']], ['S', 'N', ['Hands-on', 'Praktisch', 'Práctico'], ['Big picture', 'Ideen', 'Ideas']],
        ['T', 'F', ['Head', 'Kopf', 'Cabeza'], ['Heart', 'Herz', 'Corazón']], ['J', 'P', ['Planner', 'Planer', 'Planificador'], ['Go with the flow', 'Spontan', 'Espontáneo']]];
    const pick3 = a => a[({ de: 1, es: 2 }[lang()] || 0)];
    function curType() { try { const m = model(); return C.normType(m && m.profile && m.profile.personality); } catch (e) { return ''; } }
    function stages() { try { return (W.LOWI_HERB_CONFIG && LOWI_HERB_CONFIG.stages) || null; } catch (e) { return null; } }
    const FALLBACK = [{ xp: 0 }, { xp: 100 }, { xp: 300 }, { xp: 700 }, { xp: 1500 }, { xp: 3000 }];
    function sheetHTML() {
        const m = model(), g = myGenome(m), p = prefs();
        if (!m || !g) return '<div class="cf-panel"><p>' + esc(L('Your companion is still waking up.', 'Dein Begleiter wacht gerade auf.', 'Tu compañero se está despertando.')) + '</p></div>';
        const nm = (() => { try { return W.LowiHerbIdentity.current().name; } catch (e) { return 'Misty'; } })();
        const T = HT(), cc = cur(), hp = cc && cc.p ? cc.p : {};
        let big = '';
        try { big = T.plantHTML(m, 'card', hp, {}); } catch (e) { big = ''; }
        const sign = m.profile && m.profile.sign, t = curType();
        const signTxt = sign ? (() => { try { return W.LowiHerbIdentity.signLabel(sign.name); } catch (e) { return sign.name; } })() : '';
        const elTxt = { fire: L('fire family: flame tufts and blaze wings', 'Feuerfamilie: Flammenbüschel und Feuerflügel', 'familia de fuego: penachos y alas de fuego'), water: L('water family: fins and flowing frills', 'Wasserfamilie: Flossen und Rüschen', 'familia de agua: aletas y volantes'), air: L('air family: wisp ears and sky wings', 'Luftfamilie: Wirbelohren und Himmelsflügel', 'familia de aire: orejas de brisa y alas'), earth: L('earth family: leaf sprouts and a crystal shell', 'Erdfamilie: Blattsprossen und Kristallpanzer', 'familia de tierra: brotes y caparazón'), spirit: L('glow family until a sign is set', 'Leuchtfamilie, bis ein Sternzeichen da ist', 'familia de luz hasta tener signo') }[g.el];
        const body = t ? [g.au === 'wide' ? L('wide sparkles', 'weite Funken', 'chispas amplias') : L('close glow', 'nahes Leuchten', 'brillo cercano'), g.pt === 'band' ? L('soft bands', 'sanfte Streifen', 'bandas suaves') : L('star freckles', 'Sternsprenkel', 'pecas de estrella'), g.sh === 'edge' ? L('crisp edges', 'klare Kanten', 'bordes nítidos') : L('round shapes', 'runde Formen', 'formas redondas'), g.sy === 'even' ? L('even pairs', 'gleiche Paare', 'pares iguales') : L('playful, uneven pairs', 'verspielt ungleich', 'pares juguetones')].join(' · ') : '';
        const steps = C.path(stages() || FALLBACK, m.xp, m.index, g.el, lang());
        const forms = steps.map(s => {
            const gg = Object.assign({}, g, { st: s.i });
            return '<li class="cf-step' + (s.reached ? ' on' : ' cf-locked') + (s.current ? ' cur' : '') + '"><span class="cf-sm">' + C.miniSVG(gg, 'p' + s.i) + '</span><b>' + esc(s.name) + '</b><small>' + esc(s.trait) + '</small><em>' +
                esc(s.current ? L('now', 'jetzt', 'ahora') : s.reached ? '✓' : s.left + ' XP') + '</em></li>';
        }).join('');
        let calmTxt = '';
        if (calmNow > 0 && hoursNow != null) {
            const h = Math.floor(hoursNow);
            calmTxt = '<p class="cf-note cf-calmnote">' + esc(calmNow >= 1 ? L(h + ' h since your last meal: calm glow is full. It stays like this, there\'s nothing extra for going longer. Eat when you\'re hungry.', h + ' h seit deiner letzten Mahlzeit: das ruhige Leuchten ist voll. Es bleibt so, länger bringt nichts extra. Iss, wenn du Hunger hast.', h + ' h desde tu última comida: el brillo tranquilo está completo. Se queda así, ir más lejos no da nada extra. Come cuando tengas hambre.') : L(h + ' h since your last meal: a calm glow is building around me.', h + ' h seit deiner letzten Mahlzeit: um mich baut sich ein ruhiges Leuchten auf.', h + ' h desde tu última comida: un brillo tranquilo crece a mi alrededor.')) + '</p>';
        }
        const sel = V.pend || (t ? t.split('') : ['', '', '', '']);
        const typeBtns = AX.map((a, i) => '<div class="cf-ax" role="group">' + [0, 1].map(j => '<button type="button" data-cf="ax" data-i="' + i + '" data-v="' + a[j] + '" aria-pressed="' + (sel[i] === a[j]) + '">' + esc(pick3(a[2 + j])) + '</button>').join('') + '</div>').join('');
        return '<div class="cf-panel" role="dialog" aria-modal="true" aria-labelledby="cfTitle"><header class="cf-head"><h2 id="cfTitle">' + esc(L('Evolution', 'Entwicklung', 'Evolución')) + '</h2><button type="button" class="cf-x" data-cf="close" aria-label="' + esc(L('Close', 'Schließen', 'Cerrar')) + '">×</button></header><div class="cf-scroll">' +
            '<div class="cf-hero"><div class="cf-big">' + big + '</div><div><b class="cf-form">' + esc(nm) + ' · ' + esc(C.formName(g.st, g.el, lang())) + '</b><small>' + esc(L('Grows with what you log: meals, water, moves, scans. Forms never shrink.', 'Wächst mit dem, was du loggst: Essen, Wasser, Bewegung, Scans. Formen schrumpfen nie.', 'Crece con lo que registras: comidas, agua, movimiento, escaneos. Las formas nunca encogen.')) + '</small></div></div>' +
            calmTxt +
            '<h3>' + esc(L('What makes it yours', 'Was es zu deinem macht', 'Qué lo hace tuyo')) + '</h3><ul class="cf-made">' +
            '<li><b>' + esc(L('Star sign', 'Sternzeichen', 'Signo')) + '</b><span>' + esc(sign ? signTxt + ' · ' + elTxt : L('Add your birthday in Profile, then your element shows up here.', 'Trag deinen Geburtstag im Profil ein, dann zeigt sich hier dein Element.', 'Añade tu cumpleaños en Perfil y aquí aparecerá tu elemento.')) + '</span></li>' +
            '<li><b>' + esc(L('Personality style', 'Persönlichkeitsstil', 'Estilo de personalidad')) + '</b><span>' + esc(t ? t + ' · ' + body : L('Not chosen. Optional, pick below.', 'Nicht gewählt. Optional, unten wählen.', 'Sin elegir. Opcional, elige abajo.')) + '</span></li>' +
            '<li><b>' + esc(L('Bubble', 'Blase', 'Burbuja')) + '</b><span>' + esc(L('your cell, its colours and everything from the wardrobe stay.', 'deine Zelle, ihre Farben und alles aus dem Kleiderschrank bleiben.', 'tu célula, sus colores y todo lo del armario se quedan.')) + '</span></li></ul>' +
            '<details class="cf-pick"' + (!t || V.pickOpen ? ' open' : '') + '><summary>' + esc(L('Choose your style (optional)', 'Stil wählen (optional)', 'Elige tu estilo (opcional)')) + '</summary>' + typeBtns +
            '<p class="cf-tiny">' + esc(L('Only changes how your companion looks and talks. Not a test or a diagnosis.', 'Ändert nur, wie dein Begleiter aussieht und spricht. Kein Test, keine Diagnose.', 'Solo cambia cómo se ve y habla tu compañero. No es un test ni un diagnóstico.')) + '</p>' + (t ? '<button type="button" class="cf-link" data-cf="clear">' + esc(L('Remove style', 'Stil entfernen', 'Quitar estilo')) + '</button>' : '') + '</details>' +
            '<h3>' + esc(L('Forms', 'Formen', 'Formas')) + '</h3><ol class="cf-path">' + forms + '</ol>' +
            '<p class="cf-tiny">' + esc(L('Forms show what you have logged, not a health measurement. A sweet treat never takes a form away.', 'Formen zeigen, was du geloggt hast, keine Gesundheitsmessung. Etwas Süßes nimmt nie eine Form weg.', 'Las formas muestran lo que registraste, no una medida de salud. Un dulce nunca quita una forma.')) + '</p>' +
            '<p class="cf-note">' + esc(L('Wardrobe pieces you earned fit every form. With a hat on, the crest moves to the sides.', 'Deine verdienten Kleiderschrank-Teile passen zu jeder Form. Mit Hut wandert der Kamm zur Seite.', 'Las piezas que ganaste encajan en cada forma. Con sombrero, la cresta va a los lados.')) + '</p>' +
            '<label class="cf-row"><input type="checkbox" data-cf="traits"' + (p.traits ? ' checked' : '') + '><span>' + esc(L('Show evolved traits', 'Entwicklungsmerkmale zeigen', 'Mostrar rasgos evolucionados')) + '</span></label>' +
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
    function entries() {
        D.querySelectorAll('.lh-wardrobe').forEach(w => {
            const host = w.parentNode;
            if (!host || host.querySelector(':scope > .cf-entry')) return;
            const b = D.createElement('button');
            b.type = 'button'; b.className = 'cf-entry'; b.setAttribute('data-cf', 'open');
            const g = myGenome();
            b.innerHTML = '<span class="cf-entry-i">' + (g ? C.miniSVG(g, 'entry') : '') + '</span><span><b>' + esc(L('Evolution', 'Entwicklung', 'Evolución')) + '</b><small>' + esc(g ? C.formName(g.st, g.el, lang()) : '') + '</small></span>';
            host.insertBefore(b, w);
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
        friendLooks: () => Object.assign({}, looks), prefs, wrap
    };
})();
