'use strict';
/* Nov 5 2026, Still galaxy wiring: loaded before the 3D world, the world never built while a still view is saved, the picture taken
   before anything is released, release that hands memory back and removes the canvas, the Settings row, the offline cache, and the
   water bubble that stops its loop once settled. Browser check: node tools/galaxy-still/flow.cjs */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('galaxy-still loads in <head> before the 3D world, and is in the offline cache', () => {
    const html = read('index.html'), head = html.slice(0, html.indexOf('</head>'));
    for (const f of ['galaxy-still.css', 'galaxy-still-core.js', 'galaxy-still.js']) assert.ok(head.includes(f + '?v='), f + ' in <head>');
    assert.ok(head.indexOf('galaxy-still-core.js') < head.indexOf('galaxy-still.js'));
    const w3 = html.indexOf('<script type="module" src="body-world-3d.js') >= 0 ? html.indexOf('<script type="module" src="body-world-3d.js') : html.indexOf('body-world-3d.js?v=', html.indexOf('</head>') - 1);
    assert.ok(html.indexOf('galaxy-still.js?v=') < (w3 < 0 ? Infinity : w3));
    const sw = read('sw.js');
    for (const f of ['galaxy-still.css', 'galaxy-still-core.js', 'galaxy-still.js']) assert.ok(sw.includes('"' + f + '"'), 'sw.js ' + f);
});

test('body-world-3d: no world at launch while a still view is saved; stillShot copies first; release lets everything go', () => {
    const js = read('body-world-3d.js');
    const boot = js.slice(js.indexOf('function boot()'), js.indexOf('function boot()') + 600);
    assert.match(boot, /worldAtLaunch\(\) === 'off'[\s\S]{0,120}api\.state = 'fallback'[\s\S]{0,80}return;/, 'boot returns before any env / load');
    const shot = js.slice(js.indexOf('api.stillShot'), js.indexOf('api.release = '));
    assert.match(shot, /renderOnce\(\)[\s\S]{0,600}drawImage\(canvas/, 'one fresh frame, copied in the same moment');
    assert.match(shot, /finally[\s\S]{0,80}visible = true/, 'companion sprites shown again whatever happens');
    const fail = js.slice(js.indexOf('function fail('), js.indexOf('function fail(') + 1500);
    assert.match(fail, /world\.dispose\(true\)/);
    assert.match(fail, /canvas\.remove\(\)/);
    assert.match(fail, /back\.remove\(\)/);
    assert.match(fail, /io\.disconnect\(\)/);
});

test('scene dispose(true): listeners off, every resource disposed, context given up; dispose() unchanged', () => {
    const js = read('body-world-3d-scene.js');
    const d = js.slice(js.indexOf('function dispose(deep)'), js.indexOf('function dispose(deep)') + 900);
    assert.match(d, /if \(!deep\) \{ renderer\.dispose\(\); return null; \}/);
    assert.match(d, /removeEventListener\(ev, markIn, \{ capture: true \}\)/);
    assert.match(d, /disposeAll\(scene\)/);
    assert.match(d, /renderLists\.dispose\(\)/);
    assert.match(d, /forceContextLoss\(\)/);
});

test('galaxy-still.js: picture before release, storage failures told truthfully, one framing launch only', () => {
    const js = read('galaxy-still.js');
    const save = js.slice(js.indexOf('function save()'), js.indexOf('/* ---------- turning it off'));
    assert.ok(save.indexOf('stillShot') < save.indexOf("release('still')"), 'the picture is taken before the world is released');
    assert.ok(save.indexOf('paint(url') < save.indexOf("release('still')"), 'the picture is on screen before the world goes');
    assert.match(save, /blank\(shot\.canvas\)[\s\S]{0,120}toast\(C\.t\(l, 'fail'\)\)/, 'an empty picture saves nothing and says so');
    assert.match(save, /C\.storedAs\(idbOk, thumbOk\)/);
    assert.match(save, /C\.savedText\(rec\.pic, l\)/);
    assert.match(js, /if \(framingLaunch\) del\(ss, C\.FRAME_KEY\)/, 'the framing launch flag is spent at once (a crash keeps the still background)');
    assert.doesNotMatch(js, /Misty|Maya/, 'no companion name hard-coded');
    assert.doesNotMatch(js, /navigator\.share|download\s*=/, 'a saved background, not a screenshot export');
});

test('Settings: Still galaxy row under Day/night, a switch with its state, offered only where the moving galaxy runs or is saved', () => {
    const js = read('community-me.js');
    assert.match(js, /ids: \['sky', 'galaxyStill',/); /* Nov 5 2026 (test changed, why): the look row 'sky' replaced 'theme' */
    assert.match(js, /id === 'galaxyStill'\) \{ const G = root\.LowiGalaxyStill[\s\S]{0,200}role="switch"/);
    assert.match(js, /if \(id === 'galaxyStill'\) \{ try \{ const G = root\.LowiGalaxyStill; return !!\(G && typeof G\.available === 'function' && G\.available\(\)\)/);
    assert.match(js, /if \(id === 'galaxyStill'\) \{ try \{ root\.LowiGalaxyStill\.tap\(/);
    assert.ok(/galaxyStill: '</.test(js), 'has its icon');
});

test('the water bubble stops its loop once settled while the still galaxy is on, and wakes once a second', () => {
    const js = read('fast-bubble.js');
    assert.match(js, /if \(calm && window\.LowiGalaxyStill && window\.LowiGalaxyStill\.on\(\) && window\.LowiWorld3D && window\.LowiWorld3D\.state === 'fallback'\) \{ b\.last = 0; clearTimeout\(b\.idle\); b\.idle = setTimeout\(kick, 1000\); return; \}/);
});

test('framing bar: Save in the corner, 44pt buttons, solid under Reduce Transparency and battery saver', () => {
    const css = read('galaxy-still.css');
    assert.match(css, /\.gs-btn \{[^}]*min-height: 44px/);
    assert.match(css, /prefers-reduced-transparency: reduce\) \{ \.gs-bar \{ background: #111; -webkit-backdrop-filter: none; backdrop-filter: none; \}/);
    assert.match(css, /html\.lowi-saver \.gs-bar/);
    assert.doesNotMatch(css, /@keyframes|animation:/, 'the still background has no animation');
    const js = read('galaxy-still.js');
    assert.ok(js.indexOf('gs-cancel') < js.indexOf('gs-hint') && js.indexOf('gs-hint') < js.indexOf('class="gs-btn gs-save'), 'Cancel, hint, Save (corner)');
});
