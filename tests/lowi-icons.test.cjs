'use strict';
/* Custom icons: one shared SVG set (lowi-icons.js + lowi-icons.css) replaces emoji in UI chrome. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function load(extra) {
    const ctx = Object.assign({ console }, extra || {});
    ctx.window = ctx; ctx.globalThis = ctx;
    vm.createContext(ctx);
    vm.runInContext(read('lowi-icons.js'), ctx, { filename: 'lowi-icons.js' });
    return ctx;
}

test('the set loads, has a broad icon list and every icon is valid inline SVG', () => {
    const I = load().LowiIcons;
    const names = I.names();
    assert.ok(names.length >= 60, 'icon count ' + names.length);
    for (const n of names) {
        const s = I.svg(n);
        assert.match(s, /^<svg class="sp-symbol li li-/);
        assert.match(s, /viewBox="0 0 24 24"/);
        assert.ok(s.endsWith('</svg>'), n);
        assert.ok(!/undefined|NaN/.test(s), n + ' has a broken path');
    }
});

test('common UI emoji map to their own icon, unknown ones fall back sensibly', () => {
    const I = load().LowiIcons;
    assert.equal(I.kind('💧'), 'water');
    assert.equal(I.kind('🔥'), 'flame');
    assert.equal(I.kind('📷'), 'camera');
    assert.equal(I.kind('⭐️'), I.kind('⭐'), 'variation selector ignored');
    assert.equal(I.kind('👍🏽'), I.kind('👍'), 'skin tone ignored');
    assert.equal(I.kind(''), 'sparkle');
    assert.ok(I.has(I.kind('🦄')), 'fallback is a real icon');
});

test('all twelve zodiac signs have their own sigil', () => {
    const I = load().LowiIcons;
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const paths = new Set();
    for (const z of signs) { assert.ok(I.has(z), z); paths.add(I.zodiac[z]); }
    assert.equal(paths.size, 12, 'no two signs share a drawing');
    assert.equal(I.kind('♓'), 'Pisces');
});

test('a lone emoji gets an accessible label, inline ones stay decorative', () => {
    const I = load().LowiIcons;
    assert.match(I.fromEmoji('💧', { alone: true }), /role="img" aria-label="Water"/);
    assert.match(I.fromEmoji('💧'), /aria-hidden="true"/);
    assert.match(I.svg('water', { label: 'a"<b' }), /aria-label="a&quot;&lt;b"/, 'label escaped');
});

test('labels follow the app language', () => {
    const ctx = load({ LowiLang: { get: () => 'de', add() {} } });
    assert.match(ctx.LowiIcons.fromEmoji('💧', { alone: true }), /aria-label="Wasser"/);
});

test('herb world draws from the same set through LowiSpiritCore.icon', () => {
    const ctx = load({ LowiSpiritCore: { icon: k => 'old:' + k, paths: { Pisces: 'x' } } });
    assert.match(ctx.LowiSpiritCore.icon('water'), /li-water/);
    assert.equal(ctx.LowiSpiritCore.icon('no-such-icon'), 'old:no-such-icon');
    assert.equal(ctx.LowiSpiritCore.paths.Pisces, ctx.LowiIcons.zodiac.Pisces);
});

test('wired in: loader, offline cache and spirit.js swap', () => {
    const ui = read('apple-ui.js'), sw = read('sw.js'), sp = read('spirit.js'), css = read('lowi-icons.css');
    assert.ok(/'spirit-core\.js','lowi-icons\.js'/.test(ui), 'lowi-icons.js loads right after spirit-core.js');
    assert.ok(/lowi-icons\.css\?v=/.test(ui), 'stylesheet linked');
    const stat = sw.match(/const STATIC = \[([^\]]*)\]/)[1];
    assert.ok(stat.includes('"lowi-icons.js"') && stat.includes('"lowi-icons.css"'), 'offline cache');
    assert.match(sp, /LowiIcons\.fromEmoji/);
    assert.match(sp, /LowiIcons\.kind/);
    /* keeps user content untouched: the swap still skips inputs, posts and captions */
    assert.match(sp, /closest\('script,style,svg,input,textarea/);
    /* CSS never sets layout on the tab bar or sidebar Scan row */
    assert.ok(!/#tabbar[^{]*\{[^}]*[{;\s](?:height|padding|margin|flex-direction|font-size)\s*:/.test(css), 'no tab bar geometry');
    assert.ok(!/data-lay=desktop/.test(css), 'no wide layout rules');
});
