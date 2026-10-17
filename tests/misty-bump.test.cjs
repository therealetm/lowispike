/* misty-bump (Oct 17, E-man): the bloodstream's cells sometimes bump Misty (true 3D contact, a gentle knock, a funny dizzy turn
   where she tips, sways woozily, braces and steadies) and on autopilot she sometimes dodges them; never perfect, never pinball. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const Bp = require(path.join(ROOT, 'misty-bump.js'));
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const { B } = Bp;

let T3 = null;
async function three() { if (!T3) T3 = await import(path.join(ROOT, 'vendor/three-0.160.1.module.min.js')); return T3; }
function seeded(seed) { let s = seed >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
/* a small world: the scene's instanced cells flowing along +x (like body-world-3d-scene.js), Misty free at Home, the real module */
async function world(cells, p, opt) {
    opt = opt || {};
    const T = await three();
    const win = { document: { addEventListener() { } }, LowiWorldSpeed: 1 };
    new Function('window', 'module', read('misty-bump.js'))(win, undefined);
    const BM = win.LowiMistyBump;
    const scene = new T.Scene(), mesh = new T.InstancedMesh(new T.SphereGeometry(0.4, 6, 4), new T.MeshBasicMaterial(), cells.length);
    cells.forEach(c => { c.ay = c.ay || 0; c.s = c.s || 1; });
    mesh.name = 'lowi-rbc'; mesh.userData.cells = cells; scene.add(mesh);
    let reads = 0; const gm = mesh.getMatrixAt.bind(mesh); mesh.getMatrixAt = (i, m) => { reads++; return gm(i, m); };
    const camera = new T.PerspectiveCamera(55, 0.46, 0.05, 120); camera.position.set(p[0], p[1], p[2] + 8); camera.lookAt(p[0], p[1], p[2]); camera.updateMatrixWorld();
    const m4 = new T.Matrix4(), S = { st: 'free', p: new T.Vector3(p[0], p[1], p[2]), v: new T.Vector3(), hs: 1, ap: 0 };
    const wand = new T.Sprite(new T.SpriteMaterial()), bursts = [];
    const a = { THREE: T, scene, camera };
    const sync = () => { cells.forEach((c, i) => { m4.makeTranslation(c.x, c.y, c.z); mesh.setMatrixAt(i, m4); }); };
    sync();
    const trace = [];
    function run(secs, mode, k, want) {
        const dt = 1 / 60;
        for (let t = 0; t < secs - 1e-9; t += dt) {
            cells.forEach(c => { c.x += c.v * dt; }); sync();
            if (want) S.v.lerp(want, Math.min(1, dt * 3.2)); else S.v.multiplyScalar(Math.exp(-dt * 3.2));
            S.p.addScaledVector(S.v, dt);
            const before = S.p.clone();
            const ctx = { a, dt, k: k == null ? 1 : k, reduced: false, wand, burst: (q, n) => bursts.push(n) };
            BM.step(ctx, S, mode, { ROAM: 11 });
            wand.position.copy(S.p); wand.scale.set(1, 1, 1); wand.material.rotation = 0;
            BM.draw(ctx, S, false);
            trace.push({ jump: S.p.distanceTo(before), rot: wand.material.rotation, sy: wand.scale.y, p: S.p.clone(), st: BM.state() });
        }
        return BM.state();
    }
    return { BM, S, run, trace, wand, bursts, cells, reads: () => reads };
}

test('contact is true 3D: a cell overlapping her on screen but in front of or behind her never touches', () => {
    const rM = Bp.bodyR(1), rC = Bp.cellR(1);
    assert.strictEqual(Bp.contact([0, 4, 0], [0, 4, -3], rM, rC).hit, false, 'behind her');
    assert.strictEqual(Bp.contact([0, 4, 0], [0.1, 4, 2], rM, rC).hit, false, 'in front of her');
    const h = Bp.contact([0, 4, 0], [-0.5, 4, 0], rM, rC);
    assert.ok(h.hit && h.pen > 0); assert.ok(h.n[0] > 0.99, 'n points from the cell to her');
});

test('only autopilot swerves by itself, and never perfectly; tired she is clumsier, after a bump she is careful', () => {
    assert.strictEqual(Bp.dodgeChance('drive', 1, false), 0);
    assert.strictEqual(Bp.dodgeChance('home', 1, false), 0);
    const p = Bp.dodgeChance('auto', 1, false), tired = Bp.dodgeChance('auto', 0.2, false), calm = Bp.dodgeChance('auto', 1, true);
    assert.ok(p > 0.4 && p < 0.8, 'some dodged, some not');
    assert.ok(tired < p && tired > 0.2);
    assert.ok(calm > p && calm < 1);
});

