'use strict';
/* Oct 16, 2026: the immersive Move workout player (move-player.css / move-player.js). Full screen over the living world,
   blue liquid glass, Misty does the moves with the working body parts glowing. Every player function stays. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function load(lang) {
    const cls = new Set();
    const doc = { documentElement: { lang: lang || 'en', classList: { add: (...c) => c.forEach(x => cls.add(x)), remove: (...c) => c.forEach(x => cls.delete(x)), contains: c => cls.has(c), toggle: () => {} } } };
    const win = { document: doc, matchMedia: () => ({ matches: false }) };
    win.window = win;
    vm.runInNewContext(read('move-player.js'), Object.assign(win, { performance: { now: () => 0 }, setTimeout, clearTimeout, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {} }));
    return win.LowiMovePlayer;
}
const playerHTML = () => { const h = read('index.html'); const a = h.indexOf('function playerHTML(){'); return h.slice(a, h.indexOf('const typeLabel = {warm:', a)); };

test('Move player: the new skin and logic load right after the Move picker', () => {
    const html = read('index.html');
    assert.match(html, /<link rel="stylesheet" id="mvdCss" href="move-durations\.css\?v=[\d-]+">\n<link rel="stylesheet" id="mvpCss" href="move-player\.css\?v=[\d-]+">\n<script src="move-player\.js\?v=[\d-]+"><\/script>/);
});

test('Move player: every control and readout is still there (same ids and actions)', () => {
    const p = playerHTML();
    for (const a of ['end-ask', 'sound', 'voice', 'add5', 'pause', 'skip', 'safe-x', 'end-keep', 'end-save']) assert.ok(p.includes('data-mv="' + a + '"'), a);
    for (const id of ['mv-left', 'mv-seg', 'mv-fig', 'mv-count', 'mv-safe', 'mv-type', 'mv-name', 'mv-block', 'mv-cue', 'mv-gear', 'mv-easy', 'mv-next', 'mv-bodywrap', 'mv-ms', 'mv-pp', 'mv-confirm', 'mv-confirm-t', 'mp-zone']) assert.ok(p.includes('id="' + id), id);
    assert.ok(p.includes('bodyStripHTML()'), 'IN YOUR BODY pill kept');
    assert.ok(p.includes('safetyChipText()'), 'safety tip kept');
    assert.ok(p.includes('mv-icon big r3w-add'), 'audio coach still finds +5');
    /* no dark slab: the layout is a transparent wrapper, the world shows through */
    assert.ok(p.includes('<div class="mp-veil" aria-hidden="true"></div><div class="mp-wrap">'));
});

test('Move player: the timer code calls the immersive layer at open, each frame, each block, and close', () => {
    const html = read('index.html');
    assert.ok(html.includes('P.fig = new Figure($("#mv-fig"));\n  if (window.LowiMovePlayer) LowiMovePlayer.open(el);'));
    assert.ok(html.includes('P.fig.draw(pose, P.paused ? 0 : clock, gear);\n  if (window.LowiMovePlayer) LowiMovePlayer.frame(P);'));
    assert.ok(html.includes('if (window.LowiMovePlayer) LowiMovePlayer.block(P, b, m, b.type === "rest");'));
    assert.ok(html.includes('const el = $("#mv-player"); if (window.LowiMovePlayer) LowiMovePlayer.close(el);'));
    /* a new IN YOUR BODY step glows the pill instead of covering the workout; the voice still reads it */
    const ms = html.slice(html.indexOf('function showMs('), html.indexOf('function showMs(') + 1600);
    assert.ok(ms.indexOf('LowiAudio.speak("In your body: "') < ms.indexOf('LowiMovePlayer.peek(); return;'));
    /* tapping the pill opens and closes the QUICK FUEL card */
    assert.match(html, /case "body-card": if \(P && P\.ms >= 0\) \{ const c = \$\("#mv-ms"\)[^\n]*classList\.contains\("on"\)\) \{ c\.classList\.remove\("on"\)[^\n]*else showMs\(P\.ms, false\); \} break;/);
});

