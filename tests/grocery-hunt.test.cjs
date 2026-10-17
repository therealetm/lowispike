'use strict';
/* Oct 17, 2026 (E-man: "Your health starts with grocery shopping" ... "just like Pokemon" ... "you have to scan the barcode or take the
   picture" ... "Speisequark, Kiwi, Mandeln ... when they connect these products they get even more points, like Super Saiyan"):
   grocery-hunt-core.js (rules), grocery-hunt.js (panel), the hook in shop-scan.js, the world/spirit glow hooks. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../grocery-hunt-core.js');
const DAY = C.DAY;
const T0 = new Date(2026, 9, 17, 10, 0, 0).getTime(); // Saturday, 10:00
const store = { id: 'n123', name: 'EDEKA Mürwik' };
const other = { id: 'n999', name: 'Lidl Weiche' };
const bc = (n, name, extra) => Object.assign({ via: 'barcode', bc: n, name, store, lvl: 'none' }, extra || {});
const photo = (name, hash, extra) => Object.assign({ via: 'photo', name, photoHash: hash, store }, extra || {});

test('kinds: any brand of the same food matches, in German, English and Spanish', () => {
    assert.equal(C.kindOf('Speisequark Magerstufe'), 'quark');
    assert.equal(C.kindOf('Gut&Günstig Speisequark 40%'), 'quark');
    assert.equal(C.kindOf('Kiwi grün'), 'kiwi');
    assert.equal(C.kindOf('Mandeln naturbelassen'), 'almond');
    assert.equal(C.kindOf('Almendras'), 'almond');
    assert.equal(C.kindOf('Körniger Frischkäse'), 'cottage');
    assert.equal(C.kindOf('Freilandeier'), '', 'compound eggs stay unknown rather than a guess');
    assert.equal(C.kindOf('Eier Bodenhaltung'), 'egg');
    assert.equal(C.kindOf('Cola'), '');
    assert.equal(C.productKey({ bc: '4 006 040 000 012' }), 'bc:4006040000012');
    assert.equal(C.productKey({ name: 'Kiwi grün' }), 'n:kiwi grun');
    assert.equal(C.productKey({}), '');
});

test('shopping glow: none before the first check-in, full for the rhythm plus a day, then fades to the normal look, never below', () => {
    const s = C.normalize(null);
    assert.equal(C.strength(s, T0), 0);
    assert.equal(C.status(s, T0).phase, 'none');
    s.lastRenew = T0; // weekly by default
    assert.equal(C.strength(s, T0 + 7.9 * DAY), 1);
    assert.equal(C.status(s, T0 + 3 * DAY).phase, 'full');
    const mid = C.strength(s, T0 + (8 + 3.5) * DAY);
    assert.ok(mid > 0.45 && mid < 0.55, 'halfway through the fade: ' + mid);
    assert.equal(C.status(s, T0 + 10 * DAY).phase, 'fading');
    assert.equal(C.strength(s, T0 + 40 * DAY), 0);
    assert.equal(C.status(s, T0 + 40 * DAY).phase, 'faded');
    assert.ok(C.status(s, T0).boost <= C.BOOST_MAX && C.status(s, T0 + 40 * DAY).boost === 0, 'a bonus, never a minus');
});

test('rhythm and shop days: a slower rhythm holds longer; with shop days the hold reaches the end of the next shop day', () => {
    const s = C.normalize({ plan: { every: 14 } }); s.lastRenew = T0;
    assert.equal(C.strength(s, T0 + 14.5 * DAY), 1);
    C.setPlan(s, { every: 1 }); assert.equal(s.plan.every, C.EVERY_MIN, 'clamped');
    C.setPlan(s, { every: 99 }); assert.equal(s.plan.every, C.EVERY_MAX, 'clamped');
    const w = C.normalize({ plan: { every: 7, days: [4] } }); // Thursdays; check-in on a Saturday
    w.lastRenew = T0;
    const h = C.holdUntil(w), hd = new Date(h - DAY);
    assert.equal(hd.getDay(), 4, 'the hold runs to the Thursday after a week, plus a day');
    assert.ok(h >= T0 + 8 * DAY);
});

test('pause freezes the glow and moves it on by the pause; a pause ends by itself', () => {
    const s = C.normalize(null); s.lastRenew = T0;
    const k = C.strength(s, T0 + 9 * DAY);
    C.pause(s, T0 + 9 * DAY, 10);
    assert.equal(C.status(s, T0 + 15 * DAY).phase, 'paused');
    assert.equal(C.strength(s, T0 + 15 * DAY), k, 'frozen while paused');
    assert.ok(Math.abs(C.strength(s, T0 + 19 * DAY) - k) < 1e-9, 'continues from where it stopped');
    C.resume(s, T0 + 19 * DAY);
    assert.equal(s.lastRenew, T0 + 10 * DAY);
    C.pause(s, T0, 99); assert.ok(s.pausedUntil - T0 <= C.PAUSE_MAX * DAY, 'pause is capped');
});

test('"couldn\'t scan": once a cycle, holds the glow 3 more days, never starts one from nothing, gives no XP', () => {
    const s = C.normalize(null);
    assert.equal(C.grace(s, T0), false, 'nothing to hold yet');
    s.lastRenew = T0;
    const before = C.holdUntil(s);
    assert.equal(C.grace(s, T0 + 7 * DAY), true);
    assert.equal(C.holdUntil(s), before + C.SCAN_GRACE * DAY);
    assert.equal(C.grace(s, T0 + 8 * DAY), false, 'only once per check-in');
    assert.equal(s.xp.n, 0);
});

test('check-in: two different products on one day (barcode or photo) renew the glow, once a day, with one bonus', () => {
    const s = C.normalize(null);
    let r = C.recordCatch(s, bc('4000000000011', 'Speisequark'), T0);
    assert.equal(r.ok, true); assert.equal(r.renewed, false); assert.equal(r.tripNeed, 1);
    r = C.recordCatch(s, bc('4000000000011', 'Speisequark'), T0 + 60e3);
    assert.equal(r.again, true, 'the same product twice counts once'); assert.equal(r.awards.length, 0);
    r = C.recordCatch(s, photo('Kiwi', 'h1'), T0 + 120e3);
    assert.equal(r.renewed, true); assert.equal(s.lastRenew, T0 + 120e3);
    assert.ok(r.awards.some(a => a.label === 'trip' && a.eventId === 'grocery:' + C.dayOf(T0) + ':trip'));
    r = C.recordCatch(s, bc('4000000000028', 'Mandeln'), T0 + 180e3);
    assert.equal(r.renewed, false, 'one renewal a day');
    assert.equal(C.status(s, T0 + DAY).phase, 'full');
});

test('proof: barcode catches need a real barcode, photo catches need a photo, the same photo never counts twice; a photo is never rated', () => {
    const s = C.normalize(null);
    assert.equal(C.recordCatch(s, { via: 'barcode', name: 'Kiwi', store }, T0).why, 'nobarcode', 'typing a name is not a catch');
    assert.equal(C.recordCatch(s, { via: 'photo', name: 'Kiwi', store }, T0).why, 'nophoto');
    assert.equal(C.recordCatch(s, photo('Kiwi', 'same'), T0).ok, true);
    assert.equal(C.recordCatch(s, photo('Apfel', 'same'), T0 + 1).why, 'samephoto');
    const c = s.catches.find(x => x.via === 'photo');
    assert.equal(c.lvl, '', 'no verdict from a photo');
    assert.equal(C.recordCatch(s, photo('Kiwi', 'p', { lvl: 'none' }), T0 + DAY).ok, true);
    assert.equal(s.catches[s.catches.length - 1].lvl, '', 'a photo cannot carry a verdict in');
});

test('hunt: a shared find at this shop is a hint; catching it pays once per 7 days; your own finds pay less; new finds pay a little once', () => {
    const s = C.normalize(null);
    const shared = { finds: [{ store_id: 'n123', product_key: 'bc:4000000000035', name: 'Skyr Natur', barcode: '4000000000035', verdict: 'none', method: 'barcode', found_at: new Date(T0 - 3 * DAY).toISOString() },
        { store_id: 'n999', product_key: 'bc:4000000000042', name: 'Elsewhere', barcode: '4000000000042', found_at: new Date(T0 - DAY).toISOString() }] };
    const hs = C.hints(s, store, shared.finds, T0);
    assert.equal(hs.length, 1, 'only finds at this shop');
    assert.equal(hs[0].community, true); assert.equal(hs[0].daysAgo, 3); assert.equal(hs[0].shoppers, 1);
    let r = C.recordCatch(s, bc('4000000000035', 'Skyr Natur'), T0, shared);
    assert.ok(r.hint && r.hint.community);
    assert.deepEqual(r.awards.map(a => [a.label, a.amt]), [['hint', C.XP.hintBarcode]]);
    r = C.recordCatch(s, bc('4000000000035', 'Skyr Natur'), T0 + 2 * DAY, shared);
    assert.equal(r.awards.filter(a => a.label === 'hint').length, 0, 'cooling down');
    assert.ok(C.hints(s, store, shared.finds, T0 + 2 * DAY)[0].cooling);
    r = C.recordCatch(s, photo('Skyr Natur', 'x1', { bc: '4000000000035' }), T0 + 8 * DAY, shared);
    assert.deepEqual(r.awards.filter(a => a.label === 'hint').map(a => a.amt), [C.XP.hintPhoto], 'a photo catch pays less than a scan');
    // new find at this shop: small, once; afterwards it is your own hint
    r = C.recordCatch(s, bc('4000000000059', 'Walnusskerne'), T0, shared);
    assert.equal(r.newFind, true); assert.ok(r.awards.some(a => a.label === 'find' && a.amt === C.XP.find));
    r = C.recordCatch(s, bc('4000000000059', 'Walnusskerne'), T0 + 8 * DAY, shared);
    assert.equal(r.newFind, false); assert.deepEqual(r.awards.filter(a => a.label === 'hint').map(a => a.amt), [C.XP.ownBarcode]);
    assert.equal(C.recordCatch(s, bc('4000000000059', 'Walnusskerne'), T0 + 8 * DAY, shared).again, true);
    // finds are per shop, never a position
    assert.deepEqual(Object.keys(s.finds), ['n123']);
    assert.equal(JSON.stringify(s).indexOf('lat'), -1);
});

test('power combo: Speisequark + kiwi + almonds on one trip pays once per 7 days, any brand, scan or photo', () => {
    const s = C.normalize(null);
    C.recordCatch(s, bc('4000000000011', 'Speisequark Magerstufe'), T0);
    C.recordCatch(s, photo('Kiwi', 'k1'), T0 + 1000);
    const r = C.recordCatch(s, bc('4000000000028', 'Mandeln ganz'), T0 + 2000);
    assert.equal(r.combos.length, 1); assert.equal(r.combos[0].combo.id, C.STARTER.id); assert.equal(r.combos[0].paid, true);
    assert.ok(r.awards.some(a => a.label === 'combo' && a.amt === C.XP.combo && a.eventId.endsWith('combo:' + C.STARTER.id)));
    // next day again: no second payout within 7 days
    C.recordCatch(s, bc('4000000000066', 'Speisequark 40%'), T0 + DAY);
    C.recordCatch(s, photo('Kiwi gold', 'k2'), T0 + DAY + 1);
    const r2 = C.recordCatch(s, bc('4000000000073', 'Mandeln gehobelt'), T0 + DAY + 2);
    assert.equal(r2.combos[0].paid, false); assert.ok(r2.combos[0].againAt > T0 + DAY);
    // a different day's catches never mix into today's combo
    const s2 = C.normalize(null);
    C.recordCatch(s2, bc('4000000000011', 'Speisequark'), T0);
    C.recordCatch(s2, photo('Kiwi', 'k3'), T0 + 1);
    assert.equal(C.recordCatch(s2, bc('4000000000028', 'Mandeln'), T0 + DAY).combos.length, 0);
});

test('your own combo: 2 to 4 products from today, no duplicates of an existing combo, pays from the next trip', () => {
    const s = C.normalize(null);
    C.recordCatch(s, bc('4000000000080', 'Skyr Natur'), T0);
    C.recordCatch(s, photo('Heidelbeeren', 'b1'), T0 + 1);
    C.recordCatch(s, bc('4000000000097', 'Chiasamen'), T0 + 2);
    assert.equal(C.makeCombo(s, ['bc:4000000000080'], '', store, T0 + 3).why, 'count');
    const m = C.makeCombo(s, ['bc:4000000000080', 'n:heidelbeeren', 'bc:4000000000097'], 'Blue power bowl', store, T0 + 3);
    assert.equal(m.ok, true); assert.deepEqual(m.combo.items.map(i => i.kind), ['skyr', 'berries', 'chia']);
    assert.equal(C.makeCombo(s, ['bc:4000000000080', 'n:heidelbeeren', 'bc:4000000000097'], 'again', store, T0 + 4).why, 'exists');
    // starter combo signature is taken too
    C.recordCatch(s, bc('4000000000011', 'Speisequark'), T0 + 5); C.recordCatch(s, photo('Kiwi', 'k9'), T0 + 6); C.recordCatch(s, photo('Mandeln', 'm9'), T0 + 7);
    assert.equal(C.makeCombo(s, ['bc:4000000000011', 'n:kiwi', 'n:mandeln'], '', store, T0 + 8).why, 'exists');
    // next week, other brands: it pays
    const w = T0 + 8 * DAY;
    C.recordCatch(s, bc('4000000000103', 'Isländischer Skyr'), w); C.recordCatch(s, photo('Blaubeeren', 'b2'), w + 1);
    const r = C.recordCatch(s, photo('Chia Samen', 'c2'), w + 2);
    assert.ok(r.combos.some(x => x.combo.id === m.combo.id && x.paid));
});

test('anti-farming: all hunt XP together is capped per day, and every award has a stable event id', () => {
    const s = C.normalize(null);
    let total = 0;
    for (let i = 0; i < 40; i++) { const r = C.recordCatch(s, bc(String(4100000000000 + i), 'Product ' + i), T0 + i); r.awards.forEach(a => { total += a.amt; assert.match(a.eventId, /^grocery:\d{4}-\d\d-\d\d:/); }); }
    assert.equal(total, C.XP_DAY_CAP);
    assert.equal(C.xpLeft(s, T0 + 100), 0);
    assert.equal(C.xpLeft(s, T0 + DAY), C.XP_DAY_CAP, 'a new day');
});

test('sharing: only the shop, the product, the estimate, the method; no user name, no position, no photo', () => {
    const row = C.shareRow({ key: 'bc:1', name: 'Skyr', bc: '1', kind: 'skyr', lvl: 'none', via: 'photo' }, store);
    assert.deepEqual(Object.keys(row).sort(), ['barcode', 'kind', 'method', 'name', 'product_key', 'store_id', 'store_name', 'verdict']);
    const sql = read('supabase/proposals/grocery_hunt_20261017.sql');
    assert.match(sql, /enable row level security/i);
    assert.match(sql, /auth\.uid\(\)/);
    assert.doesNotMatch(sql, /\blat\b|\blon\b|latitude|photo_url/i);
});

test('wiring: scripts load, the shopping scanner reports real barcode scans only, the world and spirit glow hooks default to no change', () => {
    const html = read('index.html'), sw = read('sw.js'), scan = read('shop-scan.js'), wh = read('world-health-core.js'), scene = read('body-world-3d-scene.js');
    for (const f of ['grocery-hunt-core.js', 'grocery-hunt.js', 'grocery-hunt.css']) { assert.ok(html.indexOf(f + '?v=') > 0, f + ' in index.html'); assert.ok(sw.indexOf('"' + f + '"') > 0, f + ' cached'); }
    assert.match(scan, /if \(o\.code\)[^\n]*lowi:shop-scan/, 'only a looked-up barcode is reported, not a typed name');
    const WH = require('../world-health-core.js');
    const st = { logs: [], ledger: [], fast: {} };
    const base = WH.score(st);
    WH.setBoost(() => 8); assert.equal(WH.score(st).score, Math.min(100, base.score + 8));
    WH.setBoost(() => -20); assert.equal(WH.score(st).score, base.score, 'the shopping glow never pulls the world below its normal look');
    WH.setBoost(null); assert.equal(WH.score(st).score, base.score);
    assert.match(scene, /LowiGrocery/, 'the spirit world reads the shopping glow');
    const ui = read('grocery-hunt.js');
    assert.doesNotMatch(ui, /in stock|auf Lager|guaranteed|garantiert|won't spike/i, 'no stock or spike promises');
    assert.match(ui, /not identified|nicht erkannt/i, 'a photo says it is not identified');
});