test('the knock is gentle and softer while you steer; a near-standing bump still nudges a little', () => {
    const hard = Bp.knock([3, 0, 0], [-1, 0, 0], [-1, 0, 0], 'auto'), drive = Bp.knock([3, 0, 0], [-1, 0, 0], [-1, 0, 0], 'drive');
    assert.ok(hard.kick <= B.KICK_MAX + 1e-9 && drive.kick < hard.kick);
    assert.ok(Bp.nudgeDist(drive.kick) < 0.3, 'steering: under a third of a unit');
    assert.ok(Bp.nudgeDist(hard.kick) < 0.45);
    assert.ok(Bp.knock([0, 0, 0], [0, 0, 0], [1, 0, 0], 'auto').kick >= B.KICK_MIN);
});

test('the dizzy turn: tips over, sways woozily, braces, steadies; smooth and exactly upright at the end', () => {
    let prev = Bp.dizzyAt(0, 1, 1), maxJump = 0, maxRot = 0;
    const seen = new Set();
    for (let t = 1 / 240; t <= B.DIZZY + 0.05; t += 1 / 240) {
        const o = Bp.dizzyAt(t, 1, 1); seen.add(o.phase);
        maxJump = Math.max(maxJump, Math.abs(o.rot - prev.rot), Math.abs(o.sy - prev.sy)); maxRot = Math.max(maxRot, Math.abs(o.rot)); prev = o;
    }
    for (const ph of ['tip', 'woozy', 'brace', 'steady', 'done']) assert.ok(seen.has(ph), ph);
    assert.ok(maxJump < 0.06, 'no snap: ' + maxJump);
    assert.ok(maxRot > 0.4 && maxRot < 1, 'clearly knocked off balance, never upside down');
    assert.ok(Bp.dizzyAt(0.5, 1, 1).rot > 0.2, 'misoriented while woozy');
    const br = Bp.dizzyAt(1.3, 1, 1); assert.ok(br.sy < 0.92 && br.sx > 1.05, 'braces herself');
    const end = Bp.dizzyAt(B.DIZZY, 1, 1); assert.deepStrictEqual([end.rot, end.dx, end.dy, end.sx, end.sy, end.done], [0, 0, 0, 1, 1, true]);
    assert.ok(Bp.dizzyAt(0.1, 1, -1).rot < 0, 'tips the way she was hit');
    assert.ok(B.DIZZY <= 2, 'brief');
});

test('only free flight in the bloodstream: not in the galaxy, not in her own cell, not entering a place, not reduced motion', () => {
    const ok = { st: 'free', visible: true, p: [0, 4, 0], ap: 0 };
    assert.strictEqual(Bp.active(ok), true);
    for (const bad of [{ st: 'inside' }, { st: 'exit' }, { st: 'orbit' }, { galaxy: true }, { reduced: true }, { visible: false }, { p: [0, 0.5, 0] }, { p: [0, 14.5, 0] }, { ap: 0.6 }])
        assert.strictEqual(Bp.active(Object.assign({}, ok, bad)), false, JSON.stringify(bad));
});

test('depth separation in the real loop: cells that cross her on screen in front and behind never bump her', async () => {
    const W = await world([{ x: -5, y: 4, z: -3, v: 1 }, { x: -6, y: 4.1, z: 2.5, v: 1 }], [0, 4, 0]);
    const st = W.run(12, 'drive');
    assert.strictEqual(st.bumps, 0); assert.strictEqual(st.soft, 0); assert.strictEqual(st.dizzy, null);
});

test('a cell flowing into her at her depth: one bump, a smooth nudge, the cell knocked into a new lane, dizzy then upright', async () => {
    const cells = [{ x: -4, y: 4.05, z: 0, v: 1 }];
    const W = await world(cells, [0, 4, 0]);
    const p0 = W.S.p.clone();
    W.run(6, 'drive');
    const st = W.BM.state();
    assert.strictEqual(st.bumps, 1);
    const hitAt = W.trace.findIndex(f => f.st.bumps === 1);
    assert.ok(hitAt > 0 && W.trace[hitAt].st.dizzy != null, 'dizzy starts at the bump');
    assert.ok(Math.max(...W.trace.map(f => f.jump)) < 0.05, 'no teleport, only a glide');
    const moved = W.S.p.distanceTo(p0); assert.ok(moved > 0.05 && moved < 0.5, 'nudged gently: ' + moved);
    assert.ok(Math.hypot(cells[0].y - 4.05, cells[0].z) > 0.05, 'the cell went the other way into a new lane');
    assert.ok(W.trace.slice(hitAt, hitAt + 60).some(f => Math.abs(f.rot) > 0.3), 'visibly tipped over');
    assert.ok(W.trace.slice(hitAt, hitAt + 110).some(f => f.sy < 0.93), 'braces herself');
    const last = W.trace[W.trace.length - 1];
    assert.strictEqual(last.st.dizzy, null); assert.strictEqual(last.rot, 0); assert.strictEqual(last.sy, 1);
    assert.ok(W.bursts.length > 0, 'a puff of light where they met');
    const tail = W.trace.slice(-30); assert.ok(Math.max(...tail.map(f => f.jump)) < 0.002, 'settled, no jitter');
});

