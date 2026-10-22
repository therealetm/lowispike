/* Oct 18 2026 (Emmanuel, iPad): "Some of the everything is redundant." Settings > More ("Everything else") is trimmed to what no
   Home bubble already reaches, split into two short groups (Go to / Settings), and placed so it never covers Misty, never
   scrolls on iPhone or iPad, and keeps its Back / x header in view. Pure helpers from home-settings-sleep-v2.js. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../home-settings-sleep-v2.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const all = { has: () => true };

test('Oct 21 2026: what no bubble reaches lives in Community (profile first, then the places); World sound is a Settings row', () => {
    assert.deepStrictEqual(C.MORE_GROUPS.go, ['me', 'body', 'weight', 'foryou', 'care', 'workouts', 'map', 'gift', 'hunt']);
    assert.deepStrictEqual(C.MORE_GROUPS.set, []);
    assert.deepStrictEqual(C.MORE, C.MORE_GROUPS.go.concat(C.MORE_GROUPS.set));
    assert.deepStrictEqual(C.moreGroups({ has: id => id === 'care' || id === 'worldSound' }), { go: ['care'], set: [] });
    assert.deepStrictEqual(C.entries('more', all), C.MORE);
    assert.ok(C.entries('settings', all).includes('worldSound'));
});

test('redundant entries are out of the panel, and each one says where it is still reached', () => {
    for (const id of ['today', 'cook', 'theme', 'quest', 'vr', 'weather', 'community']) assert.ok(!C.entries('more', all).includes(id), id + ' should be out of More');
    assert.deepStrictEqual(Object.keys(C.MORE_REMOVED).sort(), ['community', 'cook', 'quest', 'theme', 'today', 'vr', 'weather', 'worldSound']);
    assert.strictEqual(C.MORE_REMOVED.cook, 'fuel');
    assert.strictEqual(C.MORE_REMOVED.theme, 'settings');
    /* no feature code deleted: the routes stay in the module */
    const src = read('home-settings-sleep-v2.js');
    for (const k of ['today:', 'cook:', 'theme:', 'quest:', 'vr:', 'weather:']) assert.ok(src.includes('        ' + k), 'route kept: ' + k);
});

/* a stand-in for the browser measure: the panel's height at a width and column count (same rhythm as the CSS) */
const measure = (go, set) => (w, cols) => {
    const rows = n => Math.ceil(n / cols) * 44 + (Math.ceil(n / cols) - 1) * 6;
    return 10 + 40 + (go ? 24 + rows(go) : 0) + (set ? 24 + rows(set) : 0) + 10;
};
const ring = list => list.map(([k, l, t, w, h]) => ({ k, l, t, r: l + w, b: t + h }));
const disk = (l, t, w) => ({ x: l + w / 2, y: t + w / 2, r: w / 2 });
const overlaps = (a, b) => a.left < b.r && a.left + a.width > b.l && a.top < b.b && a.top + a.height > b.t;
const hitsDisk = (p, d) => { const nx = Math.max(p.left, Math.min(d.x, p.left + p.width)), ny = Math.max(p.top, Math.min(d.y, p.top + p.height)); return Math.hypot(nx - d.x, ny - d.y) < d.r; };
function check(name, o, want) {
    const P = C.placePanel(Object.assign({ measure: measure(7, 1), safe: { t: 0, r: 0, b: 0, l: 0 } }, o));
    assert.ok(P.fit, name + ': fits with no scrolling ' + JSON.stringify(P));
    assert.ok(!hitsDisk(P, o.misty), name + ': never covers Misty ' + JSON.stringify(P));
    assert.ok(P.left >= 0 && P.top >= 0 && P.left + P.width <= o.vw && P.top + P.height <= o.vh, name + ': on screen ' + JSON.stringify(P));
    if (want.side) assert.strictEqual(P.side, want.side, name + ': side');
    if (want.clearRing) o.rects.forEach(q => assert.ok(!overlaps(P, q), name + ': clear of ' + q.k + ' ' + JSON.stringify(P)));
    return P;
}

