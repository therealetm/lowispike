'use strict';
/* Oct 16, 2026 speed pass (E-man: "the phone overheats ... make it extreme fast", and the split second of old rain / leaves on opening).
   Measured causes, see the commit: no-op class writes waking the MutationObservers every frame, the Profile card rebuilding itself
   ~6x a second, the 3D world drawing every refresh while nothing moves, old sky layers animating under the world. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('the class guard is the first script in <head>, before any app code runs', () => {
    const html = read('index.html');
    const g = html.indexOf('<script id="spdGuard">');
    assert.ok(g > 0, 'guard missing');
    assert.equal(html.indexOf('<script'), g, 'guard must be the first script');
    assert.ok(g < html.indexOf('</head>'));
});

function guardedList() {
    const html = read('index.html');
    const src = html.slice(html.indexOf('<script id="spdGuard">') + 22, html.indexOf('</script>', html.indexOf('<script id="spdGuard">')));
    const writes = [];
    class DOMTokenList {
        constructor() { this.s = []; }
        contains(t) { return this.s.includes(t); }
        add(...t) { t.forEach(x => { if (!x || /\s/.test(x)) throw new Error('bad token'); if (!this.s.includes(x)) this.s.push(x); }); writes.push('add'); }
        remove(...t) { this.s = this.s.filter(x => !t.includes(x)); writes.push('remove'); }
    }
    vm.runInNewContext(src, { DOMTokenList });
    return { l: new DOMTokenList(), writes };
}

test('guard: add/remove that change nothing write nothing; real changes and errors are unchanged', () => {
    const { l, writes } = guardedList();
    l.add('a'); assert.deepEqual(l.s, ['a']); assert.equal(writes.length, 1);
    l.add('a'); assert.equal(writes.length, 1, 'no-op add must not write');
    l.add('a', 'b'); assert.deepEqual(l.s, ['a', 'b']); assert.equal(writes.length, 2);
    l.remove('zz'); assert.equal(writes.length, 2, 'no-op remove must not write');
    l.remove('zz', 'a'); assert.deepEqual(l.s, ['b']); assert.equal(writes.length, 3);
    assert.throws(() => l.add(''), /bad token/);
});

test('old sky layers stay off while the 3D world runs; they still come back when it cannot (bw3-off)', () => {
    const html = read('index.html');
    assert.ok(html.includes('html:not(.bw3-off) :is(#atmSky,#wxSky,#ssnSky){display:none!important}'));
    assert.ok(read('body-world-3d.js').includes("H.classList.add('bw3-off')"), 'fallback class still set by the 3D world');
    assert.ok(html.includes('#main>.tab:not(.active),#main>.tab:not(.active) *{animation-play-state:paused!important}'));
});

test('Profile card signature ignores the numbered gradient ids, so it stops rebuilding itself', () => {
    const js = read('herb-start.js');
    const m = js.match(/const sig=h=>\{h=String\(h\)\.replace\((\/[^\n]*?\/g),'hs'\)/);
    assert.ok(m, 'sig normaliser');
    const re = eval(m[1]);
    const a = '<svg><radialGradient id="lh26"/><use fill="url(#lh26)"/><g id="lc5x3"/></svg>';
    const b = '<svg><radialGradient id="lh27"/><use fill="url(#lh27)"/><g id="lc6x3"/></svg>';
    assert.equal(a.replace(re, 'hs'), b.replace(re, 'hs'));
});

test('3D world: calm = every second refresh with time carried over; touch, flights, warp and gyro get every frame', () => {
    const js = read('body-world-3d-scene.js');
    const f = js.slice(js.indexOf('function frame(now)'), js.indexOf('function start()'));
    assert.ok(f.indexOf('frames.push(dt)') < f.indexOf('acc += dt'), 'the sharpness watcher sees every refresh');
    assert.ok(/step\(d\)/.test(f) && f.includes('Math.min(0.1, acc)'), 'skipped time is carried into the next drawn frame');
    const c = f.slice(f.indexOf('function calm(now)'));
    for (const k of ['now - lastIn < 2500', 'rig.fly', 'rig.vy', 'rig.gyT', 'gx-(in|out|hold)']) assert.ok(c.includes(k), k);
    for (const ev of ['pointerdown', 'touchmove', 'wheel']) assert.ok(f.includes("'" + ev + "'"), ev);
});
