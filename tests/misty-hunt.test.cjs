/* Oct 17, 2026: Misty's world hunt. Hidden crumbs per world (4-10 by today's spiky logs), eaten by flying close while YOU steer,
   power XP + a small energy boost through the shared LowiMistyPower API, weak-day entry bounce, fair daily caps, sidekick, freer zoom. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Hc = require('../misty-hunt.js');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const NOW = new Date(2026, 9, 17, 10, 0, 0).getTime();

test('4 to 10 hidden things per world, more after spiky logs; corners, far out, different per world and per day', () => {
    assert.deepStrictEqual([0, 1, 2, 3, 9].map(Hc.count), [4, 6, 8, 10, 10]);
    const a = Hc.spots('2026-10-17', 'liver', 8), b = Hc.spots('2026-10-17', 'gut', 8), c = Hc.spots('2026-10-18', 'liver', 8);
    assert.strictEqual(a.length, 8);
    assert.deepStrictEqual(a, Hc.spots('2026-10-17', 'liver', 8), 'stable through the day');
    assert.notDeepStrictEqual(a, b, 'each world hides them differently');
    assert.notDeepStrictEqual(a, c, 'and each day');
    for (const s of Hc.spots('2026-10-17', 'brain', 10)) {
        assert.ok(s.rad >= 0.72 && s.rad <= 0.96, 'far out, not in the middle');
        assert.ok(Math.abs(Math.hypot(s.x, s.y, s.z) - 1) < 0.01);
        assert.ok(s.kind === 'sugar' || s.kind === 'germ');
    }
    /* the first eight sit near the eight corners: every corner used once */
    const oct = new Set(a.map(s => (s.x > 0 ? 1 : 0) + (s.y > 0 ? 2 : 0) + (s.z > 0 ? 4 : 0)));
    assert.ok(oct.size >= 6, 'spread over the corners, not bunched');
});

test('eating: power XP + boost, each thing once per day, daily caps, resets at midnight', () => {
    let st = null;
    let r = Hc.eat(st, { world: 'liver', i: 0, n: 6, now: NOW });
    assert.ok(r.ok); assert.strictEqual(r.gained, 3); assert.strictEqual(r.boosted, 0.02); assert.strictEqual(r.left, 5);
    st = r.state;
    r = Hc.eat(st, { world: 'liver', i: 0, n: 6, now: NOW });
    assert.strictEqual(r.ok, false); assert.strictEqual(r.why, 'dup', 'no farming the same one');
    assert.strictEqual(Hc.eat(st, { world: 'liver', i: 7, n: 6, now: NOW }).ok, false, 'only the ones that exist');
    /* eat everything everywhere: XP stops at 60, boost at .2 a day */
    for (const w of ['liver', 'gut', 'brain', 'heart', 'lung', 'muscle', 'kidney', 'pancreas'])
        for (let i = 0; i < 10; i++) { const q = Hc.eat(st, { world: w, i, n: 10, now: NOW }); st = q.state; }
    assert.strictEqual(st.today, 60); assert.strictEqual(st.xp, 60); assert.strictEqual(st.boost, 0.2);
    const capped = Hc.eat(Object.assign({}, st, { eaten: {} }), { world: 'liver', i: 1, n: 10, now: NOW });
    assert.strictEqual(capped.gained, 0); assert.strictEqual(capped.why, 'cap');
    /* next day: today, boost and eaten reset; total XP stays */
    const tmr = Hc.norm(st, NOW + 864e5);
    assert.strictEqual(tmr.today, 0); assert.strictEqual(tmr.boost, 0); assert.deepStrictEqual(tmr.eaten, {}); assert.strictEqual(tmr.xp, 60);
});

test('getting in powers her up once per world per day; weak days bounce her off once or twice first', () => {
    let r = Hc.enter(null, { world: 'gut', now: NOW });
    assert.ok(r.ok); assert.strictEqual(r.gained, 4); assert.strictEqual(r.boosted, 0.03);
    assert.strictEqual(Hc.enter(r.state, { world: 'gut', now: NOW }).ok, false, 'no repeat bonus for flying in and out');
    assert.strictEqual(Hc.enter(r.state, { world: 'hub', now: NOW }).ok, false);
    assert.deepStrictEqual([0.9, 0.5, 0.45, 0.3, 0.1].map(Hc.tries), [0, 0, 1, 1, 2]);
    assert.strictEqual(Hc.tries(undefined), 0, 'no energy reading: never blocked');
});

