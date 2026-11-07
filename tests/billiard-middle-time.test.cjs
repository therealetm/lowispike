'use strict';
/* Nov 7 2026 (Emmanuel: "in the billiard room ... how many minutes someone has been in the billiard middle next to the name when it
   says middle and their name ... so that we know, oh wow, they've been this many minutes or hours in the middle and gathered this
   many points"). Next to "Mitte: Name" on the table and under the name on the scoreboard: how long that ball has rested in the middle
   and what that hold has earned (MID_XP per full hour, at most MID_CAP hours, the same rule as the real payout). The time comes from
   when the ball came to rest: its row's updated_at in public.companion_rest, or the end of a shot seen on this phone.
   Browser walk (scratch, Chromium, local site, network blocked, a stand-in database): Ana resting in the middle for 70 minutes shows
   "Mitte: Ana · 1 Std 10 Min · +10 XP" on the table and "Ana / 1 Std 10 Min · +10 XP" on the scoreboard. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../room-table-core.js');
const js = fs.readFileSync(path.join(__dirname, '..', 'room-table.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'room-table.css'), 'utf8');

test('the points a hold has made: +10 for each full hour, at most 8 hours', () => {
    const H = C.T.HOUR;
    assert.equal(C.midPoints(0), 0);
    assert.equal(C.midPoints(59 * 60000), 0, 'not a full hour yet');
    assert.equal(C.midPoints(H), C.T.MID_XP);
    assert.equal(C.midPoints(2.5 * H), 2 * C.T.MID_XP);
    assert.equal(C.midPoints(30 * H), C.T.MID_CAP * C.T.MID_XP, 'the daily cap');
    assert.equal(C.midPoints(-5), 0); assert.equal(C.midPoints(NaN), 0);
});

test('the time in the middle: since the ball came to rest there', () => {
    assert.match(js, /\{const ra=Date\.parse\(x\.updated_at\|\|''\);if\(isFinite\(ra\)&&!\(\(hold\.get\(x\.user_id\)\|\|0\)>t\)\)restAt\.set\(x\.user_id,ra\);\}/, 'from the row');
    assert.match(js, /for\(const r of res\.moved\)restAt\.set\(r\[0\],sn\);\}   \/\* a moved ball starts resting again \*\//, 'your own shot');
    assert.match(js, /for\(const r of end\)\{const q=was\[r\[0\]\];if\(!q\|\|Math\.abs\(q\[1\]-r\[1\]\)>1\|\|Math\.abs\(q\[2\]-r\[2\]\)>1\)restAt\.set\(r\[0\],sn\);\}/, 'someone else\'s shot: only the balls it moved');
    assert.match(js, /function heldFor\(uid\)\{const t=restAt\.get\(uid\),now=isFinite\(srvNow\(\)\)\?srvNow\(\):Date\.now\(\);return t&&isFinite\(t\)&&now>=t\?now-t:NaN;\}/, 'the server clock when it is known');
});

test('shown next to the name on the table and under it on the scoreboard, in three languages', () => {
    for (const w of ["midOtherFor:['Middle: {n} · {t} · +{x} XP','Mitte: {n} · {t} · +{x} XP','Centro: {n} · {t} · +{x} XP']", "sbHeld:['{t} · +{x} XP','{t} · +{x} XP','{t} · +{x} XP']"]) assert.ok(js.includes(w), w);
    assert.match(js, /else if\(mh\)\{const hf=heldFor\(mh\);t=isFinite\(hf\)\?tr\('midOtherFor',nameOf\(mh\)\|\|tr\('someone'\),\{t:dur\(hf\),x:C\.midPoints\(hf\)\}\):tr\('midOther',nameOf\(mh\)\|\|tr\('someone'\)\);\}/);
    assert.match(js, /if\(held&&mh!==me\)\{if\(!h\)\{h=D\.createElement\('small'\);h\.className='rt-vt';mv\.appendChild\(h\);\}h\.textContent=held;\}else if\(h\)h\.remove\(\);/, 'its own line: a long name never cuts the time');
    assert.match(css, /\.rt-r-mid \.rt-v \.rt-vt\{display:block;[^}]*white-space:nowrap\}/);
});
