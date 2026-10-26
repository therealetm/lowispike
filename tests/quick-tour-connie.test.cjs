'use strict';
/* Oct 27 2026 (MAYA-HANDOFF 0.38 swap): the Quick tour now plays the Connie promo (low-poly x clay, 63 s, Emmanuel approved the
   storyboard on 26 Oct). Swapped by editing only VIDEO at the top of quick-tour.js: same file names, seconds 63, version bumped
   so phones that played the old 45 s cut never get it from their HTTP cache. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Q = require('../quick-tour.js');
const file = f => fs.readFileSync(path.join(__dirname, '..', f));

/* width / height from the video track's tkhd (16.16 fixed point, last 8 bytes of the box) */
function videoSize(b) {
    let i = -1;
    while ((i = b.indexOf('tkhd', i + 1)) > 0) {
        const size = b.readUInt32BE(i - 4), end = i - 4 + size;
        const w = b.readUInt32BE(end - 8) / 65536, h = b.readUInt32BE(end - 4) / 65536;
        if (w > 0 && h > 0) return [w, h];
    }
    return [0, 0];
}

test('the Quick tour plays the 63-second Connie cut, not the old 45-second one', () => {
    assert.strictEqual(Q.VIDEO.seconds, 63, 'VIDEO.seconds');
    assert.strictEqual(Q.label('en'), 'Quick tour \u00b7 63 s');
    assert.strictEqual(Q.label('de'), 'Kurze Tour \u00b7 63 Sek.');
    assert.strictEqual(Q.label('es'), 'Tour r\u00e1pido \u00b7 63 s');
    assert.notStrictEqual(String(Q.VIDEO.version), '1', 'version bumped past the 45 s cut, so no phone replays it from cache');
    for (const l of Q.LANGS) assert.ok(Q.src(l).endsWith('?v=' + Q.VIDEO.version), l);
});

test('the web copy: vertical 720x1280, H.264 + AAC, faststart, under 4 MB', () => {
    const b = file(Q.VIDEO.src.en);
    assert.ok(b.length < 4 * 1024 * 1024, 'size ' + b.length);
    assert.deepStrictEqual(videoSize(b), [720, 1280]);
    assert.ok(b.indexOf('avc1') > 0, 'H.264');
    assert.ok(b.indexOf('mp4a') > 0, 'AAC sound');
    assert.ok(b.indexOf('moov') < b.indexOf('mdat'), 'faststart');
    const p = file(Q.VIDEO.poster);
    assert.ok(p[0] === 0xff && p[1] === 0xd8, 'poster is a jpg');
    assert.ok(p.length < 80 * 1024, 'small poster');
});
