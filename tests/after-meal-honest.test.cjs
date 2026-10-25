/* 25 Oct 2026 evening (Emmanuel): he tapped walk, squats, water and upright within seconds, got the XP, the secret Spike Tamer
   achievement and a level-up without doing anything; the water tile paid points but the Home cup bubble did not move.
   "It must prove the movement, not pay for a button press." Then he had the glass of water removed and a real spike flattener
   put in its place (stairs up and down). These pin the fix in after-meal-checklist-core.js / .js. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../after-meal-checklist-core.js');
const ui = fs.readFileSync(path.join(__dirname, '..', 'after-meal-checklist.js'), 'utf8');

const MIN = 60000;
const T0 = new Date(2026, 9, 25, 19, 0, 0).getTime();
const meal = o => Object.assign({ id: 'meal:abc', ts: T0, ateSet: true, via: 'fuel', xp: 15 }, o || {});
const fresh = () => C.pending(meal(), T0);
const S = 1000;

/* what the card does on a tap: a timed tile that is not running starts; otherwise the tap is a confirm (claim) */
function tap(ledger, p, item, now) {
    if (C.isDone(p, item)) return { p, paid: 0, why: 'done' };
    if (C.timed(item) && !C.live(p, item, now)) { const r = C.start(p, item, now); return { p: r.p, paid: 0, started: r.ok }; }
    const c = C.claim(ledger, p, item, now);
    if (!c.complete) return { p, paid: 0, why: c.why };
    const done = p.done.concat([item]);
    if (c.ok) ledger.push({ day: C.dayKey(now), ts: now, amt: c.xp, src: C.SRC, eventId: c.eventId });
    return { p: Object.assign({}, p, { done }), paid: c.ok ? c.xp : 0 };
}

test('four timed movements: walk 10 min, squats 1 min, stairs 6 min, upright 30 min; the glass of water is gone', () => {
    assert.deepStrictEqual(C.IDS, ['walk', 'muscle', 'stairs', 'upright']);
    assert.strictEqual(C.DUR.walk, 10 * MIN);
    assert.strictEqual(C.DUR.muscle, MIN);
    assert.strictEqual(C.DUR.stairs, 6 * MIN);
    assert.strictEqual(C.DUR.upright, 30 * MIN);
    assert.ok(C.IDS.every(C.timed), 'every tile is a timer now');
    assert.ok(!C.timed('water'));
    assert.strictEqual(C.claim([], fresh(), 'water', T0 + MIN).why, 'unknown', 'a water tap pays nothing');
    const st = C.ITEMS.find(i => i.id === 'stairs');
    assert.match(st.src, /Takaishi 2012/);
    assert.doesNotMatch(Object.values(C.STR.en).join(' ') + C.ITEMS.map(i => i.l[0] + i.s[0]).join(' '), /water|glass/i);
    assert.doesNotMatch(ui, /LowiSpirit\.water|waterEvents/, 'the card no longer logs water');
    assert.strictEqual(C.durText('walk', 'de'), '10 Min.');
    assert.strictEqual(C.clock(9 * MIN + 41 * S), '9:41');
    assert.strictEqual(C.clock(500), '0:01');
});

test('starting a timed action is not completing it: no XP, no tick, and an early confirm is refused', () => {
    let p = fresh();
    const r = C.start(p, 'walk', T0 + MIN);
    assert.ok(r.ok); assert.strictEqual(r.why, 'started');
    assert.deepStrictEqual(r.p.done, [], 'nothing ticked');
    assert.deepStrictEqual(p.run, {}, 'start returns a new state');
    p = r.p;
    assert.ok(C.live(p, 'walk', T0 + MIN)); assert.ok(!C.ready(p, 'walk', T0 + MIN));
    for (const item of C.IDS) {
        assert.strictEqual(C.claim([], fresh(), item, T0 + 20 * MIN).why, 'start', item + ' never started cannot be confirmed');
        assert.strictEqual(C.claim([], fresh(), item, T0 + 20 * MIN).complete, false);
    }
    const c = C.claim([], p, 'walk', T0 + MIN + 2 * S);
    assert.deepStrictEqual([c.ok, c.complete, c.xp, c.why], [false, false, 0, 'early']);
});

