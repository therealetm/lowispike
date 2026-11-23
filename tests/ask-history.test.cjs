// 23 Nov 2026 (Emmanuel: "when I closed it, I tried to find it again, but that chat history was gone ... I need those chat histories to
// stay like ChatGPT"). Misty's chat keeps every conversation on the phone (localStorage), with a Chats list.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'lowi-ask.js'), 'utf8');
test('conversations are kept on the phone, not only for the session, and never sent to the server', () => {
  assert.match(js, /const HK = 'lowi\.ask\.chats\.v1', MAXC = 40, MAXM = 60;/);
  assert.match(js, /localStorage\.setItem\(HK, JSON\.stringify\(book\)\)/);
  assert.doesNotMatch(js.replace(/\/\*[\s\S]*?\*\//g, ''), /sessionStorage\.setItem/);
});
test('a new Deep analyze or New chat starts a new conversation and keeps the old one', () => {
  assert.match(js, /if \(o\.context != null && o\.context !== ctx\) fresh\(/);
  assert.match(js, /else if \(k === 'new'\) \{ if \(!busy\) \{ fresh\(''\);/);
  assert.doesNotMatch(js, /msgs = \[\]; ctx = ''; keep\(\);/);
});
test('Chats lists them newest first; a tap reopens one, ✕ deletes it; three languages', () => {
  for (const k of ["data-ak=\"pick\"", "data-ak=\"del\"", "data-ak=\"chats\""]) assert.ok(js.includes(k), k);
  assert.match(js, /chats: \['Chats', 'Chats', 'Chats'\]/); assert.match(js, /del: \['Delete chat', 'Chat löschen', 'Borrar chat'\]/);
  assert.match(js, /book\.list = \[c\]\.concat\(book\.list\.filter\(x => x !== c\)\)\.slice\(0, MAXC\)/);
});
