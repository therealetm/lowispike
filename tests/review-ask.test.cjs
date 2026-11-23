// 23 Nov 2026 (Emmanuel): everyone who uses the app is asked for a review (+XP once), with an optional voice note that is transcribed;
// the website shows real reviews with picture, stars, words, a play button and the transcript.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const js = R('review-ask.js'), sql = R('supabase/proposals/app_reviews_20261123.sql'), fn = R('supabase/functions/lowi-ai/index.ts'), web = R('store-page.js');
test('XP once per person through the app ledger (eventId), a lot of it', () => { const M = require('../review-ask.js'); assert.ok(M.REVIEW_XP >= 1000); assert.match(js, /W\.award\(REVIEW_XP, 'Thank you for your review', null, 'review', 'review-app-v1'\)/); });
test('the ask: once per session, Later = 3 days, No thanks = never, only signed in, only on Home with nothing open', () => { assert.match(js, /if \(s\.later && Date\.now\(\) - s\.later < 3 \* 864e5\) return false;/); assert.match(js, /function quiet\(\)/); assert.match(js, /return live\(\);/); });
test('the speaker plays the recorded tutorial voices, never the device voice', () => { assert.match(js, /new Audio\('review-voice\/' \+ lang\(\) \+ '\.mp3'\)/); assert.doesNotMatch(js, /speechSynthesis/); for (const l of ['en', 'de', 'es']) assert.ok(fs.statSync(path.join(__dirname, '..', 'review-voice', l + '.mp3')).size > 20000, l); assert.match(R('tools/review-voice.py'), /en-US-AvaNeural/); });
test('voice notes are uploaded to the person\'s own folder and transcribed', () => { assert.match(js, /path = uid \+ '\/review-' \+ Date\.now\(\)/); assert.match(js, /action: 'transcribe'/); assert.match(fn, /action === "transcribe"/); assert.match(fn, /transcribe: 5/); });
test('one review per person, about the app; nobody but the owner can hide or unhide; the website reads a public view without ids or emails', () => {
  assert.match(sql, /user_id uuid primary key/); assert.match(sql, /if not public\.is_app_owner\(\) then new\.hidden := old\.hidden; end if;/); assert.match(sql, /create or replace view public\.app_reviews_public as\s+select r\.stars, r\.body, r\.voice_url, r\.transcript, r\.lang, r\.created_at,/);
  assert.match(R('review-ask.js'), /about: 'About the app itself, not about your results\.'/);
});
test('the website shows reviews only when real ones exist, with picture, play button and transcript', () => { assert.match(web, /if \(!REV\.length\) return '';/); assert.match(web, /data-lsp="play"/); assert.match(web, /<details><summary>' \+ esc\(t\('transcript'\)\)/); assert.match(web, /app_reviews_public\?select=/); });