test('levels and the shared read shape for the health scale: { level, xp, next, boost, label }', () => {
    assert.deepStrictEqual(Hc.levelOf(0), { level: 0, xp: 0, next: 20 });
    assert.deepStrictEqual(Hc.levelOf(20), { level: 1, xp: 0, next: 35 });
    assert.deepStrictEqual(Hc.levelOf(60), { level: 2, xp: 5, next: 50 });
    const r = Hc.read({ xp: 60, day: Hc.dayKey(NOW), today: 30, boost: 0.1 }, NOW, 'en');
    for (const k of ['level', 'xp', 'next', 'boost', 'label']) assert.ok(k in r, k);
    assert.strictEqual(r.level, 2); assert.strictEqual(r.boost, 0.1); assert.strictEqual(r.label, 'Hunt power Lv 2');
    assert.ok(r.boost <= 0.2);
    assert.ok(Hc.strength(10) > Hc.strength(0) && Hc.strength(99) <= 1.3, 'stronger, gently capped');
});

test('copy: three languages, kind, game world only, no banned words', () => {
    for (const k of Object.keys(Hc.STR)) assert.strictEqual(Hc.STR[k].length, 3, k);
    const all = JSON.stringify(Hc.STR).toLowerCase();
    for (const w of ['unhealthy', 'ungesund', 'sick', 'krank', 'disease', 'diagnos', 'insulin resist', 'diabet', 'bad', 'schlecht', 'fail', 'shame', 'insulin', 'glucose', 'blood sugar', 'guilt', 'burn'])
        assert.ok(!all.includes(w), w);
    assert.strictEqual(Hc.tr('found', 'de', { left: 3 }), 'Erwischt! Noch 3 in dieser Welt.');
});

test('wiring: no loop of its own, only your steering eats, shared API + event, sidekick, freer zoom, shipped', () => {
    const src = read('misty-hunt.js').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(src, /requestAnimationFrame|setInterval/);
    assert.match(src, /W\.LowiMistyPower = \{/); assert.match(src, /'lowi:misty-power'/);
    assert.match(src, /LowiWorldMood && W\.LowiWorldMood\.mood/, 'the count comes from the weather reading, no formula of its own');
    assert.match(src, /if \(steer && d < eatR\) eatBit/);
    const mf = read('misty-flight.js');
    assert.match(mf, /W\.LowiMistyHunt\.frame\(ctx, S\.p, !free, inR\)/, 'free roaming (autopilot) never eats');
    assert.match(mf, /!W\.LowiMistyHunt\.gate\(norm\(nb\.id\)\)/);
    assert.match(mf, /S\.huntFly && W\.LowiMistyHunt\) W\.LowiMistyHunt\.entered\(S\.flew\)/, 'only an entry you steered powers her up');
    assert.match(mf, /S\.huntFly = true; startWarp\(ctx, nb\)/);
    assert.strictEqual(require('../misty-flight.js').inReach(10), 6.2, 'she reaches far into a world now');
    assert.match(read('region-pals.js'), /const home = sidekickAt\(\) \|\| C\.FOLLOW\.home;/);
    const sc = read('body-world-3d-scene.js');
    assert.match(sc, /function zoom\(f, sx, sy\)/); assert.match(sc, /PLACE_MIN = 0\.75/);
    assert.match(read('body-world-3d.js'), /world\.zoom\(pinchFactor\(pinch0, d\), \(a\.x \+ b\.x\) \/ 2, \(a\.y \+ b\.y\) \/ 2\)/);
    assert.match(read('body-world-regions.js'), /look\.fog \* \(1 \+ 0\.9 \* /);
    const html = read('index.html');
    assert.ok(html.indexOf('misty-hunt.js?v=') > html.indexOf('misty-flight.js?v=') && html.indexOf('misty-hunt.js?v=') < html.indexOf('misty-hints.js?v='));
    assert.ok(/"misty-hunt\.js"/.test(read('sw.js')));
    assert.doesNotMatch(src, /createElement\('(button|div)'\)/, 'no new buttons or pills');
});
