'use strict';
/* Nov 5 2026 (owner, after build 20261105-030004: "you said I got the dark mode, but I don't" / the App theme row only went Day and
   Night). Root cause: the Day/night switch (top-bar.js toggleTheme, which the Settings row ran) asked atmosphere.js for 'night', and
   quick('night') saved lowi.theme.dark = 'night' (the blue Night) over Dark on the first Day -> dark tap. These pin the fix:
   the switch keeps the chosen dark look, the Settings row offers all four looks, a Night the old switch saved is undone once,
   and a Night picked by hand stays. tools/theme-fix/probe.cjs is the browser check. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

/* runs true-black.js in a small fake page with the given saved values; returns the API and the store */
function boot(saved) {
    const store = Object.assign({}, saved || {});
    const attrs = { 'data-theme': 'dark' };
    const H = { getAttribute: k => (k in attrs ? attrs[k] : null), setAttribute: (k, v) => { attrs[k] = String(v); }, removeAttribute: k => { delete attrs[k]; }, hasAttribute: k => k in attrs, classList: { contains: () => false, toggle() { }, add() { }, remove() { } }, style: {} };
    const D = { documentElement: H, querySelector: () => null, querySelectorAll: () => [], addEventListener() { }, dispatchEvent() { }, styleSheets: [], body: null, readyState: 'complete' };
    const win = {
        document: D, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        addEventListener() { }, setInterval: () => 0, setTimeout: () => 0, clearTimeout() { }, requestAnimationFrame: () => 0, MutationObserver: function () { this.observe = () => { }; },
        CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; }, getComputedStyle: () => ({ getPropertyValue: () => '' }), console
    };
    win.window = win; win.self = win; win.globalThis = win;
    win.LowiTrueBlackCore = require('../true-black-core.js');
    const ctx = vm.createContext(win);
    vm.runInContext(read('true-black-core.js'), ctx, { filename: 'true-black-core.js' });
    vm.runInContext(read('true-black.js'), ctx, { filename: 'true-black.js' });
    return { TB: win.LowiTrueBlack, store };
}

test('a blue Night the old Day/night switch saved goes back to Dark once; nothing saved stays Dark', () => {
    let r = boot({ 'lowi.theme.dark': 'night' });
    assert.equal(r.TB.kind(), 'black');
    assert.equal(r.store['lowi.theme.dark.fix1'], '1');
    r = boot({});
    assert.equal(r.TB.kind(), 'black');
});

test('a Night picked by hand stays Night, also after the one-time repair ran', () => {
    let r = boot({});
    r.TB.set('night', { byHand: true });
    assert.equal(r.store['lowi.theme.dark.picked'], 'night');
    const again = boot(r.store);
    assert.equal(again.TB.kind(), 'night');
    /* Nov 5 2026 (test changed, why): owner "make dark mode the universal mode for everyone": every device switches to Dark once
       (lowi.theme.dark.all1); a device that already had that switch keeps its Night */
    r = boot({ 'lowi.theme.dark': 'night', 'lowi.theme.dark.fix1': '1', 'lowi.theme.dark.all1': '1' });
    assert.equal(r.TB.kind(), 'night', 'the repair runs only once per device');
});

test('the Day/night switch keeps the chosen dark look instead of saving Night', () => {
    const tb = read('top-bar.js');
    assert.ok(tb.includes("root.LowiAtmos.quick(to === 'light' ? 'day' : darkKind, { toast: false })"));
    assert.ok(!tb.includes("quick(to === 'light' ? 'day' : 'night'"), 'the old call that saved Night is gone');
    const atm = read('atmosphere.js');
    assert.ok(atm.includes("quick(q.getAttribute('data-atm-quick'), { byHand: true })"), 'a tap on Night in Day & night is a choice by hand');
});

/* Nov 5 2026 (test changed, why): owner "have the app theme be inside of the time of day and weather ... like Apple would": the
   separate App theme row is gone; the one look row opens the sheet whose first group is Day / Dark / Night / Auto (by hand). */
test('Settings: Look, time of day & weather opens the sheet with Day / Dark / Night / Auto first', () => {
    const src = read('community-me.js'), atm = read('atmosphere.js'), css = read('atmosphere.css');
    assert.ok(!src.includes("if (id === 'theme') return true;"), 'no separate App theme row');
    assert.ok(src.includes("if (id === 'sky') return !!(root.LowiAtmos && typeof root.LowiAtmos.openSheet === 'function');"));
    assert.ok(src.includes("if (id === 'sky') { close(false); openSky(); return; }"));
    assert.ok(atm.includes("data-atm-quick=\"black\"") && atm.includes("quick(q.getAttribute('data-atm-quick'), { byHand: true })"));
    assert.ok(/\.atm-grouped \.atm-quick button \{[^}]*height: 44px/.test(css), '44 px tap targets');
});

test('the live weather switch sits in the Day & night card (its old Appearance sheet has no way in)', () => {
    const atm = read('atmosphere.js'), core = read('atmosphere-core.js');
    assert.ok(atm.includes('data-atm-wx') && atm.includes('role="switch"'));
    assert.ok(atm.includes("window.LowiSky.setEnabled(!skyOn())"));
    assert.ok(core.includes("wx: ['Live weather sky', 'Live-Wetter im Hintergrund', 'Cielo en vivo']"));
});
