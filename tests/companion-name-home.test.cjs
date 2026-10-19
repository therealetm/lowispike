'use strict';
/* BH-006 (Oct 19 2026): Home called Misty by the old herb identity name ("Moss Leaf", made from the star sign) in the Misty hub title,
   the energy card ("Moss Leaf's energy"), the Misty card and the name under her bubble. The name shown must be the user's own
   companion's name, else a name the user typed, else "Misty". Never the herb auto name. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const FILES = ['world-home.js', 'misty-hub.js', 'misty-scale.js', 'spirit.js'];
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function helper(f) {
    const line = src(f).split('\n').find(l => /function companionName\(\)/.test(l));
    assert.ok(line, f + ' has a companionName() helper');
    return line.trim();
}
function run(f, win) {
    const ctx = vm.createContext({ window: win, globalThis: win, String });
    return vm.runInContext('(' + helper(f).replace(/^function companionName\(\)/, 'function ()') + ')()', ctx);
}
const herb = (prefsName, herbName) => ({
    current: () => ({ p: { name: prefsName || '' }, m: {} }),
    readPrefs: () => ({ name: prefsName || '' }),
    name: (p) => p.name || herbName || 'Moss Leaf'
});
const ident = { autoName: () => 'Moss Leaf' };

for (const f of FILES) {
    test(f + ': no own companion, nothing typed -> "Misty", never the herb auto name', () => {
        const win = { LowiHerbTamagotchi: herb(''), LowiHerbIdentity: ident, LowiBirthCompanion: { has: () => false, get: () => ({ misty: true, name: 'Misty' }) }, LowiR2: { S: () => ({ herb: {} }) } };
        assert.strictEqual(run(f, win), 'Misty');
    });
    test(f + ': own companion brought to life -> its name', () => {
        const win = { LowiHerbTamagotchi: herb(''), LowiHerbIdentity: ident, LowiBirthCompanion: { has: () => true, get: () => ({ name: '  Zorbo ' }) }, LowiR2: { S: () => ({}) } };
        assert.strictEqual(run(f, win), 'Zorbo');
    });
    test(f + ': a name the user typed (prefs or old save) is kept; a stored copy of the auto name is not', () => {
        const B = { has: () => false, get: () => ({ misty: true, name: 'Misty' }) };
        assert.strictEqual(run(f, { LowiHerbTamagotchi: herb('Bubbles'), LowiHerbIdentity: ident, LowiBirthCompanion: B, LowiR2: { S: () => ({}) } }), 'Bubbles');
        assert.strictEqual(run(f, { LowiHerbTamagotchi: herb(''), LowiHerbIdentity: ident, LowiBirthCompanion: B, LowiR2: { S: () => ({ herb: { name: 'Pip' } }) } }), 'Pip');
        assert.strictEqual(run(f, { LowiHerbTamagotchi: herb('Moss Leaf'), LowiHerbIdentity: ident, LowiBirthCompanion: B, LowiR2: { S: () => ({}) } }), 'Misty');
    });
    test(f + ': nothing loaded or everything throws -> "Misty"', () => {
        assert.strictEqual(run(f, {}), 'Misty');
        const boom = () => { throw new Error('x'); };
        assert.strictEqual(run(f, { LowiHerbTamagotchi: { readPrefs: boom }, LowiBirthCompanion: { has: boom }, LowiR2: { S: boom }, LowiHerbIdentity: { autoName: boom } }), 'Misty');
    });
    test(f + ': the herb identity name is not used for display any more', () => {
        const s = src(f);
        assert.ok(!/LowiHerbTamagotchi\.name\(|\bt\.name\(c\.p|\bT\.name\(p, m\)/.test(s), f + ' still reads LowiHerbTamagotchi.name()');
    });
}
