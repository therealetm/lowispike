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
    /* Oct 21 2026: what each form grows, named after the new body plan (shown in the Forms path) */
    const TRAITS = [
        ['glow core', 'Leuchtkern', 'núcleo de luz'], ['cilia and buds', 'Wimpern und Knospen', 'cilios y brotes'], ['whip tail', 'Geißelschweif', 'cola de látigo'],
        ['filament tails', 'Fadenschweife', 'colas de filamento'], ['membrane sail', 'Membransegel', 'vela de membrana'], ['reef arms', 'Riffarme', 'brazos de arrecife'],
        ['coral crown', 'Korallenkrone', 'corona de coral'], ['celestial bell', 'Himmelsglocke', 'campana celeste'], ['organelle orbits', 'Organellenbahnen', 'órbitas de orgánulos'],
        ['star corona', 'Sternenkorona', 'corona estelar']
    ];
    const LI = l => ({ de: 1, es: 2 }[String(l || 'en').slice(0, 2)] || 0);
    function formName(stage, el, lang) {
        const i = clampStage(stage), l = LI(lang), e = ADJ[ELS.includes(el) ? el : 'spirit'][l];
        const s = STAGE[['en', 'de', 'es'][l]][i];
        return l === 1 ? e + '-' + s : l === 2 ? s + ' ' + e : e + ' ' + s;
    }
    function traitName(el, stage, lang) {
        const l = LI(lang), e = ADJ[ELS.includes(el) ? el : 'spirit'][l], t = TRAITS[clampStage(stage)][l];
        return l === 1 ? e + '-' + t : l === 2 ? t + ' ' + e : e + ' ' + t;
    }

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
    /* 23 Oct 2026 (Eman: "show their name, the names they chose for their companions"): the chosen companion name rides on the
       shared look code after a "~", URI-encoded, at most 24 characters. A look without it still decodes (the name is then ''). */
    function cleanName(s) {
        return String(s == null ? '' : s).normalize('NFC').replace(/[\u0000-\u001f\u007f<>"'`~\\{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24).trim();
    }
    function withName(code, name) { const n = cleanName(name); code = String(code || ''); return code && n ? code + '~' + encodeURIComponent(n) : code; }
    function nameOf(s) {
        s = String(s || ''); const i = s.indexOf('~'); if (i < 0) return '';
        try { return cleanName(decodeURIComponent(s.slice(i + 1))); } catch (e) { return ''; }
    }
    function decode(s) {
        s = String(s || '').trim();
        const nm = nameOf(s), cut = s.indexOf('~');
        const m = LOOK_RX.exec((cut < 0 ? s : s.slice(0, cut)).toLowerCase());
        if (!m) return null;
        const sd = parseInt(m[9], 36);
        if (!(sd >= 0 && sd < 65536)) return null;
        const g = { v: 1, st: +m[1], el: ELS[+m[2]], a: '#' + m[3], b: '#' + m[4], sh: SHi[m[5]], sy: SYi[m[6]], pt: PTi[m[7]], au: AUi[m[8]], sd, shared: true };
        if (nm) g.nm = nm;
        return g;
    }

    /* ---------- drawing ---------- */
    function rnd(seed) { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
    /* angle in degrees from straight up, clockwise; d = distance of the base from the centre */
    function put(ang, d, R) {
        const r = ang * Math.PI / 180;
        return { x: CX + Math.sin(r) * d, y: CY - Math.cos(r) * d * .96 };
    }
    /* Oct 21 2026 (Eman, on the old forms: "That's boring ... not very Pokemon like ... you can really go big here ... like Digimon
       ... in our own design with cellular metabolic"): the fins, armour stones and horns stuck on a bubble are replaced by an
       organism that really changes its body plan. Approved path: a simple glowing cell -> a swimming filament creature -> a
       many-limbed reef spirit -> a massive celestial organism with orbiting organelles. The luminous core (the user's own
       generated cell with its face and colours) and the family palette stay; the anatomy round it changes every form.
       ANATOMY per form (lengths x R, the body radius):
       cilia [count, length]  hair-fine cilia round the membrane       bud   daughter vesicles budding off (count)
       flag  [count, length]  long whip filaments trailing behind     fin   [length, width] membrane fins with rays; fin2 = a second pair
       sail  dorsal membrane sail (height)                             hood  streamlined outer membrane round body and tails
       limbs [count, length]  curling reef arms with glowing dots     coral branching coral crown (branches)
       frill scalloped mantle behind the body                          bell  the celestial bell with rim lights
       orbs  organelles on tilted orbits (count), rings 1 or 2         corona star filaments and a halo behind it all
       gold  golden edges (the last form)
       frame room round the body (x the cell's own frame). tests/evolution-anatomy.test.cjs measures every piece inside it.
       Pure SVG paths: no filters, no blur, nothing in the 3D scene; transform/opacity animations only. */
    const ANATOMY = [
        { cilia: [14, .13], frame: 1.12 },
        { cilia: [18, .16], bud: 2, frame: 1.12 },
        { cilia: [16, .16], flag: [1, 1.05], fin: [.34, .2], frame: 1.2 },
        { cilia: [9, .15], flag: [3, 1.2], fin: [.48, .3], hood: 1, frame: 1.26 },
        { cilia: [7, .15], flag: [5, 1.3], fin: [.56, .34], fin2: 1, sail: .52, hood: 1.08, frame: 1.4 },
        { limbs: [8, 1.12], coral: 3, frill: 1, fin: [.46, .3], frame: 1.4 },
        { limbs: [10, 1.22], coral: 5, frill: 1.12, fin: [.54, .34], frame: 1.43 },
        { limbs: [12, 1.05], flag: [2, 1.3], coral: 5, bell: 1, orbs: 3, rings: 1, frame: 1.45 },
        { limbs: [12, 1.1], flag: [2, 1.36], coral: 7, bell: 1.08, orbs: 5, rings: 2, corona: 1, frame: 1.48 },
        { limbs: [14, 1.14], flag: [4, 1.4], coral: 7, bell: 1.15, orbs: 7, rings: 2, corona: 1.12, gold: 1, frame: 1.52 }
    ];
    const POWER = ANATOMY; /* old name, kept for callers that read POWER[st].frame */
    const PAD = [0, 0, .04, .08, .14, .18, .18, .18, .18, .18]; /* kept for old callers; the frame comes from ANATOMY */
    const power = st => Object.assign({}, ANATOMY[clampStage(st)]);
    const STONE_AT = []; /* the armour stones are gone (Oct 21 2026); kept empty for old callers */
    const pt = p => f1(p.x) + ' ' + f1(p.y);
    /* a tapered filled ribbon along a centre line: the body of every tail, arm and filament */
    function ribbon(pts, w0, w1) {
        const a = [], b = [];
        for (let i = 0; i < pts.length; i++) {
            const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)], dx = q.x - p.x, dy = q.y - p.y, m = Math.hypot(dx, dy) || 1;
            const nx = -dy / m, ny = dx / m, w = w0 + (w1 - w0) * i / (pts.length - 1);
            a.push(f1(pts[i].x + nx * w) + ' ' + f1(pts[i].y + ny * w)); b.push(f1(pts[i].x - nx * w) + ' ' + f1(pts[i].y - ny * w));
        }
        return 'M' + a.join('L') + 'L' + b.reverse().join('L') + 'Z';
    }
    /* centre line leaving the rim at angle ang (deg from straight up, clockwise): len x R long, waving amp x R, curling at the end */
    function wave(R, ang, len, amp, waves, ph, curl) {
        const r = ang * Math.PI / 180, ux = Math.sin(r), uy = -Math.cos(r), o = put(ang, R * .82, R), pts = [];
        for (let i = 0; i <= 18; i++) {
            const t = i / 18, d = t * len * R, s = Math.sin(ph + t * waves * Math.PI * 2) * amp * R * t + (curl || 0) * R * t * t * t;
            pts.push({ x: o.x + ux * d - uy * s, y: o.y + uy * d + ux * s });
        }
        return pts;
    }
    /* a fan of membrane centred on -y: L long, opening spread degrees, n scallops; edge personalities get pointed tips */
    function fan(L, spread, n, edge) {
        let d = 'M0 0', rays = '';
        for (let k = 0; k <= n; k++) {
            const a = (-spread / 2 + spread * k / n) * Math.PI / 180, x = Math.sin(a) * L, y = -Math.cos(a) * L;
            if (!k) d += 'L' + f1(x) + ' ' + f1(y);
            else {
                const am = (-spread / 2 + spread * (k - .5) / n) * Math.PI / 180, cx = Math.sin(am) * L * (edge ? .8 : .88), cy = -Math.cos(am) * L * (edge ? .8 : .88);
                d += edge ? 'L' + f1(cx) + ' ' + f1(cy) + 'L' + f1(x) + ' ' + f1(y) : 'Q' + f1(cx) + ' ' + f1(cy) + ' ' + f1(x) + ' ' + f1(y);
            }
            rays += 'M0 0L' + f1(x * .92) + ' ' + f1(y * .92);
        }
        return { d: d + 'Z', rays };
    }
    function cilia(g, R, n, len, a0, a1) {
        let d = '';
        for (let k = 0; k < n; k++) {
            const a = a0 + (a1 - a0) * (k + .5) / n, p = put(a, R * .97, R), c = put(a - 7, R * (1 + len * .55), R), q = put(a + 6, R * (1 + len), R);
            d += 'M' + pt(p) + 'Q' + pt(c) + ' ' + pt(q);
        }
        return '<path class="cf-cilia" d="' + d + '" fill="none" stroke="' + g.b + '" stroke-opacity=".9" stroke-width="' + f1(Math.max(1.6, R * .026)) + '" stroke-linecap="round"/>';
    }
    function buds(g, R, n, id) {
        let s = '';
        [[138, .2], [222, .14], [96, .1]].slice(0, n).forEach((b, k) => { const p = put(b[0], R * (1 + b[1] * .55), R); s += '<circle style="--k:' + k + '" cx="' + f1(p.x) + '" cy="' + f1(p.y) + '" r="' + f1(R * b[1]) + '"/>'; });
        return '<g class="cf-bud" fill="url(#' + id + ')" fill-opacity=".8" stroke="#ffffff" stroke-opacity=".7" stroke-width="1.3">' + s + '</g>';
    }
    const spreadAt = (n, mid, step) => Array.from({ length: n }, (_, k) => mid + (k - (n - 1) / 2) * step);
    function flags(g, R, n, len, id, gold) {
        let s = '';
        spreadAt(n, 180, n > 3 ? 17 : 20).forEach((a, k) => {
            const pts = wave(R, a + (g.sy === 'free' ? 6 : 0), len * (k % 2 ? .9 : 1), .13, 1.3, k * 1.7, (a < 180 ? -1 : 1) * .12);
            s += '<path style="--k:' + k + '" d="' + ribbon(pts, R * .075, R * .012) + '"/>';
        });
        return '<g class="cf-flag" fill="url(#' + id + ')" fill-opacity=".9" stroke="' + (gold ? '#ffe6a2' : '#ffffff') + '" stroke-opacity=".55" stroke-width="1" stroke-linejoin="round">' + s + '</g>';
    }
    function fins(g, R, f, ang, cls, id) {
        const L = f[0] * R, sp = 60 + f[1] * 70, F = fan(L, sp, 5, g.sh === 'edge');
        return [-1, 1].map(side => { const a = side * ang, o = put(a, R * .9, R);
            return '<g class="' + cls + '" style="--side:' + side + '" transform="translate(' + pt(o) + ') rotate(' + f1(a) + ')"><path d="' + F.d + '" fill="url(#' + id + ')" fill-opacity=".55" stroke="#ffffff" stroke-opacity=".6" stroke-width="1.2" stroke-linejoin="round"/><path d="' + F.rays + '" fill="none" stroke="#ffffff" stroke-opacity=".4" stroke-width="1"/></g>';
        }).join('');
    }
    function sail(g, R, h, id) {
        const F = fan(h * R, 76, 7, g.sh === 'edge'), o = put(0, R * .92, R);
        return '<g class="cf-sail" transform="translate(' + pt(o) + ')"><path d="' + F.d + '" fill="url(#' + id + ')" fill-opacity=".5" stroke="#ffffff" stroke-opacity=".6" stroke-width="1.2" stroke-linejoin="round"/><path d="' + F.rays + '" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="1"/></g>';
    }
    /* the swimmer's streamlined outer membrane: body and tails inside one teardrop */
    function hood(g, R, h, id) {
        const t = CY - R * 1.13, w = R * 1.42, b = CY + R * (1.05 + .55 * h);
        const d = 'M' + CX + ' ' + f1(t) + 'C' + f1(CX + w) + ' ' + f1(t + R * .05) + ' ' + f1(CX + R * 1.12) + ' ' + f1(CY + R * .85) + ' ' + CX + ' ' + f1(b) +
            'C' + f1(CX - R * 1.12) + ' ' + f1(CY + R * .85) + ' ' + f1(CX - w) + ' ' + f1(t + R * .05) + ' ' + CX + ' ' + f1(t) + 'Z';
        return '<path class="cf-hood" d="' + d + '" fill="url(#' + id + ')" fill-opacity=".2" stroke="' + g.b + '" stroke-opacity=".75" stroke-width="1.8"/>';
    }
    function limbs(g, R, n, len, id, gold) {
        let s = '', dots = '';
        spreadAt(n, 180, Math.min(19, 150 / Math.max(1, n - 1))).forEach((a, k) => {
            const side = a < 180 ? -1 : 1, L = len * (k % 2 ? .8 : 1) * (Math.abs(a - 180) > 55 ? .82 : 1);
            const pts = wave(R, a + (g.sy === 'free' ? 5 : 0), L, .09, .8, k * 1.3, side * .38);
            s += '<path style="--k:' + k + '" d="' + ribbon(pts, R * .1, R * .022) + '"/>';
            [6, 11, 15].forEach(i => { dots += '<circle cx="' + f1(pts[i].x) + '" cy="' + f1(pts[i].y) + '" r="' + f1(R * (.032 - i * .0012)) + '"/>'; });
        });
        return '<g class="cf-limbs"><g fill="url(#' + id + ')" fill-opacity=".92" stroke="' + (gold ? '#ffe6a2' : '#ffffff') + '" stroke-opacity=".55" stroke-width="1.1" stroke-linejoin="round">' + s + '</g><g class="cf-glow" fill="#ffffff" fill-opacity=".85">' + dots + '</g></g>';
    }
    /* branching coral crown on top of the head: Y-branches with glowing tips */
    function coral(g, R, n, gold) {
        let d = '', tips = '';
        spreadAt(n, 0, n > 5 ? 17 : 22).forEach((a, k) => {
            const L = R * (.34 + (k % 2 ? 0 : .1)) * (1 - Math.abs(a) / 150), o = put(a, R * .9, R), m = put(a, R * .9 + L, R);
            const r = a * Math.PI / 180, br = (s2) => ({ x: m.x + Math.sin(r + s2 * .55) * L * .55, y: m.y - Math.cos(r + s2 * .55) * L * .55 });
            const l = br(-1), q = br(1), top = { x: m.x + Math.sin(r) * L * .35, y: m.y - Math.cos(r) * L * .35 };
            d += 'M' + pt(o) + 'L' + pt(m) + 'M' + pt(m) + 'L' + pt(l) + 'M' + pt(m) + 'L' + pt(q) + 'M' + pt(m) + 'L' + pt(top);
            [l, q, top].forEach(p => { tips += '<circle style="--k:' + k + '" cx="' + f1(p.x) + '" cy="' + f1(p.y) + '" r="' + f1(R * .035) + '"/>'; });
        });
        return '<g class="cf-coral"><path d="' + d + '" fill="none" stroke="' + (gold ? '#ffd36e' : g.b) + '" stroke-width="' + f1(R * .06) + '" stroke-linecap="round" stroke-linejoin="round"/><g class="cf-glow" fill="#fff6d8">' + tips + '</g></g>';
    }
    function frill(g, R, s, id) {
        let d = '';
        for (let k = 0; k <= 96; k++) { const a = k / 96 * 360, rr = R * s * (1.24 + .07 * Math.cos(a * 16 * Math.PI / 180)), p = put(a, rr, R); d += (k ? 'L' : 'M') + pt(p); }
        return '<path class="cf-frill" d="' + d + 'Z" fill="url(#' + id + ')" fill-opacity=".32" stroke="' + g.b + '" stroke-opacity=".8" stroke-width="1.6" stroke-linejoin="round"/>';
    }
    /* the celestial bell: a wide dome over the body with a scalloped rim of lights */
    function bell(g, R, s, id) {
        const w = R * 1.5 * s, top = CY - R * 1.42 * s, rim = CY + R * .32;
        let d = 'M' + f1(CX - w) + ' ' + f1(rim) + 'C' + f1(CX - w) + ' ' + f1(top + R * .1) + ' ' + f1(CX - w * .45) + ' ' + f1(top) + ' ' + CX + ' ' + f1(top) +
            'C' + f1(CX + w * .45) + ' ' + f1(top) + ' ' + f1(CX + w) + ' ' + f1(top + R * .1) + ' ' + f1(CX + w) + ' ' + f1(rim);
        let lights = '';
        const n = 9;
        for (let k = n; k >= 0; k--) {
            const x = CX - w + 2 * w * k / n, xm = CX - w + 2 * w * (k + .5) / n;
            if (k < n) d += 'Q' + f1(xm) + ' ' + f1(rim + R * .16) + ' ' + f1(x) + ' ' + f1(rim);
            lights += '<circle style="--k:' + k + '" cx="' + f1(x) + '" cy="' + f1(rim + R * .02) + '" r="' + f1(R * .04) + '"/>';
        }
        return '<g class="cf-bell"><path d="' + d + 'Z" fill="url(#' + id + ')" fill-opacity=".26" stroke="' + g.b + '" stroke-opacity=".85" stroke-width="2" stroke-linejoin="round"/>' +
            '<path d="M' + f1(CX - w * .62) + ' ' + f1(rim - R * .1) + 'C' + f1(CX - w * .6) + ' ' + f1(top + R * .45) + ' ' + f1(CX + w * .6) + ' ' + f1(top + R * .45) + ' ' + f1(CX + w * .62) + ' ' + f1(rim - R * .1) + '" fill="none" stroke="#ffffff" stroke-opacity=".3" stroke-width="1.4"/>' +
            '<g class="cf-glow" fill="#fff6d8" stroke="' + g.b + '" stroke-width=".8">' + lights + '</g></g>';
    }
    function corona(g, R, s, id) {
        let d = '';
        for (let k = 0; k < 20; k++) { const a = k * 18 + 9, p = put(a, R * 1.32, R), q = put(a, R * (1.32 + (k % 2 ? .28 : .44) * s), R); d += 'M' + pt(p) + 'L' + pt(q); }
        return '<g class="cf-corona"><ellipse cx="' + CX + '" cy="' + CY + '" rx="' + f1(R * 1.66 * s) + '" ry="' + f1(R * 1.6 * s) + '" fill="url(#' + id + 'h)"/><path d="' + d + '" fill="none" stroke="' + g.b + '" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round"/></g>';
    }
    /* organelles on tilted orbits: the far half behind the body, the near half in front */
    const RINGS = [{ rx: 1.62, ry: .34, tilt: -13, dy: .18 }, { rx: 1.3, ry: .5, tilt: 21, dy: -.05 }];
    function organelle(g, kind, x, y, s, k, id) {
        const tr = ' style="--k:' + k + '" transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + f1(s) + ')"';
        if (kind === 0) return '<g class="cf-orb cf-mito"' + tr + '><rect x="-15" y="-7.5" width="30" height="15" rx="7.5" fill="' + g.a + '" stroke="#ffffff" stroke-width="1.4"/><path d="M-10 0l3-4 3 8 3-8 3 8 3-8 3 4" fill="none" stroke="' + g.b + '" stroke-width="1.6" stroke-linejoin="round"/></g>';
        if (kind === 1) return '<g class="cf-orb cf-nucleus"' + tr + '><circle r="10" fill="url(#' + id + ')" stroke="#ffffff" stroke-width="1.4"/><circle r="4" cx="-2" cy="-2" fill="#ffffff" fill-opacity=".75"/><ellipse rx="16" ry="4" fill="none" stroke="#ffe6a2" stroke-width="1.2" transform="rotate(-18)"/></g>';
        return '<g class="cf-orb cf-vesicle"' + tr + '><circle r="6.5" fill="' + g.b + '" fill-opacity=".85" stroke="#ffffff" stroke-width="1.3"/><circle r="2.2" cx="-1.6" cy="-1.6" fill="#ffffff"/></g>';
    }
    function orbits(g, R, n, rings, near, id, gold) {
        let s = '';
        for (let r = 0; r < rings; r++) {
            const o = RINGS[r], cy = CY + R * o.dy, rx = R * o.rx, ry = R * o.ry;
            const arc = near ? 'M' + f1(CX + rx) + ' ' + f1(cy) + 'A' + f1(rx) + ' ' + f1(ry) + ' 0 0 1 ' + f1(CX - rx) + ' ' + f1(cy) : 'M' + f1(CX - rx) + ' ' + f1(cy) + 'A' + f1(rx) + ' ' + f1(ry) + ' 0 0 1 ' + f1(CX + rx) + ' ' + f1(cy);
            let parts = '';
            const mine = [];
            for (let k = 0; k < n; k++) if (k % rings === r) mine.push(k);
            mine.forEach((k, j) => {
                let t = (j + .5) * Math.PI * 2 / mine.length + r * .7 + .35;
                const front = Math.sin(t) > 0;
                /* the near half passes in front of the body: keep those organelles out at the sides, never over the face */
                if (front && Math.abs(Math.cos(t)) < .64) t = Math.cos(t) >= 0 ? Math.acos(.64) : Math.PI - Math.acos(.64);
                if (front !== near) return;
                parts += organelle(g, k % 3, CX + Math.cos(t) * rx, cy + Math.sin(t) * ry, (front ? 1.12 : .82) * R / 94, k, id);
            });
            s += '<g class="cf-ring' + (near ? ' cf-ring-near' : ' cf-ring-far') + '" transform="rotate(' + o.tilt + ' ' + CX + ' ' + f1(cy) + ')"><path d="' + arc + '" fill="none" stroke="' + (gold ? '#ffe6a2' : g.b) + '" stroke-opacity="' + (near ? '.85' : '.5') + '" stroke-width="' + (near ? '2.2' : '1.5') + '"/>' + parts + '</g>';
        }
        return s;
    }
    function layers(g, R, opts) {
        opts = opts || {};
        if (!g) return { back: '', front: '', defs: '' };
        const st = clampStage(g.st), id = (opts.id || 'cf') + 'g', rr = rnd(97 + g.sd), P = ANATOMY[st], gold = !!P.gold;
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
        /* the body plan, furthest behind first */
        if (P.corona) back += corona(g, R, P.corona, id);
        if (P.bell) back += bell(g, R, P.bell, id);
        if (P.frill) back += frill(g, R, P.frill, id);
        if (P.hood) back += hood(g, R, P.hood, id);
        if (P.orbs) back += orbits(g, R, P.orbs, P.rings || 1, false, id, gold);
        if (P.flag) back += flags(g, R, P.flag[0], P.flag[1], id, gold);
        if (P.limbs) back += limbs(g, R, P.limbs[0], P.limbs[1], id, gold);
        if (P.fin2) back += fins(g, R, [P.fin[0] * .72, P.fin[1] * .8], 62, 'cf-fin cf-fin2', id);
        if (P.fin) back += fins(g, R, P.fin, P.limbs ? 84 : 104, 'cf-fin', id);
        if (P.sail && !opts.hat) back += sail(g, R, P.sail, id);
        if (P.coral && !opts.hat) back += coral(g, R, P.coral, gold);
        if (P.cilia) back += cilia(g, R, P.cilia[0], P.cilia[1], P.hood ? -70 : 0, P.hood ? 70 : 360);
        if (P.bud) back += buds(g, R, P.bud, id);
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
        if (P.orbs) front += orbits(g, R, P.orbs, P.rings || 1, true, id, gold);
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
        const st = clampStage(g.st), R = CELL_R[st], pad = Math.round(100 * POWER[st].frame - R), L = layers(g, R, { id: String(id || 'm').replace(/[^a-z0-9]/gi, '') + 'm' });
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

    const api = { MAX_ST, ELS, CELL_R, PAD, POWER, power, STONE_AT, HAT_IDS, normType, genome, encode, decode, withName, nameOf, cleanName, layers, apply, miniSVG, reaction, merge, calm, fastHours, formName, traitName, path, clampStage };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.LowiCompanionCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
