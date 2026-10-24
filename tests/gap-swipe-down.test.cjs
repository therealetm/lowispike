// Oct 24 2026 back and close sweep: the Gap card is a bottom sheet on a phone, but a swipe down did nothing (back, X, Escape and a
// tap outside closed it). Its header is now the handle: a drag down follows the finger and closes it past a quarter of the card or on
// a quick flick, a short drag springs back, and the X button is never taken over by the drag.
// The real swipe is checked in a browser by tools/check-gap-swipe.cjs.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const gap = fs.readFileSync(path.join(__dirname, '..', 'gap-view.js'), 'utf8');

test('opening the Gap view wires a swipe down on its header', () => {
    const open = gap.slice(gap.indexOf('function open('), gap.indexOf('function close('));
    assert.ok(/dragDown\(el\)/.test(open), 'open() hooks the drag up');
    const fn = gap.slice(gap.indexOf('function dragDown('), gap.indexOf('function onKey('));
    assert.ok(fn.length > 200, 'dragDown exists');
    assert.ok(/querySelector\('\.gv-top'\)/.test(fn) && /touchAction = 'none'/.test(fn), 'the header is the handle and the browser does not scroll it');
    assert.ok(/closest\('button'\)/.test(fn), 'a press on the X (or any button) is left alone');
    assert.ok(/pointercancel/.test(fn), 'a cancelled touch springs back instead of closing');
    assert.ok(/h \* \.25/.test(fn) && /v > 650/.test(fn), 'closes past a quarter of the card or on a flick');
    assert.ok(/close\(\)/.test(fn), 'it closes the normal way, so back history and focus are cleaned up');
});
