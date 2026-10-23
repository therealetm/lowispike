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

test('Oct 23: the old Home copy of the card (the slot under the Daily Quest, "Back in the bloodstream") is deleted', () => {
    for (const name of ['placeSlot', 'questSlot', 'watchBoard', 'inQuest', 'note']) assert.ok(!new RegExp('function ' + name + '\\(').test(JS), name + ' is gone');
    assert.ok(!/hqSlot|hq-slot/.test(CSS), 'no slot styles left');
    assert.ok(!/\bnote,/.test(JS.slice(JS.indexOf('W.LowiArrival = {'))), 'no note() in the API');
});

test('on the world Home the card never floats over the top row (weather pill, sun/moon, profile picture)', () => {
    assert.match(fn('floating'), /if \(D\.documentElement\.classList\.contains\('wh-home'\)\) return null; \/\* never on Home/);
});

test('leaving the place takes the card away: bloodstream, fly-out from the World map, other tab, Community zoom-out', () => {
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
    assert.match(fn('close'), /setTimeout\(\(\) => el\.remove\(\), reduced\(\) \|\| how === 'now' \? 0 : 320\)/, 'removed after the fade, at once with reduced motion');
    assert.match(fn('mount'), /closest\('\[data-arr-x\]'\)\) \{ e\.preventDefault\(\); e\.stopPropagation\(\); close\(\); \}/, 'X closes it');
    assert.match(fn('inner'), /class="arr-x" data-arr-x aria-label=/);
});
