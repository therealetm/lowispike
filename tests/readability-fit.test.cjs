'use strict';
/* Oct 25, 2026 (Emmanuel, iPhone 15 Pro Max screenshots of the Room: "Down below you can see that there is text. When I select
   it I can kind of read it ... Very important that you check that everything is readable and not off the phone. On every phone,
   it should be readable and formatted accordingly.")
   1. The Room view is measured for real when it opens: the old "keep the first size" rule kept a taller first measurement, so on
      iPhone SE / small Android the bottom row (You, Emmy) sat below the Room and behind the Friends tree button.
   2. The Room's fit keeps every companion and name clear of the Friends tree button as well as the energy pad.
   3. The composer hint and the 0/600 counter: readable size and colour, may wrap to two lines, never under the home indicator.
   4. tools/readfit: the audit's maths (WCAG contrast, the PNG reader, the problem finder) and the Playwright pass itself. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const G = require('../community-galaxy.js');

/* ---------- 1. the Room's view size ---------- */
test('Room view: a size measured while the Room is still laying out is replaced by the real one', () => {
  assert.equal(typeof G.mapViewSize, 'function', 'community-galaxy.js exports mapViewSize(prev, w, h, typing, now)');
  let v = G.mapViewSize(null, 337, 400, false, 1000);
  assert.equal(v.h, 400);
  v = G.mapViewSize(v, 337, 295, false, 1600); /* the composer and the bar finished laying out: 105 px shorter */
  assert.equal(v.h, 295, 'the fit uses the Room as it really is, not the first, taller measurement');
  assert.equal(v.hb, 295);
});

test('Room view: once settled, typing (keyboard up) still never slides the pins', () => {
  let v = G.mapViewSize(null, 390, 480, false, 0);
  v = G.mapViewSize(v, 390, 480, false, 5000);
  const typed = G.mapViewSize(v, 390, 230, true, 6000);
  assert.equal(typed.h, 480, 'keyboard up: the camera keeps its size');
  assert.equal(typed.hb, 230, 'but knows what is visible');
});

test('Room view: a shrink that is not the keyboard and not a small chip row is taken (no row left below the Room)', () => {
  let v = G.mapViewSize(null, 375, 420, false, 0);
  v = G.mapViewSize(v, 375, 420, false, 9000);
  const chip = G.mapViewSize(v, 375, 384, false, 9500);
  assert.equal(chip.h, 420, 'a 36 px chip row (To: name) keeps the pins still');
  const big = G.mapViewSize(v, 375, 300, false, 9600);
  assert.equal(big.h, 300, 'a 120 px shrink without the keyboard is a real new size');
  const grow = G.mapViewSize(v, 375, 460, false, 9700);
  assert.equal(grow.h, 460);
});

