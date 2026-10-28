/* Oct 28 2026 (Emmanuel: "setz alles um", the slim structure 124 -> 57): guards for each batch that went live */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('batch 1: What\'s New is at most ONE card (no per-feature tour steps one by one)', () => {
    const src = read('tutorial.js');
    const body = src.slice(src.indexOf('function news(n)'), src.indexOf('function stop('));
    assert.match(body, /let l = \[\];/);
    assert.match(body, /S\.newsCard\(n\)/);
    assert.match(body, /l = \[intro\]/, 'falls back to the single intro card');
    assert.doesNotMatch(body, /ids\.map\(byId\)/, 'never plays the tour ids');
});

test('batch 1: one optional guide in Settings: Tutorial, no separate video tour row', () => {
    const SS = require('../home-settings-sleep-v2.js');
    assert.ok(SS.SETTINGS_IDS.includes('tutorial'));
    assert.ok(!SS.SETTINGS_IDS.includes('quickTour'));
});
