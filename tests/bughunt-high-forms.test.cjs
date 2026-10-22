'use strict';
/* Bug hunt round 12 (Oct 19 2026, 11 PM).
   BH-012: forms 7-10 (Nova..Majesty, index 6-9) arrived with ten forms, but the standard companion art still read six-step tables,
   so at 4,500 XP and up her face sat at translate(130 undefined) outside her body, the stem and body had undefined geometry, and the
   Legendary halo and sparkles vanished. Found on the live site (build 20261019-224907) in a simulated iPhone 13 and Chrome.
   BH-013: refresh() saved lastSeenStage before the evolution was on screen. The evolution waits while a card or sheet is open, so a
   reload or app close in that wait (or during the animation) lost it for good. Same family as BH-009..011: progress saved early,
   resume reads the early field. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const herb = read('herb-tamagotchi.js'), css = read('herb-tamagotchi.css');

test('BH-012: the standard art draws every one of the ten forms with real numbers', () => {
    /* Oct 22 2026: the flowery herb (stem, leaf count, blossoms) is gone; only the face position and body radius tables remain */
    const line = herb.split('\n').find(l => /const g=Math\.max\(0,Math\.min\(5,i\|0\)\),faceY=/.test(l));
    assert.ok(line, 'plant() clamps its table index');
    const tables = [...line.matchAll(/(\w+)=(\[[\d,]+\])\[(\w)\]/g)];
    assert.equal(tables.length, 2);
    for (const t of tables) assert.equal(t[3], 'g', t[1] + ' reads the clamped index');
    assert.ok(!/const count=\[/.test(herb), 'no leaf count table left');
    for (let i = 0; i < 10; i++) {
        const g = Math.max(0, Math.min(5, i | 0));
        for (const t of tables) assert.ok(Number.isFinite(JSON.parse(t[2])[g]), t[1] + ' at form ' + (i + 1));
    }
});

test('BH-012: halo, sparkles and the float stay for every form from Legendary on', () => {
    assert.match(herb, /const halo=i>=5\|\|/);
    assert.match(herb, /e\.effect==='stars'\?18:i>=5\?12:6/);
    assert.doesNotMatch(herb, /i===5/);
    for (let i = 5; i < 10; i++) assert.match(css, new RegExp('\\.lh-stage-' + i + ' \\.lh-foliage[^{]*\\{animation:lh-float'));
});

test('BH-013: an evolution that has not been seen survives a reload', () => {
    assert.match(herb, /if\(m\.index>prior\)\{p\.lastSeenStage=m\.index;p\.evoFrom=Math\.max\(0,prior\);savePrefs\(p\);evolve\(m,p\.evoFrom\);\}/);
    assert.match(herb, /else if\(p\.evoFrom!=null&&!evolution&&!evoWait\)\{[^}]*if\(\+p\.evoFrom<m\.index\)evolve\(m,\+p\.evoFrom\);else\{delete p\.evoFrom;savePrefs\(p\);\}\}/);
    const fin = /function finishEvolution\(\)\{if\(!evolution\)return;[^\n]*/.exec(herb)[0];
    assert.match(fin, /delete q\.evoFrom;savePrefs\(q\)/, 'closing the evolution clears the marker');
    assert.ok(herb.indexOf('let evoWait=0') < herb.indexOf('function refresh('), 'evoWait exists before refresh reads it');
});
