'use strict';
/* 19 Nov 2026 (Emmanuel: "it says they should message me ... everyone thinks I can see their password"): Forgot password? sends
   a Supabase reset link by email. Nobody is told to ask Emmanuel, and the app never says whether an email has an account. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const src = read('pw-reset.js'), html = read('index.html');

test('the sign-in screen has a Forgot password? button and no "Ask Emmanuel" line', () => {
    assert.match(html, /data-r2a="forgot">Forgot password\?<\/button>/);
    assert.doesNotMatch(html, /'<div class="r2-fine">Forgot your password\? Ask Emmanuel/);
    assert.match(html, /<script src="pw-reset\.js\?v=/);
    assert.match(read('sw.js'), /"pw-reset\.js"/);
});
test('it sends a Supabase reset link back to this app', () => {
    assert.match(src, /sb\.auth\.resetPasswordForEmail\(em, \{ redirectTo: appUrl\(\) \}\)/);
});
test('the answer is the same whether or not the email has an account', () => {
    assert.match(src, /If this address has an account, a link to set a new password is on its way/);
});
test('the link signs in once, clears the address bar and opens set a new password', () => {
    assert.match(src, /history\.replaceState\(null, '', appUrl\(\)\)/);
    assert.match(src, /sb\.auth\.setSession\(\{ access_token: st\.a, refresh_token: st\.r \}\)/);
    assert.match(src, /setAttribute\('data-r2p', 'pwforgot'\)/);
});