test('Move player: every move in the library names the body parts it works', () => {
    const html = read('index.html'), MP = load();
    const a = html.indexOf('const MOVES = {'), b = html.indexOf('function gearLine(id)', a);
    const ids = [...html.slice(a, b).matchAll(/^ {2}([a-z_]+): /gm)].map(m => m[1]);
    assert.ok(ids.length > 30, 'found the library (' + ids.length + ')');
    for (const id of ids) {
        assert.ok(MP.MOVE_ZONE[id], 'zone for ' + id);
        assert.ok(MP.ZONE[MP.MOVE_ZONE[id]], 'known zone for ' + id);
    }
    assert.equal(MP.zoneOf('curl', {}, 'work'), 'biceps');
    assert.equal(MP.zoneLabel('biceps'), 'Biceps');
    assert.equal(MP.zoneOf('sit_stand', {}, 'work'), 'squat');
    assert.equal(MP.zoneOf('soleus', {}, 'work'), 'calves');
    assert.equal(MP.zoneOf('walk_easy', { base: 'walk' }, 'rest'), 'walk', 'a walking rest still works the legs');
    assert.equal(MP.zoneOf('rest_seat', { base: 'seat' }, 'rest'), 'rest');
    assert.equal(MP.zoneOf('brand_new', { arms: true, legs: true }, 'work'), 'all', 'unknown moves still get a sensible label');
    assert.equal(JSON.stringify(MP.ZONE.biceps.p), '["ua","fa"]');
    assert.equal(load('de').zoneLabel('calves'), 'Waden');
    assert.equal(load('es').zoneLabel('core'), 'Abdomen');
});

test('Move player: full screen and transparent over the living world, blue liquid glass', () => {
    const css = read('move-player.css');
    const root = css.slice(css.indexOf('html #app #mv-player.mp {'), css.indexOf('html #app #mv-player.mp.on {'));
    for (const d of ['left: 0 !important', 'right: 0 !important', 'border: 0 !important', 'box-shadow: none !important', 'background: transparent !important', 'border-radius: 0 !important']) assert.ok(root.includes(d), d);
    /* same recipe as Daily Quest and the weather pill */
    assert.ok(root.includes('linear-gradient(160deg, rgba(80, 170, 255, .12), rgba(18, 46, 104, .42))'));
    assert.ok(root.includes('--mp-blur: blur(14px) saturate(160%)'));
    /* the app underneath steps back, the world (#bw3Back) stays */
    assert.ok(css.includes('html.mp-on #app > :not(#mv-player):not(#bw3Back):not(#toast):not(canvas):not(#main)'));
    assert.ok(css.includes('html.mp-on #app > #main { visibility: hidden !important;'));
    assert.ok(css.includes('html.mp-on #app > #main #bw3Stage { visibility: visible !important; }'), 'the world stays lit when it lives inside Home');
    /* iPad and phone landscape: two columns; short phones: tighter */
    assert.ok(css.includes('@media (orientation: landscape) and (min-width: 700px)'));
    assert.ok(css.includes('@media (max-height: 720px)'));
    /* big tap targets mid-workout */
    assert.match(css, /\.mp-ctrl \.mv-play \{\s*width: 88px;/);
    assert.match(css, /\.mp-ctrl \.mv-icon \{\s*width: 66px;/);
    assert.match(css, /\.mp-top \.mv-icon \{\s*width: 48px;/);
});

test('Move player: Misty is the one moving, with the working parts glowing', () => {
    const js = read('move-player.js'), css = read('move-player.css');
    /* her own live Home artwork is cloned (face, colours, form, mood), ids made unique so gradients never clash */
    assert.ok(js.includes("D.querySelector('#spBubble .sp-home-herb svg.tmg-plant')"));
    assert.ok(js.includes('function uniq(svg)'));
    assert.ok(js.includes("'.cw-stars, .lh-reflection, .lh-pot, .cw-dock, .lh-care-fx, .lh-acc, .lh-pot-fx, .cw-pill, title'"));
    /* the old stick figure is hidden; Misty's own glass limbs do the move and the working parts glow (misty-limbs.test.cjs) */
    assert.ok(css.includes('#mv-fig.mpj-on > :not(.mpj) { display: none !important; }'));
    assert.ok(css.includes('#mv-fig:is(.mp-g-ua, .mp-g-fa) .mpj-arm .mpj-glow'));
    assert.ok(css.includes('filter: url(#mpHotF)'));
});

test('Move player: the world hook, warp in and out, reduced motion', () => {
    const js = read('move-player.js'), css = read('move-player.css');
    /* a future shared living-world layer takes over cleanly; until then the live 3D world flies out and back */
    assert.ok(js.includes("W.LowiLivingWorld.enter('move-player')"));
    assert.ok(js.includes("W.LowiLivingWorld.leave && W.LowiLivingWorld.leave('move-player')"));
    assert.ok(js.includes("r.mode === 'home' && (H.classList.contains('wb-on') || D.querySelector('#bw3Stage canvas'))"));
    assert.ok(js.includes('glide(saved.dist, saved.pitch, 1500)'), 'camera comes back where it was');
    assert.ok(js.includes("if (!ms || reduced()) { r.dist = to;"), 'reduced motion: no glide');
    assert.ok(css.includes("html.mp-noworld #app #mv-player.mp {"), 'no WebGL: a drawn glow, never black');
    assert.ok(css.includes('@keyframes mpWarp'));
    const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    assert.ok(rm.includes('.mp-veil::before { display: none; }'));
    assert.ok(rm.includes('animation: none !important'));
});
