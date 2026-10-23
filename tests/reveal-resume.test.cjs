'use strict';
/* BH-011 (Oct 19 2026): a new player could lose their own companion for good. Tapping Next on the birthday step saves the
   birthday and the setup-in-progress mark (setupMid, BH-009) and then plays the reveal; the companion itself is saved only
   when Continue is tapped on the reveal (LowiBirthCompanion.save). If the app reloaded (or iOS dropped it) while the reveal
   was showing, R2.onboard() resumed at step 1 because a birthday was saved, so the reveal never came back and the account
   stayed on the standard Misty (same name and look as everyone else's). Live probe: playtest/probe-newuser-reload.cjs RELOAD4=1.
   Now setup resumes at the birthday step (birthday filled in) until the companion exists, then at step 1 as before. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function onboardWith(state, bc) {
    const m = html.match(/R2\.onboard = function\(opts\)\{[\s\S]*?\n\};/);
    assert.ok(m, 'index.html has R2.onboard');
    const ctx = vm.createContext({ state, window: bc === undefined ? {} : { LowiBirthCompanion: bc } });
    vm.runInContext('let ob = null; const paintOb = () => {}; const R2 = { S: () => state, sheet: () => ({}) };', ctx);
    vm.runInContext(m[0], ctx);
    vm.runInContext('R2.onboard()', ctx);
    return vm.runInContext('ob', ctx);
}
const comp = has => ({ has: () => has, reveal() {}, get: () => ({}) });
const mid = () => ({ user: { bday: '1996-03-09', name: 'Tester' }, setupMid: 1 });

test('a reload during the reveal (companion not saved yet) resumes at the birthday step, not past it', () => {
    const ob = onboardWith(mid(), comp(false));
    assert.strictEqual(ob.step, 0, 'the reveal must be reachable again');
});

test('the birthday is already filled in when setup comes back for the reveal', () => {
    const ob = onboardWith(mid(), comp(false));
    assert.strictEqual(ob.bday, '1996-03-09');
    assert.strictEqual(ob.name, 'Tester');
});

test('once the companion exists, setup still resumes after the birthday step (BH-009 unchanged)', () => {
    const ob = onboardWith(mid(), comp(true));
    assert.strictEqual(ob.step, 1);
});

test('without the companion module, resume behaves as before', () => {
    const ob = onboardWith(mid(), undefined);
    assert.strictEqual(ob.step, 1);
});

test('a fresh setup with no birthday still starts at the birthday step', () => {
    const ob = onboardWith({ user: {} }, comp(false));
    assert.strictEqual(ob.step, 0);
});

test('the companion is still saved only from the reveal Continue button (so the resume check above is needed)', () => {
    const js = fs.readFileSync(path.join(__dirname, '..', 'companion-birth.js'), 'utf8');
    assert.match(js, /dataset\.lc==='go'\)\{[\s\S]{0,400}?save\(c\);if\(onDone\)onDone\(c\)/);
});
