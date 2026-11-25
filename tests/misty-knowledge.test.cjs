// 25 Nov 2026 (Emmanuel: "talk to Misty ... so it almost feels like you're asking your buddy ... the videos that we post into our For You
// page actually becomes a knowledge space ... add a button ... AI fill ... same with what people post into the chat room ... the AI has
// access to that"). Checked: lowi-ai deployed (fyfill asks for sign-in, unknown actions refused); fy-ai.js in Chromium: the button only
// on TikTok/YouTube posts, one failed try retried by itself, the daily limit says so.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
test('Misty\'s card: Talk to {name} is the big button under the speech line on every tab (no longer folded inside "More")', () => {
  const m = R('misty-hub.js');
  assert.match(m, /talkBtn\(\) \+ tabsHtml\(\) \+/); assert.match(m, /const world = peakHtml\(\) \+ worldRows\(\) \+ goodnightHtml\(\);/);
  assert.match(m, /return doorsHtml\(\) \+ secHtml\(\)/); assert.match(R('misty-hub.css'), /\.mh-talk\{/);
});
test('For You video posts get ✨ Words: written down once, kept on the post for everyone, retried by itself', () => {
  const f = R('fy-ai.js'), fn = R('supabase/functions/lowi-ai/index.ts');
  assert.match(f, /\(tiktok\\\.com\|youtube\\\.com\|youtu\\\.be\)/); assert.match(f, /W\.LowiAsk\.call\(\{action: 'fyfill', id: id\}\)/);
  assert.match(R('index.html'), /\(window\.LowiFyAI \? LowiFyAI\.btn\(p\) : ''\) \+/); assert.match(R('index.html'), /<script src="fy-ai\.js\?v=/);
  assert.match(fn, /if \(meta0\.ai && \(meta0\.ai\.sum \|\| meta0\.ai\.transcript\)\) return out\(req, 200, \{ ok: true, ai: meta0\.ai, cached: true \}\);/, 'never twice');
  assert.match(fn, /fyfill: 8 \}/); assert.match(fn, /parts\.push\(\{ fileData: \{ fileUri: url \} \}\)/, 'YouTube');
  for (const l of ['en', 'de', 'es']) assert.ok(/btn: \['Words', 'Worte', 'Palabras'\]/.test(f), l);
});
test('the companion reads the community: related For You posts and public chat meals, anonymous, never who said it', () => {
  const fn = R('supabase/functions/lowi-ai/index.ts');
  assert.match(fn, /sb\("messages\?select=meal&room=eq\.all&meal=not\.is\.null/, 'only the public room, only the meal');
  assert.doesNotMatch(fn.slice(fn.indexOf('async function knowledge'), fn.indexOf('function pick')), /who|user_id|body/, 'no names, no ids, no message text');
  assert.match(fn, /never invent more than they say, never name anyone/);
  assert.match(fn, /systemInstruction: \{ parts: \[\{ text: mistyRules\(clip\(b\.name, 40\), clip\(b\.sign, 20\), lang\) \+ notes \}\] \}/);
});
/* 25 Nov 2026 (Emmanuel: "uploading a picture in here doesn't work ... I take a picture of a TikTok video and I want to ask my AI ... if I can
   eat it"). Checked in Chromium: pick a photo -> it waits above the text box; "Kann ich das essen?" + send -> one message with the photo
   and the question, the preview clears. */
test('Talk to Misty: the photo picker sits in the page; the photo waits with ✕ until you send it with your question', () => {
  const a = R('lowi-ask.js');
  assert.match(a, /i\.style\.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0'; D\.body\.appendChild\(i\);/);
  assert.match(a, /im\.onerror = \(\) => \{[^\n]*t\('photoFail'\)/); assert.match(a, /function sendNow\(v\) \{ const p = PEND;/);
  assert.match(a, /send\(String\(v \|\| ''\)\.trim\(\) \|\| \(p \? t\('photo2'\) : ''\), p \|\| undefined\)/);
  assert.match(R('supabase/functions/lowi-ai/index.ts'), /A photo can be a meal, a food label, a product, or a screenshot of a video or post \(TikTok, Instagram, a recipe\)/);
});
