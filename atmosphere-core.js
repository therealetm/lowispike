/* LOWiSPIKE day-night atmosphere, pure core (Oct 15, 2026, from E-man's voice note):
   "Not just a light mode click or dark mode click, but a scale, like the volume. Like controlling the world in a
   sped-up timelapse: morning mists, then sunnier, then golden hour, then bluish mists, then night stars."
   One number p (0..100) scrubs that timelapse. Every stop below is a full sky (opaque gradient, sun/moon glow, mist,
   stars, a 3D haze + light factor); in between everything is interpolated, so the world moves, it never snaps.
   The UI theme (cards, text) flips once, at THRESH, between two stops chosen so text stays readable on both sides:
   light side skies have luminance >= .40, dark side skies <= .06 (tests/atmosphere.test.cjs checks every half step).
   Shared by atmosphere.js (window) and node tests (module.exports). No DOM here. */
(function (root) {
    'use strict';
    const KEY = 'lowi.atmos', CSS_KEY = 'lowi.atmos.css';
    const THRESH = 62, DAY = 25, NIGHT = 100;
    /* p, theme side, sky top/mid/bottom, light glow colour/alpha/x/y (%), mist colour/alpha, stars, 3D haze/amount/light */
    const STOPS = [
        { p: 0, id: 'mist', top: '#c3cfe0', mid: '#dbe2ec', bot: '#eef1f5', sun: '#ffd2bf', sunA: 0.42, sunX: 12, sunY: 74, mist: '#ffffff', mistA: 0.85, star: 0, haze: '#c0cee0', amt: 0.45, tint: '#f2f5ff', tintA: 0.25, light: 1.12 },
        { p: 25, id: 'day', top: '#7fb6ea', mid: '#bfdcf6', bot: '#eef5fc', sun: '#fff1b8', sunA: 0.6, sunX: 72, sunY: 9, mist: '#ffffff', mistA: 0.1, star: 0, haze: '#6aaeea', amt: 0.32, tint: '#fff6dc', tintA: 0.22, light: 1.2 },
        { p: 38, id: 'afternoon', top: '#c4d2e2', mid: '#e6e4da', bot: '#f8f0e2', sun: '#ffe2a0', sunA: 0.65, sunX: 80, sunY: 30, mist: '#fff8ec', mistA: 0.15, star: 0, haze: '#a6c0cc', amt: 0.36, tint: '#ffe8bc', tintA: 0.3, light: 1.15 },
        { p: 50, id: 'golden', top: '#f0ac68', mid: '#f6cf98', bot: '#fae6c8', sun: '#ffb35c', sunA: 0.72, sunX: 84, sunY: 56, mist: '#fff0d6', mistA: 0.25, star: 0, haze: '#e89a52', amt: 0.45, tint: '#ffb664', tintA: 0.45, light: 1.1 },
        { p: 61, id: 'sunset', top: '#e39a86', mid: '#eeb59a', bot: '#f5d2b8', sun: '#ff8f66', sunA: 0.55, sunX: 90, sunY: 76, mist: '#ffd9c8', mistA: 0.3, star: 0, haze: '#d2706a', amt: 0.48, tint: '#ff9070', tintA: 0.5, light: 1.0 },
        { p: THRESH, id: 'dusk', top: '#1a1f45', mid: '#2b2d5c', bot: '#4a3a66', sun: '#ff9a7a', sunA: 0.28, sunX: 92, sunY: 88, mist: '#8f8ac0', mistA: 0.3, star: 0.15, haze: '#3a3a86', amt: 0.5, tint: '#8a90e0', tintA: 0.4, light: 0.85 },
        { p: 75, id: 'blue', top: '#142452', mid: '#1f3466', bot: '#283f70', sun: '#cfd8ff', sunA: 0.06, sunX: 60, sunY: 40, mist: '#7088c0', mistA: 0.55, star: 0.45, haze: '#2856c0', amt: 0.6, tint: '#6f9cff', tintA: 0.6, light: 0.8 },
        { p: NIGHT, id: 'night', top: '#070c22', mid: '#0a1430', bot: '#03050a', sun: '#cfd8ff', sunA: 0.34, sunX: 24, sunY: 14, mist: '#4a5a90', mistA: 0.12, star: 1, haze: '#040a22', amt: 0.55, tint: '#7286d8', tintA: 0.35, light: 0.7 }
    ];
    /* the five named places on the scale (what the user asked for, in his order) */
    const MARKS = [{ p: 0, id: 'mist' }, { p: DAY, id: 'day' }, { p: 50, id: 'golden' }, { p: 75, id: 'blue' }, { p: NIGHT, id: 'night' }];
    const WORDS = {
        title: ['Day & night', 'Tag & Nacht', 'Día y noche'],
        sub: ['Slide through the day like a timelapse.', 'Schieb dich durch den Tag wie im Zeitraffer.', 'Desliza por el día como en un timelapse.'],
        day: ['Day', 'Tag', 'Día'],
        night: ['Night', 'Nacht', 'Noche'],
        auto: ['Auto', 'Auto', 'Auto'],
        autoLong: ['Auto: follows the real sun', 'Auto: folgt der echten Sonne', 'Auto: sigue al sol real'],
        slider: ['Time of day in the app', 'Tageszeit in der App', 'Hora del día en la app'],
        speed: ['World speed', 'Tempo der Welt', 'Velocidad del mundo'],
        speedNote: ['How fast the world around Misty moves. Misty keeps its own pace.', 'Wie schnell sich die Welt um Misty bewegt. Misty behält das eigene Tempo.', 'Qué tan rápido se mueve el mundo alrededor de Misty. Misty mantiene su propio ritmo.'],
        mist: ['Morning mist', 'Morgennebel', 'Niebla matinal'],
        golden: ['Golden hour', 'Goldene Stunde', 'Hora dorada'],
        blue: ['Blue mist', 'Blauer Nebel', 'Niebla azul'],
        stars: ['Night stars', 'Sternennacht', 'Noche estrellada'],
        dayOn: ['Day on', 'Tag an', 'Día activado'],
        nightOn: ['Night on', 'Nacht an', 'Noche activada'],
        autoOn: ['Auto on: follows the real sun', 'Auto an: folgt der echten Sonne', 'Auto activado: sigue al sol real'],
        toDay: ['Switch to Day', 'Tag einschalten', 'Activar Día'],
        toNight: ['Switch to Night', 'Nacht einschalten', 'Activar Noche']
    };
    const LANGS = ['en', 'de', 'es'];
    const word = (k, lang) => { const w = WORDS[k]; if (!w) return k; const i = LANGS.indexOf(String(lang || 'en').slice(0, 2)); return w[i < 0 ? 0 : i]; };
    const markWord = (id, lang) => word(id === 'night' ? 'stars' : id, lang);

    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const num = v => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? +v : NaN);
    function clampP(p) { p = num(p); return Number.isFinite(p) ? Math.round(clamp(p, 0, 100) * 2) / 2 : DAY; }
    /* Oct 16 (E-man): an ease-in-out between stops, so the colour settles gently on each peak (mist, day, golden, blue mist,
       night) like a photo editor's hue slider, and moves gradually in between, never a jump. The stops themselves (haze + the
       colour of the light) are real-sky colours, stronger than before so the change is easy to see, but not neon. */
    const ease = t => t * t * (3 - 2 * t);
    function hex(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    const toHex = c => '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
    function mixHex(a, b, t) { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); }
    function lum(h) { return hex(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); }
    function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
    const themeFor = p => (clampP(p) < THRESH ? 'light' : 'dark');

    /* full look at p: neighbours on the same theme side only, so the flip at THRESH is the only step */
    function look(p) {
        p = clampP(p);
        let i = 0;
        while (i < STOPS.length - 2 && p >= STOPS[i + 1].p) i++;
        const a = STOPS[i], b = STOPS[i + 1];
        const raw = b.p === a.p || themeFor(a.p) !== themeFor(b.p) ? 0 : clamp((p - a.p) / (b.p - a.p), 0, 1);
        const t = ease(raw), L = (x, y) => x + (y - x) * t;
        const near = MARKS.reduce((m, k) => (Math.abs(k.p - p) < Math.abs(m.p - p) ? k : m), MARKS[0]);
        return {
            p, theme: themeFor(p), from: a.id, to: b.id, t: Math.round(t * 1000) / 1000, mark: near.id,
            top: mixHex(a.top, b.top, t), mid: mixHex(a.mid, b.mid, t), bot: mixHex(a.bot, b.bot, t),
            sun: mixHex(a.sun, b.sun, t), sunA: +L(a.sunA, b.sunA).toFixed(3), sunX: +L(a.sunX, b.sunX).toFixed(1), sunY: +L(a.sunY, b.sunY).toFixed(1),
            mist: mixHex(a.mist, b.mist, t), mistA: +L(a.mistA, b.mistA).toFixed(3), star: +L(a.star, b.star).toFixed(3),
            haze: mixHex(a.haze, b.haze, t), amt: +L(a.amt, b.amt).toFixed(3), tint: mixHex(a.tint, b.tint, t), tintA: +L(a.tintA, b.tintA).toFixed(3), light: +L(a.light, b.light).toFixed(3)
        };
    }
    /* Oct 16 (E-man, 3:50 AM): "not nothing-then-everything at blue mist; like real life, like slowly sliding a hue control".
       The 3D world's light and haze do NOT follow the UI theme flip at THRESH. They have their own stops, spread across the
       whole scale (sunset 58, dusk 68, blue mist 80), and move piecewise-linearly between them: a constant, gentle speed with
       no plateau on a stop and no jump anywhere. Every half step changes by only a little (tests/atmosphere.test.cjs). */
    const WORLD = [
        { p: 0, haze: '#c0cee0', amt: 0.45, tint: '#f2f5ff', tintA: 0.25, light: 1.12 },
        { p: 25, haze: '#6aaeea', amt: 0.32, tint: '#fff6dc', tintA: 0.22, light: 1.2 },
        { p: 38, haze: '#a6c0cc', amt: 0.36, tint: '#ffe8bc', tintA: 0.3, light: 1.15 },
        { p: 50, haze: '#e89a52', amt: 0.42, tint: '#ffb664', tintA: 0.4, light: 1.08 },
        { p: 58, haze: '#d2786a', amt: 0.45, tint: '#ff9a78', tintA: 0.44, light: 1.0 },
        { p: 68, haze: '#5a4a8e', amt: 0.5, tint: '#a090d8', tintA: 0.44, light: 0.9 },
        { p: 80, haze: '#2856c0', amt: 0.56, tint: '#6f9cff', tintA: 0.52, light: 0.8 },
        { p: NIGHT, haze: '#040a22', amt: 0.55, tint: '#7286d8', tintA: 0.35, light: 0.7 }
    ];
    function world(p) {
        p = num(p); p = Number.isFinite(p) ? clamp(p, 0, 100) : DAY;
        let i = 0;
        while (i < WORLD.length - 2 && p >= WORLD[i + 1].p) i++;
        const a = WORLD[i], b = WORLD[i + 1], t = clamp((p - a.p) / (b.p - a.p), 0, 1), L = (x, y) => x + (y - x) * t;
        return { p, haze: mixHex(a.haze, b.haze, t), amt: +L(a.amt, b.amt).toFixed(3), tint: mixHex(a.tint, b.tint, t), tintA: +L(a.tintA, b.tintA).toFixed(3), light: +L(a.light, b.light).toFixed(3) };
    }
    /* CSS custom properties (strings) for <html style>. The same string is cached so the <head> can restore it before paint. */
    function vars(p) {
        const k = look(p);
        return {
            '--atm-p': (k.p / 100).toFixed(3), '--atm-top': k.top, '--atm-mid': k.mid, '--atm-bot': k.bot,
            '--atm-sun': k.sun, '--atm-sun-a': String(k.sunA), '--atm-sun-x': k.sunX + '%', '--atm-sun-y': k.sunY + '%',
            '--atm-mist': k.mist, '--atm-mist-a': String(k.mistA), '--atm-star-a': String(k.star), '--atm-cell-a': (k.sunA * 0.5).toFixed(3)
        };
    }
    const cssText = p => Object.entries(vars(p)).map(([k, v]) => k + ':' + v).join(';') + ';';
    /* the track of the slider shows the whole timelapse */
    function trackGradient() {
        const parts = [];
        for (let p = 0; p <= 100; p += 5) { const k = look(p); parts.push(mixHex(k.top, k.mid, 0.35) + ' ' + p + '%'); if (p === 60) { const s = look(61.5); parts.push(mixHex(s.top, s.mid, 0.35) + ' 61.5%'); const d = look(THRESH); parts.push(mixHex(d.top, d.mid, 0.35) + ' ' + THRESH + '%'); } }
        return 'linear-gradient(90deg,' + parts.join(',') + ')';
    }

    /* stored choice. Missing or broken -> derived from the old lowi.theme so nobody's look jumps:
       'sunrise' (the old automatic) -> auto; 'light' (old Cloud) -> Day; 'dark' (old Night) / nothing -> Night. */
    function parse(raw, legacyTheme) {
        let s = null;
        try { s = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { s = null; }
        const leg = legacyTheme === 'light' || legacyTheme === 'sunrise' ? legacyTheme : 'dark';
        if (!s || typeof s !== 'object' || (s.mode !== 'manual' && s.mode !== 'auto')) {
            return leg === 'sunrise' ? { mode: 'auto', p: null, legacy: true } : { mode: 'manual', p: leg === 'light' ? DAY : NIGHT, legacy: true };
        }
        if (s.mode === 'auto') return { mode: 'auto', p: null };
        return { mode: 'manual', p: clampP(s.p) };
    }
    /* the UI theme key wins when something else changed it (an older switch): auto <-> sunrise, and a manual p
       on the wrong side moves to that side's quick stop. Returns the reconciled state. */
    function reconcile(state, legacyTheme) {
        const leg = legacyTheme === 'light' || legacyTheme === 'sunrise' ? legacyTheme : 'dark';
        if (leg === 'sunrise') return { mode: 'auto', p: null };
        if (state.mode === 'auto') return { mode: 'manual', p: leg === 'light' ? DAY : NIGHT };
        if (themeFor(state.p) !== leg) return { mode: 'manual', p: leg === 'light' ? DAY : NIGHT };
        return { mode: 'manual', p: clampP(state.p) };
    }
    const legacyFor = state => (state.mode === 'auto' ? 'sunrise' : themeFor(state.p));
    const serialize = state => JSON.stringify(state.mode === 'auto' ? { mode: 'auto' } : { mode: 'manual', p: clampP(state.p) });

    /* where the real clock sits on the scale (shown on the slider in Auto). sunrise/sunset are ms of today, optional. */
    function clockP(now, sunrise, sunset) {
        const d = new Date(now), h = d.getHours() + d.getMinutes() / 60;
        let rise = 7, set = 19;
        if (Number.isFinite(sunrise) && Number.isFinite(sunset) && sunset > sunrise) {
            const r = new Date(sunrise), s = new Date(sunset);
            rise = r.getHours() + r.getMinutes() / 60; set = s.getHours() + s.getMinutes() / 60;
            if (!(set > rise)) { rise = 7; set = 19; }
        }
        const noon = (rise + set) / 2;
        const pts = [[rise - 1, 0], [rise + 1.5, 12], [noon, DAY], [set - 1.2, 50], [set - 0.1, 61], [set + 0.1, THRESH], [set + 0.9, 75], [set + 2.5, NIGHT]];
        if (h < pts[0][0]) return NIGHT;
        if (h >= pts[pts.length - 1][0]) return NIGHT;
        for (let i = 0; i < pts.length - 1; i++) {
            const [h0, p0] = pts[i], [h1, p1] = pts[i + 1];
            if (h >= h0 && h < h1) return clampP(p0 + (p1 - p0) * (h1 === h0 ? 0 : (h - h0) / (h1 - h0)));
        }
        return NIGHT;
    }

    const core = { KEY, CSS_KEY, THRESH, DAY, NIGHT, STOPS, MARKS, WORDS, LANGS, word, markWord, clampP, look, world, WORLD, vars, cssText, trackGradient, themeFor, parse, reconcile, legacyFor, serialize, clockP, mixHex, lum, contrast };
    if (typeof module === 'object' && module.exports) module.exports = core;
    root.LowiAtmosCore = core;
})(typeof window !== 'undefined' ? window : globalThis);
