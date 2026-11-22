// 22 Nov 2026 (Emmanuel): the useless up arrow in the chat becomes a ✕ back to Home while nothing is typed.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'chat-post-save.js'), 'utf8'), css = fs.readFileSync(path.join(__dirname, '..', 'chat-meal-post.css'), 'utf8');
test('empty send button is a back ✕ that goes Home', () => { assert.match(js, /classList\.toggle\('cs-leave', leave\)/); assert.match(js, /#cmSend\.cs-leave/); assert.match(js, /W\.goTab\('home'\)/); assert.match(js, /Zurück zum Start/); });
test('typing turns it back into the send arrow', () => { assert.match(js, /else if \(b\.textContent === '✕'\) b\.textContent = '↑'/); assert.match(css, /#cmSend\.cs-leave\{/); });
