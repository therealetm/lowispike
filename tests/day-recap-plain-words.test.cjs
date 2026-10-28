'use strict';
/* Oct 28 2026 (Emmanuel, walking through the app on his iPhone): he read the day recap ("Ein ruhiger, gleichmäßiger Tag",
   meals, longest pause, glasses, points, "Jede bewertete Mahlzeit heute war eine ruhige Wahl", no likely spike, tomorrow's
   walk) and did not understand what any of it meant. Every number now says what it is, with its unit and where it comes
   from; ratings are named as the app's estimate from the food, never a measured blood sugar. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../day-recap-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const NOW = new Date(2026, 9, 28, 21, 0).getTime();
const at = (h, m) => new Date(2026, 9, 28, h, m || 0).getTime();
const DAY = '2026-10-28';
const day = extra => Object.assign({
    now: NOW, levelOf: xp => ({ L: 1 + Math.floor(xp / 100) }),
    logs: [{ ts: at(8, 30), day: DAY, t: 'Quark mit Beeren', lvl: 'low' }, { ts: at(13, 5), day: DAY, t: 'Salat mit Huhn', lvl: 'low' }, { ts: at(16, 0), day: DAY, t: 'Etwas', r: 'unknown' }],
    ledger: [{ day: DAY, amt: 30, src: 'meal:spirit' }, { day: DAY, amt: 10, src: 'water' }, { day: DAY, amt: 20, src: 'fast:12' }],
    xp: 160, fast: { water: { [DAY]: 4 }, hist: [{ e: at(8, 0), h: 14 }] },
    move: { sessions: [], steps: { [DAY]: 12345 } }
}, extra || {});

test('the vague "calm" words are gone from every language', () => {
    const all = JSON.stringify(C.POOLS) + JSON.stringify(C.UI);
    assert.ok(!/ruhige[rn]? (Wahl|Tag)|gleichm|ruhiger,|calmer pick|calm, steady|same calm|gleiche Ruhe|tranquilas|tranquilo y constante|ohne Urteil/i.test(all));
    assert.ok(!/lässt mich leuchten|l\u00e4sst mich leuchten|make me glow|me har\u00eda brillar/.test(all), 'tomorrow\'s walk says why, not "makes me glow"');
});

test('a good day in German: each stat says what it is, its unit and where it comes from', () => {
    const v = C.view(C.summarize(day()), { lang: 'de', name: 'Misty', rnd: () => 0 });
    const st = k => v.stats.find(x => x.k === k);
    assert.deepEqual([st('meals').n, st('meals').b], ['3', 'Mahlzeiten eingetragen']);
    assert.equal(st('meals').sub, '2 \u00d7 kleiner Anstieg erwartet \u00b7 1 \u00d7 nicht bewertet');
    assert.deepEqual([st('gap').n, st('gap').b, st('gap').sub], ['14 Std.', 'L\u00e4ngste Zeit ohne Essen', 'aus deinen Mahlzeiten und der Essenspause']);
    assert.deepEqual([st('move').n, st('move').b], ['12.345', 'Schritte']);
    assert.deepEqual([st('water').n, st('water').b, st('water').sub], ['4', 'Gl\u00e4ser Wasser', 'so oft hast du heute Wasser eingetragen']);
    assert.equal(st('xp').b, 'Punkte (XP) heute');
    assert.equal(st('xp').sub, 'damit w\u00e4chst Misty: Essen +30, Wasser +10, Essenspause +20');
    assert.match(v.takeaway, /^F\u00fcr deine 2 bewerteten Mahlzeiten heute erwartet die App nur einen kleinen Blutzuckeranstieg/);
    assert.match(v.takeaway, /Sch\u00e4tzung aus dem Essen, kein Messwert/);
    assert.match(v.estimate, /Dein Blutzucker wird nicht gemessen/);
    assert.deepEqual(v.meals.map(m => m.time + ' ' + m.t + ' / ' + m.tag), ['08:30 Quark mit Beeren / kleiner Anstieg erwartet', '13:05 Salat mit Huhn / kleiner Anstieg erwartet', '16:00 Etwas / nicht bewertet']);
});

test('a spike day: the app "estimates" it, nothing was measured; Move minutes say where they were counted', () => {
    const d = day({ logs: [{ ts: at(9, 0), day: DAY, t: 'Toast', lvl: 'high' }, { ts: at(13, 0), day: DAY, t: 'Bowl', lvl: 'low' }], move: { sessions: [{ day: DAY, moved: 900 }], steps: { [DAY]: 2000 } } });
    for (const [lang, re, none] of [['de', /sch\u00e4tzt die App einen wahrscheinlichen Blutzucker-Spike/, /Gemessen wurde nichts/], ['en', /the app estimates a likely blood sugar spike/, /Nothing was measured/], ['es', /la app estima un probable pico de az\u00facar/, /No se midi\u00f3 nada/]]) {
        const v = C.view(C.summarize(d), { lang, name: 'Misty', rnd: () => 0 });
        assert.match(v.takeaway, re); assert.match(v.takeaway, none);
        assert.ok(v.meals[0].tag && v.meals[1].tag && v.meals[0].tag !== v.meals[1].tag);
    }
    const de = C.view(C.summarize(d), { lang: 'de', name: 'Misty', rnd: () => 0 });
    const mv = de.stats.find(x => x.k === 'move');
    assert.deepEqual([mv.n, mv.b, mv.sub], ['15 Min.', 'Bewegung', 'gez\u00e4hlt mit Bewegen \u00b7 2.000 Schritte']);
});

test('tomorrow\'s walk: what to do and why, in the app\'s own Body-trip wording', () => {
    const d = day({ move: { sessions: [], steps: {} } });
    const seen = new Set();
    for (let i = 0; i < 20; i++) seen.add(C.view(C.summarize(d), { lang: 'de', name: 'Misty', rnd: () => i / 20 }).nudge);
    assert.ok([...seen].some(n => /^Morgen: Geh nach dem Mittagessen 10 Minuten spazieren\. Ein kurzer Spaziergang nach dem Essen kann den Zuckeranstieg danach flacher machen\.$/.test(n)), [...seen].join(' | '));
    assert.ok(read('body-trips.js').includes('Ein kurzer Spaziergang nach dem Essen kann den Zuckeranstieg danach flacher machen.'), 'same sentence as the Body trips');
});

test('no placeholders left anywhere, all three languages', () => {
    for (const lang of ['de', 'en', 'es']) for (let i = 0; i < 6; i++) {
        const v = C.view(C.summarize(day()), { lang, name: 'Misty', rnd: () => i / 6 });
        assert.ok(!/undefined|NaN|\{\w+\}/.test(JSON.stringify(v)), lang + ' ' + JSON.stringify(v));
    }
});

test('the panel prints time, name and the estimate in words for each meal, stats as rows', () => {
    const ui = read('day-recap.js'), css = read('day-recap.css');
    assert.ok(/<time class="num">/.test(ui) && /drc-tag/.test(ui));
    assert.ok(/\.drc-stats \{ grid-template-columns: 1fr;/.test(css));
});

test('a water-only day no longer says "0 Minuten bewegt"', () => {
    const v = C.view(C.summarize(day({ logs: [], ledger: [], xp: 0, fast: { water: { [DAY]: 4 }, hist: [] }, move: { sessions: [], steps: {} } })), { lang: 'de', name: 'Misty', rnd: () => 0 });
    assert.ok(!/0 Minuten/.test(v.takeaway), v.takeaway);
    assert.equal(v.takeaway, 'Du hast heute 4-mal Wasser eingetragen. Mahlzeiten sind noch keine eingetragen, also gibt es nichts zu bewerten.');
});
