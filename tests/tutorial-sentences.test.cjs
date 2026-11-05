'use strict';
/* tests/tutorial-sentences.test.cjs (Nov 5 2026). Owner, after listening to the new tour: "it's reading what is written. But sometimes
   it wrote things that isn't really a sentence ... it has to be written in a way where when the AI reads it out loud, it sounds like
   sentences are built. So it doesn't sound so brüchig ... als würden da Wörter fehlen." Every card the voice reads (title when it is
   said, then the text, in EN / DE / ES) is whole spoken sentences: no colon lists, no label fragments, no symbols the voice skips or
   reads oddly, and every clip on disk is the text as it is now. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const S = require('../tutorial-steps.js');
const V = require('../tutorial-voice.js');
const D = require('../tutorial-voice-data.js');
const LANGS = ['en', 'de', 'es'];
const sentences = s => s.replace(/([.!?])\s+/g, '$1\n').split('\n').map(x => x.trim()).filter(Boolean);
const words = s => s.split(/\s+/).filter(w => /[\p{L}\d]/u.test(w));

test('every card the voice reads is whole sentences, with nothing the voice skips or reads oddly', () => {
    for (const st of S.STEPS) for (const l of LANGS) {
        const t = st.text[l], who = st.id + '/' + l + ': ';
        assert.ok(/[.!?]$/.test(t), who + 'the text ends like a sentence: ' + t);
        assert.ok(!/[:;·•|/\\→←↑↓=+&×≈€$%#*_()\[\]{}<>…–—]/.test(t), who + 'no colon lists, symbols, brackets or dashes: ' + t);
        assert.ok(!/\p{Extended_Pictographic}/u.test(t), who + 'no emoji: ' + t);
        assert.ok(!/\b(e\.g|i\.e|z\.\s?B|usw|etc|bzw|p\.\s?ej)\b/i.test(t), who + 'no abbreviations: ' + t);
        assert.ok(!/\s{2,}|\s[,.!?]|,[^\s]/.test(t), who + 'clean spacing and commas: ' + t);
        for (const s of sentences(t)) {
            assert.ok(words(s).length >= 3 || /\?$/.test(s), who + 'a whole sentence, not a fragment: "' + s + '"');
            assert.ok(words(s).length <= 30, who + 'a sentence a person can say in one breath: "' + s + '"');
        }
        const sp = V.spoken(st, l, 'Misty');
        if (sp.t >= 0) assert.ok(!/[:·/&+]/.test(sp.s.slice(0, sp.t)), who + 'a title that is said has no symbols: ' + sp.s.slice(0, sp.t));
    }
});

test('a title is only said when it reads as its own phrase (a greeting or a sentence), never as a bare label', () => {
    const said = new Set();
    for (const st of S.STEPS) for (const l of LANGS) if (V.spoken(st, l, 'Misty').t >= 0) said.add(st.id);
    for (const id of said) assert.ok(['claim', 'hello', 'new-move-finish', 'done'].includes(id), id + ': its title would be read as a bare label');
});

test('every spoken card has its clip, recorded from the text as it is now', () => {
    const ver = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf8'));
    const plan = V.plan(V.cards(S, ver.news));
    for (const it of plan) {
        const c = V.clipFor ? V.clipFor(D, it.lang, it.key) : null;
        const rec = c || (D.clips && D.clips[it.lang] && D.clips[it.lang][it.key]) || (D[it.lang] && D[it.lang][it.key]);
        assert.ok(rec, it.lang + ' ' + it.key + ': has a clip');
        if (rec.s !== undefined) assert.strictEqual(rec.s, it.s, it.lang + ' ' + it.key + ': the clip says the current text');
    }
});
