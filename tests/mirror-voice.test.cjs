/* Mirror mode (camera workout) speaks only in the new voice: the tutorial's recorded neural voices (22 Oct 2026, Emmanuel:
   "Update the voice in the mirror workout to match the new one"). No device (robot) voice, every line has a new-voice clip. */
'use strict';
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const V = require('../app-voice.js');

/* every line Mirror mode can say, per language, exactly as mirror-move.js builds it */
function mirrorLines() {
    const C = require('../mirror-move-core.js');
    const src = read('mirror-move.js'), txt = (o, l) => typeof o === 'string' ? o : (o[l] || o.en), out = { en: [], de: [], es: [] };
    for (const l of Object.keys(out)) {
        Object.values(C.MOVES).forEach(m => out[l].push(txt(m.n, l) + '. ' + txt(m.cue, l)));
        Object.entries(C.HINTS).forEach(([k, h]) => { if (!/^(sync|rest|hold|follow)$/.test(k)) out[l].push(txt(h, l)); });
        for (let k = 1; k <= 3; k++) out[l].push(String(k));
    }
    for (const m of src.matchAll(/say\(T\('((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'\)/g)) { out.en.push(m[1]); out.de.push(m[2]); out.es.push(m[3]); }
    return out;
}

test('mirror voice: no device voice code left in mirror-move.js; every line goes through LowiVoice with clipsOnly', () => {
    const src = read('mirror-move.js');
    assert.ok(!/speechSynthesis|SpeechSynthesisUtterance/.test(src), 'no old device voice in Mirror mode');
    const speaks = [...src.matchAll(/LowiVoice\.speak\(/g)].length;
    assert.strictEqual(speaks, 1, 'one speaking spot (say)');
    assert.match(src, /LowiVoice\.speak\(s, \{[^}]*clipsOnly: true[^}]*\}\)/);
    const html = read('index.html');
    assert.ok(html.indexOf('<script src="app-voice.js') < html.indexOf('<script src="mirror-move.js'), 'app-voice.js loads before mirror-move.js');
});

test('mirror voice: every Mirror line (moves, hints, count, start lines) has a clip in the new voice, en de es', () => {
    global.window = undefined;
    const data = require('../app-voice-data.js');
    const T = require('../tutorial-voice.js');
    assert.deepStrictEqual(data.voices, T.VOICES, 'clips recorded in the tutorial voices');
    const L = mirrorLines(), missing = []; let n = 0;
    for (const l of Object.keys(L)) for (const line of L[l]) for (const p of V.pieces(line)) {
        n++; const id = V.idOf(l, p);
        if (data.clips[l][id] == null || !fs.existsSync(path.join(ROOT, 'app-voice', l, id + '.mp3'))) missing.push(l + ': ' + p);
    }
    assert.ok(n > 60, 'lines found (' + n + ')');
    assert.deepStrictEqual(missing, []);
});

/* app-voice.js in a tiny fake browser: clips fail, and clipsOnly must retry once, then stay silent, never the device voice */
function fakeBrowser(playResult) {
    const dev = [], plays = [], fetches = [];
    function Audio() { this.paused = true; this.ended = false; this.setAttribute = () => { }; }
    Audio.prototype.play = function () {
        if (String(this.src).startsWith('data:')) return Promise.resolve();
        plays.push(this.src); const r = playResult(plays.length);
        if (r === 'ok') { setTimeout(() => this.onended && this.onended(), 1); return Promise.resolve(); }
        if (r === 'blocked') { const e = new Error('no'); e.name = 'NotAllowedError'; return Promise.reject(e); }
        setTimeout(() => this.onerror && this.onerror(), 1); return Promise.resolve();
    };
    Audio.prototype.pause = function () { this.paused = true; };
    const D = { currentScript: { src: 'https://x.test/lowispike/app-voice.js' }, addEventListener() { }, querySelector: () => null, documentElement: { lang: 'en' }, head: { appendChild() { } }, hidden: false };
    const W = {
        document: D, Audio, addEventListener() { }, dispatchEvent() { }, CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; },
        localStorage: { getItem: () => 'en' }, setTimeout, clearTimeout, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() { } }, Promise,
        fetch: async u => { fetches.push(u); return { ok: true, headers: { get: () => 'audio/mpeg' }, blob: async () => ({}), clone() { return this; } }; },
        speechSynthesis: { speaking: false, pending: false, paused: false, getVoices: () => [], cancel() { }, resume() { }, addEventListener() { }, speak(u) { dev.push(u.text); setTimeout(() => u.onend && u.onend(), 1); } },
        SpeechSynthesisUtterance: function (t) { this.text = t; },
    };
    global.window = undefined;
    W.LowiAppVoiceData = require('../app-voice-data.js');
    const ctx = vm.createContext(Object.assign(W, { window: W, URL: Object.assign(function (a, b) { return new URL(a, b); }, W.URL) }));
    W.URL = ctx.URL;
    vm.runInContext(read('app-voice.js').replace(/\(typeof window !== 'undefined' \? window : null\)\s*;?\s*$/, '(window);'), ctx);
    return { W, dev, plays, fetches };
}
const sayIt = (W, text, o) => new Promise(res => { const h = W.LowiVoice.speak(text, Object.assign({ lang: 'en' }, o, { onend: () => res(h) })); setTimeout(() => res(h), 3000); });

test('mirror voice: clipsOnly retries a failed clip once and never falls back to the device voice', async () => {
    const line = mirrorLines().en[0];
    const n = V.pieces(line).length;
    let f = fakeBrowser(i => i === 1 ? 'err' : 'ok');           /* first clip fails once, then plays */
    let h = await sayIt(f.W, line, { clipsOnly: true });
    assert.deepStrictEqual(f.dev, [], 'no device voice');
    assert.strictEqual(h.clips, n); assert.strictEqual(f.plays.length, n + 1);
    f = fakeBrowser(() => 'blocked');                           /* sound blocked every time: silent, still no robot voice */
    h = await sayIt(f.W, line, { clipsOnly: true });
    assert.deepStrictEqual(f.dev, []); assert.strictEqual(h.skipped, n); assert.ok(h.ended);
    f = fakeBrowser(() => 'blocked');                           /* the rest of the app keeps its old behaviour */
    h = await sayIt(f.W, line, {});
    assert.strictEqual(f.dev.length, n);
});
