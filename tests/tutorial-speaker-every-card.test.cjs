'use strict';
// Oct 26 2026 (Emmanuel, 5:30 AM, screenshot of "New · 2 of 2 — Give a hand" with no speaker: "there's one part of the tutorial
// doesn't have a speaker. Why is that removed? I hope you haven't removed it from the tutorial itself."). Nothing was removed: the
// step and its clips were there. The speaker is added by tutorial-voice.js, which tutorial.js loads on its own after the page; a card
// that was already on screen when that file arrived (or when it failed to load on a slow morning connection) never got its speaker.
// Now the card on screen gets it the moment the voice arrives, a failed load is tried again, and the service worker keeps the
// tutorial files on the phone with the build. And every step has its recorded voice in EN/DE/ES.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const S = require('../tutorial-steps.js');
const V = require('../tutorial-voice-data.js');

test('every tutorial and What\'s New step has a recorded voice in English, German and Spanish, and the file is there', () => {
    assert(S.STEPS.length > 20);
    const missing = [];
    for (const s of S.STEPS) for (const l of ['en', 'de', 'es']) {
        const c = V.clips[l] && V.clips[l][s.id];
        if (!c) { missing.push(l + ':' + s.id); continue; }
        const f = path.join(root, V.DIR || 'tutorial-voice', l, (c.f || (s.id + '.mp3')));
        if (c.f && !fs.existsSync(f)) missing.push(l + ':' + s.id + ' (file)');
    }
    assert.deepEqual(missing, []);
    for (const id of ['new-give-hand', 'new-meal-speaker', 'new-intro']) /* new-kitchen left Oct 28 2026 with the Kitchen game */ assert(S.STEPS.some(s => s.id === id), id + ' is still in the tutorial');
});

test('the card on screen gets its speaker as soon as the voice file arrives, and a failed load is tried again', () => {
    const t = read('tutorial.js');
    const load = t.slice(t.indexOf("script[src^=\"tutorial-voice.js\"]") - 200, t.indexOf("script[src^=\"tutorial-voice.js\"]") + 900);
    assert(/onload/.test(load), 'tutorial.js listens for the voice file');
    assert(/voicePaint\(\)/.test(load), 'and paints the speaker on the card that is showing');
    assert(/onerror/.test(load) && /retry|again/i.test(load), 'a failed load is tried again');
    assert(/function voicePaint\(\)[\s\S]{0,600}LowiTutorialVoice\.render\(card, s,/.test(t), 'voicePaint hands the current card to the voice');
    assert(/voicePaint\(\);/.test(t.slice(t.indexOf('function render()'), t.indexOf('function render()') + 4000)), 'every render uses the same painter');
});

test('the service worker keeps every tutorial file of the build on the phone', () => {
    const sw = read('sw.js');
    for (const f of ['tutorial-voice.js', 'tutorial-voice.css', 'tutorial-voice-data.js', 'tutorial-show.js', 'tutorial-auto.js', 'tutorial-resume.js']) {
        assert(new RegExp('STATIC\\.push\\([^)]*"' + f.replace(/\./g, '\\.') + '"').test(sw), f + ' is precached');
        assert(fs.existsSync(path.join(root, f)), f + ' exists');
    }
});

test('the speaker sits on every card: the last card (no Skip all) still gets the side column with the speaker', () => {
    const v = read('tutorial-voice.js');
    const sp = v.slice(v.indexOf('function speaker(el)'), v.indexOf('function speaker(el)') + 700);
    assert(/side\.appendChild\(b\)/.test(sp) && /top\.appendChild\(side\)/.test(sp), 'speaker goes in even without Skip all');
    assert(!/display:\s*none/.test(read('tutorial-voice.css').split('\n').filter(l => /lt-speak|lt-side/.test(l)).join('\n')), 'no rule hides it');
});
