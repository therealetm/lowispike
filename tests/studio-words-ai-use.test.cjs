// 23 Nov 2026 (Emmanuel): Studio > Profile "Video link -> words" (transcript, text on screen, caption; translate into any language),
// the owner's "AI use" page, and the AI functions accept lowispike.com (the app is also served there).
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
test('studio-ai "words": owner only, TikTok video -> spoken words + text on screen + caption; caption only when the video cannot be read', () => {
  const f = R('supabase/functions/studio-ai/index.ts');
  assert.match(f, /if \(body\.action === "words"\) \{\n\s+if \(!\(await isOwner\(req\)\)\) return out\(req, 403, \{ error: "owner_only" \}\);/);
  assert.match(f, /if \(!v\) return out\(req, 200, \{ ok: true, caption: [^\n]*transcribed: false \}\);/);
  assert.match(f, /`onscreen`: every piece of text shown on screen/);
});
test('translate takes any language by name, kept to letters so it cannot carry an instruction', () => {
  const f = R('supabase/functions/studio-ai/index.ts');
  assert.match(f, /const anyLang = \(v: unknown\) => \{ const x = clip\(v, 40\); return \/\^\[\\p\{L\}\]\[\\p\{L\} \(\)'-\]\{1,39\}\$\/u\.test\(x\) \? x : ""; \};/);
  assert.match(f, /"Translate the following text into " \+ toName \+/);
});
test('the Studio page: paste, Get the words, Copy each part, translate (EN/DE/ES chips or any language), Save as idea', () => {
  const w = R('studio/video-words.js'), a = R('studio/accounts.js'), h = R('studio/index.html');
  for (const k of ['go', 'copy', 'lang', 'any', 'orig', 'save', 'close']) assert.ok(w.includes("k === '" + k + "'"), k);
  assert.match(w, /S\.ai\(\{action: 'words', link: link\}\)/); assert.match(w, /S\.ai\(\{action: 'translate', text: x\.slice\(0, 6000\), to: to\}\)/);
  for (const k of Object.keys(require('vm').runInNewContext('(' + /var T = (\{[\s\S]*?\n  \});/.exec(w)[1] + ')'))) assert.ok(true, k);
  assert.match(a, /data-acc="words"/); assert.match(a, /if \(k === 'words'\) return W\.StudioWords && StudioWords\.open\(\);/); assert.match(a, /addDraft: addDraft/);
  assert.match(h, /<script src="video-words\.js\?v=1"><\/script>\n<script src="ai-use\.js\?v=1"><\/script>/);
});
test('AI use: owner only on the server and in Studio; photo checks kept apart from the 400 a day; profile autofill is not AI', () => {
  const q = R('supabase/proposals/ai_overview_20261123.sql'), u = R('studio/ai-use.js'), h = R('studio/index.html');
  assert.match(q, /if not coalesce\(public\.is_app_owner\(\), false\) then raise exception 'owner only'/);
  assert.match(q, /select coalesce\(sum\(n\), 0\) into total from public\.ai_usage where day = d and feature <> 'profile';/);
  assert.match(q, /filter \(where feature not in \('profile', 'photo'\)\)::int as ai/); assert.match(q, /food_photo' -> 't'/);
  assert.match(u, /sb\.rpc\('ai_overview'\)/); assert.match(u, /Cost: €0\./);
  assert.match(h, /ab\.hidden = !OWNER;/);
});
test('every AI function accepts lowispike.com as well as the GitHub address', () => {
  for (const fn of ['lowi-ai', 'food-photo', 'studio-ai', 'feedback-transcribe', 'auth-handoff', 'delete-my-account', 'owner-delete-account'])
    assert.match(R('supabase/functions/' + fn + '/index.ts'), /const ORIGINS = \[\/\^https:\\\/\\\/therealetm\\\.github\\\.io\$\/, \/\^https:\\\/\\\/\(www\\\.\)\?lowispike\\\.com\$\//, fn);
});
test('Studio: the owner always has a + (no Edit needed), the video dialog files it into playlists, Edit folds the playlists into one list (23 Nov 2026)', () => {
  const h = R('studio/index.html');
  assert.match(h, /fab\.hidden = !OWNER \|\| EDIT \|\| \(TAB !== 'swipe' && TAB !== 'agent'\);/);
  assert.match(h, /if \(OWNER\) render\(\);/);
  assert.match(h, /function plPick\(x\) \{/); assert.match(h, /\(!x\.id && PL && q\.id === PL\)/, 'inside a playlist the new video starts ticked there');
  assert.match(h, /if \(lists\(\)\.length\) plApply\(id \|\| \(o\.id = 'V' \+ Date\.now\(\)\.toString\(36\)\.toUpperCase\(\)\)\);/);
  assert.match(h, /<details class="pl-edit"' \+ \(PLOPEN \? ' open' : ''\) \+ '><summary>/);
});
test('drafts: translate (EN/DE/ES or any language), Copy text, Back to original; a refused cloud save says so once and retries (23 Nov 2026)', () => {
  const a = R('studio/accounts.js');
  for (const k of ["k === 'itr'", "k === 'itrany'", "k === 'icopy'", "k === 'iundo'"]) assert.ok(a.includes(k), k);
  assert.match(a, /S\.ai\(\{action: 'translate', text: src\.slice\(0, 6000\), to: String\(to\)\.trim\(\)\}\)/);
  assert.doesNotMatch(a, /S\.toast\(S\.t\('notSaved'\)\)/);
  assert.match(a, /if \(!failSaid\) \{ failSaid = true; S\.toast\(t\('cloudLater'\)\); \} clearTimeout\(retryT\); retryT = setTimeout\(push, 60000\);/);
  assert.match(R('supabase/proposals/studio_accounts_size_20261123.sql'), /check \(pg_column_size\(doc\) <= 3000000\)/);
});
