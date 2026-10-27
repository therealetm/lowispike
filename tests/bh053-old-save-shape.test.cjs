'use strict';
/* Bug hunt run 53 (P-SAVE-SHAPE): a saved profile whose list or object field is null (or the whole save is a number / text)
   made load() throw at boot. Live 20261027-004442, probe-shape.cjs: health or streak null -> load() threw and no tab was shown;
   user, logs, quests or glow null -> Home threw while drawing. These tests run the real fresh()/load() and r5fresh()/r5load()
   from index.html in a sandbox with a fake localStorage. */
const test = require('node:test'); const assert = require('node:assert');
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function cut(startMark, endMark) {
    const a = html.indexOf(startMark); assert.ok(a > 0, 'found ' + startMark);
    const b = html.indexOf(endMark, a); assert.ok(b > a, 'found ' + endMark);
    return html.slice(a, b);
}
const MAIN = cut('function fresh(){ return {v:2,', 'function save(){ try { localStorage.setItem(KEY');
const R5SRC = cut('function r5fresh()', 'function r5save()');
function run(src, key, raw, after) {
    const store = {}; if (raw !== undefined) store[key] = raw;
    const ctx = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        console, window: {}, KEY: 'lowispike.v2', R5KEY: 'lowispike.r5.v1', save: () => true };
    vm.createContext(ctx);
    vm.runInContext('var S, R5;\n' + src + '\n' + after, ctx);
    return ctx;
}
const base = () => ({ v: 2, onboarded: true, user: { name: 'Ada', bday: '1990-01-01', avatar: '', tags: ['Energy'] }, xp: 120, ledger: [{ id: 'a', amt: 5, src: 'meal' }],
    streak: { count: 3, best: 4, last: '2026-10-26', days: {}, shields: 1 }, quests: { day: '', done: {} }, logs: [{ id: 'l1', name: 'oats' }], saved: [], trig: [], glow: [],
    health: { cycleOn: false, irregular: false, lastPeriod: '', cycleLen: 28, manualPhase: '', weight: '' }, posts: [], reacts: {}, hidden: [], blocked: [], herb: { stage: 2 } });

test('a list or object field saved as null is repaired at load, nothing throws', () => {
    for (const f of ['user', 'logs', 'streak', 'quests', 'glow', 'health', 'ledger', 'saved', 'posts', 'reacts']) {
        const s = base(); s[f] = null;
        let ctx; assert.doesNotThrow(() => { ctx = run(MAIN, 'lowispike.v2', JSON.stringify(s), 'load();'); }, f + ' null must not throw');
        const fr = vm.runInContext('fresh()', ctx);
        const want = Array.isArray(fr[f]) ? 'array' : 'object';
        const got = vm.runInContext('Array.isArray(S[' + JSON.stringify(f) + ']) ? "array" : (S[' + JSON.stringify(f) + '] && typeof S[' + JSON.stringify(f) + ']) || String(S[' + JSON.stringify(f) + '])', ctx);
        assert.strictEqual(got, want, f + ' is a usable ' + want + ' again');
    }
});

test('a field saved with the wrong kind (number for a list, list for an object) is repaired too', () => {
    const s = base(); s.logs = 7; s.health = [1, 2]; s.streak = 'x'; s.user = 0;
    const ctx = run(MAIN, 'lowispike.v2', JSON.stringify(s), 'load();');
    assert.ok(vm.runInContext('Array.isArray(S.logs) && S.health && !Array.isArray(S.health) && S.health.cycleLen === 28 && S.streak.shields === 1 && Array.isArray(S.user.tags)', ctx));
});

test('a whole save that is a number, text or a list loads as a fresh profile', () => {
    for (const raw of ['42', '"hello"', '[1,2]', 'true']) {
        let ctx; assert.doesNotThrow(() => { ctx = run(MAIN, 'lowispike.v2', raw, 'load();'); }, raw);
        assert.ok(vm.runInContext('S && typeof S === "object" && !Array.isArray(S) && S.v === 2 && Array.isArray(S.logs) && S.health.cycleLen === 28', ctx), raw + ' -> fresh');
    }
});

test('a good save keeps every value, extra fields included', () => {
    const s = base(); s.extra = { keep: 1 }; s.health.weight = '70';
    const ctx = run(MAIN, 'lowispike.v2', JSON.stringify(s), 'load();');
    const S = JSON.parse(vm.runInContext('JSON.stringify(S)', ctx));
    assert.strictEqual(S.user.name, 'Ada'); assert.deepStrictEqual(S.logs, [{ id: 'l1', name: 'oats' }]); assert.strictEqual(S.xp, 120);
    assert.strictEqual(S.streak.count, 3); assert.strictEqual(S.health.weight, '70'); assert.deepStrictEqual(S.extra, { keep: 1 }); assert.deepStrictEqual(S.herb, { stage: 2 });
});

test('round 5 save (shuffle, swipe, audio) that is a number or text loads fresh, a null list is repaired', () => {
    for (const raw of ['42', '"hello"', JSON.stringify({ v: 1, liked: null, skipped: [], tinder: 3 })]) {
        let ctx; assert.doesNotThrow(() => { ctx = run(R5SRC, 'lowispike.r5.v1', raw, 'r5load();'); }, raw);
        assert.ok(vm.runInContext('R5 && typeof R5 === "object" && Array.isArray(R5.liked) && Array.isArray(R5.tinder) && R5.notify === true', ctx), raw);
    }
});
