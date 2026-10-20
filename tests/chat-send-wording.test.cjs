'use strict';
/* Oct 20 ship sweep: a failed or offline send says so in plain words under the chat box, keeps the text, and clears when back online */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'community-chat.js'), 'utf8');

test('send failure copy is plain (no message IDs) in all three languages', () => {
    const line = js.split('\n').find(l => /^ sendFailed:\[/.test(l));
    assert.ok(line, 'sendFailed copy exists');
    assert.doesNotMatch(line, /\bID\b|Check & retry|Nachrichten-ID/);
    assert.match(line, /tap send to try again/);
    assert.strictEqual((line.match(/'[^']+'/g) || []).length, 3);
});

test('offline send has its own notice and it clears when the connection comes back', () => {
    assert.match(js, /^ sendOffline:\['You are offline\. Your message stays here/m);
    assert.match(js, /notice=tr\(navigator\.onLine===false\?'sendOffline':'offline'\)/);
    assert.match(js, /catch\(e\)\{notice=tr\(navigator\.onLine===false\?'sendOffline':'sendFailed'\);\}/);
    assert.match(js, /W\.addEventListener\('online',\(\)=>\{if\(notice===tr\('sendOffline'\)\|\|notice===tr\('offline'\)\)notice='';/);
});
