/* Oct 18 2026: Sleep grows Misty by tier (sleep-growth.js). 7 h or more = most XP, 6-7 h = less, under 6 h = none.
   The integration half runs the app's REAL award(), levelOf() and bridge awardWith/unaward, cut out of index.html, with the real
   LowiHerbCore, so these tests prove the sleep XP lands in Misty's own progression (S.xp, ledger, level, stage). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const G = require('../sleep-growth.js');
const SS = require('../home-settings-sleep-v2.js');

/* ---------- the app's own XP code, out of index.html ---------- */
const HTML = read('index.html');
function cut(re, what) { const m = HTML.match(re); assert.ok(m, 'index.html must still have ' + what); return m[0]; }
const LEVEL_SRC = cut(/const HERB_XP = \[[\s\S]*?const titleOf = [^\n]*\n/, 'HERB_XP .. titleOf');
const AWARD_SRC = cut(/function award\(amt, label, el, src, eventId\)\{[\s\S]*?\n\}\n/, 'award()');
const AWARD_WITH_SRC = cut(/awardWith:\(amt,label,src,eventId,extra,quiet\)=>award\([^\n]*?\),/, 'bridge.awardWith');
const UNAWARD_SRC = cut(/unaward\(eventId\)\{[\s\S]*?return amt;\},/, 'bridge.unaward');

function app(startXP) {
    const ctx = { console, Math, Date, Number, JSON, Object, Array, String, setTimeout: () => 0, CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } } };
    ctx.window = ctx;
    ctx.LowiHerbCore = require('../herb-core.js');
    ctx.events = []; ctx.toasts = []; ctx.saves = 0; ctx.NOW = new Date(2026, 9, 18, 8, 0).getTime();
    ctx.dispatchEvent = e => { ctx.events.push(e.type); return true; };
    ctx.$$ = () => [];
    ctx.toast = m => ctx.toasts.push(m);
    ctx.save = () => { ctx.saves++; };
    ctx.today = () => G.dayKey(ctx.NOW);
    ctx.S = { xp: startXP || 0, ledger: [], health: {}, herb: { name: 'Misty' } };
    vm.createContext(ctx);
    vm.runInContext(LEVEL_SRC + '\n' + AWARD_SRC + '\nvar bridge = { state: () => S,\n' + AWARD_WITH_SRC + '\n' + UNAWARD_SRC + '\n};\nthis.levelOf = levelOf; this.bridge = bridge;', ctx);
    ctx.log = (band, day) => { day = day || ctx.today(); if (band) SS.writeSleep(ctx.S.health, day, band, ctx.NOW); else SS.clearSleep(ctx.S.health, day); return day; };
    ctx.engine = G.engine({ bridge: () => ctx.bridge, now: () => ctx.NOW });
    /* one user action = the store changes, then 'lowi:sleep' asks the engine to settle that day */
    ctx.pick = band => { const day = ctx.log(band); return ctx.engine.reconcile(day, { explicit: true }); };
    ctx.sleepEntries = () => ctx.S.ledger.filter(e => e.src === 'sleep');
    return ctx;
}

test('tiers: 7 h or more pays the most, 6-7 h less, under 6 h nothing, nothing above 7 h, never negative; one table', () => {
    assert.deepStrictEqual(Object.assign({}, G.XP), { under6: 0, '6to7': 5, '7plus': 10 });
    assert.ok(Object.isFrozen(G.XP), 'the tuning table is one frozen object');
    assert.ok(G.XP['7plus'] > G.XP['6to7'] && G.XP['6to7'] > G.XP.under6 && G.XP.under6 === 0);
    assert.strictEqual(G.MAX, G.XP['7plus']);
    assert.deepStrictEqual(G.BANDS, SS.BANDS, 'same three bands as the Sleep bloom');
    assert.strictEqual(G.want('9plus'), 0); assert.strictEqual(G.want(undefined), 0);
    Object.values(G.XP).forEach(v => assert.ok(v >= 0 && Number.isInteger(v)));
    assert.ok(G.XP['7plus'] <= 15, 'modest: no more than one meal (15 XP)');
});

