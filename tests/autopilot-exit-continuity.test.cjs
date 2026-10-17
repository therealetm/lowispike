/* Oct 17 (E-man): "when Misty gets out of the world ... she's on autopilot, all of a sudden the whole interface appears, which is not
   supposed to, and then for like three seconds she just stares at us ... Misty should be busy like a fish in an aquarium the whole
   time." Two causes: a reveal tap inside a cell world (where Home's menus never show) counted as "menus back", so they jumped in
   when she left the world; and on the way out the camera carries her straight at the lens, which misty-face read as her flying at
   you (face to the camera for the whole pull-back), then she landed in a slow drift and idled looking at you. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const C = require(path.join(ROOT, 'clean-view-core.js'));
const F = require(path.join(ROOT, 'misty-face.js'));
const run = (evs, st) => { let s = st || C.init(); const acts = []; for (const e of evs) { const r = C.step(s, e); s = r.st; acts.push(r.act); } return { s, acts }; };

test('clean view: a tap inside a world on autopilot does not make Home\'s menus jump in when she flies out', () => {
    const a = run([{ type: 'mode', mode: 'auto' }, { type: 'tap', inWorld: true }]);
    assert.deepEqual(a.acts, ['hide', 'show'], 'inside the world the tap still brings back what a world shows (controller, World map stick)');
    assert.equal(a.s.worldTap, true);
    const b = run([{ type: 'world-left' }], a.s);
    assert.deepEqual(b.acts, ['hide'], 'leaving the world: the Home menus you never brought back stay hidden');
    assert.equal(b.s.clean, true);
    assert.equal(b.s.view, 'drive', 'the controller you brought back inside the world stays (and stays usable)');
    assert.equal(C.padLive(b.s), true);
    assert.equal(b.s.mode, 'auto', 'the autopilot goes on');
    /* the next tap on Home brings everything back, as always */
    const c = run([{ type: 'tap', inWorld: false }], b.s);
    assert.deepEqual(c.acts, ['show']);
    assert.equal(c.s.clean, false);
    /* and a later world exit after a Home tap changes nothing: what you brought back stays */
    const d = run([{ type: 'world-left' }, { type: 'mode', mode: '' }, { type: 'mode', mode: 'auto' }], c.s);
    assert.equal(d.acts[0], null);
    assert.equal(d.s.clean, true, 'a new autopilot start hides again, as before');
});

test('clean view: leaving a world never brings the menus back by itself, and never hides what you showed on Home', () => {
    /* clean when she leaves: nothing happens */
    const a = run([{ type: 'mode', mode: 'auto' }, { type: 'world-left' }]);
    assert.deepEqual(a.acts, ['hide', null]);
    assert.equal(a.s.clean, true);
    /* menus already shown on Home before she went in: a tap in the world and the exit leave them shown */
    const b = run([{ type: 'mode', mode: 'auto' }, { type: 'tap', inWorld: false }, { type: 'tap', inWorld: true }, { type: 'world-left' }]);
    assert.deepEqual(b.acts, ['hide', 'show', null, null]);
    assert.equal(b.s.clean, false);
    /* a steering move or a new autopilot start forget the world tap */
    const c = run([{ type: 'mode', mode: 'auto' }, { type: 'tap', inWorld: true }, { type: 'steer' }]);
    assert.equal(c.s.worldTap, false);
    /* another tab: everything shows and stays shown when you are back */
    const d = run([{ type: 'mode', mode: 'auto' }, { type: 'tap', inWorld: true }, { type: 'leave', mode: 'auto' }, { type: 'world-left' }]);
    assert.equal(d.s.clean, false);
    assert.equal(d.acts[3], null);
});

