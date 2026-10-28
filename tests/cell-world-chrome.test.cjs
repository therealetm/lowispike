/* Cell world chrome (Oct 17, 2026). Emmanuel, iPad screenshots inside the heart world: "inside the cell world the panels appear,
   that's not supposed to happen", "the menu, the menu bar and stuff like that ... it's a mistake that it pops up", and the Daily Quest
   with the HEART line in there was "still the old design ... not the water liquid design that we had going on in the homepage".
   Inside a cell world (html.wh-away) Home's menus and panels never show, not even after the reveal tap; Misty, her cell, the cell
   guide, the controller and the bottom-centre X stay (the World map stick was removed on Oct 22 2026); the living membrane is no longer switched off inside a world. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const CV = require('../clean-view-core.js');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const world = CV.worldCss();
const rules = world.split(',\n');

test('inside a cell world every Home menu and panel is hidden, whatever the clean state', () => {
    for (const k of ['#tabbar', '#tbTheme', '#pfBtn', '#tab-home .sp-top', '#spFast', '#f3Board', '#hcLine', '#whHint', '#arrCard', '#hqSlot', '.hq-pop'])
        assert.ok(rules.includes('html.wh-home.wh-away ' + k), 'hidden in a world: ' + k);
    for (const r of rules) {
        assert.ok(r.startsWith('html.wh-home.wh-away '), 'scoped to being inside a world: ' + r);
        assert.ok(!/lw-clean/.test(r), 'not tied to the clean flight view, so the reveal tap cannot bring it back: ' + r);
    }
    /* the HUD rule takes everything in #whHud (Today, VR, Sound, water...) except what must stay */
    const hud = rules.find(r => r.includes('#whHud >'));
    for (const k of ['#whPad', '#whPadChip', '#rpPal', '#mhNudge']) assert.ok(hud.includes(':not(' + k + ')'), 'stays in a world: ' + k);
});

test('Misty, her cell, the guide and its speech bubble are never named by the world rule', () => {
    const bare = world.replace(/:not\([^)]*\)/g, '');
    for (const k of ['#spBubble', '#bw3Stage', '.bw3-canvas', '#rpPal', '.rp-body', '.rp-say', '#mhNudge', '#whPad', '#whPadChip'])
        assert.ok(!bare.includes(k), 'not hidden: ' + k);
});

test('the Home view is untouched: the world rule only applies with wh-away, the clean flight view still works', () => {
    assert.ok(!rules.some(r => !r.includes('.wh-away ')));
    let r = CV.step(CV.init(), { type: 'mode', mode: 'auto' });
    assert.equal(r.act, 'hide');
    r = CV.step(r.st, { type: 'tap' });
    assert.equal(r.act, 'show');
    assert.deepEqual(CV.HIDE_AUTO, ['#whPad', '#whPadChip'], 'the controller still fades on autopilot');
});

test('clean-view.js injects the world rule, with no tap or class path that removes it', () => {
    const js = read('clean-view.js');
    assert.ok(js.includes('C.worldCss()'), 'the world rule is part of the injected styles');
    assert.ok(/C\.worldCss\(\) \+ ' \{ opacity: 0 !important; visibility: hidden !important; pointer-events: none !important;/.test(js));
});

test('the living liquid membrane is not switched off inside a world (no old flat shell)', () => {
    const js = read('living-bubbles.js');
    const m = js.match(/function homeShown\(\) \{[\s\S]*?\n    \}/);
    assert.ok(m, 'homeShown found');
    assert.ok(!/wh-away/.test(m[0].replace(/\/\*[\s\S]*?\*\//g, '')), 'wh-away no longer hides the membranes');
    assert.ok(/wh-cosmos\|wb-on/.test(m[0]), 'still off in the spirit world and the full-screen world');
});

test('Today never rides along into a world', () => {
    const js = read('world-home.js');
    assert.ok(/H\.classList\.toggle\('wh-away', aw\);\s*\/\*[^*]*\*\/\s*if \(aw && st\.today\) \{ try \{ openToday\(false\); \}/.test(js));
});
