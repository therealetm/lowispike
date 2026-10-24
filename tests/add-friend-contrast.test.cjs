'use strict';
/* Oct 24, 2026 (Emmanuel: "Add Friend" in dark mode shows white text on a white bubble).
   Cause: misty-say.css (Misty's speech bubbles, loaded after style-sweep.css) defined --ms-ink: #f2f8ff on :root, the same
   name style-sweep.css uses for the dark navy text on its white --ms-btn buttons. The later :root won, so every sweep
   button (Add friend .cr-go, Claim, Save, the Cook list ticks via --cs-ink) got near-white text on a white gradient, in
   every theme. Fix: Misty's bubbles use their own --msay-ink. Pins: the button ink tokens are defined in exactly one
   stylesheet, the real Add friend colours reach WCAG AA (4.5:1) against every stop of the button gradient, and no
   focus, pressed or hover rule for .cr-go swaps in a light text or a dark bubble. tools/add-friend-contrast/check.cjs
   measures the rendered button in a browser in normal, focused and pressed states, dark and light. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const CSS = fs.readdirSync(ROOT).filter(f => f.endsWith('.css'));
const noComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

function hex(c) {
    c = c.trim().toLowerCase();
    let m = c.match(/^#([0-9a-f]{3})$/);
    if (m) return m[1].split('').map(x => parseInt(x + x, 16));
    m = c.match(/^#([0-9a-f]{6})/);
    if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    throw new Error('not a hex colour: ' + c);
}
function lum(rgb) {
    const a = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function ratio(a, b) { const x = lum(hex(a)), y = lum(hex(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function defs(name) {
    const out = [];
    const re = new RegExp('(^|[;{\\s])' + name.replace(/-/g, '\\-') + '\\s*:\\s*([^;}]+)', 'g');
    for (const f of CSS) { const s = noComments(read(f)); let m; while ((m = re.exec(s))) out.push({ f, v: m[2].trim() }); }
    return out;
}

test('the button ink tokens are defined in one stylesheet each (no :root name collision)', () => {
    const ms = defs('--ms-ink');
    assert.deepStrictEqual([...new Set(ms.map(d => d.f))], ['style-sweep.css'], '--ms-ink must only be defined by style-sweep.css, found in: ' + ms.map(d => d.f).join(', '));
    const say = defs('--msay-ink');
    assert.deepStrictEqual([...new Set(say.map(d => d.f))], ['misty-say.css'], 'Misty\'s bubble ink lives in misty-say.css as --msay-ink');
    assert.ok(!/var\(--ms-ink\b/.test(noComments(read('misty-say.css'))), 'misty-say.css must not read or write the sweep button ink');
    const cs = defs('--cs-ink');
    assert.deepStrictEqual([...new Set(cs.map(d => d.f))], ['cook-shop.css'], '--cs-ink is only defined by cook-shop.css');
});

test('Add friend text reaches AA contrast against every stop of its bubble', () => {
    const sweep = noComments(read('style-sweep.css'));
    const ink = defs('--ms-ink')[0].v;
    const btn = defs('--ms-btn').find(d => d.f === 'style-sweep.css').v;
    const stops = btn.match(/#[0-9a-f]{3,6}\b/gi) || [];
    assert.ok(stops.length >= 2, 'the sweep button is a gradient: ' + btn);
    for (const s of stops) assert.ok(ratio(ink, s) >= 4.5, 'Add friend ink ' + ink + ' on ' + s + ' is only ' + ratio(ink, s).toFixed(2) + ':1');
    /* .cr-go is one of the sweep buttons, so it takes --ms-btn and --ms-ink */
    const rule = sweep.split('}').find(r => /\.cr-go\b/.test(r) && /--ms-btn/.test(r));
    assert.ok(rule, 'style-sweep.css styles .cr-go with --ms-btn');
    const inkRule = sweep.split('}').find(r => /\.cr-go\b/.test(r) && /color\s*:\s*var\(--ms-ink\)/.test(r));
    assert.ok(inkRule, 'style-sweep.css gives .cr-go the --ms-ink text colour');
    /* the own cell-room colours (used where the sweep is not loaded) are readable too */
    const own = noComments(read('cell-room.css')).match(/\.cr-go\{[^}]*\}/)[0];
    const fg = own.match(/[;{]color:(#[0-9a-f]{3,6})/i)[1];
    for (const s of own.match(/linear-gradient\(([^)]*)\)/i)[1].match(/#[0-9a-f]{3,6}\b/gi)) assert.ok(ratio(fg, s) >= 4.5, 'cell-room .cr-go ' + fg + ' on ' + s + ' is ' + ratio(fg, s).toFixed(2) + ':1');
});

test('no focus, pressed or hover rule turns Add friend light on light', () => {
    for (const f of CSS) {
        const s = noComments(read(f));
        const re = /([^{}]*\.cr-go[^{}]*:(?:focus|focus-visible|active|hover)[^{}]*)\{([^}]*)\}/g;
        let m;
        while ((m = re.exec(s))) {
            const body = m[2];
            const col = body.match(/(?:^|;)\s*color\s*:\s*([^;!]+)/);
            assert.ok(!col || /var\(--ms-ink\)|#0b|#1|#2|navy|inherit/i.test(col[1]), f + ' ' + m[1].trim() + ' sets a light text colour: ' + col[1]);
            assert.ok(!/background(-color)?\s*:\s*(#0|#1|rgba?\(\s*[0-3]?\d\s*,)/i.test(body), f + ' ' + m[1].trim() + ' swaps in a dark bubble');
        }
    }
});

test('the browser check for the rendered button exists and covers every state and theme', () => {
    const t = read('tools/add-friend-contrast/check.cjs');
    for (const k of ['normal', 'focus', 'pressed', 'dark', 'light', 'cr-go', 'webkit']) assert.ok(t.includes(k), 'check.cjs covers ' + k);
});