for (const [band, xp] of [['7plus', 10], ['6to7', 5], ['under6', 0]]) {
    test('real award path: logging ' + band + ' moves Misty\'s XP by exactly ' + xp, () => {
        const A = app(90);
        const r = A.pick(band);
        assert.strictEqual(A.S.xp, 90 + xp);
        assert.strictEqual(A.sleepEntries().length, xp ? 1 : 0);
        if (xp) {
            const e = A.sleepEntries()[0];
            assert.strictEqual(e.eventId, 'sleep:2026-10-18'); assert.strictEqual(e.amt, xp); assert.strictEqual(e.day, '2026-10-18');
            assert.strictEqual(e.label, 'Sleep', 'no hours in the ledger');
            assert.ok(!('band' in e) && !/\d\s*h|hour|std/i.test(JSON.stringify(e).replace(/"ts":\d+|"day":"[^"]*"|"eventId":"[^"]*"|"amt":\d+/g, '')), 'duration never written into the ledger');
            assert.ok(A.events.includes('lowi:reward'), 'the app\'s normal reward event fires, so Misty reacts like for any habit');
            assert.strictEqual(A.toasts.filter(t => /XP \u00b7 Sleep/.test(t)).length, 0, 'quiet award: sleep-growth says it in its own words, no double toast');
        }
        assert.strictEqual(r.delta, xp);
    });
}

test('real progression: sleep XP crosses a level like any habit (level 1 -> 2 at 100 XP) and the herb stage follows', () => {
    const A = app(95);
    assert.strictEqual(A.levelOf(A.S.xp).L, 1);
    A.pick('7plus');
    assert.strictEqual(A.S.xp, 105);
    assert.strictEqual(A.levelOf(A.S.xp).L, 2, 'Misty levels up from sleep');
    assert.strictEqual(A.S.herb.stageIndex, A.LowiHerbCore.stage(105).index, 'stage synced by LowiHerbCore.sync');
    const st = A.S.herb.stageIndex;
    A.pick(null);
    assert.strictEqual(A.S.xp, 95, 'clearing takes the 10 XP back');
    assert.strictEqual(A.S.herb.stageIndex, st, 'stages never regress: taking XP back never shrinks Misty');
});

test('repeated taps, repeated events and reloads never pay twice', () => {
    const A = app(0);
    A.pick('7plus'); A.pick('7plus'); A.pick('7plus');
    for (let i = 0; i < 5; i++) A.engine.reconcile('2026-10-18', { explicit: true });
    assert.strictEqual(A.S.xp, 10); assert.strictEqual(A.sleepEntries().length, 1);
    const again = A.engine.reconcile('2026-10-18', { explicit: true });
    assert.strictEqual(again.changed, false); assert.strictEqual(again.delta, 0);
    /* reload: a brand new engine on the saved state */
    const S2 = JSON.parse(JSON.stringify(A.S)); A.S = S2;
    const fresh = G.engine({ bridge: () => A.bridge, now: () => A.NOW });
    fresh.reconcile(null, { explicit: false }); fresh.reconcile(null, { explicit: true });
    assert.strictEqual(A.S.xp, 10); assert.strictEqual(A.sleepEntries().length, 1);
});

test('correcting the band settles only the difference; downgrade and clear take credit back; no farming by cycling', () => {
    const A = app(200);
    let r = A.pick('6to7'); assert.strictEqual(A.S.xp, 205); assert.strictEqual(r.delta, 5);
    r = A.pick('7plus'); assert.strictEqual(A.S.xp, 210); assert.strictEqual(r.delta, 5, 'upgrade adds only the 5 XP difference');
    r = A.pick('6to7'); assert.strictEqual(A.S.xp, 205); assert.strictEqual(r.delta, -5, 'downgrade removes 5');
    r = A.pick('under6'); assert.strictEqual(A.S.xp, 200); assert.strictEqual(r.delta, -5);
    assert.strictEqual(A.sleepEntries().length, 0, 'under 6 h leaves no sleep entry');
    r = A.pick('7plus'); assert.strictEqual(A.S.xp, 210);
    r = A.pick(null); assert.strictEqual(A.S.xp, 200); assert.strictEqual(r.delta, -10, 'clear takes back all of it');
    for (let i = 0; i < 20; i++) A.pick(['7plus', '6to7', 'under6', null][i % 4]);
    assert.strictEqual(A.S.xp, 200, 'cycling every option ends exactly where it started');
    A.pick('7plus'); for (let i = 0; i < 10; i++) { A.pick(null); A.pick('7plus'); }
    assert.strictEqual(A.S.xp, 210); assert.strictEqual(A.sleepEntries().length, 1, 'never more than one entry per day');
    assert.strictEqual(A.S.ledger.filter(e => e.src !== 'sleep').length, 0, 'no other ledger entry touched');
});

