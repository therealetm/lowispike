'use strict';
/* Oct 26, 2026, Emmanuel (voice, screenshot of "Out exploring · back in 59 min · Tap to call her back"):
   "You know the auto fly. If they want to manually tap, let them do that. But not automatically. It's quite annoying and
   then the UI breaks."
   The companion never goes exploring on her own: the sun trip starts only from a tap on "Send her exploring", body journeys
   no longer set off after a meal, old automatic trips come home on the next open with their finds, and while she is out
   Home keeps every button (no autopilot / clean view) with a small away card that fits inside her bubble. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const SUN = require('../sun-meter.js');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const sm = read('sun-meter.js'), css = read('sun-meter.css'), mf = read('misty-flight.js'), wh = read('world-home.js'), bt = read('body-trips.js');
const now = new Date(2026, 9, 26, 16, 0).getTime(), day = SUN.dayKey(now);

test('a trip she starts now is marked manual (a tap made it)', () => {
    const t = SUN.makeTrip(day, [], now, 'ok');
    assert.equal(t.manual, true);
    assert.equal(t.back - t.start, SUN.AWAY_MS);
});

test('an old automatic trip saved before the change comes home on open, with her find, and the model says home', () => {
    const g = { trips: { [day]: { start: now - 20 * 60000, back: now + 40 * 60000, item: 'dew', got: false, vigor: 'ok' } }, items: [] };
    const ledger = [{ ts: now - 20 * 60000, day, src: 'sun-full', eventId: 'sun-full:' + day, amt: 10 }];
    assert.ok(SUN.model({ now, ledger, garden: g }).away, 'before: an old build shows her away');
    assert.equal(SUN.settleAuto(g, now), 1);
    const t = g.trips[day];
    assert.equal(t.got, true); assert.equal(t.auto, true); assert.equal(t.back, now, 'she is home now');
    assert.equal(g.items.length, 1); assert.equal(g.items[0].day, day); assert.equal(g.items[0].id, 'dew');
    const v = SUN.model({ now, ledger, garden: g });
    assert.ok(!v.away, 'never shown away after the move');
    assert.equal(SUN.settleAuto(g, now), 0, 'runs once: nothing more to bring home, no second find');
    assert.equal(g.items.length, 1);
});

test('a full-energy old trip keeps both finds; a trip the user started keeps running', () => {
    const g = { trips: {}, items: [] };
    const old = SUN.makeTrip(day, [], now - 10 * 60000, 'thriving'); delete old.manual;
    g.trips[day] = old;
    const mine = SUN.makeTrip('2026-10-25', [], now - 5 * 60000, 'ok');
    g.trips['2026-10-25'] = mine;
    assert.equal(SUN.settleAuto(g, now), 1);
    assert.equal(g.items.length, 2, 'item and bonus find');
    assert.equal(g.trips['2026-10-25'].got, false, 'manual trip untouched');
    assert.equal(g.trips['2026-10-25'].back, mine.back);
});

test('old saved state loads cleanly: odd, empty or broken trips never throw and are left alone', () => {
    assert.equal(SUN.settleAuto(null, now), 0);
    assert.equal(SUN.settleAuto({}, now), 0);
    assert.equal(SUN.settleAuto({ trips: null }, now), 0);
    const g = { trips: { a: null, b: 'x', c: 5, d: {}, e: { start: 'nope', back: now + 1000 }, f: { start: now - 1000, back: now - 1, item: 'dew', got: false } } };
    assert.equal(SUN.settleAuto(g, now), 0, 'nothing away: an ended trip is collected the normal way');
    assert.ok(Array.isArray(g.items), 'items list made if missing');
    const g2 = { trips: { [day]: { start: now - 1000, back: now + 1000, got: false } }, items: 'broken' };
    assert.equal(SUN.settleAuto(g2, now), 1, 'a trip with no item still comes home');
    assert.ok(Array.isArray(g2.items));
});

test('the app brings old trips home before anything reads "away"', () => {
    assert.match(sm, /const live = \(\) => \{ const s = S\(\), now = Date\.now\(\); if \(s\.garden && s\.garden\.trips[^\n]+settleAuto\(s\.garden, now\)[^\n]+if \(n\) save\(\);/);
});

test('filling the sun never sends her off; only a tap on "Send her exploring" does', () => {
    const fill = sm.slice(sm.indexOf('function fill()'), sm.indexOf('function depart()'));
    assert.doesNotMatch(fill, /makeTrip/, 'fill() pays the bonus only');
    const check = sm.slice(sm.indexOf('function check('), sm.indexOf('function check(') + 900);
    assert.doesNotMatch(check, /depart\(\)/, 'no departure when the sun is checked');
    assert.doesNotMatch(sm, /setInterval\([^\n]*depart\(\)/, 'no departure on a timer');
    const calls = sm.match(/\bdepart\(\)/g) || [];
    const tapCall = /c\.dataset\.ls === 'go'[\s\S]{0,200}depart\(\)/.test(sm);
    assert.ok(tapCall, 'the go button calls depart');
    assert.equal(calls.length, 2, 'depart() appears only as its definition and in the go-button handler');
    assert.match(sm, /data-ls="go">' \+ esc\(tr\('sendOut'\)\)/);
    assert.match(sm, /data-ls="close">' \+ esc\(tr\('notNow'\)\)/, 'the full-sun sheet lets her stay');
    assert.match(sm, /\(v\.away \? recallBlock\(v\) : sendBlock\(v\)\)/, 'the sun sheet offers the start while she is home');
    assert.doesNotMatch(sm, /'Off you go'|I’m flying out into the world/);
});

test('body journeys no longer start after a meal, water or a Move; the Today row tap still starts them', () => {
    const gain = bt.slice(bt.indexOf('function gain('), bt.indexOf('let lastMeal'));
    assert.doesNotMatch(gain, /start\(st, /);
    assert.doesNotMatch(gain, /tr\('sent'\)/);
    assert.match(bt, /function startNext\(/);
});

test('her trip never turns on autopilot (that hid every Home button); she is not drawn drifting while out', () => {
    assert.doesNotMatch(mf, /trip && !PD\.mode[^\n]+padMode\(ctx, 'auto'\)/);
    assert.doesNotMatch(mf, /S\.trip \? 'auto' : 'home'/);
    assert.match(wh, /const show = padOn && \(r\.mode === 'home'/);
});

test('the away card fits inside her bubble and is the call-back button', () => {
    assert.match(css, /#spBubble > \.ls-back\.ls-recall \{ display: flex; flex-direction: column;[^}]*white-space: normal;[^}]*max-width: calc\(100% - 26px\);/);
    assert.match(sm, /'<b>' \+ esc\(tr\('out'\)\) \+ '<\/b><span class="ls-when num">'/);
    assert.doesNotMatch(sm, /tr\('tooTired'\)/, 'no "too tired to explore" note: she never waits to leave');
});

test('new words exist in English, German and Spanish and never call the companion "Misty"', () => {
    for (const k of ['goAsk', 'sendOut', 'notNow', 'sendNote', 'thanksDone', 'callBack', 'recallQ', 'leaves']) {
        const m = sm.match(new RegExp('\\n\\s*' + k + ": \\[('[^']*'), ('[^']*'), ('[^']*')\\]"));
        assert.ok(m, k);
        for (const s of m.slice(1)) { assert.ok(s.length > 4, k); assert.doesNotMatch(s, /Misty/, k); }
    }
});
