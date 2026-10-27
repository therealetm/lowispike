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

test('Oct 23: Meal or Snack only, the time does the rest; older breakfast / lunch / dinner read as Meal', () => {
    assert.deepStrictEqual(K.SLOTS, ['meal', 'snack']);
    assert.strictEqual(K.slotFor(new Date(2026, 9, 23, 7, 30).getTime()), 'meal');
    assert.strictEqual(K.slotFor(new Date(2026, 9, 23, 23, 30).getTime()), 'meal');
    assert.strictEqual(K.slotOk('meal'), 'meal');
    assert.strictEqual(K.slotOk('snack'), 'snack');
    assert.strictEqual(K.slotOk('lunch'), '', 'old slots are not offered any more');
    assert.strictEqual(K.slotOk(undefined), '');
    for (const o of ['breakfast', 'lunch', 'dinner', 'meal']) assert.strictEqual(K.kind(o), 'meal', o + ' reads as Meal');
    assert.strictEqual(K.kind('snack'), 'snack');
    assert.strictEqual(K.kind(''), '');
});

test('one-tap re-log: this slot\'s own meals first, no duplicates, then the rest', () => {
    const logs = [
        { t: 'Paprika', slot: 'snack' }, { t: 'Oats', slot: 'breakfast' }, { t: 'Pasta', slot: 'dinner' },
        { t: 'Apple' }, { t: 'oats', slot: 'breakfast' }, { t: 'Salad', slot: 'lunch' }
    ];
    const b = K.slotRecent(logs, 'meal').map(l => l.t);
    assert.strictEqual(b[0], 'Salad', 'newest meal first (old lunch reads as Meal)');
    assert.deepStrictEqual(b.slice(0, 3), ['Salad', 'oats', 'Pasta'], 'old breakfast / lunch / dinner are all meals');
    assert.strictEqual(b.filter(x => x.toLowerCase() === 'oats').length, 1, 'same food once');
    assert.ok(b.includes('Paprika'), 'snacks still follow');
    const s = K.slotRecent(logs, 'snack').map(l => l.t);
    assert.strictEqual(s[0], 'Paprika', 'snacks: own snacks first');
    assert.ok(s.includes('Pasta'), 'then the rest, so the Snacks slot is never empty on day one');
    assert.ok(K.slotRecent(logs, '', 3).length === 3, 'no slot = plain recent list');
    assert.deepStrictEqual(K.slotRecent(null, 'lunch'), []);
});

test('Log meal opens straight on one screen: a small Meal | Snack switch, then one field with Foto / Barcode under it', () => {
    // Oct 27 (Emmanuel: "very confusing and overwhelming whilst opening"): no "Meal or snack?" step first
    assert.doesNotMatch(js, /if \(quick && K\.slotOk && !K\.slotOk\(slot\)\) \{\s*slotPicker\(\);/, 'no picker step before the sheet');
    assert.match(js, /meal: \(\) => mealForm\(\)/, 'every Log meal entry (Fuel orb, Meals bubble, quest) goes through mealForm');
    assert.match(js, /setSlot\(\(K\.slotOk && K\.slotOk\(slot\) \? slot : ''\) \|\| \(back \? pendingSlot\(\) : ''\) \|\| \(K\.slotFor \? K\.slotFor\(gc \? gc\.ateAt : undefined\) : 'meal'\)\);/, 'the slot for this time of day is picked for you');
    assert.match(js, /data-sp="lmKind" data-slot="' \+ k \+ '" aria-pressed="' \+ \(k === mealSlot\) \+ '"/, 'the switch marks the current slot');
    assert.match(js, /else if \(a === 'lmKind'\) lmKind\(b\);/, 'one tap switches Meal / Snack in place');
    assert.match(js, /else if \(a === 'slot'\) mealForm\(null, null, b\.dataset\.slot\)/);
    assert.match(js, /else if \(a === 'slotPick'\) slotPicker\(\)/, 'the way back (after editing an entry) still works');
    const f = js.slice(js.indexOf("const form = '<form id=\"spMeal\" class=\"lm-form\""), js.indexOf('const usual = recent.length'));
    assert.match(f, /name="title"[\s\S]*data-sp="photo"[\s\S]*data-sp="scan"/, 'write, then Foto, then Barcode');
    assert.match(js, /esc\(tr\('lmUsual'\)\)/, 'Eaten recently is "Wie immer"');
    assert.match(js, /V\.mealDup && V\.mealDup\(\{t: n, code: l\.code, slot: mealSlot\}\)/, 'a tick only for this slot');
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
    const kind = s => s === 'snack' ? 'snack' : /^(meal|breakfast|lunch|dinner)$/.test(String(s || '')) ? 'meal' : '';
    const mk = logs => new Function('S', 'today', 'data', m[1] + m[2]).bind({ mealKey: t => String(t || '').trim().toLowerCase(), kind });
    const now = Date.now(), H = 3600000;
    const S = { logs: [{ day, t: 'Paprika', slot: 'snack', ts: now - H }, { day, t: 'Toast' }, { day, t: 'Oats', slot: 'breakfast', ts: now - 5 * H }, { day, t: 'Rice', slot: 'meal', ts: now - H }] };
    const dup = d => mk()(S, () => day, d);
    assert.ok(dup({ t: 'Paprika', slot: 'snack' }), 'twice as a snack = duplicate');
    assert.strictEqual(dup({ t: 'Paprika', slot: 'meal' }), null, 'snack, then as a meal = fine');
    assert.strictEqual(dup({ t: 'Paprika', slot: 'dinner' }), null, 'old dinner slot reads as Meal');
    assert.strictEqual(dup({ t: 'Oats', slot: 'meal' }), null, 'the same food as a meal 5 h later = a new meal');
    assert.ok(dup({ t: 'Rice', slot: 'meal' }), 'the same food as a meal 1 h later = the same meal');
    assert.ok(dup({ t: 'Paprika' }), 'no slot = any slot');
    assert.ok(dup({ t: 'Toast', slot: 'breakfast' }), 'an old log without a slot still blocks');
});

test('the four tiles pop in, are thumb-sized, and calm down with Reduce Motion', () => {
    assert.match(css, /\.sp-slots \{ display: grid; grid-template-columns: 1fr 1fr;/);
    assert.match(css, /\.sp-slot \{[^}]*min-height: 112px;[^}]*animation: spSlotIn/);
    assert.match(css, /\.sp-how \{[^}]*min-height: 76px;/);
    assert.match(css, /prefers-reduced-motion: reduce\) \{ html:root body \.r2-ov\.ss-sheet :is\(\.sp-slot, \.sp-how\) \{ animation: none;/);
});
