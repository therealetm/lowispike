'use strict';
/* Nov 8 2026 (Emmanuel: "instead of just reading, they can like play the tutorial on how to prepare the food ... almost like your grandma
   talking to you ... it's important that it's not just text to speech, but it's a script"). Every Challenge recipe has a hand-written
   spoken script in German and English, recorded once; the recipe in the panel has one big play button. Browser check: Chromium 393 x 852,
   pancakes recipe -> Anhören -> playing, Pause shown, progress bar. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const DATA = require('../challenge-voice-data.js');
const SCRIPTS = JSON.parse(read('tools/fakeaway/voice/scripts.json'));

function recipes() {
  const W = {}; W.window = W; W.self = W;
  const doc = { documentElement: { classList: { add() {} }, setAttribute() {} }, querySelector() { return null; }, getElementById() { return null; } };
  new Function('window', 'self', 'document', 'localStorage', 'navigator', 'location', read('faw-core.js'))(W, W, doc, { getItem() { return null; }, setItem() {} }, { language: 'de' }, { search: '', origin: '', pathname: '/' });
  return Object.keys(W.FAW.RECIPES);
}

test('every recipe has a script and a recording in German and English, and the recording matches its script', () => {
  const ids = recipes();
  assert.equal(ids.length, 12);
  for (const lang of ['de', 'en']) for (const id of ids) {
    const d = DATA[lang][id]; assert.ok(d, lang + ' ' + id);
    assert.equal(d.s, SCRIPTS[lang][id], 'data carries the script');
    assert.equal(d.h, crypto.createHash('sha1').update(SCRIPTS[lang][id], 'utf8').digest('hex').slice(0, 10), 'recorded from this script: ' + lang + ' ' + id);
    const st = fs.statSync(path.join(ROOT, d.f)); assert.ok(st.size > 50000 && st.size < 1500000, d.f + ' ' + st.size);
  }
});

test('the scripts talk like a person in the kitchen, not a list read out; no exact amounts (they follow the number of people)', () => {
  for (const lang of ['de', 'en']) for (const [id, s] of Object.entries(SCRIPTS[lang])) {
    assert.doesNotMatch(s, /\d+\s?(g|EL|TL|ml)\b/, lang + ' ' + id + ': no grams or spoons');
    assert.ok(s.split(/\s+/).length >= 35, lang + ' ' + id + ' is a real walk-through');
  }
  assert.match(SCRIPTS.de.maccheese, /Ganz wichtig: Danach richtig gut abtropfen lassen/);
  assert.match(SCRIPTS.de.burger, /Probier mal/);
  assert.match(SCRIPTS.en.fish, /Like the chip shop, only better\./);
});

test('one big play button in the recipe; capture-phase tap; stops when the recipe or the panel closes; not precached', () => {
  const v = read('challenge-voice.js'), cw = read('challenge-week.js'), sw = read('sw.js'), html = read('index.html');
  assert.match(cw, /W\.LowiChallengeVoice && W\.LowiChallengeVoice\.has\(id, fl\(\)\) \? W\.LowiChallengeVoice\.button\(id, fl\(\)\) : ''/);
  assert.match(v, /toggle\(b\.dataset\.cwkv, b\.dataset\.lang\);\n  \}, true\);/);
  assert.match(cw, /if \(k === 'close'\) \{ sheet = ''; try \{ if \(W\.LowiChallengeVoice\) W\.LowiChallengeVoice\.stop\(\);/);
  assert.match(cw, /function unmount\(\) \{[^\n]*LowiChallengeVoice\.stop\(\)/);
  assert.match(v, /Dein Begleiter führt dich durch/, 'says der Begleiter');
  assert.match(html, /<script src="challenge-voice-data\.js\?v=[^"]+"><\/script>\n<script src="challenge-voice\.js\?v=/);
  assert.ok(sw.includes('"challenge-voice.js", "challenge-voice-data.js"'));
  assert.ok(!/"media\/challenge\//.test(sw), 'the 24 recordings load when played, not with every update');
});
