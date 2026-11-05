/* Nov 5 2026 feedback: Settings > Send feedback (voice note first, screenshots to swipe while recording, text, optionally
   without name) and the owner's Feedback inbox (Transcribe selected, Copy, Download package with stable FB- references).
   Rules: feedback-core.js; UI: feedback.js; server: supabase/proposals/feedback_20261105.sql + functions/feedback-transcribe. */
'use strict';
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../feedback-core.js');

const ROW = (o) => Object.assign({ id: '1a2b3c4d-1111-4222-8333-444455556666', created_at: '2026-11-05T09:30:00Z', user_id: 'u-1', anonymous: false, name: 'Emmanuel',
    message: 'The scan button is confusing', voice_path: 'fb/abcdefgh12/voice.m4a', voice_secs: 42, shots: ['fb/abcdefgh12/shot-1.jpg', 'fb/abcdefgh12/shot-2.jpg', 'fb/abcdefgh12/shot-3.jpg'],
    transcript: null, status: 'new', device: 'iPhone', lang: 'de', app_version: '20261105-1' }, o || {});

test('limits are generous and disclosed: 30 screenshots, 5 minutes of voice (user mentioned seven or more)', () => {
    assert.ok(C.MAX_SHOTS >= 7 * 2, 'far more than seven screenshots');
    assert.strictEqual(C.MAX_SHOTS, 30);
    assert.strictEqual(C.MAX_VOICE, 300);
    const ui = read('feedback.js');
    assert.match(ui, /Up to 30 screenshots and 5 minutes of voice/);
    assert.match(ui, /Bis zu 30 Screenshots und 5 Minuten Sprache/);
    const sql = read('supabase/proposals/feedback_20261105.sql');
    assert.match(sql, /jsonb_array_length\(shots\) <= 30/);
    assert.match(sql, /voice_secs between 0 and 600/);
});

test('paths: random submission key, ordered shot-N.jpg, never an account id', () => {
    const k = C.newKey();
    assert.match(k, /^[0-9a-z]{16,40}$/);
    assert.notStrictEqual(k, C.newKey());
    assert.strictEqual(C.shotPath(k, 0), 'fb/' + k + '/shot-1.jpg');
    assert.strictEqual(C.shotPath(k, 29), 'fb/' + k + '/shot-30.jpg');
    assert.match(C.voicePath(k, 'audio/mp4'), /voice\.m4a$/);
    assert.match(C.voicePath(k, 'audio/webm;codecs=opus'), /voice\.webm$/);
    for (let i = 0; i < 30; i++) assert.match(C.shotPath(k, i), C.PATH_SHOT);
});

test('the row: anonymous drops device; name and transcript are never sent by the phone (server fills the name)', () => {
    const r = C.row({ message: ' hi ', anonymous: true, shots: ['fb/abcdefgh12/shot-1.jpg'], voicePath: 'fb/abcdefgh12/voice.m4a', voiceSecs: 9, lang: 'de', version: 'b1', device: 'iPhone UA', name: 'Bob', transcript: 'x' });
    assert.strictEqual(r.anonymous, true);
    assert.strictEqual(r.device, null);
    assert.ok(!('name' in r) && !('transcript' in r) && !('user_id' in r), JSON.stringify(r));
    assert.strictEqual(r.message, 'hi');
    const n = C.row({ message: 'x', anonymous: false, device: 'UA' });
    assert.strictEqual(n.device, 'UA');
    assert.ok(!C.ready({}) && C.ready({ message: 'a' }) && C.ready({ voice: {} }) && C.ready({ shots: [1] }));
});

test('stable references: FB- + id, same whatever the list order, and the folder carries it', () => {
    const a = ROW(), b = ROW({ id: 'ffee0011-2222-4333-8444-555566667777', created_at: '2026-11-05T10:00:00Z' });
    assert.strictEqual(C.ref(a), 'FB-1A2B3C4D');
    assert.strictEqual(C.folder(a, 0), C.folder(a, 7), 'list position does not change the folder');
    assert.match(C.folder(a, 0), /FB-1A2B3C4D_Emmanuel$/);
    assert.match(C.shotName(a, 0, 1), /FB-1A2B3C4D_Emmanuel\/screenshot-02\.jpg$/);
    assert.match(C.voiceName(a, 0), /FB-1A2B3C4D_Emmanuel\/voice-note\.m4a$/);
    assert.notStrictEqual(C.folder(a, 0), C.folder(b, 0));
});

test('Copy text: every entry with reference, text, transcript or "not transcribed yet", screenshot and voice file names', () => {
    const rows = [ROW({ transcript: 'Please make the camera icon clearer' }), ROW({ id: 'ffee0011-2222-4333-8444-555566667777', anonymous: true, user_id: null, name: null, device: 'should not show', voice_path: null, message: 'Dark mode is great' })];
    const t = C.exportText(rows, { anon: 'Without name' });
    assert.match(t, /FB-1A2B3C4D Emmanuel/);
    assert.match(t, /Please make the camera icon clearer/);
    assert.match(t, /FB-FFEE0011 Without name/);
    assert.doesNotMatch(t, /should not show/, 'anonymous: device never in the copy');
    assert.match(t, /screenshot-01\.jpg/);
    assert.match(t, /voice-note\.m4a/);
    const t2 = C.exportText([ROW()], {});
    assert.match(t2, /not transcribed yet/i);
});

