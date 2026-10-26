// Oct 19, 2026, bug hunt run 16 (BH-014, same class as CS-001 and BH-012: temporary canvas left to GC).
// On iPhone every 2D canvas is a GPU surface that Safari frees only when the garbage collector gets round to it, and Safari caps
// the memory all canvases may hold together, so throwaway canvases pile up until iOS closes the app with no error.
// The camera and photo paths made big throwaway canvases and simply dropped them:
//  - food photo shutter (spirit.js): a 640 px preview plus a 1600 px upload copy (about 7.7 MB) on every snap
//  - barcode scanner (index.html): the ZXing frame canvas (iPhones have no BarcodeDetector) on every scanner session, and up to
//    four canvases of up to 2000 px (about 20 MB) for every photo of a barcode that is decoded
//  - Community photo upload (community-chat.js): a 1600 px copy and a 240 px preview per photo
//  - the other photo resizers (900 px manual product photo, 480 px label photo, 360 px video poster)
// Rule: once the picture has been read out (toDataURL / toBlob) the bitmap is handed back at once (width = height = 0 frees it
// in Safari), and every result (data URL, blob, size) stays the same.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function fnSrc(s, sig) {
  const i = s.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
  let d = 0; const j = s.indexOf('{', i);
  for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } }
  throw new Error('unclosed ' + sig);
}

function canvases() {
  const made = [], later = [];
  const mk = () => {
    const c = { _w: 300, _h: 150,
      get width() { return this._w; }, set width(v) { this._w = Math.round(v); },
      get height() { return this._h; }, set height(v) { this._h = Math.round(v); },
      getContext: () => ({ drawImage() { }, fillRect() { }, translate() { }, rotate() { }, set fillStyle(v) { } }),
      toDataURL() { return 'data:image/jpeg;base64,' + this._w + 'x' + this._h; },
      toBlob(cb) { const blob = { size: this._w * this._h, type: 'image/jpeg' }; later.push(() => cb(blob)); } };
    made.push(c); return c;
  };
  const live = () => made.reduce((s, c) => s + c.width * c.height * 4, 0);
  const flush = () => { while (later.length) later.shift()(); };
  return { made, mk, live, flush };
}
const MB = b => (b / 1048576).toFixed(1) + ' MB';

test('food photo shutter: the preview and the 1600 px upload canvas are both handed back after the snap', () => {
  const src = read('spirit.js'), cv = canvases();
  const video = { videoWidth: 1920, videoHeight: 1440 };
  const ctx = { Math, Date, File: function (parts, name, o) { this.name = name; this.type = o.type; this.size = parts[0].size; },
    D: { createElement: () => cv.mk() }, foodCam: { querySelector: () => video },
    cancelCapture() { }, flight: () => ({ then() { } }), photoSheet() { }, out: {} };
  vm.createContext(ctx);
  /* BH-047: the shutter only snaps from a live stream */
  vm.runInContext('var photoURL = "", photoFile = null, photoStream = { getVideoTracks: () => [{ readyState: "live" }] };\n' + fnSrc(src, 'function shutter()') + '\nout.shutter = shutter; out.get = () => ({ photoURL, photoFile });', ctx);
  for (let i = 0; i < 3; i++) {
    ctx.out.shutter(); cv.flush();
    const st = ctx.out.get();
    assert.strictEqual(st.photoURL, 'data:image/jpeg;base64,640x480', 'the preview is still made, 640 px wide');
    assert.ok(st.photoFile && st.photoFile.size === 1600 * 1200, 'the 1600 px upload file is still made');
    assert.strictEqual(cv.live(), 0, 'snap ' + (i + 1) + ': canvas bitmaps still held: ' + MB(cv.live()));
  }
});

