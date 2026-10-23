/* Oct 17: Home movement bubble — Quick / Medium / Long / Epic estimates (Oct 23 2026: three daily step ranges, Casual / Steady / Epic) (move-estimate-core.js + hooks in sun-meter, world-health, world-mood). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const S = require('../sun-meter.js');
global.LowiWorldHealth = require('../world-health-core.js');
const WH = global.LowiWorldHealth;
const M = require('../world-mood-core.js');
const C = require('../move-estimate-core.js');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const DAY = '2026-10-17';
const NOW = new Date(2026, 9, 17, 15, 0, 0).getTime();
const est = (lvl, mq, ts, slot) => ({ ts, day: DAY, amt: mq * 4, label: 'Move · ' + lvl, src: 'move:est', eventId: 'move:est:' + DAY + ':' + slot, mq, lvl });
const session = ts => ({ ts, day: DAY, amt: 20, label: 'Walk session', src: 'move:session', eventId: 'move:s1' });

/* Oct 23 2026 (Eman): the Quick / Medium / Long / Epic minute guesses became three daily step ranges, Casual / Steady / Epic
   (under 5k / 5k-10k / 10k+), read off the phone's own step counter. The six rule tests below were rewritten for that; the
   older guess entries (est() above) stay as legacy data. More cases in tests/move-steps.test.cjs. */
const range = (lvl, mq, xp, ts, day) => ({ ts, day: day || DAY, amt: xp, label: 'Move · ' + lvl, src: 'move:est', eventId: 'move:est:' + (day || DAY) + ':steps', mq, lvl, steps: C.level(lvl).band, est: 1 });

test('three ranges like Sleep: thirds of the Move part (in quarters), XP 5 / 11 / 16, one entry id a day', () => {
    assert.deepStrictEqual(C.LEVELS.map(l => [l.id, l.band, l.min, l.max]), [['casual', 'lt5k', 0, 4999], ['steady', '5to10k', 5000, 9999], ['epic', '10kplus', 10000, null]]);
    assert.deepStrictEqual(C.LEVELS.map(l => l.xp), [5, 11, 16]);
    const p = C.plan([], DAY, 'steady', NOW);
    assert.strictEqual(p.action, 'set'); assert.ok(Math.abs(p.applied - 8 / 3) < 0.01); assert.strictEqual(p.xp, 11);
    assert.strictEqual(p.eventId, 'move:est:' + DAY + ':steps'); assert.deepStrictEqual(p.removeIds, []);
    assert.strictEqual(C.plan([], DAY, 'quick', NOW).action, 'bad', 'the old guesses cannot be picked any more');
    assert.strictEqual(C.plan([], DAY, 'nope', NOW).action, 'bad');
});

test('Epic fills the day; a higher range replaces the lower one and only adds the difference in XP', () => {
    const L = [range('steady', 8 / 3, 11, NOW - 5 * 60e3)];
    const p = C.plan(L, DAY, 'epic', NOW);
    assert.strictEqual(p.action, 'set'); assert.strictEqual(p.applied, 4); assert.strictEqual(p.xp, 16); assert.strictEqual(p.net, 5);
    assert.deepStrictEqual(p.removeIds, ['move:est:' + DAY + ':steps']); assert.strictEqual(p.after, 4); assert.strictEqual(p.down, false);
});

test('no double counting: a Move-page log already fills the day, a range adds nothing', () => {
    const p = C.plan([session(NOW - 3600e3)], DAY, 'epic', NOW);
    assert.strictEqual(p.action, 'full'); assert.strictEqual(p.fromMovePage, true); assert.strictEqual(p.xp, 0);
    assert.strictEqual(C.view([session(NOW - 3600e3)], DAY).text, '4/4');
});

test('picking another range at any time (not only within 60 s) changes today\'s range; it never adds a second walk', () => {
    const L = [range('casual', 4 / 3, 5, NOW - 5 * 3600e3)];
    const p = C.plan(L, DAY, 'steady', NOW);
    assert.strictEqual(p.action, 'set'); assert.strictEqual(p.replaced, true); assert.strictEqual(p.from, 'casual');
    assert.deepStrictEqual(p.removeIds, ['move:est:' + DAY + ':steps']); assert.strictEqual(p.eventId, 'move:est:' + DAY + ':steps');
    assert.strictEqual(p.net, 6);
});

test('the same range again does nothing; there is only ever one range slot a day', () => {
    const L = [range('steady', 8 / 3, 11, NOW - 20e3)];
    const p = C.plan(L, DAY, 'steady', NOW + 3 * 3600e3);
    assert.strictEqual(p.action, 'same'); assert.strictEqual(p.xp, 0); assert.deepStrictEqual(p.removeIds, []);
    assert.strictEqual(C.nextSlot(), 'steps');
});

