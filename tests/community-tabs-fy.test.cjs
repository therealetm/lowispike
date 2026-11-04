/* 24 Oct 2026 (Emmanuel, on the Community tab bar Rangliste · Chat · Raum · Affiliates · Erstellen: "Let's put the fyp here.
   And fuse Erstellen & Affiliates zusammen"): For You is a Community tab (moved from Cook, one home), and Creation + Affiliates
   are one tab, Studio, with a small Affiliates | Creation switch. 4 Nov 2026: Studio is removed from the app (four tabs). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../community-tab-order.js');
const UI = R('community-rooms-ui.js');

test('four tabs since Studio was removed (4 Nov 2026), each label one short word in every language', () => {
  assert.deepStrictEqual(C.IDS, ['room', 'chat', 'fy', 'rank']);
  const lab = k => { const m = UI.match(new RegExp('[ ,{]' + k + ":\\['([^']+)','([^']+)','([^']+)'\\]")); assert.ok(m, k + ' has en/de/es'); return m.slice(1); };
  assert.deepStrictEqual(lab('fy'), ['For You', 'Für dich', 'Para ti']);
  for (const k of C.IDS) for (const t of lab(k)) assert.ok(t.length <= 10, k + ': "' + t + '" fits a quarter of a small phone');
});

test('Studio is gone from the app: no Affiliates or Creation page, no tab, no welcome card, old links just open Community', () => {
  assert.match(UI, /const VIEWS=\{\},PANES=/, 'no in-app page for Affiliates or Creation');
  assert.doesNotMatch(UI, /affiliates\/'|'create\/'/);
  assert.doesNotMatch(UI, /rows\.push\(\{k:'aff'/); assert.doesNotMatch(UI, /rows\.push\(\{k:'create'/);
  assert.match(UI, /const v=m\[1\]==='ranking'\?'rank':m\[1\]==='foryou'\?'fy':'';/, 'an old #community/affiliates link opens Community, nothing else');
  assert.ok(!C.IDS.includes('studio'));
});

test('For You: a pane like Ranking, opened on purpose without the first-tab rule taking it back, with a #community/foryou link', () => {
  assert.match(UI, /PANES=\{chans:1,rank:1,fy:1\}/);
  assert.match(UI, /\(affiliates\|create\|ranking\|foryou\)/);
  assert.match(UI, /m\[1\]==='foryou'\?'fy'/);
  assert.match(UI, /function openOn\(v\)\{try\{if\(W\.LowiCommunityTabs&&W\.LowiCommunityTabs\.want\)W\.LowiCommunityTabs\.want\(\);/);
  assert.match(R('community-tab-order.js'), /deep \|\| Date\.now\(\) - wantStamp < FRESH_MS \* 2/);
  assert.match(UI, /if\(f==='create'\|\|f==='aff'\|\|f==='rank'\|\|f==='fy'\)\{showView\(f\);return true;\}/, 'back from a chat opened on For You returns to For You');
  const css = R('community-rooms.css');
  assert.match(css, /\[data-rm-view=fy\]>\.rm-view>\.rm-fy:not\(\[hidden\]\)\{display:block;/);
  assert.match(css, /#cmPaneChat \.rm-fy \.fy-rail,#cmPaneChat \.rm-fy \.fy-meta\{bottom:16px\}/, 'beats the tablet rule for the full-screen feed');
});

test('Cook has no For You button; the tour points at the new tabs', () => {
  assert.ok(!R('index.html').includes('ck-fy" data-nm="fy"'));
  const steps = R('tutorial-steps.js');
  assert.ok(!steps.includes('.rm-tab[data-rm="create"]') && !steps.includes('.rm-tab[data-rm="aff"]'), 'no tour card points at a tab that is gone');
  /* 4 Nov 2026: Studio (Creation + Affiliates) is removed from the app, so the tour no longer covers them */
  const TS = require('../tutorial-steps.js');
  assert.strictEqual(TS.covered().creation, undefined); assert.strictEqual(TS.covered().affiliates, undefined);
  assert.ok(TS.STEPS.find(s => s.id === 'community').demo.open === 'community-tab', 'the Community card opens the real Community tab');
  assert.ok(!/For You is in Cook/.test(steps));
  assert.match(R('tutorial.js'), /else if \(!b && W\.LowiRoomsUI && W\.LowiRoomsUI\.showView/);
});
