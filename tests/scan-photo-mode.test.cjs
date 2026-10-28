'use strict';
/* Oct 28, 2026 (E-man, call): the Scan bubble opens the camera straight away, like before. In it a switch Barcode | Essen-Foto runs on
   the SAME live camera stream (no reload, no second camera request). Essen-Foto has a shutter; the frame goes to the existing photo
   result sheet. A scan or a photo alone logs nothing; only "Als gegessen eintragen" logs. The shopping camera stays barcode only.
   The fasting timer is not touched by any of this. Source-level checks plus a VM run of the mode switch with a stub camera. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const spirit = fs.readFileSync(path.join(root, 'spirit.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'scan-glass.css'), 'utf8');
const core = require('../shop-scan-core.js');

const fnSrc = name => { const i = html.indexOf('function ' + name + '('); assert.ok(i > 0, name); const j = html.indexOf('\nfunction ', i + 10); const k = html.indexOf('\n/*', i + 10); return html.slice(i, Math.min(j > 0 ? j : 1e9, k > 0 ? k : 1e9)); };

test('one camera, two modes: Barcode and Essen-Foto side by side, Barcode pressed when it opens', () => {
    assert.match(html, /<div class="b3-cacts b3-two" role="group"[^\n]*act\("scan", IC\.bc, true\) \+ act\("photo", IC\.cam, false\)/);
    assert.match(html, /actPhoto: \["Food photo", "Essen-Foto", "Foto comida"\]/);
    assert.match(html, /shoot: \["Take photo", "Foto aufnehmen", "Hacer foto"\]/);
    assert.match(html, /class="b3-shut" data-b3="camshot"/);
    assert.match(html, /case "camshot": camShot\(\); break;/);
    assert.match(css, /\.b3-cam \.b3-shut \{ display: none; \}/);
    assert.match(css, /\.b3-cam\.b3-photo \.b3-shut \{/);
    assert.match(css, /#spWorld \.b3-cam\.b3-photo \.b3-ctype/, 'the typing fields hide inside Misty\'s world too');
    assert.match(css, /\.b3-cam\.b3-shop \.b3-shut \{ display: none !important; \}/);
});

test('switching modes keeps the stream: camAct only toggles the mode, no closeScanner, no new getUserMedia while a stream runs', () => {
    const src = fnSrc('camAct');
    const first = src.slice(0, src.indexOf('const S = window.LowiSpirit'));
    assert.match(first, /act === "scan" \|\| act === "photo"/);
    assert.match(first, /camMode\(act === "photo"\)/);
    assert.match(first, /if \(!el\.classList\.contains\("typing"\) && CAM\.stream\) \{ playVid\(\$\("#b3Vid", el\)\); return; \}/);
    assert.match(first, /if \(CAM\.stream\) return;/);
    assert.doesNotMatch(first, /closeScanner|getUserMedia\(/);
    assert.match(html, /if \(CAM\.busy \|\| CAM\.hold \|\| CAM\.photo \|\| now - CAM\.last < 160\) return;/, 'the barcode reader pauses in Essen-Foto');
    assert.match(fnSrc('shopMode'), /if \(CAM\.shop && CAM\.photo\) camMode\(false\);/, 'shopping is barcode only');
});

function modeVM() {
    const classes = new Set(['b3-cam']), btns = [{ dataset: { act: 'scan' }, a: {}, setAttribute(k, v) { this.a[k] = v; } }, { dataset: { act: 'photo' }, a: {}, setAttribute(k, v) { this.a[k] = v; } }];
    const el = { dataset: { st: 'live' }, classList: { toggle: (c, on) => on ? classes.add(c) : classes.delete(c), contains: c => classes.has(c), add: c => classes.add(c), remove: c => classes.delete(c) }, contains: () => false };
    const msgs = [];
    const ctx = { CAM: { el, shop: false, stream: {} }, document: { activeElement: null }, msgs, classes, btns };
    vm.createContext(ctx);
    vm.runInContext('const STR = ' + JSON.stringify({ aim: 'Hold the barcode inside the frame', aimPhoto: 'Hold your food in view and tap the shutter' }) + ';\nfunction t(k){ return STR[k]; }\nfunction $$(){ return btns; }\nfunction msg(x){ msgs.push(x); }\n' + fnSrc('aimTxt') + '\n' + fnSrc('camMode'), ctx);
    return ctx;
}

test('camMode: Essen-Foto presses the photo button, shows the photo hint, keeps the same stream object; shopping refuses it', () => {
    const c = modeVM(), stream = c.CAM.stream;
    vm.runInContext('camMode(true)', c);
    assert.equal(c.CAM.photo, true); assert.ok(c.classes.has('b3-photo'));
    assert.equal(c.btns[1].a['aria-pressed'], 'true'); assert.equal(c.btns[0].a['aria-pressed'], 'false');
    assert.equal(c.msgs.at(-1), 'Hold your food in view and tap the shutter');
    assert.strictEqual(c.CAM.stream, stream, 'same stream');
    vm.runInContext('camMode(false)', c);
    assert.equal(c.CAM.photo, false); assert.ok(!c.classes.has('b3-photo'));
    assert.equal(c.btns[0].a['aria-pressed'], 'true'); assert.equal(c.msgs.at(-1), 'Hold the barcode inside the frame');
    c.CAM.shop = true; vm.runInContext('camMode(true)', c);
    assert.equal(c.CAM.photo, false, 'the shopping camera stays barcode only');
});

test('the shutter takes one frame, turns the camera off and hands the photo to the photo sheet; it logs nothing', () => {
    const src = fnSrc('camShot');
    assert.match(src, /if \(!c \|\| !c\.photo \|\| c\.shooting\) return;/, 'one shot at a time, only in Essen-Foto');
    assert.match(src, /drawImage\(v, 0, 0, cv\.width, cv\.height\)/);
    assert.ok(src.indexOf('closeScanner(true)') < src.indexOf('S.photoFile(f)'), 'camera off before the sheet');
    assert.doesNotMatch(src + fnSrc('camMode'), /logMeal|meal-logged|LowiFastStop|eatCur|lowi_fast/, 'no meal, no fasting timer');
    assert.match(spirit, /photoFile: scanPhotoFile,/);
});

test('photo sheet: "Als gegessen eintragen" is the only log; one tap logs once; Retake goes back to the Scan camera in Essen-Foto', () => {
    assert.match(spirit, /photoLog: \['Log as eaten', 'Als gegessen eintragen', 'Registrar como comido'\]/);
    assert.match(spirit, /if \(e\.target\.__saving\) return;\n\s*e\.target\.__saving = true;\n\s*Promise\.resolve\(finishMeal\(e\.target\)\)\.finally/);
    const os = spirit.slice(spirit.indexOf('async function onPhotoFile(file)'), spirit.indexOf('async function scanPhotoFile(file)'));
    assert.ok(os.length > 50);
    assert.doesNotMatch(os, /finishMeal|logMeal|meal-logged/, 'opening the sheet logs nothing');
    const sp = spirit.slice(spirit.indexOf('async function scanPhotoFile(file)'), spirit.indexOf("D.addEventListener('change'"));
    assert.match(sp, /await onPhotoFile\(file\);/);
    assert.match(sp, /closest\('\[data-sp="photo"\]'\)/); assert.match(sp, /e\.stopPropagation\(\);/); assert.match(sp, /window\.LowiDex\.scan\('photo'\);/);
    assert.match(sp, /\}, true\);/, 'capture phase: runs before the old Retake (a second camera)');
    assert.doesNotMatch(sp, /finishMeal|logMeal|meal-logged/);
    assert.match(html, /if \(mode === "photo"\) camMode\(true\);/, 'the scanner can open straight in Essen-Foto');
    assert.equal(core.tx('ate', 1), 'Als gegessen eintragen');
});
