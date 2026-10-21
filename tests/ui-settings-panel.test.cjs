'use strict';
/* Oct 19 2026, 07:27, Emmanuel (iPad screenshot of build 20261018-225254): "Why does it appear as an extra page either way? Could have kept
   the same design like the other stuff ... This could have been just like the design of when the sound menu bar appears. Fix that."
   And: he opened the sound panel from Settings and it sat BEHIND the Settings page, so he could not use it.
   His new call (replaces the Oct 18 "single tap opens the full page"): one tap on Settings opens a glass SIDE PANEL in the same look as
   the Body sound panel (misty-panels.css membrane surface), beside / under Misty with Home still visible, same items and groups, x at
   the bottom right. A row that opens another panel (World sound -> Body sound) makes Settings step aside first, so that panel is in front.
   The browser proof is tests/ui-settings-page-live.cjs (Chromium and WebKit, iPhone 13 390x844 and iPad). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../home-settings-sleep-v2.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const JS = read('home-settings-sleep-v2.js'), CSS = read('home-settings-sleep-v2.css');
const rule = sel => { const i = CSS.indexOf(sel + ' {'); assert.ok(i >= 0, sel + ' rule exists'); return CSS.slice(i, CSS.indexOf('}', i)); };

test('Settings is a side panel, not a full-screen page: no inset 0, no full-screen dimming, a bounded width', () => {
    const p = rule('.ss2-page');
    assert.doesNotMatch(p, /inset:\s*0/, 'the panel must not cover the whole screen');
    assert.doesNotMatch(p, /rgba\(14,\s*30,\s*72,\s*\.88\)/, 'the old full-screen dimming layer is gone');
    assert.doesNotMatch(CSS, /\.ss2-layer\[data-kind="?page"?\][^{]*\{[^}]*background/, 'the layer behind the panel does not dim Home');
    assert.match(p, /max-height/, 'it is sized to fit the free space');
});

test('it uses the same glass as the Body sound panel (misty-panels.css membrane surface, rim, round corners)', () => {
    const p = rule('.ss2-page');
    assert.match(p, /background:\s*var\(--mb-surface/, 'membrane surface like .wa-panel');
    assert.match(p, /border:\s*1px solid var\(--mb-rim/, 'the same cyan rim');
    assert.match(p, /border-radius:\s*var\(--mb-r/, 'the same 34 px corners');
    assert.match(p, /box-shadow:\s*var\(--mb-glow/, 'the same glow');
});

test('the panel is placed in the free space beside / under Misty, never on her (placePanel), with the x at its bottom right', () => {
    const body = JS.slice(JS.indexOf('function showPage('), JS.indexOf('function trapTab('));
    assert.match(body, /placePanel\(/, 'showPage places the panel with placePanel');
    assert.match(body, /misty\(\)/, 'and measures Misty to stay clear of her');
    assert.match(body, /class="ss2-page-foot"[^]*class="ss2-page-x"/, 'the x sits in the panel footer');
    assert.match(CSS, /\.ss2-page-foot\s*\{[^}]*justify-content:\s*flex-end/, 'footer pushes the x to the right');
    assert.doesNotMatch(rule('.ss2-page-x'), /position:\s*absolute/, 'the x is part of the panel, not pinned to the screen corner');
    /* the same placement rule the More panel already uses keeps Misty clear on a phone and an iPad */
    const misty = { x: 195, y: 400, r: 80 }, rects = [{ l: 10, t: 150, r: 380, b: 700 }];
    const P = C.placePanel({ vw: 390, vh: 844, safe: { t: 47, r: 0, b: 34, l: 0 }, misty, bubble: { x: 195, y: 160 }, rects, measure: (w, cols) => 260 + 300 / cols });
    assert.ok(P.top >= misty.y + misty.r || P.top + P.height <= misty.y - misty.r, 'phone: panel clear of Misty ' + JSON.stringify(P));
    const Q = C.placePanel({ vw: 1180, vh: 820, safe: { t: 24, r: 0, b: 20, l: 0 }, misty: { x: 590, y: 410, r: 90 }, bubble: { x: 590, y: 160 }, rects: [{ l: 330, t: 150, r: 850, b: 670 }], measure: (w, cols) => 200 + 400 / cols });
    assert.ok(Q.side === 'right' || Q.side === 'left', 'iPad landscape: panel at the side ' + JSON.stringify(Q));
});

test('a row that opens another panel makes Settings step aside first, so that panel is in front and usable', () => {
    assert.strictEqual(typeof C.rowAction, 'function', 'rowAction(id) is exported');
    assert.strictEqual(C.rowAction('worldSound'), 'panel', 'World sound opens the Body sound panel: Settings closes first');
    /* Oct 21: menu bar removed, check dropped */
    for (const id of ['me', 'look', 'account', 'community', 'care', 'workouts', 'map', 'vr', 'gift', 'weather']) assert.strictEqual(C.rowAction(id), 'go', id + ' closes Settings and runs its route');
    const chip = JS.slice(JS.indexOf('function onChip('), JS.indexOf('function pulse('));
    assert.match(chip, /rowAction\(id\) === 'panel'[^]*close\(false\)/, 'onChip closes Settings before opening a panel route');
    assert.match(JS, /LowiWorldAudio\.open\(\)/, 'World sound opens the Body sound panel through its own API');
});

test('World sound still shows on / off, but as a row that opens Body sound (where its real switch, volume and strings live)', () => {
    const row = JS.slice(JS.indexOf('function pageRow('), JS.indexOf('function showPage('));
    assert.match(row, /rowAction\(id\) === 'panel'/, 'pageRow renders panel rows differently from switches');
    assert.match(row, /aria-haspopup="dialog"/, 'a panel row says it opens a dialog');
});
