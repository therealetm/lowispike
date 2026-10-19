/* Oct 19, 2026 (E-man, voice message): "Ich habe Pop-up. Zack, Mahlzeit-Eintrag." Log meal pops up Breakfast, Lunch, Dinner
   "und vielleicht packst du Snacks. Everybody needs snacks." Then write it, scan it or snap it. Meals keep their slot,
   and the usual meal of that slot is one tap away ("du isst jedes Mal die gleiche Paprika"). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const K = require('../spirit-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const js = read('spirit.js'), html = read('index.html'), css = read('scan-screens.css');

test('four slots, and the one that fits the clock is offered first', () => {
    assert.deepStrictEqual(K.SLOTS, ['breakfast', 'lunch', 'dinner', 'snack']);
    const at = h => K.slotFor(new Date(2026, 9, 19, h, 30).getTime());
    assert.strictEqual(at(7), 'breakfast');
    assert.strictEqual(at(10), 'breakfast');
    assert.strictEqual(at(12), 'lunch');
    assert.strictEqual(at(15), 'lunch');
    assert.strictEqual(at(18), 'dinner');
    assert.strictEqual(at(23), 'snack', 'late night is snack time');
    assert.strictEqual(at(2), 'snack');
    assert.strictEqual(K.slotOk('lunch'), 'lunch');
    assert.strictEqual(K.slotOk('brunch'), '');
    assert.strictEqual(K.slotOk(undefined), '');
});

test('one-tap re-log: this slot\'s own meals first, no duplicates, then the rest', () => {
    const logs = [
        { t: 'Paprika', slot: 'snack' }, { t: 'Oats', slot: 'breakfast' }, { t: 'Pasta', slot: 'dinner' },
        { t: 'Apple' }, { t: 'oats', slot: 'breakfast' }, { t: 'Salad', slot: 'lunch' }
    ];
    const b = K.slotRecent(logs, 'breakfast').map(l => l.t);
    assert.strictEqual(b[0], 'oats', 'newest breakfast first');
    assert.strictEqual(b.filter(x => x.toLowerCase() === 'oats').length, 1, 'same food once');
    assert.ok(b.includes('Salad'), 'other meals still follow');
    const s = K.slotRecent(logs, 'snack').map(l => l.t);
    assert.strictEqual(s[0], 'Paprika', 'snacks: own snacks first');
    assert.ok(s.includes('Pasta'), 'then the rest, so the Snacks slot is never empty on day one');
    assert.ok(K.slotRecent(logs, '', 3).length === 3, 'no slot = plain recent list');
    assert.deepStrictEqual(K.slotRecent(null, 'lunch'), []);
});

test('Log meal opens the slot picker first, then the slot sheet with Write / Scan / Snap', () => {
    assert.match(js, /if \(quick && K\.slotOk && !K\.slotOk\(slot\)\) \{\s*slotPicker\(\);\s*return;/, 'no slot yet = picker');
    assert.match(js, /meal: \(\) => mealForm\(\)/, 'every Log meal entry (Fuel orb, Meals bubble, quest) goes through mealForm');
    const pick = js.slice(js.indexOf('function slotPicker()'), js.indexOf('function slotPicker()') + 1500);
    assert.match(pick, /data-sp="slot" data-slot="/);
    assert.match(pick, /s === now \? ' now'/, 'the slot for this time of day is marked');
    assert.match(js, /else if \(a === 'slot'\) mealForm\(null, null, b\.dataset\.slot\)/);
    assert.match(js, /else if \(a === 'slotPick'\) slotPicker\(\)/, 'Change goes back to the four');
    const how = js.slice(js.indexOf('const how = mealSlot'), js.indexOf('const html = how +'));
    assert.match(how, /data-sp="slotWrite"[\s\S]*data-sp="scan"[\s\S]*data-sp="photo"/, 'write, scan, snap in that order');
    assert.match(js, /esc\(tr\(mealSlot \? 'slotRecent' : 'recent'\)\)/);
    assert.match(js, /V\.mealDup\(\{t: l\.t \|\| l\.n, code: l\.code, slot: mealSlot\}\)/, 'a tick only for this slot');
});

test('slot strings in English, German and Spanish', () => {
    for (const k of ['slotQ', 'breakfast', 'lunch', 'dinner', 'snack', 'slotNow', 'slotDone', 'slotChange', 'slotHow', 'slotWrite', 'slotScan', 'slotSnap', 'slotRecent']) {
        const m = js.match(new RegExp('\\n\\s+' + k + ": \\[('[^']*'), ('[^']*'), ('[^']*')\\]"));
        assert.ok(m, k + ' has three languages');
    }
    assert.match(js, /breakfast: \['Breakfast', 'Frühstück', 'Desayuno'\]/);
    assert.match(js, /dinner: \['Dinner', 'Abendessen', 'Cena'\]/);
});

test('meals are saved with their slot, Scan and Snap included (the slot picked in the last 10 minutes)', () => {
    assert.match(js, /if \(mealSlot\) seed\.slot = mealSlot;/, 'one-tap and typed meals');
    assert.match(js, /const fs = pendingSlot\(\);\s*if \(fs && !form\.dataset\.edit\) seed\.slot = fs;/, 'Snap food and edited meals');
    assert.match(js, /window\.LowiMealSlot = mealSlot \? \{ slot: mealSlot, at: Date\.now\(\) \} : null;/);
    assert.match(html, /logMeal\(data\)\{\n    \{const sl=this\.mealSlot\(data\);/);
    assert.match(html, /if\(data\.slot\)log\.slot=data\.slot;/);
    // the real mealSlot() from index.html
    const src = html.match(/  mealSlot\(data\)\{([^\n]*)\},\n/)[1];
    const W = { LowiMealSlot: null };
    const fn = new Function('window', 'data', src);
    assert.strictEqual(fn(W, { slot: 'dinner' }), 'dinner');
    assert.strictEqual(fn(W, { slot: 'brunch' }), '');
    W.LowiMealSlot = { slot: 'breakfast', at: Date.now() - 60000 };
    assert.strictEqual(fn(W, {}), 'breakfast', 'barcode scan right after picking Breakfast');
    W.LowiMealSlot = { slot: 'breakfast', at: Date.now() - 11 * 60000 };
    assert.strictEqual(fn(W, {}), '', 'an old pick does not stick');
});

test('the same food in another slot today is a new meal, not a duplicate', () => {
    const m = html.match(/  mealDup\(data\)\{([^\n]*)\n    \/\*[^\n]*\*\/\n    (return[^\n]*)\},/);
    assert.ok(m, 'mealDup found');
    const day = '2026-10-19';
    const mk = logs => new Function('S', 'today', 'data', m[1] + m[2]).bind({ mealKey: t => String(t || '').trim().toLowerCase() });
    const S = { logs: [{ day, t: 'Paprika', slot: 'snack' }, { day, t: 'Toast' }] };
    const dup = d => mk()(S, () => day, d);
    assert.ok(dup({ t: 'Paprika', slot: 'snack' }), 'twice as a snack = duplicate');
    assert.strictEqual(dup({ t: 'Paprika', slot: 'dinner' }), null, 'snack, then at dinner = fine');
    assert.ok(dup({ t: 'Paprika' }), 'no slot = any slot');
    assert.ok(dup({ t: 'Toast', slot: 'breakfast' }), 'an old log without a slot still blocks');
});

test('the four tiles pop in, are thumb-sized, and calm down with Reduce Motion', () => {
    assert.match(css, /\.sp-slots \{ display: grid; grid-template-columns: 1fr 1fr;/);
    assert.match(css, /\.sp-slot \{[^}]*min-height: 112px;[^}]*animation: spSlotIn/);
    assert.match(css, /\.sp-how \{[^}]*min-height: 76px;/);
    assert.match(css, /prefers-reduced-motion: reduce\) \{ html:root body \.r2-ov\.ss-sheet :is\(\.sp-slot, \.sp-how\) \{ animation: none;/);
});