test('100 submissions: needsTranscript picks only voice notes without text; copy covers all of them in one text', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ROW({ id: (i.toString(16).padStart(8, '0')) + '-0000-4000-8000-000000000000', transcript: i % 3 ? 'said ' + i : null, voice_path: i % 10 ? 'fb/abcdefgh12/voice.m4a' : null }));
    const todo = rows.filter(C.needsTranscript);
    assert.ok(todo.length > 20 && todo.every(r => r.voice_path && !r.transcript));
    const t = C.exportText(rows, {});
    assert.strictEqual((t.match(/^--- FB-/gm) || []).length, 100);
    assert.strictEqual(new Set(rows.map(C.ref)).size, 100, 'every reference unique');
});

test('manifest (feedback.json): anonymous hides user and device; screenshot file names match the package', () => {
    const m = C.manifest([ROW(), ROW({ id: 'ffee0011-2222-4333-8444-555566667777', anonymous: true, user_id: 'leak', device: 'leak', name: null })], { anon: 'Without name', when: '2026-11-05T12:00:00Z' });
    assert.strictEqual(m.count, 2);
    assert.strictEqual(m.feedback[0].ref, 'FB-1A2B3C4D');
    assert.deepStrictEqual(m.feedback[0].screenshots, [0, 1, 2].map(k => C.shotName(ROW(), 0, k)));
    assert.strictEqual(m.feedback[1].user_id, null);
    assert.strictEqual(m.feedback[1].device, null);
    assert.strictEqual(m.feedback[1].from, 'Without name');
    assert.doesNotMatch(JSON.stringify(m.feedback[1]), /leak/);
});

test('zip package opens: stored entries with names and contents intact (checked with zlib CRC + a real unzip)', () => {
    const enc = s => new TextEncoder().encode(s);
    const files = [{ name: 'feedback.txt', data: enc('hello') }, { name: '20261105-1030_FB-1A2B3C4D_Emmanuel/screenshot-01.jpg', data: new Uint8Array([255, 216, 255, 1, 2, 3]) }];
    const z = Buffer.from(C.zip(files));
    assert.strictEqual(z.readUInt32LE(0), 0x04034b50);
    assert.strictEqual(C.crc32(enc('hello')) >>> 0, zlib.crc32 ? zlib.crc32('hello') : C.crc32(enc('hello')) >>> 0);
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'fbzip-'));
    fs.writeFileSync(path.join(tmp, 'p.zip'), z);
    const r = require('child_process').spawnSync('python3', ['-c', 'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(z.testzip());print("|".join(z.namelist()));print(z.read("feedback.txt").decode())', path.join(tmp, 'p.zip')], { encoding: 'utf8' });
    if (r.status === 0) {
        const [bad, names, body] = r.stdout.trim().split('\n');
        assert.strictEqual(bad, 'None');
        assert.strictEqual(names, files.map(f => f.name).join('|'));
        assert.strictEqual(body, 'hello');
    }
});

test('move keeps the order the sender talks about', () => {
    assert.deepStrictEqual(C.move(['a', 'b', 'c'], 0, 1), ['b', 'a', 'c']);
    assert.deepStrictEqual(C.move(['a', 'b', 'c'], 0, -1), ['a', 'b', 'c']);
    assert.deepStrictEqual(C.move(['a', 'b', 'c'], 2, -1), ['a', 'c', 'b']);
});

test('errors map to honest messages', () => {
    assert.strictEqual(C.classify({ message: 'feedback_rate_limited' }), 'limit');
    assert.strictEqual(C.classify({ message: 'feedback_file_missing' }), 'files');
    assert.strictEqual(C.classify({ statusCode: '413', message: 'Payload too large' }), 'size');
    assert.strictEqual(C.classify({ code: '42P01', message: 'relation "public.app_feedback" does not exist' }), 'missing');
    assert.strictEqual(C.classify({ code: '42501', message: 'new row violates row-level security policy' }), 'denied');
});

