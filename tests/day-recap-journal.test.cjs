'use strict';
/* Oct 27 2026 (continue run of MAYA-HANDOFF 0.40, Day recap): the recap also shows care sent today, takes one optional
   journal line (type it, or speak it with the app's speak-to-type mic), and shows itself once after the evening
   catch-up's Save (COORD-evening-catchup.md: lowi:catchup-saved), so input (catch-up) and read-back (recap) link up. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../day-recap-core.js');

const NOW = new Date(2026, 9, 26, 21, 30).getTime();
const DAY = '2026-10-26', YDAY = '2026-10-25';

test('care sent today is counted from the ledger (only today, only care)', () => {
    const s = C.summarize({ now: NOW, ledger: [
        { day: DAY, amt: 5, src: 'care-sent' }, { day: DAY, amt: 5, src: 'care-sent' },
        { day: YDAY, amt: 5, src: 'care-sent' }, { day: DAY, amt: 15, src: 'meal:spirit' }
    ] });
    assert.equal(s.care, 2);
    assert.equal(s.empty, false);
    assert.equal(C.summarize({ now: NOW }).care, 0);
    for (const lang of ['en', 'de', 'es']) {
        const v = C.view(s, { lang, name: 'Nova', rnd: () => 0 });
        const st = v.stats.find(x => x.k === 'care');
        assert.ok(st, 'care stat in ' + lang);
        assert.equal(st.n, '2');
        assert.ok(st.b && !/undefined/.test(st.b));
    }
    assert.ok(!C.view(C.summarize({ now: NOW }), { lang: 'en' }).stats.some(x => x.k === 'care'), 'no care, no card');
});

test('journal line: one clean line, at most 140 characters, empty stays empty', () => {
    assert.equal(C.journalClean('  Okay...\n today   was good  '), 'Okay... today was good');
    assert.equal(C.journalClean(''), '');
    assert.equal(C.journalClean(null), '');
    assert.equal(C.journalClean('x'.repeat(400)).length, C.JOURNAL_MAX);
    assert.equal(C.JOURNAL_MAX, 140);
    const store = C.journalPut({}, DAY, '  Today was good ');
    assert.deepEqual(store, { [DAY]: 'Today was good' });
    assert.deepEqual(C.journalPut(store, DAY, '   '), {}, 'clearing the line removes it');
    let big = {};
    for (let i = 0; i < 90; i++) big = C.journalPut(big, '2026-' + String(1 + Math.floor(i / 28)).padStart(2, '0') + '-' + String(1 + (i % 28)).padStart(2, '0'), 'n' + i);
    assert.ok(Object.keys(big).length <= 60, 'keeps the newest 60 days only');
    for (const k of ['journal', 'journalPh', 'journalSaved']) for (const lang of ['en', 'de', 'es']) assert.ok(C.UI[k] && C.UI[k][lang], k + ' ' + lang);
});

test('wiring: journal field (speak-to-type mic), saved on this phone only, and the recap follows the catch-up Save once', () => {
    const ui = read('day-recap.js');
    assert.ok(/data-drc-journal/.test(ui), 'journal field in the panel');
    assert.ok(/lowi\.dayrecap\.journal\.v1/.test(ui), 'stored locally');
    assert.ok(/data-mic/.test(ui), 'opted in to the speak-to-type mic');
    assert.ok(/maxlength="' \+ C\(\)\.JOURNAL_MAX/.test(ui) || /maxlength="140"/.test(ui), 'length limit on the field');
    assert.ok(/lowi:catchup-saved/.test(ui), 'listens for the evening catch-up Save');
    assert.ok(/ec-open/.test(ui), 'waits until the catch-up screen is closed');
    assert.ok(!/fetch\(|supabase/i.test(ui), 'the journal line never leaves the phone');
    assert.ok(!/Notification|showNotification|pushManager/.test(ui), 'never notifies');
    assert.ok(!/Misty/.test(JSON.stringify(C.UI)), 'never names companions Misty in shown strings');
});