test('clean view (DOM): the reveal tap knows it is inside a world, and flying out of it is told to the core', () => {
    const s = read('clean-view.js');
    assert.match(s, /function reveal\(\) \{ feed\(\{ type: 'tap', inWorld: H\.classList\.contains\('wh-away'\) \}\); \}/);
    assert.match(s, /if \(aw !== away\) \{ away = aw; if \(!aw && onHome\(\)\) worldLeft\(\); \}/);
    /* the world's hiding is gone before the observer runs, and a layout read in between sees the menus as shown: the hide
       right after must snap, or they fade out from fully visible (a half-second flash of Home's whole interface) */
    assert.match(s, /H\.classList\.add\('lw-clean-snap'\); feed\(\{ type: 'world-left' \}\);/);
    assert.match(s, /requestAnimationFrame\(\(\) => requestAnimationFrame\(\(\) => H\.classList\.remove\('lw-clean-snap'\)\)\)/);
    assert.match(s, /snapSel \+ ' \{ transition: none !important; \}/);
    assert.match(s, /'html\.lw-clean\.lw-clean-snap ' \+ s/);
    /* world-home.js is the one that sets html.wh-away while Misty is inside a place */
    assert.match(read('world-home.js'), /H\.classList\.toggle\('wh-away', aw\)/);
});

test('face: on the way out she looks where she is going, not at the camera that carries her', () => {
    const f = read('misty-face.js');
    assert.match(f, /const path = i\.path && isFinite\(i\.path\.x\) \? unit\(\[i\.path\.x, i\.path\.y, i\.path\.z\]\) : null;/);
    assert.match(f, /if \(path\) S\.vel = scale\(path, hs \* K\.MOVE_ON \* 1\.6\);/, 'the handed-over heading replaces the camera-made motion and carries on after she lands');
    const m = read('misty-flight.js');
    assert.match(m, /path: S\.st === 'out' && S\.outHd \? S\.outHd : null/, 'misty-flight hands her own heading to the face while she flies out');
    assert.match(m, /acrossScreen\(S\.outHd, V\.a\.subVectors\(S\.p, S\.outPos\)\);/, 'her heading out: the way she left the world, across the screen');
    /* across the screen: the part toward / away from the camera is mostly taken out */
    assert.match(m, /out\.addScaledVector\(V\.fw, -0\.8 \* out\.dot\(V\.fw\)\);/);
});

test('face: a slow autopilot drift still counts as flying along her path (no standing still and glancing at you)', () => {
    assert.ok(F.slowFlight('auto') < 1 && F.slowFlight('drive') === 1 && F.slowFlight('') === 1);
    const hs = 1;
    /* a sleepy autopilot drift at 0.22 body heights per second */
    assert.equal(F.movingNow(false, 0.22, hs * F.slowFlight('auto')), true);
    assert.equal(F.movingNow(false, 0.22, hs * F.slowFlight('drive')), false, 'steering: unchanged thresholds');
    /* no flicker at the threshold on autopilot either */
    assert.equal(F.movingNow(true, 0.12, hs * F.slowFlight('auto')), true);
    assert.equal(F.movingNow(true, 0.05, hs * F.slowFlight('auto')), false);
    assert.match(read('misty-face.js'), /S\.moving = movingNow\(S\.moving, sp, hs \* slowFlight\(i\.mode\)\);/);
});

test('flight: out of a world on autopilot the tour goes straight on (no slow drift at you, no pause), and lost she still swims', () => {
    const m = read('misty-flight.js');
    const land = m.slice(m.indexOf('function outLand('), m.indexOf('function acrossScreen('));
    assert.match(land, /if \(ctx\.PD && ctx\.PD\.mode === 'auto'\) onward\(ctx, k\);/);
    assert.match(land, /acrossScreen\(V\.a, V\.e\.subVectors\(S\.p, S\.outPos\)\);/, 'the gentle drift (steering / home) is across the screen, never at you');
    assert.match(m, /outLand\(ctx, k\); return;/);
    const on = m.slice(m.indexOf('function onward('), m.indexOf('function onward(') + 1200);
    assert.match(on, /S\.driftFor = S\.wp; S\.drift = driftPts\(ctx\); S\.driftI = 0; S\.lostT = 0; to = S\.drift\[0\];/, 'her next stop is planned right away');
    assert.match(on, /S\.v\.copy\(V\.a\)\.multiplyScalar\(cruise\);/, 'and she is already flying for it');
    assert.match(on, /K\.ADV_SPEED/);
    /* lost far out she noses about in slow loops instead of hovering in place */
    const tw = m.slice(m.indexOf('function tourWant('), m.indexOf('function ring('));
    assert.doesNotMatch(tw, /Math\.cos\(S\.t \* 1\.7\) \* 0\.1\)/, 'the old near-still hover is gone');
    const loop = tw.match(/addScaledVector\(V\.rt, Math\.cos\(w\) \* ([0-9.]+)\)\.addScaledVector\(V\.up, Math\.sin\(w\) \* ([0-9.]+)\)/);
    assert.ok(loop && Math.min(+loop[1], +loop[2]) >= 0.3, 'the loop is a real swim, not a wiggle');
});
