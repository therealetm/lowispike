'use strict';
/* Item 38 (Oct 22 2026, Emmanuel: "In tutorial it tells the person to do stuff but then you can't actually do the stuff so either make
   sure they understand they can play after tutorial or let them actually do the gesture.")
   Pins: every card that asks for a gesture (tap, hold, swipe, drag, pinch, scan ...) is one of
     try      the real control takes the gesture right there (tryIt; touches go through the dimmed screen),
     practice a practice pad on the card takes it (nothing in the app changes, no mic, no camera),
     later    the text says, in every language, that it is done after the tour, and the card shows the motion,
   or carries an info reason saying why its words are not an instruction. Lists every instruction card when run. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const S = require('../tutorial-steps.js');
const LANGS = ['en', 'de', 'es'];
const MOTIONS = ['tap', 'hold', 'double', 'drag', 'swipe', 'pinch'];

test('every card of the short tour is shown by the finger on the real control, or asks for nothing (Oct 25 2026, listed)', () => {
    const rows = [];
    for (const s of S.plan({ claimReady: true })) {
        rows.push((s.demo ? s.demo.g + ' > ' + (s.demo.open || 'stay') : 'no gesture').padEnd(26) + ' ' + s.id);
        if (S.INSTRUCTION.test(s.text.en)) assert.ok(s.demo || s.id === 'claim', s.id + ' asks for a gesture, so the finger shows it: "' + s.text.en + '"');
        assert.ok(!s.tryIt && !s.practice && !s.later, s.id + ': no Try it now, practice or after-the-tour in the short tour');
    }
    assert.ok(rows.filter(r => !/^no gesture/.test(r)).length >= 9, rows.join('\n'));
});

test('"later" cards are What\'s New cards only; they say so in every language and name a motion to show', () => {
    const later = S.STEPS.filter(s => s.later);
    for (const s of later) {
        assert.strictEqual(s.area, 'new', s.id + ': only What\'s New cards are for after the tour (the short base tour never is)');
        assert.ok(MOTIONS.includes(s.later), s.id + ': later motion ' + s.later);
        for (const l of LANGS) assert.match(s.text[l], S.LATER_MARK[l], s.id + '/' + l + ' says after the tour');
    }
    for (const s of S.base()) for (const l of LANGS) assert.doesNotMatch(s.text[l], S.LATER_MARK[l], s.id + '/' + l + ': no after-the-tour in the base tour');
});

test('no practice cards and no look-alikes any more; the one pretend screen is Scan, marked Demo, never the camera or mic for real', () => {
    assert.strictEqual(S.STEPS.filter(s => s.practice).length, 0, 'no practice card');
    const pretend = S.STEPS.filter(s => s.demo && /demo$/.test(s.demo.open || ''));
    assert.deepStrictEqual(pretend.map(s => s.id), ['scan']);
    const d = read('tutorial-demo.js').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/getUserMedia|mediaDevices|SpeechRecognition|webkitSpeech/.test(d), 'no camera or mic in tutorial-demo.js');
    assert.ok(/demo: 'Demo'/.test(d), 'the verdict card is marked Demo');
});

test('only the Community card switches tabs: its finger taps the real Community bubble and the Community tab opens (Oct 25 2026)', () => {
    const tabbers = S.STEPS.filter(s => s.rm || (s.demo && s.demo.open === 'community-tab'));
    assert.deepStrictEqual(tabbers.map(s => s.id), ['community']);
    const c = tabbers[0];
    assert.strictEqual(c.demo.g, 'tap');
    assert.match(read('tutorial.js'), /'community-tab': \{/, 'tutorial.js knows how to open and close the Community tab');
});

test('tutorial.js: practice pad and later motion are drawn, hands-free still moves on, nothing passes through on practice cards', () => {
    const src = read('tutorial.js'), css = read('tutorial.css');
    assert.match(src, /padHtml\(s, U\) \+ laterHtml\(s, U\)/);
    assert.match(src, /function padWire\(card\)/);
    assert.match(src, /if \(s && s\.practice\) return null;/, 'practice cards have no spotlight on a control that ignores touches');
    assert.match(src, /const wait = s\.tryIt \? Math\.max\(AUTO\.GAP, AUTO\.TRY - [^;]*: canTry\(s\) \? AUTO\.TRY : AUTO\.GAP;/, 'practice cards get the try-it time in hands-free mode, then move on by themselves');
    assert.match(src, /root\.classList\.toggle\('lt-try', real && !done\)/, 'only real try-it cards let touches through the dim');
    assert.match(src, /!S\.tryMatch\(wants\(s\), kind\)/);
    assert.match(css, /\.lt-pad \{[^}]*touch-action: none/);
    assert.match(css, /\.lt-later \{/);
    assert.match(css, /prefers-reduced-motion: reduce\) \{ \.lt-hand > span/);
    /* the pad never asks for the mic or camera, and never touches app data */
    const pad = src.slice(src.indexOf('function padHtml'), src.indexOf('const PAUSE_SVG'));
    assert.doesNotMatch(pad, /getUserMedia|localStorage|goTab|\.click\(\)/);
});

/* Oct 22 2026: the energy-shot card says "keep one on the joystick, and tap the world twice quickly with the other". On the practice pad
   the resting finger used to turn the second finger's taps into a pinch, so the card could not be done as written. */
test('the demo finger never logs anything: tutorial-demo.js only draws the finger, and the tour only opens and closes pages', () => {
    const d = read('tutorial-demo.js').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/localStorage|sessionStorage|indexedDB|\.click\(\)|dispatchEvent|fetch\(|LowiFuel|LowiWater|LowiSleep|logMeal|addWater/.test(d), 'no storage, no clicks, no logging calls');
    const js = read('tutorial.js'), open = js.slice(js.indexOf('const OPEN'), js.indexOf('const OPEN') + 4000);
    assert.ok(!/\blog\w*\(|addWater|LowiFuel\.add|saveMeal/.test(open), 'the pages the tour opens are opened and closed, never logged into');
});
