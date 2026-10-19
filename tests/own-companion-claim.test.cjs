'use strict';
/* Oct 19 2026: "the companion on my friend's phone is also called Misty". Accounts made before the birthday reveal
   (Oct 16), and every account whose record companion.js overwrote before build 20261019-143513, only had the standard
   Misty (one fixed name, one fixed look). Now:
   - companion-birth-core.js takes an optional personality type as a third input (seed unchanged without one),
   - companion-birth.js has a claim step (claim / needsClaim / one post-update prompt) for those accounts,
   - companion.js grows the evolution from the user's own companion (element, colours, seed, type), so two companions
     no longer evolve the same way. Misty's evolution is unchanged. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const C = require('../companion-birth-core.js');
const CC = require('../companion-core.js');

test('without a personality type the seed, look and name are exactly what they were before', () => {
    const old = (b, t) => C.fnv(C.validDate(b) + '|' + C.validTime(t));
    for (const [b, t] of [['1997-10-19', ''], ['1990-05-12', ''], ['1997-10-27', '07:45'], ['2001-02-28', '23:59']]) {
        assert.strictEqual(C.seedOf(b, t), old(b, t));
        assert.strictEqual(C.seedOf(b, t, ''), old(b, t));
        assert.strictEqual(C.seedOf(b, t, 'nope'), old(b, t), 'an unknown type is ignored');
        const a = C.generate({ bday: b, btime: t }), z = C.generate({ bday: b, btime: t, mbti: '' });
        assert.strictEqual(a.seed, old(b, t)); assert.strictEqual(a.name, z.name); assert.deepStrictEqual(a.look, z.look);
        assert.strictEqual(a.mbti, '');
    }
    /* the live check of build 20261019-155424 got "Kreb Themis" for this birthday: still the same */
    assert.strictEqual(C.generate({ bday: '1997-10-19', btime: '' }).seed, old('1997-10-19', ''));
});

test('a personality type is a real input: same birthday, 16 types, 16 different companions', () => {
    assert.strictEqual(C.TYPES.length, 16);
    assert.strictEqual(C.validType('infj'), 'INFJ'); assert.strictEqual(C.validType(' ENTP-A '), 'ENTP'); assert.strictEqual(C.validType('XXXX'), '');
    const seeds = new Set(), looks = new Set(), names = new Set();
    for (const m of C.TYPES) { const c = C.generate({ bday: '1995-06-01', mbti: m }); assert.strictEqual(c.mbti, m); seeds.add(c.seed); looks.add(JSON.stringify(c.look)); names.add(c.name); }
    assert.strictEqual(seeds.size, 16); assert.strictEqual(looks.size, 16); assert.ok(names.size >= 14, 'names mostly differ: ' + names.size);
    /* deterministic: same inputs on another phone give the same companion */
    assert.deepStrictEqual(C.generate({ bday: '1995-06-01', mbti: 'INTJ' }).look, C.generate({ bday: '1995-06-01', btime: '', mbti: 'intj' }).look);
});

test('evolution: the own companion grows from its own seed, Misty keeps the old fixed body language', () => {
    const prof = { sign: { element: 'water' }, palette: { a: '#123456', b: '#abcdef' } };
    const misty = CC.genome(prof, 3, 999);
    assert.deepStrictEqual([misty.sh, misty.sy, misty.pt, misty.au], ['soft', 'even', 'none', 'mid']);
    assert.deepStrictEqual(CC.genome(prof, 3, 999, false), misty);
    const combos = new Set();
    for (let s = 0; s < 64; s++) { const g = CC.genome(prof, 3, s, true); combos.add([g.sh, g.sy, g.pt, g.au].join()); }
    assert.strictEqual(combos.size, 36, 'own companions spread over every body-language combination');
    /* a type still wins over the seed */
    const t = CC.genome(Object.assign({ personality: 'ENTJ' }, prof), 3, 5, true);
    assert.deepStrictEqual([t.sh, t.sy, t.pt, t.au], ['edge', 'even', 'star', 'wide']);
    /* the look code friends receive round-trips the filled genome */
    const g = CC.genome(prof, 4, 37, true), back = CC.decode(CC.encode(g));
    assert.deepStrictEqual([back.sh, back.sy, back.pt, back.au, back.sd], [g.sh, g.sy, g.pt, g.au, g.sd]);
});

