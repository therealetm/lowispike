'use strict';
/* Oct 26 2026 (MAYA-HANDOFF 0.38, Emmanuel): "use the same video as a quick tour on the onboarding page".
   quick-tour.js plays the 45-second promo video: a pill on the first onboarding screen, a Settings row next to Tutorial,
   muted first with Tap for sound, Skip any time, lazy (nothing downloads before it opens), never cached by the service worker,
   EN / DE / ES labels. The browser proof is tests/quick-tour-live.cjs (WebKit iPhone 13 + iPad, Chromium). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const exists = f => fs.existsSync(path.join(__dirname, '..', f));
const LANGS = ['en', 'de', 'es'];

test('core: labels in English, German and Spanish, real translations, an English video for every language', () => {
    assert.ok(exists('quick-tour.js'), 'quick-tour.js exists');
    const Q = require('../quick-tour.js');
    for (const l of LANGS) for (const k of ['open', 'len', 'title', 'sound', 'mute', 'skip', 'replay', 'done']) assert.ok(Q.TX[l][k] && Q.TX[l][k].trim(), l + '.' + k);
    for (const k of ['open', 'sound', 'skip']) { assert.notStrictEqual(Q.TX.de[k], Q.TX.en[k], 'de ' + k); assert.notStrictEqual(Q.TX.es[k], Q.TX.en[k], 'es ' + k); }
    assert.strictEqual(Q.label('en'), 'Quick tour \u00b7 45 s');
    assert.strictEqual(Q.label('de'), 'Kurze Tour \u00b7 45 Sek.');
    /* Oct 26 2026: the URL now carries VIDEO.version as a cache-buster (tests/quick-tour-swap.test.cjs), so the path is checked on SRC */
    for (const l of LANGS) assert.match(Q.src(l), /^media\/quick-tour-[a-z]{2}\.mp4\?v=[\w.-]+$/, 'video for ' + l);
    for (const f of Object.values(Q.SRC)) assert.match(f, /^media\/quick-tour-[a-z]{2}\.mp4$/, f);
    assert.strictEqual(Q.src('fr'), Q.src('en'), 'unknown language falls back to English');
});

test('the video: a real web-sized H.264 file and a poster, 45 seconds, under 4 MB, faststart (moov before mdat)', () => {
    const Q = require('../quick-tour.js');
    const files = new Set(Object.values(Q.SRC));
    for (const f of files) {
        assert.ok(exists(f), f + ' is in the repo');
        const b = fs.readFileSync(path.join(__dirname, '..', f));
        assert.ok(b.length > 500 * 1024 && b.length < 4 * 1024 * 1024, f + ' size ' + b.length);
        assert.strictEqual(b.toString('latin1', 4, 8), 'ftyp', 'an mp4');
        const moov = b.indexOf('moov'), mdat = b.indexOf('mdat');
        assert.ok(moov > 0 && mdat > 0 && moov < mdat, 'faststart: plays while it downloads');
        assert.ok(b.indexOf('avc1') > 0, 'H.264 (plays in Safari)');
    }
    assert.ok(exists(Q.POSTER), 'poster');
    assert.ok(fs.statSync(path.join(__dirname, '..', Q.POSTER)).size < 80 * 1024, 'small poster');
});

test('the sheet: muted + inline + autoplay with no preload, the src set only when it opens, Tap for sound, Skip, Escape, freed on close', () => {
    const js = read('quick-tour.js');
    assert.match(js, /<video class="qt-vid" playsinline webkit-playsinline muted autoplay preload="none"/);
    assert.ok(!/<video[^>]*\ssrc=/.test(js), 'no src in the markup (lazy)');
    assert.match(js, /vid\.src = src\(l\);/, 'src only in open()');
    assert.match(js, /vid\.muted = true; vid\.defaultMuted = true;/);
    assert.match(js, /data-qt="sound"/); assert.match(js, /data-qt="skip"/);
    assert.match(js, /role', 'dialog'\); el\.setAttribute\('aria-modal', 'true'\)/, 'a dialog, so back-swipe.js sends it Escape');
    assert.match(js, /e\.key === 'Escape'/);
    assert.match(js, /v\.pause\(\); \} catch \(e\) \{ \} v\.removeAttribute\('src'\)/, 'closing stops the sound and frees the video');
    assert.match(js, /visibilitychange/, 'pauses when the app goes to the background');
    const css = read('quick-tour.css');
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.match(css, /min-height: 44px/, '44 pt tap targets');
    assert.match(css, /aspect-ratio: 9 \/ 16/);
});

test('onboarding: the first screen has the Quick tour pill, only there', () => {
    const js = read('herb-start.js');
    assert.match(js, /function qtPill\(\)\{const Q=window\.LowiQuickTour;return Q&&Q\.label\?'<button type="button" class="hs-qt" data-qt="open">/);
    assert.strictEqual((js.match(/qtPill\(\)/g) || []).length, 2, 'defined once, used once');
    assert.match(js, /if\(step===0\)body=.*\+habits\(\)\+qtPill\(\)\+/, 'on step 0');
});

test('Settings: no separate Quick tour row any more (Oct 28 2026 slim structure: one optional guide = Tutorial); the route stays for the first-start pill', () => {
    const SS = require('../home-settings-sleep-v2.js');
    const ids = SS.SETTINGS_IDS;
    assert.ok(ids.includes('tutorial'), 'Tutorial is the one guide');
    assert.strictEqual(ids.indexOf('quickTour'), -1, 'no second tour row');
    for (const l of LANGS) assert.ok(SS.TX[l].quickTour, 'label ' + l);
    const src = read('home-settings-sleep-v2.js');
    assert.match(src, /quickTour: \{ has: \(\) => !!\(root\.LowiQuickTour && fn\(root\.LowiQuickTour, 'open'\)\), run: \(\) => root\.LowiQuickTour\.open\(\) \}/);
});

test('wiring: loaded right before herb-start.js, CSS once with the build id, precached, the mp4 never touched by the service worker', () => {
    const ui = read('apple-ui.js');
    assert.ok(ui.indexOf("'quick-tour.js'") > 0 && ui.indexOf("'quick-tour.js'") < ui.indexOf("'herb-start.js'"), 'loads before the onboarding draws its pill');
    const html = read('index.html'), build = JSON.parse(read('version.json')).build;
    assert.strictEqual((html.match(new RegExp('href="quick-tour\\.css\\?v=' + build + '"', 'g')) || []).length, 1);
    const sw = read('sw.js');
    assert.match(sw, /STATIC\.push\("quick-tour\.js", "quick-tour\.css"\);/);
    assert.match(sw, /if \(\/\\\.\(mp4\|m4v\|webm\|mov\)\$\/i\.test\(url\.pathname\)\) return;/);
    assert.ok(sw.indexOf('mp4|m4v') < sw.indexOf('e.respondWith'), 'before any respondWith');
    assert.ok(!/\.mp4"/.test(sw.match(/const STATIC = (\[[^\]]*\])/)[1]), 'no video in the precache list');
});

test('tutorial: a new-quick-tour card in three languages, and Settings covers the row', () => {
    const S = require('../tutorial-steps.js');
    const st = S.STEPS.find(s => s.id === 'new-quick-tour');
    assert.ok(st && st.area === 'new', 'step in part new');
    assert.ok(S.covered().quickTour, 'quickTour covered');
    for (const l of LANGS) assert.ok(st.text[l].length <= 140);
});
