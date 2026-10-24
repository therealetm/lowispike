'use strict';
/* 24 Oct 2026 (Emmanuel: a member's card said "Star sign: Not shared. Birthday: Not shared. Personality: Not shared."; birthday must be shared
   with a countdown, star sign shared, personality shared if there is one, else a test link in the user's language). */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const P = require('../profile-share-core.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('a public birthday is day and month only: year 0004 marker, never the birth year or age', () => {
  assert.equal(P.encode('1990-12-24'), '0004-12-24');
  assert.equal(P.encode('2000-02-29'), '0004-02-29');
  assert.equal(P.encode('1999-02-29'), '', 'no 29 Feb in 1999');
  for (const bad of ['', null, undefined, '1990-13-01', '1990-04-31', 'x', '24.12.1990', 12345]) assert.equal(P.encode(bad), '');
  assert.deepEqual(P.decode('0004-12-24'), { m: 12, d: 24 });
  assert.equal(P.decode('1980-12-24'), null, 'an old full birthday (real year) is not a shared one');
  assert.equal(P.decode(''), null);
});

test('star sign comes from the date and agrees with the app zodiac() on every day of a leap year', () => {
  const start = html.indexOf('const ZOD = '), src = html.slice(start, html.indexOf('/* Streak:', start));
  const ctx = {}; vm.createContext(ctx); vm.runInContext(src + ';this.zodiac=zodiac;', ctx);
  const d = new Date(2000, 0, 1, 12);
  for (let i = 0; i < 366; i++) {
    const iso = '2000-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    assert.equal(P.signOf(P.decode(P.encode(iso))), ctx.zodiac(iso).n, iso);
    d.setDate(d.getDate() + 1);
  }
  assert.equal(P.signOf(null), '');
});

test('star sign names in English, German and Spanish', () => {
  assert.equal(P.signName('Capricorn', 'en'), 'Capricorn');
  assert.equal(P.signName('Capricorn', 'de'), 'Steinbock');
  assert.equal(P.signName('Capricorn', 'es'), 'Capricornio');
  assert.equal(P.signName('Leo', 1), 'Löwe');
  assert.equal(P.signName('Nope', 'de'), '');
  for (const s of P.SIGNS) for (const l of ['en', 'de', 'es']) assert.ok(P.signName(s, l));
});

test('countdown to the next birthday: today, tomorrow, after the day passed, year end, 29 February', () => {
  const at = (y, m, d) => new Date(y, m - 1, d, 15, 30).getTime();
  assert.equal(P.next({ m: 10, d: 24 }, at(2026, 10, 24)).days, 0);
  assert.equal(P.next({ m: 10, d: 25 }, at(2026, 10, 24)).days, 1);
  assert.equal(P.next({ m: 10, d: 23 }, at(2026, 10, 24)).days, 364, 'yesterday -> next year');
  assert.equal(P.next({ m: 1, d: 1 }, at(2026, 12, 31)).days, 1);
  assert.equal(P.next({ m: 12, d: 24 }, at(2026, 10, 24)).days, 61);
  const f = P.next({ m: 2, d: 29 }, at(2026, 10, 24));
  assert.equal(f.date.getFullYear(), 2027); assert.equal(f.date.getMonth(), 1); assert.equal(f.date.getDate(), 28, '29 Feb kept on 28 Feb in 2027');
  const g = P.next({ m: 2, d: 29 }, at(2028, 1, 10));
  assert.equal(g.date.getDate(), 29, 'real 29 Feb in 2028');
  assert.equal(P.next({ m: 2, d: 29 }, at(2027, 2, 28)).days, 0, 'celebrated on 28 Feb in a year without 29 Feb');
  assert.equal(P.next({ m: 2, d: 29 }, at(2027, 3, 1)).days, 365, 'after 28 Feb 2027 the next one is 29 Feb 2028');
  assert.equal(P.next(null), null);
  assert.equal(P.countdown(0, 'en'), 'Birthday today! 🎉');
  assert.equal(P.countdown(1, 'de'), 'Morgen');
  assert.equal(P.countdown(61, 'es'), 'en 61 días');
  assert.equal(P.countdown(61, 'de'), 'in 61 Tagen');
  assert.match(P.dayMonth({ m: 12, d: 24 }, 'en'), /24 December/);
  assert.match(P.dayMonth({ m: 12, d: 24 }, 'de'), /24\. Dezember/);
  assert.doesNotMatch(P.dayMonth({ m: 12, d: 24 }, 'en'), /2000|0004/);
});

