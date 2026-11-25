// 25 Nov 2026 (Emmanuel: "you are capping me, the admin. Don't do that. As an admin, I should be able to have as many go with the AI use
// as I need, because I'm testing things"). The owner (public.is_app_owner()) is never stopped by an AI limit: lowi-ai and studio-ai still
// count his use (AI usage overview) with no personal and no whole-app cap; food-photo skips the daily photo count and the burst limits.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', 'supabase/functions', f, 'index.ts'), 'utf8');
test('lowi-ai: counted, never capped for the owner', () => {
  const f = R('lowi-ai');
  assert.match(f, /p_user_max: owner \? NO_CAP : LIMITS\[feature\] \|\| 10, p_global_max: owner \? NO_CAP : GLOBAL/);
  assert.match(f, /const t = await take\(subject, action, !!uid && await isOwner\(req\)\);/);
  assert.match(f, /rest\/v1\/rpc\/is_app_owner/);
});
test('studio-ai: the owner subject has no cap; everyone else keeps theirs', () => {
  const f = R('studio-ai');
  assert.match(f, /const free = subject === "owner", NO_CAP = 1_000_000_000;/);
  assert.match(f, /p_user_max: free \? NO_CAP : max, p_global_max: free \? NO_CAP : 400/);
  assert.match(f, /const PER = \{ captions: \[0, 20\], words: \[0, 10\] \}/);
});
test('food-photo: the owner skips the daily count and the bursts', () => {
  const f = R('food-photo');
  assert.match(f, /if \(await isOwner\(req\)\) return out\(req, 200, \{ \.\.\.base, used: 0, left: DAY_MAX, owner: true \}\);/);
  assert.match(f, /if \(boss\) \{\n\s+try \{ const r = await gemini\(key, image, mime, lang\);/);
  assert.match(f, /if \(!boss && !nameBurst\(u\.id\)\) return out\(req, 429, \{ error: "busy" \}\);/);
});