test('companion.js reads evolution from the own birth companion (element, colours, seed, type)', () => {
    const s = src('companion.js');
    const pick = re => { const m = s.match(re); assert.ok(m, 'companion.js: ' + re); return m[0]; };
    const code = [pick(/function ownBirth\(\) \{[^\n]+/), pick(/function myGenome\(m\) \{[\s\S]*?\n    \}/), 'myGenome'].join('\n');
    const mk = (B) => vm.runInContext(code, vm.createContext({ W: { LowiBirthCompanion: B }, C: CC, model: () => null, seed: () => 4242, Object, Math }));
    const m = { index: 3, profile: { sign: { element: 'fire', key: 'aries' }, palette: { a: '#ff0000', b: '#ff8800' }, personality: '' } };
    const misty = mk({ has: () => false })(m);
    assert.strictEqual(misty.el, 'fire'); assert.strictEqual(misty.sd, 4242); assert.strictEqual(misty.pt, 'none');
    const c = C.generate({ bday: '1997-02-03', mbti: 'ISFP' });
    const own = mk({ has: () => true, get: () => c })(m);
    assert.strictEqual(own.el, c.element); assert.strictEqual(own.a, c.palette.a); assert.strictEqual(own.b, c.palette.b);
    assert.strictEqual(own.sd, c.seed % 65536); assert.strictEqual(own.hasType, true); assert.strictEqual(own.pt, 'band'); assert.strictEqual(own.au, 'close');
});

/* ---------- companion-birth.js claim step in a tiny fake DOM ---------- */
function fakeStorage(init) { const m = new Map(Object.entries(init || {})); return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), key: i => [...m.keys()][i], get length() { return m.size; } }; }
function loadBirth(ls, state) {
    const listeners = {}, body = { children: [], appendChild(e) { this.children.push(e); e.isConnected = true; }, };
    const el = (tag) => ({ tag, attrs: {}, classList: { s: new Set(), add(c) { this.s.add(c); }, remove(c) { this.s.delete(c); }, contains(c) { return this.s.has(c); } }, style: {}, set className(v) { v.split(' ').forEach(c => c && this.classList.add(c)); }, setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k] == null ? null : this.attrs[k]; }, addEventListener() { }, querySelector() { return null; }, querySelectorAll() { return []; }, remove() { body.children = body.children.filter(x => x !== this); }, innerHTML: '' });
    const D = { readyState: 'loading', visibilityState: 'visible', documentElement: { lang: 'en', classList: { contains: () => false } }, head: { appendChild() { } }, body,
        getElementById: id => body.children.find(e => e.id === id) || null, querySelector: () => null, querySelectorAll: () => [], createElement: el, addEventListener: (k, f) => { (listeners[k] = listeners[k] || []).push(f); } };
    const win = { document: D, localStorage: ls, LowiBirthCompanionCore: C, LowiR2: { S: () => state }, addEventListener() { }, dispatchEvent() { }, CustomEvent: function () { }, __lcNoPrompt: true,
        requestAnimationFrame: f => 0, setTimeout: () => 0, clearTimeout() { }, MutationObserver: function () { this.observe = () => { }; }, getComputedStyle: () => ({ display: 'block', visibility: 'visible', position: 'fixed' }), matchMedia: () => ({ matches: false }) };
    win.window = win;
    const ctx = vm.createContext(Object.assign(win, { JSON, Object, Array, Date, Math, String, Set, Map, Error, encodeURIComponent, console }));
    vm.runInContext(src('companion-birth.js'), ctx);
    return { B: win.LowiBirthCompanion, D, body };
}
const KEY = 'lowispike.companion.v1';

test('needsClaim: a set-up account with no companion of its own (or only the old overwritten prefs) needs one', () => {
    const st = { setupDone: true, user: { bday: '1994-03-08' } };
    assert.strictEqual(loadBirth(fakeStorage({}), st).B.needsClaim(), true);
    /* 422 of 440 server backups hold the old Community prefs in the companion key: still Misty, still needs a claim */
    assert.strictEqual(loadBirth(fakeStorage({ [KEY]: '{"share":true,"traits":true,"born":1760000000000}' }), st).B.needsClaim(), true);
    assert.strictEqual(loadBirth(fakeStorage({ [KEY]: JSON.stringify({ v: 1, bday: '1994-03-08', btime: '', n: 0, name: 'Zorbo' }) }), st).B.needsClaim(), false);
    /* a brand-new account mid-onboarding gets the onboarding reveal instead */
    assert.strictEqual(loadBirth(fakeStorage({}), { setupDone: false, user: {} }).B.needsClaim(), false);
});

