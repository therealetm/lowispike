'use strict';
/* Oct 26, 2026 (Emmanuel, voice + iPhone screenshot of Shop > Supermarket, MAYA-HANDOFF 0.24): "This section is a bit wiggly
   woggly, fix that" and "my snack buy again thingy ... the more you have in there ... let's just have a buy again auto fill
   option. Recent or something, but not stack it up like that."
   Root cause (WebKit iPhone 13, 390x844): every bought or logged snack became its own "+ name" pill with white-space: nowrap
   and no max width. A long name ("Shirataki Carbonara Pull ...") made a pill wider than the Snacks box, and .stp-scroll
   (overflow-y: auto, so overflow-x turns auto too) then scrolled sideways: a swipe moved the whole list left and clipped it.
   The Shop from home door also sat edge to edge (1 px) while the store row and search field sit 18 px in.
   Now: one "Buy again" row (preview + one tap fills Snacks to buy, Undo), the list can't scroll sideways, chips can't be
   wider than their row, and the door and the list share the head's 18 px side margin. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../store-picks-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const sp = read('store-picks.js'), css = read('store-picks.css'), wb = read('week-basket.css');
/* the declarations of the LAST plain rule for a selector (later rules win) */
function rule(src, sel) {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(^|\\n)' + esc + '\\s*\\{([^}]*)\\}', 'g');
    let m, out = null; while ((m = re.exec(src))) out = m[2];
    assert.ok(out != null, 'rule ' + sel + ' exists');
    return out;
}
const prop = (body, p) => { const m = body.match(new RegExp('(?:^|;|\\s)' + p + '\\s*:\\s*([^;]+)')); return m ? m[1].trim() : null; };
const sidePad = v => { const a = String(v).trim().split(/\s+/); return a.length === 1 ? a[0] : a[1]; };

test('the Supermarket list can never scroll sideways', () => {
    const sc = rule(css, '.stp-scroll');
    assert.match(prop(sc, 'overflow-x') || '', /^(hidden|clip)$/, '.stp-scroll has overflow-x hidden');
    assert.strictEqual(prop(sc, 'overflow-y'), 'auto');
});

test('a chip is never wider than its row (long names cannot push the list out)', () => {
    const ch = rule(css, '.stp-chip');
    assert.strictEqual(prop(ch, 'max-width'), '100%');
});

test('the list and the Shop from home door line up with the store row and search field (the head side margin)', () => {
    const head = sidePad(prop(rule(css, '.stp-head'), 'padding'));
    assert.strictEqual(sidePad(prop(rule(css, '.stp-scroll'), 'padding')), head, 'list side padding = head side padding');
    const door = rule(wb, '.stp-wb');
    const m = String(prop(door, 'margin')).split(/\s+/);
    assert.strictEqual(m[1], head, 'door side margin = head side padding');
    assert.notStrictEqual(prop(door, 'width'), '100%', 'width 100% plus a margin would overflow the card');
});

test('Buy again is one row, never a stack of pills that grows with every snack', () => {
    const fn = sp.slice(sp.indexOf('function snackHTML()'), sp.indexOf('function repaintSnacks()'));
    assert.ok(fn.length > 100);
    assert.doesNotMatch(fn, /v\.again\.map\(/, 'no button per snack');
    assert.doesNotMatch(fn, /data-stp-snack-again=/);
    assert.match(fn, /data-stp-snack-refill/, 'one autofill button');
    assert.match(fn, /data-stp-snack-undo/, 'Undo after the fill');
    assert.match(fn, /T\('Buy again', 'Wieder kaufen', 'Comprar otra vez'\)/);
    assert.match(fn, /T\('Undo', 'Rückgängig', 'Deshacer'\)/);
    const click = sp.slice(sp.indexOf('function snackClick(t)'), sp.indexOf('/* ---------------- Kitchen'));
    assert.match(click, /C\.snackRefill\(/);
    assert.match(click, /data-stp-snack-undo/);
    const rowCss = rule(css, '.stp-again-t small');
    assert.strictEqual(prop(rowCss, 'white-space'), 'nowrap');
    assert.strictEqual(prop(rowCss, 'text-overflow'), 'ellipsis', 'the preview is one line that ends in ...');
});

test('snackRefill puts every recent snack back on the list in one go, never twice', () => {
    let l = C.snackAdd(C.snackAdd(C.snackAdd([], 'Paprika', 1), 'Nuts', 2), 'Rice cakes', 3);
    l = C.snackGot(C.snackGot(l, l[0].id, 10), l[1].id, 11);
    const v = C.snackView(l, ['Apple', 'rice cakes']);
    assert.deepStrictEqual(v.again, ['Nuts', 'Paprika', 'Apple']);
    const r = C.snackRefill(l, v.again, 100);
    assert.strictEqual(r.added, 3);
    const v2 = C.snackView(r.list, ['Apple']);
    assert.deepStrictEqual(v2.buy.map(i => i.n), ['Rice cakes', 'Nuts', 'Paprika', 'Apple']);
    assert.deepStrictEqual(v2.again, [], 'nothing left to offer');
    assert.strictEqual(r.list.filter(i => i.n === 'Nuts').length, 1, 'the bought copy is replaced, not doubled');
    assert.strictEqual(C.snackRefill(r.list, v.again, 200).added, 0, 'second tap adds nothing');
    assert.deepStrictEqual(C.snackRefill(null, null), { list: [], added: 0 });
    assert.notStrictEqual(new Set(r.list.map(i => i.id)).size, 0);
    assert.strictEqual(new Set(r.list.map(i => i.id)).size, r.list.length, 'ids stay unique when added in the same millisecond');
});
