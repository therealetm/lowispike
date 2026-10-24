'use strict';
/* The tutorial voice is ONLY the recorded neural voice (Oct 24 2026, Emmanuel: "make sure the voice that takes us through the tutorial
   is not that old text-to-speech voice. ... Only utilize that voice from now on going, and make sure it's saved in the files.").
   Approved: en-US-AvaNeural, de-DE-SeraphinaMultilingualNeural, es-ES-XimenaNeural, recorded with tools/tutorial-voice/build.py
   (edge-tts, rate +0%, pitch +0Hz, volume +0%, 24 kHz mono 48 kbit/s mp3). Never the device voice (speechSynthesis / Web Speech).
   A new or changed tour card, or a new What's New text: run python3 tools/tutorial-voice/build.py and commit tutorial-voice-data.js +
   tutorial-voice/. See DECISIONS.md "Tutorial voice" and TUTORIAL.md "Voice". */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const V = require('../tutorial-voice.js'), S = require('../tutorial-steps.js'), DATA = require('../tutorial-voice-data.js');
const VER = JSON.parse(read('version.json'));
const APPROVED = { en: 'en-US-AvaNeural', de: 'de-DE-SeraphinaMultilingualNeural', es: 'es-ES-XimenaNeural' };
const FIX = 'record it in the approved voice: python3 tools/tutorial-voice/build.py, then commit tutorial-voice-data.js + tutorial-voice/';
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');

test('the tutorial voices are exactly the approved ones, in the app, the clips data and the generator', () => {
    assert.deepStrictEqual(V.VOICES, APPROVED, 'tutorial-voice.js VOICES changed: the tutorial voice is fixed (DECISIONS.md, Oct 24 2026)');
    assert.deepStrictEqual(DATA.voices, APPROVED, 'tutorial-voice-data.js was recorded with other voices: ' + FIX);
    const py = read('tools/tutorial-voice/build.py');
    for (const v of Object.values(APPROVED)) assert.ok(py.includes("'" + v + "'"), 'build.py APPROVED lists ' + v);
    assert.match(py, /import edge_tts/, 'recorded with edge-tts');
    assert.match(py, /SETTINGS = \{'rate': '\+0%', 'pitch': '\+0Hz', 'volume': '\+0%'\}/, 'the settings are saved in the generator');
    assert.match(py, /Communicate\(text, voice, boundary='WordBoundary', \*\*SETTINGS\)/);
    assert.match(py, /V\.cards\(S,ver\.news\)/, 'the generator records the What\'s New card too');
    assert.match(py, /p\['voices'\] != APPROVED/, 'the generator refuses other voices');
    assert.strictEqual(V.ONLY_CLIPS, true);
});

test('every tour card in every language, and the current What\'s New card, has a clip recorded in the approved voice', () => {
    const cards = V.cards(S, VER.news), plan = V.plan(cards);
    assert.ok(cards.length >= S.STEPS.length);
    if (VER.news && VER.news.text && VER.news.text.en) assert.ok(cards.some(c => c.id === 'news-card'), 'the What\'s New card is a card');
    for (const st of S.STEPS) for (const l of ['en', 'de', 'es']) assert.ok(plan.some(p => p.lang === l && p.key === st.id), `${l} ${st.id} is planned`);
    let n = 0;
    for (const p of plan) {
        const c = DATA.clips[p.lang] && DATA.clips[p.lang][p.key];
        assert.ok(c, `no recorded clip for ${p.lang} "${p.key}": ${FIX}`);
        assert.strictEqual(c.s, p.s, `the clip for ${p.lang} "${p.key}" says other words than the card: ${FIX}`);
        const h = crypto.createHash('sha1').update(APPROVED[p.lang] + '\n' + p.s, 'utf8').digest('hex').slice(0, 10);
        assert.strictEqual(c.h, h, `the clip for ${p.lang} "${p.key}" was not recorded with ${APPROVED[p.lang]}: ${FIX}`);
        const f = path.join(ROOT, V.DIR, p.lang, c.f);
        assert.ok(fs.existsSync(f), `missing ${V.DIR}${p.lang}/${c.f}: ${FIX}`);
        /* edge-tts's own format: MPEG-2 Layer III, 48 kbit/s, 24 kHz, mono, no ID3 (FF F3 64 C4). Another tool (browser speech, espeak,
           gTTS, a hand-made file) writes something else. */
        const b = fs.readFileSync(f);
        assert.ok(b.length > 2000 && b[0] === 0xFF && b[1] === 0xF3 && (b[2] & 0xFC) === 0x64 && (b[3] & 0xC0) === 0xC0,
            `${p.lang}/${c.f} is not an approved-voice clip (edge-tts 24 kHz mono 48 kbit/s mp3): ${FIX}`);
        n++;
    }
    assert.ok(n >= S.STEPS.length * 3);
});

