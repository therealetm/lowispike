// Oct 21, 2026 Scan / Fuel / Gap (E-man): "I took a picture of my food and logged it, but my fasting timer kept running."
// Scan identifies a product, Fuel logs a meal (photo, words, recent, or the Scan button inside Log meal), Gap is a passive view of the
// time since the last meal. Any meal logged in Fuel ends a running fast once, at the time it was eaten.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html'), sw = read('sw.js'), blooms = read('home-blooms-v2.js'), gap = read('gap-view.js'), spirit = read('spirit.js');

test('the new files load and are cached for offline use', () => {
    for (const f of ['gap-view.js', 'gap-view.css']) {
        assert.ok(new RegExp(f.replace('.', '\\.') + '\\?v=\\d{8}-\\d{6}').test(html), f + ' is loaded by index.html with the build tag');
        assert.ok(sw.includes('"' + f + '"'), f + ' is in the service worker list');
    }
});

test('Gap is passive: tapping it opens the Gap view, no "I just ate" button on Home', () => {
    assert.ok(/if \(kind === 'gap'\) \{[^}]*LowiGapView\.open\(\)/.test(blooms));
    assert.ok(!/label: T\('I just ate'/.test(blooms), 'the old Gap bloom action is gone');
    assert.ok(!/LowiFastStop\.end|\.end\(Date\.now\(\)/.test(gap), 'the Gap view never ends anything itself');
    assert.ok(/k === 'log'[^\n]*LowiSpirit\.meal\(\)/.test(gap), 'its one meal button opens Fuel');
    assert.ok(/meal: \(\) => mealForm\(\)/.test(spirit), 'Fuel (LowiSpirit.meal) exists');
});

test('Gap view model: time since the last meal, markers lit by hours, nothing without a meal', () => {
    const store = new Map();
    const start = Date.now() - 13 * 36e5;
    store.set('lowi_fast_v1', JSON.stringify({ last: start, hist: [] }));
    const W = {
        localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem() {}, removeItem() {} },
        LowiFastStop: { startOf: s => +s.last || 0, _st: () => JSON.parse(store.get('lowi_fast_v1')), points: h => ({ x: Math.round(h * 2) }) },
        LowiFast: { stagesFull: () => [4, 8, 12, 16, 18, 24].map((h, i) => ({ id: 's' + i, h, n: 'M' + h, t: '', x: '' })) },
        addEventListener() {}
    };
    delete require.cache[require.resolve('../gap-view.js')];
    const saved = globalThis.window; globalThis.window = W;
    let G; try { G = require('../gap-view.js'); } finally { if (saved === undefined) delete globalThis.window; else globalThis.window = saved; }
    const m = G.model(Date.now());
    assert.strictEqual(m.start, start, 'reads the last meal time');
    assert.ok(Math.abs(m.hours - 13) < 0.1, 'about 13 h since the meal');
    assert.strictEqual(m.cur, 2, 'the 4, 8 and 12 h markers are lit');
    assert.strictEqual(m.next.h, 16, 'next marker is 16 h');
    assert.ok(m.fill > 0 && m.fill <= 1);
});

test('Scan only identifies: Barcode + Deep analyze; "I ate this" only when the camera came from Log meal', () => {
    assert.ok(/act\("scan", IC\.bc, true\) \+ '<\/div>'/.test(html));
    assert.ok(/function scanForMeal\(\)\{ return !!window\.LowiScanMeal/.test(html));
    assert.ok(/const logging = scanForMeal\(\);/.test(html));
    assert.ok(/window\.LowiScanIntent = \{ meal: true, at: Date\.now\(\) \}/.test(spirit), 'Log meal\'s own Scan button sets the intent');
});

test('Deep analyze is a one-tap link to the custom GPT, never an in-app sheet (Oct 21 evening)', () => {
    assert.ok(!fs.existsSync(path.join(root, 'deep-analyze.js')) && !fs.existsSync(path.join(root, 'deep-analyze.css')), 'the in-app photo sheet is gone');
    assert.ok(!/deep-analyze|LowiDeep|deepOpen|data-b3="deepnf"/.test(html), 'nothing opens the old sheet');
    assert.ok(!sw.includes('deep-analyze'), 'not cached any more');
    assert.ok(/function deepLink\(cls, attrs, title, sub\)\{\n  return '<a class="' \+ cls \+ '" ' \+ attrs \+ ' href="' \+ esc\(deepURL\(\)\) \+ '" target="_blank" rel="noopener">'/.test(html), 'a real link that opens outside the app');
    assert.ok(/deepLink\("b3-nfdeep", 'id="b3NfDeep"', t\("deepNf"\), t\("deepNfS"\)\)/.test(html), 'the not-found card uses the same link');
});

test('Fuel\'s "When did you eat?" backdates the meal, and that time is what ends the fast', () => {
    assert.ok(/mc\.from==="gap"\|\|mc\.from==="when"/.test(html));
    assert.ok(/if\(ateSet\)log\.ateSet=1;/.test(html));
    assert.ok(/if \(!d\.ateSet && catchUp\(d\.slot, t\)\) return null;/.test(html), 'a late meal with a picked eating time is not treated as a catch-up guess');
});
