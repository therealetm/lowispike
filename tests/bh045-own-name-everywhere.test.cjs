'use strict';
/* BH-045 (P-HARDCODED-NAME, bug hunt run 45): every user names their own companion. Lines that say the default name "Misty"
   must go through LowiBirthCompanion.withName (or the file's own wrapper) before a user sees or hears them. Live repro on
   20261026-165435 with a companion named Zorbo: VoiceOver's clean-flight line said "Controls hidden while Misty flies", the
   controller chip said "Misty is flying home". */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* the fixed sites: [file, the rendered expression that must be wrapped] */
const SITES = [
  ['clean-view.js', /sr\.textContent = on \? wnm\(C\.say\(lang\(\)\)\)/],
  ['misty-pad.js', /chip\(nm\(T\('Misty is flying home'/],
  ['atmosphere.js', /const W = k => wnm\(C\.word\(k, lang\(\)\)\)/],
  ['community-me.js', /lab = wnm\(LABELS\[l\] && LABELS\[l\]\[id\]\)/],
  ['food-photo-ai.js', /const t = \(k, l\) => wnm\(/],
  ['herb-quests.js', /const t = \(en, de, es\) => wnm\(/],
  ['install-guide.js', /esc\(wnm\(tx\('w_t', L\)\)\)/],
  ['misty-hunt.js', /LowiPraise\.say\(wnm\(tr\(key, lang\(\), v\)\)\)/],
  ['spirit.js', /esc\(wnm\(tr\('herbTip'\)\)\)/],
  ['sym-home.js', /const T = \(en, de, es\) => wnm\(/],
  ['move-bubble.js', /const T = \(en, de, es\) => wnm\(/],
  ['herb-start.js', /wnm\(C\.whyText\(a\.why,lang\(\)\)\)[\s\S]*wnm\(C\.whyText\(a\.why,lang\(\)\)\)/],
  ['herb-shop.js', /nmL\(L\('You keep everything/]
];

test('BH-045: each line that names the companion goes through the user\'s own name', () => {
  const miss = SITES.filter(([f, re]) => !re.test(read(f))).map(([f]) => f);
  assert.deepStrictEqual(miss, [], 'not wrapped: ' + miss.join(', '));
});

/* the wrapper itself: withName from companion-birth.js, with a renamed companion */
function withNameFor(name) {
  const src = read('companion-birth.js');
  const m = src.match(/function withName\(str\)\{[^\n]*\}/);
  assert.ok(m, 'withName found');
  const ctx = { displayName: () => name };
  vm.createContext(ctx); vm.runInContext(m[0] + ';this.withName=withName;', ctx);
  return ctx.withName;
}
test('BH-045: the clean-flight VoiceOver line and the controller chip read the chosen name', () => {
  const core = require(path.join(ROOT, 'clean-view-core.js'));
  const wn = withNameFor('Zorbo');
  for (const l of ['en', 'de', 'es']) {
    const s = wn(core.say(l));
    assert.ok(/Zorbo/.test(s) && !/\bMisty/.test(s), l + ': ' + s);
  }
  assert.strictEqual(wn('Misty is flying home'), 'Zorbo is flying home');
  assert.strictEqual(wn('Mistys Tagesgeschenk'), 'Zorbos Tagesgeschenk');
  assert.strictEqual(withNameFor('Misty')('Misty is flying home'), 'Misty is flying home');
});

/* the net for new code: every file with a user-facing string that says "Misty" must be known here, with how it is handled */
const KNOWN = {
  'atmosphere-core.js': 'shown via atmosphere.js W() -> wnm',
  'clean-view-core.js': 'read via clean-view.js announce() -> wnm',
  'community-me.js': 'gift label via wnm',
  'companion.js': 'only when the user has no companion of their own (the default IS Misty)',
  'food-photo-ai.js': 't() -> wnm',
  'herb-quests.js': 't() -> wnm',
  'herb-tamagotchi.js': 'legacy room screen, open() hands over to LowiSpirit; label fallback only',
  'install-guide.js': 'w_t rendered via wnm',
  'misty-hunt.js': 'say() -> wnm',
  'misty-pad.js': 'label() / hint / call-home chip via nm()',
  'move-bubble.js': 'T() -> wnm',
  'ranking.js': 'fallback when no companion record exists',
  'spirit.js': 'herbTip via wnm; captured is unused',
  'starter-core.js': 'whyText rendered in herb-start.js via wnm',
  'sym-home.js': 'T() -> wnm',
  'tutorial-steps.js': 'GESTURES list: developer metadata, never shown',
  'world-home.js': 'withNm()',
  'herb-shop.js': 'nmL()',
  'body-trips.js': 'nextTired wrapped with withName where it is drawn'
};
function mistyStrings(src) {
  const s = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
  const re = /(['"`])((?:\\.|(?!\1)[^\\\n])*?\bMistys?\b(?:\\.|(?!\1)[^\\\n])*?)\1/g; const out = []; let m;
  while ((m = re.exec(s))) { if (!/^Mistys?$/.test(m[2])) out.push(m[2]); }
  return out;
}
test('BH-045: no new file shows the default name without going through the chosen name', () => {
  const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && !/\.min\.js$|^tutorial-voice-data\.js$|^sw\.js$/.test(f));
  const unknown = files.filter(f => !KNOWN[f] && mistyStrings(read(f)).length).map(f => f + ': ' + mistyStrings(read(f))[0].slice(0, 60));
  assert.deepStrictEqual(unknown, [], 'new user-facing "Misty" strings: pass them through LowiBirthCompanion.withName, then list the file in KNOWN');
});
