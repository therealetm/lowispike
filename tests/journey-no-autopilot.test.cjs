'use strict';
/* Bug hunt run 44 (Mon 26 Oct 2026). Emmanuel (voice): "You know the auto fly. If they want to manually tap, let them do
   that. But not automatically. It's quite annoying and then the UI breaks."
   Found live (build 20261026-163708, Chromium 390 and WebKit iPhone 13, BUGHUNT/playtest/probe-journey-auto.cjs): "Start
   next journey" (the Today journey row, body-trips startNext) switched the controller into autopilot 480 ms later
   (LowiPad.mode('auto')). That turned on the clean flight view (html.lw-clean-auto): every Home button went invisible
   (7 visible controls -> 0) and stayed hidden for the whole 30 min journey, with the camera flying off, although the user
   only asked for a journey. Same break the manual-explore task removed from the sun trip. Autopilot is only ever the
   user's own three taps on the controller (misty-pad.js userMode -> LowiAdventure.start).
   Here: starting a journey still starts it (state, save, sheets closed) and never touches the controller. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'body-trips.js'), 'utf8');

function load() {
    const timers = [], padCalls = [], advCalls = [], closed = [];
    let saves = 0;
    const el = () => ({ classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, style: {}, dataset: {}, setAttribute() {}, appendChild() {}, insertBefore() {}, querySelector() { return null; }, querySelectorAll() { return []; } });
    const doc = { readyState: 'complete', hidden: false, head: el(), documentElement: el(), getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; }, createElement: el, addEventListener() {} };
    const state = { body: null };
    const W = {
        document: doc, addEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false }),
        setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
        requestAnimationFrame: () => 0, cancelAnimationFrame() {},
        LowiVitalsBridge: { state: () => state, save: () => { saves++; } },
        LowiSun: { energyNow: () => ({ value: 0.8, tier: 'ok', canTravel: true }) },
        LowiPad: { mode: m => padCalls.push(m), state: () => ({ pad: '' }) },
        LowiAdventure: { on: false, start: () => { advCalls.push('start'); return true; }, stop: () => advCalls.push('stop') },
        LowiR2: { closeAll: () => closed.push('all'), close() {} },
        LowiWorldHome: { state: { today: true }, openToday: v => closed.push('today:' + v) },
        localStorage: { getItem: () => null, setItem() {}, removeItem() {} }
    };
    const ctx = vm.createContext(Object.assign({}, W, { console }));
    ctx.window = ctx;
    vm.runInContext(src, ctx, { filename: 'body-trips.js' });
    const runTimers = () => { while (timers.length) { const t = timers.shift(); try { t.f(); } catch (e) { } } };
    return { BT: ctx.LowiBodyTrips, padCalls, advCalls, closed, state, runTimers, saves: () => saves };
}

test('Start next journey starts the journey (one trip saved, sheets closed)', () => {
    const h = load();
    assert.ok(h.BT && typeof h.BT.startNext === 'function');
    assert.equal(h.BT.startNext(), true);
    h.runTimers();
    const trips = Object.keys(h.state.body.trips || {});
    assert.equal(trips.length, 1, 'one journey started');
    assert.ok(h.saves() >= 1, 'saved');
    assert.ok(h.closed.includes('all'), 'sheets closed so you see Home');
});

test('Start next journey never switches the controller to autopilot (no auto fly without a tap on autopilot)', () => {
    const h = load();
    assert.equal(h.BT.startNext(), true);
    h.runTimers();
    assert.deepEqual(h.padCalls, [], 'controller untouched (was LowiPad.mode("auto") 480 ms later)');
    assert.deepEqual(h.advCalls, [], 'no adventure started');
});

test('body-trips has no path that puts the controller into autopilot', () => {
    assert.doesNotMatch(src, /LowiPad\.mode\(\s*['"]auto['"]\s*\)/);
    assert.doesNotMatch(src, /LowiAdventure\.start\(/);
});
