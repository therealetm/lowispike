'use strict';
/* BH-047 (bug hunt run 47, Oct 26 2026), pattern P-SESSION-OUTLIVES-SCREEN: the food camera (Snap food, spirit.js photo(),
   #ssFood) did not follow the screen it belongs to.
   - Safari's swipe back / Escape never reached it (the herb world's keydown returns while the world is closed, which it always
     is under the camera). Seen on the live site (build 20261026-182027, Chromium 390 and WebKit iPhone 13): back with Snap
     food open LEFT THE APP.
   - Going to the background stopped the stream, but coming back never started it again: the screen kept its live look on a
     dead stream and the shutter took the last frozen frame (black on iPhone).
   These run the real code cut out of spirit.js in a sandbox, so they fail on the old code. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'spirit.js'), 'utf8');

function balanced(from, open, close) {
    let j = src.indexOf(open, from), depth = 0;
    for (; j < src.length; j++) { const ch = src[j]; if (ch === open) depth++; else if (ch === close) { depth--; if (!depth) return j; } }
    throw new Error('unbalanced');
}
function cut(name) {
    const i = src.indexOf('function ' + name + '(');
    if (i < 0) return '';
    const s = src.lastIndexOf('async ', i) === i - 6 ? i - 6 : i;
    return src.slice(s, balanced(src.indexOf(')', i), '{', '}') + 1);
}
/* every document/window listener of one type whose body mentions a marker */
function listeners(head, marker) {
    const out = [];
    let i = 0;
    while ((i = src.indexOf(head, i)) >= 0) {
        const end = balanced(i, '(', ')');
        const s = src.slice(i, end + 1);
        if (s.includes(marker)) out.push(s + ';');
        i = end;
    }
    return out.join('\n');
}

function cls() { const s = new Set(); return { add: c => s.add(c), remove: c => s.delete(c), contains: c => s.has(c) }; }
function track(state) { return { readyState: state || 'live', stop() { this.readyState = 'ended'; } }; }
function stream() { const t = [track()]; return { getTracks: () => t, getVideoTracks: () => t }; }

function sandbox() {
    const card = { innerHTML: '' }, hint = { hidden: true };
    const video = { srcObject: null, videoWidth: 960, videoHeight: 720, play: async () => { } };
    const h = { isConnected: true, dataset: {}, classList: cls(), removed: false, remove() { this.isConnected = false; this.removed = true; }, querySelector: s => s === 'video' ? video : s === '.ss-card' ? card : s === '.ss-hint' ? hint : null };
    const L = { doc: {}, win: {} };
    const on = where => (type, fn, cap) => { (L[where][type] = L[where][type] || []).push(fn); };
    const ctx = {
        h, video, card, gum: 0, flights: 0, refreshes: 0, Math, Date, setTimeout, clearTimeout, Promise, File: function () { },
        navigator: { mediaDevices: { getUserMedia: async () => { ctx.gum++; return stream(); } } },
        D: { hidden: false, documentElement: { classList: cls() }, addEventListener: on('doc'), createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() { } }), toDataURL: () => 'data:image/jpeg;base64,x', toBlob() { } }) },
        window: { addEventListener: on('win') }, L,
        tr: k => k, esc: s => String(s), icon: () => '', refresh: () => { ctx.refreshes++; },
        flight: () => { ctx.flights++; return Promise.resolve(); }, photoSheet() { }
    };
    ctx.window.LowiDex = null;
    vm.createContext(ctx);
    vm.runInContext('var photoStream=null,foodCam=null,capture=false,world=null,photoURL="",photoFile=null,opened=false,R={top:()=>null,close(){}};\n' +
        ['stopPhoto', 'cancelCapture', 'foodState', 'startFood', 'shutter'].map(cut).join('\n') + '\n' +
        listeners("D.addEventListener('visibilitychange'", 'stopPhoto') + '\n' +
        listeners("window.addEventListener('keydown'", 'foodCam') + '\n' +
        listeners("D.addEventListener('keydown'", 'Escape'), ctx);
    return ctx;
}
const live = ctx => vm.runInContext('!!(photoStream && photoStream.getVideoTracks().some(t => t.readyState === "live"))', ctx);
function openLive(ctx) { vm.runInContext('foodCam=h;capture=true;photoStream=(' + stream.toString() + ')();h.classList.add("live");h.dataset.st="live";', Object.assign(ctx, { track })); }
function vis(ctx, visible) { ctx.D.hidden = !visible; (ctx.L.doc.visibilitychange || []).forEach(f => f()); }
function key(ctx, k) {
    const e = { key: k, stopped: false, prevented: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, stopPropagation() { this.stopped = true; } };
    for (const f of ctx.L.win.keydown || []) { f(e); if (e.stopped) return e; }
    for (const f of ctx.L.doc.keydown || []) { f(e); if (e.stopped) return e; }
    return e;
}

test('Escape / swipe back closes the food camera and stops it, and nothing under it sees that Escape', () => {
    const ctx = sandbox();
    openLive(ctx);
    const e = key(ctx, 'Escape');
    assert.ok(ctx.h.removed, 'Escape must close the food camera (back-swipe.js sends Escape on Safari swipe back)');
    assert.equal(live(ctx), false, 'the camera stream is stopped');
    assert.ok(e.stopped, 'the camera takes that Escape: sheets under it stay open');
    const ctx2 = sandbox();
    const e2 = key(ctx2, 'Escape');
    assert.ok(!e2.stopped, 'with no food camera open, Escape is left alone');
});

test('back from the background: the food camera starts again instead of staying on a dead stream', async () => {
    const ctx = sandbox();
    openLive(ctx);
    vis(ctx, false);
    assert.equal(live(ctx), false, 'hidden: the camera is handed back (iOS shows the camera dot otherwise)');
    assert.ok(!ctx.h.classList.contains('live'), 'hidden: the screen drops its live look');
    vis(ctx, true);
    await new Promise(r => setTimeout(r, 450));
    assert.equal(ctx.gum, 1, 'visible again: the camera is asked for once');
    assert.ok(live(ctx), 'visible again: a live stream');
    assert.ok(ctx.h.classList.contains('live') && ctx.h.dataset.st === 'live', 'and the screen is live again');
    vis(ctx, false); vis(ctx, true); vis(ctx, false); vis(ctx, true);
    await new Promise(r => setTimeout(r, 450));
    assert.equal(vm.runInContext('photoStream.getTracks().length', ctx), 1, 'quick switches leave exactly one stream');
});

test('a closed or denied camera is not started again on return', async () => {
    const ctx = sandbox();
    vis(ctx, false); vis(ctx, true);
    await new Promise(r => setTimeout(r, 400));
    assert.equal(ctx.gum, 0, 'no camera open: nothing starts');
    const c2 = sandbox();
    vm.runInContext('foodCam=h;h.dataset.st="denied";', c2);
    vis(c2, false); vis(c2, true);
    await new Promise(r => setTimeout(r, 400));
    assert.equal(c2.gum, 0, 'a camera the user blocked is not asked for again by itself');
});

test('the shutter never takes a photo from a stopped stream', () => {
    const ctx = sandbox();
    openLive(ctx);
    vm.runInContext('photoStream.getTracks().forEach(t => t.stop());', ctx);
    vm.runInContext('shutter()', ctx);
    assert.equal(ctx.flights, 0, 'a dead stream keeps videoWidth and its last frame: no photo from it');
    const ok = sandbox();
    openLive(ok);
    vm.runInContext('shutter()', ok);
    assert.equal(ok.flights, 1, 'a live camera still takes the photo');
});