test('each timer has to run its full duration before the confirm counts and pays once', () => {
    const cases = [['walk', 10 * MIN], ['muscle', MIN], ['stairs', 6 * MIN], ['upright', 30 * MIN]];
    for (const [item, d] of cases) {
        const at = T0 + 2 * MIN, p = C.start(fresh(), item, at).p;
        assert.strictEqual(C.claim([], p, item, at + d - S).why, 'early', item + ' one second short');
        assert.strictEqual(C.remaining(p, item, at + d - S), S);
        assert.ok(C.ready(p, item, at + d));
        const c = C.claim([], p, item, at + d);
        assert.deepStrictEqual([c.ok, c.complete, c.xp, c.eventId], [true, true, 3, 'pmc:meal:abc:' + item], item + ' after the full time');
        const L = [{ day: C.dayKey(at + d), ts: at + d, amt: 3, src: C.SRC, eventId: c.eventId }];
        assert.strictEqual(C.claim(L, p, item, at + d + S).ok, false, item + ' a second confirm pays nothing');
        assert.strictEqual(C.claim(L, p, item, at + d + S).why, 'dup');
    }
});

test('a tap storm (all four in seconds, again and again) pays nothing and never unlocks Spike Tamer', () => {
    const L = []; let p = fresh(), paid = 0;
    ['walk', 'muscle', 'stairs', 'upright', 'walk', 'muscle', 'upright', 'stairs', 'walk', 'water'].forEach((item, k) => {
        const r = tap(L, p, item, T0 + 10 * S + k * 300); p = r.p; paid += r.paid;
    });
    assert.deepStrictEqual(p.done, [], 'nothing counts right away');
    assert.strictEqual(paid, 0);
    assert.strictEqual(L.length, 0, 'no ledger entry, so no level-up');
    assert.ok(!C.shouldUnlock(L, p.done), 'no secret achievement for tapping');
    assert.deepStrictEqual(Object.keys(p.run).sort(), ['muscle', 'stairs', 'upright', 'walk'], 'the four timers are running');
    assert.strictEqual(p.run.walk, T0 + 10 * S, 'repeated taps do not restart the walk timer');
});

test('the full checklist only after every timer really ran out and was confirmed', () => {
    const L = []; let p = fresh();
    for (const item of C.IDS) p = tap(L, p, item, T0 + MIN).p;
    for (const item of ['walk', 'muscle', 'stairs']) p = tap(L, p, item, T0 + 11 * MIN).p;
    assert.ok(!C.shouldUnlock(L, p.done), 'upright still running at minute 11');
    p = tap(L, p, 'upright', T0 + 20 * MIN).p;
    assert.ok(!C.shouldUnlock(L, p.done), 'an early upright confirm does not count');
    p = tap(L, p, 'upright', T0 + 31 * MIN).p;
    assert.ok(C.shouldUnlock(L, p.done), 'all four really finished');
    assert.strictEqual(L.reduce((n, e) => n + e.amt, 0), 12);
});

test('the 60-minute window applies to the start; a started action stays confirmable for a while after its timer ends', () => {
    const p50 = C.start(fresh(), 'upright', T0 + 50 * MIN).p;
    assert.ok(C.open(p50, T0 + 70 * MIN), 'the card stays open while the upright half hour runs past minute 60');
    const c = C.claim([], p50, 'upright', T0 + 80 * MIN);
    assert.deepStrictEqual([c.ok, c.xp], [true, 3], 'started at minute 50, finished at minute 80: counts');
    assert.strictEqual(C.claim([], p50, 'upright', T0 + 80 * MIN + C.GRACE_MS + S).why, 'expired');
    assert.ok(!C.open(p50, T0 + 80 * MIN + C.GRACE_MS + S), 'and then the card ends');
    assert.strictEqual(C.start(fresh(), 'walk', T0 + 61 * MIN).why, 'late', 'no new start after the window');
    assert.ok(!C.open(fresh(), T0 + 61 * MIN));
    const exp = C.start(fresh(), 'walk', T0 + MIN).p;
    assert.strictEqual(C.start(exp, 'walk', T0 + MIN + 10 * MIN + C.GRACE_MS + S).ok, true, 'an expired, unconfirmed timer can start again inside the window');
});

