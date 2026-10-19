/* LOWiSPIKE companion evolution, pure core (Oct 15, 2026).
   Misty (the one herb/cell companion) gets one fused creature design:
   - star sign (from the user's own birthday in user.bday, or the chosen prefs.starSign when no birthday) -> element family
     (fire / water / air / earth) and the existing sign palette (--tmg-a / --tmg-b);
   - personality type (Profile R5.mbti / user.mbti / herb prefs.personality, chosen by the user, optional) -> body language:
     E/I aura (wide sparkles / close glow), S/N markings (bands / star freckles), T/F silhouette (edged / soft),
     J/P symmetry (even / free). Style only, no psychology; no type -> neutral soft, even, unmarked form;
   - stage = the existing retained herb stage (K.stage(xp, highestStage)), so forms never go backwards and no XP is added here.
   Six forms, each adds creature traits (nubs, ears/fins, tail, wings, crown) instead of clothes; wardrobe pieces stay on top.
   Friends: only a visual code (look) is shared, never birthday, sign name or type letters. */
(function (root) {
    'use strict';
    const ELS = ['fire', 'water', 'air', 'earth', 'spirit'];
    const CX = 130, CY = 158, CELL_R = [64, 70, 76, 82, 88, 94, 94, 94, 94, 94]; /* the body stops growing at form 6; forms 7-10 grow in traits */
    const TYPES = /^[EI][SN][TF][JP]$/;
    const HAT_IDS = ['daisy', 'bow', 'crown', 'beanie', 'mushroom'];
    const MAX_ST = 9; /* ten forms (0-9); Oct 19 2026 night: four more after Legendary */
    const clampStage = i => Math.max(0, Math.min(MAX_ST, (+i | 0)));
    const hex = c => (/^#[0-9a-f]{6}$/i.test(String(c || '')) ? String(c).toLowerCase() : '');
    const normType = t => { t = String(t || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); return TYPES.test(t) ? t : ''; };
    const f1 = n => (Math.round(n * 10) / 10).toString();

    /* ---------- copy ---------- */
    const STAGE = {
        en: ['Spark', 'Bud', 'Sprite', 'Drifter', 'Guardian', 'Radiant', 'Nova', 'Titan', 'Monarch', 'Majesty'],
        de: ['Funke', 'Knospe', 'Flitzer', 'Gleiter', 'Hüter', 'Strahler', 'Nova', 'Titan', 'Monarch', 'Majestät'],
        es: ['Chispa', 'Brote', 'Duende', 'Viajero', 'Guardián', 'Radiante', 'Nova', 'Titán', 'Monarca', 'Majestad']
    };
    const ADJ = {
        fire: ['Ember', 'Glut', 'de brasa'], water: ['Tide', 'Flut', 'de marea'], air: ['Breeze', 'Wind', 'de brisa'],
        earth: ['Moss', 'Moos', 'de musgo'], spirit: ['Glow', 'Schimmer', 'de brillo']
    };
    const TRAITS = {
        fire: [['Warm core', 'Warmer Kern', 'Núcleo cálido'], ['Ember nubs', 'Glutknubbel', 'Bultos de brasa'], ['Flame tufts', 'Flammenbüschel', 'Penachos de llama'], ['Cinder tail', 'Glutschweif', 'Cola de ceniza'], ['Blaze wings', 'Feuerflügel', 'Alas de fuego'], ['Sun crown', 'Sonnenkrone', 'Corona solar'], ['Flame mane', 'Flammenmähne', 'Melena de llama'], ['Twin flame tails', 'Doppelter Flammenschweif', 'Dos colas de llama'], ['Blaze spikes', 'Feuerzacken', 'Picos de fuego'], ['Sun orbit', 'Sonnenring', 'Anillo solar']],
        water: [['Dew core', 'Taukern', 'Núcleo de rocío'], ['Ripple nubs', 'Wellenknubbel', 'Bultos de onda'], ['Tide fins', 'Flutflossen', 'Aletas de marea'], ['Wave tail', 'Wellenschweif', 'Cola de ola'], ['Flow frills', 'Strömungsrüschen', 'Volantes de corriente'], ['Pearl crown', 'Perlenkrone', 'Corona de perlas'], ['Coral mane', 'Korallenmähne', 'Melena de coral'], ['Twin wave tails', 'Doppelter Wellenschweif', 'Dos colas de ola'], ['Tidal spikes', 'Flutzacken', 'Picos de marea'], ['Pearl orbit', 'Perlenring', 'Anillo de perlas']],
        air: [['Breath core', 'Atemkern', 'Núcleo de aliento'], ['Puff nubs', 'Hauchknubbel', 'Bultos de soplo'], ['Wisp ears', 'Wirbelohren', 'Orejas de brisa'], ['Feather tail', 'Federschweif', 'Cola de pluma'], ['Sky wings', 'Himmelsflügel', 'Alas de cielo'], ['Star crown', 'Sternenkrone', 'Corona de estrellas'], ['Feather mane', 'Federmähne', 'Melena de plumas'], ['Twin feather tails', 'Doppelter Federschweif', 'Dos colas de pluma'], ['Storm spikes', 'Sturmzacken', 'Picos de tormenta'], ['Star orbit', 'Sternenring', 'Anillo de estrellas']],
        earth: [['Seed core', 'Samenkern', 'Núcleo de semilla'], ['Pebble nubs', 'Kieselknubbel', 'Bultos de guijarro'], ['Leaf sprouts', 'Blattsprossen', 'Brotes de hoja'], ['Root tail', 'Wurzelschweif', 'Cola de raíz'], ['Crystal shell', 'Kristallpanzer', 'Caparazón de cristal'], ['Bloom crown', 'Blütenkrone', 'Corona de flor'], ['Crystal mane', 'Kristallmähne', 'Melena de cristal'], ['Twin root tails', 'Doppelter Wurzelschweif', 'Dos colas de raíz'], ['Quartz spikes', 'Quarzzacken', 'Picos de cuarzo'], ['Gem orbit', 'Edelsteinring', 'Anillo de gemas']],
        spirit: [['Glow core', 'Leuchtkern', 'Núcleo de luz'], ['Glow nubs', 'Leuchtknubbel', 'Bultos de luz'], ['Glow ears', 'Leuchtohren', 'Orejas de luz'], ['Glow tail', 'Leuchtschweif', 'Cola de luz'], ['Glow wings', 'Leuchtflügel', 'Alas de luz'], ['Glow crown', 'Leuchtkrone', 'Corona de luz'], ['Glow mane', 'Leuchtmähne', 'Melena de luz'], ['Twin glow tails', 'Doppelter Leuchtschweif', 'Dos colas de luz'], ['Light spikes', 'Lichtzacken', 'Picos de luz'], ['Light orbit', 'Lichtring', 'Anillo de luz']]
    };
    const LI = l => ({ de: 1, es: 2 }[String(l || 'en').slice(0, 2)] || 0);
    function formName(stage, el, lang) {
        const i = clampStage(stage), l = LI(lang), e = ADJ[ELS.includes(el) ? el : 'spirit'][l];
        const s = STAGE[['en', 'de', 'es'][l]][i];
        return l === 1 ? e + '-' + s : l === 2 ? s + ' ' + e : e + ' ' + s;
    }
    function traitName(el, stage, lang) { return TRAITS[ELS.includes(el) ? el : 'spirit'][clampStage(stage)][LI(lang)]; }

    /* ---------- genome: one coherent design from sign + type + stage + seed ---------- */
    function genome(profile, stage, seed) {
        profile = profile || {};
        const sign = profile.sign && typeof profile.sign === 'object' ? profile.sign : null;
        const el = sign && ELS.indexOf(sign.element) >= 0 && sign.element !== 'spirit' ? sign.element : 'spirit';
        const t = normType(profile.personality);
        const pal = profile.palette || {};
        return {
            v: 1, st: clampStage(stage), el,
            a: hex(pal.a) || '#9de6b8', b: hex(pal.b) || '#c7b0ff',
            sh: t ? (t[2] === 'T' ? 'edge' : 'soft') : 'soft',
            sy: t ? (t[3] === 'J' ? 'even' : 'free') : 'even',
            pt: t ? (t[1] === 'S' ? 'band' : 'star') : 'none',
            au: t ? (t[0] === 'E' ? 'wide' : 'close') : 'mid',
            sd: (Math.abs(+seed | 0) % 65536),
            hasSign: !!sign, hasType: !!t
        };
    }

    /* ---------- shared look code (visual only) ---------- */
    const SH = { soft: 's', edge: 'e' }, SY = { even: 'v', free: 'f' }, PT = { none: 'n', band: 'b', star: 's' }, AU = { mid: 'm', wide: 'w', close: 'c' };
    const inv = o => Object.keys(o).reduce((r, k) => (r[o[k]] = k, r), {});
    const SHi = inv(SH), SYi = inv(SY), PTi = inv(PT), AUi = inv(AU);
    function encode(g) {
        if (!g) return '';
        return ['1', clampStage(g.st), ELS.indexOf(g.el) < 0 ? 4 : ELS.indexOf(g.el), (hex(g.a) || '#9de6b8').slice(1), (hex(g.b) || '#c7b0ff').slice(1),
            SH[g.sh] || 's', SY[g.sy] || 'v', PT[g.pt] || 'n', AU[g.au] || 'm', (g.sd | 0).toString(36)].join('.');
    }
    const LOOK_RX = /^1\.([0-9])\.([0-4])\.([0-9a-f]{6})\.([0-9a-f]{6})\.([se])\.([vf])\.([nbs])\.([mwc])\.([0-9a-z]{1,4})$/;
    function decode(s) {
        const m = LOOK_RX.exec(String(s || '').trim().toLowerCase());
        if (!m) return null;
        const sd = parseInt(m[9], 36);
        if (!(sd >= 0 && sd < 65536)) return null;
        return { v: 1, st: +m[1], el: ELS[+m[2]], a: '#' + m[3], b: '#' + m[4], sh: SHi[m[5]], sy: SYi[m[6]], pt: PTi[m[7]], au: AUi[m[8]], sd, shared: true };
    }

    /* ---------- drawing ---------- */
    function rnd(seed) { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
    /* one appendage, base at (0,0), pointing up (-y), length L, half width w */
    function shape(el, edge, L, w) {
        const p = (x, y) => f1(x) + ' ' + f1(y);
        if (el === 'fire') return edge
            ? 'M' + p(-w, 0) + 'L' + p(-w * .55, -L * .5) + 'L' + p(-w * .15, -L * .38) + 'L' + p(0, -L) + 'L' + p(w * .3, -L * .55) + 'L' + p(w * .6, -L * .62) + 'L' + p(w, 0) + 'Z'
            : 'M' + p(-w, 0) + 'C' + p(-w * 1.1, -L * .45) + ' ' + p(-w * .2, -L * .6) + ' ' + p(0, -L) + 'C' + p(w * .25, -L * .7) + ' ' + p(w * .9, -L * .62) + ' ' + p(w * .55, -L * .38) + 'C' + p(w * 1.05, -L * .25) + ' ' + p(w, -L * .1) + ' ' + p(w, 0) + 'Z';
        if (el === 'water') return edge
            ? 'M' + p(-w, 0) + 'L' + p(-w * .2, -L) + 'L' + p(w * .3, -L * .72) + 'L' + p(w, 0) + 'Z'
            : 'M' + p(-w, 0) + 'Q' + p(-w * 1.25, -L * .8) + ' ' + p(0, -L) + 'Q' + p(w * .55, -L * .45) + ' ' + p(w, 0) + 'Z';
        if (el === 'air') return edge
            ? 'M' + p(-w * .6, 0) + 'L' + p(-w * .9, -L * .45) + 'L' + p(-w * .35, -L * .5) + 'L' + p(-w * .5, -L * .8) + 'L' + p(0, -L) + 'L' + p(w * .5, -L * .55) + 'L' + p(w * .6, 0) + 'Z'
            : 'M' + p(-w * .6, 0) + 'C' + p(-w * 1.3, -L * .5) + ' ' + p(-w * .2, -L * .95) + ' ' + p(w * .35, -L) + 'C' + p(w * .1, -L * .8) + ' ' + p(w * .2, -L * .6) + ' ' + p(w * .55, -L * .45) + 'C' + p(w * .7, -L * .25) + ' ' + p(w * .6, -L * .1) + ' ' + p(w * .6, 0) + 'Z';
        if (el === 'earth') return edge
            ? 'M' + p(-w * .7, 0) + 'L' + p(-w, -L * .55) + 'L' + p(0, -L) + 'L' + p(w, -L * .55) + 'L' + p(w * .7, 0) + 'Z'
            : 'M' + p(0, 0) + 'C' + p(-w * 1.4, -L * .3) + ' ' + p(-w * .8, -L * .85) + ' ' + p(0, -L) + 'C' + p(w * .8, -L * .85) + ' ' + p(w * 1.4, -L * .3) + ' ' + p(0, 0) + 'Z';
        return edge
            ? 'M' + p(-w * .7, 0) + 'L' + p(0, -L) + 'L' + p(w * .7, 0) + 'Z'
            : 'M' + p(-w * .7, 0) + 'Q' + p(-w * .9, -L * .9) + ' ' + p(0, -L) + 'Q' + p(w * .9, -L * .9) + ' ' + p(w * .7, 0) + 'Z';
    }
    function vein(el, L) {
        if (el === 'water') return 'M0 0L' + f1(-L * .05) + ' ' + f1(-L * .8) + 'M0 0L' + f1(L * .12) + ' ' + f1(-L * .6);
        if (el === 'earth' || el === 'air') return 'M0 0L0 ' + f1(-L * .85);
        return '';
    }
    /* angle in degrees from straight up, clockwise; d = distance of the base from the centre */
    function put(ang, d, R) {
        const r = ang * Math.PI / 180;
        return { x: CX + Math.sin(r) * d, y: CY - Math.cos(r) * d * .96 };
    }
    function piece(g, cls, ang, len, w, R, side, gid, extra) {
        const free = g.sy === 'free' && side > 0;
        const k = free ? .84 : 1, a = ang + (free ? 9 : 0), o = put(a, R * .86, R);
        const L = len * R * k, W = w * R * k;
        const d = shape(g.el, g.sh === 'edge', L, W), v = vein(g.el, L);
        return '<g class="cf-part ' + cls + '" style="--side:' + side + '" transform="translate(' + f1(o.x) + ' ' + f1(o.y) + ') rotate(' + f1(a) + ')"><path d="' + d + '" fill="url(#' + gid + ')" stroke="#ffffff" stroke-opacity=".55" stroke-width="1.2" stroke-linejoin="round"/>' +
            (v ? '<path d="' + v + '" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="1" stroke-linecap="round"/>' : '') +
            (free && extra ? '<circle cx="' + f1(W * .5) + '" cy="' + f1(-L * 1.05) + '" r="' + f1(R * .03) + '" fill="' + g.b + '" fill-opacity=".8"/>' : '') + '</g>';
    }
    const pair = (g, cls, ang, len, w, R, gid) => piece(g, cls, -ang, len, w, R, -1, gid) + piece(g, cls, ang, len, w, R, 1, gid, true);
    /* traits per stage and element: [angle, length (x R), half width (x R)] */
    const EARS = { fire: [24, .5, .2], water: [92, .5, .24], air: [30, .62, .16], earth: [20, .46, .2], spirit: [28, .42, .16] };
    const WINGS = { fire: [68, .62, .36], water: [110, .58, .34], air: [66, .66, .34], earth: [58, .5, .32], spirit: [70, .58, .3] };
    const PAD = [0, 0, .04, .08, .14, .18, .18, .18, .18, .18]; /* kept for old callers; the frame now comes from FRAME below */
    /* Oct 19 2026 (Eman: "aus diesen kleinen Flossen kriegt er richtig dicke Dinger, kriegt er noch mehr Stein ... es soll immer
       heftiger werden"): every form is clearly more powerful than the last. POWER per form:
       grow   length of ears/fins, tail and wings (x the base size), capped so nothing leaves the frame
       thick  width of the same traits: the little fins turn into big, heavy ones
       stones armour stones round the lower rim and the shoulders (count), stone = their size (x R)
       horn   a pair of pointed shoulder horns from the fifth form (length x R)
       frame  how much room the picture gives round the body (x the cell's own tight frame): young forms sit small in their
              frame, later forms fill it with fins, wings, stones and horns. Pure SVG paths: no new filters or scene effects. */
    const POWER = [
        { grow: 1, thick: 1, stones: 0, stone: 0, horn: 0, frame: 1.22 },
        { grow: 1, thick: 1, stones: 0, stone: 0, horn: 0, frame: 1.15 },
        { grow: 1, thick: 1, stones: 2, stone: .07, horn: 0, frame: 1.08 },
        { grow: 1.3, thick: 1.45, stones: 4, stone: .09, horn: 0, frame: 1.08 },
        { grow: 1.5, thick: 1.8, stones: 6, stone: .11, horn: .3, frame: 1.15 },
        { grow: 1.9, thick: 2.2, stones: 9, stone: .13, horn: .46, frame: 1.23 },
        /* Oct 19 2026, 10 PM (Eman, after reaching Legendary: "we need to add more evolutions ... it should really, truly
           evolve into something majestic looking"): four more forms. The body stays its form-6 size; each new form adds a
           new silhouette piece on top of everything before it:
           mane    blades round the upper body, behind it (count, maneLen = length x R)
           diadem  gold crown spikes round the crest (count; 6 = the tall crown)
           tails   2 = twin tails;  wing3 = a third, fanned pair of wings (scale);  wing/wingW = main wing length/width
           horn2   a second, inner pair of horns (length x R);  flare = a burst of power spikes behind it all (radius x R)
           orbit   a tilted ring of stars round the body, half behind and half in front (the last form, with gold edges) */
        { grow: 2, thick: 2.3, stones: 11, stone: .14, horn: .54, mane: 11, maneLen: .3, diadem: 4, wing: 1.35, wingW: 1.45, frame: 1.27 },
        { grow: 2.1, thick: 2.4, stones: 13, stone: .145, horn: .6, mane: 13, maneLen: .36, diadem: 4, tails: 2, wing3: 1, wing: 1.42, wingW: 1.5, frame: 1.32 },
        { grow: 2.2, thick: 2.4, stones: 13, stone: .155, horn: .66, horn2: .36, mane: 13, maneLen: .4, diadem: 6, tails: 2, wing3: 1.1, flare: 1.5, wing: 1.48, wingW: 1.58, frame: 1.4 },
        { grow: 2.3, thick: 2.4, stones: 13, stone: .165, horn: .72, horn2: .44, mane: 15, maneLen: .44, diadem: 6, tails: 2, wing3: 1.2, flare: 1.62, orbit: 1, wing: 1.52, wingW: 1.66, frame: 1.46 }
    ];
    const power = st => Object.assign({}, POWER[clampStage(st)]);
    const EAR_MAX = .8; /* ear/fin length cap (x R) so the last form still fits its frame */
    /* stone angles (deg from straight up): lower rim first, then the shoulders; the face (centre) stays clear */
    const STONE_AT = [150, 210, 125, 235, 180, 100, 260, 75, 285, 165, 195, 112, 248];
    function stone(x, y, s, rot, g, k) {
        const p = [[0, -1], [.82, -.5], [.9, .45], [.2, 1], [-.7, .7], [-.92, -.2]].map(q => f1(q[0] * s) + ' ' + f1(q[1] * s)).join('L');
        return '<g class="cf-stone" style="--k:' + k + '" transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + f1(rot) + ')"><path d="M' + p + 'Z" fill="' + g.b + '" fill-opacity=".92" stroke="#1b1035" stroke-opacity=".55" stroke-width="1.3" stroke-linejoin="round"/>' +
            '<path d="M' + f1(-.5 * s) + ' ' + f1(-.45 * s) + 'L' + f1(.15 * s) + ' ' + f1(-.7 * s) + 'L' + f1(.5 * s) + ' ' + f1(-.2 * s) + '" fill="none" stroke="#ffffff" stroke-opacity=".8" stroke-width="1.2" stroke-linecap="round"/></g>';
    }
    /* forms 7-10 (Oct 19 2026 night): new silhouette pieces. Pure SVG paths, no filters. */
    function blade(L, w) { return 'M' + f1(-w) + ' 0Q' + f1(-w * .7) + ' ' + f1(-L * .55) + ' 0 ' + f1(-L) + 'Q' + f1(w * .7) + ' ' + f1(-L * .55) + ' ' + f1(w) + ' 0Z'; }
    function mane(g, R, n, len, id) {
        let m = '';
        for (let k = 0; k < n; k++) {
            const a = -112 + k * 224 / (n - 1), o = put(a, R * .8, R), L = R * len * (k % 2 ? .78 : 1) * (Math.abs(a) < 20 ? .7 : 1);
            m += '<path style="--k:' + k + '" transform="translate(' + f1(o.x) + ' ' + f1(o.y) + ') rotate(' + f1(a) + ')" d="' + blade(L, R * .085) + '"/>';
        }
        return '<g class="cf-mane" fill="url(#' + id + ')" stroke="#ffffff" stroke-opacity=".5" stroke-width="1.1" stroke-linejoin="round">' + m + '</g>';
    }
    function diadem(g, R, n, st) {
        const tall = n >= 6, at = tall ? [-54, -36, -18, 18, 36, 54] : [-36, -18, 18, 36];
        let s = '';
        at.forEach((a, k) => {
            const o = put(a, R * .9, R), L = R * (tall ? [.24, .34, .46, .46, .34, .24][k] : [.2, .3, .3, .2][k]);
            s += '<g transform="translate(' + f1(o.x) + ' ' + f1(o.y) + ') rotate(' + f1(a) + ')"><path d="M' + f1(-R * .06) + ' 0L0 ' + f1(-L) + 'L' + f1(R * .06) + ' 0Z"/><circle cy="' + f1(-L * .3) + '" r="' + f1(R * .024) + '" fill="' + g.b + '" stroke="none"/></g>';
        });
        return '<g class="cf-diadem" fill="#ffd36e" stroke="#fff6d8" stroke-width="1" stroke-linejoin="round">' + s + '</g>';
    }
    function flare(g, R, r, st, id) {
        const star = (n, ro, ri, off) => { let d = ''; for (let k = 0; k < n * 2; k++) { const p = put(off + k * 180 / n, (k % 2 ? ri : ro) * R, R); d += (k ? 'L' : 'M') + f1(p.x) + ' ' + f1(p.y); } return d + 'Z'; };
        return '<g class="cf-flare"><path d="' + star(14, r, 1.08, 0) + '" fill="' + g.b + '" fill-opacity=".2" stroke="' + g.b + '" stroke-opacity=".7" stroke-width="1.6" stroke-linejoin="round"/>' +
            '<path d="' + star(14, r * .84, 1.02, 180 / 14) + '" fill="url(#' + id + ')" fill-opacity=".35" stroke="#ffffff" stroke-opacity=".35" stroke-width="1"/></g>';
    }
    /* a tilted ring of stars: the far half is drawn behind the body, the near half in front */
    function orbit(g, R, near) {
        const cy = CY + R * .2, rx = R * 1.5, ry = R * .36, tilt = -12;
        const arc = near ? 'M' + f1(CX + rx) + ' ' + f1(cy) + 'A' + f1(rx) + ' ' + f1(ry) + ' 0 0 1 ' + f1(CX - rx) + ' ' + f1(cy) : 'M' + f1(CX - rx) + ' ' + f1(cy) + 'A' + f1(rx) + ' ' + f1(ry) + ' 0 0 1 ' + f1(CX + rx) + ' ' + f1(cy);
        let s = '';
        for (let k = 0; k < 8; k++) {
            const t = (k + .5) * Math.PI * 2 / 8, front = Math.sin(t) > 0;
            if (front !== near) continue;
            const x = CX + Math.cos(t) * rx, y = cy + Math.sin(t) * ry, z = (front ? 1.25 : .85) * R / 94;
            s += '<path style="--k:' + k + '" transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + f1(z) + ')" d="M0 -7L1.8 -1.8 7 0 1.8 1.8 0 7 -1.8 1.8 -7 0 -1.8 -1.8Z"/>';
        }
        return '<g class="cf-orbit' + (near ? ' cf-orbit-near' : ' cf-orbit-far') + '" transform="rotate(' + tilt + ' ' + CX + ' ' + f1(cy) + ')"><path d="' + arc + '" fill="none" stroke="#ffe6a2" stroke-opacity="' + (near ? '.85' : '.5') + '" stroke-width="' + (near ? '2.4' : '1.6') + '"/><g fill="#fff6d8" stroke="#ffd36e" stroke-width=".8">' + s + '</g></g>';
    }
    function layers(g, R, opts) {
        opts = opts || {};
        if (!g) return { back: '', front: '', defs: '' };
        const st = clampStage(g.st), id = (opts.id || 'cf') + 'g', rr = rnd(97 + g.sd), P = POWER[st];
        const defs = '<linearGradient id="' + id + '" x1="0" y1="1" x2="0" y2="0"><stop stop-color="' + g.a + '" stop-opacity=".9"/><stop offset="1" stop-color="' + g.b + '" stop-opacity=".85"/></linearGradient>' +
            '<radialGradient id="' + id + 'h"><stop offset=".5" stop-color="' + g.b + '" stop-opacity=".28"/><stop offset="1" stop-color="' + g.b + '" stop-opacity="0"/></radialGradient>';
        let back = '', front = '';
        /* aura (E/I) */
        if (g.au === 'close') back += '<ellipse class="cf-aura cf-aura-close" cx="' + CX + '" cy="' + CY + '" rx="' + f1(R * 1.16) + '" ry="' + f1(R * 1.12) + '" fill="url(#' + id + 'h)"/>';
        if (g.au === 'wide' && st >= 1) {
            let dots = '';
            const n = 6 + st;
            for (let k = 0; k < n; k++) { const p = put(k * 360 / n + rr() * 14, R * 1.42, R); dots += '<path style="--k:' + k + '" transform="translate(' + f1(p.x) + ' ' + f1(p.y) + ')" d="M0 -3.4L1 -1 3.4 0 1 1 0 3.4 -1 1 -3.4 0 -1 -1Z"/>'; }
            back += '<g class="cf-aura cf-aura-wide" fill="' + g.b + '" fill-opacity=".75">' + dots + '</g>';
        }
        /* calm glow while the body is between meals (driven by CSS var --cf-calm) */
        back += '<ellipse class="cf-calm" cx="' + CX + '" cy="' + CY + '" rx="' + f1(R * 1.3) + '" ry="' + f1(R * 1.26) + '" fill="none" stroke="#9ff7ff" stroke-width="3"/>';
        /* creature traits, oldest behind; each form makes them longer and much thicker */
        const W = WINGS[g.el], E = EARS[g.el], wg = P.wing || (st >= 5 ? 1.25 : 1), ww = P.wingW || (st >= 5 ? 1.35 : 1), w2 = st >= 6 ? 1.12 : 1;
        if (P.flare) back += flare(g, R, P.flare, st, id);
        if (st >= 5) back += pair(g, 'cf-wing2', (W[0] + 40), W[1] * .62 * 1.2 * w2, W[2] * .7 * 1.25 * w2, R, id);
        if (P.wing3) back += pair(g, 'cf-wing3', (W[0] + 20), W[1] * .8 * P.wing3, W[2] * .8 * P.wing3, R, id);
        if (st >= 4) back += pair(g, 'cf-wing', W[0], W[1] * wg, W[2] * ww, R, id);
        if (P.mane) back += mane(g, R, P.mane, P.maneLen, id);
        const tl = (g.el === 'water' ? .55 : .6) * Math.min(1.5, P.grow * .8 + .2), tw = (g.el === 'air' ? .2 : .24) * Math.min(1.6, P.thick * .7 + .3);
        if (st >= 3 && P.tails === 2) back += pair(g, 'cf-tail', 160, tl, tw * .85, R, id);
        else if (st >= 3) back += piece(g, 'cf-tail', g.sy === 'free' ? 158 : 180, tl, tw, R, 0, id);
        if (P.horn2) back += pair(g, 'cf-horn2', 36, P.horn2, P.horn2 * .34, R, id);
        if (st >= 4 && P.horn) back += pair(g, 'cf-horn', 58, P.horn, P.horn * .36, R, id);
        if (P.orbit) back += orbit(g, R, false);
        if (st >= 2) back += pair(g, 'cf-ear', E[0], Math.min(EAR_MAX, E[1] * P.grow), E[2] * P.thick, R, id);
        else if (st === 1) back += pair(g, 'cf-nub', 34, .26, .15, R, id);
        /* markings (S/N) on the membrane from the third form */
        if (st >= 2 && g.pt === 'band') {
            let b = '';
            [-.28, .02, .32].forEach((dy, k) => { const y = CY + dy * R, hw = Math.sqrt(Math.max(0, 1 - dy * dy)) * R * .78; b += '<path d="M' + f1(CX - hw) + ' ' + f1(y + R * .05) + 'Q' + CX + ' ' + f1(y - R * .1) + ' ' + f1(CX + hw) + ' ' + f1(y + R * .05) + '"' + (k === 1 ? ' stroke-width="3.2"' : '') + '/>'; });
            front += '<g class="cf-mark cf-band" fill="none" stroke="' + g.b + '" stroke-opacity=".42" stroke-width="2.2" stroke-linecap="round">' + b + '</g>';
        }
        if (st >= 2 && g.pt === 'star') {
            let s = '';
            for (let k = 0; k < 6; k++) { const a = rr() * Math.PI * 2, d = R * (.35 + rr() * .4), x = CX + Math.cos(a) * d, y = CY + Math.sin(a) * d * .9, z = 1.6 + rr() * 1.4; s += '<path transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + f1(z) + ')" d="M0 -2L.5 -.5 2 0 .5 .5 0 2 -.5 .5 -2 0 -.5 -.5Z"/>'; }
            front += '<g class="cf-mark cf-star" fill="#ffffff" fill-opacity=".7">' + s + '</g>';
        }
        /* crest from the fifth form; moves to the sides when a hat sits on top */
        if (st >= 4) front += opts.hat ? pair(g, 'cf-crest', 46, .3, .1, R, id) : piece(g, 'cf-crest', 0, .42, .14, R, 0, id);
        /* gold crown spikes from form 7 (replace the motes); none under a hat */
        if (P.diadem && !opts.hat) front += diadem(g, R, P.diadem, st);
        /* crown motes, form 6 only */
        if (st === 5 || (st >= 6 && opts.hat)) {
            let m = '';
            for (let k = 0; k < 5; k++) { const p = put(-60 + k * 30, R * 1.32, R); m += '<circle style="--k:' + k + '" cx="' + f1(p.x) + '" cy="' + f1(p.y) + '" r="' + f1(R * .045) + '"/>'; }
            front += '<g class="cf-crown" fill="#ffe6a2" stroke="#fff6d8" stroke-width=".8">' + m + '</g>';
        }
        /* armour stones from the third form: more and bigger each form, round the rim, never on the face */
        if (P.stones) {
            let sg = '';
            for (let k = 0; k < P.stones; k++) { const p = put(STONE_AT[k], R * .9, R); sg += stone(p.x, p.y, R * P.stone * (1 + ((k * 37 + g.sd) % 5) * .06), STONE_AT[k] + (rr() * 30 - 15), g, k); }
            front += '<g class="cf-stones">' + sg + '</g>';
        }
        if (P.orbit) front += orbit(g, R, true);
        /* reactions: hidden until html[data-cf-react] says so */
        const sx = CX + R * .66, sy = CY - R * .5;
        front += '<g class="cf-rx cf-rx-brace"><path d="M' + f1(sx) + ' ' + f1(sy - 9) + 'C' + f1(sx + 6) + ' ' + f1(sy) + ' ' + f1(sx + 5) + ' ' + f1(sy + 6) + ' ' + f1(sx) + ' ' + f1(sy + 6) + 'C' + f1(sx - 5) + ' ' + f1(sy + 6) + ' ' + f1(sx - 6) + ' ' + f1(sy) + ' ' + f1(sx) + ' ' + f1(sy - 9) + 'Z" fill="#9fe6ff" stroke="#ffffff" stroke-width="1"/>' +
            '<path d="M' + f1(CX - R * .78) + ' ' + f1(CY - R * .82) + 'l4 9M' + f1(CX - R * .62) + ' ' + f1(CY - R * .95) + 'l1 10" stroke="#ffd36e" stroke-width="2.6" stroke-linecap="round"/></g>' +
            '<g class="cf-rx cf-rx-cheer" fill="#ffe6a2">' + [[-1.05, -.7], [1.08, -.62], [-.95, .55], [1.0, .5]].map((q, k) => '<path style="--k:' + k + '" transform="translate(' + f1(CX + q[0] * R) + ' ' + f1(CY + q[1] * R) + ')" d="M0 -6L1.6 -1.6 6 0 1.6 1.6 0 6 -1.6 1.6 -6 0 -1.6 -1.6Z"/>').join('') + '</g>' +
            '<g class="cf-rx cf-rx-okay" fill="#b6f5a8"><circle cx="' + f1(CX + R * .9) + '" cy="' + f1(CY - R * .7) + '" r="3"/><circle cx="' + f1(CX + R * 1.02) + '" cy="' + f1(CY - R * .9) + '" r="2"/></g>';
        return { back: '<g class="cf-back cf-el-' + g.el + ' cf-st' + st + '">' + back + '</g>', front: '<g class="cf-front cf-st' + st + '">' + front + '</g>', defs };
    }

    /* add the form to Misty's composed cell SVG string (from cell-world compose) */
    function apply(svg, g, opts) {
        if (typeof svg !== 'string' || !g || svg.indexOf('cw-cell') < 0 || svg.indexOf('cf-back') >= 0) return svg;
        const bodyAt = svg.indexOf('<g class="lh-creature">'), faceAt = svg.indexOf('<g class="cw-face"'), defsEnd = svg.indexOf('</defs>');
        if (bodyAt < 0 || faceAt < 0 || defsEnd < 0 || !(defsEnd < bodyAt && bodyAt < faceAt)) return svg;
        const rm = /class="lh-body cw-wall" cx="[\d.]+" cy="[\d.]+" rx="([\d.]+)"/.exec(svg);
        const R = rm ? +rm[1] : CELL_R[clampStage(g.st)];
        const idm = /id="([a-z0-9]+)cyto"/i.exec(svg), id = (idm ? idm[1] : 'cf') + 'f';
        const hat = HAT_IDS.some(h => svg.indexOf('lh-acc-' + h) >= 0);
        const L = layers(g, R, { id, hat: hat || (opts && opts.hat) });
        const open = svg.slice(0, svg.indexOf('>') + 1);
        let tag = open.replace('class="tmg-plant', 'class="tmg-plant cf-form cf-el-' + g.el);
        /* Oct 19 2026: the frame round the cell scales per form (POWER.frame) about the body's centre: young forms sit small,
           later forms fill it with their big traits (each user's own body, colours and face stay as they are) */
        const fr = POWER[clampStage(g.st)].frame;
        tag = tag.replace(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/, (m0, x, y, w, h) => { x = +x; y = +y; w = +w; h = +h; const nw = w * fr, nh = h * fr; return 'viewBox="' + f1(CX - (CX - x) * fr) + ' ' + f1(CY - (CY - y) * fr) + ' ' + f1(nw) + ' ' + f1(nh) + '"'; });
        tag = tag.replace('class="tmg-plant cf-form', 'data-cf-st="' + clampStage(g.st) + '" class="tmg-plant cf-form');
        return tag + svg.slice(open.length, defsEnd) + L.defs + svg.slice(defsEnd, bodyAt) + L.back + svg.slice(bodyAt, faceAt) + L.front + svg.slice(faceAt);
    }

    /* a small stand-alone companion for friends (their own shared look) */
    function miniSVG(g, id) {
        if (!g) return '';
        const st = clampStage(g.st), R = CELL_R[st], pad = st >= 3 ? Math.round((R + 46) * Math.max(1.18, POWER[st].frame) - R) : 46, L = layers(g, R, { id: String(id || 'm').replace(/[^a-z0-9]/gi, '') + 'm' });
        const gid = String(id || 'm').replace(/[^a-z0-9]/gi, '') + 'mb';
        const vb = (CX - R - pad) + ' ' + (CY - R - pad) + ' ' + (2 * (R + pad)) + ' ' + (2 * (R + pad));
        const ey = CY + R * .08, ex = R * .26, er = R * .085;
        return '<svg class="cf-mini cf-el-' + g.el + '" viewBox="' + vb + '" aria-hidden="true" focusable="false"><defs>' + L.defs +
            '<radialGradient id="' + gid + '" cx=".4" cy=".38" r=".7"><stop stop-color="#ffffff" stop-opacity=".35"/><stop offset=".55" stop-color="' + g.a + '" stop-opacity=".55"/><stop offset="1" stop-color="' + g.b + '" stop-opacity=".75"/></radialGradient></defs>' +
            L.back + '<ellipse cx="' + CX + '" cy="' + CY + '" rx="' + R + '" ry="' + f1(R * .96) + '" fill="url(#' + gid + ')" stroke="#ffffff" stroke-opacity=".75" stroke-width="2"/>' + L.front +
            '<circle cx="' + f1(CX - ex) + '" cy="' + f1(ey) + '" r="' + f1(er) + '" fill="#1b1035"/><circle cx="' + f1(CX + ex) + '" cy="' + f1(ey) + '" r="' + f1(er) + '" fill="#1b1035"/>' +
            '<circle cx="' + f1(CX - ex + er * .35) + '" cy="' + f1(ey - er * .35) + '" r="' + f1(er * .35) + '" fill="#fff"/><circle cx="' + f1(CX + ex + er * .35) + '" cy="' + f1(ey - er * .35) + '" r="' + f1(er * .35) + '" fill="#fff"/>' +
            '<path d="M' + f1(CX - R * .14) + ' ' + f1(ey + R * .2) + 'Q' + CX + ' ' + f1(ey + R * .32) + ' ' + f1(CX + R * .14) + ' ' + f1(ey + R * .2) + '" fill="none" stroke="#1b1035" stroke-width="' + f1(R * .045) + '" stroke-linecap="round"/></svg>';
    }

    /* ---------- reactions + calm ---------- */
    /* meal level (low/medium/high), cell verdict (low/medium/spike) or scan verdict (ok/better/spike) -> reaction */
    function reaction(v) {
        v = String(v || '').toLowerCase();
        if (v === 'high' || v === 'spike') return 'brace';
        if (v === 'medium' || v === 'better') return 'okay';
        if (v === 'low' || v === 'ok') return 'cheer';
        return '';
    }
    const RANK = { brace: 3, okay: 2, cheer: 1, '': 0 };
    /* two events can report the same meal: keep the stronger reaction inside 2 s */
    function merge(prev, next, now) {
        if (!next) return prev || null;
        if (prev && now - prev.at < 2000 && RANK[prev.k] >= RANK[next]) return prev;
        return { k: next, at: now };
    }
    /* hours since the last meal -> calm glow 0..1. Rises from 3 h, full at 12 h, then stays flat: nothing more for longer */
    function calm(hours) {
        if (!(hours >= 3)) return 0;
        return Math.round(Math.min(1, (hours - 3) / 9) * 100) / 100;
    }
    function fastHours(fast, now) {
        if (!fast || typeof fast !== 'object') return null;
        const h = Array.isArray(fast.hist) ? fast.hist : [], pe = h.length ? +h[h.length - 1].e || 0 : 0;
        const s = Math.max(+fast.last || 0, pe);
        now = +now || Date.now();
        if (!s || s > now) return null;
        return (now - s) / 36e5;
    }

    /* evolution path for the sheet: thresholds come from the existing herb stages */
    function path(stages, xp, retained, el, lang) {
        const cur = clampStage(retained);
        return (stages || []).slice(0, MAX_ST + 1).map((s, i) => ({
            i, xp: +s.xp || 0, name: formName(i, el, lang), trait: traitName(el, i, lang),
            reached: i <= cur, current: i === cur, left: Math.max(0, Math.ceil((+s.xp || 0) - (+xp || 0)))
        }));
    }

    const api = { MAX_ST, ELS, CELL_R, PAD, POWER, power, STONE_AT, HAT_IDS, normType, genome, encode, decode, layers, apply, miniSVG, reaction, merge, calm, fastHours, formName, traitName, path, clampStage };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.LowiCompanionCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
