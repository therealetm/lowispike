'use strict';
/* Nov 5 2026, Calm mode wiring (was Still galaxy). The first Still galaxy photographed the 3D world and swapped Home to its layout
   without the world: on the owner's iPhone Misty and the hologram UI vanished, Community showed only the background, the long press
   on Move did nothing, a ghost bubble sat behind every bubble and a thin ring around Misty, until the app was closed. These checks
   keep that from coming back: nothing photographs the world, nothing lets it go for Calm mode, and each level is read where it acts.
   Browser check: node tools/galaxy-still/calm-flow.cjs */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('Calm mode loads in <head> before the 3D world, and is in the offline cache', () => {
    const html = read('index.html'), head = html.slice(0, html.indexOf('</head>'));
    for (const f of ['galaxy-still.css', 'galaxy-still-core.js', 'galaxy-still.js']) assert.ok(head.includes(f + '?v='), f + ' in <head>');
    assert.ok(head.indexOf('galaxy-still-core.js') < head.indexOf('galaxy-still.js'));
    const w3 = html.indexOf('body-world-3d.js?v=');
    assert.ok(html.indexOf('galaxy-still.js?v=') < (w3 < 0 ? Infinity : w3));
    const sw = read('sw.js');
    for (const f of ['galaxy-still.css', 'galaxy-still-core.js', 'galaxy-still.js']) assert.ok(sw.includes('"' + f + '"'), 'sw.js ' + f);
});

