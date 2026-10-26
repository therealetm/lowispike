'use strict';
/* BH-035 (bug hunt run 35, 26 Oct 2026): a double tap on "Profile" in Ranking's compare card opened the person's profile and closed it
   again at once. Found by playing the live build 20261026-071738 (BUGHUNT/playtest/probe-under-finger.cjs seeds 3501/3502, then
   probe-pf-dbl.cjs): the Profile button sits bottom centre, right where the one bottom-centre X (#whX, world-home.js) appears for
   every sheet. The first tap opened the profile sheet, the X turned on under the finger, and the 2nd tap 200-350 ms later pressed
   it (live Chromium 390: "rk-pf Open Amira's profile" then "#whX Close" 200 ms later; WebKit iPhone 13 the same with Reduce Motion).
   fresh-scrim (BH-025/028) only knows overlays that are new body children; #whX is made once and shown again, like a tab (BH-032).
   Rule: syncX calls LowiFreshScrim.mark(x) when the X turns on, so a real tap within 44 px of the tap that opened the sheet is
   swallowed for 400 ms. The legacy #sheetwrap (Fasting, notification settings) is reused the same way and is marked on a fresh open.
   A deliberate tap on the X after 400 ms, a tap elsewhere, keyboard and script clicks close as before. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* the real fresh-scrim.js in a small window */
function scrim() {
    let t = 1000; const winL = [];
    const body = { nodeType: 1 };
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); },
        MutationObserver: function () { this.observe = () => {}; } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body, addEventListener() {} }, Date });
    const node = (parent, cls) => ({ nodeType: 1, parentNode: parent, className: cls || '', hidden: true, style: { zIndex: '' }, getBoundingClientRect: () => ({ width: 64, height: 64 }) });
    const tap = (target, x, y, o = {}) => { const e = { target, isTrusted: o.trusted !== false, detail: o.detail == null ? 1 : o.detail, clientX: x, clientY: y, timeStamp: o.ts == null ? t : o.ts,
        prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
        winL.filter(l => l.type === 'click' && l.cap).forEach(l => l.f(e)); return e; };
    return { W, body, node, tap, at: ms => { t = 1000 + ms; } };
}
/* world-home.js syncX() itself, cut out of the file and run against stubs */
function syncXOf(k, x, state) {
    const src = read('world-home.js');
    const i = src.indexOf('    function syncX() {'), j = src.indexOf('\n    }\n', i);
    assert.ok(i > 0 && j > i, 'syncX found in world-home.js');
    const cls = new Set();
    const H = { classList: { toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); }, contains: c => cls.has(c) } };
    const ctx = { W: k.W, H, st: { today: false }, ensureX: () => x, topR2: () => state.sheet, topWorld: () => null, topHost: () => null, glassSheet() {},
        getComputedStyle: () => ({ zIndex: '9000' }), parseInt, String, Math };
    vm.runInNewContext(src.slice(i, j + 6) + '\nthis.syncX = syncX;', ctx);
    return ctx.syncX;
}
/* live Chromium 390: the compare card's Profile button and the X are both bottom centre, at (195, 797) */
function profileTap(k) {
    const x = k.node(k.body, 'wh-x'); k.body.x = x;
    const state = { sheet: null }, syncX = syncXOf(k, x, state);
    k.at(-12000); syncX(); /* the X was made long ago (first sheet of the session) and is hidden now */
    assert.strictEqual(x.hidden, true);
    const card = k.node(k.body, 'rk-lad-wrap rk-cmp-wrap'), pf = k.node(card, 'rk-pf');
    k.at(0); const first = k.tap(pf, 195, 797);
    state.sheet = k.node(k.body, 'r2-ov r3-ov'); k.at(30); syncX(); /* profile sheet open: the X turns on under the finger */
    assert.strictEqual(x.hidden, false, 'the X is shown for the profile sheet');
    return { x, first, syncX, state };
}

test('BH-035: the 2nd tap of a double tap on Profile does not press the bottom-centre X that just turned on under it', () => {
    for (const gap of [120, 200, 250, 350]) {
        const k = scrim(); const { x, first } = profileTap(k);
        assert.ok(!first.stopped, 'the first tap opens the profile');
        k.at(gap); const e = k.tap(x, 196, 795);
        assert.ok(e.prevented && e.stopped, 'gap ' + gap + ' ms: the X ignores it, the profile stays open');
    }
});

test('BH-035: the X still closes: a deliberate tap after 400 ms, a tap off the spot, keyboard and script clicks', () => {
    const k = scrim(); const { x } = profileTap(k);
    k.at(460); assert.ok(!k.tap(x, 195, 797).stopped, 'same spot after the window');
    const k2 = scrim(); const r2 = profileTap(k2);
    k2.at(150); assert.ok(!k2.tap(r2.x, 195, 797, { detail: 0 }).stopped, 'Enter / Space');
    k2.at(160); assert.ok(!k2.tap(r2.x, 195, 797, { trusted: false }).stopped, 'element.click()');
    const k3 = scrim(); const r3 = profileTap(k3);
    k3.at(150); assert.ok(!k3.tap(r3.x, 120, 700).stopped, 'a tap 75 px away is not the double tap');
});

test('BH-035: only turning on marks the X: syncX polling while it stays on does not restart the window', () => {
    const k = scrim(); const { x, syncX } = profileTap(k);
    k.at(380); syncX(); syncX(); /* the 700 ms poll and observers call it again */
    k.at(460); assert.ok(!k.tap(x, 195, 797).stopped, 'window counted from when it turned on');
});

test('BH-035: the X shown again for a sheet opened by a script (no recent tap) is never guarded', () => {
    const k = scrim(); const x = k.node(k.body, 'wh-x'); const state = { sheet: null }, syncX = syncXOf(k, x, state);
    k.at(-12000); syncX();
    k.at(0); state.sheet = k.node(k.body, 'r2-ov'); syncX();
    k.at(100); assert.ok(!k.tap(x, 195, 797).stopped, 'no opening tap to protect');
});

test('BH-035: the compare card acts only while it is the open one: a double tap on Profile opens one profile, not two', () => {
    const src = read('ranking.js');
    const i = src.indexOf('function openCmp('), j = src.indexOf("else if (a === 'profile')", i);
    assert.ok(i > 0 && j > i, 'openCmp and its Profile action found');
    const h = src.slice(src.indexOf("el.addEventListener('click', e => {", i), j);
    assert.match(h, /^el\.addEventListener\('click', e => \{[\s\S]*?if \(el !== cmpEl\) return;[\s\S]*?if \(e\.target === el\) \{ closeCmp\(\); return; \}/,
        'the closing card (still on screen for 220 ms) ignores the 2nd tap before any action runs');
    assert.match(src.slice(src.indexOf('function closeCmp('), i), /cmpEl = null;[\s\S]*?setTimeout\(\(\) => \{ try \{ el\.remove\(\); \} catch \(e\) \{ \} \}, 220\)/, 'closeCmp clears cmpEl before the card leaves');
});

test('BH-035: the legacy #sheetwrap backdrop is marked when sheet() opens it fresh', () => {
    const src = read('index.html');
    const i = src.indexOf('function sheet(html){'), j = src.indexOf('\n', i);
    const fn = src.slice(i, j);
    assert.ok(i > 0, 'sheet() found');
    assert.match(fn, /fresh\s*&&[^;]*LowiFreshScrim[^;]*\.mark\(\$\("#sheetwrap"\)\)/, 'a fresh open marks #sheetwrap');
});
