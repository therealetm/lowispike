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

test('batch 2a: the hidden Home screens X-13, X-23, X-24, X-28, X-34, X-36 are gone, every old entry point lands somewhere sensible', () => {
    const idx = read('index.html');
    assert.match(idx, /start:\(o\) => \{ \/\* Oct 28 2026 slim structure \(X-13 deleted\)[^}]*LowiTutorial\.start\(o\)/, 'X-13: the old guide start opens the one Tutorial');
    assert.match(read('micro-book.js'), /if \(t !== 'fr'\) \{ try \{ if \(W\.LowiMyDay && W\.LowiMyDay\.open\) W\.LowiMyDay\.open\(\);/, 'X-23: the travel journal lands in Mein Tag, Friends care stays');
    const ns = read('nutri-stats.js');
    assert.match(ns.slice(ns.indexOf('function open(from)'), ns.indexOf('function openOld(from)')), /LowiMyDay\.open\(\)/, 'X-24: today stats land in Mein Tag');
    assert.match(read('misty-hub.js'), /function youHtml\(\) \{ return '';/, 'X-24: no You row in the companion card');
    assert.match(read('daily-ritual.js'), /openDay: \(\) => \{[^}]*X-28 deleted[^}]*LowiMyDay/, 'X-28: the streak day lands in Mein Tag');
    const tb = read('top-bar.js');
    assert.match(tb, /openWeather: \(\) => false/, 'X-34: the weather screen does not open');
    assert.doesNotMatch(tb, /stopImmediatePropagation\(\); openWeather\(\);/, 'X-34: the pill no longer opens it');
    const w3 = read('body-world-3d.js');
    assert.match(w3, /function open\(\) \{\s*\/\*[^*]*X-36 deleted[^*]*\*\/\s*if \(!api\.allowFull\) return false;/, 'X-36: no separate 3D window');
    assert.match(w3, /if \(api\.allowFull && els\.top && !els\.top\.querySelector\('\.bw3-open'\)\)/, 'X-36: no button that opens it');
});

test('batch 4: meal analysis + logging is one flow (X-12 into the one logger, no empty details panel X-22)', () => {
    const idx = read('index.html');
    const s = idx.slice(idx.indexOf('function start(o){ o = o || {};'));
    assert.match(s.slice(0, 600), /if \(startShared\(o\)\) return;/, 'every start, also {own:true}, opens the one meal logger');
    assert.doesNotMatch(s.slice(0, 600), /if \(!o\.own && startShared\(o\)\) return;/);
    assert.match(read('meal-detail.js'), /if \(!C\.hasDetail\(C\.clean\(detail\)\) && !ctx\.name && !ctx\.photo\) return null;/, 'X-22: no empty details panel');
});
