// Regression: swiping a food up ("Cook today") means "I'm making it now".
// 1. dkCookToday must open the same reveal the Shuffle opens (fShowPick), for eBook, Community and Products.
// 2. The today-plan "addtoday" handler must put each new pick into its own free slot (no overwrite of an
//    earlier pick today), skip a recipe that is already planned, and say so in the user's language.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function block(src, sig) {
  const i = src.indexOf(sig);
  assert.ok(i >= 0, 'missing ' + sig);
  let depth = 0;
  const j = src.indexOf('{', i + sig.length - 1);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (!depth) return src.slice(j, k + 1); }
  }
  throw new Error('unterminated ' + sig);
}

// 1. swipe up opens the Shuffle reveal
const cook = block(html, 'function dkCookToday(id){');
assert.ok(/fShowPick\(id\)/.test(cook), 'dkCookToday opens the Shuffle reveal via fShowPick');

// 2. addtoday behaviour, run against a stub plan
const body = block(html, 'case "addtoday": {');
assert.ok(body.indexOf('toast("On today') < 0, 'toast goes through translation');
function run(td, ids, lang) {
  const toasts = [];
  const RECS = {m1:{id:'m1', c:'meal'}, m2:{id:'m2', c:'meal'}, m3:{id:'m3', c:'meal'}, m4:{id:'m4', c:'meal'}, s1:{id:'s1', c:'snack'}};
  const LowiLang = {get:() => lang};
  const ctx = {td, toasts, RECS, LowiLang, window:{LowiLang}, localStorage:{getItem:() => null}};
  const fn = 'function step(id){ const d = {id}; const recById = x => RECS[x];' +
    'const tdSlots = () => Array.from({length:td.meals || 0}, (_, i) => ({h:8 + i * 4}));' +
    'const tdEnsure = () => { while (td.plan.length < td.meals) td.plan.push("auto" + td.plan.length); return td; };' +
    'const save = () => {}; const toast = m => toasts.push(m);' +
    'switch ("addtoday") { case "addtoday": ' + body + ' } }';
  vm.createContext(ctx);
  vm.runInContext(fn, ctx);
  ids.forEach(id => ctx.step(id));
  return toasts;
}

let td = {meals:2, plan:['autoA', 'autoB'], extra:[], ate:{}};
run(td, ['m1', 'm2'], 'de');
assert.deepStrictEqual(td.plan, ['m1', 'm2'], 'second pick does not overwrite the first');

run(td, ['m3', 'm4'], 'de');
assert.deepStrictEqual(td.plan, ['m1', 'm2', 'm3'], 'third pick gets a new slot');
assert.deepStrictEqual(td.extra, ['m4'], 'fourth pick goes to extras');

td = {meals:2, plan:['m1', 'autoB'], extra:[], ate:{}};
let t = run(td, ['m1'], 'de');
assert.deepStrictEqual(td.plan, ['m1', 'autoB'], 'already planned recipe is not added again');
assert.ok(/schon/.test(t[0]), 'German already-planned toast: ' + JSON.stringify(t));

td = {meals:2, plan:['eaten', 'autoB'], extra:[], ate:{0:true}};
t = run(td, ['m2'], 'de');
assert.deepStrictEqual(td.plan, ['eaten', 'm2'], 'eaten slot stays');
assert.ok(/Zutaten/.test(t[0]), 'German added toast');

td = {meals:2, plan:['autoA', 'autoB'], extra:[], ate:{}};
run(td, ['s1', 's1'], 'en');
assert.deepStrictEqual(td.extra, ['s1'], 'snack added once');

console.log('swipe-today: ok');
