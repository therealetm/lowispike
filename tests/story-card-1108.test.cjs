'use strict';
/* Nov 8 2026 roadmap item 1 (Emmanuel: "we even give them an option to save it so that they can now post it on ... Instagram or TikTok.
   And everything's already done ... an automatic description ... that they could copy"). The share card has "Als Story speichern"
   (a 1080 x 1920 picture made on the phone, shared as a file or downloaded) and "Beschreibung kopieren" (caption, hashtags, link).
   Browser check: Chromium, a 3-picture post -> story picture with the whole picture in a glass frame, name, caption, footer. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const S = require('../story-card.js');

test('the description: caption, hashtags, link', () => {
  assert.equal(S.caption({ cap: 'Kontomire ohne Yam', url: 'https://x/post/?k=a' }, 'de'), 'Kontomire ohne Yam\n\n#lowispike #blutzuckerfreundlich #ohnezucker #gesundessen #foodswap\nhttps://x/post/?k=a');
  assert.match(S.caption({}, 'en'), /^#lowispike #bloodsugarfriendly/);
});

test('long captions wrap to three lines with an ellipsis', () => {
  const lines = S.wrap('one two three four five six seven eight nine ten eleven twelve', 20, t => t.length * 2, 3);
  assert.equal(lines.length, 3); assert.match(lines[2], /…$/);
});

test('the story picture: 1080 x 1920, shared as a file, never uploaded; reachable from Teilen', () => {
  const src = read('story-card.js'), sh = read('share-sheet.js'), html = read('index.html');
  assert.equal(S.SW, 1080); assert.equal(S.SH, 1920);
  assert.match(src, /navigator\.canShare\(\{ files: \[file\] \}\)\) \{ await navigator\.share\(\{ files: \[file\] \}\);/);
  assert.match(src, /a\.download = 'lowispike-story\.jpg'/);
  assert.doesNotMatch(src, /fetch\(|\.upload\(/, 'made on the phone only');
  assert.match(sh, /class="shs-story">' \+ L\('Save as story', 'Als Story speichern'\)/);
  assert.match(html, /story:\{img:pic, name:p\.me \?/);
  assert.match(html, /<script src="story-card\.js\?v=[^"]+"><\/script>\n<script src="share-sheet\.js\?v=/);
});
