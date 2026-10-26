'use strict';
/* Oct 26 2026 (Emmanuel): the promo video is being remade in a new style, and the new cut replaces this one in the Quick tour.
   So the video lives in ONE place: VIDEO at the top of quick-tour.js (file per language, poster, length in seconds, version).
   Swapping it = drop the new mp4 + poster into media/, change that one object. Everything else follows from it:
   the pill / Settings labels ("Quick tour · 45 s"), the sheet title, the cache-buster on the URL (so phones never replay the
   old cut from their HTTP cache), and this test checks the file really is as long as VIDEO.seconds says.
   The tour card text names no length, so a new cut never needs new voice recordings. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const Q = require('../quick-tour.js');

/* the mp4's own length: mvhd timescale + duration (version 0 or 1) */
function mp4Seconds(file) {
    const b = fs.readFileSync(path.join(__dirname, '..', file)), i = b.indexOf('mvhd');
    assert.ok(i > 0, file + ' has an mvhd box');
    const v = b[i + 4];
    if (v === 1) return Number(b.readBigUInt64BE(i + 4 + 4 + 16 + 4)) / b.readUInt32BE(i + 4 + 4 + 16);
    return b.readUInt32BE(i + 4 + 4 + 8 + 4) / b.readUInt32BE(i + 4 + 4 + 8);
}

test('one place: VIDEO holds the file per language, the poster, the length and a version', () => {
    assert.ok(Q.VIDEO && typeof Q.VIDEO === 'object', 'quick-tour.js exports VIDEO');
    assert.ok(Q.VIDEO.src && Q.VIDEO.src.en, 'an English file (every language falls back to it)');
    assert.ok(Number.isInteger(Q.VIDEO.seconds) && Q.VIDEO.seconds > 5 && Q.VIDEO.seconds <= 90, 'length in whole seconds');
    assert.match(String(Q.VIDEO.version), /^[\w.-]+$/, 'a version for the cache-buster');
    assert.strictEqual(Q.SRC, Q.VIDEO.src, 'SRC is VIDEO.src (no second copy)');
    assert.strictEqual(Q.POSTER, Q.VIDEO.poster, 'POSTER is VIDEO.poster');
    const js = read('quick-tour.js');
    assert.strictEqual((js.match(/media\/quick-tour[\w-]*\.(mp4|jpg)/g) || []).length, Object.keys(Q.VIDEO.src).length + 1, 'the paths are written only in VIDEO');
});

test('the labels and the title follow VIDEO.seconds in English, German and Spanish', () => {
    const s = Q.VIDEO.seconds;
    assert.strictEqual(Q.label('en'), 'Quick tour \u00b7 ' + s + ' s');
    assert.strictEqual(Q.label('de'), 'Kurze Tour \u00b7 ' + s + ' Sek.');
    assert.strictEqual(Q.label('es'), 'Tour r\u00e1pido \u00b7 ' + s + ' s');
    assert.ok(Q.tx('title', 'de').includes(String(s)), 'German title names the length');
    for (const l of Q.LANGS) assert.ok(!/\{s\}/.test(Q.label(l) + Q.tx('title', l)), 'no placeholder left in ' + l);
});

test('the URL carries the version, so a new cut is never served from an old cache', () => {
    for (const l of Q.LANGS) assert.strictEqual(Q.src(l), (Q.VIDEO.src[l] || Q.VIDEO.src.en) + '?v=' + Q.VIDEO.version, l);
    assert.ok(read('quick-tour.js').includes("poster=\"' + esc(posterUrl()) + '\""), 'the poster carries it too');
});

test('every video file is as long as VIDEO.seconds says (within a second)', () => {
    for (const f of new Set(Object.values(Q.VIDEO.src))) {
        const d = mp4Seconds(f);
        assert.ok(Math.abs(d - Q.VIDEO.seconds) <= 1, f + ' is ' + d.toFixed(2) + ' s, VIDEO.seconds is ' + Q.VIDEO.seconds);
    }
});

test('the tour card names no length, so a new cut needs no new voice recordings', () => {
    const S = require('../tutorial-steps.js');
    const card = (S.STEPS || []).find(x => x.id === 'new-quick-tour');
    assert.ok(card, 'the card exists');
    for (const l of Q.LANGS) assert.ok(!/\d+\s*(seconds|Sekunden|segundos|s\b|Sek)/.test(card.text[l]), 'no length in the ' + l + ' card text: ' + card.text[l]);
});
