'use strict';
/* Oct 22 2026, Emmanuel (voice): "It reads the title, so it sounds very repetitive ... If the title and the text aren't repetitive,
   then I guess it can. Also, would be nice if I don't have to press the next button every time. If I did turn on the mic, I should be
   able to just place my phone somewhere and just listen as it goes, by itself. Also there's a bug: when it reaches the scanner, Apple
   shows 'Allow camera', which breaks the whole tutorial ... Or maybe we just tell them what's inside the scanner instead."
   1. the voice never says the title when the text already says it;  2. hands-free: a card read to the end moves on by itself;
   3. the tour never opens Scan (it starts the camera at once), its Scan cards show a picture of the inside. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const S = require('../tutorial-steps.js');
const V = require('../tutorial-voice.js');
const LANGS = ['en', 'de', 'es'];

/* ---------- 1. nothing said twice ---------- */
const norm = w => String(w).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const PRON = new Set(['your', 'yours', 'dein', 'deine', 'deinem', 'deinen', 'deiner', 'mich', 'dich', 'tuyo', 'tuya']);
const first4 = s => String(s).replace(/\{\w+\}/g, ' ').split(/[^\p{L}\p{N}]+/u).map(norm).filter(w => w.length >= 4 && !PRON.has(w)).map(w => w.slice(0, 4));

test('a title is only said when none of its words is in the text', () => {
    let said = 0, left = 0;
    for (const l of LANGS) for (const st of S.STEPS) {
        const sp = V.spoken(st, l, 'Misty'), body = S.fill(st.text[l], { name: 'Misty' });
        if (sp.t < 0) { left++; assert.strictEqual(sp.s, body, st.id + '/' + l + ': text only'); continue; }
        said++;
        const t = first4(st.title[l]), x = new Set(first4(st.text[l]));
        for (const w of t) assert.ok(!x.has(w), st.id + '/' + l + ': title "' + st.title[l] + '" is said although "' + w + '…" is in the text');
        assert.ok(sp.s.endsWith(body), st.id + '/' + l + ': the whole text follows the title');
    }
    assert.ok(left > said * 3, 'most titles repeat their text and are left out (' + left + ' left out, ' + said + ' said)');
});

test('Emmanuel\'s examples: repeated titles are gone, titles that add something stay', () => {
    const sp = (id, l) => V.spoken(S.STEPS.find(s => s.id === id), l || 'en', 'Misty');
    assert.strictEqual(sp('touch').t, -1, '"Tap me" + "Tap me once" says it once');
    assert.strictEqual(sp('scan').t, -1, '"Scan" + "This is Scan" says it once');
    assert.strictEqual(sp('misty-hold').t, -1, '"Hold me" + "keep your finger on me": a repeat in other words (sayTitle: false)');
    for (const l of LANGS) assert.ok(sp('hello', l).t > 0, 'hello/' + l + ': "Hi, I\'m Misty" adds the greeting and the name');
    assert.ok(sp('secret').s.startsWith('A secret. '), 'a title that adds something is said once, then the text');
    const ren = V.spoken(S.STEPS.find(s => s.id === 'hello'), 'en', 'Nova');
    assert.strictEqual(ren.key, 'hello~', 'a renamed companion: the recorded title with Misty in it is left out');
});

test('sayTitle: false (all languages or per language) is respected', () => {
    const st = { id: 'x', title: { en: 'Gold rush', de: 'Goldrausch', es: 'Fiebre del oro' }, text: { en: 'Nothing alike here.', de: 'Nichts davon hier.', es: 'Nada parecido aquí.' } };
    assert.ok(V.titleAdds(st, 'en'));
    assert.ok(!V.titleAdds(Object.assign({}, st, { sayTitle: false }), 'en'));
    const per = Object.assign({}, st, { sayTitle: { de: false } });
    assert.ok(V.titleAdds(per, 'en') && !V.titleAdds(per, 'de') && V.titleAdds(per, 'es'));
});

