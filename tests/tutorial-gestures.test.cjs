'use strict';
/* The tutorial covers every gesture and every section of the app (Oct 21 2026, Emmanuel: "So many gestures are not even
   explained in the tutorial ... Pinch, click, long click, press, all this stuff, how are people supposed to know? Needs to be
   in the tutorial." and "taking us to honestly every section").
   - every GESTURES entry is taught by some step (teaches), every teaches id is a real GESTURES entry
   - every GESTURES src file exists and, if it is app code, really has an input handler
   - CODE SCAN: every app file with a gesture handler (pointerdown, touchstart, gesturestart, dblclick, contextmenu, wheel) is in
     some GESTURES src or in GESTURE_EXEMPT with a reason. A new gesture somewhere in the app fails this test until it is taught.
   - every kind of gesture (tap, hold, drag, pinch, double, triple, swipe, push, tilt) appears
   - every section is visited: Home, Scan, Community and each Community tab (Room, Chat, Creation, Affiliates), Settings,
     Flying/worlds, Misty's card, and every tutorial AREA has a step
   - Settings is taught as a HOLD on the Community bubble (since Oct 21 2026 a tap opens Community, a hold opens Settings)
   - try-it steps use a gesture tutorial.js can detect and match the gesture they teach
   - the card shows only "Tutorial · X of N" (no dots, no extra label) */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const T = require('../tutorial-steps.js');

