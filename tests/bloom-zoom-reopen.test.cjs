'use strict';
/* Nov 5 2026 (Emmanuel, iPhone screenshots after build 20261105-142344): "when pressing on the joystick, I like how it looks. It's all
   very symmetrical, circle, but then individually when you open these, why is it broken? ... The logic needs to be fused together."
   1. The break: closing a bloom eases the ring back over 0.5 s; a bloom opened inside that half second measured the HUD while it was
      still scaled, so the new zoom shrank round the wrong point and the ring sat up-left of its own orbs (the browser showed 23 px
      left, 46 px up; his screenshots about 14 x 23 pt). bloom-ring.js zoom now keeps the origins it measured unscaled while the ring
      eases back round the same centre. Run on a small fake page whose HUD box follows its scale like a browser's (with a transition
      still running).
   2. One logic for every bubble: a group that is not on the all-bubbles circle (Gap, Einkaufen) opens on that same circle (same
      centre, zoom, radius, orb size and spacing), centred on its own bubble (bloom-ring.js along; home-blooms-v2.js render). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const R = require('../bloom-ring.js');

/* ---------- a fake page: the HUD's on-screen box follows its scale round its transform-origin, like the CSS scale property ---------- */
function page() {
    const timers = []; let clock = 0, tid = 0;
    const cls = new Set();
    const H = { classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) }, appendChild() { } };
    const LAYOUT = { x: 0, y: 0, w: 390, h: 844 };
    const hud = { id: 'whHud', rendered: null };
    const map = {};
    const key = k => ({ 'transform-origin': 'transformOrigin' })[k] || k;
    hud.style = new Proxy({}, {
        get(t, k) {
            if (k === 'setProperty') return (n, v) => { map[key(n)] = String(v); };
            if (k === 'removeProperty') return n => { delete map[key(n)]; if (key(n) === 'scale') hud.rendered = null; };
            return map[k] !== undefined ? map[k] : '';
        },
        set(t, k, v) { map[k] = String(v); return true; }
    });
    /* the scale on screen right now: a transition still running (rendered), else the style's own value */
    const shown = () => (hud.rendered != null ? hud.rendered : (parseFloat(map.scale) || 1));
    const origin = () => (map.transformOrigin || '0px 0px').split(' ').map(parseFloat);
    hud.getBoundingClientRect = () => { const k = shown(), o = origin(), left = LAYOUT.x + o[0] * (1 - k), top = LAYOUT.y + o[1] * (1 - k); return { left, top, width: LAYOUT.w * k, height: LAYOUT.h * k, right: left + LAYOUT.w * k, bottom: top + LAYOUT.h * k }; };
    /* where a point of the unscaled HUD (local px) ends up on screen with the scale and origin now in the style */
    hud.screenOf = (p) => { const k = parseFloat(map.scale) || 1, o = origin(); return { x: LAYOUT.x + o[0] + k * (p.x - o[0]), y: LAYOUT.y + o[1] + k * (p.y - o[1]) }; };
    const D = {
        documentElement: H, head: H,
        getElementById: id => (id === 'whHud' ? hud : null),
        querySelector: () => null, createElement: () => ({ setAttribute() { } }), addEventListener() { }
    };
    const W = {
        document: D, innerWidth: 390, innerHeight: 844,
        matchMedia: () => ({ matches: false }), addEventListener() { }, dispatchEvent() { },
        setTimeout(f, ms) { timers.push({ id: ++tid, at: clock + (+ms || 0), f }); return tid; }, clearTimeout(id) { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); }
    };
    W.window = W;
    const ctx = vm.createContext(Object.assign(W, {
        getComputedStyle: el => ({ transform: 'none', transformOrigin: el.style.transformOrigin || '0px 0px', getPropertyValue: () => '' }),
        CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; }, DOMMatrixReadOnly: function () { }, Math, Object, Array, JSON, String, Number, isFinite, parseFloat
    }));
    vm.runInContext(read('bloom-ring.js'), ctx);
    const advance = ms => { const end = clock + ms; for (;;) { timers.sort((a, b) => a.at - b.at); const t = timers[0]; if (!t || t.at > end) break; timers.shift(); clock = t.at; t.f(); } clock = end; };
    return { W, hud, map, advance, BR: W.LowiBloomRing, cls };
}
const C = { x: 195, y: 388 }; /* the companion's centre: what the ring shrinks round and what the orbs are placed round */
const near = (p, q, msg) => assert.ok(Math.abs(p.x - q.x) < 0.5 && Math.abs(p.y - q.y) < 0.5, msg + ': ' + JSON.stringify(p) + ' vs ' + JSON.stringify(q));

