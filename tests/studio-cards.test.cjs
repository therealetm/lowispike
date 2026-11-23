/* Studio (21 Nov 2026): all 42 cards stay complete, one source (studio/cards.json) drives the page, For You opens it. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const D = JSON.parse(R('studio/cards.json'));
const ids = D.cards.map(c => c.id);
test('42 cards: S1-S5, M1-M14, W1-W23, unique and in order', () => {
  const want = [...Array(5)].map((_, i) => 'S' + (i + 1)).concat([...Array(14)].map((_, i) => 'M' + (i + 1)), [...Array(23)].map((_, i) => 'W' + (i + 1)));
  assert.deepStrictEqual(ids, want);
});
for (const c of D.cards) test('card ' + c.id + ' is complete', () => {
  assert.ok(c.title && c.effort && c.status, 'title, effort, status');
  assert.strictEqual(c.area, c.id[0] === 'S' ? 'start' : c.id[0] === 'M' ? 'make' : 'swipe');
  const L = c.fields.map(f => f.label);
  for (const need of ['Remix-Prompt', 'Agent-Ansicht', 'Quelle']) assert.ok(L.includes(need), c.id + ' needs ' + need);
  c.fields.forEach(f => assert.ok(f.text.trim().length > 1, c.id + ' ' + f.label + ' empty'));
  if (c.area === 'swipe') { assert.ok(c.links.length >= 1, c.id + ' link'); assert.ok(c.group, c.id + ' group'); c.links.forEach(u => assert.match(u, /^https:\/\//)); }
});
test('caveats stay visible: agent creates, the person posts; swipe numbers not re-checked', () => {
  assert.match(D.legend.Wichtig, /Posten tust du selbst/);
  assert.match(D.swipeNote, /nicht neu geprüft/);
  assert.match(D.cards.find(c => c.id === 'M12').status, /frischen Setup: nicht test-run/);
});

test('For You tool row: Post, My posts, Saved, Create content -> studio/, no Affiliate (removed 21 Nov), inside the feed', () => {
  const h = R('index.html');
  assert.match(h, /'<div class="fy-feed" id="fyFeed">' \+ fyToolsHTML\(\)/);
  assert.match(h, /"Erstellen", "Affiliate", "Feed", "Circle"/); /* 23 Nov 2026: Post, Feed, Create, Circle */
  assert.match(h, /href="studio\/"/);
  assert.doesNotMatch(h.slice(h.indexOf('function fyToolsHTML'), h.indexOf('function renderForYou')), /affiliates\//, 'no Affiliate circle');
});
test('For You looks like Instagram: foryou-ig.css loads last, hides the doubled floating buttons, My posts is a circle', () => {
  const h = R('index.html'), css = R('foryou-ig.css');
  assert.ok(h.indexOf('href="foryou-ig.css') > h.indexOf('href="design-pass.css'), 'loads after design-pass.css');
  assert.match(css, /#cmPaneFeed \.fyv-fab,#cmPaneFeed \.fy-tops/);
  assert.match(css, /scroll-snap-type:none/);
  assert.match(h, /data-tr="list-mine"', '\\u25A6'/);
  assert.match(R('sw.js'), /STATIC\.push\("foryou-ig\.css"\)/);
});
test('For You opens at the top (circles showing) and uses the app blue, not gold', () => {
  const h = R('index.html'), css = R('foryou-ig.css'), st = R('studio/index.html');
  assert.match(h, /function fyTopOnOpen\(\)/);
  assert.match(css, /\.fy-tool-c\{color:#fff!important;[^}]*--acc-rgb/);
  assert.doesNotMatch(st, /#e9cb88|#caa15a|#b08540/i, 'Studio has no gold');
});



test('New post: one way out, and the circles open only on a real tap', () => {
  const h = R('index.html'), css = R('foryou-ig.css');
  assert.ok(css.includes('html:has(#lwBX.on:not(.bx-aside)) #sheet.r3f-sheet .xbtn[data-act=close-sheet]{opacity:0'), 'sheet X hidden only while the round X is on screen');
  assert.ok(css.includes('html:has(#sheetwrap.open) .nm-back{opacity:0'), 'page back hidden behind an open sheet');
  assert.match(h, /function fyTapIntent\(\)/);
  assert.ok(h.includes('e.detail === 0) return;'), 'keyboard activation always works');
});
test('My posts is an Instagram-style profile with two tabs, and the Saved circle is gone', () => {
  const h = R('index.html');
  const row = h.slice(h.indexOf('function fyToolsHTML'), h.indexOf('function renderForYou'));
  assert.doesNotMatch(row, /data-tr="list-saved"/, 'no Saved circle in the row');
  assert.match(row, /data-tr="list-mine"/);
  assert.match(h, /id="fyProf"/);
  assert.match(h, /data-tr="list-tab" data-k="mine"/, 'Photos tab is back in My posts');
  assert.match(h, /data-tr="list-tab" data-k="saved"/);
  assert.match(h, /case "list-tab": profArm = ""; listSheet\(b\.dataset\.k\); break;/);
  assert.match(h, /\["posts", "Beiträge", "publicaciones"\]/);
});

test('a meal in the chat is a full photo post, only meal bubbles change (22 Nov: no brand mark)', () => {
  const css = R('chat-meal-post.css'), h = R('index.html'), cc = R('community-chat.js');
  assert.ok(h.indexOf('href="chat-meal-post.css') > h.indexOf('href="community-chat.css'), 'loads after the chat styles');
  assert.match(css, /\.cm-bub\.cm-pbub:has\(> \.cs-meal\)\{[^}]*aspect-ratio:9\/16/);
  assert.equal((cc.match(/mealPost=!!\(mealPh&&mealPh\.meal\)/g) || []).length, 2, 'both renderers name the poster');
  assert.match(R('sw.js'), /STATIC\.push\("chat-meal-post\.css"\)/);
});
test('My posts and New post open as their own page with a Back button; profile has Photos, Links and Saved', () => {
  const h = R('index.html'), css = R('foryou-ig.css');
  assert.match(h, /function pageHead\(title, right\)/);
  assert.match(h, /h\.openSheet\(pageHead\(fyT\("My posts"\)\) \+ html\); pageMode\(\);/);
  assert.match(h, /PG \? PG\.head\(T\("New post"\)/);
  assert.match(h, /data-tr="list-tab" data-k="links"/);
  assert.match(h, /const isLink = p => !!p\.url && !p\.photo && !p\.vid;/);
  assert.match(css, /#sheet\.lw-page\{top:0!important/);
  assert.match(css, /html:has\(#sheetwrap\.open #sheet\.lw-page\) #lwBX\{display:none!important\}/, 'one way out: the Back button');
});

test('the meal post beats the chat room styles and fills the chat list', () => {
  const css = R('chat-meal-post.css');
  assert.match(css, /html body #cmPaneChat#cmPaneChat#cmPaneChat#cmPaneChat \.cp-msg \.cm-bub\.cm-pbub:has\(> \.cs-meal\)\{width:100%!important/);
  assert.match(css, /var\(--cml-h,460px\)/);
  assert.match(R('index.html'), /function chatListHeight\(\)/);
});
test('chat photo post reads like TikTok: own words in the middle, name + pill, numbers, no watermark, no time', () => {
  const css = R('chat-meal-post.css'), cc = R('community-chat.js');
  assert.match(css, /:has\(> \.cs-meal\)::before\{content:none!important/, 'no LOWiSPIKE mark');
  assert.match(css, /:has\(> \.cs-meal\)>\.cm-foot time\{display:none!important\}/, 'no time');
  assert.match(css, /:has\(> \.cs-meal\) \.cs-meal-n,/, 'the AI dish name is not on the image');
  assert.match(css, /:has\(> \.cs-meal\)>\.cm-t\{position:absolute!important;[^}]*top:46%/, 'the poster\'s own words in the middle');
  assert.equal((cc.match(/class="cs-postpill" data-chat="meal-detail"/g) || []).length, 2, 'pill next to the name in both renderers');
  assert.match(cc, /W\.LowiChatPost\.attach\(ov,/);
});
test('Save photo draws the post with its text; Save puts it into My posts > Saved', () => {
  const P = require(path.join(__dirname, '..', 'chat-post-save.js')), h = R('index.html');
  const m = s => s.length * 10;
  assert.deepEqual(P.wrap('one two three four', 100, m, 3), ['one two', 'three four']);
  const cut = P.wrap('aa bb cc dd ee ff gg', 50, m, 2); assert.equal(cut.length, 2); assert.ok(cut[1].endsWith('…'));
  assert.match(P.fileName(new Date(2026, 10, 22, 2, 1, 5)), /^lowispike-20261122-020105\.jpg$/);
  assert.match(h, /const chatSaved = \(window\.LowiChatPost \? LowiChatPost\.saved\(\) : \[\]\)/);
  assert.match(h, /case "open-chatsaved":/);
  assert.match(R('sw.js'), /STATIC\.push\("chat-post-save\.js"\)/);
});
test('chat photo post: own words, name with a liquid-glass spike badge, numbers; nothing floating over it; Save photo, Save and edit work', () => {
  const css = R('chat-meal-post.css'), cc = R('community-chat.js'), ps = R('chat-post-save.js'), h = R('index.html'), sql = R('supabase/proposals/meal_caption_edit_20261122.sql');
  assert.match(css, /\.cs-by \.cs-meal-bs\{border-radius:999px!important;[^}]*backdrop-filter:blur\(18px\) saturate\(180%\)/, 'glass badge');
  assert.match(css, /html\.lw-chat-on body #cmPaneChat#cmPaneChat#cmPaneChat#cmPaneChat \.cr-down\{display:none!important/, 'no scroll arrow over posts (the back is top-left since 22 Nov 2026, off the photos)');
  assert.match(h, /classList\.toggle\("lw-chat-on"/);
  assert.match(css, /\.cps-b\{display:inline-flex/, 'styled buttons');
  assert.match(cc, /K\.mealBody\(src,title,food\.lvl,cap\|\|''\)/, 'the AI description never becomes the caption');
  assert.match(cc, /sb\.rpc\('set_meal_caption',\{msg_id:String\(m\.id\),new_body:nb\}\)/, 'edit the text on screen afterwards');
  assert.match(ps, /data-cps="edit"/);
  assert.match(ps, /p\.nums/, 'the saved picture carries name, badge and numbers');
  assert.match(sql, /only the caption may change/);
});
test('Studio (22 Nov): two sections, app language, share, transcript / translate / copy for agent, next, owner fill with AI', () => {
  const st = R('studio/index.html'), fn = R('supabase/functions/studio-ai/index.ts');
  assert.match(st, /data-tab="swipe"/); assert.match(st, /data-tab="agent"/);
  assert.doesNotMatch(st, /id="chips"|Ordner verwalten/, 'no folders');
  assert.match(st, /localStorage\.getItem\('lowispike\.lang'\)/, 'follows the app language');
  assert.match(st, /id="share"/); assert.match(st, /navigator\.share/);
  assert.match(st, /data-a="tr"/); assert.match(st, /data-a="lang"/); assert.match(st, /data-a="copy"/);
  assert.match(st, /data-a="next"/); assert.match(st, /data-a="prev"/);
  assert.match(st, /action: 'fill'/); assert.match(st, /SB\.rpc\('is_app_owner'\)/); assert.match(st, /SB\.rpc\('studio_save', \{doc: DOC\}\)/);
  assert.match(st, /fetch\('cards\.json'/, 'built-in items still come from cards.json');
  assert.match(fn, /if \(!\(await isOwner\(req\)\)\) return out\(req, 403, \{ error: "owner_only" \}\)/, 'fill is owner only');
  assert.match(fn, /GEMINI_API_KEY/);
});
test('Studio: only Swipe file and Agent file, no folders', () => { const st = R('studio/index.html'); assert.match(st, /data-tab="swipe"/); assert.match(st, /data-tab="agent"/); assert.doesNotMatch(st, /id="chips"|Ordner verwalten|defaultFolders/); });
test('Studio: speaks the app language (EN/DE/ES) and starts in English', () => { const st = R('studio/index.html'); assert.match(st, /<html lang="en">/); assert.match(st, /swipe: \['Swipe file', 'Swipe-Datei', 'Archivo de swipe'\]/); });
test('Studio: share button at the top and on each open item', () => { const st = R('studio/index.html'); assert.match(st, /class="ib" id="share"/); assert.match(st, /data-a="share"/); });
test('Studio: an open video has Copy for agent, Transcript, Translate and Previous / Next', () => { const st = R('studio/index.html'); for (const a of ['copy', 'tr', 'lang', 'prev', 'next']) assert.match(st, new RegExp('data-a="' + a + '"')); });
test('Studio: Copy for agent carries link, transcript and strategy', () => { const st = R('studio/index.html'); assert.match(st, /'Link: ' \+ \(x\.link \|\| '-'\)/); assert.match(st, /t\('transcript'\) \+ ':'/); assert.match(st, /t\('strategy'\) \+ ':'/); });
test('Studio: the owner adds a video by link + transcript and lets the AI fill hook, strategy and why', () => { const st = R('studio/index.html'); assert.match(st, /ai\(\{action: 'fill', link: v\('f_link'\), transcript: v\('f_tr'\), lang: L\}\)/); assert.match(st, /data-add="swipe"/); assert.match(st, /data-add="agent"/); });
test('studio-ai: fill is owner only, uses the server Gemini key, translate limited to en/de/es', () => { const fn = R('supabase/functions/studio-ai/index.ts'); assert.match(fn, /return out\(req, 403, \{ error: "owner_only" \}\)/); assert.match(fn, /Deno\.env\.get\("GEMINI_API_KEY"\)/); assert.match(fn, /const LANG: Record<string, string> = \{ en: "English", de: "German", es: "Spanish" \}/); });
test('if nav-moves.js failed to load, the app loads it again (else the old Community header shows)', () => {
  const h = R('index.html');
  const a = h.indexOf('<script src="nav-moves.js'), b = h.indexOf('if(window.LowiNavMoves||n>2)return;');
  assert.ok(a > 0 && b > a, 'the retry sits right after nav-moves.js');
  assert.match(h, /s\.src="nav-moves\.js\?r="\+Date\.now\(\)/);
});
test('For You shows only shared links; photos, uploaded videos and text posts stay out', () => {
  const h = R('index.html');
  assert.match(h, /const fyIsLink = p => !!\(p && p\.url && !p\.photo && !p\.vid\);/);
  assert.match(h, /function feed\(\)\{ const all = feedAll\(\)\.filter\(fyIsLink\);/, 'only links in the feed');
});
test('Studio: the owner can delete any video or prompt for good, built-in ones too', () => {
  const st = R('studio/index.html');
  assert.match(st, /if \(x\.builtin\) \{ DOC\.items = DOC\.items \|\| \{\}; DOC\.items\[x\.id\] = \{gone: true\}; \}/);
  assert.match(st, /var keep = function \(x\) \{ return !x\.gone; \};/, 'a deleted one never shows again, also not in edit mode');
});
test('AI: Deep analyze links open the in-app chat instead of the Custom GPT', () => { const a = R('lowi-ask.js'); assert.match(a, /closest\('a\[href\*="chatgpt\.com\/g\/"\], a\[href\*="chat\.openai\.com\/g\/"\]'\)/); assert.match(a, /e\.preventDefault\(\); e\.stopImmediatePropagation\(\);/); assert.ok(R('index.html').indexOf('src="lowi-ask.js') > R('index.html').indexOf('src="gpt-open.js')); });
test('AI: the chat keeps the conversation on the phone only and says it is not medical advice', () => { const a = R('lowi-ask.js'); assert.match(a, /sessionStorage\.setItem\(KEY/); assert.doesNotMatch(a, /localStorage\.setItem\(KEY/); assert.match(a, /Not medical advice/); });
test('AI: Misty\'s card has Talk to Misty', () => { const h = R('misty-hub.js'); assert.match(h, /data-mh="talk"/); assert.match(h, /else if \(k === 'talk'\)/); });
test('AI: chat messages can be translated from the ··· menu', () => { const c = R('community-chat.js'); assert.match(c, /item\('translate',tr\('translate'\),'reply'\)/); assert.match(c, /else if\(a==='translate'\)/); });
test('AI: a For You link is checked before it goes to the tribe; if the AI cannot answer it still goes', () => { const h = R('index.html'); assert.match(h, /LowiAsk\.call\(\{action: "linkcheck"/); assert.match(h, /\.then\(j => \{ if \(j && j\.fits === false\)/); assert.match(h, /\}, go\);/); });
test('AI server: per-person daily limits and a whole-app cap under the free quota', () => { const f = R('supabase/functions/lowi-ai/index.ts'), q = R('supabase/proposals/ai_usage_20261122.sql'); assert.match(f, /export const LIMITS: Record<string, number> = \{ ask: 15, translate: 20, linkcheck: 10, mealfix: 15 \};/); assert.match(f, /export const GLOBAL = 400;/); assert.match(q, /grant execute on function public\.ai_take\(text, text, int, int\) to service_role;/); assert.match(q, /revoke execute on function public\.ai_take\(text, text, int, int\) from public, anon, authenticated;/); });
test('AI server: Misty never gives glucose numbers, diagnoses or medication advice', () => { const f = R('supabase/functions/lowi-ai/index.ts'); assert.match(f, /never give blood sugar or glucose numbers, never diagnose, never talk about medication doses/); });
test('Studio Edit: X toggle on every item and a mass delete bar (22 Nov 2026)', () => {
  const s = require('fs').readFileSync(require('path').join(__dirname, '..', 'studio', 'index.html'), 'utf8');
  assert.match(s, /function xbox\(x\)/); assert.match(s, /data-x role="checkbox"/); assert.match(s, /data-sel="del"/); assert.match(s, /ids\.forEach\(delOne\)/);
  assert.match(s, /confirmDelN: \['Delete \{n\} for good\?', '\{n\} endgültig löschen\?'/); });
test('Studio Agent file is a grid of covers with the title as text on screen (22 Nov 2026)', () => {
  const s = require('fs').readFileSync(require('path').join(__dirname, '..', 'studio', 'index.html'), 'utf8');
  assert.match(s, /'<button class="tile ag'/); assert.match(s, /<q>' \+ esc\(x\.title\) \+ '<\/q>/); assert.match(s, /data-add="agent"><span>\+<\/span>/); });
