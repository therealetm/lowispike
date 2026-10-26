'use strict';
/* MAYA-HANDOFF 0.35 (Emmanuel, voice in German, 26 Oct 2026): Shop > Supermarket list, "while I scroll down, instead of it saying
   Top, or next to Top, I can just add, add, add ... and it goes into my kitchen or my cart".
   Every product row gets a quick column on the right: a round "+" (into the Cart) and a small house ("I have it", into the
   Kitchen). The verdict stays as a small tag by the name. After "+", the column is a "- 1 +" stepper in the same spot and the
   same width, so the row never reflows. "+" never opens the product. A double tap on "+" adds one (bug hunt P-ROW-SHIFT). */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const Q = require('../quick-add-core.js');

test('core: a product name matches its Cart line whatever the case, accents, spaces or " · amount"', () => {
    const lines = [{ id: 'a', n: 'Bio  Leinsamen · 2 EL', q: 2 }, { id: 'b', n: 'Crème fraîche', q: 1 }];
    assert.strictEqual(Q.lineFor(lines, 'bio leinsamen').id, 'a');
    assert.strictEqual(Q.lineFor(lines, 'Creme Fraiche').id, 'b');
    assert.strictEqual(Q.lineFor(lines, 'Leinsamen'), null, 'a part of a name is not the same product');
    assert.strictEqual(Q.lineFor(null, 'x'), null);
    assert.deepStrictEqual(Q.state(lines, 'Bio Leinsamen', false), { q: 2, id: 'a', kit: false, kind: 'step' });
    assert.deepStrictEqual(Q.state(lines, 'Butter', true), { q: 0, id: '', kit: true, kind: 'add' });
});

test('core: not in the Cart = house + "+", both real buttons with a name, and a double tap press only once', () => {
    for (const l of ['en', 'de', 'es']) {
        const h = Q.html(Q.state([], 'Bio Leinsamen', false), 4, 'Bio Leinsamen', l);
        const add = /<button[^>]*data-stp-qa="add"[^>]*>/.exec(h), kit = /<button[^>]*data-stp-qa="kit"[^>]*>/.exec(h);
        assert.ok(add && kit, l + ': both buttons');
        assert.match(add[0], /data-stp-qa-i="4"/); assert.match(add[0], /data-spend="1"/, l + ': + is a one-press control (LowiFreshScrim)');
        assert.match(kit[0], /data-spend="1"/); assert.match(kit[0], /aria-pressed="false"/);
        assert.match(add[0], /aria-label="[^"]*Bio Leinsamen"/); assert.match(kit[0], /aria-label="[^"]*Bio Leinsamen"/);
        assert.ok(h.indexOf('data-stp-qa="kit"') < h.indexOf('data-stp-qa="add"'), l + ': + is the rightmost control');
        assert.ok(!/data-stp-item/.test(h), l + ': nothing in the column opens the product');
    }
    assert.match(Q.html(Q.state([], 'X', false), 0, 'X', 'de'), /aria-label="In den Warenkorb: X"/);
    assert.match(Q.html(Q.state([], 'X', false), 0, 'X', 'de'), /aria-label="Hab ich schon, in meine Küche: X"/);
    assert.match(Q.html(Q.state([], 'X', false), 0, 'X', 'es'), /aria-label="Al carrito: X"/);
    const on = Q.html(Q.state([], 'X', true), 0, 'X', 'en');
    assert.match(on, /stp-qa-kit on/); assert.match(on, /aria-pressed="true"/); assert.match(on, /aria-label="In your kitchen: X"/);
});

test('core: in the Cart = "- q +" stepper, "+" stays rightmost; the last minus is a one-press control, "+" is not', () => {
    const one = Q.html(Q.state([{ id: 'a', n: 'X', q: 1 }], 'X', false), 2, 'X', 'en');
    assert.match(one, /role="group"/); assert.match(one, /class="stp-qa-n"[^>]*>1</);
    assert.match(/<button[^>]*data-stp-qa="less"[^>]*>/.exec(one)[0], /data-spend="1"/);
    assert.match(/<button[^>]*data-stp-qa="less"[^>]*>/.exec(one)[0], /aria-label="Take out of the Cart: X"/);
    assert.ok(!/data-spend/.test(/<button[^>]*data-stp-qa="more"[^>]*>/.exec(one)[0]), 'quick taps on + all count');
    assert.ok(!/data-stp-qa="kit"|data-stp-qa="add"/.test(one));
    const three = Q.html(Q.state([{ id: 'a', n: 'X', q: 3 }], 'X', false), 2, 'X', 'de');
    assert.ok(!/data-spend/.test(/<button[^>]*data-stp-qa="less"[^>]*>/.exec(three)[0]), 'minus above 1 counts every quick tap');
    assert.match(three, /aria-label="3 im Warenkorb: X"/);
});

