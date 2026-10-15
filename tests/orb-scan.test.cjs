/* Oct 15: scanner bottom bar (Back + Deep analyze) and the Home orb as the herb game only.
   The capture actions that used to sit in the orb's herb world now live in the Scan bottom bar. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const spirit = fs.readFileSync(path.join(root, 'spirit.js'), 'utf8');

const openScanner = html.slice(html.indexOf('function openScanner(mode){'), html.indexOf('function openScanner(mode){') + 4000);
const camBarSrc = html.slice(html.indexOf('function camBar(){'), html.indexOf('function camAct(act){'));

test('scanner bottom has no photo-of-barcode button any more', () => {
  assert.ok(openScanner.length > 1000);
  assert.ok(!/data-b3="photo"/.test(openScanner), 'photo button still in the scanner');
  assert.ok(/camBar\(\) \+ '<\/div>'/.test(openScanner), 'scanner bottom must render camBar()');
});

test('Back sits above Deep analyze, both after the four actions', () => {
  const iActs = camBarSrc.indexOf('b3-cacts'), iBack = camBarSrc.indexOf('id="b3Back"'), iDeep = camBarSrc.indexOf('id="b3Deep"');
  assert.ok(iActs > 0 && iBack > iActs && iDeep > iBack, 'order must be actions, Back, Deep analyze');
  assert.ok(/class="b3-cback" data-b3="camclose"/.test(camBarSrc), 'Back must close the scanner');
  for (const k of ['scan', 'photo', 'meal', 'water']) assert.ok(camBarSrc.includes('act("' + k + '"'), 'missing action ' + k);
  assert.ok(/target="_blank" rel="noopener"/.test(camBarSrc));
});

test('Deep analyze opens the custom GPT already in the codebase, not an invented link', () => {
  const m = html.match(/const DEEP_GPT = "([^"]+)"/);
  assert.ok(m, 'DEEP_GPT constant missing');
  assert.match(m[1], /^https:\/\/chatgpt\.com\/g\/g-[0-9a-f]+-lowispike$/);
  const others = html.split(m[1]).length - 1;
  assert.ok(others >= 2, 'the GPT link must be the same one the app already uses elsewhere');
});

test('scanner action handler is wired and texts exist in en/de/es', () => {
  assert.ok(html.includes('case "camact": camAct(b.dataset.act); break;'));
  for (const k of ['camBack', 'deep', 'deepS', 'actsL', 'actScan', 'actScanL', 'actPhoto', 'actPhotoL', 'actMeal', 'actMealL', 'actWater', 'actWaterL']) {
    const m = html.match(new RegExp('\\n  ' + k + ': \\[("[^"]+"), ("[^"]+"), ("[^"]+")\\]'));
    assert.ok(m, 'text ' + k + ' needs en, de, es');
  }
  assert.ok(/\n  deep: \["Deep analyze", "Deep analyze", "Deep analyze"\]/.test(html), 'keep the name Deep analyze');
  assert.ok(/\n  camBack: \["Back", "Zurück", "Atrás"\]/.test(html));
});

test('camAct reuses the herb functions so XP, sun meter, macro bonus and duplicate block stay the same', () => {
  const src = html.slice(html.indexOf('function camAct(act){'), html.indexOf('function openScanner(mode){'));
  assert.ok(/const S = window\.LowiSpirit, fn = S && S\[act\]/.test(src));
  assert.ok(/closeScanner\(true\)/.test(src));
  const api = spirit.slice(spirit.indexOf('scannerHost,\n'), spirit.indexOf('captureProduct,'));
  for (const k of ['scan,', 'photo,', 'meal: () => mealForm(),', 'water,']) assert.ok(api.includes(k), 'LowiSpirit must export ' + k);
});

test('the Home orb opens only the herb game: no action menu, no GPT link in the herb world', () => {
  assert.ok(!spirit.includes('<div class="sp-actions">'), 'old orb action menu still rendered');
  const world = spirit.slice(spirit.indexOf("<p class=\"sp-play-hint\">"), spirit.indexOf("<p class=\"sp-play-hint\">") + 200);
  assert.ok(world.length > 50 && !world.includes('sp-gpt') && !world.includes('sp-actions'), 'herb world keeps no capture menu and no GPT link (moved to the scanner)');
  assert.ok(spirit.includes('data-sp="open"') || /bubble[^\n]*'open'/.test(spirit), 'the orb still opens the herb world');
  assert.ok(spirit.includes("button('wardrobe'") || spirit.includes('wardrobe'), 'herb functions stay');
});

test('bottom bar layout: safe on short screens and reduced motion', () => {
  assert.ok(/\.b3-cacts\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/.test(html));
  assert.ok(/@media \(max-height:720px\)\{\.b3-cam \.b3-frame\{top:21%/.test(html));
  assert.ok(/@media \(prefers-reduced-motion:reduce\)\{\.b3-cact:active,\.b3-cback:active,\.b3-deep:active\{transform:none\}\}/.test(html));
});

test('update note for the new Scan bar in de, en and es', () => {
  const v = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
  assert.ok(/^(scan-bar|micro-book|living-cell)-/.test(v.news.id));
  for (const l of ['de', 'en', 'es']) assert.ok(v.news.text[l] && v.news.text[l].includes('Deep analyze'), 'news ' + l);
});
