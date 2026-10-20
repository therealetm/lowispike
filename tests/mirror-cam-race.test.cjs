// Oct 20, 2026, bug hunt run 19 (BH-019, pattern "async result painted into stale UI", here: a camera started by a stale start).
// Move > Mirror mode waits for the camera (and the first time for the 9 MB tracker) before it starts. Anything you did while
// "Starting the camera…" was showing was overruled when the camera answered:
//  - "Without camera" during the start: the camera came on anyway and stayed on for the whole camera-free routine.
//  - the tracker failed to load (offline) while the iPhone permission prompt was still up: "Camera not available" showed, then
//    you tapped Allow and the camera came on behind it and was never turned off.
//  - close and start again while the first start was still waiting: two cameras opened, one was never stopped (camera light on
//    until the app was closed).
//  - "Turn camera back on" after the app was in the background, then close while it starts: a TypeError and the camera left on.
// Real camera and tracker runs are browser checks (BUGHUNT/playtest/probe-mirror-cam.cjs); here the camera and tracker are fakes we
// answer by hand, and the whole mirror-move.js runs against a tiny DOM.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const C = require('../mirror-move-core.js');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'mirror-move.js'), 'utf8');

function cls() { const s = new Set(); return { add: (...a) => a.forEach(x => s.add(x)), remove: (...a) => a.forEach(x => s.delete(x)), contains: x => s.has(x), toggle: (x, on) => { if (on === undefined ? !s.has(x) : on) s.add(x); else s.delete(x); } }; }
function el(tag) {
    const kids = {};
    const e = { tag, hidden: false, innerHTML: '', textContent: '', style: {}, attrs: {}, classList: cls(), videoWidth: 640, videoHeight: 480, readyState: 0, currentTime: 0, width: 0, height: 0,
        setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
        querySelector(s) { return kids[s] || (kids[s] = el(s)); }, querySelectorAll() { return []; }, focus() {}, addEventListener() {}, removeEventListener() {}, appendChild() {},
        getContext() { return new Proxy({}, { get: () => () => ({ data: new Uint8ClampedArray(24 * 18 * 4) }) }); }, play() { return Promise.resolve(); }, pause() {},
        getBoundingClientRect() { return { left: 0, top: 0, width: 390, height: 844 }; } };
    return e;
}

function rig() {
    const L = { click: [], keydown: [], visibilitychange: [] }, cams = [], gums = [], models = [];
    const H = { classList: cls(), lang: 'en' };
    const D = { hidden: false, baseURI: 'http://lowi.test/', documentElement: H, body: { appendChild() {} }, createElement: el, querySelector: () => null,
        addEventListener: (t, f) => (L[t] = L[t] || []).push(f), removeEventListener: (t, f) => { L[t] = (L[t] || []).filter(x => x !== f); } };
    const navigator = { mediaDevices: { getUserMedia: () => new Promise(r => gums.push(() => {
        const t = { stopped: false, stop() { this.stopped = true; } }; cams.push(t); r({ getTracks: () => [t], getVideoTracks: () => [t] });
    })) } };
    const mp = { FilesetResolver: { forVisionTasks: async () => ({}) }, PoseLandmarker: { createFromOptions: async () => ({ detectForVideo: () => ({}), close() {} }) } };
    const ctx = { document: D, navigator, URL, Promise, Error, Math, String, Object, Array, JSON, Set, Map, Proxy, Uint8ClampedArray, WebAssembly: {},
        isSecureContext: true, LowiMirrorCore: C, addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }), performance: { now: () => 0 },
        setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
        __import: () => new Promise((res, rej) => models.push({ ok: () => res(mp), fail: () => rej(new Error('offline')) })) };
    ctx.window = ctx;
    vm.createContext(ctx);
    const code = SRC.replace("import(base + 'vision_bundle.mjs')", "W.__import(base + 'vision_bundle.mjs')");
    assert.notStrictEqual(code, SRC, 'tracker import line not found');
    vm.runInContext(code, ctx);
    const M = ctx.LowiMirror; assert.ok(M, 'LowiMirror exported');
    const tap = (k, r) => L.click.forEach(f => f({ target: { closest: () => ({ getAttribute: a => a === 'data-mm' ? k : r || null, setAttribute() {}, classList: cls() }) } }));
    const esc = () => (L.keydown || []).slice().forEach(f => f({ key: 'Escape' }));
    const vis = h => { D.hidden = h; L.visibilitychange.forEach(f => f()); };
    return { M, H, cams, gums, models, tap, esc, vis, live: () => cams.filter(t => !t.stopped).length };
}
const flush = async () => { for (let i = 0; i < 12; i++) await new Promise(r => setImmediate(r)); };
async function rejections(fn) {
    const seen = [], on = e => seen.push(e); process.on('unhandledRejection', on);
    try { await fn(); await flush(); } finally { process.off('unhandledRejection', on); }
    return seen;
}

