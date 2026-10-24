'use strict';
/* 23 Oct 2026 (Emmanuel: "when I click on the names, it doesn't ... take us to the actual profile, so we see who they are"):
   the name above a chat message opens that person's profile card, by user id. (The "Chat rooms & people" sheet that also listed
   names went with Circles and multiple rooms on Oct 24 2026; People, people-directory.js, lists everyone now.) */
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
  assert.match(R('community-chat.css'), /\.cs-name\[data-chat=profile\]\{cursor:pointer\}/);
});