test('community-chat.js mapView uses G.mapViewSize (no private freeze rule left)', () => {
  const src = read('community-chat.js');
  const mv = src.slice(src.indexOf('function mapView('), src.indexOf('function fitCam('));
  assert.match(mv, /G\.mapViewSize\(/);
  assert.doesNotMatch(mv, /camFrozen\.h-h>160/);
});

/* ---------- 2. the fit avoids the Friends tree button too ---------- */
function people(n, view) {
  const m = [];
  for (let i = 1; i < n; i++) m.push({ uid: 'u' + i, j: Date.UTC(2026, 9, 1 + i) });
  return G.mapLayout(m, 'me', { meJ: Date.UTC(2026, 9, 1), view });
}
function labels(spots, cam, w, h, big, avoid) {
  const z0 = Math.max(.85, Math.min(1.25, Math.min(w, h) / 400)), f = Math.max(.68, Math.min(1.2, Math.sqrt(cam.z / z0))), fn = Math.max(.8, f);
  const items = spots.map(q => { const sz = q.me ? (big ? 64 : 54) : (big ? 56 : 46); return { id: q.uid, x: w / 2 + (q.x - cam.x) * cam.z, y: h / 2 + (q.y - cam.y) * cam.z, s: sz * f, nw: (sz + 30) * fn, bw: 0, bh: 0, bub: false }; });
  /* as on the page: place() hands mapLabels the energy pad (avoid[1]); the Friends tree button is checked by position below */
  const all = items.concat(avoid.slice(1).map((a, i) => ({ id: '__pad' + i, x: a.x + a.w / 2, y: a.y + a.h / 2, s: Math.max(a.w, a.h), nw: 0, bw: 0, bh: 0, bub: false })));
  return { items, lab: G.mapLabels(all, { w, h }) };
}
const hit = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
/* Room sizes measured on the live site (Oct 25, 15 people): galaxy box, Friends tree button and energy pad, in Room px */
const ROOMS = [
  { name: 'iPhone SE', w: 337, h: 295, tree: { x: 12, y: 253, w: 129, h: 36 }, pad: { x: 262, y: 220, w: 70, h: 70 } },
  { name: 'small Android', w: 322, h: 380, tree: { x: 12, y: 338, w: 129, h: 36 }, pad: { x: 247, y: 305, w: 70, h: 70 } },
  { name: 'iPhone 13', w: 352, h: 400, tree: { x: 12, y: 358, w: 132, h: 38 }, pad: { x: 272, y: 322, w: 74, h: 74 } },
  { name: 'iPhone 15 Pro Max', w: 392, h: 460, tree: { x: 12, y: 410, w: 132, h: 38 }, pad: { x: 306, y: 372, w: 84, h: 84 } },
  { name: 'iPad', w: 770, h: 671, tree: { x: 16, y: 617, w: 132, h: 38 }, pad: { x: 680, y: 580, w: 86, h: 86 } }
];
for (const R of ROOMS) test('Room fit (' + R.name + '): every companion and full name inside the Room, clear of the Friends tree button and the energy pad', () => {
  const L = people(15, { w: R.w, h: R.h }), big = R.w >= 640, avoid = [R.tree, R.pad];
  const cam = G.mapFit(L.spots, R.w, R.h, { side: big ? 54 : 46, top: big ? 44 : 36, bot: big ? 64 : 56, big, avoid });
  const { items, lab } = labels(L.spots, cam, R.w, R.h, big, avoid);
  for (const it of items) {
    const orb = { x: it.x - it.s / 2, y: it.y - it.s / 2, w: it.s, h: it.s }, nm = { x: it.x - it.nw / 2, y: it.y + it.s / 2 + 2, w: it.nw, h: 13 };
    assert.equal(lab.get(it.id).at, 'b', it.id + ' keeps its full name under it');
    for (const [what, b] of [['companion', orb], ['name', nm]]) {
      assert.ok(b.x >= -0.5 && b.y >= -0.5 && b.x + b.w <= R.w + 0.5 && b.y + b.h <= R.h + 0.5, it.id + ' ' + what + ' inside the Room ' + JSON.stringify([b.x, b.y, b.w, b.h].map(Math.round)));
      assert.ok(!hit(b, R.tree), it.id + ' ' + what + ' not under the Friends tree button');
      assert.ok(!hit(b, R.pad), it.id + ' ' + what + ' not under the energy pad');
    }
  }
});

/* Oct 25 (this task, live site, simulated iPhone SE, 15 real people): the energy pad measured 84 px there (not 70) and the Friends
   tree button 137 x 44 with its margin, and "Joseph C…" ended 13 px past the Room's left edge. With each name's real width (as
   place() measures it) and both rectangles handed to the label pass as on the page, nobody may be lost. */
test('Room fit (iPhone SE, live sizes): real name widths, 84 px energy pad and the Friends tree button: every name readable and inside', () => {
  const R = { w: 337, h: 295, tree: { x: 8, y: 249, w: 137, h: 44 }, pad: { x: 247, y: 205, w: 84, h: 84 } };
  const L = people(15, { w: R.w, h: R.h }), avoid = [R.pad, R.tree];
  const widths = [26, 37, 76, 15, 58, 51, 33, 30, 31, 48, 45, 43, 34, 43, 76], nw = {};
  L.spots.forEach((q, i) => { nw[q.uid] = widths[i % widths.length]; });
  const t0 = Date.now();
  const cam = G.mapFit(L.spots, R.w, R.h, { side: 46, top: 36, bot: 56, big: false, avoid, nw });
  assert.ok(Date.now() - t0 < 1500, 'fit stays quick: ' + (Date.now() - t0) + ' ms');
  const z0 = .85, f = Math.max(.68, Math.min(1.2, Math.sqrt(cam.z / z0))), fn = Math.max(.8, f);
  const items = L.spots.map(q => { const sz = q.me ? 54 : 46; return { id: q.uid, x: R.w / 2 + (q.x - cam.x) * cam.z, y: R.h / 2 + (q.y - cam.y) * cam.z, s: sz * f, nw: Math.min(sz + 30, nw[q.uid]) * fn, bw: 0, bh: 0, bub: false }; });
  const lab = G.mapLabels(items.concat(G.mapPads(avoid, '__k')), { w: R.w, h: R.h });
  for (const it of items) {
    const at = lab.get(it.id).at;
    assert.ok(at === 'b' || at === 't', it.id + ' keeps its full name (got "' + at + '")');
    const orb = { x: it.x - it.s / 2, y: it.y - it.s / 2, w: it.s, h: it.s }, nm = { x: it.x - it.nw / 2, y: at === 't' ? it.y - it.s / 2 - 15 : it.y + it.s / 2 + 2, w: it.nw, h: 13 };
    for (const [what, b] of [['companion', orb], ['name', nm]]) {
      assert.ok(b.x >= -0.5 && b.y >= -0.5 && b.x + b.w <= R.w + 0.5 && b.y + b.h <= R.h + 0.5, it.id + ' ' + what + ' inside the Room ' + JSON.stringify([b.x, b.y, b.w, b.h].map(Math.round)));
      assert.ok(!hit(b, R.tree), it.id + ' ' + what + ' not under the Friends tree button');
      assert.ok(!hit(b, R.pad), it.id + ' ' + what + ' not under the energy pad');
    }
  }
});

test('community-chat.js place() hands the label pass the Friends tree button too (G.mapPads), as the fit saw it', () => {
  const src = read('community-chat.js');
  assert.match(src, /fitMemo\.keep=av\.slice\(/);
  assert.match(src, /items\.push\(\.\.\.G\.mapPads\(fitMemo\.keep/);
  assert.match(src, /avoid:av,nw\}/, 'fitCam passes the real name widths');
  assert.equal(typeof G.mapPads, 'function');
});

test('Room seats: a short, wide Room (iPhone SE) seats more per row; taller phones keep the usual rows; rows stay in join order', () => {
  assert.equal(people(15).cols, 3);
  assert.equal(people(15, { w: 337, h: 295 }).cols, 4, 'iPhone SE');
  assert.equal(people(15, { w: 392, h: 460 }).cols, 3, 'iPhone 15 Pro Max unchanged');
  assert.equal(people(15, { w: 322, h: 380 }).cols, 3, 'small Android unchanged');
  const L = people(15, { w: 337, h: 295 }); const ys = L.spots.map(s => s.y);
  for (let i = 1; i < 15; i++) assert.ok(L.spots.find(s => s.uid === 'u' + i).y <= (i > 1 ? L.spots.find(s => s.uid === 'u' + (i - 1)).y + 8 : 0), 'newer is never below older');
  assert.equal(Math.max(...ys), 0, 'you stay on the bottom row');
});

test('Room fit: a single avoid rectangle still works as before (energy pad only)', () => {
  const L = people(15), pad = { x: 306, y: 372, w: 84, h: 84 };
  const a = G.mapFit(L.spots, 392, 460, { avoid: pad }), b = G.mapFit(L.spots, 392, 460, { avoid: [pad] });
  assert.deepEqual(a, b);
});

test('community-chat.js fitCam keeps the Friends tree button free as well as the energy pad', () => {
  const src = read('community-chat.js');
  const fc = src.slice(src.indexOf('function fitCam('), src.indexOf('function mapZ('));
  assert.match(fc, /nm-ctree/, 'fitCam measures the Friends tree button');
  assert.match(fc, /avoid:\s*av\b|avoid:av\b/, 'and passes every rectangle to mapFit');
});

/* ---------- 3. the composer hint and counter ---------- */
const core = require('../tools/readfit/core.cjs');
test('audit maths: WCAG contrast ratios', () => {
  assert.equal(+core.contrast([0, 0, 0], [255, 255, 255]).toFixed(1), 21);
  assert.equal(+core.contrast([119, 119, 119], [255, 255, 255]).toFixed(2), 4.48);
  assert.equal(core.needed(12, 400), 4.5);
  assert.equal(core.needed(24, 400), 3);
  assert.equal(core.needed(19, 700), 3);
  assert.deepEqual(core.over([255, 255, 255, 0.5], [0, 0, 0]), [127.5, 127.5, 127.5]);
  assert.deepEqual(core.parseColor('rgba(235, 235, 245, 0.82)'), [235, 235, 245, 0.82]);
});

function png(w, h, rgb) {
  const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for (const y of b) x = t[(x ^ y) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (k, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const kd = Buffer.concat([Buffer.from(k), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(kd)); return Buffer.concat([l, kd, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = y % 2 ? 2 : 1; for (let x = 0; x < w; x++) { const i = y * (w * 3 + 1) + 1 + x * 3; const c = rgb(x, y); raw[i] = c[0]; raw[i + 1] = c[1]; raw[i + 2] = c[2]; } }
  /* store the filtered bytes: filter 1 (sub) on even rows, 2 (up) on odd rows */
  const f = Buffer.from(raw); for (let y = h - 1; y >= 0; y--) { const o = y * (w * 3 + 1) + 1; for (let i = w * 3 - 1; i >= 0; i--) { const left = i >= 3 ? raw[o + i - 3] : 0, up = y ? raw[o - (w * 3 + 1) + i] : 0; f[o + i] = (raw[o + i] - (y % 2 ? up : left)) & 255; } }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(f)), chunk('IEND', Buffer.alloc(0))]);
}
test('audit maths: reads Playwright PNG screenshots (sub and up filters)', () => {
  const img = core.decodePNG(png(5, 4, (x, y) => [x * 40, y * 60, 200]));
  assert.equal(img.w, 5); assert.equal(img.h, 4);
  const at = (x, y) => [...img.px.subarray((y * 5 + x) * 3, (y * 5 + x) * 3 + 3)];
  assert.deepEqual(at(0, 0), [0, 0, 200]); assert.deepEqual(at(4, 3), [160, 180, 200]); assert.deepEqual(at(2, 1), [80, 60, 200]);
});

test('audit: finds text off the screen, under the home indicator, cut off, overlapping or below AA contrast', () => {
  const dark = { w: 100, h: 100, px: Buffer.alloc(100 * 100 * 3, 20) };
  const frame = { w: 100, h: 100, inset: { top: 10, bottom: 10 } };
  const T = (id, x, y, w, h, extra) => Object.assign({ id, text: 't' + id, rect: { x, y, w, h }, lines: [{ x, y, w, h }], fontPx: 12, weight: 400, color: 'rgb(240, 240, 240)', opacity: 1, clipped: '', covered: '', related: [] }, extra || {});
  const kinds = items => core.judge(items, frame, dark, 1).map(p => p.kind + ':' + p.id).sort();
  assert.deepEqual(kinds([T(0, 10, 20, 50, 14)]), [], 'clean text passes');
  assert.deepEqual(kinds([T(1, 80, 20, 40, 14)]), ['offscreen:1']);
  assert.deepEqual(kinds([T(2, 10, 85, 50, 14)]), ['safe-area:2'], 'in the home indicator band');
  assert.deepEqual(kinds([T(3, 10, 20, 50, 14, { clipped: 'div.box' })]), ['clipped:3']);
  assert.deepEqual(kinds([T(4, 10, 20, 50, 14, { covered: 'button.tree' })]), ['covered:4']);
  assert.deepEqual(kinds([T(5, 10, 20, 50, 14), T(6, 12, 22, 50, 14)]), ['overlap:5']);
  assert.deepEqual(kinds([T(7, 10, 20, 50, 14), T(8, 12, 22, 50, 14, { related: [7] })]), [], 'a label inside its own parent is not an overlap');
  assert.deepEqual(kinds([T(9, 10, 20, 50, 14, { color: 'rgba(235, 235, 245, 0.25)' })]), ['contrast:9'], 'faint grey hint text fails');
  assert.deepEqual(kinds([T(10, 10, 20, 50, 14, { color: 'rgb(240, 240, 240)', opacity: 0.3 })]), ['contrast:10'], 'a faded parent counts too');
  assert.deepEqual(kinds([T(11, 10, 20, 50, 30, { color: 'rgb(110, 110, 110)', fontPx: 28 })]), [], 'large text needs 3:1');
});
