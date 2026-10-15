'use strict';
/* Oct 15: body journeys (body-trips.js / .css): adventure bar on Home + Körperreisen tickets with inside-the-body scenes */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const B = require('../body-trips.js');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'body-trips.js'), 'utf8'), css = fs.readFileSync(path.join(root, 'body-trips.css'), 'utf8');
const T0 = new Date('2026-10-15T09:00:00').getTime();

test('eight places, each with a name, subtitle, how-to and four facts in en, de and es', () => {
  assert.deepEqual(B.PLACES.map(p => p.id), ['blood', 'gut', 'liver', 'pancreas', 'muscle', 'heart', 'lung', 'brain']);
  assert.equal(B.PLACES[0].n[1], 'Blutbahn');
  assert.equal(B.byId('pancreas').n[1], 'Bauchspeicheldrüse');
  for (const p of B.PLACES) {
    for (const k of ['n', 'sub', 'how']) assert.ok(p[k].length === 3 && p[k].every(s => s && s.length > 2), p.id + ' ' + k);
    assert.equal(p.f.length, 4, p.id);
    p.f.forEach(f => assert.ok(f.length === 3 && f.every(s => s.length > 20), p.id + ' fact'));
  }
});

test('facts make no cure or treatment claims', () => {
  const all = B.PLACES.flatMap(p => p.f.flat()).join(' ').toLowerCase();
  for (const bad of ['heilt', 'cures', 'cura ', 'detox', 'garantiert', 'guaranteed', 'verbrennt fett']) assert.ok(!all.includes(bad), bad);
});

test('meals: fiber explores the gut, sugar or a high spike the pancreas and blood, protein the muscles', () => {
  assert.deepEqual(B.mealGains({ macros: {} }), { blood: 5 });
  assert.deepEqual(B.mealGains({ macros: { fiber: 6 } }), { blood: 5, gut: 10 });
  assert.deepEqual(B.mealGains({ macros: { sugar: 22 } }), { blood: 8, pancreas: 10 });
  assert.deepEqual(B.mealGains({ lvl: 'high' }), { blood: 8, pancreas: 10 });
  assert.equal(B.mealGains({ macros: { protein: 30 } }).muscle, 4);
  assert.equal(B.mealGains({ macros: { fiber: '3.9' } }).gut, undefined);
});

test('ledger entries: Move explores muscles, heart and lungs; water the blood; scans pancreas and brain; own events count nothing', () => {
  assert.deepEqual(B.entryGains({ src: 'move:session', label: 'Move session · 5 min', amt: 10 }), { muscle: 10, heart: 6, lung: 6 });
  assert.deepEqual(B.entryGains({ src: 'water', label: 'Wasser', amt: 2 }), { blood: 4 });
  assert.deepEqual(B.entryGains({ src: 'scan', label: 'Produkt gescannt', amt: 5 }), { pancreas: 4, brain: 4 });
  assert.deepEqual(B.entryGains({ src: 'body-trip', label: 'Körperreise', amt: 5 }), {});
  assert.deepEqual(B.entryGains({ src: 'meal', label: 'Mahlzeit', amt: 15 }), {});
  assert.deepEqual(B.entryGains({ src: 'move:session', label: 'Move', amt: 0 }), {});
});

test('fasting: every 4 hours explores the liver, from 16 hours the brain too, each block once', () => {
  assert.deepEqual(B.fastGains(3.9, 0).g, {});
  assert.deepEqual(B.fastGains(8.2, 0), { blocks: 2, g: { liver: 16 } });
  assert.deepEqual(B.fastGains(8.2, 2).g, {});
  assert.deepEqual(B.fastGains(17, 2), { blocks: 4, g: { liver: 16, brain: 4 } });
});

test('explored % has a daily cap from actions, never passes 100, and the next day starts fresh', () => {
  const st = {};
  assert.deepEqual(B.apply(st, { gut: 10 }, T0), { gut: 10 });
  B.apply(st, { gut: 10 }, T0); B.apply(st, { gut: 10 }, T0);
  assert.deepEqual(B.apply(st, { gut: 10 }, T0), {});
  assert.equal(st.p.gut.x, B.DAY_CAP);
  assert.deepEqual(B.apply(st, { gut: 10 }, T0 + 864e5), { gut: 10 });
  st.p.liver.x = 95;
  assert.deepEqual(B.apply(st, { liver: 10 }, T0), { liver: 5 });
  assert.equal(st.p.liver.x, 100);
  assert.equal(B.unlocked(0), 0); assert.equal(B.unlocked(5), 1); assert.equal(B.unlocked(25), 2); assert.equal(B.unlocked(80), 4); assert.equal(B.unlocked(100), 4);
});

