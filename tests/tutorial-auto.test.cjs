'use strict';
/* Oct 19 2026 (Emmanuel: "when someone makes a new account, they should automatically be taken through a tutorial phase ...
   Obviously, with a skippable option"). tutorial-auto.js: once per NEW account, after setup, only when nothing else is open. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const A = require('../tutorial-auto.js');
const S = require('../tutorial-steps.js');
const ROOT = path.join(__dirname, '..');

test('the mark is an account key (lowispike.*), so the account backup carries it to reload, sign-in and other devices', () => {
    assert.match(A.KEY, /^lowispike\./);
    assert.notStrictEqual(A.KEY, 'lowispike.chat.v1');
});

test('only setup finishing marks an account as new; an existing state is never reset', () => {
    assert.deepStrictEqual(A.markNew({}).s, 'pending');
    for (const s of ['running', 'done', 'skipped', 'declined', 'offered']) assert.strictEqual(A.markNew({ s }).s, s, s + ' stays');
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const fin = html.slice(html.indexOf('function finishOb()'), html.indexOf('function pickPhoto('));
    assert.match(fin, /lowi:setup-done/, 'finishOb fires lowi:setup-done');
    assert.strictEqual((html.match(/lowi:setup-done/g) || []).length, 1, 'nothing else fires it');
    assert.match(fs.readFileSync(path.join(ROOT, 'tutorial.js'), 'utf8'), /tutorial-auto\.js\?v=/, 'tutorial.js loads it after itself');
});

test('existing accounts (no mark) are never started or offered anything', () => {
    assert.strictEqual(A.decide({}, { quietMs: 99999 }), 'none');
    assert.strictEqual(A.decide(null, { quietMs: 99999 }), 'none');
});

test('a new account starts only after Home has been quiet for a while, and never on top of a live tour', () => {
    assert.strictEqual(A.decide({ s: 'pending' }, { quietMs: 0 }), 'wait');
    assert.strictEqual(A.decide({ s: 'pending' }, { quietMs: A.QUIET_MS - 1 }), 'wait');
    assert.strictEqual(A.decide({ s: 'pending' }, { quietMs: A.QUIET_MS }), 'start');
    assert.strictEqual(A.decide({ s: 'pending' }, { quietMs: 99999, live: true }), 'none');
    assert.ok(A.QUIET_MS >= 1500, 'waits out the gap between setup closing and the starter interview opening');
});

test('exactly once: finished, Skip all and No thanks are final', () => {
    for (const s of ['done', 'skipped', 'declined']) assert.strictEqual(A.decide({ s }, { quietMs: 99999 }), 'none', s);
    assert.strictEqual(A.onEvent({ s: 'running', step: 'gap' }, { on: false, reason: 'finished' }).s, 'done');
    assert.strictEqual(A.onEvent({ s: 'running', step: 'gap' }, { on: false, reason: 'skipped' }).s, 'skipped');
    assert.strictEqual(A.onEvent({ s: 'running', step: 'gap' }, { on: false, reason: 'restart' }).s, 'running', 'a restart is not an ending');
    assert.strictEqual(A.onEvent({ s: 'done' }, { on: true, step: 'hello' }).s, 'done', 'a replay from Settings does not reopen it');
    assert.deepStrictEqual(A.onEvent({}, { on: false, reason: 'finished' }), {}, 'existing accounts replaying from Settings get no mark');
});

test('quit halfway: one offer to continue at the step they left, never a second one', () => {
    const st = A.onEvent({ s: 'running' }, { on: true, step: 'water' });
    assert.strictEqual(st.step, 'water');
    assert.strictEqual(A.decide(st, { quietMs: 99999 }), 'offer');
    assert.strictEqual(A.decide(st, { quietMs: 10 }), 'wait');
    assert.strictEqual(A.decide(Object.assign({}, st, { resumed: true }), { quietMs: 99999 }), 'quit', 'after the one offer, quitting again ends it');
    assert.strictEqual(A.decide({ s: 'offered', step: 'water' }, { quietMs: 99999 }), 'none');
    for (const l of ['en', 'de', 'es']) for (const k of ['t', 'p', 'go', 'no']) assert.ok(A.UI[l][k], l + '.' + k);
});

test('tutorial.js can begin at a step (for Continue), and the auto tour never touches the hold logic', () => {
    const js = fs.readFileSync(path.join(ROOT, 'tutorial.js'), 'utf8');
    assert.match(js, /o\.at/);
    const auto = fs.readFileSync(path.join(ROOT, 'tutorial-auto.js'), 'utf8');
    assert.match(auto, /busyBy\(\)/, 'waits for everything the tour waits for');
    assert.match(auto, /#drDay/, 'and for the Day card itself');
});

test('the tour explains almost every small part, in short cards grouped into parts', () => {
    assert.ok(S.STEPS.length >= 35, 'many small cards: ' + S.STEPS.length);
    const c = S.covered();
    for (const f of ['mood', 'energy-peak', 'joy-hold', 'zoom', 'fly-out', 'half-energy', 'care-room', 'community-post', 'community-energy', 'menubar', 'day-card', 'whats-new', 'photo-checks', 'sleep'])
        assert.ok(c[f] && c[f] !== 'none', f + ' has a step');
    for (const s of S.STEPS) for (const l of ['en', 'de', 'es']) assert.ok(s.text[l].length <= 230, s.id + '.' + l + ' short');
    const areas = new Set(S.STEPS.map(s => s.area));
    assert.ok(areas.size >= 8, 'grouped into parts so Skip jumps a whole part');
    assert.ok(S.VERSION >= 2);
});
