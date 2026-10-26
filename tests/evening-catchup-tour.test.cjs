/* Evening catch-up (MAYA-HANDOFF 0.39): the mini-tour step that shows where it lives, with recorded voice in EN/DE/ES.
   Written before the step existed (fails on the WIP branch commit 05c9d3d8). */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const LANGS = ['en', 'de', 'es'];

test('tutorial: a new-evening-catchup card in part new, three languages, short, honest, never the app name or Misty', () => {
    const S = require(path.join(ROOT, 'tutorial-steps.js'));
    const st = S.STEPS.find(s => s.id === 'new-evening-catchup');
    assert.ok(st, 'the card exists');
    assert.strictEqual(st.area, 'new', 'step in part new (What\'s New), never the base tour');
    for (const l of LANGS) {
        assert.ok(st.title[l] && st.text[l], 'title and text in ' + l);
        assert.ok(st.text[l].length <= 160, l + ' text is short: ' + st.text[l].length);
        assert.ok(!/lowi\s*spike|misty/i.test(st.title[l] + ' ' + st.text[l]), 'no app name or Misty in ' + l);
        assert.ok(!/insulin/i.test(st.text[l]), 'no insulin claim in ' + l);
    }
    assert.ok(/Catch up on today/.test(st.text.en), 'English names the Settings row');
    assert.ok(/Heute nachtragen/.test(st.text.de), 'German names the Settings row');
    assert.ok(/Ponerme al d\u00eda/.test(st.text.es), 'Spanish names the Settings row');
});

test('tutorial: Settings row catchUp is covered by a tour card', () => {
    const S = require(path.join(ROOT, 'tutorial-steps.js'));
    assert.ok(S.covered().catchUp, 'catchUp covered');
    assert.ok(S.covered()['evening-catchup'], 'evening-catchup covered');
});

test('tutorial: the card is recorded in the approved tutorial voice in all three languages', () => {
    const V = require(path.join(ROOT, 'tutorial-voice.js'));
    const S = require(path.join(ROOT, 'tutorial-steps.js'));
    global.window = undefined;
    const data = require(path.join(ROOT, 'tutorial-voice-data.js'));
    const mine = V.plan(V.cards(S, null)).filter(c => c && c.key === 'new-evening-catchup');
    assert.deepStrictEqual(mine.map(c => c.lang).sort(), LANGS.slice().sort(), 'one clip planned per language');
    for (const c of mine) {
        const clip = ((data.clips || {})[c.lang] || {})[c.key];
        assert.ok(clip, 'a recorded clip for ' + c.key + ' (' + c.lang + ')');
        assert.strictEqual(clip.s, c.s, 'clip words match the card in ' + c.lang);
        assert.ok(!/lowi\s*spike/i.test(clip.s), 'the app name is never said out loud');
    }
});
