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
    const CX = 130, CY = 158, CELL_R = [64, 70, 76, 82, 88, 94];
    const TYPES = /^[EI][SN][TF][JP]$/;
    const HAT_IDS = ['daisy', 'bow', 'crown', 'beanie', 'mushroom'];
    const clampStage = i => Math.max(0, Math.min(5, (+i | 0)));
    const hex = c => (/^#[0-9a-f]{6}$/i.test(String(c || '')) ? String(c).toLowerCase() : '');
    const normType = t => { t = String(t || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); return TYPES.test(t) ? t : ''; };
    const f1 = n => (Math.round(n * 10) / 10).toString();

    /* ---------- copy ---------- */
    const STAGE = {
        en: ['Spark', 'Bud', 'Sprite', 'Drifter', 'Guardian', 'Radiant'],
        de: ['Funke', 'Knospe', 'Flitzer', 'Gleiter', 'Hüter', 'Strahler'],
        es: ['Chispa', 'Brote', 'Duende', 'Viajero', 'Guardián', 'Radiante']
    };
    const ADJ = {
        fire: ['Ember', 'Glut', 'de brasa'], water: ['Tide', 'Flut', 'de marea'], air: ['Breeze', 'Wind', 'de brisa'],
        earth: ['Moss', 'Moos', 'de musgo'], spirit: ['Glow', 'Schimmer', 'de brillo']
    };
    const TRAITS = {
        fire: [['Warm core', 'Warmer Kern', 'Núcleo cálido'], ['Ember nubs', 'Glutknubbel', 'Bultos de brasa'], ['Flame tufts', 'Flammenbüschel', 'Penachos de llama'], ['Cinder tail', 'Glutschweif', 'Cola de ceniza'], ['Blaze wings', 'Feuerflügel', 'Alas de fuego'], ['Sun crown', 'Sonnenkrone', 'Corona solar']],
        water: [['Dew core', 'Taukern', 'Núcleo de rocío'], ['Ripple nubs', 'Wellenknubbel', 'Bultos de onda'], ['Tide fins', 'Flutflossen', 'Aletas de marea'], ['Wave tail', 'Wellenschweif', 'Cola de ola'], ['Flow frills', 'Strömungsrüschen', 'Volantes de corriente'], ['Pearl crown', 'Perlenkrone', 'Corona de perlas']],
        air: [['Breath core', 'Atemkern', 'Núcleo de aliento'], ['Puff nubs', 'Hauchknubbel', 'Bultos de soplo'], ['Wisp ears', 'Wirbelohren', 'Orejas de brisa'], ['Feather tail', 'Federschweif', 'Cola de pluma'], ['Sky wings', 'Himmelsflügel', 'Alas de cielo'], ['Star crown', 'Sternenkrone', 'Corona de estrellas']],
        earth: [['Seed core', 'Samenkern', 'Núcleo de semilla'], ['Pebble nubs', 'Kieselknubbel', 'Bultos de guijarro'], ['Leaf sprouts', 'Blattsprossen', 'Brotes de hoja'], ['Root tail', 'Wurzelschweif', 'Cola de raíz'], ['Crystal shell', 'Kristallpanzer', 'Caparazón de cristal'], ['Bloom crown', 'Blütenkrone', 'Corona de flor']],
        spirit: [['Glow core', 'Leuchtkern', 'Núcleo de luz'], ['Glow nubs', 'Leuchtknubbel', 'Bultos de luz'], ['Glow ears', 'Leuchtohren', 'Orejas de luz'], ['Glow tail', 'Leuchtschweif', 'Cola de luz'], ['Glow wings', 'Leuchtflügel', 'Alas de luz'], ['Glow crown', 'Leuchtkrone', 'Corona de luz']]
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
    const LOOK_RX = /^1\.([0-5])\.([0-4])\.([0-9a-f]{6})\.([0-9a-f]{6})\.([se])\.([vf])\.([nbs])\.([mwc])\.([0-9a-z]{1,4})$/;
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
    const PAD = [0, 0, .04, .08, .14, .18];
    function layers(g, R, opts) {
        opts = opts || {};
        if (!g) return { back: '', front: '', defs: '' };
        const st = clampStage(g.st), id = (opts.id || 'cf') + 'g', rr = rnd(97 + g.sd);
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
        /* creature traits, oldest behind */
        if (st >= 5) back += pair(g, 'cf-wing2', (WINGS[g.el][0] + 40), WINGS[g.el][1] * .62, WINGS[g.el][2] * .7, R, id);
        if (st >= 4) back += pair(g, 'cf-wing', WINGS[g.el][0], WINGS[g.el][1], WINGS[g.el][2], R, id);
        if (st >= 3) back += piece(g, 'cf-tail', g.sy === 'free' ? 158 : 180, g.el === 'water' ? .55 : .6, g.el === 'air' ? .2 : .24, R, 0, id);
        if (st >= 2) back += pair(g, 'cf-ear', EARS[g.el][0], EARS[g.el][1], EARS[g.el][2], R, id);
        else if (st === 1) back += pair(g, 'cf-nub', 34, .2, .12, R, id);
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
        /* crown motes, last form */
        if (st >= 5) {
            let m = '';
            for (let k = 0; k < 5; k++) { const p = put(-60 + k * 30, R * 1.32, R); m += '<circle style="--k:' + k + '" cx="' + f1(p.x) + '" cy="' + f1(p.y) + '" r="' + f1(R * .045) + '"/>'; }
            front += '<g class="cf-crown" fill="#ffe6a2" stroke="#fff6d8" stroke-width=".8">' + m + '</g>';
        }
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
        /* evolved traits reach past the tight cell frame: widen the viewBox a little per form */
        const pad = R * PAD[clampStage(g.st)];
        if (pad > 0) tag = tag.replace(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/, (m0, x, y, w, h) => 'viewBox="' + f1(+x - pad) + ' ' + f1(+y - pad) + ' ' + f1(+w + 2 * pad) + ' ' + f1(+h + 2 * pad) + '"');
        return tag + svg.slice(open.length, defsEnd) + L.defs + svg.slice(defsEnd, bodyAt) + L.back + svg.slice(bodyAt, faceAt) + L.front + svg.slice(faceAt);
    }

    /* a small stand-alone companion for friends (their own shared look) */
    function miniSVG(g, id) {
        if (!g) return '';
        const st = clampStage(g.st), R = CELL_R[st], pad = 46, L = layers(g, R, { id: String(id || 'm').replace(/[^a-z0-9]/gi, '') + 'm' });
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
        return (stages || []).slice(0, 6).map((s, i) => ({
            i, xp: +s.xp || 0, name: formName(i, el, lang), trait: traitName(el, i, lang),
            reached: i <= cur, current: i === cur, left: Math.max(0, Math.ceil((+s.xp || 0) - (+xp || 0)))
        }));
    }

    const api = { ELS, CELL_R, PAD, HAT_IDS, normType, genome, encode, decode, layers, apply, miniSVG, reaction, merge, calm, fastHours, formName, traitName, path, clampStage };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.LowiCompanionCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
