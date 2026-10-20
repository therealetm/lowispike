/* LOWiSPIKE brand palette (item 32, 20 Oct 2026, Emmanuel: make those [the planet colours] our brand color).
   The six planet colours are the brand. They are copied here exactly from body-world-3d.js PLACES (tests/brand-palette.test.cjs
   fails if the two ever differ) and every coloured surface that should belong to the family derives its tones from them:
     core:  the planet itself, the body of a liquid (on screen the glass and the night behind it already deepen it)
     light: 45 % toward white, the surface of a liquid
     soft:  30 % toward white, a glow in the galaxy
     deep:  20 % toward the night blue of the app, the fasting water while the gap still runs (it lights up to core when done)
   Which control takes which planet is USE (what it means, not decoration). Dry controls (Scan, Settings, the joystick)
   have no entry on purpose: they stay clear glass. The CSS fills carry the same numbers as literals (a stylesheet cannot read
   this file); the test checks every one of them against this file. Misty's own blue is not a planet and stays her own. */
(function (root) {
    'use strict';
    const PLANETS = { gut: '#2ef8b6', liver: '#e78631', pancreas: '#f8ea40', muscles: '#9feb25', heart: '#f14770', brain: '#1cf7f9' };
    const WHITE = [255, 255, 255], NIGHT = [6, 20, 51]; /* #061433, the app's deep night blue */
    const MISTY = '#8fd0ff', STAR = '#e8f6ff';
    const hex2 = h => { const v = parseInt(String(h).replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
    const toHex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const AMT = { light: 0.45, soft: 0.3, deep: 0.2 };
    function tones(id) {
        if (!PLANETS[id]) return null;
        const c = hex2(PLANETS[id]);
        return { core: c, light: mix(c, WHITE, AMT.light), soft: mix(c, WHITE, AMT.soft), deep: mix(c, NIGHT, AMT.deep) };
    }
    /* six liquids, six planets, one each (Emmanuel, 20 Oct: Water, Move, Fuel, Sleep, Gap and Scan = six colours, six planets):
       Water and the Brain (cyan, the one blue planet), Move and the Muscles (Moving wakes them up), Fuel and the Liver (your store
       room), Sleep and the Heart (it slows down at night), the fasting Gap and the Pancreas (the gap is its rest from making insulin),
       Scan and the Gut (where what you scanned goes) */
    const USE = { water: 'brain', move: 'muscles', fuel: 'liver', sleep: 'heart', gap: 'pancreas', scan: 'gut' };
    /* a liquid: light surface on top, the planet colour itself below, the alphas the bubbles already used (a1 top, a2 bottom) */
    const LIQ_A = { water: [0.55, 0.8], move: [0.5, 0.78], fuel: [0.5, 0.78], sleep: [0.45, 0.72], scan: [0.5, 0.78] };
    function liquid(kind) {
        const t = tones(USE[kind]); if (!t) return null;
        const a = LIQ_A[kind] || [0.5, 0.78];
        return { top: t.light.slice(), bot: t.core.slice(), a1: a[0], a2: a[1] };
    }
    /* the fasting water (fast-bubble.js): the alphas it always had per look (dark / light) and state (running / goal reached).
       Running: the Pancreas liquid (light surface, deep bottom). Goal reached: the same planet, lit up (a paler surface over the
       full planet colour), so the success still reads at a glance without borrowing another planet's colour. The light look lifts
       both colours 20 % more toward white so the water sits on a pale sky. */
    const FAST_A = { dark: [0.76, 0.92, 0.3], light: [0.62, 0.74, 0.26], doneDark: [0.8, 0.92, 0.34], doneLight: [0.64, 0.78, 0.28] };
    function fast(done, light) {
        const t = tones(USE.gap), a = FAST_A[done ? (light ? 'doneLight' : 'doneDark') : (light ? 'light' : 'dark')];
        let top = done ? mix(t.core, WHITE, 0.62) : t.light, bot = done ? t.core : t.deep;
        if (light) { top = mix(top, WHITE, 0.2); bot = mix(bot, WHITE, 0.2); }
        return { top, bot, a1: a[0], a2: a[1], back: a[2] };
    }
    /* the galaxy's glow colours: the six planets softened toward white, Misty's own blue and the star white */
    const GALAXY = Object.keys(PLANETS).reduce((o, k) => { o[k] = toHex(tones(k).soft); return o; }, { misty: MISTY, white: STAR });
    const rgba = (c, a) => 'rgba(' + c[0] + ', ' + c[1] + ', ' + c[2] + ', ' + a + ')';
    const css = kind => { const l = liquid(kind); return 'linear-gradient(180deg, ' + rgba(l.top, l.a1) + ', ' + rgba(l.bot, l.a2) + ')'; };
    const BRAND = { PLANETS, MISTY, STAR, NIGHT, AMT, USE, tones, liquid, fast, GALAXY, hex2, toHex, mix, rgba, css };
    if (typeof module !== 'undefined' && module.exports) module.exports = BRAND;
    if (root) root.LowiBrand = BRAND;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : null));
