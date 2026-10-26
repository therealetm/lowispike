// Scan's meal, photo and barcode screens in the app's own look (Oct 16, E-man): black space + iOS blue glass, no herb-world card,
// no gold/beige/herb green, a clear flow and camera permission handling that tells you what to do.
const test = require('node:test');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const spirit = read('spirit.js');
const css = read('scan-screens.css');
const sw = read('sw.js');

function fnBody(src, sig) {
  const i = src.indexOf(sig);
  assert.ok(i >= 0, 'missing ' + sig);
  let depth = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}' && --depth === 0) return src.slice(j, k + 1);
  }
  throw new Error('unclosed ' + sig);
}

test('food camera is its own full-screen layer, never the herb-world card', () => {
  const photo = fnBody(spirit, 'async function photo()');
  assert.doesNotMatch(photo, /open\(\{/, 'photo() must not open the herb world');
  assert.doesNotMatch(photo, /scannerHost\(\)/, 'photo() must not render inside the herb world');
  assert.match(photo, /D\.body\.append\(h\)/);
  assert.match(photo, /h\.id = 'ssFood'/);
  assert.match(photo, /aria-modal/);
  // X closes, one shutter, Photos, Type it, Barcode switch
  for (const sp of ['cancelCapture', 'shutter', 'meal', 'toBarcode']) assert.match(photo, new RegExp('data-sp="' + sp + '"'), sp);
  assert.match(photo, /class="sp-file-in"/);
  // shutter reads the new layer's video, not the world's
  assert.match(fnBody(spirit, 'function shutter()'), /foodCam && foodCam\.querySelector\('video'\)/);
});

test('camera permission: starting, blocked and missing camera each get a clear glass card with a way round', () => {
  const st = fnBody(spirit, 'function foodState(h, s)');
  assert.match(st, /const pick = [^;]*class="sp-file-in"/);
  assert.match(st, /'starting'/);
  assert.match(st, /'denied'[\s\S]*camOff[\s\S]*camOffS[\s\S]*data-sp="photo"[\s\S]*\+ pick \+/, 'denied: explain, Try again, choose a photo');
  assert.match(st, /'nocam'[\s\S]*camNone[\s\S]*pick\.replace[\s\S]*data-sp="meal"/, 'no camera: photo library or type it');
  // BH-047: the stream start moved out of photo() into startFood(h), shared with the return from the background
  assert.match(fnBody(spirit, 'async function photo()'), /return startFood\(h\)/);
  const start = fnBody(spirit, 'async function startFood(h)');
  assert.match(start, /NotAllowedError'[\s\S]*'denied' : 'nocam'/);
  assert.match(start, /foodState\(h, 'live'\)/);
  assert.match(spirit, /camOffS: \['Allow it in Settings › Safari › Camera/);
  // closing tidies the layer and the class, and stops the stream
  const cancel = fnBody(spirit, 'function cancelCapture()');
  assert.match(cancel, /stopPhoto\(\)/);
  assert.match(cancel, /foodCam\.remove\(\)/);
  assert.match(cancel, /classList\.remove\('ss-foodon'\)/);
  assert.match(spirit, /else if \(a === 'toBarcode'\) scan\(\);/);
  assert.match(spirit, /if \(a === 'meal' && foodCam && foodCam\.contains\(b\)\) cancelCapture\(\);/);
});

test('barcode result and the Scan a product button stay out of the herb world', () => {
  const cap = fnBody(spirit, 'async function captureProduct(p)');
  assert.doesNotMatch(cap, /open\(\{/);
  assert.doesNotMatch(cap, /world\.append\(ov\)/);
  assert.match(cap, /classList\.add\('sp-sheet', 'ss-sheet'\)/);
  // Oct 16 simple spike card (owner: "very overwhelming"): no deeper-analysis link stacked on the result at all
  assert.doesNotMatch(cap, /gptHTML\(\)/);
  const scan = fnBody(spirit, 'function scan()');
  assert.doesNotMatch(scan, /open\(\{/);
  assert.match(scan, /LowiLiving\.scan\('cam'\)/);
  // nothing to fly into once the world stays closed
  assert.match(fnBody(spirit, 'function flight(image)'), /if \(!opened\) return Promise\.resolve\(\);/);
  // every sheet of these flows carries the glass class
  assert.match(fnBody(spirit, 'function showSheet('), /ownedSheet\.classList\.add\('ss-sheet'\)/);
});

test('Your photo: one clear flow, name then Log as meal, Retake and Save below', () => {
  const ps = fnBody(spirit, 'function photoSheet()');
  const iForm = ps.indexOf('sp-photo-form'), iActs = ps.indexOf('sp-photo-acts'), iGpt = ps.indexOf('gptHTML()');
  assert.ok(iForm > 0 && iActs > iForm && iGpt > iActs, 'photo, form, then Retake/Save, then the GPT link');
  assert.match(ps, /button\('retake', 'camera', 'photo'\)/);
  assert.match(ps, /placeholder="' \+ esc\(tr\('photoPh'\)\)/);
});

test('no herb wording left on these screens', () => {
  for (const k of ['save', 'herbTip', 'cancel', 'captured', 'scanSpike']) {
    const m = spirit.match(new RegExp('\\n\\s+' + k + ": \\[([^\\]]+)\\]"));
    assert.ok(m, k);
    assert.doesNotMatch(m[1], /herb|Kraut|hierba|leaves|Blätter|hojas/i, k + ': ' + m[1]);
  }
  assert.doesNotMatch(html, /Oof, my leaves droop/);
});

test('scan-screens.css: loaded last, cached offline, blue glass tokens, no gold/beige', () => {
  assert.match(html, /<link rel="stylesheet" id="scrCss" href="scan-screens\.css\?v=[0-9-]+">/);
  const links = [...html.matchAll(/<link rel="stylesheet"[^>]*href="([^"?]+)/g)].map(m => m[1]);
  assert.ok(links.indexOf('scan-screens.css') > links.indexOf('style-sweep.css'), 'after style-sweep.css');
  assert.ok(links.indexOf('scan-screens.css') > links.indexOf('spirit.css'), 'after spirit.css');
  assert.match(sw, /"scan-screens\.css"/);
  assert.match(css, /var\(--ms-glass-solid/);
  assert.match(css, /#0a84ff/);
  // beats world-home's sheet colour (html.wh-on .r2-ov:not(.full) .r2-sh)
  assert.match(css, /html:root body \.r2-ov\.ss-sheet:not\(\.full\) \.r2-sh \{/);
  // no gold, beige, brown or herb green anywhere in the new sheet
  const bad = /#(?:c9a|d4af|e8c|f5e6|f0e|caa|b8860b|daa520|ffd700|8fd3a|9de6b8)|rgba?\(\s*(?:2[0-5]\d|1[89]\d)\s*,\s*(?:1[4-9]\d|2[0-2]\d)\s*,\s*(?:[0-9]{1,2}|1[0-3]\d)\s*[,)]/i;
  const lines = css.split('\n').filter(l => bad.test(l) && !/v-better|v-ok|v-spike|#5fc27e/.test(l));
  assert.deepStrictEqual(lines, []);
  // tap targets
  assert.match(css, /\.ss-x \{ width: 44px; height: 44px;/);
  assert.match(css, /\.ss-shutter \{ width: 78px; height: 78px;/);
  // reduced motion honoured
  assert.match(css, /prefers-reduced-motion: reduce/);
});
