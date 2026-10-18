'use strict';
/* Oct 18 2026, Emmanuel (Maya 4 handoff, Home section): "Settings: a single tap opens the full page (Me, Look, Sound, Account and More
   live there, not as bubbles)". home-settings-sleep-v2.js: one tap on the Settings bubble opens ONE full Settings page instead of
   blooming chips round the bubble and a second More panel. Double tap (symmetric ring) and hold (secondary page) are separate tasks.
   The browser proof is tests/ui-settings-page-live.cjs (Chromium and WebKit, iPhone 13 390x844 and iPad). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../home-settings-sleep-v2.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const JS = read('home-settings-sleep-v2.js'), CSS = read('home-settings-sleep-v2.css');

test('single tap on Settings opens the full page; a tap while anything of Settings is open closes it', () => {
    assert.strictEqual(typeof C.tapIntent, 'function', 'tapIntent(bubble, open) is exported');
    assert.strictEqual(C.tapIntent('settings', null), 'page', 'closed: one tap opens the full page, not the chip bloom');
    assert.strictEqual(C.tapIntent('settings', 'sleep'), 'page', 'Sleep bloom open: Settings still opens its page (one surface at a time)');
    for (const o of ['page', 'settings', 'more']) assert.strictEqual(C.tapIntent('settings', o), 'close', 'open ' + o + ': a second tap closes');
    /* Sleep keeps its own bloom exactly as before */
    assert.strictEqual(C.tapIntent('sleep', null), 'sleep');
    assert.strictEqual(C.tapIntent('sleep', 'page'), 'sleep');
    assert.strictEqual(C.tapIntent('sleep', 'sleep'), 'close');
});

test('the page holds Me, Look & sound, Account, Menu bar and every More entry, each only when its route exists', () => {
    assert.strictEqual(typeof C.pageGroups, 'function', 'pageGroups(env) is exported');
    const all = C.pageGroups({ has: () => true });
    assert.deepStrictEqual(all.map(g => g.key), ['main', 'more']);
    assert.deepStrictEqual(all[0].ids, ['me', 'look', 'account', 'menubar'], 'no separate More chip: More lives on the page itself');
    assert.deepStrictEqual(all[1].ids, C.MORE, 'every More entry, in the same order as the More panel');
    assert.ok(all[1].ids.includes('community') && all[1].ids.includes('care') && all[1].ids.includes('map') && all[1].ids.includes('worldSound'));
    assert.deepStrictEqual(C.pageGroups({ has: () => false }), [], 'nothing to show: no empty groups');
    assert.deepStrictEqual(C.pageGroups({ has: id => id === 'menubar' || id === 'care' }), [{ key: 'main', ids: ['menubar'] }, { key: 'more', ids: ['care'] }]);
    assert.deepStrictEqual(C.pageGroups({ has: id => id === 'care' }), [{ key: 'more', ids: ['care'] }]);
    for (const id of Object.keys(C.MORE_REMOVED)) assert.ok(!all.some(g => g.ids.includes(id)), id + ' stays out (Emmanuel trimmed it)');
});

test('the page is a real dialog: labelled, modal, closes with x and Escape, and the bubble announces it', () => {
    assert.match(JS, /role="dialog" aria-modal="true"/, 'page markup is a modal dialog');
    assert.match(JS, /class="ss2-page"/);
    assert.match(JS, /data-ss2="close"/, 'it has a close (x) button');
    assert.match(JS, /aria-haspopup', 'dialog'|aria-haspopup="dialog"/, 'the Settings bubble says it opens a dialog');
    assert.match(JS, /tapIntent\(k, open\)/, 'the bubble tap goes through tapIntent');
    assert.match(JS, /'Tab'/, 'Tab keeps focus inside the open page');
    for (const l of ['en', 'de', 'es']) for (const k of Object.keys(C.TX.en)) assert.ok(k in C.TX[l], l + ' has ' + k);
});

test('page look: one glass style, a dimming layer (no blur over the moving world), safe areas, 44 px rows, reduced motion respected', () => {
    assert.match(CSS, /\.ss2-page\s*\{/);
    const page = CSS.slice(CSS.indexOf('.ss2-page {'), CSS.indexOf('}', CSS.indexOf('.ss2-page {')));
    assert.doesNotMatch(page, /backdrop-filter/, 'no full-screen blur over the animated world (phone heat)');
    assert.match(CSS, /safe-area-inset-top/); assert.match(CSS, /safe-area-inset-bottom/);
    assert.match(CSS, /\.ss2-page \.ss2-chip\.ss2-row[^}]*min-height:\s*(4[4-9]|5\d)px/, 'rows are at least 44 px tall');
    assert.match(CSS, /prefers-reduced-motion[^}]*\.ss2-page/, 'reduced motion turns the page animation off');
    assert.doesNotMatch(JS + CSS, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'no emoji');
});

test('the chip bloom code stays for the queued double tap; only the single tap changed', () => {
    assert.match(JS, /function fan\(o\)/);
    assert.match(JS, /open: k => show\(k\)/, 'show("settings") still blooms through the API');
    assert.doesNotMatch(JS, /dblclick|contextmenu|long-?press/i, 'double tap and hold are not part of this change');
});
