'use strict';
/* The tutorial voice speed pill (Oct 24 2026). Emmanuel: "you know how on WhatsApp when you listen to a voice note you can kind of like
   click on 2X and then it goes faster. I want that for the tutorial voiceover". One pill right after Pause, each tap 1x -> 1.5x -> 2x -> 1x,
   the talking voice changes at once (no restart), natural pitch, remembered for the rest of the tour and next time.
   Browser check of the real thing (layout on iPhone / iPad, the clip really faster, remembered after a reload):
   node tools/tutorial-voice/speed-check.cjs [--url LIVE_URL] */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const V = require('../tutorial-voice.js'), S = require('../tutorial-steps.js');

test('WhatsApp steps: 1x, 1.5x, 2x, then back to 1x; anything unknown starts at 1x', () => {
    assert.deepStrictEqual(V.RATES, [1, 1.5, 2]);
    assert.strictEqual(V.nextRate(1), 1.5); assert.strictEqual(V.nextRate(1.5), 2); assert.strictEqual(V.nextRate(2), 1);
    assert.strictEqual(V.nextRate(3), 1); assert.strictEqual(V.nextRate(undefined), 1);
    assert.strictEqual(V.RATE_KEY, 'lowi.tutorial.voice.rate.v1');
});

test('the label: 1x / 1.5x / 2x in English, a decimal comma in German and Spanish (as WhatsApp writes it there)', () => {
    assert.deepStrictEqual(V.RATES.map(r => V.rateLabel(r, 'en')), ['1\u00d7', '1.5\u00d7', '2\u00d7']);
    assert.deepStrictEqual(V.RATES.map(r => V.rateLabel(r, 'de')), ['1\u00d7', '1,5\u00d7', '2\u00d7']);
    assert.strictEqual(V.rateLabel(1.5, 'es'), '1,5\u00d7');
    assert.strictEqual(V.rateLabel(7, 'en'), '1\u00d7', 'unknown = 1x');
});

