// String pad really controls the background sound (Oct 16, 2026). Eman: "I'm playing with the strings ... it seems like I'm not
// actually controlling what the background sound is going to be ... and then it automatically just resets it."
// The strings set a tune (key, brightness/level, pitch shift) that the running soundscape glides to, that is stored, and that
// nothing resets except the Reset sound button.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const J = x => JSON.parse(JSON.stringify(x));
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../world-audio-core.js');
const CS = require('../calm-sound-core.js');
const wa = read('world-audio.js'), ss = read('sound-strings.js'), css = read('sound-strings.css');

/* ---------- a tiny fake browser with a fake Web Audio graph, enough to run world-audio.js ---------- */
function param(v) { return { value: v, setValueAtTime(x) { this.value = x; }, setTargetAtTime(x, t, tc) { this.value = x; this.tc = tc; }, linearRampToValueAtTime(x) { this.value = x; }, exponentialRampToValueAtTime(x) { this.value = x; }, cancelScheduledValues() { } }; }
function node() { return { connect() { }, disconnect() { }, start() { }, stop() { }, frequency: param(440), detune: param(0), gain: param(1), Q: param(1), pan: param(0), threshold: param(0), knee: param(0), ratio: param(1), attack: param(0), release: param(0) }; }
function boot(store) {
    const intervals = [], events = [];
    const ctxs = [];
    class AC {
        constructor() { this.currentTime = 0; this.state = 'running'; this.sampleRate = 44100; this.destination = node(); ctxs.push(this); }
        resume() { this.state = 'running'; return Promise.resolve(); } suspend() { this.state = 'suspended'; return Promise.resolve(); } close() { this.state = 'closed'; }
        createBuffer(c, len) { return { sampleRate: 44100, getChannelData: () => new Float32Array(len) }; }
    }
    ['createGain', 'createOscillator', 'createBiquadFilter', 'createDynamicsCompressor', 'createStereoPanner', 'createBufferSource'].forEach(k => { AC.prototype[k] = function () { return node(); }; });
    const cls = new Set(['wh-world-live', 'wh-home']);
    const doc = {
        documentElement: { classList: { contains: c => cls.has(c) }, lang: 'en' }, hidden: false, head: { appendChild() { } }, currentScript: null,
        getElementById: id => id === 'whHud' ? { id: 'whHud', querySelector: () => null, appendChild() { } } : null,
        querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ classList: { add() { } }, setAttribute() { }, addEventListener() { }, appendChild() { } }), addEventListener() { }
    };
    const win = {
        document: doc, console, Promise, Math, JSON, Object, Array, Number, String, Date, Float32Array,
        localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
        setTimeout: (f, ms) => setTimeout(f, Math.min(ms || 0, 5)), clearTimeout, setInterval: (f) => { intervals.push(f); return intervals.length; }, clearInterval() { },
        MutationObserver: class { observe() { } }, CustomEvent: class { constructor(type, o) { this.type = type; this.detail = o && o.detail; } },
        addEventListener() { }, dispatchEvent(e) { events.push(e); return true; }, AudioContext: AC,
        LowiWorldAudioCore: C, LowiCalmSoundCore: CS
    };
    win.window = win;
    vm.runInNewContext(wa, win, { filename: 'world-audio.js' });
    return { A: win.LowiWorldAudio, intervals, events, ctxs, store };
}

test('string input sets the tune: the string is the key, the height is brightness and level, sliding shifts the pitch', () => {
    const t0 = C.loadTune(null);
    assert.deepStrictEqual(t0, C.TUNE_DEFAULTS);
    const low = C.tuneFrom(t0, { root: 0, bright: 0.1 }), high = C.tuneFrom(t0, { root: 6, bright: 0.9 });
    assert.ok(C.padChord(low)[0] < C.padChord(high)[0], 'left strings are lower keys');
    assert.ok(C.padLp(low) < C.padLp(high) && C.padLevel(low) < C.padLevel(high), 'higher on the pad is brighter and fuller');
    const bent = C.tuneFrom(high, { bend: 60 });
    assert.ok(C.padChord(bent)[0] > C.padChord(high)[0] && C.bowlNotes(bent)[0] > C.bowlNotes(high)[0], 'the shift moves pads and bowls together');
    assert.deepStrictEqual(C.tuneFrom(t0, { root: 99, bright: 7, bend: -999 }), { root: 6, bright: 1, bend: -100 }, 'clamped');
    assert.strictEqual(C.TUNE.roots.length, CS.STRINGS.notes.length);
    C.TUNE.roots.forEach((f, i) => assert.ok(Math.abs(f - CS.STRINGS.notes[i] / 2) < 0.01, 'root ' + i + ' is its string an octave down'));
    for (const t of C.tuneExtremes()) for (const hz of C.padChord(t).concat(C.bowlNotes(t), C.uneasyNotes(t), [C.padLp(t)])) assert.ok(hz >= 80 && hz <= C.MAX_HZ, 'calm range ' + hz);
    const lb = C.tuneLabel({ root: 2, bright: 0.62, bend: -30 });
    assert.strictEqual(lb.note + lb.octave, 'F\u266f3'); assert.strictEqual(lb.level, 62); assert.strictEqual(lb.bend, -30);
});

