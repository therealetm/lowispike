'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const C = require('../herb-identity-core.js'), K = require('../spirit-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('star sign comes from the birthday and the type is normalised', () => {
    const r = C.resolve({bday: '1994-03-10', types: ['infj']});
    assert.equal(r.sign, 'Pisces');
    assert.equal(r.type, 'INFJ');
    assert.equal(r.complete, true);
    assert.equal(C.resolve({bday: '1990-08-01'}).sign, 'Leo');
    assert.equal(C.normType('xyzw'), '');
    assert.equal(C.normSign('pisces'), 'Pisces');
});

test('the name is built from star sign + type, with a friendly fallback', () => {
    assert.equal(C.autoName('Pisces', 'INFJ'), C.FIRST.Pisces + ' ' + C.SECOND.INFJ);
    assert.notEqual(C.autoName('Leo', 'ESTP'), C.autoName('Leo', 'INFJ'));
    assert.equal(C.autoName('', ''), C.FALLBACK_FIRST + ' ' + C.FALLBACK_SECOND);
    for (const s of C.SIGN_NAMES) assert(C.FIRST[s], 'first name for ' + s);
    for (const t of C.TYPES) assert(C.SECOND[t], 'second name for ' + t);
});

test('spirit-core personalityName delegates to the identity rules', () => {
    assert.equal(K.personalityName({bday: '1994-03-10', mbti: 'INFJ'}, {}), C.autoName('Pisces', 'INFJ'));
    assert.equal(K.personalityName({bday: '1994-03-10'}, {personality: 'ENTP'}), C.autoName('Pisces', 'ENTP'));
});

test('the name stays stable until sign or type changes', () => {
    const a = C.stableName(null, 'Pisces', 'INFJ');
    assert.equal(a.changed, true);
    const b = C.stableName(a.store, 'Pisces', 'INFJ');
    assert.equal(b.changed, false);
    assert.equal(b.name, a.name);
    assert.equal(C.stableName(a.store, 'Pisces', 'ENFP').changed, true);
});

function runtime({r5 = {mbti: ''}, user = {bday: '1994-03-10'}, prefs = {}} = {}) {
    const store = {}, S = {user, herb: {name: '', personalize: true}}, saved = {prefs: 0, state: 0};
    const el = () => ({style: {setProperty() {}, removeProperty() {}}, classList: {add() {}, remove() {}}, dataset: {}, appendChild() {}});
    const root = el();
    const D = {documentElement: root, head: el(), hidden: false, addEventListener() {}, getElementById: () => null, querySelector: () => null, createElement: el};
    const win = {
        document: D,
        LowiHerbIdentityCore: C,
        LowiFood: {state: () => r5},
        LowiR2: {S: () => S, save: () => saved.state++},
        LowiHerbTamagotchi: {readPrefs: () => prefs, savePrefs: p => { Object.assign(prefs, p); saved.prefs++; }},
        addEventListener() {}
    };
    win.window = win;
    const ctx = vm.createContext(Object.assign(win, {
        localStorage: {getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }},
        setInterval: () => 0, clearInterval() {}, setTimeout: f => f(), console
    }));
    vm.runInContext(read('herb-identity.js'), ctx);
    return {H: win.LowiHerbIdentity, r5, S, prefs, store, root};
}

test('the mini-test type is saved to the profile (R5.mbti, synced) and to the herb', () => {
    const x = runtime();
    assert.equal(x.H.setType('enfp'), 'ENFP');
    assert.equal(x.r5.mbti, 'ENFP', 'profile type in memory');
    assert.equal(JSON.parse(x.store['lowispike.r5.v1']).mbti, 'ENFP', 'profile type persisted (localStorage write triggers cloud pushProfile)');
    assert.equal(x.S.user.mbti, 'ENFP');
    assert.equal(x.prefs.personality, 'ENFP');
    const id = x.H.current();
    assert.equal(id.sign, 'Pisces');
    assert.equal(id.type, 'ENFP');
    assert.equal(id.name, C.autoName('Pisces', 'ENFP'));
    assert.equal(x.root.dataset.hiType, 'ENFP');
});

test('a type picked in Profile wins over an old herb quiz type', () => {
    const x = runtime({r5: {mbti: 'INTJ'}, user: {bday: '1990-08-01', mbti: 'ESFP'}, prefs: {personality: 'ESFP'}});
    const id = x.H.current();
    assert.equal(id.type, 'INTJ');
    assert.equal(x.S.user.mbti, 'INTJ');
    assert.equal(x.prefs.personality, 'INTJ');
    assert.equal(id.name, C.autoName('Leo', 'INTJ'));
});

test('a custom name is kept, and resetting goes back to the automatic one', () => {
    const x = runtime({r5: {mbti: 'INFJ'}});
    assert.equal(x.H.setCustomName('Basil'), 'Basil');
    assert.equal(x.H.current().name, 'Basil');
    assert.equal(x.H.current().custom, 'Basil');
    x.H.resetName();
    assert.equal(x.H.current().name, C.autoName('Pisces', 'INFJ'));
    assert.equal(x.H.setCustomName(C.autoName('Pisces', 'INFJ')), '', 'typing the automatic name is not a custom name');
});

test('spirit.js quiz answer saves through the identity and the files are wired in', () => {
    const sp = read('spirit.js');
    assert.match(sp, /LowiHerbIdentity\.setType\(quizType\)/);
    const ui = read('apple-ui.js'), sw = read('sw.js');
    assert(ui.indexOf('herb-identity-core.js') > -1 && ui.indexOf('herb-identity-core.js') < ui.indexOf("'spirit-core.js'"));
    assert(ui.indexOf('herb-identity.js') < ui.indexOf("'spirit.js'"));
    for (const f of ['herb-identity-core.js', 'herb-identity.js', 'herb-identity.css']) assert(sw.includes('"' + f + '"'), f + ' cached');
});
