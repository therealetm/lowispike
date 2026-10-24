/* Gap "After your meal" cards: a speaker reads the card aloud in the tutorial's voice, and the card opens on the glowing phase
   (Oct 24 2026, Emmanuel ~18:55: "add a speech selection there ... just click on the speaker. Same voice as the tutorial girl";
   his 18:52 screenshot: the 2 h phase glowed, the card showed phase 1 "Zucker steigt"). Browser check: tools/check-gap-meal-speaker.cjs */
'use strict';
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
global.window = undefined;
const G = require('../gap-view.js');
const V = require('../app-voice.js');
const LANGS = ['en', 'de', 'es'];

test('meal speaker: each phase reads title, time, both lines and every Spike-senken lever, in plain spoken words', () => {
    assert.strictEqual(G.phases.length, 5);
    for (const l of LANGS) {
        const k = LANGS.indexOf(l), lever = G.strings[l].mcLever;
        G.phases.forEach((p, i) => {
            const said = G.mcSpoken(i, l), lines = said.split('\n');
            assert.ok(said.length > 40, l + i);
            assert.ok(lines[0].startsWith(p.n[k]), 'title first ' + l + i);
            assert.ok(said.includes(lever), 'lever heading ' + l + i);
            for (const x of p.l[k]) assert.ok(said.includes(x.replace(/<\/?b>/g, '').slice(0, 6)), 'lever ' + l + i + ': ' + x);
            assert.strictEqual(lines.length, 4 + p.l[k].length, l + i);
            assert.doesNotMatch(said, /<\/?b>|\u2013|\bMin\.|\bStd\./, 'no markup, dashes or abbreviations ' + l + i);
            lines.forEach(x => assert.match(x, /[.!?:]$/, 'each line ends a sentence ' + l + i));
        });
    }
    assert.match(G.mcSpoken(1, 'de'), /Minuten/);
    assert.match(G.mcSpoken(1, 'en'), / to /);
});

test('meal speaker: every sentence it says has a clip in the tutorial voice, so the device voice is never needed', () => {
    const data = require('../app-voice-data.js');
    const T = require('../tutorial-voice.js');
    assert.deepStrictEqual(V.VOICES, T.VOICES, 'same voice as the tutorial');
    const missing = [];
    for (const l of LANGS) G.phases.forEach((p, i) => V.pieces(G.mcSpoken(i, l)).forEach(x => {
        const id = V.idOf(l, x);
        if (!(data.clips[l] && data.clips[l][id]) || !fs.existsSync(path.join(ROOT, 'app-voice', l, id + '.mp3'))) missing.push(l + ': ' + x);
    }));
    assert.deepStrictEqual(missing, []);
    const P = require('../tools/app-voice/phrases.cjs');
    assert.ok(P.harvest(false).src.gap >= 60, 'the clip recorder harvests the Gap cards');
});

test('meal speaker: only the recorded voice, the tutorial speed pill, and it stops on tap, phase change and close', () => {
    const g = read('gap-view.js'), v = read('app-voice.js'), tv = read('tutorial-voice.js');
    assert.match(g, /data-gv="mcsay"/);
    assert.match(g, /k === 'mcsay'/);
    assert.match(g, /onlyClips: true/);
    assert.match(v, /if \(h\.o\.onlyClips\) \{[^}]*continue; \}/, 'onlyClips skips a missing clip instead of the device voice');
    const key = (tv.match(/RATE_KEY:\s*'([^']+)'/) || [])[1];
    assert.ok(key && g.includes("RATE_KEY = '" + key + "'"), 'shares the tutorial speed setting');
    assert.match(g, /RATES = \[1, 1\.5, 2\]/);
    assert.match(g, /LowiVoice\.setRate\(n\)/, 'speed changes the voice that is reading');
    assert.match(g, /function sayToggle\(i\) \{ if \(say && say\.i === i\) sayStop\(\)/, 'second tap stops');
    assert.match(g, /if \(say && say\.i !== mcSel\) sayStop\(\)/, 'another phase stops it');
    assert.match(g, /function close\(quick\) \{[\s\S]{0,80}if \(say\) sayStop\(\)/, 'closing Gap stops it');
    for (const l of LANGS) for (const k of ['mcSay', 'mcStop', 'mcRate']) assert.ok(G.strings[l][k], l + ' ' + k);
    assert.match(read('gap-view.css'), /\.mc-spk/);
});

test('meal card opens on the glowing phase; a pick from an earlier phase does not stick', () => {
    assert.strictEqual(G.selFor(-1, -1, 3), 3, 'nothing picked: the phase you are in');
    assert.strictEqual(G.selFor(-1, -1, -1), 0, 'no meal yet: first card');
    assert.strictEqual(G.selFor(0, 3, 3), 0, 'picked in this phase: stays');
    assert.strictEqual(G.selFor(0, 0, 3), 3, 'picked back when phase 1 glowed: the clock has moved on, back to the glowing phase');
    assert.strictEqual(G.curvePhase(161), 3, '18:52 after a 16:11 meal is the 2 h phase');
    const g = read('gap-view.js');
    assert.match(g, /function onFresh\(\) \{ if \(!el\) return; mcSel = -1; paint\(\); \}/);
    assert.match(g, /addEventListener\('lowi:fast-start', onFresh\)/, 'new meal time resets the pick');
    assert.match(g, /addEventListener\('visibilitychange', onVis\)/, 'coming back to the app resets the pick');
    assert.match(g, /Date\.now\(\) - openedAt < 450/, 'the tap that opened Gap does not land on the phase row');
});
