'use strict';
/* BH-009 (Oct 19 2026): setup was lost for good after a reload (or iOS dropping the app, e.g. while picking a photo)
   once the birthday step was done. saveOb(false) saves the birthday right after step 0, and the app only reopens setup
   when there is NO birthday (authBoot: !setupDone && !bday). So the photo, health and shopping steps were skipped,
   setupDone stayed false and the starter-plan interview (LowiHerbStart.afterSetup) never opened.
   Live 20261019-163105, WebKit iPhone 13 + Chromium 390: playtest/probe-newuser-reload.cjs RELOAD2=1 ->
   "reload2:setupVisible=false". Now a setup in progress is marked (setupMid) and resumes at the step after the birthday. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function grab(re, what) { const m = html.match(re); assert.ok(m, 'index.html has ' + what); return m[0]; }

function world(state) {
    const calls = { onboard: 0, toast: 0, timers: [] };
    const ctx = vm.createContext({
        state, calls, sessionStorage: { getItem: () => null, removeItem() {} },
        document: { addEventListener() {} }, setTimeout: f => { calls.timers.push(f); },
        window: {}, $: () => null
    });
    vm.runInContext('const R2 = { S: () => state, save() {}, applyTheme() {}, X: () => null, refreshMe() {}, toast() { calls.toast++; }, onboard() { calls.onboard++; },' +
        ' sheet: () => ({}) }; let ob = null; const isAccount = () => true; const needsGate = () => false; const hookProfile = () => {}; let gateEl = null; const showGate = () => {}; const paintOb = () => {}; const isCond = () => false;', ctx);
    const helper = html.match(/function setupPending\(s\)\{[^\n]*\}/);
    if (helper) vm.runInContext(helper[0], ctx);
    vm.runInContext(grab(/function saveOb\(final\)\{[\s\S]*?\n\}/, 'saveOb'), ctx);
    const boot = grab(/R2\.authBoot = function\(\)\{[\s\S]*?\n  else if \(isAccount\(\)\)[^\n]*\n/, 'authBoot');
    vm.runInContext(boot + '};', ctx);
    const onb = grab(/R2\.onboard = function\(opts\)\{[\s\S]*?\n\};/, 'R2.onboard');
    return { ctx, calls, boot: () => { vm.runInContext('R2.authBoot()', ctx); calls.timers.splice(0).forEach(f => f()); },
        realOnboard: () => { vm.runInContext(onb.replace('R2.onboard =', 'R2.realOnboard ='), ctx); vm.runInContext('R2.realOnboard()', ctx); return vm.runInContext('ob', ctx); },
        saveStep0: () => { vm.runInContext('ob = { step: 0, bday: "1996-03-09", name: "Tester", avatar: "", tags: [], noCond: false, gender: "" }; saveOb(false);', ctx); },
        finish: () => vm.runInContext('saveOb(true)', ctx) };
}

test('a reload after the birthday step reopens setup', () => {
    const s = { user: {} };
    const w = world(s);
    w.saveStep0();
    assert.strictEqual(s.user.bday, '1996-03-09');
    w.boot();
    assert.strictEqual(w.calls.onboard, 1, 'setup comes back after the reload');
});

test('it resumes at the step after the birthday (the companion is already revealed)', () => {
    const s = { user: {} };
    const w = world(s);
    w.saveStep0();
    const ob = w.realOnboard();
    assert.strictEqual(ob.step, 1);
});

test('a finished setup does not come back and clears the marker', () => {
    const s = { user: {} };
    const w = world(s);
    w.saveStep0(); w.finish();
    assert.ok(s.setupDone && !s.setupMid);
    w.boot();
    assert.strictEqual(w.calls.onboard, 0);
});

test('an older account with a birthday but no setupDone and no marker is NOT pushed into setup (unchanged)', () => {
    const s = { user: { bday: '1980-01-01', name: 'Old' } };
    const w = world(s);
    w.boot();
    assert.strictEqual(w.calls.onboard, 0);
    const ob = w.realOnboard();
    assert.strictEqual(ob.step, 0, 'opening setup by hand still starts at the beginning');
});

test('a brand-new account with no birthday still gets setup (unchanged)', () => {
    const w = world({ user: {} });
    w.boot();
    assert.strictEqual(w.calls.onboard, 1);
});

test('re-running setup on a finished account never sets the marker', () => {
    const s = { user: { bday: '1990-01-01' }, setupDone: true };
    const w = world(s);
    w.saveStep0();
    assert.ok(!s.setupMid);
});
