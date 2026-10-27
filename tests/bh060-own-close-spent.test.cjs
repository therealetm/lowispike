'use strict';
/* BH-060 (P-CLOSE-UNDER, own paths): BH-059 spent the closing tap for the shared closes (R2.close, closeSheet, the X buttons).
   Many screens close through their own code instead: Done / Later / Skip / a choice / a tap on the card itself, removing or
   hiding their own element. The 2nd tap of a fast double tap then pressed what the closing uncovered (live probe
   BUGHUNT/playtest/dt-sweep.cjs, simulated Chrome at phone size, 2nd tap 120 ms later by the events' own clocks).
   fresh-scrim.js now has closed(el): when the click being handled is a real tap whose path runs through el, that tap is spent,
   so for 400 ms a real tap within 44 px of it is swallowed. Each own close calls it with its own element before it goes. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function mk() {
    let t = 1000; const winL = [];
    const body = { nodeType: 1 };
    const node = (parent, cls) => { const n = { nodeType: 1, parentNode: parent, className: cls || '', getBoundingClientRect: () => ({ width: 300, height: 60 }) };
        n.contains = o => { for (let x = o; x; x = x.parentNode) if (x === n) return true; return false; }; return n; };
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); },
        MutationObserver: function () { this.observe = () => {}; } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body, addEventListener() {} }, Date });
    const ev = (type, target, x, y, o = {}) => ({ type, target, isTrusted: o.trusted !== false, detail: o.detail == null ? 1 : o.detail, clientX: x, clientY: y,
        timeStamp: o.ts == null ? t : o.ts, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; },
        _path: (() => { const p = []; for (let n = target; n; n = n.parentNode) p.push(n); return p; })(), composedPath() { return this._path.slice(); } });   /* fixed at dispatch, like a browser */
    /* a real tap: the capture guard first, then (unless swallowed) the page's own handler with window.event set, like a browser */
    const tap = (target, x, y, o = {}, handler) => {
        const e = ev('click', target, x, y, o);
        winL.filter(l => l.type === 'click' && l.cap).forEach(l => { if (!e.stopped) l.f(e); });
        if (!e.stopped && handler) { W.event = e; try { handler(e); } finally { W.event = undefined; } }
        return e;
    };
    return { W, F: W.LowiFreshScrim, body, node, tap, at: ms => { t = 1000 + ms; } };
}
/* a screen (its own Done button at 195, 700) over the page, whose button sits right under that spot */
function scene(k) {
    const page = k.node(k.body, 'page'), under = k.node(page, 'page-btn');
    const ov = k.node(k.body, 'own-ov'), done = k.node(ov, 'own-done');
    const close = () => { k.F.closed(ov); ov.parentNode = null; };   /* the screen's own close: removes itself */
    return { page, under, ov, done, close };
}

test('a fast 2nd tap after Done closed a screen through its own path does not hit what was under it', () => {
    const k = mk(), s = scene(k);
    k.at(0); assert.ok(!k.tap(s.done, 195, 700, {}, s.close).stopped, 'the first tap closes the screen');
    k.at(120); const e = k.tap(s.under, 197, 702);
    assert.ok(e.stopped && e.prevented, 'the 2nd tap 120 ms later on the same spot is swallowed');
    k.at(380); assert.ok(k.tap(s.under, 190, 705).stopped, 'and up to 400 ms');
});

test('a deliberate tap still works: elsewhere at once, on the same spot after 400 ms, keyboard and script clicks', () => {
    const k = mk(), s = scene(k);
    k.at(0); k.tap(s.done, 195, 700, {}, s.close);
    k.at(100); assert.ok(!k.tap(s.under, 195, 300).stopped, 'a quick tap far away');
    const k2 = mk(), s2 = scene(k2);
    k2.at(0); k2.tap(s2.done, 195, 700, {}, s2.close);
    k2.at(450); assert.ok(!k2.tap(s2.under, 195, 700).stopped, 'same spot after 400 ms');
    const k3 = mk(), s3 = scene(k3);
    k3.at(0); k3.tap(s3.done, 195, 700, { detail: 0 }, s3.close);   /* Enter / Space on Done */
    k3.at(60); assert.ok(!k3.tap(s3.under, 195, 700).stopped, 'Done pressed by keyboard spends nothing');
    const k4 = mk(), s4 = scene(k4);
    k4.at(0); k4.tap(s4.done, 195, 700, { trusted: false }, s4.close);   /* element.click() */
    k4.at(60); assert.ok(!k4.tap(s4.under, 195, 700).stopped, 'a script click spends nothing');
});