/* live geometry of build 20261018-175840 (WebKit), and the same rings with Settings moved to the top slot (task 0bed29fd) */
const IPAD_L = ring([['gap', 322, 315, 124, 124], ['water', 674, 170, 124, 124], ['move', 734, 315, 124, 124], ['scan', 528, 109, 124, 124], ['sleep', 383, 461, 124, 124], ['settings', 674, 461, 124, 124], ['joy', 528, 521, 124, 124], ['fuel', 383, 170, 124, 124]]);
const IPAD_P = ring([['gap', 140, 481, 124, 124], ['water', 495, 334, 124, 124], ['move', 556, 481, 124, 124], ['scan', 348, 273, 124, 124], ['sleep', 201, 628, 124, 124], ['settings', 495, 628, 124, 124], ['joy', 348, 689, 124, 124], ['fuel', 201, 334, 124, 124]]);
const PHONE = ring([['gap', 7, 240, 77, 77], ['water', 263, 134, 77, 77], ['move', 306, 240, 77, 77], ['scan', 157, 90, 77, 77], ['sleep', 51, 346, 77, 77], ['settings', 263, 346, 77, 77], ['joy', 157, 390, 77, 77], ['fuel', 51, 134, 77, 77]]);
const at = (rects, k) => { const q = rects.find(r => r.k === k); return { x: (q.l + q.r) / 2, y: (q.t + q.b) / 2 }; };

test('iPad landscape: beside the ring on the Settings side, clear of Misty and every bubble', () => {
    const o = { vw: 1180, vh: 820, misty: disk(463, 250, 255), rects: IPAD_L };
    check('landscape, Settings lower right', Object.assign({ bubble: at(IPAD_L, 'settings') }, o), { side: 'right', clearRing: true });
    check('landscape, Settings on top', Object.assign({ bubble: at(IPAD_L, 'scan') }, o), { clearRing: true });
});

test('iPad portrait: in the free band below or above the ring, clear of Misty and every bubble', () => {
    const o = { vw: 820, vh: 1180, misty: disk(281, 414, 258), rects: IPAD_P };
    check('portrait, Settings lower right', Object.assign({ bubble: at(IPAD_P, 'settings') }, o), { side: 'below', clearRing: true });
    check('portrait, Settings on top', Object.assign({ bubble: at(IPAD_P, 'scan') }, o), { side: 'above', clearRing: true });
});

test('iPhone 13 (390 x 664 Safari, 390 x 844 home-screen app): no free band, so it sits right under Misty, still fits and never covers her', () => {
    for (const vh of [664, 844]) {
        const o = { vw: 390, vh, misty: disk(96, 179, 199), rects: PHONE };
        check('phone ' + vh + ', Settings lower right', Object.assign({ bubble: at(PHONE, 'settings') }, o), {});
        check('phone ' + vh + ', Settings on top', Object.assign({ bubble: at(PHONE, 'scan') }, o), {});
    }
});

test('a window too small for everything: the header stays put and only the list scrolls', () => {
    const P = C.placePanel({ vw: 320, vh: 420, misty: disk(60, 60, 200), rects: [], bubble: { x: 260, y: 300 }, measure: measure(7, 1), safe: { t: 0, r: 0, b: 0, l: 0 } });
    assert.strictEqual(P.fit, false);
    assert.ok(P.height > 0 && P.top + P.height <= 420);
    const css = read('home-settings-sleep-v2.css');
    assert.match(css, /\.ss2-panel\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column/, 'panel is a column: header, then body');
    assert.match(css, /\.ss2-head\s*\{[^}]*flex:\s*none/, 'header never shrinks or scrolls');
    assert.match(css, /\.ss2-body\s*\{[^}]*overflow:\s*auto/, 'only the body can scroll');
    assert.doesNotMatch(css.match(/\.ss2-panel\s*\{[^}]*\}/)[0], /overflow:\s*auto/, 'the panel itself never scrolls');
});

test('group labels exist in English, German and Spanish; no emoji', () => {
    for (const l of ['en', 'de', 'es']) { assert.ok(C.TX[l].goTo && C.TX[l].settingsGroup, l); }
    assert.strictEqual(C.TX.en.goTo, 'Go to'); assert.strictEqual(C.TX.de.goTo, 'Gehe zu'); assert.strictEqual(C.TX.es.goTo, 'Ir a');
    assert.doesNotMatch(read('home-settings-sleep-v2.js') + read('home-settings-sleep-v2.css'), /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});
