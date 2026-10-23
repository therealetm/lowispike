'use strict';
/* Oct 18, 2026: "I clicked on cook, and then what can I buy? And the app crashed and sent me back to the beginning."
   The reset itself did not reproduce in Chromium or WebKit (iPhone 13 profile); what was measured there on that path was
   unbounded: the list opened with up to 420 rows (Lidl), "Show all" put up to 1,012 rows of one group / 35,754 elements /
   a 510,268 px tall list on screen, and the 3D world kept drawing (37-113 WebGL draws a second) under the covering panel.
   These tests hold the bounds; tests/cook-store-crash-live.cjs repeats the real taps in both browsers. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../store-picks-core.js');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const shop = r => JSON.parse(read('data/shop/' + r + '.json'));

test('the list is paged: 15 rows per group when it opens, 40 more per tap, never more than there are', () => {
    assert.deepEqual(C.PAGE, { first: 15, more: 40 });
    assert.deepEqual(C.page(0, 0), { show: 0, left: 0, next: 0, ask: 0 });
    assert.deepEqual(C.page(7, 0), { show: 7, left: 0, next: 0, ask: 7 });
    assert.deepEqual(C.page(1012, 0), { show: 15, left: 997, next: 40, ask: 55 });
    assert.deepEqual(C.page(1012, 55), { show: 55, left: 957, next: 40, ask: 95 });
    assert.deepEqual(C.page(60, 55), { show: 55, left: 5, next: 5, ask: 60 });
    assert.deepEqual(C.page(60, 60), { show: 60, left: 0, next: 0, ask: 60 });
    assert.equal(C.page(30, 1e9).show, 30, 'an old "show all" value can never ask for more rows than the group has');
    assert.equal(C.page(30, -4).show, 15);
    assert.equal(C.page(30, 'x').show, 15);
});

test('opening the biggest real ranges shows at most 15 rows a group, and every tap adds at most 40', () => {
    for (const r of ['lidl', 'salling', 'rewe', 'edeka']) {
        const b = C.build(shop(r), { q: '' });
        let opened = 0, passes = 0;
        for (const g of b.groups) {
            passes += g.pass.length;
            const p = C.page(g.pass.length, 0);
            opened += p.show;
            assert.ok(p.show <= 15, r + ' ' + g.id + ' opens with ' + p.show + ' rows');
            /* tap "Show more" until the end: each tap adds <= 40 and the group ends exactly at its size */
            let ask = 0, shown = p.show, taps = 0;
            while (C.page(g.pass.length, ask).left) {
                const before = C.page(g.pass.length, ask).show;
                ask = C.page(g.pass.length, ask).ask;
                const after = C.page(g.pass.length, ask).show;
                assert.ok(after - before > 0 && after - before <= 40, r + ' ' + g.id + ' tap adds ' + (after - before));
                shown = after; if (++taps > 200) assert.fail('never ends');
            }
            assert.equal(shown, g.pass.length);
        }
        assert.ok(opened <= 15 * b.groups.length, r + ' opens with ' + opened + ' rows');
        assert.ok(passes > opened || passes <= 15 * b.groups.length, r);
    }
    /* the measured worst case before: Lidl opened with 420 rows (388 with the engine rating since scanfe-h4) */
    const lidl = C.build(shop('lidl'), { q: '' });
    const before = lidl.groups.reduce((s, g) => s + Math.min(40, g.pass.length), 0);
    const now = lidl.groups.reduce((s, g) => s + C.page(g.pass.length, 0).show, 0);
    assert.ok(before >= 350 && now < before / 2, 'Lidl: ' + before + ' rows before, ' + now + ' now');
});

test('store-picks.js renders passes and left-outs through C.page, with no "show everything" path left', () => {
    const src = read('store-picks.js');
    assert.doesNotMatch(src, /1e9/, 'no row limit of 1e9 ("Show all")');
    assert.match(src, /C\.page\(g\.pass\.length, open\[g\.id\]\)/);
    assert.match(src, /C\.page\(g\.fail\.length, open\[g\.id \+ ':f'\]\)/);
    assert.match(src, /g\.pass\.slice\(0, pg\.show\)/);
    assert.match(src, /g\.fail\.slice\(0, pf\.show\)/);
    assert.match(src, /open\[b\.getAttribute\('data-stp-more'\)\] = \+b\.getAttribute\('data-stp-ask'\) \|\| 0/);
    assert.match(src, /Show ' \+ n \+ ' more · ' \+ l \+ ' left', 'Noch ' \+ n \+ ' zeigen · ' \+ l \+ ' übrig', 'Ver ' \+ n \+ ' más · quedan ' \+ l/);
});

test('while the panel covers the screen the 3D world draws nothing, and closing lets go of the rows', () => {
    const sp = read('store-picks.js'), bw = read('body-world-3d.js');
    const openFn = sp.slice(sp.indexOf('function openPanel('), sp.indexOf('function close()'));
    const closeFn = sp.slice(sp.indexOf('function close()'), sp.indexOf('function close()') + 900);
    assert.ok(openFn.length > 200 && closeFn.length > 200);
    assert.match(openFn, /D\.documentElement\.classList\.add\('stp-open'\)/);
    assert.match(closeFn, /D\.documentElement\.classList\.remove\('stp-open'\)/);
    assert.match(closeFn, /data = null; built = null; shown = \[\];/);
    const sr = bw.slice(bw.indexOf('function shouldRender'), bw.indexOf('function syncGlow'));
    const i = sr.indexOf("H.classList.contains('stp-open')) return false");
    assert.ok(i > 0, 'shouldRender stops under html.stp-open');
    assert.ok(i < sr.indexOf("mode === 'back'"), 'checked before the backdrop / full world modes can return true');
});