test('a tap outside the screen that closes it (its click goes on to the page) spends nothing', () => {
    const k = mk(), s = scene(k);
    /* e.g. the herb gift pop closes on any outside tap and that tap still presses the page button it was on */
    k.at(0); k.tap(s.under, 195, 700, {}, s.close);
    k.at(120); assert.ok(!k.tap(s.under, 195, 700).stopped, 'her fast 2nd tap on the page button still counts');
});

test('closes from Escape, timers or custom events spend nothing', () => {
    const k = mk(), s = scene(k);
    k.W.event = { type: 'keydown', isTrusted: true, detail: 0, target: s.done };
    assert.strictEqual(k.F.closed(s.ov), false, 'Escape');
    k.W.event = undefined;
    assert.strictEqual(k.F.closed(s.ov), false, 'a timer (no event)');
    k.W.event = { type: 'lowi:tab', isTrusted: false, target: s.done };
    assert.strictEqual(k.F.closed(s.ov), false, 'a custom event during a click');
    k.W.event = undefined;
    k.at(0); k.tap(s.under, 195, 700);
    k.at(120); assert.ok(!k.tap(s.under, 195, 700).stopped, 'nothing was spent');
});

test('a tap whose button was re-rendered away before the close still counts as on the screen (composedPath)', () => {
    const k = mk(), s = scene(k);
    const close = e => { s.done.parentNode = null; /* re-rendered */ k.F.closed(s.ov); s.ov.parentNode = null; void e; };
    k.at(0); k.tap(s.done, 195, 700, {}, close);
    k.at(150); assert.ok(k.tap(s.under, 195, 700).stopped);
});