test('no tutorial file uses the device voice (speechSynthesis) or another voice path', () => {
    const files = fs.readdirSync(ROOT).filter(f => /^tutorial[\w-]*\.js$/.test(f) && f !== 'tutorial-voice-data.js');
    assert.ok(files.includes('tutorial.js') && files.includes('tutorial-voice.js') && files.includes('tutorial-steps.js'));
    for (const f of files) {
        const js = strip(read(f));
        assert.doesNotMatch(js, /speechSynthesis|SpeechSynthesisUtterance|webkitSpeech/, f + ' must not use the device voice for the tutorial');
        assert.doesNotMatch(js, /LowiVoice\s*\.\s*(speak|say|read)/, f + ' must not read tutorial cards with app-voice.js (device fallback)');
    }
    const v = strip(read('tutorial-voice.js'));
    assert.doesNotMatch(v, /sayDevice/);
    assert.match(v, /function bestVoice\(\) \{ return null; \}/, 'bestVoice stays in the interface but never picks a device voice');
});

/* the real tutorial-voice.js in a tiny fake page with a fake speechSynthesis that records anything spoken */
function page(o) {
    o = o || {};
    const L = { 'lowi.tutorial.voice.v1': '1' }, spoken = [], audios = [];
    class Audio {
        constructor() { this.l = {}; this.paused = true; this.currentTime = 0; this.playbackRate = 1; this.defaultPlaybackRate = 1; audios.push(this); }
        set src(v) { this._src = v; } get src() { return this._src; }
        setAttribute() { } addEventListener(k, f) { (this.l[k] = this.l[k] || []).push(f); }
        play() { if (o.playFails && this._src === 'blob:x') return Promise.reject(Object.assign(new Error('x'), { name: 'NotSupportedError' })); this.paused = false; return Promise.resolve(); }
        pause() { this.paused = true; }
    }
    const el = () => ({ classList: { toggle() { }, add() { }, remove() { } }, setAttribute() { }, querySelector: () => null, appendChild() { }, textContent: '' });
    const D = { documentElement: { classList: { contains: () => true } }, head: { appendChild() { } }, addEventListener() { }, getElementById: () => ({}), createElement: el, createTextNode: () => ({}), querySelector: () => null, hidden: false };
    let fetches = 0;
    const W = {
        document: D, Audio, localStorage: { getItem: k => (k in L ? L[k] : null), setItem: (k, v) => { L[k] = String(v); } },
        fetch: async () => { fetches++; if (o.offline) throw new Error('offline'); return { ok: true, clone() { return this; }, blob: async () => ({}) }; },
        URL: { createObjectURL: () => 'blob:x', revokeObjectURL() { } }, requestAnimationFrame: () => 1, cancelAnimationFrame() { }, setTimeout, clearTimeout, Promise,
        CustomEvent: function (t, i) { this.type = t; this.detail = i && i.detail; }, dispatchEvent() { }, addEventListener() { }
    };
    W.SpeechSynthesisUtterance = function (t) { this.text = t; };
    W.speechSynthesis = { speaking: false, pending: false, cancel() { }, speak(u) { spoken.push(u); }, getVoices: () => [{ name: 'Samantha', lang: 'en-US' }], pause() { }, resume() { } };
    W.window = W; W.LowiTutorialVoiceData = { voices: APPROVED, clips: { en: {} } };
    vm.runInContext(read('tutorial-voice.js').replace(/const SILENT = '[^']*'/, "const SILENT = 'silent'"), vm.createContext(W));
    return { W, api: W.LowiTutorialVoice, spoken, audios, card: el(), fetches: () => fetches };
}
const tick = () => new Promise(r => setTimeout(r, 5));
const settle = async () => { for (let i = 0; i < 6; i++) await tick(); };

test('a card with no clip, a changed card, no connection or a clip that will not play: silence, never the device voice', async () => {
    const st = S.STEPS[2], sp = V.spoken(st, 'en', 'Misty');
    /* no clip at all */
    let p = page(); p.api.render(p.card, st, { lang: 'en' }); await settle();
    assert.strictEqual(p.spoken.length, 0, 'no clip: the device voice stays silent'); assert.strictEqual(p.api.how(), 'none'); assert.ok(!p.api.playing());
    /* the clip says other words than the card */
    p = page(); p.W.LowiTutorialVoiceData.clips.en[sp.key] = { f: 'x.mp3', h: 'x', s: sp.s + ' old words', w: [] };
    p.api.render(p.card, st, { lang: 'en' }); await settle();
    assert.strictEqual(p.spoken.length, 0, 'changed card: silent'); assert.strictEqual(p.api.how(), 'none');
    /* offline, never heard before: tried twice, then silent */
    p = page({ offline: true }); p.W.LowiTutorialVoiceData.clips.en[sp.key] = { f: 'x.mp3', h: 'x', s: sp.s, w: [] };
    p.api.render(p.card, st, { lang: 'en' }); await settle();
    assert.strictEqual(p.spoken.length, 0, 'offline: silent'); assert.strictEqual(p.api.how(), 'none'); assert.ok(p.fetches() >= 2, 'one more try');
    /* the clip will not play */
    p = page({ playFails: true }); p.W.LowiTutorialVoiceData.clips.en[sp.key] = { f: 'x.mp3', h: 'x', s: sp.s, w: [] };
    p.api.render(p.card, st, { lang: 'en' }); await settle();
    assert.strictEqual(p.spoken.length, 0, 'play error: silent');
    assert.strictEqual(p.api.bestVoice('en'), null);
    /* with the clip: the recorded voice plays */
    p = page(); p.W.LowiTutorialVoiceData.clips.en[sp.key] = { f: 'x.mp3', h: 'x', s: sp.s, w: [[0, 0, 1]] };
    p.api.render(p.card, st, { lang: 'en' }); await settle();
    assert.strictEqual(p.api.how(), 'file'); assert.ok(p.audios.some(a => !a.paused && a.src === 'blob:x'), 'the recorded clip plays'); assert.strictEqual(p.spoken.length, 0);
});

test('the What\'s New card (a release with no tour step) keeps its first sentence and is voiced', () => {
    const c = S.newsCard({ text: { en: 'My cycle: a gentle How are you today?, plus a calm world. Only you see it.', de: 'Neu.', es: 'Nuevo.' } });
    assert.ok(c.text.en.startsWith('My cycle: a gentle How are you today?, plus'), 'a ? inside a sentence does not drop the start: ' + c.text.en);
    const sp = V.spoken(S.newsCard(VER.news), 'en', 'Misty');
    assert.ok(!/\.\s*,/.test(sp.s), 'the card never starts with a stray comma: ' + sp.s);
});

test('the release records the What\'s New card in the tutorial voice and commits it; the rule is written down', () => {
    const rel = read('scripts/release.sh');
    assert.match(rel, /python3 tools\/tutorial-voice\/build\.py/);
    assert.match(rel, /git add tutorial-voice-data\.js tutorial-voice/);
    assert.ok(rel.indexOf('tools/tutorial-voice/build.py') < rel.indexOf('node --test tests/'), 'recorded before the tests run');
    for (const f of ['DECISIONS.md', 'MAYA-HANDOFF.md', 'TUTORIAL.md']) {
        const t = read(f);
        assert.match(t, /Tutorial voice: only/, f + ' states the rule');
        assert.ok(t.includes('en-US-AvaNeural') && t.includes('de-DE-SeraphinaMultilingualNeural') && t.includes('es-ES-XimenaNeural'), f + ' names the voices');
        assert.ok(t.includes('tools/tutorial-voice/build.py'), f + ' names the tool');
    }
});
