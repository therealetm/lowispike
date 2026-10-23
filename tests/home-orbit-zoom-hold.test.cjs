'use strict';
/* Oct 23 2026 (Eman's screenshot, "somewhere in the code the old UI is still there ... nuke it"): zooming in on Home grows Misty's
   bubble with the camera (--wh-mz). When she no longer fitted inside the ring, home-orbit-v2.js dropped o8 and the OLD Home came back
   (Daily Quest box on top, Today pill at the bottom, Fast and Water round a giant Misty). The ring now holds its last good layout
   while the camera is zoomed in further than that layout. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'home-orbit-v2.js'), 'utf8');
const O = require('../home-orbit-v2.js');

test('measure() records the camera zoom Misty is scaled by', () => {
    assert.match(src, /L\.mz = parseFloat\(m\.style\.getPropertyValue\('--wh-mz'\)\) \|\| 1;/);
});
test('a zoomed-in Misty that no longer fits keeps the last ring instead of dropping o8 (no old Home)', () => {
    const hold = src.indexOf("if (!L.ok && wasOn && last && last.ok && L.mz > (last.mz || 0) + 0.01) return last;");
    const drop = src.indexOf("if (!L.ok) { if (wasOn) { H.classList.remove('o8'");
    assert.ok(hold > 0, 'zoom hold present');
    assert.ok(drop > hold, 'the hold runs before the o8 drop');
});
test('the zoom really can make the ring fail: a 1.4x Misty on a 390x844 phone does not fit, the resting one does', () => {
    const base = { vw: 390, vh: 844, cx: 195, cy: 388, safe: {} };
    assert.strictEqual(O.fit(Object.assign({ mistyR: 75 }, base)).ok, true);
    assert.strictEqual(O.fit(Object.assign({ mistyR: 147 }, base)).ok, false);
});
