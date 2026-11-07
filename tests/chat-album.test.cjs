'use strict';
/* Nov 7 2026 (Emmanuel: "when I post on the For You page, I want to be able to choose to also push that into the community. And then
   inside of the community, they should be able to flick through the images ... without having to open it ... like Sesame AI ... or
   iMessage ... And if you long press, then that you can save the image").
   - An album message: '📷 <.../media/<uid>/chat-<id>-1.jpg> ⧉<n> caption'; pictures 2..n sit next to it (chat-<id>-2.jpg ...), so the
     message stays short; older clients show the first picture.
   - In the chat it swipes sideways inside its bubble with dots; a tap opens the picture, a hold saves it (chat-photo-save.js).
   - New post: "Auch in den Community-Chat" sends the post's pictures to the current room (one = chat photo, 2-8 = album).
   Browser walk (scratch, Chromium, network blocked): two albums drawn (3 and 2 pictures), a swipe lit the second dot; a week carousel
   posted with the switch on handed 6 pictures and the caption to the chat (screenshots checked). The real upload uses the same
   media bucket and outbox as every chat photo; it was not run against the server here. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const K = require('../community-chat-core.js');
const U = 'https://abcdefghijkl.supabase.co/storage/v1/object/public/media/user1234/chat-abc123';

test('an album is short, carries 2 to 8 pictures of the sender only, and old clients still see a photo', () => {
    const b = K.albumBody(U + '-1.jpg', 3, 'Meine Woche');
    assert.equal(b, '\u{1F4F7} ' + U + '-1.jpg ⧉3 Meine Woche');
    assert.deepEqual(K.album(b, 'user1234'), { srcs: [U + '-1.jpg', U + '-2.jpg', U + '-3.jpg'], caption: 'Meine Woche' });
    assert.equal(K.album(b, 'someoneelse'), null, 'only the sender\'s own folder');
    assert.ok(K.photo(b, 'user1234'), 'a photo for older clients (and the outbox check)');
    assert.equal(K.albumBody(U + '-1.jpg', 1, ''), '', 'one picture is a photo, not an album');
    assert.equal(K.albumBody(U + '-1.jpg', 9, ''), '', 'never more than 8');
    assert.equal(K.albumBody(U + '-2.jpg', 3, ''), '', 'always starts at picture 1');
    assert.ok(K.albumBody(U + '-1.jpg', 8, 'x'.repeat(900)).length <= 600, 'stays within a message');
});

test('the chat swipes an album inside its bubble, with dots', () => {
    const js = read('community-chat.js'), css = read('community-chat.css');
    assert.match(js, /const al=albumOf\(m\);if\(al\)return albumHtml\(al,m\);const ph=photoOf\(m\);/);
    assert.match(js, /<div class="cs-album" data-n="'\+n\+'"><div class="cs-alb-track">/);
    assert.match(js, /class="cs-photo" data-chat="photo"/, 'each picture opens big like any chat photo and is held to save');
    assert.match(css, /#cmPaneChat \.cs-alb-track \{ display: flex; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory;/);
    assert.match(css, /#cmPaneChat \.cs-alb-track > \.cs-photo \{ flex: 0 0 100%; scroll-snap-align: start;/);
});

test('New post can also send the pictures to the Community chat', () => {
    const html = read('index.html'), js = read('community-chat.js');
    assert.match(html, /data-tr="chat" aria-label="Also in the Community chat"/);
    assert.match(html, /case "chat": if \(C\) \{ C\.chat = !C\.chat; paintRest\(\); \} break;/);
    assert.match(html, /const toChat = C\.chat && !C\.p \? \(C\.photos && C\.photos\.length \? C\.photos : C\.photo \? \[C\.photo\] : \[\]\)\.slice\(0, 8\) : \[\];/, 'off unless switched on');
    assert.ok(html.includes('["Also in the Community chat", "Auch in den Community-Chat", "También en el chat de la Comunidad"],'));
    assert.match(js, /else\{const srcs=\[\];for\(let k=0;k<blobs\.length;k\+\+\)srcs\.push\(await mediaUpload\(scope\+'\/chat-'\+id\+'-'\+\(k\+1\)\+'\.jpg',blobs\[k\],\['image\/jpeg'\]\)\);body=K\.albumBody\(srcs\[0\],srcs\.length,o\.caption\);\}/);
    assert.match(js, /,sharePics,mealDetail,shareMeal\};/);
});
