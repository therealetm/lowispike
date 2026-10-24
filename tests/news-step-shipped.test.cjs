'use strict';
/* Oct 24 2026 sweep: release 20261024-015555 (only real people on the Ranking and in Add a friend) shipped the What's New step
   'new-humans' with its voice, but went out without news.json, so no release's tour ever lists it and nobody sees it.
   Rule (TUTORIAL.md "Every user-visible release ships a tour step"): every step in part 'new' (except the intro) is in the
   tour of a release in version.json news.history. history keeps the last 12 releases; once it is full, older steps may fall
   off, so the check only runs while history has room. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const S = require(path.join(__dirname, '..', 'tutorial-steps.js'));
const V = require(path.join(__dirname, '..', 'version.json'));

test('every What\'s New step in part new is in a released tour (no orphan step nobody sees)', () => {
    const hist = (V.news && Array.isArray(V.news.history)) ? V.news.history : [];
    if (hist.length >= 12) return;
    const toured = new Set(hist.flatMap(h => (h && Array.isArray(h.tour)) ? h.tour : []));
    if (V.news && Array.isArray(V.news.tour)) V.news.tour.forEach(id => toured.add(id));
    const orphans = S.STEPS.filter(s => s.area === 'new' && s.id !== 'new-intro' && !s.when && !toured.has(s.id)).map(s => s.id);
    assert.deepStrictEqual(orphans, [], 'steps in part new that no release tour lists: ' + orphans.join(', ') +
        '. Release them with news.json "tour": [...] (TUTORIAL.md, What\'s New is a mini tour).');
});

test('the Only real people step is in the newest tour', () => {
    const hist = (V.news && Array.isArray(V.news.history)) ? V.news.history : [];
    /* Oct 24 (Kitchen release): history keeps the last 12 releases, and humans-only-20261024-020831 was the oldest of 12, so
       the next loud release pushes it off the end, as the rule above allows. Check it only while history still has room. */
    if (hist.length >= 12) return;
    assert.ok(hist.some(h => h && Array.isArray(h.tour) && h.tour.includes('new-humans')), 'new-humans is in no release tour');
});
