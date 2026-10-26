'use strict';
/* Oct 26, 2026 mic dictation (Emmanuel: "So, I can click on a microphone and then I can just speak and it writes it ... basically
   everywhere where you're supposed to type, minimally."). Pins the pure core (which fields, which engine, merging words, WAV, words in
   EN/DE/ES), the voice-text function's guard rails, and that the app loads the shared component once (not per screen). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../mic-dictate-core.js');

test('free-text fields get a mic, logins, numbers, codes and tiny fields do not', () => {
    const base = { tag: 'input', type: 'text', width: 300 };
    assert.equal(C.eligible(base), true);
    assert.equal(C.eligible({ tag: 'textarea', width: 300 }), true);
    assert.equal(C.eligible({ ...base, type: 'search' }), true);
    assert.equal(C.eligible({ ...base, type: '' }), true);
    for (const type of ['email', 'password', 'number', 'date', 'tel', 'url', 'file', 'checkbox', 'range', 'time']) {
        assert.equal(C.eligible({ ...base, type }), false, type);
    }
    assert.equal(C.eligible({ ...base, inputmode: 'numeric' }), false);
    assert.equal(C.eligible({ ...base, inputmode: 'decimal' }), false);
    assert.equal(C.eligible({ ...base, autocomplete: 'one-time-code' }), false);
    assert.equal(C.eligible({ ...base, autocomplete: 'email' }), false);
    assert.equal(C.eligible({ ...base, maxlength: 6 }), false, 'codes');
    assert.equal(C.eligible({ ...base, maxlength: 40 }), true);
    assert.equal(C.eligible({ ...base, width: 90 }), false, 'too narrow for a mic');
    assert.equal(C.eligible({ ...base, readonly: true }), false);
    assert.equal(C.eligible({ ...base, disabled: true }), false);
    assert.equal(C.eligible({ ...base, mic: 'off' }), false, 'opt out');
    assert.equal(C.eligible({ ...base, width: 90, mic: '' }), true, 'data-mic forces it on');
    assert.equal(C.eligible({ ...base, type: 'email', mic: '' }), false, 'never on an email field');
    assert.equal(C.eligible({ tag: 'div' }), false);
});

test('engine: only the device\'s own speech recognition; iPhone Home Screen app falls back to the keyboard mic; never cloud', () => {
    assert.equal(C.chooseEngine({ secure: true, hasNativeSR: true }), 'native');
    assert.equal(C.chooseEngine({ secure: true, hasNativeSR: true, appleTouch: true }), 'native', 'Safari tab on iPhone: Apple dictation');
    assert.equal(C.chooseEngine({ secure: true, hasNativeSR: true, nativeBroken: true, appleTouch: true }), 'keyboard', 'Home Screen app: service-not-allowed');
    assert.equal(C.chooseEngine({ secure: true, hasNativeSR: false, appleTouch: true }), 'keyboard');
    assert.equal(C.chooseEngine({ secure: true, hasNativeSR: false, appleTouch: false }), 'none', 'Firefox desktop: no mic, not a broken one');
    assert.equal(C.chooseEngine({ secure: true, hasNativeSR: true, nativeBroken: true }), 'none');
    assert.equal(C.chooseEngine({ secure: false, hasNativeSR: true, appleTouch: true }), 'none', 'mics need https');
    const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
    const ipad = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
    const android = 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36';
    assert.equal(C.isAppleTouch(iphone, 5), true);
    assert.equal(C.isAppleTouch(ipad, 5), true, 'iPad posing as a Mac');
    assert.equal(C.isAppleTouch(ipad, 0), false, 'a real Mac has no dictation key on screen');
    assert.equal(C.isAppleTouch(android, 5), false);
    assert.equal(C.errorAction('service-not-allowed', true), 'keyboard');
    assert.equal(C.errorAction('service-not-allowed', false), 'failed');
    assert.equal(C.errorAction('not-allowed', true), 'denied');
    assert.equal(C.errorAction('no-speech', true), 'nothing');
    assert.equal(C.errorAction('aborted', true), '');
    assert.equal(C.errorAction('network', false, false), 'offline');
});

test('recognition follows the app language', () => {
    assert.equal(C.langTag('de'), 'de-DE');
    assert.equal(C.langTag('es'), 'es-ES');
    assert.equal(C.langTag('en'), 'en-US');
    assert.equal(C.langTag('fr'), 'en-US');
    assert.equal(C.lang2('DE'), 'de');
});

test('spoken words go where the caret is, with spaces only where words would touch', () => {
    assert.deepEqual(C.merge('', '2 eggs', 0, 0), { value: '2 eggs', caret: 6 });
    assert.deepEqual(C.merge('Toast', 'with butter', 5, 5), { value: 'Toast with butter', caret: 17 });
    assert.deepEqual(C.merge('Toast ', 'with butter', 6, 6), { value: 'Toast with butter', caret: 17 });
    assert.equal(C.merge('Toast butter', 'and', 5, 5).value, 'Toast and butter');
    assert.equal(C.merge('Toast butter', 'jam', 6, 12).value, 'Toast jam', 'replaces the selection');
    assert.equal(C.merge('Skyr', '', 4, 4).value, 'Skyr');
    assert.equal(C.merge('Skyr', 'with honey', null, null).value, 'Skyr with honey', 'no caret = append');
    assert.equal(C.merge('abcdefgh', 'longer words', 8, 8, 12).value, 'abcdefgh lon', 'respects maxlength');
    assert.equal(C.merge('abcdefghijkl', 'more', 12, 12, 12).value, 'abcdefghijkl', 'full field stays as it is');
    assert.equal(C.tidy('Two eggs and toast.', false), 'Two eggs and toast', 'no full stop in a short field');
    assert.equal(C.tidy('Loved it.', true), 'Loved it.', 'textareas keep punctuation');
});

test('every word exists in English, German and Spanish', () => {
    const keys = Object.keys(C.WORDS.en);
    for (const l of ['de', 'es']) {
        assert.deepEqual(Object.keys(C.WORDS[l]).sort(), keys.slice().sort(), l);
        for (const k of keys) assert.notEqual(C.WORDS[l][k], C.WORDS.en[k], l + ' ' + k + ' is translated');
    }
    assert.equal(C.t('de', 'speak'), 'Sprechen statt tippen');
    assert.equal(C.t('fr', 'speak'), 'Speak to type');
});

test('no cloud speech-to-text (it costs per use): no audio upload, no transcription function', () => {
    const js = read('mic-dictate.js') + read('mic-dictate-core.js');
    assert.doesNotMatch(js, /getUserMedia|MediaRecorder|createScriptProcessor|functions\/v1|fetch\(/);
    assert.ok(!fs.existsSync(path.join(root, 'supabase/functions/voice-text')));
});

test('the app loads ONE shared mic component and opts fields in or out with data-mic', () => {
    const html = read('index.html');
    assert.match(html, /<script[^>]+src="mic-dictate-core\.js[^"]*"/);
    assert.match(html, /<script[^>]+src="mic-dictate\.js[^"]*"/);
    assert.match(html, /<link[^>]+href="mic-dictate\.css[^"]*"/);
    const js = read('mic-dictate.js');
    assert.match(js, /MutationObserver/, 'fields rendered later get their mic too');
    assert.match(js, /data-mic/);
    assert.match(js, /SpeechRecognition/);
    assert.match(js, /C\.chooseEngine\(env\(\)\)/, 'engine decided by the tested core');
    assert.doesNotMatch(js, /getUserMedia\([^)]*\)[^;]*;\s*\/\/ ?boot/i);
    // no screen has its own copy of the mic
    for (const f of fs.readdirSync(root).filter(f => /\.js$/.test(f) && !/^mic-dictate/.test(f) && f !== 'sw.js')) {
        assert.doesNotMatch(read(f), /webkitSpeechRecognition/, f + ' has its own speech recognition');
    }
    const sw = read('sw.js');
    assert.match(sw, /mic-dictate\.js/);
    assert.match(sw, /mic-dictate-core\.js/);
    assert.match(sw, /mic-dictate\.css/);
});

test('mic only listens after a tap: recognition starts only inside start()', () => {
    const js = read('mic-dictate.js');
    const boot = js.slice(0, js.indexOf('function start('));
    assert.doesNotMatch(boot, /\.start\(\)/, 'nothing listens at start-up');
    assert.match(js, /addEventListener\('click'/);
    assert.match(js, /useKeyboard/, 'iPhone Home Screen app: keyboard dictation fallback');
    assert.match(js, /localStorage\.setItem\(OFF_KEY/, 'learns that in-page recognition is missing here');
});

test('Community chat: the voice-message mic stays; dictation sits inside the text box with its own icon and label', () => {
    const js = read('mic-dictate.js');
    assert.match(js, /#cmInput/, 'chat composer opted in from the shared component, community-chat.js untouched');
    assert.match(js, /ICON_DICTATE/);
    assert.match(js, /'chat'/);
    assert.match(read('community-chat.js'), /getElementById\('cmMic'\)/, 'voice-message mic still there');
});