test('core: a tap within 450 ms of the control changing kind is the 2nd tap of a double tap', () => {
    assert.strictEqual(Q.fresh(1000, 1100), true);
    assert.strictEqual(Q.fresh(1000, 1449), true);
    assert.strictEqual(Q.fresh(1000, 1450), false, 'a deliberate tap after 450 ms counts');
    assert.strictEqual(Q.fresh(0, 50), false, 'never changed: counts');
});

test('Supermarket rows: verdict tag inside the row button by the name, quick column OUTSIDE the button (no button in a button)', () => {
    const src = read('store-picks.js');
    const f = src.slice(src.indexOf('    function itemHTML('), src.indexOf('\n    }\n', src.indexOf('    function itemHTML(')));
    assert.match(f, /stp-nm/, 'name line holds the tag');
    assert.match(f, /<\/button>' \+ \(qa \? qaCol\(i\)/, 'quick column comes after the row button closes');
    assert.match(src, /function qaCol\(/); assert.match(src, /function qaClick\(/);
    assert.match(src, /LowiQuickAdd/);
});

/* the real onClick, cut out and run: a tap on the quick column never opens the product */
test('a tap on "+" goes to qaClick and never to openQuick', () => {
    const src = read('store-picks.js');
    const j = src.indexOf('\n    function onClick(e) {'), end = src.indexOf('\n    }\n', j);
    const order = src.slice(j, end);
    assert.ok(order.indexOf('qaClick(t, e)') > 0, 'onClick asks qaClick');
    assert.ok(order.indexOf('qaClick(t, e)') < order.indexOf("closest('[data-stp-item]')"), 'before the row opens the product');
    const calls = [];
    const mk = (attrs, parent) => ({ attrs, parentNode: parent || null, closest(sel) {
        for (let c = this; c; c = c.parentNode) for (const p of sel.split(',')) { const m = /^\[([\w-]+)\]$/.exec(p.trim()); if (m && m[1] in c.attrs) return c; }
        return null; }, getAttribute(k) { return this.attrs[k]; } });
    const ov = mk({}), li = mk({}, ov), plus = mk({ 'data-stp-qa': 'add', 'data-stp-qa-i': '3' }, li);
    ov.contains = () => true;
    const ctx = { W: {}, D: {}, Date, ov, qv: null, dragAt: 0, cartOpen: false, calls,
        qaClick(t) { const b = t.closest('[data-stp-qa]'); if (!b) return false; calls.push('qa:' + b.getAttribute('data-stp-qa')); return true; },
        snackClick: () => false, kitClick: () => false, onSz: () => false, SZ: () => null, spend() {}, close() { calls.push('close'); },
        openQuick() { calls.push('OPEN'); }, setTab() {}, paint() {} };
    vm.runInNewContext(src.slice(j, end + 6) + '\nthis.onClick = onClick;', ctx);
    ctx.onClick({ target: plus });
    assert.deepStrictEqual(calls, ['qa:add']);
});

test('CSS: 44 pt tall tap targets, a fixed-width quick column, the row keeps room for it, Reduce Motion', () => {
    const css = read('store-picks.css');
    assert.match(css, /\.stp-qa\s*\{[^}]*position:\s*absolute/);
    assert.match(css, /\.stp-qa\s*\{[^}]*width:\s*10[0-9]px/);
    assert.match(css, /\.stp-qa-b\s*\{[^}]*height:\s*44px/);
    assert.match(css, /\.stp-li\.qa\s*>\s*\.stp-item\s*\{[^}]*padding-right:/);
    assert.match(css, /prefers-reduced-motion[^{]*\{[^@]*\.stp-qa/);
});

test('wired: script tag before store-picks.js, offline cache, tour step in EN/DE/ES with recorded voice', () => {
    const html = read('index.html');
    assert.ok(html.indexOf('quick-add-core.js') > 0 && html.indexOf('quick-add-core.js') < html.indexOf('store-picks.js'));
    assert.match(read('sw.js'), /quick-add-core\.js/);
    const ts = read('tutorial-steps.js');
    assert.match(ts, /id: 'new-quick-add'/);
    for (const l of ['en', 'de', 'es']) assert.ok(fs.existsSync(path.join(__dirname, '..', 'tutorial-voice', l, 'new-quick-add.mp3')), l + ' voice');
});
