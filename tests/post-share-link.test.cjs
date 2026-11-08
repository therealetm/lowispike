'use strict';
/* Nov 8 2026 (Emmanuel: "the share button ... sends it to the community. That's unnecessary ... I should be able to send it, copy it, and
   then send that directly to someone on WhatsApp so they can see it, open it, scroll through it"). Teilen on a For You post makes a link
   to post/ with the post inside it; the page shows it without an account. Browser check: Chromium, an 8-picture carousel link -> post/
   shows 8 pictures, swipe and dots, 1/8 -> 2/8; a link with a foreign picture shows nothing from it. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const K = require('../post-link-core.js');
const M = 'https://abcdefghijkl.supabase.co/storage/v1/object/public/media/1234-uid/';

test('a carousel travels in the link and comes back the same, short', () => {
  const slides = [1, 2, 3, 4, 5, 6, 7, 8].map(i => M + 'p_9' + (i > 1 ? '-' + i : '') + '.jpg');
  const url = K.encode({ who: 'eman', cap: 'An insulin friendly EU-African week', photo: slides[0], slides }, 'https://x/lowispike/post/');
  assert.match(url, /^https:\/\/x\/lowispike\/post\/#d=[A-Za-z0-9_-]+$/);
  assert.ok(url.length < 700, 'short enough for WhatsApp: ' + url.length);
  const p = K.decode(url.slice(url.indexOf('#')));
  assert.deepEqual(p, { w: 'eman', c: 'An insulin friendly EU-African week', s: slides, v: '' });
});

test('umlauts and emoji survive', () => {
  const p = K.decode(K.encode({ who: 'Jürgen', cap: 'Döner ohne Brot 🥙', photo: M + 'a.jpg' }));
  assert.equal(p.w, 'Jürgen'); assert.equal(p.c, 'Döner ohne Brot 🥙');
});

test('only our own media storage; a picture not uploaded yet gives no link', () => {
  assert.equal(K.encode({ cap: 'x', photo: 'data:image/jpeg;base64,AAAA' }), '', 'still on the phone');
  assert.equal(K.encode({ vid: 1, cap: 'x' }), '', 'video not uploaded');
  assert.ok(K.encode({ cap: 'Nur Text' }), 'a text post is fine');
  const bad = '#d=' + Buffer.from(JSON.stringify({ c: 'hi', s: ['https://evil.example/x.jpg', 'javascript:alert(1)'] })).toString('base64').replace(/=+$/, '');
  assert.deepEqual(K.decode(bad).s, [], 'foreign pictures are dropped');
  assert.equal(K.decode('#d=!!!'), null);
});

test('the rail button is Teilen, it uses the share sheet or copies; the page escapes the caption', () => {
  const html = read('index.html'), page = read('post/index.html');
  assert.match(html, /case "share-link": fyShareLink\(id\); break;/);
  const i = html.indexOf('function fyShareLink(id){'), fn = html.slice(i, html.indexOf('\n}', i));
  assert.match(fn, /K\.encode\(p, base\)/);
  assert.match(fn, /navigator\.share\(\{title, text:title, url\}\)/);
  assert.match(fn, /navigator\.clipboard\.writeText\(url\)/);
  assert.match(fn, /Still uploading\. Try again in a moment\./);
  assert.match(page, /<script src="\.\.\/post-link-core\.js"><\/script>/);
  assert.match(page, /'<p class="cap">' \+ esc\(p\.c\) \+ '<\/p>'/);
  assert.match(page, /scroll-snap-type:x mandatory/);
  assert.match(page, /<a class="go" id="go" href="\.\.\/#fy">/);
});
