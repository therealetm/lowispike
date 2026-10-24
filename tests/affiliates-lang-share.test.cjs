'use strict';
/* Affiliates page follows the app's language (EN/DE/ES) everywhere and has a share button that shares the open track with the
   affiliate's own link (Eman, 21 Oct 2026). */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const B = require('../affiliates/blueprint-core.js');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('language: ?lang= wins, then the app setting, then the browser, else English', () => {
  assert.deepEqual(B.LANGS, ['en', 'de', 'es']);
  assert.equal(B.pickLang({ param: 'es', stored: 'de', nav: ['en-US'] }), 'es');
  assert.equal(B.pickLang({ param: 'xx', stored: 'de', nav: ['en-US'] }), 'de');
  assert.equal(B.pickLang({ stored: '', nav: ['es-MX', 'en'] }), 'es');
  assert.equal(B.pickLang({ stored: '', nav: ['fr-FR'] }), 'en');
  assert.equal(B.normLang('DE-at'), 'de');
  assert.equal(B.normLang('fr'), '');
});

test('every UI string exists in English, German and Spanish, with the same placeholders', () => {
  for (const [k, v] of Object.entries(B.STRINGS)) {
    assert.equal(v.length, 3, k + ' needs EN/DE/ES');
    v.forEach((s, i) => assert.ok(typeof s === 'string' && s.trim(), k + '[' + i + '] empty'));
    const ph = s => (s.match(/\{\w+\}/g) || []).sort().join();
    assert.equal(ph(v[1]), ph(v[0]), k + ' DE placeholders'); assert.equal(ph(v[2]), ph(v[0]), k + ' ES placeholders');
  }
  for (const k of ['share', 'shareText', 'linkCopied', 'startTitle', 'linkLine', 'tip', 'tipB', 'earnTitle', 'terms']) assert.ok(B.STRINGS[k], k);
  assert.notEqual(B.t('en', 'startTitle'), B.t('de', 'startTitle'));
  assert.notEqual(B.t('es', 'startTitle'), B.t('de', 'startTitle'));
});

test('scripts, shots and captions are translated, not German, in English and Spanish', () => {
  for (const lang of ['en', 'es']) {
    const S = B.series(lang);
    for (const id of B.ORDER) {
      const s = S[id], d = B.SERIES[id];
      assert.equal(s.scenes.length, d.scenes.length); assert.equal(s.shots.length, d.shots.length);
      assert.notEqual(s.caption, d.caption, lang + ' ' + id + ' caption'); assert.notEqual(s.onScreen, d.onScreen, lang + ' ' + id + ' on-screen');
      s.scenes.forEach((sc, i) => { assert.equal(sc.shot, d.scenes[i].shot); assert.ok(sc.lines.length && sc.lines.every(l => l.trim())); });
      if (id === 'lowispike') assert.equal(s.keyword, { en: 'recipe', es: 'receta' }[lang], 'the CTA word is translated'); else assert.equal(s.keyword, d.keyword);
      assert.equal(s.product, d.product);
    }
    assert.ok(B.scriptText('webdesign', lang).length > 100);
  }
});

test('share link: open track, screen and language, credited to the affiliate; bad ids dropped', () => {
  const base = 'https://therealetm.github.io/lowispike/affiliates/';
  assert.equal(B.shareUrl({ base, track: 'ugc', view: 'shots', lang: 'es', ref: 'abc-123' }), base + '?track=ugc&lang=es&ref=abc-123#ugc/shots');
  assert.equal(B.shareUrl({ base, track: 'webdesign', view: 'script', lang: 'en' }), base + '?track=webdesign&lang=en#webdesign');
  assert.equal(B.shareUrl({ base: base + '?x=1#old', track: 'webdesign', view: 'start', lang: 'de', ref: '<script>' }), base + '?track=webdesign&lang=de');
  assert.equal(B.cleanId('a'.repeat(65)), '');
});

test('page: every element the script relabels exists in the page', () => {
  const js = read('affiliates/blueprint.js'), html = read('affiliates/index.html');
  const made = ['shareStart', 'shareScript', 'shareShots'];
  const ids = [...new Set([...js.matchAll(/\$\('([A-Za-z]+)'\)/g)].map(m => m[1]))].filter(id => !made.includes(id));
  for (const id of ids) assert.ok(html.includes('id="' + id + '"'), 'missing #' + id);
});

test('page: follows the app language live and puts the share button on the right of every top bar', () => {
  const js = read('affiliates/blueprint.js'), css = read('affiliates/blueprint.css');
  assert.match(js, /LowiLang/); assert.match(js, /lowispike\.lang/); assert.match(js, /lowi:lang/);
  assert.match(js, /navigator\.share/); assert.match(js, /AbortError/); assert.match(js, /copy\(url/);
  for (const id of ['shareStart', 'shareScript', 'shareShots']) assert.ok(js.includes("'" + id + "'"), id);
  assert.match(js, /document\.documentElement\.lang = lang/);
  assert.match(css, /\.fab\.share\{/); assert.match(css, /\.seg\+\.fab\.share\{margin-left:auto\}/);
});
