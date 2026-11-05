'use strict';
/* Nov 5 2026 (owner, testing the live app): "Körperklang looks old, weird, opens in a weird place and is way too big, it affects the
   whole interface" and "next to VR I want a clear on/off; tapping turns it on, off exists but you can't find it".
   Found in a phone-sized browser (tools/koerperklang-probe.cjs): Home's Sound button is hidden, so Körperklang only opened from
   Settings. That row closed Settings, jumped to Home and 700 ms later hung a 304 x 628 px blue glass card (75% of an iPhone 13
   screen) at the top right with no backdrop, Home's bubbles live around it. The VR row also closed Settings and pressed Home's
   hidden VR button 700 ms later, outside the tap, which iPhone refuses for the motion-permission prompt.
   Now: Körperklang is one bottom sheet over the app with a backdrop, opened in place; VR is a real switch in its Settings row. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const audio = read('world-audio.js'), css = read('world-audio.css'), core = read('world-audio-core.js');
const cme = read('community-me.js'), cmeCss = read('community-me.css'), bloom = read('misty-bloom.js');

test('Körperklang opens in place from Settings, not by jumping to Home and waiting', () => {
    assert.ok(/const HOME_FIRST = \['gift', 'myday'\];/.test(cme), 'worldSound and vr no longer go to Home first');
    assert.ok(/if \(id === 'worldSound'\) \{ const A = root\.LowiWorldAudio; if \(A && typeof A\.open === 'function'\) \{ A\.open\(\); return; \} \}/.test(cme));
    assert.ok(/if \(id === 'worldSound'\) return !!\(root\.LowiWorldAudio && typeof root\.LowiWorldAudio\.open === 'function'\);/.test(cme), 'the row does not need Home\'s hidden button');
    assert.ok(/aria-haspopup="dialog"/.test(cme), 'the row says it opens a sheet');
});

test('Körperklang is a modal bottom sheet: body-level, backdrop, labelled, focus kept inside, focus returned', () => {
    assert.ok(/p\.className = 'wa-panel wa-sheet'/.test(audio));
    assert.ok(/p\.setAttribute\('aria-modal', 'true'\); p\.setAttribute\('aria-labelledby', 'waTitle'\)/.test(audio));
    assert.ok(/D\.body\.appendChild\(sc\); D\.body\.appendChild\(p\);/.test(audio), 'not inside Home\'s HUD any more');
    assert.ok(/sc\.className = 'wa-scrim'/.test(audio), 'dimmed backdrop');
    assert.ok(/e\.key !== 'Tab'/.test(audio) && /z\.focus\(\)/.test(audio) && /a\.focus\(\)/.test(audio), 'Tab wraps inside');
    assert.ok(/p\.tabIndex = -1; try \{ p\.focus\(\{ preventScroll: true \}\); \} catch \(e\) \{ \}/.test(audio), 'focus goes to the sheet');
    assert.ok(/o = D\.querySelector\('\[data-cme="worldSound"\]'\)/.test(audio), 'focus comes back to the Settings row');
    assert.ok(!/if \(!open\) removePanel/.test(audio), 'leaving Home no longer pulls the sheet away under you');
    assert.ok(/el\.classList\.contains\('wa-panel'\) && !el\.classList\.contains\('wa-sheet'\)/.test(bloom), 'no bloom from a hidden button');
});

test('the sheet: bottom edge, safe areas, not taller than the screen, 44 pt targets, solid surfaces per look', () => {
    const sheet = css.slice(css.indexOf('html:root body .wa-panel.wa-sheet.wa-sheet {'));
    assert.ok(/bottom: 0 !important; width: min\(480px, 100vw\)/.test(sheet));
    assert.ok(/max-height: calc\(100dvh - env\(safe-area-inset-top, 0px\) - 16px\)/.test(sheet));
    assert.ok(/padding: 6px 16px calc\(env\(safe-area-inset-bottom, 0px\) \+ 16px\)/.test(sheet), 'clears the home indicator');
    assert.ok(/overscroll-behavior: contain/.test(sheet));
    assert.ok(/backdrop-filter: none !important/.test(sheet), 'solid, so Reduce Transparency and battery saver need nothing');
    assert.ok(/\.wa-x \{ width: 44px !important; height: 44px !important;/.test(sheet));
    assert.ok(/\.wa-row \{[^}]*min-height: 48px !important;/.test(sheet));
    assert.ok(/html:root\[data-black\] body \.wa-panel\.wa-sheet\.wa-sheet \{ --kk-bg: #0e0e10;/.test(sheet), 'true black: neutral, no blue');
    assert.ok(/html:root\[data-theme="light"\] body \.wa-panel\.wa-sheet\.wa-sheet[^{]*\{ --kk-bg: #f2f2f7;/.test(sheet), 'Day');
    assert.ok(/\.ss-pad \{ height: clamp\(104px, 14dvh, 150px\) !important; \}/.test(sheet), 'the pad is smaller');
    assert.ok(/html:root body \.wa-panel\.wa-sheet\.wa-sheet \.wa-x\.lw-bx-src \{ opacity: 0 !important;/.test(sheet), 'one close: the app\'s bottom one');
    assert.ok(/\.wa-more:not\(\[open\]\) > p \{ display: none !important; \}/.test(sheet), 'folded text does not push the bottom close up');
});

test('the sheet slides without rAF (iOS background tabs pause it) and calmly under Reduce Motion / battery saver', () => {
    assert.ok(!/requestAnimationFrame\(\(\) => \{ p\.classList\.add\('wa-in'\)/.test(audio));
    assert.ok(/void p\.offsetHeight; void sc\.offsetHeight; p\.classList\.add\('wa-in'\); sc\.classList\.add\('wa-in'\);/.test(audio));
    assert.ok(/prefers-reduced-motion: reduce\)'\)\.matches \|\| H\.classList\.contains\('battery-saver'\) \|\| H\.classList\.contains\('lowi-saver'\)/.test(audio));
    assert.ok(/@media \(prefers-reduced-motion: reduce\) \{ \.wa-scrim, html:root body \.wa-panel\.wa-sheet\.wa-sheet \{ transition: none !important; \} \}/.test(css));
});

test('hierarchy: grabber, title, pad, one grouped card of three controls, the long text folded under How it works', () => {
    const i = audio.indexOf('function panelHtml()'), html = audio.slice(i, audio.indexOf('function', i + 20));
    const order = ['wa-grab', 'waTitle', 'data-wa-strings', 'wa-group', 'wa-amb', 'wa-vol', 'wa-warp', 'wa-more'];
    let at = -1; for (const k of order) { const j = html.indexOf(k); assert.ok(j > at, k); at = j; }
    assert.ok(/<details class="wa-more"><summary>' \+ tr\('more'\) \+ '<\/summary><p>' \+ tr\('note'\)/.test(html));
    for (const l of ["'How it works'", "'So funktioniert\\u2019s'", "'C\\u00f3mo funciona'"]) assert.ok(core.includes(l), l);
});

test('VR in Settings: a real switch with its state in words, toggled inside the tap (iPhone permission prompt)', () => {
    assert.ok(/role="switch" data-cme="vr" aria-checked="' \+ \(v\.st === 'on'\) \+ '"/.test(cme));
    assert.ok(/aria-describedby="cmeVrSt"/.test(cme));
    for (const w of ["on: 'An', off: 'Aus', denied: 'Bewegung nicht erlaubt'", "on: 'On', off: 'Off', denied: 'Motion not allowed'", "on: 'Activado', off: 'Desactivado'"]) assert.ok(cme.includes(w), w);
    assert.ok(/if \(id === 'vr'\) \{ vrToggle\(b\); return; \}/.test(cme));
    assert.ok(/try \{ g\.tap\(tgt\); \} catch \(e\) \{ \}/.test(cme), 'same toggle as Home\'s VR button (body-world-3d.js gyroTap), so behaviour is unchanged');
    assert.ok(!/setTimeout\(\(\) => \{[^}]*wh-vr[^}]*click/.test(cme), 'no delayed click on Home\'s hidden button');
    assert.ok(/if \(id === 'vr'\) return !!\(root\.LowiWorld3D && root\.LowiWorld3D\.gyro\);/.test(cme));
    assert.ok(/\.cme-swrow \.cme-sw \{[^}]*width: 51px; height: 31px;/.test(cmeCss), 'iOS switch size');
    assert.ok(/html\[data-black\] \.cme-swrow\[aria-checked="true"\] \.cme-sw \{ background: #e9b44c; \}/.test(cmeCss), 'gold in true black');
});

/* the VR row's state logic, run for real */
test('VR row state: off, on, not allowed, no signal, no sensor', () => {
    const i = cme.indexOf('    let vrNote = '), j = cme.indexOf('    /* inside the tap itself');
    const src = cme.slice(i, j);
    const make = (g, note) => new Function('root', 'note', src.replace("let vrNote = '';", 'let vrNote = note;') + '; return vrState();')({ LowiWorld3D: g ? { gyro: g } : null }, note);
    assert.deepEqual(make(null, ''), { st: 'none' });
    assert.deepEqual(make({ on: () => false, kind: () => 'none' }, ''), { st: 'none' });
    assert.deepEqual(make({ on: () => false, kind: () => 'ask' }, ''), { st: 'off' });
    assert.deepEqual(make({ on: () => true, kind: () => 'ask' }, ''), { st: 'on' });
    assert.deepEqual(make({ on: () => false, kind: () => 'ask' }, 'denied'), { st: 'denied' });
    assert.deepEqual(make({ on: () => false, kind: () => 'plain' }, 'no'), { st: 'nosig' });
    assert.deepEqual(make({ on: () => true, kind: () => 'ask' }, 'denied'), { st: 'on' }, 'turned on later wins');
});

test('Home and its bubbles are untouched by this fix (owner likes them)', () => {
    assert.ok(!/wa-sheet|wa-scrim/.test(read('home-orbit-v2.css')));
    assert.ok(!/wa-sheet|wa-scrim/.test(read('world-home.css')));
});

test('Settings leaves the keys to the sheet while it is open, and a late VR repaint never steals focus', () => {
    assert.ok(/if \(D\.querySelector\('\.wa-panel\.wa-sheet:not\(\.mb-ghost\)'\)\) return;   \/\* Nov 5 2026: the K\\u00f6rperklang sheet over Settings handles its own keys \*\//.test(cme));
    assert.ok(/focus stays where it was \(the re-render rebuilds the rows\)/.test(cme));
});
