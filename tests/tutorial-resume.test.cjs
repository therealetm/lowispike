'use strict';
/* 22 Oct 2026, MAYA-HANDOFF item 40. Emmanuel: "sometimes the user tries out the gesture the voice over said but then it's not
   clear how they get back to the tutorial. So make the tutorial button stay always when they new until they skip all or
   finish." tutorial-resume.js: a floating "Continue tutorial" pill whenever an unfinished tour's card is not on screen.
   The real browser runs (leave, other screens, reload, tap, finish, Skip all, hands-free) are tools/tutorial-resume/check.cjs. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = require('../tutorial-resume.js');
const S = require('../tutorial-steps.js');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const IDS = S.plan({ noOwnCompanion: false, claimReady: false }).map(s => s.id);

/* replays the tutorial's own events into the stored state, like the page listener does */
function replay(events, st) {
    for (const d of events) st = R.onEvent(st, d, IDS, 1);
    return st;
}
const at = k => IDS[k];

test('state lives in the tutorial\'s own storage, so it survives a reload', () => {
    assert.strictEqual(R.KEY, 'lowi.tutorial.v1');
    assert.ok(read('tutorial.js').includes("const KEY = 'lowi.tutorial.v1'"), 'same key as tutorial.js');
});

test('leave mid-tour (Escape / back-swipe): the place is kept and the button is offered', () => {
    const st = replay([{ on: true, step: at(0), how: 'start' }, { on: true, step: at(1), how: 'next' }, { on: true, step: at(2), how: 'next' }, { on: false, step: at(2), reason: 'left' }]);
    assert.ok(R.active(st));
    assert.strictEqual(st.resume.at, at(2));
    assert.strictEqual(st.resume.i, 2);
    assert.strictEqual(st.resume.next, at(3));
    assert.strictEqual(R.resumeAt(st), at(2), 'not finished: the same card');
    assert.ok(R.shouldShow({ active: true, on: false }), 'tour off: shown on every screen');
});

test('after a reload the stored state still offers the same card', () => {
    const st = replay([{ on: true, step: at(0), how: 'start' }, { on: true, step: at(4), how: 'next' }]);
    const reloaded = JSON.parse(JSON.stringify(st));  /* what localStorage gives back */
    assert.ok(R.active(reloaded));
    assert.strictEqual(R.resumeAt(reloaded), at(4));
    assert.ok(R.shouldShow({ active: R.active(reloaded), on: false }));
});

test('a card that was tried, or read to the end hands-free, resumes on the next card', () => {
    const tried = replay([{ on: true, step: at(3), how: 'next' }, { on: true, step: at(3), tried: at(3), gesture: 'tap' }, { on: false, step: at(3), reason: 'left' }]);
    assert.strictEqual(R.resumeAt(tried), at(4));
    const heard = replay([{ on: true, step: at(5), how: 'next' }, { on: true, step: at(5), auto: at(5), wait: 1200 }]);
    assert.strictEqual(R.resumeAt(heard), at(6));
    /* Pause/Play keeps it; moving to another card starts fresh */
    const paused = R.onEvent(heard, { on: true, step: at(5), paused: true }, IDS, 2);
    assert.strictEqual(R.resumeAt(paused), at(6));
    const moved = R.onEvent(heard, { on: true, step: at(6), how: 'auto' }, IDS, 3);
    assert.strictEqual(R.resumeAt(moved), at(6));
    /* in-card practice gestures (tutorial: make instructions doable) report `tried` the same way */
    const pad = replay([{ on: true, step: at(7), how: 'next' }, { on: true, step: at(7), tried: at(7), gesture: 'swipe' }]);
    assert.strictEqual(R.resumeAt(pad), at(8));
});

test('the last card finished, or Skip all: never shown again, even after a reload', () => {
    const done = replay([{ on: true, step: at(IDS.length - 1), how: 'next' }, { on: false, step: at(IDS.length - 1), reason: 'finished' }]);
    assert.strictEqual(R.active(done), false);
    assert.strictEqual(R.resumeAt(done), '');
    assert.strictEqual(R.shouldShow({ active: R.active(done), on: false }), false);
    const skipped = replay([{ on: true, step: at(2), how: 'next' }, { on: false, step: at(2), reason: 'skipped' }]);
    assert.strictEqual(R.active(JSON.parse(JSON.stringify(skipped))), false);
    /* a later left / reload keeps it gone */
    assert.strictEqual(R.active(R.onEvent(skipped, { on: false, reason: 'left' }, IDS, 9)), false);
    /* the tutorial's own done flag wins too */
    assert.strictEqual(R.active({ done: true, resume: { at: at(1) } }), false);
});

