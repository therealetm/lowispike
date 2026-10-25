'use strict';
/* Oct 18 2026, Emmanuel (Maya 4 handoff, Home section): "Settings: a single tap opens the full page (Me, Look, Sound, Account and More
   live there, not as bubbles)". home-settings-sleep-v2.js: one tap on the Settings bubble opens ONE full Settings page instead of
   blooming chips round the bubble and a second More panel. Double tap (symmetric ring) and hold (secondary page) are separate tasks.
   The browser proof is tests/ui-settings-page-live.cjs (Chromium and WebKit, iPhone 13 390x844 and iPad). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../home-settings-sleep-v2.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const JS = read('home-settings-sleep-v2.js'), CSS = read('home-settings-sleep-v2.css');

test('Oct 21 2026: the bubble is Community: a tap opens Community, a hold opens Settings, a tap while Settings is open closes it', () => {
    assert.strictEqual(typeof C.tapIntent, 'function', 'tapIntent(bubble, open) is exported');
    assert.strictEqual(C.tapIntent('settings', null), 'community', 'closed: one tap opens Community');
    assert.strictEqual(C.tapIntent('settings', 'sleep'), 'community', 'Sleep bloom open: a tap still goes to Community');
    assert.strictEqual(C.holdIntent('settings'), 'hub', 'a hold opens the profile hub (item 42)');
    assert.strictEqual(C.holdIntent('sleep'), null, 'only the Community bubble has a hold');
    assert.ok(C.HOLD_MS >= 400 && C.HOLD_MS <= 600, 'hold time like iOS (about half a second)');
    for (const o of ['page', 'settings', 'more']) assert.strictEqual(C.tapIntent('settings', o), 'close', 'open ' + o + ': a second tap closes');
    /* Sleep keeps its own bloom exactly as before */
    assert.strictEqual(C.tapIntent('sleep', null), 'sleep');
    assert.strictEqual(C.tapIntent('sleep', 'page'), 'sleep');
    assert.strictEqual(C.tapIntent('sleep', 'sleep'), 'close');
});

test('the slim Settings holds only switches, language and the account; places and the profile live in Community', () => {
    assert.strictEqual(typeof C.pageGroups, 'function', 'pageGroups(env) is exported');
    const all = C.pageGroups({ has: () => true });
    assert.deepStrictEqual(all.map(g => g.key), ['main', 'account']);
    assert.deepStrictEqual(all[0].ids, ['theme', 'look', 'worldSound', 'language', 'tutorial']);
    assert.deepStrictEqual(all[1].ids, ['account', 'deleteAccount'], 'sign-out and account deletion stay reachable (App Store 5.1.1(v))');
    for (const id of ['me', 'body', 'weight', 'care', 'workouts', 'map', 'gift', 'vr', 'weather', 'community']) assert.ok(!all.some(g => g.ids.includes(id)), id + ' is not in Settings');
    assert.deepStrictEqual(C.pageGroups({ has: () => false }), [], 'nothing to show: no empty groups');
    assert.deepStrictEqual(C.pageGroups({ has: id => id === 'tutorial' || id === 'account' }), [{ key: 'main', ids: ['tutorial'] }, { key: 'account', ids: ['account'] }]);
    assert.strictEqual(C.rowAction('language'), 'lang'); assert.strictEqual(C.rowAction('deleteAccount'), 'confirm'); assert.strictEqual(C.rowAction('theme'), 'toggle');
    assert.deepStrictEqual(C.COMMUNITY_PLACES.you, ['me', 'body', 'myday'], 'Weight journey merged into Weight & BMI, no own row (Oct 22 2026); My day holds the retired Today sheet\'s parts (Oct 25 2026)');
    /* Oct 22 2026: the hub's Explore list is gone; each place keeps its own way in (community-hub-settings.test.cjs) */
    for (const id of ['care', 'workouts', 'gift', 'foryou', 'hunt']) assert.ok(C.EXPLORE_MOVED[id], id + ' has a way in outside the hub');
    for (const id of ['vr', 'weather']) assert.strictEqual(C.MORE_REMOVED[id], 'removed', id + ' is out of every menu');
});

test('delete account asks first, calls the server, and only clears the phone after the server said ok', () => {
    assert.match(JS, /functions\.invoke\('delete-my-account'/);
    assert.match(JS, /ok = !!\(r && !r\.error && r\.data && r\.data\.ok\)/);
    assert.match(JS, /if \(ok\) \{[\s\S]{0,400}?wipeDevice\(\); return true;/);  /* Oct 25: the ok branch spans lines (push unsubscribe first) */
    assert.match(JS, /T\.delFail/, 'a failed call says nothing was deleted');
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'supabase', 'functions', 'delete-my-account', 'index.ts')), 'the server function is in the repo');
});

test('the page is a real dialog: labelled, modal, closes with x and Escape, and the bubble announces it', () => {
    assert.match(JS, /role="dialog" aria-modal="true"/, 'page markup is a modal dialog');
    assert.match(JS, /class="ss2-page"/);
    assert.match(JS, /data-ss2="close"/, 'it has a close (x) button');
    assert.match(JS, /g\.removeAttribute\('aria-haspopup'\)/, 'the Community bubble opens a page, not a dialog (Oct 21 2026)');
    assert.match(JS, /tapIntent\(k, open\)/, 'the bubble tap goes through tapIntent');
    assert.match(JS, /'Tab'/, 'Tab keeps focus inside the open page');
    for (const l of ['en', 'de', 'es']) for (const k of Object.keys(C.TX.en)) assert.ok(k in C.TX[l], l + ' has ' + k);
});

test('page look: one glass style, a dimming layer (no blur over the moving world), safe areas, 44 px rows, reduced motion respected', () => {
    assert.match(CSS, /\.ss2-page\s*\{/);
    const page = CSS.slice(CSS.indexOf('.ss2-page {'), CSS.indexOf('}', CSS.indexOf('.ss2-page {')));
    assert.doesNotMatch(page, /backdrop-filter/, 'no full-screen blur over the animated world (phone heat)');
    assert.match(CSS, /safe-area-inset-top/); assert.match(CSS, /safe-area-inset-bottom/);
    assert.match(CSS, /\.ss2-page \.ss2-chip\.ss2-row[^}]*min-height:\s*(4[4-9]|5\d)px/, 'rows are at least 44 px tall');
    assert.match(CSS, /prefers-reduced-motion[^}]*\.ss2-page/, 'reduced motion turns the page animation off');
    assert.doesNotMatch(JS + CSS, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'no emoji');
});

test('the chip bloom code stays for the queued double tap; only the single tap changed', () => {
    assert.match(JS, /function fan\(o\)/);
    assert.match(JS, /open: k => \{ detached = false; return show\(k\); \}/, 'show("settings") still blooms through the API');
    assert.doesNotMatch(JS, /dblclick/i, 'no double tap');
});
