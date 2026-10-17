/* Oct 17 (E-man: "I flew at the moon with the forward button, bounced off, and on the next try I was back in my bubble"):
   out in the spirit world, holding the controller still (forward) must press into another world's bubble like the stick does.
   It used to count only the stick, so the forward hold slid round every bubble and never got in. The real galaxy-bubbles.js
   step runs here on a small cosmos with real three.js. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const core = require(path.join(ROOT, 'galaxy-bubbles.js'));

let T3 = null;
async function three() { if (!T3) T3 = await import(path.join(ROOT, 'vendor/three-0.160.1.module.min.js')); return T3; }

/* a cosmos with one other world (radius r, at x = 60) and Misty to its left, heading +x */
async function galaxy(r, opt) {
    opt = opt || {};
    const T = await three();
    const win = { document: { addEventListener() { } }, CustomEvent: class { constructor(n, o) { this.type = n; this.detail = o && o.detail; } }, dispatchEvent() { } };
    new Function('window', 'module', read('galaxy-bubbles.js'))(win, undefined);
    const GB = win.LowiGalaxyBubbles;
    const scene = new T.Scene(), g = new T.Group(); g.name = 'cosmos'; scene.add(g);
    const home = new T.Mesh(new T.SphereGeometry(46, 8, 6), new T.MeshBasicMaterial()); home.userData.r = 46; g.add(home);
    const o = new T.Mesh(new T.SphereGeometry(r, 12, 8), new T.ShaderMaterial({ transparent: true, uniforms: { uCol: { value: new T.Color('#8f8') }, uRim: { value: new T.Color('#fff') }, uRim2: { value: new T.Color('#fff') }, uO: { value: 0.3 }, uT: { value: 0 } } })); o.userData.r = r; o.position.set(60, opt.y || 0, 0); g.add(o);
    scene.updateMatrixWorld(true);
    const camera = new T.PerspectiveCamera(55, 0.46, 0.1, 2000); camera.position.set(60 - r - 30, 0, 40); camera.lookAt(60, 0, 0); camera.updateMatrixWorld();
    const a = { THREE: T, scene, camera };
    const S = { st: 'free', gx: true, p: new T.Vector3(60 - r - 8, 0, 0), v: new T.Vector3(), hs: 1, th: 0 };
    const V = { want: new T.Vector3(), a: new T.Vector3() };
    const r0 = { target: new T.Vector3(), dist: 64 };
    function run(secs, mode, inp) {
        const dt = 1 / 60; let inside = -1, enteredAt = -1;
        for (let t = 0; t < secs - 1e-9; t += dt) {
            S.th = inp.th || 0;
            V.want.set(inp.want[0], inp.want[1], inp.want[2]); if (V.want.length() > 1) V.want.normalize();
            /* like misty-flight's free flight: velocity eases towards the want at about 9 units / s */
            S.v.lerp(V.want.clone().multiplyScalar(9), Math.min(1, dt * 3.2)); S.p.addScaledVector(S.v, dt);
            const ctx = { a, dt, k: 1, reduced: false, r: r0, PD: { mode }, burst() { } };
            GB.step(ctx, S, V, mode, inp.mag || 0, { ROAM: 11 });
            inside = GB.state().inside; if (inside >= 0 && enteredAt < 0) enteredAt = t;
        }
        return { inside, enteredAt, st: GB.state() };
    }
    return { run, S, GB };
}

test('holding forward counts as pushing, like the stick (and like misty-flight inside a world)', () => {
    assert.strictEqual(typeof core.pushOf, 'function');
    assert.strictEqual(core.pushOf(0, 1), 1, 'forward hold, stick centred');
    assert.strictEqual(core.pushOf(0, -1), 1, 'back hold');
    assert.strictEqual(core.pushOf(0.6, 0), 0.6, 'the stick alone, as before');
    assert.strictEqual(core.pushOf(0, 0), 0, 'nothing held');
    assert.ok(core.pushOf(0, 1) >= core.GB.MAG);
});

for (const r of [6, 17, 37]) {
    test(`the forward button flies her into a bubble of radius ${r} (it used to slide round it)`, async () => {
        const G = await galaxy(r);
        const res = G.run(5, 'drive', { th: 1, mag: 0, want: [1, 0, 0] });
        assert.ok(res.enteredAt >= 0, 'she got in: ' + JSON.stringify(res.st.log));
        assert.ok(res.enteredAt < 3.5, 'within a few seconds of touching, not after many bounces: ' + res.enteredAt.toFixed(2));
    });
}

test('the stick still pushes in, as before', async () => {
    const G = await galaxy(17);
    const res = G.run(5, 'drive', { th: 0, mag: 1, want: [1, 0, 0] });
    assert.ok(res.enteredAt >= 0, JSON.stringify(res.st.log));
});

test('a bubble stays solid when she only grazes it, drifts into it, or autopilot / the way home brings her there', async () => {
    /* flying past it (want along the glass, not through it) */
    let G = await galaxy(17, { y: 17 + 1.2 });
    let res = G.run(4, 'drive', { th: 1, mag: 0, want: [1, 0, 0] });
    assert.strictEqual(res.enteredAt, -1, 'a graze is not a push: ' + JSON.stringify(res.st.log));
    /* nothing held: drifting against it does not open it */
    G = await galaxy(17); G.S.v.set(9, 0, 0);
    res = G.run(3, 'drive', { th: 0, mag: 0, want: [0, 0, 0] });
    assert.strictEqual(res.enteredAt, -1, 'no push, no entry');
    for (const mode of ['auto', 'home']) {
        G = await galaxy(17);
        res = G.run(4, mode, { th: 0, mag: 1, want: [1, 0, 0] });
        assert.strictEqual(res.enteredAt, -1, mode + ' never pushes into a bubble');
    }
});

test('the touch margin only widens the press, the glass itself stays where it was', () => {
    const src = read('galaxy-bubbles.js');
    assert.match(src, /TOUCH: 0\.5/);
    assert.match(src, /pushK = drive && pushOf\(mag, S\.th\) >= GB\.MAG/);
    assert.match(src, /if \(d >= rr \+ hs \* GB\.TOUCH \|\| d < 1e-4\) continue;/);
    assert.match(src, /if \(d >= rr\) continue;\s*\/\* solid until it gives: slide round \*\//);
});
