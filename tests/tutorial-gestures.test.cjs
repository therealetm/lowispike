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

test('every gesture has a step that teaches it, and every taught id is a real gesture', () => {
    const t = T.taught(), ids = new Set();
    for (const g of T.GESTURES) {
        assert.ok(!ids.has(g.id), 'duplicate gesture id ' + g.id); ids.add(g.id);
        assert.ok(t[g.id], 'no tutorial step teaches gesture "' + g.id + '" (' + g.what + ')');
    }
    for (const s of T.STEPS) for (const g of (s.teaches || [])) assert.ok(ids.has(g), 'step ' + s.id + ' teaches unknown gesture ' + g);
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

test('every kind of gesture is in the tutorial', () => {
    const t = T.taught(), kinds = new Set(T.GESTURES.filter(g => t[g.id]).map(g => g.how));
    for (const k of ['tap', 'hold', 'drag', 'pinch', 'double', 'triple', 'swipe', 'push', 'tilt']) assert.ok(kinds.has(k), 'the tutorial teaches a ' + k);
});

test('every section of the app has a step and the tour visits it', () => {
    const S = T.STEPS, where = s => s.where || 'home';
    for (const a of T.AREAS) assert.ok(S.some(s => s.area === a), 'area ' + a + ' has a step');
    for (const w of ['home', 'scan', 'community']) assert.ok(S.some(s => where(s) === w), 'a step is shown in ' + w);
    for (const rm of ['room', 'chat', 'create', 'aff']) assert.ok(S.some(s => where(s) === 'community' && s.rm === rm), 'Community tab ' + rm + ' has a step');
    for (const s of S) {
        assert.ok(['home', 'scan', 'community'].includes(where(s)), s.id + ': where is home, scan or community');
        if (s.rm) assert.strictEqual(where(s), 'community', s.id + ': a Community tab step is shown in Community');
    }
    const gw = new Set(T.GESTURES.map(g => g.where));
    for (const w of ['home', 'world', 'scan', 'community', 'any']) assert.ok(gw.has(w), 'gestures of section ' + w + ' are listed');
    /* sections that are their own screen each get a step */
    const covers = T.covered();
    for (const f of ['scan', 'deep-analyze', 'forms', 'worlds', 'community', 'settings', 'tutorial']) assert.ok(covers[f], 'feature ' + f + ' is covered');
    /* tutorial.js takes the user to a step's section */
    const js = read('tutorial.js');
    assert.match(js, /function goSection\(/, 'tutorial.js moves to the step\'s section');
    assert.match(js, /community: 'foryou', scan: 'scan'/, 'community and scan map to their tabs');
});

test('Settings opens by HOLDING the Community bubble (old check expected a tap)', () => {
    const s = T.STEPS.find(x => x.id === 'settings');
    assert.ok(s, 'there is a Settings step');
    assert.ok((s.teaches || []).includes('community-hold'), 'it teaches holding Community');
    assert.deepStrictEqual(s.tryIt && s.tryIt.how, 'hold', 'its try-it is a hold');
    assert.match(s.text.en, /hold the Community bubble/i);
    assert.match(s.text.de, /Community-Blase kurz gedrückt/);
    assert.match(s.text.es, /mantén pulsada la burbuja Comunidad/i);
    for (const l of ['en', 'de', 'es']) assert.doesNotMatch(s.text[l], /^(Tap|Tipp|Toca) (Settings|Einstellungen|Ajustes)/i, 'no step says tap Settings (' + l + ')');
    const hold = T.GESTURES.find(g => g.id === 'community-hold'), tap = T.GESTURES.find(g => g.id === 'community-tap');
    assert.strictEqual(hold.how, 'hold'); assert.strictEqual(tap.how, 'tap');
    /* no step anywhere tells people to tap a Settings bubble */
    for (const x of T.STEPS) for (const l of ['en', 'de', 'es']) assert.doesNotMatch(x.text[l], /(tap|tipp\w*|toca) (the |die |la )?(Settings|Einstellungen|Ajustes)[- ](bubble|Blase|burbuja)/i, x.id + '.' + l);
});

test('try-it steps use a gesture tutorial.js can detect, matching what they teach', () => {
    const detect = new Set(['tap', 'hold', 'drag', 'pinch', 'double', 'triple', 'swipe']), byId = {};
    T.GESTURES.forEach(g => { byId[g.id] = g; });
    const tries = T.STEPS.filter(s => s.tryIt);
    assert.ok(tries.length >= 5, 'several steps let people try the gesture (' + tries.length + ')');
    for (const s of tries) {
        assert.ok(detect.has(s.tryIt.how), s.id + ': tryIt.how ' + s.tryIt.how + ' is detectable');
        assert.ok((s.teaches || []).some(g => byId[g] && T.tryMatch(s.tryIt.how, byId[g].how) || (byId[g] && byId[g].how === s.tryIt.how)), s.id + ': the try-it matches a gesture it teaches');
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
    assert.match(js, /esc\(U\.label \+ ' \\u00b7 ' \+ S\.fill\(U\.of, \{ i: i \+ 1, n: list\.length \}\)\)/);
    assert.doesNotMatch(js, /lt-dot/);
    assert.strictEqual(T.fill(T.UI.en.label + ' \u00b7 ' + T.UI.en.of, { i: 17, n: 41 }), 'Tutorial \u00b7 17 of 41');
});
