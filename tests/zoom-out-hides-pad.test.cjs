'use strict';
/* Oct 24 2026 (Emmanuel, raised several times, screenshots of the zoomed-out world with only the controller left in it: "Why is it
   that when I zoom out the joystick still stays ..."). Past the World Map (html.wh-cosmos) every Home control fades in one rule in
   world-home.css; the steering controller (#whPad, data-orbit="joy") was left out, so it stayed alone on the screen, also while
   Misty was out flying (lw-clean keeps only the controller). It now fades in the same rule, with the same timing. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('world-home.css').replace(/\/\*[\s\S]*?\*\//g, '');
const padCss = read('misty-pad.css').replace(/\/\*[\s\S]*?\*\//g, '');
const wh = read('world-home.js');

const rules = src => { const out = []; const re = /([^{}]+)\{([^{}]*)\}/g; let m; while ((m = re.exec(src))) out.push({ sels: m[1].split(',').map(s => s.trim()).filter(Boolean), body: m[2] }); return out; };
/* [ids, classes/attrs/pseudo-classes, types] (good enough for these selectors; :not() counts its argument) */
const spec = sel => { const s = sel.replace(/:not\(([^)]*)\)/g, ' $1 '); const ids = (s.match(/#[\w-]+/g) || []).length; const cls = (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length; const types = (s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|::?[\w-]+/g, ' ').match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length; return [ids, cls, types]; };
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

const cosmos = rules(css).find(r => r.sels.some(s => s === 'html.wh-home.wh-cosmos #whHud .wh-cell'));

test('the zoomed-out (wh-cosmos) hide rule exists and fades the Home bubbles', () => {
    assert.ok(cosmos, 'cosmos rule present');
    assert.match(cosmos.body, /opacity:\s*0\s*!important/);
    assert.match(cosmos.body, /pointer-events:\s*none\s*!important/);
    assert.match(cosmos.body, /transition:\s*opacity\s*\.35s\s*ease\s*!important/);
});

test('the controller is in the very same rule (same fade, same timing) and its Autopilot chip too', () => {
    assert.ok(cosmos.sels.includes('html.wh-home.wh-cosmos #whHud .wh-pad:not(.mp-down)'), 'controller in the cosmos rule');
    assert.ok(cosmos.sels.includes('html.wh-home.wh-cosmos .wh-hud .wh-pad-chip'), 'Autopilot chip in the cosmos rule');
});

test('a finger still on the controller keeps it (steering into the edge / the galaxy breakout must not lose the stick)', () => {
    const sel = cosmos.sels.find(s => /wh-pad:not/.test(s));
    assert.match(sel, /:not\(\.mp-down\)/);
    assert.match(read('misty-pad.js'), /b\.classList\.add\('mp-down'\)/, 'mp-down marks the held finger');
    assert.match(read('misty-pad.js'), /b\.classList\.remove\('mp-down'\)/, 'and goes when the finger lifts');
});

test('no rule that forces the controller visible outranks the zoomed-out hide', () => {
    const hide = spec('html.wh-home.wh-cosmos #whHud .wh-pad:not(.mp-down)');
    for (const src of [css, padCss]) for (const r of rules(src)) {
        if (!/opacity:\s*1\s*!important/.test(r.body)) continue;
        for (const s of r.sels) if (/wh-pad(?!-)/.test(s) || /#whPad\b/.test(s)) assert.ok(cmp(hide, spec(s)) > 0, 'outranked by ' + s);
    }
});

test('wh-cosmos is a zoom-out only: never during the galaxy breakout or inside a world', () => {
    const line = wh.split('\n').find(l => /const far = /.test(l) && /wh-cosmos/.test(l)) || '';
    assert.match(line, /const far = r\.dist > \(r\.maxD \|\| 13\) \* 1\.06 && !gx && !inRegion\(\);/, 'far = past the World Map, not in the galaxy, not in a world');
});
