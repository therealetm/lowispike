'use strict';
/* Oct 25 2026 (Eman): "The side effect is losing weight. But it's actually just eating smarter to become your optimal self.
   People who want to gain weight can also use this." Every place a stranger meets the app says that, in en/de/es. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const decode = s => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

const OLD = [/eat smarter and lose weight/i, /nimm ab, als Spiel/i, /klüger essen und abnehmen/i, /adelgaza jugando/i, /You lose weight with the app/i, /Du nimmst mit der App ab/i, /Adelgazas con la app/i, /Losing weight/];

test('the welcome headline, the install guide, title, link previews and manifest say "healthiest self", not "lose weight"', () => {
  const hs = decode(read('herb-start.js')), html = read('index.html'), man = JSON.parse(read('manifest.webmanifest'));
  assert.ok(hs.includes("plantH:'Eat smarter. Become your healthiest self, as a game.'"));
  assert.ok(hs.includes("plantH:'Iss klüger. Werde dein gesündestes Ich, als Spiel.'"));
  assert.ok(hs.includes("plantH:'Come mejor. Conviértete en tu versión más sana, jugando.'"));
  assert.ok(html.includes('["Free app: eat smarter and become your healthiest self, as a game.", "Kostenlose App: klüger essen und dein gesündestes Ich werden, als Spiel.", "App gratis: come mejor y conviértete en tu versión más sana, jugando."]'));
  assert.ok(html.includes('<title>LOWiSPIKE · Eat smarter, become your healthiest self</title>'));
  assert.match(html, /<meta name="description" content="Free app to eat smarter and become your healthiest self, as a game\./);
  assert.match(html, /property="og:description" content="Eat smarter and become your healthiest self, as a game\./);
  assert.match(man.description, /^Eat smarter and become your healthiest self, as a game\./);
  for (const f of ['index.html', 'herb-start.js', 'manifest.webmanifest', 'community-rooms-ui.js', 'affiliates/blueprint-core.js', 'install-guide.js', 'tutorial-steps.js'])
    for (const re of OLD) assert.ok(!re.test(decode(read(f))), f + ' still frames the app as weight loss: ' + re);
});

test('weight is a choice: lose, gain or keep, plus "just be healthier" first; old picks keep their keys', () => {
  const html = read('index.html');
  const goals = JSON.parse(html.match(/const GOAL_TAGS = (\[.*?\]\]);/)[1]);
  const keys = goals.map(g => g[0]);
  assert.equal(keys[0], 'Just eat better');
  for (const k of ['Weight', 'Gain weight', 'Keep weight', 'Energy', 'Cravings', 'Skin', 'Steady blood sugar']) assert.ok(keys.includes(k), k);
  for (const row of ['["Gain weight", "Zunehmen", "Ganar peso"]', '["Keep my weight", "Gewicht halten", "Mantener mi peso"]', '["Just be healthier", "Einfach gesünder leben", "Cuidar más mi salud"]'])
    assert.ok(html.includes(row), row);
  const c = read('community-rooms-ui.js');
  assert.ok(c.includes("obQ1a:['⚖️ My weight','⚖️ Mein Gewicht','⚖️ Mi peso'],obQ1f:['🌱 Feeling healthier','🌱 Gesünder leben','🌱 Vivir más sano']"));
});
