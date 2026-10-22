'use strict';
/* Oct 22 2026 (Emmanuel, smart-scale screenshot: "We need this in our app. They should be able to set starting time and see a graphic.").
   Pins: adding (backfill, one per day, no future), editing and deleting, the start date and the Since start window, kg <-> lb that
   survives the round trip, the stats maths (since start, weekly/monthly rate, highest, lowest, to goal), the smooth curve that never
   overshoots, three languages, encouraging copy (no "Over"), data on the device only, and the wiring (includes, offline cache, entries). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const C = require('../weight-journey-core.js');
const B = require('../body-stats-core.js');
const NOW = new Date('2026-10-22T09:00:00').getTime(), DAY = 864e5;
const state = () => ({ user: {}, health: {} });

test('add: backfill past days, one entry per day, never the future, S.health.weight follows the newest', () => {
    const s = state();
    assert.throws(() => C.add(s, { date: '2026-10-23', value: 100 }, NOW), /future/);
    assert.throws(() => C.add(s, { date: '2026-02-30', value: 100 }, NOW), /date/);
    assert.throws(() => C.add(s, { value: 'abc' }, NOW), /weight/);
    assert.throws(() => C.add(s, { value: 10 }, NOW), /weight/);
    C.add(s, { date: '2026-09-01', value: '107,6' }, NOW);
    C.add(s, { date: '2026-09-15', value: 104 }, NOW);
    const t = C.add(s, { value: 101.2 }, NOW);
    assert.strictEqual(t.ts, NOW, 'today keeps the clock time');
    C.add(s, { date: '2026-09-15', value: 103.5 }, NOW);
    const e = C.entries(s, NOW);
    assert.deepStrictEqual(e.map(x => x.kg), [107.6, 103.5, 101.2], 'same day replaces');
    assert.strictEqual(e[0].day, '2026-09-01');
    assert.strictEqual(s.health.weight, '101.2');
    C.add(s, { date: '2026-08-01', value: 110 }, NOW);
    assert.strictEqual(s.health.weight, '101.2', 'a backfilled old day does not become the current weight');
    assert.strictEqual(B.history(s, NOW).length, 4, 'the Weight & BMI sheet reads the same weigh-ins');
});

test('edit and delete', () => {
    const s = state();
    const a = C.add(s, { date: '2026-10-01', value: 100 }, NOW);
    C.add(s, { date: '2026-10-10', value: 98 }, NOW);
    C.edit(s, a.ts, { date: '2026-10-02', value: 99.5 }, NOW);
    let e = C.entries(s, NOW);
    assert.deepStrictEqual(e.map(x => [x.day, x.kg]), [['2026-10-02', 99.5], ['2026-10-10', 98]]);
    assert.throws(() => C.edit(s, e[0].ts, { value: 'x' }, NOW), /weight/);
    assert.strictEqual(C.entries(s, NOW).length, 2, 'a bad edit changes nothing');
    C.edit(s, e[0].ts, { date: '2026-10-10', value: 97 }, NOW);
    e = C.entries(s, NOW);
    assert.deepStrictEqual(e.map(x => [x.day, x.kg]), [['2026-10-10', 97]], 'moving onto a day that has one replaces it');
    assert.ok(C.remove(s, e[0].ts, NOW));
    assert.strictEqual(C.entries(s, NOW).length, 0);
    assert.strictEqual(s.health.weight, '');
    assert.strictEqual(C.remove(s, e[0].ts, NOW), false);
});

test('kg and lb: conversion and a round trip that keeps what was typed', () => {
    assert.strictEqual(C.toKg(200, 'lb'), 90.72);
    assert.strictEqual(C.show(C.toKg('200,1', 'lb'), 'lb'), 200.1);
    for (let v = 150; v < 320; v += 0.7) assert.strictEqual(C.show(C.toKg(v.toFixed(1), 'lb'), 'lb'), Math.round(v * 10) / 10, 'lb ' + v);
    assert.strictEqual(C.show(94, 'lb'), 207.2);
    assert.strictEqual(C.toKg(30, 'lb'), null, 'below 25 kg is a typo');
    const s = state();
    C.setUnit(s, 'lb');
    C.add(s, { value: 236.5, unit: 'lb' }, NOW);
    assert.strictEqual(C.show(C.entries(s, NOW)[0].kg, 'lb'), 236.5);
    assert.strictEqual(C.journey(s).unit, 'lb');
    C.setUnit(s, 'stone');
    assert.strictEqual(C.journey(s).unit, 'kg', 'unknown units fall back to kg');
});

test('start date, start weight and goal: set, edit, clear, validate', () => {
    const s = state();
    assert.throws(() => C.setJourney(s, { start: '2026-11-01' }, NOW), /future/);
    assert.throws(() => C.setJourney(s, { start: 'soon' }, NOW), /date/);
    assert.throws(() => C.setJourney(s, { goalValue: 'x' }, NOW), /goal/);
    let j = C.setJourney(s, { start: '2026-09-01', startValue: 237.2, goalValue: 207.2, unit: 'lb' }, NOW);
    assert.strictEqual(j.start, '2026-09-01');
    assert.strictEqual(C.show(j.startKg, 'lb'), 237.2);
    assert.strictEqual(C.show(j.goalKg, 'lb'), 207.2);
    j = C.setJourney(s, { start: '2026-09-05' }, NOW);
    assert.strictEqual(j.start, '2026-09-05');
    assert.strictEqual(C.show(j.goalKg, 'lb'), 207.2, 'editing the date keeps the goal');
    j = C.setJourney(s, { goalValue: '' }, NOW);
    assert.strictEqual(j.goalKg, null);
    assert.ok(!('goalKg' in s.health.body.journey));
});

test('Since start shows only weigh-ins from the start date; W/M/3M/Y/All windows and arrows', () => {
    const s = state();
    ['2026-08-20', '2026-08-31', '2026-09-01', '2026-09-20', '2026-10-05', '2026-10-21'].forEach((d, i) => C.add(s, { date: d, value: 110 - i * 2 }, NOW));
    C.setJourney(s, { start: '2026-09-01' }, NOW);
    const st = C.stats(s, { period: 'start' }, NOW);
    assert.deepStrictEqual(st.list.map(x => x.day), ['2026-09-01', '2026-09-20', '2026-10-05', '2026-10-21']);
    assert.strictEqual(st.startKg, 106, 'no start weight set: the first weigh-in on or after the start date');
    assert.strictEqual(st.day, 52, '1 Sep is day 1, 22 Oct is day 52');
    assert.strictEqual(C.stats(s, {}, NOW).period, 'start', 'with a start date the tracker opens on Since start');
    assert.strictEqual(C.stats(s, { period: 'all' }, NOW).list.length, 6);
    const w = C.stats(s, { period: 'W' }, NOW);
    assert.strictEqual(C.dayKey(w.range.from), '2026-10-19', 'weeks start on Monday');
    assert.deepStrictEqual(w.list.map(x => x.day), ['2026-10-21']);
    const m1 = C.stats(s, { period: 'M', offset: -1 }, NOW);
    assert.strictEqual(C.dayKey(m1.range.from), '2026-09-01');
    assert.deepStrictEqual(m1.list.map(x => x.day), ['2026-09-01', '2026-09-20']);
    assert.strictEqual(C.dayKey(C.stats(s, { period: 'M', offset: 3 }, NOW).range.from), '2026-10-01', 'no arrows into the future');
    assert.strictEqual(C.dayKey(C.stats(s, { period: '3M' }, NOW).range.from), '2026-08-01');
    assert.strictEqual(C.stats(s, { period: 'Y' }, NOW).list.length, 6);
    assert.strictEqual(C.stats(s, { period: 'Y', offset: -1 }, NOW).list.length, 0);
});

test('stats maths: since start, weekly and monthly rate, highest, lowest, trend, to goal', () => {
    const s = state();
    /* 1 kg a week down for 6 weeks, with a water bump in week 3 */
    for (let i = 0; i <= 6; i++) C.add(s, { date: C.dayKey(new Date('2026-09-01T12:00:00').getTime() + i * 7 * DAY), value: 107.6 - i + (i === 3 ? 0.8 : 0) }, NOW);
    C.setJourney(s, { start: '2026-09-01', startValue: 108, goalValue: 94 }, NOW);
    const st = C.stats(s, { period: 'start' }, NOW);
    assert.strictEqual(st.latest.kg, 101.6);
    assert.strictEqual(st.sinceStart, -6.4, 'against the start weight that was set');
    assert.ok(Math.abs(st.weekly + 1) < 0.15, 'about -1 kg a week, the bump barely moves it: ' + st.weekly);
    assert.ok(Math.abs(st.monthly - st.weekly * 30.44 / 7) < 0.01);
    assert.strictEqual(st.trend, 'down');
    assert.strictEqual(st.highest.kg, 107.6);
    assert.strictEqual(st.lowest.kg, 101.6);
    assert.strictEqual(st.toGoal, 7.6);
    assert.strictEqual(st.goalDir, 'down');
    assert.strictEqual(st.reached, false);
    assert.ok(Math.abs(st.goalPct - 6.4 / 14) < 1e-9);
    C.add(s, { value: 93.8 }, NOW);
    assert.strictEqual(C.stats(s, { period: 'start' }, NOW).reached, true);
    assert.strictEqual(C.weeklyRate([{ ts: NOW, kg: 90 }, { ts: NOW + DAY, kg: 89 }]), null, 'one day is not a rate');
    assert.strictEqual(C.stats(state(), {}, NOW).latest, null, 'empty is fine');
});