test('a reload keeps the timer: the state is plain JSON and a re-start does not move the start time', () => {
    const p = JSON.parse(JSON.stringify(C.start(fresh(), 'walk', T0 + MIN).p));
    assert.strictEqual(C.start(p, 'walk', T0 + 5 * MIN).why, 'running');
    assert.strictEqual(C.startedAt(p, 'walk'), T0 + MIN);
    assert.strictEqual(C.claim([], p, 'walk', T0 + 11 * MIN).ok, true);
    const legacy = Object.assign({}, fresh()); delete legacy.run;   /* a checklist saved by the first release */
    assert.strictEqual(C.claim([], legacy, 'walk', T0 + 5 * MIN).why, 'start');
    assert.ok(C.start(legacy, 'walk', T0 + 5 * MIN).ok);
});

test('the card wiring: first tap starts, confirm goes through claim, nothing pays on start', () => {
    assert.match(ui, /C\.start\(/);
    assert.match(ui, /C\.claim\(/);
    assert.doesNotMatch(ui, /C\.decide\(/, 'the card never pays without claim');
    assert.match(ui, /'honest'/, 'the card says the timer is not tracking');
});

test('honest, kind copy: no tracking claim, no promise that it fixes the meal, no shame', () => {
    for (const l of C.LANGS) {
        const all = Object.values(C.STR[l]).join(' ') + ' ' + C.ITEMS.map(i => i.l[C.li(l)] + ' ' + i.s[C.li(l)]).join(' ');
        const claims = Object.keys(C.STR[l]).filter(k => k !== 'honest').map(k => C.STR[l][k]).join(' ');
        assert.doesNotMatch(claims, /tracked|verified|detected|measured|gemessen|erkannt|se mide|detectad/i, l + ': only the honest line talks about tracking, to say there is none');
        assert.doesNotMatch(all, /cancel|burn (it )?off|undo the meal|erase|guarantee|flattened|gegl\u00e4ttet|aplanada|smaller wave later|kleinere Welle|ola menor/i, l);
        assert.doesNotMatch(all, /lazy|faul|perezos|bad|schlecht|failed/i, l);
        for (const k of ['start', 'run', 'confirm', 'honest', 'min']) assert.ok(C.STR[l][k], l + '.' + k);
    }
    assert.match(C.STR.en.honest, /nothing is tracked/);
    assert.strictEqual(C.t('de', 'run', { t: '9:41' }), 'noch 9:41');
    assert.strictEqual(C.t('en', 'start', { d: C.durText('walk', 'en') }), 'Tap to start \u00b7 10 min');
});

test('a started timer never makes the card taller: the honest line takes the place of the intro line, not a new footer line', () => {
    /* Oct 25 (Maya 10, browser check after the rebase): with timers running, a reload drew the card with an extra footer line
       ("Just a timer, nothing is tracked ..."). In German and Spanish that line wraps, the taller card then overlapped a Home
       bubble at 390x844, and mount() folded the card for good: after reopening the app the tiles were hidden. */
    const paint = ui.slice(ui.indexOf('function paint()'), ui.indexOf('function paintFinal('));
    assert.ok(paint.length > 50, 'paint() found');
    const say = paint.slice(paint.indexOf('pmc-say'), paint.indexOf('pmc-grid'));
    const ft = paint.slice(paint.indexOf('pmc-ft'));
    assert.match(say, /'honest'/, 'the intro line turns into the honest line while a timer runs');
    assert.doesNotMatch(ft, /'honest'/, 'the footer never adds the honest line on top');
});
