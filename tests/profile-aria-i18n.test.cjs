'use strict';
/* Oct 24, 2026 button sweep: in German and Spanish the profile's controls showed translated words on screen, but screen readers
   still heard English (Close profile, Back, Show my weight, Add a profile photo, Audio mode, Read notifications aloud, the level
   card and the level badge). The page translator only rewrites text nodes and placeholders, not aria-labels, so each label is now
   built in the user's language where it is made. Source checks; the browser check is tools/sweep-buttons.cjs --lang de --labels. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('no hard-coded English aria-label left on the profile controls', () => {
  for (const lab of ['Audio mode', 'Read notifications aloud', 'Show my weight']) {
    assert.ok(!html.includes('aria-label="' + lab + '"'), lab + ' is still a literal English aria-label');
  }
  assert.ok(!html.includes('class="g2e-back" data-g2e-back data-sfx="close" aria-label="Back"'), 'profile Back is still English');
  assert.ok(!html.includes('setAttribute("aria-label", "Close profile"); b.innerHTML'), 'Close profile is still English only');
  assert.ok(!html.includes('(hasPic ? "Change profile photo" : "Add a profile photo") + \'">'), 'photo label untranslated');
  assert.ok(!html.includes('tapable(card, "Level " +'), 'level card label untranslated');
  assert.ok(!html.includes('", level " + lvN;'), 'badge level label untranslated');
});

test('the labels go through the translator or carry their own de/es words', () => {
  for (const lab of ['Audio mode', 'Read notifications aloud', 'Show my weight', 'Back']) {
    assert.ok(html.includes('aria-label="\' + (window.LowiLang ? LowiLang.t("' + lab + '")'), lab + ' does not go through LowiLang');
  }
  for (const w of ['Profil schließen', 'Cerrar perfil', 'addEventListener("lowi:lang", b.__lbl)', 'Mistys Wachstum öffnen', 'Abrir el crecimiento de Misty', ', nivel ']) {
    assert.ok(html.includes(w), 'missing ' + w);
  }
  /* the Back header is rebuilt when the language changes, not only when the part changes */
  assert.ok(html.includes('const kl = k + "|" +'), 'Back header key ignores the language');
});

test('every exact label used above has a dictionary row', () => {
  for (const lab of ['Audio mode', 'Read notifications aloud', 'Show my weight', 'Back', 'Change profile photo', 'Add a profile photo']) {
    assert.ok(html.includes('["' + lab + '", "'), 'no de/es row for ' + lab);
  }
});