test('no pinball: a queue of cells in her lane gives one real bump, the rest only slide softly during the calm', async () => {
    const cells = [0, 1, 2, 3, 4].map(j => ({ x: -3 - j * 0.9, y: 4, z: 0, v: 1.2 }));
    const W = await world(cells, [0, 4, 0]);
    const st = W.run(4.5, 'drive');
    assert.strictEqual(st.bumps, 1);
    assert.ok(Math.max(...W.trace.map(f => f.jump)) < 0.06);
    assert.ok(W.S.p.distanceTo({ x: 0, y: 4, z: 0 }) < 1.6, 'not carried away or trapped');
});

test('steering: she never swerves by herself; autopilot dodges some cells and gets bumped by others', async () => {
    const orig = Math.random;
    try {
        Math.random = seeded(7);
        let dDrive = 0, bDrive = 0;
        for (let j = 0; j < 12; j++) { const W = await world([{ x: -4, y: 4 + (j % 3) * 0.08, z: 0, v: 1 }], [0, 4, 0]); const st = W.run(4, 'drive'); dDrive += st.dodged; bDrive += st.bumps; }
        assert.strictEqual(dDrive, 0); assert.strictEqual(bDrive, 12, 'your course, your bumps');
        let dodged = 0, bumped = 0, both = 0;
        for (let j = 0; j < 80; j++) {
            const W = await world([{ x: -4, y: 4 + (j % 3) * 0.08, z: 0, v: 1 }], [0, 4, 0]);
            const st = W.run(4, 'auto');
            if (st.dodged) dodged++; if (st.bumps) bumped++; if (st.dodged && st.bumps) both++;
        }
        assert.ok(dodged > 30 && dodged < 70, 'dodges ' + dodged + '/80');
        assert.ok(bumped > 10, 'some still hit ' + bumped + '/80');
        assert.ok(both <= 4, 'a dodge mostly works ' + both);
    } finally { Math.random = orig; }
});

test('a near miss in either mode makes her flinch, without moving her', async () => {
    const W = await world([{ x: -4, y: 4.75, z: 0, v: 1 }], [0, 4, 0]);
    W.run(5, 'drive');
    assert.strictEqual(W.BM.state().bumps, 0);
    assert.ok(W.trace.some(f => f.st.flinch && Math.abs(f.rot) > 0.1), 'leans away');
    assert.ok(W.S.p.distanceTo({ x: 0, y: 4, z: 0 }) < 1e-6, 'your position untouched');
});

test('bounded work: far cells are rejected before any matrix read', async () => {
    const rnd = seeded(3), cells = [];
    for (let i = 0; i < 230; i++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * 13.8; cells.push({ x: (rnd() * 2 - 1) * 40, y: Math.cos(a) * d, z: Math.sin(a) * d, v: 0.6 + rnd() }); }
    const W = await world(cells, [0, 4, 0]);
    W.run(1, 'drive');
    assert.ok(W.reads() / 60 < 12, 'matrix reads per frame: ' + (W.reads() / 60));
});

test('wired in: the scene hands over its cells, misty-flight calls step and draw in free flight, loaded and cached', () => {
    const scene = read('body-world-3d-scene.js'), mf = read('misty-flight.js'), idx = read('index.html'), sw = read('sw.js');
    assert.match(scene, /rbc\.name = 'lowi-rbc'; rbc\.userData\.cells = rb;/);
    assert.match(mf, /if \(W\.LowiMistyBump && !S\.gx && !S\.gxBack\) \{ try \{ W\.LowiMistyBump\.step\(ctx, S, mode, K\); \} catch \(e\) \{ \} \}/);
    assert.match(mf, /if \(S\.st === 'free' && W\.LowiMistyBump\) \{ try \{ W\.LowiMistyBump\.draw\(ctx, S, still\); \} catch \(e\) \{ \} \}/);
    assert.ok(idx.indexOf('<script src="misty-bump.js?v=') > idx.indexOf('<script src="misty-flight.js?v='));
    assert.ok(sw.match(/const STATIC = \[[^\]]*\]/)[0].includes('"misty-bump.js"'));
    const src = read('misty-bump.js');
    assert.ok(!/\bxp\b|\bXP\b|award|energy\s*[-+]=|localStorage|requestAnimationFrame|WebGLRenderer/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'motion only: no XP, no storage, no own loop or renderer');
});
