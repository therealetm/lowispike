/* app-voice: the tutorial's human voice everywhere the app talks (Oct 21 2026, Emmanuel: "use it everywhere"). */
'use strict';
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const V = require('../app-voice.js');

test('app voice: the same neural voice per language as the tutorial', () => {
    const T = require('../tutorial-voice.js');
    assert.deepStrictEqual(V.VOICES, T.VOICES);
});

test('app voice: text is cut into sentences the same way every time; ids depend on voice and words', () => {
    assert.deepStrictEqual(V.pieces('Rest. Next, Squats'), ['Rest.', 'Next, Squats']);
    assert.deepStrictEqual(V.pieces('Your pick: Eggs\n\n\u201cHi\u201d  there!'), ['Your pick:', 'Eggs', '"Hi" there!']);
    assert.deepStrictEqual(V.pieces('  . \n'), []);
    assert.deepStrictEqual(V.pieces('It costs 1.5 euros. Ok'), ['It costs 1.5 euros.', 'Ok']);
    assert.strictEqual(V.idOf('en', 'Rest.'), V.idOf('en', ' Rest. '));
    assert.notStrictEqual(V.idOf('en', 'Rest.'), V.idOf('de', 'Rest.'));
    assert.match(V.idOf('es', 'Hola.'), /^[0-9a-z]+$/);
});

test('app voice: every sentence the app says has a recorded clip (news only after a release records it)', () => {
    global.window = undefined;
    const data = require('../app-voice-data.js');
    const P = require('../tools/app-voice/phrases.cjs');
    const all = P.harvest(false), news = P.harvest(true);
    for (const s of ['mirror', 'guide', 'move', 'book', 'food', 'toast']) assert.ok(all.src[s] > 5, 'phrases found for ' + s);
    const missing = [];
    for (const l of Object.keys(all.out)) for (const p of all.out[l]) {
        if (news.out[l] && news.out[l].has(p)) continue;
        const id = V.idOf(l, p);
        if (!(data.clips[l] && data.clips[l][id] != null) || !fs.existsSync(path.join(ROOT, 'app-voice', l, id + '.mp3'))) missing.push(l + ': ' + p);
    }
    assert.deepStrictEqual(missing.slice(0, 15), [], missing.length + ' sentences have no clip; run python3 tools/app-voice/build.py');
    assert.deepStrictEqual(data.voices, V.VOICES, 'clips recorded with the current voices');
});

test('app voice: no robot voice where a recording exists (every device-voice path sits behind LowiVoice)', () => {
    const files = fs.readdirSync(ROOT).filter(f => /\.(js|html)$/.test(f) && !/^(app-voice|tutorial-voice)/.test(f));
    let sites = 0;
    for (const f of files) {
        const src = read(f); let i = -1;
        while ((i = src.indexOf('new SpeechSynthesisUtterance(', i + 1)) >= 0) {
            const before = src.slice(Math.max(0, i - 900), i);
            const isUnlock = /SpeechSynthesisUtterance\(""\)/.test(src.slice(i, i + 40));
            assert.ok(/LowiVoice/.test(before), f + ': the device voice at ' + src.slice(0, i).split('\n').length + ' must come after a LowiVoice path' + (isUnlock ? ' (unlock)' : ''));
            sites++;
        }
    }
    assert.ok(sites >= 5, 'found the old speaking spots (' + sites + ')');
    assert.match(read('mirror-move.js'), /W\.LowiVoice\.speak\(s, \{ lang: lang\(\), queue: !force, clipsOnly: true \}\)/);
});

test('app voice: loaded by the page, kept offline, recorded news at release', () => {
    const html = read('index.html'), sw = read('sw.js');
    assert.match(html, /<script src="app-voice\.js\?v=[0-9-]+"><\/script>/);
    const list = sw.match(/const STATIC = \[[^\]]*\]/)[0];
    assert.ok(list.includes('"app-voice.js"') && list.includes('"app-voice-data.js"'));
    assert.match(read('scripts/release.sh'), /tools\/app-voice\/build\.py --news/);
    assert.match(html, /split\(\/\\n\\s\*\\n\/\)\.slice\(0, 3\)/, 'the guide reads the newest 3 news paragraphs');
    assert.strictEqual(require('../tools/app-voice/phrases.cjs').NEWS_PARAS, 3);
});

test('app voice: clips stay a sensible size (the app fetches each clip only when it is said)', () => {
    let bytes = 0; const dir = path.join(ROOT, 'app-voice');
    for (const l of fs.readdirSync(dir)) for (const f of fs.readdirSync(path.join(dir, l))) bytes += fs.statSync(path.join(dir, l, f)).size;
    assert.ok(bytes < 30 * 1024 * 1024, (bytes / 1048576).toFixed(1) + ' MB');
});
