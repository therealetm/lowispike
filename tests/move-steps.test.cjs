/* Oct 23 2026 (Eman, on a call): "People already have step counting apps. We don't have to be a step counting app ... at the end of
   the day someone can look at the phone and see how many steps they took, and then just tap a button ... just like with sleep."
   Then: three bubbles like Sleep, "casual, steady and epic", under 5k, 5k-10k and 10k+.
   Rules: move-estimate-core.js. One range a day: the same range again does nothing, another one replaces it (down too), older
   Quick / Medium / Long / Epic guesses of that day never stack with it, other days stay as they are. Self-reported: never called
   verified. These tests run the plan through a ledger that behaves like index.html's award / unaward (dedup by eventId). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const S = require('../sun-meter.js');
global.LowiWorldHealth = require('../world-health-core.js');
const WH = global.LowiWorldHealth;
const C = require('../move-estimate-core.js');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const DAY = '2026-10-23';
const NOW = new Date(2026, 9, 23, 21, 0, 0).getTime();

/* a ledger with index.html's rules: award refuses an eventId that is already there, unaward takes it off and returns its XP */
function fakeApp(ledger) {
    const app = { ledger: (ledger || []).slice(), xp: 0 };
    app.xp = app.ledger.reduce((n, e) => n + (+e.amt || 0), 0);
    app.award = (amt, label, src, eventId, extra, ts, day) => {
        if (app.ledger.some(e => e.eventId === eventId)) return 0;
        app.ledger.push(Object.assign({ ts: ts || NOW, day: day || DAY, amt, label, src, eventId }, extra)); app.xp += amt; return amt;
    };
    app.unaward = id => { const i = app.ledger.findIndex(e => e.eventId === id); if (i < 0) return 0; const a = +app.ledger[i].amt || 0; app.ledger.splice(i, 1); app.xp -= a; return a; };
    /* what move-bubble.js pick() does with a plan */
    app.pick = (lvl, day, ts) => {
        const p = C.plan(app.ledger, day || DAY, lvl, ts || NOW);
        if (p.action !== 'set') return p;
        let back = 0; for (const id of p.removeIds) back += app.unaward(id);
        const got = app.award(p.xp, 'Move · ' + lvl, C.SRC, p.eventId, { mq: p.applied, lvl, steps: p.band, est: 1 }, ts, day);
        return Object.assign(p, { got, back });
    };
    app.moveXp = day => app.ledger.filter(e => e.day === (day || DAY) && C.isEstimate(e)).reduce((n, e) => n + e.amt, 0);
    return app;
}
const legacy = (lvl, mq, slot, day, ts) => ({ ts: ts || NOW - 5 * 3600e3, day: day || DAY, amt: mq * 4, label: 'Move · ' + lvl, src: 'move:est', eventId: 'move:est:' + (day || DAY) + ':' + slot, mq, lvl, est: 1 });

test('step boundaries: under 5,000 Casual, 5,000 to 9,999 Steady, 10,000 and up Epic; no overlap, no gap', () => {
    const at = n => (C.levelForSteps(n) || {}).id;
    assert.strictEqual(at(0), 'casual'); assert.strictEqual(at(4999), 'casual');
    assert.strictEqual(at(5000), 'steady'); assert.strictEqual(at(9999), 'steady');
    assert.strictEqual(at(10000), 'epic'); assert.strictEqual(at(42000), 'epic');
    assert.strictEqual(C.levelForSteps(-1), null); assert.strictEqual(C.levelForSteps('x'), null);
    for (let i = 1; i < C.LEVELS.length; i++) assert.strictEqual(C.LEVELS[i].min, C.LEVELS[i - 1].max + 1, 'ranges touch exactly');
    assert.strictEqual(C.LEVELS.length, 3, 'three bubbles, like Sleep');
});

test('the same range tapped again and again: XP once, one entry, nothing else changes', () => {
    const app = fakeApp();
    const first = app.pick('steady');
    assert.strictEqual(first.got, 11);
    for (let i = 1; i <= 5; i++) assert.strictEqual(app.pick('steady', DAY, NOW + i * 600e3).action, 'same');
    assert.strictEqual(app.moveXp(), 11); assert.strictEqual(app.ledger.length, 1);
    assert.strictEqual(C.view(app.ledger, DAY).level, 'steady'); assert.strictEqual(C.view(app.ledger, DAY).text, '5k\u201310k');
});

