'use strict';
/* Oct 16, 2026 (handoff task 1 rework): Community is the live world zoomed out into the Metabolic Spirit World, not a picture. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('no flat wallpaper: the picture files are gone, nothing loads or precaches them, Community shows the live world', () => {
    for (const f of ['metabolic-spirit-world.webp', 'metabolic-spirit-world-phone.webp', 'metabolic-spirit-world.jpg', 'metabolic-spirit-world-phone.jpg'])
        assert.ok(!fs.existsSync(path.join(__dirname, '..', 'spirit', f)), f + ' is not shipped');
    const sw = read('sw.js'), js = read('community-spirit.js'), css = read('community-spirit.css');
    assert.ok(!sw.includes('metabolic-spirit-world'), 'not precached');
    assert.ok(!/<picture|<img|metabolic-spirit-world|background-image/.test(js + css), 'no image layer');
    for (const f of ['community-spirit.js', 'community-spirit.css']) assert.ok(sw.includes('"' + f + '"'), f + ' in sw.js');
    const html = read('index.html');
    assert.match(html, /<link rel="stylesheet" id="cspCss" href="community-spirit\.css\?v=\d{8}-\d{6}">/);
    assert.match(html, /<script src="community-spirit\.js\?v=\d{8}-\d{6}"><\/script>/);
    /* the old rule that covered the live world on Community is gone */
    assert.ok(!css.includes('#bw3Back::after { opacity: 0; }'));
});

test('bottom layer of Community only: a readability veil over the live world, never takes a touch', () => {
    const js = read('community-spirit.js'), css = read('community-spirit.css');
    assert.ok(js.includes("D.getElementById('tab-foryou')") && js.includes('tab.insertBefore(layer, tab.firstChild)'), 'first child of the Community page, under everything of it');
    assert.match(css, /#tab-foryou > #cgSpirit \{ position: absolute; inset: 0; z-index: 0;[^}]*pointer-events: none !important;/);
    assert.ok(css.includes('.cg-spirit-veil') && /rgba\(3,8,24,\.\d+\)/.test(css));
    assert.match(css, /html\.cg-spirit-on #tab-foryou > \.ls-pager \{ z-index: 1; \}/, 'companions, chat and nav stay above it');
    assert.match(css, /prefers-reduced-motion: reduce\) \{ #cgSpirit \.cg-spirit-veil \{ transform: none !important;/);
    assert.ok(!/cgField|cg-body|#tab-home|wh-/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')));
    assert.ok(!/LowiCommunity\.|cg-body|innerHTML\s*=\s*''/.test(js.replace("'.cg-body'", '')), 'never rebuilds the companions');
});

test('the world goes on past the World Map: other bubbles linked by light threads, and Home re-layout never clamps it back', () => {
    const sc = read('body-world-3d-scene.js');
    assert.ok(sc.includes('function buildCosmos()') && sc.includes('function cosmosStep(t, dt)') && sc.includes("threads.name = 'cosmos-threads'"));
    assert.ok(sc.includes("const hiD = pastMap ? (outerD || 300) : next.maxD;") && sc.includes('rig.dist = homeRelayoutDist(prev, rig, HOME_OUT, rig.outerD)'), 'setMode(home) keeps the spirit-world distance'); /* Oct 24: rule moved into homeRelayoutDist */
    assert.ok(sc.includes("if (rig.mode === 'home' && rig.outer && (rig.dist >= rig.maxD * 0.999 && f > 1 || rig.dist > rig.maxD))"), 'pinch keeps going out');
});

test('Oct 22 2026: the old zoom stick / World map button is gone; double-tap and pinch still zoom', () => {
    const wh = read('world-home.js');
    assert.ok(!wh.includes('function wireStick(') && !wh.includes("btn('wh-zoom'") && !wh.includes('function zoomTap('));
    assert.ok(wh.includes('toggleZoom, zoomOutWhole'), 'the camera zoom used by double-tap stays exported');
});

test('the zoom out of our world brings it in from far away, and the way back reverses it', () => {
    const vm = require('vm');
    const els = {}; const mk = id => ({ id, style: { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } }, setAttribute() { }, isConnected: true, parentElement: null, firstChild: null });
    const tab = mk('tab-foryou'); tab.insertBefore = (el) => { el.parentElement = tab; tab.firstChild = el; };
    const H = { classList: { add() { } } };
    const D = { documentElement: H, readyState: 'complete', getElementById: id => id === 'tab-foryou' ? tab : (els[id] || null), createElement: () => { const e = mk('cgSpirit'); els.cgSpirit = e; return e; }, querySelector: () => null, addEventListener() { } };
    const W = { document: D, matchMedia: () => ({ matches: false }), setTimeout() { } };
    vm.runInNewContext(read('community-spirit.js'), { window: W, globalThis: W, MutationObserver: undefined });
    const S = W.LowiSpiritWorld; assert.ok(S);
    let prev = null;
    for (let i = 0; i <= 20; i++) { S.paint('out', i / 20); const L = els.cgSpirit, o = L.style.opacity === '' ? 1 : +L.style.opacity, s = +L.style['--sp-s'];
        if (prev) { assert.ok(o >= prev.o - 1e-9 && s <= prev.s + 1e-9, 'out: only ever fades in and shrinks toward 1'); assert.ok(Math.abs(o - prev.o) < 0.2, 'no pop'); }
        prev = { o, s }; }
    assert.ok(prev.o === 1 && Math.abs(prev.s - 1) < 0.001);
    S.paint('out', 0); assert.equal(+els.cgSpirit.style.opacity, 0, 'Home is still in view at the start: the picture is not a page laid on top');
    S.paint('in', 1); assert.equal(+els.cgSpirit.style.opacity, 0);
    const gz = read('galaxy-zoom.js');
    assert.ok(gz.includes('W.LowiSpiritWorld.paint(dir, k)') && gz.includes('W.LowiSpiritWorld.clear()'));
});

test('Today brings the camera back down into Misty\'s world; Community, Cook, Move and Scan pull out to the spirit world', () => {
    const b = read('body-world-3d.js');
    assert.ok(b.includes("if (commIn) { try { const WH = W.LowiWorldHome; if (WH && WH.state && !WH.state.pull && WH.pullOut) WH.pullOut(); }"));
    assert.ok(b.includes("const REALM = ['tab-foryou', 'tab-shelf', 'tab-move', 'tab-scan'];"), 'Community, Cook, Move and Scan share the pulled-out spirit world');
    assert.match(b, /const otherIn = !!\(w === true && t && t\.id !== 'tab-home' && REALM\.indexOf\(t\.id\) < 0/);
    assert.match(b, /const commIn = !!\(w === true && t && REALM\.indexOf\(t\.id\) >= 0/);
    assert.ok(b.includes("if (otherIn) { try { const WH = W.LowiWorldHome; if (WH && WH.state && WH.state.pull && WH.diveIn) WH.diveIn(); }"));
});
