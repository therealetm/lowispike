/* Oct 25 2026 (Emmanuel: "When someone is online, it says '2 here now', but when I click, I don't see who. If I click on People,
   I should be able to see the person who's online ... very up, maybe under 'Online right now'.").
   People gets an Online right now section at the top; the header's "N here now" opens it; both read ONE list
   (LowiPeopleDirCore.here via LowiPeopleDir.here) so the count and the section always match, and bots, test, hidden, removed
   and blocked accounts never show or count. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const P = require('../people-directory-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const U = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

test('here(): you and the real people here, by name; the count is exactly what the section shows', () => {
    const rows = P.build([{ uid: U(1), n: 'Joseph' }, { uid: U(2), n: 'Antje' }, { uid: U(3), n: 'Bao' }], { me: U(9) });
    const h = P.here([U(9), U(1), U(2)], [], rows, { me: U(9) });
    assert.strictEqual(h.me, true);
    assert.deepStrictEqual(h.rows.map(r => r.n), ['Antje', 'Joseph'], 'sorted by name');
    assert.strictEqual(h.count, 3, 'you + Antje + Joseph = "3 here now"');
    const alone = P.here([U(9)], [], rows, { me: U(9) });
    assert.deepStrictEqual([alone.me, alone.rows.length, alone.count], [true, 0, 1]);
    const none = P.here([], [], rows, { me: U(9) });
    assert.deepStrictEqual([none.me, none.rows.length, none.count], [false, 0, 0]);
});

test('here(): bots, test, hidden, removed and unknown accounts in the room never show and never count', () => {
    const rows = P.build([{ uid: U(1), n: 'Joseph' }], { me: U(9) });
    const profiles = [{ uid: U(1), n: 'Joseph' }, { uid: U(5), n: 'Nibblo', bot: true }, { uid: U(6), n: 'Soak Test' }, { uid: U(7), n: 'Joseph' }];
    /* ok() says no for the bot (5), the test copy (6) and a hidden second "Joseph" account (7) */
    const h = P.here([U(9), U(1), U(5), U(6), U(7), U(8), '', null], profiles, rows, { me: U(9), ok: () => false });
    assert.deepStrictEqual(h.rows.map(r => r.uid), [U(1)]);
    assert.strictEqual(h.count, 2, 'only you and Joseph');
    /* no ok() given: the fallback is closed, never open */
    assert.strictEqual(P.here([U(7)], profiles, rows, { me: U(9) }).count, 0);
    /* an ok() that throws is a no */
    assert.strictEqual(P.here([U(7)], profiles, rows, { me: U(9), ok: () => { throw new Error('x'); } }).count, 0);
});

test('here(): a real second account of a listed name shows that person once (the list keeps one account per name)', () => {
    const rows = P.build([{ uid: U(1), n: 'Christabel' }], {});
    const profiles = [{ uid: U(1), n: 'Christabel' }, { uid: U(2), n: '  christabel ' }];
    const h = P.here([U(2), U(1)], profiles, rows, { ok: p => p.uid === U(2) });
    assert.deepStrictEqual(h.rows.map(r => r.uid), [U(1)], 'one row, the listed one');
    assert.strictEqual(h.count, 1, 'two accounts of one person count once');
    assert.strictEqual(h.me, false, 'no me id given: nobody is "you"');
});

test('Online right now / Everyone else / You exist in English, German and Spanish, with no numbers', () => {
    assert.deepStrictEqual(P.T.onNow, ['Online right now', 'Gerade online', 'En línea ahora']);
    assert.deepStrictEqual(P.T.others, ['Everyone else', 'Alle anderen', 'Todos los demás']);
    assert.deepStrictEqual(P.T.you, ['You', 'Du', 'Tú']);
    for (const k of ['onNow', 'others', 'you', 'onDot']) for (const s of P.T[k]) assert.ok(s && !/\d/.test(s), k);
});

function loadDir(env) {
    const W = Object.assign({ LowiPeopleDirCore: P }, env);
    W.window = W;
    vm.runInNewContext(read('people-directory.js'), { window: W, document: {}, localStorage: { getItem: () => 'en' }, console });
    return W.LowiPeopleDir;
}