test('trip: one at a time, countdown and dots, surprise only when back, collected once, 3 trips a day', () => {
  const st = {};
  const t = B.start(st, 'gut', T0);
  assert.equal(t.place, 'gut'); assert.equal(t.back - t.start, B.TRIP_MS);
  assert.equal(B.start(st, 'liver', T0 + 1000), null, 'busy');
  let v = B.view(st, T0 + B.TRIP_MS / 2);
  assert.equal(v.status, 'away'); assert.equal(v.dots, B.DOTS / 2); assert.equal(B.fmtLeft(v.leftMs), '0:15:00');
  assert.equal(B.claim(st, T0 + 60000), null, 'not back yet');
  v = B.view(st, T0 + B.TRIP_MS);
  assert.equal(v.status, 'back');
  const r = B.claim(st, T0 + B.TRIP_MS);
  assert.equal(r.place, 'gut'); assert.equal(r.fact, 0); assert.ok(r.isNew); assert.equal(r.x, B.TRIP_GAIN);
  assert.equal(r.eventId, 'body-trip:2026-10-15:1');
  assert.equal(B.claim(st, T0 + B.TRIP_MS + 1), null, 'collected once');
  assert.equal(B.view(st, T0 + B.TRIP_MS).status, 'idle');
  assert.equal(B.view(st, T0 + B.TRIP_MS).visited, 1);
  B.start(st, 'liver', T0 + 2 * B.TRIP_MS); B.claim(st, T0 + 4 * B.TRIP_MS);
  B.start(st, 'heart', T0 + 5 * B.TRIP_MS); B.claim(st, T0 + 7 * B.TRIP_MS);
  assert.equal(B.canStart(st, T0 + 8 * B.TRIP_MS), false, '3 a day');
  assert.ok(B.start(st, 'lung', T0 + 864e5), 'tomorrow again');
});

test('trip facts: a new one while unseen facts are unlocked, otherwise a known one again', () => {
  const st = {};
  st.p = {}; B.fresh(st); st.p.muscle.x = 30;
  B.start(st, 'muscle', T0); const a = B.claim(st, T0 + B.TRIP_MS);
  assert.equal(a.fact, 0); assert.ok(a.isNew); assert.equal(a.x, 40);
  B.start(st, 'muscle', T0 + 2 * B.TRIP_MS); const b = B.claim(st, T0 + 3 * B.TRIP_MS);
  assert.equal(b.fact, 1); assert.ok(b.isNew);
  B.start(st, 'muscle', T0 + 4 * B.TRIP_MS); const c = B.claim(st, T0 + 5 * B.TRIP_MS);
  assert.equal(c.fact, 2, '60 % unlocks the third');
  st.p.blood.x = 10; st.p.blood.seen = 1;
  B.start(st, 'blood', T0 + 864e5); const d = B.claim(st, T0 + 864e5 + B.TRIP_MS);
  assert.equal(d.isNew, false); assert.equal(d.fact, -1, 'no repeated facts'); assert.ok(d.learned); assert.equal(d.nextAt, 25);
});

test('the cell travels to where the biggest gain went', () => {
  assert.equal(B.destination({ blood: 8, pancreas: 10, gut: 10 }), 'gut');
  assert.equal(B.destination({ muscle: 10, heart: 6 }), 'muscle');
  assert.equal(B.destination({}), null);
});

test('scenes: every place draws its own inside view; the pancreas and blood show the spike, muscles open GLUT4 doors', () => {
  for (const p of B.PLACES) {
    const s = B.scene(p.id, {});
    assert.ok(s.startsWith('<svg class="bt-scene"') && s.includes('viewBox="0 0 160 100"') && s.length > 1200, p.id);
    assert.ok(!/NaN|undefined/.test(s), p.id + ' clean');
  }
  assert.ok(B.scene('blood', {}).includes('bt-rbc'));
  assert.ok(B.scene('gut', {}).includes('bt-villus') && B.scene('gut', {}).includes('bt-bac'));
  assert.ok(B.scene('liver', {}).includes('bt-lob'));
  assert.ok(B.scene('lung', {}).includes('bt-alv'));
  assert.ok(B.scene('brain', {}).includes('bt-soma'));
  const calm = B.scene('pancreas', {}), spike = B.scene('pancreas', { spike: true });
  assert.ok(!calm.includes('bt-beta on') && spike.includes('bt-beta on'));
  assert.ok((spike.match(/bt-ins/g) || []).length > (calm.match(/bt-ins/g) || []).length);
  assert.ok((B.scene('blood', { spike: true }).match(/bt-glu/g) || []).length > (B.scene('blood', {}).match(/bt-glu/g) || []).length);
  assert.ok(B.scene('muscle', { moved: true }).includes('bt-door on'));
  const a = B.scene('heart', {}), b = B.scene('heart', {});
  assert.notEqual(a.match(/id="(bt\d+)g"/)[1], b.match(/id="(bt\d+)g"/)[1], 'unique gradient ids');
});

test('wiring: bar sits right before the sun row, XP goes through LowiHost.award with a body-trip event id, loader and sw list the files', () => {
  assert.ok(src.includes("function placed(log)") && src.includes("#lsSun") && src.includes("mbAdv"));
  assert.ok(src.includes("lowi:body-trip-done"));
  assert.ok(/LowiHost\.award\('body-trip', null, \{ amt: XP/.test(src));
  assert.ok(src.includes("addEventListener('lowi:meal-logged'") && src.includes("addEventListener('lowi:reward'"));
  assert.ok(src.includes('Noch nie besucht!') && src.includes('Körperreisen') && src.includes('erkundet'));
  const ui = fs.readFileSync(path.join(root, 'apple-ui.js'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.ok(ui.includes("'body-trips.js'"));
  assert.ok(sw.includes('"body-trips.js"') && sw.includes('"body-trips.css"'));
  assert.ok(css.includes('prefers-reduced-motion') && /\.bt-scene\.live \*[^}]*animation: none/.test(css));
});
