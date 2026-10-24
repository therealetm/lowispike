'use strict';
/* Affiliates: the scripts read aloud in the tutorial's voice (22 Oct 2026). Emmanuel: "I would like the affiliate texts, their scripts,
   to also have that voice. The same tutorial voice, so that they don't have to just read. They can just listen to what they can say
   in the camera." */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const B = require('../affiliates/blueprint-core.js');
const AV = require('../affiliates/script-voice.js');
const V = require('../app-voice.js');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
global.window = undefined;
const DATA = require('../app-voice-data.js');

test('the free preview reads scene 1 only; the unlocked script reads every scene in order', () => {
  for (const lang of ['en', 'de', 'es']) {
    const S = B.series(lang);
    for (const id of B.ORDER) {
      const s = S[id];
      const prev = AV.plan(B, s, { open: false, pick: id, lang, day: 1 });
      assert.deepEqual(prev.all.map(x => x.text), s.scenes[0].lines, id + ' preview = scene 1');
      assert.ok(prev.scenes.slice(1).every(x => x === null), 'locked scenes have no play list');
      assert.equal(prev.day, null, 'no day line in the preview');
      const open = AV.plan(B, s, { open: true, pick: id, lang, day: 1 });
      assert.deepEqual(open.all.map(x => x.text), [].concat(...s.scenes.map(x => x.lines)), id + ' every line, in order');
      assert.equal(open.total, s.scenes.length);
      open.scenes.forEach((list, i) => list.forEach((x, j) => { assert.equal(x.key, 's' + i + '-' + j); assert.equal(x.scene, i); }));
    }
  }
});

test('LOWiSPIKE has no day line any more (24 Oct 2026: Eman\'s six-step script, no 30-day follow lines)', () => {
  for (const lang of ['en', 'de', 'es']) {
    const s = B.series(lang).lowispike;
    assert.equal(AV.plan(B, s, { open: true, pick: 'lowispike', lang, day: 7 }).day, null);
    assert.ok(AV.sayable(B, lang).every(l => !/\b45\b/.test(l)), lang + ': no old 45-kilo line is read aloud');
  }
});

test('every line the page can read has a recorded clip in the tutorial voice (no robot fallback)', () => {
  /* the same three voices the tutorial speaks with */
  const tut = read('tutorial-voice.js').match(/const VOICES = (\{[^}]+\})/)[1];
  for (const lang of ['en', 'de', 'es']) { assert.ok(tut.includes("'" + DATA.voices[lang] + "'"), lang + ' voice = tutorial voice'); assert.equal(V.VOICES[lang], DATA.voices[lang]); }
  let n = 0;
  for (const lang of ['en', 'de', 'es']) {
    const all = AV.sayable(B, lang);
    assert.ok(all.length > 20, lang + ' has script lines');
    for (const line of all) for (const piece of V.pieces(line)) {
      const id = V.idOf(lang, piece);
      assert.ok(DATA.clips[lang] && DATA.clips[lang][id], lang + ' missing clip for: ' + piece);
      assert.ok(fs.existsSync(path.join(root, 'app-voice', lang, id + '.mp3')), 'mp3 on disk for: ' + piece);
      n++;
    }
  }
  assert.ok(n > 60);
});

test('the recorder harvests the Affiliates lines', () => {
  const P = require('../tools/app-voice/phrases.cjs');
  const r = P.harvest(false);
  assert.ok(r.src.affiliates > 100, 'affiliates source counted');
});

test('the tutorial voice engine is reused, not copied, and only plays from a tap on the Affiliates page', () => {
  const html = read('affiliates/index.html');
  const a = html.indexOf('src="script-voice.js"'), b = html.indexOf('src="../app-voice.js"'), c = html.indexOf('src="blueprint.js"');
  assert.ok(a > 0 && b > a && c > b, 'script-voice.js, then ../app-voice.js, then blueprint.js');
  const sv = read('affiliates/script-voice.js');
  assert.ok(/W\.LOWI_VOICE_TAP_ONLY = true/.test(sv), 'no silent unlock on every touch');
  assert.ok(!/speechSynthesis|new Audio|\bfetch\(/.test(sv), 'no own audio engine: LowiVoice does the speaking');
  assert.ok(!/innerHTML|insertAdjacentHTML/.test(sv), 'DOM nodes only');
  const app = read('app-voice.js');
  assert.ok(/if \(!W\.LOWI_VOICE_TAP_ONLY\) \{ D\.addEventListener\('touchend', unlock, true\); D\.addEventListener\('click', unlock, true\); \}/.test(app), 'the app keeps its first-touch unlock');
  assert.ok(/new URL\('\.\/', me\.src\)/.test(app) && /BASE \+ api\.DIR/.test(app) && /BASE \+ 'app-voice-data\.js\?v='/.test(app), 'clips are found next to app-voice.js from any page');
  assert.equal(V.DIR, 'app-voice/');
});

test('the page wires Listen into the script screen and stops it when the script or screen changes', () => {
  const js = read('affiliates/blueprint.js');
  assert.ok(/const VO = window\.LowiAffVoice \|\| null/.test(js));
  assert.ok(/function renderScript\(\) \{\n\s+if \(VO\) VO\.stop\(\);/.test(js), 'redraw stops reading');
  assert.ok(/if \(VO && to !== view\) VO\.stop\(\);/.test(js), 'leaving the screen stops reading');
  assert.ok(/VO\.listenCard\(said, lang, open\)/.test(js) && /VO\.sceneButton\(said, i, lang\)/.test(js) && /VO\.dayButton\(said, lang\)/.test(js));
  assert.ok(/'data-say': 's' \+ i \+ '-' \+ j/.test(js) && /'data-say': 'day'/.test(js), 'each line can light up while it is read');
});

test('button words exist in English, German and Spanish', () => {
  for (const k of Object.keys(AV.STR)) {
    assert.equal(AV.STR[k].length, 3, k);
    assert.ok(AV.STR[k].every(x => typeof x === 'string' && x.trim()), k);
  }
  assert.equal(AV.t('de', 'playScene', { n: 2 }), 'Szene 2 anh\u00f6ren');
  assert.equal(AV.t('es', 'sceneOf', { n: 1, total: 6 }), 'Escena 1 de 6');
  assert.equal(AV.t('xx', 'listen'), 'Listen to the script');
});
