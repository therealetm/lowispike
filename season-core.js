/* LOWiSPIKE seasonal themes (Oct 15, 2026). Pure: which season it is and how each season tints the world.
   Rules:
   - Automatic by date, no setting. Northern dates: spring Mar 20, summer Jun 21, autumn Sep 22, winter Dec 21 (local day).
     Southern hemisphere (by time zone) is shifted by half a year.
   - Phase inside a season: early (first third), peak, late (last third). Autumn reads golden early/peak, misty late.
   - Only tints and a few drifting particles: no rewards, no shop pressure, no countdowns. Regions in the 3D world keep
     their own hue; seasons only touch the hub (bloodstream) fog, Home backgrounds, the living cell and the cell room.
   - Works with every theme (Night = dark, Cloud = light, Sunrise = whichever is effective) and keeps the gold glow. */
(function (root) {
    'use strict';
    const ORDER = ['spring', 'summer', 'autumn', 'winter'];
    /* start [month (1-12), day] of each season in the northern hemisphere */
    const START = { spring: [3, 20], summer: [6, 21], autumn: [9, 22], winter: [12, 21] };
    const SOUTH_TZ = /^(Australia|Antarctica)\/|^Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Apia|Noumea|Efate|Port_Moresby)|^America\/(Argentina|Sao_Paulo|Santiago|Montevideo|Asuncion|Lima|La_Paz|Punta_Arenas|Campo_Grande|Cuiaba|Porto_Velho|Recife|Bahia|Belem|Fortaleza|Maceio|Araguaina)|^Africa\/(Johannesburg|Maputo|Harare|Lusaka|Windhoek|Gaborone|Maseru|Mbabane|Blantyre|Lubumbashi)|^Indian\/(Mauritius|Reunion|Antananarivo)/;

    /* look per season x theme. hub: 3D bloodstream fog tint (hex) + how far to lerp toward it; motes: drifting particles in
       the hub; css: custom properties for the 2D surfaces. Gold #f4cd7e stays the shared glow in every season. */
    const LOOK = {
        autumn: {
            name: ['Autumn', 'Herbst', 'Otoño'], mote: 'leaf',
            dark: { haze: '#5a3218', amt: 0.2, motes: ['#f4cd7e', '#e8a33d', '#d9743a', '#ffd98a', '#c8643b'], moteOp: 0.85, a: '#e8a33d', b: '#f4cd7e', c: '#c8643b' },
            light: { haze: '#f2c49a', amt: 0.24, motes: ['#e08a2e', '#d2652c', '#e9a93f', '#c9572f', '#f0b54a'], moteOp: 0.9, a: '#e9973e', b: '#f4cd7e', c: '#d2652c' },
            late: { dark: { haze: '#3a3040', amt: 0.18 }, light: { haze: '#d9cfd6', amt: 0.22 } }
        },
        winter: {
            name: ['Winter', 'Winter', 'Invierno'], mote: 'frost',
            dark: { haze: '#1c3352', amt: 0.18, motes: ['#e6f4ff', '#bfe3ff', '#f4cd7e', '#ffffff'], moteOp: 0.8, a: '#bfe3ff', b: '#f4cd7e', c: '#7fb6e8' },
            light: { haze: '#e4f1fb', amt: 0.26, motes: ['#7fb0de', '#9cc6ec', '#d6a94e', '#6c9fd0'], moteOp: 0.85, a: '#8fbfe8', b: '#e7c46e', c: '#6c9fd0' }
        },
        spring: {
            name: ['Spring', 'Frühling', 'Primavera'], mote: 'petal',
            dark: { haze: '#3a2244', amt: 0.16, motes: ['#ffc6e0', '#f7a8cf', '#c8f5c0', '#f4cd7e'], moteOp: 0.8, a: '#f7a8cf', b: '#f4cd7e', c: '#9be3a0' },
            light: { haze: '#f6d9ea', amt: 0.22, motes: ['#e27fb1', '#ef9cc4', '#6fc47a', '#e0b04c'], moteOp: 0.85, a: '#ea8fbd', b: '#e8c060', c: '#6fc47a' }
        },
        summer: {
            name: ['Summer', 'Sommer', 'Verano'], mote: 'pollen',
            dark: { haze: '#3d3418', amt: 0.16, motes: ['#fff2a8', '#ffd36b', '#f4cd7e', '#ffe9c2'], moteOp: 0.8, a: '#ffd36b', b: '#f4cd7e', c: '#ff9f6b' },
            light: { haze: '#fbe6b0', amt: 0.22, motes: ['#e2a92a', '#efbf3c', '#d98c2c', '#f0c75a'], moteOp: 0.85, a: '#efb43c', b: '#f4cd7e', c: '#e98a52' }
        }
    };

    const pad = n => (n < 10 ? '0' : '') + n;
    function southern(tz) { return !!(tz && SOUTH_TZ.test(String(tz))); }
    function localTz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } }
    /* start Date (local midnight) of a season in a given year */
    function startOf(season, year) { const s = START[season]; return new Date(year, s[0] - 1, s[1]); }
    const flip = s => ORDER[(ORDER.indexOf(s) + 2) % 4];

    /* northern season for a local date + its start/end, so phase can be measured */
    function northern(d) {
        const y = d.getFullYear(), t = new Date(y, d.getMonth(), d.getDate()).getTime();
        let season = 'winter', from = startOf('winter', y - 1), to = startOf('spring', y);
        if (t >= startOf('winter', y).getTime()) { from = startOf('winter', y); to = startOf('spring', y + 1); }
        else if (t >= startOf('autumn', y).getTime()) { season = 'autumn'; from = startOf('autumn', y); to = startOf('winter', y); }
        else if (t >= startOf('summer', y).getTime()) { season = 'summer'; from = startOf('summer', y); to = startOf('autumn', y); }
        else if (t >= startOf('spring', y).getTime()) { season = 'spring'; from = startOf('spring', y); to = startOf('summer', y); }
        return { season, from, to, t };
    }

    /* season(now, {tz, force}) -> {id, phase, progress, south, name[3], key, from, to} */
    function season(now, opts) {
        opts = opts || {};
        const d = new Date(now == null ? Date.now() : +now), south = southern(opts.tz != null ? opts.tz : localTz());
        const n = northern(d);
        let id = south ? flip(n.season) : n.season;
        const span = Math.max(1, n.to.getTime() - n.from.getTime()), progress = Math.max(0, Math.min(1, (n.t - n.from.getTime()) / span));
        let phase = progress < 1 / 3 ? 'early' : progress < 2 / 3 ? 'peak' : 'late';
        if (opts.force && LOOK[opts.force]) { id = opts.force; phase = opts.phase && /^(early|peak|late)$/.test(opts.phase) ? opts.phase : 'peak'; }
        const f = n.from, to = n.to;
        return { id, phase, progress: +progress.toFixed(3), south, name: LOOK[id].name.slice(), mote: LOOK[id].mote,
            from: f.getFullYear() + '-' + pad(f.getMonth() + 1) + '-' + pad(f.getDate()), to: to.getFullYear() + '-' + pad(to.getMonth() + 1) + '-' + pad(to.getDate()),
            key: id + ':' + phase };
    }

    /* look for a season object (or id) + theme ('light' | anything else = dark) */
    function look(s, theme) {
        const id = typeof s === 'string' ? s : s && s.id, phase = s && typeof s === 'object' ? s.phase : 'peak';
        const L = LOOK[id] || LOOK.autumn, th = theme === 'light' ? 'light' : 'dark';
        const out = Object.assign({ id: LOOK[id] ? id : 'autumn', theme: th, mote: L.mote }, L[th]);
        out.motes = L[th].motes.slice();
        if (phase === 'late' && L.late && L.late[th]) Object.assign(out, L.late[th]);
        return out;
    }

    /* how many drifting particles: 2D layer on Home (DOM, <= 10) and 3D hub motes; none with reduced motion in 2D */
    function counts(env) {
        env = env || {};
        const wide = (env.w || 390) >= 700, late = env.phase === 'late';
        const dom = env.reduced ? 0 : Math.max(0, (wide ? 10 : 7) - (late ? 2 : 0) - (env.wet ? 3 : 0));
        const motes = (wide ? 70 : 42) - (late ? 10 : 0);
        return { dom, motes };
    }

    /* small deterministic random so particles sit the same way on every load */
    function rand(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
    function particles(n, seed) {
        const r = rand(seed || 7), out = [];
        for (let i = 0; i < n; i++) out.push({ x: +(4 + r() * 92).toFixed(1), delay: +(-r() * 22).toFixed(1), dur: +(15 + r() * 11).toFixed(1), size: Math.round(9 + r() * 8), sway: Math.round(18 + r() * 34) * (r() > 0.5 ? 1 : -1), spin: Math.round(160 + r() * 260) * (r() > 0.5 ? 1 : -1), tone: i % 3 });
        return out;
    }
    function hexToRgb(h) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return [0, 0, 0]; const v = parseInt(m[1], 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
    function mix(a, b, t) { const x = hexToRgb(a), y = hexToRgb(b); return '#' + x.map((c, i) => Math.round(c + (y[i] - c) * t).toString(16).padStart(2, '0')).join(''); }

    const api = { ORDER, START, LOOK, southern, season, look, counts, particles, rand, mix, hexToRgb };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.LowiSeasonCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