test('upgrade and downgrade: today\'s XP and energy always equal the range now picked, down corrections included', () => {
    const app = fakeApp();
    const energy = () => S.energy({ now: NOW, ledger: app.ledger, logs: [], water: 0 }).value;
    app.pick('casual'); const eC = energy(); assert.strictEqual(app.moveXp(), 5);
    const up = app.pick('epic'); const eE = energy();
    assert.strictEqual(up.back, 5); assert.strictEqual(up.got, 16); assert.strictEqual(app.moveXp(), 16); assert.strictEqual(up.down, false);
    const down = app.pick('steady'); const eS = energy();
    assert.strictEqual(down.down, true); assert.strictEqual(down.net, -5); assert.strictEqual(app.moveXp(), 11);
    assert.ok(eC < eS && eS < eE, 'energy follows the range: ' + [eC, eS, eE]);
    app.pick('casual'); assert.ok(Math.abs(energy() - eC) < 1e-9, 'back to Casual = exactly the Casual energy again');
    assert.strictEqual(app.ledger.filter(e => e.day === DAY).length, 1, 'still one entry for the day');
});

test('any order of taps: never more than 16 Move XP a day, never more than one range entry, total = last pick', () => {
    const ids = ['casual', 'steady', 'epic'], want = { casual: 5, steady: 11, epic: 16 };
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let run = 0; run < 200; run++) {
        const app = fakeApp(); let last = null;
        for (let k = 0; k < 12; k++) { last = ids[Math.floor(rnd() * 3)]; app.pick(last, DAY, NOW + k * 1000); assert.ok(app.moveXp() <= 16); }
        assert.strictEqual(app.moveXp(), want[last]); assert.strictEqual(app.xp, want[last]);
        assert.strictEqual(app.ledger.filter(C.isEstimate).length, 1);
    }
});

test('day rollover: tomorrow starts empty, yesterday\'s range and XP stay in the history untouched', () => {
    const app = fakeApp();
    app.pick('epic', '2026-10-22', NOW - 86400e3);
    assert.strictEqual(C.view(app.ledger, DAY).level, null); assert.strictEqual(C.view(app.ledger, DAY).q, 0);
    const p = app.pick('casual', DAY, NOW);
    assert.strictEqual(p.action, 'set'); assert.deepStrictEqual(p.removeIds, []);
    assert.strictEqual(app.moveXp('2026-10-22'), 16); assert.strictEqual(app.moveXp(DAY), 5);
    assert.notStrictEqual(app.ledger[0].eventId, app.ledger[1].eventId, 'each day has its own id, so tomorrow is never refused as a duplicate');
    /* just before and just after local midnight are different days in the plan (the bubble passes dayKey()) */
    assert.strictEqual(C.plan(app.ledger, '2026-10-24', 'casual', NOW + 3 * 3600e3).action, 'set');
});

test('legacy: today\'s older Quick / Medium guesses are taken off when a range is picked (no stacking); older days are kept', () => {
    const old = [legacy('quick', 1, 1), legacy('medium', 2, 2), legacy('long', 3, 1, '2026-10-20')];
    const app = fakeApp(old);
    assert.strictEqual(C.view(app.ledger, DAY).q, 3); assert.strictEqual(C.view(app.ledger, DAY).level, null); assert.strictEqual(C.view(app.ledger, DAY).legacy, 2);
    assert.strictEqual(C.view(app.ledger, DAY).text, '3/4', 'an older day-in-progress still reads like before until a range is picked');
    const p = app.pick('steady');
    assert.deepStrictEqual(p.removeIds.sort(), ['move:est:' + DAY + ':1', 'move:est:' + DAY + ':2']);
    assert.strictEqual(p.back, 12); assert.strictEqual(app.moveXp(), 11);
    assert.strictEqual(app.ledger.filter(e => e.day === DAY && C.isEstimate(e)).length, 1);
    assert.strictEqual(app.ledger.filter(e => e.day === '2026-10-20').length, 1, 'the Oct 20 guess is history and stays');
    assert.strictEqual(C.quartersOf(legacy('long', 3, 1)), 3, 'older entries still read by their quarters');
    /* a legacy range-free day with the same level name as a range ("epic") is not mistaken for today\'s range */
    assert.strictEqual(C.view([legacy('epic', 4, 1)], DAY).level, null);
    assert.strictEqual(C.plan([legacy('epic', 4, 1)], DAY, 'epic', NOW).action, 'set', 'an old Epic guess is replaced by the Epic range, not treated as "same"');
});