test('the pill: after Pause in the bottom row, only while the speaker is on, 44 px tall, fixed width, Daily Quest glass, scoped', () => {
    const js = strip(read('tutorial-voice.js')), css = strip(read('tutorial-voice.css'));
    const fn = js.slice(js.indexOf('function rateBtn(el)'), js.indexOf('function speaker(el)'));
    assert.ok(fn.length > 50, 'rateBtn() exists');
    assert.match(fn, /querySelector\('\.lt-btns \.lt-left'\)/, 'in the bottom row, left group');
    assert.match(fn, /className = 'lt-rate'/);
    assert.match(fn, /type = 'button'/);
    assert.match(fn, /querySelector\('\.lt-pause'\)[\s\S]*insertBefore\(b, p\.nextSibling\)/, 'right after Pause');
    assert.match(fn, /addEventListener\('click', onRate\)/);
    assert.match(js, /function render\([^)]*\) \{[\s\S]*?speaker\(el\); rateBtn\(el\);/, 'render() adds it on every card');
    const rule = sel => { const m = css.match(new RegExp(sel.replace(/[.#()]/g, '\\$&') + '\\s*\\{([^}]*)\\}')); assert.ok(m, sel); return m[1]; };
    const base = rule('#ltTour .lt-rate');
    assert.match(base, /display: none/, 'hidden while the speaker is off');
    assert.match(rule('#ltTour.lt-voice .lt-rate'), /display: grid/, 'shown with the speaker on, like Pause');
    assert.match(base, /(^|\s)width: 54px/, 'fixed width: nothing moves when the number changes');
    assert.match(base, /(^|\s)height: 44px/); assert.match(base, /min-height: 44px/);
    assert.match(base, /border: 1\.5px solid rgba\(160, 220, 255, \.55\)/, 'the Daily Quest rim');
    assert.match(base, /backdrop-filter: blur\(10px\) saturate\(1\.4\)/, 'the Daily Quest blur');
    assert.match(base, /color: #fff/); assert.match(base, /font-weight: 800/); assert.match(base, /tabular-nums/);
    for (const m of css.matchAll(/([^{}]+)\{[^{}]*\}/g)) if (/lt-rate/.test(m[1])) for (const s of m[1].split(',')) assert.match(s.trim(), /^(@media[^{]*)?#ltTour/, 'scoped: ' + s.trim());
});

test('a speed change goes to the playing element, never reloads the clip, and keeps the pitch natural', () => {
    const js = strip(read('tutorial-voice.js'));
    const ap = js.slice(js.indexOf('function applyRate(a)'), js.indexOf('const A = ()'));
    assert.match(ap, /preservesPitch = true/); assert.match(ap, /webkitPreservesPitch = true/);
    assert.match(ap, /defaultPlaybackRate = rate/); assert.match(ap, /playbackRate = rate/);
    const sr = js.slice(js.indexOf('function setRate(r)'), js.indexOf('function onRate('));
    assert.match(sr, /if \(audio\) applyRate\(audio\)/);
    assert.ok(!/\.src\s*=|\.load\(|\.play\(|currentTime\s*=/.test(sr), 'no restart: no new src, load, play or seek');
    assert.match(js, /a\.src = blobUrl; applyRate\(a\);/, 'each new card plays at the chosen speed');
    assert.doesNotMatch(js, /speechSynthesis|SpeechSynthesisUtterance/, 'no device voice to speed up: the tutorial only plays recorded clips (Oct 24 2026)');
});

/* the real tutorial-voice.js in a tiny fake page (as tests/tutorial-handsfree.test.cjs), with a fake speechSynthesis */
function page(opts) {
    const o = opts || {}, L = Object.assign({}, o.store || {}), audios = [], spoken = [];
    class Audio {
        constructor() { this.l = {}; this.paused = true; this.currentTime = 0; this.playbackRate = 1; this.defaultPlaybackRate = 1; audios.push(this); this.plays = 0; this.srcs = 0; }
        set src(v) { this._src = v; this.srcs++; this.playbackRate = this.defaultPlaybackRate; }   /* a new src resets the rate, as in browsers */
        get src() { return this._src; }
        setAttribute() { } addEventListener(k, f) { (this.l[k] = this.l[k] || []).push(f); }
        play() { this.plays++; this.paused = false; return Promise.resolve(); }
        pause() { this.paused = true; }
        end() { this.paused = true; (this.l.ended || []).forEach(f => f()); }
    }
    const elStub = () => ({ classList: { toggle() { }, add() { }, remove() { } }, setAttribute() { }, querySelector: () => null, appendChild() { }, textContent: '' });
    const D = { documentElement: { classList: { contains: () => true } }, head: { appendChild() { } }, addEventListener() { }, getElementById: () => ({}), createElement: elStub, createTextNode: () => ({}), querySelector: () => null, hidden: false };
    const W = {
        document: D, Audio, localStorage: { getItem: k => (k in L ? L[k] : null), setItem: (k, v) => { L[k] = String(v); } },
        fetch: async () => (o.noClip ? { ok: false } : { ok: true, clone() { return this; }, blob: async () => ({}) }), URL: { createObjectURL: () => 'blob:x', revokeObjectURL() { } },
        requestAnimationFrame: () => 1, cancelAnimationFrame() { }, setTimeout, clearTimeout, Promise,
        CustomEvent: function (t, i) { this.type = t; this.detail = i && i.detail; }, dispatchEvent() { }, addEventListener() { }
    };
    W.SpeechSynthesisUtterance = function (t) { this.text = t; };
    W.speechSynthesis = { cancels: 0, cancel() { this.cancels++; }, speak(u) { spoken.push(u); }, getVoices: () => [], pause() { }, resume() { } };
    W.window = W; W.LowiTutorialVoiceData = { clips: {} };
    L['lowi.tutorial.voice.v1'] = '1';
    vm.runInContext(read('tutorial-voice.js').replace(/const SILENT = '[^']*'/, "const SILENT = 'silent'"), vm.createContext(W));
    const clip = st => { const sp = V.spoken(st, 'en', 'Misty'); W.LowiTutorialVoiceData.clips.en = Object.assign(W.LowiTutorialVoiceData.clips.en || {}, { [sp.key]: { f: sp.key + '.mp3', h: 'x', s: sp.s, w: [[0, 0]] } }); };
    return { W, L, api: W.LowiTutorialVoice, audios, spoken, clip, card: elStub() };
}
const tick = () => new Promise(r => setTimeout(r, 5));

test('tapping while a clip talks: same element, same place, faster, natural pitch, and saved', async () => {
    const p = page(), st = S.STEPS[2]; p.clip(st);
    p.api.render(p.card, st, { lang: 'en' }); await tick(); await tick();
    const a = p.audios[0]; assert.ok(a && !a.paused && a.src === 'blob:x', 'the clip plays');
    assert.strictEqual(a.preservesPitch, true, 'natural pitch');
    a.currentTime = 1.7; const plays = a.plays, srcs = a.srcs;
    p.api.setRate(1.5);
    assert.strictEqual(a.playbackRate, 1.5); assert.strictEqual(a.defaultPlaybackRate, 1.5);
    assert.strictEqual(a.currentTime, 1.7, 'no restart'); assert.strictEqual(a.plays, plays); assert.strictEqual(a.srcs, srcs); assert.ok(!a.paused);
    assert.strictEqual(p.L['lowi.tutorial.voice.rate.v1'], '1.5', 'remembered');
    p.api.setRate(9); assert.strictEqual(p.api.rate(), 1.5, 'only the three speeds');
    /* the next card keeps the speed even though a new src resets playbackRate */
    const st2 = S.STEPS[3]; p.clip(st2); a.end(); await tick();
    p.api.render(p.card, st2, { lang: 'en' }); await tick(); await tick();
    assert.strictEqual(a.playbackRate, 1.5, 'next card at 1.5x');
});

test('the saved speed is used from the first card of the next session', async () => {
    const p = page({ store: { 'lowi.tutorial.voice.rate.v1': '2' } }), st = S.STEPS[2]; p.clip(st);
    assert.strictEqual(p.api.rate(), 2);
    p.api.render(p.card, st, { lang: 'en' }); await tick(); await tick();
    assert.strictEqual(p.audios[0].playbackRate, 2);
    assert.strictEqual(page({ store: { 'lowi.tutorial.voice.rate.v1': 'fast' } }).api.rate(), 1, 'junk = 1x');
});

test('no recorded clip: silence, never the device voice, and a speed change stays silent (Oct 24 2026)', async () => {
    const p = page({ noClip: true }), st = S.STEPS[2];
    p.api.render(p.card, st, { lang: 'en' }); await tick(); await tick(); await tick();
    assert.strictEqual(p.api.how(), 'none'); assert.strictEqual(p.spoken.length, 0, 'the device voice never speaks');
    assert.ok(!p.api.playing());
    p.api.setRate(2); await tick();
    assert.strictEqual(p.spoken.length, 0); assert.strictEqual(p.api.rate(), 2, 'the speed is still remembered for the clips');
});

test('the public interface keeps everything and adds the speed', () => {
    const p = page();
    for (const k of ['render', 'stop', 'toggle', 'isOn', 'playing', 'how', 'paused', 'word', 'bestVoice', 'data', 'spoken', 'plan', 'VOICES', 'BCP', 'NAME', 'KEY', 'CACHE', 'DIR', 'rate', 'setRate', 'playbackRate', 'RATES', 'nextRate', 'rateLabel', 'RATE_KEY'])
        assert.ok(k in p.api, 'LowiTutorialVoice.' + k);
});