test('other XP is never touched: a water cup earned between sleep changes stays', () => {
    const A = app(0);
    A.pick('7plus');
    A.bridge.awardWith(2, 'Glass of water', 'water', 'water:2026-10-18:1', null, true);
    A.pick('6to7'); A.pick(null);
    assert.strictEqual(A.S.xp, 2); assert.deepStrictEqual(A.S.ledger.map(e => e.src), ['water']);
});

test('day rollover: each local day is its own entry, yesterday keeps its credit, a new day starts empty', () => {
    const A = app(0);
    A.NOW = new Date(2026, 9, 18, 23, 59, 30).getTime();
    A.pick('7plus');
    A.NOW = new Date(2026, 9, 19, 0, 0, 30).getTime();
    assert.strictEqual(A.today(), '2026-10-19');
    const r0 = A.engine.reconcile(null, { explicit: false });
    assert.strictEqual(r0.skipped, true, 'nothing logged today: nothing changes');
    assert.strictEqual(A.S.xp, 10);
    /* the 23:59 event handled just after midnight still settles the day it named */
    const late = A.engine.reconcile('2026-10-18', { explicit: true });
    assert.strictEqual(late.changed, false); assert.strictEqual(A.S.xp, 10);
    A.pick('6to7');
    assert.strictEqual(A.S.xp, 15);
    assert.deepStrictEqual(A.sleepEntries().map(e => e.eventId + '=' + e.amt), ['sleep:2026-10-18=10', 'sleep:2026-10-19=5']);
    A.pick(null);
    assert.strictEqual(A.S.xp, 10, 'clearing today never touches yesterday');
    /* days older than yesterday are never settled (an old log being trimmed can never take XP away) */
    A.NOW = new Date(2026, 9, 25, 9).getTime();
    assert.strictEqual(A.engine.reconcile('2026-10-18', { explicit: true }), null);
    delete A.S.health.sleepDays['2026-10-18'];
    A.engine.reconcile(null, { explicit: true });
    assert.strictEqual(A.S.xp, 10);
    assert.strictEqual(G.prevDay('2026-03-01'), '2026-02-28'); assert.strictEqual(G.prevDay('2026-01-01'), '2025-12-31');
});

test('account switching: each account\'s XP follows only its own sleep log', () => {
    const A = app(0);
    A.pick('7plus');
    const acctA = A.S;
    A.S = { xp: 50, ledger: [], health: {}, herb: {} }; /* signed in as someone else */
    const r = A.engine.reconcile(null, { explicit: false });
    assert.strictEqual(r.skipped, true); assert.strictEqual(A.S.xp, 50, 'B gets nothing from A\'s night');
    A.pick('6to7');
    assert.strictEqual(A.S.xp, 55);
    assert.strictEqual(acctA.xp, 10, 'A untouched by B'); assert.strictEqual(acctA.ledger.length, 1);
    A.S = acctA;
    A.engine.reconcile(null, { explicit: false });
    assert.strictEqual(A.S.xp, 10, 'back on A: still exactly its own 10');
});

test('a device without the log never takes synced XP back on its own; an explicit clear does', () => {
    const A = app(0);
    A.pick('7plus');
    delete A.S.health.sleepDays; /* restored on another phone: ledger synced, health stays on the first phone */
    const r = A.engine.reconcile(null, { explicit: false });
    assert.strictEqual(r.skipped, true); assert.strictEqual(A.S.xp, 10);
    A.engine.reconcile(null, { explicit: true });
    assert.strictEqual(A.S.xp, 0, 'the user cleared it: credit goes');
});

test('start-up settles a log made before this shipped exactly once', () => {
    const A = app(0);
    A.log('7plus');
    A.engine.reconcile(null, { explicit: false }); A.engine.reconcile(null, { explicit: false });
    assert.strictEqual(A.S.xp, 10); assert.strictEqual(A.sleepEntries().length, 1);
});

test('no bridge, broken state or a bad day: nothing happens, nothing throws', () => {
    const e = G.engine({ bridge: () => null }); assert.strictEqual(e.reconcile(null, { explicit: true }), null);
    const A = app(0);
    assert.strictEqual(A.engine.reconcile('18.10.2026', { explicit: true }), null);
    A.S.health.sleepDays = 'junk'; A.S.ledger = [{ eventId: 'sleep:2026-10-18', amt: 'x' }];
    assert.doesNotThrow(() => A.engine.reconcile(null, { explicit: true }));
});

