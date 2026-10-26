// Adventure tiers (Oct 17): her timed adventure is gated by level, autopilot (three taps) never is; both fly the same tour engine.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const A = require('../adventure-tiers.js'), X = require('../misty-explore.js'), C = require('../world-home-core.js');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const mf = read('misty-flight.js'), gx = read('misty-galaxy.js'), gb = read('galaxy-bubbles.js'), html = read('index.html'), sw = read('sw.js'), hub = read('misty-hub.js'), sun = read('sun-meter.js');

test('five tiers in the agreed order, unlocked at levels 1, 3, 4, 5 and 6', () => {
    assert.deepStrictEqual(A.TIERS.map(t => t.id), ['local', 'cells', 'atmos', 'bubbles', 'streams']);
    assert.deepStrictEqual(A.TIERS.map(t => t.lv), [1, 3, 4, 5, 6]);
});
test('tier thresholds match the companion level XP in world-home-core.js', () => {
    A.TIERS.forEach(t => { assert.strictEqual(C.stage(t.xp).index + 1, t.lv, t.id); if (t.xp > 0) assert.ok(C.stage(t.xp - 1).index + 1 < t.lv, t.id + ' just below'); });
});
test('her timed adventure reaches only what her level unlocks', () => {
    const at = lv => A.capsFor('trip', lv);
    assert.deepStrictEqual([1, 2].map(lv => at(lv).cells), [false, false]);
    assert.strictEqual(at(2).atmos, false);
    assert.ok(at(3).cells && !at(3).atmos);
    assert.ok(at(4).atmos && !at(4).bubbles);
    assert.ok(at(5).bubbles && !at(5).streams);
    assert.ok(at(6).streams && at(6).bubbles && at(6).atmos && at(6).cells);
});
test('autopilot is never gated, whatever her level', () => {
    [1, 2, 3, 4, 5, 6].forEach(lv => { const c = A.capsFor('auto', lv); assert.ok(c.cells && c.atmos && c.bubbles && c.streams, 'level ' + lv); });
});
test('the unlock list marks what is on and what still needs a level', () => {
    const l = A.list(4);
    assert.deepStrictEqual(l.map(x => x.status), ['on', 'on', 'on', 'locked', 'locked']);
    assert.ok(l.every(x => x.n.length === 3 && x.d.length === 3), 'EN/DE/ES names and descriptions');
});
test('excursions only start when the sky is unlocked and she is free in her own world', () => {
    const E = { tour: X.X.EVERY, done: true }, free = { gx: false, gxBack: false, wait: false, going: false, reduced: false };
    assert.strictEqual(X.due(A.capsOf(1), E, free), false);
    assert.strictEqual(X.due(A.capsOf(2), E, free), true);
    assert.strictEqual(X.due(A.capsOf(2), E, Object.assign({}, free, { wait: true })), false);
    assert.strictEqual(X.due(A.capsOf(2), E, Object.assign({}, free, { going: true })), false);
    assert.strictEqual(X.due(A.capsOf(2), E, Object.assign({}, free, { gx: true })), false);
    assert.strictEqual(X.due(A.capsOf(2), { tour: X.X.FIRST - 1, done: false }, free), false);
});
test('after the sky she goes into bubbles only from Level 5 and rides streams only from Level 6', () => {
    assert.strictEqual(X.after('atmos', A.capsOf(2)), 'home');
    assert.strictEqual(X.after('atmos', A.capsOf(3)), 'toBubble');
    assert.strictEqual(X.after('leave', A.capsOf(3), false), 'home');
    /* Oct 19 (E-man): from Level 6 the string tour replaces going into a bubble: after the sky she plans her first string, and a bubble
       she did go into always ends in home, never a second dip */
    assert.strictEqual(X.after('atmos', A.capsOf(4)), 'plan');
    assert.strictEqual(X.after('leave', A.capsOf(4)), 'home');
    assert.strictEqual(X.after('leave', A.capsOf(3)), 'home');
});
test('every excursion step has a time limit so she can never get stuck out there', () => {
    ['edge', 'atmos', 'toBubble', 'inside', 'leave', 'hook', 'ride', 'visit', 'fly', 'home'].forEach(p => assert.ok(X.X.LIM[p] > 0 && X.X.LIM[p] <= 60, p));
});
test('the timed trip no longer hands her to the old loop or cuts autopilot short', () => {
    const ok = mf.match(/const ok = [^\n]+/)[0], blink = mf.match(/const blink = [^\n]+/)[0];
    assert.ok(!/A\.away/.test(ok), ok); assert.ok(!/A\.away/.test(blink), blink);
    assert.match(mf, /const trip = !!ctx\.A\.away && !ADV\(\)/);
    // Oct 26 (Emmanuel: "You know the auto fly ... not automatically. It's quite annoying and then the UI breaks."): the timed
    // trip no longer switches the controller into autopilot (that hid every Home button for the hour), and letting go of the
    // stick mid-trip goes home, not back into autopilot. Autopilot is only the user's own three taps now.
    assert.doesNotMatch(mf, /S\.st === 'idle' && trip && !PD\.mode[^\n]+padMode\(ctx, 'auto'\)/);
    assert.doesNotMatch(mf, /S\.trip \? 'auto' : 'home'/);
    assert.match(mf, /if \(capsNow\(\)\.cells\) S\.tourGo = g/, 'cell worlds gated');
    assert.match(mf, /ADVX\(\) && !ctx\.reduced/, 'trip gets the autopilot drift');
    assert.match(mf, /steering && ADV\(\)\) \{ try \{ W\.LowiAdventure\.stop/, 'only autopilot is stopped by steering');
});
test('excursion flags reach the galaxy and its bubbles only on the tour', () => {
    assert.match(gx, /const ax = mode === 'auto' && !!S\.exOut/);
    assert.match(gb, /aimB = auto && S\.exB != null/);
    assert.match(gb, /\(drive \|\| ride\) && !ctx\.reduced/);
    assert.match(gb, /function targets\(ctx\)/);
});
test('wired in: scripts load, offline cache has them, the unlocks show on the Misty card and the trip sheet', () => {
    assert.match(html, /<script src="adventure-tiers\.js\?v=[^"]+"><\/script>\s*<script src="misty-hub\.js/);
    assert.match(html, /galaxy-bubbles\.js\?v=[^"]+"><\/script>\s*<script src="misty-explore\.js/);
    assert.ok(sw.includes('"adventure-tiers.js"') && sw.includes('"misty-explore.js"'));
    assert.match(hub, /advHtml\(\) \+/); assert.match(sun, /advLine\(/);
});
