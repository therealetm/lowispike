/* Personal habit nudges (Oct 24, 2026): habit-nudges-core.js rules + the wiring in index.html / sw.js / the tutorial. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../habit-nudges-core.js');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const at = (d, h, m) => new Date(2026, 9, d, h, m || 0).getTime(); /* October 2026, local time */
const MIN = 6e4, HOUR = 36e5;

test('water: a fresh morning open around the usual first open is a moment', () => {
    const opens = [19, 20, 21, 22, 23].map(d => at(d, 7, 40));
    const now = at(24, 7, 50);
    const r = C.water({ now, cups: 0, goal: 6, waters: [], opens: opens.concat([now]), event: 'open', eventAt: now });
    assert.equal(r.moment, 'morning');
    assert.equal(r.cue, true);
});

test('water: an open far from the usual first open is not a morning moment', () => {
    const opens = [19, 20, 21, 22, 23].map(d => at(d, 7, 40));
    const now = at(24, 10, 30);
    const r = C.water({ now, cups: 2, goal: 6, waters: [], opens: opens.concat([now]), event: 'open', eventAt: now });
    assert.notEqual(r.moment, 'morning');
});

test('water: without history, only a first open before 11 counts as the morning moment', () => {
    const now = at(24, 8, 10);
    assert.equal(C.water({ now, cups: 0, goal: 6, waters: [], opens: [now], event: 'open', eventAt: now }).moment, 'morning');
    const late = at(24, 15, 0);
    assert.notEqual(C.water({ now: late, cups: 3, goal: 6, waters: [], opens: [late], event: 'open', eventAt: late }).moment, 'morning');
});

test('water: just after a meal is a moment; a stale meal event is not', () => {
    const now = at(24, 13, 0);
    assert.equal(C.water({ now, cups: 2, goal: 6, waters: [at(24, 9)], opens: [], event: 'meal', eventAt: now - 2 * MIN }).moment, 'meal');
    assert.equal(C.water({ now, cups: 2, goal: 6, waters: [at(24, 9)], opens: [], event: 'meal', eventAt: now - 30 * MIN }).moment === 'meal', false);
});

test('water: nothing when the goal is met, just after a sip, or in quiet hours', () => {
    const now = at(24, 13, 0);
    assert.deepEqual(C.water({ now, cups: 6, goal: 6, waters: [], opens: [], event: 'meal', eventAt: now }), { cue: false, moment: '' });
    assert.deepEqual(C.water({ now, cups: 1, goal: 6, waters: [now - 20 * MIN], opens: [], event: 'meal', eventAt: now }), { cue: false, moment: '' });
    const night = at(24, 23, 10);
    assert.deepEqual(C.water({ now: night, cups: 0, goal: 6, waters: [], opens: [night], event: 'open', eventAt: night, qs: 22, qe: 7 }), { cue: false, moment: '' });
});

test('water: the person\'s own usual water hour is a moment', () => {
    const waters = [19, 20, 21, 22].map(d => at(d, 16, 10));
    const r = C.water({ now: at(24, 16, 20), cups: 3, goal: 6, waters: waters.concat([at(24, 12, 0)]), opens: [] });
    assert.equal(r.moment, 'habit');
});

test('water: behind pace for hours shows the quiet cue without a spoken moment', () => {
    const r = C.water({ now: at(24, 15, 0), cups: 1, goal: 6, waters: [at(24, 9, 0)], opens: [] });
    assert.equal(r.cue, true);
    assert.equal(r.moment, '');
});

test('habitHours and firstOpen need at least 3 different days and ignore today', () => {
    const now = at(24, 12);
    assert.deepEqual(C.habitHours([at(22, 9), at(23, 9), at(24, 9)], now), []);
    assert.deepEqual(C.habitHours([at(21, 9), at(22, 9, 30), at(23, 9, 5)], now), [9]);
    assert.equal(C.firstOpen([at(22, 8), at(23, 8)], now), null);
    assert.equal(C.firstOpen([at(21, 7), at(21, 12), at(22, 8), at(23, 9)], now), 8 * 60);
});

test('shop: follows only the rhythm the person typed', () => {
    const sat = at(24, 10); /* Oct 24, 2026 is a Saturday */
    assert.equal(new Date(sat).getDay(), 6);
    assert.deepEqual(C.shop({ now: sat, plan: {} }), { cue: false, moment: '' });
    assert.deepEqual(C.shop({ now: sat, plan: { every: 7, days: [6] }, lastShop: at(17, 11) }), { cue: true, moment: 'shop' });
    assert.equal(C.shop({ now: sat, plan: { every: 7, days: [3] }, lastShop: at(17, 11) }).cue, false, 'not a usual shop day');
    assert.equal(C.shop({ now: sat, plan: { every: 7, days: [6] }, lastShop: at(24, 9) }).cue, false, 'already shopped today');
    assert.equal(C.shop({ now: sat, plan: { every: 3, days: [] }, lastShop: at(21, 10) }).cue, true, 'every 3 days, 3 days since');
    assert.equal(C.shop({ now: sat, plan: { every: 3, days: [] }, lastShop: at(23, 10) }).cue, false);
    assert.equal(C.shop({ now: sat, plan: { every: 3, days: [] } }).cue, false, 'no last shop and no weekdays: no guess');
    assert.equal(C.shop({ now: at(24, 20), plan: { every: 7, days: [6] } }).moment, '', 'no spoken line in the evening');
});

