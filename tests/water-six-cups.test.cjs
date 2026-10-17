// Oct 17 (Emmanuel): water is counted in cups, one tap = one cup, 6 cups a day, shown as "0/6 cups" like Meals and Move.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const K = require('../spirit-core.js');
global.LowiSpiritCore = K;
const LV = require('../living-home.js');
const C = require('../starter-core.js');
const R = require('../daily-ritual.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const now = new Date(2026, 9, 17, 12, 0).getTime();
const day = (water) => LV.model({ now, state: { logs: [], ledger: [], user: {} }, herb: {}, water });

test('the Home water goal is 6 cups: open below 6, reached at 6, still reached above', () => {
    assert.equal(day(0).waterGoal, 6);
    assert.equal(day(5).dayDone, 0, '5 cups is not the goal yet');
    assert.equal(day(6).dayDone, 0.25, '6 cups completes the water part of the day');
    assert.equal(day(9).dayDone, 0.25, 'more cups do not count twice');
    assert.equal(day(3).water, 3, 'a saved count from before the change is kept as it is');
});

test('starter plan and onboarding use the same 6-cup default', () => {
    assert.equal(C.isDone('water', { water: 5 }), false);
    assert.equal(C.isDone('water', { water: 6 }), true);
    assert.match(read('herb-start.js'), /waterGoal\)\|\|6\}/);
    assert.match(R.pickGoal({ water: 5, hour: 9 }, 'en').text, /1 cup of water/);
});

test('every water counter shows 6 and says cups', () => {
    assert.match(read('living-home.js'), /WATER_GOAL = 6/);
    assert.match(read('living-home.js'), /cups: \['cups', 'Gl\u00e4ser', 'vasos'\]/);
    assert.match(read('living-home.js'), /lv-unit/);
    assert.match(read('spirit.js'), /const WATER_GOAL = 6;/);
    assert.match(read('spirit.js'), /glasses: \['cups', /);
    assert.match(read('world-home.js'), /T\('cups', 'Gl\u00e4ser', 'vasos'\)/);
    assert.match(read('world-home.css'), /\.wh-unit/);
});

test('water XP stops at the goal: 2 XP per cup for the first 6 cups a day, taps after that add the cup but no XP', () => {
    const h = read('index.html');
    assert.ok(h.includes('{amt:2,perDay:6,src:"water",label:"Water logged"}'));
    assert.ok(!h.includes('perDay:8,src:"water"'));
    assert.ok(/if\(f\.waterEvents\[id\]\)return 0;/.test(h), 'the same tap id never counts twice');
});
