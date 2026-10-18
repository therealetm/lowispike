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
function ring(vw, vh, d, R) {
    const mx = vw / 2, my = vh * 0.47, deg = { settings: 45, sleep: 135, fuel: -135, water: -45 };
    const o = {};
    for (const k in deg) { const a = deg[k] * Math.PI / 180; o[k] = { bx: mx + R * Math.cos(a), by: my + R * Math.sin(a), br: d / 2 }; }
    return { mx, my, o };
}
test('fan: chips bloom outward from Sleep and Settings, on screen, clear of Misty and of each other (iPhone 390x844, iPad 820x1180, 1024x768)', () => {
    for (const [vw, vh, d, R, mr] of [[390, 844, 78, 150, 92], [820, 1180, 112, 260, 150], [1024, 768, 104, 240, 140], [1180, 820, 110, 250, 145]]) {
        const g = ring(vw, vh, d, R);
        for (const k of ['sleep', 'settings']) for (const n of [3, 4, 5]) {
            const c = Math.round(Math.max(54, Math.min(88, d * 0.8)));
            const o = Object.assign({ mx: g.mx, my: g.my, mr, n, c, vw, vh }, g.o[k]);
            const F = C.fan(o);
            assert.ok(F.fit, `${vw}x${vh} ${k} n=${n} fits`);
            assert.strictEqual(F.pts.length, n);
            F.pts.forEach((p, i) => {
                assert.ok(inside(p, c, o), `${vw}x${vh} ${k} chip ${i} on screen`);
                assert.ok(Math.hypot(p.x - o.mx, p.y - o.my) >= mr + c / 2 + 6, `${vw}x${vh} ${k} chip ${i} clear of Misty`);
                assert.ok(Math.hypot(p.x - o.mx, p.y - o.my) > Math.hypot(o.bx - o.mx, o.by - o.my) - 1, `${vw}x${vh} ${k} chip ${i} is farther from Misty than its bubble (outward)`);
                F.pts.slice(i + 1).forEach(q => assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= c + 4 - 0.01, 'chips do not overlap'));
            });
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
    assert.deepStrictEqual(C.entries('settings', all), ['me', 'look', 'account', 'menubar', 'more']);
    assert.deepStrictEqual(C.entries('settings', none), []);
    assert.deepStrictEqual(C.entries('settings', { has: id => id === 'menubar' || id === 'care' }), ['menubar', 'more']);
    assert.deepStrictEqual(C.entries('more', { has: id => id === 'care' || id === 'community' }), ['community', 'care']);
    assert.deepStrictEqual(C.entries('sleep', {}), ['under6', '6to7', '7plus']);
    assert.deepStrictEqual(C.entries('sleep', { logged: true }), ['under6', '6to7', '7plus', 'clear']);
    assert.ok(C.MORE.includes('today') && C.MORE.includes('community') && C.MORE.includes('care'), 'history, Community and Care stay reachable');
});

test('menu bar contract matches the shell: lowi.home.menubar 1|0 and window lowi:home-menubar', () => {
    const src = read('home-settings-sleep-v2.js');
    assert.strictEqual(C.MENU_KEY, 'lowi.home.menubar');
    assert.match(src, /ls\.set\(MENU_KEY, on \? '1' : '0'\)/);
    assert.match(src, /root\.dispatchEvent\(new CustomEvent\('lowi:home-menubar'/);
    assert.match(src, /O\.setMenuBar\(!!on\)/, 'prefers the shell API when it is loaded');
});

test('real routes only: profile tiles, tabs and Home controls the app has today; no emoji in the module', () => {
    const src = read('home-settings-sleep-v2.js') + read('home-settings-sleep-v2.css');
    assert.match(src, /profileTile\('look'\)/); assert.match(src, /profileTile\('acct'\)/);
    assert.match(src, /goTab\('foryou'\)/); assert.match(src, /openBoardTab\(\)/); assert.match(src, /wh-todaybtn/);
    const html = read('index.html');
    for (const k of ['look', 'acct']) assert.match(html, new RegExp('"' + k + '"'), 'profile tile ' + k + ' exists');
    assert.match(html, /data-tab="profile"/); assert.match(html, /openBoardTab/);
    assert.doesNotMatch(src, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});
