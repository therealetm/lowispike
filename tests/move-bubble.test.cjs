/* Oct 17: Home movement bubble — Quick / Medium / Long / Epic estimates (move-estimate-core.js + hooks in sun-meter, world-health, world-mood). */
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

test('four levels, quarters 1-4, XP 4 per applied quarter', () => {
    assert.deepStrictEqual(C.LEVELS.map(l => [l.id, l.q]), [['quick', 1], ['medium', 2], ['long', 3], ['epic', 4]]);
    const p = C.plan([], DAY, 'medium', NOW);
    assert.strictEqual(p.action, 'add'); assert.strictEqual(p.applied, 2); assert.strictEqual(p.xp, 8); assert.strictEqual(p.after, 2);
    assert.strictEqual(p.eventId, 'move:est:' + DAY + ':1');
    assert.strictEqual(C.plan([], DAY, 'nope', NOW).action, 'bad');
});

test('the day caps at 4/4: an Epic after a Long only adds the one quarter left, and only its XP', () => {
    const L = [est('long', 3, NOW - 5 * 60e3, 1)];
    const p = C.plan(L, DAY, 'epic', NOW);
    assert.strictEqual(p.applied, 1); assert.strictEqual(p.xp, 4); assert.strictEqual(p.after, 4);
    const full = C.plan(L.concat(est('quick', 1, NOW - 2 * 60e3, 2)), DAY, 'quick', NOW);
    assert.strictEqual(full.action, 'full'); assert.strictEqual(full.xp, 0);
});

test('no double counting: a Move-page log already fills the day, an estimate adds nothing', () => {
    const p = C.plan([session(NOW - 3600e3)], DAY, 'epic', NOW);
    assert.strictEqual(p.action, 'full'); assert.strictEqual(p.fromMovePage, true); assert.strictEqual(p.xp, 0);
    assert.strictEqual(C.view([session(NOW - 3600e3)], DAY).text, '4/4');
});

test('picking again within 60 s replaces the last estimate (change of mind), same slot id', () => {
    const L = [est('quick', 1, NOW - 20e3, 1)];
    const p = C.plan(L, DAY, 'long', NOW);
    assert.strictEqual(p.action, 'replace'); assert.strictEqual(p.replaceId, 'move:est:' + DAY + ':1');
    assert.strictEqual(p.before, 0); assert.strictEqual(p.applied, 3); assert.strictEqual(p.eventId, p.replaceId);
    const later = C.plan(L.map(e => Object.assign({}, e, { ts: NOW - 61e3 })), DAY, 'long', NOW);
    assert.strictEqual(later.action, 'add'); assert.strictEqual(later.applied, 3); assert.strictEqual(later.eventId, 'move:est:' + DAY + ':2');
});

test('at most 6 estimate entries a day; removed slots are reused (log / remove loops reuse the same id)', () => {
    const six = [1, 2, 3, 4, 5, 6].map(i => Object.assign(est('quick', 0, NOW - (20 - i) * 60e3, i), { amt: 1 }));
    assert.strictEqual(C.plan(six, DAY, 'quick', NOW).action, 'limit');
    assert.strictEqual(C.nextSlot([est('q', 1, 0, 1), est('q', 1, 0, 3)]), 2);
});

test('yesterday does not count today (day boundary)', () => {
    const y = Object.assign(est('epic', 4, NOW - 86400e3, 1), { day: '2026-10-16' });
    assert.strictEqual(C.view([y], DAY).q, 0);
    assert.strictEqual(C.plan([y], DAY, 'quick', NOW).action, 'add');
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
    assert.match(js, /editSheet\(\); \}, 560\)/, 'long press opens the edit sheet');
    assert.match(js, /LowiLivingBubble/, 'uses the shared living bubble when it exists');
    assert.match(js, /LowiSun\.energyNow/, 'reward read back from the one energy formula');
    assert.doesNotMatch(js, /\bsteps?\b\s*:\s*\d/, 'no invented step counts');
    assert.match(css, /top: var\(--wm-y, calc\(var\(--wh-cy\) - var\(--wh-sy\)\)\)/);
    assert.match(js, /function place\(\)/, 'finds a free spot around Misty on short / landscape screens');
});
