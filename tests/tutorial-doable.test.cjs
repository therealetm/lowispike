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

test('every instruction card is doable now or says it is for after the tour (listed)', () => {
    const rows = [];
    for (const s of S.STEPS) {
        const k = S.kind(s), asks = S.INSTRUCTION.test(s.text.en);
        if (asks || k !== 'info') rows.push(k.padEnd(8) + ' ' + s.id + (s.practice ? ' (' + s.practice.how + ' on ' + s.practice.look + ')' : s.tryIt ? ' (' + s.tryIt.how + ')' : s.later ? ' (shows ' + s.later + ')' : ''));
        if (asks && k === 'info') assert.ok(typeof s.info === 'string' && s.info.trim().length >= 12, s.id + ' asks for a gesture but is neither tryIt, practice nor later (and has no info reason): "' + s.text.en + '"');
    }
    console.log('instruction cards (' + rows.length + '):\n  ' + rows.join('\n  '));
    assert.ok(rows.length >= 55, 'the list should cover the tour, got ' + rows.length);
});

test('"later" cards say so in every language and name a motion to show', () => {
    const later = S.STEPS.filter(s => s.later);
    assert.ok(later.length >= 20);
    for (const s of later) {
        assert.ok(MOTIONS.includes(s.later), s.id + ': later must be one of ' + MOTIONS);
        for (const l of LANGS) assert.match(s.text[l], S.LATER_MARK[l], s.id + ' ' + l + ' must say it is for after the tour: ' + s.text[l]);
        assert.ok(!s.tryIt && !s.practice, s.id + ': later and try at once');
    }
    /* and nothing else claims "after the tour" (the words stay meaningful) */
    for (const s of S.STEPS.filter(x => !x.later)) for (const l of LANGS) assert.doesNotMatch(s.text[l], S.LATER_MARK[l], s.id + ' ' + l + ' says after the tour but is not a later card');
});

test('practice cards: a known gesture and a look-alike in every language, never the camera or mic for real', () => {
    const pr = S.STEPS.filter(s => s.practice);
    assert.ok(pr.length >= 10);
    for (const s of pr) {
        assert.ok(S.PRACTICE_HOW.includes(s.practice.how), s.id + ': practice.how ' + s.practice.how);
        assert.ok(!s.tryIt && !s.later, s.id + ': practice and try/later at once');
        assert.notStrictEqual(s.where, 'scan', s.id + ': never on the Scan tab (camera)');
        for (const l of LANGS) {
            const U = S.UI[l];
            assert.ok(U.looks && U.looks[s.practice.look], s.id + ' ' + l + ': no label for look ' + s.practice.look);
            assert.ok(U.how && U.how[s.practice.how], s.id + ' ' + l + ': no word for ' + s.practice.how);
            assert.ok(U.practice && U.laterTag, l + ': practice note / later tag');
            assert.ok(S.tryMatch(s.practice.how, s.practice.how === 'touch' ? 'tap' : s.practice.how));
        }
    }
    /* the gestures that would change data or ask for a permission are practice, not the real control */
    for (const id of ['water-hold', 'voice', 'send-energy', 'theme']) assert.ok(S.STEPS.find(s => s.id === id).practice, id + ' must be a practice card');
});

test('only the chat card switches to the chat (it opens straight into galaxy chat, item 36) and it points at the Chat tab', () => {
    for (const s of S.STEPS) if (s.id !== 'chat') assert.notStrictEqual(s.rm, 'chat', s.id);
    const chat = S.STEPS.find(s => s.id === 'chat');
    assert.ok(chat.later && /galaxy chat/i.test(chat.text.en) && !/room chip/i.test(chat.text.en));
    assert.ok(chat.target[0].includes('data-rm="chat"'));
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
test('energy-shot pad: one finger resting on the joystick, two quick taps with the other finger count as the double tap', () => {
    const st = S.STEPS.find(s => s.id === 'energy-shot');
    assert.equal(st.practice.how, 'double'); assert.equal(st.practice.joy, true, 'the pad shows a joystick to keep a finger on');
    const src = fs.readFileSync(path.join(__dirname, '..', 'tutorial.js'), 'utf8');
    const pw = src.slice(src.indexOf('function padWire('), src.indexOf("el.addEventListener('pointerup', up);"));
    assert.match(pw, /const P = new Map\(\); let D = new Map\(\)/, 'every finger tracked on its own');
    assert.match(pw, /P\.size >= 2 && pinchPad\(\)/, 'two fingers are a pinch only on a pinch pad');
    assert.doesNotMatch(pw, /if \(P\.size >= 2\) \{/, 'a second finger no longer always starts a pinch');
    assert.match(src, /k\.joy \? '<span class="lt-joy"/);
});
