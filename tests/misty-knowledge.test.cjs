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
  /* changed 25 Nov 2026: the public room's meals now carry their picture (read from the body's link) and user_id only leaves out bots;
     still no names, and the message's words never reach the AI */
  assert.match(fn, /sb\("messages\?select=id,user_id,meal,body&room=eq\.all&meal=not\.is\.null/, 'only the public room, only meals');
  const kn = fn.slice(fn.indexOf('async function knowledge'), fn.indexOf('const wordsOf'));
  assert.doesNotMatch(kn, /\bwho\b/, 'no names');
  assert.doesNotMatch(kn, /const t = \[[^\n]*body/, 'no message text in a note');
  assert.match(kn, /pic = img\(u\)/);
  assert.match(fn, /never invent more than a note says, never name anyone/); /* changed 25 Nov 2026 (wording) */
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
/* 25 Nov 2026 (Emmanuel: "I want a share button for the chat ... people who aren't signed in yet, they see the chat ... they can type and
   everything. But the moment they send a message ... our app store ... to sign in. The people who already have an account, it will be
   their version ... and their Tamagotchi"). Checked in Chromium: link 131 characters; a guest sees the chat, sending keeps the question
   and opens the store page; someone signed in gets the chat as their own new chat. */
test('Talk to Misty: Share sends the chat in a link; a guest sees it and is sent to the store page on send; a member gets it as their chat', () => {
  const a = R('lowi-ask.js');
  /* changed 25 Nov 2026 ("why is my companion name in the link? ... just like a ChatGPT link"): the chat is kept on the server, the link is its short id */
  /* changed 25 Nov 2026, later: the id is made in the app and the sheet opens inside the tap */
  /* changed 25 Nov 2026, later (Emmanuel: "I should be able to share the app's AI ... I don't want to send my chat history or my own Tamagotchi"): Share sends the link to the app's AI; links to shared chats made before still open */
  assert.match(a, /data-ak="share"/); assert.match(a, /const u = 'https:\/\/lowispike\.com\/\?ai=1';/);
  assert.match(a, /if \(signedIn\(\)\) \{ fresh\(''\); msgs = sh; keep\(\); open\(\{\}\); return; \}/);
  assert.match(a, /GUEST = true; msgs = sh; open\(\{\}\); return;/); assert.match(a, /if \(GUEST\) return guestSend\(v, p\);/);
  assert.match(a, /localStorage\.setItem\('lowi\.ask\.after'/); assert.match(a, /W\.LowiStorePage\.open\(\)/);
  assert.match(a, /if \(q && signedIn\(\)\) \{ try \{ localStorage\.removeItem\('lowi\.ask\.after'\); \} catch \(e\) \{\} setTimeout\(\(\) => open\(\{ ask: q \}\), 2500\); \}/, 'their question is answered after signing in');
});
/* 25 Nov 2026 (Emmanuel: "make it our Galaxy interface, but blur it just like Apple iOS ... the back button is covered by another back button
   ... Talk to Misty is not even in the middle ... a picture ... like in the community ... see our companion ... when it's thinking or typing,
   it's moving"). Checked in Chromium: one back arrow, the companion and its name centred, three round icons, the photo as a card, the
   companion glowing next to the typing dots. */
test('Talk to Misty looks like LOWiSPIKE: the world blurred behind, one back button, the companion centred and beside its answers', () => {
  const a = R('lowi-ask.js');
  assert.match(a, /-webkit-backdrop-filter:blur\(30px\) saturate\(1\.6\);backdrop-filter:blur\(30px\) saturate\(1\.6\)/);
  assert.match(a, /data-ak="close" data-no-bx aria-label="Back"/, 'the round bottom-close button no longer stands in on top of it');
  assert.match(a, /grid-template-columns:1fr auto 1fr/); assert.match(a, /'<span class="ak-hav">' \+ avatar\(\) \+ '<\/span><em>' \+ esc\(name\(\)\) \+ '<\/em>'/);
  assert.match(a, /'<div class="ak-row ak-think"><span class="ak-av">' \+ av \+ '<\/span><div class="ak-m a"><span class="ak-dots"/);
  assert.match(a, /'<div class="ak-m u ph"><img alt="" src="'/); assert.match(a, /@keyframes akBob/); assert.match(a, /prefers-reduced-motion:reduce\)\{#lwAsk \.ak-think \.ak-av/);
});
/* 25 Nov 2026 (Emmanuel: "I use the link and this is what opens [the welcome screen]. And also, why is my companion name in the link? I wanted
   it to be a link that shares the chat, just like a ChatGPT link"). Checked: share_chat needs sign-in (anon refused), get_shared_chat reads
   one by id, the table cannot be listed; in the real app a guest opening ?chat=ID sees the chat above the sign-in screen (on top, not
   inert), sending keeps the question and opens the store page. */
test('shared Misty chats live on the server; the link is a short id with no name; a guest sees the chat above the sign-in screen', () => {
  const a = R('lowi-ask.js'), q = R('supabase/proposals/shared_chats_20261125.sql'), h = R('index.html');
  assert.match(q, /revoke all on public\.shared_chats from public, anon, authenticated;/); assert.match(q, /if auth\.uid\(\) is null then raise exception 'sign_in'; end if;/);
  assert.match(q, /grant execute on function public\.get_shared_chat\(text\) to anon, authenticated;/);
  /* changed 25 Nov 2026, later (Emmanuel: "I should be able to share the app's AI ... I don't want to send my chat history or my own Tamagotchi"): Share sends the link to the app's AI; links to shared chats made before still open */
  assert.match(a, /const SHARED_ID = \(\(\) => \{ try \{ const m = \/\[\?&\]chat=/);
  assert.match(h, /:not\(\.lis-full\):not\(#lwAsk\)\{visibility:hidden!important\}/); assert.match(h, /el\.id === "lwAsk" \/\* 25 Nov 2026: a shared Misty chat stays usable before sign-in \*\//);
  assert.match(R('store-page.js'), /\[\?&\]\(ref\|post\|p\|s\|c\|code\|invite\|app\|chat\|ai\)=/);   /* + ai (25 Nov 2026, later) */
  assert.match(a, /#lwAsk\{position:fixed;inset:0;z-index:2147483100;/);
});
/* 25 Nov 2026 (Emmanuel: "the disclaimer looks very unaesthetic ... ChatGPT doesn't do that ... If I share a screenshot"). Checked in Chromium:
   a fresh chat shows the note and the quick questions; once you talk both are gone. */
test('Talk to Misty: the note and quick questions show only on a fresh chat, small; the conversation screen stays clean', () => {
  const a = R('lowi-ask.js');
  assert.match(a, /el\.classList\.toggle\('ak-empty', !msgs\.length\);/);
  /* changed 25 Nov 2026, later ("that annoying disclaimer is still there"): the note left the chat screen; it sits at the bottom of the Chats list */
  assert.match(a, /'#lwAsk \.ak-n\{display:none\}#lwAsk:not\(\.ak-empty\) \.ak-c\{display:none\}/); assert.match(a, /'<p class="ak-lnote">' \+ esc\(t\('note'\)\) \+ '<\/p>'/);
  assert.match(a, /note: \['Answers come from Google/, 'the note itself stays (not medical advice, no private health details)');
});
/* 25 Nov 2026 (Emmanuel: "if it's suggesting the user to try that, then it should also link them ... click here to check it out ... link us
   directly to the TikTok video"; "why is it still having my name ... it should just share the chat link"). Checked in Chromium: an answer
   with two community links shows "▶ Nori Smash Burger Stack · Watch on TikTok" (opens the TikTok) and "✨ … · Open it in For You" (opens the post). */
test('the companion links what it recommends from the community: the TikTok / YouTube, the For You post or the chat; sharing sends only the link', () => {
  const a = R('lowi-ask.js'), fn = R('supabase/functions/lowi-ai/index.ts'), h = R('index.html');
  assert.match(fn, /When you recommend one, put its tag right after it, like \[r2\]; at most 2 tags/); /* changed 25 Nov 2026 (wording) */
  assert.match(fn, /return out\(req, 200, \{ ok: true, text, links \}\);/); assert.match(fn, /kind: "chat", img: pic, id: String\(x\.id \|\| ""\) \}\);/); /* changed 25 Nov 2026: chat shares carry their picture */
  assert.match(a, /function cardsHTML\(l\)/); assert.match(a, /if \(x\.url\) \{ try \{ W\.open\(x\.url, '_blank', 'noopener'\);/);
  assert.match(a, /else if \(W\.LowiOpenPost\) W\.LowiOpenPost\(x\.id\);/); assert.match(h, /window\.LowiOpenPost = id => openPost\(id\); window\.LowiOpenChat = /);
  assert.match(a, /navigator\.share\(\{ url: u \}\)/); assert.doesNotMatch(a, /navigator\.share\(\{ title: t\('shareT'\)/);
});
/* 25 Nov 2026, later (Emmanuel: "I clicked on sharing so that it creates a link. Didn't happen ... It gets stuck. Even the back button doesn't
   work"). Checked in Chromium: the share sheet opens 16 ms after the tap with only the link while the chat is stored (3 s), Back closes the
   chat right after; the note is in the Chats list, not on the chat. */
test('share opens the share sheet inside the tap (id made in the app, chat stored meanwhile); nothing waits without a limit', () => {
  const a = R('lowi-ask.js'), q = R('supabase/proposals/shared_chats_20261125.sql');
  /* changed 25 Nov 2026, later (Emmanuel: "I should be able to share the app's AI ... I don't want to send my chat history or my own Tamagotchi"): Share sends the link to the app's AI; links to shared chats made before still open */
  assert.match(a, /if \(navigator\.share\) \{ navigator\.share\(\{ url: u \}\)/);
  assert.match(a, /const within = \(p, ms\) => Promise\.race/); assert.match(a, /await within\(sb\.auth\.getSession\(\), 2500\)/);
  assert.doesNotMatch(a.slice(a.indexOf('function shareChat'), a.indexOf('async function shareUrl')), /disabled/, 'no button is disabled while sharing');
  assert.match(q, /if p_id !~ '\^\[A-Za-z0-9_-\]\{10\}\$' then raise exception 'bad_id'; end if;/);
});
/* 25 Nov 2026, later (Emmanuel: "I should be able to share the app's AI, not just the chat room. I don't want to send my chat history or my own
   Tamagotchi ... I want to send this chat, this lowispike chat"). Checked in Chromium: Share (also from the Chats list, with a private chat in
   the history) sends only https://lowispike.com/?ai=1; a guest gets a fresh chat and the store page on send; a member gets a fresh chat. */
test('Share sends the link to the app\'s AI (?ai=1), never a conversation or the companion; it opens a fresh chat for everyone', () => {
  const a = R('lowi-ask.js'), sh = a.slice(a.indexOf('function shareChat'), a.indexOf('async function shareUrl'));
  assert.doesNotMatch(sh, /msgs|shareData|name\(\)|store\(/, 'nothing of the chats goes with it');
  assert.match(a, /const AI_LINK = \(\(\) => \{ try \{ return \/\[\?&\]ai=1\\b\/\.test\(location\.search\);/);
  assert.match(a, /if \(signedIn\(\)\) \{ fresh\(''\); view = 'chat'; open\(\{\}\); return; \}\s*GUEST = true; msgs = \[\]; open\(\{\}\); return;/);
});
/* 25 Nov 2026 (Emmanuel: "Misty is the name of my specific companion, not the universal one. Everyone has their own companion name").
   Checked in Chromium: a visitor from ?ai=1 sees "LOWiSPIKE AI"; a member's chat shows and sends their companion's name ("Kiko"). */
test('the chat uses each person\'s own companion name (as the rest of the app shows it); a visitor without an account talks to LOWiSPIKE AI', () => {
  const a = R('lowi-ask.js'), fn = R('supabase/functions/lowi-ai/index.ts');
  assert.match(a, /if \(!signedIn\(\)\) \{[^\n]*return 'LOWiSPIKE AI'; \}/);
  assert.match(a, /if \(!n\) try \{ const tg = W\.LowiHerbTamagotchi, p = tg && tg\.readPrefs && tg\.readPrefs\(\); n = typed\(p && p\.name\); \}/);
  assert.match(fn, /"You are LOWiSPIKE AI, the assistant inside the LOWiSPIKE app \(each person there has their own companion with its own name; do not call yourself Misty\)\."/);
});
