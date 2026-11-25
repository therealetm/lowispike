// 25 Nov 2026 (Emmanuel: "Why is it suggesting me stuff based on the recipe book? I don't want that. I want things that were shared by real
// people ... the YouTube videos, the TikTok videos, the Instagram videos ... With a preview ... like WhatsApp ... Same with the chat room. It
// should show us the picture"). lowi-ai links only real members' shares, each with its picture; the recipe book is background only; the chat
// shows each link as a picture preview that never gets wider than the screen.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const fn = R('supabase/functions/lowi-ai/index.ts'), ask = R('lowi-ask.js');
test('only real people\'s shares get a tag (a link card); Nibblo, bot accounts and the recipe book are background only', () => {
  assert.match(fn, /const NIBBLO = "59bb3615-b344-4c45-ab0f-0a5de5cd8df3"/);
  assert.match(fn, /profiles\?select=id&bot=is\.true/);
  assert.match(fn, /if \(bots\.has\(String\(p\.user_id \|\| ""\)\) \|\| m\.nb\) \{ book\.push\(\{ k: "recipe book", t \}\); continue; \}/);
  assert.match(fn, /if \(\/\\\/meal-nb-\/\.test\(u\)\) continue;/);
  assert.match(fn, /ks = pick\(K\.share, last\); const bk = pickBook\(K\.book, last\)/);
  assert.match(fn, /never give these a tag/);
});
test('videos come first and every share carries its picture to the card', () => {
  assert.match(fn, /\(it\.vid \? 0\.5 : 0\)/);
  assert.match(fn, /img: img\(m\.thumb \|\| p\.photo_url \|\| p\.poster\)/);
  assert.match(fn, /img: x\.img \|\| "", vid: !!x\.vid/);
  assert.match(fn, /you CAN link/);
  assert.match(fn, /msgs\.slice\(-3\)/, '"link me" looks at the last turns, not only the last message');
});
test('the chat draws a WhatsApp-like preview: picture on top, play button on videos, title, where it opens; nothing overflows', () => {
  assert.match(ask, /class="ak-card pv' \+ \(ext \? ' vid' : ''\)/);
  assert.match(ask, /<i class="ak-play" aria-hidden="true"><\/i>/);
  assert.match(ask, /#lwAsk \.ak-row,#lwAsk \.ak-row \.ak-m,#lwAsk \.ak-cards,#lwAsk \.ak-card\{min-width:0;max-width:100%\}/);
  assert.match(ask, /const IMG_OK = \/\^https:/, 'pictures only from our storage, YouTube or TikTok/Instagram image servers');
  assert.match(ask, /referrerpolicy="no-referrer"/);
});