test('a bloom opened while the last one is still easing back shrinks round the same centre (no shifted ring)', () => {
    const p = page();
    p.BR.zoom(0.65, C, 'blooms');
    near(p.hud.screenOf(C), C, 'first bloom: the centre holds still');
    p.hud.rendered = 0.65;                 /* its ease-out finished */
    p.BR.unzoom('blooms');                 /* close: the ring eases back to 1 over 0.5 s ... */
    p.hud.rendered = 0.8;                  /* ... and is caught a third of the way */
    p.advance(150);
    p.BR.zoom(0.65, C, 'blooms');          /* the next bubble, opened right away */
    near(p.hud.screenOf(C), C, 'second bloom: still round the companion');
    assert.equal(p.map.transformOrigin, '195px 388px', 'origin from the unscaled box, not from the half-scaled one (was 156px 310.4px)');
    p.advance(600);                        /* the first close\'s clean-up is due now: it must not undo the open bloom */
    assert.equal(p.map.scale, '0.65', 'the open bloom keeps its zoom');
    assert.ok(p.cls.has('br-zoom'));
    p.BR.unzoom('blooms'); p.hud.rendered = null; p.advance(600);
    assert.equal(p.map.scale, undefined, 'a real close still clears the zoom after the ease-back');
    assert.ok(!p.cls.has('br-zoom'));
});

test('if the ring moved meanwhile, the old ease-back is finished at once and the new centre is measured unscaled', () => {
    const p = page();
    p.BR.zoom(0.65, C, 'blooms'); p.hud.rendered = 0.65;
    p.BR.unzoom('blooms'); p.hud.rendered = 0.8; p.advance(100);
    const C2 = { x: 200, y: 400 };
    p.BR.zoom(0.6, C2, 'blooms');
    assert.equal(p.map.transformOrigin, '200px 400px');
    near(p.hud.screenOf(C2), C2, 'round the new centre');
});

test('the same zoom twice in a row (a bloom redrawn while open) keeps its origin', () => {
    const p = page();
    p.BR.zoom(0.65, C, 'blooms'); p.hud.rendered = 0.65;
    p.BR.zoom(0.65, C, 'blooms');
    assert.equal(p.map.transformOrigin, '195px 388px');
});

/* ---------- one circle for every bubble (pure) ---------- */
function allBubbles() {
    /* eight Home bubbles round the companion, like home-orbit-v2 (R 130, d 64), water / move / sleep in the overview */
    const keys = ['settings', 'water', 'move', 'scan', 'joy', 'sleep', 'gap', 'fuel'];
    const ring = keys.map((k, i) => { const t = -Math.PI / 2 + i * Math.PI / 4; return { key: k, x: C.x + 130 * Math.cos(t), y: C.y + 130 * Math.sin(t), r: 32 }; });
    const L = R.layoutAt({ c: C, mistyR: 75, ring, groups: [{ key: 'water', n: 3 }, { key: 'move', n: 3 }, { key: 'sleep', n: 3 }], d: 66, gap: 10, between: 8, even: true }, 0.65);
    L.c = C;
    return { ring, L, by: k => ring.find(b => b.key === k) };
}

test('Gap and Einkaufen open on the overview\'s own circle: same centre, zoom, radius, orb size and spacing, round their bubble', () => {
    const { L, by } = allBubbles();
    for (const [key, n] of [['gap', 2], ['fuel', 3]]) {
        const out = R.along(L, key, n, by(key));
        assert.equal(out.orbs.length, n);
        assert.equal(out.s, L.s); assert.equal(out.d, L.d); assert.equal(out.rho, L.rho); assert.equal(out.step, L.step);
        for (const o of out.orbs) assert.ok(Math.abs(Math.hypot(o.x - C.x, o.y - C.y) - L.rho) < 1e-6, key + ': on the circle');
        for (let i = 1; i < n; i++) {
            const d = Math.atan2(Math.sin(out.orbs[i].a - out.orbs[i - 1].a), Math.cos(out.orbs[i].a - out.orbs[i - 1].a));
            assert.ok(Math.abs(d - L.step) < 1e-9, key + ': the overview\'s spacing');
        }
        const mid = out.orbs.reduce((t, o) => t + o.a, 0) / n, b = by(key);
        assert.ok(Math.abs(Math.atan2(Math.sin(mid - Math.atan2(b.y - C.y, b.x - C.x)), Math.cos(mid - Math.atan2(b.y - C.y, b.x - C.x)))) < 1e-9, key + ': centred on its bubble');
        assert.ok(out.orbs.every(o => Math.abs(o.from.x - (C.x + (b.x - C.x) * L.s)) < 1e-9), key + ': flies out of its (zoomed) bubble');
    }
    /* the groups that are in the overview keep their exact places */
    const w = R.only(L, 'water');
    assert.deepEqual(w.orbs.map(o => [o.x, o.y]), L.orbs.filter(o => o.key === 'water').map(o => [o.x, o.y]));
    assert.equal(R.along(null, 'gap', 2, by('gap')), null);
});

test('wiring: every single bloom asks for the shared circle first, its own solve only as the fallback', () => {
    const hb = read('home-blooms-v2.js');
    assert.match(hb, /ring = R\.placeShared\(AG\.groups, kind, Math\.max\(1, acts\.length\)\)/);
    assert.doesNotMatch(hb, /mine\.n === Math\.max\(1, acts\.length\)/, 'no longer only when the counts match');
    const br = read('bloom-ring.js');
    assert.match(br, /const out = along\(L, key, n == null \? 1 : n, b\);/);
    assert.match(br, /return fits\(out, \{ w: vw, h: vh, t: sf\.t \+ 6, r: sf\.r, b: sf\.b, l: sf\.l \}, 8\) \? out : null;/, 'off-screen: the caller keeps its own solve');
});
