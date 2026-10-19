// Aura + rename (Oct 19 2026, aura-rename task). Emmanuel: "I've changed the color of the aura, and now I click back to my Misty
// and nothing changed"; his friend: "change the name manually ... when their companion gets a name".
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../companion-birth-core.js');
const wh = read('world-home.js'), whCss = read('world-home.css'), hub = read('misty-hub.js'), hubCss = read('misty-hub.css'), cb = read('companion-birth.js');

/* companion-birth.js in a tiny browser stand-in */
function boot(store, herbName) {
    const ls = new Map(Object.entries(store || {}));
    const events = [];
    const el = () => ({ appendChild() { }, setAttribute() { }, querySelector: () => null, classList: { add() { }, remove() { } } });
    const D = { readyState: 'complete', getElementById: () => null, querySelector: () => null, head: el(), createElement: el, addEventListener() { }, documentElement: { lang: 'en' } };
    const prefs = { name: herbName || '' };
    const w = {
        document: D, LowiBirthCompanionCore: C, CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; },
        localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
        LowiHerbIdentity: { autoName: () => 'Mossy', setCustomName: v => { prefs.name = v; } },
        LowiHerbTamagotchi: { readPrefs: () => prefs },
        addEventListener() { }, dispatchEvent: e => events.push(e), requestAnimationFrame: () => 0, setTimeout: () => 0
    };
    w.window = w;
    vm.runInNewContext(cb, w);
    return { B: w.LowiBirthCompanion, ls, events, prefs };
}
const born = () => { const g = C.generate({ bday: '1990-05-12', btime: '', n: 0 }); return { v: 1, bday: '1990-05-12', btime: '', n: 0, name: g.autoName, created: 1 }; };

test('renameCheck: trims, caps at 24, needs a letter or number, empty means go back', () => {
    assert.deepStrictEqual(C.renameCheck('  Zephyr   Nova '), { ok: true, name: 'Zephyr Nova', reset: false, cut: false });
    assert.strictEqual(C.renameCheck('').reset, true);
    assert.strictEqual(C.renameCheck('   ').reset, true);
    assert.strictEqual(C.renameCheck('!!!').ok, false);
    assert.strictEqual(C.renameCheck('<>').ok, false);
    assert.strictEqual(C.renameCheck('<b>Ñoño</b>').name, 'bÑoño/b');
    assert.strictEqual(C.renameCheck('x'.repeat(30)).name.length, 24);
    assert.strictEqual(C.renameCheck('Lúa 7').ok, true);
});

test('rename keeps the look and saves the name with the companion (account backup key)', () => {
    const rec = born();
    const { B, ls, events } = boot({ 'lowispike.companion.v1': JSON.stringify(rec) });
    const look0 = JSON.stringify(Object.assign({}, B.get(), { name: 0 }));
    const r = B.rename('Zephyr');
    assert.deepStrictEqual([r.ok, r.name], [true, 'Zephyr']);
    assert.strictEqual(B.get().name, 'Zephyr');
    const saved = JSON.parse(ls.get('lowispike.companion.v1'));
    assert.deepStrictEqual([saved.bday, saved.btime, saved.n, saved.name], [rec.bday, rec.btime, rec.n, 'Zephyr']);
    assert.strictEqual(JSON.stringify(Object.assign({}, B.get(), { name: 0 })), look0, 'only the name changed');
    assert.ok(events.some(e => e.type === 'lowi:companion'));
    assert.strictEqual(B.displayName(), 'Zephyr');
    const back = B.rename('');
    assert.ok(back.ok && back.reset);
    assert.strictEqual(B.get().name, C.generate({ bday: rec.bday, btime: '', n: 0 }).autoName);
    assert.strictEqual(B.rename('***').ok, false);
});

test('rename without an own companion names Misty through the herb name; empty brings Misty back', () => {
    const { B, prefs } = boot({});
    assert.strictEqual(B.displayName(), 'Misty');
    assert.strictEqual(JSON.stringify(B.rename('Lumi')), JSON.stringify({ ok: true, name: 'Lumi', reset: false }));
    assert.strictEqual(prefs.name, 'Lumi');
    assert.strictEqual(B.displayName(), 'Lumi');
    assert.strictEqual(B.rename('').name, 'Misty');
    assert.strictEqual(B.displayName(), 'Misty');
});

test('withName puts her own name into fixed "Misty" lines, German genitive included', () => {
    const { B } = boot({}, 'Zephyr');
    assert.strictEqual(B.withName("Misty's gift of the day"), "Zephyr's gift of the day");
    assert.strictEqual(B.withName('Mistys Geschenk des Tages'), 'Zephyrs Geschenk des Tages');
    assert.strictEqual(B.withName('El regalo del día de Misty'), 'El regalo del día de Zephyr');
    const b2 = boot({}, 'Klaus').B;
    assert.strictEqual(b2.withName('Mistys Geschenk'), 'Klaus\u2019 Geschenk');
    assert.strictEqual(boot({}).B.withName('drag to fly Misty'), 'drag to fly Misty');
});

test('aura: saved in a lowispike.* key (account backup, swapped on sign-in), old device key moved once', () => {
    assert.match(wh, /const AKEY = 'lowispike\.aura\.v1', AKEY_OLD = 'lowi\.aura'/);
    assert.match(wh, /localStorage\.removeItem\(AKEY_OLD\)/);
    assert.ok(!/localStorage\.setItem\('lowi\.aura'/.test(wh));
});

test('aura: a pick shows on Home Misty and on the card under the Glow sheet right away', () => {
    assert.match(wh, /dispatchEvent\(new CustomEvent\('lowi:aura'/);
    assert.match(wh, /H\.dataset\.whAuraSet = '1'/);
    assert.match(whCss, /html\.wh-home\[data-wh-aura-set\] #spHome #spBubble \.tmg-plant \{ filter: drop-shadow\([^}]*--wh-aura-a/);
    assert.match(hub, /'lowi:aura', 'lowi:companion'\]\.forEach\(ev => W\.addEventListener\(ev, \(\) => \{ if \(sheet\(\) && !renaming\(\)\) repaint\(\)/);
    assert.ok(!/T\('Misty glows in '/.test(wh), 'the toast says her own name');
});

test('card: Rename button under the name (not in the grab strip), field with Save/Cancel, Escape cancels only the field', () => {
    assert.match(hub, /class="mh-rn" data-mh="rename" aria-label="/);
    assert.ok(hub.indexOf('class="mh-rn"') > hub.indexOf('class="mh-st"'), 'after the status line');
    assert.match(hub, /maxlength="24"/);
    assert.match(hub, /e\.key !== 'Escape'[^\n]*stopImmediatePropagation\(\); renameClose\(true\)/);
    assert.match(hubCss, /\.mh-rn \{[^}]*min-height: 44px/);
    assert.match(hubCss, /\.mh-rnl input \{[^}]*font-size: 18px/, '16px+ so iOS does not zoom');
});

test('her name reaches the fixed lines that said Misty on Home', () => {
    assert.match(read('misty-pad.js'), /function label\(\) \{ return nm\(label0\(\)\); \}/);
    assert.match(read('misty-pad.js'), /addEventListener\('lowi:companion'/);
    assert.match(read('herb-shop.js'), /nmL\(L\('Misty\\'s gift of the day'/);
    assert.match(read('body-trips.js'), /tr\('nextTired'\); try \{ const B = window\.LowiBirthCompanion; if \(B && B\.withName\)/);
    assert.match(wh, /hb\.setAttribute\('aria-label', withNm\(/);
});
