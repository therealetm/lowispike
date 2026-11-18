'use strict';
/* 18 Nov 2026 (Emmanuel, late evening: "I don't like the new update ... set it back to what the people in my community already
   knew before you made any changes"). The v9 redesign (builds 20261118-131906 to -141939) is rolled back to the app of
   build 20261112-060325. These guards keep every piece of it out until he asks for a redesign again. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');

test('no v9 world files in the app', () => { assert.ok(!fs.existsSync(path.join(root, 'v9-world.js'))); assert.ok(!fs.existsSync(path.join(root, 'v9-world.css'))); });
test('index.html loads no v9 world script', () => assert.doesNotMatch(html, /v9-world\.js/));
test('index.html loads no v9 world stylesheet', () => assert.doesNotMatch(html, /v9-world\.css/));
test('the service worker keeps no v9 files', () => assert.doesNotMatch(read('sw.js'), /v9-world/));
test('Home bubble taps are not taken over by a world (no LowiV9)', () => { for (const f of ['home-orbit-v2.js', 'home-blooms-v2.js', 'index.html']) assert.doesNotMatch(read(f), /LowiV9/); });
test('the bottom button keeps its old faces (no Home house icon from v9)', () => assert.doesNotMatch(read('bottom-close.js'), /v9 redesign/));
test('the Ranking keeps its chip row as before', () => assert.match(read('ranking.js'), /class="rk-chips"/));
test('the Ranking has no v9 "How it works" line', () => assert.doesNotMatch(read('ranking.js'), /rk-how-l/));
test('the VS view keeps its period and Level rows (no v9 cut)', () => assert.doesNotMatch(read('ranking.js'), /v9 redesign/));
test('the Baskets door is back in Shop', () => assert.doesNotMatch(read('store-picks.js'), /BASKETS_OFF/));
test('the snack shelf scan button keeps its old look', () => assert.doesNotMatch(read('snack-shelf.css'), /v9/));
test('the Supermarket opens on the game market as before', () => { const C = require('../market-game-core.js'); assert.strictEqual(C.mode(null), 'game'); });
test('the game button says Back to the market again', () => assert.match(read('market-game-core.js'), /'Back to the market'/));
test('no v9 gesture exemption left in the tutorial', () => assert.doesNotMatch(read('tutorial-steps.js'), /v9-world\.js/));