test('starting again from Settings brings it back (a new tour is unfinished again)', () => {
    const skipped = replay([{ on: true, step: at(2), how: 'next' }, { on: false, reason: 'skipped' }]);
    const again = R.onEvent(Object.assign({}, skipped, { done: false }), { on: true, step: at(0), how: 'start' }, IDS, 5);
    assert.ok(R.active(again));
    assert.strictEqual(R.resumeAt(again), at(0));
});

test('tours left before this build (no resume field) do not suddenly get a button', () => {
    assert.strictEqual(R.active({ v: 3, at: 4, last: at(4), done: false, skipped: '' }), false);
    assert.strictEqual(R.active({}), false);
    assert.strictEqual(R.active(null), false);
});

test('shown only while the card is off screen, never over setup, Misty\'s flight or the claim sheet', () => {
    assert.strictEqual(R.shouldShow({ active: true, on: true, heldWhy: '' }), false, 'card on screen');
    for (const why of ['#b3Cam', 'camera', '#someSheet', 'settings', 'held']) assert.ok(R.shouldShow({ active: true, on: true, heldWhy: why }), why);
    for (const why of ['setup', 'flight', 'claim']) assert.strictEqual(R.shouldShow({ active: true, on: true, heldWhy: why }), false, why);
    assert.strictEqual(R.shouldShow({ active: true, on: false, setup: true }), false, 'sign-in / setup gate');
    assert.strictEqual(R.shouldShow({ active: true, on: false, pending: true }), false, 'just tapped');
    assert.strictEqual(R.shouldShow({ active: false, on: false }), false);
});

test('placement takes the first spot with nothing tappable under it, else the least covered', () => {
    assert.strictEqual(R.pick([{ id: 'tr', hits: 2 }, { id: 'tl', hits: 0 }, { id: 'br', hits: 0 }]), 'tl');
    assert.strictEqual(R.pick([{ id: 'tr', hits: 3 }, { id: 'tl', hits: 1 }, { id: 'tr:c', hits: 2 }]), 'tl');
    assert.strictEqual(R.pick([]), '');
    assert.deepStrictEqual(R.SPOTS.slice(0, 2), ['tr', 'tl']);
});

test('labels in every app language', () => {
    assert.strictEqual(R.txt('en').label, 'Continue tutorial');
    assert.strictEqual(R.txt('de').label, 'Tutorial fortsetzen');
    assert.strictEqual(R.txt('es').label, 'Continuar tutorial');
    assert.strictEqual(R.txt('fr').label, 'Continue tutorial', 'falls back to English');
    for (const l of ['en', 'de', 'es']) assert.ok(R.txt(l).aria.length > R.txt(l).label.length);
});

test('tutorial.js: Escape / back-swipe leaves the card (stop(\'left\')), Skip all still ends it; loads tutorial-resume.js; exposes ids()', () => {
    const js = read('tutorial.js');
    assert.ok(/e\.key === 'Escape'\) \{ e\.preventDefault\(\); stop\('left'\); \}/.test(js), 'Escape = left');
    assert.ok(js.includes("a === 'skipall') stop('skipped')"), 'Skip all = skipped');
    assert.ok(js.includes("sc.src = 'tutorial-resume.js?v='"), 'loader');
    assert.ok(js.includes('ids: () => list.map(x => x.id)'), 'ids()');
});

test('tutorial-auto.js shows no second "Pick up the tour?" card while the button covers it', () => {
    const js = read('tutorial-auto.js');
    assert.ok(js.includes('W.LowiTutorialResume.covers()'));
});

test('the pill: 44 pt, safe areas, below the tour card, above sheets, day theme, reduced motion, never the tab bar', () => {
    const css = read('tutorial-resume.css');
    assert.match(css, /min-height: 44px/);
    assert.match(css, /min-width: 44px/);
    assert.match(css, /\.ltr-compact \{ width: 44px/);
    for (const side of ['top', 'right', 'bottom', 'left']) assert.ok(css.includes('env(safe-area-inset-' + side), side);
    const z = +(/\.ltr-fab \{[^}]*z-index: (\d+)/.exec(css) || [])[1];
    const tourZ = +(/\.lt-tour \{[^}]*z-index: (\d+)/.exec(read('tutorial.css')) || [])[1] || 2147482000;
    assert.ok(z > 2147480000 && z < tourZ, 'under the tour card, over the app');
    assert.ok(css.includes('html[data-theme="light"] .ltr-fab'), 'day theme');
    assert.ok(css.includes('prefers-reduced-motion'));
    assert.ok(css.includes('var(--ltr-bar'), 'bottom spots sit above the tab bar');
    const js = read('tutorial-resume.js');
    for (const k of ['#tabbar', '.lb-bub', 'textarea', 'input', 'button']) assert.ok(js.includes(k), 'never covers ' + k);
});
