// 22 Nov 2026 (Emmanuel: "the X button still doesn't work ... make it a back button just like the other ones ... move all the other
// ones to the same corner, so it's universal"): the send button is only Send again; the way out is the universal back, top-left.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
test('the chat send button is a send button only (the ✕ there is gone)', () => { const js = R('chat-post-save.js'); assert.doesNotMatch(js, /cs-leave/); assert.doesNotMatch(R('chat-meal-post.css'), /cs-leave/); });
test('the universal back shows in the chat too (no longer hidden while the chat list is on screen)', () => { assert.doesNotMatch(R('chat-meal-post.css'), /html\.lw-chat-on #lwBX/); assert.match(R('bottom-close.css'), /\.lw-bx\{position:fixed;left:calc\(env\(safe-area-inset-left, 0px\) \+ 14px\)/); });
