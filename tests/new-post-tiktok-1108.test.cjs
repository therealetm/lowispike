'use strict';
/* Nov 8 2026 (Emmanuel: "das mit dem Karussell, das sollte einfach auf der For You-Page beim Posten leben ... So wie bei Instagram und
   TikTok ... von selber aus meine Bilder auswählen können und als Carousel posten"; saved posts need "einen Ort, wo die das dann halt
   auch wieder öffnen können"; "von der For You Page aus Dinge in die Community dann weiterleiten ... Dafür müsste auch einen Knopf
   geben"). Browser check: Chromium 393 x 852 German, three pictures picked at once -> numbered 1 2 3 + tile; Chat button -> chat. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');

test('New post opens on two big tiles: Photos (several at once) and Video', () => {
  assert.match(html, /el\.innerHTML = trPickTilesHTML\(\) \+ '<div class="card" id="trCompose">/);
  assert.match(html, /<button type="button" class="tr-pick" data-tr="photo">/);
  assert.match(html, /<button type="button" class="tr-pick" data-fyv="pick">/);
  assert.match(html, /f\.multiple = carMax\(\) > 1; f\.click\(\);/, 'the phone\'s own picker, several at once');
  assert.match(html, /\.tr-picks\{display:grid;/);
});

test('picked photos are numbered like TikTok, 1 is the cover, + adds more; no small chip before the first', () => {
  const i = html.indexOf('function trPhotosHTML(){'), row = html.slice(i, html.indexOf('\n}', i));
  assert.match(row, /if \(!ph\.length\) return '';/);
  assert.match(row, /<i class="tr-phn" aria-hidden="true">' \+ \(i \+ 1\) \+ '<\/i>/);
  assert.match(row, /class="tr-phadd" data-tr="photo"/);
  assert.doesNotMatch(row, /class="chip" data-tr="photo"/);
  assert.match(html, /\.tr-phn\{[^}]*font-size:12\.5px;font-weight:800;/, 'no invalid font shorthand');
});

test('the sheet speaks German: every new word is in the dictionary', () => {
  for (const [en, de] of [['Photos', 'Fotos'], ['From your gallery', 'Aus deiner Galerie'], ['Up to 8 · carousel', 'Bis zu 8 · Karussell'], ['Paste', 'Einfügen'],
    ['A swap, a win, a question…', 'Ein Swap, ein Erfolg, eine Frage…'], ['A carousel. Number 1 is the cover.', 'Ein Karussell. Nummer 1 ist das Titelbild.'],
    ['Send to Community', 'In die Community schicken'], ['Sent to the Community chat.', 'Im Community-Chat geteilt.']])
    assert.ok(html.includes('["' + en + '", "' + de + '", "'), en);
  assert.match(html, /placeholder="' \+ esc\(fyT\("A swap, a win, a question…"\)\) \+ '"/);
});

test('Saved is always on the feed with its word', () => {
  assert.match(html, /function fySavedBtnHTML\(\)\{ const n = Object\.keys\(T\.saved \|\| \{\}\)\.length;\n/);
  assert.match(html, /'<span>' \+ esc\(fyT\("Saved"\)\) \+ '<\/span>' \+ \(n \? '<b>' \+ n \+ '<\/b>' : ''\)/);
});

test('every For You post (members and the bot) has a Chat button that forwards it', () => {
  assert.match(html, /'<button class="fy-act fy-tochat" data-tr="to-chat" data-id="' \+ p\.id \+ '"/);
  assert.match(html, /toChat: window\.LowiCommunity \?/);
  assert.match(read('foryou.js'), /\+ \(env\.toChat \|\| ''\) \+ '<\/div>'/);
  assert.match(html, /case "to-chat": fyToChat\(id\); break;/);
  const i = html.indexOf('function fyToChat(id){'), fn = html.slice(i, html.indexOf('\n}', i));
  assert.match(fn, /LowiCommunity\.sharePics\(\{blobs:bl, caption:line\}\)/, 'pictures go as a photo or album');
  assert.match(fn, /pics = p\.vid \? \[\] :/, 'a video goes as text, not its poster');
  assert.match(fn, /LowiRoomsUI\.setTab\(true\)/, 'others open the chat with the text in the box');
  assert.match(fn, /if \(!p \|\| !h \|\| fyChatBusy\) return;/, 'one send at a time');
});
