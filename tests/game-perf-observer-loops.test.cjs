/* Oct 18 game-perf: guards for the observer loops that ran on every frame and heated the phone.
   Loop 1 (fixed in 20261018-000407): Care board line rewritten -> spirit.js swapped the emoji -> rewritten again.
   Loop 2 (fixed here): after Cook or Community, the fit passes stripped and re-added their level classes on <html>, the top bar
   and the back bar rewrote unchanged attributes and text, and ~20 body observers scheduled a frame each time, on every frame,
   on Home too and with the phone locked. These tests keep the writers guarded and keep the soak budgets honest. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const budget = require('../tools/soak/budget.cjs');
const fixture = f => JSON.parse(read('tests/fixtures/' + f));

test('soak budgets catch the Care board loop measured before 20261018-000407', () => {
    const broken = budget.check(fixture('game-soak-20261017-care-loop.json'));
    assert.ok(broken.some(b => /^care-board-month: .*every frame/.test(b)), broken.join('\n'));
});

test('soak budgets catch the Community/Cook loop measured on 20261018-000407', () => {
    const broken = budget.check(fixture('game-soak-20261018-000407.json'));
    for (const s of ['community-open', 'community-galaxy-zoom-x20', 'back-home-idle']) {
        assert.ok(broken.some(b => b.startsWith(s + ': ') && /every frame|per frame/.test(b)), s + ' should break the frame-loop budget\n' + broken.join('\n'));
    }
    assert.ok(broken.some(b => /^hidden-tab: /.test(b)), 'the loop kept running while hidden');
});

test('soak budgets pass for the measured game-perf build', () => {
    assert.deepStrictEqual(budget.check(fixture('game-soak-game-perf.json')), []);
});

test('budget rules: extra WebGL context, GPU growth on a repeat visit and per-frame canvas uploads are flagged', () => {
    const s = { rafByAll: [['body-world-3d-scene.js:690', 60]], rafPerSec: 60, ctxAliveGL: 2, glBy: ['a', 'b'], liveDelta: { tex: 3, buf: 0, prog: 0, fb: 0, rb: 0 }, canvasTexUploadsPerSec: 60, unchangedWritesPerSec: 0, writesPerSec: 0 };
    const broken = budget.check({ scenarios: { 'home-community-x6': s } });
    assert.ok(broken.some(b => /live WebGL contexts/.test(b)));
    assert.ok(broken.some(b => /GPU objects grew/.test(b)));
    assert.ok(broken.some(b => /uploaded as a texture/.test(b)));
});

test('back bar writes its words and label only when they change, compared with what it last wrote', () => {
    const src = read('nav-moves.js');
    const body = src.slice(src.indexOf('function layer('), src.indexOf('return L;', src.indexOf('function layer(')));
    assert.ok(body.length > 50, 'layer() found');
    assert.ok(!/\)\.textContent\s*=\s*s\.(back|label)\(\)/.test(body), 'no unguarded textContent write from s.back()/s.label()');
    assert.ok(/__nmW !== back/.test(body) && /__nmW !== label/.test(body) && /__nmAria !== label/.test(body), 'guards compare with the last written value');
});

test('theme button attributes are written only when they change', () => {
    const src = read('top-bar.js');
    const body = src.slice(src.indexOf('function paintBtn'), src.indexOf('function paintBtn') + 1200);
    assert.ok(!/^\s*btn\.setAttribute\('aria-pressed'/m.test(body), 'aria-pressed write is guarded');
    assert.ok(/getAttribute\('aria-pressed'\) !== pr/.test(body) && /dataset\.mode !== md/.test(body));
});

test('every fit pass that strips level classes off <html> first skips when nothing changed since its last fit', () => {
    const html = read('index.html');
    const strips = html.match(/function fit\(\w\)\{\n(?:.*\n){0,3}?.*LV\.forEach\(c => H\.classList\.remove\(c\)\); H\.classList\.remove\("g2f-sn\w"\);/g) || [];
    assert.strictEqual(strips.length, 3, 'three fit passes (Today, Cook, Profile)');
    strips.forEach(f => assert.ok(/[fF]itKey && \w*[fF]itSig\(\w\) === \w*[fF]itKey\) return;/.test(f), 'skip-when-unchanged first:\n' + f));
    assert.strictEqual((html.match(/\b\w*[fF]itKey = \w*[fF]itSig\(\w\);/g) || []).length, 3, 'each fit records its signature at the end');
});

test('per-frame writes on <html> are guarded: --wh-far and the Profile colour', () => {
    assert.ok(/getPropertyValue\('--wh-far'\) !== fv\) H\.style\.setProperty\('--wh-far', fv\)/.test(read('world-home.js')));
    const sp = read('spirit.js');
    assert.ok(!/^\s*by\.style\.setProperty\('--sp-sign'/m.test(sp), '--sp-sign on the profile is guarded');
});

/* Loop 3 (WebKit visible-again budget): the 700 ms Home tick and the 500 ms controller tick rewrote unchanged attributes and
   variables on <html> and the HUD, so every body observer (Daily Quest, workout badges, Cook, the fit passes...) scheduled a
   frame about twice a second; in WebKit, coming back to the tab, that was ~30 extra callbacks/s for a ~5/s world. */
