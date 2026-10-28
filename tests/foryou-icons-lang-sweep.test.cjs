'use strict';
/* Oct 24, 2026 button sweep (16:20): in German and Spanish, two kinds of words stayed English.
   1. Community > For You: the pane is data-noi18n so people's posts stay as written, which also kept the app's own words in it
      English on screen: "That's everyone", "Newest first. No algorithm.", "Post something", the rail's Save / Share / Chat and
      the recipe chip's "Recipe", plus the Like / Comment / More labels screen readers hear. They now ask LowiLang where they are made.
   2. Icons that stand alone carry a spoken label (Home's daily missions read "Greens" and "Fish"). lowi-icons.js translated
      only some labels, so every food, move and control icon now has German and Spanish words.
   The browser check is tools/sweep-buttons-fyprobe.cjs --lang de and tools/sweep-buttons-textprobe.cjs --lang de --tab home. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const fy = fs.readFileSync(path.join(ROOT, 'foryou.js'), 'utf8');

function icons(lang) {
  const sb = { window: {}, LowiLang: { get: () => lang } };
  sb.window = sb; sb.self = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'lowi-icons.js'), 'utf8'), sb);
  return sb.LowiIcons || sb.window.LowiIcons;
}

test('every icon label has a German and a Spanish word', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lowi-icons.js'), 'utf8');
  const lab = src.match(/var LABEL = \{([\s\S]*?)\};/)[1];
  const words = [...new Set([...lab.matchAll(/:\s*'([^']+)'/g)].map(m => m[1]))];
  assert.ok(words.length > 100, 'labels not found');
  for (const lang of ['de', 'es']) {
    const I = icons(lang); assert.ok(I && I.fromEmoji, 'LowiIcons did not load');
    const missing = words.filter(w => {
      const k = Object.keys(I.map || {}).find(e => I.label(I.kind(e)) === w);
      if (!k) return false;
      const svg = I.fromEmoji(k, { alone: true });
      const said = (svg.match(/aria-label="([^"]*)"/) || [])[1];
      return said === w && !['Chat', 'Video', 'Pause', 'Burger', 'Avocado', 'Chili', 'Dessert', 'Okay', 'Info', 'Community', 'Home', 'Scan', 'Outfit', 'Vitamin', 'Animal', 'Chocolate', 'Leo', 'Virgo', 'Libra', 'Aries', 'Olive'] /* the same word in that language */.includes(w);
    });
    assert.deepEqual(missing, [], lang + ': screen readers still hear English for ' + missing.join(', '));
  }
  const de = icons('de');
  const greens = Object.keys(de.map).find(e => de.label(de.kind(e)) === 'Greens');
  const fish = Object.keys(de.map).find(e => de.label(de.kind(e)) === 'Fish');
  assert.match(de.fromEmoji(greens, { alone: true }), /aria-label="Grünzeug"/);
  assert.match(de.fromEmoji(fish, { alone: true }), /aria-label="Fisch"/);
  assert.match(icons('es').fromEmoji(fish, { alone: true }), /aria-label="Pescado"/);
});

test('For You end card, rail and recipe chip go through the translator', () => {
  assert.ok(!html.includes('<b>That\\\'s everyone</b>'), 'end card title is still literal English');
  assert.ok(!html.includes('No algorithm.</span>'), 'end card line is still literal English');
  assert.ok(!html.includes('data-sfx="open">Post something</button>'), 'end card button is still literal English');
  for (const w of ['fyT("That\'s everyone")', 'fyT("Newest first. No algorithm.")', 'fyT("Post something")', 'fyT(saved ? "Saved" : "Save")', 'aria-label="\' + fyT("More")', 'sp.textContent = fyT(on ? "Saved" : "Save")', 'LowiLang.t("Recipe")']) {
    assert.ok(html.includes(w), 'missing ' + w);
  }
  assert.ok(!html.includes('aria-label="Like">\' + FIC.heart'), 'Like label is still English');
  assert.ok(!html.includes('<span><small>Recipe</small>'), 'recipe chip is still English');
  for (const row of ['["Like", "Gefällt mir", "Me gusta"]', '["Comment", "Kommentieren", "Comentar"]', '["More", "Mehr", "Más"]', '["That\'s everyone", "Das war\'s", "Eso es todo"]', '["Newest first. No algorithm.",', '["Post something", "Etwas posten"']) {
    assert.ok(html.includes(row), 'dictionary row missing: ' + row);
  }
  /* the bot cards in foryou.js too */
  assert.ok(!fy.includes("aria-label=\"Save\">"), 'bot card Save label is still English');
  assert.ok(!fy.includes("<span>Share</span>"), 'bot card Share is still English');
  assert.ok(fy.includes("appT(saved ? 'Saved' : 'Save')"), 'bot card rail does not translate');
});
