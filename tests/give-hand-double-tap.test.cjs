'use strict';
/* BH-043 (bug hunt run 43, 26 Oct 2026, pattern P-ROW-SHIFT / swap under the finger, sibling of BH-041/042) in Shop > Give a hand.
   Found live on build 20261026-151258 (BUGHUNT/playtest/probe-gb-skip-dbl.cjs, made-up baskets, network blocked):
   - a double tap on Skip (31-383 ms, WebKit iPhone 13 and Chromium 390) skipped TWO baskets: the next basket's Skip is drawn on the
     same spot. Undo only brings back the last one, so the first stayed hidden for 24 hours;
   - a double tap on Pay: the card grows and its pay link lands where Pay was, so the 2nd tap opened the person's pay link;
   - the pay link turns into "I helped" in place, so a double tap on the link could claim "I helped" without paying.
   Rule (fresh-scrim BH-041): such controls carry data-spend; a 2nd tap within 44 px / 400 ms does nothing. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const SRC = read('gift-basket.js');
const tags = (tag, a) => SRC.match(new RegExp('<' + tag + '[^>]*' + a + '[^>]*>', 'g')) || [];

test('BH-043: Skip and Pay on the swipe deck carry data-spend', () => {
    for (const a of ['data-gb="skip"', 'data-gb="yes"']) {
        const t = tags('button', a); assert.ok(t.length, a + ' is drawn');
        t.forEach(tg => assert.ok(/data-spend/.test(tg), a + ' carries data-spend: ' + tg.slice(0, 160)));
    }
});

test('BH-043: the pay link and "I helped" carry data-spend', () => {
    const links = tags('a', 'data-gb-pay='); assert.ok(links.length >= 2, 'both pay links are drawn');
    links.forEach(tg => assert.ok(/data-spend/.test(tg), 'pay link carries data-spend: ' + tg.slice(0, 160)));
    const help = tags('button', 'data-gb-help='); assert.ok(help.length, 'I helped is drawn');
    help.forEach(tg => assert.ok(/data-spend/.test(tg), 'I helped carries data-spend: ' + tg.slice(0, 160)));
});

test('BH-043: with the real fresh-scrim, a 2nd Skip on the same spot within 400 ms is swallowed; a deliberate one works', () => {
    let t = 1000; const winL = [];
    const body = { nodeType: 1 };
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); }, MutationObserver: function () { this.observe = () => {}; } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body, addEventListener() {} }, Date });
    const node = (parent, attrs) => ({ nodeType: 1, parentNode: parent, tagName: 'BUTTON', className: attrs.class || '', attrs,
        getAttribute(k) { return k in attrs ? attrs[k] : null; }, matches(sel) { return sel.split(',').some(p => { p = p.trim(); const m = /^\[([\w-]+)\]$/.exec(p); return (m && m[1] in attrs) || (p === 'button'); }); },
        closest(sel) { for (let c = this; c && c.attrs; c = c.parentNode) if (c.matches(sel)) return c; return null; } });
    const click = (n, x, y) => { const e = { type: 'click', target: n, isTrusted: true, detail: 1, clientX: x, clientY: y, timeStamp: t, stopped: false, preventDefault() {}, stopImmediatePropagation() { this.stopped = true; } }; winL.filter(l => l.type === 'click' && l.cap).forEach(l => l.f(e)); return e; };
    const spend = /data-spend/.test(tags('button', 'data-gb="skip"')[0] || '') ? { 'data-spend': '1' } : {};
    const skipA = node(body, Object.assign({ class: 'gb-round gb-skip', 'data-gb': 'skip', 'data-gb-for': 'b1' }, spend));
    const skipB = node(body, Object.assign({ class: 'gb-round gb-skip', 'data-gb': 'skip', 'data-gb-for': 'b2' }, spend));
    t = 1000; assert.ok(!click(skipA, 90, 640).stopped, 'the first Skip skips basket 1');
    t = 1173; assert.ok(click(skipB, 91, 641).stopped, 'the 2nd tap 173 ms later does not skip basket 2');
    t = 1900; assert.ok(!click(skipB, 91, 641).stopped, 'a deliberate Skip later skips basket 2');
});
