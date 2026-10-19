'use strict';
/* BH-008 (Oct 19 2026): the daily "Day N" card (daily-ritual.js #drDay) lives on the top layer (z 2147483000). It only checked
   busy() BEFORE opening; once open it gave way only to the orb update bubble, the update card, the sign-in gate and flight.
   Anything that opened after it (setup after a slow sign-in restore or a reload mid-setup, any R2 sheet, a tour) sat underneath:
   taps on setup's Next hit the Day card. Live 20261019-155424, WebKit iPhone 13: playtest/probe-dayover.cjs FAIL (setup + sheet).
   Now an open card closes (unseen, so it comes back later) whenever busy() turns true. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'daily-ritual.js'), 'utf8');

function harness(present, opts) {
    opts = opts || {};
    const m = src.match(/function tick\(\) \{[\s\S]*?\n    \}/);
    assert.ok(m, 'daily-ritual.js has tick()');
    const log = { closed: [], opened: 0 };
    const ctx = vm.createContext({
        D: { visibilityState: 'visible', documentElement: { classList: { contains: c => !!(opts.html || []).includes(c) } } },
        $: s => (present.has(s) ? {} : null),
        dayKey: () => '2026-10-19', shouldShowDaily: () => true, seenDay: () => '', S: () => ({}),
        busy: () => !!opts.busy, dayClose: k => { log.closed.push(k); present.delete('#drDay'); }, dayCard: () => { log.opened++; present.add('#drDay'); return true; },
        quiet: 0
    });
    vm.runInContext('var quiet = 0;\n' + m[0], ctx);
    return { tick: () => vm.runInContext('tick()', ctx), log, ctx };
}

test('an open Day card closes when a sheet (e.g. setup) opens after it', () => {
    const present = new Set(['#drDay', '#spHome']);
    const h = harness(present, { busy: true });
    h.tick();
    assert.deepStrictEqual(h.log.closed, [false], 'closed, and NOT marked seen so it comes back');
    assert.ok(!present.has('#drDay'));
});

test('an open Day card stays while nothing else is up', () => {
    const present = new Set(['#drDay', '#spHome']);
    const h = harness(present, { busy: false });
    for (let i = 0; i < 5; i++) h.tick();
    assert.deepStrictEqual(h.log.closed, []);
    assert.ok(present.has('#drDay'));
});

test('the orb update bubble, the gate and flight still close it (unchanged)', () => {
    for (const [sel, html] of [['#g1Ob:not(.out)', []], ['#lcUpd', []], [null, ['gate-up']], [null, ['mf-on']]]) {
        const present = new Set(['#drDay', '#spHome']); if (sel) present.add(sel);
        const h = harness(present, { busy: false, html });
        h.tick();
        assert.deepStrictEqual(h.log.closed, [false], String(sel || html));
    }
});

test('after giving way it comes back once two quiet checks pass', () => {
    const present = new Set(['#drDay', '#spHome']);
    const opts = { busy: true };
    const h = harness(present, opts);
    h.tick(); assert.ok(!present.has('#drDay'));
    h.tick(); assert.strictEqual(h.log.opened, 0, 'not while the sheet is still up');
    opts.busy = false;
    h.tick(); h.tick();
    assert.strictEqual(h.log.opened, 1);
});

test('setup and generic R2 sheets count as busy for the card', () => {
    const busyList = require('../daily-ritual.js').BUSY;
    assert.ok(busyList.includes('.r2-ov.on:not(.off)'), 'R2 sheets (setup is one: .r2-ov.r2-obov)');
});
