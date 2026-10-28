'use strict';
/* Oct 28, 2026 (Emmanuel, call: "Sometimes it takes too long to scan ... a snap click, so it snaps the photo. So the scanner now has
   the photo, so I can walk away without having to stand there like an idiot as it's scanning", and an autofocus click; then, with a
   screenshot of the Scan camera: "have that next to the back button, left and right"): Snap left of the X, Focus right of it.
   scan-snap-core.js holds the rules; index.html's b3 scanner runs the camera. The second half of this file runs the real Snap code
   from index.html against a fake camera (no browser), so the kept frames, the read, retry, close and the one-result rule are
   checked as code, not only as text. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const S = require('../scan-snap-core.js');
const html = read('index.html');

test('focusPlan: Focus only when the browser reports focusMode, else Zoom 2x when it reports zoom, else nothing', () => {
    assert.deepEqual(S.focusPlan({}), { kind: '' }, 'iPhone Safari today: no focusMode, no zoom reported -> no button');
    assert.deepEqual(S.focusPlan(), { kind: '' });
    assert.deepEqual(S.focusPlan({ focusMode: ['manual'] }), { kind: '' }, 'manual only: we would have to set a distance, not offered');
    const f = S.focusPlan({ focusMode: ['continuous', 'single-shot'], pointsOfInterest: true });
    assert.equal(f.kind, 'focus'); assert.equal(f.once, true); assert.equal(f.cont, true); assert.equal(f.poi, true);
    assert.equal(S.focusPlan({ focusMode: ['continuous'], zoom: { min: 1, max: 8 } }).kind, 'focus', 'focus beats zoom');
    assert.deepEqual(S.focusPlan({ zoom: { min: 1, max: 5 } }), { kind: 'zoom', min: 1, to: 2 });
    assert.deepEqual(S.focusPlan({ zoom: { min: 1, max: 1.7 } }), { kind: 'zoom', min: 1, to: 1.7 });
    assert.deepEqual(S.focusPlan({ zoom: { min: 1, max: 1.2 } }), { kind: '' }, 'a zoom too small to help is not offered');
    assert.deepEqual(S.focusPlan({ zoom: { min: 1, max: Infinity } }), { kind: '' });
});

test('focusConstraints: one refocus on the middle; zoom toggles between its minimum and 2x', () => {
    assert.deepEqual(S.focusConstraints({ kind: 'focus', once: true, cont: true, poi: true }, true), { advanced: [{ focusMode: 'single-shot', pointsOfInterest: [{ x: 0.5, y: 0.42 }] }] });
    assert.deepEqual(S.focusConstraints({ kind: 'focus', once: false, cont: true, poi: false }, true), { advanced: [{ focusMode: 'continuous' }] });
    assert.deepEqual(S.focusConstraints({ kind: 'zoom', min: 1, to: 2 }, true), { advanced: [{ zoom: 2 }] });
    assert.deepEqual(S.focusConstraints({ kind: 'zoom', min: 1, to: 2 }, false), { advanced: [{ zoom: 1 }] });
    assert.equal(S.focusConstraints({ kind: '' }, true), null);
});

test('readPlan: the live band first, then the whole picture, an upright band and a sharper band, all inside the frame', () => {
    for (const [W, H] of [[720, 1280], [1280, 720], [1920, 1080], [480, 640]]) {
        const p = S.readPlan(W, H);
        assert.deepEqual(p.map(r => r.id), ['band', 'all', 'upright', 'band-hi']);
        for (const r of p) {
            assert.ok(r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0, r.id);
            assert.ok(r.x + r.w <= W && r.y + r.h <= H, r.id + ' inside ' + W + 'x' + H);
        }
        assert.equal(p.find(r => r.id === 'upright').rot, 90);
    }
    assert.deepEqual(S.fit(1280, 720, 900), { w: 900, h: 506 });
    assert.deepEqual(S.fit(300, 200, 900), { w: 300, h: 200 }, 'never scaled up');
});

test('sharpness / order: the sharpest kept frame is read first', () => {
    const w = 40, h = 20, flat = new Uint8Array(w * h).fill(128), edges = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) edges[y * w + x] = (x >> 1) % 2 ? 255 : 0;
    assert.equal(S.sharpness(flat, w, h), 0);
    assert.ok(S.sharpness(edges, w, h) > 1000);
    assert.equal(S.sharpness(null, 0, 0), 0);
    assert.deepEqual(S.order([1, 50, 50, 3]), [1, 2, 3, 0], 'ties keep their order');
    const rgba = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    assert.deepEqual([...S.grey(rgba, 2, 1)], [255, 0]);
});

test('state rules: Snap only on a live, free camera; resume restarts after a Snap; no camera swapped in behind a kept photo', () => {
    const live = { stream: true, live: true, hold: false, snap: false, typing: false };
    assert.equal(S.canSnap(live), true);
    for (const k of ['stream', 'live']) assert.equal(S.canSnap(Object.assign({}, live, { [k]: false })), false, k);
    for (const k of ['hold', 'snap', 'typing']) assert.equal(S.canSnap(Object.assign({}, live, { [k]: true })), false, k);
    assert.equal(S.resumeAction({ stream: true }), 'loop');
    assert.equal(S.resumeAction({ stream: false, snap: true }), 'restart');
    assert.equal(S.resumeAction({ stream: false }), 'none');
    assert.equal(S.mayAutoRestart({ st: 'starting' }), true);
    for (const st of ['denied', 'nocam', 'lookup', 'snapread', 'snapnone']) assert.equal(S.mayAutoRestart({ st }), false, st);
    assert.equal(S.mayAutoRestart({ st: 'live', snap: {} }), false, 'a kept photo blocks the auto restart');
    const cam = { snap: null, hold: false }, snap = { over: false }; cam.snap = snap;
    assert.equal(S.stillMine(cam, cam, snap), true);
    assert.equal(S.stillMine(null, cam, snap), false, 'scanner closed');
    assert.equal(S.stillMine({}, cam, snap), false, 'another scanner opened');
    assert.equal(S.stillMine(cam, cam, { over: false }), false, 'a newer Snap');
    cam.hold = true; assert.equal(S.stillMine(cam, cam, snap), false, 'a result is already showing'); cam.hold = false;
    snap.over = true; assert.equal(S.stillMine(cam, cam, snap), false, 'dropped');
});

test('index.html wiring: buttons beside the X, strings in three languages, served offline', () => {
    assert.match(html, /<script src="scan-snap-core\.js\?v=[^"]+"><\/script>/);
    assert.equal((read('sw.js').match(/"scan-snap-core\.js"/g) || []).length, 2, 'precached and in the same-origin list');
    assert.match(html, /class="b3-sbtn b3-snapb" id="b3Snap" data-b3="snap"/);
    assert.match(html, /class="b3-sbtn b3-focusb" id="b3Focus" data-b3="camfocus" hidden/);
    assert.match(html, /\.b3-snapb\{left:calc\(var\(--sb-x,50%\) - 28px - 18px - 56px\)\}/, 'left of the 56px X');
    assert.match(html, /\.b3-focusb\{left:calc\(var\(--sb-x,50%\) \+ 28px \+ 18px\)\}/, 'right of it');
    assert.match(html, /case "snap": snapShot\(\); break;/);
    assert.match(html, /case "camfocus": camFocus\(\); break;/);
    assert.match(html, /case "snapretake":/);
    for (const k of ['snap', 'snapL', 'snapKept', 'snapRead', 'snapReadS', 'snapNone', 'snapNoneS', 'snapAgain', 'snapPhone', 'focus', 'focusL', 'focusNo', 'zoom', 'zoomL', 'zoomOn']) {
        const m = html.match(new RegExp('\\n  ' + k + ': \\[("[^"]*"), ("[^"]*"), ("[^"]*")\\],'));
        assert.ok(m, k + ' has EN/DE/ES');
    }
    assert.doesNotMatch(html.match(/\n  snapNoneS: \[[^\n]*/)[0], /guarant|garant/i, 'never promises a photo always reads');
    assert.match(html, /if \(CAM\.snap \|\| st === "snapread" \|\| st === "snapnone"\) return; startCam\(\); \}/, 'camResume leaves a kept photo alone');
    assert.match(html, /clearSnap\(c\); clearInterval\(c\.sbIv\);/, 'closing frees the photo');
});

