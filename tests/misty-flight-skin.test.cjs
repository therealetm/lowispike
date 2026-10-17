/* Flight skin (Oct 17): holding forward no longer lights a constant row of dots in front of Misty. She pushes against her own
   stretchy travelling bubble skin instead (Home membrane look), which tents out ahead, overshoots a little as she gets going and
   wobbles back on release. The energy shot stays a distinct action and punches out through the skin. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const T = require('../misty-turn.js');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'misty-turn.js'), 'utf8');
const FLIGHT = fs.readFileSync(path.join(__dirname, '..', 'misty-flight.js'), 'utf8');

const run = (s, th, secs, reduced, dt = 1 / 60) => { const out = []; for (let t = 0; t < secs; t += dt) { T.skinStep(s, { dt, th, reduced }); out.push(s.a); } return out; };

test('holding forward stretches the skin out, a little past full as she gets going, then it settles', () => {
    const s = { a: 0, v: 0, o: 0 }, a = run(s, 1, 2.5);
    const peak = Math.max(...a);
    assert.ok(peak > 1.08 && peak <= T.SKIN.MAX, 'overshoot while accelerating: ' + peak);
    assert.ok(Math.abs(s.a - 1) < 0.03, 'settles at a steady stretch: ' + s.a);
    assert.ok(s.o > 0.95, 'fully shown while held');
});

test('letting go: the skin wobbles back (dents in once) and fades out completely', () => {
    const s = { a: 0, v: 0, o: 0 }; run(s, 1, 2.5);
    const a = run(s, 0, 6);
    assert.ok(Math.min(...a) < -0.05, 'springs back past flat: ' + Math.min(...a));
    assert.ok(Math.min(...a) >= T.SKIN.MIN, 'never caves in far');
    assert.deepStrictEqual([s.a, s.v, s.o], [0, 0, 0], 'gone and still once relaxed');
});

test('reduced motion: it stretches and relaxes with no overshoot and no wobble', () => {
    const s = { a: 0, v: 0, o: 0 }, up = run(s, 1, 2, true), down = run(s, 0, 6, true);
    assert.ok(Math.max(...up) <= 1.0001, 'no overshoot');
    for (let i = 1; i < up.length; i++) assert.ok(up[i] >= up[i - 1] - 1e-9, 'rises steadily');
    assert.ok(Math.min(...down) >= 0, 'no dent');
    for (let i = 1; i < down.length; i++) assert.ok(down[i] <= down[i - 1] + 1e-9, 'relaxes steadily');
    assert.strictEqual(s.o, 0);
    assert.match(SRC, /u\.uW\.value = i\.reduced \? 0 : 1/, 'no ripple with reduced motion');
});

test('a slow phone frame (big dt) stays stable', () => {
    const s = { a: 0, v: 0, o: 0 }; const a = run(s, 1, 3, false, 0.25);
    assert.ok(a.every(Number.isFinite) && Math.max(...a) <= T.SKIN.MAX);
    assert.ok(Math.abs(s.a - 1) < 0.1);
});

test('forward: the skin tents exactly where the energy shot would go (heading tilted up / down); back: behind her; none: keep', () => {
    const f = [0.6, 0, -0.8];
    for (const vy of [0, 0.7, -0.5]) assert.deepStrictEqual(T.skinDir(f, vy, 1), T.shotDir(f, vy));
    const b = T.skinDir(f, 0.7, -1);
    assert.ok(Math.abs(b[0] + 0.6) < 1e-9 && b[1] === 0 && Math.abs(b[2] - 0.8) < 1e-9);
    assert.strictEqual(T.skinDir(f, 0, 0), null);
});

test('she sits up at the leading bulge: the tip is just ahead of her body and the skin trails behind as it stretches', () => {
    const body = 0.34, hs = 1;
    const rest = T.skinPlace([0, 0, 0], [0, 0, 1], hs, 0), full = T.skinPlace([0, 0, 0], [0, 0, 1], hs, 1);
    assert.deepStrictEqual(rest.c, [0, 0, 0], 'at rest it is a plain bubble round her');
    assert.ok(full.c[2] < -0.1, 'stretched: the middle slips behind her');
    assert.ok(T.skinTip(hs, 1) > T.skinTip(hs, 0), 'the push tents it further ahead');
    assert.ok(T.skinTip(hs, 1) > body + 0.3 && T.skinTip(hs, 1) < 1.2, 'tip right in front of her nose: ' + T.skinTip(hs, 1));
    assert.ok(rest.r > body, 'the skin is round her, not inside her');
    const big = T.skinPlace([2, 3, 4], [1, 0, 0], 3, 1);
    assert.ok(Math.abs(big.r - 3 * T.SKIN.R) < 1e-9 && big.c[0] < 2, 'scales with her size, follows her');
});

test('holding no longer lights the facing dots; a drag on Misty with no hold still does', () => {
    assert.match(SRC, /thrust: v => \{ if \(v === undefined\) return S\.th; S\.th = clamp\(Math\.round\(\+v \|\| 0\), -1, 1\); return S\.th; \}/, 'thrust() sets no cue');
    assert.doesNotMatch(SRC, /if \(o\.th\) S\.cueT/, 'steering while holding sets no cue');
    assert.match(SRC, /const show = !S\.th && \(S\.cueT > 0 \|\| \(S\.own && S\.own\.turned\)\)/, 'dots only without a hold');
    assert.match(SRC, /S\.cueT = K\.CUE;/, 'a drag on her still shows where she faces');
    const shot = SRC.slice(SRC.indexOf('function shotFrame'), SRC.indexOf('function skinBuild'));
    assert.doesNotMatch(shot, /cueT/, 'the shot lights no aim dots');
    assert.match(shot, /SK\.st\.v \+= SKIN\.KICK/, 'the shot punches out through the skin instead');
});

test('the energy shot is untouched: still fired, aimed, cooled down and healing as before', () => {
    assert.match(SRC, /addEventListener\('lowi:pad-double'/);
    assert.match(SRC, /try \{ shotFrame\(i, dt\); \}/);
    assert.match(SRC, /try \{ skinFrame\(i, dt\); \}/);
    assert.ok(SRC.indexOf('shotFrame(i, dt)') < SRC.indexOf('skinFrame(i, dt)'), 'the skin reads the shot kick in the same frame');
    for (const k of ['shotGate', 'shotDir', 'shotAt', 'healAdd', 'dblAction']) assert.strictEqual(typeof T[k], 'function', k);
});

test('one mesh in the 3D scene, no loop or renderer of its own, never left hanging when she is not drawn', () => {
    const sk = SRC.slice(SRC.indexOf('function skinBuild'), SRC.indexOf('/* body-world-3d.js: a double tap'));
    assert.doesNotMatch(sk, /requestAnimationFrame|WebGLRenderer|setInterval|setTimeout/);
    assert.match(sk, /if \(SK\.m && SK\.m\.parent\) return SK\.m;/, 'built once');
    assert.match(sk, /onBeforeRender = \(\) => \{ if \(now\(\) - S\.drawnT > 250\)/, 'hidden when draw stops');
    assert.match(sk, /userData\.lwKeep = true/);
});

test('separate from Home: the travelling skin is only drawn once she is out or inside a world, Home breakout untouched', () => {
    const calls = FLIGHT.match(/turnDraw\(/g) || [];
    assert.ok(calls.length >= 2);
    assert.match(FLIGHT, /if \(S\.st === 'free'\) turnDraw\(/);
    assert.doesNotMatch(SRC, /homeBubble|membrane\.|LowiHome/, 'misty-turn does not reach into Home');
});
