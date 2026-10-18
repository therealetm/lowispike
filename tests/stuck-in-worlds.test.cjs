'use strict';
/* Oct 18 2026, ~19:40 CEST, Emmanuel on his iPhone (live 20261018-191027): "When I enter a world, the steering wheel disappears",
   then "literally stuck". Cause (from release 20261018-165646, the one-page ring Home, home-orbit-v2.css):
   - the ring rule that hides the ring inside a world, html.o8.wh-home.wh-away #whHud [data-orbit], also matched the joystick
     (#whPad carries data-orbit="joy" on the ring). With its id it outweighed misty-pad.css's keep-steering rule
     (html.mf-in.wh-away:not(.lw-clean-auto) .wh-hud .wh-pad), so inside a world the joystick was invisible and untouchable;
   - the "old Home chrome steps back" rule hid #whHud .wh-zoom everywhere on the ring Home, including inside a world, where the
     World map stick is the way back out (clean-view-core.js keeps it there on purpose).
   Inside a world: no joystick, no World map stick, no X = no way to steer or leave.
   Rules here: inside a world with Misty in it, no stylesheet hides the joystick with more weight than misty-pad's keep rule,
   and nothing hides the World map stick inside a world. The live check (tests/stuck-in-worlds-live.cjs) enters a world,
   steers with the joystick and leaves by the World map stick. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function rules(css) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const out = [];
    function block(str) {
        let j = 0;
        while (j < str.length) {
            const open = str.indexOf('{', j); if (open < 0) break;
            const sel = str.slice(j, open).trim();
            let depth = 1, k = open + 1; while (k < str.length && depth) { if (str[k] === '{') depth++; else if (str[k] === '}') depth--; k++; }
            const body = str.slice(open + 1, k - 1);
            if (sel.startsWith('@')) { if (/^@(media|supports)/.test(sel)) block(body); }
            else out.push({ sel, body });
            j = k;
        }
    }
    block(css);
    return out;
}
/* split on top-level commas (not inside :not(...) / [..]) */
function split(sel) {
    const out = []; let d = 0, cur = '';
    for (const ch of sel) { if (ch === '(' || ch === '[') d++; else if (ch === ')' || ch === ']') d--; if (ch === ',' && !d) { out.push(cur.trim()); cur = ''; } else cur += ch; }
    if (cur.trim()) out.push(cur.trim());
    return out;
}
/* specificity [ids, classes/attrs/pseudo-classes, elements]; :not(x) counts as x */
function spec(sel) {
    let s = sel.replace(/:not\(([^()]*)\)/g, ' $1 ');
    const ids = (s.match(/#[\w-]+/g) || []).length;
    const cls = (s.match(/\.[\w-]+/g) || []).length + (s.match(/\[[^\]]*\]/g) || []).length + (s.match(/:(?!:)[\w-]+/g) || []).length;
    s = s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]*\]|::?[\w-]+/g, ' ');
    const el = (s.match(/(^|[\s>+~])([a-z][\w-]*)/gi) || []).length;
    return [ids, cls, el];
}
const gt = (a, b) => a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2];
const lastCompound = s => s.split(/[\s>+~]+/).filter(Boolean).pop() || '';
const hides = body => /opacity\s*:\s*0(\.0*)?\s*!important/.test(body) || /pointer-events\s*:\s*none\s*!important/.test(body) || /display\s*:\s*none\s*!important/.test(body) || /visibility\s*:\s*hidden\s*!important/.test(body);

