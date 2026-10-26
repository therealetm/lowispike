/* MAYA-HANDOFF 0.27 (Emmanuel, Oct 26 2026, voice + screenshot): "When I add something, look at how it looks ... Added to your
   kitchen, it looks so clunky and big, and look at how the green thing looks. That's not even normal written words anymore."
   The recipe card's buttons were 61 px tiles in a 2x2 grid; after Add to kitchen "✓ 6 in your kitchen" and a separate Undo tile
   shared one half-width cell, so the green text broke letter by letter (overflow-wrap:anywhere), and a long "Added to your
   Kitchen: Lettuce, Chicken, ..." toast covered the post. Browser proof: tools/bot-recipe/pills.cjs (WebKit, EN/DE/ES, iPad). */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../bot-recipe-core.js');
const css = read('bot-recipe.css').replace(/\/\*[\s\S]*?\*\//g, '');
/* every block whose selector list names sel, joined */
const rule = sel => { let out = '', m; const re = /([^{}]+)\{([^}]*)\}/g; while ((m = re.exec(css))) if (m[1].split(',').map(s => s.trim()).includes(sel)) out += m[2] + ';'; return out; };
const LS = ['en', 'de', 'es'];

test('0.27: no label can break inside a word or letter by letter (no overflow-wrap:anywhere / break-all; labels stay on one line)', () => {
    assert.ok(!/overflow-wrap\s*:\s*anywhere|word-break\s*:\s*break-(all|word)|word-wrap\s*:\s*break-word/.test(css), 'nothing in bot-recipe.css may split a word');
    assert.match(rule('.crb-b .crb-l'), /white-space\s*:\s*nowrap/, 'a label is one line');
    assert.match(rule('.crb-b .crb-l'), /text-overflow\s*:\s*ellipsis/, 'a label that cannot fit ends in …, it never wraps');
    assert.match(rule('.crb-undo'), /white-space\s*:\s*nowrap/, 'Undo is one line');
});

test('0.27: compact pills (36 px, round ends), still 44 px to the finger', () => {
    const b = rule('.crb-row .crb-b');
    assert.match(b, /height\s*:\s*36px/, 'a pill is 36 px high');
    assert.match(b, /border-radius\s*:\s*(999|99|18)px/, 'round ends');
    assert.match(rule('.crb-row .crb-b::before'), /top\s*:\s*-4px/, 'hit area 4 px above and below: 44 px');
    assert.match(rule('.crb-row'), /row-gap\s*:\s*8px|gap\s*:\s*8px/, 'rows 8 px apart, so the 44 px hit areas never overlap');
});

test('0.27: after Add to kitchen it is ONE pill "✓ N in your kitchen · Undo", Undo a small text button at its end (still data-spend)', () => {
    for (const l of LS) {
        const h = C.rowHTML({ key: 'c1', id: 'rb_x', kitchen: 'done', added: 6, undo: true }, l);
        const m = h.match(/<span class="crb-b crb-kitchen crb-on[^"]*"[^>]*>([\s\S]*?)<\/span><\/span>/);
        assert.ok(m, l + ': the kitchen pill is there');
        assert.ok(m[1].includes(C.t('inKitchen', l, 6)), l + ': its text');
        assert.match(m[1], /<button[^>]*class="crb-undo"[^>]*data-spend[^>]*data-crb="undo"/, l + ': Undo lives inside the same pill, data-spend kept');
        assert.ok(!/class="crb-b crb-undo"/.test(h), l + ': no separate Undo tile any more');
        const u = h.match(/<button[^>]*data-crb="undo"[^>]*aria-label="([^"]+)"/);
        assert.ok(u && u[1].includes(C.t('inKitchen', l, 6)), l + ': VoiceOver hears what Undo takes back');
    }
});

test('0.27: the kitchen pill has its own full-width row in every state, so nothing jumps; Open recipe leads, Cook it | Save share a row', () => {
    assert.match(rule('.crb-kwrap'), /grid-column\s*:\s*1\s*\/\s*-1/, 'kitchen spans the row');
    assert.match(rule('.crb-row'), /grid-template-columns\s*:\s*1fr 1fr/, 'two columns');
    assert.match(rule('.crb-row .crb-open'), /grid-column\s*:\s*1\s*\/\s*-1/, 'Open recipe spans the row');
    for (const l of LS) for (const st of [{ kitchen: 'add', count: 6 }, { kitchen: 'done', added: 6, undo: true }, { kitchen: 'have' }]) {
        const h = C.rowHTML(Object.assign({ key: 'c1', id: 'rb_x' }, st), l);
        assert.ok(/<span class="crb-kwrap"/.test(h), l + ' ' + st.kitchen + ': kitchen sits in its own slot');
    }
});

test('0.27: the after-state text is short enough for one line in a chat bubble (EN/DE/ES)', () => {
    for (const l of LS) {
        const s = C.t('inKitchen', l, 12) + C.t('undo', l);
        assert.ok(s.length <= 26, l + ': "' + s + '" is ' + s.length + ' characters');
        assert.ok(C.t('allHave', l).length <= 22, l + ': ' + C.t('allHave', l));
    }
});

test('0.27: no long toast over the post: a card tap confirms in the pill; only the recipe page gets a short toast', () => {
    const js = read('bot-recipe.js');
    assert.ok(!/t\('added'/.test(js), 'the "Added to your Kitchen: Lettuce, Chicken, ..." list toast is gone');
    const add = js.slice(js.indexOf('function addKitchen'), js.indexOf('function undoKitchen'));
    const undo = js.slice(js.indexOf('function undoKitchen'), js.indexOf('function undoKitchen') + 900);
    for (const [n, src] of [['addKitchen', add], ['undoKitchen', undo]]) {
        const says = src.match(/say\([^;]*\)/g) || [];
        says.forEach(s => assert.ok(/page\s*&&\s*say\(/.test(src.slice(Math.max(0, src.indexOf(s) - 12), src.indexOf(s) + s.length)), n + ': ' + s + ' only from the recipe page'));
    }
});
