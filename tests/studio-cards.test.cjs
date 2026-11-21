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
  assert.match(st, /class="tile"/);
  assert.match(st, /Für meinen Agenten kopieren/);
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
  assert.match(st, /youtu\\\.\?be/, 'YouTube links get no preview tile');
  assert.match(st, /class="cv' \+ \(th \? '' : ' nf'\)/, 'designed fallback cover');
  assert.match(st, /Nur mein eigenes Gesicht und meine eigene Stimme/);
  assert.match(st, /vor jedem Render|Kosten in Credits/);
});
