'use strict';
/* Affiliates third track, LOWiSPIKE. Rewritten 24 Oct 2026 to Eman's exact six steps: (1) "Day X: lose [kg] within [time]", the
   creator's own goal, time in days or months, while the app's Shuffle runs; (2) the Shuffle stops; (3) "Nice. Today's insulin-friendly
   meal is [dish]"; (4) cut to cooking, yourself or with the AI video tool; (5) cut to the mukbang, rate the food; (6) CTA: the e-book,
   comment "Rezept" / "recipe" / "receta". The old 45-kilo opening and its note are gone, with no figure of Eman's in its place. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const B = require('../affiliates/blueprint-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const KW = { en: 'recipe', de: 'Rezept', es: 'receta' };

test('LOWiSPIKE is the third, free track with its own copy in English, German and Spanish', () => {
  assert.deepEqual(B.ORDER, ['webdesign', 'ugc', 'lowispike']);
  const L = B.SERIES.lowispike; assert.equal(L.free, true); assert.equal(L.keyword, 'Rezept');
  assert.deepEqual(B.langsOf('lowispike'), ['en', 'de', 'es']);
  for (const lang of B.LANGS) {
    const s = B.series(lang).lowispike;
    assert.equal(s.keyword, KW[lang]);
    assert.equal(s.scenes.length, 6); assert.equal(s.shots.length, 3);
    assert.deepEqual(s.scenes.map(x => x.shot), ['talk', 'screen', 'screen', 'cook', 'talk', 'outro']);
    assert.equal(s.follow, undefined); assert.equal(s.outro30, undefined);
    assert.ok(s.caption.includes(s.keyword));
  }
  assert.equal(B.series('de').lowispike.scenes, L.langs.de.scenes, 'German top level mirrors the German copy');
});

test('the six steps in Eman\'s order, in every language', () => {
  const want = {
    de: [/^Tag \[X\]: \[Ziel\] Kilo abnehmen innerhalb von \[Zeitraum\]\.$/, /Shuffle bleibt stehen/, /^Nice\. Die heutige insulinfreundliche Mahlzeit ist \[Mahlzeit\]\.$/, /Cut zum Kochen.*KI-Video-Tool/, /Cut zum Mukbang.*bewerten/, /E-Book.*kommentier \u201eRezept\u201c/],
    en: [/^Day \[X\]: losing \[Goal\] kilos within \[Time\]\.$/, /shuffle stops/, /^Nice\. Today\u2019s insulin-friendly meal is \[Meal\]\.$/, /Cut to cooking.*AI video tool/, /Cut to the mukbang.*rate/, /e-book.*comment \u201crecipe\u201d/],
    es: [/^D\u00eda \[X\]: perder \[Meta\] kilos en \[Tiempo\]\.$/, /mezcla se para/, /^\u00a1Genial! La comida de hoy, amigable con la insulina, es \[Comida\]\.$/, /Corte a cocinar.*IA/, /Corte al mukbang.*puntuar/, /e-book.*comenta \u201creceta\u201d/]
  };
  for (const lang of B.LANGS) {
    const sc = B.series(lang).lowispike.scenes, w = want[lang];
    assert.match(sc[0].lines[0], w[0]); assert.match(sc[0].note, /Tagen|days|d\u00edas/); assert.match(sc[0].note, /Monaten|months|meses/);
    assert.match(sc[1].label, w[1]); assert.match(sc[2].lines[0], w[2]);
    assert.match(sc[3].label, w[3]); assert.match(sc[4].label, w[4]); assert.match(sc[4].lines.join(' '), /10/);
    assert.match(sc[5].lines.join(' '), w[5]);
    assert.match(sc[0].note, /nie eine Zahl|never promise|nunca prometas/i, lang + ': no weight promise for viewers');
  }
});

test('the old opening is gone: no 45 kilos, no 7 months, no figure of Eman\'s anywhere in the track', () => {
  for (const lang of B.LANGS) {
    const txt = B.scriptText('lowispike', lang) + JSON.stringify(B.series(lang).lowispike);
    assert.ok(!/\b45\b|\b55\b/.test(txt), lang + ': no 45/55');
    assert.ok(!/7 Monat|7 months|7 meses|Typ, der diese App|guy who built|chico que hizo/i.test(txt), lang + ': no founder line');
    assert.ok(!txt.includes('genau so lassen'), lang + ': the keep-it note is gone');
  }
  assert.ok(B.scriptText('lowispike', 'en').includes('[X]'), 'the placeholders stay for the creator');
  assert.equal(B.fill('Day [X], [Meal]', { day: '[X]', food: '[Meal]' }, { day: 3 }), 'Day 3, [Meal]');
});

test('page: three-track switch, the free-track note says what is sold and how creators earn, in EN/DE/ES', () => {
  const js = read('affiliates/blueprint.js'), css = read('affiliates/blueprint.css');
  assert.ok(js.includes("else if (open && s.free) v.appendChild(h('div', { class: 'card day-card', id: 'freeCard' }"));
  assert.match(css, /\.bar \.seg\{flex:1 1 auto;min-width:0/); assert.match(css, /\.scene \.shot\.cook\{/);
  assert.ok(js.includes('function nb(text)') && /\.nb\{white-space:nowrap\}/.test(css), 'E-Book / KI-Video-Tool never break at the hyphen');
  assert.equal(B.STRINGS.freeTrack.length, 3);
  const [en, de, es] = B.STRINGS.freeTrack;
  assert.match(en, /e-book/); assert.match(en, /free/); assert.match(en, /upgrade/);
  assert.match(de, /E-Book/); assert.match(de, /gratis/); assert.match(de, /upgraden/);
  assert.match(es, /e-book/); assert.match(es, /gratis/); assert.match(es, /upgrade/);
});
