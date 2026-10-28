// Oct 28 2026, late call (E-man, three screenshots): on the photo Scan screen "Barcode live scannen" led into the old scanner
// inside Misty's world (the site's camera prompt, "Kamera startet...", the blue frame, the Barcode / Essen-Foto switch, Deep
// analyze, both type fields): "kompletter Blödsinn". He keeps the button. And X after "Neues Foto" (cancelling that camera)
// went back to the Scan start screen instead of leaving Scan.
// Browser walk-through: tools/check-scan-exit.cjs.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');
const css = read('scan-glass.css');
function fnSrc(s, sig) {
  const i = s.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
  let d = 0; const j = s.indexOf('{', i);
  for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } }
  throw new Error('unclosed ' + sig);
}

test('the live button stays on the photo screen and opens the live layer', () => {
  assert.match(html, /data-b3="picklive"/);
  assert.match(html, /case "picklive": sfx\("tap"\); openScanner\("live"\)/);
});

test('live is its own full-screen layer on the page, never inside Misty\'s world', () => {
  const f = fnSrc(html, 'function openScanner(mode)');
  assert.match(f, /const live = mode === "live"; if \(live\) scanWorldOff\(\);/);
  assert.match(f, /mode !== "shop" && !live\)\{LowiSpirit\.scannerHost\(\)/);
  assert.match(f, /if \(live\) el\.classList\.add\("b3-livebc"\)/);
});

test('the live layer hides the old clutter: switch, Deep analyze, shutter, type fields', () => {
  for (const sel of ['.b3-cacts', '.b3-deep', '.b3-shut', '.b3-ctype', '.b3-nmlive']) assert.ok(css.includes('.b3-cam.b3-livebc ' + sel), sel);
  assert.match(css, /\.b3-cam\.b3-livebc[^{]*\{ display: none !important; \}/);
});

test('the live layer never asks for the camera again on its own', () => {
  const r = fnSrc(html, 'function camResume()');
  assert.match(r, /b3-livebc"\) && \(st === "livepause" \|\| st === "camerr" \|\| CAM\.starting\)\) return;/);
  assert.match(html, /msgState\(CAM\.el\.classList\.contains\("b3-livebc"\) \? "livepause" : "starting"\)/);
  const m = fnSrc(html, 'function liveCard(s, m)');
  assert.match(m, /data-b3="livephoto"/);
  assert.match(fnSrc(html, 'function msgState(s)'), /if \(liveCard\(s, m\)\) return;/);
  assert.match(html, /case "livephoto": sfx\("tap"\); pickOpen\(false\);/);
});

test('cancelling the camera from "Neues Foto" leaves Scan; the first Scan camera still lands on the photo screen', () => {
  assert.match(html, /case "pickretake": pickReset\(\); pickOpen\(false\); if \(CAM\) CAM\.pickAgain = Date\.now\(\);/);
  assert.match(fnSrc(html, 'function pickInput(lib)'), /addEventListener\("cancel", \(\) => pickCancelled\(\)\)/);
  const c = fnSrc(html, 'function pickCancelled()');
  assert.match(c, /!c\.pickAgain/);
  assert.match(c, /scanExit\(\)/);
  assert.match(fnSrc(html, 'function scanExit()'), /closeScanner\(\)/);
  // a photo that arrives clears the flag, so a chosen photo never closes Scan
  assert.match(fnSrc(html, 'function pickInput(lib)'), /if \(CAM\) CAM\.pickAgain = 0; if \(f\) pickGot\(f\)/);
});

test('German words for the live cards', () => {
  for (const w of ['Die Kamera ist aus', 'Live-Scan pausiert', 'Weiter scannen']) assert.ok(html.includes(w), w);
});