test('the tune is stored and survives a reload; Reset sound goes back to the old default sound', async () => {
    const store = {};
    const a = boot(store);
    a.A.setOn(true);
    const set = a.A.setTune({ root: 1, bright: 0.8, bend: 40 }, true);
    assert.deepStrictEqual(J(set), { root: 1, bright: 0.8, bend: 40 });
    assert.deepStrictEqual(JSON.parse(store[C.TUNE_KEY]), { root: 1, bright: 0.8, bend: 40 }, 'persisted in localStorage');
    const p = a.A.playing;
    assert.deepStrictEqual(J(p.chord), C.padChord(set), 'the running pads play his chord');
    assert.strictEqual(p.lp, C.padLp(set)); assert.strictEqual(p.level, C.padLevel(set));
    assert.ok(a.events.some(e => e.type === 'lowi:sound-tune'), 'the pad is told, so its readout matches');
    /* reload: a fresh page reads it back and builds the sound from it */
    const b = boot(store);
    assert.deepStrictEqual(J(b.A.tune()), { root: 1, bright: 0.8, bend: 40 });
    b.A.setOn(true);
    assert.deepStrictEqual(J(b.A.playing.chord), C.padChord(set), 'after a reload the sound starts in his key');
    /* while the finger moves it is saved shortly after (debounced), not lost */
    b.A.setTune({ bright: 0.3 }, false);
    await new Promise(r => setTimeout(r, 40));
    assert.strictEqual(JSON.parse(store[C.TUNE_KEY]).bright, 0.3);
    const r = b.A.resetTune();
    assert.deepStrictEqual(J(r), C.TUNE_DEFAULTS);
    assert.deepStrictEqual(JSON.parse(store[C.TUNE_KEY]), C.TUNE_DEFAULTS);
    assert.deepStrictEqual(J(b.A.playing.chord), [293.66, 440.49, 659.27]);
});

test('no automatic reset: minutes of the generative loop, a mood change and an off/on keep his setting', () => {
    const store = {};
    const a = boot(store);
    a.A.setOn(true);
    const set = a.A.setTune({ root: 3, bright: 0.2, bend: -25 }, true);
    const ctx = a.ctxs[0], loops = a.intervals.slice();
    assert.ok(loops.length >= 1);
    for (let s = 0; s <= 600; s += 0.25) { ctx.currentTime = s; loops.forEach(f => { try { f(); } catch (e) { } }); }
    assert.deepStrictEqual(J(a.A.playing.chord), C.padChord(set), 'ten minutes later the pads still play his chord');
    assert.strictEqual(a.A.playing.lp, C.padLp(set)); assert.strictEqual(a.A.playing.level, C.padLevel(set));
    assert.deepStrictEqual(J(a.A.tune()), J(set));
    a.A.setOn(false); a.A.setOn(true);
    assert.deepStrictEqual(J(a.A.tune()), J(set), 'turning the background off and on keeps it');
    assert.deepStrictEqual(JSON.parse(store[C.TUNE_KEY]), J(set));
});

