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

test('no white Back bar: Deep analyze follows the actions (Barcode, Log meal), closing is the round X only', () => {
  const iActs = camBarSrc.indexOf('b3-cacts'), iDeep = camBarSrc.indexOf('id="b3Deep"');
  assert.ok(iActs > 0 && iDeep > iActs, 'order must be actions, then Deep analyze');
  assert.ok(!/b3Back|b3-cback/.test(camBarSrc), 'the white Back bar is gone');
  assert.ok(!/\.b3-cback/.test(html), 'no Back bar styles left');
  assert.ok(/<button class="b3-cx" data-b3="camclose"/.test(openScanner), 'the round X closes the scanner');
  for (const k of ['scan', 'meal']) assert.ok(camBarSrc.includes('act("' + k + '"'), 'missing action ' + k);
  assert.ok(!camBarSrc.includes('act("photo"'), 'one meal path (Oct 21): Snap food lives inside Log meal, not beside it');
  assert.ok(!camBarSrc.includes('act("water"'), 'water does not belong in the scanner');
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
  for (const k of ['deep', 'deepS', 'actsL', 'actScan', 'actScanL', 'actPhoto', 'actPhotoL', 'actMeal', 'actMealL', 'actWater', 'actWaterL']) {
    const m = html.match(new RegExp('\\n  ' + k + ': \\[("[^"]+"), ("[^"]+"), ("[^"]+")\\]'));
    assert.ok(m, 'text ' + k + ' needs en, de, es');
  }
  assert.ok(/\n  deep: \["Deep analyze", "Deep analyze", "Deep analyze"\]/.test(html), 'keep the name Deep analyze');
  assert.ok(!/\n  camBack: /.test(html), 'Back text removed with the bar');
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
  assert.ok(/\.b3-cacts\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(html));
  assert.ok(/@media \(max-height:720px\)\{\.b3-cam \.b3-frame\{top:21%/.test(html));
  assert.ok(/@media \(prefers-reduced-motion:reduce\)\{\.b3-cact:active,\.b3-deep:active\{transform:none\}\}/.test(html));
});

test('update note for the new Scan bar in de, en and es', () => {
  const v = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
  assert.ok(/^[a-z][a-z-]*-\d{8}-\d{6}$/.test(v.news.id)); /* later builds combine their note with this one */
  for (const l of ['de', 'en', 'es']) assert.ok(v.news.text[l] && v.news.text[l].includes('Deep analyze'), 'news ' + l);
});

test('home-screen app band: the full-screen scanner ends where the page ends, so Deep analyze is never cut off', () => {
  assert.ok(html.includes('html.g2f-gap body>.b3-cam{bottom:0}'));
  assert.ok(html.includes('html.g2f-gap body>.b3-cam .b3-cbot{bottom:0;padding-bottom:calc(max(0px, env(safe-area-inset-bottom,0px) - var(--g2fGap,0px)) + 14px)}'));
});

test('camera opens reliably: inline video, fallback constraints, single start, restart after background, watchdog', () => {
  assert.ok(/<video id="b3Vid" playsinline webkit-playsinline muted autoplay/.test(html));
  const src = html.slice(html.indexOf('async function getCam(){'), html.indexOf('function loop(){'));
  assert.ok(/video:\{facingMode:"environment"\}/.test(src) && /video:true/.test(src), 'plain-constraint retries');
  assert.ok(/if \(CAM\.starting\) return;/.test(src), 'one start at a time');
  assert.ok(/addEventListener\("ended"/.test(src), 'a dead track restarts');
  assert.ok(/mine\.wd = setTimeout/.test(src) && /mine\.retried = true; startCam\(\)/.test(src), 'no picture -> one retry');
  assert.ok(/v\.muted = true/.test(src) && /setAttribute\("playsinline", ""\)/.test(src));
  assert.ok(/function camResume\(\)/.test(html) && /else setTimeout\(camResume, 250\)/.test(html), 'back from background restarts the camera on its own');
  assert.ok(!/msgState\("ask"\); \} \}\);/.test(html), 'no second Allow-camera tap after returning');
});