test('claiming saves only the companion (with its type) and keeps points, streaks and history', () => {
    const state = { setupDone: true, xp: 1234, streak: 9, ledger: [{ ts: 1 }], user: { bday: '1994-03-08', name: 'Joe' } };
    const before = JSON.stringify(state);
    const ls = fakeStorage({ 'lowispike.v2': before, [KEY]: '{"share":true,"traits":true,"born":5}' });
    const { B } = loadBirth(ls, state);
    const c = C.generate({ bday: '1994-03-08', mbti: 'ENFP' });
    B.save(c);
    const rec = JSON.parse(ls.getItem(KEY));
    assert.deepStrictEqual([rec.bday, rec.btime, rec.mbti, rec.name], ['1994-03-08', '', 'ENFP', c.name]);
    assert.strictEqual(B.has(), true); assert.strictEqual(B.needsClaim(), false);
    const g = B.get(); assert.strictEqual(g.misty, undefined); assert.strictEqual(g.mbti, 'ENFP'); assert.strictEqual(g.seed, c.seed);
    assert.strictEqual(JSON.stringify(state), before, 'progress untouched'); assert.strictEqual(ls.getItem('lowispike.v2'), before);
});

test('claim step: opens as #lcOv (aria-modal) with birthday prefilled and the type optional; asked once after the update', () => {
    const ls = fakeStorage({ 'lowispike.r5.v1': JSON.stringify({ mbti: 'istj' }) });
    const { B, body } = loadBirth(ls, { setupDone: true, user: { bday: '1994-03-08' } });
    assert.strictEqual(B.prompted(), false);
    const ov = B.claim({ from: 'tutorial' });
    assert.strictEqual(ov.id, 'lcOv'); assert.strictEqual(ov.getAttribute('aria-modal'), 'true'); assert.strictEqual(ov.getAttribute('role'), 'dialog');
    assert.match(ov.innerHTML, /id="lcB" value="1994-03-08"/);
    assert.match(ov.innerHTML, /<option value="">Not sure \/ skip<\/option>/);
    assert.match(ov.innerHTML, /<option value="ISTJ" selected>ISTJ/, 'prefilled from the Community personality type');
    assert.match(ov.innerHTML, /Your points, streaks and history all stay/);
    assert.match(ov.innerHTML, /data-lcx>Later</);
    assert.ok(B.prompted(), 'opening it from the tutorial counts as the one-time prompt');
    assert.strictEqual(B.maybePrompt(), false, 'never asked twice');
    assert.strictEqual(body.children.filter(e => e.id === 'lcOv').length, 1);
    /* Profile opens the same step, without the intro */
    const p = B.openCreator(); assert.strictEqual(p.getAttribute('data-from'), 'profile'); assert.doesNotMatch(p.innerHTML, /Later</);
    assert.strictEqual(body.children.filter(e => e.id === 'lcOv').length, 1);
});

test('claim step is translated (en, de, es) and the prompt never opens over another dialog', () => {
    const s = src('companion-birth.js');
    for (const w of ['Claim the companion that is only yours', 'Hol dir den Begleiter, der nur dir geh\\u00f6rt', 'Reclama la compa\\u00f1\\u00eda que es solo tuya']) assert.ok(s.includes(w), w);
    assert.match(s, /Array\.from\(D\.querySelectorAll\('\[aria-modal="true"\]'\)\)\.some\(vis\)/);
    for (const sel of ['#g1Ob:not(.out)', '#drDay', '#sheetwrap.open']) assert.ok(s.includes("'" + sel + "'"), sel);
    assert.match(s, /LowiTutorial/);
    /* the Day card steps aside for the claim step too */
    assert.ok(require('../daily-ritual.js').BUSY.includes('#lcOv'));
});

test('Home keeps the earlier choices: no smile and no glow ring come from this change', () => {
    const cw = src('cell-world.js');
    assert.doesNotMatch(src('companion-birth.js'), /cell-world|cw-own/);
    assert.ok(cw.length > 0);
});
