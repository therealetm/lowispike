'use strict';
/* BH-007 (Oct 19 2026): the user's own companion (companion-birth.js: {v,bday,btime,n,name} in 'lowispike.companion.v1') was wiped
   within seconds of being brought to life: companion.js kept its Community prefs {share,traits,born} in the SAME key, saw no `born`
   and wrote {share,traits,born} over it; community-chat.js did the same when the share toggle was saved. After that the app
   fell back to Misty and the name the user picked was gone (and the wiped key went to the cloud backup).
   Now the prefs live in 'lowispike.companionprefs.v1'; only companion-birth.js writes 'lowispike.companion.v1'. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const BIRTH = 'lowispike.companion.v1', PREFS = 'lowispike.companionprefs.v1';
const J = o => JSON.parse(JSON.stringify(o)); /* vm objects have their own prototypes */
const birthRec = () => JSON.stringify({ v: 1, bday: '1990-01-01', btime: '', n: 0, name: 'Zorbo', created: 1 });

function fakeStorage(init) {
    const m = new Map(Object.entries(init || {}));
    return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}
/* companion.js: lift its storage helpers + prefs()/savePrefs() out of the IIFE and run them against a fake localStorage */
function companionPrefs(ls) {
    const s = src('companion.js');
    const pick = re => { const m = s.match(re); assert.ok(m, 'companion.js: ' + re); return m[0]; };
    const code = [
        pick(/const KEY = [^\n]+/), pick(/const read = [^\n]+/), pick(/const write = [^\n]+/),
        pick(/function prefs\(\) \{[\s\S]*?\n    \}/), pick(/function savePrefs\(p\) \{[^\n]+/),
        '({ prefs, savePrefs })'
    ].join('\n');
    return vm.runInContext(code, vm.createContext({ localStorage: ls, JSON }));
}
function chatPrefs(ls) {
    const line = src('community-chat.js').split('\n').find(l => l.startsWith('function matePref()'));
    assert.ok(line, 'community-chat.js has matePref()');
    return vm.runInContext(line + '\n;matePref', vm.createContext({ localStorage: ls, JSON }));
}

test('companion.js seeding its prefs (no `born` yet) leaves the own companion record untouched', () => {
    const ls = fakeStorage({ [BIRTH]: birthRec() });
    const C = companionPrefs(ls), p = C.prefs();
    assert.strictEqual(p.born, 0); p.born = 123; C.savePrefs(p);
    assert.strictEqual(ls.getItem(BIRTH), birthRec(), 'birth record must survive');
    assert.deepStrictEqual(JSON.parse(ls.getItem(PREFS)), { share: true, traits: true, born: 123 });
    assert.strictEqual(C.prefs().born, 123);
});

test('the share / traits toggles save to their own key, never over the birth record', () => {
    const ls = fakeStorage({ [BIRTH]: birthRec() });
    const C = companionPrefs(ls);
    C.savePrefs({ share: false, traits: false, born: 5 });
    assert.strictEqual(ls.getItem(BIRTH), birthRec());
    assert.deepStrictEqual(J(C.prefs()), { share: false, traits: false, born: 5 });
});

test('old prefs stored in the shared key are carried over once; a birth record is never read as prefs', () => {
    const old = fakeStorage({ [BIRTH]: JSON.stringify({ share: false, traits: true, born: 77 }) });
    assert.deepStrictEqual(J(companionPrefs(old).prefs()), { share: false, traits: true, born: 77 });
    assert.deepStrictEqual(J(chatPrefs(old)()), { share: false, traits: true, born: 77 });
    const own = fakeStorage({ [BIRTH]: birthRec() });
    assert.deepStrictEqual(J(companionPrefs(own).prefs()), { share: true, traits: true, born: 0 });
    assert.deepStrictEqual(J(chatPrefs(own)()), { share: true, traits: true, born: 0 });
    const both = fakeStorage({ [BIRTH]: birthRec(), [PREFS]: JSON.stringify({ share: false, traits: false, born: 9 }) });
    assert.deepStrictEqual(J(chatPrefs(both)()), { share: false, traits: false, born: 9 });
});

test('only companion-birth.js ever writes lowispike.companion.v1', () => {
    const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && f !== 'companion-birth.js');
    const bad = [];
    for (const f of files) {
        const s = src(f);
        if (/setItem\(\s*['"]lowispike\.companion\.v1['"]/.test(s)) bad.push(f + ' setItem');
        const k = s.match(/const\s+(\w+)\s*=\s*['"]lowispike\.companion\.v1['"]/);
        if (k && new RegExp('write\\(\\s*' + k[1] + '\\b|setItem\\(\\s*' + k[1] + '\\b').test(s)) bad.push(f + ' writes via ' + k[1]);
    }
    assert.deepStrictEqual(bad, []);
});