/* the html classes inside a world, Misty in it, you steering (not autopilot) */
const IN_WORLD = ['wh-on', 'wh-home', 'o8', 'cw-on', 'bw3-ready', 'wh-world-live', 'wh-away', 'mf-on', 'mf-in', 'wh-mapview', 'lb3d'];
/* can the html-part of a selector hold with these classes? (only class tests on html are read) */
function htmlOk(s, cls) {
    const m = s.match(/^html((?:[.:][\w-]+(?:\([^)]*\))?|\[[^\]]*\])*)/); if (!m) return true;
    const part = m[1];
    for (const c of (part.replace(/:not\([^)]*\)/g, '').match(/\.[\w-]+/g) || [])) if (!cls.includes(c.slice(1))) return false;
    for (const n of (part.match(/:not\(([^)]*)\)/g) || [])) { const inner = n.slice(5, -1); if (/^\.[\w-]+$/.test(inner) && cls.includes(inner.slice(1))) return false; }
    if (/\[data-theme="light"\]/.test(part)) return false;
    return true;
}
/* could the last compound match the joystick <button id="whPad" class="wh-pad no-page-swipe" data-orbit="joy"> inside #whHud.wh-hud? */
function hitsPad(s) {
    const c = lastCompound(s);
    if (/:not\(#whPad\)/.test(c) || /:not\(\.wh-pad\)/.test(c) || /:not\(\[data-orbit\]\)/.test(c)) return false;
    const base = c.replace(/:not\([^)]*\)/g, '').replace(/::?[\w-]+(\([^)]*\))?/g, '');
    if (!base) return false;
    const ids = base.match(/#[\w-]+/g) || [], cls = base.match(/\.[\w-]+/g) || [], attrs = base.match(/\[[^\]]*\]/g) || [];
    const tag = (base.match(/^[a-z][\w-]*/i) || [])[0];
    if (tag && tag !== 'button' && tag !== '*') return false;
    if (ids.some(i => i !== '#whPad')) return false;
    if (cls.some(k => k !== '.wh-pad' && k !== '.no-page-swipe')) return false;
    if (attrs.some(a => !/^\[data-orbit(="joy"|='joy'|=joy)?\]$/.test(a))) return false;
    return !!(ids.length || cls.length || attrs.length || tag === 'button');
}
const KEEP = 'html.mf-in.wh-away:not(.lw-clean-auto) .wh-hud .wh-pad';
const SHEETS = fs.readdirSync(ROOT).filter(f => f.endsWith('.css'));

test('misty-pad.css still keeps the joystick inside a world Misty is in', () => {
    const keep = rules(read('misty-pad.css')).find(r => split(r.sel).includes(KEEP));
    assert.ok(keep, 'keep-steering rule present');
    assert.match(keep.body, /opacity\s*:\s*1\s*!important/);
    assert.match(keep.body, /pointer-events\s*:\s*auto\s*!important/);
});

test('inside a world with Misty in it, no stylesheet hides the joystick over the keep-steering rule', () => {
    const keepSpec = spec(KEEP), bad = [];
    for (const f of SHEETS) for (const r of rules(read(f))) {
        if (!hides(r.body)) continue;
        for (const s of split(r.sel)) {
            if (!/wh-away/.test(s) && !/^html\.o8/.test(s)) continue; /* only rules that are about worlds or the ring Home */
            if (!htmlOk(s, IN_WORLD) || !hitsPad(s)) continue;
            if (gt(spec(s), keepSpec) || (spec(s).join() === keepSpec.join() && f > 'misty-pad.css')) bad.push(f + ': ' + s);
        }
    }
    assert.deepStrictEqual(bad, [], 'these hide the joystick inside a world');
});

test('the ring Home hides its own ring inside a world, but not the joystick', () => {
    const r = rules(read('home-orbit-v2.css')).filter(x => /wh-away/.test(x.sel) && hides(x.body));
    const ring = r.flatMap(x => split(x.sel)).filter(s => /\[data-orbit\]|\.o8-cell/.test(lastCompound(s)));
    assert.ok(ring.length >= 2, 'ring cells still hidden inside a world: ' + ring.join(' | '));
    assert.ok(ring.filter(s => /\[data-orbit\]/.test(lastCompound(s))).every(s => /:not\(#whPad\)/.test(s)), 'the [data-orbit] rule leaves #whPad out: ' + ring.join(' | '));
});

test('inside a world the World map stick (the way back out) is not hidden', () => {
    const bad = [];
    for (const f of SHEETS) for (const r of rules(read(f))) {
        if (!/display\s*:\s*none\s*!important|opacity\s*:\s*0\s*!important/.test(r.body)) continue;
        for (const s of split(r.sel)) {
            const c = lastCompound(s); if (!/\.wh-zoom(?![\w-])/.test(c) || /\.bw3-full/.test(s)) continue;
            if (!htmlOk(s, IN_WORLD)) continue;
            /* the clean flight view fades it on purpose (lw-clean*), not part of the in-world default */
            if (/lw-clean|wh-today-open|wh-r2-on|mf-galaxy|gx-/.test(s)) continue;
            bad.push(f + ': ' + s);
        }
    }
    assert.deepStrictEqual(bad, [], 'these hide the World map stick inside a world');
});

test('on the ring Home itself (not in a world) the World map stick still steps back', () => {
    const sels = rules(read('home-orbit-v2.css')).filter(x => /display\s*:\s*none\s*!important/.test(x.body)).flatMap(x => split(x.sel));
    const z = sels.filter(s => /#whHud \.wh-zoom$/.test(s));
    assert.ok(z.length === 1, 'one ring-Home rule for the stick: ' + z.join(' | '));
    assert.ok(htmlOk(z[0], ['wh-home', 'o8']), 'applies on Home');
    assert.ok(!htmlOk(z[0], IN_WORLD), 'not inside a world');
});
