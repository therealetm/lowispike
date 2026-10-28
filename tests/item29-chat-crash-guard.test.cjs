'use strict';
/* Oct 28 2026 item 29 (Emmanuel's real iPhone: going from Community into the chat crashes or reloads the page).
   Guards: the faded 3D world rests behind steady Community (1x1 drawing buffer, canvas hidden, no blur kept), the hidden wallpaper
   keeps no will-change layers, and the light crash log records errors and a page that died in front, shown in About & info.
   Also X-16: "Zahl, was du willst" has its tap path in Profile (Settings list). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('the faded world rests: buffer shrinks to 1x1, resizes held back, waking redraws at once', () => {
    const sc = R('body-world-3d-scene.js'), bw = R('body-world-3d.js');
    assert.match(sc, /renderer\.setSize = function \(w, h, u\) \{ if \(resting\) return;/);
    assert.match(sc, /if \(restNow\) \{ resting = true; sizeNow\(1, 1, false\); \}/);
    assert.match(sc, /resting = false; renderer\.setPixelRatio\(dpr\); sizeNow\(W, H, false\); paintNow = true;/);
    assert.match(sc, /if \(resting\) \{ nextGap = 400; return; \}/);
    assert.match(sc, /nudge\(\) \{ if \(resting && \(wake \|\| nextGap > 0\)\) \{ nextGap = 0; askFrame\(\); \} \}/);
    assert.match(bw, /function queueBack\(\) \{ try \{ if \(world && world\.resting && world\.nudge\) world\.nudge\(\);/);
    assert.match(bw, /rest: backFaded, onRest: r => \{ try \{ canvas\.classList\.toggle\('bw3-rest', !!r\);/);
    /* the pull-out and the dive home are never resting: backFaded is false during gx-in / gx-out */
    assert.match(bw, /function backFaded\(\) \{\s*if \(!canvas \|\| !H\.classList\.contains\('wb-comm'\) \|\| H\.classList\.contains\('gx-in'\) \|\| H\.classList\.contains\('gx-out'\)\) return false;/);
});

test('CSS: a resting world canvas is hidden without a filter; the hidden wallpaper drops will-change', () => {
    assert.match(R('community-standout.css'), /html\.wb-on\.wb-comm #bw3Back \.bw3-canvas\.bw3-rest \{ filter: none !important; visibility: hidden !important;/);
    assert.match(R('realm-backdrop.css'), /#app > #rwBack\.rw-back:not\(\.rw-show\) \* \{ will-change: auto !important; animation-play-state: paused !important; \}/);
});

function boot(store, cls) {
    const L = {}; const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
    const html = { classList: { contains: c => (cls || []).includes(c) } };
    const doc = { hidden: false, documentElement: html, querySelector: s => (s.includes('lowi-build') ? { content: '20261028-999999' } : s.includes('.tab.active') ? { id: 'tab-foryou' } : s.includes('.rm-tab') ? { dataset: { rm: 'room' } } : null), querySelectorAll: () => [{ width: 780, height: 1688 }], addEventListener: (t, f) => { L['d:' + t] = f; } };
    const win = { document: doc, localStorage: ls, addEventListener: (t, f) => { L[t] = f; }, setTimeout: () => 1, clearTimeout: () => { } };
    vm.runInNewContext(R('crash-log.js'), { window: win, JSON, Date, Math, String, Array });
    return { win, L };
}

test('crash log: a page that died in front is logged on the next start, a normal leave is not', () => {
    const store = {};
    let b = boot(store, ['wb-comm', 'rm-room-open']);
    assert.ok(b.win.LowiCrashLog);
    assert.equal(b.win.LowiCrashLog.list().length, 0);
    assert.equal(JSON.parse(store['lowi.crash.live']).a, 'community/chat');
    /* no pagehide: iOS killed the page -> next start logs it with the place */
    b = boot(store, []);
    const a = b.win.LowiCrashLog.list();
    assert.equal(a.length, 1); assert.equal(a[0].k, 'reload'); assert.equal(a[0].a, 'community/chat'); assert.match(a[0].m, /canvas 1\.3 MP/);
    /* a normal leave clears the mark */
    b.L.pagehide();
    b = boot(store, []);
    assert.equal(b.win.LowiCrashLog.list().length, 1);
    /* JS errors and rejections are kept (same one within 10 s counts up), last 20 only */
    b.L.error({ message: 'boom', filename: 'https://x/community-chat.js?v=1', lineno: 12 });
    b.L.error({ message: 'boom', filename: 'https://x/community-chat.js?v=1', lineno: 12 });
    b.L.unhandledrejection({ reason: new Error('nope') });
    b.L.error({ target: {} }); /* a resource load error has no message: ignored */
    const c = b.win.LowiCrashLog.list();
    assert.equal(c.length, 3); assert.equal(c[1].n, 2); assert.equal(c[1].s, 'community-chat.js:12'); assert.equal(c[2].k, 'promise');
    for (let i = 0; i < 30; i++) b.L.error({ message: 'e' + i, filename: '', lineno: i });
    assert.equal(b.win.LowiCrashLog.list().length, 20);
});

test('crash log loads right after igFresh (first-start check still sees empty storage) and is precached', () => {
    const html = R('index.html');
    const ig = html.indexOf('<script id="igFresh">'), cl = html.indexOf('<script src="crash-log.js?v=');
    assert.ok(ig > 0 && cl > ig && cl - ig < 400, 'crash-log.js right after igFresh');
    assert.match(R('sw.js'), /STATIC\.push\("crash-log\.js"\)/);
});

test('About & info shows the crash log; X-16 "Zahl, was du willst" is a Settings row in Profile that opens the support view', () => {
    const js = R('home-settings-sleep-v2.js');
    assert.match(js, /crashHTML\(L3, esc2\) \+/);
    assert.match(js, /'Absturz-Protokoll \(dieses Ger\\u00e4t\)'/);
    const SS = require('../home-settings-sleep-v2.js');
    const ids = SS.SETTINGS_IDS;
    assert.ok(ids.includes('support'));
    assert.equal(ids[ids.length - 1], 'about');
    assert.equal(ids.indexOf('support'), ids.length - 2);
    assert.match(js, /support: 'Zahl, was du willst'/);
    assert.match(js, /support: 'Pay what you want'/);
    assert.match(js, /support: 'Paga lo que quieras'/);
    assert.match(js, /support: \{ has: \(\) => !!\(root\.LowiHerbShop && fn\(root\.LowiHerbShop, 'open'\)\), run: \(\) => root\.LowiHerbShop\.open\(\) \}/);
    assert.match(js, /support: '<path /);
});
