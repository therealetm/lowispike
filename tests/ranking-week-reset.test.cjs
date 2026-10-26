'use strict';
/* 26 Oct 2026, Monday 05:33 (Emmanuel, voice message): "Why have you broken the weekly leaderboard? And added a bot in there."
   His Week board, minutes after the Monday reset: one entry, "Moss Drifter" (owner "F", Lv 4, 6 sunbeams) in 1st place, his own
   row a dash. "F" was a made-up user from two quick check scripts of ours (bug hunt run 31) that opened the live app in a test
   browser with no network block: the app signed in as a guest and the script logged a meal, so the fake had the new week's only
   sunbeams. The rows were deleted from the live database; these tests keep it from happening again:
   - a guest account made by an automated browser (navigator.webdriver) signs up with lowi_test:true, so the server marks it
     profiles.test and it never reaches a real person's board (index.html lowiAnonOpts, food-photo-ai.js)
   - right after the reset the Week board says a new week has started and offers the month, instead of looking broken
   - the reset itself: Monday 00:00 local time, last week's sunbeams drop out, this week's count, your row gets a place as soon
     as you have sunbeams, and test accounts stay off the board. */
process.env.TZ = 'Europe/Berlin';
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const B = require('../bot-accounts.js');
global.LowiBotAccounts = B;
const K = require('../ranking-core.js');
const CB = require('../care-board-core.js');

const MON = new Date(2026, 9, 26, 5, 33).getTime();       /* Mon 26 Oct 2026 05:33 in Flensburg, the moment of his screenshot */
const SUN = new Date(2026, 9, 25, 23, 55).getTime();      /* five minutes before the reset */
const wkOf = t => CB.tag(CB.periodKey('w', t), 0), moOf = t => CB.tag(CB.periodKey('m', t), 0);
const person = (n, w, t, extra) => Object.assign({ n, uid: 'u-' + n, xpw: w, wk: wkOf(t), xpm: w, mo: moOf(t), xp: 500, lv: 3 }, extra || {});

function anonOpts(webdriver) {
    const src = R('index.html'), m = src.match(/function lowiAnonOpts\(\)\{[^\n]*\}/);
    assert.ok(m, 'index.html defines lowiAnonOpts');
    const ctx = { navigator: { webdriver } };
    vm.runInNewContext(m[0] + '; out = lowiAnonOpts();', ctx);
    return ctx.out;
}

test('a guest account made by a test browser signs up as a test account (lowi_test:true), a real phone signs up plainly', () => {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(anonOpts(true))), { options: { data: { lowi_test: true } } });
    assert.strictEqual(anonOpts(false), undefined);
    assert.strictEqual(anonOpts(undefined), undefined);
});

test('every guest sign-in in the app passes those options (the cloud boot and the food photo AI)', () => {
    const src = R('index.html');
    const calls = src.match(/signInAnonymously\([^)]*\)/g) || [];
    assert.ok(calls.length >= 1);
    calls.forEach(c => assert.strictEqual(c, 'signInAnonymously(lowiAnonOpts()', 'index.html: ' + c));
    assert.ok(/window\.lowiAnonOpts = lowiAnonOpts;/.test(src), 'shared with the other scripts');
    const fp = R('food-photo-ai.js');
    assert.ok(fp.includes('signInAnonymously(root.lowiAnonOpts ? root.lowiAnonOpts() : undefined)'), 'food-photo-ai.js');
    assert.ok(!/signInAnonymously\(\)/.test(src + fp), 'no plain guest sign-in left');
});

test('right after the reset the empty Week board says a new week started and offers the month (EN, DE, ES)', () => {
    const src = R('ranking.js');
    for (const k of ['emptyW', 'emptyM', 'seeM']) {
        const m = src.match(new RegExp(k + ": \\[('[^']+'), ('[^']+'), ('[^']+')\\]"));
        assert.ok(m, k + ' has three languages');
    }
    assert.ok(/emptyW: \['New week, everyone starts at 0/.test(src));
    assert.ok(/tr\(per === 'w' \? 'emptyW' : per === 'm' \? 'emptyM' : 'empty'\)/.test(src), 'the empty board picks the period text');
    assert.ok(/class="rk-seem" data-rk="per" data-k="m"/.test(src), 'a button switches to the month board');
    assert.ok(/\.rk-seem\{[^}]*min-height:44px/.test(R('ranking.css')), 'a 44 px tap target');
});

test('the week resets at Monday 00:00 local time: last week drops out, this week counts', () => {
    assert.strictEqual(CB.periodKey('w', SUN), '2026-10-19');
    assert.strictEqual(CB.periodKey('w', MON), '2026-10-26');
    assert.strictEqual(CB.periodKey('w', new Date(2026, 9, 26, 0, 0, 1).getTime()), '2026-10-26', 'one second after midnight is the new week');
    const lastWeek = [person('Antje', 32, SUN), person('Joseph', 29, SUN), person('Christabel', 42, SUN)];
    assert.deepStrictEqual(K.rows(lastWeek, 'w', SUN).map(x => x.p.n), ['Christabel', 'Antje', 'Joseph'], 'Sunday night: last week\'s board');
    assert.deepStrictEqual(K.rows(lastWeek, 'w', MON), [], 'Monday: everyone starts at 0, nobody is carried over');
    assert.strictEqual(K.rows(lastWeek, 'm', MON).length, 3, 'the month board keeps everyone');
    const fresh = lastWeek.concat([person('Lina', 4, MON)]);
    assert.deepStrictEqual(K.rows(fresh, 'w', MON).map(x => [x.p.n, x.rank]), [['Lina', 1]], 'the first sunbeams of the week take 1st place');
});

test('your own row gets a place as soon as you have sunbeams this week, and a dash only at 0', () => {
    const others = [person('Antje', 32, SUN), person('Lina', 4, MON)];
    const me = Object.assign(person('eman', 0, MON), { me: true });     /* your own sunbeams come from this phone's care ledger */
    assert.strictEqual(K.mine(K.rows(others.concat([me]), 'w', MON, { w: { pts: 0, full: 0 }, m: { pts: 179, full: 12 } })), null, '0 sunbeams: not ranked yet (the dash)');
    const list = K.rows(others.concat([me]), 'w', MON, { w: { pts: 6, full: 0 }, m: { pts: 185, full: 12 } }), mine = K.mine(list);
    assert.ok(mine, 'ranked');
    assert.strictEqual(mine.rank, 1);
    assert.strictEqual(mine.pts, 6);
});

test('test and bot accounts never reach a real person\'s Week board, even with the most sunbeams', () => {
    const fake = person('F', 6, MON, { uid: '967b8685-8d08-4cea-ae4d-317ea0115910' });
    const crowd = person('Marco', 9, MON, { uid: 'crowd-marco' });
    const real = person('Lina', 2, MON);
    const me = Object.assign(person('eman', 1, MON), { me: true, uid: 'me-uid' });
    B.setSelf('me-uid');
    B.set(['crowd-marco'], ['967b8685-8d08-4cea-ae4d-317ea0115910']);
    try {
        const names = K.rows([fake, crowd, real, me], 'w', MON, { w: { pts: 1, full: 0 }, m: { pts: 1, full: 0 } }).map(x => x.p.n);
        assert.deepStrictEqual(names, ['Lina', 'eman']);
    } finally { B.set([], []); B.setSelf(''); }
});
