'use strict';
/* Oct 16, 2026 (E-man, iPad sideways screenshots). Travelling into a world (Muscles) put the "YOU ARRIVED" card top-right over
   the sun/moon button, the profile picture and half of the centred Daily Quest box: "it is only supposed to appear below the
   daily quest". Coming back out of the world left it on screen: "we move out of the world again and this display is still
   there, that doesn't make sense". Cause: the board is placed absolutely since the top-row change, the slot stayed in the page
   flow; on the way back note() kept the open card and the hub handler only closed in-world cards. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const JS = read('arrival-cards.js'), CSS = read('arrival-cards.css');
const fn = name => { const i = JS.indexOf('function ' + name + '('); assert.ok(i >= 0, name); return JS.slice(i, JS.indexOf('\n    }\n', i) + 6); };

test('the Daily Quest slot takes the board\'s left, width and bottom edge, so the card sits centred right under it', () => {
    const p = fn('placeSlot');
    assert.match(p, /pos !== 'absolute' && pos !== 'fixed'/, 'only when the board is placed (world Home); a board in the flow keeps the plain slot');
    assert.match(p, /top: \(b\.offsetTop \+ b\.offsetHeight\) \+ 'px'/, 'top = the bottom edge of the Daily Quest box');
    assert.match(p, /left: b\.offsetLeft \+ 'px'/);
    assert.match(p, /width: b\.offsetWidth \+ 'px'/, 'same width as the box: centred on the same line');
    assert.match(fn('questSlot'), /placeSlot\(\); watchBoard\(b\);/, 'placed every time a card goes in, and kept in place while the box grows');
    assert.match(fn('watchBoard'), /new ResizeObserver\(\(\) => placeSlot\(\)\)/);
    assert.match(JS, /addEventListener\('resize', \(\) => placeSlot\(\)/, 'turning the iPad re-places it');
});

test('on the world Home the card never floats over the top row (weather pill, sun/moon, profile picture)', () => {
    assert.match(fn('floating'), /if \(D\.documentElement\.classList\.contains\('wh-home'\)\) return null;/);
    assert.ok(fn('floating').indexOf('inQuest(c)') < fn('floating').indexOf("contains('wh-home')"), 'the Daily Quest slot is tried first');
});

test('leaving the place takes the card away: bloodstream, fly-out from the World map, other tab, Community zoom-out', () => {
    assert.match(fn('note'), /if \(leftPlace\(\)\) \{ leave\(\); return true; \}/, 'back to the bloodstream: the open card no longer wins');
    assert.match(fn('note'), /if \(justLeft\(\)\) return true;/, 'no "Back in the bloodstream" line pops up in its spot right after');
    assert.match(fn('leftPlace'), /pidOf\(r === 'hub' \? 'blood' : r\) !== cur\.id/);
    assert.match(JS, /W\.addEventListener\('lowi:world-region', e => \{\n\s+try \{ const id = e && e\.detail && e\.detail\.id; if \(rideOpen\(\)\) return; if \(!id \|\| id === 'hub'\) leave\(\);/, 'hub closes every card, not only the in-world one');
    assert.match(JS, /W\.addEventListener\('lowi:world-warp', e => \{[\s\S]{0,80}d\.phase !== 'start'/, 'it starts fading as the fly-out starts');
    const away = fn('awayCheck');
    assert.match(away, /offHome\(\) \|\| \(cur\.tab != null && activeTab\(\) !== cur\.tab\)/, 'another tab or the Community zoom-out');
    assert.match(away, /H\.classList\.contains\('wh-cosmos'\) \|\| \(H\.classList\.contains\('wh-mapview'\) && !busy\)/, 'zooming out to the World map or the spirit world');
    assert.match(JS, /attributeFilter: \['class'\]/, 'tab changes are watched, not polled only');
    assert.match(fn('leave'), /cur\.where !== 'ride'/, 'the cell ride keeps its own card and buttons');
});

test('a gentle fade out (none with reduced motion), and the close button still works', () => {
    const block = CSS.slice(CSS.indexOf('placement under the Daily Quest box + gentle fade'));
    assert.ok(block.length > 100);
    assert.match(block, /\.arr-card\.arr-quest \{ opacity: 0; transition: opacity \.28s ease; \}/);
    assert.match(block, /\.arr-card\.arr-quest\.on \{ opacity: 1; \}/);
    assert.match(block, /\.arr-card\.arr-quest\.out \{ opacity: 0; pointer-events: none; \}/);
    assert.match(block, /@media \(prefers-reduced-motion: reduce\) \{ \.hq-slot, \.arr-card\.arr-quest \{ transition: none !important; \} \}/);
    assert.match(fn('close'), /setTimeout\(\(\) => el\.remove\(\), reduced\(\) \|\| how === 'now' \? 0 : 320\)/, 'removed after the fade, at once with reduced motion');
    assert.match(fn('close'), /c\.host && c\.where !== 'quest'\) c\.host\.classList\.remove\('arr-on'\)/, 'the slot stays open while the card fades');
    assert.match(fn('mount'), /closest\('\[data-arr-x\]'\)\) \{ e\.preventDefault\(\); e\.stopPropagation\(\); close\(\); \}/, 'X closes it');
    assert.match(fn('inner'), /class="arr-x" data-arr-x aria-label=/);
    /* the blue Liquid Glass of the Daily Quest box is unchanged */
    assert.match(CSS, /\.arr-card\.arr-quest \{ position: relative;[\s\S]{0,200}var\(--wh-glass-wide/);
});
