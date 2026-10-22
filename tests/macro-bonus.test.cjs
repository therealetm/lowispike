'use strict';
/* Oct 15: daily macro bonus. Triggers when a goal is met, once per day per goal, resets the next day,
   respects the daily meal cap and the duplicate block, also for plan meals. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), K = require('../spirit-core.js');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'), now = new Date(2026, 9, 14, 12).getTime();
function host(dayRef) {
  const S = {xp: 0, ledger: [], logs: [], user: {name: 'Fixture', macroGoals: {protein: 60, fiber: 20, sugar: 30}}, quests: {done: {}}}, events = [];
  const recs = {rb_eggs: {id: 'rb_eggs', n: 'Eggs bowl', r: 'low', macros: {protein: 30, fiber: 2, sugar: 1}}, rb_salad: {id: 'rb_salad', n: 'Lentil salad', r: 'low', macros: {protein: 20, fiber: 12, sugar: 3}}};
  const ctx = {S, window: {dispatchEvent: e => events.push(e)}, localStorage: {setItem() {}, getItem() { return null; }}, CustomEvent: function (type, init) { this.type = type; this.detail = init.detail; }, today: () => dayRef.d, save: () => true, questDone: () => {}, toast: () => {}, $$: () => [], setTimeout: () => 0, LowiP2: {cook: () => {}}, recById: id => recs[id], console};
  ctx.window.LowiSpiritCore = K; ctx.LowiSpiritCore = K;
  ctx.window.LowiWorldHomeCore = require('../world-home-core.js'); vm.createContext(ctx);
  vm.runInContext(html.slice(html.indexOf('/* The profile and herb'), html.indexOf('/* Zodiac from birthday */')), ctx);
  ctx.LowiHost = {award(src, el, opt) { return ctx.award(opt.amt, opt.label, el, src, opt.eventId); }};
  vm.runInContext(html.slice(html.indexOf('window.LowiVitalsBridge ='), html.indexOf('</script>', html.indexOf('window.LowiVitalsBridge ='))), ctx);
  const V = ctx.window.LowiVitalsBridge;
  /* same as spirit.js checkBonuses() */
  const check = closed => K.bonuses(S, dayRef.d, closed).reduce((a, b) => a + V.bonus(b.eventId, b.amt, b.kind + ' bonus'), 0);
  return {S, V, events, check};
}
const macroXp = S => S.ledger.filter(e => e.src === 'macro-goal').reduce((a, e) => a + e.amt, 0);

test('the bonus triggers when the goal is met, not before, and only once a day', () => {
  const ref = {d: K.day(now)}, {S, V, check} = host(ref);
  V.logMeal({id: 'a', t: 'Skyr', macros: {protein: 30, fiber: 5, sugar: 4}});
  assert.equal(check(false), 0, 'under the goal pays nothing');
  V.logMeal({id: 'b', t: 'Chicken', macros: {protein: 35, fiber: 16, sugar: 2}});
  assert.equal(check(false), 40, 'protein and fiber reached');
  assert.equal(check(false), 0); assert.equal(check(false), 0);
  V.logMeal({id: 'c', t: 'Tofu', macros: {protein: 40, fiber: 10, sugar: 1}});
  assert.equal(check(false), 0, 'more protein the same day pays no second bonus');
  assert.equal(check(true), 20, 'sugar under the goal pays once the day is finished');
  assert.equal(check(true), 0);
  assert.equal(macroXp(S), 60);
  assert.deepEqual(S.ledger.filter(e => e.src === 'macro-goal').map(e => e.eventId).sort(), ['fiber', 'protein', 'sugar'].map(k => 'macro-goal:' + ref.d + ':' + k));
});

test('the bonus resets the next day', () => {
  const ref = {d: K.day(now)}, {S, V, check} = host(ref);
  V.logMeal({id: 'a', t: 'Steak', macros: {protein: 70, fiber: 0, sugar: 0}});
  assert.equal(check(false), 20);
  ref.d = K.day(now + 864e5);
  assert.equal(check(false), 0, 'yesterday\'s meals do not count today');
  V.logMeal({id: 'b', t: 'Steak', macros: {protein: 70, fiber: 0, sugar: 0}});
  assert.equal(check(false), 20, 'a new day pays again');
  assert.equal(macroXp(S), 40);
});

