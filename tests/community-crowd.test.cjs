'use strict';
// The simulated community crowd (tools/community-crowd): members are stable, distinct and write filled-in lines.
const test = require('node:test');
const assert = require('node:assert');
const crowd = require('../tools/community-crowd/crowd.cjs');
const K = require('../tools/community-crowd/content.cjs');
const C = require('../companion-core.js');

test('crowd: 100 members, same every time, unique names that never copy a real tester', () => {
  const a = crowd.people(), names = a.map(p => p.name.toLowerCase());
  assert.strictEqual(a.length, 100);
  assert.strictEqual(new Set(names).size, 100);
  for (const n of names) { assert.ok(n.length >= 1 && n.length <= 40, n); assert.ok(!/^(eman|fernando|joseph|koji|q|manuuii|emmy|emma|misty|maya)\b/.test(n), n); }
  delete require.cache[require.resolve('../tools/community-crowd/crowd.cjs')];
  const b = require('../tools/community-crowd/crowd.cjs').people();
  assert.deepStrictEqual(b.map(p => p.name), a.map(p => p.name));
});

test('crowd: spread over time zones, ages and the three app languages', () => {
  const a = crowd.people();
  assert.ok(new Set(a.map(p => p.tz)).size >= 12);
  for (const lg of ['en', 'de', 'es']) assert.ok(a.filter(p => p.lang === lg).length >= 10, lg);
  for (const band of ['genz', 'mill', 'old']) assert.ok(a.some(p => p.band === band), band);
  const t = Date.UTC(2026, 9, 20, 3, 0); // 3 AM UTC: someone is still awake somewhere
  assert.ok(a.some(p => crowd.awake(p, t) >= 0.8));
});

test('crowd: every topic in every language fills all its slots', () => {
  const p = crowd.people().find(x => x.lang === 'de');
  for (const lg of ['en', 'de', 'es']) {
    assert.deepStrictEqual(Object.keys(K.L[lg]).sort(), Object.keys(K.L.en).sort(), lg);
    for (const topic of Object.keys(K.L[lg])) {
      if (typeof K.L[lg][topic] === 'string') continue;
      for (let k = 0; k < 12; k++) {
        const s = crowd.line(p, topic, { lv: '3', streak: '4', name: 'eman', prod: 'Skyr', brand: 'Arla', sugar: '3,5', chain: 'REWE' }, lg);
        assert.ok(!/\{\w+\}/.test(s), lg + ' ' + topic + ': ' + s);
        assert.ok(s.length <= 560);
      }
    }
  }
});

test('crowd: each member gets its own valid companion look', () => {
  const looks = new Set();
  for (const p of crowd.people()) { const s = crowd.look(p, 2, 1792425000000 + p.i); assert.ok(s, p.name); assert.ok(C.decode(s), p.name); looks.add(s); }
  assert.ok(looks.size >= 95);
});

test('crowd: reading what people wrote', () => {
  assert.strictEqual(crowd.langOf('Hallo, wie geht es dir heute?'), 'de');
  assert.strictEqual(crowd.langOf('hola, qué tal el día'), 'es');
  assert.strictEqual(crowd.langOf('@Fernando Yo'), 'en');
  assert.strictEqual(crowd.topicOf('@Fernando Yo'), 'greet');
  assert.strictEqual(crowd.topicOf('what did you eat today?'), 'food');
  assert.strictEqual(crowd.topicOf('@Q \u26a1 eman sent you energy'), 'energy');
  assert.strictEqual(crowd.lvOf(0), 1); assert.strictEqual(crowd.lvOf(3000), 6);
});

test('crowd: meal logs use the app shape, one per slot per local day, in the member\'s own time zone', () => {
  const T = crowd._t, p = crowd.people().find(x => x.tz === 'Europe/Berlin') || crowd.people()[0];
  const lunch = Date.UTC(2026, 9, 20, 10, 30) + (p.tz === 'Europe/Berlin' ? 0 : 0);
  const slot = T.slotAt(p, lunch);
  if (p.tz === 'Europe/Berlin') assert.strictEqual(slot, 'lunch'); // 12:30 in Berlin
  const log = T.mealLog(p, lunch, 'Linsensuppe', 'lunch', 'crowd-test1');
  assert.deepStrictEqual(Object.keys(log).sort(), ['day', 'e', 'eventId', 'id', 'lvl', 'macros', 'photo', 'r', 'slot', 't', 'ts', 'via'].sort());
  assert.strictEqual(log.eventId, 'meal:crowd-test1');
  assert.strictEqual(log.macros, null); // unknown, never zero
  assert.match(log.day, /^\d{4}-\d{2}-\d{2}$/);
  assert.strictEqual(log.day, T.dayIn(p.tz, lunch));
  const s = { logs: [] };
  assert.strictEqual(T.addMeal(s, log), true);
  assert.strictEqual(T.addMeal(s, T.mealLog(p, lunch + 60e3, 'Pizza', 'lunch', 'crowd-test2')), false); // same slot, same day
  assert.strictEqual(T.addMeal(s, T.mealLog(p, lunch + 6 * 36e5, 'Pizza', 'dinner', 'crowd-test3')), true);
  assert.strictEqual(s.logs.length, 2);
  const big = { logs: Array.from({ length: 130 }, (_, i) => ({ day: '2026-01-01', slot: 'x' + i })) };
  T.addMeal(big, log); assert.strictEqual(big.logs.length, 120); assert.strictEqual(big.logs[119], log);
  assert.strictEqual(T.addMeal({}, log), true); // a member with no saved state yet
});

test('crowd: nobody logs a meal in the middle of their night, and the day follows their own clock', () => {
  const T = crowd._t, a = crowd.people();
  for (const p of a) {
    const t = Date.UTC(2026, 9, 20, 12, 0), h = crowd.hourIn(p.tz, t);
    if (h >= 2 && h <= 5) assert.strictEqual(T.slotAt(p, t), '', p.name + ' ' + p.tz);
    const title = T.mealTitle(p, 'dinner'); assert.ok(typeof title === 'string' && title.length > 0 && !/[{}]/.test(title));
  }
  const tokyo = a.find(p => p.tz === 'Asia/Tokyo');
  if (tokyo) assert.strictEqual(T.dayIn(tokyo.tz, Date.UTC(2026, 9, 19, 20, 0)), '2026-10-20');
});