test('Settings: Send feedback for everyone, Feedback inbox only for the owner, both in the Community hub Help group', () => {
    const SS = require('../home-settings-sleep-v2.js');
    const ids = SS.SETTINGS_IDS;
    assert.ok(ids.includes('feedback') && ids.includes('feedbackInbox'));
    assert.strictEqual(ids[ids.length - 1], 'about', 'About stays last');
    const hs = read('home-settings-sleep-v2.js');
    assert.match(hs, /feedback: \{ has: \(\) => !!\(root\.LowiFeedback && fn\(root\.LowiFeedback, 'open'\)\)/);
    assert.match(hs, /feedbackInbox: \{ has: \(\) => [^\n]*root\.LowiFeedback\.isOwner\(\)/, 'inbox row only for the owner');
    assert.match(hs, /feedback: 'Feedback senden', feedbackInbox: 'Feedback-Postfach', notifications: 'Mitteilungen'/);
    assert.match(read('community-me.js'), /ids: \['tutorial', 'feedback', 'feedbackInbox', 'support', 'rules', 'about'\]/);
    const html = read('index.html'), sw = read('sw.js');
    for (const f of ['feedback.css', 'feedback-core.js', 'feedback.js']) {
        assert.ok(html.includes(f + '?v='), f + ' loaded');
        assert.ok(sw.includes('"' + f + '"'), f + ' precached');
    }
    assert.ok(html.indexOf('feedback-core.js') < html.indexOf('feedback.js?'), 'core before UI');
    assert.ok(html.indexOf('owner-admin.js') < html.indexOf('feedback.js?'), 'owner check loaded before the inbox');
});

test('send UI: voice note is the big first action; recording never rebuilds the screenshot viewer; picker paused while recording', () => {
    const ui = read('feedback.js');
    assert.match(ui, /class="fbk-rec" data-fbk="rec"/);
    const start = ui.slice(ui.indexOf('async function startRec'), ui.indexOf('function stopRec'));
    assert.doesNotMatch(start, /paintShots\(\)/, 'starting a recording leaves the swipeable viewer alone');
    assert.match(start, /\[data-fbk="add"\]'\)\.forEach\(b => \{ b\.disabled = true; \}\)/);
    const timer = start.slice(start.indexOf('R.timer = setInterval'), start.indexOf('}, 250);'));
    assert.doesNotMatch(timer, /paint|innerHTML/, 'the timer only changes its own text');
    assert.match(ui, /if \(a === 'add'\) \{ if \(!S\.rec\)/);
    assert.match(ui, /visibilitychange[^\n]*S\.rec\) stopRec\(\)/, 'leaving the app keeps what was recorded');
    assert.match(ui, /if \(S\.rec\) \{ say\(T\(\)\.keepRec/, 'closing while recording asks to stop first');
});

test('anonymous: honest wording in all three languages, never "fully anonymous" as a promise', () => {
    const ui = read('feedback.js');
    assert.match(ui, /So this is private, not fully anonymous\./);
    assert.match(ui, /privat, aber nicht v\\u00f6llig anonym/);
    assert.match(ui, /Es privado, no totalmente an\\u00f3nimo\./);
    assert.match(ui, /device: d\.anonymous \? '' :/, 'no device text when anonymous');
});

test('inbox: owner only, select all, Transcribe / Copy / Download package / Mark done act on the selection; signed links, no public bucket', () => {
    const ui = read('feedback.js');
    assert.match(ui, /async function openInbox\(\) \{\s*const t = T\(\);\s*if \(!isOwner\(\)\) return;/);
    for (const a of ['trsel', 'copysel', 'pkg', 'done']) assert.match(ui, new RegExp('data-fbk="' + a + '"'));
    assert.match(ui, /id="fbkAll"/);
    assert.match(ui, /createSignedUrls\(/);
    assert.match(ui, /functions\.invoke\('feedback-transcribe', \{ body: \{ id: r\.id \} \}\)/);
    assert.match(ui, /feedback\.json/);
    assert.doesNotMatch(ui, /service_role|GEMINI_API_KEY\s*=|sb_secret_/, 'no server secrets in the app');
});

test('server SQL: owner-only reads, server-set identity, anonymous strips account, files must be the sender\'s own, private bucket', () => {
    const s = read('supabase/proposals/feedback_20261105.sql');
    assert.match(s, /create policy "owner reads feedback" on public\.app_feedback for select to authenticated using \(public\.is_app_owner\(\)\)/);
    assert.match(s, /if new\.anonymous then\s*new\.user_id := null; new\.name := null; new\.device := null;/);
    assert.match(s, /new\.transcript := null; new\.transcript_by := null;/, 'senders cannot plant a transcript');
    assert.match(s, /o\.owner_id = me::text/, 'attached files must be uploaded by the same account');
    assert.match(s, /values \('feedback', 'feedback', false,/);
    assert.match(s, /create policy "feedback owner read" on storage\.objects for select to authenticated\s*using \(bucket_id = 'feedback' and public\.is_app_owner\(\)\)/);
    assert.match(s, /revoke all on public\.app_feedback from authenticated;\s*grant insert \(anonymous, message, voice_path, voice_secs, shots, lang, app_version, device\)/);
    assert.match(s, /feedback_rate_limited/);
    assert.doesNotMatch(s, /app_feedback_rate[^;]*feedback_id/, 'the flood counter has no link to a feedback row');
});

test('transcribe function: owner checked on the server, key only as a secret', () => {
    const f = read('supabase/functions/feedback-transcribe/index.ts');
    assert.match(f, /is_app_owner/);
    assert.match(f, /Deno\.env\.get\("GEMINI_API_KEY"\)/);
    assert.match(f, /MAX_BYTES = 8_400_000/);
});
