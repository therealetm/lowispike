'use strict';
/* 18 Nov 2026 (Emmanuel, v9 redesign, owner override "do everything to your desire ... I just want this app live").
   Slice 1 guards: the round bottom button always says where it goes (Back or Home, never an X face), and the Baskets door
   (Körbe / Give a hand) stays parked in Shop until someone flips BASKETS_OFF back on purpose. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('the bottom button has a Home face and picks Back or Home, never the X icon', () => {
    const src = read('bottom-close.js');
    assert.match(src, /home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7/, 'a house icon for Home');
    assert.match(src, /const face = named \? 'back' : [^\n]*\? 'back' : 'home';/, 'the face is back or home');
    assert.match(src, /b\.innerHTML = ICON\[face\] \+ '<span class="lw-bx-lab">'/, 'the icon comes from the face, not from the close kind');
    assert.match(src, /T\('Back', 'Zurück', 'Atrás'\) : T\('Home', 'Start', 'Inicio'\)/, 'Back and Home in EN / DE / ES');
    assert.match(src, /b\.classList\.add\('lw-bx-named'\)/, 'always the labelled pill');
});

test('the Baskets door is parked in Shop', () => {
    const src = read('store-picks.js');
    assert.match(src, /const BASKETS_OFF = true;/);
    assert.match(src, /function giftDoor\([^)]*\) \{\s*if \(BASKETS_OFF\) return false;/);
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'gift-basket.js')), 'gift-basket.js stays, only the door is parked');
});

test('the Ranking has no chip row and How it works is one line', () => {
    const src = read('ranking.js');
    assert.doesNotMatch(src, /'<div class="rk-chips">'/);
    assert.match(src, /class="rk-how-l" data-rk="info"/);
    assert.match(read('ranking.css'), /\.rm-rank \.rk-how-l\{/);
});