test('a duplicate meal is blocked and adds no macros toward the bonus', () => {
  const ref = {d: K.day(now)}, {S, V, check} = host(ref);
  V.logMeal({id: 'a', t: 'Protein shake', code: '400', macros: {protein: 35, fiber: 0, sugar: 2}});
  assert.equal(V.logMeal({id: 'b', t: 'Protein shake', code: '400', macros: {protein: 35, fiber: 0, sugar: 2}}).dup, true);
  assert.equal(V.logMeal({id: 'c', t: 'Other name', code: '400', macros: {protein: 35, fiber: 0, sugar: 2}}).dup, true);
  assert.equal(check(false), 0, '35 g, not 105 g');
  assert.equal(K.totals(S.logs, ref.d).sum.protein, 35);
});

test('meals past the daily XP cap still count their macros, the bonus stays capped at once per goal', () => {
  const ref = {d: K.day(now)}, {S, V, check} = host(ref);
  for (let i = 0; i < V.MEAL_CAP; i++) V.logMeal({id: 'm' + i, t: 'Snack ' + i, macros: {protein: 5, fiber: 1, sugar: 1}});
  assert.equal(check(false), 0, '40 g protein, 8 g fiber');
  const r = V.logMeal({id: 'late', t: 'Late chicken', macros: {protein: 30, fiber: 15, sugar: 0}});
  assert.equal(r.xp, 0); assert.equal(r.why, 'cap');
  assert.equal(check(false), 40, 'the real food past the cap reaches the goal');
  assert.equal(S.xp, V.MEAL_CAP * 15 + 40);
});

test('plan meals use the same cap and duplicate block and announce the log so the bonus is checked', () => {
  const ref = {d: K.day(now)}, {S, V, events, check} = host(ref);
  V.logMeal({id: 'x', t: 'Eggs bowl', macros: {protein: 30, fiber: 2, sugar: 1}});
  S.td = {day: ref.d, plan: ['rb_eggs', 'rb_salad'], ate: {}};
  assert.equal(V.planMeal(0, true), true);
  assert.equal(S.logs.length, 1, 'the same meal from the plan does not count twice');
  for (let i = 0; i < V.MEAL_CAP; i++) V.logMeal({id: 'm' + i, t: 'Snack ' + i, macros: {protein: 0, fiber: 0, sugar: 0}});
  const before = S.xp;
  V.planMeal(1, true);
  assert.equal(S.xp, before, 'past the cap: logged, no meal XP');
  assert.equal(S.logs.length, V.MEAL_CAP + 2);
  assert.ok(events.some(e => e.type === 'lowi:meal-logged' && e.detail.via === 'plan' && e.detail.xp === 0), 'spirit.js listens to this and runs the bonus check');
  assert.equal(check(false), 0, '50 g protein from the two meals is under 60, fiber 14 under 20');
});

test('a plan meal under the cap still pays meal XP up to MEAL_CAP, not the old 5', () => {
  const ref = {d: K.day(now)}, {S, V} = host(ref);
  for (let i = 0; i < 6; i++) V.logMeal({id: 'm' + i, t: 'Snack ' + i});
  S.td = {day: ref.d, plan: ['rb_salad'], ate: {}};
  const before = S.xp; V.planMeal(0, true);
  assert.equal(S.xp - before, 15);
});

test('spirit.js checks the bonus after every meal log event', () => {
  const src = fs.readFileSync(path.join(__dirname, '../spirit.js'), 'utf8');
  assert.match(src, /addEventListener\('lowi:meal-logged',[^\n]*checkBonuses\(false\)/);
});

test('the living Home macro tile refreshes on window events (award and bonus fire on window)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../living-home.js'), 'utf8');
  assert.match(src, /'lowi:reward'[^\n]*'lowi:meal-logged'\]\.forEach\(n => \{ W\.addEventListener\(n, schedule\)/);
});