test('log: only with a living meal-logging rhythm, and not when meal reminders are on', () => {
    const meals = [19, 20, 21, 22, 23].map(d => at(d, 12, 30));
    assert.deepEqual(C.logMeal({ now: at(24, 15), meals }), { cue: true, moment: 'log' });
    assert.equal(C.logMeal({ now: at(24, 15), meals, snapOn: true }).moment, '', 'meal photo reminders already cover it');
    assert.equal(C.logMeal({ now: at(24, 15), meals: meals.concat([at(24, 13)]) }).cue, false, 'logged today');
    assert.equal(C.logMeal({ now: at(24, 13), meals }).cue, false, 'not 2 h past the usual time yet');
    assert.equal(C.logMeal({ now: at(24, 15), meals: [at(22, 12), at(23, 12)] }).cue, false, 'no rhythm yet');
    assert.equal(C.logMeal({ now: at(31, 15), meals: [10, 11, 12, 13].map(d => at(d, 12, 30)) }).cue, false, 'gave up logging: leave it');
});

test('spoken lines: reminders off, quiet hours, 2 a day, 1 on Rarely, 3 h apart, one per habit', () => {
    let s = C.fresh(); const o = { remindersOn: true, freq: 'normal', qs: 22, qe: 7 };
    assert.equal(C.canSay(s, 'water', at(24, 9), Object.assign({}, o, { remindersOn: false })), false);
    assert.equal(C.canSay(s, 'water', at(24, 23), o), false);
    assert.equal(C.canSay(s, 'water', at(24, 9), o), true);
    C.markSaid(s, 'water', at(24, 9));
    assert.equal(C.canSay(s, 'water', at(24, 14), o), false, 'one per habit per day');
    assert.equal(C.canSay(s, 'shop', at(24, 10), o), false, '3 h apart');
    assert.equal(C.canSay(s, 'shop', at(24, 12, 30), Object.assign({}, o, { freq: 'few' })), false, 'Rarely: 1 a day');
    assert.equal(C.canSay(s, 'shop', at(24, 12, 30), o), true);
    C.markSaid(s, 'shop', at(24, 12, 30));
    assert.equal(C.canSay(s, 'log', at(24, 17), o), false, '2 a day');
    assert.equal(C.canSay(s, 'water', at(25, 8), o), true, 'a new day');
});

test('state: noteOpen counts once per 20 min, noteCups records a rise only, old marks are pruned', () => {
    const s = C.fresh();
    C.noteOpen(s, at(24, 8)); C.noteOpen(s, at(24, 8, 10)); C.noteOpen(s, at(24, 8, 30));
    assert.equal(s.hist.open.length, 2);
    assert.equal(C.noteCups(s, 0, at(24, 8)), false);
    assert.equal(C.noteCups(s, 1, at(24, 9)), true);
    assert.equal(C.noteCups(s, 1, at(24, 9, 5)), false);
    assert.equal(C.noteCups(s, 1.1, at(24, 9, 6)), true, 'a sip (10 sips per glass) counts too');
    assert.equal(C.noteCups(s, 0.5, at(25, 9)), true, 'a new day starts from zero');
    s.hist.open.unshift(at(1, 8));
    C.prune(s, at(25, 10));
    assert.equal(s.hist.open.indexOf(at(1, 8)), -1);
    const n = C.normalize(JSON.parse(JSON.stringify(s)));
    assert.equal(n.hist.water.length, 3);
    assert.equal(C.normalize('junk').cues, true);
    assert.equal(C.normalize({ cues: false }).cues, false);
});

test('lines: every moment in every language, rotating, first person, never a fixed companion name or a scolding', () => {
    const moments = ['morning', 'meal', 'habit', 'break', 'shop', 'log'];
    for (const l of C.LANGS) for (const m of moments) {
        const set = C.LINES[l][m];
        assert.ok(set && set.length >= 2, l + ' ' + m);
        for (const t of set) {
            assert.doesNotMatch(t, /misty/i, 'no fixed name: ' + t);
            assert.doesNotMatch(t, /\b(you forgot|don't forget|du hast vergessen|vergiss nicht|olvidaste|no olvides|must|musst|debes)\b/i, 'no scolding: ' + t);
            assert.ok(t.length <= 110, 'short enough for the speech bubble: ' + t);
        }
    }
    const s = C.fresh();
    const a = C.line(s, 'shop', 'de'), b = C.line(s, 'shop', 'de');
    assert.notEqual(a, b);
    assert.equal(C.line(s, 'shop', 'fr'), C.LINES.en.shop[0], 'unknown language falls back to English');
    for (const m of moments) assert.ok(C.HABIT[m]);
});

test('wiring: loaded in index.html, cached by the service worker, row in the reminder sheet, N1 leaves water to the companion', () => {
    const html = read('index.html'), sw = read('sw.js');
    for (const f of ['habit-nudges-core.js', 'habit-nudges.js', 'habit-nudges.css']) {
        assert.match(html, new RegExp(f.replace('.', '\\.') + '\\?v='), f + ' in index.html');
        assert.ok(sw.split(f).length - 1 >= 2, f + ' in both sw.js lists');
    }
    assert.match(html, /LowiHabitNudge \? LowiHabitNudge\.rowHTML\(\)/);
    assert.match(html, /q\.id === "water"\) \{ if \(window\.LowiHabitNudge && LowiHabitNudge\.ownsWater/);
    const ui = read('habit-nudges.js');
    assert.doesNotMatch(ui, /Notification\.requestPermission|pushManager|showNotification/, 'no new push notifications');
    assert.doesNotMatch(ui, /supabase|fetch\(/i, 'nothing leaves the phone');
    assert.doesNotMatch(ui.replace(/\/\*[\s\S]*?\*\//g, ''), /misty/i, 'no fixed companion name in the code paths');
    const css = read('habit-nudges.css');
    assert.match(css, /prefers-reduced-motion: reduce\)[^}]*\.hn-cue[^}]*animation: none/);
    assert.match(css, /pointer-events: none/);
});
