'use strict';
/* Bug hunt Oct 23 2026 (onboarding + tutorial):
   1. The last setup screen ("You're all set, <name>" / "<sign> · Saved to your account.") stayed English in German and Spanish:
      the whole thing was one text node with the name and sign glued in, so the dictionary never matched, and "You're all set"
      had no row at all.
   2. The one-time "New: drag here to fly Misty" hint fired 2.5 s after Home came up even while a new user's setup sheet covered
      Home, and was marked seen right away, so no new user ever saw it. It now waits until Home is clear. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const A = require(path.join(root, 'misty-pad.js'));

function finishObSrc() {
    const html = read('index.html'), i = html.indexOf('function finishOb(){');
    assert.ok(i > 0, 'finishOb exists');
    return html.slice(i, html.indexOf('\nfunction ', i + 10));
}

test('the done screen keeps each phrase in its own text node', () => {
    const f = finishObSrc();
    assert.ok(f.includes("<span>You\\'re all set</span>"), 'own node for You\'re all set');
    assert.ok(f.includes("<span data-noi18n>, ' + esc(s.user.name) + '</span>"), 'the name is its own node and never translated');
    assert.ok(f.includes("'<span>' + z.g + \" \" + esc(z.n) + '</span> \u00b7 '"), 'the sign is its own node (the sign pattern turns Leo into Löwe)');
    assert.ok(f.includes("'<span>Saved to your account.</span>"), 'own node for Saved to your account.');
    assert.ok(!/You\\'re all set' \+ \(s\.user\.name/.test(f), 'not glued to the name any more');
});

test('German and Spanish rows exist for both phrases', () => {
    const html = read('index.html');
    assert.ok(html.includes('["You\'re all set", "Alles bereit", "Todo listo"]'));
    assert.ok(html.includes('["Saved to your account.", "In deinem Konto gesichert.", "Guardado en tu cuenta."]'));
});

test('the fly hint waits while setup, a sheet or the tour covers Home', () => {
    assert.equal(typeof A.hint, 'function');
    const clear = { live: true, home: true, seen: false, busy: false, tour: false, mode: '' };
    assert.equal(A.hint(clear), 'show');
    assert.equal(A.hint(Object.assign({}, clear, { busy: true })), 'wait', 'setup sheet / any sheet up');
    assert.equal(A.hint(Object.assign({}, clear, { tour: true })), 'wait', 'the tour is on');
    assert.equal(A.hint(Object.assign({}, clear, { mode: 'drive' })), 'wait', 'already flying');
    assert.equal(A.hint(Object.assign({}, clear, { home: false })), 'wait', 'not on Home');
    assert.equal(A.hint(Object.assign({}, clear, { live: false })), 'wait', 'world not up yet');
    assert.equal(A.hint(Object.assign({}, clear, { seen: true })), 'never');
    assert.equal(A.hint(Object.assign({}, clear, { seen: true, busy: true })), 'never');
});

test('the page only marks the hint seen once it really showed on a clear Home', () => {
    const js = read('misty-pad.js');
    assert.ok(js.includes("if (hintNow() !== 'show') { st.hinted = false; return; }"), 'covered again within 2.5 s: try later, not marked seen');
    assert.ok(js.includes('if (LT && LT.busyBy) busy = !!LT.busyBy();'), 'uses the tour\'s own list of what covers Home (setup, gate, sheets, dialogs, Day card)');
    const i = js.indexOf('if (!st.hinted) {'), blk = js.slice(i, js.indexOf('\n        }\n', i));
    assert.ok(i > 0 && blk.indexOf('hintDone()') > blk.indexOf("hintNow() !== 'show'"), 'hintDone comes after the second check');
});
