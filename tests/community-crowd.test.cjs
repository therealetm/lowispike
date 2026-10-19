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
