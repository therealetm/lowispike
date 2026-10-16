/* Oct 16: Misty's hints read the existing world signals (no formula of their own); kind copy; she gets lost now and then */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Hn = require('../misty-hints.js');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('hints follow the world: storm, a Move calming it, cleared, low energy, haze, bright', () => {
    const ok = { value: 0.6, tier: 'ok', canTravel: true };
    assert.strictEqual(Hn.pick({ mood: { tier: 'stormy', why: ['food', 'nomove'] }, energy: ok }, 'en').k, 'stormFood');
    assert.strictEqual(Hn.pick({ mood: { tier: 'stormy', why: ['food'] }, energy: ok }, 'en').k, 'stormMoved');
    assert.strictEqual(Hn.pick({ mood: { tier: 'stormy', why: ['products', 'nomove'] }, energy: ok }, 'en').k, 'stormProducts');
    assert.strictEqual(Hn.pick({ mood: { tier: 'clear', why: [] }, prevTier: 'stormy', energy: ok }, 'en').k, 'cleared');
    assert.strictEqual(Hn.pick({ mood: { tier: 'clear' }, energy: { value: 0.3, tier: 'weak', canTravel: false } }, 'en').k, 'weak');
    assert.strictEqual(Hn.pick({ mood: { tier: 'clear' }, energy: { value: 0.3, tier: 'tired' } }, 'en').k, 'tired', 'falls back to LowiSun travel threshold 0.4');
    const hz = Hn.pick({ mood: { tier: 'clear' }, energy: ok, health: { tier: 'murky', empty: false, tip: 'water' } }, 'en');
    assert.strictEqual(hz.k, 'hazy'); assert.ok(/glass of water/.test(hz.text));
    assert.strictEqual(Hn.pick({ mood: { tier: 'clear' }, energy: { value: 0.9, tier: 'thriving', canTravel: true }, health: { tier: 'bright' } }, 'en').k, 'bright');
    assert.strictEqual(Hn.pick({}, 'de').k, 'calm');
});

test('below 0.4 energy she cannot go on an adventure, and the button says why instead', () => {
    assert.strictEqual(Hn.TRAVEL, 0.4);
    assert.strictEqual(Hn.pick({ energy: { value: 0.39 } }).canTravel, false);
    assert.strictEqual(Hn.pick({ energy: { value: 0.4 } }).canTravel, true);
    const adv = read('adventure.js');
    assert.match(adv, /if \(h && !h\.canTravel\) \{ say\(h\.text\)/);
});

test('copy: three languages, kind, game world only, no banned words, no medical claims', () => {
    for (const k of Object.keys(Hn.STR)) assert.strictEqual(Hn.STR[k].length, 3, k);
    const all = JSON.stringify(Hn.STR).toLowerCase();
    for (const w of ['unhealthy', 'ungesund', 'sick', 'krank', 'disease', 'diagnos', 'insulin resist', 'diabet', 'bad', 'schlecht', 'fail', 'shame', 'insulin', 'glucose', 'blood sugar', 'guilt', 'burn'])
        assert.ok(!all.includes(w), w);
});

test('reuses the existing signals, adds no formula, no per-frame loop, no timers in the background', () => {
    const src = read('misty-hints.js').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.match(src, /LowiWorldMood/); assert.match(src, /energyNow\(\)/); assert.match(src, /LowiWorldHealth\.forState\(/); assert.match(src, /'lowi:world-mood'/);
    assert.doesNotMatch(src, /requestAnimationFrame|setInterval/);
    assert.match(src, /onToday\(\)/, 'only speaks while Today is on screen');
    const html = read('index.html');
    assert.ok(html.indexOf('misty-hints.js?v=') > 0 && html.indexOf('misty-hints.js?v=') < html.indexOf('adventure.js?v='));
    assert.ok(/"misty-hints\.js"/.test(read('sw.js')));
});

test('aquarium: now and then she wanders to the far edge, is lost there a while, then comes back', () => {
    const mf = read('misty-flight.js');
    const F = require('../misty-flight.js');
    assert.ok(F.K.LOST >= 4, 'lost for a few seconds, not a blink');
    assert.match(mf, /out\.far = out\.length/);
    assert.match(mf, /W\.LowiMistyHints\.lost\(\)/);
});
