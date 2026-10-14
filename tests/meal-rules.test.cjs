'use strict';
/* Oct 14: duplicate rule, daily cap with a reason, meal line of the herb, weather pill repaint */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), K = require('../spirit-core.js');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'), now = new Date(2026, 9, 14, 12).getTime(), day = K.day(now);
function host() {
  const S = {xp: 0, ledger: [], logs: [], user: {name: 'Fixture', bday: '1994-03-09', mbti: 'INFP'}, quests: {done: {}}}, events = [], store = new Map();
  const ctx = {S, window: {dispatchEvent: e => events.push(e)}, localStorage: {setItem: (k, v) => store.set(k, v), getItem: k => store.get(k)}, CustomEvent: function (type, init) { this.type = type; this.detail = init.detail; }, today: () => day, save: () => true, questDone: () => {}, toast: () => {}, $$: () => [], setTimeout: () => 0, LowiP2: {cook: () => {}}, console};
  vm.createContext(ctx);
  vm.runInContext(html.slice(html.indexOf('/* The profile and herb'), html.indexOf('/* Zodiac from birthday */')), ctx);
  ctx.LowiHost = {award(src, el, opt) { return ctx.award(opt.amt, opt.label, el, src, opt.eventId); }};
  vm.runInContext(html.slice(html.indexOf('window.LowiVitalsBridge ='), html.indexOf('</script>', html.indexOf('window.LowiVitalsBridge ='))), ctx);
  return {S, V: ctx.window.LowiVitalsBridge, events};
}
test('the same barcode twice a day is blocked: no second log, no XP, a reason', () => {
  const {S, V} = host();
  const a = V.logMeal({id: 'bc:301:1', t: 'Nutella', code: '3017620422003', via: 'barcode'});
  assert.equal(a.xp, 15); assert.equal(a.log.code, '3017620422003');
  const b = V.logMeal({id: 'bc:301:2', t: 'Nuss-Nougat', code: '3017620422003', via: 'barcode'});
  assert.equal(b.dup, true); assert.equal(b.xp, 0); assert.equal(b.log, null); assert.ok(b.reason);
  assert.equal(S.logs.length, 1); assert.equal(S.xp, 15);
});
test('the same meal title twice a day is blocked, case, accents and a brand suffix do not matter', () => {
  const {S, V} = host();
  assert.equal(V.logMeal({id: 'm1', t: 'Linsensuppe'}).xp, 15);
  assert.equal(V.logMeal({id: 'm2', t: 'linsensuppe'}).dup, true);
  assert.equal(V.logMeal({id: 'm3', t: 'Linsensuppe · Oma'}).dup, true);
  assert.equal(V.mealWhy({t: 'LINSENSUPPE'}), 'dup');
  assert.equal(V.mealXp({t: 'Linsensuppe'}), 0);
  assert.equal(V.mealXp({t: 'Rührei'}), 15);
  assert.equal(S.logs.length, 1);
});
test('a meal from yesterday does not block today', () => {
  const {S, V} = host();
  S.logs.push({id: 'old', eventId: 'meal:old', day: K.day(now - 864e5), t: 'Linsensuppe', code: '42'});
  assert.equal(V.logMeal({id: 'new', t: 'Linsensuppe', code: '42'}).xp, 15);
});
test('normal days stay rewarded up to the daily cap, then the log is kept with a reason', () => {
  const {S, V} = host();
  assert.ok(V.MEAL_CAP >= 8);
  for (let i = 0; i < V.MEAL_CAP; i++) assert.equal(V.logMeal({id: 'c' + i, t: 'Meal ' + i}).xp, 15);
  const over = V.logMeal({id: 'cx', t: 'One more'});
  assert.equal(over.xp, 0); assert.equal(over.why, 'cap'); assert.ok(over.log); assert.match(over.reason, /8/);
  assert.equal(S.logs.length, V.MEAL_CAP + 1);
});
test('a 0 XP meal tells the herb it was a meal, not water', () => {
  const {V, events} = host();
  for (let i = 0; i < V.MEAL_CAP; i++) V.logMeal({id: 'c' + i, t: 'Meal ' + i});
  V.logMeal({id: 'cx', t: 'One more'});
  const care = events.filter(e => e.type === 'lowi:care').pop();
  assert.equal(care.detail.reaction, 'eat');
});
test('herb meal line is a meal line in German, never the water thanks', () => {
  const src = fs.readFileSync(path.join(__dirname, '../herb-tamagotchi.js'), 'utf8');
  assert.doesNotMatch(src, /Essen eingetragen\. Danke fürs Wasser/);
  assert.match(src, /eat:\['Meal logged[^']*','Essen eingetragen[^']*'/);
  assert.match(src, /messages\[event\.reaction==='eat'\?'eat':event\.kind\]/);
});
test('a rebuilt Home repaints the weather pill from the cached reading, and launch refreshes after opt-in', () => {
  const ui = fs.readFileSync(path.join(__dirname, '../spirit.js'), 'utf8');
  const ensure = ui.slice(ui.indexOf('tab.prepend(home);'), ui.indexOf('tab.prepend(home);') + 300);
  assert.match(ensure, /paintCachedWeather\(\)/);
  assert.match(ui, /WEATHER_KEY \+ '\.optin'/);
  assert.match(ui, /weather\(false, true\)/);
});
test('after Ate it or Skip on a scan the herb world closes by itself', () => {
  assert.match(html, /case "skip":[^\n]*LowiSpirit\.afterScan/);
  const ui = fs.readFileSync(path.join(__dirname, '../spirit.js'), 'utf8');
  assert.match(ui, /function afterScan\(xp, text, kind\)/);
});
