'use strict';
/* Oct 22 2026 (item 42, Emmanuel): a long press on the Community bubble on Home opens the profile hub (community-me.js: picture, name,
   XP, gear, X, the You section) instead of the slim Settings. A tap still opens Community. The click that ends the hold reaches nothing
   (on iPhone it lands on the hub's backdrop, which used to close the hub again), however long the finger stayed; a light cue while held;
   the picture and the name in the hub open the Profile tab like the Profile row. Simulator check: tools/community-settings/hold.js. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const C = require(path.join(ROOT, 'home-settings-sleep-v2.js'));

/* Oct 29 2026 (Emmanuel, live call: "wenn man lange drückt auf Community ... dann passiert gar nichts"): the one settings page opens
   from the Community name inside Circle (community-me.js / community-rooms-ui.js). A hold on the bubble does nothing; it still eats
   the click that ends it, so a long press does not enter Community either. */
test('a hold on the Community bubble does nothing now, a tap still means Community', () => {
    assert.strictEqual(C.holdIntent('settings'), null);
    assert.strictEqual(C.holdIntent('sleep'), null);
    assert.strictEqual(C.tapIntent('settings', null), 'community');
});

test('the hold timer stops before opening anything; the Circle heading opens the settings page', () => {
    const js = read('home-settings-sleep-v2.js');
    const body = js.slice(js.indexOf('function onHoldDown'), js.indexOf('function onHoldClick'));
    assert.match(body, /if \(!intent\) return;/, 'no intent, nothing opens');
    assert.match(body, /if \(intent\) holdCue\(true\)/, 'no hold cue either');
    assert.match(read('community-rooms-ui.js'), /a==='menu'[\s\S]{0,900}LowiCommunityMe\.open\(\)/, 'the Community name opens the one settings page');
    assert.match(js, /function openHub\(\)[\s\S]{0,200}LowiCommunityMe[\s\S]{0,200}M\.open\(\)/);
});

test('the click that ends a hold is swallowed wherever it lands, before every other handler, and only that one', () => {
    const js = read('home-settings-sleep-v2.js');
    assert.match(js, /root\.addEventListener\('click', onHoldClick, true\)/, 'window capture sees the click first');
    assert.match(js, /function onHoldClick[\s\S]{0,300}stopImmediatePropagation/);
    /* no fixed 1.2 s window from the moment the hold fired: a 3.5 s hold used to let its click through */
    assert.ok(!/swallowUntil = Date\.now\(\) \+ 1200/.test(js));
    assert.match(js, /function holdLift\(\)[\s\S]{0,120}swallowUntil = Date\.now\(\) \+ 450/, 'short window after the lift');
    assert.match(js, /\['pointerup', 'pointercancel'\]\.forEach\(n => D\.addEventListener\(n, holdLift, true\)\)/);
    assert.match(js, /addEventListener\('touchend'[\s\S]{0,160}preventDefault[\s\S]{0,80}passive: false/, 'iOS makes no click after a hold');
    assert.match(js, /function onHoldDown\(e\) \{\s*if \(!holdFired\) swallowUntil = 0;/, 'a new touch is never swallowed');
});

test('a light cue while the finger is down, no callout or selection on the bubble', () => {
    const js = read('home-settings-sleep-v2.js'), css = read('home-settings-sleep-v2.css');
    assert.match(js, /classList\.toggle\('ss2-holding'/);
    assert.match(css, /\[data-orbit="settings"\]\.ss2-holding \{[^}]*filter:/);
    assert.ok(!/\.ss2-holding \{[^}]*transform/.test(css), 'no transform: the ring places the bubble');
    assert.match(css, /\[data-orbit="settings"\]\[data-o8-adapter="settings-sleep"\] \{ -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; \}/);
    assert.match(js, /addEventListener\('contextmenu'/);
});

test('in the settings page, your picture card opens Your details', () => {
    const js = read('community-me.js');
    assert.match(js, /class="cme-head cme-me" data-cme="me"/);
    assert.match(js, /if \(id === 'me'\) \{ const Y = root\.LowiYourDetails;/);
    assert.match(read('community-me.css'), /\.cme-av, \.cme-who \{ cursor: pointer; \}/);
});

test('the Home hint names the hub, in all three languages', () => {
    assert.match(C.TX.en.hint, /profile/i);
    assert.match(C.TX.de.hint, /Profil/);
    assert.match(C.TX.es.hint, /perfil/);
});
