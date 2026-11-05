/* LOWiSPIKE Dark (true black), Nov 5 2026. Emmanuel: "I finally want a dark mode, for the whole entire app, from the galaxy
   to the app interface"; the old Night look is bluish (navy page, navy glass, navy 3D space), fine for a morning look but not
   a dark mode. Pure colour maths, no DOM: true-black.js applies it to the style sheets, canvas paint and the 3D world.
   Rule: a dark colour (HSL lightness < DARK_L) with a blue / violet / cyan hue (HUE_MIN..HUE_MAX) and some saturation
   becomes a neutral grey at LIFT x its lightness, alpha kept. Bright colours (accents, Misty's glow, gold, text) and every
   other hue (warm, red, green status colours) are left alone, so the surfaces go black while the meaning stays. */
(function (root) {
    'use strict';
    const DARK_L = 0.38, HUE_MIN = 165, HUE_MAX = 300, MIN_S = 0.06, LIFT = 0.7;
    /* 'black' (Dark) or 'night' (the old bluish Night). Nothing stored = 'black': Emmanuel wants the app's dark look to be the
       real dark mode; the blue Night stays one tap away in Look & Ton. */
    const KEY = 'lowi.theme.dark';
    const kindOf = v => (v === 'night' ? 'night' : 'black');
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    function hsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
        if (d === 0) return [0, 0, l];
        const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return [h * 60, s, l];
    }
    function hsl2rgb(h, s, l) {
        h = ((h % 360) + 360) % 360 / 360;
        if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
        const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
        return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255));
    }
    /* the lightness curve: the deepest navies (page, sky: L < SINK) become pure black, the glass navies land on the iOS dark
       greys (#1c1c1e / #2c2c2e), lighter blue-greys keep most of their lightness so borders and muted text stay readable */
    const SINK = 0.07;
    const darkL = l => Math.max(0, l - SINK) * (l < 0.2 ? 1 : 1 + (l - 0.2) * 0.4);
    /* should this colour go grey? */
    function isBlueDark(r, g, b) {
        const [h, s, l] = hsl(r, g, b);
        return l < DARK_L && s >= MIN_S && h >= HUE_MIN && h <= HUE_MAX && !(r === g && g === b);
    }
    /* [r,g,b] -> neutral [v,v,v], or null when the colour stays */
    function neutral(r, g, b) {
        if (!isBlueDark(r, g, b)) return null;
        const l = hsl(r, g, b)[2], v = Math.round(clamp(darkL(l), 0, 1) * 255);
        return [v, v, v];
    }
    const hex2 = n => n.toString(16).padStart(2, '0');
    const fmtA = a => String(Math.round(a * 1000) / 1000);

    /* one CSS colour token -> replacement text, or null */
    const TOKEN = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(\s*[^()]*\)/g;
    function parse(tok) {
        tok = tok.trim();
        if (tok[0] === '#') {
            let h = tok.slice(1);
            if (![3, 4, 6, 8].includes(h.length) || /[^0-9a-f]/i.test(h)) return null;
            if (h.length <= 4) h = h.split('').map(c => c + c).join('');
            const n = [0, 2, 4, 6].map(i => (i < h.length ? parseInt(h.slice(i, i + 2), 16) : 255));
            return { r: n[0], g: n[1], b: n[2], a: h.length === 8 ? n[3] / 255 : 1, hex: true };
        }
        const m = /^(rgba?|hsla?)\(\s*([^()]*)\)$/i.exec(tok);
        if (!m) return null;
        const parts = m[2].split(/\s*[,/]\s*|\s+/).filter(Boolean);
        if (parts.length < 3 || parts.some(x => /var|calc|from|none/i.test(x))) return null;
        const num = (x, max) => (/%$/.test(x) ? parseFloat(x) / 100 * max : parseFloat(x));
        const a = parts[3] == null ? 1 : num(parts[3], 1);
        if ([parts[0], parts[1], parts[2]].some(x => !isFinite(parseFloat(x))) || !isFinite(a)) return null;
        if (/^rgb/i.test(m[1])) return { r: clamp(num(parts[0], 255), 0, 255), g: clamp(num(parts[1], 255), 0, 255), b: clamp(num(parts[2], 255), 0, 255), a };
        const [r, g, b] = hsl2rgb(parseFloat(parts[0]), clamp(parseFloat(parts[1]) / 100, 0, 1), clamp(parseFloat(parts[2]) / 100, 0, 1));
        return { r, g, b, a };
    }
    /* a faint wash of a bright blue (rgba(10,132,255,.14), the cyan rims at .26) reads as navy on black: judged by what it shows
       over black (colour x alpha), it goes neutral at the lightness of that result, alpha kept. Solid accents (alpha >= WASH_A)
       keep their colour. */
    const WASH_A = 0.36;
    function washNeutral(c) {
        if (!(c.a < WASH_A) || c.a <= 0) return null;
        const r = c.r * c.a, g = c.g * c.a, b = c.b * c.a;
        if (!isBlueDark(Math.round(r), Math.round(g), Math.round(b))) return null;
        const v = Math.round(clamp(hsl(c.r, c.g, c.b)[2] * 0.9, 0, 1) * 255);
        return [v, v, v];
    }
    function neutralToken(tok) {
        const c = parse(tok);
        if (!c) return null;
        const n = neutral(Math.round(c.r), Math.round(c.g), Math.round(c.b)) || washNeutral(c);
        if (!n) return null;
        if (c.a >= 1) return c.hex ? '#' + n.map(hex2).join('') : 'rgb(' + n.join(', ') + ')';
        return 'rgba(' + n.join(', ') + ', ' + fmtA(c.a) + ')';
    }
    /* any CSS value (a colour, a gradient, a shadow list): returns the rewritten text or null when nothing changed */
    function rewrite(value) {
        if (typeof value !== 'string' || !value || (value.indexOf('#') < 0 && !/(rgb|hsl)a?\(/i.test(value))) return null;
        if (/url\(/i.test(value)) { /* never touch the inside of url(...) (data URIs of SVGs carry their own colours) */
            let changed = false;
            const out = value.replace(/url\((?:[^()]|\([^()]*\))*\)|#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(\s*[^()]*\)/gi, t => { if (/^url\(/i.test(t)) return t; const r = neutralToken(t); if (r) { changed = true; return r; } return t; });
            return changed ? out : null;
        }
        let changed = false;
        const out = value.replace(TOKEN, t => { const r = neutralToken(t); if (r) { changed = true; return r; } return t; });
        return changed ? out : null;
    }
    /* a CSS rule's selector we must not touch: the light theme's own rules, our own rules */
    function skipSelector(sel) {
        if (!sel) return false;
        return /data-(?:theme|ui)\s*=\s*["']?light|data-black|data-tb-keep/i.test(sel);
    }
    /* the 3D renderer: a THREE colour given as 0..1 floats (sRGB-ish); returns [r,g,b] floats or null */
    function neutralFloat(r, g, b) {
        const n = neutral(Math.round(clamp(r, 0, 1) * 255), Math.round(clamp(g, 0, 1) * 255), Math.round(clamp(b, 0, 1) * 255));
        return n ? n.map(v => v / 255) : null;
    }
    /* the page is in Dark when the stored dark kind is black and the effective theme is dark (Night, Auto at night, the
       Day & night slider on its night side) */
    const isOn = (kind, effectiveTheme) => kindOf(kind) === 'black' && effectiveTheme !== 'light';

    const core = { KEY, SINK, darkL, WASH_A, washNeutral, DARK_L, HUE_MIN, HUE_MAX, LIFT, kindOf, hsl, isBlueDark, neutral, parse, neutralToken, rewrite, skipSelector, neutralFloat, isOn };
    if (typeof module === 'object' && module.exports) module.exports = core;
    root.LowiTrueBlackCore = core;
})(typeof window !== 'undefined' ? window : globalThis);
