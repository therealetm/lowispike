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

test('GUARD (Oct 25 2026): no card has a Try it now button in any language, and tutorial.js only draws one for a card that has a try-it', () => {
    for (const s of S.STEPS) assert.ok(!s.tryIt, s.id + ': "Try it now" was retired with the long tour; the demo finger shows the gesture instead');
    for (const s of S.STEPS) for (const l of ['en', 'de', 'es']) assert.doesNotMatch(s.text[l], /Try it now|Jetzt ausprobieren|Pruébalo ahora/i, s.id + '/' + l);
    const js = read('tutorial.js');
    /* Oct 25 2026: the button's code is gone too, so nothing can draw it again */
    assert.doesNotMatch(js, /function tryHtml|lt-trybtn|data-lt="tryit"|function tryNow|function wiggle|S\.TRY_CUE/, 'no Try it now code left in tutorial.js');
    assert.doesNotMatch(read('tutorial.css'), /\.lt-trybtn|\.lt-tryline|@keyframes lt-wiggle/, 'no Try it now styles left');
});

test('GUARD: no base card says "after the tour" and no base card is a later card; Continue tutorial still resumes a saved place', () => {
    for (const s of S.base()) { assert.ok(!s.later, s.id + ': later'); for (const l of ['en', 'de', 'es']) assert.doesNotMatch(s.text[l], S.LATER_MARK[l], s.id + '/' + l); }
    assert.strictEqual(typeof S.tryResume, 'function', 'a saved place can still be resumed');
});

test('the resume record has the tutorial-resume.js shape (next card, or this one when it is the last)', () => {
    const r = S.tryResume(['a', 'b', 'c'], 1, 5);
    assert.deepStrictEqual(r, { at: 'b', i: 1, n: 3, next: 'c', fin: true, t: 5, via: 'tryit' });
    const last = S.tryResume(['a', 'b'], 1, 5); assert.strictEqual(last.next, '');
    const resumeAt = x => (x.fin && x.next ? x.next : x.at);
    assert.strictEqual(resumeAt(r), 'c'); assert.strictEqual(resumeAt(last), 'b');
});

test('the short tour moves on by itself: a reading timer per card that waits while the voice still talks (works with the speaker off)', () => {
    const js = read('tutorial.js');
    assert.match(js, /const DEMO = \{ CLOSE_PAUSE: \d+, READ_MIN: (\d+), READ_PER_CHAR: (\d+), START: \d+ \};/);
    const m = js.match(/READ_MIN: (\d+), READ_PER_CHAR: (\d+)/); assert.ok(+m[1] >= 2000 && +m[2] >= 40, 'enough time to read');
    assert.match(js, /function readMs\(s\) \{ const t = S\.text\(s, 'text', lang\(\), \{ name: companionName\(\) \}\) \|\| ''; return Math\.max\(DEMO\.READ_MIN, t\.length \* DEMO\.READ_PER_CHAR\); \}/);
    assert.match(js, /if \(talking\) \{ readT = setTimeout\(chk, 500\); return; \}/, 'never cuts the voice off mid-sentence');
    assert.match(js, /readDone = at; demoGo\(\);/, 'the timer moves the card on');
});

test('GUARD: no card carries a cue word, a practice field, a peek or a pad: there is nothing to wiggle at in the short tour', () => {
    for (const s of S.STEPS) for (const f of ['cue', 'practice', 'peek', 'pad', 'tryIt']) assert.ok(!(f in s), s.id + ': ' + f + ' came back');
    for (const s of S.base()) assert.ok(s.demo || ['claim', 'done'].includes(s.id), s.id + ': the finger shows it instead');
});

test('every card of the short tour has its recorded clip in English, German and Spanish (the tutorial voice); none needs a cue', () => {
    for (const s of S.plan({ claimReady: true })) for (const l of ['en', 'de', 'es'])
        assert.ok(fs.existsSync(path.join(ROOT, 'tutorial-voice', l, s.id + '.mp3')) || fs.readdirSync(path.join(ROOT, 'tutorial-voice', l)).some(f => f.startsWith(s.id + '~')), s.id + '/' + l + ' has a clip');
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
