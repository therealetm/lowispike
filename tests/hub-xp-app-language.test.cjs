'use strict';
/* 29 Oct 2026 bug hunt (Settings area): the XP under your name in the Community hub (community-me.js) used toLocaleString() with no
   locale, so it followed the phone's language, not the app's: a German app on an English phone said "2,400 XP" while Misty's card
   (companion.js nf) said "2.400". The hub now formats by the app language like Misty's card. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const M = require(path.join(ROOT, 'community-me.js'));

test('hub XP uses the app language for the thousands mark', () => {
    assert.strictEqual(typeof M.xpText, 'function');
    assert.strictEqual(M.xpText(2400, 'de'), (2400).toLocaleString('de-DE') + ' XP');
    assert.strictEqual(M.xpText(2400, 'de'), '2.400 XP');
    assert.strictEqual(M.xpText(2400, 'en'), '2,400 XP');
    assert.strictEqual(M.xpText(12500, 'es'), (12500).toLocaleString('es-ES') + ' XP');
    assert.strictEqual(M.xpText(80, 'de'), '80 XP');
});

test('the hub header no longer calls toLocaleString() without a locale', () => {
    const js = fs.readFileSync(path.join(ROOT, 'community-me.js'), 'utf8');
    assert.ok(!/\.toLocaleString\(\)/.test(js), 'no locale-less toLocaleString');
    assert.match(js, /xpText\(m\.xp, lang\(\)\)/);
});
