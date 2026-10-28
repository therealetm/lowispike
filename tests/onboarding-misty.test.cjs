// Onboarding redesign (Oct 16, 2026): Misty-first, in Misty's world. Guards against the old herb/seed story coming back.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('onboarding copy tells the Misty story in all three languages, with no herb, seed or glow-up wording', () => {
  const src = read('herb-start.js');
  const tx = src.slice(src.indexOf('const TX={'), src.indexOf('const t=(k,o)'));
  assert.ok(tx.length > 1000);
  for (const bad of [/glow-up/i, /\bseed\b/i, /\bplant\b/i, /your herb/i, /\bherbs?\b(?!\})/i, /Kraut/i, /hierba/i, /Samen/i, /semilla/i, /pflanz/i, /planta/i, /sprout/i, /Keim/i])
    assert.ok(!bad.test(tx.replace(/plant(H|P|Btn)/g, '').replace(/\{herb\}/g, '')), 'old wording in onboarding: ' + bad);
  for (const lang of ['en:', 'de:', 'es:']) assert.ok(tx.includes(lang));
  // Oct 16 birth companion: before the birthday the companion is an unrevealed being with no name ("Misty" only stays as the fallback for existing users)
  // Oct 21 (TikTok advice): the first headline says what the app is and why it helps, not a riddle
  // Oct 25 (Eman): weight loss is a side effect; the headline is becoming your healthiest self
  assert.ok(tx.includes("plantH:'Eat smarter. Become your healthiest self, as a game.'") && tx.includes("plantH:'Iss kl\\u00fcger. Werde dein ges\\u00fcndestes Ich, als Spiel.'") && tx.includes("plantH:'Come mejor. Convi\\u00e9rtete en tu versi\\u00f3n m\\u00e1s sana, jugando.'"));
  assert.ok(!/Misty/.test(tx.slice(0, tx.indexOf('ivOver'))), 'no Misty in the gate copy');
  assert.ok(!/spirit world|Geisterwelt|mundo espiritual/.test(tx), 'Oct 19: never "spirit"');
  assert.ok(!/glow-up|Plant my herb|Every glow/i.test(read('index.html')));
});

test('onboarding draws the unrevealed companion (no name until the birthday reveal), not a seed in a pot', () => {
  const src = read('herb-start.js');
  assert.ok(!/hs-pot|hs-seed|hs-sprout|hsSeed|hsPot/.test(src));
  assert.ok(src.includes('T.plantHTML(') && src.includes("const MISTY='Misty'"));
  assert.ok(!/if\(a==='plant'\)\{[^\n]*setHerbName/.test(src), 'the gate no longer names the companion Misty');
  assert.ok(/herbArt\(0,'',1\)/.test(src) && /mysterySVG/.test(src));
  assert.ok(!/hs-art/.test(read('herb-start.css')));
});

test('starter plan reasons talk about Misty, not a herb', () => {
  const src = read('starter-core.js');
  assert.ok(!/your herb|dein Kraut|tu hierba/.test(src));
});

test('onboarding world stylesheet is linked before the app markup and cached by the service worker', () => {
  const html = read('index.html');
  /* Oct 28 launch scene: the stylesheets moved from the end of the head to the top of the body (under the launch scene) */
  const head = html.slice(0, html.indexOf('<div id="app"'));
  assert.ok(/<link rel="stylesheet" id="obwCss" href="onboarding-world\.css\?v=/.test(head));
  const sw = read('sw.js');
  assert.ok((sw.match(/"onboarding-world\.css"/g) || []).length >= 2);
  const css = read('onboarding-world.css');
  assert.ok(css.includes('.r2-gate') && css.includes('r2-obov') && css.includes('--r2-pri-ink: #0b1d3f'));
  assert.ok(css.includes('prefers-reduced-motion'));
});
