'use strict';
/* chat-crash (item 29, Community -> chat kills Safari's page on his real iPhone): inactive tabs are opacity 0 but stayed laid
   out with their liquid-glass blurs, so under Community and the chat room about 20 backdrop-filter layers (Profile cards,
   Home header) were still composited, each its own GPU layer on iOS. tools/probe-chat-behind.cjs counts them in WebKit. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('inactive tabs drop every backdrop-filter', () => {
    const m = html.match(/#main>\.tab:not\(\.active\),#main>\.tab:not\(\.active\) \*\{([^}]*)\}/g) || [];
    const rule = m.find(r => /backdrop-filter:none!important/.test(r));
    assert.ok(rule, 'rule for inactive tabs with backdrop-filter:none');
    assert.match(rule, /-webkit-backdrop-filter:none!important/);
});

test('inactive tabs stay invisible (opacity 0), so dropping their blur shows no change', () => {
    assert.match(html, /\.tab\{position:absolute;[^}]*opacity:0;pointer-events:none/);
    assert.match(html, /\.tab\.active\{opacity:1;pointer-events:auto\}/);
});

test('the active tab keeps its glass', () => {
    assert.ok(!/#main>\.tab\.active[^{]*\{[^}]*backdrop-filter:none/.test(html));
    assert.ok(!/#main>\.tab\s*\*\{[^}]*backdrop-filter:none/.test(html));
});
