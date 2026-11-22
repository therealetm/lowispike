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
test('page renders from cards.json and has no generate/post button', () => {
  const h = R('studio/index.html');
  assert.match(h, /fetch\('cards\.json'/);
  assert.doesNotMatch(h, />\s*(Generieren|Generate|Veröffentlichen|Publish)\s*</i);
});
test('For You tool row: Post, My posts, Saved, Create content -> studio/, no Affiliate (removed 21 Nov), inside the feed', () => {
  const h = R('index.html');
  assert.match(h, /'<div class="fy-feed" id="fyFeed">' \+ fyToolsHTML\(\)/);
  assert.match(h, /Content erstellen/);
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
test('Studio is a tool: tiles, one copy button with your profile, copy only reports success when it worked', () => {
  const st = R('studio/index.html');
  assert.match(st, /class="tile/);
  assert.match(st, /Für Agent kopieren/);
  assert.match(st, /function buildPrompt/);
  assert.match(st, /lowi\.studio\.me\.v1/);
  assert.match(st, /Dein Agent erstellt, du postest selbst/);
  assert.match(st, /copy\(text\)\.then\(function \(ok\) \{ if \(!ok\) return fallback\(text\)/);
});
test('Studio shows videos: cover tiles, view counts, three ways to remake, no YouTube preview, fallback never empty', () => {
  const st = R('studio/index.html');
  assert.match(st, /tiktok-meta/);
  assert.match(st, /Mich ersetzen: Higgsfield/);
  assert.match(st, /Mich ersetzen: Agent-Avatar/);
  assert.match(st, /youtu\\.\?be/, 'YouTube links get no preview tile');
  assert.match(st, /class="cv' \+ \(th \? '' : ' nf'\)/, 'designed fallback cover');
  assert.match(st, /Nur mein eigenes Gesicht und meine eigene Stimme/);
  assert.match(st, /vor jedem Render|Kosten in Credits/);
});
test('Studio looks like Instagram Explore: search, topic chips, 3-column edge-to-edge grid with view counts, tap opens a post with our guide', () => {
  const st = R('studio/index.html');
  assert.match(st, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(st, /id="q" type="search"/);
  assert.match(st, /id="chips"/);
  assert.match(st, /class="vw"/);
  assert.match(st, /id="post"/);
  assert.match(st, /class="chk"/, 'guide steps as a checklist where the caption would be');
  assert.doesNotMatch(st, /<nav class="tabs"/, 'no bottom tab pill');
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
  assert.match(h, /data-tr="list-tab" data-k="mine"/);
  assert.match(h, /data-tr="list-tab" data-k="saved"/);
  assert.match(h, /case "list-tab": listSheet\(b\.dataset\.k\); break;/);
  assert.match(h, /\["posts", "Beiträge", "publicaciones"\]/);
});
test('Studio: real folders the owner can rename and fill, sort by most views, owner-only edits saved on the server', () => {
  const st = R('studio/index.html'), sql = R('supabase/proposals/studio_config_20261121.sql');
  assert.match(st, /function defaultFolders\(\)/);
  assert.match(st, /SORT === 'views'/);
  assert.match(st, /SB\.rpc\('is_app_owner'\)/, 'edit mode only for the owner, decided by the server');
  assert.match(st, /SB\.rpc\('studio_save', \{doc: DOC\}\)/);
  assert.match(st, /Video hinzufügen/);
  assert.match(sql, /if not coalesce\(public\.is_app_owner\(\), false\) then/);
  assert.match(sql, /revoke all on public\.studio_config from anon, authenticated;/, 'no direct writes');
  assert.match(sql, /octet_length\(doc::text\) > 400000/);
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
test('Studio: folders can be renamed and deleted in one place', () => {
  const st = R('studio/index.html');
  assert.match(st, /data-add="manage">✎ Ordner verwalten/);
  assert.match(st, /function manageDlg\(\)/);
  assert.match(st, /k === 'msave'/);
  assert.match(st, /k === 'mdel'/);
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
