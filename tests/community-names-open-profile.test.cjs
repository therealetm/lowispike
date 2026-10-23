'use strict';
/* 23 Oct 2026 (Emmanuel: "when I click on the names, it doesn't ... take us to the actual profile, so we see who they are"):
   every name in the "Chat rooms & people" sheet (people in your room, the names under each room, the search results) and the
   name above a chat message opens that person's profile card, by user id. Simulation: tools/check-profile-tap.cjs. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('Community exposes openProfile(uid) and it returns the card so the caller can come back', () => {
  const c = R('community-chat.js');
  assert.match(c, /W\.LowiCommunity=\{mount,refresh,[^\n]*,settings,openProfile:\(uid,name\)=>uid\?openProfile\(String\(uid\),name\|\|''\):null,/);
  assert.match(c, /function openProfile\(id,name\)\{if\(!blocked\(id\)\)return openPerson\(id,name\);const bt=botOf\(id\);if\(bt\)return botProfile\(bt\);const p=profile\(id,name\);return sheet\(/);
  assert.match(c, / return sheet\('<div class="cp-card" data-person=/, 'the person card is returned');
  assert.match(c, / return sheet\('<h2>'\+esc\(b\.n\)\+' <span class="cg-bottag">'/, 'a bot\'s card is returned too');
});

test('the name above a chat message opens the profile, like the avatar', () => {
  const c = R('community-chat.js');
  assert.match(c, /<b class="cs-name" data-chat="profile" data-uid="'\+esc\(m\.uid\)\+'" data-name="'\+esc\(m\.by\)\+'">/);
  assert.match(c, /a==='profile'\)openProfile\(b\.dataset\.uid,b\.dataset\.name\)/, 'the existing profile action handles it');
});

test('every name in the Rooms & people sheet is a button that opens the profile by user id', () => {
  const u = R('community-rooms-ui.js');
  assert.match(u, /function pAttr\(u,n\)\{return 'data-rs="profile" data-uid="'\+esc\(u\)\+'"/);
  assert.match(u, /crew\.map\(x=>'<button type="button" class="rm-p" '\+pAttr\(x\.u,x\.n\)/, 'people in your room');
  assert.match(u, /ppl\.slice\(0,3\)\.map\(x=>'<button type="button" class="rm-nm rm-nm-s" '\+pAttr\(x\.u,x\.n\)/, 'names under each room');
  assert.match(u, /<span class="rm-who"><button type="button" class="rm-nm" '\+pAttr\(u,n\)/, 'search results');
  assert.doesNotMatch(u, /<span class="rm-p">/, 'no name left as plain text');
  assert.match(u, /else if\(a==='profile'\)openCard\(b\.dataset\.uid,b\.dataset\.name\)/);
  assert.match(u, /seeProfile:\['\{name\}: see profile','\{name\}: Profil ansehen','\{name\}: ver perfil'\]/, 'labels in all three languages');
});

test('the sheet steps aside for the card and comes back when it closes; Chat or Send energy go on', () => {
  const u = R('community-rooms-ui.js');
  const f = u.slice(u.indexOf('function openCard('), u.indexOf('function closeSheet('));
  assert.ok(f.length > 100);
  assert.match(f, /ov=c\.openProfile\(uid,name\|\|''\)/, 'by user id');
  assert.match(f, /s\.style\.display='none'/, 'the card would sit under the sheet otherwise');
  assert.match(f, /select-close\|energy\|settings/, 'Chat, Send energy and settings lead away');
  assert.match(f, /if\(away\)\{closeSheet\(\);return;\}s\.style\.display=''/);
  assert.match(f, /new MutationObserver\(back\)/);
  assert.match(f, /if\(ov\.isConnected&&!ov\.classList\.contains\('off'\)\)return;/, 'back as soon as LowiR2 marks the card closed');
  assert.match(f, /attributeFilter:\['class'\]/);
  assert.match(f, /b\.focus\(\{preventScroll:true\}\)/, 'focus goes back to the name you tapped');
});

test('thumb-size names and their look', () => {
  const css = R('community-rooms.css');
  assert.match(css, /\.rm-sheet button\.rm-p\{[^}]*min-height:36px/);
  assert.match(css, /\.rm-sheet \.rm-list \.rm-who button\.rm-nm\{[^}]*background:none/, 'the row button style does not leak onto names');
  assert.match(R('community-chat.css'), /\.cs-name\[data-chat=profile\]\{cursor:pointer\}/);
});
