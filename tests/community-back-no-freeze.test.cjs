'use strict';
/* Oct 23 2026, Emmanuel: "Every time I leave the community to go back to the home page with the back button, the whole thing
   freezes, then I can't do anything. It's stuck on like a frozen page."
   Root cause: the Ranking, Creation and Affiliates tabs put html.rm-view on, and body-world-3d.js renders no world frame while it
   is on (the tab covers the screen). Leaving Community left it on behind Home (community-rooms-ui.js repaints every 1.5 s and
   added it back too), so Home's world and everything riding its frames stopped: Home froze on the last zoomed-out Community frame.
   Checks: the render guard runs world frames on Home even with a stale rm-view / cr-room, still pauses them while Community is
   open, and community-rooms-ui.js drops rm-view on the way out and only sets it while Community is the open page. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function guard(clsList, communityActive) {
    const src = read('body-world-3d.js');
    const a = src.indexOf('    function communityOn() {');
    const b = src.indexOf('    function syncGlow() {', a);
    assert.ok(a > 0 && b > a, 'found communityOn + shouldRender');
    const cls = new Set(clsList);
    const H = { classList: { contains: c => cls.has(c) } };
    const spHome = { offsetParent: {} }, stage = { isConnected: true };
    const D = { hidden: false, getElementById: id => id === 'tab-foryou' ? { classList: { contains: c => c === 'active' && communityActive } } : id === 'spHome' ? spHome : null, querySelector: () => null };
    const fn = new Function('H', 'D', 'mode', 'full', 'back', 'visibleHome', 'stage', src.slice(a, b) + '\nreturn shouldRender();');
    return fn(H, D, 'home', null, null, true, stage);
}

test('Home keeps drawing the world when a Community flag was left behind', () => {
    assert.equal(guard(['wh-on', 'wh-world-live'], false), true, 'plain Home renders');
    assert.equal(guard(['wh-on', 'wh-world-live', 'rm-view'], false), true, 'stale rm-view (Ranking / Creation / Affiliates) does not freeze Home');
    assert.equal(guard(['wh-on', 'wh-world-live', 'cr-room'], false), true, 'stale cr-room (chat) does not freeze Home');
});

test('the world still pauses behind a full-screen Community tab', () => {
    assert.equal(guard(['wh-on', 'rm-view'], true), false, 'Ranking / Creation / Affiliates open: no world frames behind it');
    assert.equal(guard(['wh-on', 'cr-room'], true), false, 'chat room open: no world frames behind it');
});

test('community-rooms-ui.js never leaves html.rm-view on behind Home', () => {
    const src = read('community-rooms-ui.js');
    const leave = src.indexOf('if(cls&&pageOn&&!on){');
    assert.ok(leave > 0, 'found the leave-Community branch');
    const end = src.indexOf('pageOn=on;', leave);
    assert.ok(/classList\.remove\('rm-view'\)/.test(src.slice(leave, end)), 'leaving Community drops rm-view');
    assert.ok(!/classList\.add\('rm-view'\)/.test(src), 'rm-view is never added unconditionally (paint runs every 1.5 s, also behind Home)');
    assert.ok(/classList\.toggle\('rm-view',pageActive\(\)\)/.test(src), 'rm-view is only on while Community is the open page');
});
