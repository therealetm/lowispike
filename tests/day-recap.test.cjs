'use strict';
/* Oct 26 2026 (Emmanuel, voice message 11:22 PM: "Und setze das mit dem ... Day-Recap, whatever we call it, setz das um").
   MAYA-HANDOFF 0.40: Day recap = your companion's read-only look back at today, from data the app already holds. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../day-recap-core.js');

const NOW = new Date(2026, 9, 26, 21, 30).getTime();
const at = (h, m, dayOff) => new Date(2026, 9, 26 + (dayOff || 0), h, m || 0).getTime();
const DAY = '2026-10-26', YDAY = '2026-10-25';
const levelOf = xp => ({ L: 1 + Math.floor(xp / 100) });

function full() {
    return {
        now: NOW, levelOf,
        logs: [
            { ts: at(19, 40, -1), day: YDAY, t: 'Pasta', lvl: 'high' },
            { ts: at(8, 30), day: DAY, t: 'Eggs and spinach', lvl: 'low' },
            { ts: at(13, 0), day: DAY, t: 'Nutella toast', lvl: 'high' },
            { ts: at(19, 0), day: DAY, t: 'Salmon, rice, broccoli', r: 'ja' },
            { ts: at(16, 0), day: DAY, t: 'Something', r: 'unknown' }
        ],
        ledger: [
            { day: DAY, amt: 15, src: 'meal:spirit' }, { day: DAY, amt: 15, src: 'meal:spirit' },
            { day: DAY, amt: 5, src: 'water' }, { day: DAY, amt: 30, src: 'move:session' },
            { day: DAY, amt: 20, src: 'fast:12' }, { day: YDAY, amt: 99, src: 'meal:spirit' }
        ],
        xp: 210,
        fast: { water: { [DAY]: 5 }, hist: [{ e: at(8, 0), h: 11.5 }] },
        move: { sessions: [{ day: DAY, moved: 25 * 60 }, { day: YDAY, moved: 3000 }], steps: { [DAY]: 4200 } }
    };
}

test('summarize reads only today: meals with their likely spike verdicts, water, longest gap, Move, XP and level', () => {
    const s = C.summarize(full());
    assert.equal(s.day, DAY);
    assert.equal(s.meals.length, 4);
    assert.deepEqual(s.counts, { low: 2, medium: 0, high: 1, unknown: 1 });
    assert.equal(s.water, 5);
    assert.equal(s.gapH, 12.8, 'overnight gap 19:40 -> 08:30 beats the 11.5 h fast');
    assert.equal(s.moveMin, 25);
    assert.equal(s.steps, 4200);
    assert.equal(s.xp, 85);
    assert.deepEqual(s.xpBy, { meal: 30, water: 5, move: 30, gap: 20, other: 0 });
    assert.equal(s.levelTo, 3);
    assert.equal(s.levelFrom, 2);
    assert.equal(s.empty, false);
    assert.equal(s.evening, true);
});

test('an empty or broken day is an empty recap, never a crash', () => {
    const s = C.summarize({ now: NOW });
    assert.equal(s.empty, true);
    assert.equal(s.meals.length, 0);
    assert.equal(s.xp, 0);
    const b = C.summarize({ now: NOW, logs: 'x', ledger: [null, { amt: 'a' }], fast: null, move: { sessions: [null] } });
    assert.equal(b.empty, true);
    for (const lang of ['en', 'de', 'es']) {
        const v = C.view(s, { lang, name: 'Nova', rnd: () => 0.5 });
        assert.ok(v.hello && v.takeaway && v.nudge && v.title);
    }
});

test('a gap longer than 36 h is not a gap', () => {
    const s = C.summarize({ now: NOW, logs: [{ ts: at(9, 0, -3), day: '2026-10-23', lvl: 'low' }, { ts: at(10, 0), day: DAY, lvl: 'low' }] });
    assert.equal(s.gapH, 0);
    assert.equal(s.counts.low, 1);
});

test('every line exists in English, German and Spanish, says likely blood sugar spike and never insulin or a promise', () => {
    const P = C.POOLS;
    for (const k of Object.keys(P)) {
        for (const lang of ['en', 'de', 'es']) {
            assert.ok(Array.isArray(P[k][lang]) && P[k][lang].length >= 1, k + ' ' + lang);
            assert.equal(P[k][lang].length, P[k].en.length, k + ' has the same number of lines in ' + lang);
        }
    }
    for (const k of ['hello_good', 'hello_mixed', 'hello_quiet']) assert.ok(P[k].en.length >= 5, k + ' has at least five shuffled lines');
    const all = JSON.stringify(P) + JSON.stringify(C.UI);
    assert.ok(!/insulin/i.test(all), 'never insulin');
    assert.ok(!/\b(cure|heal|guarantee|diabet|weight loss|burn fat)/i.test(all), 'no medical promises');
    assert.ok(all.includes('likely blood sugar spike') && all.includes('Blutzucker-Spike') && all.includes('pico de az'));
    for (const k of Object.keys(C.UI)) for (const lang of ['en', 'de', 'es']) assert.ok(typeof C.UI[k][lang] === 'string' && C.UI[k][lang], 'UI ' + k + ' ' + lang);
});

test('the companion never says the same hello twice in a row', () => {
    const s = C.summarize(full());
    let last = -1;
    for (let i = 0; i < 60; i++) {
        const v = C.view(s, { lang: 'en', name: 'Nova', last, rnd: () => 0 });
        assert.notEqual(v.helloIdx, last);
        last = v.helloIdx;
    }
    const seen = new Set();
    for (let i = 0; i < 40; i++) seen.add(C.view(s, { lang: 'de', name: 'Nova', rnd: () => i / 40 }).hello);
    assert.ok(seen.size >= 4, 'shuffled, not one fixed text');
});

test('one honest takeaway and one gentle nudge that fit the day', () => {
    const s = C.summarize(full());
    const v = C.view(s, { lang: 'en', name: 'Nova', rnd: () => 0 });
    assert.match(v.takeaway, /1 of your 4 meals/);
    assert.match(v.takeaway, /likely blood sugar spike/);
    assert.match(v.nudge, /^Tomorrow/);
    const calm = C.summarize(Object.assign(full(), { logs: [{ ts: at(9, 0), day: DAY, lvl: 'low' }, { ts: at(13, 0), day: DAY, lvl: 'low' }] }));
    const vc = C.view(calm, { lang: 'de', name: 'Nova', rnd: () => 0 });
    assert.ok(!/Spike/.test(vc.takeaway) || /kein/i.test(vc.takeaway));
    const quiet = C.view(C.summarize({ now: NOW }), { lang: 'es', name: 'Nova', rnd: () => 0 });
    assert.ok(quiet.nudge.startsWith('Ma'), quiet.nudge);
    assert.equal(quiet.catchUp, true, 'an empty day offers the evening catch-up');
    assert.ok(!/undefined|NaN|\{n\}|\{name\}|\{m\}/.test(JSON.stringify([v, vc, quiet])));
});

test('the stats row: only parts with something to show, in the right language', () => {
    const v = C.view(C.summarize(full()), { lang: 'de', name: 'Nova', rnd: () => 0 });
    const ks = v.stats.map(x => x.k);
    assert.deepEqual(ks, ['meals', 'gap', 'move', 'water', 'xp']);
    assert.equal(v.stats.find(x => x.k === 'gap').n, '12,8 Std.');
    assert.equal(v.stats.find(x => x.k === 'xp').n, '+85');
    assert.ok(v.levelUp, 'grew a level today');
    const e = C.view(C.summarize({ now: NOW }), { lang: 'en', name: 'Nova', rnd: () => 0 });
    assert.deepEqual(e.stats, []);
});

test('wiring: loaded with the shell build, cached offline, reached from the companion card and My day, never auto-opened', () => {
    const html = read('index.html'), sw = read('sw.js'), hub = read('misty-hub.js'), ui = read('day-recap.js'), css = read('day-recap.css');
    const build = (html.match(/name="lowi-build" content="([0-9-]+)"/) || [])[1];
    assert.ok(html.includes('<script src="day-recap-core.js?v=' + build + '"></script>'));
    assert.ok(html.includes('<script src="day-recap.js?v=' + build + '"></script>'));
    assert.ok(html.includes('id="drcCss" href="day-recap.css?v=' + build + '"'));
    assert.ok(html.indexOf('day-recap.js?v=') < html.indexOf('misty-hub.js?v='), 'before the companion card');
    assert.ok(/STATIC\.push\("day-recap-core\.js", "day-recap\.js", "day-recap\.css"\)/.test(sw));
    assert.ok(/W\.LowiDayRecap/.test(hub) && /recap: \(\) =>/.test(hub), 'companion card bubble');
    assert.ok(/k: 'recap'/.test(hub), 'My day + card item');
    assert.ok(/W\.LowiDayRecap = \{/.test(ui));
    assert.ok(!/Notification|showNotification|pushManager/.test(ui), 'never notifies');
    assert.ok(/R2\.sheet\(/.test(ui), 'the shared glass sheet (back swipe, X, scrim)');
    assert.ok(/prefers-reduced-motion/.test(css), 'Reduce Motion');
    assert.ok(/backdrop-filter/.test(css), 'glass');
    assert.ok(/data-noi18n/.test(ui), 'own three languages, no auto translation');
});

test('the mini tour has a Day recap step', () => {
    const steps = read('tutorial-steps.js');
    assert.ok(/id: 'new-day-recap'/.test(steps));
    assert.ok(/covers: \[[^\]]*'day-recap'/.test(steps));
    assert.ok(/id: 'new-day-recap'[^\n]*scroll: true/.test(steps), 'the bubble sits low on the card: the step scrolls it into view');
    assert.ok(/if \(s\.scroll\) \{ try \{ el\.scrollIntoView/.test(read('tutorial.js')), 'tutorial.js honours scroll: true');
});