test('yesterday does not count today (day boundary)', () => {
    const y = range('epic', 4, 16, NOW - 86400e3, '2026-10-16');
    assert.strictEqual(C.view([y], DAY).q, 0); assert.strictEqual(C.view([y], DAY).level, null);
    const p = C.plan([y], DAY, 'casual', NOW);
    assert.strictEqual(p.action, 'set'); assert.deepStrictEqual(p.removeIds, [], 'yesterday\'s range is never taken off');
});

test('energy uses quarters: Quick < Medium < Long < Epic, Epic = old full Move, a Move-page log unchanged', () => {
    const base = { now: NOW, logs: [], water: 0 };
    const v = led => S.energy(Object.assign({ ledger: led }, base));
    const none = v([]), q = v([est('quick', 1, NOW - 600e3, 1)]), m = v([est('medium', 2, NOW - 600e3, 1)]), l = v([est('long', 3, NOW - 600e3, 1)]), e = v([est('epic', 4, NOW - 600e3, 1)]), s = v([session(NOW - 600e3)]);
    assert.ok(none.value < q.value && q.value < m.value && m.value < l.value && l.value < e.value);
    assert.ok(Math.abs(e.value - s.value) < 1e-9);
    assert.strictEqual(q.parts.move, 0.25); assert.strictEqual(s.parts.move, 1);
    /* the sum caps at 1 */
    const two = v([est('long', 3, NOW - 900e3, 1), est('epic', 1, NOW - 300e3, 2)]);
    assert.strictEqual(two.parts.move, 1);
    assert.ok(Math.abs(two.value - s.value) < 1e-9);
});

test('sun points scale with quarters; a Move-page log keeps its full points', () => {
    const pts = led => S.model({ now: NOW, ledger: led, logs: [] });
    const a = pts([est('quick', 1, NOW - 600e3, 1)]), b = pts([session(NOW - 600e3)]);
    const get = m => (m && (m.points != null ? m.points : (m.today && m.today.points))) ;
    if (get(a) != null && get(b) != null) assert.ok(get(a) < get(b));
});

test('world health and world mood weigh an estimate by its quarters', () => {
    const st = led => ({ logs: [], ledger: led });
    const q = WH.dayParts(st([est('quick', 1, NOW - 600e3, 1)]), DAY), s = WH.dayParts(st([session(NOW - 600e3)]), DAY);
    assert.strictEqual(q.move, 0.25); assert.strictEqual(s.move, 1);
    const bad = { day: DAY, r: 'nein', t: 'meal x', eventId: 'meal:x', ts: NOW - 3 * 3600e3 };
    const mood = led => M.read({ logs: [bad], ledger: led }, NOW, WH);
    const none = mood([]), mq = mood([est('quick', 1, NOW - 600e3, 1)]), me = mood([est('epic', 4, NOW - 600e3, 1)]), ms = mood([session(NOW - 600e3)]);
    assert.ok(none.level > mq.level && mq.level > me.level, 'a Quick calms less than an Epic: ' + [none.level, mq.level, me.level]);
    assert.strictEqual(me.level, ms.level, 'an Epic calms like a Move session');
});

test('wired into the app: award extra fields, unaward, scripts, sw lists, bubble markup + long press rule', () => {
    const html = read('index.html'), sw = read('sw.js'), js = read('move-bubble.js'), css = read('move-bubble.css');
    assert.match(html, /arguments\[5\] && arguments\[5\]\.extra/);
    assert.match(html, /awardWith:\(amt,label,src,eventId,extra,quiet\)/);
    assert.match(html, /unaward\(eventId\)\{/);
    for (const f of ['move-estimate-core.js', 'move-bubble.js', 'move-bubble.css']) {
        assert.ok(html.includes(f + '?v='), f + ' linked'); assert.ok(sw.split(f).length >= 3, f + ' in both sw lists');
    }
    assert.match(js, /wh-cell wh-move/); assert.match(js, /data-hb|dataset\.hb/);
    assert.match(js, /openPage\(\); \}, 560\)/, 'long press opens the Move page (Oct 21)');
    assert.match(js, /onLong: \(\) => \{ longAt = performance\.now\(\); openPage\(\); return true; \}/, 'living bubble hold opens the Move page');
    assert.match(js, /wm-guess-row[\s\S]*editSheet\(\)/, 'today\'s estimates stay one tap away on the Move page');
    assert.match(js, /LowiLivingBubble/, 'uses the shared living bubble when it exists');
    assert.match(js, /LowiSun\.energyNow/, 'reward read back from the one energy formula');
    assert.doesNotMatch(js, /\bsteps?\b\s*:\s*\d/, 'no invented step counts');
    assert.match(css, /top: var\(--wm-y, calc\(var\(--wh-cy\) - var\(--wh-sy\)\)\)/);
    assert.match(js, /function place\(\)/, 'finds a free spot around Misty on short / landscape screens');
});