test('the personality test opens in the user\'s own language (pages checked 24 Oct 2026)', () => {
  assert.equal(P.testLink('en'), 'https://www.16personalities.com/free-personality-test');
  assert.equal(P.testLink('de'), 'https://www.16personalities.com/de/kostenloser-personlichkeitstest');
  assert.equal(P.testLink('es'), 'https://www.16personalities.com/es/test-de-personalidad');
  assert.equal(P.testLink(2), P.TEST.es);
  assert.equal(P.testLink('fr'), P.TEST.en);
});

test('always published, no opt-out (Emmanuel, 24 Oct 08:30): day/month, the derived sign and a real type for every account with a birthday', () => {
  const u = { bday: '1990-12-24' };
  assert.deepEqual(P.publicRow(u, 'INTJ'), { bday: '0004-12-24', sign: 'Capricorn', mbti: 'INTJ' }, 'no consent record needed');
  assert.deepEqual(P.publicRow(Object.assign({ shareProfile: { v: 1, at: 5, off: true } }, u), 'intj'), { bday: '0004-12-24', sign: 'Capricorn', mbti: 'INTJ' }, 'an old "off" from the consent build is ignored');
  assert.deepEqual(P.publicRow(u, ''), { bday: '0004-12-24', sign: 'Capricorn', mbti: '' }, 'no type -> none invented');
  assert.deepEqual(P.publicRow({ bday: '' }, 'INTJ'), { bday: '', sign: '', mbti: '' }, 'no birthday -> nothing invented');
  assert.deepEqual(P.publicRow({ bday: '1999-02-29' }, 'INTJ'), { bday: '', sign: '', mbti: '' }, 'an impossible date is not published');
  assert.doesNotMatch(JSON.stringify(P.publicRow(u, 'INTJ')), /1990|\b3[0-9]\b/, 'no birth year, no age');
  assert.equal(P.consented, undefined, 'the consent gate is gone from the rules');
});

test('every stored birthday gives day/month, a countdown that matches a day-by-day count, and the sign', () => {
  const start = new Date(2026, 9, 24, 9, 0).getTime();
  for (const iso of ['1990-01-01', '1985-10-24', '2001-10-25', '1977-10-23', '2000-02-29', '1999-12-31', '1960-06-15']) {
    const pub = P.readPublic(P.publicRow({ bday: iso }, ''));
    assert.ok(pub.md, iso);
    assert.equal(pub.bday.slice(0, 5), '0004-');
    let n = 0; const d = new Date(start); d.setHours(0, 0, 0, 0);
    const m = +iso.slice(5, 7), day = +iso.slice(8, 10);
    while (!(d.getMonth() + 1 === m && (d.getDate() === day || (m === 2 && day === 29 && d.getDate() === 28 && !P.leap(d.getFullYear()))))) { d.setDate(d.getDate() + 1); n++; }
    assert.equal(P.next(pub.md, start).days, n, iso + ' countdown');
    assert.ok(pub.s, iso + ' sign');
  }
});

test('reading someone else: only the shared form counts; an old full-year row stays private', () => {
  assert.deepEqual(P.readPublic({ bday: '0004-03-01', sign: 'Leo', mbti: 'ENFP' }), { bday: '0004-03-01', s: 'Pisces', t: 'ENFP', md: { m: 3, d: 1 } }, 'sign recomputed from the date, a wrong stored sign is ignored');
  assert.deepEqual(P.readPublic({ bday: '1980-03-01', sign: 'Pisces', mbti: 'ENTJ' }), { bday: '', s: '', t: '', md: null });
  assert.deepEqual(P.readPublic({ bday: '', sign: 'Pisces', mbti: 'ENTJ' }), { bday: '', s: '', t: '', md: null });
  assert.deepEqual(P.readPublic({ bday: '0004-07-30', mbti: 'nope' }).t, '');
  assert.deepEqual(P.readPublic(null).md, null);
});