test('the normal camera start still turns the camera on and runs (guard against over-cancelling)', async () => {
    const g = rig();
    g.M.open(); g.tap('pick', 'chair'); g.tap('cam');
    g.gums.shift()(); g.models.shift().ok(); await flush();
    assert.strictEqual(g.live(), 1, 'one camera on');
    const s = g.M._state(); assert.ok(s.running && s.stream, 'running with a stream');
    assert.ok(g.H.classList.contains('mm-cam'));
    g.tap('close'); await flush();
    assert.strictEqual(g.live(), 0, 'close turns it off');
});

test('"Without camera" tapped while the camera is starting: the camera never stays on', async () => {
    const g = rig();
    g.M.open(); g.tap('pick', 'chair'); g.tap('cam');
    g.tap('free'); await flush();
    g.gums.shift()(); g.models.shift().ok(); await flush();
    assert.strictEqual(g.live(), 0, 'camera tracks still running in camera-free mode: ' + g.live());
    assert.strictEqual(g.M._state().flow.mode, 'free');
    assert.ok(!g.H.classList.contains('mm-cam'));
});

test('tracker fails (offline) while the permission prompt is up: Allow afterwards does not leave the camera on', async () => {
    const g = rig();
    g.M.open(); g.tap('pick', 'chair'); g.tap('cam');
    g.models.shift().fail(); await flush();
    assert.strictEqual(g.M._state().flow, null, 'problem sheet shown');
    g.gums.shift()(); await flush();
    assert.strictEqual(g.live(), 0, 'camera came on behind "Camera not available"');
    assert.strictEqual(g.M._state().stream, false);
});

test('close while starting, reopen and start again: only one camera, and closing turns it off', async () => {
    const g = rig();
    g.M.open(); g.tap('pick', 'chair'); g.tap('cam');
    g.esc(); await flush();
    g.M.open(); g.tap('pick', 'chair'); g.tap('cam');
    g.gums.forEach(f => f()); g.gums.length = 0; g.models.forEach(m => m.ok()); await flush();
    assert.ok(g.live() <= 1, 'cameras on at once: ' + g.live());
    g.tap('close'); await flush();
    assert.strictEqual(g.live(), 0, 'a camera stayed on after close');
});

test('"Turn camera back on" then close while it starts: no error, camera off, no camera class left', async () => {
    const g = rig();
    g.M.open(); g.tap('pick', 'chair'); g.tap('cam');
    g.gums.shift()(); g.models.shift().ok(); await flush();
    g.vis(true); g.vis(false);
    assert.strictEqual(g.live(), 0, 'background stopped the camera');
    const errs = await rejections(async () => {
        g.tap('resumecam'); await flush();
        g.esc(); await flush();
        g.gums.shift()(); await flush();
    });
    assert.deepStrictEqual(errs.map(e => String(e && e.message || e)), [], 'unhandled rejection');
    assert.strictEqual(g.live(), 0, 'camera on after close');
    assert.ok(!g.H.classList.contains('mm-cam'), 'html.mm-cam left on after close');
});

/* sibling, same pattern: discovery.js label photo (double tap = two IndexedDB reads = two photo sheets) */
test('label photo double tap opens ONE photo sheet', async () => {
    const dsrc = fs.readFileSync(path.join(__dirname, '..', 'discovery.js'), 'utf8');
    const i = dsrc.indexOf('async function showPhoto(key)'); assert.ok(i >= 0);
    let d = 0, j = dsrc.indexOf('{', i), end = -1;
    for (let k = j; k < dsrc.length; k++) { if (dsrc[k] === '{') d++; else if (dsrc[k] === '}') { d--; if (!d) { end = k + 1; break; } } }
    const fn = dsrc.slice(i, end), decl = (dsrc.match(/\nlet PH_SEQ[^\n]*/) || [''])[0];
    const live = [], reads = [];
    const ctx = { activeScope: 'u1', esc: x => String(x), tr: k => k, res: {},
        sheet: html => { const c = new Set(); const ov = { html, isConnected: true, classList: { contains: x => c.has(x), add: x => c.add(x) } }; live.push(ov); return ov; },
        window: { LowiR2: { close: ov => { ov.classList.add('off'); const n = live.indexOf(ov); if (n >= 0) live.splice(n, 1); } } },
        photoDb: async () => ({ close() {}, transaction: () => ({ objectStore: () => ({ get: () => { const q = {}; reads.push(() => { q.result = 'data:image/png;base64,AA'; q.onsuccess(); }); return q; } }) }) }) };
    vm.createContext(ctx);
    vm.runInContext(decl + '\n' + fn + '\nres.showPhoto = showPhoto;', ctx);
    const a = ctx.res.showPhoto('u1:p1'), b = ctx.res.showPhoto('u1:p1');
    await flush(); reads.forEach(r => r()); await a; await b; await flush();
    assert.strictEqual(live.length, 1, 'photo sheets open: ' + live.length);
});
