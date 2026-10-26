'use strict';
/* BH-012 (Oct 19 2026): a double tap went through to the next screen. Every R2 sheet (Log meal's Breakfast / Lunch / Dinner /
   Snacks picker, then the slot's sheet, and every other sheet) is swapped in under the finger at once, so the second tap of a
   double tap landed on whatever the new sheet had there: on a live WebKit iPhone 13 a double tap on Breakfast or Lunch put the
   cursor in the meal box (keyboard up), on Dinner it hit Log meal, on Snacks it opened "Add your own numbers"; on Chromium a
   double tap on Snacks opened Misty's recipe pick instead. A second tap on the scrim closed a sheet right after it opened.
   Live probe: BUGHUNT/playtest/probe-slot-dbl.cjs. Now a new sheet ignores real taps for its first 350 ms (no human aims at a
   sheet that is still springing in); programmatic clicks still pass. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function mk() {
    const m = html.match(/let ovStack = \[\];\n(?:R2\.TAP_GUARD_MS = \d+;\n)?R2\.sheet = function\(html, opts\)\{[\s\S]*?\n\};/);
    assert.ok(m, 'index.html has R2.sheet');
    let now = 1000;
    const el = () => { const L = []; return { L, className: '', classList: { add() { }, remove() { } }, set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; }, addEventListener(t, f, o) { L.push({ t, f, cap: o === true || !!(o && o.capture), o }); }, querySelector() { return this.scrim || (this.scrim = el()); } }; };
    const ctx = vm.createContext({ performance: { now: () => now }, document: { createElement: el, body: { appendChild() { } } }, requestAnimationFrame: () => 0 });
    vm.runInContext('const R2 = { ico: { x: "x" } };', ctx);
    vm.runInContext(m[0], ctx);
    return { R2: vm.runInContext('R2', ctx), at: t => { now = 1000 + t; } };
}
const ev = trusted => { const e = { isTrusted: trusted, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, stopImmediatePropagation() { this.stopped = true; } }; return e; };
const fire = (ov, type, e) => { ov.L.filter(l => l.t === type && l.cap).forEach(l => l.f(e)); return e; };

test('a real tap in the first moment after a sheet opens is ignored (second tap of a double tap)', () => {
    const { R2, at } = mk(); const ov = R2.sheet('<p>x</p>', {});
    at(120);
    const c = fire(ov, 'click', ev(true));
    assert.ok(c.prevented && c.stopped, 'click swallowed in capture, so neither the button under the finger nor the scrim gets it');
});

test('the second tap does not focus a field either (no keyboard popping up)', () => {
    const { R2, at } = mk(); const ov = R2.sheet('<input>', {});
    at(150);
    assert.ok(fire(ov, 'mousedown', ev(true)).prevented, 'mousedown default (focus) prevented');
    assert.ok(fire(ov, 'touchstart', ev(true)).prevented, 'touchstart default (focus + compat click) prevented');
    const ts = ov.L.find(l => l.t === 'touchstart'); assert.ok(ts.o && ts.o.passive === false, 'touchstart listener must be non-passive to prevent');
});

test('a normal tap once the sheet has opened works as before', () => {
    const { R2, at } = mk(); const ov = R2.sheet('<p>x</p>', {});
    at(600);
    const c = fire(ov, 'click', ev(true));
    assert.ok(!c.prevented && !c.stopped);
    assert.ok(!fire(ov, 'touchstart', ev(true)).prevented);
    assert.ok(!fire(ov, 'mousedown', ev(true)).prevented);
});

test('code that clicks inside a fresh sheet (el.click(), untrusted) is never blocked', () => {
    const { R2, at } = mk(); const ov = R2.sheet('<p>x</p>', {});
    at(10);
    const c = fire(ov, 'click', ev(false));
    assert.ok(!c.prevented && !c.stopped);
});

test('the guard is short: 350 ms', () => {
    const { R2 } = mk();
    assert.strictEqual(R2.TAP_GUARD_MS, 350);
});
