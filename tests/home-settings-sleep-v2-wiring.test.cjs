'use strict';
/* Oct 18 2026 (Emmanuel: the Sleep and Settings bubbles on the one-page Home must work for real):
   the finished module home-settings-sleep-v2.* replaces the shell's first-version Sleep and Settings. These tests pin the wiring:
   loaded once, right after the ring shell, precached by the service worker, and the shell's sleepToday() reads the module's
   private sleep log (hours bands) instead of the old Good/Okay/Short fallback once the module owns the Sleep bubble. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('index.html loads the Sleep/Settings module once, right after the ring shell', () => {
    const html = read('index.html');
    const css = html.match(/<link[^>]+href="home-settings-sleep-v2\.css[^"]*"[^>]*>/g) || [];
    const js = html.match(/<script[^>]+src="home-settings-sleep-v2\.js[^"]*"[^>]*><\/script>/g) || [];
    assert.strictEqual(css.length, 1, 'one stylesheet tag');
    assert.strictEqual(js.length, 1, 'one script tag');
    const shell = html.indexOf('src="home-orbit-v2.js');
    assert.ok(shell > 0, 'shell is loaded');
    assert.ok(html.indexOf('home-settings-sleep-v2.js') > shell, 'module script after the shell');
    assert.ok(html.indexOf('home-settings-sleep-v2.css') > html.indexOf('home-orbit-v2.css'), 'module css after the shell css');
    const build = JSON.parse(read('version.json')).build;
    assert.ok(css[0].includes('?v=' + build) && js[0].includes('?v=' + build), 'cache-busted with the current build');
});

test('service worker precaches both module files', () => {
    const sw = read('sw.js');
    const list = JSON.parse(sw.match(/const STATIC = (\[[^\]]*\])/)[1]);
    assert.ok(list.includes('home-settings-sleep-v2.js'), 'js precached');
    assert.ok(list.includes('home-settings-sleep-v2.css'), 'css precached');
});

test('the Sleep/Settings module does not load the sibling blooms module or touch its files', () => {
    const html = read('index.html');
    const ss = read('home-settings-sleep-v2.js');
    assert.ok(!/home-blooms-v2\.js/.test(ss), 'module does not load blooms');
    /* blooms are integrated by their own release; this wiring adds nothing for them */
    assert.ok((html.match(/home-settings-sleep-v2/g) || []).length === 2, 'only our two tags');
});

function loadShell(env) {
    /* run home-orbit-v2.js as a browser script against a tiny fake window, without booting the ring */
    const src = read('home-orbit-v2.js');
    const store = Object.assign({}, env.storage || {});
    const doc = {
        readyState: 'loading', documentElement: { lang: 'en', classList: { contains: () => false } },
        addEventListener() { }, querySelector: s => (s === '#whHud .o8-sleep' ? env.sleepBtn || null : null), getElementById: () => null
    };
    const win = { document: doc, addEventListener() { }, LowiHomeSettingsSleepV2: env.module };
    const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
    new Function('window', 'globalThis', 'localStorage', 'module', src)(win, win, ls, undefined);
    return win.LowiHomeOrbitV2;
}
function todayKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

test('shell sleepToday() reads the module once it owns the Sleep bubble, and never converts Good/Okay/Short into hours', () => {
    const old = { 'lowi.sleep.v1': JSON.stringify({ [todayKey()]: 'good' }) };
    const view = { day: todayKey(), band: '6to7', done: true, fill: 0.667, value: '6\u20137 h', aria: 'Sleep, 6\u20137 h' };
    const module = { mount() { }, sleep: { today: () => view } };
    const owned = loadShell({ storage: old, module, sleepBtn: { dataset: { o8Adapter: 'settings-sleep' } } });
    assert.deepStrictEqual(owned.sleepToday(), view, 'module answer when it owns the bubble');
    const emptyView = { day: todayKey(), band: null, done: false, fill: 0, value: 'Log', aria: 'Sleep, not logged' };
    const ownedEmpty = loadShell({ storage: old, module: { mount() { }, sleep: { today: () => emptyView } }, sleepBtn: { dataset: { o8Adapter: 'settings-sleep' } } });
    assert.strictEqual(ownedEmpty.sleepToday().band, null, 'old "good" entry is not imported as hours');
    const fallback = loadShell({ storage: old, module, sleepBtn: { dataset: {} } });
    assert.strictEqual(fallback.sleepToday(), 'good', 'without the module owning Sleep the shell fallback still answers');
    const none = loadShell({ storage: old, module: undefined, sleepBtn: null });
    assert.strictEqual(none.sleepToday(), 'good', 'no module: fallback');
});
