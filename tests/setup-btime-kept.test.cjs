'use strict';
/* Code error sweep Oct 23 2026, bug queue BQ-2 (from the 11:02 bug hunt):
   a reload during the sign reveal resumes setup at the birthday step (BH-011), with the birthday filled in,
   but the optional birth time typed before was gone: saveOb() never kept ob.btime and R2.onboard() never read it.
   Now saveOb() keeps it as s.user.btime (removed again when cleared) and R2.onboard() fills it back in.
   Runs the real saveOb() and R2.onboard() code in a tiny sandbox. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function slice(start, end) {
    const i = html.indexOf(start);
    assert.ok(i > 0, start + ' exists');
    const j = html.indexOf(end, i + start.length);
    assert.ok(j > i, 'end of ' + start);
    return html.slice(i, j);
}

function sandbox(state) {
    const calls = { painted: 0, saved: 0 };
    const R2 = {
        S: () => state, save: () => { calls.saved++; }, applyTheme() {}, refreshMe() {}, X: () => null,
        sheet: () => ({}), syncAvatar() {}
    };
    const ctx = {
        R2, window: { LowiBirthCompanion: { has: () => false, reveal() {} } }, isCond: () => false,
        paintOb: () => { calls.painted++; }, calls
    };
    ctx.window.R2 = R2;
    const code = 'let ob = null;\n' + slice('R2.onboard = function(opts){', '\n/* Oct 17:') + '\n' +
        slice('function saveOb(final){', '\nfunction finishOb(') +
        '\nthis.getOb = () => ob; this.setOb = v => { ob = v; }; this.saveOb = saveOb;';
    vm.runInNewContext(code, ctx);
    return ctx;
}

test('Next on the birthday step keeps the birth time with the account', () => {
    const state = { user: {} };
    const c = sandbox(state);
    c.setOb({ step: 0, bday: '1990-08-01', btime: '07:45', avatar: '', tags: [], noCond: false, name: 'Zoe', gender: '' });
    c.saveOb(false);
    assert.equal(state.user.bday, '1990-08-01');
    assert.equal(state.user.btime, '07:45', 'birth time saved before the reveal');
    assert.equal(state.setupMid, 1);
});

test('a reload during the reveal brings the birth time back with the birthday', () => {
    const state = { user: { bday: '1990-08-01', btime: '07:45', name: 'Zoe' }, setupMid: 1 };
    const c = sandbox(state);
    c.R2.onboard();
    const ob = c.getOb();
    assert.equal(ob.step, 0, 'resumes at the birthday step (no companion yet)');
    assert.equal(ob.bday, '1990-08-01');
    assert.equal(ob.btime, '07:45', 'the birth time field is filled in again');
});

test('clearing the birth time removes it again, and no time stays empty', () => {
    const state = { user: { bday: '1990-08-01', btime: '07:45' } };
    const c = sandbox(state);
    c.setOb({ step: 0, bday: '1990-08-01', btime: '', avatar: '', tags: [], noCond: false, name: '', gender: '' });
    c.saveOb(false);
    assert.equal('btime' in state.user, false);
    const fresh = sandbox({ user: {} });
    fresh.R2.onboard();
    assert.equal(fresh.getOb().btime, '');
});
