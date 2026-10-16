'use strict';
/* Oct 16 (E-man): spiky meals are logged but earn no XP (never minus), Misty's energy comes from tracked meals / water / Move,
   her face follows it, she is too tired to travel without energy, the trip countdown shows on Home, finds are paid once. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const K = require('../spirit-core.js'), SUN = require('../sun-meter.js');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html'), now = new Date(2026, 9, 16, 12).getTime(), day = K.day(now);

function host(extra) {
  const S = {xp: 0, ledger: [], logs: [], user: {name: 'Fixture', bday: '1994-03-09', mbti: 'INFP'}, quests: {done: {}}}, events = [], store = new Map(), quests = [];
  const ctx = Object.assign({S, window: {dispatchEvent: e => events.push(e)}, localStorage: {setItem: (k, v) => store.set(k, v), getItem: k => store.get(k)}, CustomEvent: function (type, init) { this.type = type; this.detail = init.detail; }, today: () => day, save: () => true, questDone: q => quests.push(q), toast: () => {}, $$: () => [], setTimeout: () => 0, LowiP2: {cook: () => {}}, console}, extra || {});
  vm.createContext(ctx);
  vm.runInContext(html.slice(html.indexOf('/* The profile and herb'), html.indexOf('/* Zodiac from birthday */')), ctx);
  ctx.LowiHost = {award(src, el, opt) { return ctx.award(opt.amt, opt.label, el, src, opt.eventId); }};
  vm.runInContext(html.slice(html.indexOf('window.LowiVitalsBridge ='), html.indexOf('</script>', html.indexOf('window.LowiVitalsBridge ='))), ctx);
  return {S, V: ctx.window.LowiVitalsBridge, events, quests};
}

test('a spiky meal is logged and kept, but earns no XP, no quest and never minus points', () => {
  const {S, V, quests, events} = host();
  const r = V.logMeal({id: 'bc:1:1', t: 'Gummy bears', code: '4001686', via: 'barcode', lvl: 'high'});
  assert.ok(r.log, 'honest logging still saves the meal'); assert.equal(r.log.lvl, 'high');
  assert.equal(r.xp, 0); assert.equal(r.why, 'spike'); assert.equal(r.spike, true);
  assert.match(r.reason, /no XP/); assert.match(r.reason, /never cost/);
  assert.equal(S.xp, 0, 'no minus points'); assert.equal(S.ledger.length, 0, 'nothing reaches the ledger, so no sunbeam either');
  assert.equal(S.logs.length, 1); assert.deepEqual(quests, [], 'the eat quest is not completed by a spiky meal');
  assert.equal(events.find(e => e.type === 'lowi:meal-logged').detail.spike, true);
  const ok = V.logMeal({id: 'm2', t: 'Lentil soup', r: 'ja', lvl: 'low'});
  assert.equal(ok.xp, 15); assert.deepEqual(quests, ['eat']); assert.equal(S.xp, 15);
});

test('the spike rule is the app\'s own verdict (r nein / lvl high), not a new nutrition judgement', () => {
  const {V} = host();
  assert.equal(V.spiky({r: 'nein'}), true); assert.equal(V.spiky({lvl: 'high'}), true);
  assert.equal(V.spiky({r: 'ja', lvl: 'high'}), false, 'ja wins, same order as LowiWorldHealth.verdict');
  assert.equal(V.spiky({r: 'jein', lvl: 'mid'}), false); assert.equal(V.spiky({r: 'unknown'}), false); assert.equal(V.spiky({}), false);
  assert.equal(V.mealWhy({t: 'Cola', lvl: 'high'}), 'spike'); assert.equal(V.mealXp({t: 'Cola', lvl: 'high'}), 0);
  assert.equal(V.mealXp({t: 'Rührei', lvl: 'low'}), 15);
  const W = require('../world-health-core.js');
  for (const l of [{r: 'nein'}, {lvl: 'high'}, {r: 'ja', lvl: 'high'}, {r: 'jein'}, {r: 'unknown'}, {lvl: 'low'}, {r: 7, lvl: 'high'}]) assert.equal(V.spiky(l), W.verdict(l) <= 0.15, JSON.stringify(l));
});

