// Oct 26 2026, Emmanuel (call, ~23:30): "One of my beta users only uses her phone at the end of the day when she's about to go to
// sleep ... she can barely use our app, but she wants to. We need to make our app so that even those who weren't able to use the
// app throughout the day can catch up at the end of the day." She is pushing 80: very simple. "A checklist game ... points after
// points after points, animation and everything ... the best bubble checklist ever." (MAYA-HANDOFF 0.39)
// These tests keep: the bubbles and their order, skipping what today already has, her usual foods first, the approximate times,
// points from the app's own reward table (no farming), the plain read-back, when the greeting shows, recorded lines in EN/DE/ES
// that never say the app's name or "Misty", and the wiring (Settings row, page, offline cache).
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const C = require(path.join(root, 'evening-catchup-core.js'));
const ui = fs.readFileSync(path.join(root, 'evening-catchup.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'evening-catchup.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const hs = fs.readFileSync(path.join(root, 'home-settings-sleep-v2.js'), 'utf8');
const phrases = fs.readFileSync(path.join(root, 'tools/app-voice/phrases.cjs'), 'utf8');

const at = (h, m, d) => new Date(2026, 9, d || 26, h, m || 0, 0).getTime();
const DAY = C.dayKey(at(12));
const log = (t, h, o) => Object.assign({ t, ts: at(h), day: C.dayKey(at(h)) }, o || {});

test('six bubbles in the order he described: breakfast, lunch, dinner, snacks, water, movement', () => {
    assert.deepStrictEqual(C.ORDER, ['breakfast', 'lunch', 'dinner', 'snack', 'water', 'move']);
    for (const l of C.LANGS) for (const s of C.ORDER) { assert.ok(C.TX[l].name[s], l + ' ' + s); assert.ok(C.TX[l].q[s], l + ' q ' + s); }
});

test('a bubble today already has is left out: a meal at that time of day, six glasses, or a Move range', () => {
    assert.deepStrictEqual(C.needed({ logs: [], day: DAY }), C.ORDER);
    const logs = [log('Eggs', 8), log('Soup', 13), log('Nuts', 21, { slot: 'snack' })];
    assert.deepStrictEqual(C.needed({ logs, day: DAY, water: 6, moved: true }), ['dinner']);
    /* yesterday does not count */
    assert.deepStrictEqual(C.needed({ logs: [log('Eggs', 8, { day: '2026-10-25', ts: at(8, 0, 25) })], day: DAY }).includes('breakfast'), true);
});

test('the time of day a log belongs to', () => {
    assert.strictEqual(C.slotOf(log('x', 7)), 'breakfast');
    assert.strictEqual(C.slotOf(log('x', 12)), 'lunch');
    assert.strictEqual(C.slotOf(log('x', 16)), 'snack');
    assert.strictEqual(C.slotOf(log('x', 19)), 'dinner');
    assert.strictEqual(C.slotOf(log('x', 19, { slot: 'snack' })), 'snack');
});

test('her usual foods for that time of day come first, then simple ones, four big choices at most, no repeats', () => {
    const now = at(22);
    const logs = [log('Rye bread with cheese', 8, { ts: at(8, 0, 20), day: '2026-10-20' }), log('Rye bread with cheese', 8, { ts: at(8, 0, 22), day: '2026-10-22' }),
        log('Porridge', 7, { ts: at(7, 0, 24), day: '2026-10-24' }), log('Steak', 19, { ts: at(19, 0, 24), day: '2026-10-24' })];
    const c = C.choices('breakfast', { lang: 'en', logs, now });
    assert.strictEqual(c.length, 4);
    assert.strictEqual(c[0].label, 'Rye bread with cheese'); assert.ok(c[0].usual);
    assert.strictEqual(c[1].label, 'Porridge'); assert.ok(c[1].usual);
    assert.ok(!c.some(x => x.label === 'Steak'), 'a dinner is not a breakfast choice');
    assert.strictEqual(new Set(c.map(x => x.label.toLowerCase())).size, c.length);
    /* German shows German common foods */
    assert.ok(C.choices('lunch', { lang: 'de', logs: [], now }).some(x => x.label === 'Suppe'));
    assert.ok(C.choices('dinner', { lang: 'es', logs: [], now }).some(x => x.label === 'Pescado con verduras'));
    /* something older than 30 days is not "usual" */
    assert.ok(!C.choices('breakfast', { lang: 'en', logs: [log('Old toast', 8, { ts: at(8, 0, 1) - 40 * 864e5 })], now }).some(x => x.usual));
});

test('water and movement are big clear amounts, with the step ranges the Move bubble already uses', () => {
    assert.deepStrictEqual(C.choices('water', { lang: 'en' }).map(x => x.label), ['1 glass', '2 glasses', '3 glasses', '4 or more']);
    assert.deepStrictEqual(C.choices('move', { lang: 'en' }).map(x => x.level), ['casual', 'steady', 'epic']);
    const M = require(path.join(root, 'move-estimate-core.js'));
    for (const id of C.MOVE_OPTS) assert.ok(M.level ? M.level(id) : (M.LEVELS || []).find(l => l.id === id), id + ' is a real Move level');
});

test('entries go in at the approximate time of day, never in the future, in the order of the day', () => {
    const now = at(22, 15);
    assert.strictEqual(new Date(C.atFor('breakfast', now)).getHours(), 8);
    assert.strictEqual(new Date(C.atFor('lunch', now)).getHours(), 12);
    assert.strictEqual(new Date(C.atFor('dinner', now)).getHours(), 18);
    const early = at(10, 0); assert.ok(C.atFor('dinner', early) < early, 'clamped to before now');
    const p = C.plan([{ slot: 'dinner', label: 'Soup', data: { t: 'Soup' } }, { slot: 'water', cups: 2 }, { slot: 'breakfast', label: 'Eggs', data: { t: 'Eggs' } }, { slot: 'lunch', skip: true }], now);
    assert.deepStrictEqual(p.map(x => x.slot), ['breakfast', 'dinner', 'water']);
    assert.ok(p[0].at < p[1].at);
    assert.strictEqual(C.entryId(DAY, 'dinner'), 'catchup-' + DAY + '-dinner');
});

test('points follow the app reward table: 15 a meal, 0 for a likely spike, a duplicate or past the cap; 2 a glass to six; Move by range', () => {
    const meals = [{ slot: 'breakfast', data: { t: 'Eggs', lvl: 'low' } }, { slot: 'lunch', data: { t: 'Pasta', lvl: 'high' } }, { slot: 'dinner', data: { t: 'Fish' } }];
    let pv = C.preview(meals, { mealsToday: 0 });
    assert.deepStrictEqual([pv.breakfast, pv.lunch, pv.dinner], [15, 0, 15]);
    pv = C.preview(meals, { mealsToday: 7 });
    assert.deepStrictEqual([pv.breakfast, pv.dinner], [15, 0], 'the 8-meal cap counts the picks before it');
    pv = C.preview([{ slot: 'dinner', data: { t: 'Fish' } }], { why: () => 'dup' });
    assert.strictEqual(pv.dinner, 0, 'the bridge says duplicate: no points shown');
    assert.strictEqual(C.preview([{ slot: 'water', cups: 4 }], { water: 0, waterHave: 0 }).water, 8);
    assert.strictEqual(C.preview([{ slot: 'water', cups: 4 }], { water: 4, waterHave: 4 }).water, 4, 'six glasses a day at most');
    assert.strictEqual(C.preview([{ slot: 'move', level: 'steady' }], { movePlan: () => ({ xp: 11, back: 0, action: 'new' }) }).move, 11);
    assert.strictEqual(C.preview([{ slot: 'move', level: 'casual' }], { movePlan: () => ({ xp: 5, back: 0, action: 'same' }) }).move, 0);
    assert.strictEqual(C.MEAL_XP, 15); assert.strictEqual(C.MEAL_CAP, 8); assert.strictEqual(C.WATER_XP, 2); assert.strictEqual(C.WATER_CAP, 6);
});

test('the bonus is small, once a day, and needs at least two real things', () => {
    assert.ok(C.BONUS.xp <= 15);
    const two = [{ slot: 'breakfast', data: {} }, { slot: 'water', cups: 1 }];
    assert.ok(C.bonusDue(two, [], DAY));
    assert.ok(!C.bonusDue([{ slot: 'breakfast', data: {} }, { slot: 'lunch', skip: true }], [], DAY), 'a skip is not a thing');
    assert.ok(!C.bonusDue(two, [{ eventId: C.bonusId(DAY) }], DAY), 'once a day');
    assert.strictEqual(C.total({ a: 15, b: 4 }, true), 15 + 4 + C.BONUS.xp);
});

test('the day is read back in plain words, with the honest spike wording', () => {
    const rows = C.summary([{ slot: 'dinner', label: 'Pasta', data: { t: 'Pasta', lvl: 'high' } }, { slot: 'breakfast', label: 'Eggs', data: { t: 'Eggs' } }, { slot: 'move', level: 'casual' }, { slot: 'water', cups: 3, label: '3 glasses' }], 'en');
    assert.deepStrictEqual(rows.map(r => r.line), ['Morning: Eggs', 'Evening: Pasta', 'Water: 3 glasses', 'Movement: A little']);
    assert.strictEqual(rows[1].spike, true); assert.strictEqual(rows[0].spike, false);
    for (const l of C.LANGS) assert.match(C.TX[l].spike, /blood sugar|Blutzucker|az\u00facar en sangre/);
});

test('the greeting: in the evening with at most one meal, or from mid-afternoon with nothing; once a day; not before setup', () => {
    const g = o => C.shouldGreet(Object.assign({ logs: [], state: {}, onboarded: true }, o));
    assert.strictEqual(g({ now: at(19, 30) }), true);
    assert.strictEqual(g({ now: at(19, 30), logs: [log('Eggs', 8)] }), true);
    assert.strictEqual(g({ now: at(19, 30), logs: [log('Eggs', 8), log('Soup', 13)] }), false, 'a full day needs no nudge');
    assert.strictEqual(g({ now: at(16) }), true, 'nothing at all by mid-afternoon');
    assert.strictEqual(g({ now: at(16), logs: [log('Eggs', 8)] }), false);
    assert.strictEqual(g({ now: at(10) }), false, 'not in the morning');
    assert.strictEqual(g({ now: at(20), state: { seen: DAY } }), false, 'once a day; Not now counts');
    assert.strictEqual(g({ now: at(20), state: { done: DAY } }), false);
    assert.strictEqual(g({ now: at(20), onboarded: false }), false);
});

test('the companion says every line out loud from recordings, in all three languages, never the app name or Misty', () => {
    for (const l of C.LANGS) {
        assert.ok(C.SAY[l].length >= 14, l);
        for (const s of C.SAY[l]) { assert.doesNotMatch(s, /misty|lowi|spike/i, l + ': ' + s); }
        assert.ok(C.SAY[l].includes(C.TX[l].greet));
        for (const c of C.CHEER[l]) assert.ok(C.SAY[l].includes(c));
    }
    assert.match(phrases, /evening-catchup-core\.js/);
    const data = fs.readFileSync(path.join(root, 'app-voice-data.js'), 'utf8');
    const PH = require(path.join(root, 'tools/app-voice/phrases.cjs'));
    const list = PH.harvest ? PH.harvest() : null;
    assert.ok(list);
    assert.ok(list.src['evening-catchup'] >= 40);
    const has = (l, s) => { const o = list.out[l]; return o && (typeof o.has === 'function' ? o.has(s) : Object.prototype.hasOwnProperty.call(o, s)); };
    /* the voice records sentence by sentence */
    for (const l of C.LANGS) for (const s of C.SAY[l]) assert.ok(has(l, s) || s.split(/(?<=[.!?])\s+/).every(x => has(l, x)), 'harvested: ' + s);
    assert.ok(data.length > 1000);
    /* cheers shuffle and never repeat back to back */
    let last = ''; for (let k = 0; k < 40; k++) { const c = C.cheer('en', last); assert.notStrictEqual(c, last); last = c; }
});

test('no "Misty" anywhere in the catch-up, and the companion is "your companion"', () => {
    for (const s of [ui, fs.readFileSync(path.join(root, 'evening-catchup-core.js'), 'utf8')]) assert.doesNotMatch(s.replace(/\/\*[\s\S]*?\*\//g, ''), /Misty/);
    assert.strictEqual(C.TX.en.companion, 'Your companion');
});

test('saving goes through the app own code with stable ids, at the time of day, and nothing saves before Save', () => {
    assert.match(ui, /b\.logMeal\(d\)/);
    assert.match(ui, /LowiMealCtx = \{ from: 'when', ateAt: p\.at/);
    assert.match(ui, /b\.water\(C\.entryId\(day, 'water'\)/);
    assert.match(ui, /LowiMoveBubble\.pick\(p\.level/);
    assert.match(ui, /awardWith\(C\.BONUS\.xp, C\.BONUS\.label, C\.BONUS\.src, C\.bonusId\(day\)/);
    /* pick() only stores a draft; logMeal is only called from save() */
    const pickFn = ui.slice(ui.indexOf('function pick(p)'), ui.indexOf('function pop('));
    assert.doesNotMatch(pickFn, /logMeal|water\(|awardWith/);
});

test('made for about 80: big targets and text, one thing per screen, VoiceOver labels, Reduce Motion, back steps back', () => {
    assert.match(css, /\.ec-opt \{[^}]*min-height: 72px/);
    assert.match(css, /\.ec-big \{[^}]*min-height: 76px/);
    assert.match(css, /\.ec-ov \{[^}]*font-size: 22px/);
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.match(ui, /role', 'dialog'/); assert.match(ui, /aria-modal', 'true'/);
    assert.match(ui, /aria-label="' \+ esc\(C\.fill\(T\.bubbleLabel/);
    assert.match(ui, /data-back-step/);
    assert.match(ui, /e\.key !== 'Escape'/);
    /* the bubble stands still: no chasing (only its arrival and a glow) */
    assert.doesNotMatch(css, /@keyframes ecDrift \{[^}]*infinite/);
    assert.doesNotMatch(css, /\.ec-drift \{[^}]*ecDrift[^,]*infinite/);
});

test('wiring: the page loads it, the offline cache keeps it, Settings has "Catch up on today" first in three languages', () => {
    assert.match(html, /<script src="evening-catchup-core\.js\?v=/);
    assert.match(html, /<script src="evening-catchup\.js\?v=/);
    assert.match(html, /href="evening-catchup\.css\?v=/);
    assert.ok(html.indexOf('evening-catchup-core.js') < html.indexOf('evening-catchup.js?'));
    assert.match(sw, /"evening-catchup-core\.js", "evening-catchup\.js", "evening-catchup\.css"/);
    assert.match(hs, /SETTINGS_IDS = \['catchUp', /);
    assert.match(hs, /catchUp: 'Catch up on today'/); assert.match(hs, /catchUp: 'Heute nachtragen'/); assert.match(hs, /catchUp: 'Ponerme al d\\u00eda'/);
    assert.match(hs, /catchUp: \{ has: \(\) => !!\(root\.LowiEveningCatchup/);
});
