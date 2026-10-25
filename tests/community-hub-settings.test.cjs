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

test('hub groups: YOU, then Settings without World sound, then Delete account alone at the bottom; no Explore', () => {
    const g = M.groups(() => true);
    assert.deepStrictEqual(g.map(x => x.key), ['you', 'settings', 'danger']);
    assert.deepStrictEqual(g[0].ids, ['me', 'presence', 'body', 'myday'], 'Weight journey lives inside Weight & BMI (Oct 22 2026); presence tile after Profile; My day last (Oct 25 2026, the retired Today sheet\'s parts)');
    assert.deepStrictEqual(M.groups(id => id !== 'presence')[0].ids, ['me', 'body', 'myday'], 'no presence tile without the Community sheet');
    assert.deepStrictEqual(g[1].ids, ['theme', 'look', 'language', 'tutorial', 'account']);
    assert.deepStrictEqual(g[2].ids, ['deleteAccount'], 'Delete account is last, on its own');
    for (const id of ['worldSound', 'foryou', 'care', 'workouts', 'map', 'gift', 'hunt']) assert.ok(!g.some(x => x.ids.includes(id)), id + ' is not in the hub');
    assert.deepStrictEqual(SS.COMMUNITY_PLACES.places, [], 'no Explore section');
    assert.deepStrictEqual(M.groups(id => id === 'tutorial').map(x => x.key), ['settings'], 'empty groups drop');
});

test('every former Explore place says where it is reached now; the More places row is gone (Emmanuel, Oct 22 5:40 PM)', () => {
    for (const id of ['foryou', 'care', 'workouts', 'gift', 'hunt']) assert.ok(typeof SS.EXPLORE_MOVED[id] === 'string' && SS.EXPLORE_MOVED[id].length > 3, id);
    assert.deepStrictEqual(M.groups(() => true)[0].more, [], 'no More places entries');
    assert.deepStrictEqual(SS.EXPLORE_LIGHT, [], 'no folded More places row');
    assert.ok(!SS.EXPLORE_LIGHT.includes('workouts'), 'Workouts is the Move bubble');
    assert.match(SRC, /data-cme="more" aria-expanded="' \+ moreOpen/);
    assert.match(SRC, /lastFocus = D\.activeElement; asking = false; moreOpen = false;/, 'folded each time the hub opens');
    for (const l of ['en', 'de', 'es']) assert.ok(M.TX[l].more, l);
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
    assert.match(SRC, /const ok = await s\.deleteAccount\(\); if \(ok\) return;/, 'only the server ok clears the phone');
    assert.match(SRC, /cme-ver/);
    assert.match(SSJS, /deleteAccount: \(\) => serverDelete\(\)/);
});

test('a hold that opened the hub cannot close it or press a row when the finger lifts', () => {
    assert.match(SRC, /if \(armed \|\| e\.detail === 0\) close\(true\)/);
    assert.match(SRC, /if \(!armed && e\.detail !== 0\) \{ e\.preventDefault\(\); e\.stopPropagation\(\); return; \}/);
});

test('footer tip in EN, DE and ES no longer says the hold opens Settings', () => {
    for (const l of ['en', 'de', 'es']) { assert.ok(M.TX[l].hold, l); for (const k of Object.keys(M.TX.en)) assert.ok(k in M.TX[l], l + ' ' + k); }
    assert.ok(!/for settings/i.test(M.TX.en.hold));
});
