// Oct 28 2026, photo-first Scan (Eman on a call, with screenshots: the live scanner overlay felt cluttered, Barcode/Essen-Foto
// seemed to do nothing, and the site's own camera prompt ("therealetm.github.io would like to access the camera") kept
// coming up, a beta tester found it annoying too).
// Decisions, in his words on the call:
//  - Scan opens the phone's own camera (a file input, the way Community's photo button works), not the in-browser live feed.
//  - one photo does both: the barcode is read from the still on the phone, free; a product found that way is rated from its
//    data, no AI.
//  - no readable code never spends AI on its own: "Retake photo" or "Analyse with AI"; only that tap sends the photo.
//  - the live barcode camera stays reachable as its own button.
// The browser walk-through (picker opens from the Home Scan tap, zero AI calls on fail/cancel/retake/barcode, one after the
// AI tap) is tools/check-scan-pick.cjs.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');
const css = read('scan-glass.css');
function fnSrc(s, sig) {
  const i = s.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
  let d = 0; const j = s.indexOf('{', i);
  for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } }
  throw new Error('unclosed ' + sig);
}

test('Scan opens the native picker first, inside the tap, before anything else in openScanner', () => {
  const f = fnSrc(html, 'function openScanner(mode)');
  const body = f.slice(f.indexOf('{') + 1).trim();
  assert.match(body.split('\n')[0] + body.split('\n')[1], /pickMode\(mode\)[\s\S]*pickOpen\(/);
  assert.match(f, /if \(pick\) \{ el\.classList\.add\("b3-pick"\); msgState\("pick"\);.*return; \}/);
  const pm = fnSrc(html, 'function pickMode(mode)');
  for (const m of ['"cam"', '"photo"']) assert.ok(pm.includes(m), 'default Scan modes go photo-first: ' + m);
  assert.ok(!pm.includes('"shop"'), 'the shopping camera keeps its live scanner');
});

test('the picker is a plain image file input like Community: the phone camera, no getUserMedia', () => {
  const f = fnSrc(html, 'function pickInput(lib)');
  assert.match(f, /i\.type = "file"/);
  assert.match(f, /i\.accept = "image\/\*"/);
  assert.match(f, /setAttribute\("capture", "environment"\)/);
  assert.ok(!/getUserMedia|startCam/.test(f));
  for (const sig of ['async function pickGot(f)', 'function pickReset()', 'async function stillCode(f)', 'function pickHTML(s)'])
    assert.ok(!/getUserMedia|startCam\(/.test(fnSrc(html, sig)), sig + ' never starts the live camera');
  assert.match(fnSrc(html, 'function camResume()'), /b3-pick/, 'coming back from the picker does not start the live camera');
  assert.match(fnSrc(html, 'function shopResume()'), /b3-pick[\s\S]*pickReset\(\); return;/, 'closing a product card goes back to Take photo');
});

test('photo: barcode quietly first, else the AI photo check starts by itself (Emmanuel 29 Oct 2026)', () => {
  const ai = /photoFile|LowiFoodAI|food-photo/;
  for (const sig of ['async function stillCode(f)', 'function pickReset()', 'function pickOpen(lib)', 'function pickInput(lib)', 'function shopResume()', 'function camResume()'])
    assert.ok(!ai.test(fnSrc(html, sig)), sig + ' must not reach the AI');
  assert.match(fnSrc(html, 'function pickAI(auto)'), /S\.photoFile\(f\)/);
  /* Oct 28 2026 late: Neues Foto also marks the picker so cancelling it leaves Scan (tests/scan-live-exit.test.cjs) */
  assert.match(html, /case "pickretake": pickReset\(\); pickOpen\(false\); if \(CAM\) CAM\.pickAgain = Date\.now\(\); break;/);
  const g = fnSrc(html, 'async function pickGot(f)');
  assert.match(g, /Promise\.race\(\[stillCode\(f\), new Promise\([^)]*setTimeout\([^;]*PICK_WAIT_MS\)/, 'the quiet read is capped at a few seconds');
  assert.match(g, /if \(CAM !== c \|\| c\.pickTok !== tok\) return;/, 'a closed scanner or a newer photo never spends a photo check');
  assert.match(g, /if \(r\.code\) \{[^}]*found\(r\.code\); return; \}\s*pickAI\(true\);/, 'a barcode goes to the product card, otherwise straight to the AI');
  assert.ok(!/picknone|pickqr|sfx\("error"\)/.test(g), 'no "Kein Barcode erkannt" card and no error sound');
  const w = Number((html.match(/const PICK_WAIT_MS = (\d+);/) || [])[1]); assert.ok(w >= 2000 && w <= 6000, 'a few seconds: ' + w);
  const ph = fnSrc(html, 'function pickHTML(s)');
  assert.ok(!/pickai|pickretake|pickNone|pickAI/.test(ph), 'no Analyse with AI / Neues Foto card');
  assert.match(ph, /data-b3="picklive"/);
  assert.ok(!/"Kein Barcode erkannt",|"Mit KI analysieren",/.test(html), 'the old popup strings are gone');
  assert.match(fnSrc(html, 'async function stillCode(f)'), /gone\(\)\) break;/, 'the read stops once the AI took over');
});

test('QR codes count only with a product number (GS1 Digital Link or bare GTIN)', () => {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(fnSrc(html, 'function validCode(c)') + '\n' + fnSrc(html, 'function qrGtin(raw)'), ctx);
  const q = s => ctx.qrGtin(s);
  assert.strictEqual(q('https://id.gs1.org/01/04006040001232'), '4006040001232');
  assert.strictEqual(q('https://brand.example/01/04006040001232/10/ABC?x=1'), '4006040001232');
  assert.strictEqual(q('4006040001232'), '4006040001232');
  assert.strictEqual(q('https://instagram.com/somebrand'), '');
  assert.strictEqual(q('https://id.gs1.org/01/04006040001239'), '', 'bad check digit');
  assert.strictEqual(q('WIFI:S:shop;T:WPA;P:secret;;'), '');
  assert.strictEqual(q('https://news.example/2024/01/12345678'), '');
});

test('the still-photo reader gives the screen a turn between passes and hands its canvases back', () => {
  const f = fnSrc(html, 'async function stillCode(f)');
  assert.match(f, /await idle\(\)/);
  assert.match(f, /freeCv\(cv\)/); assert.match(f, /freeCv\(rc\)/);
  assert.match(f, /revokeObjectURL/);
});

test('pick panel styling: no live-camera chrome, Home navy, a scanning sweep that respects reduced motion', () => {
  assert.match(css, /\.b3-cam\.b3-pick video[^{]*\.b3-cam\.b3-pick \.b3-frame[^{]*\.b3-cam\.b3-pick \.b3-cacts[^{]*\{ display: none !important; \}/);
  assert.match(css, /\.b3-cam\.b3-pick \{ background: radial-gradient\([^)]*#0d1d42/);
  assert.match(css, /@keyframes b3psweep/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.b3-psweep \{ animation: none/);
});

test('every new scanner string exists in English, German and Spanish', () => {
  for (const k of ['pickShoot', 'pickT', 'pickS', 'pickLib', 'pickLive', 'pickRead']) {
    const m = html.match(new RegExp('\\n  ' + k + ': \\[("[^"]+", ){2}"[^"]+"\\],'));
    assert.ok(m, k);
  }
});
