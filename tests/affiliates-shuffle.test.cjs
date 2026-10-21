'use strict';
/* Affiliates third track (Eman, 21 Oct 2026): the 30-day LOWiSPIKE shuffle challenge. The app picks the day's meal (Shuffle my
   food), the creator shows the AI cooking preview, cooks, eats and rates it, and earns when viewers who join through the link buy. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const B = require('../affiliates/blueprint-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('LOWiSPIKE is the third, free track with its own copy in English, German and Spanish', () => {
  assert.deepEqual(B.ORDER, ['webdesign', 'ugc', 'lowispike']);
  const L = B.SERIES.lowispike; assert.equal(L.free, true); assert.equal(L.keyword, 'LOWISPIKE');
  assert.deepEqual(B.langsOf('lowispike'), ['en', 'de', 'es']);
  for (const lang of B.LANGS) {
    const s = B.series(lang).lowispike;
    assert.equal(s.scenes.length, L.scenes.length); assert.equal(s.shots.length, 3);
    assert.deepEqual(s.scenes.map(x => x.shot), L.scenes.map(x => x.shot));
    assert.equal(s.follow.length, 20); assert.ok(s.outro30.includes('30'));
    assert.ok(s.caption.includes(s.keyword) || s.caption.includes('LOWISPIKE'));
    assert.ok(s.scenes.some(x => /shuffle|mischen|mezcl|baraj/i.test(x.label + x.lines.join(' '))), lang + ': the shuffle is shown');
    assert.ok(s.scenes.some(x => /KI|AI|IA/.test(x.label)), lang + ': AI cooking preview');
  }
  assert.equal(B.series('de').lowispike.scenes, L.langs.de.scenes, 'German top level mirrors the German copy');
});

test('the day fills in, the follow line changes daily and wraps after 20, the copy carries all follow lines and the outro', () => {
  const d = B.series('en').lowispike;
  assert.notEqual(B.followLine('lowispike', 'en', 1), B.followLine('lowispike', 'en', 2));
  assert.equal(B.followLine('lowispike', 'en', 21), B.followLine('lowispike', 'en', 1));
  assert.equal(B.followLine('webdesign', 'en', 1), '');
  const txt = B.scriptText('lowispike', 'en', { day: 7 });
  assert.ok(txt.includes('Day 7') && !txt.includes('[X]'));
  assert.ok(txt.includes('20. ' + d.followLead + d.follow[19])); assert.ok(txt.includes(d.outro30.replace(/\[X\]/g, '7')));
  assert.ok(B.scriptText('lowispike', 'en').includes('[X]'), 'without a day the placeholder stays');
  assert.equal(B.fill('Day [X], [Food]', { day: '[X]', food: '[Food]' }, { day: 3 }), 'Day 3, [Food]');
});

test('page: three-track switch, day stepper with the day\'s follow line, all its text in EN/DE/ES', () => {
  const js = read('affiliates/blueprint.js'), css = read('affiliates/blueprint.css');
  for (const k of ['dayCard(s)', "'dayPrev'", "'dayNext'", 'B.followLine(pick, lang, day)', 's.follow ? { day } : null']) assert.ok(js.includes(k), k);
  assert.match(css, /\.bar \.seg\{flex:1 1 auto;min-width:0/); assert.match(css, /\.scene \.shot\.cook\{/);
  for (const k of ['followHead', 'outroHead', 'dayOf', 'dayPrev', 'dayNext', 'followToday', 'freeTrack']) assert.equal((B.STRINGS[k] || []).length, 3, k);
});
