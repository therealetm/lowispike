/* Oct 18 2026: one-page Home, Sleep + Settings blooms (home-settings-sleep-v2.js). Pure helpers: daily sleep store, outward fan, entries. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../home-settings-sleep-v2.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('sleep: one entry per day, a new choice corrects it, clear empties it, other days untouched', () => {
    const h = {};
    assert.strictEqual(C.readSleep(h, '2026-10-18'), null);
    assert.ok(C.writeSleep(h, '2026-10-17', '7plus', 1));
    assert.ok(C.writeSleep(h, '2026-10-18', 'under6', 2));
    assert.strictEqual(C.readSleep(h, '2026-10-18'), 'under6');
    assert.ok(C.writeSleep(h, '2026-10-18', '6to7', 3));
    assert.strictEqual(C.readSleep(h, '2026-10-18'), '6to7');
    assert.strictEqual(Object.keys(h.sleepDays).length, 2, 'correction replaces, never adds a second entry');
    assert.ok(C.clearSleep(h, '2026-10-18'));
    assert.strictEqual(C.readSleep(h, '2026-10-18'), null);
    assert.strictEqual(C.readSleep(h, '2026-10-17'), '7plus');
    assert.strictEqual(C.clearSleep(h, '2026-10-18'), false, 'clearing an empty day is a no-op');
});

test('sleep: rejects unknown bands and bad days, repairs a broken store, keeps the other health fields', () => {
    const h = { weight: 80, sleepDays: 'junk' };
    assert.strictEqual(C.writeSleep(h, '2026-10-18', 'good'), false);
    assert.strictEqual(C.writeSleep(h, '18.10.2026', '7plus'), false);
    assert.ok(C.writeSleep(h, '2026-10-18', '7plus'));
    assert.deepStrictEqual(Object.keys(h.sleepDays), ['2026-10-18']);
    assert.strictEqual(h.weight, 80);
    assert.strictEqual(C.readSleep({ sleepDays: { '2026-10-18': { band: 'nonsense' } } }, '2026-10-18'), null);
    assert.strictEqual(C.writeSleep(null, '2026-10-18', '7plus'), false);
});

test('sleep: the store keeps the last 120 days only', () => {
    const h = {}, d0 = new Date(2026, 0, 1);
    for (let i = 0; i < 130; i++) C.writeSleep(h, C.dayKey(new Date(d0.getTime() + i * 864e5 + 3600e3)), '6to7', i);
    const k = Object.keys(h.sleepDays).sort();
    assert.strictEqual(k.length, C.KEEP_DAYS);
    assert.strictEqual(k[0], C.dayKey(new Date(d0.getTime() + 10 * 864e5 + 3600e3)));
});

test('sleep: local day key, empty face says Log (not fake data), bands fill a third / two thirds / full, no clinical words', () => {
    assert.strictEqual(C.dayKey(new Date(2026, 9, 18, 0, 5)), '2026-10-18');
    assert.strictEqual(C.dayKey(new Date(2026, 9, 17, 23, 55)), '2026-10-17');
    const e = C.sleepView(null, 'en');
    assert.deepStrictEqual([e.done, e.fill, e.value], [false, 0, 'Log']);
    assert.match(e.aria, /not logged/);
    assert.deepStrictEqual(C.BANDS.map(b => +C.sleepView(b, 'en').fill.toFixed(2)), [0.33, 0.67, 1]);
    assert.strictEqual(C.sleepView('7plus', 'de').value, '7 Std.+');
    assert.strictEqual(C.sleepView('under6', 'es').aria, 'Sue\u00f1o, Menos de 6 h');
    for (const l of ['en', 'de', 'es']) for (const k of Object.keys(C.TX.en)) assert.ok(k in C.TX[l], l + ' has ' + k);
    assert.doesNotMatch(JSON.stringify(C.TX), /healthy|risk|insulin|disease|doctor|should sleep/i);
});

test('sleep gives no XP and no sun energy: the module never awards', () => {
    const src = read('home-settings-sleep-v2.js');
    assert.doesNotMatch(src, /\baward(With)?\s*\(|LowiSun\.|\.xp\s*[+=]/);
    assert.match(src, /S\.health\.sleepDays via LowiVitalsBridge/);
});

const inside = (p, c, o) => p.x - c / 2 >= 8 && p.x + c / 2 <= o.vw - 8 && p.y - c / 2 >= 8 && p.y + c / 2 <= o.vh - 8;
/* ring geometry measured from the shipped shell (home-orbit-v2, build 20261018-165646): [key, x, y, diameter].
   Since 18 Oct 18:20 ("Let's put scan where setting is") Settings has the top slot and Scan the lower right one. */
