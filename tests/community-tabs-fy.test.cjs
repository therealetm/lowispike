/* 24 Oct 2026 (Emmanuel, on the Community tab bar Rangliste · Chat · Raum · Affiliates · Erstellen: "Let's put the fyp here.
   And fuse Erstellen & Affiliates zusammen"): For You is a Community tab (moved from Cook, one home), and Creation + Affiliates
   are one tab, Studio, with a small Affiliates | Creation switch. The bar stays at five tabs with one-word labels. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../community-tab-order.js');
const UI = R('community-rooms-ui.js');

test('five tabs, and each label is one short word in every language (Für dich is the German name the app already used)', () => {
  assert.strictEqual(C.IDS.length, 5);
  const lab = k => { const m = UI.match(new RegExp('[ ,{]' + k + ":\\['([^']+)','([^']+)','([^']+)'\\]")); assert.ok(m, k + ' has en/de/es'); return m.slice(1); };
  assert.deepStrictEqual(lab('fy'), ['For You', 'Für dich', 'Para ti']);
  assert.deepStrictEqual(lab('studio'), ['Studio', 'Studio', 'Estudio']);
  for (const k of C.IDS) for (const t of lab(k)) assert.ok(t.length <= 10, k + ': "' + t + '" fits a fifth of a small phone');
});

test('Studio keeps both pages: the switch shows only in Studio, opens the half used last, and arrow keys move between them', () => {
  assert.match(UI, /const STUDIO_KEY='lowispike\.community\.studio';/, 'remembered per user (lowispike.* keys go to the account backup)');
  assert.match(UI, /function studioLast\(\)\{try\{return localStorage\.getItem\(STUDIO_KEY\)==='create'\?'create':'aff';/, 'Affiliates first');
  assert.match(UI, /if\(v==='studio'\)v=studioLast\(\);/);
  assert.match(UI, /sw\.hidden=!on;/);
  assert.match(UI, /\['aff','create'\]\.map\(k=>'<button type="button" role="tab" class="rm-swb" data-rmsw="'\+k\+'"><\/button>'\)/);
  assert.match(UI, /e\.key!=='ArrowRight'&&e\.key!=='ArrowLeft'/);
  assert.match(UI, /sel=view==='chans'\?'chat':tabOfView\(view\)/, 'the Studio tab lights up on either half');
  assert.match(UI, /if\(VIEWS\[view\]\)it\.push\(\['copyview'/, 'the page link is only offered on a real page');
  const css = R('community-rooms.css');
  assert.match(css, /\.rm-view>\.rm-sw\[hidden\]\{display:none\}/);
  assert.match(css, /\.rm-view>\.rm-sw::before\{[^}]*transform:translateX\(calc\(var\(--rm-sw-i,0\)/, 'same sliding glow as the tab bar');
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
  assert.match(steps, /'\.rm-sw \[data-rmsw="create"\]', '\.rm-tab\[data-rm="studio"\]'/);
  assert.ok(!/For You is in Cook/.test(steps));
  assert.match(R('tutorial.js'), /else if \(!b && W\.LowiRoomsUI && W\.LowiRoomsUI\.showView/);
});
