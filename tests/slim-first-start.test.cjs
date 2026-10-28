'use strict';
/* Oct 28 2026 (slim structure, batch 10, shorter first start): T-02 merged into T-01, T-05 into T-04, T-21 into T-22,
   the starter-plan questions offered later on the Profile card instead of forced after the name. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');
const hs = read('herb-start.js');

test('install guide: "I added it" stays on the guide (no separate "open it from your Home Screen" screen)', () => {
    assert.match(html, /else if \(v === "added"\) added\(\);/);
    assert.match(html, /function added\(\)\{ view = "guide"; setStep\(2, true\); toast\(T\("Tap the LOWiSPIKE icon and create your account there\./);
    assert.doesNotMatch(html, /function doneHTML\(/, 'the done screen is gone');
    assert.doesNotMatch(html, /view = "done"/, 'nothing switches to it any more');
    assert.match(html, /window\.addEventListener\("appinstalled", \(\) => \{ installed = true; bip = null; if \(live\(\)\) added\(\); \}\);/);
});

test('the toast text has a German and a Spanish translation', () => {
    const i = html.indexOf('"Tap the LOWiSPIKE icon and create your account there. You can close this browser tab."');
    assert.ok(i > 0);
    const all = html.split('"Tap the LOWiSPIKE icon and create your account there. You can close this browser tab."').length - 1;
    assert.ok(all >= 2, 'used and listed in the phrase table');
});

test('companion gate: the name screen carries the first-XP chip and the account button, then the account form opens', () => {
    assert.match(hs, /hs-err" id="hsErr" role="alert"><\/p><span class="hs-chip">/, 'chip on the name screen');
    assert.match(hs, /data-hs="you">'\+esc\(t\('saveBtn',\{herb\}\)\)/, 'account button on the name screen');
    assert.match(hs, /firstReward\(\);\s*\/\*[^*]*\*\/\s*try\{if\(R\(\)\.showGate\)\{R\(\)\.showGate\('signup'\);return;\}\}/, 'name saved, first XP, account form');
    assert.doesNotMatch(hs, /hs-scene rew/, 'no separate reward screen');
});

test('the last tour card is the joystick card', () => {
    const S = require('../tutorial-steps.js');
    const list = S.base ? S.base() : (S.steps || S);
    const arr = Array.isArray(list) ? list : (list.base || []);
    const done = (Array.isArray(arr) && arr.length ? arr : (global.LowiTutorialSteps || [])).find(s => s.id === 'done');
    if (done) {
        assert.deepStrictEqual(done.target, ['#whPad']);
        assert.ok(done.teaches.includes('pad-drag') && done.teaches.includes('pad-triple'));
    }
    assert.doesNotMatch(read('tutorial-steps.js'), /id: 'fly'/, 'no separate fly card');
});
