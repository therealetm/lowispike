/* Lesson recall check (Oct 18, 2026). Emmanuel: "instead of assuming that the person remembered everything they were trying to teach,
   sometimes they can say 'Oh, remember when I told you this and this and that?' And there's a button that says 'yes'. You click on
   it, it doesn't repeat that lesson again and goes on to the next one, and it says 'Good, because now it's about blah blah blah.'
   If the person clicks 'no', it repeats that lesson."
   Lessons = each guide's facts (lines 1..n, not the hello and not today's line). Which lessons it told you, and which you said you
   remember, are kept on the device in lowi.guides.v1. On every other later visit (or when it has nothing new left) the guide asks
   about one lesson from an earlier visit you haven't confirmed yet. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../region-pals-core.js');
const A = require('../arrival-core.js');
const RT = require('../read-time-core.js');

test('every lesson has a short topic in English, German and Spanish that reads in both sentences', () => {
    for (const id of C.IDS) {
        const n = C.lessonCount(id, A);
        assert.ok(n >= 3, id + ' has lessons');
        for (const li of [0, 1, 2]) for (let i = 1; i <= n; i++) {
            const t = C.topic(id, i, li);
            assert.ok(t && t.length >= 8 && t.length <= 90, id + ' ' + i + ' ' + li + ': ' + t);
            assert.ok(!/[.?!]$/.test(t), 'topic is a clause, not a sentence: ' + t);
            const q = C.recallAsk(id, i, li), g = C.recallGood(id, i, li);
            assert.ok(q.indexOf(t) > 0 && /\?$/.test(q), q);
            assert.ok(g.indexOf(t) > 0, g);
        }
        assert.strictEqual(C.topic(id, 0, 'en'), '', 'the hello is not a lesson');
        assert.strictEqual(C.topic(id, n + 1, 'en'), '', 'today’s line is not a lesson');
    }
    assert.strictEqual(C.recallAsk('liver', 1, 'en'), 'Remember when I told you how your liver stores sugar and keeps your blood sugar steady?');
    assert.ok(/^Good, because now it’s about /.test(C.recallGood('liver', 3, 'en')));
    assert.ok(/^Weißt du noch/.test(C.recallAsk('liver', 1, 'de')) && /^¿Recuerdas/.test(C.recallAsk('liver', 1, 'es')));
});

test('topics stay true to the method: blood-sugar wording, no keto, fasting or supplement claims', () => {
    const all = JSON.stringify(C.TOPICS) + JSON.stringify(C.COPY);
    assert.ok(!/insulin spike|Insulinspitze|pico de insulina/i.test(all));
    assert.ok(!/cure|heilt|cura |supplement|Nahrungserg|suplement|ketone drink|Ketongetr|hours? of fasting|Stunden fasten|horas de ayuno/i.test(all));
});

test('memory: told and remembered lessons survive a save and a bad value', () => {
    const m = C.memory(null);
    C.meet(m, 'liver'); C.tell(m, 'liver', 1); C.tell(m, 'liver', 2); C.tell(m, 'liver', 2); C.remember(m, 'liver', 1);
    const b = C.memory(JSON.parse(JSON.stringify(m)));
    assert.deepStrictEqual(b.told.liver, [1, 2]);
    assert.deepStrictEqual(b.ok.liver, [1]);
    for (const bad of [{ told: 'x' }, { told: { liver: 'y' } }, { ok: { liver: [1, 'z', -3] } }, { told: { nope: [1] } }]) {
        const z = C.memory(bad); assert.ok(!z.told.nope); assert.ok(!z.ok.liver || z.ok.liver.every(Number.isInteger));
    }
});

test('opening on later visits: every other visit asks about an earlier lesson; when nothing is new it always asks', () => {
    const lines = C.lines('liver', 'en', A, '');
    const m = C.memory({ met: { liver: 1 }, told: { liver: [1, 2] } });
    const told0 = C.toldBefore(m, 'liver');
    const v2 = C.opening(m, 'liver', 'en', lines, new Set(), () => 0.3, told0, A);
    assert.ok(!v2.ask, 'first later visit: something new');
    assert.strictEqual(v2.i, 3, 'the next lesson it never told you');
    const v3 = C.opening(m, 'liver', 'en', lines, new Set(), () => 0.3, told0, A);
    assert.strictEqual(v3.ask, 1, 'next visit: asks about lesson 1');
    assert.ok(v3.text.indexOf(C.recallAsk('liver', 1, 'en')) > 0, v3.text);
    assert.ok(C.BACK[0].some(b => v3.text.indexOf(b) === 0), 'still opens with a welcome back');
    const all = C.memory({ met: { liver: 1 }, told: { liver: [1, 2, 3, 4, 5] }, ok: { liver: [1, 2] } });
    const o = C.opening(all, 'liver', 'en', lines, new Set(), () => 0.3, C.toldBefore(all, 'liver'), A);
    assert.strictEqual(o.ask, 3, 'nothing new left: asks about the first one you have not confirmed');
    const done = C.memory({ met: { liver: 1 }, told: { liver: [1, 2, 3, 4, 5] }, ok: { liver: [1, 2, 3, 4, 5] } });
    const d = C.opening(done, 'liver', 'en', lines, new Set(), () => 0.3, C.toldBefore(done, 'liver'), A);
    assert.ok(!d.ask, 'nothing to ask when you remember it all');
    const fresh = C.memory(null);
    assert.ok(C.opening(fresh, 'liver', 'en', lines, null, () => 0.3, C.toldBefore(fresh, 'liver'), A).intro, 'first meeting still says hello');
    const now = C.memory({ met: { liver: 1 }, since: { liver: 5 } });
    C.tell(now, 'liver', 1);
    assert.ok(!C.opening(now, 'liver', 'en', lines, new Set([1]), () => 0.3, new Set(), A).ask, 'never asks about something it told you this visit');
});

test('answers: Yes moves on to the next lesson without repeating, No replays the lesson', () => {
    const lines = C.lines('liver', 'en', A, '');
    const m = C.memory({ met: { liver: 1 }, told: { liver: [1, 2] } });
    const yes = C.answer(m, 'liver', 1, true, 'en', lines, new Set(), A);
    assert.ok(C.memory(m).ok.liver.indexOf(1) >= 0, 'Yes remembers it');
    assert.strictEqual(yes.i, 3, 'moves on to the next lesson, not lesson 1 again');
    assert.strictEqual(yes.text, C.recallGood('liver', 3, 'en') + ' ' + lines[3]);
    const no = C.answer(m, 'liver', 2, false, 'en', lines, new Set(), A);
    assert.strictEqual(no.i, 2, 'No replays that lesson');
    assert.ok(no.text.indexOf(lines[2]) > 0 && no.text.indexOf(lines[2]) + lines[2].length === no.text.length);
    assert.ok(C.memory(m).ok.liver.indexOf(2) < 0, 'No does not mark it remembered');
    const all = C.memory({ met: { liver: 1 }, told: { liver: [1, 2, 3, 4, 5] }, ok: { liver: [1, 2, 3, 4] } });
    const last = C.answer(all, 'liver', 5, true, 'en', lines, new Set(), A);
    assert.ok(last.i == null && last.text.length > 3, 'Yes on the last one: a short well done, no lesson');
    for (const li of [0, 1, 2]) { assert.ok(C.tr('yes', li) && C.tr('no', li) && C.tr('again', li) && C.tr('allDone', li)); }
});

test('the question stays up long enough to read and decide', () => {
    const q = 'Glad you’re back. ' + C.recallAsk('liver', 1, 'en');
    assert.ok(C.askMs(q) >= RT.ms(q) + 10000 && C.askMs(q) <= 40000);
});

test('wired: Yes / No glass buttons in the bubble, big enough to tap, lesson progress saved', () => {
    const js = read('region-pals.js'), css = read('region-pals.css');
    assert.ok(/class="rp-ask"/.test(js) && /rp-yes/.test(js) && /rp-no/.test(js));
    assert.ok(/C\.answer\(/.test(js) && /C\.tell\(/.test(js) && /memSave\(\)/.test(js));
    assert.ok(/C\.opening\(memLoad\(\), id, lang\(\), st\.lines, seen\[id\], null, st\.told0, A\)/.test(js));
    const btn = css.match(/\.rp-ask button \{[^}]*\}/);
    assert.ok(btn && /min-height: 44px/.test(btn[0]) && /min-width: 64px/.test(btn[0]), 'Apple tap size');
    assert.ok(/\.rp-ask \{[^}]*display: none/.test(css) && /\.rp-asking \.rp-ask \{[^}]*display: flex/.test(css), 'only while asking');
    assert.ok(/\.rp-asking \.rp-say small \{[^}]*display: none/.test(css), 'no “tap me” hint under a question');
    assert.ok(/lowi\.guides\.v1/.test(read('DATA_CONTRACTS.md')) && /told/.test(read('DATA_CONTRACTS.md')));
});
