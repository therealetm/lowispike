// Oct 17 (E-man: "I would like to be able to cancel the exploration and call Misty back"): calling Misty home early from
// today's sun trip (the one-hour exploration) and from the Adventure tour, through one shared LowiRecall.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const SUN = require('../sun-meter.js');
const root = path.join(__dirname, '..');
const sm = fs.readFileSync(path.join(root, 'sun-meter.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'sun-meter.css'), 'utf8');
const t0 = new Date(2026, 9, 17, 12, 0).getTime(), day = SUN.dayKey(t0);
const trip = (extra) => Object.assign({ start: t0, back: t0 + SUN.AWAY_MS, item: 'dew', got: false, vigor: 'ok' }, extra || {});

test('one tap, no question: even a minute in she comes home and brings her find', () => {
    const p = SUN.recallPlan(trip(), t0 + 60000);
    assert.equal(p.keep, true);
    assert.equal(p.loses, false, 'nothing lost, so no confirmation');
    assert.equal(p.out, 60000);
    assert.equal(p.left, 59 * 60000);
    const r = SUN.recallTrip(trip(), t0 + 60000, day);
    assert.deepEqual(r.finds.map(f => f.id), ['dew']);
    assert.equal(r.trip.got, true);
    assert.equal(r.trip.lost, undefined);
    const r2 = SUN.recallTrip(trip({ vigor: 'thriving', item2: 'seed' }), t0 + 45 * 60000, day);
    assert.deepEqual(r2.finds.map(f => f.id), ['dew', 'seed'], 'bonus find too when she left full of energy');
    assert.equal(r2.trip.back, t0 + 45 * 60000);
    assert.equal(r2.trip.recalled, t0 + 45 * 60000);
    assert.equal(SUN.RECALL_KEEP, 0);
});

test('a recalled trip ends the trip now: she is home, nothing pending, no second trip today', () => {
    const now = t0 + 20 * 60000;
    const r = SUN.recallTrip(trip(), now, day);
    const v = SUN.model({ now: now + 1000, ledger: [], garden: { trips: { [day]: r.trip }, items: [] } });
    assert.equal(v.away, null, 'not away any more');
    assert.equal(v.pending.length, 0, 'no return sheet waiting');
    assert.ok(v.trip, 'today still has its trip');
    assert.equal(SUN.mayDepart(Object.assign({}, v, { fullDone: true }), { canTravel: true }), false, 'cannot farm a second trip by recalling');
});

test('the world keeps the glow she gave it up to the recall, and it stops growing', () => {
    const r = SUN.recallTrip(trip({ vigor: 'thriving' }), t0 + 15 * 60000, day);
    assert.equal(SUN.tended(r.trip, t0 + 15 * 60000), 0.25);
    assert.equal(SUN.tended(r.trip, t0 + 55 * 60000), 0.25, 'frozen at the recall');
    assert.equal(SUN.tended(trip({ got: true }), t0 + 5 * 60000), 0.5, 'a full trip still counts fully');
});

test('nothing to recall when she is home, already back, or the trip is done', () => {
    assert.equal(SUN.recallPlan(null, t0), null);
    assert.equal(SUN.recallPlan(trip({ got: true }), t0 + 60000), null);
    assert.equal(SUN.recallPlan(trip(), t0 + SUN.AWAY_MS + 1), null, 'time is up: the normal return takes over');
    assert.equal(SUN.recallTrip(trip({ got: true }), t0 + 60000, day), null);
});

test('the countdown chip in her empty bubble is the call-back button', () => {
    assert.match(sm, /c\.classList\.toggle\('ls-recall', !!v\.away\)/);
    assert.match(sm, /tr\('tapBack'\)/);
    assert.match(sm, /closest\('#spBubble > \.ls-recall'\)\)?;?\s*\n?\s*if \(rc\) \{ e\.preventDefault\(\); e\.stopImmediatePropagation\(\); Recall\.call\(\)/);
    assert.match(css, /#spBubble > \.ls-back\.ls-recall \{ pointer-events: auto;/, 'the chip takes taps (the plain chip does not)');
});

test('the sun sheet has a Call Misty back button while she is out, and a confirm sheet when it would lose the find', () => {
    assert.match(sm, /\(v\.away \? recallBlock\(v\) : ''\)/);
    assert.match(sm, /data-ls="recall"/);
    assert.match(sm, /data-ls="recall-yes"/);
    assert.match(sm, /if \(p\.loses && !force\) \{ recallSheet\(p\); return \{ ok: false, why: 'confirm'/);
});

test('recall flies her visibly home and gives the controller back', () => {
    assert.match(sm, /function flyHome\(\)/);
    assert.match(sm, /A\.away = false; A\.chk = 0;/, 'Home stops treating her as away at once');
    assert.match(sm, /PD\.mode = 'home'; PD\.blend = 1;/, 'glides from where she is into her cell (world-home fallback path)');
    assert.match(sm, /new CustomEvent\('lowi:recall'/);
});

test('one LowiRecall for the sun trip and the Adventure, open for the new Adventure to register', () => {
    assert.match(sm, /Recall\.register\('trip'/);
    assert.match(sm, /Recall\.register\('adventure', \{ active: \(\) => !!\(W\.LowiAdventure && W\.LowiAdventure\.on\)/);
    assert.match(sm, /W\.LowiAdventure\.stop\('recall'\)/);
    assert.match(sm, /if \(!W\.LowiRecall\) W\.LowiRecall = Recall;/);
    assert.match(sm, /register\(id, src\)/);
});

test('call-back copy exists in English, German and Spanish', () => {
    for (const k of ['callBack', 'tapBack', 'letGo', 'recallQ', 'recallLose', 'recallLose2', 'recallKeep', 'recallEmpty', 'yesBack', 'coming', 'comingEmpty']) {
        const m = sm.match(new RegExp('\\n\\s+' + k + ": \\[('[^']*'|[^\\]])*\\]"));
        assert.ok(m, k + ' present');
        const arr = m[0].slice(m[0].indexOf('['));
        assert.equal((arr.match(/'(?:[^'\\]|\\.)*'/g) || []).length, 3, k + ' has en/de/es');
    }
});