const RINGS = {
    'iphone 390x844': { vw: 390, vh: 844, mx: 195, my: 388, mr: 88, ring: [['fuel', 93, 286, 88], ['settings', 195, 244, 88], ['water', 297, 286, 88], ['move', 340, 388, 88], ['scan', 297, 491, 88], ['joy', 195, 533, 88], ['sleep', 93, 491, 88], ['gap', 51, 388, 88]] },
    'ipad 820x1180': { vw: 820, vh: 1180, mx: 410, my: 543, mr: 151, ring: [['fuel', 244, 377, 124], ['settings', 410, 308, 124], ['water', 576, 377, 124], ['move', 645, 543, 124], ['scan', 576, 709, 124], ['joy', 410, 778, 124], ['sleep', 244, 709, 124], ['gap', 175, 543, 124]] }
};
test('fan: chips bloom outward from Sleep and Settings: on screen, clear of Misty, of the other ring bubbles and of each other (iPhone, iPad)', () => {
    for (const name in RINGS) {
        const g = RINGS[name];
        for (const k of ['sleep', 'settings']) for (const n of [3, 4, 5]) {
            const b = g.ring.find(x => x[0] === k), avoid = g.ring.filter(x => x[0] !== k).map(x => ({ x: x[1], y: x[2], r: x[3] / 2 }));
            const o = { mx: g.mx, my: g.my, mr: g.mr, bx: b[1], by: b[2], br: b[3] / 2, n, c: Math.round(Math.min(88, b[3] * 0.8)), vw: g.vw, vh: g.vh, avoid };
            const F = C.fan(o), c = F.c, bd = Math.hypot(o.bx - o.mx, o.by - o.my);
            assert.ok(F.fit, `${name} ${k} n=${n} fits`);
            assert.ok(c >= 54, 'chips stay at least 54 px');
            assert.strictEqual(F.pts.length, n);
            F.pts.forEach((p, i) => {
                const at = `${name} ${k} n=${n} chip ${i}`;
                assert.ok(inside(p, c, o), at + ' on screen');
                assert.ok(Math.hypot(p.x - o.mx, p.y - o.my) >= o.mr + c / 2 + 6, at + ' clear of Misty');
                assert.ok(Math.hypot(p.x - o.mx, p.y - o.my) >= bd - 0.01, at + ' at least as far from Misty as its bubble (outward)');
                avoid.forEach(q => assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= q.r + c / 2, at + ' clear of another ring bubble'));
                F.pts.slice(i + 1).forEach(q => assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= c + 4 - 0.01, 'chips do not overlap'));
            });
        }
    }
});
test('fan: landscape iPad and a desktop window also fit without avoid data', () => {
    for (const [vw, vh, d, R, mr] of [[1180, 820, 110, 230, 130], [1024, 768, 104, 220, 125]]) {
        const mx = vw / 2, my = vh / 2;
        for (const deg of [-90, 135]) { /* Settings on top, Sleep lower left */
            const a = deg * Math.PI / 180, o = { mx, my, mr, bx: mx + R * Math.cos(a), by: my + R * Math.sin(a), br: d / 2, n: 5, c: 84, vw, vh };
            const F = C.fan(o);
            assert.ok(F.fit, `${vw}x${vh} ${deg}`);
            F.pts.forEach(p => assert.ok(inside(p, F.c, o) && Math.hypot(p.x - mx, p.y - my) >= mr + F.c / 2 + 6));
        }
    }
});

test('fan: a window too small for an arc still returns n on-screen spots', () => {
    const o = { mx: 160, my: 200, mr: 120, bx: 260, by: 300, br: 30, n: 5, c: 54, vw: 320, vh: 380 };
    const F = C.fan(o);
    assert.strictEqual(F.pts.length, 5);
    F.pts.forEach(p => { assert.ok(p.x >= 0 && p.x <= o.vw && p.y >= 0 && p.y <= o.vh); });
});

