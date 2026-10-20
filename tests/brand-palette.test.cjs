/* item 32 (20 Oct 2026): the six planet colours are the brand. One source (brand-palette.js), copied exactly from body-world-3d.js
   PLACES; every liquid and the galaxy glows derive from it; six liquids, six planets, one each; Scan fills only with products found. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const B = require('../brand-palette.js');
const SF = require('../scan-fill.js');

test('the brand palette is exactly the six planet colours, unchanged', () => {
    const W = require('../body-world-3d.js');
    const places = W.PLACES || (W.core && W.core.PLACES);
    assert.ok(Array.isArray(places) && places.length === 6, 'six places');
    const fromPlaces = {};
    places.forEach(p => { fromPlaces[p.id] = String(p.hue).toLowerCase(); });
    assert.deepStrictEqual(fromPlaces, B.PLANETS);
    assert.deepStrictEqual(B.PLANETS, { gut: '#2ef8b6', liver: '#e78631', pancreas: '#f8ea40', muscles: '#9feb25', heart: '#f14770', brain: '#1cf7f9' });
});

test('six liquids, six planets, one each; dry controls have no liquid colour', () => {
    const kinds = ['water', 'move', 'fuel', 'sleep', 'gap', 'scan'];
    assert.deepStrictEqual(Object.keys(B.USE).sort(), kinds.slice().sort());
    assert.deepStrictEqual(Object.values(B.USE).sort(), Object.keys(B.PLANETS).sort(), 'every planet used exactly once');
    for (const dry of ['joy', 'joystick', 'settings']) assert.strictEqual(B.USE[dry], undefined, dry + ' stays dry');
});

test('derived tones keep the planet hue: lighter surface, deeper bottom, softer galaxy glow', () => {
    for (const id of Object.keys(B.PLANETS)) {
        const t = B.tones(id), sum = c => c[0] + c[1] + c[2];
        assert.ok(sum(t.light) > sum(t.core) && sum(t.soft) > sum(t.core) && sum(t.deep) < sum(t.core), id);
        const big = c => c.indexOf(Math.max(...c));
        assert.strictEqual(big(t.light), big(t.core), id + ' light keeps the leading channel');
    }
});

const grad = (l, a1, a2) => 'linear-gradient(180deg, ' + B.rgba(l.top, a1) + ', ' + B.rgba(l.bot, a2) + ')';
test('every CSS liquid fill is the brand liquid of its bubble (a stylesheet cannot read the JS, so the numbers are checked here)', () => {
    const L = k => B.liquid(k);
    const cases = [
        ['world-home.css', grad(L('water'), '.55', '.8')],
        ['home-blooms-v2.css', grad(L('water'), '.5', '.75')],
        ['move-bubble.css', grad(L('move'), '.5', '.78')],
        ['move-bubble.css', grad(L('move'), '.45', '.7')],
        ['home-blooms-v2.css', grad(L('move'), '.45', '.7')],
        ['misty-panels.css', grad(L('move'), '.5', '.82')],
        ['sym-home.css', grad(L('fuel'), '.5', '.78')],
        ['home-orbit-v2.css', grad(L('sleep'), '.45', '.72')],
        ['home-orbit-v2.css', grad(L('scan'), '.5', '.78')]
    ];
    for (const [f, g] of cases) assert.ok(R(f).includes(g), f + ' has ' + g);
    assert.ok(R('home-orbit-v2.css').includes('.o8-scan .wh-cell-fill'), 'Scan has its own fill colour');
    const done = B.fast(true, false).top;
    assert.ok(R('fast-bubble.css').includes('rgba(' + done.join(', ') + ', .32)'), 'goal-reached glow = the lit Pancreas');
    for (const old of ['rgba(110,200,255,.55), rgba(40,120,240,.8)', 'rgba(150, 255, 210, .5), rgba(30, 190, 150, .78)', 'rgba(255, 214, 150, .5), rgba(236, 150, 70, .78)', 'rgba(190,170,255,.45), rgba(120,100,230,.7)'])
        for (const f of ['world-home.css', 'move-bubble.css', 'sym-home.css', 'home-orbit-v2.css']) assert.ok(!R(f).includes(old), 'old palette gone from ' + f);
});

test('the fasting water and the 3D liquid fallbacks equal the brand (for when brand-palette.js is not loaded)', () => {
    const fb = R('fast-bubble.js');
    const key = (done, light) => done ? (light ? 'doneLight' : 'doneDark') : (light ? 'light' : 'dark');
    for (const done of [false, true]) for (const light of [false, true]) {
        const f = B.fast(done, light);
        const lit = key(done, light) + ': { top: [' + f.top.join(', ') + '], bot: [' + f.bot.join(', ') + '], a1: ' + f.a1 + ', a2: ' + f.a2 + ', back: ' + f.back + ' }';
        assert.ok(fb.includes(lit), 'fast-bubble PAL ' + lit);
    }
    global.window = undefined;
    const LB = require('../living-bubbles.js');
    const C = LB.CORE || LB.core || LB;
    for (const done of [false, true]) for (const light of [false, true]) {
        const f = B.fast(done, light), c = C.liquidColors('fast', light, done);
        assert.deepStrictEqual([c.top, c.bot, c.a1, c.a2], [f.top, f.bot, f.a1, f.a2], key(done, light));
    }
    const w = C.liquidColors('water'), lw = B.liquid('water');
    assert.deepStrictEqual([w.top, w.bot], [lw.top, lw.bot]);
    const p = C.parseGradient(getComputedLike(B.css('water')));
    assert.deepStrictEqual([p.top, p.bot, Math.round(p.a1 * 100) / 100, p.a2], [w.top, w.bot, w.a1, w.a2], 'the fallback looks the same as the parsed CSS fill');
    assert.ok(fb.includes('B.fast(false, false)') && fb.includes('root.LowiBrand'), 'fast-bubble reads LowiBrand when it is there');
});
function getComputedLike(s) { return s.replace('180deg, ', ''); }

test('galaxy glows: the six planets softened, Misty blue and star white; no old pastel left; literals equal the brand', () => {
    const sc = R('body-world-3d-scene.js');
    const lit = '{ ' + ['brain', 'gut', 'liver', 'pancreas', 'muscles', 'heart', 'misty', 'white'].map(k => k + ": '" + B.GALAXY[k] + "'").join(', ') + ' }';
    assert.ok(sc.includes(lit), 'scene fallback ' + lit);
    assert.ok(sc.includes('window.LowiBrand.GALAXY'), 'scene reads LowiBrand');
    assert.strictEqual(B.GALAXY.misty, '#8fd0ff', 'Misty keeps her own blue');
    for (const old of ['#7fe6ff\'', "'#5aa8ff'", "'#a98cff'", "'#ff80d6'", "'#ffcf7a'", "'#8ff0a0'", "'#5fe0c8'"]) assert.ok(!sc.slice(sc.indexOf('const SPC'), sc.indexOf('const SPK')).includes(old), 'old pastel ' + old);
    const rims = sc.match(/const RIMS = \[([^\]]*)\]/)[1].match(/'(\w+)'/g).map(x => x.slice(1, -1));
    const acc = sc.match(/const ACC = \[([^\]]*)\]/)[1].match(/'(\w+)'/g).map(x => x.slice(1, -1));
    assert.strictEqual(rims.length, 16);
    for (const k of Object.keys(B.PLANETS)) assert.ok(rims.includes(k), 'rim ' + k);
    assert.ok(rims.filter(k => k === 'brain' || k === 'misty').length >= 7, 'blues still lead: the galaxy keeps its blue air');
    assert.deepStrictEqual(acc.slice().sort(), Object.keys(B.PLANETS).sort());
    const used = [...sc.matchAll(/SPK\.(\w+)/g)].map(m => m[1]).concat([...sc.matchAll(/'(\w+)', '(\w+)'\]/g)].flatMap(m => [m[1], m[2]]).filter(k => !/^\d/.test(k)));
    for (const k of used) if (!['clone', 'white'].includes(k) && /^[a-z]+$/.test(k) && (k in B.GALAXY || ['cyan', 'blue', 'purple', 'teal', 'gold', 'magenta', 'green'].includes(k))) assert.ok(k in B.GALAXY, 'colour key exists: ' + k);
});

test('Scan liquid: only found products, each product once a day, five fill it, starts empty each day', () => {
    let s = {};
    const day = '2026-10-20';
    let r = SF.add(s, '4006040001234', day); assert.ok(r.added); s = r.store;
    r = SF.add(s, '4006040001234', day); assert.ok(!r.added, 'same product twice = once');
    r = SF.add(s, '', day); assert.ok(!r.added, 'no code = nothing');
    r = SF.add(s, 'abc', day); assert.ok(!r.added, 'not a barcode = nothing');
    assert.strictEqual(SF.count(s, day), 1);
    assert.strictEqual(SF.frac(1), 0.2); assert.strictEqual(SF.frac(5), 1); assert.strictEqual(SF.frac(9), 1); assert.strictEqual(SF.frac(0), 0);
    assert.strictEqual(SF.count(s, '2026-10-21'), 0, 'a new day starts empty');
    for (let i = 0; i < 20; i++) s = SF.add(s, '5000000000' + String(i).padStart(3, '0'), '2026-09-' + String(i + 1).padStart(2, '0')).store;
    assert.ok(Object.keys(s.days).length <= SF.KEEP_DAYS, 'keeps two weeks only');
    const before = JSON.stringify(s); SF.add(s, '7000000000001', day); assert.strictEqual(JSON.stringify(s), before, 'pure: input untouched');
});

test('Scan liquid is wired only where a product was found; the shop scan, notFound, errors and cancel never record', () => {
    const html = R('index.html');
    const f = html.slice(html.indexOf('async function found(code){'), html.indexOf('/* photo of a barcode */'));
    const shop = f.indexOf('LowiShopScan.found'), lookup = f.indexOf('await byBarcode(code)'), rec = f.indexOf('LowiScanFill.record(code)');
    assert.ok(shop > 0 && lookup > shop && rec > lookup, 'after the shop-scan return and after the lookup');
    assert.ok(/if \(p && !p\.notFound && window\.LowiScanFill\)/.test(f), 'only with a found product');
    assert.strictEqual(html.split('LowiScanFill.record(').length - 1, 1, 'recorded in one place only');
    assert.ok(!/LowiScanFill\.record/.test(html.slice(html.indexOf('function closeScanner'), html.indexOf('async function torch'))), 'closing the scanner records nothing');
    const ib = html.indexOf('src="brand-palette.js'), is = html.indexOf('src="scan-fill.js'), il = html.indexOf('src="living-bubbles.js'), io = html.indexOf('src="home-orbit-v2.js');
    assert.ok(ib > 0 && is > ib && il > is && io > is, 'loaded before the bubbles that read them');
    const sw = R('sw.js');
    assert.strictEqual(sw.split('"brand-palette.js"').length - 1, 2); assert.strictEqual(sw.split('"scan-fill.js"').length - 1, 2);
    const ho = R('home-orbit-v2.js');
    assert.ok(ho.includes("make('scan', words('scan')[0], '<span class=\"wh-cell-fill\"") && ho.includes('function paintScan()') && ho.includes("D.addEventListener('lowi:scan-fill', paintScan)"));
    assert.ok(!/make\('settings'[^\n]*wh-cell-fill/.test(ho), 'Settings stays dry');
    const sfx = R('scan-fill.js');
    assert.ok(!/\baward|\bxp\b|quota/i.test(sfx.replace(/\/\*[\s\S]*?\*\//g, '')), 'no reward, no XP, no quota in the code');
});