test('a Move-page workout or steps log still fills the day; a range then adds nothing and takes nothing off', () => {
    const sess = { ts: NOW - 3600e3, day: DAY, amt: 20, label: 'Walk session', src: 'move:session', eventId: 'move:s1' };
    const app = fakeApp([sess]);
    for (const id of ['casual', 'steady', 'epic']) { const p = app.pick(id); assert.strictEqual(p.action, 'full'); assert.strictEqual(p.fromMovePage, true); }
    assert.strictEqual(app.ledger.length, 1); assert.strictEqual(app.xp, 20);
});

test('sun-meter, world health and world mood read the thirds unchanged (mq is still quarters)', () => {
    const one = lvl => { const app = fakeApp(); app.pick(lvl); return app.ledger; };
    const parts = lvl => WH.dayParts({ logs: [], ledger: one(lvl) }, DAY).move;
    assert.ok(Math.abs(parts('casual') - 1 / 3) < 0.01); assert.ok(Math.abs(parts('steady') - 2 / 3) < 0.01); assert.strictEqual(parts('epic'), 1);
    const e = lvl => S.energy({ now: NOW, ledger: one(lvl), logs: [], water: 0 });
    assert.ok(Math.abs(e('steady').parts.move - 2 / 3) < 0.01);
    const sess = S.energy({ now: NOW, ledger: [{ ts: NOW - 600e3, day: DAY, amt: 20, label: 'Walk session', src: 'move:session', eventId: 'move:s1' }], logs: [], water: 0 });
    assert.ok(Math.abs(e('epic').value - sess.value) < 1e-9, 'Epic = a full Move day, as before');
});

test('the bloom: three step orbs after Mirror, the picked one marked (aria-pressed), plain words in EN / DE / ES, honest copy', () => {
    const hb = read('home-blooms-v2.js'), mb = read('move-bubble.js'), css = read('home-blooms-v2.css') + read('move-bubble.css');
    assert.match(hb, /casual: \(\) => T\('Casual', 'Locker', 'Tranquilo'\), steady: \(\) => T\('Steady', 'Stetig', 'Constante'\), epic: \(\) => T\('Epic', 'Episch', 'Épico'\)/);
    /* Oct 24 2026 (Emmanuel: no second word on a bubble): the range is a number only, the same in every language */
    assert.match(hb, /casual: \(\) => '<5k', steady: \(\) => '5k\\u201310k', epic: \(\) => '10k\+'/);
    assert.match(hb, /on: cur === L\.id/); assert.match(hb, /aria-pressed="' \+ !!a\.on/); assert.match(hb, /hb2-on/);
    assert.match(css, /\.hb2-orb\.hb2-on \{/); assert.match(css, /\.wm-orb\.on \{/);
    assert.ok(hb.indexOf("id: 'mirror'") < hb.indexOf('C.LEVELS.forEach'), 'Mirror stays first');
    /* pick(): unaward every id the plan names, then one award with the band; the same range is a no-op with no dance */
    assert.match(mb, /for \(const rid of p\.removeIds\) back \+= \(\+br\.unaward\(rid\) \|\| 0\);/);
    assert.match(mb, /\{ mq: p\.applied, lvl: id, steps: p\.band, est: 1 \}/);
    const same = mb.slice(mb.indexOf("if (p.action === 'same')"), mb.indexOf("if (p.action === 'full')"));
    assert.ok(same.length > 0 && !/awardWith|lowi:care/.test(same), 'same range: nothing awarded, no care reaction');
    assert.match(mb, /LOWiSPIKE does not count or check steps, so it is your word, not a measurement/);
    assert.doesNotMatch(mb + hb, /verified steps|cheat-proof/i);
    assert.doesNotMatch(mb, /LowiHealth|HealthKit|pedometer|DeviceMotion/i, 'no step counting of our own');
});

test('onboarding copy matches: the Move card tells the step ranges, not Quick / Medium / Long / Epic', () => {
    const steps = read('tutorial-steps.js'), show = read('tutorial-show.js');
    const card = steps.slice(steps.indexOf("id: 'move', area: 'home'"), steps.indexOf("id: 'move-hold'"));
    assert.match(card, /Casual, Steady or Epic/); assert.doesNotMatch(card, /Quick, Medium/);
    assert.match(show, /moves: \['Casual', 'Steady', 'Epic'\]/);
});
