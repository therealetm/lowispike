'use strict';
/* BH-026 (bug hunt run 27, 25 Oct 2026): a double tap on the Move bubble logged "Move · Steady (5k–10k)" steps.
   Found by playing the live build 20261025-231656 (BUGHUNT/playtest/probe-bloom-dbl.cjs, then probe-orb-stack.cjs, Chromium 390):
   a bloom's orbs fly out of the bubble you tapped, and the middle one comes to rest on top of it (Move's Steady 25 px from the
   bubble's centre, radius 33; Fuel's Cook passes over the centre in its overshoot; Water's Cup and Bottle cover part of the bubble).
   The second tap of a double tap, or a quick "tap again to close", pressed that orb before you could see it.
   Rule (same idea as the fresh backdrop, BH-025): a bloom ignores pointer taps for its first ORB_ARM_MS after it opens. Keyboard
   clicks (detail 0) and scripted clicks work at once, and a tap after the window works as before. */
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'home-blooms-v2.js'), 'utf8');

function rig() {
    const i = src.indexOf('function onBloomClick('), j = src.indexOf('/* taps and holds on the four bubbles');
    assert.ok(i > 0 && j > i, 'onBloomClick exists');
    const arm = +(/const ORB_ARM_MS = (\d+)/.exec(src) || [])[1];
    const box = { t: 1000, ran: [], closed: 0, timers: [] };
    const make = new Function('box', 'ORB_ARM_MS', [
        'const now = () => box.t; const st = { ov: null, openedAt: 0 };',
        (/const tapTime = [^\n]+/.exec(src) || ['const tapTime = null;'])[0],
        'function close(){ box.closed++; st.ov = null; } function buzz(){} function refreshOpen(){} function homeTab(){ return true; }',
        'const setTimeout = f => box.timers.push(f);',
        src.slice(i, j),
        'return { st, onBloomClick };'].join('\n'));
    const r = make(box, arm);
    const acts = [{ id: 'steady', run: () => box.ran.push('steady') }, { id: 'cup', keep: true, run: () => box.ran.push('cup') }];
    const open = () => { r.st.ov = { __acts: acts }; r.st.openedAt = box.t; };
    const target = id => ({ closest: () => ({ dataset: id === 'close' ? { hb2: 'close' } : { hb2: 'act', id } }) });
    const click = (id, o) => { r.onBloomClick(Object.assign({ target: target(id), isTrusted: true, detail: 1, timeStamp: box.t, preventDefault() {}, stopPropagation() {} }, o)); box.timers.splice(0).forEach(f => f()); };
    return { box, arm, open, click };
}

test('BH-026: the arm window is a short human beat (between 300 and 500 ms) and both ways a bloom opens start it', () => {
    const { arm } = rig();
    assert.ok(arm >= 300 && arm <= 500, 'ORB_ARM_MS = ' + arm);
    const one = src.slice(src.indexOf('function open('), src.indexOf('function refreshOpen('));
    const all = src.slice(src.indexOf('function openAll('), src.indexOf('function moveNote('));
    assert.match(one, /st\.openedAt = now\(\)/);
    assert.match(all, /st\.openedAt = now\(\)/);
});

test('BH-026: the second tap of a double tap (40 to 250 ms) does not press the orb now resting on the bubble', () => {
    for (const gap of [40, 90, 150, 250]) {
        const a = rig(); a.open(); a.box.t += gap; a.click('steady');
        assert.deepStrictEqual(a.box.ran, [], 'gap ' + gap + ' ms: no steps logged');
        assert.strictEqual(a.box.closed, 0, 'gap ' + gap + ' ms: the bloom stays open');
        const b = rig(); b.open(); b.box.t += gap; b.click('cup');
        assert.deepStrictEqual(b.box.ran, [], 'gap ' + gap + ' ms: a keep orb (Water cup) is ignored too');
    }
});

test('BH-026: a tap after the window works exactly as before', () => {
    const a = rig(); a.open(); a.box.t += a.arm + 1; a.click('steady');
    assert.deepStrictEqual(a.box.ran, ['steady']);
    assert.strictEqual(a.box.closed, 1, 'a log folds the bloom');
    const b = rig(); b.open(); b.box.t += 600; b.click('cup');
    assert.deepStrictEqual(b.box.ran, ['cup']);
    assert.strictEqual(b.box.closed, 0, 'a keep orb leaves it open');
});

test('BH-026: keyboard clicks (detail 0) and scripted clicks are never held back', () => {
    const a = rig(); a.open(); a.box.t += 20; a.click('steady', { detail: 0 });
    assert.deepStrictEqual(a.box.ran, ['steady'], 'Enter on the focused orb right away');
    const b = rig(); b.open(); b.box.t += 20; b.click('steady', { isTrusted: false });
    assert.deepStrictEqual(b.box.ran, ['steady'], 'el.click() from code or a test');
});

test('BH-026: the window starts again on every open, so a quick reopen is guarded too', () => {
    const a = rig(); a.open(); a.box.t += 2000; a.open(); a.box.t += 100; a.click('steady');
    assert.deepStrictEqual(a.box.ran, []);
});

test('BH-026: the tap\'s own time counts, so a quick tap that waited in the queue (3D world busy) is still held back', () => {
    /* tapped 120 ms after the bloom opened, but the click only ran 900 ms later */
    const a = rig(); a.open(); const opened = a.box.t; a.box.t += 1020; a.click('steady', { timeStamp: opened + 120 });
    assert.deepStrictEqual(a.box.ran, []);
    /* a tap made 600 ms after the bloom opened runs, however late its click is handled */
    const b = rig(); b.open(); const o2 = b.box.t; b.box.t += 1500; b.click('steady', { timeStamp: o2 + 600 });
    assert.deepStrictEqual(b.box.ran, ['steady']);
});

test('BH-026: a time stamp on another clock (old WebKit epoch ms, 0, missing) falls back to the time the click runs', () => {
    for (const ts of [Date.now(), 0, undefined, NaN]) {
        const a = rig(); a.open(); a.box.t += 600; a.click('steady', { timeStamp: ts });
        assert.deepStrictEqual(a.box.ran, ['steady'], 'late tap with timeStamp ' + ts + ' runs');
        const b = rig(); b.open(); b.box.t += 100; b.click('steady', { timeStamp: ts });
        assert.deepStrictEqual(b.box.ran, [], 'quick tap with timeStamp ' + ts + ' is held back');
    }
});