test('plain words: what it got, what 7 h gives, gentle under 6 h, taken back on clear; three languages, no emoji, no shame', () => {
    const A = app(0);
    const said = [];
    const say = band => { const r = A.pick(band); said.push(G.message(r, 'en', 'Misty')); return said[said.length - 1]; };
    assert.strictEqual(say('6to7'), '+5 XP for Misty \u00b7 6\u20137 h (7 h or more gives 10)');
    assert.strictEqual(say('7plus'), '+5 XP for Misty \u00b7 now 10 XP for last night');
    assert.strictEqual(say('7plus'), 'Already counted \u00b7 10 XP for last night');
    assert.strictEqual(say('6to7'), 'Sleep changed \u00b7 now 5 XP for last night');
    assert.strictEqual(say('under6'), 'Sleep changed \u00b7 5 XP taken back');
    assert.strictEqual(say('under6'), 'Sleep logged \u00b7 6 h or more helps Misty grow');
    assert.strictEqual(say(null), null, 'clearing nothing says nothing');
    assert.strictEqual(say('7plus'), '+10 XP for Misty \u00b7 7 h or more');
    assert.strictEqual(say(null), 'Sleep cleared \u00b7 10 XP taken back');
    assert.strictEqual(G.message({ skipped: true }, 'en'), null);
    for (const L of ['de', 'es']) {
        const t = G.TX[L]; assert.deepStrictEqual(Object.keys(t), Object.keys(G.TX.en), L + ' has every line');
        const r = { day: 'x', band: '7plus', have: 0, want: 10, delta: 10, changed: true };
        assert.ok(G.message(r, L, 'Misty').includes('+10 XP'));
    }
    const all = JSON.stringify(G.TX);
    assert.ok(!/\p{Extended_Pictographic}/u.test(all), 'no emoji');
    assert.ok(!/bad|poor|only|not enough|failed|lazy|should|schlecht|nur |zu wenig|malo|solo |insuficiente/i.test(all), 'no shaming words');
    assert.ok(G.message({ band: '7plus', have: 0, want: 10, delta: 10, changed: true }, 'en', 'Nova').includes('Nova'), 'uses the companion name');
});

test('privacy: sleep earns no sunbeam, so the Care board and energy do not change; only the XP total moves', () => {
    const Sun = require('../sun-meter.js');
    const e = { ts: 1, day: '2026-10-18', amt: 10, label: 'Sleep', src: 'sleep', eventId: 'sleep:2026-10-18' };
    assert.strictEqual(Sun.points(e), 0);
    assert.strictEqual(Sun.points({ amt: 2, label: 'Glass of water', src: 'water' }) > 0, true, 'other habits still earn sunbeams');
    const src = read('sleep-growth.js');
    assert.ok(!/supabase|fetch\(|pushProfile|sb\.from/i.test(src), 'never talks to the server itself');
    assert.ok(!/localStorage/.test(src), 'no second sleep store');
});

test('wiring: the page loads sleep-growth.js right after the Sleep bloom, offline cache has it, reduced motion respected', () => {
    const i = HTML.indexOf('src="sleep-growth.js'), j = HTML.indexOf('src="home-settings-sleep-v2.js');
    assert.ok(i > 0 && j > 0 && i > j, 'sleep-growth.js loads after home-settings-sleep-v2.js');
    assert.strictEqual(HTML.split('src="sleep-growth.js').length - 1, 1, 'loaded once');
    assert.ok(/["']\.?\/?sleep-growth\.js["']/.test(read('sw.js')), 'sw.js precaches sleep-growth.js');
    const src = read('sleep-growth.js');
    assert.ok(/addEventListener\('lowi:sleep'/.test(src), 'listens to the Sleep bloom event');
    assert.ok(/prefers-reduced-motion: reduce\)\{\.sg-pop\{animation:sgFade/.test(src), 'reduced motion: the +XP fades in place, no rise');
    assert.ok(/awardWith\(/.test(src) && /unaward\(/.test(src), 'uses the shared ledger, not a private score');
    assert.ok(/dispatchEvent\(new CustomEvent\('lowi:sleep'/.test(read('home-settings-sleep-v2.js')), 'the Sleep bloom still announces each change');
});
