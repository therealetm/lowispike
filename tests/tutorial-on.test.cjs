'use strict';
/* Oct 29 2026 (Emmanuel, on a call: remove the current tutorial for now, do not update or rebuild it; he asks for a new one once
   the app is finished). tutorial-steps.js OFF = true parked the guided tour.
   4 Nov 2026 (Emmanuel: restore the first-time guided tutorial for newly signed-in users, keep a way to restart or continue it):
   OFF = false. The OFF switch and its guards stay in the code so the tour can be parked again with one line. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const S = require('../tutorial-steps.js');

test('the tutorial is on again', () => {
    assert.strictEqual(S.OFF, false);
});

test('new accounts get the tour once, existing accounts are never forced into it', () => {
    const A = require('../tutorial-auto.js');
    assert.strictEqual(A.decide(null, { quietMs: 99999 }), 'none', 'an account without the mark (set up before, or while the tour was off) is left alone');
    assert.strictEqual(A.decide({}, { quietMs: 99999 }), 'none');
    const fresh = A.markNew(null);
    assert.strictEqual(fresh.s, 'pending', 'setup done (lowi:setup-done) marks a new account');
    assert.strictEqual(A.decide(fresh, { quietMs: A.QUIET_MS }), 'start', 'and the tour starts once Home is quiet');
    assert.strictEqual(A.decide(fresh, { quietMs: 0 }), 'wait');
    for (const s of ['done', 'skipped', 'declined']) assert.strictEqual(A.decide({ s }, { quietMs: 99999 }), 'none', s + ' never replays');
    assert.deepStrictEqual(A.markNew({ s: 'done' }), { s: 'done' }, 'a second setup-done does not reset a finished tour');
    assert.match(read('index.html'), /window\.dispatchEvent\(new CustomEvent\("lowi:setup-done"\)\)/, 'setup still fires the event');
});

test('the guards stay (one line parks it again): start(), the auto start and the Continue pill all check S.OFF, What\'s New never does', () => {
    const js = read('tutorial.js');
    const start = js.slice(js.indexOf('function start(opts)'), js.indexOf('function news(n)'));
    assert.match(start, /^function start\(opts\) \{\s+if \(S\.OFF\) return false;/);
    assert.match(js, /if \(!S\.OFF && !W\.LowiTutorialAuto && !D\.querySelector\('script\[src\^="tutorial-auto\.js"\]'\)\)/);
    assert.match(js, /if \(!S\.OFF && !W\.LowiTutorialResume && !D\.querySelector\('script\[src\^="tutorial-resume\.js"\]'\)\)/);
    const news = js.slice(js.indexOf('function news(n)'), js.indexOf('function stop(reason)'));
    assert.ok(!/S\.OFF/.test(news), 'What\'s New is not the tutorial');
    assert.match(js, /W\.LowiTutorial = \{ off: !!S\.OFF, start, news,/);
});

test('ways in: the Settings > Tutorial row and the Community Walkthrough card show while the tour is on', () => {
    const SS = require('../home-settings-sleep-v2.js');
    assert.match(read('home-settings-sleep-v2.js'), /tutorial: \{ has: \(\) => !!\(root\.LowiTutorial && fn\(root\.LowiTutorial, 'start'\) && !root\.LowiTutorial\.off\)/);
    assert.ok(SS.TX.en.tutorial, 'the label stays for when it comes back');
    assert.match(read('community-rooms-ui.js'), /const cards=\[\['intro','👋','obC1','obC1s'\]\]\.concat\(W\.LowiTutorial&&W\.LowiTutorial\.off\?\[\]:\[\['walk'/);
});
