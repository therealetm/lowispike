/* 25 Oct 2026 evening (Emmanuel): Fuel > log meal > snack > choose a photo, then "Save photo" on the photo screen restarted the app.
   Cause in spirit.js savePhoto(): when navigator.share threw anything but a cancel (iOS rejects a second share while the sheet is
   still opening), it fell through to a download link to a blob: URL. In the iPhone Home Screen app a download is a navigation: the
   image replaces the app and going back loads it fresh. These run the real savePhoto() code from spirit.js with fake browser parts. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'spirit.js'), 'utf8');

const a = src.indexOf('    function photoAsFile() {'), b = src.indexOf('    async function onPhotoFile(file) {');
assert.ok(a > 0 && b > a, 'savePhoto block found');
const block = src.slice(a, b);

function world({ ios = true, standalone = true, share = 'ok', canShare = true } = {}) {
    const log = { shares: 0, downloads: 0, navigations: 0, views: 0, toasts: [] };
    let release = null;
    const nodes = [];
    const mk = tag => {
        const n = { tag, style: {}, attrs: {}, children: [], listeners: {}, set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html || ''; },
            setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(k, f) { this.listeners[k] = f; }, remove() { this.removed = true; },
            querySelector() { return { addEventListener: (k, f) => { n.closeFn = f; } }; },
            click() { if (tag === 'a' && this.download) { log.downloads++; if (ios && standalone) log.navigations++; } } };
        nodes.push(n); return n;
    };
    const D = { createElement: mk, getElementById: () => null, body: { append(n) { n.inBody = true; }, appendChild(n) { n.inBody = true; if (n.id === 'spPhotoSave') log.views++; } } };
    const navigator = { userAgent: ios ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' : 'Mozilla/5.0 (X11; Linux x86_64)', platform: ios ? 'iPhone' : 'Linux x86_64', maxTouchPoints: ios ? 5 : 0, standalone: ios && standalone };
    if (share) {
        navigator.canShare = () => canShare;
        navigator.share = () => { log.shares++; if (share === 'ok') return new Promise(r => { release = r; }); const e = new Error(share); e.name = share; return Promise.reject(e); };
    }
    const window = { matchMedia: () => ({ matches: standalone }) };
    const URL = { createObjectURL: () => 'blob:x', revokeObjectURL() { } };
    const R = { toast: t => log.toasts.push(t) };
    const tr = k => k, esc = v => String(v);
    class File { constructor(parts, name) { this.name = name; } }
    const make = new Function('D', 'navigator', 'window', 'URL', 'R', 'tr', 'esc', 'File', 'atob', 'matchMedia', 'setTimeout',
        'let photoFile = new File([], "meal.jpg"), photoURL = "data:image/jpeg;base64,AA==";\n' + block + '\nreturn savePhoto;');
    const savePhoto = make(D, navigator, window, URL, R, tr, esc, File, s => Buffer.from(s, 'base64').toString('binary'), window.matchMedia, () => 0);
    return { savePhoto, log, done: () => release && release() };
}

test('a second tap while the share sheet is open does not share twice and never falls back to a download', async () => {
    const w = world({ share: 'ok' });
    const first = w.savePhoto();
    await w.savePhoto();
    await w.savePhoto();
    assert.strictEqual(w.log.shares, 1, 'one share sheet');
    assert.strictEqual(w.log.downloads, 0);
    w.done(); await first;
    const next = w.savePhoto();
    assert.strictEqual(w.log.shares, 2, 'after the sheet closes, the next tap shares again');
    w.done(); await next;
});

for (const err of ['InvalidStateError', 'NotAllowedError', 'TypeError', 'DataError']) {
    test('share fails with ' + err + ' in the iPhone Home Screen app: an in-app photo view, no download, no navigation', async () => {
        const w = world({ share: err });
        await w.savePhoto();
        assert.strictEqual(w.log.downloads, 0);
        assert.strictEqual(w.log.navigations, 0, 'the app is never replaced by the image');
        assert.strictEqual(w.log.views, 1, 'the photo opens inside the app, press and hold to save');
    });
}

test('no share at all (older iPhone, iPad Safari tab): in-app view, never a download', async () => {
    for (const opts of [{ share: null }, { share: 'ok', canShare: false }, { share: null, standalone: false }]) {
        const w = world(opts);
        await w.savePhoto();
        assert.strictEqual(w.log.downloads, 0, JSON.stringify(opts));
        assert.strictEqual(w.log.views, 1, JSON.stringify(opts));
    }
});

test('cancelling the share sheet does nothing else', async () => {
    const w = world({ share: 'AbortError' });
    await w.savePhoto();
    assert.deepStrictEqual([w.log.downloads, w.log.views], [0, 0]);
});

test('a plain browser on a computer still downloads the photo', async () => {
    const w = world({ ios: false, standalone: false, share: null });
    await w.savePhoto();
    assert.strictEqual(w.log.downloads, 1);
    assert.strictEqual(w.log.views, 0);
});

test('the photo view is inside the app and says how to save, in three languages', () => {
    assert.match(src, /photoHold: \['Press and hold the photo[^']*', '[^']*gedr\\u00fcckt[^']*', '[^']*'\]/);
    assert.match(block, /aria-modal/);
    assert.doesNotMatch(block, /location\.(href|assign|replace)|window\.open\(/, 'nothing in Save photo leaves the app');
});
