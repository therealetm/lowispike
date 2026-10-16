'use strict';
/* Oct 16, 2026 (handoff task 1): E-man's Metabolic Spirit World picture behind Community only. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('the picture ships as compressed WebP (+ JPEG fallback) with a phone crop, and is precached for offline', () => {
    for (const f of ['metabolic-spirit-world.webp', 'metabolic-spirit-world-phone.webp', 'metabolic-spirit-world.jpg', 'metabolic-spirit-world-phone.jpg']) {
        const st = fs.statSync(path.join(__dirname, '..', 'spirit', f));
        assert.ok(st.size > 20000 && st.size < 400000, f + ' is a real, compressed file');
    }
    assert.ok(fs.statSync(path.join(__dirname, '..', 'spirit', 'metabolic-spirit-world-phone.webp')).size < fs.statSync(path.join(__dirname, '..', 'spirit', 'metabolic-spirit-world.webp')).size);
    const sw = read('sw.js');
    for (const f of ['community-spirit.js', 'community-spirit.css', 'spirit/metabolic-spirit-world.webp', 'spirit/metabolic-spirit-world-phone.webp']) assert.ok(sw.includes('"' + f + '"'), f + ' in sw.js');
    const html = read('index.html');
    assert.match(html, /<link rel="stylesheet" id="cspCss" href="community-spirit\.css\?v=\d{8}-\d{6}">/);
    assert.match(html, /<script src="community-spirit\.js\?v=\d{8}-\d{6}"><\/script>/);
});

test('bottom layer of Community only: full page, cover (never stretched), dark veil, never takes a touch', () => {
    const js = read('community-spirit.js'), css = read('community-spirit.css');
    assert.ok(js.includes("D.getElementById('tab-foryou')") && js.includes('tab.insertBefore(layer, tab.firstChild)'), 'first child of the Community page, under everything of it');
    assert.match(css, /#tab-foryou > #cgSpirit \{ position: absolute; inset: 0; z-index: 0;[^}]*pointer-events: none !important;/);
    assert.match(css, /object-fit: cover;/);
    assert.ok(css.includes('.cg-spirit-veil') && /rgba\(3,8,20,\.5\d?\)/.test(css));
    assert.match(css, /html\.cg-spirit-on #tab-foryou > \.ls-pager \{ z-index: 1; \}/, 'companions, chat and nav stay above it');
    assert.match(css, /prefers-reduced-motion: reduce\) \{ #cgSpirit \.cg-spirit-pan \{ transform: none !important;/);
    /* it does not touch the companions, Today or World Map */
    assert.ok(!/cgField|cg-body|#tab-home|wh-/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')));
    assert.ok(!/LowiCommunity\.|cg-body|innerHTML\s*=\s*''/.test(js.replace("'.cg-body'", '')), 'never rebuilds the companions');
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

test('Cook, Move and Scan keep Today\'s world: leaving Community brings the camera back down into Misty\'s world', () => {
    const b = read('body-world-3d.js');
    assert.match(b, /const otherIn = !!\(w === true && t && t\.id !== 'tab-home' && t\.id !== 'tab-foryou'/);
    assert.ok(b.includes("if (otherIn) { try { const WH = W.LowiWorldHome; if (WH && WH.state && WH.state.pull && WH.diveIn) WH.diveIn(); }"));
});
