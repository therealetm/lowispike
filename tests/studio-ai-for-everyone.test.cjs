// 25 Nov 2026 (Emmanuel: "Why would I be owner only? I'm doing this so people can also use this exact thing like me"). studio-ai: the video
// machine's texts and a video's words are for every signed-in person (own daily limit, the owner keeps his bigger one); filling the shared
// Swipe file stays the owner's; Studio tells someone who is not signed in to sign in, never "owner only".
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const fn = R('supabase/functions/studio-ai/index.ts');
test('captions and words: any signed-in person, each with their own limit', () => {
  /* changed 25 Nov 2026, later (Emmanuel: "you are capping me, the admin. Don't do that"): the owner's slot is 0 = no cap (see take) */
  assert.match(fn, /const PER = \{ captions: \[0, 20\], words: \[0, 10\] \}/);
  assert.match(fn, /if \(await isOwner\(req\)\) return \{ sub: "owner", max: PER\[feature\]\[0\] \};/);
  assert.match(fn, /const uid = await userId\(req\); return uid \? \{ sub: uid, max: PER\[feature\]\[1\] \} : \{ sub: "", max: 0 \};/);
  assert.match(fn, /take\(w\.sub, "captions", w\.max\)/); assert.match(fn, /take\(w\.sub, "words", w\.max\)/);
  assert.match(fn, /fetch\(url \+ "\/auth\/v1\/user"/, 'the person is the one the session token belongs to');
});
test('fill (the shared Swipe file) stays the owner\'s', () => {
  assert.match(fn, /if \(body\.action === "fill"\) \{\n\s+if \(!\(await isOwner\(req\)\)\) return out\(req, 403, \{ error: "owner_only" \}\);/);
});
test('Studio asks to sign in, it never says "owner only" for these', () => {
  for (const f of ['studio/video-machine.js', 'studio/video-words.js']) { const s = R(f); assert.match(s, /\(m === 'owner_only' \|\| m === 'sign_in'\) \? t\('owner'\)/, f); assert.doesNotMatch(s, /sign in as the owner|Only the Studio owner/, f); }
});
