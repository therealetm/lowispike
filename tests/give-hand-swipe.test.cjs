'use strict';
/* Oct 26, 2026 (Emmanuel, MAYA-HANDOFF 0.22: "our Tinder version ... people who have money, who want to pay the groceries for
   someone, and just swipe. Swipe through groceries to pay for."). Give a hand shows one basket at a time: swipe right (or the
   Pay button) = I'll pay for this one, which shows the person's own pay link and "I helped"; swipe left (or Skip) = skip, it comes
   back after 24 hours, with Undo. A swipe never pays by itself, and the card shows food and the rough total, never a person's
   photo. Browser check (real drags, iPhone 13 WebKit, en/de/es): tools/supermarket-cart/check.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../gift-basket-core.js');
const gb = read('gift-basket.js');

test('deck: only other people\'s baskets with a pay link, minus skips from the last 24h; a picked one goes on top', () => {
    const now = 1e12;
    const open = [{ id: 'a', owner: 'me', link: 'x' }, { id: 'b', owner: 'u1', link: 'x' }, { id: 'c', owner: 'u2', link: '' }, { id: 'd', owner: 'u3', link: 'x' }, { id: 'e', owner: 'u4', link: 'x' }];
    assert.deepEqual(C.deck(open, 'me', {}, '', now).map(b => b.id), ['b', 'd', 'e']);
    assert.deepEqual(C.deck(open, 'me', { b: now - 1000 }, '', now).map(b => b.id), ['d', 'e']);
    assert.deepEqual(C.deck(open, 'me', { b: now - C.SKIP_MS - 1 }, '', now).map(b => b.id), ['b', 'd', 'e'], 'skips come back after 24 hours');
    assert.deepEqual(C.deck(open, 'me', {}, 'e', now).map(b => b.id), ['e', 'b', 'd']);
    assert.deepEqual(Object.keys(C.freshSkips({ b: now - 1, d: now - C.SKIP_MS - 5 }, now)), ['b']);
});

test('swipeDecision: past the threshold or a quick flick decides, vertical moves and small drags spring back', () => {
    assert.equal(C.swipeDecision(130, 10, 600, 390), 'pay');
    assert.equal(C.swipeDecision(-130, 10, 600, 390), 'skip');
    assert.equal(C.swipeDecision(60, 5, 600, 390), 'back');
    assert.equal(C.swipeDecision(60, 5, 60, 390), 'pay', 'a quick flick');
    assert.equal(C.swipeDecision(-60, 5, 60, 390), 'skip');
    assert.equal(C.swipeDecision(90, 200, 300, 390), 'back', 'mostly vertical = a scroll');
});

test('Give a hand renders a swipe deck with Skip and Pay buttons, stamps, a hint and Undo, in en/de/es', () => {
    assert.match(gb, /C\.deck\(open, me, skipped, picked\)/);
    assert.match(gb, /deckHTML\(list\)/);
    assert.match(gb, /class="gb-basket gb-swipe/);
    assert.match(gb, /data-gb="skip"/); assert.match(gb, /data-gb="yes"/); assert.match(gb, /data-gb="undo"/);
    assert.match(gb, /T\('Swipe right to pay for these groceries, left to skip\.', 'Wisch nach rechts, um diesen Einkauf zu bezahlen, nach links zum Überspringen\.', 'Desliza a la derecha para pagar esta compra, a la izquierda para saltarla\.'\)/);
    assert.match(gb, /T\('Pay', 'Zahlen', 'Pagar'\)/); assert.match(gb, /T\('Skip', 'Weiter', 'Saltar'\)/);
    assert.match(gb, /The ones you skipped come back tomorrow/);
});

test('a right swipe pays nothing itself: it shows the person\'s own pay link; left saves the skip; the click after a drag is ignored', () => {
    const deck = gb.slice(gb.indexOf('function deckHTML('), gb.indexOf('function actHTML('));
    assert.match(deck, /\(on \? '<p class="gb-pick-msg">'[\s\S]*?actHTML\(b\) : hint\)/, 'the pay link only after a right swipe');
    assert.doesNotMatch(deck, /window\.open|location\.href/);
    assert.doesNotMatch(deck, /<img/, 'food, not people');
    assert.match(gb, /if \(v === 'skip'\) skip\(d\.id\); else if \(v === 'pay'\) pick\(d\.id\);/);
    assert.match(gb, /skipped\[id\] = Date\.now\(\); saveSkips\(\);/);
    assert.match(gb, /if \(Date\.now\(\) - dragAt < 400\) return;/);
    assert.match(gb, /ov\.addEventListener\('pointerdown', onDown\)/);
    assert.match(gb, /if \(e\.target\.closest\('a,button,input,label'\)\) return;/, 'links and buttons on the card still tap');
});

test('the deck card keeps vertical scrolling and respects Reduce Motion', () => {
    const css = read('gift-basket.css');
    assert.match(css, /\.gb-swipe \{[^}]*touch-action: pan-y/);
    assert.match(css, /prefers-reduced-motion: reduce\) \{ \.gb-swipe/);
    assert.match(css, /\.gb-round \{ width: 68px; height: 68px/);
});
