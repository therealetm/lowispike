'use strict';
/* Bug hunt 23 Oct 2026 17:02 (Affiliates + read-aloud): the earnings page said "3 active recruits count like 15 sales, that's
   level 3 (25%)" while the level table right above it puts 15 sales on level 2. The level is right (access-core.js: every 3 active
   recruits add one more level), but the page never said so. The rule and the example now name that extra level, in EN/DE/ES. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const A = require('../affiliates/access-core.js'), B = require('../affiliates/blueprint-core.js');
const js = fs.readFileSync(path.join(__dirname, '..', 'affiliates', 'blueprint.js'), 'utf8');

test('the recruit rule names the extra level per 3 recruits in every language', () => {
  for (const lang of B.LANGS) {
    const s = B.t(lang, 'recruitRule', { n: A.RECRUIT.salesPerRecruit, k: A.RECRUIT.recruitsPerLevel });
    assert.ok(!/\{\w+\}/.test(s), lang + ': placeholder left in ' + s);
    assert.ok(s.includes(String(A.RECRUIT.recruitsPerLevel)), lang + ': no recruits-per-level number in ' + s);
  }
  assert.ok(js.includes("k: R.recruitsPerLevel"), 'blueprint.js passes recruitsPerLevel');
});

test('the recruit example agrees with the level table: credit level, then the bonus level', () => {
  const ex = A.progress(0, 3, B.TIERS);
  const tableLevel = B.TIERS.findIndex(t => ex.credit >= t.from && ex.credit <= t.to) + 1;
  assert.equal(ex.base, tableLevel, 'base level is the table level for the credited sales');
  assert.ok(ex.level > ex.base, 'the example shows a bonus level');
  for (const lang of B.LANGS) {
    const s = B.t(lang, 'recruitEx', { n: ex.credit, base: ex.base, level: ex.level, rate: Math.round(ex.rate * 100) + '%' });
    assert.ok(!/\{\w+\}/.test(s), lang + ': placeholder left in ' + s);
    const nums = (s.match(/\d+/g) || []).map(Number);
    assert.ok(nums.includes(ex.credit) && nums.includes(ex.base) && nums.includes(ex.level), lang + ': ' + s);
    assert.ok(s.indexOf(String(ex.base)) < s.lastIndexOf(String(ex.level)), lang + ': table level comes before the final level');
  }
  assert.ok(js.includes('base: ex.base'), 'blueprint.js passes the table level');
});
