// Aura shop step 1 (Oct 22 2026): animated auras bought with Sparks. Sparks = total XP - sparks spent, so spending never
// lowers the level or the leaderboard XP, and an existing user starts with sparks equal to their XP.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const C = require('../world-home-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const js = read('world-home.js'), css = read('world-home.css'), hub = read('misty-hub.js');

test('six animated auras with rising prices, each with EN/DE/ES name and line', () => {
    assert.strictEqual(C.SHOP.length, 6);
    assert.deepStrictEqual(C.SHOP.map(a => a.id), ['ember', 'orbs', 'trail', 'electric', 'prism', 'galaxy']);
    for (let i = 1; i < C.SHOP.length; i++) assert.ok(C.SHOP[i].sp > C.SHOP[i - 1].sp, 'prices rise');
    for (const a of C.SHOP) {
        assert.strictEqual(a.n.length, 3); assert.strictEqual(a.d.length, 3);
        assert.ok(a.n.every(Boolean) && a.d.every(Boolean));
        assert.ok(css.includes('.wh-fx-' + a.fx), a.fx + ' has its animation');
    }
    assert.strictEqual(C.AURAS.length, 8, 'the 8 level glows stay');
    assert.strictEqual(C.AURAS.find(a => a.id === 'nebula').xp, 3000, 'Nebula stays a level reward at 3000 XP');
});

test('back-fill: an existing user has sparks equal to their XP', () => {
    assert.strictEqual(C.sparks(1234, null), 1234);
    assert.strictEqual(C.sparks(0, undefined), 0);
    assert.strictEqual(C.sparks(77.9, {}), 77);
});

test('spending never changes XP or level', () => {
    const state = { xp: 2600 }, before = C.stage(state.xp);
    const w0 = C.wallet(null);
    const r = C.buy(w0, 'electric', state.xp);
    assert.ok(r.ok);
    assert.strictEqual(state.xp, 2600, 'XP untouched');
    assert.deepStrictEqual(C.stage(state.xp), before, 'level untouched');
    assert.strictEqual(r.left, 2600 - 1400);
    assert.deepStrictEqual(w0.own, [], 'the old wallet is not changed in place');
    assert.deepStrictEqual(r.wallet.own, ['electric']);
    assert.strictEqual(C.sparks(state.xp, r.wallet), 1200);
    // new XP earns new sparks 1:1
    assert.strictEqual(C.sparks(state.xp + 15, r.wallet), 1215);
    // the bought aura is owned and wearable, the level glows still go by XP
    assert.ok(C.owns('electric', state.xp, r.wallet));
    assert.strictEqual(C.cleanAura('electric', state.xp, r.wallet), 'electric');
    assert.strictEqual(C.cleanAura('electric', state.xp, w0), C.AURAS[0].id);
    assert.ok(C.owns('sun', 2600, w0) && !C.owns('nebula', 2600, r.wallet));
    // the code that buys never writes XP
    const buyFn = js.slice(js.indexOf('function buyAura('), js.indexOf('/* ---------- clicks ---------- */'));
    assert.ok(buyFn.length > 100 && !/\.xp\s*[-+]?=/.test(buyFn) && !/award\(|unaward\(/.test(buyFn));
});

test('costs: short, owned and unknown are refused; spending adds up', () => {
    let r = C.buy(null, 'orbs', 499);
    assert.strictEqual(r.ok, false); assert.strictEqual(r.why, 'short'); assert.strictEqual(r.need, 1);
    r = C.buy(null, 'orbs', 500); assert.ok(r.ok); assert.strictEqual(r.left, 0);
    const again = C.buy(r.wallet, 'orbs', 5000); assert.strictEqual(again.why, 'owned');
    assert.strictEqual(C.buy(null, 'nebula', 9999).why, 'unknown', 'level glows are not for sale');
    assert.strictEqual(C.buy(null, 'xp', 9999).why, 'unknown');
    const r2 = C.buy(r.wallet, 'ember', 900); assert.ok(r2.ok); assert.strictEqual(r2.wallet.spent, 750); assert.strictEqual(r2.left, 150);
});

test('XP taken back takes its sparks back, never below 0', () => {
    const w = C.buy(null, 'ember', 300).wallet;
    assert.strictEqual(C.sparks(300, w), 50);
    assert.strictEqual(C.sparks(200, w), 0, 'a deleted log after spending: 0, not negative');
    assert.strictEqual(C.buy(w, 'orbs', 200).why, 'short');
});

test('a tampered wallet cannot make sparks: spent is never below the price of what you own', () => {
    const w = C.wallet({ spent: 0, own: ['galaxy', 'galaxy', 'nope', 7] });
    assert.deepStrictEqual(w.own, ['galaxy']);
    assert.strictEqual(w.spent, 3000);
    assert.strictEqual(C.sparks(3000, w), 0);
    assert.strictEqual(C.wallet({ spent: -50 }).spent, 0);
});

test('shop cards: price, afford and the sparks still needed', () => {
    const w = C.buy(null, 'ember', 1000).wallet; // 750 left
    const it = C.shopItems(1000, 'dew', w);
    assert.strictEqual(it.find(x => x.id === 'ember').status, 'ready');
    const orbs = it.find(x => x.id === 'orbs'); assert.strictEqual(orbs.status, 'locked'); assert.ok(orbs.afford); assert.strictEqual(orbs.need, 0);
    const trail = it.find(x => x.id === 'trail'); assert.ok(!trail.afford); assert.strictEqual(trail.need, 150);
});

test('step 2 hooks: size and shape unlockables live in the same wallet', () => {
    assert.deepStrictEqual(C.SHAPES.map(s => s.id), ['shape:round', 'shape:square', 'shape:rect', 'shape:triangle', 'shape:diamond', 'shape:gem']);
    assert.ok(C.SIZES.length >= 3);
    const r = C.buy(null, 'shape:diamond', 3000); assert.ok(r.ok); assert.ok(r.wallet.own.includes('shape:diamond'));
    assert.strictEqual(C.wallet({ shape: 'shape:diamond' }).shape, 'shape:diamond');
});

test('wiring: sparks wallet key, preview with Unlock / missing sparks, Misty wears it on Home and her card', () => {
    assert.ok(js.includes("SKEY = 'lowispike.sparks.v1'"));
    assert.ok(js.includes("data-wh=\"aurabuy\"") && js.includes('wh-pv-need'));
    assert.ok(js.includes("ensureFx(D.getElementById('spBubble'), fx)"));
    assert.ok(hub.includes('H.fxHTML(H.auraLook().fx)'));
    assert.ok(/prefers-reduced-motion: reduce\)\s*\{\s*\.wh-fx i/.test(css), 'reduced motion holds every aura still');
    for (const s of ['Unlock for ', 'freischalten', 'Desbloquear por ', 'Animated auras', 'Animierte Auren', 'Auras animadas']) assert.ok(js.includes(s), s);
});
