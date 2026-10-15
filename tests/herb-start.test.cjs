'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const C = require('../starter-core.js'), HI = require('../herb-identity-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('the first interview is 3 to 5 optional questions, no health diagnoses', () => {
    assert(C.QUESTIONS.length >= 3 && C.QUESTIONS.length <= 5);
    const words = JSON.stringify(C.QUESTIONS).toLowerCase();
    for (const bad of ['diabet', 'insulin', 'medic', 'diagnos', 'disease', 'krank', 'blood pressure', 'weight in']) assert(!words.includes(bad), bad);
    for (const q of C.QUESTIONS) for (const l of ['en', 'de', 'es']) {
        const t = C.questionText(q, l);
        assert(t.over && t.q && t.opts.length >= 2, q.id + ' ' + l);
        for (const o of t.opts) assert(o.t, q.id + '.' + o.v + ' ' + l);
    }
});

test('skipping every question still gives 3 sensible next actions', () => {
    const p = C.newPlan({});
    assert.equal(p.actions.length, 3);
    assert.deepEqual(p.actions.map(a => a.id), ['scan', 'move', 'water']);
    for (const a of p.actions) assert(C.WHY[a.why], a.why);
});

test('answers shape the plan, pace gives 3 or 4, never more', () => {
    const p = C.buildPlan({hard: 'morning', active: 'sit', fast: 'never', pace: '4'});
    assert.equal(p.length, 4);
    assert.deepEqual(p.map(a => a.id), ['meal', 'move', 'fast12', 'water']);
    assert.equal(p[0].why, 'mealMorning');
    assert.equal(p[1].why, 'moveSit');
    const q = C.buildPlan({hard: 'evening', fast: 'long', pace: '4'});
    assert.equal(q[0].why, 'scanEvening');
    assert.equal(q.filter(a => a.id === 'water').length, 1, 'no duplicate actions');
    assert(q.length >= 3 && q.length <= 4);
    assert.equal(C.buildPlan({pace: 'x', hard: 'nope'}).length, 3, 'unknown answers are dropped');
});

test('every action names an existing module and every why has all three languages', () => {
    const mods = new Set(['scan', 'meal', 'water', 'move', 'fast', 'macros']);
    for (const [id, a] of Object.entries(C.ACTIONS)) {
        assert(mods.has(a.mod), id);
        for (const l of ['en', 'de', 'es']) assert(C.actionText(id, l, {goal: 8}).length > 3, id + ' ' + l);
    }
    for (const [k, w] of Object.entries(C.WHY)) for (const l of ['en', 'de', 'es']) assert(w[l] && w[l].length > 10, k + ' ' + l);
    assert.match(C.actionText('water', 'de', {goal: 6}), /6 Gl/);
});

test('done is read from module facts, the plan stores no done state', () => {
    const p = C.newPlan({fast: 'f12'});
    assert(!('done' in p));
    const f = {scanned: true, moved: false, water: 3, waterGoal: 8, meals: 1, macros: [{earned: false}], fastH: 14.2};
    assert.equal(C.isDone('scan', f), true);
    assert.equal(C.isDone('move', f), false);
    assert.equal(C.isDone('water', f), false);
    assert.equal(C.isDone('water', Object.assign({}, f, {water: 8})), true);
    assert.equal(C.isDone('fast14', f), true);
    assert.equal(C.isDone('fast16', f), false);
    assert.equal(C.isDone('fast16', {fastBestTodayH: 16.1}), true);
    assert.equal(C.isDone('meals3', f), false);
    assert.equal(C.isDone('macros', {macros: [{earned: true}]}), true);
    assert.equal(C.isDone('nope', f), false);
});

