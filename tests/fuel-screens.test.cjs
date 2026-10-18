'use strict';
/* fuel-screens (Oct 18, 2026): every screen the Fuel bubble opens is one panel family with one close control, sized to its
   content and docked beside Misty on wide screens; Swap works in two steps. Pure placement + source guards.
   Browser check on the live site: tests/fuel-screens-live.cjs. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const fsJs = read('fuel-screens.js');
const fsCss = read('fuel-screens.css');
const html = read('index.html');
const sw = read('sw.js');
const core = require('../fuel-screens.js');
const { dockSpot } = require('../misty-bloom.js');

const openSOS = html.slice(html.indexOf('function openSOS(c)'), html.indexOf('let sosT; function sosTimer()'));
const SOSsrc = html.slice(html.indexOf('const SOS = {'), html.indexOf('};', html.indexOf('const SOS = {')) + 2);

test('the Fuel screens are loaded once, right after the Home blooms (cook-shop + sym-home keep the pinned tail), and precached', () => {
    assert.strictEqual((html.match(/<link[^>]+href="fuel-screens\.css/g) || []).length, 1);
    assert.strictEqual((html.match(/<script src="fuel-screens\.js/g) || []).length, 1);
    const at = k => html.indexOf(k);
    assert.ok(at('<script src="home-blooms-v2.js') < at('id="fsCss"') && at('id="fsCss"') < at('<script src="fuel-screens.js'), 'after the Home blooms, css before js');
    assert.ok(at('<script src="fuel-screens.js') < at('id="gnCss"') && at('<script src="fuel-screens.js') < at('id="cshCss"'), 'before the glass-nav / cook-shop / sym-home tail that other tests pin');
    assert.ok(at('<script src="fuel-screens.js') > at('<script src="store-picks.js'), 'after the screens it styles');
    assert.ok(sw.includes('"fuel-screens.js"') && sw.includes('"fuel-screens.css"'));
});

test('each Fuel screen is recognised, other sheets are not', () => {
    const el = (o) => Object.assign({ classList: { contains: c => (o.cls || []).includes(c) }, querySelector: s => (o.has || []).some(h => s.includes(h)) ? {} : null }, o);
    assert.strictEqual(core.kindOf(el({ id: 'sos' })), 'swap');
    assert.strictEqual(core.kindOf(el({ id: 'sheet', has: ['#f2Sheet'] })), 'eat');
    assert.strictEqual(core.kindOf(el({ id: 'sheet' })), '', 'the host sheet with other content is left alone');
    assert.strictEqual(core.kindOf(el({ cls: ['r2-sh'], has: ['.sp-pick'] })), 'pick');
    assert.strictEqual(core.kindOf(el({ cls: ['r2-sh'], has: ['.sp-quick-log'] })), 'log');
    assert.strictEqual(core.kindOf(el({ cls: ['r2-sh'] })), '', 'Settings, Move and other R2 sheets keep their own look');
    assert.strictEqual(core.kindOf(el({ cls: ['stp-card'] })), '', 'Shop (Low-Spike Finds) keeps its own look until its close moves (second release)');
    assert.strictEqual(core.kindOf(null), '');
});

const misty = { l: 471, t: 230, r: 709, b: 470 };
test('iPad landscape: the panel docks beside Misty on the Fuel side, never over her, sized to its content', () => {
    const s = core.spot({ vw: 1180, vh: 820, top: 12, misty, bub: { x: 380, y: 200 }, natH: () => 360, dock: dockSpot });
    assert.strictEqual(s.mode, 'dock');
    assert.strictEqual(s.side, 'left');
    assert.ok(s.l >= 12 && s.l + s.w <= misty.l, 'left of Misty: ' + JSON.stringify(s));
    assert.strictEqual(s.h, 360, 'height = content, no empty space');
    assert.ok(s.t >= 12 && s.t + s.h <= 820 - 12);
});
test('iPad portrait: no room beside Misty, so the panel goes above or below her', () => {
    const m = { l: 245, t: 420, r: 575, b: 760 };
    const s = core.spot({ vw: 820, vh: 1180, top: 12, misty: m, bub: { x: 200, y: 330 }, natH: () => 380, dock: dockSpot });
    assert.strictEqual(s.mode, 'dock');
    assert.ok(s.side === 'above' || s.side === 'below');
    assert.ok(s.t + s.h <= m.t || s.t >= m.b, 'clear of Misty vertically: ' + JSON.stringify(s));
});
test('phones (and anything without Misty or the Fuel bubble) use the bottom sheet', () => {
    assert.strictEqual(core.spot({ vw: 390, vh: 844, misty, bub: { x: 100, y: 200 }, natH: () => 300, dock: dockSpot }).mode, 'sheet');
    assert.strictEqual(core.spot({ vw: 1180, vh: 820, misty: null, bub: { x: 100, y: 200 }, natH: () => 300, dock: dockSpot }).mode, 'sheet');
    assert.strictEqual(core.spot({ vw: 1180, vh: 820, misty, bub: null, natH: () => 300, dock: dockSpot }).mode, 'sheet');
    assert.strictEqual(core.spot({ vw: 1180, vh: 820, misty, bub: { x: 1, y: 1 }, natH: () => 300 }).mode, 'sheet', 'no dock helper loaded');
});

test('exactly one close control: the bottom-centre X hides while a Fuel panel is open, and second closes are hidden', () => {
    assert.ok(/html\.fs-open:root body :is\(#whX,[^)]*\)\s*\{\s*display:\s*none !important/.test(fsCss));
    assert.ok(/\.xbtn\.f2-x/.test(fsCss) && /\.pf-addx/.test(fsCss) && /\.ovhead \.xbtn/.test(fsCss));
    assert.ok(/:first-of-type\s*\{[^}]*top: -6px !important; right: -6px !important/.test(fsCss), 'one glass circle, top right');
});

test('the family reuses the Home bubble glass tokens without redefining them', () => {
    assert.ok(fsCss.includes('var(--wh-glass-wide') && fsCss.includes('var(--wh-glass-rim') && fsCss.includes('var(--wh-glass-bg'));
    assert.ok(!/--wh-glass-[a-z]+\s*:/.test(fsCss), 'never sets --wh-glass-* (owned by world-home / the liquid fill task)');
    assert.ok(!/\.wh-cell-fill/.test(fsCss), 'never touches the bubble fill');
    assert.ok(/height: auto !important;\s*min-height: 0 !important;/.test(fsCss), 'panels size to their content');
});

test('the fuel watcher has no subtree observer (the game toggles classes every frame)', () => {
    assert.ok(!/subtree:\s*true/.test(fsJs));
});

test('Swap step 1 asks "What are you craving?" with one tile per craving and no sideways chip row', () => {
    assert.ok(openSOS.includes('ask:"What are you craving?"') || html.includes('ask:"What are you craving?"'));
    assert.ok(/if \(!SOS\[c\]\)/.test(openSOS), 'no craving given = step 1');
    assert.ok(/class="fs-tile"[^']*data-act="sos" data-c="/.test(openSOS));
    assert.ok(!/hscroll/.test(openSOS), 'no horizontal chip row');
    for (const k of ['sweet', 'chocolate', 'salty', 'bread', 'fizzy']) assert.ok(new RegExp('\\b' + k + ':\\{l:').test(SOSsrc), k);
});

test('Swap step 2 is one card: Craving X -> have Y, a reason, I had it, Show another, and a small log link', () => {
    assert.ok(/fs-card/.test(openSOS) && /sosT_\("craving"\)/.test(openSOS) && /sosT_\("have"\)/.test(openSOS));
    assert.ok(/class="fs-why"/.test(openSOS));
    assert.ok(/data-act="sosbeat"/.test(openSOS) && /data-act="sosnext"/.test(openSOS) && /class="fs-link" data-act="sosgave"/.test(openSOS));
    assert.ok(/class="fs-link" data-act="sostimer"/.test(openSOS), 'the wave timer is a small link');
    assert.ok(html.includes('gave:"I ate the craving anyway, log it"'));
    assert.ok(/case "sosnext": sosI\+\+; openSOS\(sosC\); break;/.test(html));
    assert.ok(!/badge\(/.test(openSOS), 'no research tag (JA) on the screen');
    assert.ok(!/Do this now/.test(openSOS));
});

test('Swap keeps the same foods and the same XP rule', () => {
    assert.ok(SOSsrc.includes('["Greek yogurt, cinnamon & 5 raspberries"') && SOSsrc.includes('["Cocoa cottage cheese pudding"'));
    assert.ok(html.includes('if (sosN < 3) award(20, "Craving handled"'));
    const n = (SOSsrc.match(/\["[^"]+", "[^"]+"\]/g) || []).length;
    assert.strictEqual(n, 13);
    for (const L of ['de', 'es']) {
        const blk = html.slice(html.indexOf('  ' + L + ':{t:{close:'));
        const fixes = blk.slice(blk.indexOf('fix:{'), blk.indexOf('why:{')).match(/\["[^"]+", "[^"]+"\]/g) || [];
        assert.strictEqual(fixes.length, n, L + ' translates every existing fix, no more, no less');
    }
});

test('"I ate the craving anyway" opens the Fuel meal log, not the removed Today box', () => {
    assert.ok(/case "sosgave":[^\n]*LowiSpirit\.meal\(\)/.test(html));
});

test('What did you eat? shows XP once and never mentions the removed Today screen', () => {
    const eat = html.slice(html.indexOf('function stepEat(){'), html.indexOf('function chipsHTML(){'));
    assert.ok(!/xpPill\(/.test(eat), 'no XP pill on every row');
    assert.ok(/fs-xp f2-xpone/.test(eat));
    for (const s of ['back to Today', 'Back to Today', 'zurück zu Heute', 'Zurück zu Heute', 'volver a Hoy', 'Volver a Hoy']) assert.ok(!new RegExp(':"[^"]*' + s + '[^"]*"').test(html), s);
    assert.ok(html.includes('later:"Not now"') && html.includes('later:"Jetzt nicht"') && html.includes('later:"Ahora no"'));
});

test('Fuel bloom says Shop (not Snack) and the shop panel is titled Low-Spike Finds (E-man, Oct 18 evening)', () => {
    const hb = read('home-blooms-v2.js'), sp = read('store-picks.js');
    const snackRow = hb.split('\n').find(l => /id: 'snack'/.test(l)) || '';
    assert.ok(/label: T\('Shop', /.test(snackRow), 'the Fuel bloom option reads Shop');
    assert.ok(!/label: T\('Snack'/.test(hb), 'no Snack label left in the Fuel bloom');
    assert.ok(sp.includes("<h3>' + esc(T('Low-Spike Finds', "), 'the panel header reads Low-Spike Finds');
    assert.ok(/aria-label="' \+ esc\(T\('Low-Spike Finds', /.test(sp), 'the dialog is announced as Low-Spike Finds');
    assert.ok(!/<h3>' \+ esc\(T\('What can I buy here\?'/.test(sp), 'the old header is gone');
});

test('Fuel bloom shows Log meal as its own orb; holding Fuel no longer logs (E-man, Oct 18 evening)', () => {
    const hb = read('home-blooms-v2.js');
    const fuel = hb.slice(hb.indexOf("if (kind === 'fuel') {"), hb.indexOf("} else if (kind === 'water')"));
    assert.ok(/A\.push\(\{ id: 'log', label: T\('Log meal', /.test(fuel), 'a visible Log meal orb');
    assert.ok(/id: 'log'[^\n]*run: mealLog/.test(fuel), 'Log meal opens the existing meal log (LowiSpirit.meal)');
    const ids = (fuel.match(/id: '(\w+)'/g) || []).map(s => s.slice(5, -1));
    assert.deepStrictEqual([...new Set(ids)], ['step', 'log', 'snack', 'swap', 'cook'], "Today's step, Log meal, Shop, Swap, Cook");
    const down = hb.slice(hb.indexOf('function onDown(e)'), hb.indexOf('function onMove(e)'));
    assert.ok(!/mealLog\(\)/.test(down), 'no hold-to-log on Fuel');
    assert.ok(/kind !== 'move'\) return;/.test(down), 'only Move keeps a hold (today\'s moves)');
});

test('five Fuel orbs (with Log meal) still fan cleanly: on screen, clear of Misty, not overlapping (phone ring + iPad ring)', () => {
    const hbc = require('../home-blooms-v2.js');
    const inside = (p, orb, vw, vh) => p.x - orb / 2 >= 0 && p.y - orb / 2 >= 0 && p.x + orb / 2 <= vw && p.y + orb / 2 <= vh;
    const clearOf = (p, c, orb) => Math.hypot(p.x - c.x, p.y - c.y) >= c.r + orb / 2;
    const apart = (pts, orb) => pts.every((p, i) => pts.every((q, j) => i >= j || Math.hypot(p.x - q.x, p.y - q.y) >= orb));
    const phone = { vw: 390, vh: 844, m: { x: 195, y: 430, r: 85 }, b: { x: 52, y: 300, r: 38 }, orb: 72 };
    const L = hbc.layout(phone.b, phone.m, 5, phone.orb, phone.vw, phone.vh);
    assert.strictEqual(L.pts.length, 5);
    L.pts.forEach(p => { assert.ok(inside(p, phone.orb, phone.vw, phone.vh), 'phone inside'); assert.ok(clearOf(p, phone.m, phone.orb), 'phone clear of Misty'); });
    assert.ok(apart(L.pts, phone.orb), 'phone orbs apart');
    const m = { x: 590, y: 410, r: 120 };
    for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 4, b = { x: 590 + Math.cos(a) * 260, y: 410 + Math.sin(a) * 260, r: 48 };
        const Q = hbc.layout(b, m, 5, 84, 1180, 820);
        Q.pts.forEach(p => { assert.ok(inside(p, 84, 1180, 820), 'iPad inside ' + i); assert.ok(clearOf(p, m, 84), 'iPad clear of Misty ' + i); });
        assert.ok(apart(Q.pts, 84), 'iPad orbs apart ' + i);
    }
});
