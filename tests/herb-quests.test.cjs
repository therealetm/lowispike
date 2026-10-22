'use strict';
/* Oct 15: herb path. Evolution card rule, special quests (cumulative, 4-6 steps, hints, claim once), weekly missions (max 2),
   goals that read existing actions (no XP, no own truth), food collection, Daily Quest claim + countdown. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const C = require('../herb-quests-core.js'), CFG = require('../herb-config.js');
const root = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const T = new Date(2026, 9, 15, 10).getTime(), day = C.dayKey(T);
const meal = (t, o) => Object.assign({t, ts: T - 3600e3, day, lvl: 'medium'}, o || {});

test('evolution card: next stage, the rule and how many more', () => {
  const e = C.evolution(120);
  assert.equal(e.next.id, CFG.stages[2].id);
  assert.equal(e.left, CFG.stages[2].xp - 120);
  assert.equal(e.meals, Math.ceil(e.left / 15));
  assert.ok(e.progress > 0 && e.progress < 1);
  assert.equal(C.evolution(99999).next, null);
});

test('special quests: 4 at the start, up to 6 later, each with a hint and a link', () => {
  const seed = C.specialQuests({s: {xp: 0, logs: [], ledger: []}}, 'de');
  assert.equal(seed.steps.length, 4);
  const later = C.specialQuests({s: {xp: CFG.stages[3].xp + 5, logs: [], ledger: []}}, 'en');
  assert.ok(later.steps.length >= 4 && later.steps.length <= 6);
  for (const x of later.steps.concat(seed.steps)) { assert.ok(x.hint.length > 20); assert.ok(x.go); assert.ok(!/\{n\}/.test(x.title)); }
});

test('special quests count cumulative actions since the stage began, not days in a row', () => {
  const s = {xp: 20, ledger: [{ts: T - 9e6, amt: 20, src: 'meal'}], logs: [meal('Brokkoli', {ts: T - 8e6}), meal('Reis', {ts: T - 7e6, via: 'barcode'})]};
  const q = C.specialQuests({s, fast: {waterEvents: {a: T - 5e6, b: T - 4e6, c: T - 3e6}}}, 'de');
  const by = id => q.steps.find(x => x.id === id);
  assert.equal(by('meal').n, 2); assert.equal(by('meal').done, true);
  assert.equal(by('water').n, 3); assert.equal(by('water').done, true);
  assert.equal(by('scan').n, 1);
  assert.equal(by('variety').n, 3); // meal + water + scan
});

test('a claimed step stays claimed (same eventId never pays twice)', () => {
  const s = {xp: 20, ledger: [], logs: [meal('A'), meal('B')]};
  const before = C.specialQuests({s}, 'en').steps.find(x => x.id === 'meal');
  assert.equal(before.claimed, false);
  s.ledger.push({ts: T, amt: 25, eventId: before.eventId});
  assert.equal(C.specialQuests({s}, 'en').steps.find(x => x.id === 'meal').claimed, true);
});

test('variety step points at the first action not used yet', () => {
  const s = {xp: 0, ledger: [], logs: [meal('A')]};
  const v = C.specialQuests({s}, 'en').steps.find(x => x.id === 'variety');
  assert.equal(v.go, 'water');
});

test('weekly missions: pick at most two, count this week only, claim once', () => {
  let st = null;
  st = C.pickMission(st, 'water20', T).state;
  st = C.pickMission(st, 'scan5', T).state;
  const third = C.pickMission(st, 'move4', T);
  assert.equal(third.ok, false); assert.equal(third.full, true);
  assert.deepEqual(st.picks, ['water20', 'scan5']);
  assert.equal(C.pickMission(st, 'scan5', T).state.picks.length, 1);
  const lastWeek = T - 8 * 864e5;
  const s = {xp: 0, ledger: [], logs: [meal('Old', {ts: lastWeek, via: 'barcode'}), meal('New', {via: 'barcode'})]};
  const m = C.missions({s}, st, 'de', T).find(x => x.id === 'scan5');
  assert.equal(m.picked, true); assert.equal(m.n, 1);
  assert.ok(C.weekResetIn(T).ms > 0 && C.weekResetIn(T).ms <= 7 * 864e5);
  assert.notEqual(C.pickMission(st, 'water20', T + 7 * 864e5).state.week, st.week);
});

test('goals point at existing actions and read their progress from those stores', () => {
  const r = C.addGoal([], {action: 'water', n: 2, text: '2 Gläser bis mittags'}, T);
  assert.equal(r.error, ''); assert.equal(r.goal.daily, true);
  assert.equal(C.addGoal(r.list, {action: 'water', n: 2, text: '2 gläser bis mittags'}, T).error, 'dup');
  assert.equal(C.addGoal(r.list, {action: 'nope', n: 1, text: 'x'}, T).error, 'action');
  const st = {s: {logs: []}, fast: {water: {[day]: 1}}};
  let g = C.goalsToday(r.list, st, T)[0];
  assert.equal(g.value, 1); assert.equal(g.done, false);
  st.fast.water[day] = 3;
  g = C.goalsToday(r.list, st, T)[0];
  assert.equal(g.value, 2); assert.equal(g.done, true);
  assert.equal('xp' in g, false);
  assert.equal(C.removeGoal(r.list, r.goal.id).length, 0); // undo
});

test('a one-off goal leaves the day after it was reached', () => {
  const r = C.addGoal([], {action: 'eat', n: 1, text: 'Frühstück eintragen', daily: false}, T);
  const st = {s: {logs: [meal('Ei')]}};
  assert.equal(C.settleGoals(r.list, st, T), true);
  assert.equal(C.goalsToday(r.list, st, T).length, 1);
  assert.equal(C.goalsToday(r.list, {s: {logs: []}}, T + 864e5).length, 0);
});

test('four suggestion groups, own wording per language', () => {
  assert.equal(C.CHIPS.length, 4);
  for (const g of C.CHIPS) { assert.ok(g.c.length >= 3); for (const c of g.c) { assert.ok(C.ACTIONS.includes(c[0])); assert.equal(c[2].length, 3); } }
});

test('food collection fills from logged foods and scanned products', () => {
  const d = C.discover([meal('Rührei mit Spinat'), meal('Reis mit Hähnchen'), meal('Kaffee')], [{name: 'Skyr Natur', ts: T}]);
  for (const id of ['egg', 'spinach', 'rice', 'chicken', 'coffee', 'yogurt']) assert.ok(d.first[id], id);
  assert.equal(d.total, C.FOODS.length);
  assert.ok(d.total >= 30);
  assert.equal(d.first.icecream, undefined);
  const before = C.discover([meal('Reis')]), after = C.discover([meal('Reis'), meal('Linsensuppe')]);
  assert.deepEqual(C.newFoods(before, after), ['lentils']);
});

test('Daily Quest board: rewards only on Claim, countdown shown, same eventIds', () => {
  const html = root('index.html'), f3 = html.slice(html.indexOf('<script id="f3js">'), html.indexOf('</script>', html.indexOf('<script id="f3js">')));
  assert.ok(/function claim\(id\)/.test(f3));
  assert.ok(!/function pay\(/.test(f3), 'no automatic payout');
  assert.ok(f3.includes('"f3:" + p.day + ":" + q.id') && f3.includes('"f3all:" + p.day'));
  assert.ok(f3.includes('data-f3="claim"') && f3.includes('f3-reset'));
  assert.ok(/claim:"Abholen"/.test(f3) && /claim:"Reclamar"/.test(f3));
});

test('wired in: loader, offline cache, herb world and profile', () => {
  const ui = root('apple-ui.js'), sw = root('sw.js'), sp = root('spirit.js');
  assert.ok(ui.indexOf("'herb-quests-core.js','herb-quests.js'") > 0 && ui.indexOf("'herb-quests.js'") < ui.indexOf("'spirit.js'"));
  for (const f of ['herb-quests-core.js', 'herb-quests.js', 'herb-quests.css']) assert.ok(sw.includes('"' + f + '"'), f);
  assert.ok(sp.includes('LowiHerbQuests.pathHTML()') && sp.includes('LowiHerbQuests.evoHTML(true)'));
  const ui2 = root('herb-quests.js');
  assert.ok(ui2.includes("'herb-quest'") && !/award\([^)]*'goal/.test(ui2), 'goals never pay');
});