const HANDLER = /addEventListener\(\s*['"](pointerdown|touchstart|gesturestart|dblclick|contextmenu|wheel)['"]|\.on(pointerdown|touchstart|dblclick|contextmenu)\s*=/;
const INPUT = /addEventListener\(\s*['"](pointer\w+|touch\w+|gesture\w+|click|dblclick|contextmenu|wheel|deviceorientation|keydown)['"]|\.on(pointer\w+|touch\w+|click|dblclick)\s*=|data-[\w-]+=|onTap|tap\(|\.click\(/;
const appFiles = () => fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && f !== 'sw.js');

test('every gesture is listed once, every taught id is a real gesture, and each demo card of the short tour teaches what its finger shows (Oct 25 2026)', () => {
    const ids = new Set(), byId = {};
    for (const g of T.GESTURES) { assert.ok(!ids.has(g.id), 'duplicate gesture id ' + g.id); ids.add(g.id); byId[g.id] = g; }
    for (const s of T.STEPS) for (const g of (s.teaches || [])) assert.ok(ids.has(g), 'step ' + s.id + ' teaches unknown gesture ' + g);
    const demos = T.base().filter(s => s.demo);
    assert.ok(demos.length >= 9, 'nearly every base card shows its gesture with the finger (' + demos.length + ')');
    for (const s of demos) assert.ok((s.teaches || []).some(g => byId[g].how === s.demo.g), s.id + ': the finger shows a gesture the card teaches');
    const t = T.taught(); for (const s of demos) for (const g of s.teaches) assert.ok(t[g], g + ' counts as taught');
});

test('every gesture names real source files with input handling in them', () => {
    for (const g of T.GESTURES) {
        assert.ok(Array.isArray(g.src) && g.src.length, g.id + ' names its source files');
        assert.ok(typeof g.what === 'string' && g.what.length > 8, g.id + ' says what it does');
        for (const f of g.src) {
            assert.ok(fs.existsSync(path.join(ROOT, f)), g.id + ': ' + f + ' exists');
        }
        /* a push is flying Misty into something: the flight code reacts to where she is, not to a touch handler */
        if (g.how !== 'push') assert.ok(g.src.some(f => INPUT.test(read(f))), g.id + ': at least one of ' + g.src.join(', ') + ' handles input');
    }
});

test('CODE SCAN: every file with a gesture handler is taught or exempt with a reason', () => {
    const known = new Set();
    T.GESTURES.forEach(g => g.src.forEach(f => known.add(f)));
    for (const [f, why] of Object.entries(T.GESTURE_EXEMPT)) {
        assert.ok(typeof why === 'string' && why.trim().length >= 12, 'GESTURE_EXEMPT ' + f + ' says why');
        known.add(f);
    }
    const hits = appFiles().filter(f => HANDLER.test(read(f)));
    assert.ok(hits.length >= 20, 'the scan finds the app\'s gesture code (' + hits.length + ' files)');
    const missing = hits.filter(f => !known.has(f));
    assert.deepStrictEqual(missing, [], 'gesture handlers with no tutorial step: add a GESTURES entry (and a step that teaches it) or a GESTURE_EXEMPT reason');
});

test('the short tour shows tap, hold and drag with the finger, and every kind of gesture stays listed for the app', () => {
    const shown = new Set(T.base().filter(s => s.demo).map(s => s.demo.g));
    for (const k of ['tap', 'hold', 'drag']) assert.ok(shown.has(k), 'the finger shows a ' + k);
    const kinds = new Set(T.GESTURES.map(g => g.how));
    for (const k of ['tap', 'hold', 'drag', 'pinch', 'double', 'triple', 'swipe', 'push', 'tilt']) assert.ok(kinds.has(k), 'a ' + k + ' gesture is listed');
});

test('every section of the app has a card in the short tour, and the tour opens it for real (never the camera)', () => {
    const S = T.base(), where = s => s.where || 'home';
    for (const a of ['you', 'home', 'food', 'together', 'settings', 'end']) assert.ok(S.some(s => s.area === a), 'area ' + a + ' has a base card');
    /* Oct 28 2026 (slim structure, batch 10): the joystick card ('fly') is merged into the last card, which shows the drag */
    assert.ok(S.some(s => s.area === 'end' && (s.target || []).includes('#whPad') && s.demo && s.demo.g === 'drag'), 'the last card shows the joystick');
    for (const a of T.AREAS) assert.ok(T.STEPS.some(s => s.area === a) || ['companion', 'extras', 'play'].includes(a), 'area ' + a + ' has a step');
    /* Oct 25 2026: Scan opens a pretend Scan (sample photo + Demo verdict); the camera question waits for the first real scan */
    assert.ok(S.some(s => s.demo && s.demo.open === 'scan-demo'), 'a card shows what is inside Scan');
    assert.ok(S.some(s => s.demo && s.demo.open === 'community-tab'), 'a card opens Community');
    assert.ok(S.some(s => s.demo && s.demo.open === 'settings-sheet'), 'a card opens Settings');
    for (const s of T.STEPS) assert.ok(['home', 'community', 'move'].includes(where(s)), s.id + ': where is home, community or move (never scan: it opens the camera)');
    const gw = new Set(T.GESTURES.map(g => g.where));
    for (const w of ['home', 'world', 'scan', 'community', 'any']) assert.ok(gw.has(w), 'gestures of section ' + w + ' are listed');
    const covers = T.covered();
    for (const f of ['scan', 'deep-analyze', 'forms', 'worlds', 'community', 'settings', 'tutorial']) assert.ok(covers[f], 'feature ' + f + ' is covered');
    const js = read('tutorial.js');
    assert.match(js, /function goSection\(/, 'tutorial.js moves to the step\'s section');
    assert.match(js, /const TAB_OF = \{ home: 'home', community: 'foryou' \};/, 'community maps to its tab; scan is never a tour section');
});

test('Settings opens by HOLDING the Community bubble (old check expected a tap)', () => {
    const s = T.STEPS.find(x => x.id === 'settings');
    assert.ok(s, 'there is a Settings step');
    assert.ok((s.teaches || []).includes('community-hold'), 'it teaches holding Community');
    assert.deepStrictEqual(s.demo, { g: 'hold', open: 'settings-sheet' }, 'its finger holds Community and Settings opens');
    assert.match(s.text.en, /^Hold Community/);
    assert.match(s.text.de, /^Halt Community gedrückt/);
    assert.match(s.text.es, /^Mantén pulsada Comunidad/);
    for (const l of ['en', 'de', 'es']) assert.doesNotMatch(s.text[l], /^(Tap|Tipp|Toca) (Settings|Einstellungen|Ajustes)/i, 'no step says tap Settings (' + l + ')');
    const hold = T.GESTURES.find(g => g.id === 'community-hold'), tap = T.GESTURES.find(g => g.id === 'community-tap');
    assert.strictEqual(hold.how, 'hold'); assert.strictEqual(tap.how, 'tap');
    for (const x of T.STEPS) for (const l of ['en', 'de', 'es']) assert.doesNotMatch(x.text[l], /(tap|tipp\w*|toca) (the |die |la )?(Settings|Einstellungen|Ajustes)[- ](bubble|Blase|burbuja)/i, x.id + '.' + l);
});

test('no card has a try-it any more (Oct 25 2026): the demo finger uses gestures tutorial-demo.js can show, matching what each card teaches', () => {
    const byId = {}; T.GESTURES.forEach(g => { byId[g.id] = g; });
    assert.strictEqual(T.STEPS.filter(s => s.tryIt).length, 0, 'no "Try it now" card');
    const demo = read('tutorial-demo.js');
    for (const s of T.STEPS.filter(x => x.demo)) {
        assert.ok(['tap', 'hold', 'drag'].includes(s.demo.g), s.id + ': demo gesture ' + s.demo.g + ' is one the finger can show');
        assert.ok(demo.includes("'" + s.demo.g + "'"), 'tutorial-demo.js knows ' + s.demo.g);
        assert.ok((s.teaches || []).some(g => byId[g] && (byId[g].how === s.demo.g || T.tryMatch(s.demo.g, byId[g].how))), s.id + ': the finger matches a gesture it teaches');
    }
    assert.ok(T.tryMatch('drag', 'swipe') && T.tryMatch('hold', 'hold') && !T.tryMatch('tap', 'hold'));
});

test('every step reads in en, de and es and fits the card', () => {
    for (const s of T.STEPS) for (const l of ['en', 'de', 'es']) {
        assert.ok(s.title && s.title[l], s.id + ' title ' + l);
        assert.ok(s.text && s.text[l] && s.text[l].length <= 230, s.id + '.' + l + ' text fits (' + (s.text && s.text[l] || '').length + ')');
    }
    const ids = T.STEPS.map(s => s.id);
    assert.strictEqual(new Set(ids).size, ids.length, 'step ids are unique');
});

test('the card still shows only "Tutorial · X of N" (no progress dots)', () => {
    const js = read('tutorial.js');
    assert.match(js, /\(news \? \(U\.newsLabel \|\| U\.label\) : U\.label\) \+ ' \\u00b7 ' \+ S\.fill\(U\.of, \{ i: i \+ 1, n: list\.length \}\)\)/);
    assert.doesNotMatch(js, /lt-dot/);
    assert.strictEqual(T.fill(T.UI.en.label + ' \u00b7 ' + T.UI.en.of, { i: 17, n: 41 }), 'Tutorial \u00b7 17 of 41');
});
