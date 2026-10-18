'use strict';
/* home-blooms-v2 (Oct 18, 2026): pure rules + source guards for the Fuel / Water / Move / Gap blooms on the eight-bubble Home.
   Browser check: tests/home-blooms-v2-live.cjs. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const core = require('../home-blooms-v2.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'home-blooms-v2.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'home-blooms-v2.css'), 'utf8');
const DAY = core.dayKey(new Date(2026, 9, 18, 15, 0).getTime());
const ts = (h, m) => new Date(2026, 9, 18, h, m || 0).getTime();

test('day key is the local YYYY-MM-DD the app uses for lowi_fast_v1.water', () => {
  assert.strictEqual(DAY, '2026-10-18');
});

test('Water Undo takes exactly one cup off today and never goes below 0', () => {
  assert.strictEqual(core.waterUndo({ water: { [DAY]: 0 } }, [], DAY), null);
  assert.strictEqual(core.waterUndo({}, [], DAY), null);
  assert.strictEqual(core.waterUndo(null, [], DAY), null);
  const r = core.waterUndo({ water: { [DAY]: 3, '2026-10-17': 5 } }, [], DAY);
  assert.strictEqual(r.f.water[DAY], 2);
  assert.strictEqual(r.f.water['2026-10-17'], 5, 'other days untouched');
  assert.strictEqual(r.cups, 2);
});

test('Water Undo does not mutate the stored object it was given', () => {
  const f = { water: { [DAY]: 2 }, waterEvents: { a: ts(9), b: ts(10) }, last: 123 };
  const copy = JSON.stringify(f);
  core.waterUndo(f, [], DAY);
  assert.strictEqual(JSON.stringify(f), copy);
});

test('Water Undo removes the newest water event of today only, keeps fasting fields', () => {
  const f = { water: { [DAY]: 2 }, waterEvents: { old: ts(9), newest: ts(14), yday: new Date(2026, 9, 17, 23).getTime() }, last: 42, hist: [{ s: 1, e: 2 }] };
  const r = core.waterUndo(f, [], DAY);
  assert.deepStrictEqual(Object.keys(r.f.waterEvents).sort(), ['old', 'yday']);
  assert.strictEqual(r.f.last, 42);
  assert.deepStrictEqual(r.f.hist, [{ s: 1, e: 2 }]);
});

test('Water Undo takes XP back only when today\'s water XP would be more than the cups (add/undo nets zero)', () => {
  const L = [
    { day: DAY, src: 'water', eventId: 'herb-care:' + DAY + ':water:a', ts: ts(9), amt: 2 },
    { day: DAY, src: 'water', eventId: 'herb-care:' + DAY + ':water:b', ts: ts(10), amt: 2 },
    { day: DAY, src: 'move:est', eventId: 'move:est:x', ts: ts(11), amt: 4 },
    { day: '2026-10-17', src: 'water', eventId: 'herb-care:2026-10-17:water:z', ts: ts(8), amt: 2 }
  ];
  /* 2 cups, 2 XP entries -> undo one cup -> newest XP entry goes */
  assert.deepStrictEqual(core.waterUndo({ water: { [DAY]: 2 } }, L, DAY).unaward, ['herb-care:' + DAY + ':water:b']);
  /* 9 cups but XP capped at 6 a day (2 entries here): cups stay above XP, nothing taken back */
  assert.deepStrictEqual(core.waterUndo({ water: { [DAY]: 9 } }, L, DAY).unaward, []);
  /* never touches another day or another source */
  const r = core.waterUndo({ water: { [DAY]: 1 } }, L, DAY);
  assert.deepStrictEqual(r.unaward, ['herb-care:' + DAY + ':water:b', 'herb-care:' + DAY + ':water:a']);
  assert.ok(!r.unaward.some(id => /move|2026-10-17/.test(id)));
});

test('Gap shows elapsed time since the last meal in plain words, no goal', () => {
  const now = ts(15, 30);
  assert.strictEqual(core.gapText(0, now), '');
  assert.strictEqual(core.gapText(now - 45 * 60e3, now), '45 m');
  assert.strictEqual(core.gapText(now - (3 * 60 + 12) * 60e3, now), '3 h 12 m');
  assert.strictEqual(core.gapText(now - 50 * 36e5, now), '2 d 2 h');
  assert.strictEqual(core.gapText(now + 60e3, now), '0 m', 'a start in the future never shows a negative');
});

const inside = (p, orb, vw, vh) => p.x - orb / 2 >= 0 && p.y - orb / 2 >= 0 && p.x + orb / 2 <= vw && p.y + orb / 2 <= vh;
const clearOf = (p, c, orb) => Math.hypot(p.x - c.x, p.y - c.y) >= c.r + orb / 2;
const apart = (pts, orb) => pts.every((p, i) => pts.every((q, j) => i >= j || Math.hypot(p.x - q.x, p.y - q.y) >= orb));

