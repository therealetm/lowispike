'use strict';
/* The tutorial reads itself aloud (tutorial-voice.js, TUTORIAL.md "Voice"). Every card in every language has a recorded clip whose
   words are exactly the card's words; when a card's words change, run: python3 tools/tutorial-voice/build.py */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const V = require('../tutorial-voice.js'), S = require('../tutorial-steps.js'), DATA = require('../tutorial-voice-data.js');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const FIX = 'run: python3 tools/tutorial-voice/build.py (records only the changed cards) and commit tutorial-voice-data.js + tutorial-voice/';

test('every card in every language has a clip with exactly its words', () => {
    const plan = V.plan(V.cards(S, require('../version.json').news));   /* the steps + the current What's New card */
    assert.ok(plan.length >= S.STEPS.length * 3);
    for (const p of plan) {
        const c = DATA.clips[p.lang] && DATA.clips[p.lang][p.key];
        assert.ok(c, `no voice clip for ${p.lang} "${p.key}": ${FIX}`);
        assert.strictEqual(c.s, p.s, `voice clip for ${p.lang} "${p.key}" says other words than the card: ${FIX}`);
        assert.ok(fs.existsSync(path.join(ROOT, V.DIR, p.lang, c.f)), `missing file ${V.DIR}${p.lang}/${c.f}: ${FIX}`);
    }
});

test('word timings line up with the words, so the highlight follows the voice', () => {
    for (const l of Object.keys(DATA.clips)) for (const [k, c] of Object.entries(DATA.clips[l])) {
        const n = (c.s.match(/\S+/g) || []).length;
        assert.ok(c.w.length >= Math.floor(n * 0.6), `${l} ${k}: only ${c.w.length} timed words of ${n}`);
        let t = -1, a = -1;
        for (const [ms, s, e] of c.w) {
            assert.ok(ms >= t && s >= a && e > s && e <= c.s.length, `${l} ${k}: timings out of order`);
            t = ms; a = s;
        }
        assert.ok(c.d > 0 && c.d >= t, `${l} ${k}: length`);
    }
});

test('natural neural voices, one per language, and no clips nobody uses', () => {
    assert.deepStrictEqual(Object.keys(V.VOICES).sort(), ['de', 'en', 'es']);
    for (const v of Object.values(V.VOICES)) assert.match(v, /Neural$/);
    assert.deepStrictEqual(DATA.voices, V.VOICES, FIX);
    const used = new Set(); for (const l of Object.keys(DATA.clips)) for (const c of Object.values(DATA.clips[l])) used.add(l + '/' + c.f);
    let bytes = 0;
    for (const l of fs.readdirSync(path.join(ROOT, V.DIR))) for (const f of fs.readdirSync(path.join(ROOT, V.DIR, l))) {
        assert.ok(used.has(l + '/' + f), `unused clip ${l}/${f}: ${FIX}`);
        bytes += fs.statSync(path.join(ROOT, V.DIR, l, f)).size;
    }
    /* repo-size guard only: clips are fetched one at a time when played, never precached. Raised 14 -> 16 MB on Oct 21 2026 when the
       71st card (Community tab order) pushed the set to 14.2 MB. */
    assert.ok(bytes < 16e6, 'clips over 16 MB: ' + bytes);
});

test('what is said: title then text; a renamed companion is not called Misty', () => {
    const hello = S.STEPS.find(s => /\{name\}/.test(s.title.en));
    if (hello) {
        const a = V.spoken(hello, 'en', 'Misty'), b = V.spoken(hello, 'en', 'Nova');
        assert.ok(a.s.startsWith(a.s.slice(0, a.t)) && a.s.includes('Misty'));
        assert.strictEqual(b.key, hello.id + '~'); assert.ok(!/Misty|Nova/.test(b.s.slice(0, 20)) || b.t === -1);
        assert.strictEqual(b.s, S.fill(hello.text.en, { name: 'Nova' }));
    }
    /* Oct 22 2026: the title is only said when it adds something (tests/tutorial-handsfree.test.cjs); "hello" does in every language */
    const st = S.STEPS.find(x => x.id === 'hello'), sp = V.spoken(st, 'de', 'Misty');
    assert.strictEqual(sp.s.slice(sp.b), S.fill(st.text.de, { name: 'Misty' }));
    assert.strictEqual(sp.s.slice(0, sp.t), S.fill(st.title.de, { name: 'Misty' }).trim());
});

test('tutorial.js hands every card to the voice and silences it when the tour stops or hides', () => {
    const t = read('tutorial.js');
    assert.match(t, /place\(\);\s*\n\s*\/\*[^\n]*\*\/\s*\n\s*try \{ if \(W\.LowiTutorialVoice\) W\.LowiTutorialVoice\.render\(card, s,/);
    assert.match(t, /function hold\(why\) \{[^\n]*LowiTutorialVoice\.stop\(\)/);
    assert.match(t, /tutorial-voice\.js\?v=/);
    const v = read('tutorial-voice.js');
    assert.match(v, /lowi:tutorial[^\n]*if \(!d\.on\) halt\(\)/, 'stop/skip/close silences the voice');
    assert.match(v, /visibilitychange[^\n]*halt\(\)/, 'app to the background silences the voice');
    assert.match(v, /'lowi\.tutorial\.voice\.v1'/, 'the choice is remembered');
    assert.match(v, /lowi:media/, 'world sound pauses while the voice talks');
    for (const l of ['en', 'de', 'es']) assert.match(v, new RegExp(l + ": \\{ on: '[^']+', off: '[^']+' \\}"), 'speaker label ' + l);
    assert.doesNotMatch(v.replace(/\/\*[\s\S]*?\*\//g, ''), /speechSynthesis|SpeechSynthesisUtterance/, 'never the device voice (Oct 24 2026)');
    const css = read('tutorial-voice.css');
    assert.match(css, /\.lt-w\.lt-say \{/); assert.doesNotMatch(css.match(/\.lt-w\.lt-say \{[^}]*\}/)[0], /padding|font-size|margin/, 'highlight must not move text');
});