test('a typed meal gets analyseMeal\'s verdict when it knows the foods, and stays unknown (rewarded) when it does not', () => {
  const analyseMeal = t => /cola/i.test(t) ? {ok: true, lvl: 'high', r: 'nein'} : {ok: false};
  const {S, V} = host({analyseMeal});
  const a = V.logMeal({id: 's1', t: 'Cola and fries', via: 'spirit'});
  assert.equal(a.log.r, 'nein'); assert.equal(a.xp, 0); assert.equal(a.why, 'spike');
  const b = V.logMeal({id: 's2', t: 'Grandma\'s mystery stew', via: 'spirit'});
  assert.equal(b.log.r, 'unknown'); assert.equal(b.xp, 15, 'no guess for foods the app does not know');
  assert.equal(S.logs.length, 2); assert.equal(S.xp, 15);
});

test('every other meal path follows the same rule (legacy check, barcode sheets, plan, fast-break bonus)', () => {
  assert.match(html, /const spike = !!\(VB && VB\.spiky && VB\.spiky\(\{lvl:r\.lvl, r:r\.r\}\)\);\n  if \(!spike && n < /);
  assert.match(html, /if \(!spike\) questDone\("eat"\);/);
  assert.match(html, /via:"barcode", code, lvl:meta\[0\]\}\)/);
  assert.match(html, /via:"barcode", code:bcode, lvl:m\[0\]\}\)/);
  assert.match(html, /if \(m\[0\] !== "high"\) giveBonus\(\);/);
  assert.match(html, /if \(!\(r && \(r\.lvl === "high" \|\| r\.r === "nein"\)\)\) giveBonus\(\);/);
  assert.match(html, /const spike=this\.spiky\(log\),xp=!spike&&n<this\.MEAL_CAP\?award\(15,"Meal logged",null,"meal:plan"/);
  assert.doesNotMatch(html, /award\(-\d/, 'no negative awards anywhere');
});

const L = (lvl, r, extra) => Object.assign({day, ts: now - 6e5, lvl, r}, extra || {});
const E = (src, amt, extra) => Object.assign({ts: now - 6e5, day, amt, src, label: 'x'}, extra || {});

