/* Worlds playtest (Oct 19, 2026): the cell guides' lesson flow.
   1. Switching the app language mid-lesson re-says THE SAME line in the new language (it used to tear the guide down and build it
      again: a second welcome back plus the NEXT lesson, so the lesson being read was skipped and remembered as told).
   2. The guide's "keep teaching" lines never re-tell a lesson from an earlier visit (those only come back as the "Remember?"
      question): it used to ask about lesson 1 and then re-tell lesson 1 a little later anyway.
   3. Her name in the guide's lines is the user's companion (Misty), never the old herb identity name ("Steer Moss Leaf ..."). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../region-pals-core.js');
const A = require('../arrival-core.js');
const IDS = ['brain', 'lung', 'heart', 'liver', 'pancreas', 'gut', 'muscle'], LANGS = ['en', 'de', 'es'];

test('every opening line carries a source that rebuilds it exactly, in any language', () => {
    assert.strictEqual(typeof C.relang, 'function', 'the core can rebuild a line in another language');
    for (const id of IDS) for (const li of LANGS) {
        const L = C.lines(id, li, A, '');
        const intro = C.opening(C.memory(null), id, li, L, new Set(), () => 0, null, A);
        assert.ok(intro.src, 'the hello has a source');
        assert.strictEqual(C.relang(intro.src, id, li, L), intro.text);
        const seenBefore = { v: 1, met: { [id]: 1 }, lastBack: -1, told: { [id]: [1] }, ok: {}, since: { [id]: 1 } };
        const ask = C.opening(C.memory(seenBefore), id, li, L, new Set(), () => 0, null, A);
        assert.ok(ask.src, 'the welcome back (with or without a question) has a source');
        assert.strictEqual(C.relang(ask.src, id, li, L), ask.text, id + ' ' + li + ' arrival');
        const back = C.opening(C.memory({ v: 1, met: { [id]: 1 }, lastBack: -1, told: { [id]: [1] }, ok: { [id]: [1] }, since: { [id]: 0 } }), id, li, L, new Set(), () => 0, null, A);
        assert.strictEqual(C.relang(back.src, id, li, L), back.text, id + ' ' + li + ' welcome back + lesson');
    }
});

test('the same line, switched to another language, is that line in the new language (not the next one)', () => {
    for (const id of IDS) {
        const EN = C.lines(id, 'en', A, ''), DE = C.lines(id, 'de', A, ''), ES = C.lines(id, 'es', A, '');
        const m = { v: 1, met: { [id]: 1 }, lastBack: -1, told: { [id]: [1, 2] }, ok: { [id]: [1, 2] }, since: { [id]: 0 } };
        const o = C.opening(C.memory(JSON.parse(JSON.stringify(m))), id, 'en', EN, new Set(), () => 0, null, A);
        const de = C.opening(C.memory(JSON.parse(JSON.stringify(m))), id, 'de', DE, new Set(), () => 0, null, A);
        assert.strictEqual(C.relang(o.src, id, 'de', DE), de.text, id + ': German version of the same arrival');
        assert.ok(C.relang({ t: 'fact', i: 3 }, id, 'es', ES) === ES[3]);
        for (const yes of [true, false]) {
            const r = C.answer(C.memory({ v: 1, met: { [id]: 1 }, told: { [id]: [1] }, ok: {}, since: {} }), id, 1, yes, 'en', EN, new Set(), A);
            const r2 = C.answer(C.memory({ v: 1, met: { [id]: 1 }, told: { [id]: [1] }, ok: {}, since: {} }), id, 1, yes, 'es', ES, new Set(), A);
            assert.strictEqual(C.relang(r.src, id, 'es', ES), r2.text, id + ' answer ' + yes);
        }
    }
    const h = C.huntLine('dir', 'en', { d: [1, 0] }), hd = C.huntLine('dir', 'de', { d: [1, 0] });
    assert.strictEqual(C.relang({ t: 'hunt', key: 'dir', v: { d: [1, 0] } }, 'liver', 'de', []), hd.text);
    assert.notStrictEqual(h.text, hd.text);
    assert.strictEqual(C.relang({ t: 'fact', i: 99 }, 'liver', 'de', C.lines('liver', 'de', A, '')), null, 'unknown line: null, never a different one');
    assert.strictEqual(C.relang(null, 'liver', 'de', []), null);
    assert.strictEqual(C.relang({ t: 'fact', i: 1 }, 'nowhere', 'de', ['a', 'b']), null);
});

test('the shell re-says the line in place on a language switch instead of rebuilding the guide', () => {
    const s = read('region-pals.js');
    const on = s.slice(s.indexOf("addEventListener('lowi:lang'"), s.indexOf("addEventListener('lowi:lang'") + 120);
    assert.ok(on.length > 30, 'still listens for the language switch');
    assert.ok(!/hide\(\)/.test(on) && !/show\(id\)/.test(on), 'no tear-down and rebuild (that ran the arrival again and skipped the lesson)');
    assert.ok(/relang\(\)/.test(on));
    const fn = s.slice(s.indexOf('function relang()'), s.indexOf("W.addEventListener('lowi:lang'"));
    assert.ok(/C\.relang\(/.test(fn) && /show1\(L, false, true\)/.test(fn), 'the same line is shown again, in the new language');
    assert.ok(/st\.lines = C\.lines\(/.test(fn), 'the lines are rebuilt in the new language');
    assert.ok(/if \(!again\) \{ st\.shown\+\+; st\.visit\+\+; \}/.test(s), 're-saying is not a new line said');
    for (const k of ["kind: 'fact', i, src:", "kind: 'ask', ask: o.ask, src: o.src", "kind: 'hunt', src: { t: 'hunt', key, v }", "kind: 'tip', src:"]) assert.ok(s.indexOf(k) >= 0, 'line carries its source: ' + k);
});

test('keep-teaching never re-tells a lesson from an earlier visit', () => {
    const s = read('region-pals.js');
    const t = s.slice(s.indexOf('function teach()'), s.indexOf('function teach()') + 2200);
    assert.ok(/C\.nextNew\(memLoad\(\), st\.id, st\.lines, seen\[st\.id\]/.test(t), 'teach picks only lessons never told (device memory) and not said this session');
    assert.ok(!/C\.nextFact\(/.test(t), 'not the session-only pick that re-told old lessons');
    // what that pick means: lessons 1-2 told on an earlier visit, nothing said yet this session -> lesson 3, never 1
    const L = C.lines('liver', 'en', A, '');
    assert.strictEqual(C.nextNew(C.memory({ v: 1, met: { liver: 1 }, told: { liver: [1, 2] } }), 'liver', L, new Set(), A), 3);
});

test('the guide calls her by the companion name (Misty), never the herb identity name', () => {
    const s = read('region-pals.js');
    const fn = s.slice(s.indexOf('function mistyName()'), s.indexOf('function mistyName()') + 400);
    assert.ok(/LowiBirthCompanion/.test(fn), 'uses the shared companion API');
    assert.ok(!/LowiHerbTamagotchi/.test(fn), 'not the old herb identity ("Moss Leaf")');
    assert.ok(/'Misty'/.test(fn), 'Misty when there is no companion of her own');
});

/* 4. Gossip (E-man, Oct 19: "I want them to gossip about each other sometimes, that would be funny ... as they're trying to teach
   things, they're also being funny"). */
