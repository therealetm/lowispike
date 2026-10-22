'use strict';
/* The tutorial speaker button (item 39, 22 Oct 2026). Emmanuel, photos of cards 8 and 24 on his iPhone: "The microphone looks weird and to
   big fix it." "Move the speaker to the right where it's empty. Looks better." It was a badge on the companion picture, and because
   tutorial-voice.css loads in <head> before tutorial.css, tutorial.css's `.lt-guide svg { width: 56px; height: 56px }` won and drew the
   speaker glyph 56 px wide on a 26 px badge, running over the text. Now it is its own small glass button in the top row's right column.
   Browser check of the real layout on every card: node tools/tutorial-voice-btn/layout-check.cjs */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const js = read('tutorial-voice.js'), css = strip(read('tutorial-voice.css'));
const rules = () => { const out = []; const re = /([^{}]+)\{([^{}]*)\}/g; let m; while ((m = re.exec(css))) out.push({ sel: m[1].trim(), body: m[2] }); return out; };

test('the companion picture is no longer the speaker; the speaker is its own button in the top row, under Skip all', () => {
    const code = strip(js);
    assert.ok(!/className = 'lt-guide lt-speak'/.test(code), 'the companion picture is not turned into the speaker button');
    assert.ok(!/g\.replaceWith\(/.test(code), 'the picture is left as it is');
    const fn = code.slice(code.indexOf('function speaker(el)'), code.indexOf('function render('));
    assert.ok(fn.length > 50, 'speaker() exists');
    assert.match(fn, /querySelector\('\.lt-top'\)/, 'goes into the top row');
    assert.match(fn, /className = 'lt-side'/, 'a right column');
    assert.match(fn, /querySelector\('\.lt-skipall'\)[^\n]*side\.appendChild\(sk\)/, 'Skip all moves into the column first');
    assert.match(fn, /className = 'lt-speak'/, 'the button keeps the lt-speak class (tutorial.js focus, the voice checks)');
    assert.ok(fn.indexOf('side.appendChild(b)') > fn.indexOf('side.appendChild(sk)'), 'the speaker comes after (under) Skip all');
    assert.match(fn, /addEventListener\('click', toggle\)/);
    assert.match(code, /function render\([^)]*\) \{[\s\S]*?speaker\(el\);/, 'render() adds it on every card');
});

test('the glyph carries its own small size, so no other stylesheet can blow it up', () => {
    const spk = js.match(/const SPK = '<svg[^>]*>/); assert.ok(spk, 'SPK icon');
    assert.match(spk[0], /width="18" height="18"/, 'same 18 px as the Pause icon');
});

test('every speaker rule is scoped to #ltTour, so it beats tutorial.css whatever the load order', () => {
    const sp = rules().filter(r => /\.lt-(speak|spk|side)\b/.test(r.sel) && !/@keyframes/.test(r.sel));
    assert.ok(sp.length >= 8);
    for (const r of sp) for (const s of r.sel.split(',').filter(x => x.trim() !== '.lt-w')) assert.match(s.trim(), /#ltTour|^\.lt-tour\.lt-rm|^\.lt-top /, 'scoped: ' + s.trim());
    /* (specificity of '#ltTour .lt-spk svg' is 1,1,1 > '.lt-guide svg' 0,1,1) */
    const px = (sel, prop) => { const r = rules().find(x => x.sel === sel); assert.ok(r, sel); const m = r.body.match(new RegExp('(?:^|[;\\s])' + prop + ':\\s*(\\d+)px')); assert.ok(m, sel + ' ' + prop); return +m[1]; };
    assert.ok(px('#ltTour .lt-spk svg', 'width') <= 20 && px('#ltTour .lt-spk svg', 'height') <= 20, 'glyph about the Pause icon size');
    assert.ok(px('#ltTour .lt-spk', 'width') <= 34 && px('#ltTour .lt-spk', 'height') <= 34, 'a small circle');
    assert.ok(px('#ltTour .lt-speak', 'width') >= 44 && px('#ltTour .lt-speak', 'height') >= 44, 'tap area at least 44 px');
    const side = rules().find(x => x.sel === '#ltTour .lt-side');
    assert.match(side.body, /flex-direction: column/); assert.match(side.body, /align-items: flex-end/); assert.match(side.body, /flex: none/);
});

test('on and muted look different: waves when on, an x when off; white glyph on glass like Pause', () => {
    const r = sel => rules().find(x => x.sel === sel);
    assert.match(r('#ltTour .lt-spk').body, /color: #fff/);
    assert.match(r('#ltTour .lt-spk .lt-wave1, #ltTour .lt-spk .lt-wave2').body, /display: none/);
    assert.match(r('#ltTour .lt-spk-on .lt-spk .lt-wave1, #ltTour .lt-spk-on .lt-spk .lt-wave2').body, /display: inline/);
    assert.match(r('#ltTour .lt-spk-on .lt-spk .lt-slash').body, /display: none/);
    assert.match(r('#ltTour .lt-spk-on .lt-spk').body, /border-color/);
    assert.ok(!/ltv-breathe[^}]*scale/.test(css), 'the breathing hint glows, it does not grow over its neighbours');
});