/* every own close path found in the sweep calls closed() with its own element before it goes */
const SITES = [
    ['herb-shop.js', /function close\(then\)\{[^\n]*F\.closed\(V\.ov\)[^\n]*V\.ov\.remove\(\)/, 'wardrobe shop: Done, wear'],
    ['herb-shop.js', /function closeGift\(\)\{[^\n]*F\.closed\(G\.pop\)[^\n]*G\.pop\.remove\(\)/, 'gift pop: OK, Ko-fi'],
    ['community-rooms-ui.js', /F\.closed\(ob\);\}catch\(e\)\{\}if\(ob&&ob\.parentNode\)ob\.parentNode\.removeChild\(ob\)/, 'Community welcome: Done / Skip'],
    ['install-guide.js', /function closeOverlay\(\) \{[^\n]*F\.closed\(o\);[^\n]*o\.remove\(\)/, 'install guide: Later'],
    ['move-finish.js', /cur = null;\n[^\n]*\n\s*try \{ const F = window\.LowiFreshScrim; if \(F && F\.closed\) F\.closed\(c\.el\); \}/, 'Move finish card: tap to close'],
    ['people-directory.js', /function close\(\) \{\n\s*if \(!ov\) return;\n[^\n]*\n\s*try \{ const F = window\.LowiFreshScrim; if \(F && F\.closed\) F\.closed\(ov\); \}/, 'People list'],
    ['quick-tour.js', /const el = ov, v = vid; ov = null;[^\n]*\n[^\n]*\n\s*try \{ const F = root\.LowiFreshScrim; if \(F && F\.closed\) F\.closed\(el\); \}/, 'quick tour: Skip / Done'],
    ['week-basket.js', /const el = ov; ov = null;\n[^\n]*\n\s*try \{ const F = W\.LowiFreshScrim; if \(F && F\.closed\) F\.closed\(el\); \}/, 'week basket: Done, Cart'],
    ['xp-tap.js', /const close = \(\) => \{ if \(!el\.isConnected\) return;[^\n]*F\.closed\(el\)/, 'XP card: tap'],
    ['home-settings-sleep-v2.js', /const was = open; open = null; detached = false;\n[^\n]*\n\s*try \{ const F = root\.LowiFreshScrim; if \(layer && F && F\.closed\) F\.closed\(layer\); \}/, 'settings / sleep ring: a row or choice'],
    ['shop-scan.js', /F\.closed\(c\); \} catch \(e\) \{ \}\n\s*if \(c\) c\.remove\(\);/, 'shop scan result card'],
    ['tutorial-auto.js', /function closeOffer\(\) \{ if \(offer\) \{[^\n]*F\.closed\(offer\);[^\n]*offer\.remove\(\)/, 'tutorial offer: Later / Go'],
    ['cycle-world.js', /if \(k === 'on' \|\| k === 'off'\) \{ try \{ const F = W\.LowiFreshScrim; if \(F && F\.closed\) F\.closed\(b\.closest\('#cwSheet'\), e\); \} catch \(x\) \{ \} \}\n\s*act\(k, b\);/, 'My cycle: Turn on / Turn off redraw the sheet (Cramps chip slid under the finger)'],
    ['cycle-world.js', /const el = D && \(\(ov && ov\.querySelector && ov\.querySelector\('#cwSheet'\)\) \|\| D\.getElementById\('cwSheet'\)\);/, 'My cycle reopened while the old sheet slides out: paint the new sheet (it stayed empty)'],
    ['cycle-world.js', /const me = ov = R2\.sheet\([^\n]*onClose: \(\) => \{ if \(ov === me\) ov = null;/, 'My cycle: the old sheet closing late does not forget the new one'],
];
const IDX = [
    [/function closeRw\(\)\{[^\n]*F\.closed\(d\)/, 'fast reward card'],
    [/const r = \$\("#g1Tour"\); try \{[^\n]*F\.closed\(r\)/, 'tour'],
    [/const had = r\.contains[^\n]*/, null],
    [/\$\("#mv-screen"\);[^\n]*F\.closed\(s\)[^\n]*s\.classList\.remove\("on"\)/, 'Move workout screen'],
    [/function closePlayer\(\)\{[^\n]*F\.closed\(el\)/, 'Move player'],
    [/function tdShopClose\(\)\{[^\n]*F\.closed\(el\)/, 'Today in-store list'],
    [/function closeModal\(\)\{[^\n]*F\.closed\(m\)/, 'shelf modal'],
    [/function closeCart\(\)\{[^\n]*F\.closed\(el\)[^\n]*F\.closed\(sh\)/, 'cart'],
    [/function lcShopClose\(\)\{[^\n]*F\.closed\(el\)/, 'Shop it'],
    [/function rsClose\(\)\{[^\n]*F\.closed\(w\)/, 'recipe store sheet'],
    [/function dkClose\(\)\{[^\n]*F\.closed\(el\)/, 'recipe deck'],
    [/gateEl = null; \/\* BH-060 \*\/[^\n]*F\.closed\(g\)/, 'sign-in gate'],
    [/function closeScanner\(now\)\{[^\n]*F\.closed\(c\.el\)/, 'scanner'],
    [/getElementById\("e1Ov"\);[^\n]*F\.closed\(ov\)[^\n]*ov\.classList\.remove\("in"\)/, 'close the day'],
    [/H\.classList\.remove\("n1-talk"\); if \(!b\) return;[^\n]*F\.closed\(b\)/, 'companion speech bubble'],
];

test('each own close calls closed() with its own element before it goes', () => {
    for (const [f, re, what] of SITES) assert.match(read(f), re, f + ': ' + what);
    const idx = read('index.html');
    for (const [re, what] of IDX) if (what) assert.match(idx, re, 'index.html: ' + what);
    assert.match(idx, /if \(!r\) return; \/\* BH-060 \*\/ try \{ const F = window\.LowiFreshScrim; if \(F && F\.closed\) F\.closed\(r\); \} catch\(e\)\{\} const had = r\.contains/, 'index.html: What\'s New / welcome card');
});

test('My cycle: a fast 2nd tap on Turn on does not log the chip that the redraw put under it; other chips still work', () => {
    const k = mk();
    const sheet = k.node(k.body, 'cw'), on = k.node(sheet, 'cw-btn pri');
    let logged = 0;
    const turnOn = e => { k.F.closed(sheet, e); on.parentNode = null; };   /* the sheet redraws: Turn on is gone, the chips are in */
    const cramps = k.node(sheet, 'cw-chip'), tired = k.node(sheet, 'cw-chip');
    const log = () => { logged++; };
    k.at(0); k.tap(on, 195, 600, {}, turnOn);
    k.at(120); assert.ok(k.tap(cramps, 196, 602, {}, log).stopped, 'the 2nd tap 120 ms later on the same spot is swallowed');
    assert.strictEqual(logged, 0, 'Cramps was not logged');
    k.at(200); k.tap(tired, 80, 640, {}, log); assert.strictEqual(logged, 1, 'a quick tap on another chip logs at once');
    k.at(700); k.tap(cramps, 195, 600, {}, log); assert.strictEqual(logged, 2, 'a deliberate tap on Cramps later logs it');
});

test('fresh-scrim exports closed()', () => {
    const k = mk();
    assert.strictEqual(typeof k.F.closed, 'function');
});