test('every guide gossips about another guide, in English, German and Spanish, short enough to read', () => {
    assert.ok(C.GOSSIP && typeof C.gossipPick === 'function' && typeof C.gossip === 'function', 'gossip lines exist');
    const names = IDS.map(id => C.pal(id, 'en').name);
    for (const id of IDS) {
        const own = C.pal(id, 'en').name, a = C.GOSSIP[id];
        assert.ok(Array.isArray(a) && a.length >= 2, id + ' has at least two');
        for (const row of a) {
            assert.strictEqual(row.length, 3, 'en, de, es');
            for (const t of row) {
                assert.ok(t && t.length <= 130, 'short: ' + t);
                assert.ok(names.some(n => n !== own && t.indexOf(n) >= 0), 'about another guide by name: ' + t);
                assert.ok(t.indexOf(own) < 0, 'not about itself: ' + t);
            }
        }
    }
});

test('gossip is shuffled and never the same line twice in a row, and remembered on the device', () => {
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const id of IDS) {
        const m = C.memory(null), got = [];
        for (let i = 0; i < 40; i++) got.push(C.gossipPick(m, id, rnd));
        for (let i = 1; i < got.length; i++) assert.notStrictEqual(got[i], got[i - 1], id + ': same gossip twice in a row');
        assert.strictEqual(new Set(got).size, C.GOSSIP[id].length, id + ': every line comes up');
        const kept = C.memory(JSON.parse(JSON.stringify(m)));
        assert.deepStrictEqual(kept.gos[id], m.gos[id], 'kept on the device');
    }
    assert.deepStrictEqual(C.memory({ gos: { liver: [0, 9, 0, 'x'], nowhere: [1] } }).gos, { liver: [0] }, 'stored values are cleaned');
    assert.strictEqual(C.relang({ t: 'gossip', k: 1 }, 'liver', 'es', []), C.GOSSIP.liver[1][2], 'switching language keeps the same gossip');
});

test('the guide gossips at most once a visit, only after a lesson this visit', () => {
    const s = read('region-pals.js');
    const t = s.slice(s.indexOf('function teach()'), s.indexOf('function teach()') + 2600);
    assert.ok(/!st\.gossiped && st\.hadFact && st\.lastKind !== 'ask'/.test(t), 'once a visit, once a lesson was told, never right after a question');
    assert.ok(/if \(line\.kind === 'fact'\) st\.hadFact = true/.test(s) && /st\.hadFact = false/.test(s), 'a lesson told this visit (a hunt hint in between does not block it)');
    assert.ok(/C\.gossipPick\(memLoad\(\), st\.id\)/.test(t) && /memSave\(\)/.test(t), 'picked from the device memory and saved');
    assert.ok(/kind: 'gossip', src: \{ t: 'gossip', k: g \}/.test(t), 'carries its source (language switch)');
    assert.ok(/st\.gossiped = false/.test(s), 'reset on every visit');
});

test('autopilot finds name her the same way as the guides (Misty), not the herb identity', () => {
    const s = read('adventure.js');
    const fn = s.slice(s.indexOf('const name = () =>'), s.indexOf('const name = () =>') + 300);
    assert.ok(/LowiBirthCompanion/.test(fn) && /'Misty'/.test(fn));
    assert.ok(!/LowiHerbTamagotchi/.test(fn), 'not "Moss Leaf found ..."');
});