/* ---------- 3. the scanner ---------- */
test('the tour never opens Scan or asks for the camera', () => {
    for (const s of S.STEPS) {
        assert.notStrictEqual(s.where, 'scan', s.id + ': no step is shown inside Scan (goTab("scan") opens the camera)');
        for (const t of [].concat(s.target || [])) assert.ok(!/b3|#tab-scan/.test(t), s.id + ': no target inside the Scan screen (' + t + ')');
        if (s.tryIt) assert.ok(![].concat(s.target || []).some(t => /o8-scan/.test(t)), s.id + ': no try-it on the Scan bubble (a tap opens the camera)');
    }
    const js = read('tutorial.js');
    assert.match(js, /const TAB_OF = \{ home: 'home', community: 'foryou' \};/, 'no scan section to move to');
    const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    assert.ok(!/getUserMedia|LowiSpirit\.open|goTab\(\s*['"]scan/.test(code), 'tutorial.js never starts a camera');
    assert.match(js, /b3-camon[^\n]*return 'camera'/, 'a camera the user opens holds the tour behind it');
});

test('the Scan cards show what is inside, in every language', () => {
    const peeks = S.STEPS.filter(s => s.peek);
    assert.deepStrictEqual(peeks.map(s => s.id), ['scan-in', 'deep']);
    assert.deepStrictEqual(peeks.map(s => s.peek.mark), ['frame', 'deep']);
    for (const l of LANGS) {
        const P = S.UI[l].peek; assert.ok(P, l + ': peek words');
        for (const k of ['title', 'aim', 'field', 'barcode', 'deep', 'deepS', 'note']) assert.ok(P[k] && P[k].length, l + ': peek.' + k);
        assert.ok(S.UI[l].pause && S.UI[l].play, l + ': Pause / Play labels');
    }
    const js = read('tutorial.js'), css = read('tutorial.css');
    assert.match(js, /function peekHtml\(s, U\)/);
    assert.match(js, /peekHtml\(s, U\) \+/, 'the card shows the picture under its text');
    assert.match(css, /\.lt-peek \{/);
    const scan = S.STEPS.find(s => s.id === 'scan');
    assert.match(scan.text.en, /show you what’s inside/);
    const snap = S.STEPS.find(s => s.id === 'snap');
    for (const l of LANGS) assert.ok(!/Barcode|Scannen|Escanear/.test(snap.text[l]), 'snap/' + l + ': Snap is no longer in Scan');
});

/* ---------- 2. hands-free ---------- */
test('tutorial.js moves on by itself after a card was read, and can be paused', () => {
    const js = read('tutorial.js');
    assert.match(js, /render\(card, s, \{[^\n]*onEnd: said, quiet: paused \}\)/, 'every card hands the voice its onEnd and the pause');
    const said = js.slice(js.indexOf('function said()'), js.indexOf('function cancelAuto()'));
    assert.match(said, /if \(!on \|\| held \|\| paused \|\| !s \|\| !voiceOn\(\) \|\| at >= list\.length - 1 \|\| s\.action === 'claim'\) return;/, 'only with the speaker on, never on the last or the claim card');
    assert.match(said, /go\(at \+ 1, 'auto'\)/);
    assert.match(said, /i === at/, 'only when still on that card');
    assert.match(js, /const AUTO = \{ GAP: 1200, TRY: 4500 \}/, 'a short natural pause; try-it cards leave time to try');
    assert.match(js, /data-lt="pause"/, 'a Pause / Play button on the card');
    assert.match(js, /a === 'pause'\) setPaused\(!paused\)/);
    assert.match(js, /function hold\(why\) \{ if \(held \|\| !root\) return; cancelAuto\(\);/, 'a panel on top stops the countdown');
    assert.match(js, /cancelAuto\(\);\s*\n\s*i = Math\.max\(0, n\);/, 'Next / Back cancel a running countdown');
    assert.match(js, /navigator\.wakeLock\.request\('screen'\)/, 'the screen stays on while it reads by itself');
    assert.match(read('tutorial.css'), /\.lt-tour\.lt-voice \.lt-btn\.lt-pause \{ display: grid; \}/, 'Pause shows only with the speaker on');
});

/* the real tutorial-voice.js in a tiny fake page: onEnd fires once, only when a card was read to the end */
function voicePage(opts) {
    const o = opts || {};
    const L = {}, audios = [], events = [];
    class Audio {
        constructor() { this.l = {}; this.paused = true; this.currentTime = 0; audios.push(this); this.plays = 0; }
        setAttribute() { }
        addEventListener(k, f) { (this.l[k] = this.l[k] || []).push(f); }
        play() { this.plays++; if (o.block && this.src !== 'silent') return Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' })); this.paused = false; return Promise.resolve(); }
        pause() { this.paused = true; }
        end() { this.paused = true; (this.l.ended || []).forEach(f => f()); }
    }
    const elStub = () => ({ classList: { toggle() { }, add() { }, remove() { } }, setAttribute() { }, querySelector: () => null, appendChild() { }, textContent: '' });
    const D = {
        documentElement: { classList: { contains: () => true } }, head: { appendChild() { } },
        addEventListener() { }, getElementById: () => ({}), createElement: elStub, createTextNode: () => ({}), querySelector: () => null, hidden: false
    };
    const W = {
        document: D, Audio, localStorage: { getItem: k => (k in L ? L[k] : null), setItem: (k, v) => { L[k] = String(v); } },
        fetch: async () => ({ ok: true, clone() { return this; }, blob: async () => ({}) }), URL: { createObjectURL: () => 'blob:x', revokeObjectURL() { } },
        requestAnimationFrame: () => 1, cancelAnimationFrame() { }, setTimeout, clearTimeout, Promise,
        CustomEvent: function (t, i) { this.type = t; this.detail = i && i.detail; },
        dispatchEvent(e) { events.push(e); }, addEventListener() { }
    };
    W.window = W; W.LowiTutorialVoiceData = { clips: {} };
    if (o.on !== false) L['lowi.tutorial.voice.v1'] = '1';
    const ctx = vm.createContext(W);
    vm.runInContext(read('tutorial-voice.js').replace(/const SILENT = '[^']*'/, "const SILENT = 'silent'"), ctx);
    const api = W.LowiTutorialVoice;
    const clip = st => { const sp = V.spoken(st, 'en', 'Misty'); W.LowiTutorialVoiceData.clips.en = Object.assign(W.LowiTutorialVoiceData.clips.en || {}, { [sp.key]: { f: sp.key + '.mp3', h: 'x', s: sp.s, w: [[0, 0]] } }); };
    return { W, api, audios, events, clip, card: elStub() };
}
const tick = () => new Promise(r => setTimeout(r, 5));

test('the voice calls onEnd once a card was read to the end, and not again on a repaint', async () => {
    const p = voicePage(), st = S.STEPS[2], got = [];
    p.clip(st);
    p.api.render(p.card, st, { lang: 'en', onEnd: k => got.push(k) });
    await tick(); await tick();
    const a = p.audios[0]; assert.ok(a && !a.paused, 'the clip plays');
    const plays = a.plays;
    a.end(); await tick();
    assert.deepStrictEqual(got, [st.id], 'onEnd with the card\'s key');
    assert.ok(p.events.some(e => e.type === 'lowi:tutorial-voice' && e.detail.state === 'end'), 'an end event for others');
    p.api.render(p.card, st, { lang: 'en', onEnd: k => got.push(k) });   /* try-it done / Pause off repaint the same card */
    await tick(); await tick();
    assert.strictEqual(a.plays, plays, 'the same card is not read a second time');
});

test('the silent unlock sound ending is not the card ending; the next card\'s clip plays after one ends', async () => {
    const p = voicePage(), a1 = S.STEPS[2], a2 = S.STEPS[3], got = [];
    p.clip(a1); p.clip(a2);
    p.api.render(p.card, a1, { lang: 'en', onEnd: k => got.push(k) });
    const a = p.audios[0]; assert.strictEqual(a.src, 'silent', 'the first card unlocks sound with the silent clip');
    a.end();   /* the silent clip ends while the card's clip is still loading */
    await tick();
    assert.deepStrictEqual(got, [], 'not counted as read');
    await tick(); await tick();
    assert.strictEqual(a.src, 'blob:x', 'the card\'s own clip plays'); assert.ok(!a.paused);
    a.end(); await tick();
    assert.deepStrictEqual(got, [a1.id], 'its own end moves on');
    const plays = a.plays;
    p.api.render(p.card, a2, { lang: 'en', onEnd: k => got.push(k) });   /* hands-free: the next card, with no tap */
    await tick(); await tick();
    assert.ok(a.plays > plays && !a.paused, 'the next card\'s clip plays by itself');
    a.end(); await tick();
    assert.deepStrictEqual(got, [a1.id, a2.id]);
});

test('stopped, blocked or paused cards never move on by themselves', async () => {
    const st = S.STEPS[3];
    let p = voicePage(), got = []; p.clip(st);
    p.api.render(p.card, st, { lang: 'en', onEnd: k => got.push(k) }); await tick(); await tick();
    p.api.stop(); p.audios[0].end(); await tick();
    assert.deepStrictEqual(got, [], 'stopped: no onEnd');
    p = voicePage({ block: true }); got = []; p.clip(st);
    p.api.render(p.card, st, { lang: 'en', onEnd: k => got.push(k) }); await tick(); await tick();
    assert.ok(!p.api.playing(), 'blocked: waits for a tap'); assert.deepStrictEqual(got, [], 'blocked (no tap yet on iOS): no onEnd');
    p = voicePage(); got = []; p.clip(st);
    p.api.render(p.card, st, { lang: 'en', onEnd: k => got.push(k), quiet: true }); await tick(); await tick();
    assert.ok(!p.audios.some(a => a.plays > 0 && a.src !== 'silent' && !a.paused), 'quiet (paused): nothing plays');
    p = voicePage({ on: false }); got = []; p.clip(st);
    p.api.render(p.card, st, { lang: 'en', onEnd: k => got.push(k) }); await tick(); await tick();
    assert.ok(!p.api.playing(), 'speaker off: silent'); assert.deepStrictEqual(got, []);
});

test('the voice engine keeps its public interface (Affiliate scripts reuse it)', () => {
    const p = voicePage();
    for (const k of ['render', 'stop', 'toggle', 'isOn', 'playing', 'how', 'paused', 'word', 'bestVoice', 'data', 'spoken', 'plan', 'VOICES', 'BCP', 'NAME', 'KEY', 'CACHE', 'DIR'])
        assert.ok(k in p.api, 'LowiTutorialVoice.' + k);
    assert.strictEqual(p.api.KEY, 'lowi.tutorial.voice.v1');
});
