'use strict';
/* Oct 25, 2026 (readability + fit, part 3): the Playwright readability pass over every screen, phone size, language and theme. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const G = require('../community-galaxy.js');

test('the Playwright readability pass covers every screen, phone size, language and theme the brief names', () => {
  const A = require('../tools/readfit/audit.cjs');
  for (const s of ['se', '13', 'max', 'android', 'ipad']) assert.ok(A.SIZES[s], 'size ' + s);
  assert.deepEqual([A.SIZES.se.w, A.SIZES.se.h, A.SIZES['13'].w, A.SIZES['13'].h, A.SIZES.max.w, A.SIZES.max.h, A.SIZES.android.w, A.SIZES.android.h, A.SIZES.ipad.w, A.SIZES.ipad.h], [375, 667, 390, 844, 430, 932, 360, 780, 820, 1180]);
  for (const s of ['home', 'fuel', 'water', 'move', 'gap', 'sleep', 'settings', 'cook', 'shop', 'room', 'chat', 'ranking', 'foryou', 'studio', 'profile', 'tutorial', 'news']) assert.ok(A.SCREENS[s], 'screen ' + s);
  const live = read('tests/readability-fit-live.cjs');
  for (const l of ['de', 'en', 'es']) assert.match(live, new RegExp("'" + l + "'"));
  assert.match(live, /webkit/); assert.match(live, /chromium/); assert.match(live, /1\.25/);
  assert.ok(A.ALLOW.length <= 6, 'exceptions stay few: ' + A.ALLOW.length);
});

/* runs the real pass when Playwright is installed on this computer (it is not on GitHub's runner, where the maths above run) */
let pw = null; try { pw = require.resolve(process.env.PW || '/tmp/pw/node_modules/playwright'); } catch (e) { pw = null; }
test('Playwright readability pass: Room and Chat on iPhone SE and iPhone 15 Pro Max, German, dark and day', { skip: !pw || process.env.RF_SKIP_BROWSER === '1' ? 'Playwright not installed here' : false, timeout: 600000 }, () => {
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/readfit/audit.cjs'), '--sizes', 'se,max', '--langs', 'de', '--themes', 'dark,light', '--screens', 'room,chat', '--out', '/tmp/readfit/unit'], { encoding: 'utf8', timeout: 580000 });
  assert.equal(r.status, 0, (r.stdout || '').split('\n').filter(l => /problems|^   /.test(l)).slice(0, 40).join('\n') + (r.stderr || '').slice(0, 400));
});

