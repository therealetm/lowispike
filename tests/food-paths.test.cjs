'use strict';
/* Oct 19 food paths (E-man: Scan / Gap / Fuel / Cook / Shop were "kind of redundant ... fix it logically so that that makes sense
   and not so confusing") + the grocery discovery rule (Catch only for products not in the community database yet, first finder
   gets a Pathfinder badge and a one-time capped XP bonus, no farming). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');

const cardSrc = html.slice(html.indexOf('const SC_TX = {'), html.indexOf('function actsHTML(p)'));
function card(opts) {
    opts = opts || {};
    const ctx = {
        LI: () => opts.lang || 0, esc: s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]),
        t: k => k, isMine: () => !!opts.mine, D: { mine: {}, pf: opts.pf || {} }, pkey: p => p.barcode, whyText: w => String(w), CAT_E: { other: '?' },
        factsHTML: () => '', fillNoteHTML: () => '', LowiDeals: { cardHTML: () => '' }, LOWI_SHELF: { priceCompareHTML: () => '' },
        LowiMealSlot: opts.slot ? { slot: 'lunch', at: Date.now() } : null,
        LowiScanMeal: !!opts.slot /* Oct 21: openScanner sets it only when Log meal's own Scan button opened the camera */
    };
    ctx.window = ctx;
    if (opts.shop) ctx.CAM = { shop: true };
    vm.createContext(ctx);
    vm.runInContext(cardSrc + '\nthis.out = simpleCardHTML(P); this.K = {eanOk, pfUseful, pfVerifiable, pfToday, pfCountText};', Object.assign(ctx, { P: opts.p }));
    return ctx;
}
const OFF = { name: 'Bio Haferflocken', brand: 'Kölln', barcode: '4000540000108', verdict: 'ok', why: ['fiber'], facts: { c: 58, s: 1.2, f: 10, p: 13 }, source: 'off' };

test('barcode check digit: real EAN-13 / EAN-8 / UPC pass, made-up or repeated digits fail', () => {
    const K = card({ p: OFF }).K;
    for (const ok of ['4006381333931', '4000540000108', '96385074', '036000291452']) assert.equal(K.eanOk(ok), true, ok);
    for (const bad of ['4006381333932', '0000000000000', '1111111111111', '123', '', 'abc', '40063813339312345']) assert.equal(K.eanOk(bad), false, bad);
});

test('Pathfinder only for products that are new, from Open Food Facts for that barcode, with a real name and real facts', () => {
    const K = card({ p: OFF }).K;
    assert.equal(K.pfVerifiable(OFF), true);
    assert.equal(K.pfVerifiable({ ...OFF, id: 'abc' }), false, 'already in the community database');
    assert.equal(K.pfVerifiable({ ...OFF, source: 'manual', manual: true }), false, 'typed in by hand');
    assert.equal(K.pfVerifiable({ ...OFF, barcode: '4000540000109' }), false, 'bad check digit');
    for (const junk of ['', 'ab', 'test', 'Test product', 'asdf', '12345', '???', 'Product']) assert.equal(K.pfVerifiable({ ...OFF, name: junk }), false, 'junk name ' + junk);
    assert.equal(K.pfVerifiable({ ...OFF, facts: { c: 3 } }), false, 'one number is not enough');
    assert.equal(K.pfVerifiable({ ...OFF, facts: {}, ingredients: 'Haferflocken (100 %)' }), true, 'ingredients are enough');
    assert.equal(K.pfVerifiable({ ...OFF, verdict: 'unknown' }), false);
});

test('product already in LOWiSPIKE: information only, no Catch; the first finder shows as Pathfinder', () => {
    const h = card({ p: { ...OFF, id: 'p1', byName: 'Eman' } }).out;
    assert.ok(!h.includes('data-b3="catch"'), 'no Catch for a known product');
    assert.match(h, /class="sc-known">Already in LOWiSPIKE <span class="sc-pf">Pathfinder: Eman<\/span>/);
    assert.ok(!h.includes('data-b3="eat"'), 'Oct 21: a scan from the Scan tab only identifies');
    assert.match(card({ p: { ...OFF, id: 'p1', byName: 'Eman' }, slot: true }).out, /data-b3="eat">I ate this · log it</);
});

test('new verified product: "Be the first to add it" with the Pathfinder bonus; the bonus line drops after 3 today', () => {
    let h = card({ p: OFF }).out;
    assert.match(h, /data-b3="catch" id="b3Catch">.*Be the first to add it <small>Pathfinder badge · \+100 XP<\/small>/);
    const now = Date.now(), pf = { a: { ts: now, xp: 100 }, b: { ts: now, xp: 100 }, c: { ts: now, xp: 100 } };
    h = card({ p: OFF, pf }).out;
    assert.match(h, /Be the first to add it <small>Pathfinder badge<\/small>/);
    assert.ok(!/\+100 XP/.test(h));
    h = card({ p: OFF, lang: 1 }).out; assert.match(h, /Füg es als Erste:r hinzu/);
    h = card({ p: OFF, lang: 2 }).out; assert.match(h, /Sé el primero en añadirlo/);
});

