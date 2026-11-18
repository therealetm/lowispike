'use strict';
/* 18 Nov 2026 (Emmanuel: "I want the whole thing finished ... it doesn't look like what you showed me in the PDF"): the v9
   worlds (v9-world.js). Every Home bubble opens a world with the same four zones; the worlds only open features that exist. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const src = read('v9-world.js');

test('v9-world loads before the Home ring so a tap on a bubble opens its world first', () => {
    const html = read('index.html');
    const a = html.indexOf('<script src="v9-world.js?v='), b = html.indexOf('<script src="home-orbit-v2.js?v='), c = html.indexOf('<script src="home-blooms-v2.js?v=');
    assert.ok(a > 0 && a < b && a < c, 'v9-world.js comes before home-orbit-v2.js and home-blooms-v2.js');
    assert.ok(html.includes('<link rel="stylesheet" href="v9-world.css?v='));
    const sw = read('sw.js'); assert.ok(sw.includes('"v9-world.css", "v9-world.js"'), 'the service worker keeps both on the phone');
});

test('the bubbles map to the PDF worlds; holds keep their old jobs', () => {
    assert.match(src, /const TAP = \{ scan: 'check', fuel: 'shop', gap: 'body', settings: 'lounge' \};/);
    assert.match(src, /Date\.now\(\) - downAt > 480\) return; \/\* the click that ends a hold \*\//);
    for (const w of ['check', 'shop', 'move', 'misty', 'body', 'lounge', 'dex', 'settings']) assert.match(src, new RegExp('WORLDS\\.' + w + ' = \\('), w);
});

test('every world has a back the round bottom button can press: Home on the first level, the parent name deeper', () => {
    assert.match(src, /class="v9-bk" data-v9="back" aria-label="' \+ esc\(T\('Back'/);
    assert.match(src, /data-bx-label="' \+ esc\(NAME\(\)\[prev\]/);
    assert.match(src, /class="v9-bk" data-v9="back" aria-label="' \+ esc\(T\('Close'/);
});

test('at most four choices per world, words under every bubble, EN / DE / ES', () => {
    const blocks = src.split('choices: [').slice(1).map(b => b.slice(0, b.indexOf(']')));
    assert.ok(blocks.length >= 4);
    for (const b of blocks) { const n = (b.match(/\{ id: '/g) || []).length; assert.ok(n >= 1 && n <= 4, 'choices ' + n); assert.ok((b.match(/label:/g) || []).length === n, 'every choice has a label'); }
    assert.match(src, /const T = \(en, de, es\) =>/);
});

test('the worlds award no XP and make no medical claims; the body journey says typical, not measured', () => {
    assert.doesNotMatch(src, /\baward\(|addXP|S\.xp\s*[+=]/);
    assert.match(src, /Typical, not measured\./);
    assert.match(src, /No extra points for longer/);
});

test('Baskets stay parked: no world leads to them', () => {
    assert.doesNotMatch(src, /LowiGiftBasket|giftcart|openAt\('gift'/);
});

test('a switch brings the old taps back', () => {
    assert.match(src, /localStorage\.getItem\('lowi\.v9'\) === 'off'/);
});
