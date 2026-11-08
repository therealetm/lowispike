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

/* Nov 8 2026, later (Emmanuel: "the link ... looks horrible ... They're gonna think I'm hacking them ... shorter? Why is it so long?"):
   an uploaded post's pictures follow one storage pattern, so the link carries only the user id (22 letters), the number of pictures
   and the post id: post/?k=..., about 80 characters in all. */
test('the short link: about 80 characters, and it opens the same pictures', () => {
  const H = 'https://vnfwmifmsfecascwaody.supabase.co/storage/v1/object/public/media/', u = '3f2a9c1e-7b44-4d2e-9a10-0c5e8b7d6f21', id = 'tlq3x9a2k7b1';
  const sl = [0, 1, 2, 3, 4, 5, 6, 7].map(i => H + u + '/' + id + (i ? '-' + (i + 1) : '') + '.jpg');
  const url = K.encode({ who: 'eman', cap: 'An insulin friendly EU-African week', photo: sl[0], slides: sl }, 'https://therealetm.github.io/lowispike/post/');
  assert.match(url, /^https:\/\/therealetm\.github\.io\/lowispike\/post\/\?k=[A-Za-z0-9_-]{22}8tlq3x9a2k7b1$/);
  assert.ok(url.length <= 90, url.length);
  assert.deepEqual(K.fromUrl(url.slice(url.indexOf('?')), '').s, sl);
  const v = K.fromUrl('?k=' + K.short({ vid: 1, vurl: H + u + '/' + id + '.mp4' }), '');
  assert.equal(v.v, H + u + '/' + id + '.mp4');
  assert.equal(K.short({ photo: H + u + '/' + id + '.jpg', slides: [H + u + '/' + id + '.jpg', H + u + '/other.jpg'] }), '', 'pictures off the pattern keep the long link');
  assert.equal(K.fromUrl('?k=short', ''), null);
  assert.match(read('post/index.html'), /K\.fromUrl\(location\.search, location\.hash\)/);
});

/* Nov 8 2026, later (Emmanuel: "when I go into my app and I try to copy it, nothing happens" and, in a private browser, the pictures
   showed a "?"). Teilen opens a card: the link, WhatsApp (wa.me with the text and the link), Link kopieren (copies in the same tap,
   else selects the link), Mehr (the phone's share sheet). A picture that cannot be loaded says so; if the first one fails the page says
   the post may be deleted. Browser check: card opens, Link kopieren -> "Kopiert"; a link whose pictures answer 400 -> the message. */
test('the share card and the missing-picture message', () => {
  const sh = read('share-sheet.js'), html = read('index.html'), page = read('post/index.html');
  assert.match(html, /if \(window\.LowiShareSheet\) \{ LowiShareSheet\.open\(\{url, title, text:title\}\); return; \}/);
  assert.match(sh, /href="https:\/\/wa\.me\/\?text=' \+ encodeURIComponent\(text\) \+ '"/);
  assert.match(sh, /navigator\.clipboard\.writeText\(cur\.url\)\.then\(ok, manual\)/);
  assert.match(sh, /D\.execCommand\('copy'\)/);
  assert.match(page, /Dieses Bild ist nicht mehr verfügbar\./);
  assert.match(page, /if \(k === 0 \|\| bad === n\)/);
  assert.ok(read('sw.js').includes('"carousel-review.js", "share-sheet.js"'));
});