test('LowiPeopleDir.here() reads the live room presence and the same real-human list as the rows', () => {
    const me = U(9);
    const cloud = [{ uid: me, n: 'Emmanuel' }, { uid: U(1), n: 'Joseph' }, { uid: U(2), n: 'Antje' }, { uid: U(5), n: 'Nibblo' }, { uid: U(6), n: 'Emmanuel' }, { uid: U(7), n: 'Liesl' }];
    let status = 'in', ids = [me, U(1), U(5), U(6), U(7)];
    const dir = loadDir({
        LOWI_CLOUD: { live: () => true, uid: () => me, people: () => cloud },
        LowiCellRoom: { people: () => cloud.filter(p => [U(1), U(2), U(7)].includes(p.uid)), friends: () => [] },
        LowiRooms: { status: () => status, members: () => ids },
        LowiBotAccounts: { isBot: p => p.uid === U(5) },
        LowiHiddenAccounts: { isHidden: p => p.uid === U(6) },
        LowiCommunity: { blocked: uid => uid === U(7) }
    });
    assert.strictEqual(typeof dir.here, 'function');
    let h = dir.here();
    assert.deepStrictEqual(h.rows.map(r => r.n), ['Joseph'], 'Nibblo (bot), the hidden Emmanuel test copy and blocked Liesl stay out');
    assert.strictEqual(h.me, true);
    assert.strictEqual(h.count, 2);
    ids = [me, U(1), U(2)];
    assert.deepStrictEqual(dir.here().rows.map(r => r.n), ['Antje', 'Joseph'], 'live: a new presence list shows right away');
    status = 'offline';
    assert.strictEqual(dir.here().count, 0, 'not in the room: nobody is shown as here');
});

test('People paints Online right now first (you, then the others), then Everyone else, and updates live', () => {
    const js = code(read('people-directory.js'));
    assert.match(js, /LowiRooms[\s\S]{0,80}members\(\)/, 'presence comes from the room the header counts');
    assert.match(js, /C\(\)\.here\(ids, cloudProfiles\(\), live\(\) \? rows\(\) : \[\], \{ me: me\(\), ok: realProfile \}\)/);
    assert.match(js, /secHTML\('onNow', 'pdHere'\) \+ \(mine \? hereRowHTML\(mine, fr, true\) : ''\) \+ onShown\.map/);
    assert.match(js, /secHTML\('others', ''\)/);
    assert.match(js, /rest = shown\.filter\(r => !onIds\.has\(r\.uid\)\)/, 'someone online is not listed twice');
    assert.match(js, /D\.addEventListener\('lowi:room', paint\)/);
    assert.match(js, /D\.removeEventListener\('lowi:room', paint\)/, 'listener removed on close');
    assert.match(js, /const key = note \+ '\|' \+ html;/, 'repaint compares the whole list');
    assert.match(js, /hasAttribute\('data-me'\)[\s\S]{0,120}showProfile/, 'your own row opens your card');
    assert.match(js, /here: hereNow/);
    assert.match(js, /opts && opts\.at === 'here'/);
    for (const k of ['B.isBot(p)', 'H.isHidden(p)', 'isBlocked(String(p.uid))', 'LOWI_BOTS']) assert.ok(js.includes(k), k);
});

test('the header count and faces come from the same list, and tapping "N here now" opens People at Online right now', () => {
    const ui = code(read('community-rooms-ui.js'));
    assert.match(ui, /const P=W\.LowiPeopleDir;\s*if\(P&&P\.here\)\{try\{return P\.here\(\);/);
    assert.ok(!/tr\('hereNow',\{c:r\.members\(\)\.length\}\)/.test(ui), 'no raw presence count in the header, the menu label or the pill');
    assert.match(ui, /tr\('hereNow',\{c:h\.count\}\)/);
    assert.match(ui, /tr\('hereNow',\{c:hn\.count\}\)/);
    assert.match(ui, /tr\('hereNow',\{c:hc\}\)/);
    assert.match(ui, /lv\.toggleAttribute\('data-here',!!hn\.count\)/);
    assert.match(ui, /e\.target\.closest\('\.rm-live\[data-here\]'\)[\s\S]{0,80}W\.LowiPeopleDir\.open\(\{at:'here'\}\)/);
    const css = read('community-rooms.css');
    assert.match(css, /\.rm-live\[data-here\]::after\{content:'';position:absolute;/, 'a bigger tap area for the live line');
});

test('the online dot and section look: green dot with a ring, headings are not buttons, nothing new moves', () => {
    const css = read('people-directory.css');
    assert.match(css, /\.pd-on\{[^}]*background:#3ef0a0/);
    assert.match(css, /\.pd-av\{position:relative;flex:none;width:44px;height:44px/);
    assert.match(css, /\.pd-sec-h\{[^}]*font-size:13px/);
    assert.ok(!/@keyframes pdPulse|animation:pd(?!Fade|Up)/.test(css), 'no new animation (battery)');
    const js = read('people-directory.js');
    assert.ok(!/setInterval\([^)]*\)[\s\S]*setInterval\(/.test(js), 'still one poll timer');
});
