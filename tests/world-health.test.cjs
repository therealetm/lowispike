// World health: the ONE shared score for how the inside of the body looks (smoothed over 4 days, kind floor, honest line).
const test = require('node:test'), assert = require('node:assert');
const WH = require('../world-health-core.js');
const now = new Date(2026, 9, 15, 20, 0).getTime();
const dk = i => { const d = new Date(now); d.setHours(12); d.setDate(d.getDate() - i); return WH.dayKey(d.getTime()); };
const meal = (i, r, lvl) => ({ ts: now - i * 864e5, day: dk(i), t: 'm' + Math.random(), r, lvl: lvl || '' });
let tick = 0; /* Oct 16 fair play: real taps are seconds apart; same-moment repeats count once */
const led = (i, src, amt, label, eventId) => ({ ts: now - i * 864e5 + (++tick) * 60e3, day: dk(i), src, amt, label: label || src, eventId });
function healthyDay(i) {
    return { logs: [meal(i, 'ja', 'low'), meal(i, 'ja', 'low'), meal(i, 'ja', 'low')],
        ledger: [led(i, 'meal', 15), led(i, 'meal', 15), led(i, 'meal', 15), led(i, 'move:walk', 20, 'Walk done'), led(i, 'water', 5, 'Water logged'), led(i, 'water', 5, 'Water logged'),
            led(i, 'water', 5, 'Water'), led(i, 'water', 5, 'Water'), led(i, 'macro-goal', 20, 'Protein', 'macro-goal:' + dk(i) + ':protein'), led(i, 'macro-goal', 20, 'Fiber', 'macro-goal:' + dk(i) + ':fiber')] };
}
function roughDay(i) { return { logs: [meal(i, 'nein', 'high'), meal(i, 'nein', 'high')], ledger: [led(i, 'meal', 15), led(i, 'meal', 15)] }; }
const merge = days => days.reduce((s, d) => ({ logs: s.logs.concat(d.logs), ledger: s.ledger.concat(d.ledger) }), { logs: [], ledger: [] });
const healthy = merge([0, 1, 2, 3].map(healthyDay)), rough = merge([0, 1, 2, 3].map(roughDay));

test('no data gives a kind neutral start, never dark', () => {
    const r = WH.forState({}, now, 0);
    assert.equal(r.score, WH.START); assert.equal(r.empty, true); assert.equal(r.tier, 'steady');
    assert.match(r.line, /first logs/);
});
test('healthy recent days make a bright world, rough days a murky one', () => {
    const h = WH.forState(healthy, now, 0), u = WH.forState(rough, now, 0);
    assert.ok(h.score >= 90, 'healthy ' + h.score); assert.equal(h.tier, 'bright');
    assert.ok(u.score < 45, 'rough ' + u.score); assert.equal(u.tier, 'murky');
    assert.ok(h.look.clarity > u.look.clarity && h.look.flow > u.look.flow && h.look.microbes > u.look.microbes && h.look.cellGlow > u.look.cellGlow && h.look.bright > u.look.bright);
});
test('score never drops below the kind floor', () => {
    const worst = merge([0, 1, 2, 3].map(i => ({ logs: [meal(i, 'nein', 'high')], ledger: [] })));
    const r = WH.score(worst, now);
    assert.ok(r.score >= WH.FLOOR); assert.ok(WH.look(r.score).cellGlow >= 0.35); assert.ok(WH.look(0).bright >= 0.5);
});
test('smoothed: one spike meal on a healthy streak barely moves it', () => {
    const before = WH.score(healthy, now).score;
    const s = { logs: healthy.logs.concat([meal(0, 'nein', 'high')]), ledger: healthy.ledger };
    const after = WH.score(s, now).score;
    assert.ok(before - after <= 8, before + ' -> ' + after); assert.equal(WH.tierOf(after), 'bright');
});
test('one good meal after rough days does not flip the world either', () => {
    const s = { logs: rough.logs.concat([meal(0, 'ja', 'low')]), ledger: rough.ledger };
    assert.ok(WH.score(s, now).score - WH.score(rough, now).score <= 12);
});
test('today weighs most and days older than 4 are ignored', () => {
    const recentGood = merge([healthyDay(0), roughDay(3)]), recentBad = merge([roughDay(0), healthyDay(3)]);
    assert.ok(WH.score(recentGood, now).score > WH.score(recentBad, now).score);
    const old = merge([healthyDay(5), healthyDay(6)]);
    assert.equal(WH.score(old, now).empty, true);
});
test('quiet days are skipped, not counted as bad', () => {
    const a = WH.score(merge([healthyDay(0)]), now).score, b = WH.score(merge([healthyDay(0), healthyDay(2)]), now).score;
    assert.equal(a, b);
});
test('verdicts read the app fields r (ja/jein/nein) and lvl (low/mid/high)', () => {
    assert.equal(WH.verdict({ r: 'ja' }), 1); assert.equal(WH.verdict({ lvl: 'high' }), 0.15);
    assert.equal(WH.verdict({ r: 'jein' }), 0.55); assert.equal(WH.verdict({ r: 'unknown' }), 0.6);
    assert.equal(WH.kind({ src: 'macro-goal', eventId: 'macro-goal:x' }), 'macro');
    assert.equal(WH.kind({ src: 'herb-care', label: 'Walk done' }), 'move');
    assert.equal(WH.kind({ src: 'water', label: 'Water logged' }), 'water');
});
test('the why line is honest, kind and names what would brighten it', () => {
    const u = WH.forState(rough, now, 0);
    assert.match(u.line, /soft haze/); assert.doesNotMatch(u.line, /bad|gross|fail|shame|toxic/i);
    assert.ok(['food', 'move', 'water', 'macro'].includes(u.tip));
    const h = WH.forState(healthy, now, 1);
    assert.match(h.line, /klar und hell/); assert.equal(h.tip, 'keep');
    const es = WH.forState({ logs: [meal(0, 'ja')], ledger: [] }, now, 2);
    assert.ok(es.line.length > 10 && /[a-z]/.test(es.line));
    const water = WH.forState(merge([0, 1].map(i => ({ logs: [meal(i, 'ja')], ledger: [led(i, 'move', 20, 'Walk'), led(i, 'macro-goal', 20, 'P', 'macro-goal:a'), led(i, 'macro-goal', 20, 'F', 'macro-goal:b')] }))), now, 0);
    assert.equal(water.tip, 'water'); assert.match(water.line, /water/);
});
