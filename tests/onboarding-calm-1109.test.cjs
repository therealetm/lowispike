'use strict';
/* Nov 9 2026 (Emmanuel, from people who tried it: "wenn man das öffnet, ist man direkt overwhelmed ... a bit confused. But the goal of the
   onboarding was not to overwhelm them"; the video is out of date). One thing per screen. Browser check (Chromium 393 x 852, German):
   iPhone Safari first screen: walkthrough, one line, heading, "Hab ich hinzugefügt" on the first view (no device chooser, no "Gezeigt",
   no video pill, no long reason); app start: companion, headline, one line, Loslegen; name: bubble, field, button; Create account has
   its back button again; setup: birthday with "Mehr (optional)" folded, companion reveal, then goals with "Mehr über dich (optional)". */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('onboarding-calm.css'), html = read('index.html'), hs = read('herb-start.js');

test('first screens: one headline, one line, the next step; the rest is hidden, the outdated video pill too', () => {
  /* test changed, why (Nov 9 2026, later the same day): the video was remade from today's app (37 s, German + English), so the app's
     first screen shows it again as one small pill (tests/tour-video-1109); the browser's install screen keeps it hidden */
  for (const sel of ['.r2-start.a1-first .ig-pick', '.r2-start.a1-first .ig-sel', '.r2-start.a1 .a1-qt', '.r2-start.a1-first .a1-why', '.r2-start.hs[data-hs-step="0"] .hs-over', '.r2-start.hs[data-hs-step="0"] .hs-habits'])
    assert.ok(css.includes(sel), sel);
  assert.ok(!/\.r2-start\.hs \.hs-qt \{ display: none/.test(css), 'the step 0 pill is not hidden any more');
  assert.match(css, /\.r2-start\.a1-first \.ig-stage \{ min-height: 0; max-height: 46vh; \}/, 'the button stays on the first view');
  assert.match(hs, /plantP:'Jede gesunde Gewohnheit l\\u00e4dt deinen Begleiter auf\.'/);
  assert.match(hs, /ask:'Hi! Ich bin dein Begleiter\. Wie hei\\u00dft du\?'/, 'Begleiter, not Lichtwesen');
  assert.match(html, /<link rel="stylesheet" href="install-guide\.css\?v=[^"]+">\n<link rel="stylesheet" href="onboarding-calm\.css\?v=/);
  assert.ok(read('sw.js').includes('"onboarding-calm.css"'));
});

test('Create account keeps its own back button (the round bottom button never takes controls inside the start gate)', () => {
  assert.match(read('bottom-close.js'), /const NEVER = '#r2gate \*,/);
});

test('setup after the account: birthday, the companion, what you want; extras fold; photo and shopping rhythm are not asked', () => {
  assert.match(html, /const OB_CALM = true;\nconst obShop = \(\) => !OB_CALM && /);
  assert.match(html, /\(OB_CALM \? \[0,2\] : obShop\(\) \? \[0,1,2,3\] : \[0,1,2\]\)/, 'two dots');
  assert.match(html, /\(OB_CALM \? '<details class="r2-more"><summary>More \(optional\)<\/summary><div class="r2-more-in">' : ''\) \+\n\s+'<label class="r2-fl date r2ob-btime">/, 'birth time and type fold away');
  assert.match(html, /\} else if \(ob\.step === 1 && OB_CALM\) \{\n\s+ob\.step = 2; return paintOb\(\);/, 'no photo step');
  assert.match(html, /\(OB_CALM \? obW \+ '<details class="r2-more"' \+ \(ob\.moreOpen \? ' open' : ''\) \+ '><summary>More about you \(optional\)<\/summary>/);
  assert.ok(html.includes('["More (optional)", "Mehr (optional)", "Más (opcional)"]') && html.includes('["More about you (optional)", "Mehr über dich (optional)", "Más sobre ti (opcional)"]'));
  const i = html.indexOf("'<div id=\"r2obSign\">' + signReveal() + '</div>' +"), j = html.indexOf("r2ob-share", i), k = html.indexOf('<details class="r2-more">', i);
  assert.ok(i > 0 && j > i && j < k, 'what is shared on the Community card is said outside the fold');
  assert.match(css, /\.r2-ob \.r2-sign\.empty \{ display: none; \}/);
});
