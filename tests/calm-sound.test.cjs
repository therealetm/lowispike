/* Oct 16, 2026 (handoff task 9): calm Web Audio: singing-bowl chime for the timers, the glass string pad on Sound. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const CS = require('../calm-sound-core.js');
const js = read('sound-strings.js'), css = read('sound-strings.css'), wa = read('world-audio.js'), html = read('index.html'), loader = read('apple-ui.js'), sw = read('sw.js');

test('bowl strike: inharmonic partials, soft attack, long ring, nothing shrill', () => {
    const b = CS.bowl(440);
    assert.ok(b.length >= 2);
    assert.strictEqual(b[0].hz, 440);
    for (const p of b) { assert.ok(p.hz <= CS.MAX_HZ, 'cap ' + p.hz); assert.ok(p.beat > 0 && p.beat < 3, 'slow beating'); assert.ok(p.decay > 1); }
    assert.ok(Math.abs(b[1].hz / b[0].hz - 2.71) < 0.01, 'not a plain octave: a bowl');
    for (let i = 1; i < b.length; i++) assert.ok(b[i].decay < b[i - 1].decay, 'higher partials ring shorter');
    assert.ok(CS.BOWL.attack >= 0.05, 'felt mallet, no click');
    assert.ok(CS.bowl(1000).every(p => p.hz <= CS.MAX_HZ), 'high partials dropped');
});

test('timer chime replaces the microwave beep: warm range, pitch order kept, soft attack', () => {
    for (const f of [1568, 990, 740, 660, 520, 110]) { const c = CS.chime(f, 0.2); assert.ok(c.hz >= CS.CHIME.lo && c.hz <= CS.CHIME.hi, f + ' -> ' + c.hz); }
    const a = CS.chime(740).hz, b = CS.chime(990).hz;
    assert.ok(a < b, 'countdown pip still below the step tone');
    const c = CS.chime(1568, 0.5); assert.ok(c.attack >= 0.02, 'no 15 ms click'); assert.ok(c.peak <= 0.15, 'quieter than the old 0.22 beep'); assert.ok(c.ring >= 0.9 && c.ring <= 2.2);
    assert.ok(c.partials.length === 2 && c.lp <= 2400);
    /* both timer beeps in index.html go through the chime and respect the app sound switch */
    const m = html.match(/function beep\(f, d\)\{[^\n]*/)[0];
    assert.ok(m.includes('LowiCalmChime(ac, f, d)') && m.includes('LowiSFX.on()'));
    const g = html.match(/function beep\(\)\{[^\n]*/)[0];
    assert.ok(g.includes('LowiCalmChime(ac, 660, .35)') && g.includes('LowiSFX && !LowiSFX.on()'), 'guided player also respects mute');
    assert.ok(js.includes('W.LowiCalmChime = chime'));
});

test('string pad maths: lanes, strums, loudness, bend, voices', () => {
    const n = CS.STRINGS.notes.length, w = 350;
    assert.strictEqual(n, 7);
    for (let i = 1; i < n; i++) assert.ok(CS.STRINGS.notes[i] > CS.STRINGS.notes[i - 1], 'low to high');
    assert.ok(CS.STRINGS.notes[0] >= 250 && CS.STRINGS.notes[n - 1] <= 1000, 'warm range');
    assert.strictEqual(CS.stringAt(0, w), 0); assert.strictEqual(CS.stringAt(w - 1, w), n - 1); assert.strictEqual(CS.stringAt(-20, w), 0); assert.strictEqual(CS.stringAt(w + 20, w), n - 1);
    assert.strictEqual(CS.stringAt(CS.stringX(3, w), w), 3);
    assert.deepStrictEqual(CS.crossed(0, w, w), [0, 1, 2, 3, 4, 5, 6], 'a full swipe plays every string once');
    assert.deepStrictEqual(CS.crossed(w, 0, w), [6, 5, 4, 3, 2, 1, 0], 'backwards in reverse order');
    assert.deepStrictEqual(CS.crossed(10, 12, w), [], 'a wobble on one lane plays nothing new');
    assert.ok(CS.level(0, 200) === 1 && CS.level(200, 200) === 0.25 && CS.level(100, 200) > 0.5, 'higher is fuller, never silent');
    assert.strictEqual(CS.bend(0, w), 0); assert.strictEqual(CS.bend(w, w), CS.STRINGS.bend); assert.strictEqual(CS.bend(-w, w), -CS.STRINGS.bend);
    assert.ok(CS.STRINGS.bend <= 100, 'at most a semitone');
    assert.ok(Math.abs(CS.noteHz(3, 100) / CS.noteHz(3, 0) - Math.pow(2, 1 / 12)) < 1e-3);
    assert.strictEqual(CS.steal([{ t: 1 }, { t: 2 }], 3), null);
    assert.deepStrictEqual(CS.steal([{ t: 3 }, { t: 1 }, { t: 2 }], 3), { t: 1 }, 'oldest voice goes');
    assert.strictEqual(CS.wobble(0.1, 10, true), 0, 'reduced motion: no vibration');
    assert.ok(Math.abs(CS.wobble(0.05, 10, false)) > 0 && Math.abs(CS.wobble(3, 10, false)) < 0.01, 'vibration rings out');
    for (const hz of CS.allHz()) assert.ok(hz > 0 && hz <= CS.MAX_HZ, 'hz ' + hz);
    assert.ok(CS.STRINGS.attack >= 0.02 && CS.STRINGS.gain <= 0.35 && CS.STRINGS.maxVoices <= 8);
});

