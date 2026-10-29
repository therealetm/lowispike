'use strict';
/* Oct 29 2026 (Emmanuel, on a call: remove the current tutorial for now, do not update or rebuild it; he asks for a new one once
   the app is finished). tutorial-steps.js OFF = true parks the guided tour: nobody can reach it, What's New stays. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const S = require('../tutorial-steps.js');

test('the tutorial is off', () => {
    assert.strictEqual(S.OFF, true);
});

test('start() does nothing, the auto start and the Continue pill are not loaded, What\'s New stays', () => {
    const js = read('tutorial.js');
    const start = js.slice(js.indexOf('function start(opts)'), js.indexOf('function news(n)'));
    assert.match(start, /^function start\(opts\) \{\s+if \(S\.OFF\) return false;/);
    assert.match(js, /if \(!S\.OFF && !W\.LowiTutorialAuto && !D\.querySelector\('script\[src\^="tutorial-auto\.js"\]'\)\)/);
    assert.match(js, /if \(!S\.OFF && !W\.LowiTutorialResume && !D\.querySelector\('script\[src\^="tutorial-resume\.js"\]'\)\)/);
    const news = js.slice(js.indexOf('function news(n)'), js.indexOf('function stop(reason)'));
    assert.ok(!/S\.OFF/.test(news), 'What\'s New is not the tutorial');
    assert.match(js, /W\.LowiTutorial = \{ off: !!S\.OFF, start, news,/);
});

test('no way in: no Settings row, no Walkthrough card in the Community welcome', () => {
    const SS = require('../home-settings-sleep-v2.js');
    assert.match(read('home-settings-sleep-v2.js'), /tutorial: \{ has: \(\) => !!\(root\.LowiTutorial && fn\(root\.LowiTutorial, 'start'\) && !root\.LowiTutorial\.off\)/);
    assert.ok(SS.TX.en.tutorial, 'the label stays for when it comes back');
    assert.match(read('community-rooms-ui.js'), /const cards=\[\['intro','👋','obC1','obC1s'\]\]\.concat\(W\.LowiTutorial&&W\.LowiTutorial\.off\?\[\]:\[\['walk'/);
});
