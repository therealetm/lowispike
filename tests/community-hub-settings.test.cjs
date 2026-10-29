'use strict';
/* Oct 22 2026 (Emmanuel: "remove the explore things and have the more important things in there"): the profile hub (community-me.js)
   drops Explore, carries the Settings (Day/night, Look & sound, Language, Tutorial, Account, Delete account at the bottom, version),
   leaves World sound out (it lives inside Look & sound), and every way to the old Settings sheet opens the hub. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const SS = require('../home-settings-sleep-v2.js');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'community-me.js'), 'utf8');
const SSJS = fs.readFileSync(path.join(__dirname, '..', 'home-settings-sleep-v2.js'), 'utf8');
globalThis.LowiHomeSettingsSleepV2 = SS;
delete require.cache[require.resolve('../community-me.js')];
const M = require('../community-me.js');

/* Oct 29 2026 settings hub (Emmanuel: "alles bei Community ... sinngemäß, richtig sortiert ... so wie Apple iOS", "doppelt gemappt ...
   alles in einer Seite"): ONE settings page, iOS style. Your picture card on top opens Your details (so Profile, Weight & BMI and
   Account are no rows of their own), then You, Circle, App, Help & info, Delete account alone at the bottom. Each id once. */
test('settings page groups: You, Circle, App, Help & info, then Delete account alone at the bottom; no Explore', () => {
    const g = M.groups(() => true);
    assert.deepStrictEqual(g.map(x => x.key), ['you', 'circle', 'settings', 'help', 'danger']);
    assert.deepStrictEqual(g[0].ids, ['myday', 'swaps', 'glow', 'cycle', 'todo']);
    assert.deepStrictEqual(g[1].ids, ['presence', 'people', 'posts', 'invite']);
    assert.deepStrictEqual(g[2].ids, ['theme', 'language', 'notifications', 'look']);
    assert.deepStrictEqual(g[3].ids, ['tutorial', 'support', 'rules', 'about']);
    assert.deepStrictEqual(g[4].ids, ['deleteAccount'], 'Delete account is last, on its own');
    const all = g.flatMap(x => x.ids); assert.strictEqual(new Set(all).size, all.length, 'every row once');
    for (const id of ['me', 'body', 'account', 'catchUp', 'worldSound', 'foryou', 'care', 'workouts', 'map', 'gift', 'hunt']) assert.ok(!all.includes(id), id + ' is not a row');
    assert.deepStrictEqual(M.groups(id => id !== 'presence')[1].ids, ['people', 'posts', 'invite'], 'no presence row without the Community sheet');
    assert.deepStrictEqual(SS.COMMUNITY_PLACES.places, [], 'no Explore section');
    assert.deepStrictEqual(M.groups(id => id === 'about').map(x => x.key), ['help'], 'empty groups drop');
});

test('every former Explore place says where it is reached now; no More places row', () => {
    for (const id of ['foryou', 'care', 'workouts', 'gift', 'hunt']) assert.ok(typeof SS.EXPLORE_MOVED[id] === 'string' && SS.EXPLORE_MOVED[id].length > 3, id);
    assert.deepStrictEqual(SS.EXPLORE_LIGHT, [], 'no folded More places row');
    assert.ok(!/data-cme="more"/.test(SRC), 'no More places row in the settings page');
});

test('the old Settings sheet is a fallback: show(page) opens the hub first', () => {
    assert.match(SSJS, /if \(kind === 'page'\) \{ const M = root\.LowiCommunityMe; if \(M && fn\(M, 'open'\)\)/);
    assert.ok(!/data-cme="settings"/.test(SRC), 'no gear in the hub that would open itself');
});

test('the hub renders Settings rows: day/night switch, EN/DE/ES, red Delete account that asks first, version line', () => {
    assert.match(SRC, /role="switch" data-cme="theme"/);
    assert.match(SRC, /data-lang="' \+ x \+ '"/);
    assert.match(SRC, /cme-row cme-danger" data-cme="deleteAccount" aria-haspopup="dialog"/);
    assert.match(SRC, /data-cme="delGo"/); assert.match(SRC, /data-cme="delCancel"/);
    /* Oct 25: deleteAccount() returns true, 'owner' or false; only true (the server's ok) clears the phone */
    assert.match(SRC, /const r = await s\.deleteAccount\(\); if \(r === true\) return;/, 'only the server ok clears the phone');
    assert.match(SRC, /cme-ver/);
    assert.match(SSJS, /deleteAccount: \(\) => serverDelete\(\)/);
});

test('a hold that opened the hub cannot close it or press a row when the finger lifts', () => {
    assert.match(SRC, /if \(armed \|\| e\.detail === 0\) close\(true\)/);
    assert.match(SRC, /if \(!armed && e\.detail !== 0\) \{ e\.preventDefault\(\); e\.stopPropagation\(\); return; \}/);
});

test('EN, DE and ES carry every label; no footer tip about holding the bubble (the hold does nothing now)', () => {
    for (const l of ['en', 'de', 'es']) for (const k of Object.keys(M.TX.en)) assert.ok(k in M.TX[l], l + ' ' + k);
    assert.ok(!/cme-tip/.test(SRC), 'no hold tip');
});
