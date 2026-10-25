'use strict';
/* Oct 25 2026, 08:01 (Eman, iPhone screenshot of the little bubble on Home and the sheet it opened): "Nuke it. I don't know what
   this is for anymore." Misty's nudge on Home and the Today sheet behind it are retired. Nothing it held may get lost:
   every part has another way in (DECISIONS.md, 25 Oct). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const mh = read('misty-hub.js'), css = read('misty-hub.css'), wh = read('world-home.js'), hs = read('home-settings-sleep-v2.js'), cme = read('community-me.js');

test('no more nudge bubble on Home: retired, no timer, an old one is removed', () => {
    assert.ok(/const NUDGES_RETIRED = true;/.test(mh));
    assert.ok(/function tick\(\) \{\s*if \(NUDGES_RETIRED\) \{ if \(nudge\) hideNudge\(\); return; \}/.test(mh), 'tick never shows a nudge');
    assert.ok(/function boot\(\) \{ if \(NUDGES_RETIRED\) \{ const old = D\.getElementById\('mhNudge'\); if \(old\) old\.remove\(\); return; \}/.test(mh), 'no 1.5 s interval any more');
    assert.ok(/nudgesRetired: NUDGES_RETIRED/.test(mh));
});

test('the Today sheet never opens again, but stays built so its modules keep their state', () => {
    assert.ok(/const TODAY_RETIRED = true;\s*function openToday\(on\) \{\s*if \(TODAY_RETIRED\) on = false;\s*const box = ensureToday\(\);/.test(wh));
    assert.ok(/todayRetired: TODAY_RETIRED/.test(wh));
});

test('journeys (and the surprise), sun and weekly goal are round bubbles on Misty\'s card and do what the old rows did', () => {
    assert.ok(/cycleHtml\(\) \+\s*todayHtml\(\) \+/.test(mh), 'on the card, right after the doors and the cycle');
    assert.ok(/k: 'trip'[\s\S]{0,200}T\('Surprise!', '\\u00dcberraschung!'/.test(mh), 'shows the surprise when she is back');
    assert.ok(/trip: \(\) => proxy\('data-bt', 'bar'\), sun: \(\) => proxy\('data-ls', 'info'\), goal: \(\) => proxy\('data-dr', 'chip'\)/.test(mh));
    assert.ok(/D\.body\.appendChild\(t\); try \{ t\.click\(\); \} finally \{ t\.remove\(\); \}/.test(mh), 'tapped from outside any sheet, like the old row');
    assert.ok(/else if \(k\.indexOf\('t-'\) === 0 && TODAY_ACT\[k\.slice\(2\)\]\) \{ const go = TODAY_ACT\[k\.slice\(2\)\]; close\(\); setTimeout/.test(mh), 'closes the card first');
});

test('My day: the six old shortcuts, macro goals and Your inside, from Community hold -> You', () => {
    assert.ok(/D\.querySelectorAll\('#g2hTiles \[data-g2h-open\]'\)/.test(mh), 'mirrors the old shortcut tiles');
    assert.ok(/if \(k\.indexOf\('g-'\) === 0\) return proxy\('data-g2h-open', k\.slice\(2\)\);/.test(mh));
    assert.ok(/if \(k === 'macro'\) return proxy\('data-sp', 'goals'\);/.test(mh));
    assert.ok(/W\.LowiMyDay = \{ open: dayOpen, close: dayClose, items: dayItems, _html: dayHtml \};/.test(mh));
    assert.ok(/COMMUNITY_PLACES = \{ you: \['me', 'body', 'myday'\]/.test(hs));
    assert.ok(/myday: \{ has: \(\) => !!\(root\.LowiMyDay && fn\(root\.LowiMyDay, 'open'\)\), run: \(\) => root\.LowiMyDay\.open\(\) \}/.test(hs));
    for (const l of ["myday: 'My day'", "myday: 'Mein Tag'", "myday: 'Mi d\\u00eda'"]) assert.ok(hs.includes(l), l);
    assert.ok(/HOME_FIRST = \['gift', 'myday'\]/.test(cme));
});

test('living-bubble look: round glass, label under it that wraps, only a bubble that needs you breathes (and only with motion on)', () => {
    assert.ok(/\.mh-ob \{[^}]*width: 60px; height: 60px; border-radius: 50%;/.test(css));
    assert.ok(/\.mh-orb b \{[^}]*overflow-wrap: break-word; hyphens: manual;/.test(css));
    assert.ok(/@media \(prefers-reduced-motion: no-preference\) \{ \.mh-orb\.on \.mh-ob \{ animation: mh-breathe/.test(css));
    assert.ok(!/\.mh-orb:not\(\.on\)[^{]*\{[^}]*animation/.test(css));
});

test('Scan hold still opens every bubble\'s choices (bloom ring), not the Today sheet', () => {
    const br = read('bloom-ring.js');
    assert.ok(!/openToday|whToday/.test(br));
});