/* ---- the real Snap code from index.html, against a fake camera ---- */
function harness(opts) {
    opts = opts || {};
    const block = html.slice(html.indexOf('const snapCore = () =>'), html.indexOf('async function torch(){'));
    assert.ok(block.length > 2000, 'snap block found');
    const cls = () => { const s = new Set(); return { add: (...a) => a.forEach(x => s.add(x)), remove: (...a) => a.forEach(x => s.delete(x)), contains: x => s.has(x), has: s }; };
    let liveCode = opts.code || '';
    const mkCanvas = () => { const cv = { width: 0, height: 0, __code: '', freed: false };
        cv.getContext = () => ({ drawImage: (src) => { cv.__code = src.__code || ''; }, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), translate() {}, rotate() {} }); return cv; };
    const video = { videoWidth: 720, videoHeight: 1280, get __code() { return liveCode; } };
    const still = mkCanvas();
    const el = { classList: cls(), dataset: {}, style: { setProperty() {}, removeProperty() {} } };
    el.classList.add('live');
    const log = { found: [], states: [], msgs: [], stops: 0, decodes: 0, freed: 0 };
    const env = {
        window: { LowiScanSnapCore: S }, document: { createElement: () => mkCanvas(), getElementById: () => null },
        performance: { now: () => Date.now() }, innerHeight: 844,
        $: (sel) => sel === '#b3Vid' ? video : sel === '#b3Still' ? still : null,
        t: (k) => k, esc: (x) => x, IC: { focus: '', shutter: '' }, buzz() {}, sfx() {},
        msg: (m) => log.msgs.push(m), msgState: (s) => { log.states.push(s); el.dataset.st = s; },
        stopStream: () => { log.stops++; if (H.CAM) H.CAM.stream = null; },
        freeCv: (cv) => { if (cv) { cv.freed = true; log.freed++; } },
        nativeDetector: async () => opts.det || null, loadZX: async () => {}, zxReader: () => ({}),
        zxDecodeCanvas: (cv) => { log.decodes++; return opts.decode ? opts.decode(cv) : cv.__code; },
        validCode: (v) => (v && /^\d{8,14}$/.test(v) ? v : ''),
        found: (code) => { log.found.push(code); if (H.CAM) { H.CAM.hold = true; H.snapSettle(H.CAM, code); } } /* as index.html's found() */
    };
    const H = { CAM: { el, stream: { getVideoTracks: () => [] }, hold: false, raf: 0, lastHit: null }, log, el, still, setCode: c => { liveCode = c; } };
    const names = Object.keys(env);
    const fn = new Function('H', ...names, 'let CAM = H.CAM; Object.defineProperty(H, "CAM", { get: () => CAM, set: v => { CAM = v; } });\nconst cancelAnimationFrame = () => {};\n' + block + '\nreturn { snapShot, clearSnap, snapSettle, readKept };');
    Object.assign(H, fn(H, ...names.map(n => env[n])));
    return H;
}
const until = async (f, ms = 4000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 10)); } return true; };