function scannerRig() {
  const src = read('index.html'), cv = canvases();
  const el = { classList: { remove() { }, add() { } }, remove() { } };
  const ctx = { Math, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() { } }, setTimeout: f => f(), cancelAnimationFrame() { }, clearTimeout() { },
    document: { createElement: () => cv.mk(), documentElement: { classList: { remove() { } } } },
    Image: function () { this.naturalWidth = 3024; this.naturalHeight = 4032; this.decode = async () => { }; },
    nativeDetector: async () => null, loadZX: async () => { }, zxReader: () => ({}), zxDecodeCanvas: () => '', validCode: c => c || '',
    msgState() { }, msg() { }, sfx() { }, $: () => null, found() { }, openScanner() { }, out: {} };
  vm.createContext(ctx);
  const freeSig = src.indexOf('function freeCv(cv)') >= 0 ? fnSrc(src, 'function freeCv(cv)') : '';
  vm.runInContext(['var CAM = null;', freeSig, fnSrc(src, 'function stopStream()'), fnSrc(src, 'function closeScanner(now)'), fnSrc(src, 'async function decodeFile(f)'),
    'out.closeScanner = closeScanner; out.decodeFile = decodeFile; out.setCam = c => { CAM = c; };'].join('\n'), ctx);
  return { ctx, cv, el };
}

test('barcode scanner: the ZXing frame canvas is handed back every time the scanner closes', () => {
  const { ctx, cv, el } = scannerRig();
  for (let i = 0; i < 10; i++) {
    const f = cv.mk(); f.width = 900; f.height = 523;
    ctx.out.setCam({ el, cv: f, stream: null, raf: 0, wd: 0 });
    ctx.out.closeScanner(i % 2 === 0);
    assert.strictEqual(cv.live(), 0, 'scanner session ' + (i + 1) + ': frame canvas still holds ' + MB(cv.live()));
  }
});

test('photo of a barcode: every decode canvas (up to 2000 px, turned and not) is handed back, found or not', async () => {
  const { ctx, cv } = scannerRig();
  await ctx.out.decodeFile({});
  assert.ok(cv.made.length >= 4, 'it still tries several sizes and the turned copy (' + cv.made.length + ' canvases)');
  assert.strictEqual(cv.live(), 0, 'a failed barcode photo leaves ' + MB(cv.live()) + ' of canvases behind');
  let n = 0; ctx.zxDecodeCanvas = () => (++n === 3 ? '4006381333931' : '');
  const before = cv.made.length; await ctx.out.decodeFile({});
  assert.ok(cv.made.length > before, 'decoded again');
  assert.strictEqual(cv.live(), 0, 'a barcode found on a later try leaves ' + MB(cv.live()) + ' behind');
});

test('Community photo upload: the 1600 px copy and the preview are handed back; blob, preview and size stay the same', async () => {
  const src = read('community-chat.js'), cv = canvases();
  const ctx = { Math, Error, Promise, D: { createElement: () => cv.mk() }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() { } },
    Image: function () { const me = this; this.naturalWidth = 4032; this.naturalHeight = 3024; Object.defineProperty(this, 'src', { set() { Promise.resolve().then(() => me.onload()); } }); }, out: {} };
  vm.createContext(ctx);
  vm.runInContext(fnSrc(src, 'function shrinkPhoto(file)') + '\nout.shrink = shrinkPhoto;', ctx);
  const p = ctx.out.shrink({ type: 'image/jpeg', size: 3e6 });
  await Promise.resolve(); await Promise.resolve(); cv.flush();
  const r = await p;
  assert.strictEqual(r.w, 1600); assert.strictEqual(r.h, 1200);
  assert.strictEqual(r.blob.size, 1600 * 1200, 'the upload blob is still the 1600 px copy');
  assert.strictEqual(r.preview, 'data:image/jpeg;base64,240x180', 'the preview is still 240 px');
  assert.strictEqual(cv.live(), 0, 'one Community photo leaves ' + MB(cv.live()) + ' of canvases behind');
});

test('the other photo resizers (manual product photo, label photo, video poster) hand their canvas back too', () => {
  const src = read('index.html');
  const resize = fnSrc(src, 'function resizeImage(file, max)');
  assert.ok(/toDataURL\([^)]*\); c\.width = 0; c\.height = 0;/.test(resize), 'resizeImage zeroes its canvas after toDataURL');
  const j = src.indexOf('readForm(); D.photo = cv.toDataURL');
  assert.ok(j > 0 && /cv\.width = 0; cv\.height = 0;/.test(src.slice(j, j + 120)), 'the label photo canvas is zeroed');
  const i = src.indexOf('const sc = Math.min(1, 360 / Math.max(w, hh))');
  assert.ok(i > 0 && /c\.width = 0; c\.height = 0;/.test(src.slice(i, i + 400)), 'the video poster canvas is zeroed');
});