test('entries: only routes that exist are offered, More appears only with something in it, sleep adds Clear once logged', () => {
    const all = { has: () => true }, none = { has: () => false };
    assert.deepStrictEqual(C.entries('settings', all), ['theme', 'look', 'worldSound', 'language', 'tutorial', 'account', 'deleteAccount']);
    assert.deepStrictEqual(C.entries('settings', none), []);
    assert.deepStrictEqual(C.entries('settings', { has: id => id === 'tutorial' || id === 'care' }), ['tutorial']);
    assert.deepStrictEqual(C.entries('more', { has: id => id === 'care' || id === 'me' }), ['me', 'care']);
    assert.deepStrictEqual(C.entries('sleep', {}), ['under6', '6to7', '7plus']);
    assert.deepStrictEqual(C.entries('sleep', { logged: true }), ['under6', '6to7', '7plus', 'clear']);
    assert.ok(C.MORE.includes('care') && !C.MORE.includes('map'), 'Care board stays reachable (from Community now); the old World map is gone (Oct 22 2026)');
    assert.ok(!C.MORE.includes('today'), 'Today was dropped from Home (Emmanuel, Oct 18 2026): see everything-else-trim.test.cjs');
});

test('no menu bar switch any more (Oct 21): Settings neither stores nor announces one', () => {
    const src = read('home-settings-sleep-v2.js');
    assert.doesNotMatch(src, /lowi:home-menubar/);
    assert.doesNotMatch(src, /setMenuBar/);
});

test('real routes only: profile tiles, tabs and Home controls the app has today; no emoji in the module', () => {
    const src = read('home-settings-sleep-v2.js') + read('home-settings-sleep-v2.css');
    /* Oct 22 2026: Account, Me and Look & sound open the Profile overview (LowiG2E.overview), never a sub-panel */
    assert.match(src, /account: \{[^}]*run: profileHome/); assert.match(src, /look: \{[^}]*run: profileHome/); assert.match(src, /G\.overview\(\)/);
    assert.doesNotMatch(src, /profileTile|G\.open\(/);
    assert.match(src, /goTab\('foryou'\)/); assert.match(src, /openBoardTab\(\)/); assert.match(src, /wh-todaybtn/);
    const html = read('index.html');
    for (const k of ['look', 'acct']) assert.match(html, new RegExp('"' + k + '"'), 'profile tile ' + k + ' exists');
    assert.match(html, /data-tab="profile"/); assert.match(html, /openBoardTab/);
    assert.doesNotMatch(src, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    assert.doesNotMatch(read('home-settings-sleep-v2.js'), /\bfetch\s*\(|XMLHttpRequest|supabase/i, 'the module never talks to the backend');
});

test('settings panel: names the running build beside the x, in each language; a missing or malformed id shows nothing', () => {
    assert.strictEqual(C.versionLabel('20261020-084655', 'en'), 'Version 20261020-084655');
    assert.strictEqual(C.versionLabel(' 20261020-084655 ', 'de'), 'Version 20261020-084655');
    assert.strictEqual(C.versionLabel('20261020-084655', 'es'), 'Versi\u00f3n 20261020-084655');
    assert.strictEqual(C.versionLabel('20261020-084655', 'xx'), 'Version 20261020-084655', 'unknown language falls back to English');
    ['', null, undefined, 'dev', '2026-10-20', '<b>20261020-084655</b>'].forEach(b => assert.strictEqual(C.versionLabel(b, 'en'), ''));
    const src = read('home-settings-sleep-v2.js'), css = read('home-settings-sleep-v2.css');
    assert.ok(/meta\[name="lowi-build"\]/.test(src), 'reads the page build tag');
    assert.ok(/ss2-page-foot">' \+ \(ver \? '<small class="ss2-ver">'/.test(src), 'plain text in the panel foot, before the x');
    assert.ok(/\.ss2-ver \{[^}]*margin-right: auto/.test(css), 'sits at the left of the foot, the x stays at the bottom right');
});
