'use strict';
/* BH-032: a double tap on something that switches the app to another tab pressed whatever the new tab put under the finger. Fresh
   overlays already had this guard (BH-028), but a tab is not a new overlay: it is an old <section> that goTab shows again. Live
   WebKit iPhone 13: a double tap on "Misty is number 25 worldwide" in Misty's card switched to Community, the galaxy showed before
   Ranking, and the second tap landed on a companion: "Talking to Marco". Back in the chat the box said "Write to Marco", so the next
   message went to Marco alone instead of everyone. The Community bubble on Home and "My day" (which lands you on Home's Fuel bubble)
   had the same spot problem. fresh-scrim.js mark(el): a pane shown right after a real tap (within 600 ms) ignores, for its first
   400 ms, a real tap within 44 px of that tap. goTab marks the tab it shows, and Community's showView marks the view it swaps in.
   Live probe: BUGHUNT/playtest/probe-rank-dbl.cjs (MOCK, RM on). */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function mk() {
    let t = 1000; const winL = [];
    const body = { nodeType: 1 };
    const node = (parent, cls, w = 0, h = 0) => ({ nodeType: 1, parentNode: parent, className: cls || '', getBoundingClientRect: () => ({ width: w, height: h }) });
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); },
        MutationObserver: function () { this.observe = () => {}; } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body, addEventListener() {} }, Date });
    const tap = (target, x, y, o = {}) => { const e = { target, isTrusted: o.trusted !== false, detail: o.detail == null ? 1 : o.detail, clientX: x, clientY: y, timeStamp: o.ts == null ? t : o.ts,
        prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
        winL.filter(l => l.type === 'click' && l.cap).forEach(l => l.f(e)); return e; };
    return { W, body, node, tap, at: ms => { t = 1000 + ms; } };
}
/* Misty's card is open on Home; her ranking row at (155, 215) switches to Community, whose galaxy has Marco right there */
function rankToCommunity(k) {
    const home = k.node(k.body, 'tab'), card = k.node(home, 'mh'), row = k.node(card, 'mh-rk');
    const tab = k.node(k.body, 'tab'), galaxy = k.node(tab, 'cg'), marco = k.node(galaxy, 'cg-body cg-away'), far = k.node(galaxy, 'cg-body');
    k.at(0); k.tap(row, 155, 215);
    k.at(4); k.W.LowiFreshScrim.mark(tab); /* goTab('foryou') inside the row's click handler */
    return { tab, marco, far };
}

test('fresh-scrim exposes mark() for panes that are shown again rather than added', () => {
    const k = mk(); assert.strictEqual(typeof k.W.LowiFreshScrim.mark, 'function');
});

test('a double tap on Misty\'s ranking row does not pick the companion the galaxy put under the finger', () => {
    const k = mk(); const { marco } = rankToCommunity(k);
    k.at(150); const e = k.tap(marco, 158, 220);
    assert.ok(e.prevented && e.stopped, 'second tap of the double tap is swallowed in capture');
    k.at(300); assert.ok(k.tap(marco, 150, 230).stopped, 'a slower double tap (300 ms) too');
});

test('a busy main thread does not let the second tap through: it counts by its own time stamp', () => {
    const k = mk(); const { marco } = rankToCommunity(k);
    k.at(1500); assert.ok(k.tap(marco, 155, 215, { ts: 1000 + 160 }).stopped, 'touched at 160 ms, handled at 1.5 s');
});

test('the companion can be picked normally once the tab has been there 400 ms, or with a tap elsewhere', () => {
    const k = mk(); const { marco, far } = rankToCommunity(k);
    k.at(120); assert.ok(!k.tap(far, 300, 500).stopped, 'a quick tap far from the first one');
    k.at(450); assert.ok(!k.tap(marco, 155, 215).stopped, 'same spot after 400 ms');
});

test('a tab shown without a recent tap (timer, back swipe, deep link) gets no guard; keyboard and script clicks pass', () => {
    const k = mk(); const x = k.node(k.body, 'x'); k.at(0); k.tap(x, 155, 215);
    const tab = k.node(k.body, 'tab'), b = k.node(tab, 'b');
    k.at(900); k.W.LowiFreshScrim.mark(tab);
    k.at(950); assert.ok(!k.tap(b, 155, 215).stopped, 'shown 900 ms after the last tap');
    const k2 = mk(); const { marco } = rankToCommunity(k2);
    k2.at(60); assert.ok(!k2.tap(marco, 155, 215, { detail: 0 }).stopped, 'Enter / Space');
    k2.at(70); assert.ok(!k2.tap(marco, 155, 215, { trusted: false }).stopped, 'element.click()');
});

test('goTab marks the tab it shows, and Community\'s showView marks its pane', () => {
    const html = read('index.html'), i = html.indexOf('function goTab(t){'); assert.ok(i > 0);
    const body = html.slice(i, i + 4000);
    assert.match(body, /LowiFreshScrim\.mark\(root\)/, 'goTab calls LowiFreshScrim.mark on #tab-<t>');
    const ui = read('community-rooms-ui.js'), j = ui.indexOf('function showView(v){'); assert.ok(j > 0);
    assert.match(ui.slice(j, j + 900), /LowiFreshScrim[^;]{0,40};[^;]*\.mark\(/, 'showView marks the Community tab');
});