test('Home tick writes the aura, the water cell and the close button only when they change', () => {
    const src = read('world-home.js');
    const aura = src.slice(src.indexOf('function applyAura()'), src.indexOf('function applyAura()') + 600);
    assert.ok(!/^\s*H\.dataset\.whAura = a\.id;/m.test(aura) && /H\.dataset\.whAura !== a\.id/.test(aura), 'data-wh-aura guarded');
    assert.ok(/getPropertyValue\('--wh-aura-a'\) !== a\.a/.test(aura) && /getPropertyValue\('--wh-aura-b'\) !== a\.b/.test(aura), 'aura colours guarded');
    assert.ok(!/^\s*wc\.setAttribute\('aria-label'/m.test(src), 'water cell aria-label guarded');
    assert.ok(/wc\.style\.getPropertyValue\('--wh-fill'\) !== fv/.test(src), 'water fill guarded');
    assert.ok(!/^\s*x\.hidden = !on;/m.test(src) && /if \(x\.hidden !== !on\) x\.hidden = !on;/.test(src), 'close button hidden guarded');
});

test('controller anchor, Cook For You switch and Today more/less button write attributes only on change', () => {
    assert.ok(/if \(b\.dataset\.anchor !== an\) b\.dataset\.anchor = an;/.test(read('misty-pad.js')), 'misty-pad data-anchor guarded');
    const nm = read('nav-moves.js'), marks = nm.slice(nm.indexOf('function marks()'), nm.indexOf('function marks()') + 400);
    assert.ok(/getAttribute\('aria-selected'\) !== as/.test(marks), 'ck-fy aria-selected guarded');
    assert.ok(/if \(b\.getAttribute\("aria-expanded"\) !== ae\) b\.setAttribute\("aria-expanded", ae\);/.test(read('index.html')), 'g1-more aria-expanded guarded');
});

test('Daily Quest board repaints only when its own markup changes, compared with what it last wrote', () => {
    const html = read('index.html');
    const p = html.slice(html.indexOf('function paint(){ let r; try { r = html(); }'), html.indexOf('/* ---------- where each quest takes you'));
    assert.ok(p.length > 50, 'Daily Quest paint() found');
    assert.ok(!/b\.innerHTML !== h/.test(p), 'no comparison with the board text on screen (spirit.js swaps its emoji)');
    assert.ok(/b\.__f3H !== h/.test(p) && /b\.__f3H = h/.test(p), 'compares with the last markup written');
    assert.ok(/getAttribute\("aria-label"\) !== al/.test(p), 'aria-label guarded');
});

test('soak tool files are present and parse', () => {
    new Function(read('tools/soak/probe.js'));
    assert.ok(/require\('\.\/budget\.cjs'\)/.test(read('tools/soak/game-soak.cjs')));
});
