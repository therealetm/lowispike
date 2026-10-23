'use strict';
/* Oct 15: goals vs conditions on the onboarding goals screen and in Profile, chips that light up, cravings question wording */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const C = require('../starter-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');

test('"I want" holds only goals phrased as goals; conditions are their own optional group', () => {
  const m = html.match(/const GOAL_TAGS = (\[.*?\]\]);/), c = html.match(/const COND_TAGS = (\[.*?\]\]);/);
  const goals = JSON.parse(m[1]), conds = JSON.parse(c[1]);
  assert.deepEqual(goals.map(g => g[1]), ['Fewer cravings', 'More energy', 'Better skin', 'Lose weight', 'Steadier blood sugar', 'Just eat better']);
  assert.deepEqual(conds.map(g => g[0]), ['PCOS', 'Insulin resistance', 'Pre-diabetes']);
  for (const g of goals) assert(!/pcos|insulin|diabet/i.test(g[1]), g[1]);
  /* stored keys of old goals are unchanged, so old profiles keep their picks */
  for (const k of ['Cravings', 'Energy', 'Skin', 'Weight', 'Just eat better']) assert(goals.some(g => g[0] === k), k);
  assert(html.includes('Anything we should look out for? <span>(optional)</span>'));
  assert(html.includes('["Anything we should look out for?", "Worauf sollen wir achten?", "¿Algo que debamos tener en cuenta?"]'));
  assert(html.includes('["None of these", "Nichts davon", "Nada de esto"]'));
  for (const row of [['Fewer cravings', 'Weniger Heißhunger'], ['More energy', 'Mehr Energie'], ['Better skin', 'Bessere Haut'], ['Lose weight', 'Gewicht verlieren'], ['Steadier blood sugar', 'Stabiler Blutzucker']])
    assert(html.includes('["' + row[0] + '", "' + row[1] + '"'), row[0]);
  assert(!html.includes('["Lose weight", "Abnehmen"'), 'one German label for Lose weight');
});

test('old saved picks are migrated, nothing is dropped', () => {
  assert(html.includes('"Less sugar cravings":"Cravings"') && html.includes('"Steady energy":"Energy"') && html.includes('"Eat healthier":"Just eat better"'));
  assert(/S\.health\.pcos && S\.user\.gender !== "m" && out\.indexOf\("PCOS"\) < 0\) out\.push\("PCOS"\)/.test(html));
});

test('picked chips light up and say so (aria-pressed), also in light mode and with reduced motion', () => {
  assert(html.includes('.r2-chip.r2-chip.on,'));
  assert(/\.r2-chip\.r2-chip\.on,[^{]*\{[^}]*box-shadow:0 0 0 3px rgba\(92,255,192/.test(html));
  assert(html.includes('html[data-ui=light] .r2-chip.r2-chip.on'));
  assert(html.includes('@media (prefers-reduced-motion:reduce){.r2-chip.r2-chip{transition:none}'));
  assert(!/\.r2-chip\.r2-chip\{transition:[^}]*background/.test(html), 'colour change is instant, not faded');
  for (const a of ['data-r2g="', 'data-r2tag="', 'data-r2etag="']) assert(new RegExp('aria-pressed="\' \\+ [^>]+' + a).test(html), a);
  assert(html.includes('const pz = (b, on) => { if (!b) return; b.classList.toggle("on", !!on); b.setAttribute("aria-pressed", !!on); };'));
});

test('the cravings question asks about cravings, same options and stored values', () => {
  const q = C.QUESTIONS.find(x => x.id === 'hard');
  assert.equal(q.q.de, 'Wann ist dein Heißhunger am stärksten?');
  assert.equal(q.q.en, 'When are your cravings strongest?');
  assert.equal(q.q.es, '¿Cuándo son más fuertes tus antojos?');
  assert.deepEqual(q.opts.map(o => o[0]), ['morning', 'afternoon', 'evening', 'late', 'varies']);
  assert.deepEqual(q.opts.map(o => o[1].de), ['Morgens', 'Nachmittags', 'Abends', 'Spät in der Nacht', 'Ganz unterschiedlich']);
  for (const l of ['en', 'de', 'es']) assert(C.questionText(q, l).sub, l);
  assert(!JSON.stringify(C.WHY).includes('schwersten'));
});
