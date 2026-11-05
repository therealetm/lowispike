/* Nov 5 2026: collectible evolution cards (evo-card.js), opened from every row of the Evolution path in companion.js.
   Pure card rules (phase, frame, words, file name) plus wiring checks: read-only, locked forms stay secret, own class prefix. */
const assert = require('assert'), fs = require('fs'), path = require('path');
const test = require('node:test');
const root = path.join(__dirname, '..');
const E = require('../evo-card.js');
const src = fs.readFileSync(path.join(root, 'evo-card.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'evo-card.css'), 'utf8');
const comp = fs.readFileSync(path.join(root, 'companion.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const reached = { i: 6, name: 'Moss Nova', trait: 'Ten arms, a coral crown of five', xp: 4500, left: 0, reached: true, current: true };
const locked = { i: 7, name: 'Moss Titan', trait: 'Giant bell', xp: 7500, left: 1843, reached: false, current: false, next: true };

test('phases follow EVOLUTION.md: 1-2 cell, 3-5 swimmer, 6-7 reef spirit, 8-10 celestial', () => {
    const k = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => E.phaseOf(i).k);
    assert.deepStrictEqual(k, ['cell', 'cell', 'swim', 'swim', 'swim', 'reef', 'reef', 'star', 'star', 'star']);
    assert.deepStrictEqual([0, 2, 5, 9].map(i => E.phaseOf(i).stars), [1, 2, 3, 4]);
    assert.strictEqual(E.phaseOf(-3).k, 'cell'); assert.strictEqual(E.phaseOf(42).k, 'star');
});

test('frames: family palette for early forms, silver for reef spirits, gold for celestials; bad colours fall back', () => {
    assert.strictEqual(E.frameOf(1, { a: '#abc', b: '#123456' }).c[0], '#aabbcc');
    assert.strictEqual(E.frameOf(5, {}).ink, '#e6e6ea');
    assert.strictEqual(E.frameOf(9, {}).ink, '#f7d774');
    const f = E.frameOf(0, { a: 'url(javascript:x)', b: 'red' });
    assert.ok(/^#[0-9a-f]{6}$/.test(f.a) && /^#[0-9a-f]{6}$/.test(f.b), 'only hex colours reach the canvas');
});

test('a reached card shows the name, owner, family, phase, what it grew, reached-at XP and power', () => {
    const t = E.cardText(reached, { owner: 'Tide', fam: 'Earth family', lang: 'en' });
    assert.strictEqual(t.locked, false);
    assert.strictEqual(t.title, 'Moss Nova');
    assert.strictEqual(t.sub, 'Tide · Earth family');
    assert.strictEqual(t.phase, 'Reef spirit');
    assert.strictEqual(t.stars, 3);
    assert.strictEqual(t.power, 7);
    assert.strictEqual(t.no, '07/10');
    assert.strictEqual(t.reached, 'Reached at 4,500 XP');
    assert.strictEqual(t.grew, reached.trait);
    assert.strictEqual(t.now, 'Now');
    assert.match(t.alt, /Moss Nova, Form 7 of 10/);
    const de = E.cardText(reached, { owner: 'Tide', lang: 'de' });
    assert.strictEqual(de.reached, 'Erreicht ab 4.500 XP'); assert.strictEqual(de.phase, 'Riffgeist');
    assert.strictEqual(E.cardText(reached, { lang: 'es' }).grewK, 'Nuevo en esta forma');
});

test('a locked card is a sealed back: no name, no trait, only when it unlocks', () => {
    const t = E.cardText(locked, { owner: 'Tide', lang: 'en' });
    assert.strictEqual(t.locked, true);
    assert.strictEqual(t.title, '???');
    assert.ok(!JSON.stringify(t).includes('Titan') && !JSON.stringify(t).includes('bell'), 'the locked form stays a surprise');
    assert.strictEqual(t.line1, 'Unlocks at 7,500 XP');
    assert.strictEqual(t.line2, '1,843 XP to go');
    assert.strictEqual(E.cardText(Object.assign({}, locked, { next: false }), { lang: 'en' }).line2, 'Keep going to reveal it');
});

test('saved picture names are safe and say whose form it is', () => {
    assert.strictEqual(E.fileName(reached, 'Tide'), 'lowispike-tide-form-7-moss-nova.png');
    assert.strictEqual(E.fileName({ i: 0, name: 'Spark', reached: true }, 'Zoë ☆'), 'lowispike-zoe-form-1-spark.png');
    assert.strictEqual(E.fileName(locked, ''), 'lowispike-misty-form-8.png');
});

test('read-only: the card never writes storage, XP, stages or purchases', () => {
    assert.ok(!/localStorage|sessionStorage|LowiR2|setItem|indexedDB|LOWI_HERB_CONFIG|buy\(|purchase/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'no writes in evo-card.js');
});

test('companion.js: every path row opens its card, with its own label, and loads the files beside itself', () => {
    assert.match(comp, /class="cf-cardbtn" data-cf="card" data-i="' \+ i \+ '"/);
    assert.match(comp, /a === 'card'\) openCard\(/);
    assert.match(comp, /Open sealed card: Form /);
    assert.match(comp, /replace\('companion\.js', 'evo-card\.js'\)/);
    assert.match(comp, /replace\('companion\.js', 'evo-card\.css'\)/);
    assert.match(comp, /getElementById\('evcCss'\)/, 'own element id (ecCss belongs to the evening catch-up)');
    assert.match(sw, /STATIC\.push\("evo-card\.js", "evo-card\.css"\)/, 'cached for offline');
});

test('own prefix: no class, data attribute or id shared with the evening catch-up (ec-)', () => {
    assert.ok(!/["' .]ec-[a-z]/.test(src.replace(/evc-/g, '')), 'no ec- classes in evo-card.js');
    assert.ok(!/\.ec-[a-z]/.test(css), 'no .ec- rules in evo-card.css');
    assert.ok(!/data-ec[="\]]/.test(src), 'no data-ec attributes');
});

test('viewer: above the Misty sheet, true black backdrop, reduced motion, 44pt targets, focus kept inside', () => {
    const z = +(/\.evc-ov \{[^}]*z-index:\s*(\d+)/.exec(css) || [])[1];
    assert.ok(z > 2147483400, 'above .cf-ov');
    assert.match(css, /\.evc-ov \{[^}]*background: rgba\(0, 0, 0, \.9\)/);
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.match(css, /\.evc-nav \{[^}]*width: 44px; height: 44px/);
    assert.match(css, /\.evc-x \{[^}]*width: 44px; height: 44px/);
    assert.match(css, /aspect-ratio: 5 \/ 7/);
    assert.match(src, /e\.key === 'Tab'/);
    assert.match(src, /e\.key === 'Escape'\) \{ e\.preventDefault\(\); e\.stopImmediatePropagation\(\); close\(\)/, 'Escape / back closes only the card');
    assert.match(src, /W\.addEventListener\('keydown', onKey, true\)/, 'runs before the sheet\'s document listener');
});

test('export: clean standalone SVG (no scripts, animations, stray attributes), share sheet then hold-to-save then download', () => {
    assert.match(src, /script\|foreignObject\|animate/);
    assert.match(src, /\^\[a-zA-Z_\]\[\\w:.-\]\*\$/);
    assert.match(src, /navigator\.canShare\(\{ files: \[file\] \}\)/);
    assert.match(src, /Press and hold the card, then tap Save to Photos/);
    assert.match(src, /a\.download = name/);
    assert.match(css, /-webkit-touch-callout: default/);
});
