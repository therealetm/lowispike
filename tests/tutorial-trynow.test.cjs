'use strict';
/* Oct 22 2026, Emmanuel: "There is a try it now button that does nothing. Wiggle when try it now is said so they click on it which
   closes the tutorial for them to try it."
   1. On a try-it card, Try it now is a real button. Tapping it closes the card, stops the voice and saves the place in
      lowi.tutorial.v1 .resume (the shape tutorial-resume.js reads), so the tour picks up on the next card.
   2. The button wiggles when the voice reaches the cue words (DE / ES too), or at the end of a card that does not say them, or once
      when the card appears with no voice; never more than twice per card. Reduced motion: it glows instead of moving.
   3. Hands-free never moves past a try-it card sooner than a few seconds after its wiggle. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const S = require('../tutorial-steps.js');
const V = require('../tutorial-voice.js');
const A = require('../tutorial-auto.js');
const R = require('../daily-ritual.js');
const KEY = 'lowi.tutorial.v1';

function classList() {
    const set = new Set();
    return { add: (...c) => c.forEach(x => set.add(x)), remove: (...c) => c.forEach(x => set.delete(x)), contains: c => set.has(c), toggle: (c, f) => { (f === undefined ? !set.has(c) : f) ? set.add(c) : set.delete(c); } };
}
function el(tag) {
    const e = {
        tagName: tag.toUpperCase(), id: '', className: '', attrs: {}, children: [], isConnected: false, offsetHeight: 180, offsetWidth: 300, parent: null,
        classList: classList(), innerHTML: '',
        setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = v; }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, removeAttribute(k) { delete this.attrs[k]; },
        addEventListener(t, f) { (this.ls = this.ls || {})[t] = f; }, focus() { }, remove() { this.isConnected = false; },
        appendChild(c) { c.parent = this; c.isConnected = true; this.children.push(c); return c; },
        getBoundingClientRect() { return { left: 0, top: 0, right: 390, bottom: 844, width: 390, height: 844 }; },
        closest(sel) { let n = this; while (n) { if (sel === '#ltTour' && n.id === 'ltTour') return n; n = n.parent; } return null; },
        querySelector(sel) { if (!this._kids) this._kids = { '.lt-card': el('div'), '.lt-hole': el('div'), '.lt-trybtn': el('button') }; const k = this._kids[sel]; if (k) { k.parent = this; k.isConnected = true; } return k || null; },
        querySelectorAll() { return []; }
    };
    Object.defineProperty(e, 'style', { value: { cssText: '', setProperty() { } }, writable: true });
    return e;
}
function page(o) {
    o = o || {};
    const intervals = [], timeouts = [], events = [];
    const H = el('html'); H.isConnected = true; H.clientWidth = 390;
    const body = el('body'); body.isConnected = true;
    let tour = null;
    const D = {
        documentElement: H, body, activeElement: null, head: { appendChild() { } },
        createElement(t) { const e = el(t); if (t === 'div' && !tour) { tour = e; } return e; },
        getElementById(id) { return id === 'ltCss' ? {} : null; },
        querySelector(sel) {
            if (/^(link|script)\[/.test(sel)) return {};
            const m = /^#ltTour(:not\(\.lt-held\))?$/.exec(sel);
            if (m) return tour && tour.isConnected && (!m[1] || !tour.classList.contains('lt-held')) ? tour : null;
            return null;
        },
        querySelectorAll() { return []; }
    };
    const voice = { on: !!o.voice, ctx: null, stops: 0, render(card, s, ctx) { this.ctx = ctx; }, stop() { this.stops++; }, isOn() { return this.on; } };
    const W = {
        document: D, innerWidth: 390, innerHeight: 844, LowiTutorialSteps: S, LowiRitualCore: { BUSY: R.BUSY }, LowiTutorialVoice: voice,
        LowiTutorialAuto: {}, LowiTutorialResume: {},
        localStorage: { _v: {}, getItem(k) { return this._v[k] || null; }, setItem(k, v) { this._v[k] = v; } },
        addEventListener() { }, dispatchEvent(e) { events.push(e); }, CustomEvent: function (n, x) { this.type = n; this.detail = x && x.detail; },
        matchMedia: () => ({ matches: !!o.reduced }), setInterval: f => { intervals.push(f); return intervals.length; }, clearInterval() { },
        setTimeout: (f, ms) => { timeouts.push({ f, ms }); return timeouts.length; }, clearTimeout() { },
        getComputedStyle: e => ({ display: 'block', visibility: e && e.classList && e.classList.contains('lt-held') ? 'hidden' : 'visible', opacity: '1', position: 'fixed' })
    };
    W.window = W;
    const ctx = vm.createContext(Object.assign(W, { console, JSON, Math, Date, String, Object, Array, Set, Map, Promise }));
    vm.runInContext(read('tutorial.js'), ctx, { filename: 'tutorial.js' });
    const T = W.LowiTutorial;
    const click = a => tour.ls.click({ stopPropagation() { }, target: { closest: () => ({ getAttribute: () => a }) } });
    const runTimers = () => { const t = timeouts.splice(0); t.forEach(x => x.f()); return t; };
    const to = id => { for (let k = 0; k < 80 && T.step() !== id; k++) click('next'); assert.strictEqual(T.step(), id, 'reached ' + id); };
    const store = () => JSON.parse(W.localStorage.getItem(KEY) || '{}');
    const ev = k => events.filter(e => e.type === 'lowi:tutorial' && e.detail && e.detail[k] != null).map(e => e.detail);
    return { W, T, voice, click, runTimers, timeouts, to, store, ev, events, card: () => tour.querySelector('.lt-card'), btn: () => tour.querySelector('.lt-trybtn') };
}
const firstTry = () => S.plan({}).find(s => s.tryIt).id;

test('Try it now is a real button on every try-it card, in every language', () => {
    const p = page(); p.T.start({ from: 'test', fresh: true });
    p.to(firstTry());
    const h = p.card().innerHTML;
    assert.match(h, /<button type="button" class="lt-trybtn" data-lt="tryit">/, 'a button with data-lt=tryit');
    assert.ok(h.includes('Try it now</button>'), 'it reads Try it now');
    assert.ok(!/<p class="lt-tryline"[^>]*>Try it now/.test(h), 'no longer a plain line of text that does nothing');
    for (const l of ['en', 'de', 'es']) assert.ok(S.UI[l].tryIt && S.TRY_CUE[l].length, l + ': label and cue words');
});

test('tapping Try it now closes the card, stops the voice and saves the place for Continue tutorial', () => {
    const p = page({ voice: true }), id = firstTry();
    p.T.start({ from: 'test', fresh: true }); p.to(id);
    const ids = S.plan({}).map(s => s.id), i = ids.indexOf(id);
    const stops = p.voice.stops;
    p.click('tryit');
    assert.strictEqual(p.T.isOn(), false, 'the card is closed');
    assert.ok(p.voice.stops > stops, 'the voice was stopped');
    const r = p.store().resume;
    assert.ok(r, 'lowi.tutorial.v1 .resume saved');
    assert.deepStrictEqual({ at: r.at, i: r.i, n: r.n, next: r.next, fin: r.fin, via: r.via }, { at: id, i, n: ids.length, next: ids[i + 1], fin: true, via: 'tryit' });
    assert.strictEqual(p.store().done, false, 'not counted as finished');
    assert.strictEqual(p.ev('reason').pop().reason, 'tryit', 'stop reason tryit (tutorial-resume.js keeps the place for any reason but finished / skipped)');
    assert.strictEqual(p.ev('tryNow').length, 1, 'a tryNow event');
    p.T.start({ from: 'settings' });
    assert.strictEqual(p.T.step(), ids[i + 1], 'picks up on the card after the one they tried');
    p.T.stop('left'); p.T.start({ from: 'settings' });
    assert.strictEqual(p.T.step(), ids[0], 'only picked up once');
});

test('the resume record has the tutorial-resume.js shape (next card, or this one when it is the last)', () => {
    const r = S.tryResume(['a', 'b', 'c'], 1, 5);
    assert.deepStrictEqual(r, { at: 'b', i: 1, n: 3, next: 'c', fin: true, t: 5, via: 'tryit' });
    const last = S.tryResume(['a', 'b'], 1, 5); assert.strictEqual(last.next, '');
    const resumeAt = x => (x.fin && x.next ? x.next : x.at);
    assert.strictEqual(resumeAt(r), 'c'); assert.strictEqual(resumeAt(last), 'b');
});

test('the button wiggles when the voice says the cue, at most twice, and hands-free waits a few seconds after it', () => {
    const p = page({ voice: true }), id = firstTry();
    p.T.start({ from: 'test', fresh: true }); p.to(id);
    const c = p.voice.ctx;
    assert.deepStrictEqual(Array.from(c.cue), S.TRY_CUE.en, 'the voice is given the cue words');
    assert.strictEqual(typeof c.onCue, 'function');
    p.runTimers();
    assert.strictEqual(p.T.wiggles(), 0, 'no wiggle before the words are said (voice on)');
    c.onCue();
    assert.strictEqual(p.T.wiggles(), 1, 'wiggles on the cue');
    assert.ok(p.btn().classList.contains('lt-wiggle'), 'the wiggle class is on the button');
    assert.deepStrictEqual(p.ev('wiggle').map(d => [d.wiggle, d.why]), [[id, 'cue']]);
    p.timeouts.length = 0;
    c.onEnd();
    assert.strictEqual(p.T.wiggles(), 1, 'no second wiggle right after the first');
    const auto = p.timeouts.find(t => t.ms >= 1000);
    assert.ok(auto && auto.ms >= 4000, 'hands-free waits at least 4 s after the wiggle (' + (auto && auto.ms) + ' ms)');
    c.onCue(); c.onCue(); c.onEnd();
    assert.ok(p.T.wiggles() <= 2, 'never more than twice per card');
});

test('no cue words: wiggle at the end; no voice: once when it appears; reduced motion glows', () => {
    let p = page({ voice: true }); p.T.start({ from: 'test', fresh: true }); p.to(firstTry());
    p.voice.ctx.onEnd();
    assert.deepStrictEqual(p.ev('wiggle').map(d => d.why), ['end']);
    p = page({ voice: false }); p.T.start({ from: 'test', fresh: true }); p.to(firstTry());
    assert.strictEqual(p.T.wiggles(), 0); p.runTimers();
    assert.deepStrictEqual(p.ev('wiggle').map(d => d.why), ['appear'], 'one wiggle when the card appears with no voice');
    p.click('pause'); p.click('pause'); p.runTimers();
    assert.strictEqual(p.ev('wiggle').length, 1, 'a repaint of the same card does not wiggle again');
    p = page({ voice: false, reduced: true }); p.T.start({ from: 'test', fresh: true }); p.to(firstTry()); p.runTimers();
    assert.ok(p.btn().classList.contains('lt-glow') && !p.btn().classList.contains('lt-wiggle'), 'reduced motion: a glow, no movement');
    const css = read('tutorial.css');
    assert.match(css, /\.lt-trybtn\.lt-wiggle \{ animation: lt-wiggle [^}]* 1; \}/, 'the wiggle runs once, not in a loop');
    assert.match(css, /prefers-reduced-motion: reduce\) \{ \.lt-trybtn\.lt-wiggle \{ animation: lt-glow/);
});

test('the real voice finds the cue in every language and calls onCue once when it gets there', async () => {
    const st = S.STEPS.find(s => s.id === 'swipe-pages');
    for (const l of ['en', 'de', 'es']) {
        const sp = V.spoken(st, l, 'Misty'), k = V.cueIndex(sp.s, S.TRY_CUE[l]);
        assert.ok(k > 0, l + ': cue found in ' + sp.s);
        assert.ok(/^(try|probier|pru)/i.test(sp.s.slice(k)), l + ': it points at the words');
    }
    assert.strictEqual(V.cueIndex('Tap me once.', S.TRY_CUE.en), -1);
    const L = { 'lowi.tutorial.voice.v1': '1' }, audios = [], events = []; let frame = null;
    class Audio {
        constructor() { this.l = {}; this.paused = true; this.currentTime = 0; audios.push(this); }
        setAttribute() { }
        addEventListener(k, f) { (this.l[k] = this.l[k] || []).push(f); }
        play() { this.paused = false; return Promise.resolve(); }
        pause() { this.paused = true; }
    }
    const stub = () => ({ classList: { toggle() { }, add() { }, remove() { } }, setAttribute() { }, querySelector: () => null, appendChild() { }, textContent: '' });
    const D = { documentElement: { classList: { contains: () => true } }, head: { appendChild() { } }, addEventListener() { }, getElementById: () => ({}), createElement: stub, createTextNode: () => ({}), querySelector: () => null, hidden: false };
    const W = {
        document: D, Audio, localStorage: { getItem: k => (k in L ? L[k] : null), setItem: (k, v) => { L[k] = String(v); } },
        fetch: async () => ({ ok: true, clone() { return this; }, blob: async () => ({}) }), URL: { createObjectURL: () => 'blob:x', revokeObjectURL() { } },
        requestAnimationFrame: f => { frame = f; return 1; }, cancelAnimationFrame() { }, setTimeout, clearTimeout, Promise,
        CustomEvent: function (t, i) { this.type = t; this.detail = i && i.detail; }, dispatchEvent(e) { events.push(e); }, addEventListener() { }
    };
    W.window = W;
    const sp = V.spoken(st, 'en', 'Misty'), at = V.cueIndex(sp.s, S.TRY_CUE.en);
    W.LowiTutorialVoiceData = { clips: { en: { [sp.key]: { f: 'x.mp3', h: 'x', s: sp.s, w: [[0, 0], [1000, 10], [5000, at], [5400, at + 4]] } } } };
    vm.runInContext(read('tutorial-voice.js').replace(/const SILENT = '[^']*'/, "const SILENT = 'silent'"), vm.createContext(W));
    const got = [];
    W.LowiTutorialVoice.render(stub(), st, { lang: 'en', cue: S.TRY_CUE.en, onCue: k => got.push(k) });
    const tick = () => new Promise(r => setTimeout(r, 5));
    await tick(); await tick(); await tick();
    const a = audios[0]; assert.strictEqual(a.src, 'blob:x', 'the clip plays');
    a.currentTime = 2; if (frame) frame();
    assert.deepStrictEqual(got, [], 'not yet: the words come later');
    a.currentTime = 5.1; if (frame) frame();
    a.currentTime = 5.5; if (frame) frame();
    assert.deepStrictEqual(got, [sp.key], 'onCue once, when the words are said');
    assert.ok(events.some(e => e.detail && e.detail.state === 'cue'), 'a cue event for others');
});

test('tutorial-auto does not count Try it now as quitting and gives them time to try before offering the rest', () => {
    const run = { s: 'running', step: 'touch' };
    const n = A.onEvent(run, { on: false, reason: 'tryit' });
    assert.strictEqual(n.s, 'running'); assert.ok(n.tryAt > 0); assert.strictEqual(n.resumed, false);
    assert.strictEqual(A.decide(n, { quietMs: 9e9, now: n.tryAt + 5000 }), 'wait', 'no offer while they try');
    assert.strictEqual(A.decide(Object.assign({}, n, { resumed: true }), { quietMs: 9e9, now: n.tryAt + 5000 }), 'wait', 'never quit');
    assert.strictEqual(A.decide(n, { quietMs: 9e9, now: n.tryAt + 30000 }), 'offer', 'later, the one offer to continue');
    const back = A.onEvent(n, { on: true, step: 'x' });
    assert.ok(!('tryAt' in back), 'cleared once the tour is back');
});