test('Snap: keeps real frames, lets the camera go, reads the barcode from the kept photo, one result', async () => {
    const H = harness({ code: '4056489123453' });
    const p = H.snapShot(); H.snapShot(); // double tap
    assert.ok(H.el.classList.contains('snapped'), 'the kept photo shows at once');
    assert.equal(H.still.__code, '4056489123453', 'the still is drawn from a real frame');
    H.setCode(''); // the shopper walks away: the camera now sees nothing
    await p; await until(() => H.log.found.length);
    assert.deepEqual(H.log.found, ['4056489123453'], 'read from the kept frames after the camera stopped');
    assert.equal(H.log.stops, 1, 'camera let go exactly once');
    assert.ok(H.log.states.includes('snapread'));
    assert.equal(H.CAM.snap.code, '4056489123453');
    assert.equal(H.CAM.snap.frames.length, 0, 'frames freed after the read');
    assert.match(H.el.dataset.snapHow, /^band:/);
    assert.equal(H.el.dataset.st, 'lookup', 'the reading card makes way for the result card');
});

test('Snap: no barcode in the photo -> honest "no readable barcode", nothing found; Snap again works', async () => {
    const H = harness({ code: '' });
    await H.snapShot();
    assert.deepEqual(H.log.found, []);
    assert.equal(H.el.dataset.st, 'snapnone');
    assert.equal(H.el.dataset.snapHow, 'none');
    assert.ok(H.log.decodes >= 4 && H.log.decodes <= 4 + 3 * 2, 'bounded work: ' + H.log.decodes + ' reads');
    // retry = the scanner starts the camera again (startCam1 clears the kept photo first)
    H.clearSnap(H.CAM); assert.equal(H.CAM.snap, null); assert.ok(!H.el.classList.contains('snapped'));
    H.CAM.stream = { getVideoTracks: () => [] }; H.el.classList.add('live'); H.setCode('4000000000006');
    await H.snapShot(); await until(() => H.log.found.length);
    assert.deepEqual(H.log.found, ['4000000000006']);
});