test('energy: nothing tracked is low energy and unknown, never "you didn\'t"', () => {
  const en = SUN.energy({now});
  assert.equal(en.tier, 'tired'); assert.equal(en.canTravel, false);
  assert.deepEqual(en.known, {food: false, water: false, move: false});
  assert.ok(en.value >= 0.15 && en.value < SUN.ENERGY.travel);
  const sm = read('sun-meter.js');
  assert.match(sm, /notYet: \['not tracked yet'/);
  assert.match(sm, /only means Misty gets no energy from it yet, not that you didn’t do it/);
});

test('energy: a spiky meal alone wears her out (sad), good tracking energises her, yesterday does not count', () => {
  const weak = SUN.energy({now, logs: [L('high', 'nein')]});
  assert.equal(weak.tier, 'weak'); assert.equal(weak.spikes, 1); assert.equal(weak.canTravel, false);
  const good = SUN.energy({now, logs: [L('low', 'ja')], water: 4, ledger: [E('herb-care:dance', 10, {label: 'Move'})]});
  assert.equal(good.tier, 'thriving'); assert.equal(good.canTravel, true); assert.equal(good.moves, 1); assert.equal(good.water, 4);
  const mixed = SUN.energy({now, logs: [L('high', 'nein')], water: 4, ledger: [E('move:steps', 5)]});
  assert.equal(mixed.tier, 'ok', 'water and a Move still give her energy after a spiky meal'); assert.equal(mixed.canTravel, true);
  const meal = SUN.energy({now, logs: [L('low', 'ja')]});
  assert.equal(meal.tier, 'ok');
  const old = SUN.energy({now, logs: [L('low', 'ja', {day: K.day(now - 864e5)})], water: 0, ledger: [E('move:steps', 5, {day: K.day(now - 864e5), ts: now - 864e5})]});
  assert.equal(old.tier, 'tired');
  assert.ok(good.value > mixed.value && mixed.value > meal.value && meal.value > weak.value);
});

test('energy: water from the counter wins over ledger entries (capped water XP still counts as water)', () => {
  assert.equal(SUN.energy({now, water: 6}).water, 6);
  assert.equal(SUN.energy({now, ledger: [E('water', 2), E('water', 2)]}).water, 2);
  assert.equal(SUN.energy({now, water: 12}).parts.water, 1);
});

test('travel: the sun bonus counts, but she only leaves with energy; trips and finds are paid once', () => {
  const v = {fullDone: true, trip: null, away: false};
  assert.equal(SUN.mayDepart(v, {canTravel: false}), false);
  assert.equal(SUN.mayDepart(v, {canTravel: true}), true);
  assert.equal(SUN.mayDepart({fullDone: true, trip: {}, away: false}, {canTravel: true}), false, 'one trip per day');
  assert.equal(SUN.mayDepart({fullDone: false, trip: null}, {canTravel: true}), false);
  const t1 = SUN.makeTrip('2026-10-16', [], now, 'thriving'), t2 = SUN.makeTrip('2026-10-16', [], now, 'ok');
  assert.equal(t1.back - t1.start, SUN.AWAY_MS, 'reuses the existing 1 h trip length'); assert.ok(t1.item2 && t1.item2 !== t1.item);
  assert.equal(t2.item2, undefined);
  assert.equal(SUN.tripFinds(t1, '2026-10-16').length, 2); assert.equal(SUN.tripFinds(t2, '2026-10-16').length, 1);
  assert.equal(SUN.tripFinds(t1, 'd')[1].bonus, true);
  const sm = read('sun-meter.js');
  assert.match(sm, /if \(!g\.trips\[v\.key\] && en\.canTravel\) g\.trips\[v\.key\] = makeTrip/);
  assert.match(sm, /for \(const f of tripFinds\(trip, t\.day\)\) if \(!g\.items\.some\(i => i\.day === t\.day && !!i\.bonus === !!f\.bonus\)\)/, 'collect never pays a find twice');
  assert.match(sm, /if \(g\.trips\[v\.key\]\) return false;/);
});

test('countdown: "Out exploring · back in 42 min" in her empty bubble, "Too tired to explore" when she cannot go', () => {
  assert.equal(SUN.fmtBack(42 * 60000), '42 min'); assert.equal(SUN.fmtBack(10), '1 min'); assert.equal(SUN.fmtBack(65 * 60000), '1 h 05');
  const sm = read('sun-meter.js'), css = read('sun-meter.css');
  assert.match(sm, /function backChip\(v, en\)/); assert.match(sm, /backChip\(v, en\);/);
  assert.match(sm, /tr\('out'\) \+ ' · ' \+ tr\('backShort'\) \+ ' ' \+ fmtBack\(v\.left\)/);
  assert.match(css, /#spBubble > \.ls-back \{/);
  assert.doesNotMatch(sm, /In the garden|in the garden/);
});

test('Misty\'s face: content when full of energy; neutral, sleepy or sad otherwise (page and 3D sprite)', () => {
  const herb = read('herb-tamagotchi.js'), hcss = read('herb-tamagotchi.css'), css = read('world-home.css'), sm = read('sun-meter.js'), wh = read('world-home.js');
  assert.match(herb, /<path class="lh-flat"/); assert.match(herb, /<path class="lh-frown"/);
  assert.match(hcss, /\.lh-flat,\.lh-calm,\.lh-frown\{display:none\}/);
  assert.match(herb, /<path class="lh-calm"/); assert.match(hcss, /\.lh-calm/);
  assert.match(css, /#spHome\[data-misty="thriving"\] #spBubble \.lh-calm[^{]*\{ display: inline; \}/);
  assert.match(css, /#spHome\[data-misty="weak"\] #spBubble \.lh-frown/);
  assert.match(css, /#spHome:is\(\[data-misty="tired"\], \[data-misty="weak"\]\) #spBubble \.lh-eyes[^{]*\{ transform: scaleY\(\.42\); animation: none; \}/);
  assert.match(sm, /if \(home && home\.dataset\.misty !== en\.tier\) home\.dataset\.misty = en\.tier;/);
  assert.match(wh, /if \(cs0\.display === 'none'\) \{ cs\[i\]\.remove\(\); return; \}/);
});

test('body trips wait while she is too tired; exploring progress still counts', () => {
  const bt = read('body-trips.js');
  assert.match(bt, /if \(Object\.keys\(got\)\.length && canStart\(st, now\) && !tooTired\(\)\)/);
  assert.match(bt, /if \(tooTired\(\)\) \{ try \{ if \(W\.LowiPraise && LowiPraise\.say\) LowiPraise\.say\(tr\('tired'\)\); \} catch \(e\) \{\} return false; \}/);
  assert.match(bt, /else if \(tooTired\(\)\) action = '<p class="bt-note">'/);
});

test('regression (E-man): the smile is hidden in every energy tier, and no tier rule ever shows it', () => {
  const css = read('world-home.css'), sm = read('sun-meter.js');
  const tiers = [...new Set([...sm.matchAll(/'(thriving|ok|tired|weak)'/g)].map(m => m[1]))].sort();
  assert.deepEqual(tiers, ['ok', 'thriving', 'tired', 'weak'], 'energy() has exactly these tiers');
  const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(m => ({sel: m[1], body: m[2]}));
  const hide = rules.filter(r => /\.lh-smile/.test(r.sel) && /display:\s*none/.test(r.body) && /data-misty/.test(r.sel));
  for (const t of tiers) assert.ok(hide.some(r => r.sel.includes('[data-misty="' + t + '"]')), 'smile hidden for tier ' + t);
  const show = rules.filter(r => /\.lh-smile/.test(r.sel) && /data-misty/.test(r.sel) && !/display:\s*none/.test(r.body));
  assert.deepEqual(show.map(r => r.sel.trim()), [], 'no energy-tier rule shows or restyles the smile');
  const herb = read('herb-tamagotchi.js');
  for (const c of ['lh-flat', 'lh-calm', 'lh-frown']) assert.match(herb, new RegExp('class="' + c + '"'), c + ' replaces the smile');
});

test('an energised trip visibly energises the world cells: grows over the hour and stays for the day', () => {
  const start = now - 30 * 60000;
  assert.equal(SUN.tended(null, now), 0);
  assert.equal(SUN.tended({start, vigor: 'thriving'}, now), 0.5, 'half way through the trip');
  assert.equal(SUN.tended({start, vigor: 'thriving'}, now + 3 * 36e5), 1, 'stays energised after she is back');
  assert.equal(SUN.tended({start, vigor: 'thriving', got: true}, now), 1);
  assert.equal(SUN.tended({start, vigor: 'ok', got: true}, now), 0.5, 'an okay trip helps half as much');
  const sc = read('body-world-3d-scene.js'), bw = read('body-world-3d.js');
  assert.match(sc, /const s = \(2\.2 \+ Math\.sin\(t \* 1\.6 \+ i\) \* 0\.25\) \* \(1 \+ 0\.45 \* tend\)/);
  assert.match(sc, /b\.core\.material\.color\.copy\(b\.hue\)\.lerp\(tendWhite, 0\.4 \* tend\)/);
  assert.match(bw, /world\.setTend\(W\.LowiSun && W\.LowiSun\.tendedNow \? W\.LowiSun\.tendedNow\(\) : 0\)/);
});