test('no picture and no second layout: the world is never skipped at launch or let go for Calm mode', () => {
    const w3 = read('body-world-3d.js'), gs = read('galaxy-still.js');
    assert.ok(!/stillShot|worldAtLaunch\(\) === 'off'/.test(w3), 'body-world-3d has no still picture and no skip at launch');
    assert.ok(!/toDataURL|toBlob|drawImage|\.release\(|location\.reload|indexedDB\.open/.test(gs), 'galaxy-still never photographs, releases or reloads');
    assert.ok(!/gs-on|gs-pic/.test(read('galaxy-still.css')), 'old still-picture CSS gone');
    assert.ok(/classList\.remove\('gs-on', 'gs-pic', 'gs-framing'\)/.test(gs), 'old classes cleared');
    for (const f of ['fast-bubble.js', 'world-home.js', 'community-me.js']) assert.ok(!/gs-on|gs-pic|stillShot/.test(read(f)), f);
});

test('"The bubble is our thing": Calm mode CSS only takes things away, it never draws a ring, a border or a shadow on Home', () => {
    const css = read('galaxy-still.css');
    const home = css.slice(0, css.indexOf('/* ---------- the sheet'));
    assert.ok(!/border|box-shadow|outline|radial-gradient|::before|::after/.test(home), 'nothing drawn on Home');
    assert.match(home, /html\.cm-nav #whPad[^{]*\{ display: none !important; \}/, 'joystick gone from level 1');
    assert.match(home, /html\.cm-nobg, html\.cm-nobg body \{ background: #000 !important; \}/);
});

test('level 1: drags, pinches, the wheel, the fling, double taps, place taps and the zoom toggle are off; Misty taps still work', () => {
    const js = read('body-world-3d.js');
    assert.match(js, /function navOff\(\) \{ try \{ const G = W\.LowiGalaxyStill; return !!\(G && G\.navOff && G\.navOff\(\)\)/);
    assert.match(js, /if \(navOff\(\)\) \{ lastX = e\.clientX; lastY = e\.clientY; lastT = e\.timeStamp; return; \}\s*world\.drag\(dx, dy\)/);
    assert.match(js, /pts\.size >= 2 && allowPinch && navOff\(\)/);
    assert.match(js, /e\.timeStamp - lastT < 90 && !navOff\(\)\) world\.release/);
    assert.match(js, /e\.preventDefault\(\); if \(navOff\(\)\) return;/, 'wheel');
    assert.match(js, /id === 'cell'\) \{ try \{ W\.dispatchEvent\(new CustomEvent\('lowi:misty-pet'\)\); \} catch \(e\) \{\} \} else if \(id && !navOff\(\)\) api\.flyTo\(id\)/, 'Misty pet kept, travel off');
    assert.match(js, /onDouble: \(x, y\) => \{ if \(!world\) return; if \(navOff\(\)\) return;/);
    assert.match(js, /api\.calmChanged = function/);
    assert.match(read('world-home.js'), /function toggleZoom\(\) \{[\s\S]{0,200}navOff\(\)\) return;/);
});

test('levels 2-4 in the 3D scene: still scenery, no scenery on plain colour, few frames at 4; restored after every frame', () => {
    const js = read('body-world-3d-scene.js');
    assert.match(js, /function worldSpeed\(\) \{ if \(calmLv\(\) >= 2\) return 0;/);
    assert.match(js, /const calmYaw = calmLv\(\) >= 2 \? rig\.yaw : null;[\s\S]{0,1400}if \(calmYaw !== null\) rig\.yaw = calmYaw;/);
    const r = js.slice(js.indexOf('function calmRender()'), js.indexOf('function calmRender()') + 1200);
    assert.match(r, /if \(lv < 3 \|\| !CC\) \{ renderer\.render\(scene, camera\); return; \}/);
    assert.match(r, /!CC\.keeps\(o\)/);
    assert.match(r, /finally \{[\s\S]{0,80}calmHid\.forEach\(o => \{ o\.visible = true; \}\)/, 'scenery shown again after the frame, whatever happens');
    assert.ok(!/renderer\.render\(scene, camera\)/.test(js.replace(r, '')), 'every draw goes through calmRender');
    assert.match(js, /if \(lv >= 4\) iv = Math\.max\(iv, 250\)/);
    assert.match(js, /else if \(lv >= 2 && !paintNow && !inTransit\(\)\) iv = Math\.max\(iv, 1000 \/ 30\)/);
    assert.match(js, /now - lastIn < 2500 && calmLv\(\) < 4/);
    assert.match(js, /repaint\(\) \{ paintNow = true;/);
});

test('level 4: the glass, Misty, the water bubble and every endless CSS animation stand still', () => {
    assert.match(read('living-bubbles.js'), /const still = \(\) => !!\(reduceMq && reduceMq\.matches\) \|\| !!\(W\.LowiGalaxyStill && W\.LowiGalaxyStill\.allStill/);
    assert.match(read('world-home.js'), /const reduced = \(\) => \{ try \{ const G = W\.LowiGalaxyStill; if \(G && G\.allStill && G\.allStill\(\)\) return true;/);
    assert.match(read('fast-bubble.js'), /window\.LowiGalaxyStill\.allStill && window\.LowiGalaxyStill\.allStill\(\)/);
    const gs = read('galaxy-still.js');
    assert.match(gs, /getComputedTiming\(\)\.iterations === Infinity/, 'only endless animations are paused');
    assert.match(gs, /paused\.forEach\(a => \{ try \{ if \(a\.playState === 'paused'\) a\.play\(\);/, 'and played again when leaving 4');
});

test('Settings: same row id, opens one stepped sheet; the tour card describes the levels', () => {
    const cm = read('community-me.js');
    assert.match(cm, /ids: \['sky', 'galaxyStill',/, 'right under the look row');
    assert.match(cm, /data-cme="galaxyStill" aria-haspopup="dialog"/);
    assert.ok(!/data-cme="galaxyStill" role="switch"/.test(cm));
    assert.match(cm, /root\.LowiGalaxyStill\.tap\(\{ back: \(\) => open\(\) \}\)/);
    const gs = read('galaxy-still.js');
    assert.match(gs, /role="radiogroup"/);
    assert.match(gs, /for \(let i = 0; i <= C\.MAX; i\+\+\)/);
    const tut = read('tutorial-steps.js');
    const at = tut.indexOf("id: 'new-still-galaxy'"), card = tut.slice(at, tut.indexOf('\n        }', at));
    assert.match(card, /Calm mode/); assert.match(card, /Ruhemodus/);
    assert.ok(!/zoom|speicher|save the|tap save|Ansicht/i.test(card), 'no framing words in the tour card');
});