test('Snap: closing the scanner (or leaving the screen) during the read drops it: no late result', async () => {
    let release, asked = 0; const gate = new Promise(r => { release = r; });
    const det = { detect: async (cv) => { asked++; await gate; return [{ rawValue: cv.__code }]; } }; /* a read still running */
    const H = harness({ code: '4056489123453', det });
    const p = H.snapShot();
    assert.ok(await until(() => asked > 0), 'the read started');
    const c = H.CAM; H.CAM = null; H.clearSnap(c); release(); /* closeScanner: CAM = null, kept photo freed */
    await p;
    assert.deepEqual(H.log.found, [], 'nothing arrives after close');
    assert.equal(c.snap, null);
});

test('Snap: the live scan getting there first wins; the Snap read is dropped (one barcode, one result)', async () => {
    let n = 0;
    const H = harness({ code: '4056489123453', decode: cv => { if (++n === 1) { H.CAM.hold = true; H.snapSettle(H.CAM, '4056489123453'); } return cv.__code; } });
    await H.snapShot();
    assert.deepEqual(H.log.found, [], 'the Snap does not report a second time');
    assert.equal(n, 1, 'reading stopped right away');
});

test('Snap: a result during the burst (camera still on) drops the photo and stops the burst', async () => {
    const H = harness({ code: '4056489123453' });
    const p = H.snapShot();
    H.CAM.hold = true; H.snapSettle(H.CAM, '4056489123453');
    await p;
    assert.equal(H.CAM.snap, null, 'photo dropped while the camera is on');
    assert.equal(H.log.stops, 0, 'the live result keeps its camera');
    assert.deepEqual(H.log.found, []);
});

test('Snap is refused while typing, while a result shows, or with no live camera', async () => {
    for (const set of [H => H.el.classList.add('typing'), H => { H.CAM.hold = true; }, H => { H.CAM.stream = null; }, H => H.el.classList.remove('live')]) {
        const H = harness({ code: '4056489123453' }); set(H);
        await H.snapShot();
        assert.equal(H.CAM.snap || null, null); assert.equal(H.log.stops, 0); assert.deepEqual(H.log.found, []);
    }
});