test('bloom fans outward, away from Misty, when there is room', () => {
  const m = { x: 195, y: 420, r: 80 }, b = { x: 195, y: 230, r: 40 };
  const L = core.layout(b, m, 4, 72, 390, 844);
  assert.strictEqual(L.pts.length, 4);
  L.pts.forEach(p => { assert.ok(p.y < b.y, 'orbs sit on the far side of the bubble from Misty'); assert.ok(clearOf(p, m, 72)); assert.ok(inside(p, 72, 390, 844)); });
  assert.ok(apart(L.pts, 72));
  assert.strictEqual(L.rot, 0);
});

test('phone ring: side bubbles at the screen edge turn the fan but never cover Misty or leave the screen', () => {
  const vw = 390, vh = 844, m = { x: 195, y: 430, r: 85 };
  const ring = { fuel: { x: 52, y: 300, r: 38 }, water: { x: 52, y: 430, r: 38 }, move: { x: 338, y: 300, r: 38 }, gap: { x: 338, y: 430, r: 38 }, low: { x: 52, y: 560, r: 38 } };
  for (const k in ring) for (const n of [2, 4]) {
    const L = core.layout(ring[k], m, n, 72, vw, vh);
    L.pts.forEach(p => { assert.ok(inside(p, 72, vw, vh), k + ' inside'); assert.ok(clearOf(p, m, 72), k + ' clear of Misty'); });
    assert.ok(apart(L.pts, 72), k + ' orbs do not overlap');
  }
});

test('iPad ring: every bubble around Misty gets a clean outward fan', () => {
  const vw = 1180, vh = 820, m = { x: 590, y: 410, r: 120 };
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 4, b = { x: 590 + Math.cos(a) * 260, y: 410 + Math.sin(a) * 260, r: 48 };
    const L = core.layout(b, m, 4, 84, vw, vh);
    L.pts.forEach(p => { assert.ok(inside(p, 84, vw, vh)); assert.ok(clearOf(p, m, 84)); assert.ok(Math.hypot(p.x - m.x, p.y - m.y) > Math.hypot(b.x - m.x, b.y - m.y) - 10, 'outward of the bubble'); });
    assert.ok(apart(L.pts, 84));
  }
});

test('labels are the plain words E-man asked for, no Again / Photo, no emoji anywhere', () => {
  for (const w of ["Today's step", "'Snack'", "'Swap'", "'Cook'", "'+1 cup'", "'Undo'", "'I just ate'", "'Ate earlier'", "'Quick'", "'Medium'", "'Long'", "'Epic'"]) assert.ok(src.includes(w), w);
  assert.doesNotMatch(src, /T\('Again'|T\('Photo'|label: *'Again'|label: *'Photo'/);
  assert.doesNotMatch(src + css, /\p{Extended_Pictographic}/u, 'no emoji: icons are drawn SVG');
});

test('every action calls an existing app API (no invented routes, no placeholder buttons)', () => {
  for (const call of ['LowiSpirit.showPick(', 'LowiSpirit.meal()', 'LowiStorePicks.open(', "setAttribute('data-act', 'sos')", "LowiHost.go('shelf')", 'LowiSpirit.water()', 'LowiVitalsBridge.unaward(', 'LowiMoveBubble.pick(', 'LowiMoveBubble.edit()', 'F.end(Date.now(), { chain: true })', 'F.open()'])
    assert.ok(src.includes(call), call);
  assert.doesNotMatch(src, /fetch\(|XMLHttpRequest|supabase|sendBeacon/i, 'no backend calls from the bloom');
  /* a missing module leaves its orb out rather than showing a dead button */
  assert.match(src, /if \(fn\(W\.LowiStorePicks, 'open'\)\) A\.push/);
  assert.match(src, /if \(fn\(W\.LowiMoveBubble, 'pick'\)/);
});

test('Gap bloom never adds a fasting goal or changes the fasting rules', () => {
  const gap = src.slice(src.indexOf("kind === 'gap'"), src.indexOf('return A;', src.indexOf("kind === 'gap'")));
  assert.doesNotMatch(gap, /goal|target|16 ?h|must|fast(ing)? ?goal/i);
  assert.doesNotMatch(src, /lowi_fast_v1['"]?, *JSON\.stringify\([^)]*last/, 'the bloom never writes the gap start itself');
});

test('one bloom at a time, idempotent mount, Misty is the outward origin', () => {
  assert.match(src, /if \(st\.open\) close\(true\);/);
  assert.match(src, /if \(st\.mounted\) \{ st\.root = want; return api; \}/);
  assert.match(src, /\[data-orbit="misty"\]/);
  assert.match(src, /getElementById\('spBubble'\)/);
  assert.match(src, /W\.addEventListener\('click', onClick, true\)/);
  assert.match(src, /e\.preventDefault\(\); e\.stopImmediatePropagation\(\);/);
});

test('stays out of files other tasks own', () => {
  assert.doesNotMatch(src, /LowiMoveBubble\.open\(|world-home|living-bubbles|misty-flight\.js/);
  assert.match(css, /\.hb2-orb \{/);
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /\.wm-orb|\.wm-bloom|#whHud|#spHome/, 'no restyling of other modules');
});