test('new but unverifiable product: saved on the phone only, and the card says why there is no Pathfinder', () => {
    const h = card({ p: { ...OFF, source: 'manual' } }).out;
    assert.match(h, /Not in LOWiSPIKE yet<small>We couldn't check this barcode/);
    assert.match(h, /data-b3="catch" id="b3Catch">Save it</);
});

test('checking vs eating: "I ate this" only when Log meal opened the camera, never from Scan or the shopping camera (Oct 21 Scan / Fuel / Gap)', () => {
    let h = card({ p: OFF }).out;
    assert.ok(h.includes('data-b3="catch"') && !h.includes('data-b3="eat"'), 'checking: Scan identifies, no meal log');
    h = card({ p: OFF, slot: true }).out;
    assert.ok(h.indexOf('data-b3="eat"') < h.indexOf('data-b3="catch"'), 'logging: I ate this first');
    assert.match(h, /sc-eat pri" data-b3="eat"/);
    h = card({ p: OFF, shop: true, slot: true }).out;
    assert.ok(!h.includes('data-b3="eat"'), 'a shopping scan never logs a meal');
});

test('Pathfinder XP: once per barcode, stable event id, at most 3 paid per day, nothing for re-adding', () => {
    const src = html.slice(html.indexOf('const PF_XP = 100'), html.indexOf('/* Oct 19 food paths: checking a product')) + html.slice(html.indexOf('function pfAward(p)'), html.indexOf('async function doCatch(p)'));
    const calls = [];
    const ctx = { D: { pf: {} }, save: () => {}, window: {}, LowiHost: { award: (s, _, o) => { calls.push([s, o]); return o.amt; } } };
    ctx.window.LowiHost = ctx.LowiHost; vm.createContext(ctx);
    vm.runInContext(src + '\nthis.pfAward = pfAward;', ctx);
    assert.equal(ctx.pfAward({ barcode: '4000540000108', name: 'A' }), 100);
    assert.equal(ctx.pfAward({ barcode: '4000540000108', name: 'A again' }), 0, 'same barcode never pays twice');
    assert.equal(ctx.pfAward({ barcode: '4006381333931', name: 'B' }), 100);
    assert.equal(ctx.pfAward({ barcode: '96385074', name: 'C' }), 100);
    assert.equal(ctx.pfAward({ barcode: '036000291452', name: 'D' }), 0, 'fourth today: badge, no XP');
    assert.ok(ctx.D.pf['036000291452'], 'the badge is still recorded');
    assert.deepEqual(calls.map(c => c[1].eventId), ['pathfinder:4000540000108', 'pathfinder:4006381333931', 'pathfinder:96385074']);
    assert.ok(calls.every(c => c[0] === 'scan:pathfinder' && c[1].perDay === 300));
});

test('publishing a new product is gated: verified only, unique barcode decides who was first, manual entries stay drafts', () => {
    assert.match(html, /if \(!p\.id && !pfVerifiable\(p\)\) \{ D\.mine\[k\] = Object\.assign\(slim\(p\), \{ts:Date\.now\(\), pending:false, localDraft:true, first:false\}\); save\(\); return \{pending:true, first:false, draft:true\}; \}/);
    assert.match(html, /if \(!pfVerifiable\(p\)\) throw new Error\("Unverified product; saved as a local draft\."\);/);
    assert.match(html, /if \(r\.error\) \{ const r2 = await c\.from\("products"\)\.select\("id"\)\.eq\("barcode", ins\.barcode\)/);
    assert.match(html, /let cxp = 0; if \(first\) cxp = pfAward\(/);
});

test('Scan camera: no Shopping switch; shopping only in the camera opened from Shop', () => {
    assert.match(html, /\(window\.LowiShopScan && mode === "shop" \? LowiShopScan\.pill\(\) : ""\)/);
    assert.match(html, /if \(window\.LowiShopScan\) shopMode\(mode === "shop" \? LowiShopScan\.want\(mode\) : false\);/);
    assert.ok(!/LowiShopScan \? LowiShopScan\.pill\(\)/.test(html));
});

test('Shop sheet: plain "Scan in the shop" and "Shopping list" buttons, in three languages', () => {
    const sp = read('store-picks.js');
    /* Oct 27 2026 (test changed, why): Emmanuel found Supermarket "so overwhelming", so Scan in the shop is the one big button,
       pinned in the bottom bar next to the X, and the Cart is a quiet round button in the title row (tests/shop-calm.test.cjs) */
    assert.match(sp, /footBtns\(scanBtn\(\)\)\);/, 'Supermarket: Scan in the shop sits in the bottom bar');
    assert.match(sp, /: scanBtn\(\)\)\);/, 'store picker: Scan in the shop sits in the bottom bar while no shop is picked');
    assert.match(sp, /T\('Scan in the shop', 'Im Laden scannen', 'Escanear en la tienda'\)/);
    /* Oct 26 (MAYA-HANDOFF 0.22): the Shopping list pill became the Cart (Warenkorb / Carrito); its sheet has Go shopping (the same list in shop mode) */
    assert.match(sp, /T\('Cart', 'Warenkorb', 'Carrito'\)/);
    assert.match(sp, /T\('Go shopping', 'Einkaufen gehen', 'Ir a comprar'\)/);
    assert.match(sp, /if \(a === 'scanshop'\) \{ close\(\); setTimeout\(\(\) => \{ try \{ W\.LowiShopScan\.open\(\); \}/);
    assert.match(sp, /if \(a === 'mylist'\) \{ close\(\); setTimeout\(\(\) => \{ try \{ W\.tdShopOpen\(\); \}/);
});

test('plain words: no "Hunt" / "Cart" jargon, and no insulin claims in the shopping strings', () => {
    const gh = read('grocery-hunt.js'), core = read('shop-scan-core.js'), sp = read('store-picks.js');
    assert.ok(!/T\('[^']*\b(Hunt|hunt)\b/.test(gh), 'no Hunt in English UI strings');
    assert.ok(!/'[^']*\b(Jagd|caza)\b[^']*'/.test(gh), 'no Jagd / caza');
    assert.ok(!/Healthy days start at the shop/.test(gh));
    assert.match(gh, /T\('Shop finds', 'Ladenfunde', 'Hallazgos en la tienda'\)/);
    assert.match(core, /cart: \['Shopping list', 'Einkaufsliste', 'Lista de compra'\]/);
    /* 27 Oct 2026 (Emmanuel): the one verdict is Insulin-friendly / Not insulin-friendly everywhere */
    assert.match(html, /spike: \["Not insulin-friendly", "Nicht insulinfreundlich", "No apto para la insulina"\]/);
});

test('Gap "I just ate" / "I ate earlier" open the one shared meal logger, optional, keeping the time', () => {
    /* Oct 28 slim structure batch 4: every start, also {own:true}, opens the one logger */
    assert.match(html, /function start\(o\)\{ o = o \|\| \{\};\n[^\n]*\n[^\n]*\n  if \(startShared\(o\)\) return;/);
    assert.match(html, /window\.LowiMealCtx = \{from:"gap", at:Date\.now\(\), ateAt:\+\(o\.at \|\| \(fast && fast\.e\) \|\| Date\.now\(\)\)\};\n  try \{ LowiSpirit\.meal\(\); \}/);
    assert.match(html, /if \(fast && !d\.spike && !d\.dup\)/, 'break-fast bonus still for a real meal');
    const sp = read('spirit.js');
    assert.match(sp, /gapQ: \['Fast ended and points saved\. Want to add what you ate\? A photo or a few words, or skip\.', 'Fasten beendet, Punkte gespeichert\./);
    assert.match(sp, /else if \(a === 'gapskip'\) \{ window\.LowiMealCtx = null;/);
    assert.match(sp, /K\.slotFor \? K\.slotFor\(gc \? gc\.ateAt : undefined\)/);
    /* a meal logged right after "I ate earlier" keeps that time, same day only, once */
    assert.match(html, /mts-at<18\*3600000&&new Date\(at\)\.toDateString\(\)===new Date\(mts\)\.toDateString\(\)\)\)\{mts=at;ateSet=1;\}window\.LowiMealCtx=null;/);
    /* Oct 28 (Antje): a time from the meal time chooser ("when") holds an hour, may be up to 7 days back, and the meal goes on that day */
    assert.match(html, /mc\.from==="gap"&&Date\.now\(\)-mc\.at<20\*60000\|\|mc\.from==="when"&&Date\.now\(\)-mc\.at<60\*60000/, 'Oct 21: Log meal\'s "When did you eat?" backdates the same way');
    assert.match(html, /mc\.from==="when"\?mts-at<=7\*864e5\+60000:/);
    assert.match(html, /log=\{id:data\.id,eventId:id,ts:mts,day:mday,/);
});

test('a meal log with no clock starts it; with a clock running it ends the fast through the one rule (shopping scans do not log at all)', () => {
    assert.match(html, /function firstMeal\(at\)\{ const s = st\(\); if \(startOf\(s\)\) return false;/);
    assert.match(html, /if \(!start\) \{ const ok = firstMeal\(t\);[^\n]*return ok \? \{first:true\} : null; \}/);
});

test('the Pathfinder badge counts every product you found first, in three languages', () => {
    let K = card({ p: { name: 'x' } }).K;
    assert.equal(K.pfCountText(), 'Pathfinder badge · your first find');
    const pf = { a: { ts: 1, xp: 100 }, b: { ts: 2, xp: 0 }, c: { ts: 3, xp: 100 } };
    K = card({ p: { name: 'x' }, pf }).K;
    assert.equal(K.pfCountText(), 'Pathfinder badge · 3 found first', 'past the daily cap still counts');
    const tx = html.slice(html.indexOf('pfCount:'), html.indexOf('pfCount1:'));
    assert.equal((tx.match(/\{n\}/g) || []).length, 3, 'EN, DE and ES all show the number');
    assert.match(html, /\(first \? '<div class="sc-pfn">' \+ esc\(pfCountText\(\)\)/, 'shown on the You\'re the Pathfinder screen');
});