test('source: nothing in the engine retunes on its own, and the pad wires every touch to the tune', () => {
    assert.ok(!/chordAt|pad\.hold|a\.chord/.test(wa), 'the 22-second chord walk is gone');
    const sched = wa.slice(wa.indexOf('function schedule()'), wa.indexOf('function stopAmbient('));
    assert.ok(!/frequency|setTune|resetTune|tune =/.test(sched), 'the generative loop never touches the tune or the pad pitch');
    const mood = wa.slice(wa.indexOf('function setMood('), wa.indexOf('function bowlsDue('));
    assert.ok(!/tune =|setTune\(|resetTune\(/.test(mood.split('function applyTune')[0]), 'the stormy mood layers on top, never overwrites');
    assert.strictEqual((wa.match(/tune = C\.tuneFrom\(/g) || []).length, 2, 'only setTune and resetTune write the tune');
    assert.ok(wa.includes('const pad = padVoices(ctx, Object.assign({}, M.pad, { lp: C.padLp(tune) }), C.padChord(tune), padLvl'), 'the sound is built from the stored tune');
    assert.ok(wa.includes("localStorage.getItem(C.TUNE_KEY)") && wa.includes('localStorage.setItem(C.TUNE_KEY'));
    /* the pad: down, strum and slide set it, letting go stores it, the reset button resets it */
    assert.ok(ss.includes('setTune(P, { root: i, bright: brightAt(p.y, P.h) }, false)'), 'touch sets key and level');
    assert.ok(ss.includes('setTune(P, { root: q.i, bright: brightAt(p.y, P.h) }, false)'), 'a strum lands on its last string');
    assert.ok(ss.includes('setTune(P, { bright: brightAt(p.y, P.h), bend }, false)'), 'sliding shifts the pitch');
    assert.ok(/function up\(P, e\)[^\n]*setTune\(P, \{\}, true\)/.test(ss), 'letting go stores it, nothing glides back');
    assert.ok(ss.includes("class=\"ss-reset\"") && ss.includes('P.api.resetTune'), 'Reset sound button');
    assert.ok(ss.includes('class="ss-now" aria-live="polite"') && ss.includes('function readout(P)'), 'shows note, level and pitch');
    assert.ok(ss.includes("W.addEventListener('lowi:sound-tune', P.onTune)") && ss.includes("W.removeEventListener('lowi:sound-tune', P.onTune)"));
    assert.ok(/\.ss-reset \{[^}]*min-height: 44px/.test(css) && /\.ss-reset \{[^}]*backdrop-filter/.test(css), 'glass, a real touch target');
    assert.ok(css.includes('prefers-reduced-motion'));
    for (const k of ['key', 'level', 'shift', 'reset', 'resetAria', 'bgOff']) for (const l of ['en', 'de', 'es']) assert.ok(CS.t(k, l).length > 1, k + ' ' + l);
});

test('low latency: a string touch moves the running oscillators and filter within ~0.1 s, and iOS is unlocked inside the touch', () => {
    const store = {};
    const a = boot(store);
    a.A.setOn(true);
    const before = J(a.A.playing);
    const t = a.A.setTune({ root: 0, bright: 0.95 }, false);
    const after = J(a.A.playing);
    assert.notDeepStrictEqual(after.chord, before.chord, 'the key changed in the live oscillators');
    assert.ok(after.lp > before.lp && after.level > before.level, 'higher touch: brighter filter and louder pad, right now');
    assert.deepStrictEqual(after.chord, C.padChord(t));
    assert.ok(C.TUNE.glide <= 0.1 && C.TUNE.filterGlide <= 0.1, 'glide time constants keep the change near-instant');
    const bent = a.A.setTune({ bend: 80 }, false);
    assert.ok(a.A.playing.chord[0] > after.chord[0], 'sliding bends the running pad up');
    assert.deepStrictEqual(J(a.A.playing.chord), C.padChord(bent));
    /* source: smallest output buffer, silent-sample unlock in the gesture, letting go also resumes (older iOS only trusts touchend) */
    assert.ok(wa.includes("latencyHint: 'interactive'") && !wa.includes("latencyHint: 'playback'"));
    assert.ok(/function unlock\(ctx\)[\s\S]*createBufferSource[\s\S]*s\.start\(0\)/.test(wa) && /function instrument\(\)[\s\S]{0,400}unlock\(ctx\)/.test(wa));
    assert.ok(/function up\(P, e\)[^\n]*P\.api\.instrument\(\)/.test(ss));
    assert.ok(/function down\(P, e\)[\s\S]{0,300}P\.api\.instrument \? P\.api\.instrument\(\)/.test(ss), 'the first touch opens the audio context');
});
