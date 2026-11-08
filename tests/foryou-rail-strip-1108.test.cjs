'use strict';
/* Nov 8 2026 (Emmanuel: "where the save button is, the swipe button, the share button, the post button, all the buttons are just wrong ...
   That's not how a social media platform would do it" and "when I uploaded the carousels, I wasn't able to scroll through them ... a little
   bit more bigger ... see if the text is right, which one I want to delete. I wasn't able to swipe right or swipe left"). Browser check:
   Chromium 393 x 852: rail icons in glass circles, slim top row; 3 picked pictures 112 x 140 in a strip that scrolls sideways; a tap opens
   them full size (2 / 3), "Dieses entfernen" removes that one. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('foryou-rail.css'), js = read('carousel-review.js'), html = read('index.html');

test('rail: each button is an icon in a small dark glass circle with a short label', () => {
  assert.match(css, /\.fy-slide \.fy-act svg\{box-sizing:border-box;width:46px;height:46px;padding:11px;border-radius:50%;background:rgba\(8,12,24,\.42\)/);
  assert.match(css, /#cmFeed \.fy-tops\{top:10px;right:10px;flex-direction:row;/, 'one slim top row');
  assert.match(css, /#cmFeed \.fy-tops \.fy-svd span\{display:none\}/, 'Saved as a bookmark pill (its name stays for VoiceOver)');
});

test('New post strip scrolls sideways with bigger pictures; a tap opens them full size with remove', () => {
  assert.match(css, /#trCompose \.tr-strip\{flex-wrap:nowrap!important;overflow-x:auto!important;/);
  assert.match(css, /#trCompose \.tr-strip \.tr-thumbsm\{width:112px;height:140px;/);
  assert.match(js, /const im = t\.closest\('#trCompose \.tr-strip \.tr-thumbsm'\);/);
  assert.match(js, /const x = D\.querySelectorAll\('#trCompose \.tr-strip \.tr-phx'\)\[at\]; if \(x\) x\.click\(\);/, 'removal uses the strip\'s own ×');
  assert.match(css, /\.crv-tr\{[^}]*scroll-snap-type:x mandatory/);
});

test('both load in the app and work offline', () => {
  assert.match(html, /<script src="post-link-core\.js\?v=[^"]+"><\/script>\n<link rel="stylesheet" href="foryou-rail\.css\?v=[^"]+">\n<script src="carousel-review\.js\?v=/);
  assert.ok(read('sw.js').includes('"post-link-core.js", "foryou-rail.css", "carousel-review.js"'));
});