test('the curve is smooth and never overshoots a weigh-in; axis ticks are round', () => {
    const pts = [[0, 50], [10, 10], [20, 10], [30, 60], [40, 55]];
    const d = C.smoothPath(pts);
    assert.ok(d.startsWith('M0.0 50.0') && (d.match(/C/g) || []).length === 4);
    const ys = d.replace(/[MC]/g, ' ').trim().split(/\s+/).map(Number).filter((_, i) => i % 2 === 1);
    assert.ok(Math.min(...ys) >= 10 - 1e-6 && Math.max(...ys) <= 60 + 1e-6, 'control points stay inside the data');
    const t = C.ticks(93.1, 108.4);
    assert.ok(t.list.length >= 3 && t.list.length <= 6 && t.lo <= 93.1 && t.hi >= 108.4 && Number.isInteger(t.step));
});

test('UI: three languages, encouraging (no "Over" label), device-only, no tutorial file touched', () => {
    const ui = read('weight-journey.js');
    for (const l of ['en', 'de', 'es']) assert.ok(new RegExp('\\b' + l + ': \\{').test(ui), l);
    assert.ok(!/'Over'|Above avg|Übergewicht/.test(ui), 'no shaming labels');
    assert.ok(!/fetch\(|XMLHttpRequest|supabase|sendBeacon/i.test(ui + read('weight-journey-core.js')), 'nothing is sent anywhere');
    assert.ok(/LowiR2/.test(ui) && /save\(\)/.test(ui), 'saved like the rest of the state');
    assert.ok(/\.bs-wjhost/.test(read('weight-journey.css')) && !/#fff[^\w]*;\s*}\s*$/.test(read('weight-journey.css')), 'styled inside the dark glass Weight & BMI sheet');
    assert.ok(/prefers-reduced-motion/.test(read('weight-journey.css')));
});

test('wiring: merged into the one Weight & BMI sheet (Oct 22 2026): no second sheet, old links open it, no own Community row', () => {
    const html = read('index.html'), sw = read('sw.js');
    for (const f of ['weight-journey.css', 'weight-journey-core.js', 'weight-journey.js']) {
        assert.ok(html.includes(f + '?v='), 'index.html loads ' + f);
        assert.ok(sw.includes('"' + f + '"'), 'sw.js caches ' + f);
    }
    assert.ok(html.indexOf('weight-journey.js') > html.indexOf('body-stats.js'));
    const wj = read('weight-journey.js'), bs = read('body-stats.js');
    assert.ok(!/wjOv|createElement\('div'\)/.test(wj), 'no own overlay any more');
    assert.ok(!/'\+ ' \+ tr\('add'\)|data-wj="add"/.test(wj), 'no second Add weight button: the one weight field + Update today does it');
    assert.ok(!/heroHTML|cardsHTML/.test(wj), 'no second big current-weight number, no extra cards');
    assert.match(bs, /bs-wjhost/); assert.match(bs, /LowiWeightJourney\.mount\(/); assert.match(bs, /data-bs-u/);
    assert.ok(!/LowiWeightJourney\.cardHTML\(\)/.test(bs) && !/histHTML|progressHTML/.test(bs), 'no Weight journey card, no second list, no second bar');
    assert.match(wj, /LowiBodyStats\.open\(opts && opts\.add \? \{ weigh: true \} : \{ journey: true \}\)/, 'old ways in open the merged sheet');
    assert.match(wj, /data-wj-open/);
    const hs = read('home-settings-sleep-v2.js');
    assert.ok(!/you: \[[^\]]*'weight'/.test(hs) && /weight: \{ has:/.test(hs), 'no own Community row, old route still lands');
    assert.ok(!/LowiStatsPlugins/.test(wj), 'Stats shows the one Weight & BMI section');
    assert.ok(!/#[0-9a-f]{6}/i.test(read('weight-journey.css').replace(/#(0a84ff|5aa9ff|8fe7ff|bff3ff|bfe9ff|0b2350|04122c|fff)\b/gi, '')), 'brand blues only');
});
