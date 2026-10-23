'use strict';
/* 23 Oct 2026 (mirror-move): the Mirror mode hero on the Move page and the Mirror bubble in the Move bloom paint only the app's
   brand blues (#0a84ff / #5aa9ff / #8fe7ff and deeper blues of the same hue). The branch it came from (mirror-hero, 22 Oct) used a
   blue-to-violet rim, a violet Start button and a violet Mirror bubble; Emmanuel's brand has no violet and no green. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '..', 'mirror-move.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const rgb = c => { c = c.trim(); if (c[0] === '#') { let h = c.slice(1); if (h.length === 3) h = [...h].map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); } const m = c.match(/rgba?\(([^)]+)\)/); return m ? m[1].split(/[ ,/]+/).slice(0, 3).map(Number) : null; };
const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return { h: 0, s: 0, l }; const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; return { h: h < 0 ? h + 360 : h, s, l }; };
const isViolet = c => { const v = rgb(c); if (!v) return false; const x = hsl(v); return x.h >= 225 && x.h <= 320 && x.s > 0.2 && x.l > 0.08 && x.l < 0.95; };
const isGreen = c => { const v = rgb(c); if (!v) return false; const x = hsl(v); return x.h >= 75 && x.h <= 190 && x.s > 0.28 && x.l > 0.12 && x.l < 0.93; };
const colours = s => s.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]+\)/g) || [];

/* every rule whose selector names the hero (.mm-hero*) or the Mirror bubble (.wm-mirror), plus their keyframes */
const heroRules = () => {
    const out = [], re = /([^{}]+)\{([^{}]*)\}/g; let m;
    while ((m = re.exec(css))) if (/\.mm-hero|\.wm-mirror/.test(m[1])) out.push(m[0]);
    for (const k of ['mmHeroRim', 'mmHeroBreathe', 'mmHeroScan', 'mmOrbPulse']) { const i = css.indexOf('@keyframes ' + k); if (i >= 0) out.push(css.slice(i, css.indexOf('} }', i) + 3)); }
    return out.join('\n');
};

test('the Mirror hero and the Mirror bubble exist in the stylesheet', () => {
    const h = heroRules();
    for (const s of ['.mm-hero-go', '.mm-hero::before', '.wm-orb.wm-mirror']) assert.ok(h.includes(s), s);
});

test('Mirror hero and Mirror bubble: no violet, no green, only brand blues', () => {
    const all = colours(heroRules());
    assert.ok(all.length > 10, 'colours found');
    const bad = all.filter(c => isViolet(c) || isGreen(c));
    assert.deepEqual(bad, [], 'off-brand colours: ' + bad.join(' '));
});

test('the Start button and the rim lead with the primary brand blue', () => {
    const h = heroRules().toLowerCase();
    const go = h.slice(h.indexOf('.mm-hero-go {'), h.indexOf('}', h.indexOf('.mm-hero-go {')));
    assert.ok(/linear-gradient\(100deg, #0a84ff/.test(go), 'Start button starts at #0a84ff');
    const rim = h.slice(h.indexOf('.mm-hero::before {'), h.indexOf('}', h.indexOf('.mm-hero::before {')));
    for (const c of ['#8fe7ff', '#5aa9ff', '#0a84ff']) assert.ok(rim.includes(c), 'rim uses ' + c);
});
