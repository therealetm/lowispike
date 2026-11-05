/* Nov 5 2026 feedback mic fix. Owner, on iPhone (Dark): tapped "Record a voice note" after adding 2 screenshots and got "The
   microphone is not available. Allow it in your phone settings" without iOS ever asking; LOWiSPIKE is not even listed under
   Privacy > Microphone. Cause: the feedback recorder never called LowiMicSession.begin(), so the audio session stayed 'ambient'
   (set by the app's sounds), which has no microphone input on iPhone WebKit, and every error was shown as "allow it in settings".
   Checks: the session is switched before getUserMedia, inside the tap; errors are told apart; formats fall back quietly. */
'use strict';
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../feedback-core.js');
const UI = read('feedback.js');

test('the recorder leaves the ambient audio session synchronously in the tap, before getUserMedia', () => {
    const start = UI.slice(UI.indexOf('async function startRec()'), UI.indexOf('function stopRec()'));
    assert.ok(start.length > 200, 'startRec found');
    const hold = start.indexOf('micHold()'), gum = start.indexOf('getMic()'), firstAwait = start.indexOf('await ');
    assert.ok(hold > 0 && gum > hold, 'LowiMicSession.begin() (micHold) comes before getUserMedia');
    assert.ok(firstAwait > hold, 'nothing is awaited before the session switch, so it runs inside the tap');
    assert.match(UI, /function micHold\(\) \{ const M = window\.LowiMicSession;[^\n]*M\.begin\(\)/);
    /* every path that gives the microphone back also ends the hold */
    assert.ok((start.match(/micRelease\(held\)/g) || []).length >= 4, 'failure paths release the session');
    assert.match(UI, /micRelease\(R\.held\); R\.held = false;/, 'finishRec releases it once');
    /* the mic-session script loads before feedback.js */
    const html = read('index.html');
    assert.ok(html.indexOf('src="mic-session.js') > 0 && html.indexOf('src="mic-session.js') < html.indexOf('src="feedback.js'), 'mic-session.js loads first');
});

test('only a real "no" says the microphone is off; nothing else blames phone settings', () => {
    assert.strictEqual(C.micError('NotAllowedError', 'denied', 1), 'denied');
    assert.strictEqual(C.micError('NotAllowedError', 'prompt', 1), 'ask', 'iOS refused without asking: tap again');
    assert.strictEqual(C.micError('NotAllowedError', 'prompt', 5), 'ask');
    assert.strictEqual(C.micError('NotAllowedError', 'granted', 1), 'ask');
    assert.strictEqual(C.micError('NotAllowedError', null, 1), 'ask', 'unknown permission: first refusal asks to tap again');
    assert.strictEqual(C.micError('NotAllowedError', null, 2), 'denied', 'unknown permission, refused twice from a tap: show where to switch it on');
    assert.strictEqual(C.micError('NotReadableError', 'granted', 1), 'busy');
    assert.strictEqual(C.micError('AbortError', null, 0), 'busy');
    assert.strictEqual(C.micError('NotFoundError', null, 0), 'none');
    assert.strictEqual(C.micError('NotSupportedError', null, 0), 'old');
    assert.strictEqual(C.micError('TypeError', null, 0), 'old');
    assert.strictEqual(C.micError('OverconstrainedError', null, 0), 'old');
    assert.strictEqual(C.micError('', null, 0), 'ask');
    assert.doesNotMatch(UI, /noMic/, 'the old catch-all line is gone');
    assert.doesNotMatch(UI, /Allow it in your phone settings/);
});

test('the denied help names the right place for each setup (web app on iPhone = Safari, not Privacy > Microphone)', () => {
    const ip = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
    assert.strictEqual(C.micSetup(ip, false, 5), 'iosWeb');
    assert.strictEqual(C.micSetup('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', false, 5), 'iosWeb', 'iPad asks for the desktop site');
    assert.strictEqual(C.micSetup('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', false, 0), 'web');
    assert.strictEqual(C.micSetup(ip, true, 5), 'iosApp');
    assert.strictEqual(C.micSetup('Mozilla/5.0 (Linux; Android 14) Chrome/130', false, 5), 'web');
    for (const s of [/micDeniedIosWeb: 'The microphone is off for LOWiSPIKE\. On your iPhone open Settings \\u203a Apps \\u203a Safari \\u203a Microphone/,
        /micDeniedIosWeb: 'Das Mikrofon ist f\\u00fcr LOWiSPIKE aus\. \\u00d6ffne am iPhone Einstellungen \\u203a Apps \\u203a Safari \\u203a Mikrofon/,
        /micDeniedIosWeb: 'El micr\\u00f3fono est\\u00e1 desactivado para LOWiSPIKE\. En el iPhone abre Ajustes \\u203a Apps \\u203a Safari \\u203a Micr\\u00f3fono/,
        /micDeniedIosApp: 'The microphone is off for LOWiSPIKE\. Open iPhone Settings \\u203a Apps \\u203a LOWiSPIKE/]) assert.match(UI, s);
    for (const k of ['micAsk', 'micStarting', 'micDeniedIosWeb', 'micDeniedIosApp', 'micDeniedWeb', 'micBusy', 'micNone', 'noRec'])
        assert.strictEqual((UI.match(new RegExp('\\b' + k + ': ', 'g')) || []).length, 3, k + ' in EN, DE and ES');
});

test('formats: audio/mp4 first, only what the browser supports, plain recorder last; uploads always use an allowed type', () => {
    const ios = C.recOptions(m => m === 'audio/mp4');
    assert.deepStrictEqual(ios[0], { mimeType: 'audio/mp4', audioBitsPerSecond: 64000 });
    assert.ok(ios.every(o => !o || !o.mimeType || o.mimeType === 'audio/mp4'), 'iPhone is never asked for webm');
    assert.strictEqual(ios[ios.length - 1], null, 'browser default is the last resort');
    const chrome = C.recOptions(m => /webm/.test(m));
    assert.strictEqual(chrome[0].mimeType, 'audio/webm;codecs=opus');
    const none = C.recOptions(null);
    assert.deepStrictEqual(none, [{ audioBitsPerSecond: 64000 }, null], 'no isTypeSupported: still records with the default');
    const throws = C.recOptions(() => { throw new Error('x'); });
    assert.deepStrictEqual(throws, [{ audioBitsPerSecond: 64000 }, null]);
    assert.strictEqual(C.voiceType('audio/mp4;codecs=mp4a.40.2'), 'audio/mp4');
    assert.strictEqual(C.voiceType('audio/x-m4a'), 'audio/mp4');
    assert.strictEqual(C.voiceType(''), 'audio/mp4');
    assert.strictEqual(C.voiceType('audio/webm;codecs=opus'), 'audio/webm');
    assert.strictEqual(C.voiceType('audio/ogg'), 'audio/ogg');
    assert.strictEqual(C.voiceType('audio/aac'), 'audio/aac');
    const sql = read('supabase/proposals/feedback_20261105.sql');
    for (const t of ['audio/mp4', 'audio/webm', 'audio/ogg', 'audio/aac']) assert.ok(sql.includes("'" + t + "'"), t + ' allowed by the bucket');
    assert.strictEqual(C.voicePath('k1234567', C.voiceType('audio/mp4;codecs=x')), 'fb/k1234567/voice.m4a');
});

test('the iPhone wrapper explains the microphone, feedback included', () => {
    const pl = read('ios/App/App/Info.plist');
    assert.match(pl, /<key>NSMicrophoneUsageDescription<\/key>\s*<string>[^<]*Send feedback[^<]*<\/string>/);
});
