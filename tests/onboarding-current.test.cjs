/* Onboarding stays current (Oct 17, 2026). E-man: always check the onboarding matches the newest changes, "the wording,
   the explanation, everything". ONBOARDING.md is the source of truth; this test fails when code and that file drift. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
const C = require('../shop-plan-core.js');

test('shopping rhythm: only what the person typed, never a default', () => {
    assert.strictEqual(C.normalize({}).every, null);
    assert.strictEqual(C.normalize(null).every, null);
    assert.strictEqual(C.parseEvery('7'), 7);
    assert.strictEqual(C.parseEvery(' every 4 days '), 4);
    assert.strictEqual(C.parseEvery('alle 3,4 Tage'), 3);
    assert.strictEqual(C.parseEvery(''), null);
    assert.strictEqual(C.parseEvery('often'), null);
    assert.strictEqual(C.parseEvery('0'), null);
    assert.strictEqual(C.parseEvery('61'), null);
    assert.strictEqual(C.isSet({ every: null }), false);
    const p = C.normalize({ every: '5', days: [6, 6, 9, 'x', 1], store: ' <b>Edeka</b>  Main ', skipped: true });
    assert.deepStrictEqual(p.days, [1, 6]);
    assert.strictEqual(p.store, 'bEdeka/b Main');
    assert.strictEqual(p.skipped, false, 'a typed rhythm is never "skipped"');
    assert.strictEqual(C.normalize({ skipped: true }).skipped, true);
});

test('shopping rhythm: due states give real life room and never claim anything without a rhythm', () => {
    const day = 864e5, now = Date.UTC(2026, 9, 17, 12);
    const p = { every: 7 };
    assert.strictEqual(C.dueState({}, now - day, now).state, 'unset');
    assert.strictEqual(C.dueState(p, 0, now).state, 'due');
    assert.strictEqual(C.dueState(p, now - 3 * day, now).state, 'fresh');
    assert.strictEqual(C.dueState(p, now - 7 * day, now).state, 'due');
    assert.strictEqual(C.graceDays(p), 2);
    assert.strictEqual(C.dueState(p, now - 9 * day, now).state, 'grace');
    assert.strictEqual(C.dueState(p, now - 10 * day, now).state, 'lapsed');
    assert.strictEqual(C.graceDays({ every: 1 }), 1);
    assert.strictEqual(C.graceDays({ every: 60 }), 5);
});

test('shopping rhythm: summary in English, German and Spanish', () => {
    const p = { every: 7, days: [6], store: 'Edeka' };
    assert.strictEqual(C.summary(p, 'en'), 'Every 7 days \u00b7 usually Sat \u00b7 at Edeka');
    assert.strictEqual(C.summary(p, 'de'), 'Alle 7 Tage \u00b7 meist Sa \u00b7 bei Edeka');
    assert.match(C.summary(p, 'es'), /^Cada 7 d\u00edas/);
    assert.strictEqual(C.summary({}, 'en'), 'Not set yet');
    assert.strictEqual(C.summary({ every: 1 }, 'de'), 'Jeden Tag');
});

test('setup has a 4th step where the person types their shopping rhythm, with Later to skip', () => {
    const h = read('index.html');
    assert.match(h, /obShop\(\) \? \[0,1,2,3\]/);
    assert.match(h, /LowiShopPlan\.formHTML\(null, \{ prefix: "r2obSp" \}\)/);
    assert.match(h, /data-r2o="shopdone"/);
    assert.match(h, /data-r2o="shoplater"/);
    assert.match(h, /v === "shopdone"\) \{[^\n]*if \(!r\.ok\) return LowiShopPlan\.showErr/);
    const core = h.indexOf('src="shop-plan-core.js'), ui = h.indexOf('src="shop-plan.js');
    assert.ok(core > 0 && ui > core, 'core loads before the page layer');
    const sw = read('sw.js');
    ['shop-plan-core.js', 'shop-plan.js', 'shop-plan.css'].forEach(f => assert.strictEqual(sw.split('"' + f + '"').length - 1, 2, f + ' in both service worker lists'));
});

test('the shopping form never pre-fills a number and is editable later from Profile', () => {
    const s = read('shop-plan.js');
    assert.match(s, /value="' \+ \(p\.every \|\| ''\) \+ '"/);
    assert.match(s, /data-spl="open"/);
    assert.match(s, /function openEditor/);
    assert.match(s, /'lowi:shopplan'/);
    ['en', 'de', 'es'].forEach(l => assert.ok(new RegExp("\\b" + l + ": \\{").test(s), l));
});

test('gate explains the current game: shop & scan first, and a how-you-play step in every language', () => {
    const s = read('herb-start.js');
    const plays = s.match(/play:\[[^\]]+\]/g) || [];
    assert.strictEqual(plays.length, 3, 'EN, DE, ES');
    plays.forEach(p => assert.strictEqual((p.match(/'[^']+'/g) || []).length, 5));
    assert.match(s, /hab:\['Shop & scan'/);
    assert.match(s, /hab:\['Einkaufen & scannen'/);
    assert.match(s, /hab:\['Comprar y escanear'/);
    assert.match(s, /Math\.min\(4,\+st\.step\|\|0\)/);
    assert.match(s, /if\(st\.v!==2\)/, 'older saved progress moves past the new step');
});

test('onboarding copy never over-promises', () => {
    const h = read('index.html');
    const a = h.indexOf('function paintOb'), b = h.indexOf('function finishOb');
    const copy = [read('herb-start.js').slice(0, read('herb-start.js').indexOf('/* ---------- 1.')), read('shop-plan.js'), h.slice(a, b)].join('\n');
    [/won.t spike/i, /no spikes?\b(?! rating)/i, /guarantee/i, /\bcures?\b/i, /\bdrawer\b/i, /blood sugar will/i, /verified nutrition/i].forEach(re => assert.ok(!re.test(copy), 'banned: ' + re));
});

test('ONBOARDING.md names only files that exist, and covers every feature a new person is told about', () => {
    const md = read('ONBOARDING.md');
    const files = Array.from(new Set((md.match(/`([a-z0-9-]+\.(?:js|css|cjs))`/g) || []).map(x => x.slice(1, -1))));
    files.forEach(f => assert.ok(fs.existsSync(path.join(R, f)) || fs.existsSync(path.join(R, 'tests', f)), 'ONBOARDING.md mentions missing file ' + f));
    ['shop-plan-core.js', 'shop-plan.js', 'herb-start.js', 'companion-birth.js', 'shop-scan-core.js', 'misty-pad.js', 'starter-core.js'].forEach(f => assert.ok(md.includes('`' + f + '`'), f));
    /* new grocery / shopping / food-combo features must be added to the onboarding map when they ship */
    const feat = fs.readdirSync(R).filter(f => /^(grocery|shop-check|shop-hunt|food-combo|combo|power-food|food-hunt)[a-z0-9-]*\.js$/.test(f));
    feat.forEach(f => assert.ok(md.includes('`' + f + '`'), f + ' is a new shopping feature: explain it in the onboarding and list it in ONBOARDING.md'));
});
