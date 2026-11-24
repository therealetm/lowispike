// 23 Nov 2026 (Emmanuel): "disable any notification that people get ... food notifications and daily checkup ... every time I put in
// the food, there's like a pop-up ... Nuke them", and a plain photo in the chat "should still be in the same style ... The text then
// is always on the picture".
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
test('automatic pushes are off on the server; friend-to-friend energy pushes still go', () => {
  const s = R('supabase/functions/n1-push/index.ts');
  assert.match(s, /const AUTO_OFF = true;/);
  assert.match(s, /if \(AUTO_OFF && !b\.dry\) return J\(\{ ok: true, off: true \}\);\n\s+if \(!b\.dry\) \{ try \{ await nibblo\(\); \}/);
  assert.match(s, /if \(AUTO_OFF\) return J\(\{ ok: true, off: true \}\);\n\s+return await nibblo\(\);/);
  assert.match(s, /if \(b\.a === "energy"\) return await energy\(b\);/);
});
test('the Nibblo idea banner and the after-meal "Flatten the spike" card no longer pop up', () => {
  const n = R('nibblo-idea.js'); assert.match(n, /const OFF = true;\n\s+function notice\(\) \{\n\s+if \(OFF\) return false;/);
  const a = R('after-meal-checklist.js'); assert.match(a, /const OFF = true;\n\s+function go\(\) \{ if \(OFF\) return;/); assert.match(a, /if \(OFF\) return;\n\s+if \(!C\.justAte\(d, now\)\) return;/); assert.match(a, /if \(OFF && P\) \{ P = null; save\(\); \}/);
});
test('a plain chat photo is drawn as the same photo post: name, caption on the picture, no spike pill', () => {
  const c = R('community-chat.js');
  assert.strictEqual((c.match(/mealPost=!!\(mealPh&&\(mealPh\.meal\|\|mealPh\.src\)\);/g) || []).length, 2);
  assert.strictEqual((c.match(/\+\(!mealPh\.meal\?'':m\.id\?'<button type="button" class="cs-postpill"/g) || []).length, 2);
  assert.match(c, /:'<div class="cs-meal cs-meal-plain" aria-hidden="true"><\/div>'\)/);
  assert.match(R('chat-meal-post.css'), /\.cm-bub\.cm-pbub>\.cs-meal\.cs-meal-plain\{display:none!important\}/);
});
test('the bubble no longer speaks up by itself (fast, water, meal nudges over the app) (24 Nov 2026)', () => {
  const h = R('index.html');
  assert.match(h, /const N1_OFF = true;/);
  assert.match(h, /if \(!opts\.force && N1_OFF\) return null;/);
});