test('copy: three languages, no health claims', () => {
    for (const k of Object.keys(CS.STR)) assert.strictEqual(CS.STR[k].length, 3, k);
    const all = JSON.stringify(CS.STR).toLowerCase();
    for (const w of ['tinnitus', 'anxiety', 'angst', 'heal', 'heil', 'cure', 'therap', 'sleep', 'schlaf', 'treat', 'medic', 'stress']) assert.ok(!all.includes(w), w);
    assert.strictEqual(CS.t('title', 'en'), 'Play the strings'); assert.strictEqual(CS.t('title', 'xx'), 'Spiel die Saiten');
});

test('Sound opens the string pad first; it follows volume and the app sound switch, plays only from a touch', () => {
    const ph = wa.slice(wa.indexOf('function panelHtml'), wa.indexOf('function sfxMuted'));
    assert.ok(ph.indexOf('data-wa-strings') > 0 && ph.indexOf('data-wa-strings') < ph.indexOf('data-wa="on"'), 'strings above the background switch');
    assert.ok(wa.includes('W.LowiSoundStrings.mount(sp, { instrument, idle: instrumentIdle, lang })'));
    assert.ok(wa.includes('W.LowiSoundStrings.unmount('), 'closing the panel stops the strings');
    assert.ok(/function instrument\(\) \{\s*if \(sfxMuted\(\)\) return \{ muted: true/.test(wa), 'app sounds off: the pad stays silent');
    assert.ok(wa.includes('C.masterGain(prefs.vol) * 3'), 'follows the volume slider');
    assert.ok(wa.includes('function instrumentIdle') && wa.includes('st.ctx.suspend()'), 'context sleeps again after the pad closes');
    /* the pad asks for audio only inside pointerdown/keydown (user activation) */
    assert.ok(/function down\(P, e\) \{[\s\S]*?P\.api\.instrument\(\)/.test(js));
    assert.ok(/function key\(P, e\) \{[\s\S]*?P\.api\.instrument\(\)/.test(js));
    assert.ok(!/instrument\(\)/.test(js.slice(js.indexOf('function mount'), js.indexOf('function unmount'))), 'mounting alone makes no sound');
    assert.ok(js.includes("if (!ins || ins.muted || !ins.ctx || !ins.gain) return null"), 'muted or volume 0: no voice');
    assert.ok(js.includes("P.onVis = () => { if (D.hidden) releaseAll(P); }"), 'app hidden: voices released');
    assert.ok(!/type = 'square'|type = 'sawtooth'/.test(js), 'no harsh waveforms');
});

test('the pad draws only while something moves, glows where touched, respects reduced motion, touch targets', () => {
    assert.ok(js.includes('function kick(P)') && /if \(draw\(P\) && !D\.hidden\) P\.raf = requestAnimationFrame\(loop\)/.test(js), 'rAF stops when still');
    assert.ok(js.includes('CS.wobble(age, s.amp, red)') && js.includes('createRadialGradient'), 'vibrates and glows at the touch point');
    assert.ok(js.includes("Math.min(2, W.devicePixelRatio || 1)"), 'canvas capped at 2x');
    assert.ok(/touch-action: none/.test(css) && /\.ss-pad \{[^}]*height: clamp\(150px/.test(css));
    assert.ok(js.includes("tabindex=\"0\" role=\"group\"") && js.includes("/^[1-7]$/"), 'keyboard: keys 1-7 and arrows');
    assert.ok(!/#e8a33d|#f4cd7e|gold|purple/i.test(css), 'Misty blue, no gold or purple');
    const wcss = read('world-audio.css');
    assert.ok(!/#e8a33d|#f4cd7e|#8a5a0c/i.test(wcss), 'the Sound panel lost its gold');
    assert.ok(/\.wa-x \{[^}]*min-width: 44px; min-height: 44px/.test(wcss), 'close button is a 44 pt target');
});

test('wired: loader order and both service worker lists', () => {
    const files = loader.match(/const files=\[([^\]]+)\]/)[1];
    const at = f => files.indexOf("'" + f + "'");
    assert.ok(at('calm-sound-core.js') >= 0 && at('calm-sound-core.js') < at('sound-strings.js') && at('sound-strings.js') < at('world-audio.js'));
    const lines = sw.split('\n').filter(l => l.includes('"world-audio.js"'));
    assert.strictEqual(lines.length, 2);
    for (const l of lines) for (const f of ['calm-sound-core.js', 'sound-strings.js', 'sound-strings.css']) assert.ok(l.includes('"' + f + '"'), f);
    assert.ok(js.includes("replace('sound-strings.js', 'sound-strings.css')"), 'self-loaded CSS keeps the ?v= cache key');
});
