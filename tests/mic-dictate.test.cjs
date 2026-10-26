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

test('engine: iPhone and Safari record + voice-text, Chrome uses its own recognition, nothing works = no mic', () => {
    const ok = { secure: true, hasGetUserMedia: true, hasMediaRecorder: true, hasAudioContext: true, serverReady: true };
    assert.equal(C.chooseEngine({ ...ok, hasNativeSR: true, appleWebKit: true }), 'server', 'Home Screen app on iPhone has no working SpeechRecognition');
    assert.equal(C.chooseEngine({ ...ok, hasNativeSR: false, appleWebKit: true }), 'server');
    assert.equal(C.chooseEngine({ ...ok, hasNativeSR: true, appleWebKit: false }), 'native');
    assert.equal(C.chooseEngine({ ...ok, hasNativeSR: false, appleWebKit: false }), 'server', 'Firefox');
    assert.equal(C.chooseEngine({ ...ok, serverReady: false, appleWebKit: true }), 'none', 'function not deployed = hide the mic');
    assert.equal(C.chooseEngine({ ...ok, hasMediaRecorder: false, appleWebKit: true }), 'none');
    assert.equal(C.chooseEngine({ ...ok, secure: false }), 'none', 'mics need https');
    const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
    const crios = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0 Mobile/15E148 Safari/604.1';
    const ipad = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
    const chrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
    const android = 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36';
    assert.equal(C.isAppleWebKit(iphone, 5), true);
    assert.equal(C.isAppleWebKit(crios, 5), true, 'Chrome on iPhone is WebKit too');
    assert.equal(C.isAppleWebKit(ipad, 5), true, 'iPad posing as a Mac');
    assert.equal(C.isAppleWebKit(ipad, 0, 'Apple Computer, Inc.'), true, 'desktop Safari');
    assert.equal(C.isAppleWebKit(chrome, 0, 'Google Inc.'), false);
    assert.equal(C.isAppleWebKit(android, 5, 'Google Inc.'), false);
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

test('WAV encoder writes a valid 16 kHz mono 16-bit file that voice-text accepts', () => {
    const samples = new Float32Array(16000).map((_, i) => Math.sin(i / 10) * 0.5);
    const wav = C.encodeWav(samples, 16000);
    const b = Buffer.from(wav);
    assert.equal(b.toString('ascii', 0, 4), 'RIFF');
    assert.equal(b.toString('ascii', 8, 12), 'WAVE');
    assert.equal(b.readUInt16LE(22), 1, 'mono');
    assert.equal(b.readUInt32LE(24), 16000);
    assert.equal(b.readUInt16LE(34), 16);
    assert.equal(b.readUInt32LE(40), 32000);
    assert.equal(b.length, 44 + 32000);
    assert.ok(C.toBase64(wav).startsWith('UklGR'), 'base64 starts like the function checks');
    const mono = C.downmix([new Float32Array(48000).fill(0.2), new Float32Array(48000).fill(0.4)], 48000, 16000);
    assert.equal(mono.length, 16000);
    assert.ok(Math.abs(mono[100] - 0.3) < 1e-6);
    // 30 s at 16 kHz stays under the function's 1.4 MB limit
    const big = C.toBase64(C.encodeWav(new Float32Array(16000 * 30), 16000));
    assert.ok(big.length < 1400000, String(big.length));
});

test('silence stops listening: after speech ends, when nobody speaks, and at 30 s', () => {
    let g = C.silenceGate();
    assert.equal(g(0.2, 0), null);
    assert.equal(g(0.2, 1000), null);
    assert.equal(g(0.0, 2000), null);
    assert.equal(g(0.0, 2700), 'done');
    g = C.silenceGate();
    assert.equal(g(0, 0), null);
    assert.equal(g(0, 8000), 'quiet');
    g = C.silenceGate();
    for (let ms = 0; ms < 30000; ms += 500) assert.equal(g(0.3, ms), null);
    assert.equal(g(0.3, 30000), 'max');
});

test('every word exists in English, German and Spanish', () => {
    const keys = Object.keys(C.WORDS.en);
    for (const l of ['de', 'es']) {
        assert.deepEqual(Object.keys(C.WORDS[l]).sort(), keys.slice().sort(), l);
        for (const k of keys) assert.notEqual(C.WORDS[l][k], C.WORDS.en[k], l + ' ' + k + ' is translated');
    }
    assert.equal(C.t('de', 'speak'), 'Sprechen statt tippen');
    assert.equal(C.t('fr', 'speak'), 'Speak to type');
    assert.equal(C.errorKey(401), 'signin');
    assert.equal(C.errorKey(429), 'busy');
    assert.equal(C.errorKey(0), 'offline');
    assert.equal(C.errorKey(502), 'failed');
});

test('voice-text function: sign-in, app origin, size limit and key only from secrets', () => {
    const src = read('supabase/functions/voice-text/index.ts');
    assert.match(src, /Deno\.env\.get\("GEMINI_API_KEY"\)/);
    assert.doesNotMatch(src, /AIza[0-9A-Za-z_-]{20,}/, 'no key in the repo');
    assert.match(src, /error: "sign_in"/);
    assert.match(src, /error: "origin"/);
    assert.match(src, /MAX_B64 = 1_400_000/);
    assert.match(src, /startsWith\("UklGR"\)/, 'only WAV from our recorder');
    assert.match(src, /mime_type: "audio\/wav"/);
    assert.doesNotMatch(src, /console\.(log|error)\([^)]*,\s*(audio|text|body|raw)\b/, 'never logs audio or words');
});

test('the app loads ONE shared mic component and opts fields in or out with data-mic', () => {
    const html = read('index.html');
    assert.match(html, /<script[^>]+src="mic-dictate-core\.js[^"]*"/);
    assert.match(html, /<script[^>]+src="mic-dictate\.js[^"]*"/);
    assert.match(html, /<link[^>]+href="mic-dictate\.css[^"]*"/);
    const js = read('mic-dictate.js');
    assert.match(js, /MutationObserver/, 'fields rendered later get their mic too');
    assert.match(js, /data-mic/);
    assert.match(js, /voice-text/);
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

test('mic only listens after a tap: no microphone request at start-up', () => {
    const js = read('mic-dictate.js');
    const boot = js.slice(0, js.indexOf('function start('));
    assert.doesNotMatch(boot, /getUserMedia\(/, 'getUserMedia only inside start()');
    assert.match(js, /addEventListener\('click'/);
});

test('Community chat: the voice-message mic stays; dictation sits inside the text box with its own icon and label', () => {
    const js = read('mic-dictate.js');
    assert.match(js, /#cmInput/, 'chat composer opted in from the shared component, community-chat.js untouched');
    assert.match(js, /ICON_DICTATE/);
    assert.match(js, /'chat'/);
    assert.match(read('community-chat.js'), /getElementById\('cmMic'\)/, 'voice-message mic still there');
});
