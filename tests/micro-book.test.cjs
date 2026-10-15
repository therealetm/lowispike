'use strict';
/* Oct 15: microbe collection book, adventure log, friend care (micro-book-core.js / micro-book.js / .css) */
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const C = require('../micro-book-core.js');
const src = fs.readFileSync(path.join(root, 'micro-book.js'), 'utf8'), css = fs.readFileSync(path.join(root, 'micro-book.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'apple-ui.js'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
let n = 0;
const t = (name, fn) => { fn(); n++; };
const DAY = '2026-10-15', ts = new Date(2026, 9, 15, 10, 0).getTime();
const e = (src, eventId, label, amt) => ({ src, eventId, label: label || '', amt: amt == null ? 10 : amt, ts, day: DAY });

t('buddies: 18 numbered, unique ids, 3 rising thresholds, facts in en/de/es', () => {
    assert.strictEqual(C.BUDDIES.length, 18);
    assert.strictEqual(new Set(C.BUDDIES.map(b => b.id)).size, 18);
    for (const b of C.BUDDIES) {
        assert.ok(b.at.length === 3 && b.at[0] < b.at[1] && b.at[1] < b.at[2], b.id);
        assert.ok(b.n.length === 3 && b.fact.length === 3 && b.fact.every(f => f.length > 20 && f.length < 140), b.id);
        assert.ok(C.HINT[b.m], 'hint for ' + b.m);
    }
});
t('counts only real counted ledger actions (amt > 0)', () => {
    const c = C.counts([e('meal', 'meal:1'), e('meal', 'meal:2', '', 0), e('r3a_water', 'w', 'Water'), e('move', 'm', 'Move walk'), e('macro-goal', 'macro-goal:' + DAY + ':fiber'), e('sun-full', 'sun-full:' + DAY), e('body-trip', 'body-trip:gut-1'), e('f1', 'q', 'Quest')]);
    assert.deepStrictEqual([c.meal, c.water, c.move, c.fiber, c.sun, c.trip, c.days], [1, 1, 1, 1, 1, 1, 1]);
});
t('book: found, silhouettes with hints, colour variants by repetition', () => {
    const led = []; for (let i = 0; i < 10; i++) led.push(e('meal', 'meal:' + i));
    const bk = C.book(C.counts(led), {});
    const ins = bk.cards.find(c => c.id === 'insulin'), vil = bk.cards.find(c => c.id === 'villus'), mito = bk.cards.find(c => c.id === 'mito');
    assert.strictEqual(ins.vars, 2); assert.strictEqual(ins.left, 20);
    assert.strictEqual(vil.vars, 1);
    assert.ok(!mito.found); assert.strictEqual(C.hint(mito, 1), '1 Bewegung(en) abschließen');
    assert.strictEqual(bk.n, 2); assert.strictEqual(bk.total, 18);
    assert.strictEqual(bk.cards[0].no, 1);
});
t('stored finds stay even if the ledger is trimmed; diff reports new finds and colours once', () => {
    const bk1 = C.book(C.counts([e('meal', 'meal:1')]), {});
    const d1 = C.diff({}, bk1, 5);
    assert.deepStrictEqual(d1.fresh.map(c => c.id), ['insulin']);
    const bk2 = C.book(C.counts([]), d1.state);
    assert.ok(bk2.cards.find(c => c.id === 'insulin').found);
    assert.strictEqual(C.diff(d1.state, bk2, 6).fresh.length, 0);
    const led = []; for (let i = 0; i < 10; i++) led.push(e('meal', 'meal:' + i));
    const d3 = C.diff(d1.state, C.book(C.counts(led), d1.state), 7);
    assert.deepStrictEqual(d3.colours.map(c => c.id), ['insulin']);
});
t('external buddies merge without clobbering; bad ids ignored', () => {
    const list = C.merge(C.BUDDIES, [{ id: 'akkermansia', names: ['Akkermansia', 'Akkermansia', 'Akkermansia'] }, { id: 'mito' }, { id: '<x>' }]);
    assert.strictEqual(list.length, 19);
    assert.strictEqual(list[18].m, 'event');
    const bk = C.book(C.counts([]), { found: { akkermansia: { ts: 1, v: 1 } } }, list);
    assert.ok(bk.cards[18].found);
});
t('journeys: from ledger and events, deduped, numbered, with a discovery line', () => {
    const j = C.journeys([e('body-trip', 'body-trip:gut-1'), e('body-trip', 'body-trip:gut-1')], [{ id: 'liver-2', place: 'liver', ts: ts + 1 }, { id: 'body-trip:gut-1', place: 'gut' }]);
    assert.strictEqual(j.length, 2);
    assert.strictEqual(j[0].no, 1); assert.strictEqual(j[1].no, 2);
    assert.strictEqual(C.journeyLine(j[0], 1, true), 'Deine Zelle hat heute die Zotten des Dünndarms entdeckt.');
    assert.strictEqual(C.journeyTitle(j[1], 1), '2. Reise geschafft!');
    assert.strictEqual(C.journeyLine(j[1], 0, false), 'discovered the glycogen stores of the liver');
    assert.strictEqual(C.place('fasting').saw[1], 'einen neuen Ort in deinem Körper');
    assert.strictEqual(C.place('colon').name[1], 'Dickdarm');
});
t('journey text from events is cleaned', () => {
    const j = C.journeys([], [{ id: 'x1', saw: '<b>die Milz</b>', ts }]);
    assert.ok(!/[<>]/.test(C.journeyLine(j[0], 1, true)));
});
t('sparks: 3 a day + 1 per counted action today, max 8, spent subtracts', () => {
    const led = [e('meal', 'meal:1'), e('r3a_water', 'w', 'Water'), e('f1', 'q', 'Quest')];
    assert.deepStrictEqual(C.sparks(led, {}, ts), { total: 5, used: 0, left: 5, key: DAY });
    assert.strictEqual(C.sparks(led, { [DAY]: 4 }, ts).left, 1);
    const many = []; for (let i = 0; i < 20; i++) many.push(e('meal', 'meal:' + i));
    assert.strictEqual(C.sparks(many, {}, ts).total, 8);
});
t('care: one per friend, kind and day; level locks; time windows; sparks', () => {
    const f = { uid: 'friendLena01', n: 'Lena' }, hug = C.CARE.find(k => k.id === 'hug'), night = C.CARE.find(k => k.id === 'night'), cheer = C.CARE.find(k => k.id === 'cheer');
    const ctx = { day: DAY, level: 1, hour: 10, left: 5 };
    const r = C.canCare({ sent: {} }, f, hug, ctx);
    assert.ok(r.ok); assert.strictEqual(r.id, 'care:friendLena01:hug:' + DAY);
    assert.strictEqual(C.canCare({ sent: { [r.id]: 1 } }, f, hug, ctx).why, 'sent');
    assert.strictEqual(C.canCare({}, f, cheer, ctx).why, 'locked');
    assert.strictEqual(C.canCare({}, f, night, ctx).why, 'time');
    assert.ok(C.canCare({}, f, night, Object.assign({}, ctx, { hour: 23 })).ok);
    assert.ok(C.canCare({}, f, night, Object.assign({}, ctx, { hour: 2 })).ok);
    assert.strictEqual(C.canCare({}, f, hug, Object.assign({}, ctx, { left: 0 })).why, 'sparks');
    assert.strictEqual(C.canCare({}, { uid: 'x', n: 'bad' }, hug, ctx).why, 'none');
});
t('care ids parse back; junk ids rejected', () => {
    assert.deepStrictEqual(C.parseCare('care:friendLena01:water:2026-10-15'), { to: 'friendLena01', kind: 'water', day: '2026-10-15' });
    assert.strictEqual(C.parseCare('care:friendLena01:kiss:2026-10-15'), null);
    assert.strictEqual(C.careId('a b', 'hug', DAY), '');
});
t('incoming care: only from friends, only to me, never from hidden people, once', () => {
    const rows = [
        { message_id: 'care:meUser0001:hug:' + DAY, user_id: 'friendLena01', who: 'Lena' },
        { message_id: 'care:meUser0001:hug:' + DAY, user_id: 'strangerXYZ1', who: 'X' },
        { message_id: 'care:someoneElse1:hug:' + DAY, user_id: 'friendLena01', who: 'Lena' },
        { message_id: 'care:meUser0001:water:' + DAY, user_id: 'friendTom002', who: 'Tom' },
        { message_id: 'vibes:meUser0001:x', user_id: 'friendLena01', who: 'Lena' }
    ];
    const fr = [{ uid: 'friendLena01', n: 'Lena' }, { uid: 'friendTom002', n: 'Tom' }];
    const inc = C.incoming(rows, 'meUser0001', fr, { friendTom002: 1 }, {});
    assert.strictEqual(inc.length, 1); assert.strictEqual(inc[0].who, 'Lena');
    assert.strictEqual(C.incoming(rows, 'meUser0001', fr, {}, { [inc[0].id]: 1 }).length, 1);
});
t('UI: no fake people, honest delivery copy, plug-in points for the friends tree and journeys', () => {
    assert.ok(/lowispike\.friends\.v1/.test(src));
    assert.ok(!/Math\.random/.test(src), 'no invented activity');
    assert.ok(/data-care-uid/.test(src) && /lowi:body-trip-done/.test(src) && /lowi:buddy-found/.test(src));
    assert.ok(/from\('reactions'\)\.insert/.test(src) && /cloudLive\(\)/.test(src));
    assert.ok(/es wartet auf diesem Handy|Es wartet auf diesem Handy/.test(src));
    assert.ok(/Mikroben-Sammlung/.test(src) && /K\u00d6RPER-UNIVERSUM|KÖRPER-UNIVERSUM/.test(src));
    assert.ok(/prefers-reduced-motion/.test(css) && /pointer-events:none/.test(css));
    assert.ok(/html\[data-ui=light\] \.mb-toast/.test(css));
});
t('loader and service worker list the files', () => {
    assert.ok(/'micro-book-core\.js','micro-book\.js'/.test(ui));
    assert.strictEqual((sw.match(/"micro-book-core\.js", "micro-book\.js", "micro-book\.css"/g) || []).length, 2);
});
console.log('micro-book: ' + n + ' tests passed');
