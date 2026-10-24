'use strict';
/* Oct 24 2026 13:40 (back and close sweep): over Home's 3D world the R2 sheets hide their own X and share one round X at the
   bottom centre (#whX, z-index 300, world-home.js). Send energy on a person card opens the care sheet at z-index 99995 (above
   the card), so that X sat under the care sheet's scrim: dimmed, and a tap on it landed on the scrim. syncX now lifts the X one
   above the top sheet when that sheet is above 300, and hands it back to the stylesheet otherwise. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'world-home.js'), 'utf8');

function syncXSource() {
    const a = SRC.indexOf('    function syncX() {');
    assert.ok(a > 0, 'syncX is in world-home.js');
    const b = SRC.indexOf('\n    }\n', a);
    return SRC.slice(a, b + 6);
}

function run(sheetZ) {
    const x = { hidden: true, style: { zIndex: '' } };
    const cls = new Set();
    const H = { classList: { contains: c => cls.has(c), toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); } } };
    const r = sheetZ == null ? null : { z: sheetZ };
    const ctx = {
        x, H, st: { today: false }, out: null,
        ensureX: () => x, topR2: () => ctx.r, topWorld: () => null, topHost: () => null, glassSheet: () => { },
        getComputedStyle: el => ({ zIndex: String(el.z) }), r,
    };
    vm.runInNewContext(syncXSource() + '\nsyncX();', ctx);
    return { x, ctx, again: z => { ctx.r = z == null ? null : { z }; vm.runInNewContext(syncXSource() + '\nsyncX();', ctx); return x; } };
}

test('Send energy care sheet (z 99995): the one X is lifted above it and shows', () => {
    const { x } = run(99995);
    assert.strictEqual(x.hidden, false);
    assert.strictEqual(x.style.zIndex, '99996');
});

test('an ordinary sheet below 300 keeps the stylesheet z-index', () => {
    const { x } = run(200);
    assert.strictEqual(x.hidden, false);
    assert.strictEqual(x.style.zIndex, '');
});

test('after the high sheet closes the X goes back to the stylesheet and hides', () => {
    const t = run(99995);
    const x = t.again(null);
    assert.strictEqual(x.style.zIndex, '');
    assert.strictEqual(x.hidden, true);
});
