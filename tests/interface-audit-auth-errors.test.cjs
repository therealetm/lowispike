'use strict';
/* Interface audit 20 Oct 2026 (IA-01): with sign-up unreachable, an iPhone showed the raw WebKit text "Load failed" under
   Create account. errMsg must turn every browser's wording of a failed request into the friendly no-connection line. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const src = html.slice(html.indexOf('function errMsg(e){'), html.indexOf('function busy(form, on, label)'));
const errMsg = new Function(src + '; return errMsg;')();
const NO_NET = 'No connection. Check your internet and try again.';

test('Safari, Chrome and Firefox wordings of a failed request all read as no connection', () => {
  for (const m of ['Load failed', 'Failed to fetch', 'NetworkError when attempting to fetch resource.', 'The network connection was lost.', 'The request timed out.', 'The Internet connection appears to be offline.']) {
    assert.equal(errMsg(new TypeError(m)), NO_NET, m);
  }
});

test('real account errors keep their own messages', () => {
  assert.match(errMsg({ message: 'User already registered' }), /already has an account/);
  assert.match(errMsg({ message: 'Invalid login credentials' }), /doesn't match/);
  assert.match(errMsg({ message: 'Password should be at least 8 characters' }), /at least 8/);
});

test('the no-connection line has German and Spanish', () => {
  assert.ok(html.includes('["' + NO_NET + '", "Keine Verbindung.'));
});