test('actions are editable: change, add up to 4, remove down to 3, one fasting action at most', () => {
    const p = C.newPlan({fast: 'never'});
    assert.deepEqual(p.actions.map(a => a.id), ['scan', 'move', 'fast12']);
    const alts = C.alternatives(p);
    assert(!alts.includes('fast14') && !alts.includes('scan'));
    C.replace(p, 1, 'macros');
    assert.deepEqual(p.actions[1], {id: 'macros', why: 'picked'});
    C.replace(p, 0, 'macros');
    assert.equal(p.actions[0].id, 'scan', 'no duplicates by replace');
    C.addAction(p, 'water'); C.addAction(p, 'meal');
    assert.equal(p.actions.length, 4);
    C.removeAction(p, 3); C.removeAction(p, 2);
    assert.equal(p.actions.length, 3, 'never fewer than 3');
});

test('"what makes this hard?" only comes after that friction shows up, once', () => {
    const p = C.newPlan({fast: 'f16'});
    assert.equal(C.frictionDue(p, {}), null, 'nothing up front');
    assert.equal(C.frictionDue(p, {planAgeDays: 0, movedYesterday: false}), null, 'not on day one');
    assert.equal(C.frictionDue(p, {planAgeDays: 1, movedYesterday: false}), 'move');
    assert.equal(C.frictionDue(p, {spikeRecent: true, planAgeDays: 1, movedYesterday: false}), 'eat', 'one at a time');
    C.answerFriction(p, 'eat', null);
    assert.equal(p.asked.eat, 'skip');
    assert.equal(C.frictionDue(p, {spikeRecent: true}), null, 'not now is respected');
    C.answerFriction(p, 'fast', 'hungry');
    assert.equal(p.actions.find(a => C.ACTIONS[a.id].mod === 'fast').id, 'fast14', 'a short fast steps the goal down');
    assert(p.actions.length <= 4);
    C.answerFriction(p, 'move', 'tired');
    assert.equal(p.actions.find(a => a.id === 'move').why, 'moveTiny');
    const q = C.newPlan({});
    C.answerFriction(q, 'eat', 'skip');
    assert(q.actions.some(a => a.id === 'meals3' && a.why === 'eatSkip'));
    for (const k of Object.keys(C.FRICTION)) for (const l of ['en', 'de', 'es']) assert(C.frictionText(k, l).q, k + l);
});

test('herb names come from the shipped herb-identity pool and shuffle', () => {
    const pool = C.namePool(HI);
    assert(pool.length > 50);
    const a = C.suggestName(HI, 3), b = C.suggestName(HI, 4, a);
    assert(pool.includes(a) && pool.includes(b));
    assert.notEqual(C.suggestName(HI, 3, a), a, 'shuffle avoids the current name');
    assert.equal(C.cleanName('  <b>Misty\n Moon</b>  '), 'bMisty Moon/b');
    assert.equal(C.cleanName('x'.repeat(40)).length, 24);
});

test('wiring: gate hook, setup hook, loader, offline cache, and auth handoff untouched', () => {
    const idx = read('index.html');
    assert(idx.includes('LowiHerbStart.want(back)) return LowiHerbStart.html();'));
    assert(idx.indexOf('hs-hook: herb-first start') < idx.indexOf('/* a2-hook */'), 'herb-first comes before the old start carousel');
    assert(idx.includes('LowiHerbStart.afterSetup()'));
    const ui = read('apple-ui.js');
    assert(ui.indexOf("'starter-core.js','herb-start.js'") > ui.indexOf("'herb-identity-core.js'"));
    const sw = read('sw.js');
    for (const f of ['starter-core.js', 'herb-start.js', 'herb-start.css']) assert(sw.includes('"' + f + '"'), f);
    const js = read('herb-start.js');
    assert(!/auth-handoff|LowiAuthHandoff/i.test(js), 'does not touch the sign-in handoff');
    assert(/s\.setupDone\|\|\(s\.logs&&s\.logs\.length\)\)return false/.test(js), 'existing users never see herb-first');
    assert(/isAccount\(\)\)return false/.test(js));
    assert(js.includes('if(plan()||(S()||{}).starter)return;setTimeout(ivOpen'), 'the questions are offered once');
    assert(/herb-first:planted/.test(js), 'first reward is once ever');
    assert(/prefers-reduced-motion:reduce/.test(read('herb-start.css')));
});
